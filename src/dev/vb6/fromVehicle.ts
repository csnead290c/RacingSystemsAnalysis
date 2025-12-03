/**
 * Vehicle → VB6 Fixture Adapter
 * 
 * Converts a Vehicle object (from the Vehicle Editor/store) into a
 * Vb6VehicleFixture that the existing simulation pipeline expects.
 */

import type { Vb6VehicleFixture } from '../../domain/physics/vb6/fixtures';

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
 * Priority: engineParams.powerHP > engineParams.torqueCurve > engineHP
 */
function buildEngineHP(v: Vehicle): [number, number][] {
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

  // 3) engineHP (VB6 legacy format)
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

  if (points.length < 2) {
    throw new Error('fromVehicleToVB6Fixture: missing usable power curve');
  }

  // Sort by rpm ascending and convert to tuples
  return points
    .sort((a, b) => a.rpm - b.rpm)
    .map(p => [p.rpm, p.hp] as [number, number]);
}

/**
 * Build gear ratios array from available sources.
 */
function buildGearRatios(v: Vehicle): number[] {
  const dt = v.drivetrain;
  if (dt?.gearRatios && dt.gearRatios.length > 0) {
    return [...dt.gearRatios];
  }
  if (dt?.ratios && dt.ratios.length > 0) {
    return [...dt.ratios];
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
 * Convert a Vehicle object to a Vb6VehicleFixture.
 * Provides sensible defaults for sparse vehicles.
 */
export function fromVehicleToVB6Fixture(v: Vehicle): Vb6VehicleFixture {
  // Defaults
  const weightLb = v.weightLb ?? 2400;
  const frontalArea_ft2 = v.frontalArea_ft2 ?? 22;
  const cd = v.cd ?? 0.35;
  const tireDiaIn = v.tireDiaIn ?? 28;
  const tireWidthIn = v.tireWidthIn ?? 14;
  const tireRolloutIn = v.tireRolloutIn ?? (tireDiaIn * Math.PI);
  const wheelbase_in = v.wheelbase_in ?? 108;
  const rollout_in = v.rollout_in ?? 9;
  const liftCoeff = v.liftCoeff ?? 0.1;

  // Drivetrain
  const dt = v.drivetrain ?? {};
  const finalDrive = dt.finalDrive ?? 3.73;
  const overallEff = dt.overallEff ?? dt.overallEfficiency ?? 0.97;
  const gearRatios = buildGearRatios(v);
  const perGearEff = buildPerGearEff(gearRatios.length, dt.perGearEff);
  const shiftsRPM = dt.shiftsRPM ?? dt.shiftRPM ?? Array(gearRatios.length - 1).fill(9000);

  // Engine
  const engineHP = buildEngineHP(v);

  // Environment
  const env = v.env ?? {};
  const temperature_F = env.temperature_F ?? env.dryBulb_F ?? 75;

  // PMI defaults (typical values)
  const pmi = v.pmi ?? {};

  // Fuel
  const fuel = v.fuel ?? {};

  // Build clutch/converter
  let clutch: Vb6VehicleFixture['drivetrain']['clutch'] | undefined;
  let converter: Vb6VehicleFixture['drivetrain']['converter'] | undefined;

  if (dt.clutch) {
    clutch = {
      launchRPM: dt.clutch.launchRPM ?? dt.clutch.slipRPM ?? 7000,
      slipRPM: dt.clutch.slipRPM ?? 7500,
      slippageFactor: dt.clutch.slippageFactor ?? 1.004,
      lockup: dt.clutch.lockup ?? false,
    };
  } else if (dt.converter) {
    converter = {
      stallRPM: dt.converter.stallRPM ?? 5000,
      torqueMult: dt.converter.torqueMult ?? 2.2,
      slippageFactor: dt.converter.slippageFactor ?? 1.05,
      lockup: dt.converter.lockup ?? false,
    };
  }
  // If neither provided, don't synthesize - let validation catch it downstream

  const fixture: Vb6VehicleFixture = {
    env: {
      elevation_ft: env.elevation_ft ?? 0,
      barometer_inHg: env.barometer_inHg ?? 29.92,
      temperature_F,
      relHumidity_pct: env.relHumidity_pct ?? 50,
      wind_mph: env.wind_mph ?? 0,
      wind_angle_deg: env.wind_angle_deg ?? env.wind_dir_deg ?? 0,
      trackTemp_F: env.trackTemp_F ?? 100,
      tractionIndex: env.tractionIndex ?? 3,
    },
    vehicle: {
      weight_lb: weightLb,
      wheelbase_in,
      overhang_in: 40, // Default overhang
      rollout_in,
      tire: {
        rollout_in: tireRolloutIn,
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
      type: fuel.type ?? 'Gasoline',
      hpTorqueMultiplier: fuel.hpTorqueMultiplier ?? 1.0,
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

  // Check tire diameter (rollout_in / PI gives diameter)
  const tireRollout = fixture.vehicle?.tire?.rollout_in;
  if (tireRollout) {
    const tireDia = tireRollout / Math.PI;
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
