/**
 * Aerodynamic drag model for RSACLASSIC physics engine.
 * Uses standard drag equation with air density correction.
 */

/**
 * Calculate aerodynamic drag force.
 * 
 * Uses the standard drag equation:
 * D = 0.5 * ρ * v² * Cd * A
 * 
 * Where:
 * - ρ = air density (slugs/ft³)
 * - v = velocity (ft/s)
 * - Cd = drag coefficient (dimensionless)
 * - A = frontal area (ft²)
 * 
 * The result is in slugs·ft/s², which needs to be converted to pounds (force).
 * Force (lb) = mass·acceleration / g = (slugs·ft/s²) / 32.174
 * 
 * @param v_fps - Velocity in feet per second
 * @param cd - Drag coefficient (typical: 0.3-0.5 for cars)
 * @param frontalArea_ft2 - Frontal area in square feet
 * @param rho_slug_ft3 - Air density in slugs per cubic foot
 * @returns Drag force in pounds
 */
export function drag_lb(
  v_fps: number,
  cd: number,
  frontalArea_ft2: number,
  rho_slug_ft3: number
): number {
  // Drag equation: D = 0.5 * ρ * v² * Cd * A
  // Result is already in pounds force when using slugs for density
  // because: (slugs/ft³) * (ft/s)² * ft² = slugs·ft/s² = lb (in English units)
  const drag_lb = 0.5 * rho_slug_ft3 * v_fps * v_fps * cd * frontalArea_ft2;
  
  return drag_lb;
}

/**
 * Calculate drag coefficient from known drag force.
 * Useful for calibration or reverse engineering.
 * 
 * @param drag_lb - Known drag force in pounds
 * @param v_fps - Velocity in feet per second
 * @param frontalArea_ft2 - Frontal area in square feet
 * @param rho_slug_ft3 - Air density in slugs per cubic foot
 * @returns Drag coefficient
 */
export function cdFromDrag(
  drag_lb: number,
  v_fps: number,
  frontalArea_ft2: number,
  rho_slug_ft3: number
): number {
  // Avoid division by zero
  if (v_fps === 0 || frontalArea_ft2 === 0 || rho_slug_ft3 === 0) {
    return 0;
  }
  
  // Rearrange drag equation: Cd = D / (0.5 * ρ * v² * A)
  const cd = drag_lb / (0.5 * rho_slug_ft3 * v_fps * v_fps * frontalArea_ft2);
  
  return cd;
}

/**
 * Typical drag coefficients for reference.
 */
export const TYPICAL_CD = {
  /** Modern sports car with good aero */
  SPORTS_CAR: 0.30,
  
  /** Typical sedan */
  SEDAN: 0.35,
  
  /** SUV or truck */
  TRUCK: 0.45,
  
  /** Drag racing car with minimal aero work */
  DRAG_CAR_BASIC: 0.40,
  
  /** Drag racing car with aero package */
  DRAG_CAR_AERO: 0.35,
  
  /** Pro stock with extensive aero */
  PRO_STOCK: 0.30,
} as const;

/**
 * Estimate frontal area from vehicle dimensions.
 * 
 * Rough approximation: A ≈ 0.85 * width * height
 * The 0.85 factor accounts for rounded corners and shape.
 * 
 * @param width_ft - Vehicle width in feet
 * @param height_ft - Vehicle height in feet
 * @returns Estimated frontal area in square feet
 */
export function estimateFrontalArea(width_ft: number, height_ft: number): number {
  return 0.85 * width_ft * height_ft;
}
