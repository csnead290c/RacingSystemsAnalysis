Attribute VB_Name = "Print"
Option Explicit
Option Compare Text

Private Y As Long
Private ysave As Long
Private line_height As Long
Private C1CL As Long
Private C1VL As Long
Private C2CL As Long
Private C2VL As Long
Private C3CL As Long
Private C3VL As Long
Private CVL(1 To 6) As Long

Private Const IS_NEWPAGE = True
Private Const IS_CENTER = True
Private Const IS_BOLD = True

Public Sub PrintPage()
Dim i As Integer
Dim pw80 As Long
Dim Work As String * 5
    Printer.fontsize = 10
    line_height = Printer.TextHeight("E")    'save 10 point line height
    pw80 = Printer.Width / 80
    
    C1CL = 5 * pw80:        C1VL = 26 * pw80
    C2CL = 36 * pw80:       C2VL = 60 * pw80
    C3CL = 46 * pw80:       C3VL = 66 * pw80
    
    PrintHeading C1CL, Not IS_NEWPAGE
    
    CVL(1) = 5 * pw80:      CVL(2) = 11 * pw80
    CVL(3) = 17 * pw80:     CVL(4) = 25 * pw80
    CVL(5) = 31 * pw80:     CVL(6) = 37 * pw80
    
    Y = Printer.CurrentY + line_height
    printline frmClutch.Frame10.caption, 13 * pw80, Y, 10, , IS_BOLD
    printline frmClutch.Frame7.caption, 44 * pw80, Y, 10, , IS_BOLD

    Y = Printer.CurrentY
    printline gc_Barometer.Labelctl.caption, C1CL, Y, 10
    printline gc_Barometer.RightAlign(5), C1VL, Y, 10
    printline gc_Mfg1.Labelctl.caption, C2CL, Y, 10
    printline AName(gc_Mfg1.Value), C2VL, Y, 10
    If gc_Mfg2.Value > 0 Then printline AName(gc_Mfg2.Value), C3VL, Y, 10

    Y = Printer.CurrentY
    printline gc_Temperature.Labelctl.caption, C1CL, Y, 10
    printline gc_Temperature.RightAlign(5), C1VL, Y, 10
    printline gc_NArm1.Labelctl.caption, C2CL, Y, 10
    printline gc_NArm1.RightAlign(5), C2VL, Y, 10
    If gc_Mfg2.Value > 0 Then printline gc_NArm2.RightAlign(5), C3VL, Y, 10

    Y = Printer.CurrentY
    printline gc_Humidity.Labelctl.caption, C1CL, Y, 10
    printline gc_Humidity.RightAlign(5), C1VL, Y, 10
    printline gc_TCWt1.Labelctl.caption, C2CL, Y, 10
    printline gc_TCWt1.RightAlign(5), C2VL, Y, 10
    If gc_Mfg2.Value > 0 Then printline gc_TCWt2.RightAlign(5), C3VL, Y, 10

    Y = Printer.CurrentY
    printline gc_LowGear.Labelctl.caption, C1CL, Y, 10
    printline gc_LowGear.RightAlign(5), C1VL, Y, 10
    printline gc_CWt1.Labelctl.caption, C2CL, Y, 10
    printline gc_CWt1.RightAlign(5), C2VL, Y, 10
    If gc_Mfg2.Value > 0 Then printline gc_CWt2.RightAlign(5), C3VL, Y, 10

    Y = Printer.CurrentY
    printline gc_GearRatio.Labelctl.caption, C1CL, Y, 10
    printline gc_GearRatio.RightAlign(5), C1VL, Y, 10
    printline gc_RingHt1.Labelctl.caption, C2CL, Y, 10
    printline gc_RingHt1.RightAlign(5), C2VL, Y, 10
    If gc_Mfg2.Value > 0 Then printline gc_RingHt2.RightAlign(5), C3VL, Y, 10

    Y = Printer.CurrentY
    printline gc_TireDia.Labelctl.caption, C1CL, Y, 10
    printline gc_TireDia.RightAlign(5), C1VL, Y, 10
    If gc_ArmDepth1.Value > 0 Then
        printline gc_ArmDepth1.Labelctl.caption, C2CL, Y, 10
        printline gc_ArmDepth1.RightAlign(5), C2VL, Y, 10
        If gc_Mfg2.Value > 0 Then printline gc_ArmDepth2.RightAlign(5), C3VL, Y, 10
    End If
    
    
    Y = Printer.CurrentY + line_height
    printline frmClutch.Frame11.caption, 12 * pw80, Y, 10, , IS_BOLD
    printline frmClutch.Frame6.caption, 39 * pw80, Y, 10, , IS_BOLD
    
    Y = Printer.CurrentY
    printline gc_T60.Labelctl.caption, C1CL, Y, 10
    printline gc_T60.RightAlign(5), C1VL, Y, 10
    printline gc_Static.Labelctl.caption, C2CL, Y, 10
    printline gc_Static.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline gc_Amax.Labelctl.caption, C1CL, Y, 10
    printline gc_Amax.RightAlign(5), C1VL, Y, 10
    printline String(36, "-"), C2CL, Y, 10

    Y = Printer.CurrentY
    printline gc_TractionIndex.Labelctl.caption, C1CL, Y, 10
    printline gc_TractionIndex.RightAlign(5), C1VL, Y, 10
    printline gc_NDisk.Labelctl.caption, C2CL, Y, 10
    printline gc_NDisk.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline gc_DiskWt.Labelctl.caption, C2CL, Y, 10
    printline gc_DiskWt.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline frmClutch.Frame4.caption, 8 * pw80, Y, 10, , IS_BOLD
    printline gc_DiskOD.Labelctl.caption, C2CL, Y, 10
    printline gc_DiskOD.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline gc_EnginePMI.Labelctl.caption, C1CL, Y, 10
    printline gc_EnginePMI.RightAlign(5), C1VL, Y, 10
    printline gc_DiskID.Labelctl.caption, C2CL, Y, 10
    printline gc_DiskID.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline gc_TransPMI.Labelctl.caption, C1CL, Y, 10
    printline gc_TransPMI.RightAlign(5), C1VL, Y, 10
    printline gc_ClArea.Labelctl.caption, C2CL, Y, 10
    printline gc_ClArea.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline gc_TiresPMI.Labelctl.caption, C1CL, Y, 10
    printline gc_TiresPMI.RightAlign(5), C1VL, Y, 10
    printline gc_CMU.Labelctl.caption, C2CL, Y, 10
    printline gc_CMU.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY + line_height: ysave = Y
    printline "Engine Dyno Data", 7 * pw80, Y, 10, , IS_BOLD
    printline frmClutch.Frame8.caption, 24 * pw80, Y, 10, , IS_BOLD

    Y = Printer.CurrentY
    printline "RPM      HP   Torque", 6 * pw80, Y, 10, , IS_BOLD
    printline "RPM  Centrif  Total", 26 * pw80, Y, 10, , IS_BOLD
    
    For i = 0 To gc_grdDyno.MaxRow - 1
        If gc_grdDyno.GridArray(0, i) = 0 Then Exit For
    
        Y = Printer.CurrentY
        printline gc_grdDyno.RightAlign(0, i, 5), CVL(1), Y, 10
        printline gc_grdDyno.RightAlign(1, i, 5), CVL(2), Y, 10
        printline gc_grdDyno.RightAlign(2, i, 5), CVL(3), Y, 10
        
        printline gc_grdClutch.RightAlign(0, i, 5), CVL(4), Y, 10
        printline gc_grdClutch.RightAlign(1, i, 5), CVL(5), Y, 10
        printline gc_grdClutch.RightAlign(2, i, 5), CVL(6), Y, 10
    Next

    Y = Printer.CurrentY
    printline gc_FuelSystem.List(gc_FuelSystem.Value), C1CL, Y, 10
    
    Y = Printer.CurrentY
    printline "HP/Torque Mult", C1CL, Y, 10
    printline gc_HPTQMult.RightAlign(5), CVL(3), Y, 10
    
    
    Y = ysave
    printline frmClutch.Frame1.caption, 49 * pw80, Y, 10, , IS_BOLD
    
    Y = Printer.CurrentY
    printline "Calculated --- Low Gear High Gear", C3CL, Y, 10
    
    Y = Printer.CurrentY
    printline frmClutch.Label1(11).caption, C3CL, Y, 10
    RSet Work = frmClutch.Label4.caption
    printline Work, C2VL, Y, 10
    RSet Work = frmClutch.Label7.caption
    printline Work, C3VL + pw80, Y, 10
    
    Y = Printer.CurrentY
    printline frmClutch.Label1(12).caption, C3CL, Y, 10
    RSet Work = frmClutch.Label5.caption
    printline Work, C2VL, Y, 10
    RSet Work = frmClutch.Label8.caption
    printline Work, C3VL + pw80, Y, 10
    
    Y = Printer.CurrentY
    printline frmClutch.Label1(17).caption, C3CL, Y, 10
    RSet Work = frmClutch.Label6.caption
    printline Work, C2VL, Y, 10
    RSet Work = frmClutch.Label9.caption
    printline Work, C3VL + pw80, Y, 10
    
    If Not isBike And Not isGlide Then
        Y = Printer.CurrentY + line_height
        printline frmClutch.Frame2.caption, 49 * pw80, Y, 10, , IS_BOLD
        
        Y = Printer.CurrentY
        printline gc_LaunchRPM.Labelctl.caption, C3CL, Y, 10
        printline gc_LaunchRPM.RightAlign(5), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline String(31, "-"), C3CL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_AirGap.Labelctl.caption, C3CL, Y, 10
        printline gc_AirGap.RightAlign(5), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline frmClutch.Label1(5).caption, C3CL, Y, 10
        RSet Work = frmClutch.Label1(6).caption
        printline Work, C3VL, Y, 10
    
        Y = Printer.CurrentY
        printline String(31, "-"), C3CL, Y, 10
        
        Y = Printer.CurrentY
        printline frmClutch.Label1(7).caption, C3CL, Y, 10
        printline frmClutch.Label0.caption, C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline frmClutch.Label1(8).caption, C3CL, Y, 10
        RSet Work = frmClutch.Label2.caption
        printline Work, C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline frmClutch.Label1(9).caption, C3CL, Y, 10
        RSet Work = frmClutch.Label3.caption
        printline Work, C3VL, Y, 10
    
        Y = Printer.CurrentY + line_height
    Else
        Y = Printer.CurrentY + 10 * line_height
    End If
    
    printline String(84, "-"), C1CL, Y, 10
    
    Y = Printer.CurrentY + line_height: ysave = Y
    
        C1CL = 5 * pw80:    C2CL = 40 * pw80:   C3CL = 40 * pw80
    
    If gc_Mfg1.Value = NARMD Then
        C1VL = 18 * pw80:   C2VL = 24 * pw80:   C3VL = 30 * pw80
    
        Load frmCustom
        
        printline frmCustom.caption, C1CL, Y, 10, , IS_BOLD
    
        Y = Printer.CurrentY
        printline "Diameter    dR      dZ", 17 * pw80, Y, 10
        
        Y = Printer.CurrentY
        printline gc_ADATA2.Labelctl.caption, C1CL, Y, 10
        printline gc_ADATA2.RightAlign(6), C1VL, Y, 10
        printline "  .000", C2VL, Y, 10
        printline "  .000", C3VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_PVTDR.Labelctl.caption, C1CL, Y, 10
        printline gc_PVTDR.RightAlign(6), C2VL, Y, 10
        printline gc_PVTDZ.RightAlign(6), C3VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_CWTDR.Labelctl.caption, C1CL, Y, 10
        printline gc_CWTDR.RightAlign(6), C2VL, Y, 10
        printline gc_CWTDZ.RightAlign(6), C3VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_CGDR.Labelctl.caption, C1CL, Y, 10
        printline gc_CGDR.RightAlign(6), C2VL, Y, 10
        printline gc_CGDZ.RightAlign(6), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_ADATA1.Labelctl.caption, C1CL, Y, 10
        printline gc_ADATA1.RightAlign(6), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_ADATA6.Labelctl.caption, C1CL, Y, 10
        printline gc_ADATA6.RightAlign(6), C3VL, Y, 10
        
        If frmCustom.Visible Then frmCustom.Hide
        
        C1VL = 31 * pw80:   C2VL = 67 * pw80:   C3VL = 61 * pw80
    
    Else
        C1VL = 31 * pw80:   C2VL = 67 * pw80:   C3VL = 61 * pw80
    
        Load frmPolarEngine
        
        printline frmPolarEngine.caption, C1CL, Y, 10, , IS_BOLD
    
        Y = Printer.CurrentY
        printline gc_CrankWt.Labelctl.caption, C1CL, Y, 10
        printline gc_CrankWt.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_CrankStroke.Labelctl.caption, C1CL, Y, 10
        printline gc_CrankStroke.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_FlywheelWt.Labelctl.caption, C1CL, Y, 10
        printline gc_FlywheelWt.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_FlywheelDia.Labelctl.caption, C1CL, Y, 10
        printline gc_FlywheelDia.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline String(39, "-"), C1CL, Y, 10
        
        Y = Printer.CurrentY
        printline "Polar Moment of Inertia =", C1CL, Y, 10
        printline frmPolarEngine.fc_EnginePMI.RightAlign(5), C1VL, Y, 10
    
        If frmPolarEngine.Visible Then frmPolarEngine.Hide
    End If

    Load frmSpring
    
    Y = ysave
    printline frmSpring.caption, C2CL, Y, 10, , IS_BOLD

    Y = Printer.CurrentY
    printline gc_NSpring.Labelctl.caption, C2CL, Y, 10
    printline "  " & frmSpring.lbl(8).caption, C3VL, Y, 10
    printline gc_NSpring.RightAlign(5), C2VL, Y, 10

    If Not isGlide Then
        Y = Printer.CurrentY
        printline gc_BasePr.Labelctl.caption, C2CL, Y, 10
        printline gc_SBasePr.RightAlign(5), C3VL, Y, 10
        printline gc_BasePr.RightAlign(5), C2VL, Y, 10
    End If

    Y = Printer.CurrentY
    printline gc_SRate.Labelctl.caption, C2CL, Y, 10
    printline gc_SSRate.RightAlign(5), C3VL, Y, 10
    printline gc_SRate.RightAlign(5), C2VL, Y, 10

    If Not isBike Then
        Y = Printer.CurrentY
        printline gc_Turns.Labelctl.caption, C2CL, Y, 10
        printline gc_Turns.RightAlign(5), C2VL, Y, 10
    End If

    Y = Printer.CurrentY
    printline gc_ThrdpI.Labelctl.caption, C2CL, Y, 10
    printline gc_ThrdpI.RightAlign(5), C2VL, Y, 10

    If Not isGlide Then
        Y = Printer.CurrentY
        printline gc_dRnHt.Labelctl.caption, C2CL, Y, 10
        printline gc_dRnHt.RightAlign(5), C2VL, Y, 10
    End If

    Y = Printer.CurrentY
    printline String(40, "-"), C2CL, Y, 10
    
    Y = Printer.CurrentY
    printline frmSpring.fc_Static.Labelctl.caption, C2CL, Y, 10
    printline frmSpring.fc_Static.RightAlign(5), C2VL, Y, 10
    
    If frmSpring.Visible Then frmSpring.Hide


    Load frmPolarTrans

    Y = Printer.CurrentY + line_height: ysave = Y
    printline frmPolarTrans.caption, C1CL, Y, 10, , IS_BOLD

    Y = Printer.CurrentY
    printline Left(gc_WSTransType.Labelctl.caption & " " & gc_WSTransType.List(gc_WSTransType.Value), 40), C1CL, Y, 10

    Y = Printer.CurrentY
    printline gc_TransWt.Labelctl.caption, C1CL, Y, 10
    printline gc_TransWt.RightAlign(5), C1VL, Y, 10

    Y = Printer.CurrentY
    printline gc_CaseDia.Labelctl.caption, C1CL, Y, 10
    printline gc_CaseDia.RightAlign(5), C1VL, Y, 10

    Y = Printer.CurrentY
    printline String(39, "-"), C1CL, Y, 10

    Y = Printer.CurrentY
    printline "Polar Moment of Inertia =", C1CL, Y, 10
    printline frmPolarTrans.fc_TransPMI.RightAlign(5), C1VL, Y, 10

    If frmPolarTrans.Visible Then frmPolarTrans.Hide
    
    If isBike Then
        Load frmGearRatio
    
        Y = ysave
        printline frmGearRatio.caption, C2CL, Y, 10, , IS_BOLD
    
        Y = Printer.CurrentY
        printline gc_PDRatio.Labelctl.caption, C2CL, Y, 10
        printline gc_PDRatio.RightAlign(5), C2VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_HighGear.Labelctl.caption, C2CL, Y, 10
        printline gc_HighGear.RightAlign(5), C2VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_Countershaft.Labelctl.caption, C2CL, Y, 10
        printline gc_Countershaft.RightAlign(5), C2VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_RearWheel.Labelctl.caption, C2CL, Y, 10
        printline gc_RearWheel.RightAlign(5), C2VL, Y, 10
    
        Y = Printer.CurrentY
        printline String(40, "-"), C2CL, Y, 10
    
        Y = Printer.CurrentY
        printline frmGearRatio.fc_GearRatio.Labelctl.caption, C2CL, Y, 10
        printline frmGearRatio.fc_GearRatio.RightAlign(5), C2VL, Y, 10
    
        If frmGearRatio.Visible Then frmGearRatio.Hide
    End If
    
    
    Load frmPolarTires
    Load frmEffArea

    Y = Printer.CurrentY + line_height
    printline frmPolarTires.caption, C1CL, Y, 10, , IS_BOLD
    printline frmEffArea.caption, C2CL, Y, 10, , IS_BOLD

    Y = Printer.CurrentY
    printline gc_TireWt.Labelctl.caption, C1CL, Y, 10
    printline gc_TireWt.RightAlign(5), C1VL, Y, 10
    printline gc_NSlot.Labelctl.caption, C2CL, Y, 10
    printline gc_NSlot.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline gc_WSTireDia.Labelctl.caption, C1CL, Y, 10
    printline gc_WSTireDia.RightAlign(5), C1VL, Y, 10
    printline gc_SlotWD.Labelctl.caption, C2CL, Y, 10
    printline gc_SlotWD.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline gc_WheelWt.Labelctl.caption, C1CL, Y, 10
    printline gc_WheelWt.RightAlign(5), C1VL, Y, 10
    printline gc_NHole.Labelctl.caption, C2CL, Y, 10
    printline gc_NHole.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline gc_WheelDia.Labelctl.caption, C1CL, Y, 10
    printline gc_WheelDia.RightAlign(5), C1VL, Y, 10
    printline gc_HoleDia.Labelctl.caption, C2CL, Y, 10
    printline gc_HoleDia.RightAlign(5), C2VL, Y, 10

    Y = Printer.CurrentY
    printline String(39, "-"), C1CL, Y, 10
    printline String(40, "-"), C2CL, Y, 10

    Y = Printer.CurrentY
    printline "Polar Moment of Inertia =", C1CL, Y, 10
    printline frmPolarTires.fc_TiresPMI.RightAlign(5), C1VL, Y, 10
    printline frmEffArea.fc_ClArea.Labelctl.caption, C2CL, Y, 10
    printline frmEffArea.fc_ClArea.RightAlign(5), C2VL, Y, 10

    If frmPolarTires.Visible Then frmPolarTires.Hide
    If frmEffArea.Visible Then frmEffArea.Hide
    
    Printer.EndDoc
End Sub

Private Sub printline(szLine As String, X As Long, Y As Long, Optional fontsize As Variant, Optional center As Variant, Optional fontbold As Variant)
    If Not IsMissing(fontsize) Then If IsNumeric(fontsize) Then Printer.fontsize = fontsize
    If Not IsMissing(fontbold) Then If fontbold Then Printer.fontbold = fontbold
    
    Printer.CurrentX = X:      Printer.CurrentY = Y
    
    If Not IsMissing(center) Then
        If center Then Printer.CurrentX = ((Printer.Width - X) / 2) - (Printer.TextWidth(szLine) / 2)
    End If
    
    Printer.Print szLine
    Printer.fontbold = False
End Sub

Private Sub PrintHeading(tab05 As Long, NewPage As Variant)
Dim i As Integer
    If NewPage Then Printer.NewPage
    
    Y = 0
    printline "", tab05, Y, 10
    printline App.ProductName & " - Version " & App.Major & "." & App.Minor & " - " & NameOnly(FileName), tab05, Printer.CurrentY, 14, IS_CENTER, IS_BOLD
    printline "www.RacingSecrets.com - www.SpeedTalk.com", tab05, Printer.CurrentY, 12, IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline String(84, "-"), tab05, Y, 10
End Sub
