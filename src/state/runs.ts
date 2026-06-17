/**
 * Run storage layer — hybrid, DB-first with offline localStorage fallback.
 *
 * Source of truth = the server (`runs.php` / `run_history`). When the API is
 * reachable and the user is authenticated, runs are saved to the DB. When a
 * save fails (no signal / not authed), the record is written to a local
 * pending queue with `syncStatus: 'pending'` and a stable `clientId`, then
 * flushed on the next successful load / sync (see `runSync.ts`).
 *
 * Conflict policy for the weekend MVP: last-write-wins via server `updatedAt`.
 * localStorage is a cache/queue only — never the long-term source of truth.
 */

import type { RunRecordV1 } from '../domain/schemas/run.schema';
import type { RaceLength } from '../domain/config/raceLengths';
import { runsApi, type ApiRun, getAuthToken } from '../services/api';
import type { IStorage } from './storage';

/** Local cache + pending queue. v2 = rich records. */
const STORAGE_KEY = 'rsa.runs.v2';
/** Legacy local-only key (pre-hybrid). Migrated into the queue once. */
const LEGACY_KEY = 'rsa.runs.v1';

function genClientId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── localStorage helpers ────────────────────────────────────────────────────

function readLocal(): RunRecordV1[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  // One-time migration of legacy local-only runs into the pending queue.
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy) && legacy.length > 0) {
        const migrated: RunRecordV1[] = legacy.map((r: RunRecordV1) => ({
          ...r,
          clientId: r.clientId ?? r.id ?? genClientId(),
          syncStatus: 'pending' as const,
        }));
        writeLocal(migrated);
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function writeLocal(runs: RunRecordV1[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch (e) {
    console.warn('runs: failed to write local cache', e);
  }
}

function upsertLocal(run: RunRecordV1): void {
  const runs = readLocal();
  const key = run.clientId ?? run.id;
  const idx = runs.findIndex(r => (r.clientId ?? r.id) === key || r.id === run.id);
  if (idx >= 0) runs[idx] = run;
  else runs.push(run);
  writeLocal(runs);
}

function removeLocal(idOrClientId: string): void {
  const runs = readLocal().filter(
    r => r.id !== idOrClientId && r.clientId !== idOrClientId
  );
  writeLocal(runs);
}

// ── mapping: API <-> RunRecordV1 ────────────────────────────────────────────

/** Convert a server ApiRun into a RunRecordV1. */
export function apiRunToRecord(api: ApiRun): RunRecordV1 {
  // Prefer the full rich payload when present; legacy rows reconstruct minimally.
  const base: Partial<RunRecordV1> = (api.run_data && typeof api.run_data === 'object')
    ? (api.run_data as RunRecordV1)
    : {
        raceLength: api.race_length as RaceLength,
        env: api.env,
        outcome: { slipET_s: api.result?.et_s, slipMPH: api.result?.mph },
        notes: api.notes,
      };

  return {
    ...(base as RunRecordV1),
    id: api.id,
    clientId: api.client_id ?? base.clientId ?? api.id,
    vehicleId: api.vehicle_id || base.vehicleId || '',
    vehicleName: api.vehicle_name || base.vehicleName,
    raceLength: (api.race_length as RaceLength) || base.raceLength,
    env: base.env ?? api.env,
    runKind: api.run_kind ?? base.runKind ?? 'logged',
    correctedET: api.corrected_et ?? base.correctedET,
    correctionFactor: api.correction_factor ?? base.correctionFactor,
    weatherSource: (api.weather_source as RunRecordV1['weatherSource']) ?? base.weatherSource,
    createdAt: api.timestamp ?? base.createdAt ?? Date.now(),
    updatedAt: api.updated_at ? Date.parse(api.updated_at) : base.updatedAt,
    syncStatus: 'synced',
  };
}

function pickResultET(run: RunRecordV1): number {
  return (
    run.outcome?.slipET_s ??
    run.quarterMileET ??
    run.eighthMileET ??
    run.runCompletion?.completedET ??
    run.prediction?.et_s ??
    0
  );
}

function pickResultMPH(run: RunRecordV1): number {
  return (
    run.outcome?.slipMPH ??
    run.quarterMileMPH ??
    run.eighthMileMPH ??
    run.runCompletion?.completedMPH ??
    run.prediction?.mph ??
    0
  );
}

/** Build the API save payload from a rich run record. */
function recordToApiPayload(run: RunRecordV1) {
  return {
    vehicle_id: run.vehicleId || '',
    vehicle_name: run.vehicleName || run.vehicleId || 'Run',
    race_length: String(run.raceLength),
    env: run.env,
    result_et: pickResultET(run),
    result_mph: pickResultMPH(run),
    notes: run.notes,
    run_data: run,
    client_id: run.clientId,
    run_kind: run.runKind ?? 'logged',
    corrected_et: run.correctedET ?? null,
    correction_factor: run.correctionFactor ?? null,
    weather_source: run.weatherSource ?? null,
  };
}

function isAuthed(): boolean {
  return !!getAuthToken();
}

// ── public store (implements IStorage + clearAll) ───────────────────────────

export const runsStore: IStorage & { clearAll(): Promise<void> } = {
  /**
   * Load all runs. DB-first: fetch from API, merge in any local pending
   * records not yet synced, refresh the local cache, and return sorted.
   * On API failure, return the local cache (offline).
   */
  async loadRuns(): Promise<RunRecordV1[]> {
    const local = readLocal();
    const pending = local.filter(r => r.syncStatus === 'pending');

    if (!isAuthed()) {
      return [...local].sort((a, b) => b.createdAt - a.createdAt);
    }

    try {
      const res = await runsApi.getAll(100);
      const serverRuns = res.runs.map(apiRunToRecord);
      const serverClientIds = new Set(
        serverRuns.map(r => r.clientId).filter(Boolean) as string[]
      );
      // Keep only pending records the server hasn't already accepted.
      const pendingOnly = pending.filter(
        r => !(r.clientId && serverClientIds.has(r.clientId))
      );
      const merged = [...serverRuns, ...pendingOnly];
      writeLocal(merged);
      return merged.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.warn('runs.loadRuns: API failed, using local cache', err);
      return [...local].sort((a, b) => b.createdAt - a.createdAt);
    }
  },

  /** Save (upsert) a run. DB-first; falls back to a local pending record. */
  async saveRun(run: RunRecordV1): Promise<void> {
    const clientId = run.clientId ?? run.id ?? genClientId();
    const prepared: RunRecordV1 = {
      ...run,
      clientId,
      runKind: run.runKind ?? 'logged',
    };

    if (!isAuthed()) {
      upsertLocal({ ...prepared, syncStatus: 'pending' });
      return;
    }

    try {
      // POST upserts by (user_id, client_id) server-side, so this is safe to
      // call for both new and existing records.
      const res = await runsApi.save(recordToApiPayload(prepared));
      const saved = apiRunToRecord(res.run);
      // Replace any local copy (by clientId) with the synced server record.
      removeLocal(clientId);
      upsertLocal(saved);
    } catch (err) {
      console.warn('runs.saveRun: API failed, queuing locally', err);
      upsertLocal({ ...prepared, syncStatus: 'pending' });
    }
  },

  /** Delete a run by server id or clientId. */
  async deleteRun(id: string): Promise<void> {
    if (isAuthed()) {
      try {
        await runsApi.delete(id);
      } catch (err) {
        console.warn('runs.deleteRun: API delete failed', err);
      }
    }
    removeLocal(id);
  },

  /** Clear all of the user's runs (server + local cache). */
  async clearAll(): Promise<void> {
    if (isAuthed()) {
      try {
        await runsApi.clearAll();
      } catch (err) {
        console.warn('runs.clearAll: API failed', err);
      }
    }
    writeLocal([]);
  },
};

/** Internal accessors used by the sync helper. */
export const _runsLocal = {
  read: readLocal,
  write: writeLocal,
  upsert: upsertLocal,
  remove: removeLocal,
  recordToApiPayload,
  apiRunToRecord,
};
