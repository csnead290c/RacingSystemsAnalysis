/**
 * VB6 CalcWork Function - Fuel System Multiplier
 * 
 * Source: QTRPERF.BAS lines 256-265
 * 
 * This function returns a multiplier based on fuel system type that affects:
 * - HP curve shape in ENGINE() synthetic curve generation
 * - Peak HP limits in SetPeakHP()
 * - Weight limits in SetWeight()
 */

/**
 * Fuel system type (matches VB6 gc_FuelSystem.Value)
 */
export type FuelSystemValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Calculate fuel system work multiplier
 * 
 * VB6: QTRPERF.BAS lines 256-265
 * 
 * ```vb
 * Public Function CalcWork()
 *     Select Case gc_FuelSystem.Value
 *         Case 1, 2:  CalcWork = 1
 *         Case 3, 4:  CalcWork = 1.08
 *         Case 5:     CalcWork = 5
 *         Case 6:     CalcWork = 2 * 1
 *         Case 7, 9:  CalcWork = 2.5 * 1.08
 *         Case 8:     CalcWork = 1.5 * 5.5
 *     End Select
 * End Function
 * ```
 * 
 * @param fuelSystem Fuel system type (1-9)
 * @returns Work multiplier
 */
export function calcWork(fuelSystem: FuelSystemValue): number {
  switch (fuelSystem) {
    case 1:  // Gasoline Carburetor
    case 2:  // Gasoline Injector
      return 1;
    
    case 3:  // Methanol Carburetor
    case 4:  // Methanol Injector
      return 1.08;
    
    case 5:  // Nitromethane Injector
      return 5;
    
    case 6:  // Supercharged Gasoline
      return 2 * 1;  // = 2
    
    case 7:  // Supercharged Methanol
    case 9:  // Flat Rate Engine HP (Electric)
      return 2.5 * 1.08;  // = 2.7
    
    case 8:  // Supercharged Nitro
      return 1.5 * 5.5;  // = 8.25
    
    default:
      return 1;
  }
}

/**
 * Fuel system names for display
 */
export const FUEL_SYSTEM_NAMES: Record<FuelSystemValue, string> = {
  1: 'Gasoline Carburetor',
  2: 'Gasoline Injector',
  3: 'Methanol Carburetor',
  4: 'Methanol Injector',
  5: 'Nitromethane Injector',
  6: 'Supercharged Gasoline',
  7: 'Supercharged Methanol',
  8: 'Supercharged Nitro',
  9: 'Flat Rate Engine HP',
};

/**
 * Check if fuel system is naturally aspirated
 */
export function isNaturallyAspirated(fuelSystem: FuelSystemValue): boolean {
  return fuelSystem <= 5;
}

/**
 * Check if fuel system is supercharged
 */
export function isSupercharged(fuelSystem: FuelSystemValue): boolean {
  return fuelSystem >= 6 && fuelSystem <= 8;
}

/**
 * Get fuel type (1=gas, 2=methanol, 3=nitro)
 */
export function getFuelType(fuelSystem: FuelSystemValue): 1 | 2 | 3 {
  switch (fuelSystem) {
    case 1:
    case 2:
    case 6:
      return 1;  // Gasoline
    case 3:
    case 4:
    case 7:
    case 9:
      return 2;  // Methanol
    case 5:
    case 8:
      return 3;  // Nitromethane
    default:
      return 1;
  }
}

/**
 * Get carburetion type (1=carb, 2=injector, 3=supercharger)
 */
export function getCarburetionType(fuelSystem: FuelSystemValue): 1 | 2 | 3 {
  switch (fuelSystem) {
    case 1:
    case 3:
      return 1;  // Carburetor
    case 2:
    case 4:
    case 5:
      return 2;  // Injector
    case 6:
    case 7:
    case 8:
    case 9:
      return 3;  // Supercharger
    default:
      return 1;
  }
}
