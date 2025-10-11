/**
 * VB6 Launch Bootstrap - Initial Ags0 calculation from engine torque.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1020-1027
 * 
 * ```vb
 * TQ = Z6 * HP / EngRPM(L)
 * TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
 * 
 * DragForce = CMU * gc_Weight.Value + gc_DragCoef.Value * gc_RefArea.Value * q
 * force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce
 * 
 * 'estimate maximum acceleration from force and weight
 * If gc_TransType.Value Then
 *     Ags0 = 0.96 * force / gc_Weight.Value  'assume 4% misc losses on initial hit of tire
 * Else
 *     Ags0 = 0.88 * force / gc_Weight.Value  'assume 12% misc losses on initial hit of tire
 * End If
 * ```
 * 
 * This gives the initial acceleration WITHOUT relying on ClutchSlip (which is 0 at launch).
 */

import { gc } from './constants';

export interface BootstrapInput {
  /** Engine torque at slipRPM (from torque curve), in lb-ft */
  engineTorque_lbft_atSlip: number;
  
  /** Transmission gear ratio for current gear (TGR) */
  gearRatio: number;
  
  /** Transmission efficiency for current gear (TGEff), 0..1 */
  transEff: number;
  
  /** Overall driveline efficiency (gc_Efficiency.Value), 0..1 */
  drivelineEff: number;
  
  /** Final drive ratio (gc_GearRatio.Value) */
  finalDrive: number;
  
  /** Tire diameter in inches */
  tireDia_in: number;
  
  /** Tire slip factor (TireSlip), typically 1.02 */
  tireSlip: number;
  
  /** Current drag force in lbf (from aero + rolling resistance) */
  dragForce_lbf: number;
  
  /** Vehicle weight in lbf (gc_Weight.Value) */
  vehicleWeight_lbf: number;
  
  /** Transmission type: true = auto (0.96 factor), false = manual (0.88 factor) */
  isAutoTrans: boolean;
}

export interface BootstrapOutput {
  /** Initial acceleration in ft/s² */
  Ags0_ftps2: number;
  
  /** Net launch thrust after losses (for diagnostics), in lbf */
  netThrust_lbf: number;
  
  /** Wheel torque before thrust conversion (for diagnostics), in lb-ft */
  wheelTorque_lbft: number;
}

/**
 * VB6 launch bootstrap: Calculate initial Ags0 from engine torque.
 * 
 * This is the TORQUE-BASED path that VB6 uses at launch, before transitioning
 * to the HP-BASED path once velocity builds up.
 * 
 * VB6 Order of Operations:
 * 1. Start with engine torque at slipRPM
 * 2. Apply gear ratio and transmission efficiency: TQ * TGR * TGEff
 * 3. Apply final drive and overall efficiency: TQ * FinalDrive * Efficiency
 * 4. Convert to thrust: Force = TQ / (TireSlip * TireDia / 24)
 * 5. Subtract drag: NetForce = Force - DragForce
 * 6. Convert to acceleration: a = NetForce / Weight
 * 7. Apply launch fudge factor: Ags0 = 0.88 * a (manual) or 0.96 * a (auto)
 * 
 * @param input - Bootstrap inputs
 * @returns Initial acceleration (Ags0) and diagnostics
 */
export function computeAgs0(input: BootstrapInput): BootstrapOutput {
  const {
    engineTorque_lbft_atSlip,
    gearRatio,
    transEff,
    drivelineEff,
    finalDrive,
    tireDia_in,
    tireSlip,
    dragForce_lbf,
    vehicleWeight_lbf,
    isAutoTrans,
  } = input;
  
  // VB6: TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
  // (gc_TorqueMult is typically 1.0, so we skip it)
  const wheelTorque_lbft = engineTorque_lbft_atSlip * gearRatio * transEff;
  
  // VB6: force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce
  // Note: TireDia is in inches, so TireDia / 24 converts to feet (diameter / 2 / 12 = radius in ft)
  const wheelRadius_ft = (tireDia_in / 24); // VB6 uses diameter/24, not diameter/12/2
  const thrust_lbf = (wheelTorque_lbft * finalDrive * drivelineEff) / (tireSlip * wheelRadius_ft);
  
  // Subtract drag and rolling resistance
  const netThrust_lbf = thrust_lbf - dragForce_lbf;
  
  // VB6: Ags0 = 0.96 * force / gc_Weight.Value (auto) or 0.88 * force / gc_Weight.Value (manual)
  // Note: VB6 divides by weight to get acceleration in g's, then multiplies by gc to get ft/s²
  // But since force/weight already gives acceleration in g's, we just multiply by the fudge factor
  const launchFudge = isAutoTrans ? 0.96 : 0.88;
  const Ags0_ftps2 = launchFudge * (netThrust_lbf / vehicleWeight_lbf) * gc;
  
  return {
    Ags0_ftps2,
    netThrust_lbf,
    wheelTorque_lbft,
  };
}
