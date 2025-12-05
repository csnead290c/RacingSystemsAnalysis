Attribute VB_Name = "modQmain"
Option Explicit
Option Compare Text

Public Sub Main()
    frmSplash.Show
    DoEvents
    LoadArmData
    SetAllClasses
    
    Load frmClutch
    Unload frmSplash
    frmClutch.Show
End Sub

Public Sub SetAllClasses()
Dim i As Integer
Dim amax As Single
   
    #If Not ISCLUTCHJR Then
        'General
         With gc_Barometer
             .AllowAlternate = True
             .AllowNegative = True
             .AllowDecimals = True
             .DecimalPlaces_Normal = 2:  .DecimalPlaces_Alternate = 0
             .HasMinMax = True
             .MinVal_Normal = 24:        .MinVal_Alternate = -1000
             .MaxVal_Normal = 31:        .MaxVal_Alternate = 10000
             .UnitNormal = "in Hg":      .UnitAlternate = "feet"
             .Msg_Normal = "Barometer":  .Msg_Alternate = "Altimeter"
             .UOM = UOM_NORMAL
             .StatusMsg = "Either the barometeric pressure in inches of Mercury or the altimeter reading in feet."
             .Labelctl = frmClutch.Label1(3)
         End With
         
         With gc_Temperature
             .UnitNormal = "deg F"
             .HasMinMax = True: .MinVal_Normal = 40: .MaxVal_Normal = 120
             .UOM = UOM_NORMAL
             .Msg = "Temperature": .caption = .Msg
             .StatusMsg = "The ambient temperature in degrees F."
             .Labelctl = frmClutch.Label1(2)
         End With
        
         With gc_Humidity
             .UnitNormal = "%"
             .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 100
             .UOM = UOM_NORMAL
             .Msg = "Relative Humidity": .caption = .Msg
             .StatusMsg = "The ambient relative humidity in percent."
             .Labelctl = frmClutch.Label1(4)
         End With
        
         With gc_LowGear
             .AllowDecimals = True: .DecimalPlaces_Normal = 2
             .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 5
             .UOM = UOM_NORMAL
             .Msg = "Low Gear Ratio": .caption = .Msg
             .StatusMsg = "The low (or 1st) gear ratio of the transmission."
             .Labelctl = frmClutch.Label1(1)
         End With
        
         With gc_GearRatio
             .AllowDecimals = True:  .DecimalPlaces_Normal = 2
             .HasMinMax = True:  .MinVal_Normal = 2: .MaxVal_Normal = 9
             .UOM = UOM_NORMAL
             .Msg = "Rear Gear Ratio": .caption = .Msg
             .StatusMsg = "The gear ratio of the final drive."
             .Labelctl = frmClutch.Label1(19)
         End With
        
         With gc_TireDia
             .AllowAlternate = True
             .AllowDecimals = True
             .DecimalPlaces_Normal = 1:      .DecimalPlaces_Alternate = 1
             .HasMinMax = True
             .MinVal_Normal = 15:            .MinVal_Alternate = 61
             .MaxVal_Normal = 60:            .MaxVal_Alternate = 150
             .UnitNormal = "inches":         .UnitAlternate = .UnitNormal
             .Msg_Normal = "Tire Diameter":  .Msg_Alternate = "Tire Rollout"
             .UOM = UOM_NORMAL
             .StatusMsg = "Either the measured tire diameter or tire rollout (circumference) in inches."
             .Labelctl = frmClutch.Label1(20)
         End With
        
         'Racetrack
         With gc_T60
             .AllowDecimals = True: .DecimalPlaces_Normal = 2
             .HasMinMax = True: .MinVal_Normal = 0.9: .MaxVal_Normal = 1.8
             .UOM = UOM_NORMAL
             .Msg = "60 ft Time": .caption = .Msg
             .StatusMsg = "The estimated 60 ft Time in seconds.  Clutch Pro will automatically calculate the corresponding maximum acceleration in g's."
             .Labelctl = frmClutch.Label1(14)
         End With
        
         With gc_Amax
             .AllowDecimals = True: .DecimalPlaces_Normal = 2
             .HasMinMax = True
             GSTOT60 0, amax, gc_T60.MaxVal_Normal
             .MinVal_Normal = RoundDown(amax, 0.01)
             GSTOT60 0, amax, gc_T60.MinVal_Normal
             .MaxVal_Normal = RoundUp(amax, 0.01)
             .UOM = UOM_NORMAL
             .Msg = "Maximum Acceleration": .caption = .Msg
             .StatusMsg = "The estimated maximum acceleration in g's.  Clutch Pro will automatically calculate the corresponding 60 ft time if this value is input."
             .Labelctl = frmClutch.Label1(15)
         End With
        
         With gc_TractionIndex
             .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 12
             .UOM = UOM_NORMAL
             .Msg = "Traction Index": .caption = .Msg
             .StatusMsg = "The Traction Index for the racing surface.  Press the Help button for Traction Index examples."
             .Labelctl = frmClutch.Label1(22)
         End With
        
        'Polar Moments of Inertia
         With gc_EnginePMI
             .AllowDecimals = True: .DecimalPlaces_Normal = 2
             .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 10
             .UOM = UOM_NORMAL
             .Msg = "Engine + Flywheel + Clutch PMI": .caption = .Msg
             .StatusMsg = "The total polar moment of inertia of the engine, flywheel and clutch rotating assembly (in-lbs sec*sec)."
             .Labelctl = frmClutch.Label1(33)
         End With
        
         With gc_TransPMI
             .AllowDecimals = True: .DecimalPlaces_Normal = 3
             .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 4
             .UOM = UOM_NORMAL
             .Msg = "Transmission + Driveshaft + Pinion Gear PMI": .caption = .Msg
             .StatusMsg = "The total polar moment of inertia of the transmission shafts and gears, driveshaft and pinion gear (in-lbs sec*sec)."
             .Labelctl = frmClutch.Label1(32)
         End With
        
         With gc_TiresPMI
             .AllowDecimals = True: .DecimalPlaces_Normal = 1
             .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 100
             .UOM = UOM_NORMAL
             .Msg = "Tires + Wheels + Brakes + Axles + Ring Gear PMI": .caption = .Msg
             .StatusMsg = "The total polar moment of inertia of the tire, wheel, brake rotor, axle, spool and ring gear rotating assembly (in-lbs sec*sec)."
             .Labelctl = frmClutch.Label1(31)
         End With
            
         'Engine
         With gc_FuelSystem
             .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 8
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
             .Msg = "Fuel System:": .caption = .Msg
             .StatusMsg = "The engine fuel system type as selected from the drop down list."
             .Labelctl = frmClutch.Label1(28)
         End With
        
         With gc_HPTQMult
             .AllowDecimals = True: .DecimalPlaces_Normal = 3
             .HasMinMax = True: .MinVal_Normal = 0.2: .MaxVal_Normal = 5
             .UOM = UOM_NORMAL
             .Msg = "HP/Torque Multiplier": .caption = .Msg
             .StatusMsg = "The HP/Torque Multiplier may be used to quickly modify all the Engine HP and Torque values."
             .Labelctl = frmClutch.Label1(29)
         End With
    #End If
   
   
    'CLUTCH Pro and CLUTCHjr - Clutch Arms (1 & 2)
    With gc_Mfg1
        .HasList = True:            .HasMinMax = True
        .MinVal_Normal = 0:         .MaxVal_Normal = NARMD
        .UOM = UOM_NORMAL
        .Msg = "Clutch Mfg.Style":  .caption = .Msg
        .StatusMsg = "The clutch manufacturer and style code for the first group of arms used in the clutch.  Press the Help button to display all the choices."
        .Labelctl = frmClutch.Label1(27)
        For i = 0 To NARMD: .List(i) = AName(i):    Next
    End With
        
    With gc_Mfg2
        .HasList = True:            .HasMinMax = True
        .MinVal_Normal = 0:         .MaxVal_Normal = NARMD
        .UOM = UOM_NORMAL
        .Msg = "Clutch Mfg.Style":  .caption = .Msg
        .StatusMsg = "The clutch manufacturer and style code for the second group of arms used in the clutch.  Press the Help button to display all the choices."
        .Labelctl = frmClutch.Label1(27)
        For i = 0 To NARMD: .List(i) = AName(i):    Next
    End With
        
    With gc_NArm1
        .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 12
        .UOM = UOM_NORMAL
        .Msg = "Number of arms": .caption = .Msg
        .StatusMsg = "The number of arms of this Mfg.Style used in the clutch."
        .Labelctl = frmClutch.Label1(30)
    End With
    
    With gc_NArm2
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 12
        .UOM = UOM_NORMAL
        .Msg = "Number of arms": .caption = .Msg
        .StatusMsg = "The number of arms of this Mfg.Style used in the clutch."
        .Labelctl = frmClutch.Label1(30)
    End With
    
    With gc_TCWt1
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 360
        .UOM = UOM_NORMAL
        .Msg = "Total Counter Weight": .caption = .Msg
        .StatusMsg = "The total amount of counterweight (grams) attached to all the arms of this Mfg.Style."
        .Labelctl = frmClutch.Label1(34)
    End With
    
    With gc_TCWt2
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 360
        .UOM = UOM_NORMAL
        .Msg = "Total Counter Weight": .caption = .Msg
        .StatusMsg = "The total amount of counterweight (grams) attached to all the arms of this Mfg.Style."
        .Labelctl = frmClutch.Label1(34)
    End With
    
    With gc_CWt1
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 60
        .UOM = UOM_NORMAL
        .Msg = "Counter Weight per Arm": .caption = .Msg
        .StatusMsg = "The amount of counterweight (grams) attached to each arm of this Mfg.Style."
        .Labelctl = frmClutch.Label1(36)
    End With
    
    With gc_CWt2
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 60
        .UOM = UOM_NORMAL
        .Msg = "Counter Weight per Arm": .caption = .Msg
        .StatusMsg = "The amount of counterweight (grams) attached to each arm of this Mfg.Style."
        .Labelctl = frmClutch.Label1(36)
    End With
    
    With gc_RingHt1
        .AllowAlternate = True
        .AllowDecimals = True
        .DecimalPlaces_Normal = 3:      .DecimalPlaces_Alternate = 3
        .HasMinMax = True
        .MinVal_Normal = 0:             .MinVal_Alternate = 0
        .MaxVal_Normal = 2:             .MaxVal_Alternate = 0.1
        .UnitNormal = "inches":         .UnitAlternate = "inches"
        .Msg_Normal = "Ring Height":    .Msg_Alternate = "Pack Clearance"
        .UOM = UOM_NORMAL
        .Labelctl = frmClutch.Label1(37)
    End With
    
    With gc_RingHt2
        .AllowAlternate = True
        .AllowDecimals = True
        .DecimalPlaces_Normal = 3:      .DecimalPlaces_Alternate = 3
        .HasMinMax = True
        .MinVal_Normal = 0:             .MinVal_Alternate = 0
        .MaxVal_Normal = 2:             .MaxVal_Alternate = 0.1
        .UnitNormal = "inches":         .UnitAlternate = "inches"
        .Msg_Normal = "Ring Height":    .Msg_Alternate = "Pack Clearance"
        .UOM = UOM_NORMAL
        .Labelctl = frmClutch.Label1(37)
    End With
    
    With gc_ArmDepth1
        .AllowAlternate = True
        .AllowDecimals = True
        .DecimalPlaces_Normal = 3:  .DecimalPlaces_Alternate = 1
        .HasMinMax = True
        .MinVal_Normal = 0.2:       .MinVal_Alternate = 0
        .MaxVal_Normal = 1.2:       .MaxVal_Alternate = 80
        .UnitNormal = "inches":     .UnitAlternate = "lbs"
        .Msg_Normal = "Arm Depth":  .Msg_Alternate = "Return Spring"
        .UOM = UOM_NORMAL
        .Labelctl = frmClutch.Label1(38)
    End With
    
    With gc_ArmDepth2
        .AllowAlternate = True
        .AllowDecimals = True
        .DecimalPlaces_Normal = 3:  .DecimalPlaces_Alternate = 1
        .HasMinMax = True
        .MinVal_Normal = 0.2:       .MinVal_Alternate = 0
        .MaxVal_Normal = 1.2:       .MaxVal_Alternate = 80
        .UnitNormal = "inches":     .UnitAlternate = "lbs"
        .Msg_Normal = "Arm Depth":  .Msg_Alternate = "Return Spring"
        .UOM = UOM_NORMAL
        .Labelctl = frmClutch.Label1(38)
    End With
    
    
    'Clutch Spring and Disk
    #If ISCLUTCHJR Then
        With gc_Static
            .AllowNegative = True
            .HasMinMax = True:  .MinVal_Normal = -2000:   .MaxVal_Normal = 4000
            .UOM = UOM_NORMAL
            .Msg = "Static Plate Force": .caption = .Msg
            .StatusMsg = "The static (or base) plate force.  Use the input data below to determine this value."
            .Labelctl = frmClutch.Label1(26)
        End With
    #Else   'CLUTCH Pro
        With gc_Static
            .AllowNegative = True
            .HasMinMax = True:  .MinVal_Normal = -2000:   .MaxVal_Normal = 4000
            .UOM = UOM_NORMAL
            .Msg = "Static Plate Force": .caption = .Msg
            .StatusMsg = "The static (or base) plate force.  Use the Static Plate Force Worksheet to determine this value."
            .Labelctl = frmClutch.Label1(26)
        End With
        
        With gc_NDisk
            .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 12
            .UOM = UOM_NORMAL
            .Msg = "Number of disks": .caption = .Msg
            .StatusMsg = "The total number of clutch disks."
            .Labelctl = frmClutch.Label1(24)
        End With
                
        With gc_DiskWt
            .AllowDecimals = True: .DecimalPlaces_Normal = 1
            .HasMinMax = True
            .UOM = UOM_NORMAL
            .Msg = "Total Disk Weight": .caption = .Msg
            .StatusMsg = "The total, combined weight of all the clutch disks, measured in lbs."
            .Labelctl = frmClutch.Label1(23)
        End With
        
        With gc_DiskOD
            .AllowDecimals = True: .DecimalPlaces_Normal = 2
            .HasMinMax = True
            .UOM = UOM_NORMAL
            .Msg = "Disk Outer Diameter": .caption = .Msg
            .StatusMsg = "The outer diameter of the clutch disk friction surface, measured in inches."
            .Labelctl = frmClutch.Label1(21)
        End With
        
        With gc_DiskID
            .AllowDecimals = True: .DecimalPlaces_Normal = 2
            .HasMinMax = True
            .UOM = UOM_NORMAL
            .Msg = "Disk Inner Diameter": .caption = .Msg
            .StatusMsg = "The inner diameter of the clutch disk friction surface, measured in inches."
            .Labelctl = frmClutch.Label1(18)
        End With
        
        With gc_ClArea
            .AllowDecimals = True: .DecimalPlaces_Normal = 1
            .HasMinMax = True: .MinVal_Normal = 80: .MaxVal_Normal = 100
            .UOM = UOM_NORMAL
            .Msg = "Effective Surface Area": .caption = .Msg
            .StatusMsg = "The clutch friction surface area may be reduced significantly by slots and/or holes in the clutch disks, floaters, flywheel and pressure plate."
            .Labelctl = frmClutch.Label1(16)
        End With
         
        With gc_CMU
            .AllowDecimals = True: .DecimalPlaces_Normal = 3
            .HasMinMax = True:  .MinVal_Normal = 0.15:  .MaxVal_Normal = 0.75
            .UOM = UOM_NORMAL
            .Msg = "Friction Coefficient": .caption = .Msg
            .StatusMsg = "The friction coefficient of the clutch disk materials.  Press the Help button for examples of typical Friction Coefficients."
            .Labelctl = frmClutch.Label1(25)
        End With
         
        'Launch Conditions
        With gc_LaunchRPM
            .AllowNegative = True
            .HasMinMax = True: .MinVal_Normal = -9800: .MaxVal_Normal = 9800
            .UOM = UOM_NORMAL
            .Msg = "Launch RPM": .caption = .Msg
            .StatusMsg = "The RPM to be used for the Clutch Forces @ Launch calculations for both the With Air Gap and Zero Air Gap settings."
            .Labelctl = frmClutch.Label1(13)
        End With
         
        With gc_AirGap
            .AllowDecimals = True: .DecimalPlaces_Normal = 3
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 0.1
            .UOM = UOM_NORMAL
            .Msg = "Air Gap": .caption = .Msg
            .StatusMsg = "The air gap used to calculate the Plate Force prior to clutch release.  Make sure that all the Static Plate Force Worksheet values are correct!"
            .Labelctl = frmClutch.Label1(0)
        End With
         
        'Motorcycle Final Drive Worksheet
        With gc_PDRatio
            .AllowDecimals = True: .DecimalPlaces_Normal = 2
            .HasMinMax = True: .MinVal_Normal = 1: .MaxVal_Normal = 3
            .UOM = UOM_NORMAL
            .Msg = "Primary Drive Ratio": .caption = .Msg
            .StatusMsg = "The primary drive speed reduction ratio between the engine and transmission."
        End With
         
        With gc_HighGear
            .AllowDecimals = True: .DecimalPlaces_Normal = 2
            .HasMinMax = True: .MinVal_Normal = 0.75:   .MaxVal_Normal = 1.25
            .UOM = UOM_NORMAL
            .Msg = "High Gear Ratio": .caption = .Msg
            .StatusMsg = "The high (or final) gear ratio of the transmission, normally 1.00."
        End With
         
        With gc_Countershaft
            .HasMinMax = True: .MinVal_Normal = 6: .MaxVal_Normal = 80
            .UOM = UOM_NORMAL
            .Msg = "Countershaft Sprocket Teeth": .caption = .Msg
            .StatusMsg = "The number of teeth on the transmission countershaft sprocket."
        End With
         
        With gc_RearWheel
            .HasMinMax = True: .MinVal_Normal = 6: .MaxVal_Normal = 80
            .UOM = UOM_NORMAL
            .Msg = "Rear Wheel Sprocket Teeth": .caption = .Msg
            .StatusMsg = "The number of teeth on the rear wheel sprocket."
        End With
         
        'Engine PMI Worksheet
        With gc_CrankWt
            .UnitNormal = "lbs"
            .AllowDecimals = True: .DecimalPlaces_Normal = 1
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 100
            .UOM = UOM_NORMAL
            .Msg = "Crankshaft Weight": .caption = .Msg
            .StatusMsg = "The measured bare crankshaft weight."
        End With
         
        With gc_CrankStroke
            .UnitNormal = "inches"
            .AllowDecimals = True: .DecimalPlaces_Normal = 3
            .HasMinMax = True: .MinVal_Normal = 2: .MaxVal_Normal = 6
            .UOM = UOM_NORMAL
            .Msg = "Crankshaft Stroke": .caption = .Msg
            .StatusMsg = "The measured crankshaft stroke."
        End With
         
        With gc_FlywheelWt
            .UnitNormal = "lbs"
            .AllowDecimals = True: .DecimalPlaces_Normal = 1
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 100
            .UOM = UOM_NORMAL
            .Msg = "Flywheel + Clutch Weight":  .caption = .Msg
            .StatusMsg = "The combined weight of the flywheel, pressure plate, clutch disks, etc."
        End With
         
        With gc_FlywheelDia
            .UnitNormal = "inches"
            .AllowDecimals = True: .DecimalPlaces_Normal = 2
            .HasMinMax = True: .MinVal_Normal = 4: .MaxVal_Normal = 15
            .UOM = UOM_NORMAL
            .Msg = "Flywheel Diameter": .caption = .Msg
            .StatusMsg = "The outer diameter of the flywheel ring gear."
        End With
        
        'Transmission PMI Worksheet
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
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 200
            .UOM = UOM_NORMAL
            .Msg = "Transmission Weight": .caption = .Msg
            .StatusMsg = "The measured transmission weight."
        End With
         
        With gc_CaseDia
            .UnitNormal = "inches"
            .AllowDecimals = True: .DecimalPlaces_Normal = 1
            .HasMinMax = True: .MinVal_Normal = 4: .MaxVal_Normal = 16
            .UOM = UOM_NORMAL
            .Msg = "Case Diameter": .caption = .Msg
            .StatusMsg = "The measured transmission outer case diameter."
        End With
         
        'Tire PMI Worksheet
        With gc_TireWt
            .UnitNormal = "lbs"
            .AllowDecimals = True: .DecimalPlaces_Normal = 1
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 80
            .UOM = UOM_NORMAL
            .Msg = "Tire Weight": .caption = .Msg
            .StatusMsg = "The measured weight of a single tire."
        End With
         
        With gc_WSTireDia
            .AllowAlternate = True
            .AllowDecimals = True
            .DecimalPlaces_Normal = 1:      .DecimalPlaces_Alternate = 1
            .HasMinMax = True
            .MinVal_Normal = 15:            .MinVal_Alternate = 61
            .MaxVal_Normal = 60:            .MaxVal_Alternate = 150
            .UnitNormal = "inches":         .UnitAlternate = .UnitNormal
            .Msg_Normal = "Tire Diameter":  .Msg_Alternate = "Tire Rollout"
            .UOM = UOM_NORMAL
            .StatusMsg = "The measured tire diameter or rollout (circumference)."
        End With
         
        With gc_WheelWt
            .UnitNormal = "lbs"
            .AllowDecimals = True: .DecimalPlaces_Normal = 1
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 40
            .UOM = UOM_NORMAL
            .Msg = "Wheel Weight": .caption = .Msg
            .StatusMsg = "The measured weight of a single wheel."
        End With
        
        With gc_WheelDia
            .UnitNormal = "inches"
            .AllowDecimals = True: .DecimalPlaces_Normal = 1
            .HasMinMax = True: .MinVal_Normal = 6: .MaxVal_Normal = 30
            .UOM = UOM_NORMAL
            .Msg = "Wheel Diameter": .caption = .Msg
            .StatusMsg = "The measured wheel diameter."
        End With
    #End If
    
    'CLUTCH Pro and CLUTCHjr - Static Plate Force Worksheet
    With gc_NSpring
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 12
        .UOM = UOM_NORMAL
        .Msg = "Number of Springs": .caption = .Msg
        .StatusMsg = "The number of springs in the pressure plate."
    End With
    
    With gc_SBasePr
        .UnitNormal = "lbs"
        .AllowDecimals = True: .DecimalPlaces_Normal = 1
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 900
        .UOM = UOM_NORMAL
        .Msg = "Spring Base Pressure": .caption = .Msg
        .StatusMsg = "The base pressure provided by a single spring."
    End With
    
    With gc_BasePr
        .UnitNormal = "lbs"
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 9000
        .UOM = UOM_NORMAL
        .Msg = "Spring Base Pressure": .caption = .Msg
        .StatusMsg = "The total base pressure provided by all the springs."
    End With
    
    With gc_SSRate
        .AllowAlternate = True
        .AllowNegative = True
        .AllowDecimals = True
        .DecimalPlaces_Normal = 1:      .DecimalPlaces_Alternate = 1
        .HasMinMax = True
        .MinVal_Normal = -100:          .MinVal_Alternate = -100
        .MaxVal_Normal = 900:           .MaxVal_Alternate = 900
        .UnitNormal = "lbs/turn":       .UnitAlternate = "lbs/inch"
        .Msg_Normal = "Spring Rate":    .Msg_Alternate = .Msg_Normal
        .UOM = UOM_NORMAL
        .StatusMsg = "The spring rate of each individual spring."
    End With
   
    With gc_SRate
        .AllowAlternate = True
        .AllowNegative = True
        .HasMinMax = True
        .MinVal_Normal = -1000:         .MinVal_Alternate = -1000
        .MaxVal_Normal = 9000:          .MaxVal_Alternate = 9000
        .UnitNormal = "lbs/turn":       .UnitAlternate = "lbs/inch"
        .Msg_Normal = "Spring Rate":    .Msg_Alternate = .Msg_Normal
        .UOM = UOM_NORMAL
        .StatusMsg = "The total spring rate for all the springs."
    End With
   
    With gc_Turns
        .AllowDecimals = True: .DecimalPlaces_Normal = 2
        .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 8
        .UOM = UOM_NORMAL
        .Msg = "Adjuster Turns": .caption = .Msg
        .StatusMsg = "The number of turns on each static spring adjuster."
    End With
   
    With gc_ThrdpI
        .AllowAlternate = True
        .AllowDecimals = True
        .DecimalPlaces_Normal = 1:  .DecimalPlaces_Alternate = 3
        .HasMinMax = True
        .MinVal_Normal = 8:         .MinVal_Alternate = 0
        .MaxVal_Normal = 40:        .MaxVal_Alternate = 0.5
        .UnitNormal = "Adjuster Threads per Inch"
        .UnitAlternate = "Shim Thickness - inches"
        .UOM = UOM_NORMAL
    End With
   
    With gc_dRnHt
        '.AllowAlternate = True     'old code before adding Crowerglide clutches
        '.AllowNegative = True
        '.AllowDecimals = True
        '.DecimalPlaces_Normal = 3:          .DecimalPlaces_Alternate = 3
        '.HasMinMax = True
        '.MinVal_Normal = 0:                 .MinVal_Alternate = 0
        '.MaxVal_Normal = 0.1:               .MaxVal_Alternate = 0.1
        '.UnitNormal = "inches":             .UnitAlternate = "inches"
        '.Msg_Normal = "Delta Ring Height":  .Msg_Alternate = "Pack Clearance"
        '.UOM = UOM_NORMAL
        
        .UnitNormal = "inches"
        .AllowNegative = True
        .AllowDecimals = True: .DecimalPlaces_Normal = 3
        .HasMinMax = True
        .UOM = UOM_NORMAL
        .Msg = "Delta Ring Height": .caption = .Msg
        .StatusMsg = "The change in ring height from the reference base pressure setting."
    End With
   
    #If Not ISCLUTCHJR Then
        'Effective Friction Area Worksheet
        With gc_NSlot
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 9
            .UOM = UOM_NORMAL
            .Msg = "Number of Slots": .caption = .Msg
            .StatusMsg = "The number of slots."
        End With
         
        With gc_SlotWD
            .UnitNormal = "inches"
            .AllowDecimals = True: .DecimalPlaces_Normal = 3
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 0.5
            .UOM = UOM_NORMAL
            .Msg = "Slot Width": .caption = .Msg
            .StatusMsg = "The measured slot width."
        End With
         
        With gc_NHole
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 900
            .UOM = UOM_NORMAL
            .Msg = "Number of Holes": .caption = .Msg
            .StatusMsg = "The number of holes."
        End With
         
        With gc_HoleDia
            .UnitNormal = "inches"
            .AllowDecimals = True: .DecimalPlaces_Normal = 3
            .HasMinMax = True: .MinVal_Normal = 0: .MaxVal_Normal = 0.5
            .UOM = UOM_NORMAL
            .Msg = "Hole Diameter": .caption = .Msg
            .StatusMsg = "The measured hole diameter."
        End With
    #End If

    'CLUTCH Pro and CLUTCHjr - Custom Clutch Arm worksheet
    With gc_ADATA1
        .UnitNormal = "grams"
        .AllowDecimals = True:  .DecimalPlaces_Normal = 1
        .HasMinMax = True:      .MinVal_Normal = 1: .MaxVal_Normal = 99
        .UOM = UOM_NORMAL
        .Msg = "arm mass":      .caption = .Msg
        .StatusMsg = "The measured weight of the custom arm."
    End With
    
    With gc_ADATA2
        .UnitNormal = "inches"
        .AllowDecimals = True:  .DecimalPlaces_Normal = 3
        .HasMinMax = True:      .MinVal_Normal = 4: .MaxVal_Normal = 9.9
        .UOM = UOM_NORMAL
        .Msg = "plate":         .caption = .Msg
        .StatusMsg = "The fixed diameter at which the plate pins are located."
    End With
    
    With gc_ADATA6
        .UnitNormal = "inches"
        .AllowDecimals = True:  .DecimalPlaces_Normal = 3
        .HasMinMax = True:      .MinVal_Normal = 0: .MaxVal_Normal = 2
        .UOM = UOM_NORMAL
        .Msg = "reference ring height":     .caption = .Msg
        .StatusMsg = "The reference ring height for the custom clutch."
    End With
    
    With gc_PVTDR
        .UnitNormal = "inches"
        .AllowNegative = True
        .AllowDecimals = True:  .DecimalPlaces_Normal = 3
        .HasMinMax = True:      .MinVal_Normal = -0.999:    .MaxVal_Normal = 1.5
        .UOM = UOM_NORMAL
        .Msg = "pivot":         .caption = .Msg
        .StatusMsg = "The dR distance between the plate and pivot pin locations."
    End With
    
    With gc_PVTDZ
        .UnitNormal = "inches"
        .AllowNegative = True
        .AllowDecimals = True:  .DecimalPlaces_Normal = 3
        .HasMinMax = True:      .MinVal_Normal = -0.5:  .MaxVal_Normal = 1.9
        .UOM = UOM_NORMAL
        .Msg = "pivot":         .caption = .Msg
        .StatusMsg = "The dZ distance between the plate and pivot pin locations."
    End With
    
    With gc_CWTDR
        .UnitNormal = "inches"
        .AllowNegative = True
        .AllowDecimals = True:  .DecimalPlaces_Normal = 3
        .HasMinMax = True:      .MinVal_Normal = -0.999:    .MaxVal_Normal = 1.5
        .UOM = UOM_NORMAL
        .Msg = "counterweight": .caption = .Msg
        .StatusMsg = "The dR distance between the plate and counterweight locations."
    End With
    
    With gc_CWTDZ
        .UnitNormal = "inches"
        .AllowNegative = True
        .AllowDecimals = True:  .DecimalPlaces_Normal = 3
        .HasMinMax = True:      .MinVal_Normal = -0.5:  .MaxVal_Normal = 1.9
        .UOM = UOM_NORMAL
        .Msg = "counterweight": .caption = .Msg
        .StatusMsg = "The dZ distance between the plate and counterweight locations."
    End With
    
    With gc_CGDR
        .UnitNormal = "inches"
        .AllowNegative = True
        .AllowDecimals = True:  .DecimalPlaces_Normal = 3
        .HasMinMax = True:      .MinVal_Normal = -0.999:    .MaxVal_Normal = 1.5
        .UOM = UOM_NORMAL
        .Msg = "cg":            .caption = .Msg
        .StatusMsg = "The dR distance between the plate and cg locations."
    End With
    
    With gc_CGDZ
        .UnitNormal = "inches"
        .AllowNegative = True
        .AllowDecimals = True:  .DecimalPlaces_Normal = 3
        .HasMinMax = True:      .MinVal_Normal = -0.5:  .MaxVal_Normal = 1.9
        .UOM = UOM_NORMAL
        .Msg = "cg":            .caption = .Msg
        .StatusMsg = "The dZ distance between the plate and cg locations."
    End With

    With gc_SeekLoRPM
        .UnitNormal = "RPM"
        .HasMinMax = True:      .MinVal_Normal = 1:     .MaxVal_Normal = 18000
        .UOM = UOM_NORMAL
        .Msg = "Low Gear Lockup RPM"
    End With
    
    With gc_SeekHiRPM
        .UnitNormal = "RPM"
        .HasMinMax = True:      .MinVal_Normal = 1:     .MaxVal_Normal = 18000
        .UOM = UOM_NORMAL
        .Msg = "High Gear Lockup RPM"
    End With


    #If ISCLUTCHJR Then
        'RPM values for Details Calculations
        With gc_dRPM1
            .HasMinMax = True: .MinVal_Normal = 2000: .MaxVal_Normal = 11000
            .UOM = UOM_NORMAL
            .Msg = "Launch RPM": .caption = .Msg
            .StatusMsg = "The launch RPM to be used for the Change in Plate Force calculations."
            .Labelctl = frmClutch.Label1(5)
        End With
        
        With gc_dRPM2
            .HasMinMax = True: .MinVal_Normal = 2000: .MaxVal_Normal = 11000
            .UOM = UOM_NORMAL
            .Msg = "Lockup RPM": .caption = .Msg
            .StatusMsg = "The lockup RPM to be used for the Change in Plate Force calculations."
            .Labelctl = frmClutch.Label1(5)
        End With
        
        With gc_dRPM3
            .HasMinMax = True: .MinVal_Normal = 2000: .MaxVal_Normal = 11000
            .UOM = UOM_NORMAL
            .Msg = "Maximum RPM": .caption = .Msg
            .StatusMsg = "The maximum RPM to be used for all CLUTCHjr calculations."
            .Labelctl = frmClutch.Label1(5)
        End With
    #End If
End Sub

Public Sub SetRingHt()
Dim refrht As Single, drht As Single
    refrht = AData(gc_Mfg1.Value, 6)
    With gc_RingHt1
        drht = 0.45 * AData(gc_Mfg1.Value, 3)
        
        If drht < 0.05 Then drht = 0.05
        If drht > 0.28 Then drht = 0.28
        If drht > 0.65 * refrht Then drht = 0.65 * refrht
        
        .MinVal_Normal = RoundDown(refrht - drht, 0.01)
        If .MinVal_Normal < 0 Then .MinVal_Normal = 0
        
        .MaxVal_Normal = RoundUp(refrht + drht, 0.01)
    End With
    SetMinMax gc_RingHt1
    
    With gc_dRnHt
        .MinVal_Normal = RoundUp(gc_RingHt1.MinVal - refrht, 0.01)
        .MaxVal_Normal = RoundDown(gc_RingHt1.MaxVal - refrht, 0.01)
    End With
    SetMinMax gc_dRnHt
    
    refrht = AData(gc_Mfg2.Value, 6)
    With gc_RingHt2
        drht = 0.45 * AData(gc_Mfg2.Value, 3)
        
        If drht < 0.05 Then drht = 0.05
        If drht > 0.28 Then drht = 0.28
        If drht > 0.65 * refrht Then drht = 0.65 * refrht
        
        .MinVal_Normal = RoundDown(refrht - drht, 0.01)
        If .MinVal_Normal < 0 Then .MinVal_Normal = 0
        
        .MaxVal_Normal = RoundUp(refrht + drht, 0.01)
    End With
    SetMinMax gc_RingHt2
End Sub

Public Sub SetArmDepth()
Dim refadp As Single, dadp As Single
    If Not isBike Then
        refadp = AData(gc_Mfg1.Value, 7)
        With gc_ArmDepth1
            dadp = 0.65 * refadp
            If dadp < 0.05 Then dadp = 0.05
            If dadp > 0.28 Then dadp = 0.28
            
            .MinVal_Normal = RoundDown(refadp - dadp, 0.01)
            If .MinVal_Normal < 0 Then .MinVal_Normal = 0
            
            .MaxVal_Normal = RoundUp(refadp + dadp, 0.01)
        End With
        SetMinMax gc_ArmDepth1
        
        refadp = AData(gc_Mfg2.Value, 7)
        With gc_ArmDepth2
            dadp = 0.65 * refadp
            If dadp < 0.05 Then dadp = 0.05
            If dadp > 0.28 Then dadp = 0.28
            
            .MinVal_Normal = RoundDown(refadp - dadp, 0.01)
            If .MinVal_Normal < 0 Then .MinVal_Normal = 0
            
            .MaxVal_Normal = RoundUp(refadp + dadp, 0.01)
        End With
        SetMinMax gc_ArmDepth2
    End If
End Sub

Public Sub SetStatic()
    With gc_Static
        If isGlide Then
            .MinVal_Normal = -2000
            .MaxVal_Normal = 0
        Else
            .MinVal_Normal = 0
            If Not isBike Then
                .MaxVal_Normal = 4000
            Else
                .MaxVal_Normal = 400
            End If
        End If
        SetMinMax gc_Static
    End With
        
    With gc_SBasePr
        .MinVal_Normal = 0
        If isGlide Then
            .MaxVal_Normal = 0
        Else
            If Not isBike Then
                .MaxVal_Normal = 900
            Else
                .MaxVal_Normal = 400
            End If
        End If
        SetMinMax gc_SBasePr
    End With
    
    With gc_BasePr
        .MinVal_Normal = 0
        If isGlide Then
            .MaxVal_Normal = 0
        Else
            If Not isBike Then
                .MaxVal_Normal = 9000
            Else
                .MaxVal_Normal = 4000
            End If
        End If
        SetMinMax gc_BasePr
    End With
    
    With gc_SSRate
        If isGlide Then
            .MinVal_Normal = -100
            .MaxVal_Normal = 0
        Else
            .MinVal_Normal = 0
            If Not isBike Then
                .MaxVal_Normal = 900
            Else
                .MaxVal_Normal = 400
            End If
        End If
        SetMinMax gc_SSRate
    End With
    
    With gc_SRate
        If isGlide Then
            .MinVal_Normal = -1000
            .MaxVal_Normal = 0
        Else
            .MinVal_Normal = 0
            If Not isBike Then
                .MaxVal_Normal = 9000
            Else
                .MaxVal_Normal = 4000
            End If
        End If
        SetMinMax gc_SRate
    End With

    TestStatic
End Sub

Public Sub SetTCWt()
    With gc_TCWt1
        .MinVal_Normal = gc_NArm1.Value * gc_CWt1.MinVal_Normal
        .MaxVal_Normal = gc_NArm1.Value * gc_CWt1.MaxVal_Normal
    End With
    SetMinMax gc_TCWt1
    
    With gc_TCWt2
        .MinVal_Normal = gc_NArm2.Value * gc_CWt2.MinVal_Normal
        .MaxVal_Normal = gc_NArm2.Value * gc_CWt2.MaxVal_Normal
    End With
    SetMinMax gc_TCWt2
End Sub

Public Sub SetMinMax(p_obj As CValue)
Dim tv As Single
    With p_obj
       'round normal min/max values to stay within calculated limits
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
                Case 1:    .MinVal_Alternate = tv + 0.1
                Case 2:    .MinVal_Alternate = tv + 0.01
                Case Else: .MinVal_Alternate = tv + 0.001
                End Select
            Else
                .MinVal_Alternate = tv
            End If
            
            tv = val(Format(.MaxVal_Alternate, .ValFmt))
            If tv > .MaxVal_Alternate Then
                Select Case .DecimalPlaces_Alternate
                Case 0:    .MaxVal_Alternate = tv - 1
                Case 1:    .MaxVal_Alternate = tv - 0.1
                Case 2:    .MaxVal_Alternate = tv - 0.01
                Case Else: .MaxVal_Alternate = tv - 0.001
                End Select
            Else
                .MaxVal_Alternate = tv
            End If
        End If
        
       'select appropriate limit values
        If .UOM = UOM_NORMAL Then
            .MinVal = .MinVal_Normal
            .MaxVal = .MaxVal_Normal
        Else
            .MinVal = .MinVal_Alternate
            .MaxVal = .MaxVal_Alternate
        End If
    End With
End Sub

Public Sub TestStatic()
    'make sure that units agree for static and spring rates
    If gc_Static.Value * gc_SSRate.Value < 0 Then
        gc_SSRate.IsCalc = True:        gc_SSRate.Value = -gc_SSRate.Value
        gc_SRate.IsCalc = True:         gc_SRate.Value = -gc_SRate.Value
    End If

    'make sure that only "glide" clutches have negative static
    If Not isGlide Then
        If gc_Static.Value < 0 Then
            gc_Static.IsCalc = True:    gc_Static.Value = -gc_Static.Value
            gc_SSRate.IsCalc = True:    gc_SSRate.Value = -gc_SSRate.Value
            gc_SRate.IsCalc = True:     gc_SRate.Value = -gc_SRate.Value
        End If
    Else
        'force "glide" clutches to have zero base pressure
        gc_SBasePr.Value = 0:           gc_BasePr.Value = 0
        
        If gc_Static.Value > 0 Then
            gc_Static.IsCalc = True:    gc_Static.Value = -gc_Static.Value
            gc_SSRate.IsCalc = True:    gc_SSRate.Value = -gc_SSRate.Value
            gc_SRate.IsCalc = True:     gc_SRate.Value = -gc_SRate.Value
        End If
    End If
    
    #If ISCLUTCHJR Then
        gc_Turns.IsCalc = True
        gc_Turns.Value = CalcTurns  'makes turns consistant on static force limit reset
    #End If
End Sub
