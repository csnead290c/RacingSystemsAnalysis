# Incident Analysis Module — Architecture & Phased Plan

## Overview

Web-based MoTeC i2 Pro–style telemetry and video review workspace, integrated into
the existing NHRA parity suite incident logging workflow. NOT a standalone app.

## Codebase Audit Summary

### Reusable Pieces
- **Incident tables** (`run_incidents`, `incident_types`, `incident_media`, `incident_links`) — fully deployed, CRUD working
- **IncidentDrawer.tsx** — slide-out panel for incident CRUD, links, IDR viewer navigation
- **incidentsApi.ts** — typed client for all incident endpoints
- **Capabilities** — `incidents.read`, `incidents.create`, `incidents.edit.own`, `incidents.edit.all` in PHP + TS
- **Recharts** — already a dependency (`^2.10.3`), used for LineChart/BarChart throughout parity suite
- **ParityPortal tab system** — easy to add new tabs (Tab type union, DASHBOARD_TABS array)
- **Auth pattern** — `rsa_getAuthUser()` + `rsa_hasCap()` in PHP; `useCapabilities` hook in React
- **Parity run/weather data** — linkable via `run_incidents.run_id → parity_runs.id`, weather via canonical tables

### Gaps That Need To Be Added
- **File upload infrastructure** — no `multipart/form-data` handling exists yet; need PHP upload endpoint + client
- **Video player** — no existing video component; need HTML5 `<video>` with custom controls
- **Time-series chart with cursor sync** — Recharts exists but we need a custom synchronized cursor/scrubber
- **Telemetry data model** — no dataset/channel/sample storage; need new tables
- **Analysis session persistence** — no concept of saved analysis state; need new table
- **CSV parsing** — need client-side CSV parser (Papa Parse or manual)

## Storage Decision: Raw Telemetry Samples

**Decision: Files on disk + indexed metadata in SQL.**

Rationale:
1. A single NHRA telemetry CSV can have 10k–500k rows × 20+ channels = millions of values
2. Storing every sample in MySQL rows is prohibitively expensive for reads/writes
3. JSON blobs in SQL would work for small files but hit MySQL max packet and query performance limits at scale
4. File-on-disk (or future S3) with parsed channel metadata in SQL gives:
   - Fast upload (just move file)
   - Fast read (stream file directly to client)
   - Indexed metadata for search/browse (channel names, time range, sample count)
   - No SQL bloat

**Implementation:**
- Raw files stored in `uploads/incident_analysis/` (gitignored)
- Parsed channel metadata (name, unit, min, max, sample_count) stored in `incident_analysis_channels` table
- Client fetches raw file for plotting, uses channel metadata for UI (channel picker, axis config)
- Future: migrate to S3/object storage with signed URLs

## Math Channel Architecture (Phase 2)

**Safe approach — NO eval().**

Plan: A restricted expression evaluator using a whitelist of:
- Arithmetic operators: `+`, `-`, `*`, `/`, `**`
- Math functions: `abs`, `sqrt`, `min`, `max`, `log`, `exp`, `round`, `clamp`
- Channel references: `$channelName` syntax
- Constants: `pi`, `e`

Implementation will use a simple recursive-descent parser that only recognizes
these tokens. No `eval()`, no `new Function()`, no string interpolation.

For Phase 1: derived channels are NOT implemented in UI, but the `incident_analysis_channels`
table has a `source` column (`'imported'` | `'derived'`) and a `expression` column
(nullable) to anticipate this.

## Phase 1 — Foundation (this sprint)

### Data Model
- `incident_analysis_sessions` — one per incident, saves layout/view state
- `incident_analysis_datasets` — one per uploaded file, linked to session
- `incident_analysis_channels` — parsed channel metadata per dataset
- `incident_analysis_videos` — video file references per session
- `incident_analysis_measurements` — cursor measurements (delta time, delta value)

### API Endpoints (on `api/incident-analysis.php`)
- `GET  ?action=getSession&incident_id=N` — get or create analysis session
- `POST ?action=saveSession` — save layout/view state
- `POST ?action=uploadDataset` — upload CSV, parse channels, store file
- `GET  ?action=listDatasets&session_id=N` — list datasets + channels
- `GET  ?action=getDatasetData&dataset_id=N` — stream raw CSV data
- `POST ?action=deleteDataset` — remove dataset + file
- `POST ?action=uploadVideo` — upload video file
- `GET  ?action=listVideos&session_id=N` — list videos
- `POST ?action=deleteVideo` — remove video + file
- `POST ?action=saveMeasurement` — save a measurement
- `GET  ?action=listMeasurements&session_id=N` — list measurements
- `POST ?action=deleteMeasurement` — delete a measurement

### UI
- New "Analysis" button in IncidentDrawer per incident → navigates to `/parity/analysis/:incidentId`
- Analysis workspace page with:
  - Left panel: datasets + channel tree
  - Center: Recharts time-series chart with synchronized cursor
  - Bottom bar: time scrubber, measurement display, playback controls
  - Right panel: video player(s) with sync
  - Top: toolbar (save, measurement mode, playback speed)

## Phase 2 — Enrichment
- Derived/math channels (safe expression evaluator)
- Smoothing/filtering/basic transforms
- Notes/annotations tied to time positions
- Compare datasets (overlay mode)
- Export analysis summary (PDF/PNG)

## Phase 3 — NHRA Intelligence
- Logger/vendor-specific import adapters (MoTeC, RacePak, etc.)
- Auto-sync suggestions from signal events (launch pulse, finish line)
- Overlays from parity/weather/run data
- Incident review templates by class/category
