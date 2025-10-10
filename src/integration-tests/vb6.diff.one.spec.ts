/**
 * VB6 Divergence Diagnostic - Single Vehicle Deep Dive
 * 
 * Prints detailed per-step data to identify where simulation diverges from VB6.
 * Uses ProStock_Pro config and prints every 0.01s until 2.0s, then every 50 ft.
 */

import { describe, it } from 'vitest';
import { getModel } from '../domain/physics';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../domain/physics/fixtures/benchmark-configs';

const model = getModel('RSACLASSIC');

describe('VB6 Divergence Diagnostic - ProStock_Pro', () => {
  it('should print detailed step-by-step data for manual VB6 comparison', () => {
    const config = BENCHMARK_CONFIGS['ProStock_Pro'];
    
    // Validate config
    validateBenchmarkConfig(config);
    
    // Build input
    const input = {
      vehicle: {
        ...config.vehicle,
        id: 'vb6-diagnostic',
        name: 'ProStock_Pro',
        defaultRaceLength: 'QUARTER' as const,
        weightLb: config.vehicle.weightLb,
        tireDiaIn: config.vehicle.tireDiaIn ?? 28,
        rearGear: config.vehicle.finalDrive ?? 3.73,
        rolloutIn: config.vehicle.rolloutIn ?? 12,
        powerHP: 1200, // Placeholder
      },
      env: config.env,
      raceLength: 'QUARTER' as const,
    };
    
    const res = model.simulate(input);
    
    console.log('\n' + '='.repeat(120));
    console.log('VB6 DIVERGENCE DIAGNOSTIC - ProStock_Pro Quarter Mile');
    console.log('='.repeat(120));
    console.log('\nConfig Summary:');
    console.log(`  Weight: ${config.vehicle.weightLb} lb`);
    console.log(`  Tire Rollout: ${config.vehicle.tireRolloutIn} in`);
    console.log(`  Rollout: ${config.vehicle.rolloutIn} in`);
    console.log(`  Final Drive: ${config.vehicle.finalDrive}`);
    console.log(`  Gears: ${config.vehicle.gearRatios.join(', ')}`);
    console.log(`  Shift RPM: ${config.vehicle.shiftRPM.join(', ')}`);
    console.log(`  Clutch: launch=${config.vehicle.clutch?.launchRPM}, slip=${config.vehicle.clutch?.slipRPM}, ratio=${config.vehicle.clutch?.slipRatio}`);
    console.log(`  Cd: ${config.vehicle.cd}, Area: ${config.vehicle.frontalArea_ft2} ft²`);
    console.log(`  Env: ${config.env.temperatureF}°F, ${config.env.barometerInHg}"Hg, ${config.env.humidityPct}% RH, ${config.env.elevation} ft elev`);
    
    console.log('\n' + '='.repeat(120));
    console.log('DETAILED TRACE - Every 0.01s until 2.0s, then every 50 ft');
    console.log('='.repeat(120));
    console.log(
      'Time(s)  '.padEnd(10) +
      'Dist(ft) '.padEnd(10) +
      'Speed(mph)'.padEnd(12) +
      'RPM    '.padEnd(8) +
      'Gear'.padEnd(6) +
      'Accel(g)'.padEnd(10) +
      'Notes'
    );
    console.log('-'.repeat(120));
    
    if (!res.traces || res.traces.length === 0) {
      console.log('ERROR: No traces available!');
      console.log('Result:', JSON.stringify(res, null, 2));
      return;
    }
    
    // Print every 0.01s until 2.0s
    let lastPrintedDist = -999;
    const TIME_INTERVAL = 0.01;
    const DIST_INTERVAL = 50;
    
    for (let targetT = 0; targetT <= 2.0; targetT += TIME_INTERVAL) {
      // Find closest trace point
      const trace = res.traces.reduce((prev, curr) => 
        Math.abs(curr.t_s - targetT) < Math.abs(prev.t_s - targetT) ? curr : prev
      );
      
      if (!trace) continue;
      
      // Format notes
      let notes = '';
      if (trace.s_ft >= config.vehicle.rolloutIn! / 12 && trace.s_ft < (config.vehicle.rolloutIn! / 12 + 1)) {
        notes += '[ROLLOUT] ';
      }
      if (trace.s_ft >= 60 && trace.s_ft < 62) {
        notes += '[60ft] ';
      }
      if (trace.s_ft >= 330 && trace.s_ft < 332) {
        notes += '[330ft] ';
      }
      if (trace.s_ft >= 660 && trace.s_ft < 662) {
        notes += '[660ft/1/8] ';
      }
      if (trace.s_ft >= 1000 && trace.s_ft < 1002) {
        notes += '[1000ft] ';
      }
      if (trace.s_ft >= 1320 && trace.s_ft < 1322) {
        notes += '[1320ft/1/4] ';
      }
      
      console.log(
        trace.t_s.toFixed(3).padEnd(10) +
        trace.s_ft.toFixed(2).padEnd(10) +
        trace.v_mph.toFixed(2).padEnd(12) +
        trace.rpm.toFixed(0).padEnd(8) +
        trace.gear.toString().padEnd(6) +
        trace.a_g.toFixed(3).padEnd(10) +
        notes
      );
      
      lastPrintedDist = trace.s_ft;
    }
    
    // After 2.0s, print every 50 ft
    console.log('-'.repeat(120));
    console.log('Switching to distance-based output (every 50 ft)...');
    console.log('-'.repeat(120));
    
    // Find all traces after 2.0s
    const laterTraces = res.traces.filter(t => t.t_s > 2.0);
    
    for (const trace of laterTraces) {
      // Print if we've advanced 50 ft since last print
      if (trace.s_ft >= lastPrintedDist + DIST_INTERVAL) {
        let notes = '';
        if (trace.s_ft >= 660 && trace.s_ft < 662) {
          notes += '[660ft/1/8] ';
        }
        if (trace.s_ft >= 1000 && trace.s_ft < 1002) {
          notes += '[1000ft] ';
        }
        if (trace.s_ft >= 1320 && trace.s_ft < 1322) {
          notes += '[1320ft/1/4] ';
        }
        
        console.log(
          trace.t_s.toFixed(3).padEnd(10) +
          trace.s_ft.toFixed(2).padEnd(10) +
          trace.v_mph.toFixed(2).padEnd(12) +
          trace.rpm.toFixed(0).padEnd(8) +
          trace.gear.toString().padEnd(6) +
          trace.a_g.toFixed(3).padEnd(10) +
          notes
        );
        
        lastPrintedDist = trace.s_ft;
      }
    }
    
    console.log('='.repeat(120));
    console.log('FINAL RESULTS:');
    console.log('='.repeat(120));
    console.log(`ET: ${res.et_s.toFixed(3)}s`);
    console.log(`MPH: ${res.mph.toFixed(2)}`);
    
    if (res.meta.windowMPH?.q1320_mph) {
      console.log(`Trap MPH (1254-1320 ft): ${res.meta.windowMPH.q1320_mph.toFixed(2)}`);
    }
    
    // Print timeslip points
    console.log('\nTimeslip Points:');
    for (const pt of res.timeslip) {
      console.log(`  ${pt.d_ft.toFixed(0).padEnd(6)} ft: ${pt.t_s.toFixed(3)}s @ ${pt.v_mph.toFixed(2)} mph`);
    }
    
    // Print meta info
    console.log('\nMeta Info:');
    console.log(`  Model: ${res.meta.model}`);
    console.log(`  Steps: ${res.meta.steps}`);
    console.log(`  Warnings: ${res.meta.warnings?.join(', ') || 'none'}`);
    
    if (res.meta.clutch) {
      console.log(`  Clutch: minC=${res.meta.clutch.minC?.toFixed(3)}, lockup@${res.meta.clutch.lockupAt_ft?.toFixed(1)}ft`);
    }
    
    if (res.meta.rollout) {
      console.log(`  Rollout: ${res.meta.rollout.rolloutIn}in, t_roll=${res.meta.rollout.t_roll_s?.toFixed(3)}s`);
    }
    
    console.log('='.repeat(120));
    console.log('\nINSTRUCTIONS FOR VB6 COMPARISON:');
    console.log('1. Compare the trace output above with VB6 printout timestamps');
    console.log('2. Look for the FIRST point where values diverge significantly');
    console.log('3. Note whether divergence occurs:');
    console.log('   - At launch (t < 0.1s)');
    console.log('   - After rollout (t ~ 0.1-0.2s)');
    console.log('   - At first shift (check gear changes)');
    console.log('   - During acceleration (check RPM and speed progression)');
    console.log('   - In trap zone (1254-1320 ft)');
    console.log('4. Check for:');
    console.log('   - Negative values (indicates sign error)');
    console.log('   - Stuck values (indicates calculation error)');
    console.log('   - Wrong gear progression (indicates shift logic error)');
    console.log('   - Unrealistic acceleration (indicates force error)');
    console.log('='.repeat(120));
  });
});
