/**
 * Vehicle → VB6 Fixture Adapter
 * 
 * Converts a Vehicle object (from the Vehicle Editor/store) into a
 * Vb6VehicleFixture that the existing simulation pipeline expects.
 * 
 * Supports both QuarterPro (full HP curve) and QuarterJr (peak HP/RPM only) modes.
 * When no HP curve is available, uses the VB6 ENGINE subroutine to build
 * a synthetic curve from peak HP, peak RPM, and displacement.
 */

import type { Vb6VehicleFixture } from '../../domain/physics/vb6/fixtures';
import { buildEngineCurve, convertToZeroIndexed } from '../../domain/physics/vb6/engineCurve';
import { calculateQuarterJr, getAeroByBodyStyle, type QuarterJrInputs } from '../../domain/physics/vb6/quarterJr';

/**
 * Vehicle type matching what we persist in the Vehicle Editor.
 */
export type Vehicle = {
  id: string;
  name?: string;
  
  // Common fields
  weightLb?: number;
  frontalArea_ft2?: number;
  cd?: number;
  tireDiaIn?: number;
  tireWidthIn?: number;
  tireRolloutIn?: number;
  wheelbase_in?: number;
  rollout_in?: number;
  liftCoeff?: number;

  drivetrain?: {
    gearRatios?: number[];
    ratios?: number[];             // tolerate either
    finalDrive?: number;
    shiftsRPM?: number[];          // alias to shiftRPM
    shiftRPM?: number[];
    perGearEff?: number[];
    overallEff?: number;
    overallEfficiency?: number;    // tolerate either
    clutch?: { slipRPM?: number; launchRPM?: number; slippageFactor?: number; lockup?: boolean } | null;
    converter?: { stallRPM?: number; torqueMult?: number; slippageFactor?: number; lockup?: boolean } | null;
  };

  engineParams?: {
    powerHP?: Array<{ rpm: number; hp: number }>;
    torqueCurve?: Array<{ rpm: number; hp?: number; torque?: number; tq_lbft?: number }>;
  };

  engineHP?: Array<[number, number] | { rpm: number; hp: number }>; // VB6 legacy

  env?: {
    elevation_ft?: number;
    barometer_inHg?: number;
    temperature_F?: number;
    dryBulb_F?: number;
    wetBulb_F?: number;
    relHumidity_pct?: number;
    wind_mph?: number;
    wind_dir_deg?: number;
    wind_angle_deg?: number;
    trackTemp_F?: number;
    tractionIndex?: number;
  };

  pmi?: {
    engine_flywheel_clutch?: number;
    transmission_driveshaft?: number;
    tires_wheels_ringgear?: number;
  };

  fuel?: {
    type?: string;
    hpTorqueMultiplier?: number;
  };
};

/**
 * Convert a torque curve point to HP.
 * If hp is present, use it. Otherwise convert torque via hp = torque * rpm / 5252.
 */
function torquePtToHP(pt: { rpm: number; hp?: number; torque?: number; tq_lbft?: number }): { rpm: number; hp: number } | null {
  const rpm = Number(pt.rpm);
  if (!Number.isFinite(rpm)) return null;

  if (Number.isFinite(pt.hp)) {
    return { rpm, hp: Number(pt.hp) };
  }
  if (Number.isFinite(pt.torque)) {
    return { rpm, hp: (Number(pt.torque) * rpm) / 5252 };
  }
  if (Number.isFinite(pt.tq_lbft)) {
    return { rpm, hp: (Number(pt.tq_lbft) * rpm) / 5252 };
  }
  return null;
}

/**
 * Build engineHP tuples from the best available source.
 * Priority: engineParams.powerHP > engineParams.torqueCurve > hpCurve > engineHP > synthetic (QuarterJr)
 * Handles both nested engineParams and flat Vehicle schema fields.
 * 
 * If no HP curve is available but peak HP/RPM are provided, uses the VB6 ENGINE
 * subroutine to build a synthetic curve (QuarterJr mode).
 */
function buildEngineHP(v: Vehicle): [number, number][] {
  const vAny = v as any;
  let points: { rpm: number; hp: number }[] = [];

  // 1) engineParams.powerHP
  if (v.engineParams?.powerHP && v.engineParams.powerHP.length >= 2) {
    points = v.engineParams.powerHP
      .filter(p => Number.isFinite(p.rpm) && Number.isFinite(p.hp))
      .map(p => ({ rpm: Number(p.rpm), hp: Number(p.hp) }));
  }

  // 2) engineParams.torqueCurve
  if (points.length < 2 && v.engineParams?.torqueCurve && v.engineParams.torqueCurve.length >= 2) {
    points = v.engineParams.torqueCurve
      .map(torquePtToHP)
      .filter((p): p is { rpm: number; hp: number } => p !== null);
  }

  // 3) hpCurve (flat Vehicle schema field)
  if (points.length < 2 && vAny.hpCurve && vAny.hpCurve.length >= 2) {
    points = vAny.hpCurve
      .filter((p: any) => Number.isFinite(p.rpm) && Number.isFinite(p.hp))
      .map((p: any) => ({ rpm: Number(p.rpm), hp: Number(p.hp) }));
  }

  // 4) engineHP (VB6 legacy format)
  if (points.length < 2 && v.engineHP && v.engineHP.length >= 2) {
    points = v.engineHP
      .map(pt => {
        if (Array.isArray(pt)) {
          return { rpm: Number(pt[0]), hp: Number(pt[1]) };
        }
        return { rpm: Number(pt.rpm), hp: Number(pt.hp) };
      })
      .filter(p => Number.isFinite(p.rpm) && Number.isFinite(p.hp));
  }

  // 5) QuarterJr mode: Build synthetic curve from peak HP/RPM
  if (points.length < 2) {
    // Try multiple field names for peak HP (Vehicle schema uses powerHP)
    const peakHP = vAny.powerHP ?? vAny.peakHP ?? vAny.peak_hp ?? vAny.hp ?? vAny.engineParams?.peakHP ?? vAny.engineParams?.powerHP;
    // Try multiple field names for peak RPM
    const peakRPM = vAny.rpmAtPeakHP ?? vAny.peakRPM ?? vAny.peak_rpm ?? vAny.engineParams?.peakRPM ?? vAny.engineParams?.rpmAtPeakHP ?? 6500;
    // Try multiple field names for displacement
    const displacement = vAny.displacementCID ?? vAny.displacement ?? vAny.displacement_cid ?? vAny.engineParams?.displacement ?? 350;
    const fuelSystem = vAny.fuelSystem ?? vAny.fuel_system ?? vAny.fuel?.type ?? 1;
    
    // Convert fuel type string to number if needed
    let fuelSystemNum = 1;
    if (typeof fuelSystem === 'number') {
      fuelSystemNum = fuelSystem;
    } else if (typeof fuelSystem === 'string') {
      const fs = fuelSystem.toLowerCase();
      if (fs.includes('nitro')) fuelSystemNum = 8;
      else if (fs.includes('supercharg') || fs.includes('blown')) fuelSystemNum = 6;
      else if (fs.includes('turbo')) fuelSystemNum = 6;
      else fuelSystemNum = 1; // naturally aspirated
    }
    
    if (Number.isFinite(peakHP) && peakHP > 0) {
      console.log('[fromVehicleToVB6Fixture] QuarterJr mode: building synthetic HP curve from peak HP/RPM', {
        peakHP, peakRPM, displacement, fuelSystem: fuelSystemNum
      });
      
      const curve = buildEngineCurve({
        peakHP,
        peakRPM,
        displacement_cid: displacement,
        fuelSystem: fuelSystemNum,
      });
      
      const { rpm, hp } = convertToZeroIndexed(curve);
      points = rpm.map((r, i) => ({ rpm: r, hp: hp[i] }));
    }
  }

  if (points.length < 2) {
    throw new Error('fromVehicleToVB6Fixture: missing usable power curve (need hpCurve with at least 2 points)');
  }

  // Sort by rpm ascending and convert to tuples
  return points
    .sort((a, b) => a.rpm - b.rpm)
    .map(p => [p.rpm, p.hp] as [number, number]);
}

/**
 * Build gear ratios array from available sources.
 * Handles both nested drivetrain object and flat Vehicle schema fields.
 */
function buildGearRatios(v: Vehicle): number[] {
  const vAny = v as any;
  const dt = v.drivetrain;
  
  // Check nested drivetrain object first
  if (dt?.gearRatios && dt.gearRatios.length > 0) {
    return [...dt.gearRatios];
  }
  if (dt?.ratios && dt.ratios.length > 0) {
    return [...dt.ratios];
  }
  
  // Check flat Vehicle schema fields
  if (vAny.gearRatios && vAny.gearRatios.length > 0) {
    return [...vAny.gearRatios];
  }
  
  // Default 5-speed
  return [2.6, 1.9, 1.5, 1.2, 1.0];
}

/**
 * Build per-gear efficiency array.
 * VB6 formula: TGEff(i) = 0.99 - (NGR - i) * 0.005
 */
function buildPerGearEff(gearCount: number, provided?: number[]): number[] {
  if (provided && provided.length >= gearCount) {
    return [...provided];
  }
  // Generate VB6-style per-gear efficiency
  return Array.from({ length: gearCount }, (_, i) => 
    0.99 - (gearCount - 1 - i) * 0.005
  );
}

/**
 * Detect if we're in QuarterJr mode (no HP curve provided, only peak HP/RPM)
 */
function isQuarterJrMode(v: Vehicle): boolean {
  const vAny = v as any;
  
  // Check if we have a full HP curve
  const hasHPCurve = (
    (v.engineParams?.powerHP && v.engineParams.powerHP.length >= 2) ||
    (v.engineParams?.torqueCurve && v.engineParams.torqueCurve.length >= 2) ||
    (vAny.hpCurve && vAny.hpCurve.length >= 2) ||
    (v.engineHP && v.engineHP.length >= 2)
  );
  
  // QuarterJr mode = no HP curve but has peak HP
  const peakHP = vAny.powerHP ?? vAny.peakHP ?? vAny.peak_hp ?? vAny.hp;
  return !hasHPCurve && Number.isFinite(peakHP) && peakHP > 0;
}

/**
 * Map fuel system string to VB6 fuel system number
 */
function mapFuelSystemToNumber(fuelSystem: string | number | undefined): number {
  if (typeof fuelSystem === 'number') return fuelSystem;
  if (!fuelSystem) return 1;
  
  const fs = fuelSystem.toUpperCase();
  
  // Handle unified fuel type values (new format)
  if (fs === 'GASOLINE') return 1;
  if (fs === 'GASOLINE EFI') return 2;
  if (fs === 'METHANOL') return 3;
  if (fs === 'METHANOL EFI') return 4;
  if (fs === 'NITROMETHANE') return 5;
  if (fs === 'SUPERCHARGED GASOLINE') return 6;
  if (fs === 'SUPERCHARGED METHANOL') return 7;
  if (fs === 'SUPERCHARGED NITRO') return 8;
  if (fs === 'E85' || fs === 'DIESEL') return 1;
  
  // Handle VB6-style fuel system strings (legacy format)
  if (fs === 'GAS+CARB' || (fs.includes('GASOLINE') && fs.includes('CARB'))) return 1;
  if (fs === 'GAS+INJECT' || (fs.includes('GASOLINE') && fs.includes('INJECT'))) return 2;
  if (fs === 'METHANOL+CARB' || (fs.includes('METHANOL') && fs.includes('CARB'))) return 3;
  if (fs === 'METHANOL+INJECT' || (fs.includes('METHANOL') && fs.includes('INJECT'))) return 4;
  if (fs === 'NITRO+INJECT' || (fs.includes('NITRO') && fs.includes('INJECT'))) return 5;
  if (fs === 'GAS+SUPERCHARGED' || (fs.includes('GASOLINE') && fs.includes('SUPERCHARG'))) return 6;
  if (fs === 'METHANOL+SUPERCHARGED' || (fs.includes('METHANOL') && fs.includes('SUPERCHARG'))) return 7;
  if (fs === 'NITRO+SUPERCHARGED' || (fs.includes('NITRO') && fs.includes('SUPERCHARG'))) return 8;
  if (fs === 'ELECTRIC') return 9;
  
  // Legacy simple fuel types (fallback)
  if (fs.includes('SUPERCHARG') || fs.includes('BLOWN')) {
    if (fs.includes('NITRO')) return 8;
    if (fs.includes('METHANOL') || fs.includes('ALCOHOL')) return 7;
    return 6;
  }
  if (fs.includes('NITRO')) return 5;
  if (fs.includes('METHANOL') || fs.includes('ALCOHOL')) return 3;
  
  return 1; // Default: Gas + Carb
}

/**
 * Convert a Vehicle object to a Vb6VehicleFixture.
 * Provides sensible defaults for sparse vehicles.
 * Handles both snake_case and camelCase field names for compatibility.
 * 
 * When in QuarterJr mode (no HP curve, only peak HP/RPM), uses the VB6
 * QuarterJr calculations to derive transmission efficiencies, converter
 * parameters, PMI values, and aero coefficients.
 */
export function fromVehicleToVB6Fixture(v: Vehicle): Vb6VehicleFixture {
  // Cast to any to access fields with different naming conventions
  const vAny = v as any;
  
  // Defaults - handle both snake_case and camelCase field names
  const weightLb = v.weightLb ?? vAny.weight_lb ?? 2400;
  const tireDiaIn = v.tireDiaIn ?? vAny.tire_dia_in ?? 28;
  const tireWidthIn = v.tireWidthIn ?? vAny.tire_width_in ?? 14;
  const wheelbase_in = v.wheelbase_in ?? vAny.wheelbaseIn ?? 108;
  const rollout_in = v.rollout_in ?? vAny.rolloutIn ?? vAny.tireRolloutIn ?? 9;
  
  // Drivetrain - handle both nested drivetrain object and flat Vehicle schema fields
  const dt = v.drivetrain ?? {};
  const finalDrive = dt.finalDrive ?? vAny.rearGear ?? vAny.finalDrive ?? 3.73;
  const gearRatios = buildGearRatios(v);
  
  // Determine transmission type from flat field or nested structure
  const transmissionType = vAny.transmissionType ?? (dt.converter ? 'converter' : 'clutch');
  const isConverter = transmissionType === 'converter';
  
  // Environment
  const env = v.env ?? {};
  const temperature_F = env.temperature_F ?? env.dryBulb_F ?? 75;
  
  // Fuel system - prioritize fuelType (modern) over fuelSystem (legacy)
  const fuelSystem = vAny.fuelType ?? vAny.fuelSystem ?? vAny.fuel?.type ?? v.fuel?.type ?? 'Gasoline';
  const fuelSystemNum = mapFuelSystemToNumber(fuelSystem);
  
  // Check if we're in QuarterJr mode
  if (isQuarterJrMode(v)) {
    console.log('[fromVehicleToVB6Fixture] QuarterJr mode detected - using VB6 QuarterJr calculations');
    
    const peakHP = vAny.powerHP ?? vAny.peakHP ?? vAny.peak_hp ?? vAny.hp ?? 400;
    const peakRPM = vAny.rpmAtPeakHP ?? vAny.peakRPM ?? vAny.peak_rpm ?? 6500;
    const displacement = vAny.displacementCID ?? vAny.displacement ?? vAny.displacement_cid ?? 350;
    const shiftRPM = vAny.shiftRPMs?.[0] ?? vAny.shiftRPM ?? peakRPM;
    const bodyStyle = vAny.bodyStyle ?? 2; // Default to dragster (2) for QuarterJr
    const converterDia = vAny.converterDiameterIn ?? (dt.converter as any)?.diameter ?? 10;
    const stallRPM = vAny.converterStallRPM ?? dt.converter?.stallRPM ?? 5000;
    const slipRPM = vAny.clutchSlipRPM ?? dt.clutch?.slipRPM ?? 6500;
    
    // Build QuarterJr inputs
    const qjInputs: QuarterJrInputs = {
      peakHP,
      rpmAtPeakHP: peakRPM,
      displacement_cid: displacement,
      fuelSystem: fuelSystemNum as any,
      weight_lbf: weightLb,
      wheelbase_in,
      tireDia_in: tireDiaIn,
      tireWidth_in: tireWidthIn,
      rollout_in,
      isConverter,
      gearRatios,
      finalDrive,
      converterDia_in: converterDia,
      slipStallRPM: isConverter ? stallRPM : slipRPM,
      slipRPM,
      bodyStyle,
      shiftRPM,
    };
    
    // Calculate QuarterJr outputs
    const qjOut = calculateQuarterJr(qjInputs);
    
    console.log('[fromVehicleToVB6Fixture] QuarterJr outputs:', {
      NHP: qjOut.NHP,
      transEff: qjOut.transEff,
      torqueMult: qjOut.torqueMult,
      slippage: qjOut.slippage,
      enginePMI: qjOut.enginePMI,
      transPMI: qjOut.transPMI,
      tiresPMI: qjOut.tiresPMI,
      dragCoef: qjOut.dragCoef,
      liftCoef: qjOut.liftCoef,
    });
    
    // Build engineHP from QuarterJr curve
    const engineHP: [number, number][] = qjOut.xrpm.map((rpm, i) => [rpm, qjOut.yhp[i]]);
    
    // Get aero from body style
    const aero = getAeroByBodyStyle(bodyStyle);
    const frontalArea_ft2 = v.frontalArea_ft2 ?? vAny.frontalAreaFt2 ?? 22;
    
    // Build clutch/converter from QuarterJr calculations
    let clutch: Vb6VehicleFixture['drivetrain']['clutch'] | undefined;
    let converter: Vb6VehicleFixture['drivetrain']['converter'] | undefined;
    
    if (!isConverter) {
      clutch = {
        launchRPM: qjOut.launchRPM,
        slipRPM: qjOut.stallRPM,
        slippageFactor: qjOut.slippage,
        lockup: vAny.clutchLockup ?? dt.clutch?.lockup ?? false,
      };
    } else {
      converter = {
        stallRPM: qjOut.stallRPM,
        torqueMult: qjOut.torqueMult,
        slippageFactor: qjOut.slippage,
        lockup: vAny.converterLockup ?? dt.converter?.lockup ?? false,
      };
    }
    
    const fixture: Vb6VehicleFixture = {
      env: {
        elevation_ft: env.elevation_ft ?? 0,
        barometer_inHg: env.barometer_inHg ?? 29.92,
        temperature_F,
        relHumidity_pct: env.relHumidity_pct ?? 50,
        wind_mph: env.wind_mph ?? 0,
        wind_angle_deg: env.wind_angle_deg ?? env.wind_dir_deg ?? 0,
        trackTemp_F: env.trackTemp_F ?? 100,
        tractionIndex: env.tractionIndex ?? 5,
      },
      vehicle: {
        weight_lb: weightLb,
        wheelbase_in,
        overhang_in: aero.overhang_in,
        rollout_in,
        staticFrontWeight_lb: weightLb * 0.38,
        cgHeight_in: tireDiaIn / 2 + 3.75,
        bodyStyle,
        tire: {
          diameter_in: tireDiaIn,
          width_in: tireWidthIn,
        },
      },
      aero: {
        frontalArea_ft2,
        Cd: qjOut.dragCoef,
        Cl: qjOut.liftCoef,
      },
      drivetrain: {
        finalDrive,
        overallEfficiency: qjOut.efficiency,
        gearRatios,
        perGearEff: qjOut.transEff,
        shiftsRPM: qjOut.shiftRPMs,
        ...(clutch ? { clutch } : {}),
        ...(converter ? { converter } : {}),
      },
      pmi: {
        engine_flywheel_clutch: qjOut.enginePMI,
        transmission_driveshaft: qjOut.transPMI,
        tires_wheels_ringgear: qjOut.tiresPMI,
      },
      engineHP,
      fuel: {
        type: fuelSystem,
        hpTorqueMultiplier: vAny.hpTorqueMultiplier ?? v.fuel?.hpTorqueMultiplier ?? 1.0,
      },
    };
    
    // Also add ratios alias and shiftRPM alias for compatibility
    (fixture.drivetrain as any).ratios = gearRatios;
    (fixture.drivetrain as any).shiftRPM = qjOut.shiftRPMs;
    
    return fixture;
  }
  
  // ============================================
  // QuarterPro mode (full HP curve provided)
  // ============================================
  
  const frontalArea_ft2 = v.frontalArea_ft2 ?? vAny.frontalAreaFt2 ?? 22;
  const cd = v.cd ?? vAny.dragCoef ?? 0.35;
  const liftCoeff = v.liftCoeff ?? vAny.liftCoef ?? 0.1;
  const overhang_in = vAny.overhangIn ?? vAny.overhang_in ?? 40;
  const overallEff = dt.overallEff ?? dt.overallEfficiency ?? vAny.transEfficiency ?? 0.97;
  const perGearEff = buildPerGearEff(gearRatios.length, dt.perGearEff ?? vAny.gearEfficiencies);
  const shiftsRPM = dt.shiftsRPM ?? dt.shiftRPM ?? vAny.shiftRPMs ?? Array(gearRatios.length - 1).fill(9000);

  // Engine
  const engineHP = buildEngineHP(v);

  // PMI defaults (typical values)
  const pmi = v.pmi ?? {};

  // Fuel - prioritize flat fuelType field over nested fuel.type
  const fuel = v.fuel ?? {};
  const fuelTypeValue = vAny.fuelType ?? fuel.type ?? 'Gasoline';
  
  console.log('[fromVehicleToVB6Fixture] Fuel type resolution:', {
    'vAny.fuelType': vAny.fuelType,
    'fuel.type': fuel.type,
    'resolved': fuelTypeValue,
  });

  // Build clutch/converter - handle both nested and flat Vehicle schema fields
  let clutch: Vb6VehicleFixture['drivetrain']['clutch'] | undefined;
  let converter: Vb6VehicleFixture['drivetrain']['converter'] | undefined;

  if (dt.clutch || (transmissionType === 'clutch' && !dt.converter)) {
    // Use nested clutch or flat Vehicle schema clutch fields
    clutch = {
      launchRPM: dt.clutch?.launchRPM ?? vAny.clutchLaunchRPM ?? vAny.clutchSlipRPM ?? 7000,
      slipRPM: dt.clutch?.slipRPM ?? vAny.clutchSlipRPM ?? 7500,
      slippageFactor: dt.clutch?.slippageFactor ?? vAny.clutchSlippage ?? 1.004,
      lockup: dt.clutch?.lockup ?? vAny.clutchLockup ?? false,
    };
  } else if (dt.converter || transmissionType === 'converter') {
    // Use nested converter or flat Vehicle schema converter fields
    converter = {
      stallRPM: dt.converter?.stallRPM ?? vAny.converterStallRPM ?? 5000,
      torqueMult: dt.converter?.torqueMult ?? vAny.converterTorqueMult ?? 2.2,
      slippageFactor: dt.converter?.slippageFactor ?? vAny.converterSlippage ?? 1.05,
      lockup: dt.converter?.lockup ?? vAny.converterLockup ?? false,
    };
  }

  const fixture: Vb6VehicleFixture = {
    env: {
      elevation_ft: env.elevation_ft ?? 0,
      barometer_inHg: env.barometer_inHg ?? 29.92,
      temperature_F,
      relHumidity_pct: env.relHumidity_pct ?? 50,
      wind_mph: env.wind_mph ?? 0,
      wind_angle_deg: env.wind_angle_deg ?? env.wind_dir_deg ?? 0,
      trackTemp_F: env.trackTemp_F ?? 100,
      tractionIndex: env.tractionIndex ?? 5,
    },
    vehicle: {
      weight_lb: weightLb,
      wheelbase_in,
      overhang_in, // Use extracted overhang value
      rollout_in,
      staticFrontWeight_lb: weightLb * 0.38, // Default 38% front weight (VB6 calculates this internally)
      cgHeight_in: tireDiaIn / 2 + 3.75, // VB6 default: tire radius + 3.75"
      bodyStyle: vAny.bodyStyle ?? 1, // Car (8 = motorcycle)
      tire: {
        diameter_in: tireDiaIn,
        width_in: tireWidthIn,
      },
    },
    aero: {
      frontalArea_ft2,
      Cd: cd,
      Cl: liftCoeff,
    },
    drivetrain: {
      finalDrive,
      overallEfficiency: overallEff,
      gearRatios,
      perGearEff,
      shiftsRPM,
      ...(clutch ? { clutch } : {}),
      ...(converter ? { converter } : {}),
    },
    pmi: {
      engine_flywheel_clutch: pmi.engine_flywheel_clutch ?? 3.5,
      transmission_driveshaft: pmi.transmission_driveshaft ?? 0.25,
      tires_wheels_ringgear: pmi.tires_wheels_ringgear ?? 50,
    },
    engineHP,
    fuel: {
      type: fuelTypeValue,
      hpTorqueMultiplier: fuel.hpTorqueMultiplier ?? vAny.hpTorqueMultiplier ?? 1.0,
    },
  };

  // Also add ratios alias and shiftRPM alias for compatibility
  (fixture.drivetrain as any).ratios = gearRatios;
  (fixture.drivetrain as any).shiftRPM = shiftsRPM;

  return fixture;
}

/**
 * Validation errors for adapter output.
 */
export interface AdapterValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Validate adapter output before passing to setFixture.
 * Catches common issues that would cause simulation failures.
 */
export function validateAdapterOutput(fixture: Vb6VehicleFixture): AdapterValidationResult {
  const errors: string[] = [];

  // Check engineHP
  if (!fixture.engineHP || fixture.engineHP.length < 2) {
    errors.push('engineHP must have at least 2 points');
  }

  // Check gearRatios
  if (!fixture.drivetrain?.gearRatios || fixture.drivetrain.gearRatios.length < 1) {
    errors.push('drivetrain.gearRatios must have at least 1 gear');
  }

  // Check finalDrive
  if (!Number.isFinite(fixture.drivetrain?.finalDrive) || fixture.drivetrain.finalDrive <= 0) {
    errors.push('drivetrain.finalDrive must be a positive finite number');
  }

  // Check tire diameter
  const tireDia = fixture.vehicle?.tire?.diameter_in;
  if (tireDia) {
    if (tireDia < 20 || tireDia > 36) {
      errors.push(`tire diameter (${tireDia.toFixed(1)}") must be between 20" and 36"`);
    }
  }

  // Check weight
  if (!Number.isFinite(fixture.vehicle?.weight_lb) || fixture.vehicle.weight_lb <= 0) {
    errors.push('vehicle.weight_lb must be a positive finite number');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
