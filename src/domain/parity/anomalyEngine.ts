/**
 * Anomaly Engine — Deterministic timing-data confidence and anomaly detection
 *
 * Computes per-run and per-field confidence scores using three layers:
 *   Layer 1: Hard integrity checks (missing splits, non-monotonic, invalid intervals)
 *   Layer 2: Local shape / adjacent-split consistency
 *   Layer 3: Historical baseline comparison (robust stats, hierarchical peers)
 *
 * All scoring is explainable — every deduction traces to a structured reason flag.
 *
 * IMPORTANT: Historical baselines exclude runs that fail hard integrity checks
 * and off-pace runs to prevent "learning bad data as normal."
 *
 * NITRO CLASS CONVENTION:
 * Top Fuel and Funny Car run to 1000 ft, not 1320 ft. The timing system often
 * reports the effective finish time/mph in the ft1320/mph1320 fields with ft1000
 * blank. This is a known convention, NOT corrupt data. The engine normalizes
 * this via an "effective finish" model so every class uses:
 *   early segments → 660–finish → finish ET → finish MPH
 */

import type { ParityRun } from '../../services/parityApi';

// ── Nitro Class Detection ────────────────────────────────────────────────

/** Categories that run to 1000 ft with timing reported in 1320 fields */
const NITRO_CATEGORIES = ['Top Fuel', 'Funny Car'] as const;
const NITRO_CLASS_INDICES = ['TF', 'FC', 'TFD'] as const;

export function isNitroClass(run: ParityRun): boolean {
  const cat = run.category?.trim() ?? '';
  const cls = run.class_index?.trim().toUpperCase() ?? '';
  return (NITRO_CATEGORIES as readonly string[]).includes(cat)
      || (NITRO_CLASS_INDICES as readonly string[]).includes(cls);
}

// ── Normalized Finish Model ──────────────────────────────────────────────

export interface NormalizedFinish {
  effectiveFinishDistance: 1000 | 1320;
  effectiveFinishTime: number | null;   // from the populated final ET field
  effectiveFinishMph: number | null;    // from the populated final MPH field
  finishTimeField: string;              // raw field name used (ft1000 or ft1320)
  finishMphField: string;               // raw field name used (mph1000 or mph1320)
  isNitro: boolean;
}

export function resolveFinish(run: ParityRun): NormalizedFinish {
  const nitro = isNitroClass(run);
  const g = (f: keyof ParityRun) => {
    const v = run[f];
    return typeof v === 'number' && v > 0 ? v : null;
  };

  if (nitro) {
    // Nitro: effective finish is 1000 ft.
    // Timing system convention: final time/mph often in ft1320/mph1320 fields.
    // Use ft1000/mph1000 if populated, otherwise fall back to ft1320/mph1320.
    const ft1000 = g('ft1000');
    const mph1000 = g('mph1000');
    const ft1320 = g('ft1320');
    const mph1320 = g('mph1320');

    // If ft1000 is populated, use it directly
    if (ft1000 !== null) {
      return {
        effectiveFinishDistance: 1000,
        effectiveFinishTime: ft1000,
        effectiveFinishMph: mph1000 ?? mph1320,
        finishTimeField: 'ft1000',
        finishMphField: mph1000 !== null ? 'mph1000' : 'mph1320',
        isNitro: true,
      };
    }
    // Convention: ft1320 holds the 1000-ft finish time
    return {
      effectiveFinishDistance: 1000,
      effectiveFinishTime: ft1320,
      effectiveFinishMph: mph1320,
      finishTimeField: 'ft1320',
      finishMphField: 'mph1320',
      isNitro: true,
    };
  }

  // Full-quarter classes: standard 1320 ft
  return {
    effectiveFinishDistance: 1320,
    effectiveFinishTime: g('ft1320'),
    effectiveFinishMph: g('mph1320'),
    finishTimeField: 'ft1320',
    finishMphField: 'mph1320',
    isNitro: false,
  };
}

// ── Timing Fields ────────────────────────────────────────────────────────

/** Cumulative split fields in order (track distance progression) */
export const CUMULATIVE_FIELDS = ['ft60', 'ft330', 'ft660', 'ft1000', 'ft1320'] as const;
export type CumulativeField = typeof CUMULATIVE_FIELDS[number];

/** Speed fields */
export const SPEED_FIELDS = ['mph660', 'mph1320'] as const;
export type SpeedField = typeof SPEED_FIELDS[number];

/** All timing fields we analyze */
export const TIMING_FIELDS = [...CUMULATIVE_FIELDS, ...SPEED_FIELDS, 'rt'] as const;
export type TimingField = typeof TIMING_FIELDS[number];

/** Full-quarter interval segments */
const INTERVAL_SEGMENTS_FULL = [
  { key: 't_0_60',      label: '0–60 ft',     from: null,     to: 'ft60'   },
  { key: 't_60_330',     label: '60–330 ft',   from: 'ft60',   to: 'ft330'  },
  { key: 't_330_660',    label: '330–660 ft',  from: 'ft330',  to: 'ft660'  },
  { key: 't_660_1000',   label: '660–1000 ft', from: 'ft660',  to: 'ft1000' },
  { key: 't_1000_1320',  label: '1000–ET',     from: 'ft1000', to: 'ft1320' },
] as const;

/** Nitro class interval segments — uses 660–finish instead of 660–1000/1000–1320 */
const INTERVAL_SEGMENTS_NITRO = [
  { key: 't_0_60',        label: '0–60 ft',       from: null,    to: 'ft60'  },
  { key: 't_60_330',      label: '60–330 ft',     from: 'ft60',  to: 'ft330' },
  { key: 't_330_660',     label: '330–660 ft',    from: 'ft330', to: 'ft660' },
  { key: 't_660_finish',  label: '660–Finish',    from: 'ft660', to: '_finish' },
] as const;

export type IntervalSegment = { key: string; label: string; from: string | null; to: string };

/** Get the applicable interval segments for a run */
export function getIntervalSegments(run: ParityRun): IntervalSegment[] {
  return isNitroClass(run)
    ? INTERVAL_SEGMENTS_NITRO as unknown as IntervalSegment[]
    : INTERVAL_SEGMENTS_FULL as unknown as IntervalSegment[];
}

/** Default export for backward compat — full-quarter segments */
export const INTERVAL_SEGMENTS = INTERVAL_SEGMENTS_FULL;
export type IntervalKey = string;

// ── Reason Codes ─────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReasonCode =
  // Layer 1: Hard integrity
  | 'MISSING_SPLIT_VALUE'
  | 'ZERO_OR_NEGATIVE_TIMING'
  | 'NON_MONOTONIC_SPLITS'
  | 'INVALID_INTERVAL'
  | 'DUPLICATE_SPLIT_VALUES'
  | 'ET_LESS_THAN_SPLIT'
  // Layer 2: Shape consistency
  | 'SEGMENT_SHAPE_INCONSISTENT'
  | 'MPH_ET_INCONSISTENT'
  | 'ISOLATED_SPLIT_SUSPECT'
  // Layer 3: Historical baseline
  | 'OUTLIER_FIELD'
  | 'OUTLIER_INTERVAL'
  | 'PLAUSIBLE_PERFORMANCE_OUTLIER'
  // Baseline quality
  | 'BASELINE_SAMPLE_TOO_SMALL'
  | 'BASELINE_QUALITY_WEAK'
  // Off-pace / representative
  | 'OFF_PACE_RUN'
  // Composite
  | 'PROBABLE_TIMING_ISSUE'
  | 'INCOMPLETE_RUN_DATA';

export interface ReasonFlag {
  code: ReasonCode;
  severity: Severity;
  field?: string;          // which field or segment is affected
  explanation: string;     // human-readable short description
  value?: number;          // the observed value
  expected?: string;       // what was expected (range or threshold)
  zScore?: number;         // how far from baseline (if applicable)
}

// ── Confidence Bands ─────────────────────────────────────────────────────

export type ConfidenceBand = 'High' | 'Medium' | 'Low' | 'Critical';

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 80) return 'High';
  if (score >= 55) return 'Medium';
  if (score >= 30) return 'Low';
  return 'Critical';
}

export const BAND_COLORS: Record<ConfidenceBand, string> = {
  High:     '#27ae60',
  Medium:   '#f39c12',
  Low:      '#e67e22',
  Critical: '#c0392b',
};

// ── Per-Field Confidence ─────────────────────────────────────────────────

export interface FieldConfidence {
  field: string;
  score: number;           // 0–100
  band: ConfidenceBand;
  flags: ReasonFlag[];
}

// ── Baseline Quality ─────────────────────────────────────────────────────

export type BaselineScope =
  | 'combo+category+event'
  | 'combo+category'
  | 'category+event'
  | 'category'
  | 'none';

export type BaselineQuality = 'strong' | 'moderate' | 'weak' | 'none';

export interface BaselineInfo {
  scope: BaselineScope;
  sampleSize: number;
  quality: BaselineQuality;
  hardFailsExcluded: number;
  warning?: string;
}

// ── Derived Intervals ────────────────────────────────────────────────────

export interface DerivedIntervals {
  t_0_60:      number | null;
  t_60_330:    number | null;
  t_330_660:   number | null;
  t_660_1000:  number | null;
  t_1000_1320: number | null;
  t_660_finish: number | null;
  [key: string]: number | null;
}

export function computeIntervals(run: ParityRun): DerivedIntervals {
  const g = (f: keyof ParityRun) => {
    const v = run[f];
    return typeof v === 'number' && v > 0 ? v : null;
  };
  const sub = (a: number | null, b: number | null) =>
    a !== null && b !== null && a > b ? +(a - b).toFixed(6) : null;

  const finish = resolveFinish(run);

  return {
    t_0_60:       g('ft60'),
    t_60_330:     sub(g('ft330'), g('ft60')),
    t_330_660:    sub(g('ft660'), g('ft330')),
    t_660_1000:   sub(g('ft1000'), g('ft660')),
    t_1000_1320:  sub(g('ft1320'), g('ft1000')),
    t_660_finish: sub(finish.effectiveFinishTime, g('ft660')),
  };
}

// ── Run Analysis Result ──────────────────────────────────────────────────

export type RunClassification =
  | 'clean'
  | 'unusual_but_plausible'
  | 'isolated_suspicious_increment'
  | 'probable_timing_issue'
  | 'incomplete_record'
  | 'review_recommended';

export interface RunAnomalyResult {
  runId: number;
  runUuid: string;
  overallScore: number;        // 0–100
  band: ConfidenceBand;
  classification: RunClassification;
  flagCount: number;
  suspectFields: string[];
  primaryReasonCode: ReasonCode | null;
  primaryReasonText: string;
  flags: ReasonFlag[];
  fieldScores: FieldConfidence[];
  intervals: DerivedIntervals;
  baseline: BaselineInfo;
  narrative: string;
  finish: NormalizedFinish;
  representativeRun: boolean;
  representativeRunReason: string | null;
  excludedFromBaseline: boolean;
  baselineExclusionReason: string | null;
}

// ── Batch Analysis Result ────────────────────────────────────────────────

export interface AnomalySummary {
  runsAnalyzed: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  criticalCount: number;
  baselineExcluded: number;
  representativeCount: number;
  offPaceCount: number;
  mostFlaggedField: string | null;
  mostFlaggedFieldCount: number;
}

export interface AnomalyBatchResult {
  summary: AnomalySummary;
  runs: RunAnomalyResult[];
}

// ══════════════════════════════════════════════════════════════════════════
// ROBUST STATISTICS
// ══════════════════════════════════════════════════════════════════════════

/** Median of a sorted numeric array */
function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sorted[Math.floor(n / 2)];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/** Median Absolute Deviation */
function mad(values: number[]): { median: number; mad: number } {
  if (values.length === 0) return { median: 0, mad: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const med = median(sorted);
  const deviations = sorted.map(v => Math.abs(v - med)).sort((a, b) => a - b);
  return { median: med, mad: median(deviations) };
}

/** IQR-based bounds */
function iqrBounds(values: number[], k = 1.5): { q1: number; q3: number; lower: number; upper: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  return { q1, q3, lower: q1 - k * iqr, upper: q3 + k * iqr };
}

/** Modified z-score using MAD (more robust than mean/stddev) */
function modifiedZScore(value: number, med: number, madVal: number): number {
  // 0.6745 is the 0.75th quantile of the standard normal distribution
  if (madVal === 0) return 0;
  return 0.6745 * (value - med) / madVal;
}

// ══════════════════════════════════════════════════════════════════════════
// LAYER 1: HARD INTEGRITY CHECKS
// ══════════════════════════════════════════════════════════════════════════

function layer1HardIntegrity(run: ParityRun, intervals: DerivedIntervals): ReasonFlag[] {
  const flags: ReasonFlag[] = [];
  const nitro = isNitroClass(run);
  const finish = resolveFinish(run);
  const g = (f: keyof ParityRun): number | null => {
    const v = run[f];
    return typeof v === 'number' ? v : null;
  };

  // ── Missing split values (later splits exist but earlier ones are missing) ──
  // For nitro: expected chain is ft60→ft330→ft660→finish (ft1000 blank is OK)
  // For quarter: expected chain is ft60→ft330→ft660→ft1000→ft1320
  const expectedChain: CumulativeField[] = nitro
    ? ['ft60', 'ft330', 'ft660']  // ft1000 allowed blank for nitro
    : ['ft60', 'ft330', 'ft660', 'ft1000', 'ft1320'];

  const splits: { field: CumulativeField; val: number | null }[] = expectedChain.map(f => ({
    field: f, val: g(f),
  }));
  let lastPresent = -1;
  for (let i = splits.length - 1; i >= 0; i--) {
    if (splits[i].val !== null) { lastPresent = i; break; }
  }
  // Also check if the effective finish is present (beyond the chain)
  if (finish.effectiveFinishTime !== null && lastPresent < 0) lastPresent = 0;
  if (lastPresent > 0) {
    for (let i = 0; i < lastPresent; i++) {
      if (splits[i].val === null) {
        flags.push({
          code: 'MISSING_SPLIT_VALUE',
          severity: 'high',
          field: splits[i].field,
          explanation: `${splits[i].field} is missing but later splits exist`,
        });
      }
    }
  }

  // ── Zero or negative timing values ──
  for (const f of TIMING_FIELDS) {
    const v = g(f);
    if (v !== null && v <= 0 && f !== 'rt') {
      flags.push({
        code: 'ZERO_OR_NEGATIVE_TIMING',
        severity: 'critical',
        field: f,
        value: v,
        explanation: `${f} = ${v} is zero or negative`,
      });
    }
  }

  // ── Non-monotonic cumulative splits ──
  // For nitro: only check pairs that exist in the expected chain + finish
  const pairs: [string, string][] = nitro
    ? [['ft60', 'ft330'], ['ft330', 'ft660']]
    : [['ft60', 'ft330'], ['ft330', 'ft660'], ['ft660', 'ft1000'], ['ft1000', 'ft1320']];
  // For nitro, also check ft660 < finish if finish is populated
  if (nitro && finish.effectiveFinishTime !== null && g('ft660') !== null) {
    const ft660 = g('ft660')!;
    if (finish.effectiveFinishTime <= ft660) {
      flags.push({
        code: 'NON_MONOTONIC_SPLITS',
        severity: 'critical',
        field: finish.finishTimeField,
        value: finish.effectiveFinishTime,
        expected: `> ${ft660} (ft660)`,
        explanation: `Finish time (${finish.effectiveFinishTime}) in ${finish.finishTimeField} is not greater than ft660 (${ft660})`,
      });
    }
  }
  for (const [earlier, later] of pairs) {
    const vE = g(earlier as keyof ParityRun);
    const vL = g(later as keyof ParityRun);
    if (vE !== null && vL !== null && vL <= vE) {
      flags.push({
        code: 'NON_MONOTONIC_SPLITS',
        severity: 'critical',
        field: later,
        value: vL,
        expected: `> ${vE} (${earlier})`,
        explanation: `${later} (${vL}) is not greater than ${earlier} (${vE})`,
      });
    }
  }

  // ── Invalid derived intervals (negative or zero) ──
  const segments = getIntervalSegments(run);
  for (const seg of segments) {
    const v = intervals[seg.key];
    if (v !== null && v <= 0) {
      flags.push({
        code: 'INVALID_INTERVAL',
        severity: 'critical',
        field: seg.key,
        value: v,
        explanation: `Interval ${seg.label} = ${v.toFixed(4)}s is not positive`,
      });
    }
  }

  // ── Duplicate suspicious split values ──
  // Use the expected chain + finish field for duplicate check
  const dupFields: { field: string; val: number | null }[] = expectedChain.map(f => ({
    field: f, val: g(f),
  }));
  if (finish.effectiveFinishTime !== null) {
    dupFields.push({ field: finish.finishTimeField, val: finish.effectiveFinishTime });
  }
  const presentSplits = dupFields.filter(s => s.val !== null);
  for (let i = 0; i < presentSplits.length; i++) {
    for (let j = i + 1; j < presentSplits.length; j++) {
      if (presentSplits[i].val === presentSplits[j].val && presentSplits[i].field !== presentSplits[j].field) {
        flags.push({
          code: 'DUPLICATE_SPLIT_VALUES',
          severity: 'high',
          field: `${presentSplits[i].field}/${presentSplits[j].field}`,
          value: presentSplits[i].val!,
          explanation: `${presentSplits[i].field} and ${presentSplits[j].field} have identical values (${presentSplits[i].val})`,
        });
      }
    }
  }

  // ── Incomplete run: missing finish ET or nearly all splits ──
  if (finish.effectiveFinishTime === null && g('ft60') === null) {
    flags.push({
      code: 'INCOMPLETE_RUN_DATA',
      severity: 'medium',
      explanation: 'Run has no timing data (no 60 ft, no finish ET)',
    });
  } else if (finish.effectiveFinishTime === null) {
    flags.push({
      code: 'INCOMPLETE_RUN_DATA',
      severity: 'medium',
      explanation: 'Run has no finish ET — likely an aborted or partial run',
    });
  }

  return flags;
}

// ══════════════════════════════════════════════════════════════════════════
// LAYER 2: LOCAL SHAPE / ADJACENT-SPLIT CONSISTENCY
// ══════════════════════════════════════════════════════════════════════════

function layer2ShapeConsistency(run: ParityRun, intervals: DerivedIntervals): ReasonFlag[] {
  const flags: ReasonFlag[] = [];
  const segments = getIntervalSegments(run);

  // Collect present intervals using class-aware segments
  const present: { key: string; val: number; label: string }[] = [];
  for (const seg of segments) {
    const v = intervals[seg.key];
    if (v !== null && v > 0) present.push({ key: seg.key, val: v, label: seg.label });
  }

  if (present.length < 3) return flags; // not enough data for shape analysis

  // ── Check each interval against neighbors for wild inconsistency ──
  const nitro = isNitroClass(run);
  for (let i = 0; i < present.length; i++) {
    // Skip shape ratio for nitro's final segment — the 660→finish gap is
    // structurally much shorter than earlier segments (1000 ft race vs 1320 ft)
    if (nitro && present[i].key === 't_660_finish') continue;

    const neighbors: number[] = [];
    if (i > 0 && !(nitro && present[i - 1].key === 't_660_finish')) neighbors.push(present[i - 1].val);
    if (i < present.length - 1 && !(nitro && present[i + 1].key === 't_660_finish')) neighbors.push(present[i + 1].val);
    if (neighbors.length === 0) continue;

    const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
    const ratio = present[i].val / avgNeighbor;

    if (ratio > 3.0 || ratio < 0.15) {
      flags.push({
        code: 'SEGMENT_SHAPE_INCONSISTENT',
        severity: 'high',
        field: present[i].key,
        value: present[i].val,
        expected: `~${avgNeighbor.toFixed(4)}s based on adjacent segments`,
        explanation: `${present[i].label} (${present[i].val.toFixed(4)}s) is ${ratio.toFixed(1)}x the average of adjacent segments — likely isolated timing error`,
      });
    } else if (ratio > 2.2 || ratio < 0.25) {
      flags.push({
        code: 'SEGMENT_SHAPE_INCONSISTENT',
        severity: 'medium',
        field: present[i].key,
        value: present[i].val,
        expected: `~${avgNeighbor.toFixed(4)}s based on adjacent segments`,
        explanation: `${present[i].label} (${present[i].val.toFixed(4)}s) is ${ratio.toFixed(1)}x the average of adjacent segments — somewhat unusual`,
      });
    }
  }

  // ── mph vs ET consistency ──
  // Use normalized finish model: compare 660 mph to finish mph
  const finish = resolveFinish(run);
  const mph660 = typeof run.mph660 === 'number' ? run.mph660 : null;
  const finishMph = finish.effectiveFinishMph;
  if (mph660 !== null && finishMph !== null && mph660 > 0 && finishMph > 0) {
    // For full-quarter: finish mph should generally be >= 660 mph
    // For nitro: finish mph is at 1000 ft, so may be >= 660 mph (still accelerating)
    // Flag only if dramatically less (>50% drop) — could be valid shutoff
    if (finishMph < mph660 * 0.5) {
      flags.push({
        code: 'MPH_ET_INCONSISTENT',
        severity: 'medium',
        field: finish.finishMphField,
        value: finishMph,
        expected: `>= ~${(mph660 * 0.7).toFixed(1)} mph based on 660 mph`,
        explanation: `Finish mph (${finishMph.toFixed(1)}) is less than half of 660 mph (${mph660.toFixed(1)}) — possible timing/recording issue or mid-track shutoff`,
      });
    }
  }

  return flags;
}

// ══════════════════════════════════════════════════════════════════════════
// LAYER 3: HISTORICAL BASELINE COMPARISON
// ══════════════════════════════════════════════════════════════════════════

interface BaselineStats {
  field: string;
  median: number;
  mad: number;
  q1: number;
  q3: number;
  lower: number;  // IQR lower bound
  upper: number;  // IQR upper bound
  n: number;
}

/** Build baselines from a clean population (hard-fail, medium-suspect, and off-pace runs excluded) */
function buildBaselines(cleanRuns: ParityRun[]): Map<string, BaselineStats> {
  const stats = new Map<string, BaselineStats>();

  // Build baselines for each timing field — require min 5 samples for robustness
  for (const f of TIMING_FIELDS) {
    const values = cleanRuns
      .map(r => r[f as keyof ParityRun])
      .filter((v): v is number => typeof v === 'number' && v > 0);
    if (values.length < 5) continue;

    const m = mad(values);
    const bounds = iqrBounds(values, 2.0); // 2x IQR for wider tolerance
    stats.set(f, {
      field: f,
      median: m.median,
      mad: m.mad,
      ...bounds,
      n: values.length,
    });
  }

  // Build baselines for ALL interval keys (both full-quarter and nitro)
  // This ensures t_660_finish baseline is built alongside t_660_1000 / t_1000_1320
  const allKeys = new Set<string>();
  for (const seg of INTERVAL_SEGMENTS_FULL) allKeys.add(seg.key);
  for (const seg of INTERVAL_SEGMENTS_NITRO) allKeys.add(seg.key);

  const allIntervals = cleanRuns.map(r => computeIntervals(r));
  const allSegments = [...INTERVAL_SEGMENTS_FULL, ...INTERVAL_SEGMENTS_NITRO];
  const seenKeys = new Set<string>();
  for (const seg of allSegments) {
    if (seenKeys.has(seg.key)) continue;
    seenKeys.add(seg.key);
    const values = allIntervals
      .map(iv => (iv as Record<string, number | null>)[seg.key])
      .filter((v): v is number => v !== null && v > 0);
    if (values.length < 5) continue;

    const m = mad(values);
    const bounds = iqrBounds(values, 2.0);
    stats.set(seg.key, {
      field: seg.key,
      median: m.median,
      mad: m.mad,
      ...bounds,
      n: values.length,
    });
  }

  return stats;
}

/** Select peer population using hierarchical fallback */
function selectPeers(
  targetRun: ParityRun,
  allRuns: ParityRun[],
  cleanRunIds: Set<number>,
): { peers: ParityRun[]; scope: BaselineScope } {
  // Extract peer dimensions from the target run
  const combo = resolveCombo(targetRun);
  const category = targetRun.category;
  const raceLookup = targetRun.race_lookup;

  // Filter to only clean runs (excluding target run itself)
  const clean = allRuns.filter(r => r.id !== targetRun.id && cleanRunIds.has(r.id));

  // Hierarchy: combo+category+event → combo+category → category+event → category
  if (combo && category && raceLookup) {
    const peers = clean.filter(r => resolveCombo(r) === combo && r.category === category && r.race_lookup === raceLookup);
    if (peers.length >= 5) return { peers, scope: 'combo+category+event' };
  }
  if (combo && category) {
    const peers = clean.filter(r => resolveCombo(r) === combo && r.category === category);
    if (peers.length >= 5) return { peers, scope: 'combo+category' };
  }
  if (category && raceLookup) {
    const peers = clean.filter(r => r.category === category && r.race_lookup === raceLookup);
    if (peers.length >= 5) return { peers, scope: 'category+event' };
  }
  if (category) {
    const peers = clean.filter(r => r.category === category);
    if (peers.length >= 3) return { peers, scope: 'category' };
  }

  return { peers: [], scope: 'none' };
}

/** Resolve combo string from run (driver-based or class-based) */
function resolveCombo(run: ParityRun): string | null {
  // Use driver_name + class_index as a proxy for "combo"
  // This matches how the parity system groups runs
  if (run.driver_name && run.class_index) {
    return `${run.driver_name}|${run.class_index}`;
  }
  if (run.driver_name) return run.driver_name;
  return null;
}

function layer3HistoricalBaseline(
  run: ParityRun,
  intervals: DerivedIntervals,
  baselines: Map<string, BaselineStats>,
  baselineInfo: BaselineInfo,
): ReasonFlag[] {
  const flags: ReasonFlag[] = [];
  if (baselineInfo.quality === 'none') return flags;

  // Reduce severity for weak baselines
  const sev = (base: Severity): Severity => {
    if (baselineInfo.quality === 'weak') {
      if (base === 'high') return 'medium';
      if (base === 'medium') return 'low';
    }
    return base;
  };

  // Check each timing field against baseline
  for (const f of TIMING_FIELDS) {
    const v = run[f as keyof ParityRun];
    if (typeof v !== 'number' || v <= 0) continue;
    const bl = baselines.get(f);
    if (!bl) continue;

    const z = modifiedZScore(v, bl.median, bl.mad);
    const absZ = Math.abs(z);

    if (absZ > 5.0) {
      flags.push({
        code: 'OUTLIER_FIELD',
        severity: sev('high'),
        field: f,
        value: v,
        zScore: +z.toFixed(2),
        expected: `${bl.lower.toFixed(4)}–${bl.upper.toFixed(4)} (median ${bl.median.toFixed(4)}, n=${bl.n})`,
        explanation: `${f} = ${v} is a strong outlier (z=${z.toFixed(1)}) vs ${baselineInfo.scope} peers`,
      });
    } else if (absZ > 3.5) {
      flags.push({
        code: 'OUTLIER_FIELD',
        severity: sev('medium'),
        field: f,
        value: v,
        zScore: +z.toFixed(2),
        expected: `${bl.lower.toFixed(4)}–${bl.upper.toFixed(4)} (median ${bl.median.toFixed(4)}, n=${bl.n})`,
        explanation: `${f} = ${v} is an outlier (z=${z.toFixed(1)}) vs ${baselineInfo.scope} peers`,
      });
    }
  }

  // Check derived intervals against baseline — use class-aware segments
  const segments = getIntervalSegments(run);
  for (const seg of segments) {
    const v = intervals[seg.key];
    if (v === null || v <= 0) continue;
    const bl = baselines.get(seg.key);
    if (!bl) continue;

    const z = modifiedZScore(v, bl.median, bl.mad);
    const absZ = Math.abs(z);

    if (absZ > 5.0) {
      flags.push({
        code: 'OUTLIER_INTERVAL',
        severity: sev('high'),
        field: seg.key,
        value: v,
        zScore: +z.toFixed(2),
        expected: `${bl.lower.toFixed(4)}–${bl.upper.toFixed(4)} (median ${bl.median.toFixed(4)}, n=${bl.n})`,
        explanation: `Interval ${seg.label} = ${v.toFixed(4)}s is a strong outlier (z=${z.toFixed(1)}) vs peers`,
      });
    } else if (absZ > 3.5) {
      flags.push({
        code: 'OUTLIER_INTERVAL',
        severity: sev('medium'),
        field: seg.key,
        value: v,
        zScore: +z.toFixed(2),
        expected: `${bl.lower.toFixed(4)}–${bl.upper.toFixed(4)} (median ${bl.median.toFixed(4)}, n=${bl.n})`,
        explanation: `Interval ${seg.label} = ${v.toFixed(4)}s is an outlier (z=${z.toFixed(1)}) vs peers`,
      });
    }
  }

  return flags;
}

// ══════════════════════════════════════════════════════════════════════════
// SCORING
// ══════════════════════════════════════════════════════════════════════════

/** Penalty weights by severity */
const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 25,
  high:     15,
  medium:    8,
  low:       3,
  info:      0,
};

function computeOverallScore(flags: ReasonFlag[]): number {
  let score = 100;
  for (const f of flags) {
    score -= SEVERITY_PENALTY[f.severity];
  }
  return Math.max(0, Math.min(100, score));
}

function computeFieldScores(flags: ReasonFlag[]): FieldConfidence[] {
  // Collect all fields mentioned in flags
  const fieldMap = new Map<string, ReasonFlag[]>();

  // Initialize all timing fields + intervals
  for (const f of TIMING_FIELDS) fieldMap.set(f, []);
  for (const seg of INTERVAL_SEGMENTS) fieldMap.set(seg.key, []);

  for (const flag of flags) {
    if (flag.field) {
      // Handle composite fields like "ft60/ft330"
      const parts = flag.field.split('/');
      for (const p of parts) {
        if (!fieldMap.has(p)) fieldMap.set(p, []);
        fieldMap.get(p)!.push(flag);
      }
    }
  }

  const results: FieldConfidence[] = [];
  for (const [field, fieldFlags] of fieldMap) {
    let score = 100;
    for (const f of fieldFlags) {
      score -= SEVERITY_PENALTY[f.severity];
    }
    score = Math.max(0, Math.min(100, score));
    results.push({
      field,
      score,
      band: confidenceBand(score),
      flags: fieldFlags,
    });
  }

  return results.filter(r => r.flags.length > 0 || r.score < 100);
}

// ══════════════════════════════════════════════════════════════════════════
// NARRATIVE GENERATION
// ══════════════════════════════════════════════════════════════════════════

function generateNarrative(result: Omit<RunAnomalyResult, 'narrative'>): string {
  const parts: string[] = [];

  if (result.band === 'High') {
    parts.push('Run data appears consistent and reliable.');
    if (result.flags.length > 0) {
      parts.push(`${result.flags.length} minor note(s) found.`);
    }
    return parts.join(' ');
  }

  // Critical / Low
  const hardFails = result.flags.filter(f =>
    ['MISSING_SPLIT_VALUE', 'NON_MONOTONIC_SPLITS', 'INVALID_INTERVAL', 'ZERO_OR_NEGATIVE_TIMING', 'DUPLICATE_SPLIT_VALUES'].includes(f.code)
  );
  const shapeIssues = result.flags.filter(f =>
    ['SEGMENT_SHAPE_INCONSISTENT', 'MPH_ET_INCONSISTENT', 'ISOLATED_SPLIT_SUSPECT'].includes(f.code)
  );
  const outliers = result.flags.filter(f =>
    ['OUTLIER_FIELD', 'OUTLIER_INTERVAL'].includes(f.code)
  );

  if (hardFails.length > 0) {
    parts.push(`${hardFails.length} integrity issue(s) detected: probable timing-data problem.`);
  }

  // Identify if issue is isolated to specific splits
  const suspectFieldSet = new Set(result.suspectFields);
  if (suspectFieldSet.size === 1) {
    const field = result.suspectFields[0];
    const segLabel = INTERVAL_SEGMENTS.find(s => s.key === field)?.label || field;
    parts.push(`Issue appears isolated to ${segLabel}.`);
    // Check if rest of run looks ok
    const otherFieldScores = result.fieldScores.filter(f => f.field !== field && !f.field.includes(field));
    const otherOk = otherFieldScores.every(f => f.score >= 70);
    if (otherOk) {
      parts.push('Rest of the run appears normal.');
    }
  } else if (suspectFieldSet.size > 1 && suspectFieldSet.size <= 3) {
    parts.push(`Suspect fields: ${result.suspectFields.join(', ')}.`);
  } else if (shapeIssues.length > 0 || outliers.length > 0) {
    parts.push('Multiple timing fields show unusual values.');
  }

  if (outliers.length > 0 && hardFails.length === 0 && shapeIssues.length === 0) {
    parts.push('Run is unusual but may reflect genuine performance rather than timing error.');
  }

  // Baseline quality caveat
  if (result.baseline.quality === 'weak') {
    parts.push('Historical baseline is weak — outlier confidence is reduced.');
  } else if (result.baseline.quality === 'none') {
    parts.push('No historical baseline available for comparison.');
  }

  return parts.join(' ') || 'Run analyzed with no specific findings.';
}

// ══════════════════════════════════════════════════════════════════════════
// CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════════

const HARD_INTEGRITY_CODES: ReasonCode[] = [
  'MISSING_SPLIT_VALUE', 'NON_MONOTONIC_SPLITS', 'INVALID_INTERVAL',
  'ZERO_OR_NEGATIVE_TIMING', 'DUPLICATE_SPLIT_VALUES', 'ET_LESS_THAN_SPLIT',
];

const SHAPE_CODES: ReasonCode[] = [
  'SEGMENT_SHAPE_INCONSISTENT', 'MPH_ET_INCONSISTENT', 'ISOLATED_SPLIT_SUSPECT',
];

function classifyRun(
  band: ConfidenceBand,
  flags: ReasonFlag[],
  suspectFields: string[],
): RunClassification {
  if (band === 'High' && flags.length === 0) return 'clean';

  const hardFails = flags.filter(f => HARD_INTEGRITY_CODES.includes(f.code as ReasonCode));
  const shapeIssues = flags.filter(f => SHAPE_CODES.includes(f.code as ReasonCode));
  const outliers = flags.filter(f => f.code === 'OUTLIER_FIELD' || f.code === 'OUTLIER_INTERVAL');

  // Missing data → incomplete record
  const hasMissing = hardFails.some(f => f.code === 'MISSING_SPLIT_VALUE');
  if (hasMissing && hardFails.length >= 2) return 'incomplete_record';

  // Multiple hard integrity issues → probable timing issue
  if (hardFails.some(f => f.severity === 'critical')) return 'probable_timing_issue';
  if (hardFails.length >= 2) return 'probable_timing_issue';

  // Isolated suspicious increment: one suspect field, rest clean
  if (suspectFields.length === 1 && (shapeIssues.length > 0 || outliers.length > 0)) {
    return 'isolated_suspicious_increment';
  }

  // Only outliers, no integrity/shape issues → unusual but plausible
  if (outliers.length > 0 && hardFails.length === 0 && shapeIssues.length === 0) {
    return 'unusual_but_plausible';
  }

  // High band with minor flags → clean
  if (band === 'High') return 'clean';

  // Medium band with some flags → review recommended
  if (band === 'Medium') return 'review_recommended';

  // Low/Critical with shape issues
  if (shapeIssues.length > 0 || hardFails.length > 0) return 'probable_timing_issue';

  return 'review_recommended';
}

// ══════════════════════════════════════════════════════════════════════════
// OFF-PACE / REPRESENTATIVE RUN DETECTION
// ══════════════════════════════════════════════════════════════════════════

interface OffPaceResult {
  representative: boolean;
  reason: string | null;
  excludedFromBaseline: boolean;
  exclusionReason: string | null;
}

/**
 * Determine if a run is "off-pace" (non-representative) relative to its peers.
 * Uses robust statistics on finish ET and finish MPH from the clean peer population.
 * A run is off-pace if it is far slower or far lower mph than the peer median,
 * but internally coherent (no hard integrity failures).
 *
 * Off-pace threshold: finish ET > peer median + 3 × MAD  (much slower)
 *                  OR finish MPH < peer median - 3 × MAD  (much slower speed)
 */
function detectOffPace(
  run: ParityRun,
  baselines: Map<string, BaselineStats>,
  hardFailFlags: ReasonFlag[],
): OffPaceResult {
  // If the run has hard integrity failures, it's not off-pace — it's broken data
  const hasHardFails = hardFailFlags.some(f =>
    f.severity === 'critical' || f.severity === 'high'
  );
  if (hasHardFails) {
    return { representative: true, reason: null, excludedFromBaseline: true, exclusionReason: 'integrity failure' };
  }

  const finish = resolveFinish(run);
  const finishET = finish.effectiveFinishTime;
  const finishMph = finish.effectiveFinishMph;

  // Need baselines to compare against
  const etField = finish.finishTimeField;
  const mphField = finish.finishMphField;
  const etBl = baselines.get(etField);
  const mphBl = baselines.get(mphField);

  // If no baselines available, assume representative
  if (!etBl && !mphBl) {
    return { representative: true, reason: null, excludedFromBaseline: false, exclusionReason: null };
  }

  const reasons: string[] = [];

  // Check ET: off-pace if much slower (higher ET) than peers
  if (finishET !== null && etBl) {
    const z = modifiedZScore(finishET, etBl.median, etBl.mad);
    // Positive z = slower than median. Use threshold of 4.0 for off-pace (generous)
    if (z > 4.0) {
      reasons.push(`Finish ET ${finishET.toFixed(3)}s is ${z.toFixed(1)}σ slower than peer median ${etBl.median.toFixed(3)}s`);
    }
  }

  // Check MPH: off-pace if much slower (lower MPH) than peers
  if (finishMph !== null && mphBl) {
    const z = modifiedZScore(finishMph, mphBl.median, mphBl.mad);
    // Negative z = slower speed. Use threshold of -4.0
    if (z < -4.0) {
      reasons.push(`Finish MPH ${finishMph.toFixed(1)} is ${Math.abs(z).toFixed(1)}σ below peer median ${mphBl.median.toFixed(1)}`);
    }
  }

  if (reasons.length > 0) {
    return {
      representative: false,
      reason: reasons.join('; '),
      excludedFromBaseline: true,
      exclusionReason: 'off-pace run — not representative of competitive field',
    };
  }

  return { representative: true, reason: null, excludedFromBaseline: false, exclusionReason: null };
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════

/**
 * Analyze a batch of runs for timing-data anomalies.
 *
 * @param runs       All runs to analyze (typically event+category scoped)
 * @param allRuns    Full population for baseline (may include cross-event runs)
 *                   If not provided, uses `runs` as the baseline population.
 */
export function analyzeRuns(runs: ParityRun[], allRuns?: ParityRun[]): AnomalyBatchResult {
  const population = allRuns ?? runs;

  // ── Phase 1: Run Layer 1 on ALL runs to identify hard failures ──
  const hardFailIds = new Set<number>();
  const runIntervals = new Map<number, DerivedIntervals>();
  const runL1Flags = new Map<number, ReasonFlag[]>();

  for (const run of population) {
    const intervals = computeIntervals(run);
    runIntervals.set(run.id, intervals);
    const l1 = layer1HardIntegrity(run, intervals);
    runL1Flags.set(run.id, l1);
    if (l1.some(f => f.severity === 'critical' || f.severity === 'high')) {
      hardFailIds.add(run.id);
    }
  }

  // Also compute for target runs not in population
  for (const run of runs) {
    if (!runIntervals.has(run.id)) {
      const intervals = computeIntervals(run);
      runIntervals.set(run.id, intervals);
      const l1 = layer1HardIntegrity(run, intervals);
      runL1Flags.set(run.id, l1);
      if (l1.some(f => f.severity === 'critical' || f.severity === 'high')) {
        hardFailIds.add(run.id);
      }
    }
  }

  // ── Phase 1b: Run Layer 2 on population to identify medium-suspect runs ──
  const mediumSuspectIds = new Set<number>();
  for (const run of population) {
    if (hardFailIds.has(run.id)) continue;
    const intervals = runIntervals.get(run.id) ?? computeIntervals(run);
    const l2 = layer2ShapeConsistency(run, intervals);
    if (l2.some(f => f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium')) {
      mediumSuspectIds.add(run.id);
    }
  }

  // ── Phase 2: Build initial clean population (exclude hard-fails + medium-suspects) ──
  const initialCleanIds = new Set<number>();
  for (const run of population) {
    if (!hardFailIds.has(run.id) && !mediumSuspectIds.has(run.id)) initialCleanIds.add(run.id);
  }

  // ── Phase 2b: Off-pace detection ──
  // Build preliminary baselines from the initial clean population to detect off-pace runs
  const offPaceIds = new Set<number>();
  const offPaceReasons = new Map<number, string>();
  {
    // Build a preliminary baseline from all initial-clean runs (category-level)
    const initialCleanRuns = population.filter(r => initialCleanIds.has(r.id));
    const prelimBaselines = initialCleanRuns.length >= 5
      ? buildBaselines(initialCleanRuns) : new Map<string, BaselineStats>();

    for (const run of population) {
      if (hardFailIds.has(run.id) || mediumSuspectIds.has(run.id)) continue;
      const l1 = runL1Flags.get(run.id) ?? [];
      const result = detectOffPace(run, prelimBaselines, l1);
      if (!result.representative) {
        offPaceIds.add(run.id);
        if (result.reason) offPaceReasons.set(run.id, result.reason);
      }
    }
  }

  // ── Phase 2c: Final clean population (exclude hard-fails + medium-suspects + off-pace) ──
  const cleanRunIds = new Set<number>();
  for (const run of population) {
    if (!hardFailIds.has(run.id) && !mediumSuspectIds.has(run.id) && !offPaceIds.has(run.id)) {
      cleanRunIds.add(run.id);
    }
  }
  const baselineExcludedCount = hardFailIds.size + mediumSuspectIds.size + offPaceIds.size;

  // ── Phase 3: Analyze each target run ──
  const results: RunAnomalyResult[] = [];
  const fieldFlagCounts = new Map<string, number>();

  for (const run of runs) {
    const intervals = runIntervals.get(run.id) ?? computeIntervals(run);
    const l1Flags = runL1Flags.get(run.id) ?? layer1HardIntegrity(run, intervals);
    const l2Flags = layer2ShapeConsistency(run, intervals);
    const finish = resolveFinish(run);

    // Select peers and build baselines for this run
    const { peers, scope } = selectPeers(run, population, cleanRunIds);
    const baselines = peers.length >= 3 ? buildBaselines(peers) : new Map<string, BaselineStats>();

    const baselineInfo: BaselineInfo = {
      scope,
      sampleSize: peers.length,
      hardFailsExcluded: baselineExcludedCount,
      quality: peers.length >= 15 ? 'strong'
             : peers.length >= 5  ? 'moderate'
             : peers.length >= 3  ? 'weak'
             : 'none',
    };
    if (baselineInfo.quality === 'weak') {
      baselineInfo.warning = `Only ${peers.length} clean peer runs available — outlier detection has reduced confidence`;
    }

    const l3Flags = layer3HistoricalBaseline(run, intervals, baselines, baselineInfo);

    // Off-pace detection for this specific run
    const offPace = detectOffPace(run, baselines, l1Flags);
    const isOffPace = offPaceIds.has(run.id) || !offPace.representative;

    // Off-pace flag (info severity — does not penalize score)
    const offPaceFlags: ReasonFlag[] = [];
    if (isOffPace) {
      offPaceFlags.push({
        code: 'OFF_PACE_RUN',
        severity: 'info',
        explanation: offPace.reason || offPaceReasons.get(run.id) || 'Run is significantly off the competitive pace',
      });
    }

    // Baseline quality flags
    const qualityFlags: ReasonFlag[] = [];
    if (baselineInfo.quality === 'weak' && l3Flags.length > 0) {
      qualityFlags.push({
        code: 'BASELINE_QUALITY_WEAK',
        severity: 'info',
        explanation: `Historical baseline uses only ${peers.length} peers (${scope}) — outlier conclusions have reduced confidence`,
      });
    }
    if (baselineInfo.quality === 'none' && runs.length > 10) {
      qualityFlags.push({
        code: 'BASELINE_SAMPLE_TOO_SMALL',
        severity: 'info',
        explanation: 'No suitable peer group found — historical comparison skipped',
      });
    }

    // Combine all flags
    const allFlags = [...l1Flags, ...l2Flags, ...l3Flags, ...offPaceFlags, ...qualityFlags];

    // Compute scores
    let overallScore = computeOverallScore(allFlags);

    // If off-pace but internally coherent, boost score toward Medium minimum
    // to avoid false-positive "Critical" on slow but valid runs
    if (isOffPace && !hardFailIds.has(run.id)) {
      const hardIntegFlags = l1Flags.filter(f => f.severity === 'critical' || f.severity === 'high');
      if (hardIntegFlags.length === 0) {
        overallScore = Math.max(overallScore, 55); // Floor at Medium band
      }
    }

    const fieldScores = computeFieldScores(allFlags);

    // Identify suspect fields (fields with score < 80)
    const suspectFields = fieldScores
      .filter(f => f.score < 80)
      .sort((a, b) => a.score - b.score)
      .map(f => f.field);

    // Track most-flagged field
    for (const sf of suspectFields) {
      fieldFlagCounts.set(sf, (fieldFlagCounts.get(sf) ?? 0) + 1);
    }

    // Primary reason
    const primaryFlag = allFlags
      .sort((a, b) => SEVERITY_PENALTY[b.severity] - SEVERITY_PENALTY[a.severity])[0] ?? null;

    const band = confidenceBand(overallScore);

    // Classification: off-pace + coherent → unusual_but_plausible (not probable_timing_issue)
    let classification = classifyRun(band, allFlags, suspectFields);
    if (isOffPace && classification === 'probable_timing_issue') {
      const hasRealIntegrityIssue = l1Flags.some(f => f.severity === 'critical');
      if (!hasRealIntegrityIssue) {
        classification = 'unusual_but_plausible';
      }
    }

    // Determine baseline exclusion reason
    const isExcluded = hardFailIds.has(run.id) || mediumSuspectIds.has(run.id) || isOffPace;
    let exclusionReason: string | null = null;
    if (hardFailIds.has(run.id)) exclusionReason = 'integrity failure';
    else if (mediumSuspectIds.has(run.id)) exclusionReason = 'medium-suspect shape flags';
    else if (isOffPace) exclusionReason = offPace.exclusionReason || 'off-pace run';

    const partial: Omit<RunAnomalyResult, 'narrative'> = {
      runId: run.id,
      runUuid: run.uuid,
      overallScore,
      band,
      classification,
      flagCount: allFlags.length,
      suspectFields,
      primaryReasonCode: primaryFlag?.code ?? null,
      primaryReasonText: primaryFlag?.explanation ?? 'No issues detected',
      flags: allFlags,
      fieldScores,
      intervals,
      baseline: baselineInfo,
      finish,
      representativeRun: !isOffPace,
      representativeRunReason: isOffPace ? (offPace.reason || offPaceReasons.get(run.id) || 'Off competitive pace') : null,
      excludedFromBaseline: isExcluded,
      baselineExclusionReason: exclusionReason,
    };

    results.push({ ...partial, narrative: generateNarrative(partial) });
  }

  // ── Build summary ──
  const highCount = results.filter(r => r.band === 'High').length;
  const mediumCount = results.filter(r => r.band === 'Medium').length;
  const lowCount = results.filter(r => r.band === 'Low').length;
  const criticalCount = results.filter(r => r.band === 'Critical').length;
  const representativeCount = results.filter(r => r.representativeRun).length;
  const offPaceCount = results.filter(r => !r.representativeRun).length;

  let mostFlaggedField: string | null = null;
  let mostFlaggedFieldCount = 0;
  for (const [field, count] of fieldFlagCounts) {
    if (count > mostFlaggedFieldCount) {
      mostFlaggedField = field;
      mostFlaggedFieldCount = count;
    }
  }

  return {
    summary: {
      runsAnalyzed: results.length,
      highCount,
      mediumCount,
      lowCount,
      criticalCount,
      baselineExcluded: baselineExcludedCount,
      representativeCount,
      offPaceCount,
      mostFlaggedField,
      mostFlaggedFieldCount,
    },
    runs: results,
  };
}
