/**
 * VB6 Parity Tests - RSACLASSIC vs Quarter Pro/Jr Benchmarks
 * 
 * Tests our VB6-compatible physics implementation against legacy VB6 printout targets.
 * Uses exact vehicle configurations from Quarter Pro/Jr and validates:
 * - Final ET within ±0.05s (tight tolerance)
 * - Trap MPH within ±1.0 mph (tight tolerance)
 * - Per-split deltas for debugging
 * 
 * Note: "VB6" refers to the legacy printout targets, not a runtime VB6 engine.
 */

import { describe, it, expect } from 'vitest';
import { RSACLASSIC } from '../domain/physics/models/rsaclassic';
import { LEGACY_BENCHMARKS, type RaceLength } from '../domain/physics/fixtures/benchmarks';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../domain/physics/fixtures/benchmark-configs';
import type { SimInputs, SimResult } from '../domain/physics';
import type { ExtendedVehicle } from '../domain/physics';

/**
 * Tight tolerances for VB6 parity testing.
 */
const TIGHT_TOLERANCE = {
  ET_S: 0.05,   // ±0.05s for ET
  MPH: 1.0,     // ±1.0 mph for trap speed
};

/**
 * Build SimInputs from benchmark config.
 */
function buildSimInputs(
  configName: string,
  raceLength: RaceLength
): SimInputs {
  const config = BENCHMARK_CONFIGS[configName];
  
  if (!config) {
    throw new Error(`Benchmark config not found: ${configName}`);
  }

  // Validate config has all required VB6 parameters (NO DEFAULTS)
  validateBenchmarkConfig(config);

  // Build ExtendedVehicle from config (validation ensures required fields exist)
  const vehicle: ExtendedVehicle = {
    // Required base fields (validated - no defaults)
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
    
    // Required extended fields (validated - no defaults)
    torqueCurve: config.vehicle.torqueCurve,
    frontalArea_ft2: config.vehicle.frontalArea_ft2,
    cd: config.vehicle.cd,
    gearRatios: config.vehicle.gearRatios,
    shiftRPM: config.vehicle.shiftRPM,
    
    // Optional extended fields
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

/**
 * Format split comparison table.
 */
function formatSplitTable(
  result: SimResult,
  vb6ET: number,
  vb6MPH: number
): string {
  const lines: string[] = [];
  
  lines.push('\n=== VB6 PARITY SPLIT COMPARISON ===\n');
  lines.push('| Distance | t_VB6  | t_TS   | Δt     | v_VB6  | v_TS   | Δv    |');
  lines.push('|----------|--------|--------|--------|--------|--------|-------|');
  
  // Add timeslip points
  for (const point of result.timeslip) {
    const d_ft = point.d_ft;
    const t_ts = point.t_s;
    const v_ts = point.v_mph;
    
    // We don't have per-split VB6 times, so show "N/A" for intermediate splits
    // Only show VB6 values for final split
    const isFinal = d_ft >= (result.timeslip[result.timeslip.length - 1]?.d_ft ?? 0) - 1;
    const t_vb6 = isFinal ? vb6ET : 0;
    const v_vb6 = isFinal ? vb6MPH : 0;
    
    const dt = isFinal ? t_ts - t_vb6 : 0;
    const dv = isFinal ? v_ts - v_vb6 : 0;
    
    const t_vb6_str = isFinal ? t_vb6.toFixed(3) : 'N/A   ';
    const v_vb6_str = isFinal ? v_vb6.toFixed(1) : 'N/A   ';
    const dt_str = isFinal ? (dt >= 0 ? '+' : '') + dt.toFixed(3) : 'N/A   ';
    const dv_str = isFinal ? (dv >= 0 ? '+' : '') + dv.toFixed(1) : 'N/A  ';
    
    lines.push(
      `| ${d_ft.toString().padStart(4)}' | ${t_vb6_str} | ${t_ts.toFixed(3)} | ${dt_str} | ${v_vb6_str} | ${v_ts.toFixed(1).padStart(6)} | ${dv_str} |`
    );
  }
  
  lines.push('');
  lines.push('Legend: VB6 = Quarter Pro/Jr target, TS = TypeScript simulation, Δ = difference');
  lines.push('Note: Intermediate VB6 splits not available in benchmark data');
  
  return lines.join('\n');
}

/**
 * Format early trace comparison (first 200ms).
 */
function formatEarlyTrace(result: SimResult): string {
  if (!result.traces || result.traces.length === 0) {
    return '\n(No trace data available)\n';
  }
  
  const lines: string[] = [];
  lines.push('\n=== EARLY TRACE (First 200ms) ===\n');
  lines.push('| t_s   | s_ft  | v_mph | a_g  | rpm   | gear |');
  lines.push('|-------|-------|-------|------|-------|------|');
  
  // Show first 200ms of trace data
  const earlyTraces = result.traces.filter(t => t.t_s <= 0.2);
  
  // Sample every ~20ms to keep output manageable
  const sampleInterval = Math.max(1, Math.floor(earlyTraces.length / 10));
  
  for (let i = 0; i < earlyTraces.length; i += sampleInterval) {
    const trace = earlyTraces[i];
    lines.push(
      `| ${trace.t_s.toFixed(3)} | ${trace.s_ft.toFixed(1).padStart(5)} | ${trace.v_mph.toFixed(1).padStart(5)} | ${trace.a_g.toFixed(2)} | ${Math.round(trace.rpm).toString().padStart(5)} | ${trace.gear}    |`
    );
  }
  
  lines.push('');
  return lines.join('\n');
}

/**
 * Test a single benchmark case.
 */
function testBenchmarkCase(
  benchmarkName: string,
  raceLength: RaceLength,
  expectedET: number,
  expectedMPH: number
) {
  it(`${benchmarkName} - ${raceLength} - ET=${expectedET}s, MPH=${expectedMPH}`, () => {
    // Build inputs
    const inputs = buildSimInputs(benchmarkName, raceLength);
    
    // Run simulation
    const result = RSACLASSIC.simulate(inputs);
    
    // Extract results
    const actualET = result.et_s;
    const actualMPH = result.mph;
    
    // Calculate deltas
    const etDelta = actualET - expectedET;
    const mphDelta = actualMPH - expectedMPH;
    
    // Check if within tight tolerance
    const etPass = Math.abs(etDelta) <= TIGHT_TOLERANCE.ET_S;
    const mphPass = Math.abs(mphDelta) <= TIGHT_TOLERANCE.MPH;
    
    // If failed, dump detailed comparison
    if (!etPass || !mphPass) {
      console.log(`\n❌ FAILED: ${benchmarkName} - ${raceLength}`);
      console.log(`Expected: ET=${expectedET}s, MPH=${expectedMPH}`);
      console.log(`Actual:   ET=${actualET.toFixed(3)}s, MPH=${actualMPH.toFixed(1)}`);
      console.log(`Delta:    ΔET=${etDelta >= 0 ? '+' : ''}${etDelta.toFixed(3)}s, ΔMPH=${mphDelta >= 0 ? '+' : ''}${mphDelta.toFixed(1)}`);
      console.log(`Tolerance: ±${TIGHT_TOLERANCE.ET_S}s, ±${TIGHT_TOLERANCE.MPH}mph`);
      
      // Dump split table
      console.log(formatSplitTable(result, expectedET, expectedMPH));
      
      // Dump early trace
      console.log(formatEarlyTrace(result));
      
      // Dump metadata
      if (result.meta.vb6) {
        console.log('\n=== VB6 METADATA ===');
        console.log(`dt_s: ${result.meta.vb6.dt_s}`);
        console.log(`trapMode: ${result.meta.vb6.trapMode}`);
        console.log(`windowsFt: ${JSON.stringify(result.meta.vb6.windowsFt, null, 2)}`);
      }
      
      if (result.meta.warnings.length > 0) {
        console.log('\n=== WARNINGS ===');
        result.meta.warnings.forEach(w => console.log(`- ${w}`));
      }
    } else {
      console.log(`✅ PASSED: ${benchmarkName} - ${raceLength} (ΔET=${etDelta >= 0 ? '+' : ''}${etDelta.toFixed(3)}s, ΔMPH=${mphDelta >= 0 ? '+' : ''}${mphDelta.toFixed(1)}mph)`);
    }
    
    // Assert
    expect(etPass, `ET delta ${etDelta.toFixed(3)}s exceeds tolerance ±${TIGHT_TOLERANCE.ET_S}s`).toBe(true);
    expect(mphPass, `MPH delta ${mphDelta.toFixed(1)}mph exceeds tolerance ±${TIGHT_TOLERANCE.MPH}mph`).toBe(true);
  });
}

/**
 * Main test suite.
 */
describe('VB6 Parity - RSACLASSIC vs Quarter Pro/Jr', () => {
  describe('Quarter Pro Benchmarks', () => {
    const proBenchmarks = LEGACY_BENCHMARKS.filter(b => b.source === 'QuarterPro');
    
    for (const benchmark of proBenchmarks) {
      describe(benchmark.name, () => {
        // Test EIGHTH if available
        if (benchmark.raceLengthTargets.EIGHTH) {
          const target = benchmark.raceLengthTargets.EIGHTH;
          testBenchmarkCase(benchmark.name, 'EIGHTH', target.et_s, target.mph);
        }
        
        // Test QUARTER if available
        if (benchmark.raceLengthTargets.QUARTER) {
          const target = benchmark.raceLengthTargets.QUARTER;
          testBenchmarkCase(benchmark.name, 'QUARTER', target.et_s, target.mph);
        }
      });
    }
  });
  
  describe('Quarter Jr Benchmarks', () => {
    const jrBenchmarks = LEGACY_BENCHMARKS.filter(b => b.source === 'QuarterJr');
    
    for (const benchmark of jrBenchmarks) {
      describe(benchmark.name, () => {
        // Test EIGHTH if available
        if (benchmark.raceLengthTargets.EIGHTH) {
          const target = benchmark.raceLengthTargets.EIGHTH;
          testBenchmarkCase(benchmark.name, 'EIGHTH', target.et_s, target.mph);
        }
        
        // Test QUARTER if available
        if (benchmark.raceLengthTargets.QUARTER) {
          const target = benchmark.raceLengthTargets.QUARTER;
          testBenchmarkCase(benchmark.name, 'QUARTER', target.et_s, target.mph);
        }
      });
    }
  });
  
  describe('Trap Speed Windows', () => {
    it('should calculate trap speeds using VB6 method (time-averaged)', () => {
      // Use ProStock_Pro as test case
      const inputs = buildSimInputs('ProStock_Pro', 'QUARTER');
      const result = RSACLASSIC.simulate(inputs);
      
      // Verify trap speed metadata
      expect(result.meta.vb6?.trapMode).toBe('time');
      expect(result.meta.vb6?.windowsFt.eighth).toEqual({
        start: 594,
        end: 660,
        distance: 66,
      });
      expect(result.meta.vb6?.windowsFt.quarter).toEqual({
        start: 1254,
        end: 1320,
        distance: 66,
      });
      
      // Verify trap speeds are calculated
      if (result.meta.windowMPH) {
        expect(result.meta.windowMPH.e660_mph).toBeGreaterThan(0);
        expect(result.meta.windowMPH.q1320_mph).toBeGreaterThan(0);
      }
    });
  });
  
  describe('Rollout Behavior', () => {
    it('should start ET clock after rollout distance', () => {
      const inputs = buildSimInputs('ProStock_Pro', 'QUARTER');
      const result = RSACLASSIC.simulate(inputs);
      
      // Verify rollout metadata
      expect(result.meta.rollout).toBeDefined();
      expect(result.meta.rollout?.rolloutIn).toBeGreaterThan(0);
      expect(result.meta.rollout?.t_roll_s).toBeGreaterThan(0);
      
      // Verify VB6 rollout behavior documented
      expect(result.meta.vb6?.rolloutBehavior).toContain('ET clock starts after rollout distance');
    });
  });
  
  describe('VB6 Metadata', () => {
    it('should include VB6 compatibility metadata', () => {
      const inputs = buildSimInputs('ProStock_Pro', 'QUARTER');
      const result = RSACLASSIC.simulate(inputs);
      
      // Verify VB6 metadata exists
      expect(result.meta.vb6).toBeDefined();
      expect(result.meta.vb6?.dt_s).toBe(0.002);
      expect(result.meta.vb6?.trapMode).toBe('time');
      expect(result.meta.vb6?.timeslipPoints).toEqual([60, 330, 660, 1000, 1320]);
    });
  });
});
