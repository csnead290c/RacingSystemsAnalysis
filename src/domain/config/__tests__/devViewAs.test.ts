/**
 * Tests for the Dev "View As" override system:
 * - localStorage persistence (load / save / clear)
 * - Safety gating (isViewAsAllowed)
 * - Override context construction (verifying hasCap works with overridden ctx)
 * - Override ignored when dev not allowed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadViewAsOverride,
  saveViewAsOverride,
  clearViewAsOverride,
  isViewAsAllowed,
  getViewAsLegacyAccess,
  getViewAsSubscriptionTier,
  DEFAULT_OVERRIDE,
  type DevViewAsOverride,
} from '../devViewAs';
import {
  hasCap,
  getEffectiveCapabilities,
  PLAN_CAPABILITIES,
  type UserCapabilityContext,
} from '../capabilities';
import { TIER_FEATURES } from '../entitlements';

// ── Mock localStorage ────────────────────────────────────────────────
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
vi.stubGlobal('localStorage', mockLocalStorage);

beforeEach(() => {
  mockLocalStorage.clear();
});

// =========================================================================
// localStorage persistence
// =========================================================================
describe('localStorage persistence', () => {

  it('loadViewAsOverride returns undefined when nothing stored', () => {
    expect(loadViewAsOverride()).toBeUndefined();
  });

  it('saveViewAsOverride + loadViewAsOverride round-trips correctly', () => {
    const override: DevViewAsOverride = {
      enabled: true,
      planId: 'pro',
      roleId: 'admin',
      fullAccess: false,
      trial: { active: true, targetPlan: 'team' },
    };
    saveViewAsOverride(override);
    const loaded = loadViewAsOverride();
    expect(loaded).toEqual(override);
  });

  it('clearViewAsOverride removes the key', () => {
    saveViewAsOverride({ enabled: true, planId: 'pro', roleId: 'member' });
    expect(loadViewAsOverride()).toBeDefined();
    clearViewAsOverride();
    expect(loadViewAsOverride()).toBeUndefined();
  });

  it('loadViewAsOverride returns undefined for invalid JSON', () => {
    localStorage.setItem('rsa.dev.viewAs.v1', 'not-json');
    expect(loadViewAsOverride()).toBeUndefined();
  });

  it('loadViewAsOverride returns undefined for object missing enabled field', () => {
    localStorage.setItem('rsa.dev.viewAs.v1', JSON.stringify({ planId: 'pro' }));
    expect(loadViewAsOverride()).toBeUndefined();
  });

  it('DEFAULT_OVERRIDE has enabled=false', () => {
    expect(DEFAULT_OVERRIDE.enabled).toBe(false);
    expect(DEFAULT_OVERRIDE.planId).toBe('free');
    expect(DEFAULT_OVERRIDE.roleId).toBe('member');
  });
});

// =========================================================================
// Safety gating
// =========================================================================
describe('isViewAsAllowed', () => {
  it('returns true in DEV mode regardless of devTools capability', () => {
    // import.meta.env.DEV is true in vitest
    expect(isViewAsAllowed(false)).toBe(true);
    expect(isViewAsAllowed(true)).toBe(true);
  });

  // Note: We can't easily test the production case (import.meta.env.DEV = false)
  // in vitest since it's always DEV. The logic is:
  //   return import.meta.env.DEV || realHasDevTools
  // So if DEV were false, isViewAsAllowed(false) would be false
  // and isViewAsAllowed(true) would be true.
});

// =========================================================================
// Override context construction
// =========================================================================
describe('override context works with hasCap', () => {
  it('overridden ctx as free/member has no install capability', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'member',
      fullAccess: false,
    };
    expect(hasCap(ctx, 'library.install.engine')).toBe(false);
    expect(hasCap(ctx, 'library.save.engine')).toBe(false); // free no longer has library.save
  });

  it('overridden ctx as pro/member has install capability', () => {
    const ctx: UserCapabilityContext = {
      plan: 'pro',
      role: 'member',
      fullAccess: false,
    };
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'library.install.clutch')).toBe(true);
    expect(hasCap(ctx, 'library.install.fourLink')).toBe(true);
  });

  it('overridden ctx as team/member has team capabilities', () => {
    const ctx: UserCapabilityContext = {
      plan: 'team',
      role: 'member',
      fullAccess: false,
    };
    expect(hasCap(ctx, 'team.enabled')).toBe(true);
    expect(hasCap(ctx, 'team.vehicles.share')).toBe(true);
  });

  it('overridden ctx as free/viewer has minimal capabilities', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'viewer',
      fullAccess: false,
    };
    expect(hasCap(ctx, 'sim.basic')).toBe(true);
    expect(hasCap(ctx, 'library.install.engine')).toBe(false);
    expect(hasCap(ctx, 'admin.devTools')).toBe(false);
  });

  it('overridden ctx with fullAccess=true gets all capabilities', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'viewer',
      fullAccess: true,
    };
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'admin.devTools')).toBe(true);
    expect(hasCap(ctx, 'team.enabled')).toBe(true);
  });

  it('overridden ctx with trial overlay grants target plan caps', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'member',
      fullAccess: false,
      trial: { active: true, targetPlan: 'pro' },
    };
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'sim.advanced')).toBe(true);
    // But not team caps
    expect(hasCap(ctx, 'team.enabled')).toBe(false);
  });

  it('overridden ctx with inactive trial does NOT grant target plan caps', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'member',
      fullAccess: false,
      trial: { active: false, targetPlan: 'pro' },
    };
    expect(hasCap(ctx, 'library.install.engine')).toBe(false);
    expect(hasCap(ctx, 'sim.advanced')).toBe(false);
  });

  it('getEffectiveCapabilities matches expected count for overridden pro ctx', () => {
    const ctx: UserCapabilityContext = {
      plan: 'pro',
      role: 'member',
      fullAccess: false,
    };
    const caps = getEffectiveCapabilities(ctx);
    expect(caps.length).toBe(PLAN_CAPABILITIES.pro.size);
  });
});

// =========================================================================
// Override ignored when not allowed (simulated)
// =========================================================================
describe('override ignored when dev not allowed', () => {
  it('building ctx from override vs real — hasCap gives different results', () => {
    // Simulate: real user is free/member, override says pro/member
    const realCtx: UserCapabilityContext = { plan: 'free', role: 'member', fullAccess: false };
    const overrideCtx: UserCapabilityContext = { plan: 'pro', role: 'member', fullAccess: false };

    // Real ctx: no install
    expect(hasCap(realCtx, 'library.install.engine')).toBe(false);
    // Override ctx: has install
    expect(hasCap(overrideCtx, 'library.install.engine')).toBe(true);

    // The hook logic: if !devAllowed, use realCtx regardless of override
    // We verify this by checking the real ctx is used
    const devAllowed = false;
    const effectiveCtx = devAllowed ? overrideCtx : realCtx;
    expect(hasCap(effectiveCtx, 'library.install.engine')).toBe(false);
  });

  it('building ctx from override when dev IS allowed — override wins', () => {
    const realCtx: UserCapabilityContext = { plan: 'free', role: 'member', fullAccess: false };
    const overrideCtx: UserCapabilityContext = { plan: 'pro', role: 'member', fullAccess: false };

    const devAllowed = true;
    const overrideEnabled = true;
    const effectiveCtx = (devAllowed && overrideEnabled) ? overrideCtx : realCtx;
    expect(hasCap(effectiveCtx, 'library.install.engine')).toBe(true);
  });
});

// =========================================================================
// Full round-trip: save override → build ctx → check caps
// =========================================================================
describe('full round-trip', () => {
  it('save pro/admin override → load → build ctx → hasCap works', () => {
    const override: DevViewAsOverride = {
      enabled: true,
      planId: 'pro',
      roleId: 'admin',
      fullAccess: false,
    };
    saveViewAsOverride(override);

    const loaded = loadViewAsOverride()!;
    expect(loaded.enabled).toBe(true);

    const ctx: UserCapabilityContext = {
      plan: loaded.planId,
      role: loaded.roleId,
      fullAccess: loaded.fullAccess ?? false,
      trial: loaded.trial,
    };

    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'admin.devTools')).toBe(true);
    expect(hasCap(ctx, 'admin.userManagement')).toBe(true);
  });

  it('save free/viewer override with trial → load → build ctx → trial caps work', () => {
    const override: DevViewAsOverride = {
      enabled: true,
      planId: 'free',
      roleId: 'viewer',
      fullAccess: false,
      trial: { active: true, targetPlan: 'team' },
    };
    saveViewAsOverride(override);

    const loaded = loadViewAsOverride()!;
    const ctx: UserCapabilityContext = {
      plan: loaded.planId,
      role: loaded.roleId,
      fullAccess: loaded.fullAccess ?? false,
      trial: loaded.trial,
    };

    // Trial overlay grants team caps
    expect(hasCap(ctx, 'team.enabled')).toBe(true);
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    // But no admin caps (viewer role, no fullAccess)
    expect(hasCap(ctx, 'admin.devTools')).toBe(false);
  });

  it('disabled override is loaded but should not be applied', () => {
    const override: DevViewAsOverride = {
      enabled: false,
      planId: 'pro',
      roleId: 'admin',
    };
    saveViewAsOverride(override);

    const loaded = loadViewAsOverride()!;
    expect(loaded.enabled).toBe(false);

    // The hook logic: isOverrideActive = devAllowed && loaded.enabled
    // Since enabled=false, isOverrideActive=false, so real ctx is used
    const devAllowed = true;
    const isOverrideActive = devAllowed && loaded.enabled;
    expect(isOverrideActive).toBe(false);
  });
});

// =========================================================================
// Legacy bridge: getViewAsLegacyAccess
// =========================================================================
describe('getViewAsLegacyAccess', () => {
  it('free/viewer override returns no products and basic_sim feature only', () => {
    const access = getViewAsLegacyAccess({
      enabled: true,
      planId: 'free',
      roleId: 'viewer',
      fullAccess: false,
    });
    expect(access.products).toEqual([]);
    expect(access.additionalFeatures).toEqual(['basic_sim']);
  });

  it('basic/member override returns quarter_jr only, no additional features', () => {
    const access = getViewAsLegacyAccess({
      enabled: true,
      planId: 'basic',
      roleId: 'member',
      fullAccess: false,
    });
    expect(access.products).toEqual(['quarter_jr']);
    expect(access.additionalFeatures).toEqual([]);
  });

  it('pro/member override returns pro products, no additional features', () => {
    const access = getViewAsLegacyAccess({
      enabled: true,
      planId: 'pro',
      roleId: 'member',
      fullAccess: false,
    });
    expect(access.products).toEqual(['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro']);
    expect(access.additionalFeatures).toEqual([]);
  });

  it('team/admin override returns all team products + admin features', () => {
    const access = getViewAsLegacyAccess({
      enabled: true,
      planId: 'team',
      roleId: 'admin',
      fullAccess: false,
    });
    expect(access.products).toEqual(['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro', 'fourlink', 'cam_analyzer']);
    expect(access.additionalFeatures).toContain('dev_tools');
    expect(access.additionalFeatures).toContain('user_management');
  });

  it('fullAccess=true grants all products and all features regardless of plan/role', () => {
    const access = getViewAsLegacyAccess({
      enabled: true,
      planId: 'free',
      roleId: 'viewer',
      fullAccess: true,
    });
    expect(access.products).toContain('quarter_pro');
    expect(access.products).toContain('engine_pro');
    expect(access.products).toContain('fourlink');
    expect(access.additionalFeatures).toContain('dev_tools');
    expect(access.additionalFeatures).toContain('user_management');
  });

  it('trial overlay merges target plan products into base plan', () => {
    const access = getViewAsLegacyAccess({
      enabled: true,
      planId: 'free',
      roleId: 'member',
      fullAccess: false,
      trial: { active: true, targetPlan: 'pro' },
    });
    // Free has no products, but trial→pro adds pro products
    expect(access.products).toContain('quarter_pro');
    expect(access.products).toContain('engine_pro');
    // No team products
    expect(access.products).not.toContain('fourlink');
  });

  it('inactive trial does NOT merge target plan products', () => {
    const access = getViewAsLegacyAccess({
      enabled: true,
      planId: 'free',
      roleId: 'member',
      fullAccess: false,
      trial: { active: false, targetPlan: 'pro' },
    });
    expect(access.products).toEqual([]);
  });

  it('fullAccess unspecified defaults to false (no extra access)', () => {
    const access = getViewAsLegacyAccess({
      enabled: true,
      planId: 'free',
      roleId: 'viewer',
    });
    // Same as fullAccess=false
    expect(access.products).toEqual([]);
    expect(access.additionalFeatures).toEqual(['basic_sim']);
  });
});

// =========================================================================
// Subscription tier bridge: getViewAsSubscriptionTier
// =========================================================================
describe('getViewAsSubscriptionTier', () => {
  it('free/viewer => free tier', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'free', roleId: 'viewer', fullAccess: false,
    })).toBe('free');
  });

  it('free/member => free tier', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'free', roleId: 'member', fullAccess: false,
    })).toBe('free');
  });

  it('basic/member => racer tier', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'basic', roleId: 'member', fullAccess: false,
    })).toBe('racer');
  });

  it('pro/member => pro tier', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'pro', roleId: 'member', fullAccess: false,
    })).toBe('pro');
  });

  it('team/member => team tier', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'team', roleId: 'member', fullAccess: false,
    })).toBe('team');
  });

  it('any plan + admin role => owner tier (role upgrade)', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'free', roleId: 'admin', fullAccess: false,
    })).toBe('owner');
  });

  it('any plan + owner role => owner tier (role upgrade)', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'basic', roleId: 'owner', fullAccess: false,
    })).toBe('owner');
  });

  it('fullAccess=true => owner tier regardless of plan/role', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'free', roleId: 'viewer', fullAccess: true,
    })).toBe('owner');
  });

  it('trial active upgrades tier to target plan', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'free', roleId: 'member', fullAccess: false,
      trial: { active: true, targetPlan: 'pro' },
    })).toBe('pro');
  });

  it('trial active does not downgrade tier', () => {
    // pro base + trial targeting basic should stay pro
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'pro', roleId: 'member', fullAccess: false,
      trial: { active: true, targetPlan: 'basic' },
    })).toBe('pro');
  });

  it('trial inactive has no effect', () => {
    expect(getViewAsSubscriptionTier({
      enabled: true, planId: 'free', roleId: 'member', fullAccess: false,
      trial: { active: false, targetPlan: 'pro' },
    })).toBe('free');
  });
});

// =========================================================================
// View As + ET Sim: subscription tier etSim feature flag
// =========================================================================
describe('View As + ET Sim subscription feature', () => {
  it('View As free => free tier => etSim=false', () => {
    const tier = getViewAsSubscriptionTier({
      enabled: true, planId: 'free', roleId: 'member', fullAccess: false,
    });
    expect(tier).toBe('free');
    expect(TIER_FEATURES[tier].etSim).toBe(false);
    // But basicSim is still true (calculators remain accessible)
    expect(TIER_FEATURES[tier].basicSim).toBe(true);
  });

  it('View As basic => racer tier => etSim=true', () => {
    const tier = getViewAsSubscriptionTier({
      enabled: true, planId: 'basic', roleId: 'member', fullAccess: false,
    });
    expect(tier).toBe('racer');
    expect(TIER_FEATURES[tier].etSim).toBe(true);
  });

  it('View As pro => pro tier => etSim=true', () => {
    const tier = getViewAsSubscriptionTier({
      enabled: true, planId: 'pro', roleId: 'member', fullAccess: false,
    });
    expect(tier).toBe('pro');
    expect(TIER_FEATURES[tier].etSim).toBe(true);
  });

  it('View As free + viewer => free tier => etSim=false', () => {
    const tier = getViewAsSubscriptionTier({
      enabled: true, planId: 'free', roleId: 'viewer', fullAccess: false,
    });
    expect(tier).toBe('free');
    expect(TIER_FEATURES[tier].etSim).toBe(false);
  });
});

// =========================================================================
// View As + ET Sim: legacy bridge (et_sim feature via products)
// =========================================================================
describe('View As + ET Sim legacy bridge', () => {
  it('free/viewer has no products => no et_sim feature', () => {
    const access = getViewAsLegacyAccess({
      enabled: true, planId: 'free', roleId: 'viewer',
    });
    // Free has no products, so no product-based features like et_sim
    expect(access.products).toEqual([]);
  });

  it('basic/member has quarter_jr => et_sim feature available', () => {
    const access = getViewAsLegacyAccess({
      enabled: true, planId: 'basic', roleId: 'member',
    });
    expect(access.products).toContain('quarter_jr');
  });

  it('pro/member has quarter_jr + quarter_pro => et_sim feature available', () => {
    const access = getViewAsLegacyAccess({
      enabled: true, planId: 'pro', roleId: 'member',
    });
    expect(access.products).toContain('quarter_jr');
    expect(access.products).toContain('quarter_pro');
  });
});
