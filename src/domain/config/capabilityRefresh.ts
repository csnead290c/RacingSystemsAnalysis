/**
 * Capability Refresh — Client-Side Server Sync
 *
 * Fetches the user's current capabilities from the server and updates
 * the local cache. Used to ensure the client stays in sync after:
 *   - Subscription changes (checkout success, upgrade/downgrade)
 *   - Admin capability grants/revocations
 *   - App mount (initial load)
 *   - Window focus (if cache is stale)
 *
 * The cached data is stored in localStorage and used as a fallback
 * when offline. The `version` field enables efficient cache invalidation.
 *
 * Usage:
 *   import { refreshCapabilities, getCachedCapabilities } from './capabilityRefresh';
 *
 *   // Fetch from server and update cache
 *   const result = await refreshCapabilities(getAuthToken);
 *
 *   // Read from cache (for offline fallback)
 *   const cached = getCachedCapabilities();
 */

import type { PlanId, RoleId, Capability } from './capabilities';

// ── Types ───────────────────────────────────────────────────────────────

export interface ServerCapabilityResponse {
  plan: PlanId;
  role: RoleId;
  capabilities: Capability[];
  version: number;
}

export interface CachedCapabilities {
  plan: PlanId;
  role: RoleId;
  capabilities: Capability[];
  version: number;
  fetchedAt: string; // ISO timestamp
}

// ── Constants ───────────────────────────────────────────────────────────

const CACHE_KEY = 'rsa.capabilities.cache';
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const API_URL = '/api/capabilities-endpoint.php';

// ── Cache read/write ────────────────────────────────────────────────────

/**
 * Read cached capabilities from localStorage.
 * Returns null if no cache exists or it's unparseable.
 */
export function getCachedCapabilities(): CachedCapabilities | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedCapabilities;
  } catch {
    return null;
  }
}

/**
 * Write capabilities to the local cache.
 */
function setCachedCapabilities(data: ServerCapabilityResponse): CachedCapabilities {
  const cached: CachedCapabilities = {
    ...data,
    fetchedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // localStorage full or unavailable — silently skip
  }
  return cached;
}

/**
 * Clear the capability cache (e.g., on logout).
 */
export function clearCapabilityCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // noop
  }
}

/**
 * Check if the cached capabilities are stale (older than STALE_THRESHOLD_MS).
 */
export function isCacheStale(): boolean {
  const cached = getCachedCapabilities();
  if (!cached) return true;
  const age = Date.now() - new Date(cached.fetchedAt).getTime();
  return age > STALE_THRESHOLD_MS;
}

// ── Server fetch ────────────────────────────────────────────────────────

/**
 * Fetch the user's current capabilities from the server.
 *
 * @param getToken  Async function that returns the current auth token
 *                  (e.g., Clerk's `getToken()` or the legacy JWT from localStorage).
 * @returns The server response, or null if the fetch failed.
 */
export async function refreshCapabilities(
  getToken: () => Promise<string | null>,
): Promise<CachedCapabilities | null> {
  try {
    const token = await getToken();
    if (!token) return null;

    const res = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[capabilityRefresh] Server returned ${res.status}`);
      return null;
    }

    const data = (await res.json()) as ServerCapabilityResponse;
    return setCachedCapabilities(data);
  } catch (err) {
    console.warn('[capabilityRefresh] Fetch failed (offline?):', err);
    return null;
  }
}

/**
 * Refresh capabilities only if the cache is stale.
 * Returns the cached data (fresh or existing) or null.
 */
export async function refreshIfStale(
  getToken: () => Promise<string | null>,
): Promise<CachedCapabilities | null> {
  if (!isCacheStale()) {
    return getCachedCapabilities();
  }
  return refreshCapabilities(getToken);
}
