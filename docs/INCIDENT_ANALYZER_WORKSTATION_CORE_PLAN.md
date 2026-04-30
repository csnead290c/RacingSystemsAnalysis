# Incident Analyzer Workstation Core — Architecture Plan

**Date:** March 15, 2026  
**Objective:** Transform the Incident Analyzer from a basic telemetry viewer into a professional motorsports data analysis workstation comparable to McLaren ATLAS / MoTeC i2 Pro / Pi Toolbox.

---

## Current State Analysis

### Component Architecture

**Main Page:** `src/pages/IncidentAnalysisWorkspace.tsx`
- Manages all workspace state (plots, channels, cursor, selection, playback)
- Handles session loading, processing, and persistence
- Coordinates between all child components
- ~734 lines, growing monolithic

**Key Components:**
1. **IncidentWorkspaceToolbar** — Top toolbar with workspace controls
2. **IncidentChannelSidebar** — Left sidebar with grouped channel browser (250px fixed)
3. **IncidentPlotWorkspace** — Center plot container (flex: 1)
4. **IncidentInspectorPanel** — Right sidebar with cursor/selection stats (300px fixed)
5. **IncidentMarkersPanel** — Markers/bookmarks list
6. **IncidentVideoSyncPanel** — Video playback sync
7. **UPlotChart** — uPlot wrapper with cursor sync, markers, selection rendering

### Current State Model

**Workspace State (in main page):**
```typescript
- plots: Plot[] // { id, title, channelKeys }
- visibleChannels: Set<string>
- cursorTime: number | null
- selection: { start, end } | null
- playing: boolean
- playbackSpeed: number
- currentWorkspaceId: number | null
```

**Plot Model:**
```typescript
interface Plot {
  id: string;
  title: string;
  channelKeys: string[];
}
```

**Limitations:**
- No plot type differentiation (time-series only)
- No per-plot zoom/pan state
- No per-plot axis configuration
- No reference cursor support
- No panel resize/collapse state
- No active plot tracking
- No dockable panel architecture

### Current Capabilities

**✅ Working:**
- Multi-plot synchronized cursor
- Drag selection on charts
- Marker/bookmark creation and display
- Channel grouping and search
- Workspace save/load
- Basic keyboard shortcuts (B, Esc, Space, F)
- Selection statistics in inspector
- Video sync

**❌ Missing:**
- Zoom/pan controls
- Reference cursor
- Custom axis scaling
- Plot type framework
- XY/Scatter plots
- Histogram/distribution plots
- Resizable panels
- Dockable layout system
- Math channels
- Compare workflows
- Comprehensive hotkeys

### Current Keyboard Shortcuts

- `B` — Create marker at cursor
- `Esc` — Clear selection
- `Space` — Play/pause
- `F` — Fit all (stub, not implemented)

### Current Persistence Model

**Workspace Layout JSON:**
```typescript
{
  plots: Array<{ id, channels, title }>,
  visible_channels: string[],
  cursor_time: number | null,
  playback_speed: number
}
```

**Missing from persistence:**
- Plot types
- Zoom ranges
- Axis configurations
- Panel sizes/visibility
- Reference cursor state
- Math channel definitions

---

## Target Architecture (This Batch)

### 1. Dockable-Ready Layout Model

**New State Structure:**
```typescript
interface WorkspaceLayout {
  panels: {
    left: { width: number; collapsed: boolean; visible: boolean };
    right: { width: number; collapsed: boolean; visible: boolean };
    bottom: { height: number; collapsed: boolean; visible: boolean };
  };
  plotArea: {
    plots: PlotPanel[];
    activePlotId: string | null;
  };
}

interface PlotPanel {
  id: string;
  type: 'timeseries' | 'xy' | 'histogram' | 'eventlist';
  title: string;
  height: number; // relative weight for stacking
  config: PlotConfig;
}

interface PlotConfig {
  // Time-series
  channels?: string[];
  zoom?: { min: number; max: number };
  yAxis?: { auto: boolean; min?: number; max?: number };
  
  // XY/Scatter
  xChannel?: string;
  yChannels?: string[];
  
  // Histogram
  channel?: string;
  binCount?: number;
  
  // Event list
  filterType?: string;
}
```

**Panel Resize:**
- Left/right sidebars: drag resize with min/max constraints
- Plot heights: drag resize between plots
- Persist panel sizes in workspace layout

**Panel Collapse:**
- Collapse/expand left/right sidebars
- Minimize/maximize individual plots
- Persist collapse state

### 2. Zoom/Pan/Selection System

**Per-Plot Zoom State:**
```typescript
interface PlotZoomState {
  xMin: number;
  xMax: number;
  yMin?: number;
  yMax?: number;
  locked: boolean;
}
```

**Zoom Controls:**
- Drag zoom (already in uPlot, needs state management)
- Zoom in/out buttons (step zoom)
- Fit all data
- Zoom to selection
- Pan left/right
- Reset zoom

**Selection Enhancement:**
- Already have drag selection rendering
- Add: Create range marker from selection
- Add: Zoom to selection
- Add: Selection statistics (already have)

### 3. Reference Cursor System

**Cursor State:**
```typescript
interface CursorState {
  primary: number | null;
  reference: number | null;
  showReference: boolean;
}
```

**Reference Cursor Features:**
- Toggle reference cursor on/off
- Independent positioning
- Delta time display
- Delta values for channels
- Visual differentiation (dashed line vs solid)

### 4. Plot Type Framework

**Plot Type Registry:**
```typescript
type PlotType = 'timeseries' | 'xy' | 'histogram' | 'eventlist';

interface PlotTypeDefinition {
  type: PlotType;
  label: string;
  icon: string;
  configSchema: any;
  renderComponent: React.ComponentType<PlotPanelProps>;
}
```

**Implemented Types (This Batch):**
1. **Time-Series** (existing, enhanced)
   - Synchronized cursor/selection
   - Zoom/pan
   - Custom Y-axis scaling
   
2. **XY/Scatter**
   - Choose X and Y channels
   - Point rendering
   - Useful for G-G diagrams, correlation plots
   
3. **Histogram/Distribution**
   - Single channel distribution
   - Configurable bin count
   - Useful for RPM/temp/pressure analysis
   
4. **Event/Marker List**
   - Tabular view of markers
   - Sortable columns
   - Jump-to-event action

### 5. Custom Axis/Scaling Controls

**Per-Plot Axis Config:**
```typescript
interface AxisConfig {
  auto: boolean;
  min?: number;
  max?: number;
  locked: boolean;
  showGrid: boolean;
  label?: string;
}
```

**UI Controls:**
- Auto-scale toggle
- Manual min/max inputs
- Lock/unlock axis
- Reset to auto
- Grid visibility toggle

**Per-Channel Display:**
- Line thickness
- Color picker
- Show/hide individual channels

### 6. Hotkey System

**New Hotkeys:**
- `Space` — Play/pause (existing)
- `Esc` — Clear selection (existing)
- `B` — Add marker at cursor (existing)
- `F` — Fit all data
- `Z` — Zoom mode toggle
- `M` — Add point marker
- `R` — Toggle reference cursor
- `+/-` — Zoom in/out
- `←/→` — Nudge cursor
- `Shift+←/→` — Large nudge cursor
- `Delete` — Remove selected marker
- `?` — Show hotkey help

**Implementation:**
- Centralized hotkey handler
- Context-aware (avoid text inputs)
- Extensible registry pattern
- Help overlay component

### 7. Panel Toolbars

**Plot Panel Toolbar:**
```
[Plot Type Icon] Plot Title                    [Settings] [Duplicate] [Close]
```

**Actions:**
- Change plot type
- Configure plot settings
- Duplicate plot
- Remove plot
- Maximize/focus plot

**Settings Modal:**
- Plot-specific configuration
- Axis controls
- Channel management
- Display options

### 8. Math Channel Foundation

**Architecture (Not Full Implementation):**
```typescript
interface DerivedChannel {
  id: string;
  key: string;
  label: string;
  expression: string;
  dependencies: string[]; // channel keys
  unit?: string;
  color?: string;
}
```

**Expression Evaluator:**
- Simple arithmetic: `+`, `-`, `*`, `/`, `^`
- Functions: `abs()`, `sqrt()`, `min()`, `max()`, `avg()`
- Channel references: `$rpm`, `$speed`, etc.
- Dependency resolution and evaluation order

**This Batch Delivers:**
- Data model for derived channels
- Expression parser/evaluator skeleton
- UI entry point (button, no full editor)
- Persistence in workspace layout
- If time permits: Simple arithmetic-only implementation

### 9. Compare/Reference Foundations

**Data Model Hooks:**
```typescript
interface WorkspaceCompareState {
  referenceSessionId?: number;
  referenceWorkspaceId?: number;
  compareMode: 'overlay' | 'split' | 'delta';
}
```

**This Batch Delivers:**
- State model for reference session
- Reference cursor (already part of cursor system)
- Plot overlay readiness (multi-session data structure)
- Delta calculation utilities
- UI hooks (no full compare workflow)

---

## Implementation Plan

### Phase 1: Layout & Panel System (Foundation)
**Files:**
- `src/domain/workspace/layoutModel.ts` — Layout state types
- `src/domain/workspace/plotTypes.ts` — Plot type definitions
- `src/components/workspace/ResizablePanel.tsx` — Resizable panel wrapper
- `src/components/workspace/PanelDivider.tsx` — Drag divider component

**Changes:**
- Refactor main workspace to use layout model
- Add panel resize handlers
- Add collapse/expand controls
- Persist panel sizes

### Phase 2: Zoom/Pan/Cursor System
**Files:**
- `src/domain/workspace/zoomState.ts` — Zoom state management
- `src/domain/workspace/cursorState.ts` — Cursor state (primary + reference)
- `src/components/workspace/ZoomControls.tsx` — Zoom toolbar component

**Changes:**
- Add per-plot zoom state
- Implement zoom controls (fit, zoom in/out, pan)
- Add reference cursor toggle and rendering
- Add cursor delta display in inspector

### Phase 3: Plot Type Framework
**Files:**
- `src/components/workspace/plots/TimeSeriesPlot.tsx` — Enhanced time-series
- `src/components/workspace/plots/XYPlot.tsx` — XY/Scatter plot
- `src/components/workspace/plots/HistogramPlot.tsx` — Histogram plot
- `src/components/workspace/plots/EventListPanel.tsx` — Event list table
- `src/components/workspace/plots/PlotTypeSelector.tsx` — Type chooser

**Changes:**
- Extract time-series into typed component
- Implement XY plot with uPlot
- Implement histogram with canvas/SVG
- Implement event list table
- Add plot type switcher

### Phase 4: Axis Controls & Settings
**Files:**
- `src/components/workspace/PlotSettingsModal.tsx` — Settings dialog
- `src/components/workspace/AxisControls.tsx` — Axis config UI

**Changes:**
- Add plot settings modal
- Add axis auto/manual controls
- Add channel color/thickness controls
- Persist axis config in plot config

### Phase 5: Hotkey System
**Files:**
- `src/domain/workspace/hotkeys.ts` — Hotkey registry and handler
- `src/components/workspace/HotkeyHelp.tsx` — Help overlay

**Changes:**
- Centralized hotkey handler
- Implement all target hotkeys
- Add help overlay (triggered by `?`)
- Context-aware activation

### Phase 6: Math Channel Foundation
**Files:**
- `src/domain/workspace/mathChannels.ts` — Derived channel model
- `src/domain/workspace/expressionEvaluator.ts` — Expression parser/eval
- `src/components/workspace/MathChannelButton.tsx` — UI entry point

**Changes:**
- Define derived channel data model
- Implement simple expression evaluator
- Add UI button (modal deferred if time-constrained)
- Persist math channels in workspace

### Phase 7: Testing & Polish
**Files:**
- `src/domain/workspace/__tests__/layoutModel.test.ts`
- `src/domain/workspace/__tests__/zoomState.test.ts`
- `src/domain/workspace/__tests__/expressionEvaluator.test.ts`
- `src/components/workspace/__tests__/ResizablePanel.test.tsx`

**Changes:**
- Add unit tests for state models
- Add component tests for key interactions
- Manual smoke testing
- Performance validation

---

## What Gets Implemented Now

### Must Have (This Batch):
1. ✅ Dockable-ready layout model with resizable panels
2. ✅ Zoom/pan/fit controls with per-plot state
3. ✅ Reference cursor with delta display
4. ✅ Plot type framework (4 types: timeseries, xy, histogram, eventlist)
5. ✅ Custom axis scaling controls
6. ✅ Comprehensive hotkey system
7. ✅ Plot panel toolbars and settings
8. ✅ Math channel architecture (data model + evaluator skeleton)
9. ✅ Compare foundations (state hooks, reference cursor)
10. ✅ Tests and smoke validation

### Nice to Have (If Time Permits):
- Simple arithmetic math channels (full implementation)
- Plot duplication
- Multi-plot selection/bulk actions
- Advanced histogram binning strategies
- XY plot point styling options

### Explicitly Deferred (Next Batch):
- Full drag-and-drop docking
- Detachable windows / multi-monitor
- Advanced math channel editor UI
- Full compare workflow UI
- Saved layout templates
- Plot annotations beyond markers
- Advanced derived channels (filtering, smoothing, FFT)

---

## Success Criteria

**Architecture:**
- Layout model supports future docking
- Plot type system is extensible
- State management is clean and testable

**User Experience:**
- Workspace feels like a professional analysis tool
- Zoom/pan is intuitive and responsive
- Hotkeys accelerate common workflows
- Multiple plot types provide analytical flexibility

**Code Quality:**
- Components are focused and reusable
- State is well-typed and validated
- Tests cover critical paths
- No regressions in existing features

**Performance:**
- Smooth rendering with multiple plots
- Responsive resize and zoom
- No lag with large datasets

---

## Risk Mitigation

**Risk:** Scope creep — trying to build too much
**Mitigation:** Strict prioritization, defer nice-to-haves

**Risk:** Breaking existing workspace functionality
**Mitigation:** Incremental refactoring, preserve existing state model during transition

**Risk:** uPlot integration complexity for new plot types
**Mitigation:** Start with simple canvas/SVG for histogram, use uPlot for XY if straightforward

**Risk:** Math channel evaluator complexity
**Mitigation:** Deliver architecture and simple arithmetic only, defer advanced features

**Risk:** Performance degradation with complex layouts
**Mitigation:** Profile early, optimize rendering, use React.memo where appropriate

---

## Next Batch Recommendations

After this batch completes, the next logical progression:

1. **Full Math Channel Editor** — Interactive expression builder, function library, validation
2. **Compare Workflow** — Load reference session, overlay plots, delta views
3. **Advanced Docking** — Drag-and-drop panel rearrangement, tabbed panels
4. **Plot Annotations** — Text labels, arrows, regions beyond markers
5. **Export/Reporting** — PDF export, screenshot capture, data export
6. **Advanced Derived Channels** — Filtering, smoothing, FFT, integration/differentiation
7. **Saved Layout Templates** — Predefined workspace layouts for common analyses

---

**Document Status:** PLAN  
**Next Step:** Begin implementation with Phase 1 (Layout & Panel System)
