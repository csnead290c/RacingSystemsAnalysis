import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  parityApi,
  type ParitySummaryResponse,
  type ParityQualOrderResponse,
  type ParityIncrementalsResponse,
  type ParitySessionWeatherResponse,
  type ParityComboRun,
  type ParityDeltasResponse,
  type RangeParityMatrixResponse,
  type IncrementalComparisonResponse,
  type EventWithStats,
  type EngineComboRow,
} from '../services/parityApi';
import { useCapabilities } from '../domain/config/useCapabilities';
import { exportEventParityPdf, exportLongTermParityPdf } from '../services/parityPdf';
import { waterGrains, pct_to_frac } from '../domain/parity/weatherCorrection';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';
void Legend;
import {
  formatET, formatMPH, formatBaro, formatHPC,
  formatTemp, formatRH, formatDA, formatWG,
  formatMetric, formatDelta, isIncrementalMph,
} from '../domain/parity/format';

// PARITY_CLASSES moved to ParityPortal global header
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

// Combo color map — uses stored color_hex from database, falls back to palette
const _comboColorMap = new Map<string, string>();
const _engineComboColors = new Map<string, string>(); // name -> color_hex from DB
let _engineComboRows: EngineComboRow[] = []; // full rows for PDF export

// Load engine combo colors from API
let _colorsLoaded = false;
async function loadComboColors() {
  if (_colorsLoaded) return;
  try {
    const response = await parityApi.listEngineCombos();
    _engineComboRows = response.combos;
    response.combos.forEach(ec => {
      if (ec.color_hex) {
        _engineComboColors.set(ec.name, ec.color_hex);
      }
    });
    _colorsLoaded = true;
  } catch (e) {
    console.warn('Failed to load engine combo colors:', e);
  }
}

function comboColor(name: string): string {
  // Try stored color from DB first
  if (_engineComboColors.has(name)) {
    return _engineComboColors.get(name)!;
  }
  // Fall back to sequential palette assignment
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

function isMph(m: string) { return m.startsWith('mph_'); }
void isMph; // used by format helpers

const _cache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 120_000;
function ck(a: string, p: Record<string, unknown>): string { return a + '|' + JSON.stringify(p); }
async function cf<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const h = _cache.get(key);
  if (h && Date.now() - h.ts < CACHE_TTL) return h.data as T;
  const d = await fn(); _cache.set(key, { ts: Date.now(), data: d }); return d;
}

const S = {
  page: { fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1200, margin: '0 auto', padding: '0 0.5rem' } as React.CSSProperties,
  h1: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)' } as React.CSSProperties,
  h2: { fontSize: '1rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--color-text)', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.25rem' } as React.CSSProperties,
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' } as React.CSSProperties,
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center' } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' } as React.CSSProperties,
  tbl: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.82rem' },
  th: { textAlign: 'left' as const, padding: '0.25rem 0.4rem', borderBottom: '2px solid var(--color-border)', fontSize: '0.78rem', whiteSpace: 'nowrap' as const, fontWeight: 700 },
  td: { padding: '0.2rem 0.4rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' as const },
  inp: { padding: '0.25rem 0.4rem', border: '1px solid var(--color-border)', borderRadius: 3, fontSize: '0.75rem', fontFamily: 'inherit' } as React.CSSProperties,
  hint: { color: 'var(--color-muted)', fontSize: '0.85rem', fontStyle: 'italic' } as React.CSSProperties,
  nd: { color: '#888', fontStyle: 'italic' as const, fontSize: '0.72rem' },
  badge: (c: string) => ({ display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: 4, background: c + '22', color: c, fontSize: '0.72rem', fontWeight: 600 }) as React.CSSProperties,
  btn: { padding: '0.3rem 0.6rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' } as React.CSSProperties,
  tabA: { borderBottom: '2px solid var(--color-primary)', fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem' } as React.CSSProperties,
  tabI: { borderBottom: '2px solid transparent', fontWeight: 400, color: 'var(--color-muted)', background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem' } as React.CSSProperties,
};

// Compact sub-styles for dense report tables (matches reference PDF layout)
const SS = {
  secHead: { fontSize: '0.82rem', fontWeight: 700, padding: '0.3rem 0.5rem', marginBottom: '0.15rem', background: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)', whiteSpace: 'nowrap' as const } as React.CSSProperties,
  tbl: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.75rem' },
  th: { textAlign: 'left' as const, padding: '0.2rem 0.35rem', borderBottom: '2px solid var(--color-border)', fontSize: '0.72rem', whiteSpace: 'nowrap' as const, fontWeight: 700, background: 'var(--color-surface)' },
  td: { padding: '0.15rem 0.35rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' as const, whiteSpace: 'nowrap' as const, fontSize: '0.72rem' },
};

// fmt() replaced by shared formatET/formatMPH/formatMetric/formatDelta in domain/parity/format.ts

// ═════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY for debugging React error #310
// ═════════════════════════════════════════════════════════════════════════════

class ParityErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ParityReport Error:', error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 8, margin: '1rem' }}>
          <h3 style={{ color: '#dc2626', margin: '0 0 0.5rem' }}>Parity Report Error</h3>
          <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#991b1b' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          {this.state.errorInfo && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', color: '#7f1d1d' }}>Component Stack</summary>
              <pre style={{ fontSize: '0.7rem', overflow: 'auto', maxHeight: 200 }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

type Mode = 'event' | 'longTerm';

export default function ParityReport({ event, events, classIndex, category, onClassChange, onDriverClick }: {
  event: EventWithStats | null;
  events: EventWithStats[];
  classIndex: string;
  category?: string;
  onClassChange?: (cls: string) => void;
  onDriverClick?: (driver: string, classIndex?: string) => void;
}) {
  void onClassChange; // future-proofing hook
  void classIndex; // kept for backward compat but category is the primary filter
  const displayLabel = category || classIndex;
  const [mode, setMode] = useState<Mode>('event');
  const sessionScope = 'both' as const;
  const [corrMode, setCorrMode] = useState<'raw' | 'corrected'>('raw');
  const [groupBy, setGroupBy] = useState<'engineCombo' | 'bodyStyle'>('engineCombo');
  const [eventCount, setEventCount] = useState<1 | 3 | 5>(1);
  const metric = 'et_1320';
  const [overrideEv, setOverrideEv] = useState<number | null>(null);

  return (
    <div style={S.page}>
      <PrintStyle />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem', alignItems: 'center' }}>
        <button style={mode === 'event' ? S.tabA : S.tabI} onClick={() => { setMode('event'); setOverrideEv(null); }}>Event Parity</button>
        <button style={mode === 'longTerm' ? S.tabA : S.tabI} onClick={() => setMode('longTerm')}>Long-Term Parity</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-muted)' }}>{displayLabel}</span>
          {mode === 'event' && (
            <label style={{ fontSize: '0.78rem' }}>Events:<select value={eventCount} onChange={e => setEventCount(Number(e.target.value) as 1 | 3 | 5)} style={{ ...S.inp, width: 70, marginLeft: 4 }}><option value="1">1</option><option value="3">3</option><option value="5">5</option></select></label>
          )}
          <label style={{ fontSize: '0.78rem' }}>Group:<select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} style={{ ...S.inp, width: 110, marginLeft: 4 }}><option value="engineCombo">Engine Combo</option><option value="bodyStyle">Body Style</option></select></label>
          <label style={{ fontSize: '0.78rem' }}>Mode:<select value={corrMode} onChange={e => setCorrMode(e.target.value as any)} style={{ ...S.inp, width: 90, marginLeft: 4 }}><option value="raw">Raw</option><option value="corrected">Corrected</option></select></label>
        </div>
      </div>
      {!category && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, padding: '0.5rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#92400e' }}>
          ⚠ No category selected. Please select a category from the dropdown above.
        </div>
      )}
      <ParityErrorBoundary>
        {mode === 'event'
          ? <EventReport event={overrideEv ? { ...(event as any), id: overrideEv } : event} events={events} eventCount={eventCount} category={category || classIndex} displayLabel={displayLabel} metric={metric} corrMode={corrMode} groupBy={groupBy} sessionScope={sessionScope} onDriverClick={onDriverClick} />
          : <LongTermReport category={category || classIndex} displayLabel={displayLabel} metric={metric} corrMode={corrMode} groupBy={groupBy} sessionScope={sessionScope} onEventClick={id => { setOverrideEv(id); setMode('event'); }} />
        }
      </ParityErrorBoundary>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EVENT PARITY REPORT
// ═════════════════════════════════════════════════════════════════════════════

export function EventReport({ event, events, eventCount, category, displayLabel, metric, corrMode, groupBy, sessionScope, onDriverClick }: {
  event: EventWithStats | null; events: EventWithStats[]; eventCount: 1 | 3 | 5; category: string; displayLabel: string; metric: string;
  corrMode: 'raw' | 'corrected'; groupBy: 'engineCombo' | 'bodyStyle'; sessionScope: 'qual' | 'elim' | 'both';
  onDriverClick?: (driver: string, classIndex?: string) => void;
}) {
  const topN = 4;
  const [summary, setSummary] = useState<ParitySummaryResponse | null>(null);
  const [qualOrder, setQualOrder] = useState<ParityQualOrderResponse | null>(null);
  const [inc, setInc] = useState<ParityIncrementalsResponse | null>(null);
  const [wx, setWx] = useState<ParitySessionWeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [exporting, setExporting] = useState(false);
  const [pdfMode, setPdfMode] = useState<'raw' | 'corrected' | 'combined'>('combined');
  const [selectedEvents, setSelectedEvents] = useState<EventWithStats[]>([]);
  const [showH2H, setShowH2H] = useState(false);
  const [deltasData, setDeltasData] = useState<ParityDeltasResponse | null>(null);
  const [loadingH2H, setLoadingH2H] = useState(false);
  const groupLabel = groupBy === 'bodyStyle' ? 'Body Style' : 'Engine Combo';

  // Build complete event map from all available events for accurate Event column labeling
  const eventMap = useMemo(() => {
    const map = new Map<number, EventWithStats>();
    events.forEach(e => map.set(e.id, e));
    return map;
  }, [events]);

  // Load combo colors on mount
  useEffect(() => {
    loadComboColors();
  }, []);

  const load = useCallback(() => {
    if (!event) return;
    setLoading(true); setErr('');
    
    // Multi-event mode: start from current event and work backwards (across years)
    if (eventCount > 1) {
      // Pre-filter to events that have runs, then take exactly eventCount most recent
      const sortedWithRuns = [...events]
        .filter(e => (e.run_count ?? 0) > 0)
        .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local));
      const currentIdx = sortedWithRuns.findIndex(e => e.id === event.id);
      const candidates = currentIdx >= 0
        ? sortedWithRuns.slice(currentIdx, currentIdx + eventCount)
        : sortedWithRuns.slice(0, eventCount);
      const candidateIds = candidates.map(e => e.id);
      
      const b = { eventIds: candidateIds, category, metric, mode: corrMode, topN, sessionScope, groupBy };
      Promise.all([
        cf(ck('sum', b), () => parityApi.paritySummary(b)),
        cf(ck('qo', { eventId: event.id, category, metric, mode: 'raw', sessionScope, groupBy }), () => parityApi.parityQualOrder({ eventId: event.id, category, metric, mode: 'raw', sessionScope, groupBy })),
        cf(ck('inc', { eventIds: candidateIds, category, sessionScope, mode: corrMode, groupBy }), () => parityApi.parityIncrementals({ eventIds: candidateIds, category, sessionScope, mode: corrMode, groupBy })),
        cf(ck('wx', { eventIds: candidateIds, category }), () => parityApi.paritySessionWeather({ eventIds: candidateIds, category })),
      ]).then(([s, q, i, w]) => {
        const confirmedIds = new Set<number>(s.eventIds ?? candidateIds);
        setSelectedEvents(candidates.filter(e => confirmedIds.has(e.id)));
        setSummary(s);
        setQualOrder(q);
        setInc(i);
        setWx(w);
      })
        .catch(e => setErr(e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed'))
        .finally(() => setLoading(false));
    } else {
      // Single event mode
      setSelectedEvents([event]);
      const b = { eventId: event.id, category, metric, mode: corrMode, topN, sessionScope, groupBy };
      Promise.all([
        cf(ck('sum', b), () => parityApi.paritySummary(b)),
        cf(ck('qo', { eventId: event.id, category, metric, mode: 'raw', sessionScope, groupBy }), () => parityApi.parityQualOrder({ eventId: event.id, category, metric, mode: 'raw', sessionScope, groupBy })),
        cf(ck('inc', { eventId: event.id, category, sessionScope, mode: corrMode, groupBy }), () => parityApi.parityIncrementals({ eventId: event.id, category, sessionScope, mode: corrMode, groupBy })),
        cf(ck('wx', { eventId: event.id, category }), () => parityApi.paritySessionWeather({ eventId: event.id, category })),
      ]).then(([s, q, i, w]) => { setSummary(s); setQualOrder(q); setInc(i); setWx(w); })
        .catch(e => setErr(e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed'))
        .finally(() => setLoading(false));
    }
  }, [event?.id, events, eventCount, category, metric, corrMode, groupBy, sessionScope]);
  useEffect(() => { load(); }, [load]);

  const handleExportPdf = useCallback(async () => {
    if (!summary || !event) return;
    setExporting(true);
    try {
      // ── Corrected summary (corrected or combined mode) ──
      // Always fetch separately so the PDF has correct data regardless of what the UI's corrMode is.
      let correctedSummary: ParitySummaryResponse | null = null;
      if (pdfMode === 'combined' || pdfMode === 'corrected') {
        try {
          const cb = eventCount > 1
            ? { eventIds: summary.eventIds ?? [event.id], category, metric, mode: 'corrected' as const, topN, sessionScope, groupBy }
            : { eventId: event.id, category, metric, mode: 'corrected' as const, topN, sessionScope, groupBy };
          correctedSummary = await parityApi.paritySummary(cb);
        } catch { correctedSummary = null; }
      }

      // ── Extended raw summary (combined mode only) ──
      // Fetch with higher topN so corrected-ranked runs outside the normal topN window
      // can still be matched back to their source raw ET/MPH by runId.
      let rawSummaryExtended: ParitySummaryResponse | null = null;
      if (pdfMode === 'combined') {
        try {
          const extTopN = Math.max(topN * 5, 20);
          const rb = eventCount > 1
            ? { eventIds: summary.eventIds ?? [event.id], category, metric, mode: 'raw' as const, topN: extTopN, sessionScope, groupBy }
            : { eventId: event.id, category, metric, mode: 'raw' as const, topN: extTopN, sessionScope, groupBy };
          rawSummaryExtended = await parityApi.paritySummary(rb);
        } catch { rawSummaryExtended = null; }
      }

      // ── Incremental comparison (PDF-only fetch) ──
      let incComparison: IncrementalComparisonResponse | null = null;
      try {
        incComparison = await parityApi.incrementalComparison({ eventId: event.id, category });
      } catch { incComparison = null; }

      // ── 5-event trend: fetch 5 years back, keep events with data, take 5 most recent ──
      async function fetchTrend(mode: 'raw' | 'corrected'): Promise<RangeParityMatrixResponse | null> {
        try {
          const curYear = new Date().getFullYear();
          const yearsToFetch = Array.from({ length: 5 }, (_, i) => curYear - i);
          const settled = await Promise.allSettled(
            yearsToFetch.map(yr =>
              parityApi.rangeParityMatrix({ category, metric, mode, topN, sessionScope: sessionScope as any, groupBy, year: yr })
            )
          );
          const results = settled
            .filter((r): r is PromiseFulfilledResult<RangeParityMatrixResponse> => r.status === 'fulfilled')
            .map(r => r.value);
          if (results.length === 0) return null;
          const allEvents: RangeParityMatrixResponse['events'] = [];
          const allMatrix: RangeParityMatrixResponse['matrix'] = {};
          const allCombos = new Set<string>();
          const seenIds = new Set<number>();
          for (const res of results) {
            for (const ev of res.events) {
              if (!seenIds.has(ev.eventId)) { seenIds.add(ev.eventId); allEvents.push(ev); }
              allMatrix[ev.eventId] = res.matrix[ev.eventId];
            }
            res.combos.forEach(c => allCombos.add(c));
          }
          // Filter to events with actual data for this class, then take 5 most recent
          const eventsWithData = allEvents.filter(ev => {
            const m = allMatrix[ev.eventId];
            return m && Object.values(m).some(cell => cell?.best != null);
          });
          eventsWithData.sort((a, b) => a.start_date_local.localeCompare(b.start_date_local));
          const sliced = eventsWithData.slice(-5);
          const filteredMatrix: typeof allMatrix = {};
          for (const ev of sliced) filteredMatrix[ev.eventId] = allMatrix[ev.eventId];
          return { ...results[0], events: sliced, combos: [...allCombos], matrix: filteredMatrix, mode };
        } catch { return null; }
      }
      const [trendRaw, trendCorrected] = await Promise.all([fetchTrend('raw'), fetchTrend('corrected')]);

      await exportEventParityPdf({
        summary,
        qualOrder,
        incrementals: inc,
        weather: wx,
        category,
        displayLabel,
        corrMode,
        pdfMode,
        groupBy,
        sessionScope,
        chartSelector: '[data-testid="parity-grouped-chart"] .recharts-surface',
        correctedSummary,
        rawSummaryExtended,
        incrementalComparison: incComparison,
        trendRaw,
        trendCorrected,
        engineCombos: _engineComboRows,
      });
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  }, [summary, qualOrder, inc, wx, category, displayLabel, corrMode, pdfMode, event, eventCount, groupBy, sessionScope]);

  const handleToggleH2H = useCallback(async () => {
    if (!event || !summary) return;
    if (showH2H) { setShowH2H(false); return; }
    setShowH2H(true);
    if (!deltasData) {
      setLoadingH2H(true);
      try {
        const d = await parityApi.parityDeltas({ eventId: event.id, category, metric, mode: corrMode, topN, sessionScope, groupBy });
        setDeltasData(d);
      } catch (e) {
        console.error('Failed to load delta matrix:', e);
      } finally {
        setLoadingH2H(false);
      }
    }
  }, [event, summary, showH2H, deltasData, category, metric, corrMode, topN, sessionScope, groupBy]);

  // Derive the actual represented event set from rendered report data
  // NOTE: These useMemo hooks MUST be called before any early returns to comply with React's rules of hooks
  const representedEventIds = useMemo(() => {
    if (!summary || eventCount <= 1) return new Set<number>();
    const ids = new Set<number>();
    summary.combos.forEach(c => {
      c.topRuns.forEach(r => {
        const eid = (r as any).eventId;
        if (eid) ids.add(eid);
      });
    });
    return ids;
  }, [summary, eventCount]);

  // Build list of represented events with their codes for subtitle
  const representedEvents = useMemo(() => {
    if (representedEventIds.size === 0) return [];
    return Array.from(representedEventIds)
      .map(id => eventMap.get(id))
      .filter((e): e is EventWithStats => !!e)
      .sort((a, b) => (b.start_date_local || '').localeCompare(a.start_date_local || ''));
  }, [representedEventIds, eventMap]);

  // Early returns AFTER all hooks
  if (!event) return <div style={S.card}><p style={S.hint}>Select an event above.</p></div>;
  if (loading) return <p style={S.hint}>Loading Event Parity Report...</p>;
  if (err) return <div style={{ ...S.card, color: '#ef4444' }}>{typeof err === 'string' ? err : JSON.stringify(err)}</div>;
  if (!summary) return null;

  const modeLabel = corrMode === 'raw' ? 'Raw Data' : 'Corrected';
  const evYear = summary.event.start_date_local?.slice(0, 4) ?? '';
  const evCode = (event as any).event_code
    || eventShortCode({ event_name: summary.event.event_name || '', start_date_local: summary.event.start_date_local || '' }).replace(/^\d{4}\s*/, '');

  // Compute combo sort order for delta reference
  const isLB = summary.isLowerBetter;
  const combosSorted = [...summary.combos].filter(c => c.bestValue != null).sort((a, b) =>
    isLB ? (a.bestValue! - b.bestValue!) : (b.bestValue! - a.bestValue!)
  );

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
    .sort((a, b) => isLB ? (a.value - b.value) : (b.value - a.value));
  const barValues = interleavedBars.map(b => b.value).filter(v => v != null && isFinite(v));
  let yDomain: [number | ((v: number) => number), number | ((v: number) => number) | 'auto'] = [(min: number) => Math.floor((min - min * 0.002) * 100) / 100, 'auto'];
  if (barValues.length >= 4) {
    const sorted = [...barValues].sort((a, b) => a - b);
    const n = sorted.length;
    if (isLB) {
      // ET: zoom to fastest (lowest) cluster
      const fastest = sorted[0];
      const p25 = sorted[Math.floor(n * 0.25)];
      const lowSpread = p25 - fastest;
      // Upper cap = P25 + 2× the spread within the fastest quarter
      // Minimum headroom of 0.5% of the fastest value to avoid overly tight framing
      const headroom = Math.max(lowSpread * 2, fastest * 0.005);
      const cap = p25 + headroom;
      const slowest = sorted[n - 1];
      // Only apply if it would actually clip at least one bar
      if (slowest > cap) {
        const yMin = Math.floor((fastest - fastest * 0.001) * 100) / 100;
        const yMax = Math.ceil(cap * 100) / 100;
        yDomain = [yMin, yMax];
      }
    } else {
      // MPH: zoom to fastest (highest) cluster — mirror logic
      const fastest = sorted[n - 1];
      const p75 = sorted[Math.floor(n * 0.75)];
      const highSpread = fastest - p75;
      const headroom = Math.max(highSpread * 2, fastest * 0.005);
      const floor = p75 - headroom;
      const slowest = sorted[0];
      if (slowest < floor) {
        const yMin = Math.floor(floor * 100) / 100;
        const yMax = Math.ceil((fastest + fastest * 0.001) * 100) / 100;
        yDomain = [yMin, yMax];
      }
    }
  }

  return (
    <div className="parity-event-report" data-testid="parity-event-report" style={{ pageBreakAfter: 'always' }}>
      {/* ── Title Block ── */}
      <div data-testid="parity-header" style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {evYear} {evCode} NHRA {displayLabel} {modeLabel} Event Parity
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <select
              value={pdfMode}
              onChange={e => setPdfMode(e.target.value as 'raw' | 'corrected' | 'combined')}
              style={{ ...S.inp, fontSize: '0.72rem', padding: '0.2rem 0.4rem', width: 120 }}
              disabled={exporting}
            >
              <option value="combined">Combined PDF</option>
              <option value="raw">Raw PDF</option>
              <option value="corrected">Corrected PDF</option>
            </select>
            <button style={{ ...S.btn, fontSize: '0.72rem', padding: '0.25rem 0.6rem', opacity: exporting ? 0.5 : 1 }}
              onClick={handleExportPdf} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#999', marginTop: '0.1rem' }}>
          {summary.event.event_name} — {summary.event.track_name}{summary.event.city ? `, ${summary.event.city}` : ''}
        </div>
        {representedEvents.length > 1 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '0.25rem', fontWeight: 600 }}>
            {representedEvents.length} events represented: {representedEvents.map(e => {
              const year = e.start_date_local?.slice(0, 4) ?? '';
              const code = (e as any).event_code || eventShortCode({ event_name: e.event_name || '', start_date_local: e.start_date_local || '' }).replace(/^\d{4}\s*/, '');
              return `${year} ${code}`;
            }).join(', ')}
          </div>
        )}
      </div>


      {/* ── Section 1: Top Runs Table (full width) ── */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={SS.secHead}>Quickest {topN} Runs Per Combo</div>
        <table style={SS.tbl}>
          <thead><tr>
            <th style={SS.th}>{groupLabel}</th><th style={SS.th}>Driver</th>
            <th style={{ ...SS.th, textAlign: 'right' }}>ET</th><th style={{ ...SS.th, textAlign: 'right' }}>Speed</th>
            <th style={SS.th}>Round</th>
            {eventCount > 1 && <th style={SS.th}>Event</th>}
          </tr></thead>
          <tbody>
            {summary.combos.flatMap(c => c.topRuns.slice(0, topN).map((r, ri) => {
              // Use complete eventMap for lookup, not just selectedEvents
              const runEvent = eventCount > 1 ? eventMap.get((r as any).eventId) : null;
              const eventLabel = runEvent 
                ? eventShortCode({ event_name: runEvent.event_name, event_code: (runEvent as any).event_code, start_date_local: runEvent.start_date_local })
                : '';
              return (
                <tr key={`${c.engineCombo}-${ri}`} style={{ background: ri === 0 ? comboColor(c.engineCombo) + '18' : undefined }}>
                  {ri === 0
                    ? <td style={{ ...SS.td, fontWeight: 700 }} rowSpan={Math.min(c.topRuns.length, topN)}>
                        <span style={S.badge(comboColor(c.engineCombo))}>{c.engineCombo}</span>
                      </td>
                    : null}
                  <td style={SS.td}>{onDriverClick ? <a href="#" style={{ color: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: '2px' }} onClick={e => { e.preventDefault(); onDriverClick(r.driver); }}>{r.driver}</a> : r.driver}</td>
                  <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatET(r.et)}</td>
                  <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMPH(r.mph)}</td>
                  <td style={{ ...SS.td, fontSize: '0.65rem', color: '#888' }}>{r.round || ''}</td>
                  {eventCount > 1 && <td style={{ ...SS.td, fontSize: '0.65rem', color: '#888' }}>{eventLabel}</td>}
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      {/* ── Section 2: Unified Combo Summary Table ── */}
      <div data-testid="parity-combo-summary" style={{ marginBottom: '0.25rem' }}>
        <div style={SS.secHead}>Combo Summary</div>
        <ComboSummaryTable combos={combosSorted} isLowerBetter={isLB} metric={metric} topN={topN} />
      </div>

      {/* ── Section 2b: Head-to-Head Delta Matrix (lazy) ── */}
      {eventCount === 1 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <button style={{ ...S.btn, fontSize: '0.72rem', padding: '0.2rem 0.5rem' }} onClick={handleToggleH2H}>
            {showH2H ? '▲ Hide Head-to-Head' : '▼ Show Head-to-Head'}
          </button>
          {showH2H && (
            <div style={{ marginTop: '0.4rem' }}>
              {loadingH2H && <p style={S.hint}>Loading delta matrix…</p>}
              {deltasData && combosSorted.length >= 2 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem' }}>
                  <HeadToHeadMatrix title="Quickest Run" deltas={deltasData.deltaMatrices.quickest} combos={combosSorted.map(c => c.engineCombo)} metric={metric} isLowerBetter={isLB} />
                  <HeadToHeadMatrix title={`Avg Top ${topN}`} deltas={deltasData.deltaMatrices.avgTopN} combos={combosSorted.map(c => c.engineCombo)} metric={metric} isLowerBetter={isLB} />
                  <HeadToHeadMatrix title="Total Average" deltas={deltasData.deltaMatrices.totalAvg} combos={combosSorted.map(c => c.engineCombo)} metric={metric} isLowerBetter={isLB} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Bar Chart (full width) ── */}
      <div data-testid="parity-grouped-chart" style={{ marginBottom: '0.5rem', pageBreakInside: 'avoid' }}>
        <div style={SS.secHead}>Quickest {topN} Runs Per Combo</div>
        {interleavedBars.length > 0 ? (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.3rem' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={interleavedBars} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} height={18} />
                <YAxis tick={{ fontSize: 10 }} domain={yDomain} tickFormatter={(v: number) => v.toFixed(2)} width={48} allowDataOverflow />
                <Tooltip
                  formatter={(v: number, _name: string, props: any) => {
                    const p = props.payload;
                    return [`${formatMetric(v, metric)} — ${p.driver || ''} (${p.round || ''})`, p.combo || ''];
                  }}
                />
                <Bar dataKey="value" barSize={24}>
                  {interleavedBars.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p style={S.hint}>No combo data for chart.</p>}
      </div>

      {/* ── Section 4+5: Incrementals + Weather side-by-side on wide screens ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div data-testid="parity-incrementals">
          <div style={SS.secHead}>Incrementals</div>
          {inc ? <IncrementalsTable data={inc} /> : <p style={S.hint}>Loading...</p>}
        </div>
        {eventCount === 1 && (
          <div data-testid="parity-weather">
            <div style={SS.secHead}>Weather by Session</div>
            {wx ? <WeatherTable data={wx} /> : <p style={S.hint}>Loading...</p>}
          </div>
        )}
      </div>


      {/* ── Section 6: Qualifying Order (single-event only) ── */}
      {eventCount === 1 && (
        <div data-testid="parity-qual-results" style={{ marginBottom: '0.5rem' }}>
          <div style={SS.secHead}>Qualifying Results</div>
          {qualOrder ? <QualTable rows={qualOrder.qualOrder} event={event} classIndex={qualOrder.classIndex} category={category} eventCount={eventCount} groupBy={groupBy} onComboChanged={load} onDriverClick={onDriverClick} /> : <p style={S.hint}>Loading...</p>}
        </div>
      )}

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

function ComboSummaryTable({ combos, isLowerBetter, metric, topN }: {
  combos: ParitySummaryResponse['combos'];
  isLowerBetter: boolean;
  metric: string;
  topN: number;
}) {
  const bestRef = combos[0]?.bestValue ?? null;
  const avgRef = combos.reduce((b, c) => {
    if (c.avgTopN == null) return b;
    return b == null ? c.avgTopN : (isLowerBetter ? Math.min(b, c.avgTopN) : Math.max(b, c.avgTopN));
  }, null as number | null);
  const totalRef = combos.reduce((b, c) => {
    if (c.totalAvg == null) return b;
    return b == null ? c.totalAvg : (isLowerBetter ? Math.min(b, c.totalAvg) : Math.max(b, c.totalAvg));
  }, null as number | null);

  function DeltaCell({ val, baseline }: { val: number | null; baseline: number | null }) {
    if (val == null || baseline == null) return <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace', color: '#888' }}>—</td>;
    const d = val - baseline;
    const isBad = isLowerBetter ? d > 0 : d < 0;
    const isZero = Math.abs(d) < 0.0005;
    return (
      <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace', color: isZero ? '#888' : isBad ? '#dc2626' : '#16a34a' }}>
        {isZero ? '—' : formatDelta(d, metric)}
      </td>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={SS.tbl}>
        <thead><tr>
          <th style={SS.th}>Combo</th>
          <th style={{ ...SS.th, textAlign: 'right' }}>Quickest</th>
          <th style={{ ...SS.th, textAlign: 'right', color: '#888', fontWeight: 400 }}>Δ</th>
          <th style={{ ...SS.th, textAlign: 'right' }}>Avg {topN}</th>
          <th style={{ ...SS.th, textAlign: 'right', color: '#888', fontWeight: 400 }}>Δ</th>
          <th style={{ ...SS.th, textAlign: 'right' }}>Total Avg</th>
          <th style={{ ...SS.th, textAlign: 'right', color: '#888', fontWeight: 400 }}>Δ</th>
        </tr></thead>
        <tbody>
          {combos.map((c, i) => (
            <tr key={c.engineCombo} style={{ background: i === 0 ? comboColor(c.engineCombo) + '14' : undefined }}>
              <td style={SS.td}><span style={S.badge(comboColor(c.engineCombo))}>{c.engineCombo}</span></td>
              <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: i === 0 ? 700 : 400 }}>
                {c.bestValue != null ? formatMetric(c.bestValue, metric) : '—'}
              </td>
              <DeltaCell val={c.bestValue} baseline={bestRef} />
              <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>
                {c.avgTopN != null ? formatMetric(c.avgTopN, metric) : '—'}
              </td>
              <DeltaCell val={c.avgTopN} baseline={avgRef} />
              <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>
                {c.totalAvg != null ? formatMetric(c.totalAvg, metric) : '—'}
              </td>
              <DeltaCell val={c.totalAvg} baseline={totalRef} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeadToHeadMatrix({ title, deltas, combos, metric, isLowerBetter }: {
  title: string;
  deltas: ParityDeltasResponse['deltaMatrices']['quickest'];
  combos: string[];
  metric: string;
  isLowerBetter: boolean;
}) {
  const lookup = new Map<string, number | null>();
  for (const row of deltas) {
    lookup.set(`${row.comboA}|${row.comboB}`, row.delta);
    lookup.set(`${row.comboB}|${row.comboA}`, row.delta != null ? -row.delta : null);
  }
  return (
    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.2rem' }}>{title}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ ...SS.tbl, fontSize: '0.68rem' }}>
          <thead><tr>
            <th style={{ ...SS.th, minWidth: 60 }}></th>
            {combos.map(c => <th key={c} style={{ ...SS.th, textAlign: 'center' }}><span style={{ ...S.badge(comboColor(c)), fontSize: '0.6rem' }}>{c}</span></th>)}
          </tr></thead>
          <tbody>
            {combos.map(rowCombo => (
              <tr key={rowCombo}>
                <td style={{ ...SS.td, fontWeight: 700 }}><span style={{ ...S.badge(comboColor(rowCombo)), fontSize: '0.6rem' }}>{rowCombo}</span></td>
                {combos.map(colCombo => {
                  if (rowCombo === colCombo) return <td key={colCombo} style={{ ...SS.td, textAlign: 'center', color: '#888' }}>—</td>;
                  const d = lookup.get(`${rowCombo}|${colCombo}`) ?? null;
                  const isZero = d != null && Math.abs(d) < 0.0005;
                  const isBetter = d != null && !isZero && (isLowerBetter ? d < 0 : d > 0);
                  return (
                    <td key={colCombo} style={{ ...SS.td, textAlign: 'center', fontFamily: 'monospace', fontWeight: d != null && !isZero ? 600 : 400, color: d == null || isZero ? '#888' : isBetter ? '#16a34a' : '#dc2626' }}>
                      {d != null ? (isZero ? '—' : formatDelta(d, metric)) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QualTable({ rows, event, classIndex, category, eventCount, groupBy, onComboChanged, onDriverClick }: {
  rows: ParityComboRun[];
  event: EventWithStats | null;
  classIndex: string;
  category: string;
  eventCount: 1 | 3 | 5;
  groupBy: 'engineCombo' | 'bodyStyle';
  onComboChanged?: () => void;
  onDriverClick?: (driver: string, classIndex?: string) => void;
}) {
  const { can } = useCapabilities();
  const canEdit = can('nhra.parity' as any);
  const isAdmin = can('nhra.parity.admin' as any);
  const [engineCombos, setEngineCombos] = useState<EngineComboRow[]>([]);
  const [bodyStyles, setBodyStyles] = useState<any[]>([]);
  const [editingDriver, setEditingDriver] = useState<string | null>(null);
  const [editingBodyStyle, setEditingBodyStyle] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [localRows, setLocalRows] = useState<ParityComboRun[]>(rows);
  useEffect(() => { setLocalRows(rows); }, [rows]);

  const [saving, setSaving] = useState(false);
  void category; // category used via parent; kept for potential future use

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Load engine combos and body styles for dropdowns (all parity users)
  useEffect(() => {
    if (!canEdit) return;
    parityApi.listEngineCombos().then(r => setEngineCombos(r.combos)).catch(() => {});
    parityApi.listBodyStyles().then(r => setBodyStyles(r.bodyStyles)).catch(() => {});
  }, [canEdit]);

  const handleComboChange = useCallback(async (driverName: string, newComboId: number) => {
    if (!event) return;
    if (!classIndex) {
      setToast({ msg: `Unable to map category to class index — cannot assign combos.`, type: 'err' });
      return;
    }
    setSaving(true);
    try {
      const effectiveDate = (event.start_date_local?.slice(0, 10) || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z';
      await parityApi.bulkUpsertDriverCombos([{
        driverName,
        classIndex,
        engineComboId: newComboId,
        effectiveFromUtc: effectiveDate,
      }]);
      // Invalidate cache so reload picks up new combo
      _cache.clear();
      setEditingDriver(null);
      setToast({ msg: `Combo updated for ${driverName} at ${event.start_date_local?.slice(0, 10) ?? 'event'}`, type: 'ok' });
      onComboChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to assign combo';
      setToast({ msg, type: 'err' });
      console.error('Failed to assign combo:', e);
    } finally {
      setSaving(false);
    }
  }, [event, classIndex, onComboChanged]);

  const handleBodyStyleChange = useCallback(async (driverName: string, newBodyStyleId: number) => {
    if (!event) return;
    if (!classIndex) {
      setToast({ msg: `Unable to map category to class index — cannot assign body styles.`, type: 'err' });
      return;
    }
    setSaving(true);
    try {
      const effectiveDate = (event.start_date_local?.slice(0, 10) || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z';
      await parityApi.upsertDriverBodyStyle({
        driverName,
        classIndex,
        bodyStyleId: newBodyStyleId,
        effectiveFromUtc: effectiveDate,
      });
      _cache.clear();
      setEditingBodyStyle(null);
      setToast({ msg: `Body style updated for ${driverName} at ${event.start_date_local?.slice(0, 10) ?? 'event'}`, type: 'ok' });
      onComboChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to assign body style';
      setToast({ msg, type: 'err' });
      console.error('Failed to assign body style:', e);
    } finally {
      setSaving(false);
    }
  }, [event, classIndex, onComboChanged]);

  if (rows.length === 0) return <p style={S.hint}>No qual runs.</p>;
  const displayRows = localRows.length === rows.length ? localRows : rows;
  return (
    <>
    {toast && (
      <div style={{ background: toast.type === 'ok' ? '#d1fae5' : '#fee2e2', border: `1px solid ${toast.type === 'ok' ? '#10b981' : '#ef4444'}`, borderRadius: 6, padding: '0.4rem 0.75rem', marginBottom: '0.4rem', fontSize: '0.72rem', color: toast.type === 'ok' ? '#065f46' : '#991b1b' }}>
        {toast.msg}
      </div>
    )}
    {isAdmin && !classIndex && (
      <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6, padding: '0.4rem 0.75rem', marginBottom: '0.4rem', fontSize: '0.72rem', color: '#92400e' }}>
        ⚠ Unable to resolve class index for this category — combo assignment is disabled.
      </div>
    )}
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <table style={SS.tbl}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
          <th style={{ ...SS.th, background: 'var(--color-surface, #1a1a2e)' }}>Pos</th>
          <th style={{ ...SS.th, background: 'var(--color-surface, #1a1a2e)' }}>Driver</th>
          <th style={{ ...SS.th, textAlign: 'right', background: 'var(--color-surface, #1a1a2e)' }}>ET</th>
          <th style={{ ...SS.th, textAlign: 'right', background: 'var(--color-surface, #1a1a2e)' }}>Speed</th>
          <th style={{ ...SS.th, background: 'var(--color-surface, #1a1a2e)' }}>Round</th>
          <th style={{ ...SS.th, background: 'var(--color-surface, #1a1a2e)' }}>{groupBy === 'bodyStyle' ? 'Body Style' : 'Engine Combo'}</th>
        </tr></thead>
        <tbody>
          {displayRows.map((r, i) => {
            const clr = r.engineCombo ? comboColor(String(r.engineCombo)) : '#666';
            const driverStr = typeof r.driver === 'string' ? r.driver : String(r.driver ?? '');
            const isEditing = editingDriver === driverStr;
            return (
              <tr key={i}>
                <td style={SS.td}>{r.qualPosition ?? i + 1}</td>
                <td style={{ ...SS.td, fontWeight: 600 }}>
                  {onDriverClick
                    ? <a href="#" style={{ color: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: '2px' }} onClick={e => { e.preventDefault(); onDriverClick(driverStr, classIndex); }}>{driverStr}</a>
                    : driverStr}
                  {groupBy === 'engineCombo' && r.bodyStyle
                    ? <span style={{ color: 'var(--color-muted)', fontSize: '0.6rem', fontWeight: 400, marginLeft: 4 }}>({r.bodyStyle})</span>
                    : null}
                  {groupBy === 'bodyStyle' && r.actualEngineCombo && r.actualEngineCombo !== 'Unknown'
                    ? <span style={{ color: 'var(--color-muted)', fontSize: '0.6rem', fontWeight: 400, marginLeft: 4 }}>({r.actualEngineCombo})</span>
                    : null}
                </td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatET(r.et)}</td>
                <td style={{ ...SS.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMPH(r.mph)}</td>
                <td style={{ ...SS.td, fontSize: '0.65rem', color: '#888' }}>{typeof r.round === 'string' ? r.round : ''}</td>
                {/* Primary group column — shows whichever group is active */}
                <td style={SS.td}>
                  {groupBy === 'bodyStyle' ? (
                    editingBodyStyle === driverStr && canEdit ? (
                      <select
                        autoFocus
                        style={{ ...S.inp, fontSize: '0.6rem', width: '100%', padding: '0.15rem 0.2rem' }}
                        value={r.bodyStyleId ?? ''}
                        onChange={e => { const id = parseInt(e.target.value, 10); if (id) handleBodyStyleChange(driverStr, id); }}
                        onBlur={() => setEditingBodyStyle(null)}
                        disabled={saving}
                      >
                        <option value="">Select...</option>
                        {bodyStyles.map(bs => <option key={bs.id} value={bs.id}>{bs.name}</option>)}
                      </select>
                    ) : (
                      <span
                        style={{ fontSize: '0.65rem', color: '#888', ...(canEdit ? { cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '2px' } : {}) }}
                        onClick={canEdit ? () => setEditingBodyStyle(driverStr) : undefined}
                        title={canEdit ? 'Click to change body style' : undefined}
                      >
                        {r.bodyStyle ?? '—'}
                      </span>
                    )
                  ) : (
                    isEditing && canEdit ? (
                      <select
                        autoFocus
                        style={{ ...S.inp, fontSize: '0.6rem', width: '100%', padding: '0.15rem 0.2rem' }}
                        value={r.engineComboId ?? ''}
                        onChange={e => { const id = parseInt(e.target.value, 10); if (id) handleComboChange(driverStr, id); }}
                        onBlur={() => setEditingDriver(null)}
                        disabled={saving}
                      >
                        <option value="">Select...</option>
                        {engineCombos.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
                      </select>
                    ) : (
                      <span
                        style={{ ...S.badge(clr), fontSize: '0.55rem', ...(canEdit ? { cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '2px' } : {}) }}
                        onClick={canEdit ? () => setEditingDriver(driverStr) : undefined}
                        title={canEdit ? 'Click to change engine combo' : undefined}
                      >
                        {typeof r.engineCombo === 'string' ? r.engineCombo : '?'}
                      </span>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

function IncrementalsTable({ data }: { data: ParityIncrementalsResponse }) {
  if (data.combos.length === 0) return <p style={S.hint}>No combos.</p>;
  // Filter out rows where ALL combos have no data
  const visibleRows = data.rows.filter(row => data.combos.some(c => row.values[c] != null));
  if (visibleRows.length === 0) return <p style={S.hint}>No incremental data.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.tbl}>
        <thead><tr>
          <th style={S.th}>Incremental</th>
          {data.combos.map(c => <th key={c} style={{ ...S.th, textAlign: 'right' }}><span style={S.badge(comboColor(c))}>{c}</span></th>)}
        </tr></thead>
        <tbody>
          {visibleRows.map(row => (
            <tr key={row.key}>
              <td style={{ ...S.td, fontWeight: 600 }}>{row.label}</td>
              {data.combos.map(c => {
                const v = row.values[c];
                return <td key={c} style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', ...(v == null ? S.nd : {}) }}>{v != null ? (isIncrementalMph(row.key) ? formatMPH(v) : formatET(v)) : '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function windCardinal(deg: number | null | undefined): string {
  if (deg == null) return '—';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}
function formatWind(mph: number | null | undefined, dir: number | null | undefined): string {
  if (mph == null) return '—';
  return `${mph.toFixed(1)} ${windCardinal(dir)}`;
}

function WeatherTable({ data }: { data: ParitySessionWeatherResponse }) {
  if (data.sessions.length === 0) return <p style={S.hint}>No weather data.</p>;
  const hasWind = data.sessions.some(s => s.wind_speed_mph != null);
  return (
    <>
      <table style={S.tbl}>
        <thead><tr>
          <th style={S.th}>Session</th><th style={{ ...S.th, textAlign: 'right' }}>Temp °F</th>
          <th style={{ ...S.th, textAlign: 'right' }}>RH %</th><th style={{ ...S.th, textAlign: 'right' }}>Baro inHg</th>
          <th style={{ ...S.th, textAlign: 'right' }}>DA ft</th><th style={{ ...S.th, textAlign: 'right' }}>HPC</th>
          <th style={{ ...S.th, textAlign: 'right' }}>WG</th>
          {hasWind && <th style={{ ...S.th, textAlign: 'right' }}>Wind</th>}
        </tr></thead>
        <tbody>
          {data.sessions.map(s => {
            const wg = (s.temp_f != null && s.rh_pct != null && s.pressure_inhg != null)
              ? waterGrains(s.pressure_inhg, s.temp_f, pct_to_frac(s.rh_pct))
              : null;
            return (
              <tr key={s.session}>
                <td style={{ ...S.td, fontWeight: 600 }}>
                  {s.session}
                  {s.localTimeHint && <span style={{ fontWeight: 400, fontSize: '0.65rem', color: '#888', marginLeft: 4 }}>({s.localTimeHint})</span>}
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatTemp(s.temp_f)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatRH(s.rh_pct)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatBaro(s.pressure_inhg)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatDA(s.density_alt_ft)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatHPC(s.hpc)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatWG(wg)}</td>
                {hasWind && <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatWind(s.wind_speed_mph, s.wind_dir_deg)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LONG-TERM PARITY REPORT
// ═════════════════════════════════════════════════════════════════════════════

type RangeMode = 'previousN' | 'season' | 'custom';

function LongTermReport({ category, displayLabel, metric, corrMode, groupBy, sessionScope, onEventClick }: {
  category: string; displayLabel: string; metric: string; corrMode: 'raw' | 'corrected';
  groupBy: 'engineCombo' | 'bodyStyle'; sessionScope: 'qual' | 'elim' | 'both'; onEventClick: (id: number) => void;
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
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr('');
    if (rangeMode === 'previousN') {
      // Fetch multiple years to find last N events this category competed at
      const curYear = new Date().getFullYear();
      const yearsToFetch = Array.from({ length: 10 }, (_, i) => curYear - i);
      Promise.allSettled(yearsToFetch.map(y =>
        cf(ck('range', { category, metric, mode: corrMode, topN, sessionScope, groupBy, year: y }),
          () => parityApi.rangeParityMatrix({ category, metric, mode: corrMode, topN, sessionScope, groupBy, year: y }))
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
      }).catch(e => setErr(e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed'))
        .finally(() => setLoading(false));
    } else {
      let params: any = { category, metric, mode: corrMode, topN, sessionScope, groupBy };
      if (rangeMode === 'season') {
        params.year = year;
      } else {
        params.startDate = startDate; params.endDate = endDate;
      }
      cf(ck('range', params), () => parityApi.rangeParityMatrix(params))
        .then(d => setData(d))
        .catch(e => setErr(e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed'))
        .finally(() => setLoading(false));
    }
  }, [category, metric, corrMode, sessionScope, groupBy, rangeMode, year, startDate, endDate, prevN]);

  useEffect(() => { load(); }, [load]);

  const handleExportPdf = useCallback(async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportLongTermParityPdf({
        data,
        category,
        displayLabel,
        corrMode,
        metric,
        topN,
        groupBy,
        bestChartSelector: '.parity-longterm-report [data-testid="parity-best-chart"] .recharts-surface',
        avgChartSelector: '.parity-longterm-report [data-testid="parity-avg-chart"] .recharts-surface',
        engineCombos: _engineComboRows,
      });
    } catch (e) {
      console.error('Long-term PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  }, [data, category, displayLabel, corrMode, metric, topN]);

  const ml = PARITY_METRICS.find(m => m.value === metric)?.label ?? metric;

  const modeLabel = corrMode === 'raw' ? 'Raw Data' : 'Corrected';

  return (
    <div className="parity-longterm-report" style={{ pageBreakAfter: 'always' }}>
      <div style={{ textAlign: 'center', padding: '0.5rem 0', marginBottom: '0.5rem' }}>
        <h1 style={{ ...S.h1, margin: 0, fontSize: '1.1rem' }}>NHRA {displayLabel} {modeLabel} Long Term Parity</h1>
        <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 2 }}>
          {ml}{sessionScope !== 'both' ? ` | ${sessionScope === 'qual' ? 'Qualifying' : 'Eliminations'}` : ''} | Top {topN}
          {data && !loading && (
            <button style={{ ...S.btn, fontSize: '0.68rem', padding: '0.2rem 0.5rem', marginLeft: '0.75rem', verticalAlign: 'middle', opacity: exporting ? 0.5 : 1 }}
              onClick={handleExportPdf} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          )}
        </div>
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
      {err && <div style={{ ...S.card, color: '#ef4444' }}>{typeof err === 'string' ? err : JSON.stringify(err)}</div>}
      {data && rangeMode === 'previousN' && data.events.length < prevN && (
        <p style={{ ...S.hint, fontStyle: 'italic' }}>Showing {data.events.length} of {prevN} requested — no older data found.</p>
      )}
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
  const groupLabel = data.groupBy === 'bodyStyle' ? 'Body Style' : 'Combo';
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
      <div style={SS.secHead}>Quickest Run Per {groupLabel} — Previous {nEvents} Events</div>
      <RangeTableTransposed
        comboRows={bestData} events={events} evLabels={evLabels}
        avgRef={bestAvgRef} isLB={isLB} onEventClick={onEventClick} metric={metric}
      />

      {/* Chart 1 */}
      <div style={SS.secHead}>Quickest Run Per {groupLabel} — Previous {nEvents} Events</div>
      <div data-testid="parity-best-chart">
        <RangeLineChart chartData={bestChartData} combos={combos} metric={metric} />
      </div>

      {/* Table 2: Avg Top N Per Combo (transposed) */}
      <div style={SS.secHead}>Average {topN} Quickest Per {groupLabel} — Previous {nEvents} Events</div>
      <RangeTableTransposed
        comboRows={avg4Data} events={events} evLabels={evLabels}
        avgRef={avg4AvgRef} isLB={isLB} onEventClick={onEventClick} metric={metric}
      />

      {/* Chart 2 */}
      <div style={SS.secHead}>Average {topN} Quickest Per {groupLabel} — Previous {nEvents} Events</div>
      <div data-testid="parity-avg-chart">
        <RangeLineChart chartData={avg4ChartData} combos={combos} metric={metric} />
      </div>
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
  .parity-event-report [data-testid="parity-grouped-chart"] { page-break-inside: avoid; }
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
  const [hiddenCombos, setHiddenCombos] = useState<Set<string>>(new Set());
  const [yMinStr, setYMinStr] = useState('');
  const [yMaxStr, setYMaxStr] = useState('');

  if (chartData.length === 0) return <p style={S.hint}>No data.</p>;

  const visibleCombos = combos.filter(c => !hiddenCombos.has(c));

  // Compute Y domain from VISIBLE series only — so a hidden outlier doesn't collapse the scale
  const visibleValues = chartData.flatMap(pt =>
    visibleCombos.flatMap(c => (pt[c] != null ? [pt[c] as number] : []))
  );
  const dataMin = visibleValues.length > 0 ? Math.min(...visibleValues) : 0;
  const dataMax = visibleValues.length > 0 ? Math.max(...visibleValues) : 10;
  const pad = (dataMax - dataMin) * 0.06 || 0.05;
  const yMin = yMinStr !== '' ? parseFloat(yMinStr) : parseFloat((dataMin - pad).toFixed(4));
  const yMax = yMaxStr !== '' ? parseFloat(yMaxStr) : parseFloat((dataMax + pad).toFixed(4));

  const toggleCombo = (e: any) => {
    const key = e?.dataKey ?? e?.value;
    if (!key) return;
    setHiddenCombos(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const hasCustomScale = yMinStr !== '' || yMaxStr !== '';

  return (
    <div style={{ ...S.card, padding: '0.5rem' }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--color-muted)' }}>
        <span>Y-axis:</span>
        <input
          type="number" step="0.001" placeholder="Min" value={yMinStr}
          onChange={e => setYMinStr(e.target.value)}
          style={{ width: 68, fontSize: '0.7rem', padding: '1px 4px', borderRadius: 3, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />
        <span>–</span>
        <input
          type="number" step="0.001" placeholder="Max" value={yMaxStr}
          onChange={e => setYMaxStr(e.target.value)}
          style={{ width: 68, fontSize: '0.7rem', padding: '1px 4px', borderRadius: 3, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
        />
        {hasCustomScale && (
          <button onClick={() => { setYMinStr(''); setYMaxStr(''); }}
            style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 3, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer' }}>
            Reset
          </button>
        )}
        {hiddenCombos.size > 0 && (
          <button onClick={() => setHiddenCombos(new Set())}
            style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 3, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer' }}>
            Show All
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.62rem', opacity: 0.6 }}>Click legend to hide/show series</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10 }} domain={[yMin, yMax]} allowDataOverflow tickFormatter={v => formatMetric(v, metric)} width={54} />
          <Tooltip formatter={(v: number) => v != null ? formatMetric(v, metric) : '—'} />
          <Legend wrapperStyle={{ fontSize: '0.68rem', cursor: 'pointer' }} onClick={toggleCombo} />
          {combos.map(c => (
            <Line key={c} type="monotone" dataKey={c} stroke={comboColor(c)}
              dot={{ r: 3 }} strokeWidth={2} connectNulls hide={hiddenCombos.has(c)} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
