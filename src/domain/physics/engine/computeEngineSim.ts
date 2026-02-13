/**
 * Engine Sim Truth Harness
 * 
 * Deterministic wrapper around calcEngPerf + generateVB6DynoCurve.
 * This is the single entry point for snapshot testing against VB6 fixtures.
 */

import { calcEngPerf } from './enginePerf';
import { generateVB6DynoCurve } from './vb6CurveGen';
import type { EngineInputs, EngineOutputs } from './engineTypes';

export interface EngineSimSummary {
  peakHP: number;
  peakTQ: number;
  rpmPeakHP: number;
  rpmPeakTQ: number;
  hpPerCID: number;
  tqPerCID: number;
  shift: number;
  redline: number;
  cid: number;
}

export interface DynoCurvePoint {
  rpm: number;
  hp: number;
  torque_lbft: number;
}

export interface EngineSimResult {
  summary: EngineSimSummary;
  dynoCurve: DynoCurvePoint[];
}

/**
 * Compute full engine simulation result from VB6-ported logic.
 * Returns summary values and dyno curve arrays.
 */
export function computeEngineSim(input: EngineInputs): EngineSimResult {
  const perf: EngineOutputs = calcEngPerf(input);

  const summary: EngineSimSummary = {
    peakHP: perf.peakHP,
    peakTQ: perf.peakTQ,
    rpmPeakHP: perf.rpmPeakHP,
    rpmPeakTQ: perf.rpmPeakTQ,
    hpPerCID: perf.hpPerCID,
    tqPerCID: perf.tqPerCID,
    shift: perf.shift,
    redline: perf.redline,
    cid: perf.cid,
  };

  const dynoCurve: DynoCurvePoint[] = generateVB6DynoCurve(
    perf.peakHP,
    perf.rpmPeakHP,
    perf.peakTQ,
    perf.rpmPeakTQ,
    perf.redline,
    perf.cid,
  );

  return { summary, dynoCurve };
}
