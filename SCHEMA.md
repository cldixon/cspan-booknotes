# CSPAN Booknotes Database Schema

## Overview

This document describes the PostgreSQL database schema for the Booknotes web application. The database uses a **single table** design for simplicity, with JSONB columns for nested data.

## Design Decisions

### Single Table Design

All episode data lives in one `programs` table. This provides:

1. **Query simplicity** - One query gets everything, no JOINs
2. **Atomic operations** - Episode data is always consistent
3. **Easier maintenance** - Single source of truth
4. **Good enough for scale** - ~800 episodes is small; no need for normalization

### Transcript Storage (JSONB)

Transcripts are stored as a JSONB array preserving speaker information:

```json
[
  {"speaker": "BRIAN LAMB", "text": "Welcome to Booknotes..."},
  {"speaker": "GUEST NAME", "text": "Thank you for having me..."}
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
  {"id": "12345", "title": "Episode Title", "guest": "Guest Name"},
  {"id": "67890", "title": "Another Episode", "guest": "Another Guest"}
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
| `id` | `TEXT` | PRIMARY KEY | Unique episode identifier (from CSPAN) |
| `title` | `TEXT` | NOT NULL | Episode title |
| `guest` | `TEXT` | NOT NULL | Primary guest name |
| `air_date` | `DATE` | | Original broadcast date |
| `summary` | `TEXT` | | Episode description/summary |
| `book_title` | `TEXT` | | Featured book title |
| `book_author` | `TEXT` | | Featured book author |
| `thumbnail_url` | `TEXT` | | Episode thumbnail image URL |
| `video_url` | `TEXT` | | Link to video on CSPAN |
| `transcript` | `JSONB` | | Array of {speaker, text} objects |
| `related_episodes` | `JSONB` | | Array of {id, title, guest} objects |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | `TIMESTAMP` | DEFAULT NOW() | Record update timestamp |

**Indexes:**
- `idx_programs_guest` on `guest` - For filtering/searching by guest
- `idx_programs_air_date` on `air_date` - For chronological sorting
- `idx_programs_transcript` GIN index on `transcript` - For transcript search

---

## Example Queries

### Fetch episode list for UI
```sql
SELECT id, title, guest, air_date, summary, book_title, thumbnail_url
FROM programs
ORDER BY air_date DESC
LIMIT 20 OFFSET 0;
```

### Fetch single episode with everything
```sql
SELECT * FROM programs WHERE id = 'episode-123';
```

### Format transcript for LLM prompt (application code)
```python
def format_transcript_for_llm(transcript: list) -> str:
    lines = [f"{turn['speaker']}: {turn['text']}" for turn in transcript]
    return "\n\n".join(lines)
```

### Search transcripts
```sql
SELECT id, title, guest
FROM programs
WHERE transcript::text ILIKE '%constitution%'
LIMIT 10;
```

---

## Schema SQL

```sql
CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    guest TEXT NOT NULL,
    air_date DATE,
    summary TEXT,
    book_title TEXT,
    book_author TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    transcript JSONB,
    related_episodes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_programs_guest ON programs(guest);
CREATE INDEX IF NOT EXISTS idx_programs_air_date ON programs(air_date);
CREATE INDEX IF NOT EXISTS idx_programs_transcript ON programs USING GIN(transcript);

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

## Future Considerations

1. **Full-text search** - Add `tsvector` column for better transcript search
2. **User data** - Separate tables for favorites, watch history, etc.
3. **Caching** - Consider caching formatted LLM prompts if transcript serialization becomes a bottleneck
