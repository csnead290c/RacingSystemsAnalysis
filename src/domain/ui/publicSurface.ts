/**
 * Public Surface Gating — single source of truth.
 *
 * Defines which modules are visible to "public" (normal) users vs
 * "internal" users (dev/owner/admin).
 *
 * PUBLIC modules (visible to everyone):
 *   quarter, engine, vehicles, calculators, about
 *
 * INTERNAL-ONLY modules (hidden from normal users):
 *   team, history, raceDay, admin, dev, log, import,
 *   techCard, ladder, opponents, dialIn
 */

// ── Module IDs ──────────────────────────────────────────────────────
export type InternalModule =
  | 'team'
  | 'history'
  | 'raceDay'
  | 'admin'
  | 'dev'
  | 'log'
  | 'import'
  | 'techCard'
  | 'ladder'
  | 'opponents'
  | 'dialIn';

/** All modules that require internal access. */
export const INTERNAL_MODULES: readonly InternalModule[] = [
  'team',
  'history',
  'raceDay',
  'admin',
  'dev',
  'log',
  'import',
  'techCard',
  'ladder',
  'opponents',
  'dialIn',
] as const;

/** Route paths that map to internal modules. */
export const INTERNAL_ROUTES: Record<string, InternalModule> = {
  '/team': 'team',
  '/parts': 'team',
  '/events': 'team',
  '/maintenance': 'team',
  '/expenses': 'team',
  '/history': 'history',
  '/log': 'log',
  '/race-day': 'raceDay',
  '/admin': 'admin',
  '/dev': 'dev',
  '/import': 'import',
  '/tech-card': 'techCard',
  '/ladder': 'ladder',
  '/opponents': 'opponents',
  '/dial-in': 'dialIn',
};

/** Public core routes (always safe to link for non-internal users). */
export const PUBLIC_CORE_ROUTES = [
  '/et-sim',
  '/engine-sim',
  '/vehicles',
  '/calculators',
  '/about',
] as const;

// ── Context for visibility checks ──────────────────────────────────

export interface VisibilityContext {
  /** User's role ID from auth (e.g. 'owner', 'admin', 'member', undefined). */
  roleId?: string;
  /** Whether the app is running in Vite dev mode. */
  isDev?: boolean;
}

// ── Core helpers ────────────────────────────────────────────────────

/**
 * Returns true if the current user is an internal user (dev/owner/admin).
 *
 * Internal users can see and access all modules, including those not
 * yet ready for public release.
 */
export function isInternalUser(ctx: VisibilityContext): boolean {
  if (ctx.isDev) return true;
  if (ctx.roleId === 'owner' || ctx.roleId === 'admin') return true;
  return false;
}

/**
 * Returns true if a given internal module should be shown to the user.
 *
 * For internal modules, only internal users can see them.
 * This does NOT check feature-flag entitlements (e.g. teamManagement) —
 * those are layered on top by the caller if needed.
 */
export function shouldShowModule(
  _moduleId: InternalModule,
  ctx: VisibilityContext,
): boolean {
  // All internal modules require internal user status
  return isInternalUser(ctx);
}

/**
 * Returns true if a route path is an internal-only route.
 */
export function isInternalRoute(path: string): boolean {
  return path in INTERNAL_ROUTES;
}

/**
 * Convenience: build a VisibilityContext from common auth values.
 */
export function buildVisibilityContext(
  roleId?: string,
): VisibilityContext {
  return {
    roleId,
    isDev: import.meta.env.DEV,
  };
}
