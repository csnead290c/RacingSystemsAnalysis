/**
 * Integration tests for RSACLASSIC engine torque model.
 */

import { describe, it, expect } from 'vitest';
import { wheelTorque_lbft, peakPowerFromCurve, peakTorqueFromCurve, type EngineParams } from '../domain/physics/engine/engine';

describe('Physics Engine - Torque Model', () => {
  describe('wheelTorque_lbft with torque curve', () => {
    it('should return exact torque at curve point', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 2000, tq_lbft: 300 },
          { rpm: 4000, tq_lbft: 400 },
          { rpm: 6000, tq_lbft: 350 },
        ],
        corr: 1.0,
      };

      const torque = wheelTorque_lbft(4000, params, 1.0);
      
      expect(torque).toBe(400);
    });

    it('should interpolate torque between curve points', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 2000, tq_lbft: 300 },
          { rpm: 4000, tq_lbft: 400 },
        ],
        corr: 1.0,
      };

      // Midpoint between 2000 and 4000 RPM
      const torque = wheelTorque_lbft(3000, params, 1.0);
      
      // Should be halfway between 300 and 400
      expect(torque).toBe(350);
    });

    it('should clamp to lower bound', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 2000, tq_lbft: 300 },
          { rpm: 4000, tq_lbft: 400 },
        ],
        corr: 1.0,
      };

      const torque = wheelTorque_lbft(1000, params, 1.0);
      
      // Below curve range, should return first point
      expect(torque).toBe(300);
    });

    it('should clamp to upper bound', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 2000, tq_lbft: 300 },
          { rpm: 4000, tq_lbft: 400 },
        ],
        corr: 1.0,
      };

      const torque = wheelTorque_lbft(8000, params, 1.0);
      
      // Above curve range, should return last point
      expect(torque).toBe(400);
    });

    it('should apply correction factor greater than 1', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 4000, tq_lbft: 400 },
        ],
        corr: 1.1, // 10% increase
      };

      const torque = wheelTorque_lbft(4000, params, 1.0);
      
      expect(torque).toBeCloseTo(440, 1); // 400 * 1.1
    });

    it('should apply correction factor less than 1', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 4000, tq_lbft: 400 },
        ],
        corr: 0.9, // 10% decrease
      };

      const torque = wheelTorque_lbft(4000, params, 1.0);
      
      expect(torque).toBeCloseTo(360, 1); // 400 * 0.9
    });

    it('should handle unsorted curve', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 4000, tq_lbft: 400 },
          { rpm: 2000, tq_lbft: 300 },
          { rpm: 6000, tq_lbft: 350 },
        ],
        corr: 1.0,
      };

      const torque = wheelTorque_lbft(3000, params, 1.0);
      
      // Should still interpolate correctly after sorting
      expect(torque).toBe(350);
    });
  });

  describe('wheelTorque_lbft with power fallback', () => {
    it('should calculate torque from power at 4000 RPM', () => {
      const params: EngineParams = {
        powerHP: 400,
        corr: 1.0,
      };

      const torque = wheelTorque_lbft(4000, params, 1.0);
      
      // tq = (HP * 5252) / rpm = (400 * 5252) / 4000 = 525.2
      expect(torque).toBeCloseTo(525.2, 1);
    });

    it('should calculate torque from power at 6000 RPM', () => {
      const params: EngineParams = {
        powerHP: 500,
        corr: 1.0,
      };

      const torque = wheelTorque_lbft(6000, params, 1.0);
      
      // tq = (HP * 5252) / rpm = (500 * 5252) / 6000 = 437.67
      expect(torque).toBeCloseTo(437.67, 1);
    });

    it('should guard against low RPM', () => {
      const params: EngineParams = {
        powerHP: 400,
        corr: 1.0,
      };

      // Very low RPM should be clamped to 1000
      const torque = wheelTorque_lbft(500, params, 1.0);
      
      // Should use 1000 RPM instead of 500
      // tq = (400 * 5252) / 1000 = 2100.8
      expect(torque).toBeCloseTo(2100.8, 1);
    });

    it('should apply correction with power fallback', () => {
      const params: EngineParams = {
        powerHP: 400,
        corr: 1.1,
      };

      const torque = wheelTorque_lbft(4000, params, 1.0);
      
      // Base: (400 * 5252) / 4000 = 525.2
      // Corrected: 525.2 * 1.1 = 577.72
      expect(torque).toBeCloseTo(577.72, 1);
    });

    it('should yield sensible torque at peak power RPM', () => {
      const params: EngineParams = {
        powerHP: 500,
        corr: 1.0,
      };

      // Typical peak power around 5500 RPM
      const torque = wheelTorque_lbft(5500, params, 1.0);
      
      // tq = (500 * 5252) / 5500 = 477.45
      expect(torque).toBeGreaterThan(400);
      expect(torque).toBeLessThan(550);
      expect(torque).toBeCloseTo(477.45, 1);
    });

    it('should show higher torque at lower RPM for same power', () => {
      const params: EngineParams = {
        powerHP: 400,
        corr: 1.0,
      };

      const torque3000 = wheelTorque_lbft(3000, params, 1.0);
      const torque6000 = wheelTorque_lbft(6000, params, 1.0);
      
      // At lower RPM, torque should be higher for same power
      expect(torque3000).toBeGreaterThan(torque6000);
      
      // Verify relationship: tq inversely proportional to rpm
      expect(torque3000 / torque6000).toBeCloseTo(2.0, 1);
    });
  });

  describe('wheelTorque_lbft error handling', () => {
    it('should throw if neither torque curve nor power provided', () => {
      const params: EngineParams = {
        corr: 1.0,
      };

      expect(() => wheelTorque_lbft(4000, params, 1.0)).toThrow(
        'EngineParams must provide either torqueCurve or powerHP'
      );
    });
  });

  describe('peakPowerFromCurve', () => {
    it('should find peak power in torque curve', () => {
      const curve = [
        { rpm: 2000, tq_lbft: 300 },
        { rpm: 4000, tq_lbft: 400 },
        { rpm: 6000, tq_lbft: 350 },
      ];

      const peak = peakPowerFromCurve(curve);
      
      // HP = (tq * rpm) / 5252
      // 2000: (300 * 2000) / 5252 = 114.2 HP
      // 4000: (400 * 4000) / 5252 = 304.6 HP
      // 6000: (350 * 6000) / 5252 = 399.85 HP
      
      expect(peak.rpm).toBe(6000);
      expect(peak.hp).toBeCloseTo(399.85, 1);
    });

    it('should handle flat torque curve', () => {
      const curve = [
        { rpm: 2000, tq_lbft: 400 },
        { rpm: 4000, tq_lbft: 400 },
        { rpm: 6000, tq_lbft: 400 },
      ];

      const peak = peakPowerFromCurve(curve);
      
      // With flat torque, power increases with RPM
      expect(peak.rpm).toBe(6000);
    });
  });

  describe('peakTorqueFromCurve', () => {
    it('should find peak torque in curve', () => {
      const curve = [
        { rpm: 2000, tq_lbft: 300 },
        { rpm: 4000, tq_lbft: 450 },
        { rpm: 6000, tq_lbft: 350 },
      ];

      const peak = peakTorqueFromCurve(curve);
      
      expect(peak.rpm).toBe(4000);
      expect(peak.tq_lbft).toBe(450);
    });

    it('should handle multiple peaks (return first)', () => {
      const curve = [
        { rpm: 2000, tq_lbft: 400 },
        { rpm: 4000, tq_lbft: 450 },
        { rpm: 6000, tq_lbft: 450 },
      ];

      const peak = peakTorqueFromCurve(curve);
      
      // Should return first occurrence of peak
      expect(peak.rpm).toBe(4000);
      expect(peak.tq_lbft).toBe(450);
    });
  });

  describe('Real-world scenarios', () => {
    it('should model typical naturally aspirated V8', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 1500, tq_lbft: 350 },
          { rpm: 2500, tq_lbft: 420 },
          { rpm: 3500, tq_lbft: 450 },
          { rpm: 4500, tq_lbft: 440 },
          { rpm: 5500, tq_lbft: 410 },
          { rpm: 6500, tq_lbft: 370 },
        ],
        corr: 1.0,
      };

      // Peak torque around 3500 RPM
      const torque3500 = wheelTorque_lbft(3500, params, 1.0);
      expect(torque3500).toBe(450);

      // Lower torque at high RPM
      const torque6500 = wheelTorque_lbft(6500, params, 1.0);
      expect(torque6500).toBe(370);
      expect(torque6500).toBeLessThan(torque3500);
    });

    it('should apply weather correction to real engine', () => {
      const params: EngineParams = {
        powerHP: 500,
        corr: 0.85, // 15% loss from altitude/heat
      };

      const torque = wheelTorque_lbft(5000, params, 1.0);
      
      // Base: (500 * 5252) / 5000 = 525.2
      // Corrected: 525.2 * 0.85 = 446.42
      expect(torque).toBeCloseTo(446.42, 1);
    });

    it('should be deterministic', () => {
      const params: EngineParams = {
        torqueCurve: [
          { rpm: 3000, tq_lbft: 400 },
          { rpm: 5000, tq_lbft: 450 },
        ],
        corr: 0.95,
      };

      const torque1 = wheelTorque_lbft(4000, params, 1.0);
      const torque2 = wheelTorque_lbft(4000, params, 1.0);
      
      expect(torque1).toBe(torque2);
    });
  });
});
