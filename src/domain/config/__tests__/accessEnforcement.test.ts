/**
 * Access Enforcement Tests
 * 
 * Validates that the capability system correctly enforces access for different user types.
 * Critical for ensuring Free users don't get Beta access and NHRA users get parity-only access.
 */

import { describe, it, expect } from 'vitest';
import { hasCap, type UserCapabilityContext } from '../capabilities';

describe('Access Enforcement', () => {
  describe('Free User (plan=free, role=viewer)', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'viewer',
      fullAccess: false,
    };

    it('can access basic simulation', () => {
      expect(hasCap(ctx, 'sim.basic')).toBe(true);
    });

    it('can access basic vehicle editor', () => {
      expect(hasCap(ctx, 'vehicle.editor.basic')).toBe(true);
    });

    it('can access basic charts', () => {
      expect(hasCap(ctx, 'charts.basic')).toBe(true);
    });

    it('can access manual weather', () => {
      expect(hasCap(ctx, 'weather.manual')).toBe(true);
    });

    it('can access eighth and quarter mile tracks', () => {
      expect(hasCap(ctx, 'track.eighth')).toBe(true);
      expect(hasCap(ctx, 'track.quarter')).toBe(true);
    });

    it('CANNOT access ET sim', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(false);
    });

    it('CANNOT access vehicle management', () => {
      expect(hasCap(ctx, 'data.vehicles')).toBe(false);
    });

    it('CANNOT access run logging', () => {
      expect(hasCap(ctx, 'data.runLog')).toBe(false);
    });

    it('CANNOT access race tools', () => {
      expect(hasCap(ctx, 'sim.raceTools')).toBe(false);
    });

    it('CANNOT access NHRA parity', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(false);
    });

    it('CANNOT access NHRA tech master', () => {
      expect(hasCap(ctx, 'nhra.tech.read')).toBe(false);
    });

    it('CANNOT access pro features', () => {
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(false);
      expect(hasCap(ctx, 'engine.proMode')).toBe(false);
      expect(hasCap(ctx, 'optimizer.gear')).toBe(false);
    });

    it('CANNOT access admin tools', () => {
      expect(hasCap(ctx, 'admin.access')).toBe(false);
      expect(hasCap(ctx, 'admin.userManagement')).toBe(false);
    });
  });

  describe('NHRA User (plan=nhra, role=member)', () => {
    const ctx: UserCapabilityContext = {
      plan: 'nhra',
      role: 'member',
      fullAccess: false,
    };

    it('can access NHRA parity', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(true);
    });

    it('can access NHRA tech master read', () => {
      expect(hasCap(ctx, 'nhra.tech.read')).toBe(true);
    });

    it('can access NHRA tech master admin', () => {
      expect(hasCap(ctx, 'nhra.tech.admin')).toBe(true);
    });

    it('can access incidents', () => {
      expect(hasCap(ctx, 'incidents.read')).toBe(true);
      expect(hasCap(ctx, 'incidents.create')).toBe(true);
      expect(hasCap(ctx, 'incidents.edit.own')).toBe(true);
    });

    it('can access basic simulation (for context)', () => {
      expect(hasCap(ctx, 'sim.basic')).toBe(true);
    });

    it('can access basic charts', () => {
      expect(hasCap(ctx, 'charts.basic')).toBe(true);
    });

    it('can access manual weather', () => {
      expect(hasCap(ctx, 'weather.manual')).toBe(true);
    });

    it('CANNOT access ET sim', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(false);
    });

    it('CANNOT access race tools', () => {
      expect(hasCap(ctx, 'sim.raceTools')).toBe(false);
    });

    it('CANNOT access vehicle management', () => {
      expect(hasCap(ctx, 'data.vehicles')).toBe(false);
    });

    it('CANNOT access run logging', () => {
      expect(hasCap(ctx, 'data.runLog')).toBe(false);
    });

    it('CANNOT access pro features', () => {
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(false);
      expect(hasCap(ctx, 'engine.proMode')).toBe(false);
      expect(hasCap(ctx, 'optimizer.gear')).toBe(false);
    });

    it('CANNOT access library install features', () => {
      expect(hasCap(ctx, 'library.install.engine')).toBe(false);
      expect(hasCap(ctx, 'library.install.clutch')).toBe(false);
    });

    it('CANNOT edit all incidents (member role)', () => {
      expect(hasCap(ctx, 'incidents.edit.all')).toBe(false);
    });

    it('CANNOT access admin tools', () => {
      expect(hasCap(ctx, 'admin.access')).toBe(false);
      expect(hasCap(ctx, 'admin.userManagement')).toBe(false);
    });
  });

  describe('Basic User (plan=basic, role=member)', () => {
    const ctx: UserCapabilityContext = {
      plan: 'basic',
      role: 'member',
      fullAccess: false,
    };

    it('can access ET sim', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(true);
    });

    it('can access race tools', () => {
      expect(hasCap(ctx, 'sim.raceTools')).toBe(true);
    });

    it('can access vehicle management', () => {
      expect(hasCap(ctx, 'data.vehicles')).toBe(true);
    });

    it('can access run logging', () => {
      expect(hasCap(ctx, 'data.runLog')).toBe(true);
    });

    it('can save library components', () => {
      expect(hasCap(ctx, 'library.save.engine')).toBe(true);
      expect(hasCap(ctx, 'library.save.clutch')).toBe(true);
    });

    it('CANNOT access pro features', () => {
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(false);
      expect(hasCap(ctx, 'engine.proMode')).toBe(false);
    });

    it('CANNOT access NHRA parity', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(false);
    });
  });

  describe('Pro User (plan=pro, role=member)', () => {
    const ctx: UserCapabilityContext = {
      plan: 'pro',
      role: 'member',
      fullAccess: false,
    };

    it('can access all basic features', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(true);
      expect(hasCap(ctx, 'data.vehicles')).toBe(true);
    });

    it('can access pro vehicle editor', () => {
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(true);
    });

    it('can access engine pro mode', () => {
      expect(hasCap(ctx, 'engine.proMode')).toBe(true);
    });

    it('can access all optimizers', () => {
      expect(hasCap(ctx, 'optimizer.gear')).toBe(true);
      expect(hasCap(ctx, 'optimizer.launch')).toBe(true);
      expect(hasCap(ctx, 'optimizer.throttleStop')).toBe(true);
    });

    it('can install library components', () => {
      expect(hasCap(ctx, 'library.install.engine')).toBe(true);
      expect(hasCap(ctx, 'library.install.clutch')).toBe(true);
    });

    it('can access advanced simulation', () => {
      expect(hasCap(ctx, 'sim.advanced')).toBe(true);
    });

    it('CANNOT access NHRA parity (no NHRA plan)', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(false);
      expect(hasCap(ctx, 'nhra.tech.read')).toBe(false);
    });

    it('CANNOT access admin tools', () => {
      expect(hasCap(ctx, 'admin.access')).toBe(false);
    });
  });

  describe('Admin User with Free Plan (plan=free, role=admin)', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'admin',
      fullAccess: false,
    };

    it('can access admin portal', () => {
      expect(hasCap(ctx, 'admin.access')).toBe(true);
    });

    it('can access dev tools', () => {
      expect(hasCap(ctx, 'admin.devTools')).toBe(true);
    });

    it('can manage users', () => {
      expect(hasCap(ctx, 'admin.userManagement')).toBe(true);
    });

    it('can edit all incidents', () => {
      expect(hasCap(ctx, 'incidents.edit.all')).toBe(true);
    });

    it('can access free plan features', () => {
      expect(hasCap(ctx, 'sim.basic')).toBe(true);
      expect(hasCap(ctx, 'vehicle.editor.basic')).toBe(true);
    });

    it('CANNOT access NHRA parity (no NHRA plan)', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(false);
      expect(hasCap(ctx, 'nhra.tech.read')).toBe(false);
    });

    it('CANNOT access ET sim (no Basic plan)', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(false);
    });

    it('CANNOT access pro features (no Pro plan)', () => {
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(false);
      expect(hasCap(ctx, 'engine.proMode')).toBe(false);
    });
  });

  describe('Admin User with NHRA Plan (plan=nhra, role=admin)', () => {
    const ctx: UserCapabilityContext = {
      plan: 'nhra',
      role: 'admin',
      fullAccess: false,
    };

    it('can access admin tools from role', () => {
      expect(hasCap(ctx, 'admin.access')).toBe(true);
      expect(hasCap(ctx, 'admin.userManagement')).toBe(true);
    });

    it('can access NHRA features from plan', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(true);
      expect(hasCap(ctx, 'nhra.tech.read')).toBe(true);
      expect(hasCap(ctx, 'nhra.tech.admin')).toBe(true);
    });

    it('can edit all incidents from role', () => {
      expect(hasCap(ctx, 'incidents.edit.all')).toBe(true);
    });

    it('CANNOT access ET sim (no Basic plan)', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(false);
    });

    it('CANNOT access pro features (no Pro plan)', () => {
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(false);
    });
  });

  describe('Owner User (plan=free, role=owner, fullAccess=true)', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'owner',
      fullAccess: true,
    };

    it('can access everything via fullAccess flag', () => {
      expect(hasCap(ctx, 'sim.basic')).toBe(true);
      expect(hasCap(ctx, 'sim.et')).toBe(true);
      expect(hasCap(ctx, 'sim.advanced')).toBe(true);
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(true);
      expect(hasCap(ctx, 'engine.proMode')).toBe(true);
      expect(hasCap(ctx, 'nhra.parity')).toBe(true);
      expect(hasCap(ctx, 'nhra.tech.read')).toBe(true);
      expect(hasCap(ctx, 'admin.access')).toBe(true);
      expect(hasCap(ctx, 'optimizer.gear')).toBe(true);
    });
  });

  describe('Trial Overlay', () => {
    it('grants trial plan capabilities on top of base plan', () => {
      const ctx: UserCapabilityContext = {
        plan: 'free',
        role: 'member',
        fullAccess: false,
        trial: {
          active: true,
          targetPlan: 'pro',
        },
      };

      // Free plan capabilities
      expect(hasCap(ctx, 'sim.basic')).toBe(true);
      
      // Pro trial capabilities
      expect(hasCap(ctx, 'sim.et')).toBe(true);
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(true);
      expect(hasCap(ctx, 'engine.proMode')).toBe(true);
      
      // Still no NHRA (not in trial plan)
      expect(hasCap(ctx, 'nhra.parity')).toBe(false);
    });

    it('does not grant capabilities when trial is inactive', () => {
      const ctx: UserCapabilityContext = {
        plan: 'free',
        role: 'member',
        fullAccess: false,
        trial: {
          active: false,
          targetPlan: 'pro',
        },
      };

      expect(hasCap(ctx, 'sim.basic')).toBe(true);
      expect(hasCap(ctx, 'sim.et')).toBe(false);
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(false);
    });
  });

  describe('Critical Security Checks', () => {
    it('Free users NEVER get Beta/Pro access', () => {
      const ctx: UserCapabilityContext = {
        plan: 'free',
        role: 'viewer',
        fullAccess: false,
      };

      // Comprehensive check of all premium features
      const premiumCapabilities = [
        'sim.et', 'sim.raceTools', 'sim.advanced',
        'data.vehicles', 'data.runLog',
        'vehicle.editor.pro', 'vehicle.throttleStop',
        'engine.proMode',
        'optimizer.gear', 'optimizer.launch', 'optimizer.throttleStop',
        'library.install.engine', 'library.install.clutch',
        'charts.advanced',
        'data.export', 'data.import',
      ];

      premiumCapabilities.forEach(cap => {
        expect(hasCap(ctx, cap as any)).toBe(false);
      });
    });

    it('NHRA users NEVER get general product access', () => {
      const ctx: UserCapabilityContext = {
        plan: 'nhra',
        role: 'member',
        fullAccess: false,
      };

      // Comprehensive check of all general product features
      const productCapabilities = [
        'sim.et', 'sim.raceTools', 'sim.advanced',
        'data.vehicles', 'data.runLog',
        'vehicle.editor.pro',
        'engine.proMode',
        'optimizer.gear',
        'library.install.engine',
      ];

      productCapabilities.forEach(cap => {
        expect(hasCap(ctx, cap as any)).toBe(false);
      });
    });

    it('Admin role does NOT grant NHRA access without NHRA plan', () => {
      const ctx: UserCapabilityContext = {
        plan: 'free',
        role: 'admin',
        fullAccess: false,
      };

      expect(hasCap(ctx, 'nhra.parity')).toBe(false);
      expect(hasCap(ctx, 'nhra.tech.read')).toBe(false);
      expect(hasCap(ctx, 'nhra.tech.admin')).toBe(false);
    });

    it('Admin role does NOT grant Pro features without Pro plan', () => {
      const ctx: UserCapabilityContext = {
        plan: 'free',
        role: 'admin',
        fullAccess: false,
      };

      expect(hasCap(ctx, 'sim.et')).toBe(false);
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(false);
      expect(hasCap(ctx, 'engine.proMode')).toBe(false);
    });
  });
});
