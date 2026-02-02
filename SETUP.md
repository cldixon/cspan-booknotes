# Setup Guide

This guide will help you get started with both the dataset pipeline and the web application.

## Repository Structure

```
cspan-booknotes/
├── dataset/          # Python data pipeline
│   ├── src/          # cspan_booknotes package
│   ├── scripts/      # Data processing scripts
│   └── data/         # Local data files
└── app/              # Web application
    ├── web/          # SvelteKit frontend
    ├── server/       # Bun backend
    └── shared/       # Shared TypeScript types
```

## Quick Start

### Dataset Pipeline (Python)

```bash
cd dataset
uv sync                              # Install dependencies
uv run scripts/parse_programs.py    # Parse episodes
uv run scripts/upload_to_hf.py      # Upload to HuggingFace
```

### Web Application (JavaScript/Bun)

```bash
cd app
bun install                          # Install all workspace dependencies
bun run dev                          # Run both frontend and backend
```

## First-Time Setup

### 1. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```
HUGGINGFACE_TOKEN=your_token
NEON_DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=your_claude_key
```

Also create `app/server/.env` with:

```
ANTHROPIC_API_KEY=your_claude_key
NEON_DATABASE_URL=postgresql://...
PORT=3000
```

### 2. Install Dataset Dependencies

```bash
cd dataset
uv sync
```

### 3. Install App Dependencies

```bash
cd app
bun install
```

This will install dependencies for all workspaces (web, server, shared).

### 4. Seed the Database

Once you have your Neon database set up:

```bash
cd dataset
uv run scripts/seed_neon_db.py
```

(Note: This script needs to be created - see below)

## Development Workflow

### Working on the Dataset

```bash
cd dataset
uv run scripts/parse_programs.py     # Parse new data
uv run scripts/process_parsed.py     # Process into parquet files
uv run scripts/upload_to_hf.py       # Push to HuggingFace Hub
```

### Working on the Web App

```bash
cd app

# Run everything
bun run dev

# Or run separately
bun run dev:web      # Frontend at localhost:5173
bun run dev:server   # Backend at localhost:3000
```

### Testing the API

```bash
# Health check
curl http://localhost:3000/health

# Get all shows
curl http://localhost:3000/api/shows

# Get specific show
curl http://localhost:3000/api/shows/51559-1
```

## IDE Configuration

### VS Code / Cursor

The repository should work out of the box. The IDE will detect:

- Python workspace in `dataset/` (uses uv/pyproject.toml)
- Node/TypeScript workspaces in `app/` (uses bun/package.json)

You may want to install these extensions:

- Python (ms-python.python)
- Svelte for VS Code (svelte.svelte-vscode)
- ESLint (dbaeumer.vscode-eslint)

### Python Language Server

The `pyrightconfig.json` in `dataset/` configures type checking for Python.

## Next Steps

1. Create the `dataset/scripts/seed_neon_db.py` script to populate your database
2. Design your database schema for Neon
3. Implement the database queries in `app/server/src/services/db.ts`
4. Build out the Svelte frontend components
5. Refine the Claude prompt in `app/server/src/services/llm.ts`

## Deployment

### Railway

1. Create a new project on Railway
2. Add two services:
   - **Backend**: Point to `app/server/`
   - **Frontend**: Point to `app/web/`
3. Configure environment variables in Railway dashboard
4. Railway will auto-detect build commands from package.json

### Neon Database

1. Create a new project on Neon
2. Copy the connection string
3. Add to `.env` and `app/server/.env`
4. Run the seed script to populate data

## Troubleshooting

### Python virtual environment issues

```bash
cd dataset
rm -rf .venv
uv sync
```

### Bun install issues

```bash
cd app
rm -rf node_modules bun.lockb
bun install
```

### Can't find modules

Make sure you're in the right directory:

- For Python scripts: `cd dataset`
- For web app: `cd app`
