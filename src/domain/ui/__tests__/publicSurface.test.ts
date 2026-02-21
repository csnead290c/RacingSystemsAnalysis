import { describe, it, expect } from 'vitest';
import {
  isInternalUser,
  shouldShowModule,
  isInternalRoute,
  INTERNAL_MODULES,
  INTERNAL_ROUTES,
  type VisibilityContext,
} from '../publicSurface';

// ── isInternalUser ──────────────────────────────────────────────────

describe('isInternalUser', () => {
  it('returns false for normal users in production', () => {
    const cases: VisibilityContext[] = [
      { roleId: undefined, isDev: false },
      { roleId: 'member', isDev: false },
      { roleId: 'user', isDev: false },
      { roleId: 'pro', isDev: false },
      { roleId: 'team', isDev: false },
      { roleId: 'basic', isDev: false },
    ];
    for (const ctx of cases) {
      expect(isInternalUser(ctx)).toBe(false);
    }
  });

  it('returns true for owner role', () => {
    expect(isInternalUser({ roleId: 'owner', isDev: false })).toBe(true);
  });

  it('returns true for admin role', () => {
    expect(isInternalUser({ roleId: 'admin', isDev: false })).toBe(true);
  });

  it('returns true in dev mode regardless of role', () => {
    expect(isInternalUser({ roleId: undefined, isDev: true })).toBe(true);
    expect(isInternalUser({ roleId: 'member', isDev: true })).toBe(true);
  });
});

// ── shouldShowModule ────────────────────────────────────────────────

describe('shouldShowModule', () => {
  const publicCtx: VisibilityContext = { roleId: 'member', isDev: false };
  const internalCtx: VisibilityContext = { roleId: 'owner', isDev: false };

  it('hides ALL internal modules from normal users', () => {
    for (const mod of INTERNAL_MODULES) {
      expect(shouldShowModule(mod, publicCtx)).toBe(false);
    }
  });

  it('shows ALL internal modules to internal users', () => {
    for (const mod of INTERNAL_MODULES) {
      expect(shouldShowModule(mod, internalCtx)).toBe(true);
    }
  });
});

// ── isInternalRoute ─────────────────────────────────────────────────

describe('isInternalRoute', () => {
  it('identifies internal routes', () => {
    const internalPaths = Object.keys(INTERNAL_ROUTES);
    for (const path of internalPaths) {
      expect(isInternalRoute(path)).toBe(true);
    }
  });

  it('does NOT flag public routes', () => {
    const publicPaths = ['/', '/about', '/et-sim', '/engine-sim', '/vehicles', '/calculators', '/calcs', '/login', '/pricing'];
    for (const path of publicPaths) {
      expect(isInternalRoute(path)).toBe(false);
    }
  });
});

// ── INTERNAL_ROUTES covers all expected paths ───────────────────────

describe('INTERNAL_ROUTES completeness', () => {
  it('covers team and all team sub-routes', () => {
    expect(INTERNAL_ROUTES['/team']).toBe('team');
    expect(INTERNAL_ROUTES['/parts']).toBe('team');
    expect(INTERNAL_ROUTES['/events']).toBe('team');
    expect(INTERNAL_ROUTES['/maintenance']).toBe('team');
    expect(INTERNAL_ROUTES['/expenses']).toBe('team');
  });

  it('covers history, race-day, admin, dev', () => {
    expect(INTERNAL_ROUTES['/history']).toBe('history');
    expect(INTERNAL_ROUTES['/race-day']).toBe('raceDay');
    expect(INTERNAL_ROUTES['/admin']).toBe('admin');
    expect(INTERNAL_ROUTES['/dev']).toBe('dev');
  });

  it('covers log, import, tech-card, ladder, opponents, dial-in', () => {
    expect(INTERNAL_ROUTES['/log']).toBe('log');
    expect(INTERNAL_ROUTES['/import']).toBe('import');
    expect(INTERNAL_ROUTES['/tech-card']).toBe('techCard');
    expect(INTERNAL_ROUTES['/ladder']).toBe('ladder');
    expect(INTERNAL_ROUTES['/opponents']).toBe('opponents');
    expect(INTERNAL_ROUTES['/dial-in']).toBe('dialIn');
  });
});
