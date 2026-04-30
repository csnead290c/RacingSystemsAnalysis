/**
 * Workspace Layout Model
 * 
 * Defines the structure for a dockable-ready workspace layout.
 * Supports resizable panels, multiple plot types, and persistent state.
 */

export type PlotType = 'timeseries' | 'xy' | 'histogram' | 'eventlist';

export interface PanelState {
  width?: number;  // For left/right panels (px)
  height?: number; // For bottom panel (px)
  collapsed: boolean;
  visible: boolean;
}

export interface PlotPanel {
  id: string;
  type: PlotType;
  title: string;
  height: number; // Relative weight for stacking (0-1)
  config: PlotConfig;
}

export interface PlotConfig {
  // Common
  zoom?: ZoomState;
  
  // Time-series specific
  channels?: string[];
  yAxis?: AxisConfig;
  
  // XY/Scatter specific
  xChannel?: string;
  yChannels?: string[];
  
  // Histogram specific
  channel?: string;
  binCount?: number;
  
  // Event list specific
  filterType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ZoomState {
  xMin: number;
  xMax: number;
  yMin?: number;
  yMax?: number;
  locked: boolean;
}

export interface AxisConfig {
  auto: boolean;
  min?: number;
  max?: number;
  locked: boolean;
  showGrid: boolean;
  label?: string;
}

export interface CursorState {
  primary: number | null;
  reference: number | null;
  showReference: boolean;
}

export interface WorkspaceLayout {
  version: number; // For future migrations
  panels: {
    left: PanelState;
    right: PanelState;
    bottom: PanelState;
  };
  plotArea: {
    plots: PlotPanel[];
    activePlotId: string | null;
  };
  cursor: CursorState;
  selection: { start: number; end: number } | null;
  visibleChannels: string[];
  playback: {
    playing: boolean;
    speed: number;
  };
}

export const DEFAULT_PANEL_STATE: PanelState = {
  collapsed: false,
  visible: true,
};

export const DEFAULT_LAYOUT: WorkspaceLayout = {
  version: 1,
  panels: {
    left: { ...DEFAULT_PANEL_STATE, width: 250 },
    right: { ...DEFAULT_PANEL_STATE, width: 300 },
    bottom: { ...DEFAULT_PANEL_STATE, height: 0, visible: false },
  },
  plotArea: {
    plots: [],
    activePlotId: null,
  },
  cursor: {
    primary: null,
    reference: null,
    showReference: false,
  },
  selection: null,
  visibleChannels: [],
  playback: {
    playing: false,
    speed: 1,
  },
};

export function createDefaultPlot(id: string, type: PlotType = 'timeseries', channels: string[] = []): PlotPanel {
  return {
    id,
    type,
    title: `${type === 'timeseries' ? 'Plot' : type === 'xy' ? 'XY Plot' : type === 'histogram' ? 'Histogram' : 'Events'} ${id.replace(/\D/g, '')}`,
    height: 1,
    config: {
      channels: type === 'timeseries' ? channels : undefined,
      yAxis: {
        auto: true,
        locked: false,
        showGrid: true,
      },
    },
  };
}

export function serializeLayout(layout: WorkspaceLayout): string {
  return JSON.stringify(layout);
}

export function deserializeLayout(json: string): WorkspaceLayout {
  try {
    const parsed = JSON.parse(json);
    // Merge with defaults to handle missing fields
    return {
      ...DEFAULT_LAYOUT,
      ...parsed,
      panels: {
        ...DEFAULT_LAYOUT.panels,
        ...parsed.panels,
      },
      plotArea: {
        ...DEFAULT_LAYOUT.plotArea,
        ...parsed.plotArea,
      },
      cursor: {
        ...DEFAULT_LAYOUT.cursor,
        ...parsed.cursor,
      },
      playback: {
        ...DEFAULT_LAYOUT.playback,
        ...parsed.playback,
      },
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}
