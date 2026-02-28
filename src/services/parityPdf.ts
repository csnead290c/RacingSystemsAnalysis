/**
 * Client-side PDF export for Parity Portal reports.
 * Uses jsPDF + jspdf-autotable for table rendering.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  QualSheetRow,
  LadderPairing,
  EventParitySummaryResponse,
} from './parityApi';

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(rl: string): string {
  if (!rl || rl.length !== 8) return rl || '';
  return `${rl.slice(0, 4)}-${rl.slice(4, 6)}-${rl.slice(6, 8)}`;
}

function header(doc: jsPDF, title: string, subtitle: string, y: number): number {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(subtitle, 14, y + 6);
  doc.setTextColor(0);
  return y + 14;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Racing Systems Analysis — Generated ${new Date().toLocaleString()} — Page ${i}/${pages}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
  }
}

// ── Qual Sheet PDF ─────────────────────────────────────────────────────

export function exportQualSheetPdf(
  sheet: QualSheetRow[],
  eventName: string,
  classIndex: string,
  raceLookup: string,
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
    body: sheet.map(r => [
      r.qual_pos,
      r.driver,
      r.best_et?.toFixed(3) ?? '—',
      r.corrected_best_et?.toFixed(3) ?? '—',
      r.best_mph?.toFixed(2) ?? '—',
      r.run_count,
      r.best_ft60?.toFixed(3) ?? '—',
      r.best_ft660?.toFixed(3) ?? '—',
    ]),
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
  doc.save(`qual_sheet_${classIndex}_${raceLookup}.pdf`);
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
  doc.save(`ladder_${classIndex}_${raceLookup}.pdf`);
}

// ── Parity Summary PDF ─────────────────────────────────────────────────

export function exportParitySummaryPdf(
  data: EventParitySummaryResponse,
  eventName: string,
  classIndex: string,
  raceLookup: string,
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
    head: [['Driver', 'Rnd', 'ET', 'MPH', 'Corrected ET', 'Factor', 'Temp', 'Press']],
    body: runsToShow.map(r => [
      r.driver_name || '—',
      r.round || '—',
      r.ft1320?.toFixed(3) ?? '—',
      r.mph1320?.toFixed(1) ?? '—',
      r.corrected_ft1320?.toFixed(3) ?? '—',
      r.correction_factor?.toFixed(4) ?? '—',
      r.temp_f != null ? `${r.temp_f.toFixed(0)}°F` : '—',
      r.pressure_inhg != null ? `${r.pressure_inhg.toFixed(2)}"` : '—',
    ]),
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
  doc.save(`parity_summary_${classIndex}_${raceLookup}.pdf`);
}
