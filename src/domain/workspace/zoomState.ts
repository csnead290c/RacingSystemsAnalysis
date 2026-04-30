/**
 * Zoom State Management
 * 
 * Manages zoom/pan state for plots with utilities for common operations.
 */

import type { ZoomState } from './layoutModel';

export interface ZoomBounds {
  xMin: number;
  xMax: number;
  yMin?: number;
  yMax?: number;
}

export function createDefaultZoom(xMin: number, xMax: number): ZoomState {
  return {
    xMin,
    xMax,
    locked: false,
  };
}

export function fitToData(dataMin: number, dataMax: number, padding: number = 0.05): ZoomBounds {
  const range = dataMax - dataMin;
  const pad = range * padding;
  return {
    xMin: dataMin - pad,
    xMax: dataMax + pad,
  };
}

export function zoomIn(current: ZoomState, factor: number = 0.8): ZoomState {
  if (current.locked) return current;
  
  const center = (current.xMin + current.xMax) / 2;
  const range = current.xMax - current.xMin;
  const newRange = range * factor;
  
  return {
    ...current,
    xMin: center - newRange / 2,
    xMax: center + newRange / 2,
  };
}

export function zoomOut(current: ZoomState, factor: number = 1.25): ZoomState {
  if (current.locked) return current;
  
  const center = (current.xMin + current.xMax) / 2;
  const range = current.xMax - current.xMin;
  const newRange = range * factor;
  
  return {
    ...current,
    xMin: center - newRange / 2,
    xMax: center + newRange / 2,
  };
}

export function panLeft(current: ZoomState, factor: number = 0.1): ZoomState {
  if (current.locked) return current;
  
  const range = current.xMax - current.xMin;
  const shift = range * factor;
  
  return {
    ...current,
    xMin: current.xMin - shift,
    xMax: current.xMax - shift,
  };
}

export function panRight(current: ZoomState, factor: number = 0.1): ZoomState {
  if (current.locked) return current;
  
  const range = current.xMax - current.xMin;
  const shift = range * factor;
  
  return {
    ...current,
    xMin: current.xMin + shift,
    xMax: current.xMax + shift,
  };
}

export function zoomToSelection(selection: { start: number; end: number }, padding: number = 0.05): ZoomBounds {
  const range = selection.end - selection.start;
  const pad = range * padding;
  
  return {
    xMin: selection.start - pad,
    xMax: selection.end + pad,
  };
}

export function zoomToRange(xMin: number, xMax: number): ZoomState {
  return {
    xMin,
    xMax,
    locked: false,
  };
}

export function toggleLock(current: ZoomState): ZoomState {
  return {
    ...current,
    locked: !current.locked,
  };
}

export function resetZoom(dataMin: number, dataMax: number): ZoomState {
  const bounds = fitToData(dataMin, dataMax);
  return {
    xMin: bounds.xMin,
    xMax: bounds.xMax,
    locked: false,
  };
}

export function isZoomed(current: ZoomState, dataMin: number, dataMax: number, tolerance: number = 0.01): boolean {
  const dataRange = dataMax - dataMin;
  const currentRange = current.xMax - current.xMin;
  
  return Math.abs(currentRange - dataRange) / dataRange > tolerance;
}

export function clampZoom(zoom: ZoomState, dataMin: number, dataMax: number): ZoomState {
  return {
    ...zoom,
    xMin: Math.max(zoom.xMin, dataMin),
    xMax: Math.min(zoom.xMax, dataMax),
  };
}
