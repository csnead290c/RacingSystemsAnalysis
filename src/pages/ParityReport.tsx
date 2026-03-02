import React, { useState, useEffect, useCallback } from 'react';
import {
  parityApi,
  type ParitySummaryResponse,
  type ParityDeltasResponse,
  type ParityQualOrderResponse,
  type ParityIncrementalsResponse,
  type ParitySessionWeatherResponse,
  type ParityComboRun,
  type ParityDeltaRow,
  type RangeParityMatrixResponse,
  type EventWithStats,
} from '../services/parityApi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';
void Legend;
import {
  formatET, formatMPH, formatBaro, formatHPC,
  formatTemp, formatRH, formatDA,
  formatMetric, formatDelta, isIncrementalMph,
} from '../domain/parity/format';

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

const COMBO_PALETTE = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444',
  '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#f43f5e',
  '#a855f7', '#84cc16', '#f59e0b', '#0ea5e9', '#d946ef',
];

// Sequential color assignment — guarantees no collisions
const _comboColorMap = new Map<string, string>();
function comboColor(name: string): string {
  let c = _comboColorMap.get(name);
  if (!c) { c = COMBO_PALETTE[_comboColorMap.size % COMBO_PALETTE.length]; _comboColorMap.set(name, c); }
  return c;
}
// Keep fnv1aHash export for tests that reference it
function fnv1aHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
void fnv1aHash;

type TriggerSet = { quickest: number; avgTopN: number; totalAvg: number };
const ET_TRIGGERS: TriggerSet = { quickest: 0.050, avgTopN: 0.030, totalAvg: 0.070 };
const MPH_TRIGGERS: TriggerSet = { quickest: 1.0, avgTopN: 0.6, totalAvg: 1.5 };
function isMph(m: string) { return m.startsWith('mph_'); }
function defaultTriggers(m: string): TriggerSet { return isMph(m) ? { ...MPH_TRIGGERS } : { ...ET_TRIGGERS }; }

const _cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 120_000;
function ck(a: string, p: Record<string, unknown>): string { return a + '|' + JSON.stringify(p); }
async function cf<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const h = _cache.get(key);
  if (h && Date.now() - h.ts < CACHE_TTL) return h.data as T;
  const d = await fn(); _cache.set(key, { ts: Date.now(), data: d }); return d;
}

const S = {
  page: { fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1200, margin: '0 auto' } as React.CSSProperties,
  h1: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)' } as React.CSSProperties,
  h2: { fontSize: '1rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-text)', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.25rem' } as React.CSSProperties,
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' } as React.CSSProperties,
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' } as React.CSSProperties,
  tbl: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.72rem' },
  th: { textAlign: 'left' as const, padding: '0.3rem 0.5rem', borderBottom: '2px solid var(--color-border)', fontSize: '0.68rem', whiteSpace: 'nowrap' as const, fontWeight: 700 },
  td: { padding: '0.25rem 0.5rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' as const },
  inp: { padding: '0.25rem 0.4rem', border: '1px solid var(--color-border)', borderRadius: 3, fontSize: '0.75rem', fontFamily: 'inherit' } as React.CSSProperties,
  hint: { color: 'var(--color-muted)', fontSize: '0.8rem', fontStyle: 'italic' } as React.CSSProperties,
  nd: { color: '#888', fontStyle: 'italic' as const, fontSize: '0.68rem' },
  badge: (c: string) => ({ display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 4, background: c + '22', color: c, fontSize: '0.65rem', fontWeight: 600 }) as React.CSSProperties,
  btn: { padding: '0.3rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' } as React.CSSProperties,
  tabA: { borderBottom: '2px solid var(--color-primary)', fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem' } as React.CSSProperties,
  tabI: { borderBottom: '2px solid transparent', fontWeight: 400, color: 'var(--color-muted)', background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem' } as React.CSSProperties,
};

// Compact sub-styles for dense report tables (matches reference PDF layout)
const SS = {
  secHead: { fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.4rem', marginBottom: '0.2rem', background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)', whiteSpace: 'nowrap' as const } as React.CSSProperties,
  tbl: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.62rem' },
  th: { textAlign: 'left' as const, padding: '0.15rem 0.3rem', borderBottom: '2px solid var(--color-border)', fontSize: '0.58rem', whiteSpace: 'nowrap' as const, fontWeight: 700, background: 'var(--color-surface)' },
  td: { padding: '0.12rem 0.3rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' as const, whiteSpace: 'nowrap' as const, fontSize: '0.6rem' },
};

// fmt() replaced by shared formatET/formatMPH/formatMetric/formatDelta in domain/parity/format.ts

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

type Mode = 'event' | 'longTerm';

export default function ParityReport({ event }: { event: EventWithStats | null }) {
  const [mode, setMode] = useState<Mode>('event');
  const [classIndex, setClassIndex] = useState(() => sessionStorage.getItem('parity_classIndex') || 'TF');
  const sessionScope = 'both' as const;
  const [corrMode, setCorrMode] = useState<'raw' | 'corrected'>('raw');
  const metric = 'et_1320';
  const [overrideEv, setOverrideEv] = useState<number | null>(null);

  const handleClassChange = (c: string) => { setClassIndex(c); sessionStorage.setItem('parity_classIndex', c); };

  return (
    <div style={S.page}>
      <PrintStyle />
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem', alignItems: 'center' }}>
        <button style={mode === 'event' ? S.tabA : S.tabI} onClick={() => { setMode('event'); setOverrideEv(null); }}>Event Parity</button>
        <button style={mode === 'longTerm' ? S.tabA : S.tabI} onClick={() => setMode('longTerm')}>Long-Term Parity</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.72rem' }}>Class:<select value={classIndex} onChange={e => handleClassChange(e.target.value)} style={{ ...S.inp, width: 72, marginLeft: 4 }}>{PARITY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          <label style={{ fontSize: '0.72rem' }}>Mode:<select value={corrMode} onChange={e => setCorrMode(e.target.value as any)} style={{ ...S.inp, width: 90, marginLeft: 4 }}><option value="raw">Raw</option><option value="corrected">Corrected</option></select></label>
        </div>
      </div>
      {mode === 'event'
        ? <EventReport event={overrideEv ? { ...(event as any), id: overrideEv } : event} classIndex={classIndex} metric={metric} corrMode={corrMode} sessionScope={sessionScope} />
        : <LongTermReport classIndex={classIndex} metric={metric} corrMode={corrMode} sessionScope={sessionScope} onEventClick={id => { setOverrideEv(id); setMode('event'); }} />
      }
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EVENT PARITY REPORT
// ═════════════════════════════════════════════════════════════════════════════

function EventReport({ event, classIndex, metric, corrMode, sessionScope }: {
  event: EventWithStats | null; classIndex: string; metric: string;
  corrMode: 'raw' | 'corrected'; sessionScope: 'qual' | 'elim' | 'both';
}) {
  const topN = 4;
  const [summary, setSummary] = useState<ParitySummaryResponse | null>(null);
  const [deltas, setDeltas] = useState<ParityDeltasResponse | null>(null);
  const [qualOrder, setQualOrder] = useState<ParityQualOrderResponse | null>(null);
  const [inc, setInc] = useState<ParityIncrementalsResponse | null>(null);
  const [wx, setWx] = useState<ParitySessionWeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [triggers, setTriggers] = useState<TriggerSet>(defaultTriggers(metric));
  useEffect(() => { setTriggers(defaultTriggers(metric)); }, [metric]);

  const load = useCallback(() => {
    if (!event) return;
    setLoading(true); setErr('');
    const b = { eventId: event.id, classIndex, metric, mode: corrMode, topN, sessionScope };
    Promise.all([
      cf(ck('sum', b), () => parityApi.paritySummary(b)),
      cf(ck('del', b), () => parityApi.parityDeltas(b)),
      cf(ck('qo', { eventId: event.id, classIndex, metric, mode: corrMode, sessionScope }), () => parityApi.parityQualOrder({ eventId: event.id, classIndex, metric, mode: corrMode, sessionScope })),
      cf(ck('inc', { eventId: event.id, classIndex, sessionScope }), () => parityApi.parityIncrementals({ eventId: event.id, classIndex, sessionScope })),
      cf(ck('wx', { eventId: event.id, classIndex }), () => parityApi.paritySessionWeather({ eventId: event.id, classIndex })),
    ]).then(([s, d, q, i, w]) => { setSummary(s); setDeltas(d); setQualOrder(q); setInc(i); setWx(w); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [event?.id, classIndex, metric, corrMode, sessionScope]);
  useEffect(() => { load(); }, [load]);

  if (!event) return <div style={S.card}><p style={S.hint}>Select an event above.</p></div>;
  if (loading) return <p style={S.hint}>Loading Event Parity Report...</p>;
  if (err) return <div style={{ ...S.card, color: '#ef4444' }}>{err}</div>;
  if (!summary) return null;

  const modeLabel = corrMode === 'raw' ? 'Raw Data' : 'Corrected';
  const evYear = summary.event.start_date_local?.slice(0, 4) ?? '';
  const evCode = (event as any).event_code
    || eventShortCode({ event_name: summary.event.event_name || '', start_date_local: summary.event.start_date_local || '' }).replace(/^\d{4}\s*/, '');

  // Compute best value across all combos for delta reference
  const isLB = summary.isLowerBetter;
  const combosSorted = [...summary.combos].filter(c => c.bestValue != null).sort((a, b) =>
    isLB ? (a.bestValue! - b.bestValue!) : (b.bestValue! - a.bestValue!)
  );
  const bestComboValue = combosSorted[0]?.bestValue ?? null;
  const bestAvg4Value = combosSorted.length > 0
    ? combosSorted.reduce((best, c) => {
        if (c.avgTopN == null) return best;
        if (best == null) return c.avgTopN;
        return isLB ? Math.min(best, c.avgTopN) : Math.max(best, c.avgTopN);
      }, null as number | null)
    : null;

  // Build interleaved bar chart: flatten all top runs, sort quickest→slowest
  const interleavedBars = summary.combos
    .flatMap(c => c.topRuns.slice(0, topN).map((r, ri) => ({
      label: `${ri + 1}`,
      value: r.value,
      driver: r.driver,
      round: r.round,
      combo: c.engineCombo,
      fill: comboColor(c.engineCombo),
    })))
    .filter(b => b.value != null)
    .sort((a, b) => isLB ? a.value - b.value : b.value - a.value)
    .map((b, i) => ({ ...b, label: `${i + 1}` }));

  // Best total average reference
  const bestTotalAvg = combosSorted.reduce((best, x) => {
    if (x.totalAvg == null) return best;
    if (best == null) return x.totalAvg;
    return isLB ? Math.min(best, x.totalAvg) : Math.max(best, x.totalAvg);
  }, null as number | null);

  return (
    <div className="parity-event-report" data-testid="parity-event-report" style={{ pageBreakAfter: 'always' }}>
      {/* ── Title Block ── */}
      <div data-testid="parity-header" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {evYear} {evCode} NHRA {classIndex} {modeLabel} Event Parity
          </h2>
          <span style={{ fontSize: '0.65rem', color: '#888' }}>
            {sessionScope.toUpperCase()} | {summary.totalRunsInClass} runs
          </span>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#999', marginTop: '0.15rem' }}>
          {summary.event.event_name} — {summary.event.track_name}{summary.event.city ? `, ${summary.event.city}` : ''}
        </div>
      </div>

      {/* ── Section 1: Top Runs Table (full width) ── */}
      <div style={{ marginBottom: '0.6rem' }}>
        <div style={SS.secHead}>Quickest {topN} Runs Per Combo</div>
        <table style={SS.tbl}>
          <thead><tr>
            <th style={SS.th}>Engine Combo</th><th style={SS.th}>Driver</th>
            <th style={{ ...SS.th, textAlign: 'right' }}>ET</th><th style={{ ...SS.th, textAlign: 'right' }}>Speed</th>
            <th style={SS.th}>Red</th>
          </tr></thead>
          <tbody>
            {summary.combos.flatMap(c => c.topRuns.slice(0, topN).map((r, ri) => (
              <tr key={`${c.engineCombo}-${ri}`} style={{ background: ri === 0 ? comboColor(c.engineCombo) + '18' : undefined }}>
                {ri === 0
                  ? <td style={{ ...SS.td, fontWeight: 700 }} rowSpan={Math.min(c.topRuns.length, topN)}>
                      <span style={{ ...S.badge(comboColor(c.engineCombo)), fontSize: '0.62rem' }}>{c.engineCombo}</span>
                    </td>
                  : null}
                <td style={SS.td}>{r.driver}</td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatET(r.et)}</td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMPH(r.mph)}</td>
                <td style={SS.td}>{r.dqFlag ? '🔴' : ''}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* ── Section 2: Three summary comparison tables ── */}
      <div data-testid="parity-combo-summary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <SummaryCompactTable title="Quickest Run" combos={combosSorted} refValue={bestComboValue} getValue={c => c.bestValue} metric={metric} />
        <SummaryCompactTable title={`Avg Top ${topN}`} combos={combosSorted} refValue={bestAvg4Value} getValue={c => c.avgTopN} metric={metric} />
        <SummaryCompactTable title="Total Average" combos={combosSorted} refValue={bestTotalAvg} getValue={c => c.totalAvg} metric={metric} />
      </div>

      {/* ── Section 3: Bar Chart (full width) ── */}
      <div data-testid="parity-grouped-chart" style={{ marginBottom: '0.6rem', pageBreakInside: 'avoid' }}>
        <div style={SS.secHead}>Quickest {topN} Runs Per Combo</div>
        {interleavedBars.length > 0 ? (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.3rem' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={interleavedBars} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={0} height={18} />
                <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(2)} width={44} />
                <Tooltip
                  formatter={(v: number, _name: string, props: any) => {
                    const p = props.payload;
                    return [`${formatMetric(v, metric)} — ${p.driver || ''} (${p.round || ''})`, p.combo || ''];
                  }}
                />
                <Bar dataKey="value" barSize={14}>
                  {interleavedBars.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p style={S.hint}>No combo data for chart.</p>}
      </div>

      {/* ── Section 4: Qual Results + Incrementals side-by-side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <div data-testid="parity-qual-results">
          <div style={SS.secHead}>Raw Qualifying Results</div>
          {qualOrder ? <QualTable rows={qualOrder.qualOrder} /> : <p style={S.hint}>Loading...</p>}
        </div>
        <div data-testid="parity-incrementals">
          <div style={SS.secHead}>Incrementals</div>
          {inc ? <IncrementalsTable data={inc} /> : <p style={S.hint}>Loading...</p>}
        </div>
      </div>

      {/* ── Section 5: Weather + Deltas side-by-side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <div data-testid="parity-weather">
          <div style={SS.secHead}>Weather by Session</div>
          {wx ? <WeatherTable data={wx} /> : <p style={S.hint}>Loading...</p>}
        </div>
        <div data-testid="parity-delta-tables" style={{ pageBreakInside: 'avoid' }}>
          <div style={SS.secHead}>Delta Comparisons</div>
          {deltas ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <DeltaTable label="Quickest" rows={deltas.deltaMatrices.quickest} trigger={triggers.quickest} metric={metric} />
              <DeltaTable label={`Avg Top ${topN}`} rows={deltas.deltaMatrices.avgTopN} trigger={triggers.avgTopN} metric={metric} />
              <DeltaTable label="Total Avg" rows={deltas.deltaMatrices.totalAvg} trigger={triggers.totalAvg} metric={metric} />
            </div>
          ) : <p style={S.hint}>Loading deltas...</p>}
        </div>
      </div>

      {/* ── Footer (print only — hidden on screen) ── */}
      <div className="parity-print-footer" style={{ display: 'none' }}>
        <span>NHRA Technical Department</span>
        <span>Confidential — DO NOT DISTRIBUTE</span>
        <span>Page 1</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS: Event Report
// ═════════════════════════════════════════════════════════════════════════════

function SummaryCompactTable({ title, combos, refValue, getValue, metric }: {
  title: string;
  combos: ParitySummaryResponse['combos'];
  refValue: number | null;
  getValue: (c: ParitySummaryResponse['combos'][number]) => number | null | undefined;
  metric: string;
}) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ ...SS.secHead, margin: 0, borderRadius: 0 }}>{title}</div>
      <table style={SS.tbl}>
        <thead><tr>
          <th style={SS.th}>Combo</th><th style={{ ...SS.th, textAlign: 'right' }}>ET</th>
          <th style={{ ...SS.th, textAlign: 'right' }}>Delta</th>
        </tr></thead>
        <tbody>
          {combos.map(c => {
            const val = getValue(c) ?? null;
            const delta = refValue != null && val != null ? val - refValue : null;
            return (
              <tr key={c.engineCombo}>
                <td style={SS.td}><span style={{ ...S.badge(comboColor(c.engineCombo)), fontSize: '0.6rem' }}>{c.engineCombo}</span></td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatET(val)}</td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace', color: delta != null && delta > 0 ? '#dc2626' : '#16a34a' }}>
                  {delta != null ? (delta === 0 ? '0.000' : formatDelta(delta, metric)) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QualTable({ rows }: { rows: ParityComboRun[] }) {
  if (rows.length === 0) return <p style={S.hint}>No qual runs.</p>;
  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <table style={SS.tbl}>
        <thead><tr>
          <th style={SS.th}>Pos</th><th style={SS.th}>Driver</th><th style={{ ...SS.th, textAlign: 'right' }}>ET</th>
          <th style={{ ...SS.th, textAlign: 'right' }}>Speed</th><th style={SS.th}>Red</th><th style={SS.th}>Engine Combo</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const clr = r.engineCombo ? comboColor(r.engineCombo) : '#666';
            return (
              <tr key={i}>
                <td style={SS.td}>{r.qualPosition ?? i + 1}</td>
                <td style={{ ...SS.td, fontWeight: 600 }}>{r.driver}</td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatET(r.et)}</td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMPH(r.mph)}</td>
                <td style={SS.td}>{r.dqFlag ? '🔴' : ''}</td>
                <td style={SS.td}><span style={{ ...S.badge(clr), fontSize: '0.55rem' }}>{r.engineCombo || '?'}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IncrementalsTable({ data }: { data: ParityIncrementalsResponse }) {
  if (data.combos.length === 0) return <p style={S.hint}>No combos.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.tbl}>
        <thead><tr>
          <th style={S.th}>Incremental</th>
          {data.combos.map(c => <th key={c} style={{ ...S.th, textAlign: 'right' }}><span style={S.badge(comboColor(c))}>{c}</span></th>)}
        </tr></thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.key}>
              <td style={{ ...S.td, fontWeight: 600 }}>{row.label}</td>
              {data.combos.map(c => {
                const v = row.values[c];
                return <td key={c} style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', ...(v == null ? S.nd : {}) }}>{v != null ? (isIncrementalMph(row.key) ? formatMPH(v) : formatET(v)) : 'No Data'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeatherTable({ data }: { data: ParitySessionWeatherResponse }) {
  if (data.sessions.length === 0) return <p style={S.hint}>No weather data.</p>;
  return (
    <>
      <table style={S.tbl}>
        <thead><tr>
          <th style={S.th}>Session</th><th style={{ ...S.th, textAlign: 'right' }}>Temp °F</th>
          <th style={{ ...S.th, textAlign: 'right' }}>RH %</th><th style={{ ...S.th, textAlign: 'right' }}>Baro inHg</th>
          <th style={{ ...S.th, textAlign: 'right' }}>DA ft</th><th style={{ ...S.th, textAlign: 'right' }}>HPC</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Runs</th>
        </tr></thead>
        <tbody>
          {data.sessions.map(s => (
            <tr key={s.session}>
              <td style={{ ...S.td, fontWeight: 600 }}>
                {s.session}
                {s.localTimeHint && <span style={{ fontWeight: 400, fontSize: '0.58rem', color: '#888', marginLeft: 4 }}>({s.localTimeHint})</span>}
              </td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatTemp(s.temp_f)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatRH(s.rh_pct)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatBaro(s.pressure_inhg)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatDA(s.density_alt_ft)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatHPC(s.hpc)}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{s.runCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function DeltaTable({ label, rows, trigger, metric }: { label: string; rows: ParityDeltaRow[]; trigger: number; metric: string }) {
  if (rows.length === 0) return <div style={S.card}><h3 style={{ fontSize: '0.75rem', margin: '0 0 0.25rem' }}>{label}</h3><p style={S.nd}>No deltas.</p></div>;
  return (
    <div style={S.card}>
      <h3 style={{ fontSize: '0.75rem', margin: '0 0 0.25rem', fontWeight: 700 }}>{label}</h3>
      <table style={S.tbl}>
        <thead><tr>
          <th style={S.th}>A</th><th style={S.th}>B</th><th style={{ ...S.th, textAlign: 'right' }}>Delta</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const noData = r.delta == null || r.valueA == null || r.valueB == null;
            let bg = 'transparent';
            if (!noData && r.delta != null) {
              const abs = Math.abs(r.delta);
              if (abs <= trigger) bg = '#22c55e18';
              else bg = '#ef444418';
            }
            return (
              <tr key={i} style={{ background: bg }}>
                <td style={S.td}><span style={S.badge(comboColor(r.comboA))}>{r.comboA}</span></td>
                <td style={S.td}><span style={S.badge(comboColor(r.comboB))}>{r.comboB}</span></td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', ...(noData ? S.nd : {}) }}>
                  {noData ? 'No Data' : formatDelta(r.delta, metric)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LONG-TERM PARITY REPORT
// ═════════════════════════════════════════════════════════════════════════════

type RangeMode = 'previousN' | 'season' | 'custom';

function LongTermReport({ classIndex, metric, corrMode, sessionScope, onEventClick }: {
  classIndex: string; metric: string; corrMode: 'raw' | 'corrected';
  sessionScope: 'qual' | 'elim' | 'both'; onEventClick: (id: number) => void;
}) {
  const topN = 4;
  const [rangeMode, setRangeMode] = useState<RangeMode>('previousN');
  const [prevN, setPrevN] = useState(10);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<RangeParityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true); setErr('');
    if (rangeMode === 'previousN') {
      // Fetch multiple years to find last N events this class competed at
      const curYear = new Date().getFullYear();
      const yearsToFetch = Array.from({ length: 5 }, (_, i) => curYear - i);
      Promise.allSettled(yearsToFetch.map(y =>
        cf(ck('range', { classIndex, metric, mode: corrMode, topN, sessionScope, year: y }),
          () => parityApi.rangeParityMatrix({ classIndex, metric, mode: corrMode, topN, sessionScope, year: y }))
      )).then(settled => {
        const results = settled
          .filter((r): r is PromiseFulfilledResult<RangeParityMatrixResponse> => r.status === 'fulfilled')
          .map(r => r.value);
        if (results.length === 0) { setErr('No data found'); setLoading(false); return; }
        // Merge all years, filter to events where this class had data
        const allEvents: RangeParityMatrixResponse['events'] = [];
        const allMatrix: RangeParityMatrixResponse['matrix'] = {};
        const allCombos = new Set<string>();
        const seenEvIds = new Set<number>();
        let isLB = true;
        for (const d of results) {
          isLB = d.isLowerBetter;
          for (const c of d.combos) allCombos.add(c);
          for (const ev of d.events) {
            if (seenEvIds.has(ev.eventId)) continue;
            const evData = d.matrix[ev.eventId];
            // Only include events where the class actually competed (has combo data)
            if (evData && Object.keys(evData).length > 0) {
              seenEvIds.add(ev.eventId);
              allEvents.push(ev);
              allMatrix[ev.eventId] = evData;
            }
          }
        }
        // Sort by date, take last N
        allEvents.sort((a, b) => a.start_date_local.localeCompare(b.start_date_local));
        const sliced = allEvents.slice(-prevN);
        const filteredMatrix: typeof allMatrix = {};
        for (const ev of sliced) { filteredMatrix[ev.eventId] = allMatrix[ev.eventId]; }
        const last = results[0];
        setData({ ...last, events: sliced, matrix: filteredMatrix, combos: [...allCombos], isLowerBetter: isLB });
      }).catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
        .finally(() => setLoading(false));
    } else {
      let params: any = { classIndex, metric, mode: corrMode, topN, sessionScope };
      if (rangeMode === 'season') {
        params.year = year;
      } else {
        params.startDate = startDate; params.endDate = endDate;
      }
      cf(ck('range', params), () => parityApi.rangeParityMatrix(params))
        .then(d => setData(d))
        .catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
        .finally(() => setLoading(false));
    }
  }, [classIndex, metric, corrMode, sessionScope, rangeMode, year, startDate, endDate, prevN]);

  useEffect(() => { load(); }, [load]);

  const ml = PARITY_METRICS.find(m => m.value === metric)?.label ?? metric;

  const modeLabel = corrMode === 'raw' ? 'Raw Data' : 'Corrected';

  return (
    <div className="parity-longterm-report" style={{ pageBreakAfter: 'always' }}>
      <div style={{ textAlign: 'center', padding: '0.5rem 0', marginBottom: '0.5rem' }}>
        <h1 style={{ ...S.h1, margin: 0, fontSize: '1.1rem' }}>NHRA {classIndex} {modeLabel} Long Term Parity</h1>
        <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 2 }}>{ml} | {sessionScope.toUpperCase()} | Top {topN}</div>
      </div>

      {/* Range controls */}
      <div style={{ ...S.row, marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.72rem' }}>Range:
          <select value={rangeMode} onChange={e => setRangeMode(e.target.value as RangeMode)} style={{ ...S.inp, marginLeft: 4 }}>
            <option value="season">Season (Year)</option>
            <option value="previousN">Previous N Events</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </label>
        {rangeMode === 'season' && (
          <label style={{ fontSize: '0.72rem' }}>Year:
            <input type="number" value={year} onChange={e => setYear(+e.target.value)} style={{ ...S.inp, width: 64, marginLeft: 4 }} />
          </label>
        )}
        {rangeMode === 'previousN' && (
          <label style={{ fontSize: '0.72rem' }}>Events:
            <input type="number" value={prevN} min={1} max={50} onChange={e => setPrevN(+e.target.value)} style={{ ...S.inp, width: 48, marginLeft: 4 }} />
          </label>
        )}
        {rangeMode === 'custom' && (
          <>
            <label style={{ fontSize: '0.72rem' }}>Start:
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...S.inp, marginLeft: 4 }} />
            </label>
            <label style={{ fontSize: '0.72rem' }}>End:
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...S.inp, marginLeft: 4 }} />
            </label>
          </>
        )}
      </div>

      {loading && <p style={S.hint}>Loading Long-Term Report...</p>}
      {err && <div style={{ ...S.card, color: '#ef4444' }}>{err}</div>}
      {data && <LongTermContent data={data} topN={topN} onEventClick={onEventClick} metric={metric} />}

      {/* Footer (print only — hidden on screen) */}
      <div className="parity-print-footer" style={{ display: 'none' }}>
        <span>NHRA Technical Department</span>
        <span>Confidential — DO NOT DISTRIBUTE</span>
        <span>Page 2</span>
      </div>
    </div>
  );
}

/** Generate a short event code like "2025 GAT" from event_code or event name + date */
function eventShortCode(ev: { event_name: string; event_code?: string | null; start_date_local: string }): string {
  const yr = ev.start_date_local.slice(0, 4);
  // Use custom event_code if set
  if (ev.event_code) return `${yr} ${ev.event_code}`;
  // Try to extract a recognizable abbreviation from the event name
  const name = ev.event_name.toUpperCase();
  // Common NHRA track abbreviations: take first 2-3 consonants of first significant word
  const words = name.replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 1 && !['THE', 'NHRA', 'OF', 'AT'].includes(w));
  let code = '';
  if (words.length > 0) {
    // Use first 2 chars of first word + first char of second word if available
    code = words[0].slice(0, 2) + (words.length > 1 ? words[1].charAt(0) : words[0].charAt(2) || '');
  }
  if (!code) code = ev.start_date_local.slice(5, 7) + ev.start_date_local.slice(8, 10);
  return `${yr} ${code}`;
}

function LongTermContent({ data, topN, onEventClick, metric }: {
  data: RangeParityMatrixResponse; topN: number; onEventClick: (id: number) => void; metric: string;
}) {
  if (data.events.length === 0) return <p style={S.hint}>No events in range.</p>;
  const isLB = data.isLowerBetter;
  const combos = data.combos;
  const events = data.events;
  const nEvents = events.length;

  // Event shortcodes for column headers (deduplicate with numeric suffix)
  const rawCodes = events.map(ev => eventShortCode(ev));
  const codeCount: Record<string, number> = {};
  const evCodes: string[] = rawCodes.map(code => {
    codeCount[code] = (codeCount[code] ?? 0) + 1;
    return code;
  });
  // Add suffix if duplicates exist
  const codeSeen: Record<string, number> = {};
  const evLabels = evCodes.map(code => {
    const n = codeCount[code] ?? 1;
    if (n <= 1) return code;
    codeSeen[code] = (codeSeen[code] ?? 0) + 1;
    return `${code}${codeSeen[code]}`;
  });

  // Build per-combo data
  type ComboRow = { combo: string; values: (number | null)[]; avg: number | null };
  const bestData: ComboRow[] = combos.map(c => {
    const vals = events.map(ev => data.matrix[ev.eventId]?.[c]?.best ?? null);
    const nums = vals.filter((v): v is number => v != null);
    return { combo: c, values: vals, avg: nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null };
  });
  const avg4Data: ComboRow[] = combos.map(c => {
    const vals = events.map(ev => data.matrix[ev.eventId]?.[c]?.avgTopN ?? null);
    const nums = vals.filter((v): v is number => v != null);
    return { combo: c, values: vals, avg: nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null };
  });

  // Best avg for delta reference
  const bestAvgRef = bestData.reduce((best, r) => {
    if (r.avg == null) return best;
    if (best == null) return r.avg;
    return isLB ? Math.min(best, r.avg) : Math.max(best, r.avg);
  }, null as number | null);
  const avg4AvgRef = avg4Data.reduce((best, r) => {
    if (r.avg == null) return best;
    if (best == null) return r.avg;
    return isLB ? Math.min(best, r.avg) : Math.max(best, r.avg);
  }, null as number | null);

  // Line chart data (event on X, combo as lines)
  const bestChartData = events.map((ev, i) => {
    const pt: Record<string, any> = { name: evLabels[i] };
    for (const c of combos) { pt[c] = data.matrix[ev.eventId]?.[c]?.best ?? null; }
    return pt;
  });
  const avg4ChartData = events.map((ev, i) => {
    const pt: Record<string, any> = { name: evLabels[i] };
    for (const c of combos) { pt[c] = data.matrix[ev.eventId]?.[c]?.avgTopN ?? null; }
    return pt;
  });

  return (
    <>
      {/* Table 1: Quickest Run Per Combo (transposed: combos as rows, events as columns) */}
      <div style={SS.secHead}>Quickest Run Per Combo — Previous {nEvents} Events</div>
      <RangeTableTransposed
        comboRows={bestData} events={events} evLabels={evLabels}
        avgRef={bestAvgRef} isLB={isLB} onEventClick={onEventClick} metric={metric}
      />

      {/* Chart 1 */}
      <div style={SS.secHead}>Quickest Run Per Combo — Previous {nEvents} Events</div>
      <RangeLineChart chartData={bestChartData} combos={combos} metric={metric} />

      {/* Table 2: Avg Top N Per Combo (transposed) */}
      <div style={SS.secHead}>Average {topN} Quickest Per Combo — Previous {nEvents} Events</div>
      <RangeTableTransposed
        comboRows={avg4Data} events={events} evLabels={evLabels}
        avgRef={avg4AvgRef} isLB={isLB} onEventClick={onEventClick} metric={metric}
      />

      {/* Chart 2 */}
      <div style={SS.secHead}>Average {topN} Quickest Per Combo — Previous {nEvents} Events</div>
      <RangeLineChart chartData={avg4ChartData} combos={combos} metric={metric} />
    </>
  );
}

/** Transposed range table: combo rows × event columns + AVG + Delta */
function RangeTableTransposed({ comboRows, events, evLabels, avgRef, isLB, onEventClick, metric }: {
  comboRows: { combo: string; values: (number | null)[]; avg: number | null }[];
  events: RangeParityMatrixResponse['events'];
  evLabels: string[];
  avgRef: number | null;
  isLB: boolean;
  onEventClick: (id: number) => void;
  metric: string;
}) {
  return (
    <div style={{ overflowX: 'auto', ...S.card, padding: '0.4rem' }}>
      <table style={SS.tbl}>
        <thead><tr>
          <th style={SS.th}>Engine Combo</th>
          {events.map((ev, i) => (
            <th key={ev.eventId} style={{ ...SS.th, textAlign: 'right', cursor: 'pointer', fontSize: '0.55rem' }}
              onClick={() => onEventClick(ev.eventId)} title={ev.event_name}>
              {evLabels[i]}
            </th>
          ))}
          <th style={{ ...SS.th, textAlign: 'right' }}>AVG</th>
          <th style={{ ...SS.th, textAlign: 'right' }}>Delta</th>
        </tr></thead>
        <tbody>
          {comboRows.map((row, ri) => {
            const clr = comboColor(row.combo);
            const delta = avgRef != null && row.avg != null ? (isLB ? row.avg - avgRef : avgRef - row.avg) : null;
            return (
              <tr key={row.combo} style={{ background: ri % 2 === 1 ? 'var(--color-bg)' : undefined }}>
                <td style={{ ...SS.td, fontWeight: 700 }}>
                  <span style={{ ...S.badge(clr), fontSize: '0.58rem' }}>{row.combo}</span>
                </td>
                {row.values.map((v, vi) => (
                  <td key={vi} style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace', ...(v == null ? { color: '#888', fontStyle: 'italic' } : {}) }}>
                    {v != null ? formatMetric(v, metric) : ''}
                  </td>
                ))}
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                  {row.avg != null ? formatMetric(row.avg, metric) : '—'}
                </td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600,
                  color: delta != null ? (Math.abs(delta) < 0.001 ? '#16a34a' : delta > 0 ? '#dc2626' : '#16a34a') : undefined }}>
                  {delta != null ? (Math.abs(delta) < 0.001 ? '0.000' : formatDelta(delta, metric)) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PRINT / PDF STYLES (injected once via <style>)
// ═════════════════════════════════════════════════════════════════════════════

const PRINT_CSS = `
@media print {
  .parity-event-report, .parity-longterm-report {
    max-width: 100% !important;
    font-size: 9pt !important;
    color: #000 !important;
  }
  .parity-event-report h1, .parity-longterm-report h1 { font-size: 14pt !important; }
  .parity-event-report h2, .parity-longterm-report h2 { font-size: 11pt !important; page-break-after: avoid; }
  .parity-event-report table, .parity-longterm-report table { page-break-inside: avoid; }
  .parity-event-report [data-testid="parity-grouped-chart"],
  .parity-event-report [data-testid="parity-delta-tables"] { page-break-inside: avoid; }
  .recharts-responsive-container { max-height: 300px !important; }
  .parity-print-footer { display: flex !important; justify-content: space-between; font-size: 0.6rem; color: #888; margin-top: 0.75rem; border-top: 1px solid #ccc; padding-top: 0.3rem; }
  button, select, input { display: none !important; }
}
`;

let _printStyleInjected = false;
function PrintStyle() {
  if (_printStyleInjected) return null;
  _printStyleInjected = true;
  return <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />;
}

function RangeLineChart({ chartData, combos, metric }: { chartData: Record<string, any>[]; combos: string[]; metric: string }) {
  if (chartData.length === 0) return <p style={S.hint}>No data.</p>;
  return (
    <div style={{ ...S.card, padding: '0.5rem' }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(v: number) => v != null ? formatMetric(v, metric) : '—'} />
          <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
          {combos.map(c => <Line key={c} type="monotone" dataKey={c} stroke={comboColor(c)} dot={{ r: 3 }} strokeWidth={2} connectNulls />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
