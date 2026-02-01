# CSPAN Booknotes

This project has two main components:

1. **Dataset Creation**: A Python-based data pipeline that crawls, parses, and organizes transcripts from the classic CSPAN show Booknotes
2. **Interactive Chat App**: A web application that lets users "resume" historical Booknotes conversations using AI

## Project Structure

```
cspan-booknotes/
├── dataset/          # Python data pipeline & HuggingFace Hub management
└── app/              # Web application (Svelte + Bun + Neon DB)
```

## Dataset

The `/dataset` directory contains tools for creating a unique dataset from the public archives of the wonderful CSPAN program [Booknotes](https://booknotes.c-span.org). The dataset includes transcripts of conversations between host [Brian Lamb](https://en.wikipedia.org/wiki/Brian_Lamb) and his more than 800 guests.

### Available Datasets

There are (3) datasets available:

1. `programs`: Information for ~809 episodes, including title, description and guest information
2. `transcripts`: Full conversation transcripts (~200 turns/conversation) between Brian Lamb and his guests
3. `related_items`: Related or recommended programs (~5) for each episode

The `transcripts` dataset is the key dataset, with the other 2 providing additional context and information about each episode. Using the `sequence`, `speaker_role`, and `text` fields, we can create a chat-like dataset representing very interesting conversations.

### Working with the Dataset

```bash
cd dataset
uv sync                    # Install dependencies
uv run scripts/parse_programs.py    # Parse episodes
uv run scripts/upload_to_hf.py      # Upload to HuggingFace Hub
```

See [dataset/README.md](dataset/README.md) for detailed documentation.

## Web Application

The `/app` directory contains an interactive web application that lets users select historical Booknotes episodes and "resume" the conversations using AI. The application simulates both Brian Lamb and his guests continuing their discussions.

### Tech Stack

- **Frontend**: SvelteKit
- **Backend**: Bun + Hono
- **Database**: Neon DB (PostgreSQL)
- **AI**: Claude (Anthropic)
- **Deployment**: Railway

### Development

```bash
cd app
bun install           # Install dependencies
bun run dev           # Start both frontend and backend
```

The frontend runs on `http://localhost:5173` and the backend API on `http://localhost:3000`.

See [app/README.md](app/README.md) for detailed documentation.

## Source JSON Schema

To understand how the 3 tables work together, here's the source JSON schema for each program:

```json
{
  "id": "51559-1",
  "url": "https://booknotes.c-span.org/Watch/51559-1",
  "title": "For the Sake of Argument",
  "guest": "Christopher Hitchens",
  "description": "Mr. Hitchens discussed the recent publication...",
  "book_isbn": "0860914356",
  "air_date": "October 17, 1993",
  "transcript": [
    {
      "sequence": 0,
      "speaker_role": "host",
      "speaker_name": "BRIAN LAMB, HOST:",
      "text": "Christopher Hitchens, author of For the Sake of Argument..."
    },
    {
      "sequence": 1,
      "speaker_role": "guest",
      "speaker_name": "CHRISTOPHER HITCHENS:",
      "text": "Yes."
    }
  ],
  "related": [
    {
      "id": "55567-1",
      "url": "https://booknotes.c-span.org/Watch/55567-1",
      "author": "John Corry",
      "title": "My Times: Adventures in the News Trade"
    }
  ]
}
```

## License

See [LICENSE.md](LICENSE.md) for details.
