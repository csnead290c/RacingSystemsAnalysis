/**
 * Smoke test for fromVehicleToVB6Fixture adapter.
 * Verifies the adapter produces valid VB6 fixture structure.
 */

import { describe, it, expect } from 'vitest';
import { fromVehicleToVB6Fixture, validateAdapterOutput, type Vehicle } from '../dev/vb6/fromVehicle';

describe('fromVehicleToVB6Fixture adapter', () => {
  it('converts a minimal vehicle to VB6 fixture', () => {
    const v: Vehicle = {
      id: 't1',
      weightLb: 2350,
      drivetrain: {
        gearRatios: [2.6, 1.9, 1.5, 1.2, 1.0],
        finalDrive: 4.11,
        shiftsRPM: [9000, 9000, 9000, 9000],
      },
      engineParams: {
        powerHP: [
          { rpm: 7000, hp: 1000 },
          { rpm: 9000, hp: 1120 },
        ],
      },
    };

    const fixture = fromVehicleToVB6Fixture(v);

    // engineHP should be tuples
    expect(fixture.engineHP.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(fixture.engineHP[0])).toBe(true);
    expect(fixture.engineHP[0][0]).toBe(7000); // rpm
    expect(fixture.engineHP[0][1]).toBe(1000); // hp

    // drivetrain should have both gearRatios and ratios
    expect(fixture.drivetrain.gearRatios.length).toBeGreaterThan(0);
    expect((fixture.drivetrain as any).ratios.length).toBeGreaterThan(0);
    expect(fixture.drivetrain.gearRatios).toEqual([2.6, 1.9, 1.5, 1.2, 1.0]);

    // shiftRPM should be copied from shiftsRPM
    expect((fixture.drivetrain as any).shiftRPM).toBeDefined();
    expect((fixture.drivetrain as any).shiftRPM).toEqual([9000, 9000, 9000, 9000]);
    expect(fixture.drivetrain.shiftsRPM).toEqual([9000, 9000, 9000, 9000]);

    // finalDrive should be preserved
    expect(fixture.drivetrain.finalDrive).toBe(4.11);

    // weight should be preserved
    expect(fixture.vehicle.weight_lb).toBe(2350);
  });

  it('applies sensible defaults for sparse vehicle', () => {
    const v: Vehicle = {
      id: 't2',
      engineParams: {
        powerHP: [
          { rpm: 5000, hp: 500 },
          { rpm: 7000, hp: 700 },
        ],
      },
    };

    const fixture = fromVehicleToVB6Fixture(v);

    // Defaults should be applied
    expect(fixture.vehicle.weight_lb).toBe(2400);
    expect(fixture.aero.frontalArea_ft2).toBe(22);
    expect(fixture.aero.Cd).toBe(0.35);
    expect(fixture.drivetrain.finalDrive).toBe(3.73);
    expect(fixture.drivetrain.overallEfficiency).toBe(0.97);

    // Default gear ratios
    expect(fixture.drivetrain.gearRatios).toEqual([2.6, 1.9, 1.5, 1.2, 1.0]);
  });

  it('converts torqueCurve to engineHP', () => {
    const v: Vehicle = {
      id: 't3',
      engineParams: {
        torqueCurve: [
          { rpm: 5000, torque: 400 }, // hp = 400 * 5000 / 5252 ≈ 380.8
          { rpm: 6000, torque: 420 }, // hp = 420 * 6000 / 5252 ≈ 479.8
        ],
      },
    };

    const fixture = fromVehicleToVB6Fixture(v);

    expect(fixture.engineHP.length).toBe(2);
    expect(fixture.engineHP[0][0]).toBe(5000);
    expect(fixture.engineHP[0][1]).toBeCloseTo(380.8, 0);
    expect(fixture.engineHP[1][0]).toBe(6000);
    expect(fixture.engineHP[1][1]).toBeCloseTo(479.8, 0);
  });

  it('converts legacy engineHP format', () => {
    const v: Vehicle = {
      id: 't4',
      engineHP: [
        [7000, 1000],
        [8000, 1100],
        [9000, 1150],
      ],
    };

    const fixture = fromVehicleToVB6Fixture(v);

    expect(fixture.engineHP.length).toBe(3);
    expect(fixture.engineHP[0]).toEqual([7000, 1000]);
    expect(fixture.engineHP[1]).toEqual([8000, 1100]);
    expect(fixture.engineHP[2]).toEqual([9000, 1150]);
  });

  it('throws when no usable power curve', () => {
    const v: Vehicle = {
      id: 't5',
      // No engine data
    };

    expect(() => fromVehicleToVB6Fixture(v)).toThrow('missing usable power curve');
  });

  it('passes through clutch configuration', () => {
    const v: Vehicle = {
      id: 't6',
      drivetrain: {
        clutch: {
          slipRPM: 7500,
          launchRPM: 7200,
        },
      },
      engineParams: {
        powerHP: [
          { rpm: 7000, hp: 1000 },
          { rpm: 9000, hp: 1120 },
        ],
      },
    };

    const fixture = fromVehicleToVB6Fixture(v);

    expect(fixture.drivetrain.clutch).toBeDefined();
    expect(fixture.drivetrain.clutch?.slipRPM).toBe(7500);
    expect(fixture.drivetrain.clutch?.launchRPM).toBe(7200);
    expect(fixture.drivetrain.converter).toBeUndefined();
  });

  it('passes through converter configuration', () => {
    const v: Vehicle = {
      id: 't7',
      drivetrain: {
        converter: {
          stallRPM: 5000,
        },
      },
      engineParams: {
        powerHP: [
          { rpm: 5000, hp: 800 },
          { rpm: 7000, hp: 1000 },
        ],
      },
    };

    const fixture = fromVehicleToVB6Fixture(v);

    expect(fixture.drivetrain.converter).toBeDefined();
    expect(fixture.drivetrain.converter?.stallRPM).toBe(5000);
    expect(fixture.drivetrain.clutch).toBeUndefined();
  });

  it('converts tq_lbft field in torqueCurve', () => {
    const v: Vehicle = {
      id: 't8',
      engineParams: {
        torqueCurve: [
          { rpm: 5000, tq_lbft: 400 }, // hp = 400 * 5000 / 5252 ≈ 380.8
          { rpm: 6000, tq_lbft: 420 }, // hp = 420 * 6000 / 5252 ≈ 479.8
        ],
      },
    };

    const fixture = fromVehicleToVB6Fixture(v);

    expect(fixture.engineHP.length).toBe(2);
    expect(fixture.engineHP[0][0]).toBe(5000);
    expect(fixture.engineHP[0][1]).toBeCloseTo(380.8, 0);
  });
});

describe('validateAdapterOutput', () => {
  it('passes for valid fixture', () => {
    const v: Vehicle = {
      id: 'v1',
      weightLb: 2400,
      drivetrain: {
        gearRatios: [2.6, 1.9, 1.5],
        finalDrive: 3.73,
      },
      engineParams: {
        powerHP: [
          { rpm: 5000, hp: 500 },
          { rpm: 7000, hp: 700 },
        ],
      },
    };

    const fixture = fromVehicleToVB6Fixture(v);
    const result = validateAdapterOutput(fixture);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails for missing engineHP', () => {
    // Create a fixture manually with missing engineHP
    const fixture = {
      env: { elevation_ft: 0, barometer_inHg: 29.92, temperature_F: 75, relHumidity_pct: 50, wind_mph: 0, wind_angle_deg: 0, trackTemp_F: 100, tractionIndex: 3 },
      vehicle: { weight_lb: 2400, wheelbase_in: 108, overhang_in: 40, rollout_in: 9, tire: { rollout_in: 88, width_in: 14 } },
      aero: { frontalArea_ft2: 22, Cd: 0.35, Cl: 0.1 },
      drivetrain: { finalDrive: 3.73, overallEfficiency: 0.97, gearRatios: [2.6], perGearEff: [0.99], shiftsRPM: [] },
      pmi: { engine_flywheel_clutch: 3.5, transmission_driveshaft: 0.25, tires_wheels_ringgear: 50 },
      engineHP: [], // Empty!
      fuel: { type: 'Gasoline', hpTorqueMultiplier: 1 },
    } as any;

    const result = validateAdapterOutput(fixture);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('engineHP must have at least 2 points');
  });

  it('fails for invalid tire diameter', () => {
    const v: Vehicle = {
      id: 'v2',
      tireDiaIn: 40, // Too big!
      engineParams: {
        powerHP: [
          { rpm: 5000, hp: 500 },
          { rpm: 7000, hp: 700 },
        ],
      },
    };

    const fixture = fromVehicleToVB6Fixture(v);
    const result = validateAdapterOutput(fixture);

    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('tire diameter'))).toBe(true);
  });
});
