/**
 * Unit tests for Legacy Program Display Names resolver.
 */

import { describe, it, expect } from 'vitest';
import {
  getQuarterProgramName,
  getEngineProgramName,
  getLandSpeedProgramName,
  getProgramTier,
  getAllProgramNames,
  getQuarterProgramNameFromPlan,
  getEngineProgramNameFromPlan,
  getLandSpeedProgramNameFromPlan,
} from '../programDisplayNames';
import type { Capability } from '../../config/capabilities';

// ── Helpers ──────────────────────────────────────────────────────────

/** Create a `can` function that grants the given capabilities. */
function canWith(...caps: Capability[]): (cap: Capability) => boolean {
  const set = new Set(caps);
  return (cap: Capability) => set.has(cap);
}

const canNothing = canWith();
const canBasic = canWith('vehicle.editor.basic', 'sim.et', 'sim.basic');
const canPro = canWith(
  'vehicle.editor.basic', 'vehicle.editor.pro', 'engine.proMode',
  'track.bonneville', 'sim.et', 'sim.basic', 'sim.advanced',
);

// ── Capability-based tests ───────────────────────────────────────────

describe('getQuarterProgramName', () => {
  it('returns "Quarter Jr" for free/basic users', () => {
    expect(getQuarterProgramName(canNothing)).toBe('Quarter Jr');
    expect(getQuarterProgramName(canBasic)).toBe('Quarter Jr');
  });

  it('returns "Quarter Pro" for pro users', () => {
    expect(getQuarterProgramName(canPro)).toBe('Quarter Pro');
  });
});

describe('getEngineProgramName', () => {
  it('returns "Engine Jr" for free/basic users', () => {
    expect(getEngineProgramName(canNothing)).toBe('Engine Jr');
    expect(getEngineProgramName(canBasic)).toBe('Engine Jr');
  });

  it('returns "Engine Pro" for pro users', () => {
    expect(getEngineProgramName(canPro)).toBe('Engine Pro');
  });
});

describe('getLandSpeedProgramName', () => {
  it('returns "Bonneville Jr" for free/basic users', () => {
    expect(getLandSpeedProgramName(canNothing)).toBe('Bonneville Jr');
    expect(getLandSpeedProgramName(canBasic)).toBe('Bonneville Jr');
  });

  it('returns "Bonneville Pro" for pro users', () => {
    expect(getLandSpeedProgramName(canPro)).toBe('Bonneville Pro');
  });
});

describe('getProgramTier', () => {
  it('returns "Jr" for basic users', () => {
    expect(getProgramTier(canBasic)).toBe('Jr');
  });

  it('returns "Pro" for pro users', () => {
    expect(getProgramTier(canPro)).toBe('Pro');
  });
});

describe('getAllProgramNames', () => {
  it('returns all Jr names for basic users', () => {
    const names = getAllProgramNames(canBasic);
    expect(names.quarter).toBe('Quarter Jr');
    expect(names.engine).toBe('Engine Jr');
    expect(names.landSpeed).toBe('Bonneville Jr');
  });

  it('returns all Pro names for pro users', () => {
    const names = getAllProgramNames(canPro);
    expect(names.quarter).toBe('Quarter Pro');
    expect(names.engine).toBe('Engine Pro');
    expect(names.landSpeed).toBe('Bonneville Pro');
  });
});

// ── Edge-case: capability isolation ──────────────────────────────────

describe('capability isolation', () => {
  it('track.bonneville alone does NOT grant Pro names (track access ≠ feature tier)', () => {
    const canTrackOnly = canWith('vehicle.editor.basic', 'sim.et', 'sim.basic', 'track.bonneville');
    expect(getQuarterProgramName(canTrackOnly)).toBe('Quarter Jr');
    expect(getLandSpeedProgramName(canTrackOnly)).toBe('Bonneville Jr');
  });

  it('sim.advanced without engine.proMode → Quarter Pro but Engine Jr', () => {
    const canAdvancedOnly = canWith('sim.advanced');
    expect(getQuarterProgramName(canAdvancedOnly)).toBe('Quarter Pro');
    expect(getLandSpeedProgramName(canAdvancedOnly)).toBe('Bonneville Pro');
    expect(getEngineProgramName(canAdvancedOnly)).toBe('Engine Jr');
  });

  it('engine.proMode without sim.advanced → Engine Pro but Quarter Jr', () => {
    const canEngineOnly = canWith('engine.proMode');
    expect(getEngineProgramName(canEngineOnly)).toBe('Engine Pro');
    expect(getQuarterProgramName(canEngineOnly)).toBe('Quarter Jr');
    expect(getLandSpeedProgramName(canEngineOnly)).toBe('Bonneville Jr');
  });
});

// ── Plan-based tests ─────────────────────────────────────────────────

describe('plan-based resolvers', () => {
  it('free plan → Jr', () => {
    expect(getQuarterProgramNameFromPlan('free')).toBe('Quarter Jr');
    expect(getEngineProgramNameFromPlan('free')).toBe('Engine Jr');
    expect(getLandSpeedProgramNameFromPlan('free')).toBe('Bonneville Jr');
  });

  it('basic plan → Jr', () => {
    expect(getQuarterProgramNameFromPlan('basic')).toBe('Quarter Jr');
    expect(getEngineProgramNameFromPlan('basic')).toBe('Engine Jr');
    expect(getLandSpeedProgramNameFromPlan('basic')).toBe('Bonneville Jr');
  });

  it('pro plan → Pro', () => {
    expect(getQuarterProgramNameFromPlan('pro')).toBe('Quarter Pro');
    expect(getEngineProgramNameFromPlan('pro')).toBe('Engine Pro');
    expect(getLandSpeedProgramNameFromPlan('pro')).toBe('Bonneville Pro');
  });

  it('team plan → Pro', () => {
    expect(getQuarterProgramNameFromPlan('team')).toBe('Quarter Pro');
    expect(getEngineProgramNameFromPlan('team')).toBe('Engine Pro');
    expect(getLandSpeedProgramNameFromPlan('team')).toBe('Bonneville Pro');
  });
});
