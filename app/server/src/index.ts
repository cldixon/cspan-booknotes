import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sql, type Program, type ProgramListItem } from './db';

const app = new Hono();

// Enable CORS for the frontend
app.use('/*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Get paginated list of episodes
app.get('/api/episodes', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const search = c.req.query('search') || '';

  try {
    let episodes: ProgramListItem[];
    let total: number;

    if (search) {
      // Search by guest name or title
      const searchPattern = `%${search}%`;
      episodes = await sql<ProgramListItem[]>`
        SELECT id, title, guest, air_date, summary, book_title
        FROM programs
        WHERE guest ILIKE ${searchPattern} OR title ILIKE ${searchPattern}
        ORDER BY air_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM programs
        WHERE guest ILIKE ${searchPattern} OR title ILIKE ${searchPattern}
      `;
      total = parseInt(countResult[0].count);
    } else {
      episodes = await sql<ProgramListItem[]>`
        SELECT id, title, guest, air_date, summary, book_title
        FROM programs
        ORDER BY air_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
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

// Placeholder for chat resume endpoint (will implement with Claude later)
app.post('/api/chat/resume', async (c) => {
  // TODO: Implement Claude-based conversation resumption
  return c.json({ message: 'Not implemented yet' });
});

const port = process.env.PORT || 3000;

console.log(`Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
