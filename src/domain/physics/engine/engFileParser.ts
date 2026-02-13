/**
 * .ENG File Parser
 *
 * Parses VB6 Engine Pro/Jr .ENG files (versions 2 and 3/3.0.1/3.1).
 *
 * VB6 uses `Print #` to write (tab-separated) and `Input #` to read
 * (comma-separated). Both formats appear in the wild. We handle both
 * by splitting on commas, tabs, or whitespace runs.
 *
 * VB6 source: ECommon/ENGINE.FRM lines 2100-2340
 */

import type { EngineInputs } from './engineTypes';
import type { EngineSimConfig } from './engineAdapter';

export interface EngFileData {
  version: string;
  description: string;
  inputs: EngineInputs;
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Split a VB6 data line on commas, tabs, or whitespace runs. */
function splitValues(line: string): number[] {
  return line
    .split(/[,\t]+|\s{2,}/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseFloat(s));
}

/** VB6 booleans: -1 = True, 0 = False */
function vb6Bool(v: number): boolean {
  return v === -1 || v === 1;
}

// ── Main parser ─────────────────────────────────────────────────────

/**
 * Parse a VB6 .ENG file into raw EngineInputs.
 *
 * Supports:
 *  - Version "3.1" (current Engine Pro/Jr save format)
 *  - Version "3.0.1"
 *  - Version "3" / "3.0"
 *  - Version "2" (legacy DOS-era format, different field order)
 */
export function parseEngFile(content: string): EngFileData {
  const lines = content.split(/\r?\n/).map(l => l.trim());

  if (lines.length < 5) {
    throw new Error('Invalid .ENG file: too few lines.');
  }

  // Line 0: Version (quoted string, e.g. `" 2 "` or `"3.1"` or `3.1`)
  const ver = lines[0].replace(/"/g, '').trim();

  // Line 1: Description (quoted string)
  const description = lines[1].replace(/"/g, '').trim();

  if (ver === '3' || ver === '3.0' || ver === '3.0.1' || ver === '3.1') {
    return parseV3(ver, description, lines);
  }

  // Fallback: version 2 (legacy)
  return parseV2(ver, description, lines);
}

// ── Version 3 / 3.0.1 / 3.1 ────────────────────────────────────────
// VB6 save order (Print #):
//   Line 2: inline, noCyl, bore, stroke, rod, CR
//   Line 3: camType, inCamDur, carb(-1/0), carbCFM, fuel
//   Line 4: manifold, curved(-1/0), manFlow
//   Line 5: noInValves, valveDia, maxInFlow, deltaP, refBore
//   Line 6: valveLift, csArea
//   Line 7: chamber, deck, gasket, dome
//   Line 8: noTB, tbDia, tvDia, tbType
//   (3.0.1+) Line 9: noTBS, tbDiaS, tvDiaS
//   (3.1)    Line 10: seatDia, stemDia, vsAngle, vsWidth
//   (else)   Line 10: seatDia, stemDia
//   ...remaining lines: constraint/flow data (ignored for config)

function parseV3(ver: string, description: string, lines: string[]): EngFileData {
  const v2 = splitValues(lines[2]); // inline, noCyl, bore, stroke, rod, CR
  const v3 = splitValues(lines[3]); // camType, inCamDur, carb, carbCFM, fuel
  const v4 = splitValues(lines[4]); // manifold, curved, manFlow
  const v5 = splitValues(lines[5]); // noInValves, valveDia, maxInFlow, deltaP, refBore
  // Line 6: valveLift, csArea (not needed for EngineInputs)
  const v7 = splitValues(lines[7]); // chamber, deck, gasket, dome

  const inline = v2[0] ?? 1;
  const noCyl = v2[1] ?? 8;
  const bore = v2[2] ?? 4.03;
  const stroke = v2[3] ?? 3.48;
  const rod = v2[4] ?? 5.85;
  const compressionRatio = v2[5] ?? 12.9;

  const camType = v3[0] ?? 4;
  const inCamDur = v3[1] ?? 264;
  const carb = vb6Bool(v3[2] ?? -1);
  const carbCFM = v3[3] ?? 750;
  const fuel = v3[4] ?? 1;

  const manifold = v4[0] ?? 1;
  const curved = vb6Bool(v4[1] ?? 0);
  const manFlow = v4[2] ?? 96;

  const noInValves = v5[0] ?? 1;
  const valveDia = v5[1] ?? 2.05;
  const maxInFlow = v5[2] ?? 250;
  const deltaP = v5[3] ?? 28;
  const refBore = v5[4] ?? bore;

  const chamber = v7[0];
  const deck = v7[1];
  const gasket = v7[2];
  const dome = v7[3];

  const inputs: EngineInputs = {
    noCyl, inline, bore, stroke, rod, compressionRatio,
    camType, inCamDur, carb, carbCFM, fuel,
    manifold, curved, manFlow,
    noInValves, valveDia, maxInFlow, deltaP, refBore,
    chamber, deck, gasket, dome,
  };

  return { version: ver, description, inputs };
}

// ── Version 2 (legacy DOS format) ───────────────────────────────────
// VB6 read order (Input #):
//   Line 2: noCyl, bore, stroke, rod, CR, carb, manifold
//   Line 3: noInValves, maxInFlow, deltaP, refBore, manFlow, camType, inCamDur
//   Line 4: valveDia, valveLift, csArea, ?, ?
//   Line 5: deck, gasket, dome, chamber
//   Line 6: noTB, tbDia, tvDia, tbType, carbCFM
//   Line 7: seatDia, stemDia, carbCFM(dup)

function parseV2(ver: string, description: string, lines: string[]): EngFileData {
  const v2 = splitValues(lines[2]); // noCyl, bore, stroke, rod, CR, carbCFM, 0
  const v3 = splitValues(lines[3]); // fuel, maxInFlow, deltaP, refBore, manFlow, manifold, inCamDur
  const v4 = splitValues(lines[4]); // valveDia, valveLift, csArea, ?, ?
  const v5 = splitValues(lines[5]); // deck, gasket, dome, chamber
  const v6 = splitValues(lines[6]); // camType, ?, ?, curved(0=curved), ?

  const noCyl = v2[0] ?? 8;
  const bore = v2[1] ?? 4.03;
  const stroke = v2[2] ?? 3.48;
  const rod = v2[3] ?? 5.85;
  const compressionRatio = v2[4] ?? 12.9;
  const carbCFM = v2[5] ?? 750;

  const fuel = v3[0] ?? 1;
  const maxInFlow = v3[1] ?? 250;
  const deltaP = v3[2] ?? 28;
  const refBore = v3[3] ?? bore;
  const manFlow = v3[4] ?? 96;
  const manifold = v3[5] ?? 1;
  const inCamDur = v3[6] ?? 264;

  const valveDia = v4[0] ?? 2.05;

  const deck = v5[0];
  const gasket = v5[1];
  const dome = v5[2];
  const chamber = v5[3];

  const camType = v6[0] ?? 4;
  // VB6 v2: curved=0 means curved=True (inverted in old format)
  const curved = (v6[3] ?? 0) === 0;

  // V2 doesn't store inline — infer from cylinder count
  let inline: number;
  if ([6, 8, 10, 12].includes(noCyl)) {
    inline = 1; // Vee
  } else {
    inline = 0; // Inline
  }

  const inputs: EngineInputs = {
    noCyl, inline, bore, stroke, rod, compressionRatio,
    camType, inCamDur,
    carb: true, // V2 always carburetor
    carbCFM, fuel: fuel || 1,
    manifold, curved, manFlow,
    noInValves: 1, // V2 doesn't store this
    valveDia, maxInFlow, deltaP, refBore,
    chamber, deck, gasket, dome,
  };

  return { version: ver, description, inputs };
}

// ── EngineInputs → EngineSimConfig adapter ──────────────────────────

/** Reverse maps for EngineInputs numeric codes → EngineSimConfig string enums */
const LAYOUT_REVERSE: Record<number, EngineSimConfig['layout']> = {
  0: 'inline', 1: 'vee', 2: 'flat',
};
const CAM_TYPE_REVERSE: Record<number, EngineSimConfig['camshaftType']> = {
  0: 'overhead_cam', 1: 'roller', 2: 'mushroom_tappet',
  3: 'high_rate_flat_tappet', 4: 'normal_flat_tappet',
  5: 'hydraulic_roller', 6: 'hydraulic_flat_tappet',
};
const FUEL_REVERSE: Record<number, EngineSimConfig['fuelType']> = {
  1: 'gasoline', 2: 'racing_gasoline', 3: 'methanol',
};
const MANIFOLD_REVERSE: Record<number, EngineSimConfig['intakeManifoldType']> = {
  1: 'plenum', 2: 'individual_runner', 3: 'dual_plane_divided', 4: 'dual_plane_slot',
};

/**
 * Parse a legacy .ENG file and convert directly to EngineSimConfig.
 * This is the main entry point for the "Import Legacy .eng" workflow.
 */
export function parseLegacyEngToConfig(content: string): {
  config: EngineSimConfig;
  description: string;
} {
  const { description, inputs } = parseEngFile(content);

  const config: EngineSimConfig = {
    numCylinders: inputs.noCyl,
    layout: LAYOUT_REVERSE[inputs.inline] ?? 'vee',
    bore_in: inputs.bore,
    stroke_in: inputs.stroke,
    rodLength_in: inputs.rod,
    compressionRatio: inputs.compressionRatio,
    camshaftType: CAM_TYPE_REVERSE[inputs.camType] ?? 'normal_flat_tappet',
    intakeDuration050_deg: inputs.inCamDur,
    throttleCFM_at_1_5inHg: inputs.carbCFM,
    isEFI: !inputs.carb,
    fuelType: FUEL_REVERSE[inputs.fuel] ?? 'gasoline',
    intakeManifoldType: MANIFOLD_REVERSE[inputs.manifold] ?? 'plenum',
    runnerStyle: inputs.curved ? 'curved' : 'straight',
    intakeManifoldFlowFactor_pct: inputs.manFlow,
    numIntakeValvesPerCyl: inputs.noInValves,
    intakeValveDia_in: inputs.valveDia,
    maxIntakeFlow_cfm: inputs.maxInFlow,
    flowTestPressure_inH2O: inputs.deltaP,
    flowTestBoreDia_in: inputs.refBore,
    combustionChamberVolume_cc: inputs.chamber,
    pistonToDeckHeight_in: inputs.deck,
    headGasketThickness_in: inputs.gasket,
    pistonDomeVolume_cc: inputs.dome,
  };

  return { config, description };
}
