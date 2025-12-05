from flask import Flask, render_template, request, flash
from forms import NamerForm, WeatherForm, DynoForm, ConverterSlipForm, QuarterProForm, ContactForm
from weather import weather
from tire import tire

from flask_bootstrap import Bootstrap
# to use it like math.pi
import math
import email_validator

app = Flask(__name__)
Bootstrap(app)
app.config['SECRET_KEY'] = "thisismysecretkey"


@app.errorhandler(404)
def page_not_found(e):
  return render_template('404.html'), 404


@app.route('/history')
def history():
  return render_template('history.html')


@app.route('/support')
def support():
  form = ContactForm()
  return render_template('support.html', form=form)


@app.route('/plans')
def plans():
  return render_template('plans.html')


@app.route('/')
def home():
  return render_template('index.html')


@app.route('/signup', methods=['GET', 'POST'])
def register():
  name = None
  form = NamerForm()

  # validate
  if form.validate_on_submit():
    name = form.name.data
    form.name.data = ''
    flash("Form Submitted!!")

  return render_template('contact.html', name=name, form=form)


@app.route('/quarterpro', methods=['GET', 'POST'])
def quarterpro():
  form = QuarterProForm()
  mTimer = False

  # Weather code to get hpc
  temperature = form.gc_Temperature.data
  humidity = form.gc_Humidity.data
  barometer = form.gc_Barometer.data
  altimeter = form.gc_Altimeter.data
  fuelsystem = int(form.gc_FuelSystem.data)

  rho, hpc = weather(temperature, humidity, barometer, altimeter, fuelsystem)

  # Initialize constants
  Z5 = 3600 / 5280
  JMin = -4
  JMax = 2
  K6 = 0.92
  K61 = 1.08
  AMin = 0.004
  AX = 9.7
  CMU = 0.03
  CMUK = 0
  TimeTol = 0.002
  KV = 0.05 / Z5
  K7 = 5.5
  KP21 = 0
  KP22 = 0
  FRCT = 1.01

  if form.gc_Weight.data > 800:
    gc_BodyStyle = 1
  else:
    gc_BodyStyle = 8

  # Initialize arrays
  TIMESLIP = [0] * 8
  TGR = [0] * 7
  TGEff = [0] * 7
  ShiftRPM = [0] * 7
  xrpm = [0] * 12
  yhp = [0] * 12
  ztq = [0] * 12
  DistToPrint = [0] * 10
  MPHtoPrint = [0] * 3

  # Read input data from form

  gc_TransGR = [form[f'gc_TransGR_{i}'].data for i in range(1, 7)]
  gc_EngineRPM = [form[f'gc_EngineRPM_{i}'].data for i in range(1, 12)]
  gc_EngineHP = [form[f'gc_EngineHP_{i}'].data for i in range(1, 12)]
  gc_EngineTQ = [form[f'gc_EngineTQ_{i}'].data for i in range(1, 12)]
  gc_TransEff = [form[f'gc_TransEff_{i}'].data for i in range(1, 7)]
  gc_ShiftRPM = [form[f'gc_ShiftRPM_{i}'].data for i in range(1, 7)]
  gc_TransType = form.gc_TransType.data

  # Loop through gear ratios and fill in arrays
  NGR = 0
  for i in range(1, 7):
    if gc_TransGR[i - 1] is None:
      break
    NGR = i
    TGR[i] = gc_TransGR[i - 1]
    TGEff[i] = gc_TransEff[i - 1]
    ShiftRPM[i] = gc_ShiftRPM[i - 1]

  # Calculate clutch shift time
  DTShift = 0.2  # Clutch shift time
  if gc_TransType == 92:
    DTShift = 0.25  # Converter shift time

  # Loop through engine RPM values and fill in arrays
  NHP = 0
  gc_PeakHP = 1
  for i in range(1, 12):
    if gc_EngineRPM[i - 1] is None:
      break
    NHP = i
    xrpm[i] = gc_EngineRPM[i - 1]
    yhp[i] = gc_EngineHP[i - 1]
    ztq[i] = gc_EngineTQ[i - 1]
    if yhp[i] != None and yhp[i] > gc_PeakHP:
      gc_PeakHP = yhp[i]

  # Compute ftd
  ftd = max(2 * form.gc_Rollout.data, 24)

  # Compute ovradj
  ovradj = max(form.gc_Overhang.data + 0.25 * ftd, 0.5 * ftd) / 12

  # Compute DistToPrint
  DistToPrint = [form.gc_Rollout.data / 12
                 ] + [30, 60, 330, 594, 660, 1000, 1254, 1320]
  if DistToPrint[0] == 0:
    DistToPrint[0] = 1

  # Compute MPHtoPrint
  MPHtoPrint = [60 / Z5, 100 / Z5]

  # Compute ShiftRPMTol
  ShiftRPMTol = 10 if ShiftRPM[1] != None and ShiftRPM[1] <= 8000 else 20

  gc_TrackTemp = form.gc_TrackTemp.data
  if gc_TrackTemp > 100:
    TrackTempEffect = 1 + 0.0000025 * abs(100 - gc_TrackTemp)**2.5
  else:
    TrackTempEffect = 1 + 0.000002 * abs(100 - gc_TrackTemp)**2.5
  if TrackTempEffect > 1.04:
    TrackTempEffect = 1.04
  TireSlip = 1.02 + (form.gc_TractionIndex.data -
                     1) * 0.005 + (TrackTempEffect - 1) * 3

  # calc printout interval to fill screen
  hpmax = 1
  hpmax = (gc_PeakHP * form.gc_HPTQMult.data /
           hpc) * TGEff[1] * form.gc_Efficiency.data / (form.gc_Slippage.data *
                                                        TireSlip)
  if hpmax < 0.00001:
    hpmax = 1
  ET = (TrackTempEffect**0.25) * (1.8 + 4.2 *
                                  (hpmax / form.gc_Weight.data)**(-1 / 3))

  kd = 33
  if gc_BodyStyle == 8:
    ET = 1.04 * ET
    kd = kd - 1

  TimePrintInc1 = [0.25, 0.5, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 35, 40, 50]
  for i in range(0, 15):
    z = ET / TimePrintInc1[i] + 2 * (NGR - 1)
    if z < kd:
      TimePrint = TimePrintInc1[i]
      TimePrintInc = TimePrintInc1[i]
      break
  if z > kd:
    TimePrintInc = 100

  #  CALCULATE STALL SPEED IF LAMBDA WAS INPUT
  if form.gc_SlipStallRPM.data > 220:
    Stall = form.gc_SlipStallRPM.data
  else:
    Stall = 0
    atf = 1 / (1000 * form.gc_SlipStallRPM.data)
    for k in range(2, NHP + 1):
      k1 = k - 1
      B = form.gc_HPTQMult.data * (ztq[k] - ztq[k1]) / (hpc *
                                                        (xrpm[k] - xrpm[k1]))
      c = form.gc_HPTQMult.data * ztq[k] / hpc - xrpm[k] * B
      z = B**2 + 4 * atf * c
      r1 = 0
      r2 = 0

      if z > 0:
        z = math.sqrt(z)
        r1 = (B + z) / (2 * atf)
        r2 = (B - z) / (2 * atf)

      if r1 < xrpm[k1] and k > 2:
        r1 = 0
      if r2 < xrpm[k1] and k > 2:
        r2 = 0
      if r1 > xrpm[k] and k < NHP:
        r1 = 0
      if r2 > xrpm[k] and k < NHP:
        r2 = 0
      if r1 > 0:
        Stall = r1
      if r2 > 0:
        Stall = r2

    Stall = round(Stall, 20)

    if Stall < xrpm[1]:
      Stall = xrpm[1]

    if ShiftRPM[1] > 0 and Stall >= ShiftRPM[1]:
      Stall = ShiftRPM[1] - 100

    if gc_TransType == 92:
      if form.gc_LaunchRPM.data > Stall:
        Stall = form.gcLaunchRPM.data

  # Initialize Various Constants line 995
  DistTol = 0.005
  iGear = 1
  ShiftFlag = 0
  iDist = 0
  iMPH = 1
  LAdd = 1
  SaveTime = 0
  L = 1
  Time0 = 0
  Gear = [0] * 60
  AGS = [0] * 60
  time = [0] * 60
  EngRPM = [0] * 60
  Vel = [0] * 60
  Dist = [0] * 60
  DSRPM = 0
  gc = 32.174
  Z6 = (60 / (2 * math.pi)) * 550

  # calculate launch conditions at starting line (static)
  EngRPM[L] = form.gc_LaunchRPM.data
  Gear[L] = iGear
  DownForce = form.gc_Weight.data

  # Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP)
  HP = 1
  HP = form.gc_HPTQMult.data * HP / hpc
  HPSave = HP
  TQ = Z6 * HP / EngRPM[L]
  TQ = TQ * form.gc_TorqueMult.data * TGR[iGear] * TGEff[iGear]

  WindFPS = math.sqrt(Vel[L]**2 + 2 * Vel[L] * (form.gc_WindSpeed.data / Z5) *
                      math.cos(math.pi * form.gc_WindAngle.data / 180) +
                      (form.gc_WindSpeed.data / Z5)**2)
  q = math.copysign(rho * math.pow(abs(WindFPS), 2) / (2 * gc), WindFPS)

  DragForce = CMU * form.gc_Weight.data + form.gc_DragCoef.data * form.gc_RefArea.data * q

  TireDia = form.gc_TireDia.data

  force = TQ * form.gc_GearRatio.data * form.gc_Efficiency.data / (
    TireSlip * TireDia / 24) - DragForce

  # estimate maximum acceleration from force and weight
  if gc_TransType == 92:
    Ags0 = 0.88 * force / form.gc_Weight.data  #assume 12% misc losses on initial hit of tire
  else:
    Ags0 = 0.96 * force / form.gc_Weight.data  #assume 4% misc losses on initial hit of tire
  AgsMax = Ags0  #save AgsMax for print tolerance selection

  # assume YCG is 3.75" above static rear axle centerline (to match Pro Stock)
  gc_YCG = (TireDia / 2) + 3.75

  TireGrowth, TireCirFt = tire(form.gc_TireWidth.data, TireDia, Vel[L], Ags0)
  TireRadIn = 12 * TireCirFt / (2 * math.pi)
  deltaFWT = (Ags0 * form.gc_Weight.data *
              ((gc_YCG - TireRadIn) +
               (FRCT / form.gc_Efficiency.data) * TireRadIn) +
              DragForce * gc_YCG) / form.gc_Wheelbase.data

  # calculate dynamic front weight and static rear weight for launch conditions
  # set the required static front weight for perfect balance at launch
  DynamicFWT = 0
  gc_StaticFWt = deltaFWT + DynamicFWT

  # estimate static rear weight = total weight - estimated static front weight
  StaticRWT = DownForce - gc_StaticFWt
  if StaticRWT < 0:
    StaticRWT = form.gc_Weight.data

  # calculate initial max tire force limit based on estimated static rear weight
  CAXI = (1 -
          (form.gc_TractionIndex.data - 1) * 0.01) / (TrackTempEffect**0.25)
  CRTF = CAXI * AX * TireDia * (form.gc_TireWidth.data +
                                1) * (0.92 + 0.08 * (StaticRWT / 1900)**2.15)

  if gc_BodyStyle == 8:
    CRTF = 0.5 * CRTF

  AMAX = (CRTF - DragForce) / form.gc_Weight.data
  SLIP = [0] * 60
  SLIP[L] = 0
  if Ags0 > AMAX:
    Ags0 = AMAX
    SLIP[L] = 1
  if Ags0 < AMin:
    Ags0 = AMin
  AGS[L] = Ags0

  # AddListLine   Not sure what this is doing exactly. line 1059

  # select a time step to get about 15 calcs during the rollout distance
  TSMax = DistToPrint[1] * 0.11 * (HP * form.gc_TorqueMult.data /
                                   form.gc_Weight.data)**(-1 / 3)
  TSMax = TSMax / 15
  if TSMax < 0.005:
    TSMax = 0.005
  iDist = 1

  loop = 1

  while loop > 0:
    if loop < 231:
      #230 TOP OF LOOP FOR GEAR CHANGE
      Shift2PrintTime = time[L] + DTShift
      TimeStep = DTShift

      #CALCULATE THE TOTAL CHASSIS INERTIA FOR THIS GEAR
      ChassisPMI = form.gc_TiresPMI.data + form.gc_TransPMI.data * form.gc_GearRatio.data**2 * TGR[
        iGear]**2

      if L > 1:
        loop = 250
        continue

    if loop < 239:
      #240 TOP OF LOOP FOR VELOCITY STEP INCREMENT
      TimeStep = TSMax * (AgsMax / Ags0)**4  #QProRxCode

    if loop < 250:
      #250
      Jerk = 0  #jerk has units of g's per second
      Work = time[L] - Time0
      if Work > 0:
        Jerk = (AGS[L] - Ags0) / Work
      if Jerk < JMin:
        Jerk = JMin
      if Jerk > JMax:
        Jerk = JMax

      Vel0 = Vel[L]
      Ags0 = AGS[L]
      TireGrowth, TireCirFt = tire(form.gc_TireWidth.data, TireDia, Vel[L],
                                   Ags0)
      RPM0 = EngRPM[L]
      Time0 = time[L]
      if RPM0 == form.gc_LaunchRPM.data and Time0 == 0:
        RPM0 = Stall
        if form.gc_LaunchRPM.data < Stall:
          Time0 = form.gc_EnginePMI.data * (Stall -
                                            form.gc_LaunchRPM.data) / 250000
      Dist0 = Dist[L]

      #calc tire slip from traction index, track temp and downtrack location
      Work = 0.005 * (form.gc_TractionIndex.data - 1) + 3 * (TrackTempEffect -
                                                             1)
      TireSlip = 1.02 + Work * (1 - (Dist0 / 1320)**2)

      DSRPM0 = DSRPM
      L = L + LAdd
      Gear[L] = iGear
      LAdd = 0

      #SELECT NEXT VELOCITY TO MEET VARIOUS OBJECTIVES (ShiftFlag < 2)
      Vel[L] = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep**2 / 2

      if ShiftFlag == 2:
        loop = 270
        continue

      # don't let TimeStep exceed K7 steps per TimePrintInc
      print(TimePrintInc)
      print(K7)
      tmpchk = TimePrintInc / K7

      if TimeStep > tmpchk:
        TimeStep = TimePrintInc / K7

      # don't let TimeStep exceed TimePrint
      if TimeStep > (TimePrint - Time0):
        TimeStep = TimePrint - Time0

      # don't let TimeStep exceed 4.5 steps to distance print
      if iDist > 1:
        Work = ((DistToPrint[iDist] - DistToPrint[iDist - 1]) /
                Vel0) / 4.5  #increased from 2.0 7/11/99
        if TimeStep > Work:
          TimeStep = Work

      if TimeStep > 0.05:
        TimeStep = 0.05  #reduced from .2 7/11/99

      Vel[
        L] = Vel0 + Ags0 * gc * TimeStep + Jerk * gc * TimeStep * TimeStep / 2

      # don't let TimeStep exceed shift points
      if Vel0 > 0 and RPM0 > Stall and iGear < NGR:
        Work = Vel0 * (ShiftRPM[iGear] + 5) / RPM0
        if Vel[L] > Work:
          Vel[L] = Work
          TimeStep = (Vel[L] - Vel0) / (Ags0 * gc)

      # don't let TimeStep exceed distance print
      DistStep = Dist0 + Vel0 * TimeStep + Ags0 * gc * TimeStep**2 / 2
      if DistStep >= (DistToPrint[iDist] - DistTol):
        Vel[L] = math.sqrt(Vel0**2 + 2 * Ags0 * gc *
                           (DistToPrint[iDist] - Dist0))

    if loop < 271:
      #270
      # ENTRY POINT FOR VELOCITY REVISION TO MATCH DISTANCE, TIME, OR SHIFT POINT PRINTS
      VelSqrd = Vel[L]**2 - Vel0**2
      DSRPM = TireSlip * Vel[L] * 60 / TireCirFt

      if mTimer == True:
        loop = 999  #Patrick - see QProRxCode for other tests
        continue

      #PERFORM CLUTCH AND CONVERTER CALCULATIONS
      LockRPM = DSRPM * form.gc_GearRatio.data * TGR[iGear]
      EngRPM[L] = form.gc_Slippage.data * LockRPM

      if gc_TransType == 100:  #clutch
        if EngRPM[L] < Stall:
          if iGear == 1 or form.gc_LockUp.data == False:
            EngRPM[L] = Stall
        ClutchSlip = LockRPM / EngRPM[L]
      else:
        if iGear == 1 or form.gc_LockUp.data == False:  # non lock-up converter
          zStall = Stall
          SlipRatio = form.gc_Slippage.data * LockRPM / zStall

          if L > 2:
            if SlipRatio > 0.6:
              zStall = zStall * (1 + (form.gc_Slippage.data - 1) *
                                 (SlipRatio - 0.6) /
                                 ((1 / form.gc_Slippage.data) - 0.6))
            SlipRatio = form.gc_Slippage.data * LockRPM / zStall
          ClutchSlip = 1 / form.gc_Slippage.data

          if EngRPM[L] < zStall:
            EngRPM[L] = zStall
            Work = form.gc_TorqueMult.data - (form.gc_TorqueMult.data -
                                              1) * SlipRatio
            ClutchSlip = Work * LockRPM / zStall
        else:  #lock-up converter
          EngRPM[L] = 1.005 * LockRPM
          ClutchSlip = LockRPM / EngRPM[L]

      if ClutchSlip > 1:
        ClutchSlip = 1

      #Call TABY(xrpm(), yhp(), NHP, 1, EngRPM(L), HP) 'Patrick - 2nd order in QProRx

      HP = form.gc_HPTQMult.data * HP / hpc
      HPSave = HP
      HP = HP * ClutchSlip

      #CALCULATE DRAG FORCES (FRICTION, VISCOUS AND AERODYNAMIC)    'Patrick - QProRx includes prevailing wind speed
      WindFPS = math.sqrt(Vel[L]**2 + 2 * Vel[L] *
                          (form.gc_WindSpeed.data / Z5) *
                          math.cos(math.pi * form.gc_WindAngle.data / 180) +
                          (form.gc_WindSpeed.data / Z5)**2)
      q = math.copysign(1, WindFPS) * rho * abs(WindFPS)**2 / (2 * gc)

      #increase frontal area based on tire growth (crude method! - check QProRxCode Patrick)
      if gc_BodyStyle == 8:
        RefArea2 = form.gc_RefArea.data + (
          (TireGrowth - 1) * TireDia / 2) * form.gc_TireWidth.data / 144
      else:
        RefArea2 = form.gc_RefArea.data + (
          (TireGrowth - 1) * TireDia / 2) * (2 * form.gc_TireWidth.data) / 144

      DownForce = form.gc_Weight.data + form.gc_LiftCoef.data * RefArea2 * q
      cmu1 = CMU - (Dist0 / 1320) * CMUK
      DragForce = cmu1 * DownForce + 0.0001 * DownForce * (
        Z5 * Vel[L]) + form.gc_DragCoef.data * RefArea2 * q
      DragHP = DragForce * Vel[L] / 550

      #calculate dynamic weight on front tires
      TireRadIn = 12 * TireCirFt / (2 * math.pi)
      #FRCT should really be variable at this point, getting closer to 1 downtrack
      deltaFWT = (Ags0 * form.gc_Weight.data *
                  ((gc_YCG - TireRadIn) +
                   (FRCT / form.gc_Efficiency.data) * TireRadIn) +
                  DragForce * gc_YCG) / form.gc_Wheelbase.data
      DynamicFWT = gc_StaticFWt - deltaFWT

      #calculate wheelie bar weight
      WheelBarWT = 0
      if DynamicFWT < 0:
        #assume 64" wheelie bar as required to keep dynamic front weight = 0
        WheelBarWT = -DynamicFWT * form.gc_Wheelbase.data / 64
        DynamicFWT = 0

      #calculate dynamic force on rear tires
      DynamicRWT = DownForce - DynamicFWT - WheelBarWT
      if DynamicRWT < 0:
        DynamicRWT = form.gc_Weight.data
      #RWT(L) = dynamicRWT    'QProRxCode
      CRTF = CAXI * AX * TireDia * (form.gc_TireWidth.data +
                                    1) * (0.92 + 0.08 *
                                          (DynamicRWT / 1900)**2.15)
      if gc_BodyStyle == 8:
        CRTF = 0.5 * CRTF

      AMAX = ((CRTF / TireGrowth) - DragForce) / form.gc_Weight.data

      #CALCULATE RESIDUAL HORSEPOWER AVAILABLE (limit to AMax)
      HP = HP * TGEff[iGear] * form.gc_Efficiency.data / TireSlip
      HP = HP - DragHP
      PQWT = 550 * gc * HP / form.gc_Weight.data
      AGS[L] = PQWT / (Vel[L] * gc)

      SLIP[L] = 0
      if AGS[L] > AMAX:
        SLIP[L] = 1
        PQWT = PQWT * (AMAX - (AGS[L] - AMAX)) / AGS[L]
        AGS[L] = AMAX - (AGS[L] - AMAX)

      if AGS[L] < AMin:
        PQWT = PQWT * AMin / AGS[L]
        AGS[L] = AMin
      time[L] = VelSqrd / (2 * PQWT) + Time0

      EngAccHP = form.gc_EnginePMI.data * EngRPM[L] * (EngRPM[L] - RPM0)

      if EngAccHP < 0:
        if form.gc_TransType == 100:
          EngAccHP = KP21 * EngAccHP
        else:
          EngAccHP = KP22 * EngAccHP

      ChasAccHP = ChassisPMI * DSRPM * (DSRPM - DSRPM0)

      if ChasAccHP < 0:
        ChasAccHP = 0

      k = 0

    if loop < 281:
      #280 ITERATION TO CONVERGE INERTIA TRANSIENT check QProRxCode

      k = k + 1
      dtkl = time[L] - Time0
      Work = (2 * math.pi / 60)**2 / (12 * 550 * dtkl)
      HPEngPMI = EngAccHP * Work
      HPChasPMI = ChasAccHP * Work

      HP = (HPSave - HPEngPMI) * ClutchSlip
      HP = ((HP * TGEff[iGear] * form.gc_Efficiency.data - HPChasPMI) /
            TireSlip) - DragHP
      PQWT = 550 * gc * HP / form.gc_Weight.data
      AGS[L] = PQWT / (Vel[L] * gc)

      #steady iteration progress by using jerk limits
      # Stopping at code line 1256 (out of about 1500...)
      #just to end things...
      loop = 999

    #if loop < 301:
    #300

    #if loop < 306:
    #305

    #if loop < 331:
    #330

    #if loop < 341:
    #340

    #if loop < 351:
    #350

    if loop == 999:
      #calcoutputexit
      break

  # Stopping at code line 1140 (out of about 1500...)

  # validate
  #if form.validate_on_submit():

  return render_template('quarterpro.html',
                         sixty=rho,
                         threethirty=hpc,
                         eighth=ET,
                         halfmph=gc_PeakHP,
                         thousand=TrackTempEffect,
                         quarter=TGEff[1],
                         fullmph=TIMESLIP[6],
                         form=form)


@app.route('/converterslip', methods=['GET', 'POST'])
def converterslip():
  convSlip = None
  form = ConverterSlipForm()

  # validate
  if form.validate_on_submit():
    TireDia = form.gc_TireDiameter.data
    TireWidth = 0.33 * TireDia
    gc_GearRatio = form.gc_GearRatio.data
    gc_RPM = form.gc_RPM.data
    gc_MPH = form.gc_MPH.data
    TireWidthPow = TireWidth**1.4
    TireDiaPow = TireDia**1.7
    TireGrowthmDenom = 0.171 * TireDiaPow
    TireGrowthmTop = TireWidthPow + TireDia
    TireGrowthmTop = TireGrowthmTop - 16
    TireGrowthm = TireGrowthmTop / TireGrowthmDenom
    VFPS = gc_MPH * (5280 / 3600)
    TireGrowth = 1 + TireGrowthm * 0.0000135 * VFPS**(1.6)
    TireGrowthLinear = 1 + TireGrowthm * 0.000325 * VFPS
    if TireGrowthLinear < TireGrowth:
      TireGrowth = TireGrowthLinear
    tsq = TireGrowth - 0.035 * abs(0.25)
    TireCirc = tsq * TireDia * math.pi / 12
    IdealMPH = (gc_RPM / gc_GearRatio) * TireCirc * (60 / 5280)
    IdealMPH = IdealMPH / 1.005
    ActualMPH = 1.006 * gc_MPH
    convSlip = 100 * (IdealMPH / ActualMPH - 1)
    convSlip = round(convSlip * 100) / 100

  return render_template('converterslip.html', form=form, convSlip=convSlip)


@app.route('/dragstripdyno', methods=['GET', 'POST'])
def dragstripdyno():
  et_18 = None
  et_14 = None
  mph_18 = None
  mph_14 = None
  form = DynoForm()

  # validate
  if form.validate_on_submit():
    TransEff = float(form.gc_TransType.data)
    RaceEff = float(form.gc_RaceStyle.data)
    gc_HP = form.gc_HP.data
    gc_HPC = form.gc_HPC.data
    gc_Weight = form.gc_Weight.data
    HPQWT = ((TransEff / 100) * (RaceEff / 100) * gc_HP / gc_HPC) / gc_Weight
    et_18 = round((1.05 + 2.84 * HPQWT**-0.34) * 1000) / 1000
    mph_18 = round((10 + 180 * HPQWT**0.32) * 100) / 100
    et_14 = round((1.05 + 4.83 * HPQWT**-0.33) * 1000) / 1000
    mph_14 = round((10 + 227 * HPQWT**0.31) * 100) / 100

  return render_template('dragstripdyno.html',
                         form=form,
                         et_18=et_18,
                         et_14=et_14,
                         mph_18=mph_18,
                         mph_14=mph_14)


@app.route('/weatherstation', methods=['GET', 'POST'])
def weatherstation():
  DALT = None
  HPC = None
  DNDX = None
  form = WeatherForm()

  # validate
  if form.validate_on_submit():
    temperature = form.gc_Temperature.data
    humidity = form.gc_Humidity.data
    barometer = form.gc_Pressure.data
    pressType = form.gc_PressType.data
    altimeter = form.gc_Pressure.data
    TSTD = 519.67
    PSTD = 14.696
    BSTD = 29.92
    WTAIR = 28.9669
    WTH20 = 18.016
    RSTD = 1545.32
    Z1 = 0.00356616
    Z2 = 5.25588
    cps1 = 0.0205558
    cps2 = 0.00118163
    cps3 = 0.0000154988
    cps4 = 0.00000040245
    cps5 = 0.000000000434856
    cps6 = 0.00000000002096
    Pexp = 1.0
    Texp = 0.6
    MechLoss = 0.15

    if barometer < 1:
      barometer = 1

    PSDRY = cps1 + temperature * cps2 + pow(temperature, 2) * cps3 + pow(
      temperature, 3) * cps4 + pow(temperature, 4) * cps5 + pow(
        temperature, 5) * cps6
    if pressType == '1':
      PAMB = PSTD * ((TSTD - Z1 * altimeter) / TSTD)**Z2
    else:
      PAMB = PSTD * barometer / BSTD
    PWV = (humidity / 100) * PSDRY
    PAIR = PAMB - PWV
    Delta = PAIR / PSTD
    WAR = (PWV * WTH20) / (PAIR * WTAIR)
    Theta = (temperature + 459.67) / TSTD
    RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR)
    RGRS = RGAS / (RSTD / WTAIR)
    ADI = 100 * Delta / Theta
    DensAlt = (TSTD - TSTD * pow((ADI / 100), (1 / (Z2 - 1)))) / Z1
    kWAR = 1 + 2.48 * pow(WAR, 1.5)
    HPCor = Delta**Pexp / (RGRS**(0.5) * Theta**Texp)
    HPCor = (1 + MechLoss) * kWAR / HPCor - MechLoss

    HPC = round(HPCor, 3)
    DALT = round(DensAlt, 0)
    DNDX = round(ADI, 2)

  return render_template('weather.html',
                         DALT=DALT,
                         HPC=HPC,
                         DNDX=DNDX,
                         form=form)


@app.route("/test", methods=['POST', 'GET'])
def index():
  #return render_template('home.html')
  if request.method == 'POST':

    for key, value in request.form.items():
      print(f'{key}: {value}')

    error = None
    result = None
    resultHPC = None
    resultDA = None
    resultADI = None

    # request.form looks for:
    # html tags with matching "name= "
    #barometer_input = request.form['barometer']
    gc_Barometer = request.form.get("gc_Barometer")
    gc_Temperature = request.form.get("gc_Temperature")
    gc_Humidity = request.form.get("gc_Humidity")
    gc_PressType = request.form.get("gc_PressType")

    try:
      barometer = float(gc_Barometer)
      temperature = float(gc_Temperature)
      humidity = float(gc_Humidity)
      pressType = float(gc_PressType)
      TSTD = 519.67
      PSTD = 14.696
      BSTD = 29.92
      WTAIR = 28.9669
      WTH20 = 18.016
      RSTD = 1545.32
      Z1 = 0.00356616
      Z2 = 5.25588
      Z3 = 0.00068
      cps1 = 0.0205558
      cps2 = 0.00118163
      cps3 = 0.0000154988
      cps4 = 0.00000040245
      cps5 = 0.000000000434856
      cps6 = 0.00000000002096
      Pexp = 1.0
      Texp = 0.6
      MechLoss = 0.15

      PSDRY = cps1 + temperature * cps2 + pow(temperature, 2) * cps3 + pow(
        temperature, 3) * cps4 + pow(temperature, 4) * cps5 + pow(
          temperature, 5) * cps6
      PWV = (humidity / 100) * PSDRY
      PAMB = PSTD * barometer / BSTD
      PAIR = PAMB - PWV
      Delta = PAIR / PSTD
      WAR = (PWV * WTH20) / (PAIR * WTAIR)
      Theta = (temperature + 459.67) / TSTD
      RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR)
      RGRS = RGAS / (RSTD / WTAIR)
      ADI = 100 * Delta / Theta
      DensAlt = (TSTD - TSTD * pow((ADI / 100), (1 / (Z2 - 1)))) / Z1
      kWAR = 1 + 2.48 * pow(WAR, 1.5)
      HPCor = Delta**Pexp / (RGRS**(0.5) * Theta**Texp)
      HPCor = (1 + MechLoss) * kWAR / HPCor - MechLoss
      resultHPC = round(HPCor, 3)
      resultDA = round(DensAlt, 0)
      resultADI = round(ADI, 2)
      print(resultHPC)
      print(resultDA)
      print(resultADI)
      print(pressType)

      return render_template('home.html',
                             resultHPC=resultHPC,
                             resultDA=resultDA,
                             resultADI=resultADI,
                             gc_Temperature=gc_Temperature,
                             calculation_success=True,
                             Debug=True)
    except ZeroDivisionError:
      return render_template('home.html',
                             calculation_success=False,
                             error="You cannot divide by zero")

    except ValueError:
      return render_template(
        'home.html',
        calculation_success=False,
        error="Cannot perform numeric operations with provided input")

  return render_template('home.html', Debug=True)


if __name__ == "__main__":
  app.run(host='0.0.0.0', debug=True)
