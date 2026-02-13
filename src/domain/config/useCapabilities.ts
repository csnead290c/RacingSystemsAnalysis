/**
 * useCapabilities — React hook for capability checks
 *
 * Bridges the pure capability model with the existing auth/subscription system.
 * Replaces ad-hoc `features.quarterProFields` checks with `hasCap(ctx, 'library.install.engine')`.
 *
 * Supports a dev "View As" override that lets admin/dev users simulate any
 * plan/role/trial combination. The override is stored in localStorage and
 * only applied when the real user has admin.devTools or import.meta.env.DEV.
 */

import { useMemo, useSyncExternalStore, useCallback } from 'react';
import { useAuth } from '../auth';
import {
  hasCap,
  getEffectiveCapabilities,
  planFromLegacyTier,
  trialFromLegacyTier,
  roleFromLegacyId,
  isFullAccessRole,
  type PlanId,
  type RoleId,
  type Capability,
  type TrialState,
  type UserCapabilityContext,
} from './capabilities';
import { useSubscription } from './useSubscription';
import {
  isViewAsAllowed,
} from './devViewAs';
import { viewAsSubscribe, viewAsSnapshot, notifyViewAsChange } from './viewAsStore';

export interface CapabilityState {
  /** The resolved plan */
  plan: PlanId;
  /** The resolved role */
  role: RoleId;
  /** Trial overlay state */
  trial: TrialState;
  /** The full user context (pass to hasCap if needed outside this hook) */
  ctx: UserCapabilityContext;
  /** Check a single capability */
  can: (cap: Capability) => boolean;
  /** All effective capabilities for this user */
  capabilities: Capability[];
  /** Whether install capabilities are available */
  canInstall: boolean;
  /** Whether the user can save to personal library (always true for authenticated) */
  canSaveToLibrary: boolean;
  /** True when a dev "View As" override is actively applied */
  isOverrideActive: boolean;
}

// Re-export notifyViewAsChange so existing consumers (ViewAs panel, banner) keep working.
export { notifyViewAsChange };

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Hook that resolves the current user's plan + role + trial into a capability context.
 * If a dev "View As" override is active and allowed, it replaces the real context.
 */
export function useCapabilities(): CapabilityState {
  const { user, isAuthenticated } = useAuth();
  const { tier } = useSubscription();

  // Subscribe to View As override changes
  const viewAsOverride = useSyncExternalStore(viewAsSubscribe, viewAsSnapshot, viewAsSnapshot);

  // 1) Compute "real" context from auth/subscription
  const realCtx = useMemo((): UserCapabilityContext => {
    if (!isAuthenticated || !user) {
      return { plan: 'free', role: 'viewer', fullAccess: false };
    }

    const roleId = user.roleId;
    const fullAccess = isFullAccessRole(roleId);

    // Determine plan + trial: prefer subscription data, fall back to tier mapping
    let plan: PlanId;
    let trial: TrialState;
    const storedUser = localStorage.getItem('rsa.auth.currentUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.subscription_plan) {
          plan = planFromLegacyTier(parsed.subscription_plan);
          trial = trialFromLegacyTier(parsed.subscription_plan);
        } else {
          plan = planFromLegacyTier(tier);
          trial = trialFromLegacyTier(tier);
        }
      } catch {
        plan = planFromLegacyTier(tier);
        trial = trialFromLegacyTier(tier);
      }
    } else {
      plan = planFromLegacyTier(tier);
      trial = trialFromLegacyTier(tier);
    }

    const role = roleFromLegacyId(roleId);

    return { plan, role, fullAccess, trial };
  }, [isAuthenticated, user, tier]);

  // 2) Check if override should apply
  const realHasDevTools = useMemo(() => hasCap(realCtx, 'admin.devTools'), [realCtx]);
  const devAllowed = isViewAsAllowed(realHasDevTools);

  const isOverrideActive = !!(devAllowed && viewAsOverride?.enabled);

  // 3) Build effective context: override or real
  const ctx = useMemo((): UserCapabilityContext => {
    if (!isOverrideActive || !viewAsOverride) return realCtx;
    return {
      plan: viewAsOverride.planId,
      role: viewAsOverride.roleId,
      fullAccess: viewAsOverride.fullAccess ?? false,
      trial: viewAsOverride.trial,
    };
  }, [realCtx, isOverrideActive, viewAsOverride]);

  const can = useCallback(
    (cap: Capability) => hasCap(ctx, cap),
    [ctx],
  );

  const capabilities = useMemo(() => getEffectiveCapabilities(ctx), [ctx]);

  const canInstall = useMemo(
    () => hasCap(ctx, 'library.install.engine') && hasCap(ctx, 'library.install.clutch') && hasCap(ctx, 'library.install.fourLink'),
    [ctx],
  );

  const canSaveToLibrary = useMemo(
    () => hasCap(ctx, 'library.save.engine'),
    [ctx],
  );

  return {
    plan: ctx.plan,
    role: ctx.role,
    trial: ctx.trial ?? { active: false, targetPlan: 'pro' },
    ctx,
    can,
    capabilities,
    canInstall,
    canSaveToLibrary,
    isOverrideActive,
  };
}
