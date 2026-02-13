/**
 * Tests for View As Presets and Expected Route Helpers
 *
 * Covers:
 * - Preset definitions produce valid DevViewAsOverride payloads
 * - Preset payloads round-trip through JSON
 * - getExpectedRoutes derives correct ALLOW/BLOCK per gate
 * - hasAnyMismatch detects disagreement between systems
 */

import { describe, it, expect } from 'vitest';
import {
  VIEW_AS_PRESETS,
  getExpectedRoutes,
  hasAnyMismatch,
  type SimDiags,
} from '../viewAsPresets';
import type { DevViewAsOverride } from '../devViewAs';

// ── Helpers ──────────────────────────────────────────────────────────

const F = { allowed: false, legacy: false, capability: false, subscription: false } as const;
const T = { allowed: true, legacy: true, capability: true, subscription: true } as const;

function makeDiags(overrides: Partial<SimDiags> = {}): SimDiags {
  return { etSim: F, raceTools: F, runLogging: F, vehicles: F, ...overrides };
}

// =========================================================================
// Preset definitions
// =========================================================================
describe('VIEW_AS_PRESETS', () => {
  it('has at least 5 presets', () => {
    expect(VIEW_AS_PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it('each preset has required fields', () => {
    for (const p of VIEW_AS_PRESETS) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.override.enabled).toBe(true);
      expect(p.override.planId).toBeTruthy();
      expect(p.override.roleId).toBeTruthy();
    }
  });

  it('free-viewer preset has planId=free, roleId=viewer, fullAccess=false', () => {
    const p = VIEW_AS_PRESETS.find((x) => x.id === 'free-viewer');
    expect(p).toBeDefined();
    expect(p!.override.planId).toBe('free');
    expect(p!.override.roleId).toBe('viewer');
    expect(p!.override.fullAccess).toBe(false);
  });

  it('basic-member preset has planId=basic, roleId=member', () => {
    const p = VIEW_AS_PRESETS.find((x) => x.id === 'basic-member');
    expect(p).toBeDefined();
    expect(p!.override.planId).toBe('basic');
    expect(p!.override.roleId).toBe('member');
    expect(p!.override.fullAccess).toBe(false);
  });

  it('pro-member preset has planId=pro, roleId=member', () => {
    const p = VIEW_AS_PRESETS.find((x) => x.id === 'pro-member');
    expect(p).toBeDefined();
    expect(p!.override.planId).toBe('pro');
    expect(p!.override.roleId).toBe('member');
  });

  it('team-admin preset has planId=team, roleId=admin', () => {
    const p = VIEW_AS_PRESETS.find((x) => x.id === 'team-admin');
    expect(p).toBeDefined();
    expect(p!.override.planId).toBe('team');
    expect(p!.override.roleId).toBe('admin');
  });

  it('owner-full preset has fullAccess=true', () => {
    const p = VIEW_AS_PRESETS.find((x) => x.id === 'owner-full');
    expect(p).toBeDefined();
    expect(p!.override.fullAccess).toBe(true);
    expect(p!.override.roleId).toBe('owner');
  });

  it('all preset IDs are unique', () => {
    const ids = VIEW_AS_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// =========================================================================
// Preset payloads round-trip through JSON (same path as localStorage)
// =========================================================================
describe('Preset payload JSON round-trip', () => {
  for (const preset of VIEW_AS_PRESETS) {
    it(`${preset.id} survives JSON serialize/deserialize`, () => {
      const json = JSON.stringify(preset.override);
      const loaded = JSON.parse(json) as DevViewAsOverride;
      expect(loaded.enabled).toBe(preset.override.enabled);
      expect(loaded.planId).toBe(preset.override.planId);
      expect(loaded.roleId).toBe(preset.override.roleId);
      expect(loaded.fullAccess).toBe(preset.override.fullAccess);
      expect(typeof loaded.enabled).toBe('boolean');
      expect(typeof loaded.planId).toBe('string');
      expect(typeof loaded.roleId).toBe('string');
    });
  }
});

// =========================================================================
// getExpectedRoutes
// =========================================================================
describe('getExpectedRoutes', () => {
  const allBlocked = makeDiags();
  const allAllowed = makeDiags({ etSim: T, raceTools: T, runLogging: T, vehicles: T });

  it('returns 15 routes total (11 gated + 4 login-only)', () => {
    expect(getExpectedRoutes(allBlocked)).toHaveLength(15);
  });

  it('gated routes BLOCK when all gates are blocked; login-only routes always ALLOW', () => {
    const routes = getExpectedRoutes(allBlocked);
    const gated = routes.filter((r) => r.gate !== 'loginOnly');
    const loginOnly = routes.filter((r) => r.gate === 'loginOnly');
    for (const r of gated) expect(r.expected).toBe('BLOCK');
    for (const r of loginOnly) expect(r.expected).toBe('ALLOW');
  });

  it('all routes ALLOW when all gates are allowed', () => {
    const routes = getExpectedRoutes(allAllowed);
    for (const r of routes) {
      expect(r.expected).toBe('ALLOW');
    }
  });

  it('ET Sim routes follow etSim gate', () => {
    const routes = getExpectedRoutes(makeDiags({ etSim: T }));
    const etRoutes = routes.filter((r) => r.gate === 'etSim');
    expect(etRoutes.length).toBe(2);
    for (const r of etRoutes) expect(r.expected).toBe('ALLOW');
    const blockedGated = routes.filter((r) => r.gate !== 'etSim' && r.gate !== 'loginOnly');
    for (const r of blockedGated) expect(r.expected).toBe('BLOCK');
  });

  it('Race Tools routes follow raceTools gate', () => {
    const routes = getExpectedRoutes(makeDiags({ raceTools: T }));
    const raceRoutes = routes.filter((r) => r.gate === 'raceTools');
    expect(raceRoutes.length).toBe(6);
    for (const r of raceRoutes) expect(r.expected).toBe('ALLOW');
  });

  it('Run Logging routes follow runLogging gate', () => {
    const routes = getExpectedRoutes(makeDiags({ runLogging: T }));
    const logRoutes = routes.filter((r) => r.gate === 'runLogging');
    expect(logRoutes.length).toBe(2);
    for (const r of logRoutes) expect(r.expected).toBe('ALLOW');
  });

  it('Vehicles route follows vehicles gate', () => {
    const routes = getExpectedRoutes(makeDiags({ vehicles: T }));
    const vRoutes = routes.filter((r) => r.gate === 'vehicles');
    expect(vRoutes.length).toBe(1);
    expect(vRoutes[0].path).toBe('/vehicles');
    expect(vRoutes[0].expected).toBe('ALLOW');
  });

  it('login-only routes always ALLOW regardless of gates', () => {
    const routes = getExpectedRoutes(allBlocked);
    const loginOnly = routes.filter((r) => r.gate === 'loginOnly');
    expect(loginOnly.length).toBe(4);
    for (const r of loginOnly) expect(r.expected).toBe('ALLOW');
  });

  it('each route has path, label, gate, and expected', () => {
    const routes = getExpectedRoutes(allBlocked);
    for (const r of routes) {
      expect(r.path).toMatch(/^\//);
      expect(r.label).toBeTruthy();
      expect(['etSim', 'raceTools', 'runLogging', 'vehicles', 'loginOnly']).toContain(r.gate);
      expect(['ALLOW', 'BLOCK']).toContain(r.expected);
    }
  });

  it('/engine-sim route has note about engine.proMode', () => {
    const routes = getExpectedRoutes(allBlocked);
    const engineSim = routes.find((r) => r.path === '/engine-sim');
    expect(engineSim).toBeDefined();
    expect(engineSim!.note).toContain('engine.proMode');
  });

  it('includes specific known paths', () => {
    const routes = getExpectedRoutes(allBlocked);
    const paths = routes.map((r) => r.path);
    expect(paths).toContain('/et-sim');
    expect(paths).toContain('/predict');
    expect(paths).toContain('/race-day');
    expect(paths).toContain('/dial-in');
    expect(paths).toContain('/opponents');
    expect(paths).toContain('/ladder');
    expect(paths).toContain('/tech-card');
    expect(paths).toContain('/import');
    expect(paths).toContain('/log');
    expect(paths).toContain('/history');
    expect(paths).toContain('/vehicles');
    expect(paths).toContain('/engine-sim');
    expect(paths).toContain('/library/engines');
  });
});

// =========================================================================
// hasAnyMismatch
// =========================================================================
describe('hasAnyMismatch', () => {
  it('returns false when all systems agree (all true)', () => {
    expect(hasAnyMismatch(makeDiags({ etSim: T, raceTools: T, runLogging: T, vehicles: T }))).toBe(false);
  });

  it('returns false when all systems agree (all false)', () => {
    expect(hasAnyMismatch(makeDiags())).toBe(false);
  });

  it('returns true when etSim has legacy/capability mismatch', () => {
    expect(hasAnyMismatch(makeDiags({
      etSim: { allowed: true, legacy: true, capability: false, subscription: true },
      raceTools: T, runLogging: T, vehicles: T,
    }))).toBe(true);
  });

  it('returns true when raceTools has subscription mismatch', () => {
    expect(hasAnyMismatch(makeDiags({
      etSim: T,
      raceTools: { allowed: true, legacy: true, capability: true, subscription: false },
      runLogging: T, vehicles: T,
    }))).toBe(true);
  });

  it('returns true when vehicles has any mismatch', () => {
    expect(hasAnyMismatch(makeDiags({
      vehicles: { allowed: true, legacy: true, capability: false, subscription: true },
    }))).toBe(true);
  });

  it('returns true when runLogging has any mismatch', () => {
    expect(hasAnyMismatch(makeDiags({
      runLogging: { allowed: false, legacy: false, capability: true, subscription: false },
    }))).toBe(true);
  });
});
