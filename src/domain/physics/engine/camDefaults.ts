/**
 * Camshaft Default Calculations
 * Ports VB6 ENGPERF.BAS lines 425-438
 * 
 * These calculate recommended Lobe Separation Angle and Intake Lobe Centerline
 * based on engine parameters. User can override these calculated defaults.
 */

/**
 * Calculate recommended Lobe Separation Angle
 * VB6 ENGPERF.BAS lines 425-429
 * 
 * @param rpmPeakHP - RPM at peak horsepower
 * @param intakeDuration050 - Intake cam duration @ 0.050"
 * @param rodLength_in - Rod length in inches
 * @param stroke_in - Stroke in inches
 * @returns Recommended LSA in degrees (102-116°)
 */
export function calculateLobeSeparationAngle(
  rpmPeakHP: number,
  intakeDuration050: number,
  rodLength_in: number,
  stroke_in: number
): number {
  const LRQS = rodLength_in / stroke_in;
  
  // VB6 line 426-427
  let lsa = 100 + 1.2 * rpmPeakHP / 1000;
  lsa = lsa * Math.pow(intakeDuration050 / 270, 0.5) + Math.pow(1.8 / LRQS, 4) - 1;
  
  // VB6 lines 428-429: Clamp to valid range
  const zmin = 102;
  const zmax = 116;
  if (lsa < zmin) lsa = zmin;
  if (lsa > zmax) lsa = zmax;
  
  // VB6 line 437: Round up to nearest degree
  return Math.ceil(lsa);
}

/**
 * Calculate recommended Intake Lobe Centerline
 * VB6 ENGPERF.BAS lines 431-434
 * 
 * @param lobeSeparationAngle - Lobe separation angle in degrees
 * @param effectiveCR - Effective compression ratio (from engine simulation)
 * @param fuelType - Fuel type (1=gasoline, 2=racing gas, 3=methanol)
 * @returns Recommended ILC in degrees (100-118°)
 */
export function calculateIntakeLobeCenterline(
  lobeSeparationAngle: number,
  effectiveCR: number,
  fuelType: 'gasoline' | 'racing_gasoline' | 'methanol'
): number {
  // VB6 crx values from ENGPERF.BAS lines 75-79
  const crx = fuelType === 'methanol' ? 13.5 : 11.5;
  
  // VB6 line 432: ilc = lsa - (1 - EffCR / crx) * 15
  let ilc = lobeSeparationAngle - (1 - effectiveCR / crx) * 15;
  
  // VB6 lines 433-434: Clamp to valid range
  const zmin = 100;
  const zmax = 118;
  if (ilc < zmin) ilc = zmin;
  if (ilc > zmax) ilc = zmax;
  
  // VB6 line 438: Round to nearest degree
  return Math.round(ilc);
}

/**
 * Get calculated cam defaults for a configuration
 * Returns both LSA and ILC with VB6-accurate calculations
 */
export function getCalculatedCamDefaults(
  rpmPeakHP: number,
  intakeDuration050: number,
  rodLength_in: number,
  stroke_in: number,
  compressionRatio: number,
  fuelType: 'gasoline' | 'racing_gasoline' | 'methanol',
  effectiveCR?: number  // Optional - if not provided, uses compressionRatio
): {
  lobeSeparationAngle_deg: number;
  intakeLobeCenterline_deg: number;
} {
  const lsa = calculateLobeSeparationAngle(
    rpmPeakHP,
    intakeDuration050,
    rodLength_in,
    stroke_in
  );
  
  // Use effectiveCR if provided, otherwise use compressionRatio as approximation
  const ilc = calculateIntakeLobeCenterline(
    lsa,
    effectiveCR ?? compressionRatio,
    fuelType
  );
  
  return {
    lobeSeparationAngle_deg: lsa,
    intakeLobeCenterline_deg: ilc
  };
}
