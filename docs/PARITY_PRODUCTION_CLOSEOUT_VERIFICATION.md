# NHRA Parity Suite — Production Closeout Verification Memo

**Date:** 2026-03-11
**Scope:** Final production-readiness verification pass
**Author:** Cascade (engineering closeout)

---

## SECTION A — PRODUCTION MIGRATION VERIFICATION

### A.1 Complete Migration Inventory

| # | File | Creates/Alters | Idempotent | Auth Required | Dependencies |
|---|------|----------------|------------|---------------|--------------|
| 1 | `migrate-v6-parity.php` | `parity_run_imports`, `parity_runs_raw`, `parity_runs` | ✅ IF NOT EXISTS | None | — |
| 2 | `migrate-v6b-parity-indexes.php` | UNIQUE indexes on `parity_runs`, index on `parity_runs_raw` | ✅ catches Duplicate | None | v6 |
| 3 | `migrate-v6c-parity-class-aliases.php` | `parity_class_aliases` + seeds 3 rows | ✅ IF NOT EXISTS + INSERT IGNORE | None | — |
| 4 | `migrate-v6c-parity-weather.php` | `parity_tracks`, `parity_events`, `parity_weather_samples`, `parity_weather_canonical` | ✅ IF NOT EXISTS | None | — |
| 5 | `migrate-v6d-canonical-provenance.php` | Adds 4 columns + index to `parity_weather_canonical` | ⚠️ NOT idempotent (ALTER ADD COLUMN will fail if already exists) | None | v6c |
| 6 | `migrate-v7-db-optimization.php` | Drops redundant indexes, NULLs `raw_json`, OPTIMIZE, optionally drops `parity_runs_raw` | ✅ checks before each op, phase-gated via `?phase=` | None | v6 |
| 7 | `migrate-v8-parity-event-catalog.php` | `parity_event_catalog` | ✅ IF NOT EXISTS | None | — |
| 8 | `migrate-v8-event-code.php` | Adds `event_code` column to `parity_events` | ✅ SHOW COLUMNS check | None | v6c |
| 9 | `migrate-v9-backfill-jobs.php` | `parity_backfill_jobs`, `parity_backfill_job_items` | ✅ IF NOT EXISTS | None | — |
| 10 | `migrate-v10-events-flags.php` | Extends `parity_tracks` + `parity_events`, creates `parity_run_flags`, `parity_scrape_logs` | ✅ column-exists checks + IF NOT EXISTS | None | v6c |
| 11 | `migrate-v11-parity-combos.php` | `parity_engine_combos`, `parity_driver_combos`, fixes weather samples UNIQUE KEY | ✅ IF NOT EXISTS + key-existence checks | None | v6c |
| 12 | `migrate-v12-class-defaults.php` | `parity_class_defaults` | ✅ IF NOT EXISTS | None | v11 (FK to engine_combos) |
| 13 | `migrate-v13-weather-reliability.php` | Adds lat/lon to tracks, provenance + delta columns to canonical, fixes weather samples key, adds source index | ✅ column-exists + index-exists checks | None | v6c |
| 14 | `migrate-v14-run-time-local.php` | Adds `run_time_local` column + index to `parity_runs` | ✅ column-exists checks | **Admin/Owner** | v6 |
| 15 | `migrate-v15-incidents.php` | `incident_types` (+ seeds), `run_incidents`, `incident_media`, `incident_links` | ✅ IF NOT EXISTS + INSERT IGNORE | **Admin/Owner** | v6 (FK to parity_runs) |
| 16 | `migrate-v16-incident-analysis.php` | 5 `incident_analysis_*` tables + uploads directory + `.htaccess` | ✅ IF NOT EXISTS + dir checks | **Admin/Owner** | v15 (FK to run_incidents) |

### A.2 Idempotency Warning

**`migrate-v6d-canonical-provenance.php`** uses raw `ALTER TABLE ... ADD COLUMN` in a transaction. If the columns already exist (e.g., because v13 also adds the same provenance columns), the ALTER will fail and the transaction will roll back. This is safe — it won't corrupt data — but it will report "Migration failed" instead of "Already exists."

**Practical impact:** If v13 has already been run, v6d's provenance columns already exist. The error is cosmetic. Verify by checking: `SHOW COLUMNS FROM parity_weather_canonical LIKE 'canonical_source_kind'`.

### A.3 Ordered Migration Run List

Run in this exact order. Each step must complete before the next.

```
1.  migrate-v6-parity.php                    (no auth)
2.  migrate-v6b-parity-indexes.php           (no auth)
3.  migrate-v6c-parity-class-aliases.php     (no auth)
4.  migrate-v6c-parity-weather.php           (no auth)
5.  migrate-v6d-canonical-provenance.php     (no auth — may fail if v13 already applied, safe to skip)
6.  migrate-v7-db-optimization.php?phase=report  (no auth — report only, no changes)
7.  migrate-v8-parity-event-catalog.php      (no auth)
8.  migrate-v8-event-code.php                (no auth)
9.  migrate-v9-backfill-jobs.php             (no auth)
10. migrate-v10-events-flags.php             (no auth)
11. migrate-v11-parity-combos.php            (no auth)
12. migrate-v12-class-defaults.php           (no auth)
13. migrate-v13-weather-reliability.php      (no auth)
14. migrate-v14-run-time-local.php           (admin auth required)
15. migrate-v15-incidents.php                (admin auth required)
16. migrate-v16-incident-analysis.php        (admin auth required)
```

### A.4 Post-Run Verification

After running all migrations, verify with these queries (via any admin DB tool or a quick PHP script):

| Check | Query | Expected |
|-------|-------|----------|
| Core tables exist | `SHOW TABLES LIKE 'parity_%'` | ≥15 tables |
| Incident tables exist | `SHOW TABLES LIKE 'incident_%'` | `incident_types`, `incident_media`, `incident_links` |
| Analysis tables exist | `SHOW TABLES LIKE 'incident_analysis_%'` | 5 tables |
| Run flags table | `SHOW TABLES LIKE 'parity_run_flags'` | 1 table |
| Backfill jobs table | `SHOW TABLES LIKE 'parity_backfill_%'` | 2 tables |
| Combo tables | `SHOW TABLES LIKE 'parity_%_combos'` | `parity_engine_combos`, `parity_driver_combos` |
| Class aliases seeded | `SELECT COUNT(*) FROM parity_class_aliases` | ≥ 3 |
| Incident types seeded | `SELECT COUNT(*) FROM incident_types` | ≥ 11 |
| run_time_local column | `SHOW COLUMNS FROM parity_runs LIKE 'run_time_local'` | 1 row |
| Upload directory | Diagnose endpoint (see Section B) | `dir:uploads/incident_analysis` → pass |

### A.5 Parity-Critical vs Secondary

**Parity-critical** (must be run for core parity features to work):
- v6, v6b, v6c-weather, v8-catalog, v11-combos, v12-class-defaults, v14-run-time-local

**Incident pipeline** (must be run for incident features):
- v15-incidents, v16-incident-analysis

**Secondary / optimization** (can be deferred without breaking features):
- v6c-class-aliases (only needed for alias expansion)
- v6d-canonical-provenance (provenance tracking)
- v7-db-optimization (performance / disk space)
- v8-event-code (event code display)
- v9-backfill-jobs (batch backfill UI)
- v10-events-flags (run flagging, scrape logs)
- v13-weather-reliability (delta tracking, lat/lon)

### A.6 Evidence of Prior Execution

From deployment memory: v6 and v6b were confirmed run in production (Feb 23, 2026 — cross-import dedupe verified with 2204 rows). For all other migrations, **there is no confirmed evidence of production execution**. They must be verified or re-run.

---

## SECTION B — INCIDENT ANALYSIS V16 VERIFICATION

### B.1 Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `api/incident-analysis.php?action=diagnose` | GET | Bearer token + `incidents.read` capability | Production readiness check |
| `api/migrate-v16-incident-analysis.php` | GET | Bearer token + `admin` or `owner` role | Create tables + upload dirs |

### B.2 Expected Responses

**Diagnose — all good:**
```json
{
  "ok": true,
  "summary": "All checks passed — module is ready",
  "checks": {
    "auth": { "pass": true, "role": "owner" },
    "table:run_incidents": { "pass": true },
    "table:incident_analysis_sessions": { "pass": true },
    "table:incident_analysis_datasets": { "pass": true },
    "table:incident_analysis_channels": { "pass": true },
    "table:incident_analysis_videos": { "pass": true },
    "table:incident_analysis_measurements": { "pass": true },
    ...
  }
}
```

**Diagnose — v16 not run:**
```json
{
  "ok": false,
  "summary": "5 table(s) missing — run migration v16",
  "fix": "Run migration: GET /api/migrate-v16-incident-analysis.php (requires admin auth)",
  "missing_tables": ["incident_analysis_sessions", ...]
}
```

**Diagnose — v15 not run (dependency):**
If `run_incidents` table is also missing, v15 must be run first. The diagnose output will show `"table:run_incidents": { "pass": false }`.

**Migration v16 — success:**
```
=== Migration v16: Incident Analysis ===
── incident_analysis_sessions ──
  Table incident_analysis_sessions OK
...
=== Migration v16 complete ===
```

**Migration v16 — no auth:**
```
HTTP 403: Forbidden: admin role required.
```

### B.3 Auth Requirements

- **Diagnose:** requires any authenticated user with `incidents.read` capability. Admins and owners have this by default.
- **Migration v16:** requires `admin` or `owner` role (checked via `rsa_getAuthUser()`, role check, not capability).
- **Migration v15:** same admin/owner gate — must be run first since v16 tables have FK to `run_incidents`.

### B.4 Smallest Safe Verification Runbook

```
Step 1: GET /api/incident-analysis.php?action=diagnose
        Authorization: Bearer <ADMIN_TOKEN>
        
        → If "ok": true → v16 is applied. Done.
        → If "ok": false and missing_tables includes incident_analysis_* → go to Step 2.
        → If "ok": false and missing_tables includes run_incidents → run v15 first, then v16.

Step 2: GET /api/migrate-v15-incidents.php          (if run_incidents missing)
        Authorization: Bearer <ADMIN_TOKEN>

Step 3: GET /api/migrate-v16-incident-analysis.php
        Authorization: Bearer <ADMIN_TOKEN>

Step 4: GET /api/incident-analysis.php?action=diagnose
        → Confirm "ok": true

Step 5: Open /parity/analysis/<any_incident_id> in browser
        → Page should load without 500 errors
```

### B.5 Documentation Assessment

The existing `docs/INCIDENT_ANALYSIS_RECOVERY.md` is thorough and accurate. It covers:
- Symptom pattern, root cause, deploy, diagnose, migrate, verify, smoke test
- Video upload size limits and fix
- All files and tables involved

**No documentation changes needed.** The recovery runbook is production-ready as-is.

---

## SECTION C — PDF EXPORT PRODUCTION VERIFICATION

### C.1 Export Paths

| # | Export Function | File | UI Surface | Orientation |
|---|----------------|------|------------|-------------|
| 1 | `exportQualSheetPdf()` | `parityPdf.ts:150` | ParityPortal → Qual Sheet tab → "Export PDF" button | Landscape |
| 2 | `exportLadderPdf()` | `parityPdf.ts:202` | ParityPortal → Ladder tab → "Export PDF" button | Portrait |
| 3 | `exportParitySummaryPdf()` | `parityPdf.ts:250` | ParityPortal → Parity Summary tab → "Export PDF" button | Portrait |
| 4 | `exportEventParityPdf()` | `parityPdf.ts:393` | ParityReport → Event mode → "Export PDF" button | Landscape |
| 5 | `exportLongTermParityPdf()` | `parityPdf.ts:678` | ParityReport → Long-Term mode → "Export PDF" button | Landscape |

### C.2 Technology Stack

- **Client-side only.** All PDF generation uses `jsPDF` + `jspdf-autotable`. No backend endpoint is involved.
- Charts are captured from **live DOM SVG** elements via `captureSvgAsImage()` (SVG → Canvas → PNG → embedded in PDF).
- Dependencies: `jspdf` and `jspdf-autotable` (in `package.json`).

### C.3 Backend Data Dependencies

| Export | Backend Endpoints Required | Data Must Exist |
|--------|---------------------------|-----------------|
| Qual Sheet | `parityApi.qualSheet()` → `?action=qualSheet` | Runs ingested for event + class |
| Ladder | `parityApi.ladder()` → `?action=ladder` | Qual sheet data (derived from runs) |
| Parity Summary | `parityApi.eventParitySummary()` → `?action=eventParitySummary` | Runs + weather + engine combos configured |
| Event Parity Report | `paritySummary`, `qualOrder`, `incrementals`, `sessionWeather` | Runs + weather + combos + events |
| Long-Term Parity Report | `rangeParityMatrix` | Multiple events ingested + combos configured |

### C.4 What Could Fail in Production

| Failure Mode | Symptom | Root Cause | Fix |
|--------------|---------|------------|-----|
| Empty PDF / no data | PDF generates but tables are empty | No runs ingested for selected event/class | Ingest data first |
| Missing weather columns | Weather section shows all "—" | Weather samples not backfilled or canonical not built | Run weather backfill + canonical rebuild |
| Chart not captured | PDF has no bar/line chart image | SVG element not in DOM (hidden tab, not rendered yet) | Ensure chart is visible before clicking export |
| Corrected ET all "—" | Corrected columns empty | Engine combos not configured for class, or no weather join | Configure combos; verify weather canonical exists |
| `jsPDF` import error | Export button throws JS error | Bundle issue (unlikely if build passes) | Verify `npm run build` succeeds |
| Browser blocks download | Nothing happens on click | Pop-up blocker or strict CSP | Allowlist site in browser |

### C.5 Production Verification Checklist

Run these in order after confirming data exists for at least one event.

| # | Test | How | Success |
|---|------|-----|---------|
| 1 | Qual Sheet PDF | Navigate to Parity Portal → select event → select class → Qual Sheet tab → "Export PDF" | PDF downloads with driver list, positions, ET/MPH values |
| 2 | Ladder PDF | Same event/class → Ladder tab → "Export PDF" | PDF downloads with bracket pairings, seeds, BYE rounds |
| 3 | Parity Summary PDF | Same event/class → Parity Summary tab → "Export PDF" | PDF with overview stats, actual vs corrected table, run details |
| 4 | Event Parity Report PDF | Navigate to Parity Report → Event mode → select category → "Export PDF" | Multi-section PDF: combo runs, summary comparison, bar chart, incrementals, weather, qual results |
| 5 | Long-Term Report PDF | Parity Report → Long-Term mode → select category → date range with ≥2 events → "Export PDF" | Multi-page PDF: transposed combo×event tables, trend line charts |

**Inspection if failure occurs:**
1. Browser DevTools Console — look for JS errors on click
2. Network tab — verify API calls return 200 with data (not empty arrays)
3. Check that the report tab's charts are actually visible before exporting (chart capture requires DOM presence)

---

## SECTION D — TEMPEST STATION CONFIG VERIFICATION

### D.1 Configuration Mechanism

Tempest weather station config is resolved by `parity_getTempestConfig()` in `api/lib/parity.php:653`:

```
Resolution order (for each variable):
  1. PHP constant (define() in config.php)
  2. getenv() — server environment variable
  3. $_ENV superglobal
```

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `TEMPEST_STATION_ID` | **Yes** | — | WeatherFlow station ID |
| `TEMPEST_API_KEY` | **Yes** | — | WeatherFlow API key |
| `TEMPEST_BUCKET_MINUTES` | No | `30` | Observation bucketing interval |

### D.2 Where Config Is Expected

The production `api/config.php` must define these constants. The file is **not in git** (correctly — it contains credentials). The `config.template.php` currently **does not document these entries** — this is a gap.

### D.3 What Uses Tempest Config

| Feature | Code Path | Impact if Missing |
|---------|-----------|-------------------|
| Manual weather backfill | `parity.php` → `handleWeatherBackfill()` | Returns 500: "TEMPEST_STATION_ID and TEMPEST_API_KEY must be defined" |
| Event data refresh (Step 2) | `parity.php` → `handleRefreshEventData()` | Tempest step fails, logged in `tempest.errors[]`, but Open-Meteo fallback continues |
| Batch backfill jobs | `parity.php` → batch weather loop | Job fails with error status |

### D.4 Failure Behavior

- If `TEMPEST_STATION_ID` or `TEMPEST_API_KEY` is empty → `RuntimeException` thrown
- In `handleRefreshEventData()`, this is caught gracefully — the error is logged in the response but Open-Meteo backfill continues as fallback
- In standalone `handleWeatherBackfill()`, the exception propagates and returns HTTP 500
- **No silent data corruption.** Missing config always produces a visible error.

### D.5 Tempest Config Verification Runbook

```
Step 1: Verify config.php has Tempest entries
        SSH into production and check:
        grep 'TEMPEST_STATION_ID' /home/customer/www/racingsystemsanalysis.com/public_html/api/config.php
        grep 'TEMPEST_API_KEY' /home/customer/www/racingsystemsanalysis.com/public_html/api/config.php

        → If both return define() lines with non-empty values → config is present.
        → If missing → add to config.php:
            define('TEMPEST_STATION_ID', '<your_station_id>');
            define('TEMPEST_API_KEY', '<your_api_key>');
            define('TEMPEST_BUCKET_MINUTES', 30);

Step 2: Test Tempest fetch via Event Refresh
        In the Parity Portal, select an event with known dates and click "Refresh Event Data".
        Check the response JSON for:
          "tempest": { "daysFetched": N, "inserted": N, ... }
        
        → If daysFetched > 0 and no errors → Tempest is working.
        → If errors contain "TEMPEST_STATION_ID" → config missing (Step 1).
        → If errors contain "HTTP 401" or "HTTP 403" → API key is invalid.
        → If errors contain "HTTP 404" → station ID is wrong.

Step 3: Verify Open-Meteo fallback
        Even if Tempest is not configured, Open-Meteo backfill should work independently.
        Check "open_meteo" section of refresh response for successful inserts.
```

---

## SECTION E — FINAL UNKNOWNS / LAST BLOCKERS

| # | Unknown | Why It Matters | How to Verify | Blocks Production-Ready? |
|---|---------|----------------|---------------|--------------------------|
| 1 | **Which migrations have actually been run on production beyond v6/v6b** | Without v6c-weather, v11-combos, v15-incidents, v16-analysis, large portions of the suite are non-functional | Run each migration in order; all are idempotent (or safely error) | **YES** — must verify or re-run |
| 2 | **Whether Tempest credentials exist in production config.php** | Without them, Tempest weather backfill fails (Open-Meteo fallback works) | SSH check or attempt weather backfill via UI | **No** — Open-Meteo fallback exists, but station data quality is lower |
| 3 | **Whether `api/.user.ini` exists with upload limits for incident analysis video** | Large video uploads (>default PHP limit) will silently fail | Run diagnose endpoint, check `php:upload_max_filesize` | **No** — CSV uploads work regardless; video upload is a secondary feature |
| 4 | **Whether uploads/incident_analysis directory exists and is writable** | v16 migration creates it, but server permissions could prevent | Run diagnose endpoint, check `dir:*` entries | **YES** — if v16 hasn't been run |
| 5 | **Whether engine combo data has been seeded** | Without combos, parity reports show no corrected data and the Event/Long-Term reports are empty | `SELECT COUNT(*) FROM parity_engine_combos` — must be > 0 for meaningful reports | **No** — reports work but show "—" for corrected values |

---

## SECTION F — FINAL PRODUCTION CLOSEOUT SUMMARY

### Confirmed Production-Ready

| Item | Evidence |
|------|----------|
| Frontend build | Vite build clean, 0 errors, 0 warnings |
| Unit/component tests | 85 files, 2275 tests, 0 failures |
| PDF export code | 5 export functions, all client-side, no backend dependency for generation |
| Integration test isolation | Excluded from default run; separate config available |
| Deployment pipeline | GitHub Actions auto-deploys `main` → SiteGround via FTP |
| Core parity tables (v6/v6b) | Confirmed deployed and verified (Feb 23, 2026) |
| Dead code removed | ParityDashPanel import removed (~1097 lines saved) |
| UI labels clean | IDR Viewer → "Coming Soon", Ladder tab → no "(exp.)" |
| Deploy manifest | `docs/PARITY_DEPLOY_MANIFEST.md` complete |
| Incident Analysis recovery runbook | `docs/INCIDENT_ANALYSIS_RECOVERY.md` complete and accurate |
| Tempest config mechanism | Graceful failure with RuntimeException; Open-Meteo fallback in refresh path |

### Requires Manual Production Action

| Action | Command | Auth | Priority |
|--------|---------|------|----------|
| Run migrations v6c through v16 | See Section A.3 ordered list | Admin token for v14–v16 | **HIGH** |
| Verify Tempest credentials in config.php | SSH grep (Section D.5) | SSH access | MEDIUM |
| Verify/create `.user.ini` for upload limits | SSH; create if missing (Section B.5 of recovery doc) | SSH access | LOW |

### Requires Live Verification

| Check | How | Priority |
|-------|-----|----------|
| Incident Analysis diagnose | `GET /api/incident-analysis.php?action=diagnose` | HIGH (after v15+v16 migration) |
| PDF export smoke test | Export one PDF from each of the 5 paths (Section C.5) | MEDIUM |
| Tempest weather fetch | Refresh one event, check tempest section of response | MEDIUM |
| Engine combo data presence | Check `parity_engine_combos` table has rows | MEDIUM |

### Non-Blocking Follow-Up Items

| Item | Notes |
|------|-------|
| NOAA CDO weather provider | Stubbed (`ready: false`); not needed for production |
| IDR Data Viewer | Placeholder ("Coming Soon"); no backend yet |
| `config.template.php` Tempest entries | Documentation gap — being fixed in this pass |
| `migrate-v6d` idempotency | Could be improved but v13 covers the same columns |
| Clerk dead code cleanup | `ClerkAuthProvider.tsx`, `clerkConfig.ts` still in tree |

---

### What Must Happen Next (Ordered)

```
1. Run all migrations v6–v16 on production (Section A.3 order)
2. Run Incident Analysis diagnose endpoint to confirm v15+v16 applied
3. Verify Tempest credentials exist in production config.php
4. Smoke test: load /parity, select an event, confirm data loads
5. Smoke test: export one PDF from Qual Sheet tab
6. Smoke test: open /parity/analysis/<id>, confirm no 500
```

### What Can Be Considered Done Afterward

Once steps 1–6 above pass:
- **All parity migrations are applied** ✅
- **Incident Analysis is operational** ✅
- **PDF exports work in production** ✅
- **Weather pipeline is configured** ✅
- **The NHRA Parity Suite is production-ready** ✅

The only remaining items are non-blocking follow-ups (NOAA CDO, IDR Viewer, Clerk dead code) which do not affect production functionality.
