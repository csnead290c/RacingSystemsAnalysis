/**
 * Tests for access guards and page gating consistency.
 *
 * Covers:
 * - Pure-function guards: canAccessEtSim, canAccessRaceTools, canAccessRunLogging, canAccessVehicles
 * - Cross-system consistency: free lacks ALL gates across all 3 systems
 * - Basic has ALL gates across all 3 systems
 * - View As override flips all gates
 * - Subscription tier feature flags per tier
 *
 * NOTE: We mirror the guard constants here to avoid importing guards.ts
 * which pulls in React hooks → authStore → localStorage at module scope.
 */

import { describe, it, expect } from 'vitest';
import { hasCap, PLAN_CAPABILITIES, type UserCapabilityContext } from '../capabilities';
import { TIER_FEATURES, type SubscriptionTier, type TierFeatures } from '../entitlements';
import {
  getViewAsLegacyAccess,
  getViewAsSubscriptionTier,
  type DevViewAsOverride,
} from '../devViewAs';
import { DEFAULT_PRODUCTS } from '../../auth/types';

// ── Mirrored constants from guards.ts ────────────────────────────────

const ET_SIM_FEATURE = 'et_sim' as const;
const ET_SIM_CAP = 'sim.et' as const;
const ET_SIM_SUB = 'etSim' as const;

const RACE_TOOLS_FEATURE = 'race_tools' as const;
const RACE_TOOLS_CAP = 'sim.raceTools' as const;
const RACE_TOOLS_SUB = 'raceTools' as const;

const RUN_LOGGING_FEATURE = 'run_logging' as const;
const RUN_LOGGING_CAP = 'data.runLog' as const;
const RUN_LOGGING_SUB = 'runLogging' as const;

const VEHICLES_FEATURE = 'save_vehicles' as const;
const VEHICLES_CAP = 'data.vehicles' as const;
const VEHICLES_SUB = 'saveVehicles' as const;

// ── Mirrored pure-function guards ────────────────────────────────────

function canAccessEtSim(deps: { hasFeature: (f: string) => boolean }) {
  return deps.hasFeature(ET_SIM_FEATURE);
}
function canAccessRaceTools(deps: { hasFeature: (f: string) => boolean }) {
  return deps.hasFeature(RACE_TOOLS_FEATURE);
}
function canAccessRunLogging(deps: { hasFeature: (f: string) => boolean }) {
  return deps.hasFeature(RUN_LOGGING_FEATURE);
}
function canAccessVehicles(deps: { hasFeature: (f: string) => boolean }) {
  return deps.hasFeature(VEHICLES_FEATURE);
}

// ── Gate descriptors for parameterized tests ─────────────────────────

interface GateSpec {
  name: string;
  feature: string;
  cap: string;
  subKey: keyof TierFeatures;
  guard: (deps: { hasFeature: (f: string) => boolean }) => boolean;
}

const GATES: GateSpec[] = [
  { name: 'ET Sim',      feature: ET_SIM_FEATURE,      cap: ET_SIM_CAP,      subKey: ET_SIM_SUB,      guard: canAccessEtSim },
  { name: 'Race Tools',  feature: RACE_TOOLS_FEATURE,  cap: RACE_TOOLS_CAP,  subKey: RACE_TOOLS_SUB,  guard: canAccessRaceTools },
  { name: 'Run Logging', feature: RUN_LOGGING_FEATURE, cap: RUN_LOGGING_CAP, subKey: RUN_LOGGING_SUB, guard: canAccessRunLogging },
  { name: 'Vehicles',    feature: VEHICLES_FEATURE,    cap: VEHICLES_CAP,    subKey: VEHICLES_SUB,    guard: canAccessVehicles },
];

// =========================================================================
// Pure-function guard behavior
// =========================================================================
describe('pure-function guards', () => {
  for (const g of GATES) {
    describe(g.name, () => {
      it('returns true when hasFeature returns true for its feature', () => {
        expect(g.guard({ hasFeature: (f) => f === g.feature })).toBe(true);
      });

      it('returns false when hasFeature returns false', () => {
        expect(g.guard({ hasFeature: () => false })).toBe(false);
      });

      it(`only checks the ${g.feature} feature`, () => {
        const calls: string[] = [];
        g.guard({ hasFeature: (f) => { calls.push(f); return false; } });
        expect(calls).toEqual([g.feature]);
      });
    });
  }
});

// =========================================================================
// Free user: ALL sim gates blocked across all 3 systems
// =========================================================================
describe('Free user: ALL sim gates blocked', () => {
  for (const g of GATES) {
    describe(g.name, () => {
      it(`capability: free plan lacks ${g.cap}`, () => {
        expect(PLAN_CAPABILITIES.free.has(g.cap as any)).toBe(false);
        const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
        expect(hasCap(ctx, g.cap)).toBe(false);
      });

      it(`subscription: free tier has ${g.subKey}=false`, () => {
        expect(TIER_FEATURES.free[g.subKey]).toBe(false);
      });

      it('legacy: free plan has no products', () => {
        const access = getViewAsLegacyAccess({
          enabled: true, planId: 'free', roleId: 'member',
        });
        expect(access.products).toEqual([]);
      });
    });
  }
});

// =========================================================================
// Basic user: ALL sim gates allowed across all 3 systems
// =========================================================================
describe('Basic user: ALL sim gates allowed', () => {
  for (const g of GATES) {
    describe(g.name, () => {
      it(`capability: basic plan has ${g.cap}`, () => {
        expect(PLAN_CAPABILITIES.basic.has(g.cap as any)).toBe(true);
        const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
        expect(hasCap(ctx, g.cap)).toBe(true);
      });

      it(`subscription: racer tier has ${g.subKey}=true`, () => {
        expect(TIER_FEATURES.racer[g.subKey]).toBe(true);
      });

      it(`legacy: basic plan has quarter_jr which includes ${g.feature}`, () => {
        const access = getViewAsLegacyAccess({
          enabled: true, planId: 'basic', roleId: 'member',
        });
        expect(access.products).toContain('quarter_jr');
        const qjr = DEFAULT_PRODUCTS.find(p => p.id === 'quarter_jr');
        expect(qjr?.features).toContain(g.feature);
      });
    });
  }
});

// =========================================================================
// View As: switching to free flips ALL gates
// =========================================================================
describe('View As override flips ALL sim gates', () => {
  const freeOverride: DevViewAsOverride = {
    enabled: true, planId: 'free', roleId: 'member', fullAccess: false,
  };
  const basicOverride: DevViewAsOverride = {
    enabled: true, planId: 'basic', roleId: 'member', fullAccess: false,
  };

  for (const g of GATES) {
    describe(g.name, () => {
      it('free override: capability blocked', () => {
        const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
        expect(hasCap(ctx, g.cap)).toBe(false);
      });

      it('basic override: capability allowed', () => {
        const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
        expect(hasCap(ctx, g.cap)).toBe(true);
      });

      it(`free override: subscription ${g.subKey}=false`, () => {
        const tier = getViewAsSubscriptionTier(freeOverride);
        expect(TIER_FEATURES[tier][g.subKey]).toBe(false);
      });

      it(`basic override: subscription ${g.subKey}=true`, () => {
        const tier = getViewAsSubscriptionTier(basicOverride);
        expect(TIER_FEATURES[tier][g.subKey]).toBe(true);
      });

      it('free override: no products', () => {
        const access = getViewAsLegacyAccess(freeOverride);
        expect(access.products).toEqual([]);
      });

      it('basic override: has quarter_jr', () => {
        const access = getViewAsLegacyAccess(basicOverride);
        expect(access.products).toContain('quarter_jr');
      });
    });
  }
});

// =========================================================================
// Subscription tier feature flags: all gates per tier
// =========================================================================
describe('subscription tier feature flags for all sim gates', () => {
  const tiersWithAccess: SubscriptionTier[] = ['racer', 'pro', 'team', 'beta', 'owner'];
  const tiersWithout: SubscriptionTier[] = ['free'];

  for (const g of GATES) {
    describe(g.name, () => {
      for (const tier of tiersWithAccess) {
        it(`${tier} tier has ${g.subKey}=true`, () => {
          expect(TIER_FEATURES[tier][g.subKey]).toBe(true);
        });
      }
      for (const tier of tiersWithout) {
        it(`${tier} tier has ${g.subKey}=false`, () => {
          expect(TIER_FEATURES[tier][g.subKey]).toBe(false);
        });
      }
    });
  }
});

// =========================================================================
// Free users still have basicSim (calculators remain accessible)
// =========================================================================
describe('Free users retain basic calculator access', () => {
  it('free tier has basicSim=true', () => {
    expect(TIER_FEATURES.free.basicSim).toBe(true);
  });

  it('free plan has sim.basic capability', () => {
    expect(PLAN_CAPABILITIES.free.has('sim.basic')).toBe(true);
  });
});
