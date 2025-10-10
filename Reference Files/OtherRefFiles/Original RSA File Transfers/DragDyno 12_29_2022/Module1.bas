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
    With gc_RaceStyle
        .UOM = UOM_NORMAL
        .HasMinMax = True:              .MinVal = 1:                .MaxVal = 3
        .HasList = True
        .List(1) = "Full Race"
        .List(2) = "Pro Street"
        .List(3) = "Street"
        .Msg = "Race Style":            .caption = gc_RaceStyle.Msg
        '.Labelctl = frmMain.Label2(4)
    End With
    
    With gc_Weight
        .UOM = UOM_NORMAL
        .HasMinMax = True:              .MinVal = 200:              .MaxVal = 8000
        .Msg = "Weight":                .caption = gc_Weight.Msg
        .Labelctl = frmMain.Label2(1)
    End With
    
    With gc_HP
        .UOM = UOM_NORMAL
        .HasMinMax = True:              .MinVal = 50:               .MaxVal = 8000
        .Msg = "Engine HP":             .caption = gc_HP.Msg
        .Labelctl = frmMain.Label2(2)
    End With
    
    With gc_HPC
        .UOM = UOM_NORMAL
        .AllowDecimals = True:          .DecimalPlaces = 3
        .HasMinMax = True:              .MinVal = 0.95:             .MaxVal = 1.35
        .Msg = "HP Correction Factor":  .caption = gc_HPC.Msg
        .Labelctl = frmMain.Label2(3)
    End With
End Sub

Public Sub CalcPerf()
Dim TransEff As Single, RaceEff As Single, HPQWT As Single
Dim T660 As Single, MPH660 As Single, ET As Single, MPH As Single
    
    TransEff = 1:   If gc_TransType.Value Then TransEff = 0.92
    
    Select Case gc_RaceStyle.Value
        Case 1: RaceEff = 1
        Case 2: RaceEff = 0.93
        Case 3: RaceEff = 0.84
    End Select
    
    HPQWT = (TransEff * RaceEff * gc_HP.Value / gc_HPC.Value) / gc_Weight.Value
    
    'original RSA equations - circa 1978 (Car Craft - June 1986)
    'T660 = 3.75 * HPQWT ^ -0.33
    'MPH660 = 186 * HPQWT ^ 0.33
    'ET = 5.82 * HPQWT ^ -0.33
    'MPH = 234 * HPQWT ^ 0.33
    
    'updated equations - circa 1990
    'T660 = 1.05 + 2.96 * HPQWT ^ -0.33
    'MPH660 = 10 + 173 * HPQWT ^ 0.33
    'ET = 1.05 + 4.99 * HPQWT ^ -0.33
    'MPH = 10 + 221 * HPQWT ^ 0.33
    
    'modified to account for HPC and D3.0 exponents 06/05/00
    T660 = 1.05 + 2.84 * HPQWT ^ -0.34
    MPH660 = 10 + 180 * HPQWT ^ 0.32
    ET = 1.05 + 4.83 * HPQWT ^ -0.33
    MPH = 10 + 227 * HPQWT ^ 0.31
    
    With fMainForm
        .lblET8 = Format(T660, "##.00")
        .lblMPH8 = Format(MPH660, "###.0")
        .lblET4 = Format(ET, "##.00")
        .lblMPH4 = Format(MPH, "###.0")
    End With
End Sub
