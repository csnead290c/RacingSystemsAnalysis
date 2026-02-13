/**
 * Safety tests: prevent ad-hoc access checks in App.tsx
 *
 * These tests read App.tsx source and assert that:
 * 1. Gated routes use centralized guard constants (not string literals)
 * 2. Banned ad-hoc gating patterns do not appear
 *
 * If a test fails, it means someone introduced an inline feature check
 * that should use a centralized guard from guards.ts instead.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const APP_SRC = readFileSync(
  resolve(__dirname, '../../../app/App.tsx'),
  'utf-8',
);

// =========================================================================
// Banned string-literal requireFeature values in route guards
// =========================================================================
describe('App.tsx route guards use centralized constants', () => {
  it('does not use requireFeature="basic_sim" (should use RACE_TOOLS_FEATURE)', () => {
    expect(APP_SRC).not.toContain('requireFeature="basic_sim"');
  });

  it('does not use requireFeature="save_runs" (should use RUN_LOGGING_FEATURE)', () => {
    expect(APP_SRC).not.toContain('requireFeature="save_runs"');
  });

  it('does not use requireFeature="et_sim" string literal (should use ET_SIM_FEATURE constant)', () => {
    expect(APP_SRC).not.toContain('requireFeature="et_sim"');
  });

  it('does not use requireFeature="race_tools" string literal (should use RACE_TOOLS_FEATURE constant)', () => {
    expect(APP_SRC).not.toContain('requireFeature="race_tools"');
  });

  it('does not use requireFeature="run_logging" string literal (should use RUN_LOGGING_FEATURE constant)', () => {
    expect(APP_SRC).not.toContain('requireFeature="run_logging"');
  });

  it('does not use requireFeature="save_vehicles" string literal (should use VEHICLES_FEATURE constant)', () => {
    expect(APP_SRC).not.toContain('requireFeature="save_vehicles"');
  });
});

// =========================================================================
// Banned ad-hoc hasFeature calls for gated features in nav/routing
// =========================================================================
describe('App.tsx nav does not use ad-hoc hasFeature for gated features', () => {
  it('does not use hasFeature(\'basic_sim\') for routing/nav gating', () => {
    // basic_sim is for calculators (free tier), not for route gating
    // If it appears in App.tsx nav conditionals, it's likely a mistake
    const lines = APP_SRC.split('\n');
    const navLines = lines.filter(
      (l) => l.includes("hasFeature('basic_sim')") && !l.trimStart().startsWith('//')
    );
    expect(navLines).toEqual([]);
  });

  it('does not use hasFeature(\'save_vehicles\') inline (should use canAccessVehicles)', () => {
    const lines = APP_SRC.split('\n');
    const hits = lines.filter(
      (l) => l.includes("hasFeature('save_vehicles')") && !l.trimStart().startsWith('//')
    );
    expect(hits).toEqual([]);
  });

  it('does not use hasFeature(\'save_runs\') inline (should use canAccessRunLogging)', () => {
    const lines = APP_SRC.split('\n');
    const hits = lines.filter(
      (l) => l.includes("hasFeature('save_runs')") && !l.trimStart().startsWith('//')
    );
    expect(hits).toEqual([]);
  });
});

// =========================================================================
// Centralized guard imports are present
// =========================================================================
describe('App.tsx imports centralized guards', () => {
  it('imports canAccessVehicles', () => {
    expect(APP_SRC).toContain('canAccessVehicles');
  });

  it('imports VEHICLES_FEATURE', () => {
    expect(APP_SRC).toContain('VEHICLES_FEATURE');
  });

  it('imports canAccessEtSim', () => {
    expect(APP_SRC).toContain('canAccessEtSim');
  });

  it('imports ET_SIM_FEATURE', () => {
    expect(APP_SRC).toContain('ET_SIM_FEATURE');
  });

  it('imports RACE_TOOLS_FEATURE', () => {
    expect(APP_SRC).toContain('RACE_TOOLS_FEATURE');
  });

  it('imports RUN_LOGGING_FEATURE', () => {
    expect(APP_SRC).toContain('RUN_LOGGING_FEATURE');
  });
});
