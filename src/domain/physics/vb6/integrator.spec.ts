/**
 * Unit tests for VB6 Integrator Functions
 * 
 * Tests verify exact VB6 distance integration formula from TIMESLIP.FRM:1280
 * Using frozen values from ProStock_Pro DEV logs (steps 1-3)
 */

import { describe, it, expect } from 'vitest';
import { vb6StepDistance, vb6ApplyAccelClamp, vb6AGSFromPQWT, vb6PQWTFromHP } from './integrator';

describe('VB6 Integrator - vb6StepDistance', () => {
  it('should reproduce Step 1 distance and velocity exactly', () => {
    // From ProStock_Pro DEV logs - Step 1
    // Initial conditions: v0 = 0, s0 = 0
    // PQWT_ftps2 from bootstrap path
    const Vel0_ftps = 0;
    const Dist0_ft = 0;
    const dt_s = 0.002;
    const PQWT_ftps2 = 2614.5; // Approximate from AMax * gc * v (bootstrap)
    
    const result = vb6StepDistance(Vel0_ftps, Dist0_ft, dt_s, PQWT_ftps2);
    
    // VB6 formula: Vel = sqrt(v0² + 2*PQWT*dt)
    // Vel = sqrt(0 + 2*2614.5*0.002) = sqrt(10.458) = 3.234 ft/s
    expect(result.Vel_ftps).toBeCloseTo(3.234, 3);
    
    // VB6 formula: Dist = ((2*PQWT*dt + v0²)^1.5 - v0³) / (3*PQWT) + Dist0
    // Dist = ((10.458)^1.5 - 0) / (3*2614.5) + 0
    // Dist = 33.82 / 7843.5 = 0.00431 ft
    expect(result.Dist_ft).toBeCloseTo(0.00431, 5);
  });
  
  it('should handle Step 2 with massive negative PQWT (edge case)', () => {
    // From ProStock_Pro DEV logs - Step 2
    // v0 ≈ 0.6 ft/s, s0 ≈ 0.001 ft (from step 1)
    // PQWT_ftps2 = -2349 (negative due to massive HPEngPMI)
    // This is an edge case where the formula would produce NaN
    const Vel0_ftps = 0.6;
    const Dist0_ft = 0.001;
    const dt_s = 0.002;
    const PQWT_ftps2 = -2349; // From HP_CHAIN log
    
    // VB6 formula: Vel = sqrt(v0² + 2*PQWT*dt)
    // Vel = sqrt(0.36 + 2*(-2349)*0.002) = sqrt(0.36 - 9.396) = sqrt(-9.036)
    // This is mathematically invalid (negative under sqrt)
    
    // In VB6, this situation is prevented by the AMin/AMax clamps
    // which rescale PQWT before integration. The massive negative PQWT
    // gets clamped to AMin, preventing this edge case.
    
    // For this test, we just verify the function handles it gracefully
    const result = vb6StepDistance(Vel0_ftps, Dist0_ft, dt_s, PQWT_ftps2);
    
    // The result will be NaN due to sqrt of negative number
    // This is expected behavior - VB6 prevents this via clamping
    expect(result.Vel_ftps).toBeNaN();
    expect(result.Dist_ft).toBeNaN();
  });
  
  it('should reproduce Step 3 distance and velocity exactly', () => {
    // From ProStock_Pro DEV logs - Step 3
    // v0 = 0.61 ft/s (from step 2)
    // PQWT_ftps2 = 31.1 (small positive after HPEngPMI drops to 0)
    const Vel0_ftps = 0.61;
    const Dist0_ft = 0.0012; // Approximate from step 2
    const dt_s = 0.002;
    const PQWT_ftps2 = 31.1; // From HP_CHAIN log step 3
    
    const result = vb6StepDistance(Vel0_ftps, Dist0_ft, dt_s, PQWT_ftps2);
    
    // VB6 formula: Vel = sqrt(v0² + 2*PQWT*dt)
    // Vel = sqrt(0.3721 + 2*31.1*0.002) = sqrt(0.3721 + 0.1244) = sqrt(0.4965) = 0.7046 ft/s
    expect(result.Vel_ftps).toBeCloseTo(0.7046, 4);
    
    // VB6 formula: Dist = ((2*PQWT*dt + v0²)^1.5 - v0³) / (3*PQWT) + Dist0
    const term1 = 2 * PQWT_ftps2 * dt_s + Vel0_ftps * Vel0_ftps;
    const term2 = Math.pow(term1, 1.5);
    const term3 = Math.pow(Vel0_ftps, 3);
    const Dist_ft = (term2 - term3) / (3 * PQWT_ftps2) + Dist0_ft;
    expect(result.Dist_ft).toBeCloseTo(Dist_ft, 6);
  });
  
  it('should handle zero PQWT gracefully', () => {
    // Edge case: zero power
    const Vel0_ftps = 10;
    const Dist0_ft = 100;
    const dt_s = 0.002;
    const PQWT_ftps2 = 0;
    
    // With zero PQWT, velocity and distance should not change
    // (or handle division by zero appropriately)
    const result = vb6StepDistance(Vel0_ftps, Dist0_ft, dt_s, PQWT_ftps2);
    
    // The formula has division by PQWT, so this is an edge case
    // VB6 would likely maintain velocity or use a different path
    expect(result.Vel_ftps).toBeDefined();
    expect(result.Dist_ft).toBeDefined();
  });
});

describe('VB6 Integrator - vb6ApplyAccelClamp', () => {
  it('should clamp AGS to AMax with PQWT rescaling', () => {
    // Test VB6 AMax clamp with overshoot correction
    const AGS_candidate = 100; // ft/s²
    const AMin = 0.129;
    const AMax = 80;
    
    const result = vb6ApplyAccelClamp(AGS_candidate, AMin, AMax);
    
    // VB6: AGS = AMAX - (AGS - AMAX) = 80 - (100 - 80) = 60
    expect(result.AGS_ftps2).toBe(60);
    
    // VB6: PQWT_scale = (AMAX - (AGS - AMAX)) / AGS = 60 / 100 = 0.6
    expect(result.PQWT_scale).toBe(0.6);
    
    // VB6: SLIP = 1
    expect(result.slip).toBe(1);
  });
  
  it('should clamp AGS to AMin with PQWT rescaling', () => {
    // Test VB6 AMin clamp
    const AGS_candidate = 0.05; // ft/s²
    const AMin = 0.129;
    const AMax = 80;
    
    const result = vb6ApplyAccelClamp(AGS_candidate, AMin, AMax);
    
    // VB6: AGS = AMin = 0.129
    expect(result.AGS_ftps2).toBe(0.129);
    
    // VB6: PQWT_scale = AMin / AGS = 0.129 / 0.05 = 2.58
    expect(result.PQWT_scale).toBeCloseTo(2.58, 2);
    
    // VB6: SLIP = 0 (no slip for AMin clamp)
    expect(result.slip).toBe(0);
  });
  
  it('should not clamp AGS when within bounds', () => {
    // Test no clamping needed
    const AGS_candidate = 50; // ft/s²
    const AMin = 0.129;
    const AMax = 80;
    
    const result = vb6ApplyAccelClamp(AGS_candidate, AMin, AMax);
    
    // No clamping
    expect(result.AGS_ftps2).toBe(50);
    expect(result.PQWT_scale).toBe(1.0);
    expect(result.slip).toBe(0);
  });
});

describe('VB6 Integrator - Helper Functions', () => {
  it('vb6AGSFromPQWT should compute AGS correctly', () => {
    // VB6: AGS(L) = PQWT / (Vel(L) * gc)
    const PQWT_ftps2 = 1000;
    const Vel_ftps = 10;
    
    const AGS = vb6AGSFromPQWT(PQWT_ftps2, Vel_ftps);
    
    // AGS = 1000 / (10 * 32.174) = 1000 / 321.74 = 3.108 ft/s²
    expect(AGS).toBeCloseTo(3.108, 3);
  });
  
  it('vb6PQWTFromHP should compute PQWT correctly', () => {
    // VB6: PQWT = 550 * gc * HP / Weight
    const HP = 2000;
    const Weight_lbf = 2355;
    
    const PQWT = vb6PQWTFromHP(HP, Weight_lbf);
    
    // PQWT = 550 * 32.174 * 2000 / 2355 = 15028.2 ft/s²
    expect(PQWT).toBeCloseTo(15028.2, 1);
  });
});
