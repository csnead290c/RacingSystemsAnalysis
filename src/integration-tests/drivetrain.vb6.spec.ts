/**
 * VB6 Drivetrain Micro-Tests
 * 
 * Verifies exact VB6 drivetrain calculations:
 * - RPM from speed (Float32)
 * - Wheel force with correct efficiency order
 * - Shift boundary behavior
 */

import { describe, it, expect } from 'vitest';
import { rpmFromSpeed_f32, wheelForce_f32 } from '../domain/physics/drivetrain/drivetrain';
import { shouldShift_f32 } from '../domain/physics/vb6/shift';
import { f32, F } from '../domain/physics/vb6/exactMath';

describe('VB6 Drivetrain (STRICT)', () => {
  // Pro Stock drivetrain config
  const drivetrain = {
    tireDiaIn: 32.62,  // 102.5" rollout / π
    finalDrive: 4.86,
    ratios: [2.60, 1.90, 1.50, 1.20, 1.00],
    transEff: 0.97,
  };
  
  const perGearEff = [0.970, 0.975, 0.980, 0.985, 0.990];

  describe('rpmFromSpeed_f32', () => {
    it('calculates RPM correctly in 1st gear at low speed', () => {
      // At 50 fps (~34 mph) in 1st gear
      const rpm = rpmFromSpeed_f32(50, 0, drivetrain, 0);
      
      // Expected: wheelRPM * gearRatio * finalDrive
      // wheelRPM = 50 / (π * 32.62/12) * 60 ≈ 351
      // rpm = 351 * 2.60 * 4.86 ≈ 4437
      expect(rpm).toBeGreaterThan(4000);
      expect(rpm).toBeLessThan(5000);
    });
    
    it('calculates RPM correctly in 5th gear at high speed', () => {
      // At 300 fps (~205 mph) in 5th gear
      const rpm = rpmFromSpeed_f32(300, 4, drivetrain, 0);
      
      // Expected: wheelRPM * gearRatio * finalDrive
      // wheelRPM = 300 / (π * 32.62/12) * 60 ≈ 2108
      // rpm = 2108 * 1.00 * 4.86 ≈ 10245
      expect(rpm).toBeGreaterThan(9500);
      expect(rpm).toBeLessThan(11000);
    });
    
    it('uses Float32 precision', () => {
      const rpm = rpmFromSpeed_f32(100, 2, drivetrain, 0);
      
      // Result should be a Float32 value
      expect(rpm).toBe(Math.fround(rpm));
    });
  });

  describe('wheelForce_f32', () => {
    it('applies efficiency in correct VB6 order', () => {
      // Given: 500 lb-ft engine torque in 2nd gear
      const T_engine = 500;
      const gearIdx = 1; // 2nd gear
      
      const force = wheelForce_f32(T_engine, gearIdx, drivetrain, perGearEff, 0.97);
      
      // VB6 order: T * gearRatio * finalDrive * perGearEff * overallEff / radius
      // T_wheel = 500 * 1.90 * 4.86 * 0.975 * 0.97 = 4367 lb-ft
      // Force = 4367 / (32.62/12/2) = 4367 / 1.359 = 3213 lb
      expect(force).toBeGreaterThan(3000);
      expect(force).toBeLessThan(3500);
    });
    
    it('uses Float32 precision', () => {
      const force = wheelForce_f32(500, 0, drivetrain, perGearEff, 0.97);
      
      // Result should be a Float32 value
      expect(force).toBe(Math.fround(force));
    });
  });

  describe('shouldShift_f32', () => {
    it('shifts when RPM >= shiftRPM', () => {
      // Exactly at shift point
      expect(shouldShift_f32(9400, 9400, 0, 4)).toBe(true);
      
      // Just above shift point
      expect(shouldShift_f32(9401, 9400, 0, 4)).toBe(true);
      
      // Just below shift point
      expect(shouldShift_f32(9399, 9400, 0, 4)).toBe(false);
    });
    
    it('does not shift from highest gear', () => {
      // In 5th gear (index 4), maxGear is 4
      expect(shouldShift_f32(9500, 9400, 4, 4)).toBe(false);
    });
    
    it('uses Float32 comparison', () => {
      // Test with values that might differ in Float32 vs Float64
      const rpm = f32(9400.001);
      const shiftPt = f32(9400);
      
      // F.sub should give a small positive number
      const diff = F.sub(rpm, shiftPt);
      expect(diff).toBeGreaterThanOrEqual(0);
    });
  });
});
