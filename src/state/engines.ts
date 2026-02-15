/**
 * Engines Storage Layer — DB-backed with localStorage fallback
 *
 * Replaces the localStorage-only SavedEngine/engineAsset system with
 * a versioned DB-backed engine library. Each "Save" creates a new revision;
 * "Save As" creates a new engine with revision 1.
 *
 * The VehicleEditor reads from this layer instead of localStorage.
 * Falls back to localStorage (rsa_saved_engines) for offline/unauthenticated users.
 */

import { enginesApi, type ApiEngine, type EngineRevisionPayload } from '../services/api';
import { loadSavedEngines, saveSavedEngine, createEngineFromSim } from './components';
import type { SavedEngine } from '../domain/schemas/components.schema';

// ── Types ───────────────────────────────────────────────────────────

export interface EngineListItem {
  id: string;           // uuid
  name: string;
  source: string;
  currentRevision: number;
  peakHP: number;
  rpmAtPeakHP: number;
  displacementCID: number | null;
  updatedAt: string;
}

export interface EngineDetail {
  id: string;           // uuid
  name: string;
  source: string;
  scope: string;
  currentRevision: number;
  revision: number;
  peakHP: number;
  rpmAtPeakHP: number;
  peakTorque: number | null;
  rpmAtPeakTorque: number | null;
  displacementCID: number | null;
  fuelType: string | null;
  hpCurve: { rpm: number; hp: number }[] | null;
  engineSimConfig: any | null;
  engineSimDocId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Converters ──────────────────────────────────────────────────────

function apiToListItem(api: ApiEngine): EngineListItem {
  return {
    id: api.id,
    name: api.name,
    source: api.source,
    currentRevision: api.current_revision,
    peakHP: api.peak_hp,
    rpmAtPeakHP: api.rpm_at_peak_hp,
    displacementCID: api.displacement_cid,
    updatedAt: api.updated_at,
  };
}

function apiToDetail(api: ApiEngine): EngineDetail {
  return {
    id: api.id,
    name: api.name,
    source: api.source,
    scope: api.scope,
    currentRevision: api.current_revision,
    revision: api.revision,
    peakHP: api.peak_hp,
    rpmAtPeakHP: api.rpm_at_peak_hp,
    peakTorque: api.peak_torque,
    rpmAtPeakTorque: api.rpm_at_peak_torque,
    displacementCID: api.displacement_cid,
    fuelType: api.fuel_type,
    hpCurve: api.hp_curve,
    engineSimConfig: api.engine_sim_config,
    engineSimDocId: api.engine_sim_doc_id,
    notes: api.notes,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

/** Convert a SavedEngine (localStorage) to EngineListItem for unified display */
function savedEngineToListItem(se: SavedEngine): EngineListItem {
  return {
    id: se.id,
    name: se.name,
    source: se.source ?? 'enginePro',
    currentRevision: 1,
    peakHP: se.peakHP,
    rpmAtPeakHP: se.rpmAtPeakHP,
    displacementCID: se.displacement ?? null,
    updatedAt: se.updatedAt ? new Date(se.updatedAt).toISOString() : new Date(se.createdAt).toISOString(),
  };
}

/** Convert a SavedEngine to EngineDetail for unified consumption */
function savedEngineToDetail(se: SavedEngine): EngineDetail {
  return {
    id: se.id,
    name: se.name,
    source: se.source ?? 'enginePro',
    scope: 'personal',
    currentRevision: 1,
    revision: 1,
    peakHP: se.peakHP,
    rpmAtPeakHP: se.rpmAtPeakHP,
    peakTorque: se.peakTorque ?? null,
    rpmAtPeakTorque: se.rpmAtPeakTorque ?? null,
    displacementCID: se.displacement ?? null,
    fuelType: se.fuelType ?? null,
    hpCurve: se.hpCurve ?? null,
    engineSimConfig: se.engineProConfig ?? null,
    engineSimDocId: null,
    notes: se.notes ?? null,
    createdAt: new Date(se.createdAt).toISOString(),
    updatedAt: se.updatedAt ? new Date(se.updatedAt).toISOString() : new Date(se.createdAt).toISOString(),
  };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * List all engines for the current user.
 * Tries DB first, falls back to localStorage SavedEngines.
 */
export async function listEngines(): Promise<EngineListItem[]> {
  try {
    const response = await enginesApi.getAll();
    return response.engines.map(apiToListItem);
  } catch (error) {
    console.warn('listEngines: API failed, falling back to localStorage:', error);
    return loadSavedEngines().map(savedEngineToListItem);
  }
}

/**
 * Get a single engine with a specific (or latest) revision.
 * Tries DB first, falls back to localStorage.
 */
export async function getEngine(id: string, revision?: number): Promise<EngineDetail | null> {
  try {
    const response = await enginesApi.get(id, revision);
    return apiToDetail(response.engine);
  } catch (error) {
    console.warn('getEngine: API failed, falling back to localStorage:', error);
    const engines = loadSavedEngines();
    const found = engines.find(e => e.id === id);
    return found ? savedEngineToDetail(found) : null;
  }
}

/**
 * Create a new engine (Save As) — new engine + first revision.
 * Also writes to localStorage for offline fallback.
 */
export async function createEngine(payload: EngineRevisionPayload): Promise<EngineDetail> {
  try {
    const response = await enginesApi.create(payload);
    const detail = apiToDetail(response.engine);
    // Mirror to localStorage for offline access
    mirrorToLocalStorage(detail);
    return detail;
  } catch (error) {
    console.warn('createEngine: API failed, falling back to localStorage:', error);
    return createEngineLocally(payload);
  }
}

/**
 * Save new revision on existing engine (Save).
 * Also updates localStorage mirror.
 */
export async function saveEngineRevision(id: string, payload: EngineRevisionPayload): Promise<EngineDetail> {
  try {
    const response = await enginesApi.update(id, payload);
    const detail = apiToDetail(response.engine);
    mirrorToLocalStorage(detail);
    return detail;
  } catch (error) {
    console.warn('saveEngineRevision: API failed, falling back to localStorage:', error);
    return updateEngineLocally(id, payload);
  }
}

/**
 * Delete an engine.
 */
export async function deleteEngine(id: string): Promise<void> {
  try {
    await enginesApi.delete(id);
  } catch (error) {
    console.warn('deleteEngine: API failed:', error);
  }
}

// ── localStorage mirror helpers ─────────────────────────────────────

function mirrorToLocalStorage(detail: EngineDetail): void {
  const engine = createEngineFromSim(
    detail.name,
    detail.peakHP,
    detail.rpmAtPeakHP,
    detail.hpCurve ?? undefined,
    (detail.source as 'engineJr' | 'enginePro') || 'enginePro',
    detail.engineSimConfig,
  );
  engine.id = detail.id; // Use DB uuid
  engine.peakTorque = detail.peakTorque ?? undefined;
  engine.rpmAtPeakTorque = detail.rpmAtPeakTorque ?? undefined;
  engine.displacement = detail.displacementCID ?? undefined;
  engine.fuelType = detail.fuelType ?? undefined;
  engine.notes = detail.notes ?? undefined;
  saveSavedEngine(engine);
  window.dispatchEvent(new Event('rsa-engines-updated'));
}

function createEngineLocally(payload: EngineRevisionPayload): EngineDetail {
  const engine = createEngineFromSim(
    payload.name ?? 'Untitled Engine',
    payload.peak_hp,
    payload.rpm_at_peak_hp,
    payload.hp_curve ?? undefined,
    (payload.source as 'engineJr' | 'enginePro') || 'enginePro',
    payload.engine_sim_config,
  );
  engine.peakTorque = payload.peak_torque ?? undefined;
  engine.rpmAtPeakTorque = payload.rpm_at_peak_torque ?? undefined;
  engine.displacement = payload.displacement_cid ?? undefined;
  engine.fuelType = payload.fuel_type ?? undefined;
  engine.notes = payload.notes ?? undefined;
  const saved = saveSavedEngine(engine);
  window.dispatchEvent(new Event('rsa-engines-updated'));
  return savedEngineToDetail(saved);
}

function updateEngineLocally(id: string, payload: EngineRevisionPayload): EngineDetail {
  const engine = createEngineFromSim(
    payload.name ?? 'Untitled Engine',
    payload.peak_hp,
    payload.rpm_at_peak_hp,
    payload.hp_curve ?? undefined,
    (payload.source as 'engineJr' | 'enginePro') || 'enginePro',
    payload.engine_sim_config,
  );
  engine.id = id; // Reuse existing ID
  engine.peakTorque = payload.peak_torque ?? undefined;
  engine.rpmAtPeakTorque = payload.rpm_at_peak_torque ?? undefined;
  engine.displacement = payload.displacement_cid ?? undefined;
  engine.fuelType = payload.fuel_type ?? undefined;
  engine.notes = payload.notes ?? undefined;
  const saved = saveSavedEngine(engine);
  window.dispatchEvent(new Event('rsa-engines-updated'));
  return savedEngineToDetail(saved);
}
