/**
 * EngineSim storage layer using API with localStorage fallback.
 * Follows the same pattern as vehicles.ts.
 */

import type { EngineSimDocumentV1 } from '../domain/physics/engine/engineSimDocument';
import { engineSimsApi, type ApiEngineSim } from '../services/api';

// ── Types ───────────────────────────────────────────────────────────

export interface EngineSimRecord {
  id: string;
  name: string;
  doc: EngineSimDocumentV1;
  created_at: string;
  updated_at: string;
}

export interface EngineSimListItem {
  id: string;
  name: string;
  updated_at: string;
}

// ── localStorage fallback ───────────────────────────────────────────

const STORAGE_KEY = 'rsa.engineSims.v1';

function loadFromStorage(): EngineSimRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const items = JSON.parse(data);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(items: EngineSimRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save engine sims to localStorage:', error);
  }
}

function generateId(): string {
  return `esim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── API helpers ─────────────────────────────────────────────────────

function apiToRecord(api: ApiEngineSim): EngineSimRecord {
  return {
    id: api.id,
    name: api.name,
    doc: api.data as EngineSimDocumentV1,
    created_at: api.created_at,
    updated_at: api.updated_at,
  };
}

// ── Public CRUD ─────────────────────────────────────────────────────

/**
 * List all saved engine sims (id, name, updated_at only).
 */
export async function listEngineSims(): Promise<EngineSimListItem[]> {
  try {
    const response = await engineSimsApi.getAll();
    return response.engine_sims.map(s => ({
      id: s.id,
      name: s.name,
      updated_at: s.updated_at,
    }));
  } catch (error) {
    console.warn('listEngineSims: API failed, falling back to localStorage:', error);
    return loadFromStorage().map(s => ({
      id: s.id,
      name: s.name,
      updated_at: s.updated_at,
    }));
  }
}

/**
 * Get a single engine sim by ID (full record including doc).
 */
export async function getEngineSim(id: string): Promise<EngineSimRecord | null> {
  try {
    const response = await engineSimsApi.get(id);
    return apiToRecord(response.engine_sim);
  } catch (error) {
    console.warn('getEngineSim: API failed, falling back to localStorage:', error);
    const items = loadFromStorage();
    return items.find(s => s.id === id) ?? null;
  }
}

/**
 * Create a new engine sim. Returns the created record with server-assigned ID.
 */
export async function createEngineSim(
  name: string,
  doc: EngineSimDocumentV1,
): Promise<EngineSimRecord> {
  try {
    const response = await engineSimsApi.create({ name, data: doc });
    return apiToRecord(response.engine_sim);
  } catch (error) {
    console.warn('createEngineSim: API failed, falling back to localStorage:', error);
    const now = new Date().toISOString();
    const record: EngineSimRecord = {
      id: generateId(),
      name,
      doc,
      created_at: now,
      updated_at: now,
    };
    const items = loadFromStorage();
    items.push(record);
    saveToLocalStorage(items);
    return record;
  }
}

/**
 * Update an existing engine sim.
 */
export async function updateEngineSim(
  id: string,
  name: string,
  doc: EngineSimDocumentV1,
): Promise<void> {
  try {
    await engineSimsApi.update(id, { name, data: doc });
  } catch (error) {
    console.warn('updateEngineSim: API failed, falling back to localStorage:', error);
    const items = loadFromStorage();
    const idx = items.findIndex(s => s.id === id);
    if (idx >= 0) {
      items[idx] = { ...items[idx], name, doc, updated_at: new Date().toISOString() };
      saveToLocalStorage(items);
    } else {
      throw new Error('Engine sim not found in local storage.');
    }
  }
}

/**
 * Delete an engine sim by ID.
 */
export async function deleteEngineSim(id: string): Promise<void> {
  try {
    await engineSimsApi.delete(id);
  } catch (error) {
    console.warn('deleteEngineSim: API failed, falling back to localStorage:', error);
    const items = loadFromStorage();
    const filtered = items.filter(s => s.id !== id);
    saveToLocalStorage(filtered);
  }
}
