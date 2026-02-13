/**
 * THEN vs NOW — Locked fixture comparison.
 * Runs the SuperGas Pro fixture through simulateVB6Exact directly
 * and prints ET + MPH + key splits for comparison.
 *
 * Uses the same input shape as vb6.parity.spec.ts (ExtendedVehicle + camelCase env).
 */
import { describe, it, expect } from 'vitest';
import { simulateVB6Exact } from '../domain/physics/models/vb6Exact';
import type { SimInputs } from '../domain/physics';

// SuperGas Pro fixture data (from pro-supergas.vb6.json)
const FIX = {
  vb6: { quarter: { et_s: 9.90, mph: 135.1 }, eighth: { et_s: 6.27, mph: 108.2 } },
  env: { elevation_ft: 850, barometer_inHg: 29.92, temperature_F: 77, relHumidity_pct: 30, wind_mph: 0, trackTemp_F: 102, tractionIndex: 5 },
  vehicle: { weight_lb: 2300, wheelbase_in: 103, overhang_in: 30, rollout_in: 12, tireDiaIn: 32.4, tireWidthIn: 14.4 },
  aero: { frontalArea_ft2: 22.1, Cd: 0.400, Cl: 0.250 },
  drivetrain: { finalDrive: 5.14, overallEfficiency: 0.970, gearRatios: [1.76, 1.00], perGearEff: [0.970, 0.990], shiftRPM: [7600, 100], converter: { launchRPM: 5000, stallRPM: 5500, slippageFactor: 1.060, torqueMult: 1.70, lockup: false } },
  engineHP: [[3500,267],[4500,351],[5500,432],[6500,491],[7000,500],[7500,468],[8000,421],[10000,72],[10500,73],[11000,73],[11500,72]] as [number,number][],
  pmi: { engine_flywheel_clutch: 3.26, transmission_driveshaft: 0.511, tires_wheels_ringgear: 52.7 },
};

function buildSimInputs(raceLength: 'QUARTER' | 'EIGHTH'): SimInputs {
  // Match the shape used by vb6.parity.spec.ts — ExtendedVehicle with camelCase env
  return {
    vehicle: {
      id: 'supergas_test',
      name: 'SuperGas_Pro',
      weightLb: FIX.vehicle.weight_lb,
      tireDiaIn: FIX.vehicle.tireDiaIn,
      tireWidthIn: FIX.vehicle.tireWidthIn,
      rearGear: FIX.drivetrain.finalDrive,
      rolloutIn: FIX.vehicle.rollout_in,
      powerHP: 500,
      defaultRaceLength: raceLength,
      // Extended fields
      torqueCurve: FIX.engineHP.map(([rpm, hp]) => ({ rpm, hp })),
      frontalArea_ft2: FIX.aero.frontalArea_ft2,
      cd: FIX.aero.Cd,
      gearRatios: FIX.drivetrain.gearRatios,
      shiftRPM: FIX.drivetrain.shiftRPM,
      wheelbaseIn: FIX.vehicle.wheelbase_in,
      overhangIn: FIX.vehicle.overhang_in,
      liftCoeff: FIX.aero.Cl,
      finalDrive: FIX.drivetrain.finalDrive,
      transEff: FIX.drivetrain.overallEfficiency,
      gearEff: FIX.drivetrain.perGearEff,
      pmi: FIX.pmi,
      converter: FIX.drivetrain.converter,
    },
    env: {
      elevation: FIX.env.elevation_ft,
      barometerInHg: FIX.env.barometer_inHg,
      temperatureF: FIX.env.temperature_F,
      humidityPct: FIX.env.relHumidity_pct,
      trackTempF: FIX.env.trackTemp_F,
      tractionIndex: FIX.env.tractionIndex,
      windMph: FIX.env.wind_mph,
    },
    raceLength,
  } as any;
}

describe('THEN vs NOW — SuperGas Pro', () => {
  it('QUARTER — print ET/MPH/splits', () => {
    const input = buildSimInputs('QUARTER');
    const result = simulateVB6Exact(input);
    
    const vb6Target = { et_s: 9.90, mph: 135.1 };
    
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  THEN vs NOW — SuperGas Pro QUARTER              ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  VB6 Target:  ET=${vb6Target.et_s.toFixed(3)}s  MPH=${vb6Target.mph.toFixed(1)}     ║`);
    console.log(`║  NOW Output:  ET=${result.et_s.toFixed(3)}s  MPH=${result.mph.toFixed(1)}     ║`);
    console.log(`║  Delta:       ΔET=${(result.et_s - vb6Target.et_s).toFixed(3)}s  ΔMPH=${(result.mph - vb6Target.mph).toFixed(1)}     ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    
    // Print timeslip splits
    const ts = result.timeslip ?? [];
    for (const split of ts) {
      console.log(`║  ${String(split.d_ft).padStart(6)}ft: t=${split.t_s.toFixed(3)}s  v=${split.v_mph.toFixed(1)}mph  ║`);
    }
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    expect(result.et_s).toBeGreaterThan(0);
    expect(result.mph).toBeGreaterThan(0);
  });

  it('EIGHTH — print ET/MPH/splits', () => {
    const input = buildSimInputs('EIGHTH');
    const result = simulateVB6Exact(input);
    
    const vb6Target = { et_s: 6.27, mph: 108.2 };
    
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  THEN vs NOW — SuperGas Pro EIGHTH               ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  VB6 Target:  ET=${vb6Target.et_s.toFixed(3)}s  MPH=${vb6Target.mph.toFixed(1)}     ║`);
    console.log(`║  NOW Output:  ET=${result.et_s.toFixed(3)}s  MPH=${result.mph.toFixed(1)}     ║`);
    console.log(`║  Delta:       ΔET=${(result.et_s - vb6Target.et_s).toFixed(3)}s  ΔMPH=${(result.mph - vb6Target.mph).toFixed(1)}     ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    
    const ts = result.timeslip ?? [];
    for (const split of ts) {
      console.log(`║  ${String(split.d_ft).padStart(6)}ft: t=${split.t_s.toFixed(3)}s  v=${split.v_mph.toFixed(1)}mph  ║`);
    }
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    expect(result.et_s).toBeGreaterThan(0);
    expect(result.mph).toBeGreaterThan(0);
  });
});
