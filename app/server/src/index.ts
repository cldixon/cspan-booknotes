import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS for the frontend
app.use('/*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// API routes
app.get('/api/hello', (c) => {
  return c.json({
    message: 'Hello from CSPAN Booknotes API!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/shows', (c) => {
  // TODO: Fetch from Neon DB
  return c.json({ shows: [] });
});

app.post('/api/chat/resume', async (c) => {
  // TODO: Implement Claude-based conversation resumption
  return c.json({ message: 'Not implemented yet' });
});

const port = process.env.PORT || 3000;

console.log(`Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
