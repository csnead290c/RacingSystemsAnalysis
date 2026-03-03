/**
 * Smoke tests for Qual Sheet panel and Driver History (DriverDrilldownPanel).
 *
 * A3 coverage: QualSheetPanel component structure, DQ display, driver click wiring
 * B4 coverage: DriverDrilldownPanel navigation, session filter, raw/corrected toggle,
 *              weather view mode, charts, CSV export, auto-load from initialFilter
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

// ═══════════════════════════════════════════════════════════════════════════
// A3: Qual Sheet Panel Structure
// ═══════════════════════════════════════════════════════════════════════════

describe('QualSheetPanel — component structure', () => {
  it('defines QualSheetPanel function', () => {
    expect(portalSource).toContain('function QualSheetPanel');
  });

  it('accepts event and onDriverClick props', () => {
    expect(portalSource).toContain('onDriverClick');
    expect(portalSource).toMatch(/QualSheetPanel\(\s*\{[^}]*event[^}]*onDriverClick/);
  });

  it('fetches qual sheet from API', () => {
    expect(portalSource).toContain('parityApi.qualSheet');
  });

  it('renders qualifying position column', () => {
    expect(portalSource).toContain('qual_pos');
  });

  it('displays DQ/NO VALID RUN for invalid drivers', () => {
    expect(portalSource).toContain('DQ / NO VALID RUN');
  });

  it('styles invalid drivers with reduced opacity', () => {
    expect(portalSource).toContain('is_valid');
    expect(portalSource).toContain('opacity');
  });

  it('makes driver names clickable when onDriverClick provided', () => {
    // Driver name should be a button that calls onDriverClick
    expect(portalSource).toContain('onDriverClick(r.driver');
  });

  it('has class filter for qual sheet', () => {
    expect(portalSource).toMatch(/QualSheetPanel[\s\S]*?classFilter/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// A3: Qual Sheet API Types
// ═══════════════════════════════════════════════════════════════════════════

describe('QualSheet API types', () => {
  it('defines QualSheetRow with is_valid field', () => {
    expect(apiSource).toContain('interface QualSheetRow');
    expect(apiSource).toContain('is_valid');
  });

  it('defines QualSheetRow with best_timestamp field', () => {
    expect(apiSource).toContain('best_timestamp');
  });

  it('defines QualSheetResponse with total_drivers', () => {
    expect(apiSource).toContain('interface QualSheetResponse');
    expect(apiSource).toContain('total_drivers');
  });

  it('qualSheet API method exists', () => {
    expect(apiSource).toContain("action', 'qualSheet'");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: Navigation Wiring — QualSheet → Driver History
// ═══════════════════════════════════════════════════════════════════════════

describe('Navigation wiring — QualSheet to Driver History', () => {
  it('DASHBOARD_TABS includes driverHistory tab', () => {
    expect(portalSource).toContain("key: 'driverHistory'");
  });

  it('tab rendering dispatches to DriverDrilldownPanel', () => {
    expect(portalSource).toContain("tab === 'driverHistory'");
    expect(portalSource).toContain('<DriverDrilldownPanel');
  });

  it('goToDriverHistory function sets tab to driverHistory', () => {
    expect(portalSource).toContain('goToDriverHistory');
    expect(portalSource).toContain("setTab('driverHistory')");
  });

  it('goToDriverHistory sets driverHistoryFilter state', () => {
    expect(portalSource).toContain('setDriverHistoryFilter');
    expect(portalSource).toContain('driverHistoryFilter');
  });

  it('DriverDrilldownPanel receives initialFilter prop', () => {
    expect(portalSource).toContain('initialFilter={driverHistoryFilter}');
  });

  it('QualSheetPanel passes onDriverClick={goToDriverHistory}', () => {
    expect(portalSource).toContain('onDriverClick={goToDriverHistory}');
  });

  it('EventRunsPanel passes onDriverClick={goToDriverHistory}', () => {
    expect(portalSource).toContain('<EventRunsPanel');
    expect(portalSource).toContain('onDriverClick={goToDriverHistory}');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: DriverDrilldownPanel — Component Structure
// ═══════════════════════════════════════════════════════════════════════════

describe('DriverDrilldownPanel — component structure', () => {
  it('defines DriverDrilldownPanel function', () => {
    expect(portalSource).toContain('function DriverDrilldownPanel');
  });

  it('accepts initialFilter prop with driver and classIndex', () => {
    expect(portalSource).toMatch(/DriverDrilldownPanel\(\s*\{[^}]*initialFilter/);
    expect(portalSource).toContain('driver?: string; classIndex?: string');
  });

  it('has driver search input', () => {
    expect(portalSource).toContain('Search driver name');
  });

  it('fetches driver list via parityApi.drivers', () => {
    expect(portalSource).toContain('parityApi.drivers');
  });

  it('fetches runs via parityApi.runsByDriver', () => {
    expect(portalSource).toContain('parityApi.runsByDriver');
  });

  it('displays driver stats header with best ET, MPH, event count', () => {
    expect(portalSource).toMatch(/DriverDrilldownPanel[\s\S]*?Best ET/);
    expect(portalSource).toMatch(/DriverDrilldownPanel[\s\S]*?Top MPH/);
    expect(portalSource).toContain('eventCount');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: DriverDrilldownPanel — Session Filter
// ═══════════════════════════════════════════════════════════════════════════

describe('DriverDrilldownPanel — session filter', () => {
  it('defines SessionFilter type with qual/elim/all options', () => {
    expect(portalSource).toContain("type SessionFilter = '' | 'qual' | 'elim'");
  });

  it('has sessionFilter state', () => {
    expect(portalSource).toContain('setSessionFilter');
  });

  it('renders session filter buttons (All, Qual, Elim)', () => {
    // The session filter labels
    expect(portalSource).toMatch(/Session[\s\S]*?All[\s\S]*?Qual[\s\S]*?Elim/);
  });

  it('passes session parameter to runsByDriver API', () => {
    expect(portalSource).toContain('session: sessionFilter');
  });

  it('includes sessionFilter in loadRuns dependency', () => {
    expect(portalSource).toContain('classFilter, sessionFilter');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: DriverDrilldownPanel — View Modes
// ═══════════════════════════════════════════════════════════════════════════

describe('DriverDrilldownPanel — view modes', () => {
  it('defines ViewMode type with standard/incrementals/weather', () => {
    expect(portalSource).toContain("type ViewMode = 'standard' | 'incrementals' | 'weather'");
  });

  it('has viewMode state', () => {
    expect(portalSource).toContain('setViewMode');
  });

  it('renders Standard view with 60ft, ET, MPH columns', () => {
    expect(portalSource).toMatch(/viewMode === 'standard'[\s\S]*?60ft/);
  });

  it('renders Incrementals view with split columns', () => {
    expect(portalSource).toContain("viewMode === 'incrementals'");
    expect(portalSource).toContain('0-60');
    expect(portalSource).toContain('60-330');
    expect(portalSource).toContain('330-660');
    expect(portalSource).toContain('660-1000');
    expect(portalSource).toContain('1000-1320');
  });

  it('renders Weather view with corrected ET, factor, temp, pressure, RH%', () => {
    expect(portalSource).toContain("viewMode === 'weather'");
    expect(portalSource).toContain('Corr ET');
    expect(portalSource).toContain('Factor');
    expect(portalSource).toContain('corrected_ft1320');
    expect(portalSource).toContain('correction_factor');
  });

  it('weather view shows temp, pressure, RH from weather object', () => {
    expect(portalSource).toContain('weather?.temp_f');
    expect(portalSource).toContain('weather?.pressure_inhg');
    expect(portalSource).toContain('weather?.rh_pct');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: DriverDrilldownPanel — Raw/Corrected Toggle
// ═══════════════════════════════════════════════════════════════════════════

describe('DriverDrilldownPanel — raw/corrected toggle', () => {
  it('defines ValueMode type with raw/corrected', () => {
    expect(portalSource).toContain("type ValueMode = 'raw' | 'corrected'");
  });

  it('has valueMode state', () => {
    expect(portalSource).toContain('setValueMode');
  });

  it('renders Raw and Corrected toggle buttons', () => {
    expect(portalSource).toContain("'Raw'");
    expect(portalSource).toContain("'Corrected'");
  });

  it('getET helper uses corrected value when valueMode is corrected', () => {
    expect(portalSource).toContain("valueMode === 'corrected' && r.corrected_ft1320 != null");
  });

  it('get60 helper uses corrected value when valueMode is corrected', () => {
    expect(portalSource).toContain("valueMode === 'corrected' && r.corrected_ft60 != null");
  });

  it('best ET stat header shows (corr) label in corrected mode', () => {
    expect(portalSource).toContain("Best ET{valueMode === 'corrected' ? ' (corr)' : ''}");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: DriverDrilldownPanel — Charts
// ═══════════════════════════════════════════════════════════════════════════

describe('DriverDrilldownPanel — charts', () => {
  it('has showCharts state toggle', () => {
    expect(portalSource).toContain('setShowCharts');
    expect(portalSource).toContain('showCharts');
  });

  it('renders Charts / Hide Charts toggle button', () => {
    expect(portalSource).toContain("'Hide Charts'");
    expect(portalSource).toContain("'Charts'");
  });

  it('renders ET vs Run Order chart', () => {
    expect(portalSource).toContain('ET vs Run Order');
  });

  it('renders MPH vs Run Order chart', () => {
    expect(portalSource).toContain('MPH vs Run Order');
  });

  it('charts use SVG polyline rendering', () => {
    expect(portalSource).toContain('<polyline');
    expect(portalSource).toContain('<circle');
    expect(portalSource).toContain('<svg viewBox');
  });

  it('chart data respects valueMode for corrected ET', () => {
    expect(portalSource).toContain("valueMode === 'corrected' && r.corrected_ft1320 != null ? r.corrected_ft1320 : r.ft1320!");
  });

  it('chart renders gracefully with insufficient data', () => {
    expect(portalSource).toContain('Not enough data points for chart');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: DriverDrilldownPanel — Auto-load & Weather
// ═══════════════════════════════════════════════════════════════════════════

describe('DriverDrilldownPanel — auto-load from initialFilter', () => {
  it('uses useRef to track initial load', () => {
    expect(portalSource).toContain('loadedRef');
    expect(portalSource).toContain('useRef(false)');
  });

  it('auto-sets selectedDriver from initialFilter', () => {
    expect(portalSource).toContain('setSelectedDriver(initialFilter.driver)');
  });

  it('auto-sets classFilter from initialFilter', () => {
    expect(portalSource).toContain("setClassFilter(initialFilter.classIndex ?? '')");
  });

  it('triggers loadRuns when selectedDriver changes', () => {
    expect(portalSource).toContain('if (selectedDriver) loadRuns(selectedDriver, currentOffset)');
    expect(portalSource).toContain('[selectedDriver, currentOffset, loadRuns]');
  });

  it('requests weather data via includeWeather flag', () => {
    expect(portalSource).toContain('includeWeather: true');
  });

  it('shows weather-linked run count in stats', () => {
    expect(portalSource).toContain('weatherCount');
    expect(portalSource).toContain('weather-linked');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: DriverDrilldownPanel — CSV Export & DQ Display
// ═══════════════════════════════════════════════════════════════════════════

describe('DriverDrilldownPanel — CSV export', () => {
  it('has exportCsv function', () => {
    expect(portalSource).toContain('exportCsv');
  });

  it('renders Export CSV button', () => {
    expect(portalSource).toContain('Export CSV');
  });

  it('CSV includes weather columns', () => {
    expect(portalSource).toContain("'Temp F'");
    expect(portalSource).toContain("'Press inHg'");
    expect(portalSource).toContain("'RH%'");
  });

  it('CSV includes correction columns', () => {
    expect(portalSource).toContain("'Corr ET'");
    expect(portalSource).toContain("'Factor'");
  });
});

describe('DriverDrilldownPanel — DQ display', () => {
  it('renders DQ column in table', () => {
    expect(portalSource).toMatch(/DriverDrilldownPanel[\s\S]*?dq_flag\s*\?\s*'✗'/);
  });

  it('DQ rows have reduced opacity', () => {
    expect(portalSource).toContain('r.dq_flag ? { opacity: 0.5');
  });

  it('DQ rows have red-tinted background', () => {
    expect(portalSource).toContain('rgba(239,68,68,0.06)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B4: API Types for Driver History
// ═══════════════════════════════════════════════════════════════════════════

describe('DriverRun API type — weather and correction fields', () => {
  it('DriverRun has weather nested object', () => {
    expect(apiSource).toContain('weather?:');
    expect(apiSource).toContain('temp_f: number | null');
    expect(apiSource).toContain('rh_pct: number | null');
    expect(apiSource).toContain('pressure_inhg: number | null');
  });

  it('DriverRun has correction fields', () => {
    expect(apiSource).toContain('correction_factor?: number | null');
    expect(apiSource).toContain('corrected_ft1320?: number | null');
    expect(apiSource).toContain('corrected_ft660?: number | null');
    expect(apiSource).toContain('corrected_ft60?: number | null');
  });

  it('runsByDriver method supports session parameter', () => {
    expect(apiSource).toContain("session?: 'qual' | 'elim' | ''");
    expect(apiSource).toContain("qs.set('session', params.session)");
  });

  it('runsByDriver method supports includeWeather parameter', () => {
    expect(apiSource).toContain('includeWeather?: boolean');
    expect(apiSource).toContain("qs.set('includeWeather', '1')");
  });
});
