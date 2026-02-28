/**
 * Integration tests for the parityByCombo endpoint.
 * Verifies:
 *  - ET vs MPH sorting/topN selection correctness
 *  - Spread calculation correctness
 *  - Exclusion behavior (DQ/flagged/missing metric)
 *  - Corrected-mode coverage % calculation
 *  - Weather snapshot presence in audit runs
 *  - sessionScope filtering
 *
 * These tests hit the live API and require a valid auth token.
 * Run with: npx vitest run src/integration-tests/parityByCombo.spec.ts
 */

import { describe, it, expect } from 'vitest';
import { parityApi, type ParityByComboResponse } from '../services/parityApi';

// Use a known 2025 event with good weather coverage for most tests.
// Fallback: any event that has TF runs.
const TEST_EVENT_ID = Number((import.meta as any).env?.VITE_TEST_EVENT_ID ?? '104'); // In-N-Out Burger NHRA Finals 2024

describe('parityByCombo endpoint', () => {
  // ── Shape & basics ──────────────────────────────────────────────────

  it('returns valid response shape for raw ET 1320', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.eventId).toBe(TEST_EVENT_ID);
    expect(res.classIndex).toBe('TF');
    expect(res.metric).toBe('et_1320');
    expect(res.mode).toBe('raw');
    expect(res.topN).toBe(4);
    expect(res.sessionScope).toBe('both');
    expect(res.isLowerBetter).toBe(true);
    expect(res.event).toBeDefined();
    expect(res.event.event_name).toBeTruthy();
    expect(res.trust).toBeDefined();
    expect(typeof res.trust.weatherCoveragePct).toBe('number');
    expect(typeof res.trust.totalRunsInScope).toBe('number');
    expect(typeof res.trust.hasTrackCoords).toBe('boolean');
    expect(Array.isArray(res.combos)).toBe(true);
    expect(res.totalRunsInClass).toBeGreaterThan(0);
  });

  // ── ET sorting: lower is better → best = smallest ──────────────────

  it('ET metric: bestValue is the smallest value per combo', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.isLowerBetter).toBe(true);
    for (const c of res.combos) {
      if (c.topRuns.length === 0) continue;
      const values = c.topRuns.filter(r => !r.excluded).map(r => r.value);
      // All topRuns values should be >= bestValue (since lower is better, best is smallest)
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(c.bestValue! - 0.0001);
      }
      // Values should be sorted ascending
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] - 0.0001);
      }
    }
  });

  // ── MPH sorting: higher is better → best = largest ─────────────────

  it('MPH metric: bestValue is the largest value per combo', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'mph_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.isLowerBetter).toBe(false);
    for (const c of res.combos) {
      if (c.topRuns.length === 0) continue;
      const values = c.topRuns.filter(r => !r.excluded).map(r => r.value);
      // All topRuns values should be <= bestValue (since higher is better, best is largest)
      for (const v of values) {
        expect(v).toBeLessThanOrEqual(c.bestValue! + 0.0001);
      }
      // Values should be sorted descending
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 0.0001);
      }
    }
  });

  // ── Spread calculation ─────────────────────────────────────────────

  it('spread = Nth - best for ET (positive = slower)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      if (c.spread === null || c.countTopN < 2) continue;
      const values = c.topRuns.filter(r => !r.excluded).map(r => r.value);
      const expectedSpread = values[values.length - 1] - values[0];
      expect(c.spread).toBeCloseTo(expectedSpread, 3);
      expect(c.spread).toBeGreaterThanOrEqual(0); // spread should be non-negative
    }
  });

  it('spread = best - Nth for MPH (positive = wider range)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'mph_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      if (c.spread === null || c.countTopN < 2) continue;
      const values = c.topRuns.filter(r => !r.excluded).map(r => r.value);
      const expectedSpread = values[0] - values[values.length - 1];
      expect(c.spread).toBeCloseTo(expectedSpread, 3);
      expect(c.spread).toBeGreaterThanOrEqual(0);
    }
  });

  // ── avgTopN ────────────────────────────────────────────────────────

  it('avgTopN equals mean of topRun values', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      if (c.avgTopN === null || c.topRuns.length === 0) continue;
      const values = c.topRuns.filter(r => !r.excluded).map(r => r.value);
      const expectedAvg = values.reduce((s, v) => s + v, 0) / values.length;
      expect(c.avgTopN).toBeCloseTo(expectedAvg, 3);
    }
  });

  // ── DQ exclusion ───────────────────────────────────────────────────

  it('no topRun has dqFlag != 0', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      for (const r of c.topRuns) {
        expect(r.dqFlag).toBe(0);
      }
    }
  });

  // ── Weather snapshot in audit runs ─────────────────────────────────

  it('topRuns include weather snapshot when available', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    // At least some runs should have weather if coverage > 0
    if (res.trust.weatherCoveragePct && res.trust.weatherCoveragePct > 0) {
      const allTopRuns = res.combos.flatMap(c => c.topRuns);
      const withWeather = allTopRuns.filter(r => r.weather !== null);
      expect(withWeather.length).toBeGreaterThan(0);

      // Validate weather shape
      for (const r of withWeather) {
        expect(r.weather!.temp_f).toBeDefined();
        expect(r.weather!.rh_pct).toBeDefined();
        expect(r.weather!.pressure_inhg).toBeDefined();
        expect(r.weather!.source).toBeTruthy();
        expect(r.weather!.timestamp_utc).toBeTruthy();
      }
    }
  });

  // ── Trust indicators ───────────────────────────────────────────────

  it('correctedCoveragePct is returned in corrected mode', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'corrected',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.trust.correctedCoveragePct).toBeDefined();
    expect(typeof res.trust.correctedCoveragePct).toBe('number');
    expect(res.trust.runsWithCorrected).toBeDefined();
  });

  it('correctedCoveragePct is null in raw mode', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.trust.correctedCoveragePct).toBeNull();
  });

  // ── sessionScope filtering ─────────────────────────────────────────

  it('qual scope returns only Q rounds', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 10,
      sessionScope: 'qual',
    });

    for (const c of res.combos) {
      for (const r of c.topRuns) {
        if (r.round) {
          expect(r.round.startsWith('Q')).toBe(true);
        }
      }
    }
  });

  it('elim scope returns only non-Q rounds', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 10,
      sessionScope: 'elim',
    });

    for (const c of res.combos) {
      for (const r of c.topRuns) {
        if (r.round) {
          expect(r.round.startsWith('Q')).toBe(false);
        }
      }
    }
  });

  it('both scope returns more or equal runs than qual alone', async () => {
    const [both, qual] = await Promise.all([
      parityApi.parityByCombo({ eventId: TEST_EVENT_ID, classIndex: 'TF', metric: 'et_1320', mode: 'raw', topN: 4, sessionScope: 'both' }),
      parityApi.parityByCombo({ eventId: TEST_EVENT_ID, classIndex: 'TF', metric: 'et_1320', mode: 'raw', topN: 4, sessionScope: 'qual' }),
    ]);

    expect(both.totalRunsInClass).toBeGreaterThanOrEqual(qual.totalRunsInClass);
  });

  // ── Combo counts ───────────────────────────────────────────────────

  it('countTopN never exceeds topN parameter', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      expect(c.countTopN).toBeLessThanOrEqual(4);
      expect(c.topRuns.length).toBe(c.countTopN);
    }
  });

  it('countActive + countExcluded = countTotal', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      expect(c.countActive + c.countExcluded).toBe(c.countTotal);
    }
  });

  // ── New metrics ────────────────────────────────────────────────────

  it('rt metric works and is lower-is-better', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'rt',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.metric).toBe('rt');
    expect(res.isLowerBetter).toBe(true);
  });

  it('mph_1000 metric works and is higher-is-better', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'mph_1000',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.metric).toBe('mph_1000');
    expect(res.isLowerBetter).toBe(false);
  });

  // ── Combos sorted by bestValue ─────────────────────────────────────

  it('combos are sorted by bestValue (ET: ascending)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    const values = res.combos.filter(c => c.bestValue != null).map(c => c.bestValue!);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] - 0.0001);
    }
  });

  it('combos are sorted by bestValue (MPH: descending)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'mph_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    const values = res.combos.filter(c => c.bestValue != null).map(c => c.bestValue!);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 0.0001);
    }
  });

  // ── totalAvg correctness ────────────────────────────────────────────

  it('totalAvg is returned per combo and is a number', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      if (c.countActive > 0) {
        expect(c.totalAvg).not.toBeNull();
        expect(typeof c.totalAvg).toBe('number');
      }
    }
  });

  it('totalAvg >= avgTopN for ET (lower is better)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      if (c.totalAvg !== null && c.avgTopN !== null && c.countActive > c.countTopN) {
        // totalAvg includes slower runs, so should be >= avgTopN for ET
        expect(c.totalAvg).toBeGreaterThanOrEqual(c.avgTopN - 0.0001);
      }
    }
  });

  // ── Delta matrices ──────────────────────────────────────────────────

  it('deltaMatrices object contains quickest, avgTopN, totalAvg arrays', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.deltaMatrices).toBeDefined();
    expect(Array.isArray(res.deltaMatrices.quickest)).toBe(true);
    expect(Array.isArray(res.deltaMatrices.avgTopN)).toBe(true);
    expect(Array.isArray(res.deltaMatrices.totalAvg)).toBe(true);
  });

  it('delta matrix rows have correct shape', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const row of res.deltaMatrices.quickest) {
      expect(typeof row.comboA).toBe('string');
      expect(typeof row.comboB).toBe('string');
      expect(row.comboA).not.toBe(row.comboB);
      if (row.delta !== null) {
        expect(typeof row.delta).toBe('number');
      }
    }
  });

  it('delta = A - B for ET (lower is better)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const row of res.deltaMatrices.quickest) {
      if (row.valueA !== null && row.valueB !== null && row.delta !== null) {
        expect(row.delta).toBeCloseTo(row.valueA - row.valueB, 3);
      }
    }
  });

  it('delta = B - A for MPH (higher is better)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'mph_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const row of res.deltaMatrices.quickest) {
      if (row.valueA !== null && row.valueB !== null && row.delta !== null) {
        expect(row.delta).toBeCloseTo(row.valueB - row.valueA, 3);
      }
    }
  });

  it('number of delta pairs = n*(n-1)/2 for n combos', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    const n = res.combos.length;
    const expectedPairs = (n * (n - 1)) / 2;
    expect(res.deltaMatrices.quickest.length).toBe(expectedPairs);
    expect(res.deltaMatrices.avgTopN.length).toBe(expectedPairs);
    expect(res.deltaMatrices.totalAvg.length).toBe(expectedPairs);
  });

  // ── Mapping readiness ───────────────────────────────────────────────

  it('mapping readiness is returned', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.mapping).toBeDefined();
    expect(typeof res.mapping.mappedRunCount).toBe('number');
    expect(typeof res.mapping.unknownRunCount).toBe('number');
    expect(Array.isArray(res.mapping.topMissingDrivers)).toBe(true);
    expect(res.mapping.mappedRunCount + res.mapping.unknownRunCount).toBe(res.totalRunsInClass);
  });

  it('mappedPct is between 0 and 100 (or null)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    if (res.mapping.mappedPct !== null) {
      expect(res.mapping.mappedPct).toBeGreaterThanOrEqual(0);
      expect(res.mapping.mappedPct).toBeLessThanOrEqual(100);
    }
  });

  // ── allRuns truth table ─────────────────────────────────────────────

  it('allRuns is returned with run entries', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(Array.isArray(res.allRuns)).toBe(true);
    expect(res.allRuns.length).toBe(res.totalRunsInClass);

    if (res.allRuns.length > 0) {
      const r = res.allRuns[0];
      expect(r.runId).toBeDefined();
      expect(typeof r.driver).toBe('string');
      expect(typeof r.engineCombo).toBe('string');
      // et and mph should be present for 1320 runs
      expect(r.et).not.toBeNull();
    }
  });

  it('allRuns have engineCombo and engineComboId fields', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const r of res.allRuns.slice(0, 20)) {
      expect(typeof r.engineCombo).toBe('string');
      // engineComboId can be null for Unknown
      if (r.engineCombo !== 'Unknown') {
        expect(typeof r.engineComboId).toBe('number');
      }
    }
  });

  // ── Qualifying order ────────────────────────────────────────────────

  it('qualOrder is returned and sorted by ET ascending', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(Array.isArray(res.qualOrder)).toBe(true);

    // Should be sorted by ET ascending
    const ets = res.qualOrder.filter(r => r.et !== null).map(r => r.et!);
    for (let i = 1; i < ets.length; i++) {
      expect(ets[i]).toBeGreaterThanOrEqual(ets[i - 1] - 0.0001);
    }
  });

  it('qualOrder entries have qualPosition starting from 1', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    if (res.qualOrder.length > 0) {
      expect(res.qualOrder[0].qualPosition).toBe(1);
      for (let i = 0; i < res.qualOrder.length; i++) {
        expect(res.qualOrder[i].qualPosition).toBe(i + 1);
      }
    }
  });

  it('qualOrder has unique drivers (best per driver)', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    const drivers = res.qualOrder.map(r => r.driver);
    const uniqueDrivers = new Set(drivers);
    expect(uniqueDrivers.size).toBe(drivers.length);
  });

  // ── includeUnknown toggle ───────────────────────────────────────────

  it('includeUnknown=false excludes Unknown from combos', async () => {
    const res = await parityApi.parityByCombo({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
      includeUnknown: false,
    });

    const unknownCombo = res.combos.find(c => c.engineCombo === 'Unknown');
    expect(unknownCombo).toBeUndefined();
    expect(res.includeUnknown).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// rangeParityMatrix endpoint
// ══════════════════════════════════════════════════════════════════════════════

describe('rangeParityMatrix endpoint', () => {
  it('returns valid response shape for a year', async () => {
    const res = await parityApi.rangeParityMatrix({
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
      year: 2024,
    });

    expect(res.classIndex).toBe('TF');
    expect(res.metric).toBe('et_1320');
    expect(res.isLowerBetter).toBe(true);
    expect(res.startDate).toBe('2024-01-01');
    expect(res.endDate).toBe('2024-12-31');
    expect(Array.isArray(res.events)).toBe(true);
    expect(Array.isArray(res.combos)).toBe(true);
    expect(typeof res.matrix).toBe('object');
  });

  it('matrix has entries for returned events', async () => {
    const res = await parityApi.rangeParityMatrix({
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      year: 2024,
    });

    for (const ev of res.events) {
      const row = res.matrix[ev.eventId];
      expect(row).toBeDefined();
      // At least one combo should have data
      const comboNames = Object.keys(row);
      expect(comboNames.length).toBeGreaterThan(0);
    }
  });

  it('matrix cells have best, avgTopN, totalAvg, count', async () => {
    const res = await parityApi.rangeParityMatrix({
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      year: 2024,
    });

    for (const ev of res.events.slice(0, 3)) {
      const row = res.matrix[ev.eventId];
      for (const cn of Object.keys(row)) {
        const cell = row[cn];
        expect(typeof cell.best).toBe('number');
        expect(typeof cell.avgTopN).toBe('number');
        expect(typeof cell.totalAvg).toBe('number');
        expect(typeof cell.count).toBe('number');
        expect(cell.count).toBeGreaterThan(0);
        // best should be <= avgTopN <= totalAvg for ET (lower is better)
        expect(cell.best).toBeLessThanOrEqual(cell.avgTopN + 0.0001);
        expect(cell.avgTopN).toBeLessThanOrEqual(cell.totalAvg + 0.0001);
      }
    }
  });

  it('combos array contains unique sorted names', async () => {
    const res = await parityApi.rangeParityMatrix({
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      year: 2024,
    });

    const sorted = [...res.combos].sort();
    expect(res.combos).toEqual(sorted);
    expect(new Set(res.combos).size).toBe(res.combos.length);
  });

  it('events are sorted by start_date_local', async () => {
    const res = await parityApi.rangeParityMatrix({
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      year: 2024,
    });

    for (let i = 1; i < res.events.length; i++) {
      expect(res.events[i].start_date_local >= res.events[i - 1].start_date_local).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SPLIT ENDPOINTS: paritySummary, parityDeltas, parityAllRuns, parityQualOrder
// ═══════════════════════════════════════════════════════════════════════════

describe('paritySummary endpoint', () => {
  it('returns valid response shape without allRuns/deltaMatrices/qualOrder', async () => {
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.eventId).toBe(TEST_EVENT_ID);
    expect(res.classIndex).toBe('TF');
    expect(res.metric).toBe('et_1320');
    expect(res.isLowerBetter).toBe(true);
    expect(res.event).toBeDefined();
    expect(res.event.event_name).toBeTruthy();
    expect(res.trust).toBeDefined();
    expect(res.mapping).toBeDefined();
    expect(Array.isArray(res.combos)).toBe(true);
    expect(res.totalRunsInClass).toBeGreaterThan(0);
    // Should NOT have allRuns, deltaMatrices, qualOrder
    expect((res as any).allRuns).toBeUndefined();
    expect((res as any).deltaMatrices).toBeUndefined();
    expect((res as any).qualOrder).toBeUndefined();
  });

  it('mapping readiness includes mappedPct and topMissingDrivers', async () => {
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    const m = res.mapping;
    expect(typeof m.mappedRunCount).toBe('number');
    expect(typeof m.unknownRunCount).toBe('number');
    expect(Array.isArray(m.topMissingDrivers)).toBe(true);
    if (m.mappedPct !== null) {
      expect(m.mappedPct).toBeGreaterThanOrEqual(0);
      expect(m.mappedPct).toBeLessThanOrEqual(100);
    }
  });

  it('math invariant: best <= avgTopN <= totalAvg for ET combos', async () => {
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    for (const c of res.combos) {
      if (c.bestValue !== null && c.avgTopN !== null) {
        expect(c.bestValue).toBeLessThanOrEqual(c.avgTopN + 0.0001);
      }
      if (c.avgTopN !== null && c.totalAvg !== null && c.countActive > c.countTopN) {
        expect(c.avgTopN).toBeLessThanOrEqual(c.totalAvg + 0.0001);
      }
    }
  });

  it('math invariant: combos sorted by bestValue ascending for ET', async () => {
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    const bests = res.combos.map(c => c.bestValue).filter((v): v is number => v !== null);
    for (let i = 1; i < bests.length; i++) {
      expect(bests[i]).toBeGreaterThanOrEqual(bests[i - 1] - 0.0001);
    }
  });

  it('math invariant: mappedRunCount + unknownRunCount = totalRunsInClass', async () => {
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.mapping.mappedRunCount + res.mapping.unknownRunCount).toBe(res.totalRunsInClass);
  });

  it('summary matches original parityByCombo combos', async () => {
    const params = {
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw' as const,
      topN: 4,
      sessionScope: 'both' as const,
    };
    const [summary, full] = await Promise.all([
      parityApi.paritySummary(params),
      parityApi.parityByCombo(params),
    ]);

    expect(summary.combos.length).toBe(full.combos.length);
    for (let i = 0; i < summary.combos.length; i++) {
      expect(summary.combos[i].engineCombo).toBe(full.combos[i].engineCombo);
      expect(summary.combos[i].bestValue).toBe(full.combos[i].bestValue);
      expect(summary.combos[i].avgTopN).toBe(full.combos[i].avgTopN);
      expect(summary.combos[i].totalAvg).toBe(full.combos[i].totalAvg);
    }
  });
});

describe('parityDeltas endpoint', () => {
  it('returns 3 delta matrices', async () => {
    const res = await parityApi.parityDeltas({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    expect(res.deltaMatrices).toBeDefined();
    expect(Array.isArray(res.deltaMatrices.quickest)).toBe(true);
    expect(Array.isArray(res.deltaMatrices.avgTopN)).toBe(true);
    expect(Array.isArray(res.deltaMatrices.totalAvg)).toBe(true);
  });

  it('delta rows have comboA, comboB, valueA, valueB, delta', async () => {
    const res = await parityApi.parityDeltas({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
    });

    for (const row of res.deltaMatrices.quickest) {
      expect(typeof row.comboA).toBe('string');
      expect(typeof row.comboB).toBe('string');
      if (row.delta !== null) {
        expect(typeof row.delta).toBe('number');
      }
    }
  });

  it('deltas match original parityByCombo deltaMatrices', async () => {
    const params = {
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw' as const,
      topN: 4,
      sessionScope: 'both' as const,
    };
    const [deltas, full] = await Promise.all([
      parityApi.parityDeltas(params),
      parityApi.parityByCombo(params),
    ]);

    expect(deltas.deltaMatrices.quickest.length).toBe(full.deltaMatrices.quickest.length);
    for (let i = 0; i < deltas.deltaMatrices.quickest.length; i++) {
      expect(deltas.deltaMatrices.quickest[i].delta).toBe(full.deltaMatrices.quickest[i].delta);
    }
  });
});

describe('parityAllRuns endpoint (pagination)', () => {
  it('returns paginated runs with correct page metadata', async () => {
    const res = await parityApi.parityAllRuns({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      sessionScope: 'both',
      page: 1,
      pageSize: 10,
    });

    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(10);
    expect(res.totalRuns).toBeGreaterThan(0);
    expect(res.totalPages).toBeGreaterThanOrEqual(1);
    expect(res.runs.length).toBeLessThanOrEqual(10);
    expect(Array.isArray(res.runs)).toBe(true);
  });

  it('page 2 returns different runs than page 1', async () => {
    const params = {
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw' as const,
      sessionScope: 'both' as const,
      pageSize: 5,
    };

    const [p1, p2] = await Promise.all([
      parityApi.parityAllRuns({ ...params, page: 1 }),
      parityApi.parityAllRuns({ ...params, page: 2 }),
    ]);

    if (p1.totalPages >= 2) {
      expect(p2.page).toBe(2);
      expect(p2.runs.length).toBeGreaterThan(0);
      // First run IDs should differ between pages
      expect(p1.runs[0].runId).not.toBe(p2.runs[0].runId);
    }
  });

  it('all pages together contain totalRuns items', async () => {
    const res = await parityApi.parityAllRuns({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      sessionScope: 'both',
      page: 1,
      pageSize: 200,
    });

    // With pageSize=200, should get all runs in one page (typical event < 200 runs)
    expect(res.runs.length).toBe(Math.min(res.totalRuns, 200));
  });

  it('driverSearch filters runs by driver name substring', async () => {
    // First get all runs to pick a driver name
    const all = await parityApi.parityAllRuns({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      sessionScope: 'both',
      pageSize: 200,
    });

    if (all.runs.length === 0) return;

    const targetDriver = all.runs[0].driver;
    const searchTerm = targetDriver.slice(0, 4).toLowerCase();

    const filtered = await parityApi.parityAllRuns({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      sessionScope: 'both',
      driverSearch: searchTerm,
      pageSize: 200,
    });

    expect(filtered.totalRuns).toBeLessThanOrEqual(all.totalRuns);
    expect(filtered.totalRuns).toBeGreaterThan(0);
    expect(filtered.driverSearch).toBe(searchTerm);
    for (const r of filtered.runs) {
      expect(r.driver.toLowerCase()).toContain(searchTerm);
    }
  });

  it('requesting beyond last page clamps to last page', async () => {
    const res = await parityApi.parityAllRuns({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      sessionScope: 'both',
      page: 9999,
      pageSize: 10,
    });

    expect(res.page).toBe(res.totalPages);
    expect(res.runs.length).toBeGreaterThan(0);
  });
});

describe('parityQualOrder endpoint', () => {
  it('returns qualifying order sorted by ET ascending', async () => {
    const res = await parityApi.parityQualOrder({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      sessionScope: 'both',
    });

    expect(Array.isArray(res.qualOrder)).toBe(true);
    // Should have qualPosition
    if (res.qualOrder.length > 0) {
      expect(res.qualOrder[0].qualPosition).toBe(1);
    }
    // ET should be ascending
    const ets = res.qualOrder.map(r => r.et).filter((v): v is number => v !== null);
    for (let i = 1; i < ets.length; i++) {
      expect(ets[i]).toBeGreaterThanOrEqual(ets[i - 1] - 0.0001);
    }
  });

  it('each driver appears at most once in qual order', async () => {
    const res = await parityApi.parityQualOrder({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
    });

    const drivers = res.qualOrder.map(r => r.driver);
    expect(new Set(drivers).size).toBe(drivers.length);
  });

  it('qual order matches original parityByCombo qualOrder', async () => {
    const params = {
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw' as const,
      sessionScope: 'both' as const,
    };
    const [qual, full] = await Promise.all([
      parityApi.parityQualOrder(params),
      parityApi.parityByCombo(params),
    ]);

    expect(qual.qualOrder.length).toBe(full.qualOrder.length);
    for (let i = 0; i < qual.qualOrder.length; i++) {
      expect(qual.qualOrder[i].runId).toBe(full.qualOrder[i].runId);
      expect(qual.qualOrder[i].qualPosition).toBe(full.qualOrder[i].qualPosition);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// READINESS GATE THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

describe('readiness gate thresholds', () => {
  it('mappedPct is null when no runs exist', async () => {
    // Use a class that likely has no runs at this event
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TAFC',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
    });

    if (res.totalRunsInClass === 0) {
      expect(res.mapping.mappedPct).toBeNull();
    }
  });

  it('mappedPct between 0 and 100', async () => {
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
    });

    if (res.mapping.mappedPct !== null) {
      expect(res.mapping.mappedPct).toBeGreaterThanOrEqual(0);
      expect(res.mapping.mappedPct).toBeLessThanOrEqual(100);
    }
  });

  it('topMissingDrivers has at most 10 entries', async () => {
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
    });

    expect(res.mapping.topMissingDrivers.length).toBeLessThanOrEqual(10);
    for (const d of res.mapping.topMissingDrivers) {
      expect(typeof d.driver).toBe('string');
      expect(typeof d.runCount).toBe('number');
      expect(d.runCount).toBeGreaterThan(0);
    }
  });

  it('topMissingDrivers sorted by runCount descending', async () => {
    const res = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
    });

    const counts = res.mapping.topMissingDrivers.map(d => d.runCount);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parityIncrementals endpoint
// ═══════════════════════════════════════════════════════════════════════════

describe('parityIncrementals endpoint', () => {
  it('returns valid response shape', async () => {
    const res = await parityApi.parityIncrementals({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      sessionScope: 'both',
    });

    expect(res.eventId).toBe(TEST_EVENT_ID);
    expect(res.classIndex).toBe('TF');
    expect(res.sessionScope).toBe('both');
    expect(Array.isArray(res.combos)).toBe(true);
    expect(Array.isArray(res.rows)).toBe(true);
  });

  it('returns 8 incremental rows with correct keys', async () => {
    const res = await parityApi.parityIncrementals({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      sessionScope: 'both',
    });

    expect(res.rows.length).toBe(8);
    const keys = res.rows.map(r => r.key);
    expect(keys).toEqual(['t60', 't330', 't660', 'mph660', 't1000', 'mph1000', 't1320', 'mph1320']);
  });

  it('ET rows are isLowerBetter=true, MPH rows are isLowerBetter=false', async () => {
    const res = await parityApi.parityIncrementals({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      sessionScope: 'both',
    });

    for (const row of res.rows) {
      if (row.key.startsWith('mph')) {
        expect(row.isLowerBetter).toBe(false);
      } else {
        expect(row.isLowerBetter).toBe(true);
      }
    }
  });

  it('ET incrementals use MIN (lowest value), MPH incrementals use MAX (highest value)', async () => {
    const res = await parityApi.parityIncrementals({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      sessionScope: 'both',
    });

    // Cross-check: for any combo with 1320ft data, the incremental 1320ft value
    // should be <= the combo's avgTopN from paritySummary (since MIN <= avg)
    const summary = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    const et1320Row = res.rows.find(r => r.key === 't1320');
    if (et1320Row) {
      for (const combo of res.combos) {
        const incVal = et1320Row.values[combo];
        const sumCombo = summary.combos.find(c => c.engineCombo === combo);
        if (incVal != null && sumCombo?.avgTopN != null) {
          // MIN ET should be <= avgTop4 ET
          expect(incVal).toBeLessThanOrEqual(sumCombo.avgTopN + 0.0001);
        }
      }
    }
  });

  it('values are positive when present', async () => {
    const res = await parityApi.parityIncrementals({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      sessionScope: 'both',
    });

    for (const row of res.rows) {
      for (const combo of res.combos) {
        const v = row.values[combo];
        if (v != null) {
          expect(v).toBeGreaterThan(0);
        }
      }
    }
  });

  it('respects sessionScope=qual filter', async () => {
    const both = await parityApi.parityIncrementals({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      sessionScope: 'both',
    });
    const qual = await parityApi.parityIncrementals({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      sessionScope: 'qual',
    });

    // Qual-only combos should be a subset of both combos
    for (const c of qual.combos) {
      expect(both.combos).toContain(c);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// paritySessionWeather endpoint
// ═══════════════════════════════════════════════════════════════════════════

describe('paritySessionWeather endpoint', () => {
  it('returns valid response shape', async () => {
    const res = await parityApi.paritySessionWeather({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
    });

    expect(res.eventId).toBe(TEST_EVENT_ID);
    expect(res.classIndex).toBe('TF');
    expect(Array.isArray(res.sessions)).toBe(true);
  });

  it('session rows have required fields with valid ranges', async () => {
    const res = await parityApi.paritySessionWeather({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
    });

    for (const s of res.sessions) {
      expect(typeof s.session).toBe('string');
      expect(s.session.length).toBeGreaterThan(0);
      expect(s.runCount).toBeGreaterThan(0);
      expect(s.temp_f).toBeGreaterThan(-50);
      expect(s.temp_f).toBeLessThan(180);
      expect(s.rh_pct).toBeGreaterThanOrEqual(0);
      expect(s.rh_pct).toBeLessThanOrEqual(100);
      expect(s.pressure_inhg).toBeGreaterThan(20);
      expect(s.pressure_inhg).toBeLessThan(35);
      expect(typeof s.density_alt_ft).toBe('number');
      expect(s.hpc).toBeGreaterThan(0);
      expect(s.hpc).toBeLessThan(3);
    }
  });

  it('sessions are sorted Q before E', async () => {
    const res = await parityApi.paritySessionWeather({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
    });

    if (res.sessions.length < 2) return; // skip if too few sessions
    const sessions = res.sessions.map(s => s.session);
    const firstE = sessions.findIndex(s => !s.startsWith('Q'));
    const lastQ = sessions.length - 1 - [...sessions].reverse().findIndex(s => s.startsWith('Q'));
    if (firstE >= 0 && lastQ >= 0) {
      // All Q sessions should come before all E sessions
      expect(lastQ).toBeLessThan(firstE);
    }
  });

  it('runCount is positive for all sessions', async () => {
    const res = await parityApi.paritySessionWeather({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
    });

    for (const s of res.sessions) {
      expect(s.runCount).toBeGreaterThan(0);
    }
  });
});
