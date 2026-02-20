/**
 * Nav simplification tests — verify Team is hidden for non-team tiers.
 *
 * The Navigation component gates Team behind `features.teamManagement`.
 * This test verifies the entitlement mapping: only 'team' and 'owner' tiers
 * have teamManagement=true.
 */

import { describe, it, expect } from 'vitest';
import { TIER_FEATURES } from '../../../domain/config/entitlements';
import type { SubscriptionTier } from '../../../domain/config/entitlements';

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
