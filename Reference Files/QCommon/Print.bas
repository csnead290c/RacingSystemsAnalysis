Attribute VB_Name = "Print"
Option Explicit
Option Compare Text

Private Y As Long
Private line_height As Long
Private Const IS_NEWPAGE = True
Private Const IS_CENTER = True
Private Const IS_BOLD = True

Public Sub PrintFile()
Dim sideleft As Boolean, sidetop As Boolean, dograph As Boolean, dohide As Boolean
Dim w As Long, H As Long, pw80 As Long
Dim gindex As Integer
Dim vd As Single
Dim i As Integer, j As Integer
Dim C1CL As Long, C1VL As Long, C2CL As Long, C2VL As Long, C3CL As Long, C3VL As Long
Dim d(COL_RPM To COL_TQ) As Long, g(COL_RATIO To COL_SHIFT) As Long
Dim fmt As String
Dim ysave As Long, ystart As Long
Dim LastRow As Integer, Graphs_perPage As Integer
    
    Printer.fontsize = 10
    line_height = Printer.TextHeight("E")    'save 10 point line height
    pw80 = Printer.width / 80
    
    C1CL = 3 * pw80
    PrintHeading C1CL, Not IS_NEWPAGE
    
    #If ISQUARTERPRO Then   'QUARTER Pro pg one - input data (no worksheets)
        C1VL = 21 * pw80:   C2CL = 27 * pw80:   C2VL = 43 * pw80
        C3CL = 49 * pw80:   C3VL = 70 * pw80
        
        d(COL_RPM) = 30 * pw80:     d(COL_HP) = 37 * pw80:      d(COL_TQ) = 44 * pw80
        g(COL_RATIO) = 58 * pw80:   g(COL_EFF) = 64 * pw80:     g(COL_SHIFT) = 70 * pw80
        
        Y = Printer.CurrentY + line_height
        printline "General Data", 9 * pw80, Y, 10, , IS_BOLD
        printline "Engine Dyno Data", 34 * pw80, Y, 10, , IS_BOLD
        printline "Transmission Data", 57 * pw80, Y, 10, , IS_BOLD
    
        Y = Printer.CurrentY:    ysave = Y
    
        'column 1, Aerodynamics and PMI values (QPro only!)
        printline gc_Elevation.Labelctl.caption, C1CL, Y, 10
        printline gc_Elevation.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_Barometer.Labelctl.caption, C1CL, Y, 10
        printline gc_Barometer.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_Temperature.Labelctl.caption, C1CL, Y, 10
        printline gc_Temperature.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_Humidity.Labelctl.caption, C1CL, Y, 10
        printline gc_Humidity.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_WindSpeed.Labelctl.caption, C1CL, Y, 10
        printline gc_WindSpeed.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_WindAngle.Labelctl.caption, C1CL, Y, 10
        printline gc_WindAngle.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline String(28, "-"), C1CL, Y, 10
        
        Y = Printer.CurrentY
        #If Not ISBVPRO Then    'QUARTER Pro
            printline gc_TrackTemp.Labelctl.caption, C1CL, Y, 10
            printline gc_TrackTemp.RightAlign(5), C1VL, Y, 10
        #Else                   'Bonneville Pro
            printline gc_Track.Labelctl.caption, C1CL, Y, 10
            printline gc_Track.List(gc_Track.Value), 9 * pw80, Y, 10
        #End If
    
        Y = Printer.CurrentY
        printline gc_TractionIndex.Labelctl.caption, C1CL, Y, 10
        printline gc_TractionIndex.RightAlign(5), C1VL, Y, 10
        
        Y = Printer.CurrentY + line_height
        printline "Vehicle Data", 9 * pw80, Y, 10, , IS_BOLD
        
        Y = Printer.CurrentY
        printline gc_Weight.Labelctl.caption, C1CL, Y, 10
        printline gc_Weight.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_Wheelbase.Labelctl.caption, C1CL, Y, 10
        printline gc_Wheelbase.RightAlign(5), C1VL, Y, 10
    
        Y = Printer.CurrentY
        #If Not ISBVPRO Then    'QUARTER Pro
            printline gc_Rollout.Labelctl.caption, C1CL, Y, 10
            printline gc_Rollout.RightAlign(5), C1VL, Y, 10
            
            Y = Printer.CurrentY
            printline gc_Overhang.Labelctl.caption, C1CL, Y, 10
            printline gc_Overhang.RightAlign(5), C1VL, Y, 10
            
            Y = Printer.CurrentY + line_height
        #Else
            Y = Printer.CurrentY + 2 * line_height
        #End If
        
        printline "Final Drive Data", 8 * pw80, Y, 10, , IS_BOLD
        
        Y = Printer.CurrentY
        printline gc_GearRatio.Labelctl.caption, C1CL, Y, 10
        printline gc_GearRatio.RightAlign(5), C1VL, Y, 10
        printline "Aerodynamic Data", 30 * pw80, Y, 10, , IS_BOLD
        #If Not ISBVPRO Then    'QUARTER Pro only
            printline "Polar Moments of Inertia", 52 * pw80, Y, 10, , IS_BOLD
        #End If
        
        Y = Printer.CurrentY
        printline gc_Efficiency.Labelctl.caption, C1CL, Y, 10
        printline gc_Efficiency.RightAlign(5), C1VL, Y, 10
        printline gc_RefArea.Labelctl.caption, C2CL, Y, 10
        printline gc_RefArea.RightAlign(5), C2VL, Y, 10
        #If Not ISBVPRO Then    'QUARTER Pro only
            printline gc_EnginePMI.Labelctl.caption, C3CL, Y, 10
            printline gc_EnginePMI.RightAlign(5), C3VL, Y, 10
        #End If
        
        Y = Printer.CurrentY
        printline gc_TireDia.Labelctl.caption, C1CL, Y, 10
        printline gc_TireDia.RightAlign(5), C1VL, Y, 10
        printline gc_DragCoef.Labelctl.caption, C2CL, Y, 10
        printline gc_DragCoef.RightAlign(5), C2VL, Y, 10
        #If Not ISBVPRO Then    'QUARTER Pro only
            printline gc_TransPMI.Labelctl.caption, C3CL, Y, 10
            printline gc_TransPMI.RightAlign(5), C3VL, Y, 10
        #End If
        
        Y = Printer.CurrentY:    ystart = Y
        printline gc_TireWidth.Labelctl.caption, C1CL, Y, 10
        printline gc_TireWidth.RightAlign(5), C1VL, Y, 10
        printline gc_LiftCoef.Labelctl.caption, C2CL, Y, 10
        printline gc_LiftCoef.RightAlign(5), C2VL, Y, 10
        #If Not ISBVPRO Then    'QUARTER Pro only
            printline gc_TiresPMI.Labelctl.caption, C3CL, Y, 10
            printline gc_TiresPMI.RightAlign(5), C3VL, Y, 10
        #End If
    
        'now print the engine dyno data in column 2
        C2CL = 29 * pw80:   C2VL = 45 * pw80
        Y = ysave
        printline " RPM", d(COL_RPM), Y, 10, , IS_BOLD
        printline "  HP", d(COL_HP), Y, 10, , IS_BOLD
        printline "Torque", d(COL_TQ), Y, 10, , IS_BOLD
        
        For i = 1 To 11
            If clsVals("EngineRPM", i).Value = 0 Then Exit For
        
            Y = Printer.CurrentY
            printline RightAlign(5, 0, clsVals("EngineRPM", i).Value), d(COL_RPM), Y, 10
            printline RightAlign(5, 0, clsVals("EngineHP", i).Value), d(COL_HP), Y, 10
            printline RightAlign(5, 0, clsVals("EngineTQ", i).Value), d(COL_TQ), Y, 10
        Next
        
        Y = Printer.CurrentY
        printline gc_FuelSystem.Labelctl.caption, C2CL, Y, 10
        
        Y = Printer.CurrentY
        printline "      " & gc_FuelSystem.List(gc_FuelSystem.Value), C2CL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_HPTQMult.Labelctl.caption, C2CL, Y, 10
        printline gc_HPTQMult.RightAlign(5), C2VL, Y, 10
        
        'now print the transmission data in column 3
        C3CL = 53 * pw80
        Y = ysave
        If gc_TransType.Value Then
            printline "Torque Converter:", C3CL, Y, 10
        Else
            printline "Clutch:", C3CL, Y, 10
        End If
        
        #If Not ISBVPRO Then    'QUARTER Pro only
            Y = Printer.CurrentY
            printline gc_LaunchRPM.Labelctl.caption, C3CL, Y, 10
            printline gc_LaunchRPM.RightAlign(5), C3VL, Y, 10
        #End If
        
        Y = Printer.CurrentY
        printline gc_SlipStallRPM.Labelctl.caption, C3CL, Y, 10
        printline gc_SlipStallRPM.RightAlign(5), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_Slippage.Labelctl.caption, C3CL, Y, 10
        printline gc_Slippage.RightAlign(5), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_LockUp.Labelctl.caption, C3CL, Y, 10
        printline IIf(gc_LockUp.Value = 0, "   No", "  Yes"), C3VL, Y, 10
        
        If gc_TransType.Value Then
            Y = Printer.CurrentY
            printline gc_TorqueMult.Labelctl.caption, C3CL, Y, 10
            printline gc_TorqueMult.RightAlign(5), C3VL, Y, 10
            Y = Printer.CurrentY + line_height
        Else
            Y = Printer.CurrentY + 2 * line_height
        End If
        
        printline "Gear", C3CL, Y, 10, , IS_BOLD
        printline "Ratio", g(COL_RATIO), Y, 10, , IS_BOLD
        printline " Eff", g(COL_EFF), Y, 10, , IS_BOLD
        printline "Shift@", g(COL_SHIFT), Y, 10, , IS_BOLD
    
        For i = 1 To 6
            If clsVals("TransGR", i).Value = 0 Then Exit For
        
            Y = Printer.CurrentY
            If i = 0 Then printline "1st -", C3CL, Y, 10
            If i = 1 Then printline "2nd -", C3CL, Y, 10
            If i = 2 Then printline "3rd -", C3CL, Y, 10
            If i = 3 Then printline "4th -", C3CL, Y, 10
            If i = 4 Then printline "5th -", C3CL, Y, 10
            If i = 5 Then printline "6th -", C3CL, Y, 10
            printline RightAlign(5, 2, clsVals("TransGR", i).Value), g(COL_RATIO), Y, 10
            printline RightAlign(5, 3, clsVals("TransEff", i).Value), g(COL_EFF), Y, 10
            printline RightAlign(5, 0, clsVals("ShiftRPM", i).Value), g(COL_SHIFT), Y, 10
        Next
        
    #Else      'QUARTER jr pg one - input data and worksheets
        C1VL = 23 * pw80
        C2CL = 30 * pw80:   C2VL = 45 * pw80
        C3CL = 52 * pw80:   C3VL = 70 * pw80
        
        Y = Printer.CurrentY + line_height
        printline "General", 12 * pw80, Y, 10, , IS_BOLD
        If gc_TransType.Value Then
            printline "Torque Converter", 33 * pw80, Y, 10, , IS_BOLD
        Else
            printline "Clutch", 37 * pw80, Y, 10, , IS_BOLD
        End If
        printline "Vehicle", 60 * pw80, Y, 10, , IS_BOLD
        
        Y = Printer.CurrentY:   ysave = Y
        printline gc_Elevation.Labelctl.caption, C1CL, Y, 10
        printline gc_Elevation.RightAlign(5), C1VL, Y, 10
        printline gc_SlipStallRPM.Labelctl.caption, C2CL, Y, 10
        printline gc_SlipStallRPM.RightAlign(5), C2VL, Y, 10
        printline gc_Weight.Labelctl.caption, C3CL, Y, 10
        printline gc_Weight.RightAlign(5), C3VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_Barometer.Labelctl.caption, C1CL, Y, 10
        printline gc_Barometer.RightAlign(5), C1VL, Y, 10
        printline gc_LockUp.Labelctl.caption, C2CL, Y, 10
        printline IIf(gc_LockUp.Value = 0, "   No", "  Yes"), C2VL, Y, 10
        printline gc_Rollout.Labelctl.caption, C3CL, Y, 10
        printline gc_Rollout.RightAlign(5), C3VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_Temperature.Labelctl.caption, C1CL, Y, 10
        printline gc_Temperature.RightAlign(5), C1VL, Y, 10
        If gc_TransType.Value Then
            printline Right(gc_ConvDia.Labelctl.caption, 17), C2CL, Y, 10
            printline gc_ConvDia.RightAlign(5), C2VL, Y, 10
        End If
        printline gc_Wheelbase.Labelctl.caption, C3CL, Y, 10
        printline gc_Wheelbase.RightAlign(5), C3VL, Y, 10
    
        Y = Printer.CurrentY
        printline gc_Humidity.Labelctl.caption, C1CL, Y, 10
        printline gc_Humidity.RightAlign(5), C1VL, Y, 10
        printline left(gc_BodyStyle.Labelctl.caption & " " & gc_BodyStyle.List(gc_BodyStyle.Value), 29), C3CL, Y, 10
    
        Y = Printer.CurrentY:    ysave = Y
        printline "Transmission Gear Ratios", 30 * pw80, Y, 10, , IS_BOLD
        printline gc_RefArea.Labelctl.caption, C3CL, Y, 10
        printline gc_RefArea.RightAlign(5), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline "Engine", 12 * pw80, Y, 10, , IS_BOLD
        
        Y = Printer.CurrentY
        printline left(gc_FuelSystem.Labelctl.caption & " " & gc_FuelSystem.List(gc_FuelSystem.Value), 34), C1CL, Y, 10
        printline "Final Drive", 59 * pw80, Y, 10, , IS_BOLD
        
        Y = Printer.CurrentY
        printline gc_Displacement.Labelctl.caption, C1CL, Y, 10
        printline gc_Displacement.RightAlign(5), C1VL, Y, 10
        printline gc_GearRatio.Labelctl.caption, C3CL, Y, 10
        printline gc_GearRatio.RightAlign(5), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_RPMPeakHP.Labelctl.caption, C1CL, Y, 10
        printline gc_RPMPeakHP.RightAlign(5), C1VL, Y, 10
        printline gc_TireDia.Labelctl.caption, C3CL, Y, 10
        printline gc_TireDia.RightAlign(5), C3VL, Y, 10
        
        Y = Printer.CurrentY
        If gc_Nitrous.Value Then
            printline gc_PeakHP.Labelctl.caption & " - w/NO2 option", C1CL, Y, 10
        Else
            printline gc_PeakHP.Labelctl.caption, C1CL, Y, 10
        End If
        printline gc_PeakHP.RightAlign(5), C1VL, Y, 10
        printline gc_TireWidth.Labelctl.caption, C3CL, Y, 10
        printline gc_TireWidth.RightAlign(5), C3VL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_ShiftRPM.Labelctl.caption, C1CL, Y, 10
        printline gc_ShiftRPM.RightAlign(5), C1VL, Y, 10
        printline gc_TractionIndex.Labelctl.caption, C3CL, Y, 10
        printline gc_TractionIndex.RightAlign(5), C3VL, Y, 10
    
        Y = ysave
        printline "", C1CL, Y, 10
        C2CL = 35 * pw80:   g(COL_RATIO) = 40 * pw80
        
        For i = 1 To 6
            If clsVals("TransGR", i).Value = 0 Then
                Y = Printer.CurrentY
                printline "", C2CL, Y, 10
            Else
                Y = Printer.CurrentY
                If i = 0 Then printline "1st -", C2CL, Y, 10
                If i = 1 Then printline "2nd -", C2CL, Y, 10
                If i = 2 Then printline "3rd -", C2CL, Y, 10
                If i = 3 Then printline "4th -", C2CL, Y, 10
                If i = 4 Then printline "5th -", C2CL, Y, 10
                If i = 5 Then printline "6th -", C2CL, Y, 10
                printline RightAlign(5, 2, clsVals("TransGR", i).Value), g(COL_RATIO), Y, 10
            End If
        Next
        
        Load frmRefArea
        Load frmTireWidth
        
        C1CL = 8 * pw80:    C1VL = 27 * pw80
        C2CL = 40 * pw80:   C2VL = 65 * pw80
        
        Y = Printer.CurrentY + line_height
        printline frmRefArea.caption, C1CL, Y, 10, , IS_BOLD
        printline frmTireWidth.caption, C2CL, Y, 10, , IS_BOLD
        
        Y = Printer.CurrentY
        printline gc_MaxWidth.Labelctl.caption, C1CL, Y, 10
        printline gc_MaxWidth.RightAlign(5), C1VL, Y, 10
        printline gc_TreadWidth.Labelctl.caption, C2CL, Y, 10
        printline gc_TreadWidth.RightAlign(5), C2VL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_MaxHeight.Labelctl.caption, C1CL, Y, 10
        printline gc_MaxHeight.RightAlign(5), C1VL, Y, 10
        printline gc_Grooves.Labelctl.caption, C2CL, Y, 10
        printline gc_Grooves.RightAlign(5), C2VL, Y, 10
        
        Y = Printer.CurrentY
        printline gc_ShapeFactor.Labelctl.caption, C1CL, Y, 10
        printline gc_ShapeFactor.RightAlign(5), C1VL, Y, 10
        printline gc_GrooveWidth.Labelctl.caption, C2CL, Y, 10
        printline gc_GrooveWidth.RightAlign(5), C2VL, Y, 10
        
        Y = Printer.CurrentY
        printline String(29, "-"), C1CL, Y, 10
        printline String(37, "-"), C2CL, Y, 10
        
        Y = Printer.CurrentY
        printline frmRefArea.fc_RefArea.Labelctl.caption, C1CL, Y, 10
        printline frmRefArea.fc_RefArea.RightAlign(5), C1VL, Y, 10
        printline frmTireWidth.fc_TireWidth.Labelctl.caption, C2CL, Y, 10
        printline frmTireWidth.fc_TireWidth.RightAlign(5), C2VL, Y, 10
        
        If frmRefArea.Visible Then frmRefArea.Hide
        If frmTireWidth.Visible Then frmTireWidth.Hide
        
        
        If gc_BodyStyle.Value = 8 Then
            Load frmGearRatio
            
            Y = Printer.CurrentY + line_height
            printline frmGearRatio.caption, C2CL, Y, 10, , IS_BOLD
            
            Y = Printer.CurrentY
            printline gc_Primary.Labelctl.caption, C2CL, Y, 10
            printline gc_Primary.RightAlign(5), C2VL, Y, 10
                
            Y = Printer.CurrentY
            printline gc_Countershaft.Labelctl.caption, C2CL, Y, 10
            printline gc_Countershaft.RightAlign(5), C2VL, Y, 10
            
            Y = Printer.CurrentY
            printline gc_RearWheel.Labelctl.caption, C2CL, Y, 10
            printline gc_RearWheel.RightAlign(5), C2VL, Y, 10
            
            Y = Printer.CurrentY
            printline String(37, "-"), C2CL, Y, 10
         
            Y = Printer.CurrentY
            printline frmGearRatio.fc_GearRatio.Labelctl.caption, C2CL, Y, 10
            printline frmGearRatio.fc_GearRatio.RightAlign(5), C2VL, Y, 10
            
            If frmGearRatio.Visible Then frmGearRatio.Hide
        End If
        ystart = Y
    #End If
        
    'QUARTER Pro/jr bottom of pg one - calculated performance
    C1CL = 3 * pw80
    Y = ystart + 2 * line_height
    printline frmTimeSlip.tsv(8).caption, C1CL, Y, 10   'this is for HPC on printout
    printline "Time    Distance   MPH Acceleration Gear  RPM", 19 * pw80, Y, 10, , IS_BOLD
    
    With frmTimeSlip.List1
        For i = 0 To .Listcount - 1
            If Y > (Printer.height - 6 * line_height) Then
                PrintHeading C1CL, IS_NEWPAGE
            End If
            Y = Printer.CurrentY
            printline .List(i), 16 * pw80, Y, 10
        Next
    End With
    
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro only
        Y = Printer.CurrentY
        printline "1/8 Mile: " & frmTimeSlip.tsv(3).caption & " sec @ " & frmTimeSlip.tsv(4).caption & " MPH   1/4 Mile: " & frmTimeSlip.tsv(6).caption & " sec @ " & frmTimeSlip.tsv(7).caption & " MPH", 12 * pw80, Y, 10, , IS_BOLD
    #End If

    'set up starting positions for:
    'QUARTER Pro worksheets and graphs . . . or QUARTER jr graphs
    sidetop = True
    sideleft = True
    
    #If ISQUARTERPRO Then
        If g_wsopt = 1 Then
            PrintHeading C1CL, IS_NEWPAGE
        
            Load frmRefArea
            Load frmTireWidth
        
            C1VL = 30 * pw80
            C2CL = 44 * pw80:   C2VL = 67 * pw80
            
            Y = Printer.CurrentY + line_height
            printline frmRefArea.caption, C1CL, Y, 10, , IS_BOLD
            printline frmTireWidth.caption, C2CL, Y, 10, , IS_BOLD
        
            Y = Printer.CurrentY
            printline gc_MaxWidth.Labelctl.caption, C1CL, Y, 10
            printline gc_MaxWidth.RightAlign(5), C1VL, Y, 10
            printline gc_TreadWidth.Labelctl.caption, C2CL, Y, 10
            printline gc_TreadWidth.RightAlign(5), C2VL, Y, 10
        
            Y = Printer.CurrentY
            printline gc_MaxHeight.Labelctl.caption, C1CL, Y, 10
            printline gc_MaxHeight.RightAlign(5), C1VL, Y, 10
            printline gc_Grooves.Labelctl.caption, C2CL, Y, 10
            printline gc_Grooves.RightAlign(5), C2VL, Y, 10
        
            Y = Printer.CurrentY
            printline gc_ShapeFactor.Labelctl.caption, C1CL, Y, 10
            printline gc_ShapeFactor.RightAlign(5), C1VL, Y, 10
            printline gc_GrooveWidth.Labelctl.caption, C2CL, Y, 10
            printline gc_GrooveWidth.RightAlign(5), C2VL, Y, 10
        
            Y = Printer.CurrentY
            printline String(39, "-"), C1CL, Y, 10
            printline String(34, "-"), C2CL, Y, 10
        
            Y = Printer.CurrentY
            printline frmRefArea.fc_RefArea.Labelctl.caption, C1CL, Y, 10
            printline frmRefArea.fc_RefArea.RightAlign(5), C1VL, Y, 10
            printline frmTireWidth.fc_TireWidth.Labelctl.caption, C2CL, Y, 10
            printline frmTireWidth.fc_TireWidth.RightAlign(5), C2VL, Y, 10
        
            If frmRefArea.Visible Then frmRefArea.Hide
            If frmTireWidth.Visible Then frmTireWidth.Hide
        
            
            Y = Printer.CurrentY + line_height: ysave = Y
            
            #If Not ISBVPRO Then    'QUARTER Pro only
                Load frmPolarEngine
                Load frmPolarTires
            
                printline frmPolarEngine.caption, C1CL, Y, 10, , IS_BOLD
                printline frmPolarTires.caption, C2CL, Y, 10, , IS_BOLD
            
                Y = Printer.CurrentY
                printline gc_CrankWt.Labelctl.caption, C1CL, Y, 10
                printline gc_CrankWt.RightAlign(5), C1VL, Y, 10
                printline gc_TireWt.Labelctl.caption, C2CL, Y, 10
                printline gc_TireWt.RightAlign(5), C2VL, Y, 10
            
                Y = Printer.CurrentY
                printline gc_CrankStroke.Labelctl.caption, C1CL, Y, 10
                printline gc_CrankStroke.RightAlign(5), C1VL, Y, 10
                printline gc_WSTireDia.Labelctl.caption, C2CL, Y, 10
                printline gc_WSTireDia.RightAlign(5), C2VL, Y, 10
            
                Y = Printer.CurrentY
                printline gc_FlywheelWt.Labelctl.caption, C1CL, Y, 10
                printline gc_FlywheelWt.RightAlign(5), C1VL, Y, 10
                printline gc_WheelWt.Labelctl.caption, C2CL, Y, 10
                printline gc_WheelWt.RightAlign(5), C2VL, Y, 10
            
                Y = Printer.CurrentY
                printline gc_FlywheelDia.Labelctl.caption, C1CL, Y, 10
                printline gc_FlywheelDia.RightAlign(5), C1VL, Y, 10
                printline gc_WheelDia.Labelctl.caption, C2CL, Y, 10
                printline gc_WheelDia.RightAlign(5), C2VL, Y, 10
            
                Y = Printer.CurrentY
                printline String(39, "-"), C1CL, Y, 10
                printline String(34, "-"), C2CL, Y, 10
            
                Y = Printer.CurrentY
                printline frmPolarEngine.fc_EnginePMI.Labelctl.caption, C1CL, Y, 10
                printline frmPolarEngine.fc_EnginePMI.RightAlign(5), C1VL, Y, 10
                printline frmPolarTires.fc_TiresPMI.Labelctl.caption, C2CL, Y, 10
                printline frmPolarTires.fc_TiresPMI.RightAlign(5), C2VL, Y, 10
            
                If frmPolarEngine.Visible Then frmPolarEngine.Hide
                If frmPolarTires.Visible Then frmPolarTires.Hide
        
            
                Load frmPolarTrans
            
                Y = Printer.CurrentY + line_height:  ysave = Y
                printline frmPolarTrans.caption, C1CL, Y, 10, , IS_BOLD
            
                Y = Printer.CurrentY
                printline left(gc_WSTransType.Labelctl.caption & " " & gc_WSTransType.List(gc_WSTransType.Value), 40), C1CL, Y, 10
            
                Y = Printer.CurrentY
                printline gc_TransWt.Labelctl.caption, C1CL, Y, 10
                printline gc_TransWt.RightAlign(5), C1VL, Y, 10
            
                Y = Printer.CurrentY
                printline gc_CaseDia.Labelctl.caption, C1CL, Y, 10
                printline gc_CaseDia.RightAlign(5), C1VL, Y, 10
            
                Y = Printer.CurrentY
                printline String(39, "-"), C1CL, Y, 10
            
                Y = Printer.CurrentY
                printline frmPolarTrans.fc_TransPMI.Labelctl.caption, C1CL, Y, 10
                printline frmPolarTrans.fc_TransPMI.RightAlign(5), C1VL, Y, 10
            
                If frmPolarTrans.Visible Then frmPolarTrans.Hide
            #End If
            
            If gc_BodyStyle.Value = 8 Then
                Load frmGearRatio
            
                Y = ysave
                printline frmGearRatio.caption, C2CL, Y, 10, , IS_BOLD
            
                Y = Printer.CurrentY
                printline gc_Primary.Labelctl.caption, C2CL, Y, 10
                printline gc_Primary.RightAlign(5), C2VL, Y, 10
                
                Y = Printer.CurrentY
                printline gc_Countershaft.Labelctl.caption, C2CL, Y, 10
                printline gc_Countershaft.RightAlign(5), C2VL, Y, 10
            
                Y = Printer.CurrentY
                printline gc_RearWheel.Labelctl.caption, C2CL, Y, 10
                printline gc_RearWheel.RightAlign(5), C2VL, Y, 10
            
                Y = Printer.CurrentY
                printline String(34, "-"), C2CL, Y, 10
         
                Y = Printer.CurrentY
                printline frmGearRatio.fc_GearRatio.Labelctl.caption, C2CL, Y, 10
                printline frmGearRatio.fc_GearRatio.RightAlign(5), C2VL, Y, 10
            
                If frmGearRatio.Visible Then frmGearRatio.Hide
            End If
            sidetop = Not sidetop
        End If
        
        #If Not ISBVPRO Then    'QUARTER Pro RPM Histogram
            If (g_gphopt = 1 And GraphsOpen() > 0) Or g_gphopt = 2 Then
    
                dograph = False:    dohide = False
                i = GPH_RPM_HIST
                If g_gphopt = 2 Then
                    dograph = True
                    If FrmMDI.mnuGraph(i).Enabled Then dohide = True
                Else
                    If Not FrmMDI.mnuGraph(i).Enabled Then dograph = True
                End If
                
                If dograph Then
                    If sidetop Then
                        PrintHeading C1CL, IS_NEWPAGE
                        ysave = 8 * line_height
                    Else
                        ysave = 39 * line_height
                    End If
                
                    C1VL = 1 * pw80
        
                    With frmQuarter.picGraph
                        .AutoSize = False
                        .width = (78 / 80) * Printer.width
                        .height = (Printer.ScaleHeight - 8 * line_height) / 2
                
                        If Not frmRPMHist.Visible Then
                            FrmMDI.mnuGraph_Click i
                        End If
                        
                        If dohide Then
                            frmRPMHist.Visible = False
                            SetGraphEnabled i, True
                        End If
                    
                        .Visible = False
                        .Picture = LoadPicture()
                        .Picture = frmRPMHist.gphEngine.Picture
                        printline Trim(frmRPMHist.caption), C1CL, ysave, 10, , IS_BOLD
                        Printer.PaintPicture .Picture, C1VL, ysave + line_height, .width, .height
                    End With
                    sidetop = Not sidetop
                End If
            End If
        #End If
    #End If
    
    'QUARTER Pro/jr vehicle performance graphs
    If (g_gphopt = 1 And GraphsOpen() > 0) Or g_gphopt = 2 Then
        
        If g_gpgopt = 0 Then
            Graphs_perPage = 2
        Else
            Graphs_perPage = 4
        End If
        
        C1VL = 1 * pw80:    C2CL = 40 * pw80:   C2VL = 38 * pw80
        
        With frmQuarter.picGraph
            .AutoSize = False
            If Graphs_perPage = 4 Then
                'make room for all 4 graphs on page as 2 x 2
                .width = (37 / 80) * Printer.width
            Else
                'make room for 2 graphs on page - top and bottom
                .width = (78 / 80) * Printer.width
            End If
            .height = (Printer.ScaleHeight - 8 * line_height) / 2
        
            For i = GPH_TIME_RPM To GPH_DIST_G
                dograph = False:    dohide = False
                If i <> GPH_SEPARATOR Then
                    If g_gphopt = 2 Then
                        dograph = True
                        If FrmMDI.mnuGraph(i).Enabled Then dohide = True
                    Else
                        If Not FrmMDI.mnuGraph(i).Enabled Then dograph = True
                    End If
                    
                    If dograph Then
                        If sidetop Then
                            If sideleft Then PrintHeading C1CL, IS_NEWPAGE
                            ysave = 8 * line_height
                        Else
                            ysave = 39 * line_height
                        End If
                            
                        If Not IsPrinterColor() Then   'setup B&W graph
                            gf_Graphs(i).gphEngine.OverlayPattern = 2  '2 pixel width
                        End If
                    
                        If Not gf_Graphs(i).Visible Then
                            FrmMDI.mnuGraph_Click i
                        Else
                            If Not IsPrinterColor() Then   'draw B&W graph
                                gf_Graphs(i).gphEngine.DrawMode = graphDraw
                            End If
                        End If
                        
                        If dohide Then
                            gf_Graphs(i).Visible = False
                            SetGraphEnabled i, True
                        End If
                        
                        .Visible = False
                        .Picture = LoadPicture()
                        .Picture = gf_Graphs(i).gphEngine.Picture
                        printline Trim(gf_Graphs(i).caption), IIf(sideleft, C1CL, C2CL), ysave, 10, , IS_BOLD
                        Printer.PaintPicture .Picture, IIf(sideleft, C1VL, C2VL), ysave + line_height, .width, .height
                        
                        If Not IsPrinterColor() Then   'back to color graph
                            gf_Graphs(i).gphEngine.OverlayPattern = 3  '3 pixel width
                            If Not dohide Then gf_Graphs(i).gphEngine.DrawMode = graphDraw
                        End If
                            
                        If Graphs_perPage = 4 Then
                            If Not sideleft Then sidetop = Not sidetop
                            sideleft = Not sideleft
                        Else
                            sidetop = Not sidetop
                        End If
                    End If
                End If
            Next
        End With
    End If
    
    Printer.EndDoc
End Sub

Private Sub PrintHeading(tab05 As Long, NewPage As Variant)
Dim i As Integer
    If NewPage Then Printer.NewPage
    
    Y = 0
    printline "", tab05, Y, 10
    printline App.ProductName & " - Version " & App.Major & "." & App.Minor, tab05, Printer.CurrentY, 14, IS_CENTER, IS_BOLD
    printline "Racing Systems Analysis - www.QUARTERjr.com", tab05, Printer.CurrentY, 12, IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY:    printline "", tab05, Y, 10
    Y = Printer.CurrentY:    printline "File:  " & LCase(NameOnly(ofn)), tab05, Y, 10
    Y = Printer.CurrentY:    printline "Note:  " & Note, tab05, Y, 10
    
    printline "", tab05, Y, 10
End Sub

Private Sub printline(szLine As String, X As Long, Y As Long, Optional fontsize As Variant, Optional center As Variant, Optional fontbold As Variant)
    If Not IsMissing(fontsize) Then If IsNumeric(fontsize) Then Printer.fontsize = fontsize
    If Not IsMissing(fontbold) Then If fontbold Then Printer.fontbold = fontbold
    
    Printer.CurrentX = X:      Printer.CurrentY = Y
    
    If Not IsMissing(center) Then
        If center Then Printer.CurrentX = ((Printer.width - X) / 2) - (Printer.TextWidth(szLine) / 2)
    End If
    
    Printer.Print szLine
    Printer.fontbold = False
End Sub

Private Function IsPrinterColor() As Boolean
    On Error GoTo NotColor
    
    IsPrinterColor = False
    If Printer.ColorMode = vbPRCMColor Then IsPrinterColor = True

NotColor:
End Function
