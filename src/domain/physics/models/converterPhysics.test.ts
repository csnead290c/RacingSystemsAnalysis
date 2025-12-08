import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STREET_STRIP_CURVES,
  HIGH_STALL_RACE_CURVES,
  TIGHT_EFFICIENT_CURVES,
  getTorqueRatio,
  getKFactor,
  calcSpeedRatio,
  calcPumpTorqueCapacity,
  calcEfficiency,
  calcStallSpeed,
  calcKFactorFromStall,
  generateEfficiencyCurve,
  generateStallCurve,
} from './converterPhysics';

describe('Converter Physics', () => {
  describe('getTorqueRatio', () => {
    it('returns stall TR at SR=0', () => {
      const tr = getTorqueRatio(0, DEFAULT_STREET_STRIP_CURVES);
      expect(tr).toBeCloseTo(2.2, 1);
    });

    it('returns ~1.0 at high SR', () => {
      const tr = getTorqueRatio(0.95, DEFAULT_STREET_STRIP_CURVES);
      expect(tr).toBeCloseTo(1.0, 1);
    });

    it('decreases monotonically with SR', () => {
      let prevTR = getTorqueRatio(0, DEFAULT_STREET_STRIP_CURVES);
      for (let sr = 0.1; sr <= 1; sr += 0.1) {
        const tr = getTorqueRatio(sr, DEFAULT_STREET_STRIP_CURVES);
        expect(tr).toBeLessThanOrEqual(prevTR);
        prevTR = tr;
      }
    });

    it('race converter has higher stall TR than street', () => {
      const streetTR = getTorqueRatio(0, DEFAULT_STREET_STRIP_CURVES);
      const raceTR = getTorqueRatio(0, HIGH_STALL_RACE_CURVES);
      expect(raceTR).toBeGreaterThan(streetTR);
    });

    it('tight converter has lower stall TR than street', () => {
      const streetTR = getTorqueRatio(0, DEFAULT_STREET_STRIP_CURVES);
      const tightTR = getTorqueRatio(0, TIGHT_EFFICIENT_CURVES);
      expect(tightTR).toBeLessThan(streetTR);
    });
  });

  describe('getKFactor', () => {
    it('returns lowest K at stall (SR=0)', () => {
      const kAtStall = getKFactor(0, DEFAULT_STREET_STRIP_CURVES);
      const kAtMid = getKFactor(0.5, DEFAULT_STREET_STRIP_CURVES);
      expect(kAtStall).toBeLessThan(kAtMid);
    });

    it('K increases with SR', () => {
      let prevK = getKFactor(0, DEFAULT_STREET_STRIP_CURVES);
      for (let sr = 0.1; sr <= 1; sr += 0.1) {
        const k = getKFactor(sr, DEFAULT_STREET_STRIP_CURVES);
        expect(k).toBeGreaterThanOrEqual(prevK);
        prevK = k;
      }
    });

    it('race converter has lower K at stall (looser)', () => {
      const streetK = getKFactor(0, DEFAULT_STREET_STRIP_CURVES);
      const raceK = getKFactor(0, HIGH_STALL_RACE_CURVES);
      expect(raceK).toBeLessThan(streetK);
    });
  });

  describe('calcSpeedRatio', () => {
    it('returns 0 when pump speed is very low', () => {
      expect(calcSpeedRatio(0.05, 100)).toBe(0);
    });

    it('returns correct ratio', () => {
      expect(calcSpeedRatio(100, 80)).toBeCloseTo(0.8, 2);
    });

    it('clamps to max 1.0', () => {
      expect(calcSpeedRatio(100, 120)).toBe(1);
    });

    it('clamps to min 0', () => {
      expect(calcSpeedRatio(100, -10)).toBe(0);
    });
  });

  describe('calcPumpTorqueCapacity', () => {
    it('increases with pump speed squared', () => {
      const k = 165;
      const t1 = calcPumpTorqueCapacity(100, k);  // 100 rad/s
      const t2 = calcPumpTorqueCapacity(200, k);  // 200 rad/s
      // T = (ω/K)², so doubling ω should quadruple T
      expect(t2 / t1).toBeCloseTo(4, 0);
    });

    it('decreases with higher K', () => {
      const omega = 300;  // rad/s
      const t1 = calcPumpTorqueCapacity(omega, 150);
      const t2 = calcPumpTorqueCapacity(omega, 200);
      expect(t2).toBeLessThan(t1);
    });
  });

  describe('calcEfficiency', () => {
    it('returns 0 at stall (SR=0)', () => {
      expect(calcEfficiency(2.2, 0)).toBe(0);
    });

    it('returns TR*SR', () => {
      expect(calcEfficiency(1.5, 0.6)).toBeCloseTo(0.9, 2);
    });

    it('peaks around SR=0.85-0.95 for typical converter', () => {
      const efficiencies = [];
      for (let sr = 0; sr <= 1; sr += 0.05) {
        const tr = getTorqueRatio(sr, DEFAULT_STREET_STRIP_CURVES);
        efficiencies.push({ sr, eff: calcEfficiency(tr, sr) });
      }
      const peak = efficiencies.reduce((max, e) => e.eff > max.eff ? e : max);
      expect(peak.sr).toBeGreaterThan(0.7);
      expect(peak.sr).toBeLessThanOrEqual(1.0);
    });
  });

  describe('calcStallSpeed', () => {
    it('uses K-factor formula: N = K * sqrt(T)', () => {
      const k = 165;
      const torque = 400;
      const expected = k * Math.sqrt(torque);
      expect(calcStallSpeed(k, torque)).toBeCloseTo(expected, 0);
    });

    it('increases with engine torque', () => {
      const k = 165;
      const stall1 = calcStallSpeed(k, 300);
      const stall2 = calcStallSpeed(k, 500);
      expect(stall2).toBeGreaterThan(stall1);
    });

    it('returns 0 for zero torque', () => {
      expect(calcStallSpeed(165, 0)).toBe(0);
    });
  });

  describe('calcKFactorFromStall', () => {
    it('back-calculates K from stall and torque', () => {
      const stallRPM = 3500;
      const torque = 450;
      const k = calcKFactorFromStall(stallRPM, torque);
      // Verify: stall = k * sqrt(torque)
      expect(k * Math.sqrt(torque)).toBeCloseTo(stallRPM, 0);
    });

    it('is inverse of calcStallSpeed', () => {
      const originalK = 165;
      const torque = 400;
      const stall = calcStallSpeed(originalK, torque);
      const recoveredK = calcKFactorFromStall(stall, torque);
      expect(recoveredK).toBeCloseTo(originalK, 1);
    });
  });

  describe('generateEfficiencyCurve', () => {
    it('generates data points from SR 0 to 1', () => {
      const data = generateEfficiencyCurve(DEFAULT_STREET_STRIP_CURVES);
      expect(data.length).toBeGreaterThan(10);
      expect(data[0].sr).toBe(0);
      expect(data[data.length - 1].sr).toBeCloseTo(1, 1);
    });

    it('includes TR, efficiency, and slip', () => {
      const data = generateEfficiencyCurve(DEFAULT_STREET_STRIP_CURVES);
      const point = data[10];
      expect(point).toHaveProperty('sr');
      expect(point).toHaveProperty('tr');
      expect(point).toHaveProperty('efficiency');
      expect(point).toHaveProperty('slip');
    });
  });

  describe('generateStallCurve', () => {
    it('generates stall RPM vs torque data', () => {
      const data = generateStallCurve(DEFAULT_STREET_STRIP_CURVES, 200, 600);
      expect(data.length).toBeGreaterThan(5);
      expect(data[0].torque).toBe(200);
    });

    it('stall increases with torque', () => {
      const data = generateStallCurve(DEFAULT_STREET_STRIP_CURVES, 200, 600);
      for (let i = 1; i < data.length; i++) {
        expect(data[i].stallRPM).toBeGreaterThan(data[i - 1].stallRPM);
      }
    });
  });
});
