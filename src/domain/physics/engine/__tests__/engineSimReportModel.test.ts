import { describe, it, expect } from 'vitest';
import { buildEngineSimReport, sampleDynoPoints } from '../engineSimReportModel';
import { createDefaultEngineProConfig, simulateEngine, calcDisplacement } from '../engineAdapter';

describe('buildEngineSimReport', () => {
  const config = createDefaultEngineProConfig();
  const outputs = simulateEngine(config);
  const displacement = calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders);

  it('returns stable structure with correct title and simName', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test Engine', false, null, null);
    expect(report.title).toBe('Engine Sim Report');
    expect(report.simName).toBe('Test Engine');
    expect(typeof report.generatedAt).toBe('string');
  });

  it('includes all 4 input sections', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', false, null, null);
    expect(report.inputs).toHaveLength(4);
    expect(report.inputs.map(s => s.title)).toEqual([
      'Engine Design', 'Camshaft', 'Induction', 'Cylinder Head',
    ]);
  });

  it('Engine Design section has correct row count and values', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', false, null, null);
    const design = report.inputs[0];
    expect(design.rows.length).toBe(6);
    expect(design.rows[0]).toEqual({ label: 'Configuration', value: '8-cyl V' });
    expect(design.rows[1].value).toBe('4.030 in');
    expect(design.rows[2].value).toBe('3.480 in');
  });

  it('performance section has correct peak values from simulation', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', false, null, null);
    const perf = report.performance;
    expect(perf.peakHP).toBe(outputs.peakHP);
    expect(perf.rpmPeakHP).toBe(outputs.rpmPeakHP);
    expect(perf.peakTQ).toBe(outputs.peakTQ);
    expect(perf.rpmPeakTQ).toBe(outputs.rpmPeakTQ);
    expect(perf.displacement_ci).toBeCloseTo(displacement, 1);
    expect(perf.shift).toBe(outputs.shift);
    expect(perf.redline).toBe(outputs.redline);
  });

  it('pro sections are null when isProMode=false', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', false, null, null);
    expect(report.pro).toBeNull();
  });

  it('pro sections are populated when isProMode=true', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', true, [], null);
    expect(report.pro).not.toBeNull();
    expect(report.pro!.flowDetails).toEqual([]);
    expect(report.pro!.recommendations).toBeNull();
  });

  it('optional cam fields appear in Camshaft section when provided', () => {
    const configWithCam = { ...config, lobeSeparationAngle_deg: 112, intakeLobeCenterline_deg: 108 };
    const report = buildEngineSimReport(configWithCam, outputs, displacement, 'Test', false, null, null);
    const cam = report.inputs[1];
    const labels = cam.rows.map(r => r.label);
    expect(labels).toContain('Lobe Separation Angle');
    expect(labels).toContain('Intake Lobe Centerline');
  });

  it('optional cam fields are absent when not provided', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', false, null, null);
    const cam = report.inputs[1];
    const labels = cam.rows.map(r => r.label);
    expect(labels).not.toContain('Lobe Separation Angle');
    expect(labels).not.toContain('Intake Lobe Centerline');
  });

  it('round-trips through JSON without data loss', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', true, [], null);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.performance.peakHP).toBe(report.performance.peakHP);
    expect(parsed.inputs.length).toBe(report.inputs.length);
  });

  it('dynoSeries defaults to empty array when not provided', () => {
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', false, null, null);
    expect(report.dynoSeries).toEqual([]);
  });

  it('dynoSeries is populated when passed', () => {
    const dyno = [
      { rpm: 2000, hp: 80, tq: 200 },
      { rpm: 4000, hp: 250, tq: 350 },
      { rpm: 6000, hp: 400, tq: 320 },
    ];
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', false, null, null, dyno);
    expect(report.dynoSeries).toHaveLength(3);
    expect(report.dynoSeries[0].rpm).toBe(2000);
    expect(report.dynoSeries[2].rpm).toBe(6000);
  });

  it('dynoSeries points contain hp and tq values', () => {
    const dyno = [
      { rpm: 3000, hp: 150, tq: 280 },
      { rpm: 5000, hp: 350, tq: 340 },
    ];
    const report = buildEngineSimReport(config, outputs, displacement, 'Test', false, null, null, dyno);
    for (const pt of report.dynoSeries) {
      expect(typeof pt.rpm).toBe('number');
      expect(typeof pt.hp).toBe('number');
      expect(typeof pt.tq).toBe('number');
      expect(pt.rpm).toBeGreaterThan(0);
    }
  });
});

describe('sampleDynoPoints', () => {
  it('returns all points when <= 20', () => {
    const pts = Array.from({ length: 15 }, (_, i) => ({ rpm: 1000 + i * 200, hp: 50 + i * 10, tq: 100 + i * 5 }));
    expect(sampleDynoPoints(pts)).toHaveLength(15);
    expect(sampleDynoPoints(pts)).toBe(pts); // same reference
  });

  it('samples every other point when > 20', () => {
    const pts = Array.from({ length: 30 }, (_, i) => ({ rpm: 1000 + i * 100, hp: 50 + i * 5, tq: 100 + i * 3 }));
    const sampled = sampleDynoPoints(pts);
    // Even indices: 0,2,4,...,28 = 15 points + last (29) = 16
    expect(sampled.length).toBeLessThan(pts.length);
    expect(sampled.length).toBeGreaterThan(0);
  });

  it('always includes the first point', () => {
    const pts = Array.from({ length: 25 }, (_, i) => ({ rpm: 2000 + i * 100, hp: i * 10, tq: i * 5 }));
    const sampled = sampleDynoPoints(pts);
    expect(sampled[0]).toBe(pts[0]);
  });

  it('always includes the last point', () => {
    const pts = Array.from({ length: 25 }, (_, i) => ({ rpm: 2000 + i * 100, hp: i * 10, tq: i * 5 }));
    const sampled = sampleDynoPoints(pts);
    expect(sampled[sampled.length - 1]).toBe(pts[pts.length - 1]);
  });

  it('handles empty array', () => {
    expect(sampleDynoPoints([])).toEqual([]);
  });

  it('handles single point', () => {
    const pts = [{ rpm: 3000, hp: 200, tq: 300 }];
    expect(sampleDynoPoints(pts)).toEqual(pts);
  });
});
