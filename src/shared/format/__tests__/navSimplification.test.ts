/**
 * Public surface gating tests.
 *
 * Verifies that:
 * 1. Non-internal users cannot see Team/History/RaceDay/Admin/Dev modules
 * 2. Internal users (owner/admin/dev) CAN see all modules
 * 3. All internal routes are properly catalogued
 * 4. teamManagement entitlement is correctly mapped
 * 5. Tier pill helpers work correctly
 *
 * Uses the centralized publicSurface.ts as the single source of truth.
 */

import { describe, it, expect } from 'vitest';
import { TIER_FEATURES } from '../../../domain/config/entitlements';
import type { SubscriptionTier } from '../../../domain/config/entitlements';
import { getQuarterTier, getEngineTier } from '../../../domain/ui/programDisplayNames';
import type { Capability } from '../../../domain/config/capabilities';
import {
  isInternalUser,
  shouldShowModule,
  isInternalRoute,
  INTERNAL_MODULES,
  INTERNAL_ROUTES,
  PUBLIC_CORE_ROUTES,
  type VisibilityContext,
} from '../../../domain/ui/publicSurface';

const ALL_TIERS: SubscriptionTier[] = ['free', 'racer', 'pro', 'team', 'beta', 'owner'];

// ── publicSurface: isInternalUser ───────────────────────────────────

describe('isInternalUser (centralized)', () => {
  it('normal paid users are NOT internal in production', () => {
    const normalRoles = [undefined, 'member', 'user', 'pro', 'team', 'basic', 'racer'];
    for (const roleId of normalRoles) {
      expect(isInternalUser({ roleId, isDev: false })).toBe(false);
    }
  });

  it('owner is internal', () => {
    expect(isInternalUser({ roleId: 'owner', isDev: false })).toBe(true);
  });

  it('admin is internal', () => {
    expect(isInternalUser({ roleId: 'admin', isDev: false })).toBe(true);
  });

  it('DEV mode makes anyone internal', () => {
    expect(isInternalUser({ roleId: undefined, isDev: true })).toBe(true);
    expect(isInternalUser({ roleId: 'member', isDev: true })).toBe(true);
  });
});

// ── publicSurface: shouldShowModule ─────────────────────────────────

describe('shouldShowModule', () => {
  const publicUser: VisibilityContext = { roleId: 'member', isDev: false };
  const internalUser: VisibilityContext = { roleId: 'owner', isDev: false };

  it('hides ALL internal modules from public users', () => {
    for (const mod of INTERNAL_MODULES) {
      expect(shouldShowModule(mod, publicUser)).toBe(false);
    }
  });

  it('shows ALL internal modules to internal users', () => {
    for (const mod of INTERNAL_MODULES) {
      expect(shouldShowModule(mod, internalUser)).toBe(true);
    }
  });

  it('specifically hides team, history, raceDay, admin, dev', () => {
    const critical = ['team', 'history', 'raceDay', 'admin', 'dev'] as const;
    for (const mod of critical) {
      expect(shouldShowModule(mod, publicUser)).toBe(false);
    }
  });
});

// ── publicSurface: isInternalRoute ──────────────────────────────────

describe('isInternalRoute', () => {
  it('flags all internal route paths', () => {
    const paths = Object.keys(INTERNAL_ROUTES);
    expect(paths.length).toBeGreaterThanOrEqual(14);
    for (const path of paths) {
      expect(isInternalRoute(path)).toBe(true);
    }
  });

  it('does NOT flag public routes', () => {
    const publicPaths = [
      '/', '/about', '/et-sim', '/engine-sim', '/vehicles',
      '/calculators', '/calcs', '/login', '/pricing', '/register',
      '/account', '/predict', '/clutch-sim', '/converter-sim',
      '/engine-sim-legacy', '/engine-pro', '/suspension-sim',
    ];
    for (const path of publicPaths) {
      expect(isInternalRoute(path)).toBe(false);
    }
  });

  it('covers /team and all team sub-routes', () => {
    for (const path of ['/team', '/parts', '/events', '/maintenance', '/expenses']) {
      expect(isInternalRoute(path)).toBe(true);
      expect(INTERNAL_ROUTES[path]).toBe('team');
    }
  });

  it('covers /history, /log, /race-day, /admin, /dev', () => {
    expect(INTERNAL_ROUTES['/history']).toBe('history');
    expect(INTERNAL_ROUTES['/log']).toBe('log');
    expect(INTERNAL_ROUTES['/race-day']).toBe('raceDay');
    expect(INTERNAL_ROUTES['/admin']).toBe('admin');
    expect(INTERNAL_ROUTES['/dev']).toBe('dev');
  });

  it('covers /dial-in, /opponents, /import, /tech-card, /ladder', () => {
    expect(INTERNAL_ROUTES['/dial-in']).toBe('dialIn');
    expect(INTERNAL_ROUTES['/opponents']).toBe('opponents');
    expect(INTERNAL_ROUTES['/import']).toBe('import');
    expect(INTERNAL_ROUTES['/tech-card']).toBe('techCard');
    expect(INTERNAL_ROUTES['/ladder']).toBe('ladder');
  });
});

// ── teamManagement entitlement ──────────────────────────────────────

describe('teamManagement entitlement', () => {
  it('is false for free, racer, pro, beta tiers', () => {
    const hiddenTiers: SubscriptionTier[] = ['free', 'racer', 'pro', 'beta'];
    for (const tier of hiddenTiers) {
      expect(TIER_FEATURES[tier].teamManagement).toBe(false);
    }
  });

  it('is true for team and owner tiers only', () => {
    const visibleTiers: SubscriptionTier[] = ['team', 'owner'];
    for (const tier of visibleTiers) {
      expect(TIER_FEATURES[tier].teamManagement).toBe(true);
    }
  });

  it('only team and owner have teamManagement', () => {
    const tiersWithTeam = ALL_TIERS.filter(t => TIER_FEATURES[t].teamManagement);
    expect(tiersWithTeam).toEqual(['team', 'owner']);
  });
});

// ── Nav tier pill helpers ───────────────────────────────────────────

describe('Nav tier pill helpers', () => {
  const canWith = (...caps: string[]) => {
    const set = new Set(caps);
    return (cap: Capability) => set.has(cap);
  };

  it('getQuarterTier returns "Jr" without sim.advanced', () => {
    expect(getQuarterTier(canWith())).toBe('Jr');
    expect(getQuarterTier(canWith('engine.proMode'))).toBe('Jr');
  });

  it('getQuarterTier returns "Pro" with sim.advanced', () => {
    expect(getQuarterTier(canWith('sim.advanced'))).toBe('Pro');
  });

  it('getEngineTier returns "Jr" without engine.proMode', () => {
    expect(getEngineTier(canWith())).toBe('Jr');
    expect(getEngineTier(canWith('sim.advanced'))).toBe('Jr');
  });

  it('getEngineTier returns "Pro" with engine.proMode', () => {
    expect(getEngineTier(canWith('engine.proMode'))).toBe('Pro');
  });
});

// ── Route guard integration (logic-level) ───────────────────────────

describe('Route guard integration (logic-level)', () => {
  it('non-internal user hitting an internal route should be blocked', () => {
    const publicUser: VisibilityContext = { roleId: 'racer', isDev: false };
    expect(isInternalUser(publicUser)).toBe(false);
    expect(Object.keys(INTERNAL_ROUTES).length).toBeGreaterThanOrEqual(14);
  });

  it('internal user hitting an internal route should pass through', () => {
    const ownerUser: VisibilityContext = { roleId: 'owner', isDev: false };
    const adminUser: VisibilityContext = { roleId: 'admin', isDev: false };
    const devUser: VisibilityContext = { roleId: 'member', isDev: true };
    for (const ctx of [ownerUser, adminUser, devUser]) {
      expect(isInternalUser(ctx)).toBe(true);
    }
  });

  it('every INTERNAL_MODULE has at least one corresponding route', () => {
    const routeModules = new Set(Object.values(INTERNAL_ROUTES));
    for (const mod of INTERNAL_MODULES) {
      expect(routeModules.has(mod)).toBe(true);
    }
  });

  it('all expected internal paths are catalogued', () => {
    const expectedPaths = [
      '/history', '/log', '/team', '/parts', '/events',
      '/maintenance', '/expenses', '/race-day', '/dial-in',
      '/opponents', '/import', '/tech-card', '/ladder',
      '/admin', '/dev',
    ];
    for (const path of expectedPaths) {
      expect(isInternalRoute(path)).toBe(true);
    }
  });
});

// ── Keyboard shortcut gating ────────────────────────────────────────

describe('Keyboard shortcut gating (logic-level)', () => {
  // The useNavigationShortcuts hook gates /log, /dial-in, /race-day
  // behind isInternalUser. These tests verify the gating logic.
  const internalShortcutPaths = ['/log', '/dial-in', '/race-day'];
  const publicShortcutPaths = ['/', '/predict', '/vehicles', '/calculators'];

  it('internal shortcut paths are all internal routes', () => {
    for (const path of internalShortcutPaths) {
      expect(isInternalRoute(path)).toBe(true);
    }
  });

  it('public shortcut paths are NOT internal routes', () => {
    for (const path of publicShortcutPaths) {
      expect(isInternalRoute(path)).toBe(false);
    }
  });

  it('non-internal user should not have access to internal shortcuts', () => {
    const publicUser: VisibilityContext = { roleId: 'pro', isDev: false };
    expect(isInternalUser(publicUser)).toBe(false);
  });

  it('internal user should have access to all shortcuts', () => {
    const internalUser: VisibilityContext = { roleId: 'owner', isDev: false };
    expect(isInternalUser(internalUser)).toBe(true);
  });
});

// ── Coming Soon page links ──────────────────────────────────────────

describe('Coming Soon page links (logic-level)', () => {
  it('core module paths are all public (not internal)', () => {
    for (const path of PUBLIC_CORE_ROUTES) {
      expect(isInternalRoute(path)).toBe(false);
    }
  });

  it('core route list does not include any internal paths', () => {
    for (const path of PUBLIC_CORE_ROUTES) {
      expect(Object.keys(INTERNAL_ROUTES)).not.toContain(path);
    }
  });
});
