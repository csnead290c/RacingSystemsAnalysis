/**
 * RSACLASSIC physics model implementation.
 * Fixed-step forward integration with traction cap, shifts, and timeslip outputs.
 */

import type { PhysicsModel, PhysicsModelId, SimInputs, SimResult } from '../index';
import { hpCorrection } from '../weather/air';
import { wheelTorque_lbft, type EngineParams } from '../engine/engine';
import { rpmFromSpeed, type Drivetrain } from '../drivetrain/drivetrain';
import { maybeShift } from '../drivetrain/shift';
// import { drag_lb } from '../aero/drag'; // Replaced with direct calculation
// import { rolling_lb } from '../aero/rolling'; // Replaced with direct calculation
// import { maxTractive_lb, type TireParams } from '../tire/traction'; // Replaced with VB6 traction
import { createInitialState } from '../core/integrator';
import { lbToSlug } from '../core/units';
import { g, FPS_TO_MPH, CMU, gc, AMin, JMin, JMax } from '../vb6/constants';
import { vb6LaunchSlice } from '../vb6/launch';
import { computeAgs0 } from '../vb6/bootstrap';
import { hpToTorqueLbFt } from '../vb6/convert';
import { vb6AirDensitySlugFt3 } from '../vb6/atmosphere';
import { vb6RollingResistanceTorque, vb6AeroTorque } from '../vb6/forces';
import { vb6Converter, vb6Clutch, vb6DirectDrive } from '../vb6/driveline';
import { computeAMaxVB6, computeAMinVB6, computeCAXI, clampAGSVB6 } from '../vb6/traction';
// TODO: Replace current integrator with vb6Step() once VB6 loop structure is verified
// import { vb6Step, vb6CheckShift, type VB6Params } from '../vb6/integrator';

/**
 * RSACLASSIC physics model.
 * Advanced physics simulation for Quarter Jr/Pro parity.
 */
class RSACLASSICModel implements PhysicsModel {
  id: PhysicsModelId = 'RSACLASSIC';

  simulate(input: SimInputs): SimResult {
    const { vehicle, env, raceLength } = input;
    
    // Initialize warnings array early
    const warnings: string[] = [];
    
    // Determine finish distance
    const finishDistance_ft = raceLength === 'EIGHTH' ? 660 : 1320;
    
    // Resolve parameters (VB6 parity mode: NO DEFAULTS for critical parameters)
    const cd = vehicle.cd;
    const frontalArea_ft2 = vehicle.frontalArea_ft2;
    const transEff = vehicle.transEff;
    const finalDrive = vehicle.finalDrive ?? vehicle.rearGear;
    const gearRatios = vehicle.gearRatios;
    const gearEff = vehicle.gearEff; // Per-gear efficiency, optional
    const shiftRPM = vehicle.shiftRPM;
    
    // Validate required vehicle parameters
    if (!cd) {
      warnings.push('Missing vehicle.cd (drag coefficient) - required for VB6 parity');
    }
    if (!frontalArea_ft2) {
      warnings.push('Missing vehicle.frontalArea_ft2 - required for VB6 parity');
    }
    if (!gearRatios || gearRatios.length === 0) {
      warnings.push('Missing vehicle.gearRatios[] - required for VB6 parity');
    }
    if (!shiftRPM || shiftRPM.length === 0) {
      warnings.push('Missing vehicle.shiftRPM[] - required for VB6 parity');
    }
    if (!finalDrive) {
      warnings.push('Missing vehicle.finalDrive or vehicle.rearGear - required for VB6 parity');
    }
    
    // Validate required environment parameters
    if (env.barometerInHg === undefined) {
      warnings.push('Missing env.barometerInHg - required for VB6 air density');
    }
    if (env.temperatureF === undefined) {
      warnings.push('Missing env.temperatureF - required for VB6 air density');
    }
    if (env.humidityPct === undefined) {
      warnings.push('Missing env.humidityPct - required for VB6 air density');
    }
    if (env.elevation === undefined) {
      warnings.push('Missing env.elevation - required for VB6 air density');
    }
    
    // --- Tire geometry normalization (single source of truth) ---
    // VB6 uses either tire diameter or rollout (circumference)
    // TIMESLIP.FRM:683-687, 1036, 1197
    const tireRolloutIn = vehicle.tireRolloutIn ?? null;
    const tireDiaInRaw = vehicle.tireDiaIn ?? null;
    
    // If rollout is present, derive diameter from circumference.
    // Diameter = Rollout / π
    const PI = Math.PI;
    const tireDiaFromRollout =
      (typeof tireRolloutIn === 'number' && tireRolloutIn > 0)
        ? (tireRolloutIn / PI)
        : null;
    
    // Use rollout-derived diameter if available, otherwise use raw diameter
    let tireDiaIn = (tireDiaFromRollout ?? tireDiaInRaw) ?? 0;
    if (!tireDiaIn || tireDiaIn <= 0) {
      warnings.push('Tire diameter is undefined/invalid. Provide tireRolloutIn or tireDiaIn.');
      tireDiaIn = 28; // Emergency fallback (inches)
    }
    
    // Calculate radius for all downstream calculations
    const tireRadius_ft = (tireDiaIn / 12) / 2;
    
    const rolloutIn = vehicle.rolloutIn;
    if (!rolloutIn) {
      warnings.push('Missing vehicle.rolloutIn - required for VB6 parity');
    }
    
    // Convert torque curve HP to TQ if needed
    let torqueCurve = vehicle.torqueCurve;
    if (torqueCurve) {
      torqueCurve = torqueCurve.map((row) => {
        if (row.tq_lbft !== undefined) {
          return row;
        } else if (row.hp !== undefined && row.rpm > 0) {
          // Convert HP to TQ using VB6 formula
          const tq_lbft = hpToTorqueLbFt(row.hp, row.rpm);
          return { ...row, tq_lbft };
        }
        return row;
      });
    }
    
    // Precompute atmospheric conditions
    // rho_slug_ft3 now computed inline with elevation scaling
    const corr = hpCorrection(env);
    
    // Precompute mass
    const mass_slugs = lbToSlug(vehicle.weightLb);
    
    // Rollout distance
    const rolloutFt = (rolloutIn ?? 12) / 12;
    
    // Drivetrain configuration (with emergency fallbacks)
    const drivetrain: Drivetrain = {
      ratios: gearRatios ?? [1.0],
      finalDrive: finalDrive ?? 3.73,
      transEff: transEff ?? 0.9,
      tireDiaIn: tireDiaIn,
      shiftRPM: shiftRPM ?? [],
    };
    
    // Engine parameters
    const engineParams: EngineParams = {
      torqueCurve: torqueCurve,
      powerHP: vehicle.powerHP,
      corr: corr,
    };
    
    // Tire parameters (replaced with VB6 traction)
    // const tireParams: TireParams = {
    //   weightLb: vehicle.weightLb,
    //   tireWidthIn: vehicle.tireWidthIn,
    //   tractionIndex: env.tractionIndex,
    // };
    
    // Termination tracking
    type TerminationReason = 'DISTANCE' | 'TIME_CAP' | 'STEP_CAP' | 'SAFETY';
    let terminationReason: TerminationReason | null = null;
    let stepCount = 0;
    
    // Integration parameters
    // VB6 uses adaptive timestep (TIMESLIP.FRM:1082): TimeStep = TSMax * (AgsMax / Ags0)^4
    // Min: 0.005s (TIMESLIP.FRM:1064), Max: 0.05s (TIMESLIP.FRM:1120)
    // For fixed-timestep implementation, use 0.002s matching VB6's TimeTol (TIMESLIP.FRM:554)
    const dt_s = 0.002; // VB6 TimeTol = 0.002s (TIMESLIP.FRM:554)
    const MAX_TIME_S = 30; // Generous cap to avoid false stops while diagnosing
    const MAX_STEPS = Math.ceil(MAX_TIME_S / dt_s);
    const traceInterval_s = 0.01; // Collect traces every 10ms
    
    // Initialize state
    let state = createInitialState();
    let nextTraceTime = 0;
    
    // Storage for traces and timeslip
    const traces: Array<{
      t_s: number;
      v_mph: number;
      a_g: number;
      s_ft: number;
      rpm: number;
      gear: number;
    }> = [];
    
    const timeslip: Array<{ d_ft: number; t_s: number; v_mph: number }> = [];
    
    // VB6 rollout and timing (TIMESLIP.FRM:815-817, 1380)
    // DistToPrint(1) = gc_Rollout.Value / 12
    // If gc_Rollout.Value > 0 Then time(L) = 0  (reset clock at rollout)
    let rolloutCompleted = false;
    let t_at_rollout = 0;
    
    // VB6 timeslip points (TIMESLIP.FRM:816-817)
    // DistToPrint(2) = 30, (3) = 60, (4) = 330, (5) = 594, (6) = 660, (7) = 1000, (8) = 1254, (9) = 1320
    const timeslipPoints = [60, 330, 660, 1000, finishDistance_ft];
    let nextTimeslipIdx = 0;
    
    // VB6 trap speed windows (TIMESLIP.FRM:1619-1627)
    // Eighth:  594-660 ft (66 ft window)
    // Quarter: 1254-1320 ft (66 ft window)
    // TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime)  [time-averaged speed]
    let t_at_594 = 0;
    let t_at_1254 = 0;
    
    // Previous state for acceleration calculation
    let prevV_fps = 0;
    
    // Converter tracking
    const converter = vehicle.converter;
    let sumTR = 0;
    let sumETA = 0;
    let sumSR = 0;
    let converterSteps = 0;
    
    // Clutch tracking
    const clutch = vehicle.clutch;
    let minC = 1.0;
    let lockupAt_ft: number | undefined = undefined;
    
    // VB6 launch conditions (TIMESLIP.FRM:1006)
    // VB6: EngRPM(L) = gc_LaunchRPM.Value
    // Initialize engine RPM to launch RPM before first timestep
    if (clutch) {
      state.rpm = clutch.launchRPM ?? clutch.slipRPM ?? 0;
    } else if (converter) {
      state.rpm = converter.launchRPM ?? converter.stallRPM ?? 0;
    }
    
    // Fuel tracking
    const fuel = (input as any).fuel as 'GAS' | 'METHANOL' | 'NITRO' | undefined;
    let minFuelScale = 1.0;
    let maxFuelScale = 1.0;
    
    // Energy accounting (DEV only - for debugging VB6 parity)
    let E_engine_total = 0;      // Total energy from engine (ft-lb)
    let E_drag_total = 0;         // Total energy lost to aero drag (ft-lb)
    let E_rr_total = 0;           // Total energy lost to rolling resistance (ft-lb)
    let E_driveline_loss = 0;     // Total driveline losses (ft-lb)
    let E_kinetic_trans = 0;      // Final translational kinetic energy (ft-lb)
    let E_kinetic_rot = 0;        // Final rotational kinetic energy (ft-lb) - if VB6 used it
    
    // VB6 integration state (TIMESLIP.FRM:1090)
    // Ags0 = previous acceleration (ft/s²), used for velocity integration
    // 
    // VB6 calculates initial Ags0 from TORQUE-based force (TIMESLIP.FRM:1020-1027)
    // This provides initial acceleration without relying on ClutchSlip
    let Ags0 = 0;
    
    // Calculate initial Ags0 at t=0 (VB6: TIMESLIP.FRM:1010-1027)
    if (clutch || converter) {
      const launchRPM = clutch?.launchRPM ?? converter?.launchRPM ?? 
                        clutch?.slipRPM ?? converter?.stallRPM ?? 0;
      
      // Get HP at launch RPM
      const launchTorque = wheelTorque_lbft(launchRPM, engineParams, transEff ?? 0.9);
      const launchHP = launchRPM > 0 ? (launchTorque * launchRPM) / 5252 : 0;
      
      // VB6: TQ = Z6 * HP / EngRPM
      // Z6 = 5252 (HP to torque conversion)
      const TQ = launchHP > 0 && launchRPM > 0 ? (5252 * launchHP) / launchRPM : 0;
      
      // VB6: TQ = TQ * gc_TorqueMult.Value * TGR(iGear) * TGEff(iGear)
      const gearRatio = (gearRatios ?? [1.0])[0] ?? 1.0; // First gear
      const TQ_geared = TQ * gearRatio * (transEff ?? 0.9);
      
      // VB6: force = TQ * gc_GearRatio.Value * gc_Efficiency.Value / (TireSlip * TireDia / 24) - DragForce
      const tireSlip = 1.02; // VB6 default
      const force = (TQ_geared * (finalDrive ?? 3.73) * (transEff ?? 0.9)) / (tireSlip * tireDiaIn / 24);
      
      // VB6: Ags0 = 0.88 * force / gc_Weight.Value (12% losses for clutch)
      // VB6: Ags0 = 0.96 * force / gc_Weight.Value (4% losses for converter)
      const lossMultiplier = converter ? 0.96 : 0.88;
      Ags0 = lossMultiplier * force / vehicle.weightLb;
      
      // VB6: If Ags0 < AMin Then Ags0 = AMin
      if (Ags0 < AMin) {
        Ags0 = AMin;
      }
      
      // Note: VB6 also calculates AMAX and clamps here, but we'll do that in the loop
    }
    
    // Bootstrap thresholds (for torque-based launch before HP path)
    const BOOT_MAX_STEPS = 6;        // up to ~12ms with dt=0.002
    const LOCKRPM_MIN = 5;           // rpm threshold at which clutchSlip becomes meaningful
    
    // Shared loss calculation helpers (single source of truth for both bootstrap and HP paths)
    const getTransEff = (gearIdx: number): number => {
      return gearEff && gearEff[gearIdx] !== undefined
        ? Math.max(0.9, Math.min(1.0, gearEff[gearIdx]))
        : (transEff ?? 0.9);
    };
    
    const getDrivelineEff = (): number => {
      return transEff ?? 0.9; // gc_Efficiency.Value in VB6
    };
    
    const getTireSlip = (): number => {
      // VB6: TIMESLIP.FRM:1100-1102
      // TireSlip = 1.02 + Work * (1 - (Dist0 / 1320)^2)
      // For now, use constant 1.02
      return 1.02;
    };
    
    // Integration loop
    while (true) {
      stepCount++;
      
      // Calculate RPM from current speed
      let rpm = rpmFromSpeed(state.v_fps, state.gearIdx, drivetrain);
      
      // VB6 driveline: converter, clutch, or direct drive
      let drivelineTorqueLbFt = 0;
      let effectiveRPM = rpm;
      let clutchCoupling = 1.0;
      
      // Calculate engine torque first (needed for driveline)
      const currentGearEff = getTransEff(state.gearIdx);
      let tq_lbft = wheelTorque_lbft(rpm, engineParams, currentGearEff);
      
      // Apply fuel delivery factor
      let M_fuel = 1.0;
      if (fuel === 'METHANOL') {
        const trackTempF = env.trackTempF;
        if (trackTempF !== undefined && trackTempF < 80) {
          if (state.t_s < 0.8) {
            M_fuel = 1.025 - (0.025 * state.t_s / 0.8);
          }
        }
      } else if (fuel === 'NITRO') {
        if (state.t_s < 0.4) {
          M_fuel = 0.90;
        } else if (state.t_s < 1.0) {
          const rampProgress = (state.t_s - 0.4) / (1.0 - 0.4);
          M_fuel = 0.90 + (1.0 - 0.90) * rampProgress;
        }
      }
      minFuelScale = Math.min(minFuelScale, M_fuel);
      maxFuelScale = Math.max(maxFuelScale, M_fuel);
      tq_lbft = tq_lbft * M_fuel;
      
      // VB6 driveline: converter, clutch, or direct drive
      const gearRatio = (gearRatios ?? [1.0])[state.gearIdx] ?? 1.0;
      const wheelRPM = (state.v_fps * 60) / (2 * Math.PI * tireRadius_ft);
      
      if (clutch) {
        // VB6 clutch model (TIMESLIP.FRM:1148-1152, 1176-1178)
        // VB6 calculates EngRPM first, then gets HP at that RPM, then scales by ClutchSlip
        const slipRPM = clutch.slipRPM ?? clutch.launchRPM ?? 0;
        const slippage = clutch.slipRatio ?? 1.0025; // VB6 default: 1.0025 + slipRPM/1000000
        const lockup = clutch.lockup ?? false;
        
        // Calculate EngRPM_out (slip-clamped RPM)
        const LockRPM = wheelRPM * gearRatio * (finalDrive ?? 3.73);
        let EngRPM_out = slippage * LockRPM;
        if (EngRPM_out < slipRPM) {
          if (state.gearIdx === 0 || !lockup) { // gear 1 (0-indexed) or no lockup
            EngRPM_out = slipRPM;
          }
        }
        
        // VB6: Get HP at EngRPM_out (TIMESLIP.FRM:1176)
        // Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
        const hp_at_EngRPM = wheelTorque_lbft(EngRPM_out, engineParams, currentGearEff) * EngRPM_out / 5252;
        
        const result = vb6Clutch(
          hp_at_EngRPM,  // HP at EngRPM_out, not at wheel RPM
          EngRPM_out, 
          wheelRPM, 
          gearRatio, 
          finalDrive ?? 3.73, 
          slipRPM,
          slippage,
          state.gearIdx + 1, // Convert to 1-based
          lockup
        );
        drivelineTorqueLbFt = result.Twheel;
        effectiveRPM = result.engineRPM_out;
        clutchCoupling = result.coupling;
        minC = Math.min(minC, clutchCoupling);
        
      } else if (converter) {
        // VB6 converter model (TIMESLIP.FRM:1154-1172)
        const stallRPM = converter.stallRPM ?? 3000;
        const torqueMult = converter.torqueMult ?? 2.0;
        const slippage = converter.slipRatio ?? 1.05; // VB6 typical slippage
        const lockup = converter.lockup ?? false;
        const result = vb6Converter(
          tq_lbft, 
          rpm, 
          wheelRPM, 
          gearRatio, 
          finalDrive ?? 3.73, 
          stallRPM, 
          torqueMult,
          slippage,
          state.gearIdx + 1, // Convert to 1-based
          lockup
        );
        drivelineTorqueLbFt = result.Twheel;
        effectiveRPM = result.engineRPM_out;
        
        // Track converter usage
        sumTR += torqueMult; // Placeholder until VB6 formula returns actual TR
        sumETA += 0.85; // Placeholder until VB6 formula returns actual ETA
        sumSR += 0.5; // Placeholder until VB6 formula returns actual SR
        converterSteps++;
      } else {
        // Direct drive (no converter/clutch, or converter in higher gears)
        drivelineTorqueLbFt = vb6DirectDrive(tq_lbft, gearRatio, finalDrive ?? 3.73);
        effectiveRPM = rpm;
      }
      
      state.rpm = effectiveRPM;
      
      // Convert driveline torque to wheel force
      // Note: drivelineTorqueLbFt already includes gear ratios and final drive
      const F_wheel = drivelineTorqueLbFt / tireRadius_ft;
      
      // VB6 air density calculation (exact formula from QTRPERF.BAS:1290-1335)
      // Uses exact VB6 Weather() subroutine with saturation vapor pressure polynomial
      const rho = vb6AirDensitySlugFt3(
        env.barometerInHg ?? 29.92, // Emergency fallback (warning added above)
        env.temperatureF ?? 59,      // Emergency fallback (warning added above)
        env.humidityPct ?? 50,       // Emergency fallback (warning added above)
        env.elevation ?? 0           // Emergency fallback (warning added above)
      );
      
      // VB6 rolling resistance torque (TIMESLIP.FRM:1019, 1192-1193)
      // Uses CMU coefficient (0.025 for Quarter Jr/Pro)
      const cmu = vehicle.rrCoeff ?? CMU; // Allow override, default to VB6 CMU
      const T_rr = vb6RollingResistanceTorque(vehicle.weightLb, cmu, tireRadius_ft);
      
      // VB6 aerodynamic drag torque (TIMESLIP.FRM:1017, 1019, 1193)
      // Uses dynamic pressure q = rho * v² / (2 * gc)
      // Note: cd and frontalArea_ft2 are required - validation should catch if missing
      const T_drag = vb6AeroTorque(rho, cd!, frontalArea_ft2!, state.v_fps, tireRadius_ft);
      
      // VB6 force calculations (TIMESLIP.FRM:1221)
      // Convert torques to forces at contact patch
      const F_drag = T_drag / tireRadius_ft;
      const F_roll = T_rr / tireRadius_ft;
      
      // VB6 maximum traction (TIMESLIP.FRM:1054, 1216)
      // AMAX = ((CRTF / TireGrowth) - DragForce) / Weight
      // Calculate CAXI (traction index adjustment)
      const trackTempEffect = 1.0; // TODO: Calculate from track temp
      const tractionIndex = env.tractionIndex ?? 3;
      const CAXI = computeCAXI(tractionIndex, trackTempEffect);
      
      // Calculate dynamic rear weight (for now, use static weight)
      // TODO: Add weight transfer calculation
      // VB6 uses StaticRWT for initial calculation (TIMESLIP.FRM:1038)
      // Drag cars typically have 60-65% static rear weight
      const dynamicRWT_lbf = vehicle.weightLb * 0.62; // Assume 62% on rear axle (typical for drag car)
      
      const AMax = computeAMaxVB6({
        weight_lbf: vehicle.weightLb,
        tireDia_in: tireDiaIn,
        tireWidth_in: vehicle.tireWidthIn ?? 17.0,
        dynamicRWT_lbf,
        tractionIndexAdj: CAXI,
        tireGrowth: 1.0, // No tire growth at launch
        dragForce_lbf: F_drag + F_roll,
        bodyStyle: undefined, // Not a motorcycle
      });
      
      const AMin = computeAMinVB6();
      
      // Calculate LockRPM for bootstrap decision (reuse wheelRPM and gearRatio from above)
      const LockRPM = wheelRPM * gearRatio * (finalDrive ?? 3.73);
      
      // BOOTSTRAP PATH: Use torque-based Ags0 for first few steps when LockRPM is tiny
      // This avoids ClutchSlip = 0 problem at launch
      let AGS: number;
      
      if (stepCount <= BOOT_MAX_STEPS && LockRPM < LOCKRPM_MIN) {
        // Torque-based bootstrap (VB6 lines 1020-1027)
        // Get engine torque at slipRPM (not at current RPM)
        const slipRPM = clutch?.slipRPM ?? clutch?.launchRPM ?? converter?.stallRPM ?? 3000;
        const tq_at_slip = wheelTorque_lbft(slipRPM, engineParams, currentGearEff);
        
        const bootstrapResult = computeAgs0({
          engineTorque_lbft_atSlip: tq_at_slip,
          gearRatio,
          transEff: currentGearEff,
          drivelineEff: getDrivelineEff(),
          finalDrive: finalDrive ?? 3.73,
          tireDia_in: tireDiaIn, // Use calculated value, not vehicle.tireDiaIn
          tireSlip: getTireSlip(),
          dragForce_lbf: F_drag + F_roll,
          vehicleWeight_lbf: vehicle.weightLb,
          isAutoTrans: !!converter,
        });
        
        // Apply VB6 AMin/AMax clamps with PQWT rescaling
        // For bootstrap, PQWT = thrust / weight * gc (approximation)
        const PQWT_bootstrap = bootstrapResult.netThrust_lbf / vehicle.weightLb * gc;
        const clamped = clampAGSVB6(bootstrapResult.Ags0_ftps2, PQWT_bootstrap, AMin, AMax);
        AGS = clamped.AGS;
        
        // DEV: Bootstrap diagnostics
        if (stepCount <= 10 && typeof console !== 'undefined' && console.debug) {
          const AGS_g = bootstrapResult.Ags0_ftps2 / gc;
          const overallRatio = gearRatio * (finalDrive ?? 3.73);
          console.debug('[STEP]', {
            step: stepCount,
            path: 'BOOTSTRAP',
            v_fps: state.v_fps.toFixed(6),
            EngRPM: effectiveRPM.toFixed(0),
            LockRPM: LockRPM.toFixed(2),
            clutchSlip: clutchCoupling.toFixed(6),
            gear: state.gearIdx + 1,
            GR_x_FD: overallRatio.toFixed(3),
            AGS_g: AGS_g.toFixed(4),
            AGS_ftps2: AGS.toFixed(4),
            AMin_ftps2: AMin.toFixed(4),
            AMax_ftps2: AMax.toFixed(4),
            SLIP: clamped.SLIP,
          });
        }
      } else {
        // HP-BASED PATH: Use VB6 launch slice (TIMESLIP.FRM:1218-1228, 1250-1266)
        // Calculate HP and drag HP for VB6 formula
        const hp_at_EngRPM = effectiveRPM > 0 ? (tq_lbft * effectiveRPM) / 5252 : 0;
        const dragHP = (F_drag + F_roll) * state.v_fps / 550; // HP = Force * Velocity / 550
        
        const launchResult = vb6LaunchSlice({
          hpEngine: hp_at_EngRPM,
          clutchSlip: clutchCoupling,
          gearEff: currentGearEff,
          overallEff: getDrivelineEff(),
          tireSlip: getTireSlip(),
          dragHP,
          v_fps: state.v_fps,
          weight_lbf: vehicle.weightLb,
          gc,
          AMin,
          AMax,
          Ags0,
          dt: dt_s,
          JMin,
          JMax,
        });
        
        AGS = launchResult.AGS; // Clamped acceleration (ft/s²)
        // Note: launchResult.PQWT available for future energy accounting
        
        // DEV: HP-based diagnostics for first 10 steps
        if (stepCount <= 10 && typeof console !== 'undefined' && console.debug && launchResult.diag) {
          const AGS_g = AGS / gc;
          const overallRatio = gearRatio * (finalDrive ?? 3.73);
          console.debug('[STEP]', {
            step: stepCount,
            path: 'HP-SLICE',
            v_fps: state.v_fps.toFixed(6),
            EngRPM: effectiveRPM.toFixed(0),
            LockRPM: LockRPM.toFixed(2),
            clutchSlip: clutchCoupling.toFixed(6),
            gear: state.gearIdx + 1,
            GR_x_FD: overallRatio.toFixed(3),
            HP_engine: launchResult.diag.HP_engine.toFixed(1),
            HP_final: launchResult.diag.HP_final.toFixed(1),
            AGS_g: AGS_g.toFixed(4),
            AGS_ftps2: AGS.toFixed(4),
            AMin_ftps2: AMin.toFixed(4),
            AMax_ftps2: AMax.toFixed(4),
            SLIP: launchResult.SLIP,
          });
        }
      }
      
      // Update Ags0 for next step (VB6: TIMESLIP.FRM:1090)
      Ags0 = AGS;
      
      // Energy accounting (DEV only)
      // Energy = Force × Distance, where distance = velocity × time
      const distance_step = state.v_fps * dt_s; // ft
      E_engine_total += F_wheel * distance_step;
      E_drag_total += F_drag * distance_step;
      E_rr_total += F_roll * distance_step;
      
      // Driveline loss = difference between engine torque and wheel torque
      // Loss = (engine_torque × gear × final × eff_loss) × angular_distance
      const engineTorqueAtWheel = tq_lbft * gearRatio * (finalDrive ?? 3.73);
      const drivelineLoss = engineTorqueAtWheel - drivelineTorqueLbFt;
      if (drivelineLoss > 0) {
        // Angular distance = linear distance / radius
        const angular_distance = distance_step / tireRadius_ft; // radians
        E_driveline_loss += drivelineLoss * angular_distance;
      }
      
      // VB6 integration (using clamped acceleration)
      // Semi-implicit Euler: v(t+dt) = v(t) + a * dt, s(t+dt) = s(t) + v(t+dt) * dt
      const v_new_fps = state.v_fps + AGS * dt_s;
      const s_new_ft = state.s_ft + v_new_fps * dt_s;
      const t_new_s = state.t_s + dt_s;
      
      state.v_fps = v_new_fps;
      state.s_ft = s_new_ft;
      state.t_s = t_new_s;
      
      // Check termination conditions AFTER updating kinematics
      // 1. FIRST: Check if we reached the finish line
      if (state.s_ft >= finishDistance_ft) {
        terminationReason = 'DISTANCE';
        break;
      }
      
      // 2. Safety caps (only if we haven't reached finish)
      if (state.t_s >= MAX_TIME_S) {
        terminationReason = 'TIME_CAP';
        break;
      }
      
      if (stepCount >= MAX_STEPS) {
        terminationReason = 'STEP_CAP';
        break;
      }
      
      // Check for shift
      const newGearIdx = maybeShift(state.rpm, state.gearIdx, drivetrain);
      if (newGearIdx !== state.gearIdx) {
        state.gearIdx = newGearIdx;
      }
      
      // VB6 rollout completion (TIMESLIP.FRM:1380)
      // If gc_Rollout.Value > 0 Then time(L) = 0
      if (!rolloutCompleted && state.s_ft >= rolloutFt) {
        rolloutCompleted = true;
        t_at_rollout = state.t_s;
      }
      
      // VB6 trap speed window tracking (TIMESLIP.FRM:1619-1627)
      // Case 5: SaveTime = time(L)  '594 ft
      // Case 8: SaveTime = time(L)  '1254 ft
      if (t_at_594 === 0 && state.s_ft >= 594) {
        t_at_594 = state.t_s;
      }
      if (t_at_1254 === 0 && state.s_ft >= 1254) {
        t_at_1254 = state.t_s;
      }
      
      // VB6 timeslip points (TIMESLIP.FRM:1617-1626)
      // Case 3: TIMESLIP(1) = time(L)  '60 ft
      // Case 4: TIMESLIP(2) = time(L)  '330 ft
      // Case 6: TIMESLIP(3) = time(L)  '660 ft
      // Case 7: TIMESLIP(5) = time(L)  '1000 ft
      // Case 9: TIMESLIP(6) = time(L)  '1320 ft
      while (nextTimeslipIdx < timeslipPoints.length && 
             state.s_ft >= timeslipPoints[nextTimeslipIdx]) {
        const distance = timeslipPoints[nextTimeslipIdx];
        const measuredTime = rolloutCompleted ? state.t_s - t_at_rollout : 0;
        const v_mph = state.v_fps * FPS_TO_MPH;
        
        timeslip.push({
          d_ft: distance,
          t_s: measuredTime,
          v_mph: v_mph,
        });
        
        nextTimeslipIdx++;
      }
      
      // Collect traces at intervals
      if (state.t_s >= nextTraceTime) {
        const a_fps2 = (state.v_fps - prevV_fps) / dt_s;
        const a_g = a_fps2 / g;
        
        traces.push({
          t_s: state.t_s,
          v_mph: state.v_fps * FPS_TO_MPH,
          a_g: a_g,
          s_ft: state.s_ft,
          rpm: state.rpm,
          gear: state.gearIdx + 1, // 1-based for display
        });
        
        nextTraceTime += traceInterval_s;
        prevV_fps = state.v_fps;
      }
    }
    
    // Safety check
    if (state.t_s >= MAX_TIME_S) {
      warnings.push('max_time_exceeded');
    }
    
    // VB6 final ET and trap speed calculation (TIMESLIP.FRM:1621, 1626-1627)
    // TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime)  [eighth mile trap]
    // TIMESLIP(7) = Z5 * 66 / (TIMESLIP(6) - SaveTime)  [quarter mile trap]
    // Z5 = FPS_TO_MPH = 3600 / 5280 (converts fps to mph)
    const measuredET = rolloutCompleted ? state.t_s - t_at_rollout : state.t_s;
    const finalMPH = state.v_fps * FPS_TO_MPH;
    
    // VB6 trap speeds: time-averaged over 66 ft windows
    let eighthMileTrapMPH: number | undefined;
    let quarterMileTrapMPH: number | undefined;
    
    if (t_at_594 > 0 && state.t_s > t_at_594) {
      // Eighth mile trap: 594-660 ft (66 ft window)
      const t_at_660 = state.t_s; // Current time (should be at or past 660)
      const deltaT = t_at_660 - t_at_594;
      if (deltaT > 0) {
        eighthMileTrapMPH = FPS_TO_MPH * 66 / deltaT;
      }
    }
    
    if (t_at_1254 > 0 && state.t_s > t_at_1254) {
      // Quarter mile trap: 1254-1320 ft (66 ft window)
      const t_at_1320 = state.t_s; // Current time (should be at or past 1320)
      const deltaT = t_at_1320 - t_at_1254;
      if (deltaT > 0) {
        quarterMileTrapMPH = FPS_TO_MPH * 66 / deltaT;
      }
    }
    
    // Final kinetic energy (DEV only)
    // Translational: KE = 0.5 × m × v²
    E_kinetic_trans = 0.5 * mass_slugs * state.v_fps * state.v_fps;
    
    // Rotational: KE_rot = 0.5 × I × ω²
    // I = moment of inertia (slug-ft²), ω = angular velocity (rad/s)
    // For wheels: I ≈ m_wheel × r², ω = v / r
    // If no explicit reason was set, mark as SAFETY
    if (!terminationReason) {
      terminationReason = 'SAFETY';
    }
    
    // DEV: Log termination info
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[RSACLASSIC END]', {
        reason: terminationReason,
        t_s: state.t_s,
        steps: stepCount,
        d_ft: state.s_ft,
        target_ft: finishDistance_ft,
      });
    }
    
    // DEV: Warn if we didn't reach the finish line
    if (typeof console !== 'undefined' && console.warn && terminationReason !== 'DISTANCE') {
      console.warn('Terminated without crossing finish:', {
        reason: terminationReason,
        t_s: state.t_s,
        d_ft: state.s_ft,
        target_ft: finishDistance_ft,
      });
    }
    
    // Ensure we have a timeslip entry at finish
    if (timeslip.length === 0 || timeslip[timeslip.length - 1].d_ft !== finishDistance_ft) {
      timeslip.push({
        d_ft: finishDistance_ft,
        t_s: measuredET,
        v_mph: finalMPH,
      });
    }
    
    // VB6 trap speeds: time-averaged over 66 ft windows (TIMESLIP.FRM:1621, 1626-1627)
    // TIMESLIP(4) = Z5 * 66 / (TIMESLIP(3) - SaveTime)  [eighth mile trap]
    // TIMESLIP(7) = Z5 * 66 / (TIMESLIP(6) - SaveTime)  [quarter mile trap]
    // Z5 = 3600 / 5280 (converts to mph)
    const windowMPH: { e660_mph?: number; q1320_mph?: number } = {};
    
    if (eighthMileTrapMPH !== undefined) {
      windowMPH.e660_mph = eighthMileTrapMPH;
    }
    
    if (quarterMileTrapMPH !== undefined) {
      windowMPH.q1320_mph = quarterMileTrapMPH;
    }
    
    // Energy summary logging (DEV only)
    // @ts-ignore - import.meta.env.DEV is available in Vite
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      const E_total_in = E_engine_total;
      const E_total_out = E_drag_total + E_rr_total + E_driveline_loss;
      const E_total_kinetic = E_kinetic_trans + E_kinetic_rot;
      const E_balance = E_total_in - E_total_out - E_total_kinetic;
      
      console.log(`\n=== ENERGY SUMMARY: ${vehicle.name ?? 'Unknown'} ===`);
      console.log(`ET: ${measuredET.toFixed(3)}s, Trap MPH: ${finalMPH.toFixed(1)}`);
      console.log(`\nEnergy In:`);
      console.log(`  Engine:           ${(E_engine_total / 1000).toFixed(1)} k-ft-lb`);
      console.log(`\nEnergy Out:`);
      console.log(`  Aero Drag:        ${(E_drag_total / 1000).toFixed(1)} k-ft-lb (${(100 * E_drag_total / E_total_in).toFixed(1)}%)`);
      console.log(`  Rolling Resist:   ${(E_rr_total / 1000).toFixed(1)} k-ft-lb (${(100 * E_rr_total / E_total_in).toFixed(1)}%)`);
      console.log(`  Driveline Loss:   ${(E_driveline_loss / 1000).toFixed(1)} k-ft-lb (${(100 * E_driveline_loss / E_total_in).toFixed(1)}%)`);
      console.log(`  Total Losses:     ${(E_total_out / 1000).toFixed(1)} k-ft-lb (${(100 * E_total_out / E_total_in).toFixed(1)}%)`);
      console.log(`\nFinal Kinetic Energy:`);
      console.log(`  Translational:    ${(E_kinetic_trans / 1000).toFixed(1)} k-ft-lb (${(100 * E_kinetic_trans / E_total_in).toFixed(1)}%)`);
      console.log(`  Rotational:       ${(E_kinetic_rot / 1000).toFixed(1)} k-ft-lb (${(100 * E_kinetic_rot / E_total_in).toFixed(1)}%)`);
      console.log(`  Total Kinetic:    ${(E_total_kinetic / 1000).toFixed(1)} k-ft-lb (${(100 * E_total_kinetic / E_total_in).toFixed(1)}%)`);
      console.log(`\nEnergy Balance:     ${(E_balance / 1000).toFixed(1)} k-ft-lb (${(100 * Math.abs(E_balance) / E_total_in).toFixed(1)}% error)`);
      console.log(`===\n`);
    }
    
    // Build result
    const result: SimResult = {
      et_s: measuredET,
      mph: finalMPH,
      timeslip: timeslip,
      traces: traces.length > 0 ? traces : undefined,
      meta: {
        model: 'RSACLASSIC',
        steps: Math.floor(state.t_s / dt_s),
        warnings: warnings,
        windowMPH: Object.keys(windowMPH).length > 0 ? windowMPH : undefined,
        converter: converter && !clutch ? {
          used: true,
          avgTR: converterSteps > 0 ? sumTR / converterSteps : 1.0,
          avgETA: converterSteps > 0 ? sumETA / converterSteps : 1.0,
          avgSR: converterSteps > 0 ? sumSR / converterSteps : 1.0,
          deRateMax: 0.30,
          parasiticConst: 0.05,
          parasiticQuad: 1e-6,
        } : undefined,
        clutch: clutch ? {
          used: true,
          minC: minC,
          lockupAt_ft: lockupAt_ft,
        } : undefined,
        rollout: {
          rolloutIn: rolloutIn ?? 12,
          t_roll_s: t_at_rollout,
        },
        fuel: fuel ? {
          type: fuel,
          minScale: minFuelScale,
          maxScale: maxFuelScale,
        } : undefined,
        vb6: {
          dt_s: dt_s,
          trapMode: 'time' as const,
          windowsFt: {
            eighth: { start: 594, end: 660, distance: 66 },
            quarter: { start: 1254, end: 1320, distance: 66 },
          },
          timeslipPoints: [60, 330, 660, 1000, 1320],
          rolloutBehavior: 'ET clock starts after rollout distance (TIMESLIP.FRM:1380)',
        },
        termination: {
          reason: terminationReason,
          steps: stepCount,
          t_s: state.t_s,
          target_ft: finishDistance_ft,
        },
      },
    };
    
    return result;
  }
}

/**
 * RSACLASSIC model instance.
 */
export const RSACLASSIC: PhysicsModel = new RSACLASSICModel();
