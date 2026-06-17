/**
 * Offline run sync — flushes locally-queued (pending) runs to the server.
 *
 * Called on app load and when visiting the run history. Each pending record is
 * POSTed (server upserts by `client_id`, so retries are idempotent). On success
 * the local copy is replaced with the synced server record; on failure it stays
 * queued for the next attempt. Last-write-wins; no multi-device conflict UI.
 */

import { runsApi, getAuthToken } from '../services/api';
import { _runsLocal } from './runs';

let syncing = false;

export interface SyncResult {
  attempted: number;
  synced: number;
  failed: number;
}

/**
 * Attempt to sync all pending local runs to the server.
 * No-op if unauthenticated or already running.
 */
export async function syncPendingRuns(): Promise<SyncResult> {
  const result: SyncResult = { attempted: 0, synced: 0, failed: 0 };

  if (!getAuthToken() || syncing) return result;
  syncing = true;

  try {
    const local = _runsLocal.read();
    const pending = local.filter(r => r.syncStatus === 'pending');
    result.attempted = pending.length;

    for (const run of pending) {
      try {
        const res = await runsApi.save(_runsLocal.recordToApiPayload(run));
        const saved = _runsLocal.apiRunToRecord(res.run);
        // Remove the local pending copy (by its clientId) and store the
        // canonical synced record returned by the server.
        _runsLocal.remove(run.clientId ?? run.id);
        _runsLocal.upsert(saved);
        result.synced += 1;
      } catch (err) {
        console.warn('syncPendingRuns: failed to sync run', run.clientId ?? run.id, err);
        result.failed += 1;
      }
    }
  } finally {
    syncing = false;
  }

  return result;
}
