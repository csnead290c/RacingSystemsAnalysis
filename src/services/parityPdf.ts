/**
 * Client-side PDF export for Parity Portal reports.
 * Uses jsPDF + jspdf-autotable for structured table rendering.
 * Charts are captured from live SVG elements via Canvas → PNG embedding.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  QualSheetRow,
  LadderPairing,
  EventParitySummaryResponse,
  ParitySummaryResponse,
  ParityQualOrderResponse,
  ParityIncrementalsResponse,
  ParitySessionWeatherResponse,
  RangeParityMatrixResponse,
  IncrementalComparisonResponse,
} from './parityApi';
import {
  formatBaro, formatHPC, formatWG,
  formatDelta, isIncrementalMph,
} from '../domain/parity/format';
import { waterGrains, pct_to_frac } from '../domain/parity/weatherCorrection';

// ── Constants ─────────────────────────────────────────────────────────

const HEADER_BG: [number, number, number] = [30, 58, 95];
const ALT_ROW: [number, number, number] = [245, 245, 250];
const PAGE_W = 279.4; // letter landscape width mm
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(rl: string): string {
  if (!rl || rl.length !== 8) return rl || '';
  return `${rl.slice(0, 4)}-${rl.slice(4, 6)}-${rl.slice(6, 8)}`;
}

function fmtET(v: number | null | undefined): string { return v != null ? v.toFixed(3) : '—'; }
function fmtMPH(v: number | null | undefined): string { return v != null ? v.toFixed(2) : '—'; }
function fmtVal(v: number | null | undefined, metric: string): string {
  if (v == null) return '—';
  return metric.startsWith('mph') || metric.startsWith('mph_') ? v.toFixed(2) : v.toFixed(3);
}

function header(doc: jsPDF, title: string, subtitle: string, y: number): number {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(subtitle, MARGIN, y + 6);
  doc.setTextColor(0);
  return y + 14;
}

/** Section heading within the report body — compact with colored accent line */
function sectionHead(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 1, MARGIN + doc.getTextWidth(text), y + 1);
  doc.setDrawColor(0);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  return y + 3.5;
}

/** Ensure we have enough room; if not, add a new page and return a fresh Y */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 12) {
    doc.addPage();
    return 14;
  }
  return y;
}

/** Human-readable session scope label */
function fmtScope(scope: string): string {
  if (scope === 'qual') return 'Qualifying Only';
  if (scope === 'elim') return 'Eliminations Only';
  return 'All Rounds';
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  const now = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageH - 12, pageW - MARGIN, pageH - 12);
    doc.setDrawColor(0);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('NHRA Technical Department — Confidential', MARGIN, pageH - 8);
    doc.text(`Page ${i} of ${pages}  •  Generated ${now}`, pageW - MARGIN, pageH - 8, { align: 'right' });
  }
}

/**
 * Capture an SVG element from the DOM as a PNG data URL.
 * Used for Recharts bar/line charts which render as inline SVG.
 */
async function captureSvgAsImage(
  selector: string,
  width = 800,
  height = 250,
): Promise<string | null> {
  const svgEl = document.querySelector(selector) as SVGSVGElement | null;
  if (!svgEl) return null;
  try {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Ensure dimensions are set for canvas rendering
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Inline computed styles for text elements to survive serialization
    clone.querySelectorAll('text').forEach(t => {
      const cs = window.getComputedStyle(t);
      t.style.fontFamily = cs.fontFamily || 'sans-serif';
      t.style.fontSize = cs.fontSize || '10px';
      t.style.fill = cs.fill || '#000';
    });
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // 2x for retina clarity
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
      img.src = url;
    });
  } catch {
    return null;
  }
}

// ── Qual Sheet PDF ─────────────────────────────────────────────────────

export function exportQualSheetPdf(
  sheet: QualSheetRow[],
  eventName: string,
  classIndex: string,
  raceLookup: string,
  correctedETs?: Map<string, number | null>,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const y = header(
    doc,
    `Qualifying Sheet — ${classIndex}`,
    `${eventName} • ${formatDate(raceLookup)}`,
    14,
  );

  autoTable(doc, {
    startY: y,
    head: [[
      '#', 'Driver', 'Best ET', 'Corrected ET', 'Best MPH',
      'Runs', '60ft', '660ft',
    ]],
    body: sheet.map(r => {
      const cET = correctedETs?.get(r.driver) ?? null;
      return [
        r.qual_pos,
        r.driver,
        r.best_et?.toFixed(3) ?? '—',
        cET?.toFixed(3) ?? '—',
        r.best_mph?.toFixed(2) ?? '—',
        r.run_count,
        r.best_ft60?.toFixed(3) ?? '—',
        r.best_ft660?.toFixed(3) ?? '—',
      ];
    }),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 58, 95], fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'right' },
      5: { halign: 'center', cellWidth: 12 },
    },
  });

  footer(doc);
  const qs_date = formatDate(raceLookup).replace(/-/g, '');
  const qs_safe = classIndex.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`NHRA_QualSheet_${qs_safe}_${qs_date}.pdf`);
}

// ── Ladder PDF ─────────────────────────────────────────────────────────

export function exportLadderPdf(
  pairings: LadderPairing[],
  ladderSize: number,
  actualQualifiers: number,
  eventName: string,
  classIndex: string,
  raceLookup: string,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const y = header(
    doc,
    `Elimination Ladder — ${classIndex} (${ladderSize}-car)`,
    `${eventName} • ${formatDate(raceLookup)} • ${actualQualifiers} qualifiers`,
    14,
  );

  autoTable(doc, {
    startY: y,
    head: [['Match', 'Top Seed', 'Driver', 'Best ET', 'vs', 'Bottom Seed', 'Driver', 'Best ET']],
    body: pairings.map(p => [
      `R1-${p.match}`,
      `#${p.top_seed.seed}`,
      p.top_seed.driver,
      p.top_seed.best_et?.toFixed(3) ?? '—',
      'vs',
      p.bottom_seed.driver === 'BYE' ? 'BYE' : `#${p.bottom_seed.seed}`,
      p.bottom_seed.driver === 'BYE' ? '' : p.bottom_seed.driver,
      p.bottom_seed.driver === 'BYE' ? '' : (p.bottom_seed.best_et?.toFixed(3) ?? '—'),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95], fontSize: 9, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 18 },
      1: { halign: 'center', cellWidth: 16 },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 10 },
      5: { halign: 'center', cellWidth: 18 },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  });

  footer(doc);
  const lad_date = formatDate(raceLookup).replace(/-/g, '');
  const lad_safe = classIndex.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`NHRA_Ladder_${lad_safe}_${lad_date}.pdf`);
}

// ── Parity Summary PDF ─────────────────────────────────────────────────

export function exportParitySummaryPdf(
  data: EventParitySummaryResponse,
  eventName: string,
  classIndex: string,
  raceLookup: string,
  correctedRuns?: Map<number, { correctedET: number | null; hpc: number | null }>,
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  let y = header(
    doc,
    `Parity Summary — ${classIndex}`,
    `${eventName} • ${formatDate(raceLookup)} • Model: ${data.correction_model_version}`,
    14,
  );

  // Stats box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Overview', 14, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const stats = [
    ['Total Runs', String(data.run_count)],
    ['Weather Joined', `${data.weather_joined_count} (${data.run_count > 0 ? ((data.weather_joined_count / data.run_count) * 100).toFixed(0) : 0}%)`],
    ['Corrected', `${data.corrected_count} (${data.run_count > 0 ? ((data.corrected_count / data.run_count) * 100).toFixed(0) : 0}%)`],
  ];

  autoTable(doc, {
    startY: y,
    body: stats,
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    theme: 'plain',
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Actual vs Corrected metrics
  const metricsHead = [['', 'Best', 'Top 3 Median', 'Top 5 Median', 'All Median']];
  const metricsBody = [
    [
      'Actual ET',
      data.actual.best?.toFixed(3) ?? '—',
      data.actual.top3_median?.toFixed(3) ?? '—',
      data.actual.top5_median?.toFixed(3) ?? '—',
      data.actual.all_median?.toFixed(3) ?? '—',
    ],
    [
      'Corrected ET',
      data.corrected.best?.toFixed(3) ?? '—',
      data.corrected.top3_median?.toFixed(3) ?? '—',
      data.corrected.top5_median?.toFixed(3) ?? '—',
      data.corrected.all_median?.toFixed(3) ?? '—',
    ],
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Actual vs Corrected', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: metricsHead,
    body: metricsBody,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 95], fontSize: 9, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Runs table (first 50)
  const runsToShow = data.runs.slice(0, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Run Details (${runsToShow.length} of ${data.run_count})`, 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Driver', 'Rnd', 'ET', 'MPH', 'Corrected ET', 'HPC', 'Temp', 'Press']],
    body: runsToShow.map(r => {
      const c = correctedRuns?.get(r.id);
      return [
        r.driver_name || '—',
        r.round || '—',
        r.ft1320?.toFixed(3) ?? '—',
        r.mph1320?.toFixed(1) ?? '—',
        c?.correctedET?.toFixed(3) ?? '—',
        c?.hpc?.toFixed(6) ?? '—',
        r.temp_f != null ? `${r.temp_f.toFixed(0)}°F` : '—',
        r.pressure_inhg != null ? `${r.pressure_inhg.toFixed(2)}"` : '—',
      ];
    }),
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [30, 58, 95], fontSize: 7.5, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    columnStyles: {
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
  });

  footer(doc);
  const ps_date = formatDate(raceLookup).replace(/-/g, '');
  const ps_safe = classIndex.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`NHRA_ParitySummary_${ps_safe}_${ps_date}.pdf`);
}

// ── Event Parity Report PDF ───────────────────────────────────────────
// Section order (all modes):
//   1. Title block + mode badge
//   2. Executive Summary cards
//   3. Combo Summary Comparison (raw-only / corrected-only / combined side-by-side)
//   4. Main chart (captured from live DOM SVG at high DPI)
//   5. Quickest N Runs Per Combo — corrected-ranked in combined/corrected mode
//   6. Incrementals Part A — Raw Best Per Combo
//   7. Incrementals Part B — Per-Driver Incremental Comparison (Compulink-style)
//   8. Weather by Session (once, even in Combined)
//   9. Qualifying Results (always raw order, clearly labeled)
//  10. 5-Event Trend — Raw vs Corrected Best ET Per Combo

export type PdfReportMode = 'raw' | 'corrected' | 'combined';

export interface EventParityPdfInput {
  summary: ParitySummaryResponse;
  qualOrder: ParityQualOrderResponse | null;
  incrementals: ParityIncrementalsResponse | null;
  weather: ParitySessionWeatherResponse | null;
  category: string;
  displayLabel: string;
  /** corrMode drives the data mode for single-mode exports */
  corrMode: 'raw' | 'corrected';
  /** pdfMode selects report layout — defaults to 'combined' */
  pdfMode?: PdfReportMode;
  groupBy?: 'engineCombo' | 'bodyStyle';
  sessionScope?: string;
  /** CSS selector for the bar chart SVG to capture. If null, chart is skipped. */
  chartSelector?: string;
  /**
   * For combined mode: pass the corrected summary so both datasets are available.
   * If not supplied, combined mode falls back to single-mode layout.
   */
  correctedSummary?: ParitySummaryResponse | null;
  /** Per-driver incremental comparison (Compulink-style). Fetched at export time. */
  incrementalComparison?: IncrementalComparisonResponse | null;
  /** 5-event trend matrix — raw mode. Fetched at export time. */
  trendRaw?: RangeParityMatrixResponse | null;
  /** 5-event trend matrix — corrected mode. Fetched at export time. */
  trendCorrected?: RangeParityMatrixResponse | null;
  /**
   * For combined mode: raw summary fetched with higher topN so all corrected-ranked
   * runs can be matched back to their raw ET/MPH by runId.
   */
  rawSummaryExtended?: ParitySummaryResponse | null;
  /**
   * Include the Data Quality / suspect-rows diagnostics section.
   * Defaults to false — not shown in normal distributed reports.
   */
  includeInternalDiagnostics?: boolean;
  /**
   * Include the full Detailed Incremental Comparison per-driver table.
   * Defaults to false — only the Observed Best Per Combo summary is shown by default.
   */
  includeDetailedIncrementals?: boolean;
  /**
   * Include the Historical Trend section.
   * Defaults to true for combined mode, false for raw/corrected single-mode.
   */
  includeHistoricalTrend?: boolean;
  /**
   * Full engine combo list from listEngineCombos().
   * When supplied, PDF chart/legend colors come from the stored color_hex (same as UI).
   * Falls back to fnv1a → COMBO_PALETTE if a combo is not found here.
   */
  engineCombos?: import('./parityApi').EngineComboRow[];
}

// ── Internal layout constants ────────────────────────────────────────
const PAGE_H_LANDSCAPE = 215.9; // letter landscape height mm
const FOOTER_RESERVE = 14;      // mm reserved for footer
const ROW_H = 4.8;              // estimated mm per autoTable row
const HEAD_H = 8;               // estimated mm for a section heading + padding

/** Ensures at least `needed` mm remain on the current page; starts a new page if not. */
function ensureSpaceEP(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H_LANDSCAPE - FOOTER_RESERVE) {
    doc.addPage();
    return MARGIN + 2;
  }
  return y;
}

/** Draws a labeled mode badge pill (Raw / Corrected / Raw+Corrected) */
function drawModeBadge(doc: jsPDF, mode: PdfReportMode, x: number, y: number): void {
  const labels: Record<PdfReportMode, string> = { raw: 'RAW', corrected: 'CORRECTED', combined: 'RAW + CORRECTED' };
  const colors: Record<PdfReportMode, [number, number, number]> = {
    raw: [100, 100, 200],
    corrected: [22, 120, 60],
    combined: [30, 80, 150],
  };
  const label = labels[mode];
  const [r, g, b] = colors[mode];
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const tw = doc.getTextWidth(label);
  const pad = 2.5;
  const bw = tw + pad * 2;
  const bh = 4.5;
  doc.setFillColor(r, g, b);
  doc.roundedRect(x, y - bh + 1, bw, bh, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(label, x + pad, y - 0.5);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
}

/** Draws the page 1 title block; returns updated Y. */
function drawTitleBlock(
  doc: jsPDF, displayLabel: string, mode: PdfReportMode,
  evName: string, trackName: string, city: string | null, state: string | null,
  evDate: string, topN: number, scopeStr: string,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const modeTitles: Record<PdfReportMode, string> = {
    raw: 'Raw Event Parity Report',
    corrected: 'Corrected Event Parity Report',
    combined: 'Event Parity Report',
  };
  let y = 12;

  // Title row
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 40, 80);
  doc.text(`NHRA ${displayLabel} ${modeTitles[mode]}`, MARGIN, y);
  drawModeBadge(doc, mode, pageW - MARGIN - 40, y);
  doc.setTextColor(0);
  y += 6;

  // Metadata row
  const loc = [trackName, city, state].filter(Boolean).join(', ');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`${evName}  •  ${loc}`, MARGIN, y);
  const scopeInfo = scopeStr === 'both' ? '' : `  •  ${fmtScope(scopeStr)}`;
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.text(`${evDate}  •  Top ${topN}${scopeInfo}  •  Generated ${now}`, pageW - MARGIN, y, { align: 'right' });
  doc.setTextColor(0);
  y += 3;

  // Divider
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  y += 4;
  return y;
}

/** Sort combos by isLowerBetter bestValue */
function sortedCombos(combos: ParitySummaryResponse['combos'], isLB: boolean) {
  return [...combos].filter(c => c.bestValue != null).sort((a, b) =>
    isLB ? (a.bestValue! - b.bestValue!) : (b.bestValue! - a.bestValue!)
  );
}

/** Ref value (best across combos) for a given accessor */
function refValue(combos: ParitySummaryResponse['combos'], isLB: boolean, get: (c: ParitySummaryResponse['combos'][0]) => number | null | undefined): number | null {
  return combos.reduce((best, c) => {
    const v = get(c); if (v == null) return best;
    if (best == null) return v;
    return isLB ? Math.min(best, v) : Math.max(best, v);
  }, null as number | null);
}

// ── Combo color helpers ─────────────────────────────────────────
const PDF_COMBO_PALETTE = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ef4444',
  '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#f43f5e',
  '#a855f7', '#84cc16', '#f59e0b', '#0ea5e9', '#d946ef',
];
function _fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** Cached lookup: combo name → color_hex from DB (populated per export) */
let _pdfComboColorMap: Map<string, string> = new Map();
/** Hex string → [r, g, b] */
function _hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
/**
 * Resolve combo color to [r,g,b].
 * Priority: (1) stored color_hex from DB (passed via engineCombos), (2) fnv1a hash palette fallback.
 * Call initComboColors(engineCombos) once per export before using this.
 */
function comboPdfColor(name: string): [number, number, number] {
  const stored = _pdfComboColorMap.get(name);
  if (stored) return _hexToRgb(stored);
  const hex = PDF_COMBO_PALETTE[_fnv1a(name) % PDF_COMBO_PALETTE.length];
  return _hexToRgb(hex);
}
/** Called once at the start of each export to load DB colors into the resolver cache. */
function initComboColors(engineCombos: import('./parityApi').EngineComboRow[] | undefined): void {
  _pdfComboColorMap = new Map();
  if (!engineCombos) return;
  for (const ec of engineCombos) {
    if (ec.color_hex) _pdfComboColorMap.set(ec.name, ec.color_hex);
  }
}
/**
 * Returns a very light tint [r,g,b] of the combo color — safe for PDF row backgrounds.
 * alpha 0.12 keeps it subtle enough for printing and readability.
 */
function comboPdfTint(name: string, alpha = 0.12): [number, number, number] {
  const [r, g, b] = comboPdfColor(name);
  return [
    Math.round(255 - (255 - r) * alpha),
    Math.round(255 - (255 - g) * alpha),
    Math.round(255 - (255 - b) * alpha),
  ];
}
/**
 * Returns a jspdf-autotable `didParseCell` callback that:
 *  - Fills the combo-name cell (col 0) with the full combo color + white text
 *  - Fills remaining cells in that group row with a light tint
 *
 * @param comboPerRow  parallel array, same length as body rows: combo name for each row
 * @param comboCol     column index that holds the combo name (default 0)
 */
function makeComboDidParseCell(
  comboPerRow: string[],
  comboCol = 0,
): (data: any) => void {
  return (data: any) => {
    if (data.section !== 'body') return;
    const rowIdx = data.row.index;
    const combo = comboPerRow[rowIdx];
    if (!combo) return;
    const [r, g, b] = comboPdfColor(combo);
    if (data.column.index === comboCol) {
      // Badge cell: full combo color, white bold text
      data.cell.styles.fillColor = [r, g, b];
      data.cell.styles.textColor = [255, 255, 255];
      data.cell.styles.fontStyle = 'bold';
    } else {
      // Data cells: very light tint
      const [tr, tg, tb] = comboPdfTint(combo);
      data.cell.styles.fillColor = [tr, tg, tb];
    }
  };
}

/** Format a signed delta with leading sign, 3 decimals */
function fmtSignedDelta(val: number | null, ref: number | null): string {
  if (val == null || ref == null) return '—';
  const d = val - ref;
  if (Math.abs(d) < 0.0005) return '—';
  return formatDelta(d, 'et_1320'); // always use ET-style signed formatting
}

// ── Section renderers ─────────────────────────────────────────────────

/** Draws a named section banner (used in combined mode to visually separate Raw / Corrected / Context). */
function renderSectionBanner(doc: jsPDF, y: number, title: string, subtitle: string, color: [number, number, number]): number {
  y = ensureSpaceEP(doc, y, 10);
  const pW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...color);
  doc.rect(MARGIN, y, pW - MARGIN * 2, 6, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, MARGIN + 3, y + 4.3);
  if (subtitle) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pW - MARGIN - 3, y + 4.3, { align: 'right' });
  }
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  return y + 8;
}

/** Renders 4-card (combined) or 3-card (single) executive summary. */
function renderExecSummary(
  doc: jsPDF, y: number, mode: PdfReportMode,
  raw: ParitySummaryResponse, corr: ParitySummaryResponse | null,
  isLB: boolean, metric: string, topN: number,
  weather?: ParitySessionWeatherResponse | null,
): number {
  const daVals = weather?.sessions.map(s => s.density_alt_ft).filter((v): v is number => v != null) ?? [];
  const daRangeStr = daVals.length >= 2
    ? `${Math.round(Math.min(...daVals)).toLocaleString()}–${Math.round(Math.max(...daVals)).toLocaleString()} ft`
    : daVals.length === 1 ? `${Math.round(daVals[0]).toLocaleString()} ft`
    : null;

  const cards: [string, string][] = [];

  if (mode === 'combined' && corr) {
    const rawSorted = sortedCombos(raw.combos, isLB);
    const corrSorted = sortedCombos(corr.combos, isLB);
    const rawAvgLeader = [...rawSorted].sort((a, b) => isLB ? ((a.avgTopN ?? 999) - (b.avgTopN ?? 999)) : ((b.avgTopN ?? 0) - (a.avgTopN ?? 0)))[0];
    const corrAvgLeader = [...corrSorted].sort((a, b) => isLB ? ((a.avgTopN ?? 999) - (b.avgTopN ?? 999)) : ((b.avgTopN ?? 0) - (a.avgTopN ?? 0)))[0];
    cards.push(
      ['Raw Quickest', `${rawSorted[0]?.engineCombo ?? '—'}  ${fmtVal(rawSorted[0]?.bestValue ?? null, metric)}`],
      ['Corrected Quickest', `${corrSorted[0]?.engineCombo ?? '—'}  ${fmtVal(corrSorted[0]?.bestValue ?? null, metric)}`],
      [`Raw Avg Top ${topN} Leader`, `${rawAvgLeader?.engineCombo ?? '—'}  ${fmtVal(rawAvgLeader?.avgTopN ?? null, metric)}`],
      [`Corr Avg Top ${topN} Leader`, `${corrAvgLeader?.engineCombo ?? '—'}  ${fmtVal(corrAvgLeader?.avgTopN ?? null, metric)}`],
    );
    void weather; // used for daVals suppression only
  } else {
    const activeSummary = (mode === 'corrected' && corr) ? corr : raw;
    const sorted = sortedCombos(activeSummary.combos, isLB);
    const quickestCombo = sorted[0]?.engineCombo ?? '—';
    const quickestVal = sorted[0]?.bestValue != null ? fmtVal(sorted[0].bestValue, metric) : '—';
    const avgLeader = [...sorted].sort((a, b) => isLB ? ((a.avgTopN ?? 999) - (b.avgTopN ?? 999)) : ((b.avgTopN ?? 0) - (a.avgTopN ?? 0)))[0];
    const avgs = sorted.map(c => c.avgTopN).filter((v): v is number => v != null);
    const spread = avgs.length >= 2 ? Math.abs(Math.max(...avgs) - Math.min(...avgs)) : null;
    cards.push(
      ['Quickest Combo', `${quickestCombo}  ${quickestVal}`],
      [`Avg Top ${topN} Leader`, `${avgLeader?.engineCombo ?? '—'}  ${fmtVal(avgLeader?.avgTopN ?? null, metric)}`],
      [`Avg Top ${topN} Spread`, spread != null ? formatDelta(spread, metric) : '—'],
    );
    void daRangeStr;
  }

  y = ensureSpaceEP(doc, y, 16);
  const cardW = (CONTENT_W - (cards.length - 1) * 2.5) / cards.length;
  let cx = MARGIN;
  const CARD_H = 11;
  for (const [label, val] of cards) {
    doc.setFillColor(240, 244, 252);
    doc.roundedRect(cx, y, cardW, CARD_H, 1.5, 1.5, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(label, cx + cardW / 2, y + 3.5, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 40, 80);
    doc.text(val, cx + cardW / 2, y + 8.5, { align: 'center', maxWidth: cardW - 2 });
    doc.setTextColor(0);
    cx += cardW + 2.5;
  }
  return y + CARD_H + 3;
}

/**
 * Single-dataset combo summary table.
 * Columns: Combo | Quickest | Delta | Avg Top N | Delta | Total Avg | Delta | Runs
 * Used for both single-mode and each section of combined mode.
 */
function renderSingleComboSummary(
  doc: jsPDF, y: number,
  combos: ParitySummaryResponse['combos'],
  isLB: boolean, metric: string, topN: number, groupLabel: string,
  noteText?: string,
): number {
  const combosSorted = sortedCombos(combos, isLB);
  if (combosSorted.length === 0) return y;
  const bestRef    = refValue(combos, isLB, c => c.bestValue);
  const avgTopNRef = refValue(combos, isLB, c => c.avgTopN);
  const totalAvgRef = refValue(combos, isLB, c => c.totalAvg);

  const needed = HEAD_H + (combosSorted.length + 1) * ROW_H + 10;
  y = ensureSpaceEP(doc, y, needed);

  if (noteText) {
    doc.setFontSize(6.5);
    doc.setTextColor(100);
    doc.text(noteText, MARGIN, y);
    doc.setTextColor(0);
    y += 3;
  }

  const summaryComboPerRow = combosSorted.map(c => c.engineCombo);
  autoTable(doc, {
    startY: y,
    head: [[groupLabel, 'Quickest', 'Delta', `Avg Top ${topN}`, 'Delta', 'Total Avg', 'Delta', 'Runs']],
    body: combosSorted.map(c => [
      c.engineCombo,
      fmtVal(c.bestValue ?? null, metric),
      fmtSignedDelta(c.bestValue ?? null, bestRef),
      fmtVal(c.avgTopN ?? null, metric),
      fmtSignedDelta(c.avgTopN ?? null, avgTopNRef),
      fmtVal(c.totalAvg ?? null, metric),
      fmtSignedDelta(c.totalAvg ?? null, totalAvgRef),
      String(c.countTotal),
    ]),
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 'auto',
    styles: { fontSize: 7.5, cellPadding: 0.85 },
    headStyles: { fillColor: HEADER_BG, fontSize: 7, fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 44 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 22, textColor: [100, 100, 100] },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 22, textColor: [100, 100, 100] },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 22, textColor: [100, 100, 100] },
      7: { halign: 'center', cellWidth: 14 },
    },
    didParseCell: makeComboDidParseCell(summaryComboPerRow),
  });
  return (doc as any).lastAutoTable.finalY + 3;
}

/** jsPDF-rendered horizontal grouped bar chart for combined mode */
function drawCombinedBarChart(
  doc: jsPDF, y: number,
  rawCombos: ParitySummaryResponse['combos'],
  corrCombos: ParitySummaryResponse['combos'],
  isLB: boolean, metric: string, topN: number,
): number {
  const sorted = sortedCombos(rawCombos, isLB);
  if (sorted.length === 0) return y;
  const corrMap = new Map(corrCombos.map(c => [c.engineCombo, c]));

  const vals: number[] = [];
  for (const c of sorted) {
    if (c.avgTopN != null) vals.push(c.avgTopN);
    const cc = corrMap.get(c.engineCombo);
    if (cc?.avgTopN != null) vals.push(cc.avgTopN);
  }
  if (vals.length === 0) return y;

  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 0.05;
  const pad = range * 0.12;
  const scaleMin = minV - pad;
  const scaleMax = maxV + pad;
  const scaleRange = scaleMax - scaleMin;

  const LABEL_W = 46;
  const VAL_W = 16;
  const chartW = CONTENT_W - LABEL_W - VAL_W;
  const chartLeft = MARGIN + LABEL_W;
  const BAR_H = 3.0;
  const BAR_GAP = 0.8;
  const ROW_GAP = 3.0;
  const RAW_COLOR: [number, number, number] = [120, 150, 195];
  const CORR_COLOR: [number, number, number] = [30, 58, 95];

  const neededH = sorted.length * (BAR_H * 2 + BAR_GAP + ROW_GAP) + 24;
  y = ensureSpaceEP(doc, y, neededH + HEAD_H + 6);
  y = sectionHead(doc, `Raw vs Corrected Avg Top ${topN} — Combo Comparison`, y);

  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text(`Avg Top ${topN} ET per combo. Lower value = quicker. Light bars = Raw. Dark bars = Corrected (weather-normalized).`, MARGIN, y);
  doc.setTextColor(0);
  y += 4;

  // Scale tick marks
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  const NTICKS = 4;
  for (let t = 0; t <= NTICKS; t++) {
    const tx = chartLeft + (t / NTICKS) * chartW;
    const tv = scaleMin + (t / NTICKS) * scaleRange;
    doc.line(tx, y, tx, y + 1.5);
    doc.setFontSize(5.5);
    doc.setTextColor(120);
    doc.text(fmtVal(tv, metric), tx, y - 0.5, { align: 'center' });
    doc.setTextColor(0);
  }
  doc.setDrawColor(0);
  y += 3;

  for (const c of sorted) {
    const cc = corrMap.get(c.engineCombo);
    const rawAvg = c.avgTopN;
    const corrAvg = cc?.avgTopN ?? null;

    const label = c.engineCombo.length > 18 ? c.engineCombo.slice(0, 17) + '\u2026' : c.engineCombo;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 40, 80);
    doc.text(label, MARGIN, y + BAR_H * 1.5 + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    if (rawAvg != null) {
      const bw = Math.max(((rawAvg - scaleMin) / scaleRange) * chartW, 0.5);
      doc.setFillColor(...RAW_COLOR);
      doc.rect(chartLeft, y, bw, BAR_H, 'F');
      doc.setFontSize(6);
      doc.setTextColor(60);
      doc.text(fmtVal(rawAvg, metric), Math.min(chartLeft + bw + 1, chartLeft + chartW - 2), y + BAR_H - 0.5);
      doc.setTextColor(0);
    }
    y += BAR_H + BAR_GAP;

    if (corrAvg != null) {
      const bw = Math.max(((corrAvg - scaleMin) / scaleRange) * chartW, 0.5);
      doc.setFillColor(...CORR_COLOR);
      doc.rect(chartLeft, y, bw, BAR_H, 'F');
      doc.setFontSize(6);
      doc.setTextColor(60);
      doc.text(fmtVal(corrAvg, metric), Math.min(chartLeft + bw + 1, chartLeft + chartW - 2), y + BAR_H - 0.5);
      doc.setTextColor(0);
    }
    y += BAR_H + ROW_GAP;
  }

  // Legend
  doc.setFillColor(...RAW_COLOR);
  doc.rect(MARGIN, y, 7, 3, 'F');
  doc.setFontSize(7);
  doc.text(`Raw Avg Top ${topN}`, MARGIN + 9, y + 2.5);
  doc.setFillColor(...CORR_COLOR);
  doc.rect(MARGIN + 70, y, 7, 3, 'F');
  doc.text(`Corrected Avg Top ${topN}`, MARGIN + 79, y + 2.5);
  y += 7;
  return y;
}

/**
 * Vertical ranked-all-runs chart.
 * All topRuns from all combos are collected, sorted globally best→worst,
 * then rendered as vertical bars. Each bar is colored by combo using the
 * same fnv1a → COMBO_PALETTE mapping used in ParityDashPanel.tsx.
 */
function drawRankedRunsChart(
  doc: jsPDF, y: number,
  combos: ParitySummaryResponse['combos'],
  isLB: boolean, metric: string, topN: number,
  mode: 'raw' | 'corrected',
): number {
  // Collect all runs across all combos
  interface RunEntry { combo: string; value: number; driver: string; round: string; }
  const allRuns: RunEntry[] = [];
  for (const c of combos) {
    for (const r of c.topRuns.slice(0, topN)) {
      const v = r.value ?? r.et ?? null;
      if (v != null && v > 0) {
        allRuns.push({ combo: c.engineCombo, value: v, driver: r.driver || '', round: r.round || '' });
      }
    }
  }
  if (allRuns.length === 0) return y;

  // Sort globally: best→worst
  allRuns.sort((a, b) => isLB ? a.value - b.value : b.value - a.value);

  const N = allRuns.length;
  const vals = allRuns.map(r => r.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 0.05;
  const pad = range * 0.15;
  const scaleMin = Math.max(0, minV - pad);
  const scaleMax = maxV + pad * 0.3;
  const scaleRange = scaleMax - scaleMin;

  // Chart geometry — vertical bars
  const AXIS_LABEL_W = 12; // left margin for Y-axis labels
  const TOP_PAD = 10;      // space above bars for top-axis tick labels
  const BOT_PAD = 8;       // space below bars for rank labels
  const chartH = 50;       // fixed bar area height in mm
  const chartW = CONTENT_W - AXIS_LABEL_W;
  const chartLeft = MARGIN + AXIS_LABEL_W;
  const chartBottom = y + TOP_PAD + chartH; void chartBottom;

  const BAR_W = Math.max(1.0, Math.min(5.5, (chartW - N * 0.5) / N));
  const BAR_GAP = Math.max(0.3, (chartW - N * BAR_W) / Math.max(N - 1, 1));

  const neededH = TOP_PAD + chartH + BOT_PAD + 18; // 18 for legend
  y = ensureSpaceEP(doc, y, neededH + HEAD_H + 4);

  const title = mode === 'corrected'
    ? `All Corrected Runs — Ranked Best to Worst`
    : `All Raw Runs — Ranked Best to Worst`;
  y = sectionHead(doc, title, y);

  const chartTopActual = y + TOP_PAD;
  const chartBottomActual = chartTopActual + chartH;

  doc.setFontSize(6);
  doc.setTextColor(100);
  doc.text(
    `${N} runs, ranked ${isLB ? 'quickest' : 'highest'} to ${isLB ? 'slowest' : 'lowest'}. Bar color = engine combo. ${mode === 'corrected' ? 'Corrected ET.' : 'Observed raw ET.'}`,
    MARGIN, y + 3.5,
  );
  doc.setTextColor(0);

  // Y-axis gridlines + tick labels (left side)
  doc.setDrawColor(220);
  doc.setLineWidth(0.15);
  const NTICKS = 5;
  for (let t = 0; t <= NTICKS; t++) {
    const tv = scaleMin + (t / NTICKS) * scaleRange;
    const ty = chartBottomActual - (t / NTICKS) * chartH;
    doc.line(chartLeft, ty, chartLeft + chartW, ty);
    doc.setFontSize(5.5);
    doc.setTextColor(120);
    doc.text(fmtVal(tv, metric), chartLeft - 1, ty + 0.8, { align: 'right' });
    doc.setTextColor(0);
  }
  doc.setDrawColor(0);

  // Bottom axis baseline
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(chartLeft, chartBottomActual, chartLeft + chartW, chartBottomActual);
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);

  // Draw bars
  let bx = chartLeft;
  for (let i = 0; i < allRuns.length; i++) {
    const run = allRuns[i];
    const barH = Math.max(1, ((run.value - scaleMin) / scaleRange) * chartH);
    const [r, g, b] = comboPdfColor(run.combo);
    doc.setFillColor(r, g, b);
    doc.rect(bx, chartBottomActual - barH, BAR_W, barH, 'F');

    // Rank label below bar
    if (BAR_W >= 2.5) {
      doc.setFontSize(4.5);
      doc.setTextColor(100);
      doc.text(String(i + 1), bx + BAR_W / 2, chartBottomActual + 2.5, { align: 'center' });
      doc.setTextColor(0);
    }

    bx += BAR_W + BAR_GAP;
  }

  // Legend: unique combos in palette order, compact 2-col layout
  const legendY = chartBottomActual + BOT_PAD;
  const uniqueCombos = [...new Set(allRuns.map(r => r.combo))];
  doc.setFontSize(6);
  let lx = MARGIN;
  let ly = legendY;
  const LEG_COL_W = CONTENT_W / 3;
  let col = 0;
  for (const combo of uniqueCombos) {
    const [r, g, b] = comboPdfColor(combo);
    doc.setFillColor(r, g, b);
    doc.rect(lx, ly, 4.5, 3, 'F');
    doc.setTextColor(40);
    const label = combo.length > 22 ? combo.slice(0, 21) + '\u2026' : combo;
    doc.text(label, lx + 6, ly + 2.5);
    doc.setTextColor(0);
    col++;
    if (col % 3 === 0) {
      lx = MARGIN;
      ly += 4.5;
    } else {
      lx += LEG_COL_W;
    }
  }
  const legendRows = Math.ceil(uniqueCombos.length / 3);
  return chartBottomActual + BOT_PAD + legendRows * 4.5 + 3;
}

async function renderChart(
  doc: jsPDF, y: number, mode: PdfReportMode, topN: number,
  _chartSelector?: string,
  rawCombos?: ParitySummaryResponse['combos'],
  corrCombos?: ParitySummaryResponse['combos'],
  isLB?: boolean, metric?: string,
): Promise<number> {
  if (mode === 'combined' && rawCombos && corrCombos && isLB != null && metric) {
    return drawCombinedBarChart(doc, y, rawCombos, corrCombos, isLB, metric, topN);
  }
  if ((mode === 'raw' || mode === 'corrected') && isLB != null && metric) {
    const combos = (mode === 'corrected' && corrCombos) ? corrCombos : (rawCombos ?? []);
    if (combos.length > 0) return drawRankedRunsChart(doc, y, combos, isLB, metric, topN, mode);
  }
  return y;
}

function renderTopRuns(
  doc: jsPDF, y: number, mode: PdfReportMode,
  raw: ParitySummaryResponse, corr: ParitySummaryResponse | null,
  isLB: boolean, metric: string, topN: number, groupLabel: string,
  rawExtended?: ParitySummaryResponse | null,
): number {
  if (mode === 'combined' && corr) {
    // Build raw run lookup: primary by runId (from both normal + extended raw summary),
    // fallback by driver::round for runs outside the topN window.
    const rawRunMap = new Map<number, { et: number | null; mph: number | null }>();
    const rawFallback = new Map<string, { et: number | null; mph: number | null }>();
    const _addRawRuns = (combos: ParitySummaryResponse['combos']) => {
      for (const combo of combos) {
        for (const r of combo.topRuns) {
          rawRunMap.set(r.runId, { et: r.et, mph: r.mph });
          if (r.driver && r.round) {
            const fk = `${r.driver}::${r.round}`;
            if (!rawFallback.has(fk)) rawFallback.set(fk, { et: r.et, mph: r.mph });
          }
        }
      }
    };
    _addRawRuns(raw.combos);
    // rawExtended param populated by caller from a higher-topN raw fetch
    if (rawExtended) _addRawRuns(rawExtended.combos);

    y = ensureSpaceEP(doc, y, HEAD_H + 6);
    y = sectionHead(doc, `Quickest ${topN} Runs Per ${groupLabel} — Corrected Ranking`, y);
    doc.setFontSize(6.5);
    doc.setTextColor(100);
    doc.text('Sorted by corrected ET. Raw = observed track result. Corrected = weather-normalized. Not official qualifying order.', MARGIN, y);
    doc.setTextColor(0);
    y += 3.5;

    const rows: (string | number)[][] = [];
    const topRunsComboPerRow: string[] = [];
    for (const c of corr.combos) {
      const runs = [...c.topRuns].sort((a, b) =>
        isLB ? ((a.value ?? 999) - (b.value ?? 999)) : ((b.value ?? 0) - (a.value ?? 0))
      ).slice(0, topN);
      for (let ri = 0; ri < runs.length; ri++) {
        const r = runs[ri];
        const rr = rawRunMap.get(r.runId) ??
          (r.driver && r.round ? rawFallback.get(`${r.driver}::${r.round}`) : undefined);
        const corrET = fmtET(r.et);
        const rawET = rr ? fmtET(rr.et) : '—';
        const corrDelta = (rr?.et != null && r.et != null) ? fmtSignedDelta(r.et, rr.et) : '—';
        rows.push([
          ri === 0 ? c.engineCombo : '',
          r.driver || '—',
          r.round || '',
          corrET,
          rawET,
          corrDelta,
          fmtMPH(r.mph),
          rr ? fmtMPH(rr.mph) : '—',
        ]);
        topRunsComboPerRow.push(c.engineCombo);
      }
    }

    autoTable(doc, {
      startY: y,
      head: [[groupLabel, 'Driver', 'Round', 'Corr ET', 'Raw ET', 'Correction Delta', 'Corr MPH', 'Raw MPH']],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 'auto',
      styles: { fontSize: 7.5, cellPadding: 0.9 },
      headStyles: { fillColor: HEADER_BG, fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22, textColor: [100, 100, 100] },
        5: { halign: 'right', cellWidth: 22, textColor: [80, 80, 160] },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
        7: { halign: 'right', cellWidth: 22, textColor: [100, 100, 100] },
      },
      didParseCell: makeComboDidParseCell(topRunsComboPerRow),
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  } else {
    const activeSummary = (mode === 'corrected' && corr) ? corr : raw;
    y = ensureSpaceEP(doc, y, HEAD_H + 6);
    y = sectionHead(doc, `Quickest ${topN} Runs Per ${groupLabel}`, y);

    const rows: (string | number)[][] = [];
    const singleTopComboPerRow: string[] = [];
    for (const c of activeSummary.combos) {
      const runs = c.topRuns.slice(0, topN);
      for (let ri = 0; ri < runs.length; ri++) {
        const r = runs[ri];
        rows.push([
          ri === 0 ? c.engineCombo : '',
          String(ri + 1),
          r.driver || '—',
          fmtET(r.et),
          fmtMPH(r.mph),
          r.round || '',
          ri === 0 ? '—' : fmtSignedDelta(r.value ?? null, activeSummary.combos.find(cc => cc.engineCombo === c.engineCombo)?.topRuns[0]?.value ?? null),
        ]);
        singleTopComboPerRow.push(c.engineCombo);
      }
    }

    autoTable(doc, {
      startY: y,
      head: [[groupLabel, '#', 'Driver', 'ET', 'Speed', 'Round', 'Delta vs Combo Best']],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 'auto',
      styles: { fontSize: 7.5, cellPadding: 0.85 },
      headStyles: { fillColor: HEADER_BG, fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42 },
        1: { halign: 'center', cellWidth: 10 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 30, textColor: [100, 100, 100] },
      },
      didParseCell: makeComboDidParseCell(singleTopComboPerRow),
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }
  return y;
}

function renderIncrementals(
  doc: jsPDF, y: number,
  incrementals: ParityIncrementalsResponse | null,
  _isLB: boolean,
): number {
  if (!incrementals || incrementals.rows.length === 0 || incrementals.combos.length === 0) return y;
  const visRows = incrementals.rows.filter(row => incrementals.combos.some(c => row.values[c] != null));
  if (visRows.length === 0) return y;

  // Keep-together: force new page only if table won't fit AND we aren't already near page top
  const incFullH = HEAD_H + (visRows.length + 1) * ROW_H + 12;
  const incAlreadyFresh = y <= MARGIN + 32; // within 32mm of top = just started new page
  if (!incAlreadyFresh) y = ensureSpaceEP(doc, y, incFullH);
  y = sectionHead(doc, 'Incrementals — Observed Best Per Combo', y);
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Incrementals are shown from observed timing data. Values represent best individual incremental per combo.', MARGIN, y);
  doc.setTextColor(0);
  y += 3.5;

  const nCombos = incrementals.combos.length;
  const valColW = Math.min(30, (CONTENT_W - 38) / nCombos);
  autoTable(doc, {
    startY: y,
    head: [['Incremental', ...incrementals.combos]],
    body: visRows.map(row => [
      row.label,
      ...incrementals.combos.map(c => {
        const v = row.values[c];
        return v != null ? (isIncrementalMph(row.key) ? fmtMPH(v) : fmtET(v)) : '—';
      }),
    ]),
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 'auto',
    styles: { fontSize: 8, cellPadding: 1.2 },
    headStyles: { fillColor: HEADER_BG, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      ...Object.fromEntries(incrementals.combos.map((_, i) => [i + 1, { halign: 'right' as const, cellWidth: valColW }])),
    },
  });
  return (doc as any).lastAutoTable.finalY + 4;
}

function renderWeather(
  doc: jsPDF, y: number,
  weather: ParitySessionWeatherResponse | null,
): number {
  if (!weather || weather.sessions.length === 0) return y;

  // Orphan guard: need enough for header + at least 2 rows
  const minNeeded = HEAD_H + ROW_H * 2 + 16;
  y = ensureSpaceEP(doc, y, minNeeded);
  y = sectionHead(doc, 'Weather by Session', y);

  // Definitions footnote
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('DA = Density Altitude (ft) | HPC = Horsepower Correction Factor | WG = Water Grains per lb dry air | Baro = absolute station pressure (inHg)', MARGIN, y);
  y += 3.5;
  doc.setTextColor(0);

  autoTable(doc, {
    startY: y,
    head: [['Session', 'Temp °F', 'RH %', 'Baro inHg', 'DA ft', 'HPC', 'WG gr/lb']],
    body: weather.sessions.map(s => {
      const wg = (s.temp_f != null && s.rh_pct != null && s.pressure_inhg != null)
        ? waterGrains(s.pressure_inhg, s.temp_f, pct_to_frac(s.rh_pct))
        : null;
      return [
        s.session + (s.localTimeHint ? ` (${s.localTimeHint})` : ''),
        s.temp_f != null ? s.temp_f.toFixed(1) : '—',
        s.rh_pct != null ? s.rh_pct.toFixed(1) + '%' : '—',
        formatBaro(s.pressure_inhg),
        s.density_alt_ft != null ? Math.round(s.density_alt_ft).toLocaleString() : '—',
        formatHPC(s.hpc),
        formatWG(wg),
      ];
    }),
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 'auto',
    styles: { fontSize: 8, cellPadding: 1.2 },
    headStyles: { fillColor: HEADER_BG, fontSize: 8, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 36 },
      1: { halign: 'right', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 24 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 22 },
    },
  });
  return (doc as any).lastAutoTable.finalY + 4;
}

/** Partition qual order rows into valid and suspect/unknown */
function partitionQualRows(rows: ParityQualOrderResponse['qualOrder']): {
  valid: typeof rows; flagged: typeof rows;
} {
  const valid: typeof rows = [];
  const flagged: typeof rows = [];
  for (const r of rows) {
    const noDriver = !r.driver || r.driver.trim() === '';
    const unknownCombo = !r.engineCombo || r.engineCombo === 'Unknown' || r.engineCombo === '?';
    const invalidET = r.et == null || r.et <= 0;
    if (noDriver || (unknownCombo && invalidET)) {
      flagged.push(r);
    } else {
      valid.push(r);
    }
  }
  return { valid, flagged };
}

function renderQualResults(
  doc: jsPDF, y: number,
  qualOrder: ParityQualOrderResponse | null,
  groupLabel: string,
): number {
  if (!qualOrder || qualOrder.qualOrder.length === 0) return y;
  const { valid } = partitionQualRows(qualOrder.qualOrder);
  if (valid.length === 0) return y;

  y = ensureSpaceEP(doc, y, HEAD_H + ROW_H * 3 + 8);
  y = sectionHead(doc, 'Qualifying Results', y);
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Qualifying order is shown from raw event results and does not represent corrected parity ranking.', MARGIN, y);
  doc.setTextColor(0);
  y += 3.5;

  const best = valid[0]?.et ?? null;
  const makeHalf = (r: typeof valid[0] | undefined, i: number): string[] => {
    if (!r) return ['', '', '', '', '', '', ''];
    const delta = (i > 0 && r.et != null && best != null) ? fmtSignedDelta(r.et, best) : '—';
    return [String(r.qualPosition ?? i + 1), r.driver || '—', fmtET(r.et), fmtMPH(r.mph), r.round || '', r.engineCombo || '?', delta];
  };

  if (valid.length <= 24) {
    // ── Paired two-column layout: ONE autoTable, 15 columns ─────────────
    // Column layout: [Pos Driver ET Speed Rnd Combo Delta | spacer | Pos Driver ET Speed Rnd Combo Delta]
    // Widths: 9+34+17+15+10+19+15 = 119mm each side + 5mm spacer = 243mm (fits 251.4mm landscape)
    const half = Math.ceil(valid.length / 2);
    const pairedRows = Array.from({ length: half }, (_, ii) => [
      ...makeHalf(valid[ii], ii),
      '',
      ...makeHalf(valid[half + ii], half + ii),
    ]);

    // Use full height to keep paired table on one page if possible
    const pairH = HEAD_H + half * 4.5 + 14;
    y = ensureSpaceEP(doc, y, pairH);

    autoTable(doc, {
      startY: y,
      head: [[
        'Pos', 'Driver', 'ET', 'Speed', 'Rnd', groupLabel, 'Delta #1',
        '',
        'Pos', 'Driver', 'ET', 'Speed', 'Rnd', groupLabel, 'Delta #1',
      ]],
      body: pairedRows,
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 'auto',
      styles: { fontSize: 7, cellPadding: 0.9 },
      headStyles: { fillColor: HEADER_BG, fontSize: 6.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: ALT_ROW },
      columnStyles: {
        // Left half
        0:  { halign: 'center', cellWidth: 9 },
        1:  { fontStyle: 'bold', cellWidth: 34 },
        2:  { halign: 'right', cellWidth: 17 },
        3:  { halign: 'right', cellWidth: 15 },
        4:  { halign: 'center', cellWidth: 10 },
        5:  { cellWidth: 19 },
        6:  { halign: 'right', cellWidth: 15, textColor: [100, 100, 100] },
        // Spacer
        7:  { cellWidth: 5 },
        // Right half (mirrors left)
        8:  { halign: 'center', cellWidth: 9 },
        9:  { fontStyle: 'bold', cellWidth: 34 },
        10: { halign: 'right', cellWidth: 17 },
        11: { halign: 'right', cellWidth: 15 },
        12: { halign: 'center', cellWidth: 10 },
        13: { cellWidth: 19 },
        14: { halign: 'right', cellWidth: 15, textColor: [100, 100, 100] },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  } else {
    // ── Single-column fallback for >24 rows ──────────────────────────────
    y = ensureSpaceEP(doc, y, HEAD_H + 5 * ROW_H + 8);
    autoTable(doc, {
      startY: y,
      head: [['Pos', 'Driver', 'ET', 'Speed', 'Round', groupLabel, 'Delta #1']],
      body: valid.map((r, i) => makeHalf(r, i)),
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 'auto',
      styles: { fontSize: 7.5, cellPadding: 0.9 },
      headStyles: { fillColor: HEADER_BG, fontSize: 7.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: ALT_ROW },
      showHead: 'everyPage',
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { fontStyle: 'bold' },
        2: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 18 },
        5: { cellWidth: 36 },
        6: { halign: 'right', cellWidth: 22, textColor: [100, 100, 100] },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }
  return y;
}

/** Detailed Incremental Comparison — best observed run per driver across all sessions */
function renderIncrementalComparison(
  doc: jsPDF, y: number,
  data: IncrementalComparisonResponse | null | undefined,
  include: boolean = false,
): number {
  if (!include) return y;
  if (!data || data.rows.length === 0) return y;

  // De-dup: keep best run per driver (lowest ft1320)
  const bestByDriver = new Map<string, typeof data.rows[0]>();
  for (const r of data.rows) {
    const key = r.driverName || String(r.runId);
    const existing = bestByDriver.get(key);
    if (!existing || (r.ft1320 != null && (existing.ft1320 == null || r.ft1320 < existing.ft1320))) {
      bestByDriver.set(key, r);
    }
  }
  const sorted = [...bestByDriver.values()]
    .filter(r => r.ft1320 != null && r.ft1320 > 0 && r.ft1320 < 10)
    .sort((a, b) => (a.ft1320 ?? 999) - (b.ft1320 ?? 999))
    .slice(0, 30);

  if (sorted.length === 0) return y;

  // Compute column-best for highlight: columns starting at index 4 (first data col)
  type RowT = typeof sorted[0];
  const colDefs: { get: (r: RowT) => number | null; fmt: (v: number) => string; lb: boolean }[] = [
    { get: r => r.ft60,       fmt: v => v.toFixed(3), lb: true  },
    { get: r => r.ft330,      fmt: v => v.toFixed(3), lb: true  },
    { get: r => r.ft660,      fmt: v => v.toFixed(3), lb: true  },
    { get: r => r.mph660,     fmt: v => v.toFixed(2), lb: false },
    { get: r => r.ft1000,     fmt: v => v.toFixed(3), lb: true  },
    { get: r => r.last18,     fmt: v => v.toFixed(3), lb: true  },
    { get: r => r.last18mph,  fmt: v => v.toFixed(2), lb: false },
    { get: r => r.ft1320,     fmt: v => v.toFixed(3), lb: true  },
    { get: r => r.mph1320,    fmt: v => v.toFixed(2), lb: false },
  ];
  const FIRST_DATA_COL = 4;
  const colBest: (string | null)[] = colDefs.map(({ get, fmt, lb }) => {
    let best: number | null = null;
    for (const r of sorted) {
      const v = get(r);
      if (v != null) best = best == null ? v : (lb ? Math.min(best, v) : Math.max(best, v));
    }
    return best != null ? fmt(best) : null;
  });

  doc.addPage();
  y = MARGIN + 2;
  y = sectionHead(doc, 'Detailed Incremental Comparison — Best Per Driver', y);
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Best observed timing run per driver, qualifying + eliminations, sorted by 1320 ft ET. Bold = best value in column.', MARGIN, y);
  doc.setTextColor(0);
  y += 3.5;

  autoTable(doc, {
    startY: y,
    head: [['Pos', 'Driver', 'Round', 'Combo', '60ft', '330ft', '660ft', '660MPH', '1000ft', 'Last 1/8', 'L1/8 MPH', '1320ft', '1320MPH']],
    body: sorted.map((r, i) => [
      i + 1,
      r.driverName || '—',
      r.round || '—',
      r.engineComboName || r.bodyStyleName || '?',
      r.ft60 != null ? r.ft60.toFixed(3) : '—',
      r.ft330 != null ? r.ft330.toFixed(3) : '—',
      r.ft660 != null ? r.ft660.toFixed(3) : '—',
      r.mph660 != null ? r.mph660.toFixed(2) : '—',
      r.ft1000 != null ? r.ft1000.toFixed(3) : '—',
      r.last18 != null ? r.last18.toFixed(3) : '—',
      r.last18mph != null ? r.last18mph.toFixed(2) : '—',
      r.ft1320 != null ? r.ft1320.toFixed(3) : '—',
      r.mph1320 != null ? r.mph1320.toFixed(2) : '—',
    ]),
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 'auto',
    styles: { fontSize: 7.5, cellPadding: 1.1 },
    headStyles: { fillColor: HEADER_BG, fontSize: 7, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT_ROW },
    showHead: 'everyPage',
    columnStyles: {
      0:  { halign: 'center', cellWidth: 10 },
      1:  { fontStyle: 'bold', cellWidth: 38 },
      2:  { halign: 'center', cellWidth: 16 },
      3:  { cellWidth: 30 },
      4:  { halign: 'right', cellWidth: 16 },
      5:  { halign: 'right', cellWidth: 16 },
      6:  { halign: 'right', cellWidth: 16 },
      7:  { halign: 'right', cellWidth: 18 },
      8:  { halign: 'right', cellWidth: 16 },
      9:  { halign: 'right', cellWidth: 16 },
      10: { halign: 'right', cellWidth: 18 },
      11: { halign: 'right', fontStyle: 'bold', cellWidth: 16 },
      12: { halign: 'right', cellWidth: 18 },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') return;
      const ci = hookData.column.index - FIRST_DATA_COL;
      if (ci < 0 || ci >= colBest.length) return;
      const best = colBest[ci];
      if (best != null && String(hookData.cell.raw) === best) {
        hookData.cell.styles.fillColor = [180, 230, 180];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });
  return (doc as any).lastAutoTable.finalY + 3;
}

/**
 * Previous same-track event comparison block.
 * Derives prior-event data from the trend matrix (no extra API call needed).
 * Returns updated y, or y unchanged if no prior same-track event is found.
 */
function renderPrevTrackComparison(
  doc: jsPDF, y: number,
  currentTrackName: string,
  currentEventId: number,
  trendRaw: RangeParityMatrixResponse | null | undefined,
  trendCorrected: RangeParityMatrixResponse | null | undefined,
  isLB: boolean, metric: string,
): number {
  const trend = trendRaw ?? trendCorrected;
  if (!trend || trend.events.length < 2) return y;

  // Find the most-recent prior event at same track, before currentEventId date-wise
  const currentEv = trend.events.find(e => e.eventId === currentEventId);
  if (!currentEv) return y;

  const sameTrackPrior = [...trend.events]
    .filter(e => e.eventId !== currentEventId
      && e.track_name === currentTrackName
      && e.start_date_local < currentEv.start_date_local)
    .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local))[0];

  if (!sameTrackPrior) return y;

  const prevId = sameTrackPrior.eventId;
  const combos = trend.combos;

  // Build comparison rows: combo | curr raw best | prev raw best | curr corr best | prev corr best
  interface CompRow {
    combo: string;
    currRaw: number | null; prevRaw: number | null;
    currCorr: number | null; prevCorr: number | null;
  }
  const rows: CompRow[] = combos.map(combo => ({
    combo,
    currRaw:  trendRaw?.matrix[currentEventId]?.[combo]?.best ?? null,
    prevRaw:  trendRaw?.matrix[prevId]?.[combo]?.best ?? null,
    currCorr: trendCorrected?.matrix[currentEventId]?.[combo]?.best ?? null,
    prevCorr: trendCorrected?.matrix[prevId]?.[combo]?.best ?? null,
  })).filter(r => r.currRaw != null || r.currCorr != null || r.prevRaw != null || r.prevCorr != null);

  if (rows.length === 0) return y;

  // Sort by current corrected best (or raw if no corr)
  rows.sort((a, b) => {
    const va = a.currCorr ?? a.currRaw ?? 999;
    const vb = b.currCorr ?? b.currRaw ?? 999;
    return isLB ? va - vb : vb - va;
  });

  const prevLabel = sameTrackPrior.event_code
    ? `${sameTrackPrior.start_date_local.slice(0, 4)} ${sameTrackPrior.event_code}`
    : sameTrackPrior.event_name.length > 28
      ? sameTrackPrior.event_name.slice(0, 27) + '\u2026'
      : sameTrackPrior.event_name;

  const neededH = HEAD_H + (rows.length + 1) * ROW_H + 12;
  y = ensureSpaceEP(doc, y, neededH);
  y = sectionHead(doc, `Previous Same-Track Event Comparison — ${prevLabel}`, y);

  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text(
    `${currentTrackName}. Previous: ${sameTrackPrior.event_name} (${sameTrackPrior.start_date_local.slice(0, 10)}). Delta = current minus previous; negative = improvement.`,
    MARGIN, y,
  );
  doc.setTextColor(0);
  y += 3.5;

  const hasCorr = rows.some(r => r.currCorr != null || r.prevCorr != null);
  const head = hasCorr
    ? [['Engine Combo', 'Curr Raw', 'Prev Raw', 'Raw Delta', 'Curr Corr', 'Prev Corr', 'Corr Delta']]
    : [['Engine Combo', 'Curr Raw', 'Prev Raw', 'Raw Delta']];

  const body = rows.map(r => {
    const rawDelta = (r.currRaw != null && r.prevRaw != null)
      ? fmtSignedDelta(r.currRaw, r.prevRaw) : '—';
    const corrDelta = (r.currCorr != null && r.prevCorr != null)
      ? fmtSignedDelta(r.currCorr, r.prevCorr) : '—';
    if (hasCorr) {
      return [
        r.combo,
        fmtVal(r.currRaw, metric), fmtVal(r.prevRaw, metric), rawDelta,
        fmtVal(r.currCorr, metric), fmtVal(r.prevCorr, metric), corrDelta,
      ];
    }
    return [r.combo, fmtVal(r.currRaw, metric), fmtVal(r.prevRaw, metric), rawDelta];
  });

  const prevTrackComboPerRow = rows.map(r => r.combo);
  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 'auto',
    styles: { fontSize: 7.5, cellPadding: 0.9 },
    headStyles: { fillColor: HEADER_BG, fontSize: 7, fontStyle: 'bold' },
    columnStyles: hasCorr ? {
      0: { fontStyle: 'bold', cellWidth: 44 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 20, textColor: [120, 120, 120] },
      3: { halign: 'right', cellWidth: 20, textColor: [80, 80, 160] },
      4: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 20, textColor: [120, 120, 120] },
      6: { halign: 'right', cellWidth: 20, textColor: [80, 80, 160] },
    } : {
      0: { fontStyle: 'bold', cellWidth: 44 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 22, textColor: [120, 120, 120] },
      3: { halign: 'right', cellWidth: 22, textColor: [80, 80, 160] },
    },
    didParseCell: (data: any) => {
      if (data.section !== 'body') return;
      // Combo color treatment
      makeComboDidParseCell(prevTrackComboPerRow)(data);
      // Delta green/red (applied after tint so it wins on delta cols)
      const ci = data.column.index;
      if ((hasCorr && (ci === 3 || ci === 6)) || (!hasCorr && ci === 3)) {
        const v = String(data.cell.raw);
        if (v.startsWith('-')) data.cell.styles.textColor = [20, 110, 40];
        else if (v.startsWith('+')) data.cell.styles.textColor = [160, 50, 50];
      }
    },
  });
  return (doc as any).lastAutoTable.finalY + 4;
}

/** 5-event trend table — combos as rows, events as columns, raw + corrected side by side */
function renderTrend(
  doc: jsPDF, y: number,
  rawTrend: RangeParityMatrixResponse | null | undefined,
  corrTrend: RangeParityMatrixResponse | null | undefined,
  currentEventId: number,
  metric: string,
  isLB: boolean,
): number {
  void isLB; // reserved for future sort override — currently trend uses API-side sorting
  const trend = corrTrend ?? rawTrend;
  if (!trend || trend.events.length === 0 || trend.combos.length === 0) return y;

  const events = trend.events;
  const combos = trend.combos;

  // Build short event labels
  function shortLabel(ev: { event_name: string; event_code?: string | null; start_date_local: string }): string {
    const yr = ev.start_date_local.slice(2, 4);
    if (ev.event_code) return `'${yr} ${ev.event_code}`;
    const words = ev.event_name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/)
      .filter(w => w.length > 1 && !['THE', 'NHRA', 'OF', 'AT'].includes(w));
    const code = words.length > 0 ? words[0].slice(0, 3) : ev.start_date_local.slice(5, 10);
    return `'${yr} ${code}`;
  }
  const evLabels = events.map(ev => shortLabel(ev));

  // Per-combo rows
  const tableRows = combos.map(combo => {
    const cells: string[] = [combo];
    let corrAvgSum = 0; let corrAvgCount = 0;
    let rawAvgSum = 0; let rawAvgCount = 0;
    let currentCorrBest: number | null = null;

    for (const ev of events) {
      const rawCell = rawTrend?.matrix[ev.eventId]?.[combo];
      const corrCell = corrTrend?.matrix[ev.eventId]?.[combo];
      cells.push(rawCell?.best != null ? fmtVal(rawCell.best, metric) : '—');
      cells.push(corrCell?.best != null ? fmtVal(corrCell.best, metric) : '—');
      if (rawCell?.best != null) { rawAvgSum += rawCell.best; rawAvgCount++; }
      if (corrCell?.best != null) { corrAvgSum += corrCell.best; corrAvgCount++; }
      if (ev.eventId === currentEventId && corrCell?.best != null) currentCorrBest = corrCell.best;
    }

    const rawAvg = rawAvgCount > 0 ? rawAvgSum / rawAvgCount : null;
    const corrAvg = corrAvgCount > 0 ? corrAvgSum / corrAvgCount : null;
    cells.push(rawAvg != null ? fmtVal(rawAvg, metric) : '—');
    cells.push(corrAvg != null ? fmtVal(corrAvg, metric) : '—');

    // Trend delta: current corr best vs 5-event corr avg
    if (currentCorrBest != null && corrAvg != null) {
      const d = currentCorrBest - corrAvg;
      cells.push(Math.abs(d) < 0.0005 ? '—' : formatDelta(d, metric));
    } else {
      cells.push('—');
    }
    return cells;
  });

  // Column headers: Combo | [Ev1 Raw, Ev1 Corr] … | Avg Raw | Avg Corr | Trend Δ
  const headerRow1: string[] = ['', ...events.flatMap((_, i) => [evLabels[i], '']), 'Avg', '', 'Trend'];
  const headerRow2: string[] = [trend.groupBy === 'bodyStyle' ? 'Body Style' : 'Engine Combo',
    ...events.flatMap(() => ['Raw', 'Corr']),
    'Raw', 'Corr', 'Delta',
  ];

  y = ensureSpaceEP(doc, y, HEAD_H + (combos.length + 2) * ROW_H + 12);
  y = sectionHead(doc, 'Historical Trend — Raw vs Corrected Best ET Per Combo (5 Events)', y);
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Best ET per combo per event. Corrected = weather-normalized. Trend Delta = current event corrected ET vs 5-event corrected average.', MARGIN, y);
  doc.setTextColor(0);
  y += 3.5;

  const nEv = events.length;
  const evColW = Math.min(16, Math.max(12, (CONTENT_W - 44 - 16 - 16 - 18) / (nEv * 2)));
  const colStyles: Record<number, object> = {
    0: { fontStyle: 'bold' as const, cellWidth: 44 },
  };
  for (let i = 0; i < nEv * 2; i++) {
    const isCorr = i % 2 === 1;
    colStyles[i + 1] = { halign: 'right' as const, cellWidth: evColW, ...(isCorr ? { fontStyle: 'bold' as const } : { textColor: [130, 130, 130] }) };
  }
  const afterEv = nEv * 2 + 1;
  colStyles[afterEv] = { halign: 'right' as const, cellWidth: 16, textColor: [130, 130, 130] };
  colStyles[afterEv + 1] = { halign: 'right' as const, cellWidth: 16, fontStyle: 'bold' as const };
  colStyles[afterEv + 2] = { halign: 'right' as const, cellWidth: 18, textColor: [80, 80, 160] };

  autoTable(doc, {
    startY: y,
    head: [headerRow1, headerRow2],
    body: tableRows,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 'auto',
    styles: { fontSize: 7, cellPadding: 1.0 },
    headStyles: { fillColor: HEADER_BG, fontSize: 6.5, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: colStyles,
    didParseCell: (data) => {
      // Bold/color Trend Δ cells
      if (data.section === 'body' && data.column.index === afterEv + 2) {
        const v = String(data.cell.raw);
        if (v.startsWith('+')) data.cell.styles.textColor = [160, 60, 60];
        else if (v.startsWith('-')) data.cell.styles.textColor = [30, 120, 30];
      }
    },
  });
  return (doc as any).lastAutoTable.finalY + 4;
}

/** Data quality diagnostics — only rendered when includeInternalDiagnostics is true */
function renderDataQualityCompact(
  doc: jsPDF, y: number,
  raw: ParitySummaryResponse,
  qualOrder: ParityQualOrderResponse | null,
  include: boolean = false,
): number {
  if (!include) return y;
  const excluded = raw.combos.flatMap(c =>
    (c.topRuns as any[]).filter((r: any) => r.excluded || r.flagged)
  );
  const { flagged: suspectRows } = qualOrder
    ? partitionQualRows(qualOrder.qualOrder)
    : { flagged: [] as ParityQualOrderResponse['qualOrder'] };

  y = ensureSpaceEP(doc, y, HEAD_H + ROW_H * 3 + 8);
  y = sectionHead(doc, 'Data Quality', y);

  if (excluded.length === 0 && suspectRows.length === 0) {
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text('No excluded, flagged, or suspect rows found in this event scope.', MARGIN, y);
    doc.setTextColor(0);
    return y + 5;
  }

  // Summary counts
  const summaryBody: string[][] = [];
  if (excluded.length > 0) summaryBody.push(['Runs excluded from parity calculations', String(excluded.length)]);
  if (suspectRows.length > 0) summaryBody.push(['Suspect qualifying / import rows', String(suspectRows.length)]);
  autoTable(doc, {
    startY: y,
    body: summaryBody,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 130,
    styles: { fontSize: 7.5, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } },
    theme: 'plain',
  });
  y = (doc as any).lastAutoTable.finalY + 2;

  // Excluded runs detail (if small enough)
  if (excluded.length > 0 && excluded.length <= 20) {
    y = ensureSpaceEP(doc, y, HEAD_H + excluded.length * ROW_H + 6);
    autoTable(doc, {
      startY: y,
      head: [['Driver', 'Combo', 'ET', 'Speed', 'Round', 'Flag']],
      body: excluded.map((r: any) => [
        r.driver || '(no driver)',
        r.engineCombo || '?',
        fmtET(r.et),
        fmtMPH(r.mph),
        r.round || '',
        r.flagged ? 'Flagged' : 'Excluded',
      ]),
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 'auto',
      styles: { fontSize: 7.5, cellPadding: 1.1 },
      headStyles: { fillColor: [100, 60, 60], fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      columnStyles: {
        2: { halign: 'right', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 18 }, 5: { cellWidth: 22 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // Suspect qualifying rows detail
  if (suspectRows.length > 0) {
    y = ensureSpaceEP(doc, y, HEAD_H + suspectRows.length * ROW_H + 6);
    doc.setFontSize(6.5);
    doc.setTextColor(100);
    doc.text('Suspect rows are excluded from parity qualifying order. Reasons: missing driver, unknown combo, or implausible ET/speed.', MARGIN, y);
    doc.setTextColor(0);
    y += 3.5;
    autoTable(doc, {
      startY: y,
      head: [['Driver', 'Combo', 'ET', 'Speed', 'Round', 'Reason']],
      body: suspectRows.map(r => [
        r.driver || '(no driver)',
        r.engineCombo || '?',
        fmtET(r.et),
        fmtMPH(r.mph),
        r.round || '',
        !r.driver || r.driver.trim() === '' ? 'Missing driver'
          : (!r.engineCombo || r.engineCombo === 'Unknown' || r.engineCombo === '?') && (r.et == null || r.et <= 0)
            ? 'Unknown combo + invalid ET'
            : r.et == null || r.et <= 0 ? 'Invalid ET'
            : 'Incomplete pass',
      ]),
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 'auto',
      styles: { fontSize: 7.5, cellPadding: 1.1 },
      headStyles: { fillColor: [120, 80, 30], fontSize: 7, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 252, 240] },
      columnStyles: {
        2: { halign: 'right', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 18 }, 5: { cellWidth: 38 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }
  return y;
}

/**
 * Footer with mode label on every page.
 * splitPage: if set, pages 1..splitPage are labeled 'Raw', the rest 'Corrected' (combined mode).
 */
function footerEP(doc: jsPDF, mode: PdfReportMode, displayLabel: string, splitPage?: number) {
  const pages = doc.getNumberOfPages();
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    const pW = doc.internal.pageSize.getWidth();
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pH - 10, pW - MARGIN, pH - 10);
    doc.setDrawColor(0);
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text('NHRA Technical Department — Confidential', MARGIN, pH - 6.5);
    const sectionLabel = mode === 'combined' && splitPage != null
      ? (i <= splitPage ? 'Raw' : 'Corrected')
      : (mode === 'raw' ? 'Raw' : mode === 'corrected' ? 'Corrected' : 'Raw + Corrected');
    doc.text(`${displayLabel}  •  ${sectionLabel}  •  ${now}`, pW / 2, pH - 6.5, { align: 'center' });
    doc.text(`Page ${i} of ${pages}`, pW - MARGIN, pH - 6.5, { align: 'right' });
    doc.setTextColor(0);
  }
}

// ── Main export function ──────────────────────────────────────────────

export async function exportEventParityPdf(input: EventParityPdfInput): Promise<void> {
  // Populate DB combo colors so comboPdfColor() uses color_hex throughout this export
  initComboColors(input.engineCombos);

  const {
    summary, qualOrder, incrementals, weather, displayLabel,
    groupBy = 'engineCombo', sessionScope: rawScope,
    correctedSummary, incrementalComparison, trendRaw, trendCorrected,
  } = input;
  const pdfMode: PdfReportMode = input.pdfMode ?? 'combined';
  // corr is always fetched for both corrected and combined modes from the caller
  const corr = correctedSummary ?? null;
  const scopeStr = rawScope ?? summary.sessionScope ?? 'both';
  const currentEventId = summary.eventId;
  const evDate = summary.event.start_date_local?.slice(0, 10) || '';

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

  /**
   * Renders a complete single-mode report (raw or corrected) into doc.
   * activeSummary must already be the correctly-moded data (raw or corrected).
   */
  async function renderSingleMode(
    mode: 'raw' | 'corrected',
    activeSummary: ParitySummaryResponse,
  ): Promise<void> {
    const metric = activeSummary.metric;
    const isLB = activeSummary.isLowerBetter;
    const topN = activeSummary.topN;
    const groupLabel = groupBy === 'bodyStyle' ? 'Body Style' : 'Engine Combo';
    const evName = activeSummary.event.event_name || 'Event';
    const evDateLocal = activeSummary.event.start_date_local?.slice(0, 10) || '';

    let y = drawTitleBlock(
      doc, displayLabel, mode,
      evName, activeSummary.event.track_name, activeSummary.event.city ?? null, activeSummary.event.state ?? null,
      evDateLocal, topN, scopeStr,
    );
    const diagOn = input.includeInternalDiagnostics === true;
    const detailInc = input.includeDetailedIncrementals === true;
    const includeTrend = input.includeHistoricalTrend ?? false; // off by default for single-mode
    y = renderExecSummary(doc, y, mode, activeSummary, null, isLB, metric, topN, weather);
    y += 1;
    y = renderSingleComboSummary(doc, y, activeSummary.combos, isLB, metric, topN, groupLabel,
      `Deltas vs best combo per metric. Positive delta = slower/higher. Baseline = quickest ${groupLabel}.`);
    y = await renderChart(doc, y, mode, topN, input.chartSelector, activeSummary.combos, undefined, isLB, metric);
    y = renderTopRuns(doc, y, mode, activeSummary, null, isLB, metric, topN, groupLabel);
    y = renderIncrementals(doc, y, incrementals, isLB);
    y = renderIncrementalComparison(doc, y, incrementalComparison, detailInc);
    y = renderWeather(doc, y, weather);
    y = renderQualResults(doc, y, qualOrder, groupLabel);
    if (includeTrend) y = renderTrend(doc, y, trendRaw, trendCorrected, currentEventId, metric, isLB);
    renderDataQualityCompact(doc, y, activeSummary, qualOrder, diagOn);
  }

  if (pdfMode === 'combined' && corr) {
    // ── Section A: Overview (title + exec summary) ──
    const metric = summary.metric;
    const isLB = summary.isLowerBetter;
    const topN = summary.topN;
    const groupLabel = groupBy === 'bodyStyle' ? 'Body Style' : 'Engine Combo';
    const evName = summary.event.event_name || 'Event';

    let y = drawTitleBlock(
      doc, displayLabel, 'combined',
      evName, summary.event.track_name, summary.event.city ?? null, summary.event.state ?? null,
      evDate, topN, scopeStr,
    );
    const diagOn = input.includeInternalDiagnostics === true;
    const detailInc = input.includeDetailedIncrementals === true;
    const includeTrend = input.includeHistoricalTrend ?? true; // on by default for combined
    y = renderExecSummary(doc, y, 'combined', summary, corr, isLB, metric, topN, weather);
    y += 2;

    // ── Section B: Raw Performance ──
    y = renderSectionBanner(doc, y, 'Raw Performance Summary',
      `Observed event results — no weather correction`, [80, 100, 145]);
    y = renderSingleComboSummary(doc, y, summary.combos, isLB, metric, topN, groupLabel,
      `Deltas vs best raw combo. Positive = slower.`);
    y = drawRankedRunsChart(doc, y, summary.combos, isLB, metric, topN, 'raw');
    y = renderTopRuns(doc, y, 'raw', summary, null, isLB, metric, topN, groupLabel);

    // ── Section C: Corrected Parity ──
    y = renderSectionBanner(doc, y, 'Corrected Parity Summary',
      `Weather-normalized ranking`, [30, 58, 95]);
    y = renderSingleComboSummary(doc, y, corr.combos, isLB, metric, topN, groupLabel,
      `Deltas vs best corrected combo. Positive = slower after correction.`);
    y = drawRankedRunsChart(doc, y, corr.combos, isLB, metric, topN, 'corrected');
    y = renderTopRuns(doc, y, 'corrected', corr, null, isLB, metric, topN, groupLabel);

    // ── Section D: Shared Event Context ──
    y = renderSectionBanner(doc, y, 'Event Context',
      `Shared event data — raw observed values`, [100, 110, 120]);
    y = renderPrevTrackComparison(doc, y, summary.event.track_name, currentEventId, trendRaw, trendCorrected, isLB, metric);
    y = renderIncrementals(doc, y, incrementals, isLB);
    y = renderIncrementalComparison(doc, y, incrementalComparison, detailInc);
    y = renderWeather(doc, y, weather);
    y = renderQualResults(doc, y, qualOrder, groupLabel);
    if (includeTrend) y = renderTrend(doc, y, trendRaw, trendCorrected, currentEventId, metric, isLB);
    renderDataQualityCompact(doc, y, summary, qualOrder, diagOn);
  } else {
    // ── Single-mode report (raw or corrected) ──
    // corr is provided for corrected mode; use it directly as activeSummary
    const activeSummary = pdfMode === 'corrected' && corr ? corr : summary;
    const mode: 'raw' | 'corrected' = pdfMode === 'corrected' ? 'corrected' : 'raw';
    await renderSingleMode(mode, activeSummary);
  }

  // ── Footer on every page ──
  footerEP(doc, pdfMode, displayLabel);

  // ── Save ──
  const safeCategory = (displayLabel || input.category || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDate = evDate.replace(/-/g, '');
  const modeSuffix = pdfMode === 'raw' ? '_Raw' : pdfMode === 'corrected' ? '_Corrected' : '_Combined';
  doc.save(`NHRA_EventParity_${safeCategory}${modeSuffix}_${safeDate}.pdf`);
}

// ── Long-Term Parity Report PDF ───────────────────────────────────────
// Mirrors the on-screen Long-Term Report in ParityReport.tsx:
//   1. Title block with category/metric/mode context
//   2. Quickest Run per Combo — transposed table (combos × events)
//   3. Avg Top N per Combo — transposed table
//   4. Line charts captured from DOM SVG if available

export interface LongTermParityPdfInput {
  data: RangeParityMatrixResponse;
  category: string;
  displayLabel: string;
  corrMode: 'raw' | 'corrected';
  metric: string;
  topN: number;
  groupBy?: 'engineCombo' | 'bodyStyle';
  /** CSS selectors for the two line chart SVGs. If null, charts are skipped. */
  bestChartSelector?: string;
  avgChartSelector?: string;
  /** Full engine combo list from listEngineCombos() — used for DB color_hex resolution. */
  engineCombos?: import('./parityApi').EngineComboRow[];
}

/** Generate a short event code like "2025 GAT" from event name + date */
function eventShortCode(ev: { event_name: string; event_code?: string | null; start_date_local: string }): string {
  const yr = ev.start_date_local.slice(0, 4);
  if (ev.event_code) return `${yr} ${ev.event_code}`;
  const name = ev.event_name.toUpperCase();
  const words = name.replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 1 && !['THE', 'NHRA', 'OF', 'AT'].includes(w));
  let code = '';
  if (words.length > 0) {
    code = words[0].slice(0, 2) + (words.length > 1 ? words[1].charAt(0) : words[0].charAt(2) || '');
  }
  if (!code) code = ev.start_date_local.slice(5, 7) + ev.start_date_local.slice(8, 10);
  return `${yr} ${code}`;
}

export async function exportLongTermParityPdf(input: LongTermParityPdfInput): Promise<void> {
  // Populate DB combo colors for consistent color_hex resolution
  initComboColors(input.engineCombos);

  const { data, displayLabel, corrMode, metric, topN, groupBy = 'engineCombo' } = input;
  const isLB = data.isLowerBetter;
  const modeLabel = corrMode === 'raw' ? 'Raw' : 'Corrected';
  const groupLabel = groupBy === 'bodyStyle' ? 'Body Style' : 'Engine Combo';
  const events = data.events;
  const combos = data.combos;
  const nEvents = events.length;

  if (nEvents === 0) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();

  // Event labels (deduplicated short codes)
  const rawCodes = events.map(ev => eventShortCode(ev));
  const codeCount: Record<string, number> = {};
  rawCodes.forEach(code => { codeCount[code] = (codeCount[code] ?? 0) + 1; });
  const codeSeen: Record<string, number> = {};
  const evLabels = rawCodes.map(code => {
    if ((codeCount[code] ?? 1) <= 1) return code;
    codeSeen[code] = (codeSeen[code] ?? 0) + 1;
    return `${code}${codeSeen[code]}`;
  });

  // Build per-combo data
  type ComboRow = { combo: string; values: (number | null)[]; avg: number | null };
  function buildRows(getter: (cell: { best: number; avgTopN: number }) => number): ComboRow[] {
    return combos.map(c => {
      const vals = events.map(ev => {
        const cell = data.matrix[ev.eventId]?.[c];
        return cell ? getter(cell) : null;
      });
      const nums = vals.filter((v): v is number => v != null);
      return { combo: c, values: vals, avg: nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null };
    });
  }
  const bestData = buildRows(cell => cell.best);
  const avg4Data = buildRows(cell => cell.avgTopN);

  function calcAvgRef(rows: ComboRow[]): number | null {
    return rows.reduce((best, r) => {
      if (r.avg == null) return best;
      if (best == null) return r.avg;
      return isLB ? Math.min(best, r.avg) : Math.max(best, r.avg);
    }, null as number | null);
  }

  // ── Title block ──
  let y = 12;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`NHRA ${displayLabel} ${modeLabel} Long-Term Parity Report`, MARGIN, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const ltScope = data.sessionScope === 'both' ? '' : `  •  ${fmtScope(data.sessionScope)}`;
  doc.text(`${nEvents} events  •  Top ${topN}${ltScope}`, MARGIN, y);
  doc.text(`${data.startDate} – ${data.endDate}`, pageW - MARGIN, y, { align: 'right' });
  doc.setTextColor(0);
  y += 2;
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  doc.setDrawColor(0);
  y += 4;

  // Helper: render transposed range table (combos as rows, events as columns)
  function rangeTable(title: string, rows: ComboRow[], ref: number | null) {
    y = ensureSpace(doc, y, 20);
    y = sectionHead(doc, title, y);

    const headRow = [groupLabel, ...evLabels, 'AVG', 'Δ'];
    const bodyRows = rows.map(row => {
      const delta = ref != null && row.avg != null ? (isLB ? row.avg - ref : ref - row.avg) : null;
      return [
        row.combo,
        ...row.values.map(v => v != null ? fmtVal(v, metric) : ''),
        row.avg != null ? fmtVal(row.avg, metric) : '—',
        delta != null ? (Math.abs(delta) < 0.0005 ? '—' : formatDelta(delta, metric)) : '—',
      ];
    });

    // Dynamic column widths based on event count
    const evColW = Math.min(22, Math.max(14, (CONTENT_W - 42 - 22 - 18) / nEvents));
    const colStyles: Record<number, any> = { 0: { fontStyle: 'bold', cellWidth: 42 } };
    for (let i = 1; i <= nEvents; i++) colStyles[i] = { halign: 'right', cellWidth: evColW };
    colStyles[nEvents + 1] = { halign: 'right', fontStyle: 'bold', cellWidth: 22 };
    colStyles[nEvents + 2] = { halign: 'right', cellWidth: 18, textColor: [120, 120, 120] };

    const ltComboPerRow = rows.map(r => r.combo);
    autoTable(doc, {
      startY: y,
      head: [headRow],
      body: bodyRows,
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: 'auto',
      styles: { fontSize: 7.5, cellPadding: 0.9 },
      headStyles: { fillColor: HEADER_BG, fontSize: 7, fontStyle: 'bold' },
      columnStyles: colStyles,
      didParseCell: makeComboDidParseCell(ltComboPerRow),
    });
    y = (doc as any).lastAutoTable.finalY + 3;
  }

  // ── Section 1: Quickest Run table ──
  rangeTable(`Quickest Run Per Combo — Previous ${nEvents} Events`, bestData, calcAvgRef(bestData));

  // ── Section 2: Best chart ──
  if (input.bestChartSelector) {
    const chartImg = await captureSvgAsImage(input.bestChartSelector, 900, 180);
    if (chartImg) {
      y = ensureSpace(doc, y, 38);
      y = sectionHead(doc, `Quickest Run Per Combo — Trend`, y);
      const imgW = CONTENT_W * 0.85;
      const imgH = imgW * (180 / 900);
      doc.addImage(chartImg, 'PNG', MARGIN + (CONTENT_W - imgW) / 2, y, imgW, imgH);
      y += imgH + 4;
    }
  }

  // ── Section 3: Avg Top N table ──
  rangeTable(`Average ${topN} Quickest Per Combo — Previous ${nEvents} Events`, avg4Data, calcAvgRef(avg4Data));

  // ── Section 4: Avg chart ──
  if (input.avgChartSelector) {
    const chartImg = await captureSvgAsImage(input.avgChartSelector, 900, 180);
    if (chartImg) {
      y = ensureSpace(doc, y, 38);
      y = sectionHead(doc, `Average ${topN} Quickest Per Combo — Trend`, y);
      const imgW = CONTENT_W * 0.85;
      const imgH = imgW * (180 / 900);
      doc.addImage(chartImg, 'PNG', MARGIN + (CONTENT_W - imgW) / 2, y, imgW, imgH);
      y += imgH + 4;
    }
  }

  footer(doc);

  const safeCategory = (displayLabel || input.category || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
  const startYear = data.startDate?.slice(0, 4) || '';
  const endYear = data.endDate?.slice(0, 4) || '';
  const dateRange = startYear === endYear ? startYear : `${startYear}-${endYear}`;
  const modeSuffix = corrMode === 'corrected' ? '_Corrected' : '';
  doc.save(`NHRA_LongTermParity_${safeCategory}${modeSuffix}_${dateRange}.pdf`);
}
