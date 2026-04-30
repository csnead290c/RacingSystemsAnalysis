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
import type { RunIncident } from '../services/incidentsApi';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
  ScatterChart, Scatter, BarChart, Bar,
} from 'recharts';
import { ResizablePanel } from '../components/workspace/ResizablePanel';

// ── Default channel colors ──────────────────────────────────────────────

const CHANNEL_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#e11d48', '#0ea5e9', '#84cc16', '#d946ef', '#64748b',
];

function channelColor(idx: number): string {
  return CHANNEL_COLORS[idx % CHANNEL_COLORS.length];
}

// ── Multi-plot model ────────────────────────────────────────────────

type PanelType = 'timeSeries' | 'xy' | 'histogram' | 'eventList';

interface XYConfig {
  xChannelId: number | string | null; // Batch F: Support derived channel IDs (strings)
  yChannelId: number | string | null;
}

interface HistogramConfig {
  channelId: number | string | null; // Batch F: Support derived channel IDs (strings)
  binCount: number;
}

interface Plot {
  id: string;
  title: string;
  channelIds: (number | string)[]; // Batch F: Support derived channel IDs (strings)
  height: number;
  // Batch D: Plot settings
  autoScale?: boolean;
  yMin?: number;
  yMax?: number;
  // Batch E: Panel type and configs
  panelType?: PanelType; // Default: 'timeSeries'
  xyConfig?: XYConfig;
  histogramConfig?: HistogramConfig;
}

// ── Batch F: Derived Channels ──────────────────────────────────────

// Derived channel model (Batch F.1: added dependencies for circular detection)
interface DerivedChannel {
  id: string;
  label: string;
  expression: string;
  dependencies: string[]; // Channel keys referenced in expression
  unit?: string;
  color?: string;
  error?: string; // Validation/evaluation error if any
}

// Extended channel type that includes both raw and derived
interface ExtendedChannel {
  id: number | string;
  name: string;
  unit: string | null;
  color?: string | null;
  datasetName?: string;
  isDerived?: boolean;
  expression?: string;
  error?: string;
}

// ── Batch F.1: Truly Safe Expression Engine ────────────────────────

// Token types for expression parsing
type TokenType = 'NUMBER' | 'CHANNEL' | 'PLUS' | 'MINUS' | 'MULTIPLY' | 'DIVIDE' | 'LPAREN' | 'RPAREN' | 'FUNCTION' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string | number;
  pos: number;
}

// Tokenize expression into tokens
function tokenizeExpression(expr: string): { tokens: Token[]; error?: string } {
  const tokens: Token[] = [];
  let pos = 0;
  
  while (pos < expr.length) {
    const char = expr[pos];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      pos++;
      continue;
    }
    
    // Numbers
    if (/[0-9]/.test(char)) {
      let numStr = '';
      while (pos < expr.length && /[0-9.]/.test(expr[pos])) {
        numStr += expr[pos];
        pos++;
      }
      const num = parseFloat(numStr);
      if (isNaN(num)) {
        return { tokens: [], error: `Invalid number: ${numStr}` };
      }
      tokens.push({ type: 'NUMBER', value: num, pos });
      continue;
    }
    
    // Channel references: $key
    if (char === '$') {
      pos++; // skip $
      let key = '';
      while (pos < expr.length && /[a-zA-Z0-9_]/.test(expr[pos])) {
        key += expr[pos];
        pos++;
      }
      if (!key) {
        return { tokens: [], error: 'Invalid channel reference: $ must be followed by key' };
      }
      tokens.push({ type: 'CHANNEL', value: key, pos });
      continue;
    }
    
    // Functions: abs, min, max
    if (/[a-z]/.test(char)) {
      let name = '';
      const startPos = pos;
      while (pos < expr.length && /[a-z]/.test(expr[pos])) {
        name += expr[pos];
        pos++;
      }
      if (name === 'abs' || name === 'min' || name === 'max') {
        tokens.push({ type: 'FUNCTION', value: name, pos: startPos });
      } else {
        return { tokens: [], error: `Unknown function: ${name}` };
      }
      continue;
    }
    
    // Operators and punctuation
    switch (char) {
      case '+': tokens.push({ type: 'PLUS', value: '+', pos }); pos++; break;
      case '-': tokens.push({ type: 'MINUS', value: '-', pos }); pos++; break;
      case '*': tokens.push({ type: 'MULTIPLY', value: '*', pos }); pos++; break;
      case '/': tokens.push({ type: 'DIVIDE', value: '/', pos }); pos++; break;
      case '(': tokens.push({ type: 'LPAREN', value: '(', pos }); pos++; break;
      case ')': tokens.push({ type: 'RPAREN', value: ')', pos }); pos++; break;
      case ',': tokens.push({ type: 'COMMA', value: ',', pos }); pos++; break;
      default:
        return { tokens: [], error: `Invalid character: ${char}` };
    }
  }
  
  tokens.push({ type: 'EOF', value: '', pos });
  return { tokens };
}

// Extract channel dependencies from expression
function extractDependencies(expr: string): string[] {
  const { tokens, error } = tokenizeExpression(expr);
  if (error) return [];
  
  const deps = new Set<string>();
  for (const token of tokens) {
    if (token.type === 'CHANNEL') {
      deps.add(String(token.value));
    }
  }
  return Array.from(deps);
}

// Parse and evaluate expression with recursive descent parser
function evaluateExpression(
  expression: string,
  channelValues: Record<string, number | null>,
  allChannels: ExtendedChannel[]
): { value: number | null; error?: string; dependencies?: string[] } {
  const { tokens, error: tokenError } = tokenizeExpression(expression);
  if (tokenError) {
    return { value: null, error: tokenError };
  }
  
  const dependencies = extractDependencies(expression);
  
  // Check all dependencies exist
  for (const dep of dependencies) {
    if (channelValues[dep] === undefined) {
      return { value: null, error: `Unknown channel: $${dep}`, dependencies };
    }
  }
  
  // Check for null values
  for (const dep of dependencies) {
    if (channelValues[dep] === null) {
      return { value: null, dependencies }; // Missing data, not an error
    }
  }
  
  let pos = 0;
  
  const peek = (): Token => tokens[pos];
  const consume = (): Token => tokens[pos++];
  
  // Recursive descent parser
  const parseExpression = (): number => {
    let left = parseTerm();
    
    while (peek().type === 'PLUS' || peek().type === 'MINUS') {
      const op = consume();
      const right = parseTerm();
      if (op.type === 'PLUS') {
        left = left + right;
      } else {
        left = left - right;
      }
    }
    
    return left;
  };
  
  const parseTerm = (): number => {
    let left = parseFactor();
    
    while (peek().type === 'MULTIPLY' || peek().type === 'DIVIDE') {
      const op = consume();
      const right = parseFactor();
      if (op.type === 'MULTIPLY') {
        left = left * right;
      } else {
        if (right === 0) {
          throw new Error('Division by zero');
        }
        left = left / right;
      }
    }
    
    return left;
  };
  
  const parseFactor = (): number => {
    const token = peek();
    
    // Unary minus
    if (token.type === 'MINUS') {
      consume();
      return -parseFactor();
    }
    
    // Number
    if (token.type === 'NUMBER') {
      consume();
      return Number(token.value);
    }
    
    // Channel reference
    if (token.type === 'CHANNEL') {
      consume();
      const key = String(token.value);
      return channelValues[key]!; // Already validated non-null
    }
    
    // Function call
    if (token.type === 'FUNCTION') {
      const funcToken = consume();
      const funcName = String(funcToken.value);
      
      if (peek().type !== 'LPAREN') {
        throw new Error(`Expected '(' after function ${funcName}`);
      }
      consume(); // (
      
      if (funcName === 'abs') {
        const arg = parseExpression();
        if (peek().type !== 'RPAREN') {
          throw new Error(`Expected ')' after abs argument`);
        }
        consume(); // )
        return Math.abs(arg);
      }
      
      if (funcName === 'min' || funcName === 'max') {
        const arg1 = parseExpression();
        if (peek().type !== 'COMMA') {
          throw new Error(`Expected ',' in ${funcName} function`);
        }
        consume(); // ,
        const arg2 = parseExpression();
        if (peek().type !== 'RPAREN') {
          throw new Error(`Expected ')' after ${funcName} arguments`);
        }
        consume(); // )
        return funcName === 'min' ? Math.min(arg1, arg2) : Math.max(arg1, arg2);
      }
      
      throw new Error(`Unknown function: ${funcName}`);
    }
    
    // Parenthesized expression
    if (token.type === 'LPAREN') {
      consume();
      const result = parseExpression();
      if (peek().type !== 'RPAREN') {
        throw new Error('Expected closing parenthesis');
      }
      consume();
      return result;
    }
    
    throw new Error(`Unexpected token: ${token.type}`);
  };
  
  try {
    const result = parseExpression();
    
    if (peek().type !== 'EOF') {
      return { value: null, error: 'Unexpected tokens after expression', dependencies };
    }
    
    if (!isFinite(result)) {
      return { value: null, error: 'Result is not a finite number', dependencies };
    }
    
    return { value: result, dependencies };
  } catch (err: any) {
    return { value: null, error: err.message || 'Evaluation failed', dependencies };
  }
}

// Validate expression syntax and dependencies
function validateExpression(
  expression: string,
  allChannels: ExtendedChannel[]
): { valid: boolean; error?: string; dependencies?: string[] } {
  if (!expression.trim()) {
    return { valid: false, error: 'Expression cannot be empty' };
  }
  
  // Build channel key map
  const channelKeys = new Set<string>();
  allChannels.forEach(ch => {
    channelKeys.add(String(ch.id));
  });
  
  // Try to evaluate with dummy data
  const dummyValues: Record<string, number | null> = {};
  allChannels.forEach(ch => {
    dummyValues[String(ch.id)] = 1.0;
  });
  
  const result = evaluateExpression(expression, dummyValues, allChannels);
  
  if (result.error) {
    return { valid: false, error: result.error, dependencies: result.dependencies };
  }
  
  return { valid: true, dependencies: result.dependencies };
}

// ── CSV parser (client-side, quoted-field-aware) ────────────────────────

interface ParsedData {
  timeColumn: string | null;
  timeUnit: string;
  columns: string[];
  rows: Record<string, number | null>[];
}

/** Max rows to send to Recharts — larger datasets are decimated. */
const MAX_CHART_POINTS = 10_000;

/**
 * Parse a single CSV line respecting quoted fields.
 * Handles: "value,with,commas", empty fields, CRLF.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  const len = line.length;
  while (i <= len) {
    if (i === len) { fields.push(''); break; }
    if (line[i] === '"') {
      // Quoted field
      let val = '';
      i++; // skip opening quote
      while (i < len) {
        if (line[i] === '"') {
          if (i + 1 < len && line[i + 1] === '"') {
            val += '"'; i += 2;
          } else {
            i++; break; // closing quote
          }
        } else {
          val += line[i]; i++;
        }
      }
      fields.push(val);
      if (i < len && line[i] === ',') i++; // skip comma after quote
    } else {
      // Unquoted field
      const next = line.indexOf(',', i);
      if (next === -1) {
        fields.push(line.slice(i).trim());
        break;
      } else {
        fields.push(line.slice(i, next).trim());
        i = next + 1;
      }
    }
  }
  return fields;
}

function parseCsvText(text: string, dataset: AnalysisDataset): ParsedData {
  // Normalize line endings and split
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  // Find first non-empty line as header
  let headerIdx = 0;
  while (headerIdx < lines.length && lines[headerIdx].trim() === '') headerIdx++;
  if (headerIdx >= lines.length - 1) return { timeColumn: null, timeUnit: 'seconds', columns: [], rows: [] };

  const headers = parseCsvLine(lines[headerIdx]).map(h => h.trim());
  // Deduplicate headers: append _2, _3, etc.
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map(h => {
    const count = seen.get(h) || 0;
    seen.set(h, count + 1);
    return count > 0 ? `${h}_${count + 1}` : h;
  });

  const timeCol = dataset.time_column;
  const timeIdx = timeCol ? uniqueHeaders.indexOf(timeCol) : -1;
  const timeDivisor = dataset.time_unit === 'milliseconds' ? 1000 : 1;

  const rows: Record<string, number | null>[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue; // skip blank rows
    const vals = parseCsvLine(line);
    const row: Record<string, number | null> = {};
    for (let j = 0; j < uniqueHeaders.length; j++) {
      const v = vals[j]?.trim();
      if (v === '' || v === undefined) { row[uniqueHeaders[j]] = null; continue; }
      const num = parseFloat(v);
      row[uniqueHeaders[j]] = isNaN(num) ? null : num;
    }
    // Normalize time
    if (timeIdx >= 0 && row[uniqueHeaders[timeIdx]] != null) {
      row['__time'] = (row[uniqueHeaders[timeIdx]]! / timeDivisor) + dataset.time_offset;
    }
    rows.push(row);
  }

  return { timeColumn: timeCol, timeUnit: dataset.time_unit, columns: uniqueHeaders, rows };
}

/**
 * Decimate rows to at most maxPoints using LTTB-like nth-point sampling.
 * Preserves first and last point.
 */
function decimateRows<T>(rows: T[], maxPoints: number): T[] {
  if (rows.length <= maxPoints) return rows;
  const step = (rows.length - 1) / (maxPoints - 1);
  const result: T[] = [rows[0]];
  for (let i = 1; i < maxPoints - 1; i++) {
    result.push(rows[Math.round(i * step)]);
  }
  result.push(rows[rows.length - 1]);
  return result;
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
  const canEdit = can('incidents.create');

  // ── Core state ──────────────────────────────────────────────────────
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [datasets, setDatasets] = useState<AnalysisDataset[]>([]);
  const [videos, setVideos] = useState<AnalysisVideo[]>([]);
  const [measurements, setMeasurements] = useState<AnalysisMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorHint, setErrorHint] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [incident, _setIncident] = useState<RunIncident | null>(null);

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

  // ── Upload state (separate for CSV vs video) ───────────────────────
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Save/dirty tracking ────────────────────────────────────────────
  const [dirty, setDirty] = useState(false);
  const [saveFlash, setSaveFlash] = useState('');
  const savedLayoutRef = useRef<string>('');

  // ── Batch F: Derived channels ───────────────────────────────────────
  const [derivedChannels, setDerivedChannels] = useState<DerivedChannel[]>([]);
  const [showDerivedChannelModal, setShowDerivedChannelModal] = useState(false);
  const [editingDerivedChannel, setEditingDerivedChannel] = useState<DerivedChannel | null>(null);
  const [derivedFormLabel, setDerivedFormLabel] = useState('');
  const [derivedFormExpression, setDerivedFormExpression] = useState('');
  const [derivedFormUnit, setDerivedFormUnit] = useState('');
  const [derivedFormError, setDerivedFormError] = useState('');

  // ── Batch G: Compare/reference workflow ─────────────────────────────
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [referenceSessionId, setReferenceSessionId] = useState<number | null>(null);
  const [referenceSession, setReferenceSession] = useState<AnalysisSession | null>(null);
  const [referenceDatasets, setReferenceDatasets] = useState<AnalysisDataset[]>([]);
  const [referenceParsedDataMap, setReferenceParsedDataMap] = useState<Record<number, ParsedData>>({});
  const [showCompareSelector, setShowCompareSelector] = useState(false);

  // ── Delete confirmation ────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'dataset' | 'video'; id: number } | null>(null);

  // ── Batch A1: Resizable panel widths ───────────────────────────────
  const [leftPanelWidth, setLeftPanelWidth] = useState(240);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);

  // ── Batch A2: Multi-plot support ───────────────────────────────────
  const [plots, setPlots] = useState<Plot[]>([
    { id: 'plot-1', title: 'Plot 1', channelIds: [], height: 400 }
  ]);
  const [activePlotId, setActivePlotId] = useState<string>('plot-1');

  // ── Batch B: Linked time-window and reference cursor ───────────────
  const [visibleTimeStart, setVisibleTimeStart] = useState<number | null>(null);
  const [visibleTimeEnd, setVisibleTimeEnd] = useState<number | null>(null);
  const [referenceCursorTime, setReferenceCursorTime] = useState<number | null>(null);
  const [referenceCursorEnabled, setReferenceCursorEnabled] = useState(false);

  // ── Batch C: Selection and direct interaction ──────────────────────
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);

  // ── Batch D: Plot settings ─────────────────────────────────────────
  const [editingPlotId, setEditingPlotId] = useState<string | null>(null);

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

      // Restore layout state
      const layout = sessionRes.session.layout_json;
      if (layout?.visibleChannelIds) {
        setVisibleChannels(new Set(layout.visibleChannelIds));
      }
      if (layout?.playbackSpeed != null) {
        setPlaybackSpeed(layout.playbackSpeed);
      }
      if (layout?.cursorTime != null) {
        setCursorTime(layout.cursorTime);
      }
      // Batch A1: Restore panel widths
      if (layout?.leftPanelWidth != null && typeof layout.leftPanelWidth === 'number') {
        setLeftPanelWidth(layout.leftPanelWidth);
      }
      if (layout?.rightPanelWidth != null && typeof layout.rightPanelWidth === 'number') {
        setRightPanelWidth(layout.rightPanelWidth);
      }
      // Batch A2: Restore plots and active plot
      if (layout?.plots != null && Array.isArray(layout.plots)) {
        setPlots(layout.plots);
      } else if (layout?.visibleChannelIds && layout.visibleChannelIds.length > 0) {
        // Backward compatibility: create default plot from visible channels
        const height = (layout?.plotHeight != null && typeof layout.plotHeight === 'number') ? layout.plotHeight : 400;
        setPlots([{ 
          id: 'plot-1', 
          title: 'Plot 1', 
          channelIds: layout.visibleChannelIds,
          height 
        }]);
      }
      if (layout?.activePlotId != null && typeof layout.activePlotId === 'string') {
        setActivePlotId(layout.activePlotId);
      }
      
      // Batch F.1: Restore and revalidate derived channels
      if (layout?.derivedChannels != null && Array.isArray(layout.derivedChannels)) {
        // Revalidate each derived channel on load
        const revalidatedChannels = layout.derivedChannels.map((dc: any) => {
          // Ensure dependencies field exists
          if (!dc.dependencies) {
            dc.dependencies = extractDependencies(dc.expression || '');
          }
          
          // Revalidate expression (will be done when datasets load)
          return {
            id: dc.id,
            label: dc.label,
            expression: dc.expression,
            dependencies: dc.dependencies,
            unit: dc.unit,
            color: dc.color,
            error: undefined, // Clear old errors, will revalidate
          } as DerivedChannel;
        });
        setDerivedChannels(revalidatedChannels);
      }
      
      // Batch G: Restore compare state
      if (layout?.compareEnabled === true && layout?.referenceSessionId != null && typeof layout.referenceSessionId === 'number') {
        // Restore compare state asynchronously
        handleLoadReferenceSession(layout.referenceSessionId).catch(err => {
          console.error('Failed to restore reference session:', err);
          // Don't block workspace load on compare restore failure
        });
      }
      // Batch B: Restore zoom and reference cursor state
      if (layout?.visibleTimeStart != null && typeof layout.visibleTimeStart === 'number') {
        setVisibleTimeStart(layout.visibleTimeStart);
      }
      if (layout?.visibleTimeEnd != null && typeof layout.visibleTimeEnd === 'number') {
        setVisibleTimeEnd(layout.visibleTimeEnd);
      }
      if (layout?.referenceCursorTime != null && typeof layout.referenceCursorTime === 'number') {
        setReferenceCursorTime(layout.referenceCursorTime);
      }
      if (layout?.referenceCursorEnabled != null && typeof layout.referenceCursorEnabled === 'boolean') {
        setReferenceCursorEnabled(layout.referenceCursorEnabled);
      }
      // Batch C: Restore selection state
      if (layout?.selectionStart != null && typeof layout.selectionStart === 'number') {
        setSelectionStart(layout.selectionStart);
      }
      if (layout?.selectionEnd != null && typeof layout.selectionEnd === 'number') {
        setSelectionEnd(layout.selectionEnd);
      }
      // Snapshot saved state for dirty tracking
      savedLayoutRef.current = JSON.stringify({
        visibleChannelIds: layout?.visibleChannelIds || [],
        playbackSpeed: layout?.playbackSpeed ?? 1,
        cursorTime: layout?.cursorTime ?? null,
        leftPanelWidth: layout?.leftPanelWidth ?? 240,
        rightPanelWidth: layout?.rightPanelWidth ?? 320,
        activePlotId: layout?.activePlotId ?? 'plot-1',
        plots: layout?.plots ?? [{ id: 'plot-1', title: 'Plot 1', channelIds: [], height: 400 }],
        visibleTimeStart: layout?.visibleTimeStart ?? null,
        visibleTimeEnd: layout?.visibleTimeEnd ?? null,
        referenceCursorTime: layout?.referenceCursorTime ?? null,
        referenceCursorEnabled: layout?.referenceCursorEnabled ?? false,
        selectionStart: layout?.selectionStart ?? null,
        selectionEnd: layout?.selectionEnd ?? null,
      });
      setDirty(false);
    } catch (e: any) {
      const raw = e.message || 'Failed to load analysis session';

      // The backend may include " | Hint: ..." appended by iaRequest — extract it
      const hintSep = raw.indexOf(' | Hint: ');
      const msg = hintSep >= 0 ? raw.slice(0, hintSep) : raw;
      const serverHint = hintSep >= 0 ? raw.slice(hintSep + 9) : '';

      setError(msg);

      // Use server-provided hint if available, otherwise pattern-match
      if (serverHint) {
        setErrorHint(serverHint);
      } else if (msg.includes('HTML instead of JSON')) {
        setErrorHint('The analysis API endpoint may not be deployed. Verify that api/incident-analysis.php exists on the server.');
      } else if (msg.includes('table not found') || msg.includes('migration')) {
        setErrorHint('Database tables are missing. An admin needs to run the migration: /api/migrate-v16-incident-analysis.php');
      } else if (msg.includes('Network error')) {
        setErrorHint('Cannot reach the API server. Check that the backend is running and accessible.');
      } else if (msg.includes('Authentication required') || msg.includes('401')) {
        setErrorHint('Your session may have expired. Try logging out and back in.');
      } else if (msg.includes('Forbidden') || msg.includes('403')) {
        setErrorHint('Your account does not have the incidents.read capability. Contact an admin.');
      } else if (msg.includes('Incident not found') || msg.includes('404')) {
        setErrorHint('The incident referenced by this URL does not exist in the database.');
      } else if (msg.includes('Internal server error')) {
        setErrorHint('Server error — most likely a missing database migration. Ask an admin to run /api/migrate-v16-incident-analysis.php');
      } else {
        setErrorHint('');
      }
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

      incidentAnalysisApi.fetchDatasetData(dsId)
        .then(text => {
          const parsed = parseCsvText(text, ds);
          setParsedDataMap(prev => ({ ...prev, [dsId]: parsed }));
        })
        .catch(err => console.error(`Failed to fetch dataset ${dsId}:`, err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetsWithVisibleChannels, datasets]);

  // ── Build chart data ────────────────────────────────────────────────

  // Resolve dependency order for derived channels (topological sort)
  const resolveDependencyOrder = useCallback((channels: DerivedChannel[]): DerivedChannel[] => {
    const resolved: DerivedChannel[] = [];
    const resolvedKeys = new Set<string>();
    const remaining = [...channels];

    let lastLength = remaining.length;
    while (remaining.length > 0) {
      const channel = remaining.shift()!;
      
      // Check if all dependencies are resolved
      const allDepsResolved = channel.dependencies.every(dep => 
        resolvedKeys.has(dep) || !channels.some(c => c.id === dep)
      );

      if (allDepsResolved) {
        resolved.push(channel);
        resolvedKeys.add(channel.id);
      } else {
        // Put back at end of queue
        remaining.push(channel);
      }

      // Detect circular dependencies (should not happen due to earlier validation)
      if (remaining.length === lastLength) {
        // Skip channels with unresolvable dependencies
        console.warn('Circular dependency detected in derived channels during evaluation');
        break;
      }
      lastLength = remaining.length;
    }

    return resolved;
  }, []);

  const chartData = useMemo(() => {
    if (visibleChannels.size === 0 && derivedChannels.length === 0) return [];

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

    // Batch F.1: Evaluate derived channels with dependency ordering
    const allChannels: ExtendedChannel[] = datasets.flatMap(ds => 
      ds.channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        unit: ch.unit,
        color: ch.color,
        datasetName: ds.name,
      }))
    );
    
    for (const derived of derivedChannels) {
      allChannels.push({
        id: derived.id,
        name: derived.label,
        unit: derived.unit || null,
        color: derived.color || null,
        isDerived: true,
        expression: derived.expression,
        error: derived.error,
      });
    }

    const sorted = Array.from(timeMap.values()).sort((a, b) => (a.__time as number) - (b.__time as number));
    
    // Resolve dependency order for derived channels
    const orderedDerived = resolveDependencyOrder(derivedChannels);
    
    // Evaluate derived channels in dependency order for each row
    for (const row of sorted) {
      for (const derived of orderedDerived) {
        const channelValues: Record<string, number | null> = {};
        
        // Include raw channel values
        for (const ds of datasets) {
          for (const ch of ds.channels) {
            channelValues[`ch_${ch.id}`] = row[`ch_${ch.id}`] ?? null;
          }
        }
        
        // Include already-evaluated derived channel values
        for (const dc of derivedChannels) {
          if (row[`ch_${dc.id}`] !== undefined) {
            channelValues[dc.id] = row[`ch_${dc.id}`];
          }
        }
        
        const result = evaluateExpression(derived.expression, channelValues, allChannels);
        row[`ch_${derived.id}`] = result.value;
      }
    }
    
    return decimateRows(sorted, MAX_CHART_POINTS);
  }, [datasets, parsedDataMap, visibleChannels, derivedChannels, resolveDependencyOrder]);

  // ── Batch G: Reference chart data for compare overlay ──────────────

  const referenceChartData = useMemo(() => {
    if (!compareEnabled || referenceDatasets.length === 0) return [];

    // Build reference data similar to current chartData
    const timeMap = new Map<number, Record<string, number | null>>();
    for (const ds of referenceDatasets) {
      const parsed = referenceParsedDataMap[ds.id];
      if (!parsed) continue;
      for (const row of parsed.rows) {
        const t = row['__time'];
        if (t == null) continue;
        const roundedT = Math.round(t * 1000) / 1000;
        const existing = timeMap.get(roundedT) || { __time: roundedT };
        for (const ch of ds.channels) {
          if (row[ch.name] != null) {
            existing[`ch_${ch.id}`] = row[ch.name];
          }
        }
        timeMap.set(roundedT, existing);
      }
    }

    const sorted = Array.from(timeMap.values()).sort((a, b) => (a.__time as number) - (b.__time as number));
    return decimateRows(sorted, MAX_CHART_POINTS);
  }, [compareEnabled, referenceDatasets, referenceParsedDataMap]);

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

  // ── Channel toggle (Batch A2: per-plot assignment) ─────────────────

  const toggleChannel = (chId: number) => {
    setPlots(prev => prev.map(plot => {
      if (plot.id === activePlotId) {
        const hasChannel = plot.channelIds.includes(chId);
        return {
          ...plot,
          channelIds: hasChannel 
            ? plot.channelIds.filter(id => id !== chId)
            : [...plot.channelIds, chId]
        };
      }
      return plot;
    }));
    // Also update legacy visibleChannels for backward compatibility
    setVisibleChannels(prev => {
      const next = new Set(prev);
      if (next.has(chId)) next.delete(chId); else next.add(chId);
      return next;
    });
    setDirty(true);
  };

  // ── Zoom/Pan/Fit controls (Batch B) ────────────────────────────────

  const handleFitAll = () => {
    if (timeRange.min === Infinity || timeRange.max === -Infinity) return;
    setVisibleTimeStart(timeRange.min);
    setVisibleTimeEnd(timeRange.max);
    setDirty(true);
  };

  const handleZoomIn = () => {
    if (visibleTimeStart == null || visibleTimeEnd == null) {
      handleFitAll();
      return;
    }
    const center = (visibleTimeStart + visibleTimeEnd) / 2;
    const range = visibleTimeEnd - visibleTimeStart;
    const newRange = range * 0.5; // Zoom in by 50%
    setVisibleTimeStart(center - newRange / 2);
    setVisibleTimeEnd(center + newRange / 2);
    setDirty(true);
  };

  const handleZoomOut = () => {
    if (visibleTimeStart == null || visibleTimeEnd == null) {
      handleFitAll();
      return;
    }
    const center = (visibleTimeStart + visibleTimeEnd) / 2;
    const range = visibleTimeEnd - visibleTimeStart;
    const newRange = range * 2.0; // Zoom out by 2x
    const newStart = Math.max(timeRange.min, center - newRange / 2);
    const newEnd = Math.min(timeRange.max, center + newRange / 2);
    setVisibleTimeStart(newStart);
    setVisibleTimeEnd(newEnd);
    setDirty(true);
  };

  const handlePanLeft = () => {
    if (visibleTimeStart == null || visibleTimeEnd == null) {
      handleFitAll();
      return;
    }
    const range = visibleTimeEnd - visibleTimeStart;
    const panAmount = range * 0.25; // Pan by 25% of visible range
    const newStart = Math.max(timeRange.min, visibleTimeStart - panAmount);
    const newEnd = newStart + range;
    setVisibleTimeStart(newStart);
    setVisibleTimeEnd(newEnd);
    setDirty(true);
  };

  const handlePanRight = () => {
    if (visibleTimeStart == null || visibleTimeEnd == null) {
      handleFitAll();
      return;
    }
    const range = visibleTimeEnd - visibleTimeStart;
    const panAmount = range * 0.25; // Pan by 25% of visible range
    const newEnd = Math.min(timeRange.max, visibleTimeEnd + panAmount);
    const newStart = newEnd - range;
    setVisibleTimeStart(newStart);
    setVisibleTimeEnd(newEnd);
    setDirty(true);
  };

  // ── Batch G: Get reference value at time for compare inspector ─────
  const getReferenceValueAtTime = useCallback((channelId: number | string, time: number | null): number | null => {
    if (!compareEnabled || time == null || referenceChartData.length === 0) return null;
    
    // Find closest time point in reference data
    let closest = referenceChartData[0];
    let minDiff = Math.abs((closest.__time as number) - time);
    
    for (const row of referenceChartData) {
      const diff = Math.abs((row.__time as number) - time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = row;
      }
    }
    
    // Return value if within reasonable tolerance (0.1s)
    if (minDiff < 0.1) {
      return closest[`ch_${channelId}`] ?? null;
    }
    
    return null;
  }, [compareEnabled, referenceChartData]);

  const handleToggleReferenceCursor = () => {
    setReferenceCursorEnabled(prev => !prev);
    if (!referenceCursorEnabled && referenceCursorTime == null && cursorTime != null) {
      // Initialize reference cursor near current cursor
      setReferenceCursorTime(cursorTime);
    }
    setDirty(true);
  };

  const handleSetReferenceToCursor = () => {
    if (cursorTime != null) {
      setReferenceCursorTime(cursorTime);
      setReferenceCursorEnabled(true);
      setDirty(true);
    }
  };

  // ── Selection handlers (Batch C) ────────────────────────────────────

  const handleClearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsDraggingSelection(false);
  };

  const handleZoomToSelection = () => {
    if (selectionStart != null && selectionEnd != null) {
      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);
      setVisibleTimeStart(start);
      setVisibleTimeEnd(end);
      setDirty(true);
    }
  };

  const handleCreateMarkerFromSelection = async () => {
    if (!session || selectionStart == null || selectionEnd == null) return;
    const t1 = Math.min(selectionStart, selectionEnd);
    const t2 = Math.max(selectionStart, selectionEnd);
    try {
      await incidentAnalysisApi.saveMeasurement({
        session_id: session.id,
        t1, t2,
        label: `Range: ${(t2 - t1).toFixed(4)}s`,
      });
      const measRes = await incidentAnalysisApi.listMeasurements(session.id);
      setMeasurements(measRes.measurements);
      handleClearSelection();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleNudgeCursor = (direction: 'left' | 'right', large: boolean = false) => {
    if (cursorTime == null) return;
    const range = visibleTimeEnd != null && visibleTimeStart != null 
      ? visibleTimeEnd - visibleTimeStart 
      : timeRange.max - timeRange.min;
    const nudgeAmount = (large ? 0.01 : 0.001) * range;
    const newTime = direction === 'left' 
      ? Math.max(timeRange.min, cursorTime - nudgeAmount)
      : Math.min(timeRange.max, cursorTime + nudgeAmount);
    setCursorTime(newTime);
    setDirty(true);
  };

  const handleNudgeReferenceCursor = (direction: 'left' | 'right') => {
    if (!referenceCursorEnabled || referenceCursorTime == null) return;
    const range = visibleTimeEnd != null && visibleTimeStart != null 
      ? visibleTimeEnd - visibleTimeStart 
      : timeRange.max - timeRange.min;
    const nudgeAmount = 0.001 * range;
    const newTime = direction === 'left' 
      ? Math.max(timeRange.min, referenceCursorTime - nudgeAmount)
      : Math.min(timeRange.max, referenceCursorTime + nudgeAmount);
    setReferenceCursorTime(newTime);
    setDirty(true);
  };

  const handleAddPointMarker = async () => {
    if (!session || cursorTime == null) return;
    try {
      await incidentAnalysisApi.saveMeasurement({
        session_id: session.id,
        t1: cursorTime,
        t2: cursorTime,
        label: `Point @ ${cursorTime.toFixed(4)}s`,
      });
      const measRes = await incidentAnalysisApi.listMeasurements(session.id);
      setMeasurements(measRes.measurements);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Batch D: Value lookup and statistics utilities ─────────────────

  const getChannelValueAtTime = (channelId: number, time: number): number | null => {
    // Find nearest sample in chartData
    let nearest: Record<string, number | null> | null = null;
    let minDist = Infinity;
    
    for (const row of chartData) {
      const rowTime = row.__time;
      if (rowTime == null) continue;
      const dist = Math.abs(rowTime - time);
      if (dist < minDist) {
        minDist = dist;
        nearest = row;
      }
    }
    
    if (nearest && nearest[`ch_${channelId}`] != null) {
      return nearest[`ch_${channelId}`];
    }
    return null;
  };

  const getSelectionStats = (channelId: number, start: number, end: number) => {
    const t1 = Math.min(start, end);
    const t2 = Math.max(start, end);
    const values: number[] = [];
    
    for (const row of chartData) {
      const rowTime = row.__time;
      if (rowTime == null) continue;
      if (rowTime >= t1 && rowTime <= t2) {
        const val = row[`ch_${channelId}`];
        if (val != null && !isNaN(val)) {
          values.push(val);
        }
      }
    }
    
    if (values.length === 0) {
      return { min: null, max: null, avg: null, count: 0 };
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    return { min, max, avg, count: values.length };
  };

  // ── Plot management (Batch A2) ─────────────────────────────────────

  const handleAddPlot = (panelType: PanelType = 'timeSeries') => {
    const newId = `plot-${Date.now()}`;
    const typeLabels = {
      timeSeries: 'Time Series',
      xy: 'XY Plot',
      histogram: 'Histogram',
      eventList: 'Event List',
    };
    setPlots(prev => [...prev, { 
      id: newId, 
      title: `${typeLabels[panelType]} ${prev.length + 1}`, 
      channelIds: [], 
      height: 400,
      autoScale: true,
      panelType,
      xyConfig: panelType === 'xy' ? { xChannelId: null, yChannelId: null } : undefined,
      histogramConfig: panelType === 'histogram' ? { channelId: null, binCount: 20 } : undefined,
    }]);
    setActivePlotId(newId);
    setDirty(true);
  };

  const handleChangePanelType = (plotId: string, newType: PanelType) => {
    setPlots(prev => prev.map(p => {
      if (p.id !== plotId) return p;
      const typeLabels = {
        timeSeries: 'Time Series',
        xy: 'XY Plot',
        histogram: 'Histogram',
        eventList: 'Event List',
      };
      return {
        ...p,
        panelType: newType,
        title: p.title.includes('Time Series') || p.title.includes('XY Plot') || p.title.includes('Histogram') || p.title.includes('Event List')
          ? `${typeLabels[newType]} ${plots.findIndex(pl => pl.id === plotId) + 1}`
          : p.title,
        xyConfig: newType === 'xy' ? (p.xyConfig || { xChannelId: null, yChannelId: null }) : undefined,
        histogramConfig: newType === 'histogram' ? (p.histogramConfig || { channelId: null, binCount: 20 }) : undefined,
      };
    }));
    setDirty(true);
  };

  const handleUpdateXYConfig = (plotId: string, config: Partial<XYConfig>) => {
    setPlots(prev => prev.map(p => 
      p.id === plotId ? { ...p, xyConfig: { ...p.xyConfig, ...config } as XYConfig } : p
    ));
    setDirty(true);
  };

  const handleUpdateHistogramConfig = (plotId: string, config: Partial<HistogramConfig>) => {
    setPlots(prev => prev.map(p => 
      p.id === plotId ? { ...p, histogramConfig: { ...p.histogramConfig, ...config } as HistogramConfig } : p
    ));
    setDirty(true);
  };

  // ── Batch F.1: Circular dependency detection ───────────────────────

  const detectCircularDependency = (channels: DerivedChannel[]): { hasCircular: boolean; error?: string } => {
    const resolved = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (channelId: string, path: string[]): boolean => {
      if (resolved.has(channelId)) return false;
      if (visiting.has(channelId)) {
        const cycle = [...path, channelId].join(' → ');
        throw new Error(`Circular dependency: ${cycle}`);
      }
      
      const channel = channels.find(c => c.id === channelId);
      if (!channel) return false; // Not a derived channel, skip
      
      visiting.add(channelId);
      
      for (const dep of channel.dependencies) {
        if (visit(dep, [...path, channelId])) {
          return true;
        }
      }
      
      visiting.delete(channelId);
      resolved.add(channelId);
      return false;
    };
    
    try {
      for (const channel of channels) {
        visit(channel.id, []);
      }
      return { hasCircular: false };
    } catch (err: any) {
      return { hasCircular: true, error: err.message };
    }
  };

  // ── Batch F: Derived channel handlers ──────────────────────────────

  const handleAddDerivedChannel = (label: string, expression: string, unit?: string) => {
    const allChannels: ExtendedChannel[] = [
      ...datasets.flatMap(ds => 
        ds.channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          unit: ch.unit,
          color: ch.color,
          datasetName: ds.name,
        }))
      ),
      ...derivedChannels.map(dc => ({
        id: dc.id,
        name: dc.label,
        unit: dc.unit || null,
        color: dc.color || null,
        isDerived: true,
      }))
    ];
    
    const validation = validateExpression(expression, allChannels);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const dependencies = validation.dependencies || [];
    
    // Check for self-reference (will be caught later but good to check early)
    const newId = `derived_${Date.now()}`;
    if (dependencies.includes(newId)) {
      return { success: false, error: 'Formula cannot reference itself' };
    }
    
    // Check for circular dependencies
    const testDerived: DerivedChannel = {
      id: newId,
      label,
      expression,
      dependencies,
      unit,
      color: CHANNEL_COLORS[derivedChannels.length % CHANNEL_COLORS.length],
    };
    
    const circularCheck = detectCircularDependency([...derivedChannels, testDerived]);
    if (circularCheck.hasCircular) {
      return { success: false, error: circularCheck.error };
    }
    
    setDerivedChannels(prev => [...prev, testDerived]);
    setDirty(true);
    return { success: true };
  };

  const handleUpdateDerivedChannel = (id: string, updates: Partial<DerivedChannel>) => {
    const allChannels: ExtendedChannel[] = [
      ...datasets.flatMap(ds => 
        ds.channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          unit: ch.unit,
          color: ch.color,
          datasetName: ds.name,
        }))
      ),
      ...derivedChannels.map(dc => ({
        id: dc.id,
        name: dc.label,
        unit: dc.unit || null,
        color: dc.color || null,
        isDerived: true,
      }))
    ];
    
    if (updates.expression) {
      const validation = validateExpression(updates.expression, allChannels);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      // Extract dependencies from new expression
      updates.dependencies = validation.dependencies || [];
      
      // Check for self-reference
      if (updates.dependencies.includes(id)) {
        return { success: false, error: 'Formula cannot reference itself' };
      }
      
      // Check for circular dependencies with updated channel
      const testChannels = derivedChannels.map(dc => 
        dc.id === id ? { ...dc, ...updates } as DerivedChannel : dc
      );
      
      const circularCheck = detectCircularDependency(testChannels);
      if (circularCheck.hasCircular) {
        return { success: false, error: circularCheck.error };
      }
    }
    
    setDerivedChannels(prev => prev.map(dc => 
      dc.id === id ? { ...dc, ...updates } : dc
    ));
    setDirty(true);
    return { success: true };
  };

  const handleRemoveDerivedChannel = (id: string) => {
    setDerivedChannels(prev => prev.filter(dc => dc.id !== id));
    // Remove from all plots
    setPlots(prev => prev.map(p => ({
      ...p,
      channelIds: p.channelIds.filter(cid => cid !== id),
      xyConfig: p.xyConfig ? {
        xChannelId: p.xyConfig.xChannelId === id ? null : p.xyConfig.xChannelId,
        yChannelId: p.xyConfig.yChannelId === id ? null : p.xyConfig.yChannelId,
      } : undefined,
      histogramConfig: p.histogramConfig ? {
        ...p.histogramConfig,
        channelId: p.histogramConfig.channelId === id ? null : p.histogramConfig.channelId,
      } : undefined,
    })));
    setDirty(true);
  };

  // ── Batch G: Compare/reference handlers ────────────────────────────

  const handleLoadReferenceSession = useCallback(async (refSessionId: number) => {
    try {
      // Load reference session metadata
      const refSessionResp = await incidentAnalysisApi.getSession(refSessionId);
      setReferenceSession(refSessionResp.session);
      setReferenceSessionId(refSessionId);
      
      // Load reference datasets
      const refDatasetsResp = await incidentAnalysisApi.listDatasets(refSessionId);
      setReferenceDatasets(refDatasetsResp.datasets);
      
      // Fetch CSV data for reference datasets
      for (const ds of refDatasetsResp.datasets) {
        try {
          const text = await incidentAnalysisApi.fetchDatasetData(ds.id);
          const parsed = parseCsvText(text, ds);
          setReferenceParsedDataMap(prev => ({ ...prev, [ds.id]: parsed }));
        } catch (err) {
          console.error(`Failed to fetch reference dataset ${ds.id}:`, err);
        }
      }
      
      setCompareEnabled(true);
      setShowCompareSelector(false);
      setDirty(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load reference session');
    }
  }, []);

  const handleClearReference = useCallback(() => {
    setCompareEnabled(false);
    setReferenceSessionId(null);
    setReferenceSession(null);
    setReferenceDatasets([]);
    setReferenceParsedDataMap({});
    setDirty(true);
  }, []);

  // Initialize derived channel form when modal opens
  useEffect(() => {
    if (showDerivedChannelModal) {
      setDerivedFormLabel(editingDerivedChannel?.label || '');
      setDerivedFormExpression(editingDerivedChannel?.expression || '');
      setDerivedFormUnit(editingDerivedChannel?.unit || '');
      setDerivedFormError('');
    }
  }, [showDerivedChannelModal, editingDerivedChannel]);

  const handleDerivedChannelSubmit = () => {
    if (!derivedFormLabel.trim()) {
      setDerivedFormError('Label is required');
      return;
    }
    if (!derivedFormExpression.trim()) {
      setDerivedFormError('Expression is required');
      return;
    }
    
    if (editingDerivedChannel) {
      const result = handleUpdateDerivedChannel(editingDerivedChannel.id, {
        label: derivedFormLabel,
        expression: derivedFormExpression,
        unit: derivedFormUnit || undefined,
      });
      if (!result.success) {
        setDerivedFormError(result.error || 'Update failed');
        return;
      }
    } else {
      const result = handleAddDerivedChannel(derivedFormLabel, derivedFormExpression, derivedFormUnit || undefined);
      if (!result.success) {
        setDerivedFormError(result.error || 'Creation failed');
        return;
      }
    }
    
    setShowDerivedChannelModal(false);
    setEditingDerivedChannel(null);
  };

  // ── Batch D: Plot settings handlers ────────────────────────────────

  const handleUpdatePlotTitle = (plotId: string, title: string) => {
    setPlots(prev => prev.map(p => p.id === plotId ? { ...p, title } : p));
    setDirty(true);
  };

  const handleUpdatePlotSettings = (plotId: string, settings: Partial<Plot>) => {
    setPlots(prev => prev.map(p => p.id === plotId ? { ...p, ...settings } : p));
    setDirty(true);
  };

  const handleResetPlotScale = (plotId: string) => {
    setPlots(prev => prev.map(p => p.id === plotId ? { ...p, autoScale: true, yMin: undefined, yMax: undefined } : p));
    setDirty(true);
  };

  const handleRemovePlot = (plotId: string) => {
    if (plots.length <= 1) return; // Must keep at least one plot
    setPlots(prev => prev.filter(p => p.id !== plotId));
    if (activePlotId === plotId) {
      setActivePlotId(plots[0].id);
    }
    setDirty(true);
  };

  const handleUpdatePlotHeight = (plotId: string, height: number) => {
    setPlots(prev => prev.map(p => p.id === plotId ? { ...p, height } : p));
    setDirty(true);
  };

  const selectAllChannels = () => {
    const all = new Set<number>();
    for (const ds of datasets) {
      for (const ch of ds.channels) all.add(ch.id);
    }
    setVisibleChannels(all);
    setDirty(true);
  };

  const deselectAllChannels = () => {
    setVisibleChannels(new Set());
    setDirty(true);
  };

  // ── Upload handlers ─────────────────────────────────────────────────

  const handleDatasetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploadingCsv(true); setError(''); setUploadStatus(`Uploading ${file.name}...`);
    try {
      const res = await incidentAnalysisApi.uploadDataset(session.id, file);
      setUploadStatus(`Uploaded: ${res.name} — ${res.channel_count} channels, ${res.sample_count} samples`);
      // Refresh datasets only
      const dsRes = await incidentAnalysisApi.listDatasets(session.id);
      setDatasets(dsRes.datasets);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploadStatus('');
    }
    setUploadingCsv(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setUploadStatus(''), 5000);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploadingVideo(true); setError(''); setUploadStatus(`Uploading ${file.name}...`);
    try {
      await incidentAnalysisApi.uploadVideo(session.id, file);
      setUploadStatus(`Video uploaded: ${file.name}`);
      // Refresh videos only
      const vidRes = await incidentAnalysisApi.listVideos(session.id);
      setVideos(vidRes.videos);
    } catch (err: any) {
      setError(err.message || 'Video upload failed');
      setUploadStatus('');
    }
    setUploadingVideo(false);
    if (videoInputRef.current) videoInputRef.current.value = '';
    setTimeout(() => setUploadStatus(''), 5000);
  };

  // ── Save session ────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!session) return;
    try {
      const layout: AnalysisLayout = {
        visibleChannelIds: Array.from(visibleChannels),
        playbackSpeed,
        cursorTime,
        leftPanelWidth,
        rightPanelWidth,
        activePlotId,
        plots,
        visibleTimeStart,
        visibleTimeEnd,
        referenceCursorTime,
        referenceCursorEnabled,
        selectionStart,
        selectionEnd,
        derivedChannels, // Batch F.1: Persist derived channels
        compareEnabled, // Batch G: Persist compare state
        referenceSessionId,
      };
      await incidentAnalysisApi.saveSession(session.id, layout);
      savedLayoutRef.current = JSON.stringify(layout);
      setDirty(false);
      setSaveFlash('Saved ✓');
      setTimeout(() => setSaveFlash(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Save failed');
    }
  };

  // ── Delete dataset ──────────────────────────────────────────────────

  const handleDeleteDataset = async (dsId: number) => {
    try {
      await incidentAnalysisApi.deleteDataset(dsId);
      setParsedDataMap(prev => { const n = { ...prev }; delete n[dsId]; return n; });
      setDatasets(prev => prev.filter(d => d.id !== dsId));
      setConfirmDelete(null);
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  // ── Delete video ────────────────────────────────────────────────────

  const handleDeleteVideo = async (vidId: number) => {
    try {
      await incidentAnalysisApi.deleteVideo(vidId);
      setVideos(prev => prev.filter(v => v.id !== vidId));
      setConfirmDelete(null);
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
    if (time == null || isNaN(time)) return;
    if (!measureMode) {
      setCursorTime(time);
      setDirty(true);
      return;
    }
    if (measureStart === null) {
      setMeasureStart(time);
    } else {
      // Complete measurement — stay in measure mode for rapid creation
      if (session) {
        const t1 = Math.min(measureStart, time);
        const t2 = Math.max(measureStart, time);
        incidentAnalysisApi.saveMeasurement({
          session_id: session.id,
          t1, t2,
          label: `Δt = ${(t2 - t1).toFixed(4)}s`,
        }).then(async () => {
          const measRes = await incidentAnalysisApi.listMeasurements(session.id);
          setMeasurements(measRes.measurements);
        }).catch(err => setError(err.message));
      }
      setMeasureStart(null);
      // Stay in measure mode so user can create multiple measurements
    }
  };

  // Batch C: Enhanced chart interaction for drag selection
  const handleChartMouseDown = (e: any) => {
    if (e?.activeLabel != null && !measureMode) {
      const time = Number(e.activeLabel);
      setSelectionStart(time);
      setSelectionEnd(time);
      setIsDraggingSelection(true);
    }
  };

  const handleChartMouseMove = (e: any) => {
    if (isDraggingSelection && e?.activeLabel != null) {
      const time = Number(e.activeLabel);
      setSelectionEnd(time);
    }
  };

  const handleChartMouseUp = () => {
    if (isDraggingSelection) {
      setIsDraggingSelection(false);
      // If selection is too small (< 0.001s), treat as click and clear selection
      if (selectionStart != null && selectionEnd != null && Math.abs(selectionEnd - selectionStart) < 0.001) {
        handleClearSelection();
      }
    }
  };

  const handleDeleteMeasurement = async (id: number) => {
    try {
      await incidentAnalysisApi.deleteMeasurement(id);
      setMeasurements(prev => prev.filter(m => m.id !== id));
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

  // Initialize visible time window when data loads (Batch B)
  useEffect(() => {
    if (visibleTimeStart == null && visibleTimeEnd == null && timeRange.min !== Infinity && timeRange.max !== -Infinity) {
      setVisibleTimeStart(timeRange.min);
      setVisibleTimeEnd(timeRange.max);
    }
  }, [timeRange, visibleTimeStart, visibleTimeEnd]);

  // Hotkey handler (Batch C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          handleClearSelection();
          break;
        case 'm':
        case 'M':
          handleAddPointMarker();
          break;
        case 'r':
          if (e.shiftKey) {
            handleSetReferenceToCursor();
          } else {
            handleToggleReferenceCursor();
          }
          break;
        case 'R':
          handleSetReferenceToCursor();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            handleNudgeCursor('left', true);
          } else {
            handleNudgeCursor('left', false);
          }
          e.preventDefault();
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            handleNudgeCursor('right', true);
          } else {
            handleNudgeCursor('right', false);
          }
          e.preventDefault();
          break;
        case '[':
          handleNudgeReferenceCursor('left');
          break;
        case ']':
          handleNudgeReferenceCursor('right');
          break;
        case '?':
          setShowHotkeyHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cursorTime, referenceCursorEnabled, referenceCursorTime, selectionStart, selectionEnd, session]);

  // ── Total channel count for Select All ────────────────────────────

  const totalChannelCount = useMemo(() => {
    let n = 0;
    for (const ds of datasets) n += ds.channels.length;
    return n;
  }, [datasets]);

  // ── Asset summary line ────────────────────────────────────────────

  const assetSummary = useMemo(() => {
    const parts: string[] = [];
    if (datasets.length > 0) parts.push(`${datasets.length} dataset${datasets.length > 1 ? 's' : ''}`);
    if (videos.length > 0) parts.push(`${videos.length} video${videos.length > 1 ? 's' : ''}`);
    if (measurements.length > 0) parts.push(`${measurements.length} measurement${measurements.length > 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(' · ') : 'No assets yet';
  }, [datasets, videos, measurements]);

  // ── Render ──────────────────────────────────────────────────────────

  if (!can('incidents.read')) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Access denied — requires incidents.read capability</div>;
  }

  if (loading) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <div style={{ width: 24, height: 24, border: '3px solid var(--color-border, #333)', borderTopColor: 'var(--color-primary, #3b82f6)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontSize: '0.8rem' }}>Loading analysis session...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Full-page error state when initial load completely failed (no session)
  if (error && !session) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', opacity: 0.5 }}>⚠</div>
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>Analysis session failed to load</div>
        <div style={{ ...S.error, maxWidth: 500, textAlign: 'center' }}>{error}</div>
        {errorHint && (
          <div style={{ maxWidth: 500, textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-muted, #aaa)', lineHeight: 1.5 }}>
            <strong>Likely cause:</strong> {errorHint}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button style={S.btn('primary')} onClick={() => loadAll()}>Retry</button>
          <button style={S.btn('secondary')} onClick={() => navigate('/parity')}>Back to Parity Portal</button>
        </div>
        <div style={{ fontSize: '0.6rem', color: 'var(--color-muted, #666)', marginTop: '1rem', maxWidth: 420, textAlign: 'center' }}>
          Admin: run the diagnostic endpoint to check all prerequisites:<br />
          <code style={{ fontSize: '0.6rem' }}>/api/incident-analysis.php?action=diagnose</code>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Batch C: Hotkey Help Overlay */}
      {showHotkeyHelp && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }} onClick={() => setShowHotkeyHelp(false)}>
          <div style={{
            background: 'var(--color-surface, #1e1e2e)',
            border: '2px solid var(--color-border)',
            borderRadius: 8,
            padding: '1.5rem',
            maxWidth: 500,
            fontSize: '0.75rem',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Keyboard Shortcuts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', alignItems: 'center' }}>
              <kbd style={{ padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'monospace' }}>Esc</kbd>
              <span>Clear selection</span>
              
              <kbd style={{ padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'monospace' }}>M</kbd>
              <span>Add point marker at cursor</span>
              
              <kbd style={{ padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'monospace' }}>R</kbd>
              <span>Toggle reference cursor</span>
              
              <kbd style={{ padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'monospace' }}>Shift+R</kbd>
              <span>Set reference to current cursor</span>
              
              <kbd style={{ padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'monospace' }}>←/→</kbd>
              <span>Nudge cursor (small)</span>
              
              <kbd style={{ padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'monospace' }}>Shift+←/→</kbd>
              <span>Nudge cursor (large)</span>
              
              <kbd style={{ padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'monospace' }}>[/]</kbd>
              <span>Nudge reference cursor</span>
              
              <kbd style={{ padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: 3, fontFamily: 'monospace' }}>?</kbd>
              <span>Show/hide this help</span>
            </div>
            <button style={{ ...S.btn('primary'), marginTop: '1rem', width: '100%' }} onClick={() => setShowHotkeyHelp(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Batch D: Plot Settings Modal */}
      {editingPlotId && (() => {
        const editPlot = plots.find(p => p.id === editingPlotId);
        if (!editPlot) return null;
        
        return (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }} onClick={() => setEditingPlotId(null)}>
            <div style={{
              background: 'var(--color-surface, #1e1e2e)',
              border: '2px solid var(--color-border)',
              borderRadius: 8,
              padding: '1.5rem',
              maxWidth: 400,
              width: '90%',
              fontSize: '0.75rem',
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Plot Settings</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Plot Title */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Plot Title</label>
                  <input 
                    type="text" 
                    value={editPlot.title}
                    onChange={e => handleUpdatePlotTitle(editingPlotId, e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '0.4rem', 
                      background: 'var(--color-bg, #0d0d14)', 
                      border: '1px solid var(--color-border)',
                      borderRadius: 4,
                      color: 'inherit',
                      fontSize: '0.75rem',
                    }}
                  />
                </div>

                {/* Auto-Scale Toggle */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={editPlot.autoScale !== false}
                      onChange={e => handleUpdatePlotSettings(editingPlotId, { autoScale: e.target.checked })}
                    />
                    <span style={{ fontWeight: 600 }}>Auto-scale Y-axis</span>
                  </label>
                </div>

                {/* Manual Y-axis Range */}
                {editPlot.autoScale === false && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Y Min</label>
                      <input 
                        type="number" 
                        step="any"
                        value={editPlot.yMin ?? ''}
                        onChange={e => handleUpdatePlotSettings(editingPlotId, { yMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                        style={{ 
                          width: '100%', 
                          padding: '0.4rem', 
                          background: 'var(--color-bg, #0d0d14)', 
                          border: '1px solid var(--color-border)',
                          borderRadius: 4,
                          color: 'inherit',
                          fontSize: '0.75rem',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Y Max</label>
                      <input 
                        type="number" 
                        step="any"
                        value={editPlot.yMax ?? ''}
                        onChange={e => handleUpdatePlotSettings(editingPlotId, { yMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                        style={{ 
                          width: '100%', 
                          padding: '0.4rem', 
                          background: 'var(--color-bg, #0d0d14)', 
                          border: '1px solid var(--color-border)',
                          borderRadius: 4,
                          color: 'inherit',
                          fontSize: '0.75rem',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Reset Scale Button */}
                {editPlot.autoScale === false && (
                  <button 
                    style={{ ...S.btn('secondary'), fontSize: '0.7rem' }}
                    onClick={() => handleResetPlotScale(editingPlotId)}
                  >
                    Reset to Auto-Scale
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button style={{ ...S.btn('primary'), flex: 1 }} onClick={() => setEditingPlotId(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Batch G: Compare Selector Modal */}
      {showCompareSelector && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }} onClick={() => setShowCompareSelector(false)}>
          <div style={{
            background: 'var(--color-surface, #1e1e2e)',
            border: '2px solid var(--color-border)',
            borderRadius: 8,
            padding: '1.5rem',
            maxWidth: 500,
            width: '90%',
            fontSize: '0.75rem',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>
              Select Reference Session
            </h3>
            
            <div style={{ marginBottom: '1rem', color: 'var(--color-muted)', fontSize: '0.7rem' }}>
              Choose a processed session to overlay as reference data for comparison.
              For best results, select a session from the same incident with similar channels.
            </div>

            {session && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  style={{ ...S.btn('secondary'), textAlign: 'left', padding: '0.5rem' }}
                  onClick={() => handleLoadReferenceSession(session.id)}
                >
                  <div style={{ fontWeight: 600 }}>Current Session (Self-Compare)</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>
                    Session #{session.id} · Incident #{incident?.id}
                  </div>
                </button>
                
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                  Note: Additional session selection from other incidents will be added in future updates.
                  For now, you can compare against the current session to test the compare workflow.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button style={{ ...S.btn('secondary'), flex: 1 }} onClick={() => setShowCompareSelector(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch F: Derived Channel Modal */}
      {showDerivedChannelModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }} onClick={() => { setShowDerivedChannelModal(false); setEditingDerivedChannel(null); }}>
          <div style={{
            background: 'var(--color-surface, #1e1e2e)',
            border: '2px solid var(--color-border)',
            borderRadius: 8,
            padding: '1.5rem',
            maxWidth: 500,
            width: '90%',
            fontSize: '0.75rem',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>
              {editingDerivedChannel ? 'Edit Derived Channel' : 'Add Derived Channel'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Label */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Label</label>
                <input 
                  type="text" 
                  value={derivedFormLabel}
                  onChange={e => { setDerivedFormLabel(e.target.value); setDerivedFormError(''); }}
                  placeholder="e.g., Speed (mph)"
                  style={{ 
                    width: '100%', 
                    padding: '0.4rem', 
                    background: 'var(--color-bg, #0d0d14)', 
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    color: 'inherit',
                    fontSize: '0.75rem',
                  }}
                />
              </div>

              {/* Expression */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Expression</label>
                <textarea 
                  value={derivedFormExpression}
                  onChange={e => { setDerivedFormExpression(e.target.value); setDerivedFormError(''); }}
                  placeholder="e.g., $ch_17 * 2.237 or abs($ch_19)"
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: '0.4rem', 
                    background: 'var(--color-bg, #0d0d14)', 
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    color: 'inherit',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                  <div><strong>Syntax:</strong> Reference channels as $ch_ID or $derived_ID</div>
                  <div><strong>Operators:</strong> +, -, *, /, ()</div>
                  <div><strong>Functions:</strong> abs(x), min(a,b), max(a,b)</div>
                </div>
                {/* Available Channels Helper */}
                <details style={{ marginTop: '0.5rem', fontSize: '0.65rem' }}>
                  <summary style={{ cursor: 'pointer', color: 'var(--color-muted)' }}>Available Channels</summary>
                  <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: '0.3rem', padding: '0.3rem', background: 'var(--color-bg)', borderRadius: 4 }}>
                    {datasets.flatMap(ds => 
                      ds.channels.map(ch => (
                        <div key={ch.id} style={{ padding: '0.1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{ch.name} ({ds.name})</span>
                          <button 
                            style={{ ...S.btn('ghost'), fontSize: '0.55rem', padding: '0.05rem 0.2rem' }}
                            onClick={() => {
                              const insert = `$ch_${ch.id}`;
                              setDerivedFormExpression(prev => prev + (prev ? ' ' : '') + insert);
                            }}
                          >
                            Insert
                          </button>
                        </div>
                      ))
                    )}
                    {derivedChannels.map(dc => (
                      <div key={dc.id} style={{ padding: '0.1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#3b82f6' }}>
                        <span>{dc.label} (derived)</span>
                        <button 
                          style={{ ...S.btn('ghost'), fontSize: '0.55rem', padding: '0.05rem 0.2rem' }}
                          onClick={() => {
                            const insert = `$${dc.id}`;
                            setDerivedFormExpression(prev => prev + (prev ? ' ' : '') + insert);
                          }}
                        >
                          Insert
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              {/* Unit */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Unit (optional)</label>
                <input 
                  type="text" 
                  value={derivedFormUnit}
                  onChange={e => setDerivedFormUnit(e.target.value)}
                  placeholder="e.g., mph, g, rpm"
                  style={{ 
                    width: '100%', 
                    padding: '0.4rem', 
                    background: 'var(--color-bg, #0d0d14)', 
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    color: 'inherit',
                    fontSize: '0.75rem',
                  }}
                />
              </div>

              {/* Error Display */}
              {derivedFormError && (
                <div style={{ 
                  padding: '0.5rem', 
                  background: 'rgba(239,68,68,0.1)', 
                  border: '1px solid #ef4444',
                  borderRadius: 4,
                  color: '#ef4444',
                  fontSize: '0.7rem',
                }}>
                  {derivedFormError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button style={{ ...S.btn('secondary'), flex: 1 }} onClick={() => { setShowDerivedChannelModal(false); setEditingDerivedChannel(null); }}>
                Cancel
              </button>
              <button style={{ ...S.btn('primary'), flex: 1 }} onClick={handleDerivedChannelSubmit}>
                {editingDerivedChannel ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Bar ── */}
      <div style={S.topBar}>
        <button style={S.btn('ghost')} onClick={() => navigate('/parity')} title="Back to Parity Portal">◀ Back</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
            Incident Analysis
            {incident ? ` — ${incident.summary}` : ` #${incidentId}`}
          </div>
          <div style={{ ...S.muted, fontSize: '0.6rem' }}>
            {assetSummary} · Session #{session?.id}
          </div>
        </div>
        <div style={{ flex: 1 }} />

        {/* Batch G: Compare toggle */}
        {compareEnabled && referenceSession ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }}>
            <span style={{ color: 'var(--color-muted)' }}>
              Compare: <strong>{referenceSession.incident_id === incident?.id ? 'Same Incident' : `Incident #${referenceSession.incident_id}`}</strong>
            </span>
            <button style={{ ...S.btn('ghost'), fontSize: '0.6rem', padding: '0.1rem 0.3rem' }} onClick={handleClearReference}>
              ✕
            </button>
          </div>
        ) : (
          <button style={{ ...S.btn('secondary'), fontSize: '0.65rem' }} onClick={() => setShowCompareSelector(true)}>
            📊 Compare
          </button>
        )}

        {/* Upload status */}
        {uploadStatus && (
          <span style={{ fontSize: '0.65rem', color: '#22c55e', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {uploadStatus}
          </span>
        )}

        {/* Playback controls */}
        <button style={S.btn(playing ? 'danger' : 'primary')} onClick={() => setPlaying(p => !p)}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <select style={{ ...S.input, width: 60 }} value={playbackSpeed} onChange={e => { setPlaybackSpeed(Number(e.target.value)); setDirty(true); }}>
          {[0.25, 0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}×</option>)}
        </select>

        <button style={S.btn(measureMode ? 'danger' : 'secondary')}
          onClick={() => { setMeasureMode(m => !m); setMeasureStart(null); }}>
          {measureMode ? '✕ Cancel Measure' : '📏 Measure'}
        </button>

        {/* Batch B: Zoom/Pan Controls */}
        <div style={{ borderLeft: '1px solid var(--color-border, #333)', paddingLeft: '0.5rem', marginLeft: '0.25rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={handleFitAll} title="Fit All">
            ⊡
          </button>
          <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={handleZoomIn} title="Zoom In">
            +
          </button>
          <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={handleZoomOut} title="Zoom Out">
            −
          </button>
          <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={handlePanLeft} title="Pan Left">
            ◀
          </button>
          <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={handlePanRight} title="Pan Right">
            ▶
          </button>
          {visibleTimeStart != null && visibleTimeEnd != null && (
            <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)', marginLeft: '0.3rem' }}>
              {visibleTimeStart.toFixed(2)}s – {visibleTimeEnd.toFixed(2)}s
            </span>
          )}
        </div>

        {/* Batch B: Reference Cursor Toggle */}
        <button 
          style={S.btn(referenceCursorEnabled ? 'primary' : 'secondary')}
          onClick={handleToggleReferenceCursor}
          title={referenceCursorEnabled ? 'Hide Reference Cursor' : 'Show Reference Cursor'}
        >
          {referenceCursorEnabled ? '✓ Ref' : 'Ref'}
        </button>

        {/* Batch B: Delta Time Readout */}
        {referenceCursorEnabled && cursorTime != null && referenceCursorTime != null && (
          <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 600, marginLeft: '0.3rem' }}>
            Δt: {Math.abs(cursorTime - referenceCursorTime).toFixed(4)}s
          </span>
        )}

        {/* Batch C: Hotkey Help Button */}
        <button 
          style={{ ...S.btn('ghost'), fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
          onClick={() => setShowHotkeyHelp(true)}
          title="Keyboard Shortcuts"
        >
          ?
        </button>

        {canEdit && (
          <button style={{
            ...S.btn('primary'),
            position: 'relative',
            ...(dirty ? { boxShadow: '0 0 0 2px #f59e0b' } : {}),
          }} onClick={handleSave}>
            {saveFlash || (dirty ? '● Save' : '💾 Save')}
          </button>
        )}

        {error && <span style={{ color: '#ef4444', fontSize: '0.7rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{error}</span>}
      </div>

      {/* ── Main Area ── */}
      <div style={S.mainArea}>
        {/* ── Left Panel: Datasets + Channels ── */}
        <ResizablePanel
          side="left"
          width={leftPanelWidth}
          minWidth={200}
          maxWidth={400}
          onResize={setLeftPanelWidth}
          style={{ borderRight: '1px solid var(--color-border, #333)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-surface, #1e1e2e)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={S.panelHeader}>
            Telemetry Data
            {canEdit && (
              <>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,.log" style={{ display: 'none' }}
                  onChange={handleDatasetUpload} />
                <button style={{ ...S.btn('primary'), marginLeft: '0.4rem', fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}
                  onClick={() => fileInputRef.current?.click()} disabled={uploadingCsv}>
                  {uploadingCsv ? 'Uploading...' : '+ CSV'}
                </button>
              </>
            )}
          </div>
          {/* Channel search + select all/none */}
          <div style={{ padding: '0.3rem 0.5rem' }}>
            <input style={{ ...S.input, width: '100%' }} placeholder="Search channels..."
              value={channelSearch} onChange={e => setChannelSearch(e.target.value)} />
            {totalChannelCount > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                <button style={{ ...S.btn('ghost'), fontSize: '0.55rem', padding: 0, color: 'var(--color-primary, #3b82f6)' }}
                  onClick={selectAllChannels}>Select All</button>
                <button style={{ ...S.btn('ghost'), fontSize: '0.55rem', padding: 0, color: 'var(--color-muted, #888)' }}
                  onClick={deselectAllChannels}>Deselect All</button>
                <span style={{ fontSize: '0.55rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
                  {visibleChannels.size}/{totalChannelCount}
                </span>
              </div>
            )}
          </div>
          <div style={S.panelBody}>
            {filteredDatasets.length === 0 && (
              <div style={{ ...S.muted, textAlign: 'center', padding: '1rem 0' }}>
                {datasets.length === 0
                  ? 'No datasets yet. Click "+ CSV" to import telemetry data.'
                  : 'No channels match your search.'}
              </div>
            )}
            {filteredDatasets.map(ds => (
              <div key={ds.id} style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }} title={ds.name}>
                    {ds.name}
                  </span>
                  {canEdit && (
                    confirmDelete?.type === 'dataset' && confirmDelete?.id === ds.id ? (
                      <span style={{ display: 'flex', gap: '0.2rem' }}>
                        <button style={{ ...S.btn('danger'), fontSize: '0.55rem', padding: '0.1rem 0.25rem' }}
                          onClick={() => handleDeleteDataset(ds.id)}>Delete</button>
                        <button style={{ ...S.btn('secondary'), fontSize: '0.55rem', padding: '0.1rem 0.25rem' }}
                          onClick={() => setConfirmDelete(null)}>No</button>
                      </span>
                    ) : (
                      <button style={{ ...S.btn('danger'), fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}
                        onClick={() => setConfirmDelete({ type: 'dataset', id: ds.id })} title="Delete dataset">✕</button>
                    )
                  )}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)', marginBottom: '0.15rem' }}>
                  {ds.sample_count} samples · {ds.channels.length} ch · {ds.time_column || 'no time col'}
                  {ds.time_unit !== 'seconds' && ` · ${ds.time_unit}`}
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
                    <div key={ch.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.2rem',
                      cursor: 'pointer', borderRadius: 3,
                      background: isVis ? 'rgba(59,130,246,0.08)' : 'transparent',
                    }}
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
                          {ch.min_value.toFixed(1)}–{ch.max_value?.toFixed(1)}{ch.unit ? ` ${ch.unit}` : ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Batch F: Derived Channels Section */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.72rem' }}>Derived Channels</span>
                {canEdit && (
                  <button 
                    style={{ ...S.btn('primary'), fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}
                    onClick={() => { setEditingDerivedChannel(null); setShowDerivedChannelModal(true); }}
                  >
                    + Add
                  </button>
                )}
              </div>
              {derivedChannels.length === 0 ? (
                <div style={{ ...S.muted, fontSize: '0.6rem', padding: '0.3rem 0' }}>
                  No derived channels yet
                </div>
              ) : (
                derivedChannels.map(dc => {
                  const isVis = visibleChannels.has(dc.id as any);
                  return (
                    <div key={dc.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.15rem 0.2rem',
                      background: isVis ? 'rgba(59,130,246,0.1)' : 'transparent',
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (activePlotId) {
                        setPlots(prev => prev.map(p => 
                          p.id === activePlotId 
                            ? { ...p, channelIds: isVis ? p.channelIds.filter(id => id !== dc.id) : [...p.channelIds, dc.id] }
                            : p
                        ));
                        setVisibleChannels(prev => {
                          const next = new Set(prev);
                          if (isVis) next.delete(dc.id as any); else next.add(dc.id as any);
                          return next;
                        });
                        setDirty(true);
                      }
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dc.color || '#888', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.62rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dc.label}
                      </span>
                      {dc.error && (
                        <span style={{ fontSize: '0.55rem', color: '#ef4444', flexShrink: 0 }} title={dc.error}>⚠</span>
                      )}
                      {canEdit && (
                        <>
                          <button 
                            style={{ ...S.btn('ghost'), fontSize: '0.5rem', padding: '0.05rem 0.2rem' }}
                            onClick={(e) => { e.stopPropagation(); setEditingDerivedChannel(dc); setShowDerivedChannelModal(true); }}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button 
                            style={{ ...S.btn('danger'), fontSize: '0.5rem', padding: '0.05rem 0.2rem' }}
                            onClick={(e) => { e.stopPropagation(); handleRemoveDerivedChannel(dc.id); }}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </div>
        </ResizablePanel>

        {/* ── Center Panel: Multi-Plot Stack ── */}
        <div style={S.centerPanel}>
          {/* Add Panel Button with Type Selector */}
          <div style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button style={{ ...S.btn('primary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={() => handleAddPlot('timeSeries')}>
              + Time Series
            </button>
            <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={() => handleAddPlot('xy')}>
              + XY Plot
            </button>
            <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={() => handleAddPlot('histogram')}>
              + Histogram
            </button>
            <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.2rem 0.4rem' }} onClick={() => handleAddPlot('eventList')}>
              + Event List
            </button>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
              {plots.length} panel{plots.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Stacked Plots */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {plots.map((plot, plotIdx) => {
              const isActive = plot.id === activePlotId;
              const plotChannels = datasets.flatMap(ds => 
                ds.channels.filter(ch => plot.channelIds.includes(ch.id)).map(ch => ({ ...ch, datasetName: ds.name }))
              );
              const plotChartData = chartData.filter(row => {
                return plotChannels.some(ch => row[`ch_${ch.id}`] != null);
              });

              return (
                <React.Fragment key={plot.id}>
                  <div 
                    style={{ 
                      height: plot.height,
                      minHeight: 150,
                      display: 'flex',
                      flexDirection: 'column',
                      border: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: 'var(--color-surface, #1e1e2e)',
                    }}
                    onClick={() => setActivePlotId(plot.id)}
                  >
                    {/* Plot Header */}
                    <div style={{ 
                      padding: '0.3rem 0.5rem', 
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: isActive ? 'rgba(59,130,246,0.05)' : 'transparent',
                    }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, flex: 1 }}>{plot.title}</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>
                        {plotChannels.length} channel{plotChannels.length !== 1 ? 's' : ''}
                      </span>
                      <button 
                        style={{ ...S.btn('ghost'), fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}
                        onClick={(e) => { e.stopPropagation(); setEditingPlotId(plot.id); }}
                        title="Plot Settings"
                      >
                        ⚙
                      </button>
                      {plots.length > 1 && (
                        <button 
                          style={{ ...S.btn('danger'), fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}
                          onClick={(e) => { e.stopPropagation(); handleRemovePlot(plot.id); }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Panel Content - Batch E: Switch based on panel type */}
                    <div style={{ flex: 1, padding: '0.5rem', minHeight: 0 }}>
                      {(() => {
                        const panelType = plot.panelType || 'timeSeries';
                        
                        // TIME SERIES PANEL
                        if (panelType === 'timeSeries') {
                          if (plotChannels.length === 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem' }}>
                                <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>📊</div>
                                <div style={{ ...S.muted, fontSize: '0.65rem' }}>
                                  Select channels to add to this plot
                                </div>
                              </div>
                            );
                          }
                          if (plotChartData.length === 0) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem' }}>
                                <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>⚠️</div>
                                <div style={{ ...S.muted, fontSize: '0.65rem' }}>
                                  No data available for selected channels
                                </div>
                              </div>
                            );
                          }
                          return (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={plotChartData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                            onClick={(e: any) => {
                              if (e?.activeLabel != null) handleChartClick(Number(e.activeLabel));
                            }}
                            onMouseDown={handleChartMouseDown}
                            onMouseMove={handleChartMouseMove}
                            onMouseUp={handleChartMouseUp}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="__time" type="number" 
                              domain={visibleTimeStart != null && visibleTimeEnd != null 
                                ? [visibleTimeStart, visibleTimeEnd] 
                                : ['dataMin', 'dataMax']}
                              tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(2)} />
                            {plotChannels.map((ch, i) => {
                              // Batch D: Apply plot settings to Y-axis
                              const yDomain = plot.autoScale === false && plot.yMin != null && plot.yMax != null
                                ? [plot.yMin, plot.yMax]
                                : ['auto', 'auto'];
                              
                              return (
                                <YAxis key={ch.id} yAxisId={`y_${ch.id}`} orientation={i % 2 === 0 ? 'left' : 'right'}
                                  tick={{ fontSize: 8 }} width={45} domain={yDomain}
                                  hide={i > 1} />
                              );
                            })}
                            <Tooltip
                              contentStyle={{ background: 'var(--color-surface, #1e1e2e)', border: '1px solid var(--color-border)', fontSize: '0.7rem' }}
                              formatter={(v: number, name: string) => [v?.toFixed(4), name]}
                              labelFormatter={(l: number) => `t = ${l?.toFixed(4)}s`}
                            />
                            {plotChannels.map((ch, i) => (
                              <Line key={ch.id} yAxisId={`y_${ch.id}`} dataKey={`ch_${ch.id}`}
                                name={`${ch.datasetName} · ${ch.name}`}
                                stroke={ch.color || channelColor(i)} dot={false} strokeWidth={1.5}
                                isAnimationActive={false} connectNulls />
                            ))}
                            {/* Batch G: Reference data overlay for compare mode */}
                            {compareEnabled && referenceChartData.length > 0 && plotChannels.map((ch, i) => (
                              <Line key={`ref_${ch.id}`} yAxisId={`y_${ch.id}`} data={referenceChartData} dataKey={`ch_${ch.id}`}
                                name={`REF · ${ch.datasetName} · ${ch.name}`}
                                stroke={ch.color || channelColor(i)} dot={false} strokeWidth={1.5}
                                strokeDasharray="4 4" opacity={0.6}
                                isAnimationActive={false} connectNulls />
                            ))}
                            {/* Batch C: Selection Region */}
                            {selectionStart != null && selectionEnd != null && plotChannels.length > 0 && (
                              <ReferenceArea 
                                yAxisId={`y_${plotChannels[0].id}`}
                                x1={Math.min(selectionStart, selectionEnd)} 
                                x2={Math.max(selectionStart, selectionEnd)} 
                                fill="#22c55e" 
                                fillOpacity={0.15} 
                                stroke="#22c55e"
                                strokeWidth={1}
                              />
                            )}
                            {cursorTime != null && plotChannels.length > 0 && (
                              <ReferenceLine yAxisId={`y_${plotChannels[0].id}`} x={cursorTime} stroke="#fff" strokeWidth={1} strokeDasharray="4 2" label={{ value: 'Primary', fill: '#fff', fontSize: 9, position: 'top' }} />
                            )}
                            {referenceCursorEnabled && referenceCursorTime != null && plotChannels.length > 0 && (
                              <ReferenceLine yAxisId={`y_${plotChannels[0].id}`} x={referenceCursorTime} stroke="#3b82f6" strokeWidth={1} strokeDasharray="2 4" label={{ value: 'Ref', fill: '#3b82f6', fontSize: 9, position: 'top' }} />
                            )}
                            {measureStart != null && plotChannels.length > 0 && (
                              <ReferenceLine yAxisId={`y_${plotChannels[0].id}`} x={measureStart} stroke="#f59e0b" strokeWidth={2} strokeDasharray="2 2" label={{ value: 'Start', fill: '#f59e0b', fontSize: 10 }} />
                            )}
                            {plotChannels.length > 0 && measurements.map(m => (
                              <ReferenceLine key={`m1_${m.id}`} yAxisId={`y_${plotChannels[0].id}`} x={m.t1} stroke="#22c55e" strokeWidth={1} strokeDasharray="3 2" />
                            ))}
                            {plotChannels.length > 0 && measurements.map(m => (
                              <ReferenceLine key={`m2_${m.id}`} yAxisId={`y_${plotChannels[0].id}`} x={m.t2} stroke="#22c55e" strokeWidth={1} strokeDasharray="3 2" />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                          );
                        }
                        
                        // XY / SCATTER PANEL
                        if (panelType === 'xy') {
                          const xyConfig = plot.xyConfig || { xChannelId: null, yChannelId: null };
                          const allChannels = datasets.flatMap(ds => 
                            ds.channels.map(ch => ({ ...ch, datasetName: ds.name }))
                          );
                          
                          if (!xyConfig.xChannelId || !xyConfig.yChannelId) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>XY Plot Configuration</div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', marginBottom: '0.2rem' }}>X-Axis Channel:</label>
                                  <select 
                                    value={xyConfig.xChannelId || ''}
                                    onChange={e => handleUpdateXYConfig(plot.id, { xChannelId: e.target.value ? Number(e.target.value) : null })}
                                    style={{ width: '100%', padding: '0.3rem', fontSize: '0.65rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'inherit' }}
                                  >
                                    <option value="">Select X channel...</option>
                                    {allChannels.map(ch => (
                                      <option key={ch.id} value={ch.id}>{ch.datasetName} · {ch.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Y-Axis Channel:</label>
                                  <select 
                                    value={xyConfig.yChannelId || ''}
                                    onChange={e => handleUpdateXYConfig(plot.id, { yChannelId: e.target.value ? Number(e.target.value) : null })}
                                    style={{ width: '100%', padding: '0.3rem', fontSize: '0.65rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'inherit' }}
                                  >
                                    <option value="">Select Y channel...</option>
                                    {allChannels.map(ch => (
                                      <option key={ch.id} value={ch.id}>{ch.datasetName} · {ch.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          }
                          
                          // Build XY scatter data
                          const xyData = chartData.map(row => ({
                            x: row[`ch_${xyConfig.xChannelId}`],
                            y: row[`ch_${xyConfig.yChannelId}`],
                          })).filter(d => d.x != null && d.y != null);
                          
                          if (xyData.length === 0) {
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <div style={{ ...S.muted, fontSize: '0.65rem' }}>No data available</div>
                              </div>
                            );
                          }
                          
                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="x" type="number" tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(2)} />
                                <YAxis dataKey="y" type="number" tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(2)} />
                                <Tooltip 
                                  contentStyle={{ background: 'var(--color-surface, #1e1e2e)', border: '1px solid var(--color-border)', fontSize: '0.7rem' }}
                                  formatter={(v: number) => v?.toFixed(4)}
                                />
                                <Scatter data={xyData} fill="#3b82f6" />
                              </ScatterChart>
                            </ResponsiveContainer>
                          );
                        }
                        
                        // HISTOGRAM PANEL
                        if (panelType === 'histogram') {
                          const histConfig = plot.histogramConfig || { channelId: null, binCount: 20 };
                          const allChannels = datasets.flatMap(ds => 
                            ds.channels.map(ch => ({ ...ch, datasetName: ds.name }))
                          );
                          
                          if (!histConfig.channelId) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>Histogram Configuration</div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Channel:</label>
                                  <select 
                                    value={histConfig.channelId || ''}
                                    onChange={e => handleUpdateHistogramConfig(plot.id, { channelId: e.target.value ? Number(e.target.value) : null })}
                                    style={{ width: '100%', padding: '0.3rem', fontSize: '0.65rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'inherit' }}
                                  >
                                    <option value="">Select channel...</option>
                                    {allChannels.map(ch => (
                                      <option key={ch.id} value={ch.id}>{ch.datasetName} · {ch.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', marginBottom: '0.2rem' }}>Bin Count:</label>
                                  <input 
                                    type="number" 
                                    min="5" 
                                    max="100" 
                                    value={histConfig.binCount}
                                    onChange={e => handleUpdateHistogramConfig(plot.id, { binCount: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '0.3rem', fontSize: '0.65rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'inherit' }}
                                  />
                                </div>
                              </div>
                            );
                          }
                          
                          // Build histogram data
                          const values = chartData.map(row => row[`ch_${histConfig.channelId}`]).filter(v => v != null) as number[];
                          if (values.length === 0) {
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <div style={{ ...S.muted, fontSize: '0.65rem' }}>No data available</div>
                              </div>
                            );
                          }
                          
                          const min = Math.min(...values);
                          const max = Math.max(...values);
                          const binWidth = (max - min) / histConfig.binCount;
                          const bins = Array.from({ length: histConfig.binCount }, (_, i) => ({
                            bin: min + i * binWidth,
                            count: 0,
                          }));
                          
                          values.forEach(v => {
                            const binIdx = Math.min(Math.floor((v - min) / binWidth), histConfig.binCount - 1);
                            bins[binIdx].count++;
                          });
                          
                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={bins} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis dataKey="bin" type="number" tick={{ fontSize: 9 }} tickFormatter={(v: number) => v.toFixed(2)} />
                                <YAxis tick={{ fontSize: 9 }} />
                                <Tooltip 
                                  contentStyle={{ background: 'var(--color-surface, #1e1e2e)', border: '1px solid var(--color-border)', fontSize: '0.7rem' }}
                                  formatter={(v: number) => [`${v} samples`, 'Count']}
                                  labelFormatter={(l: number) => `Bin: ${l.toFixed(2)}`}
                                />
                                <Bar dataKey="count" fill="#22c55e" />
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        }
                        
                        // EVENT LIST PANEL
                        if (panelType === 'eventList') {
                          return (
                            <div style={{ height: '100%', overflow: 'auto' }}>
                              {measurements.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                  <div style={{ ...S.muted, fontSize: '0.65rem' }}>No markers/events</div>
                                </div>
                              ) : (
                                <table style={{ width: '100%', fontSize: '0.65rem', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(59,130,246,0.05)' }}>
                                      <th style={{ padding: '0.3rem', textAlign: 'left' }}>Label</th>
                                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>Start (s)</th>
                                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>End (s)</th>
                                      <th style={{ padding: '0.3rem', textAlign: 'right' }}>Duration (s)</th>
                                      <th style={{ padding: '0.3rem', textAlign: 'center' }}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {measurements.map(m => (
                                      <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                                        onClick={() => setCursorTime(m.t1)}>
                                        <td style={{ padding: '0.3rem' }}>{m.label}</td>
                                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{m.t1.toFixed(4)}</td>
                                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{m.t2.toFixed(4)}</td>
                                        <td style={{ padding: '0.3rem', textAlign: 'right', fontFamily: 'monospace' }}>{(m.t2 - m.t1).toFixed(4)}</td>
                                        <td style={{ padding: '0.3rem', textAlign: 'center' }}>
                                          <button 
                                            style={{ ...S.btn('ghost'), fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}
                                            onClick={(e) => { e.stopPropagation(); setCursorTime(m.t1); }}
                                          >
                                            Jump
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        }
                        
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Resize Divider */}
                  {plotIdx < plots.length - 1 && (
                    <div 
                      style={{ 
                        height: 6, 
                        cursor: 'ns-resize', 
                        background: 'var(--color-border, #333)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startY = e.clientY;
                        const startHeight = plot.height;
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          const delta = moveEvent.clientY - startY;
                          const newHeight = Math.max(150, Math.min(800, startHeight + delta));
                          handleUpdatePlotHeight(plot.id, newHeight);
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                      <div style={{ width: 40, height: 2, background: 'var(--color-muted, #666)', borderRadius: 1 }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── Bottom: Inspector + Scrubber + Measurements ── */}
          <div style={S.bottomBar}>
            {/* Batch D: Enhanced Inspector Panel with Per-Channel Values */}
            {cursorTime != null && (() => {
              const activePlot = plots.find(p => p.id === activePlotId);
              if (!activePlot) return null;
              
              const activePlotChannels = datasets.flatMap(ds => 
                ds.channels.filter(ch => activePlot.channelIds.includes(ch.id)).map(ch => ({ ...ch, datasetName: ds.name }))
              );

              return (
                <div style={{ fontSize: '0.65rem', marginBottom: '0.4rem', padding: '0.4rem 0.6rem', background: 'rgba(59,130,246,0.05)', borderRadius: 4, border: '1px solid rgba(59,130,246,0.2)' }}>
                  {/* Time Readouts */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div>
                      <strong>Cursor:</strong> {cursorTime.toFixed(4)}s
                    </div>
                    {referenceCursorEnabled && referenceCursorTime != null && (
                      <>
                        <div>
                          <strong>Ref:</strong> {referenceCursorTime.toFixed(4)}s
                        </div>
                        <div style={{ color: '#3b82f6', fontWeight: 600 }}>
                          <strong>Δt:</strong> {Math.abs(cursorTime - referenceCursorTime).toFixed(4)}s
                        </div>
                      </>
                    )}
                    {selectionStart != null && selectionEnd != null && (
                      <>
                        <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '0.5rem' }}>
                          <strong>Selection:</strong> {Math.min(selectionStart, selectionEnd).toFixed(4)}s – {Math.max(selectionStart, selectionEnd).toFixed(4)}s
                        </div>
                        <div style={{ color: '#22c55e', fontWeight: 600 }}>
                          <strong>Δ:</strong> {Math.abs(selectionEnd - selectionStart).toFixed(4)}s
                        </div>
                        <button style={{ ...S.btn('primary'), fontSize: '0.55rem', padding: '0.1rem 0.3rem' }} onClick={handleZoomToSelection}>
                          Zoom to Selection
                        </button>
                        <button style={{ ...S.btn('secondary'), fontSize: '0.55rem', padding: '0.1rem 0.3rem' }} onClick={handleCreateMarkerFromSelection}>
                          Create Marker
                        </button>
                        <button style={{ ...S.btn('ghost'), fontSize: '0.55rem', padding: '0.1rem 0.3rem', color: '#ef4444' }} onClick={handleClearSelection}>
                          Clear
                        </button>
                      </>
                    )}
                  </div>

                  {/* Batch D: Per-Channel Values */}
                  {activePlotChannels.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(59,130,246,0.2)', paddingTop: '0.3rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>Active Plot Channels:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '0.3rem 0.8rem', fontSize: '0.6rem' }}>
                        <div style={{ fontWeight: 600 }}>Channel</div>
                        <div></div>
                        <div style={{ fontWeight: 600, textAlign: 'right' }}>Value</div>
                        {/* Batch G: Compare mode inspector */}
                        {compareEnabled && referenceChartData.length > 0 && (
                          <>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>Ref Value</div>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>Δ</div>
                          </>
                        )}
                        {!compareEnabled && referenceCursorEnabled && referenceCursorTime != null && (
                          <>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>Ref Value</div>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>Δ</div>
                          </>
                        )}
                        {!compareEnabled && selectionStart != null && selectionEnd != null && !referenceCursorEnabled && (
                          <>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>Min</div>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>Max</div>
                            <div style={{ fontWeight: 600, textAlign: 'right' }}>Avg</div>
                          </>
                        )}
                        
                        {activePlotChannels.map(ch => {
                          const cursorValue = getChannelValueAtTime(ch.id, cursorTime);
                          
                          // Batch G: Compare mode reference value
                          const compareRefValue = compareEnabled ? getReferenceValueAtTime(ch.id, cursorTime) : null;
                          const compareDelta = cursorValue != null && compareRefValue != null ? cursorValue - compareRefValue : null;
                          
                          // Batch B: Reference cursor value
                          const refValue = referenceCursorEnabled && referenceCursorTime != null 
                            ? getChannelValueAtTime(ch.id, referenceCursorTime) 
                            : null;
                          const delta = cursorValue != null && refValue != null ? cursorValue - refValue : null;
                          
                          const selStats = selectionStart != null && selectionEnd != null 
                            ? getSelectionStats(ch.id, selectionStart, selectionEnd)
                            : null;

                          return (
                            <React.Fragment key={ch.id}>
                              <div style={{ color: ch.color || '#888' }}>●</div>
                              <div>{ch.datasetName} · {ch.name}</div>
                              <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                {cursorValue != null ? cursorValue.toFixed(4) : '—'}
                              </div>
                              {/* Batch G: Compare mode inspector values */}
                              {compareEnabled && referenceChartData.length > 0 && (
                                <>
                                  <div style={{ textAlign: 'right', fontFamily: 'monospace', opacity: 0.7 }}>
                                    {compareRefValue != null ? compareRefValue.toFixed(4) : '—'}
                                  </div>
                                  <div style={{ textAlign: 'right', fontFamily: 'monospace', color: compareDelta != null && compareDelta > 0 ? '#22c55e' : compareDelta != null && compareDelta < 0 ? '#ef4444' : '#888' }}>
                                    {compareDelta != null ? (compareDelta > 0 ? '+' : '') + compareDelta.toFixed(4) : '—'}
                                  </div>
                                </>
                              )}
                              {!compareEnabled && referenceCursorEnabled && referenceCursorTime != null && (
                                <>
                                  <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                    {refValue != null ? refValue.toFixed(4) : '—'}
                                  </div>
                                  <div style={{ textAlign: 'right', fontFamily: 'monospace', color: delta != null && delta > 0 ? '#22c55e' : delta != null && delta < 0 ? '#ef4444' : '#888' }}>
                                    {delta != null ? (delta > 0 ? '+' : '') + delta.toFixed(4) : '—'}
                                  </div>
                                </>
                              )}
                              {selectionStart != null && selectionEnd != null && !referenceCursorEnabled && selStats && (
                                <>
                                  <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                    {selStats.min != null ? selStats.min.toFixed(4) : '—'}
                                  </div>
                                  <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                    {selStats.max != null ? selStats.max.toFixed(4) : '—'}
                                  </div>
                                  <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                    {selStats.avg != null ? selStats.avg.toFixed(4) : '—'}
                                  </div>
                                </>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activePlotChannels.length === 0 && (
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.6rem', fontStyle: 'italic' }}>
                      No channels in active plot
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Measure mode banner — prominent position above scrubber */}
            {measureMode && (
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginBottom: '0.3rem', padding: '0.25rem 0.5rem', background: 'rgba(245,158,11,0.1)', borderRadius: 4, border: '1px solid rgba(245,158,11,0.3)' }}>
                📏 <strong>Measurement mode</strong>: {measureStart == null ? 'Click chart to set start point' : `Start at ${measureStart.toFixed(3)}s — click to set end point`}
                <button style={{ ...S.btn('ghost'), fontSize: '0.6rem', marginLeft: '0.5rem', color: '#f59e0b', textDecoration: 'underline' }}
                  onClick={() => { setMeasureMode(false); setMeasureStart(null); }}>Exit</button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)', flexShrink: 0 }}>Time:</span>
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
                <span style={{ fontWeight: 700, marginRight: '0.4rem' }}>Measurements ({measurements.length}):</span>
                {measurements.map(m => (
                  <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginRight: '0.6rem', marginBottom: '0.15rem', background: 'rgba(34,197,94,0.1)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>
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
            {measurements.length === 0 && !measureMode && (
              <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>
                No measurements. Click "📏 Measure" to create time interval measurements.
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Videos ── */}
        <ResizablePanel
          side="right"
          width={rightPanelWidth}
          minWidth={260}
          maxWidth={500}
          onResize={setRightPanelWidth}
          style={{ borderLeft: '1px solid var(--color-border, #333)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-surface, #1e1e2e)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={S.panelHeader}>
            Video Evidence
            {canEdit && (
              <>
                <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                  onChange={handleVideoUpload} />
                <button style={{ ...S.btn('primary'), marginLeft: '0.4rem', fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}
                  onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}>
                  {uploadingVideo ? 'Uploading...' : '+ Video'}
                </button>
              </>
            )}
          </div>
          <div style={S.panelBody}>
            {videos.length === 0 && (
              <div style={{ ...S.muted, textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '1.2rem', opacity: 0.3, marginBottom: '0.3rem' }}>🎬</div>
                No videos yet.{canEdit && ' Click "+ Video" to upload incident footage.'}
              </div>
            )}
            {videos.map(vid => (
              <div key={vid.id} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={vid.name}>
                    {vid.name}
                  </span>
                  {canEdit && (
                    confirmDelete?.type === 'video' && confirmDelete?.id === vid.id ? (
                      <span style={{ display: 'flex', gap: '0.2rem' }}>
                        <button style={{ ...S.btn('danger'), fontSize: '0.55rem', padding: '0.1rem 0.25rem' }}
                          onClick={() => handleDeleteVideo(vid.id)}>Delete</button>
                        <button style={{ ...S.btn('secondary'), fontSize: '0.55rem', padding: '0.1rem 0.25rem' }}
                          onClick={() => setConfirmDelete(null)}>No</button>
                      </span>
                    ) : (
                      <button style={{ ...S.btn('danger'), fontSize: '0.55rem', padding: '0.1rem 0.2rem' }}
                        onClick={() => setConfirmDelete({ type: 'video', id: vid.id })} title="Delete video">✕</button>
                    )
                  )}
                </div>
                <video
                  ref={el => { if (el) videoRefs.current[vid.id] = el; }}
                  src={incidentAnalysisApi.getVideoUrl(vid.id)}
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
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>Sync offset:</span>
                  <input style={{ ...S.input, width: 50, fontSize: '0.6rem', padding: '0.1rem 0.2rem' }}
                    type="number" step="0.1" defaultValue={vid.time_offset}
                    onBlur={e => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v !== vid.time_offset) handleVideoOffset(vid.id, v);
                    }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>s</span>
                  {vid.duration != null && (
                    <span style={{ fontSize: '0.55rem', color: 'var(--color-muted)', marginLeft: 'auto' }}>
                      {vid.duration.toFixed(1)}s
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>
        </ResizablePanel>
      </div>
    </div>
  );
}
