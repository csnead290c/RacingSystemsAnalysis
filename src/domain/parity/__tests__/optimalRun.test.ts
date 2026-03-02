/**
 * Tests for the "Optimal Run" incremental logic:
 *   ET increments → MIN per increment per combo
 *   MPH increments → MAX per increment per combo
 *
 * This validates the client-side interpretation matches backend behavior
 * (handleParityIncrementals in parity.php).
 */
import { describe, it, expect } from 'vitest';

// ── Pure logic extracted from backend contract ──────────────────────────

interface IncrementalDef {
  key: string;
  label: string;
  isLowerBetter: boolean;
}

const INCREMENTALS: IncrementalDef[] = [
  { key: 't60',      label: '60 ft',    isLowerBetter: true },
  { key: 't330',     label: '330 ft',   isLowerBetter: true },
  { key: 't660',     label: '660 ft',   isLowerBetter: true },
  { key: 'mph660',   label: '660 MPH',  isLowerBetter: false },
  { key: 't1000',    label: '1000 ft',  isLowerBetter: true },
  { key: 'mph1000',  label: '1000 MPH', isLowerBetter: false },
  { key: 't1320',    label: '1320 ft',  isLowerBetter: true },
  { key: 'mph1320',  label: '1320 MPH', isLowerBetter: false },
];

type RunValues = Partial<Record<string, number | null>>;

/**
 * Compute optimal-run incrementals per combo.
 * For each incremental key and each combo, picks:
 *   - MIN if isLowerBetter (ET times)
 *   - MAX if !isLowerBetter (MPH speeds)
 */
function computeOptimalIncrementals(
  runs: { combo: string; values: RunValues }[],
): { combos: string[]; rows: { key: string; label: string; isLowerBetter: boolean; values: Record<string, number | null> }[] } {
  const comboValues: Record<string, Record<string, number[]>> = {};

  for (const run of runs) {
    if (!comboValues[run.combo]) comboValues[run.combo] = {};
    for (const inc of INCREMENTALS) {
      const v = run.values[inc.key];
      if (v != null && v > 0) {
        if (!comboValues[run.combo][inc.key]) comboValues[run.combo][inc.key] = [];
        comboValues[run.combo][inc.key].push(v);
      }
    }
  }

  const combos = Object.keys(comboValues).sort();

  const rows = INCREMENTALS.map(inc => {
    const values: Record<string, number | null> = {};
    for (const c of combos) {
      const vals = comboValues[c]?.[inc.key] ?? [];
      if (vals.length === 0) {
        values[c] = null;
      } else {
        values[c] = inc.isLowerBetter
          ? Math.round(Math.min(...vals) * 10000) / 10000
          : Math.round(Math.max(...vals) * 10000) / 10000;
      }
    }
    return { key: inc.key, label: inc.label, isLowerBetter: inc.isLowerBetter, values };
  });

  return { combos, rows };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Optimal Run Incrementals (MIN ET / MAX MPH)', () => {
  const RUNS = [
    { combo: 'Hemi A', values: { t60: 0.922, t330: 2.321, t660: 3.280, mph660: 275.5, t1000: 4.100, mph1000: 310.2, t1320: 4.500, mph1320: 330.1 } },
    { combo: 'Hemi A', values: { t60: 0.910, t330: 2.340, t660: 3.260, mph660: 277.1, t1000: 4.090, mph1000: 312.5, t1320: 4.480, mph1320: 332.4 } },
    { combo: 'Hemi A', values: { t60: 0.935, t330: 2.310, t660: 3.290, mph660: 274.2, t1000: 4.110, mph1000: 308.8, t1320: 4.520, mph1320: 328.9 } },
    { combo: 'Hemi B', values: { t60: 0.940, t330: 2.350, t660: 3.310, mph660: 273.0, t1000: 4.130, mph1000: 306.0, t1320: 4.550, mph1320: 326.5 } },
    { combo: 'Hemi B', values: { t60: 0.930, t330: 2.360, t660: 3.300, mph660: 274.8, t1000: 4.120, mph1000: 307.3, t1320: 4.540, mph1320: 327.8 } },
  ];

  it('ET rows use MIN (lowest is best)', () => {
    const result = computeOptimalIncrementals(RUNS);
    const t60Row = result.rows.find(r => r.key === 't60')!;
    expect(t60Row.isLowerBetter).toBe(true);
    // Hemi A: min(0.922, 0.910, 0.935) = 0.910
    expect(t60Row.values['Hemi A']).toBe(0.91);
    // Hemi B: min(0.940, 0.930) = 0.930
    expect(t60Row.values['Hemi B']).toBe(0.93);

    const t1320Row = result.rows.find(r => r.key === 't1320')!;
    // Hemi A: min(4.500, 4.480, 4.520) = 4.480
    expect(t1320Row.values['Hemi A']).toBe(4.48);
    // Hemi B: min(4.550, 4.540) = 4.540
    expect(t1320Row.values['Hemi B']).toBe(4.54);
  });

  it('MPH rows use MAX (highest is best)', () => {
    const result = computeOptimalIncrementals(RUNS);
    const mph660Row = result.rows.find(r => r.key === 'mph660')!;
    expect(mph660Row.isLowerBetter).toBe(false);
    // Hemi A: max(275.5, 277.1, 274.2) = 277.1
    expect(mph660Row.values['Hemi A']).toBe(277.1);
    // Hemi B: max(273.0, 274.8) = 274.8
    expect(mph660Row.values['Hemi B']).toBe(274.8);

    const mph1320Row = result.rows.find(r => r.key === 'mph1320')!;
    // Hemi A: max(330.1, 332.4, 328.9) = 332.4
    expect(mph1320Row.values['Hemi A']).toBe(332.4);
    // Hemi B: max(326.5, 327.8) = 327.8
    expect(mph1320Row.values['Hemi B']).toBe(327.8);
  });

  it('null/zero values are excluded from aggregation', () => {
    const runs = [
      { combo: 'X', values: { t60: 0.900, t330: null, mph660: 0, t1320: 4.500, mph1320: 330.0 } },
      { combo: 'X', values: { t60: 0.920, t330: 2.300, mph660: 270.0, t1320: 4.480, mph1320: null } },
    ];
    const result = computeOptimalIncrementals(runs);
    const t330Row = result.rows.find(r => r.key === 't330')!;
    // Only one value (2.300), null excluded
    expect(t330Row.values['X']).toBe(2.3);

    const mph660Row = result.rows.find(r => r.key === 'mph660')!;
    // Zero excluded, only 270.0
    expect(mph660Row.values['X']).toBe(270.0);

    const mph1320Row = result.rows.find(r => r.key === 'mph1320')!;
    // One null, one 330.0
    expect(mph1320Row.values['X']).toBe(330.0);
  });

  it('combo with no values for an incremental returns null', () => {
    const runs = [
      { combo: 'Y', values: { t60: 0.900 } },
    ];
    const result = computeOptimalIncrementals(runs);
    const t330Row = result.rows.find(r => r.key === 't330')!;
    expect(t330Row.values['Y']).toBeNull();
  });

  it('combos are sorted alphabetically', () => {
    const runs = [
      { combo: 'Zebra', values: { t60: 1.0 } },
      { combo: 'Alpha', values: { t60: 1.0 } },
      { combo: 'Mango', values: { t60: 1.0 } },
    ];
    const result = computeOptimalIncrementals(runs);
    expect(result.combos).toEqual(['Alpha', 'Mango', 'Zebra']);
  });

  it('single run per combo returns that run\'s values', () => {
    const runs = [
      { combo: 'Solo', values: { t60: 0.888, mph1320: 340.5 } },
    ];
    const result = computeOptimalIncrementals(runs);
    expect(result.rows.find(r => r.key === 't60')!.values['Solo']).toBe(0.888);
    expect(result.rows.find(r => r.key === 'mph1320')!.values['Solo']).toBe(340.5);
  });

  it('returns 8 incremental rows in correct order', () => {
    const result = computeOptimalIncrementals([{ combo: 'A', values: {} }]);
    expect(result.rows).toHaveLength(8);
    expect(result.rows.map(r => r.key)).toEqual([
      't60', 't330', 't660', 'mph660', 't1000', 'mph1000', 't1320', 'mph1320',
    ]);
  });
});
