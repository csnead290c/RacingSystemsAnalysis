import React, { useState } from 'react';
import {
  parityApi,
  type BatchWeatherBackfillResponse,
} from '../services/parityApi';

const S = {
  h1: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)' } as React.CSSProperties,
  subtitle: { color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: '1rem' } as React.CSSProperties,
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' } as React.CSSProperties,
  th: { textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--color-border)', fontSize: '0.7rem', whiteSpace: 'nowrap' } as React.CSSProperties,
  td: { padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' } as React.CSSProperties,
  input: { padding: '0.25rem 0.4rem', border: '1px solid var(--color-border)', borderRadius: 3, fontSize: '0.75rem', fontFamily: 'inherit' } as React.CSSProperties,
  btn: (v: 'primary' | 'secondary' | 'danger') => ({
    padding: '0.35rem 0.75rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
    background: v === 'primary' ? 'var(--color-primary)' : v === 'danger' ? '#e74c3c' : 'var(--color-surface)',
    color: v === 'primary' || v === 'danger' ? '#fff' : 'var(--color-text)',
    border: v === 'secondary' ? '1px solid var(--color-border)' : 'none',
  }) as React.CSSProperties,
};

const statusColor = (s: string) => {
  if (s === 'ok') return '#2ecc71';
  if (s === 'would_backfill') return '#3498db';
  if (s === 'error') return '#e74c3c';
  return '#95a5a6';
};

export default function BatchBackfillPanel() {
  const [yearFrom, setYearFrom] = useState(2024);
  const [yearTo, setYearTo] = useState(2024);
  const [maxCoverage, setMaxCoverage] = useState(80);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchWeatherBackfillResponse | null>(null);
  const [msg, setMsg] = useState('');

  const run = async () => {
    setLoading(true);
    setMsg('');
    setResult(null);
    try {
      const res = await parityApi.batchWeatherBackfill({ yearFrom, yearTo, maxCoveragePct: maxCoverage, dryRun });
      setResult(res);
    } catch (err: any) {
      setMsg('Error: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={S.h1}>Batch Weather Backfill + Rebuild</h3>
      <p style={S.subtitle}>
        Backfill weather from Open-Meteo for events with low coverage. Use Dry Run first to preview.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.75rem' }}>From: <input type="number" value={yearFrom} onChange={e => setYearFrom(+e.target.value)}
          style={{ width: 60, ...S.input }} /></label>
        <label style={{ fontSize: '0.75rem' }}>To: <input type="number" value={yearTo} onChange={e => setYearTo(+e.target.value)}
          style={{ width: 60, ...S.input }} /></label>
        <label style={{ fontSize: '0.75rem' }}>Max Coverage %: <input type="number" value={maxCoverage} onChange={e => setMaxCoverage(+e.target.value)}
          style={{ width: 50, ...S.input }} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
          Dry Run
        </label>
        <button style={S.btn(dryRun ? 'primary' : 'danger')} onClick={run} disabled={loading}>
          {loading ? 'Running…' : dryRun ? 'Preview (Dry Run)' : 'Run Backfill'}
        </button>
        {msg && <span style={{ fontSize: '0.75rem', color: '#e74c3c' }}>{msg}</span>}
      </div>

      {!dryRun && !loading && !result && (
        <div style={{ ...S.card, background: '#fff3cd', borderColor: '#ffc107', fontSize: '0.75rem' }}>
          <strong>Warning:</strong> Live run will fetch weather data from Open-Meteo and write to the database.
          This may take several minutes for large year ranges. Use Dry Run first to preview.
        </div>
      )}

      {result && (
        <>
          <div style={S.card}>
            <strong>{result.dryRun ? 'DRY RUN' : 'LIVE RUN'} Summary — {result.yearRange[0]}–{result.yearRange[1]}</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
              <div>Processed: <strong>{result.totals.processed}</strong></div>
              <div>Backfilled: <strong style={{ color: '#2ecc71' }}>{result.totals.backfilled}</strong></div>
              <div>Rebuilt: <strong style={{ color: '#2ecc71' }}>{result.totals.rebuilt}</strong></div>
              <div>Skipped (high cov): <strong>{result.totals.skipped_high_coverage}</strong></div>
              <div>Skipped (no coords): <strong style={{ color: result.totals.skipped_missing_coords > 0 ? '#e74c3c' : undefined }}>{result.totals.skipped_missing_coords}</strong></div>
              <div>Skipped (no runs): <strong>{result.totals.skipped_no_runs}</strong></div>
              <div>Errors: <strong style={{ color: result.totals.errors > 0 ? '#e74c3c' : undefined }}>{result.totals.errors}</strong></div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Event ID</th>
                  <th style={S.th}>Event</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {result.events.map((ev, i) => (
                  <tr key={i}>
                    <td style={S.td}>{ev.eventId}</td>
                    <td style={S.td}>{ev.event}</td>
                    <td style={{ ...S.td, color: statusColor(ev.status), fontWeight: 600 }}>{ev.status}</td>
                    <td style={{ ...S.td, fontSize: '0.7rem' }}>
                      {ev.reason && <span>{ev.reason}</span>}
                      {ev.track && <span> ({ev.track})</span>}
                      {ev.status === 'ok' && (
                        <span>fetched={ev.fetched}, ins={ev.inserted}, dedup={ev.deduped}, canonical={ev.canonicalBuckets}, prev={ev.previousCoverage}%</span>
                      )}
                      {ev.status === 'would_backfill' && (
                        <span>coverage={ev.currentCoverage}%, runs={ev.runs}</span>
                      )}
                      {ev.error && <span style={{ color: '#e74c3c' }}>{ev.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
