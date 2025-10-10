/**
 * VB6-ported constants (do not change).
 * 
 * These constants are extracted from the VB6 codebase to ensure
 * identical physics calculations. Source file and line numbers are noted.
 */

// ===== DECLARES.BAS =====

/** PI constant - DECLARES.BAS:10 */
export const PI = 3.141593;

/** Gravitational acceleration (ft/s²) - DECLARES.BAS:11 */
export const gc = 32.174;

/** Z6 constant: (60 / (2 * PI)) * 550 - DECLARES.BAS:12 */
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

/** Z5 constant: 3600 / 5280 (hours/mile to seconds/foot) - TIMESLIP.FRM:542 */
export const Z5 = 3600 / 5280;

/** CMU: Rolling resistance coefficient for Quarter Jr/Pro - TIMESLIP.FRM:552 */
export const CMU = 0.025;

/** CMUK: Distance-dependent CMU reduction for Quarter Jr/Pro - TIMESLIP.FRM:553 */
export const CMUK = 0.01;

/** Time tolerance (seconds) - TIMESLIP.FRM:554 */
export const TimeTol = 0.002;

/** KV constant - TIMESLIP.FRM:555 */
export const KV = 0.02 / Z5;

/** K7 constant (steps per time print increment) - TIMESLIP.FRM:556 */
export const K7 = 9.5;

/** AMin: Minimum acceleration (ft/s²) - TIMESLIP.FRM:547-548 */
// Reduced from 0.05 to 0.004 for Quarter Jr/Pro to implement Buell rev limit option
// Note: was 0.004 for BVPro already
export const AMin = 0.004;

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
