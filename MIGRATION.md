# Repository Restructuring

This document explains the repository reorganization completed on 2026-02-01.

## What Changed

The repository has been reorganized from a single Python project into a monorepo with two distinct workspaces:

- `dataset/` - Python-based data pipeline (previously at root)
- `app/` - JavaScript/Svelte web application (newly added)

## File Movements

### Moved to `dataset/`

- `pyproject.toml` → `dataset/pyproject.toml`
- `uv.lock` → `dataset/uv.lock`
- `.python-version` → `dataset/.python-version`
- `pyrightconfig.json` → `dataset/pyrightconfig.json`
- `hf_repo.yaml` → `dataset/hf_repo.yaml`
- `src/` → `dataset/src/`
- `scripts/` → `dataset/scripts/`
- `data/` → `dataset/data/`

### New Files

- `app/` - Complete web application structure
  - `app/web/` - SvelteKit frontend
  - `app/server/` - Bun backend
  - `app/shared/` - Shared TypeScript types
- `SETUP.md` - Setup and development guide
- `MIGRATION.md` - This file

### Modified Files

- `.gitignore` - Updated for both Python and Node/Bun
- `.env.example` - Added web app environment variables
- `README.md` - Restructured to reflect new organization

## Committing Changes

To commit these changes with proper git history:

```bash
# Stage the deletions and modifications
git add -u

# Stage the new directories
git add dataset/ app/ SETUP.md MIGRATION.md

# Commit with a descriptive message
git commit -m "Restructure repo: separate dataset pipeline and web app

- Moved Python code to dataset/ directory
- Added app/ directory with SvelteKit frontend and Bun backend
- Updated .gitignore for both Python and Node workspaces
- Created SETUP.md with development instructions
- Maintained all Python functionality in dataset/
"
```

## Verification

After committing, verify everything works:

### Python Environment

```bash
cd dataset
uv sync
uv run scripts/parse_programs.py --help
```

### Web App (after installing dependencies)

```bash
cd app
bun install
bun run dev
```

## Benefits of This Structure

1. **Clear Separation**: Dataset creation vs. web application are distinct concerns
2. **Independent Tooling**: Python (uv) and JavaScript (Bun) don't interfere
3. **Scalability**: Each workspace can grow independently
4. **IDE Support**: Modern IDEs handle multi-language workspaces well
5. **Deployment**: Easy to deploy web app separately from data pipeline

## Next Steps

1. Commit these changes
2. Install web app dependencies: `cd app && bun install`
3. Create database schema in Neon
4. Implement `dataset/scripts/seed_neon_db.py`
5. Build out the web application features
