# Railway Deployment Checklist

Use this checklist to deploy your hello world app to Railway.

## Pre-Deployment

- [ ] All changes committed and pushed to GitHub
- [ ] Verified locally that backend and frontend work together
- [ ] Railway account created (https://railway.app)
- [ ] GitHub repository connected to Railway

## Backend Deployment

- [ ] Created new service in Railway project
- [ ] Set root directory to `app/server`
- [ ] Build command: `bun install && bun run build`
- [ ] Start command: `bun run start`
- [ ] Service deployed successfully
- [ ] Copied the public URL (e.g., `https://booknotes-api.up.railway.app`)
- [ ] Tested `/health` endpoint: `curl https://your-backend-url/health`
- [ ] Tested `/api/hello` endpoint: `curl https://your-backend-url/api/hello`

## Frontend Deployment

- [ ] Created new service in Railway project
- [ ] Set root directory to `app/web`
- [ ] Build command: `bun install && bun run build`
- [ ] Start command: `node build`
- [ ] Added environment variable: `VITE_API_URL` = backend URL from above
- [ ] Added environment variable: `ORIGIN` = frontend URL (Railway provides this)
- [ ] Service deployed successfully
- [ ] Visited frontend URL in browser
- [ ] Verified "Hello from CSPAN Booknotes API!" message appears
- [ ] Verified timestamp shows current server time

## Verification

- [ ] Frontend loads without errors
- [ ] API connection test shows success (green text)
- [ ] Browser console has no errors (F12)
- [ ] Both services show "healthy" status in Railway dashboard

## Troubleshooting (if needed)

If frontend shows "Failed to connect to API":
- [ ] Checked `VITE_API_URL` is correct in frontend environment variables
- [ ] Verified backend is running (check Railway logs)
- [ ] Tested backend `/health` endpoint directly
- [ ] Checked for CORS errors in browser console

If builds fail:
- [ ] Checked Railway build logs
- [ ] Verified `railway.toml` exists in both directories
- [ ] Confirmed all files are committed and pushed to GitHub
- [ ] Tried redeploying from Railway dashboard

## Post-Deployment

- [ ] Documented both service URLs
- [ ] Configured custom domains (optional)
- [ ] Set up monitoring/alerts in Railway (optional)
- [ ] Ready to start building features!

## URLs to Save

Backend URL: `___________________________`

Frontend URL: `___________________________`

## Next Development Steps

Once deployed and verified:
1. [ ] Set up Neon database
2. [ ] Create database schema
3. [ ] Implement seed script
4. [ ] Build conversation selector UI
5. [ ] Add Claude integration
6. [ ] Test full conversation flow

---

**Note**: This is a minimal skeleton. No database or AI features are implemented yet. This deployment verifies that your Railway setup works correctly.
