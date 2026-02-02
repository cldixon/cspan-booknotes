# CSPAN Booknotes Dataset

Python-based data pipeline for crawling, parsing, and managing the CSPAN Booknotes dataset.

## Setup

This project uses `uv` for dependency management:

```bash
uv sync
```

## Scripts

### Parse Programs
Crawl and parse episodes from the CSPAN Booknotes archive:

```bash
uv run scripts/parse_programs.py
```

### Process Parsed Data
Process the raw parsed data into structured datasets:

```bash
uv run scripts/process_parsed.py
```

### Upload to HuggingFace Hub
Upload the dataset to HuggingFace Hub:

```bash
uv run scripts/upload_to_hf.py
```

### Seed Neon DB
Populate the Neon database from the local parquet files:

```bash
uv run scripts/seed_neon_db.py
```

## Data Files

- `data/programs/`: Raw program data
- `data/processed/`: Processed parquet files ready for upload
- `data/author_index.parquet`: Index of all authors/guests
- `hf_repo.yaml`: HuggingFace repository metadata

## Package

The `cspan_booknotes` package (`src/cspan_booknotes/`) contains reusable parsing and data models:

- `models/`: Pydantic models for data structures
- `parser/`: HTML parsing logic
- `get.py`: HTTP fetching utilities
- `constants.py`: Project constants
- `exceptions.py`: Custom exceptions

## Configuration

Copy `.env.example` to `.env` and configure:

```
HUGGINGFACE_TOKEN=your_token_here
NEON_DATABASE_URL=your_neon_connection_string
```
