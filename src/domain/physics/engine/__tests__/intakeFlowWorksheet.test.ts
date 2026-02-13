/**
 * Unit tests for Intake Flow Worksheet
 *
 * VB6 sources:
 *   - CSAREA.FRM (frmCSArea) — Minimum Cross-section Area Worksheet
 *   - MAXFLOW.FRM (frmMaxFlow) — Intake Port Flow Worksheet
 *   - ENGPERF.BAS CalcWSCSArea (lines 1262-1310)
 *   - ENGPERF.BAS CalcFlowStuff (lines 1161-1176)
 *   - ENGPERF.BAS EstSeatDia (lines 1223-1253)
 *   - ENGPERF.BAS CalcSeatPer/CalcSeatDia (lines 1178-1221)
 *   - ENGPERF.BAS CalcVelStd (lines 632-655)
 *   - DECLARES.BAS PI=3.141593, PSIA=14.696, PSTD=406.78, RHOair=0.07634, GC=32.174
 */
import { describe, it, expect } from 'vitest';
import {
  calcWSCSArea,
  calcFlowStuff,
  calcSeatPer,
  calcSeatDia,
  estSeatDia,
  calcVelStd,
  calcFromFlowVel,
  calcFromFlowFlux,
  calcFromFVIndex,
  computeVSWidthLimits,
  clampSeatPer,
  clampVSAngle,
  clampFVIndex,
  parseWSInput,
  formatDim3,
  formatDec1,
  CS_AREA_DEFAULTS,
  FLOW_DEFAULTS,
  SEAT_PER_MIN,
  SEAT_PER_MAX,
  VS_ANGLE_MIN,
  VS_ANGLE_MAX,
  FV_INDEX_MIN,
  FV_INDEX_MAX,
} from '../worksheets/intakeFlowWorksheet';

const PI = 3.141593;

describe('intakeFlowWorksheet', () => {
  // =========================================================================
  // CalcWSCSArea — three flow regimes
  // =========================================================================
  describe('calcWSCSArea', () => {
    const baseInputs = { ...CS_AREA_DEFAULTS };
    const baseCtx = { valveDia: 2.05, noInValves: 1 };

    it('returns 0 when valveLift is 0', () => {
      const result = calcWSCSArea({ ...baseInputs, valveLift: 0 }, baseCtx);
      expect(result).toBe(0);
    });

    it('computes area for VB6 default inputs (valveLift=0.55)', () => {
      const result = calcWSCSArea(baseInputs, baseCtx);
      // Should produce a positive area for default inputs
      expect(result).toBeGreaterThan(0);
      // VB6 round-trip: 3 decimal places
      expect(result.toFixed(3)).toBe(String(result));
    });

    it('low-lift regime: very small valve lift uses a1', () => {
      // With vsAngle=45, cosb=sinb≈0.7071, w=0.08*cosb≈0.0566
      // Threshold: w/(sinb*cosb) = 0.0566/0.5 ≈ 0.113
      // valveLift=0.05 < 0.113 → uses a1
      const result = calcWSCSArea({ ...baseInputs, valveLift: 0.05 }, baseCtx);
      expect(result).toBeGreaterThan(0);
    });

    it('high-lift regime: large valve lift uses min(a2, a3)', () => {
      const result = calcWSCSArea({ ...baseInputs, valveLift: 0.7 }, baseCtx);
      expect(result).toBeGreaterThan(0);
    });

    it('area increases with valve lift (up to throat limit)', () => {
      const r1 = calcWSCSArea({ ...baseInputs, valveLift: 0.2 }, baseCtx);
      const r2 = calcWSCSArea({ ...baseInputs, valveLift: 0.4 }, baseCtx);
      expect(r2).toBeGreaterThanOrEqual(r1);
    });

    it('area scales with noInValves', () => {
      const r1 = calcWSCSArea(baseInputs, { ...baseCtx, noInValves: 1 });
      const r2 = calcWSCSArea(baseInputs, { ...baseCtx, noInValves: 2 });
      expect(r2).toBeGreaterThan(r1);
    });

    it('VB6 parity: default inputs produce expected area', () => {
      // Manual calculation with VB6 defaults:
      // vd=2.05, vsd=1.794, vstmd=0.344, vl=0.55, vsAngle=45, vsWidth=0.08, niv=1
      // vsa=45*PI/180, sinb=cosb≈0.7071, tanb=1.0
      // w = 0.08 * 0.7071 ≈ 0.05657
      // threshold = w/(sinb*cosb) = 0.05657/0.5 ≈ 0.1131
      // vl=0.55 > 0.1131 → uses min(a2, a3)
      // h = sqrt((0.55 - 0.05657*1)^2 + 0.05657^2) = sqrt(0.4934^2 + 0.05657^2) ≈ 0.4967
      // a2 = 1 * PI * (2.05 - 0.05657) * 0.4967 ≈ PI * 1.9934 * 0.4967 ≈ 3.110
      // a3 = 1 * PI * (1.794^2 - 0.344^2) / 4 = PI * (3.2184 - 0.1183) / 4 ≈ PI * 3.1001 / 4 ≈ 2.434
      // min(a2, a3) = 2.434
      const result = calcWSCSArea(baseInputs, baseCtx);
      // a3 should be the controlling area at this lift
      const a3 = PI * (1.794 ** 2 - 0.344 ** 2) / 4;
      expect(result).toBeCloseTo(Number(a3.toFixed(3)), 3);
    });
  });

  // =========================================================================
  // CalcFlowStuff
  // =========================================================================
  describe('calcFlowStuff', () => {
    it('returns zeros when csArea is 0', () => {
      const result = calcFlowStuff(250, 0, 319);
      expect(result.flowFlux).toBe(0);
      expect(result.flowVel).toBe(0);
      expect(result.fvIndex).toBe(0);
    });

    it('computes flowFlux = maxInFlow / csArea', () => {
      const result = calcFlowStuff(250, 2.4, 319);
      expect(result.flowFlux).toBeCloseTo(250 / 2.4, 1);
    });

    it('computes flowVel = 2.4 * flowFlux', () => {
      const result = calcFlowStuff(250, 2.4, 319);
      expect(result.flowVel).toBeCloseTo(2.4 * (250 / 2.4), 1);
    });

    it('computes fvIndex = 100 * flowVel / VSTD', () => {
      const vstd = 319.2;
      const result = calcFlowStuff(250, 2.4, vstd);
      const expectedVel = 2.4 * (250 / 2.4);
      expect(result.fvIndex).toBeCloseTo(100 * expectedVel / vstd, 1);
    });

    it('all outputs are rounded to 1 decimal place', () => {
      const result = calcFlowStuff(250, 2.4, 319.2);
      // roundTrip(x, 1) means x === Number(x.toFixed(1))
      expect(result.flowFlux).toBe(Number(result.flowFlux.toFixed(1)));
      expect(result.flowVel).toBe(Number(result.flowVel.toFixed(1)));
      expect(result.fvIndex).toBe(Number(result.fvIndex.toFixed(1)));
    });
  });

  // =========================================================================
  // CalcSeatPer / CalcSeatDia
  // =========================================================================
  describe('calcSeatPer', () => {
    it('computes seatPer = 100 * seatDia / valveDia', () => {
      expect(calcSeatPer(1.794, 2.05)).toBeCloseTo(87.5, 1);
    });

    it('returns 0 when valveDia is 0', () => {
      expect(calcSeatPer(1.794, 0)).toBe(0);
    });
  });

  describe('calcSeatDia', () => {
    it('computes seatDia = valveDia * seatPer / 100', () => {
      expect(calcSeatDia(87.5, 2.05)).toBeCloseTo(1.794, 3);
    });

    it('returns 0 when seatPer is 0', () => {
      expect(calcSeatDia(0, 2.05)).toBe(0);
    });
  });

  // =========================================================================
  // EstSeatDia
  // =========================================================================
  describe('estSeatDia', () => {
    it('back-calculates seatDia from csArea', () => {
      // vsd = sqrt(4 * csArea / niv / PI + stemDia^2)
      const result = estSeatDia(2.4, 1, 0.344);
      const expected = Math.sqrt(4 * 2.4 / 1 / PI + 0.344 ** 2);
      expect(result).toBeCloseTo(expected, 3);
    });

    it('handles zero csArea', () => {
      const result = estSeatDia(0, 1, 0.344);
      expect(result).toBeCloseTo(0.344, 3); // sqrt(0 + 0.344^2) = 0.344
    });
  });

  // =========================================================================
  // CalcVelStd
  // =========================================================================
  describe('calcVelStd', () => {
    it('returns ~319 for deltaP=28, niv=1', () => {
      const vstd = calcVelStd(28, 1);
      // VB6 comment: "constant results in VSTD = 319.2 (133 cfm/in^2) @ 28" H2O"
      expect(vstd).toBeCloseTo(319.2, 0);
    });

    it('returns ~329 for deltaP=28, niv=2', () => {
      const vstd = calcVelStd(28, 2);
      // VB6 comment: "constant results in VSTD = 328.8 (137 cfm/in^2) @ 28" H2O"
      expect(vstd).toBeCloseTo(328.8, 0);
    });

    it('increases with deltaP', () => {
      const v1 = calcVelStd(20, 1);
      const v2 = calcVelStd(28, 1);
      expect(v2).toBeGreaterThan(v1);
    });
  });

  // =========================================================================
  // CalcFromFlowVel / CalcFromFlowFlux / CalcFromFVIndex
  // =========================================================================
  describe('calcFromFlowVel', () => {
    it('computes fvIndex and flowFlux from flowVel', () => {
      const vstd = 319.2;
      const result = calcFromFlowVel(250, 2.4, vstd);
      expect(result.flowFlux).toBeCloseTo(250 / 2.4, 1);
      expect(result.fvIndex).toBeCloseTo(100 * 250 / vstd, 1);
      expect(result.maxInFlow).toBeCloseTo(2.4 * result.flowFlux, 1);
    });
  });

  describe('calcFromFlowFlux', () => {
    it('computes flowVel and fvIndex from flowFlux', () => {
      const vstd = 319.2;
      const result = calcFromFlowFlux(104, 2.4, vstd);
      expect(result.flowVel).toBeCloseTo(104 * 2.4, 1);
      expect(result.fvIndex).toBeCloseTo(100 * result.flowVel / vstd, 1);
    });
  });

  describe('calcFromFVIndex', () => {
    it('computes flowVel and flowFlux from fvIndex', () => {
      const vstd = 319.2;
      const result = calcFromFVIndex(78, 2.4, vstd);
      expect(result.flowVel).toBeCloseTo(vstd * 78 / 100, 1);
      expect(result.flowFlux).toBeCloseTo(result.flowVel / 2.4, 1);
    });
  });

  // =========================================================================
  // computeVSWidthLimits
  // =========================================================================
  describe('computeVSWidthLimits', () => {
    it('computes dynamic min/max for default valve geometry', () => {
      const limits = computeVSWidthLimits(2.05, 1.794);
      expect(limits.min).toBeGreaterThanOrEqual(0);
      expect(limits.max).toBeGreaterThan(limits.min);
    });

    it('max is at least 0.02', () => {
      // Very small valve where max would be tiny
      const limits = computeVSWidthLimits(0.5, 0.49);
      expect(limits.max).toBeGreaterThanOrEqual(0.02);
    });
  });

  // =========================================================================
  // Clamping
  // =========================================================================
  describe('clamping', () => {
    it('clampSeatPer clamps to 75-100', () => {
      expect(clampSeatPer(50)).toBe(SEAT_PER_MIN);
      expect(clampSeatPer(110)).toBe(SEAT_PER_MAX);
      expect(clampSeatPer(87.5)).toBe(87.5);
    });

    it('clampVSAngle clamps to 30-60', () => {
      expect(clampVSAngle(20)).toBe(VS_ANGLE_MIN);
      expect(clampVSAngle(70)).toBe(VS_ANGLE_MAX);
      expect(clampVSAngle(45)).toBe(45);
    });

    it('clampFVIndex clamps to 50-101', () => {
      expect(clampFVIndex(30)).toBe(FV_INDEX_MIN);
      expect(clampFVIndex(120)).toBe(FV_INDEX_MAX);
      expect(clampFVIndex(78)).toBe(78);
    });
  });

  // =========================================================================
  // Parsing
  // =========================================================================
  describe('parseWSInput', () => {
    it('blank → 0', () => expect(parseWSInput('')).toBe(0));
    it('whitespace → 0', () => expect(parseWSInput('   ')).toBe(0));
    it('non-numeric → 0', () => expect(parseWSInput('abc')).toBe(0));
    it('"1.500" → 1.5', () => expect(parseWSInput('1.500')).toBe(1.5));
    it('" 2.0 " → 2', () => expect(parseWSInput(' 2.0 ')).toBe(2));
  });

  // =========================================================================
  // Formatting
  // =========================================================================
  describe('formatting', () => {
    it('formatDim3 shows 3 decimal places', () => {
      expect(formatDim3(1.5)).toBe('1.500');
      expect(formatDim3(0)).toBe('0.000');
    });

    it('formatDec1 shows 1 decimal place', () => {
      expect(formatDec1(87.5)).toBe('87.5');
      expect(formatDec1(319.2)).toBe('319.2');
    });
  });

  // =========================================================================
  // VB6 parity: full default scenario
  // =========================================================================
  describe('VB6 default scenario parity', () => {
    it('default inputs produce consistent flow results', () => {
      // VB6 defaults: valveDia=2.05, niv=1, deltaP=28, maxInFlow=250, csArea=2.4
      const vstd = calcVelStd(28, 1);
      const flowResult = calcFlowStuff(250, 2.4, vstd);

      // flowFlux = 250 / 2.4 ≈ 104.2
      expect(flowResult.flowFlux).toBeCloseTo(104.2, 1);
      // flowVel = 2.4 * 104.2 ≈ 250.0
      expect(flowResult.flowVel).toBeCloseTo(250.0, 0);
      // fvIndex = 100 * 250 / 319.2 ≈ 78.3
      expect(flowResult.fvIndex).toBeCloseTo(78.3, 0);
    });

    it('csArea worksheet produces consistent area for defaults', () => {
      const wsArea = calcWSCSArea(CS_AREA_DEFAULTS, { valveDia: 2.05, noInValves: 1 });
      // Should be close to the throat area a3 for default high-lift case
      expect(wsArea).toBeGreaterThan(2.0);
      expect(wsArea).toBeLessThan(3.0);
    });

    it('estSeatDia round-trips with calcSeatPer', () => {
      const seatDia = estSeatDia(2.4, 1, 0.344);
      const seatPer = calcSeatPer(seatDia, 2.05);
      const seatDia2 = calcSeatDia(seatPer, 2.05);
      // Should round-trip approximately
      expect(seatDia2).toBeCloseTo(seatDia, 2);
    });
  });

  // =========================================================================
  // Defaults
  // =========================================================================
  describe('defaults', () => {
    it('CS_AREA_DEFAULTS has expected values', () => {
      expect(CS_AREA_DEFAULTS.seatDia).toBe(1.794);
      expect(CS_AREA_DEFAULTS.vsAngle).toBe(45);
      expect(CS_AREA_DEFAULTS.vsWidth).toBe(0.08);
      expect(CS_AREA_DEFAULTS.stemDia).toBe(0.344);
      expect(CS_AREA_DEFAULTS.valveLift).toBe(0.55);
    });

    it('FLOW_DEFAULTS has expected values', () => {
      expect(FLOW_DEFAULTS.csArea).toBe(2.4);
    });
  });
});
