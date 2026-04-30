# Incident Analyzer Workstation Integration Plan

**Date:** March 15, 2026  
**Goal:** Integrate workstation core into live IncidentAnalysisWorkspace with real, tested features

---

## Current Live Workspace State

**File:** `src/pages/IncidentAnalysisWorkspace.tsx` (734 lines)

**Current State Model:**
```typescript
- plots: Plot[] // { id, title, channelKeys }
- visibleChannels: Set<string>
- cursorTime: number | null
- selection: { start, end } | null
- playing: boolean
- playbackSpeed: number
- currentWorkspaceId: number | null
```

**Current Components:**
- IncidentWorkspaceToolbar (toolbar)
- IncidentChannelSidebar (left, 250px fixed)
- IncidentPlotWorkspace (center, flex)
- IncidentInspectorPanel (right, 300px fixed)
- IncidentMarkersPanel (right)
- IncidentVideoSyncPanel (right)
- UPlotChart (plot rendering)

**Current Features Working:**
- ✅ Session load/process
- ✅ Multi-plot workspace
- ✅ Channel sidebar with groups
- ✅ Markers/bookmarks
- ✅ Video sync
- ✅ Workspace save/load
- ✅ Basic hotkeys (B, Esc, Space, F stub)
- ✅ Cursor sync
- ✅ Selection rendering

**Current Limitations:**
- ❌ Fixed panel widths (not resizable)
- ❌ No zoom/pan controls
- ❌ No reference cursor
- ❌ Time-series only (no XY/histogram/event list)
- ❌ No plot settings/axis controls
- ❌ No math channels
- ❌ Incomplete hotkey system

---

## Integration Strategy

### Approach: **Incremental Refactor in Place**

Keep `IncidentAnalysisWorkspace.tsx` as the main page, refactor it to use new architecture progressively.

**Why not full replacement:**
- Current workflow is stable
- Preserve working session/data loading
- Minimize risk of breaking existing features
- Easier to test incrementally

---

## What Gets Integrated (This Batch)

### 1. Layout Model & Resizable Panels ✅

**Adopt:**
- `src/domain/workspace/layoutModel.ts` — State model
- `src/components/workspace/ResizablePanel.tsx` — Resizable wrapper

**Changes to Live Workspace:**
- Replace `Plot[]` with `PlotPanel[]` from layout model
- Add `WorkspaceLayout` state
- Wrap sidebars in ResizablePanel
- Persist panel widths in workspace layout
- Add panel collapse state

**Keep:**
- Current session/dataset/video/marker loading
- Current workspace save/load API calls
- Current component structure (just wrap with ResizablePanel)

### 2. Zoom/Pan/Reference Cursor ✅

**Adopt:**
- `src/domain/workspace/zoomState.ts` — Zoom utilities
- `src/components/workspace/ZoomControls.tsx` — Zoom toolbar
- Enhanced cursor state from layout model

**Changes to Live Workspace:**
- Add `zoom` state per plot
- Add `referenceCursorTime` state
- Add `showReferenceCursor` state
- Replace UPlotChart with TimeSeriesPlot (has zoom/reference support)
- Add ZoomControls to toolbar
- Wire zoom actions (fit, zoom in/out, pan, zoom to selection)
- Persist zoom state in workspace layout

**Keep:**
- Current cursor sync mechanism
- Current selection rendering
- Current marker rendering

### 3. Plot Type Framework ✅

**Adopt:**
- `src/components/workspace/plots/TimeSeriesPlot.tsx`
- `src/components/workspace/plots/XYPlot.tsx`
- `src/components/workspace/plots/HistogramPlot.tsx`
- `src/components/workspace/plots/EventListPanel.tsx`

**Changes to Live Workspace:**
- Replace IncidentPlotWorkspace to support multiple plot types
- Add plot type selector when adding plots
- Add plot type switcher in panel toolbar
- Render appropriate component based on `plot.type`
- Persist plot type in workspace layout

**Supersede:**
- `src/components/incident/UPlotChart.tsx` — Replaced by TimeSeriesPlot
- `src/components/incident/IncidentPlotWorkspace.tsx` — Refactored to support types

**Keep:**
- Current plot add/remove logic
- Current channel add/remove from plot logic

### 4. Plot Settings & Axis Controls ✅

**Add New:**
- Plot settings modal (inline in workspace file for now)
- Axis controls (auto/manual, min/max, grid toggle)
- Per-plot settings button in toolbar

**Changes to Live Workspace:**
- Add settings modal state
- Add axis config to plot state
- Persist axis config in workspace layout
- Wire settings to TimeSeriesPlot

### 5. Hotkey System ✅

**Adopt:**
- `src/domain/workspace/hotkeys.ts` — Hotkey registry
- `src/components/workspace/HotkeyHelp.tsx` — Help overlay

**Changes to Live Workspace:**
- Create hotkey registry with all shortcuts
- Replace current keyboard handler with registry-based handler
- Add help overlay (triggered by `?`)
- Wire all hotkeys to actual actions

**Enhance:**
- Current B, Esc, Space hotkeys
- Add F (fit), M (marker), R (reference), +/-, arrows, etc.

### 6. Math Channels (Minimal V1) ✅

**Adopt:**
- `src/domain/workspace/mathChannels.ts` — Foundation

**Add New:**
- Simple "Add Math Channel" button in toolbar
- Basic modal: label, expression input, validate, add
- Evaluate expression and add to channel list
- Persist in workspace layout

**Scope:**
- Arithmetic only (+, -, *, /, ^, parentheses)
- Channel references as $key
- No advanced functions this batch

---

## What Gets Removed/Superseded

### Files to Delete:
- None (keep old UPlotChart for now, delete after validation)

### Files to Refactor:
- `src/pages/IncidentAnalysisWorkspace.tsx` — Major refactor
- `src/components/incident/IncidentPlotWorkspace.tsx` — Refactor for plot types

### Files to Keep Unchanged:
- `src/components/incident/IncidentWorkspaceToolbar.tsx` — Keep, add buttons
- `src/components/incident/IncidentChannelSidebar.tsx` — Keep, wrap in ResizablePanel
- `src/components/incident/IncidentInspectorPanel.tsx` — Keep, enhance for reference cursor
- `src/components/incident/IncidentMarkersPanel.tsx` — Keep
- `src/components/incident/IncidentVideoSyncPanel.tsx` — Keep

---

## User-Visible Features After This Batch

### Layout & Panels
- ✅ Resizable left sidebar (channel browser)
- ✅ Resizable right sidebar (inspector/markers/videos)
- ✅ Resizable plot heights (drag between plots)
- ✅ Panel widths persist in workspace

### Analyst Interaction
- ✅ Zoom in/out buttons
- ✅ Pan left/right buttons
- ✅ Fit all data button
- ✅ Zoom to selection
- ✅ Reference cursor toggle
- ✅ Time delta display (primary vs reference)
- ✅ Active plot indication

### Plot Types
- ✅ Time-series (enhanced with zoom/reference)
- ✅ XY/Scatter plot
- ✅ Histogram/distribution plot
- ✅ Event/marker list panel
- ✅ Plot type selector when adding plot
- ✅ Plot type switcher in panel toolbar

### Plot Settings
- ✅ Plot settings button in panel toolbar
- ✅ Auto-scale toggle
- ✅ Manual Y-axis min/max
- ✅ Grid show/hide
- ✅ Reset to auto

### Hotkeys
- ✅ Space — Play/pause
- ✅ Esc — Clear selection
- ✅ F — Fit all
- ✅ M — Add marker at cursor
- ✅ R — Toggle reference cursor
- ✅ +/- — Zoom in/out
- ✅ ←/→ — Nudge cursor
- ✅ Shift+←/→ — Pan
- ✅ ? — Show hotkey help

### Math Channels
- ✅ "Add Math Channel" button
- ✅ Simple expression input
- ✅ Arithmetic evaluation
- ✅ Add to channel list under "Derived" group
- ✅ Plottable like any channel
- ✅ Persists in workspace

---

## Migration Path

### Phase 1: Layout Model (30 min)
1. Add WorkspaceLayout state to main page
2. Migrate current state to layout model
3. Update workspace save/load to use layout serialization
4. Verify existing workspace load still works

### Phase 2: Resizable Panels (30 min)
1. Wrap IncidentChannelSidebar in ResizablePanel
2. Wrap right sidebar in ResizablePanel
3. Add panel width state
4. Persist panel widths
5. Test resize

### Phase 3: Zoom/Pan/Reference (45 min)
1. Add zoom state per plot
2. Add reference cursor state
3. Replace UPlotChart with TimeSeriesPlot
4. Add ZoomControls to toolbar
5. Wire zoom actions
6. Test zoom/pan/reference

### Phase 4: Plot Types (60 min)
1. Refactor IncidentPlotWorkspace for plot types
2. Add plot type selector
3. Wire XY/Histogram/EventList components
4. Add plot type switcher
5. Test all plot types

### Phase 5: Plot Settings (30 min)
1. Add settings modal
2. Add axis controls
3. Wire to TimeSeriesPlot
4. Persist settings
5. Test settings

### Phase 6: Hotkeys (30 min)
1. Create hotkey registry
2. Replace keyboard handler
3. Add HotkeyHelp overlay
4. Wire all shortcuts
5. Test hotkeys

### Phase 7: Math Channels (30 min)
1. Add "Add Math Channel" button
2. Add simple modal
3. Wire evaluator
4. Add to channel list
5. Test math channel

### Phase 8: Testing & Cleanup (60 min)
1. Run automated tests
2. Manual smoke test (all 21 steps)
3. Fix any issues
4. Clean up dead code
5. Build and deploy

**Total Estimated Time:** 5-6 hours

---

## Risk Mitigation

**Risk:** Breaking existing workspace load
**Mitigation:** Migrate state carefully, test workspace load early

**Risk:** Performance with multiple plot types
**Mitigation:** Use React.memo, test with real data

**Risk:** Hotkey conflicts
**Mitigation:** Context-aware handler, test with text inputs

**Risk:** Math channel evaluation errors
**Mitigation:** Validate expressions, handle errors gracefully

---

## Success Criteria

- ✅ All current features still work
- ✅ Panels are resizable
- ✅ Zoom/pan/reference cursor work
- ✅ All 4 plot types work
- ✅ Plot settings work
- ✅ All hotkeys work
- ✅ Math channels work (basic)
- ✅ Layout persists
- ✅ Build passes
- ✅ Tests pass
- ✅ Manual smoke test passes
- ✅ Deployed to production

---

**Status:** PLAN COMPLETE — Ready for implementation
