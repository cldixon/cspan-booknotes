# Quick Start - Hello World Test

Test the minimal skeleton locally before deploying to Railway.

## 1. Install Dependencies

```bash
cd app
bun install
```

This will install dependencies for all workspaces (web, server, shared).

## 2. Start the Backend

Open a terminal:

```bash
cd app/server
bun run dev
```

You should see:
```
Server running on port 3000
```

Test the backend directly:
```bash
# Health check
curl http://localhost:3000/health

# Hello endpoint
curl http://localhost:3000/api/hello
```

Expected response:
```json
{
  "message": "Hello from CSPAN Booknotes API!",
  "timestamp": "2026-02-01T..."
}
```

## 3. Start the Frontend

Open a **new terminal**:

```bash
cd app/web
bun run dev
```

You should see:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

## 4. Test Integration

1. Open your browser to http://localhost:5173
2. You should see:
   - "CSPAN Booknotes" header
   - "API Connection Test" section
   - Green text: "Hello from CSPAN Booknotes API!"
   - Server timestamp

If you see this, everything is working! ✅

## 5. Test Both Services Together

Alternative: Run both at once from the `app/` directory:

```bash
cd app
bun run dev
```

This runs both frontend and backend in parallel.

## Troubleshooting

### Backend won't start
- Make sure you're in `app/server` directory
- Check port 3000 isn't already in use: `lsof -i :3000`
- Try: `bun install` first

### Frontend shows "Failed to connect to API"
- Make sure backend is running on port 3000
- Check browser console for errors (F12)
- Verify CORS is working (it should be enabled by default)

### "Cannot find module" errors
- Run `bun install` in the `app/` directory
- Check that `node_modules` exists in `app/web/` and `app/server/`

## Ready to Deploy?

Once you've verified everything works locally, check out [RAILWAY_DEPLOY.md](../RAILWAY_DEPLOY.md) for deployment instructions.
