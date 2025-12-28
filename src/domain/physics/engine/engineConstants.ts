/**
 * Engine Simulation Constants
 * 
 * All constants from VB6 DECLARES.BAS and ENGPERF.BAS
 */

import type { EngineConstants, FuelProperties, CamTypeFactors } from './engineTypes';

// Global math constants (from DECLARES.BAS)
export const CONSTANTS: EngineConstants = {
  PI: 3.141593,
  PSIA: 14.696,                 // Standard atmospheric pressure (psi)
  PSTD: 406.78,                 // Standard pressure (psf)
  RSTD: 53.345,                 // Gas constant (Patrick note: should be 53.3478)
  Z6: (60 / (2 * 3.141593)) * 550,  // = 5252.113
  RHOair: 0.07634,              // Air density (Patrick note: should be 0.07633)
  KRPM: (144 / 3.141593) * 60 * 12,  // = 32918.98
  GC: 32.174,                   // Gravitational constant
  ZM: 25.4,                     // Millimeter conversion
  ZM2: 25.4 * 25.4,             // = 645.16
  ZM3: 2.54 * 2.54 * 2.54,      // = 16.387064
};

// Fuel properties (from ENGPERF.BAS lines 73-80)
export const FUEL_PROPERTIES: { [key: number]: FuelProperties } = {
  1: {  // Gasoline
    GAM: 1.28,
    aqf: 14.7,
    fhv: 20700,
    crx: 11.5,
  },
  2: {  // Racing gasoline (Rick Gold @ ERC - 01/26/00)
    GAM: 1.28,
    aqf: 14.1,
    fhv: 20200,
    crx: 11.5,
  },
  3: {  // Methanol
    GAM: 1.28,
    aqf: 6.4,
    fhv: 9700,
    crx: 13.5,
  },
};

// Cam type correlation factors (from ENGPERF.BAS lines 479-503)
// camk[camType][correlation]
// Correlations: 1=RPMTQ, 2=GTQCID, 3=NTQCID, 4=RPMHP, 5=GTQHP, 6=NTQHP
export const CAM_FACTORS: CamTypeFactors = {
  0: [0, 1.028, 1.037, 1.019, 1.075, 1.043, 1.019],  // Overhead Cam
  1: [0, 1.000, 1.000, 1.000, 1.000, 1.000, 1.000],  // Roller Cam & Lifter
  2: [0, 0.996, 0.992, 0.995, 0.999, 0.975, 0.972],  // Mushroom Tappet
  3: [0, 0.995, 0.990, 0.993, 0.998, 0.969, 0.965],  // High Rate-of-Lift Flat Tappet
  4: [0, 0.992, 0.985, 0.990, 0.998, 0.951, 0.946],  // Normal Flat Tappet & Solid Lifter
  5: [0, 0.948, 0.951, 0.966, 0.978, 0.927, 0.937],  // Hydraulic Roller Cam & Lifter
  6: [0, 0.920, 0.934, 0.930, 0.956, 0.905, 0.930],  // Normal Hydraulic Cam & Lifter
};

// Gulp factors for different manifold types and cylinder counts
// (from ENGPERF.BAS lines 532-581)
export function calcGulp(manifold: number, noCyl: number): number {
  switch (manifold) {
    case 1: // Common plenum manifold
      switch (noCyl) {
        case 1: return 2.5;
        case 2: return 1.721;
        case 3: return 1.384;
        case 4: return 1.186;
        case 5: return 1.052;
        case 6: return 1.009;
        default: return 1.0;  // 7-12 cylinders
      }
    
    case 2: // Individual runner
      return 2.5;
    
    case 3: // Dual plane/100% divided plenum
      switch (noCyl) {
        case 1: return 2.5;
        case 2: return 2.5;
        case 3: return 2.008;
        case 4: return 1.721;
        case 5: return 1.526;
        case 6: return 1.384;
        case 7: return 1.274;
        case 8: return 1.186;
        case 9: return 1.113;
        case 10: return 1.052;
        case 11: return 1.028;
        default: return 1.009;  // 12+ cylinders
      }
    
    case 4: // Dual plane w/small slot
      switch (noCyl) {
        case 1: return 2.5;
        case 2: return 2.008;
        case 3: return 1.721;
        case 4: return 1.526;
        case 5: return 1.384;
        case 6: return 1.274;
        case 7: return 1.186;
        case 8: return 1.113;
        case 9: return 1.052;
        case 10: return 1.028;
        default: return 1.009;  // 11+ cylinders
      }
    
    default:
      return 1.0;
  }
}

// Valve seat and stem constants
export const VSW = 0.915;     // Valve seat width factor
export const VSTM = 0.022;    // Valve stem factor

// Flowbench constants
export const VSW_MAXFLOW = 0.925;   // For max flow calculations
export const VSTM_MAXFLOW = 0.022;  // For max flow calculations
