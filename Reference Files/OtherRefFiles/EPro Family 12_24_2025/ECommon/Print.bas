Attribute VB_Name = "Print"
Option Explicit

Private pw80 As Long
Private line_height As Long
Private Y As Long
Private Const IS_CENTER = True
Private Const IS_BOLD = True
Private bPage2 As Boolean
Private Const LINE_GAP = 201

Public Sub PrintPage()
Dim bin As Single
Dim binfmt As String
Dim i As Integer
Dim C1CL As Long, C1VL As Long, C2CL As Long, C2VL As Long, C3CL As Long, C3VL As Long
Dim C4VL As Long, C5VL As Long, C6VL As Long, C7VL As Long
Dim ysave As Long
Dim evd As Single
Dim evds As String
Dim vd As Single
Dim nd As Integer
Dim nd2 As Integer
    Printer.fontsize = 10
    line_height = Printer.TextHeight("E")    'save 10 point line height
    pw80 = Printer.Width / 80
    
    C1CL = 3 * pw80:    C1VL = 32 * pw80
    C2CL = 39 * pw80:   C2VL = 69 * pw80
    
    bPage2 = False:    PrintHeading C1CL
        
    Y = Printer.CurrentY
    printline "Input Engine Data", C1CL, Y, 12, IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    Select Case gc_Inline.Value
        Case 0: printline "Number of Cylinders       Inline", C1CL, Y
        Case 1: printline "Number of Cylinders          Vee", C1CL, Y
        Case 2: printline "Number of Cylinders         Flat", C1CL, Y
    End Select
    printline gc_NoCyl.RightAlign(5), C1VL, Y
    ysave = Y
    
    Y = Printer.CurrentY
    printline "Bore Diameter - " & gc_Bore.Unit, C1CL, Y
    printline gc_Bore.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Stroke Length - " & gc_Stroke.Unit, C1CL, Y
    printline gc_Stroke.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Rod Length - " & gc_Rod.Unit, C1CL, Y
    printline gc_Rod.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Compression Ratio", C1CL, Y
    printline gc_CR.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY:    printline "", C1CL, Y
    
    Y = Printer.CurrentY
    printline "Cam Type:", C1CL, Y
    printline gc_CamType.List(gc_CamType.Value), RsetString(C1VL, gc_CamType.List(gc_CamType.Value)), Y
    
    Y = Printer.CurrentY
    printline "Intake Duration @ .050 inch - degree", C1CL, Y
    printline gc_InCamDur.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Throttle CFM @ 1.5 inch Hg", C1CL, Y
    printline gc_CarbCFM.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    If gc_Carb.Value Then
        printline "Carburetor           Fuel Type:", C1CL, Y
    Else
        printline "Fuel Injection       Fuel Type:", C1CL, Y
    End If
    printline gc_Fuel.List(gc_Fuel.Value), RsetString(C1VL, gc_Fuel.List(gc_Fuel.Value)), Y
    
    
    
    Y = ysave
    printline "Intake Manifold Type:", C2CL, Y
    printline gc_Manifold.List(gc_Manifold.Value), RsetString(C2VL, gc_Manifold.List(gc_Manifold.Value)), Y
    
    Y = Printer.CurrentY
    printline "Manifold Runner Style:", C2CL, Y
    If gc_Curved.Value Then
        printline "Curved Runner", RsetString(C2VL, "Curved Runner"), Y
    Else
        printline "Straight Runner", RsetString(C2VL, "Straight Runner"), Y
    End If
    
    Y = Printer.CurrentY
    printline "Intake Manifold Flow Factor - %", C2CL, Y
    printline gc_ManFlow.RightAlign(5), C2VL, Y
    
    Y = Printer.CurrentY:   printline "", C2CL, Y
    
    Y = Printer.CurrentY
    printline "Number of Intake Valves per Cylinder", C2CL, Y
    printline gc_NoInValves.RightAlign(5), C2VL, Y
    
    Y = Printer.CurrentY
    printline "Intake Valve Diameter - " & gc_ValveDia.Unit, C2CL, Y
    printline gc_ValveDia.RightAlign(5), C2VL, Y
    
    Y = Printer.CurrentY
    printline "Maximum Intake Port Flow - CFM", C2CL, Y
    printline gc_MaxInFlow.RightAlign(5), C2VL, Y
    
    Y = Printer.CurrentY
    printline " @ Test Pressure - inch H2O", C2CL, Y
    printline gc_DeltaP.RightAlign(5), C2VL, Y
    
    Y = Printer.CurrentY
    printline " @ Ref. Bore Diameter - " & gc_RefBore.Unit, C2CL, Y
    printline gc_RefBore.RightAlign(5), C2VL, Y
    
    
    Y = Printer.CurrentY:    printline "", C1CL, Y
    Y = Printer.CurrentY:    printline "", C1CL, Y
    ysave = Y
    
    Y = Printer.CurrentY
    printline "       Compression Ratio Worksheet", C1CL, Y, , Not IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline "Combustion Chamber Volume - c.c.", C1CL, Y
    printline gc_Chamber.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Piston to Deck Height - inch", C1CL, Y
    printline gc_Deck.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Head Gasket Thickness - inch", C1CL, Y
    printline gc_Gasket.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Piston Dome Volume - c.c.", C1CL, Y
    printline gc_Dome.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Compression Ratio", C1CL, Y
    printline gc_WSCR.RightAlign(5), C1VL, Y
        
    Y = Printer.CurrentY:   printline "", C1CL, Y
    
    Y = Printer.CurrentY
    printline "  Throttle CFM @ 1.5 inch Hg Worksheet", C1CL, Y, , Not IS_CENTER, IS_BOLD

    Y = Printer.CurrentY
    If gc_TBType.Value Then
        printline "Butterfly Throttles:           Pri" & gc_NoTB.RightAlign(2), C1CL, Y
    Else
        printline "Slide Valve Throttles:         Pri" & gc_NoTB.RightAlign(2), C1CL, Y
    End If
    printline "Sec" & gc_NoTBS.RightAlign(2), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Throttle Diameter - " & gc_TBDia.Unit, C1CL, Y
    printline gc_TBDia.RightAlign(5), C1VL - 5 * pw80, Y
    printline gc_TBDiaS.RightAlign(5), C1VL, Y
        
    Y = Printer.CurrentY
    printline "Venturi Diameter - " & gc_TVDia.Unit, C1CL, Y
    printline gc_TVDia.RightAlign(5), C1VL - 5 * pw80, Y
    printline gc_TVDiaS.RightAlign(5), C1VL, Y
    
    Y = Printer.CurrentY
    printline "Throttle CFM @ 1.5 inch Hg", C1CL, Y
    printline gc_WSCarbCFM.RightAlign(5), C1VL, Y
    
    #If Not ISENGINEPRO Then
        Y = ysave
        printline "  Intake Port Flow @ " & gc_DeltaP.Formatted & " in H2O Worksheet", C2CL, Y, , Not IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "Minimum Cross-section Area - sq in", C2CL, Y
        printline gc_CSArea.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Intake Flow Velocity - ft/sec", C2CL, Y
        printline gc_FlowVel.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Intake Flow Flux - CFM/sq inch", C2CL, Y
        printline gc_FlowFlux.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Flow Velocity Index - %", C2CL, Y
        printline gc_FVIndex.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "   Minimum Cross-section Area Worksheet", C2CL, Y, , Not IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        If gc_SeatDia.Inches Then
            printline "Valve Seat Throat Diameter - " & gc_SeatDia.Unit, C2CL, Y
        Else
            printline "Valve Seat Throat Dia - " & gc_SeatDia.Unit, C2CL, Y
        End If
        printline gc_SeatDia.RightAlign(5), C2VL, Y
    
        Y = Printer.CurrentY
        printline "Valve Seat Throat Percentage - %", C2CL, Y
        printline gc_SeatPer.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Valve Seat Angle - degree", C2CL, Y
        printline gc_VSAngle.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Valve Seat Width - inch", C2CL, Y
        printline gc_VSWidth.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        If gc_StemDia.Inches Then
            printline "Valve Stem Diameter - " & gc_StemDia.Unit, C2CL, Y
        Else
            printline "Valve Stem Diameter - " & gc_StemDia.Unit, C2CL, Y
        End If
        printline gc_StemDia.RightAlign(5), C2VL, Y
            
        Y = Printer.CurrentY
        printline "Maximum Intake Valve Lift - inch", C2CL, Y
        printline gc_ValveLift.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Valve Seat Throat Area - sq inch", C2CL, Y
        printline gc_WSCSArea.RightAlign(5), C2VL, Y
    #End If
    
    ysave = Y
    PrintGraph
    
    If gc_Bore.Inches Or gc_Stroke.Inches Then
        bin = CID:              binfmt = "###.0 CID"
    Else
        bin = CID * ZM3:        binfmt = "##### c.c."
    End If
    
    Y = ysave + 2 * line_height
    printline "Estimated Performance for " & Format(bin, binfmt) & " Engine", C1CL, Y, 12, IS_CENTER, IS_BOLD
    
    C1CL = 7 * pw80:    C1VL = 18 * pw80
    C2CL = 26 * pw80:   C2VL = 42 * pw80
    C3CL = 50 * pw80:   C3VL = 66 * pw80
    
    nd = 0
    If gc_HP.Value < 100 Then nd = 1
    If gc_HP.Value < 10 Then nd = 2
    nd2 = 0: If nd > 0 Then nd2 = 1
    
    Y = Printer.CurrentY
    printline "Peak HP", C1CL, Y
    printline RightAlign(5 - nd2, nd, gc_HP.Value), C1VL, Y
    printline "Peak Torque - ft lbs", C2CL, Y
    printline RightAlign(5 - nd2, nd, gc_TQ.Value), C2VL, Y
    printline "  SI Units", C3CL, Y, , , IS_BOLD
    
    Y = Printer.CurrentY
    printline "RPM @ Peak HP", C1CL, Y
    printline gc_RPMPeakHP.RightAlign(5), C1VL, Y
    printline "RPM @ Peak Torque", C2CL, Y
    printline gc_RPMPeakTQ.RightAlign(5), C2VL, Y
    printline "Displacement - liter", C3CL, Y
    If nd < 2 Then
        printline RightAlign(5, 2, CID * ZM3 / 1000), C3VL, Y
    Else
        printline RightAlign(5, 3, CID * ZM3 / 1000), C3VL, Y
    End If
    
    Y = Printer.CurrentY
    printline "Peak HP/CID", C1CL, Y
    printline gc_HPperCID.RightAlign(5), C1VL, Y
    printline "Peak Torque/CID", C2CL, Y
    printline gc_TQperCID.RightAlign(5), C2VL, Y
    printline "Peak Power - kW", C3CL, Y
    printline RightAlign(6 - nd2, nd, gc_HP.Value / 1.34102), C3VL, Y
    
    Y = Printer.CurrentY
    printline "Shift RPM", C1CL, Y
    printline gc_Shift.RightAlign(5), C1VL, Y
    printline "Redline RPM", C2CL, Y
    printline gc_Redline.RightAlign(5), C2VL, Y
    printline "Peak Torque - Nm", C3CL, Y
    printline RightAlign(6 - nd2, nd, gc_TQ.Value * 0.3048 * 4.44822), C3VL, Y
        
    C1CL = 61 * pw80
    Y = Printer.CurrentY + 6 * line_height
    printline "  RPM    HP    TQ", C1CL, Y, , Not IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline " ----   ---   ---", C1CL, Y, , Not IS_CENTER, IS_BOLD
    
    With frmGraph.lstDynoData
        For i = 0 To .Listcount
            Y = Printer.CurrentY
            printline .List(i), C1CL, Y
        Next
    End With
    
    #If ISENGINEPRO Then
        'page 2 - ENGINE Pro Intake Port Flowbench Data Worksheet and Intake Port Flow Details
        '-------------------------------------------------------------------------------------
        Load frmFlowB
        
        C1CL = 3 * pw80:    C1VL = 30 * pw80
        C2CL = 38 * pw80:   C2VL = 37 * pw80
                            C3VL = 43 * pw80
                            C4VL = 48 * pw80
                            C5VL = 55 * pw80
                            C6VL = 62 * pw80
                            C7VL = 69 * pw80
                
        Y = Printer.CurrentY
        bPage2 = True:    PrintHeading C1CL
    
        PrintGraph2
    
        Y = Printer.CurrentY
        printline "Intake Port Flowbench Data @ " & gc_DeltaP.Formatted & " in H2O Worksheet", C1CL, Y, 12, IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "Number of Intake Valves per Cylinder", C1CL, Y, , , IS_BOLD
        printline gc_NoInValves.RightAlign(5), C1VL, Y, , , IS_BOLD
        ysave = Y
        
        Y = Printer.CurrentY
        printline "Intake Valve Diameter - " & gc_ValveDia.Unit, C1CL, Y
        printline gc_ValveDia.RightAlign(5), C1VL, Y
    
        Y = Printer.CurrentY
        If gc_SeatDia.Inches Then
            printline "Valve Seat Throat Diameter - " & gc_SeatDia.Unit, C1CL, Y
        Else
            printline "Valve Seat Throat Dia - " & gc_SeatDia.Unit, C1CL, Y
        End If
        printline gc_SeatDia.RightAlign(5), C1VL, Y
        
        Y = Printer.CurrentY
        printline "Valve Seat Throat Percentage - %", C1CL, Y
        printline gc_SeatPer.RightAlign(5), C1VL, Y
        
        Y = Printer.CurrentY
        printline "Valve Seat Angle - degree", C1CL, Y
        printline gc_VSAngle.RightAlign(5), C1VL, Y
        
        Y = Printer.CurrentY
        printline "Valve Seat Width - inch", C1CL, Y
        printline gc_VSWidth.RightAlign(5), C1VL, Y
        
        Y = Printer.CurrentY
        If gc_StemDia.Inches Then
            printline "Valve Stem Diameter - " & gc_StemDia.Unit, C1CL, Y
        Else
            printline "Valve Stem Diameter - " & gc_StemDia.Unit, C1CL, Y
        End If
        printline gc_StemDia.RightAlign(5), C1VL, Y
            
        Y = Printer.CurrentY
        printline "Maximum Intake Valve Lift - inch", C1CL, Y, , , IS_BOLD
        printline gc_ValveLift.RightAlign(5), C1VL, Y, , , IS_BOLD
        
        Y = Printer.CurrentY
        printline "Flow @ Maximum Valve Lift - CFM", C1CL, Y
        printline RightAlign(4, 1, val(frmFlowB.txtFlowVal.Text)), C1VL, Y
        
        Y = Printer.CurrentY
        printline "Valve Seat Throat Area - sq inch", C1CL, Y
        printline gc_CSArea.RightAlign(5), C1VL, Y
        
        Y = Printer.CurrentY
        printline "Intake Flow Velocity - ft/sec", C1CL, Y
        printline gc_FlowVel.RightAlign(5), C1VL, Y
        
        Y = Printer.CurrentY
        printline "Intake Flow Flux - CFM/sq inch", C1CL, Y
        printline gc_FlowFlux.RightAlign(5), C1VL, Y
        
        Y = Printer.CurrentY
        printline "Flow Velocity Index - %", C1CL, Y
        printline gc_FVIndex.RightAlign(5), C1VL, Y
        
        
        Y = ysave
        printline "Lift   Flow    Area Velocity Flow Flux Flow Vel", C2CL, Y, , , IS_BOLD
        
        Y = Printer.CurrentY
        printline "Inch    CFM   sq in  ft/sec  CFM/sq in  Index-%", C2CL, Y, , , IS_BOLD
        
        For i = 0 To 9
            If gc_IntLift(i).Value = 0 Then Exit For
                
            Y = Printer.CurrentY
            printline gc_IntLift(i).RightAlign(5), C2VL, Y
            printline gc_IntFlow(i).RightAlign(5), C3VL, Y
            printline RightAlign(5, 3, val(frmFlowB.lblArea(i).caption)), C4VL, Y
            printline RightAlign(5, 1, val(frmFlowB.lblVel(i).caption)), C5VL, Y
            printline RightAlign(5, 1, val(frmFlowB.lblFlux(i).caption)), C6VL, Y
            printline RightAlign(5, 1, val(frmFlowB.lblFVI(i).caption)), C7VL, Y
        Next
        
        Y = 20 * line_height
        printline "Intake Flow & Flow Velocity Index vs. Lift", C1CL, Y, 12, IS_CENTER, IS_BOLD
        
        Unload frmFlowB
        
        
        '----------------------------------------------------------
        Load frmFlowDet
        
        C1CL = 3 * pw80:    C1VL = 16 * pw80:   C2CL = 32 * pw80:   C2VL = 54 * pw80
        Y = 51 * line_height
        printline "ENGINE Pro Intake Port Flow Details", C1CL, Y, 12, IS_CENTER, IS_BOLD
        
        gc_Detail.CalcFlowDetails 1
        Y = Printer.CurrentY
        printline Trim(gc_CamType.List(gc_CamType.Value)), C1CL, Y, , , IS_BOLD
        ysave = Y
        
        Y = Printer.CurrentY
        printline Left(gc_Detail.Headings(4), 18), C1VL, Y
        
        Y = Printer.CurrentY
        printline Left(gc_Detail.Headings(5), 18), C1VL, Y
        
        Y = Printer.CurrentY
        printline "   Event", C1CL, Y, , , IS_BOLD
        printline Left(gc_Detail.Headings(6), 18), C1VL, Y
        
        For i = 1 To 12
            Y = Printer.CurrentY
            If i = 5 Or i = 7 Then
                printline frmFlowDet.lblFlow(i).caption, C1CL, Y, , , IS_BOLD
                printline Left(gc_Detail.DataFlow(i), 18), C1VL, Y, , , IS_BOLD
            Else
                printline frmFlowDet.lblFlow(i).caption, C1CL, Y
                printline Left(gc_Detail.DataFlow(i), 18), C1VL, Y
            End If
        Next
        
        Y = ysave:                  Printer.CurrentY = Y
        PrintOneFlowDetails 1, C2CL
        
        Y = ysave:                  Printer.CurrentY = Y
        PrintOneFlowDetails 2, C2VL
        
        Unload frmFlowDet
        
        'page 3 - ENGINE Pro Mechanical Details and Recommendations
        '----------------------------------------------------------
        C1CL = 3 * pw80
        
        Y = Printer.CurrentY
        bPage2 = True:    PrintHeading C1CL
    
        Y = Printer.CurrentY:   printline "", C1CL, Y
        Y = Printer.CurrentY
        printline "ENGINE Pro Mechanical Details", C1CL, Y, 12, IS_CENTER, IS_BOLD
        
        C1CL = 9 * pw80
        C2CL = 39 * pw80:   C2VL = 64 * pw80
        
        Y = Printer.CurrentY
        printline "Piston Speed Summary - FPM", C1CL, Y, , Not IS_CENTER, IS_BOLD
        printline "Est. Cranking Compression - psig", C2CL, Y
        printline RightAlign(6, 0, CCP), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Rating   RPM    Avg   Max*", C1CL, Y
        
        Y = Printer.CurrentY
        printline gc_Detail.RatingLine(1), C1CL, Y
        printline "       Geometric Data Summary", C2CL, Y, , Not IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline gc_Detail.RatingLine(2), C1CL, Y
        printline "Bore to Stroke Ratio", C2CL, Y
        printline RightAlign(5, 2, BQS), C2VL, Y
        
        Y = Printer.CurrentY
        printline gc_Detail.RatingLine(3), C1CL, Y
        printline "Rod to Stroke Ratio", C2CL, Y
        printline RightAlign(5, 2, LRQS), C2VL, Y
        
        Y = Printer.CurrentY
        printline gc_Detail.RatingLine(4), C1CL, Y
        printline "Piston to Head/Rod Length", C2CL, Y
        printline RightAlign(5, 4, DQR), C2VL, Y
        
        C1CL = 8 * pw80
        Y = Printer.CurrentY
        i = InStr(gc_Detail.Headings(7), "@") - 2
        printline Left(gc_Detail.Headings(7), i), C1CL, Y
        printline "Intake Throat/Bore Area Ratio", C2CL, Y
        printline RightAlign(5, 3, gc_CSArea.Value / BArea), C2VL, Y
        
        C1CL = 9 * pw80
        Y = Printer.CurrentY
        printline Mid(gc_Detail.Headings(7), i + 1), C1CL, Y
        printline "Intake Valve Lift/Diameter Ratio", C2CL, Y
        vd = gc_ValveDia.Value: If Not gc_ValveDia.Inches Then vd = vd / ZM
        printline RightAlign(5, 3, gc_ValveLift.Value / vd), C2VL, Y
        
        
        C1CL = 6 * pw80:            C2CL = 40 * pw80
        Y = Printer.CurrentY:       printline "", C1CL, Y
        
        Y = Printer.CurrentY:       ysave = Y
        PrintOneMechDetails 1, C1CL
        
        Y = ysave:                  Printer.CurrentY = Y
        PrintOneMechDetails 2, C2CL
        
        Printer.CurrentY = Printer.CurrentY + LINE_GAP
        
        Y = Printer.CurrentY:       ysave = Y
        PrintOneMechDetails 3, C1CL
        
        Y = ysave:                  Printer.CurrentY = Y
        PrintOneMechDetails 4, C2CL
    
    
        C1CL = 3 * pw80:    C1VL = 32 * pw80
        C2CL = 39 * pw80:   C2VL = 69 * pw80
    
        Y = Printer.CurrentY:       printline "", C1CL, Y
        Y = Printer.CurrentY
        printline "ENGINE Pro Recommendations", C1CL, Y, 12, IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "             Intake System:", C1CL, Y, , Not IS_CENTER, IS_BOLD
        printline "               Exhaust Port:", C2CL, Y, , Not IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "Intake Valve Lift - inch", C1CL, Y
        printline gc_InMaxValveLift.RightAlign(5), C1VL, Y
        printline "Exhaust Flow - CFM @ " & gc_DeltaP.Formatted & " inch H2O, %Intake", C2CL, Y
        
        Y = Printer.CurrentY
        printline "Minimum Flow Area - sq inch", C1CL, Y
        printline gc_InMinFlowArea.RightAlign(5), C1VL, Y
        printline "@ " & gc_RefBore.Formatted & " " & gc_RefBore.Unit & " Ref. Bore Diameter", C2CL, Y
        evds = Format(100 * gc_ExRecFlow.Value / gc_MaxInFlow.Value, "##") & "%"
        evds = gc_ExRecFlow.Formatted & "=" & evds
        printline evds, RsetString(C2VL, evds), Y
        
        Y = Printer.CurrentY
        printline "Total Intake Track Length - inch", C1CL, Y
        printline gc_InTrackLen.RightAlign(5), C1VL, Y
        printline "Exhaust Valve Diameter - " & gc_ExValveDia.Unit, C2CL, Y
        If gc_ExValveDia.Inches Then
            evd = Round(gc_ExValveDia.Value + 0.04, 0.02):  evds = Format(evd, "#.#0")
        Else
            evd = Round(gc_ExValveDia.Value + 1, 0.5):      evds = Format(evd, "##.0")
        End If
        evds = gc_ExValveDia.Formatted & "-" & evds
        printline evds, RsetString(C2VL, evds), Y
        
        Y = Printer.CurrentY
        printline "Maximum Flow Area - sq inch", C1CL, Y
        printline gc_InMaxFlowArea.RightAlign(5), C1VL, Y
        printline "Exhaust Valve Lift - inch", C2CL, Y
        printline gc_ExMaxValveLift.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Total Intake Track Volume - c.c.", C1CL, Y
        printline gc_InTrackVol.RightAlign(5), C1VL, Y
        printline "Minimum Flow Area - sq inch", C2CL, Y
        printline gc_ExMinFlowArea.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        If gc_Manifold.Value <> 2 Then
            printline "Plenum Volume - cubic inch", C1CL, Y
            printline gc_PlenVol.RightAlign(5), C1VL, Y
        End If
        printline "Maximum Flow Area - sq inch", C2CL, Y
        printline gc_ExMaxFlowArea.RightAlign(5), C2VL, Y
    
        Y = Printer.CurrentY:       printline "", C1CL, Y
        Y = Printer.CurrentY
        printline "               Camshaft:", C1CL, Y, , Not IS_CENTER, IS_BOLD
        printline "              Exhaust System:", C2CL, Y, , Not IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "Lobe Separation Angle - deg", C1CL, Y
        printline gc_LobeSepAng.RightAlign(5), C1VL, Y
        printline "Primary Tube Length - inch", C2CL, Y
        printline gc_PriTubeLen.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Intake Lobe Centerline - deg", C1CL, Y
        printline gc_InLobeCL.RightAlign(5), C1VL, Y
        printline "Primary Tube Diameter - inch", C2CL, Y
        printline gc_PriTubeDia.RightAlign(5), C2VL, Y
        
        Y = Printer.CurrentY
        printline "Exhaust Duration @ .050 inch - deg", C1CL, Y
        printline gc_ExCamDur.RightAlign(5), C1VL, Y
        If gc_NoCyl.Value > 1 Then
            printline "Collector Diameter - inch", C2CL, Y
            printline gc_CollectDia.RightAlign(5), C2VL, Y
        End If
    #End If

    Printer.EndDoc
End Sub

Private Sub PrintHeading(tab05 As Long)
Dim i As Integer
    If bPage2 Then Printer.NewPage
    
    Printer.CurrentY = Printer.CurrentY + LINE_GAP
    
    Y = 0
    Printer.fontsize = 10:    Printer.fontbold = False
    printline "", tab05, Y
    printline App.Title & " - Version " & App.Major & "." & App.Minor, 0, Printer.CurrentY, 14, IS_CENTER, IS_BOLD
    printline "Racing Systems Analysis - www.QUARTERjr.com", 0, Printer.CurrentY, 12, IS_CENTER, IS_BOLD
    'printline "www.RacingSecrets.com - www.SpeedTalk.com", 0, Printer.CurrentY, 12, IS_CENTER, IS_BOLD
    'printline "www.DragRacingPro.com", 0, Printer.CurrentY, 12, IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY:     printline "File:  " & LCase(NameOnly(ofn)), tab05, Y
    Y = Printer.CurrentY:     printline "Note:  " & Note, tab05, Y
End Sub

Private Sub printline(szLine As String, X As Long, Y As Long, Optional fontsize As Variant, Optional center As Variant, Optional fontbold As Variant)
    If Not IsMissing(fontsize) Then If IsNumeric(fontsize) Then Printer.fontsize = fontsize
    If Not IsMissing(fontbold) Then If fontbold Then Printer.fontbold = fontbold
    
    Printer.CurrentX = X:      Printer.CurrentY = Y
    
    If Not IsMissing(center) Then
        If center Then Printer.CurrentX = ((Printer.Width - X) / 2) - (Printer.TextWidth(szLine) / 2)
    End If
    
    Printer.Print szLine
    Printer.fontsize = 10:     Printer.fontbold = False
End Sub

Public Function RsetString(spos As Long, ostring As String) As Long
'spos is starting position, the string is usually 7 bytes long, ostring is string to print
Dim npos As Long
    If Len(ostring) > 7 Then
        npos = Printer.TextWidth(Left(ostring, Len(ostring) - 7))
        npos = spos - npos
        If npos < 0 Then npos = 1
    Else
        npos = spos
    End If
    
    RsetString = npos
End Function

Private Sub PrintGraph()
    With frmENGINE
        .picGraph.AutoSize = False
        .picGraph.Width = (69 / 80) * Printer.ScaleWidth
        .picGraph.Height = Printer.ScaleHeight - 33 * line_height
    End With
    
    If Not IsPrinterColor() Then    'this is OK since graph not visible during printing
        With frmGraph.gphEngine
            .ColorData = 0
            .PatternData = 0
            .OverlayColor = 0
            .OverlayPattern = 1
            .OverlayPatternedLines = 1
        End With
    End If
    
    frmGraph.DrawGraph
    frmENGINE.picGraph.Picture = frmGraph.gphEngine.Picture
    Unload frmGraph
    
    Printer.PaintPicture frmENGINE.picGraph.Picture, pw80, 35 * line_height, frmENGINE.picGraph.Width, frmENGINE.picGraph.Height
End Sub

#If ISENGINEPRO Then
Private Sub PrintGraph2()
    With frmENGINE
        .picGraph.AutoSize = False
        .picGraph.Width = Printer.ScaleWidth
        .picGraph.Height = Printer.ScaleHeight - 35 * line_height
    End With
    
    If Not IsPrinterColor() Then    'this is OK since graph not visible during printing
        With frmFlowB.gphFlowB
            .ColorData = 0
            .PatternData = 0
            .OverlayColor = 0
            .OverlayPattern = 1
            .OverlayPatternedLines = 1
        End With
    End If
    
    frmFlowB.Graph2
    frmENGINE.picGraph.Picture = frmFlowB.gphFlowB.Picture
    Unload frmFlowB
    
    Printer.PaintPicture frmENGINE.picGraph.Picture, pw80, 18 * line_height, frmENGINE.picGraph.Width, frmENGINE.picGraph.Height
End Sub
#End If

#If ISENGINEPRO Then
Private Sub PrintOneMechDetails(Index As Integer, tab_stop As Long)
Dim i As Integer
    gc_Detail.CalcMechDetails Index
    
    Y = Printer.CurrentY
    printline "    " & gc_Detail.Headings(1), tab_stop, Y, , Not IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline gc_Detail.Headings(2), tab_stop, Y
    
    Y = Printer.CurrentY
    printline gc_Detail.Headings(3), tab_stop, Y
    
    For i = 1 To 15
        Y = Printer.CurrentY
        If i = 6 Then
            printline " " & gc_Detail.DataMech(i), tab_stop, Y, , , IS_BOLD
        Else
            printline " " & gc_Detail.DataMech(i), tab_stop, Y
        End If
    Next
End Sub
#End If

#If ISENGINEPRO Then
Private Sub PrintOneFlowDetails(Index As Integer, tab_stop As Long)
Dim i As Integer
    gc_Detail.CalcFlowDetails Index
    
    Y = Printer.CurrentY
    printline "|" & gc_Detail.Headings(1), tab_stop, Y, , , IS_BOLD
    
    Y = Printer.CurrentY
    printline "|" & Mid(gc_Detail.Headings(4), 19), tab_stop, Y
    
    Y = Printer.CurrentY
    printline "|" & Mid(gc_Detail.Headings(5), 19), tab_stop, Y
    
    Y = Printer.CurrentY
    printline "|" & Mid(gc_Detail.Headings(6), 19), tab_stop, Y
    
    For i = 1 To 12
        Y = Printer.CurrentY
        If i = 5 Then
            printline "|" & Mid(gc_Detail.DataFlow(i), 19), tab_stop, Y
        Else
            printline "|" & Mid(gc_Detail.DataFlow(i), 19), tab_stop, Y
        End If
    Next
End Sub
#End If

Private Function IsPrinterColor() As Boolean
    On Error GoTo NotColor
    
    IsPrinterColor = False
    If Printer.ColorMode = vbPRCMColor Then IsPrinterColor = True

NotColor:
End Function
