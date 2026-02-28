/**
 * Tests for Weather Reliability — sanity checks, canonical source priority,
 * delta/suspect flagging, and coverage calculations.
 *
 * These mirror the PHP weatherRebuildCanonicalRange logic so that future
 * refactors can be validated client-side before deployment.
 */

import { describe, it, expect } from 'vitest';

// ── Sanity check thresholds (mirror PHP weatherRebuildCanonicalRange) ────

const SANITY = {
  TEMP_MIN: -40,
  TEMP_MAX: 140,
  RH_MIN: 0,
  RH_MAX: 100,
  PRESS_MIN_INHG: 20,
  PRESS_MAX_INHG: 35,
} as const;

const DELTA_SUSPECT = {
  TEMP: 10,       // °F
  RH: 20,         // %
  PRESS: 0.5,     // inHg
} as const;

/** TS mirror of the PHP sanity check closure */
function passesSanity(
  tempF: number | null,
  rhPct: number | null,
  pressInhg: number | null,
): boolean {
  if (tempF === null || rhPct === null || pressInhg === null) return false;
  if (tempF < SANITY.TEMP_MIN || tempF > SANITY.TEMP_MAX) return false;
  if (rhPct < SANITY.RH_MIN || rhPct > SANITY.RH_MAX) return false;
  if (pressInhg < SANITY.PRESS_MIN_INHG || pressInhg > SANITY.PRESS_MAX_INHG) return false;
  return true;
}

interface Sample {
  tempF: number | null;
  rhPct: number | null;
  pressInhg: number | null;
  source: 'station' | 'backup';
}

interface CanonicalResult {
  tempF: number | null;
  rhPct: number | null;
  pressInhg: number | null;
  sourceKind: string;
  deltaTempF: number | null;
  deltaRhPct: number | null;
  deltaPressInhg: number | null;
}

/** TS mirror of the PHP canonical selection logic for a single bucket */
function resolveCanonical(
  stationSample: Sample | null,
  backupSample: Sample | null,
): CanonicalResult | null {
  const stOk = stationSample && passesSanity(stationSample.tempF, stationSample.rhPct, stationSample.pressInhg);
  const buOk = backupSample && passesSanity(backupSample.tempF, backupSample.rhPct, backupSample.pressInhg);

  let useTempF: number | null = null;
  let useRhPct: number | null = null;
  let usePressInhg: number | null = null;
  let sourceKind = 'unknown';

  if (stOk) {
    useTempF = stationSample!.tempF;
    useRhPct = stationSample!.rhPct;
    usePressInhg = stationSample!.pressInhg;
    sourceKind = 'station';
  } else if (buOk) {
    useTempF = backupSample!.tempF;
    useRhPct = backupSample!.rhPct;
    usePressInhg = backupSample!.pressInhg;
    sourceKind = 'backup';
  } else {
    // Neither passes — use whichever available (station first)
    if (stationSample && stationSample.tempF !== null) {
      useTempF = stationSample.tempF;
      useRhPct = stationSample.rhPct;
      usePressInhg = stationSample.pressInhg;
      sourceKind = 'station_suspect';
    } else if (backupSample && backupSample.tempF !== null) {
      useTempF = backupSample.tempF;
      useRhPct = backupSample.rhPct;
      usePressInhg = backupSample.pressInhg;
      sourceKind = 'backup_suspect';
    } else {
      return null;
    }
  }

  // Compute deltas when both are sane
  let deltaTempF: number | null = null;
  let deltaRhPct: number | null = null;
  let deltaPressInhg: number | null = null;

  if (stOk && buOk) {
    deltaTempF = Math.round((stationSample!.tempF! - backupSample!.tempF!) * 100) / 100;
    deltaRhPct = Math.round((stationSample!.rhPct! - backupSample!.rhPct!) * 100) / 100;
    deltaPressInhg = Math.round((stationSample!.pressInhg! - backupSample!.pressInhg!) * 10000) / 10000;

    if (
      Math.abs(deltaTempF) > DELTA_SUSPECT.TEMP ||
      Math.abs(deltaRhPct) > DELTA_SUSPECT.RH ||
      Math.abs(deltaPressInhg) > DELTA_SUSPECT.PRESS
    ) {
      sourceKind = 'station_suspect';
    }
  }

  return { tempF: useTempF, rhPct: useRhPct, pressInhg: usePressInhg, sourceKind, deltaTempF, deltaRhPct, deltaPressInhg };
}

/** Coverage percentage calculation (mirrors PHP handleWeatherCoverage) */
function coveragePct(runsCovered: number, totalRuns: number): number | null {
  if (totalRuns === 0) return null;
  return Math.round((runsCovered / totalRuns) * 1000) / 10;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Sanity check thresholds', () => {
  it('passes for normal racing day conditions', () => {
    expect(passesSanity(76.28, 66, 29.32)).toBe(true);
  });

  it('passes at boundary minimums', () => {
    expect(passesSanity(-40, 0, 20)).toBe(true);
  });

  it('passes at boundary maximums', () => {
    expect(passesSanity(140, 100, 35)).toBe(true);
  });

  it('fails for null temperature', () => {
    expect(passesSanity(null, 66, 29.32)).toBe(false);
  });

  it('fails for null humidity', () => {
    expect(passesSanity(76, null, 29.32)).toBe(false);
  });

  it('fails for null pressure', () => {
    expect(passesSanity(76, 66, null)).toBe(false);
  });

  it('fails for temperature below minimum', () => {
    expect(passesSanity(-41, 66, 29.32)).toBe(false);
  });

  it('fails for temperature above maximum', () => {
    expect(passesSanity(141, 66, 29.32)).toBe(false);
  });

  it('fails for humidity below minimum', () => {
    expect(passesSanity(76, -1, 29.32)).toBe(false);
  });

  it('fails for humidity above maximum', () => {
    expect(passesSanity(76, 101, 29.32)).toBe(false);
  });

  it('fails for pressure below minimum', () => {
    expect(passesSanity(76, 66, 19.99)).toBe(false);
  });

  it('fails for pressure above maximum', () => {
    expect(passesSanity(76, 66, 35.01)).toBe(false);
  });
});

describe('Canonical source priority', () => {
  const goodStation: Sample = { tempF: 76, rhPct: 66, pressInhg: 29.32, source: 'station' };
  const goodBackup: Sample = { tempF: 75, rhPct: 64, pressInhg: 29.30, source: 'backup' };
  const badStation: Sample = { tempF: 200, rhPct: 66, pressInhg: 29.32, source: 'station' };
  const nullStation: Sample = { tempF: null, rhPct: null, pressInhg: null, source: 'station' };

  it('prefers station when both pass sanity', () => {
    const result = resolveCanonical(goodStation, goodBackup);
    expect(result).not.toBeNull();
    expect(result!.sourceKind).toBe('station');
    expect(result!.tempF).toBe(76);
  });

  it('falls back to backup when station fails sanity', () => {
    const result = resolveCanonical(badStation, goodBackup);
    expect(result).not.toBeNull();
    expect(result!.sourceKind).toBe('backup');
    expect(result!.tempF).toBe(75);
  });

  it('uses station as suspect when neither passes sanity and station has data', () => {
    const badBackup: Sample = { tempF: -50, rhPct: 66, pressInhg: 29.32, source: 'backup' };
    const result = resolveCanonical(badStation, badBackup);
    expect(result).not.toBeNull();
    expect(result!.sourceKind).toBe('station_suspect');
    expect(result!.tempF).toBe(200);
  });

  it('uses backup as suspect when station has null data', () => {
    const badBackup: Sample = { tempF: -50, rhPct: 66, pressInhg: 29.32, source: 'backup' };
    const result = resolveCanonical(nullStation, badBackup);
    expect(result).not.toBeNull();
    expect(result!.sourceKind).toBe('backup_suspect');
    expect(result!.tempF).toBe(-50);
  });

  it('returns null when neither source has data', () => {
    const nullBackup: Sample = { tempF: null, rhPct: null, pressInhg: null, source: 'backup' };
    const result = resolveCanonical(nullStation, nullBackup);
    expect(result).toBeNull();
  });

  it('returns null when both samples are null', () => {
    const result = resolveCanonical(null, null);
    expect(result).toBeNull();
  });

  it('uses station alone when backup is null', () => {
    const result = resolveCanonical(goodStation, null);
    expect(result).not.toBeNull();
    expect(result!.sourceKind).toBe('station');
    expect(result!.tempF).toBe(76);
  });

  it('uses backup alone when station is null', () => {
    const result = resolveCanonical(null, goodBackup);
    expect(result).not.toBeNull();
    expect(result!.sourceKind).toBe('backup');
    expect(result!.tempF).toBe(75);
  });
});

describe('Delta calculation and suspect flagging', () => {
  it('computes deltas when both station and backup pass sanity', () => {
    const station: Sample = { tempF: 76, rhPct: 66, pressInhg: 29.32, source: 'station' };
    const backup: Sample = { tempF: 75, rhPct: 64, pressInhg: 29.30, source: 'backup' };
    const result = resolveCanonical(station, backup)!;

    expect(result.deltaTempF).toBe(1);
    expect(result.deltaRhPct).toBe(2);
    expect(result.deltaPressInhg).toBe(0.02);
    expect(result.sourceKind).toBe('station'); // small deltas → not suspect
  });

  it('flags as suspect when temp delta exceeds threshold', () => {
    const station: Sample = { tempF: 90, rhPct: 66, pressInhg: 29.32, source: 'station' };
    const backup: Sample = { tempF: 75, rhPct: 66, pressInhg: 29.32, source: 'backup' };
    const result = resolveCanonical(station, backup)!;

    expect(result.deltaTempF).toBe(15);
    expect(result.sourceKind).toBe('station_suspect');
  });

  it('flags as suspect when humidity delta exceeds threshold', () => {
    const station: Sample = { tempF: 76, rhPct: 90, pressInhg: 29.32, source: 'station' };
    const backup: Sample = { tempF: 76, rhPct: 65, pressInhg: 29.32, source: 'backup' };
    const result = resolveCanonical(station, backup)!;

    expect(result.deltaRhPct).toBe(25);
    expect(result.sourceKind).toBe('station_suspect');
  });

  it('flags as suspect when pressure delta exceeds threshold', () => {
    const station: Sample = { tempF: 76, rhPct: 66, pressInhg: 30.00, source: 'station' };
    const backup: Sample = { tempF: 76, rhPct: 66, pressInhg: 29.32, source: 'backup' };
    const result = resolveCanonical(station, backup)!;

    expect(result.deltaPressInhg).toBe(0.68);
    expect(result.sourceKind).toBe('station_suspect');
  });

  it('does not flag suspect when deltas are within thresholds', () => {
    const station: Sample = { tempF: 76, rhPct: 66, pressInhg: 29.32, source: 'station' };
    const backup: Sample = { tempF: 72, rhPct: 52, pressInhg: 29.00, source: 'backup' };
    const result = resolveCanonical(station, backup)!;

    // temp delta=4 (<10), rh delta=14 (<20), press delta=0.32 (<0.5) — all within
    expect(result.sourceKind).toBe('station');
  });

  it('does not compute deltas when only station available', () => {
    const station: Sample = { tempF: 76, rhPct: 66, pressInhg: 29.32, source: 'station' };
    const result = resolveCanonical(station, null)!;

    expect(result.deltaTempF).toBeNull();
    expect(result.deltaRhPct).toBeNull();
    expect(result.deltaPressInhg).toBeNull();
  });

  it('does not compute deltas when station fails sanity', () => {
    const badStation: Sample = { tempF: 200, rhPct: 66, pressInhg: 29.32, source: 'station' };
    const backup: Sample = { tempF: 75, rhPct: 64, pressInhg: 29.30, source: 'backup' };
    const result = resolveCanonical(badStation, backup)!;

    // Falls back to backup; deltas only computed when both sane
    expect(result.deltaTempF).toBeNull();
    expect(result.sourceKind).toBe('backup');
  });

  it('exact threshold values: delta=10°F is NOT suspect', () => {
    const station: Sample = { tempF: 85, rhPct: 66, pressInhg: 29.32, source: 'station' };
    const backup: Sample = { tempF: 75, rhPct: 66, pressInhg: 29.32, source: 'backup' };
    const result = resolveCanonical(station, backup)!;

    expect(result.deltaTempF).toBe(10);
    // Exactly at threshold → NOT suspect (> not >=)
    expect(result.sourceKind).toBe('station');
  });

  it('just over threshold: delta=10.01°F IS suspect', () => {
    const station: Sample = { tempF: 85.01, rhPct: 66, pressInhg: 29.32, source: 'station' };
    const backup: Sample = { tempF: 75, rhPct: 66, pressInhg: 29.32, source: 'backup' };
    const result = resolveCanonical(station, backup)!;

    expect(Math.abs(result.deltaTempF!)).toBeGreaterThan(10);
    expect(result.sourceKind).toBe('station_suspect');
  });
});

describe('Coverage percentage calculation', () => {
  it('returns null when no runs exist', () => {
    expect(coveragePct(0, 0)).toBeNull();
  });

  it('returns 100% when all runs covered', () => {
    expect(coveragePct(50, 50)).toBe(100);
  });

  it('returns 0% when no runs covered', () => {
    expect(coveragePct(0, 50)).toBe(0);
  });

  it('calculates partial coverage correctly', () => {
    expect(coveragePct(45, 50)).toBe(90);
  });

  it('rounds to one decimal place', () => {
    expect(coveragePct(1, 3)).toBeCloseTo(33.3, 1);
  });

  it('handles single run', () => {
    expect(coveragePct(1, 1)).toBe(100);
  });
});

describe('Pressure conversion round-trip: mb → inHg → canonical', () => {
  const MB_TO_INHG = 0.02953;

  function mbToInhg(mb: number): number {
    return Math.round(mb * MB_TO_INHG * 10000) / 10000;
  }

  it('standard atmosphere: 1013.25 mb → ~29.92 inHg', () => {
    expect(mbToInhg(1013.25)).toBeCloseTo(29.92, 2);
  });

  it('low pressure: 980 mb → ~28.94 inHg', () => {
    expect(mbToInhg(980)).toBeCloseTo(28.94, 2);
  });

  it('high pressure: 1040 mb → ~30.71 inHg', () => {
    expect(mbToInhg(1040)).toBeCloseTo(30.71, 2);
  });

  it('converted value passes sanity check for normal conditions', () => {
    const pressInhg = mbToInhg(1013.25);
    expect(passesSanity(76, 66, pressInhg)).toBe(true);
  });

  it('converted value fails sanity for extreme low mb', () => {
    const pressInhg = mbToInhg(600); // ~17.7 inHg — below 20 min
    expect(passesSanity(76, 66, pressInhg)).toBe(false);
  });
});

describe('Bucket coverage: gap detection logic', () => {
  function largestGapMinutes(timestamps: number[]): { gapMinutes: number; gapAt: number | null } {
    if (timestamps.length < 2) return { gapMinutes: 0, gapAt: null };
    let maxGap = 0;
    let gapAt: number | null = null;
    for (let i = 1; i < timestamps.length; i++) {
      const gap = (timestamps[i] - timestamps[i - 1]) / 60;
      if (gap > maxGap) {
        maxGap = gap;
        gapAt = timestamps[i - 1];
      }
    }
    return { gapMinutes: maxGap, gapAt };
  }

  it('no gap when consecutive 30-minute buckets', () => {
    const ts = [0, 1800, 3600, 5400]; // 0, 30, 60, 90 minutes
    const result = largestGapMinutes(ts);
    expect(result.gapMinutes).toBe(30);
  });

  it('detects a 2-hour gap', () => {
    const ts = [0, 1800, 3600, 10800]; // gap from 3600 to 10800 = 7200s = 120 min
    const result = largestGapMinutes(ts);
    expect(result.gapMinutes).toBe(120);
    expect(result.gapAt).toBe(3600);
  });

  it('single timestamp → no gap', () => {
    expect(largestGapMinutes([1000]).gapMinutes).toBe(0);
  });

  it('empty timestamps → no gap', () => {
    expect(largestGapMinutes([]).gapMinutes).toBe(0);
  });

  it('two timestamps → gap is the distance between them', () => {
    const result = largestGapMinutes([0, 7200]);
    expect(result.gapMinutes).toBe(120);
    expect(result.gapAt).toBe(0);
  });
});

describe('Multi-bucket canonical rebuild simulation', () => {
  it('processes a sequence of buckets with mixed sources', () => {
    const buckets: { station: Sample | null; backup: Sample | null }[] = [
      { station: { tempF: 76, rhPct: 66, pressInhg: 29.32, source: 'station' }, backup: { tempF: 75, rhPct: 64, pressInhg: 29.30, source: 'backup' } },
      { station: null, backup: { tempF: 77, rhPct: 60, pressInhg: 29.28, source: 'backup' } },
      { station: { tempF: 200, rhPct: 66, pressInhg: 29.32, source: 'station' }, backup: { tempF: 78, rhPct: 58, pressInhg: 29.26, source: 'backup' } },
      { station: null, backup: null },
    ];

    const results = buckets.map(b => resolveCanonical(b.station, b.backup)).filter(r => r !== null);

    expect(results).toHaveLength(3); // 4th bucket skipped (both null)
    expect(results[0]!.sourceKind).toBe('station');         // both sane → station
    expect(results[1]!.sourceKind).toBe('backup');           // station null → backup
    expect(results[2]!.sourceKind).toBe('backup');           // station fails sanity → backup

    // Count by source
    const stationCount = results.filter(r => r!.sourceKind === 'station').length;
    const backupCount = results.filter(r => r!.sourceKind === 'backup').length;
    expect(stationCount).toBe(1);
    expect(backupCount).toBe(2);
  });

  it('tracks suspect count across buckets', () => {
    const buckets: { station: Sample | null; backup: Sample | null }[] = [
      { station: { tempF: 76, rhPct: 66, pressInhg: 29.32, source: 'station' }, backup: { tempF: 75, rhPct: 64, pressInhg: 29.30, source: 'backup' } },
      { station: { tempF: 90, rhPct: 66, pressInhg: 29.32, source: 'station' }, backup: { tempF: 75, rhPct: 64, pressInhg: 29.30, source: 'backup' } },
      { station: { tempF: 76, rhPct: 90, pressInhg: 29.32, source: 'station' }, backup: { tempF: 75, rhPct: 64, pressInhg: 29.30, source: 'backup' } },
    ];

    const results = buckets.map(b => resolveCanonical(b.station, b.backup)!);
    const suspectCount = results.filter(r => r.sourceKind.includes('suspect')).length;

    expect(results[0].sourceKind).toBe('station');            // small deltas
    expect(results[1].sourceKind).toBe('station_suspect');    // temp delta = 15°F > 10
    expect(results[2].sourceKind).toBe('station_suspect');    // rh delta = 26% > 20
    expect(suspectCount).toBe(2);
  });
});
