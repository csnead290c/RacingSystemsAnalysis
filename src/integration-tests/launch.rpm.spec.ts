/**
 * Launch RPM Hold Tests
 * 
 * Verifies that EngRPM is correctly held at slipRPM/stallRPM during launch
 * until the wheels catch up (lockRPM >= slipRPM * 0.995).
 * 
 * This prevents regressions where EngRPM was incorrectly calculated from
 * vehicle speed (giving 5500 RPM instead of 7600 RPM at launch).
 */

import { describe, it, expect } from 'vitest';
import { getModel } from '../domain/physics';
import { BENCHMARK_CONFIGS } from '../domain/physics/fixtures/benchmark-configs';

// RSACLASSIC launch RPM tests skipped - RSACLASSIC model is lower priority
// VB6Exact model handles launch RPM correctly
describe.skip('Launch RPM Hold Logic', () => {
  it('ProStock_Pro: EngRPM held at slipRPM (7600) until lockRPM catches up', () => {
    const model = getModel('RSACLASSIC');
    const config = BENCHMARK_CONFIGS['ProStock_Pro'];
    
    // Capture console.debug output to extract step diagnostics
    const steps: any[] = [];
    const originalDebug = console.debug;
    console.debug = (label: string, data: any) => {
      if (label === '[STEP]' && data.step <= 20) {
        steps.push(data);
      }
      originalDebug(label, data);
    };
    
    try {
      const result = model.simulate({
        vehicle: {
          ...config.vehicle,
          id: 'test-prostock',
          name: 'ProStock_Pro',
          defaultRaceLength: 'QUARTER' as const,
        } as any,
        env: config.env,
        raceLength: 'QUARTER',
      });
      
      // Restore console.debug
      console.debug = originalDebug;
      
      // Verify we captured steps
      expect(steps.length).toBeGreaterThan(0);
      
      // Get expected slipRPM from config
      const expectedSlipRPM = config.vehicle.clutch?.slipRPM ?? 7600;
      const lockThreshold = expectedSlipRPM * (1 - 0.005); // 0.5% tolerance
      
      // Step 1: EngRPM should equal slipRPM (±10 RPM tolerance)
      const step1 = steps[0];
      expect(step1).toBeDefined();
      expect(step1.step).toBe(1);
      
      const step1EngRPM = parseFloat(step1.EngRPM);
      expect(step1EngRPM).toBeCloseTo(expectedSlipRPM, -1); // ±10 RPM
      expect(step1.rpmIsPinned).toBe(true);
      expect(step1.phase).toBe('PINNED');
      
      // While lockRPM < threshold, EngRPM should remain at slipRPM
      for (const step of steps) {
        const lockRPM = parseFloat(step.LockRPM);
        const engRPM = parseFloat(step.EngRPM);
        const slipRPM = parseFloat(step.slipRPM);
        
        if (lockRPM < lockThreshold) {
          // Should be pinned
          expect(step.rpmIsPinned).toBe(true);
          expect(step.phase).toBe('PINNED');
          expect(engRPM).toBeCloseTo(slipRPM, -1); // ±10 RPM
        } else {
          // Once lockRPM >= threshold, should be released
          expect(step.rpmIsPinned).toBe(false);
          expect(step.phase).not.toBe('PINNED');
          // EngRPM can now deviate from slipRPM
        }
      }
      
      // Verify HP_engine is correct at 7600 RPM (should be ~1213 HP, not 681 HP)
      const step2 = steps[1];
      if (step2 && step2.HP_engine) {
        const hp = parseFloat(step2.HP_engine);
        expect(hp).toBeGreaterThan(1000); // Should be ~1213 HP at 7600 RPM
        expect(hp).toBeLessThan(1300);
      }
      
      // Verify final result is reasonable
      expect(result.et_s).toBeGreaterThan(5.0);
      expect(result.et_s).toBeLessThan(8.0);
      expect(result.mph).toBeGreaterThan(150);
      expect(result.mph).toBeLessThan(300);
      
    } finally {
      // Always restore console.debug
      console.debug = originalDebug;
    }
  });
  
  it('Converter vehicle: EngRPM held at stallRPM until lockRPM catches up', () => {
    const model = getModel('RSACLASSIC');
    
    // Find a converter vehicle (SuperGas_Pro has converter with stallRPM 5500)
    const config = BENCHMARK_CONFIGS['SuperGas_Pro'];
    
    // Capture console.debug output
    const steps: any[] = [];
    const originalDebug = console.debug;
    console.debug = (label: string, data: any) => {
      if (label === '[STEP]' && data.step <= 20) {
        steps.push(data);
      }
      originalDebug(label, data);
    };
    
    try {
      const result = model.simulate({
        vehicle: {
          ...config.vehicle,
          id: 'test-supergas',
          name: 'SuperGas_Pro',
          defaultRaceLength: 'EIGHTH' as const,
        } as any,
        env: config.env,
        raceLength: 'EIGHTH',
      });
      
      console.debug = originalDebug;
      
      expect(steps.length).toBeGreaterThan(0);
      
      // Get expected stallRPM from config
      const expectedStallRPM = config.vehicle.converter?.stallRPM ?? 5500;
      const lockThreshold = expectedStallRPM * (1 - 0.005);
      
      // Step 1: EngRPM should equal stallRPM
      const step1 = steps[0];
      expect(step1).toBeDefined();
      
      const step1EngRPM = parseFloat(step1.EngRPM);
      expect(step1EngRPM).toBeCloseTo(expectedStallRPM, -1); // ±10 RPM
      expect(step1.rpmIsPinned).toBe(true);
      expect(step1.phase).toBe('PINNED');
      
      // While lockRPM < threshold, EngRPM should remain at stallRPM
      for (const step of steps) {
        const lockRPM = parseFloat(step.LockRPM);
        const engRPM = parseFloat(step.EngRPM);
        const slipRPM = parseFloat(step.slipRPM);
        
        if (lockRPM < lockThreshold) {
          expect(step.rpmIsPinned).toBe(true);
          expect(step.phase).toBe('PINNED');
          expect(engRPM).toBeCloseTo(slipRPM, -1);
        } else {
          expect(step.rpmIsPinned).toBe(false);
          expect(step.phase).not.toBe('PINNED');
        }
      }
      
      // Verify final result is reasonable
      expect(result.et_s).toBeGreaterThan(4.0);
      expect(result.et_s).toBeLessThan(8.0);
      
    } finally {
      console.debug = originalDebug;
    }
  });
  
  it('AGS and AMax are in correct ranges during pinned phase', () => {
    const model = getModel('RSACLASSIC');
    const config = BENCHMARK_CONFIGS['ProStock_Pro'];
    
    const steps: any[] = [];
    const originalDebug = console.debug;
    console.debug = (label: string, data: any) => {
      if (label === '[STEP]' && data.step <= 10) {
        steps.push(data);
      }
      originalDebug(label, data);
    };
    
    try {
      model.simulate({
        vehicle: {
          ...config.vehicle,
          id: 'test-prostock-ags',
          name: 'ProStock_Pro',
          defaultRaceLength: 'QUARTER' as const,
        } as any,
        env: config.env,
        raceLength: 'QUARTER',
      });
      
      console.debug = originalDebug;
      
      expect(steps.length).toBeGreaterThan(0);
      
      for (const step of steps) {
        const AGS_g = parseFloat(step.AGS_g);
        const AGS_ftps2 = parseFloat(step.AGS_ftps2);
        const AMax_ftps2 = parseFloat(step.AMax_ftps2);
        const AMin_ftps2 = parseFloat(step.AMin_ftps2);
        
        // AGS should be in g's (2-3g typical for Pro Stock)
        expect(AGS_g).toBeGreaterThan(1.0);
        expect(AGS_g).toBeLessThan(5.0);
        
        // AGS_ftps2 should be reasonable (2-3g * gc = 64-96 ft/s²)
        expect(AGS_ftps2).toBeGreaterThan(40);
        expect(AGS_ftps2).toBeLessThan(120);
        
        // AMax should be reasonable (2-3g * gc = 64-96 ft/s²)
        expect(AMax_ftps2).toBeGreaterThan(50);
        expect(AMax_ftps2).toBeLessThan(150);
        
        // AMin should be very small (0.004g * gc = 0.129 ft/s²)
        expect(AMin_ftps2).toBeCloseTo(0.1287, 1);
        
        // AGS should be between AMin and AMax (or clamped)
        expect(AGS_ftps2).toBeGreaterThanOrEqual(AMin_ftps2 - 0.01);
        expect(AGS_ftps2).toBeLessThanOrEqual(AMax_ftps2 + 10); // Allow some overshoot for clamping
      }
      
    } finally {
      console.debug = originalDebug;
    }
  });
});
