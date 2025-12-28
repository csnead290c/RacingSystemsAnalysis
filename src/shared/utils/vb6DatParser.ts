/**
 * VB6 .DAT File Parser
 * 
 * Parses VB6 Quarter Jr/Pro .DAT files with support for different versions.
 * 
 * VB6 .DAT File Format (Quarter Jr):
 * Line 1: Version number (e.g., " 3 ")
 * Line 2: Description/note
 * Line 3: Elevation, Temperature, Barometer, Humidity
 * Line 4: Weight, Rollout, Wheelbase, Frontal Area, Traction Index
 * Line 5: Displacement, Peak HP, RPM @ Peak, Shift RPM, Fuel System
 * Line 6: Gear ratios (2nd, 3rd, 4th, 5th, 6th, 7th)
 * Line 7: Trans type, Stall/Slip RPM, Lock-up, Converter diameter
 * Line 8: Final drive, Tire size, Tire width, Traction index
 * Line 9: Max width, Max height, Shape factor (for frontal area calc)
 * Line 10: PMI values
 * Line 11: Tire width, groove count, groove width (for effective width calc)
 * 
 * IMPORTANT: Tire size handling by version:
 * - Version 2 and earlier: Tire size is CIRCUMFERENCE in inches (divide by π for diameter)
 * - Version 3 and later: Tire size is DIAMETER in inches (use directly)
 */

import type { Vehicle } from '../../domain/schemas/vehicle.schema';

export interface VB6DatFile {
  version: number;
  description: string;
  vehicle: Partial<Vehicle>;
  env: {
    elevation: number;
    temperatureF: number;
    barometerInHg: number;
    humidityPct: number;
  };
}

/**
 * Parse a VB6 .DAT file
 */
export function parseVB6Dat(content: string): VB6DatFile {
  const lines = content.split(/\r?\n/).map(line => line.trim());
  
  // Line 1: Version
  const versionMatch = lines[0]?.match(/"\s*(\d+)\s*"/);
  if (!versionMatch) {
    throw new Error('Invalid .DAT file: missing version number');
  }
  const version = parseInt(versionMatch[1], 10);
  
  // Line 2: Description
  const description = lines[1]?.replace(/"/g, '') || '';
  
  // Line 3: Environment (Elevation, Temperature, Barometer, Humidity)
  const envParts = lines[2]?.split(/\s+/).filter(Boolean) || [];
  const env = {
    elevation: parseFloat(envParts[0]) || 0,
    temperatureF: parseFloat(envParts[1]) || 70,
    barometerInHg: parseFloat(envParts[2]) || 29.92,
    humidityPct: parseFloat(envParts[3]) || 50,
  };
  
  // Line 4: Weight, Rollout, Wheelbase, Frontal Area, Traction Index
  const vehicleParts = lines[3]?.split(/\s+/).filter(Boolean) || [];
  const weightLb = parseFloat(vehicleParts[0]) || 3000;
  const rolloutIn = parseFloat(vehicleParts[1]) || 12;
  const wheelbaseIn = parseFloat(vehicleParts[2]) || 108;
  const frontalAreaFt2 = parseFloat(vehicleParts[3]) || 24;
  // Note: vehicleParts[4] is traction index (stored in env, not vehicle)
  
  // Line 5: Displacement, Peak HP, RPM @ Peak, Shift RPM, Fuel System
  const engineParts = lines[4]?.split(/\s+/).filter(Boolean) || [];
  const displacementCID = parseFloat(engineParts[0]) || 350;
  const powerHP = parseFloat(engineParts[1]) || 300;
  const rpmAtPeakHP = parseFloat(engineParts[2]) || 5500;
  const shiftRPM = parseFloat(engineParts[3]) || 6000;
  const fuelSystem = parseInt(engineParts[4], 10) || 1;
  
  // Line 6: Gear ratios
  const gearParts = lines[5]?.split(/\s+/).filter(Boolean) || [];
  const gearRatios = gearParts.slice(0, 6).map(g => parseFloat(g)).filter(g => g > 0);
  
  // Line 7: Trans type, Stall/Slip RPM, Lock-up, Converter diameter
  const transParts = lines[6]?.split(/\s+/).filter(Boolean) || [];
  const transType = parseInt(transParts[0], 10) || 0; // 0=clutch, 1=converter, 2=converter
  const stallSlipRPM = parseFloat(transParts[1]) || 3000;
  const lockupStr = transParts[2]?.replace(/"/g, '') || 'N';
  const lockup = lockupStr.toUpperCase() === 'Y';
  const converterDiameterIn = parseFloat(transParts[3]) || 10;
  
  // Line 8: Final drive, Tire size, Tire width, Traction index (duplicate)
  const driveParts = lines[7]?.split(/\s+/).filter(Boolean) || [];
  const rearGear = parseFloat(driveParts[0]) || 3.73;
  let tireSizeValue = parseFloat(driveParts[1]) || 28;
  const tireWidthIn = parseFloat(driveParts[2]) || 10;
  // Note: driveParts[3] is traction index (duplicate of line 4)
  
  // CRITICAL: Handle tire size based on version
  // Version 2 and earlier: tire size is CIRCUMFERENCE (divide by π)
  // Version 3 and later: tire size is DIAMETER (use directly)
  let tireDiaIn: number;
  if (version <= 2) {
    // Older format: circumference in inches
    tireDiaIn = tireSizeValue / Math.PI;
    console.log(`[parseVB6Dat] Version ${version}: Converting tire circumference ${tireSizeValue}" to diameter ${tireDiaIn.toFixed(2)}"`);
  } else {
    // Newer format (v3+): diameter in inches
    tireDiaIn = tireSizeValue;
    console.log(`[parseVB6Dat] Version ${version}: Using tire diameter ${tireDiaIn}" directly`);
  }
  
  // Line 9: Max width, Max height, Shape factor (for frontal area worksheet)
  // Line 10: PMI values
  // Line 11: Tire width worksheet
  // (These are optional and used for calculations - we'll use the direct values from line 4 and 8)
  
  // Map fuel system number to string
  const fuelTypeMap: Record<number, string> = {
    1: 'Gasoline Carburetor',
    2: 'Gasoline Fuel Injection',
    3: 'Alcohol Carburetor',
    4: 'Alcohol Fuel Injection',
    5: 'Nitro Fuel Injection',
    6: 'Gasoline Turbo',
    7: 'Alcohol Turbo',
    8: 'Nitro Turbo',
    9: 'Diesel',
  };
  const fuelType = fuelTypeMap[fuelSystem] || 'Gasoline Carburetor';
  
  // Build Vehicle object
  const vehicle: Partial<Vehicle> = {
    name: description || 'Imported Vehicle',
    weightLb,
    rolloutIn,
    wheelbaseIn,
    frontalAreaFt2,
    tireDiaIn,
    tireWidthIn,
    rearGear,
    powerHP,
    rpmAtPeakHP,
    displacementCID,
    fuelType,
    gearRatios,
    shiftRPMs: gearRatios.map(() => shiftRPM),
    transmissionType: transType === 0 ? 'clutch' : 'converter',
    cd: 0.4, // Default drag coefficient
    liftCoeff: 0.1, // Default lift coefficient
  };
  
  // Add transmission-specific fields
  if (transType === 0) {
    // Clutch
    vehicle.clutchSlipRPM = stallSlipRPM;
    vehicle.clutchLaunchRPM = stallSlipRPM;
    vehicle.clutchSlippage = 1.0;
  } else {
    // Converter
    vehicle.converterStallRPM = stallSlipRPM;
    vehicle.converterLaunchRPM = stallSlipRPM;
    vehicle.converterDiameterIn = converterDiameterIn;
    vehicle.converterLockup = lockup;
    vehicle.converterTorqueMult = 2.0; // Default
    vehicle.converterSlippage = 1.05; // Default
  }
  
  return {
    version,
    description,
    vehicle,
    env,
  };
}

/**
 * Check if a file is a VB6 .DAT file
 */
export function isVB6DatFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.dat');
}

/**
 * Read and parse a VB6 .DAT file from a File object
 */
export async function readVB6DatFile(file: File): Promise<VB6DatFile> {
  const content = await file.text();
  return parseVB6Dat(content);
}
