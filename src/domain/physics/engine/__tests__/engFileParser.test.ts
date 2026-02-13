import { describe, it, expect } from 'vitest';
import { parseEngFile, parseLegacyEngToConfig } from '../engFileParser';

// ── Fixtures ────────────────────────────────────────────────────────

/** Actual BASECASE.ENG from EPro3w (version "2" format, tab/space separated) */
const BASECASE_V2 = `" 2 "
"base case for ENGINE Pro"
 8  4.03  3.48  5.85  12.9  750  0 
 1  250  28  4  96  3  264 
 2.05  .55  2.4  250  79.48335 
 .015  .039  12  62 
 4  1.688  1.375  0  730 
 1.794  .344  2.434 
`;

/** Synthetic v3.1 file matching VB6 Print # output format (tab-separated) */
const SAMPLE_V31 = `3.1
My Custom Engine
1\t8\t4.03\t3.48\t5.85\t12.9
4\t264\t-1\t750\t1
1\t-1\t96
1\t2.05\t250\t28\t4
0.55\t2.4
62\t0.015\t0.039\t12
4\t1.688\t1.375\t0
0\t0\t0
1.794\t0.344\t45\t0.08
0\t0
0\t0\t0
0\t0\t0\t0
0\t0\t0
`;

// ── parseEngFile tests ──────────────────────────────────────────────

describe('parseEngFile', () => {
  describe('version 2 (BASECASE.ENG)', () => {
    it('parses version and description', () => {
      const result = parseEngFile(BASECASE_V2);
      expect(result.version).toBe('2');
      expect(result.description).toBe('base case for ENGINE Pro');
    });

    it('parses core geometry from BASECASE', () => {
      const { inputs } = parseEngFile(BASECASE_V2);
      expect(inputs.noCyl).toBe(8);
      expect(inputs.bore).toBe(4.03);
      expect(inputs.stroke).toBe(3.48);
      expect(inputs.rod).toBe(5.85);
      expect(inputs.compressionRatio).toBe(12.9);
    });

    it('parses carbCFM from line 3 position 5', () => {
      const { inputs } = parseEngFile(BASECASE_V2);
      expect(inputs.carbCFM).toBe(750);
    });

    it('parses fuel, flow, and cam data', () => {
      const { inputs } = parseEngFile(BASECASE_V2);
      expect(inputs.fuel).toBe(1);
      expect(inputs.maxInFlow).toBe(250);
      expect(inputs.deltaP).toBe(28);
      expect(inputs.refBore).toBe(4);
      expect(inputs.manFlow).toBe(96);
      expect(inputs.inCamDur).toBe(264);
    });

    it('parses valve diameter', () => {
      const { inputs } = parseEngFile(BASECASE_V2);
      expect(inputs.valveDia).toBe(2.05);
    });

    it('parses CR worksheet values', () => {
      const { inputs } = parseEngFile(BASECASE_V2);
      expect(inputs.deck).toBe(0.015);
      expect(inputs.gasket).toBe(0.039);
      expect(inputs.dome).toBe(12);
      expect(inputs.chamber).toBe(62);
    });

    it('parses camType and curved flag', () => {
      const { inputs } = parseEngFile(BASECASE_V2);
      expect(inputs.camType).toBe(4);
      // V2: curved=0 means curved=True
      expect(inputs.curved).toBe(true);
    });

    it('infers Vee layout for 8 cylinders', () => {
      const { inputs } = parseEngFile(BASECASE_V2);
      expect(inputs.inline).toBe(1); // Vee
    });

    it('sets carb=true for V2 files', () => {
      const { inputs } = parseEngFile(BASECASE_V2);
      expect(inputs.carb).toBe(true);
    });
  });

  describe('version 3.1', () => {
    it('parses version and description', () => {
      const result = parseEngFile(SAMPLE_V31);
      expect(result.version).toBe('3.1');
      expect(result.description).toBe('My Custom Engine');
    });

    it('parses core geometry', () => {
      const { inputs } = parseEngFile(SAMPLE_V31);
      expect(inputs.inline).toBe(1);
      expect(inputs.noCyl).toBe(8);
      expect(inputs.bore).toBe(4.03);
      expect(inputs.stroke).toBe(3.48);
      expect(inputs.rod).toBe(5.85);
      expect(inputs.compressionRatio).toBe(12.9);
    });

    it('parses cam and fuel data', () => {
      const { inputs } = parseEngFile(SAMPLE_V31);
      expect(inputs.camType).toBe(4);
      expect(inputs.inCamDur).toBe(264);
      expect(inputs.carb).toBe(true);
      expect(inputs.carbCFM).toBe(750);
      expect(inputs.fuel).toBe(1);
    });

    it('parses manifold data', () => {
      const { inputs } = parseEngFile(SAMPLE_V31);
      expect(inputs.manifold).toBe(1);
      expect(inputs.curved).toBe(true); // -1 = true
      expect(inputs.manFlow).toBe(96);
    });

    it('parses valve and flow data', () => {
      const { inputs } = parseEngFile(SAMPLE_V31);
      expect(inputs.noInValves).toBe(1);
      expect(inputs.valveDia).toBe(2.05);
      expect(inputs.maxInFlow).toBe(250);
      expect(inputs.deltaP).toBe(28);
      expect(inputs.refBore).toBe(4);
    });

    it('parses CR worksheet values', () => {
      const { inputs } = parseEngFile(SAMPLE_V31);
      expect(inputs.chamber).toBe(62);
      expect(inputs.deck).toBe(0.015);
      expect(inputs.gasket).toBe(0.039);
      expect(inputs.dome).toBe(12);
    });
  });

  describe('error handling', () => {
    it('throws for files with too few lines', () => {
      expect(() => parseEngFile('1\n2\n')).toThrow('too few lines');
    });
  });
});

// ── parseLegacyEngToConfig tests ────────────────────────────────────

describe('parseLegacyEngToConfig', () => {
  it('converts BASECASE.ENG to EngineSimConfig with correct values', () => {
    const { config, description } = parseLegacyEngToConfig(BASECASE_V2);

    expect(description).toBe('base case for ENGINE Pro');
    expect(config.numCylinders).toBe(8);
    expect(config.layout).toBe('vee');
    expect(config.bore_in).toBe(4.03);
    expect(config.stroke_in).toBe(3.48);
    expect(config.rodLength_in).toBe(5.85);
    expect(config.compressionRatio).toBe(12.9);
    expect(config.camshaftType).toBe('normal_flat_tappet');
    expect(config.intakeDuration050_deg).toBe(264);
    expect(config.throttleCFM_at_1_5inHg).toBe(750);
    expect(config.isEFI).toBe(false);
    expect(config.fuelType).toBe('gasoline');
    expect(config.runnerStyle).toBe('curved');
    expect(config.intakeManifoldFlowFactor_pct).toBe(96);
    expect(config.intakeValveDia_in).toBe(2.05);
    expect(config.maxIntakeFlow_cfm).toBe(250);
    expect(config.flowTestPressure_inH2O).toBe(28);
    expect(config.flowTestBoreDia_in).toBe(4);
  });

  it('converts v3.1 file to EngineSimConfig', () => {
    const { config } = parseLegacyEngToConfig(SAMPLE_V31);

    expect(config.numCylinders).toBe(8);
    expect(config.layout).toBe('vee');
    expect(config.bore_in).toBe(4.03);
    expect(config.compressionRatio).toBe(12.9);
    expect(config.combustionChamberVolume_cc).toBe(62);
    expect(config.pistonToDeckHeight_in).toBe(0.015);
    expect(config.headGasketThickness_in).toBe(0.039);
    expect(config.pistonDomeVolume_cc).toBe(12);
  });
});
