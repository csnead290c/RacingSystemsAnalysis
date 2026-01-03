/**
 * Engine Simulation Types
 * 
 * TypeScript types for Engine Pro/Jr VB6 port
 */

export interface EngineInputs {
  // Engine Geometry
  noCyl: number;              // Number of cylinders (1-12)
  inline: number;             // 0=Inline, 1=Vee, 2=Flat/Opposed
  bore: number;               // Bore diameter (inches)
  stroke: number;             // Stroke length (inches)
  rod: number;                // Rod length (inches)
  compressionRatio: number;   // Compression ratio (7-18)
  
  // Camshaft
  camType: number;            // 0=overhead, 1=roller, 2=mushroom, 3=high rate, 4=solid, 5=hyd roller, 6=hydraulic
  inCamDur: number;           // Intake cam duration @ 0.050" (190-330 degrees)
  
  // Intake System
  carb: boolean;              // true=carburetor, false=fuel injection
  carbCFM: number;            // Carburetor/throttle CFM @ 1.5" Hg
  fuel: number;               // 1=gasoline, 2=racing gas, 3=methanol
  manifold: number;           // 1=common plenum, 2=IR, 3=dual plane 100%, 4=dual plane w/slot
  curved: boolean;            // Curved intake runners
  manFlow: number;            // Manifold flow factor (80-103%)
  
  // Valves
  noInValves: number;         // Number of intake valves per cylinder (1-3)
  valveDia: number;           // Intake valve diameter (inches)
  maxInFlow: number;          // Maximum intake port flow (CFM @ test pressure)
  deltaP: number;             // Flowbench test pressure (10-75" H2O)
  refBore: number;            // Flowbench reference bore diameter (inches)
  
  // Compression Ratio Components (optional - for worksheet)
  chamber?: number;           // Combustion chamber volume (cc)
  deck?: number;              // Piston to deck height (inches)
  gasket?: number;            // Head gasket thickness (inches)
  dome?: number;              // Piston dome volume (cc)
}

export interface EngineOutputs {
  // Peak Performance
  peakHP: number;             // Peak horsepower
  peakTQ: number;             // Peak torque (lb-ft)
  rpmPeakHP: number;          // RPM at peak HP
  rpmPeakTQ: number;          // RPM at peak TQ
  
  // Specific Output
  hpPerCID: number;           // HP per cubic inch
  tqPerCID: number;           // Torque per cubic inch
  
  // Operating Range
  shift: number;              // Recommended shift RPM
  redline: number;            // Recommended redline RPM
  
  // Recommendations (Engine Pro only)
  lobeSepAng?: number;        // Recommended lobe separation angle
  inLobeCL?: number;          // Recommended intake lobe centerline
  
  // Detailed calculations
  cid: number;                // Cubic inch displacement
  
  // Intermediate values from engine simulation (needed for recommendations)
  calculatedValues?: {
    hpcfm: number;      // CFM at peak HP
    tqcfm: number;      // CFM at peak TQ
    hpfps: number;      // Piston speed at peak HP (ft/sec)
    tqfps: number;      // Piston speed at peak TQ (ft/sec)
    RamVEHP: number;    // Ram volumetric efficiency at HP
    EffCR: number;      // Effective compression ratio
    acrit: number;      // Critical area ratio
    flrqs: number;      // Rod ratio factor
  };
  
  // Engine Pro recommendations
  recommendations?: EngineRecommendations;
}

export interface EngineRecommendations {
  // Intake
  inMaxValveLift: number;     // Recommended max intake valve lift
  inMinFlowArea: number;      // Minimum intake cross-section area
  inTrackLen: number;         // Intake track tuned length
  inMaxFlowArea: number;      // Maximum intake cross-section area
  inTrackVol: number;         // Intake track volume (cc)
  plenVol: number;            // Plenum volume (cubic inches)
  
  // Exhaust
  exCamDur: number;           // Recommended exhaust cam duration
  exValveDia: number;         // Recommended exhaust valve diameter
  exMaxValveLift: number;     // Recommended max exhaust valve lift
  exMinFlowArea: number;      // Minimum exhaust cross-section area
  exMaxFlowArea: number;      // Maximum exhaust cross-section area
  exRecFlow: number;          // Recommended exhaust port flow
  
  // Exhaust System
  priTubeLen: number;         // Primary tube length
  priTubeDia: number;         // Primary tube diameter
  collectDia: number;         // Collector diameter
}

export interface EngineConstants {
  PI: number;
  PSIA: number;               // Standard atmospheric pressure (psi)
  PSTD: number;               // Standard pressure (psf)
  RSTD: number;               // Gas constant
  Z6: number;                 // Conversion constant
  RHOair: number;             // Air density (lb/ft³)
  KRPM: number;               // RPM conversion constant
  GC: number;                 // Gravitational constant
  ZM: number;                 // Millimeter conversion (25.4)
  ZM2: number;                // ZM squared
  ZM3: number;                // Cubic conversion (2.54³)
}

export interface FuelProperties {
  GAM: number;                // Gamma (specific heat ratio)
  aqf: number;                // Air/fuel ratio
  fhv: number;                // Fuel heating value (BTU/lb)
  crx: number;                // Compression ratio factor
}

export interface CamTypeFactors {
  // Correlation factors for different cam types
  // [camType][correlation]: 1=RPMTQ, 2=GTQCID, 3=NTQCID, 4=RPMHP, 5=GTQHP, 6=NTQHP
  [key: number]: number[];
}
