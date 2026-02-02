# CSPAN Booknotes Chat App

Interactive web application that lets users "resume" historical CSPAN Booknotes conversations using AI.

## Architecture

```
app/
├── web/          # SvelteKit frontend
├── server/       # Bun backend API
└── shared/       # Shared TypeScript types
```

## Setup

Install dependencies:

```bash
bun install
```

## Development

Run both frontend and backend in parallel:

```bash
bun run dev
```

Or run them separately:

```bash
bun run dev:web      # Frontend only (port 5173)
bun run dev:server   # Backend only (port 3000)
```

## Building for Production

```bash
bun run build
```

## Environment Variables

Create `.env` files in both `web/` and `server/`:

### server/.env
```
ANTHROPIC_API_KEY=your_claude_api_key
NEON_DATABASE_URL=your_neon_connection_string
PORT=3000
```

### web/.env (optional)
```
PUBLIC_API_URL=http://localhost:3000
```

## Features

- Browse historical Booknotes episodes
- View full transcripts with guest and book information
- "Resume" conversations using Claude AI to simulate Brian Lamb and his guests
- Submit custom questions/topics for the AI to explore
- Classic CSPAN-inspired UI design

## Tech Stack

- **Frontend**: SvelteKit, TypeScript, Vite
- **Backend**: Bun, Hono (lightweight web framework)
- **Database**: Neon DB (serverless PostgreSQL)
- **AI**: Claude API (Anthropic)
- **Styling**: Custom CSS with CSPAN aesthetic

## Deployment

This app is designed to deploy to Railway:

1. Connect your GitHub repository
2. Create two services: one for `app/web` and one for `app/server`
3. Configure environment variables
4. Railway will auto-detect the build commands from package.json

## API Endpoints

### GET /api/shows
List all available Booknotes episodes

### GET /api/shows/:id
Get a specific episode with full transcript

### POST /api/chat/resume
Resume a conversation using AI
```json
{
  "showId": "51559-1",
  "userPrompt": "Ask about the Iraq War" // optional
}
```

## Shared Types

The `shared/` directory contains TypeScript types used by both frontend and backend:

- `Show`: Episode metadata and transcript
- `ConversationMessage`: Individual dialogue turns
- `ResumeRequest/Response`: API request/response types
