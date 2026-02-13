/**
 * Mechanical Details Parity Tests
 *
 * Locks the VB6-accurate Mech Details math for multiple engine configurations.
 * Tests cover:
 *   - Piston speed summary (avg/max at 4 rating points)
 *   - Cranking compression
 *   - 15-row mech details table (depth, speed, accel at key angles)
 *   - AngMPS (max piston speed angle) via VB6 empirical formula
 *   - Cross-check: engineProDetails.calcMechDetails (smoothCurve=false) vs vb6Kinematics
 *
 * Configurations:
 *   A) Base Case V8 (VB6 BASECASE.ENG defaults)
 *   B) High-lift aggressive cam (long stroke, short rod)
 *   C) Small bore / high rod ratio
 */

import { describe, it, expect } from 'vitest';
import {
  calcMechDetailsForRPM,
  calcPistonSpeedSummary,
  calcCrankingCompression,
  getVB6MechDetailsAngles,
} from '../vb6Kinematics';
import {
  calcMechDetails,
} from '../engineProDetails';

// ═══════════════════════════════════════════════════════════════════════
// Config A: Base Case V8 (VB6 BASECASE.ENG)
// ═══════════════════════════════════════════════════════════════════════
const CFG_A = {
  label: 'Base Case V8',
  bore_in: 4.030,
  stroke_in: 3.480,
  rodLength_in: 5.850,
  compressionRatio: 12.9,
  // Expected rating RPMs (from VB6 output)
  rpmPeakTQ: 5450,
  rpmPeakHP: 6650,
  rpmShift: 7200,
  rpmRedline: 8350,
};

// ═══════════════════════════════════════════════════════════════════════
// Config B: Long stroke / short rod (aggressive, high piston speed)
// ═══════════════════════════════════════════════════════════════════════
const CFG_B = {
  label: 'Long Stroke / Short Rod',
  bore_in: 4.125,
  stroke_in: 4.000,
  rodLength_in: 6.000,
  compressionRatio: 10.5,
  rpmTest: 7000,
};

// ═══════════════════════════════════════════════════════════════════════
// Config C: Small bore / high rod ratio
// ═══════════════════════════════════════════════════════════════════════
const CFG_C = {
  label: 'Small Bore / High Rod Ratio',
  bore_in: 3.500,
  stroke_in: 2.875,
  rodLength_in: 5.700,
  compressionRatio: 11.0,
  rpmTest: 8000,
};

// ═══════════════════════════════════════════════════════════════════════
// Helper: compute LRQS and AngMPS for a config
// ═══════════════════════════════════════════════════════════════════════
function vb6AngMPS(stroke: number, rod: number): number {
  const LRQS = rod / stroke;
  return 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
}

// ═══════════════════════════════════════════════════════════════════════
// Config A: Base Case V8
// ═══════════════════════════════════════════════════════════════════════
describe('Mech Details Parity — Config A: Base Case V8', () => {
  const { stroke_in, rodLength_in, compressionRatio } = CFG_A;

  describe('AngMPS (VB6 empirical formula)', () => {
    it('matches VB6: 62 + (750*(LRQS-0.958))^0.4027', () => {
      const angMPS = vb6AngMPS(stroke_in, rodLength_in);
      // VB6 base case: 74.6 deg
      expect(angMPS).toBeCloseTo(74.62, 1);
    });

    it('getVB6MechDetailsAngles includes AngMPS as 6th element', () => {
      const angles = getVB6MechDetailsAngles(stroke_in, rodLength_in);
      expect(angles.length).toBe(15);
      expect(angles[5]).toBeCloseTo(74.62, 1);
    });
  });

  describe('Piston Speed Summary', () => {
    it('Peak TQ @ 5450: avg=3161, max=5181', () => {
      const s = calcPistonSpeedSummary(5450, stroke_in, rodLength_in);
      expect(s.avgSpeed_fpm).toBe(3161);
      expect(s.maxSpeed_fpm).toBe(5181);
    });

    it('Peak HP @ 6650: avg=3857, max=6322', () => {
      const s = calcPistonSpeedSummary(6650, stroke_in, rodLength_in);
      expect(s.avgSpeed_fpm).toBe(3857);
      expect(s.maxSpeed_fpm).toBe(6322);
    });

    it('Shift @ 7200: avg=4176, max=6845', () => {
      const s = calcPistonSpeedSummary(7200, stroke_in, rodLength_in);
      expect(s.avgSpeed_fpm).toBe(4176);
      expect(s.maxSpeed_fpm).toBe(6845);
    });

    it('Redline @ 8350: avg=4843, max=7939', () => {
      const s = calcPistonSpeedSummary(8350, stroke_in, rodLength_in);
      expect(s.avgSpeed_fpm).toBe(4843);
      expect(s.maxSpeed_fpm).toBe(7939);
    });
  });

  describe('Cranking Compression', () => {
    it('CR 12.9 → 230 psig', () => {
      expect(calcCrankingCompression(compressionRatio)).toBe(230);
    });
  });

  describe('15-row table @ 6650 RPM', () => {
    const rows = calcMechDetailsForRPM(6650, stroke_in, rodLength_in);

    it('has exactly 15 rows', () => {
      expect(rows.length).toBe(15);
    });

    // VB6 expected values from screenshots (locked golden master)
    const expected = [
      { angle: 5, depth: 0.009, fpm: 685, fps: 11, gs: '2818' },
      { angle: 15, depth: 0.077, fpm: 2020, fps: 34, gs: '2679' },
      { angle: 30, depth: 0.298, fpm: 3818, fps: 64, gs: '2233' },
      { angle: 45, depth: 0.640, fpm: 5206, fps: 87, gs: '1561' },
      { angle: 60, depth: 1.067, fpm: 6054, fps: 101, gs: '768' },
      // Row 6: AngMPS (~74.6 deg)
      { angle: 74.6, depth: 1.524, fpm: 6323, fps: 105, gs: '1' },
      { angle: 80, depth: 1.694, fpm: 6289, fps: 105, gs: '-257' },
      { angle: 85, depth: 1.851, fpm: 6199, fps: 103, gs: '-479' },
      { angle: 90, depth: 2.005, fpm: 6059, fps: 101, gs: '-681' },
      { angle: 105, depth: 2.437, fpm: 5382, fps: 90, gs: '-1149' },
      { angle: 120, depth: 2.807, fpm: 4439, fps: 74, gs: '-1417' },
      { angle: 135, depth: 3.101, fpm: 3362, fps: 56, gs: '-1530' },
      { angle: 150, depth: 3.312, fpm: 2240, fps: 37, gs: '-1553' },
      { angle: 165, depth: 3.438, fpm: 1116, fps: 19, gs: '-1543' },
      { angle: 180, depth: 3.480, fpm: 0, fps: 0, gs: '-1535' },
    ];

    expected.forEach((exp, i) => {
      it(`row ${i} (${exp.angle}°): depth=${exp.depth}, fpm=${exp.fpm}, gs=${exp.gs}`, () => {
        const row = rows[i];
        expect(row.angle_deg).toBeCloseTo(exp.angle, 0);
        expect(row.pistonDepth_in).toBeCloseTo(exp.depth, 3);
        expect(Math.round(row.pistonSpeed_fpm)).toBe(exp.fpm);
        expect(Math.round(row.pistonSpeed_fps)).toBe(exp.fps);
        expect(row.pistonAccel_gs).toBe(exp.gs);
      });
    });
  });

  describe('engineProDetails.calcMechDetails (smoothCurve=false) cross-check', () => {
    const proRows = calcMechDetails(6650, stroke_in, rodLength_in, false);
    const vb6Rows = calcMechDetailsForRPM(6650, stroke_in, rodLength_in);

    it('same row count', () => {
      expect(proRows.length).toBe(vb6Rows.length);
    });

    it('same angles (AngMPS matches VB6 empirical)', () => {
      proRows.forEach((p, i) => {
        expect(p.angle_deg).toBeCloseTo(vb6Rows[i].angle_deg, 1);
      });
    });

    it('same piston depth at each angle', () => {
      proRows.forEach((p, i) => {
        expect(p.pistonDepth_in).toBeCloseTo(vb6Rows[i].pistonDepth_in, 6);
      });
    });

    it('same piston speed at each angle', () => {
      proRows.forEach((p, i) => {
        expect(p.pistonSpeed_fpm).toBeCloseTo(vb6Rows[i].pistonSpeed_fpm, 1);
      });
    });

    it('same acceleration at each angle (within 1 g)', () => {
      proRows.forEach((p, i) => {
        const proGs = Math.round(p.pistonAccel_gs);
        const vb6Gs = parseInt(vb6Rows[i].pistonAccel_gs);
        expect(Math.abs(proGs - vb6Gs)).toBeLessThanOrEqual(1);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Config B: Long Stroke / Short Rod
// ═══════════════════════════════════════════════════════════════════════
describe('Mech Details Parity — Config B: Long Stroke / Short Rod', () => {
  const { stroke_in, rodLength_in, compressionRatio, rpmTest } = CFG_B;
  const LRQS = rodLength_in / stroke_in; // 1.500

  describe('Geometric sanity', () => {
    it('LRQS = 1.500', () => {
      expect(LRQS).toBeCloseTo(1.500, 3);
    });

    it('AngMPS is lower than base case (shorter rod ratio)', () => {
      const angB = vb6AngMPS(stroke_in, rodLength_in);
      const angA = vb6AngMPS(CFG_A.stroke_in, CFG_A.rodLength_in);
      // Shorter rod ratio → lower AngMPS
      expect(angB).toBeLessThan(angA);
      // Should be around 72-73 deg
      expect(angB).toBeGreaterThan(70);
      expect(angB).toBeLessThan(76);
    });
  });

  describe('Piston Speed Summary @ 7000 RPM', () => {
    it('avg speed is higher than base case at same RPM (longer stroke)', () => {
      const sB = calcPistonSpeedSummary(7000, stroke_in, rodLength_in);
      const sA = calcPistonSpeedSummary(7000, CFG_A.stroke_in, CFG_A.rodLength_in);
      expect(sB.avgSpeed_fpm).toBeGreaterThan(sA.avgSpeed_fpm);
    });

    it('max speed is higher than base case at same RPM', () => {
      const sB = calcPistonSpeedSummary(7000, stroke_in, rodLength_in);
      const sA = calcPistonSpeedSummary(7000, CFG_A.stroke_in, CFG_A.rodLength_in);
      expect(sB.maxSpeed_fpm).toBeGreaterThan(sA.maxSpeed_fpm);
    });

    it('avg speed = RPM * 2 * stroke / 12 (VB6 formula)', () => {
      const s = calcPistonSpeedSummary(rpmTest, stroke_in, rodLength_in);
      const expected = Math.round(rpmTest * 2 * stroke_in / 12);
      expect(s.avgSpeed_fpm).toBe(expected);
    });
  });

  describe('Cranking Compression', () => {
    it('CR 10.5 → 181 psig', () => {
      expect(calcCrankingCompression(compressionRatio)).toBe(181);
    });
  });

  describe('15-row table @ 7000 RPM', () => {
    const rows = calcMechDetailsForRPM(rpmTest, stroke_in, rodLength_in);

    it('has exactly 15 rows', () => {
      expect(rows.length).toBe(15);
    });

    it('TDC row (5 deg): depth near 0, speed > 0, accel > 0', () => {
      const r = rows[0];
      expect(r.angle_deg).toBe(5);
      expect(r.pistonDepth_in).toBeLessThan(0.02);
      expect(r.pistonSpeed_fpm).toBeGreaterThan(0);
      expect(parseInt(r.pistonAccel_gs)).toBeGreaterThan(0);
    });

    it('BDC row (180 deg): depth = stroke, speed = 0', () => {
      const r = rows[14];
      expect(r.angle_deg).toBe(180);
      expect(r.pistonDepth_in).toBeCloseTo(stroke_in, 3);
      expect(Math.round(r.pistonSpeed_fpm)).toBe(0);
    });

    it('AngMPS row has highest speed', () => {
      const angMPS = vb6AngMPS(stroke_in, rodLength_in);
      const angRow = rows.find(r => Math.abs(r.angle_deg - angMPS) < 0.5);
      expect(angRow).toBeDefined();
      const maxFPM = Math.max(...rows.map(r => r.pistonSpeed_fpm));
      expect(angRow!.pistonSpeed_fpm).toBeCloseTo(maxFPM, 0);
    });

    it('acceleration at AngMPS is near zero (inflection point)', () => {
      const angMPS = vb6AngMPS(stroke_in, rodLength_in);
      const angRow = rows.find(r => Math.abs(r.angle_deg - angMPS) < 0.5);
      expect(angRow).toBeDefined();
      // At max speed, acceleration crosses zero
      expect(Math.abs(parseInt(angRow!.pistonAccel_gs))).toBeLessThan(50);
    });

    it('acceleration at 180 deg is negative (deceleration)', () => {
      const r = rows[14];
      expect(parseInt(r.pistonAccel_gs)).toBeLessThan(0);
    });

    // Lock specific numeric outputs to detect formula drift
    it('locks key row values', () => {
      // Row 0: 5 deg
      expect(rows[0].pistonDepth_in).toBeCloseTo(0.010, 3);
      // Row 3: 45 deg
      const r45 = rows[3];
      expect(r45.angle_deg).toBe(45);
      expect(r45.pistonDepth_in).toBeCloseTo(0.755, 3);
      // Row 8: 90 deg
      const r90 = rows[8];
      expect(r90.angle_deg).toBe(90);
      expect(r90.pistonDepth_in).toBeCloseTo(2.343, 3);
    });
  });

  describe('engineProDetails cross-check', () => {
    const proRows = calcMechDetails(rpmTest, stroke_in, rodLength_in, false);
    const vb6Rows = calcMechDetailsForRPM(rpmTest, stroke_in, rodLength_in);

    it('same AngMPS angle', () => {
      expect(proRows[5].angle_deg).toBeCloseTo(vb6Rows[5].angle_deg, 1);
    });

    it('same depth at 90 deg', () => {
      expect(proRows[8].pistonDepth_in).toBeCloseTo(vb6Rows[8].pistonDepth_in, 6);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Config C: Small Bore / High Rod Ratio
// ═══════════════════════════════════════════════════════════════════════
describe('Mech Details Parity — Config C: Small Bore / High Rod Ratio', () => {
  const { stroke_in, rodLength_in, compressionRatio, rpmTest } = CFG_C;
  const LRQS = rodLength_in / stroke_in; // 1.983

  describe('Geometric sanity', () => {
    it('LRQS = 1.983', () => {
      expect(LRQS).toBeCloseTo(1.983, 3);
    });

    it('AngMPS is higher than base case (longer rod ratio)', () => {
      const angC = vb6AngMPS(stroke_in, rodLength_in);
      const angA = vb6AngMPS(CFG_A.stroke_in, CFG_A.rodLength_in);
      expect(angC).toBeGreaterThan(angA);
    });
  });

  describe('Piston Speed Summary @ 8000 RPM', () => {
    it('avg speed = RPM * 2 * stroke / 12', () => {
      const s = calcPistonSpeedSummary(rpmTest, stroke_in, rodLength_in);
      const expected = Math.round(rpmTest * 2 * stroke_in / 12);
      expect(s.avgSpeed_fpm).toBe(expected);
    });

    it('max speed uses flrqs correction', () => {
      const s = calcPistonSpeedSummary(rpmTest, stroke_in, rodLength_in);
      // flrqs = 1 + (0.348/LRQS)^1.99
      const flrqs = 1 + Math.pow(0.348 / LRQS, 1.99);
      const PI = 3.141593;
      const expectedMax = Math.round(rpmTest * PI * flrqs * stroke_in / 12);
      expect(s.maxSpeed_fpm).toBe(expectedMax);
    });
  });

  describe('Cranking Compression', () => {
    it('CR 11.0 → 191 psig', () => {
      expect(calcCrankingCompression(compressionRatio)).toBe(191);
    });
  });

  describe('15-row table @ 8000 RPM', () => {
    const rows = calcMechDetailsForRPM(rpmTest, stroke_in, rodLength_in);

    it('has exactly 15 rows', () => {
      expect(rows.length).toBe(15);
    });

    it('BDC depth equals stroke', () => {
      expect(rows[14].pistonDepth_in).toBeCloseTo(stroke_in, 3);
    });

    it('AngMPS row has near-zero acceleration', () => {
      const angMPS = vb6AngMPS(stroke_in, rodLength_in);
      const angRow = rows.find(r => Math.abs(r.angle_deg - angMPS) < 0.5);
      expect(angRow).toBeDefined();
      expect(Math.abs(parseInt(angRow!.pistonAccel_gs))).toBeLessThan(50);
    });

    // Lock specific values
    it('locks key row values', () => {
      // 90 deg: depth should be slightly more than half stroke for high rod ratio
      const r90 = rows[8];
      expect(r90.angle_deg).toBe(90);
      // With LRQS=1.983, piston at 90° is past midstroke
      expect(r90.pistonDepth_in).toBeGreaterThan(stroke_in / 2);
      expect(r90.pistonDepth_in).toBeLessThan(stroke_in * 0.65);
    });
  });

  describe('engineProDetails cross-check', () => {
    const proRows = calcMechDetails(rpmTest, stroke_in, rodLength_in, false);
    const vb6Rows = calcMechDetailsForRPM(rpmTest, stroke_in, rodLength_in);

    it('all 15 rows match between implementations', () => {
      expect(proRows.length).toBe(vb6Rows.length);
      proRows.forEach((p, i) => {
        expect(p.angle_deg).toBeCloseTo(vb6Rows[i].angle_deg, 1);
        expect(p.pistonDepth_in).toBeCloseTo(vb6Rows[i].pistonDepth_in, 6);
        expect(p.pistonSpeed_fpm).toBeCloseTo(vb6Rows[i].pistonSpeed_fpm, 1);
        const proGs = Math.round(p.pistonAccel_gs);
        const vb6Gs = parseInt(vb6Rows[i].pistonAccel_gs);
        expect(Math.abs(proGs - vb6Gs)).toBeLessThanOrEqual(1);
      });
    });
  });
});
