import { describe, it, expect } from 'vitest';
import { isVehicleProLocked, hasProFields, markProUsedIfNeeded } from '../vehicleProLock';
import { VehicleSchema } from '../../schemas/vehicle.schema';

// ── Fixtures ──────────────────────────────────────────────────────────

const basicVehicle = {
  id: 'v1',
  name: 'Basic Car',
  weightLb: 3000,
  tireDiaIn: 28,
  rearGear: 3.73,
  rolloutIn: 12,
  powerHP: 400,
  defaultRaceLength: 'QUARTER' as const,
};

const proVehicle = {
  ...basicVehicle,
  id: 'v2',
  name: 'Pro Car',
  usesQuarterProFeatures: true,
  editorMode: 'advanced' as const,
  hpCurve: [{ rpm: 3000, hp: 200 }, { rpm: 6000, hp: 400 }],
  cd: 0.45,
  enginePMI: 3.0,
};

// ── Strategy A: isVehicleProLocked (explicit boolean) ─────────────────

describe('isVehicleProLocked — Strategy A', () => {
  it('new basic vehicle is NOT locked by default', () => {
    const result = isVehicleProLocked(basicVehicle, false);
    expect(result.locked).toBe(false);
  });

  it('returns locked=false for Pro user regardless of vehicle flag', () => {
    const result = isVehicleProLocked(proVehicle, true);
    expect(result.locked).toBe(false);
  });

  it('returns locked=true for vehicle with usesQuarterProFeatures=true + Basic user', () => {
    const result = isVehicleProLocked(proVehicle, false);
    expect(result.locked).toBe(true);
  });

  it('returns locked=false when usesQuarterProFeatures is undefined (legacy vehicle)', () => {
    const result = isVehicleProLocked(basicVehicle, false);
    expect(result.locked).toBe(false);
  });

  it('returns locked=false when usesQuarterProFeatures is explicitly false', () => {
    const v = { ...basicVehicle, usesQuarterProFeatures: false };
    const result = isVehicleProLocked(v, false);
    expect(result.locked).toBe(false);
  });

  it('vehicle with Pro fields but NO flag is NOT locked (Strategy A = explicit only)', () => {
    const v = { ...basicVehicle, hpCurve: [{ rpm: 3000, hp: 200 }], cd: 0.45 };
    const result = isVehicleProLocked(v, false);
    expect(result.locked).toBe(false);
  });
});

// ── hasProFields (field detection for markProUsedIfNeeded) ────────────

describe('hasProFields', () => {
  it('returns false for basic vehicle', () => {
    expect(hasProFields(basicVehicle)).toBe(false);
  });

  it('returns true for vehicle with HP curve', () => {
    expect(hasProFields({ hpCurve: [{ rpm: 3000, hp: 200 }] })).toBe(true);
  });

  it('returns true for vehicle with PMI', () => {
    expect(hasProFields({ enginePMI: 3.0 })).toBe(true);
  });

  it('returns true for advanced editor mode', () => {
    expect(hasProFields({ editorMode: 'advanced' })).toBe(true);
  });

  it('returns true for throttle stop enabled', () => {
    expect(hasProFields({ throttleStopEnabled: true })).toBe(true);
  });

  it('returns false for throttleStopEnabled=false', () => {
    expect(hasProFields({ throttleStopEnabled: false })).toBe(false);
  });

  it('returns false for empty hpCurve', () => {
    expect(hasProFields({ hpCurve: [] })).toBe(false);
  });

  it('returns true for drag coefficient', () => {
    expect(hasProFields({ cd: 0.45 })).toBe(true);
  });

  it('returns true for converter torque mult', () => {
    expect(hasProFields({ converterTorqueMult: 2.0 })).toBe(true);
  });
});

// ── markProUsedIfNeeded (save pipeline) ───────────────────────────────

describe('markProUsedIfNeeded', () => {
  it('does nothing for Basic user (cannot trigger flag)', () => {
    const v = { ...basicVehicle, hpCurve: [{ rpm: 3000, hp: 200 }] };
    const result = markProUsedIfNeeded(v, false) as any;
    expect(result.usesQuarterProFeatures).toBeUndefined();
  });

  it('sets usesQuarterProFeatures=true when Pro user saves with Pro fields', () => {
    const v = { ...basicVehicle, hpCurve: [{ rpm: 3000, hp: 200 }] };
    const result = markProUsedIfNeeded(v, true) as any;
    expect(result.usesQuarterProFeatures).toBe(true);
  });

  it('does not set flag when Pro user saves basic vehicle (no Pro fields)', () => {
    const result = markProUsedIfNeeded(basicVehicle, true) as any;
    expect(result.usesQuarterProFeatures).toBeUndefined();
  });

  it('never reverts flag once set (sticky)', () => {
    const v = { ...basicVehicle, usesQuarterProFeatures: true as const };
    const result = markProUsedIfNeeded(v, true);
    expect(result.usesQuarterProFeatures).toBe(true);
  });

  it('Pro user edits Pro field → flag set → Basic user cannot run', () => {
    // Step 1: Pro user saves with HP curve
    const draft = { ...basicVehicle, hpCurve: [{ rpm: 3000, hp: 200 }] };
    const saved = markProUsedIfNeeded(draft, true) as any;
    expect(saved.usesQuarterProFeatures).toBe(true);

    // Step 2: Basic user tries to run it
    const lock = isVehicleProLocked(saved, false);
    expect(lock.locked).toBe(true);
  });
});

// ── Trigger correctness (prevent accidental flips) ───────────────────

describe('markProUsedIfNeeded — trigger correctness', () => {
  it('advanced editor mode flips the flag', () => {
    const v = { ...basicVehicle, editorMode: 'advanced' as const };
    const result = markProUsedIfNeeded(v, true) as any;
    expect(result.usesQuarterProFeatures).toBe(true);
  });

  it('throttle stop enabled flips the flag', () => {
    const v = { ...basicVehicle, throttleStopEnabled: true };
    const result = markProUsedIfNeeded(v, true) as any;
    expect(result.usesQuarterProFeatures).toBe(true);
  });

  it('PMI fields flip the flag', () => {
    const v = { ...basicVehicle, enginePMI: 3.0, transPMI: 0.5 };
    const result = markProUsedIfNeeded(v, true) as any;
    expect(result.usesQuarterProFeatures).toBe(true);
  });

  it('converter slippage flips the flag', () => {
    const v = { ...basicVehicle, converterSlippage: 0.12 };
    const result = markProUsedIfNeeded(v, true) as any;
    expect(result.usesQuarterProFeatures).toBe(true);
  });

  it('basic-only edits do NOT flip the flag (weight, HP, gears, name)', () => {
    const v = {
      ...basicVehicle,
      name: 'Renamed Car',
      weightLb: 3200,
      powerHP: 450,
      rearGear: 4.10,
      gearRatios: [2.48, 1.48, 1.0],
      shiftRPMs: [6000, 6000],
      rolloutIn: 14,
      tireDiaIn: 29,
      frontalAreaFt2: 22,
      converterStallRPM: 3500,
      converterLaunchRPM: 4200,
      fuelSystem: 'Gas+Carb',
      n2oEnabled: true,
      bodyStyle: 1,
      group: 'Test',
      notes: 'Some notes',
    };
    const result = markProUsedIfNeeded(v, true) as any;
    expect(result.usesQuarterProFeatures).toBeUndefined();
  });
});

// ── Schema validation for new fields ──────────────────────────────────

describe('Vehicle schema — new fields', () => {
  it('accepts usesQuarterProFeatures boolean', () => {
    const v = { ...basicVehicle, usesQuarterProFeatures: true };
    const result = VehicleSchema.safeParse(v);
    expect(result.success).toBe(true);
  });

  it('accepts savedEnvQuarter object', () => {
    const v = {
      ...basicVehicle,
      savedEnvQuarter: {
        elevation: 500,
        temperatureF: 85,
        barometerInHg: 29.80,
        humidityPct: 40,
        trackTempF: 120,
        windMph: 5,
      },
    };
    const result = VehicleSchema.safeParse(v);
    expect(result.success).toBe(true);
  });

  it('accepts lastSimQuarter object', () => {
    const v = {
      ...basicVehicle,
      lastSimQuarter: {
        lastRunAt: '2026-02-21T22:00:00Z',
        raceLengthFt: 1320,
        et_s: 6.82,
        mph: 201.8,
        sixty_ft_s: 1.05,
        sixty_ft_mph: 72.3,
      },
    };
    const result = VehicleSchema.safeParse(v);
    expect(result.success).toBe(true);
  });

  it('omitting new fields still validates (backward compat)', () => {
    const result = VehicleSchema.safeParse(basicVehicle);
    expect(result.success).toBe(true);
  });
});
