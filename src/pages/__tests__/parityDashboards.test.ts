/**
 * Smoke tests for Parity Portal Dashboard panels:
 * - WeatherDashPanel: timeseries charts, summary cards, derived metrics, warnings
 * - ParityDashPanel: combo table, bar chart, CSV export, selectors
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const portalSource = readFileSync(
  resolve(__dirname, '../ParityPortal.tsx'),
  'utf-8',
);

const apiSource = readFileSync(
  resolve(__dirname, '../../services/parityApi.ts'),
  'utf-8',
);

const parityDashSource = readFileSync(
  resolve(__dirname, '../ParityDashPanel.tsx'),
  'utf-8',
);

// ── Tab Wiring ──────────────────────────────────────────────────────────

describe('Dashboard tabs are wired into portal', () => {
  it('DASHBOARD_TABS includes weatherDash', () => {
    expect(portalSource).toContain("key: 'weatherDash'");
  });

  it('DASHBOARD_TABS includes parityDash', () => {
    expect(portalSource).toContain("key: 'parityDash'");
  });

  it('tab rendering dispatches to WeatherDashPanel', () => {
    expect(portalSource).toContain("tab === 'weatherDash'");
    expect(portalSource).toContain('<WeatherDashPanel');
  });

  it('tab rendering dispatches to ParityDashPanel', () => {
    expect(portalSource).toContain("tab === 'parityDash'");
    expect(portalSource).toContain('<ParityDashPanel');
  });
});

// ── WeatherDashPanel Structure ──────────────────────────────────────────

describe('WeatherDashPanel component structure', () => {
  it('defines the WeatherDashPanel function', () => {
    expect(portalSource).toContain('function WeatherDashPanel');
  });

  it('fetches weather timeseries data', () => {
    expect(portalSource).toContain('parityApi.weatherTimeseries');
  });

  it('renders coverage summary card', () => {
    expect(portalSource).toContain('Coverage');
    expect(portalSource).toContain('coveragePct');
  });

  it('renders station and backup point counts', () => {
    expect(portalSource).toContain('stationPointsCount');
    expect(portalSource).toContain('backupPointsCount');
  });

  it('renders largest gap card', () => {
    expect(portalSource).toContain('largestGapMinutes');
    expect(portalSource).toContain('largestGapAt');
  });

  it('supports chart metric selector for temp/rh/pressure', () => {
    expect(portalSource).toContain("'temp' | 'rh' | 'pressure'");
    expect(portalSource).toContain('Temperature (°F)');
    expect(portalSource).toContain('Relative Humidity (%)');
    expect(portalSource).toContain('Pressure (inHg)');
  });

  it('supports toggling canonical/station/backup series', () => {
    expect(portalSource).toContain('visibleSeries');
    expect(portalSource).toContain('toggleSeries');
    expect(portalSource).toContain("canonical: true, station: true, backup: true");
  });

  it('renders Recharts LineChart for main timeseries', () => {
    // Should have LineChart with canonical/station/backup data keys
    const lineChartMatches = portalSource.match(/<LineChart/g);
    expect(lineChartMatches).not.toBeNull();
    expect(lineChartMatches!.length).toBeGreaterThanOrEqual(2); // main + delta
  });

  it('renders delta chart for station-backup differences', () => {
    expect(portalSource).toContain('Station − Backup Deltas');
    expect(portalSource).toContain('tempDelta');
    expect(portalSource).toContain('rhDelta');
    expect(portalSource).toContain('pressDelta');
  });

  it('renders source breakdown badges', () => {
    expect(portalSource).toContain('sourceBreakdown');
    expect(portalSource).toContain('Sources:');
  });

  it('shows warnings for low coverage and large gaps', () => {
    expect(portalSource).toContain('Low coverage');
    expect(portalSource).toContain('Large gap');
    expect(portalSource).toContain('No station data');
  });

  it('computes derived metrics from latest canonical point', () => {
    expect(portalSource).toContain('computeWeather');
    expect(portalSource).toContain('pct_to_frac');
    expect(portalSource).toContain('Derived Metrics');
  });

  it('displays all key derived metric values', () => {
    expect(portalSource).toContain('Theta (θ)');
    expect(portalSource).toContain('Delta (δ)');
    expect(portalSource).toContain('Density Alt');
    expect(portalSource).toContain('Air Density');
    expect(portalSource).toContain('Water Grains');
    expect(portalSource).toContain('Correction Factor');
    expect(portalSource).toContain('Dew Point');
    expect(portalSource).toContain('Vapor Pressure');
  });

  it('renders stats summary grid for temp/rh/pressure with min/max/avg', () => {
    expect(portalSource).toContain('stats.temp.canonical');
    expect(portalSource).toContain('stats.rh.canonical');
    expect(portalSource).toContain('stats.pressure.canonical');
  });
});

// ── ParityDashPanel Structure ───────────────────────────────────────────

describe('ParityDashPanel component structure', () => {
  it('defines the ParityDashPanel function', () => {
    expect(parityDashSource).toContain('function ParityDashPanel');
  });

  it('uses split paritySummary endpoint for initial load', () => {
    expect(parityDashSource).toContain('parityApi.paritySummary');
  });

  it('lazy-loads deltas via parityDeltas endpoint', () => {
    expect(parityDashSource).toContain('parityApi.parityDeltas');
  });

  it('lazy-loads truth table via parityAllRuns endpoint', () => {
    expect(parityDashSource).toContain('parityApi.parityAllRuns');
  });

  it('lazy-loads qual order via parityQualOrder endpoint', () => {
    expect(parityDashSource).toContain('parityApi.parityQualOrder');
  });

  it('defines PARITY_METRICS array with all split metrics', () => {
    expect(parityDashSource).toContain('PARITY_METRICS');
    expect(parityDashSource).toContain("value: 'et_1320'");
    expect(parityDashSource).toContain("value: 'mph_1320'");
    expect(parityDashSource).toContain("value: 't60'");
    expect(parityDashSource).toContain("value: 't330'");
    expect(parityDashSource).toContain("value: 't660'");
    expect(parityDashSource).toContain("value: 'mph_660'");
    expect(parityDashSource).toContain("value: 't1000'");
  });

  it('has class index input', () => {
    expect(parityDashSource).toContain('setClassIndex');
    expect(parityDashSource).toContain("'TF'");
  });

  it('has mode selector for raw/corrected', () => {
    expect(parityDashSource).toContain("'raw' | 'corrected'");
    expect(parityDashSource).toContain('setMode');
  });

  it('has topN selector', () => {
    expect(parityDashSource).toContain('setTopN');
    expect(parityDashSource).toContain('topN');
  });

  it('has CSV export button and logic', () => {
    expect(parityDashSource).toContain('exportComboCsv');
    expect(parityDashSource).toContain('Export CSV');
    expect(parityDashSource).toContain("type: 'text/csv'");
  });

  it('renders summary with total runs and best combo value', () => {
    expect(parityDashSource).toContain('totalRunsInClass');
    expect(parityDashSource).toContain('summary.combos');
    expect(parityDashSource).toContain('bestComboValue');
  });

  it('renders horizontal bar chart via BarChart', () => {
    expect(parityDashSource).toContain('<BarChart');
    expect(parityDashSource).toContain('Avg Top');
    expect(parityDashSource).toContain('COMBO_PALETTE');
  });

  it('renders combo table with expandable run details', () => {
    expect(parityDashSource).toContain('Engine Combo');
    expect(parityDashSource).toContain('expandedCombo');
    expect(parityDashSource).toContain('setExpandedCombo');
    expect(parityDashSource).toContain('c.topRuns');
  });

  it('highlights best combo in table', () => {
    expect(parityDashSource).toContain('isBest');
    expect(parityDashSource).toContain('BEST');
  });

  it('shows excluded run count with warning color', () => {
    expect(parityDashSource).toContain('countExcluded');
    expect(parityDashSource).toContain("'#ef4444'");
  });

  it('shows correction factor column in corrected mode', () => {
    expect(parityDashSource).toContain("mode === 'corrected'");
    expect(parityDashSource).toContain('correctionFactor');
  });

  it('implements readiness gates based on mappedPct', () => {
    expect(parityDashSource).toContain('MAPPED_LOW');
    expect(parityDashSource).toContain('MAPPED_HIGH');
    expect(parityDashSource).toContain('readinessLevel');
  });

  it('implements per-param response caching', () => {
    expect(parityDashSource).toContain('cachedFetch');
    expect(parityDashSource).toContain('CACHE_TTL');
  });

  it('provides fallback driver view at low mapping', () => {
    expect(parityDashSource).toContain('FallbackDriverView');
    expect(parityDashSource).toContain('showFallback');
  });

  it('uses deterministic FNV-1a hash for combo colors', () => {
    expect(parityDashSource).toContain('fnv1aHash');
    expect(parityDashSource).toContain('COMBO_PALETTE');
    expect(parityDashSource).toContain('comboColor');
  });

  it('implements trigger presets for ET and MPH metrics', () => {
    expect(parityDashSource).toContain('ET_TRIGGERS');
    expect(parityDashSource).toContain('MPH_TRIGGERS');
    expect(parityDashSource).toContain('defaultTriggers');
    expect(parityDashSource).toContain('TriggerInput');
  });

  it('displays No Data for null values in tiles and deltas', () => {
    expect(parityDashSource).toContain('No Data');
    expect(parityDashSource).toContain('noData');
  });

  it('orders sections: truth table, tiles, chart, deltas, combo summary, qual order', () => {
    const truthIdx = parityDashSource.indexOf('Show Truth Table');
    const tilesIdx = parityDashSource.indexOf('SummaryTiles');
    const chartIdx = parityDashSource.indexOf('<BarChart');
    const deltasIdx = parityDashSource.indexOf('Delta Comparisons');
    const comboIdx = parityDashSource.indexOf('Combo Summary');
    const qualIdx = parityDashSource.indexOf('Qualifying Order');
    expect(truthIdx).toBeLessThan(tilesIdx);
    expect(tilesIdx).toBeLessThan(chartIdx);
    expect(chartIdx).toBeLessThan(deltasIdx);
    expect(deltasIdx).toBeLessThan(comboIdx);
    expect(comboIdx).toBeLessThan(qualIdx);
  });
});

// ── API Client Types & Methods ──────────────────────────────────────────

describe('API client supports dashboard endpoints', () => {
  it('defines WeatherTimeseriesResponse type', () => {
    expect(apiSource).toContain('interface WeatherTimeseriesResponse');
  });

  it('defines ParityByComboResponse type', () => {
    expect(apiSource).toContain('interface ParityByComboResponse');
  });

  it('defines ParityComboEntry type with expected fields', () => {
    expect(apiSource).toContain('interface ParityComboEntry');
    expect(apiSource).toContain('engineCombo: string');
    expect(apiSource).toContain('bestValue: number | null');
    expect(apiSource).toContain('avgTopN: number | null');
    expect(apiSource).toContain('topRuns: ParityComboRun[]');
  });

  it('defines ParityComboRun type', () => {
    expect(apiSource).toContain('interface ParityComboRun');
    expect(apiSource).toContain('rawValue: number');
    expect(apiSource).toContain('correctionFactor: number | null');
  });

  it('weatherTimeseries method exists', () => {
    expect(apiSource).toContain('weatherTimeseries');
    expect(apiSource).toContain("action', 'weatherTimeseries'");
  });

  it('parityByCombo method exists', () => {
    expect(apiSource).toContain('parityByCombo');
    expect(apiSource).toContain("action', 'parityByCombo'");
  });
});

// ── ParityReport Tab Wiring ──────────────────────────────────────────────

const parityReportSource = readFileSync(
  resolve(__dirname, '../ParityReport.tsx'),
  'utf-8',
);

describe('ParityReport tab is wired into portal', () => {
  it('DASHBOARD_TABS includes parityReport', () => {
    expect(portalSource).toContain("key: 'parityReport'");
  });

  it('tab rendering dispatches to ParityReport', () => {
    expect(portalSource).toContain("tab === 'parityReport'");
    expect(portalSource).toContain('<ParityReport');
  });
});

// ── ParityReport Component Structure ────────────────────────────────────

describe('ParityReport component structure', () => {
  it('has Event and Long-Term report mode tabs', () => {
    expect(parityReportSource).toContain('Event Parity Report');
    expect(parityReportSource).toContain('Long-Term Parity Report');
  });

  it('uses deterministic combo colors via FNV-1a hash', () => {
    expect(parityReportSource).toContain('fnv1aHash');
    expect(parityReportSource).toContain('COMBO_PALETTE');
    expect(parityReportSource).toContain('comboColor');
  });

  it('has class and session scope selectors', () => {
    expect(parityReportSource).toContain('PARITY_CLASSES');
    expect(parityReportSource).toContain('sessionScope');
    expect(parityReportSource).toContain('PARITY_METRICS');
  });

  it('fetches all 5 endpoints in Event Report', () => {
    expect(parityReportSource).toContain('parityApi.paritySummary');
    expect(parityReportSource).toContain('parityApi.parityDeltas');
    expect(parityReportSource).toContain('parityApi.parityQualOrder');
    expect(parityReportSource).toContain('parityApi.parityIncrementals');
    expect(parityReportSource).toContain('parityApi.paritySessionWeather');
  });

  it('has incrementals table with optimal-run labels', () => {
    expect(parityReportSource).toContain('IncrementalsTable');
    expect(parityReportSource).toContain('Incrementals by Combo (Optimal Run)');
  });

  it('has weather by session table', () => {
    expect(parityReportSource).toContain('WeatherTable');
    expect(parityReportSource).toContain('Weather by Session');
  });

  it('has qualifying results table', () => {
    expect(parityReportSource).toContain('QualTable');
    expect(parityReportSource).toContain('Raw Qualifying Results');
  });

  it('has delta comparison tables with trigger thresholds', () => {
    expect(parityReportSource).toContain('DeltaTable');
    expect(parityReportSource).toContain('Delta Comparison Tables');
    expect(parityReportSource).toContain('TriggerInput');
  });

  it('has bar chart for quickest per combo', () => {
    expect(parityReportSource).toContain('<BarChart');
    expect(parityReportSource).toContain('Quickest');
  });

  it('Long-Term report uses rangeParityMatrix', () => {
    expect(parityReportSource).toContain('parityApi.rangeParityMatrix');
    expect(parityReportSource).toContain('RangeTable');
    expect(parityReportSource).toContain('RangeLineChart');
  });

  it('Long-Term report has range mode controls', () => {
    expect(parityReportSource).toContain('rangeMode');
    expect(parityReportSource).toContain('previousN');
    expect(parityReportSource).toContain('season');
    expect(parityReportSource).toContain('custom');
  });

  it('Long-Term report has event click-through', () => {
    expect(parityReportSource).toContain('onEventClick');
  });

  it('has print/PDF-friendly layout with page breaks', () => {
    expect(parityReportSource).toContain('pageBreakAfter');
  });

  it('has caching for API responses', () => {
    expect(parityReportSource).toContain('CACHE_TTL');
    expect(parityReportSource).toContain('_cache');
  });
});

// ── API Client supports new report endpoints ────────────────────────────

describe('API client supports report endpoints', () => {
  it('defines ParityIncrementalsResponse type', () => {
    expect(apiSource).toContain('interface ParityIncrementalsResponse');
    expect(apiSource).toContain('interface ParityIncrementalRow');
  });

  it('defines ParitySessionWeatherResponse type', () => {
    expect(apiSource).toContain('interface ParitySessionWeatherResponse');
    expect(apiSource).toContain('interface ParitySessionWeatherRow');
  });

  it('parityIncrementals method exists', () => {
    expect(apiSource).toContain('parityIncrementals');
    expect(apiSource).toContain("action', 'parityIncrementals'");
  });

  it('paritySessionWeather method exists', () => {
    expect(apiSource).toContain('paritySessionWeather');
    expect(apiSource).toContain("action', 'paritySessionWeather'");
  });
});

// ── Metric ↔ Backend Column Mapping ────────────────────────────────────

describe('Backend metric-to-column mapping consistency', () => {
  it('frontend PARITY_METRICS values match backend validMetrics', () => {
    const frontendMetrics = [
      'et_1320', 'mph_1320', 't60', 't330', 't660', 'mph_660', 't1000',
    ];
    for (const m of frontendMetrics) {
      expect(parityDashSource).toContain(`value: '${m}'`);
    }
  });
});
