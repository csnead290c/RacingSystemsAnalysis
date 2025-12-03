/**
 * VB6 Exact Model Tests
 * 
 * Tests the new VB6 exact simulation model that implements
 * the full VB6 TIMESLIP.FRM iteration loop.
 */

import { describe, it, expect } from 'vitest';
import { simulateVB6Exact } from '../domain/physics/models/vb6Exact';
import type { SimInputs } from '../domain/physics';

// Test fixture based on pro-supergas
const supergasInput = {
  vehicle: {
    id: 'test-supergas',
    name: 'Test SuperGas',
    weightLb: 2300,
    powerHP: 600,
    rearGear: 4.10,
    defaultRaceLength: 'QUARTER' as const,
    tireDiaIn: 32,
    tireWidthIn: 17,
    rolloutIn: 12,
    wheelbaseIn: 103,
    frontalArea_ft2: 20,
    cd: 0.35,
    liftCoeff: 0,
    torqueCurve: [
      { rpm: 3000, hp: 200 },
      { rpm: 4000, hp: 350 },
      { rpm: 5000, hp: 480 },
      { rpm: 6000, hp: 560 },
      { rpm: 7000, hp: 600 },
      { rpm: 7500, hp: 580 },
    ],
    converter: {
      stallRPM: 5500,
      slipRatio: 1.06,
      torqueMult: 2.2,
      lockup: false,
    },
    gearRatios: [2.48, 1.48, 1.00],
    finalDrive: 4.10,
    shiftRPM: [7200, 7200, 7200],
  },
  env: {
    elevation: 850,
    barometerInHg: 29.92,
    temperatureF: 77,
    humidityPct: 30,
    trackTempF: 102,
    tractionIndex: 5,
    windMph: 0,
    windAngleDeg: 0,
  },
  raceLength: 'QUARTER' as const,
} satisfies SimInputs;

describe('VB6 Exact Model', () => {
  it('should complete a simulation without errors', () => {
    const result = simulateVB6Exact(supergasInput);
    
    expect(result).toBeDefined();
    expect(result.et_s).toBeGreaterThan(0);
    expect(result.mph).toBeGreaterThan(0);
    expect(result.timeslip.length).toBeGreaterThan(0);
  });
  
  it('should produce reasonable ET for supergas setup', () => {
    const result = simulateVB6Exact(supergasInput);
    
    // SuperGas target is ~9.9s ET
    expect(result.et_s).toBeGreaterThan(8);
    expect(result.et_s).toBeLessThan(12);
  });
  
  it('should produce reasonable MPH for supergas setup', () => {
    const result = simulateVB6Exact(supergasInput);
    
    // SuperGas target is ~135 MPH
    expect(result.mph).toBeGreaterThan(100);
    expect(result.mph).toBeLessThan(180);
  });
  
  it('should record timeslip points', () => {
    const result = simulateVB6Exact(supergasInput);
    
    // Should have at least 60ft, 330ft, 660ft, 1000ft, 1320ft
    expect(result.timeslip.length).toBeGreaterThanOrEqual(5);
    
    // Check 60ft exists
    const sixtyFt = result.timeslip.find(t => t.d_ft === 60);
    expect(sixtyFt).toBeDefined();
    expect(sixtyFt!.t_s).toBeGreaterThan(0);
    expect(sixtyFt!.t_s).toBeLessThan(3); // Should be under 3 seconds
  });
  
  it('should track convergence iterations', () => {
    const result = simulateVB6Exact(supergasInput);
    
    expect(result.vb6Diagnostics).toBeDefined();
    expect(result.vb6Diagnostics!.iterations.length).toBeGreaterThan(0);
    
    // Most iterations should converge quickly (1-3 iterations)
    const avgIterations = result.vb6Diagnostics!.iterations.reduce((a, b) => a + b, 0) / 
                          result.vb6Diagnostics!.iterations.length;
    expect(avgIterations).toBeLessThan(6); // Should average under 6 iterations
  });
  
  it('should produce traces', () => {
    const result = simulateVB6Exact(supergasInput);
    
    expect(result.traces).toBeDefined();
    expect(result.traces!.length).toBeGreaterThan(50); // Should have many trace points
    
    // Check trace structure
    const firstTrace = result.traces![0];
    expect(firstTrace.t_s).toBeDefined();
    expect(firstTrace.v_mph).toBeDefined();
    expect(firstTrace.a_g).toBeDefined();
    expect(firstTrace.s_ft).toBeDefined();
    expect(firstTrace.rpm).toBeDefined();
    expect(firstTrace.gear).toBeDefined();
  });
});
