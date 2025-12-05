/**
 * Weather Calculator - VB6 Port
 * Ported from VB6 Weather source code (Module1.bas)
 * 
 * Calculates:
 * - Density Altitude
 * - HP Correction Factor
 * - Density Index (ADI)
 * 
 * Based on atmospheric conditions including temperature effects on
 * water vapor pressure and fuel system type corrections.
 */

// ============================================================================
// CONSTANTS (from VB6)
// ============================================================================

export const TSTD = 519.67;      // Standard temperature (Rankine)
export const PSTD = 14.696;      // Standard pressure (psi)
export const BSTD = 29.92;       // Standard barometer (inHg)
export const WTAIR = 28.9669;    // Molecular weight of air
export const WTH2O = 18.016;     // Molecular weight of water
export const RSTD = 1545.32;     // Universal gas constant

// Altitude conversion constants
const Z1 = 0.00356616;
const Z2 = 5.25588;

// Saturation vapor pressure polynomial coefficients
const CPS = [
  0.0205558,
  0.00118163,
  0.0000154988,
  0.00000040245,
  0.000000000434856,
  0.00000000002096
];

// ============================================================================
// INTERFACES
// ============================================================================

export interface WeatherInput {
  /** Altimeter reading in feet (use if useAltimeter is true) */
  altimeter: number;
  /** Barometer reading in inHg (use if useAltimeter is false) */
  barometer: number;
  /** Use altimeter (true) or barometer (false) for pressure */
  useAltimeter: boolean;
  /** Ambient temperature in °F */
  temperature: number;
  /** Relative humidity in % (0-100) */
  humidity: number;
  /** Fuel system type (1-8) */
  fuelSystem: number;
}

export interface WeatherResult {
  /** Density Altitude in feet */
  densityAltitude: number;
  /** HP Correction Factor */
  hpCorrectionFactor: number;
  /** Air Density Index (ADI) as percentage */
  densityIndex: number;
  /** Partial pressure of dry air (psi) */
  dryAirPressure: number;
  /** Water vapor pressure (psi) */
  vaporPressure: number;
  /** Ambient pressure (psi) */
  ambientPressure: number;
  /** Pressure ratio (delta) */
  pressureRatio: number;
  /** Temperature ratio (theta) */
  temperatureRatio: number;
  /** Water-air ratio */
  waterAirRatio: number;
}

export type FuelSystemType = 
  | 'gasoline_carb'
  | 'gasoline_injector'
  | 'methanol_carb'
  | 'methanol_injector'
  | 'nitromethane_injector'
  | 'supercharged_gasoline'
  | 'supercharged_methanol'
  | 'supercharged_nitro';

export const FUEL_SYSTEMS: { value: number; label: string; type: FuelSystemType }[] = [
  { value: 1, label: 'Gasoline Carburetor', type: 'gasoline_carb' },
  { value: 2, label: 'Gasoline Injector', type: 'gasoline_injector' },
  { value: 3, label: 'Methanol Carburetor', type: 'methanol_carb' },
  { value: 4, label: 'Methanol Injector', type: 'methanol_injector' },
  { value: 5, label: 'Nitromethane Injector', type: 'nitromethane_injector' },
  { value: 6, label: 'Supercharged Gasoline', type: 'supercharged_gasoline' },
  { value: 7, label: 'Supercharged Methanol', type: 'supercharged_methanol' },
  { value: 8, label: 'Supercharged Nitro', type: 'supercharged_nitro' },
];

// ============================================================================
// CALCULATIONS
// ============================================================================

/**
 * Calculate saturation vapor pressure from temperature
 * Uses polynomial approximation from VB6 code
 */
function calcSaturationVaporPressure(tempF: number): number {
  return CPS[0] + 
         CPS[1] * tempF + 
         CPS[2] * Math.pow(tempF, 2) + 
         CPS[3] * Math.pow(tempF, 3) + 
         CPS[4] * Math.pow(tempF, 4) + 
         CPS[5] * Math.pow(tempF, 5);
}

/**
 * Convert altimeter reading (feet) to barometric pressure (psi)
 */
function altimeterToPressure(altFeet: number): number {
  return PSTD * Math.pow((TSTD - Z1 * altFeet) / TSTD, Z2);
}

/**
 * Convert barometer reading (inHg) to pressure (psi)
 */
function barometerToPressure(baroInHg: number): number {
  return PSTD * baroInHg / BSTD;
}

/**
 * Get fuel system parameters
 * Returns: [pressureExponent, temperatureExponent, mechanicalLoss]
 */
function getFuelSystemParams(fuelSystem: number, carbType: number): [number, number, number] {
  let pExp: number;
  let tExp: number;
  let mechLoss: number;

  // Determine fuel type (1=gas, 2=methanol, 3=nitro)
  const fuelType = fuelSystem <= 2 ? 1 : (fuelSystem <= 4 ? 2 : 3);

  switch (fuelType) {
    case 1: // Gasoline
      pExp = 1;
      tExp = 0.6;
      mechLoss = 0.15;
      break;
    case 2: // Methanol
      pExp = 1;
      tExp = 0.3;
      mechLoss = 0.13;
      break;
    case 3: // Nitromethane
      pExp = 0.85;
      tExp = 0.5;
      mechLoss = 0.055;
      break;
    default:
      pExp = 1;
      tExp = 0.6;
      mechLoss = 0.15;
  }

  // Injector adjustment
  if (carbType === 2) {
    mechLoss = mechLoss - 0.005;
  }

  // Supercharger adjustment
  if (carbType === 3) {
    pExp = 0.95;
    const dtx = ((1.35 - 1) / 1.35) / 0.85;
    pExp = pExp - dtx * tExp;
    tExp = tExp + dtx;
    mechLoss = 0.6 * mechLoss;
  }

  return [pExp, tExp, mechLoss];
}

/**
 * Calculate weather correction factors
 * Complete port of VB6 CalcWeather subroutine
 */
export function calculateWeather(input: WeatherInput): WeatherResult {
  // Calculate saturation vapor pressure from temperature
  const psDry = calcSaturationVaporPressure(input.temperature);
  
  // Calculate water vapor pressure from humidity
  const pwv = (input.humidity / 100) * psDry;
  
  // Calculate ambient pressure
  let pAmb: number;
  if (input.useAltimeter) {
    pAmb = altimeterToPressure(input.altimeter);
  } else {
    pAmb = barometerToPressure(input.barometer);
  }
  
  // Partial pressure of dry air
  const pAir = pAmb - pwv;
  
  // Pressure ratio (delta)
  const delta = pAir / PSTD;
  
  // Water-air ratio
  const war = (pwv * WTH2O) / (pAir * WTAIR);
  
  // Temperature ratio (theta)
  const theta = (input.temperature + 459.67) / TSTD;
  
  // Gas constant ratio
  const rGas = RSTD * ((1 / WTAIR) + (war / WTH2O)) / (1 + war);
  const rGrs = rGas / (RSTD / WTAIR);
  
  // Air Density Index
  const adi = 100 * delta / theta;
  
  // Density Altitude
  const densAlt = (TSTD - TSTD * Math.pow(adi / 100, 1 / (Z2 - 1))) / Z1;
  
  // Determine carb type from fuel system
  let carbType: number;
  if ([1, 3].includes(input.fuelSystem)) {
    carbType = 1; // Carburetor
  } else if ([2, 4, 5].includes(input.fuelSystem)) {
    carbType = 2; // Injector
  } else {
    carbType = 3; // Supercharger
  }
  
  // Get fuel system parameters
  const [pExp, tExp, mechLoss] = getFuelSystemParams(input.fuelSystem, carbType);
  
  // Estimate loss in thermal efficiency due to water-air ratio
  // From Taylor, vol 1, page 431, fr=1.0 data
  const kWar = 1 + 2.48 * Math.pow(war, 1.5);
  
  // HP Correction Factor
  let hpCor = Math.pow(delta, pExp) / (Math.sqrt(rGrs) * Math.pow(theta, tExp));
  hpCor = (1 + mechLoss) * kWar / hpCor - mechLoss;
  
  return {
    densityAltitude: Math.round(densAlt),
    hpCorrectionFactor: hpCor,
    densityIndex: adi,
    dryAirPressure: psDry,
    vaporPressure: pwv,
    ambientPressure: pAmb,
    pressureRatio: delta,
    temperatureRatio: theta,
    waterAirRatio: war,
  };
}

/**
 * Default weather input
 */
export const defaultWeatherInput: WeatherInput = {
  altimeter: 0,
  barometer: 29.92,
  useAltimeter: false,
  temperature: 70,
  humidity: 50,
  fuelSystem: 1,
};
