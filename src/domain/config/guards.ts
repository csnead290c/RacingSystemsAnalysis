/**
 * Access Guards
 *
 * Centralized helpers for feature-gating decisions.
 * Each guard encapsulates the check across all three access-control systems
 * so call-sites don't need to know which system is canonical.
 *
 * Pure functions (safe for tests — no authStore/localStorage):
 *   canAccessEtSim({ hasFeature })
 *   canAccessRaceTools({ hasFeature })
 *   canAccessRunLogging({ hasFeature })
 *   canAccessVehicles({ hasFeature })
 *
 * React hooks (wire into all three systems for diagnostics):
 *   useAccessDiagnostics()
 *
 * ── Verification Checklist (View As) ─────────────────────────────────
 *
 * Free + Viewer:
 *   Nav:          Home, Calcs only (no ET Sim, History, Vehicles, Engine Sim)
 *   Home cards:   Calculators only (no ET Sim, Run History, Race Day)
 *   QuickActions: Vehicles, Calculators only (no Run Sim, Dial-In, Log, Race Day)
 *   Routes blocked: /et-sim, /predict, /race-day, /dial-in, /opponents,
 *                   /ladder, /tech-card, /import, /log, /history, /vehicles
 *   Routes open:   /, /calculators, /calcs, /about, /pricing,
 *                  /engine-sim (login-only), /library/* (login-only)
 *   AccessSmokeTest: all 4 feature gates show ❌ → BLOCK
 *
 * Basic + Member:
 *   Nav:          Home, Vehicles, ET Sim, Engine Sim, Calcs, History
 *   Home cards:   ET Sim, Vehicles, Run History, Race Day, Calculators
 *   QuickActions: all 6 actions visible
 *   Routes open:  all sim/tool pages
 *   AccessSmokeTest: all 4 feature gates show ✅ → ALLOW
 *
 * Pro + Member:
 *   Same as Basic + Member, plus clutch sim, converter sim, engine pro,
 *   advanced settings, import/export, etc.
 *   AccessSmokeTest: all 4 feature gates show ✅ → ALLOW
 */

import { useAuth } from '../auth';
import { useCapabilities } from './useCapabilities';
import { useSubscription } from './useSubscription';
import type { FeatureFlag } from '../auth/types';
import type { Capability } from './capabilities';
import type { TierFeatures } from './entitlements';

// ── Shared types ─────────────────────────────────────────────────────

/** Dependency bag for pure-function guards. */
export interface GuardDeps {
  hasFeature: (f: FeatureFlag) => boolean;
}

/** Diagnostic result for a single gate. */
export interface SimGateDiag {
  allowed: boolean;
  legacy: boolean;
  capability: boolean;
  subscription: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

/** ET Sim — Predict / ET Sim page (basic+) */
export const ET_SIM_FEATURE: FeatureFlag = 'et_sim';
export const ET_SIM_CAP = 'sim.et' as const;
export const ET_SIM_SUB_KEY = 'etSim' as const;

/** Race Tools — Race Day, Dial-In, Opponents, Ladder, Tech Card, Import (basic+) */
export const RACE_TOOLS_FEATURE: FeatureFlag = 'race_tools';
export const RACE_TOOLS_CAP = 'sim.raceTools' as const;
export const RACE_TOOLS_SUB_KEY = 'raceTools' as const;

/** Run Logging — Log + History pages (basic+) */
export const RUN_LOGGING_FEATURE: FeatureFlag = 'run_logging';
export const RUN_LOGGING_CAP = 'data.runLog' as const;
export const RUN_LOGGING_SUB_KEY = 'runLogging' as const;

/** Vehicles — Vehicle management page (basic+) */
export const VEHICLES_FEATURE: FeatureFlag = 'save_vehicles';
export const VEHICLES_CAP = 'data.vehicles' as const;
export const VEHICLES_SUB_KEY = 'saveVehicles' as const;

// ── Pure-function guards ─────────────────────────────────────────────

/** Can the current user access the ET Sim / Predict page? */
export function canAccessEtSim(deps: GuardDeps): boolean {
  return deps.hasFeature(ET_SIM_FEATURE);
}

/** Can the current user access Race Day, Dial-In, Opponents, Ladder, Tech Card, Import? */
export function canAccessRaceTools(deps: GuardDeps): boolean {
  return deps.hasFeature(RACE_TOOLS_FEATURE);
}

/** Can the current user access Log + History pages? */
export function canAccessRunLogging(deps: GuardDeps): boolean {
  return deps.hasFeature(RUN_LOGGING_FEATURE);
}

/** Can the current user access the Vehicles page? */
export function canAccessVehicles(deps: GuardDeps): boolean {
  return deps.hasFeature(VEHICLES_FEATURE);
}

// ── React hook — diagnostics across all three systems ────────────────

export interface SimAccessDiagnostics {
  etSim: SimGateDiag;
  raceTools: SimGateDiag;
  runLogging: SimGateDiag;
  vehicles: SimGateDiag;
}

/**
 * React hook that checks page access across all three systems.
 * Used by the AccessSmokeTest dev panel.
 */
export function useAccessDiagnostics(): SimAccessDiagnostics {
  const { hasFeature } = useAuth();
  const { can } = useCapabilities();
  const { hasFeature: subHasFeature } = useSubscription();

  function diag(
    legacyFlag: FeatureFlag,
    capKey: Capability,
    subKey: keyof TierFeatures,
  ): SimGateDiag {
    const legacy = hasFeature(legacyFlag);
    const capability = can(capKey);
    const subscription = subHasFeature(subKey);
    return { allowed: legacy, legacy, capability, subscription };
  }

  return {
    etSim: diag(ET_SIM_FEATURE, ET_SIM_CAP, ET_SIM_SUB_KEY),
    raceTools: diag(RACE_TOOLS_FEATURE, RACE_TOOLS_CAP, RACE_TOOLS_SUB_KEY),
    runLogging: diag(RUN_LOGGING_FEATURE, RUN_LOGGING_CAP, RUN_LOGGING_SUB_KEY),
    vehicles: diag(VEHICLES_FEATURE, VEHICLES_CAP, VEHICLES_SUB_KEY),
  };
}

/** @deprecated Alias for useAccessDiagnostics — kept for backward compat. */
export const useSimAccessDiagnostics = useAccessDiagnostics;

// ── Legacy re-export for backward compat ─────────────────────────────

/** @deprecated Use useSimAccessDiagnostics() instead. */
export function useEtSimAccess() {
  const diags = useSimAccessDiagnostics();
  const d = diags.etSim;
  return {
    allowed: d.allowed,
    legacyHasFeature: d.legacy,
    capHasCap: d.capability,
    subscriptionEtSim: d.subscription,
    reason: d.allowed ? 'ET Sim access granted' : 'ET Sim blocked — upgrade to Basic or higher',
  };
}
