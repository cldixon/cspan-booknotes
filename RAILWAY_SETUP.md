# Railway Setup Guide - Monorepo Configuration

Since this is a monorepo with services in subdirectories, Railway needs explicit configuration.

## Problem

Railway by default looks for code at the repository root. Our app structure is:
```
cspan-booknotes/
├── dataset/     # Python - NOT for deployment
└── app/
    ├── server/  # Backend API - DEPLOY THIS
    └── web/     # Frontend - DEPLOY THIS
```

Railway needs to know about the `app/server` and `app/web` subdirectories.

## Solution: Configure Each Service

### Step 1: Create Two Separate Services

You need **two services** in your Railway project:

1. **Backend Service** (for `app/server`)
2. **Frontend Service** (for `app/web`)

### Step 2: Configure Backend Service

1. In Railway dashboard, create or select the backend service
2. Click **Settings** (gear icon)
3. Under **Source** section:
   - **Root Directory**: `app/server` ⚠️ CRITICAL
   - **Branch**: `poc-chat-app` (or your PR branch)
   
4. Under **Build** section (optional but recommended):
   - **Builder**: Nixpacks (should auto-detect Bun)
   - **Build Command**: `bun install && bun run build`
   - **Start Command**: `bun run start`
   - **Watch Paths**: `app/server/**,app/shared/**` (optional)

5. Under **Deploy** section:
   - **Custom Start Command**: `bun run start`

6. Click **Deploy** or **Redeploy**

### Step 3: Configure Frontend Service

1. In Railway dashboard, create or select the frontend service
2. Click **Settings**
3. Under **Source** section:
   - **Root Directory**: `app/web` ⚠️ CRITICAL
   - **Branch**: `poc-chat-app` (or your PR branch)
   
4. Under **Build** section:
   - **Builder**: Nixpacks (should auto-detect Node/Bun)
   - **Build Command**: `bun install && bun run build`
   - **Start Command**: `node build`
   - **Watch Paths**: `app/web/**,app/shared/**` (optional)

5. Under **Deploy** section:
   - **Custom Start Command**: `node build`

6. Add **Environment Variables**:
   - `VITE_API_URL`: (copy the backend service's public URL)
   - `ORIGIN`: (Railway will auto-set this, or use custom domain)

7. Click **Deploy** or **Redeploy**

## Step 4: Enable PR Deployments

1. Go to Project Settings (not service settings)
2. Click **Integrations** → **GitHub**
3. Under **Deploy on PR**:
   - Toggle ON
   - Select branch pattern (e.g., `poc-chat-app` or `*` for all PRs)

4. Each service will now deploy when you push to the PR

## Verification

After configuration:

1. **Backend**: Visit `https://your-backend.railway.app/health`
   - Should return: `{"status":"ok"}`

2. **Backend**: Visit `https://your-backend.railway.app/api/hello`
   - Should return: `{"message":"Hello from CSPAN Booknotes API!","timestamp":"..."}`

3. **Frontend**: Visit `https://your-frontend.railway.app`
   - Should show the CSPAN Booknotes page
   - Should display "Hello from CSPAN Booknotes API!" in green

## Troubleshooting

### "No services found" or builds failing

**Symptom**: Railway doesn't detect anything to build

**Fix**: 
1. Make sure **Root Directory** is set to `app/server` or `app/web`
2. Check that `package.json` exists in those directories
3. Try clicking **Redeploy** after setting root directory

### Backend builds but frontend fails

**Symptom**: Backend works, frontend shows build errors

**Fix**:
1. Verify `@sveltejs/adapter-node` is in `app/web/package.json` dependencies
2. Check that `svelte.config.js` uses `adapter-node` (not `adapter-auto`)
3. Make sure `VITE_API_URL` environment variable is set

### Frontend shows "Failed to connect to API"

**Symptom**: Frontend loads but can't reach backend

**Fix**:
1. Copy the backend's public URL from Railway
2. Add it as `VITE_API_URL` in frontend environment variables
3. Make sure it starts with `https://` and has no trailing slash
4. Redeploy the frontend after adding the variable

### Railway still deploys main branch instead of PR

**Fix**:
1. Go to Service Settings → Source
2. Change **Branch** from `main` to `poc-chat-app`
3. Or enable PR deployments in Project Settings

## Architecture

```
GitHub (poc-chat-app branch)
│
├─► Railway Service 1: Backend
│   └─ Root Directory: app/server
│   └─ Public URL: https://booknotes-api.up.railway.app
│
└─► Railway Service 2: Frontend
    └─ Root Directory: app/web
    └─ Env: VITE_API_URL=https://booknotes-api.up.railway.app
    └─ Public URL: https://booknotes-web.up.railway.app
```

## Common Mistakes

❌ **Setting root directory to `app`** - Too broad, Railway won't know which service
❌ **Not setting root directory at all** - Railway looks at repo root, finds `dataset/` and fails
❌ **Forgetting to set `VITE_API_URL`** - Frontend won't know where backend is
❌ **Using wrong branch** - Make sure branch is set to `poc-chat-app`, not `main`

✅ **Backend root: `app/server`**
✅ **Frontend root: `app/web`**
✅ **Frontend env: `VITE_API_URL` = backend URL**
✅ **Branch: `poc-chat-app`**

## Need Help?

Check Railway logs:
1. Click on the service
2. Click **Logs** tab
3. Look for build or runtime errors

The logs will show you exactly what Railway is trying to do and where it's failing.
