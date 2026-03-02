/**
 * Smoke test: verifies ParityDashPanel.tsx contains all required sections,
 * data-testid markers, and uses shared formatting helpers per the
 * "Event Parity Dashboard" template.
 *
 * Source-level test (reads file as text) — no DOM rendering needed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dir, '../../../pages/ParityDashPanel.tsx'), 'utf-8');

describe('ParityDashPanel section smoke test', () => {
  // ── Section order: the 7 template sections must appear in order ──

  it('1) contains the mapping readiness banner', () => {
    expect(SRC).toContain('data-testid="dash-mapping-banner"');
    expect(SRC).toContain('MappingBanner');
    expect(SRC).toContain('mappedPct');
    expect(SRC).toContain('unknownRunCount');
    expect(SRC).toContain('topMissingDrivers');
    expect(SRC).toContain('Assign Combos');
  });

  it('2) contains the combo summary table with Quickest / Avg Top N / Total Avg / Runs', () => {
    expect(SRC).toContain('data-testid="dash-combo-summary"');
    expect(SRC).toContain('ComboSummaryTable');
    expect(SRC).toContain('Quickest');
    expect(SRC).toContain('Avg Top');
    expect(SRC).toContain('Total Avg');
    expect(SRC).toContain('countActive');
    expect(SRC).toContain('countTotal');
  });

  it('3) contains the grouped bar chart with individual quickest runs', () => {
    expect(SRC).toContain('data-testid="dash-grouped-chart"');
    expect(SRC).toContain('BarChart');
    expect(SRC).toContain('groupedBarData');
    expect(SRC).toContain('comboColor');
    expect(SRC).toContain('Legend');
  });

  it('4) contains the incrementals table (Optimal Run)', () => {
    expect(SRC).toContain('data-testid="dash-incrementals"');
    expect(SRC).toContain('IncrementalsTable');
    expect(SRC).toContain('Optimal Run');
    expect(SRC).toContain('MIN');
    expect(SRC).toContain('MAX');
    expect(SRC).toContain('isIncrementalMph');
  });

  it('5) contains the weather by session section', () => {
    expect(SRC).toContain('data-testid="dash-weather"');
    expect(SRC).toContain('WeatherSessionTable');
    expect(SRC).toContain('localTimeHint');
    expect(SRC).toContain('formatHPC');
    expect(SRC).toContain('formatBaro');
    expect(SRC).toContain('formatTemp');
    expect(SRC).toContain('formatDA');
  });

  it('6) contains the delta comparison tables with trigger presets', () => {
    expect(SRC).toContain('data-testid="dash-delta-tables"');
    expect(SRC).toContain('DeltaMatrixSection');
    expect(SRC).toContain('triggers.quickest');
    expect(SRC).toContain('triggers.avgTopN');
    expect(SRC).toContain('triggers.totalAvg');
    expect(SRC).toContain('No Data');
  });

  it('7) contains the qualifying order section (collapsible)', () => {
    expect(SRC).toContain('data-testid="dash-qual-order"');
    expect(SRC).toContain('QualOrderTable');
    expect(SRC).toContain('qualOrder');
    expect(SRC).toContain('qualPosition');
    expect(SRC).toContain('Show Qual Order');
  });

  // ── Section order verification ──

  it('sections appear in the correct template order (in EventParityView render)', () => {
    // Check order using the numbered section comments in EventParityView
    const markers = [
      '1) MAPPING READINESS BANNER',
      '2) COMBO SUMMARY TABLE',
      '3) GROUPED BAR CHART',
      '4) INCREMENTALS BY COMBO',
      '5) WEATHER BY SESSION',
      '6) DELTA COMPARISON TABLES',
      '7) QUALIFYING ORDER',
    ];
    let lastIdx = -1;
    for (const m of markers) {
      const idx = SRC.indexOf(m);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  // ── Formatting helpers ──

  it('uses shared formatting helpers (formatET, formatMPH, formatMetric, etc.)', () => {
    expect(SRC).toContain('formatET');
    expect(SRC).toContain('formatMPH');
    expect(SRC).toContain('formatMetric');
    expect(SRC).toContain('formatDelta');
    expect(SRC).toContain('formatHPC');
    expect(SRC).toContain('formatBaro');
    expect(SRC).toContain('formatTemp');
    expect(SRC).toContain('formatRH');
  });

  it('has no ad-hoc toFixed in user-facing columns (only allowed: CF .toFixed(4), CSV export)', () => {
    const lines = SRC.split('\n');
    const toFixedLines = lines.filter((l: string) => {
      if (l.trimStart().startsWith('//') || l.trimStart().startsWith('*')) return false;
      if (!l.includes('.toFixed(')) return false;
      // Allowed: correctionFactor.toFixed(4), CSV helper fmtCsv
      if (l.includes('correctionFactor') || l.includes('fmtCsv') || l.includes('isMphMetric')) return false;
      return true;
    });
    expect(toFixedLines).toHaveLength(0);
  });

  // ── API integration ──

  it('fetches incrementals and session weather data', () => {
    expect(SRC).toContain('parityIncrementals');
    expect(SRC).toContain('paritySessionWeather');
    expect(SRC).toContain('ParityIncrementalsResponse');
    expect(SRC).toContain('ParitySessionWeatherResponse');
  });
});
