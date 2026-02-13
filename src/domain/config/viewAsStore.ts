/**
 * View As Reactive Store
 *
 * Shared reactive store for the View As override, used by both
 * useCapabilities() and useSubscription() via useSyncExternalStore.
 *
 * Extracted into its own module to avoid circular dependencies
 * (useCapabilities ↔ useSubscription).
 *
 * CRITICAL: viewAsSnapshot() returns a cached reference. It must NOT
 * parse localStorage on every call — that creates a new object each time,
 * which useSyncExternalStore sees as "changed" → re-render → infinite loop.
 * The cache is refreshed only when notifyViewAsChange() is called.
 */

import { loadViewAsOverride, type DevViewAsOverride } from './devViewAs';

let _listeners: Array<() => void> = [];
let _cached: DevViewAsOverride | undefined = loadViewAsOverride();

/** Subscribe to View As override changes. */
export function viewAsSubscribe(cb: () => void): () => void {
  _listeners.push(cb);
  return () => {
    _listeners = _listeners.filter(l => l !== cb);
  };
}

/** Return the cached override (referentially stable between notifications). */
export function viewAsSnapshot(): DevViewAsOverride | undefined {
  return _cached;
}

/** Refresh the cache from localStorage and notify all subscribers. */
export function notifyViewAsChange(): void {
  _cached = loadViewAsOverride();
  for (const cb of _listeners) cb();
}
