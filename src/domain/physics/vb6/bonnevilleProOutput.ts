/**
 * BonnevillePro Output Extraction
 * 
 * Extracts summary ET/MPH from BonnevillePro simulation results.
 * Uses instantaneous MPH at finish distance.
 */

import type { SimResult } from '../index';

export interface BonnevilleProSummary {
  eighth_et_s: number | null;
  eighth_mph: number | null;
  thousand_et_s: number | null;
  thousand_mph: number | null;
  quarter_et_s: number | null;
  quarter_mph: number | null;
}

/**
 * Extract BonnevillePro summary ET/MPH from simulation result
 * Uses instantaneous MPH at finish distance
 */
export function extractBonnevilleProSummary(result: SimResult): BonnevilleProSummary {
  const { timeslip } = result;
  const summary: BonnevilleProSummary = {
    eighth_et_s: null,
    eighth_mph: null,
    thousand_et_s: null,
    thousand_mph: null,
    quarter_et_s: null,
    quarter_mph: null,
  };
  
  // BonnevillePro starts at t=0, no rollout offset
  const rolloutTime = 0;
  
  // Find entries at key distances
  const distances = [
    { dist: 660, et_field: 'eighth_et_s' as const, mph_field: 'eighth_mph' as const },
    { dist: 1000, et_field: 'thousand_et_s' as const, mph_field: 'thousand_mph' as const },
    { dist: 1320, et_field: 'quarter_et_s' as const, mph_field: 'quarter_mph' as const },
  ];
  
  for (const { dist, et_field, mph_field } of distances) {
    let closest = timeslip[0];
    for (const entry of timeslip) {
      if (Math.abs(entry.d_ft - dist) < Math.abs(closest.d_ft - dist)) {
        closest = entry;
      }
      if (entry.d_ft > dist + 100) break;
    }
    
    summary[et_field] = closest.t_s - rolloutTime;
    summary[mph_field] = closest.v_mph;
  }
  
  return summary;
}

/**
 * Round ET to 0.01 second (VB6 display format)
 */
export function roundET(et: number): number {
  return Math.round(et * 100) / 100;
}

/**
 * Round MPH to 0.1 mph (VB6 display format)
 */
export function roundMPH(mph: number): number {
  return Math.round(mph * 10) / 10;
}

/**
 * Format BonnevillePro summary for display (matching VB6 output)
 */
export function formatBonnevilleProSummary(summary: BonnevilleProSummary, distance: 'EIGHTH' | 'THOUSAND' | 'QUARTER'): string {
  let et: number | null = null;
  let mph: number | null = null;
  
  if (distance === 'EIGHTH') {
    et = summary.eighth_et_s;
    mph = summary.eighth_mph;
  } else if (distance === 'THOUSAND') {
    et = summary.thousand_et_s;
    mph = summary.thousand_mph;
  } else if (distance === 'QUARTER') {
    et = summary.quarter_et_s;
    mph = summary.quarter_mph;
  }
  
  if (et !== null && mph !== null) {
    const roundedET = roundET(et);
    const roundedMPH = roundMPH(mph);
    return `${roundedET.toFixed(2)} @ ${roundedMPH.toFixed(1)}`;
  }
  
  return 'N/A';
}
