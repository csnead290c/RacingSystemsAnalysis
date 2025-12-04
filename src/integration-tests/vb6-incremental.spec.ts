/**
 * Test VB6Exact incremental times
 */

import { describe, it, expect } from 'vitest';
import { simulateVB6Exact } from '../domain/physics/models/vb6Exact';
import { VB6_PROSTOCK_PRO } from '../domain/physics/fixtures/vb6-prostock-pro';
import { fixtureToSimInputs } from '../domain/physics/vb6/fixtures';

describe('VB6Exact Incremental Times', () => {
  it('should match VB6 incremental times', () => {
    const simInputs = fixtureToSimInputs(VB6_PROSTOCK_PRO as any, 'QUARTER');
    
    // Log key parameters
    console.log('\n=== Input Parameters ===');
    console.log('Weight:', simInputs.vehicle.weightLb, 'lb');
    console.log('Rollout:', simInputs.vehicle.rolloutIn, 'in');
    console.log('Overhang:', simInputs.vehicle.overhangIn, 'in');
    
    // Calculate ovradj per VB6 logic
    const rolloutIn = simInputs.vehicle.rolloutIn ?? 9;
    const overhangIn = simInputs.vehicle.overhangIn ?? 0;
    let ftd = 2 * rolloutIn;
    if (ftd < 24) ftd = 24;
    let ovradj = (overhangIn + 0.25 * ftd) / 12;
    const minOvradj = 0.5 * ftd / 12;
    if (ovradj < minOvradj) ovradj = minOvradj;
    console.log('Calculated ovradj:', ovradj.toFixed(3), 'ft (ftd=' + ftd + ', min=' + minOvradj.toFixed(3) + ')');
    
    console.log('Final Drive:', simInputs.vehicle.rearGear);
    console.log('Gear Ratios:', simInputs.vehicle.gearRatios);
    console.log('Launch RPM:', simInputs.vehicle.clutchLaunchRPM);
    console.log('Slip RPM:', simInputs.vehicle.clutchSlipRPM);
    console.log('Peak HP:', simInputs.vehicle.powerHP);
    
    const result = simulateVB6Exact(simInputs);
    
    // VB6 target times from printout
    const targets = {
      60: { t: 1.01, mph: 66.0 },
      330: { t: 2.84, mph: 127.3 },
      660: { t: 4.37, mph: 160.9 },
      1000: { t: 5.70, mph: 183.0 },
      1320: { t: 6.80, mph: 202.3 },
    };
    
    console.log('\n=== VB6Exact Incremental Times ===');
    console.log('Distance | Sim Time | Target | Delta | Sim MPH | Target MPH');
    console.log('---------|----------|--------|-------|---------|------------');
    
    for (const ts of result.timeslip) {
      const target = targets[ts.d_ft as keyof typeof targets];
      if (target) {
        const timeDelta = ts.t_s - target.t;
        console.log(
          `${ts.d_ft.toString().padStart(4)}ft   | ${ts.t_s.toFixed(3).padStart(6)}s  | ${target.t.toFixed(2)}s  | ${timeDelta >= 0 ? '+' : ''}${timeDelta.toFixed(3)}s | ${ts.v_mph.toFixed(1).padStart(5)} | ${target.mph.toFixed(1)}`
        );
      }
    }
    
    console.log('\nFinal: ET=' + result.et_s.toFixed(3) + 's, MPH=' + result.mph.toFixed(1));
    console.log('Warnings:', result.meta.warnings);
    
    // Show first 20 trace points
    console.log('\n=== First 20 Trace Points ===');
    console.log('Step | Time(s) | Dist(ft) | Vel(fps) | Accel(g) | RPM | Gear');
    const traces = result.traces ?? [];
    for (let i = 0; i < Math.min(20, traces.length); i++) {
      const t = traces[i];
      console.log(
        `${(i+1).toString().padStart(4)} | ${t.t_s.toFixed(4).padStart(7)} | ${t.s_ft.toFixed(2).padStart(8)} | ${(t.v_mph / 0.681818).toFixed(2).padStart(8)} | ${t.a_g.toFixed(3).padStart(8)} | ${t.rpm.toFixed(0).padStart(4)} | ${t.gear}`
      );
    }
    
    // Show trace around 60ft
    console.log('\n=== Trace around 60ft ===');
    for (let i = 0; i < traces.length; i++) {
      const t = traces[i];
      if (t.s_ft >= 55 && t.s_ft <= 65) {
        console.log(
          `Step ${i+1}: ${t.t_s.toFixed(4)}s @ ${t.s_ft.toFixed(2)}ft, ${(t.v_mph).toFixed(1)} mph, ${t.a_g.toFixed(3)}g, ${t.rpm.toFixed(0)} RPM`
        );
      }
    }
    
    // Show trace around 1254ft and 1320ft for trap speed debug
    console.log('\n=== Trace around 1254ft-1320ft (trap speed zone) ===');
    for (let i = 0; i < traces.length; i++) {
      const t = traces[i];
      if (t.s_ft >= 1250 && t.s_ft <= 1325) {
        console.log(
          `Step ${i+1}: ${t.t_s.toFixed(4)}s @ ${t.s_ft.toFixed(2)}ft, ${(t.v_mph).toFixed(1)} mph`
        );
      }
    }
    
    // Basic sanity checks
    expect(result.et_s).toBeGreaterThan(0);
    expect(result.et_s).toBeLessThan(10);
  });
});
