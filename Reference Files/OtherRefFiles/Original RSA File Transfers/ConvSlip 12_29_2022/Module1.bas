Attribute VB_Name = "Module1"
Option Explicit
Option Compare Text

Public fMainForm As frmMain

Sub Main()
    SetAllValues
    
    Set fMainForm = New frmMain
    fMainForm.Show
End Sub

Public Sub SetAllValues()
    With gc_TireDiameter
        .UOM = UOM_NORMAL
        .AllowDecimals = True:      .DecimalPlaces = 1
        .HasMinMax = True:          .MinVal = 24:       .MaxVal = 38
        .Msg = "Tire Diameter":     .caption = .Msg
    End With
    
    With gc_GearRatio
        .UOM = UOM_NORMAL
        .AllowDecimals = True:      .DecimalPlaces = 2
        .HasMinMax = True:          .MinVal = 3:        .MaxVal = 6.5
        .Msg = "Rear Gear Ratio":   .caption = .Msg
    End With
    
    With gc_RPM
        .UOM = UOM_NORMAL
        .HasMinMax = True:          .MinVal = 1000:     .MaxVal = 12000
        .Msg = "Engine RPM":        .caption = .Msg
    End With
    
    With gc_MPH
        .UOM = UOM_NORMAL
        .AllowDecimals = True:      .DecimalPlaces = 1
        .HasMinMax = True:          .MinVal = 80:       .MaxVal = 330
        .Msg = "Top Speed - MPH":   .caption = .Msg
    End With
End Sub

Public Sub CalcConvSlip()
Dim TireCirc As Single, IdealMPH As Single, ActualMPH As Single, ConvSlip As Single
    Call Tire(TireCirc)     'estimated tire circumference in feet
    
    'calculate ideal MPH - no tire slip or converter slip
    IdealMPH = (gc_RPM.Value / gc_GearRatio.Value) * TireCirc * (60 / 5280)
    IdealMPH = IdealMPH / 1.005         'include 0.5% tire slip
    
    ActualMPH = 1.006 * gc_MPH.Value 'plus 0.6% for actual top speed vs timeslip MPH
    
    ConvSlip = 100 * (IdealMPH / ActualMPH - 1)
    ConvSlip = Round(ConvSlip, 0.1)

    fMainForm.lblCSlip = Format(ConvSlip, "###.0")
End Sub

Private Sub Tire(TireCirc As Single)
Dim TireDia As Single, TireWidth As Single, VFPS As Single, TireGrowthm As Single
Dim TireGrowth As Single, TireGrowthLinear As Single, a0 As Single, tsq As Single
    TireDia = gc_TireDiameter.Value:    TireWidth = 0.33 * TireDia
    
    TireGrowthm = (TireWidth ^ 1.4 + TireDia - 16) / (0.171 * TireDia ^ 1.7)
    
    VFPS = gc_MPH.Value * (5280 / 3600)
    
    TireGrowth = 1 + TireGrowthm * 0.0000135 * VFPS ^ 1.6
    TireGrowthLinear = 1 + TireGrowthm * 0.000325 * VFPS
    If TireGrowthLinear < TireGrowth Then TireGrowth = TireGrowthLinear
    
    a0 = 0.25: tsq = TireGrowth - 0.035 * Abs(a0)

    TireCirc = tsq * TireDia * PI / 12
End Sub

Public Function Round(ByVal Value As Single, increment As Single)
    Round = increment * Int((Value + increment / 2) / increment)
End Function

