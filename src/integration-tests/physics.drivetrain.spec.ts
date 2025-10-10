/**
 * Integration tests for RSACLASSIC drivetrain and shift logic.
 */

import { describe, it, expect } from 'vitest';
import { rpmFromSpeed, wheelForce_lb, speedFromRPM, type Drivetrain } from '../domain/physics/drivetrain/drivetrain';
import { maybeShift, rpmAfterShift, maybeDownshift } from '../domain/physics/drivetrain/shift';

describe('Physics Drivetrain', () => {
  const testDrivetrain: Drivetrain = {
    ratios: [2.66, 1.78, 1.30, 1.00, 0.74], // 5-speed
    finalDrive: 3.73,
    transEff: 0.90,
    tireDiaIn: 28,
    shiftRPM: [6500, 6500, 6500, 6500, 7000],
  };

  describe('rpmFromSpeed', () => {
    it('should calculate RPM from speed', () => {
      const v_fps = 100; // ~68 mph
      const gearIdx = 2; // 3rd gear
      
      const rpm = rpmFromSpeed(v_fps, gearIdx, testDrivetrain);
      
      // Should return positive RPM
      expect(rpm).toBeGreaterThan(0);
      expect(rpm).toBeGreaterThan(3000);
      expect(rpm).toBeLessThan(8000);
    });

    it('should increase RPM with higher speed', () => {
      const gearIdx = 2;
      
      const rpm50 = rpmFromSpeed(50, gearIdx, testDrivetrain);
      const rpm100 = rpmFromSpeed(100, gearIdx, testDrivetrain);
      
      // RPM should double when speed doubles
      expect(rpm100).toBeGreaterThan(rpm50);
      expect(rpm100 / rpm50).toBeCloseTo(2.0, 1);
    });

    it('should increase RPM with higher gear ratio', () => {
      const v_fps = 100;
      
      const rpm1st = rpmFromSpeed(v_fps, 0, testDrivetrain); // 1st gear (2.66)
      const rpm3rd = rpmFromSpeed(v_fps, 2, testDrivetrain); // 3rd gear (1.30)
      
      // Lower gear (higher ratio) = higher RPM at same speed
      expect(rpm1st).toBeGreaterThan(rpm3rd);
    });

    it('should account for tire slip', () => {
      const v_fps = 100;
      const gearIdx = 2;
      
      const rpmNoSlip = rpmFromSpeed(v_fps, gearIdx, testDrivetrain, 0);
      const rpmWithSlip = rpmFromSpeed(v_fps, gearIdx, testDrivetrain, 0.1); // 10% slip
      
      // Slip increases RPM
      expect(rpmWithSlip).toBeGreaterThan(rpmNoSlip);
      expect(rpmWithSlip / rpmNoSlip).toBeCloseTo(1.1, 2);
    });

    it('should handle zero speed', () => {
      const rpm = rpmFromSpeed(0, 0, testDrivetrain);
      
      expect(rpm).toBe(0);
    });

    it('should be deterministic', () => {
      const v_fps = 75;
      const gearIdx = 1;
      
      const rpm1 = rpmFromSpeed(v_fps, gearIdx, testDrivetrain);
      const rpm2 = rpmFromSpeed(v_fps, gearIdx, testDrivetrain);
      
      expect(rpm1).toBe(rpm2);
    });
  });

  describe('wheelForce_lb', () => {
    it('should calculate wheel force from torque', () => {
      const tq_lbft = 400;
      const gearIdx = 0; // 1st gear
      
      const force = wheelForce_lb(tq_lbft, gearIdx, testDrivetrain);
      
      // Should return positive force
      expect(force).toBeGreaterThan(0);
      expect(force).toBeGreaterThan(1000); // Significant multiplication in 1st gear
    });

    it('should increase force with higher gear ratio', () => {
      const tq_lbft = 400;
      
      const force1st = wheelForce_lb(tq_lbft, 0, testDrivetrain); // 1st gear (2.66)
      const force5th = wheelForce_lb(tq_lbft, 4, testDrivetrain); // 5th gear (0.74)
      
      // Lower gear (higher ratio) = more force
      expect(force1st).toBeGreaterThan(force5th);
    });

    it('should scale linearly with torque', () => {
      const gearIdx = 2;
      
      const force200 = wheelForce_lb(200, gearIdx, testDrivetrain);
      const force400 = wheelForce_lb(400, gearIdx, testDrivetrain);
      
      // Force should double when torque doubles
      expect(force400 / force200).toBeCloseTo(2.0, 5);
    });

    it('should account for transmission efficiency', () => {
      const tq_lbft = 400;
      const gearIdx = 2;
      
      const force = wheelForce_lb(tq_lbft, gearIdx, testDrivetrain);
      
      // Force should be reduced by transEff (0.90)
      // Calculate expected force manually
      const gearRatio = testDrivetrain.ratios[gearIdx];
      const tireRadius_ft = (testDrivetrain.tireDiaIn / 12) / 2;
      const expectedForce = (tq_lbft * gearRatio * testDrivetrain.finalDrive * testDrivetrain.transEff) / tireRadius_ft;
      
      expect(force).toBeCloseTo(expectedForce, 1);
    });

    it('should handle zero torque', () => {
      const force = wheelForce_lb(0, 0, testDrivetrain);
      
      expect(force).toBe(0);
    });
  });

  describe('speedFromRPM', () => {
    it('should be inverse of rpmFromSpeed', () => {
      const originalSpeed = 100;
      const gearIdx = 2;
      
      const rpm = rpmFromSpeed(originalSpeed, gearIdx, testDrivetrain);
      const calculatedSpeed = speedFromRPM(rpm, gearIdx, testDrivetrain);
      
      expect(calculatedSpeed).toBeCloseTo(originalSpeed, 5);
    });

    it('should calculate speed from RPM', () => {
      const rpm = 6000;
      const gearIdx = 3; // 4th gear
      
      const speed = speedFromRPM(rpm, gearIdx, testDrivetrain);
      
      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeGreaterThan(50);
    });
  });

  describe('maybeShift', () => {
    it('should not shift when RPM below threshold', () => {
      const rpm = 5000;
      const gearIdx = 0;
      
      const newGear = maybeShift(rpm, gearIdx, testDrivetrain);
      
      expect(newGear).toBe(gearIdx); // No shift
    });

    it('should shift when RPM at threshold', () => {
      const rpm = 6500;
      const gearIdx = 0;
      
      const newGear = maybeShift(rpm, gearIdx, testDrivetrain);
      
      expect(newGear).toBe(gearIdx + 1); // Shift to 2nd
    });

    it('should shift when RPM above threshold', () => {
      const rpm = 7000;
      const gearIdx = 1;
      
      const newGear = maybeShift(rpm, gearIdx, testDrivetrain);
      
      expect(newGear).toBe(gearIdx + 1); // Shift to 3rd
    });

    it('should not shift when in top gear', () => {
      const rpm = 8000;
      const gearIdx = 4; // 5th gear (top gear)
      
      const newGear = maybeShift(rpm, gearIdx, testDrivetrain);
      
      expect(newGear).toBe(gearIdx); // Stay in 5th
    });

    it('should advance gear when rpm >= threshold', () => {
      const gearIdx = 2;
      const threshold = testDrivetrain.shiftRPM[gearIdx];
      
      const newGear = maybeShift(threshold, gearIdx, testDrivetrain);
      
      expect(newGear).toBe(gearIdx + 1);
    });
  });

  describe('rpmAfterShift', () => {
    it('should calculate RPM drop after upshift', () => {
      const currentRPM = 6500;
      const fromGear = 0; // 1st (2.66)
      const toGear = 1;   // 2nd (1.78)
      
      const newRPM = rpmAfterShift(currentRPM, fromGear, toGear, testDrivetrain);
      
      // RPM should drop
      expect(newRPM).toBeLessThan(currentRPM);
      
      // Should drop proportionally to ratio change
      const expectedRPM = currentRPM * (testDrivetrain.ratios[toGear] / testDrivetrain.ratios[fromGear]);
      expect(newRPM).toBeCloseTo(expectedRPM, 1);
    });

    it('should show larger RPM drop for bigger ratio change', () => {
      const currentRPM = 6500;
      
      const drop1to2 = currentRPM - rpmAfterShift(currentRPM, 0, 1, testDrivetrain);
      const drop3to4 = currentRPM - rpmAfterShift(currentRPM, 2, 3, testDrivetrain);
      
      // 1st to 2nd has bigger ratio change than 3rd to 4th
      expect(drop1to2).toBeGreaterThan(drop3to4);
    });
  });

  describe('maybeDownshift', () => {
    it('should not downshift when RPM above minimum', () => {
      const rpm = 3000;
      const gearIdx = 2;
      const minRPM = 2000;
      
      const newGear = maybeDownshift(rpm, gearIdx, minRPM);
      
      expect(newGear).toBe(gearIdx); // No downshift
    });

    it('should downshift when RPM below minimum', () => {
      const rpm = 1500;
      const gearIdx = 2;
      const minRPM = 2000;
      
      const newGear = maybeDownshift(rpm, gearIdx, minRPM);
      
      expect(newGear).toBe(gearIdx - 1); // Downshift to 2nd
    });

    it('should not downshift when in first gear', () => {
      const rpm = 1000;
      const gearIdx = 0;
      const minRPM = 2000;
      
      const newGear = maybeDownshift(rpm, gearIdx, minRPM);
      
      expect(newGear).toBe(gearIdx); // Stay in 1st
    });
  });

  describe('Real-world scenarios', () => {
    it('should model typical drag race shift pattern', () => {
      let gearIdx = 0;
      let rpm = 3000;
      
      // Accelerate in 1st gear
      rpm = 6500;
      gearIdx = maybeShift(rpm, gearIdx, testDrivetrain);
      expect(gearIdx).toBe(1); // Shifted to 2nd
      
      // RPM drops after shift
      rpm = rpmAfterShift(6500, 0, 1, testDrivetrain);
      expect(rpm).toBeLessThan(6500);
      expect(rpm).toBeGreaterThan(4000);
      
      // Accelerate in 2nd gear
      rpm = 6500;
      gearIdx = maybeShift(rpm, gearIdx, testDrivetrain);
      expect(gearIdx).toBe(2); // Shifted to 3rd
    });

    it('should calculate realistic wheel force in 1st gear', () => {
      const tq_lbft = 400;
      const force = wheelForce_lb(tq_lbft, 0, testDrivetrain);
      
      // With 2.66 gear ratio, 3.73 final drive, 0.90 efficiency
      // Expected: (400 * 2.66 * 3.73 * 0.90) / (28/12/2) = ~3040 lb
      expect(force).toBeGreaterThan(3000);
      expect(force).toBeLessThan(3500);
    });

    it('should be deterministic across multiple calculations', () => {
      const v_fps = 88; // ~60 mph
      const tq_lbft = 450;
      const gearIdx = 2;
      
      const rpm1 = rpmFromSpeed(v_fps, gearIdx, testDrivetrain);
      const rpm2 = rpmFromSpeed(v_fps, gearIdx, testDrivetrain);
      
      const force1 = wheelForce_lb(tq_lbft, gearIdx, testDrivetrain);
      const force2 = wheelForce_lb(tq_lbft, gearIdx, testDrivetrain);
      
      expect(rpm1).toBe(rpm2);
      expect(force1).toBe(force2);
    });
  });
});
