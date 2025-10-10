/**
 * Integration tests for RSACLASSIC aerodynamic drag and rolling resistance.
 */

import { describe, it, expect } from 'vitest';
import { drag_lb, cdFromDrag, TYPICAL_CD, estimateFrontalArea } from '../domain/physics/aero/drag';
import { rolling_lb, TYPICAL_RR_COEFF, rrCoeffFromForce, totalRolling_lb, rollingPowerLoss_hp } from '../domain/physics/aero/rolling';

describe('Physics Aero - Drag & Rolling Resistance', () => {
  describe('Aerodynamic Drag', () => {
    describe('drag_lb', () => {
      it('should calculate drag force', () => {
        const v_fps = 100; // ~68 mph
        const cd = 0.35;
        const frontalArea_ft2 = 20;
        const rho_slug_ft3 = 0.002377; // Standard air density
        
        const drag = drag_lb(v_fps, cd, frontalArea_ft2, rho_slug_ft3);
        
        // Should return positive drag
        expect(drag).toBeGreaterThan(0);
        expect(drag).toBeGreaterThan(10);
        expect(drag).toBeLessThan(100);
      });

      it('should increase with velocity squared', () => {
        const cd = 0.35;
        const frontalArea_ft2 = 20;
        const rho_slug_ft3 = 0.002377;
        
        const drag50 = drag_lb(50, cd, frontalArea_ft2, rho_slug_ft3);
        const drag100 = drag_lb(100, cd, frontalArea_ft2, rho_slug_ft3);
        
        // Drag should increase by factor of 4 when velocity doubles (v²)
        expect(drag100 / drag50).toBeCloseTo(4.0, 1);
      });

      it('should increase with higher Cd', () => {
        const v_fps = 100;
        const frontalArea_ft2 = 20;
        const rho_slug_ft3 = 0.002377;
        
        const dragLow = drag_lb(v_fps, 0.30, frontalArea_ft2, rho_slug_ft3);
        const dragHigh = drag_lb(v_fps, 0.45, frontalArea_ft2, rho_slug_ft3);
        
        // Higher Cd = more drag
        expect(dragHigh).toBeGreaterThan(dragLow);
        expect(dragHigh / dragLow).toBeCloseTo(1.5, 1);
      });

      it('should increase with larger frontal area', () => {
        const v_fps = 100;
        const cd = 0.35;
        const rho_slug_ft3 = 0.002377;
        
        const dragSmall = drag_lb(v_fps, cd, 15, rho_slug_ft3);
        const dragLarge = drag_lb(v_fps, cd, 25, rho_slug_ft3);
        
        // Larger area = more drag
        expect(dragLarge).toBeGreaterThan(dragSmall);
      });

      it('should increase with higher air density', () => {
        const v_fps = 100;
        const cd = 0.35;
        const frontalArea_ft2 = 20;
        
        const dragStandard = drag_lb(v_fps, cd, frontalArea_ft2, 0.002377);
        const dragDense = drag_lb(v_fps, cd, frontalArea_ft2, 0.0026); // Cold, high pressure
        
        // Denser air = more drag
        expect(dragDense).toBeGreaterThan(dragStandard);
      });

      it('should return zero at zero velocity', () => {
        const drag = drag_lb(0, 0.35, 20, 0.002377);
        
        expect(drag).toBe(0);
      });

      it('should be deterministic', () => {
        const v_fps = 88;
        const cd = 0.35;
        const frontalArea_ft2 = 20;
        const rho_slug_ft3 = 0.002377;
        
        const drag1 = drag_lb(v_fps, cd, frontalArea_ft2, rho_slug_ft3);
        const drag2 = drag_lb(v_fps, cd, frontalArea_ft2, rho_slug_ft3);
        
        expect(drag1).toBe(drag2);
      });
    });

    describe('cdFromDrag', () => {
      it('should calculate Cd from known drag', () => {
        const v_fps = 100;
        const frontalArea_ft2 = 20;
        const rho_slug_ft3 = 0.002377;
        const expectedCd = 0.35;
        
        // Calculate drag with known Cd
        const drag = drag_lb(v_fps, expectedCd, frontalArea_ft2, rho_slug_ft3);
        
        // Reverse calculate Cd
        const calculatedCd = cdFromDrag(drag, v_fps, frontalArea_ft2, rho_slug_ft3);
        
        expect(calculatedCd).toBeCloseTo(expectedCd, 5);
      });

      it('should handle zero velocity', () => {
        const cd = cdFromDrag(10, 0, 20, 0.002377);
        
        expect(cd).toBe(0);
      });
    });

    describe('estimateFrontalArea', () => {
      it('should estimate frontal area from dimensions', () => {
        const width_ft = 6; // 72 inches
        const height_ft = 4.5; // 54 inches
        
        const area = estimateFrontalArea(width_ft, height_ft);
        
        // 0.85 * 6 * 4.5 = 22.95 ft²
        expect(area).toBeCloseTo(22.95, 1);
      });

      it('should be less than full rectangle', () => {
        const width_ft = 6;
        const height_ft = 4.5;
        
        const estimated = estimateFrontalArea(width_ft, height_ft);
        const rectangle = width_ft * height_ft;
        
        expect(estimated).toBeLessThan(rectangle);
      });
    });
  });

  describe('Rolling Resistance', () => {
    describe('rolling_lb', () => {
      it('should calculate rolling resistance', () => {
        const weight_lb = 3000;
        const rrCoeff = 0.012;
        
        const force = rolling_lb(weight_lb, rrCoeff);
        
        // F = 3000 * 0.012 = 36 lb
        expect(force).toBe(36);
      });

      it('should increase with weight', () => {
        const rrCoeff = 0.012;
        
        const force2000 = rolling_lb(2000, rrCoeff);
        const force4000 = rolling_lb(4000, rrCoeff);
        
        // Force should double when weight doubles
        expect(force4000 / force2000).toBeCloseTo(2.0, 5);
      });

      it('should increase with higher rrCoeff', () => {
        const weight_lb = 3000;
        
        const forceLow = rolling_lb(weight_lb, 0.010);
        const forceHigh = rolling_lb(weight_lb, 0.020);
        
        // Force should double when coefficient doubles
        expect(forceHigh / forceLow).toBeCloseTo(2.0, 5);
      });

      it('should handle zero weight', () => {
        const force = rolling_lb(0, 0.012);
        
        expect(force).toBe(0);
      });

      it('should handle zero coefficient', () => {
        const force = rolling_lb(3000, 0);
        
        expect(force).toBe(0);
      });

      it('should be deterministic', () => {
        const weight_lb = 3200;
        const rrCoeff = 0.015;
        
        const force1 = rolling_lb(weight_lb, rrCoeff);
        const force2 = rolling_lb(weight_lb, rrCoeff);
        
        expect(force1).toBe(force2);
      });
    });

    describe('rrCoeffFromForce', () => {
      it('should calculate coefficient from known force', () => {
        const weight_lb = 3000;
        const expectedCoeff = 0.012;
        
        // Calculate force with known coefficient
        const force = rolling_lb(weight_lb, expectedCoeff);
        
        // Reverse calculate coefficient
        const calculatedCoeff = rrCoeffFromForce(force, weight_lb);
        
        expect(calculatedCoeff).toBeCloseTo(expectedCoeff, 5);
      });

      it('should handle zero weight', () => {
        const coeff = rrCoeffFromForce(10, 0);
        
        expect(coeff).toBe(0);
      });
    });

    describe('totalRolling_lb', () => {
      it('should calculate total rolling resistance', () => {
        const totalWeight = 3200;
        const rrCoeff = 0.015;
        
        const total = totalRolling_lb(totalWeight, rrCoeff);
        
        expect(total).toBe(48);
      });
    });

    describe('rollingPowerLoss_hp', () => {
      it('should calculate power loss', () => {
        const force_lb = 40;
        const v_fps = 100; // ~68 mph
        
        const powerLoss = rollingPowerLoss_hp(force_lb, v_fps);
        
        // Power = 40 * 100 = 4000 ft·lb/s
        // HP = 4000 / 550 = 7.27 HP
        expect(powerLoss).toBeCloseTo(7.27, 1);
      });

      it('should increase with velocity', () => {
        const force_lb = 40;
        
        const power50 = rollingPowerLoss_hp(force_lb, 50);
        const power100 = rollingPowerLoss_hp(force_lb, 100);
        
        // Power should double when velocity doubles
        expect(power100 / power50).toBeCloseTo(2.0, 1);
      });

      it('should return zero at zero velocity', () => {
        const power = rollingPowerLoss_hp(40, 0);
        
        expect(power).toBe(0);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should model typical drag car at speed', () => {
      // Typical drag car
      const v_fps = 176; // ~120 mph (end of quarter mile)
      const cd = TYPICAL_CD.DRAG_CAR_BASIC;
      const frontalArea_ft2 = 22;
      const rho_slug_ft3 = 0.002377;
      
      const drag = drag_lb(v_fps, cd, frontalArea_ft2, rho_slug_ft3);
      
      // At 120 mph, drag should be significant
      expect(drag).toBeGreaterThan(200);
      expect(drag).toBeLessThan(400);
    });

    it('should model rolling resistance for drag car', () => {
      const weight_lb = 3200;
      const rrCoeff = TYPICAL_RR_COEFF.DRAG_RADIAL;
      
      const rolling = rolling_lb(weight_lb, rrCoeff);
      
      // Should be relatively small compared to drag at high speed
      expect(rolling).toBeGreaterThan(40);
      expect(rolling).toBeLessThan(60);
    });

    it('should show drag dominates at high speed', () => {
      const weight_lb = 3200;
      const cd = 0.40;
      const frontalArea_ft2 = 22;
      const rho_slug_ft3 = 0.002377;
      const rrCoeff = 0.015;
      
      // Low speed (30 mph = 44 ft/s)
      const dragLow = drag_lb(44, cd, frontalArea_ft2, rho_slug_ft3);
      const rollingLow = rolling_lb(weight_lb, rrCoeff);
      
      // High speed (120 mph = 176 ft/s)
      const dragHigh = drag_lb(176, cd, frontalArea_ft2, rho_slug_ft3);
      const rollingHigh = rolling_lb(weight_lb, rrCoeff);
      
      // At low speed, rolling is significant
      expect(rollingLow).toBeGreaterThan(dragLow);
      
      // At high speed, drag dominates
      expect(dragHigh).toBeGreaterThan(rollingHigh);
      expect(dragHigh).toBeGreaterThan(rollingHigh * 2);
    });

    it('should calculate total resistance at finish line', () => {
      const weight_lb = 3200;
      const v_fps = 176; // ~120 mph
      const cd = 0.40;
      const frontalArea_ft2 = 22;
      const rho_slug_ft3 = 0.002377;
      const rrCoeff = 0.015;
      
      const drag = drag_lb(v_fps, cd, frontalArea_ft2, rho_slug_ft3);
      const rolling = rolling_lb(weight_lb, rrCoeff);
      const totalResistance = drag + rolling;
      
      // Total should be dominated by drag
      expect(totalResistance).toBeGreaterThan(300);
      expect(drag / totalResistance).toBeGreaterThan(0.8); // Drag is >80% of total
    });

    it('should be deterministic across calculations', () => {
      const v_fps = 100;
      const weight_lb = 3000;
      
      const drag1 = drag_lb(v_fps, 0.35, 20, 0.002377);
      const drag2 = drag_lb(v_fps, 0.35, 20, 0.002377);
      
      const rolling1 = rolling_lb(weight_lb, 0.012);
      const rolling2 = rolling_lb(weight_lb, 0.012);
      
      expect(drag1).toBe(drag2);
      expect(rolling1).toBe(rolling2);
    });
  });
});
