/**
 * Unit tests for VB6 Cam Profile and Interpolation
 * Verifies exact VB6 behavior for cam lift calculations
 */

import { describe, test, expect } from 'vitest';
import { vb6ValveLiftAtAngle, VB6CamType } from '../vb6CamProfile';
import { TABY, DTABY } from '../vb6Interpolation';

describe('VB6 Interpolation Functions', () => {
  describe('TABY - 1D Lagrangian Interpolation', () => {
    test('Linear interpolation between two points', () => {
      // VB6 1-based arrays
      const XTAB = [0, 0, 100];  // x values: 0, 100
      const YTAB = [0, 0, 200];  // y values: 0, 200
      
      // Interpolate at x=50, should give y=100
      const result = TABY(XTAB, YTAB, 2, 1, 50);
      expect(result).toBeCloseTo(100, 6);
    });

    test('Exact match returns exact value', () => {
      const XTAB = [0, 10, 20, 30];
      const YTAB = [0, 100, 200, 300];
      
      // Exact match at x=20
      const result = TABY(XTAB, YTAB, 3, 2, 20);
      expect(result).toBeCloseTo(200, 6);
    });

    test('Extrapolation below range', () => {
      const XTAB = [0, 10, 20];
      const YTAB = [0, 100, 200];
      
      // Below range at x=5
      const result = TABY(XTAB, YTAB, 2, 1, 5);
      expect(result).toBeCloseTo(50, 6);
    });
  });

  describe('DTABY - 2D Lagrangian Interpolation', () => {
    test('2D interpolation in simple grid', () => {
      // 2x2 grid: x=[0,1], z=[0,1], y=[[0,1],[2,3]]
      const XTAB = [0, 0, 1];
      const ZTAB = [0, 0, 1];
      const YTAB = [0, 0, 1, 2, 3]; // Flattened: y[1,1]=0, y[2,1]=1, y[1,2]=2, y[2,2]=3
      
      // Interpolate at (x=0.5, z=0.5), should give y=1.5
      const result = DTABY(XTAB, ZTAB, YTAB, 2, 2, 1, 1, 0.5, 0.5);
      expect(result).toBeCloseTo(1.5, 6);
    });
  });
});

describe('VB6 Cam Profile - Invariants', () => {
  const BASE_CASE = {
    camType: VB6CamType.NormalFlatTappet,
    duration050_deg: 264,
    lobeCenterline_deg: 105,
    maxLift_in: 0.550,
  };

  test('At lobe centerline (ILC), lift equals max lift', () => {
    const lift = vb6ValveLiftAtAngle(
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.camType,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    expect(lift).toBeCloseTo(BASE_CASE.maxLift_in, 6);
  });

  test('At IVO @ .050, lift equals 0.050', () => {
    const IVO = BASE_CASE.lobeCenterline_deg - BASE_CASE.duration050_deg / 2;
    const lift = vb6ValveLiftAtAngle(
      IVO,
      BASE_CASE.camType,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    expect(lift).toBeCloseTo(0.050, 6);
  });

  test('At IVC @ .050, lift equals 0.050', () => {
    const IVC = BASE_CASE.lobeCenterline_deg + BASE_CASE.duration050_deg / 2;
    const lift = vb6ValveLiftAtAngle(
      IVC,
      BASE_CASE.camType,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    expect(lift).toBeCloseTo(0.050, 6);
  });

  test('Before IVO, lift is zero', () => {
    const IVO = BASE_CASE.lobeCenterline_deg - BASE_CASE.duration050_deg / 2;
    const lift = vb6ValveLiftAtAngle(
      IVO - 10,
      BASE_CASE.camType,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    expect(lift).toBe(0);
  });

  test('After IVC, lift is zero', () => {
    const IVC = BASE_CASE.lobeCenterline_deg + BASE_CASE.duration050_deg / 2;
    const lift = vb6ValveLiftAtAngle(
      IVC + 10,
      BASE_CASE.camType,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    expect(lift).toBe(0);
  });

  test('Lift is symmetric around lobe centerline', () => {
    const offset = 30; // degrees before/after ILC
    
    const liftBefore = vb6ValveLiftAtAngle(
      BASE_CASE.lobeCenterline_deg - offset,
      BASE_CASE.camType,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    
    const liftAfter = vb6ValveLiftAtAngle(
      BASE_CASE.lobeCenterline_deg + offset,
      BASE_CASE.camType,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    
    expect(liftBefore).toBeCloseTo(liftAfter, 6);
  });

  test('Different cam types produce different lift profiles', () => {
    const angle = BASE_CASE.lobeCenterline_deg - 30; // 30 deg before ILC
    
    const liftNormalFlat = vb6ValveLiftAtAngle(
      angle,
      VB6CamType.NormalFlatTappet,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    
    const liftOverhead = vb6ValveLiftAtAngle(
      angle,
      VB6CamType.OverheadCam,
      BASE_CASE.duration050_deg,
      BASE_CASE.lobeCenterline_deg,
      BASE_CASE.maxLift_in
    );
    
    // Different cam types should give different lift values
    expect(liftNormalFlat).not.toBeCloseTo(liftOverhead, 3);
  });
});

describe('VB6 Cam Profile - Base Case Validation', () => {
  test('VB6 base case: 264° duration, 105° ILC, 0.550" max lift', () => {
    // This should match the VB6 Flow Details table at 105 degrees
    const lift = vb6ValveLiftAtAngle(
      105,
      VB6CamType.NormalFlatTappet,
      264,
      105,
      0.550
    );
    
    expect(lift).toBeCloseTo(0.550, 3);
  });

  test('VB6 base case: lift at 74.6° (AngMPS)', () => {
    // At AngMPS (max piston speed angle), valve should be partially open
    const lift = vb6ValveLiftAtAngle(
      74.6,
      VB6CamType.NormalFlatTappet,
      264,
      105,
      0.550
    );
    
    // Should be between 0.050 and 0.550
    expect(lift).toBeGreaterThan(0.050);
    expect(lift).toBeLessThan(0.550);
  });

  test('VB6 base case: IVO = -27°, IVC = 237°', () => {
    const IVO = 105 - 264/2; // -27
    const IVC = 105 + 264/2; // 237
    
    expect(IVO).toBe(-27);
    expect(IVC).toBe(237);
    
    // At IVO and IVC, lift should be 0.050
    const liftIVO = vb6ValveLiftAtAngle(-27, VB6CamType.NormalFlatTappet, 264, 105, 0.550);
    const liftIVC = vb6ValveLiftAtAngle(237, VB6CamType.NormalFlatTappet, 264, 105, 0.550);
    
    expect(liftIVO).toBeCloseTo(0.050, 6);
    expect(liftIVC).toBeCloseTo(0.050, 6);
  });
});
