# Help Center Manuals Workflow

## Source of Truth

All user-facing manuals are stored in **`docs/manuals/*.md`** as the canonical source.

Runtime copies in `public/manuals/*.md` are automatically synced from the source.

## Editing Manuals

1. Edit files in `docs/manuals/`:
   - `SITE_QUICK_START.md` — Getting started guide
   - `QUARTER_JR_PRO.md` — Quarter simulator manual
   - `ENGINE_JR_PRO.md` — Engine simulator manual
   - `FAQ_TROUBLESHOOTING.md` — Common questions

2. Sync happens **automatically** when you run:
   - `npm run dev` (via `predev` hook)
   - `npm run build` (via `prebuild` hook)

3. Manual sync command (if needed):
   ```bash
   npm run manuals:sync
   ```

## CI/CD

Use `npm run manuals:check` in CI pipelines to detect drift:

```bash
npm run manuals:check
```

This fails if `public/manuals/` differs from `docs/manuals/`, ensuring the source of truth is always synced before deployment.

## File Locations

- **Source**: `docs/manuals/*.md` (edit here)
- **Runtime**: `public/manuals/*.md` (auto-synced, do not edit)
- **Scripts**: `scripts/sync-manuals.js`, `scripts/check-manuals.js`
- **Help Page**: `src/pages/Help.tsx` (fetches from `/manuals/*.md`)

## Public Access

The Help Center (`/help`) is fully public:
- No authentication required
- Visible in hamburger menu when logged out
- Manuals served from `public/` directory
