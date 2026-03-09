/**
 * AnomaliesPanel — Run Integrity Review
 *
 * Server-backed timing-data confidence and anomaly detection dashboard.
 * Data is computed by the backend anomaly engine (api/parity.php → anomalyAnalysis)
 * and rendered here with rollup/system-level views and per-run detail inspection.
 *
 * Distinguishes between:
 *   - Unusual but plausible performance
 *   - Isolated suspicious increments
 *   - Probable timing-data issues
 *   - Incomplete/corrupt records
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  parityApi,
  type EventWithStats,
  type AnomalyAnalysisResponse,
  type AnomalyRunSummary,
  type AnomalyRollups,
  type AnomalyFieldScore,
  type AnomalyDetailResponse,
  type AnomalyClassification,
} from '../services/parityApi';
import { BAND_COLORS } from '../domain/parity/anomalyEngine';
import { formatET, formatMPH } from '../domain/parity/format';

// ── Styles (matches ParityPortal conventions) ────────────────────────────

const S = {
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '1rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.75rem',
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '0.3rem 0.5rem',
    borderBottom: '2px solid var(--color-border)',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    color: 'var(--color-muted)',
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  td: {
    padding: '0.25rem 0.5rem',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '0.1rem 0.4rem',
    borderRadius: 3,
    fontSize: '0.7rem',
    fontWeight: 600,
    background: color,
    color: '#fff',
  }) as React.CSSProperties,
  stat: {
    display: 'inline-block',
    padding: '0.4rem 0.7rem',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    marginRight: '0.5rem',
    marginBottom: '0.35rem',
    fontSize: '0.8rem',
    textAlign: 'center' as const,
    minWidth: 80,
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'secondary' = 'primary') => ({
    padding: '0.4rem 0.8rem',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
    background: variant === 'primary' ? 'var(--color-primary)' : 'var(--color-border)',
    color: variant === 'secondary' ? 'var(--color-text)' : '#fff',
  }) as React.CSSProperties,
  input: {
    padding: '0.4rem 0.6rem',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
  } as React.CSSProperties,
};

// ── Classification labels & colors ───────────────────────────────────────

const CLASSIFICATION_LABELS: Record<AnomalyClassification, string> = {
  clean: 'Clean',
  unusual_but_plausible: 'Unusual — Plausible',
  isolated_suspicious_increment: 'Suspicious Increment',
  probable_timing_issue: 'Probable Timing Issue',
  incomplete_record: 'Incomplete Record',
  review_recommended: 'Review Recommended',
};

const CLASSIFICATION_COLORS: Record<AnomalyClassification, string> = {
  clean: '#27ae60',
  unusual_but_plausible: '#3498db',
  isolated_suspicious_increment: '#e67e22',
  probable_timing_issue: '#c0392b',
  incomplete_record: '#95a5a6',
  review_recommended: '#f39c12',
};

function ClassificationBadge({ classification }: { classification: AnomalyClassification }) {
  return (
    <span style={{
      ...S.badge(CLASSIFICATION_COLORS[classification] || '#95a5a6'),
      fontSize: '0.63rem',
      whiteSpace: 'nowrap',
    }}>
      {CLASSIFICATION_LABELS[classification] || classification}
    </span>
  );
}

// ── Band helpers ─────────────────────────────────────────────────────────

type BandKey = 'High' | 'Medium' | 'Low' | 'Critical';

function bandColor(band: string): string {
  return BAND_COLORS[band as BandKey] ?? '#95a5a6';
}

function ConfidenceChip({ score, band }: { score: number; band: string }) {
  return (
    <span style={{ ...S.badge(bandColor(band)), minWidth: 36, textAlign: 'center' }}>
      {score}
    </span>
  );
}

function BandBadge({ band }: { band: string }) {
  return <span style={S.badge(bandColor(band))}>{band}</span>;
}

// ── Field health chips (compact per-row visualization) ───────────────────

const DISPLAY_FIELDS = [
  { key: 'rt', label: 'RT' },
  { key: 'ft60', label: '60\'' },
  { key: 'ft330', label: '330\'' },
  { key: 'ft660', label: '660\'' },
  { key: 'mph660', label: '660 mph' },
  { key: 'ft1000', label: '1000\'' },
  { key: 'ft1320', label: 'ET' },
  { key: 'mph1320', label: 'MPH' },
];

function FieldHealthChips({ fieldScores, compact }: { fieldScores: AnomalyFieldScore[]; compact?: boolean }) {
  const scoreMap = new Map(fieldScores.map(f => [f.field, f]));

  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {DISPLAY_FIELDS.map(df => {
        const fs = scoreMap.get(df.key);
        const band = fs?.band || 'High';
        const score = fs?.score ?? 100;
        const color = bandColor(band);
        const opacity = band === 'High' ? 0.25 : 1;
        return (
          <span
            key={df.key}
            title={`${df.label}: ${score} (${band})`}
            style={{
              display: 'inline-block',
              width: compact ? 8 : 10,
              height: compact ? 8 : 10,
              borderRadius: 2,
              background: color,
              opacity,
            }}
          />
        );
      })}
    </span>
  );
}

// ── Severity badge ───────────────────────────────────────────────────────

const SEV_COLORS: Record<string, string> = {
  critical: '#c0392b',
  high: '#e67e22',
  medium: '#f39c12',
  low: '#95a5a6',
  info: '#3498db',
};

function SeverityBadge({ severity }: { severity: string }) {
  return <span style={{ ...S.badge(SEV_COLORS[severity] || '#95a5a6'), fontSize: '0.65rem' }}>{severity}</span>;
}

function severityRank(s: string): number {
  return ({ critical: 0, high: 1, medium: 2, low: 3, info: 4 } as Record<string, number>)[s] ?? 5;
}

// ── Interval segment labels ──────────────────────────────────────────────

const INTERVAL_LABELS: { key: string; label: string }[] = [
  { key: 't_0_60',       label: '0–60 ft' },
  { key: 't_60_330',     label: '60–330 ft' },
  { key: 't_330_660',    label: '330–660 ft' },
  { key: 't_660_1000',   label: '660–1000 ft' },
  { key: 't_1000_1320',  label: '1000–ET' },
  { key: 't_660_finish', label: '660–Finish' },
];

// ── Baseline quality color helper ────────────────────────────────────────

function baselineQualityColor(q: string): string {
  return q === 'strong' ? '#27ae60' : q === 'moderate' ? '#f39c12' : q === 'weak' ? '#e67e22' : '#95a5a6';
}

// ── Detail Panel ─────────────────────────────────────────────────────────

function RunDetailPanel({ result, onClose }: {
  result: AnomalyRunSummary & { flags?: AnomalyDetailResponse['analysis']['flags'] };
  onClose: () => void;
}) {
  return (
    <div style={{
      ...S.card,
      border: `2px solid ${bandColor(result.band)}`,
      position: 'relative',
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 8, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '1.1rem', color: 'var(--color-muted)',
        }}
      >✕</button>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>
          Run #{result.runId} — {result.driverName || 'Unknown'}
        </h3>
        <ConfidenceChip score={result.overallScore} band={result.band} />
        <BandBadge band={result.band} />
        <ClassificationBadge classification={result.classification} />
        {result.finish?.isNitro && (
          <span style={{ ...S.badge('#8e44ad'), fontSize: '0.63rem' }}>1000 ft Finish</span>
        )}
        {!result.representativeRun && (
          <span style={{ ...S.badge('#7f8c8d'), fontSize: '0.63rem' }}>Off-Pace</span>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          {result.flagCount} flag(s) · {result.suspectFields.length} suspect field(s)
        </span>
      </div>

      {/* Narrative */}
      <div style={{
        background: 'var(--color-bg)', borderRadius: 6, padding: '0.6rem 0.8rem',
        fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.75rem',
        borderLeft: `3px solid ${bandColor(result.band)}`,
      }}>
        {result.narrative}
        {result.finish?.isNitro && (
          <div style={{ fontSize: '0.72rem', color: '#8e44ad', marginTop: '0.3rem' }}>
            Nitro class: finish interpreted at {result.finish.effectiveFinishDistance} ft ({result.finish.finishTimeField}). This is a known timing convention — not a data error.
          </div>
        )}
        {!result.representativeRun && result.representativeRunReason && (
          <div style={{ fontSize: '0.72rem', color: '#7f8c8d', marginTop: '0.3rem' }}>
            Off-pace: {result.representativeRunReason}. Excluded from baseline calculations.
          </div>
        )}
      </div>

      {/* Run values + Intervals side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {/* Run context + values */}
        <div style={S.card}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>Run Values</h4>
          <table style={S.table}>
            <tbody>
              {[
                { label: 'Category', value: result.category || '—' },
                { label: 'Round', value: result.round || '—' },
                { label: 'Lane', value: result.lane || '—' },
                { label: result.finish?.isNitro ? 'Finish ET' : 'ET', value: formatET(result.finish?.effectiveFinishTime ?? result.ft1320) },
                { label: result.finish?.isNitro ? 'Finish MPH' : 'MPH', value: formatMPH(result.finish?.effectiveFinishMph ?? result.mph1320) },
                ...(result.finish?.isNitro ? [{ label: 'Finish Distance', value: `${result.finish.effectiveFinishDistance} ft` }] : []),
              ].map(r => (
                <tr key={r.label}>
                  <td style={{ ...S.td, fontWeight: 600, width: '40%' }}>{r.label}</td>
                  <td style={S.td}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Derived intervals */}
        <div style={S.card}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>Derived Intervals</h4>
          <table style={S.table}>
            <tbody>
              {INTERVAL_LABELS.map(seg => {
                const val = result.intervals[seg.key];
                const fs = result.fieldScores.find(f => f.field === seg.key);
                const isSuspect = fs && fs.score < 80;
                return (
                  <tr key={seg.key}>
                    <td style={{ ...S.td, fontWeight: 600, width: '45%' }}>{seg.label}</td>
                    <td style={{
                      ...S.td,
                      color: isSuspect ? BAND_COLORS.Critical : undefined,
                      fontWeight: isSuspect ? 700 : undefined,
                    }}>
                      {val !== null && val !== undefined ? val.toFixed(4) + 's' : '—'}
                    </td>
                    <td style={{ ...S.td, width: 40 }}>
                      {fs && <ConfidenceChip score={fs.score} band={fs.band} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field confidence detail */}
      <div style={S.card}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>Field Confidence</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {DISPLAY_FIELDS.map(df => {
            const fs = result.fieldScores.find(f => f.field === df.key);
            const score = fs?.score ?? 100;
            const band = fs?.band || 'High';
            return (
              <div key={df.key} style={{
                ...S.stat,
                borderColor: bandColor(band),
                borderWidth: score < 80 ? 2 : 1,
                minWidth: 60,
              }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginBottom: 2 }}>{df.label}</div>
                <div style={{ fontWeight: 700, color: bandColor(band) }}>{score}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Baseline info */}
      <div style={S.card}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>Historical Baseline</h4>
        <div style={{ fontSize: '0.78rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span><strong>Scope:</strong> {result.baseline.scope}</span>
          <span><strong>Sample size:</strong> {result.baseline.sampleSize}</span>
          <span><strong>Quality:</strong> <span style={{
            color: baselineQualityColor(result.baseline.quality),
            fontWeight: 600,
          }}>{result.baseline.quality}</span></span>
          <span><strong>Excluded from baseline:</strong> {result.baseline.hardFailsExcluded}</span>
        </div>
        {result.baseline.warning && (
          <div style={{ fontSize: '0.75rem', color: '#e67e22', marginTop: '0.25rem' }}>
            ⚠ {result.baseline.warning}
          </div>
        )}
      </div>

      {/* Anomaly flags (from detail endpoint or inline) */}
      {result.flags && result.flags.length > 0 && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Anomaly Flags ({result.flags.length})
          </h4>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Severity</th>
                <th style={S.th}>Code</th>
                <th style={S.th}>Field</th>
                <th style={S.th}>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {[...result.flags]
                .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
                .map((flag, i) => (
                <tr key={i}>
                  <td style={S.td}><SeverityBadge severity={flag.severity} /></td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>{flag.code}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{flag.field || '—'}</td>
                  <td style={{ ...S.td, whiteSpace: 'normal' as const, maxWidth: 400 }}>{flag.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Summary Tiles ────────────────────────────────────────────────────────

function SummaryTiles({ data }: { data: AnomalyAnalysisResponse }) {
  const { summary } = data;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <div style={S.stat}>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>Runs Analyzed</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{summary.runsAnalyzed}</div>
      </div>
      <div style={{ ...S.stat, borderColor: BAND_COLORS.High }}>
        <div style={{ fontSize: '0.65rem', color: BAND_COLORS.High }}>High Confidence</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: BAND_COLORS.High }}>{summary.highCount}</div>
      </div>
      <div style={{ ...S.stat, borderColor: BAND_COLORS.Medium }}>
        <div style={{ fontSize: '0.65rem', color: BAND_COLORS.Medium }}>Medium</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: BAND_COLORS.Medium }}>{summary.mediumCount}</div>
      </div>
      <div style={{ ...S.stat, borderColor: BAND_COLORS.Low }}>
        <div style={{ fontSize: '0.65rem', color: BAND_COLORS.Low }}>Low</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: BAND_COLORS.Low }}>{summary.lowCount}</div>
      </div>
      <div style={{ ...S.stat, borderColor: BAND_COLORS.Critical }}>
        <div style={{ fontSize: '0.65rem', color: BAND_COLORS.Critical }}>Critical</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: BAND_COLORS.Critical }}>{summary.criticalCount}</div>
      </div>
      {summary.baselineExcluded > 0 && (
        <div style={S.stat}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>Baseline Excluded</div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{summary.baselineExcluded}</div>
        </div>
      )}
      {summary.offPaceCount > 0 && (
        <div style={{ ...S.stat, borderColor: '#7f8c8d' }}>
          <div style={{ fontSize: '0.65rem', color: '#7f8c8d' }}>Off-Pace</div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#7f8c8d' }}>{summary.offPaceCount}</div>
        </div>
      )}
      {summary.mostFlaggedField && (
        <div style={S.stat}>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>Most Flagged</div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
            {summary.mostFlaggedField} ({summary.mostFlaggedFieldCount})
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rollup Cards ─────────────────────────────────────────────────────────

function RollupCards({ rollups }: { rollups: AnomalyRollups }) {
  const lanes = Object.entries(rollups.byLane);
  const rounds = Object.entries(rollups.byRound);
  const fields = Object.entries(rollups.byField).slice(0, 8);
  const classifications = Object.entries(rollups.classifications).filter(([, v]) => v > 0);

  const hasLaneData = lanes.length > 1;
  const hasRoundData = rounds.length > 1;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
      {/* Lane rollup */}
      {hasLaneData && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>By Lane</h4>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Lane</th>
                <th style={S.th}>Runs</th>
                <th style={S.th}>Avg Score</th>
                <th style={S.th}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {lanes.map(([lane, d]) => (
                <tr key={lane}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{lane}</td>
                  <td style={S.td}>{d.total}</td>
                  <td style={S.td}>
                    <span style={{ fontWeight: 600, color: bandColor(d.avgScore >= 80 ? 'High' : d.avgScore >= 55 ? 'Medium' : d.avgScore >= 30 ? 'Low' : 'Critical') }}>
                      {d.avgScore}
                    </span>
                  </td>
                  <td style={S.td}>
                    {d.criticalOrLow > 0 ? (
                      <span style={{ ...S.badge('#c0392b'), fontSize: '0.63rem' }}>{d.criticalOrLow}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Round rollup */}
      {hasRoundData && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>By Session/Round</h4>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Round</th>
                <th style={S.th}>Runs</th>
                <th style={S.th}>Avg Score</th>
                <th style={S.th}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map(([round, d]) => (
                <tr key={round}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{round}</td>
                  <td style={S.td}>{d.total}</td>
                  <td style={S.td}>
                    <span style={{ fontWeight: 600, color: bandColor(d.avgScore >= 80 ? 'High' : d.avgScore >= 55 ? 'Medium' : d.avgScore >= 30 ? 'Low' : 'Critical') }}>
                      {d.avgScore}
                    </span>
                  </td>
                  <td style={S.td}>
                    {d.criticalOrLow > 0 ? (
                      <span style={{ ...S.badge('#c0392b'), fontSize: '0.63rem' }}>{d.criticalOrLow}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Most flagged fields */}
      {fields.length > 0 && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>Frequently Flagged Fields</h4>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Field</th>
                <th style={S.th}>Runs Affected</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(([field, count]) => (
                <tr key={field}>
                  <td style={{ ...S.td, fontWeight: 600, fontFamily: 'monospace' }}>{field}</td>
                  <td style={S.td}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Classification breakdown */}
      {classifications.length > 0 && (
        <div style={S.card}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>Run Classifications</h4>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Classification</th>
                <th style={S.th}>Count</th>
              </tr>
            </thead>
            <tbody>
              {classifications.map(([cls, count]) => (
                <tr key={cls}>
                  <td style={S.td}>
                    <ClassificationBadge classification={cls as AnomalyClassification} />
                  </td>
                  <td style={S.td}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Sort helper ──────────────────────────────────────────────────────────

type SortKey = 'score' | 'driver' | 'et' | 'mph' | 'flags' | 'band' | 'classification';
type SortDir = 'asc' | 'desc';

function sortRuns(
  results: AnomalyRunSummary[],
  sortKey: SortKey,
  sortDir: SortDir,
): AnomalyRunSummary[] {
  const sorted = [...results];
  const bandOrder: Record<string, number> = { Critical: 0, Low: 1, Medium: 2, High: 3 };
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'score': cmp = a.overallScore - b.overallScore; break;
      case 'flags': cmp = a.flagCount - b.flagCount; break;
      case 'driver': cmp = (a.driverName || '').localeCompare(b.driverName || ''); break;
      case 'et': cmp = (a.ft1320 ?? 999) - (b.ft1320 ?? 999); break;
      case 'mph': cmp = (a.mph1320 ?? 0) - (b.mph1320 ?? 0); break;
      case 'classification': cmp = (a.classification || '').localeCompare(b.classification || ''); break;
      case 'band': cmp = (bandOrder[a.band] ?? 5) - (bandOrder[b.band] ?? 5); break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════

interface AnomaliesPanelProps {
  event: EventWithStats | null;
  category: string;
  refreshKey?: number;
}

export default function AnomaliesPanel({ event, category, refreshKey }: AnomaliesPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnomalyAnalysisResponse | null>(null);
  const [detail, setDetail] = useState<AnomalyDetailResponse | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterBand, setFilterBand] = useState<string>('all');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [driverSearch, setDriverSearch] = useState('');

  // Fetch anomaly analysis from backend
  const fetchAnalysis = useCallback(async () => {
    if (!event?.race_lookup) return;
    setLoading(true);
    setError('');
    setData(null);
    setDetail(null);
    setSelectedRunId(null);
    try {
      const res = await parityApi.anomalyAnalysis({
        raceLookup: event.race_lookup,
        category: category || undefined,
      });
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load anomaly analysis');
    } finally {
      setLoading(false);
    }
  }, [event?.race_lookup, category]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis, refreshKey]);

  // Fetch detail when a run is selected
  const selectRun = useCallback(async (runId: number | null) => {
    setSelectedRunId(runId);
    setDetail(null);
    if (runId && event?.race_lookup) {
      try {
        const res = await parityApi.anomalyDetail({
          runId,
          raceLookup: event.race_lookup,
        });
        setDetail(res);
      } catch {
        // Fall back to summary-level data from the list
      }
    }
  }, [event?.race_lookup]);

  // Sort and filter
  const displayRuns = useMemo(() => {
    if (!data) return [];
    let filtered = data.runs;
    if (filterBand === 'representative') {
      filtered = filtered.filter(r => r.representativeRun);
    } else if (filterBand === 'off-pace') {
      filtered = filtered.filter(r => !r.representativeRun);
    } else if (filterBand !== 'all') {
      filtered = filtered.filter(r => r.band === filterBand);
    }
    if (filterClassification !== 'all') {
      filtered = filtered.filter(r => r.classification === filterClassification);
    }
    if (driverSearch) {
      const q = driverSearch.toLowerCase();
      filtered = filtered.filter(r => r.driverName?.toLowerCase().includes(q));
    }
    return sortRuns(filtered, sortKey, sortDir);
  }, [data, filterBand, filterClassification, driverSearch, sortKey, sortDir]);

  // Build detail result for the detail panel
  const detailResult = useMemo(() => {
    if (detail) return detail.analysis;
    if (!selectedRunId || !data) return null;
    return data.runs.find(r => r.runId === selectedRunId) ?? null;
  }, [detail, selectedRunId, data]);

  // Sort toggle handler
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'score' ? 'asc' : 'desc');
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  if (!event) {
    return <div style={S.card}><p style={{ color: 'var(--color-muted)' }}>Select an event to review run integrity.</p></div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ margin: '0 0 0.15rem', fontSize: '1.05rem' }}>
          Run Integrity Review
        </h2>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
          {event.event_name}
          {category && <> · {category}</>}
          {' — '}Timing-data confidence analysis. Identifies probable timing issues, suspicious increments, and unusual performance.
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={S.card}>
          <span style={{ color: 'var(--color-muted)' }}>Analyzing {category || 'all'} runs (server-side)…</span>
        </div>
      )}
      {error && (
        <div style={{
          ...S.card,
          background: 'rgba(220,50,50,0.08)',
          border: '1px solid rgba(220,50,50,0.3)',
        }}>
          <strong>Error:</strong> {error}
          <button style={{ ...S.btn('secondary'), marginLeft: '0.5rem', fontSize: '0.7rem' }} onClick={fetchAnalysis}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Summary tiles */}
          <SummaryTiles data={data} />

          {/* Rollup cards */}
          <RollupCards rollups={data.rollups} />

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={filterBand}
              onChange={e => setFilterBand(e.target.value)}
              style={{ ...S.input, width: 150 }}
            >
              <option value="all">All Bands</option>
              <option value="Critical">Critical Only</option>
              <option value="Low">Low Only</option>
              <option value="Medium">Medium Only</option>
              <option value="High">High Only</option>
              <option value="representative">Representative Only</option>
              <option value="off-pace">Off-Pace Only</option>
            </select>
            <select
              value={filterClassification}
              onChange={e => setFilterClassification(e.target.value)}
              style={{ ...S.input, width: 180 }}
            >
              <option value="all">All Classifications</option>
              <option value="probable_timing_issue">Probable Timing Issue</option>
              <option value="isolated_suspicious_increment">Suspicious Increment</option>
              <option value="unusual_but_plausible">Unusual — Plausible</option>
              <option value="incomplete_record">Incomplete Record</option>
              <option value="review_recommended">Review Recommended</option>
              <option value="clean">Clean</option>
            </select>
            <input
              type="text"
              placeholder="Driver search…"
              value={driverSearch}
              onChange={e => setDriverSearch(e.target.value)}
              style={{ ...S.input, width: 160 }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Showing {displayRuns.length} of {data.runs.length} runs
            </span>
            {/* Field legend */}
            <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
              Fields: RT · 60′ · 330′ · 660′ · 660mph · 1000′ · ET · MPH
            </span>
          </div>

          {/* Detail panel (shown above table when a run is selected) */}
          {detailResult && (
            <RunDetailPanel
              result={detailResult}
              onClose={() => selectRun(null)}
            />
          )}

          {/* Main table */}
          <div style={{ ...S.card, padding: '0.5rem', overflow: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th} onClick={() => toggleSort('score')}>Score{sortIndicator('score')}</th>
                  <th style={S.th} onClick={() => toggleSort('band')}>Band{sortIndicator('band')}</th>
                  <th style={S.th} onClick={() => toggleSort('classification')}>Classification{sortIndicator('classification')}</th>
                  <th style={S.th} onClick={() => toggleSort('driver')}>Driver{sortIndicator('driver')}</th>
                  <th style={S.th}>Lane</th>
                  <th style={S.th} onClick={() => toggleSort('et')}>ET{sortIndicator('et')}</th>
                  <th style={S.th} onClick={() => toggleSort('mph')}>MPH{sortIndicator('mph')}</th>
                  <th style={S.th} onClick={() => toggleSort('flags')}>Flags{sortIndicator('flags')}</th>
                  <th style={S.th}>Suspect Fields</th>
                  <th style={S.th}>Field Health</th>
                  <th style={S.th}>Primary Reason</th>
                  <th style={S.th}>Baseline</th>
                </tr>
              </thead>
              <tbody>
                {displayRuns.map(r => {
                  const isSelected = selectedRunId === r.runId;
                  return (
                    <tr
                      key={r.runId}
                      onClick={() => selectRun(isSelected ? null : r.runId)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(52,152,219,0.08)' : undefined,
                      }}
                    >
                      <td style={S.td}><ConfidenceChip score={r.overallScore} band={r.band} /></td>
                      <td style={S.td}><BandBadge band={r.band} /></td>
                      <td style={S.td}>
                        <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                          <ClassificationBadge classification={r.classification} />
                          {r.finish?.isNitro && <span title="1000 ft finish" style={{ fontSize: '0.6rem', color: '#8e44ad', fontWeight: 700 }}>N</span>}
                          {!r.representativeRun && <span title="Off-pace" style={{ fontSize: '0.6rem', color: '#7f8c8d', fontWeight: 700 }}>OP</span>}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.driverName || '—'}
                      </td>
                      <td style={S.td}>{r.lane || '—'}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace' }}>{formatET(r.ft1320)}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace' }}>{formatMPH(r.mph1320)}</td>
                      <td style={S.td}>
                        {r.flagCount > 0 ? (
                          <span style={{
                            ...S.badge(r.flagCount >= 5 ? '#c0392b' : r.flagCount >= 3 ? '#e67e22' : '#f39c12'),
                            fontSize: '0.65rem',
                          }}>
                            {r.flagCount}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ ...S.td, fontSize: '0.68rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.suspectFields.length > 0 ? r.suspectFields.join(', ') : '—'}
                      </td>
                      <td style={S.td}>
                        <FieldHealthChips fieldScores={r.fieldScores} compact />
                      </td>
                      <td style={{ ...S.td, fontSize: '0.68rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal' as const }}>
                        {r.primaryReasonCode !== null ? r.primaryReasonText : '—'}
                      </td>
                      <td style={{ ...S.td, fontSize: '0.68rem' }}>
                        <span style={{ color: baselineQualityColor(r.baseline.quality) }}>
                          {r.baseline.quality} ({r.baseline.sampleSize})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {displayRuns.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-muted)' }}>
                {data.runs.length === 0 ? 'No runs found for this event/category.' : 'No runs match the current filter.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
