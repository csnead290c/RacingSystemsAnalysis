/**
 * VB6 .dat File Parser
 * 
 * Parses QuarterJr and QuarterPro .dat files into RSA Vehicle format.
 * 
 * File Formats:
 * - QuarterJr: Version " 3 " - 12 lines, simplified inputs
 * - QuarterPro: Version " 3.21 " - 21 lines, full HP curve
 * - BonnevillePro: Version " 3.21 " - 21 lines, similar to QuarterPro
 */

import type { Vehicle } from '../schemas/vehicle.schema';

/** Parsed .dat file result */
export interface DatFileResult {
  success: boolean;
  vehicle?: Partial<Vehicle>;
  format: 'quarterJr' | 'quarterPro' | 'unknown';
  version: string;
  error?: string;
  warnings: string[];
}

/** Body style mapping (for reference)
 * 1: Dragster with wing
 * 2: Dragster
 * 3: Funny car body
 * 4: Altered/roadster
 * 5: Fastback
 * 6: Sedan
 * 7: Station wagon/van
 * 8: Motorcycle
 */

/** Fuel system mapping (VB6 type to RSA fuel type) */
const FUEL_SYSTEM_MAP: Record<number, { fuelType: string; fuelSystem: string }> = {
  1: { fuelType: 'Gasoline', fuelSystem: 'Gas+Carb' },
  2: { fuelType: 'Gasoline EFI', fuelSystem: 'Gas+Inject' },
  3: { fuelType: 'Methanol', fuelSystem: 'Meth+Carb' },
  4: { fuelType: 'Methanol EFI', fuelSystem: 'Meth+Inject' },
  5: { fuelType: 'Nitromethane', fuelSystem: 'Nitro+Inject' },
  6: { fuelType: 'Supercharged Gasoline', fuelSystem: 'SC+Gas' },
  7: { fuelType: 'Supercharged Methanol', fuelSystem: 'SC+Meth' },
  8: { fuelType: 'Supercharged Nitro', fuelSystem: 'SC+Nitro' },
  9: { fuelType: 'Electric', fuelSystem: 'Electric' },
};

/** Parse a line of space-separated numbers */
function parseNumbers(line: string): number[] {
  return line.trim().split(/\s+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
}

/** Parse a quoted string from a line */
function parseQuotedString(line: string): string {
  const match = line.match(/"([^"]*)"/);
  return match ? match[1].trim() : '';
}

/** Check if a value is a "Yes" or "N" type flag */
function parseYesNo(line: string): boolean {
  return line.includes('"Y"') || line.includes("'Y'");
}

/** Extract name from file path */
function extractNameFromPath(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() || 'Imported Vehicle';
  return fileName.replace(/\.dat$/i, '').replace(/_/g, ' ');
}

/**
 * Parse a QuarterJr format .dat file (12 lines)
 * 
 * Line 1: " 3 " - version
 * Line 2: "description" - note
 * Line 3: elevation, temp, baro, humidity
 * Line 4: weight, rollout, wheelbase, frontalArea, bodyStyle
 * Line 5: displacement, peakHP, rpmAtPeakHP, shiftRPM, fuelSystem
 * Line 6: gear1, gear2, gear3, gear4, gear5, gear6
 * Line 7: transType(1=clutch,2=converter), slipRPM, lockup("Y"/"N"), converterDia
 * Line 8: finalDrive, tireRollout, tireWidth, tractionIndex
 * Line 9: maxWidth, maxHeight, shapeFactor (frontal area worksheet)
 * Line 10: (optional - varies)
 * Line 11: treadWidth, numGrooves, grooveWidth (tire width worksheet)
 * Line 12: (empty or additional)
 */
function parseQuarterJr(lines: string[], fileName: string): DatFileResult {
  const warnings: string[] = [];
  
  try {
    // Line 2: Note/description
    const note = parseQuotedString(lines[1] || '');
    
    // Line 3: Weather - elevation, temp, baro, humidity
    // Note: Weather data is environmental, not stored in vehicle
    // const weather = parseNumbers(lines[2] || '');
    
    // Line 4: weight, rollout, wheelbase, frontalArea, bodyStyle
    const vehicleBasics = parseNumbers(lines[3] || '');
    const weightLb = vehicleBasics[0] ?? 2500;
    const rolloutIn = vehicleBasics[1] ?? 12;
    const wheelbaseIn = vehicleBasics[2] ?? 100;
    const frontalAreaFt2 = vehicleBasics[3] ?? 20;
    const bodyStyle = vehicleBasics[4] ?? 5;
    
    // Line 5: displacement, peakHP, rpmAtPeakHP, shiftRPM, fuelSystem
    const engine = parseNumbers(lines[4] || '');
    const displacementCID = engine[0] ?? 350;
    const powerHP = engine[1] ?? 400;
    const rpmAtPeakHP = engine[2] ?? 6500;
    const shiftRPM = engine[3] ?? 7000;
    const fuelSystemType = engine[4] ?? 1;
    
    // Line 6: gear ratios (up to 6)
    const gearRatios = parseNumbers(lines[5] || '').filter(g => g > 0);
    if (gearRatios.length === 0) {
      gearRatios.push(2.5, 1.8, 1.4, 1.0); // Default
      warnings.push('No gear ratios found, using defaults');
    }
    
    // Line 7: transType, slipRPM, lockup, converterDia
    const trans = parseNumbers(lines[6] || '');
    const transType = trans[0] ?? 1; // 1=clutch, 2=converter
    const slipRPM = trans[1] ?? 5000;
    const lockup = parseYesNo(lines[6] || '');
    const converterDia = trans[3] ?? 10;
    
    // Line 8: finalDrive, tireRollout, tireWidth, tractionIndex (tractionIndex is environmental)
    const drivetrain = parseNumbers(lines[7] || '');
    const rearGear = drivetrain[0] ?? 4.10;
    const tireRolloutIn = drivetrain[1] ?? 90;
    const tireWidthIn = drivetrain[2] ?? 14;
    
    // Calculate tire diameter from rollout: diameter = rollout / pi
    const tireDiaIn = tireRolloutIn / Math.PI;
    
    // Get fuel type from map
    const fuel = FUEL_SYSTEM_MAP[fuelSystemType] ?? FUEL_SYSTEM_MAP[1];
    
    // Build vehicle
    const vehicle: Partial<Vehicle> = {
      id: crypto.randomUUID(),
      name: extractNameFromPath(fileName),
      notes: note || `Imported from ${fileName}`,
      
      // Mass & Geometry
      weightLb,
      wheelbaseIn,
      rolloutIn,
      bodyStyle,
      
      // Tires
      tireDiaIn,
      tireWidthIn,
      
      // Aero
      frontalAreaFt2,
      cd: bodyStyle === 5 ? 0.28 : bodyStyle === 6 ? 0.40 : 0.35, // Estimate from body style
      liftCoeff: 0.1,
      
      // Drivetrain
      rearGear,
      transmissionType: transType === 1 ? 'clutch' : 'converter',
      gearRatios,
      gearEfficiencies: gearRatios.map((_, i) => 0.99 - (gearRatios.length - 1 - i) * 0.005),
      shiftRPMs: gearRatios.slice(0, -1).map(() => shiftRPM),
      
      // Clutch/Converter
      ...(transType === 1 ? {
        clutchLaunchRPM: slipRPM,
        clutchSlipRPM: slipRPM,
        clutchSlippage: 1.0025 + slipRPM / 1000000,
        clutchLockup: lockup,
      } : {
        converterStallRPM: slipRPM,
        converterDiameterIn: converterDia,
        converterLockup: lockup,
      }),
      
      // Engine - QuarterJr mode (no HP curve)
      powerHP,
      rpmAtPeakHP,
      displacementCID,
      
      // Fuel
      fuelType: fuel.fuelType,
      fuelSystem: fuel.fuelSystem,
      
      // Note: tractionIndex is environmental (track condition), not stored in vehicle
    };
    
    return {
      success: true,
      vehicle,
      format: 'quarterJr',
      version: '3',
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      format: 'quarterJr',
      version: '3',
      error: `Failed to parse QuarterJr file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warnings,
    };
  }
}

/**
 * Parse a QuarterPro format .dat file (21 lines)
 * 
 * Line 1: " 3.21 " - version
 * Line 2: "description" - note
 * Line 3: elevation, temp, baro, humidity, wheelbase, weight, overhang, rollout
 * Line 4: cgHeight, frontalArea, dragCoef, liftCoef
 * Line 5: rpm1-rpm11 (HP curve RPM points)
 * Line 6: hp1-hp11 (HP curve HP values)
 * Line 7: fuelSystem, bodyStyle
 * Line 8: gear1-gear6
 * Line 9: gearEff1-gearEff6
 * Line 10: shiftRPM1-shiftRPM6
 * Line 11: launchRPM, (spaces), stallRPM, torqueMult, slippage, lockup
 * Line 12: finalDrive, efficiency, tireRollout, tireWidth, tractionIndex
 * Line 13: enginePMI, transPMI, tiresPMI
 * Line 14: (reserved)
 * Line 15: maxWidth, maxHeight, shapeFactor (frontal area worksheet)
 * Line 16: (reserved)
 * Line 17: treadWidth, numGrooves, grooveWidth (tire width worksheet)
 * Line 18-21: (additional settings)
 */
function parseQuarterPro(lines: string[], fileName: string): DatFileResult {
  const warnings: string[] = [];
  
  try {
    // Line 2: Note/description
    const note = parseQuotedString(lines[1] || '');
    
    // Line 3: elevation, temp, baro, humidity, trackTemp, weight, wheelbase, rollout
    // VB6: Input #ff, alt, degf, PBAR, rh, trkt, wt, wb, roll
    // Note: Weather data (elevation, temp, baro, humidity, trackTemp) is environmental
    const basics = parseNumbers(lines[2] || '');
    const weightLb = basics[5] ?? 2500;
    const wheelbaseIn = basics[6] ?? 100;
    const rolloutIn = basics[7] ?? 12;
    
    // Line 4: overhang, frontalArea, dragCoef, liftCoef
    // VB6: Input #ff, over, area, CD, CL
    const aero = parseNumbers(lines[3] || '');
    const overhangIn = aero[0] ?? 40;
    const frontalAreaFt2 = aero[1] ?? 20;
    const cd = aero[2] ?? 0.35;
    const liftCoeff = aero[3] ?? 0.1;
    
    // Line 5: HP curve RPM points (up to 11)
    const rpmPoints = parseNumbers(lines[4] || '').filter(r => r > 0);
    
    // Line 6: HP curve HP values (up to 11)
    const hpPoints = parseNumbers(lines[5] || '').filter(h => h > 0);
    
    // Build HP curve
    let hpCurve: { rpm: number; hp: number }[] | undefined;
    if (rpmPoints.length > 0 && hpPoints.length > 0) {
      const curveLength = Math.min(rpmPoints.length, hpPoints.length);
      hpCurve = [];
      for (let i = 0; i < curveLength; i++) {
        hpCurve.push({ rpm: rpmPoints[i], hp: hpPoints[i] });
      }
    }
    
    // Line 7: hpTqMultiplier, fuelSystem (bodyStyle is calculated from weight in VB6)
    // VB6: Input #ff, ENGE, FTYPE
    const engineLine = parseNumbers(lines[6] || '');
    const hpTorqueMultiplier = engineLine[0] ?? 1;
    const fuelSystemType = engineLine[1] ?? 1;
    const bodyStyle = 5; // Default - VB6 calculates from weight
    
    // Line 8: gear ratios (up to 6)
    const gearRatios = parseNumbers(lines[7] || '').filter(g => g > 0);
    if (gearRatios.length === 0) {
      gearRatios.push(2.5, 1.8, 1.4, 1.0);
      warnings.push('No gear ratios found, using defaults');
    }
    
    // Line 9: gear efficiencies (up to 6)
    let gearEfficiencies = parseNumbers(lines[8] || '').filter(e => e > 0);
    if (gearEfficiencies.length < gearRatios.length) {
      // Pad with calculated values
      gearEfficiencies = gearRatios.map((_, i) => 0.99 - (gearRatios.length - 1 - i) * 0.005);
    }
    
    // Line 10: shift RPMs (up to 6)
    let shiftRPMs = parseNumbers(lines[9] || '').filter(r => r > 0);
    if (shiftRPMs.length < gearRatios.length - 1) {
      // Pad with first shift RPM or default
      const defaultShift = shiftRPMs[0] ?? 7000;
      while (shiftRPMs.length < gearRatios.length - 1) {
        shiftRPMs.push(defaultShift);
      }
    }
    shiftRPMs = shiftRPMs.slice(0, gearRatios.length - 1);
    
    // Line 11: launchRPM, (spaces), stallRPM, torqueMult, slippage, lockup
    // Format: "5000          5500  1.7  1.06 "N""
    const line11 = lines[10] || '';
    const trans = parseNumbers(line11);
    const launchRPM = trans[0] ?? 5000;
    const stallRPM = trans[1] ?? launchRPM;
    const torqueMult = trans[2] ?? 1.0;
    const slippage = trans[3] ?? 1.01;
    const lockup = parseYesNo(line11);
    
    // Determine if clutch or converter based on torque multiplier
    // Clutch has torqueMult = 1, converter has torqueMult > 1
    const isClutch = torqueMult === 1;
    
    // Line 12: finalDrive, finalDriveEfficiency, tireRollout, tireWidth, tractionIndex
    // VB6: Input #ff, RGR, rge, td, tw, ti
    // Note: tractionIndex is environmental, not stored in vehicle
    const drivetrain = parseNumbers(lines[11] || '');
    const rearGear = drivetrain[0] ?? 4.10;
    const finalDriveEfficiency = drivetrain[1] ?? 0.97;
    const tireRolloutIn = drivetrain[2] ?? 90;
    const tireWidthIn = drivetrain[3] ?? 14;
    
    // Keep tire as circumference (rollout), calculate diameter for reference
    const tireDiaIn = tireRolloutIn / Math.PI;
    
    // Line 13: enginePMI, transPMI, tiresPMI
    const pmi = parseNumbers(lines[12] || '');
    const enginePMI = pmi[0] ?? 3.5;
    const transPMI = pmi[1] ?? 0.25;
    const tiresPMI = pmi[2] ?? 50;
    
    // Get fuel type from map
    const fuel = FUEL_SYSTEM_MAP[fuelSystemType] ?? FUEL_SYSTEM_MAP[1];
    
    // Calculate peak HP and RPM from curve
    let powerHP = 400;
    let rpmAtPeakHP = 6500;
    if (hpCurve && hpCurve.length > 0) {
      const peakPoint = hpCurve.reduce((max, p) => p.hp > max.hp ? p : max, hpCurve[0]);
      powerHP = peakPoint.hp;
      rpmAtPeakHP = peakPoint.rpm;
    }
    
    // Build vehicle
    const vehicle: Partial<Vehicle> = {
      id: crypto.randomUUID(),
      name: extractNameFromPath(fileName),
      notes: note || `Imported from ${fileName}`,
      
      // Mass & Geometry
      weightLb,
      wheelbaseIn,
      overhangIn,
      rolloutIn,
      bodyStyle,
      
      // Tires - store as circumference (rollout)
      tireRolloutIn,
      tireRolloutMode: 'circumference' as const,
      tireDiaIn, // Calculated from rollout for display
      tireWidthIn,
      
      // Aero
      frontalAreaFt2,
      cd,
      liftCoeff,
      
      // Drivetrain
      rearGear,
      finalDriveEfficiency,
      transmissionType: isClutch ? 'clutch' : 'converter',
      gearRatios,
      gearEfficiencies,
      shiftRPMs,
      
      // Clutch/Converter
      ...(isClutch ? {
        clutchLaunchRPM: launchRPM,
        clutchSlipRPM: stallRPM,
        clutchSlippage: slippage,
        clutchLockup: lockup,
      } : {
        converterLaunchRPM: launchRPM,
        converterStallRPM: stallRPM,
        converterTorqueMult: torqueMult,
        converterSlippage: slippage,
        converterLockup: lockup,
      }),
      
      // PMI
      enginePMI,
      transPMI,
      tiresPMI,
      
      // Engine - QuarterPro mode with HP curve
      powerHP,
      rpmAtPeakHP,
      hpCurve,
      hpTorqueMultiplier,
      
      // Fuel
      fuelType: fuel.fuelType,
      fuelSystem: fuel.fuelSystem,
      
      // Note: tractionIndex is environmental, not stored in vehicle
    };
    
    return {
      success: true,
      vehicle,
      format: 'quarterPro',
      version: '3.21',
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      format: 'quarterPro',
      version: '3.21',
      error: `Failed to parse QuarterPro file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warnings,
    };
  }
}

/**
 * Parse a .dat file and return a Vehicle object
 */
export function parseDatFile(content: string, fileName: string = 'unknown.dat'): DatFileResult {
  // Split into lines, filtering empty lines at the end
  const lines = content.split(/\r?\n/);
  
  if (lines.length < 3) {
    return {
      success: false,
      format: 'unknown',
      version: '',
      error: 'File too short - expected at least 3 lines',
      warnings: [],
    };
  }
  
  // Detect format from version string on line 1
  const version = parseQuotedString(lines[0] || '');
  
  if (version.includes('3.21') || version.includes('3.2')) {
    // QuarterPro or BonnevillePro format
    return parseQuarterPro(lines, fileName);
  } else if (version.includes('3')) {
    // QuarterJr format
    return parseQuarterJr(lines, fileName);
  } else {
    // Try to auto-detect based on line count
    if (lines.length >= 20) {
      return parseQuarterPro(lines, fileName);
    } else if (lines.length >= 10) {
      return parseQuarterJr(lines, fileName);
    }
    
    return {
      success: false,
      format: 'unknown',
      version,
      error: `Unknown .dat file format (version: "${version}")`,
      warnings: [],
    };
  }
}

/**
 * Read and parse a .dat file from a File object
 */
export async function importDatFile(file: File): Promise<DatFileResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        resolve({
          success: false,
          format: 'unknown',
          version: '',
          error: 'Failed to read file content',
          warnings: [],
        });
        return;
      }
      
      resolve(parseDatFile(content, file.name));
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        format: 'unknown',
        version: '',
        error: 'Failed to read file',
        warnings: [],
      });
    };
    
    reader.readAsText(file);
  });
}
