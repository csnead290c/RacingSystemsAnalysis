/**
 * Parity Portal — Internal NHRA Tech Parity Tool
 *
 * MVP internal page for operators to peek, ingest, and query NHRA run data.
 * Gated by nhra.parity capability (owner/admin only).
 * Server-side enforcement via api/parity.php; client check is UX-only.
 */

import { useState, useCallback, useEffect } from 'react';
import { useCapabilities } from '../domain/config/useCapabilities';
import {
  parityApi,
  type PeekResponse,
  type IngestResponse,
  type RunsResponse,
  type ParityRun,
  type ImportsResponse,
  type WeatherBackfillResponse,
  type WeatherBuildCanonicalResponse,
  type RunWithWeather,
  type TopByEventResponse,
  type TopByEventRow,
  type IngestManyResponse,
} from '../services/parityApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../domain/auth';

// ── Styles ──────────────────────────────────────────────────────────────

const S = {
  page: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '1.5rem',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.875rem',
  } as React.CSSProperties,
  h1: {
    fontSize: '1.25rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  subtitle: {
    color: 'var(--color-muted)',
    fontSize: '0.8rem',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  tabs: {
    display: 'flex',
    gap: '0.25rem',
    borderBottom: '2px solid var(--color-border)',
    marginBottom: '1rem',
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--color-text)',
    borderRadius: '4px 4px 0 0',
    fontWeight: active ? 600 : 400,
    fontSize: '0.8rem',
  }) as React.CSSProperties,
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '1rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '0.75rem',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  input: {
    padding: '0.4rem 0.6rem',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    width: 120,
  } as React.CSSProperties,
  inputWide: {
    padding: '0.4rem 0.6rem',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    width: 180,
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'secondary' | 'danger' = 'primary') => ({
    padding: '0.4rem 0.8rem',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
    background: variant === 'primary' ? 'var(--color-primary)' : variant === 'danger' ? '#c0392b' : 'var(--color-border)',
    color: variant === 'secondary' ? 'var(--color-text)' : '#fff',
  }) as React.CSSProperties,
  pre: {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    padding: '0.75rem',
    overflow: 'auto',
    maxHeight: 400,
    fontSize: '0.75rem',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
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
  hint: {
    background: '#fff3cd',
    color: '#856404',
    border: '1px solid #ffc107',
    borderRadius: 4,
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  error: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: 4,
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  stat: {
    display: 'inline-block',
    padding: '0.3rem 0.6rem',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    marginRight: '0.5rem',
    marginBottom: '0.25rem',
    fontSize: '0.8rem',
  } as React.CSSProperties,
} as const;

type Tab = 'peek' | 'ingest' | 'query' | 'imports' | 'weather' | 'runsWeather' | 'trends';

// ── Component ───────────────────────────────────────────────────────────

export default function ParityPortal() {
  const { can } = useCapabilities();
  const [tab, setTab] = useState<Tab>('peek');
  const [raceLookup, setRaceLookup] = useState('');

  if (!can('nhra.parity' as any)) {
    return (
      <div style={S.page}>
        <h1 style={S.h1}>Access Denied</h1>
        <p>You need the <code>nhra.parity</code> capability to access this page.</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>NHRA Tech Parity</h1>
      <p style={S.subtitle}>Internal tool — Ingest and query NHRA run results from OData feed</p>

      <div style={S.row}>
        <label style={{ fontWeight: 600 }}>Race Lookup:</label>
        <input
          style={S.input}
          placeholder="YYYYMMDD"
          value={raceLookup}
          onChange={e => setRaceLookup(e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
        <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
          Must be first date of event
        </span>
      </div>

      <div style={S.tabs}>
        {(['peek', 'ingest', 'query', 'imports', 'weather', 'runsWeather', 'trends'] as Tab[]).map(t => {
          const labels: Record<Tab, string> = {
            peek: 'Peek', ingest: 'Ingest', query: 'Query Runs',
            imports: 'Imports', weather: 'Weather', runsWeather: 'Runs + Weather',
            trends: 'Trends',
          };
          return (
            <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
              {labels[t]}
            </button>
          );
        })}
      </div>

      {tab === 'peek' && <PeekPanel raceLookup={raceLookup} />}
      {tab === 'ingest' && <IngestPanel raceLookup={raceLookup} />}
      {tab === 'query' && <QueryPanel raceLookup={raceLookup} />}
      {tab === 'imports' && <ImportsPanel />}
      {tab === 'weather' && <WeatherPanel />}
      {tab === 'runsWeather' && <RunsWeatherPanel raceLookup={raceLookup} />}
      {tab === 'trends' && <TrendsPanel />}
    </div>
  );
}

// ── Peek Panel ──────────────────────────────────────────────────────────

function PeekPanel({ raceLookup }: { raceLookup: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PeekResponse | null>(null);
  const [error, setError] = useState('');

  const doPeek = useCallback(async () => {
    if (raceLookup.length !== 8) { setError('Enter 8-digit YYYYMMDD'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await parityApi.peek(raceLookup);
      setResult(r);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [raceLookup]);

  return (
    <div style={S.card}>
      <div style={S.row}>
        <button style={S.btn('primary')} onClick={doPeek} disabled={loading}>
          {loading ? 'Fetching...' : 'Peek'}
        </button>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
          Fetches first page from OData — shows shape, keys, and sample row
        </span>
      </div>

      {error && <div style={S.error}>{error}</div>}
      {result?.hint && <div style={S.hint}>{result.hint}</div>}

      {result && (
        <>
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={S.stat}>Shape: <b>{result.detectedShape}</b></span>
            <span style={S.stat}>Rows: <b>{result.rowCountFirstPage}</b></span>
            <span style={S.stat}>Paginated: <b>{result.hasNextLink ? 'Yes' : 'No'}</b></span>
          </div>

          {result.firstRowKeys.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Field Keys ({result.firstRowKeys.length})</h3>
              <pre style={S.pre}>{result.firstRowKeys.join(', ')}</pre>
            </>
          )}

          {result.firstRowSample && (
            <>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0.75rem 0 0.5rem' }}>Raw Sample Row</h3>
              <pre style={S.pre}>{JSON.stringify(result.firstRowSample, null, 2)}</pre>
            </>
          )}

          {result.normalizedSample && (
            <>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, margin: '0.75rem 0 0.5rem' }}>Normalized Sample</h3>
              <pre style={S.pre}>{JSON.stringify(result.normalizedSample, null, 2)}</pre>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Ingest Panel ────────────────────────────────────────────────────────

function IngestPanel({ raceLookup }: { raceLookup: string }) {
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState('');

  const doIngest = useCallback(async () => {
    if (raceLookup.length !== 8) { setError('Enter 8-digit YYYYMMDD'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await parityApi.ingest(raceLookup, force);
      setResult(r);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [raceLookup, force]);

  return (
    <div style={S.card}>
      <div style={S.row}>
        <button style={S.btn('primary')} onClick={doIngest} disabled={loading}>
          {loading ? 'Ingesting...' : 'Ingest'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
          Force re-import
        </label>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
          Fetches all pages, normalizes, and inserts into DB (dedupes automatically)
        </span>
      </div>

      {error && <div style={S.error}>{error}</div>}
      {result?.hint && <div style={S.hint}>{result.hint}</div>}
      {result?.error && !error && <div style={S.hint}>{result.error}</div>}

      {result && !result.error && (
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={S.stat}>Fetched: <b>{result.rowsFetched}</b></span>
            <span style={S.stat}>Inserted: <b>{result.rowsInserted}</b></span>
            <span style={S.stat}>Deduped: <b>{result.rowsDeduped}</b></span>
          </div>
          {result.parsedTimestampCount !== undefined && (
            <div>
              <span style={S.stat}>Timestamps: <b>{result.parsedTimestampCount}</b></span>
              <span style={S.stat}>Classes: <b>{result.parsedClassCount}</b></span>
              <span style={S.stat}>Drivers: <b>{result.parsedDriverCount}</b></span>
              <span style={S.stat}>ft1320: <b>{result.parsedFt1320Count}</b></span>
              <span style={S.stat}>mph1320: <b>{result.parsedMph1320Count}</b></span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', color: 'var(--color-muted)', fontSize: '0.75rem' }}>
            Import ID: {result.importId}
          </div>
        </div>
      )}

      {result?.existingImportId && (
        <div style={S.hint}>
          Already imported: {result.existingRowCount} rows on {result.existingFetchedAt}.
          Check "Force re-import" to create a new import (existing rows will be deduped).
        </div>
      )}
    </div>
  );
}

// ── Query Panel ─────────────────────────────────────────────────────────

function QueryPanel({ raceLookup }: { raceLookup: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunsResponse | null>(null);
  const [error, setError] = useState('');
  const [classIndex, setClassIndex] = useState('');
  const [driverName, setDriverName] = useState('');
  const [lane, setLane] = useState('');
  const [round, setRound] = useState('');
  const [dq, setDq] = useState<'include' | 'exclude' | 'only'>('include');

  const doQuery = useCallback(async () => {
    if (raceLookup.length !== 8) { setError('Enter 8-digit YYYYMMDD'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await parityApi.queryRuns({
        raceLookup,
        classIndex: classIndex || undefined,
        driverName: driverName || undefined,
        lane: lane || undefined,
        round: round || undefined,
        dq,
        limit: 100,
      });
      setResult(r);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [raceLookup, classIndex, driverName, lane, round, dq]);

  return (
    <div style={S.card}>
      <div style={S.row}>
        <input style={S.input} placeholder="Class (e.g. TF)" value={classIndex} onChange={e => setClassIndex(e.target.value)} />
        <input style={S.inputWide} placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)} />
        <select style={{ ...S.input, width: 80 }} value={lane} onChange={e => setLane(e.target.value)}>
          <option value="">Lane</option>
          <option value="L">L</option>
          <option value="R">R</option>
        </select>
        <input style={{ ...S.input, width: 60 }} placeholder="Round" value={round} onChange={e => setRound(e.target.value)} />
        <select style={{ ...S.input, width: 100 }} value={dq} onChange={e => setDq(e.target.value as any)}>
          <option value="include">DQ: All</option>
          <option value="exclude">DQ: Hide</option>
          <option value="only">DQ: Only</option>
        </select>
        <button style={S.btn('primary')} onClick={doQuery} disabled={loading}>
          {loading ? 'Loading...' : 'Query'}
        </button>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {result && (
        <>
          <div style={{ marginBottom: '0.5rem', color: 'var(--color-muted)', fontSize: '0.75rem' }}>
            Showing {result.runs.length} of {result.total} rows
          </div>
          <div style={{ overflow: 'auto', maxHeight: 500 }}>
            <RunsTable runs={result.runs} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Runs Table ──────────────────────────────────────────────────────────

const COLS: { key: keyof ParityRun; label: string; width?: number }[] = [
  { key: 'driver_name', label: 'Driver', width: 140 },
  { key: 'category', label: 'Category', width: 120 },
  { key: 'class_index', label: 'Class', width: 60 },
  { key: 'round', label: 'Rnd', width: 40 },
  { key: 'lane', label: 'Ln', width: 30 },
  { key: 'rt', label: 'RT' },
  { key: 'ft60', label: '60ft' },
  { key: 'ft330', label: '330ft' },
  { key: 'ft660', label: '660ft' },
  { key: 'mph660', label: '660mph' },
  { key: 'ft1000', label: '1000ft' },
  { key: 'ft1320', label: '1320ft' },
  { key: 'mph1320', label: '1320mph' },
  { key: 'dial_in', label: 'Dial' },
  { key: 'win_flag', label: 'W' },
  { key: 'mov', label: 'MOV' },
];

function RunsTable({ runs }: { runs: ParityRun[] }) {
  if (runs.length === 0) return <p style={{ color: 'var(--color-muted)' }}>No runs found.</p>;

  return (
    <table style={S.table}>
      <thead>
        <tr>
          {COLS.map(c => (
            <th key={c.key} style={{ ...S.th, width: c.width }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {runs.map(run => (
          <tr key={run.uuid}>
            {COLS.map(c => (
              <td key={c.key} style={S.td}>{formatCell(run, c.key)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatCell(run: ParityRun, key: keyof ParityRun): React.ReactNode {
  const v = run[key];
  if (v === null || v === undefined) return <span style={{ color: 'var(--color-muted)' }}>—</span>;
  if (key === 'win_flag') return v ? <span style={S.badge('#27ae60')}>W</span> : <span style={S.badge('#95a5a6')}>L</span>;
  if (key === 'dq_flag') return v ? <span style={S.badge('#c0392b')}>DQ</span> : '';
  if (typeof v === 'number') return v.toFixed(key === 'rt' || key === 'mov' ? 3 : key.startsWith('mph') ? 1 : 3);
  return String(v);
}

// ── Imports Panel ───────────────────────────────────────────────────────

function ImportsPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportsResponse | null>(null);
  const [error, setError] = useState('');

  const doLoad = useCallback(async (force = false) => {
    setLoading(true); setError('');
    try {
      const r = await parityApi.listImports(50, force);
      setResult(r);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { doLoad(); }, [doLoad]);

  return (
    <div style={S.card}>
      <div style={S.row}>
        <button style={S.btn('secondary')} onClick={() => doLoad(true)} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
          {result ? `${result.total} imports` : 'Loading...'}
        </span>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {result && (
        <div style={{ overflow: 'auto', maxHeight: 400 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Race Lookup</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Rows</th>
                <th style={S.th}>Fetched At</th>
                <th style={S.th}>Import ID</th>
              </tr>
            </thead>
            <tbody>
              {result.imports.map(imp => (
                <tr key={imp.uuid}>
                  <td style={S.td}><b>{imp.race_lookup}</b></td>
                  <td style={S.td}>
                    <span style={S.badge(imp.status === 'success' ? '#27ae60' : '#c0392b')}>
                      {imp.status}
                    </span>
                  </td>
                  <td style={S.td}>{imp.row_count}</td>
                  <td style={S.td}>{imp.fetched_at_utc || '—'}</td>
                  <td style={{ ...S.td, fontSize: '0.65rem', color: 'var(--color-muted)' }}>{imp.uuid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Weather Panel ───────────────────────────────────────────────────────

function WeatherPanel() {
  const [tracks, setTracks] = useState<{ id: number; track_name: string; timezone_iana: string }[]>([]);
  const [events, setEvents] = useState<{ id: number; event_name: string; track_id: number; track_name: string; timezone_iana: string; start_date_local: string; end_date_local: string; race_lookup: string | null }[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // Create track form
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackTz, setNewTrackTz] = useState('America/New_York');

  // Create event form
  const [newEventName, setNewEventName] = useState('');
  const [newEventTrackId, setNewEventTrackId] = useState(0);
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventRaceLookup, setNewEventRaceLookup] = useState('');

  // Backfill
  const [bfEventId, setBfEventId] = useState(0);
  const [bfResult, setBfResult] = useState<WeatherBackfillResponse | null>(null);
  const [bfLoading, setBfLoading] = useState(false);

  // Canonical
  const [cnResult, setCnResult] = useState<WeatherBuildCanonicalResponse | null>(null);
  const [cnLoading, setCnLoading] = useState(false);

  const loadData = useCallback(async (force = false) => {
    setError('');
    try {
      const [t, e] = await Promise.all([parityApi.listTracks(force), parityApi.listEvents(force)]);
      setTracks(t.tracks);
      setEvents(e.events);
    } catch (e: any) { setError(e.message); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const createTrack = useCallback(async () => {
    if (!newTrackName.trim()) return;
    setError(''); setMsg('');
    try {
      await parityApi.createTrack(newTrackName.trim(), newTrackTz);
      setMsg(`Track "${newTrackName}" created`);
      setNewTrackName('');
      loadData(true);
    } catch (e: any) { setError(e.message); }
  }, [newTrackName, newTrackTz, loadData]);

  const createEvent = useCallback(async () => {
    if (!newEventName.trim() || !newEventTrackId || !newEventStart || !newEventEnd) return;
    setError(''); setMsg('');
    try {
      await parityApi.createEvent({
        eventName: newEventName.trim(),
        trackId: newEventTrackId,
        startDateLocal: newEventStart,
        endDateLocal: newEventEnd,
        raceLookup: newEventRaceLookup || undefined,
      });
      setMsg(`Event "${newEventName}" created`);
      setNewEventName('');
      loadData(true);
    } catch (e: any) { setError(e.message); }
  }, [newEventName, newEventTrackId, newEventStart, newEventEnd, newEventRaceLookup, loadData]);

  const doBackfill = useCallback(async () => {
    if (!bfEventId) return;
    setBfLoading(true); setError(''); setBfResult(null);
    try {
      const r = await parityApi.weatherBackfill({ eventId: bfEventId });
      setBfResult(r);
    } catch (e: any) { setError(e.message); }
    setBfLoading(false);
  }, [bfEventId]);

  const doBuildCanonical = useCallback(async () => {
    setCnLoading(true); setError(''); setCnResult(null);
    try {
      const r = await parityApi.weatherBuildCanonical({});
      setCnResult(r);
    } catch (e: any) { setError(e.message); }
    setCnLoading(false);
  }, []);

  return (
    <div>
      {error && <div style={S.error}>{error}</div>}
      {msg && <div style={S.hint}>{msg}</div>}

      {/* Tracks */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Tracks ({tracks.length})</h3>
          <button style={{ ...S.btn('secondary'), fontSize: '0.7rem', padding: '0.15rem 0.5rem' }} onClick={() => loadData(true)}>↻ Refresh</button>
        </div>
        {tracks.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            {tracks.map(t => (
              <div key={t.id} style={S.stat}><b>{t.track_name}</b> ({t.timezone_iana}) #{t.id}</div>
            ))}
          </div>
        )}
        <div style={S.row}>
          <input style={S.inputWide} placeholder="Track name" value={newTrackName} onChange={e => setNewTrackName(e.target.value)} />
          <input style={S.inputWide} placeholder="Timezone (IANA)" value={newTrackTz} onChange={e => setNewTrackTz(e.target.value)} />
          <button style={S.btn('primary')} onClick={createTrack}>Add Track</button>
        </div>
      </div>

      {/* Events */}
      <div style={S.card}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Events ({events.length})</h3>
        {events.length > 0 && (
          <div style={{ overflow: 'auto', maxHeight: 200, marginBottom: '0.75rem' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th><th style={S.th}>Event</th><th style={S.th}>Track</th>
                  <th style={S.th}>Start</th><th style={S.th}>End</th><th style={S.th}>Lookup</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td style={S.td}>{ev.id}</td>
                    <td style={S.td}><b>{ev.event_name}</b></td>
                    <td style={S.td}>{ev.track_name}</td>
                    <td style={S.td}>{ev.start_date_local}</td>
                    <td style={S.td}>{ev.end_date_local}</td>
                    <td style={S.td}>{ev.race_lookup || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={S.row}>
          <input style={S.inputWide} placeholder="Event name" value={newEventName} onChange={e => setNewEventName(e.target.value)} />
          <select style={{ ...S.input, width: 150 }} value={newEventTrackId} onChange={e => setNewEventTrackId(Number(e.target.value))}>
            <option value={0}>Select track</option>
            {tracks.map(t => <option key={t.id} value={t.id}>{t.track_name}</option>)}
          </select>
          <input style={S.input} type="date" value={newEventStart} onChange={e => setNewEventStart(e.target.value)} />
          <input style={S.input} type="date" value={newEventEnd} onChange={e => setNewEventEnd(e.target.value)} />
          <input style={{ ...S.input, width: 90 }} placeholder="raceLookup" value={newEventRaceLookup} onChange={e => setNewEventRaceLookup(e.target.value)} />
          <button style={S.btn('primary')} onClick={createEvent}>Add Event</button>
        </div>
      </div>

      {/* Backfill */}
      <div style={S.card}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Weather Backfill</h3>
        <div style={S.row}>
          <select style={{ ...S.input, width: 200 }} value={bfEventId} onChange={e => setBfEventId(Number(e.target.value))}>
            <option value={0}>Select event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.event_name} ({ev.start_date_local})</option>)}
          </select>
          <button style={S.btn('primary')} onClick={doBackfill} disabled={bfLoading || !bfEventId}>
            {bfLoading ? 'Backfilling...' : 'Backfill Weather'}
          </button>
        </div>
        {bfResult && (
          <div>
            <span style={S.stat}>Days checked: <b>{bfResult.daysChecked}</b></span>
            <span style={S.stat}>Days fetched: <b>{bfResult.daysFetched}</b></span>
            <span style={S.stat}>Inserted: <b>{bfResult.rowsInserted}</b></span>
            <span style={S.stat}>Deduped: <b>{bfResult.rowsDeduped}</b></span>
            {bfResult.errors.length > 0 && (
              <div style={S.error}>{bfResult.errors.join('; ')}</div>
            )}
          </div>
        )}
      </div>

      {/* Build Canonical */}
      <div style={S.card}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Build Canonical Weather</h3>
        <div style={S.row}>
          <button style={S.btn('primary')} onClick={doBuildCanonical} disabled={cnLoading}>
            {cnLoading ? 'Building...' : 'Build Canonical (all samples)'}
          </button>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
            Buckets samples into 30-min intervals, converts pressure to inHg
          </span>
        </div>
        {cnResult && (
          <div>
            <span style={S.stat}>Buckets: <b>{cnResult.bucketsProcessed}</b></span>
            <span style={S.stat}>Range: {cnResult.startUtc} — {cnResult.endUtc}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Runs + Weather Panel ────────────────────────────────────────────────

function RunsWeatherPanel({ raceLookup }: { raceLookup: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [runs, setRuns] = useState<RunWithWeather[]>([]);
  const [total, setTotal] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [classIndex, setClassIndex] = useState('');
  const [driverName, setDriverName] = useState('');

  const doQuery = useCallback(async () => {
    if (raceLookup.length !== 8) { setError('Enter 8-digit YYYYMMDD'); return; }
    setLoading(true); setError('');
    try {
      const r = await parityApi.runsWithWeather({
        raceLookup,
        windowMinutes,
        classIndex: classIndex || undefined,
        driverName: driverName || undefined,
        limit: 100,
      });
      setRuns(r.runs);
      setTotal(r.total);
      setJoinedCount(r.joinedCount);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [raceLookup, windowMinutes, classIndex, driverName]);

  const exportCsv = useCallback(() => {
    if (runs.length === 0) return;
    const headers = ['Driver', 'Class', 'Round', 'Lane', 'RT', 'ft1320', 'mph1320', 'Temp_F', 'RH%', 'Press_inHg', 'Weather_Delta_s'];
    const rows = runs.map(r => [
      r.driver_name || '', r.class_index || '', r.round || '', r.lane || '',
      r.rt ?? '', r.ft1320 ?? '', r.mph1320 ?? '',
      r.weather?.temp_f ?? '', r.weather?.rh_pct ?? '', r.weather?.pressure_inhg ?? '',
      r.weather?.delta_seconds ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `runs_weather_${raceLookup}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [runs, raceLookup]);

  return (
    <div style={S.card}>
      <div style={S.row}>
        <input style={S.input} placeholder="Class" value={classIndex} onChange={e => setClassIndex(e.target.value)} />
        <input style={S.inputWide} placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)} />
        <label style={{ fontSize: '0.8rem' }}>Window:
          <input style={{ ...S.input, width: 50, marginLeft: 4 }} type="number" value={windowMinutes}
            onChange={e => setWindowMinutes(Number(e.target.value))} /> min
        </label>
        <button style={S.btn('primary')} onClick={doQuery} disabled={loading}>
          {loading ? 'Loading...' : 'Query'}
        </button>
        {runs.length > 0 && (
          <button style={S.btn('secondary')} onClick={exportCsv}>Export CSV</button>
        )}
      </div>

      {error && <div style={S.error}>{error}</div>}

      {runs.length > 0 && (
        <>
          <div style={{ marginBottom: '0.5rem', color: 'var(--color-muted)', fontSize: '0.75rem' }}>
            Showing {runs.length} of {total} runs | {joinedCount} joined to weather (window: ±{windowMinutes}min)
          </div>
          <div style={{ overflow: 'auto', maxHeight: 500 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Driver</th><th style={S.th}>Class</th><th style={S.th}>Rnd</th>
                  <th style={S.th}>Ln</th><th style={S.th}>RT</th><th style={S.th}>1320ft</th>
                  <th style={S.th}>1320mph</th>
                  <th style={{ ...S.th, background: '#eaf4ff' }}>Temp °F</th>
                  <th style={{ ...S.th, background: '#eaf4ff' }}>RH%</th>
                  <th style={{ ...S.th, background: '#eaf4ff' }}>Press inHg</th>
                  <th style={{ ...S.th, background: '#eaf4ff' }}>Δs</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.uuid}>
                    <td style={S.td}>{r.driver_name || '—'}</td>
                    <td style={S.td}>{r.class_index || '—'}</td>
                    <td style={S.td}>{r.round || '—'}</td>
                    <td style={S.td}>{r.lane || '—'}</td>
                    <td style={S.td}>{r.rt != null ? r.rt.toFixed(3) : '—'}</td>
                    <td style={S.td}>{r.ft1320 != null ? r.ft1320.toFixed(3) : '—'}</td>
                    <td style={S.td}>{r.mph1320 != null ? r.mph1320.toFixed(1) : '—'}</td>
                    <td style={{ ...S.td, background: '#f0f7ff' }}>
                      {r.weather?.temp_f != null ? r.weather.temp_f.toFixed(1) : '—'}
                    </td>
                    <td style={{ ...S.td, background: '#f0f7ff' }}>
                      {r.weather?.rh_pct != null ? r.weather.rh_pct.toFixed(1) : '—'}
                    </td>
                    <td style={{ ...S.td, background: '#f0f7ff' }}>
                      {r.weather?.pressure_inhg != null ? r.weather.pressure_inhg.toFixed(3) : '—'}
                    </td>
                    <td style={{ ...S.td, background: '#f0f7ff', fontSize: '0.7rem' }}>
                      {r.weather ? `${r.weather.delta_seconds}s` : '—'}
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

// ── Trends Panel ─────────────────────────────────────────────────────

const NHRA_CLASSES = ['TF','FC','PS','PSM','PSC','TD','TAD','TAF','TAFC','TS','SS','COMP','SST','GT','FSS','SG'];

function formatRaceLookup(rl: string): string {
  if (rl.length !== 8) return rl;
  return `${rl.slice(0,4)}-${rl.slice(4,6)}-${rl.slice(6,8)}`;
}

// Custom tooltip for the chart — shows event name, track, raceLookup, value, runCount
function TrendsTooltip({ active, payload, metric }: any) {
  if (!active || !payload?.length) return null;
  const row: TopByEventRow = payload[0].payload;
  const metricLabel = metric === 'mph1320' ? 'Top MPH' : 'Best ET';
  const valStr = metric === 'mph1320' ? `${row.value.toFixed(2)} MPH` : `${row.value.toFixed(3)} sec`;
  return (
    <div style={{
      background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border)',
      borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.75rem', lineHeight: 1.6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)', maxWidth: 280,
    }}>
      {row.eventName && <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{row.eventName}</div>}
      {row.trackName && <div style={{ color: 'var(--color-muted)' }}>{row.trackName}</div>}
      <div>Date: <b>{formatRaceLookup(row.raceLookup)}</b></div>
      <div>{metricLabel}: <b>{valStr}</b></div>
      <div>Runs: <b>{row.runCount}</b></div>
    </div>
  );
}

// Inline event label editor row
function EventLabelEditor({ row, onSaved }: { row: TopByEventRow; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.eventName || '');
  const [track, setTrack] = useState(row.trackName || '');
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)',
          fontSize: '0.7rem', padding: 0, textDecoration: 'underline' }}>
        {row.eventName ? 'edit' : '+ label'}
      </button>
    );
  }

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const year = parseInt(row.raceLookup.slice(0, 4), 10);
      await parityApi.upsertEventCatalog({
        raceLookup: row.raceLookup,
        eventName: name.trim(),
        trackName: track.trim(),
        seasonYear: year,
      });
      setEditing(false);
      onSaved();
    } catch { /* swallow */ }
    setSaving(false);
  };

  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      <input style={{ ...S.input, width: 120, fontSize: '0.7rem', padding: '0.15rem 0.3rem' }}
        placeholder="Event name" value={name} onChange={e => setName(e.target.value)} />
      <input style={{ ...S.input, width: 90, fontSize: '0.7rem', padding: '0.15rem 0.3rem' }}
        placeholder="Track" value={track} onChange={e => setTrack(e.target.value)} />
      <button style={{ ...S.btn('primary'), fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
        onClick={save} disabled={saving}>{saving ? '...' : 'Save'}</button>
      <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
        onClick={() => setEditing(false)}>X</button>
    </span>
  );
}

function TrendsPanel() {
  const { getUserRole } = useAuth();
  const role = getUserRole();
  const isAdmin = role?.id === 'owner' || role?.id === 'admin';

  // Chart controls
  const [classIndex, setClassIndex] = useState('TF');
  const [metric, setMetric] = useState<'mph1320' | 'ft1320'>('mph1320');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [includeDQ, setIncludeDQ] = useState(false);
  const [minRunCount, setMinRunCount] = useState(1);

  // Chart data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<TopByEventResponse | null>(null);

  // Backfill state
  const [bfStartYear, setBfStartYear] = useState(String(new Date().getFullYear()));
  const [bfEndYear, setBfEndYear] = useState(String(new Date().getFullYear()));
  const [bfSuggesting, setBfSuggesting] = useState(false);
  const [bfSuggested, setBfSuggested] = useState<string[]>([]);
  const [bfIngesting, setBfIngesting] = useState(false);
  const [bfResult, setBfResult] = useState<IngestManyResponse | null>(null);
  const [bfError, setBfError] = useState('');
  const [bfProgress, setBfProgress] = useState('');

  const loadChart = useCallback(async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const startRaceLookup = startYear ? `${startYear}0101` : undefined;
      const endRaceLookup = endYear ? `${endYear}1231` : undefined;
      const res = await parityApi.topByEvent({
        classIndex, metric, startRaceLookup, endRaceLookup,
        includeDQ, minRunCount,
      });
      setData(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [classIndex, metric, startYear, endYear, includeDQ, minRunCount]);

  const exportCsv = useCallback(() => {
    if (!data?.rows.length) return;
    const ml = metric === 'mph1320' ? 'Top MPH' : 'Best ET';
    const header = `Race Lookup,Date,Event Name,Track,${ml},Run Count`;
    const esc = (s: string | null) => s ? `"${s.replace(/"/g, '""')}"` : '';
    const lines = data.rows.map(r =>
      `${r.raceLookup},${formatRaceLookup(r.raceLookup)},${esc(r.eventName)},${esc(r.trackName)},${r.value},${r.runCount}`
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parity_trends_${classIndex}_${metric}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, metric, classIndex]);

  // Backfill: suggest dates
  const suggestDates = useCallback(async () => {
    setBfSuggesting(true); setBfError(''); setBfSuggested([]); setBfResult(null);
    try {
      const allDates: string[] = [];
      const sy = parseInt(bfStartYear, 10);
      const ey = parseInt(bfEndYear, 10);
      if (isNaN(sy) || isNaN(ey) || sy > ey) {
        setBfError('Invalid year range');
        setBfSuggesting(false);
        return;
      }
      for (let y = sy; y <= ey; y++) {
        setBfProgress(`Scanning ${y}...`);
        const res = await parityApi.suggestRaceLookups(y, 80);
        for (const ev of res.events) {
          allDates.push(ev.raceLookup);
        }
      }
      setBfSuggested(allDates);
      setBfProgress(`Found ${allDates.length} events`);
    } catch (e: any) { setBfError(e.message); }
    setBfSuggesting(false);
  }, [bfStartYear, bfEndYear]);

  // Backfill: ingest all suggested
  const ingestAll = useCallback(async () => {
    if (!bfSuggested.length) return;
    setBfIngesting(true); setBfError(''); setBfResult(null);
    setBfProgress(`Ingesting ${bfSuggested.length} events (this may take a while)...`);
    try {
      const res = await parityApi.ingestMany({
        raceLookups: bfSuggested,
        force: false,
        throttleMs: 500,
      });
      setBfResult(res);
      setBfProgress(`Done — ${res.summary.success} ingested, ${res.summary.skipped} skipped`);
    } catch (e: any) { setBfError(e.message); }
    setBfIngesting(false);
  }, [bfSuggested]);

  const metricLabel = metric === 'mph1320' ? 'Top MPH' : 'Best ET (sec)';
  const chartColor = metric === 'mph1320' ? '#2563eb' : '#16a34a';

  return (
    <div>
      {/* ── Chart Controls ── */}
      <div style={S.card}>
        <div style={S.row}>
          <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Class:</label>
          <select value={classIndex} onChange={e => setClassIndex(e.target.value)}
            style={{ ...S.input, width: 80 }}>
            {NHRA_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={{ fontWeight: 600, fontSize: '0.8rem', marginLeft: '0.5rem' }}>Metric:</label>
          <select value={metric} onChange={e => setMetric(e.target.value as any)}
            style={{ ...S.input, width: 130 }}>
            <option value="mph1320">Top MPH (1320)</option>
            <option value="ft1320">Best ET (1320)</option>
          </select>

          <label style={{ fontWeight: 600, fontSize: '0.8rem', marginLeft: '0.5rem' }}>From Year:</label>
          <input style={{ ...S.input, width: 60 }} placeholder="YYYY" maxLength={4}
            value={startYear} onChange={e => setStartYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />

          <label style={{ fontWeight: 600, fontSize: '0.8rem', marginLeft: '0.25rem' }}>To:</label>
          <input style={{ ...S.input, width: 60 }} placeholder="YYYY" maxLength={4}
            value={endYear} onChange={e => setEndYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />

          <button style={S.btn('primary')} onClick={loadChart} disabled={loading}>
            {loading ? 'Loading...' : 'Load Chart'}
          </button>
        </div>
        <div style={{ ...S.row, marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeDQ} onChange={e => setIncludeDQ(e.target.checked)} />
            Include DQ
          </label>
          <label style={{ fontWeight: 600, fontSize: '0.8rem', marginLeft: '1rem' }}>Min runs:</label>
          <input type="number" min={1} max={500} style={{ ...S.input, width: 55 }}
            value={minRunCount} onChange={e => setMinRunCount(Math.max(1, parseInt(e.target.value, 10) || 1))} />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
            (DQ rows with null flag treated as non-DQ)
          </span>
        </div>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {/* ── Chart ── */}
      {data && data.rows.length > 0 && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
              {classIndex} — {metricLabel} per Event ({data.rows.length} events)
              {data.includeDQ && <span style={{ ...S.badge('#6b7280'), marginLeft: 6 }}>+DQ</span>}
              {data.minRunCount > 1 && <span style={{ ...S.badge('#3b82f6'), marginLeft: 4 }}>≥{data.minRunCount} runs</span>}
            </h3>
            <button style={S.btn('secondary')} onClick={exportCsv}>Export CSV</button>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.rows} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="raceLookup"
                tickFormatter={rl => {
                  const row = data.rows.find(r => r.raceLookup === rl);
                  if (row?.eventName) {
                    const short = row.eventName.length > 16 ? row.eventName.slice(0, 14) + '…' : row.eventName;
                    return short;
                  }
                  return formatRaceLookup(rl).slice(0, 7);
                }}
                tick={{ fontSize: 9 }}
                interval="preserveStartEnd"
                angle={data.rows.length > 10 ? -30 : 0}
                textAnchor={data.rows.length > 10 ? 'end' : 'middle'}
                height={data.rows.length > 10 ? 60 : 30}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => metric === 'mph1320' ? v.toFixed(0) : v.toFixed(2)}
              />
              <Tooltip content={<TrendsTooltip metric={metric} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                dot={{ r: 3, fill: chartColor }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && data.rows.length === 0 && (
        <div style={S.hint}>No data found for {classIndex} {metric}. Try ingesting more events or lowering min run count.</div>
      )}

      {/* ── Data Table ── */}
      {data && data.rows.length > 0 && (
        <div style={S.card}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Data ({data.rows.length} rows)
          </h3>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Race Lookup</th>
                  <th style={S.th}>Event</th>
                  <th style={S.th}>Track</th>
                  <th style={S.th}>{metricLabel}</th>
                  <th style={S.th}>Runs</th>
                  {isAdmin && <th style={S.th}>Label</th>}
                </tr>
              </thead>
              <tbody>
                {data.rows.map(r => (
                  <tr key={r.raceLookup}>
                    <td style={S.td}>
                      <span title={formatRaceLookup(r.raceLookup)}>{r.raceLookup}</span>
                    </td>
                    <td style={S.td}>{r.eventName || <span style={{ color: 'var(--color-muted)' }}>—</span>}</td>
                    <td style={S.td}>{r.trackName || <span style={{ color: 'var(--color-muted)' }}>—</span>}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>
                      {metric === 'mph1320' ? r.value.toFixed(2) : r.value.toFixed(3)}
                    </td>
                    <td style={S.td}>{r.runCount.toLocaleString()}</td>
                    {isAdmin && (
                      <td style={S.td}>
                        <EventLabelEditor row={r} onSaved={loadChart} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Backfill Panel (admin only) ── */}
      {isAdmin && (
        <div style={{ ...S.card, borderColor: '#f59e0b', borderWidth: 2 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Backfill History (Admin)
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            Scans NHRA OData for event dates and batch-ingests them. This triggers external API calls.
          </p>

          <div style={S.row}>
            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>Start Year:</label>
            <input style={{ ...S.input, width: 60 }} value={bfStartYear}
              onChange={e => setBfStartYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <label style={{ fontWeight: 600, fontSize: '0.8rem' }}>End Year:</label>
            <input style={{ ...S.input, width: 60 }} value={bfEndYear}
              onChange={e => setBfEndYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />

            <button style={S.btn('secondary')} onClick={suggestDates}
              disabled={bfSuggesting || bfIngesting}>
              {bfSuggesting ? 'Scanning...' : 'Suggest Event Dates'}
            </button>

            {bfSuggested.length > 0 && (
              <button style={S.btn('primary')} onClick={ingestAll}
                disabled={bfIngesting || bfSuggesting}>
                {bfIngesting ? 'Ingesting...' : `Ingest ${bfSuggested.length} Events`}
              </button>
            )}
          </div>

          {bfProgress && <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{bfProgress}</div>}
          {bfError && <div style={S.error}>{bfError}</div>}

          {bfSuggested.length > 0 && !bfResult && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Dates: {bfSuggested.join(', ')}
            </div>
          )}

          {bfResult && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={S.stat}>Total: <b>{bfResult.summary.total}</b></span>
                <span style={S.stat}>Ingested: <b>{bfResult.summary.success}</b></span>
                <span style={S.stat}>Skipped: <b>{bfResult.summary.skipped}</b></span>
                <span style={S.stat}>Empty: <b>{bfResult.summary.empty}</b></span>
                <span style={S.stat}>Errors: <b>{bfResult.summary.error}</b></span>
                <span style={S.stat}>Rows: <b>{bfResult.summary.totalRowsInserted.toLocaleString()}</b></span>
              </div>
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Race Lookup</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Fetched</th>
                      <th style={S.th}>Inserted</th>
                      <th style={S.th}>Deduped</th>
                      <th style={S.th}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bfResult.results.map(r => (
                      <tr key={r.raceLookup}>
                        <td style={S.td}>{r.raceLookup}</td>
                        <td style={S.td}>
                          <span style={S.badge(
                            r.status === 'success' ? '#16a34a' :
                            r.status === 'skipped' ? '#6b7280' :
                            r.status === 'empty' ? '#f59e0b' : '#dc2626'
                          )}>{r.status}</span>
                        </td>
                        <td style={S.td}>{r.rowsFetched}</td>
                        <td style={S.td}>{r.rowsInserted}</td>
                        <td style={S.td}>{r.rowsDeduped}</td>
                        <td style={S.td}>{r.error || r.reason || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
