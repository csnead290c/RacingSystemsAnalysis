/**
 * Tests for engineConstraintBridge — the integration layer between
 * EngineSimConfig (UI state) and the VB6 constraint system.
 */

import { describe, it, expect } from 'vitest';
import {
  commitConfigField,
  commitCamTypeChange,
  configToConstraintMap,
} from '../engineConstraintBridge';
import type { EngineSimConfig } from '../engineAdapter';

/** Baseline BASECASE config matching VB6 defaults. */
function baseConfig(): EngineSimConfig {
  return {
    numCylinders: 8,
    layout: 'vee',
    bore_in: 4.030,
    stroke_in: 3.480,
    rodLength_in: 5.850,
    compressionRatio: 12.9,
    camshaftType: 'normal_flat_tappet',
    intakeDuration050_deg: 264,
    throttleCFM_at_1_5inHg: 750,
    isEFI: false,
    fuelType: 'gasoline',
    intakeManifoldType: 'plenum',
    runnerStyle: 'curved',
    intakeManifoldFlowFactor_pct: 96.0,
    numIntakeValvesPerCyl: 1,
    intakeValveDia_in: 2.050,
    maxIntakeFlow_cfm: 250.0,
    flowTestPressure_inH2O: 28.0,
    flowTestBoreDia_in: 4.000,
    maxIntakeValveLift_in: 0.550,
  };
}

describe('configToConstraintMap', () => {
  it('seeds constraint map values from config', () => {
    const cfg = baseConfig();
    const map = configToConstraintMap(cfg);

    expect(map.bore.value).toBe(4.03);
    expect(map.stroke.value).toBe(3.48);
    expect(map.rod.value).toBe(5.85);
    expect(map.valveDia.value).toBe(2.05);
    expect(map.maxInFlow.value).toBe(250);
    expect(map.deltaP.value).toBe(28);
    expect(map.carbCFM.value).toBe(750);
    expect(map.refBore.value).toBe(4.0);
    expect(map.valveLift.value).toBe(0.55);
  });
});

describe('commitConfigField', () => {
  it('clamps an absurdly large bore to the max (6.0)', () => {
    const cfg = { ...baseConfig(), bore_in: 99 };
    const result = commitConfigField(cfg, 'bore_in');

    // Bore baseline max is 6.0
    expect(result.config.bore_in).toBeLessThanOrEqual(6.0);
    expect(result.config.bore_in).toBeGreaterThan(0);
  });

  it('clamps a negative bore to the min (1.25)', () => {
    const cfg = { ...baseConfig(), bore_in: -5 };
    const result = commitConfigField(cfg, 'bore_in');

    expect(result.config.bore_in).toBeGreaterThanOrEqual(1.25);
  });

  it('bore change cascades to adjust refBore (bore ±5%)', () => {
    // Set bore to 2.0, but refBore stays at 4.0 — should be clamped to bore*1.05 = 2.1
    const cfg = { ...baseConfig(), bore_in: 2.0, flowTestBoreDia_in: 4.0 };
    const result = commitConfigField(cfg, 'bore_in');

    // refBore max = bore * 1.05 = 2.1
    expect(result.config.flowTestBoreDia_in).toBeLessThanOrEqual(2.0 * 1.05 + 0.01);
    expect(result.adjustedFields.length).toBeGreaterThan(0);
  });

  it('stroke change cascades to adjust rod if needed', () => {
    // Set stroke very small (1.0), rod at 5.85 — rod min = stroke * 1.25 = 1.25
    // But rod max = min(stroke * 3.6, 11.5) = 3.6
    // So rod 5.85 > 3.6 should be clamped
    const cfg = { ...baseConfig(), stroke_in: 1.0, rodLength_in: 5.85 };
    const result = commitConfigField(cfg, 'stroke_in');

    expect(result.config.rodLength_in).toBeLessThanOrEqual(Math.min(1.0 * 3.6, 11.5) + 0.01);
    expect(result.adjustedFields).toContain('rod');
  });

  it('valve dia change cascades to maxInFlow and valveLift', () => {
    // Set valve dia very small — should tighten maxInFlow and valveLift ranges
    const cfg = { ...baseConfig(), intakeValveDia_in: 0.8 };
    const result = commitConfigField(cfg, 'intakeValveDia_in');

    // valveLift max = valveDia * 0.45 = 0.36 — current 0.55 should be clamped
    expect(result.config.maxIntakeValveLift_in).toBeLessThanOrEqual(0.8 * 0.45 + 0.01);
    expect(result.adjustedFields).toContain('valveLift');
  });

  it('returns no user-visible adjustments for a valid in-range value', () => {
    const cfg = baseConfig(); // all defaults are valid
    const result = commitConfigField(cfg, 'bore_in');

    // Internal fields (csArea, seatDia, etc.) are filtered by the bridge
    expect(result.adjustedFields).toHaveLength(0);
    expect(result.adjustedLabels).toHaveLength(0);
    expect(result.config.bore_in).toBe(4.03);
  });

  it('returns unchanged config for non-constrained fields', () => {
    const cfg = baseConfig();
    const result = commitConfigField(cfg, 'compressionRatio');

    expect(result.config).toEqual(cfg);
    expect(result.adjustedFields).toHaveLength(0);
  });
});

describe('commitCamTypeChange', () => {
  it('clamps numIntakeValvesPerCyl when switching to flat tappet (max 1)', () => {
    const cfg = { ...baseConfig(), camshaftType: 'overhead_cam' as const, numIntakeValvesPerCyl: 3 };
    // Switch to normal_flat_tappet — NIV max = 1
    const result = commitCamTypeChange({ ...cfg, camshaftType: 'normal_flat_tappet' });

    expect(result.config.numIntakeValvesPerCyl).toBe(1);
    expect(result.adjustedFields).toContain('noInValves');
  });

  it('allows NIV=2 for roller cam type', () => {
    const cfg = { ...baseConfig(), camshaftType: 'roller' as const, numIntakeValvesPerCyl: 2 };
    const result = commitCamTypeChange(cfg);

    // Roller allows max 2, so NIV=2 should stay
    expect(result.config.numIntakeValvesPerCyl).toBe(2);
  });

  it('allows NIV=3 for overhead cam type', () => {
    const cfg = { ...baseConfig(), camshaftType: 'overhead_cam' as const, numIntakeValvesPerCyl: 3 };
    const result = commitCamTypeChange(cfg);

    // OHC allows max 3, so NIV=3 should stay
    expect(result.config.numIntakeValvesPerCyl).toBe(3);
  });

  it('adjusts valve lift when cam type changes', () => {
    // Set valve lift to 0.95 (very high), then switch to flat tappet
    // valveLift max = valveDia * 0.45 = 2.05 * 0.45 ≈ 0.92
    const cfg = {
      ...baseConfig(),
      camshaftType: 'overhead_cam' as const,
      maxIntakeValveLift_in: 0.95,
    };
    const result = commitCamTypeChange({ ...cfg, camshaftType: 'normal_flat_tappet' });

    // Max for flat tappet = 2.05 * 0.45 ≈ 0.92
    expect(result.config.maxIntakeValveLift_in!).toBeLessThanOrEqual(2.05 * 0.45 + 0.01);
    expect(result.adjustedFields).toContain('valveLift');
  });

  it('returns adjustedLabels with human-readable names', () => {
    const cfg = { ...baseConfig(), camshaftType: 'overhead_cam' as const, numIntakeValvesPerCyl: 3 };
    const result = commitCamTypeChange({ ...cfg, camshaftType: 'normal_flat_tappet' });

    expect(result.adjustedLabels.length).toBeGreaterThan(0);
    // Should contain human-readable labels, not field keys
    result.adjustedLabels.forEach(label => {
      expect(label).not.toMatch(/^[a-z]/); // Labels start with uppercase
    });
  });
});
