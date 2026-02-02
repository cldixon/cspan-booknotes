#!/usr/bin/env python3
"""
Bulk upload script for loading Booknotes episode data into Postgres.

Usage:
    uv run python scripts/bulk_upload.py

Requires:
    - NEON_DATABASE_URL environment variable
"""

import json
import os
from pathlib import Path

import polars as pl
import psycopg2
from psycopg2.extras import execute_values

DATA_DIR = Path(__file__).parent.parent / "dataset" / "data" / "processed"


def get_db_connection():
    """Create a connection to the Neon Postgres database."""
    database_url = os.environ.get("NEON_DATABASE_URL")
    if not database_url:
        raise ValueError("NEON_DATABASE_URL environment variable is required")

    return psycopg2.connect(database_url)


def create_tables(conn):
    """Create the database schema if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute("""
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

            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_programs_updated_at ON programs;
            CREATE TRIGGER update_programs_updated_at
                BEFORE UPDATE ON programs
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """)
        conn.commit()


def build_transcript_json(transcripts_df: pl.DataFrame) -> dict[str, list]:
    """
    Build a dict mapping program_id -> transcript JSONB array.

    Returns:
        Dict of program_id -> [{"speaker": "...", "text": "..."}, ...]
    """
    # Group by program_id, sort by sequence, and build the JSON structure
    transcripts_by_program = {}

    for program_id in transcripts_df["program_id"].unique().to_list():
        program_transcripts = (
            transcripts_df.filter(pl.col("program_id") == program_id)
            .sort("sequence")
            .select(["speaker_name", "text"])
        )

        transcript_list = [
            {"speaker": row["speaker_name"], "text": row["text"]}
            for row in program_transcripts.to_dicts()
        ]
        transcripts_by_program[program_id] = transcript_list

    return transcripts_by_program


def build_related_episodes_json(related_df: pl.DataFrame) -> dict[str, list]:
    """
    Build a dict mapping program_id -> related episodes JSONB array.

    Returns:
        Dict of program_id -> [{"id": "...", "title": "...", "guest": "..."}, ...]
    """
    related_by_program = {}

    for program_id in related_df["program_id"].unique().to_list():
        related_items = related_df.filter(pl.col("program_id") == program_id).select(
            ["related_id", "title", "guest"]
        )

        related_list = [
            {"id": row["related_id"], "title": row["title"], "guest": row["guest"]}
            for row in related_items.to_dicts()
        ]
        related_by_program[program_id] = related_list

    return related_by_program


def load_programs(conn, programs_df: pl.DataFrame, transcripts: dict, related: dict):
    """Load all program data into the database."""

    rows = []
    for program in programs_df.to_dicts():
        program_id = program["program_id"]

        # Get air_date as date string or None
        air_date = None
        if program["air_date"]:
            air_date = (
                program["air_date"].date()
                if hasattr(program["air_date"], "date")
                else program["air_date"]
            )

        rows.append(
            (
                program_id,
                program["title"],
                program["guest"],
                air_date,
                program["description"],
                program["title"],  # book_title is same as title in this dataset
                program["book_isbn"],
                program["url"],
                json.dumps(transcripts.get(program_id, [])),
                json.dumps(related.get(program_id, [])),
            )
        )

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO programs (id, title, guest, air_date, summary, book_title,
                                  book_isbn, url, transcript, related_episodes)
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                guest = EXCLUDED.guest,
                air_date = EXCLUDED.air_date,
                summary = EXCLUDED.summary,
                book_title = EXCLUDED.book_title,
                book_isbn = EXCLUDED.book_isbn,
                url = EXCLUDED.url,
                transcript = EXCLUDED.transcript,
                related_episodes = EXCLUDED.related_episodes,
                updated_at = CURRENT_TIMESTAMP
            """,
            rows,
        )
        conn.commit()

    print(f"Loaded {len(rows)} programs")


def main():
    # Load parquet files
    print("Loading parquet files...")
    programs_df = pl.read_parquet(DATA_DIR / "programs.parquet")
    transcripts_df = pl.read_parquet(DATA_DIR / "transcripts.parquet")
    related_df = pl.read_parquet(DATA_DIR / "related_items.parquet")

    print(f"  Programs: {len(programs_df)} rows")
    print(f"  Transcripts: {len(transcripts_df)} rows")
    print(f"  Related items: {len(related_df)} rows")

    # Build JSONB structures
    print("\nBuilding transcript JSON...")
    transcripts = build_transcript_json(transcripts_df)
    print(f"  Built transcripts for {len(transcripts)} programs")

    print("\nBuilding related episodes JSON...")
    related = build_related_episodes_json(related_df)
    print(f"  Built related episodes for {len(related)} programs")

    # Connect to database
    print("\nConnecting to database...")
    conn = get_db_connection()

    try:
        # Create tables
        print("Creating tables...")
        create_tables(conn)

        # Load data
        print("\nLoading data...")
        load_programs(conn, programs_df, transcripts, related)

        print("\nDone!")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
