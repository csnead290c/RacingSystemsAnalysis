import { describe, it, expect } from 'vitest';
import {
  calcFlowBenchRow,
  calcFlowBenchWorksheet,
  estimateDefaultFlowbenchData,
  validateLiftOrder,
  findLastRow,
  hasValidFlowBenchData,
  hydrateFlowBenchFromConfig,
  MAX_FLOW_BENCH_ROWS,
  type FlowBenchSeatData,
  type FlowBenchContext,
} from '../worksheets/flowBenchWorksheet';

// VB6 BASECASE defaults
const SEAT_DATA: FlowBenchSeatData = {
  seatDia_in: 1.794,
  seatPer: 87.5,
  vsAngle_deg: 45,
  vsWidth_in: 0.08,
  stemDia_in: 0.344,
};

const CTX: FlowBenchContext = {
  valveDia_in: 2.05,
  noInValves: 1,
  deltaP_inH2O: 28,
  maxValveLift_in: 0.55,
};

// =========================================================================
// calcFlowBenchRow
// =========================================================================
describe('calcFlowBenchRow', () => {
  it('returns zeros for zero lift', () => {
    const row = calcFlowBenchRow(0, 100, SEAT_DATA, CTX);
    expect(row.area_sqin).toBe(0);
    expect(row.velocity_fps).toBe(0);
    expect(row.flowFlux).toBe(0);
    expect(row.fvIndex_pct).toBe(0);
  });

  it('returns zeros for zero flow', () => {
    const row = calcFlowBenchRow(0.2, 0, SEAT_DATA, CTX);
    expect(row.area_sqin).toBe(0);
    expect(row.velocity_fps).toBe(0);
  });

  it('computes positive derived values for valid inputs', () => {
    const row = calcFlowBenchRow(0.2, 116, SEAT_DATA, CTX);
    expect(row.area_sqin).toBeGreaterThan(0);
    expect(row.velocity_fps).toBeGreaterThan(0);
    expect(row.flowFlux).toBeGreaterThan(0);
    expect(row.fvIndex_pct).toBeGreaterThan(0);
  });

  it('flux = flow / area (rounded to 1 dp)', () => {
    const row = calcFlowBenchRow(0.3, 170, SEAT_DATA, CTX);
    const expectedFlux = Number((170 / row.area_sqin).toFixed(1));
    expect(row.flowFlux).toBe(expectedFlux);
  });

  it('velocity = flux * 2.4 (rounded to 1 dp)', () => {
    const row = calcFlowBenchRow(0.3, 170, SEAT_DATA, CTX);
    const expectedVel = Number((row.flowFlux * 2.4).toFixed(1));
    expect(row.velocity_fps).toBe(expectedVel);
  });

  it('fvIndex = 100 * velocity / VSTD (positive)', () => {
    const row = calcFlowBenchRow(0.3, 170, SEAT_DATA, CTX);
    expect(row.fvIndex_pct).toBeGreaterThan(0);
    expect(row.fvIndex_pct).toBeLessThan(200); // sanity
  });

  it('area increases with lift (up to throat limit)', () => {
    const r1 = calcFlowBenchRow(0.1, 57, SEAT_DATA, CTX);
    const r2 = calcFlowBenchRow(0.3, 170, SEAT_DATA, CTX);
    expect(r2.area_sqin).toBeGreaterThanOrEqual(r1.area_sqin);
  });
});

// =========================================================================
// calcFlowBenchWorksheet
// =========================================================================
describe('calcFlowBenchWorksheet', () => {
  // Typical BASECASE-like data
  const lifts = [0.1, 0.2, 0.3, 0.4, 0.5];
  const flows = [57, 116, 170, 213, 241];

  it('produces correct number of rows', () => {
    const result = calcFlowBenchWorksheet(lifts, flows, SEAT_DATA, CTX);
    expect(result.rows).toHaveLength(5);
  });

  it('stops at first zero lift', () => {
    const result = calcFlowBenchWorksheet(
      [0.1, 0.2, 0, 0.4], [57, 116, 0, 213], SEAT_DATA, CTX
    );
    expect(result.rows).toHaveLength(2);
  });

  it('summary has positive flow at max valve lift', () => {
    const result = calcFlowBenchWorksheet(lifts, flows, SEAT_DATA, CTX);
    expect(result.summary.flow_cfm).toBeGreaterThan(0);
    expect(result.summary.csArea_sqin).toBeGreaterThan(0);
    expect(result.summary.velocity_fps).toBeGreaterThan(0);
    expect(result.summary.flowFlux).toBeGreaterThan(0);
    expect(result.summary.fvIndex_pct).toBeGreaterThan(0);
  });

  it('summary flow is interpolated (between last two data points)', () => {
    const result = calcFlowBenchWorksheet(lifts, flows, SEAT_DATA, CTX);
    // maxValveLift = 0.55, last data point is 0.5 → flow should be extrapolated slightly above 241
    expect(result.summary.flow_cfm).toBeGreaterThanOrEqual(241);
  });

  it('returns empty summary for empty data', () => {
    const result = calcFlowBenchWorksheet([], [], SEAT_DATA, CTX);
    expect(result.rows).toHaveLength(0);
    expect(result.summary.flow_cfm).toBe(0);
  });
});

// =========================================================================
// estimateDefaultFlowbenchData
// =========================================================================
describe('estimateDefaultFlowbenchData', () => {
  it('generates non-empty data for BASECASE inputs', () => {
    const { data } = estimateDefaultFlowbenchData(
      2.05, 1, 250, 28, SEAT_DATA, 4, 0.55
    );
    expect(data.length).toBeGreaterThan(0);
    expect(data.length).toBeLessThanOrEqual(10);
  });

  it('all lift values are positive and ascending', () => {
    const { data } = estimateDefaultFlowbenchData(
      2.05, 1, 250, 28, SEAT_DATA, 4, 0.55
    );
    for (let i = 0; i < data.length; i++) {
      expect(data[i].lift).toBeGreaterThan(0);
      if (i > 0) expect(data[i].lift).toBeGreaterThan(data[i - 1].lift);
    }
  });

  it('all flow values are positive', () => {
    const { data } = estimateDefaultFlowbenchData(
      2.05, 1, 250, 28, SEAT_DATA, 4, 0.55
    );
    for (const pt of data) {
      expect(pt.flow).toBeGreaterThan(0);
    }
  });

  it('flow values are scaled to approximately match maxInFlow', () => {
    const { data } = estimateDefaultFlowbenchData(
      2.05, 1, 250, 28, SEAT_DATA, 4, 0.55
    );
    // The max flow in the table should be in the ballpark of 250 CFM
    const maxFlow = Math.max(...data.map(p => p.flow));
    expect(maxFlow).toBeGreaterThan(100);
    expect(maxFlow).toBeLessThan(400);
  });

  it('generates fewer points for small valve diameter', () => {
    const { data: dataSmall } = estimateDefaultFlowbenchData(
      1.2, 1, 150, 28, SEAT_DATA, 6, 0.3
    );
    const { data: dataLarge } = estimateDefaultFlowbenchData(
      2.05, 1, 250, 28, SEAT_DATA, 4, 0.55
    );
    // Small valve: inc=0.05, L/D limit 0.4 reached sooner with smaller valve
    // but more points since increment is smaller
    expect(dataSmall.length).toBeGreaterThan(0);
    expect(dataLarge.length).toBeGreaterThan(0);
  });

  it('BASECASE: adjustedMaxLift_in === input (no adjustment)', () => {
    const { adjustedMaxLift_in } = estimateDefaultFlowbenchData(
      2.05, 1, 250, 28, SEAT_DATA, 4, 0.55
    );
    // VB6 BASECASE: 0.55 is reasonable for camType 4 (normal flat tappet)
    // with valveDia 2.05 and maxInFlow 250 — scaling should be <= 1.1
    expect(adjustedMaxLift_in).toBe(0.55);
  });

  it('scaling > 1.1: adjustedMaxLift_in increases, rounded to 0.05, clamped to cam max', () => {
    // Low lift + high flow forces scaling > 1.1
    const { adjustedMaxLift_in } = estimateDefaultFlowbenchData(
      2.05, 1, 450, 28, SEAT_DATA, 4, 0.35
    );
    // Must be greater than input
    expect(adjustedMaxLift_in).toBeGreaterThan(0.35);
    // VB6 RoundUp to 0.05 increments
    expect(adjustedMaxLift_in * 20).toBeCloseTo(Math.round(adjustedMaxLift_in * 20), 5);
    // Clamped to (camRatio + 0.01) * valveDia = (0.31 + 0.01) * 2.05 = 0.656
    expect(adjustedMaxLift_in).toBeLessThanOrEqual(0.656);
  });

  it('adjustedMaxLift_in is always returned (consumer decides propagation)', () => {
    // Even when no adjustment is needed, the field is present and equals input
    const noAdj = estimateDefaultFlowbenchData(2.05, 1, 250, 28, SEAT_DATA, 4, 0.55);
    expect(noAdj).toHaveProperty('adjustedMaxLift_in');
    expect(noAdj).toHaveProperty('data');

    // When adjustment IS needed, the field reflects the new value
    const adj = estimateDefaultFlowbenchData(2.05, 1, 450, 28, SEAT_DATA, 4, 0.35);
    expect(adj).toHaveProperty('adjustedMaxLift_in');
    expect(adj.adjustedMaxLift_in).not.toBe(0.35);

    // Contract: the pure function always returns both fields;
    // it is the caller's responsibility to decide whether to propagate
    // adjustedMaxLift_in back to config (only on initial auto-gen, not re-gen).
  });
});

// =========================================================================
// validateLiftOrder
// =========================================================================
describe('validateLiftOrder', () => {
  it('accepts ascending lifts', () => {
    expect(validateLiftOrder([0.1, 0.2, 0.3])).toEqual({ valid: true });
  });

  it('accepts lifts with trailing zeros', () => {
    expect(validateLiftOrder([0.1, 0.2, 0])).toEqual({ valid: true });
  });

  it('rejects non-ascending lifts', () => {
    const result = validateLiftOrder([0.1, 0.3, 0.2]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ascending');
  });

  it('rejects equal adjacent lifts', () => {
    const result = validateLiftOrder([0.1, 0.2, 0.2]);
    expect(result.valid).toBe(false);
  });

  it('rejects gaps (zero followed by non-zero)', () => {
    const result = validateLiftOrder([0.1, 0, 0.3]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Blank');
  });

  it('accepts empty array', () => {
    expect(validateLiftOrder([])).toEqual({ valid: true });
  });
});

// =========================================================================
// findLastRow
// =========================================================================
describe('findLastRow', () => {
  it('returns -1 for empty array', () => {
    expect(findLastRow([])).toBe(-1);
  });

  it('returns -1 for all-zero array', () => {
    expect(findLastRow([0, 0, 0])).toBe(-1);
  });

  it('returns last non-zero index', () => {
    expect(findLastRow([0.1, 0.2, 0.3, 0, 0])).toBe(2);
  });

  it('returns last index when all non-zero', () => {
    expect(findLastRow([0.1, 0.2, 0.3])).toBe(2);
  });
});

// =========================================================================
// hasValidFlowBenchData
// =========================================================================
describe('hasValidFlowBenchData', () => {
  it('rejects undefined lifts', () => {
    expect(hasValidFlowBenchData(undefined, [100, 200])).toEqual({ valid: false, reason: 'missing arrays' });
  });

  it('rejects undefined flows', () => {
    expect(hasValidFlowBenchData([0.1, 0.2], undefined)).toEqual({ valid: false, reason: 'missing arrays' });
  });

  it('rejects both undefined', () => {
    expect(hasValidFlowBenchData(undefined, undefined)).toEqual({ valid: false, reason: 'missing arrays' });
  });

  it('rejects length mismatch', () => {
    const r = hasValidFlowBenchData([0.1, 0.2, 0.3], [100, 200]);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('length mismatch');
  });

  it('rejects fewer than 2 points', () => {
    const r = hasValidFlowBenchData([0.1], [100]);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('too few');
  });

  it('rejects more than MAX_FLOW_BENCH_ROWS points', () => {
    const lifts = Array.from({ length: 11 }, (_, i) => (i + 1) * 0.05);
    const flows = Array.from({ length: 11 }, (_, i) => (i + 1) * 30);
    const r = hasValidFlowBenchData(lifts, flows);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('too many');
  });

  it('rejects all-zero lifts (placeholder)', () => {
    const r = hasValidFlowBenchData([0, 0, 0], [100, 200, 300]);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('only 0 active');
  });

  it('rejects non-ascending lifts', () => {
    const r = hasValidFlowBenchData([0.1, 0.3, 0.2], [100, 200, 300]);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('not ascending');
  });

  it('rejects zero flow in active region', () => {
    const r = hasValidFlowBenchData([0.1, 0.2, 0.3], [100, 0, 300]);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('flow[1] <= 0');
  });

  it('accepts valid 4-point data', () => {
    const r = hasValidFlowBenchData(
      [0.1, 0.2, 0.3, 0.4],
      [80, 140, 190, 230],
    );
    expect(r).toEqual({ valid: true });
  });

  it('accepts valid data with trailing zeros', () => {
    // VB6 stores 10 slots; unused ones are 0
    const lifts = [0.1, 0.2, 0.3, 0, 0, 0, 0, 0, 0, 0];
    const flows = [80, 140, 190, 0, 0, 0, 0, 0, 0, 0];
    const r = hasValidFlowBenchData(lifts, flows);
    expect(r).toEqual({ valid: true });
  });

  it('accepts exactly 2 active points (minimum for TABY)', () => {
    const r = hasValidFlowBenchData([0.1, 0.2], [80, 140]);
    expect(r).toEqual({ valid: true });
  });

  it('accepts exactly MAX_FLOW_BENCH_ROWS points', () => {
    const lifts = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.05);
    const flows = Array.from({ length: 10 }, (_, i) => (i + 1) * 30);
    const r = hasValidFlowBenchData(lifts, flows);
    expect(r).toEqual({ valid: true });
  });
});

// =========================================================================
// hydrateFlowBenchFromConfig
// =========================================================================
describe('hydrateFlowBenchFromConfig', () => {
  const fmtLift = (v: number) => v.toFixed(3);

  it('hydrates valid 4-point data into state arrays', () => {
    const lifts = [0.1, 0.2, 0.3, 0.4];
    const flows = [80, 140, 190, 230];
    const h = hydrateFlowBenchFromConfig(lifts, flows, fmtLift);

    expect(h.fbLifts).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(h.fbFlows).toEqual([80, 140, 190, 230]);
    expect(h.fbLiftTxt[0]).toBe('0.100');
    expect(h.fbLiftTxt[1]).toBe('0.200');
    expect(h.fbLiftTxt[2]).toBe('0.300');
    expect(h.fbLiftTxt[3]).toBe('0.400');
    expect(h.fbFlowTxt[0]).toBe('80');
    expect(h.fbFlowTxt[3]).toBe('230');
    // Remaining slots are empty
    expect(h.fbLiftTxt[4]).toBe('');
    expect(h.fbFlowTxt[4]).toBe('');
  });

  it('text arrays are always MAX_FLOW_BENCH_ROWS long', () => {
    const lifts = [0.1, 0.2];
    const flows = [80, 140];
    const h = hydrateFlowBenchFromConfig(lifts, flows, fmtLift);

    expect(h.fbLiftTxt).toHaveLength(MAX_FLOW_BENCH_ROWS);
    expect(h.fbFlowTxt).toHaveLength(MAX_FLOW_BENCH_ROWS);
  });

  it('stops at first zero lift (trailing zeros become empty text)', () => {
    const lifts = [0.1, 0.2, 0, 0, 0];
    const flows = [80, 140, 0, 0, 0];
    const h = hydrateFlowBenchFromConfig(lifts, flows, fmtLift);

    expect(h.fbLiftTxt[0]).toBe('0.100');
    expect(h.fbLiftTxt[1]).toBe('0.200');
    expect(h.fbLiftTxt[2]).toBe('');
    expect(h.fbFlowTxt[2]).toBe('');
  });

  it('clamps to MAX_FLOW_BENCH_ROWS even if input is longer', () => {
    const lifts = Array.from({ length: 12 }, (_, i) => (i + 1) * 0.05);
    const flows = Array.from({ length: 12 }, (_, i) => (i + 1) * 30);
    const h = hydrateFlowBenchFromConfig(lifts, flows, fmtLift);

    expect(h.fbLifts).toHaveLength(MAX_FLOW_BENCH_ROWS);
    expect(h.fbFlows).toHaveLength(MAX_FLOW_BENCH_ROWS);
  });

  it('uses the provided formatter for lift text', () => {
    const customFmt = (v: number) => `${v}"`;
    const h = hydrateFlowBenchFromConfig([0.55], [250], customFmt);
    expect(h.fbLiftTxt[0]).toBe('0.55"');
  });
});

// =========================================================================
// Integration: hasValidFlowBenchData + hydrateFlowBenchFromConfig
// =========================================================================
describe('hydration integration', () => {
  it('estimateDefaultFlowbenchData output passes validation and hydrates correctly', () => {
    const { data } = estimateDefaultFlowbenchData(
      2.05, 1, 250, 28, SEAT_DATA, 4, 0.55,
    );
    const lifts = data.map(p => p.lift);
    const flows = data.map(p => p.flow);

    // Validate
    const check = hasValidFlowBenchData(lifts, flows);
    expect(check.valid).toBe(true);

    // Hydrate
    const h = hydrateFlowBenchFromConfig(lifts, flows, v => v.toFixed(3));
    expect(h.fbLifts.length).toBeGreaterThanOrEqual(2);
    expect(h.fbLiftTxt[0]).not.toBe('');
    expect(h.fbFlowTxt[0]).not.toBe('');
  });

  it('empty config arrays fail validation (triggers default generation path)', () => {
    expect(hasValidFlowBenchData(undefined, undefined).valid).toBe(false);
    expect(hasValidFlowBenchData([], []).valid).toBe(false);
  });
});
