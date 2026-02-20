/**
 * Legacy Program Display Names
 *
 * Resolves user-facing program names based on the current subscription tier.
 * The original VB6 suite used "Quarter Jr / Quarter Pro", "Engine Jr / Engine Pro",
 * etc.  This module centralises those display strings so the UI can honour the
 * legacy branding without touching internal routes or component names.
 *
 * The resolver depends ONLY on the existing capability / plan system.
 *
 * Usage (React):
 *   const { can } = useCapabilities();
 *   const name = getQuarterProgramName(can);
 *
 * Usage (pure):
 *   const name = getQuarterProgramNameFromPlan('pro');  // "Quarter Pro"
 */

import type { PlanId } from '../config/capabilities';
import type { Capability } from '../config/capabilities';

// ── Types ────────────────────────────────────────────────────────────

export type ProgramTier = 'Jr' | 'Pro';

export interface ProgramNames {
  quarter: string;
  engine: string;
  landSpeed: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Capability checker — matches the `can` function from useCapabilities(). */
type CanFn = (cap: Capability) => boolean;

/**
 * Determine whether the user is at "Pro" tier for Quarter-Mile features.
 * Pro is granted when the user has the `sim.advanced` capability — the same
 * gate that controls `features.quarterProFields` in the subscription system.
 * This is pro/team/beta/owner only; free/basic/racer get Jr.
 */
function isQuarterPro(can: CanFn): boolean {
  return can('sim.advanced');
}

/**
 * Determine whether the user is at "Pro" tier for Engine Sim features.
 * Pro is granted when the user has the `engine.proMode` capability.
 */
function isEnginePro(can: CanFn): boolean {
  return can('engine.proMode');
}

/**
 * Determine whether the user is at "Pro" tier for Land Speed features.
 * Uses the same `sim.advanced` gate as Quarter Pro — land speed Pro features
 * are the Quarter Pro feature set applied to a land speed track.
 * (`track.bonneville` gates track *access*, not feature tier.)
 */
function isLandSpeedPro(can: CanFn): boolean {
  return can('sim.advanced');
}

// ── Public API (capability-based) ────────────────────────────────────

export function getQuarterProgramName(can: CanFn): string {
  return isQuarterPro(can) ? 'Quarter Pro' : 'Quarter Jr';
}

export function getEngineProgramName(can: CanFn): string {
  return isEnginePro(can) ? 'Engine Pro' : 'Engine Jr';
}

export function getLandSpeedProgramName(can: CanFn): string {
  return isLandSpeedPro(can) ? 'Bonneville Pro' : 'Bonneville Jr';
}

export function getProgramTier(can: CanFn): ProgramTier {
  // If any Pro capability is present, user is Pro tier
  return isQuarterPro(can) ? 'Pro' : 'Jr';
}

export function getAllProgramNames(can: CanFn): ProgramNames {
  return {
    quarter: getQuarterProgramName(can),
    engine: getEngineProgramName(can),
    landSpeed: getLandSpeedProgramName(can),
  };
}

// ── Public API (plan-based, for non-React contexts) ──────────────────

const PRO_PLANS: ReadonlySet<PlanId> = new Set(['pro', 'team']);

export function getQuarterProgramNameFromPlan(plan: PlanId): string {
  return PRO_PLANS.has(plan) ? 'Quarter Pro' : 'Quarter Jr';
}

export function getEngineProgramNameFromPlan(plan: PlanId): string {
  return PRO_PLANS.has(plan) ? 'Engine Pro' : 'Engine Jr';
}

export function getLandSpeedProgramNameFromPlan(plan: PlanId): string {
  return PRO_PLANS.has(plan) ? 'Bonneville Pro' : 'Bonneville Jr';
}
