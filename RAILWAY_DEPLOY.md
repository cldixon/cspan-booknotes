# Railway Deployment Guide

This guide will help you deploy the CSPAN Booknotes app to Railway.

## Overview

The app consists of two services:
1. **Backend API** (`app/server`) - Bun + Hono REST API
2. **Frontend Web** (`app/web`) - SvelteKit application

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub repository pushed with the restructured code
- Railway CLI (optional, but recommended)

## Deployment Steps

### Step 1: Create a New Project

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Choose your `cspan-booknotes` repository
4. Railway will create a project

### Step 2: Deploy the Backend API

1. In your Railway project, click "New Service"
2. Select your GitHub repository
3. Configure the service:
   - **Service Name**: `booknotes-api`
   - **Root Directory**: `app/server`
   - **Build Command**: `bun install && bun run build`
   - **Start Command**: `bun run start`

4. Add environment variables:
   - Click on the service → Variables tab
   - Add: `PORT` = `3000` (Railway will override with its own PORT, but this is a fallback)
   
5. Deploy! Railway will automatically build and deploy.

6. Once deployed, copy the public URL (something like `https://booknotes-api.up.railway.app`)

### Step 3: Deploy the Frontend

1. Click "New Service" again
2. Select your GitHub repository
3. Configure the service:
   - **Service Name**: `booknotes-web`
   - **Root Directory**: `app/web`
   - **Build Command**: `bun install && bun run build`
   - **Start Command**: `node build`

4. Add environment variables:
   - Click on the service → Variables tab
   - Add: `VITE_API_URL` = `https://booknotes-api.up.railway.app` (use the URL from Step 2)
   - Add: `ORIGIN` = `https://booknotes-web.up.railway.app` (or your custom domain)

5. Deploy!

### Step 4: Verify Deployment

1. Visit your frontend URL (e.g., `https://booknotes-web.up.railway.app`)
2. You should see "Hello from CSPAN Booknotes API!" with a timestamp
3. If you see an error, check the logs in Railway dashboard

## Alternative: Railway CLI Deployment

If you have the Railway CLI installed:

```bash
# Login to Railway
railway login

# Create a new project
railway init

# Deploy backend
cd app/server
railway up

# Deploy frontend (in a new service)
cd ../web
railway up
```

## Environment Variables Reference

### Backend (`app/server`)
- `PORT` - Server port (Railway sets this automatically)

### Frontend (`app/web`)
- `VITE_API_URL` - Backend API URL (e.g., `https://booknotes-api.up.railway.app`)
- `ORIGIN` - Frontend origin for SvelteKit (Railway's assigned URL or custom domain)

## Troubleshooting

### Frontend shows "Failed to connect to API"

1. Check that `VITE_API_URL` is set correctly in frontend environment variables
2. Verify the backend is running by visiting `https://your-backend-url/health`
3. Check CORS is enabled in the backend (it should be by default)

### Build failures

1. Make sure `railway.toml` exists in both `app/server` and `app/web`
2. Check the build logs in Railway dashboard
3. Verify `bun` is available (Railway's nixpacks should detect it automatically)

### "Cannot find module" errors

1. Make sure you committed and pushed all files
2. Verify `node_modules` is not in git (it shouldn't be)
3. Check that `package.json` dependencies are correct

## Custom Domains (Optional)

1. In Railway, go to your service → Settings → Domains
2. Click "Generate Domain" for a Railway subdomain
3. Or click "Custom Domain" to add your own

## Monitoring

Railway provides:
- Automatic logs (click on service → Logs)
- Metrics (CPU, Memory, Network)
- Deployments history

## Cost

Railway offers:
- $5 free credit per month
- Pay-as-you-go after free tier
- This minimal app should stay within free tier during development

## Next Steps

Once deployed:
1. Test the `/health` endpoint: `https://your-backend-url/health`
2. Test the `/api/hello` endpoint: `https://your-backend-url/api/hello`
3. Visit the frontend and verify the connection works
4. Start building out the actual features!

## Continuous Deployment

Railway automatically redeploys when you push to GitHub:
1. Make changes locally
2. Commit and push to your branch
3. Railway will detect changes and redeploy

To change which branch Railway watches:
- Go to Service → Settings → Source
- Change the branch or deployment triggers
