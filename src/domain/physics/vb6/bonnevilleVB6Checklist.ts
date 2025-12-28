/**
 * Bonneville Pro VB6 Differences Checklist
 * Systematically verify all ISBVPRO conditional code is implemented
 */

// VB6 TIMESLIP.FRM - All #If ISBVPRO / #Else sections

export const BONNEVILLE_VB6_DIFFERENCES = {
  // Line 560-569: Constants
  constants: {
    AX: 9.7,           // vs 10.8 for Quarter (line 561)
    CMU: 0.03,         // vs 0.025 for Quarter (line 562)
    CMUK: 0,           // vs 0.01 for Quarter (line 563)
    FRCT: 1.01,        // vs 1.03 for Quarter (line 564)
    KV: 0.05,          // vs 0.02 for Quarter (line 565)
    K7: 5.5,           // vs 9.5 for Quarter (line 566)
    KP21: 0,           // vs 0.15 for Quarter (line 567)
    KP22: 0,           // vs 0.25 for Quarter (line 568)
  },

  // Line 783-785: Displacement calculation (QuarterJr/Bonneville only)
  displacement: {
    formula: '(PeakHP / 1.2) * (3800 / RPMPeakHP) / CalcWork',
    note: 'Bonneville uses different displacement estimation than QuarterJr'
  },

  // Line 819-856: Distance print points
  distancePrintPoints: {
    case1: [1, 660, 1320, 1980, 2640, 3300, 3960, 4620, 5280],  // 1 mile
    case2: [1, 660, 1320, 2640, 3960, 5280, 5808, 6336, 6864],  // 1.3 miles
    case3: [1, 660, 1320, 2640, 3960, 5280, 6600, 7260, 7920],  // 1.5 miles
    case4: [1, 660, 1320, 2640, 5280, 6600, 7920, 9240, 10560], // 2 miles
    case5: [1, 2640, 5280, 7920, 10560, 11880, 13200, 14520, 15840], // 3 miles
    case6: [1, 5280, 10560, 13200, 15840, 18480, 21120, 23760, 26400], // 5 miles
    case7: [1, 5280, 10560, 21120, 31680, 36960, 42240, 47520, 52800], // 10 miles
    note: 'First element is rollout (0→1 if rollout=0)'
  },

  // Line 874-876: Track temp and tire slip
  trackTemp: {
    TrackTempEffect: 1,  // Always 1 for Bonneville (vs dynamic for Quarter)
    TireSlip: '1.01 + (TractionIndex - 1) * 0.01',  // Simpler formula
    note: 'No distance-based tire slip reduction for Bonneville'
  },

  // Line 883-886: ET estimation
  etEstimation: {
    formula: 'vmax = 0.95 * (2*gc*550*hpmax / (rho*DragCoef*RefArea))^(1/3)',
    formula2: 'vmax = vmax * (hpmax/Weight)^0.2',
    formula3: 'ET = DistToPrint(9) / (vmax * 0.72)',
    note: 'Different from Quarter mile formula'
  },

  // Line 891-892: kd value
  kd: {
    value: 29,  // vs 33 for QuarterPro, 28 for QuarterJr
    note: 'Used for TimePrintInc calculation'
  },

  // Line 998-1000: Initial DistTol
  distTol: {
    initial: 1,  // vs 0.005 for Quarter
    note: 'Constant 1 ft tolerance for all checkpoints'
  },

  // Line 1065-1067: TSMax
  tsMax: {
    value: 0.1,  // Fixed 0.1s timestep
    note: 'vs dynamic calculation for Quarter'
  },

  // Line 1098-1102: Tire slip calculation in loop
  tireSlipInLoop: {
    quarter: 'Work = 0.005*(TI-1) + 3*(TrackTempEffect-1); TireSlip = 1.02 + Work*(1-(Dist0/1320)^2)',
    bonneville: 'NOT RECALCULATED - uses initial value only',
    note: 'Bonneville does NOT recalculate tire slip during run'
  },

  // Line 1299: PrintFlag for zero rollout
  printFlag: {
    condition: 'If iDist = 1 And gc_Rollout.Value = 0 Then PrintFlag = -1',
    note: 'Skip first checkpoint if rollout is 0'
  },

  // Line 1404-1412: TIMESLIP recording
  timeslipRecording: {
    case3_9: 'If ShiftFlag < 2 Then TIMESLIP(x) = Vel(L) * Z5',
    note: 'Uses instantaneous velocity, NOT trap speed formula'
  },

  // Line 1500-1502: Distance display
  distanceDisplay: {
    format: 'Dist(L) / 5280',  // Display in miles
    note: 'vs feet for Quarter'
  }
};

console.log('='.repeat(80));
console.log('BONNEVILLE VB6 IMPLEMENTATION CHECKLIST');
console.log('='.repeat(80));

console.log('\n✅ IMPLEMENTED:');
console.log('  1. Constants (AX=9.7, CMU=0.03, CMUK=0, FRCT=1.01, KV=0.05, K7=5.5)');
console.log('  2. Distance print points (1 mile track)');
console.log('  3. TrackTempEffect = 1 (always)');
console.log('  4. TireSlip = 1.01 + (TI-1)*0.01 (initial)');
console.log('  5. ET estimation formula (vmax-based)');
console.log('  6. kd = 29');
console.log('  7. DistTol = 1 (constant)');
console.log('  8. TSMax = 0.1 (fixed)');
console.log('  9. PrintFlag = -1 for zero rollout first checkpoint');
console.log(' 10. TIMESLIP uses instantaneous velocity (Vel*Z5)');

console.log('\n❓ TO VERIFY:');
console.log('  1. Tire slip NOT recalculated in loop (should stay constant)');
console.log('  2. KP21 = 0, KP22 = 0 (engine PMI decel factors)');
console.log('  3. All distance print points correct for 2-mile track');

console.log('\n' + '='.repeat(80));
