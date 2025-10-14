/**
 * VB6 Fixture Adapter
 * 
 * Converts VB6 UI fixtures into the format expected by the simulation engine.
 * Handles field mapping, defaults, and validation.
 */

import type { VB6Fixture } from '../validation/vb6Fixture';

type PowerPt = { rpm: number; hp: number };

/**
 * Convert VB6 engineHP array to power curve format.
 * Handles both tuple format [[rpm, hp]] and object format [{rpm, hp}].
 * Applies fuel multiplier if present.
 */
export function toPowerCurveFromVB6(fx: VB6Fixture): PowerPt[] {
  const m = fx?.fuel?.hpTorqueMultiplier ?? 1;
  const engineHP = fx.engineHP ?? [];
  
  const curve = engineHP.map(p => {
    // Handle both tuple [rpm, hp] and object {rpm, hp} formats
    if (Array.isArray(p)) {
      return {
        rpm: Number(p[0]),
        hp: Number(p[1]) * m,
      };
    } else {
      return {
        rpm: Number((p as any).rpm),
        hp: Number((p as any).hp) * m,
      };
    }
  })
  .filter(p => Number.isFinite(p.rpm) && Number.isFinite(p.hp))
  .sort((a, b) => a.rpm - b.rpm);

  if (curve.length < 2) {
    throw new Error("VB6 fixture missing engineHP curve (>=2 points required).");
  }
  return curve;
}

/**
 * Infer redline RPM from power curve.
 * Uses highest RPM point + 100 as a safe margin.
 */
export function inferRedlineRPM(curve: PowerPt[]): number {
  return (curve[curve.length - 1]?.rpm ?? 8000) + 100;
}

/**
 * Build engine parameters object for simulation.
 */
export function toEngineParams(fx: VB6Fixture) {
  const powerHP = toPowerCurveFromVB6(fx);
  return {
    powerHP,                // REQUIRED for worker
    redlineRPM: inferRedlineRPM(powerHP),
    idleRPM: 900,           // harmless default; VB6 doesn't use it in RSACLASSIC
  };
}

/**
 * Build drivetrain object the sim expects.
 * Includes ratios, per-gear efficiency, final drive, overall efficiency, clutch/converter.
 */
export function toDrivetrainParams(fx: VB6Fixture) {
  const gr = fx.drivetrain?.gearRatios ?? [];
  const ge = fx.drivetrain?.perGearEff ?? [];
  if (!gr.length || !ge.length || gr.length !== ge.length) {
    throw new Error("VB6 fixture must provide gearRatios and perGearEff of equal length.");
  }
  return {
    gearRatios: gr,
    perGearEff: ge,
    finalDrive: (fx as any).finalDrive?.ratio ?? fx.drivetrain?.finalDrive ?? 3.73,
    overallEff: (fx as any).finalDrive?.efficiency ?? fx.drivetrain?.efficiency ?? 0.97,
    clutch: fx.drivetrain?.clutch,
    converter: fx.drivetrain?.converter,
    shiftRPM: fx.drivetrain?.shiftRPM,  // array or single number—pass through
  };
}

/**
 * Ensure PMI values exist with defaults.
 * Uses snake_case field names to match fixture format.
 */
export function ensurePMI(fx: VB6Fixture) {
  const p = fx.pmi as any ?? {};
  return {
    engine_flywheel_clutch: p.engine_flywheel_clutch ?? 3.42,
    transmission_driveshaft: p.transmission_driveshaft ?? 0.247,
    tires_wheels_ringgear: p.tires_wheels_ringgear ?? 50.8,
  };
}

/**
 * Normalize environment parameters with defaults.
 */
export function normalizeEnv(fx: VB6Fixture) {
  const env = fx.environment ?? {};
  return {
    elevationFt: (env as any).elevation_ft ?? (env as any).elevation ?? 0,
    baroInHg: (env as any).barometer_inHg ?? (env as any).barometer ?? 29.92,
    tempF: (env as any).temp_F ?? (env as any).temperature ?? 59,
    rhPct: (env as any).rel_humidity_pct ?? (env as any).humidity ?? 0,
    windMPH: (env as any).wind_mph ?? (env as any).windVelocity ?? 0,
    windDeg: (env as any).wind_angle_deg ?? (env as any).windAngle ?? 0,
    trackTempF: (env as any).trackTemp_F ?? (env as any).trackTemp ?? 80,
    tractionIdx: (env as any).tractionIndex ?? 3,
  };
}

/**
 * Convert VB6 fixture to simulation input format.
 * Main entry point for fixture adaptation.
 */
export function toSimInputFromVB6(fx: VB6Fixture, distanceFt: number) {
  const engineParams = toEngineParams(fx);
  const drivetrain = toDrivetrainParams(fx);
  const pmi = ensurePMI(fx);
  const env = normalizeEnv(fx);

  // Determine race length from distance
  const raceLength = distanceFt <= 660 ? 'EIGHTH' : 'QUARTER';

  // Minimal vehicle block (only the fields RSACLASSIC actually reads)
  const veh = fx.vehicle ?? {};
  const vehicle = {
    weightLb: (veh as any).weight_lb ?? (veh as any).weight ?? (fx as any).weight ?? 2400,
    wheelbaseIn: (veh as any).wheelbase_in ?? (veh as any).wheelbase ?? 107,
    tireRolloutIn: (fx as any).finalDrive?.tireRolloutIn ?? (veh as any).tire_rollout_in ?? (veh as any).rollout ?? 102.5,
    tireWidthIn: (fx as any).finalDrive?.tireWidthIn ?? (veh as any).tire_width_in ?? (veh as any).tireWidth ?? 17,
    frontalAreaFt2: (fx as any).aero?.frontalArea ?? (veh as any).frontalArea_ft2 ?? 18.2,
    Cd: (fx as any).aero?.cd ?? (veh as any).Cd ?? 0.24,
    Cl: (fx as any).aero?.cl ?? (veh as any).Cl ?? 0.10,
    overhangIn: (veh as any).overhang_in ?? (veh as any).overhang ?? 40,
  };

  return {
    model: "RSACLASSIC",
    distanceFt,
    raceLength: raceLength as 'EIGHTH' | 'QUARTER',
    env,
    vehicle,
    drivetrain,
    engineParams,
    pmi,
    fuel: fx.fuel, // keep for multiplier auditing
  } as any;
}
