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

function fnv1aHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function comboColor(name: string): string { return COMBO_PALETTE[fnv1aHash(name) % COMBO_PALETTE.length]; }

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

function fmt(v: number | null, d = 4): string { return v != null ? v.toFixed(d) : '—'; }

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

type Mode = 'event' | 'longTerm';

export default function ParityReport({ event }: { event: EventWithStats | null }) {
  const [mode, setMode] = useState<Mode>('event');
  const [classIndex, setClassIndex] = useState('TF');
  const [sessionScope, setSessionScope] = useState<'qual' | 'elim' | 'both'>('qual');
  const [corrMode, setCorrMode] = useState<'raw' | 'corrected'>('corrected');
  const [metric, setMetric] = useState('et_1320');
  const [overrideEv, setOverrideEv] = useState<number | null>(null);

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: '0.75rem' }}>
        <button style={mode === 'event' ? S.tabA : S.tabI} onClick={() => { setMode('event'); setOverrideEv(null); }}>Event Parity Report</button>
        <button style={mode === 'longTerm' ? S.tabA : S.tabI} onClick={() => setMode('longTerm')}>Long-Term Parity Report</button>
      </div>
      <div style={{ ...S.row, marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.72rem' }}>Class:<select value={classIndex} onChange={e => setClassIndex(e.target.value)} style={{ ...S.inp, width: 72, marginLeft: 4 }}>{PARITY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label style={{ fontSize: '0.72rem' }}>Session:<select value={sessionScope} onChange={e => setSessionScope(e.target.value as any)} style={{ ...S.inp, width: 72, marginLeft: 4 }}><option value="qual">Qual</option><option value="elim">Elim</option><option value="both">Both</option></select></label>
        <label style={{ fontSize: '0.72rem' }}>Metric:<select value={metric} onChange={e => setMetric(e.target.value)} style={{ ...S.inp, width: 120, marginLeft: 4 }}>{PARITY_METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
        <label style={{ fontSize: '0.72rem' }}>Mode:<select value={corrMode} onChange={e => setCorrMode(e.target.value as any)} style={{ ...S.inp, width: 90, marginLeft: 4 }}><option value="corrected">Corrected</option><option value="raw">Raw</option></select></label>
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

  const ml = PARITY_METRICS.find(m => m.value === metric)?.label ?? metric;

  // Build grouped bar data: one row per combo, run1..runN as separate keys
  const groupedBarData = summary.combos
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
  const RUN_SHADES = ['#000', '#444', '#777', '#aaa'];

  return (
    <div className="parity-event-report" style={{ pageBreakAfter: 'always' }}>
      {/* Header */}
      <div style={{ ...S.card, padding: '0.5rem 0.75rem', background: 'var(--color-bg)' }}>
        <h1 style={{ ...S.h1, margin: 0 }}>Event Parity Report — {classIndex}</h1>
        <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>
          {summary.event.event_name} | {summary.event.track_name} | {summary.event.start_date_local} → {summary.event.end_date_local} | {sessionScope.toUpperCase()} | {ml} ({corrMode}) | Top {topN} | {summary.totalRunsInClass} runs
        </div>
      </div>

      {/* Row 1: Summary + Qual */}
      <div style={S.grid2}>
        <div>
          <h2 style={S.h2}>Combo Summary</h2>
          <SummaryBlock combos={summary.combos} metric={metric} triggers={triggers} isLB={summary.isLowerBetter} topN={topN} />
          <div style={{ ...S.row, marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <TriggerInput label="Quick" value={triggers.quickest} onChange={v => setTriggers(t => ({ ...t, quickest: v }))} isM={isMph(metric)} />
            <TriggerInput label="Avg4" value={triggers.avgTopN} onChange={v => setTriggers(t => ({ ...t, avgTopN: v }))} isM={isMph(metric)} />
            <TriggerInput label="TotAvg" value={triggers.totalAvg} onChange={v => setTriggers(t => ({ ...t, totalAvg: v }))} isM={isMph(metric)} />
            <button style={{ ...S.btn, fontSize: '0.6rem', padding: '0.15rem 0.3rem' }} onClick={() => setTriggers(defaultTriggers(metric))}>Reset</button>
          </div>
        </div>
        <div>
          <h2 style={S.h2}>Raw Qualifying Results</h2>
          {qualOrder ? <QualTable rows={qualOrder.qualOrder} /> : <p style={S.hint}>Loading...</p>}
        </div>
      </div>

      {/* Bar Chart — Quickest 4 individual runs per combo */}
      <h2 style={S.h2}>Quickest {topN} Per Combo — {ml}</h2>
      {groupedBarData.length > 0 ? (
        <div style={{ ...S.card, padding: '0.5rem' }}>
          <ResponsiveContainer width="100%" height={Math.max(200, groupedBarData.length * 60)}>
            <BarChart data={groupedBarData} layout="vertical" margin={{ top: 4, right: 30, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis type="number" tick={{ fontSize: 10 }} domain={['dataMin - 0.05', 'dataMax + 0.05']} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number, _name: string, props: any) => {
                  const idx = parseInt((_name as string).replace('run', '')) - 1;
                  const driver = props.payload?.[`driver${idx + 1}`] ?? '';
                  const round = props.payload?.[`round${idx + 1}`] ?? '';
                  return [`${v.toFixed(4)} — ${driver} (${round})`, `Run ${idx + 1}`];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
              {runKeys.map((k, i) => (
                <Bar key={k} dataKey={k} name={`#${i + 1} Quickest`} fill={RUN_SHADES[i] ?? '#999'} barSize={10}>
                  {groupedBarData.map((d, j) => <Cell key={j} fill={d.fill + (i === 0 ? 'ff' : i === 1 ? 'cc' : i === 2 ? '99' : '66')} />)}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: '0.6rem', color: '#888', marginTop: 4, textAlign: 'center' }}>
            Bars = individual runs (darkest → quickest). Hover for driver + round.
          </div>
        </div>
      ) : <p style={S.hint}>No combo data for chart.</p>}

      {/* Row 2: Incrementals + Weather (side by side) */}
      <div style={S.grid2}>
        <div>
          <h2 style={S.h2}>Incrementals by Combo (Optimal Run)</h2>
          {inc ? <IncrementalsTable data={inc} /> : <p style={S.hint}>Loading...</p>}
        </div>
        <div>
          <h2 style={S.h2}>Weather by Session</h2>
          {wx ? <WeatherTable data={wx} /> : <p style={S.hint}>Loading...</p>}
        </div>
      </div>

      {/* Delta Tables */}
      <h2 style={S.h2}>Delta Comparison Tables</h2>
      {deltas ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          <DeltaTable label="Quickest" rows={deltas.deltaMatrices.quickest} trigger={triggers.quickest} />
          <DeltaTable label={`Avg Top ${topN}`} rows={deltas.deltaMatrices.avgTopN} trigger={triggers.avgTopN} />
          <DeltaTable label="Total Avg" rows={deltas.deltaMatrices.totalAvg} trigger={triggers.totalAvg} />
        </div>
      ) : <p style={S.hint}>Loading deltas...</p>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS: Event Report
// ═════════════════════════════════════════════════════════════════════════════

function TriggerInput({ label, value, onChange, isM }: { label: string; value: number; onChange: (v: number) => void; isM: boolean }) {
  return (
    <label style={{ fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: 3 }}>
      {label}:
      <input type="number" value={value} step={isM ? 0.1 : 0.001} min={0}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ ...S.inp, width: 56, fontSize: '0.62rem', padding: '0.15rem 0.25rem' }} />
    </label>
  );
}

function SummaryBlock({ combos, topN }: {
  combos: ParitySummaryResponse['combos']; metric?: string; triggers?: TriggerSet; isLB?: boolean; topN: number;
}) {
  if (combos.length === 0) return <p style={S.hint}>No combos found.</p>;
  return (
    <table style={S.tbl}>
      <thead>
        <tr>
          <th style={S.th}>Engine Combo</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Quickest</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Avg Top {topN}</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Total Avg</th>
          <th style={{ ...S.th, textAlign: 'right' }}>Runs</th>
        </tr>
      </thead>
      <tbody>
        {combos.map(c => {
          const clr = comboColor(c.engineCombo);
          const noQ = c.bestValue == null;
          const noA = c.avgTopN == null;
          const noT = c.totalAvg == null;
          return (
            <tr key={c.engineCombo}>
              <td style={S.td}><span style={S.badge(clr)}>{c.engineCombo}</span></td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', ...(noQ ? S.nd : {}) }}>{noQ ? 'No Data' : fmt(c.bestValue)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', ...(noA ? S.nd : {}) }}>{noA ? 'No Data' : fmt(c.avgTopN)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', ...(noT ? S.nd : {}) }}>{noT ? 'No Data' : fmt(c.totalAvg)}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{c.countActive}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function QualTable({ rows }: { rows: ParityComboRun[] }) {
  if (rows.length === 0) return <p style={S.hint}>No qual runs.</p>;
  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <table style={S.tbl}>
        <thead><tr>
          <th style={S.th}>#</th><th style={S.th}>Driver</th><th style={{ ...S.th, textAlign: 'right' }}>ET</th>
          <th style={{ ...S.th, textAlign: 'right' }}>MPH</th><th style={S.th}>Combo</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const clr = r.engineCombo ? comboColor(r.engineCombo) : '#666';
            return (
              <tr key={i}>
                <td style={S.td}>{r.qualPosition ?? i + 1}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{r.driver}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.et)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.mph, 2)}</td>
                <td style={S.td}><span style={S.badge(clr)}>{r.engineCombo || '?'}</span></td>
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
                return <td key={c} style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', ...(v == null ? S.nd : {}) }}>{v != null ? fmt(v) : 'No Data'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeatherConfidenceBanner({ data }: { data: ParitySessionWeatherResponse }) {
  const wc = data.weatherConfidence;
  if (!wc) return null;
  const warn = (wc.avgOffsetMin != null && wc.avgOffsetMin > 20) || (wc.maxOffsetMin != null && wc.maxOffsetMin > 60);
  return (
    <div style={{ fontSize: '0.65rem', padding: '0.3rem 0.5rem', marginBottom: '0.35rem', borderRadius: 4,
      background: warn ? '#fef2f2' : 'var(--color-bg)', border: warn ? '1px solid #fca5a5' : '1px solid var(--color-border)',
      color: warn ? '#991b1b' : 'var(--color-muted)' }}>
      <strong>Weather Match:</strong>{' '}
      {wc.pctMatched != null ? `${wc.pctMatched}% runs matched` : 'N/A'}{' · '}
      avg offset {wc.avgOffsetMin != null ? `${wc.avgOffsetMin} min` : '—'}{' · '}
      max offset {wc.maxOffsetMin != null ? `${wc.maxOffsetMin} min` : '—'}
      {warn && <span style={{ fontWeight: 700, marginLeft: 6 }}>⚠ Timezone mismatch likely — run backfillRunUtcFromLocal</span>}
    </div>
  );
}

function WeatherTable({ data }: { data: ParitySessionWeatherResponse }) {
  if (data.sessions.length === 0) return <p style={S.hint}>No weather data.</p>;
  return (
    <>
      <WeatherConfidenceBanner data={data} />
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
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.temp_f.toFixed(1)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.rh_pct.toFixed(1)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.pressure_inhg.toFixed(3)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.density_alt_ft}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.hpc.toFixed(4)}</td>
              <td style={{ ...S.td, textAlign: 'right' }}>{s.runCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function DeltaTable({ label, rows, trigger }: { label: string; rows: ParityDeltaRow[]; trigger: number }) {
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
                  {noData ? 'No Data' : (r.delta! > 0 ? '+' : '') + r.delta!.toFixed(4)}
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
  const [rangeMode, setRangeMode] = useState<RangeMode>('season');
  const [prevN, setPrevN] = useState(10);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<RangeParityMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true); setErr('');
    let params: any = { classIndex, metric, mode: corrMode, topN, sessionScope };
    if (rangeMode === 'season') {
      params.year = year;
    } else if (rangeMode === 'custom') {
      params.startDate = startDate; params.endDate = endDate;
    } else {
      // previousN: use current year and get all, then slice last N on client
      params.year = year;
    }
    cf(ck('range', params), () => parityApi.rangeParityMatrix(params))
      .then(d => {
        if (rangeMode === 'previousN' && d.events.length > prevN) {
          const sliced = d.events.slice(-prevN);
          const filteredMatrix: typeof d.matrix = {};
          for (const ev of sliced) { filteredMatrix[ev.eventId] = d.matrix[ev.eventId]; }
          setData({ ...d, events: sliced, matrix: filteredMatrix });
        } else {
          setData(d);
        }
      })
      .catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [classIndex, metric, corrMode, sessionScope, rangeMode, year, startDate, endDate, prevN]);

  useEffect(() => { load(); }, [load]);

  const ml = PARITY_METRICS.find(m => m.value === metric)?.label ?? metric;

  return (
    <div className="parity-longterm-report" style={{ pageBreakAfter: 'always' }}>
      <div style={{ ...S.card, padding: '0.5rem 0.75rem', background: 'var(--color-bg)' }}>
        <h1 style={{ ...S.h1, margin: 0 }}>Long-Term Parity Report — {classIndex}</h1>
        <div style={{ fontSize: '0.78rem', color: '#999', marginTop: 2 }}>{ml} ({corrMode}) | {sessionScope.toUpperCase()} | Top {topN}</div>
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
          <>
            <label style={{ fontSize: '0.72rem' }}>N:
              <input type="number" value={prevN} min={1} max={30} onChange={e => setPrevN(+e.target.value)} style={{ ...S.inp, width: 48, marginLeft: 4 }} />
            </label>
            <label style={{ fontSize: '0.72rem' }}>Year:
              <input type="number" value={year} onChange={e => setYear(+e.target.value)} style={{ ...S.inp, width: 64, marginLeft: 4 }} />
            </label>
          </>
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
      {data && <LongTermContent data={data} topN={topN} onEventClick={onEventClick} />}
    </div>
  );
}

function LongTermContent({ data, topN, onEventClick }: {
  data: RangeParityMatrixResponse; topN: number; onEventClick: (id: number) => void;
}) {
  if (data.events.length === 0) return <p style={S.hint}>No events in range.</p>;
  const isLB = data.isLowerBetter;
  const combos = data.combos;
  const events = data.events;

  // Build per-combo per-event data for tables and charts
  type Row = { eventId: number; eventName: string; date: string; [combo: string]: number | string | null | undefined };
  const bestRows: Row[] = [];
  const avg4Rows: Row[] = [];
  for (const ev of events) {
    const bRow: Row = { eventId: ev.eventId, eventName: ev.event_name, date: ev.start_date_local };
    const aRow: Row = { eventId: ev.eventId, eventName: ev.event_name, date: ev.start_date_local };
    for (const c of combos) {
      const cell = data.matrix[ev.eventId]?.[c];
      bRow[c] = cell?.best ?? null;
      aRow[c] = cell?.avgTopN ?? null;
    }
    bestRows.push(bRow);
    avg4Rows.push(aRow);
  }

  // Compute averages and deltas per combo
  const comboAvgBest: Record<string, number | null> = {};
  const comboAvgA4: Record<string, number | null> = {};
  for (const c of combos) {
    const bVals = bestRows.map(r => r[c] as number | null).filter((v): v is number => v != null);
    const aVals = avg4Rows.map(r => r[c] as number | null).filter((v): v is number => v != null);
    comboAvgBest[c] = bVals.length > 0 ? bVals.reduce((a, b) => a + b, 0) / bVals.length : null;
    comboAvgA4[c] = aVals.length > 0 ? aVals.reduce((a, b) => a + b, 0) / aVals.length : null;
  }

  // Best overall combo for delta reference
  const sortedBest = combos.filter(c => comboAvgBest[c] != null).sort((a, b) => isLB ? (comboAvgBest[a]! - comboAvgBest[b]!) : (comboAvgBest[b]! - comboAvgBest[a]!));
  const refCombo = sortedBest[0] ?? null;

  // Line chart data
  const bestChartData = events.map(ev => {
    const pt: Record<string, any> = { name: ev.event_name.slice(0, 20), date: ev.start_date_local };
    for (const c of combos) { pt[c] = data.matrix[ev.eventId]?.[c]?.best ?? null; }
    return pt;
  });
  const avg4ChartData = events.map(ev => {
    const pt: Record<string, any> = { name: ev.event_name.slice(0, 20), date: ev.start_date_local };
    for (const c of combos) { pt[c] = data.matrix[ev.eventId]?.[c]?.avgTopN ?? null; }
    return pt;
  });

  return (
    <>
      {/* Table 1: Quickest per combo + AVG + Delta */}
      <h2 style={S.h2}>Quickest Per Combo Across Events</h2>
      <RangeTable rows={bestRows} combos={combos} comboAvg={comboAvgBest} refCombo={refCombo} isLB={isLB} onEventClick={onEventClick} />

      {/* Chart 1: Quickest line chart */}
      <h2 style={S.h2}>Quickest Trend</h2>
      <RangeLineChart chartData={bestChartData} combos={combos} />

      {/* Table 2: Avg4 per combo + AVG + Delta */}
      <h2 style={S.h2}>Avg Top {topN} Per Combo Across Events</h2>
      <RangeTable rows={avg4Rows} combos={combos} comboAvg={comboAvgA4} refCombo={refCombo} isLB={isLB} onEventClick={onEventClick} />

      {/* Chart 2: Avg4 line chart */}
      <h2 style={S.h2}>Avg Top {topN} Trend</h2>
      <RangeLineChart chartData={avg4ChartData} combos={combos} />
    </>
  );
}

type RangeRow = { eventId: number; eventName: string; date: string; [combo: string]: number | string | null | undefined };

function RangeTable({ rows, combos, comboAvg, refCombo, isLB, onEventClick }: {
  rows: RangeRow[]; combos: string[]; comboAvg: Record<string, number | null>;
  refCombo: string | null; isLB: boolean; onEventClick: (id: number) => void;
}) {
  return (
    <div style={{ overflowX: 'auto', ...S.card }}>
      <table style={S.tbl}>
        <thead><tr>
          <th style={S.th}>Event</th>
          {combos.map(c => <th key={c} style={{ ...S.th, textAlign: 'right' }}><span style={S.badge(comboColor(c))}>{c}</span></th>)}
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.eventId} style={{ cursor: 'pointer' }} onClick={() => onEventClick(r.eventId as number)}>
              <td style={{ ...S.td, fontWeight: 600, whiteSpace: 'nowrap' }} title={r.eventName as string}>{(r.eventName as string).slice(0, 25)}<br /><span style={{ fontSize: '0.6rem', color: '#888' }}>{r.date}</span></td>
              {combos.map(c => {
                const v = r[c] as number | null;
                return <td key={c} style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', ...(v == null ? S.nd : {}) }}>{v != null ? fmt(v) : '—'}</td>;
              })}
            </tr>
          ))}
          {/* AVG row */}
          <tr style={{ background: 'var(--color-bg)', fontWeight: 700 }}>
            <td style={S.td}>AVG</td>
            {combos.map(c => <td key={c} style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{comboAvg[c] != null ? fmt(comboAvg[c]) : '—'}</td>)}
          </tr>
          {/* Delta row (vs best combo) */}
          {refCombo && (
            <tr style={{ background: 'var(--color-bg)' }}>
              <td style={{ ...S.td, fontStyle: 'italic', fontSize: '0.65rem' }}>Δ vs {refCombo}</td>
              {combos.map(c => {
                const avg = comboAvg[c]; const ref = comboAvg[refCombo];
                if (avg == null || ref == null) return <td key={c} style={{ ...S.td, textAlign: 'right', ...S.nd }}>—</td>;
                const delta = isLB ? avg - ref : ref - avg;
                return <td key={c} style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', color: delta <= 0.001 ? '#22c55e' : '#ef4444' }}>{(delta > 0 ? '+' : '') + delta.toFixed(4)}</td>;
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RangeLineChart({ chartData, combos }: { chartData: Record<string, any>[]; combos: string[] }) {
  if (chartData.length === 0) return <p style={S.hint}>No data.</p>;
  return (
    <div style={{ ...S.card, padding: '0.5rem' }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(v: number) => v?.toFixed(4)} />
          <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
          {combos.map(c => <Line key={c} type="monotone" dataKey={c} stroke={comboColor(c)} dot={{ r: 3 }} strokeWidth={2} connectNulls />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
