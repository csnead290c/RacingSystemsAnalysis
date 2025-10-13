/**
 * VB6 Fixture Validation
 * 
 * Validates that a VB6 fixture has all required fields for simulation.
 * Used by dev panels to provide clear error messages.
 */

export type VB6Fixture = {
  environment: any;
  vehicle: any;
  drivetrain: {
    finalDrive: number;
    efficiency: number;
    gearRatios?: number[];
    perGearEff?: number[];
    shiftRPM?: number[];
    clutch?: { launchRPM: number; slipRPM: number; slippage: number; lockup: boolean };
    converter?: { stallRPM: number; torqueMult: number; lockup: boolean };
  };
  fuel?: { type: string; hpTorqueMultiplier?: number };
  engineHP?: Array<{ rpm: number; hp: number }>;
  pmi?: { engineFlywheelClutch: number; transDriveshaft: number; tiresWheelsRing: number };
};

export type ValidationResult = { ok: true } | { ok: false; missing: string[] };

/**
 * Validate a VB6 fixture for completeness.
 * 
 * @param fx - Partial VB6 fixture to validate
 * @returns Validation result with missing fields if incomplete
 */
export function validateVB6Fixture(fx: Partial<VB6Fixture>): ValidationResult {
  const missing: string[] = [];
  
  // Check drivetrain exists
  if (!fx.drivetrain) {
    missing.push('drivetrain.*');
    return { ok: false, missing };
  }

  // Check gear ratios
  if (!fx.drivetrain.gearRatios?.length) {
    missing.push('drivetrain.gearRatios');
  }
  
  // Check per-gear efficiencies
  if (!fx.drivetrain.perGearEff?.length) {
    missing.push('drivetrain.perGearEff');
  }
  
  // Check gear ratios and efficiencies match in length
  if (fx.drivetrain.gearRatios && fx.drivetrain.perGearEff &&
      fx.drivetrain.gearRatios.length !== fx.drivetrain.perGearEff.length) {
    missing.push('perGearEff length must equal gearRatios length');
  }
  
  // Check clutch or converter exists
  if (!fx.drivetrain.clutch && !fx.drivetrain.converter) {
    missing.push('drivetrain.clutch or drivetrain.converter');
  }

  // Check engine HP curve
  if (!fx.engineHP?.length) {
    missing.push('engineHP');
  }
  
  // Check fuel type
  if (!fx.fuel?.type) {
    missing.push('fuel.type');
  }
  
  // Check PMI values
  if (!fx.pmi?.engineFlywheelClutch) {
    missing.push('pmi.engineFlywheelClutch');
  }
  
  if (fx.pmi?.transDriveshaft == null) {
    missing.push('pmi.transDriveshaft');
  }
  
  if (fx.pmi?.tiresWheelsRing == null) {
    missing.push('pmi.tiresWheelsRing');
  }

  return missing.length ? { ok: false, missing } : { ok: true };
}
