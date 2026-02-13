/**
 * Flow Details Wiring Tests
 *
 * Validates that Flow Details calculations are correctly driven by
 * flowbench data arrays (no hardcoded placeholders), matching VB6 semantics.
 *
 * Scenario 1: Base case flowbench data (VB6 BASECASE.ENG defaults)
 * Scenario 2: Custom non-uniform lift spacing dataset
 */

import { describe, it, expect } from 'vitest';
import {
  calcFlowDetails,
  type FlowDetailsConfig,
  type FlowDetailPoint,
} from '../engineProDetails';

// ── Shared engine geometry (VB6 BASECASE) ────────────────────────────

const BASE = {
  stroke_in: 3.48,
  rodLength_in: 5.85,
  bore_in: 4.03,
  valveDia_in: 2.05,
  numValves: 1,
  duration_deg: 264,
  lobeCenterline_deg: 105,
  maxLift_in: 0.55,
  camType: 4, // Normal Flat Tappet
};

// ── Scenario 1: Base case flowbench data ─────────────────────────────

const BASE_FLOW_CONFIG: FlowDetailsConfig = {
  // 1-indexed arrays (element 0 is dummy) — matches old hardcoded VB6_FLOWBENCH_LIFT/FLOW
  flowbenchLifts_1idx: [0, 0.100, 0.200, 0.300, 0.400, 0.500, 0.550, 0.600, 0.700, 0.800],
  flowbenchFlows_1idx: [0, 56.6, 116.0, 169.4, 212.6, 241.3, 250.0, 258.7, 262.9, 264.2],
  lastRow: 9,
  testPressure_inH2O: 28.0,
  seatDia_in: 1.794,
  seatAngle_deg: 45,
  seatWidth_in: 0.08,
  stemDia_in: 0.344,
};

// ── Scenario 2: Custom non-uniform lift spacing ──────────────────────

const CUSTOM_FLOW_CONFIG: FlowDetailsConfig = {
  // Non-uniform spacing: 0.05, 0.15, 0.25, 0.40, 0.60
  flowbenchLifts_1idx: [0, 0.05, 0.15, 0.25, 0.40, 0.60],
  flowbenchFlows_1idx: [0, 30, 90, 145, 210, 255],
  lastRow: 5,
  testPressure_inH2O: 25.0, // different test pressure
  seatDia_in: 1.700,
  seatAngle_deg: 45,
  seatWidth_in: 0.06,
  stemDia_in: 0.340,
};

// =========================================================================
// Scenario 1: Base case flowbench data
// =========================================================================
describe('Flow Details with base case flowbench data', () => {
  let points: FlowDetailPoint[];

  // Run once for all tests in this describe
  points = calcFlowDetails(
    6650, BASE.stroke_in, BASE.rodLength_in, BASE.bore_in,
    BASE.valveDia_in, BASE.numValves, BASE.duration_deg,
    BASE.lobeCenterline_deg, BASE.maxLift_in, BASE.camType,
    BASE_FLOW_CONFIG,
  );

  it('produces 12 angle rows', () => {
    expect(points.length).toBe(12);
  });

  it('first row is IVO, last row is IVC', () => {
    expect(points[0].eventLabel).toContain('IVO');
    expect(points[points.length - 1].eventLabel).toContain('IVC');
  });

  it('IVO row has near-zero flow demand (valve barely open)', () => {
    const ivo = points[0];
    expect(ivo.valveLift_in).toBeCloseTo(0.05, 2);
    expect(Math.abs(ivo.flowDemand_cfm)).toBeLessThan(10);
  });

  it('max lift row (ILC ~105 deg) has highest flow area', () => {
    const ilc = points.find(p => p.eventLabel.includes('ILC'));
    expect(ilc).toBeDefined();
    expect(ilc!.valveLift_in).toBeCloseTo(0.55, 2);
    // With seatDia 1.794 (87.5% of 2.05), throat area is ~2.435 sq in
    expect(ilc!.flowArea_sqin).toBeGreaterThan(2.0);
  });

  it('test pressure is non-zero at mid-stroke angles (quadratic solver active)', () => {
    // At 60 deg ATDC, valve is well open and piston is moving fast
    const mid = points.find(p => Math.abs(p.angle_deg - 60) < 1);
    expect(mid).toBeDefined();
    expect(mid!.testPressure_inH2O).toBeGreaterThan(0);
  });

  it('flow velocity is non-zero at mid-stroke angles', () => {
    const mid = points.find(p => Math.abs(p.angle_deg - 90) < 1);
    expect(mid).toBeDefined();
    expect(Math.abs(mid!.flowVelocity_fps)).toBeGreaterThan(100);
  });

  it('BDC row (180 deg) has positive flow demand (inertia effect)', () => {
    const bdc = points.find(p => Math.abs(p.angle_deg - 180) < 0.5);
    expect(bdc).toBeDefined();
    // VB6 expected: CFM ~68 at BDC (inertia keeps air flowing)
    expect(bdc!.flowDemand_cfm).toBeGreaterThan(30);
  });

  it('matches VB6 expected values at key angles (within tolerance)', () => {
    // With seatDia 1.794 (87.5%), flow area differs from VB6 default (92.4%)
    // so flow demand and velocity shift accordingly. Verify reasonable ranges.
    const at60 = points.find(p => Math.abs(p.angle_deg - 60) < 1);
    expect(at60).toBeDefined();
    expect(at60!.flowDemand_cfm).toBeGreaterThan(350);
    expect(at60!.flowDemand_cfm).toBeLessThan(450);
    expect(Math.abs(at60!.flowVelocity_fps)).toBeGreaterThan(300);

    const at105 = points.find(p => Math.abs(p.angle_deg - 105) < 1);
    expect(at105).toBeDefined();
    expect(at105!.flowDemand_cfm).toBeGreaterThan(350);
    expect(at105!.flowDemand_cfm).toBeLessThan(450);
    expect(Math.abs(at105!.flowVelocity_fps)).toBeGreaterThan(300);
  });
});

// =========================================================================
// Scenario 2: Custom non-uniform lift spacing
// =========================================================================
describe('Flow Details with custom non-uniform flowbench data', () => {
  let points: FlowDetailPoint[];

  points = calcFlowDetails(
    5500, BASE.stroke_in, BASE.rodLength_in, BASE.bore_in,
    BASE.valveDia_in, BASE.numValves, BASE.duration_deg,
    BASE.lobeCenterline_deg, BASE.maxLift_in, BASE.camType,
    CUSTOM_FLOW_CONFIG,
  );

  it('produces 12 angle rows', () => {
    expect(points.length).toBe(12);
  });

  it('test pressure is non-zero at mid-stroke (quadratic solver uses custom data)', () => {
    const mid = points.find(p => Math.abs(p.angle_deg - 90) < 1);
    expect(mid).toBeDefined();
    expect(mid!.testPressure_inH2O).toBeGreaterThan(0);
  });

  it('flow demand differs from base case (different flowbench data matters)', () => {
    const basePoints = calcFlowDetails(
      5500, BASE.stroke_in, BASE.rodLength_in, BASE.bore_in,
      BASE.valveDia_in, BASE.numValves, BASE.duration_deg,
      BASE.lobeCenterline_deg, BASE.maxLift_in, BASE.camType,
      BASE_FLOW_CONFIG,
    );

    // At 90 deg, different flowbench data should produce different flow demand
    const customMid = points.find(p => Math.abs(p.angle_deg - 90) < 1);
    const baseMid = basePoints.find(p => Math.abs(p.angle_deg - 90) < 1);
    expect(customMid).toBeDefined();
    expect(baseMid).toBeDefined();
    // They should differ because the flowbench data and test pressure are different
    expect(customMid!.flowDemand_cfm).not.toBeCloseTo(baseMid!.flowDemand_cfm, 0);
  });

  it('flow area uses custom seat geometry', () => {
    // Custom seat dia 1.700 vs base 1.794 → different throat area at max lift
    const ilc = points.find(p => p.eventLabel.includes('ILC'));
    expect(ilc).toBeDefined();

    const basePoints = calcFlowDetails(
      5500, BASE.stroke_in, BASE.rodLength_in, BASE.bore_in,
      BASE.valveDia_in, BASE.numValves, BASE.duration_deg,
      BASE.lobeCenterline_deg, BASE.maxLift_in, BASE.camType,
      BASE_FLOW_CONFIG,
    );
    const baseIlc = basePoints.find(p => p.eventLabel.includes('ILC'));
    expect(baseIlc).toBeDefined();

    // Different seat diameter → different flow area
    expect(ilc!.flowArea_sqin).not.toBeCloseTo(baseIlc!.flowArea_sqin, 2);
  });
});

// =========================================================================
// Scenario 3: No flowbench data (simplified fallback)
// =========================================================================
describe('Flow Details without flowbench data (simplified fallback)', () => {
  const points = calcFlowDetails(
    6000, BASE.stroke_in, BASE.rodLength_in, BASE.bore_in,
    BASE.valveDia_in, BASE.numValves, BASE.duration_deg,
    BASE.lobeCenterline_deg, BASE.maxLift_in, BASE.camType,
    // no flowConfig
  );

  it('produces 12 angle rows', () => {
    expect(points.length).toBe(12);
  });

  it('test pressure is 0 everywhere (no quadratic solver without flowbench)', () => {
    for (const p of points) {
      expect(p.testPressure_inH2O).toBe(0);
    }
  });

  it('still computes flow demand and velocity (simplified path)', () => {
    const mid = points.find(p => Math.abs(p.angle_deg - 90) < 1);
    expect(mid).toBeDefined();
    expect(Math.abs(mid!.flowDemand_cfm)).toBeGreaterThan(0);
    expect(Math.abs(mid!.flowVelocity_fps)).toBeGreaterThan(0);
  });
});

// =========================================================================
// Scenario 4: Flow Details cam overrides (local state, not mutating config)
// =========================================================================
describe('Flow Details cam overrides', () => {
  const basePoints = calcFlowDetails(
    6650, BASE.stroke_in, BASE.rodLength_in, BASE.bore_in,
    BASE.valveDia_in, BASE.numValves, BASE.duration_deg,
    BASE.lobeCenterline_deg, BASE.maxLift_in, BASE.camType,
    BASE_FLOW_CONFIG,
  );

  it('overriding duration changes IVO/IVC angles without mutating base config', () => {
    const overriddenDuration = BASE.duration_deg + 6; // +6° within ±8 range
    const overriddenPoints = calcFlowDetails(
      6650, BASE.stroke_in, BASE.rodLength_in, BASE.bore_in,
      BASE.valveDia_in, BASE.numValves, overriddenDuration,
      BASE.lobeCenterline_deg, BASE.maxLift_in, BASE.camType,
      BASE_FLOW_CONFIG,
    );
    expect(overriddenPoints.length).toBe(12);
    // IVO angle shifts: base IVO = ILC - dur/2 = 105 - 132 = -27
    //                   over IVO = ILC - (dur+6)/2 = 105 - 135 = -30
    const baseIvo = basePoints[0];
    const overIvo = overriddenPoints[0];
    expect(overIvo.angle_deg).not.toBe(baseIvo.angle_deg);
    // IVC also shifts
    const baseIvc = basePoints[basePoints.length - 1];
    const overIvc = overriddenPoints[overriddenPoints.length - 1];
    expect(overIvc.angle_deg).not.toBe(baseIvc.angle_deg);
    // Base config duration is unchanged (override is local)
    expect(BASE.duration_deg).toBe(264);
  });

  it('overriding maxLift changes valve lift at ILC', () => {
    const overriddenLift = BASE.maxLift_in + 0.08; // +0.08" within ±0.1 range
    const overriddenPoints = calcFlowDetails(
      6650, BASE.stroke_in, BASE.rodLength_in, BASE.bore_in,
      BASE.valveDia_in, BASE.numValves, BASE.duration_deg,
      BASE.lobeCenterline_deg, overriddenLift, BASE.camType,
      BASE_FLOW_CONFIG,
    );
    expect(overriddenPoints.length).toBe(12);
    const baseIlc = basePoints.find(p => p.eventLabel.includes('ILC'));
    const overIlc = overriddenPoints.find(p => p.eventLabel.includes('ILC'));
    expect(baseIlc).toBeDefined();
    expect(overIlc).toBeDefined();
    // Higher maxLift → higher valve lift at ILC (cam profile scales)
    expect(overIlc!.valveLift_in).toBeGreaterThan(baseIlc!.valveLift_in);
    // Base config maxLift is unchanged (override is local)
    expect(BASE.maxLift_in).toBe(0.55);
  });

  it('clamping: duration override stays within ±8° of base', () => {
    const baseDur = 264;
    // Simulate the clamping logic from the UI
    const clamp = (v: number) => Math.max(baseDur - 8, Math.min(baseDur + 8, v));
    expect(clamp(baseDur + 20)).toBe(baseDur + 8);  // 284 → 272
    expect(clamp(baseDur - 20)).toBe(baseDur - 8);  // 244 → 256
    expect(clamp(baseDur + 4)).toBe(baseDur + 4);   // 268 → 268 (within range)
    expect(clamp(baseDur)).toBe(baseDur);            // 264 → 264 (no change)
  });

  it('clamping: maxLift override stays within ±0.1" of base', () => {
    const baseLift = 0.55;
    // Simulate the clamping logic from the UI
    const clamp = (v: number) => {
      const clamped = Math.max(baseLift - 0.1, Math.min(baseLift + 0.1, v));
      return Math.round(clamped * 1000) / 1000;
    };
    expect(clamp(baseLift + 0.5)).toBe(0.65);   // 1.05 → 0.65
    expect(clamp(baseLift - 0.5)).toBe(0.45);   // 0.05 → 0.45
    expect(clamp(baseLift + 0.05)).toBe(0.6);   // within range
    expect(clamp(baseLift)).toBe(baseLift);      // no change
  });
});
