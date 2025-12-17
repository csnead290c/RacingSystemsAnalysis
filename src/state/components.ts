/**
 * Component Storage Service
 * 
 * Manages saved engines, clutches, and converters that can be
 * referenced by vehicles. Components are stored in localStorage
 * and synced to the server when online.
 */

import type { SavedEngine, SavedClutch, SavedConverter } from '../domain/schemas/components.schema';

// Storage keys
const STORAGE_KEYS = {
  engines: 'rsa_saved_engines',
  clutches: 'rsa_saved_clutches',
  converters: 'rsa_saved_converters',
} as const;

// ============================================================================
// Generic Storage Helpers
// ============================================================================

function loadFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Failed to load ${key} from storage:`, error);
    return [];
  }
}

function saveToStorage<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error(`Failed to save ${key} to storage:`, error);
  }
}

// ============================================================================
// Saved Engines
// ============================================================================

export function loadSavedEngines(): SavedEngine[] {
  return loadFromStorage<SavedEngine>(STORAGE_KEYS.engines);
}

export function getSavedEngine(id: string): SavedEngine | undefined {
  const engines = loadSavedEngines();
  return engines.find(e => e.id === id);
}

export function saveSavedEngine(engine: SavedEngine): SavedEngine {
  const engines = loadSavedEngines();
  const existingIndex = engines.findIndex(e => e.id === engine.id);
  
  const updatedEngine = {
    ...engine,
    updatedAt: Date.now(),
  };
  
  if (existingIndex >= 0) {
    engines[existingIndex] = updatedEngine;
  } else {
    engines.push({
      ...updatedEngine,
      createdAt: updatedEngine.createdAt || Date.now(),
    });
  }
  
  saveToStorage(STORAGE_KEYS.engines, engines);
  return updatedEngine;
}

export function deleteSavedEngine(id: string): boolean {
  const engines = loadSavedEngines();
  const filtered = engines.filter(e => e.id !== id);
  
  if (filtered.length === engines.length) {
    return false; // Not found
  }
  
  saveToStorage(STORAGE_KEYS.engines, filtered);
  return true;
}

// ============================================================================
// Saved Clutches
// ============================================================================

export function loadSavedClutches(): SavedClutch[] {
  return loadFromStorage<SavedClutch>(STORAGE_KEYS.clutches);
}

export function getSavedClutch(id: string): SavedClutch | undefined {
  const clutches = loadSavedClutches();
  return clutches.find(c => c.id === id);
}

export function saveSavedClutch(clutch: SavedClutch): SavedClutch {
  const clutches = loadSavedClutches();
  const existingIndex = clutches.findIndex(c => c.id === clutch.id);
  
  const updatedClutch = {
    ...clutch,
    updatedAt: Date.now(),
  };
  
  if (existingIndex >= 0) {
    clutches[existingIndex] = updatedClutch;
  } else {
    clutches.push({
      ...updatedClutch,
      createdAt: updatedClutch.createdAt || Date.now(),
    });
  }
  
  saveToStorage(STORAGE_KEYS.clutches, clutches);
  return updatedClutch;
}

export function deleteSavedClutch(id: string): boolean {
  const clutches = loadSavedClutches();
  const filtered = clutches.filter(c => c.id !== id);
  
  if (filtered.length === clutches.length) {
    return false;
  }
  
  saveToStorage(STORAGE_KEYS.clutches, filtered);
  return true;
}

// ============================================================================
// Saved Converters
// ============================================================================

export function loadSavedConverters(): SavedConverter[] {
  return loadFromStorage<SavedConverter>(STORAGE_KEYS.converters);
}

export function getSavedConverter(id: string): SavedConverter | undefined {
  const converters = loadSavedConverters();
  return converters.find(c => c.id === id);
}

export function saveSavedConverter(converter: SavedConverter): SavedConverter {
  const converters = loadSavedConverters();
  const existingIndex = converters.findIndex(c => c.id === converter.id);
  
  const updatedConverter = {
    ...converter,
    updatedAt: Date.now(),
  };
  
  if (existingIndex >= 0) {
    converters[existingIndex] = updatedConverter;
  } else {
    converters.push({
      ...updatedConverter,
      createdAt: updatedConverter.createdAt || Date.now(),
    });
  }
  
  saveToStorage(STORAGE_KEYS.converters, converters);
  return updatedConverter;
}

export function deleteSavedConverter(id: string): boolean {
  const converters = loadSavedConverters();
  const filtered = converters.filter(c => c.id !== id);
  
  if (filtered.length === converters.length) {
    return false;
  }
  
  saveToStorage(STORAGE_KEYS.converters, filtered);
  return true;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new engine from Engine Sim results
 */
export function createEngineFromSim(
  name: string,
  peakHP: number,
  rpmAtPeakHP: number,
  hpCurve?: { rpm: number; hp: number }[],
  source: 'engineJr' | 'enginePro' = 'enginePro',
  config?: unknown
): SavedEngine {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    source,
    peakHP,
    rpmAtPeakHP,
    hpCurve,
    engineProConfig: config,
  };
}

/**
 * Create a new clutch from Clutch Sim results
 */
export function createClutchFromSim(
  name: string,
  launchRPM: number,
  slipRPM: number,
  slippage: number = 1.004,
  config?: unknown
): SavedClutch {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    source: 'clutchSim',
    launchRPM,
    slipRPM,
    slippage,
    clutchSimConfig: config,
  };
}

/**
 * Create a new converter from Converter Sim results
 */
export function createConverterFromSim(
  name: string,
  stallRPM: number,
  torqueMultiplier: number,
  slippage: number = 1.0,
  config?: unknown
): SavedConverter {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    source: 'converterSim',
    stallRPM,
    torqueMultiplier,
    slippage,
    converterSimConfig: config,
  };
}

/**
 * Get component counts for display
 */
export function getComponentCounts(): { engines: number; clutches: number; converters: number } {
  return {
    engines: loadSavedEngines().length,
    clutches: loadSavedClutches().length,
    converters: loadSavedConverters().length,
  };
}
