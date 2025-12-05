/**
 * VB6 Fixture Types and Validation
 * 
 * Defines the exact structure required for VB6 strict mode simulation.
 * All fields are required - no defaults, no heuristics.
 */

import { type RaceLength, RACE_LENGTH_INFO } from '../../config/raceLengths';

export interface Vb6VehicleFixture {
  // Environment
  env: {
    readonly elevation_ft: number;
    readonly barometer_inHg: number;
    readonly temperature_F: number;
    readonly relHumidity_pct: number;
    readonly wind_mph: number;
    readonly wind_angle_deg: number;
    readonly trackTemp_F: number;
    readonly tractionIndex: number;
  };

  // Vehicle mass/geometry
  vehicle: {
    readonly weight_lb: number;
    readonly wheelbase_in: number;
    readonly overhang_in: number;
    readonly rollout_in: number;
    readonly staticFrontWeight_lb: number;  // gc_StaticFWt
    readonly cgHeight_in: number;           // gc_YCG (CG height above ground)
    readonly bodyStyle: number;             // gc_BodyStyle (8 = motorcycle)
    readonly tire: {
      readonly diameter_in: number;         // gc_TireDia
      readonly width_in: number;            // gc_TireWidth
    };
  };

  // Aerodynamics
  aero: {
    readonly frontalArea_ft2: number;
    readonly Cd: number;
    readonly Cl: number;
  };

  // Drivetrain
  drivetrain: {
    readonly finalDrive: number;
    readonly overallEfficiency: number;
    readonly gearRatios: readonly number[];
    readonly perGearEff: readonly number[];
    readonly shiftsRPM: readonly number[];
    readonly clutch?: {
      readonly launchRPM: number;
      readonly slipRPM: number;
      readonly slippageFactor: number;
      readonly lockup: boolean;
    };
    readonly converter?: {
      readonly stallRPM: number;
      readonly torqueMult: number;
      readonly slippageFactor: number;
      readonly lockup: boolean;
      readonly diameter_in?: number;      // gc_ConvDia (optional)
    };
  };

  // Polar moments of inertia
  pmi: {
    readonly engine_flywheel_clutch: number;
    readonly transmission_driveshaft: number;
    readonly tires_wheels_ringgear: number;
  };

  // Engine dyno curve [RPM, HP]
  readonly engineHP: readonly (readonly [number, number])[];

  // Fuel system
  fuel: {
    readonly type: string;
    readonly hpTorqueMultiplier: number;
  };
}

/**
 * Validation errors for incomplete fixtures
 */
export class Vb6FixtureValidationError extends Error {
  constructor(public missingFields: string[]) {
    super(`VB6 Strict Mode: Missing required fields: ${missingFields.join(', ')}`);
    this.name = 'Vb6FixtureValidationError';
  }
}

/**
 * Assert that a fixture is complete and valid for VB6 strict mode.
 * Throws Vb6FixtureValidationError if any required field is missing.
 */
export function assertComplete(fixture: Partial<Vb6VehicleFixture>): asserts fixture is Vb6VehicleFixture {
  const missing: string[] = [];

  // Check env
  if (!fixture.env) {
    missing.push('env');
  } else {
    if (fixture.env.elevation_ft === undefined) missing.push('env.elevation_ft');
    if (fixture.env.barometer_inHg === undefined) missing.push('env.barometer_inHg');
    if (fixture.env.temperature_F === undefined) missing.push('env.temperature_F');
    if (fixture.env.relHumidity_pct === undefined) missing.push('env.relHumidity_pct');
    if (fixture.env.wind_mph === undefined) missing.push('env.wind_mph');
    if (fixture.env.wind_angle_deg === undefined) missing.push('env.wind_angle_deg');
    if (fixture.env.trackTemp_F === undefined) missing.push('env.trackTemp_F');
    if (fixture.env.tractionIndex === undefined) missing.push('env.tractionIndex');
  }

  // Check vehicle
  if (!fixture.vehicle) {
    missing.push('vehicle');
  } else {
    if (fixture.vehicle.weight_lb === undefined) missing.push('vehicle.weight_lb');
    if (fixture.vehicle.wheelbase_in === undefined) missing.push('vehicle.wheelbase_in');
    if (fixture.vehicle.overhang_in === undefined) missing.push('vehicle.overhang_in');
    if (fixture.vehicle.rollout_in === undefined) missing.push('vehicle.rollout_in');
    if (fixture.vehicle.staticFrontWeight_lb === undefined) missing.push('vehicle.staticFrontWeight_lb');
    if (fixture.vehicle.cgHeight_in === undefined) missing.push('vehicle.cgHeight_in');
    if (fixture.vehicle.bodyStyle === undefined) missing.push('vehicle.bodyStyle');
    if (!fixture.vehicle.tire) {
      missing.push('vehicle.tire');
    } else {
      if (fixture.vehicle.tire.diameter_in === undefined) missing.push('vehicle.tire.diameter_in');
      if (fixture.vehicle.tire.width_in === undefined) missing.push('vehicle.tire.width_in');
    }
  }

  // Check aero
  if (!fixture.aero) {
    missing.push('aero');
  } else {
    if (fixture.aero.frontalArea_ft2 === undefined) missing.push('aero.frontalArea_ft2');
    if (fixture.aero.Cd === undefined) missing.push('aero.Cd');
    if (fixture.aero.Cl === undefined) missing.push('aero.Cl');
  }

  // Check drivetrain
  if (!fixture.drivetrain) {
    missing.push('drivetrain');
  } else {
    if (fixture.drivetrain.finalDrive === undefined) missing.push('drivetrain.finalDrive');
    if (fixture.drivetrain.overallEfficiency === undefined) missing.push('drivetrain.overallEfficiency');
    if (!fixture.drivetrain.gearRatios || fixture.drivetrain.gearRatios.length === 0) missing.push('drivetrain.gearRatios');
    if (!fixture.drivetrain.perGearEff || fixture.drivetrain.perGearEff.length === 0) missing.push('drivetrain.perGearEff');
    if (!fixture.drivetrain.shiftsRPM) missing.push('drivetrain.shiftsRPM');
    
    // Must have either clutch or converter
    if (!fixture.drivetrain.clutch && !fixture.drivetrain.converter) {
      missing.push('drivetrain.clutch or drivetrain.converter');
    }
  }

  // Check PMI
  if (!fixture.pmi) {
    missing.push('pmi');
  } else {
    if (fixture.pmi.engine_flywheel_clutch === undefined) missing.push('pmi.engine_flywheel_clutch');
    if (fixture.pmi.transmission_driveshaft === undefined) missing.push('pmi.transmission_driveshaft');
    if (fixture.pmi.tires_wheels_ringgear === undefined) missing.push('pmi.tires_wheels_ringgear');
  }

  // Check engine HP curve
  if (!fixture.engineHP || fixture.engineHP.length === 0) {
    missing.push('engineHP');
  }

  // Check fuel
  if (!fixture.fuel) {
    missing.push('fuel');
  } else {
    if (!fixture.fuel.type) missing.push('fuel.type');
    if (fixture.fuel.hpTorqueMultiplier === undefined) missing.push('fuel.hpTorqueMultiplier');
  }

  if (missing.length > 0) {
    throw new Vb6FixtureValidationError(missing);
  }
}

/**
 * Create an empty fixture template for the UI
 */
/**
 * Convert a complete VB6 fixture to SimInputs format for the VB6Exact model.
 * This allows VB6 Strict Mode to run simulations using the fixture data.
 */
export function fixtureToSimInputs(fixture: Vb6VehicleFixture, raceLength: RaceLength = 'QUARTER'): any {
  const raceLengthFt = RACE_LENGTH_INFO[raceLength]?.lengthFt ?? 1320;
  
  return {
    vehicle: {
      id: 'vb6-fixture',
      name: 'VB6 Fixture',
      defaultRaceLength: raceLength,
      weightLb: fixture.vehicle.weight_lb,
      staticFrontWeightLb: fixture.vehicle.staticFrontWeight_lb,
      wheelbaseIn: fixture.vehicle.wheelbase_in,
      overhangIn: fixture.vehicle.overhang_in,
      cgHeightIn: fixture.vehicle.cgHeight_in,
      rolloutIn: fixture.vehicle.rollout_in,
      bodyStyle: fixture.vehicle.bodyStyle,
      tireDiaIn: fixture.vehicle.tire.diameter_in,
      tireWidthIn: fixture.vehicle.tire.width_in,
      frontalAreaFt2: fixture.aero.frontalArea_ft2,
      cd: fixture.aero.Cd,
      liftCoeff: fixture.aero.Cl,
      rearGear: fixture.drivetrain.finalDrive,
      transEfficiency: fixture.drivetrain.overallEfficiency,
      gearRatios: [...fixture.drivetrain.gearRatios],
      gearEfficiencies: [...fixture.drivetrain.perGearEff],
      shiftRPMs: [...fixture.drivetrain.shiftsRPM],
      // Clutch or converter
      transmissionType: fixture.drivetrain.converter ? 'converter' : 'clutch',
      clutchLaunchRPM: fixture.drivetrain.clutch?.launchRPM,
      clutchSlipRPM: fixture.drivetrain.clutch?.slipRPM,
      clutchSlippage: fixture.drivetrain.clutch?.slippageFactor,
      clutchLockup: fixture.drivetrain.clutch?.lockup,
      converterStallRPM: fixture.drivetrain.converter?.stallRPM,
      converterTorqueMult: fixture.drivetrain.converter?.torqueMult,
      converterSlippage: fixture.drivetrain.converter?.slippageFactor,
      converterDiameterIn: fixture.drivetrain.converter?.diameter_in,
      converterLockup: fixture.drivetrain.converter?.lockup,
      // PMI
      enginePMI: fixture.pmi.engine_flywheel_clutch,
      transPMI: fixture.pmi.transmission_driveshaft,
      tiresPMI: fixture.pmi.tires_wheels_ringgear,
      // Engine - use peak HP for powerHP, full curve for hpCurve
      powerHP: Math.max(...fixture.engineHP.map(pt => pt[1])),
      hpCurve: fixture.engineHP.map(([rpm, hp]) => ({ rpm, hp })),
      hpTorqueMultiplier: fixture.fuel.hpTorqueMultiplier,
      fuelType: fixture.fuel.type,
    },
    env: {
      // Use field names expected by vb6Exact.ts
      elevation: fixture.env.elevation_ft,
      barometerInHg: fixture.env.barometer_inHg,
      temperatureF: fixture.env.temperature_F,
      humidityPct: fixture.env.relHumidity_pct,
      windMph: fixture.env.wind_mph,
      windAngleDeg: fixture.env.wind_angle_deg,
      trackTempF: fixture.env.trackTemp_F,
      tractionIndex: fixture.env.tractionIndex,
    },
    raceLength,
    raceLengthFt,
  };
}

export function createEmptyFixture(): Partial<Vb6VehicleFixture> {
  return {
    env: {
      elevation_ft: 0,
      barometer_inHg: 29.92,
      temperature_F: 75,
      relHumidity_pct: 50,
      wind_mph: 0,
      wind_angle_deg: 0,
      trackTemp_F: 100,
      tractionIndex: 3,
    },
    vehicle: {
      weight_lb: 0,
      wheelbase_in: 0,
      overhang_in: 0,
      rollout_in: 9,
      staticFrontWeight_lb: 0,
      cgHeight_in: 0,
      bodyStyle: 1,
      tire: {
        diameter_in: 0,
        width_in: 0,
      },
    },
    aero: {
      frontalArea_ft2: 0,
      Cd: 0,
      Cl: 0,
    },
    drivetrain: {
      finalDrive: 0,
      overallEfficiency: 0.97,
      gearRatios: [],
      perGearEff: [],
      shiftsRPM: [],
    },
    pmi: {
      engine_flywheel_clutch: 0,
      transmission_driveshaft: 0,
      tires_wheels_ringgear: 0,
    },
    engineHP: [],
    fuel: {
      type: '',
      hpTorqueMultiplier: 1.0,
    },
  };
}
