import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  parityApi,
  type ParitySummaryResponse,
  type ParityDeltasResponse,
  type ParityAllRunsResponse,
  type ParityQualOrderResponse,
  type ParityIncrementalsResponse,
  type ParitySessionWeatherResponse,
  type ParityComboRun,
  type ParityDeltaRow,
  type RangeParityMatrixResponse,
  type EventWithStats,
} from '../services/parityApi';
import { useCapabilities } from '../domain/config/useCapabilities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import {
  formatET, formatMPH, formatBaro, formatHPC,
  formatTemp, formatRH, formatDA,
  formatMetric, formatDelta, isIncrementalMph,
} from '../domain/parity/format';

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

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function fmtCsv(v: number | null | undefined, metric: string): string {
  if (v == null) return '';
  return isMphMetric(metric) ? v.toFixed(2) : v.toFixed(3);
}

function exportComboCsv(data: ParitySummaryResponse) {
  const m = data.metric;
  const L: string[] = [];
  L.push(`Event,${data.event.event_name}`);
  L.push(`Class,${data.classIndex},Metric,${data.metric},Mode,${data.mode},Session,${data.sessionScope},TopN,${data.topN}`);
  L.push('');
  L.push('Engine Combo,Best,Avg Top N,Total Avg,Spread,Top N Used,Active,Total,Excluded,Wx%');
  for (const c of data.combos) {
    L.push([c.engineCombo, fmtCsv(c.bestValue, m), fmtCsv(c.avgTopN, m), fmtCsv(c.totalAvg, m), fmtCsv(c.spread, m), c.countTopN,
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
// EVENT PARITY VIEW  (legacy-sheet layout)
// Template order: 1) Mapping banner → 2) Combo summary → 3) Grouped chart →
//   4) Incrementals → 5) Weather → 6) Delta tables → 7) Qual order (collapsible)
// Admin sections (truth table, audit drilldown) stay but move below main content.
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

  // Lazy sections
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

  // Incrementals + weather (loaded with summary)
  const [incData, setIncData] = useState<ParityIncrementalsResponse | null>(null);
  const [wxData, setWxData] = useState<ParitySessionWeatherResponse | null>(null);

  const { role } = useCapabilities();
  const isAdmin = role === 'owner' || role === 'admin';

  // Reset triggers when metric type changes (ET ↔ MPH)
  useEffect(() => { setTriggers(defaultTriggers(metric)); }, [metric]);

  // ── Fetch summary + incrementals + weather on param change ──
  const fetchSummary = useCallback(() => {
    if (!event) return;
    const params = { eventId: event.id, classIndex, metric, mode, topN, sessionScope, includeUnknown };
    const key = cacheKey('paritySummary', params);
    setLoading(true); setError(''); setExpandedCombo(null);
    setShowDeltas(false); setDeltasData(null);
    setShowQualOrder(false); setQualData(null);
    setShowTruthTable(false); setRunsData(null); setRunsPage(1); setDriverSearch('');
    setIncData(null); setWxData(null);
    Promise.all([
      cachedFetch(key, () => parityApi.paritySummary(params)),
      cachedFetch(cacheKey('parityIncrementals', { eventId: event.id, classIndex, sessionScope }),
        () => parityApi.parityIncrementals({ eventId: event.id, classIndex, sessionScope })),
      cachedFetch(cacheKey('paritySessionWeather', { eventId: event.id, classIndex }),
        () => parityApi.paritySessionWeather({ eventId: event.id, classIndex })),
    ])
      .then(([s, i, w]) => { setSummary(s); setIncData(i); setWxData(w); })
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

  // Build grouped bar data: one row per combo, run1..runN as separate keys
  const groupedBarData = (summary?.combos ?? [])
    .filter(c => c.topRuns && c.topRuns.length > 0)
    .map(c => {
      const row: Record<string, any> = { name: c.engineCombo, fill: comboColor(c.engineCombo) };
      c.topRuns.slice(0, topN).forEach((r, i) => {
        row[`run${i + 1}`] = r.value;
        row[`driver${i + 1}`] = r.driver;
        row[`round${i + 1}`] = r.round;
      });
      return row;
    });
  const runKeys = Array.from({ length: topN }, (_, i) => `run${i + 1}`);

  return (
    <div data-testid="parity-dash-event">
      {/* ── Header ── */}
      <h2 style={{ ...S.h1, fontSize: '1.1rem' }} data-testid="dash-header">Event Parity{summary ? ` — ${summary.event.event_name}` : ''}</h2>
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

      {loading && <p style={S.hint}>Loading parity summary...</p>}
      {error && <div style={S.error}>{error}</div>}

      {/* ══════ 1) MAPPING READINESS BANNER ══════ */}
      {mapping && (
        <MappingBanner mappedPct={mappedPct} mapping={mapping} readinessLevel={readinessLevel}
          isAdmin={isAdmin} onShowFallback={() => setShowFallback(!showFallback)} showFallback={showFallback} />
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

      {/* ── Fallback: group by driver (low readiness) ── */}
      {readinessLevel === 'low' && showFallback && summary && summary.totalRunsInClass > 0 && (
        <FallbackDriverView eventId={event.id} classIndex={classIndex} metric={metric} mode={mode} sessionScope={sessionScope} />
      )}

      {summary && summary.combos.length === 0 && !loading && readinessLevel !== 'low' && (
        <div style={S.hint}>No combo-mapped runs found for class {classIndex} at this event.</div>
      )}

      {summary && summary.combos.length > 0 && readinessLevel !== 'low' && (
        <>
          {/* ══════ 2) COMBO SUMMARY TABLE ══════ */}
          <div style={{ ...S.card, padding: '0.5rem', overflowX: 'auto' }} data-testid="dash-combo-summary">
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Combo Summary</h3>
            <ComboSummaryTable combos={summary.combos} metric={metric} topN={topN} isLB={summary.isLowerBetter}
              expandedCombo={expandedCombo} setExpandedCombo={setExpandedCombo} mode={mode} />
          </div>

          {/* ══════ 3) GROUPED BAR CHART — Quickest N individual runs per combo ══════ */}
          <div data-testid="dash-grouped-chart">
          {groupedBarData.length > 0 && (
            <div style={{ ...S.card, padding: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Quickest {topN} Per Combo — {metricLabel}</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, groupedBarData.length * 60)}>
                <BarChart data={groupedBarData} layout="vertical" margin={{ top: 4, right: 30, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 10 }} domain={['dataMin - 0.05', 'dataMax + 0.05']} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: number, _name: string, props: any) => {
                      const idx = parseInt((_name as string).replace('run', '')) - 1;
                      const driver = props.payload?.[`driver${idx + 1}`] ?? '';
                      const round = props.payload?.[`round${idx + 1}`] ?? '';
                      return [`${formatMetric(v, metric)} — ${driver} (${round})`, `Run ${idx + 1}`];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
                  {runKeys.map((k, i) => (
                    <Bar key={k} dataKey={k} name={`#${i + 1} Quickest`} barSize={10}>
                      {groupedBarData.map((d, j) => <Cell key={j} fill={d.fill + (i === 0 ? 'ff' : i === 1 ? 'cc' : i === 2 ? '99' : '66')} />)}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '0.6rem', color: '#888', marginTop: 4, textAlign: 'center' }}>
                Bars = individual runs (darkest → quickest). Hover for driver + round.
              </div>
            </div>
          )}
          </div>

          {/* ══════ 4) INCREMENTALS BY COMBO (Optimal Run) ══════ */}
          <div data-testid="dash-incrementals">
            <div style={{ ...S.card, padding: '0.5rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Incrementals by Combo (Optimal Run)</h3>
              <p style={{ fontSize: '0.6rem', color: '#888', margin: '0 0 0.3rem', fontStyle: 'italic' }}>
                Best-of-each incremental — ET: MIN per segment, MPH: MAX per segment. Not a real run.
              </p>
              {incData ? <IncrementalsTable data={incData} /> : <p style={S.hint}>Loading incrementals...</p>}
            </div>
          </div>

          {/* ══════ 5) WEATHER BY SESSION ══════ */}
          <div data-testid="dash-weather">
            <div style={{ ...S.card, padding: '0.5rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Weather by Session</h3>
              {wxData ? <WeatherSessionTable data={wxData} /> : <p style={S.hint}>Loading weather...</p>}
            </div>
          </div>

          {/* ══════ 6) DELTA COMPARISON TABLES ══════ */}
          <div style={{ ...S.card, padding: '0.5rem' }} data-testid="dash-delta-tables">
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
            {showDeltas && deltasData && <DeltaMatrixSection matrices={deltasData.deltaMatrices} topN={topN} triggers={triggers} metric={metric} />}
          </div>

          {/* ══════ 7) QUALIFYING ORDER (collapsible) ══════ */}
          <div style={{ ...S.card, padding: '0.5rem' }} data-testid="dash-qual-order">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <h3 style={{ fontSize: '0.85rem' }}>Qualifying Order</h3>
              <button style={S.sectionToggle} onClick={() => setShowQualOrder(!showQualOrder)}>
                {showQualOrder ? 'Hide' : 'Show Qual Order'}
              </button>
            </div>
            {showQualOrder && qualLoading && <p style={S.hint}>Loading qualifying order...</p>}
            {showQualOrder && qualData && <QualOrderTable qualOrder={qualData.qualOrder} />}
          </div>

          {/* ── Admin: Truth table (collapsed) ── */}
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
// 1) MAPPING READINESS BANNER
// ══════════════════════════════════════════════════════════════════════════════

function MappingBanner({ mappedPct, mapping, readinessLevel, isAdmin, onShowFallback, showFallback }: {
  mappedPct: number; mapping: ParitySummaryResponse['mapping']; readinessLevel: 'low' | 'partial' | 'full';
  isAdmin: boolean; onShowFallback: () => void; showFallback: boolean;
}) {
  if (!mapping) return null;

  if (readinessLevel === 'low') return (
    <div data-testid="dash-mapping-banner" style={{ ...S.card, background: '#2d1b1b', border: '1px solid #ef4444', padding: '0.75rem', marginBottom: '1rem' }}>
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
        <button style={S.sectionToggle} onClick={onShowFallback}>
          {showFallback ? 'Hide' : 'Show'} Fallback (Group by Driver)
        </button>
      </div>
    </div>
  );

  if (readinessLevel === 'partial') return (
    <div data-testid="dash-mapping-banner" style={{ ...S.card, background: '#332b00', border: '1px solid #eab308', padding: '0.6rem 0.75rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={S.badge('#eab308')}>Partial Mapping: {mappedPct}%</span>
        <span style={{ color: '#eab308', fontSize: '0.75rem' }}>
          Results are partial — {mapping.unknownRunCount} unmapped run{mapping.unknownRunCount !== 1 ? 's' : ''} excluded.
        </span>
        {mapping.topMissingDrivers.length > 0 && (
          <span style={{ color: '#eab308', fontSize: '0.65rem' }}>
            Top: {mapping.topMissingDrivers.slice(0, 3).map(d => `${d.driver} (${d.runCount})`).join(', ')}
          </span>
        )}
        {isAdmin && <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>Assign Combos →</button>}
      </div>
    </div>
  );

  // full
  return (
    <div data-testid="dash-mapping-banner" style={{ ...S.row, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
      <span style={S.badge('#22c55e')}>Mapped: {mappedPct}% ({mapping.mappedRunCount}/{mapping.mappedRunCount + mapping.unknownRunCount})</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2) COMBO SUMMARY TABLE  (Quickest / Avg Top N / Total Avg / Runs active/total)
// ══════════════════════════════════════════════════════════════════════════════

function ComboSummaryTable({ combos, metric, topN, isLB, expandedCombo, setExpandedCombo, mode }: {
  combos: ParitySummaryResponse['combos']; metric: string; topN: number; isLB: boolean;
  expandedCombo: string | null; setExpandedCombo: (c: string | null) => void; mode: string;
}) {
  const bestComboValue = combos.length
    ? (isLB
      ? Math.min(...combos.filter(c => c.bestValue != null).map(c => c.bestValue!))
      : Math.max(...combos.filter(c => c.bestValue != null).map(c => c.bestValue!)))
    : null;

  return (
    <table style={S.table}>
      <thead>
        <tr>
          <th style={S.th}>Engine Combo</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Quickest</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Avg Top {topN}</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Total Avg</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Runs</th>
          <th style={{ ...S.th, textAlign: 'center' }}>Wx%</th>
          <th style={S.th}></th>
        </tr>
      </thead>
      <tbody>
        {combos.map(c => {
          const isBest = c.bestValue != null && c.bestValue === bestComboValue;
          const expanded = expandedCombo === c.engineCombo;
          return (
            <React.Fragment key={c.engineCombo}>
              <tr style={{ background: isBest ? 'rgba(34,197,94,0.08)' : undefined }}>
                <td style={S.td}>
                  <span style={S.badge(comboColor(c.engineCombo))}>{c.engineCombo}</span>
                  {isBest && <span style={{ ...S.badge('#22c55e'), marginLeft: 6, fontSize: '0.55rem' }}>BEST</span>}
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                  {c.bestValue != null ? formatMetric(c.bestValue, metric) : <span style={S.noData}>No Data</span>}
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>
                  {c.avgTopN != null ? formatMetric(c.avgTopN, metric) : <span style={S.noData}>No Data</span>}
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>
                  {c.totalAvg != null ? formatMetric(c.totalAvg, metric) : <span style={S.noData}>No Data</span>}
                </td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  {c.countActive}{c.countTotal !== c.countActive ? ` / ${c.countTotal}` : ''}
                </td>
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
              {expanded && <AuditDrilldown runs={c.topRuns} mode={mode} metric={metric} />}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4) INCREMENTALS TABLE (Optimal Run: MIN ET / MAX MPH)
// ══════════════════════════════════════════════════════════════════════════════

function IncrementalsTable({ data }: { data: ParityIncrementalsResponse }) {
  if (data.rows.length === 0) return <p style={S.hint}>No incremental data.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ ...S.table, fontSize: '0.7rem' }}>
        <thead>
          <tr>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Incremental</th>
            {data.combos.map(c => (
              <th key={c} style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>
                <span style={S.badge(comboColor(c))}>{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map(row => {
            const isMph = isIncrementalMph(row.key);
            return (
              <tr key={row.key}>
                <td style={{ ...S.td, fontWeight: 600 }}>
                  {row.label}
                  <span style={{ fontSize: '0.5rem', color: '#888', marginLeft: 4 }}>
                    ({row.isLowerBetter ? 'MIN' : 'MAX'})
                  </span>
                </td>
                {data.combos.map(c => {
                  const v = row.values[c];
                  return (
                    <td key={c} style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>
                      {v != null ? (isMph ? formatMPH(v) : formatET(v)) : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5) WEATHER BY SESSION TABLE
// ══════════════════════════════════════════════════════════════════════════════

function WeatherSessionTable({ data }: { data: ParitySessionWeatherResponse }) {
  if (!data.sessions || data.sessions.length === 0) return <p style={S.hint}>No weather data.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ ...S.table, fontSize: '0.7rem' }}>
        <thead>
          <tr>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Session</th>
            <th style={{ ...S.th, fontSize: '0.6rem' }}>Time Range</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Runs</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Temp °F</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>RH %</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Baro inHg</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>DA ft</th>
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>HPC</th>
          </tr>
        </thead>
        <tbody>
          {data.sessions.map((s: any) => (
            <tr key={s.session}>
              <td style={{ ...S.td, fontWeight: 600 }}>{s.session}</td>
              <td style={{ ...S.td, fontSize: '0.6rem' }}>{s.localTimeHint ?? '—'}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{s.runCount}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatTemp(s.temp_f)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatRH(s.rh_pct)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatBaro(s.pressure_inhg)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatDA(s.density_alt_ft)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatHPC(s.hpc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6) DELTA MATRIX SECTION  (uses user-editable triggers, "No Data" for nulls)
// ══════════════════════════════════════════════════════════════════════════════

function DeltaMatrixSection({ matrices, topN, triggers, metric }: {
  matrices: ParityDeltasResponse['deltaMatrices']; topN: number; triggers: TriggerSet; metric: string;
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
                      <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.valueA !== null ? formatMetric(r.valueA, metric) : <span style={S.noData}>No Data</span>}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.valueB !== null ? formatMetric(r.valueB, metric) : <span style={S.noData}>No Data</span>}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                        {hasNoData
                          ? <span style={S.noData}>No Data</span>
                          : r.delta !== null ? formatDelta(r.delta, metric) : '—'}
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
// 7) QUALIFYING ORDER TABLE
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
              <td style={S.td}><span style={S.badge(comboColor(r.engineCombo))}>{r.engineCombo}</span></td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatET(r.et)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMPH(r.mph)}</td>
              <td style={S.td}>{r.round ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRUTH TABLE (admin drilldown)
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
              <td style={S.td}><span style={{ ...S.badge(comboColor(r.engineCombo)), fontSize: '0.6rem' }}>{r.engineCombo}</span></td>
              <td style={S.td}>{r.driver}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatET(r.et)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMPH(r.mph)}</td>
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
// AUDIT DRILLDOWN (expanded run detail for a combo)
// ══════════════════════════════════════════════════════════════════════════════

function AuditDrilldown({ runs, mode, metric }: { runs: ParityComboRun[]; mode: string; metric: string }) {
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
            <th style={{ ...S.th, fontSize: '0.6rem', textAlign: 'right' }}>Baro</th>
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
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMetric(r.rawValue, metric)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{formatMetric(r.value, metric)}</td>
                  {mode === 'corrected' && <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{r.correctionFactor?.toFixed(4) ?? '—'}</td>}
                  <td style={{ ...S.td, fontSize: '0.55rem' }}>{r.timestamp?.slice(0, 16) ?? '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{w ? formatTemp(w.temp_f) : '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{w ? formatRH(w.rh_pct) : '—'}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{w ? formatBaro(w.pressure_inhg) : '—'}</td>
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
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatET(d.best.et)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMPH(d.best.mph)}</td>
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
                  <span style={S.badge(comboColor(cn))}>{cn}</span>
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
                          {v !== null ? formatMetric(v, metric) : '—'}
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
