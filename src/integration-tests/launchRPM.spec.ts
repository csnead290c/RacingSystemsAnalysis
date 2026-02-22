/**
 * Launch RPM integration tests
 * 
 * Verifies that converterLaunchRPM flows into the VB6 sim and affects results.
 */
import { describe, it, expect } from 'vitest';
import { simulateVB6Exact } from '../domain/physics/models/vb6Exact';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../domain/physics/fixtures/benchmark-configs';
import { fromVehicleToVB6Fixture } from '../dev/vb6/fromVehicle';
import { fixtureToSimInputs } from '../domain/physics/vb6/fixtures';

describe('Launch RPM — converter', () => {
  // SuperComp_Pro has converter with launchRPM=5000, stallRPM=5500
  const config = BENCHMARK_CONFIGS['SuperComp_Pro'];

  it('converterLaunchRPM maps through to vb6Vehicle.LaunchRPM', () => {
    validateBenchmarkConfig(config);
    const result = simulateVB6Exact({
      vehicle: config.vehicle as any,
      env: config.env,
      raceLength: 'QUARTER',
    } as any);

    const debugLaunchRPM = (result as any).debugData?.simParams?.launchRPM;
    expect(debugLaunchRPM).toBeDefined();
    // SuperComp_Pro has converter.launchRPM = 5000
    expect(debugLaunchRPM).toBe(5000);
  });

  it('changing converterLaunchRPM changes ET (smoke test)', () => {
    validateBenchmarkConfig(config);

    // Run with default launchRPM (5000)
    const result1 = simulateVB6Exact({
      vehicle: config.vehicle as any,
      env: config.env,
      raceLength: 'QUARTER',
    } as any);

    // Run with higher launchRPM (6500) — should change launch behavior
    const modifiedVehicle = {
      ...config.vehicle,
      converter: {
        ...config.vehicle.converter!,
        launchRPM: 6500,
      },
    };
    const result2 = simulateVB6Exact({
      vehicle: modifiedVehicle as any,
      env: config.env,
      raceLength: 'QUARTER',
    } as any);

    const et1 = result1.timeslip[result1.timeslip.length - 1]?.t_s ?? 0;
    const et2 = result2.timeslip[result2.timeslip.length - 1]?.t_s ?? 0;

    // Both should produce valid ETs
    expect(et1).toBeGreaterThan(0);
    expect(et2).toBeGreaterThan(0);

    // ETs should differ — different launch RPM means different launch torque
    expect(et1).not.toBeCloseTo(et2, 2);
  });

  it('vehicle with converterLaunchRPM flows through fromVehicleToVB6Fixture into sim', () => {
    // Simulate a user-created vehicle with converterLaunchRPM set
    const userVehicle = {
      id: 'test',
      name: 'Test Converter Car',
      weightLb: 3000,
      tireDiaIn: 28,
      rearGear: 3.73,
      rolloutIn: 12,
      powerHP: 400,
      defaultRaceLength: 'QUARTER' as const,
      transmissionType: 'converter' as const,
      converterStallRPM: 3500,
      converterLaunchRPM: 4200,
      gearRatios: [2.48, 1.48, 1],
      shiftRPMs: [5500, 5500],
    };

    const fixture = fromVehicleToVB6Fixture(userVehicle as any);
    const simInputs = fixtureToSimInputs(fixture, 'QUARTER');

    // Run sim and verify the launch RPM was used
    const result = simulateVB6Exact(simInputs as any);
    const debugLaunchRPM = (result as any).debugData?.simParams?.launchRPM;
    // Should use the user-specified 4200, not fall back to stall (3500)
    expect(debugLaunchRPM).toBe(4200);
  });
});
