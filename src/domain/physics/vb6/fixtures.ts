/**
 * VB6 Fixture Types and Validation
 * 
 * Defines the exact structure required for VB6 strict mode simulation.
 * All fields are required - no defaults, no heuristics.
 */

export interface Vb6VehicleFixture {
  // Environment
  env: {
    elevation_ft: number;
    barometer_inHg: number;
    temperature_F: number;
    relHumidity_pct: number;
    wind_mph: number;
    wind_angle_deg: number;
    trackTemp_F: number;
    tractionIndex: number;
  };

  // Vehicle mass/geometry
  vehicle: {
    weight_lb: number;
    wheelbase_in: number;
    overhang_in: number;
    rollout_in: number;
    tire: {
      rollout_in: number;
      width_in: number;
    };
  };

  // Aerodynamics
  aero: {
    frontalArea_ft2: number;
    Cd: number;
    Cl: number;
  };

  // Drivetrain
  drivetrain: {
    finalDrive: number;
    overallEfficiency: number;
    gearRatios: number[];
    perGearEff: number[];
    shiftsRPM: number[];
    clutch?: {
      launchRPM: number;
      slipRPM: number;
      slippageFactor: number;
      lockup: boolean;
    };
    converter?: {
      stallRPM: number;
      torqueMult: number;
      slippageFactor: number;
      lockup: boolean;
    };
  };

  // Polar moments of inertia
  pmi: {
    engine_flywheel_clutch: number;
    transmission_driveshaft: number;
    tires_wheels_ringgear: number;
  };

  // Engine dyno curve [RPM, HP]
  engineHP: [number, number][];

  // Fuel system
  fuel: {
    type: string;
    hpTorqueMultiplier: number;
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
    if (!fixture.vehicle.tire) {
      missing.push('vehicle.tire');
    } else {
      if (fixture.vehicle.tire.rollout_in === undefined) missing.push('vehicle.tire.rollout_in');
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
      tire: {
        rollout_in: 0,
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
