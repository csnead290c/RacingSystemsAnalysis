/**
 * .ENG File Parser
 * 
 * Parses VB6 Engine Pro/Jr .ENG files
 */

import type { EngineInputs } from './engineTypes';

export interface EngFileData {
  version: number;
  description: string;
  inputs: EngineInputs;
}

/**
 * Parse a VB6 .ENG file
 * 
 * Format (9 lines):
 * Line 1: Version (e.g., " 2 ")
 * Line 2: Description
 * Line 3: NoCyl, Bore, Stroke, Rod, CR, Deck, Gasket
 * Line 4: Fuel, CarbCFM, RefBore, ValveDia, ManFlow, Manifold, MaxInFlow
 * Line 5: Cam duration, lift, LSA, IVC, overlap
 * Line 6: Deck, Gasket, calculated values
 * Line 7: NoInValves, InValveDia, ExValveDia, Curved, ExFlow
 * Line 8: Additional parameters
 * Line 9: Empty
 */
export function parseEngFile(content: string): EngFileData {
  const lines = content.split('\n').map(line => line.trim());
  
  // Line 1: Version
  const version = parseInt(lines[0].replace(/"/g, '').trim());
  
  // Line 2: Description
  const description = lines[1].replace(/"/g, '');
  
  // Line 3: NoCyl, Bore, Stroke, Rod, CR, Deck, Gasket
  const line3 = lines[2].split(/\s+/).map(parseFloat);
  const noCyl = line3[0];
  const bore = line3[1];
  const stroke = line3[2];
  const rod = line3[3];
  const compressionRatio = line3[4];
  const deck = line3[5];
  const gasket = line3[6];
  
  // Line 4: Fuel, CarbCFM, RefBore, ValveDia, ManFlow, Manifold, MaxInFlow
  const line4 = lines[3].split(/\s+/).map(parseFloat);
  const fuel = line4[0];
  const carbCFM = line4[1];
  const refBore = line4[2];
  const valveDia = line4[3];
  const manFlow = line4[4];
  const manifold = line4[5];
  const maxInFlow = line4[6];
  
  // Line 5: Cam duration, lift, LSA, IVC, overlap (we only need duration)
  const line5 = lines[4].split(/\s+/).map(parseFloat);
  const inCamDur = line5[0];
  
  // Line 6: Deck, Gasket, calculated values (duplicates, skip)
  // Line 7: NoInValves, InValveDia, ExValveDia, Curved, ExFlow
  const line7 = lines[6].split(/\s+/).map(parseFloat);
  const noInValves = line7[0];
  const curved = line7[3] === 1;
  
  // Line 8: Additional parameters (chamber, dome, etc.) - calculated values, skip
  
  // Determine inline type and cam type from context
  // For now, assume defaults from BASECASE.ENG
  const inline = 1;  // V-engine (most common)
  const camType = 4;  // Normal Flat Tappet & Solid Lifter (from BASECASE)
  const carb = true;  // Carburetor (from BASECASE)
  const deltaP = 28;  // Standard flowbench pressure
  
  const inputs: EngineInputs = {
    noCyl,
    inline,
    bore,
    stroke,
    rod,
    compressionRatio,
    camType,
    inCamDur,
    carb,
    carbCFM,
    fuel,
    manifold,
    curved,
    manFlow,
    noInValves,
    valveDia,
    maxInFlow,
    deltaP,
    refBore,
    deck,
    gasket,
  };
  
  return {
    version,
    description,
    inputs,
  };
}
