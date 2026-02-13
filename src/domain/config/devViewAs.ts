/**
 * Dev "View As" Override
 *
 * Allows admin/dev users to simulate any plan/role/trial combination
 * by overriding the capability context returned by useCapabilities().
 *
 * Persisted in localStorage so it survives page reloads.
 * Safety: ignored in production unless user has admin.devTools capability.
 */

import type { PlanId, RoleId, TrialState } from './capabilities';
import type { SubscriptionTier } from './entitlements';

// ── Types ────────────────────────────────────────────────────────────

export interface DevViewAsOverride {
  enabled: boolean;
  planId: PlanId;
  roleId: RoleId;
  trial?: TrialState;
  fullAccess?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'rsa.dev.viewAs.v1';

export const DEFAULT_OVERRIDE: DevViewAsOverride = {
  enabled: false,
  planId: 'free',
  roleId: 'member',
  trial: undefined,
  fullAccess: false,
};

// ── Read / Write ─────────────────────────────────────────────────────

/** Load the override from localStorage (returns undefined if absent or invalid). */
export function loadViewAsOverride(): DevViewAsOverride | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as DevViewAsOverride;
    if (typeof parsed.enabled !== 'boolean') return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/** Persist the override to localStorage. */
export function saveViewAsOverride(override: DevViewAsOverride): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(override));
}

/** Remove the override from localStorage. */
export function clearViewAsOverride(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Safety check ─────────────────────────────────────────────────────

/**
 * Returns true if the View As override is allowed for the current environment.
 * Allowed when:
 *   - import.meta.env.DEV is true (local dev), OR
 *   - the "real" user context has admin.devTools capability (checked by caller)
 */
export function isViewAsAllowed(realHasDevTools: boolean): boolean {
  return import.meta.env.DEV || realHasDevTools;
}

// ── Legacy bridge ────────────────────────────────────────────────────
// Maps View As override plan+role to the legacy product/feature lists
// used by hasFeature() / hasProduct() in the auth store.

/** Products available per plan (maps to DEFAULT_PRODUCTS ids in auth/types.ts) */
const PLAN_PRODUCTS: Record<PlanId, string[]> = {
  free:  [],
  basic: ['quarter_jr'],
  pro:   ['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro'],
  team:  ['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro', 'fourlink', 'cam_analyzer'],
};

/** Additional feature flags per role (beyond product features) */
const ROLE_FEATURES: Record<RoleId, string[]> = {
  owner:  ['dev_tools', 'user_management', 'role_management', 'system_settings', 'view_analytics', 'beta_features'],
  admin:  ['dev_tools', 'user_management', 'view_analytics', 'beta_features'],
  member: [],
  viewer: ['basic_sim'],
};

export interface ViewAsLegacyAccess {
  products: string[];
  additionalFeatures: string[];
}

/**
 * Given a View As override, return the legacy product IDs and additional
 * feature flags that the simulated user would have.
 */
// ── Subscription tier bridge ─────────────────────────────────────────
// Maps View As override to the SubscriptionTier used by useSubscription().

const PLAN_TO_TIER: Record<PlanId, SubscriptionTier> = {
  free:  'free',
  basic: 'racer',
  pro:   'pro',
  team:  'team',
};

const ROLE_TIER_UPGRADE: Partial<Record<RoleId, SubscriptionTier>> = {
  owner: 'owner',
  admin: 'owner',
};

/**
 * Given a View As override, return the SubscriptionTier that useSubscription()
 * should report. fullAccess maps to 'owner'. Otherwise plan takes precedence,
 * with owner/admin roles upgrading to 'owner' tier.
 */
export function getViewAsSubscriptionTier(override: DevViewAsOverride): SubscriptionTier {
  if (override.fullAccess) return 'owner';

  // If trial is active, use the higher of base plan or trial target plan
  let tier = PLAN_TO_TIER[override.planId];
  if (override.trial?.active && override.trial.targetPlan) {
    const trialTier = PLAN_TO_TIER[override.trial.targetPlan];
    const ORDER: SubscriptionTier[] = ['free', 'racer', 'pro', 'team'];
    if (ORDER.indexOf(trialTier) > ORDER.indexOf(tier)) {
      tier = trialTier;
    }
  }

  // Role-based upgrade (owner/admin get 'owner' tier)
  const roleUpgrade = ROLE_TIER_UPGRADE[override.roleId];
  if (roleUpgrade) return roleUpgrade;

  return tier;
}

export function getViewAsLegacyAccess(override: DevViewAsOverride): ViewAsLegacyAccess {
  if (override.fullAccess) {
    return {
      products: ['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro', 'fourlink', 'cam_analyzer'],
      additionalFeatures: ['dev_tools', 'user_management', 'role_management', 'system_settings', 'view_analytics', 'beta_features'],
    };
  }

  let products = [...PLAN_PRODUCTS[override.planId]];

  // Trial overlay: if trial is active, merge target plan's products
  if (override.trial?.active && override.trial.targetPlan) {
    const trialProducts = PLAN_PRODUCTS[override.trial.targetPlan];
    for (const p of trialProducts) {
      if (!products.includes(p)) products.push(p);
    }
  }

  return {
    products,
    additionalFeatures: ROLE_FEATURES[override.roleId] ?? [],
  };
}
