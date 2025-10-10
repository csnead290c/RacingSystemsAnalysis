/**
 * VB6-ported driveline (converter/clutch) calculations.
 * Source: TIMESLIP.FRM lines 1144-1178
 * 
 * VB6 uses complex converter/clutch models with:
 * - Stall RPM clamping
 * - Speed ratio dependent torque multiplication
 * - Slippage factors
 * - Lock-up behavior
 */

/**
 * VB6 torque converter model.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1154-1172
 * 
 * VB6 Algorithm:
 * 1. Calculate lock RPM: LockRPM = wheelRPM * gearRatio * finalDrive
 * 2. Calculate slip ratio: SlipRatio = slippage * LockRPM / stallRPM
 * 3. Adjust stall RPM if slip ratio > 0.6 (dynamic stall)
 * 4. Clamp engine RPM to stall RPM minimum
 * 5. Calculate torque multiplication based on slip ratio
 * 6. Calculate clutch slip (coupling factor)
 * 
 * @param engineTorque - Engine torque (lb-ft)
 * @param engineRPM - Engine RPM (from wheel speed)
 * @param wheelRPM - Wheel RPM (output shaft)
 * @param gearRatio - Current gear ratio
 * @param finalDrive - Final drive ratio
 * @param stallRPM - Converter stall RPM
 * @param torqueMult - Static torque multiplication factor (typically 1.5-2.5)
 * @param slippage - Converter slippage factor (typically 1.0-1.1)
 * @param gear - Current gear (1-based, for lock-up logic)
 * @param lockup - Whether converter locks up after 1st gear
 * @returns Wheel torque and effective engine RPM
 */
export function vb6Converter(
  engineTorque: number,
  _engineRPM: number,
  wheelRPM: number,
  gearRatio: number,
  finalDrive: number,
  stallRPM: number,
  torqueMult: number,
  slippage: number = 1.05,
  gear: number = 1,
  lockup: boolean = false
): { Twheel: number; engineRPM_out: number } {
  // VB6: TIMESLIP.FRM:1145-1146
  // LockRPM = DSRPM * gc_GearRatio.Value * TGR(iGear)
  // EngRPM(L) = gc_Slippage.Value * LockRPM
  const LockRPM = wheelRPM * gearRatio * finalDrive;
  let EngRPM_out = slippage * LockRPM;
  let ClutchSlip = 1.0;
  
  // VB6: TIMESLIP.FRM:1154-1172 (converter)
  if (gear === 1 || !lockup) {
    // Non lock-up converter (1st gear or no lock-up)
    let zStall = stallRPM;
    let SlipRatio = slippage * LockRPM / zStall;
    
    // VB6: TIMESLIP.FRM:1159-1161
    // Dynamic stall adjustment when slip ratio > 0.6
    if (SlipRatio > 0.6) {
      zStall = zStall * (1 + (slippage - 1) * (SlipRatio - 0.6) / ((1 / slippage) - 0.6));
      SlipRatio = slippage * LockRPM / zStall;
    }
    
    // VB6: TIMESLIP.FRM:1162
    ClutchSlip = 1 / slippage;
    
    // VB6: TIMESLIP.FRM:1164-1168
    // Clamp engine RPM to stall minimum
    if (EngRPM_out < zStall) {
      EngRPM_out = zStall;
      // Torque multiplication decreases linearly with slip ratio
      const Work = torqueMult - (torqueMult - 1) * SlipRatio;
      ClutchSlip = Work * LockRPM / zStall;
    }
  } else {
    // VB6: TIMESLIP.FRM:1170-1171
    // Lock-up converter (2nd gear and above with lock-up)
    EngRPM_out = 1.005 * LockRPM; // 0.5% slippage
    ClutchSlip = LockRPM / EngRPM_out;
  }
  
  // VB6: TIMESLIP.FRM:1174
  if (ClutchSlip > 1) ClutchSlip = 1;
  
  // VB6: TIMESLIP.FRM:1178
  // HP = HP * ClutchSlip
  // Torque is proportional to HP at same RPM, so:
  const Twheel = engineTorque * ClutchSlip * gearRatio * finalDrive;
  
  return { Twheel, engineRPM_out: EngRPM_out };
}

/**
 * VB6 clutch model.
 * 
 * VB6 Source: TIMESLIP.FRM lines 1148-1152
 * 
 * VB6 Algorithm:
 * 1. Calculate lock RPM: LockRPM = wheelRPM * gearRatio * finalDrive
 * 2. Calculate engine RPM with slippage: EngRPM = slippage * LockRPM
 * 3. Clamp engine RPM to slip/stall RPM minimum (1st gear or no lock-up)
 * 4. Calculate clutch slip (coupling factor): ClutchSlip = LockRPM / EngRPM
 * 
 * @param engineTorque - Engine torque (lb-ft)
 * @param engineRPM - Engine RPM (from wheel speed, unused - recalculated)
 * @param wheelRPM - Wheel RPM (output shaft)
 * @param gearRatio - Current gear ratio
 * @param finalDrive - Final drive ratio
 * @param slipRPM - Clutch slip/stall RPM
 * @param slippage - Clutch slippage factor (typically 1.0025)
 * @param gear - Current gear (1-based, for lock-up logic)
 * @param lockup - Whether clutch locks up after 1st gear
 * @returns Wheel torque, effective engine RPM, and coupling factor
 */
export function vb6Clutch(
  engineTorque: number,
  _engineRPM: number,
  wheelRPM: number,
  gearRatio: number,
  finalDrive: number,
  slipRPM: number,
  slippage: number = 1.0025,
  gear: number = 1,
  lockup: boolean = false
): { Twheel: number; engineRPM_out: number; coupling: number } {
  // VB6: TIMESLIP.FRM:1145-1146
  // LockRPM = DSRPM * gc_GearRatio.Value * TGR(iGear)
  // EngRPM(L) = gc_Slippage.Value * LockRPM
  const LockRPM = wheelRPM * gearRatio * finalDrive;
  let EngRPM_out = slippage * LockRPM;
  
  // VB6: TIMESLIP.FRM:1148-1152 (clutch)
  // If EngRPM(L) < Stall Then
  //     If iGear = 1 Or gc_LockUp.Value = 0 Then EngRPM(L) = Stall
  // End If
  // ClutchSlip = LockRPM / EngRPM(L)
  if (EngRPM_out < slipRPM) {
    if (gear === 1 || !lockup) {
      EngRPM_out = slipRPM;
    }
  }
  
  const ClutchSlip = LockRPM / EngRPM_out;
  
  // VB6: TIMESLIP.FRM:1178
  // HP = HP * ClutchSlip
  // Torque is proportional to HP at same RPM, so:
  const Twheel = engineTorque * ClutchSlip * gearRatio * finalDrive;
  
  return { Twheel, engineRPM_out: EngRPM_out, coupling: ClutchSlip };
}

/**
 * VB6 direct drive (no converter or clutch).
 * 
 * @param engineTorque - Engine torque (lb-ft)
 * @param gearRatio - Current gear ratio
 * @param finalDrive - Final drive ratio
 * @returns Wheel torque
 */
export function vb6DirectDrive(
  engineTorque: number,
  gearRatio: number,
  finalDrive: number
): number {
  // Direct mechanical connection
  return engineTorque * gearRatio * finalDrive;
}
