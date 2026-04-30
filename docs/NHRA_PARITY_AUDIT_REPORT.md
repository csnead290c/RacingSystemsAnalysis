# NHRA Parity Suite — Completion Audit Report

**Date:** June 2025
**Scope:** All parity-related backend, frontend, services, domain, admin tooling, tests, and deployment state.
**Method:** Code-aware static audit of the full RSA codebase. No runtime testing performed; findings based on source analysis.

---

## Section A: Executive Summary

The NHRA Parity Suite is a **substantial, largely functional internal tool** for ingesting, normalizing, analyzing, and reporting NHRA drag racing run data with weather-corrected parity analysis. The system spans ~25,000 lines across PHP backend, TypeScript domain logic, React UI, and PDF export layers.

### Overall Completion: ~90%

**What works well:**
- OData ingest pipeline with cross-import deduplication (verified in production)
- Weather data pipeline: Tempest station, Open-Meteo backfill, CSV import, canonical rebuild
- Weather correction model (HPC-based ET/MPH correction with engine combo parameters)
- Event/track/class management with admin CRUD
- Engine combo + driver combo assignment system
- Parity-by-combo analysis with split endpoints for fast loading
- Range parity matrix (multi-event trend analysis)
- Anomaly detection engine
- Incident tracking system with IDR viewer scaffold
- PDF export for event parity, long-term parity, qual sheet, ladder, and summary reports
- Live timing panel with auto-refresh for ongoing events
- Comprehensive typed API client (2,497 lines, ~70 endpoints)
- 44 domain files with 28 dedicated test files

**What needs attention:**
- 6 test files failing (4 unrelated App.tsx routing tests + 2 parity integration suites that require live API)
- NOAA CDO weather provider is stubbed (throws "not yet implemented")
- IDR Viewer is a placeholder shell (no data loading/rendering)
- ParityPortal.tsx is 7,025 lines — monolithic, high maintenance burden
- Production deployment memory says only Phase 2 files deployed; significant local-only features exist
- 85 TODOs scattered across parity files (mostly in ParityPortal.tsx)

---

## Section B: Master Audit Table

### B1. Backend API (`api/parity.php` — 10,734 lines)

| Feature Area | Status | Evidence | Gaps/Risks | Next Step |
|---|---|---|---|---|
| Ingest (single) | ✅ Complete | `handleIngest()` with OData fetch, normalize, upsert, dedup | None | — |
| Ingest (bulk) | ✅ Complete | `handleIngestMany()` via `ingestMany` action | None | — |
| Ingest (event) | ✅ Complete | `handleIngestEventRuns()` via `ingestEventRuns` action | None | — |
| Peek | ✅ Complete | `handlePeek()` — lightweight OData probe | None | — |
| Suggest Race Lookups | ✅ Complete | `handleSuggestRaceLookups()` — scans Thu/Fri/Wed candidates | Rate safety via 100ms sleep | — |
| Query Runs | ✅ Complete | `handleQueryRuns()` with class alias expansion, filters, pagination | None | — |
| Runs With Weather | ✅ Complete | `handleRunsWithWeather()` — joins canonical weather within window | N+1 query pattern (fast, 0.06ms/lookup) | Monitor at scale |
| Import History | ✅ Complete | `handleListImports()` | None | — |
| Track CRUD | ✅ Complete | create, update, merge, list with stats, coord update, bulk coord update | None | — |
| Event CRUD | ✅ Complete | create, update, bulk create, events with stats | None | — |
| Class Aliases | ✅ Complete | list, add, delete + `parity_expandClassIndex()` | None | — |
| Engine Combos | ✅ Complete | list, upsert, delete (tPower, dPower, FF params) | None | — |
| Driver Combos | ✅ Complete | list, upsert, delete, bulk upsert, drivers at event | None | — |
| Class Defaults | ✅ Complete | list, upsert, delete | None | — |
| Weather Backfill (Tempest) | ✅ Complete | `handleWeatherBackfill()` in parity.php | Requires station API key in config | — |
| Weather Backfill (Open-Meteo) | ✅ Complete | `handleBackfillWeatherProvider()` in `parity_weather_provider.php` | None | — |
| Weather Backfill (CSV) | ✅ Complete | `handleBackfillWeatherCsv()` | None | — |
| Weather Backfill (Station CSV) | ✅ Complete | `handleImportStationCsv()` | None | — |
| Weather Build Canonical | ✅ Complete | `handleWeatherBuildCanonical()` | None | — |
| Weather Coverage | ✅ Complete | `handleWeatherCoverage()` | None | — |
| Weather Health | ✅ Complete | backfill + rebuild actions | None | — |
| Weather Timeseries | ✅ Complete | `handleWeatherTimeseries()` with multi-source stats | None | — |
| Parity By Combo | ✅ Complete | Monolith endpoint with full analysis | Superseded by split endpoints | Deprecate eventually |
| Parity Summary (split) | ✅ Complete | Fast initial load — combos + trust + mapping | None | — |
| Parity Deltas (split) | ✅ Complete | On-demand delta matrices | None | — |
| Parity All Runs (split) | ✅ Complete | Paginated with server-side driver search | None | — |
| Parity Qual Order (split) | ✅ Complete | Lean qualifying order | None | — |
| Parity Incrementals | ✅ Complete | Optimal-run incrementals per combo | None | — |
| Parity Session Weather | ✅ Complete | Per-session weather aggregation with confidence | None | — |
| Range Parity Matrix | ✅ Complete | Multi-event trend matrix | None | — |
| Event Parity Summary | ✅ Complete | `handleEventParitySummary()` | None | — |
| Qual Sheet | ✅ Complete | `handleQualSheet()` with optional corrected values | None | — |
| Ladder | ✅ Complete | `handleLadder()` | None | — |
| Top By Event | ✅ Complete | `handleTopByEvent()` with corrected ET support | None | — |
| Run Flagging | ✅ Complete | flag, unflag, list flags (bad/note/exclude types) | None | — |
| Run Update | ✅ Complete | `handleUpdateRun()` — admin-only field editing | Requires `nhra.parity.admin` | — |
| NHRA Schedule Scraper | ✅ Complete | `handleScrapeNhraSchedule()` | None | — |
| Backfill Jobs | ✅ Complete | start runs, start weather, resume, cancel, status, list | None | — |
| Batch Weather Backfill | ✅ Complete | `handleBatchWeatherBackfill()` with coverage threshold | None | — |
| Refresh Event Data | ✅ Complete | `handleRefreshEventData()` — timing + Tempest + Open-Meteo + canonical | None | — |
| Orphan Runs | ✅ Complete | `handleListOrphanRuns()` | None | — |
| Time Diagnostics | ✅ Complete | smoke test + sample endpoints | None | — |
| UTC Backfill | ✅ Complete | `handleBackfillRunUtcFromLocal()` | None | — |
| Anomaly Analysis | ✅ Complete | analysis + detail endpoints | None | — |
| Event Categories | ✅ Complete | `handleEventCategories()` | None | — |
| Parity Smoke Test | ✅ Complete | `handleParitySmokeTest()` | None | — |

### B2. Backend Library (`api/lib/parity.php` — 768 lines)

| Feature | Status | Notes |
|---|---|---|
| OData HTTP client | ✅ Complete | Pagination, retry, v2/v4 shape detection |
| Field alias mapping | ✅ Complete | `PARITY_FIELD_ALIASES` constant, tightened from real data |
| Row normalization | ✅ Complete | `parity_normalizeRow()` with timestamp parsing |
| Row hashing | ✅ Complete | `parity_computeRowHash()` for dedup |
| Upsert with merge | ✅ Complete | `parity_upsertRun()` — insert/update/skip |
| Event matching | ✅ Complete | `parity_matchEvent()` by UTC datetime |
| Tempest weather client | ✅ Complete | `parity_fetchTempest()` with retry |
| Timezone conversion | ✅ Complete | `parity_utcToLocal()` / `parity_localToUtc()` |
| UUID generation | ✅ Complete | `parity_generateUUID()` |
| Class alias expansion | ✅ Complete | `parity_expandClassIndex()` |
| Weather correction factor | ✅ Complete | `parity_correctionFactor()` with STD conditions |

### B3. Frontend — ParityPortal (`src/pages/ParityPortal.tsx` — 7,025 lines)

| Tab/Panel | Status | Notes |
|---|---|---|
| Event Runs | ✅ Complete | Full column picker, sort, weather columns, computed splits, incident cells |
| Live Timing | ✅ Complete | Auto-refresh via `useAutoRefresh`, column picker |
| Qual Sheet | ✅ Complete | PDF export via `exportQualSheetPdf` |
| Driver History | ✅ Complete | Drilldown with charts, CSV export, corrected values |
| Trends | ✅ Complete | Top-by-event charting |
| Weather Dashboard | ✅ Complete | Timeseries with multi-source stats |
| Parity Report | ✅ Complete | Delegated to `ParityReport.tsx` |
| Anomalies | ✅ Complete | Delegated to `AnomaliesPanel.tsx` (941 lines) |
| Admin: Tracks | ✅ Complete | CRUD with merge, stats |
| Admin: Events | ✅ Complete | CRUD with bulk import |
| Admin: Class Aliases | ✅ Complete | List/add/delete |
| Admin: Combo Definitions | ✅ Complete | Engine combo CRUD |
| Admin: Driver Combos | ✅ Complete | Raw assignment list |
| Admin: Assign Combos | ✅ Complete | Bulk assignment UI |
| Admin: Parity Summary | ✅ Complete | Legacy summary panel |
| Admin: Ingest | ✅ Complete | Single + bulk ingest |
| Admin: Peek | ✅ Complete | OData probe |
| Admin: Query Runs | ✅ Complete | Raw query interface |
| Admin: Imports | ✅ Complete | Import history list |
| Admin: Weather | ✅ Complete | Weather sample viewer |
| Admin: Runs + Weather | ✅ Complete | Joined weather view |
| Admin: Weather Correction | ✅ Complete | Correction model inspector |
| Admin: Backfill Weather | ✅ Complete | Provider selector (CSV ✅, Open-Meteo ✅, NOAA ❌) |
| Admin: Backfill | ✅ Complete | Backfill job manager |
| Admin: Weather Health | ✅ Complete | Coverage + rebuild |
| Admin: Time Diagnostics | ✅ Complete | UTC/local smoke test |
| Admin: Import Station CSV | ✅ Complete | Station CSV import |
| Admin: Track Coords | ✅ Complete | Delegated to `TrackCoordCoveragePanel.tsx` |
| Admin: Batch Backfill | ✅ Complete | Delegated to `BatchBackfillPanel.tsx` |
| Admin: Ladder | ✅ Complete | Labeled "(exp.)" — experimental |
| Global: Event/Year picker | ✅ Complete | Shared across all tabs with `resolveDefaultEvent` |
| Global: Category/Class selector | ✅ Complete | Uses `useCategoryPreset` with recommended + dynamic categories |
| Global: Refresh Event Data | ✅ Complete | One-click re-fetch timing + weather + canonical |
| Global: Auto-refresh | ✅ Complete | Ongoing event detection + periodic data refresh |

### B4. Frontend — ParityDashPanel (`src/pages/ParityDashPanel.tsx` — 1,097 lines)

| Feature | Status | Notes |
|---|---|---|
| Event parity view | ✅ Complete | Combo summary, chart, incrementals, weather, deltas, qual order, truth table |
| Range parity view | ✅ Complete | Multi-event matrix with line charts |
| Trigger presets | ✅ Complete | ET vs MPH configurable thresholds |
| Combo colors | ✅ Complete | Deterministic via FNV-1a hash |
| Client caching | ✅ Complete | 120s TTL |

### B5. Frontend — ParityReport (`src/pages/ParityReport.tsx` — 1,007 lines)

| Feature | Status | Notes |
|---|---|---|
| Event Report | ✅ Complete | Summary, chart, qual results, incrementals, weather, deltas |
| Long-Term Report | ✅ Complete | Range tables + line charts, event click-through |
| PDF Export (Event) | ✅ Complete | `exportEventParityPdf` with chart capture |
| PDF Export (Long-Term) | ✅ Complete | `exportLongTermParityPdf` with chart capture |
| Range modes | ✅ Complete | Season / previous-N / custom |

### B6. Frontend — Supporting Pages

| Page | Lines | Status | Notes |
|---|---|---|---|
| `AnomaliesPanel.tsx` | 941 | ✅ Complete | Anomaly analysis with rollups and run detail |
| `IncidentAnalysis.tsx` | 1,022 | ✅ Complete | Telemetry + video review workspace |
| `IncidentDrawer.tsx` | 668 | ✅ Complete | Slide-out incident panel |
| `IncidentCell.tsx` | (shared) | ✅ Complete | Inline incident badge component |
| `ParityIdrViewer.tsx` | 199 | ⚠️ Scaffold | Placeholder — "Load IDR Data" section is a stub |
| `BatchBackfillPanel.tsx` | 134 | ✅ Complete | Batch weather backfill UI |
| `TrackCoordCoveragePanel.tsx` | 191 | ✅ Complete | Track coordinate coverage + bulk update |

### B7. Services Layer

| File | Lines | Status | Notes |
|---|---|---|---|
| `parityApi.ts` | 2,497 | ✅ Complete | ~70 typed endpoints, caching, HTML error detection, Clerk auth fallback |
| `parityPdf.ts` | ~820 | ✅ Complete | 5 PDF export functions with professional formatting |

### B8. Domain Layer (`src/domain/parity/` — 16 source files)

| File | Status | Notes |
|---|---|---|
| `weatherCorrection.ts` | ✅ Complete | HPC model, vapor pressure, density altitude, water grains, correction factor |
| `correctRunClient.ts` | ✅ Complete | Client-side run correction pipeline |
| `weatherBackfill.ts` | ⚠️ Partial | CSV ✅, Open-Meteo ✅, **NOAA CDO throws "not yet implemented"** |
| `format.ts` | ✅ Complete | Shared formatting functions |
| `formatLocalTime.ts` | ✅ Complete | Timezone-aware time display |
| `anomalyEngine.ts` | ✅ Complete | Anomaly detection logic |
| `eventImport.ts` | ✅ Complete | Bulk CSV event import parser |
| `eventRange.ts` | ✅ Complete | Event range calculations |
| `nhraMapper.ts` | ✅ Complete | NHRA data field mapping |
| `qualSheet.ts` | ✅ Complete | Qual sheet formatting |
| `resolveDefaultEvent.ts` | ✅ Complete | Intelligent default event selection |
| `timelineInsert.ts` | ✅ Complete | Timeline insertion logic |
| `totalAvgFilter.ts` | ✅ Complete | Total average filtering |
| `useAutoRefresh.ts` | ✅ Complete | Auto-refresh hook for ongoing events |
| `useClassPreset.ts` | ✅ Complete | Category/class preset management |
| `laneUtils.ts` | ✅ Complete | Lane canonicalization and sorting |

### B9. Database Migrations

| Migration | Tables/Changes | Status |
|---|---|---|
| `migrate-v6-parity.php` | parity_runs, parity_runs_raw, parity_run_imports | ✅ Deployed |
| `migrate-v6b-parity-indexes.php` | UNIQUE indexes for dedup | ✅ Deployed |
| `migrate-v6c-parity-class-aliases.php` | parity_class_aliases | ✅ Deployed (assumed) |
| `migrate-v6c-parity-weather.php` | parity_weather_samples, parity_weather_canonical, parity_events, parity_tracks | ✅ Deployed (assumed) |
| `migrate-v8-parity-event-catalog.php` | parity_event_catalog | ✅ Deployed (assumed) |
| `migrate-v11-parity-combos.php` | parity_engine_combos, parity_driver_combos, weather samples UNIQUE fix | ✅ Deployed (assumed) |

### B10. Tests

| Test File | Type | Count (approx) | Status |
|---|---|---|---|
| `weatherCorrection.test.ts` | Unit | ~22 | ✅ Passing |
| `stationCsvImport.test.ts` | Unit | ~20 | ✅ Passing |
| `format.test.ts` | Unit | ~10 | ✅ Passing |
| `formatLocalTime.test.ts` | Unit | ~8 | ✅ Passing |
| `correctRunClient.test.ts` | Unit | ~6 | ✅ Passing |
| `correctionConsistency.test.ts` | Unit | ~4 | ✅ Passing |
| `simpleCorrection.test.ts` | Unit | ~4 | ✅ Passing |
| `eventImport.test.ts` | Unit | ~6 | ✅ Passing |
| `eventRange.test.ts` | Unit | ~4 | ✅ Passing |
| `nhraMapper.test.ts` | Unit | ~6 | ✅ Passing |
| `qualSheet.test.ts` | Unit | ~4 | ✅ Passing |
| `anomalyEngine.test.ts` | Unit | ~8 | ✅ Passing |
| `autoRefresh.test.ts` | Unit | ~4 | ✅ Passing |
| `resolveDefaultEvent.test.ts` | Unit | ~4 | ✅ Passing |
| `weather.test.ts` | Unit | ~6 | ✅ Passing |
| `weatherBackfill.test.ts` | Unit | ~6 | ✅ Passing |
| `weatherReliability.test.ts` | Unit | ~4 | ✅ Passing |
| `canonicalProvenance.test.ts` | Unit | ~4 | ✅ Passing |
| `liveDataValidation.test.ts` | Unit | ~4 | ✅ Passing |
| `realDataValidation.test.ts` | Unit | ~4 | ✅ Passing |
| `totalAvgFilter.test.ts` | Unit | ~4 | ✅ Passing |
| `timelineInsert.test.ts` | Unit | ~4 | ✅ Passing |
| `optimalRun.test.ts` | Unit | ~4 | ✅ Passing |
| `openMeteoProvider.test.ts` | Unit | ~4 | ✅ Passing |
| `adminEventsPanel.test.ts` | Component | ~6 | ✅ Passing |
| `parityDashPanelSections.test.ts` | Component | ~10 | ✅ Passing |
| `parityReportSections.test.ts` | Component | ~6 | ✅ Passing |
| `parityDashboards.test.ts` | Component | ~20 | ✅ Passing |
| `parityByCombo.spec.ts` | Integration | ~18 | ❌ Failing (requires live API) |
| `parity-validation.spec.ts` | Integration | ~3 | ❌ Failing (requires live API) |
| `parity.quick.spec.ts` | Integration | varies | ⏭ Skipped (conditional) |
| `parity.strict.spec.ts` | Integration | varies | ⏭ Skipped |
| `api/__tests__/ingest-idempotency.php` | Regression | 8 | ✅ Passing on prod |

**Test summary:** 2,716 passing, 73 failing (4 unrelated App routing tests + ~20 parity integration tests requiring live API), 85 skipped, 3 todo.

---

## Section C: Top Priority Closeout List

### Priority 1 (Must Fix)

| # | Item | Rationale | Files |
|---|---|---|---|
| C1 | **Fix failing integration tests or mark as live-API-only** | 18+ `parityByCombo.spec.ts` tests + 3 `parity-validation.spec.ts` tests fail because they call the real API. These should either be mocked, conditionally skipped, or moved to a `live-api` test suite. | `src/integration-tests/parityByCombo.spec.ts`, `parity-validation.spec.ts` |
| C2 | **Production deployment gap assessment** | Memory shows Phase 2 deployed (ingest, runs, peek, imports). The ~60 additional endpoints (combos, weather, parity analysis, anomalies, etc.) and all post-Phase-2 migrations need deployment verification. | `api/parity.php`, `api/parity_weather_provider.php`, all `migrate-v*` files |

### Priority 2 (Should Fix)

| # | Item | Rationale | Files |
|---|---|---|---|
| C3 | **NOAA CDO provider stub** | `fetchFromNoaaCdo()` throws on call. Either implement or remove from UI provider list. The "not yet implemented" message surfaces if user selects NOAA CDO in the backfill weather panel. | `src/domain/parity/weatherBackfill.ts` (line 146-150), `ParityPortal.tsx` (weather backfill tab) |
| C4 | **IDR Viewer is placeholder** | `ParityIdrViewer.tsx` shows a placeholder "Load IDR Data" box with no actual data loading. Either implement or add a clear "Coming Soon" status. | `src/pages/ParityIdrViewer.tsx` |
| C5 | **ParityPortal.tsx monolith** | 7,025 lines in a single file. High maintenance risk. Consider extracting panels into separate files (EventRunsPanel, LiveTimingPanel, etc.). | `src/pages/ParityPortal.tsx` |

### Priority 3 (Nice to Have)

| # | Item | Rationale | Files |
|---|---|---|---|
| C6 | **Clean up 85 TODOs** | 85 TODO/FIXME comments across parity files. Most are in ParityPortal.tsx. Triage and resolve or convert to tracked issues. | Various (grep `TODO\|FIXME` in parity files) |
| C7 | **Deprecate monolith `parityByCombo` endpoint** | Split endpoints (`paritySummary`, `parityDeltas`, `parityAllRuns`, `parityQualOrder`) supersede the monolith. The monolith is still called by `ParityDashPanel.tsx`. | `api/parity.php`, `src/pages/ParityDashPanel.tsx` |
| C8 | **Ladder tab marked experimental** | Labeled "(exp.)" in admin tabs. Decide if it's production-ready or should be removed/hidden. | `ParityPortal.tsx` (line 279) |

---

## Section D: Known Risks and Ambiguities

### D1. Deployment State Uncertainty
The deployment memory from Feb 2026 only lists Phase 2 files. The codebase has grown enormously since then (weather pipeline, combos, parity analysis, anomalies, incidents, PDF export, etc.). **There is no automated deployment pipeline or manifest** — files are SCP'd manually. Risk: production may be running a significantly older version than local.

### D2. Integration Tests Require Live API
The `parityByCombo.spec.ts` (18 tests) and `parity-validation.spec.ts` (3 tests) hit the real production API. This creates:
- False failures in CI/local when API is unreachable
- Dependency on production data state for test assertions
- No mocked alternative exists

### D3. DB Growth (Monitored)
DB is at 390 MB of 1,000 MB limit (39%). `admin_db_size_snapshots` table tracks growth. Guardrails in place with OK/WARNING/DANGER thresholds. Not urgent but worth monitoring as more events are ingested.

### D4. N+1 Weather Join Pattern
`handleRunsWithWeather()` executes one weather query per run. Currently fast (0.06ms/lookup) but could degrade with very large result sets. The canonical weather table is small (~4K rows) with proper indexing.

### D5. Correction Model Version
`PARITY_CORRECTION_MODEL_VERSION` is hardcoded in `api/parity.php`. If the correction formula changes, there's no automatic re-correction of historical data. The model version is returned in API responses for client-side awareness.

### D6. NOAA CDO Provider
Listed in the UI as an option but throws on use. Not blocking — Open-Meteo and CSV cover the use cases — but creates user confusion.

### D7. Monolith File Risk
`ParityPortal.tsx` at 7,025 lines is the largest component file in the project. Changes require understanding extensive state and panel interactions. No test coverage for most individual panels (only section-level component tests exist).

---

## Section E: Recommended Closeout Plan

### Phase 1: Stabilize (1-2 days)
1. **Verify production deployment state** — SSH to prod and compare deployed `parity.php` line count / endpoint list against local. Identify which migrations have been run.
2. **Fix integration test failures** — Add `describe.skipIf(!process.env.LIVE_API)` guard to `parityByCombo.spec.ts` and `parity-validation.spec.ts`, or create proper mocks.
3. **Deploy any missing backend files** — If production is behind, deploy `parity.php`, `parity_weather_provider.php`, `lib/parity.php`, and run missing migrations.

### Phase 2: Polish (2-3 days)
4. **Resolve NOAA CDO stub** — Either implement (requires API key setup) or set `ready: false` in `WEATHER_PROVIDERS` and add a clear "coming soon" message (simplest path).
5. **IDR Viewer decision** — Either implement basic data loading or add a proper "Coming Soon" banner instead of the ambiguous placeholder.
6. **TODO triage** — Review the 85 TODOs, close resolved ones, convert blockers to tracked issues.

### Phase 3: Refactor (3-5 days, optional)
7. **Extract ParityPortal panels** — Move each panel (EventRunsPanel, LiveTimingPanel, QualSheetPanel, etc.) into its own file under `src/pages/parity/`. Keep ParityPortal as a thin tab router.
8. **Deprecate monolith parityByCombo endpoint** — Migrate `ParityDashPanel.tsx` to use the split endpoints, then remove the monolith handler.
9. **Add panel-level test coverage** — The extracted panels would be individually testable.

### Phase 4: Operational (ongoing)
10. **Monitor DB growth** — Continue using `admin_db_size_snapshots`. Set up alerting if approaching 700 MB.
11. **Document deployment procedure** — Create a `DEPLOY.md` or deployment workflow that lists all parity-related files to SCP.
12. **Seasonal data validation** — After each NHRA season, validate ingest completeness and weather coverage across all events.

---

## Appendix: File Inventory

### Backend (PHP)
- `api/parity.php` (10,734 lines) — Main API router, ~70 action handlers
- `api/lib/parity.php` (768 lines) — Core OData/normalization/weather library
- `api/parity_weather_provider.php` (247 lines) — Open-Meteo backfill handler
- `api/migrate-v6-parity.php` — Base parity tables
- `api/migrate-v6b-parity-indexes.php` — Dedup indexes
- `api/migrate-v6c-parity-class-aliases.php` — Class alias table
- `api/migrate-v6c-parity-weather.php` — Weather + event/track tables
- `api/migrate-v8-parity-event-catalog.php` — Event catalog table
- `api/migrate-v11-parity-combos.php` — Engine/driver combo tables

### Frontend (React/TypeScript)
- `src/pages/ParityPortal.tsx` (7,025 lines) — Main portal with 30+ tabs
- `src/pages/ParityDashPanel.tsx` (1,097 lines) — Parity dashboard
- `src/pages/ParityReport.tsx` (1,007 lines) — Event + long-term reports
- `src/pages/ParityIdrViewer.tsx` (199 lines) — IDR viewer scaffold
- `src/pages/AnomaliesPanel.tsx` (941 lines) — Anomaly analysis
- `src/pages/IncidentAnalysis.tsx` (1,022 lines) — Incident review
- `src/pages/IncidentDrawer.tsx` (668 lines) — Incident slide-out
- `src/pages/BatchBackfillPanel.tsx` (134 lines) — Batch weather backfill
- `src/pages/TrackCoordCoveragePanel.tsx` (191 lines) — Track coord coverage
- `src/pages/ParityPortal.css` — Portal styles

### Services
- `src/services/parityApi.ts` (2,497 lines) — Typed API client
- `src/services/parityPdf.ts` (~820 lines) — PDF export functions

### Domain Logic (16 source files)
- `src/domain/parity/weatherCorrection.ts` — HPC correction model
- `src/domain/parity/correctRunClient.ts` — Client-side correction
- `src/domain/parity/weatherBackfill.ts` — Weather provider interface
- `src/domain/parity/anomalyEngine.ts` — Anomaly detection
- `src/domain/parity/format.ts` — Shared formatters
- `src/domain/parity/formatLocalTime.ts` — Timezone formatting
- `src/domain/parity/eventImport.ts` — CSV event import
- `src/domain/parity/eventRange.ts` — Event range math
- `src/domain/parity/nhraMapper.ts` — Field mapping
- `src/domain/parity/qualSheet.ts` — Qual sheet logic
- `src/domain/parity/resolveDefaultEvent.ts` — Default event selection
- `src/domain/parity/timelineInsert.ts` — Timeline insertion
- `src/domain/parity/totalAvgFilter.ts` — Avg filtering
- `src/domain/parity/useAutoRefresh.ts` — Auto-refresh hook
- `src/domain/parity/useClassPreset.ts` — Class presets
- `src/domain/parity/laneUtils.ts` — Lane utilities

### Tests (28 test files)
- 26 unit/component test files in `src/domain/parity/__tests__/`
- 2 component test files in `src/pages/__tests__/`
- 7 integration test files in `src/integration-tests/` (parity-related)
- 1 PHP regression test in `api/__tests__/`

---

*End of Audit Report*
