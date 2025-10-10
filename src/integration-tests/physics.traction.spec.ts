/**
 * Integration tests for RSACLASSIC tire traction and launch/rollout.
 */

import { describe, it, expect } from 'vitest';
import { maxTractive_lb, normalForce_lb, isSlipping, actualTractive_lb, type TireParams } from '../domain/physics/tire/traction';
import { applyRollout, hasCompletedRollout, rolloutTimeOffset_s, effectiveET_s, deepStageRollout } from '../domain/physics/track/launch';

describe('Physics Traction & Launch', () => {
  describe('Tire Traction', () => {
    describe('maxTractive_lb', () => {
      it('should calculate max tractive force with base μ', () => {
        const params: TireParams = {
          mu0: 1.5, // Drag radials
        };
        
        const normal_lb = 2000; // Weight on rear wheels
        const maxForce = maxTractive_lb(normal_lb, params);
        
        // F = μ * N = 1.5 * 2000 = 3000 lb
        expect(maxForce).toBe(3000);
      });

      it('should increase with higher traction index', () => {
        const params: TireParams = {
          mu0: 1.5,
        };
        
        const normal_lb = 2000;
        
        const force0 = maxTractive_lb(normal_lb, params, 0);
        const force10 = maxTractive_lb(normal_lb, params, 10);
        
        // Traction index +10 = +20% μ
        // force10 should be 20% higher
        expect(force10).toBeGreaterThan(force0);
        expect(force10 / force0).toBeCloseTo(1.20, 2);
      });

      it('should decrease with lower traction index', () => {
        const params: TireParams = {
          mu0: 1.5,
        };
        
        const normal_lb = 2000;
        
        const force0 = maxTractive_lb(normal_lb, params, 0);
        const forceMinus10 = maxTractive_lb(normal_lb, params, -10);
        
        // Traction index -10 = -20% μ
        expect(forceMinus10).toBeLessThan(force0);
        expect(forceMinus10 / force0).toBeCloseTo(0.80, 2);
      });

      it('should handle no traction index (default 0)', () => {
        const params: TireParams = {
          mu0: 1.5,
        };
        
        const normal_lb = 2000;
        
        const forceNoIndex = maxTractive_lb(normal_lb, params);
        const force0 = maxTractive_lb(normal_lb, params, 0);
        
        expect(forceNoIndex).toBe(force0);
      });

      it('should scale linearly with normal force', () => {
        const params: TireParams = {
          mu0: 1.5,
        };
        
        const force1000 = maxTractive_lb(1000, params);
        const force2000 = maxTractive_lb(2000, params);
        
        expect(force2000 / force1000).toBeCloseTo(2.0, 5);
      });

      it('should handle different tire types', () => {
        const street: TireParams = { mu0: 0.9 };
        const radial: TireParams = { mu0: 1.5 };
        const slick: TireParams = { mu0: 1.8 };
        
        const normal_lb = 2000;
        
        const forceStreet = maxTractive_lb(normal_lb, street);
        const forceRadial = maxTractive_lb(normal_lb, radial);
        const forceSlick = maxTractive_lb(normal_lb, slick);
        
        expect(forceStreet).toBeLessThan(forceRadial);
        expect(forceRadial).toBeLessThan(forceSlick);
      });
    });

    describe('normalForce_lb', () => {
      it('should calculate normal force with load bias', () => {
        const totalWeight = 3000;
        const loadBias = 0.6; // 60% on rear
        
        const normal = normalForce_lb(totalWeight, loadBias);
        
        expect(normal).toBe(1800);
      });

      it('should handle full weight on driven wheels', () => {
        const totalWeight = 3000;
        const loadBias = 1.0;
        
        const normal = normalForce_lb(totalWeight, loadBias);
        
        expect(normal).toBe(3000);
      });

      it('should handle weight transfer during launch', () => {
        const totalWeight = 3000;
        
        const normalStatic = normalForce_lb(totalWeight, 0.5); // 50% static
        const normalLaunch = normalForce_lb(totalWeight, 0.7); // 70% during launch
        
        expect(normalLaunch).toBeGreaterThan(normalStatic);
      });
    });

    describe('isSlipping', () => {
      it('should detect slip when demand exceeds limit', () => {
        const demand = 3500;
        const max = 3000;
        
        expect(isSlipping(demand, max)).toBe(true);
      });

      it('should not slip when demand within limit', () => {
        const demand = 2500;
        const max = 3000;
        
        expect(isSlipping(demand, max)).toBe(false);
      });

      it('should not slip at exact limit', () => {
        const demand = 3000;
        const max = 3000;
        
        expect(isSlipping(demand, max)).toBe(false);
      });
    });

    describe('actualTractive_lb', () => {
      it('should limit force to max when slipping', () => {
        const demand = 3500;
        const max = 3000;
        
        const actual = actualTractive_lb(demand, max);
        
        expect(actual).toBe(max);
      });

      it('should allow full force when not slipping', () => {
        const demand = 2500;
        const max = 3000;
        
        const actual = actualTractive_lb(demand, max);
        
        expect(actual).toBe(demand);
      });
    });
  });

  describe('Launch & Rollout', () => {
    describe('applyRollout', () => {
      it('should return 0 before rollout complete', () => {
        const rolloutIn = 9; // 9 inches = 0.75 ft
        
        const etDist = applyRollout(0.5, rolloutIn);
        
        expect(etDist).toBe(0);
      });

      it('should return distance minus rollout after complete', () => {
        const rolloutIn = 9; // 0.75 ft
        const s_ft = 10;
        
        const etDist = applyRollout(s_ft, rolloutIn);
        
        // 10 - 0.75 = 9.25 ft
        expect(etDist).toBeCloseTo(9.25, 2);
      });

      it('should return 0 at exact rollout distance', () => {
        const rolloutIn = 9; // 0.75 ft
        const s_ft = 0.75;
        
        const etDist = applyRollout(s_ft, rolloutIn);
        
        expect(etDist).toBeCloseTo(0, 5);
      });

      it('should reduce measured ET for same physical motion', () => {
        const rolloutIn = 9;
        
        // Two vehicles travel same physical distance
        const physicalDist = 1320; // Quarter mile
        
        // One with rollout, one without
        const etDistWithRollout = applyRollout(physicalDist, rolloutIn);
        const etDistNoRollout = applyRollout(physicalDist, 0);
        
        // With rollout, measured distance is less
        expect(etDistWithRollout).toBeLessThan(etDistNoRollout);
        expect(etDistWithRollout).toBeCloseTo(physicalDist - 9/12, 2);
      });
    });

    describe('hasCompletedRollout', () => {
      it('should return false before rollout', () => {
        const rolloutIn = 9;
        const s_ft = 0.5;
        
        expect(hasCompletedRollout(s_ft, rolloutIn)).toBe(false);
      });

      it('should return true after rollout', () => {
        const rolloutIn = 9;
        const s_ft = 1.0;
        
        expect(hasCompletedRollout(s_ft, rolloutIn)).toBe(true);
      });

      it('should return true at exact rollout', () => {
        const rolloutIn = 9;
        const s_ft = 0.75;
        
        expect(hasCompletedRollout(s_ft, rolloutIn)).toBe(true);
      });
    });

    describe('rolloutTimeOffset_s', () => {
      it('should calculate time offset from rollout', () => {
        const rolloutIn = 9; // 0.75 ft
        const avgSpeed_fps = 15; // ~10 mph
        
        const offset = rolloutTimeOffset_s(rolloutIn, avgSpeed_fps);
        
        // time = 0.75 / 15 = 0.05 s
        expect(offset).toBeCloseTo(0.05, 3);
      });

      it('should handle zero speed', () => {
        const rolloutIn = 9;
        const avgSpeed_fps = 0;
        
        const offset = rolloutTimeOffset_s(rolloutIn, avgSpeed_fps);
        
        expect(offset).toBe(0);
      });

      it('should increase with larger rollout', () => {
        const avgSpeed_fps = 15;
        
        const offset6 = rolloutTimeOffset_s(6, avgSpeed_fps);
        const offset12 = rolloutTimeOffset_s(12, avgSpeed_fps);
        
        expect(offset12).toBeGreaterThan(offset6);
        expect(offset12 / offset6).toBeCloseTo(2.0, 1);
      });
    });

    describe('effectiveET_s', () => {
      it('should subtract rollout time from actual time', () => {
        const actualTime = 10.5;
        const rolloutTime = 0.05;
        
        const et = effectiveET_s(actualTime, rolloutTime);
        
        expect(et).toBeCloseTo(10.45, 3);
      });

      it('should not go negative', () => {
        const actualTime = 0.03;
        const rolloutTime = 0.05;
        
        const et = effectiveET_s(actualTime, rolloutTime);
        
        expect(et).toBe(0);
      });

      it('should show rollout reduces measured ET', () => {
        const actualTime = 11.0;
        
        const etWithRollout = effectiveET_s(actualTime, 0.05);
        const etNoRollout = effectiveET_s(actualTime, 0);
        
        expect(etWithRollout).toBeLessThan(etNoRollout);
        expect(etNoRollout - etWithRollout).toBeCloseTo(0.05, 3);
      });
    });

    describe('deepStageRollout', () => {
      it('should reduce rollout when deep staging', () => {
        const normalRollout = 9;
        const deepStage = 3;
        
        const effectiveRollout = deepStageRollout(normalRollout, deepStage);
        
        expect(effectiveRollout).toBe(6);
      });

      it('should not go negative', () => {
        const normalRollout = 9;
        const deepStage = 12;
        
        const effectiveRollout = deepStageRollout(normalRollout, deepStage);
        
        expect(effectiveRollout).toBe(0);
      });

      it('should improve ET with deep staging', () => {
        const normalRollout = 9;
        const deepStageRollout_result = deepStageRollout(9, 3);
        
        expect(deepStageRollout_result).toBeLessThan(normalRollout);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should model typical drag radial on prepped track', () => {
      const params: TireParams = {
        mu0: 1.5, // Drag radials
      };
      
      const vehicleWeight = 3200;
      const loadBias = 0.65; // 65% on rear during launch
      const tractionIndex = 5; // Good prep
      
      const normal = normalForce_lb(vehicleWeight, loadBias);
      const maxForce = maxTractive_lb(normal, params, tractionIndex);
      
      // Should be able to hook up significant power
      expect(maxForce).toBeGreaterThan(3000);
      expect(maxForce).toBeLessThan(4000);
    });

    it('should model slick on excellent track', () => {
      const params: TireParams = {
        mu0: 1.8, // Slicks
      };
      
      const vehicleWeight = 2800;
      const loadBias = 0.70; // More weight transfer with slicks
      const tractionIndex = 10; // Excellent prep
      
      const normal = normalForce_lb(vehicleWeight, loadBias);
      const maxForce = maxTractive_lb(normal, params, tractionIndex);
      
      // Slicks on great track = very high traction
      expect(maxForce).toBeGreaterThan(4000);
    });

    it('should show rollout advantage in close race', () => {
      const physicalET = 11.00; // Actual time from launch
      const rolloutTime = 0.05; // Time in rollout
      
      const measuredET = effectiveET_s(physicalET, rolloutTime);
      
      // Measured ET is 0.05s better than actual
      expect(measuredET).toBeCloseTo(10.95, 2);
      
      // In a close race, this 0.05s could be the difference
      const competitor = 10.96;
      expect(measuredET).toBeLessThan(competitor);
    });

    it('should be deterministic', () => {
      const params: TireParams = { mu0: 1.5 };
      const normal = 2000;
      const tractionIndex = 5;
      
      const force1 = maxTractive_lb(normal, params, tractionIndex);
      const force2 = maxTractive_lb(normal, params, tractionIndex);
      
      expect(force1).toBe(force2);
      
      const rollout1 = applyRollout(10, 9);
      const rollout2 = applyRollout(10, 9);
      
      expect(rollout1).toBe(rollout2);
    });
  });
});
