/**
 * Engine Assets Storage Layer
 *
 * localStorage-backed CRUD for Engine Assets. Follows the same pattern
 * as components.ts and engineSims.ts. Namespaced by scope (personal/team).
 *
 * Team scope is stubbed — reads return an empty list, writes are no-ops.
 * This will be replaced with API calls when team sharing ships.
 */

import type { EngineAsset, EngineAssetScope } from '../domain/library/engineAssets';

// ── Storage Keys ────────────────────────────────────────────────────

const STORAGE_KEY_PERSONAL = 'rsa.engineAssets.personal.v1';
// const STORAGE_KEY_TEAM = 'rsa.engineAssets.team.v1'; // future

// ── Internal Helpers ────────────────────────────────────────────────

function loadFromStorage(key: string): EngineAsset[] {
  try {
    const data = localStorage.getItem(key);
    if (!data) return [];
    const items = JSON.parse(data);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(key: string, items: EngineAsset[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error(`Failed to save engine assets to ${key}:`, error);
  }
}

function keyForScope(scope: EngineAssetScope): string {
  switch (scope) {
    case 'personal': return STORAGE_KEY_PERSONAL;
    case 'team': return STORAGE_KEY_PERSONAL; // stub: team falls back to personal key for now
  }
}

function generateId(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ea_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Public CRUD ─────────────────────────────────────────────────────

/**
 * List all engine assets for a given scope.
 */
export function listEngineAssets(scope: EngineAssetScope = 'personal'): EngineAsset[] {
  if (scope === 'team') return []; // stub
  return loadFromStorage(keyForScope(scope));
}

/**
 * Get a single engine asset by ID. Searches personal scope first,
 * then team scope (when implemented).
 */
export function getEngineAsset(id: string): EngineAsset | undefined {
  const personal = loadFromStorage(STORAGE_KEY_PERSONAL);
  return personal.find(a => a.id === id);
}

/**
 * Create a new engine asset. Returns the created asset with a generated ID.
 */
export function createEngineAsset(
  asset: Omit<EngineAsset, 'id' | 'createdAt' | 'updatedAt' | 'revision'> & { name: string },
): EngineAsset {
  const now = new Date().toISOString();
  const newAsset: EngineAsset = {
    ...asset,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    revision: 1,
  } as EngineAsset;

  const key = keyForScope(newAsset.scope);
  const items = loadFromStorage(key);
  items.push(newAsset);
  saveToLocalStorage(key, items);
  return newAsset;
}

/**
 * Update an existing engine asset. Increments revision automatically.
 */
export function updateEngineAsset(
  id: string,
  updates: Partial<Omit<EngineAsset, 'id' | 'createdAt' | 'revision'>>,
): EngineAsset | undefined {
  const key = STORAGE_KEY_PERSONAL;
  const items = loadFromStorage(key);
  const idx = items.findIndex(a => a.id === id);
  if (idx < 0) return undefined;

  const existing = items[idx];
  const updated: EngineAsset = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    revision: existing.revision + 1,
  } as EngineAsset;

  items[idx] = updated;
  saveToLocalStorage(key, items);
  return updated;
}

/**
 * Delete an engine asset by ID.
 */
export function deleteEngineAsset(id: string): boolean {
  const key = STORAGE_KEY_PERSONAL;
  const items = loadFromStorage(key);
  const filtered = items.filter(a => a.id !== id);
  if (filtered.length === items.length) return false;
  saveToLocalStorage(key, filtered);
  return true;
}
