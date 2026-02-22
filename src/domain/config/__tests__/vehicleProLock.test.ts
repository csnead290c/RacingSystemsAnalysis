import { describe, it, expect } from 'vitest';
import { isVehicleProLocked, hasProFields } from '../vehicleProLock';

describe('isVehicleProLocked', () => {
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
    editorMode: 'advanced' as const,
    hpCurve: [{ rpm: 3000, hp: 200 }, { rpm: 6000, hp: 400 }],
    cd: 0.45,
    liftCoeff: 0.15,
    enginePMI: 3.0,
    transPMI: 0.5,
    tiresPMI: 30,
    clutchLaunchRPM: 5500,
    clutchSlippage: 1.004,
    gearEfficiencies: [0.97, 0.99],
  };

  it('returns locked=false for Pro user regardless of vehicle', () => {
    const result = isVehicleProLocked(proVehicle, true);
    expect(result.locked).toBe(false);
    expect(result.proFields).toEqual([]);
  });

  it('returns locked=false for basic vehicle with basic user', () => {
    const result = isVehicleProLocked(basicVehicle, false);
    expect(result.locked).toBe(false);
    expect(result.proFields).toEqual([]);
  });

  it('returns locked=true for pro vehicle with basic user', () => {
    const result = isVehicleProLocked(proVehicle, false);
    expect(result.locked).toBe(true);
    expect(result.proFields.length).toBeGreaterThan(0);
  });

  it('detects HP curve as Pro field', () => {
    const v = { ...basicVehicle, hpCurve: [{ rpm: 3000, hp: 200 }] };
    const result = isVehicleProLocked(v, false);
    expect(result.locked).toBe(true);
    expect(result.proFields).toContain('HP curve');
  });

  it('detects advanced editor mode as Pro field', () => {
    const v = { ...basicVehicle, editorMode: 'advanced' as const };
    const result = isVehicleProLocked(v, false);
    expect(result.locked).toBe(true);
    expect(result.proFields).toContain('Advanced editor mode');
  });

  it('detects PMI fields as Pro', () => {
    const v = { ...basicVehicle, enginePMI: 3.0 };
    const result = isVehicleProLocked(v, false);
    expect(result.locked).toBe(true);
    expect(result.proFields).toContain('Engine PMI');
  });

  it('detects converter torque mult as Pro', () => {
    const v = { ...basicVehicle, converterTorqueMult: 2.0 };
    const result = isVehicleProLocked(v, false);
    expect(result.locked).toBe(true);
    expect(result.proFields).toContain('Converter torque mult');
  });

  it('detects throttle stop as Pro', () => {
    const v = { ...basicVehicle, throttleStopEnabled: true };
    const result = isVehicleProLocked(v, false);
    expect(result.locked).toBe(true);
    expect(result.proFields).toContain('Throttle stop');
  });

  it('detects drag coefficient as Pro', () => {
    const v = { ...basicVehicle, cd: 0.45 };
    const result = isVehicleProLocked(v, false);
    expect(result.locked).toBe(true);
    expect(result.proFields).toContain('Drag coefficient');
  });

  it('does not flag throttleStopEnabled=false as Pro', () => {
    const v = { ...basicVehicle, throttleStopEnabled: false };
    const result = isVehicleProLocked(v, false);
    expect(result.proFields).not.toContain('Throttle stop');
  });

  it('does not flag empty hpCurve as Pro', () => {
    const v = { ...basicVehicle, hpCurve: [] };
    const result = isVehicleProLocked(v, false);
    expect(result.proFields).not.toContain('HP curve');
  });

  it('lists multiple Pro fields when present', () => {
    const result = isVehicleProLocked(proVehicle, false);
    expect(result.proFields.length).toBeGreaterThanOrEqual(5);
  });
});

describe('hasProFields', () => {
  it('returns false for basic vehicle', () => {
    expect(hasProFields({ weightLb: 3000, tireDiaIn: 28 })).toBe(false);
  });

  it('returns true for vehicle with HP curve', () => {
    expect(hasProFields({ hpCurve: [{ rpm: 3000, hp: 200 }] })).toBe(true);
  });

  it('returns true for vehicle with PMI', () => {
    expect(hasProFields({ enginePMI: 3.0 })).toBe(true);
  });
});
