/**
 * Debug test for Funny Car Quarter Pro
 * Uses exact parameters from user's screenshot
 */
import { describe, it, expect } from 'vitest';
import { simulateVB6Exact } from '../domain/physics/models/vb6Exact';
import { BENCHMARK_CONFIGS } from '../domain/physics/fixtures/benchmark-configs';
import { fixtureToSimInputs } from '../domain/physics/vb6/fixtures';

describe('Funny Car Debug', () => {
  it('should match VB6 output with correct slippage', () => {
    // Exact parameters from screenshot debug panel
    const input = {
      vehicle: {
        weightLb: 2350,
        wheelbaseIn: 125,
        overhangIn: 40,
        rolloutIn: 12,
        tireDiaIn: 37.6,
        tireWidthIn: 18,
        frontalAreaFt2: 24.1,
        cd: 0.5,
        liftCoeff: 0.8,
        rearGear: 3.20,
        transEfficiency: 0.96,
        gearRatios: [1.0],
        gearEfficiencies: [1.0],
        shiftRPMs: [100],
        transmissionType: 'clutch',
        clutchLaunchRPM: 6400,
        clutchSlipRPM: 6800,
        // TEST 1: With slippage = 1.0 (current broken state)
        clutchSlippage: 1.0,
        clutchLockup: false,
        enginePMI: 6.03,
        transPMI: 0.107,
        tiresPMI: 75.4,
        fuelType: 'Supercharged Nitro',
        // HP curve from VB6 printout
        hpCurve: [
          { rpm: 6400, hp: 6116 },
          { rpm: 6600, hp: 6276 },
          { rpm: 6800, hp: 6306 },
          { rpm: 7000, hp: 6139 },
          { rpm: 7200, hp: 5829 },
          { rpm: 7400, hp: 5344 },
          { rpm: 7600, hp: 4732 },
          { rpm: 7800, hp: 3993 },
          { rpm: 9000, hp: 1297 },
          { rpm: 9250, hp: 1269 },
          { rpm: 9500, hp: 1222 },
        ],
      },
      env: {
        elevation: 300,
        barometerInHg: 29.92,
        temperatureF: 76,
        humidityPct: 50,
        windMph: 0,
        windAngleDeg: 0,
        trackTempF: 112,
        tractionIndex: 1,
      },
      raceLengthFt: 1320,
      raceLength: 'QUARTER' as const,
    };

    console.log('\n=== TEST 1: Slippage = 1.0 (VB6 value) ===');
    const result1 = simulateVB6Exact(input as any);
    console.log(`ET: ${result1.et_s.toFixed(3)}s, MPH: ${result1.mph.toFixed(1)}`);
    console.log(`Expected VB6: ET=4.98s, MPH=297.0`);
    console.log(`Delta: ${(result1.et_s - 4.98).toFixed(3)}s`);
    
    // Compare incremental times with VB6 printout
    console.log('\n=== Incremental Time Comparison ===');
    const vb6Times = [
      { dist: 60, time: 0.88, mph: 75.3 },
      { dist: 330, time: 2.32, mph: 156.3 },  // Corrected from 2.00
      { dist: 660, time: 3.37, mph: 243.5 },
      { dist: 1000, time: 4.23, mph: 283.0 },
      { dist: 1320, time: 4.98, mph: 297.0 },
    ];
    // timeslip is an array of {d_ft, t_s, v_mph}
    const traces = result1.timeslip as Array<{d_ft: number; t_s: number; v_mph: number}>;
    console.log('Distance | VB6 Time | Our Time | Delta | VB6 MPH | Our MPH');
    console.log('---------|----------|----------|-------|---------|--------');
    for (const vb6 of vb6Times) {
      // Find closest trace point to this distance
      const tracePoint = traces.find(t => Math.abs(t.d_ft - vb6.dist) < 5) ?? traces[traces.length - 1];
      const ourTime = tracePoint?.t_s ?? 0;
      const ourMph = tracePoint?.v_mph ?? 0;
      const delta = ourTime - vb6.time;
      console.log(`${vb6.dist.toString().padStart(8)} | ${vb6.time.toFixed(2).padStart(8)} | ${ourTime.toFixed(2).padStart(8)} | ${delta.toFixed(3).padStart(5)} | ${vb6.mph.toFixed(1).padStart(7)} | ${ourMph.toFixed(1).padStart(6)}`);
    }

    // TEST 2: With correct slippage = 1.0068
    const input2 = {
      ...input,
      vehicle: {
        ...input.vehicle,
        clutchSlippage: 1.0068,
      },
    };

    console.log('\n=== TEST 2: Slippage = 1.0068 (VB6 value) ===');
    const result2 = simulateVB6Exact(input2 as any);
    console.log(`ET: ${result2.et_s.toFixed(3)}s, MPH: ${result2.mph.toFixed(1)}`);
    console.log(`Expected VB6: ET=4.98s, MPH=297.0`);
    console.log(`Delta: ${(result2.et_s - 4.98).toFixed(3)}s`);

    // TEST 3: Check what happens with different traction indices
    console.log('\n=== TEST 3: Traction Index variations ===');
    for (const ti of [1, 3, 5, 7, 9]) {
      const inputTI = {
        ...input2,
        env: { ...input2.env, tractionIndex: ti },
      };
      const resultTI = simulateVB6Exact(inputTI as any);
      console.log(`TI=${ti}: ET=${resultTI.et_s.toFixed(3)}s, MPH=${resultTI.mph.toFixed(1)}`);
    }

    // TEST 3.5: Try with NITRO fuel type instead of Supercharged Nitro
    console.log('\n=== TEST 3.5: With NITRO fuel type ===');
    const input3 = {
      ...input2,
      vehicle: { ...input2.vehicle, fuelType: 'NITRO' },
    };
    const result3 = simulateVB6Exact(input3 as any);
    console.log(`ET: ${result3.et_s.toFixed(3)}s, MPH: ${result3.mph.toFixed(1)}`);
    console.log(`Delta: ${(result3.et_s - 4.98).toFixed(3)}s`);

    // TEST 4: Run with benchmark config to compare
    console.log('\n=== TEST 4: Using BENCHMARK_CONFIGS.FunnyCar_Pro ===');
    const benchmarkConfig = BENCHMARK_CONFIGS.FunnyCar_Pro;
    // Convert benchmark to fixture format
    const benchmarkFixture = {
      env: {
        elevation_ft: benchmarkConfig.env.elevation,
        barometer_inHg: benchmarkConfig.env.barometerInHg,
        temperature_F: benchmarkConfig.env.temperatureF,
        relHumidity_pct: benchmarkConfig.env.humidityPct,
        wind_mph: benchmarkConfig.env.windMph ?? 0,
        wind_angle_deg: 0,
        trackTemp_F: benchmarkConfig.env.trackTempF,
        tractionIndex: benchmarkConfig.env.tractionIndex,
      },
      vehicle: {
        weight_lb: benchmarkConfig.vehicle.weightLb,
        staticFrontWeight_lb: benchmarkConfig.vehicle.weightLb * 0.45,
        wheelbase_in: benchmarkConfig.vehicle.wheelbaseIn,
        overhang_in: benchmarkConfig.vehicle.overhangIn,
        cgHeight_in: 18,
        rollout_in: benchmarkConfig.vehicle.rolloutIn,
        bodyStyle: 'Funny Car',
        tire: {
          diameter_in: (benchmarkConfig.vehicle as any).tireRolloutIn / Math.PI,
          width_in: benchmarkConfig.vehicle.tireWidthIn,
        },
      },
      aero: {
        frontalArea_ft2: (benchmarkConfig.vehicle as any).frontalArea_ft2,
        Cd: benchmarkConfig.vehicle.cd,
        Cl: benchmarkConfig.vehicle.liftCoeff,
      },
      drivetrain: {
        finalDrive: (benchmarkConfig.vehicle as any).finalDrive,
        overallEfficiency: (benchmarkConfig.vehicle as any).transEff,
        gearRatios: benchmarkConfig.vehicle.gearRatios,
        perGearEff: (benchmarkConfig.vehicle as any).gearEff,
        shiftsRPM: (benchmarkConfig.vehicle as any).shiftRPM,
        clutch: (benchmarkConfig.vehicle as any).clutch,
      },
      pmi: (benchmarkConfig.vehicle as any).pmi,
      engineHP: (benchmarkConfig.vehicle as any).torqueCurve.map((pt: any) => [pt.rpm, pt.hp]),
      fuel: {
        type: benchmarkConfig.fuel,
        hpTorqueMultiplier: 1.0,
      },
    };
    
    const benchmarkInputs = fixtureToSimInputs(benchmarkFixture as any, 'QUARTER');
    const result4 = simulateVB6Exact(benchmarkInputs as any);
    console.log(`ET: ${result4.et_s.toFixed(3)}s, MPH: ${result4.mph.toFixed(1)}`);
    console.log(`Expected VB6: ET=4.98s, MPH=297.0`);
    console.log(`Delta: ${(result4.et_s - 4.98).toFixed(3)}s`);

    // Log key differences
    console.log('\n=== Key Parameter Comparison ===');
    console.log('My test input:', JSON.stringify({
      tireDia: input.vehicle.tireDiaIn,
      staticFrontWeight: 'not set',
      cgHeight: 'not set',
      bodyStyle: 'not set',
    }));
    console.log('Benchmark:', JSON.stringify({
      tireDia: (benchmarkConfig.vehicle as any).tireRolloutIn / Math.PI,
      staticFrontWeight: benchmarkInputs.vehicle.staticFrontWeightLb,
      cgHeight: benchmarkInputs.vehicle.cgHeightIn,
      bodyStyle: benchmarkInputs.vehicle.bodyStyle,
    }));
    
    // TEST 5: Add missing parameters to my input
    console.log('\n=== TEST 5: Add staticFrontWeight, cgHeight, bodyStyle ===');
    const input5 = {
      ...input2,
      vehicle: {
        ...input2.vehicle,
        staticFrontWeightLb: 2350 * 0.45, // 45% front weight
        cgHeightIn: 18,
        bodyStyle: 'Funny Car',
      },
    };
    const result5 = simulateVB6Exact(input5 as any);
    console.log(`ET: ${result5.et_s.toFixed(3)}s, MPH: ${result5.mph.toFixed(1)}`);
    console.log(`Delta: ${(result5.et_s - 4.98).toFixed(3)}s`);
    
    // Expect benchmark to be closer
    expect(result4.et_s).toBeLessThan(6);
  });
});
