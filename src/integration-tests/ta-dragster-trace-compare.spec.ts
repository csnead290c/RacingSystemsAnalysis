/**
 * TA Dragster Trace Comparison
 * Detailed comparison of simulation trace vs VB6 output
 */

import { describe, it } from 'vitest';
import { simulateVB6Exact } from '../domain/physics/models/vb6Exact';

// VB6 printout data (from Quarter Pro)
const VB6_TRACE = [
  { t: 0.00, dist: 0, mph: 0.0, accel: 3.25, gear: 1, rpm: 6000 },
  // Rollout at 0.146s
  { t: 0.25, dist: 11, mph: 29.2, accel: 3.36, gear: 1, rpm: 7200, slip: true },
  { t: 0.50, dist: 25, mph: 47.6, accel: 3.32, gear: 1, rpm: 7200, slip: true },
  { t: 0.75, dist: 45, mph: 65.5, accel: 3.27, gear: 1, rpm: 7200, slip: true },
  { t: 1.00, dist: 72, mph: 83.0, accel: 3.21, gear: 1, rpm: 7627, slip: true },
  { t: 1.26, dist: 109, mph: 102.0, accel: 3.06, gear: 1, rpm: 9210 },
  // 1->2 shift
  { t: 1.46, dist: 140, mph: 114.9, accel: 2.66, gear: 2, rpm: 7200 },
  { t: 1.71, dist: 185, mph: 129.5, accel: 2.61, gear: 2, rpm: 7923 },
  { t: 1.96, dist: 237, mph: 143.5, accel: 2.49, gear: 2, rpm: 8658 },
  { t: 2.21, dist: 294, mph: 156.0, accel: 2.18, gear: 2, rpm: 9203 },
  // 2->3 shift
  { t: 2.59, dist: 385, mph: 173.2, accel: 1.97, gear: 3, rpm: 7808 },
  { t: 2.84, dist: 455, mph: 183.5, accel: 1.86, gear: 3, rpm: 8138 },
  { t: 3.09, dist: 531, mph: 193.1, accel: 1.56, gear: 3, rpm: 8481 },
  { t: 3.34, dist: 607, mph: 201.7, accel: 1.48, gear: 3, rpm: 8762 },
  { t: 3.59, dist: 689, mph: 209.6, accel: 1.23, gear: 3, rpm: 9073 },
  { t: 3.84, dist: 770, mph: 216.5, accel: 1.17, gear: 3, rpm: 9268 },
  { t: 4.09, dist: 857, mph: 222.8, accel: 0.96, gear: 3, rpm: 9506 },
  { t: 4.34, dist: 942, mph: 228.3, accel: 0.92, gear: 3, rpm: 9651 },
  { t: 4.59, dist: 1032, mph: 233.3, accel: 0.73, gear: 3, rpm: 9843 },
  { t: 4.84, dist: 1120, mph: 237.6, accel: 0.71, gear: 3, rpm: 9942 },
  { t: 5.09, dist: 1212, mph: 241.4, accel: 0.55, gear: 3, rpm: 10086 },
  { t: 5.34, dist: 1302, mph: 244.6, accel: 0.55, gear: 3, rpm: 10163 },
  { t: 5.52, dist: 1370, mph: 243.1, accel: 0.00, gear: 3, rpm: 10163 }, // Finish
];

describe('TA Dragster Trace Comparison', () => {
  it('should compare trace points with VB6', () => {
    const input = {
      vehicle: {
        id: 'ta-dragster',
        name: 'TA Dragster',
        weightLb: 1980,
        tireDiaIn: 35.0,
        tireWidthIn: 17.0,
        wheelbaseIn: 280,
        rolloutIn: 12,
        overhangIn: 30,
        rearGear: 4.56,
        gearRatios: [1.85, 1.3, 1.0],
        gearEfficiencies: [0.97, 0.98, 0.99],
        shiftRPMs: [9200, 9400],
        transEfficiency: 0.97,  // Will be ignored since gearEfficiencies are provided
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
    
    const resultKeys = Object.keys(result).join(', ');
    const tracesKeys = Object.keys((result as any).traces ?? {}).join(', ');
    console.log('Result keys: ' + resultKeys);
    console.log('traces keys: ' + tracesKeys);
    
    // traces is an array directly
    const trace = Array.isArray((result as any).traces) ? (result as any).traces : [];
    
    console.log(`\nTrace length: ${trace.length}`);
    if (trace.length > 0) {
      console.log('First trace point:', JSON.stringify(trace[0]));
    }
    
    console.log('\n=== TRACE COMPARISON ===');
    console.log('Time     VB6 Dist  Our Dist  Δ Dist   VB6 MPH  Our MPH  Δ MPH   VB6 Accel Our Accel  Gear  VB6 RPM  Our RPM');
    console.log('─'.repeat(120));
    
    // Find our trace points closest to VB6 times
    for (const vb6 of VB6_TRACE) {
      // Find closest trace point
      let closest = trace[0];
      let minDiff = Math.abs(trace[0]?.t_s - vb6.t);
      for (const pt of trace) {
        const diff = Math.abs(pt.t_s - vb6.t);
        if (diff < minDiff) {
          minDiff = diff;
          closest = pt;
        }
      }
      
      if (!closest) continue;
      
      const distDelta = closest.s_ft - vb6.dist;
      const mphDelta = closest.v_mph - vb6.mph;
      
      console.log(
        `${vb6.t.toFixed(2).padStart(5)}    ` +
        `${vb6.dist.toString().padStart(6)}    ` +
        `${closest.s_ft.toFixed(0).padStart(6)}    ` +
        `${distDelta.toFixed(1).padStart(6)}   ` +
        `${vb6.mph.toFixed(1).padStart(6)}   ` +
        `${closest.v_mph.toFixed(1).padStart(6)}   ` +
        `${mphDelta.toFixed(1).padStart(5)}   ` +
        `${vb6.accel.toFixed(2).padStart(6)}     ` +
        `${closest.a_g.toFixed(2).padStart(6)}     ` +
        `${vb6.gear}     ` +
        `${vb6.rpm.toString().padStart(5)}    ` +
        `${closest.rpm.toFixed(0).padStart(5)}`
      );
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Our ET: ${result.et_s.toFixed(3)}s`);
    console.log(`VB6 ET: 5.520s`);
    console.log(`Delta: ${(result.et_s - 5.52).toFixed(3)}s`);
    
    // Check rollout time
    const debug = (result as any).debugData;
    console.log(`\nOur Rollout Time: ${debug?.simParams?.rolloutTime_s?.toFixed(3)}s`);
    console.log(`VB6 Rollout Time: 0.146s`);
    console.log(`Rollout Delta: ${((debug?.simParams?.rolloutTime_s ?? 0) - 0.146).toFixed(3)}s`);
    
    // Find velocity at rollout
    // The rolloutTime is the raw simulation time when rollout was crossed
    // But trace t_s is track time (0 until timer starts)
    // So we need to find the first point where track time > 0 (timer just started)
    let velAtRollout = 0;
    for (const pt of trace) {
      if (pt.t_s > 0) {
        velAtRollout = pt.v_mph;
        console.log(`\nFirst trace point after rollout: t=${pt.t_s.toFixed(4)}s, dist=${pt.s_ft.toFixed(1)}ft, v=${pt.v_mph.toFixed(1)}mph`);
        break;
      }
    }
    console.log(`Our velocity at rollout: ${velAtRollout.toFixed(1)} mph`);
    console.log(`VB6 velocity at rollout: ~10.3 mph (from VB6 printout at t=0.25, dist=11ft)`);
    
    // Check rollout distance
    console.log(`\nRollout distance: ${debug?.simParams?.rolloutIn ?? 12} inches = ${(debug?.simParams?.rolloutIn ?? 12) / 12} ft`);
    
    // Show trace points with HP data
    console.log('\n=== TRACE WITH HP DATA ===');
    console.log('Time(s)  Dist(ft)   MPH    Accel(g)   HP     DragHP   Gear  RPM');
    // Sample every ~0.5s
    for (let i = 0; i < trace.length; i += 20) {
      const pt = trace[i];
      if (pt.t_s > 0) {
        console.log(
          `${pt.t_s.toFixed(2).padStart(6)}  ${pt.s_ft.toFixed(0).padStart(7)}  ${pt.v_mph.toFixed(1).padStart(6)}  ${pt.a_g.toFixed(2).padStart(8)}  ${(pt.hp ?? 0).toFixed(0).padStart(5)}  ${(pt.dragHp ?? 0).toFixed(0).padStart(7)}  ${pt.gear}  ${pt.rpm.toFixed(0).padStart(5)}`
        );
      }
    }
    
    // Check key simulation parameters
    console.log(`\n=== KEY SIMULATION PARAMETERS ===`);
    console.log(`Track Temp Effect: ${debug?.simParams?.trackTempEffect?.toFixed(4) ?? 'N/A'}`);
    console.log(`Traction Index: ${debug?.simParams?.tractionIndex ?? 'N/A'}`);
    console.log(`Tire Slip at Launch: ${debug?.simParams?.tireSlipAtLaunch?.toFixed(4) ?? 'N/A'}`);
    console.log(`Ags0: ${debug?.simParams?.ags0?.toFixed(3) ?? 'N/A'} g`);
    console.log(`Static FWt: ${debug?.simParams?.staticFWt?.toFixed(1) ?? 'N/A'} lb`);
    console.log(`Gear Eff: ${JSON.stringify(debug?.simParams?.gearEfficiencies)}`);
    console.log(`Overall Eff: ${debug?.simParams?.overallEfficiency?.toFixed(3) ?? 'N/A'}`);
    
    // Check convergence data
    const diag = (result as any).vb6Diagnostics;
    if (diag) {
      console.log(`\n=== CONVERGENCE DATA ===`);
      console.log(`Total steps: ${diag.iterations?.length ?? 'N/A'}`);
      console.log(`Avg iterations per step: ${diag.iterations ? (diag.iterations.reduce((a: number, b: number) => a + b, 0) / diag.iterations.length).toFixed(2) : 'N/A'}`);
      if (diag.convergenceHistory?.length > 0) {
        console.log(`First 5 steps convergence:`);
        for (let i = 0; i < Math.min(5, diag.convergenceHistory.length); i++) {
          const ch = diag.convergenceHistory[i];
          console.log(`  Step ${ch.step}: ${ch.iterations} iters, HPSave=${ch.HPSave?.toFixed(0)}, HP=${ch.HP?.toFixed(0)}, AGS=${ch.AGS_g?.toFixed(3)}g`);
        }
      }
    } else {
      console.log(`\nvb6Diagnostics not found in result`);
    }
    
    // The track distance at t=0 should be ovradj (since raw dist = rollout = 1ft, track dist = 1 - 1 + ovradj = ovradj)
    console.log(`\nAt rollout (raw dist = 1ft): track dist = 1 - 1 + ovradj = ovradj = ~3.0 ft`);
    console.log(`But trace shows s_ft = ${trace[0]?.s_ft.toFixed(3)} ft at t=0`);
    console.log(`This suggests ovradj might be ~${(trace[0]?.s_ft - 1 + 1).toFixed(3)} ft`);
  });
});
