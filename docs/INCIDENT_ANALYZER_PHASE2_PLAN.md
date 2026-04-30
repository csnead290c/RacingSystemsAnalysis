# Incident Analyzer Phase 2 — Workspace UI + Markers + Multi-Video Sync

**Status:** In Progress  
**Goal:** Build production-quality analyst workspace UI with markers and multi-video sync

---

## Current State Audit

### Existing UI (IncidentAnalysis.tsx)
**Layout:** 3-panel design (left: datasets/channels, center: chart, right: videos)

**What Works:**
- ✅ CSV upload with client-side parsing (quoted-field aware)
- ✅ Video upload and storage
- ✅ Single Recharts time-series plot
- ✅ Channel visibility toggles
- ✅ Global cursor with scrubber
- ✅ Video sync to cursor (basic — updates video.currentTime on scrubber change)
- ✅ Playback controls (play/pause, speed 0.25×–4×)
- ✅ Measurement mode (click-to-mark time intervals)
- ✅ Measurements list with delete
- ✅ Time offset per dataset/video
- ✅ Layout persistence (visible channels, playback speed, cursor time)
- ✅ Channel search
- ✅ Decimation for large datasets (max 10k points)

**Current Video Sync Implementation:**
- Videos sync when scrubber moves: `el.currentTime = Math.max(0, t - vid.time_offset)`
- Multiple videos supported (all update on cursor change)
- No offset adjustment UI (offsets stored but not editable)
- No bidirectional sync (video scrub doesn't update data cursor)

**Current Measurements:**
- Click chart twice in measure mode → creates measurement
- Stored in `incident_analysis_measurements` table
- Displayed as green reference lines on chart
- List shows label, time range, delta
- Delete button per measurement
- No edit capability
- No jump-to-measurement

### Backend Foundation (Phase 1)
**New tables:**
- `incident_analysis_processed_sessions` — canonical session payloads
- `incident_analysis_workspaces` — saved workspace layouts
- `incident_analysis_bookmarks` — time-based annotations

**New API endpoints (9):**
- processSession, getProcessedSession
- listWorkspaces, getWorkspace, saveWorkspace, deleteWorkspace
- listBookmarks, createBookmark, updateBookmark, deleteBookmark

**Not yet wired to frontend:**
- ❌ Process session button
- ❌ Workspace save/load UI
- ❌ Bookmarks UI
- ❌ Channel grouping (groups exist in processed session but not displayed)

### Charting Library
**Current:** Recharts
**Issues:**
- Single plot only (no multi-plot support)
- Performance ceiling at ~10k points even with decimation
- No built-in synchronized cursor across multiple plots
- Zoom/pan not implemented

**Decision:** Replace with **uPlot** for Phase 2
- Ultra-fast canvas rendering
- Built-in synchronized cursor
- Multi-plot support
- Zoom/pan built-in
- ~45 KB bundle (vs Recharts ~400 KB)

---

## Phase 2 Scope

### 1. Workspace UI Refactor
**Goal:** Transform single-chart page into multi-plot workspace

**Components to build:**
- `IncidentWorkspaceToolbar` — session title, workspace selector, save, add plot, fit all
- `IncidentChannelSidebar` — grouped channels, search, add to plot
- `IncidentPlotWorkspace` — stacked synchronized plots
- `IncidentPlotPanel` — single uPlot chart with legend, remove
- `IncidentInspectorPanel` — cursor values, selection stats, markers, videos
- `IncidentMarkersPanel` — create/edit/delete/jump markers
- `IncidentVideoSyncPanel` — multi-video with offset controls

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar: [Back] Session #123 | [Workspace ▼] [Save] [+Plot]│
├──────────┬──────────────────────────────────────┬───────────┤
│ Channels │ Plot 1: RPM, Speed                   │ Inspector │
│          │ ┌──────────────────────────────────┐ │           │
│ Search:  │ │ [uPlot chart with cursor]        │ │ Cursor:   │
│ [____]   │ │                                  │ │ t=12.45s  │
│          │ └──────────────────────────────────┘ │ RPM: 8420 │
│ Engine   │                                      │ Speed: 87 │
│ ☑ RPM    │ Plot 2: Throttle, Brake              │           │
│ ☐ EGT    │ ┌──────────────────────────────────┐ │ Markers   │
│          │ │ [uPlot chart with cursor]        │ │ [+ Point] │
│ Chassis  │ │                                  │ │ [+ Range] │
│ ☑ Speed  │ └──────────────────────────────────┘ │ ⭐ Launch │
│          │ [+ Add Plot]                         │ ⭐ Shift  │
│ Driver   │                                      │           │
│ ☑ Throttle│                                     │ Videos    │
│ ☑ Brake  │                                      │ [Video 1] │
│          │                                      │ offset: 0s│
└──────────┴──────────────────────────────────────┴───────────┘
```

### 2. Markers / Bookmarks / Annotations
**Unify measurements and bookmarks into single "Markers" concept**

**Types:**
- **Point marker** — single timestamp (e.g., "Launch", "Shift 1→2")
- **Range marker** — time window (e.g., "60ft zone", "Burnout")

**UI:**
- "Add Marker at Cursor" button
- "Add Marker from Selection" button (if time range selected)
- Marker list panel with jump/edit/delete
- Marker rendering on plots (vertical line for point, shaded band for range)
- Click marker in list → jump cursor to that time
- Click marker on chart → highlight in list

**Data strategy:**
- Use `incident_analysis_bookmarks` table (already has time_sec, end_time_sec, label, note, color)
- Migrate existing measurements to bookmarks on first load if needed
- Keep measurements table for backward compatibility but hide from UI

**Keyboard shortcut:** `B` to add marker at cursor

### 3. Multi-Video Sync
**Goal:** Sync 1+ videos to data timebase with offset controls

**Features:**
- Upload multiple videos (already works)
- Each video has editable offset
- Offset UI: numeric input + nudge buttons (±0.1s, ±1s)
- "Set sync point" workflow:
  1. Scrub video to known event
  2. Click "Sync to cursor"
  3. Offset calculated: `offset = cursorTime - video.currentTime`
  4. Applied immediately
- All visible videos follow shared cursor
- Video scrub updates data cursor (bidirectional sync)
- Mute/unmute per video
- Hide/show per video
- Stacked or grid layout

**Sync tolerance:** Don't seek video if delta < 0.05s (avoid jitter)

### 4. uPlot Integration
**Replace Recharts with uPlot**

**Implementation:**
- Create `<UPlotChart>` wrapper component
- Props: data, channels, timeRange, cursorTime, onCursorChange, markers, selection
- Synchronized cursor via shared state
- Zoom/pan with mouse wheel + drag
- Marker overlays (vertical lines, shaded bands)
- Legend with channel colors
- Tooltip with values at cursor

**Performance:**
- uPlot handles 100k+ points natively
- Downsample only if >500k points
- Use uPlot's built-in decimation

### 5. Workspace Persistence
**Wire backend workspace API to UI**

**Workspace layout JSON:**
```json
{
  "plots": [
    { "id": "plot1", "channels": ["engine_rpm", "vehicle_speed"], "title": "Primary" },
    { "id": "plot2", "channels": ["throttle_pos", "brake_pos"], "title": "Driver Input" }
  ],
  "zoom_range": { "min": 10.5, "max": 25.3 },
  "cursor_time": 15.2,
  "visible_videos": [1, 2],
  "video_offsets": { "1": 0.5, "2": 1.2 }
}
```

**UI flows:**
- Workspace dropdown in toolbar
- "Save Workspace" → update current or create new
- "New Workspace" → prompt for name, save current state
- Load workspace → restore plots, channels, zoom, cursor, video offsets
- Delete workspace (if not default)

---

## Implementation Plan

### Step 1: Install uPlot
```bash
npm install uplot
```

### Step 2: Build Core Components
1. `UPlotChart.tsx` — wrapper for uPlot with React
2. `IncidentPlotPanel.tsx` — single plot with legend, remove button
3. `IncidentPlotWorkspace.tsx` — stacked plots with shared cursor
4. `IncidentChannelSidebar.tsx` — grouped channels, search, add to plot
5. `IncidentInspectorPanel.tsx` — cursor values, selection stats
6. `IncidentMarkersPanel.tsx` — marker list, create/edit/delete
7. `IncidentVideoSyncPanel.tsx` — video grid with offset controls
8. `IncidentWorkspaceToolbar.tsx` — workspace selector, save, controls

### Step 3: Refactor IncidentAnalysis.tsx
- Keep as main page component
- Replace Recharts with PlotWorkspace
- Move state to workspace context or hooks
- Wire all panels together
- Implement keyboard shortcuts

### Step 4: Marker Migration
- Create utility to migrate measurements → bookmarks
- Run on first workspace load if measurements exist
- Preserve measurement IDs for backward compatibility

### Step 5: Video Sync Enhancement
- Add offset controls to VideoSyncPanel
- Implement bidirectional sync (video scrub → cursor update)
- Add sync tolerance to avoid jitter
- Add "Set sync point" button

### Step 6: Workspace Persistence
- Wire workspace save/load to backend
- Implement workspace selector dropdown
- Restore full state on load (plots, zoom, cursor, videos)

### Step 7: Testing
- Unit tests for workspace state serialization
- Unit tests for marker migration
- Unit tests for video sync offset calculations
- Manual smoke test end-to-end

---

## Known Risks

### Risk 1: uPlot Learning Curve
**Mitigation:** Start with simple wrapper, iterate. uPlot docs are good.

### Risk 2: Video Sync Jitter
**Mitigation:** Use sync tolerance (0.05s), debounce cursor updates.

### Risk 3: Measurement → Bookmark Migration
**Mitigation:** Keep measurements table, add adapter layer, test with real data.

### Risk 4: State Management Complexity
**Mitigation:** Use React context or Zustand for workspace state, keep it simple.

### Risk 5: Performance with Many Plots
**Mitigation:** uPlot is fast, but limit to 4-6 plots max, lazy render off-screen plots.

---

## Out of Scope for Phase 2

**Deferred to Phase 3+:**
- ❌ Derived/math channels
- ❌ Multi-session overlay/comparison
- ❌ XY plots / scatter plots
- ❌ Histogram / distribution analysis
- ❌ Advanced video features (frame-by-frame, annotations on video)
- ❌ Export to PDF/report builder
- ❌ Collaborative editing
- ❌ AI-generated insights

---

## Success Criteria

Phase 2 is successful if an analyst can:
1. ✅ Open a processed session
2. ✅ See a multi-plot workspace with grouped channel sidebar
3. ✅ Add/remove channels to plots
4. ✅ Move a shared cursor and see values update
5. ✅ Create point and range markers
6. ✅ Edit and delete markers
7. ✅ Jump to markers from list
8. ✅ Upload 2+ videos
9. ✅ Sync each video with offset controls
10. ✅ Scrub data and see videos follow
11. ✅ Scrub video and see data cursor update
12. ✅ Save workspace with all state
13. ✅ Reload workspace and see everything restored
14. ✅ Do all of the above without console errors or fragility

---

**Next:** Begin implementation with uPlot integration and component structure.
