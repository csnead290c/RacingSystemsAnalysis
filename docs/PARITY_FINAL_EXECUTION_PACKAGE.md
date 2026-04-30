# NHRA Parity Suite — Final Execution & Verification Package

**Date:** 2026-03-11
**Purpose:** Operator runbook + acceptance criteria for closing out the parity suite
**Prerequisite:** Code is deployed to production via GitHub Actions (push to `main`)

---

## SECTION A — PRODUCTION EXECUTION CHECKLIST

### Assumptions

- You have an **admin or owner** JWT token (referred to as `<TOKEN>` below)
- The base URL is `https://racingsystemsanalysis.com`
- All migrations are HTTP GET requests with `Authorization: Bearer <TOKEN>` header
- Use curl, Postman, or browser with a REST client extension
- **Record the output of every step** — paste it into the verification report

### Operator Safety Rules

1. **If a blocking migration fails, STOP.** Capture the full output before continuing. Do not proceed to dependent migrations until the failure is understood.
2. **Idempotent / already-exists outcomes count as PASS.** Most migrations use `IF NOT EXISTS` or column-existence checks. Output like "table already exists", "column already exists", or "index exists" means the migration was previously applied and is verified.
3. **"Verified applied" is the goal, not "freshly executed."** A migration that reports everything already exists is just as good as one that creates new objects.

### Execution Steps

Run each step in order. Do not skip ahead.

---

#### Phase 1: Core Parity Migrations (no auth required for steps 1–5)

> **Note on migration endpoint auth:** Steps 1–13 are intentionally unauthenticated in the current implementation. All use `CREATE TABLE IF NOT EXISTS` or similar idempotent DDL, so unauthenticated access cannot corrupt data — it can only create tables that should already exist. This is acceptable for closeout verification. Post-closeout, restricting these endpoints to admin auth is a recommended hardening follow-up.

| Step | Endpoint | Auth | Success Output | If It Fails |
|------|----------|------|----------------|-------------|
| **1** | `GET /api/migrate-v6-parity.php` | None | "Migration v6 Complete" + 3 tables OK/exists | Check DB connectivity in config.php |
| **2** | `GET /api/migrate-v6b-parity-indexes.php` | None | "Migration v6b Complete" + indexes Added/Exists | Requires step 1 first |
| **3** | `GET /api/migrate-v6c-parity-class-aliases.php` | None | "✅ parity_class_aliases table created" or exists + seeds | Check DB permissions |
| **4** | `GET /api/migrate-v6c-parity-weather.php` | None | "Migration v6c Complete" + 4 tables OK/exists | Check DB connectivity |
| **5** | `GET /api/migrate-v6d-canonical-provenance.php` | None | "✓ Migration v6d completed" or "Duplicate column" | **"Duplicate column" = already applied = PASS.** Safe to skip and continue |

#### Phase 2: Optimization & Extensions (no auth required)

| Step | Endpoint | Auth | Success Output | If It Fails |
|------|----------|------|----------------|-------------|
| **6** | `GET /api/migrate-v7-db-optimization.php?phase=report` | None | Size report (no changes made) | Record the output — useful for DB health baseline |
| **7** | `GET /api/migrate-v8-parity-event-catalog.php` | None | "Migration v8 Complete" + table OK/exists | Check DB |
| **8** | `GET /api/migrate-v8-event-code.php` | None | "Migration v8 complete" + column added/exists | Requires step 4 (parity_events table) |
| **9** | `GET /api/migrate-v9-backfill-jobs.php` | None | "Migration v9 Complete" + 2 tables OK/exists | Check DB |
| **10** | `GET /api/migrate-v10-events-flags.php` | None | "Migration v10 Complete" or columns/tables exist | Requires step 4 |
| **11** | `GET /api/migrate-v11-parity-combos.php` | None | "Migration v11 Complete" + 2 tables OK/exists | Requires step 4 |
| **12** | `GET /api/migrate-v12-class-defaults.php` | None | "Migration v12 complete" + table OK/exists | Requires step 11 (FK to engine_combos) |
| **13** | `GET /api/migrate-v13-weather-reliability.php` | None | "Migration v13 Complete" + columns added/exists | Requires step 4 |

#### Phase 3: Auth-Gated Migrations (admin token required)

| Step | Endpoint | Auth | Success Output | If It Fails |
|------|----------|------|----------------|-------------|
| **14** | `GET /api/migrate-v14-run-time-local.php` | `Bearer <TOKEN>` | "Migration v14 Complete" + column added/exists | "Forbidden" → token is not admin/owner |
| **15** | `GET /api/migrate-v15-incidents.php` | `Bearer <TOKEN>` | "Migration v15 complete" + 4 tables OK/exists + seeds | "Forbidden" → check token role |
| **16** | `GET /api/migrate-v16-incident-analysis.php` | `Bearer <TOKEN>` | "Migration v16 complete" + 5 tables OK/exists + upload dir | "Forbidden" → check token. Requires step 15 |

#### Phase 4: Incident Analysis Verification

| Step | Endpoint | Auth | Success Output | If It Fails |
|------|----------|------|----------------|-------------|
| **17** | `GET /api/incident-analysis.php?action=diagnose` | `Bearer <TOKEN>` | `"ok": true, "summary": "All checks passed"` | See `missing_tables` and `fix` fields in response |

#### Phase 5: Tempest Config Check

| Step | Action | Success | If It Fails |
|------|--------|---------|-------------|
| **18** | SSH: `grep 'TEMPEST_STATION_ID' api/config.php` | Returns a `define()` line with a non-empty value | Add entries per `config.template.php` |
| **19** | SSH: `grep 'TEMPEST_API_KEY' api/config.php` | Returns a `define()` line with a non-empty value | Same as above |

#### Phase 6: Live Smoke Tests

| Step | Action | Success | If It Fails |
|------|--------|---------|-------------|
| **20** | Open `https://racingsystemsanalysis.com/parity` in browser (logged in as admin) | Portal loads, tabs visible, no blank page | Check browser console for JS errors |
| **21** | Select any event with ingested data → Qual Sheet tab | Driver list appears with ET/MPH values | No events → ingest data first |
| **22** | Qual Sheet tab → click "Export PDF" | PDF downloads and opens with rendered table structure | **True failure:** JS error, no download, blank/corrupt file. **Not a failure:** sparse data or "—" values (data-dependent) |
| **23** | Ladder tab → click "Export PDF" | PDF downloads with bracket structure rendered | Same criteria as step 22 |
| **24** | Navigate to Parity Report → Event mode → select a category → click "Export PDF" | PDF downloads with report sections rendered | Empty sections due to unconfigured combos or absent data = expected, not failure. JS error or no download = failure |
| **25** | Select event → click "Refresh Event Data" | Response JSON returns 200. **PASS if any of:** `tempest.daysFetched > 0`, `open_meteo.inserted > 0`, or `open_meteo.deduped > 0`. Tempest errors alone are acceptable if Open-Meteo succeeds. | **True failure:** HTTP 500, or both tempest AND open_meteo sections contain only errors with 0 inserts. Tempest config-missing error alone is non-blocking |
| **26** | Open `/parity/analysis/<any_incident_id>` (if incidents exist) | Page loads, no 500 errors in network tab | Run diagnose (step 17) again |

---

**After completing all 26 steps, proceed to Section B.**

---

## SECTION B — POST-RUN VERIFICATION CHECKLIST

Run these checks immediately after executing all steps in Section A.

### B.1 — Migration Verification

| # | Check | How to Verify | Expected | Failure Symptom | Severity |
|---|-------|---------------|----------|-----------------|----------|
| M1 | Core parity tables exist | `SHOW TABLES LIKE 'parity_%'` | ≥15 tables | Missing tables → migrations didn't run | **BLOCKING** |
| M2 | Incident tables exist | `SHOW TABLES LIKE 'incident_%'` | `incident_types`, `incident_media`, `incident_links` | Missing → v15 not run | **BLOCKING** for incidents |
| M3 | Analysis tables exist | `SHOW TABLES LIKE 'incident_analysis_%'` | 5 tables | Missing → v16 not run | **BLOCKING** for analysis |
| M4 | Class aliases seeded | `SELECT COUNT(*) FROM parity_class_aliases` | ≥ 3 | 0 → v6c-aliases not run | Non-blocking |
| M5 | Incident types seeded | `SELECT COUNT(*) FROM incident_types` | ≥ 11 | 0 → v15 not run | BLOCKING for incidents |
| M6 | run_time_local column | `SHOW COLUMNS FROM parity_runs LIKE 'run_time_local'` | 1 row | Missing → v14 not run | Non-blocking (display only) |
| M7 | Combo tables exist | `SHOW TABLES LIKE 'parity_%_combos'` | 2 tables | Missing → v11 not run | BLOCKING for parity reports |

### B.2 — Incident Analysis Verification

| # | Check | How to Verify | Expected | Failure Symptom | Severity |
|---|-------|---------------|----------|-----------------|----------|
| I1 | Diagnose passes | Step 17 response | `"ok": true` | `"ok": false` with `missing_tables` | **BLOCKING** |
| I2 | Upload dirs exist | Diagnose `dir:*` fields | All `pass: true`, `writable: true` | `pass: false` → v16 dir creation failed | **BLOCKING** for uploads |
| I3 | Upload security | Diagnose `dir:htaccess` | `pass: true` | Missing → uploads may be directly accessible | HIGH |
| I4 | PHP upload limits | Diagnose `php:upload_max_filesize` | `video_ok: true` or at least `csv_ok: true` | `video_ok: false` → large video uploads fail | Non-blocking (CSV works) |
| I5 | Page loads | `/parity/analysis/<id>` | No 500 in network tab | 500 on getSession → tables missing | **BLOCKING** |

### B.3 — PDF Export Verification

**Key distinction:** PDF export *success* = the export completes, file downloads, and expected report structure renders (headers, table grid, section labels). Missing *values* or sparse sections caused by absent source data or unconfigured combos are data issues, not export failures. **True export failure** = JS error in console, no download triggered, blank/corrupt PDF, or obviously missing rendered structure.

| # | Check | How to Verify | Expected | Failure Symptom | Severity |
|---|-------|---------------|----------|-----------------|----------|
| P1 | Qual Sheet PDF | Step 22 | PDF downloads with table structure (headers, rows). "—" values for missing data = OK | JS error, no download, blank file, or no table structure | **BLOCKING** |
| P2 | Ladder PDF | Step 23 | PDF downloads with bracket structure rendered | JS error, no download, blank file | **BLOCKING** |
| P3 | Event Parity PDF | Step 24 | PDF downloads with report section headings. Empty combo rows or missing chart = data-dependent, not failure | JS error or no download | Non-blocking (data-dependent) |
| P4 | Long-Term PDF | Parity Report → Long-Term → Export | PDF downloads with table structure. Empty cells = expected if few events | JS error or no download | Non-blocking |
| P5 | Parity Summary PDF | Parity Summary tab → Export | PDF downloads with stats and run table. "—" for corrected values = combos not configured, not failure | JS error or no download | Non-blocking |

### B.4 — Weather / Tempest Verification

**Key distinction:** The weather pipeline has two independent providers (Tempest station + Open-Meteo archive). Either one succeeding is sufficient. Missing Tempest config is **non-blocking** as long as Open-Meteo works — Open-Meteo provides reliable historical data for all tracks with lat/lon. **True weather failure** = both providers return 0 inserts and errors for the same event.

| # | Check | How to Verify | Expected | Failure Symptom | Severity |
|---|-------|---------------|----------|-----------------|----------|
| W1 | Tempest config present | Steps 18–19 | Non-empty define() values | Empty or missing lines — acceptable if W3 passes | Non-blocking |
| W2 | Tempest fetch works | Step 25, check `tempest` section | `daysFetched > 0`, `errors: []` | Config-missing error = expected if W1 failed. HTTP 401/404 = bad credentials/station ID | Non-blocking |
| W3 | Open-Meteo fallback | Step 25, check `open_meteo` section | `inserted > 0` or `deduped > 0` | Errors with 0 inserts → track missing lat/lon (fixable via track editor) | Non-blocking, but should be fixed for weather quality |
| W4 | Canonical build | Step 25, check `canonical` section | `bucketsBuilt > 0` | 0 = no weather samples exist to canonicalize (W2 + W3 both failed) | Non-blocking, but weather-corrected data unavailable |

### B.5 — Parity-Critical Workflow Checks

| # | Check | How to Verify | Expected | Failure Symptom | Severity |
|---|-------|---------------|----------|-----------------|----------|
| C1 | Portal loads | Step 20 | Tabs render, no blank page | White page, console errors | **BLOCKING** |
| C2 | Event data loads | Select event → Event Runs tab | Run table populates | Empty table → no ingested data for event | Non-blocking (data-dependent) |
| C3 | Parity Report renders | Parity Report tab → select category | Summary table + bar chart appear | Empty → no combos configured | Non-blocking |
| C4 | Auth works | Any authenticated parity API call | Valid token → 200 response. Invalid/missing token → structured 401 or 403 (not 500) | 500 error on any auth path = backend failure | **BLOCKING** |

---

## SECTION C — FINAL GO / NO-GO MATRIX

| # | Verification Item | Pass Criteria | Fail Criteria | Blocking? | Notes |
|---|-------------------|---------------|---------------|-----------|-------|
| 1 | Core parity tables (v6/v6b) | `parity_runs`, `parity_run_imports` exist | Any missing | **YES** | Foundation for everything |
| 2 | Weather tables (v6c) | `parity_tracks`, `parity_events`, `parity_weather_samples`, `parity_weather_canonical` exist | Any missing | **YES** | Required for weather pipeline |
| 3 | Combo tables (v11) | `parity_engine_combos`, `parity_driver_combos` exist | Missing | **YES** | Required for parity reports |
| 4 | Class defaults (v12) | `parity_class_defaults` exists | Missing | **YES** | Required for combo fallback |
| 5 | Incident tables (v15) | `incident_types`, `run_incidents`, `incident_media`, `incident_links` exist | Any missing | **YES** | Required for incident features |
| 6 | Analysis tables (v16) | 5 `incident_analysis_*` tables exist | Any missing | **YES** | Required for analysis workspace |
| 7 | Diagnose endpoint passes | `"ok": true` | `"ok": false` | **YES** | Aggregated health check |
| 8 | Portal loads in browser | Page renders, tabs visible | Blank page or console errors | **YES** | Frontend deployment |
| 9 | At least one PDF exports | Qual Sheet or Ladder PDF downloads with rendered structure (sparse data OK) | JS error, no download, or blank/corrupt file | **YES** | Client-side PDF pipeline |
| 10 | Auth to parity API works | Valid token → 200. Invalid token → structured 401/403. No 500s on auth paths | 500 error on any auth path | **YES** | Backend deployment |
| 11 | Tempest config present | `grep` returns non-empty values | Missing entries | No | Non-blocking: Open-Meteo provides fallback |
| 12 | At least one weather provider works | Refresh returns `tempest.daysFetched > 0` OR `open_meteo.inserted > 0` | Both providers return 0 inserts + errors | No | Track lat/lon may need setup for Open-Meteo |
| 13 | Video upload limits | `php:upload_max_filesize` ≥ 512M | Below 512M | No | Only affects large video uploads |
| 14 | Engine combos seeded | `parity_engine_combos` row count > 0 | 0 rows | No | Reports work but show "—" for corrected |
| 15 | Event catalog populated | `parity_event_catalog` row count > 0 | 0 rows | No | Charting labels may be generic |
| 16 | run_time_local column | Column exists on parity_runs | Missing | No | Only affects local time display |

### Decision Rules

- **Items 1–10 all pass** → **GO** — suite is production-ready
- **Items 1–10 pass, some of 11–16 fail** → **GO with non-blocking follow-ups** — document and schedule
- **Any of items 1–10 fail** → **NO-GO** — fix the failing item and re-verify

---

## SECTION D — PUNCH LIST TEMPLATE

Copy and paste this template for each issue found during live verification.

```
### Issue: [SHORT TITLE]

| Field | Value |
|-------|-------|
| **Area** | [Migration / Incident Analysis / PDF Export / Weather / Portal UI / Auth] |
| **Environment** | Production |
| **Step Failed** | [Section A step number, e.g. "Step 17"] |
| **Steps to Reproduce** | [Exact actions taken] |
| **Expected** | [What should have happened] |
| **Actual** | [What actually happened — paste output/screenshot] |
| **Severity** | [BLOCKING / HIGH / MEDIUM / LOW] |
| **Blocks Closeout?** | [Y / N] |
| **Likely Files/Systems** | [e.g. api/migrate-v15-incidents.php, DB permissions] |
| **Owner** | [Name or "unassigned"] |
| **Resolution** | [Open / Fixed / Deferred] |
| **Notes** | [Any additional context] |
```

**Blank compact version for rapid logging:**

```
Issue: 
Area: 
Step: 
Expected: 
Actual: 
Severity: 
Blocks Closeout: Y/N
Likely cause: 
Resolution: Open
```

---

## SECTION E — FINAL CLOSEOUT CRITERIA

### Must-Pass (all required to declare production-ready)

1. **All 16 migrations verified applied** — each reports OK/Exists/Complete/"already exists" (v6d "Duplicate column" is acceptable = already applied)
2. **Incident Analysis diagnose returns `"ok": true`**
3. **Parity Portal loads** at `/parity` with tabs visible and no console errors
4. **At least one PDF export works** — Qual Sheet or Ladder PDF downloads with rendered report structure (sparse data due to absent source data is OK; JS error, no download, or blank file is not)
5. **Parity API auth works** — valid token returns 200; invalid/missing token returns structured 401/403; no 500 errors on auth paths
6. **Upload directories exist and are writable** — diagnose `dir:*` all pass

### Should-Pass (non-blocking, document if they fail)

7. Tempest config present in production config.php
8. Open-Meteo weather fetch succeeds for at least one event
9. Video upload size limit ≥ 512M (csv uploads work regardless)
10. Engine combos table has at least one row (enables corrected parity data)
11. Event catalog has rows (enables event name labels in charts)
12. Parity Report Event PDF exports with all sections populated

### Future Polish Only (do not block on these)

13. NOAA CDO weather provider (stubbed, `ready: false`)
14. IDR Data Viewer (placeholder, "Coming Soon")
15. Clerk dead code removal (`ClerkAuthProvider.tsx`, `clerkConfig.ts`)
16. `migrate-v6d` idempotency improvement
17. Parity Report Long-Term PDF with multiple events (requires data seeding)

### The Finish Line

> **The NHRA Parity Suite is buttoned up for production operational use when items 1–6 all pass.**
>
> Items 7–12 failing means the suite is operational but some features are degraded or data-dependent — these should be tracked as fast follow-ups.
>
> Items 13–17 are backlog polish — they do not affect production operations.

---

## SECTION F — RECOMMENDED RESPONSE FORMAT

When you report live verification results back, use this structure:

```
## Parity Closeout — Live Verification Report

**Date:** YYYY-MM-DD
**Operator:** [name]
**Environment:** Production (racingsystemsanalysis.com)

### Migration Execution (Steps 1–16)

| Step | Migration | Result | Output (key lines) |
|------|-----------|--------|--------------------|
| 1 | v6-parity | PASS/FAIL | "Migration v6 Complete" |
| 2 | v6b-indexes | PASS/FAIL | "..." |
| ... | ... | ... | ... |
| 16 | v16-incident-analysis | PASS/FAIL | "..." |

### Diagnose Endpoint (Step 17)

```json
[paste full JSON response here]
```

Result: PASS / FAIL

### Tempest Config (Steps 18–19)

- TEMPEST_STATION_ID present: Y/N
- TEMPEST_API_KEY present: Y/N

### Smoke Tests (Steps 20–26)

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 20 | Portal loads | PASS/FAIL | |
| 21 | Event data loads | PASS/FAIL | |
| 22 | Qual Sheet PDF | PASS/FAIL | |
| 23 | Ladder PDF | PASS/FAIL | |
| 24 | Event Parity PDF | PASS/FAIL | |
| 25 | Refresh Event Data | PASS/FAIL | tempest: X days, open_meteo: X inserted |
| 26 | Incident Analysis page | PASS/FAIL | |

### Issues Found

[Use Section D template for each issue, or "None"]

### Go / No-Go Assessment

Based on Section C matrix:
- Items 1–10: [ALL PASS / which failed]
- Items 11–16: [status]
- **Verdict: GO / GO WITH FOLLOW-UPS / NO-GO**

### Screenshots / Error Logs

[Attach or paste any relevant screenshots, console errors, or response bodies]
```

### What Happens Next

Once you bring results back in this format, I will:

1. **Immediately assess** GO / NO-GO against the Section C matrix
2. **If GO** — confirm closeout, document any non-blocking follow-ups
3. **If NO-GO** — identify the exact fix needed, implement it as the smallest possible change, and give you updated steps to re-verify
4. **Either way** — produce the final closeout declaration with timestamps

The goal is **one round-trip**: you execute + report → I confirm or fix → done.
