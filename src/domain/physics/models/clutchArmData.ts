/**
 * Clutch Arm Data Database
 * Complete port of VB6 LoadArmData subroutine
 * 
 * AData array mapping:
 *   1 = weight of arm (negative = fixed pivot option)
 *   2 = fixed diameter of arm (plate or pivot - based on #1)
 *   3 = radius from the plate to pivot
 *   4 = radius from the plate to weight
 *   5 = radius from the plate to arm cg
 *   6 = reference ring height for pivot angle (or pack clearance for "glide")
 *   7 = reference arm depth for pivot angle (or return spring force in lbs for bikes)
 *   8 = reference arm depth checking diameter (return spring location diameter)
 *   9 = orientation angle from plate to pivot
 *   10= delta angle from the pivot to weight
 *   11= delta angle from the pivot to arm cg
 *   12= nominal disk outer diameter
 */

import type { ClutchArmData } from './clutchVb6';

/** Manufacturer group information */
export interface ManufacturerGroup {
  name: string;
  armCount: number;
  startIndex: number;
}

/** Create arm data entry from VB6 AData values */
function createArmData(
  id: number,
  name: string,
  description: string,
  data: [number, number, number, number, number, number, number, number, number, number, number, number]
): ClutchArmData {
  return {
    id,
    name,
    description,
    armWeight: data[0],
    plateDiameter: data[1],
    pivotRadius: data[2],
    weightRadius: data[3],
    armCGRadius: data[4],
    refRingHeight: data[5],
    refArmDepth: data[6],
    armDepthDiameter: data[7],
    refAngle: data[8],
    weightAngle: data[9],
    armCGAngle: data[10],
    nominalDiskOD: data[11],
  };
}

// ============================================================================
// COMPLETE ARM DATA DATABASE
// ============================================================================

export const armData: (ClutchArmData | null)[] = [
  // Index 0: None/Empty
  createArmData(0, '   .0', '', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),

  // ACE Manufacturing: 7.0, 7.6 & 8.0 inch
  createArmData(1, 'ACE.1', 'ACE.1 = w/std over the hat 38 gram arm',
    [-37.9, 6.172, 0.505, 0.984, 0.82, 0.85, 0, 0, -6.65, 69.76, 36.8, 7]),
  createArmData(2, 'ACE.2', 'ACE.2 = w/less aggressive 30 gram arm',
    [-29.6, 6.172, 0.505, 0.975, 0.9, 0.85, 0, 0, -6.65, 58.8, 28.7, 7]),
  createArmData(3, 'ACE.3', 'ACE.3 = w/shaved 33 gram arm (estimate)',
    [-33.5, 6.172, 0.505, 0.984, 0.88, 0.85, 0, 0, -6.65, 69.76, 31.5, 7]),
  createArmData(4, 'ACE.4', 'ACE.4 = w/thin (.125") over the hat 27 gram arm',
    [-26.7, 6.172, 0.505, 0.984, 0.82, 0.85, 0, 0, -6.65, 69.76, 36.8, 7]),

  // ACE Manufacturing: 6.25 inch
  createArmData(5, 'ACE.5', 'ACE.5 = w/std over the hat 25 gram arm',
    [-25.3, 4.91, 0.4, 0.86, 0.676, 0.85, 0, 0, 5.31, 66.54, 47.1, 6.25]),

  // Applied Friction Technology: 9 inch
  createArmData(6, 'AFT.1', 'AFT.1 = w/std under the hat 70 gram arm',
    [70, 7.875, 0.552, 1.021, 0.35, 1.655, 0.66, 3.855, 0, 131.28, 18, 9]),

  // Applied Friction Technology: 10 & 11 inch
  createArmData(7, 'AFT.2', 'AFT.2 = 10" w/std under the hat 72 gram arm',
    [72, 8.875, 0.552, 1.021, 0.45, 1.655, 0.66, 4.855, 0, 131.28, 14, 10]),
  createArmData(8, 'AFT.3', 'AFT.3 = 10" w/under the hat 101 gram arm',
    [101, 8.875, 0.552, 1.021, 0.55, 1.655, 0.66, 4.855, 0, 131.28, 14, 10]),
  createArmData(9, 'AFT.4', 'AFT.4 = 10.5" w/std under the hat 79 gram arm',
    [79, 9.52, 0.552, 1.021, 0.55, 1.655, 0.66, 5.5, 0, 131.28, 11, 10.5]),
  createArmData(10, 'AFT.5', 'AFT.5 = 11" w/std under the hat 79 gram arm',
    [79, 9.875, 0.552, 1.021, 0.55, 1.655, 0.66, 5.855, 0, 131.28, 11, 11]),

  // Boninfante Clutches
  createArmData(11, 'BNF.1', 'BNF.1 = 6.6" w/std over the hat 26 gram arm',
    [-26.2, 4.78, 0.41, 0.94, 0.68, 0.69, 0, 0, 0, 68.91, 41, 6.6]),
  createArmData(12, 'BNF.2', 'BNF.2 = 8" w/std arm (estimate)',
    [-37.9, 6.172, 0.505, 0.984, 0.82, 0.93, 0, 0, -6.65, 69.76, 36.8, 8]),
  createArmData(13, 'BNF.3', 'BNF.3 = 10" w/std arm (estimate)',
    [-59, 7.88, 0.622, 0.948, 1.215, 0.702, 0, 0, 0, 54.49, 16, 10]),

  // Crower Clutches: 9 inch
  createArmData(14, 'CRW.4', 'CRW.4 = w/std over the hat 42 gram arm',
    [-41.5, 6.88, 0.673, 1.066, 1.135, 0.702, 0, 0, 0, 45.8, 16, 9]),
  createArmData(15, 'CRW.5', 'CRW.5 = w/over the hat 46 gram arm',
    [-45.6, 6.88, 0.673, 1.066, 1.1, 0.702, 0, 0, 0, 45.8, 13.5, 9]),

  // Crower Clutches: 10.0 & 10.7 inch
  createArmData(16, 'CRW.1', 'CRW.1 = 10" w/std over the hat 59 gram arm',
    [-59, 7.88, 0.622, 0.948, 1.215, 0.702, 0, 0, 0, 54.49, 16, 10]),
  createArmData(17, 'CRW.2', 'CRW.2 = 10" w/over the hat 53 gram arm',
    [-52.6, 7.88, 0.623, 1.048, 1.205, 0.702, 0, 0, 0, 45.37, 11.5, 10]),
  createArmData(18, 'CRW.3', 'CRW.3 = 10.7" w/over the hat 76 gram arm',
    [-75.4, 7.88, 0.627, 1.014, 1.155, 0.702, 0, 0, 6.74, 52.54, 16, 10.7]),

  // Crowerglide Clutches: 10 & 11 inch
  createArmData(19, 'CGL.1', 'CGL.1 = 86 gram arm with .125" nose radius',
    [-86, 8.125, 0.5645, 1.1605, 1.401, 0.04, 0, 0, 19.4, 36.91, -0.22, 10]),
  createArmData(20, 'CGL.2', 'CGL.2 = 86 gram arm with .156" nose radius',
    [-85.9, 8.125, 0.5255, 1.1175, 1.362, 0.04, 0, 0, 17.33, 39.43, 1.04, 10]),
  createArmData(21, 'CGL.3', 'CGL.3 = 86 gram arm with .187" nose radius',
    [-85.8, 8.125, 0.487, 1.075, 1.323, 0.04, 0, 0, 14.94, 42.25, 2.59, 10]),
  createArmData(22, 'CGL.4', 'CGL.4 = 86 gram arm with .218" nose radius',
    [-85.7, 8.125, 0.4495, 1.032, 1.284, 0.04, 0, 0, 12.13, 45.59, 4.49, 10]),
  createArmData(23, 'CGL.5', 'CGL.5 = 103 gram arm with .125" nose radius',
    [-103.5, 8.125, 0.5645, 1.1605, 1.401, 0.04, 0, 0, 19.4, 36.91, -0.22, 10]),
  createArmData(24, 'CGL.6', 'CGL.6 = 103 gram arm with .156" nose radius',
    [-103.4, 8.125, 0.5255, 1.1175, 1.362, 0.04, 0, 0, 17.33, 39.43, 1.04, 10]),
  createArmData(25, 'CGL.7', 'CGL.7 = 103 gram arm with .187" nose radius',
    [-103.3, 8.125, 0.487, 1.075, 1.323, 0.04, 0, 0, 14.94, 42.25, 2.59, 10]),
  createArmData(26, 'CGL.8', 'CGL.8 = 103 gram arm with .218" nose radius',
    [-103.2, 8.125, 0.4495, 1.032, 1.284, 0.04, 0, 0, 12.13, 45.59, 4.49, 10]),

  // East West Engineering: 7.0 & 7.5 inch
  createArmData(27, 'E&W.6', 'E&W.6 = w/std 35 gram arm (estimate)',
    [35, 6.97, 0.4, 0.957, 0.72, 0.935, 0, 0, -4.74, 75.54, 41, 7.5]),

  // East West Engineering: 8 & 9 inch
  createArmData(28, 'E&W.1', 'E&W.1 = w/std over the hat 36 gram arm',
    [36.1, 7.188, 0.509, 0.99, 0.805, 0.935, 0, 0, -3.69, 69.41, 36.5, 8]),
  createArmData(29, 'E&W.2', 'E&W.2 = w/under the hat arm',
    [34.5, 7.188, 0.509, 0.99, 0.778, 0.935, 0, 0, -3.69, 69.41, 8.3, 8]),
  createArmData(30, 'E&W.3', 'E&W.3 = w/shaved over the hat arm',
    [32.8, 7.188, 0.509, 0.99, 0.85, 0.935, 0, 0, -3.69, 69.41, 32.5, 8]),
  createArmData(31, 'E&W.4', 'E&W.4 = w/thin (.132") over the hat arm',
    [27.2, 7.188, 0.509, 0.99, 0.805, 0.935, 0, 0, -3.69, 69.41, 36.5, 8]),
  createArmData(32, 'E&W.5', 'E&W.5 = w/less aggressive 32 gram arm',
    [32.1, 7.188, 0.509, 0.968, 0.83, 0.935, 0, 0, -3.69, 56.04, 32, 8]),

  // Hays Clutches - Mr Gasket: 8 inch
  createArmData(33, 'HAY.1', 'HAY.1 = w/std over the hat 31 gram arm',
    [-30.6, 6.173, 0.509, 0.91, 0.86, 0.82, 0, 0, -3.69, 57.14, 32, 8]),
  createArmData(34, 'HAY.2', 'HAY.2 = w/over the hat 36 gram arm',
    [-35.1, 6.173, 0.509, 0.952, 0.83, 0.82, 0, 0, -3.69, 73.05, 36, 8]),

  // Hays Clutches - Mr Gasket: 10 inch
  createArmData(35, 'HAY.3', 'HAY.3 = 75 gram arm, short tip (97X06049)',
    [74.6, 8.28, 0.562, 1.007, 0.5, 0.4, 1, 6, 0, 132.83, 10, 10]),
  createArmData(36, 'HAY.4', 'HAY.4 = 73 gram arm, long tip (97X06052)',
    [72.6, 8.28, 0.562, 1.007, 0.58, 0.4, 1, 6, 0, 132.83, 10, 10]),
  createArmData(37, 'HAY.5', 'HAY.5 = 105 gram arm, short tip, lo cwt (97006117)',
    [104.9, 8.28, 0.562, 1.096, 0.64, 0.4, 1, 6, 0, 136.99, 10, 10]),
  createArmData(38, 'HAY.6', 'HAY.6 = 105 gram arm, short tip, hi cwt (97006117)',
    [104.9, 8.28, 0.562, 1.329, 0.64, 0.4, 1, 6, 0, 126.72, 10, 10]),
  createArmData(39, 'HAY.7', 'HAY.7 = 75 gram arm, long tip (97X06053)',
    [74.4, 8.28, 0.562, 1.007, 0.58, 0.4, 1, 6, 0, 132.83, 10, 10]),

  // L&T Clutches: 8 inch
  createArmData(40, 'L&T.1', 'L&T.1 = aluminum w/std over the hat arm',
    [36.1, 7.188, 0.509, 0.99, 0.805, 0.82, 0, 0, -3.69, 69.41, 36.5, 8]),
  createArmData(41, 'L&T.2', 'L&T.2 = aluminum w/under the hat arm',
    [34.5, 7.188, 0.509, 0.99, 0.778, 0.82, 0, 0, -3.69, 69.41, 8.3, 8]),
  createArmData(42, 'L&T.3', 'L&T.3 = aluminum w/shaved over the hat arm',
    [32.8, 7.188, 0.509, 0.99, 0.85, 0.82, 0, 0, -3.69, 69.41, 32.5, 8]),
  createArmData(43, 'L&T.4', 'L&T.4 = aluminum w/thin (.132") over the hat arm',
    [27.2, 7.188, 0.509, 0.99, 0.805, 0.82, 0, 0, -3.69, 69.41, 36.5, 8]),

  // Performance Industries Clutches
  createArmData(44, 'PIR.1', 'PIR.1 = 7.3" w/std under the hat 59 gram arm',
    [-54, 5.125, 0.601, 1.199, 0.415, 2, 0.87, 4.1875, 16.9, 138.38, 15.6, 7.3]),
  createArmData(45, 'PIR.2', 'PIR.2 = 8.4" & 9.0" w/std 70 gram arm',
    [-65.4, 6.25, 0.585, 1.178, 0.73, 2, 0.87, 5, 10.7, 137.46, 9.4, 8.4]),
  createArmData(46, 'PIR.3', 'PIR.3 = 8.4" & 9.0" w/84 gram arm',
    [-78.7, 6.25, 0.585, 1.178, 0.725, 2, 0.87, 5, 10.7, 137.46, 6.9, 8.4]),
  createArmData(47, 'PIR.4', 'PIR.4 = 8.4" & 9.0" w/64 gram arm (estimate)',
    [-61, 6.25, 0.585, 1.178, 0.72, 2, 0.87, 5, 10.7, 137.46, 3.2, 8.4]),

  // RAM Clutches: 7 & 8 inch
  createArmData(48, 'RAM.1', 'RAM.1 = 7" billet w/std over the hat 29 gram arm',
    [-28.8, 5.25, 0.5115, 0.7115, 0.745, 0.2, 0, 0, 12.27, 64.6, 25, 7]),
  createArmData(49, 'RAM.2', 'RAM.2 = 7" billet w/over the hat 39 gram arm',
    [-39.2, 5.25, 0.5115, 1.0995, 0.79, 0.2, 0, 0, 12.27, 72.6, 37, 7]),
  createArmData(50, 'RAM.3', 'RAM.3 = 8" billet w/std over the hat 36 gram arm',
    [-37.8, 6.25, 0.5115, 1.002, 0.825, 0.2, 0, 0, 12.27, 71.7, 25, 8]),

  // RAM Clutches: 10 inch
  createArmData(51, 'RAM.4', 'RAM.4 = billet w/std over the hat 68 gram arm',
    [-68, 7.375, 0.5135, 0.846, 1.06, 0.2, 0, 0, 12.5, 60.14, 8, 10]),
  createArmData(52, 'RAM.5', 'RAM.5 = billet w/over the hat 73 gram arm',
    [-73.4, 7.375, 0.514, 1.2755, 1.05, 0.2, 0, 0, 12.5, 54.8, 13.5, 10]),
  createArmData(53, 'RAM.6', 'RAM.6 = billet w/over the hat 75 gram arm',
    [-74.6, 7.375, 0.5145, 1.163, 1.03, 0.2, 0, 0, 12.5, 73.42, 13, 10]),

  // Ray Franks Enterprises
  createArmData(54, 'RFE.1', 'RFE.1 = 8" aluminum w/std over the hat arm',
    [36.5, 7.188, 0.511, 0.99, 0.805, 0.86, 0, 0, -3.69, 69.37, 36.5, 8]),
  createArmData(55, 'RFE.2', 'RFE.2 = 7" titanium w/shaved 28 gram arm',
    [27.5, 6.188, 0.511, 0.935, 0.715, 1.08, 0, 0, -3.69, 84.66, 44.5, 7]),

  // Titan Speed Engineering: 10 inch
  createArmData(56, 'TTN.1', 'TTN.1 = w/std under the hat 92 gram arm (PT1155)',
    [92, 8.68, 0.55, 1.037, 0.873, 1.5, 0.7, 5, 0, 127.93, 5, 10]),

  // Motorcycle Clutches
  createArmData(57, 'BND.1', 'BND.1 = Bandit 3 arm motorcycle clutch',
    [-14.5, 3.2, 0.495, 1.216, 0.658, 0.1, 0, 0, 36.13, 37.3, 27.3, 6]),
  createArmData(58, 'BNS.1', 'BNS.1 = Banshee 6 arm motorcycle clutch',
    [-16.1, 3.2, 0.55, 1.27, 0.66, 0.125, 0, 0, 41.6, 34, 29, 6]),
  createArmData(59, 'MTC.1', 'MTC.1 = MTC 6 arm motorcycle clutch',
    [-18, 3.115, 0.526, 1.192, 0.565, 0.107, 5, 1.65, 27.24, 43.7, 9.1, 6]),

  // Custom Clutches (placeholder)
  createArmData(60, 'CUS.1', 'CUS.1 = custom arm',
    [50, 7.0, 0.5, 1.0, 0.8, 0.5, 0, 0, 0, 60, 30, 8]),
];

// ============================================================================
// MANUFACTURER GROUPS
// ============================================================================

export const manufacturerGroups: ManufacturerGroup[] = [
  { name: '', armCount: 1, startIndex: 0 },
  { name: 'ACE Manufacturing: 7.0, 7.6 & 8.0 inch', armCount: 4, startIndex: 1 },
  { name: 'ACE Manufacturing: 6.25 inch', armCount: 1, startIndex: 5 },
  { name: 'Applied Friction Technology: 9 inch', armCount: 1, startIndex: 6 },
  { name: 'Applied Friction Technology: 10 & 11 inch', armCount: 4, startIndex: 7 },
  { name: 'Boninfante Clutches:', armCount: 3, startIndex: 11 },
  { name: 'Crower Clutches: 9 inch', armCount: 2, startIndex: 14 },
  { name: 'Crower Clutches: 10.0 & 10.7 inch', armCount: 3, startIndex: 16 },
  { name: 'Crowerglide Clutches: 10 & 11 inch', armCount: 8, startIndex: 19 },
  { name: 'East West Engineering: 7.0 & 7.5 inch', armCount: 1, startIndex: 27 },
  { name: 'East West Engineering: 8 & 9 inch', armCount: 5, startIndex: 28 },
  { name: 'Hays Clutches - Mr Gasket: 8 inch', armCount: 2, startIndex: 33 },
  { name: 'Hays Clutches - Mr Gasket: 10 inch', armCount: 5, startIndex: 35 },
  { name: 'L&T Clutches: 8 inch', armCount: 4, startIndex: 40 },
  { name: 'Performance Industries Clutches', armCount: 4, startIndex: 44 },
  { name: 'RAM Clutches: 7 & 8 inch', armCount: 3, startIndex: 48 },
  { name: 'RAM Clutches: 10 inch', armCount: 3, startIndex: 51 },
  { name: 'Ray Franks Enterprises', armCount: 2, startIndex: 54 },
  { name: 'Titan Speed Engineering: 10 inch', armCount: 1, startIndex: 56 },
  { name: 'Motorcycle Clutches:', armCount: 3, startIndex: 57 },
  { name: 'Custom Clutches', armCount: 1, startIndex: 60 },
];

/**
 * Get arm data by index
 */
export function getArmData(index: number): ClutchArmData | null {
  if (index < 0 || index >= armData.length) return null;
  return armData[index];
}

/**
 * Get all arms for a manufacturer
 */
export function getArmsByManufacturer(mfgIndex: number): ClutchArmData[] {
  if (mfgIndex < 0 || mfgIndex >= manufacturerGroups.length) return [];
  const group = manufacturerGroups[mfgIndex];
  const arms: ClutchArmData[] = [];
  for (let i = 0; i < group.armCount; i++) {
    const arm = armData[group.startIndex + i];
    if (arm) arms.push(arm);
  }
  return arms;
}

/**
 * Find arm index by name
 */
export function findArmByName(name: string): number {
  for (let i = 0; i < armData.length; i++) {
    if (armData[i]?.name === name) return i;
  }
  return 0;
}

/**
 * Get arm options for dropdown (name and description)
 */
export function getArmOptions(): { value: number; label: string; description: string }[] {
  return armData
    .filter((arm): arm is ClutchArmData => arm !== null)
    .map(arm => ({
      value: arm.id,
      label: arm.name,
      description: arm.description
    }));
}
