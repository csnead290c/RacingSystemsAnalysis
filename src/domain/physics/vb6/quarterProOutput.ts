/**
 * QuarterPro v3.2 Output Extraction Logic
 * 
 * PROVEN VB6 LOGIC (from vb6Exact.ts lines 1463-1464, 1497-1498):
 * 
 * VB6 QuarterPro summary MPH = TRAP SPEED over last 66 ft:
 * - For 660 ft (EIGHTH):  mph = 66 / (time_at_660 - time_at_594)
 * - For 1320 ft (QUARTER): mph = 66 / (time_at_1320 - time_at_1254)
 * 
 * VB6Exact already calculates this trap speed and stores it in timeslip entries
 * at 660 and 1320 ft. The v_mph field in these entries IS the trap speed,
 * NOT instantaneous velocity.
 * 
 * Source: src/domain/physics/models/vb6Exact.ts
 * - Lines 1092-1096: SaveTime variables for trap calculation
 * - Lines 1463-1464: Trap speed for 660 ft
 * - Lines 1497-1498: Trap speed for 1320 ft
 */

import type { SimResult } from '../index';
import { formatET_QP, formatMPH_QP, f32 } from './vb6DisplayFormat';

export interface QuarterProDebug {
  finishFt: number;
  trapStartFt: number;
  t_finish: number;  // Time at finish distance (660 or 1320)
  t_save: number | null;  // Time at trap start (594 or 1254)
  dt: number | null;  // Time difference (trap window)
  mph_formula: number | null;  // MPH computed from formula
  mph_timeslip: number;  // MPH stored in timeslip entry
  mph_match: boolean;  // Do formula and timeslip match?
  notes: string[];
}

export interface QuarterProSummary {
  finishFt: number;
  et_raw_s: number;
  mph_raw: number;
  et_display: string;
  mph_display: string;
  debug: QuarterProDebug;
}

/**
 * Extract QuarterPro summary ET and MPH from simulation result.
 * 
 * SINGLE SOURCE OF TRUTH for QuarterPro output extraction.
 * 
 * @param result SimResult from vb6Exact simulation
 * @param raceLength 'EIGHTH' (660 ft) or 'QUARTER' (1320 ft)
 * @returns QuarterProSummary with raw values, formatted strings, and debug info
 */
export function extractQuarterProSummary(
  result: SimResult,
  raceLength: 'EIGHTH' | 'QUARTER'
): QuarterProSummary {
  const finishFt = raceLength === 'EIGHTH' ? 660 : 1320;
  const trapStartFt = finishFt - 66;
  const notes: string[] = [];
  
  // Find timeslip entry at finish distance
  // vb6Exact creates exact entries at 660 and 1320 ft (lines 1474, 1515)
  const finishEntry = result.timeslip.find(e => Math.abs(e.d_ft - finishFt) < 0.01);
  
  if (!finishEntry) {
    throw new Error(`No timeslip entry found at ${finishFt} ft for ${raceLength} mile`);
  }
  
  // Extract ET: time at finish from timeslip
  const et_raw_s = finishEntry.t_s;
  notes.push(`ET from timeslip[${finishFt}].t_s`);
  
  // Extract MPH: trap speed from timeslip
  // This was calculated by vb6Exact using Float32 arithmetic
  const mph_raw = finishEntry.v_mph;
  notes.push(`MPH from timeslip[${finishFt}].v_mph (66-ft trap speed)`);
  
  // Debug: Verify trap calculation by finding trap start entry
  const trapStartEntry = result.timeslip.find(e => Math.abs(e.d_ft - trapStartFt) < 0.01);
  
  let t_save: number | null = null;
  let dt: number | null = null;
  let mph_formula: number | null = null;
  let mph_match = false;
  
  if (trapStartEntry) {
    t_save = trapStartEntry.t_s;
    dt = finishEntry.t_s - t_save;
    
    // Compute trap MPH using same formula as vb6Exact
    // vb6Exact.ts lines 1470-1472 (660 ft) and 1511-1513 (1320 ft)
    const tSave_f32 = f32(t_save);
    const tFin_f32 = f32(finishEntry.t_s);
    const dt_f32 = f32(tFin_f32 - tSave_f32);
    mph_formula = f32(45.0 / dt_f32);
    
    // Check if formula matches timeslip (should be identical)
    mph_match = Math.abs(mph_formula - mph_raw) < 1e-6;
    
    if (mph_match) {
      notes.push(`Trap calculation verified: formula matches timeslip`);
    } else {
      notes.push(`WARNING: formula=${mph_formula.toFixed(8)}, timeslip=${mph_raw.toFixed(8)}`);
    }
  } else {
    notes.push(`WARNING: No timeslip entry at ${trapStartFt} ft (trap start)`);
    notes.push(`Cannot verify trap calculation - using timeslip MPH as-is`);
  }
  
  // Apply VB6 display formatting pipeline
  const et_display = formatET_QP(et_raw_s);
  const mph_display = formatMPH_QP(mph_raw);
  
  const debug: QuarterProDebug = {
    finishFt,
    trapStartFt,
    t_finish: finishEntry.t_s,
    t_save,
    dt,
    mph_formula,
    mph_timeslip: mph_raw,
    mph_match,
    notes,
  };
  
  return {
    finishFt,
    et_raw_s,
    mph_raw,
    et_display,
    mph_display,
    debug,
  };
}
