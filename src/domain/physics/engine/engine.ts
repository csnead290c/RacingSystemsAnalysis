/**
 * Engine torque model for RSACLASSIC physics engine.
 * Supports optional torque curves or fallback from power rating.
 */

import { lerp } from '../core/units';
import type { PowerPt } from './types';

/**
 * Engine parameters for torque calculation.
 */
export interface EngineParams {
  /**
   * Optional torque curve (RPM vs torque in lb-ft).
   * If provided, torque is interpolated from this curve.
   * If not provided, torque is calculated from powerHP.
   * Rows may have hp or tq_lbft (or both).
   */
  torqueCurve?: { rpm: number; hp?: number; tq_lbft?: number }[];
  
  /**
   * Power rating in horsepower (used if no torque curve).
   */
  powerHP?: number;
  
  /**
   * Correction factor (e.g., from weather/air density).
   * Applied to torque: tq_corrected = tq_base * corr
   */
  corr: number;
}

/**
 * Ensure we have valid PowerPt array from various input formats.
 */
function ensurePowerPts(src: any): PowerPt[] {
  const hp =
    (Array.isArray(src) ? src : src?.powerHP) ??
    src?.engineParams?.powerHP; // last-ditch tolerance

  if (!Array.isArray(hp) || hp.length < 2) {
    const keys = src && typeof src === 'object' ? Object.keys(src) : [];
    throw new Error(
      `EngineParams must provide either torqueCurve or powerHP (got keys=${JSON.stringify(keys)}, len=${hp?.length ?? 0})`
    );
  }
  return hp;
}

/**
 * Get power (HP) at RPM from power points.
 * Accepts either PowerPt[] directly or { powerHP: PowerPt[] }.
 */
export function power_hp_atRPM(rpm: number, src: PowerPt[] | { powerHP: PowerPt[] }): number {
  const pts = ensurePowerPts(src);
  // Simple linear interpolation
  if (rpm <= pts[0].rpm) return pts[0].hp;
  if (rpm >= pts[pts.length - 1].rpm) return pts[pts.length - 1].hp;
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].rpm <= rpm) lo = mid; else hi = mid;
  }
  const a = pts[lo], b = pts[hi];
  const t = (rpm - a.rpm) / (b.rpm - a.rpm);
  return a.hp + t * (b.hp - a.hp);
}

/**
 * Calculate wheel torque from power points.
 * Accepts either PowerPt[] directly or { powerHP: PowerPt[] }.
 * 
 * @param rpm - Engine RPM
 * @param src - Power points array or object containing powerHP
 * @param gearEff - Gear efficiency multiplier
 * @returns Torque in lb-ft
 */
export function wheelTorque_lbft(
  rpm: number,
  src: PowerPt[] | { powerHP: PowerPt[] } | EngineParams,
  gearEff: number
): number {
  // Check if this is the old EngineParams format
  if ('corr' in src && typeof src.corr === 'number') {
    // Legacy path: use old logic
    const p = src as EngineParams;
    let baseTorque: number;
    
    if (p.torqueCurve && p.torqueCurve.length > 0) {
      // Use torque curve
      baseTorque = interpolateTorqueCurve(rpm, p.torqueCurve);
    } else if (p.powerHP !== undefined) {
      // Fallback: calculate from power
      // tq = (HP * 5252) / rpm
      // Guard against low RPM to avoid unrealistic torque
      const safeRpm = Math.max(rpm, 1000);
      baseTorque = (p.powerHP * 5252) / safeRpm;
    } else {
      throw new Error('EngineParams must provide either torqueCurve or powerHP');
    }
    
    // Apply correction factor (e.g., air density)
    const correctedTorque = baseTorque * p.corr;
    return correctedTorque;
  }
  
  // New path: use power points directly
  const hp = power_hp_atRPM(rpm, src as PowerPt[] | { powerHP: PowerPt[] });
  // 5252 * HP / RPM = lb-ft (guard RPM)
  const tq = rpm > 0 ? (5252 * hp) / rpm : 0;
  return tq * (Number.isFinite(gearEff) ? gearEff : 1);
}

/**
 * Interpolate torque from torque curve at given RPM.
 * Uses linear interpolation between curve points.
 * Clamps to curve bounds if RPM is outside range.
 * Handles curves with hp or tq_lbft fields.
 * 
 * @param rpm - Engine RPM
 * @param curve - Torque curve points (may have hp or tq_lbft)
 * @returns Interpolated torque in lb-ft
 */
function interpolateTorqueCurve(
  rpm: number,
  curve: { rpm: number; hp?: number; tq_lbft?: number }[]
): number {
  // Convert curve to tq_lbft if needed
  const tqCurve = curve.map((p) => {
    if (p.tq_lbft !== undefined) {
      return { rpm: p.rpm, tq_lbft: p.tq_lbft };
    } else if (p.hp !== undefined && p.rpm > 0) {
      return { rpm: p.rpm, tq_lbft: (p.hp * 5252) / p.rpm };
    } else {
      throw new Error(`Invalid torque curve point: ${JSON.stringify(p)}`);
    }
  });
  
  // Sort curve by RPM (in case not sorted)
  const sorted = [...tqCurve].sort((a, b) => a.rpm - b.rpm);
  
  // Clamp to curve bounds
  if (rpm <= sorted[0].rpm) {
    return sorted[0].tq_lbft;
  }
  if (rpm >= sorted[sorted.length - 1].rpm) {
    return sorted[sorted.length - 1].tq_lbft;
  }
  
  // Find surrounding points
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    
    if (rpm >= p1.rpm && rpm <= p2.rpm) {
      // Linear interpolation
      const t = (rpm - p1.rpm) / (p2.rpm - p1.rpm);
      return lerp(p1.tq_lbft, p2.tq_lbft, t);
    }
  }
  
  // Should never reach here, but return last point as fallback
  return sorted[sorted.length - 1].tq_lbft;
}

/**
 * Calculate peak power from torque curve.
 * 
 * @param curve - Torque curve points
 * @returns Peak power in HP and RPM where it occurs
 */
export function peakPowerFromCurve(
  curve: { rpm: number; tq_lbft: number }[]
): { hp: number; rpm: number } {
  let maxHP = 0;
  let maxRPM = 0;
  
  for (const point of curve) {
    // HP = (torque * rpm) / 5252
    const hp = (point.tq_lbft * point.rpm) / 5252;
    if (hp > maxHP) {
      maxHP = hp;
      maxRPM = point.rpm;
    }
  }
  
  return { hp: maxHP, rpm: maxRPM };
}

/**
 * Calculate peak torque from torque curve.
 * 
 * @param curve - Torque curve points
 * @returns Peak torque in lb-ft and RPM where it occurs
 */
export function peakTorqueFromCurve(
  curve: { rpm: number; tq_lbft: number }[]
): { tq_lbft: number; rpm: number } {
  let maxTQ = 0;
  let maxRPM = 0;
  
  for (const point of curve) {
    if (point.tq_lbft > maxTQ) {
      maxTQ = point.tq_lbft;
      maxRPM = point.rpm;
    }
  }
  
  return { tq_lbft: maxTQ, rpm: maxRPM };
}
