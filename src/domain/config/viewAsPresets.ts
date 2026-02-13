/**
 * View As Presets & Expected Route Helpers
 *
 * Pure functions (no React, no localStorage at module scope) for:
 * - Preset definitions for common View As test scenarios
 * - Deriving expected route visibility from sim-gate diagnostics
 *
 * Extracted for testability — used by ViewAs panel and AccessSmokeTest panel.
 */

import type { PlanId, RoleId } from './capabilities';
import type { DevViewAsOverride } from './devViewAs';
import type { SimAccessDiagnostics } from './guards';

// ── Preset definitions ──────────────────────────────────────────────

export interface ViewAsPreset {
  id: string;
  label: string;
  description: string;
  override: DevViewAsOverride;
}

export const VIEW_AS_PRESETS: readonly ViewAsPreset[] = [
  {
    id: 'free-viewer',
    label: 'Free Viewer',
    description: 'No sim access, calculators only',
    override: {
      enabled: true,
      planId: 'free' as PlanId,
      roleId: 'viewer' as RoleId,
      fullAccess: false,
    },
  },
  {
    id: 'basic-member',
    label: 'Basic Member',
    description: 'Racer plan — all sim pages',
    override: {
      enabled: true,
      planId: 'basic' as PlanId,
      roleId: 'member' as RoleId,
      fullAccess: false,
    },
  },
  {
    id: 'pro-member',
    label: 'Pro Member',
    description: 'Pro plan — all features',
    override: {
      enabled: true,
      planId: 'pro' as PlanId,
      roleId: 'member' as RoleId,
      fullAccess: false,
    },
  },
  {
    id: 'team-admin',
    label: 'Team Admin',
    description: 'Team plan + admin role',
    override: {
      enabled: true,
      planId: 'team' as PlanId,
      roleId: 'admin' as RoleId,
      fullAccess: false,
    },
  },
  {
    id: 'owner-full',
    label: 'Owner Full Access',
    description: 'All capabilities unlocked',
    override: {
      enabled: true,
      planId: 'team' as PlanId,
      roleId: 'owner' as RoleId,
      fullAccess: true,
    },
  },
] as const;

// ── Expected route visibility ───────────────────────────────────────

type GateKey = keyof SimAccessDiagnostics;

export interface ExpectedRoute {
  path: string;
  label: string;
  /** Gate key from SimAccessDiagnostics, or 'loginOnly' for routes open to all logged-in users. */
  gate: GateKey | 'loginOnly';
  expected: 'ALLOW' | 'BLOCK';
  /** Optional note about feature-limited behavior within the route. */
  note?: string;
}

/** All gated routes and which gate controls them. */
const GATED_ROUTES: readonly { path: string; label: string; gate: GateKey }[] = [
  { path: '/et-sim',    label: 'ET Sim',    gate: 'etSim' },
  { path: '/predict',   label: 'Predict',   gate: 'etSim' },
  { path: '/race-day',  label: 'Race Day',  gate: 'raceTools' },
  { path: '/dial-in',   label: 'Dial-In',   gate: 'raceTools' },
  { path: '/opponents', label: 'Opponents', gate: 'raceTools' },
  { path: '/ladder',    label: 'Ladder',    gate: 'raceTools' },
  { path: '/tech-card', label: 'Tech Card', gate: 'raceTools' },
  { path: '/import',    label: 'Import',    gate: 'raceTools' },
  { path: '/log',       label: 'Log',       gate: 'runLogging' },
  { path: '/history',   label: 'History',   gate: 'runLogging' },
  { path: '/vehicles',  label: 'Vehicles',  gate: 'vehicles' },
];

/** Routes open to all logged-in users (no feature gate). */
const LOGIN_ONLY_ROUTES: readonly { path: string; label: string; note?: string }[] = [
  { path: '/engine-sim',        label: 'Engine Sim', note: 'Advanced tabs require engine.proMode' },
  { path: '/library/engines',   label: 'Engines Library' },
  { path: '/library/clutches',  label: 'Clutches Library' },
  { path: '/library/four-links', label: 'Four Links Library' },
];

/** @deprecated Use SimAccessDiagnostics directly. */
export type SimDiags = SimAccessDiagnostics;

/**
 * Given the current diagnostics, derive the expected ALLOW/BLOCK
 * for every gated route + login-only routes. Pure function — no React deps.
 */
export function getExpectedRoutes(diags: SimAccessDiagnostics): ExpectedRoute[] {
  const gated: ExpectedRoute[] = GATED_ROUTES.map((r) => ({
    ...r,
    expected: diags[r.gate].allowed ? 'ALLOW' as const : 'BLOCK' as const,
  }));
  const loginOnly: ExpectedRoute[] = LOGIN_ONLY_ROUTES.map((r) => ({
    ...r,
    gate: 'loginOnly' as const,
    expected: 'ALLOW' as const,
    ...(r.note ? { note: r.note } : {}),
  }));
  return [...gated, ...loginOnly];
}

/**
 * Returns true if any gate has a mismatch between legacy/capability/subscription.
 */
export function hasAnyMismatch(diags: SimAccessDiagnostics): boolean {
  return [diags.etSim, diags.raceTools, diags.runLogging, diags.vehicles].some(
    (d) => !(d.legacy === d.capability && d.capability === d.subscription),
  );
}
