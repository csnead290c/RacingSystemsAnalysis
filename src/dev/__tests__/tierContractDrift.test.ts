/**
 * Tier Contract Drift Prevention
 *
 * Ensures the three parallel access-control systems stay in sync:
 *   1. Legacy features/products  (src/domain/auth/types.ts)
 *   2. Capabilities              (src/domain/config/capabilities.ts)
 *   3. Subscription entitlements  (src/domain/config/entitlements.ts)
 *
 * Defines a canonical set of "must-match" gates and asserts each gate
 * is wired correctly across all three systems. Also validates that
 * View As free/basic overrides produce the expected BLOCK/ALLOW results.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ALL_FEATURES, DEFAULT_PRODUCTS } from '../../domain/auth/types';
import {
  hasCap,
  PLAN_CAPABILITIES,
  CAPABILITY_KEYS,
  type UserCapabilityContext,
} from '../../domain/config/capabilities';
import {
  TIER_FEATURES,
  type SubscriptionTier,
  type TierFeatures,
} from '../../domain/config/entitlements';
import {
  getViewAsLegacyAccess,
  getViewAsSubscriptionTier,
  type DevViewAsOverride,
} from '../../domain/config/devViewAs';

// ── Canonical gate mapping ───────────────────────────────────────────

interface GateContract {
  name: string;
  /** Legacy feature flag string (in ALL_FEATURES / product.features). */
  legacyFeature: string;
  /** Capability key (dot-namespaced). */
  capability: typeof CAPABILITY_KEYS[number];
  /** Subscription entitlement key on TierFeatures. */
  entitlementKey: keyof TierFeatures;
  /** Products that MUST include this legacy feature. */
  requiredProducts: string[];
  /** Tiers where entitlement must be TRUE. */
  allowedTiers: SubscriptionTier[];
  /** Tiers where entitlement must be FALSE. */
  blockedTiers: SubscriptionTier[];
  /** Plans where capability must be present. */
  allowedPlans: ('basic' | 'pro' | 'team')[];
}

const GATES: GateContract[] = [
  {
    name: 'ET Sim',
    legacyFeature: 'et_sim',
    capability: 'sim.et',
    entitlementKey: 'etSim',
    requiredProducts: ['quarter_jr', 'quarter_pro'],
    allowedTiers: ['racer', 'pro', 'team', 'beta', 'owner'],
    blockedTiers: ['free'],
    allowedPlans: ['basic', 'pro', 'team'],
  },
  {
    name: 'Race Tools',
    legacyFeature: 'race_tools',
    capability: 'sim.raceTools',
    entitlementKey: 'raceTools',
    requiredProducts: ['quarter_jr', 'quarter_pro'],
    allowedTiers: ['racer', 'pro', 'team', 'beta', 'owner'],
    blockedTiers: ['free'],
    allowedPlans: ['basic', 'pro', 'team'],
  },
  {
    name: 'Run Logging',
    legacyFeature: 'run_logging',
    capability: 'data.runLog',
    entitlementKey: 'runLogging',
    requiredProducts: ['quarter_jr', 'quarter_pro'],
    allowedTiers: ['racer', 'pro', 'team', 'beta', 'owner'],
    blockedTiers: ['free'],
    allowedPlans: ['basic', 'pro', 'team'],
  },
  {
    name: 'Vehicles',
    legacyFeature: 'save_vehicles',
    capability: 'data.vehicles',
    entitlementKey: 'saveVehicles',
    requiredProducts: ['quarter_jr', 'quarter_pro'],
    allowedTiers: ['racer', 'pro', 'team', 'beta', 'owner'],
    blockedTiers: ['free'],
    allowedPlans: ['basic', 'pro', 'team'],
  },
];

// =====================================================================
// Per-gate assertions across all three systems
// =====================================================================

describe('Tier contract drift prevention', () => {
  for (const g of GATES) {
    describe(`${g.name} (${g.legacyFeature} <-> ${g.capability} <-> ${g.entitlementKey})`, () => {

      // ── Legacy ──────────────────────────────────────────────────
      it(`legacy: "${g.legacyFeature}" exists in ALL_FEATURES`, () => {
        expect(
          (ALL_FEATURES as readonly string[]).includes(g.legacyFeature),
          `"${g.legacyFeature}" missing from ALL_FEATURES in auth/types.ts`,
        ).toBe(true);
      });

      for (const prodId of g.requiredProducts) {
        it(`legacy: product "${prodId}" includes "${g.legacyFeature}"`, () => {
          const prod = DEFAULT_PRODUCTS.find((p) => p.id === prodId);
          expect(prod, `Product "${prodId}" not found in DEFAULT_PRODUCTS`).toBeDefined();
          expect(
            prod!.features.includes(g.legacyFeature),
            `Product "${prodId}" is missing feature "${g.legacyFeature}"`,
          ).toBe(true);
        });
      }

      // ── Capabilities ────────────────────────────────────────────
      it(`capability: "${g.capability}" exists in CAPABILITY_KEYS`, () => {
        expect(
          (CAPABILITY_KEYS as readonly string[]).includes(g.capability),
          `"${g.capability}" missing from CAPABILITY_KEYS in capabilities.ts`,
        ).toBe(true);
      });

      it('capability: free plan does NOT have it', () => {
        expect(
          PLAN_CAPABILITIES.free.has(g.capability),
          `Free plan should NOT have "${g.capability}"`,
        ).toBe(false);
      });

      for (const plan of g.allowedPlans) {
        it(`capability: ${plan} plan has "${g.capability}"`, () => {
          expect(
            PLAN_CAPABILITIES[plan].has(g.capability),
            `${plan} plan missing "${g.capability}"`,
          ).toBe(true);
        });
      }

      // ── Entitlements ────────────────────────────────────────────
      for (const tier of g.blockedTiers) {
        it(`entitlement: ${tier} tier has ${g.entitlementKey}=false`, () => {
          expect(
            TIER_FEATURES[tier][g.entitlementKey],
            `${tier} tier should have ${g.entitlementKey}=false`,
          ).toBe(false);
        });
      }

      for (const tier of g.allowedTiers) {
        it(`entitlement: ${tier} tier has ${g.entitlementKey}=true`, () => {
          expect(
            TIER_FEATURES[tier][g.entitlementKey],
            `${tier} tier should have ${g.entitlementKey}=true`,
          ).toBe(true);
        });
      }
    });
  }
});

// =====================================================================
// View As: free viewer → all 4 BLOCKED, basic member → all 4 ALLOWED
// =====================================================================

describe('View As gating health', () => {
  const freeViewer: DevViewAsOverride = {
    enabled: true,
    planId: 'free',
    roleId: 'viewer',
    fullAccess: false,
  };
  const basicMember: DevViewAsOverride = {
    enabled: true,
    planId: 'basic',
    roleId: 'member',
    fullAccess: false,
  };

  for (const g of GATES) {
    describe(`${g.name}`, () => {
      // ── Free viewer: BLOCKED ──────────────────────────────────
      it('free viewer: legacy has no products → feature absent', () => {
        const access = getViewAsLegacyAccess(freeViewer);
        expect(access.products).toEqual([]);
      });

      it(`free viewer: capability "${g.capability}" blocked`, () => {
        const ctx: UserCapabilityContext = { plan: 'free', role: 'viewer' };
        expect(hasCap(ctx, g.capability)).toBe(false);
      });

      it(`free viewer: entitlement ${g.entitlementKey}=false`, () => {
        const tier = getViewAsSubscriptionTier(freeViewer);
        expect(TIER_FEATURES[tier][g.entitlementKey]).toBe(false);
      });

      // ── Basic member: ALLOWED ─────────────────────────────────
      it('basic member: legacy has quarter_jr product', () => {
        const access = getViewAsLegacyAccess(basicMember);
        expect(access.products).toContain('quarter_jr');
        const qjr = DEFAULT_PRODUCTS.find((p) => p.id === 'quarter_jr');
        expect(qjr!.features).toContain(g.legacyFeature);
      });

      it(`basic member: capability "${g.capability}" allowed`, () => {
        const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
        expect(hasCap(ctx, g.capability)).toBe(true);
      });

      it(`basic member: entitlement ${g.entitlementKey}=true`, () => {
        const tier = getViewAsSubscriptionTier(basicMember);
        expect(TIER_FEATURES[tier][g.entitlementKey]).toBe(true);
      });
    });
  }
});

// =====================================================================
// Library contract: save=basic+ plans, install=pro/team only
// =====================================================================

const LIBRARY_SAVE_CAPS = [
  'library.save.engine',
  'library.save.clutch',
  'library.save.fourLink',
] as const;

const LIBRARY_INSTALL_CAPS = [
  'library.install.engine',
  'library.install.clutch',
  'library.install.fourLink',
] as const;

describe('Library contract', () => {
  describe('library.save.* — basic/pro/team only, NOT free', () => {
    for (const cap of LIBRARY_SAVE_CAPS) {
      it(`capability "${cap}" exists in CAPABILITY_KEYS`, () => {
        expect(
          (CAPABILITY_KEYS as readonly string[]).includes(cap),
          `"${cap}" missing from CAPABILITY_KEYS`,
        ).toBe(true);
      });

      it(`free plan does NOT have "${cap}"`, () => {
        expect(
          PLAN_CAPABILITIES.free.has(cap),
          `Free plan should NOT have "${cap}" — library save requires basic+`,
        ).toBe(false);
      });

      for (const plan of ['basic', 'pro', 'team'] as const) {
        it(`${plan} plan has "${cap}"`, () => {
          expect(
            PLAN_CAPABILITIES[plan].has(cap),
            `${plan} plan missing "${cap}" — basic+ plans should have library save`,
          ).toBe(true);
        });
      }
    }

    it('entitlements: no explicit library save keys exist (capabilities-only — expected)', () => {
      const tierKeys = Object.keys(TIER_FEATURES.free) as (keyof TierFeatures)[];
      const librarySaveKeys = tierKeys.filter((k) => /librar.*save/i.test(k));
      expect(
        librarySaveKeys,
        'Library save is capabilities-only. If entitlement keys are added, update this test.',
      ).toEqual([]);
    });

    it('legacy: no dedicated library save feature flags exist (capabilities-only — expected)', () => {
      const legacyLibSave = (ALL_FEATURES as readonly string[]).filter((f) =>
        /library.*save/i.test(f),
      );
      expect(
        legacyLibSave,
        'Library save is capabilities-only. If legacy features are added, update this test.',
      ).toEqual([]);
    });
  });

  describe('library.install.* — pro/team only, NOT free/basic', () => {
    for (const cap of LIBRARY_INSTALL_CAPS) {
      it(`capability "${cap}" exists in CAPABILITY_KEYS`, () => {
        expect(
          (CAPABILITY_KEYS as readonly string[]).includes(cap),
          `"${cap}" missing from CAPABILITY_KEYS`,
        ).toBe(true);
      });

      it(`free plan does NOT have "${cap}"`, () => {
        expect(
          PLAN_CAPABILITIES.free.has(cap),
          `Free plan should NOT have "${cap}"`,
        ).toBe(false);
      });

      it(`basic plan does NOT have "${cap}"`, () => {
        expect(
          PLAN_CAPABILITIES.basic.has(cap),
          `Basic plan should NOT have "${cap}" — install is pro+ only`,
        ).toBe(false);
      });

      for (const plan of ['pro', 'team'] as const) {
        it(`${plan} plan has "${cap}"`, () => {
          expect(
            PLAN_CAPABILITIES[plan].has(cap),
            `${plan} plan missing "${cap}"`,
          ).toBe(true);
        });
      }
    }

    it('entitlements: no explicit library install keys exist (capabilities-only — expected)', () => {
      const tierKeys = Object.keys(TIER_FEATURES.free) as (keyof TierFeatures)[];
      const libraryInstallKeys = tierKeys.filter((k) => /librar.*install/i.test(k));
      expect(
        libraryInstallKeys,
        'Library install is capabilities-only. If entitlement keys are added, update this test.',
      ).toEqual([]);
    });
  });

  describe('View As: library capabilities', () => {
    it('free viewer cannot save or install', () => {
      const ctx: UserCapabilityContext = { plan: 'free', role: 'viewer' };
      for (const cap of LIBRARY_SAVE_CAPS) {
        expect(hasCap(ctx, cap), `free should NOT have ${cap}`).toBe(false);
      }
      for (const cap of LIBRARY_INSTALL_CAPS) {
        expect(hasCap(ctx, cap), `free should NOT have ${cap}`).toBe(false);
      }
    });

    it('basic member can save but not install', () => {
      const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
      for (const cap of LIBRARY_SAVE_CAPS) {
        expect(hasCap(ctx, cap), `basic should have ${cap}`).toBe(true);
      }
      for (const cap of LIBRARY_INSTALL_CAPS) {
        expect(hasCap(ctx, cap), `basic should NOT have ${cap}`).toBe(false);
      }
    });

    it('pro member can save AND install', () => {
      const ctx: UserCapabilityContext = { plan: 'pro', role: 'member' };
      for (const cap of LIBRARY_SAVE_CAPS) {
        expect(hasCap(ctx, cap), `pro should have ${cap}`).toBe(true);
      }
      for (const cap of LIBRARY_INSTALL_CAPS) {
        expect(hasCap(ctx, cap), `pro should have ${cap}`).toBe(true);
      }
    });
  });
});

// =====================================================================
// Free tier contract: minimal demo access only
// =====================================================================

describe('Free tier contract', () => {
  const FREE_ALLOWED: readonly string[] = [
    'vehicle.editor.basic',
    'track.eighth',
    'track.quarter',
    'weather.manual',
    'sim.basic',
    'charts.basic',
  ];

  const FREE_DENIED: readonly string[] = [
    'library.save.engine',
    'library.save.clutch',
    'library.save.fourLink',
    'library.install.engine',
    'library.install.clutch',
    'library.install.fourLink',
    'sim.et',
    'sim.raceTools',
    'sim.advanced',
    'sim.runCompletion',
    'sim.learning',
    'engine.proMode',
    'data.vehicles',
    'data.runLog',
    'data.export',
    'data.import',
    'charts.advanced',
    'vehicle.editor.pro',
    'vehicle.throttleStop',
    'optimizer.gear',
    'optimizer.launch',
    'optimizer.throttleStop',
    'weather.live',
    'weather.history',
    'track.thousand',
    'track.bonneville',
    'track.custom',
    'team.enabled',
    'team.library.share',
    'team.vehicles.share',
    'team.runs.share',
    'admin.access',
    'admin.devTools',
    'admin.userManagement',
  ];

  it('free plan has exactly the expected capabilities', () => {
    const actual = [...PLAN_CAPABILITIES.free].sort();
    expect(actual).toEqual([...FREE_ALLOWED].sort());
  });

  for (const cap of FREE_DENIED) {
    it(`free plan does NOT have "${cap}"`, () => {
      expect(
        PLAN_CAPABILITIES.free.has(cap as any),
        `Free plan should NOT have "${cap}"`,
      ).toBe(false);
    });
  }

  it('free plan size matches expected count', () => {
    expect(PLAN_CAPABILITIES.free.size).toBe(FREE_ALLOWED.length);
  });
});

// =====================================================================
// Engine Sim contract: login-only route + centralized pro mode capability
// =====================================================================

const APP_PATH = resolve(__dirname, '../../app/App.tsx');
const APP_SRC = readFileSync(APP_PATH, 'utf-8');
// DASH_SRC removed — EngineSimDashboard capability wiring deferred to engine sim RC

describe('Engine Sim contract', () => {
  describe('route is login-only (no feature gate)', () => {
    it('/engine-sim uses <ProtectedRoute> with NO requireFeature', () => {
      const routeRe = /<Route\s+path="\/engine-sim"\s+element=\{[\s\S]*?\}\s*\/>/;
      const match = APP_SRC.match(routeRe);
      expect(match, '/engine-sim route not found in App.tsx').toBeTruthy();

      const block = match![0];
      expect(block).toContain('<ProtectedRoute>');
      expect(block).not.toContain('requireFeature');
      expect(block).not.toContain('requireProduct');
      expect(block).not.toContain('requireRole');
    });
  });

  describe('engine.proMode capability contract', () => {
    it('"engine.proMode" exists in CAPABILITY_KEYS', () => {
      expect(
        (CAPABILITY_KEYS as readonly string[]).includes('engine.proMode'),
        '"engine.proMode" missing from CAPABILITY_KEYS',
      ).toBe(true);
    });

    it('free plan does NOT have engine.proMode', () => {
      expect(PLAN_CAPABILITIES.free.has('engine.proMode')).toBe(false);
    });

    it('basic plan does NOT have engine.proMode', () => {
      expect(PLAN_CAPABILITIES.basic.has('engine.proMode')).toBe(false);
    });

    for (const plan of ['pro', 'team'] as const) {
      it(`${plan} plan has engine.proMode`, () => {
        expect(
          PLAN_CAPABILITIES[plan].has('engine.proMode'),
          `${plan} plan missing "engine.proMode"`,
        ).toBe(true);
      });
    }

    it('free viewer: engine.proMode blocked', () => {
      const ctx: UserCapabilityContext = { plan: 'free', role: 'viewer' };
      expect(hasCap(ctx, 'engine.proMode')).toBe(false);
    });

    it('basic member: engine.proMode blocked', () => {
      const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
      expect(hasCap(ctx, 'engine.proMode')).toBe(false);
    });

    it('pro member: engine.proMode allowed', () => {
      const ctx: UserCapabilityContext = { plan: 'pro', role: 'member' };
      expect(hasCap(ctx, 'engine.proMode')).toBe(true);
    });
  });

  // NOTE: EngineSimDashboard capability wiring tests deferred to engine sim RC.
  // The engine.proMode capability key and plan assignments are tested above.

  describe('no dedicated entitlement key for engine sim (capabilities-only — expected)', () => {
    it('no engineSim key in TierFeatures', () => {
      const tierKeys = Object.keys(TIER_FEATURES.free) as (keyof TierFeatures)[];
      const engineKeys = tierKeys.filter((k) => /engine.*sim/i.test(k));
      expect(
        engineKeys,
        'Engine sim access is capabilities-only, not entitlement-keyed. ' +
        'If an entitlement key is added, update this test.',
      ).toEqual([]);
    });
  });
});
