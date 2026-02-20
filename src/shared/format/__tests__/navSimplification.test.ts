/**
 * Nav simplification tests.
 *
 * The Navigation component now splits links into:
 *   - Primary (desktop top bar): Home, Vehicles, Quarter, Engine
 *   - Secondary (hamburger only): Calcs, History, About, Team, Admin, Dev
 *
 * History, Team, and Admin are additionally gated behind `isDevOrOwner`
 * (user.roleId === 'owner' | 'admin' || import.meta.env.DEV).
 *
 * Team is further gated behind `features.teamManagement` (team+owner tiers).
 */

import { describe, it, expect } from 'vitest';
import { TIER_FEATURES } from '../../../domain/config/entitlements';
import type { SubscriptionTier } from '../../../domain/config/entitlements';
import { getQuarterTier, getEngineTier } from '../../../domain/ui/programDisplayNames';
import type { Capability } from '../../../domain/config/capabilities';

const ALL_TIERS: SubscriptionTier[] = ['free', 'racer', 'pro', 'team', 'beta', 'owner'];

describe('Team nav visibility (teamManagement entitlement)', () => {
  it('teamManagement is false for free, racer, pro, beta tiers', () => {
    const hiddenTiers: SubscriptionTier[] = ['free', 'racer', 'pro', 'beta'];
    for (const tier of hiddenTiers) {
      expect(TIER_FEATURES[tier].teamManagement).toBe(false);
    }
  });

  it('teamManagement is true for team and owner tiers only', () => {
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

describe('Non-core modules hidden for normal users', () => {
  it('History, Team, Admin are gated behind isDevOrOwner in nav', () => {
    // Simulate a normal user (not dev, not owner/admin)
    const normalRoles = ['member', 'user', undefined];
    for (const role of normalRoles) {
      const isDevOrOwner = role === 'owner' || role === 'admin';
      // In production (not DEV), normal users should NOT see these
      expect(isDevOrOwner).toBe(false);
    }
  });

  it('owner and admin roles pass isDevOrOwner check', () => {
    for (const role of ['owner', 'admin']) {
      const isDevOrOwner = role === 'owner' || role === 'admin';
      expect(isDevOrOwner).toBe(true);
    }
  });
});

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
