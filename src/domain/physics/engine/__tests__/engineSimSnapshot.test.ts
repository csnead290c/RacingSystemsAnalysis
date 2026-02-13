/**
 * Engine Sim Snapshot Tests — Screenshot Case #1
 *
 * Compares computeEngineSim() output against VB6 screenshot fixture.
 * Includes:
 *   (a) VB6 display-rounded summary assertions (what the user sees)
 *   (b) Full-precision summary assertions (regression guard)
 *   (c) Dyno curve RPM/HP/TQ exact match
 *   (d) Diff explainer that prints top diffs on failure
 *
 * Tolerance rationale:
 *   - RPM fields (rpmPeakHP, rpmPeakTQ, shift, redline): exact (VB6 rounds to 50)
 *   - HP/TQ display: Math.round() matches VB6 Format("#####") for values ≥100
 *   - HP/CID display: toFixed(2) matches VB6 Format("##.00")
 *   - CID display: toFixed(1) matches VB6 Format("###.0")
 *   - Curve HP/TQ: Math.round() in vb6CurveGen.ts — exact integer match
 */

import { describe, it, expect } from 'vitest';
import { computeEngineSim } from '../computeEngineSim';
import type { EngineSimSummary, DynoCurvePoint } from '../computeEngineSim';
import type { EngineInputs } from '../engineTypes';
import fixture from './fixtures/engineSim.case01.json';

// ---------------------------------------------------------------------------
// Diff Explainer Utility
// ---------------------------------------------------------------------------

function diffDynoCurve(
  expected: DynoCurvePoint[],
  actual: DynoCurvePoint[],
): string[] {
  const msgs: string[] = [];
  if (expected.length !== actual.length) {
    msgs.push(`Curve length mismatch: expected ${expected.length}, got ${actual.length}`);
  }
  const len = Math.min(expected.length, actual.length);
  for (let i = 0; i < len; i++) {
    const e = expected[i];
    const a = actual[i];
    const parts: string[] = [];
    if (e.rpm !== a.rpm) parts.push(`rpm: ${e.rpm}→${a.rpm}`);
    if (e.hp !== a.hp) parts.push(`hp: ${e.hp}→${a.hp} (Δ${a.hp - e.hp})`);
    if (e.torque_lbft !== a.torque_lbft) parts.push(`tq: ${e.torque_lbft}→${a.torque_lbft} (Δ${a.torque_lbft - e.torque_lbft})`);
    if (parts.length > 0) {
      msgs.push(`  [${i}] @${e.rpm}RPM: ${parts.join(', ')}`);
    }
  }
  return msgs;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Engine Sim Snapshot — Screenshot Case #1', () => {
  const testCase = fixture.cases[0];
  const input = testCase.input as EngineInputs;
  const expectedSummary = testCase.expected.summary as EngineSimSummary;
  const expectedCurve = testCase.expected.dynoCurve as DynoCurvePoint[];
  const screenExpected = testCase.screenshotExpected;

  const result = computeEngineSim(input);

  // ---- (a) VB6 display-rounded summary (what the screenshot shows) ----
  describe('screenshot display values', () => {
    it('Peak HP display = 461', () => {
      expect(Math.round(result.summary.peakHP)).toBe(screenExpected.peakHP_display);
    });
    it('Peak TQ display = 415', () => {
      expect(Math.round(result.summary.peakTQ)).toBe(screenExpected.peakTQ_display);
    });
    it('RPM @ Peak HP = 6650', () => {
      expect(result.summary.rpmPeakHP).toBe(screenExpected.rpmPeakHP);
    });
    it('RPM @ Peak TQ = 5450', () => {
      expect(result.summary.rpmPeakTQ).toBe(screenExpected.rpmPeakTQ);
    });
    it('CID display = 355.1', () => {
      expect(result.summary.cid.toFixed(1)).toBe(screenExpected.cid_display);
    });
    it('HP/CID display = 1.30', () => {
      expect(result.summary.hpPerCID.toFixed(2)).toBe(screenExpected.hpPerCID_display);
    });
    it('Shift RPM = 7200', () => {
      expect(result.summary.shift).toBe(screenExpected.shift);
    });
    it('Redline = 8350', () => {
      expect(result.summary.redline).toBe(screenExpected.redline);
    });
  });

  // ---- (b) Full-precision summary (regression guard) ----
  describe('full-precision summary', () => {
    it('peakHP matches fixture', () => {
      expect(result.summary.peakHP).toBeCloseTo(expectedSummary.peakHP, 6);
    });
    it('peakTQ matches fixture', () => {
      expect(result.summary.peakTQ).toBeCloseTo(expectedSummary.peakTQ, 6);
    });
    it('hpPerCID matches fixture', () => {
      expect(result.summary.hpPerCID).toBeCloseTo(expectedSummary.hpPerCID, 6);
    });
    it('tqPerCID matches fixture', () => {
      expect(result.summary.tqPerCID).toBeCloseTo(expectedSummary.tqPerCID, 6);
    });
    it('cid matches fixture', () => {
      expect(result.summary.cid).toBeCloseTo(expectedSummary.cid, 6);
    });
    it('RPM fields are exact integers', () => {
      expect(result.summary.rpmPeakHP).toBe(expectedSummary.rpmPeakHP);
      expect(result.summary.rpmPeakTQ).toBe(expectedSummary.rpmPeakTQ);
      expect(result.summary.shift).toBe(expectedSummary.shift);
      expect(result.summary.redline).toBe(expectedSummary.redline);
    });
  });

  // ---- (c) Dyno curve ----
  describe('dyno curve', () => {
    it('curve length = 25 points (125 RPM spacing)', () => {
      expect(result.dynoCurve.length).toBe(expectedCurve.length);
    });

    it('RPM points match exactly', () => {
      for (let i = 0; i < expectedCurve.length; i++) {
        expect(result.dynoCurve[i].rpm).toBe(expectedCurve[i].rpm);
      }
    });

    it('HP values match exactly (Math.round — zero tolerance)', () => {
      const mismatches: string[] = [];
      for (let i = 0; i < expectedCurve.length; i++) {
        if (result.dynoCurve[i].hp !== expectedCurve[i].hp) {
          mismatches.push(
            `[${i}] @${expectedCurve[i].rpm}RPM: expected HP=${expectedCurve[i].hp}, got ${result.dynoCurve[i].hp}`
          );
        }
      }
      if (mismatches.length > 0) {
        console.log(`HP mismatches:\n  ${mismatches.slice(0, 10).join('\n  ')}`);
      }
      expect(mismatches).toHaveLength(0);
    });

    it('TQ values match exactly (Math.round — zero tolerance)', () => {
      const mismatches: string[] = [];
      for (let i = 0; i < expectedCurve.length; i++) {
        if (result.dynoCurve[i].torque_lbft !== expectedCurve[i].torque_lbft) {
          mismatches.push(
            `[${i}] @${expectedCurve[i].rpm}RPM: expected TQ=${expectedCurve[i].torque_lbft}, got ${result.dynoCurve[i].torque_lbft}`
          );
        }
      }
      if (mismatches.length > 0) {
        console.log(`TQ mismatches:\n  ${mismatches.slice(0, 10).join('\n  ')}`);
      }
      expect(mismatches).toHaveLength(0);
    });

    // ---- (d) Diff explainer on any failure ----
    it('full curve diff explainer (informational)', () => {
      const diffs = diffDynoCurve(expectedCurve, result.dynoCurve);
      if (diffs.length > 0) {
        console.log(`\n=== CURVE DIFFS (first 10) ===\n${diffs.slice(0, 10).join('\n')}`);
      }
      expect(diffs).toHaveLength(0);
    });
  });
});
