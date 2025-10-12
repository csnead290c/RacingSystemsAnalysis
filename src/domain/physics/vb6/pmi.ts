/**
 * VB6 PMI (Polar Moment of Inertia) HP Calculations
 * 
 * EXACT port from TIMESLIP.FRM lines 1231-1248
 * 
 * VB6 calculates the horsepower required to accelerate rotating masses:
 * - Engine PMI: Crankshaft, flywheel, clutch/converter
 * - Chassis PMI: Transmission gears, driveshaft, wheels/tires
 * 
 * These HP losses are subtracted from available engine HP before computing vehicle acceleration.
 * 
 * Key VB6 formulas:
 * - EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
 * - ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0)
 * - Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
 * - HPEngPMI = EngAccHP * Work
 * - HPChasPMI = ChasAccHP * Work
 */

import { PI, KP21, KP22 } from './constants';

/**
 * Compute engine PMI horsepower loss
 * 
 * VB6: TIMESLIP.FRM:1231-1238
 * EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
 * If EngAccHP < 0 Then
 *     If Not gc_TransType.Value Then
 *         EngAccHP = KP21 * EngAccHP  ' Clutch
 *     Else
 *         EngAccHP = KP22 * EngAccHP  ' Converter
 *     End If
 * End If
 * 
 * Then: HPEngPMI = EngAccHP * Work
 * Where: Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
 * 
 * Units:
 * - EnginePMI: slug-ft² (moment of inertia)
 * - EngRPM: rev/min
 * - dt: seconds
 * - Result: horsepower
 * 
 * @param enginePMI Engine moment of inertia (slug-ft²)
 * @param engRPM Current engine RPM
 * @param rpm0 Previous engine RPM
 * @param dt Time step (seconds)
 * @param isClutch True for clutch, false for converter
 * @returns HP loss due to engine acceleration
 */
export function computeHPEngPMI(
  enginePMI: number,
  engRPM: number,
  rpm0: number,
  dt: number,
  isClutch: boolean
): number {
  // VB6: EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
  let engAccHP = enginePMI * engRPM * (engRPM - rpm0);
  
  // VB6: If EngAccHP < 0 Then apply deceleration factor
  if (engAccHP < 0) {
    engAccHP = isClutch ? KP21 * engAccHP : KP22 * engAccHP;
  }
  
  // VB6: Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
  // This converts from (slug-ft² * rpm²) to horsepower
  const work = Math.pow(2 * PI / 60, 2) / (12 * 550 * dt);
  
  // VB6: HPEngPMI = EngAccHP * Work
  const hpEngPMI = engAccHP * work;
  
  return hpEngPMI;
}

/**
 * Compute chassis PMI horsepower loss
 * 
 * VB6: TIMESLIP.FRM:1240, 1248
 * ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0)
 * If ChasAccHP < 0 Then ChasAccHP = 0
 * 
 * Then: HPChasPMI = ChasAccHP * Work
 * 
 * Where:
 * - ChassisPMI = gc_TiresPMI.Value + gc_TransPMI.Value * gc_GearRatio.Value ^ 2 * TGR(iGear) ^ 2
 * - DSRPM = TireSlip * Vel(L) * 60 / TireCirFt  (driveshaft RPM)
 * 
 * Units:
 * - ChassisPMI: slug-ft² (moment of inertia)
 * - DSRPM: rev/min (driveshaft RPM)
 * - dt: seconds
 * - Result: horsepower
 * 
 * @param chassisPMI Chassis moment of inertia (slug-ft²)
 * @param dsRPM Current driveshaft RPM
 * @param dsRPM0 Previous driveshaft RPM
 * @param dt Time step (seconds)
 * @returns HP loss due to chassis acceleration
 */
export function computeHPChasPMI(
  chassisPMI: number,
  dsRPM: number,
  dsRPM0: number,
  dt: number
): number {
  // VB6: ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0)
  let chasAccHP = chassisPMI * dsRPM * (dsRPM - dsRPM0);
  
  // VB6: If ChasAccHP < 0 Then ChasAccHP = 0
  if (chasAccHP < 0) {
    chasAccHP = 0;
  }
  
  // VB6: Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
  const work = Math.pow(2 * PI / 60, 2) / (12 * 550 * dt);
  
  // VB6: HPChasPMI = ChasAccHP * Work
  const hpChasPMI = chasAccHP * work;
  
  return hpChasPMI;
}

/**
 * Calculate total chassis PMI (transmission + tires)
 * 
 * VB6: TIMESLIP.FRM:1075
 * ChassisPMI = gc_TiresPMI.Value + gc_TransPMI.Value * gc_GearRatio.Value ^ 2 * TGR(iGear) ^ 2
 * 
 * @param tiresPMI Tires moment of inertia (slug-ft²)
 * @param transPMI Transmission moment of inertia (slug-ft²)
 * @param finalDrive Final drive ratio
 * @param gearRatio Current gear ratio
 * @returns Total chassis PMI (slug-ft²)
 */
export function computeChassisPMI(
  tiresPMI: number,
  transPMI: number,
  finalDrive: number,
  gearRatio: number
): number {
  // VB6: ChassisPMI = gc_TiresPMI.Value + gc_TransPMI.Value * gc_GearRatio.Value ^ 2 * TGR(iGear) ^ 2
  const chassisPMI = tiresPMI + transPMI * Math.pow(finalDrive * gearRatio, 2);
  return chassisPMI;
}

/**
 * Calculate driveshaft RPM
 * 
 * VB6: TIMESLIP.FRM:1140
 * DSRPM = TireSlip * Vel(L) * 60 / TireCirFt
 * 
 * @param tireSlip Tire slip factor (typically 1.0-1.02)
 * @param v_fps Vehicle velocity (ft/s)
 * @param tireCircumference_ft Tire circumference (ft)
 * @returns Driveshaft RPM
 */
export function computeDSRPM(
  tireSlip: number,
  v_fps: number,
  tireCircumference_ft: number
): number {
  // VB6: DSRPM = TireSlip * Vel(L) * 60 / TireCirFt
  const dsRPM = tireSlip * v_fps * 60 / tireCircumference_ft;
  return dsRPM;
}

/**
 * EXACT VB6 port: Calculate engine PMI HP loss
 * 
 * VB6: TIMESLIP.FRM:1231-1238, 1247-1248
 * 
 * Formula:
 * 1. EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
 * 2. If EngAccHP < 0 Then EngAccHP = KP2x * EngAccHP  (deceleration factor)
 * 3. Work = (2 * PI / 60) ^ 2 / (12 * 550 * dt)
 * 4. HPEngPMI = EngAccHP * Work
 * 
 * @param prevRPM Previous engine RPM (RPM0)
 * @param rpm Current engine RPM (EngRPM(L))
 * @param dt_s Time step in seconds (dtk1)
 * @param PMI_engine_slugft2 Engine PMI in slug-ft² (gc_EnginePMI.Value)
 * @param isClutch True for clutch (KP21), false for converter (KP22)
 * @returns HPEngPMI - HP loss due to engine acceleration
 */
export function hpEngPMI(
  prevRPM: number,
  rpm: number,
  dt_s: number,
  PMI_engine_slugft2: number,
  isClutch: boolean = true
): number {
  // VB6: TIMESLIP.FRM:1231
  // EngAccHP = gc_EnginePMI.Value * EngRPM(L) * (EngRPM(L) - RPM0)
  let engAccHP = PMI_engine_slugft2 * rpm * (rpm - prevRPM);
  
  // VB6: TIMESLIP.FRM:1232-1238
  // If EngAccHP < 0 Then
  //     If Not gc_TransType.Value Then
  //         EngAccHP = KP21 * EngAccHP
  //     Else
  //         EngAccHP = KP22 * EngAccHP
  //     End If
  // End If
  if (engAccHP < 0) {
    engAccHP = isClutch ? KP21 * engAccHP : KP22 * engAccHP;
  }
  
  // VB6: TIMESLIP.FRM:1247
  // Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
  const work = Math.pow(2 * PI / 60, 2) / (12 * 550 * dt_s);
  
  // VB6: TIMESLIP.FRM:1248
  // HPEngPMI = EngAccHP * Work
  const HPEngPMI = engAccHP * work;
  
  return HPEngPMI;
}

/**
 * EXACT VB6 port: Calculate chassis PMI HP loss
 * 
 * VB6: TIMESLIP.FRM:1240, 1247-1248
 * 
 * Formula:
 * 1. ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0)
 * 2. If ChasAccHP < 0 Then ChasAccHP = 0
 * 3. Work = (2 * PI / 60) ^ 2 / (12 * 550 * dt)
 * 4. HPChasPMI = ChasAccHP * Work
 * 
 * @param prevWheelRPM Previous driveshaft RPM (DSRPM0)
 * @param wheelRPM Current driveshaft RPM (DSRPM)
 * @param dt_s Time step in seconds (dtk1)
 * @param PMI_chassis_slugft2 Chassis PMI in slug-ft² (ChassisPMI)
 * @returns HPChasPMI - HP loss due to chassis acceleration
 */
export function hpChasPMI(
  prevWheelRPM: number,
  wheelRPM: number,
  dt_s: number,
  PMI_chassis_slugft2: number
): number {
  // VB6: TIMESLIP.FRM:1240
  // ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0)
  let chasAccHP = PMI_chassis_slugft2 * wheelRPM * (wheelRPM - prevWheelRPM);
  
  // VB6: TIMESLIP.FRM:1240
  // If ChasAccHP < 0 Then ChasAccHP = 0
  if (chasAccHP < 0) {
    chasAccHP = 0;
  }
  
  // VB6: TIMESLIP.FRM:1247
  // Work = (2 * PI / 60) ^ 2 / (12 * 550 * dtk1)
  const work = Math.pow(2 * PI / 60, 2) / (12 * 550 * dt_s);
  
  // VB6: TIMESLIP.FRM:1248
  // HPChasPMI = ChasAccHP * Work
  const HPChasPMI = chasAccHP * work;
  
  return HPChasPMI;
}
