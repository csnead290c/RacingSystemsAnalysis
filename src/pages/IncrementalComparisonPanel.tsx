// Incremental Time Report – NHRA Compulink printout format
// Each column is independently sorted best-to-worst.
// Each cell shows car# + value, colored left-border by run of origin.
// Hover highlights all cells from the same run across columns.
// TF/FC: final ET/MPH uses 1000ft data (not 1320ft).
// groupBy: driver (default), engineCombo, or bodyStyle.
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parityApi, IncrementalComparisonRow, IncrementalComparisonResponse, EventWithStats } from '../services/parityApi';
import { useTheme } from '../shared/ui/theme';

/* ── types ───────────────────────────────────────────────────────────── */
type GroupBy = 'driver' | 'engineCombo' | 'bodyStyle';

interface RankedCell {
  carNumber: string;
  value: number;
  round: string;
  lane: string | null;
  dqFlag: boolean;
  driverName: string;
  runId: number;
  engineComboName: string | null;
  bodyStyleName: string | null;
}

/* ── helpers ─────────────────────────────────────────────────────────── */
const fmt3 = (v: number) => v.toFixed(3);
const fmt2 = (v: number) => v.toFixed(2);

const is1000ftClass = (cat: string) => {
  const c = (cat ?? '').toUpperCase().replace(/\s/g, '');
  return c === 'TF' || c === 'TOPFUEL' || c === 'FC' || c === 'FUNNYCAR';
};

/* ── dynamic color palette ────────────────────────────────────────── */
interface RunColor { bgPrint: string; fgDark: string; fgLight: string; border: string }
function generateRunColors(uniqueRounds: string[]): Map<string, RunColor> {
  const n = uniqueRounds.length;
  const map = new Map<string, RunColor>();
  const hueOffsets = [210, 25, 145, 330, 55, 280, 180, 100, 0, 240];
  for (let i = 0; i < n; i++) {
    const hue = i < hueOffsets.length ? hueOffsets[i] : (i * (360 / n)) % 360;
    map.set(uniqueRounds[i], {
      bgPrint: `hsl(${hue}, 45%, 88%)`,
      fgDark:  `hsl(${hue}, 75%, 68%)`,
      fgLight: `hsl(${hue}, 70%, 38%)`,
      border:  `hsl(${hue}, 65%, 50%)`,
    });
  }
  return map;
}

/* ── column definitions ──────────────────────────────────────────── */
interface ColumnDef {
  key: string;
  label: string;
  group: string;
  extract: (r: IncrementalComparisonRow) => number | null;
  format: (v: number) => string;
  sortDir: 'asc' | 'desc';
  isFinalET?: boolean;
}

const COLUMNS_1320: ColumnDef[] = [
  { key: 'ft60',         label: 'TIME',     group: '60 FT',    extract: r => r.ft60,         format: fmt3, sortDir: 'asc' },
  { key: 'inc60_330',    label: '60-330',    group: '60 FT',    extract: r => r.inc60_330,    format: fmt3, sortDir: 'asc' },
  { key: 'ft330',        label: 'E.T.',      group: '330 FT',   extract: r => r.ft330,        format: fmt3, sortDir: 'asc' },
  { key: 'inc330_660',   label: '330-660',   group: '330 FT',   extract: r => r.inc330_660,   format: fmt3, sortDir: 'asc' },
  { key: 'ft660',        label: 'E.T.',      group: '660 FT',   extract: r => r.ft660,        format: fmt3, sortDir: 'asc' },
  { key: 'mph660',       label: 'MPH',       group: '660 FT',   extract: r => r.mph660,       format: fmt2, sortDir: 'desc' },
  { key: 'inc660_1000',  label: '660-1000',  group: '660 FT',   extract: r => r.inc660_1000,  format: fmt3, sortDir: 'asc' },
  { key: 'ft1000',       label: 'E.T.',      group: '1000 FT',  extract: r => r.ft1000,       format: fmt3, sortDir: 'asc' },
  { key: 'inc1000_1320', label: '1000-1320', group: '1000 FT',  extract: r => r.inc1000_1320, format: fmt3, sortDir: 'asc' },
  { key: 'last18',       label: 'E.T.',      group: 'LAST 1/8', extract: r => r.last18,       format: fmt3, sortDir: 'asc' },
  { key: 'last18mph',    label: 'MPH',       group: 'LAST 1/8', extract: r => r.last18mph,    format: fmt2, sortDir: 'desc' },
  { key: 'ft1320',       label: 'E.T.',      group: '1/4',      extract: r => r.ft1320,       format: fmt3, sortDir: 'asc', isFinalET: true },
  { key: 'mph1320',      label: 'MPH',       group: '1/4',      extract: r => r.mph1320,      format: fmt2, sortDir: 'desc' },
];

const COLUMNS_1000: ColumnDef[] = [
  { key: 'ft60',         label: 'TIME',     group: '60 FT',    extract: r => r.ft60,         format: fmt3, sortDir: 'asc' },
  { key: 'inc60_330',    label: '60-330',    group: '60 FT',    extract: r => r.inc60_330,    format: fmt3, sortDir: 'asc' },
  { key: 'ft330',        label: 'E.T.',      group: '330 FT',   extract: r => r.ft330,        format: fmt3, sortDir: 'asc' },
  { key: 'inc330_660',   label: '330-660',   group: '330 FT',   extract: r => r.inc330_660,   format: fmt3, sortDir: 'asc' },
  { key: 'ft660',        label: 'E.T.',      group: '660 FT',   extract: r => r.ft660,        format: fmt3, sortDir: 'asc' },
  { key: 'mph660',       label: 'MPH',       group: '660 FT',   extract: r => r.mph660,       format: fmt2, sortDir: 'desc' },
  { key: 'inc660_1000',  label: '660-1000',  group: '660 FT',   extract: r => r.inc660_1000,  format: fmt3, sortDir: 'asc' },
  { key: 'ft1000',       label: 'E.T.',      group: 'FINAL',    extract: r => r.ft1000,       format: fmt3, sortDir: 'asc', isFinalET: true },
  { key: 'mph1000',      label: 'MPH',       group: 'FINAL',    extract: r => r.mph1000,      format: fmt2, sortDir: 'desc' },
];

/* ── groupBy label helper: what shows in each cell's car# spot ───── */
function cellLabel(row: IncrementalComparisonRow, groupBy: GroupBy): string {
  if (groupBy === 'engineCombo') return row.engineComboName ?? row.carNumber;
  if (groupBy === 'bodyStyle') return row.bodyStyleName ?? row.carNumber;
  return row.carNumber;
}

function buildRankings(runs: IncrementalComparisonRow[], columns: ColumnDef[], groupBy: GroupBy): Map<string, RankedCell[]> {
  const map = new Map<string, RankedCell[]>();
  for (const col of columns) {
    const cells: RankedCell[] = [];
    for (const run of runs) {
      const v = col.extract(run);
      if (v == null) continue;
      cells.push({
        carNumber: cellLabel(run, groupBy), value: v, round: run.round,
        lane: run.lane, dqFlag: run.dqFlag, driverName: run.driverName, runId: run.runId,
        engineComboName: run.engineComboName, bodyStyleName: run.bodyStyleName,
      });
    }
    cells.sort((a, b) => col.sortDir === 'asc' ? a.value - b.value : b.value - a.value);
    map.set(col.key, cells);
  }
  return map;
}

/* ── tooltip component ───────────────────────────────────────────────── */
function CellTooltip({ cell, x, y, isDark }: { cell: RankedCell; x: number; y: number; isDark: boolean }) {
  const tipH = 105;
  const tipW = 220;
  const pad = 10;
  let left = x + pad;
  let top = y - tipH - pad;
  if (top < 4) top = y + pad + 4;
  if (left + tipW > window.innerWidth - 4) left = x - tipW - pad;
  const lbl: React.CSSProperties = { opacity: 0.6, marginRight: 4 };
  return (
    <div style={{
      position: 'fixed', left, top, zIndex: 9999, width: tipW,
      background: isDark ? '#1e293b' : '#ffffff',
      border: `1px solid ${isDark ? '#475569' : '#d1d5db'}`,
      borderRadius: 6, padding: '6px 10px', fontSize: '0.74rem',
      color: isDark ? '#f1f5f9' : '#1e293b',
      pointerEvents: 'none', boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.15)',
      lineHeight: 1.6,
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{cell.driverName}</div>
      <div><span style={lbl}>Car #:</span>{cell.carNumber}</div>
      <div><span style={lbl}>Round:</span>{cell.round}</div>
      {cell.lane && <div><span style={lbl}>Lane:</span>{cell.lane}</div>}
      {cell.engineComboName && <div><span style={lbl}>Engine:</span>{cell.engineComboName}</div>}
      {cell.bodyStyleName && <div><span style={lbl}>Body:</span>{cell.bodyStyleName}</div>}
      {cell.dqFlag && <div style={{ color: '#ef4444', fontWeight: 'bold' }}>DISQUALIFIED</div>}
    </div>
  );
}

/* ── component ───────────────────────────────────────────────────────── */
const IncrementalComparisonPanel: React.FC<{
  event: EventWithStats | null;
  category?: string;
  classIndex?: string;
}> = ({ event, category = '', classIndex = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<IncrementalComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<'' | 'qualifying' | 'elimination'>('');
  const [mode, setMode] = useState<'raw' | 'corrected'>('raw');
  const [groupBy, setGroupBy] = useState<GroupBy>('driver');
  const [hoveredRunId, setHoveredRunId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ cell: RankedCell; x: number; y: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filterOutliers, setFilterOutliers] = useState(true);
  const [outlierPct, setOutlierPct] = useState(15);
  const tableRef = useRef<HTMLDivElement>(null);

  const use1000 = is1000ftClass(category || classIndex);
  const COLUMNS = use1000 ? COLUMNS_1000 : COLUMNS_1320;

  useEffect(() => {
    if (!event) return;
    setLoading(true);
    setError('');
    parityApi.incrementalComparison({
      eventId: event.id,
      category: category || undefined,
      classIndex: classIndex || undefined,
      session: session || undefined,
      mode,
    })
    .then(setData)
    .catch(err => setError(err instanceof Error ? err.message : 'Failed to load data'))
    .finally(() => setLoading(false));
  }, [event?.id, category, classIndex, session, mode]);

  const rankings = useMemo(() => {
    if (!data || !data.rows.length) return null;
    return buildRankings(data.rows, COLUMNS, groupBy);
  }, [data, COLUMNS, groupBy]);

  const numRows = useMemo(() => {
    if (!rankings) return 0;
    let max = 0;
    rankings.forEach(cells => { if (cells.length > max) max = cells.length; });
    return max;
  }, [rankings]);

  // Determine the best final ET run (rank 0 in the final ET column) for PDF highlight
  const bestFinalRunId = useMemo(() => {
    if (!rankings) return null;
    const finalCol = COLUMNS.find(c => c.isFinalET);
    if (!finalCol) return null;
    const cells = rankings.get(finalCol.key);
    return cells && cells.length > 0 ? cells[0].runId : null;
  }, [rankings, COLUMNS]);

  const runColorMap = useMemo(() => {
    if (!data) return new Map<string, RunColor>();
    const rounds = [...new Set(data.rows.map(r => r.round))];
    rounds.sort();
    return generateRunColors(rounds);
  }, [data]);

  const groups = useMemo(() => {
    const g: { group: string; cols: ColumnDef[] }[] = [];
    for (const col of COLUMNS) {
      const last = g[g.length - 1];
      if (last && last.group === col.group) { last.cols.push(col); }
      else { g.push({ group: col.group, cols: [col] }); }
    }
    return g;
  }, [COLUMNS]);

  /* ── theme-aware styles ─────────────────────────────────────────── */
  const thS: React.CSSProperties = {
    padding: '5px 7px', textAlign: 'center', fontWeight: 700,
    borderBottom: `2px solid ${isDark ? '#4b5563' : '#9ca3af'}`,
    fontSize: '0.72rem', whiteSpace: 'nowrap',
    color: isDark ? '#e5e7eb' : '#1f2937',
    backgroundColor: isDark ? '#1e293b' : '#e5e7eb',
  };
  const tdS: React.CSSProperties = {
    padding: '3px 6px', textAlign: 'right',
    borderBottom: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
    fontSize: '0.78rem', fontFamily: "'Courier New', Courier, monospace",
    whiteSpace: 'nowrap', color: isDark ? '#e5e7eb' : '#1e293b',
    verticalAlign: 'middle', cursor: 'default', position: 'relative',
  };
  const selS: React.CSSProperties = {
    padding: '0.35rem 0.6rem', borderRadius: 4,
    border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#e5e7eb' : '#1e293b', fontSize: '0.82rem',
  };
  const hoverBg = isDark ? 'rgba(250,204,21,0.22)' : 'rgba(250,204,21,0.28)';
  const hoverOutline = isDark ? '2px solid rgba(250,204,21,0.5)' : '2px solid rgba(202,138,4,0.5)';
  const rowEven = isDark ? '#0f172a' : '#ffffff';
  const rowOdd  = isDark ? '#1e293b' : '#f8fafc';
  const groupBorderColor = isDark ? '#475569' : '#9ca3af';
  const borderColor = isDark ? '#334155' : '#e5e7eb';
  const mutedText = isDark ? '#94a3b8' : '#6b7280';

  /* ── PDF export (portrait, best-run highlight, proper legend) ────── */
  const exportPDF = useCallback(async () => {
    if (!rankings || !numRows || !event) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pw = doc.internal.pageSize.getWidth();
      const ml = 8;
      const mr = 8;
      const modeLabel = mode === 'corrected' ? 'Corrected' : 'Raw';
      const sessionLabel = session === 'qualifying' ? 'Qualifying' : session === 'elimination' ? 'Eliminations' : 'All Sessions';

      let y = 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`NHRA ${category || classIndex} Incremental Comparison – ${modeLabel}`, ml, y);
      y += 4.5;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${event.event_name ?? ''} | ${sessionLabel} | ${data?.totalRuns ?? 0} runs`, ml, y);
      doc.text(new Date().toLocaleDateString(), pw - mr, y, { align: 'right' });
      doc.setTextColor(0);
      y += 3;
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.line(ml, y, pw - mr, y);
      y += 2;

      const head = [COLUMNS.map(c => `${c.group}\n${c.label}`)];
      const body: string[][] = [];
      for (let rank = 0; rank < numRows; rank++) {
        const row: string[] = [];
        for (const col of COLUMNS) {
          const cells = rankings.get(col.key) ?? [];
          const c = cells[rank];
          row.push(c ? `${c.carNumber}  ${col.format(c.value)}` : '');
        }
        body.push(row);
      }

      // HSL to RGB for PDF cell colors
      const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
        return [f(0), f(8), f(4)];
      };
      const roundToPrintColor = new Map<string, [number, number, number]>();
      runColorMap.forEach((rc, round) => {
        const m = rc.bgPrint.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (m) roundToPrintColor.set(round, hslToRgb(+m[1], +m[2] / 100, +m[3] / 100));
      });

      autoTable(doc, {
        startY: y,
        head,
        body,
        theme: 'grid',
        styles: { fontSize: 4.8, cellPadding: 0.8, font: 'courier', halign: 'right', overflow: 'ellipsize', lineWidth: 0.2 },
        headStyles: { fillColor: [50, 50, 60], textColor: [230, 230, 230], fontSize: 4.5, halign: 'center', cellPadding: 1 },
        didParseCell(data2) {
          if (data2.section === 'body') {
            const col = COLUMNS[data2.column.index];
            if (col) {
              const c = (rankings.get(col.key) ?? [])[data2.row.index];
              if (c) {
                const rgb = roundToPrintColor.get(c.round);
                if (rgb) data2.cell.styles.fillColor = rgb;
                // Highlight best final ET run with a bold border
                if (bestFinalRunId !== null && c.runId === bestFinalRunId) {
                  data2.cell.styles.lineWidth = 0.6;
                  data2.cell.styles.lineColor = [220, 38, 38];
                  data2.cell.styles.fontStyle = 'bold';
                }
              }
            }
          }
        },
        margin: { left: ml, right: mr },
      });

      // Legend block with colored swatches
      let ly = (doc as any).lastAutoTable?.finalY ?? 240;
      ly += 4;
      if (ly > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); ly = 12; }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60);
      doc.text('LEGEND', ml, ly);
      ly += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      let lx = ml;
      runColorMap.forEach((_rc, round) => {
        const rgb = roundToPrintColor.get(round);
        if (rgb) {
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(lx, ly - 2.5, 10, 3.2, 'F');
          doc.setTextColor(40);
          doc.text(round, lx + 5, ly, { align: 'center' });
          lx += 13;
        }
      });
      // Best run indicator
      lx += 4;
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.6);
      doc.rect(lx, ly - 2.5, 10, 3.2, 'S');
      doc.setTextColor(40);
      doc.text('Best Run', lx + 12, ly);

      ly += 5;
      doc.setTextColor(100);
      doc.setDrawColor(0);
      doc.setLineWidth(0.1);
      doc.text('Each column is sorted independently from best to worst.', ml, ly);
      ly += 3;
      doc.text('The label before each value identifies the run (car #, engine combo, or body style).', ml, ly);
      ly += 3;
      doc.text('Background colors indicate which round/session the run came from (see swatches above).', ml, ly);
      ly += 3;
      doc.text('Red-bordered cells highlight the best overall final E.T. run across all columns.', ml, ly);

      doc.save(`incremental-report-${event.race_lookup ?? 'export'}-${modeLabel.toLowerCase()}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  }, [rankings, numRows, event, mode, session, category, classIndex, data, runColorMap, COLUMNS, bestFinalRunId]);

  /* ── hover handlers ──────────────────────────────────────────────── */
  const handleCellEnter = useCallback((cell: RankedCell, e: React.MouseEvent) => {
    setHoveredRunId(cell.runId);
    setTooltip({ cell, x: e.clientX, y: e.clientY });
  }, []);
  const handleCellMove = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);
  const handleCellLeave = useCallback(() => {
    setHoveredRunId(null);
    setTooltip(null);
  }, []);

  if (!event) return <div style={{ padding: '1rem', color: 'var(--color-muted)' }}>Please select an event</div>;

  return (
    <div style={{ padding: '0.5rem 0.5rem', maxWidth: '100%' }}>
      {tooltip && <CellTooltip cell={tooltip.cell} x={tooltip.x} y={tooltip.y} isDark={isDark} />}

      {/* ── toolbar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={session} onChange={e => setSession(e.target.value as any)} style={selS}>
          <option value="">All Sessions</option>
          <option value="qualifying">Qualifying</option>
          <option value="elimination">Eliminations</option>
        </select>
        <select value={mode} onChange={e => setMode(e.target.value as any)} style={selS}>
          <option value="raw">Raw</option>
          <option value="corrected">Corrected</option>
        </select>
        <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)} style={selS}>
          <option value="driver">By Driver</option>
          <option value="engineCombo">By Engine Combo</option>
          <option value="bodyStyle">By Body Style</option>
        </select>
        {/* Outlier filter */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={filterOutliers} onChange={e => setFilterOutliers(e.target.checked)} />
          Hide &gt;
          <input
            type="number" min={1} max={99} value={outlierPct}
            onChange={e => setOutlierPct(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 15)))}
            style={{ width: 42, padding: '0.15rem 0.25rem', border: `1px solid ${borderColor}`, borderRadius: 3, background: 'transparent', color: 'inherit', fontSize: '0.78rem', textAlign: 'center' }}
          />
          % off best
        </label>
        <button onClick={exportPDF} disabled={!numRows || exporting}
          style={{ padding: '0.35rem 0.9rem', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem', opacity: exporting ? 0.5 : 1 }}>
          {exporting ? 'Exporting…' : 'Export PDF'}
        </button>
        {data && (
          <span style={{ marginLeft: 'auto', color: mutedText, fontSize: '0.78rem' }}>
            {data.totalRuns} run{data.totalRuns !== 1 ? 's' : ''} from {new Set(data.rows.map(r => r.driverName)).size} drivers
            {use1000 && <span style={{ marginLeft: 6, color: isDark ? '#60a5fa' : '#2563eb' }}>● 1000ft Final</span>}
            {mode === 'corrected' && <span style={{ marginLeft: 6, color: '#f59e0b' }}>● Corrected</span>}
          </span>
        )}
      </div>

      {loading && <div style={{ color: mutedText, padding: '1rem' }}>Loading...</div>}
      {error && <div style={{ color: '#ef4444', padding: '0.5rem 0' }}>{error}</div>}

      {/* ── table ───────────────────────────────────────────────────── */}
      {rankings && numRows > 0 && (
        <div ref={tableRef} style={{ overflowX: 'auto', border: `1px solid ${borderColor}`, borderRadius: 6 }}>
          <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: isDark ? '#0f172a' : '#d1d5db' }}>
                {groups.map(g => (
                  <th key={g.group} colSpan={g.cols.length} style={{ ...thS, borderRight: `1px solid ${groupBorderColor}`, letterSpacing: '0.04em' }}>
                    {g.group}
                  </th>
                ))}
              </tr>
              <tr style={{ backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }}>
                {COLUMNS.map((col, ci) => {
                  const isGroupEnd = ci === COLUMNS.length - 1 || COLUMNS[ci + 1].group !== col.group;
                  return (
                    <th key={col.key} style={{
                      ...thS,
                      ...(isGroupEnd ? { borderRight: `1px solid ${groupBorderColor}` } : {}),
                    }}>{col.label}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numRows }, (_, rank) => (
                <tr key={rank} style={{ backgroundColor: rank % 2 === 0 ? rowEven : rowOdd }}>
                  {COLUMNS.map((col, ci) => {
                    const cells = rankings.get(col.key) ?? [];
                    const c = cells[rank];
                    const isGroupEnd = ci === COLUMNS.length - 1 || COLUMNS[ci + 1].group !== col.group;

                    if (!c) {
                      return <td key={col.key} style={{ ...tdS, color: borderColor, ...(isGroupEnd ? { borderRight: `1px solid ${borderColor}` } : {}) }}>—</td>;
                    }

                    // Outlier suppression: hide cells more than outlierPct% off best
                    if (filterOutliers && cells.length > 0) {
                      const best = cells[0].value;
                      const isOutlier = col.sortDir === 'asc'
                        ? c.value > best * (1 + outlierPct / 100)
                        : c.value < best * (1 - outlierPct / 100);
                      if (isOutlier) {
                        return <td key={col.key} style={{ ...tdS, color: borderColor, ...(isGroupEnd ? { borderRight: `1px solid ${borderColor}` } : {}) }} title={`Outlier suppressed (>${outlierPct}% off best)`}>·</td>;
                      }
                    }

                    const isHovered = hoveredRunId !== null && c.runId === hoveredRunId;
                    const rc = runColorMap.get(c.round);
                    const fg = rc ? (isDark ? rc.fgDark : rc.fgLight) : mutedText;

                    return (
                      <td key={col.key}
                        onMouseEnter={e => handleCellEnter(c, e)}
                        onMouseMove={handleCellMove}
                        onMouseLeave={handleCellLeave}
                        style={{
                          ...tdS,
                          backgroundColor: isHovered ? hoverBg : 'transparent',
                          borderLeft: rc ? `3px solid ${rc.border}` : undefined,
                          ...(isGroupEnd ? { borderRight: `1px solid ${borderColor}` } : {}),
                          ...(isHovered ? { outline: hoverOutline, outlineOffset: '-1px', zIndex: 1 } : {}),
                        }}
                      >
                        <span style={{ color: fg, fontSize: '0.62rem', fontWeight: 700, marginRight: 3 }}>{c.carNumber}</span>
                        <span>{col.format(c.value)}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {numRows === 0 && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '2rem', color: mutedText }}>No data matches the current filters</div>
      )}

      {/* ── legend ──────────────────────────────────────────────────── */}
      {numRows > 0 && (
        <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: mutedText, display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Rounds:</span>
          {[...runColorMap.entries()].map(([round, rc]) => (
            <span key={round} style={{
              display: 'inline-flex', alignItems: 'center',
              borderLeft: `3px solid ${rc.border}`,
              padding: '1px 6px', borderRadius: 3,
            }}>
              <span style={{ color: isDark ? rc.fgDark : rc.fgLight, fontWeight: 700 }}>{round}</span>
            </span>
          ))}
          <span style={{ color: borderColor }}>│</span>
          <span>Columns sorted best → worst</span>
          <span>Colored label = {groupBy === 'engineCombo' ? 'engine combo' : groupBy === 'bodyStyle' ? 'body style' : 'car #'}</span>
          <span>Hover = highlight run</span>
        </div>
      )}
    </div>
  );
};

export default IncrementalComparisonPanel;
