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
 * to prevent "learning bad data as normal."
 */

import type { ParityRun } from '../../services/parityApi';

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

/** Derived interval segments (computed from cumulative splits) */
export const INTERVAL_SEGMENTS = [
  { key: 't_0_60',      label: '0–60 ft',     from: null,     to: 'ft60'   },
  { key: 't_60_330',     label: '60–330 ft',   from: 'ft60',   to: 'ft330'  },
  { key: 't_330_660',    label: '330–660 ft',  from: 'ft330',  to: 'ft660'  },
  { key: 't_660_1000',   label: '660–1000 ft', from: 'ft660',  to: 'ft1000' },
  { key: 't_1000_1320',  label: '1000–ET',     from: 'ft1000', to: 'ft1320' },
] as const;

export type IntervalKey = typeof INTERVAL_SEGMENTS[number]['key'];

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
  [key: string]: number | null;
}

export function computeIntervals(run: ParityRun): DerivedIntervals {
  const g = (f: keyof ParityRun) => {
    const v = run[f];
    return typeof v === 'number' && v > 0 ? v : null;
  };
  const sub = (a: number | null, b: number | null) =>
    a !== null && b !== null && a > b ? +(a - b).toFixed(6) : null;

  return {
    t_0_60:      g('ft60'),
    t_60_330:    sub(g('ft330'), g('ft60')),
    t_330_660:   sub(g('ft660'), g('ft330')),
    t_660_1000:  sub(g('ft1000'), g('ft660')),
    t_1000_1320: sub(g('ft1320'), g('ft1000')),
  };
}

// ── Run Analysis Result ──────────────────────────────────────────────────

export interface RunAnomalyResult {
  runId: number;
  runUuid: string;
  overallScore: number;        // 0–100
  band: ConfidenceBand;
  flagCount: number;
  suspectFields: string[];
  primaryReasonCode: ReasonCode | null;
  primaryReasonText: string;
  flags: ReasonFlag[];
  fieldScores: FieldConfidence[];
  intervals: DerivedIntervals;
  baseline: BaselineInfo;
  narrative: string;
}

// ── Batch Analysis Result ────────────────────────────────────────────────

export interface AnomalySummary {
  runsAnalyzed: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  criticalCount: number;
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
  const g = (f: keyof ParityRun): number | null => {
    const v = run[f];
    return typeof v === 'number' ? v : null;
  };

  // ── Missing split values (later splits exist but earlier ones are missing) ──
  const splits: { field: CumulativeField; val: number | null }[] = CUMULATIVE_FIELDS.map(f => ({
    field: f, val: g(f),
  }));
  let lastPresent = -1;
  for (let i = splits.length - 1; i >= 0; i--) {
    if (splits[i].val !== null) { lastPresent = i; break; }
  }
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
  const pairs: [CumulativeField, CumulativeField][] = [
    ['ft60', 'ft330'], ['ft330', 'ft660'], ['ft660', 'ft1000'], ['ft1000', 'ft1320'],
  ];
  for (const [earlier, later] of pairs) {
    const vE = g(earlier);
    const vL = g(later);
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
  const ivMap = intervals;
  for (const seg of INTERVAL_SEGMENTS) {
    const v = ivMap[seg.key];
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
  const presentSplits = splits.filter(s => s.val !== null);
  for (let i = 0; i < presentSplits.length; i++) {
    for (let j = i + 1; j < presentSplits.length; j++) {
      if (presentSplits[i].val === presentSplits[j].val) {
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

  // ── Incomplete run: no ET at all ──
  if (g('ft1320') === null && g('ft60') === null) {
    flags.push({
      code: 'INCOMPLETE_RUN_DATA',
      severity: 'medium',
      explanation: 'Run has no timing data (no 60 ft, no ET)',
    });
  }

  return flags;
}

// ══════════════════════════════════════════════════════════════════════════
// LAYER 2: LOCAL SHAPE / ADJACENT-SPLIT CONSISTENCY
// ══════════════════════════════════════════════════════════════════════════

function layer2ShapeConsistency(run: ParityRun, intervals: DerivedIntervals): ReasonFlag[] {
  const flags: ReasonFlag[] = [];
  const ivs = intervals;

  // Collect present intervals
  const present: { key: string; val: number }[] = [];
  for (const seg of INTERVAL_SEGMENTS) {
    const v = ivs[seg.key];
    if (v !== null && v > 0) present.push({ key: seg.key, val: v });
  }

  if (present.length < 3) return flags; // not enough data for shape analysis

  // ── Check each interval against neighbors for wild inconsistency ──
  // A segment that is >3x or <0.2x the average of its neighbors is suspect
  for (let i = 0; i < present.length; i++) {
    const neighbors: number[] = [];
    if (i > 0) neighbors.push(present[i - 1].val);
    if (i < present.length - 1) neighbors.push(present[i + 1].val);
    if (neighbors.length === 0) continue;

    const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
    const ratio = present[i].val / avgNeighbor;

    if (ratio > 3.0 || ratio < 0.15) {
      const segInfo = INTERVAL_SEGMENTS.find(s => s.key === present[i].key);
      flags.push({
        code: 'SEGMENT_SHAPE_INCONSISTENT',
        severity: 'high',
        field: present[i].key,
        value: present[i].val,
        expected: `~${avgNeighbor.toFixed(4)}s based on adjacent segments`,
        explanation: `${segInfo?.label || present[i].key} (${present[i].val.toFixed(4)}s) is ${ratio.toFixed(1)}x the average of adjacent segments — likely isolated timing error`,
      });
    } else if (ratio > 2.2 || ratio < 0.25) {
      const segInfo = INTERVAL_SEGMENTS.find(s => s.key === present[i].key);
      flags.push({
        code: 'SEGMENT_SHAPE_INCONSISTENT',
        severity: 'medium',
        field: present[i].key,
        value: present[i].val,
        expected: `~${avgNeighbor.toFixed(4)}s based on adjacent segments`,
        explanation: `${segInfo?.label || present[i].key} (${present[i].val.toFixed(4)}s) is ${ratio.toFixed(1)}x the average of adjacent segments — somewhat unusual`,
      });
    }
  }

  // ── mph vs ET consistency ──
  // For Top Fuel / Funny Car, 660 mph and 1320 mph should be loosely correlated
  // with their respective cumulative times. We use a simple check:
  // if 660 mph exists and 660 ft exists, faster time should mean higher speed
  const mph660 = typeof run.mph660 === 'number' ? run.mph660 : null;
  const mph1320 = typeof run.mph1320 === 'number' ? run.mph1320 : null;
  if (mph660 !== null && mph1320 !== null && mph660 > 0 && mph1320 > 0) {
    // 1320 mph should generally be >= 660 mph for a full pass
    // (vehicle accelerates from 660 to 1320). Exception: cars that shut off.
    // We only flag if 1320 mph is dramatically less (>30% less) — could be valid shutoff
    if (mph1320 < mph660 * 0.5) {
      flags.push({
        code: 'MPH_ET_INCONSISTENT',
        severity: 'medium',
        field: 'mph1320',
        value: mph1320,
        expected: `>= ~${(mph660 * 0.7).toFixed(1)} mph based on 660 mph`,
        explanation: `Finish mph (${mph1320.toFixed(1)}) is less than half of 660 mph (${mph660.toFixed(1)}) — possible timing/recording issue or mid-track shutoff`,
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

/** Build baselines from a clean population (hard-fail runs already excluded) */
function buildBaselines(cleanRuns: ParityRun[]): Map<string, BaselineStats> {
  const stats = new Map<string, BaselineStats>();

  // Build baselines for each timing field
  for (const f of TIMING_FIELDS) {
    const values = cleanRuns
      .map(r => r[f as keyof ParityRun])
      .filter((v): v is number => typeof v === 'number' && v > 0);
    if (values.length < 3) continue;

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

  // Build baselines for derived intervals
  const allIntervals = cleanRuns.map(r => computeIntervals(r));
  for (const seg of INTERVAL_SEGMENTS) {
    const values = allIntervals
      .map(iv => (iv as Record<string, number | null>)[seg.key])
      .filter((v): v is number => v !== null && v > 0);
    if (values.length < 3) continue;

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

  // Check derived intervals against baseline
  const ivMap = intervals;
  for (const seg of INTERVAL_SEGMENTS) {
    const v = ivMap[seg.key];
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

  // ── Phase 2: Build clean population for baselines ──
  const cleanRunIds = new Set<number>();
  for (const run of population) {
    if (!hardFailIds.has(run.id)) cleanRunIds.add(run.id);
  }

  // ── Phase 3: Analyze each target run ──
  const results: RunAnomalyResult[] = [];
  const fieldFlagCounts = new Map<string, number>();

  for (const run of runs) {
    const intervals = runIntervals.get(run.id) ?? computeIntervals(run);
    const l1Flags = runL1Flags.get(run.id) ?? layer1HardIntegrity(run, intervals);
    const l2Flags = layer2ShapeConsistency(run, intervals);

    // Select peers and build baselines for this run
    const { peers, scope } = selectPeers(run, population, cleanRunIds);
    const baselines = peers.length >= 3 ? buildBaselines(peers) : new Map<string, BaselineStats>();

    const baselineInfo: BaselineInfo = {
      scope,
      sampleSize: peers.length,
      hardFailsExcluded: hardFailIds.size,
      quality: peers.length >= 15 ? 'strong'
             : peers.length >= 5  ? 'moderate'
             : peers.length >= 3  ? 'weak'
             : 'none',
    };
    if (baselineInfo.quality === 'weak') {
      baselineInfo.warning = `Only ${peers.length} clean peer runs available — outlier detection has reduced confidence`;
    }

    const l3Flags = layer3HistoricalBaseline(run, intervals, baselines, baselineInfo);

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
    const allFlags = [...l1Flags, ...l2Flags, ...l3Flags, ...qualityFlags];

    // Compute scores
    const overallScore = computeOverallScore(allFlags);
    const fieldScores = computeFieldScores(allFlags);

    // Identify suspect fields (fields with score < 80 — any significant flag)
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

    const partial: Omit<RunAnomalyResult, 'narrative'> = {
      runId: run.id,
      runUuid: run.uuid,
      overallScore,
      band: confidenceBand(overallScore),
      flagCount: allFlags.length,
      suspectFields,
      primaryReasonCode: primaryFlag?.code ?? null,
      primaryReasonText: primaryFlag?.explanation ?? 'No issues detected',
      flags: allFlags,
      fieldScores,
      intervals,
      baseline: baselineInfo,
    };

    results.push({ ...partial, narrative: generateNarrative(partial) });
  }

  // ── Build summary ──
  const highCount = results.filter(r => r.band === 'High').length;
  const mediumCount = results.filter(r => r.band === 'Medium').length;
  const lowCount = results.filter(r => r.band === 'Low').length;
  const criticalCount = results.filter(r => r.band === 'Critical').length;

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
      mostFlaggedField,
      mostFlaggedFieldCount,
    },
    runs: results,
  };
}
