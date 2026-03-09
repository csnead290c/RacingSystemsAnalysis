/**
 * AnomaliesPanel — Timing-data confidence & anomaly detection dashboard
 *
 * Analyzes parity run data to identify:
 *   - Runs with suspicious or unreliable timing data
 *   - Individual splits/increments that may be wrong while the rest is trustworthy
 *   - Patterns suggesting timing system issues vs unusual vehicle performance
 *
 * Uses the deterministic anomaly engine (src/domain/parity/anomalyEngine.ts).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  parityApi,
  type RunWithWeather,
  type EventWithStats,
} from '../services/parityApi';
import {
  analyzeRuns,
  confidenceBand,
  BAND_COLORS,
  INTERVAL_SEGMENTS,
  type RunAnomalyResult,
  type AnomalyBatchResult,
  type ConfidenceBand,
  type FieldConfidence,
  type Severity,
} from '../domain/parity/anomalyEngine';
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

// ── Confidence chip ──────────────────────────────────────────────────────

function ConfidenceChip({ score, band }: { score: number; band: ConfidenceBand }) {
  return (
    <span style={{
      ...S.badge(BAND_COLORS[band]),
      minWidth: 36,
      textAlign: 'center',
    }}>
      {score}
    </span>
  );
}

function BandBadge({ band }: { band: ConfidenceBand }) {
  return <span style={S.badge(BAND_COLORS[band])}>{band}</span>;
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

function FieldHealthChips({ fieldScores, compact }: { fieldScores: FieldConfidence[]; compact?: boolean }) {
  const scoreMap = new Map(fieldScores.map(f => [f.field, f]));

  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {DISPLAY_FIELDS.map(df => {
        const fs = scoreMap.get(df.key);
        const band = fs ? fs.band : 'High';
        const score = fs ? fs.score : 100;
        const color = BAND_COLORS[band];
        const opacity = band === 'High' ? 0.25 : 1;
        return (
          <span
            key={df.key}
            title={`${df.label}: ${score} (${band})${fs?.flags.length ? ' — ' + fs.flags.map(f => f.explanation).join('; ') : ''}`}
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

const SEV_COLORS: Record<Severity, string> = {
  critical: '#c0392b',
  high: '#e67e22',
  medium: '#f39c12',
  low: '#95a5a6',
  info: '#3498db',
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return <span style={{ ...S.badge(SEV_COLORS[severity]), fontSize: '0.65rem' }}>{severity}</span>;
}

// ── Detail Panel ─────────────────────────────────────────────────────────

function RunDetailPanel({ result, run, onClose }: {
  result: RunAnomalyResult;
  run: RunWithWeather;
  onClose: () => void;
}) {
  return (
    <div style={{
      ...S.card,
      border: `2px solid ${BAND_COLORS[result.band]}`,
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
          Run #{run.id} — {run.driver_name || 'Unknown'}
        </h3>
        <ConfidenceChip score={result.overallScore} band={result.band} />
        <BandBadge band={result.band} />
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          {result.flagCount} flag(s) · {result.suspectFields.length} suspect field(s)
        </span>
      </div>

      {/* Narrative */}
      <div style={{
        background: 'var(--color-bg)', borderRadius: 6, padding: '0.6rem 0.8rem',
        fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.75rem',
        borderLeft: `3px solid ${BAND_COLORS[result.band]}`,
      }}>
        {result.narrative}
      </div>

      {/* Run values + Intervals side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {/* Raw run values */}
        <div style={S.card}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>Run Values</h4>
          <table style={S.table}>
            <tbody>
              {[
                { label: 'Category', value: run.category || '—' },
                { label: 'Event', value: run.race_lookup },
                { label: 'Round', value: run.round || '—' },
                { label: 'Lane', value: run.lane || '—' },
                { label: 'RT', value: formatET(run.rt) },
                { label: '60 ft', value: formatET(run.ft60) },
                { label: '330 ft', value: formatET(run.ft330) },
                { label: '660 ft', value: formatET(run.ft660) },
                { label: '660 mph', value: formatMPH(run.mph660) },
                { label: '1000 ft', value: formatET(run.ft1000) },
                { label: 'ET', value: formatET(run.ft1320) },
                { label: 'MPH', value: formatMPH(run.mph1320) },
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
              {INTERVAL_SEGMENTS.map(seg => {
                const val = result.intervals[seg.key];
                const fs = result.fieldScores.find(f => f.field === seg.key);
                const isSuspect = fs && fs.score < 70;
                return (
                  <tr key={seg.key}>
                    <td style={{ ...S.td, fontWeight: 600, width: '45%' }}>{seg.label}</td>
                    <td style={{
                      ...S.td,
                      color: isSuspect ? BAND_COLORS.Critical : undefined,
                      fontWeight: isSuspect ? 700 : undefined,
                    }}>
                      {val !== null ? val.toFixed(4) + 's' : '—'}
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
            const band = fs ? fs.band : confidenceBand(100);
            return (
              <div key={df.key} style={{
                ...S.stat,
                borderColor: BAND_COLORS[band],
                borderWidth: score < 70 ? 2 : 1,
                minWidth: 60,
              }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginBottom: 2 }}>{df.label}</div>
                <div style={{ fontWeight: 700, color: BAND_COLORS[band] }}>{score}</div>
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
            color: result.baseline.quality === 'strong' ? '#27ae60'
                 : result.baseline.quality === 'moderate' ? '#f39c12'
                 : result.baseline.quality === 'weak' ? '#e67e22'
                 : '#95a5a6',
            fontWeight: 600,
          }}>{result.baseline.quality}</span></span>
          <span><strong>Hard-fail runs excluded:</strong> {result.baseline.hardFailsExcluded}</span>
        </div>
        {result.baseline.warning && (
          <div style={{ fontSize: '0.75rem', color: '#e67e22', marginTop: '0.25rem' }}>
            ⚠ {result.baseline.warning}
          </div>
        )}
      </div>

      {/* Anomaly flags */}
      {result.flags.length > 0 && (
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
              {result.flags
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

function severityRank(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s];
}

// ── Summary Tiles ────────────────────────────────────────────────────────

function SummaryTiles({ result }: { result: AnomalyBatchResult }) {
  const { summary } = result;
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

// ── Sort helper ──────────────────────────────────────────────────────────

type SortKey = 'score' | 'driver' | 'et' | 'mph' | 'flags' | 'band' | 'category';
type SortDir = 'asc' | 'desc';

function sortRuns(
  results: RunAnomalyResult[],
  runMap: Map<number, RunWithWeather>,
  sortKey: SortKey,
  sortDir: SortDir,
): RunAnomalyResult[] {
  const sorted = [...results];
  sorted.sort((a, b) => {
    let cmp = 0;
    const ra = runMap.get(a.runId);
    const rb = runMap.get(b.runId);
    switch (sortKey) {
      case 'score': cmp = a.overallScore - b.overallScore; break;
      case 'flags': cmp = a.flagCount - b.flagCount; break;
      case 'driver': cmp = (ra?.driver_name || '').localeCompare(rb?.driver_name || ''); break;
      case 'et': cmp = (ra?.ft1320 ?? 999) - (rb?.ft1320 ?? 999); break;
      case 'mph': cmp = (ra?.mph1320 ?? 0) - (rb?.mph1320 ?? 0); break;
      case 'category': cmp = (ra?.category || '').localeCompare(rb?.category || ''); break;
      case 'band': {
        const order: Record<ConfidenceBand, number> = { Critical: 0, Low: 1, Medium: 2, High: 3 };
        cmp = order[a.band] - order[b.band];
        break;
      }
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
  const [runs, setRuns] = useState<RunWithWeather[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnomalyBatchResult | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterBand, setFilterBand] = useState<ConfidenceBand | 'all'>('all');
  const [driverSearch, setDriverSearch] = useState('');

  // Fetch runs for the selected event + category
  const fetchRuns = useCallback(async () => {
    if (!event?.race_lookup) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSelectedRunId(null);
    try {
      const res = await parityApi.runsWithWeather({
        raceLookup: event.race_lookup,
        category: category || undefined,
        limit: 2000,
      });
      setRuns(res.runs);
      // Run anomaly analysis
      const analysis = analyzeRuns(res.runs);
      setResult(analysis);
    } catch (e: any) {
      setError(e.message || 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, [event?.race_lookup, category]);

  useEffect(() => { fetchRuns(); }, [fetchRuns, refreshKey]);

  // Build run lookup map
  const runMap = useMemo(() => {
    const m = new Map<number, RunWithWeather>();
    for (const r of runs) m.set(r.id, r);
    return m;
  }, [runs]);

  // Sort and filter
  const displayRuns = useMemo(() => {
    if (!result) return [];
    let filtered = result.runs;
    if (filterBand !== 'all') {
      filtered = filtered.filter(r => r.band === filterBand);
    }
    if (driverSearch) {
      const q = driverSearch.toLowerCase();
      filtered = filtered.filter(r => {
        const run = runMap.get(r.runId);
        return run?.driver_name?.toLowerCase().includes(q);
      });
    }
    return sortRuns(filtered, runMap, sortKey, sortDir);
  }, [result, filterBand, driverSearch, sortKey, sortDir, runMap]);

  const selectedResult = result?.runs.find(r => r.runId === selectedRunId) ?? null;
  const selectedRun = selectedRunId ? runMap.get(selectedRunId) ?? null : null;

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
    return <div style={S.card}><p style={{ color: 'var(--color-muted)' }}>Select an event to analyze run integrity.</p></div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>
          Anomalies — {event.event_name}
          {category && <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}> · {category}</span>}
        </h2>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={S.card}>
          <span style={{ color: 'var(--color-muted)' }}>Analyzing {category || 'all'} runs…</span>
        </div>
      )}
      {error && (
        <div style={{
          ...S.card,
          background: 'rgba(220,50,50,0.08)',
          border: '1px solid rgba(220,50,50,0.3)',
        }}>
          <strong>Error:</strong> {error}
          <button style={{ ...S.btn('secondary'), marginLeft: '0.5rem', fontSize: '0.7rem' }} onClick={fetchRuns}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Summary tiles */}
          <SummaryTiles result={result} />

          {/* Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={filterBand}
              onChange={e => setFilterBand(e.target.value as ConfidenceBand | 'all')}
              style={{ ...S.input, width: 130 }}
            >
              <option value="all">All Bands</option>
              <option value="Critical">Critical Only</option>
              <option value="Low">Low Only</option>
              <option value="Medium">Medium Only</option>
              <option value="High">High Only</option>
            </select>
            <input
              type="text"
              placeholder="Driver search…"
              value={driverSearch}
              onChange={e => setDriverSearch(e.target.value)}
              style={{ ...S.input, width: 160 }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Showing {displayRuns.length} of {result.runs.length} runs
            </span>
            {/* Field legend */}
            <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
              Fields: RT · 60′ · 330′ · 660′ · 660mph · 1000′ · ET · MPH
            </span>
          </div>

          {/* Detail panel (shown above table when a run is selected) */}
          {selectedResult && selectedRun && (
            <RunDetailPanel
              result={selectedResult}
              run={selectedRun}
              onClose={() => setSelectedRunId(null)}
            />
          )}

          {/* Main table */}
          <div style={{ ...S.card, padding: '0.5rem', overflow: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th} onClick={() => toggleSort('score')}>Score{sortIndicator('score')}</th>
                  <th style={S.th} onClick={() => toggleSort('band')}>Band{sortIndicator('band')}</th>
                  <th style={S.th} onClick={() => toggleSort('driver')}>Driver{sortIndicator('driver')}</th>
                  <th style={S.th} onClick={() => toggleSort('category')}>Category{sortIndicator('category')}</th>
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
                  const run = runMap.get(r.runId);
                  if (!run) return null;
                  const isSelected = selectedRunId === r.runId;
                  return (
                    <tr
                      key={r.runId}
                      onClick={() => setSelectedRunId(isSelected ? null : r.runId)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(52,152,219,0.08)' : undefined,
                      }}
                    >
                      <td style={S.td}><ConfidenceChip score={r.overallScore} band={r.band} /></td>
                      <td style={S.td}><BandBadge band={r.band} /></td>
                      <td style={{ ...S.td, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {run.driver_name || '—'}
                      </td>
                      <td style={S.td}>{run.category || '—'}</td>
                      <td style={S.td}>{run.lane || '—'}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace' }}>{formatET(run.ft1320)}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace' }}>{formatMPH(run.mph1320)}</td>
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
                        <span style={{
                          color: r.baseline.quality === 'strong' ? '#27ae60'
                               : r.baseline.quality === 'moderate' ? '#f39c12'
                               : r.baseline.quality === 'weak' ? '#e67e22' : '#95a5a6',
                        }}>
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
                {result.runs.length === 0 ? 'No runs found for this event/category.' : 'No runs match the current filter.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
