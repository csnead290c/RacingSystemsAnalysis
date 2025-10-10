Attribute VB_Name = "Module1"
Option Explicit
Option Compare Text

Public fMainForm As frmMain

Sub Main()
    Set fMainForm = New frmMain
    fMainForm.Show
End Sub

Public Sub SetAllValues()
    With gc_Altimeter
        .AllowNegative = True
        .HasMinMax = True:      .MinVal = -2000:        .MaxVal = 9000
        .Msg = "Altimeter":     .caption = "Altimeter"
        .Labelctl = frmMain.Label1(1)
    End With
    
    With gc_Barometer
        .AllowDecimals = True:  .DecimalPlaces = 2
        .HasMinMax = True:      .MinVal = 24:           .MaxVal = 31
        .Msg = "Barometer":     .caption = "Barometer"
        .Labelctl = frmMain.Label1(2)
    End With
    
    With gc_Temperature
        .HasMinMax = True:      .MinVal = 30:           .MaxVal = 120
        .Msg = "Temperature":   .caption = "Temperature"
        .Labelctl = frmMain.Label1(3)
    End With
    
    With gc_Humidity
        .HasMinMax = True:          .MinVal = 0:        .MaxVal = 100
        .Msg = "Relative Humidity": .caption = "Relative Humidity"
        .Labelctl = frmMain.Label1(4)
    End With
    
    'With gc_FuelSystem
    '    .HasMinMax = True:          .MinVal = 1:        .MaxVal = 8
    '    .Msg = "Fuel System":       .caption = "Fuel System"
    '    .HasList = True
    '    .List(1) = "Gasoline Carburetor  "
    '    .List(2) = "Gasoline Injector    "
    '    .List(3) = "Methanol Carburetor  "
    '    .List(4) = "Methanol Injector    "
    '    .List(5) = "Nitromethane Injector"
    '    .List(6) = "Supercharged Gasoline"
    '    .List(7) = "Supercharged Methanol"
    '    .List(8) = "Supercharged Nitro   "
    '    .Labelctl = frmMain.Label1(5)
    'End With
End Sub

Public Sub CalcWeather()
Const TSTD = 519.67
Const PSTD = 14.696
Const BSTD = 29.92
Const WTAIR = 28.9669
Const WTH20 = 18.016
Const RSTD = 1545.32
Const Z1 = 0.00356616
Const Z2 = 5.25588
Const Z3 = 0.00068

Dim PSDRY As Double
Dim FuelType As Integer, CarbType As Integer
Dim PAMB As Single, PAIR As Single, PWV As Single, Delta As Single, WAR As Single, Theta As Single
Dim RGAS As Single, RGRS As Single, MechLoss As Single, kWAR As Single, Pexp As Single
Dim dtx As Single, Texp As Single, ADI As Single, DensAlt As Single, HPCor As Single
    
Static IsLoaded As Boolean
Static cps(1 To 6) As Double
    
    If Not IsLoaded Then
        IsLoaded = True
        cps(1) = 0.0205558:         cps(2) = 0.00118163:            cps(3) = 0.0000154988
        cps(4) = 0.00000040245:     cps(5) = 0.000000000434856:     cps(6) = 0.00000000002096
    End If
    
   'partial pressure of dry air from relative humidity
    PSDRY = cps(1) + cps(2) * gc_Temperature.Value + cps(3) * gc_Temperature.Value ^ 2 + cps(4) * gc_Temperature.Value ^ 3 + cps(5) * gc_Temperature.Value ^ 4 + cps(6) * gc_Temperature.Value ^ 5
    
    PWV = (gc_Humidity.Value / 100) * PSDRY
   
    If gc_Pressure.Value Then
        PAMB = PSTD * ((TSTD - Z1 * gc_Altimeter.Value) / TSTD) ^ Z2
    Else
        PAMB = PSTD * gc_Barometer.Value / BSTD
    End If
    
    PAIR = PAMB - PWV
    Delta = PAIR / PSTD
    WAR = (PWV * WTH20) / (PAIR * WTAIR)
    
    Theta = (gc_Temperature.Value + 459.67) / TSTD
    RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR)
    RGRS = RGAS / (RSTD / WTAIR)
    
    ADI = 100 * Delta / Theta
    DensAlt = (TSTD - TSTD * (ADI / 100) ^ (1 / (Z2 - 1))) / Z1
    
   'set FuelType and CarbType values
    FuelType = 1:  CarbType = 1
   'FuelType:  1 = gas     2 = methanol    3 = nitro
   'CarbType:  1 = carb    2 = injector    3 = supercharger
    
'    Select Case gc_FuelSystem.Value
'        Case 1:     FuelType = 1:     CarbType = 1
'        Case 2:     FuelType = 1:     CarbType = 2
'        Case 3:     FuelType = 2:     CarbType = 1
'        Case 4:     FuelType = 2:     CarbType = 2
'        Case 5:     FuelType = 3:     CarbType = 2
'        Case 6:     FuelType = 1:     CarbType = 3
'        Case 7:     FuelType = 2:     CarbType = 3
'        Case 8:     FuelType = 3:     CarbType = 3
'    End Select
    
   'estimate loss in thermal efficiency due to WAR from Taylor, vol 1, page 431, fr=1.0 data
    kWAR = 1 + 2.48 * WAR ^ 1.5
    
    Select Case FuelType                                'carb
        Case 1:     Pexp = 1:       Texp = 0.6:     MechLoss = 0.15
        Case 2:     Pexp = 1:       Texp = 0.3:     MechLoss = 0.13
        Case 3:     Pexp = 0.85:    Texp = 0.5:     MechLoss = 0.055
    End Select
    
    If CarbType = 2 Then MechLoss = MechLoss - 0.005    'injector
    
    If CarbType = 3 Then                                'supercharger
        Pexp = 0.95
        dtx = (1.35 - 1) / 1.35:    dtx = dtx / 0.85
        Pexp = Pexp - dtx * Texp
        Texp = Texp + dtx
        MechLoss = 0.6 * MechLoss
    End If
    
    HPCor = Delta ^ Pexp / (Sqr(RGRS) * Theta ^ Texp)   'HP Correction Factor
    HPCor = (1 + MechLoss) * kWAR / HPCor - MechLoss
    
    DensAlt = Round(DensAlt, 10)                        'Density Altitude
    With fMainForm
        .lblDALT = Format(DensAlt, "####0")
        .lblHPC = Format(HPCor, "#.000")
        .lblDNDX = Format(ADI, "###.0")
    End With
End Sub

Public Function Round(ByVal Value As Single, increment As Single)
    Round = increment * Int((Value + increment / 2) / increment)
End Function
