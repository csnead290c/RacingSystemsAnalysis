# Incident Analyzer Workspace Foundation — Architecture Plan

**Status:** In Progress  
**Goal:** Transform the current upload+inspect incident analyzer into a production-quality web-based motorsports analysis workspace

---

## Current State (Pre-Foundation)

### Frontend (`src/pages/IncidentAnalysis.tsx`)
- **Layout:** 3-panel MoTeC-inspired UI (left: datasets/channels, center: chart, right: videos)
- **Features:**
  - CSV upload with client-side parsing (quoted-field-aware)
  - Video upload with time-sync
  - Channel visibility toggles
  - Recharts-based time-series plotting (single chart, all visible channels overlaid)
  - Global cursor with video sync
  - Playback controls (play/pause, speed 0.25×–4×)
  - Measurement mode (click-to-mark time intervals)
  - Time offset adjustment per dataset/video
  - Layout persistence (visible channels, playback speed, cursor time)
  - Channel search
  - Decimation for large datasets (max 10k points to Recharts)

### Backend (`api/incident-analysis.php`)
- **11 actions:** getSession, saveSession, uploadDataset, listDatasets, getDatasetData, updateDataset, deleteDataset, uploadVideo, listVideos, updateVideo, deleteVideo, saveMeasurement, listMeasurements, deleteMeasurement, diagnose
- **CSV processing:** Server-side metadata extraction (headers, channel stats: min/max/mean, sample count, time column detection, time unit detection)
- **Storage:** Raw CSV/video files stored in `uploads/incident_analysis/`, metadata in MySQL
- **Permissions:** `incidents.read` (view), `incidents.create` (upload/modify)

### Database Schema (migration v16)
- `incident_analysis_sessions` — one per incident, stores layout_json
- `incident_analysis_datasets` — uploaded CSV files, metadata (name, file_path, time_column, time_unit, time_offset, sample_count, time_min/max, color)
- `incident_analysis_channels` — parsed channel metadata (name, unit, source [imported/derived], expression, sample_count, min/max/mean, color, visible, sort_order)
- `incident_analysis_videos` — video files (name, file_path, duration, time_offset)
- `incident_analysis_measurements` — time-interval measurements (t1, t2, delta_time, label, notes, optional channel_id)

### TypeScript API (`src/services/incidentAnalysisApi.ts`)
- 13 typed methods matching backend actions
- Types: AnalysisSession, AnalysisLayout, AnalysisChannel, AnalysisDataset, AnalysisVideo, AnalysisMeasurement

### Strengths
✅ Solid foundation: session model, file storage, metadata extraction, video sync  
✅ Production-ready auth/permissions  
✅ Clean 3-panel layout  
✅ CSV parsing handles quoted fields, deduplicates headers  
✅ Time column auto-detection  
✅ Client-side decimation for performance  
✅ Measurement workflow already exists  

### Limitations (Foundation Gaps)
❌ **No canonical processed session model** — CSV is parsed on-demand client-side, no server-side normalized payload  
❌ **No channel grouping/categorization** — all channels flat list  
❌ **Single chart only** — cannot create multiple synchronized plots  
❌ **No zoom/pan** — Recharts domain is fixed to dataMin/dataMax  
❌ **No selection inspector** — no stats for time ranges  
❌ **No bookmarks** — measurements exist but no persistent annotations/notes  
❌ **No workspace concept** — layout_json is minimal (visible channels, speed, cursor)  
❌ **No derived channels** — expression field exists but not implemented  
❌ **Recharts performance ceiling** — struggles with >10k points even after decimation  
❌ **No cursor value readout** — cursor line exists but no value display  

---

## Target Architecture (Foundation Batch)

### 1. Canonical Session Model

**Processed session payload** (file-based artifact, not per-sample MySQL rows):
```typescript
{
  metadata: {
    session_id: number,
    title: string,
    source_type: 'csv' | 'motec' | 'racepak' | 'aim',
    created_at: string,
    file_name: string,
    sample_count: number,
    duration_seconds: number,
    parse_warnings: string[]
  },
  timebase: {
    values: number[],  // seconds from session start
    unit: 'seconds',
    sample_rate_hz: number | null
  },
  channels: [
    {
      key: string,              // stable machine key (e.g., 'rpm', 'throttle_pos')
      label: string,            // user-facing (e.g., 'Engine RPM')
      unit: string | null,      // 'rpm', 'mph', '%', etc.
      group: string,            // 'engine', 'chassis', 'driver_input', 'race_control', 'weather', 'derived'
      sample_count: number,
      min: number,
      max: number,
      data_type: 'numeric' | 'boolean' | 'enum',
      original_column: string,
      color_hint: string | null,
      values: number[]          // aligned with timebase
    }
  ],
  markers: [
    { time: number, label: string, type: 'event' | 'flag' | 'bookmark' }
  ],
  stats_summary: {
    total_channels: number,
    numeric_channels: number,
    derived_channels: number
  }
}
```

**Storage strategy:**
- Processed payload → gzipped JSON file in `uploads/incident_analysis/processed/`
- MySQL stores metadata + file path reference
- Raw CSV preserved separately for audit/reprocessing

### 2. Database Schema Extensions

**New table: `incident_analysis_processed_sessions`**
```sql
CREATE TABLE incident_analysis_processed_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  processed_file_path VARCHAR(1024) NOT NULL,
  processed_status ENUM('pending','processing','ready','failed') NOT NULL DEFAULT 'pending',
  duration_seconds DOUBLE NULL,
  sample_count INT UNSIGNED NULL,
  channel_count INT UNSIGNED NULL,
  metadata_json JSON NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_iaps_session (session_id),
  CONSTRAINT fk_iaps_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE
);
```

**New table: `incident_analysis_workspaces`**
```sql
CREATE TABLE incident_analysis_workspaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  layout_json JSON NOT NULL COMMENT 'plots[], visible_channels[], zoom_range, bookmarks_visible, etc.',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_iaw_session (session_id),
  CONSTRAINT fk_iaw_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE
);
```

**New table: `incident_analysis_bookmarks`**
```sql
CREATE TABLE incident_analysis_bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  workspace_id INT NULL,
  time_sec DOUBLE NOT NULL,
  end_time_sec DOUBLE NULL COMMENT 'For range bookmarks',
  label VARCHAR(255) NOT NULL,
  note TEXT NULL,
  color VARCHAR(20) NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_iab_session (session_id),
  INDEX idx_iab_workspace (workspace_id),
  CONSTRAINT fk_iab_session FOREIGN KEY (session_id) REFERENCES incident_analysis_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_iab_workspace FOREIGN KEY (workspace_id) REFERENCES incident_analysis_workspaces(id) ON DELETE SET NULL
);
```

**Extend `incident_analysis_channels`:**
- Add `channel_key VARCHAR(100)` — stable machine key
- Add `channel_group VARCHAR(50)` — engine/chassis/driver_input/race_control/weather/derived

### 3. Backend API Extensions

**New actions:**
- `processSession` — convert uploaded datasets into canonical processed session
- `getProcessedSession` — return processed session metadata + channel catalog
- `getProcessedSessionData` — return timebase + channel values (optionally windowed)
- `listWorkspaces` — list workspaces for a session
- `getWorkspace` — load workspace layout
- `saveWorkspace` — create/update workspace
- `deleteWorkspace` — remove workspace
- `listBookmarks` — list bookmarks for session/workspace
- `createBookmark` — add bookmark
- `updateBookmark` — edit bookmark
- `deleteBookmark` — remove bookmark
- `evaluateDerivedChannel` — preview derived channel expression (safe eval)

### 4. CSV Processing Pipeline

**Enhanced parser:**
- Normalize headers → stable channel keys (e.g., "Engine RPM (rpm)" → key: `engine_rpm`, label: "Engine RPM", unit: "rpm")
- Auto-categorize channels by name patterns:
  - `engine`: rpm, egt, oil_temp, coolant_temp, fuel_pressure
  - `chassis`: speed, gear, brake_pressure, suspension_travel
  - `driver_input`: throttle, brake, steering, clutch
  - `race_control`: lap_time, sector_time, position
  - `weather`: ambient_temp, track_temp, humidity
  - `derived`: (user-created math channels)
- Graceful handling of non-numeric columns (skip or flag)
- Synthetic timebase if no time column (monotonic sample index)
- Parse warnings logged to metadata

**Channel mapping layer:**
```typescript
interface ChannelMapping {
  original_header: string;
  normalized_key: string;
  label: string;
  unit: string | null;
  group: string;
  confidence: 'high' | 'medium' | 'low';
}
```

### 5. Frontend Workspace UI

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Top Toolbar: [Back] Session #123 | [Save Workspace ▼] [Export] │
├──────────┬──────────────────────────────────────────┬───────────┤
│ Channels │ Plot 1: RPM, Speed                       │ Inspector │
│ Sidebar  │ ┌──────────────────────────────────────┐ │           │
│          │ │ [Synchronized time-series chart]     │ │ Cursor:   │
│ Search:  │ │                                      │ │ t=12.45s  │
│ [____]   │ │ Global cursor line                   │ │           │
│          │ │                                      │ │ RPM: 8420 │
│ Engine   │ └──────────────────────────────────────┘ │ Speed: 87 │
│ ☑ RPM    │                                          │           │
│ ☐ EGT    │ Plot 2: Throttle, Brake                  │ Selection │
│          │ ┌──────────────────────────────────────┐ │ 10.2-12.8s│
│ Chassis  │ │ [Synchronized time-series chart]     │ │ Δt: 2.6s  │
│ ☑ Speed  │ │                                      │ │           │
│ ☐ Gear   │ │                                      │ │ RPM:      │
│          │ └──────────────────────────────────────┘ │ min: 7800 │
│ Driver   │                                          │ max: 8950 │
│ ☑ Throttle│ [+ Add Plot]                            │ avg: 8320 │
│ ☑ Brake  │                                          │           │
│          │                                          │ Bookmarks │
│ Derived  │                                          │ [+ New]   │
│ ☐ Accel  │                                          │ ⭐ Launch │
│          │                                          │ ⭐ Shift  │
└──────────┴──────────────────────────────────────────┴───────────┘
```

**Core components:**
- `ChannelSidebar` — searchable, grouped, toggle visibility, drag-to-plot
- `PlotWorkspace` — stacked plots, synchronized X-axis, global cursor
- `PlotPanel` — single time-series plot with legend, remove/reorder
- `CursorInspector` — current values at cursor time
- `SelectionInspector` — stats for selected time range
- `BookmarksPanel` — create/edit/jump-to bookmarks
- `WorkspaceToolbar` — save/load/delete workspaces

### 6. Charting Strategy

**Replace Recharts with a performant library:**
- **Option A: Plotly.js** — handles large datasets well, built-in zoom/pan, WebGL mode for >100k points
- **Option B: uPlot** — ultra-fast, minimal bundle, designed for time-series
- **Option C: Chart.js with chartjs-plugin-zoom** — familiar, good performance with decimation plugin

**Recommendation: uPlot**
- Smallest bundle (~45 KB)
- Fastest rendering (canvas-based)
- Built for time-series
- Synchronized cursors across multiple plots (built-in)
- Zoom/pan with mouse/touch
- Downsampling handled internally

**Integration:**
- Wrap uPlot in React component (`<TimeSeriesPlot>`)
- Shared cursor state across all plots
- Lazy-load data windows for very large sessions (>1M samples)

### 7. Derived Channel Support

**Safe expression evaluator:**
- **Library: expr-eval** (or mathjs with restricted functions)
- Supports: `+`, `-`, `*`, `/`, `()`, `abs()`, `min()`, `max()`
- Future: `movingAvg(ch, n)`, `rate(ch)`, `integrate(ch)`

**Workflow:**
1. User enters expression: `(rpm / 1000) * 60`
2. Backend validates syntax
3. Backend evaluates against channel data
4. Returns preview (first 100 samples + stats)
5. User confirms → derived channel saved to workspace
6. Derived channel appears in channel list under "Derived" group

**Storage:**
- Derived channel definitions in workspace layout_json
- Values computed on-demand (not stored)

### 8. UX Polish

**Empty states:**
- No session: "Upload CSV to begin analysis"
- No channels selected: "Select channels from sidebar to plot"
- No bookmarks: "Create bookmarks to mark important events"

**Loading states:**
- Processing session: spinner + "Processing CSV..."
- Loading data: skeleton plot
- Evaluating derived channel: "Calculating..."

**Keyboard shortcuts:**
- `Esc` — clear selection
- `Space` — play/pause
- `F` — fit all data (reset zoom)
- `B` — create bookmark at cursor

**Parse warnings:**
- Display in collapsible banner if present
- "Warning: 3 non-numeric columns skipped"

---

## Implementation Sequence

1. ✅ **Audit current state** (this document)
2. **Schema + migration** — create v31 migration for new tables
3. **Backend processing pipeline** — CSV → canonical session
4. **Backend API** — new endpoints for processed sessions, workspaces, bookmarks
5. **TypeScript types + API client** — extend incidentAnalysisApi
6. **uPlot integration** — wrap in React component
7. **Workspace UI foundation** — layout, channel sidebar, plot workspace
8. **Synchronized multi-plot** — stacked plots with shared cursor
9. **Cursor + selection inspectors** — value readout, stats
10. **Bookmarks** — create/edit/jump-to
11. **Workspace persistence** — save/load/delete
12. **Derived channels** — expression evaluator + UI
13. **UX polish** — empty states, loading, keyboard shortcuts
14. **Tests** — parser, session generation, derived eval, workspace save/load
15. **Deploy + verify**

---

## Known Limitations (Post-Foundation)

**Out of scope for this batch:**
- Multi-session comparison/overlay
- XY plots / scatter plots
- Histogram / distribution analysis
- Advanced math functions (FFT, filtering)
- Collaborative multi-user editing
- Video frame-sync precision (beyond current time-offset)
- Export to PDF/report builder
- AI-generated insights

**Future batches:**
- Batch 2: Multi-session overlay + comparison
- Batch 3: Advanced math channels (FFT, filtering, integration)
- Batch 4: Report builder + export
- Batch 5: Video frame-sync + annotation

---

## Success Criteria

This foundation is successful if an analyst can:
✅ Upload a CSV dataset  
✅ Process it into a canonical session  
✅ Open a workspace  
✅ Search/select channels  
✅ Create multiple synchronized plots  
✅ Move a shared cursor and see values  
✅ Zoom to a time window and inspect stats  
✅ Create bookmarks with notes  
✅ Save and reload the workspace  
✅ Create a basic derived/math channel  
✅ Do all of the above without the page feeling fragile  

---

**Next:** Proceed with implementation starting with migration v31.
