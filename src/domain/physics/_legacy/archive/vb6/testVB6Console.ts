/**
 * VB6 Interpreter Console Test
 * 
 * Run this in the browser console to test the interpreter:
 * await window.testVB6Interpreter()
 */

import { VB6Interpreter, VB6Inputs } from './vb6Interpreter';

// PRO STOCK test case - should produce ET of 6.80s @ 202.3 MPH (1/8 mile: 4.37s @ 160.9 MPH)
// From prostock.dat reference file
const PROSTOCK_INPUTS: VB6Inputs = {
  // Vehicle
  Weight: 2355,
  TireDia: 102.5 / Math.PI, // Tire rollout 102.5" -> diameter ~32.65"
  TireWidth: 17.0,
  GearRatio: 4.86,
  Efficiency: 0.975,
  Wheelbase: 107,
  Rollout: 9,
  Overhang: 40,
  StaticFWt: 50, // Will be calculated by VB6 code
  YCG: 20, // Will be calculated by VB6 code
  BodyStyle: 0, // Pro Stock
  
  // Engine - dyno curve from prostock.dat
  PeakHP: 1300,
  RPMPeakHP: 8750,
  Displacement: 500, // 500 CID
  FuelSystem: 0, // Gasoline Carburetor
  HPTQMult: 1.0,
  TorqueMult: 1.0,
  EngineRPM: [7000, 7250, 7500, 7750, 8000, 8250, 8500, 8750, 9000, 9250, 9500],
  EngineHP: [1078, 1131, 1177, 1216, 1251, 1274, 1288, 1300, 1297, 1269, 1222],
  EngineTQ: [809, 819, 824, 824, 821, 811, 796, 780, 757, 721, 676], // From prostock.dat
  EnginePMI: 3.42,
  
  // Transmission - clutch
  TransType: 0, // clutch
  LaunchRPM: 7200,
  SlipStallRPM: 7600,
  Slippage: 1.004,
  ConvDia: 0,
  LockUp: 0,
  TransGR: [2.60, 1.90, 1.50, 1.20, 1.00, 0],
  TransEff: [0.990, 0.991, 0.992, 0.993, 0.994, 0],
  ShiftRPM: [9400, 9400, 9400, 9400, 0, 0],
  TransPMI: 0.247,
  TiresPMI: 50.8,
  
  // Aerodynamics
  RefArea: 18.2,
  DragCoef: 0.240,
  LiftCoef: 0.100,
  
  // Environment
  WindSpeed: 5.0,
  WindAngle: 135,
  TractionIndex: 3,
};

// Weather from prostock.dat
const PROSTOCK_WEATHER = {
  temperature: 75,
  barometer: 29.92,
  humidity: 55,
  elevation: 32,
  trackTemp: 105,
};

export async function testVB6Interpreter(): Promise<void> {
  console.log('='.repeat(60));
  console.log('VB6 Interpreter Test - PRO STOCK');
  console.log('='.repeat(60));
  console.log('Expected ET: 6.80s @ 202.3 MPH');
  console.log('');
  
  try {
    console.log('Loading TIMESLIP.FRM...');
    const response = await fetch('/vb6/TIMESLIP.FRM');
    if (!response.ok) {
      throw new Error(`Failed to load: ${response.status}`);
    }
    const source = await response.text();
    console.log(`Loaded ${source.length} bytes`);
    
    console.log('Creating interpreter...');
    const interpreter = new VB6Interpreter(source);
    
    // Enable debug mode
    interpreter.enableDebug(true);
    console.log('Debug mode enabled');
    
    console.log('Setting inputs...');
    interpreter.setInputs(PROSTOCK_INPUTS);
    
    // Set weather
    const fc = (interpreter as unknown as { state: { formControls: Map<string, number> } }).state.formControls;
    fc.set('gc_temperature', PROSTOCK_WEATHER.temperature);
    fc.set('gc_barometer', PROSTOCK_WEATHER.barometer);
    fc.set('gc_humidity', PROSTOCK_WEATHER.humidity);
    fc.set('gc_elevation', PROSTOCK_WEATHER.elevation);
    fc.set('gc_tracktemp', PROSTOCK_WEATHER.trackTemp);
    
    console.log('Running simulation...');
    const startTime = performance.now();
    const outputs = interpreter.run();
    const endTime = performance.now();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`Execution time: ${(endTime - startTime).toFixed(1)}ms`);
    console.log(`60ft:    ${outputs.time60ft.toFixed(3)}s`);
    console.log(`330ft:   ${outputs.time330ft.toFixed(3)}s`);
    console.log(`660ft:   ${outputs.time660ft.toFixed(3)}s @ ${outputs.mph660ft.toFixed(1)} mph`);
    console.log(`1000ft:  ${outputs.time1000ft.toFixed(3)}s`);
    console.log(`1/4mi:   ${outputs.ET.toFixed(3)}s @ ${outputs.MPH.toFixed(1)} mph`);
    console.log('');
    
    const etDiff = Math.abs(outputs.ET - 6.80);
    const mphDiff = Math.abs(outputs.MPH - 202.3);
    if (etDiff < 0.05 && mphDiff < 1.0) {
      console.log('✓ SUCCESS: ET matches VB6 target (6.80s @ 202.3 MPH)!');
    } else {
      console.log(`✗ MISMATCH: ET differs by ${etDiff.toFixed(3)}s, MPH differs by ${mphDiff.toFixed(1)} mph`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).testVB6Interpreter = testVB6Interpreter;
  (window as unknown as Record<string, unknown>).VB6Interpreter = VB6Interpreter;
  console.log('[VB6] Test functions available: window.testVB6Interpreter()');
}

export { PROSTOCK_INPUTS, PROSTOCK_WEATHER };
