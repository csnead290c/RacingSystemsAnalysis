import { describe, it, expect } from 'vitest';
import { buildVb6DetailRows, type TracePoint } from '../buildVb6DetailRows';

/**
 * Generate a synthetic trace array simulating a quarter-mile run.
 * Produces ~100 points from 0 to slightly past raceLengthFt with
 * gear changes at defined distances.
 */
function makeSyntheticTrace(opts: {
  raceLengthFt?: number;
  gearChangeFt?: number[];
  overshootFt?: number;
} = {}): TracePoint[] {
  const raceFt = opts.raceLengthFt ?? 1320;
  const gearChanges = opts.gearChangeFt ?? [100, 300, 700];
  const overshoot = opts.overshootFt ?? 5;
  const totalFt = raceFt + overshoot;
  const steps = 100;
  const traces: TracePoint[] = [];

  let currentGear = 1;
  let gearIdx = 0;

  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const s_ft = frac * totalFt;

    // Advance gear at defined distances
    while (gearIdx < gearChanges.length && s_ft >= gearChanges[gearIdx]) {
      currentGear++;
      gearIdx++;
    }

    traces.push({
      t_s: frac * 10, // ~10s quarter mile
      s_ft,
      v_mph: 30 + frac * 120, // 30 to 150 mph
      a_g: 1.5 - frac * 0.8,  // decreasing accel
      rpm: 4000 + Math.sin(frac * Math.PI * 4) * 2000,
      gear: currentGear,
      hp: 400 + frac * 100,
    });
  }

  return traces;
}

describe('buildVb6DetailRows', () => {
  it('returns empty array for empty traces', () => {
    expect(buildVb6DetailRows([], 1320)).toEqual([]);
  });

  it('includes standard distance checkpoints for quarter mile', () => {
    const traces = makeSyntheticTrace();
    const rows = buildVb6DetailRows(traces, 1320);

    const labels = rows.map(r => r.label);
    // Should have 60', 330', 660', 1000' checkpoints (1320 is finish, not a checkpoint)
    expect(labels).toContain("60'");
    expect(labels).toContain("330'");
    expect(labels).toContain("660'");
    expect(labels).toContain("1000'");
  });

  it('includes standard distance checkpoints for eighth mile', () => {
    const traces = makeSyntheticTrace({ raceLengthFt: 660, gearChangeFt: [100, 300] });
    const rows = buildVb6DetailRows(traces, 660);

    const labels = rows.map(r => r.label);
    expect(labels).toContain("60'");
    expect(labels).toContain("330'");
    // 660 is the finish, should appear as "Finish" not "660'"
    expect(labels).not.toContain("660'");
  });

  it('includes gear-change rows', () => {
    const traces = makeSyntheticTrace({ gearChangeFt: [100, 300, 700] });
    const rows = buildVb6DetailRows(traces, 1320);

    const gearRows = rows.filter(r => r.kind === 'gear-change');
    expect(gearRows.length).toBeGreaterThanOrEqual(1);
    // Gear change labels should be like "1→2", "2→3", etc.
    for (const row of gearRows) {
      expect(row.label).toMatch(/^\d→\d$/);
    }
  });

  it('includes a finish row', () => {
    const traces = makeSyntheticTrace();
    const rows = buildVb6DetailRows(traces, 1320);

    const finishRows = rows.filter(r => r.kind === 'finish');
    expect(finishRows).toHaveLength(1);
    expect(finishRows[0].label).toBe('Finish');
    // Finish distance should be close to 1320
    expect(finishRows[0].s_ft).toBeGreaterThanOrEqual(1310);
    expect(finishRows[0].s_ft).toBeLessThanOrEqual(1330);
  });

  it('works when trace overshoots finish distance', () => {
    // Trace goes 20ft past finish — VB6 behavior
    const traces = makeSyntheticTrace({ overshootFt: 20 });
    const rows = buildVb6DetailRows(traces, 1320);

    const finishRow = rows.find(r => r.kind === 'finish');
    expect(finishRow).toBeDefined();
    expect(finishRow!.label).toBe('Finish');
    // Should pick the closest point to 1320, even if slightly past
    expect(Math.abs(finishRow!.s_ft - 1320)).toBeLessThan(20);
  });

  it('rows are sorted by distance ascending', () => {
    const traces = makeSyntheticTrace();
    const rows = buildVb6DetailRows(traces, 1320);

    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].s_ft).toBeGreaterThanOrEqual(rows[i - 1].s_ft);
    }
  });

  it('each row has all required fields', () => {
    const traces = makeSyntheticTrace();
    const rows = buildVb6DetailRows(traces, 1320);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.label).toBeDefined();
      expect(row.kind).toMatch(/^(checkpoint|gear-change|finish)$/);
      expect(typeof row.t_s).toBe('number');
      expect(typeof row.s_ft).toBe('number');
      expect(typeof row.v_mph).toBe('number');
      expect(typeof row.a_g).toBe('number');
      expect(typeof row.rpm).toBe('number');
      expect(typeof row.gear).toBe('number');
    }
  });

  it('dataset is small and readable (< 20 rows for quarter mile)', () => {
    const traces = makeSyntheticTrace();
    const rows = buildVb6DetailRows(traces, 1320);

    // Should be much smaller than full trace (100+ steps)
    expect(rows.length).toBeLessThan(20);
    expect(rows.length).toBeGreaterThan(3); // At least checkpoints + finish
  });
});
