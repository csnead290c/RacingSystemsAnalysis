/**
 * Tire traction model for RSACLASSIC physics engine.
 * Simple friction coefficient (μ) model with track condition adjustments.
 */

/**
 * Tire parameters for traction calculation.
 */
export interface TireParams {
  /**
   * Base coefficient of friction (μ₀).
   * Typical values:
   * - Street tires: 0.8-1.0
   * - Performance tires: 1.2-1.4
   * - Drag radials: 1.4-1.6
   * - Slicks: 1.6-2.0
   */
  mu0: number;
  
  /**
   * Load bias for launch (optional).
   * Accounts for weight transfer to rear during launch.
   * Typical: 0.6-0.7 (60-70% of weight on rear tires)
   */
  loadBias?: number;
}

/**
 * Calculate maximum tractive force based on tire-track friction.
 * 
 * Uses simple Coulomb friction model: F_max = μ * N
 * 
 * Where:
 * - μ = coefficient of friction (tire-track interface)
 * - N = normal force (weight on driven wheels)
 * 
 * The effective μ is adjusted by track conditions (traction index).
 * 
 * @param normal_lb - Normal force on driven wheels (weight in lb)
 * @param p - Tire parameters
 * @param tractionIndex - Track traction index (0 = standard, +10 = excellent, -10 = poor)
 * @returns Maximum tractive force in pounds
 */
export function maxTractive_lb(
  normal_lb: number,
  p: TireParams,
  tractionIndex?: number
): number {
  // Base coefficient of friction
  const mu0 = p.mu0;
  
  // Adjust μ based on track conditions
  // Each point of traction index = 2% change in μ
  const tractionFactor = 1 + 0.02 * (tractionIndex ?? 0);
  const effectiveMu = mu0 * tractionFactor;
  
  // Maximum tractive force: F = μ * N
  const maxForce = normal_lb * effectiveMu;
  
  return maxForce;
}

/**
 * Calculate normal force on driven wheels accounting for weight transfer.
 * 
 * During launch, weight transfers to the rear wheels.
 * This increases traction for RWD vehicles.
 * 
 * @param totalWeight_lb - Total vehicle weight
 * @param loadBias - Fraction of weight on driven wheels (0-1)
 * @returns Normal force on driven wheels in pounds
 */
export function normalForce_lb(
  totalWeight_lb: number,
  loadBias: number
): number {
  return totalWeight_lb * loadBias;
}

/**
 * Check if wheel slip is occurring.
 * 
 * Slip occurs when tractive force demand exceeds maximum available traction.
 * 
 * @param demandForce_lb - Requested tractive force
 * @param maxForce_lb - Maximum available tractive force
 * @returns True if slipping, false if hooked up
 */
export function isSlipping(
  demandForce_lb: number,
  maxForce_lb: number
): boolean {
  return demandForce_lb > maxForce_lb;
}

/**
 * Calculate actual tractive force accounting for traction limit.
 * 
 * If demand exceeds limit, wheels slip and force is limited to max traction.
 * 
 * @param demandForce_lb - Requested tractive force
 * @param maxForce_lb - Maximum available tractive force
 * @returns Actual tractive force in pounds
 */
export function actualTractive_lb(
  demandForce_lb: number,
  maxForce_lb: number
): number {
  return Math.min(demandForce_lb, maxForce_lb);
}
