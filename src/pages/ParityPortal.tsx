/**
 * Parity Portal — Internal NHRA Tech Parity Tool
 *
 * MVP internal page for operators to peek, ingest, and query NHRA run data.
 * Gated by nhra.parity capability (owner/admin only).
 * Server-side enforcement via api/parity.php; client check is UX-only.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useCapabilities } from '../domain/config/useCapabilities';
import './ParityPortal.css';
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
  type BackfillJob,
  type BackfillStatusResponse,
  type EventWithStats,
  type EventParitySummaryResponse,
  type QualSheetResponse,
  type QualSheetRow,
  type LadderResponse,
  type LadderPairing,
  type DriverEntry,
  type DriverRun,
  type TrackWithStats,
  type ClassAlias,
  type EngineComboRow,
  type DriverComboRow,
  type ClassDefaultRow,
  type WeatherCoverageResponse,
  type StationCsvImportRow,
  type StationCsvImportResponse,
  type StationCsvMappedRow,
  type WeatherTimeseriesResponse,
  type TimeDiagnosticsSampleResponse,
} from '../services/parityApi';
import {
  formatET, formatMPH, formatBaro,
  formatTemp, formatRH,
} from '../domain/parity/format';
import TrackCoordCoveragePanel from './TrackCoordCoveragePanel';
import BatchBackfillPanel from './BatchBackfillPanel';
// ParityDashPanel kept in admin tools only
import ParityDashPanel from './ParityDashPanel';
void ParityDashPanel;
import ParityReport from './ParityReport';
import {
  computeWeather,
  computeHPC,
  correctET,
  correctMPH,
  pct_to_frac,
  resolveEngineCombo,
  type WeatherResult,
  type ClassDefaultComboRow,
} from '../domain/parity/weatherCorrection';
import { parseCsvWeatherData, WEATHER_PROVIDERS, type WeatherSampleRow } from '../domain/parity/weatherBackfill';
import { parseBulkCsv, normalizeTrackName } from '../domain/parity/eventImport';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { exportQualSheetPdf, exportLadderPdf, exportParitySummaryPdf } from '../services/parityPdf';

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

type Tab = 'eventRuns' | 'qualSheet' | 'driverHistory' | 'trends' | 'weatherDash' | 'parityDash' | 'parityReport'
  | 'parity' | 'ladder' | 'peek' | 'ingest' | 'query' | 'imports' | 'weather' | 'runsWeather' | 'backfill'
  | 'adminTracks' | 'adminEvents' | 'classAliases' | 'engineCombos' | 'driverCombos' | 'assignCombos'
  | 'weatherCorrection' | 'backfillWeather' | 'weatherHealth' | 'importStationCsv'
  | 'trackCoords' | 'batchBackfill' | 'timeDiagnostics';

// Classes in scope for dashboard pickers (used by Phase 1 tab filters)
const PARITY_CLASSES = ['TF', 'FC', 'PRO', 'PSM', 'PM', 'TAD', 'TAFC'] as const;
void PARITY_CLASSES;

const DASHBOARD_TABS: { key: Tab; label: string }[] = [
  { key: 'eventRuns', label: 'Event Runs' },
  { key: 'driverHistory', label: 'Driver History' },
  { key: 'weatherDash', label: 'Weather' },
  { key: 'parityReport', label: 'Parity Report' },
  { key: 'trends', label: 'Trends' },
];

/** Pick the best default event: active > most recently completed > latest with runs */
function resolveDefaultEvent(events: EventWithStats[]): EventWithStats | null {
  if (events.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  // 1) Active event (today is between start and end dates)
  const active = events.find(e => e.start_date_local <= today && e.end_date_local >= today);
  if (active) return active;
  // 2) Most recently completed (end_date < today, events already sorted desc by start_date)
  const completed = events.filter(e => e.end_date_local < today);
  if (completed.length > 0) return completed[0];
  // 3) Latest with runs in DB
  const withRuns = events.filter(e => e.run_count > 0);
  if (withRuns.length > 0) return withRuns[0];
  // Fallback: first event
  return events[0];
}

const ADMIN_TABS: { key: Tab; label: string }[] = [
  { key: 'trackCoords', label: 'Track Coords' },
  { key: 'batchBackfill', label: 'Batch Backfill' },
  { key: 'adminTracks', label: 'Tracks' },
  { key: 'adminEvents', label: 'Events' },
  { key: 'classAliases', label: 'Class Aliases' },
  { key: 'engineCombos', label: 'Combo Definitions' },
  { key: 'driverCombos', label: 'Assignments (raw)' },
  { key: 'assignCombos', label: 'Assign Combos' },
  { key: 'parity', label: 'Parity Summary' },
  { key: 'ingest', label: 'Ingest' },
  { key: 'peek', label: 'Peek' },
  { key: 'query', label: 'Query Runs' },
  { key: 'imports', label: 'Imports' },
  { key: 'weather', label: 'Weather' },
  { key: 'runsWeather', label: 'Runs + Weather' },
  { key: 'weatherCorrection', label: 'Weather Correction' },
  { key: 'backfillWeather', label: 'Backfill Weather' },
  { key: 'backfill', label: 'Backfill' },
  { key: 'weatherHealth', label: 'Weather Health' },
  { key: 'timeDiagnostics', label: 'Time Diagnostics' },
  { key: 'importStationCsv', label: 'Import Station CSV' },
  { key: 'ladder', label: 'Ladder (exp.)' },
];

// ── Component ───────────────────────────────────────────────────────────

export default function ParityPortal() {
  const { can } = useCapabilities();
  const isParityAdmin = can('nhra.parity.admin' as any);
  const [tab, setTab] = useState<Tab>('eventRuns');
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [raceLookup, setRaceLookup] = useState('');
  const [driverHistoryFilter, setDriverHistoryFilter] = useState<{ driver?: string; classIndex?: string } | null>(null);

  // Event picker state (shared across tabs)
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [_defaultResolved, setDefaultResolved] = useState(false); // tracks if initial event resolved
  void _defaultResolved; // will gate rendering in Phase 1

  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  const loadEvents = useCallback(async (year: number) => {
    setEventsLoading(true);
    try {
      const res = await parityApi.eventsWithStats(year);
      setEvents(res.events);
      if (res.events.length > 0 && !res.events.find(e => e.id === selectedEventId)) {
        // Use unified default event resolver on first load
        const best = resolveDefaultEvent(res.events);
        if (best) {
          setSelectedEventId(best.id);
          setRaceLookup(best.race_lookup || '');
        }
      }
    } catch { /* ignore */ }
    setEventsLoading(false);
    setDefaultResolved(true);
  }, [selectedEventId]);

  useEffect(() => { loadEvents(selectedYear); }, [selectedYear, loadEvents]);

  const handleEventChange = useCallback((id: number) => {
    setSelectedEventId(id);
    const ev = events.find(e => e.id === id);
    if (ev) setRaceLookup(ev.race_lookup || '');
  }, [events]);

  if (!can('nhra.parity' as any)) {
    return (
      <div style={S.page}>
        <h1 style={S.h1}>Access Denied</h1>
        <p>You need the <code>nhra.parity</code> capability to access this page.</p>
      </div>
    );
  }

  const years = Array.from({ length: 2027 - 2010 }, (_, i) => 2010 + i).reverse();

  // Which tabs to show
  const visibleTabs = showAdminTools ? ADMIN_TABS : DASHBOARD_TABS;

  // Helper: navigate to Driver History with pre-set filters
  const goToDriverHistory = (driver: string, classIndex?: string) => {
    setDriverHistoryFilter({ driver, classIndex });
    setTab('driverHistory');
  };

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <h1 style={{ ...S.h1, marginBottom: 0 }}>NHRA Tech Parity</h1>
        {isParityAdmin && !showAdminTools && (
          <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', opacity: 0.7, padding: '0.25rem 0.5rem' }}
            onClick={() => { setShowAdminTools(true); setTab('adminTracks'); }}>
            Admin Tools
          </button>
        )}
        {showAdminTools && (
          <button style={{ ...S.btn('primary'), fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}
            onClick={() => { setShowAdminTools(false); setTab('eventRuns'); }}>
            ◀ Dashboard
          </button>
        )}
      </div>
      <p style={S.subtitle}>
        {showAdminTools ? 'Admin — Ingest, backfill, and manage parity data' : 'Event results, qualifying, driver analysis, and trends'}
      </p>

      {/* ── Event Picker (compact single row) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <select style={{ ...S.input, width: 72, fontSize: '0.8rem' }} value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={{ ...S.input, flex: '1 1 250px', minWidth: 0, fontSize: '0.8rem' }} value={selectedEventId ?? ''}
          onChange={e => handleEventChange(Number(e.target.value))}
          disabled={eventsLoading || events.length === 0}>
          {events.length === 0 && <option value="">—{eventsLoading ? ' Loading...' : ' No events'}—</option>}
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.event_name} ({ev.start_date_local})
            </option>
          ))}
        </select>
        <button style={{ ...S.btn('secondary'), padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} onClick={() => loadEvents(selectedYear)}
          disabled={eventsLoading}>{eventsLoading ? '...' : '↻'}</button>
        {selectedEvent && (
          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
            {selectedEvent.track_name}{selectedEvent.city ? ` · ${selectedEvent.city}` : ''}
          </span>
        )}
      </div>

      {/* Mobile: dropdown nav */}
      <div className="parity-nav-mobile" data-testid="parity-nav-mobile">
        <select
          value={tab}
          onChange={e => setTab(e.target.value as Tab)}
          aria-label="Navigate tabs"
        >
          <optgroup label={showAdminTools ? 'Admin Tools' : 'Dashboard'}>
            {visibleTabs.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Desktop/Tablet: scrollable tab bar */}
      <div className="parity-tabs" role="tablist" aria-label="Portal navigation">
        {visibleTabs.map(t => (
          <button
            key={t.key}
            className="parity-tab"
            role="tab"
            aria-selected={tab === t.key}
            style={{
              background: tab === t.key ? 'var(--color-primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--color-text)',
              fontWeight: tab === t.key ? 600 : 400,
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Panels ── */}
      {tab === 'eventRuns' && <EventRunsPanel event={selectedEvent} onDriverClick={goToDriverHistory} />}
      {tab === 'qualSheet' && <QualSheetPanel event={selectedEvent} onDriverClick={goToDriverHistory} />} {/* kept for admin */}
      {tab === 'driverHistory' && <DriverDrilldownPanel initialFilter={driverHistoryFilter} />}
      {tab === 'trends' && <TrendsPanel />}
      {tab === 'weatherDash' && <WeatherDashPanel event={selectedEvent} />}
      {tab === 'parityReport' && <ParityReport event={selectedEvent} />}

      {/* ── Admin Panels ── */}
      {tab === 'adminTracks' && <AdminTracksPanel />}
      {tab === 'adminEvents' && <AdminEventsPanel onRefreshEvents={() => loadEvents(selectedYear)} />}
      {tab === 'classAliases' && <ClassAliasesPanel />}
      {tab === 'engineCombos' && <EngineCombosPanel />}
      {tab === 'driverCombos' && <DriverCombosPanel />}
      {tab === 'assignCombos' && <AssignCombosPanel events={events} selectedEvent={selectedEvent} onGoToRunsWeather={() => setTab('runsWeather')} />}
      {tab === 'weatherCorrection' && <WeatherCorrectionPanel event={selectedEvent} />}
      {tab === 'parity' && <ParitySummaryPanel event={selectedEvent} />}
      {tab === 'ladder' && <LadderPanel event={selectedEvent} />}
      {tab === 'peek' && <PeekPanel raceLookup={raceLookup} />}
      {tab === 'ingest' && <IngestPanel raceLookup={raceLookup} />}
      {tab === 'query' && <QueryPanel raceLookup={raceLookup} />}
      {tab === 'imports' && <ImportsPanel />}
      {tab === 'weather' && <WeatherPanel />}
      {tab === 'runsWeather' && <RunsWeatherPanel raceLookup={raceLookup} onGoToAssignCombos={() => { setShowAdminTools(true); setTab('assignCombos'); }} />}
      {tab === 'backfillWeather' && <BackfillWeatherPanel />}
      {tab === 'backfill' && <BackfillPanel />}
      {tab === 'weatherHealth' && <WeatherHealthPanel events={events} selectedEvent={selectedEvent} />}
      {tab === 'timeDiagnostics' && <TimeDiagnosticsPanel event={selectedEvent} />}
      {tab === 'importStationCsv' && <StationCsvImportPanel />}
      {tab === 'trackCoords' && <TrackCoordCoveragePanel />}
      {tab === 'batchBackfill' && <BatchBackfillPanel />}
    </div>
  );
}

// ── Event Runs Panel ────────────────────────────────────────────────────

type RunSortKey = 'driver_name' | 'class_index' | 'round' | 'lane' | 'rt' | 'ft60' | 'ft330' | 'ft660' | 'mph660' | 'ft1000' | 'mph1000' | 'ft1320' | 'mph1320' | 'wx_temp' | 'wx_rh' | 'wx_press';
type SortDir = 'asc' | 'desc';

// Column definitions for the column picker
interface ColDef {
  key: string;
  label: string;
  sortKey?: RunSortKey;
  group: 'core' | 'slip' | 'weather';
  defaultOn: boolean;
  format?: (r: RunWithWeather) => string;
  align?: 'left' | 'right';
  bold?: boolean;
}

const ALL_COLUMNS: ColDef[] = [
  { key: 'driver_name', label: 'Driver', sortKey: 'driver_name', group: 'core', defaultOn: true, align: 'left' },
  { key: 'class_index', label: 'Class', group: 'core', defaultOn: true, align: 'left' },
  { key: 'round', label: 'Rnd', sortKey: 'round', group: 'core', defaultOn: true, align: 'left' },
  { key: 'lane', label: 'Ln', sortKey: 'lane', group: 'core', defaultOn: true, align: 'left' },
  { key: 'rt', label: 'RT', sortKey: 'rt', group: 'core', defaultOn: true, format: r => r.rt != null ? formatET(r.rt) : '', align: 'right' },
  { key: 'ft60', label: '60ft', sortKey: 'ft60', group: 'slip', defaultOn: true, format: r => r.ft60 != null ? formatET(r.ft60) : '', align: 'right' },
  { key: 'ft330', label: '330ft', sortKey: 'ft330', group: 'slip', defaultOn: false, format: r => r.ft330 != null ? formatET(r.ft330) : '', align: 'right' },
  { key: 'ft660', label: '660ft', sortKey: 'ft660', group: 'slip', defaultOn: false, format: r => r.ft660 != null ? formatET(r.ft660) : '', align: 'right' },
  { key: 'mph660', label: '660mph', sortKey: 'mph660', group: 'slip', defaultOn: false, format: r => r.mph660 != null ? formatMPH(r.mph660) : '', align: 'right' },
  { key: 'ft1000', label: '1000ft', sortKey: 'ft1000', group: 'slip', defaultOn: false, format: r => r.ft1000 != null ? formatET(r.ft1000) : '', align: 'right' },
  { key: 'mph1000', label: '1000mph', sortKey: 'mph1000', group: 'slip', defaultOn: false, format: r => r.mph1000 != null ? formatMPH(r.mph1000) : '', align: 'right' },
  { key: 'ft1320', label: 'ET', sortKey: 'ft1320', group: 'core', defaultOn: true, format: r => r.ft1320 != null ? formatET(r.ft1320) : '', align: 'right', bold: true },
  { key: 'mph1320', label: 'MPH', sortKey: 'mph1320', group: 'core', defaultOn: true, format: r => r.mph1320 != null ? formatMPH(r.mph1320) : '', align: 'right', bold: true },
  { key: 'wx_temp', label: 'Temp °F', sortKey: 'wx_temp', group: 'weather', defaultOn: false, format: r => r.weather?.temp_f != null ? formatTemp(r.weather.temp_f) : '', align: 'right' },
  { key: 'wx_rh', label: 'RH%', sortKey: 'wx_rh', group: 'weather', defaultOn: false, format: r => r.weather?.rh_pct != null ? formatRH(r.weather.rh_pct) : '', align: 'right' },
  { key: 'wx_press', label: 'Press inHg', sortKey: 'wx_press', group: 'weather', defaultOn: false, format: r => r.weather?.pressure_inhg != null ? formatBaro(r.weather.pressure_inhg) : '', align: 'right' },
];

function getRunSortValue(r: RunWithWeather, key: RunSortKey): any {
  if (key === 'wx_temp') return r.weather?.temp_f ?? null;
  if (key === 'wx_rh') return r.weather?.rh_pct ?? null;
  if (key === 'wx_press') return r.weather?.pressure_inhg ?? null;
  return (r as any)[key] ?? null;
}

function EventRunsPanel({ event, onDriverClick }: { event: EventWithStats | null; onDriverClick?: (driver: string, classIndex?: string) => void }) {
  const [runs, setRuns] = useState<RunWithWeather[]>([]);
  const [total, setTotal] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [classFilter, setClassFilter] = useState('TF');
  const [roundFilter, setRoundFilter] = useState('');
  const [laneFilter, setLaneFilter] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [includeBad, setIncludeBad] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<RunSortKey>('ft1320');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // View mode
  const [showIncrementals, setShowIncrementals] = useState(false);
  const [showColPicker, setShowColPicker] = useState(false);

  // Column picker state — initialise from defaults
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () => new Set(ALL_COLUMNS.filter(c => c.defaultOn).map(c => c.key))
  );

  // Flags
  const [flaggingId, setFlaggingId] = useState<number | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flaggedRunIds, setFlaggedRunIds] = useState<Set<number>>(new Set());

  const loadRuns = useCallback(async () => {
    if (!event?.race_lookup) return;
    setLoading(true); setError('');
    try {
      const res = await parityApi.runsWithWeather({
        raceLookup: event.race_lookup,
        classIndex: classFilter || undefined,
        round: roundFilter || undefined,
        lane: laneFilter || undefined,
        limit: 5000,
      });
      setRuns(res.runs);
      setTotal(res.total);
      setJoinedCount(res.joinedCount);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [event?.race_lookup, classFilter, roundFilter, laneFilter]);

  const loadFlags = useCallback(async () => {
    if (!event?.race_lookup) return;
    try {
      const res = await parityApi.runFlags(event.race_lookup);
      setFlaggedRunIds(new Set(res.flags.filter(f => f.flag_type === 'bad' || f.flag_type === 'exclude').map(f => f.run_id)));
    } catch { /* ignore */ }
  }, [event?.race_lookup]);

  useEffect(() => { loadRuns(); loadFlags(); }, [loadRuns, loadFlags]);

  // Client-side filters: flagged + driver search
  const filteredRuns = useMemo(() => {
    let result = runs;
    if (!includeBad) result = result.filter(r => !flaggedRunIds.has(r.id));
    if (driverSearch.trim()) {
      const q = driverSearch.trim().toLowerCase();
      result = result.filter(r => r.driver_name?.toLowerCase().includes(q));
    }
    return result;
  }, [runs, includeBad, flaggedRunIds, driverSearch]);

  // Sort
  const sortedRuns = useMemo(() => [...filteredRuns].sort((a, b) => {
    const av = getRunSortValue(a, sortKey);
    const bv = getRunSortValue(b, sortKey);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filteredRuns, sortKey, sortDir]);

  const handleSort = (key: RunSortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'mph1320' || key === 'mph660' || key === 'mph1000' ? 'desc' : 'asc'); }
  };

  const sortArrow = (key: RunSortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const doFlag = useCallback(async (runId: number) => {
    try {
      await parityApi.flagRun({ runId, flagType: 'bad', reason: flagReason || 'Flagged as bad' });
      setFlaggingId(null);
      setFlagReason('');
      loadFlags();
    } catch (e: any) { setError(e.message); }
  }, [flagReason, loadFlags]);

  const doUnflag = useCallback(async (runId: number) => {
    try {
      await parityApi.unflagRun({ runId });
      loadFlags();
    } catch (e: any) { setError(e.message); }
  }, [loadFlags]);

  const toggleCol = (key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: 'slip' | 'weather') => {
    const groupCols = ALL_COLUMNS.filter(c => c.group === group);
    const allOn = groupCols.every(c => visibleCols.has(c.key));
    setVisibleCols(prev => {
      const next = new Set(prev);
      groupCols.forEach(c => allOn ? next.delete(c.key) : next.add(c.key));
      return next;
    });
  };

  // CSV export
  const exportCsv = () => {
    const cols = ALL_COLUMNS.filter(c => visibleCols.has(c.key));
    const header = cols.map(c => c.label).join(',');
    const rows = sortedRuns.map(r => cols.map(c => {
      if (c.key === 'driver_name') return `"${(r.driver_name || '').replace(/"/g, '""')}"`;
      if (c.key === 'class_index') return r.class_index || '';
      if (c.key === 'round') return r.round || '';
      if (c.key === 'lane') return r.lane || '';
      if (c.format) return c.format(r);
      return '';
    }).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-runs-${event?.race_lookup || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique values for filter dropdowns
  const availableClasses = useMemo(() => [...new Set(runs.map(r => r.class_index).filter(Boolean))].sort(), [runs]);
  const availableRounds = useMemo(() => [...new Set(runs.map(r => r.round).filter(Boolean))].sort(), [runs]);

  const activeCols = ALL_COLUMNS.filter(c => visibleCols.has(c.key));

  const stickyTh: React.CSSProperties = {
    ...S.th, position: 'sticky', top: 0, zIndex: 1,
    background: 'var(--color-surface, #1e1e2e)',
  };

  if (!event) {
    return (
      <div style={S.card}>
        <p style={{ color: 'var(--color-muted)' }}>Select an event above to view runs.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Toolbar Row 1: View toggle, Column picker, CSV, Include flagged ── */}
      <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button style={{ ...S.btn(showIncrementals ? 'primary' : 'secondary'), fontSize: '0.7rem' }}
          onClick={() => setShowIncrementals(v => !v)}>
          {showIncrementals ? '◀ Standard View' : 'Incrementals ▶'}
        </button>
        <button style={{ ...S.btn(showColPicker ? 'primary' : 'secondary'), fontSize: '0.7rem' }}
          onClick={() => setShowColPicker(v => !v)}>
          Columns
        </button>
        <button style={{ ...S.btn('secondary'), fontSize: '0.7rem' }} onClick={exportCsv}
          disabled={sortedRuns.length === 0}>
          CSV Export
        </button>
        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <input type="checkbox" checked={includeBad} onChange={e => setIncludeBad(e.target.checked)} />
          Include flagged
        </label>
      </div>

      {/* ── Column Picker ── */}
      {showColPicker && (
        <div style={{ ...S.card, padding: '0.5rem 0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <div>
              <b>Slip Columns</b>
              <button style={{ ...S.btn('secondary'), fontSize: '0.6rem', padding: '0 0.3rem', marginLeft: '0.4rem' }}
                onClick={() => toggleGroup('slip')}>Toggle All</button>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {ALL_COLUMNS.filter(c => c.group === 'slip').map(c => (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input type="checkbox" checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <b>Weather</b>
              <button style={{ ...S.btn('secondary'), fontSize: '0.6rem', padding: '0 0.3rem', marginLeft: '0.4rem' }}
                onClick={() => toggleGroup('weather')}>Toggle All</button>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {ALL_COLUMNS.filter(c => c.group === 'weather').map(c => (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input type="checkbox" checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div style={S.error}>{error}</div>}

      {/* ── Filters Row ── */}
      <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <b style={{ fontSize: '0.8rem' }}>Class:</b>
        {['TF', 'FC', 'PS', 'PSM', 'TD', 'TS', ''].map(c => (
          <button key={c} style={{
            ...S.btn(classFilter === c ? 'primary' : 'secondary'),
            fontSize: '0.7rem', padding: '0.15rem 0.4rem',
          }} onClick={() => setClassFilter(c)}>
            {c || 'All'}
          </button>
        ))}
        {availableClasses.filter(c => !['TF', 'FC', 'PS', 'PSM', 'TD', 'TS'].includes(c!)).length > 0 && (
          <select style={{ ...S.input, width: 80, fontSize: '0.7rem' }} value={classFilter}
            onChange={e => setClassFilter(e.target.value)}>
            <option value="">All</option>
            {availableClasses.map(c => <option key={c} value={c!}>{c}</option>)}
          </select>
        )}

        <span style={{ borderLeft: '1px solid var(--color-border)', height: 16, margin: '0 0.25rem' }} />

        <b style={{ fontSize: '0.75rem' }}>Rnd:</b>
        <select style={{ ...S.input, width: 70, fontSize: '0.7rem', padding: '0.15rem 0.3rem' }} value={roundFilter}
          onChange={e => setRoundFilter(e.target.value)}>
          <option value="">All</option>
          {availableRounds.map(r => <option key={r} value={r!}>{r}</option>)}
        </select>

        <b style={{ fontSize: '0.75rem' }}>Lane:</b>
        <select style={{ ...S.input, width: 60, fontSize: '0.7rem', padding: '0.15rem 0.3rem' }} value={laneFilter}
          onChange={e => setLaneFilter(e.target.value)}>
          <option value="">All</option>
          <option value="L">L</option>
          <option value="R">R</option>
        </select>

        <input style={{ ...S.input, width: 120, fontSize: '0.7rem', padding: '0.15rem 0.3rem' }}
          placeholder="Driver search..."
          value={driverSearch}
          onChange={e => setDriverSearch(e.target.value)} />
      </div>

      {loading && <div style={S.hint}>Loading runs with weather...</div>}

      {!loading && sortedRuns.length === 0 && (
        <div style={S.hint}>No runs found{classFilter ? ` for class ${classFilter}` : ''}.</div>
      )}

      {/* ── Summary stats ── */}
      {!loading && sortedRuns.length > 0 && (
        <div style={{ marginBottom: '0.35rem', color: 'var(--color-muted)', fontSize: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>{sortedRuns.length} of {total} runs{classFilter ? ` (${classFilter})` : ''}</span>
          <span style={{ color: joinedCount > 0 ? '#2563eb' : '#6b7280' }}>
            {joinedCount} with weather ({total > 0 ? Math.round(joinedCount / total * 100) : 0}%)
          </span>
        </div>
      )}

      {/* ── Standard Table ── */}
      {sortedRuns.length > 0 && !showIncrementals && (
        <div style={{ overflow: 'auto', maxHeight: 500 }}>
          <table style={S.table}>
            <thead>
              <tr>
                {activeCols.map(c => (
                  <th key={c.key} style={{ ...stickyTh, cursor: c.sortKey ? 'pointer' : undefined, textAlign: c.align === 'right' ? 'right' : 'left' }}
                    onClick={c.sortKey ? () => handleSort(c.sortKey!) : undefined}>
                    {c.label}{c.sortKey ? sortArrow(c.sortKey) : ''}
                  </th>
                ))}
                <th style={stickyTh}>Flag</th>
              </tr>
            </thead>
            <tbody>
              {sortedRuns.map((r, i) => {
                const isFlagged = flaggedRunIds.has(r.id);
                return (
                  <tr key={r.uuid} style={{ background: i % 2 === 1 ? 'var(--color-bg, #262636)' : undefined, opacity: isFlagged ? 0.5 : 1 }}>
                    {activeCols.map(c => {
                      if (c.key === 'driver_name') {
                        return (
                          <td key={c.key} style={S.td}>
                            {onDriverClick && r.driver_name
                              ? <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}
                                  onClick={() => onDriverClick(r.driver_name!, r.class_index || undefined)}>{r.driver_name}</button>
                              : (r.driver_name || '—')}
                          </td>
                        );
                      }
                      if (c.key === 'class_index') return <td key={c.key} style={S.td}>{r.class_index || '—'}</td>;
                      if (c.key === 'round') return <td key={c.key} style={S.td}>{r.round || '—'}</td>;
                      if (c.key === 'lane') return <td key={c.key} style={S.td}>{r.lane || '—'}</td>;
                      const val = c.format ? c.format(r) : '';
                      return (
                        <td key={c.key} style={{ ...S.td, textAlign: 'right', fontWeight: c.bold ? 600 : undefined }}>
                          {val || '—'}
                        </td>
                      );
                    })}
                    <td style={S.td}>
                      {isFlagged ? (
                        <button style={{ ...S.btn('secondary'), fontSize: '0.6rem', padding: '0.1rem 0.3rem', color: '#dc2626' }}
                          onClick={() => doUnflag(r.id)} title="Click to unflag this run">🚩 Unflag</button>
                      ) : flaggingId === r.id ? (
                        <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <input style={{ ...S.input, width: 60, fontSize: '0.65rem', padding: '0.1rem' }}
                            placeholder="reason" value={flagReason}
                            onChange={e => setFlagReason(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && doFlag(r.id)} />
                          <button style={{ ...S.btn('danger'), fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}
                            onClick={() => doFlag(r.id)}>✓</button>
                          <button style={{ ...S.btn('secondary'), fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}
                            onClick={() => setFlaggingId(null)}>✗</button>
                        </span>
                      ) : (
                        <button style={{ ...S.btn('secondary'), fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}
                          onClick={() => setFlaggingId(r.id)}>Flag</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Incrementals View ── */}
      {sortedRuns.length > 0 && showIncrementals && (
        <IncrementalDrilldown runs={sortedRuns} flaggedRunIds={flaggedRunIds} classFilter={classFilter} total={total} onDriverClick={onDriverClick} />
      )}
    </div>
  );
}

// ── Incremental Drill-down ──────────────────────────────────────────────

interface IncrementalSplit {
  label: string;
  value: number | null;
}

function computeIncrementals(r: ParityRun): IncrementalSplit[] {
  const s = (a: number | null, b: number | null): number | null =>
    a != null && b != null && a > b ? Math.round((a - b) * 10000) / 10000 : null;
  return [
    { label: '0-60', value: r.ft60 },
    { label: '60-330', value: s(r.ft330, r.ft60) },
    { label: '330-660', value: s(r.ft660, r.ft330) },
    { label: '660-1000', value: s(r.ft1000, r.ft660) },
    { label: '1000-1320', value: s(r.ft1320, r.ft1000) },
  ];
}

// Color scale: green (fast) → yellow → red (slow) relative to column min/max
function heatColor(value: number | null, min: number, max: number): string {
  if (value == null || min === max) return 'transparent';
  const t = (value - min) / (max - min); // 0 = fastest, 1 = slowest
  // green → yellow → red
  if (t <= 0.5) {
    const g = Math.round(180 + (255 - 180) * (t * 2));
    const r = Math.round(60 + (220 - 60) * (t * 2));
    return `rgba(${r}, ${g}, 60, 0.25)`;
  }
  const r = Math.round(220 + (220 - 220) * ((t - 0.5) * 2));
  const g = Math.round(255 - (255 - 80) * ((t - 0.5) * 2));
  return `rgba(${r}, ${g}, 60, 0.25)`;
}

function IncrementalDrilldown({ runs, flaggedRunIds, classFilter, total, onDriverClick }: {
  runs: (ParityRun | RunWithWeather)[];
  flaggedRunIds: Set<number>;
  classFilter: string;
  total: number;
  onDriverClick?: (driver: string, classIndex?: string) => void;
}) {
  // Only show runs with valid ft1320
  const validRuns = runs.filter(r => r.ft1320 != null && r.ft1320 > 0);
  const allIncs = validRuns.map(r => computeIncrementals(r));

  // Compute min/max per column for heat mapping
  const colStats = [0, 1, 2, 3, 4].map(col => {
    const vals = allIncs.map(inc => inc[col].value).filter((v): v is number => v != null);
    return { min: vals.length ? Math.min(...vals) : 0, max: vals.length ? Math.max(...vals) : 0 };
  });

  const stickyTh: React.CSSProperties = {
    ...S.th, position: 'sticky', top: 0, zIndex: 1,
    background: 'var(--color-surface, #1e1e2e)',
  };

  return (
    <>
      <div style={{ marginBottom: '0.25rem', color: 'var(--color-muted)', fontSize: '0.75rem' }}>
        {validRuns.length} of {total} runs with splits{classFilter ? ` (class: ${classFilter})` : ''}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
        Incremental times (seconds between timing marks). Color: <span style={{ color: '#16a34a' }}>green</span> = fastest in column, <span style={{ color: '#dc2626' }}>red</span> = slowest.
      </div>
      <div style={{ overflow: 'auto', maxHeight: 500 }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={stickyTh}>Driver</th>
              <th style={stickyTh}>Rnd</th>
              <th style={stickyTh}>ET</th>
              <th style={{ ...stickyTh, borderLeft: '2px solid var(--color-border)' }}>0-60ft</th>
              <th style={stickyTh}>60-330ft</th>
              <th style={stickyTh}>330-660ft</th>
              <th style={stickyTh}>660-1000ft</th>
              <th style={stickyTh}>1000-1320ft</th>
            </tr>
          </thead>
          <tbody>
            {validRuns.map((r, i) => {
              const incs = allIncs[i];
              const isFlagged = flaggedRunIds.has(r.id);
              return (
                <tr key={r.uuid} style={{
                  background: i % 2 === 1 ? 'var(--color-bg, #262636)' : undefined,
                  opacity: isFlagged ? 0.5 : 1,
                }}>
                  <td style={S.td}>{onDriverClick && r.driver_name ? <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }} onClick={() => onDriverClick(r.driver_name!, r.class_index || undefined)}>{r.driver_name}</button> : (r.driver_name || '—')}</td>
                  <td style={S.td}>{r.round || '—'}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{formatET(r.ft1320)}</td>
                  {incs.map((inc, col) => (
                    <td key={col} style={{
                      ...S.td,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      background: heatColor(inc.value, colStats[col].min, colStats[col].max),
                      borderLeft: col === 0 ? '2px solid var(--color-border)' : undefined,
                    }}>
                      {inc.value != null ? inc.value.toFixed(4) : '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Driver Drilldown Panel ──────────────────────────────────────────────

type DriverSortKey = 'race_lookup' | 'ft1320' | 'mph1320' | 'rt' | 'ft60' | 'round' | 'event_name'
  | 'inc_0_60' | 'inc_60_330' | 'inc_330_660' | 'inc_660_1000' | 'inc_1000_1320';
type DriverSortDir = 'asc' | 'desc';
type SessionFilter = '' | 'qual' | 'elim';
type ViewMode = 'standard' | 'incrementals' | 'weather';
type ValueMode = 'raw' | 'corrected';

function DriverDrilldownPanel({ initialFilter }: { initialFilter?: { driver?: string; classIndex?: string } | null }) {
  const [search, setSearch] = useState(initialFilter?.driver ?? '');
  const [driverList, setDriverList] = useState<DriverEntry[]>([]);
  const [selectedDriver, setSelectedDriver] = useState(initialFilter?.driver ?? '');
  const [classFilter, setClassFilter] = useState(initialFilter?.classIndex ?? '');
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('');
  const [runs, setRuns] = useState<DriverRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [driverLoading, setDriverLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<DriverSortKey>('race_lookup');
  const [sortDir, setSortDir] = useState<DriverSortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [valueMode, setValueMode] = useState<ValueMode>('raw');
  const [showCharts, setShowCharts] = useState(false);

  // Auto-load when navigated from another panel
  const loadedRef = useRef(false);
  useEffect(() => {
    if (initialFilter?.driver && !loadedRef.current) {
      loadedRef.current = true;
      setSearch(initialFilter.driver);
      setSelectedDriver(initialFilter.driver);
      setClassFilter(initialFilter.classIndex ?? '');
    }
  }, [initialFilter?.driver, initialFilter?.classIndex]);

  // Debounced driver search
  useEffect(() => {
    if (search.length < 2) { setDriverList([]); return; }
    const timer = setTimeout(async () => {
      setDriverLoading(true);
      try {
        const res = await parityApi.drivers({ search, classIndex: classFilter || undefined, limit: 20 });
        setDriverList(res.drivers);
      } catch { /* ignore */ }
      setDriverLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, classFilter]);

  const loadRuns = useCallback(async (driver: string) => {
    if (!driver) return;
    setLoading(true); setError('');
    try {
      const res = await parityApi.runsByDriver({
        driverName: driver,
        classIndex: classFilter || undefined,
        session: sessionFilter || undefined,
        includeWeather: true,
        limit: 500,
      });
      setRuns(res.runs);
      setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [classFilter, sessionFilter]);

  // Reload when driver is set (including initial) or filters change
  useEffect(() => {
    if (selectedDriver) loadRuns(selectedDriver);
  }, [selectedDriver, loadRuns]);

  const selectDriver = useCallback((driver: string) => {
    setSelectedDriver(driver);
    setSearch(driver);
    setDriverList([]);
  }, []);

  const handleSort = (key: DriverSortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'race_lookup' ? 'desc' : 'asc'); }
  };

  // Get displayed ET/MPH value based on valueMode
  const getET = (r: DriverRun) => valueMode === 'corrected' && r.corrected_ft1320 != null ? r.corrected_ft1320 : r.ft1320;
  const get60 = (r: DriverRun) => valueMode === 'corrected' && r.corrected_ft60 != null ? r.corrected_ft60 : r.ft60;
  const getMPH = (r: DriverRun) => r.mph1320;

  const sortedRuns = [...runs].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? (Number(av) - Number(bv)) : (Number(bv) - Number(av));
  });

  const arrow = (k: DriverSortKey) => sortKey === k ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const stickyTh: React.CSSProperties = {
    ...S.th, position: 'sticky', top: 0, zIndex: 1,
    background: 'var(--color-surface, #1e1e2e)', cursor: 'pointer',
  };

  // Best ET / MPH for the driver
  const validRuns = runs.filter(r => r.ft1320 != null && r.ft1320 > 0 && !r.dq_flag);
  const bestEt = validRuns.length > 0 ? Math.min(...validRuns.map(r => getET(r)!).filter(v => v > 0)) : null;
  const bestMph = validRuns.length > 0 ? Math.max(...validRuns.map(r => getMPH(r)!).filter(v => v > 0)) : null;
  const eventCount = new Set(runs.map(r => r.race_lookup)).size;
  const weatherCount = runs.filter(r => r.weather).length;

  // Chart data: runs sorted chronologically with valid ET
  const chartRuns = useMemo(() => {
    return [...runs]
      .filter(r => r.run_timestamp_utc && r.ft1320 != null && r.ft1320 > 0 && !r.dq_flag)
      .sort((a, b) => (a.run_timestamp_utc ?? '').localeCompare(b.run_timestamp_utc ?? ''));
  }, [runs]);

  // Simple SVG chart renderer
  const renderChart = (data: { x: number; y: number; label: string }[], yLabel: string, color: string, inverted = false) => {
    if (data.length < 2) return <div style={{ ...S.hint, fontSize: '0.7rem' }}>Not enough data points for chart.</div>;
    const W = 600, H = 180, PAD = { t: 10, r: 15, b: 30, l: 55 };
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const yVals = data.map(d => d.y);
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    const yRange = yMax - yMin || 1;
    const xMin = data[0].x;
    const xMax = data[data.length - 1].x;
    const xRange = xMax - xMin || 1;
    const scaleX = (v: number) => PAD.l + ((v - xMin) / xRange) * innerW;
    const scaleY = (v: number) => inverted
      ? PAD.t + ((v - yMin) / yRange) * innerH
      : PAD.t + innerH - ((v - yMin) / yRange) * innerH;
    const pts = data.map(d => `${scaleX(d.x).toFixed(1)},${scaleY(d.y).toFixed(1)}`).join(' ');

    // Y-axis tick labels
    const yTicks = 5;
    const yTickVals = Array.from({ length: yTicks }, (_, i) => yMin + (yRange * i) / (yTicks - 1));

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: H, display: 'block' }}>
        {/* Grid lines */}
        {yTickVals.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={scaleY(v)} x2={W - PAD.r} y2={scaleY(v)} stroke="var(--color-border, #333)" strokeDasharray="3,3" />
            <text x={PAD.l - 5} y={scaleY(v) + 3} textAnchor="end" fill="var(--color-muted, #888)" fontSize="9">{v.toFixed(inverted ? 1 : 3)}</text>
          </g>
        ))}
        {/* Data line */}
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
        {/* Data dots */}
        {data.map((d, i) => (
          <circle key={i} cx={scaleX(d.x)} cy={scaleY(d.y)} r="2.5" fill={color}>
            <title>{d.label}: {d.y.toFixed(3)}</title>
          </circle>
        ))}
        {/* Y label */}
        <text x={12} y={H / 2} textAnchor="middle" fill="var(--color-muted, #888)" fontSize="9" transform={`rotate(-90, 12, ${H / 2})`}>{yLabel}</text>
      </svg>
    );
  };

  const etChartData = useMemo(() => chartRuns.map((r, i) => ({
    x: i,
    y: valueMode === 'corrected' && r.corrected_ft1320 != null ? r.corrected_ft1320 : r.ft1320!,
    label: `${r.event_name || r.race_lookup} ${r.round || ''}`.trim(),
  })), [chartRuns, valueMode]);

  const mphChartData = useMemo(() => chartRuns.filter(r => r.mph1320 != null && r.mph1320 > 0).map((r, i) => ({
    x: i,
    y: r.mph1320!,
    label: `${r.event_name || r.race_lookup} ${r.round || ''}`.trim(),
  })), [chartRuns]);

  // CSV export
  const exportCsv = useCallback(() => {
    if (!runs.length) return;
    const hdr = ['Event', 'Date', 'Round', 'Lane', 'RT', '60ft', '330', '660', 'MPH@660', '1000', 'MPH@1000', 'ET', 'MPH',
      'Corr ET', 'Factor', 'Temp F', 'Press inHg', 'RH%', 'Win', 'DQ'];
    const rows = sortedRuns.map(r => [
      r.event_name || '', r.race_lookup || '', r.round || '', r.lane || '',
      formatET(r.rt) !== '—' ? formatET(r.rt) : '', formatET(r.ft60) !== '—' ? formatET(r.ft60) : '', formatET(r.ft330) !== '—' ? formatET(r.ft330) : '', formatET(r.ft660) !== '—' ? formatET(r.ft660) : '',
      r.mph660 != null ? formatMPH(r.mph660) : '', formatET(r.ft1000) !== '—' ? formatET(r.ft1000) : '', r.mph1000 != null ? formatMPH(r.mph1000) : '',
      formatET(r.ft1320) !== '—' ? formatET(r.ft1320) : '', r.mph1320 != null ? formatMPH(r.mph1320) : '',
      formatET(r.corrected_ft1320) !== '—' ? formatET(r.corrected_ft1320) : '', r.correction_factor?.toFixed(4) ?? '',
      r.weather?.temp_f != null ? formatTemp(r.weather.temp_f) : '', r.weather?.pressure_inhg != null ? formatBaro(r.weather.pressure_inhg) : '', r.weather?.rh_pct != null ? formatRH(r.weather.rh_pct) : '',
      r.win_flag ? 'Y' : '', r.dq_flag ? 'Y' : '',
    ]);
    const csv = [hdr, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `driver-history-${selectedDriver.replace(/\s+/g, '_')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [runs, sortedRuns, selectedDriver]);

  return (
    <div>
      {/* Search / filter row */}
      <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
        <div style={{ position: 'relative' }}>
          <input style={{ ...S.input, width: 240 }} placeholder="Search driver name..."
            value={search} onChange={e => { setSearch(e.target.value); setSelectedDriver(''); }} />
          {driverLoading && <span style={{ position: 'absolute', right: 8, top: 8, fontSize: '0.7rem' }}>...</span>}
          {driverList.length > 0 && !selectedDriver && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '0 0 4px 4px', maxHeight: 200, overflow: 'auto',
            }}>
              {driverList.map(d => (
                <div key={d.driver} style={{
                  padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem',
                  borderBottom: '1px solid var(--color-border)',
                }} onClick={() => selectDriver(d.driver)}>
                  <b>{d.driver}</b>
                  <span style={{ color: 'var(--color-muted)', marginLeft: 8, fontSize: '0.7rem' }}>
                    {d.run_count} runs · {d.event_count} events · {formatET(d.best_et)} ET
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <b style={{ fontSize: '0.8rem', marginLeft: 8 }}>Class:</b>
        {['', 'TF', 'FC', 'PS', 'PSM', 'TD', 'TS'].map(c => (
          <button key={c || 'all'} style={{ ...S.btn(classFilter === c ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
            onClick={() => setClassFilter(c)}>
            {c || 'All'}
          </button>
        ))}

        <span style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 0.25rem' }} />

        <b style={{ fontSize: '0.8rem' }}>Session:</b>
        {([['', 'All'], ['qual', 'Qual'], ['elim', 'Elim']] as [SessionFilter, string][]).map(([v, lbl]) => (
          <button key={v || 'all-sess'} style={{ ...S.btn(sessionFilter === v ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
            onClick={() => setSessionFilter(v)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* View mode row */}
      {runs.length > 0 && (
        <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
          {(['standard', 'incrementals', 'weather'] as ViewMode[]).map(m => (
            <button key={m} style={{ ...S.btn(viewMode === m ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
              onClick={() => setViewMode(m)}>
              {m === 'standard' ? 'Standard' : m === 'incrementals' ? 'Incrementals' : 'Weather'}
            </button>
          ))}

          <span style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 0.25rem' }} />

          <b style={{ fontSize: '0.8rem' }}>Values:</b>
          {(['raw', 'corrected'] as ValueMode[]).map(m => (
            <button key={m} style={{ ...S.btn(valueMode === m ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
              onClick={() => setValueMode(m)}>
              {m === 'raw' ? 'Raw' : 'Corrected'}
            </button>
          ))}

          <span style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 0.25rem' }} />

          <button style={{ ...S.btn(showCharts ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
            onClick={() => setShowCharts(v => !v)}>
            {showCharts ? 'Hide Charts' : 'Charts'}
          </button>

          <button style={{ ...S.btn('secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem', marginLeft: 'auto' }}
            onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      )}

      {loading && <div style={S.hint}>Loading runs...</div>}
      {error && <div style={S.error}>{error}</div>}

      {/* Driver stats header */}
      {selectedDriver && runs.length > 0 && !loading && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <div style={S.stat}><b>{selectedDriver}</b></div>
          <div style={S.stat}>{total} runs</div>
          <div style={S.stat}>{eventCount} events</div>
          {bestEt != null && <div style={S.stat}>Best ET{valueMode === 'corrected' ? ' (corr)' : ''}: <b style={{ color: '#16a34a' }}>{formatET(bestEt)}</b></div>}
          {bestMph != null && <div style={S.stat}>Top MPH: <b style={{ color: '#2563eb' }}>{formatMPH(bestMph)}</b></div>}
          {weatherCount > 0 && <div style={S.stat}><span style={{ color: 'var(--color-muted)' }}>{weatherCount}/{runs.length} weather-linked</span></div>}
        </div>
      )}

      {/* Charts */}
      {showCharts && selectedDriver && chartRuns.length > 0 && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ ...S.card, padding: '0.5rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.25rem' }}>ET vs Run Order{valueMode === 'corrected' ? ' (Corrected)' : ''}</div>
            {renderChart(etChartData, 'ET (sec)', '#16a34a', true)}
          </div>
          <div style={{ ...S.card, padding: '0.5rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.25rem' }}>MPH vs Run Order</div>
            {renderChart(mphChartData, 'MPH', '#2563eb', false)}
          </div>
        </div>
      )}

      {/* Runs table */}
      {selectedDriver && runs.length > 0 && !loading && (
        <div style={{ overflow: 'auto', maxHeight: 500 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={stickyTh} onClick={() => handleSort('event_name')}>Event{arrow('event_name')}</th>
                <th style={stickyTh} onClick={() => handleSort('race_lookup')}>Date{arrow('race_lookup')}</th>
                <th style={stickyTh} onClick={() => handleSort('round')}>Rnd{arrow('round')}</th>
                <th style={stickyTh} onClick={() => handleSort('rt')}>RT{arrow('rt')}</th>
                {viewMode === 'standard' && (
                  <>
                    <th style={stickyTh} onClick={() => handleSort('ft60')}>60ft{arrow('ft60')}</th>
                    <th style={stickyTh} onClick={() => handleSort('ft1320')}>ET{arrow('ft1320')}</th>
                    <th style={stickyTh} onClick={() => handleSort('mph1320')}>MPH{arrow('mph1320')}</th>
                  </>
                )}
                {viewMode === 'incrementals' && (
                  <>
                    <th style={stickyTh} onClick={() => handleSort('ft1320')}>ET{arrow('ft1320')}</th>
                    <th style={{ ...stickyTh, borderLeft: '2px solid var(--color-border)' }} onClick={() => handleSort('inc_0_60')}>0-60{arrow('inc_0_60')}</th>
                    <th style={stickyTh} onClick={() => handleSort('inc_60_330')}>60-330{arrow('inc_60_330')}</th>
                    <th style={stickyTh} onClick={() => handleSort('inc_330_660')}>330-660{arrow('inc_330_660')}</th>
                    <th style={stickyTh} onClick={() => handleSort('inc_660_1000')}>660-1000{arrow('inc_660_1000')}</th>
                    <th style={stickyTh} onClick={() => handleSort('inc_1000_1320')}>1000-1320{arrow('inc_1000_1320')}</th>
                  </>
                )}
                {viewMode === 'weather' && (
                  <>
                    <th style={stickyTh} onClick={() => handleSort('ft1320')}>ET{arrow('ft1320')}</th>
                    <th style={stickyTh}>Corr ET</th>
                    <th style={stickyTh}>Factor</th>
                    <th style={stickyTh}>Temp</th>
                    <th style={stickyTh}>Pres</th>
                    <th style={stickyTh}>RH%</th>
                  </>
                )}
                <th style={{ ...S.th, position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface, #1e1e2e)' }}>W</th>
                <th style={{ ...S.th, position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface, #1e1e2e)' }}>DQ</th>
              </tr>
            </thead>
            <tbody>
              {sortedRuns.map((r, i) => {
                const dqStyle = r.dq_flag ? { opacity: 0.5, background: 'rgba(239,68,68,0.06)' } : {};
                return (
                  <tr key={r.id} style={{ background: i % 2 === 1 ? 'var(--color-bg, #262636)' : undefined, ...dqStyle }}>
                    <td style={{ ...S.td, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.event_name || r.race_lookup}</td>
                    <td style={S.td}>{r.race_lookup ? `${r.race_lookup.slice(0,4)}-${r.race_lookup.slice(4,6)}-${r.race_lookup.slice(6)}` : '—'}</td>
                    <td style={S.td}>{r.round || '—'}</td>
                    <td style={S.td}>{formatET(r.rt)}</td>
                    {viewMode === 'standard' && (
                      <>
                        <td style={S.td}>{formatET(get60(r))}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{formatET(getET(r))}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{formatMPH(getMPH(r))}</td>
                      </>
                    )}
                    {viewMode === 'incrementals' && (
                      <>
                        <td style={{ ...S.td, fontWeight: 600 }}>{formatET(getET(r))}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace', borderLeft: '2px solid var(--color-border)' }}>{r.inc_0_60?.toFixed(4) ?? '—'}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace' }}>{r.inc_60_330?.toFixed(4) ?? '—'}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace' }}>{r.inc_330_660?.toFixed(4) ?? '—'}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace' }}>{r.inc_660_1000?.toFixed(4) ?? '—'}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace' }}>{r.inc_1000_1320?.toFixed(4) ?? '—'}</td>
                      </>
                    )}
                    {viewMode === 'weather' && (
                      <>
                        <td style={{ ...S.td, fontWeight: 600 }}>{formatET(r.ft1320)}</td>
                        <td style={{ ...S.td, color: '#2563eb', fontWeight: 600 }}>{formatET(r.corrected_ft1320)}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.7rem' }}>{r.correction_factor?.toFixed(4) ?? '—'}</td>
                        <td style={{ ...S.td, fontSize: '0.7rem' }}>{r.weather?.temp_f != null ? formatTemp(r.weather.temp_f) : '—'}</td>
                        <td style={{ ...S.td, fontSize: '0.7rem' }}>{r.weather?.pressure_inhg != null ? formatBaro(r.weather.pressure_inhg) : '—'}</td>
                        <td style={{ ...S.td, fontSize: '0.7rem' }}>{r.weather?.rh_pct != null ? formatRH(r.weather.rh_pct) : '—'}</td>
                      </>
                    )}
                    <td style={S.td}>{r.win_flag ? '✓' : ''}</td>
                    <td style={S.td}>{r.dq_flag ? '✗' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedDriver && !loading && runs.length === 0 && (
        <div style={S.hint}>No runs found for {selectedDriver}{classFilter ? ` in class ${classFilter}` : ''}{sessionFilter ? ` (${sessionFilter})` : ''}.</div>
      )}

      {!selectedDriver && !loading && (
        <div style={S.hint}>Search for a driver above to view their run history.</div>
      )}
    </div>
  );
}

// ── Class Aliases Panel ─────────────────────────────────────────────────

function ClassAliasesPanel() {
  const [aliases, setAliases] = useState<ClassAlias[]>([]);
  const [knownClasses, setKnownClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newCanonical, setNewCanonical] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await parityApi.listClassAliases();
      setAliases(res.aliases);
      setKnownClasses(res.knownClasses);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newCanonical.trim() || !newAlias.trim()) return;
    setSaving(true);
    setError('');
    try {
      await parityApi.addClassAlias({ canonical: newCanonical.trim().toUpperCase(), alias: newAlias.trim().toUpperCase() });
      setNewCanonical('');
      setNewAlias('');
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this alias mapping?')) return;
    setError('');
    try {
      await parityApi.deleteClassAlias(id);
      await load();
    } catch (e: any) { setError(e.message); }
  };

  // Group aliases by canonical for display
  const grouped = aliases.reduce<Record<string, ClassAlias[]>>((acc, a) => {
    (acc[a.canonical] = acc[a.canonical] || []).push(a);
    return acc;
  }, {});

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>Class Aliases</h3>
      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1rem' }}>
        When you filter by a canonical class (e.g. "PS"), all aliased classes (e.g. "PRO") are automatically included in queries.
      </p>

      {error && <pre style={{ color: 'salmon', marginBottom: '0.5rem' }}>{error}</pre>}

      {/* Add form */}
      <div className="parity-form-row" style={{ marginBottom: '1rem' }}>
        <div className="parity-form-field">
          <label>Canonical</label>
          <input
            value={newCanonical}
            onChange={e => setNewCanonical(e.target.value.toUpperCase())}
            placeholder="e.g. PS"
            list="known-classes-canonical"
            style={{ fontFamily: 'monospace', width: 100 }}
          />
          <datalist id="known-classes-canonical">
            {knownClasses.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div className="parity-form-field">
          <label>Alias</label>
          <input
            value={newAlias}
            onChange={e => setNewAlias(e.target.value.toUpperCase())}
            placeholder="e.g. PRO"
            list="known-classes-alias"
            style={{ fontFamily: 'monospace', width: 100 }}
          />
          <datalist id="known-classes-alias">
            {knownClasses.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <button style={{ ...S.btn('primary'), alignSelf: 'flex-end' }} onClick={handleAdd} disabled={saving || !newCanonical.trim() || !newAlias.trim()}>
          {saving ? 'Adding...' : 'Add Alias'}
        </button>
      </div>

      {loading ? <p>Loading...</p> : (
        Object.keys(grouped).length === 0 ? (
          <p style={{ color: '#888' }}>No class aliases defined yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Canonical</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Alias</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Created</th>
                <th style={{ padding: '0.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {aliases.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{a.canonical}</td>
                  <td style={{ padding: '0.4rem 0.5rem' }}>{a.alias}</td>
                  <td style={{ padding: '0.4rem 0.5rem', color: '#888' }}>{a.created_at?.slice(0, 10)}</td>
                  <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(a.id)}
                      style={{ color: 'salmon', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.8rem' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {knownClasses.length > 0 && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', color: '#888', fontSize: '0.8rem' }}>
            Known class_index values in runs ({knownClasses.length})
          </summary>
          <div style={{ padding: '0.5rem', fontSize: '0.8rem', fontFamily: 'monospace', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
            {knownClasses.map(c => <span key={c} style={{ background: 'var(--color-bg-alt, #333)', padding: '0.1rem 0.4rem', borderRadius: 3 }}>{c}</span>)}
          </div>
        </details>
      )}
    </div>
  );
}

// ── Engine Combos Panel ─────────────────────────────────────────────────

function EngineCombosPanel() {
  const [combos, setCombos] = useState<EngineComboRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editRow, setEditRow] = useState<Partial<EngineComboRow> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await parityApi.listEngineCombos(); setCombos(r.combos); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!editRow?.name) return;
    setSaving(true); setError('');
    try {
      await parityApi.upsertEngineCombo({
        id: editRow.id,
        name: editRow.name,
        tPower: editRow.t_power ?? 0,
        dPower: editRow.d_power ?? 0,
        FF: editRow.friction_factor ?? 0,
      });
      setEditRow(null);
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this engine combo?')) return;
    setError('');
    try { await parityApi.deleteEngineCombo(id); await load(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>Combo Definitions</h3>
      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1rem' }}>
        Each combo definition specifies tPower, dPower, and FF (friction factor) used in HPC calculation.
      </p>
      {error && <pre style={{ color: 'salmon', marginBottom: '0.5rem' }}>{error}</pre>}

      <button style={S.btn('primary')} onClick={() => setEditRow({ name: '', t_power: 0, d_power: 0, friction_factor: 0 })}>+ Add Engine Combo</button>

      {editRow && (
        <div style={{ border: '1px solid var(--color-border)', padding: '0.75rem', borderRadius: 4, marginBottom: '1rem', marginTop: '0.5rem', background: 'var(--color-bg-alt, #2a2a3a)' }}>
          <div className="parity-form-row">
            <div className="parity-form-field">
              <label>Name</label>
              <input value={editRow.name ?? ''} onChange={e => setEditRow({ ...editRow, name: e.target.value })}
                style={{ fontFamily: 'monospace', width: 180 }} />
            </div>
            <div className="parity-form-field">
              <label>tPower</label>
              <input type="number" step="0.01" value={editRow.t_power ?? 0} onChange={e => setEditRow({ ...editRow, t_power: parseFloat(e.target.value) || 0 })}
                style={{ fontFamily: 'monospace', width: 80 }} />
            </div>
            <div className="parity-form-field">
              <label>dPower</label>
              <input type="number" step="0.01" value={editRow.d_power ?? 0} onChange={e => setEditRow({ ...editRow, d_power: parseFloat(e.target.value) || 0 })}
                style={{ fontFamily: 'monospace', width: 80 }} />
            </div>
            <div className="parity-form-field">
              <label>FF</label>
              <input type="number" step="0.1" value={editRow.friction_factor ?? 0} onChange={e => setEditRow({ ...editRow, friction_factor: parseFloat(e.target.value) || 0 })}
                style={{ fontFamily: 'monospace', width: 80 }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
              <button style={S.btn('primary')} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editRow.id ? 'Update' : 'Create'}
              </button>
              <button style={S.btn('secondary')} onClick={() => setEditRow(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : combos.length === 0 ? (
        <p style={{ color: '#888' }}>No engine combos defined yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>tPower</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>dPower</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>FF</th>
              <th style={{ padding: '0.5rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {combos.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>{c.t_power}</td>
                <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>{c.d_power}</td>
                <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>{c.friction_factor}</td>
                <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>
                  <button onClick={() => setEditRow(c)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', marginRight: 8 }}>Edit</button>
                  <button onClick={() => handleDelete(c.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'salmon', fontSize: '0.8rem' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Driver Combos Panel ─────────────────────────────────────────────────

function DriverCombosPanel() {
  const [combos, setCombos] = useState<DriverComboRow[]>([]);
  const [engineCombos, setEngineCombos] = useState<EngineComboRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [editRow, setEditRow] = useState<{
    id?: number; driverName: string; classIndex: string; engineComboId: number; effectiveFromUtc: string; effectiveToUtc: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [dc, ec] = await Promise.all([
        parityApi.listDriverCombos({ driverName: filterDriver || undefined, classIndex: filterClass || undefined }),
        parityApi.listEngineCombos(),
      ]);
      setCombos(dc.combos);
      setEngineCombos(ec.combos);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [filterDriver, filterClass]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!editRow?.driverName || !editRow?.classIndex || !editRow?.engineComboId) return;
    setSaving(true); setError('');
    try {
      await parityApi.upsertDriverCombo({
        id: editRow.id,
        driverName: editRow.driverName,
        classIndex: editRow.classIndex,
        engineComboId: editRow.engineComboId,
        effectiveFromUtc: editRow.effectiveFromUtc,
        effectiveToUtc: editRow.effectiveToUtc || null,
      });
      setEditRow(null);
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this driver combo?')) return;
    setError('');
    try { await parityApi.deleteDriverCombo(id); await load(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>Driver Assignments (raw)</h3>
      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1rem' }}>
        Raw assignment records: maps a driver + class to a combo definition for a time range. For bulk editing, use the Assign Combos tab.
      </p>
      {error && <pre style={{ color: 'salmon', marginBottom: '0.5rem' }}>{error}</pre>}

      <div className="parity-form-row" style={{ marginBottom: '0.75rem' }}>
        <input placeholder="Filter driver" value={filterDriver} onChange={e => setFilterDriver(e.target.value)}
          style={{ ...S.input, fontFamily: 'monospace', width: 160 }} />
        <input placeholder="Filter class" value={filterClass} onChange={e => setFilterClass(e.target.value)}
          style={{ ...S.input, fontFamily: 'monospace', width: 80 }} />
        <button style={S.btn('secondary')} onClick={load}>Filter</button>
        <button style={S.btn('primary')}
          onClick={() => setEditRow({ driverName: '', classIndex: '', engineComboId: engineCombos[0]?.id ?? 0, effectiveFromUtc: '2024-01-01T00:00:00Z', effectiveToUtc: '' })}>
          + Add Driver Combo
        </button>
      </div>

      {editRow && (
        <div style={{ border: '1px solid var(--color-border)', padding: '0.75rem', borderRadius: 4, marginBottom: '1rem', background: 'var(--color-bg-alt, #2a2a3a)' }}>
          <div className="parity-form-row">
            <div className="parity-form-field">
              <label>Driver</label>
              <input value={editRow.driverName} onChange={e => setEditRow({ ...editRow, driverName: e.target.value.toUpperCase() })}
                style={{ fontFamily: 'monospace', width: 180 }} />
            </div>
            <div className="parity-form-field">
              <label>Class</label>
              <input value={editRow.classIndex} onChange={e => setEditRow({ ...editRow, classIndex: e.target.value.toUpperCase() })}
                style={{ fontFamily: 'monospace', width: 60 }} />
            </div>
            <div className="parity-form-field">
              <label>Engine Combo</label>
              <select value={editRow.engineComboId} onChange={e => setEditRow({ ...editRow, engineComboId: Number(e.target.value) })}
                style={{ fontFamily: 'monospace' }}>
                {engineCombos.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
              </select>
            </div>
          </div>
          <div className="parity-form-row" style={{ marginTop: '0.5rem' }}>
            <div className="parity-form-field">
              <label>From (UTC)</label>
              <input value={editRow.effectiveFromUtc} onChange={e => setEditRow({ ...editRow, effectiveFromUtc: e.target.value })}
                style={{ fontFamily: 'monospace', width: 220 }} placeholder="2024-01-01T00:00:00Z" />
            </div>
            <div className="parity-form-field">
              <label>To (UTC, optional)</label>
              <input value={editRow.effectiveToUtc} onChange={e => setEditRow({ ...editRow, effectiveToUtc: e.target.value })}
                style={{ fontFamily: 'monospace', width: 220 }} placeholder="leave empty for open-ended" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
              <button style={S.btn('primary')} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editRow.id ? 'Update' : 'Create'}
              </button>
              <button style={S.btn('secondary')} onClick={() => setEditRow(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : combos.length === 0 ? (
        <p style={{ color: '#888' }}>No driver combos found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Driver</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Class</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Engine Combo</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Effective From</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Effective To</th>
              <th style={{ padding: '0.5rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {combos.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{c.driver_name}</td>
                <td style={{ padding: '0.4rem 0.5rem' }}>{c.class_index}</td>
                <td style={{ padding: '0.4rem 0.5rem' }}>{c.engine_combo_name}</td>
                <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>{c.effective_from_utc}</td>
                <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem', fontFamily: 'monospace', color: c.effective_to_utc ? undefined : '#888' }}>
                  {c.effective_to_utc || '(open)'}
                </td>
                <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>
                  <button onClick={() => setEditRow({
                    id: c.id, driverName: c.driver_name, classIndex: c.class_index,
                    engineComboId: c.engine_combo_id,
                    effectiveFromUtc: c.effective_from_utc, effectiveToUtc: c.effective_to_utc || '',
                  })} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', marginRight: 8 }}>Edit</button>
                  <button onClick={() => handleDelete(c.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'salmon', fontSize: '0.8rem' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Assign Combos Panel ─────────────────────────────────────────────────

type ResolvedFrom = 'override' | 'classDefault' | 'none';

interface DriverRow {
  driver_name: string;
  class_index: string;
  run_count: number;
  first_run_utc: string | null;
  last_run_utc: string | null;
  best_et: number | null;
  best_mph: number | null;
  currentCombo: DriverComboRow | null;
  resolvedFrom: ResolvedFrom;
  selectedComboId: number | null;
  checked: boolean;
}

function AssignCombosPanel({ events, selectedEvent, onGoToRunsWeather }: {
  events: EventWithStats[];
  selectedEvent: EventWithStats | null;
  onGoToRunsWeather: () => void;
}) {
  const { can: canCap } = useCapabilities();
  const isAdmin = canCap('nhra.parity.admin' as any);

  const [eventId, setEventId] = useState<number | null>(selectedEvent?.id ?? null);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [eventClasses, setEventClasses] = useState<string[]>([]);
  const [engineCombos, setEngineCombos] = useState<EngineComboRow[]>([]);
  const [, setAllDriverCombos] = useState<DriverComboRow[]>([]);
  const [classDefaults, setClassDefaults] = useState<ClassDefaultRow[]>([]);
  const [eventDates, setEventDates] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [weatherSampleCount, setWeatherSampleCount] = useState(0);

  // Bulk action state
  const [bulkComboId, setBulkComboId] = useState<number>(0);
  const [bulkUnassignedOnly, setBulkUnassignedOnly] = useState(true);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const allChecked = drivers.length > 0 && drivers.every(d => d.checked);
  const someChecked = drivers.some(d => d.checked);

  // Class default edit
  const [editingDefault, setEditingDefault] = useState(false);
  const [defaultComboId, setDefaultComboId] = useState<number>(0);

  // Change at event start
  const [changeAtStartIdx, setChangeAtStartIdx] = useState<number | null>(null);
  const [changeAtStartComboId, setChangeAtStartComboId] = useState<number>(0);

  // Sync with parent selectedEvent
  useEffect(() => {
    if (selectedEvent) setEventId(selectedEvent.id);
  }, [selectedEvent]);

  // Load engine combos + class defaults on mount
  useEffect(() => {
    (async () => {
      const [ecRes, cdRes] = await Promise.all([
        parityApi.listEngineCombos(),
        parityApi.listClassDefaults(),
      ]);
      setEngineCombos(ecRes.combos);
      setClassDefaults(cdRes.classDefaults);
    })();
  }, []);

  const loadDrivers = useCallback(async () => {
    if (!eventId) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const [drRes, dcRes] = await Promise.all([
        parityApi.driversAtEvent({ eventId, classIndex: classFilter || undefined }),
        parityApi.listDriverCombos(),
      ]);
      setAllDriverCombos(dcRes.combos);
      setEventClasses(drRes.eventClasses || []);
      setEventDates({ start: drRes.startDate ?? null, end: drRes.endDate ?? null });
      setWeatherSampleCount(drRes.weatherSampleCount ?? 0);

      // Build driver rows with current combo resolution + resolvedFrom
      const rows: DriverRow[] = drRes.drivers.map(d => {
        const candidates = dcRes.combos.filter(c =>
          c.driver_name.toUpperCase() === d.driver_name.toUpperCase() &&
          c.class_index.toUpperCase() === d.class_index.toUpperCase()
        );
        const refTs = d.first_run_utc || '';
        const matched = candidates.find(c => {
          if (refTs < c.effective_from_utc) return false;
          if (c.effective_to_utc && refTs >= c.effective_to_utc) return false;
          return true;
        }) ?? null;

        let resolvedFrom: ResolvedFrom = 'none';
        if (matched) {
          resolvedFrom = 'override';
        } else {
          // Check class default fallback
          const cd = classDefaults.find(c =>
            c.class_index.toUpperCase() === d.class_index.toUpperCase()
          );
          if (cd) resolvedFrom = 'classDefault';
        }

        return {
          ...d,
          currentCombo: matched,
          resolvedFrom,
          selectedComboId: matched?.engine_combo_id ?? null,
          checked: false,
        };
      });
      setDrivers(rows);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [eventId, classFilter, classDefaults]);

  useEffect(() => { if (eventId) loadDrivers(); }, [eventId, classFilter, loadDrivers]);

  const toggleCheck = (idx: number) => {
    setDrivers(prev => prev.map((d, i) => i === idx ? { ...d, checked: !d.checked } : d));
  };

  const toggleAll = () => {
    const val = !allChecked;
    setDrivers(prev => prev.map(d => ({ ...d, checked: val })));
  };

  const setComboForRow = (idx: number, comboId: number) => {
    setDrivers(prev => prev.map((d, i) => i === idx ? { ...d, selectedComboId: comboId } : d));
  };

  // ── Bulk apply with preview + unassigned-only option ──
  const bulkTargets = useMemo(() => {
    if (!bulkComboId) return [];
    return drivers.filter(d => {
      if (!d.checked) return false;
      if (bulkUnassignedOnly && d.currentCombo) return false;
      return true;
    });
  }, [drivers, bulkComboId, bulkUnassignedOnly]);

  const handleBulkApply = () => {
    if (!bulkComboId || bulkTargets.length === 0) return;
    const targetKeys = new Set(bulkTargets.map(d => `${d.driver_name}|${d.class_index}`));
    setDrivers(prev => prev.map(d =>
      targetKeys.has(`${d.driver_name}|${d.class_index}`) ? { ...d, selectedComboId: bulkComboId } : d
    ));
    setShowBulkPreview(false);
    setSuccess(`Applied combo to ${bulkTargets.length} driver(s) in grid. Click "Save" to persist.`);
  };

  const handleSuggestFromClassDefault = () => {
    let count = 0;
    setDrivers(prev => prev.map(d => {
      if (d.currentCombo) return d;
      const cd = classDefaults.find(c =>
        c.class_index.toUpperCase() === d.class_index.toUpperCase()
      );
      if (cd) { count++; return { ...d, selectedComboId: cd.engine_combo_id, checked: true }; }
      return d;
    }));
    if (count > 0) setSuccess(`Suggested class default for ${count} unassigned driver(s). Click "Save" to persist.`);
    else setError('No class defaults found to suggest.');
  };

  const handleSaveAssignments = async () => {
    const changed = drivers.filter(d =>
      d.selectedComboId && d.selectedComboId !== (d.currentCombo?.engine_combo_id ?? null)
    );
    if (changed.length === 0) { setError('No changes to save'); return; }
    if (!eventDates.start) { setError('No event date range found'); return; }

    setLoading(true); setError(''); setSuccess('');
    try {
      const items = changed.map(d => ({
        driverName: d.driver_name,
        classIndex: d.class_index,
        engineComboId: d.selectedComboId!,
        effectiveFromUtc: eventDates.start!,
        effectiveToUtc: eventDates.end,
      }));
      const res = await parityApi.bulkUpsertDriverCombos(items);
      if (res.errors.length > 0) {
        setError(`Saved with errors: ${res.errors.join('; ')}`);
      } else {
        setSuccess(`Saved ${res.created} new assignment(s), closed ${res.closed} previous, skipped ${res.skipped}`);
      }
      await loadDrivers();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  // ── Change at Event Start shortcut ──
  const handleChangeAtEventStart = async (idx: number) => {
    const d = drivers[idx];
    if (!changeAtStartComboId || !eventDates.start) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const items = [{
        driverName: d.driver_name,
        classIndex: d.class_index,
        engineComboId: changeAtStartComboId,
        effectiveFromUtc: d.first_run_utc || eventDates.start,
        effectiveToUtc: eventDates.end,
      }];
      const res = await parityApi.bulkUpsertDriverCombos(items);
      if (res.errors.length > 0) {
        setError(res.errors.join('; '));
      } else {
        setSuccess(`${d.driver_name}: new assignment created${res.closed ? ', previous closed' : ''}`);
      }
      setChangeAtStartIdx(null);
      setChangeAtStartComboId(0);
      await loadDrivers();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleSaveClassDefault = async () => {
    if (!classFilter || !defaultComboId) return;
    setLoading(true); setError('');
    try {
      await parityApi.upsertClassDefault({
        classIndex: classFilter,
        engineComboId: defaultComboId,
      });
      const cdRes = await parityApi.listClassDefaults();
      setClassDefaults(cdRes.classDefaults);
      setEditingDefault(false);
      setSuccess(`Baseline combo saved for class ${classFilter}`);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const currentClassDefault = classFilter
    ? classDefaults.find(cd => cd.class_index.toUpperCase() === classFilter.toUpperCase())
    : null;

  // ── Computed counts for Setup Status ──
  const overrideCount = drivers.filter(d => d.resolvedFrom === 'override').length;
  const classDefaultCount = drivers.filter(d => d.resolvedFrom === 'classDefault').length;
  const noneCount = drivers.filter(d => d.resolvedFrom === 'none').length;
  const changedCount = drivers.filter(d =>
    d.selectedComboId && d.selectedComboId !== (d.currentCombo?.engine_combo_id ?? null)
  ).length;

  // Badge component for resolved-from
  const ResolveBadge = ({ from }: { from: ResolvedFrom }) => {
    const styles: Record<ResolvedFrom, { bg: string; fg: string; label: string; tip: string }> = {
      override:     { bg: 'rgba(34,197,94,0.15)', fg: '#22c55e', label: 'Override', tip: 'Driver has an explicit assignment for this event' },
      classDefault: { bg: 'rgba(99,102,241,0.15)', fg: '#818cf8', label: 'Class Default', tip: 'Using the baseline combo set for this class' },
      none:         { bg: 'rgba(245,158,11,0.15)', fg: '#f59e0b', label: 'None', tip: 'No assignment found — runs will have no correction' },
    };
    const s = styles[from];
    return (
      <span title={s.tip} style={{
        display: 'inline-block', padding: '1px 6px', borderRadius: 3,
        fontSize: '0.7rem', fontWeight: 600, background: s.bg, color: s.fg,
        cursor: 'help', whiteSpace: 'nowrap',
      }}>{s.label}</span>
    );
  };

  if (!isAdmin) return <div style={{ padding: '2rem', color: 'var(--color-muted)' }}>Admin access required</div>;

  return (
    <div>
      <h3 style={{ margin: '0 0 0.5rem' }}>Assign Combos</h3>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
        Select an event and class, then assign engine combo definitions to drivers individually or in bulk.
      </p>

      {/* ── Event & Class Selectors ── */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <select
          style={{ ...S.input, minWidth: 220 }}
          value={eventId ?? ''}
          onChange={e => setEventId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— Select Event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.race_lookup} — {ev.event_name || ev.track_name}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 2 }}>
          <button
            style={S.btn(classFilter === '' ? 'primary' : 'secondary')}
            onClick={() => setClassFilter('')}
          >All</button>
          {eventClasses.map(cls => (
            <button
              key={cls}
              style={S.btn(classFilter === cls ? 'primary' : 'secondary')}
              onClick={() => setClassFilter(cls)}
            >{cls}</button>
          ))}
        </div>
      </div>

      {/* ── A) Setup Status Header ── */}
      {eventId && drivers.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)',
          borderRadius: 6, padding: '0.6rem 0.75rem', marginBottom: '0.75rem',
          display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.35rem 1rem',
          fontSize: '0.8rem', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, gridColumn: '1 / -1', marginBottom: 2, fontSize: '0.85rem' }}>Setup Status</span>

          <span style={{ color: 'var(--color-muted)' }}>Weather data:</span>
          <span>{weatherSampleCount > 0
            ? <span style={{ color: '#22c55e' }}>{weatherSampleCount} sample{weatherSampleCount !== 1 ? 's' : ''} available</span>
            : <span style={{ color: '#ef4444' }}>None found for event dates</span>}
          </span>

          {classFilter && (
            <>
              <span style={{ color: 'var(--color-muted)' }}>Class baseline ({classFilter}):</span>
              <span>{currentClassDefault
                ? <span style={{ color: '#818cf8' }}>{currentClassDefault.engine_combo_name}</span>
                : <span style={{ color: '#f59e0b' }}>Not set — <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '0.8rem', textDecoration: 'underline' }}
                    onClick={() => { setEditingDefault(true); setDefaultComboId(0); }}>Set now</button></span>}
              </span>
            </>
          )}

          <span style={{ color: 'var(--color-muted)' }}>Driver overrides:</span>
          <span style={{ color: '#22c55e' }}>{overrideCount}</span>

          <span style={{ color: 'var(--color-muted)' }}>Using class baseline:</span>
          <span style={{ color: '#818cf8' }}>{classDefaultCount}</span>

          <span style={{ color: 'var(--color-muted)' }}>Missing assignment:</span>
          <span>{noneCount > 0
            ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>{noneCount} — <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '0.8rem', textDecoration: 'underline' }}
                onClick={handleSuggestFromClassDefault}>Apply suggested</button></span>
            : <span style={{ color: '#22c55e' }}>0</span>}
          </span>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', marginTop: 4 }}>
            <button style={{ ...S.btn('secondary'), fontSize: '0.7rem' }} onClick={onGoToRunsWeather}>
              Back to Runs + Weather
            </button>
          </div>
        </div>
      )}

      {error && <div style={S.error}>{error}</div>}
      {success && <div style={{ ...S.error, background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e' }}>{success}</div>}

      {/* ── Class Baseline Editor ── */}
      {classFilter && editingDefault && (
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.75rem',
          fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600 }}>Set Class Baseline ({classFilter}):</span>
          <select style={{ ...S.input, fontSize: '0.75rem', minWidth: 140 }}
            value={defaultComboId} onChange={e => setDefaultComboId(Number(e.target.value))}>
            <option value={0}>— Select Combo Definition —</option>
            {engineCombos.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
          </select>
          <button style={S.btn('primary')} onClick={handleSaveClassDefault} disabled={!defaultComboId || loading}>
            Save Baseline
          </button>
          <button style={S.btn('secondary')} onClick={() => setEditingDefault(false)}>Cancel</button>
        </div>
      )}

      {/* ── D) Bulk Actions Bar (safer) ── */}
      {drivers.length > 0 && (
        <div style={{
          display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap',
          marginBottom: '0.5rem', padding: '0.4rem 0.5rem',
          background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid var(--color-border)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {drivers.filter(d => d.checked).length} selected
          </span>
          <select style={{ ...S.input, fontSize: '0.75rem', minWidth: 140 }}
            value={bulkComboId} onChange={e => setBulkComboId(Number(e.target.value))}>
            <option value={0}>— Combo Definition —</option>
            {engineCombos.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
          </select>

          <label style={{ fontSize: '0.7rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}
            title="When checked, drivers who already have an override will be skipped">
            <input type="checkbox" checked={bulkUnassignedOnly} onChange={e => setBulkUnassignedOnly(e.target.checked)} />
            Unassigned only
          </label>

          <button style={S.btn('secondary')}
            onClick={() => setShowBulkPreview(true)}
            disabled={!bulkComboId || !someChecked}>
            Preview Bulk Apply
          </button>

          <button style={S.btn('secondary')} onClick={handleSuggestFromClassDefault}
            title="Auto-fill unassigned drivers from class baseline">
            Suggest from Baseline
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {changedCount > 0 && (
              <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>
                {changedCount} pending
              </span>
            )}
            <button style={S.btn('primary')} onClick={handleSaveAssignments}
              disabled={changedCount === 0 || loading}>
              {loading ? 'Saving...' : `Save ${changedCount} Assignment${changedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk Preview Modal ── */}
      {showBulkPreview && (
        <div style={{
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.8rem',
        }}>
          <strong>Bulk Apply Preview:</strong> This will assign <strong>{engineCombos.find(e => e.id === bulkComboId)?.name}</strong> to{' '}
          <strong>{bulkTargets.length}</strong> driver(s){bulkUnassignedOnly ? ' (unassigned only)' : ''}.
          {bulkTargets.length === 0 ? (
            <span style={{ color: '#f59e0b', marginLeft: 8 }}>No matching drivers. Uncheck "Unassigned only" or select more rows.</span>
          ) : (
            <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.2rem', fontSize: '0.75rem' }}>
              {bulkTargets.slice(0, 10).map(d => <li key={`${d.driver_name}|${d.class_index}`}>{d.driver_name} ({d.class_index})</li>)}
              {bulkTargets.length > 10 && <li>...and {bulkTargets.length - 10} more</li>}
            </ul>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
            <button style={S.btn('primary')} onClick={handleBulkApply} disabled={bulkTargets.length === 0}>
              Confirm Apply
            </button>
            <button style={S.btn('secondary')} onClick={() => setShowBulkPreview(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── B) Driver Grid with Resolved From column ── */}
      {loading && drivers.length === 0 && <div style={{ color: 'var(--color-muted)', padding: '1rem' }}>Loading drivers…</div>}

      {drivers.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem 0.5rem', width: 30 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th style={{ padding: '0.4rem 0.5rem' }}>Driver</th>
                <th style={{ padding: '0.4rem 0.5rem' }}>Class</th>
                <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Runs</th>
                <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Best ET</th>
                <th style={{ padding: '0.4rem 0.5rem' }}>Resolved From</th>
                <th style={{ padding: '0.4rem 0.5rem' }}>Current</th>
                <th style={{ padding: '0.4rem 0.5rem', minWidth: 150 }}>Assign</th>
                <th style={{ padding: '0.4rem 0.5rem', width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, idx) => {
                const isUnassigned = d.resolvedFrom === 'none' && !d.selectedComboId;
                const isChanged = d.selectedComboId && d.selectedComboId !== (d.currentCombo?.engine_combo_id ?? null);
                const showingChangeAtStart = changeAtStartIdx === idx;
                return (
                  <React.Fragment key={`${d.driver_name}|${d.class_index}`}>
                    <tr style={{
                      borderBottom: showingChangeAtStart ? 'none' : '1px solid var(--color-border)',
                      background: isUnassigned ? 'rgba(245,158,11,0.06)' : isChanged ? 'rgba(59,130,246,0.06)' : undefined,
                    }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <input type="checkbox" checked={d.checked} onChange={() => toggleCheck(idx)} />
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{d.driver_name}</td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>{d.class_index}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>{d.run_count}</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontFamily: 'monospace' }}>
                        {formatET(d.best_et)}
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <ResolveBadge from={d.resolvedFrom} />
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem' }}>
                        {d.currentCombo ? (
                          <span style={{ color: '#22c55e' }}>{d.currentCombo.engine_combo_name}</span>
                        ) : d.resolvedFrom === 'classDefault' ? (
                          <span style={{ color: '#818cf8', fontStyle: 'italic' }}>
                            {classDefaults.find(c => c.class_index.toUpperCase() === d.class_index.toUpperCase())?.engine_combo_name ?? '—'}
                          </span>
                        ) : (
                          <span style={{ color: '#f59e0b' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <select
                          style={{ ...S.input, fontSize: '0.75rem', width: '100%', minWidth: 130 }}
                          value={d.selectedComboId ?? 0}
                          onChange={e => setComboForRow(idx, Number(e.target.value))}
                        >
                          <option value={0}>— None —</option>
                          {engineCombos.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <button
                          title="Change combo at event start (closes previous, creates new)"
                          onClick={() => {
                            setChangeAtStartIdx(showingChangeAtStart ? null : idx);
                            setChangeAtStartComboId(0);
                          }}
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                        >{showingChangeAtStart ? '×' : '⟳'}</button>
                      </td>
                    </tr>
                    {/* C) Change at Event Start inline row */}
                    {showingChangeAtStart && (
                      <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(59,130,246,0.05)' }}>
                        <td colSpan={9} style={{ padding: '0.3rem 0.5rem 0.4rem 2.5rem', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--color-muted)' }}>Change at event start{d.first_run_utc ? ` (${d.first_run_utc.slice(0, 10)})` : ''}:</span>
                            <select style={{ ...S.input, fontSize: '0.75rem', minWidth: 140 }}
                              value={changeAtStartComboId} onChange={e => setChangeAtStartComboId(Number(e.target.value))}>
                              <option value={0}>— Select Combo —</option>
                              {engineCombos.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
                            </select>
                            <button style={{ ...S.btn('primary'), fontSize: '0.7rem' }}
                              disabled={!changeAtStartComboId || loading}
                              onClick={() => handleChangeAtEventStart(idx)}>
                              Save Now
                            </button>
                            <button style={{ ...S.btn('secondary'), fontSize: '0.7rem' }}
                              onClick={() => setChangeAtStartIdx(null)}>Cancel</button>
                            <span style={{ color: 'var(--color-muted)', fontSize: '0.7rem' }}>
                              Closes any previous assignment and creates a new one starting at {d.first_run_utc ? d.first_run_utc.slice(0, 10) : 'event start'}.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && drivers.length === 0 && eventId && (
        <div style={{ color: 'var(--color-muted)', padding: '1rem', textAlign: 'center' }}>
          No drivers found for this event{classFilter ? ` in class ${classFilter}` : ''}.
        </div>
      )}
    </div>
  );
}

// ── Weather Correction Preview Panel ────────────────────────────────────

function WeatherCorrectionPanel({ event }: { event: EventWithStats | null }) {
  const [tempF, setTempF] = useState(76.28);
  const [humidity, setHumidity] = useState(66); // display as percent
  const [pressure, setPressure] = useState(29.323);
  const [engineCombos, setEngineCombos] = useState<EngineComboRow[]>([]);
  const [selectedComboId, setSelectedComboId] = useState<number>(0);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [hpc, setHpc] = useState<number | null>(null);
  const [sampleET, setSampleET] = useState(3.700);
  const [sampleMPH, setSampleMPH] = useState(330.0);

  useEffect(() => {
    parityApi.listEngineCombos().then(r => {
      setEngineCombos(r.combos);
      if (r.combos.length > 0 && selectedComboId === 0) setSelectedComboId(r.combos[0].id);
    }).catch(() => {});
  }, []);

  const compute = useCallback(() => {
    const H = pct_to_frac(humidity);
    const w = computeWeather(tempF, H, pressure);
    setWeather(w);

    const combo = engineCombos.find(c => c.id === selectedComboId);
    if (combo) {
      const h = computeHPC({
        engineCombo: combo.name,
        tPower: combo.t_power,
        dPower: combo.d_power,
        FF: combo.friction_factor,
        theta: w.theta,
        delta: w.delta,
      });
      setHpc(h);
    } else {
      setHpc(null);
    }
  }, [tempF, humidity, pressure, selectedComboId, engineCombos]);

  useEffect(() => { compute(); }, [compute]);

  const fmt = (v: number | null | undefined, d = 6) => v != null ? v.toFixed(d) : '—';

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>Weather Correction Preview</h3>
      {event && (
        <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          Event: {event.event_name} — {event.track_name}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.8rem' }}>Temp °F:
          <input type="number" step="0.01" value={tempF} onChange={e => setTempF(parseFloat(e.target.value) || 0)}
            style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', width: 80, marginLeft: 4 }} />
        </label>
        <label style={{ fontSize: '0.8rem' }}>Humidity %:
          <input type="number" step="1" value={humidity} onChange={e => setHumidity(parseFloat(e.target.value) || 0)}
            style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', width: 60, marginLeft: 4 }} />
        </label>
        <label style={{ fontSize: '0.8rem' }}>Pressure inHg:
          <input type="number" step="0.001" value={pressure} onChange={e => setPressure(parseFloat(e.target.value) || 0)}
            style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', width: 90, marginLeft: 4 }} />
        </label>
        <label style={{ fontSize: '0.8rem' }}>Engine Combo:
          <select value={selectedComboId} onChange={e => setSelectedComboId(Number(e.target.value))}
            style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', marginLeft: 4 }}>
            <option value={0}>— none —</option>
            {engineCombos.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
          </select>
        </label>
      </div>

      {weather && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
          {([
            ['SVP', fmt(weather.svp, 6), 'inHg'],
            ['Vapor Pressure', fmt(weather.vp, 6), 'inHg'],
            ['Dry Air Pressure', fmt(weather.dap, 6), 'inHg'],
            ['Dew Point', fmt(weather.dewPoint, 2), '°F'],
            ['Air Density', fmt(weather.airDensity, 4), ''],
            ['Density Altitude', fmt(weather.densityAltitude, 1), 'ft'],
            ['Water Grains', fmt(weather.waterGrains, 2), 'gr/lb'],
            ['Correction Factor', fmt(weather.correctionFactor, 6), ''],
            ['Theta (θ)', fmt(weather.theta, 10), ''],
            ['Delta (δ)', fmt(weather.delta, 10), ''],
          ] as [string, string, string][]).map(([label, val, unit]) => (
            <div key={label} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.5rem', background: 'var(--color-bg-alt, #2a2a3a)' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.15rem' }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{val} <span style={{ color: '#888', fontSize: '0.75rem' }}>{unit}</span></div>
            </div>
          ))}
        </div>
      )}

      {hpc != null && (() => {
        const combo = engineCombos.find(c => c.id === selectedComboId);
        return (
          <div style={{ border: '2px solid var(--color-primary, #3b82f6)', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem', background: 'var(--color-bg-alt, #2a2a3a)' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>HPC (Horsepower Correction)</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 700 }}>{hpc.toFixed(6)}</div>
              </div>
              {combo && (
                <div style={{ fontSize: '0.75rem', color: '#aaa', fontFamily: 'monospace' }}>
                  {combo.name} — tP={combo.t_power} dP={combo.d_power} FF={combo.friction_factor}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.8rem' }}>Sample ET:
                <input type="number" step="0.001" value={sampleET} onChange={e => setSampleET(parseFloat(e.target.value) || 0)}
                  style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', width: 80, marginLeft: 4 }} />
              </label>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>→ Corrected ET: <b>{fmt(correctET(sampleET, hpc), 4)}</b></span>
              <label style={{ fontSize: '0.8rem' }}>Sample MPH:
                <input type="number" step="0.1" value={sampleMPH} onChange={e => setSampleMPH(parseFloat(e.target.value) || 0)}
                  style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace', width: 80, marginLeft: 4 }} />
              </label>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>→ Corrected MPH: <b>{fmt(correctMPH(sampleMPH, hpc), 2)}</b></span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Admin Tracks Panel ──────────────────────────────────────────────────

function AdminTracksPanel() {
  const [tracks, setTracks] = useState<TrackWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [mergeSource, setMergeSource] = useState<number | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await parityApi.listTracksWithStats();
      setTracks(res.tracks);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (t: TrackWithStats) => {
    setEditId(t.id);
    setEditFields({
      track_name: t.track_name || '',
      timezone_iana: t.timezone_iana || '',
      city: t.city || '',
      state: t.state || '',
      zip: t.zip || '',
      street: t.street || '',
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await parityApi.updateTrack({ trackId: editId, ...editFields });
      setEditId(null);
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const doMerge = async () => {
    if (!mergeSource || !mergeTarget) return;
    const src = tracks.find(t => t.id === mergeSource);
    const tgt = tracks.find(t => t.id === mergeTarget);
    if (!confirm(`Merge "${src?.track_name}" → "${tgt?.track_name}"?\nAll events will be moved. The source track will be deleted.`)) return;
    setSaving(true); setError(''); setMsg('');
    try {
      const r = await parityApi.mergeTracks({ sourceTrackId: mergeSource, targetTrackId: mergeTarget });
      setMsg(`Merged: ${r.eventsMoved} events moved from "${src?.track_name}" → "${tgt?.track_name}"`);
      setMergeSource(null); setMergeTarget(0);
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const stickyTh = { ...S.th, position: 'sticky' as const, top: 0, zIndex: 1, background: 'var(--color-surface, #1e1e2e)' };

  return (
    <div>
      <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <b style={{ fontSize: '0.9rem' }}>Tracks</b>
        <button style={S.btn('secondary')} onClick={load} disabled={loading}>
          {loading ? '...' : '↻ Refresh'}
        </button>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{tracks.length} tracks</span>
        {/* Merge UI */}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center', fontSize: '0.72rem' }}>
          <span style={{ fontWeight: 600 }}>Merge:</span>
          <select style={{ ...S.input, width: 160, fontSize: '0.7rem' }} value={mergeSource ?? ''} onChange={e => setMergeSource(Number(e.target.value) || null)}>
            <option value="">Source track...</option>
            {tracks.map(t => <option key={t.id} value={t.id}>{t.track_name} (ID {t.id})</option>)}
          </select>
          <span>→</span>
          <select style={{ ...S.input, width: 160, fontSize: '0.7rem' }} value={mergeTarget} onChange={e => setMergeTarget(Number(e.target.value))}>
            <option value={0}>Target track...</option>
            {tracks.filter(t => t.id !== mergeSource).map(t => <option key={t.id} value={t.id}>{t.track_name} (ID {t.id})</option>)}
          </select>
          <button style={{ ...S.btn('danger'), fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
            onClick={doMerge} disabled={!mergeSource || !mergeTarget || saving}>Merge</button>
        </span>
      </div>
      {error && <div style={S.error}>{error}</div>}
      {msg && <div style={{ ...S.hint, color: '#16a34a' }}>{msg}</div>}
      <div style={{ overflow: 'auto', maxHeight: 600 }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={stickyTh}>ID</th>
              <th style={stickyTh}>Track Name</th>
              <th style={stickyTh}>City/State</th>
              <th style={stickyTh}>Timezone</th>
              <th style={stickyTh}>Zip</th>
              <th style={stickyTh}>Events</th>
              <th style={stickyTh}>Runs</th>
              <th style={stickyTh}>Weather</th>
              <th style={stickyTh}></th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((t, i) => (
              <tr key={t.id} style={{ background: i % 2 === 1 ? 'var(--color-bg, #262636)' : undefined }}>
                <td style={S.td}>{t.id}</td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <input style={{ ...S.input, width: 200 }} value={editFields.track_name}
                      onChange={e => setEditFields(f => ({ ...f, track_name: e.target.value }))} />
                  ) : <b>{t.track_name}</b>}
                </td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <span style={{ display: 'flex', gap: 4 }}>
                      <input style={{ ...S.input, width: 80 }} value={editFields.city} placeholder="City"
                        onChange={e => setEditFields(f => ({ ...f, city: e.target.value }))} />
                      <input style={{ ...S.input, width: 30 }} value={editFields.state} placeholder="ST"
                        onChange={e => setEditFields(f => ({ ...f, state: e.target.value }))} />
                    </span>
                  ) : (
                    <span>{t.city}{t.state ? `, ${t.state}` : ''}</span>
                  )}
                </td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <input style={{ ...S.input, width: 140 }} value={editFields.timezone_iana}
                      onChange={e => setEditFields(f => ({ ...f, timezone_iana: e.target.value }))} />
                  ) : <span style={{ fontSize: '0.7rem' }}>{t.timezone_iana}</span>}
                </td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <input style={{ ...S.input, width: 50 }} value={editFields.zip} placeholder="Zip"
                      onChange={e => setEditFields(f => ({ ...f, zip: e.target.value }))} />
                  ) : <span style={{ fontSize: '0.7rem' }}>{t.zip || ''}</span>}
                </td>
                <td style={S.td}>{t.event_count}</td>
                <td style={S.td}><span style={{ color: t.total_run_count > 0 ? '#16a34a' : 'var(--color-muted)' }}>{t.total_run_count}</span></td>
                <td style={S.td}><span style={{ color: t.total_weather_samples > 0 ? '#2563eb' : 'var(--color-muted)' }}>{t.total_weather_samples}</span></td>
                <td style={S.td}>
                  {editId === t.id ? (
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button style={{ ...S.btn('primary'), fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}
                        onClick={saveEdit} disabled={saving}>{saving ? '...' : 'Save'}</button>
                      <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}
                        onClick={() => setEditId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}
                      onClick={() => startEdit(t)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && tracks.length === 0 && <div style={S.hint}>No tracks found.</div>}
    </div>
  );
}

// ── Admin Events Panel ──────────────────────────────────────────────────

function AdminEventsPanel({ onRefreshEvents }: { onRefreshEvents: () => void }) {
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [tracks, setTracks] = useState<TrackWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [searchFilter, setSearchFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState(0);
  const [editId, setEditId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // Bulk import state
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkRows, setBulkRows] = useState<import('../domain/parity/eventImport').BulkEventRow[]>([]);
  const [bulkParsed, setBulkParsed] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<import('../services/parityApi').BulkCreateEventsResponse | null>(null);
  const [bulkUpdateExisting, setBulkUpdateExisting] = useState(false);

  const years = Array.from({ length: 2027 - 2010 }, (_, i) => 2010 + i).reverse();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [evRes, trRes] = await Promise.all([
        parityApi.eventsWithStats(yearFilter),
        parityApi.listTracksWithStats(),
      ]);
      setEvents(evRes.events);
      setTracks(trRes.tracks);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [yearFilter]);

  useEffect(() => { load(); }, [load]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let list = events;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(ev =>
        ev.event_name.toLowerCase().includes(q) ||
        ev.track_name.toLowerCase().includes(q) ||
        (ev.race_lookup || '').includes(q)
      );
    }
    if (trackFilter > 0) {
      list = list.filter(ev => ev.track_id === trackFilter);
    }
    return list;
  }, [events, searchFilter, trackFilter]);

  const startEdit = (ev: EventWithStats) => {
    setEditId(ev.id);
    setEditFields({
      event_name: ev.event_name || '',
      event_code: ev.event_code || '',
      season_year: String(ev.season_year ?? ''),
      race_lookup: ev.race_lookup || '',
      start_date_local: ev.start_date_local || '',
      end_date_local: ev.end_date_local || '',
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const params: any = { eventId: editId };
      if (editFields.event_name) params.event_name = editFields.event_name;
      params.event_code = editFields.event_code || null;
      if (editFields.season_year) params.season_year = Number(editFields.season_year);
      if (editFields.race_lookup) params.race_lookup = editFields.race_lookup;
      if (editFields.start_date_local) params.start_date_local = editFields.start_date_local;
      if (editFields.end_date_local) params.end_date_local = editFields.end_date_local;
      await parityApi.updateEvent(params);
      setEditId(null);
      load();
      onRefreshEvents();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // Bulk import: parse
  const doParseBulk = () => {
    const trackRefs = tracks.map(t => ({
      id: t.id,
      track_name: t.track_name,
      normalized: normalizeTrackName(t.track_name),
    }));
    const existingRefs = events.map(ev => ({
      id: ev.id,
      start_date_local: ev.start_date_local,
      track_id: ev.track_id,
      race_lookup: ev.race_lookup,
    }));
    const rows = parseBulkCsv(bulkCsv, trackRefs, existingRefs);
    setBulkRows(rows);
    setBulkParsed(true);
    setBulkResult(null);
  };

  // Bulk import: submit
  const doSubmitBulk = async () => {
    const okRows = bulkRows.filter(r => r.status === 'ok' || (bulkUpdateExisting && r.status === 'duplicate'));
    if (okRows.length === 0) return;
    setBulkSubmitting(true); setError(''); setMsg('');
    try {
      const apiRows = okRows.map(r => ({
        event_name: r.rawEventName,
        track_id: r.resolvedTrackId!,
        start_date_local: r.startDateLocal!,
        end_date_local: r.endDateLocal!,
        race_lookup: r.raceLookup || undefined,
        season_year: r.seasonYear || undefined,
      }));
      const result = await parityApi.bulkCreateEvents({
        events: apiRows,
        skipDuplicates: !bulkUpdateExisting,
        updateExisting: bulkUpdateExisting,
      });
      setBulkResult(result);
      const s = result.summary;
      setMsg(`Bulk import done: ${s.created} created, ${s.duplicate_skipped} skipped, ${s.duplicate_updated} updated, ${s.error} errors`);
      load();
      onRefreshEvents();
    } catch (e: any) { setError(e.message); }
    setBulkSubmitting(false);
  };

  const stickyTh = { ...S.th, position: 'sticky' as const, top: 0, zIndex: 1, background: 'var(--color-surface, #1e1e2e)' };
  const errorCount = bulkRows.filter(r => r.status === 'error').length;
  const okCount = bulkRows.filter(r => r.status === 'ok').length;
  const dupCount = bulkRows.filter(r => r.status === 'duplicate').length;

  return (
    <div data-testid="admin-events-panel">
      {/* ── Filters ── */}
      <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <b style={{ fontSize: '0.9rem' }}>Events</b>
        <select style={{ ...S.input, width: 80 }} value={yearFilter}
          onChange={e => setYearFilter(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <input style={{ ...S.input, width: 140 }} placeholder="Search name/track..."
          value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
        <select style={{ ...S.input, width: 150 }} value={trackFilter}
          onChange={e => setTrackFilter(Number(e.target.value))}>
          <option value={0}>All tracks</option>
          {tracks.map(t => <option key={t.id} value={t.id}>{t.track_name}</option>)}
        </select>
        <button style={S.btn('secondary')} onClick={load} disabled={loading}>
          {loading ? '...' : '↻ Refresh'}
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          {filteredEvents.length}{filteredEvents.length !== events.length ? ` / ${events.length}` : ''} events
        </span>
        <button style={{ ...S.btn('primary'), marginLeft: 'auto', fontSize: '0.7rem' }}
          onClick={() => setShowBulk(!showBulk)}>
          {showBulk ? 'Hide Bulk Import' : 'Bulk Import Events'}
        </button>
      </div>

      {error && <div style={S.error}>{error}</div>}
      {msg && <div style={{ ...S.hint, color: '#16a34a' }}>{msg}</div>}

      {/* ── Bulk Import Section ── */}
      {showBulk && (
        <div style={{ ...S.card, marginBottom: '1rem' }} data-testid="bulk-import-section">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Bulk Import Events</h3>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', margin: '0 0 0.5rem' }}>
            Paste CSV/TSV text. Columns: <b>event_name</b>, <b>start_date</b> (or date range), <b>track_name</b>, [end_date].
            Dates accept: "2010-02-11", "Feb 11-14 2010", "October 30-November 2 2025".
          </p>
          <textarea
            style={{ ...S.input, width: '100%', minHeight: 120, fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical' }}
            placeholder={'Gatornationals\t2010-03-11\tGainesville Raceway\t2010-03-14\nWinternationals\tFeb 10-13, 2011\tPomona'}
            value={bulkCsv}
            onChange={e => { setBulkCsv(e.target.value); setBulkParsed(false); setBulkResult(null); }}
          />
          <div style={{ ...S.row, marginTop: '0.3rem' }}>
            <button style={S.btn('primary')} onClick={doParseBulk} disabled={!bulkCsv.trim()}>
              Parse &amp; Validate
            </button>
            <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={bulkUpdateExisting} onChange={e => setBulkUpdateExisting(e.target.checked)} />
              Update existing duplicates
            </label>
          </div>

          {/* Preview grid */}
          {bulkParsed && bulkRows.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ ...S.row, marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                <span>Parsed: <b>{bulkRows.length}</b> rows</span>
                <span style={{ color: '#16a34a' }}>OK: <b>{okCount}</b></span>
                {dupCount > 0 && <span style={{ color: '#f59e0b' }}>Duplicate: <b>{dupCount}</b></span>}
                {errorCount > 0 && <span style={{ color: '#dc2626' }}>Error: <b>{errorCount}</b></span>}
              </div>
              <div style={{ overflow: 'auto', maxHeight: 300 }}>
                <table style={{ ...S.table, fontSize: '0.7rem' }}>
                  <thead>
                    <tr>
                      <th style={stickyTh}>#</th>
                      <th style={stickyTh}>Status</th>
                      <th style={stickyTh}>Event Name</th>
                      <th style={stickyTh}>Start</th>
                      <th style={stickyTh}>End</th>
                      <th style={stickyTh}>Track</th>
                      <th style={stickyTh}>Lookup</th>
                      <th style={stickyTh}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((r, i) => {
                      const bg = r.status === 'error' ? 'rgba(220,38,38,0.1)'
                        : r.status === 'duplicate' ? 'rgba(245,158,11,0.1)'
                        : i % 2 === 1 ? 'var(--color-bg, #262636)' : undefined;
                      return (
                        <tr key={i} style={{ background: bg }}>
                          <td style={S.td}>{r.rowNum}</td>
                          <td style={S.td}>
                            <span style={{
                              padding: '0.1rem 0.3rem', borderRadius: 3, fontSize: '0.6rem', fontWeight: 600,
                              background: r.status === 'ok' ? '#16a34a' : r.status === 'duplicate' ? '#f59e0b' : '#dc2626',
                              color: '#fff',
                            }}>
                              {r.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={S.td}>{r.rawEventName}</td>
                          <td style={S.td}>{r.startDateLocal || '—'}</td>
                          <td style={S.td}>{r.endDateLocal || '—'}</td>
                          <td style={S.td}>{r.resolvedTrackName || <span style={{ color: '#dc2626' }}>{r.rawTrackName}</span>}</td>
                          <td style={S.td}><code>{r.raceLookup || '—'}</code></td>
                          <td style={{ ...S.td, fontSize: '0.6rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.statusDetail || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Submit */}
              <div style={{ ...S.row, marginTop: '0.5rem' }}>
                <button
                  style={S.btn('primary')}
                  onClick={doSubmitBulk}
                  disabled={bulkSubmitting || (errorCount > 0 && okCount === 0)}
                >
                  {bulkSubmitting ? 'Importing...' : `Import ${okCount}${bulkUpdateExisting && dupCount > 0 ? ` + update ${dupCount}` : ''} events`}
                </button>
                {errorCount > 0 && (
                  <span style={{ fontSize: '0.7rem', color: '#dc2626' }}>
                    {errorCount} error row(s) will be skipped
                  </span>
                )}
              </div>

              {/* Result summary */}
              {bulkResult && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(22,163,106,0.1)', borderRadius: 4, fontSize: '0.75rem' }}>
                  <b>Import Results:</b>{' '}
                  Created: {bulkResult.summary.created},
                  Skipped: {bulkResult.summary.duplicate_skipped},
                  Updated: {bulkResult.summary.duplicate_updated},
                  Errors: {bulkResult.summary.error}
                </div>
              )}
            </div>
          )}
          {bulkParsed && bulkRows.length === 0 && (
            <div style={{ ...S.hint, marginTop: '0.3rem' }}>No rows parsed. Check your CSV format.</div>
          )}
        </div>
      )}

      {/* ── Events Table ── */}
      <div style={{ overflow: 'auto', maxHeight: 600 }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={stickyTh}>ID</th>
              <th style={stickyTh}>Event Name</th>
              <th style={stickyTh}>Code</th>
              <th style={stickyTh}>Track</th>
              <th style={stickyTh}>Dates</th>
              <th style={stickyTh}>Lookup</th>
              <th style={stickyTh}>Runs</th>
              <th style={stickyTh}>Weather</th>
              <th style={stickyTh}></th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev, i) => (
              <tr key={ev.id} style={{ background: i % 2 === 1 ? 'var(--color-bg, #262636)' : undefined }}>
                <td style={S.td}>{ev.id}</td>
                <td style={S.td}>
                  {editId === ev.id ? (
                    <input style={{ ...S.input, width: 220 }} value={editFields.event_name}
                      onChange={e => setEditFields(f => ({ ...f, event_name: e.target.value }))} />
                  ) : <b>{ev.event_name}</b>}
                </td>
                <td style={S.td}>
                  {editId === ev.id ? (
                    <input style={{ ...S.input, width: 60, fontSize: '0.7rem' }} value={editFields.event_code} placeholder="e.g. GAT"
                      onChange={e => setEditFields(f => ({ ...f, event_code: e.target.value }))} />
                  ) : <code style={{ fontSize: '0.7rem', color: ev.event_code ? '#16a34a' : 'var(--color-muted)' }}>{ev.event_code || '—'}</code>}
                </td>
                <td style={{ ...S.td, fontSize: '0.7rem' }}>{ev.track_name}{ev.city ? `, ${ev.city}` : ''}</td>
                <td style={S.td}>
                  {editId === ev.id ? (
                    <span style={{ display: 'flex', gap: 4, fontSize: '0.7rem' }}>
                      <input style={{ ...S.input, width: 90, fontSize: '0.7rem' }} value={editFields.start_date_local}
                        onChange={e => setEditFields(f => ({ ...f, start_date_local: e.target.value }))} />
                      <input style={{ ...S.input, width: 90, fontSize: '0.7rem' }} value={editFields.end_date_local}
                        onChange={e => setEditFields(f => ({ ...f, end_date_local: e.target.value }))} />
                    </span>
                  ) : <span style={{ fontSize: '0.7rem' }}>{ev.start_date_local} — {ev.end_date_local}</span>}
                </td>
                <td style={S.td}>
                  {editId === ev.id ? (
                    <input style={{ ...S.input, width: 80, fontSize: '0.7rem' }} value={editFields.race_lookup}
                      onChange={e => setEditFields(f => ({ ...f, race_lookup: e.target.value }))} />
                  ) : <code style={{ fontSize: '0.7rem' }}>{ev.race_lookup}</code>}
                </td>
                <td style={S.td}>
                  <span style={{ color: ev.run_count > 0 ? '#16a34a' : 'var(--color-muted)' }}>{ev.run_count}</span>
                </td>
                <td style={S.td}>
                  <span style={{ color: ev.weather_sample_count > 0 ? '#2563eb' : 'var(--color-muted)' }}>{ev.weather_sample_count}</span>
                </td>
                <td style={S.td}>
                  {editId === ev.id ? (
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button style={{ ...S.btn('primary'), fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}
                        onClick={saveEdit} disabled={saving}>{saving ? '...' : 'Save'}</button>
                      <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}
                        onClick={() => setEditId(null)}>Cancel</button>
                    </span>
                  ) : (
                    <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}
                      onClick={() => startEdit(ev)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && filteredEvents.length === 0 && <div style={S.hint}>No events{searchFilter || trackFilter ? ' matching filters' : ` for ${yearFilter}`}.</div>}
    </div>
  );
}

// ── Parity Summary Panel ────────────────────────────────────────────────

const CLASS_BUTTONS = ['TF', 'FC', 'PS', 'PSM', 'TD', 'TS'];

function ParitySummaryPanel({ event }: { event: EventWithStats | null }) {
  const [classFilter, setClassFilter] = useState('TF');
  const [data, setData] = useState<EventParitySummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!event) return;
    setLoading(true); setError('');
    try {
      const res = await parityApi.eventParitySummary({ eventId: event.id, classIndex: classFilter });
      setData(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [event?.id, classFilter]);

  useEffect(() => { load(); }, [load]);

  if (!event) return <div style={S.card}><p style={{ color: 'var(--color-muted)' }}>Select an event above.</p></div>;

  const fmt = (v: number | null | undefined, d = 3) => v != null ? v.toFixed(d) : '—';

  const MetricRow = ({ label, actual, corrected }: { label: string; actual: number | null | undefined; corrected: number | null | undefined }) => (
    <tr>
      <td style={{ ...S.td, fontWeight: 600 }}>{label}</td>
      <td style={{ ...S.td, textAlign: 'right' }}>{fmt(actual)}</td>
      <td style={{ ...S.td, textAlign: 'right', color: '#2563eb' }}>{fmt(corrected)}</td>
      {actual != null && corrected != null ? (
        <td style={{ ...S.td, textAlign: 'right', fontSize: '0.7rem', color: corrected < actual ? '#16a34a' : '#dc2626' }}>
          {(corrected - actual) > 0 ? '+' : ''}{(corrected - actual).toFixed(4)}
        </td>
      ) : <td style={S.td}>—</td>}
    </tr>
  );

  return (
    <div>
      <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <b style={{ fontSize: '0.8rem' }}>Class:</b>
        {CLASS_BUTTONS.map(c => (
          <button key={c} style={{ ...S.btn(classFilter === c ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
            onClick={() => setClassFilter(c)}>{c}</button>
        ))}
        {data && !loading && (
          <button style={{ ...S.btn('secondary'), marginLeft: 'auto', fontSize: '0.7rem' }}
            onClick={() => exportParitySummaryPdf(data, data.event?.event_name ?? 'Event', classFilter, event?.race_lookup ?? '')}>
            Export PDF
          </button>
        )}
      </div>

      {loading && <div style={S.hint}>Loading parity summary...</div>}
      {error && <div style={S.error}>{error}</div>}

      {data && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {/* Metrics card */}
          <div style={S.card}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>ET Parity — {classFilter}</h3>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Metric</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Actual</th>
                  <th style={{ ...S.th, textAlign: 'right', color: '#2563eb' }}>Corrected</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Δ</th>
                </tr>
              </thead>
              <tbody>
                <MetricRow label="Best ET" actual={data.actual.best} corrected={data.corrected.best} />
                <MetricRow label="Top 3 Median" actual={data.actual.top3_median} corrected={data.corrected.top3_median} />
                <MetricRow label="Top 5 Median" actual={data.actual.top5_median} corrected={data.corrected.top5_median} />
                <MetricRow label="All Median" actual={data.actual.all_median} corrected={data.corrected.all_median} />
              </tbody>
            </table>
          </div>

          {/* Info card */}
          <div style={S.card}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Data Quality</h3>
            <div style={{ fontSize: '0.8rem', lineHeight: 1.8 }}>
              <div><b>Qualifying runs:</b> {data.run_count}</div>
              <div><b>Weather-joined:</b> {data.weather_joined_count} ({data.run_count > 0 ? Math.round(data.weather_joined_count / data.run_count * 100) : 0}%)</div>
              <div><b>Corrected:</b> {data.corrected_count}</div>
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                <b>Model:</b> <code>{data.correction_model_version}</code>
              </div>
              <div><b>Standard day:</b> {data.standard_day.temp_f}°F, {data.standard_day.pressure_inhg}" Hg, {data.standard_day.rh_pct}% RH</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Qual Sheet Panel ────────────────────────────────────────────────────

function QualSheetPanel({ event, onDriverClick }: { event: EventWithStats | null; onDriverClick?: (driver: string, classIndex?: string) => void }) {
  const [classFilter, setClassFilter] = useState('TF');
  const [data, setData] = useState<QualSheetResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!event) return;
    setLoading(true); setError('');
    try {
      const res = await parityApi.qualSheet({ eventId: event.id, classIndex: classFilter, includeCorrected: true });
      setData(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [event?.id, classFilter]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = useCallback(() => {
    if (!data) return;
    const hdr = ['Pos', 'Driver', 'Car#', 'Best ET', 'Best MPH', 'Corrected ET', 'Factor', 'RT', '60ft', '660 ET', 'Runs', 'Valid'];
    const rows = data.sheet.map((r: QualSheetRow) => [
      r.qual_pos ?? 'DQ', r.driver, r.car_number ?? '',
      r.best_et != null ? formatET(r.best_et) : '', r.best_mph != null ? formatMPH(r.best_mph) : '',
      r.corrected_best_et != null ? formatET(r.corrected_best_et) : '', r.correction_factor?.toFixed(4) ?? '',
      r.best_rt != null ? formatET(r.best_rt) : '', r.best_ft60 != null ? formatET(r.best_ft60) : '', r.best_ft660 != null ? formatET(r.best_ft660) : '', r.run_count, r.is_valid ? 'Y' : 'N',
    ]);
    const csv = [hdr, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `qual-sheet-${data.classIndex}-${data.event?.start_date_local ?? 'event'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [data]);

  if (!event) return <div style={S.card}><p style={{ color: 'var(--color-muted)' }}>Select an event above.</p></div>;

  const stickyTh: React.CSSProperties = { ...S.th, position: 'sticky', top: 0, zIndex: 1, background: 'var(--color-surface, #1e1e2e)' };

  return (
    <div>
      <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <b style={{ fontSize: '0.8rem' }}>Class:</b>
        {CLASS_BUTTONS.map(c => (
          <button key={c} style={{ ...S.btn(classFilter === c ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
            onClick={() => setClassFilter(c)}>{c}</button>
        ))}
        {data && data.sheet.length > 0 && (
          <>
            <button style={{ ...S.btn('secondary'), marginLeft: 'auto', fontSize: '0.7rem' }} onClick={exportCsv}>Export CSV</button>
            <button style={{ ...S.btn('secondary'), fontSize: '0.7rem' }}
              onClick={() => exportQualSheetPdf(data.sheet, data.event?.event_name ?? 'Event', classFilter, event?.race_lookup ?? '')}>
              Export PDF
            </button>
          </>
        )}
      </div>

      {loading && <div style={S.hint}>Loading qualifying sheet...</div>}
      {error && <div style={S.error}>{error}</div>}

      {data && !loading && (
        <>
          {data.event && (
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {data.event.event_name} — {classFilter} Final Qualifying
              <span style={{ fontWeight: 400, color: 'var(--color-muted)', marginLeft: 8 }}>
                {data.qualifier_count} qualifier{data.qualifier_count !== 1 ? 's' : ''}
                {data.total_drivers > data.qualifier_count && ` · ${data.total_drivers - data.qualifier_count} DQ/no valid run`}
              </span>
            </div>
          )}
          <div style={{ overflow: 'auto', maxHeight: 500 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={stickyTh}>Pos</th>
                  <th style={stickyTh}>Driver</th>
                  <th style={stickyTh}>Car#</th>
                  <th style={{ ...stickyTh, textAlign: 'right' }}>Best ET</th>
                  <th style={{ ...stickyTh, textAlign: 'right' }}>MPH</th>
                  <th style={{ ...stickyTh, textAlign: 'right', color: '#2563eb' }}>Corrected ET</th>
                  <th style={{ ...stickyTh, textAlign: 'right' }}>RT</th>
                  <th style={{ ...stickyTh, textAlign: 'right' }}>60ft</th>
                  <th style={{ ...stickyTh, textAlign: 'right' }}>Runs</th>
                </tr>
              </thead>
              <tbody>
                {data.sheet.map((r: QualSheetRow, i: number) => {
                  const invalid = !r.is_valid;
                  const rowBg = invalid ? 'rgba(239,68,68,0.08)' : (i % 2 === 1 ? 'var(--color-bg, #262636)' : undefined);
                  return (
                    <tr key={r.driver} style={{ background: rowBg, opacity: invalid ? 0.6 : 1 }}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{r.qual_pos ?? '—'}</td>
                      <td style={S.td}>
                        {onDriverClick ? (
                          <button
                            onClick={() => onDriverClick(r.driver, classFilter)}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline', textAlign: 'left' }}
                          >{r.driver}</button>
                        ) : r.driver}
                        {invalid && <span style={{ color: '#ef4444', fontSize: '0.65rem', marginLeft: 6 }}>DQ / NO VALID RUN</span>}
                      </td>
                      <td style={S.td}>{r.car_number ?? '—'}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{formatET(r.best_et)}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{formatMPH(r.best_mph)}</td>
                      <td style={{ ...S.td, textAlign: 'right', color: '#2563eb' }}>{formatET(r.corrected_best_et)}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{formatET(r.best_rt)}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{formatET(r.best_ft60)}</td>
                      <td style={{ ...S.td, textAlign: 'right' }}>{r.run_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Ladder Panel ────────────────────────────────────────────────────────

function LadderPanel({ event }: { event: EventWithStats | null }) {
  const [classFilter, setClassFilter] = useState('TF');
  const [ladderSize, setLadderSize] = useState(16);
  const [data, setData] = useState<LadderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!event) return;
    setLoading(true); setError('');
    try {
      const res = await parityApi.ladder({ eventId: event.id, classIndex: classFilter, ladderSize });
      setData(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [event?.id, classFilter, ladderSize]);

  useEffect(() => { load(); }, [load]);

  if (!event) return <div style={S.card}><p style={{ color: 'var(--color-muted)' }}>Select an event above.</p></div>;

  const seedStyle = (seed: { driver: string; best_et: number | null; seed: number }) => ({
    padding: '0.3rem 0.6rem',
    background: seed.driver === 'BYE' ? 'var(--color-bg, #262636)' : 'var(--color-surface, #1e1e2e)',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    fontSize: '0.75rem',
    opacity: seed.driver === 'BYE' ? 0.4 : 1,
    minWidth: 220,
  } as React.CSSProperties);

  return (
    <div>
      <div style={{ ...S.row, marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <b style={{ fontSize: '0.8rem' }}>Class:</b>
        {CLASS_BUTTONS.map(c => (
          <button key={c} style={{ ...S.btn(classFilter === c ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
            onClick={() => setClassFilter(c)}>{c}</button>
        ))}
        <span style={{ marginLeft: 12, fontSize: '0.8rem' }}>Size:</span>
        {[8, 16].map(s => (
          <button key={s} style={{ ...S.btn(ladderSize === s ? 'primary' : 'secondary'), fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
            onClick={() => setLadderSize(s)}>{s}</button>
        ))}
        {data && !loading && data.pairings.length > 0 && (
          <button style={{ ...S.btn('secondary'), marginLeft: 'auto', fontSize: '0.7rem' }}
            onClick={() => exportLadderPdf(data.pairings, data.ladderSize, data.actualQualifiers, data.event?.event_name ?? 'Event', classFilter, event?.race_lookup ?? '')}>
            Export PDF
          </button>
        )}
      </div>

      {loading && <div style={S.hint}>Loading ladder...</div>}
      {error && <div style={S.error}>{error}</div>}

      {data && !loading && (
        <>
          {data.event && (
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {data.event.event_name} — {classFilter} Round 1 Ladder ({data.actualQualifiers} qualifiers)
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.pairings.map((p: LadderPairing) => (
              <div key={p.match} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.7rem', width: 30, textAlign: 'right', color: 'var(--color-muted)' }}>
                  R1-{p.match}
                </span>
                <div style={seedStyle(p.top_seed)}>
                  <b>#{p.top_seed.seed}</b> {p.top_seed.driver}
                  {p.top_seed.best_et != null && <span style={{ marginLeft: 8, color: 'var(--color-muted)' }}>{formatET(p.top_seed.best_et)}</span>}
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-muted)' }}>vs</span>
                <div style={seedStyle(p.bottom_seed)}>
                  <b>#{p.bottom_seed.seed}</b> {p.bottom_seed.driver}
                  {p.bottom_seed.best_et != null && <span style={{ marginLeft: 8, color: 'var(--color-muted)' }}>{formatET(p.bottom_seed.best_et)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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
  if (typeof v === 'number') return key.startsWith('mph') ? formatMPH(v) : formatET(v);
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

interface CorrectedRun extends RunWithWeather {
  _hpc: number | null;
  _hpcReason: string | null;
  _corr1320: number | null;
  _corrMph1320: number | null;
  _corr60: number | null;
  _corr330: number | null;
  _corr660: number | null;
  _corrMph660: number | null;
  _corr1000: number | null;
}

type RWViewMode = 'table' | 'card';
type RWColumn = 'driver' | 'class' | 'round' | 'lane' | 'rt' | 'et' | 'mph' | 'temp' | 'rh' | 'press' | 'delta' | 'source' | 'hpc' | 'corrEt' | 'corrMph';

const RW_ALL_COLUMNS: { key: RWColumn; label: string; default: boolean; mobile: boolean }[] = [
  { key: 'driver', label: 'Driver', default: true, mobile: true },
  { key: 'class', label: 'Class', default: true, mobile: true },
  { key: 'round', label: 'Rnd', default: true, mobile: false },
  { key: 'lane', label: 'Ln', default: true, mobile: false },
  { key: 'rt', label: 'RT', default: true, mobile: false },
  { key: 'et', label: '1320ft', default: true, mobile: true },
  { key: 'mph', label: '1320mph', default: true, mobile: true },
  { key: 'temp', label: 'Temp °F', default: true, mobile: false },
  { key: 'rh', label: 'RH%', default: true, mobile: false },
  { key: 'press', label: 'Press', default: true, mobile: false },
  { key: 'delta', label: 'Δs', default: true, mobile: false },
  { key: 'source', label: 'Source', default: true, mobile: false },
  { key: 'hpc', label: 'HPC', default: true, mobile: true },
  { key: 'corrEt', label: 'C.1320ft', default: true, mobile: true },
  { key: 'corrMph', label: 'C.1320mph', default: true, mobile: false },
];

const RW_DEFAULT_COLS = new Set(RW_ALL_COLUMNS.filter(c => c.default).map(c => c.key));

function RunsWeatherPanel({ raceLookup, onGoToAssignCombos }: { raceLookup: string; onGoToAssignCombos?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [runs, setRuns] = useState<CorrectedRun[]>([]);
  const [total, setTotal] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [classIndex, setClassIndex] = useState('');
  const [driverName, setDriverName] = useState('');
  const [showCorrected, setShowCorrected] = useState(true);
  const [viewMode, setViewMode] = useState<RWViewMode>('table');
  const [visibleCols, setVisibleCols] = useState<Set<RWColumn>>(RW_DEFAULT_COLS);
  const [showColToggle, setShowColToggle] = useState(false);
  const [page, setPage] = useState(0);
  const [missingComboCount, setMissingComboCount] = useState(0);
  const PAGE_SIZE = 100;

  const toggleCol = useCallback((col: RWColumn) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col); else next.add(col);
      return next;
    });
  }, []);

  const pagedRuns = useMemo(() => {
    const start = page * PAGE_SIZE;
    return runs.slice(start, start + PAGE_SIZE);
  }, [runs, page]);

  const doQuery = useCallback(async () => {
    if (raceLookup.length !== 8) { setError('Enter 8-digit YYYYMMDD'); return; }
    setLoading(true); setError('');
    try {
      const [rwRes, dcRes, ecRes, cdRes] = await Promise.all([
        parityApi.runsWithWeather({ raceLookup, windowMinutes, classIndex: classIndex || undefined, driverName: driverName || undefined, limit: 200 }),
        parityApi.listDriverCombos(),
        parityApi.listEngineCombos(),
        parityApi.listClassDefaults(),
      ]);
      setTotal(rwRes.total);
      setJoinedCount(rwRes.joinedCount);

      // Pre-index engine combos by id
      const ecMap = new Map(ecRes.combos.map(c => [c.id, c]));

      // Build ClassDefaultComboRow[] for the resolver
      const classDefaults: ClassDefaultComboRow[] = cdRes.classDefaults.map(cd => ({
        class_index: cd.class_index,
        engine_combo_id: cd.engine_combo_id,
        engine_combo_name: cd.engine_combo_name ?? `#${cd.engine_combo_id}`,
        effective_from_utc: cd.effective_from_utc,
        effective_to_utc: cd.effective_to_utc,
      }));

      // Cache weather results by (T,H,BP) key to avoid recomputing identical weather points
      const weatherCache = new Map<string, WeatherResult>();
      const getWeather = (T: number, H: number, BP: number): WeatherResult => {
        const key = `${T}|${H}|${BP}`;
        let w = weatherCache.get(key);
        if (!w) { w = computeWeather(T, H, BP); weatherCache.set(key, w); }
        return w;
      };

      let missingCount = 0;
      const corrected: CorrectedRun[] = rwRes.runs.map(r => {
        const cr: CorrectedRun = { ...r, _hpc: null, _hpcReason: null, _corr1320: null, _corrMph1320: null, _corr60: null, _corr330: null, _corr660: null, _corrMph660: null, _corr1000: null };
        if (!r.weather?.temp_f || !r.weather?.pressure_inhg) { cr._hpcReason = 'No weather data near run'; return cr; }

        const T = r.weather.temp_f;
        const H = pct_to_frac(r.weather.rh_pct ?? 0);
        const BP = r.weather.pressure_inhg;
        const w = getWeather(T, H, BP);

        // Resolve engine combo via priority resolver (driver combo → class default → none)
        const resolved = resolveEngineCombo({
          driverName: r.driver_name || '',
          classIndex: r.class_index || '',
          runTimestampUtc: r.run_timestamp_utc || '',
          driverCombos: dcRes.combos,
          classDefaults,
        });

        if (resolved.source === 'none') {
          cr._hpcReason = resolved.detail;
          missingCount++;
          return cr;
        }

        const ec = ecMap.get(resolved.engineComboId!);
        if (!ec) { cr._hpcReason = `Engine combo #${resolved.engineComboId} missing`; missingCount++; return cr; }

        const hpc = computeHPC({ engineCombo: ec.name, tPower: ec.t_power, dPower: ec.d_power, FF: ec.friction_factor, theta: w.theta, delta: w.delta });
        if (!hpc || !isFinite(hpc)) { cr._hpcReason = 'HPC non-finite'; return cr; }

        cr._hpc = hpc;
        cr._corr1320 = r.ft1320 != null ? correctET(r.ft1320, hpc) : null;
        cr._corrMph1320 = r.mph1320 != null ? correctMPH(r.mph1320, hpc) : null;
        cr._corr60 = r.ft60 != null ? correctET(r.ft60, hpc) : null;
        cr._corr330 = r.ft330 != null ? correctET(r.ft330, hpc) : null;
        cr._corr660 = r.ft660 != null ? correctET(r.ft660, hpc) : null;
        cr._corrMph660 = r.mph660 != null ? correctMPH(r.mph660, hpc) : null;
        cr._corr1000 = r.ft1000 != null ? correctET(r.ft1000, hpc) : null;
        return cr;
      });
      setMissingComboCount(missingCount);

      setRuns(corrected);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [raceLookup, windowMinutes, classIndex, driverName]);

  const exportCsv = useCallback(() => {
    if (runs.length === 0) return;
    const headers = ['Driver', 'Class', 'Round', 'Lane', 'RT', 'ft1320', 'mph1320',
      'Temp_F', 'RH%', 'Press_inHg', 'Weather_Delta_s', 'Weather_Timestamp_UTC', 'Weather_Source_Kind', 'Weather_Sample_Count',
      'HPC', 'HPC_Reason', 'Corr_1320ft', 'Corr_1320mph',
      'Corr_60ft', 'Corr_330ft', 'Corr_660ft', 'Corr_660mph', 'Corr_1000ft'];
    const rows = runs.map(r => [
      r.driver_name || '', r.class_index || '', r.round || '', r.lane || '',
      r.rt ?? '', r.ft1320 ?? '', r.mph1320 ?? '',
      r.weather?.temp_f ?? '', r.weather?.rh_pct ?? '', r.weather?.pressure_inhg ?? '',
      r.weather?.delta_seconds ?? '', r.weather?.timestamp_utc ?? '', r.weather?.canonical_source_kind ?? '', r.weather?.sample_count ?? '',
      r._hpc ?? '', r._hpcReason ?? '', r._corr1320 ?? '', r._corrMph1320 ?? '',
      r._corr60 ?? '', r._corr330 ?? '', r._corr660 ?? '', r._corrMph660 ?? '', r._corr1000 ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `runs_weather_${raceLookup}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [runs, raceLookup]);

  const stickyTh = { ...S.th, position: 'sticky' as const, top: 0, zIndex: 1, background: 'var(--color-surface, #1e1e2e)' };
  const corrTh = { ...stickyTh, borderLeft: '2px solid #16a34a' };
  const corrTd = { ...S.td, borderLeft: '2px solid #16a34a', color: '#4ade80', fontWeight: 600 as const };
  const corrTdN = { ...S.td, color: '#4ade80', fontWeight: 600 as const };

  const totalPages = Math.ceil(runs.length / PAGE_SIZE);

  const formatSourceKind = (kind: string | undefined) => {
    if (!kind) return '—';
    if (kind === 'open_meteo_backfill') return 'Open-Meteo';
    if (kind === 'csv_backfill') return 'CSV';
    if (kind === 'station') return 'Station';
    if (kind === 'mixed') return 'Mixed';
    return kind;
  };

  const SourceBadge = ({ r }: { r: CorrectedRun }) => {
    if (!r.weather?.canonical_source_kind) return <>{'—'}</>;
    return (
      <span
        className="parity-badge"
        style={{ background: r.weather.canonical_source_kind === 'mixed' ? '#f59e0b' : '#3b82f6' }}
        title={r.weather.canonical_source_detail || undefined}
        tabIndex={0}
        role="note"
        aria-label={`Source: ${formatSourceKind(r.weather.canonical_source_kind)}`}
      >
        {formatSourceKind(r.weather.canonical_source_kind)}
        {r.weather.sample_count > 1 && ` (${r.weather.sample_count})`}
      </span>
    );
  };

  const RunCard = ({ r }: { r: CorrectedRun }) => (
    <div className="parity-run-card" data-testid="parity-run-card">
      <div className="parity-run-card-header">
        <span>{r.driver_name || '—'} <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>{r.class_index || ''}</span></span>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>{r.round || ''} / {r.lane || ''}</span>
      </div>
      <div className="parity-run-card-grid">
        <div className="parity-run-card-field">
          <span className="parity-run-card-label">ET</span>
          <span className="parity-run-card-value">{formatET(r.ft1320)}</span>
        </div>
        <div className="parity-run-card-field">
          <span className="parity-run-card-label">MPH</span>
          <span className="parity-run-card-value">{formatMPH(r.mph1320)}</span>
        </div>
        {r.rt != null && <div className="parity-run-card-field">
          <span className="parity-run-card-label">RT</span>
          <span className="parity-run-card-value">{formatET(r.rt)}</span>
        </div>}
        {r.weather && <>
          <div className="parity-run-card-field">
            <span className="parity-run-card-label">Temp</span>
            <span className="parity-run-card-value">{formatTemp(r.weather.temp_f)}°F</span>
          </div>
          <div className="parity-run-card-field">
            <span className="parity-run-card-label">Source</span>
            <span><SourceBadge r={r} /></span>
          </div>
        </>}
        {showCorrected && r._hpc != null && <>
          <div className="parity-run-card-field">
            <span className="parity-run-card-label">HPC</span>
            <span className="parity-run-card-value">{r._hpc.toFixed(4)}</span>
          </div>
          <div className="parity-run-card-field">
            <span className="parity-run-card-label">Corr ET</span>
            <span className="parity-run-card-value" style={{ color: '#4ade80' }}>{formatET(r._corr1320)}</span>
          </div>
          <div className="parity-run-card-field">
            <span className="parity-run-card-label">Corr MPH</span>
            <span className="parity-run-card-value" style={{ color: '#4ade80' }}>{formatMPH(r._corrMph1320)}</span>
          </div>
        </>}
        {showCorrected && r._hpc == null && r._hpcReason && (
          <div className="parity-run-card-field" style={{ gridColumn: '1 / -1' }}>
            <span className="parity-run-card-label">HPC</span>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.7rem' }}>{r._hpcReason}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={S.card}>
      {/* ── Query Controls ── */}
      <div className="parity-form-row">
        <input style={S.input} placeholder="Class" value={classIndex} onChange={e => setClassIndex(e.target.value)} />
        <input style={{ ...S.inputWide, flex: '1 1 140px', minWidth: 0 }} placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)} />
        <label style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Window:
          <input style={{ ...S.input, width: 50, marginLeft: 4 }} type="number" value={windowMinutes}
            onChange={e => setWindowMinutes(Number(e.target.value))} /> min
        </label>
        <button style={S.btn('primary')} onClick={() => { setPage(0); doQuery(); }} disabled={loading}>
          {loading ? 'Loading...' : 'Query'}
        </button>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {/* ── Missing Combo Banner ── */}
      {runs.length > 0 && missingComboCount > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 6,
          padding: '0.5rem 0.75rem',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
        }}>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
            {missingComboCount} run{missingComboCount !== 1 ? 's' : ''} missing engine combo
          </span>
          <span style={{ color: 'var(--color-muted)' }}>— corrections unavailable</span>
          {onGoToAssignCombos && (
            <button
              style={{ ...S.btn('primary'), marginLeft: 'auto', fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
              onClick={onGoToAssignCombos}
            >
              Assign Combos
            </button>
          )}
        </div>
      )}

      {runs.length > 0 && (
        <>
          {/* ── Toolbar ── */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.75rem', marginRight: 'auto' }}>
              {runs.length} of {total} runs | {joinedCount} weather joined
              {showCorrected && ` | ${runs.filter(r => r._hpc != null).length} HPC`}
            </div>

            <div className="parity-view-toggle" data-testid="parity-view-toggle">
              <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}
                aria-label="Table view">Table</button>
              <button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}
                aria-label="Card view">Cards</button>
            </div>

            <button style={{ ...S.btn('secondary'), fontSize: '0.7rem' }}
              onClick={() => setShowColToggle(v => !v)} aria-expanded={showColToggle}>
              Columns
            </button>
            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={showCorrected} onChange={e => setShowCorrected(e.target.checked)} />
              Corrected
            </label>
            <button style={S.btn('secondary')} onClick={exportCsv}>Export CSV</button>
          </div>

          {/* ── Column Toggle Panel ── */}
          {showColToggle && (
            <div className="parity-col-toggle" data-testid="parity-col-toggle">
              {RW_ALL_COLUMNS.map(c => (
                <button key={c.key}
                  className={`parity-col-chip ${visibleCols.has(c.key) ? 'active' : ''}`}
                  onClick={() => toggleCol(c.key)}
                  aria-pressed={visibleCols.has(c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Table View ── */}
          {viewMode === 'table' && (
            <div className="parity-table-wrap">
              <table style={S.table}>
                <thead>
                  <tr>
                    {visibleCols.has('driver') && <th style={stickyTh}>Driver</th>}
                    {visibleCols.has('class') && <th style={stickyTh}>Class</th>}
                    {visibleCols.has('round') && <th style={stickyTh}>Rnd</th>}
                    {visibleCols.has('lane') && <th style={stickyTh}>Ln</th>}
                    {visibleCols.has('rt') && <th style={stickyTh}>RT</th>}
                    {visibleCols.has('et') && <th style={stickyTh}>1320ft</th>}
                    {visibleCols.has('mph') && <th style={stickyTh}>1320mph</th>}
                    {visibleCols.has('temp') && <th style={{ ...stickyTh, borderLeft: '2px solid var(--color-primary, #3b82f6)' }}>Temp °F</th>}
                    {visibleCols.has('rh') && <th style={stickyTh}>RH%</th>}
                    {visibleCols.has('press') && <th style={stickyTh}>Press</th>}
                    {visibleCols.has('delta') && <th style={stickyTh}>Δs</th>}
                    {visibleCols.has('source') && <th style={stickyTh}>Source</th>}
                    {showCorrected && visibleCols.has('hpc') && <th style={corrTh}>HPC</th>}
                    {showCorrected && visibleCols.has('corrEt') && <th style={{ ...stickyTh, color: '#4ade80' }}>C.1320ft</th>}
                    {showCorrected && visibleCols.has('corrMph') && <th style={{ ...stickyTh, color: '#4ade80' }}>C.1320mph</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagedRuns.map((r, i) => {
                    const stripe = i % 2 === 1 ? 'var(--color-bg, #262636)' : undefined;
                    return (
                      <tr key={r.uuid} style={{ background: stripe }}>
                        {visibleCols.has('driver') && <td style={S.td}>{r.driver_name || '—'}</td>}
                        {visibleCols.has('class') && <td style={S.td}>{r.class_index || '—'}</td>}
                        {visibleCols.has('round') && <td style={S.td}>{r.round || '—'}</td>}
                        {visibleCols.has('lane') && <td style={S.td}>{r.lane || '—'}</td>}
                        {visibleCols.has('rt') && <td style={S.td}>{formatET(r.rt)}</td>}
                        {visibleCols.has('et') && <td style={S.td}>{formatET(r.ft1320)}</td>}
                        {visibleCols.has('mph') && <td style={S.td}>{formatMPH(r.mph1320)}</td>}
                        {visibleCols.has('temp') && <td style={{ ...S.td, borderLeft: '2px solid var(--color-primary, #3b82f6)', fontWeight: 500 }}>
                          {formatTemp(r.weather?.temp_f)}
                        </td>}
                        {visibleCols.has('rh') && <td style={{ ...S.td, fontWeight: 500 }}>{formatRH(r.weather?.rh_pct)}</td>}
                        {visibleCols.has('press') && <td style={{ ...S.td, fontWeight: 500 }}>{formatBaro(r.weather?.pressure_inhg)}</td>}
                        {visibleCols.has('delta') && <td style={{ ...S.td, color: 'var(--color-muted)', fontSize: '0.7rem' }}>{r.weather ? `${r.weather.delta_seconds}s` : '—'}</td>}
                        {visibleCols.has('source') && <td style={{ ...S.td, fontSize: '0.7rem' }}><SourceBadge r={r} /></td>}
                        {showCorrected && visibleCols.has('hpc') && (
                          <td style={corrTd} title={r._hpcReason || undefined}>
                            {r._hpc != null ? r._hpc.toFixed(4) : <span style={{ color: 'var(--color-muted)', fontWeight: 400, fontSize: '0.7rem' }}>{r._hpcReason || '—'}</span>}
                          </td>
                        )}
                        {showCorrected && visibleCols.has('corrEt') && <td style={corrTdN}>{formatET(r._corr1320)}</td>}
                        {showCorrected && visibleCols.has('corrMph') && <td style={corrTdN}>{formatMPH(r._corrMph1320)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Card View ── */}
          {viewMode === 'card' && (
            <div className="parity-card-list">
              {pagedRuns.map(r => <RunCard key={r.uuid} r={r} />)}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button style={{ ...S.btn('secondary'), fontSize: '0.7rem' }} disabled={page === 0}
                onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button style={{ ...S.btn('secondary'), fontSize: '0.7rem' }} disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
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
  const isCorrected = metric === 'corrected_ft1320';
  const metricLabel = metric === 'mph1320' ? 'Top MPH' : isCorrected ? 'Corrected ET' : 'Best ET';
  const fmtVal = (v: number | null | undefined, d: number) => v != null ? v.toFixed(d) : '—';
  const valStr = metric === 'mph1320' ? `${fmtVal(row.value, 2)} MPH` : `${fmtVal(row.value, 3)} sec`;
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
      {isCorrected && row.actualValue != null && (
        <div>Actual ET: <b>{row.actualValue.toFixed(3)} sec</b></div>
      )}
      <div>Runs: <b>{row.runCount}</b>{isCorrected && row.correctedCount != null && ` (${row.correctedCount} corrected)`}</div>
    </div>
  );
}

function TrendsPanel() {
  // Chart controls
  const [classIndex, setClassIndex] = useState('TF');
  const [metric, setMetric] = useState<'mph1320' | 'ft1320' | 'corrected_ft1320'>('mph1320');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [includeDQ, setIncludeDQ] = useState(false);
  const [minRunCount, setMinRunCount] = useState(1);

  // Chart data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<TopByEventResponse | null>(null);

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
    const isCor = metric === 'corrected_ft1320';
    const ml = metric === 'mph1320' ? 'Top MPH' : isCor ? 'Corrected ET' : 'Best ET';
    const header = isCor
      ? `Race Lookup,Date,Event Name,Track,${ml},Actual ET,Run Count`
      : `Race Lookup,Date,Event Name,Track,${ml},Run Count`;
    const esc = (s: string | null) => s ? `"${s.replace(/"/g, '""')}"` : '';
    const fv = (v: number | null | undefined) => v != null ? String(v) : '';
    const lines = data.rows.map(r =>
      isCor
        ? `${r.raceLookup},${formatRaceLookup(r.raceLookup)},${esc(r.eventName)},${esc(r.trackName)},${fv(r.value)},${fv(r.actualValue)},${r.runCount}`
        : `${r.raceLookup},${formatRaceLookup(r.raceLookup)},${esc(r.eventName)},${esc(r.trackName)},${fv(r.value)},${r.runCount}`
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

  const metricLabel = metric === 'mph1320' ? 'Top MPH' : metric === 'corrected_ft1320' ? 'Corrected ET (sec)' : 'Best ET (sec)';
  const chartColor = metric === 'mph1320' ? '#2563eb' : metric === 'corrected_ft1320' ? '#8b5cf6' : '#16a34a';
  const isCorrectedMetric = metric === 'corrected_ft1320';

  return (
    <div>
      {/* ── Chart Controls ── */}
      <div style={S.card}>
        <div className="parity-form-row">
          <div className="parity-form-field">
            <label>Class</label>
            <select value={classIndex} onChange={e => setClassIndex(e.target.value)}
              style={{ width: 80 }}>
              {NHRA_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="parity-form-field">
            <label>Metric</label>
            <select value={metric} onChange={e => setMetric(e.target.value as any)}
              style={{ width: 165 }}>
              <option value="mph1320">Top MPH (1320)</option>
              <option value="ft1320">Best ET (1320)</option>
              <option value="corrected_ft1320">Corrected ET (1320)</option>
            </select>
          </div>
          <div className="parity-form-field">
            <label>From Year</label>
            <input style={{ width: 60 }} placeholder="YYYY" maxLength={4}
              value={startYear} onChange={e => setStartYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>
          <div className="parity-form-field">
            <label>To Year</label>
            <input style={{ width: 60 }} placeholder="YYYY" maxLength={4}
              value={endYear} onChange={e => setEndYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>
          <button style={{ ...S.btn('primary'), alignSelf: 'flex-end' }} onClick={loadChart} disabled={loading}>
            {loading ? 'Loading...' : 'Load Chart'}
          </button>
        </div>
        <div className="parity-form-row" style={{ marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeDQ} onChange={e => setIncludeDQ(e.target.checked)} />
            Include DQ
          </label>
          <div className="parity-form-field">
            <label>Min runs</label>
            <input type="number" min={1} max={500} style={{ width: 55 }}
              value={minRunCount} onChange={e => setMinRunCount(Math.max(1, parseInt(e.target.value, 10) || 1))} />
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', alignSelf: 'flex-end' }}>
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
                name={isCorrectedMetric ? 'Corrected ET' : metricLabel}
                connectNulls
              />
              {isCorrectedMetric && (
                <Line
                  type="monotone"
                  dataKey="actualValue"
                  stroke="#16a34a"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  dot={{ r: 2, fill: '#16a34a' }}
                  activeDot={{ r: 4 }}
                  name="Actual ET"
                  connectNulls
                />
              )}
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
                  {isCorrectedMetric && <th style={S.th}>Actual ET</th>}
                  <th style={S.th}>Runs</th>
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
                      {r.value != null ? (metric === 'mph1320' ? r.value.toFixed(2) : r.value.toFixed(3)) : '—'}
                    </td>
                    {isCorrectedMetric && (
                      <td style={{ ...S.td, color: '#16a34a' }}>
                        {r.actualValue != null ? r.actualValue.toFixed(3) : '—'}
                      </td>
                    )}
                    <td style={S.td}>{r.runCount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Backfill Panel ──────────────────────────────────────────────────────

function jobStatusColor(s: string): string {
  if (s === 'complete') return '#16a34a';
  if (s === 'running') return '#2563eb';
  if (s === 'error') return '#dc2626';
  if (s === 'cancelled' || s === 'paused') return '#6b7280';
  return '#6b7280';
}

function itemStatusColor(s: string): string {
  if (s === 'ok') return '#16a34a';
  if (s === 'skipped') return '#6b7280';
  if (s === 'no_data') return '#f59e0b';
  if (s === 'error') return '#dc2626';
  return '#9ca3af';
}

// ── Open-Meteo Provider UI Component ─────────────────────────────────────

type BackfillEvent = { id: number; event_name: string; track_id: number; track_name: string; timezone_iana: string; start_date_local: string; end_date_local: string; race_lookup: string | null; created_at: string };

function OpenMeteoProviderUI({
  event,
  onResult,
  onError,
}: {
  event: BackfillEvent;
  onResult: (result: { inserted: number; deduped: number; errorCount: number; errors: string[] }) => void;
  onError: (error: string) => void;
}) {
  const [startDate, setStartDate] = useState(event.start_date_local?.slice(0, 10) || '');
  const [endDate, setEndDate] = useState(event.end_date_local?.slice(0, 10) || '');
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<Array<{ timestampUtc: string; tempF: number; humidityPct: number; baroInHg: number }>>([]);

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      onError('Start and end dates are required');
      return;
    }

    setFetching(true);
    onError('');
    setPreview([]);

    try {
      const result = await parityApi.backfillWeatherProvider({
        eventId: event.id,
        trackId: event.track_id,
        provider: 'OPEN_METEO',
        startUtc: `${startDate}T00:00:00Z`,
        endUtc: `${endDate}T23:59:59Z`,
      });

      setPreview(result.preview || []);
      onResult({
        inserted: result.inserted,
        deduped: result.deduped,
        errorCount: result.errorCount,
        errors: result.errors,
      });
    } catch (e: any) {
      onError(e.message);
    }

    setFetching(false);
  };

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', background: 'var(--color-bg-alt, #2a2a3a)', marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Open-Meteo Historical Weather</div>
      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.75rem' }}>
        Fetches hourly weather data from Open-Meteo Archive API (free, no API key required).
        Data includes temperature, humidity, and barometric pressure.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#aaa' }}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', fontFamily: 'monospace' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#aaa' }}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', fontFamily: 'monospace' }}
          />
        </div>
        <div style={{ marginTop: '1.1rem' }}>
          <button
            onClick={handleFetch}
            disabled={fetching || !startDate || !endDate}
            style={{
              padding: '0.4rem 1rem',
              fontSize: '0.8rem',
              cursor: fetching ? 'wait' : 'pointer',
              background: 'var(--color-primary, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontWeight: 600,
            }}>
            {fetching ? 'Fetching...' : 'Fetch & Insert Weather'}
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Preview (first {preview.length} samples):
          </div>
          <div style={{ overflow: 'auto', maxHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.3rem' }}>Timestamp (UTC)</th>
                  <th style={{ textAlign: 'right', padding: '0.3rem' }}>Temp °F</th>
                  <th style={{ textAlign: 'right', padding: '0.3rem' }}>RH%</th>
                  <th style={{ textAlign: 'right', padding: '0.3rem' }}>Baro inHg</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.25rem 0.3rem', fontFamily: 'monospace' }}>{row.timestampUtc}</td>
                    <td style={{ padding: '0.25rem 0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{row.tempF.toFixed(1)}</td>
                    <td style={{ padding: '0.25rem 0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{row.humidityPct.toFixed(1)}</td>
                    <td style={{ padding: '0.25rem 0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{row.baroInHg.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Backfill Weather Panel ───────────────────────────────────────────────

function BackfillWeatherPanel() {
  const [provider, setProvider] = useState<string>('CUSTOM_CSV');
  const [events, setEvents] = useState<BackfillEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number>(0);
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<WeatherSampleRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; deduped: number; errorCount: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  // Load events for the selector
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await parityApi.listEvents();
        setEvents(r.events || []);
      } catch (e: any) { setError(e.message); }
      setLoading(false);
    })();
  }, []);

  const selectedEvent = events.find(e => e.id === selectedEventId) ?? null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      const { rows, errors } = parseCsvWeatherData(text);
      setParsedRows(rows);
      setParseErrors(errors);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleParseCsv = () => {
    const { rows, errors } = parseCsvWeatherData(csvText);
    setParsedRows(rows);
    setParseErrors(errors);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!selectedEvent || parsedRows.length === 0) return;
    setSubmitting(true); setError(''); setResult(null);
    try {
      const r = await parityApi.backfillWeatherCsv({
        eventId: selectedEvent.id,
        trackId: selectedEvent.track_id,
        rows: parsedRows.map(row => ({
          timestampUtc: row.timestampUtc,
          tempF: row.tempF,
          humidityPct: row.humidityPct,
          baroInHg: row.baroInHg,
        })),
      });
      setResult({ inserted: r.inserted, deduped: r.deduped, errorCount: r.errorCount, errors: r.errors });
    } catch (e: any) { setError(e.message); }
    setSubmitting(false);
  };

  const providerInfo = WEATHER_PROVIDERS.find(p => p.key === provider);

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem' }}>Backfill Weather (Historical)</h3>
      <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1rem' }}>
        Import historical weather data into parity_weather_samples. Select a provider and target event.
      </p>

      {error && <pre style={{ color: 'salmon', marginBottom: '0.5rem' }}>{error}</pre>}

      {/* Provider selector */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Provider:</label>
        {WEATHER_PROVIDERS.map(p => (
          <button key={p.key}
            onClick={() => setProvider(p.key)}
            disabled={!p.ready}
            style={{
              padding: '0.3rem 0.75rem', fontSize: '0.8rem', cursor: p.ready ? 'pointer' : 'not-allowed',
              background: provider === p.key ? 'var(--color-primary, #3b82f6)' : 'var(--color-bg-alt, #2a2a3a)',
              color: provider === p.key ? '#fff' : p.ready ? 'var(--color-text)' : '#666',
              border: '1px solid var(--color-border)', borderRadius: 4,
              opacity: p.ready ? 1 : 0.5,
            }}>
            {p.label}{!p.ready ? ' (TODO)' : ''}
          </button>
        ))}
      </div>

      {/* Event selector */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Target Event:</label>
        <select
          value={selectedEventId}
          onChange={e => { setSelectedEventId(Number(e.target.value)); setResult(null); }}
          style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', fontFamily: 'monospace', minWidth: 300 }}>
          <option value={0}>— Select an event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.start_date_local?.slice(0, 10)} — {ev.event_name} ({ev.track_name})
            </option>
          ))}
        </select>
        {loading && <span style={{ fontSize: '0.75rem', color: '#888' }}>Loading events...</span>}
      </div>

      {selectedEvent && (
        <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '1rem', fontFamily: 'monospace' }}>
          Event #{selectedEvent.id} | Track #{selectedEvent.track_id} ({selectedEvent.track_name})
          | {selectedEvent.start_date_local} \u2192 {selectedEvent.end_date_local}
        </div>
      )}

      {/* CUSTOM_CSV provider UI */}
      {provider === 'CUSTOM_CSV' && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', background: 'var(--color-bg-alt, #2a2a3a)', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>CSV Upload</div>
          <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem' }}>
            CSV columns: <code>timestampUtc, tempF, humidityPct, baroInHg</code><br />
            Header row is auto-detected and optional. Timestamps should be ISO 8601 or parseable date strings in UTC.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload}
              style={{ fontSize: '0.8rem' }} />
            <span style={{ color: '#888', fontSize: '0.75rem' }}>or paste below</span>
          </div>

          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder="timestampUtc,tempF,humidityPct,baroInHg&#10;2023-10-30T18:00:00Z,76.28,66,29.323"
            rows={6}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button onClick={handleParseCsv} style={{ padding: '0.3rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              Parse CSV
            </button>
            {parsedRows.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: '#4ade80' }}>
                ✓ {parsedRows.length} rows parsed
              </span>
            )}
            {parseErrors.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'salmon' }}>
                {parseErrors.length} parse error(s)
              </span>
            )}
          </div>

          {parseErrors.length > 0 && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'salmon' }}>Show parse errors</summary>
              <pre style={{ fontSize: '0.7rem', color: 'salmon', maxHeight: 150, overflow: 'auto', marginTop: '0.25rem' }}>
                {parseErrors.join('\n')}
              </pre>
            </details>
          )}

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Preview (first {Math.min(parsedRows.length, 10)} of {parsedRows.length} rows):
              </div>
              <div style={{ overflow: 'auto', maxHeight: 200 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.3rem' }}>Timestamp (UTC)</th>
                      <th style={{ textAlign: 'right', padding: '0.3rem' }}>Temp °F</th>
                      <th style={{ textAlign: 'right', padding: '0.3rem' }}>RH%</th>
                      <th style={{ textAlign: 'right', padding: '0.3rem' }}>Baro inHg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.25rem 0.3rem', fontFamily: 'monospace' }}>{row.timestampUtc}</td>
                        <td style={{ padding: '0.25rem 0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{row.tempF.toFixed(1)}</td>
                        <td style={{ padding: '0.25rem 0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{row.humidityPct.toFixed(1)}</td>
                        <td style={{ padding: '0.25rem 0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{row.baroInHg.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OPEN_METEO provider UI */}
      {provider === 'OPEN_METEO' && selectedEvent && (
        <OpenMeteoProviderUI
          event={selectedEvent}
          onResult={(r) => setResult({ inserted: r.inserted, deduped: r.deduped, errorCount: r.errorCount, errors: r.errors })}
          onError={(e) => setError(e)}
        />
      )}

      {/* Not-ready provider message */}
      {providerInfo && !providerInfo.ready && (
        <div style={{ border: '1px dashed var(--color-border)', borderRadius: 6, padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
          <strong>{providerInfo.label}</strong> is not yet implemented.<br />
          <span style={{ fontSize: '0.75rem' }}>See <code>src/domain/parity/weatherBackfill.ts</code> for implementation TODOs.</span>
        </div>
      )}

      {/* Submit button */}
      {provider === 'CUSTOM_CSV' && parsedRows.length > 0 && selectedEventId > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            padding: '0.5rem 1.5rem', fontSize: '0.9rem', cursor: submitting ? 'wait' : 'pointer',
            background: 'var(--color-primary, #3b82f6)', color: '#fff', border: 'none', borderRadius: 4,
            fontWeight: 600,
          }}>
          {submitting ? 'Uploading...' : `Upload ${parsedRows.length} Rows to Event #${selectedEventId}`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg-alt, #2a2a3a)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.25rem' }}>
            Upload Complete
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            Inserted: <b>{result.inserted}</b> | Deduped: <b>{result.deduped}</b> | Errors: <b>{result.errorCount}</b>
          </div>
          {result.errors.length > 0 && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'salmon' }}>Show server errors ({result.errors.length})</summary>
              <pre style={{ fontSize: '0.7rem', color: 'salmon', maxHeight: 150, overflow: 'auto', marginTop: '0.25rem' }}>
                {result.errors.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ── Backfill Panel ──────────────────────────────────────────────────────

function BackfillPanel() {
  const { can: canCap } = useCapabilities();
  const isAdmin = canCap('nhra.parity.admin' as any);

  // Job list
  const [jobs, setJobs] = useState<BackfillJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState('');

  // Selected job detail
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [detail, setDetail] = useState<BackfillStatusResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Start runs backfill
  const [runsYearStart, setRunsYearStart] = useState(String(new Date().getFullYear()));
  const [runsYearEnd, setRunsYearEnd] = useState(String(new Date().getFullYear()));
  const [startingRuns, setStartingRuns] = useState(false);

  // Start weather backfill
  const [weatherEventId, setWeatherEventId] = useState('');
  const [startingWeather, setStartingWeather] = useState(false);

  // General
  const [actionError, setActionError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const loadJobs = useCallback(async () => {
    setJobsLoading(true); setJobsError('');
    try {
      const res = await parityApi.backfillJobs();
      setJobs(res.jobs);
    } catch (e: any) { setJobsError(e.message); }
    setJobsLoading(false);
  }, []);

  const loadDetail = useCallback(async (jobId: number) => {
    setDetailLoading(true);
    try {
      const res = await parityApi.backfillStatus(jobId);
      setDetail(res);
      setSelectedJobId(jobId);
    } catch (e: any) { setActionError(e.message); }
    setDetailLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const startRuns = useCallback(async () => {
    setStartingRuns(true); setActionError(''); setActionMsg('');
    try {
      const res = await parityApi.startBackfillRuns({
        yearStart: parseInt(runsYearStart, 10),
        yearEnd: parseInt(runsYearEnd, 10),
      });
      setActionMsg(`Runs backfill job #${res.job.id} ${res.job.status} — ${res.job.completedCount}/${res.job.totalItems} complete`);
      loadJobs();
      loadDetail(res.job.id);
    } catch (e: any) { setActionError(e.message); }
    setStartingRuns(false);
  }, [runsYearStart, runsYearEnd, loadJobs, loadDetail]);

  const startWeather = useCallback(async () => {
    const eid = parseInt(weatherEventId, 10);
    if (!eid) { setActionError('Enter a valid event ID'); return; }
    setStartingWeather(true); setActionError(''); setActionMsg('');
    try {
      const res = await parityApi.startBackfillWeather({ eventId: eid });
      setActionMsg(`Weather backfill job #${res.job.id} ${res.job.status} — ${res.job.completedCount}/${res.job.totalItems} complete`);
      loadJobs();
      loadDetail(res.job.id);
    } catch (e: any) { setActionError(e.message); }
    setStartingWeather(false);
  }, [weatherEventId, loadJobs, loadDetail]);

  const doResume = useCallback(async (jobId: number) => {
    setActionError(''); setActionMsg('');
    try {
      const res = await parityApi.resumeBackfill(jobId);
      setActionMsg(`Job #${jobId} resumed → ${res.job.status}`);
      loadJobs();
      loadDetail(jobId);
    } catch (e: any) { setActionError(e.message); }
  }, [loadJobs, loadDetail]);

  const doCancel = useCallback(async (jobId: number) => {
    setActionError(''); setActionMsg('');
    try {
      await parityApi.cancelBackfill(jobId);
      setActionMsg(`Job #${jobId} cancelled`);
      loadJobs();
      if (selectedJobId === jobId) loadDetail(jobId);
    } catch (e: any) { setActionError(e.message); }
  }, [loadJobs, loadDetail, selectedJobId]);

  if (!isAdmin) {
    return <div style={S.hint}>Backfill jobs require admin/owner role.</div>;
  }

  return (
    <div>
      {/* ── Start Backfill ── */}
      <div style={{ ...S.card, borderColor: '#f59e0b', borderWidth: 2 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Start Backfill Job</h3>

        <div style={S.row}>
          <b style={{ fontSize: '0.8rem' }}>Runs:</b>
          <input style={{ ...S.input, width: 55 }} placeholder="From" value={runsYearStart}
            onChange={e => setRunsYearStart(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <span style={{ fontSize: '0.8rem' }}>–</span>
          <input style={{ ...S.input, width: 55 }} placeholder="To" value={runsYearEnd}
            onChange={e => setRunsYearEnd(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <button style={S.btn('primary')} onClick={startRuns} disabled={startingRuns}>
            {startingRuns ? 'Starting...' : 'Start Runs Backfill'}
          </button>
        </div>

        <div style={S.row}>
          <b style={{ fontSize: '0.8rem' }}>Weather:</b>
          <input style={{ ...S.input, width: 55 }} placeholder="Event ID" value={weatherEventId}
            onChange={e => setWeatherEventId(e.target.value.replace(/\D/g, ''))} />
          <button style={S.btn('primary')} onClick={startWeather} disabled={startingWeather}>
            {startingWeather ? 'Starting...' : 'Start Weather Backfill'}
          </button>
        </div>

        {actionMsg && <div style={{ ...S.hint, background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>{actionMsg}</div>}
        {actionError && <div style={S.error}>{actionError}</div>}
      </div>

      {/* ── Job List ── */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Recent Jobs</h3>
          <button style={S.btn('secondary')} onClick={loadJobs} disabled={jobsLoading}>
            {jobsLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {jobsError && <div style={S.error}>{jobsError}</div>}
        {jobs.length === 0 && !jobsLoading && <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>No backfill jobs yet.</div>}
        {jobs.length > 0 && (
          <div style={{ maxHeight: 250, overflow: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th><th style={S.th}>Type</th><th style={S.th}>Status</th>
                  <th style={S.th}>Progress</th><th style={S.th}>Errors</th>
                  <th style={S.th}>Current</th><th style={S.th}>Created</th><th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} style={{ cursor: 'pointer', background: selectedJobId === j.id ? 'var(--color-bg)' : undefined }}
                    onClick={() => loadDetail(j.id)}>
                    <td style={S.td}>{j.id}</td>
                    <td style={S.td}>{j.type}</td>
                    <td style={S.td}><span style={S.badge(jobStatusColor(j.status))}>{j.status}</span></td>
                    <td style={S.td}>{j.completedCount + j.skippedCount + j.noDataCount}/{j.totalItems}</td>
                    <td style={S.td}>{j.errorCount > 0 ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{j.errorCount}</span> : '0'}</td>
                    <td style={{ ...S.td, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.currentItemKey || '—'}</td>
                    <td style={{ ...S.td, fontSize: '0.7rem' }}>{j.createdAt?.slice(0, 16)}</td>
                    <td style={S.td}>
                      {(j.status === 'error' || j.status === 'paused' || j.status === 'cancelled') && (
                        <button style={{ ...S.btn('primary'), fontSize: '0.65rem', padding: '0.15rem 0.4rem', marginRight: 4 }}
                          onClick={e => { e.stopPropagation(); doResume(j.id); }}>Resume</button>
                      )}
                      {j.status === 'running' && (
                        <button style={{ ...S.btn('danger'), fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                          onClick={e => { e.stopPropagation(); doCancel(j.id); }}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Job Detail ── */}
      {detail && (
        <div style={S.card}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Job #{detail.job.id} — {detail.job.type} — <span style={S.badge(jobStatusColor(detail.job.status))}>{detail.job.status}</span>
          </h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={S.stat}>Total: <b>{detail.job.totalItems}</b></span>
            <span style={S.stat}>OK: <b>{detail.job.completedCount}</b></span>
            <span style={S.stat}>Skipped: <b>{detail.job.skippedCount}</b></span>
            <span style={S.stat}>No Data: <b>{detail.job.noDataCount}</b></span>
            <span style={S.stat}>Errors: <b>{detail.job.errorCount}</b></span>
          </div>
          {detail.job.lastError && (
            <div style={{ ...S.error, marginBottom: '0.5rem' }}>Last error: {detail.job.lastError}</div>
          )}
          <div style={{ display: 'flex', gap: 4, marginBottom: '0.5rem' }}>
            <button style={S.btn('secondary')} onClick={() => loadDetail(detail.job.id)} disabled={detailLoading}>
              {detailLoading ? '...' : 'Refresh'}
            </button>
            {(detail.job.status === 'error' || detail.job.status === 'paused' || detail.job.status === 'cancelled') && (
              <button style={S.btn('primary')} onClick={() => doResume(detail.job.id)}>Resume</button>
            )}
            {detail.job.status === 'running' && (
              <button style={S.btn('danger')} onClick={() => doCancel(detail.job.id)}>Cancel</button>
            )}
          </div>
          <div style={{ maxHeight: 350, overflow: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Item</th><th style={S.th}>Status</th><th style={S.th}>Tries</th>
                  <th style={S.th}>HTTP</th><th style={S.th}>Fetched</th><th style={S.th}>Inserted</th>
                  <th style={S.th}>Deduped</th><th style={S.th}>Error</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it, i) => (
                  <tr key={it.item_key} style={{ background: i % 2 === 1 ? 'var(--color-bg)' : undefined }}>
                    <td style={S.td}>{it.item_key}</td>
                    <td style={S.td}><span style={S.badge(itemStatusColor(it.status))}>{it.status}</span></td>
                    <td style={S.td}>{it.attempts}</td>
                    <td style={S.td}>{it.last_http_status || '—'}</td>
                    <td style={S.td}>{it.rows_fetched}</td>
                    <td style={S.td}>{it.rows_inserted}</td>
                    <td style={S.td}>{it.rows_deduped}</td>
                    <td style={{ ...S.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>
                      {it.last_error || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Time / Weather Diagnostics Panel (Admin) ────────────────────────────

const DIAG_CLASSES = ['TF', 'FC', 'PRO', 'PSM', 'PM', 'TAD', 'TAFC'];

function TimeDiagnosticsPanel({ event }: { event: EventWithStats | null }) {
  const [classFilter, setClassFilter] = useState(DIAG_CLASSES[0]);
  const [data, setData] = useState<TimeDiagnosticsSampleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUtc, setShowUtc] = useState(false);

  const load = useCallback(() => {
    if (!event) return;
    setLoading(true); setError('');
    parityApi.timeDiagnosticsSample({ eventId: event.id, classIndex: classFilter, limit: 20 })
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [event, classFilter]);

  useEffect(() => { load(); }, [load]);

  if (!event) return <p style={S.hint}>Select an event above.</p>;

  const warn = data && ((data.avgOffsetMin != null && data.avgOffsetMin > 20) || (data.maxOffsetMin != null && data.maxOffsetMin > 60));

  return (
    <div style={S.card}>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Time / Weather Diagnostics</h3>
      <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', margin: '0 0 0.5rem' }}>
        Shows per-run timestamp vs. matched weather observation. Large offsets indicate a timezone bug.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Class:</label>
        {DIAG_CLASSES.map(c => (
          <button key={c} onClick={() => setClassFilter(c)}
            style={{ ...S.btn(classFilter === c ? 'primary' : 'secondary'), fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
            {c}
          </button>
        ))}
        <label style={{ fontSize: '0.65rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--color-muted)' }}>
          <input type="checkbox" checked={showUtc} onChange={e => setShowUtc(e.target.checked)} />
          Show UTC columns
        </label>
      </div>

      {loading && <p style={S.hint}>Loading...</p>}
      {error && <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>{error}</p>}

      {data && !loading && (
        <>
          {/* Confidence summary */}
          <div style={{
            display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.4rem 0.6rem', marginBottom: '0.5rem',
            borderRadius: 4, fontSize: '0.7rem',
            background: warn ? '#fef2f2' : 'var(--color-bg)',
            border: warn ? '1px solid #fca5a5' : '1px solid var(--color-border)',
            color: warn ? '#991b1b' : 'var(--color-text)',
          }}>
            <span><b>Track TZ:</b> {data.trackTimezone}</span>
            <span><b>Runs:</b> {data.totalRuns}</span>
            <span><b>Matched:</b> {data.pctMatched != null ? `${data.pctMatched}%` : '—'} ({data.matchedRuns}/{data.totalRuns})</span>
            <span><b>Avg Offset:</b> {data.avgOffsetMin != null ? `${data.avgOffsetMin} min` : '—'}</span>
            <span><b>Max Offset:</b> {data.maxOffsetMin != null ? `${data.maxOffsetMin} min` : '—'}</span>
            {warn && <span style={{ fontWeight: 700, color: '#dc2626' }}>⚠ Timezone mismatch likely</span>}
          </div>

          {/* Sample rows */}
          {data.samples.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead><tr>
                  <th style={S.th}>Driver</th>
                  <th style={S.th}>Rnd</th>
                  <th style={S.th}>Local Time</th>
                  {showUtc && <th style={S.th}>UTC</th>}
                  {showUtc && <th style={S.th}>Matched Wx UTC</th>}
                  <th style={{ ...S.th, textAlign: 'right' }}>Offset (min)</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Temp °F</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>RH %</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Baro</th>
                </tr></thead>
                <tbody>
                  {data.samples.map((s, i) => {
                    const offsetBad = s.offset_minutes != null && s.offset_minutes > 30;
                    return (
                      <tr key={i} style={{ background: s.matched_weather_utc == null ? '#fef2f218' : offsetBad ? '#fef2f230' : 'transparent' }}>
                        <td style={{ ...S.td, fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.driver ?? '—'}</td>
                        <td style={S.td}>{s.round ?? '—'}</td>
                        <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.65rem' }}>{s.run_time_local ?? <span style={{ color: '#dc2626' }}>MISSING</span>}</td>
                        {showUtc && <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--color-muted)' }}>{s.run_timestamp_utc ?? '—'}</td>}
                        {showUtc && <td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--color-muted)' }}>{s.matched_weather_utc ?? '—'}</td>}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', color: offsetBad ? '#dc2626' : undefined, fontWeight: offsetBad ? 700 : 400 }}>
                          {s.offset_minutes != null ? s.offset_minutes.toFixed(1) : '—'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.wx_temp_f != null ? s.wx_temp_f.toFixed(1) : '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.wx_rh_pct != null ? s.wx_rh_pct.toFixed(1) : '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.wx_press_inhg != null ? s.wx_press_inhg.toFixed(3) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={S.hint}>No runs found for {classFilter} at this event.</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Weather Health Panel (Admin) ─────────────────────────────────────────

function WeatherHealthPanel({ events, selectedEvent }: { events: EventWithStats[]; selectedEvent: EventWithStats | null }) {
  const [eventId, setEventId] = useState<number | null>(selectedEvent?.id ?? null);
  const [coverage, setCoverage] = useState<WeatherCoverageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Coords editing
  const [editLat, setEditLat] = useState('');
  const [editLon, setEditLon] = useState('');
  const [coordsSaving, setCoordsSaving] = useState(false);

  useEffect(() => {
    if (selectedEvent) setEventId(selectedEvent.id);
  }, [selectedEvent]);

  const loadCoverage = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError('');
    setCoverage(null);
    try {
      const res = await parityApi.weatherCoverage(eventId);
      setCoverage(res);
      setEditLat(res.trackLat?.toString() ?? '');
      setEditLon(res.trackLon?.toString() ?? '');
    } catch (e: any) {
      setError(e.message || 'Failed to load coverage');
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { if (eventId) loadCoverage(); }, [eventId, loadCoverage]);

  const doBackfill = async (missingOnly: boolean) => {
    if (!eventId) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await parityApi.weatherHealthBackfill({ eventId, missingOnly });
      if (res.skipped) {
        setActionMsg(`Skipped — ${res.message}`);
      } else {
        setActionMsg(`Backfill: ${res.inserted} inserted, ${res.deduped} deduped, ${res.canonicalRebuilt ?? 0} canonical rebuilt`);
      }
      loadCoverage();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message}`);
    }
    setActionLoading(false);
  };

  const doRebuild = async () => {
    if (!eventId) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await parityApi.weatherHealthRebuild(eventId);
      setActionMsg(`Rebuilt ${res.bucketsProcessed} buckets — station: ${res.stationUsed}, backup: ${res.backupUsed}, suspect: ${res.suspectCount}`);
      loadCoverage();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message}`);
    }
    setActionLoading(false);
  };

  const doSaveCoords = async () => {
    if (!coverage) return;
    const lat = parseFloat(editLat);
    const lon = parseFloat(editLon);
    if (isNaN(lat) || isNaN(lon)) { setActionMsg('Invalid lat/lon'); return; }
    setCoordsSaving(true);
    try {
      // We need the track_id — derive from coverage data (look up event)
      const ev = events.find(e => e.id === eventId);
      if (!ev) { setActionMsg('Event not found'); setCoordsSaving(false); return; }
      await parityApi.updateTrackCoords({ trackId: ev.track_id, latitude: lat, longitude: lon });
      setActionMsg(`Saved coordinates: ${lat}, ${lon}`);
      loadCoverage();
    } catch (e: any) {
      setActionMsg(`Error: ${e.message}`);
    }
    setCoordsSaving(false);
  };

  const coveragePctColor = (pct: number | null) => {
    if (pct === null) return '#888';
    if (pct >= 95) return '#22c55e';
    if (pct >= 80) return '#eab308';
    if (pct >= 50) return '#f97316';
    return '#ef4444';
  };

  return (
    <div>
      <h2 style={{ ...S.h1, fontSize: '1.1rem' }}>Weather Health</h2>
      <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.75rem' }}>
        Audit weather coverage per event. Backfill missing data from Open-Meteo and rebuild canonical.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <select value={eventId ?? ''} onChange={e => setEventId(Number(e.target.value) || null)} style={S.input}>
          <option value="">— Select Event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.event_name} ({ev.start_date_local})</option>
          ))}
        </select>
        <button style={S.btn('secondary')} onClick={loadCoverage} disabled={loading || !eventId}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{error}</div>}
      {actionMsg && <div style={{ color: '#3b82f6', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{actionMsg}</div>}

      {coverage && (
        <div>
          {/* Coverage Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ ...S.card, padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Run Coverage</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: coveragePctColor(coverage.coveragePct) }}>
                {coverage.coveragePct !== null ? `${coverage.coveragePct}%` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                {coverage.runsCovered}/{coverage.runCount} runs within ±{coverage.windowMinutes}min
              </div>
            </div>
            <div style={{ ...S.card, padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Canonical Points</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{coverage.canonicalCount}</div>
              <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                Largest gap: {coverage.largestGapMinutes > 0 ? `${coverage.largestGapMinutes} min` : '—'}
              </div>
            </div>
            <div style={{ ...S.card, padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Total Samples</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{coverage.totalSamples}</div>
              <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                {Object.entries(coverage.samplesBySource).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}
              </div>
            </div>
            <div style={{ ...S.card, padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Track Coords</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: coverage.hasTrackCoords ? '#22c55e' : '#ef4444' }}>
                {coverage.hasTrackCoords ? '✓ Set' : '✗ Missing'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
                {coverage.trackLat && coverage.trackLon ? `${coverage.trackLat}, ${coverage.trackLon}` : 'Needed for backup fetch'}
              </div>
            </div>
          </div>

          {/* Canonical source breakdown */}
          {Object.keys(coverage.canonicalBySource).length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Canonical Source Breakdown</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Object.entries(coverage.canonicalBySource).map(([source, count]) => (
                  <span key={source} style={{
                    ...S.badge(source.includes('suspect') ? '#f97316' : source === 'backup' ? '#3b82f6' : '#22c55e'),
                    fontSize: '0.75rem',
                  }}>
                    {source}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Track Coordinates Editor */}
          <div style={{ ...S.card, padding: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Track Coordinates</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.8rem' }}>Lat:</label>
              <input style={{ ...S.input, width: 110 }} value={editLat} onChange={e => setEditLat(e.target.value)} placeholder="e.g. 33.387" />
              <label style={{ fontSize: '0.8rem' }}>Lon:</label>
              <input style={{ ...S.input, width: 110 }} value={editLon} onChange={e => setEditLon(e.target.value)} placeholder="e.g. -112.375" />
              <button style={S.btn('primary')} onClick={doSaveCoords} disabled={coordsSaving}>
                {coordsSaving ? 'Saving...' : 'Save Coords'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ ...S.card, padding: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Repair Actions</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button style={S.btn('primary')} onClick={() => doBackfill(true)} disabled={actionLoading || !coverage.hasTrackCoords}>
                {actionLoading ? 'Working...' : 'Backfill Missing (Open-Meteo)'}
              </button>
              <button style={S.btn('secondary')} onClick={() => doBackfill(false)} disabled={actionLoading || !coverage.hasTrackCoords}>
                Force Backfill
              </button>
              <button style={S.btn('secondary')} onClick={doRebuild} disabled={actionLoading}>
                Rebuild Canonical
              </button>
            </div>
            {!coverage.hasTrackCoords && (
              <p style={{ fontSize: '0.75rem', color: '#f97316', marginTop: '0.3rem' }}>
                Set track coordinates above before backfilling from Open-Meteo.
              </p>
            )}
          </div>

          {/* Time Range Info */}
          <div style={{ fontSize: '0.75rem', color: '#888' }}>
            <strong>Event:</strong> {coverage.eventName} @ {coverage.trackName} &nbsp;|&nbsp;
            <strong>Local:</strong> {coverage.startLocal} → {coverage.endLocal} &nbsp;|&nbsp;
            <strong>UTC:</strong> {coverage.startUtc} → {coverage.endUtc}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Station CSV Import Panel (Admin) ─────────────────────────────────────

function StationCsvImportPanel() {
  const [rows, setRows] = useState<StationCsvImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [bufferHours, setBufferHours] = useState(12);
  const [source, setSource] = useState('station_csv_2025');
  const [rebuildCanonical, setRebuildCanonical] = useState(true);

  const [previewResult, setPreviewResult] = useState<StationCsvImportResponse | null>(null);
  const [importResult, setImportResult] = useState<StationCsvImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // CSV parsing on file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    setParseErrors([]);
    setPreviewResult(null);
    setImportResult(null);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) { setError('Empty file'); return; }
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setError('CSV must have header + data rows'); return; }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim());
      const tsIdx = header.findIndex(h => /utc.*time/i.test(h) || /timestamp/i.test(h));
      const tempIdx = header.findIndex(h => /temp/i.test(h));
      const humIdx = header.findIndex(h => /humid/i.test(h));
      const pressIdx = header.findIndex(h => /press/i.test(h));

      if (tsIdx < 0 || tempIdx < 0 || humIdx < 0 || pressIdx < 0) {
        setError(`Could not find required columns. Found headers: ${header.join(', ')}. Need: UTC_Timestamp, Temperature, Humidity, Pressure_Uncorrected`);
        return;
      }

      const parsed: StationCsvImportRow[] = [];
      const errs: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const ts = cols[tsIdx];
        const temp = parseFloat(cols[tempIdx]);
        const hum = parseFloat(cols[humIdx]);
        const press = parseFloat(cols[pressIdx]);

        if (!ts || isNaN(temp) || isNaN(hum) || isNaN(press)) {
          errs.push(`Row ${i + 1}: invalid data (ts=${ts}, temp=${cols[tempIdx]}, hum=${cols[humIdx]}, press=${cols[pressIdx]})`);
          continue;
        }

        // Normalize timestamp to ISO UTC format
        let isoTs = ts;
        if (/^\d{4}-\d{2}-\d{2}T/.test(ts)) {
          isoTs = ts.replace(/Z$/, '');
        } else if (/^\d{4}-\d{2}-\d{2} /.test(ts)) {
          isoTs = ts;
        } else {
          // Try to parse with Date
          const d = new Date(ts);
          if (isNaN(d.getTime())) {
            errs.push(`Row ${i + 1}: unparseable timestamp "${ts}"`);
            continue;
          }
          isoTs = d.toISOString().replace('Z', '').replace('T', ' ').slice(0, 19);
        }

        parsed.push({ timestampUtc: isoTs, tempF: temp, humidityPct: hum, pressureHpa: press });
      }

      setRows(parsed);
      setParseErrors(errs);
    };
    reader.readAsText(file);
  };

  const doPreview = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError('');
    setPreviewResult(null);
    setImportResult(null);
    try {
      const res = await parityApi.importStationCsv({
        rows,
        bufferHours,
        source,
        rebuildCanonical: false,
        previewOnly: true,
      });
      setPreviewResult(res);
    } catch (e: any) {
      setError(e.message || 'Preview failed');
    }
    setLoading(false);
  };

  const doImport = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError('');
    setImportResult(null);
    try {
      const res = await parityApi.importStationCsv({
        rows,
        bufferHours,
        source,
        rebuildCanonical,
        previewOnly: false,
      });
      setImportResult(res);
    } catch (e: any) {
      setError(e.message || 'Import failed');
    }
    setLoading(false);
  };

  const result = importResult || previewResult;

  return (
    <div>
      <h2 style={{ ...S.h1, fontSize: '1.1rem' }}>Import Station CSV</h2>
      <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.75rem' }}>
        Upload a traveling weather station CSV. Rows are mapped to events by UTC timestamp (no lat/lon).
        Station data overrides backup (Open-Meteo) during canonical rebuild.
      </p>

      {/* File Upload */}
      <div style={{ ...S.card, padding: '0.75rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>1. Select CSV File</h3>
        <input type="file" accept=".csv,.txt" onChange={handleFileChange} style={{ fontSize: '0.85rem' }} />
        {fileName && (
          <span style={{ fontSize: '0.8rem', color: '#aaa', marginLeft: '0.5rem' }}>
            {fileName} — {rows.length} rows parsed
            {parseErrors.length > 0 && <span style={{ color: '#f97316' }}>, {parseErrors.length} errors</span>}
          </span>
        )}
        {parseErrors.length > 0 && (
          <details style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#f97316' }}>
            <summary>{parseErrors.length} parse errors (click to expand)</summary>
            <div style={{ maxHeight: 150, overflow: 'auto', marginTop: '0.25rem' }}>
              {parseErrors.slice(0, 50).map((e, i) => <div key={i}>{e}</div>)}
              {parseErrors.length > 50 && <div>...and {parseErrors.length - 50} more</div>}
            </div>
          </details>
        )}
      </div>

      {/* Settings */}
      {rows.length > 0 && (
        <div style={{ ...S.card, padding: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>2. Import Settings</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Buffer Hours</label>
              <input
                type="number" min={0} max={48} value={bufferHours}
                onChange={e => setBufferHours(Math.max(0, Math.min(48, Number(e.target.value))))}
                style={{ ...S.input, width: 80 }}
              />
              <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: '0.3rem' }}>
                Extends event windows by ±N hours
              </span>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Source Tag</label>
              <input
                value={source} onChange={e => setSource(e.target.value)}
                style={{ ...S.input, width: 180 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '1rem' }}>
              <input type="checkbox" checked={rebuildCanonical} onChange={e => setRebuildCanonical(e.target.checked)} id="rebuildCheck" />
              <label htmlFor="rebuildCheck" style={{ fontSize: '0.8rem' }}>Rebuild canonical after import</label>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button style={S.btn('secondary')} onClick={doPreview} disabled={loading}>
            {loading && !importResult ? 'Previewing...' : 'Preview Mapping'}
          </button>
          <button style={S.btn('primary')} onClick={doImport} disabled={loading || !previewResult}>
            {loading && importResult === null && previewResult ? 'Importing...' : `Import ${rows.length} Rows${rebuildCanonical ? ' + Rebuild' : ''}`}
          </button>
        </div>
      )}

      {error && <div style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '0.85rem' }}>{error}</div>}

      {/* Results */}
      {result && (
        <div>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ ...S.card, padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Rows Parsed</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{result.rowsParsed}</div>
            </div>
            <div style={{ ...S.card, padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Mapped to Events</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e' }}>{result.rowsMapped}</div>
            </div>
            <div style={{ ...S.card, padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Unmapped</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: result.rowsUnmapped > 0 ? '#f97316' : '#22c55e' }}>{result.rowsUnmapped}</div>
            </div>
            {result.inserted !== undefined && (
              <div style={{ ...S.card, padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Inserted</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#3b82f6' }}>{result.inserted}</div>
              </div>
            )}
            {result.deduped !== undefined && (
              <div style={{ ...S.card, padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Deduped</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{result.deduped}</div>
              </div>
            )}
          </div>

          {/* Events Affected */}
          {result.eventsAffected.length > 0 && (
            <div style={{ ...S.card, padding: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Events Affected ({result.eventsAffected.length})</h3>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {result.eventsAffected.map((name, i) => (
                  <span key={i} style={{ ...S.badge('#3b82f6'), fontSize: '0.75rem' }}>{name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Rebuild Results */}
          {result.rebuildResults && Object.keys(result.rebuildResults).length > 0 && (
            <div style={{ ...S.card, padding: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>Canonical Rebuild Results</h3>
              <div style={{ fontSize: '0.8rem' }}>
                {Object.entries(result.rebuildResults).map(([eid, r]) => (
                  <div key={eid} style={{ marginBottom: '0.2rem' }}>
                    <strong>Event {eid}:</strong>{' '}
                    {r.ok ? (
                      <span style={{ color: '#22c55e' }}>{r.bucketsProcessed} buckets rebuilt</span>
                    ) : (
                      <span style={{ color: '#ef4444' }}>Error: {r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {result.preview.length > 0 && (
            <div style={{ ...S.card, padding: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                Mapped Preview (first {Math.min(result.preview.length, 50)} rows)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                      <th style={{ padding: '0.3rem', textAlign: 'left' }}>Row</th>
                      <th style={{ padding: '0.3rem', textAlign: 'left' }}>Timestamp (UTC)</th>
                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>Temp °F</th>
                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>Hum %</th>
                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>Press hPa</th>
                      <th style={{ padding: '0.3rem', textAlign: 'left' }}>Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.slice(0, 50).map((r: StationCsvMappedRow, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '0.3rem' }}>{r.row}</td>
                        <td style={{ padding: '0.3rem' }}>{r.timestampUtc}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right' }}>{r.tempF.toFixed(1)}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right' }}>{r.humidityPct.toFixed(1)}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right' }}>{r.pressureHpa.toFixed(1)}</td>
                        <td style={{ padding: '0.3rem' }}>{r.eventName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unmapped Examples */}
          {result.unmappedExamples.length > 0 && (
            <div style={{ ...S.card, padding: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '0.3rem', color: '#f97316' }}>
                Unmapped Rows (examples — {result.rowsUnmapped} total)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333' }}>
                      <th style={{ padding: '0.3rem', textAlign: 'left' }}>Row</th>
                      <th style={{ padding: '0.3rem', textAlign: 'left' }}>Timestamp (UTC)</th>
                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>Temp °F</th>
                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>Hum %</th>
                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>Press hPa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.unmappedExamples.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '0.3rem' }}>{r.row}</td>
                        <td style={{ padding: '0.3rem' }}>{r.timestampUtc}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right' }}>{r.tempF.toFixed(1)}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right' }}>{r.humidityPct.toFixed(1)}</td>
                        <td style={{ padding: '0.3rem', textAlign: 'right' }}>{r.pressureHpa.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Parse Error Examples */}
          {result.parseErrorExamples.length > 0 && (
            <details style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
              <summary style={{ color: '#f97316', cursor: 'pointer' }}>
                {result.parseErrors} parse errors from server
              </summary>
              <div style={{ marginTop: '0.3rem' }}>
                {result.parseErrorExamples.map((e, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: '#f97316' }}>
                    Row {e.row}: {e.reason} (ts: {e.ts})
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Import Error Examples */}
          {result.insertErrorExamples && result.insertErrorExamples.length > 0 && (
            <details style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
              <summary style={{ color: '#ef4444', cursor: 'pointer' }}>
                {result.insertErrors} insert errors
              </summary>
              <div style={{ marginTop: '0.3rem' }}>
                {result.insertErrorExamples.map((e, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', color: '#ef4444' }}>{e}</div>
                ))}
              </div>
            </details>
          )}

          {/* Preview-only banner */}
          {result.previewOnly && (
            <div style={{ ...S.card, padding: '0.75rem', borderColor: '#3b82f6', borderWidth: 1, borderStyle: 'solid' }}>
              <p style={{ fontSize: '0.85rem', color: '#3b82f6', margin: 0 }}>
                ⓘ This is a preview — no data was inserted. Click <strong>Import</strong> to commit.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Weather Dash Panel (Multi-Panel Station Dashboard) ─────────────────────

type WxRange = '1h' | '3h' | '6h' | '12h' | '24h' | 'event' | 'all';
const WX_RANGES: { key: WxRange; label: string; hours?: number }[] = [
  { key: '1h', label: '1h', hours: 1 },
  { key: '3h', label: '3h', hours: 3 },
  { key: '6h', label: '6h', hours: 6 },
  { key: '12h', label: '12h', hours: 12 },
  { key: '24h', label: '24h', hours: 24 },
  { key: 'event', label: 'Event' },
  { key: 'all', label: 'All' },
];

interface DerivedPoint {
  ts: string;
  tsLabel: string;
  temp: number | null;
  rh: number | null;
  baro: number | null;
  da: number | null;
  cf: number | null;
  dewPt: number | null;
  airDensity: number | null;
  waterGrains: number | null;
  vaporPressure: number | null;
}

function WeatherDashPanel({ event }: { event: EventWithStats | null }) {
  const [data, setData] = useState<WeatherTimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [range, setRange] = useState<WxRange>('event');

  useEffect(() => {
    if (!event) { setData(null); return; }
    let cancelled = false;
    setLoading(true); setError('');
    parityApi.weatherTimeseries({ eventId: event.id }).then(res => {
      if (!cancelled) setData(res);
    }).catch((e: any) => {
      if (!cancelled) setError(e.message || 'Failed to load weather timeseries');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [event?.id]);

  // Compute derived metrics for every canonical point
  const allDerived: DerivedPoint[] = useMemo(() => {
    if (!data) return [];
    return data.points.map(p => {
      const ts = p.timestamp_utc;
      const label = ts.length >= 16 ? ts.slice(11, 16) : ts;
      const T = p.canonical_temp_f;
      const RH = p.canonical_rh_pct;
      const BP = p.canonical_pressure_inhg;
      if (T == null || RH == null || BP == null) {
        return { ts, tsLabel: label, temp: T, rh: RH, baro: BP, da: null, cf: null, dewPt: null, airDensity: null, waterGrains: null, vaporPressure: null };
      }
      const w = computeWeather(T, pct_to_frac(RH), BP);
      return {
        ts, tsLabel: label, temp: T, rh: RH, baro: BP,
        da: w.densityAltitude, cf: w.correctionFactor, dewPt: w.dewPoint,
        airDensity: w.airDensity, waterGrains: w.waterGrains, vaporPressure: w.vp,
      };
    });
  }, [data]);

  // Filter by time range
  const filteredDerived = useMemo(() => {
    if (allDerived.length === 0) return [];
    if (range === 'all' || range === 'event') return allDerived;
    const rangeHours = WX_RANGES.find(r => r.key === range)?.hours;
    if (!rangeHours) return allDerived;
    const lastTs = new Date(allDerived[allDerived.length - 1].ts).getTime();
    const cutoff = lastTs - rangeHours * 3600_000;
    return allDerived.filter(p => new Date(p.ts).getTime() >= cutoff);
  }, [allDerived, range]);


  if (!event) return <div style={S.card}><p style={{ color: 'var(--color-muted)' }}>Select an event above.</p></div>;
  if (loading) return <div style={S.card}><p style={{ color: 'var(--color-muted)' }}>Loading weather timeseries...</p></div>;
  if (error) return <div style={S.error}>{error}</div>;
  if (!data || data.points.length === 0) return <div style={S.card}><p style={{ color: 'var(--color-muted)' }}>No weather timeseries data for this event.</p></div>;

  const pts = filteredDerived;
  const latest = allDerived[allDerived.length - 1];

  // Shared chart styles
  const ttStyle = { fontSize: '0.72rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)' };
  const chartH = 180;
  const chartMargin = { top: 4, right: 8, left: -10, bottom: 2 };

  // Current conditions card
  const CondCard = ({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) => (
    <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.5rem 0.6rem', textAlign: 'center' as const, minWidth: 100 }}>
      <div style={{ fontSize: '0.55rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.6rem', color: '#888' }}>{unit}</div>
    </div>
  );

  // Mini chart panel
  const MiniChart = ({ dataKey, color, label, unit, fmt, yWidth }: { dataKey: keyof DerivedPoint; color: string; label: string; unit: string; fmt: (v: number) => string; yWidth?: number }) => (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.4rem' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color, marginBottom: '0.2rem', paddingLeft: '0.3rem' }}>{label} <span style={{ fontWeight: 400, color: '#888' }}>({unit})</span></div>
      <ResponsiveContainer width="100%" height={chartH}>
        <LineChart data={pts} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          <XAxis dataKey="tsLabel" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9 }} tickCount={5}
            domain={[(dm: number) => dm - Math.abs(dm) * 0.02, (dm: number) => dm + Math.abs(dm) * 0.02]}
            tickFormatter={(v: number) => fmt(v)} width={yWidth ?? 48} />
          <Tooltip contentStyle={ttStyle} formatter={(v: number) => [fmt(v), label]} labelFormatter={(l: string) => `Time: ${l}`} />
          <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} strokeWidth={1.8} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div>
      {/* Header + Time Range in one row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div>
          <h2 style={{ ...S.h1, fontSize: '1.05rem', margin: 0 }}>Weather Station — {data.event.event_name}</h2>
          <p style={{ fontSize: '0.72rem', color: '#888', margin: '0.1rem 0 0' }}>
            {data.event.track_name} &nbsp;|&nbsp; {data.event.start_date_local} → {data.event.end_date_local}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
          {WX_RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              style={{
                padding: '0.2rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.68rem', fontWeight: range === r.key ? 700 : 400,
                background: range === r.key ? 'var(--color-primary, #3b82f6)' : 'var(--color-surface)',
                color: range === r.key ? '#fff' : 'var(--color-text)',
                border: '1px solid ' + (range === r.key ? 'var(--color-primary, #3b82f6)' : 'var(--color-border)'),
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current Conditions — even grid filling full width */}
      {latest && latest.temp != null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <CondCard label="Temperature" value={latest.temp?.toFixed(1) ?? '—'} unit="°F" color="#ef4444" />
          <CondCard label="Humidity" value={latest.rh?.toFixed(1) ?? '—'} unit="%" color="#8b5cf6" />
          <CondCard label="Barometer" value={latest.baro?.toFixed(3) ?? '—'} unit="inHg" color="#3b82f6" />
          <CondCard label="Density Alt" value={latest.da?.toFixed(0) ?? '—'} unit="ft" color="#f97316" />
          <CondCard label="Corr Factor" value={latest.cf?.toFixed(4) ?? '—'} unit="" color="#16a34a" />
          <CondCard label="Dew Point" value={latest.dewPt?.toFixed(1) ?? '—'} unit="°F" color="#06b6d4" />
          <CondCard label="Air Density" value={latest.airDensity?.toFixed(2) ?? '—'} unit="" color="#d946ef" />
          <CondCard label="Water Grains" value={latest.waterGrains?.toFixed(1) ?? '—'} unit="gr/lb" color="#84cc16" />
        </div>
      )}

      {/* 6-Panel Chart Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <MiniChart dataKey="temp" color="#ef4444" label="Temperature" unit="°F" fmt={(v: number) => v.toFixed(1)} />
        <MiniChart dataKey="rh" color="#8b5cf6" label="Humidity" unit="%" fmt={(v: number) => v.toFixed(1)} />
        <MiniChart dataKey="baro" color="#3b82f6" label="Barometer" unit="inHg" fmt={(v: number) => v.toFixed(3)} yWidth={55} />
        <MiniChart dataKey="da" color="#f97316" label="Density Alt" unit="ft" fmt={(v: number) => v.toFixed(0)} />
        <MiniChart dataKey="cf" color="#16a34a" label="Corr Factor" unit="" fmt={(v: number) => v.toFixed(4)} yWidth={55} />
        <MiniChart dataKey="dewPt" color="#06b6d4" label="Dew Point" unit="°F" fmt={(v: number) => v.toFixed(1)} />
      </div>
    </div>
  );
}

// ParityDashPanel is now imported from ./ParityDashPanel.tsx
