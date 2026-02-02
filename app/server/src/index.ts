import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { sql, initializeSchema, saveConversationSession, type Program, type ProgramListItem, type TranscriptTurn } from './db';
import { resumeConversationStream } from './llm';

const app = new Hono();

// Initialize database schema on startup
initializeSchema().catch(console.error);

// Enable CORS for the frontend
app.use('/*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Get paginated list of episodes
app.get('/api/episodes', async (c) => {
  const limitParam = c.req.query('limit');
  // If no limit specified, return all. Otherwise cap at 1000.
  const limit = limitParam ? Math.min(parseInt(limitParam), 1000) : 1000;
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';
  const sort = c.req.query('sort') || 'air_date'; // 'air_date' or 'guest_last_name'

  try {
    let episodes: ProgramListItem[];
    let total: number;

    // Build ORDER BY clause based on sort parameter
    const orderByLastName = sort === 'guest_last_name';

    if (search) {
      // Search by guest name or title
      const searchPattern = `%${search}%`;
      if (orderByLastName) {
        episodes = await sql<ProgramListItem[]>`
          SELECT id, title, guest, air_date, summary, book_title
          FROM programs
          WHERE guest ILIKE ${searchPattern} OR title ILIKE ${searchPattern}
          ORDER BY SPLIT_PART(guest, ' ', -1) ASC, guest ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        episodes = await sql<ProgramListItem[]>`
          SELECT id, title, guest, air_date, summary, book_title
          FROM programs
          WHERE guest ILIKE ${searchPattern} OR title ILIKE ${searchPattern}
          ORDER BY air_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
      const countResult = await sql`
        SELECT COUNT(*) as count FROM programs
        WHERE guest ILIKE ${searchPattern} OR title ILIKE ${searchPattern}
      `;
      total = parseInt(countResult[0].count);
    } else {
      if (orderByLastName) {
        episodes = await sql<ProgramListItem[]>`
          SELECT id, title, guest, air_date, summary, book_title
          FROM programs
          ORDER BY SPLIT_PART(guest, ' ', -1) ASC, guest ASC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        episodes = await sql<ProgramListItem[]>`
          SELECT id, title, guest, air_date, summary, book_title
          FROM programs
          ORDER BY air_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      }
      const countResult = await sql`SELECT COUNT(*) as count FROM programs`;
      total = parseInt(countResult[0].count);
    }

    return c.json({
      episodes,
      total,
      limit,
      offset,
      hasMore: offset + episodes.length < total
    });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    return c.json({ error: 'Failed to fetch episodes' }, 500);
  }
});

// Get random episode (for "surprise me" feature)
// Note: Must be defined before /:id route to avoid being matched as an ID
app.get('/api/episodes/random', async (c) => {
  try {
    const results = await sql<ProgramListItem[]>`
      SELECT id, title, guest, air_date, summary, book_title
      FROM programs
      ORDER BY RANDOM()
      LIMIT 1
    `;

    if (results.length === 0) {
      return c.json({ error: 'No episodes found' }, 404);
    }

    return c.json(results[0]);
  } catch (error) {
    console.error('Error fetching random episode:', error);
    return c.json({ error: 'Failed to fetch random episode' }, 500);
  }
});

// Get single episode by ID
app.get('/api/episodes/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const results = await sql<Program[]>`
      SELECT * FROM programs WHERE id = ${id}
    `;

    if (results.length === 0) {
      return c.json({ error: 'Episode not found' }, 404);
    }

    return c.json(results[0]);
  } catch (error) {
    console.error('Error fetching episode:', error);
    return c.json({ error: 'Failed to fetch episode' }, 500);
  }
});

// Resume conversation with streaming
app.post('/api/chat/resume', async (c) => {
  try {
    const body = await c.req.json();
    const { programId, topic, sessionToken } = body;

    if (!programId) {
      return c.json({ error: 'programId is required' }, 400);
    }

    // Fetch the program
    const programs = await sql<Program[]>`
      SELECT * FROM programs WHERE id = ${programId}
    `;

    if (programs.length === 0) {
      return c.json({ error: 'Episode not found' }, 404);
    }

    const program = programs[0];
    const userTopic = topic?.trim() || null;

    // Stream the response using SSE
    return streamSSE(c, async (stream) => {
      const generatedTurns: TranscriptTurn[] = [];
      let inputTokens = 0;
      let outputTokens = 0;
      let model = '';

      try {
        for await (const event of resumeConversationStream(program, userTopic)) {
          if (event.type === 'turn' && event.turn) {
            generatedTurns.push(event.turn);
            await stream.writeSSE({
              event: 'turn',
              data: JSON.stringify(event.turn),
            });
          } else if (event.type === 'done') {
            inputTokens = event.inputTokens || 0;
            outputTokens = event.outputTokens || 0;
            model = event.model || '';
          }
        }

        // Save the session to the database
        const sessionId = await saveConversationSession({
          program_id: programId,
          session_token: sessionToken || null,
          user_topic: userTopic,
          generated_turns: generatedTurns,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        });

        // Send completion event
        await stream.writeSSE({
          event: 'done',
          data: JSON.stringify({
            sessionId,
            inputTokens,
            outputTokens,
            model,
          }),
        });
      } catch (error) {
        console.error('Error in conversation stream:', error);
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'Failed to generate conversation' }),
        });
      }
    });
  } catch (error) {
    console.error('Error resuming conversation:', error);
    return c.json({ error: 'Failed to resume conversation' }, 500);
  }
});

const port = process.env.PORT || 3000;

console.log(`Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
