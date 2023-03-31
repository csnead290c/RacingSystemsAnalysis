import math


def weather(gc_Temperature, gc_Humidity, gc_Barometer, gc_Elevation,
            gc_FuelSystem):
  TSTD = 519.67
  PSTD = 14.696
  BSTD = 29.92
  WTAIR = 28.9669
  WTH20 = 18.016
  RSTD = 1545.32

  cps = [
    0.0205558, 0.00118163, 0.0000154988, 0.00000040245, 0.000000000434856,
    0.00000000002096
  ]

  # partial pressure of dry air from relative humidity
  psdry = cps[0] + cps[1] * gc_Temperature + cps[2] * gc_Temperature**2 + cps[
    3] * gc_Temperature**3 + cps[4] * gc_Temperature**4 + cps[
      5] * gc_Temperature**5

  PWV = (gc_Humidity / 100) * psdry
  pamb = (PSTD * gc_Barometer / BSTD) * (
    (TSTD - 0.00356616 * gc_Elevation) / TSTD)**5.25588
  pair = pamb - PWV
  delta = pair / PSTD
  WAR = (PWV * WTH20) / (pair * WTAIR)

  # ambient air theta and density
  theta = (gc_Temperature + 459.67) / TSTD
  RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR)
  rgrs = RGAS / (RSTD / WTAIR)
  rho = 144 * pamb / (RGAS * (gc_Temperature + 459.67))

  # set ifuel and icarb values
  # ifuel:  1 = gas     2 = methanol    3 = nitro
  # icarb:  1 = carb    2 = injector    3 = supercharger
  ifuel, icarb = 0, 0
  if gc_FuelSystem == 1:
    ifuel = 1
    icarb = 1
  elif gc_FuelSystem == 2:
    ifuel = 1
    icarb = 2
  elif gc_FuelSystem == 3:
    ifuel = 2
    icarb = 1
  elif gc_FuelSystem == 4:
    ifuel = 2
    icarb = 2
  elif gc_FuelSystem == 5:
    ifuel = 3
    icarb = 2
  elif gc_FuelSystem == 6:
    ifuel = 1
    icarb = 3
  elif gc_FuelSystem in [7, 9]:
    ifuel = 2
    icarb = 3
  elif gc_FuelSystem == 8:
    ifuel = 3
    icarb = 3

  # eliminate loss in thermal efficiency due to war
  # from taylor, vol 1, page 431, fr=1.0 data
  kwar = 1 + 2.48 * WAR**1.5

  if ifuel == 1:
    px = 1
    tx = 0.6
    mech = 0.15
  elif ifuel == 2:
    px = 1
    tx = 0.3
    mech = 0.13
  elif ifuel == 3:
    px = 0.85
    tx = 0.5
    mech = 0.055

  if icarb == 2:
    mech -= 0.005

  if icarb == 3:
    px = 0.95
    dtx = (1.35 - 1) / 1.35
    dtx /= 0.85
    px -= dtx * tx
    tx += dtx
    mech *= 0.6

  hpc = delta**px / (math.sqrt(rgrs) * theta**tx)
  hpc = (1 + mech) * kwar / hpc - mech

  if gc_FuelSystem == 9:
    hpc = 1
  return rho, hpc
