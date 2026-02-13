/**
 * VB6 Print Scheduler
 * 
 * Generates print events exactly like VB6 TIMESLIP.FRM:
 * - Staged row at start (L=1)
 * - Rollout distance event (Quarter Pro/Jr only)
 * - Time-based prints at configured increment (0.5s for Pro, 1.0s for Jr)
 * - Distance-based prints at configured distances
 * - Speed-based prints (Bonneville only: 100, 200 mph)
 * 
 * VB6 Reference: TIMESLIP.FRM lines 1360-1430
 */

import { sng } from './vb6PrintFormat';

/**
 * Print event types matching VB6 AddListLine triggers
 */
export type PrintEventType = 'staged' | 'rollout' | 'distance' | 'time' | 'speed' | 'shift';

/**
 * A scheduled print event
 */
export interface PrintEvent {
  type: PrintEventType;
  /** For distance events: target distance in feet (or miles for Bonneville) */
  targetDist?: number;
  /** For time events: target time in seconds (ET, not absolute) */
  targetTime?: number;
  /** For speed events: target speed in fps */
  targetSpeed?: number;
  /** VB6 iDist index (1-based) */
  iDist?: number;
  /** Label for display */
  label: string;
}

/**
 * Configuration for print scheduling
 */
export interface PrintSchedulerConfig {
  /** Race type: 'quarter' for Quarter Pro/Jr, 'bonneville' for Bonneville Pro */
  raceType: 'quarter' | 'bonneville';
  /** Time print increment in seconds (0.5 for Pro, 1.0 for Jr) */
  timePrintInc: number;
  /** Distance print points in feet (or miles for Bonneville) */
  distPrintPoints: number[];
  /** Rollout distance in feet (0 for no rollout) */
  rolloutFt: number;
  /** Speed print points in fps (Bonneville only) */
  speedPrintPoints?: number[];
  /** Race end distance in feet */
  raceEndDist: number;
}

/**
 * State for tracking print progress during simulation
 */
export interface PrintSchedulerState {
  /** Current time print target (ET) */
  timePrint: number;
  /** Current distance print index (0-based, maps to iDist-1) */
  distPrintIdx: number;
  /** Current speed print index (0-based) */
  speedPrintIdx: number;
  /** Whether staged row has been printed */
  stagedPrinted: boolean;
  /** Whether rollout has been triggered */
  rolloutTriggered: boolean;
  /** Timer start time (absolute time when rollout triggered) */
  timerStartTime: number | null;
}

/**
 * Create initial print scheduler state
 */
export function createPrintSchedulerState(config: PrintSchedulerConfig): PrintSchedulerState {
  return {
    timePrint: config.timePrintInc, // First time print is at timePrintInc (e.g., 0.5s)
    distPrintIdx: 0, // Start at first distance target (rollout for Quarter, 1mi for Bonneville)
    speedPrintIdx: 0,
    stagedPrinted: false,
    rolloutTriggered: false,
    timerStartTime: null,
  };
}

/**
 * VB6 tolerance constants
 */
const TimeTol = 0.002;
const DistTol_rollout = 0.005;
const DistTol_normal = 0.1;
const DistTol_fine = 0.008;

/**
 * Get distance tolerance based on iDist (VB6 lines 1379, 1387)
 */
function getDistTol(iDist: number): number {
  if (iDist <= 1) return DistTol_rollout;
  if (iDist <= 4) return DistTol_normal;
  return DistTol_fine;
}

/**
 * Check if a print event should trigger based on VB6 tolerance logic
 * 
 * VB6 uses two conditions for distance prints (line 1375):
 *   (DistStep < DistTol And (DistStep / Vel) < TimeTol) Or (ShiftFlag = 2 And Dist >= DistToPrint)
 * 
 * For time prints (line 1421):
 *   (Abs(TimePrint - time) < TimeTol) Or (ShiftFlag = 2 And time >= TimePrint)
 */
export function checkDistancePrint(
  currentDist: number,
  targetDist: number,
  currentVel: number,
  iDist: number,
  shiftFlag: number
): boolean {
  const distStep = Math.abs(targetDist - currentDist);
  const distTol = getDistTol(iDist);
  
  // Normal tolerance check
  if (distStep < distTol && (currentVel > 0 ? (distStep / currentVel) < TimeTol : true)) {
    return true;
  }
  
  // Shift override: if shifting and past target
  if (shiftFlag === 2 && currentDist >= targetDist) {
    return true;
  }
  
  return false;
}

export function checkTimePrint(
  currentTime: number,
  targetTime: number,
  shiftFlag: number
): boolean {
  // Normal tolerance check
  if (Math.abs(targetTime - currentTime) < TimeTol) {
    return true;
  }
  
  // Shift override: if shifting and past target
  if (shiftFlag === 2 && currentTime >= targetTime) {
    return true;
  }
  
  return false;
}

export function checkSpeedPrint(
  currentSpeed: number,
  targetSpeed: number,
  kv: number,
  shiftFlag: number
): boolean {
  // Normal tolerance check
  if (Math.abs(targetSpeed - currentSpeed) < kv) {
    return true;
  }
  
  // Shift override: if shifting and past target
  if (shiftFlag === 2 && currentSpeed >= targetSpeed) {
    return true;
  }
  
  return false;
}

/**
 * Determine which print events should fire for the current simulation state.
 * Returns events in VB6 order (distance checked before time before speed).
 * 
 * VB6 order (TIMESLIP.FRM):
 * 1. PrintFlag check (lines 1360-1371) - general print after LAdd=1
 * 2. Distance print check (lines 1373-1418)
 * 3. Time print check (lines 1420-1423)
 * 4. Speed print check (lines 1425-1430)
 */
export function getPendingPrintEvents(
  state: PrintSchedulerState,
  config: PrintSchedulerConfig,
  simState: {
    time_s: number;      // Absolute time
    dist_ft: number;     // Current distance
    vel_fps: number;     // Current velocity
    shiftFlag: number;   // 0=normal, 1=shift starting, 2=shift in progress
  }
): PrintEvent[] {
  const events: PrintEvent[] = [];
  
  // Calculate ET (elapsed time from rollout)
  const et = state.timerStartTime !== null 
    ? simState.time_s - state.timerStartTime 
    : 0;
  
  // Check distance print
  if (state.distPrintIdx < config.distPrintPoints.length) {
    const targetDist = config.distPrintPoints[state.distPrintIdx];
    const iDist = state.distPrintIdx + 1; // VB6 is 1-based
    
    if (checkDistancePrint(simState.dist_ft, targetDist, simState.vel_fps, iDist, simState.shiftFlag)) {
      // Determine label
      let label: string;
      if (iDist === 1 && config.rolloutFt > 0) {
        label = 'Rollout';
      } else if (config.raceType === 'bonneville') {
        label = `${(targetDist / 5280).toFixed(2)}mi`;
      } else {
        label = `${targetDist}ft`;
      }
      
      events.push({
        type: iDist === 1 && config.rolloutFt > 0 ? 'rollout' : 'distance',
        targetDist,
        iDist,
        label,
      });
    }
  }
  
  // Check time print
  if (checkTimePrint(et, state.timePrint, simState.shiftFlag)) {
    events.push({
      type: 'time',
      targetTime: state.timePrint,
      label: `t=${state.timePrint.toFixed(2)}s`,
    });
  }
  
  // Check speed print (Bonneville only)
  if (config.speedPrintPoints && state.speedPrintIdx < config.speedPrintPoints.length) {
    const targetSpeed = config.speedPrintPoints[state.speedPrintIdx];
    const kv = config.raceType === 'bonneville' ? sng(0.05 / sng(3600 / 5280)) : sng(0.02 / sng(3600 / 5280));
    
    if (checkSpeedPrint(simState.vel_fps, targetSpeed, kv, simState.shiftFlag)) {
      const mph = targetSpeed * (3600 / 5280);
      events.push({
        type: 'speed',
        targetSpeed,
        label: `${mph.toFixed(0)}mph`,
      });
    }
  }
  
  return events;
}

/**
 * Advance the print scheduler state after events have been processed
 */
export function advancePrintState(
  state: PrintSchedulerState,
  config: PrintSchedulerConfig,
  events: PrintEvent[]
): void {
  for (const event of events) {
    switch (event.type) {
      case 'staged':
        state.stagedPrinted = true;
        break;
      case 'rollout':
        state.rolloutTriggered = true;
        state.distPrintIdx++;
        break;
      case 'distance':
        state.distPrintIdx++;
        break;
      case 'time':
        state.timePrint += config.timePrintInc;
        break;
      case 'speed':
        state.speedPrintIdx++;
        break;
    }
  }
}

/**
 * Get the default print scheduler config for a race type
 */
export function getDefaultPrintConfig(
  raceType: 'quarter-pro' | 'quarter-jr' | 'bonneville',
  rolloutFt: number = 0.75
): PrintSchedulerConfig {
  switch (raceType) {
    case 'quarter-pro':
      return {
        raceType: 'quarter',
        timePrintInc: 0.5,
        // VB6: DistToPrint array for Quarter Pro (1-based: rollout, 30, 60, 330, 594, 660, 1000, 1254, 1320)
        distPrintPoints: [rolloutFt, 30, 60, 330, 594, 660, 1000, 1254, 1320],
        rolloutFt,
        raceEndDist: 1320,
      };
    case 'quarter-jr':
      return {
        raceType: 'quarter',
        timePrintInc: 1.0,
        distPrintPoints: [rolloutFt, 30, 60, 330, 594, 660, 1000, 1254, 1320],
        rolloutFt,
        raceEndDist: 1320,
      };
    case 'bonneville':
      // Bonneville uses miles, no rollout
      // VB6: DistToPrint for Bonneville (1mi, 2mi, 3mi, 4mi, 5mi in feet)
      return {
        raceType: 'bonneville',
        timePrintInc: 10.0,
        distPrintPoints: [5280, 10560, 15840, 21120, 26400], // 1-5 miles in feet
        rolloutFt: 0,
        speedPrintPoints: [100 * 5280 / 3600, 200 * 5280 / 3600], // 100, 200 mph in fps
        raceEndDist: 26400, // 5 miles
      };
  }
}
