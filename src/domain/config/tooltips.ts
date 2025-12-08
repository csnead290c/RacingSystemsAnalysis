/**
 * Field Tooltips Configuration
 * 
 * Ported from original VB6 RSA StatusMsg properties.
 * These provide contextual help for each input field.
 */

export const TOOLTIPS = {
  // ============================================================================
  // WEATHER / ENVIRONMENT
  // ============================================================================
  elevation: 'The track elevation or altimeter reading in feet. See user manual for details when using track elevation.',
  temperature: 'The ambient temperature in degrees F.',
  barometer: 'The ambient barometric pressure. See user manual for more details when using track elevation.',
  humidity: 'The ambient relative humidity.',
  windVelocity: 'The absolute wind speed or velocity, independent of direction or approach angle.',
  windAngle: 'The prevailing wind approach angle. 0° = headwind, 90° = crosswind, 180° = tailwind.',
  trackTemp: 'The measured track temperature in degrees F.',
  tractionIndex: 'Traction Index for the racing surface. Higher values = better traction. Typical range: 0-15.',
  trackType: 'The track type as selected from the drop down list.',

  // ============================================================================
  // VEHICLE - MASS & GEOMETRY
  // ============================================================================
  weight: 'The total weight of the vehicle, including the driver.',
  wheelbase: 'The wheelbase of the vehicle (distance between front and rear axle centers).',
  rollout: 'Distance the vehicle must move before the timing clock starts, normally between 10 and 14 inches.',
  overhang: 'The distance from the rear axle center to the rear bumper.',
  cgHeight: 'The height of the vehicle\'s center of gravity above the ground.',
  frontWeight: 'The static weight on the front axle with driver in the car.',

  // ============================================================================
  // VEHICLE - TIRES
  // ============================================================================
  tireDiameter: 'The overall diameter of the rear (drive) tires.',
  tireWidth: 'The effective tire width (in inches) of rubber on the racing surface for each tire.',
  treadWidth: 'The total tread width of the tire before accounting for grooves.',
  grooves: 'Number of grooves cut into the tire tread.',
  grooveWidth: 'Width of each groove in inches.',

  // ============================================================================
  // VEHICLE - AERODYNAMICS
  // ============================================================================
  frontalArea: 'The calculated frontal area (or reference area) of the vehicle body frontal projection.',
  maxWidth: 'The maximum width of the vehicle body.',
  maxHeight: 'The maximum height of the vehicle body.',
  shapeFactor: 'Shape factor accounts for the fact that vehicles aren\'t perfect rectangles. Typical: 75-85% for cars.',
  dragCoefficient: 'The aerodynamic drag coefficient (Cd). Lower values = less drag.',
  liftCoefficient: 'The aerodynamic lift coefficient. Positive = lift, negative = downforce.',

  // ============================================================================
  // VEHICLE - DRIVETRAIN
  // ============================================================================
  rearGear: 'The final drive (rear axle) gear ratio.',
  transEfficiency: 'The mechanical efficiency of the transmission. Typical: 0.95-0.98.',
  gearRatio: 'The gear ratio for this gear. Higher ratios = more torque multiplication.',
  gearEfficiency: 'The mechanical efficiency for this gear. Higher gears are typically more efficient.',
  shiftRPM: 'The engine RPM at which to shift to the next gear.',
  revLimiter: 'The engine RPM at which the rev limiter activates.',

  // ============================================================================
  // VEHICLE - CLUTCH
  // ============================================================================
  clutchLaunchRPM: 'The engine RPM at which the clutch begins to engage during launch.',
  clutchSlipRPM: 'The engine RPM at which the clutch is fully locked up.',
  clutchSlippage: 'Clutch slippage factor. 1.0 = no slip, higher = more slip.',
  clutchLockup: 'Whether the clutch locks up completely after engagement.',

  // ============================================================================
  // VEHICLE - TORQUE CONVERTER
  // ============================================================================
  converterStall: 'The stall speed of the torque converter in RPM.',
  converterTorqueMult: 'The torque multiplication ratio of the converter at stall.',
  converterSlippage: 'The slip percentage of the converter during operation.',
  converterDiameter: 'The diameter of the torque converter in inches.',
  converterLockup: 'Whether the converter has a lockup clutch.',

  // ============================================================================
  // VEHICLE - PMI (POLAR MOMENT OF INERTIA)
  // ============================================================================
  enginePMI: 'The polar moment of inertia of the engine rotating assembly (crankshaft, flywheel, etc.).',
  transPMI: 'The polar moment of inertia of the transmission and driveshaft.',
  tiresPMI: 'The polar moment of inertia of the tires, wheels, and ring gear.',

  // ============================================================================
  // VEHICLE - ENGINE
  // ============================================================================
  peakHP: 'The peak horsepower output of the engine.',
  peakHPRPM: 'The RPM at which peak horsepower occurs.',
  peakTorque: 'The peak torque output of the engine in lb-ft.',
  peakTorqueRPM: 'The RPM at which peak torque occurs.',
  idleRPM: 'The engine idle speed in RPM.',
  redlineRPM: 'The maximum safe engine RPM (redline).',
  fuelSystem: 'The type of fuel and induction system.',

  // ============================================================================
  // WORKSHEET BUTTONS
  // ============================================================================
  btnFrontalArea: 'Press this button to display the Frontal Area Worksheet.',
  btnTireWidth: 'Press this button to display the Tire Width Worksheet.',
  btnGearRatio: 'Press this button to display the Gear Ratio Worksheet.',
  btnPMI: 'Press this button to display the PMI (Polar Moment of Inertia) Worksheet.',
  btnRollout: 'Press this button to display the Rollout Worksheet.',
  btnDragCoef: 'Press this button to display Help for the Drag Coefficient.',
  btnTractionIndex: 'Press this button to display Help for the Traction Index.',

  // ============================================================================
  // TIMESLIP
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
