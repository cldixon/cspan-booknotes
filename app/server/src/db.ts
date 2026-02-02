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
