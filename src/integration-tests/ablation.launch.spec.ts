/**
 * Ablation tests for launch physics.
 * 
 * Tests the launch system with various loss configurations to verify:
 * 1. Bootstrap transitions off AMin quickly
 * 2. Physics scale is reasonable
 * 3. Loss calculations are correct
 */

import { describe, it, expect } from 'vitest';
import { getModel } from '../domain/physics';
import { BENCHMARK_CONFIGS } from '../domain/physics/fixtures/benchmark-configs';

describe('Launch Ablation Tests', () => {
  const model = getModel('RSACLASSIC');
  
  it('Test A: No losses - should achieve high speed and low ET', () => {
    // Get ProStock_Pro config
    const baseConfig = BENCHMARK_CONFIGS['ProStock_Pro'];
    if (!baseConfig) throw new Error('ProStock_Pro config not found');
    
    // Remove all losses
    const noLossConfig: any = {
      ...baseConfig,
      vehicle: {
        ...baseConfig.vehicle,
        cd: 0,           // No aero drag
        rrCoeff: 0,      // No rolling resistance
        transEff: 1.0,   // Perfect transmission
      },
      env: {
        ...baseConfig.env,
        tractionIndex: 1.0, // Perfect traction
      },
      raceLength: 'QUARTER',
    };
    
    const result = model.simulate(noLossConfig);
    
    console.log('\n[Test A - No Losses]');
    console.log('ET:', result.et_s.toFixed(3), 's');
    console.log('MPH:', result.mph.toFixed(1), 'mph');
    console.log('Termination:', result.meta.termination);
    
    // With no losses, should be very fast
    expect(result.mph).toBeGreaterThan(150); // Should exceed 150 mph
    expect(result.et_s).toBeLessThan(8);     // Should be under 8 seconds
    expect(result.meta.termination?.reason).toBe('DISTANCE');
  });
  
  it('Test B: Light losses - should still perform well', () => {
    // Get ProStock_Pro config
    const baseConfig = BENCHMARK_CONFIGS['ProStock_Pro'];
    if (!baseConfig) throw new Error('ProStock_Pro config not found');
    
    // Light losses
    const lightLossConfig: any = {
      ...baseConfig,
      vehicle: {
        ...baseConfig.vehicle,
        cd: 0.5,         // Light aero drag (vs ~1.0 typical)
        rrCoeff: 0.01,   // Light rolling resistance (vs ~0.025 typical)
      },
      env: {
        ...baseConfig.env,
        tractionIndex: 0.95, // Good traction
      },
      raceLength: 'QUARTER',
    };
    
    const result = model.simulate(lightLossConfig);
    
    console.log('\n[Test B - Light Losses]');
    console.log('ET:', result.et_s.toFixed(3), 's');
    console.log('MPH:', result.mph.toFixed(1), 'mph');
    console.log('Termination:', result.meta.termination);
    
    // With light losses, should still be fast
    expect(result.mph).toBeGreaterThan(20);  // Should be much faster than 20 mph
    expect(result.et_s).toBeLessThan(13);    // Should be much faster than 13 seconds
    expect(result.meta.termination?.reason).toBe('DISTANCE');
  });
  
  it('Test C: Full losses - verify bootstrap transitions off AMin', () => {
    // Get ProStock_Pro config with normal losses
    const baseConfig = BENCHMARK_CONFIGS['ProStock_Pro'];
    if (!baseConfig) throw new Error('ProStock_Pro config not found');
    
    const result = model.simulate({
      ...baseConfig,
      raceLength: 'QUARTER',
    } as any);
    
    console.log('\n[Test C - Full Losses (Normal)]');
    console.log('ET:', result.et_s.toFixed(3), 's');
    console.log('MPH:', result.mph.toFixed(1), 'mph');
    console.log('Termination:', result.meta.termination);
    
    // Should complete the run
    expect(result.meta.termination?.reason).toBe('DISTANCE');
    
    // Should have reasonable performance (not stuck at AMin)
    // If stuck at AMin (0.004 ft/s² = 0.0001g), would take forever
    // Even with losses, should complete quarter mile in reasonable time
    expect(result.et_s).toBeLessThan(30); // Should finish before timeout
    expect(result.mph).toBeGreaterThan(10); // Should be moving
  });
});
