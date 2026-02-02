import postgres from 'postgres';

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('NEON_DATABASE_URL environment variable is required');
}

export const sql = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Types matching our schema
export interface TranscriptTurn {
  speaker: string;
  text: string;
  is_generated?: boolean;
}

export interface RelatedEpisode {
  id: string;
  title: string;
  guest: string;
}

export interface Program {
  id: string;
  title: string;
  guest: string;
  air_date: string | null;
  summary: string | null;
  book_title: string | null;
  book_isbn: string | null;
  url: string | null;
  transcript: TranscriptTurn[];
  related_episodes: RelatedEpisode[];
  created_at: string;
  updated_at: string;
}

export interface ProgramListItem {
  id: string;
  title: string;
  guest: string;
  air_date: string | null;
  summary: string | null;
  book_title: string | null;
}

export interface ConversationSession {
  id: string;
  program_id: string;
  session_token: string | null;
  user_topic: string | null;
  generated_turns: TranscriptTurn[];
  model: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

// Initialize the conversation_sessions table if it doesn't exist
export async function initializeSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS conversation_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_id TEXT REFERENCES programs(id) ON DELETE CASCADE,
      session_token TEXT,
      user_topic TEXT,
      generated_turns JSONB,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_program_id ON conversation_sessions(program_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON conversation_sessions(session_token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON conversation_sessions(created_at)`;
}

// Save a conversation session
export async function saveConversationSession(session: Omit<ConversationSession, 'id' | 'created_at'>): Promise<string> {
  const result = await sql`
    INSERT INTO conversation_sessions (program_id, session_token, user_topic, generated_turns, model, input_tokens, output_tokens)
    VALUES (${session.program_id}, ${session.session_token}, ${session.user_topic}, ${JSON.stringify(session.generated_turns)}, ${session.model}, ${session.input_tokens}, ${session.output_tokens})
    RETURNING id
  `;
  return result[0].id;
}
