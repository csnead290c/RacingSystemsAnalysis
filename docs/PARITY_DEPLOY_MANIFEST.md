# NHRA Parity Suite — Deployment Manifest

**Last updated:** 2026-03-11

## Deployment Mechanism

All code on `main` is automatically deployed via GitHub Actions (`.github/workflows/deploy.yml`):
- Triggers on push to `main` or `master`
- Builds frontend with `vite build`
- Copies `api/` into `dist/`
- Deploys `dist/` via FTP to SiteGround (`racingsystemsanalysis.com/public_html/`)
- `dangerous-clean-slate: false` — preserves existing files, overwrites changed ones

**Database migrations are NOT run by the workflow.** They must be invoked manually after deploy.

## Parity Backend Files

| File | Role |
|------|------|
| `api/parity.php` | Main API router (~70 action handlers) |
| `api/lib/parity.php` | OData client, field mapper, normalization, weather correction |
| `api/parity_weather_provider.php` | Open-Meteo backfill handler |
| `api/incident-analysis.php` | Incident Analysis workspace API |
| `api/lib/capabilities.php` | `nhra.parity` and `nhra.parity.admin` capability definitions |
| `api/config.php` | DB credentials + Tempest API key (**NOT in git**, must exist on server) |

## Parity Migrations (must run manually after deploy)

All migrations use `CREATE TABLE IF NOT EXISTS` and are safe to re-run.

| Migration | Tables/Changes | Required By |
|-----------|----------------|-------------|
| `api/migrate-v6-parity.php` | parity_runs, parity_runs_raw, parity_run_imports | Core ingest |
| `api/migrate-v6b-parity-indexes.php` | UNIQUE indexes for cross-import dedup | Core ingest |
| `api/migrate-v6c-parity-class-aliases.php` | parity_class_aliases | Class alias expansion |
| `api/migrate-v6c-parity-weather.php` | parity_weather_samples, parity_weather_canonical, parity_events, parity_tracks | Weather pipeline, event/track mgmt |
| `api/migrate-v6d-canonical-provenance.php` | Canonical provenance columns | Weather canonical rebuild |
| `api/migrate-v7-db-optimization.php` | Index optimizations | Performance |
| `api/migrate-v8-parity-event-catalog.php` | parity_event_catalog | Event catalog |
| `api/migrate-v8-event-code.php` | event_code column on events | Event codes |
| `api/migrate-v9-backfill-jobs.php` | parity_backfill_jobs | Backfill job manager |
| `api/migrate-v10-events-flags.php` | Event flags, run flags | Run flagging |
| `api/migrate-v11-parity-combos.php` | parity_engine_combos, parity_driver_combos | Combo system |
| `api/migrate-v12-class-defaults.php` | parity_class_defaults | Class default combos |
| `api/migrate-v13-weather-reliability.php` | Weather reliability columns | Weather confidence |
| `api/migrate-v14-run-time-local.php` | run_time_local column | Local time display |
| `api/migrate-v15-incidents.php` | parity_incidents | Incident CRUD |
| `api/migrate-v16-incident-analysis.php` | 5 incident_analysis_* tables + uploads dir | Incident Analysis workspace |

### How to run migrations

Each migration is a standalone PHP script accessible via HTTP with admin auth:

```
GET https://racingsystemsanalysis.com/api/migrate-v6-parity.php
Authorization: Bearer <ADMIN_TOKEN>
```

Run in order (v6 → v16). Expected output: `Table <name> OK` for each table.

## Parity Frontend Files (in build bundle)

| File | Role |
|------|------|
| `src/pages/ParityPortal.tsx` | Main portal page (~30 tabs) |
| `src/pages/ParityDashPanel.tsx` | Parity dashboard panel |
| `src/pages/ParityReport.tsx` | Event + Long-Term parity reports |
| `src/pages/ParityIdrViewer.tsx` | IDR viewer (coming soon placeholder) |
| `src/pages/AnomaliesPanel.tsx` | Anomaly detection UI |
| `src/pages/IncidentAnalysis.tsx` | Incident telemetry workspace |
| `src/pages/IncidentDrawer.tsx` | Incident slide-out panel |
| `src/pages/BatchBackfillPanel.tsx` | Batch weather backfill |
| `src/pages/TrackCoordCoveragePanel.tsx` | Track coordinate coverage |
| `src/services/parityApi.ts` | Typed API client (~70 endpoints) |
| `src/services/parityPdf.ts` | PDF export (5 report types) |
| `src/domain/parity/*` | 16 domain logic files |

## Server Configuration Requirements

| Item | Location | Notes |
|------|----------|-------|
| DB credentials | `api/config.php` | Must exist on server, not in git |
| Tempest API key | `api/config.php` | Required for live weather station data |
| PHP upload limits | `api/.user.ini` | Set `upload_max_filesize=512M` for video uploads |
| Uploads directory | Created by migrate-v16 | `uploads/incident_analysis/` with `.htaccess` |

## Test Commands

| Command | Scope |
|---------|-------|
| `npm test` | All unit + component tests (excludes integration) |
| `npm run test:integration` | Live-API integration tests (requires auth token + network) |
| `npx vitest run src/domain/parity/` | Parity domain tests only |

## Post-Deploy Checklist

1. ✅ Verify CI pipeline succeeded (GitHub Actions)
2. ✅ Run any new migrations manually
3. ✅ Spot-check `/parity` loads in browser (no blank page, no 500s)
4. ✅ Verify at least one parity endpoint returns 401 (not 500): `GET /api/parity.php?action=paritySummary`
5. ✅ If new weather provider deployed, verify backfill UI shows it
