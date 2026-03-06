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

  it('parityDash tab removed from DASHBOARD_TABS (superseded by parityReport)', () => {
    expect(portalSource).not.toContain("key: 'parityDash'");
  });

  it('tab rendering dispatches to WeatherDashPanel', () => {
    expect(portalSource).toContain("tab === 'weatherDash'");
    expect(portalSource).toContain('<WeatherDashPanel');
  });

  it('ParityDashPanel import kept but tab removed from dashboard', () => {
    expect(portalSource).toContain('ParityDashPanel');
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

  it('does not render admin stats rows (coverage/sources/station counts removed)', () => {
    expect(portalSource).not.toContain('Sources:');
    expect(portalSource).not.toContain('stationPointsCount');
    expect(portalSource).not.toContain('backupPointsCount');
    expect(portalSource).not.toContain('stat.canonical');
  });

  it('renders 6-panel chart grid for temp/rh/baro/da/cf/dewPt', () => {
    expect(portalSource).toContain('Temperature');
    expect(portalSource).toContain('Humidity');
    expect(portalSource).toContain('Barometer');
    expect(portalSource).toContain('Density Alt');
    expect(portalSource).toContain('Corr Factor');
    expect(portalSource).toContain('Dew Point');
  });

  it('supports time-range selector buttons', () => {
    expect(portalSource).toContain("type WxRange");
    expect(portalSource).toContain("WX_RANGES");
    expect(portalSource).toContain("'1h'");
    expect(portalSource).toContain("'12h'");
    expect(portalSource).toContain("'event'");
  });

  it('renders Recharts LineChart for multi-panel grid', () => {
    const lineChartMatches = portalSource.match(/<LineChart/g);
    expect(lineChartMatches).not.toBeNull();
    expect(lineChartMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it('computes derived metrics per timeseries point', () => {
    expect(portalSource).toContain('interface DerivedPoint');
    expect(portalSource).toContain('allDerived');
    expect(portalSource).toContain('filteredDerived');
  });


  it('computes derived weather using computeWeather and pct_to_frac', () => {
    expect(portalSource).toContain('computeWeather');
    expect(portalSource).toContain('pct_to_frac');
  });

  it('renders current conditions cards with key values', () => {
    expect(portalSource).toContain('Density Alt');
    expect(portalSource).toContain('Air Density');
    expect(portalSource).toContain('Water Grains');
    expect(portalSource).toContain('Corr Factor');
    expect(portalSource).toContain('Dew Point');
    expect(portalSource).toContain('CondCard');
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

  it('orders sections: combo summary, chart, deltas, qual order', () => {
    const comboIdx = parityDashSource.indexOf('Combo Summary');
    const chartIdx = parityDashSource.indexOf('<BarChart');
    const deltasIdx = parityDashSource.indexOf('Delta Comparisons');
    const qualIdx = parityDashSource.indexOf('Qualifying Order');
    expect(comboIdx).toBeGreaterThan(-1);
    expect(comboIdx).toBeLessThan(chartIdx);
    expect(chartIdx).toBeLessThan(deltasIdx);
    expect(deltasIdx).toBeLessThan(qualIdx);
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
    expect(parityReportSource).toContain('Event Parity');
    expect(parityReportSource).toContain('Long-Term Parity');
  });

  it('uses deterministic combo colors via FNV-1a hash', () => {
    expect(parityReportSource).toContain('fnv1aHash');
    expect(parityReportSource).toContain('COMBO_PALETTE');
    expect(parityReportSource).toContain('comboColor');
  });

  it('has class selector and locked metric/session', () => {
    expect(parityReportSource).toContain('PARITY_CLASSES');
    expect(parityReportSource).toContain('sessionScope');
    expect(parityReportSource).toContain('PARITY_METRICS');
  });

  it('fetches all 4 endpoints in Event Report (deltas removed Phase 5.5)', () => {
    expect(parityReportSource).toContain('parityApi.paritySummary');
    expect(parityReportSource).not.toContain('parityApi.parityDeltas');
    expect(parityReportSource).toContain('parityApi.parityQualOrder');
    expect(parityReportSource).toContain('parityApi.parityIncrementals');
    expect(parityReportSource).toContain('parityApi.paritySessionWeather');
  });

  it('has incrementals table', () => {
    expect(parityReportSource).toContain('IncrementalsTable');
    expect(parityReportSource).toContain('Incrementals');
  });

  it('has weather by session table', () => {
    expect(parityReportSource).toContain('WeatherTable');
    expect(parityReportSource).toContain('Weather by Session');
  });

  it('has qualifying results table', () => {
    expect(parityReportSource).toContain('QualTable');
    expect(parityReportSource).toContain('Raw Qualifying Results');
  });

  it('delta tables were removed (Phase 5.5)', () => {
    expect(parityReportSource).not.toContain('DeltaTable');
    expect(parityReportSource).not.toContain('defaultTriggers');
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

// ══════════════════════════════════════════════════════════════════════════
// Beta Sprint: Live Timing, Class Selector, Auto-Refresh, Refresh Banner
// ══════════════════════════════════════════════════════════════════════════

describe('Beta Sprint: Live Timing tab', () => {
  it('DASHBOARD_TABS includes liveTiming', () => {
    expect(portalSource).toContain("key: 'liveTiming'");
    expect(portalSource).toContain("label: 'Live Timing'");
  });

  it('tab rendering dispatches to LiveTimingPanel', () => {
    expect(portalSource).toContain("tab === 'liveTiming'");
    expect(portalSource).toContain('<LiveTimingPanel');
  });

  it('LiveTimingPanel function is defined', () => {
    expect(portalSource).toContain('function LiveTimingPanel');
  });

  it('LiveTimingPanel sorts newest-to-oldest', () => {
    expect(portalSource).toContain('tb.localeCompare(ta)');
  });

  it('LiveTimingPanel has column picker with localStorage persistence', () => {
    expect(portalSource).toContain('parity_liveTimingCols');
    expect(portalSource).toContain('LIVE_TIMING_COLUMNS');
  });

  it('LiveTimingPanel has driver search', () => {
    expect(portalSource).toContain("placeholder=\"Driver search...\"");
  });

  it('LIVE_TIMING_COLUMNS includes all timing + weather + extra fields', () => {
    // Core timing
    expect(portalSource).toContain("key: 'run_time_local'");
    expect(portalSource).toContain("key: 'ft60'");
    expect(portalSource).toContain("key: 'ft1320'");
    expect(portalSource).toContain("key: 'mph1320'");
    // Weather
    expect(portalSource).toContain("key: 'wx_temp'");
    expect(portalSource).toContain("key: 'wx_rh'");
    expect(portalSource).toContain("key: 'wx_press'");
    // Extra
    expect(portalSource).toContain("key: 'category'");
    expect(portalSource).toContain("key: 'car_number'");
    expect(portalSource).toContain("key: 'dial_in'");
    expect(portalSource).toContain("key: 'mov'");
    expect(portalSource).toContain("key: 'win_flag'");
    expect(portalSource).toContain("key: 'dq_flag'");
  });

  it('LiveTimingPanel receives refreshKey prop (no classIndex)', () => {
    expect(portalSource).toContain('LiveTimingPanel event={selectedEvent} refreshKey={refreshKey}');
  });

  it('LiveTimingPanel does NOT pass classIndex or category to API call', () => {
    // Extract the LiveTimingPanel function body
    const ltStart = portalSource.indexOf('function LiveTimingPanel');
    const ltEnd = portalSource.indexOf('function ', ltStart + 30);
    const ltBody = portalSource.slice(ltStart, ltEnd > ltStart ? ltEnd : undefined);
    // The runsWithWeather call should NOT include classIndex or category
    const apiCallMatch = ltBody.match(/runsWithWeather\(\{[^}]+\}\)/);
    expect(apiCallMatch).toBeTruthy();
    expect(apiCallMatch![0]).not.toContain('classIndex');
    expect(apiCallMatch![0]).not.toContain('category:');
  });

  it('LiveTimingPanel has a local category filter dropdown', () => {
    expect(portalSource).toContain('localCategory');
    expect(portalSource).toContain('setLocalCategory');
    expect(portalSource).toContain('availableCategories');
    expect(portalSource).toContain('All Categories');
  });
});

describe('Beta Sprint: Improved class/category selector', () => {
  it('uses RECOMMENDED_CATEGORIES for top section', () => {
    expect(portalSource).toContain('RECOMMENDED_CATEGORIES');
    expect(portalSource).toContain("<optgroup label=\"Recommended\">");
  });

  it('has "All Categories" optgroup for event-specific categories', () => {
    expect(portalSource).toContain("<optgroup label=\"All Categories\">");
    expect(portalSource).toContain('allEventCategories');
  });

  it('fetches event categories via eventCategories API', () => {
    expect(portalSource).toContain('parityApi.eventCategories');
    expect(portalSource).toContain('setEventCategories');
  });
});

describe('Beta Sprint: Refresh banner auto-dismiss', () => {
  it('defines BANNER_AUTO_DISMISS_MS constant', () => {
    expect(portalSource).toContain('BANNER_AUTO_DISMISS_MS');
    expect(portalSource).toContain('10_000');
  });

  it('uses setTimeout for auto-dismiss in RefreshResultBanner', () => {
    expect(portalSource).toContain('setTimeout(onDismiss, BANNER_AUTO_DISMISS_MS)');
  });

  it('skips auto-dismiss when errors are present', () => {
    expect(portalSource).toContain('if (hasErrors) return');
  });

  it('shows simplified one-line summary by default', () => {
    expect(portalSource).toContain('oneLiner');
    expect(portalSource).toContain('stepBadge');
  });

  it('keeps detailed breakdown in expandable details element', () => {
    expect(portalSource).toContain('<details');
    expect(portalSource).toContain('RefreshStepSummary');
  });
});

describe('Beta Sprint: Auto-refetch after refresh', () => {
  it('defines refreshKey state counter', () => {
    expect(portalSource).toContain('refreshKey');
    expect(portalSource).toContain('setRefreshKey');
  });

  it('increments refreshKey after successful refresh', () => {
    expect(portalSource).toContain("setRefreshKey(k => k + 1)");
  });

  it('EventRunsPanel accepts category and refreshKey props', () => {
    expect(portalSource).toContain('EventRunsPanel event={selectedEvent} category={category} classIndex={classIndex} onDriverClick={goToDriverHistory} refreshKey={refreshKey}');
  });

  it('EventRunsPanel useEffect depends on refreshKey', () => {
    expect(portalSource).toContain('[loadRuns, loadFlags, refreshKey]');
  });
});

describe('Beta Sprint: Auto-refresh for ongoing events', () => {
  it('imports useAutoRefresh and isEventOngoing', () => {
    expect(portalSource).toContain('useAutoRefresh');
    expect(portalSource).toContain('isEventOngoing');
  });

  it('computes eventIsOngoing from selected event dates', () => {
    expect(portalSource).toContain('eventIsOngoing');
    expect(portalSource).toContain('isEventOngoing(selectedEvent.start_date_local');
  });

  it('calls useAutoRefresh with eventIsOngoing gating', () => {
    expect(portalSource).toContain('useAutoRefresh(');
    expect(portalSource).toContain('eventIsOngoing && !showAdminTools');
  });

  it('renders auto-refresh toggle button for ongoing events', () => {
    expect(portalSource).toContain('Auto: ON');
    expect(portalSource).toContain('Auto: OFF');
    expect(portalSource).toContain('toggleAutoRefresh');
  });
});

describe('Beta Sprint: Expanded columns in Event Runs', () => {
  it('ALL_COLUMNS includes extra group columns', () => {
    expect(portalSource).toContain("group: 'extra'");
  });

  it('column picker has Extra toggle group', () => {
    expect(portalSource).toContain("<b>Extra</b>");
    expect(portalSource).toContain("toggleGroup('extra')");
  });

  it('RunSortKey includes new sortable fields', () => {
    expect(portalSource).toContain("'category'");
    expect(portalSource).toContain("'car_number'");
    expect(portalSource).toContain("'dial_in'");
    expect(portalSource).toContain("'mov'");
    expect(portalSource).toContain("'run_time_local'");
  });
});

describe('Beta Sprint: eventCategories API type', () => {
  it('defines EventCategory interface', () => {
    expect(apiSource).toContain('interface EventCategory');
    expect(apiSource).toContain('class_index: string');
    expect(apiSource).toContain('run_count: number');
  });

  it('defines EventCategoriesResponse interface', () => {
    expect(apiSource).toContain('interface EventCategoriesResponse');
  });

  it('eventCategories method exists', () => {
    expect(apiSource).toContain('eventCategories');
    expect(apiSource).toContain('action=eventCategories');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Hotfix: Live Timing unfiltered, partial run merge, category-based filtering
// ══════════════════════════════════════════════════════════════════════════

const useClassPresetSource = readFileSync(
  resolve(__dirname, '../../domain/parity/useClassPreset.ts'),
  'utf-8',
);

const backendParitySource = readFileSync(
  resolve(__dirname, '../../../api/parity.php'),
  'utf-8',
);

const backendLibSource = readFileSync(
  resolve(__dirname, '../../../api/lib/parity.php'),
  'utf-8',
);

describe('Hotfix: useCategoryPreset hook', () => {
  it('exports useCategoryPreset function', () => {
    expect(useClassPresetSource).toContain('export function useCategoryPreset');
  });

  it('exports CLASS_TO_CATEGORY mapping with known categories', () => {
    expect(useClassPresetSource).toContain('export const CLASS_TO_CATEGORY');
    expect(useClassPresetSource).toContain("TF: 'Top Fuel'");
    expect(useClassPresetSource).toContain("FC: 'Funny Car'");
    expect(useClassPresetSource).toContain("PRO: 'Pro Stock'");
  });

  it('exports CATEGORY_TO_CLASS reverse mapping', () => {
    expect(useClassPresetSource).toContain('export const CATEGORY_TO_CLASS');
  });

  it('uses category URL param as primary', () => {
    expect(useClassPresetSource).toContain("CAT_URL_PARAM = 'category'");
  });

  it('migrates legacy classPreset URL param to category', () => {
    expect(useClassPresetSource).toContain('params.get(URL_PARAM) || params.get(LEGACY_URL_PARAM)');
    expect(useClassPresetSource).toContain('CLASS_TO_CATEGORY[fromClassPreset]');
  });

  it('returns [category, setCategory, classIndex] tuple', () => {
    expect(useClassPresetSource).toContain('return [category, setCategory, classIndex]');
  });

  it('derives classIndex via CATEGORY_TO_CLASS reverse mapping', () => {
    expect(useClassPresetSource).toContain('CATEGORY_TO_CLASS[category] || category');
  });

  it('keeps useClassPreset as deprecated export', () => {
    expect(useClassPresetSource).toContain('@deprecated');
    expect(useClassPresetSource).toContain('export function useClassPreset');
  });
});

describe('Hotfix: Category-based filtering in frontend', () => {
  it('ParityPortal uses useCategoryPreset instead of useClassPreset', () => {
    expect(portalSource).toContain('useCategoryPreset');
    expect(portalSource).toContain('const [category, setCategory, classIndex] = useCategoryPreset()');
  });

  it('uses RECOMMENDED_CATEGORIES (human-readable) not RECOMMENDED_CLASSES', () => {
    expect(portalSource).toContain('RECOMMENDED_CATEGORIES');
    expect(portalSource).not.toContain('RECOMMENDED_CLASSES');
  });

  it('selector is bound to category state', () => {
    expect(portalSource).toContain('value={category}');
    expect(portalSource).toContain('setCategory(e.target.value)');
  });

  it('EventRunsPanel passes category to API instead of classIndex', () => {
    // Find EventRunsPanel loadRuns
    const erpStart = portalSource.indexOf('function EventRunsPanel');
    const erpEnd = portalSource.indexOf('\nfunction ', erpStart + 30);
    const erpBody = portalSource.slice(erpStart, erpEnd > erpStart ? erpEnd : undefined);
    const apiCall = erpBody.match(/runsWithWeather\(\{[^}]+\}\)/);
    expect(apiCall).toBeTruthy();
    expect(apiCall![0]).toContain('category:');
    expect(apiCall![0]).not.toContain('classIndex');
  });

  it('API client sends category param in runsWithWeather', () => {
    expect(apiSource).toContain("category?: string");
    expect(apiSource).toContain("qs.set('category', params.category)");
  });
});

describe('Hotfix: Backend category filter param', () => {
  it('handleRunsWithWeather accepts category filter', () => {
    expect(backendParitySource).toContain("$_GET['category']");
    expect(backendParitySource).toContain("r.category = ?");
  });

  it('handleQueryRuns accepts category filter', () => {
    // The function should have category check before classIndex
    const qrStart = backendParitySource.indexOf('function handleQueryRuns');
    const qrEnd = backendParitySource.indexOf('\nfunction ', qrStart + 30);
    const qrBody = backendParitySource.slice(qrStart, qrEnd > qrStart ? qrEnd : undefined);
    expect(qrBody).toContain("$_GET['category']");
    expect(qrBody).toContain("r.category = ?");
  });

  it('category filter takes priority over classIndex', () => {
    // Pattern: if category → elseif classIndex
    expect(backendParitySource).toContain("} elseif (!empty($_GET['classIndex']))");
  });
});

describe('Hotfix: Backend parity_upsertRun merge logic', () => {
  it('parity_upsertRun function is defined', () => {
    expect(backendLibSource).toContain('function parity_upsertRun');
  });

  it('returns inserted/updated/skipped status', () => {
    expect(backendLibSource).toContain("return 'inserted'");
    expect(backendLibSource).toContain("return 'updated'");
    expect(backendLibSource).toContain("return 'skipped'");
  });

  it('merges only non-null incoming values over null existing values', () => {
    expect(backendLibSource).toContain('$incomingVal !== null');
    expect(backendLibSource).toContain('$existingVal === null');
  });

  it('parity_computeRowHash excludes timing fields from fallback hash', () => {
    // The stable identity should NOT include ft1320, mph1320, rt
    const hashStart = backendLibSource.indexOf('function parity_computeRowHash');
    const hashEnd = backendLibSource.indexOf('\nfunction ', hashStart + 30);
    const hashBody = backendLibSource.slice(hashStart, hashEnd > hashStart ? hashEnd : undefined);
    expect(hashBody).not.toContain("'ft1320'");
    expect(hashBody).not.toContain("'mph1320'");
    expect(hashBody).not.toContain("'rt'");
    // But should include identity fields
    expect(hashBody).toContain("driver_name");
    expect(hashBody).toContain("lane");
    expect(hashBody).toContain("round");
  });

  it('all ingest paths use parity_upsertRun', () => {
    // handleIngest, handleIngestEventRuns, handleRefreshEventData should all call it
    expect(backendParitySource).toContain('parity_upsertRun($pdo');
    // Count occurrences — should be at least 3
    const matches = backendParitySource.match(/parity_upsertRun\(\$pdo/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it('ingest responses include inserted/updated/skipped counters', () => {
    expect(backendParitySource).toContain("'rowsInserted'");
    expect(backendParitySource).toContain("'rowsUpdated'");
    expect(backendParitySource).toContain("'rowsSkipped'");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Hotfix 2: ParityReport category mapping, NHRA-style live timing, quad lanes
// ══════════════════════════════════════════════════════════════════════════

// parityReportSource already declared above (line ~284)
// backendParitySource and backendLibSource already declared above

// ── A) ParityReport category mapping ─────────────────────────────────────

describe('Hotfix2: ParityReport category prop + display', () => {
  it('accepts category prop alongside classIndex', () => {
    expect(parityReportSource).toContain('category?: string');
    expect(parityReportSource).toContain('classIndex: string');
  });

  it('derives displayLabel from category or classIndex', () => {
    expect(parityReportSource).toContain('const displayLabel = category || classIndex');
  });

  it('shows "Category:" header with displayLabel (not "Class:")', () => {
    expect(parityReportSource).toContain('Category: {displayLabel}');
    expect(parityReportSource).not.toContain('Class: {classIndex}');
  });

  it('passes displayLabel to EventReport and LongTermReport sub-components', () => {
    expect(parityReportSource).toContain('displayLabel={displayLabel}');
  });

  it('EventReport title uses displayLabel not classIndex', () => {
    expect(parityReportSource).toContain('NHRA {displayLabel} {modeLabel} Event Parity');
    expect(parityReportSource).not.toContain('NHRA {classIndex} {modeLabel} Event Parity');
  });

  it('LongTermReport title uses displayLabel not classIndex', () => {
    expect(parityReportSource).toContain('NHRA {displayLabel} {modeLabel} Long Term Parity');
    expect(parityReportSource).not.toContain('NHRA {classIndex} {modeLabel} Long Term Parity');
  });

  it('still uses classIndex for backend API calls (not category)', () => {
    // paritySummary, parityQualOrder, parityIncrementals, paritySessionWeather all use classIndex
    expect(parityReportSource).toContain('classIndex, metric');
    expect(parityReportSource).toContain('parityApi.paritySummary');
    expect(parityReportSource).toContain('parityApi.parityIncrementals');
  });

  it('ParityPortal passes both classIndex and category to ParityReport', () => {
    expect(portalSource).toContain('ParityReport event={selectedEvent} classIndex={classIndex} category={category}');
  });

  it('ParityReport does not import or use useClassPreset directly', () => {
    expect(parityReportSource).not.toContain('useClassPreset');
    expect(parityReportSource).not.toContain('classPreset');
  });
});

// ── B) Live Timing grouped pair/quad rendering ───────────────────────────

describe('Hotfix2: Live Timing grouped pair/quad rendering', () => {
  it('defines buildRunGroupKey function for grouping', () => {
    expect(portalSource).toContain('function buildRunGroupKey');
  });

  it('defines RunGroup type', () => {
    expect(portalSource).toContain('type RunGroup');
  });

  it('groups runs by timestamp window + round + category', () => {
    // grouping key uses 10-second time window
    const gkStart = portalSource.indexOf('function buildRunGroupKey');
    const gkEnd = portalSource.indexOf('}', gkStart + 20);
    const gkBody = portalSource.slice(gkStart, gkEnd + 1);
    expect(gkBody).toContain('tsRounded');
    expect(gkBody).toContain('round');
    expect(gkBody).toContain('category');
  });

  it('renders group header rows with time, round, category, and pair/quad badge', () => {
    expect(portalSource).toContain('Group header row');
    expect(portalSource).toContain('Pair');
    expect(portalSource).toContain('Quad');
    expect(portalSource).toContain('g.time');
    expect(portalSource).toContain('g.round');
    expect(portalSource).toContain('g.category');
  });

  it('sorts lanes within groups using laneSort', () => {
    expect(portalSource).toContain('laneSort(canonicalLane(');
  });

  it('sorts groups newest-first', () => {
    expect(portalSource).toContain('b.time.localeCompare(a.time)');
  });

  it('uses canonicalLane for lane cell display', () => {
    expect(portalSource).toContain("val = canonicalLane(run.lane)");
  });

  it('filters groups before rendering (driver search + local category)', () => {
    expect(portalSource).toContain('localCategory');
    expect(portalSource).toContain('driverSearch');
  });

  it('displays totalFilteredRuns and group count', () => {
    expect(portalSource).toContain('totalFilteredRuns');
    expect(portalSource).toContain('groups.length');
  });

  it('highlights winner rows', () => {
    expect(portalSource).toContain('win_flag');
    expect(portalSource).toContain('rgba(34,197,94,0.06)');
  });
});

// ── C) Lane normalization ────────────────────────────────────────────────

import { canonicalLane, laneSort, isQuadEvent } from '../../domain/parity/laneUtils';

describe('Hotfix2: Frontend lane normalization (laneUtils)', () => {
  it('canonicalLane normalizes Left/Right variants', () => {
    expect(canonicalLane('Left')).toBe('L');
    expect(canonicalLane('left')).toBe('L');
    expect(canonicalLane('L')).toBe('L');
    expect(canonicalLane('l')).toBe('L');
    expect(canonicalLane('Right')).toBe('R');
    expect(canonicalLane('right')).toBe('R');
    expect(canonicalLane('R')).toBe('R');
    expect(canonicalLane('r')).toBe('R');
  });

  it('canonicalLane normalizes quad lane numbers', () => {
    expect(canonicalLane('1')).toBe('1');
    expect(canonicalLane('2')).toBe('2');
    expect(canonicalLane('3')).toBe('3');
    expect(canonicalLane('4')).toBe('4');
  });

  it('canonicalLane strips "Lane " prefix', () => {
    expect(canonicalLane('Lane 1')).toBe('1');
    expect(canonicalLane('Lane Left')).toBe('L');
    expect(canonicalLane('lane right')).toBe('R');
    expect(canonicalLane('Lane 3')).toBe('3');
  });

  it('canonicalLane returns empty string for null/undefined', () => {
    expect(canonicalLane(null)).toBe('');
    expect(canonicalLane(undefined)).toBe('');
    expect(canonicalLane('')).toBe('');
  });

  it('laneSort orders L before R', () => {
    expect(laneSort('L', 'R')).toBeLessThan(0);
    expect(laneSort('R', 'L')).toBeGreaterThan(0);
  });

  it('laneSort orders 1 < 2 < 3 < 4', () => {
    expect(laneSort('1', '2')).toBeLessThan(0);
    expect(laneSort('2', '3')).toBeLessThan(0);
    expect(laneSort('3', '4')).toBeLessThan(0);
    expect(laneSort('1', '4')).toBeLessThan(0);
  });

  it('isQuadEvent detects quad lanes', () => {
    expect(isQuadEvent(['1', '2', '3', '4'])).toBe(true);
    expect(isQuadEvent(['L', 'R'])).toBe(false);
    expect(isQuadEvent(['L', 'R', '1'])).toBe(true);
  });
});

describe('Hotfix2: Backend lane normalization', () => {
  it('parity_normalizeLane function is defined', () => {
    expect(backendLibSource).toContain('function parity_normalizeLane');
  });

  it('normalizes Left/Right to L/R', () => {
    expect(backendLibSource).toContain("['l', 'left']");
    expect(backendLibSource).toContain("return 'L'");
    expect(backendLibSource).toContain("['r', 'right']");
    expect(backendLibSource).toContain("return 'R'");
  });

  it('normalizes quad lane numbers 1-4', () => {
    expect(backendLibSource).toContain("return '1'");
    expect(backendLibSource).toContain("return '2'");
    expect(backendLibSource).toContain("return '3'");
    expect(backendLibSource).toContain("return '4'");
  });

  it('strips "lane " prefix', () => {
    expect(backendLibSource).toContain("'/^lane\\s*/i'");
  });

  it('is wired into parity_normalizeRow for the lane field', () => {
    expect(backendLibSource).toContain("case 'lane':");
    expect(backendLibSource).toContain('parity_normalizeLane($value)');
  });
});
