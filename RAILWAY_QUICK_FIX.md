# Quick Fix: Railway Not Picking Up Your Services

## The Problem

Railway is looking at the repository root and finding `dataset/` (Python code) instead of your web app in `app/server` and `app/web`.

## The Solution (5 minutes)

### For Backend Service:

1. Open Railway dashboard
2. Click on your backend service
3. Click **Settings** (gear icon on left)
4. Scroll to **Source** section
5. Find **Root Directory** field
6. Type: `app/server`
7. Click **Deploy** button at top

### For Frontend Service:

1. Click on your frontend service (or create new service)
2. Click **Settings**
3. Scroll to **Source** section
4. Find **Root Directory** field
5. Type: `app/web`
6. Go to **Variables** tab
7. Add variable: `VITE_API_URL` = `https://your-backend-url.railway.app`
8. Click **Deploy** button at top

## Visual Guide

```
Your Repo Structure:
cspan-booknotes/
├── dataset/          ← Railway ignores this
└── app/
    ├── server/       ← Backend: Set Root Directory here
    └── web/          ← Frontend: Set Root Directory here
```

## Railway Dashboard Steps

```
Service Settings
├── General
│   └── Service Name: booknotes-api
├── Source
│   ├── Repository: cspan-booknotes
│   ├── Branch: poc-chat-app              ← CHECK THIS
│   └── Root Directory: app/server        ← SET THIS ⚠️
├── Build
│   ├── Builder: Nixpacks (auto)
│   └── Build Command: (leave default)
└── Variables
    └── (none needed for backend)
```

## Check Your Settings

After setting Root Directory, Railway should show:

**Backend logs:**
```
Building from: app/server
Found package.json
Installing dependencies with bun...
✓ Build successful
```

**Frontend logs:**
```
Building from: app/web
Found package.json
Installing dependencies with bun...
Running: bun run build
✓ Build successful
```

## Still Not Working?

1. **Check the branch**: Make sure service is pointing to `poc-chat-app`, not `main`
2. **Check the path**: It's `app/server` not `/app/server` (no leading slash)
3. **Redeploy**: After changing Root Directory, click the **Deploy** button
4. **Check logs**: Click **Logs** tab to see what Railway is doing

## What You Should See

✅ **Backend**: `https://your-backend.railway.app/health` returns `{"status":"ok"}`
✅ **Frontend**: `https://your-frontend.railway.app` shows CSPAN Booknotes page
✅ **Integration**: Frontend displays "Hello from CSPAN Booknotes API!"

## Need More Help?

See [RAILWAY_SETUP.md](RAILWAY_SETUP.md) for detailed instructions with screenshots-style descriptions.
