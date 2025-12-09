/**
 * TA Dragster Exact Test
 * Tests the exact inputs shown in the website debug panel
 */

import { describe, it, expect } from 'vitest';
import { simulateVB6Exact } from '../domain/physics/models/vb6Exact';

describe('TA Dragster Exact Match', () => {
  it('should match website debug values', () => {
    // Exact values from website debug panel
    const input = {
      vehicle: {
        id: 'ta-dragster',
        name: 'TA Dragster',
        weightLb: 1980,
        tireDiaIn: 35.0,
        wheelbaseIn: 280,
        rolloutIn: 12,
        overhangIn: 30,
        rearGear: 4.56,
        gearRatios: [1.85, 1.3, 1.0],
        gearEfficiencies: [0.97, 0.98, 0.99],
        shiftRPMs: [9200, 9400],
        transEfficiency: 0.97,  // This should now be ignored since per-gear efficiencies are provided
        clutchLaunchRPM: 6000,
        clutchSlipRPM: 7200,
        clutchSlippage: 1.01,
        transmissionType: 'clutch',
        frontalAreaFt2: 19.5,
        cd: 0.58,
        liftCoeff: 0.4,
        enginePMI: 4.84,
        transPMI: 0.426,
        tiresPMI: 64.6,
        fuelType: 'Supercharged Methanol',
        hpCurve: [
          { rpm: 6000, hp: 1847 },
          { rpm: 6500, hp: 2058 },
          { rpm: 7000, hp: 2256 },
          { rpm: 7500, hp: 2458 },
          { rpm: 8000, hp: 2639 },
          { rpm: 8500, hp: 2729 },
          { rpm: 9000, hp: 2672 },
          { rpm: 9500, hp: 2415 },
          { rpm: 10000, hp: 1999 },
          { rpm: 11000, hp: 73 },
          { rpm: 11500, hp: 72 },
        ],
        powerHP: 2729,
        defaultRaceLength: 'QUARTER' as const,
      },
      env: {
        elevation: 0,
        barometerInHg: 29.92,
        temperatureF: 77,
        humidityPct: 45,
        windMph: 0,
        trackTempF: 110,
        tractionIndex: 2,
      },
      raceLength: 'QUARTER' as const,
    };

    const result = simulateVB6Exact(input as any);
    
    console.log('\n=== TA Dragster Exact Test ===');
    console.log(`ET: ${result.et_s.toFixed(3)}s`);
    console.log(`MPH: ${result.mph.toFixed(1)}`);
    console.log(`VB6 Target: ET=5.52s, MPH=243.1`);
    console.log(`Delta: ET=${(result.et_s - 5.52).toFixed(3)}s, MPH=${(result.mph - 243.1).toFixed(1)}`);
    
    // Log debug data
    const debug = (result as any).debugData;
    if (debug?.simParams) {
      console.log('\nSimulation Parameters:');
      console.log(`  Shift RPMs: ${JSON.stringify(debug.simParams.shiftRPMs)}`);
      console.log(`  Gear Eff: ${JSON.stringify(debug.simParams.gearEfficiencies)}`);
      console.log(`  Overall Eff: ${debug.simParams.overallEfficiency}`);
      console.log(`  Rollout Time: ${debug.simParams.rolloutTime_s?.toFixed(3)}s`);
    }
    
    // Check results
    expect(result.et_s).toBeGreaterThan(5.4);
    expect(result.et_s).toBeLessThan(5.7);
    expect(result.mph).toBeGreaterThan(240);
    expect(result.mph).toBeLessThan(250);
  });
});
