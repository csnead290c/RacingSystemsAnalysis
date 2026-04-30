/**
 * Field Tooltips Configuration
 *
 * Source-backed from RSA manuals. Each entry includes a citation comment.
 * Do NOT add entries without a verifiable manual reference.
 *
 * Citation format: [Manual] [Section] line [N]
 * Primary source: QPRO3W.txt (QUARTER Pro Version 3.2 Manual, Chapter 4)
 */

export const TOOLTIPS = {
  // ============================================================================
  // WEATHER / ENVIRONMENT — Source: QPRO3W.txt Chapter 4, General Data
  // ============================================================================

  // QPRO3W.txt line 706
  elevation: 'The actual dragstrip elevation above sea level in feet. Normal values: 0–6,000. Never use "relative or density altitude."',
  // QPRO3W.txt line 709
  barometer: 'The local relative barometric pressure in inches of Mercury (in Hg). Standard atmosphere: 29.92. Normal values: 29.2–30.6. When using altimeter for Elevation, always input 29.92.',
  // QPRO3W.txt line 728
  temperature: 'The dragstrip outside air temperature in °F ("dry bulb" temperature). Normal values: 40–110.',
  // QPRO3W.txt line 731
  humidity: 'The local relative humidity at the dragstrip in percent (%). Normal values: 15–90.',
  // QPRO3W.txt line 735
  windVelocity: 'The maximum wind velocity regardless of direction or orientation to the dragstrip, in MPH. Normal values: 0–30.',
  // QPRO3W.txt line 738
  windAngle: 'The angle of the prevailing wind relative to the dragstrip in degrees. 0 = direct head-wind, 180 = direct tail-wind. Values: 0–180.',
  // QPRO3W.txt line 742
  trackTemp: 'The measured temperature of the racing surface in °F. Normal values: between ambient temperature and 150.',
  // QPRO3W.txt lines 749–751
  tractionIndex: 'Specifies dragstrip traction conditions. 1 = best traction ever demonstrated. Local bracket events: 5–6. Street-like: 8–12.',
  // No manual citation — UI-only selector
  trackType: 'The track type as selected from the drop down list.',

  // ============================================================================
  // VEHICLE - MASS & GEOMETRY — Source: QPRO3W.txt Chapter 4, Vehicle Data
  // ============================================================================

  // QPRO3W.txt line 757
  weight: 'The total vehicle weight including driver in pounds (lbs). Normal values: 1,200–4,000.',
  // QPRO3W.txt line 760
  wheelbase: 'The measured vehicle wheelbase in inches. Normal values: 90–300.',
  // QPRO3W.txt line 763
  rollout: 'The distance the vehicle must move before the timing clock starts, in inches. A good rule of thumb is one-half of the staging tire\'s diameter. Normal values: 6–14.',
  // QPRO3W.txt line 770
  overhang: 'The distance the front end overhangs the front axle centerline, in inches. This effectively shortens the dragstrip length. Normal values: 16–40.',
  // No direct QPRO3W.txt citation — Pro-only field, not in basic manual section
  cgHeight: 'The height of the vehicle\'s center of gravity above the ground.',
  // No direct QPRO3W.txt citation — Pro-only field
  frontWeight: 'The static weight on the front axle with driver in the car.',

  // ============================================================================
  // VEHICLE - TIRES — Source: QPRO3W.txt Chapter 4, Final Drive Data
  // ============================================================================

  // QPRO3W.txt line 799
  tireDiameter: 'The driving tire diameter in inches, measured on a properly inflated tire without vehicle weight. Normal values: 24–37.',
  // QPRO3W.txt line 796
  tireRollout: 'The driving tire circumference in inches, measured on a properly inflated tire without vehicle weight. Normal values: 75–118.',
  // QPRO3W.txt lines 803–806
  tireWidth: 'The driving tire\'s "effective" width in inches. For treaded street tires, subtract total groove width from measured width. Normal values: 6–18.',
  // QPRO3W.txt line 1051 (Tire Width Worksheet)
  treadWidth: 'The measured overall tread width in inches. Normal values: 6–12.',
  // QPRO3W.txt line 1055 (Tire Width Worksheet)
  grooves: 'The number of grooves in the treaded street tire. Usually less than 10.',
  // QPRO3W.txt line 1059 (Tire Width Worksheet)
  grooveWidth: 'The measured width of each individual tread groove in inches. Normal values: 0.125–0.25.',

  // ============================================================================
  // VEHICLE - AERODYNAMICS — Source: QPRO3W.txt Chapter 4, Aerodynamic Data
  // ============================================================================

  // QPRO3W.txt line 821
  frontalArea: 'The frontal (or reference) area of the vehicle body frontal projection in square feet. Normal values: 12–28.',
  // QPRO3W.txt line 1074 (Frontal Area Worksheet)
  maxWidth: 'The measured width of the vehicle at its widest point in inches. Normal values: 48–72.',
  // QPRO3W.txt line 1077 (Frontal Area Worksheet)
  maxHeight: 'The measured distance from the ground to the highest point on the vehicle in inches. Normal values: 40–60.',
  // QPRO3W.txt lines 1080, 1087 (Frontal Area Worksheet)
  shapeFactor: 'How much of the pure rectangular area (Width × Height) is really blocking the air, in percent. Normal values: 65–90.',
  // QPRO3W.txt line 826
  dragCoefficient: 'The aerodynamic drag coefficient (Cd). Values are very difficult to obtain. Normal values: 0.25–0.80.',
  // QPRO3W.txt line 829
  liftCoefficient: 'The aerodynamic lift coefficient. Used with Frontal Area to calculate downforce. Normal values: 0.10–0.80.',

  // ============================================================================
  // VEHICLE - FINAL DRIVE — Source: QPRO3W.txt Chapter 4, Final Drive Data
  // ============================================================================

  // QPRO3W.txt line 778
  rearGear: 'The gear ratio of the final drive. Normal values: 3.07–6.50.',
  // QPRO3W.txt line 784
  finalDriveEfficiency: 'The power transmission efficiency of the final drive. A well lubricated hypoid or spiral bevel gear set typically has 2–3% loss. Normal values: 0.97–0.98.',

  // ============================================================================
  // VEHICLE - TRANSMISSION — Source: QPRO3W.txt Chapter 4, Transmission Data
  // ============================================================================

  // QPRO3W.txt line 948
  gearRatio: 'The cumulative transmission gear ratio for each gear. Usual values: ~3.0 for low gear, ~1.0 for high gear. Blank or zero = end of inputs.',
  // QPRO3W.txt line 952
  gearEfficiency: 'The cumulative transmission efficiency for each gear. A well lubricated gear set has 0.5–1.0% loss per gear set. Normal values: 0.96 (low) to 0.99 (high).',
  // QPRO3W.txt line 956
  shiftRPM: 'The engine RPM when gear changes or shifting are to occur. Normal values: 4,500–12,500.',
  // No direct citation
  transEfficiency: 'The mechanical efficiency of the transmission. Typical: 0.95–0.98.',
  // No direct citation
  revLimiter: 'The engine RPM at which the rev limiter activates.',

  // ============================================================================
  // VEHICLE - CLUTCH — Source: QPRO3W.txt Chapter 4, Clutch & Manual Trans
  // ============================================================================

  // QPRO3W.txt line 888
  clutchLaunchRPM: 'The engine RPM the vehicle is launched from at the starting line. Normal values: 4,500–12,000.',
  // QPRO3W.txt line 890
  clutchSlipRPM: 'The minimum engine RPM observed as the vehicle leaves the starting line in low gear. This is the RPM below which the clutch will slip. Normal values: 2,000–7,000.',
  // QPRO3W.txt line 892
  clutchSlippage: 'A small amount of clutch slippage normally occurs even when locked up. Normal values: 1.00–1.01.',
  // QPRO3W.txt line 894
  clutchLockup: 'An option to command lock-up of the clutch during the shifts.',

  // ============================================================================
  // VEHICLE - TORQUE CONVERTER — Source: QPRO3W.txt Chapter 4, TC & Auto Trans
  // ============================================================================

  // QPRO3W.txt line 909
  converterStall: 'The stall or "flash" speed of the torque converter — the RPM at which torque multiplication can occur. Normal values: 2,000–7,500.',
  // QPRO3W.txt line 936
  converterTorqueMult: 'The static torque multiplication factor at stall (output 0 RPM, input at Stall RPM). Normal values: 1.4–2.0. High-stall converters generally have lower multiplication.',
  // QPRO3W.txt line 928
  converterSlippage: 'Normal torque converter slippage when engine RPM is above Stall RPM. Normal values: 1.03–1.08. High-stall converters have higher slippage.',
  // QPRO3W.txt line 1151 (PMI Worksheet)
  converterDiameter: 'The diameter of the torque converter in inches. Normal values: 7–12.',
  // QPRO3W.txt line 932
  converterLockup: 'An option to completely lock-up the torque converter after the first shift.',
  // QPRO3W.txt line 904
  converterLaunchRPM: 'Normally the stall speed. However, some vehicles may be staged at idle or on an RPM limit box.',

  // ============================================================================
  // VEHICLE - PMI — Source: QPRO3W.txt Chapter 4, Polar Moments of Inertia
  // ============================================================================

  // QPRO3W.txt line 981
  enginePMI: 'Polar moment of inertia of components rotating at engine speed: crankshaft, rods, camshaft, flywheel, clutch/converter. Normal values: 2.0–5.0 (in·lbs·sec²).',
  // QPRO3W.txt line 993
  transPMI: 'Polar moment of inertia of components rotating at transmission output speed: shafts, planetaries, driveshaft, pinion gear. Normal values: 0.1–0.8 (in·lbs·sec²).',
  // QPRO3W.txt line 997
  tiresPMI: 'Polar moment of inertia of components at wheel speed: ring gear, axles, brakes, wheels, tires. Normal values: 20–60 (in·lbs·sec²).',

  // ============================================================================
  // VEHICLE - ENGINE — Source: QPRO3W.txt Chapter 4, Engine Dyno Data
  // ============================================================================

  // QPRO3W.txt line 856
  peakHP: 'Engine power in horsepower. Dyno input is for "standard" conditions: sea level, 29.92 in Hg, 60°F, dry air. Normal values: 200–6,000.',
  // QPRO3W.txt line 849
  peakHPRPM: 'Engine speed in RPM. Normal values for dyno data: 2,000–12,000.',
  // QPRO3W.txt line 859
  peakTorque: 'Engine torque in ft·lbs. Normal values: 150–5,000.',
  // No separate citation — derived from HP/RPM
  peakTorqueRPM: 'The RPM at which peak torque occurs.',
  // No direct citation
  idleRPM: 'The engine idle speed in RPM.',
  // No direct citation
  redlineRPM: 'The maximum safe engine RPM (redline).',
  // QPRO3W.txt line 863
  fuelSystem: 'A drop-down menu to select which type of fuel and fuel system are to be modeled.',
  // QPRO3W.txt line 867
  hpTorqueMultiplier: 'A multiplier on the engine dyno data. Can be used to match a known performance level or perform a sensitivity study. Normal values: 0.9–1.1.',

  // ============================================================================
  // WORKSHEET BUTTONS — Source: QPRO3W.txt Chapter 2 & 4
  // ============================================================================

  // QPRO3W.txt line 1067–1069
  btnFrontalArea: 'Display the Frontal Area Worksheet for estimating the projected frontal area.',
  // QPRO3W.txt line 1041–1044
  btnTireWidth: 'Display the Tire Width Worksheet for estimating effective tire width for treaded tires.',
  // No direct citation — worksheet exists in code
  btnGearRatio: 'Display the Gear Ratio Worksheet.',
  // QPRO3W.txt line 1091–1094
  btnPMI: 'Display the Polar Moment of Inertia Worksheet.',
  // No direct citation — worksheet exists in code
  btnRollout: 'Display the Rollout Worksheet.',
  // QPRO3W.txt line 826 (mentions help button)
  btnDragCoef: 'Display help for the Drag Coefficient with examples for various vehicle body styles.',
  // QPRO3W.txt line 751 (mentions help button)
  btnTractionIndex: 'Display help for the Traction Index with examples.',

  // ============================================================================
  // TIMESLIP — Source: QPRO3W.txt Chapter 5 (Calculated Output)
  // ============================================================================

  reactionTime: 'The time between the green light and the vehicle leaving the starting line.',
  sixtyFoot: 'The time to travel the first 60 feet from the starting line.',
  threeThirty: 'The time to travel 330 feet (1/16 mile) from the starting line.',
  eighth: 'The time to travel 660 feet (1/8 mile) from the starting line.',
  eighthMPH: 'The speed at the 1/8 mile mark.',
  thousand: 'The time to travel 1000 feet from the starting line.',
  quarter: 'The time to travel 1320 feet (1/4 mile) from the starting line.',
  quarterMPH: 'The speed at the 1/4 mile (trap speed).',
} as const;

export type TooltipKey = keyof typeof TOOLTIPS;

/**
 * Source citation index for audit purposes.
 * Maps tooltip keys to their manual reference.
 */
export const TOOLTIP_CITATIONS: Partial<Record<TooltipKey, string>> = {
  elevation: 'QPRO3W.txt line 706',
  barometer: 'QPRO3W.txt line 709',
  temperature: 'QPRO3W.txt line 728',
  humidity: 'QPRO3W.txt line 731',
  windVelocity: 'QPRO3W.txt line 735',
  windAngle: 'QPRO3W.txt line 738',
  trackTemp: 'QPRO3W.txt line 742',
  tractionIndex: 'QPRO3W.txt lines 749–751',
  weight: 'QPRO3W.txt line 757',
  wheelbase: 'QPRO3W.txt line 760',
  rollout: 'QPRO3W.txt line 763',
  overhang: 'QPRO3W.txt line 770',
  tireDiameter: 'QPRO3W.txt line 799',
  tireRollout: 'QPRO3W.txt line 796',
  tireWidth: 'QPRO3W.txt lines 803–806',
  treadWidth: 'QPRO3W.txt line 1051',
  grooves: 'QPRO3W.txt line 1055',
  grooveWidth: 'QPRO3W.txt line 1059',
  frontalArea: 'QPRO3W.txt line 821',
  maxWidth: 'QPRO3W.txt line 1074',
  maxHeight: 'QPRO3W.txt line 1077',
  shapeFactor: 'QPRO3W.txt lines 1080, 1087',
  dragCoefficient: 'QPRO3W.txt line 826',
  liftCoefficient: 'QPRO3W.txt line 829',
  rearGear: 'QPRO3W.txt line 778',
  finalDriveEfficiency: 'QPRO3W.txt line 784',
  gearRatio: 'QPRO3W.txt line 948',
  gearEfficiency: 'QPRO3W.txt line 952',
  shiftRPM: 'QPRO3W.txt line 956',
  clutchLaunchRPM: 'QPRO3W.txt line 888',
  clutchSlipRPM: 'QPRO3W.txt line 890',
  clutchSlippage: 'QPRO3W.txt line 892',
  clutchLockup: 'QPRO3W.txt line 894',
  converterStall: 'QPRO3W.txt line 909',
  converterTorqueMult: 'QPRO3W.txt line 936',
  converterSlippage: 'QPRO3W.txt line 928',
  converterDiameter: 'QPRO3W.txt line 1151',
  converterLockup: 'QPRO3W.txt line 932',
  converterLaunchRPM: 'QPRO3W.txt line 904',
  enginePMI: 'QPRO3W.txt line 981',
  transPMI: 'QPRO3W.txt line 993',
  tiresPMI: 'QPRO3W.txt line 997',
  peakHP: 'QPRO3W.txt line 856',
  peakHPRPM: 'QPRO3W.txt line 849',
  peakTorque: 'QPRO3W.txt line 859',
  fuelSystem: 'QPRO3W.txt line 863',
  hpTorqueMultiplier: 'QPRO3W.txt line 867',
};
