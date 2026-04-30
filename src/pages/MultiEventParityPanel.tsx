// Multi-Event Parity — Single aggregated report across multiple selected events
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { type EventWithStats, parityApi, type ParitySummaryResponse, type ParityQualOrderResponse, type ParityIncrementalsResponse, type ParitySessionWeatherResponse } from '../services/parityApi';
import { exportEventParityPdf } from '../services/parityPdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatET, formatMPH, formatMetric } from '../domain/parity/format';

type EventCount = 3 | 5 | 10 | 'custom';

const S = {
  inp: { padding: '0.25rem 0.4rem', border: '1px solid var(--color-border)', borderRadius: 3, fontSize: '0.78rem', fontFamily: 'inherit', background: 'var(--color-surface)', color: 'var(--color-text)' } as React.CSSProperties,
  card: (selected: boolean): React.CSSProperties => ({
    background: 'var(--color-surface)',
    border: selected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
    borderRadius: 6, padding: '0.6rem 0.75rem', cursor: 'pointer', transition: 'border-color 0.15s',
  }),
  check: (selected: boolean): React.CSSProperties => ({
    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
    border: selected ? '2px solid var(--color-primary)' : '2px solid var(--color-muted)',
    background: selected ? 'var(--color-primary)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: '0.65rem', lineHeight: 1,
  }),
};

export default function MultiEventParityPanel({ events, category: initCategory = '', classIndex: initClassIndex = '' }: {
  events: EventWithStats[];
  category?: string;
  classIndex?: string;
}) {
  const displayLabel = initCategory || initClassIndex;

  const [eventCount, setEventCount] = useState<EventCount>(5);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [corrMode, setCorrMode] = useState<'raw' | 'corrected'>('raw');
  const [groupBy, setGroupBy] = useState<'engineCombo' | 'bodyStyle'>('engineCombo');
  const [metric] = useState('et_1320');
  const [sessionScope] = useState<'qual' | 'elim' | 'both'>('both');
  const topN = 4;

  const [summary, setSummary] = useState<ParitySummaryResponse | null>(null);
  const [qualOrder, setQualOrder] = useState<ParityQualOrderResponse | null>(null);
  const [inc, setInc] = useState<ParityIncrementalsResponse | null>(null);
  const [wx, setWx] = useState<ParitySessionWeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [exporting, setExporting] = useState(false);

  const sortedEvents = useMemo(() =>
    [...events].sort((a, b) => b.start_date_local.localeCompare(a.start_date_local)),
    [events],
  );

  useEffect(() => {
    if (eventCount !== 'custom' && sortedEvents.length > 0) {
      setSelectedIds(sortedEvents.slice(0, eventCount).map(e => e.id));
    }
  }, [eventCount, sortedEvents]);

  const toggleEvent = (id: number) => {
    setEventCount('custom');
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const visibleEvents = eventCount === 'custom'
    ? sortedEvents
    : sortedEvents.slice(0, Math.min(sortedEvents.length, 20));

  const load = useCallback(() => {
    if (selectedIds.length === 0 || !displayLabel) return;
    setLoading(true); setErr('');
    const b = { eventIds: selectedIds, category: displayLabel, metric, mode: corrMode, topN, sessionScope, groupBy };
    Promise.all([
      parityApi.paritySummary(b),
      parityApi.parityQualOrder({ eventId: selectedIds[0], category: displayLabel, metric, mode: 'raw', sessionScope, groupBy }),
      parityApi.parityIncrementals({ eventIds: selectedIds, category: displayLabel, sessionScope, mode: corrMode, groupBy }),
      parityApi.paritySessionWeather({ eventIds: selectedIds, category: displayLabel }),
    ]).then(([s, q, i, w]) => { setSummary(s); setQualOrder(q); setInc(i); setWx(w); })
      .catch(e => setErr(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [selectedIds, displayLabel, metric, corrMode, groupBy, sessionScope]);

  useEffect(() => { load(); }, [load]);

  const handleExportPdf = useCallback(async () => {
    if (!summary) return;
    setExporting(true);
    try {
      await exportEventParityPdf({
        summary, qualOrder, incrementals: inc, weather: wx,
        category: displayLabel, displayLabel, corrMode, groupBy, sessionScope,
      });
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  }, [summary, qualOrder, inc, wx, displayLabel, metric, corrMode, groupBy, sessionScope]);

  const groupLabel = groupBy === 'bodyStyle' ? 'Body Style' : 'Engine Combo';
  const combos = summary?.combos ?? [];

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1200, margin: '0 auto', padding: '0 0.5rem' }}>
      {/* Header + controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
          Multi-Event Parity
        </h2>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-muted)' }}>{displayLabel}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.78rem' }}>Events:
            <select value={String(eventCount)} onChange={e => {
              const v = e.target.value;
              setEventCount(v === 'custom' ? 'custom' : Number(v) as 3 | 5 | 10);
            }} style={{ ...S.inp, width: 110, marginLeft: 4 }}>
              <option value="3">Last 3</option>
              <option value="5">Last 5</option>
              <option value="10">Last 10</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label style={{ fontSize: '0.78rem' }}>Group:
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as 'engineCombo' | 'bodyStyle')} style={{ ...S.inp, width: 110, marginLeft: 4 }}>
              <option value="engineCombo">Engine Combo</option>
              <option value="bodyStyle">Body Style</option>
            </select>
          </label>
          <label style={{ fontSize: '0.78rem' }}>Mode:
            <select value={corrMode} onChange={e => setCorrMode(e.target.value as 'raw' | 'corrected')} style={{ ...S.inp, width: 90, marginLeft: 4 }}>
              <option value="raw">Raw</option>
              <option value="corrected">Corrected</option>
            </select>
          </label>
          {summary && (
            <button onClick={handleExportPdf} disabled={exporting} style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', cursor: exporting ? 'wait' : 'pointer' }}>
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          )}
        </div>
      </div>

      {!displayLabel && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#92400e' }}>
          No category selected. Please select a category from the dropdown above.
        </div>
      )}

      {/* Event picker */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
          Select Events <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>({selectedIds.length} selected)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.4rem' }}>
          {visibleEvents.map(ev => {
            const sel = selectedIds.includes(ev.id);
            return (
              <div key={ev.id} onClick={() => toggleEvent(ev.id)} style={S.card(sel)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.event_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                      {ev.start_date_local} &middot; {ev.track_name}{ev.state ? `, ${ev.state}` : ''}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-muted)', marginTop: 1 }}>
                      {ev.run_count} runs
                    </div>
                  </div>
                  <div style={S.check(sel)}>
                    {sel && '\u2713'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <p style={{ color: 'var(--color-muted)', fontSize: '0.82rem' }}>Loading aggregated data...</p>}
      {err && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>Error: {err}</p>}

      {/* Aggregated Report */}
      {summary && selectedIds.length > 0 && (
        <div>
          {/* Event info banner */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>{summary.event.event_name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              {summary.event.start_date_local} to {summary.event.end_date_local}
              {summary.allEvents && (
                <span style={{ marginLeft: '0.5rem' }}>
                  ({summary.allEvents.length} events: {summary.allEvents.map(e => e.event_name).join(', ')})
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              {summary.totalRunsInClass} runs • {summary.trust.weatherCoveragePct?.toFixed(1)}% weather coverage
              {corrMode === 'corrected' && ` • ${summary.trust.correctedCoveragePct?.toFixed(1)}% corrected`}
            </div>
          </div>

          {/* Combo summary table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {groupLabel} Summary ({combos.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>{groupLabel}</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Best</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Avg Top {topN}</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Total Avg</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>Runs</th>
                  </tr>
                </thead>
                <tbody>
                  {combos.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 500 }}>{c.engineCombo}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{c.bestValue !== null ? formatMetric(c.bestValue, metric) : '—'}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{c.avgTopN !== null ? formatMetric(c.avgTopN, metric) : '—'}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{c.totalAvg !== null ? formatMetric(c.totalAvg, metric) : '—'}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-muted)' }}>{c.countActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bar chart */}
          {combos.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>Performance Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={combos.filter(c => c.bestValue !== null)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="engineCombo" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(v: number) => formatMetric(v, metric)} />
                  <Bar dataKey="bestValue" fill="#3b82f6">
                    {combos.map((_, i) => <Cell key={i} fill={i === 0 ? '#10b981' : '#3b82f6'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Qualifying order */}
          {qualOrder && qualOrder.qualOrder.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Qualifying Order (Top {Math.min(10, qualOrder.qualOrder.length)})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface)', borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Pos</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Driver</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>{groupLabel}</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>ET</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>MPH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualOrder.qualOrder.slice(0, 10).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 500 }}>{i + 1}</td>
                        <td style={{ padding: '0.5rem' }}>{r.driver}</td>
                        <td style={{ padding: '0.5rem', color: 'var(--color-muted)' }}>{r.engineCombo}</td>
                        <td style={{ textAlign: 'right', padding: '0.5rem' }}>{r.et !== null ? formatET(r.et) : '—'}</td>
                        <td style={{ textAlign: 'right', padding: '0.5rem' }}>{r.mph !== null ? formatMPH(r.mph) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedIds.length === 0 && !loading && (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
          Select one or more events above to generate an aggregated parity report.
        </p>
      )}
    </div>
  );
}
