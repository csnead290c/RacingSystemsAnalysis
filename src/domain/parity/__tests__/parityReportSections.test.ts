/**
 * Smoke test: verifies ParityReport.tsx contains all required sections
 * and data-testid markers for the Event Parity Report template.
 *
 * This is a source-level test (reads the file as text) rather than a DOM
 * render test, avoiding the need to mock all API calls and recharts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dir, '../../../pages/ParityReport.tsx'), 'utf-8');

describe('ParityReport section smoke test', () => {
  it('contains the combo mapping awareness section', () => {
    // Mapping banner was consolidated into combo summary; verify combo-related markers
    expect(SRC).toContain('data-testid="parity-combo-summary"');
    expect(SRC).toContain('combosSorted');
    expect(SRC).toContain('SummaryCompactTable');
  });

  it('contains the combo summary section', () => {
    expect(SRC).toContain('data-testid="parity-combo-summary"');
    expect(SRC).toContain('Quickest');
    expect(SRC).toContain('Average');
    expect(SRC).toContain('Total Average');
    expect(SRC).toContain('combosSorted');
    expect(SRC).toContain('bestComboValue');
  });

  it('contains the grouped bar chart', () => {
    expect(SRC).toContain('data-testid="parity-grouped-chart"');
    expect(SRC).toContain('BarChart');
    expect(SRC).toContain('interleavedBars');
    expect(SRC).toContain('comboColor');
  });

  it('contains the incrementals table', () => {
    expect(SRC).toContain('data-testid="parity-incrementals"');
    expect(SRC).toContain('IncrementalsTable');
    expect(SRC).toContain('Incrementals');
    expect(SRC).toContain('isIncrementalMph');
  });

  it('contains the weather by session section', () => {
    expect(SRC).toContain('data-testid="parity-weather"');
    expect(SRC).toContain('WeatherTable');
    expect(SRC).toContain('localTimeHint');
    expect(SRC).toContain('formatHPC');
    expect(SRC).toContain('formatBaro');
    expect(SRC).toContain('formatTemp');
  });

  it('delta comparison tables were removed (Phase 5.5)', () => {
    expect(SRC).not.toContain('data-testid="parity-delta-tables"');
    expect(SRC).not.toContain('DeltaTable');
    expect(SRC).not.toContain('triggers.quickest');
  });

  it('contains the qualifying results section', () => {
    expect(SRC).toContain('data-testid="parity-qual-results"');
    expect(SRC).toContain('QualTable');
    expect(SRC).toContain('qualOrder');
    expect(SRC).toContain('qualPosition');
  });

  it('uses shared formatting helpers (no ad-hoc toFixed in report)', () => {
    expect(SRC).toContain('formatET');
    expect(SRC).toContain('formatMPH');
    expect(SRC).toContain('formatMetric');
    expect(SRC).toContain('formatDelta');
    expect(SRC).toContain('formatHPC');
    expect(SRC).toContain('formatBaro');
    // Should NOT have raw toFixed calls (except in comments and recharts axis formatters)
    const lines = SRC.split('\n');
    const toFixedLines = lines.filter((l: string) =>
      l.includes('.toFixed(') &&
      !l.trimStart().startsWith('//') &&
      !l.trimStart().startsWith('*') &&
      !l.includes('tickFormatter')  // recharts axis formatters are acceptable
    );
    expect(toFixedLines).toHaveLength(0);
  });

  it('has print/PDF CSS for layout readiness', () => {
    expect(SRC).toContain('@media print');
    expect(SRC).toContain('page-break-inside: avoid');
    expect(SRC).toContain('pageBreakAfter');
    expect(SRC).toContain('PrintStyle');
  });

  it('has the long-term report section', () => {
    expect(SRC).toContain('LongTermReport');
    expect(SRC).toContain('LongTermContent');
    expect(SRC).toContain('RangeTableTransposed');
    expect(SRC).toContain('RangeLineChart');
    expect(SRC).toContain('onEventClick');
    expect(SRC).toContain('eventShortCode');
  });
});
