Attribute VB_Name = "modQtrPerf"
Option Explicit
Option Compare Text

Public Sub TestLaunchRPM()   'called by QUARTER Pro only!
Dim MsgTxt As String, MsgCap As String
    MsgTxt = ""
    
    If gc_LaunchRPM.Value <= gc_LaunchRPM.MinVal Then
        MsgTxt = "Launch@ RPM can not be lower than the first Engine Dyno Data RPM.  Either increase the Launch@ RPM or add more Engine Dyno Data at the desired Launch@ RPM."
    End If
    
    If gc_TransType.Value Then
        If gc_SlipStallRPM.UOM = UOM_NORMAL Then
            If gc_LaunchRPM.Value >= gc_SlipStallRPM.Value Then
                MsgTxt = "Launch@ RPM can not be greater than the torque converter Stall RPM."
            End If
        End If
    Else
        If gc_LaunchRPM.Value >= CalcMaxRPM Then
            MsgTxt = "Launch@ RPM can not be greater than the last Engine Dyno Data RPM.  Either decrease the Launch@ RPM or add more Engine Dyno Data at the desired Launch@ RPM."
        End If
    End If

    If MsgTxt <> "" Then
        MsgCap = "Help: Launch@ RPM"
        MsgBox MsgTxt, vbInformation, MsgCap
    End If
End Sub

Public Sub TestOverhang()
Dim MsgTxt As String, MsgCap As String
    If gc_Overhang.Value > 0.5 * gc_Wheelbase.Value Then
        MsgCap = "Help: Overhang"
        MsgTxt = "Front Overhang seems large for the Wheelbase."
        MsgBox MsgTxt, vbInformation, MsgCap
    End If
End Sub

Public Sub TestRollout()
Dim MsgTxt As String, MsgCap As String
    If gc_Rollout.Value > 16 Then
        MsgCap = "Help: Rollout"
        MsgTxt = "Vehicle Rollout seems large for the Tire Diameter."
        MsgBox MsgTxt, vbInformation, MsgCap
    End If
End Sub

Public Sub TestSlipStallRPM()
Dim MsgTxt As String, MsgCap As String
    #If ISQUARTERPRO Then
        MsgTxt = ""
    
        If gc_SlipStallRPM.UOM = UOM_NORMAL Then
            If gc_TransType.Value Then
                MsgCap = "Help: Stall RPM"
                If gc_SlipStallRPM.Value <= gc_LaunchRPM.Value Then
                    MsgTxt = "Torque converter Stall RPM can not be less than the Launch@ RPM."
                ElseIf gc_SlipStallRPM.Value >= clsVals("ShiftRPM", 1).Value - 100 Then
                    MsgTxt = "Torque converter Stall RPM can not be greater than the low gear Shift@ RPM."
                End If
            Else
                MsgCap = "Help: Slip RPM"
                If gc_SlipStallRPM.Value <= clsVals("EngineRPM", 1).Value Then
                    MsgTxt = "Slip RPM can not be lower than the first Engine Dyno Data RPM value."
                ElseIf gc_SlipStallRPM.Value >= clsVals("ShiftRPM", 1).Value - 100 Then
                    MsgTxt = "Slip RPM can not be greater than the low gear Shift@ RPM."
                End If
            End If
        End If

        If MsgTxt <> "" Then
            MsgBox MsgTxt, vbInformation, MsgCap
        End If
    #End If
    
    If gc_SlipStallRPM.UOM = UOM_NORMAL Then
        If gc_SlipStallRPM.Value > gc_RPMPeakHP.Value Then
            If gc_TransType.Value Then
                MsgCap = "Help: Stall RPM"
                MsgTxt = "Stall RPM is normally less than the RPM@ Peak HP."
            Else
                MsgCap = "Help: Slip RPM"
                MsgTxt = "Slip RPM is normally less than the RPM@ Peak HP."
            End If
            MsgBox MsgTxt, vbInformation, MsgCap
        End If
    End If
End Sub

Public Sub TestShiftRPM()
Dim i As Integer
Dim MsgTxt As String, MsgCap As String
Dim TestRPM As Single
    MsgTxt = ""
    
    #If ISQUARTERPRO Then
        TestRPM = CalcMaxRPM
        
        For i = 1 To 6
            If clsVals("TransGR", i).Value = 0 Then Exit For
            If clsVals("ShiftRPM", i).Value > 0 Then
                If clsVals("ShiftRPM", i).Value < gc_RPMPeakHP.Value Then
                    MsgTxt = "Shift@ RPM is normally greater than the RPM@ Peak HP."
                    Exit For
                ElseIf clsVals("ShiftRPM", i).Value > TestRPM Then
                    MsgTxt = "Shift@ RPM can not be greater than the last RPM in the Engine Dyno Data.  The Shift@ RPM values have now been changed to observe this maximum limit."
                    clsVals("ShiftRPM", i).Value = TestRPM
                    'setfocus where - Patrick
                End If
            End If
        Next
    #Else
        If gc_ShiftRPM.Value < gc_RPMPeakHP.Value Then MsgTxt = "Shift@ RPM is normally greater than the RPM@ Peak HP."
    #End If
    
    If MsgTxt <> "" Then MsgCap = "Help: Shift@ RPM":   MsgBox MsgTxt, vbInformation, MsgCap
End Sub

Public Sub TestRefArea()
Dim Min1 As Single, Max1 As Single
Dim MsgTxt As String, MsgCap As String
    Select Case gc_BodyStyle.Value
        #If ISQUARTERPRO Then
            Case 1: Min1 = 12: Max1 = 50
            Case 8: Min1 = 5:  Max1 = 13
        #Else
            Case 1: Min1 = 16: Max1 = 24
            Case 2: Min1 = 12: Max1 = 20
            Case 3: Min1 = 20: Max1 = 30
            Case 4: Min1 = 14: Max1 = 24
            Case 5: Min1 = 16: Max1 = 26
            Case 6: Min1 = 18: Max1 = 28
            Case 7: Min1 = 25: Max1 = 50
            Case 8: Min1 = 5:  Max1 = 13
        #End If
    End Select
    
    MsgTxt = ""
    If gc_RefArea.Value < Min1 Then
        MsgTxt = "Frontal Area seems small for the Body Style."
    ElseIf gc_RefArea.Value > Max1 Then
        MsgTxt = "Frontal Area seems large for the Body Style."
    End If
    
    If MsgTxt <> "" Then
        MsgCap = "Help: Frontal Area"
        MsgBox MsgTxt, vbInformation, MsgCap
    End If
End Sub

Public Sub CalcBodyStyle(ByRef btn As CommandButton) 'called by QUARTER Pro only!
    If gc_Weight.Value > 800 Then
        gc_BodyStyle.Value = 1
    Else
        gc_BodyStyle.Value = 8
    End If
    
    If Not btn Is Nothing Then
        If gc_BodyStyle.Value = 8 Then
            btn.Visible = True
        Else
            btn.Visible = False
        End If
    End If
End Sub

Public Function CalcMaxRPM()   'called by QUARTER Pro only!
Dim i As Integer
Dim TestRPM As Single
    CalcMaxRPM = clsVals("EngineRPM", 1).Value
    For i = 2 To 11
        TestRPM = clsVals("EngineRPM", i).Value
        If TestRPM = 0 Then Exit For
        
        If TestRPM > CalcMaxRPM Then CalcMaxRPM = TestRPM
    Next
End Function

Public Sub CalcPeakHPandRPM()   'called by QUARTER Pro only!
Dim i As Integer
Dim TestRPM As Single, TestHP As Single
    TestRPM = clsVals("EngineRPM", 1).Value
    TestHP = clsVals("EngineHP", 1).Value
    For i = 2 To 11
        If clsVals("EngineRPM", i).Value = 0 Then Exit For
        
        If clsVals("EngineHP", i).Value > TestHP Then
            TestRPM = clsVals("EngineRPM", i).Value
            TestHP = clsVals("EngineHP", i).Value
        End If
    Next
    
    gc_PeakHP.Value = TestHP
    gc_RPMPeakHP.Value = TestRPM
End Sub

Public Sub SetBarometer()
    With gc_Barometer
        If gc_Elevation.Value = 0 Then
            .MinVal_Normal = 18
            .MaxVal_Normal = 32
        Else
            .MinVal_Normal = 29.2
            .MaxVal_Normal = 30.6
        End If
    End With
    SetMinMax gc_Barometer
End Sub

Public Sub SetElevation()
    With gc_Elevation
        If gc_Barometer.Value >= 29.2 And gc_Barometer.Value <= 30.6 Then
            .MinVal_Normal = -2000
            .MaxVal_Normal = 13000
        Else
            .MinVal_Normal = 0
            .MaxVal_Normal = 0
        End If
    End With
    SetMinMax gc_Elevation
End Sub

Public Sub SetPeakHP()    'called by QUARTER jr only!
Dim Work As Single, ztd As Single
    With gc_PeakHP        'gasoline HP for naturally aspirated VE = 140%
        Work = 1.4 * gc_Displacement.Value * (gc_RPMPeakHP.Value / 3800)
                          'plus 1000 HP bump for Nitrous
        If gc_Nitrous.Value Then Work = Work + 1000
        .MaxVal_Normal = CalcWork * Work     'modify by fuel system type
        
        'max tire force limit can determine engine HP limit
        If gc_TireDia.UOM = UOM_NORMAL Then
            ztd = gc_TireDia.Value
        Else
            ztd = gc_TireDia.Value / PI
        End If
        
        Work = 35 * gc_TireWidth.Value * ztd                'max tire force
        Work = ((ztd / 2) / 12) * Work                      'axle torque
        Work = Work / gc_GearRatio.Value                    'drive shaft torque
        Work = Work / clsVals("TransGR", 1).Value           'trans torque
        If gc_TransType.Value Then Work = Work / 1.5        'engine torque
        Work = Work * gc_RPMPeakHP.Value / Z6               'engine HP

        If Work < .MaxVal_Normal Then
            .MaxVal_Normal = Work
        End If
        
        .MinVal_Normal = RoundDown(.MaxVal_Normal / 5.5, 10)
        .MaxVal_Normal = RoundUp(.MaxVal_Normal, 10)
    End With
    SetMinMax gc_PeakHP
End Sub

Public Function CalcWork()
    Select Case gc_FuelSystem.Value
        Case 1, 2:  CalcWork = 1
        Case 3, 4:  CalcWork = 1.08
        Case 5:     CalcWork = 5
        Case 6:     CalcWork = 2 * 1
        Case 7, 9:  CalcWork = 2.5 * 1.08
        Case 8:     CalcWork = 1.5 * 5.5
    End Select
End Function

Public Sub SetLaunchRPM()
    With gc_LaunchRPM
        #If ISQUARTERPRO Then       'engine RPM limits
            .MinVal_Normal = clsVals("EngineRPM", 1).Value - 200
            .MaxVal_Normal = CalcMaxRPM
        #Else
            .MinVal_Normal = Round(0.2 * gc_RPMPeakHP.Value, 100)
            .MaxVal_Normal = Round(1.3 * gc_RPMPeakHP.Value, 100)
        #End If
    
        If gc_TransType.Value Then  'torque converter stall speed limit
            If gc_SlipStallRPM.UOM = UOM_NORMAL Then
                .MaxVal_Normal = gc_SlipStallRPM.Value
            Else
                'QPro .MaxVal_Normal for stall index would go here ...
                'not needed for Qjr as Launch RPM = Stall RPM always!
            End If
        End If
    End With
    SetMinMax gc_LaunchRPM
End Sub

Public Sub SetShiftRPM()
    With gc_ShiftRPM
        #If ISQUARTERPRO Then       'engine RPM limits
            .MinVal_Normal = clsVals("EngineRPM", 1).Value
            .MaxVal_Normal = CalcMaxRPM
        #Else
            .MinVal_Normal = Round(0.5 * gc_RPMPeakHP.Value, 100)
            .MaxVal_Normal = Round(1.3 * gc_RPMPeakHP.Value, 100)
        #End If
        
        If gc_SlipStallRPM.UOM = UOM_NORMAL Then
            .MinVal_Normal = gc_SlipStallRPM.Value + 100
        Else
            If gc_TransType.Value Then
                '.MinVal_Normal for stall index would go here ...
            Else
                '.MinVal_Normal for slip index would go here ...
            End If
        End If
    End With
    SetMinMax gc_ShiftRPM
End Sub

Public Sub SetSlipStallRPM()
    With gc_SlipStallRPM
        #If ISQUARTERPRO Then
            .MinVal_Normal = clsVals("EngineRPM", 1).Value
            If gc_TransType.Value Then
                .MinVal_Normal = gc_LaunchRPM.Value
            End If
            
            '.MaxVal_Normal = gc_grdGears.GridArray(COL_SHIFT, 0) - 100
            .MaxVal_Normal = clsVals("ShiftRPM", 1).Value - 100
        #Else
            .MinVal_Normal = Round(0.2 * gc_RPMPeakHP.Value, 100)
            .MaxVal_Normal = gc_ShiftRPM.Value - 100
        #End If
        
        If .MinVal_Normal < 221 Then .MinVal_Normal = 221
        
        If .MaxVal_Normal <= .MinVal_Normal Then
            #If ISQUARTERPRO Then
                .MaxVal_Normal = CalcMaxRPM
            #Else
                .MaxVal_Normal = Round(1.3 * gc_RPMPeakHP.Value, 100)
            #End If
        End If
    End With
    SetMinMax gc_SlipStallRPM
End Sub

Public Sub SetTireWidth()
Dim ztd As Single
    If gc_TireDia.UOM = UOM_NORMAL Then
        ztd = gc_TireDia.Value
    Else
        ztd = gc_TireDia.Value / PI
    End If
    
    With gc_TireWidth
        .MinVal_Normal = (gc_Weight.Value / ztd) / 25
        If .MinVal_Normal < 0.05 * ztd Then .MinVal_Normal = 0.05 * ztd
        
        .MaxVal_Normal = (gc_Weight.Value / ztd) / 2.5
        If .MaxVal_Normal <= .MinVal_Normal Then
            .MaxVal_Normal = 2.5 * .MinVal_Normal
        End If
        If .MaxVal_Normal > 0.75 * ztd Then .MaxVal_Normal = 0.75 * ztd
        
        If gc_BodyStyle.Value = 8 Then
            .MinVal_Normal = 1.5 * .MinVal_Normal
            .MaxVal_Normal = 1.5 * .MaxVal_Normal
        End If
        
        .MinVal_Normal = RoundDown(.MinVal_Normal, 0.5)
        .MaxVal_Normal = RoundUp(.MaxVal_Normal, 0.5)
    End With
    SetMinMax gc_TireWidth
End Sub

Public Sub SetTrackTemp()
    With gc_TrackTemp
        .MinVal_Normal = gc_Temperature.Value
        .MaxVal_Normal = gc_Temperature.Value + 60
    End With
    SetMinMax gc_TrackTemp
End Sub

Public Sub SetWeight()
Dim estCID As Single
    With gc_Weight
        #If ISQUARTERPRO Then
            estCID = (gc_PeakHP.Value / 1.2) * (3800 / gc_RPMPeakHP.Value) / CalcWork
            .MinVal_Normal = Round(2 * estCID, 50)
            .MaxVal_Normal = Round(80 * estCID, 100)
        #Else
            .MinVal_Normal = Round(2 * gc_Displacement.Value, 50)
            .MaxVal_Normal = Round(80 * gc_Displacement.Value, 100)
        #End If
        
        If .MinVal_Normal < 200 Then .MinVal_Normal = 200
        
        #If Not ISBVPRO Then    'QUARTERjr and QUARTER Pro
            If .MaxVal_Normal > 8000 Then .MaxVal_Normal = 8000
        #Else                   'Bonneville
            If .MaxVal_Normal > 25000 Then .MaxVal_Normal = 25000
        #End If
    End With
    SetMinMax gc_Weight
End Sub

Public Sub SetMinMax(p_obj As CValue)
Dim tv As Single
    With p_obj
       'round min values to stay within calculated limits
        tv = val(Format(.MinVal_Normal, .ValFmt))
        If tv < .MinVal_Normal Then
            Select Case .DecimalPlaces_Normal
            Case 0:    .MinVal_Normal = tv + 1
            Case 1:    .MinVal_Normal = tv + 0.1
            Case 2:    .MinVal_Normal = tv + 0.01
            Case Else: .MinVal_Normal = tv + 0.001
            End Select
        Else
            .MinVal_Normal = tv
        End If
        
       'round max values to stay within calculated limits
        tv = val(Format(.MaxVal_Normal, .ValFmt))
        If tv > .MaxVal_Normal Then
            Select Case .DecimalPlaces_Normal
            Case 0:    .MaxVal_Normal = tv - 1
            Case 1:    .MaxVal_Normal = tv - 0.1
            Case 2:    .MaxVal_Normal = tv - 0.01
            Case Else: .MaxVal_Normal = tv - 0.001
            End Select
        Else
            .MaxVal_Normal = tv
        End If
        
        'round alternate min/max values to stay within calculated limits
        If .AllowAlternate Then
            tv = val(Format(.MinVal_Alternate, .ValFmt))
            If tv < .MinVal_Alternate Then
                Select Case .DecimalPlaces_Alternate
                Case 0:    .MinVal_Alternate = tv + 1
                Case Else: .MinVal_Alternate = tv + 0.1
                End Select
            Else
                .MinVal_Alternate = tv
            End If
            tv = val(Format(.MaxVal_Alternate, .ValFmt))
            If tv > .MaxVal_Alternate Then
                Select Case .DecimalPlaces_Alternate
                Case 0:    .MaxVal_Alternate = tv - 1
                Case Else: .MaxVal_Alternate = tv - 0.1
                End Select
            Else
                .MaxVal_Alternate = tv
            End If
        End If
        
       'select limit values
        If .UOM = UOM_NORMAL Then
            .MinVal = .MinVal_Normal:       .MaxVal = .MaxVal_Normal
        Else
            .MinVal = .MinVal_Alternate:    .MaxVal = .MaxVal_Alternate
        End If
    End With
End Sub

Public Sub SetAllValues()
Dim i As Integer
   'control button status messages
    gc_OpenBtn.StatusMsg = "Press this button to Open a new data document."
    gc_SaveBtn.StatusMsg = "Press this button to Save the current data document."
    gc_PrintBtn.StatusMsg = "Press this button to Print."
    
    #If Not ISBVPRO Then    'QUARTERjr and QUARTER Pro
        gc_RunBtn.StatusMsg = "Press this button to display the Dragstrip Timeslip."
    #Else                   'Bonneville
        gc_RunBtn.StatusMsg = "Press this button to display the Top Speed Timeslip."
    #End If
    
    gc_DynoDataBtn.StatusMsg = "Press this button to display the Engine Dyno Data Graph."
    gc_RecalcBtn.StatusMsg = "Press this button to multiply the Engine Dyno Data by the HP/Torque Multiplier."
    gc_OutputBtn.StatusMsg = "Press this button to display the Detailed Parameters."
    
    gc_GraphBtn(0).StatusMsg = "Press this button to display the RPM and MPH vs Time graph."
    gc_GraphBtn(1).StatusMsg = "Press this button to display the Acceleration and Distance vs Time graph."
    gc_GraphBtn(3).StatusMsg = "Press this button to display the RPM and MPH vs Distance graph."
    gc_GraphBtn(4).StatusMsg = "Press this button to display the Acceleration and Time vs Distance graph."
    gc_GraphBtn(6).StatusMsg = "Press this button to display the Engine RPM Histogram."
    
   'worksheet button and help button status messages
    'gc_WindAngleBtn.StatusMsg = "Press this button to display Help for the Wind Angle of Approach."
    'gc_RefAreaBtn.StatusMsg = "Press this button to display the Frontal Area Worksheet."
    'gc_DragCoefBtn.StatusMsg = "Press this button to display Help for the Drag Coefficient."
    'gc_ShapeFactorBtn.StatusMsg = "Press this button to display Help for the Shape Factor."
    'gc_TractionIndexBtn.StatusMsg = "Press this button to display Help for the Traction Index."
    'gc_TireWidthBtn.StatusMsg = "Press this button to display the Tire Width Worksheet."
    'gc_TransPMIBtn.StatusMsg = "Press this button to display the Transmission + Driveshaft PMI Worksheet."
    'gc_TiresPMIBtn.StatusMsg = "Press this button to display the Tires + Wheels + Ring Gear PMI Worksheet."
    'gc_GearRatioBtn.StatusMsg = "Press this button to display the Motorcycle Final Drive Gear Ratio Worksheet."
    
   'General
    With gc_Elevation
        .UnitNormal = "feet"
        .AllowNegative = True
        .HasMinMax = True
        .UOM = UOM_NORMAL
        .Msg = "Elevation": .caption = .Msg
        .StatusMsg = "The track elevation or altimeter reading in feet.  See user manual for details when using track elevation."
        .Labelctl = frmQuarter.Label1(1)
    End With
    
    With gc_Temperature
        .UnitNormal = "deg F"
        .HasMinMax = True: .MinVal_Normal = 35: .MaxVal_Normal = 120
        .UOM = UOM_NORMAL
        .Msg = "Temperature": .caption = .Msg
        .StatusMsg = "The ambient temperature in degrees F."
        .Labelctl = frmQuarter.Label1(2)
    End With
    
    With gc_Barometer
        .UnitNormal = "in Hg"
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True
        .UOM = UOM_NORMAL
        .Msg = "Barometer": .caption = .Msg
        .StatusMsg = "The ambient barometeric pressure.  See user manual for more details when using track elevation."
        .Labelctl = frmQuarter.Label1(3)
    End With
    
    With gc_Humidity
        .UnitNormal = "%"
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 100
        .UOM = UOM_NORMAL
        .Msg = "Relative Humidity": .caption = .Msg
        .StatusMsg = "The ambient relative humidity."
        .Labelctl = frmQuarter.Label1(4)
    End With
    
    With gc_WindSpeed
        .UnitNormal = "MPH"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 50
        .UOM = UOM_NORMAL
        .Msg = "Wind Velocity": .caption = .Msg
        .StatusMsg = "The absolute wind speed or velocity, independent of direction or approach angle."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(5)
        #End If
    End With
    
    With gc_WindAngle
        .UnitNormal = "degs"
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 180
        .UOM = UOM_NORMAL
        .Msg = "Wind Angle": .caption = .Msg
        .StatusMsg = "The prevailing wind approach angle.  Press the Help button for Wind Angle of Approach examples."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(34)
        #End If
    End With
    
    With gc_TrackTemp
        .UnitNormal = "deg F"
        .HasMinMax = True
        .UOM = UOM_NORMAL
        .Msg = "Track Temp": .caption = .Msg
        .StatusMsg = "The measured track temperature in degrees F."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(35)
        #End If
    End With
    
    With gc_TractionIndex
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 15
        .UOM = UOM_NORMAL
        .Msg = "Traction Index": .caption = .Msg
        .StatusMsg = "Traction Index for the racing surface.  Press the Help button for Traction Index examples."
        .Labelctl = frmQuarter.Label1(22)
    End With
    
    With gc_Track
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 7
        .UOM = UOM_NORMAL
        .HasList = True
        .List(1) = "One Mile Asphalt     "
        .List(2) = "El Mirage Dry Lake   "
        .List(3) = "Muroc Dry Lake (EAFB)"
        .List(4) = "Two Mile Asphalt     "
        .List(5) = "Bonneville - 3 Miles "
        .List(6) = "Bonneville - 5 Miles "
        .List(7) = "Ten Mile Test Track  "
        .Msg = "Track:": .caption = .Msg
        .StatusMsg = "The track type as selected from the drop down list."
        #If ISBVPRO Then
            .Labelctl = frmQuarter.Label1(17)
        #End If
    End With

    'Vehicle
    With gc_Weight
        .UnitNormal = "lbs"
        .HasMinMax = True
        .UOM = UOM_NORMAL
        .Msg = "Weight": .caption = .Msg
        .StatusMsg = "The total weight of the vehicle, including the driver."
        .Labelctl = frmQuarter.Label1(6)
    End With
    
    With gc_Wheelbase
        .UnitNormal = "inches"
        .HasMinMax = True: .MinVal_Normal = 24: .MaxVal_Normal = 360
        .UOM = UOM_NORMAL
        .Msg = "Wheelbase": .caption = .Msg
        .StatusMsg = "The wheelbase of the vehicle."
        .Labelctl = frmQuarter.Label1(7)
    End With
    
    With gc_Rollout
        .UnitNormal = "inches"
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 48
        .UOM = UOM_NORMAL
        .Msg = "Rollout": .caption = .Msg
        .StatusMsg = "Distance the vehicle must move before the timing clock starts, normally between 10 and 14 inches."
        #If Not ISBVPRO Then    'QUARTERjr and QUARTER Pro
            .Labelctl = frmQuarter.Label1(8)
        #End If
    End With
    
    With gc_Overhang
        .UnitNormal = "inches"
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 60
        .UOM = UOM_NORMAL
        .Msg = "Overhang": .caption = .Msg
        .StatusMsg = "Distance the front of the vehicle overhangs the front axle centerline, normally between 16 and 40 inches."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(37)
        #End If
    End With
    
   'Clutch and Torque Converter
    With gc_TransType
        .HasMinMax = True: .MinVal_Normal = -1: .MaxVal_Normal = 0
        .UOM = UOM_NORMAL
        .Msg = "Transmission Type?": .caption = .Msg
        .StatusMsg = "Option buttons used to select either a torque converter or clutch between the engine and transmission."
    End With
    
    With gc_LaunchRPM
        .HasMinMax = True
        .UOM = UOM_NORMAL
        .Msg = "Launch@ RPM": .caption = .Msg
        .StatusMsg = "The engine RPM when fully staged, normally controlled by an RPM limit box or other device."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(13)
        #End If
    End With
    
    With gc_SlipStallRPM
        .AllowAlternate = True
        .HasMinMax = True: .MinVal_Alternate = 10: .MaxVal_Alternate = 220
        .UOM = UOM_NORMAL
        .Labelctl = frmQuarter.Label1(11)
    End With
    
    With gc_TorqueMult
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 4
        .UOM = UOM_NORMAL
        .Msg = "Torque Multiplication": .caption = .Msg
        .StatusMsg = "The static torque multiplication factor of the torque converter."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(10)
        #End If
    End With
    
    With gc_Slippage
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 1.5
        .UOM = UOM_NORMAL
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(9)
        #End If
    End With
    
    With gc_LockUp
        .HasMinMax = True: .MinVal_Normal = 0:  .MaxVal_Normal = 1
        .UOM = UOM_NORMAL
        .Msg = "Lock-up (Y/N)?": .caption = .Msg
        .Labelctl = frmQuarter.Label1(12)
    End With
    
   'Aerodynamic Drag - Frontal Area, Drag and Lift Coefficients
    With gc_RefArea
        .UnitNormal = "sq ft"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 100
        .UOM = UOM_NORMAL
        .Msg = "Frontal Area": .caption = .Msg
        .StatusMsg = "The frontal or reference area to be used for aerodynamic drag and lift calculations."
        .Labelctl = frmQuarter.Label1(25)
    End With
    
    With gc_DragCoef
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 2
        .UOM = UOM_NORMAL
        .Msg = "Drag Coefficient": .caption = .Msg
        .StatusMsg = "The vehicle drag coefficient to be used for aerodynamic drag calculations."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(26)
        #End If
    End With
    
    With gc_LiftCoef
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .AllowNegative = True
        .HasMinMax = True: .MinVal_Normal = -5: .MaxVal_Normal = 5
        .UOM = UOM_NORMAL
        .Msg = "Lift Coefficient": .caption = .Msg
        .StatusMsg = "The vehicle lift coefficient to be used for aerodynamic lift calculations."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(27)
        #End If
    End With
    
    'Engine Dyno Data
    For i = 1 To 11
        clsVals.Add "EngineRPM", i
        With clsVals("EngineRPM", i)
            .HasMinMax = True:      .MinVal_Normal = 0:     .MaxVal_Normal = 18000
            .UOM = UOM_NORMAL
            .Msg = "Engine RPM":    .caption = .Msg
            .StatusMsg = "The engine RPM for this dyno data entry."
        End With
    Next
    
    For i = 1 To 11
        clsVals.Add "EngineHP", i
        With clsVals("EngineHP", i)
            .HasMinMax = True:      .MinVal_Normal = 0:     .MaxVal_Normal = 9000
            .UOM = UOM_NORMAL
            .Msg = "Engine HP":    .caption = .Msg
            .StatusMsg = "The engine HP for this dyno data entry."
        End With
    Next
    
    For i = 1 To 11
        clsVals.Add "EngineTQ", i
        With clsVals("EngineTQ", i)
            .HasMinMax = True:      .MinVal_Normal = 0:     .MaxVal_Normal = 7500
            .UOM = UOM_NORMAL
            .Msg = "Engine TQ":    .caption = .Msg
            .StatusMsg = "The engine torque (ft-lbf) for this dyno data entry."
        End With
    Next
    
    With gc_HPTQMult
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .HasMinMax = True: .MinVal_Normal = 0.1: .MaxVal_Normal = 5
        .UOM = UOM_NORMAL
        .Msg = "HP/Torque Multiplier": .caption = .Msg
        .StatusMsg = "HP/Torque Multiplier may be used to quickly modify all the Engine Dyno Data HP and Torque values."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(29)
        #End If
    End With
    
    With gc_FuelSystem
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 9
        .UOM = UOM_NORMAL
        .HasList = True
        .List(1) = "Gasoline Carburetor  "
        .List(2) = "Gasoline Injector    "
        .List(3) = "Methanol Carburetor  "
        .List(4) = "Methanol Injector    "
        .List(5) = "Nitromethane Injector"
        .List(6) = "Supercharged Gasoline"
        .List(7) = "Supercharged Methanol"
        .List(8) = "Supercharged Nitro   "
        .List(9) = "Flat Rate Engine HP  "
        .Msg = "Fuel System:": .caption = .Msg
        .StatusMsg = "The engine fuel system type as selected from the drop down list."
        .Labelctl = frmQuarter.Label1(28)
    End With
    
   'Final Drive
    With gc_GearRatio
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True: .MinVal_Normal = 0.5: .MaxVal_Normal = 50
        .UOM = UOM_NORMAL
        .Msg = "Gear Ratio": .caption = .Msg
        .StatusMsg = "The gear ratio of the final drive."
        .Labelctl = frmQuarter.Label1(19)
    End With
    
    With gc_Efficiency
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .HasMinMax = True: .MinVal_Normal = 0.5: .MaxVal_Normal = 1
        .UOM = UOM_NORMAL
        .Msg = "Efficiency": .caption = .Msg
        .StatusMsg = "The power transmission efficiency of the final drive."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(23)
        #End If
    End With
    
    With gc_TireDia
        .AllowAlternate = True
        .AllowDecimals = True
        .DecimalPlaces_Normal = 1:      .DecimalPlaces_Alternate = 1
        .HasMinMax = True
        .MinVal_Normal = 1:             .MinVal_Alternate = 61
        .MaxVal_Normal = 60:            .MaxVal_Alternate = 500
        .Msg_Normal = "Tire Diameter":  .Msg_Alternate = "Tire Rollout"
        .UOM = UOM_NORMAL
        .StatusMsg = "The measured tire diameter or rollout (circumference)."
        .Labelctl = frmQuarter.Label1(20)
    End With
    
    With gc_TireWidth
        .UnitNormal = "inches"
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True
        .UOM = UOM_NORMAL
        .Msg = "Tire Width": .caption = .Msg
        .StatusMsg = "The effective width of each tire."
        .Labelctl = frmQuarter.Label1(21)
    End With
    
   'Polar Moments of Inertia
    With gc_EnginePMI
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 50
        .UOM = UOM_NORMAL
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(33)
        #End If
    End With
    
    With gc_TransPMI
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 9
        .UOM = UOM_NORMAL
        .Msg = "Transmission + Driveshaft + Pinion Gear PMI": .caption = .Msg
        .StatusMsg = "The total Polar Moment of Inertia of the transmission shafts and gears, driveshaft and pinion gear."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(32)
        #End If
    End With
    
    With gc_TiresPMI
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 500
        .UOM = UOM_NORMAL
        .Msg = "Tires + Wheels + Brakes + Axles + Ring Gear PMI": .caption = .Msg
        .StatusMsg = "The total Polar Moment of Inertia of the tires, wheels, brakes, ring gear, spool and axles."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(31)
        #End If
    End With
    
   'specific QUARTER jr stuff ******************************************************************************************
   'Engine
    With gc_Displacement
        .UnitNormal = "CID"
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 1500
        .UOM = UOM_NORMAL
        .Msg = "Displacement": .caption = .Msg
        .StatusMsg = "The displacement of the engine in cubic inches."
        #If ISQUARTERJR Then
            .Labelctl = frmQuarter.Label1(35)
        #End If
    End With
    
    With gc_PeakHP
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 10000
        .UOM = UOM_NORMAL
        .Msg = "Peak HP": .caption = .Msg
        .StatusMsg = "The engine peak HP."
        #If ISQUARTERJR Then
            .Labelctl = frmQuarter.Label1(36)
        #End If
    End With
    
    With gc_Nitrous
        .HasMinMax = True: .MinVal_Normal = 0:  .MaxVal_Normal = 1
        .UOM = UOM_NORMAL
        .Msg = "Nitrous (Y/N)?": .caption = .Msg
        .StatusMsg = "Uncheck = Nitrous is not being used.  Check = Peak HP includes the use of Nitrous."
        #If ISQUARTERJR Then
            .Labelctl = frmQuarter.Label1(10)
        #End If
    End With
    
    With gc_RPMPeakHP
        .HasMinMax = True: .MinVal_Normal = 2000: .MaxVal_Normal = 16000
        .UOM = UOM_NORMAL
        .Msg = "RPM @ Peak HP": .caption = .Msg
        .StatusMsg = "The engine RPM at peak HP."
        #If ISQUARTERJR Then
            .Labelctl = frmQuarter.Label1(37)
        #End If
    End With
    
    With gc_ShiftRPM
        .HasMinMax = True
        .UOM = UOM_NORMAL
        .Msg = "Shift@ RPM": .caption = .Msg
        .StatusMsg = "The engine shift RPM."
        #If ISQUARTERJR Then
            .Labelctl = frmQuarter.Label1(38)
        #End If
    End With
    
    With gc_ConvDia
        .UnitNormal = "inches"
        .HasMinMax = True: .MinVal_Normal = 6: .MaxVal_Normal = 15
        .UOM = UOM_NORMAL
        .Msg = "Converter Diameter": .caption = .Msg
        .StatusMsg = "The torque converter diameter as stated by the manufacturer."
        #If ISQUARTERJR Then
            .Labelctl = frmQuarter.Label1(9)
        #End If
    End With
    
    For i = 1 To 6
        clsVals.Add "TransGR", i
        With clsVals("TransGR", i)
            .AllowDecimals = True:  .DecimalPlaces_Normal = 2
            .HasMinMax = True:      .MinVal_Normal = 0:     .MaxVal_Normal = 9
            .UOM = UOM_NORMAL
            .Msg = "Transmission Gear Ratio":       .caption = .Msg
            .StatusMsg = "The transmission gear ratio for this gear."
        End With
    Next

    For i = 1 To 6
        clsVals.Add "TransEff", i
        With clsVals("TransEff", i)
            .AllowDecimals = True:  .DecimalPlaces_Normal = 3
            .HasMinMax = True:      .MinVal_Normal = 0.2:   .MaxVal_Normal = 5
            .UOM = UOM_NORMAL
            .Msg = "Transmission Gear Efficiency":  .caption = .Msg
            .StatusMsg = "The transmission gear efficiency for this gear."
        End With
    Next

    For i = 1 To 6
        clsVals.Add "ShiftRPM", i
        With clsVals("ShiftRPM", i)
            .HasMinMax = True:      .MinVal_Normal = 100:   .MaxVal_Normal = 18000
            .UOM = UOM_NORMAL
            .Msg = "Shift@ RPM":    .caption = .Msg
            .StatusMsg = "The engine shift RPM for this gear."
        End With
    Next

    With gc_BodyStyle
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 8
        .UOM = UOM_NORMAL
        .HasList = True
        .List(1) = "dragster with wing"
        .List(2) = "dragster          "
        .List(3) = "funny car body    "
        .List(4) = "altered/roadster  "
        .List(5) = "fastback          "
        .List(6) = "sedan             "
        .List(7) = "station wagon/van "
        .List(8) = "motorcycle        "
        .Msg = "Body Style": .caption = .Msg
        .StatusMsg = "The vehicle body style as selected from the drop down list."
        #If ISQUARTERJR Then
            .Labelctl = frmQuarter.Label1(27)
        #End If
    End With
    
   'Worksheets
   'Tire Width Worksheet variables
    With gc_TreadWidth
        .UnitNormal = "inches"
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True: .MinVal_Normal = 2: .MaxVal_Normal = 20
        .UOM = UOM_NORMAL
        .Msg = "Tread Width": .caption = .Msg
        .StatusMsg = "The overall tread width of a single tire."
    End With
    
    With gc_Grooves
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 20
        .UOM = UOM_NORMAL
        .Msg = "Number of Grooves": .caption = .Msg
        .StatusMsg = "The number of grooves in a single tire."
    End With
    
    With gc_GrooveWidth
        .UnitNormal = "inches"
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 2
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .UOM = UOM_NORMAL
        .Msg = "Each Groove Width": .caption = .Msg
        .StatusMsg = "The width of each individual groove."
    End With
    
    'Reference Area Worksheet variables
    With gc_MaxWidth
        .UnitNormal = "inches"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 18: .MaxVal_Normal = 102
        .UOM = UOM_NORMAL
        .Msg = "Maximum Width": .caption = .Msg
        .StatusMsg = "The maximum width of the vehicle body."
    End With
    
    With gc_MaxHeight
        .UnitNormal = "inches"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 24: .MaxVal_Normal = 150
        .UOM = UOM_NORMAL
        .Msg = "Maximum Height": .caption = .Msg
        .StatusMsg = "The maximum height to the top of the vehicle."
    End With
    
    With gc_ShapeFactor
        .UnitNormal = "%"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 50: .MaxVal_Normal = 120
        .UOM = UOM_NORMAL
        .Msg = "Shape Factor": .caption = .Msg
        .StatusMsg = "The estimated shape factor for this body.  Press the Help button for Shape Factor examples."
   End With
   
   'Motorcycle Final Drive Worksheet variables
    With gc_Primary
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 9
        .UOM = UOM_NORMAL
        .Msg = "Primary Drive Speed Reduction": .caption = .Msg
        .StatusMsg = "The primary drive speed reduction between the engine and transmission."
    End With
    
    With gc_Countershaft
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 100
        .UOM = UOM_NORMAL
        .Msg = "Countershaft Sprocket Teeth": .caption = .Msg
        .StatusMsg = "The number of teeth on the transmission countershaft sprocket."
    End With
    
    With gc_RearWheel
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 100
        .UOM = UOM_NORMAL
        .Msg = "Rear Wheel Sprocket Teeth": .caption = .Msg
        .StatusMsg = "The number of teeth on the rear wheel sprocket."
    End With
    
   'Engine PMI Worksheet varialbes
    With gc_CrankWt
        .UnitNormal = "lbs"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 200
        .UOM = UOM_NORMAL
        .Msg = "Crankshaft Weight": .caption = .Msg
        .StatusMsg = "The measured bare crankshaft weight."
    End With
    
    With gc_CrankStroke
        .UnitNormal = "inches"
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 9
        .UOM = UOM_NORMAL
        .Msg = "Crankshaft Stroke": .caption = .Msg
        .StatusMsg = "The measured crankshaft stroke."
    End With
    
    With gc_FlywheelWt
        .UnitNormal = "lbs"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 200
        .UOM = UOM_NORMAL
    End With
    
    With gc_FlywheelDia
        .UnitNormal = "inches"
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 50
        .UOM = UOM_NORMAL
   End With
   
   'Transmission PMI Worksheet variables
    With gc_WSTransType
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 3
        .UOM = UOM_NORMAL
        .HasList = True
        .List(1) = "Production Automatic"
        .List(2) = "Manual Gears, Shafts"
        .List(3) = "Planetary Style     "
        .Msg = "Transmission Type:":    .caption = .Msg
        .StatusMsg = "The transmission type as selected from the drop down list."
    End With
    
    With gc_TransWt
        .UnitNormal = "lbs"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 500
        .UOM = UOM_NORMAL
        .Msg = "Transmission Weight": .caption = .Msg
        .StatusMsg = "The measured transmission weight."
    End With
    
    With gc_CaseDia
        .UnitNormal = "inches"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 50
        .UOM = UOM_NORMAL
        .Msg = "Case Diameter": .caption = .Msg
        .StatusMsg = "The measured transmission outer case diameter."
    End With
    
   'Tire PMI Worksheet variables
    With gc_TireWt
        .UnitNormal = "lbs"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 500
        .UOM = UOM_NORMAL
        .Msg = "Tire Weight": .caption = .Msg
        .StatusMsg = "The measured weight of a single tire."
    End With
    
    With gc_WSTireDia
        .AllowAlternate = True
        .UnitNormal = "inches":     .UnitAlternate = .UnitNormal
        .AllowDecimals = True
        .DecimalPlaces_Normal = 1:  .DecimalPlaces_Alternate = 1
        .HasMinMax = True
        .MinVal_Normal = 1:         .MinVal_Alternate = 61
        .MaxVal_Normal = 60:        .MaxVal_Alternate = 500
        .Msg_Normal = "Tire Diameter":  .Msg_Alternate = "Tire Rollout"
        .UOM = UOM_NORMAL
        .StatusMsg = "The measured tire diameter or rollout (circumference)."
    End With
    
    With gc_WheelWt
        .UnitNormal = "lbs"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 100
        .UOM = UOM_NORMAL
        .Msg = "Wheel Weight": .caption = .Msg
        .StatusMsg = "The measured weight of a single wheel."
    End With
    
    With gc_WheelDia
        .UnitNormal = "inches"
        .AllowDecimals = True:  .DecimalPlaces_Normal = 1
        .HasMinMax = True:      .MinVal_Normal = 1: .MaxVal_Normal = 48
        .UOM = UOM_NORMAL
        .Msg = "Wheel Diameter": .caption = .Msg
        .StatusMsg = "The measured wheel diameter."
    End With
   
   'CG variables (these were needed for Buell version)
    With gc_StaticFWt
        .UnitNormal = "lbs"
        .HasMinMax = True:      .MinVal_Normal = 200:   .MaxVal_Normal = 1500
        .UOM = UOM_NORMAL
        .Msg = "Front Weight":  .caption = .Msg
        .StatusMsg = "The measured static front weight."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(38)
        #End If
    End With

    With gc_YCG
        .UnitNormal = "inches"
        .AllowDecimals = True:  .DecimalPlaces = 1
        .HasMinMax = True:      .MinVal_Normal = 12:    .MaxVal_Normal = 36
        .UOM = UOM_NORMAL
        .Msg = "Vertical CG":   .caption = .Msg
        .StatusMsg = "The vertical CG height above the ground."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(39)
        #End If
    End With
    
    With gc_XCG
        .UnitNormal = "inches"
        .AllowDecimals = True:  .DecimalPlaces = 1
        .HasMinMax = True:      .MinVal_Normal = 12:    .MaxVal_Normal = 120
        .UOM = UOM_NORMAL
        .Msg = "Horizontal CG": .caption = .Msg
        .StatusMsg = "The horizontal CG location ahead of the rear axle centerline."
        #If ISQUARTERPRO Then
            .Labelctl = frmQuarter.Label1(40)
        #End If
    End With
End Sub

Public Sub SetTransTypeStrings()
    If gc_TransType.Value Then
        With gc_SlipStallRPM
            .Msg_Normal = "Stall RPM"
            .Msg_Alternate = "Stall Index"
            If .UOM = UOM_NORMAL Then
                .Unit = "Stall RPM"
                .StatusMsg = "The Stall or Flash RPM of the torque converter - not the staging or launch RPM."
            Else
                .Unit = "Stall Index"
                .StatusMsg = "An advanced feature used to specify the stall capacity of a given torque converter design."
            End If
        End With
        
        With gc_Slippage
            .Msg = "Converter Slippage":    .Unit = .Msg
            .StatusMsg = "The minimum torque converter slippage in high gear."
        End With
        
        gc_LockUp.StatusMsg = "Uncheck = always use Stall RPM as minimum engine RPM.  Check = lock-up converter after 1st gear."
        
        'gc_EnginePMIBtn.StatusMsg = "Press this button to display the Engine + Flexplate + Converter PMI Worksheet."
        With gc_EnginePMI
            .Msg = "Engine + Flexplate + Converter PMI"
            .Unit = "Engine+Flexplate+Converter"
            .StatusMsg = "The total Polar Moment of Inertia of the rotating engine, flexplate and converter assembly."
        End With
        
        With gc_FlywheelWt
            .Msg = "Flexplate + Converter Weight":  .caption = .Msg
            .StatusMsg = "The combined weight of the flexplate and torque converter."
        End With
        
        With gc_FlywheelDia
            .Msg = "Converter Diameter":    .caption = .Msg
            .StatusMsg = "The diameter of the torque converter, as stated by the torque manufacturer."
        End With
    Else
        With gc_SlipStallRPM
            .Msg_Normal = "Slip RPM"
            .Msg_Alternate = "Slip Index"
            If .UOM = UOM_NORMAL Then
                .Unit = "Slip RPM"
                .StatusMsg = "The engine RPM as the vehicle leaves the starting line - not the staging or launch RPM."
            Else
                .Unit = "Slip Index"
                .StatusMsg = "An advanced feature used to specify the slip capacity of a given clutch system design."
            End If
        End With
        
        With gc_Slippage
            .Msg = "Clutch Slippage":   .Unit = .Msg
            .StatusMsg = "The minimum clutch slippage in high gear."
        End With
        
        gc_LockUp.StatusMsg = "Uncheck = use Slip RPM as minimum engine RPM during shifts.  Check = lock-up clutch during shifts."
        
        'gc_EnginePMIBtn.StatusMsg = "Press this button to display the Engine + Flywheel + Clutch PMI Worksheet."
        With gc_EnginePMI
            .Msg = "Engine + Flywheel + Clutch PMI"
            .Unit = "Engine + Flywheel + Clutch"
            .StatusMsg = "The total Polar Moment of Inertia of the rotating engine, flywheel and clutch assembly."
        End With
        
        With gc_FlywheelWt
            .Msg = "Flywheel + Clutch Weight":  .caption = .Msg
            .StatusMsg = "The combined weight of the flywheel, pressure plate, clutch disks, etc."
        End With
        
        With gc_FlywheelDia
            .Msg = "Flywheel Diameter": .caption = .Msg
            .StatusMsg = "The outer diameter of the flywheel ring gear."
        End With
    End If
End Sub

Public Sub SetTireDiaStrings()
    With gc_TireDia
        If .UOM = UOM_NORMAL Then
            .caption = "Tire Diameter"
            .Unit = "inches"
        Else
            .caption = "Tire Rollout"
            .Unit = "inches"
        End If
    End With
End Sub

Public Sub SetWSTireDiaStrings()
    With gc_WSTireDia
        If .UOM = UOM_NORMAL Then
            .caption = "Tire Diameter"
            .Unit = "inches"
        Else
            .caption = "Tire Rollout"
            .Unit = "inches"
        End If
    End With
End Sub

Public Sub Weather(rho As Single, hpc As Single)
Const TSTD = 519.67
Const PSTD = 14.696
Const BSTD = 29.92
Const WTAIR = 28.9669
Const WTH20 = 18.016
Const RSTD = 1545.32
    
Dim psdry As Double
Dim PWV As Single
Dim ifuel As Integer, icarb As Integer
Dim pamb As Single
Dim pair As Single
Dim delta As Single
Dim WAR As Single
Dim theta As Single
Dim RGAS As Single
Dim rgrs As Single
Dim mech As Single
Dim kwar As Single
Dim px As Single, dtx As Single, tx As Single
    
Static IsLoaded As Boolean
Static cps(1 To 6) As Double
    
    If Not IsLoaded Then
        IsLoaded = True
        cps(1) = 0.0205558:             cps(2) = 0.00118163
        cps(3) = 0.0000154988:          cps(4) = 0.00000040245
        cps(5) = 0.000000000434856:     cps(6) = 0.00000000002096
    End If
    
   'partial pressure of dry air from relative humidity
    psdry = cps(1) + cps(2) * gc_Temperature.Value + cps(3) * gc_Temperature.Value ^ 2 + cps(4) * gc_Temperature.Value ^ 3 + cps(5) * gc_Temperature.Value ^ 4 + cps(6) * gc_Temperature.Value ^ 5
    
    PWV = (gc_Humidity.Value / 100) * psdry
    pamb = (PSTD * gc_Barometer.Value / BSTD) * ((TSTD - 0.00356616 * gc_Elevation.Value) / TSTD) ^ 5.25588
    pair = pamb - PWV
    delta = pair / PSTD
    WAR = (PWV * WTH20) / (pair * WTAIR)
    
   'ambient air theta and density
    theta = (gc_Temperature.Value + 459.67) / TSTD
    RGAS = RSTD * ((1 / WTAIR) + (WAR / WTH20)) / (1 + WAR)
    rgrs = RGAS / (RSTD / WTAIR)
    rho = 144 * pamb / (RGAS * (gc_Temperature.Value + 459.67))
    
   'set ifuel and icarb values
   'ifuel:  1 = gas     2 = methanol    3 = nitro
   'icarb:  1 = carb    2 = injector    3 = supercharger
    
    Select Case gc_FuelSystem.Value
        Case 1:     ifuel = 1:     icarb = 1
        Case 2:     ifuel = 1:     icarb = 2
        Case 3:     ifuel = 2:     icarb = 1
        Case 4:     ifuel = 2:     icarb = 2
        Case 5:     ifuel = 3:     icarb = 2
        Case 6:     ifuel = 1:     icarb = 3
        Case 7, 9:  ifuel = 2:     icarb = 3
        Case 8:     ifuel = 3:     icarb = 3
    End Select
    
   'eliminate loss in thermal efficiency due to war
   'from taylor, vol 1, page 431, fr=1.0 data
    kwar = 1 + 2.48 * WAR ^ 1.5
    
    Select Case ifuel
        Case 1:     px = 1:        tx = 0.6:     mech = 0.15
        Case 2:     px = 1:        tx = 0.3:     mech = 0.13
        Case 3:     px = 0.85:     tx = 0.5:     mech = 0.055
    End Select
    
    If icarb = 2 Then mech = mech - 0.005
    
    If icarb = 3 Then
        px = 0.95
        dtx = (1.35 - 1) / 1.35
        dtx = dtx / 0.85
        px = px - dtx * tx
        tx = tx + dtx
        mech = 0.6 * mech
    End If
    
    hpc = delta ^ px / (Sqr(rgrs) * theta ^ tx)
    hpc = (1 + mech) * kwar / hpc - mech
    
    If gc_FuelSystem.Value = 9 Then hpc = 1
End Sub
