/**
 * Compare VB6 Interpreter vs VB6 Port
 * 
 * Run the same Pro Stock test case through both:
 * 1. VB6 Interpreter (executes actual VB6 code)
 * 2. VB6 Port (our TypeScript implementation)
 * 
 * Compare outputs to find exact divergence point
 */

import { VB6Interpreter, VB6Inputs } from './vb6Interpreter';
import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

// Pro Stock inputs for VB6 Interpreter (VB6 format)
const PRO_STOCK_VB6: VB6Inputs = {
  // Vehicle
  Weight: 2355,
  TireDia: 32.62676,
  TireWidth: 17.0,
  GearRatio: 4.86,
  Wheelbase: 107,
  Rollout: 9,
  Overhang: 40,
  StaticFWt: 48.8,  // Calculated from weight distribution
  YCG: 19.8,        // Calculated CG height
  BodyStyle: 3,     // Pro Stock body style
  
  // Engine - use HP curve from test case
  PeakHP: 1300,
  RPMPeakHP: 9000,
  Displacement: 500,  // 500 CID
  FuelSystem: 1,      // Gasoline fuel injection
  HPTQMult: 1.0,
  EnginePMI: 3.26,
  
  // Transmission
  TransType: 0,  // 0 = clutch
  TransGR: [2.60, 1.90, 1.50, 1.20, 1.00, 0],
  TransEff: [0.990, 0.991, 0.992, 0.993, 0.994, 0],
  ShiftRPM: [9400, 9400, 9400, 9400, 0, 0],
  TorqueMult: 1.0,
  Slippage: 0,  // Will be calculated
  SlipStallRPM: 7600,
  ConvDia: 0,
  LockUp: 0,
  TransPMI: 0.511,
  TiresPMI: 52.7,
  
  // Aerodynamics
  RefArea: 18.2,
  DragCoef: 0.240,
  LiftCoef: 0.100,
  
  // Environment
  Elevation: 850,
  Barometer: 29.92,
  Temperature: 87,
  Humidity: 35,
  TrackTemp: 112,
  TractionIndex: 5,
  WindSpeed: 0,
  WindAngle: 0,
  
  // Race
  RaceLength: 1320,  // 1/4 mile
};

// Pro Stock inputs for our port (TypeScript format)
const PRO_STOCK_PORT: SimInputs = {
  vehicle: {
    id: 'test-prostock',
    name: 'Pro Stock',
    defaultRaceLength: 'QUARTER',
    powerHP: 1300,
    weightLb: 2355,
    wheelbaseIn: 107,
    rolloutIn: 9,
    overhangIn: 40,
    rearGear: 4.86,
    finalDriveEfficiency: 0.975,
    tireDiaIn: 32.62676,
    tireWidthIn: 17.0,
    cd: 0.240,
    frontalArea_ft2: 18.2,
    liftCoeff: 0.100,
    transmissionType: 'clutch',
    clutch: {
      launchRPM: 7600,
      slipRPM: 7600,
      slipRatio: 1.000,
    },
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
    gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftRPMs: [9400, 9400, 9400, 9400, 100],
    hpCurve: [
      { rpm: 6000, hp: 1050 },
      { rpm: 7000, hp: 1180 },
      { rpm: 8000, hp: 1270 },
      { rpm: 9000, hp: 1300 },
      { rpm: 9400, hp: 1295 },
      { rpm: 10000, hp: 1250 },
      { rpm: 11000, hp: 1100 },
    ],
    fuelType: 'Gasoline Fuel Injection',
    hpTorqueMultiplier: 1.000,
    pmi: {
      engine_flywheel_clutch: 3.26,
      transmission_driveshaft: 0.511,
      tires_wheels_ringgear: 52.7,
    },
  },
  env: {
    elevation: 850,
    barometerInHg: 29.92,
    temperatureF: 87,
    humidityPct: 35,
    windMph: 0.0,
    windAngleDeg: 0,
    trackTempF: 112,
    tractionIndex: 5,
  },
  raceLength: 'QUARTER',
};

console.log('='.repeat(80));
console.log('VB6 INTERPRETER vs VB6 PORT COMPARISON');
console.log('='.repeat(80));

console.log('\n' + '='.repeat(80));
console.log('Running VB6 Interpreter (actual VB6 code)...');
console.log('='.repeat(80));

try {
  const interpreter = new VB6Interpreter();
  const vb6Result = interpreter.runTimeslip(PRO_STOCK_VB6);
  
  console.log(`\nVB6 Interpreter Result:`);
  console.log(`  ET: ${vb6Result.ET?.toFixed(3)}s`);
  console.log(`  MPH: ${vb6Result.MPH?.toFixed(1)}`);
  console.log(`  60ft: ${vb6Result.ET60?.toFixed(3)}s`);
  console.log(`  330ft: ${vb6Result.ET330?.toFixed(3)}s @ ${vb6Result.MPH330?.toFixed(1)} MPH`);
  
  console.log('\n' + '='.repeat(80));
  console.log('Running VB6 Port (our TypeScript implementation)...');
  console.log('='.repeat(80));
  
  const portResult = simulateVB6Exact(PRO_STOCK_PORT);
  
  console.log(`\nVB6 Port Result:`);
  console.log(`  ET: ${portResult.et_s.toFixed(3)}s`);
  console.log(`  MPH: ${portResult.mph.toFixed(1)}`);
  console.log(`  60ft: ${portResult.et_60ft?.toFixed(3)}s`);
  console.log(`  330ft: ${portResult.et_330ft?.toFixed(3)}s @ ${portResult.mph_330ft?.toFixed(1)} MPH`);
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON');
  console.log('='.repeat(80));
  
  if (vb6Result.ET && portResult.et_s) {
    const etDelta = portResult.et_s - vb6Result.ET;
    const mphDelta = portResult.mph - (vb6Result.MPH || 0);
    
    console.log(`\nET Delta: ${etDelta >= 0 ? '+' : ''}${(etDelta * 1000).toFixed(1)}ms`);
    console.log(`MPH Delta: ${mphDelta >= 0 ? '+' : ''}${mphDelta.toFixed(2)} MPH`);
    
    if (vb6Result.ET60 && portResult.et_60ft) {
      const et60Delta = portResult.et_60ft - vb6Result.ET60;
      console.log(`60ft Delta: ${et60Delta >= 0 ? '+' : ''}${(et60Delta * 1000).toFixed(1)}ms`);
    }
    
    if (vb6Result.ET330 && portResult.et_330ft) {
      const et330Delta = portResult.et_330ft - vb6Result.ET330;
      console.log(`330ft Delta: ${et330Delta >= 0 ? '+' : ''}${(et330Delta * 1000).toFixed(1)}ms`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS');
    console.log('='.repeat(80));
    
    if (Math.abs(etDelta) < 0.01) {
      console.log('✅ PASS - Within ±10ms tolerance');
    } else {
      console.log('❌ FAIL - Outside ±10ms tolerance');
      console.log('\nThe divergence suggests:');
      if (vb6Result.ET60 && portResult.et_60ft) {
        const et60Delta = portResult.et_60ft - vb6Result.ET60;
        if (Math.abs(et60Delta) > 0.005) {
          console.log('  - Error starts early (before 60ft)');
          console.log('  - Check launch calculations, initial acceleration, tire slip');
        } else {
          console.log('  - Error accumulates during run');
          console.log('  - Check HP chain, gear shifts, downtrack calculations');
        }
      }
    }
  }
  
} catch (error) {
  console.error('\nError running comparison:', error);
  console.log('\nNote: VB6 Interpreter may need HP curve data.');
  console.log('If interpreter fails, we need to add HP curve support or use QuarterJr mode.');
}

console.log('\n' + '='.repeat(80));
