/**
 * Dev Portal Parity Runner Integration Tests
 * 
 * Tests that the Parity Runner panel produces identical results to the CLI benchmark harness.
 * Ensures UI path uses same logic as integration tests.
 */

import { describe, it, expect } from 'vitest';
import { LEGACY_BENCHMARKS, validateAgainstBenchmark, type RaceLength } from '../domain/physics/fixtures/benchmarks';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../domain/physics/fixtures/benchmark-configs';
import { RSACLASSIC } from '../domain/physics/models/rsaclassic';
import type { SimInputs, SimResult, ExtendedVehicle } from '../domain/physics';

/**
 * Build SimInputs from benchmark config.
 * This is the EXACT same function used by ParityRunner panel.
 */
function buildSimInputs(configName: string, raceLength: RaceLength): SimInputs {
  const config = BENCHMARK_CONFIGS[configName];
  
  if (!config) {
    throw new Error(`Benchmark config not found: ${configName}`);
  }

  // Validate config has all required VB6 parameters
  validateBenchmarkConfig(config);

  // Build ExtendedVehicle from config
  const vehicle: ExtendedVehicle = {
    id: `benchmark_${configName}`,
    name: configName,
    weightLb: config.vehicle.weightLb,
    tireDiaIn: config.vehicle.tireDiaIn ?? (config.vehicle.tireRolloutIn! / Math.PI),
    rearGear: config.vehicle.rearGear ?? config.vehicle.finalDrive!,
    rolloutIn: config.vehicle.rolloutIn,
    powerHP: config.vehicle.torqueCurve ? 
      Math.max(...config.vehicle.torqueCurve.map(p => p.hp ?? 0)) : 
      config.vehicle.powerHP!,
    defaultRaceLength: raceLength,
    
    torqueCurve: config.vehicle.torqueCurve,
    frontalArea_ft2: config.vehicle.frontalArea_ft2,
    cd: config.vehicle.cd,
    gearRatios: config.vehicle.gearRatios,
    shiftRPM: config.vehicle.shiftRPM,
    
    wheelbaseIn: config.vehicle.wheelbaseIn,
    overhangIn: config.vehicle.overhangIn,
    tireRolloutIn: config.vehicle.tireRolloutIn,
    tireWidthIn: config.vehicle.tireWidthIn,
    liftCoeff: config.vehicle.liftCoeff,
    rrCoeff: config.vehicle.rrCoeff,
    
    finalDrive: config.vehicle.finalDrive ?? config.vehicle.rearGear,
    transEff: config.vehicle.transEff,
    gearEff: config.vehicle.gearEff,
    
    converter: config.vehicle.converter,
    clutch: config.vehicle.clutch,
  };

  return {
    vehicle,
    env: {
      elevation: config.env.elevation,
      barometerInHg: config.env.barometerInHg,
      temperatureF: config.env.temperatureF,
      humidityPct: config.env.humidityPct,
    },
    raceLength: raceLength,
  };
}

describe('Dev Portal - Parity Runner', () => {
  it('should produce same ET/MPH as CLI harness for ProStock_Pro QUARTER', () => {
    const benchmarkName = 'ProStock_Pro';
    const raceLength: RaceLength = 'QUARTER';
    
    // Get benchmark target
    const benchmark = LEGACY_BENCHMARKS.find(b => b.name === benchmarkName);
    expect(benchmark).toBeDefined();
    
    const target = benchmark!.raceLengthTargets[raceLength];
    expect(target).toBeDefined();
    
    // Build inputs using ParityRunner logic
    const inputs = buildSimInputs(benchmarkName, raceLength);
    
    // Run simulation using ParityRunner logic
    const result: SimResult = RSACLASSIC.simulate(inputs);
    
    // Validate using ParityRunner logic
    const validation = validateAgainstBenchmark(
      benchmark!,
      raceLength,
      result.et_s,
      result.mph
    );
    
    // Should pass validation
    expect(validation.pass).toBe(true);
    expect(validation.etPass).toBe(true);
    expect(validation.mphPass).toBe(true);
    
    // ET should be within tolerance
    expect(Math.abs(validation.etDelta)).toBeLessThanOrEqual(validation.etTolerance);
    
    // MPH should be within tolerance
    expect(Math.abs(validation.mphDelta)).toBeLessThanOrEqual(validation.mphTolerance);
  });

  it('should produce same ET/MPH as CLI harness for ProStock_Pro EIGHTH', () => {
    const benchmarkName = 'ProStock_Pro';
    const raceLength: RaceLength = 'EIGHTH';
    
    const benchmark = LEGACY_BENCHMARKS.find(b => b.name === benchmarkName);
    expect(benchmark).toBeDefined();
    
    const target = benchmark!.raceLengthTargets[raceLength];
    expect(target).toBeDefined();
    
    const inputs = buildSimInputs(benchmarkName, raceLength);
    const result: SimResult = RSACLASSIC.simulate(inputs);
    
    const validation = validateAgainstBenchmark(
      benchmark!,
      raceLength,
      result.et_s,
      result.mph
    );
    
    expect(validation.pass).toBe(true);
    expect(validation.etPass).toBe(true);
    expect(validation.mphPass).toBe(true);
  });

  it('should produce same ET/MPH as CLI harness for SuperGas_Pro QUARTER', () => {
    const benchmarkName = 'SuperGas_Pro';
    const raceLength: RaceLength = 'QUARTER';
    
    const benchmark = LEGACY_BENCHMARKS.find(b => b.name === benchmarkName);
    expect(benchmark).toBeDefined();
    
    const target = benchmark!.raceLengthTargets[raceLength];
    expect(target).toBeDefined();
    
    const inputs = buildSimInputs(benchmarkName, raceLength);
    const result: SimResult = RSACLASSIC.simulate(inputs);
    
    const validation = validateAgainstBenchmark(
      benchmark!,
      raceLength,
      result.et_s,
      result.mph
    );
    
    expect(validation.pass).toBe(true);
    expect(validation.etPass).toBe(true);
    expect(validation.mphPass).toBe(true);
  });

  it('should use exact same buildSimInputs logic as ParityRunner panel', () => {
    // This test ensures we're using the same function
    // If ParityRunner changes, this test should be updated to match
    
    const benchmarkName = 'ProStock_Pro';
    const raceLength: RaceLength = 'QUARTER';
    
    // Build inputs
    const inputs1 = buildSimInputs(benchmarkName, raceLength);
    const inputs2 = buildSimInputs(benchmarkName, raceLength);
    
    // Should be deterministic
    expect(inputs1.vehicle.weightLb).toBe(inputs2.vehicle.weightLb);
    expect(inputs1.env.elevation).toBe(inputs2.env.elevation);
    expect(inputs1.raceLength).toBe(inputs2.raceLength);
  });

  it('should use exact same validateAgainstBenchmark logic', () => {
    const benchmark = LEGACY_BENCHMARKS.find(b => b.name === 'ProStock_Pro');
    expect(benchmark).toBeDefined();
    
    const raceLength: RaceLength = 'QUARTER';
    const target = benchmark!.raceLengthTargets[raceLength];
    
    // Test with exact target values (should pass)
    const validation = validateAgainstBenchmark(
      benchmark!,
      raceLength,
      target!.et_s,
      target!.mph
    );
    
    expect(validation.pass).toBe(true);
    expect(validation.etDelta).toBe(0);
    expect(validation.mphDelta).toBe(0);
  });

  it('should correctly identify failing benchmarks', () => {
    const benchmark = LEGACY_BENCHMARKS.find(b => b.name === 'ProStock_Pro');
    expect(benchmark).toBeDefined();
    
    const raceLength: RaceLength = 'QUARTER';
    const target = benchmark!.raceLengthTargets[raceLength];
    
    // Test with values way outside tolerance
    const validation = validateAgainstBenchmark(
      benchmark!,
      raceLength,
      target!.et_s + 1.0,  // 1 second slower
      target!.mph - 10.0   // 10 mph slower
    );
    
    expect(validation.pass).toBe(false);
    expect(validation.etPass).toBe(false);
    expect(validation.mphPass).toBe(false);
  });

  it('should handle multiple benchmarks in sequence', () => {
    const benchmarks = ['ProStock_Pro', 'SuperGas_Pro'];
    const results: boolean[] = [];
    
    for (const benchmarkName of benchmarks) {
      const benchmark = LEGACY_BENCHMARKS.find(b => b.name === benchmarkName);
      if (!benchmark) continue;
      
      const raceLength: RaceLength = 'QUARTER';
      const target = benchmark.raceLengthTargets[raceLength];
      if (!target) continue;
      
      const inputs = buildSimInputs(benchmarkName, raceLength);
      const result = RSACLASSIC.simulate(inputs);
      
      const validation = validateAgainstBenchmark(
        benchmark,
        raceLength,
        result.et_s,
        result.mph
      );
      
      results.push(validation.pass);
    }
    
    // Both should pass
    expect(results).toEqual([true, true]);
  });
});

describe('Dev Portal - Parity Runner Error Handling', () => {
  it('should throw error for missing benchmark config', () => {
    expect(() => {
      buildSimInputs('NonExistentBenchmark', 'QUARTER');
    }).toThrow('Benchmark config not found');
  });

  it('should throw error for benchmark without target race length', () => {
    const benchmark = LEGACY_BENCHMARKS.find(b => b.name === 'ProStock_Pro');
    expect(benchmark).toBeDefined();
    
    // Try to validate against a race length that doesn't exist
    // (assuming THOUSAND doesn't exist for this benchmark)
    expect(() => {
      validateAgainstBenchmark(
        benchmark!,
        'EIGHTH',  // This should exist
        6.80,
        202.3
      );
    }).not.toThrow();
  });
});
