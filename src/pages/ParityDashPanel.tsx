import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  parityApi,
  type ParitySummaryResponse,
  type ParityDeltasResponse,
  type ParityAllRunsResponse,
  type ParityQualOrderResponse,
  type ParityComboRun,
  type ParityDeltaRow,
  type RangeParityMatrixResponse,
  type EventWithStats,
} from '../services/parityApi';
import { useCapabilities } from '../domain/config/useCapabilities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Constants ────────────────────────────────────────────────────────────────

const PARITY_CLASSES = ['TF', 'FC', 'PRO', 'PSM', 'PM', 'TAD', 'TAFC'] as const;

const PARITY_METRICS = [
  { value: 'et_1320', label: 'ET 1320 ft' },
  { value: 'mph_1320', label: 'MPH 1320 ft' },
  { value: 'rt', label: 'Reaction Time' },
  { value: 't60', label: '60 ft' },
  { value: 't330', label: '330 ft' },
  { value: 't660', label: '660 ft' },
  { value: 'mph_660', label: 'MPH 660 ft' },
  { value: 't1000', label: '1000 ft' },
  { value: 'mph_1000', label: 'MPH 1000 ft' },
];

const TRUST_THRESHOLD = 60;
const MAPPED_LOW = 20;
const MAPPED_HIGH = 80;

// ── Deterministic combo colors via FNV-1a hash ─────────────────────────────
// Produces the same color for a given combo name across sessions/reloads.

const COMBO_PALETTE = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444',
  '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#f43f5e',
  '#a855f7', '#84cc16', '#f59e0b', '#0ea5e9', '#d946ef',
];

function fnv1aHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function comboColor(name: string): string {
  return COMBO_PALETTE[fnv1aHash(name) % COMBO_PALETTE.length];
}

// ── Trigger presets (ET vs MPH) ─────────────────────────────────────────────

type TriggerSet = { quickest: number; avgTopN: number; totalAvg: number };

const ET_TRIGGERS: TriggerSet = { quickest: 0.050, avgTopN: 0.030, totalAvg: 0.070 };
const MPH_TRIGGERS: TriggerSet = { quickest: 1.0, avgTopN: 0.6, totalAvg: 1.5 };

function isMphMetric(metric: string): boolean {
  return metric.startsWith('mph_');
}

function defaultTriggers(metric: string): TriggerSet {
  return isMphMetric(metric) ? { ...MPH_TRIGGERS } : { ...ET_TRIGGERS };
}

type ViewMode = 'event' | 'range';

// ── Simple param-key cache ──────────────────────────────────────────────────
const _cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 120_000;
function cacheKey(action: string, params: Record<string, unknown>): string {
  return action + '|' + JSON.stringify(params);
}
async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data as T;
  const data = await fetcher();
  _cache.set(key, { ts: Date.now(), data });
  return data;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  h1: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)' } as React.CSSProperties,
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' } as React.CSSProperties,
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' } as React.CSSProperties,
  th: { textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--color-border)', fontSize: '0.7rem', whiteSpace: 'nowrap' } as React.CSSProperties,
  td: { padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' } as React.CSSProperties,
  input: { padding: '0.25rem 0.4rem', border: '1px solid var(--color-border)', borderRadius: 3, fontSize: '0.75rem', fontFamily: 'inherit' } as React.CSSProperties,
  error: { background: '#2d1b1b', color: '#ef4444', padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: '0.8rem', marginBottom: '0.75rem' } as React.CSSProperties,
  hint: { color: 'var(--color-muted)', fontSize: '0.8rem', fontStyle: 'italic' } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 4,
    background: color + '22', color, fontSize: '0.65rem', fontWeight: 600,
  }) as React.CSSProperties,
  btn: (v: 'primary' | 'secondary' | 'danger') => ({
    padding: '0.35rem 0.75rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
    background: v === 'primary' ? 'var(--color-primary)' : v === 'danger' ? '#e74c3c' : 'var(--color-surface)',
    color: v === 'primary' || v === 'danger' ? '#fff' : 'var(--color-text)',
    border: v === 'secondary' ? '1px solid var(--color-border)' : 'none',
  }) as React.CSSProperties,
  tabActive: { borderBottom: '2px solid var(--color-primary)', fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem' } as React.CSSProperties,
  tabInactive: { borderBottom: '2px solid transparent', fontWeight: 400, color: 'var(--color-muted)', background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem' } as React.CSSProperties,
  sectionToggle: { background: 'none', border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text)' } as React.CSSProperties,
  noData: { color: '#888', fontStyle: 'italic', fontSize: '0.7rem' } as React.CSSProperties,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function trustColor(pct: number | null): string {
  if (pct == null) return '#888';
  if (pct >= 90) return '#22c55e';
  if (pct >= TRUST_THRESHOLD) return '#eab308';
  return '#ef4444';
}

function fmt(v: number | null, decimals = 4): string {
  return v != null ? v.toFixed(decimals) : '—';
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportComboCsv(data: ParitySummaryResponse) {
  const L: string[] = [];
  L.push(`Event,${data.event.event_name}`);
  L.push(`Class,${data.classIndex},Metric,${data.metric},Mode,${data.mode},Session,${data.sessionScope},TopN,${data.topN}`);
  L.push('');
  L.push('Engine Combo,Best,Avg Top N,Total Avg,Spread,Top N Used,Active,Total,Excluded,Wx%');
  for (const c of data.combos) {
    L.push([c.engineCombo, fmt(c.bestValue), fmt(c.avgTopN), fmt(c.totalAvg), fmt(c.spread), c.countTopN,
      c.countActive, c.countTotal, c.countExcluded, c.weatherCoveragePct ?? ''].join(','));
  }
  downloadCsv(`parity_${data.classIndex}_${data.metric}_${data.mode}_${data.eventId}.csv`, L.join('\n'));
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ParityDashPanel({ event }: { event: EventWithStats | null }) {
  const [viewMode, setViewMode] = useState<ViewMode>('event');
  const [classIndex, setClassIndex] = useState<string>('TF');
  const [metric, setMetric] = useState('et_1320');
  const [mode, setMode] = useState<'raw' | 'corrected'>('raw');
  const [topN, setTopN] = useState(4);
  const [sessionScope, setSessionScope] = useState<'qual' | 'elim' | 'both'>('both');

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: '1rem' }}>
        <button style={viewMode === 'event' ? S.tabActive : S.tabInactive} onClick={() => setViewMode('event')}>Event Parity</button>
        <button style={viewMode === 'range' ? S.tabActive : S.tabInactive} onClick={() => setViewMode('range')}>Season / Range</button>
      </div>
      <div style={{ ...S.row, marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.75rem' }}>Class:
          <select value={classIndex} onChange={e => setClassIndex(e.target.value)} style={{ ...S.input, width: 80, marginLeft: 4 }}>
            {PARITY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ fontSize: '0.75rem' }}>Session:
          <select value={sessionScope} onChange={e => setSessionScope(e.target.value as 'qual' | 'elim' | 'both')} style={{ ...S.input, width: 80, marginLeft: 4 }}>
            <option value="both">Both</option><option value="qual">Qual</option><option value="elim">Elim</option>
          </select>
        </label>
        <label style={{ fontSize: '0.75rem' }}>Metric:
          <select value={metric} onChange={e => setMetric(e.target.value)} style={{ ...S.input, width: 130, marginLeft: 4 }}>
            {PARITY_METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: '0.75rem' }}>Mode:
          <select value={mode} onChange={e => setMode(e.target.value as 'raw' | 'corrected')} style={{ ...S.input, width: 100, marginLeft: 4 }}>
            <option value="raw">Raw</option><option value="corrected">Corrected</option>
          </select>
        </label>
        <label style={{ fontSize: '0.75rem' }}>Top N:
          <select value={topN} onChange={e => setTopN(Number(e.target.value))} style={{ ...S.input, width: 55, marginLeft: 4 }}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      {viewMode === 'event' ? (
        <EventParityView event={event} classIndex={classIndex} metric={metric} mode={mode} topN={topN} sessionScope={sessionScope} />
      ) : (
        <RangeParityView classIndex={classIndex} metric={metric} mode={mode} topN={topN} sessionScope={sessionScope} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT PARITY VIEW  (lazy-load architecture, legacy sheet layout)
// Layout order: truth table (collapsed) → summary tiles → bar chart →
//               delta tables → combo summary → qual order (collapsed) → audit
// ══════════════════════════════════════════════════════════════════════════════

function EventParityView({ event, classIndex, metric, mode, topN, sessionScope }: {
  event: EventWithStats | null; classIndex: string; metric: string;
  mode: 'raw' | 'corrected'; topN: number; sessionScope: 'qual' | 'elim' | 'both';
}) {
  const [summary, setSummary] = useState<ParitySummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeUnknown, setIncludeUnknown] = useState(false);
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Trigger presets — user-editable
  const [triggers, setTriggers] = useState<TriggerSet>(defaultTriggers(metric));

  const [showDeltas, setShowDeltas] = useState(false);
  const [deltasData, setDeltasData] = useState<ParityDeltasResponse | null>(null);
  const [deltasLoading, setDeltasLoading] = useState(false);

  const [showQualOrder, setShowQualOrder] = useState(false);
  const [qualData, setQualData] = useState<ParityQualOrderResponse | null>(null);
  const [qualLoading, setQualLoading] = useState(false);

  const [showTruthTable, setShowTruthTable] = useState(false);
  const [runsData, setRunsData] = useState<ParityAllRunsResponse | null>(null);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsPage, setRunsPage] = useState(1);
  const [driverSearch, setDriverSearch] = useState('');
  const driverSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { role } = useCapabilities();
  const isAdmin = role === 'owner' || role === 'admin';

  // Reset triggers when metric type changes (ET ↔ MPH)
  useEffect(() => { setTriggers(defaultTriggers(metric)); }, [metric]);

  // ── Fetch summary on param change ──
  const fetchSummary = useCallback(() => {
    if (!event) return;
    const params = { eventId: event.id, classIndex, metric, mode, topN, sessionScope, includeUnknown };
    const key = cacheKey('paritySummary', params);
    setLoading(true); setError(''); setExpandedCombo(null);
    setShowDeltas(false); setDeltasData(null);
    setShowQualOrder(false); setQualData(null);
    setShowTruthTable(false); setRunsData(null); setRunsPage(1); setDriverSearch('');
    cachedFetch(key, () => parityApi.paritySummary(params))
      .then(setSummary)
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : 'Failed'); setSummary(null); })
      .finally(() => setLoading(false));
  }, [event?.id, classIndex, metric, mode, topN, sessionScope, includeUnknown]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ── Lazy: deltas ──
  useEffect(() => {
    if (!showDeltas || !event || deltasData) return;
    const params = { eventId: event.id, classIndex, metric, mode, topN, sessionScope, includeUnknown };
    const key = cacheKey('parityDeltas', params);
    setDeltasLoading(true);
    cachedFetch(key, () => parityApi.parityDeltas(params))
      .then(setDeltasData).catch(() => {}).finally(() => setDeltasLoading(false));
  }, [showDeltas]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy: qual order ──
  useEffect(() => {
    if (!showQualOrder || !event || qualData) return;
    const params = { eventId: event.id, classIndex, metric, mode, sessionScope };
    const key = cacheKey('parityQualOrder', params);
    setQualLoading(true);
    cachedFetch(key, () => parityApi.parityQualOrder(params))
      .then(setQualData).catch(() => {}).finally(() => setQualLoading(false));
  }, [showQualOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy: paginated truth table ──
  const fetchRuns = useCallback(() => {
    if (!showTruthTable || !event) return;
    const params = { eventId: event.id, classIndex, metric, mode, sessionScope, page: runsPage, pageSize: 50, driverSearch: driverSearch || undefined };
    const key = cacheKey('parityAllRuns', params);
    setRunsLoading(true);
    cachedFetch(key, () => parityApi.parityAllRuns(params))
      .then(setRunsData).catch(() => {}).finally(() => setRunsLoading(false));
  }, [showTruthTable, runsPage, driverSearch, event?.id, classIndex, metric, mode, sessionScope]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleDriverSearch = (val: string) => {
    if (driverSearchTimer.current) clearTimeout(driverSearchTimer.current);
    driverSearchTimer.current = setTimeout(() => { setDriverSearch(val); setRunsPage(1); }, 350);
  };

  if (!event) return <div style={S.card}><p style={S.hint}>Select an event above.</p></div>;

  const trust = summary?.trust;
  const mapping = summary?.mapping;
  const mappedPct = mapping?.mappedPct ?? 0;
  const readinessLevel: 'low' | 'partial' | 'full' = mappedPct < MAPPED_LOW ? 'low' : mappedPct < MAPPED_HIGH ? 'partial' : 'full';
  const metricLabel = PARITY_METRICS.find(m => m.value === metric)?.label ?? metric;

  const bestComboValue = summary?.combos.length
    ? (summary.isLowerBetter
      ? Math.min(...summary.combos.filter(c => c.bestValue != null).map(c => c.bestValue!))
      : Math.max(...summary.combos.filter(c => c.bestValue != null).map(c => c.bestValue!)))
    : null;

  const barData = summary?.combos
    .filter(c => c.avgTopN != null)
    .map(c => ({ name: c.engineCombo, avgTopN: c.avgTopN, best: c.bestValue, fill: comboColor(c.engineCombo) })) ?? [];

  return (
    <div>
      <h2 style={{ ...S.h1, fontSize: '1.1rem' }}>Event Parity{summary ? ` — ${summary.event.event_name}` : ''}</h2>
      {summary && (
        <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.75rem' }}>
          {summary.event.track_name} &nbsp;|&nbsp; {summary.event.start_date_local} → {summary.event.end_date_local}
          &nbsp;|&nbsp; {summary.sessionScope.toUpperCase()} &nbsp;|&nbsp; {metricLabel} ({summary.mode})
          &nbsp;|&nbsp; {summary.totalRunsInClass} runs
        </p>
      )}

      <div style={{ ...S.row, marginBottom: '0.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={includeUnknown} onChange={e => setIncludeUnknown(e.target.checked)} />
          Include Unknown
        </label>
        {summary && <button style={S.btn('secondary')} onClick={() => exportComboCsv(summary)}>Export CSV</button>}
      </div>

      {/* ══════ READINESS GATES ══════ */}
      {mapping && readinessLevel === 'low' && (
        <div style={{ ...S.card, background: '#2d1b1b', border: '1px solid #ef4444', padding: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ ...S.badge('#ef4444'), fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Low Mapping Coverage: {mappedPct}%</span>
          </div>
          <p style={{ color: '#ef9a9a', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
            Combo mapping coverage is only <strong>{mappedPct}%</strong>. Configure Assign Combos to use parity-by-combo.
          </p>
          {mapping.topMissingDrivers.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#ef9a9a', marginBottom: '0.5rem' }}>
              <strong>Top unmapped drivers:</strong>{' '}
              {mapping.topMissingDrivers.slice(0, 5).map(d => `${d.driver} (${d.runCount})`).join(', ')}
            </div>
          )}
          <div style={S.row}>
            {isAdmin && <button style={S.btn('primary')}>Assign Combos →</button>}
            <button style={S.sectionToggle} onClick={() => setShowFallback(!showFallback)}>
              {showFallback ? 'Hide' : 'Show'} Fallback (Group by Driver)
            </button>
          </div>
        </div>
      )}

      {mapping && readinessLevel === 'partial' && (
        <div style={{ ...S.card, background: '#332b00', border: '1px solid #eab308', padding: '0.6rem 0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={S.badge('#eab308')}>Partial Mapping: {mappedPct}%</span>
            <span style={{ color: '#eab308', fontSize: '0.75rem' }}>
              Results are partial — {mapping.unknownRunCount} unmapped run{mapping.unknownRunCount !== 1 ? 's' : ''} excluded.
            </span>
            {isAdmin && <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>Assign Combos →</button>}
          </div>
        </div>
      )}

      {mapping && readinessLevel === 'full' && (
        <div style={{ ...S.row, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
          <span style={S.badge('#22c55e')}>Mapped: {mappedPct}% ({mapping.mappedRunCount}/{mapping.mappedRunCount + mapping.unknownRunCount})</span>
        </div>
      )}

      {/* ── Trust indicators ── */}
      {trust && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={S.badge(trustColor(trust.weatherCoveragePct))}>
            Wx: {trust.weatherCoveragePct ?? 0}% ({trust.runsWithWeather}/{trust.totalRunsInScope})
          </span>
          {mode === 'corrected' && (
            <span style={S.badge(trustColor(trust.correctedCoveragePct))}>
              Corrected: {trust.correctedCoveragePct ?? 0}% ({trust.runsWithCorrected}/{trust.totalRunsInScope})
            </span>
          )}
          {!trust.hasTrackCoords && <span style={S.badge('#ef4444')}>No Track Coords</span>}
        </div>
      )}
      {trust && trust.weatherCoveragePct != null && trust.weatherCoveragePct < TRUST_THRESHOLD && (
        <div style={{ background: '#332b00', color: '#eab308', padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Weather coverage is {trust.weatherCoveragePct}% — corrected values may be unreliable.</span>
          {isAdmin && <button style={{ ...S.btn('secondary'), fontSize: '0.6rem', padding: '0.15rem 0.4rem' }}>Fix Data →</button>}
        </div>
      )}

      {loading && <p style={S.hint}>Loading parity summary...</p>}
      {error && <div style={S.error}>{error}</div>}

      {/* ── Fallback: group by driver (low readiness) ── */}
      {readinessLevel === 'low' && showFallback && summary && summary.totalRunsInClass > 0 && (
        <FallbackDriverView eventId={event.id} classIndex={classIndex} metric={metric} mode={mode} sessionScope={sessionScope} />
      )}

      {summary && summary.combos.length === 0 && !loading && readinessLevel !== 'low' && (
        <div style={S.hint}>No combo-mapped runs found for class {classIndex} at this event.</div>
      )}

      {summary && summary.combos.length > 0 && readinessLevel !== 'low' && (
        <>
          {/* ══════ LAYOUT ORDER (matches legacy sheets) ══════ */}

          {/* 1) Truth table (collapsed by default) */}
          <div style={{ ...S.card, padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.85rem' }}>All Runs{runsData ? ` (${runsData.totalRuns})` : ''}</h3>
              <div style={S.row}>
                {showTruthTable && (
                  <input placeholder="Search driver..." defaultValue={driverSearch}
                    onChange={e => handleDriverSearch(e.target.value)} style={{ ...S.input, width: 140 }} />
                )}
                <button style={S.sectionToggle} onClick={() => setShowTruthTable(!showTruthTable)}>
                  {showTruthTable ? 'Hide' : 'Show Truth Table'}
                </button>
              </div>
            </div>
            {showTruthTable && runsLoading && <p style={S.hint}>Loading runs...</p>}
            {showTruthTable && runsData && (
              <>
                <TruthTable runs={runsData.runs} />
                {runsData.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', fontSize: '0.75rem' }}>
                    <button disabled={runsPage <= 1} onClick={() => setRunsPage(p => p - 1)} style={S.sectionToggle}>← Prev</button>
                    <span>Page {runsData.page} / {runsData.totalPages}</span>
                    <button disabled={runsPage >= runsData.totalPages} onClick={() => setRunsPage(p => p + 1)} style={S.sectionToggle}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 2) Summary tiles */}
          <SummaryTiles data={summary} metricLabel={metricLabel} mode={mode} topN={topN} />

          {/* 3) Bar chart */}
          {barData.length > 0 && (
            <div style={{ ...S.card, padding: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>{classIndex} Avg Top {topN} Per Combo — {metricLabel}</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 40)}>
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={95} />
                  <Tooltip contentStyle={{ fontSize: '0.75rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
                  <Bar dataKey="avgTopN" name={`Avg Top ${topN}`}>
                    {barData.map((entry: { fill: string }, idx: number) => <Cell key={idx} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 4) Delta comparisons (lazy, with trigger inputs) */}
          <div style={{ ...S.card, padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.85rem' }}>Delta Comparisons</h3>
              <button style={S.sectionToggle} onClick={() => setShowDeltas(!showDeltas)}>
                {showDeltas ? 'Hide' : 'Show Delta Tables'}
              </button>
            </div>
            {showDeltas && (
              <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <TriggerInput label="Quickest" value={triggers.quickest} onChange={v => setTriggers(t => ({ ...t, quickest: v }))} isMph={isMphMetric(metric)} />
                <TriggerInput label="Avg Top N" value={triggers.avgTopN} onChange={v => setTriggers(t => ({ ...t, avgTopN: v }))} isMph={isMphMetric(metric)} />
                <TriggerInput label="Total Avg" value={triggers.totalAvg} onChange={v => setTriggers(t => ({ ...t, totalAvg: v }))} isMph={isMphMetric(metric)} />
                <button style={{ ...S.sectionToggle, fontSize: '0.6rem' }} onClick={() => setTriggers(defaultTriggers(metric))}>Reset</button>
              </div>
            )}
            {showDeltas && deltasLoading && <p style={S.hint}>Loading deltas...</p>}
            {showDeltas && deltasData && <DeltaMatrixSection matrices={deltasData.deltaMatrices} topN={topN} triggers={triggers} />}
          </div>

          {/* 5) Combo summary table (with audit drilldown) */}
          <div style={{ ...S.card, padding: '0.5rem', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Combo Summary</h3>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Engine Combo</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Best</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Avg Top {topN}</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Total Avg</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Spread</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Active</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Excl</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Wx%</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {summary.combos.map(c => {
                  const isBest = c.bestValue != null && c.bestValue === bestComboValue;
                  const expanded = expandedCombo === c.engineCombo;
                  return (
                    <React.Fragment key={c.engineCombo}>
                      <tr style={{ background: isBest ? 'rgba(34,197,94,0.08)' : undefined }}>
                        <td style={S.td}>
                          <span style={{ borderLeft: `3px solid ${comboColor(c.engineCombo)}`, paddingLeft: 6, fontWeight: isBest ? 700 : 400 }}>{c.engineCombo}</span>
                          {isBest && <span style={{ ...S.badge('#22c55e'), marginLeft: 6, fontSize: '0.55rem' }}>BEST</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{c.bestValue != null ? fmt(c.bestValue) : <span style={S.noData}>No Data</span>}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{c.avgTopN != null ? fmt(c.avgTopN) : <span style={S.noData}>No Data</span>}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{c.totalAvg != null ? fmt(c.totalAvg) : <span style={S.noData}>No Data</span>}</td>
                        <td style={{ ...S.td, textAlign: 'right', color: '#888' }}>{c.spread != null ? fmt(c.spread) : '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{c.countActive}</td>
                        <td style={{ ...S.td, textAlign: 'right', color: c.countExcluded > 0 ? '#ef4444' : '#888' }}>{c.countExcluded}</td>
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {c.weatherCoveragePct != null && <span style={{ ...S.badge(trustColor(c.weatherCoveragePct)), fontSize: '0.55rem' }}>{c.weatherCoveragePct}%</span>}
                        </td>
                        <td style={S.td}>
                          {c.topRuns.length > 0 && (
                            <button onClick={() => setExpandedCombo(expanded ? null : c.engineCombo)}
                              style={{ ...S.btn('secondary'), padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                              {expanded ? 'Hide' : `Audit (${c.topRuns.length})`}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded && <AuditDrilldown runs={c.topRuns} mode={mode} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 6) Qualifying order (collapsed by default) */}
          <div style={{ ...S.card, padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <h3 style={{ fontSize: '0.85rem' }}>Qualifying Order</h3>
              <button style={S.sectionToggle} onClick={() => setShowQualOrder(!showQualOrder)}>
                {showQualOrder ? 'Hide' : 'Show Qual Order'}
              </button>
            </div>
            {showQualOrder && qualLoading && <p style={S.hint}>Loading qualifying order...</p>}
            {showQualOrder && qualData && <QualOrderTable qualOrder={qualData.qualOrder} />}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRIGGER INPUT
// ══════════════════════════════════════════════════════════════════════════════

function TriggerInput({ label, value, onChange, isMph }: {
  label: string; value: number; onChange: (v: number) => void; isMph: boolean;
}) {
  const step = isMph ? 0.1 : 0.005;
  return (
    <label style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 3 }}>
      {label}:
      <input type="number" step={step} min={0} value={value}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) onChange(v); }}
        style={{ ...S.input, width: 60, fontSize: '0.65rem', textAlign: 'right' }} />
    </label>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACK DRIVER VIEW (when mapping < 20%)
// ══════════════════════════════════════════════════════════════════════════════

function FallbackDriverView({ eventId, classIndex, metric, mode, sessionScope }: {
  eventId: number; classIndex: string; metric: string; mode: 'raw' | 'corrected'; sessionScope: 'qual' | 'elim' | 'both';
}) {
  const [data, setData] = useState<ParityAllRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    parityApi.parityAllRuns({ eventId, classIndex, metric, mode, sessionScope, pageSize: 200 })
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [eventId, classIndex, metric, mode, sessionScope]);

  if (loading) return <p style={S.hint}>Loading driver view...</p>;
  if (!data || data.runs.length === 0) return <p style={S.hint}>No runs.</p>;

  const byDriver = new Map<string, ParityComboRun[]>();
  for (const r of data.runs) {
    if (!byDriver.has(r.driver)) byDriver.set(r.driver, []);
    byDriver.get(r.driver)!.push(r);
  }
  const isLower = data.isLowerBetter;
  const driverBest = [...byDriver.entries()].map(([driver, runs]) => {
    const sorted = [...runs].sort((a, b) => isLower ? a.value - b.value : b.value - a.value);
    return { driver, best: sorted[0], count: runs.length };
  }).sort((a, b) => isLower ? a.best.value - b.best.value : b.best.value - a.best.value);

  return (
    <div style={{ ...S.card, padding: '0.5rem', overflowX: 'auto' }}>
      <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Fallback: Best Per Driver (no combo mapping)</h3>
      <table style={{ ...S.table, fontSize: '0.7rem' }}>
        <thead>
          <tr>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>#</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Driver</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Best ET</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>MPH</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Round</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Runs</th>
          </tr>
        </thead>
        <tbody>
          {driverBest.map((d, i) => (
            <tr key={d.driver}>
              <td style={{ ...S.td, fontWeight: 600 }}>{i + 1}</td>
              <td style={S.td}>{d.driver}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{d.best.et?.toFixed(4) ?? '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{d.best.mph?.toFixed(2) ?? '—'}</td>
              <td style={S.td}>{d.best.round ?? '—'}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY TILES  (shows "No Data" when null)
// ══════════════════════════════════════════════════════════════════════════════

function SummaryTiles({ data, metricLabel, mode, topN }: {
  data: ParitySummaryResponse; metricLabel: string; mode: string; topN: number;
}) {
  const tiles: { label: string; field: 'bestValue' | 'avgTopN' | 'totalAvg' }[] = [
    { label: 'Quickest', field: 'bestValue' },
    { label: `Avg Top ${topN}`, field: 'avgTopN' },
    { label: 'Total Avg', field: 'totalAvg' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: '0.75rem', marginBottom: '1rem' }}>
      {tiles.map(t => (
        <div key={t.label} style={{ ...S.card, padding: '0.6rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600, marginBottom: '0.3rem' }}>{t.label} — {metricLabel} ({mode})</div>
          {data.combos.map(c => (
            <div key={c.engineCombo} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', fontSize: '0.75rem' }}>
              <span style={{ borderLeft: `3px solid ${comboColor(c.engineCombo)}`, paddingLeft: 6 }}>{c.engineCombo}</span>
              <span style={{ fontWeight: 600 }}>
                {c[t.field] != null ? fmt(c[t.field]) : <span style={S.noData}>No Data</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DELTA MATRIX SECTION  (uses user-editable triggers, "No Data" for nulls)
// ══════════════════════════════════════════════════════════════════════════════

function DeltaMatrixSection({ matrices, topN, triggers }: {
  matrices: ParityDeltasResponse['deltaMatrices']; topN: number; triggers: TriggerSet;
}) {
  const sections: { label: string; rows: ParityDeltaRow[]; trigger: number }[] = [
    { label: 'Quickest Delta', rows: matrices.quickest, trigger: triggers.quickest },
    { label: `Avg Top ${topN} Delta`, rows: matrices.avgTopN, trigger: triggers.avgTopN },
    { label: 'Total Avg Delta', rows: matrices.totalAvg, trigger: triggers.totalAvg },
  ];
  if (sections.every(s => s.rows.length === 0)) return <p style={S.hint}>Need 2+ combos for delta comparisons.</p>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
      {sections.map(s => (
        <div key={s.label} style={{ ...S.card, padding: '0.5rem', overflowX: 'auto', marginBottom: 0 }}>
          <h4 style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>{s.label} <span style={{ color: '#888', fontWeight: 400 }}>(±{s.trigger})</span></h4>
          {s.rows.length === 0 ? <p style={S.hint}>Need 2+ combos</p> : (
            <table style={{ ...S.table, fontSize: '0.7rem' }}>
              <thead><tr>
                <th style={{ ...S.th, fontSize: '0.65rem' }}>Combo A</th>
                <th style={{ ...S.th, fontSize: '0.65rem' }}>Combo B</th>
                <th style={{ ...S.th, fontSize: '0.65rem', textAlign: 'right' }}>A</th>
                <th style={{ ...S.th, fontSize: '0.65rem', textAlign: 'right' }}>B</th>
                <th style={{ ...S.th, fontSize: '0.65rem', textAlign: 'right' }}>Delta</th>
              </tr></thead>
              <tbody>
                {s.rows.map((r, i) => {
                  const hasNoData = r.valueA === null || r.valueB === null;
                  let bg = 'transparent';
                  if (!hasNoData && r.delta !== null) {
                    if (r.delta < -s.trigger) bg = 'rgba(239,68,68,0.15)';
                    else if (r.delta > s.trigger) bg = 'rgba(234,179,8,0.15)';
                  }
                  return (
                    <tr key={i} style={{ background: bg }}>
                      <td style={S.td}><span style={{ borderLeft: `3px solid ${comboColor(r.comboA)}`, paddingLeft: 4 }}>{r.comboA}</span></td>
                      <td style={S.td}><span style={{ borderLeft: `3px solid ${comboColor(r.comboB)}`, paddingLeft: 4 }}>{r.comboB}</span></td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{r.valueA !== null ? fmt(r.valueA) : <span style={S.noData}>No Data</span>}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{r.valueB !== null ? fmt(r.valueB) : <span style={S.noData}>No Data</span>}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>
                        {hasNoData
                          ? <span style={S.noData}>No Data</span>
                          : r.delta !== null ? (r.delta > 0 ? '+' : '') + r.delta.toFixed(4) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRUTH TABLE
// ══════════════════════════════════════════════════════════════════════════════

function TruthTable({ runs }: { runs: ParityComboRun[] }) {
  return (
    <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
      <table style={{ ...S.table, fontSize: '0.7rem' }}>
        <thead style={{ position: 'sticky', top: 0, background: 'var(--color-surface)' }}>
          <tr>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Combo</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Driver</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>ET</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>MPH</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Round</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {runs.map(r => (
            <tr key={r.runId}>
              <td style={S.td}><span style={{ borderLeft: `3px solid ${comboColor(r.engineCombo)}`, paddingLeft: 4, fontSize: '0.65rem' }}>{r.engineCombo}</span></td>
              <td style={S.td}>{r.driver}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.et?.toFixed(4) ?? '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.mph?.toFixed(2) ?? '—'}</td>
              <td style={S.td}>{r.round ?? '—'}</td>
              <td style={{ ...S.td, fontSize: '0.6rem' }}>{r.timestamp?.slice(0, 16) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// QUALIFYING ORDER TABLE
// ══════════════════════════════════════════════════════════════════════════════

function QualOrderTable({ qualOrder }: { qualOrder: ParityComboRun[] }) {
  if (qualOrder.length === 0) return <p style={S.hint}>No qualifying runs found.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ ...S.table, fontSize: '0.7rem' }}>
        <thead><tr>
          <th style={{ ...S.th, fontSize: '0.6rem' }}>#</th>
          <th style={{ ...S.th, fontSize: '0.6rem' }}>Driver</th>
          <th style={{ ...S.th, fontSize: '0.6rem' }}>Combo</th>
          <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>ET</th>
          <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>MPH</th>
          <th style={{ ...S.th, fontSize: '0.6rem' }}>Round</th>
        </tr></thead>
        <tbody>
          {qualOrder.map(r => (
            <tr key={r.runId}>
              <td style={{ ...S.td, fontWeight: 600 }}>{r.qualPosition}</td>
              <td style={S.td}>{r.driver}</td>
              <td style={S.td}><span style={{ borderLeft: `3px solid ${comboColor(r.engineCombo)}`, paddingLeft: 4 }}>{r.engineCombo}</span></td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.et?.toFixed(4) ?? '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.mph?.toFixed(2) ?? '—'}</td>
              <td style={S.td}>{r.round ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT DRILLDOWN
// ══════════════════════════════════════════════════════════════════════════════

function AuditDrilldown({ runs, mode }: { runs: ParityComboRun[]; mode: string }) {
  return (
    <tr>
      <td colSpan={9} style={{ padding: '0.5rem', background: 'var(--color-bg)' }}>
        <table style={{ ...S.table, fontSize: '0.65rem' }}>
          <thead><tr>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>#</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Driver</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Round</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Lane</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Raw</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>{mode === 'corrected' ? 'Corrected' : 'Value'}</th>
            {mode === 'corrected' && <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>CF</th>}
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Timestamp</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Temp</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>RH</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Press</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Wx</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Status</th>
          </tr></thead>
          <tbody>
            {runs.map((r, i) => {
              const w = r.weather;
              return (
                <tr key={r.runId}>
                  <td style={S.td}>{i + 1}</td>
                  <td style={S.td}>{r.driver}</td>
                  <td style={S.td}>{r.round ?? '—'}</td>
                  <td style={S.td}>{r.lane ?? '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.rawValue.toFixed(4)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{r.value.toFixed(4)}</td>
                  {mode === 'corrected' && <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.correctionFactor?.toFixed(4) ?? '—'}</td>}
                  <td style={{ ...S.td, fontSize: '0.55rem' }}>{r.timestamp?.slice(0, 16) ?? '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>{w ? w.temp_f.toFixed(1) : '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>{w ? w.rh_pct.toFixed(1) : '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>{w ? w.pressure_inhg.toFixed(3) : '—'}</td>
                  <td style={{ ...S.td, fontSize: '0.55rem' }}>{w?.source ?? '—'}</td>
                  <td style={S.td}>
                    {r.flagged && <span style={{ ...S.badge('#ef4444'), fontSize: '0.5rem' }}>FLAG</span>}
                    {r.dqFlag !== 0 && <span style={{ ...S.badge('#ef4444'), fontSize: '0.5rem', marginLeft: 2 }}>DQ</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RANGE PARITY VIEW
// ══════════════════════════════════════════════════════════════════════════════

function RangeParityView({ classIndex, metric, mode, topN, sessionScope }: {
  classIndex: string; metric: string; mode: 'raw' | 'corrected'; topN: number; sessionScope: 'qual' | 'elim' | 'both';
}) {
  const [data, setData] = useState<RangeParityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [cellField, setCellField] = useState<'best' | 'avgTopN' | 'totalAvg'>('best');

  const fetchData = useCallback(() => {
    const params = { classIndex, metric, mode, topN, sessionScope, year };
    const key = cacheKey('rangeParityMatrix', params);
    setLoading(true); setError('');
    cachedFetch(key, () => parityApi.rangeParityMatrix(params))
      .then(setData)
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : 'Failed'); setData(null); })
      .finally(() => setLoading(false));
  }, [classIndex, metric, mode, topN, sessionScope, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <h2 style={{ ...S.h1, fontSize: '1.1rem' }}>Season / Range Parity — {classIndex}</h2>
      <div style={{ ...S.row, marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.75rem' }}>Year:
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...S.input, width: 80, marginLeft: 4 }}>
            {[2025, 2024, 2023, 2022].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label style={{ fontSize: '0.75rem' }}>Cell value:
          <select value={cellField} onChange={e => setCellField(e.target.value as 'best' | 'avgTopN' | 'totalAvg')} style={{ ...S.input, width: 100, marginLeft: 4 }}>
            <option value="best">Quickest</option>
            <option value="avgTopN">Avg Top {topN}</option>
            <option value="totalAvg">Total Avg</option>
          </select>
        </label>
      </div>

      {loading && <p style={S.hint}>Loading range matrix...</p>}
      {error && <div style={S.error}>{error}</div>}
      {data && data.events.length === 0 && !loading && <div style={S.hint}>No events found for {year} with {classIndex} data.</div>}

      {data && data.events.length > 0 && data.combos.length > 0 && (
        <div style={{ ...S.card, padding: '0.5rem', overflowX: 'auto' }}>
          <table style={{ ...S.table, fontSize: '0.7rem' }}>
            <thead><tr>
              <th style={{ ...S.th, fontSize: '0.6rem', position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1 }}>Event</th>
              <th style={{ ...S.th, fontSize: '0.6rem' }}>Date</th>
              {data.combos.map(cn => (
                <th key={cn} style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>
                  <span style={{ borderLeft: `3px solid ${comboColor(cn)}`, paddingLeft: 4 }}>{cn}</span>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {data.events.map(ev => {
                const row = data.matrix[ev.eventId] ?? {};
                const vals = data.combos.map(cn => row[cn]?.[cellField] ?? null).filter((v): v is number => v !== null);
                const bestVal = vals.length > 0 ? (data.isLowerBetter ? Math.min(...vals) : Math.max(...vals)) : null;
                return (
                  <tr key={ev.eventId}>
                    <td style={{ ...S.td, position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1, whiteSpace: 'nowrap', fontSize: '0.65rem' }}>
                      {ev.event_name}
                    </td>
                    <td style={{ ...S.td, fontSize: '0.6rem', whiteSpace: 'nowrap' }}>{ev.start_date_local}</td>
                    {data.combos.map(cn => {
                      const cell = row[cn];
                      const v = cell?.[cellField] ?? null;
                      const isBest = v !== null && v === bestVal;
                      return (
                        <td key={cn} style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: isBest ? 700 : 400, color: isBest ? '#22c55e' : 'var(--color-text)', background: isBest ? 'rgba(34,197,94,0.08)' : undefined }}>
                          {v !== null ? v.toFixed(4) : '—'}
                          {cell && <span style={{ fontSize: '0.5rem', color: '#888', marginLeft: 2 }}>({cell.count})</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
