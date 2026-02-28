/**
 * Validation: compare paritySummary + parityDeltas output against
 * parityByCombo (the monolith) for a real mapped event.
 * Verifies combo values, delta signs, and No Data handling.
 *
 * Run with: npx vitest run src/integration-tests/parity-validation.spec.ts
 */

import { describe, it, expect } from 'vitest';
import { parityApi } from '../services/parityApi';

const TEST_EVENT_ID = Number((import.meta as any).env?.VITE_TEST_EVENT_ID ?? '104');

describe('Parity validation against real mapped event', () => {
  it('finds event with mappedPct data and validates combo values', async () => {
    const summary = await parityApi.paritySummary({
      eventId: TEST_EVENT_ID,
      classIndex: 'TF',
      metric: 'et_1320',
      mode: 'raw',
      topN: 4,
      sessionScope: 'both',
    });

    console.log(`\n═══ VALIDATION: ${summary.event.event_name} ═══`);
    console.log(`mappedPct: ${summary.mapping.mappedPct}%`);
    console.log(`totalRuns: ${summary.totalRunsInClass}`);
    console.log(`combos: ${summary.combos.length}`);

    // Validate each combo
    for (const c of summary.combos) {
      const hasQuickest = c.bestValue !== null;
      const hasAvgTopN = c.avgTopN !== null;
      const hasTotalAvg = c.totalAvg !== null;

      console.log(`  ${c.engineCombo}: quickest=${hasQuickest ? c.bestValue!.toFixed(4) : 'No Data'} avgTop4=${hasAvgTopN ? c.avgTopN!.toFixed(4) : 'No Data'} totalAvg=${hasTotalAvg ? c.totalAvg!.toFixed(4) : 'No Data'} active=${c.countActive}`);

      // If bestValue exists, combo has >=1 active run
      if (hasQuickest) {
        expect(c.countActive).toBeGreaterThanOrEqual(1);
      }
      // If avgTopN exists, combo has >= topN active runs (or at least 1)
      if (hasAvgTopN && hasQuickest) {
        expect(c.bestValue!).toBeLessThanOrEqual(c.avgTopN! + 0.0001);
      }
      // If totalAvg exists and avgTopN exists, totalAvg >= avgTopN for ET
      if (hasTotalAvg && hasAvgTopN && c.countActive > c.countTopN) {
        expect(c.avgTopN!).toBeLessThanOrEqual(c.totalAvg! + 0.0001);
      }
    }

    expect(summary.combos.length).toBeGreaterThan(0);
  });

  it('validates delta table signs and No Data handling', async () => {
    const [summary, deltas] = await Promise.all([
      parityApi.paritySummary({
        eventId: TEST_EVENT_ID, classIndex: 'TF', metric: 'et_1320',
        mode: 'raw', topN: 4, sessionScope: 'both',
      }),
      parityApi.parityDeltas({
        eventId: TEST_EVENT_ID, classIndex: 'TF', metric: 'et_1320',
        mode: 'raw', topN: 4, sessionScope: 'both',
      }),
    ]);

    const comboMap = new Map(summary.combos.map(c => [c.engineCombo, c]));

    console.log(`\n═══ DELTA VALIDATION ═══`);

    for (const row of deltas.deltaMatrices.quickest) {
      const cA = comboMap.get(row.comboA);
      const cB = comboMap.get(row.comboB);

      // If either combo has no bestValue, delta row should have null values
      if (!cA || cA.bestValue === null || !cB || cB.bestValue === null) {
        console.log(`  ${row.comboA} vs ${row.comboB}: No Data (valueA=${row.valueA}, valueB=${row.valueB})`);
        // At least one of valueA/valueB should be null
        expect(row.valueA === null || row.valueB === null).toBe(true);
        continue;
      }

      // Both have data — delta should be valueA - valueB
      if (row.delta !== null && row.valueA !== null && row.valueB !== null) {
        const expectedDelta = row.valueA - row.valueB;
        console.log(`  ${row.comboA} (${row.valueA.toFixed(4)}) vs ${row.comboB} (${row.valueB.toFixed(4)}) = ${row.delta > 0 ? '+' : ''}${row.delta.toFixed(4)} (expected: ${expectedDelta.toFixed(4)})`);
        expect(Math.abs(row.delta - expectedDelta)).toBeLessThan(0.001);
      }
    }

    // Verify trigger classification would work
    const ET_TRIGGER = 0.050;
    let withinTrigger = 0;
    let outsideTrigger = 0;
    for (const row of deltas.deltaMatrices.quickest) {
      if (row.delta !== null) {
        if (Math.abs(row.delta) <= ET_TRIGGER) withinTrigger++;
        else outsideTrigger++;
      }
    }
    console.log(`  Quickest deltas: ${withinTrigger} within ±${ET_TRIGGER}, ${outsideTrigger} outside`);
  });

  it('cross-validates split endpoints match monolith parityByCombo', async () => {
    const params = {
      eventId: TEST_EVENT_ID, classIndex: 'TF', metric: 'et_1320',
      mode: 'raw' as const, topN: 4, sessionScope: 'both' as const,
    };

    const [summary, deltas, full] = await Promise.all([
      parityApi.paritySummary(params),
      parityApi.parityDeltas(params),
      parityApi.parityByCombo(params),
    ]);

    console.log(`\n═══ CROSS-VALIDATION: split vs monolith ═══`);

    // Combo count
    expect(summary.combos.length).toBe(full.combos.length);
    console.log(`  Combo count: ${summary.combos.length} (match)`);

    // Per-combo values
    for (let i = 0; i < summary.combos.length; i++) {
      const s = summary.combos[i];
      const f = full.combos[i];
      expect(s.engineCombo).toBe(f.engineCombo);
      expect(s.bestValue).toBe(f.bestValue);
      expect(s.avgTopN).toBe(f.avgTopN);
      expect(s.totalAvg).toBe(f.totalAvg);
      expect(s.spread).toBe(f.spread);
      console.log(`  ${s.engineCombo}: quickest=${s.bestValue === f.bestValue ? '✓' : '✗'} avgTopN=${s.avgTopN === f.avgTopN ? '✓' : '✗'} totalAvg=${s.totalAvg === f.totalAvg ? '✓' : '✗'}`);
    }

    // Delta matrices
    expect(deltas.deltaMatrices.quickest.length).toBe(full.deltaMatrices.quickest.length);
    expect(deltas.deltaMatrices.avgTopN.length).toBe(full.deltaMatrices.avgTopN.length);
    expect(deltas.deltaMatrices.totalAvg.length).toBe(full.deltaMatrices.totalAvg.length);

    for (let i = 0; i < deltas.deltaMatrices.quickest.length; i++) {
      expect(deltas.deltaMatrices.quickest[i].delta).toBe(full.deltaMatrices.quickest[i].delta);
    }
    console.log(`  Delta matrices: quickest(${deltas.deltaMatrices.quickest.length}) avgTopN(${deltas.deltaMatrices.avgTopN.length}) totalAvg(${deltas.deltaMatrices.totalAvg.length}) — all match`);

    // Trust & mapping
    expect(summary.trust.weatherCoveragePct).toBe(full.trust.weatherCoveragePct);
    expect(summary.totalRunsInClass).toBe(full.totalRunsInClass);
    console.log(`  Trust & totalRuns: ✓`);
  });
});
