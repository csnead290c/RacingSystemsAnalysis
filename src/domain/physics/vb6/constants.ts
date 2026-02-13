/**
 * VB6-ported constants.
 * 
 * CRITICAL TYPE INFORMATION (from actual VB6 source inspection):
 * 
 * VB6 Rule: `Const X = 3.14` (no type suffix) declares X as DOUBLE, not Single.
 * VB6 Rule: `Const X! = 3.14` (with ! suffix) declares X as Single.
 * 
 * Source files inspected:
 * - DECLARES.BAS lines 10-12: PI, gc, Z6 declared WITHOUT suffix = DOUBLE
 * - TIMESLIP.FRM lines 542-559: Z5, AX, CMU, etc. declared WITHOUT suffix = DOUBLE
 * 
 * VB6 computes expressions involving Double constants in Double precision,
 * then truncates to Single ONLY when assigned to a Dim'd Single variable.
 */

// Import banker's rounding from exactMath.ts (matches VB6 Format() function)
import { vb6Round } from './exactMath';

// ===== DECLARES.BAS =====

/** PI constant - DECLARES.BAS:10 - VB6: Public Const PI = 3.141593 (DOUBLE - no suffix) */
export const PI = 3.141593;

/** Gravitational acceleration (ft/s²) - DECLARES.BAS:11 - VB6: Public Const gc = 32.174 (DOUBLE) */
export const gc = 32.174;

/** Z6 constant: (60 / (2 * PI)) * 550 - DECLARES.BAS:12 - VB6: Public Const Z6 = ... (DOUBLE)
 * VB6 computes this entirely in Double precision.
 */
export const Z6 = (60 / (2 * PI)) * 550;

// ===== QTRPERF.BAS Weather() =====

/** Standard temperature (°R) - QTRPERF.BAS:1291 */
export const TSTD = 519.67;

/** Standard pressure (psi) - QTRPERF.BAS:1292 */
export const PSTD = 14.696;

/** Standard barometer (inHg) - QTRPERF.BAS:1293 */
export const BSTD = 29.92;

/** Molecular weight of air - QTRPERF.BAS:1294 */
export const WTAIR = 28.9669;

/** Molecular weight of water - QTRPERF.BAS:1295 */
export const WTH20 = 18.016;

/** Universal gas constant - QTRPERF.BAS:1296 */
export const RSTD = 1545.32;

// ===== TIMESLIP.FRM Constants =====
// VB6: All declared as `Const X = value` (no suffix) = DOUBLE

/** Z5 constant: 3600 / 5280 - TIMESLIP.FRM:542 - VB6: Const Z5 = 3600 / 5280 (DOUBLE) */
export const Z5 = 3600 / 5280;

/** CMU: Rolling resistance coefficient for Quarter Jr/Pro - TIMESLIP.FRM:552 (DOUBLE) */
export const CMU = 0.025;

/** CMUK: Distance-dependent CMU reduction for Quarter Jr/Pro - TIMESLIP.FRM:553 (DOUBLE) */
export const CMUK = 0.01;

// ===== Bonneville Pro Constants (ISBVPRO) - TIMESLIP.FRM:560-569 =====

/** CMU_BV: Rolling resistance coefficient for Bonneville Pro - TIMESLIP.FRM:562 (DOUBLE) */
export const CMU_BV = 0.03;

/** CMUK_BV: Distance-dependent CMU reduction for Bonneville Pro (none) - TIMESLIP.FRM:563 */
export const CMUK_BV = 0;

/** AX_BV: Traction coefficient multiplier for Bonneville Pro - TIMESLIP.FRM:561 (DOUBLE) */
export const AX_BV = 9.7;

/** FRCT_BV: Driveline friction coefficient for Bonneville Pro - TIMESLIP.FRM:569 (DOUBLE) */
export const FRCT_BV = 1.01;

/** KP21_BV: Engine PMI deceleration factor for Bonneville Pro (none) - TIMESLIP.FRM:567 */
export const KP21_BV = 0;

/** KP22_BV: Engine PMI deceleration factor for Bonneville Pro (none) - TIMESLIP.FRM:568 */
export const KP22_BV = 0;

/** KV_BV: Velocity tolerance for Bonneville Pro - TIMESLIP.FRM:565 (DOUBLE) */
export const KV_BV = 0.05 / Z5;

/** K7_BV: Steps per time print increment for Bonneville Pro - TIMESLIP.FRM:566 (DOUBLE) */
export const K7_BV = 5.5;

/** Time tolerance (seconds) - TIMESLIP.FRM:554 (DOUBLE) */
export const TimeTol = 0.002;

/** KV constant - TIMESLIP.FRM:555 (DOUBLE) */
export const KV = 0.02 / Z5;

/** K7 constant (steps per time print increment) - TIMESLIP.FRM:556 (DOUBLE) */
export const K7 = 9.5;

/** AMin: Minimum acceleration (ft/s²) - TIMESLIP.FRM:547-548 (DOUBLE) */
export const AMin = 0.004;

/** JMin: Minimum jerk (g/s) - TIMESLIP.FRM:543 (DOUBLE) */
export const JMin = -4;

/** JMax: Maximum jerk (g/s) - TIMESLIP.FRM:544 (DOUBLE) */
export const JMax = 2;

/** K6: HP ratio lower bound for time interpolation - TIMESLIP.FRM:545 (DOUBLE) */
export const K6 = 0.92;

/** K61: HP ratio upper bound for time interpolation - TIMESLIP.FRM:546 (DOUBLE) */
export const K61 = 1.08;

/** KP21: Engine PMI deceleration factor for manual transmission - TIMESLIP.FRM:557 (DOUBLE) */
export const KP21 = 0.15;

/** KP22: Engine PMI deceleration factor for automatic transmission - TIMESLIP.FRM:558 (DOUBLE) */
export const KP22 = 0.25;

/** FRCT: Driveline friction coefficient - TIMESLIP.FRM:559 (DOUBLE) */
export const FRCT = 1.03;

/** AX: Traction coefficient multiplier for Quarter Jr/Pro - TIMESLIP.FRM:551 (DOUBLE) */
export const AX = 10.8;

// ===== Derived Constants =====

/** Horsepower to foot-pounds per second conversion */
export const HP_TO_FTLBPS = 550;

/** Feet per second to miles per hour conversion (3600/5280) */
export const FPS_TO_MPH = 3600 / 5280;

/** Inches to feet conversion */
export const INCH_TO_FT = 1 / 12;

/** Rankine temperature offset (°F to °R) */
export const RANKINE_OFFSET = 459.67;

/** Gravitational acceleration (alias for gc) */
export const g = gc;

// ===== VB6 Rounding Functions =====

/**
 * Round ET using VB6 banker's rounding (round-half-to-even).
 * 
 * CRITICAL: VB6 uses banker's rounding for ET/MPH display formatting.
 * 
 * VB6 Evidence:
 * - TIMESLIP.FRM:1496 - RightAlign(5, 2, time(L)) for ET (2 decimals)
 * - CVALUE.CLS:557 - RightAlign uses Format() which applies banker's rounding
 * - NOT the custom Round() function from RSALIB.bas (that's round-half-up for intermediate calcs)
 * 
 * @param et_s - ET in seconds
 * @param decimals - Number of decimal places (default: 2 to match VB6)
 */
export function roundET(et_s: number, decimals: number = 2): number {
  return vb6Round(et_s, decimals);
}

/**
 * Round MPH using VB6 banker's rounding (round-half-to-even).
 * 
 * CRITICAL: VB6 uses banker's rounding for ET/MPH display formatting.
 * 
 * VB6 Evidence:
 * - TIMESLIP.FRM:1508 - RightAlign(4, 1, Work) for MPH (1 decimal)
 * - CVALUE.CLS:557 - RightAlign uses Format() which applies banker's rounding
 * - NOT the custom Round() function from RSALIB.bas (that's round-half-up for intermediate calcs)
 * 
 * @param mph - Speed in MPH
 * @param decimals - Number of decimal places (default: 1 to match VB6)
 */
export function roundMPH(mph: number, decimals: number = 1): number {
  return vb6Round(mph, decimals);
}
