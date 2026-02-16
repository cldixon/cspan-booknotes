# CSPAN Booknotes Database Schema

## Overview

This document describes the PostgreSQL database schema for the Booknotes web application. The database uses a **single table** design for simplicity, with JSONB columns for nested data.

## Design Decisions

### Single Table Design

All episode data lives in one `programs` table. This provides:

1. **Query simplicity** - One query gets everything, no JOINs
2. **Atomic operations** - Episode data is always consistent
3. **Easier maintenance** - Single source of truth
4. **Good enough for scale** - ~809 episodes is small; no need for normalization

### Transcript Storage (JSONB)

Transcripts are stored as a JSONB array preserving speaker information:

```json
[
  {"speaker": "BRIAN LAMB, HOST:", "text": "Welcome to Booknotes..."},
  {"speaker": "GUEST NAME, AUTHOR, \"BOOK TITLE\":", "text": "Thank you for having me..."}
]
```

Benefits:
- UI can style by speaker
- Easy to serialize for LLM prompts
- Single fetch gets full conversation

### Related Episodes (JSONB)

Related episodes are stored as a JSONB array with minimal metadata:

```json
[
  {"id": "121264-1", "title": "The Greatest Generation", "guest": "Tom Brokaw"},
  {"id": "38281-1", "title": "This Little Light of Mine", "guest": "Kay Mills"}
]
```

Benefits:
- No self-referential JOINs needed
- Related episode info is denormalized for fast display
- Simple to render "Related Episodes" section

---

## Table: `programs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `TEXT` | PRIMARY KEY | Unique episode identifier (e.g., "59640-1") |
| `title` | `TEXT` | NOT NULL | Episode/book title |
| `guest` | `TEXT` | NOT NULL | Primary guest name |
| `air_date` | `DATE` | | Original broadcast date |
| `summary` | `TEXT` | | Episode description/summary |
| `book_title` | `TEXT` | | Featured book title |
| `book_isbn` | `TEXT` | | Book ISBN |
| `url` | `TEXT` | | Link to episode on booknotes.c-span.org |
| `transcript` | `JSONB` | | Array of {speaker, text} objects |
| `related_episodes` | `JSONB` | | Array of {id, title, guest} objects |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | DEFAULT NOW() | Record update timestamp |

**Indexes:**
- `idx_programs_guest` on `guest` - For filtering/searching by guest
- `idx_programs_air_date` on `air_date` - For chronological sorting
- `idx_programs_transcript` GIN index on `transcript` - For transcript search

---

## Table: `conversation_sessions`

Stores AI-generated conversation continuations for analysis and potential replay.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique session identifier |
| `program_id` | `TEXT` | REFERENCES programs(id) | Episode being resumed |
| `session_token` | `TEXT` | | Anonymous user/session identifier (cookie-based) |
| `user_topic` | `TEXT` | | Topic submitted by user (null if just "Continue") |
| `generated_turns` | `JSONB` | | Array of {speaker, text, is_generated: true} objects |
| `model` | `TEXT` | | Model used (e.g., "claude-opus-4-6") |
| `input_tokens` | `INTEGER` | | Tokens in the prompt |
| `output_tokens` | `INTEGER` | | Tokens in the response |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | When the conversation was generated |

**Indexes:**
- `idx_sessions_program_id` on `program_id` - For finding sessions by episode
- `idx_sessions_session_token` on `session_token` - For finding user's sessions
- `idx_sessions_created_at` on `created_at` - For time-based analysis

---

## Example Queries

### Fetch episode list for UI
```sql
SELECT id, title, guest, air_date, summary, book_title
FROM programs
ORDER BY air_date DESC
LIMIT 20 OFFSET 0;
```

### Fetch single episode with everything
```sql
SELECT * FROM programs WHERE id = '59640-1';
```

### Format transcript for LLM prompt (application code)
```typescript
function formatTranscriptForLLM(transcript: {speaker: string, text: string}[]): string {
  return transcript
    .map(turn => `${turn.speaker} ${turn.text}`)
    .join('\n\n');
}
```

### Search transcripts
```sql
SELECT id, title, guest
FROM programs
WHERE transcript::text ILIKE '%constitution%'
LIMIT 10;
```

### Get episodes by guest
```sql
SELECT id, title, air_date
FROM programs
WHERE guest ILIKE '%Tom Brokaw%'
ORDER BY air_date;
```

### Get all sessions for an episode
```sql
SELECT id, user_topic, generated_turns, created_at
FROM conversation_sessions
WHERE program_id = '59640-1'
ORDER BY created_at DESC;
```

### Get usage statistics
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as sessions,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens
FROM conversation_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Schema SQL

```sql
-- Programs table
CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    guest TEXT NOT NULL,
    air_date DATE,
    summary TEXT,
    book_title TEXT,
    book_isbn TEXT,
    url TEXT,
    transcript JSONB,
    related_episodes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_programs_guest ON programs(guest);
CREATE INDEX IF NOT EXISTS idx_programs_air_date ON programs(air_date);
CREATE INDEX IF NOT EXISTS idx_programs_transcript ON programs USING GIN(transcript);

-- Conversation sessions table
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
);

CREATE INDEX IF NOT EXISTS idx_sessions_program_id ON conversation_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON conversation_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON conversation_sessions(created_at);

-- Update trigger for programs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_programs_updated_at
    BEFORE UPDATE ON programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Data Statistics

- **Total episodes**: 809
- **Total transcript turns**: 160,733
- **Related episode links**: 4,584
- **Date range**: 1989-2004

---

## Future Considerations

1. **Full-text search** - Add `tsvector` column for better transcript search
2. **User accounts** - If adding auth, link sessions to user IDs
3. **Caching** - Consider caching formatted LLM prompts if transcript serialization becomes a bottleneck
4. **Thumbnails** - Could add thumbnail_url if images are available from CSPAN
5. **Session replay** - Could add endpoint to replay a saved conversation session
