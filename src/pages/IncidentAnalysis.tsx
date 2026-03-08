/**
 * IncidentAnalysis — MoTeC i2 Pro–style telemetry + video review workspace
 *
 * Loaded per-incident from IncidentDrawer via "Analyze" button.
 * Route: /parity/analysis/:incidentId
 *
 * Layout:
 *   ┌──────────────┬────────────────────────────┬──────────────┐
 *   │  Datasets /   │   Time-Series Chart        │  Video(s)    │
 *   │  Channels     │                            │              │
 *   │  (left panel) │                            │  (right)     │
 *   ├──────────────┴────────────────────────────┴──────────────┤
 *   │  Toolbar: play/pause, speed, cursor, measurement mode     │
 *   │  Measurements list                                        │
 *   └──────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCapabilities } from '../domain/config/useCapabilities';
import {
  incidentAnalysisApi,
  type AnalysisSession,
  type AnalysisDataset,
  type AnalysisChannel,
  type AnalysisVideo,
  type AnalysisMeasurement,
  type AnalysisLayout,
} from '../services/incidentAnalysisApi';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ── Default channel colors ──────────────────────────────────────────────

const CHANNEL_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#e11d48', '#0ea5e9', '#84cc16', '#d946ef', '#64748b',
];

function channelColor(idx: number): string {
  return CHANNEL_COLORS[idx % CHANNEL_COLORS.length];
}

// ── CSV parser (client-side) ────────────────────────────────────────────

interface ParsedData {
  timeColumn: string | null;
  timeUnit: string;
  columns: string[];
  rows: Record<string, number | null>[];
}

function parseCsvText(text: string, dataset: AnalysisDataset): ParsedData {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { timeColumn: null, timeUnit: 'seconds', columns: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim());
  const timeCol = dataset.time_column;
  const timeIdx = timeCol ? headers.indexOf(timeCol) : -1;
  const timeDivisor = dataset.time_unit === 'milliseconds' ? 1000 : 1;

  const rows: Record<string, number | null>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row: Record<string, number | null> = {};
    for (let j = 0; j < headers.length; j++) {
      const v = vals[j]?.trim();
      if (v === '' || v === undefined) { row[headers[j]] = null; continue; }
      const num = parseFloat(v);
      row[headers[j]] = isNaN(num) ? null : num;
    }
    // Normalize time
    if (timeIdx >= 0 && row[headers[timeIdx]] != null) {
      row['__time'] = (row[headers[timeIdx]]! / timeDivisor) + dataset.time_offset;
    }
    rows.push(row);
  }

  return { timeColumn: timeCol, timeUnit: dataset.time_unit, columns: headers, rows };
}

// ── Styles ──────────────────────────────────────────────────────────────

const S = {
  page: { display: 'flex', flexDirection: 'column' as const, height: '100vh', background: 'var(--color-bg, #1a1a2e)', color: 'var(--color-text, #e0e0e0)', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8rem', overflow: 'hidden' },
  topBar: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderBottom: '1px solid var(--color-border, #333)', background: 'var(--color-surface, #1e1e2e)', flexShrink: 0 },
  mainArea: { display: 'flex', flex: 1, overflow: 'hidden' },
  leftPanel: { width: 240, minWidth: 200, borderRight: '1px solid var(--color-border, #333)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: 'var(--color-surface, #1e1e2e)' },
  centerPanel: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  rightPanel: { width: 320, minWidth: 260, borderLeft: '1px solid var(--color-border, #333)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: 'var(--color-surface, #1e1e2e)' },
  bottomBar: { borderTop: '1px solid var(--color-border, #333)', padding: '0.4rem 0.75rem', background: 'var(--color-surface, #1e1e2e)', flexShrink: 0 },
  panelHeader: { padding: '0.4rem 0.6rem', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'var(--color-muted, #888)', borderBottom: '1px solid var(--color-border, #333)' },
  panelBody: { flex: 1, overflow: 'auto', padding: '0.4rem 0.5rem' },
  btn: (variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary') => ({
    padding: '0.3rem 0.6rem', border: variant === 'ghost' ? 'none' : 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem',
    background: variant === 'primary' ? 'var(--color-primary, #3b82f6)' : variant === 'danger' ? '#c0392b' : variant === 'ghost' ? 'transparent' : 'var(--color-border, #444)',
    color: variant === 'secondary' || variant === 'ghost' ? 'var(--color-text)' : '#fff',
  }),
  input: { padding: '0.25rem 0.4rem', border: '1px solid var(--color-border, #333)', borderRadius: 4, background: 'var(--color-bg, #1a1a2e)', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: '0.75rem' } as React.CSSProperties,
  muted: { color: 'var(--color-muted, #888)', fontSize: '0.7rem' },
  error: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '0.35rem 0.5rem', fontSize: '0.72rem', marginBottom: '0.4rem' },
};

// ── Component ───────────────────────────────────────────────────────────

export default function IncidentAnalysis() {
  const { incidentId: incidentIdParam } = useParams<{ incidentId: string }>();
  const incidentId = parseInt(incidentIdParam || '0', 10);
  const navigate = useNavigate();
  const { can } = useCapabilities();
  const canEdit = can('incidents.create' as any);

  // ── Core state ──────────────────────────────────────────────────────
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [datasets, setDatasets] = useState<AnalysisDataset[]>([]);
  const [videos, setVideos] = useState<AnalysisVideo[]>([]);
  const [measurements, setMeasurements] = useState<AnalysisMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Chart state ─────────────────────────────────────────────────────
  const [visibleChannels, setVisibleChannels] = useState<Set<number>>(new Set());
  const [parsedDataMap, setParsedDataMap] = useState<Record<number, ParsedData>>({});
  const [cursorTime, setCursorTime] = useState<number | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [measureStart, setMeasureStart] = useState<number | null>(null);

  // ── Playback state ──────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const videoRefs = useRef<Record<number, HTMLVideoElement>>({});

  // ── Channel search ──────────────────────────────────────────────────
  const [channelSearch, setChannelSearch] = useState('');

  // ── Upload state ────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Load session + data ─────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!incidentId) return;
    setLoading(true); setError('');
    try {
      const sessionRes = await incidentAnalysisApi.getSession(incidentId);
      setSession(sessionRes.session);
      const sid = sessionRes.session.id;

      const [dsRes, vidRes, measRes] = await Promise.all([
        incidentAnalysisApi.listDatasets(sid),
        incidentAnalysisApi.listVideos(sid),
        incidentAnalysisApi.listMeasurements(sid),
      ]);
      setDatasets(dsRes.datasets);
      setVideos(vidRes.videos);
      setMeasurements(measRes.measurements);

      // Restore visible channels from layout
      const layout = sessionRes.session.layout_json;
      if (layout?.visibleChannelIds) {
        setVisibleChannels(new Set(layout.visibleChannelIds));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load analysis session');
    }
    setLoading(false);
  }, [incidentId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Fetch CSV data for visible channels ─────────────────────────────

  const datasetsWithVisibleChannels = useMemo(() => {
    const dsIds = new Set<number>();
    for (const ds of datasets) {
      for (const ch of ds.channels) {
        if (visibleChannels.has(ch.id)) { dsIds.add(ds.id); break; }
      }
    }
    return dsIds;
  }, [datasets, visibleChannels]);

  useEffect(() => {
    for (const dsId of datasetsWithVisibleChannels) {
      if (parsedDataMap[dsId]) continue;
      const ds = datasets.find(d => d.id === dsId);
      if (!ds) continue;

      const url = incidentAnalysisApi.getDatasetDataUrl(dsId);
      fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` },
      })
        .then(r => r.text())
        .then(text => {
          const parsed = parseCsvText(text, ds);
          setParsedDataMap(prev => ({ ...prev, [dsId]: parsed }));
        })
        .catch(err => console.error(`Failed to fetch dataset ${dsId}:`, err));
    }
  }, [datasetsWithVisibleChannels, datasets, parsedDataMap]);

  // ── Build chart data ────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (visibleChannels.size === 0) return [];

    // Merge all datasets' rows by __time
    const timeMap = new Map<number, Record<string, number | null>>();
    for (const ds of datasets) {
      const parsed = parsedDataMap[ds.id];
      if (!parsed) continue;
      for (const row of parsed.rows) {
        const t = row['__time'];
        if (t == null) continue;
        const roundedT = Math.round(t * 1000) / 1000;
        const existing = timeMap.get(roundedT) || { __time: roundedT };
        for (const ch of ds.channels) {
          if (visibleChannels.has(ch.id) && row[ch.name] != null) {
            existing[`ch_${ch.id}`] = row[ch.name];
          }
        }
        timeMap.set(roundedT, existing);
      }
    }

    return Array.from(timeMap.values()).sort((a, b) => (a.__time as number) - (b.__time as number));
  }, [datasets, parsedDataMap, visibleChannels]);

  // ── Visible channel list for chart lines ────────────────────────────

  const visibleChannelList = useMemo(() => {
    const list: (AnalysisChannel & { datasetName: string; colorIdx: number })[] = [];
    let idx = 0;
    for (const ds of datasets) {
      for (const ch of ds.channels) {
        if (visibleChannels.has(ch.id)) {
          list.push({ ...ch, datasetName: ds.name, colorIdx: idx });
          idx++;
        }
      }
    }
    return list;
  }, [datasets, visibleChannels]);

  // ── Playback loop ───────────────────────────────────────────────────

  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000 * playbackSpeed;
      lastTickRef.current = now;
      setCursorTime(prev => {
        const next = (prev ?? 0) + dt;
        // Sync video elements
        for (const vid of videos) {
          const el = videoRefs.current[vid.id];
          if (el) {
            const videoTime = next - vid.time_offset;
            if (Math.abs(el.currentTime - videoTime) > 0.3) {
              el.currentTime = Math.max(0, videoTime);
            }
            if (el.paused) el.play().catch(() => {});
            el.playbackRate = playbackSpeed;
          }
        }
        return next;
      });
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);

    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [playing, playbackSpeed, videos]);

  // Pause videos when playback stops
  useEffect(() => {
    if (!playing) {
      for (const vid of videos) {
        const el = videoRefs.current[vid.id];
        if (el && !el.paused) el.pause();
      }
    }
  }, [playing, videos]);

  // ── Channel toggle ──────────────────────────────────────────────────

  const toggleChannel = (chId: number) => {
    setVisibleChannels(prev => {
      const next = new Set(prev);
      if (next.has(chId)) next.delete(chId); else next.add(chId);
      return next;
    });
  };

  // ── Upload handlers ─────────────────────────────────────────────────

  const handleDatasetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true); setError('');
    try {
      await incidentAnalysisApi.uploadDataset(session.id, file);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true); setError('');
    try {
      await incidentAnalysisApi.uploadVideo(session.id, file);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Video upload failed');
    }
    setUploading(false);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // ── Save session ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!session) return;
    try {
      const layout: AnalysisLayout = {
        visibleChannelIds: Array.from(visibleChannels),
        playbackSpeed,
        cursorTime,
      };
      await incidentAnalysisApi.saveSession(session.id, layout);
    } catch (err: any) {
      setError(err.message || 'Save failed');
    }
  };

  // ── Delete dataset ──────────────────────────────────────────────────

  const handleDeleteDataset = async (dsId: number) => {
    try {
      await incidentAnalysisApi.deleteDataset(dsId);
      setParsedDataMap(prev => { const n = { ...prev }; delete n[dsId]; return n; });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  // ── Delete video ────────────────────────────────────────────────────

  const handleDeleteVideo = async (vidId: number) => {
    try {
      await incidentAnalysisApi.deleteVideo(vidId);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  // ── Time offset update ──────────────────────────────────────────────

  const handleDatasetOffset = async (dsId: number, offset: number) => {
    try {
      await incidentAnalysisApi.updateDataset(dsId, { time_offset: offset });
      // Re-parse with new offset
      setParsedDataMap(prev => { const n = { ...prev }; delete n[dsId]; return n; });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Update failed');
    }
  };

  const handleVideoOffset = async (vidId: number, offset: number) => {
    try {
      await incidentAnalysisApi.updateVideo(vidId, { time_offset: offset });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Update failed');
    }
  };

  // ── Measurement ─────────────────────────────────────────────────────

  const handleChartClick = (time: number) => {
    if (!measureMode) {
      setCursorTime(time);
      return;
    }
    if (measureStart === null) {
      setMeasureStart(time);
    } else {
      // Complete measurement
      if (session) {
        const t1 = Math.min(measureStart, time);
        const t2 = Math.max(measureStart, time);
        incidentAnalysisApi.saveMeasurement({
          session_id: session.id,
          t1, t2,
          label: `Δt = ${(t2 - t1).toFixed(4)}s`,
        }).then(() => loadAll()).catch(err => setError(err.message));
      }
      setMeasureStart(null);
      setMeasureMode(false);
    }
  };

  const handleDeleteMeasurement = async (id: number) => {
    try {
      await incidentAnalysisApi.deleteMeasurement(id);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Filtered channels ──────────────────────────────────────────────

  const filteredDatasets = useMemo(() => {
    if (!channelSearch.trim()) return datasets;
    const q = channelSearch.toLowerCase();
    return datasets.map(ds => ({
      ...ds,
      channels: ds.channels.filter(ch => ch.name.toLowerCase().includes(q)),
    })).filter(ds => ds.channels.length > 0);
  }, [datasets, channelSearch]);

  // ── Time range for scrubber ─────────────────────────────────────────

  const timeRange = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const ds of datasets) {
      if (ds.time_min != null) min = Math.min(min, ds.time_min + ds.time_offset);
      if (ds.time_max != null) max = Math.max(max, ds.time_max + ds.time_offset);
    }
    if (!isFinite(min)) { min = 0; max = 10; }
    return { min, max };
  }, [datasets]);

  // ── Render ──────────────────────────────────────────────────────────

  if (!can('incidents.read' as any)) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Access denied — requires incidents.read capability</div>;
  }

  if (loading) {
    return <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>Loading analysis session...</div>;
  }

  return (
    <div style={S.page}>
      {/* ── Top Bar ── */}
      <div style={S.topBar}>
        <button style={S.btn('ghost')} onClick={() => navigate('/parity')} title="Back to Parity Portal">◀ Back</button>
        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Incident Analysis</div>
        <div style={S.muted}>Incident #{incidentId} · Session #{session?.id}</div>
        <div style={{ flex: 1 }} />

        {/* Playback controls */}
        <button style={S.btn(playing ? 'danger' : 'primary')} onClick={() => setPlaying(p => !p)}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <select style={{ ...S.input, width: 60 }} value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))}>
          {[0.25, 0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}×</option>)}
        </select>

        <button style={S.btn(measureMode ? 'danger' : 'secondary')}
          onClick={() => { setMeasureMode(m => !m); setMeasureStart(null); }}>
          {measureMode ? '✕ Cancel Measure' : '📏 Measure'}
        </button>

        {canEdit && <button style={S.btn('primary')} onClick={handleSave}>💾 Save</button>}

        {error && <span style={{ color: '#ef4444', fontSize: '0.7rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{error}</span>}
      </div>

      {/* ── Main Area ── */}
      <div style={S.mainArea}>
        {/* ── Left Panel: Datasets + Channels ── */}
        <div style={S.leftPanel}>
          <div style={S.panelHeader}>
            Datasets & Channels
            {canEdit && (
              <>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.log" style={{ display: 'none' }}
                  onChange={handleDatasetUpload} />
                <button style={{ ...S.btn('primary'), marginLeft: '0.4rem', fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}
                  onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? '...' : '+ CSV'}
                </button>
              </>
            )}
          </div>
          <div style={{ padding: '0.3rem 0.5rem' }}>
            <input style={{ ...S.input, width: '100%' }} placeholder="Search channels..."
              value={channelSearch} onChange={e => setChannelSearch(e.target.value)} />
          </div>
          <div style={S.panelBody}>
            {filteredDatasets.length === 0 && (
              <div style={{ ...S.muted, textAlign: 'center', padding: '1rem 0' }}>
                No datasets. Upload a CSV to begin.
              </div>
            )}
            {filteredDatasets.map(ds => (
              <div key={ds.id} style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }} title={ds.name}>
                    {ds.name}
                  </span>
                  {canEdit && (
                    <button style={{ ...S.btn('danger'), fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}
                      onClick={() => handleDeleteDataset(ds.id)} title="Delete dataset">✕</button>
                  )}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)', marginBottom: '0.15rem' }}>
                  {ds.sample_count} samples · {ds.time_column || 'no time col'}
                </div>
                {/* Time offset */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>Offset:</span>
                  <input style={{ ...S.input, width: 50, fontSize: '0.6rem', padding: '0.1rem 0.2rem' }}
                    type="number" step="0.01" defaultValue={ds.time_offset}
                    onBlur={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v !== ds.time_offset) handleDatasetOffset(ds.id, v);
                    }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>s</span>
                </div>
                {/* Channel list */}
                {ds.channels.map((ch, ci) => {
                  const isVis = visibleChannels.has(ch.id);
                  return (
                    <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.1rem 0', cursor: 'pointer' }}
                      onClick={() => toggleChannel(ch.id)}>
                      <span style={{
                        width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                        background: isVis ? (ch.color || channelColor(ci)) : 'transparent',
                        border: `2px solid ${ch.color || channelColor(ci)}`,
                      }} />
                      <span style={{ fontSize: '0.68rem', fontWeight: isVis ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ch.name}
                      </span>
                      {ch.min_value != null && (
                        <span style={{ fontSize: '0.55rem', color: 'var(--color-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                          {ch.min_value.toFixed(1)}–{ch.max_value?.toFixed(1)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Center Panel: Chart ── */}
        <div style={S.centerPanel}>
          <div style={{ flex: 1, padding: '0.5rem', minHeight: 0 }}>
            {chartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', ...S.muted }}>
                {datasets.length === 0
                  ? 'Upload a CSV dataset and select channels to plot'
                  : 'Select channels from the left panel to plot'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  onClick={(e: any) => {
                    if (e?.activeLabel != null) handleChartClick(Number(e.activeLabel));
                  }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="__time" type="number" domain={['dataMin', 'dataMax']}
                    tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(2)} />
                  {visibleChannelList.map((ch, i) => (
                    <YAxis key={ch.id} yAxisId={`y_${ch.id}`} orientation={i % 2 === 0 ? 'left' : 'right'}
                      tick={{ fontSize: 8 }} width={45} domain={['auto', 'auto']}
                      hide={i > 1} />
                  ))}
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface, #1e1e2e)', border: '1px solid var(--color-border)', fontSize: '0.7rem' }}
                    formatter={(v: number, name: string) => [v?.toFixed(4), name]}
                    labelFormatter={(l: number) => `t = ${l?.toFixed(4)}s`}
                  />
                  {visibleChannelList.map((ch, i) => (
                    <Line key={ch.id} yAxisId={`y_${ch.id}`} dataKey={`ch_${ch.id}`}
                      name={`${ch.datasetName} · ${ch.name}`}
                      stroke={ch.color || channelColor(i)} dot={false} strokeWidth={1.5}
                      isAnimationActive={false} connectNulls />
                  ))}
                  {cursorTime != null && (
                    <ReferenceLine x={cursorTime} stroke="#fff" strokeWidth={1} strokeDasharray="4 2" />
                  )}
                  {measureStart != null && (
                    <ReferenceLine x={measureStart} stroke="#f59e0b" strokeWidth={2} strokeDasharray="2 2" label={{ value: 'M1', fill: '#f59e0b', fontSize: 10 }} />
                  )}
                  {measurements.map(m => (
                    <ReferenceLine key={`m1_${m.id}`} x={m.t1} stroke="#22c55e" strokeWidth={1} strokeDasharray="3 2" />
                  ))}
                  {measurements.map(m => (
                    <ReferenceLine key={`m2_${m.id}`} x={m.t2} stroke="#22c55e" strokeWidth={1} strokeDasharray="3 2" />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Bottom: Scrubber + Measurements ── */}
          <div style={S.bottomBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>Time:</span>
              <input type="range" style={{ flex: 1, accentColor: 'var(--color-primary)' }}
                min={timeRange.min} max={timeRange.max} step={0.001}
                value={cursorTime ?? timeRange.min}
                onChange={e => {
                  const t = parseFloat(e.target.value);
                  setCursorTime(t);
                  // Sync videos
                  for (const vid of videos) {
                    const el = videoRefs.current[vid.id];
                    if (el) el.currentTime = Math.max(0, t - vid.time_offset);
                  }
                }} />
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', minWidth: 70, textAlign: 'right' }}>
                {cursorTime != null ? `${cursorTime.toFixed(3)}s` : '—'}
              </span>
            </div>

            {/* Measurements list */}
            {measurements.length > 0 && (
              <div style={{ fontSize: '0.65rem' }}>
                <span style={{ fontWeight: 700, marginRight: '0.4rem' }}>Measurements:</span>
                {measurements.map(m => (
                  <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginRight: '0.6rem', background: 'rgba(34,197,94,0.1)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>
                    {m.label || `${m.t1.toFixed(3)}→${m.t2.toFixed(3)}`}
                    <span style={{ fontFamily: 'monospace' }}> Δ{m.delta_time.toFixed(4)}s</span>
                    {canEdit && (
                      <button style={{ ...S.btn('ghost'), fontSize: '0.55rem', padding: 0, color: '#ef4444' }}
                        onClick={() => handleDeleteMeasurement(m.id)}>✕</button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {measureMode && (
              <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '0.15rem' }}>
                📏 Measurement mode: {measureStart == null ? 'Click chart to set start point' : `Start at ${measureStart.toFixed(3)}s — click to set end point`}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Videos ── */}
        <div style={S.rightPanel}>
          <div style={S.panelHeader}>
            Videos
            {canEdit && (
              <>
                <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                  onChange={handleVideoUpload} />
                <button style={{ ...S.btn('primary'), marginLeft: '0.4rem', fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}
                  onClick={() => videoInputRef.current?.click()} disabled={uploading}>
                  {uploading ? '...' : '+ Video'}
                </button>
              </>
            )}
          </div>
          <div style={S.panelBody}>
            {videos.length === 0 && (
              <div style={{ ...S.muted, textAlign: 'center', padding: '1rem 0' }}>
                No videos. Upload a video file to begin.
              </div>
            )}
            {videos.map(vid => (
              <div key={vid.id} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={vid.name}>
                    {vid.name}
                  </span>
                  {canEdit && (
                    <button style={{ ...S.btn('danger'), fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}
                      onClick={() => handleDeleteVideo(vid.id)} title="Delete video">✕</button>
                  )}
                </div>
                <video
                  ref={el => { if (el) videoRefs.current[vid.id] = el; }}
                  src={vid.url}
                  style={{ width: '100%', borderRadius: 4, background: '#000' }}
                  controls={!playing}
                  muted
                  playsInline
                  onLoadedMetadata={e => {
                    const el = e.target as HTMLVideoElement;
                    if (vid.duration == null && el.duration && isFinite(el.duration)) {
                      incidentAnalysisApi.updateVideo(vid.id, { duration: el.duration });
                    }
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>Offset:</span>
                  <input style={{ ...S.input, width: 50, fontSize: '0.6rem', padding: '0.1rem 0.2rem' }}
                    type="number" step="0.1" defaultValue={vid.time_offset}
                    onBlur={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v !== vid.time_offset) handleVideoOffset(vid.id, v);
                    }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
