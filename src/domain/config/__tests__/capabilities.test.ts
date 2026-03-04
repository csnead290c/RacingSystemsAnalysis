/**
 * Tests for the capabilities model:
 * - Plan → capability mapping (namespaced keys)
 * - hasCap behavior (including alias support)
 * - Trial overlay behavior
 * - Install gating fallback on downgrade
 * - Migration helpers
 * - Scoped language guard
 */

import { describe, it, expect } from 'vitest';
import {
  hasCap,
  getEffectiveCapabilities,
  isInstallCapability,
  resolveCapKey,
  planFromLegacyTier,
  trialFromLegacyTier,
  roleFromLegacyId,
  isFullAccessRole,
  PLAN_CAPABILITIES,
  ROLE_CAPABILITIES,
  CAPABILITY_KEYS,
  CAPABILITY_ALIASES,
  PLANS,
  ROLES,
  PLAN_IDS,
  ROLE_IDS,
  NO_TRIAL,
  type UserCapabilityContext,
} from '../capabilities';

// =========================================================================
// Plan → Capability mapping (namespaced keys)
// =========================================================================
describe('PLAN_CAPABILITIES mapping', () => {
  it('every plan ID has a capability set', () => {
    for (const pid of PLAN_IDS) {
      expect(PLAN_CAPABILITIES[pid]).toBeDefined();
      expect(PLAN_CAPABILITIES[pid]).toBeInstanceOf(Set);
    }
  });

  it('trial is NOT a plan ID', () => {
    expect((PLAN_IDS as readonly string[]).includes('trial')).toBe(false);
  });

  it('free plan has NEITHER library.save NOR library.install capabilities', () => {
    const free = PLAN_CAPABILITIES.free;
    expect(free.has('library.save.engine')).toBe(false);
    expect(free.has('library.save.clutch')).toBe(false);
    expect(free.has('library.save.fourLink')).toBe(false);
    expect(free.has('library.install.engine')).toBe(false);
    expect(free.has('library.install.clutch')).toBe(false);
    expect(free.has('library.install.fourLink')).toBe(false);
  });

  it('basic plan has library.save but NOT library.install capabilities', () => {
    const basic = PLAN_CAPABILITIES.basic;
    expect(basic.has('library.save.engine')).toBe(true);
    expect(basic.has('library.install.engine')).toBe(false);
    expect(basic.has('library.install.clutch')).toBe(false);
    expect(basic.has('library.install.fourLink')).toBe(false);
  });

  it('pro plan has both library.save AND library.install capabilities', () => {
    const pro = PLAN_CAPABILITIES.pro;
    expect(pro.has('library.save.engine')).toBe(true);
    expect(pro.has('library.save.clutch')).toBe(true);
    expect(pro.has('library.save.fourLink')).toBe(true);
    expect(pro.has('library.install.engine')).toBe(true);
    expect(pro.has('library.install.clutch')).toBe(true);
    expect(pro.has('library.install.fourLink')).toBe(true);
  });

  it('team plan has everything pro has plus team features', () => {
    const pro = PLAN_CAPABILITIES.pro;
    const team = PLAN_CAPABILITIES.team;
    for (const cap of pro) {
      expect(team.has(cap)).toBe(true);
    }
    expect(team.has('team.enabled')).toBe(true);
    expect(team.has('team.vehicles.share')).toBe(true);
    expect(team.has('team.runs.share')).toBe(true);
    expect(pro.has('team.enabled')).toBe(false);
  });

  it('no plan grants admin.devTools or admin.userManagement', () => {
    for (const pid of PLAN_IDS) {
      expect(PLAN_CAPABILITIES[pid].has('admin.devTools')).toBe(false);
      expect(PLAN_CAPABILITIES[pid].has('admin.userManagement')).toBe(false);
    }
  });

  it('all capability values in sets are valid CAPABILITY_KEYS', () => {
    const validKeys = new Set<string>(CAPABILITY_KEYS);
    for (const pid of PLAN_IDS) {
      for (const cap of PLAN_CAPABILITIES[pid]) {
        expect(validKeys.has(cap)).toBe(true);
      }
    }
  });
});

// =========================================================================
// Role → Capability mapping
// =========================================================================
describe('ROLE_CAPABILITIES mapping', () => {
  it('owner role grants admin.devTools and admin.userManagement', () => {
    expect(ROLE_CAPABILITIES.owner.has('admin.devTools')).toBe(true);
    expect(ROLE_CAPABILITIES.owner.has('admin.userManagement')).toBe(true);
  });

  it('admin role grants admin.devTools and admin.userManagement', () => {
    expect(ROLE_CAPABILITIES.admin.has('admin.devTools')).toBe(true);
    expect(ROLE_CAPABILITIES.admin.has('admin.userManagement')).toBe(true);
  });

  it('member role grants no extra capabilities', () => {
    expect(ROLE_CAPABILITIES.member.size).toBe(0);
  });

  it('viewer role grants no extra capabilities', () => {
    expect(ROLE_CAPABILITIES.viewer.size).toBe(0);
  });

  it('owner role grants all incident capabilities', () => {
    expect(ROLE_CAPABILITIES.owner.has('incidents.read')).toBe(true);
    expect(ROLE_CAPABILITIES.owner.has('incidents.create')).toBe(true);
    expect(ROLE_CAPABILITIES.owner.has('incidents.edit.own')).toBe(true);
    expect(ROLE_CAPABILITIES.owner.has('incidents.edit.all')).toBe(true);
  });

  it('admin role grants all incident capabilities', () => {
    expect(ROLE_CAPABILITIES.admin.has('incidents.read')).toBe(true);
    expect(ROLE_CAPABILITIES.admin.has('incidents.create')).toBe(true);
    expect(ROLE_CAPABILITIES.admin.has('incidents.edit.own')).toBe(true);
    expect(ROLE_CAPABILITIES.admin.has('incidents.edit.all')).toBe(true);
  });

  it('member role does NOT grant incident capabilities', () => {
    expect(ROLE_CAPABILITIES.member.has('incidents.read')).toBe(false);
    expect(ROLE_CAPABILITIES.member.has('incidents.edit.all')).toBe(false);
  });
});

// =========================================================================
// Incident capabilities in PLAN_CAPABILITIES
// =========================================================================
describe('incident capabilities in PLAN_CAPABILITIES', () => {
  it('nhra plan grants incidents.read, incidents.create, incidents.edit.own', () => {
    expect(PLAN_CAPABILITIES.nhra.has('incidents.read')).toBe(true);
    expect(PLAN_CAPABILITIES.nhra.has('incidents.create')).toBe(true);
    expect(PLAN_CAPABILITIES.nhra.has('incidents.edit.own')).toBe(true);
  });

  it('nhra plan does NOT grant incidents.edit.all', () => {
    expect(PLAN_CAPABILITIES.nhra.has('incidents.edit.all')).toBe(false);
  });

  it('free plan does NOT grant any incident capabilities', () => {
    expect(PLAN_CAPABILITIES.free.has('incidents.read')).toBe(false);
    expect(PLAN_CAPABILITIES.free.has('incidents.create')).toBe(false);
    expect(PLAN_CAPABILITIES.free.has('incidents.edit.own')).toBe(false);
    expect(PLAN_CAPABILITIES.free.has('incidents.edit.all')).toBe(false);
  });

  it('basic/pro/team plans do NOT grant incident capabilities by default', () => {
    for (const plan of ['basic', 'pro', 'team'] as const) {
      expect(PLAN_CAPABILITIES[plan].has('incidents.read')).toBe(false);
    }
  });
});

// =========================================================================
// hasCap (namespaced keys)
// =========================================================================
describe('hasCap', () => {
  it('free member cannot install engine', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
    expect(hasCap(ctx, 'library.install.engine')).toBe(false);
  });

  it('free member canNOT save to library', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
    expect(hasCap(ctx, 'library.save.engine')).toBe(false);
    expect(hasCap(ctx, 'library.save.clutch')).toBe(false);
    expect(hasCap(ctx, 'library.save.fourLink')).toBe(false);
  });

  it('basic member cannot install engine', () => {
    const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
    expect(hasCap(ctx, 'library.install.engine')).toBe(false);
  });

  it('pro member CAN install engine', () => {
    const ctx: UserCapabilityContext = { plan: 'pro', role: 'member' };
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'library.install.clutch')).toBe(true);
    expect(hasCap(ctx, 'library.install.fourLink')).toBe(true);
  });

  it('team member CAN install engine', () => {
    const ctx: UserCapabilityContext = { plan: 'team', role: 'member' };
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
  });

  it('fullAccess overrides plan — free owner gets everything', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'owner', fullAccess: true };
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'library.install.clutch')).toBe(true);
    expect(hasCap(ctx, 'library.install.fourLink')).toBe(true);
    expect(hasCap(ctx, 'admin.devTools')).toBe(true);
    expect(hasCap(ctx, 'team.enabled')).toBe(true);
  });

  it('role adds admin.devTools even on free plan', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'admin' };
    expect(hasCap(ctx, 'admin.devTools')).toBe(true);
    expect(hasCap(ctx, 'admin.userManagement')).toBe(true);
    expect(hasCap(ctx, 'library.install.engine')).toBe(false);
  });

  it('viewer on free plan has minimal capabilities', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'viewer' };
    expect(hasCap(ctx, 'sim.basic')).toBe(true);
    expect(hasCap(ctx, 'library.install.engine')).toBe(false);
    expect(hasCap(ctx, 'admin.devTools')).toBe(false);
  });

  it('returns false for unknown/invalid capability key', () => {
    const ctx: UserCapabilityContext = { plan: 'pro', role: 'owner', fullAccess: true };
    expect(hasCap(ctx, 'totally_bogus_key')).toBe(false);
  });
});

// =========================================================================
// Backward-compatible alias support
// =========================================================================
describe('alias support', () => {
  it('resolveCapKey resolves old flat keys to new namespaced keys', () => {
    expect(resolveCapKey('install_engine')).toBe('library.install.engine');
    expect(resolveCapKey('install_clutch')).toBe('library.install.clutch');
    expect(resolveCapKey('install_fourlink')).toBe('library.install.fourLink');
    expect(resolveCapKey('library_save_engine')).toBe('library.save.engine');
    expect(resolveCapKey('team_management')).toBe('team.enabled');
    expect(resolveCapKey('dev_tools')).toBe('admin.devTools');
    expect(resolveCapKey('user_management')).toBe('admin.userManagement');
  });

  it('resolveCapKey passes through new namespaced keys unchanged', () => {
    expect(resolveCapKey('library.install.engine')).toBe('library.install.engine');
    expect(resolveCapKey('library.save.clutch')).toBe('library.save.clutch');
    expect(resolveCapKey('team.enabled')).toBe('team.enabled');
    expect(resolveCapKey('admin.devTools')).toBe('admin.devTools');
  });

  it('resolveCapKey returns undefined for unknown keys', () => {
    expect(resolveCapKey('totally_bogus')).toBeUndefined();
    expect(resolveCapKey('')).toBeUndefined();
  });

  it('every alias maps to a valid CAPABILITY_KEY', () => {
    const validKeys = new Set<string>(CAPABILITY_KEYS);
    for (const [oldKey, newKey] of Object.entries(CAPABILITY_ALIASES)) {
      expect(validKeys.has(newKey)).toBe(true);
      // Verify the old key is NOT in the new key list
      expect(validKeys.has(oldKey)).toBe(false);
    }
  });

  it('hasCap works with old flat keys via alias', () => {
    const ctx: UserCapabilityContext = { plan: 'pro', role: 'member' };
    // Old keys should resolve and work
    expect(hasCap(ctx, 'install_engine')).toBe(true);
    expect(hasCap(ctx, 'library_save_engine')).toBe(true);
    // New keys should also work
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'library.save.engine')).toBe(true);
  });

  it('isInstallCapability works with both old and new keys', () => {
    expect(isInstallCapability('install_engine')).toBe(true);
    expect(isInstallCapability('library.install.engine')).toBe(true);
    expect(isInstallCapability('install_clutch')).toBe(true);
    expect(isInstallCapability('library.install.clutch')).toBe(true);
    expect(isInstallCapability('install_fourlink')).toBe(true);
    expect(isInstallCapability('library.install.fourLink')).toBe(true);
    expect(isInstallCapability('library_save_engine')).toBe(false);
    expect(isInstallCapability('library.save.engine')).toBe(false);
  });
});

// =========================================================================
// Trial overlay
// =========================================================================
describe('trial overlay', () => {
  it('free member with active trial (target=pro) gets pro capabilities', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: true, targetPlan: 'pro' },
    };
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'library.install.clutch')).toBe(true);
    expect(hasCap(ctx, 'sim.advanced')).toBe(true);
    expect(hasCap(ctx, 'optimizer.gear')).toBe(true);
  });

  it('free member with active trial (target=team) gets team capabilities', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: true, targetPlan: 'team' },
    };
    expect(hasCap(ctx, 'library.install.engine')).toBe(true);
    expect(hasCap(ctx, 'team.enabled')).toBe(true);
    expect(hasCap(ctx, 'team.vehicles.share')).toBe(true);
  });

  it('free member with inactive trial does NOT get pro capabilities', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: false, targetPlan: 'pro' },
    };
    expect(hasCap(ctx, 'library.install.engine')).toBe(false);
    expect(hasCap(ctx, 'sim.advanced')).toBe(false);
    // Free plan caps only (no library.save)
    expect(hasCap(ctx, 'library.save.engine')).toBe(false);
    expect(hasCap(ctx, 'sim.basic')).toBe(true);
  });

  it('trial expiry: active trial → inactive trial loses capabilities', () => {
    const during: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: true, targetPlan: 'pro' },
    };
    const after: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: false, targetPlan: 'pro' },
    };
    expect(hasCap(during, 'library.install.engine')).toBe(true);
    expect(hasCap(after, 'library.install.engine')).toBe(false);
    // Library save also lost (free no longer has it)
    expect(hasCap(after, 'library.save.engine')).toBe(false);
  });

  it('getEffectiveCapabilities includes trial overlay caps', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: true, targetPlan: 'pro' },
    };
    const caps = getEffectiveCapabilities(ctx);
    expect(caps).toContain('library.install.engine');
    expect(caps).toContain('sim.advanced');
    expect(caps.length).toBe(PLAN_CAPABILITIES.pro.size);
  });

  it('getEffectiveCapabilities without trial returns only base plan caps', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
    const caps = getEffectiveCapabilities(ctx);
    expect(caps.length).toBe(PLAN_CAPABILITIES.free.size);
    expect(caps).not.toContain('library.install.engine');
  });

  it('NO_TRIAL constant is inactive', () => {
    expect(NO_TRIAL.active).toBe(false);
    expect(NO_TRIAL.targetPlan).toBe('pro');
  });
});

// =========================================================================
// getEffectiveCapabilities
// =========================================================================
describe('getEffectiveCapabilities', () => {
  it('fullAccess returns all capabilities', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'owner', fullAccess: true };
    const caps = getEffectiveCapabilities(ctx);
    expect(caps.length).toBe(CAPABILITY_KEYS.length);
  });

  it('free member gets only free plan caps', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
    const caps = getEffectiveCapabilities(ctx);
    expect(caps.length).toBe(PLAN_CAPABILITIES.free.size);
    expect(caps).toContain('sim.basic');
    expect(caps).not.toContain('library.save.engine');
    expect(caps).not.toContain('library.install.engine');
  });

  it('free admin gets free plan caps + admin role caps', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'admin' };
    const caps = getEffectiveCapabilities(ctx);
    expect(caps.length).toBe(PLAN_CAPABILITIES.free.size + ROLE_CAPABILITIES.admin.size);
    expect(caps).toContain('admin.devTools');
    expect(caps).toContain('admin.userManagement');
  });
});

// =========================================================================
// isInstallCapability
// =========================================================================
describe('isInstallCapability', () => {
  it('identifies install capabilities (namespaced)', () => {
    expect(isInstallCapability('library.install.engine')).toBe(true);
    expect(isInstallCapability('library.install.clutch')).toBe(true);
    expect(isInstallCapability('library.install.fourLink')).toBe(true);
  });

  it('rejects non-install capabilities', () => {
    expect(isInstallCapability('library.save.engine')).toBe(false);
    expect(isInstallCapability('sim.basic')).toBe(false);
    expect(isInstallCapability('admin.devTools')).toBe(false);
  });
});

// =========================================================================
// Install gating fallback on downgrade
// =========================================================================
describe('install gating — downgrade scenario', () => {
  it('pro user who downgrades to basic loses install capability', () => {
    const proBefore: UserCapabilityContext = { plan: 'pro', role: 'member' };
    expect(hasCap(proBefore, 'library.install.engine')).toBe(true);

    const basicAfter: UserCapabilityContext = { plan: 'basic', role: 'member' };
    expect(hasCap(basicAfter, 'library.install.engine')).toBe(false);
    expect(hasCap(basicAfter, 'library.save.engine')).toBe(true);
  });

  it('team user who downgrades to pro loses team features but keeps install', () => {
    const teamBefore: UserCapabilityContext = { plan: 'team', role: 'member' };
    expect(hasCap(teamBefore, 'team.enabled')).toBe(true);
    expect(hasCap(teamBefore, 'library.install.engine')).toBe(true);

    const proAfter: UserCapabilityContext = { plan: 'pro', role: 'member' };
    expect(hasCap(proAfter, 'team.enabled')).toBe(false);
    expect(hasCap(proAfter, 'library.install.engine')).toBe(true);
  });

  it('trial user who expires loses install capability (trial overlay off)', () => {
    const trialActive: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: true, targetPlan: 'pro' },
    };
    expect(hasCap(trialActive, 'library.install.engine')).toBe(true);

    const trialExpired: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: false, targetPlan: 'pro' },
    };
    expect(hasCap(trialExpired, 'library.install.engine')).toBe(false);
    expect(hasCap(trialExpired, 'library.save.engine')).toBe(false); // free no longer has library.save
  });

  it('downgraded user: basic+ has library.save, free does not', () => {
    for (const pid of ['basic', 'pro', 'team'] as const) {
      const ctx: UserCapabilityContext = { plan: pid, role: 'member' };
      expect(hasCap(ctx, 'library.save.engine')).toBe(true);
      expect(hasCap(ctx, 'library.save.clutch')).toBe(true);
      expect(hasCap(ctx, 'library.save.fourLink')).toBe(true);
    }
    const freeCtx: UserCapabilityContext = { plan: 'free', role: 'member' };
    expect(hasCap(freeCtx, 'library.save.engine')).toBe(false);
    expect(hasCap(freeCtx, 'library.save.clutch')).toBe(false);
    expect(hasCap(freeCtx, 'library.save.fourLink')).toBe(false);
  });
});

// =========================================================================
// Migration helpers
// =========================================================================
describe('planFromLegacyTier', () => {
  it('maps known tiers correctly', () => {
    expect(planFromLegacyTier('free')).toBe('free');
    expect(planFromLegacyTier('racer')).toBe('basic');
    expect(planFromLegacyTier('junior')).toBe('basic');
    expect(planFromLegacyTier('basic')).toBe('basic');
    expect(planFromLegacyTier('pro')).toBe('pro');
    expect(planFromLegacyTier('team')).toBe('team');
  });

  it('trial legacy tier maps to free (trial overlay handles capabilities)', () => {
    expect(planFromLegacyTier('trial')).toBe('free');
  });

  it('maps legacy tier names', () => {
    expect(planFromLegacyTier('nitro')).toBe('team');
    expect(planFromLegacyTier('NITRO')).toBe('team');
  });

  it('maps beta/owner to pro (fullAccess handles the rest)', () => {
    expect(planFromLegacyTier('beta')).toBe('pro');
    expect(planFromLegacyTier('owner')).toBe('pro');
  });

  it('returns free for null/undefined/unknown', () => {
    expect(planFromLegacyTier(null)).toBe('free');
    expect(planFromLegacyTier(undefined)).toBe('free');
    expect(planFromLegacyTier('unknown_plan')).toBe('free');
  });
});

describe('trialFromLegacyTier', () => {
  it('trial tier returns active trial targeting pro', () => {
    const t = trialFromLegacyTier('trial');
    expect(t.active).toBe(true);
    expect(t.targetPlan).toBe('pro');
  });

  it('non-trial tiers return inactive trial', () => {
    expect(trialFromLegacyTier('free').active).toBe(false);
    expect(trialFromLegacyTier('pro').active).toBe(false);
    expect(trialFromLegacyTier('team').active).toBe(false);
    expect(trialFromLegacyTier(null).active).toBe(false);
    expect(trialFromLegacyTier(undefined).active).toBe(false);
  });
});

describe('roleFromLegacyId', () => {
  it('maps known role IDs correctly', () => {
    expect(roleFromLegacyId('owner')).toBe('owner');
    expect(roleFromLegacyId('admin')).toBe('admin');
    expect(roleFromLegacyId('administrator')).toBe('admin');
    expect(roleFromLegacyId('viewer')).toBe('viewer');
    expect(roleFromLegacyId('guest')).toBe('viewer');
  });

  it('maps subscription-tier roles to member', () => {
    expect(roleFromLegacyId('subscriber_pro')).toBe('member');
    expect(roleFromLegacyId('subscriber_basic')).toBe('member');
    expect(roleFromLegacyId('trial')).toBe('member');
    expect(roleFromLegacyId('beta_tester')).toBe('member');
    expect(roleFromLegacyId('beta')).toBe('member');
    expect(roleFromLegacyId('user')).toBe('member');
  });

  it('returns member for null/undefined', () => {
    expect(roleFromLegacyId(null)).toBe('member');
    expect(roleFromLegacyId(undefined)).toBe('member');
  });
});

describe('isFullAccessRole', () => {
  it('owner and admin are full access', () => {
    expect(isFullAccessRole('owner')).toBe(true);
    expect(isFullAccessRole('admin')).toBe(true);
  });

  it('beta_tester and beta are full access', () => {
    expect(isFullAccessRole('beta_tester')).toBe(true);
    expect(isFullAccessRole('beta')).toBe(true);
  });

  it('member, viewer, subscriber roles are NOT full access', () => {
    expect(isFullAccessRole('member')).toBe(false);
    expect(isFullAccessRole('viewer')).toBe(false);
    expect(isFullAccessRole('subscriber_pro')).toBe(false);
    expect(isFullAccessRole('subscriber_basic')).toBe(false);
    expect(isFullAccessRole('trial')).toBe(false);
    expect(isFullAccessRole('guest')).toBe(false);
  });

  it('null/undefined returns false', () => {
    expect(isFullAccessRole(null)).toBe(false);
    expect(isFullAccessRole(undefined)).toBe(false);
  });
});

// =========================================================================
// ET Sim gating (sim.et capability)
// =========================================================================
describe('ET Sim gating (sim.et)', () => {
  it('free plan does NOT include sim.et', () => {
    expect(PLAN_CAPABILITIES.free.has('sim.et')).toBe(false);
  });

  it('basic plan DOES include sim.et', () => {
    expect(PLAN_CAPABILITIES.basic.has('sim.et')).toBe(true);
  });

  it('pro plan DOES include sim.et', () => {
    expect(PLAN_CAPABILITIES.pro.has('sim.et')).toBe(true);
  });

  it('team plan DOES include sim.et', () => {
    expect(PLAN_CAPABILITIES.team.has('sim.et')).toBe(true);
  });

  it('free member cannot access ET Sim via hasCap', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
    expect(hasCap(ctx, 'sim.et')).toBe(false);
    // But free still has sim.basic (calculators)
    expect(hasCap(ctx, 'sim.basic')).toBe(true);
  });

  it('free viewer cannot access ET Sim via hasCap', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'viewer' };
    expect(hasCap(ctx, 'sim.et')).toBe(false);
  });

  it('basic member CAN access ET Sim via hasCap', () => {
    const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
    expect(hasCap(ctx, 'sim.et')).toBe(true);
  });

  it('fullAccess grants sim.et regardless of plan', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'owner', fullAccess: true };
    expect(hasCap(ctx, 'sim.et')).toBe(true);
  });

  it('free member with active trial (target=pro) gets sim.et', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: true, targetPlan: 'pro' },
    };
    expect(hasCap(ctx, 'sim.et')).toBe(true);
  });

  it('free member with inactive trial does NOT get sim.et', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free', role: 'member',
      trial: { active: false, targetPlan: 'pro' },
    };
    expect(hasCap(ctx, 'sim.et')).toBe(false);
  });

  it('alias et_sim resolves to sim.et', () => {
    expect(resolveCapKey('et_sim')).toBe('sim.et');
    expect(resolveCapKey('sim_et')).toBe('sim.et');
  });

  it('hasCap works with et_sim alias', () => {
    const free: UserCapabilityContext = { plan: 'free', role: 'member' };
    const basic: UserCapabilityContext = { plan: 'basic', role: 'member' };
    expect(hasCap(free, 'et_sim')).toBe(false);
    expect(hasCap(basic, 'et_sim')).toBe(true);
  });
});

// =========================================================================
// Race Tools gating (sim.raceTools capability)
// =========================================================================
describe('Race Tools gating (sim.raceTools)', () => {
  it('free plan does NOT include sim.raceTools', () => {
    expect(PLAN_CAPABILITIES.free.has('sim.raceTools')).toBe(false);
  });

  it('basic plan DOES include sim.raceTools', () => {
    expect(PLAN_CAPABILITIES.basic.has('sim.raceTools')).toBe(true);
  });

  it('pro plan DOES include sim.raceTools', () => {
    expect(PLAN_CAPABILITIES.pro.has('sim.raceTools')).toBe(true);
  });

  it('team plan DOES include sim.raceTools', () => {
    expect(PLAN_CAPABILITIES.team.has('sim.raceTools')).toBe(true);
  });

  it('free member cannot access Race Tools via hasCap', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
    expect(hasCap(ctx, 'sim.raceTools')).toBe(false);
  });

  it('basic member CAN access Race Tools via hasCap', () => {
    const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
    expect(hasCap(ctx, 'sim.raceTools')).toBe(true);
  });

  it('alias race_tools resolves to sim.raceTools', () => {
    expect(resolveCapKey('race_tools')).toBe('sim.raceTools');
    expect(resolveCapKey('sim_race_tools')).toBe('sim.raceTools');
  });
});

// =========================================================================
// Run Logging gating (data.runLog capability)
// =========================================================================
describe('Run Logging gating (data.runLog)', () => {
  it('free plan does NOT include data.runLog', () => {
    expect(PLAN_CAPABILITIES.free.has('data.runLog')).toBe(false);
  });

  it('basic plan DOES include data.runLog', () => {
    expect(PLAN_CAPABILITIES.basic.has('data.runLog')).toBe(true);
  });

  it('pro plan DOES include data.runLog', () => {
    expect(PLAN_CAPABILITIES.pro.has('data.runLog')).toBe(true);
  });

  it('team plan DOES include data.runLog', () => {
    expect(PLAN_CAPABILITIES.team.has('data.runLog')).toBe(true);
  });

  it('free member cannot access Run Logging via hasCap', () => {
    const ctx: UserCapabilityContext = { plan: 'free', role: 'member' };
    expect(hasCap(ctx, 'data.runLog')).toBe(false);
  });

  it('basic member CAN access Run Logging via hasCap', () => {
    const ctx: UserCapabilityContext = { plan: 'basic', role: 'member' };
    expect(hasCap(ctx, 'data.runLog')).toBe(true);
  });

  it('alias run_logging resolves to data.runLog', () => {
    expect(resolveCapKey('run_logging')).toBe('data.runLog');
    expect(resolveCapKey('save_runs')).toBe('data.runLog');
  });
});

// =========================================================================
// Data integrity
// =========================================================================
describe('data integrity', () => {
  it('PLANS has info for every plan ID', () => {
    for (const pid of PLAN_IDS) {
      expect(PLANS[pid]).toBeDefined();
      expect(PLANS[pid].id).toBe(pid);
      expect(PLANS[pid].name).toBeTruthy();
    }
  });

  it('ROLES has info for every role ID', () => {
    for (const rid of ROLE_IDS) {
      expect(ROLES[rid]).toBeDefined();
      expect(ROLES[rid].id).toBe(rid);
      expect(ROLES[rid].name).toBeTruthy();
    }
  });

  it('all capability keys use dot-namespaced format', () => {
    for (const key of CAPABILITY_KEYS) {
      expect(key).toMatch(/^[a-z]+\.[a-zA-Z]+/);
    }
  });
});

// =========================================================================
// Scoped language guard (Task 3)
// =========================================================================
describe('scoped language guard', () => {
  it('ROLES descriptions never contain "all users" (case-insensitive)', () => {
    for (const rid of ROLE_IDS) {
      const desc = ROLES[rid].description.toLowerCase();
      expect(desc).not.toContain('all users');
    }
  });

  it('ROLES descriptions never contain "manage all" (case-insensitive)', () => {
    for (const rid of ROLE_IDS) {
      const desc = ROLES[rid].description.toLowerCase();
      expect(desc).not.toContain('manage all');
    }
  });

  it('ROLES descriptions that mention user management use scoped wording', () => {
    for (const rid of ROLE_IDS) {
      const desc = ROLES[rid].description.toLowerCase();
      if (desc.includes('manage users')) {
        expect(desc).toContain('within this account');
      }
    }
  });
});
