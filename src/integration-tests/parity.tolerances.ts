/**
 * Per-class tolerances for VB6 parity tests.
 * 
 * Different vehicle classes have different tolerance requirements:
 * - Pro Stock: Tight tolerances (well-understood physics)
 * - Top Fuel / Funny Car: Looser tolerances (complex tire/clutch dynamics)
 * - Pro Stock Motorcycle: Medium tolerances
 */

export interface Tolerance {
  et_s: number;   // ET tolerance in seconds
  mph: number;    // MPH tolerance
}

/**
 * Per-class tolerance map.
 * Keys are lowercase class identifiers derived from fixture names.
 */
export const PARITY_TOLERANCE: Record<string, Tolerance> = {
  // Tight tolerances for VB6-STRICT mode
  // These will be tightened further as we get actual VB6 printouts
  prostock:   { et_s: 0.01, mph: 0.5 },   // Pro Stock - well understood
  topfuel:    { et_s: 0.05, mph: 2.0 },   // Top Fuel - complex clutch dynamics
  funnycar:   { et_s: 0.05, mph: 2.0 },   // Funny Car - complex clutch dynamics
  psm:        { et_s: 0.02, mph: 1.0 },   // Pro Stock Motorcycle
  promstock:  { et_s: 0.02, mph: 1.0 },   // Pro Modified
  default:    { et_s: 0.05, mph: 2.0 },   // Default fallback
};

/**
 * Derive a class key from a fixture name.
 * Looks for known class identifiers in the name (case-insensitive).
 * 
 * Examples:
 *   "ProStock_Pro_QUARTER" -> "prostock"
 *   "TopFuel_Kalitta_QUARTER" -> "topfuel"
 *   "FunnyCar_Force_EIGHTH" -> "funnycar"
 *   "PSM_Hines_QUARTER" -> "psm"
 */
export function deriveClassKey(fixtureName: string): string {
  const lower = fixtureName.toLowerCase();
  
  if (lower.includes('prostock') || lower.includes('pro_stock') || lower.includes('pro-stock')) {
    return 'prostock';
  }
  if (lower.includes('topfuel') || lower.includes('top_fuel') || lower.includes('top-fuel') || lower.includes('tf_')) {
    return 'topfuel';
  }
  if (lower.includes('funnycar') || lower.includes('funny_car') || lower.includes('funny-car') || lower.includes('fc_')) {
    return 'funnycar';
  }
  if (lower.includes('psm') || lower.includes('promstock') || lower.includes('pro_mod')) {
    return 'psm';
  }
  
  return 'default';
}

/**
 * Get tolerance for a fixture by name.
 * Falls back to default if class not recognized.
 */
export function getToleranceForFixture(fixtureName: string): Tolerance {
  const classKey = deriveClassKey(fixtureName);
  return PARITY_TOLERANCE[classKey] ?? PARITY_TOLERANCE.default;
}

/**
 * Get tolerance by explicit class key.
 * Falls back to default if class not found.
 */
export function getTolerance(classKey: string): Tolerance {
  return PARITY_TOLERANCE[classKey.toLowerCase()] ?? PARITY_TOLERANCE.default;
}
