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
import { maxTractive_lb, type TireParams } from '../tire/traction';
import { stepEuler, createInitialState, type StepForces } from '../core/integrator';
import { lbToSlug } from '../core/units';
import { g, FPS_TO_MPH } from '../vb6/constants';
import { hpToTorqueLbFt } from '../vb6/convert';
import { vb6AirDensitySlugFt3 } from '../vb6/atmosphere';
import { vb6RollingResistanceTorque, vb6AeroTorque } from '../vb6/forces';
import { vb6Converter, vb6Clutch, vb6DirectDrive } from '../vb6/driveline';
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
    
    // Determine finish distance
    const finishDistance_ft = raceLength === 'EIGHTH' ? 660 : 1320;
    
    // Resolve parameters with defaults
    const cd = vehicle.cd ?? 0.38;
    const frontalArea_ft2 = vehicle.frontalArea_ft2 ?? 22;
    // TODO: liftCoeff for downforce/lift (vehicle.liftCoeff ?? 0.0)
    // rrCoeff now computed inline where needed
    const transEff = vehicle.transEff ?? 0.9;
    const finalDrive = vehicle.finalDrive ?? vehicle.rearGear ?? 3.73;
    const gearRatios = vehicle.gearRatios ?? [1.0];
    const gearEff = vehicle.gearEff; // Per-gear efficiency, optional
    const shiftRPM = vehicle.shiftRPM ?? [];
    
    // Tire radius from multiple sources
    const tireRadius_ft = vehicle.tireDiaIn
      ? (vehicle.tireDiaIn / 12) / 2
      : vehicle.tireRolloutIn
        ? (vehicle.tireRolloutIn / 12) / Math.PI
        : (28 / 12) / 2; // Default 28" diameter
    const tireDiaIn = tireRadius_ft * 2 * 12;
    
    const rolloutIn = vehicle.rolloutIn ?? 12;
    
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
    const rolloutFt = rolloutIn / 12;
    
    // Drivetrain configuration
    const drivetrain: Drivetrain = {
      ratios: gearRatios,
      finalDrive: finalDrive,
      transEff: transEff,
      tireDiaIn: tireDiaIn,
      shiftRPM: shiftRPM,
    };
    
    // Engine parameters
    const engineParams: EngineParams = {
      torqueCurve: torqueCurve,
      powerHP: vehicle.powerHP,
      corr: corr,
    };
    
    // Tire parameters
    const tireParams: TireParams = {
      mu0: 1.6, // Drag radials/slicks
    };
    
    // Integration parameters
    // TODO: Use exact VB6 dt value once verified from QTRPERF.BAS (likely 0.001 or 0.002)
    const dt_s = 0.002; // Temporary: 2ms timestep (changed from 0.005 to match VB6)
    const maxTime_s = 15; // Safety cap
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
    const warnings: string[] = [];
    
    // Track rollout completion
    let rolloutCompleted = false;
    let t_at_rollout = 0;
    
    // Track timeslip points
    const timeslipPoints = [60, 330, 660, 1000, finishDistance_ft];
    let nextTimeslipIdx = 0;
    
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
    
    // Fuel tracking
    const fuel = (input as any).fuel as 'GAS' | 'METHANOL' | 'NITRO' | undefined;
    let minFuelScale = 1.0;
    let maxFuelScale = 1.0;
    
    // Integration loop
    while (state.s_ft < finishDistance_ft && state.t_s < maxTime_s) {
      // Calculate RPM from current speed
      let rpm = rpmFromSpeed(state.v_fps, state.gearIdx, drivetrain);
      
      // VB6 driveline: converter, clutch, or direct drive
      let drivelineTorqueLbFt = 0;
      let effectiveRPM = rpm;
      let clutchCoupling = 1.0;
      
      // Calculate engine torque first (needed for driveline)
      let currentGearEff = gearEff && gearEff[state.gearIdx] !== undefined
        ? gearEff[state.gearIdx]
        : transEff;
      currentGearEff = Math.max(0.9, Math.min(1.0, currentGearEff));
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
      const gearRatio = gearRatios[state.gearIdx];
      const wheelRPM = (state.v_fps * 60) / (2 * Math.PI * tireRadius_ft);
      
      if (clutch) {
        // VB6 clutch model
        const slipRPM = clutch.slipRPM ?? clutch.launchRPM ?? 0;
        const lockup = clutch.lockup ?? false;
        const result = vb6Clutch(tq_lbft, rpm, wheelRPM, gearRatio, finalDrive, slipRPM, lockup);
        drivelineTorqueLbFt = result.Twheel;
        effectiveRPM = result.engineRPM_out;
        clutchCoupling = result.coupling;
        minC = Math.min(minC, clutchCoupling);
        
      } else if (converter && state.gearIdx === 0) {
        // VB6 converter model (1st gear only)
        const stallRPM = converter.stallRPM ?? 3000;
        const torqueMult = converter.torqueMult ?? 2.0;
        const result = vb6Converter(tq_lbft, rpm, wheelRPM, gearRatio, finalDrive, stallRPM, torqueMult);
        drivelineTorqueLbFt = result.Twheel;
        effectiveRPM = result.engineRPM_out;
        
        // Track converter usage
        sumTR += torqueMult; // Placeholder until VB6 formula returns actual TR
        sumETA += 0.85; // Placeholder until VB6 formula returns actual ETA
        sumSR += 0.5; // Placeholder until VB6 formula returns actual SR
        converterSteps++;
      } else {
        // Direct drive (no converter/clutch, or converter in higher gears)
        drivelineTorqueLbFt = vb6DirectDrive(tq_lbft, gearRatio, finalDrive);
        effectiveRPM = rpm;
      }
      
      state.rpm = effectiveRPM;
      
      // Convert driveline torque to wheel force
      // Note: drivelineTorqueLbFt already includes gear ratios and final drive
      const F_wheel = drivelineTorqueLbFt / tireRadius_ft;
      
      // VB6 air density calculation (exact formula from QTRPERF.BAS)
      const rho = vb6AirDensitySlugFt3(
        env.barometerInHg ?? 29.92,
        env.temperatureF ?? 59,
        env.humidityPct ?? 50,
        env.elevation ?? 0
      );
      
      // VB6 rolling resistance torque
      // TODO: Verify rrCoeff default against VB6 source
      const rrCoeff = vehicle.rrCoeff ?? 0.015;
      const T_rr = vb6RollingResistanceTorque(vehicle.weightLb, rrCoeff, tireRadius_ft);
      
      // VB6 aerodynamic drag torque
      const T_drag = vb6AeroTorque(rho, cd, frontalArea_ft2, state.v_fps, tireRadius_ft);
      
      // For integrator compatibility, compute equivalent drag/roll forces
      // (Integrator expects forces, but we've already applied torques)
      const F_drag = T_drag / tireRadius_ft;
      const F_roll = T_rr / tireRadius_ft;
      
      // Calculate maximum traction
      const F_max = maxTractive_lb(vehicle.weightLb, tireParams, env.tractionIndex);
      
      // Limit tractive force to traction limit
      const F_trac = Math.min(F_wheel, F_max);
      
      // Check for wheel slip
      if (F_wheel > F_max && !warnings.includes('wheel_slip')) {
        warnings.push('wheel_slip');
      }
      
      // Build forces for integrator
      const forces: StepForces = {
        tractive_lb: F_trac,
        drag_lb: F_drag,
        roll_lb: F_roll,
        mass_slugs: mass_slugs,
      };
      
      // Integrate one step
      state = stepEuler(dt_s, state, forces);
      
      // Check for shift
      const newGearIdx = maybeShift(state.rpm, state.gearIdx, drivetrain);
      if (newGearIdx !== state.gearIdx) {
        state.gearIdx = newGearIdx;
      }
      
      // Track rollout completion
      if (!rolloutCompleted && state.s_ft >= rolloutFt) {
        rolloutCompleted = true;
        t_at_rollout = state.t_s;
      }
      
      // Collect timeslip points
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
    if (state.t_s >= maxTime_s) {
      warnings.push('max_time_exceeded');
    }
    
    // Calculate final ET and MPH
    const measuredET = rolloutCompleted ? state.t_s - t_at_rollout : state.t_s;
    const finalMPH = state.v_fps * FPS_TO_MPH;
    
    // Ensure we have a timeslip entry at finish
    if (timeslip.length === 0 || timeslip[timeslip.length - 1].d_ft !== finishDistance_ft) {
      timeslip.push({
        d_ft: finishDistance_ft,
        t_s: measuredET,
        v_mph: finalMPH,
      });
    }
    
    // Compute window MPH from traces
    const windowMPH: { e660_mph?: number; q1320_mph?: number } = {};
    
    if (traces.length > 0) {
      // Helper: interpolate at distance
      const interpAtS = (s_ft: number): { t_s: number; v_fps: number } => {
        for (let i = 0; i < traces.length - 1; i++) {
          const p1 = traces[i];
          const p2 = traces[i + 1];
          
          if (s_ft >= p1.s_ft && s_ft <= p2.s_ft) {
            const t = (s_ft - p1.s_ft) / (p2.s_ft - p1.s_ft);
            const t_s = p1.t_s + t * (p2.t_s - p1.t_s);
            const v_mph = p1.v_mph + t * (p2.v_mph - p1.v_mph);
            return { t_s, v_fps: v_mph / FPS_TO_MPH };
          }
        }
        
        // Outside range - return closest
        if (s_ft < traces[0].s_ft) {
          return { t_s: traces[0].t_s, v_fps: traces[0].v_mph / FPS_TO_MPH };
        }
        const last = traces[traces.length - 1];
        return { t_s: last.t_s, v_fps: last.v_mph / FPS_TO_MPH };
      };
      
      // Helper: average velocity between distances
      const avgVfpsBetween = (s0: number, s1: number): number => {
        const p0 = interpAtS(s0);
        const p1 = interpAtS(s1);
        const distance_ft = s1 - s0;
        const time_s = p1.t_s - p0.t_s;
        
        if (time_s <= 0) {
          return (p0.v_fps + p1.v_fps) / 2;
        }
        
        return distance_ft / time_s;
      };
      
      // Compute eighth mile trap (594-660 ft)
      if (finishDistance_ft >= 660) {
        try {
          const avgVfps = avgVfpsBetween(594, 660);
          windowMPH.e660_mph = avgVfps * FPS_TO_MPH;
        } catch {
          // Ignore if traces don't cover this range
        }
      }
      
      // Compute quarter mile trap (1254-1320 ft)
      if (finishDistance_ft >= 1320) {
        try {
          const avgVfps = avgVfpsBetween(1254, 1320);
          windowMPH.q1320_mph = avgVfps * FPS_TO_MPH;
        } catch {
          // Ignore if traces don't cover this range
        }
      }
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
          rolloutIn: rolloutIn,
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
          rolloutBehavior: 'ET clock starts after rollout distance',
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
