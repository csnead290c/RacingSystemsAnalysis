VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "THREED32.OCX"
Object = "{F9043C88-F6F2-101A-A3C9-08002B2F49FB}#1.2#0"; "COMDLG32.OCX"
Begin VB.Form frmPrint 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   "Print Setup"
   ClientHeight    =   1560
   ClientLeft      =   1470
   ClientTop       =   2310
   ClientWidth     =   4785
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1560
   ScaleWidth      =   4785
   ShowInTaskbar   =   0   'False
   Begin VB.PictureBox picGraph 
      Height          =   375
      Left            =   4200
      ScaleHeight     =   315
      ScaleWidth      =   315
      TabIndex        =   4
      Top             =   120
      Visible         =   0   'False
      Width           =   375
   End
   Begin VB.CommandButton btnSetup 
      Caption         =   "P&rint Setup..."
      Height          =   375
      Left            =   3360
      TabIndex        =   2
      Top             =   1080
      Width           =   1335
   End
   Begin VB.ListBox lbxPrinters 
      Height          =   645
      Left            =   120
      TabIndex        =   0
      Top             =   600
      Width           =   3015
   End
   Begin VB.CommandButton btnPrint 
      Caption         =   "&Print"
      Default         =   -1  'True
      Height          =   375
      Left            =   3360
      TabIndex        =   1
      Top             =   600
      Width           =   1335
   End
   Begin Threed.SSPanel pnlFlood 
      Height          =   315
      Left            =   120
      TabIndex        =   3
      Top             =   120
      Width           =   3045
      _Version        =   65536
      _ExtentX        =   5371
      _ExtentY        =   556
      _StockProps     =   15
      Caption         =   "Ready to Print"
      ForeColor       =   0
      BackColor       =   12632256
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      BorderWidth     =   2
      BevelInner      =   1
   End
   Begin MSComDlg.CommonDialog cdlPrint 
      Left            =   3600
      Top             =   0
      _ExtentX        =   847
      _ExtentY        =   847
      _Version        =   393216
   End
End
Attribute VB_Name = "frmPrint"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private pw80 As Long
Private line_height As Long
Private Y As Long
Private mFilename As String
Private mNote As String
Private Const IS_CENTER = True
Private Const IS_BOLD = True
Private bPage2 As Boolean
Private Const LINE_GAP = 201

Private Sub BtnPrint_Click()
    'Me.Enabled = False
    MousePointer = vbHourglass
    StatusUpdate "Setting Printer"
    
    'force worksheet calculations to make current
    CalcCompRatio
    CalcCarb
    CalcFlowStuff
    CalcSeatDia
    CalcSeatPer
    CalcWSCSArea
    
    #If ISENGINEPRO Then
        'force calculations to make current
        CalcRecommendations
        SetRating
    #End If
    
    Printer.FontName = "Courier New"
    PrintFile
    MousePointer = vbDefault
    'Me.Enabled = True
End Sub

Private Sub BtnSetup_Click()
    'Me.Enabled = False
    cdlPrint.Flags = &H40&
    cdlPrint.ShowPrinter
    lbxPrinters_Click
    'Me.Enabled = True
End Sub

Private Sub Form_Load()
Dim i As Integer
    Me.caption = App.Title & " Print Setup"
    winOnTop Me, True
    winCenter Me
    pnlFlood.caption = "Select Printer"
    
    For i = 0 To Printers.Count - 1
        lbxPrinters.AddItem Printers(i).DeviceName
        If Printer.DeviceName = Printers(i).DeviceName Then
            lbxPrinters.ListIndex = i
        End If
    Next
    
    If lbxPrinters.ListIndex <> -1 Then
        lbxPrinters.TopIndex = lbxPrinters.ListIndex
    End If
End Sub

Public Sub Display(Optional mode As Variant)
Dim imode As Integer
    If IsMissing(mode) Then
        imode = vbModeless
    Else
        imode = mode
    End If
   'Required set up process goes here
    Me.Show imode
   'Me.Refresh
End Sub

Public Sub DirectPrint()
    BtnPrint_Click
    Unload Me
End Sub

Private Sub lbxPrinters_Click()
    MousePointer = vbHourglass
    btnPrint.Enabled = False:    btnSetup.Enabled = False
    lbxPrinters.Enabled = False
    
    Set Printer = Printers(lbxPrinters.ListIndex)
    DoEvents
       
    lbxPrinters.Enabled = True
    btnSetup.Enabled = True:     btnPrint.Enabled = True
    MousePointer = vbDefault
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

Private Sub StatusUpdate(cpt As String)
Dim ftype As Integer
    pnlFlood.caption = cpt
    ftype = 0
   'pnlFLood.FloodType = FTYPE
   'pnlFLood.FloodPercent = FPER
    If ftype = 0 Then
        pnlFlood.ForeColor = &H0&       'black for status message
    Else
        pnlFlood.ForeColor = &HFF&      'red for fill/completion percentage
    End If
    
    pnlFlood.Refresh
End Sub

Private Sub PrintFile()
Dim binfmt As String
Dim bin As Single, vd As Single
Dim i As Integer
Dim Tab_Left As Long, Tab_Left_value As Long
Dim Tab_Right As Long, Tab_Right_value As Long
Dim Tab_SI As Long, Tab_SI_value As Long
Dim ysave As Long
Dim evd As Single
Dim evds As String
    Printer.fontsize = 10
    line_height = Printer.TextHeight("E")    'save 10 point line height
    pw80 = Printer.Width / 80
    
    Tab_Left = 3 * pw80
    Tab_Left_value = 32 * pw80
    Tab_Right = 39 * pw80
    Tab_Right_value = 69 * pw80
    
    bPage2 = False:    PrintHeading Tab_Left
        
    StatusUpdate "Printing Input"
    Y = Printer.CurrentY
    printline "Input Engine Data", Tab_Left, Y, 12, IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    If gc_Inline.value Then
        printline "Number of Cylinders       Inline", Tab_Left, Y
    Else
        printline "Number of Cylinders          Vee", Tab_Left, Y
    End If
    
    printline gc_NoCyl.RightAlign(5), Tab_Left_value, Y
    printline "Intake Manifold Type:", Tab_Right, Y
    printline gc_Manifold.List(gc_Manifold.value), RsetString(Tab_Right_value, gc_Manifold.List(gc_Manifold.value)), Y
    
    Y = Printer.CurrentY
    printline "Bore Diameter - " & gc_Bore.Unit, Tab_Left, Y
    printline gc_Bore.RightAlign(5), Tab_Left_value, Y
    printline "Manifold Runner Style:", Tab_Right, Y
    If gc_Curved.value Then
        printline "Curved Runner", RsetString(Tab_Right_value, "Curved Runner"), Y
    Else
        printline "Straight Runner", RsetString(Tab_Right_value, "Straight Runner"), Y
    End If
    
    Y = Printer.CurrentY
    printline "Stroke Length - " & gc_Stroke.Unit, Tab_Left, Y
    printline gc_Stroke.RightAlign(5), Tab_Left_value, Y
    printline "Intake Manifold Flow Factor - %", Tab_Right, Y
    printline gc_ManFlow.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Rod Length - " & gc_Rod.Unit, Tab_Left, Y
    printline gc_Rod.RightAlign(5), Tab_Left_value, Y
    
    Y = Printer.CurrentY
    printline "Compression Ratio", Tab_Left, Y
    printline gc_CR.RightAlign(5), Tab_Left_value, Y
    printline "Number of Intake Valves per Cylinder", Tab_Right, Y
    printline gc_NoInValves.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Cam Type:", Tab_Left, Y
    printline gc_CamType.List(gc_CamType.value), RsetString(Tab_Left_value, gc_CamType.List(gc_CamType.value)), Y
    printline "Intake Valve Diameter - " & gc_ValveDia.Unit, Tab_Right, Y
    printline gc_ValveDia.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Intake Duration @ .050 inch - degrees", Tab_Left, Y
    printline gc_InCamDur.RightAlign(5), Tab_Left_value, Y
    printline "Maximum Intake Port Flow - CFM", Tab_Right, Y
    printline gc_MaxInFlow.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Throttle CFM @ 1.5 inches Hg", Tab_Left, Y
    printline gc_CarbCFM.RightAlign(5), Tab_Left_value, Y
    printline " @ Test Pressure - inches H2O", Tab_Right, Y
    printline gc_DeltaP.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    
    If gc_Carb.value Then
        printline "Carburetor           Fuel Type:", Tab_Left, Y
    Else
        printline "Fuel Injection       Fuel Type:", Tab_Left, Y
    End If
    printline gc_Fuel.List(gc_Fuel.value), RsetString(Tab_Left_value, gc_Fuel.List(gc_Fuel.value)), Y
    printline " @ Ref. Bore Diameter - " & gc_RefBore.Unit, Tab_Right, Y
    printline gc_RefBore.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY:    printline "", Tab_Left, Y
    
    Y = Printer.CurrentY
    printline "       Compression Ratio Worksheet", Tab_Left, Y, , Not IS_CENTER, IS_BOLD
    printline "  Intake Port Flow Worksheet @ " & gc_DeltaP.Formatted & " in H2O", Tab_Right, Y, , Not IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline "Combustion Chamber Volume - c.c.", Tab_Left, Y
    printline gc_Chamber.RightAlign(5), Tab_Left_value, Y
    printline "Minimum Cross-sectional Area - sq in", Tab_Right, Y
    printline gc_CSArea.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Piston to Deck Height - inches", Tab_Left, Y
    printline gc_Deck.RightAlign(5), Tab_Left_value, Y
    printline "Intake Flow Velocity - ft/sec", Tab_Right, Y
    printline gc_FlowVel.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Head Gasket Thickness - inches", Tab_Left, Y
    printline gc_Gasket.RightAlign(5), Tab_Left_value, Y
    printline "Intake Flow Flux - CFM/sq inch", Tab_Right, Y
    printline gc_FlowFlux.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Piston Dome Volume - c.c.", Tab_Left, Y
    printline gc_Dome.RightAlign(5), Tab_Left_value, Y
    printline "Flow Velocity Index - %", Tab_Right, Y
    printline gc_FVIndex.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Compression Ratio", Tab_Left, Y
    printline gc_WSCR.RightAlign(5), Tab_Left_value, Y
        
    Y = Printer.CurrentY
    printline "", Tab_Left, Y
    printline "   Minimum Cross-sectional Area Worksheet", Tab_Right, Y, , Not IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline "  Throttle CFM @ 1.5 inches Hg Worksheet", Tab_Left, Y, , Not IS_CENTER, IS_BOLD
    If gc_SeatDia.Inches Then
        printline "Valve Seat Throat Diameter - " & gc_SeatDia.Unit, Tab_Right, Y
    Else
        printline "Valve Seat Throat Diam - " & gc_SeatDia.Unit, Tab_Right, Y
    End If
    printline gc_SeatDia.RightAlign(5), Tab_Right_value, Y

    Y = Printer.CurrentY
    If gc_TBType.value Then
        printline "Butterfly Throttles:           Pri" & gc_NoTB.RightAlign(2), Tab_Left, Y
    Else
        printline "Slide Valve Throttles:         Pri" & gc_NoTB.RightAlign(2), Tab_Left, Y
    End If
    printline "Sec" & gc_NoTBS.RightAlign(2), Tab_Left_value, Y
    printline "Valve Seat Throat Percentage - %", Tab_Right, Y
    printline gc_SeatPer.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Throttle Diameter - " & gc_TBDia.Unit, Tab_Left, Y
    printline gc_TBDia.RightAlign(5), Tab_Left_value - 5 * pw80, Y
    printline gc_TBDiaS.RightAlign(5), Tab_Left_value, Y
    If gc_StemDia.Inches Then
        printline "Valve Stem Diameter - " & gc_StemDia.Unit, Tab_Right, Y
    Else
        printline "Valve Stem Diameter - " & gc_StemDia.Unit, Tab_Right, Y
    End If
    printline gc_StemDia.RightAlign(5), Tab_Right_value, Y
        
    Y = Printer.CurrentY
    printline "Venturi Diameter - " & gc_TVDia.Unit, Tab_Left, Y
    printline gc_TVDia.RightAlign(5), Tab_Left_value - 5 * pw80, Y
    printline gc_TVDiaS.RightAlign(5), Tab_Left_value, Y
    printline "Maximum Intake Valve Lift - inches", Tab_Right, Y
    printline gc_ValveLift.RightAlign(5), Tab_Right_value, Y
    
    Y = Printer.CurrentY
    printline "Throttle CFM @ 1.5 inches Hg", Tab_Left, Y
    printline gc_WSCarbCFM.RightAlign(5), Tab_Left_value, Y
    printline "Valve Seat Throat Area - sq inches", Tab_Right, Y
    printline gc_WSCSArea.RightAlign(5), Tab_Right_value, Y
    
    ysave = Y
    
    StatusUpdate "Printing Graph"
    PrintGraph
    
    StatusUpdate "Printing Output"
    
    If gc_Bore.Inches Or gc_Stroke.Inches Then
        bin = CID:              binfmt = "###.0 CID"
    Else
        bin = CID * ZM3:        binfmt = "##### c.c."
    End If
    Y = ysave + 2 * line_height
    printline "Estimated Performance for " & Format(bin, binfmt) & " Engine", Tab_Left, Y, 12, IS_CENTER, IS_BOLD
    
    Tab_Left = 7 * pw80
    Tab_Left_value = 18 * pw80
    Tab_Right = 26 * pw80
    Tab_Right_value = 42 * pw80
    Tab_SI = 50 * pw80
    Tab_SI_value = 67 * pw80
    
    Y = Printer.CurrentY
    printline "Peak HP", Tab_Left, Y
    printline gc_HP.RightAlign(5), Tab_Left_value, Y
    printline "Peak Torque - ft lbs", Tab_Right, Y
    printline gc_TQ.RightAlign(5), Tab_Right_value, Y
    printline "         SI Units", Tab_SI, Y, , , IS_BOLD
    
    Y = Printer.CurrentY
    printline "RPM @ Peak HP", Tab_Left, Y
    printline gc_RPMPeakHP.RightAlign(5), Tab_Left_value, Y
    printline "RPM @ Peak Torque", Tab_Right, Y
    printline gc_RPMPeakTQ.RightAlign(5), Tab_Right_value, Y
    printline "Displacement - liters", Tab_SI, Y
    printline RightAlign(5, 2, CID * ZM3 / 1000), Tab_SI_value, Y
    
    Y = Printer.CurrentY
    printline "Peak HP/CID", Tab_Left, Y
    printline gc_HPperCID.RightAlign(5), Tab_Left_value, Y
    printline "Peak Torque/CID", Tab_Right, Y
    printline gc_TQperCID.RightAlign(5), Tab_Right_value, Y
    printline "Peak Power - kW", Tab_SI, Y
    printline RightAlign(5, 0, gc_HP.value / 1.34102), Tab_SI_value, Y
    
    Y = Printer.CurrentY
    printline "Shift RPM", Tab_Left, Y
    printline gc_Shift.RightAlign(5), Tab_Left_value, Y
    printline "Redline RPM", Tab_Right, Y
    printline gc_Redline.RightAlign(5), Tab_Right_value, Y
    printline "Peak Torque - Nm", Tab_SI, Y
    printline RightAlign(5, 0, gc_TQ.value * 0.3048 * 4.44822), Tab_SI_value, Y
        
    Tab_Left = 61 * pw80
    Y = Printer.CurrentY + 6 * line_height
    printline "  RPM    HP    TQ", Tab_Left, Y, , Not IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline " ----   ---   ---", Tab_Left, Y, , Not IS_CENTER, IS_BOLD
    
    With frmGraph.lstDynoData
        For i = 0 To .Listcount
            Y = Printer.CurrentY
            printline .List(i), Tab_Left, Y
        Next
    End With
    
    #If ISENGINEPRO Then
        Tab_Left = 3 * pw80
        Tab_Left_value = 32 * pw80
        Tab_Right = 39 * pw80
        Tab_Right_value = 69 * pw80
                
        Y = Printer.CurrentY
    
        bPage2 = True:    PrintHeading Tab_Left
    
        StatusUpdate "Printing Recommendations"
        Y = Printer.CurrentY
        printline "ENGINE Pro Recommendations", Tab_Left, Y, 12, IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "             Intake System:", Tab_Left, Y, , Not IS_CENTER, IS_BOLD
        printline "               Exhaust Port:", Tab_Right, Y, , Not IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "Intake Valve Lift - inches", Tab_Left, Y
        printline gc_InMaxValveLift.RightAlign(5), Tab_Left_value, Y
        printline "Exhaust Flow - CFM @ " & gc_DeltaP.Formatted & " inches H2O, %Intake", Tab_Right, Y
        
        Y = Printer.CurrentY
        printline "Minimum Flow Area - sq inches", Tab_Left, Y
        printline gc_InMinFlowArea.RightAlign(5), Tab_Left_value, Y
        printline "@ " & gc_RefBore.Formatted & " " & gc_RefBore.Unit & " Ref. Bore Diameter", Tab_Right, Y
        evds = Format(100 * gc_ExRecFlow.value / gc_MaxInFlow.value, "##") & "%"
        evds = gc_ExRecFlow.Formatted & "=" & evds
        printline evds, RsetString(Tab_Right_value, evds), Y
        
        Y = Printer.CurrentY
        printline "Total Intake Track Length - inches", Tab_Left, Y
        printline gc_InTrackLen.RightAlign(5), Tab_Left_value, Y
        printline "Exhaust Valve Diameter - " & gc_ExValveDia.Unit, Tab_Right, Y
        If gc_ExValveDia.Inches Then
            evd = Round(gc_ExValveDia.value + 0.04, 0.02)
            evds = Format(evd, "#.#0")
        Else
            evd = Round(gc_ExValveDia.value + 1, 0.5)
            evds = Format(evd, "##.0")
        End If
        evds = gc_ExValveDia.Formatted & "-" & evds
        printline evds, RsetString(Tab_Right_value, evds), Y
        
        Y = Printer.CurrentY
        printline "Maximum Flow Area - sq inches", Tab_Left, Y
        printline gc_InMaxFlowArea.RightAlign(5), Tab_Left_value, Y
        printline "Exhaust Valve Lift - inches", Tab_Right, Y
        printline gc_ExMaxValveLift.RightAlign(5), Tab_Right_value, Y
        
        Y = Printer.CurrentY
        printline "Total Intake Track Volume - c.c.", Tab_Left, Y
        printline gc_InTrackVol.RightAlign(5), Tab_Left_value, Y
        printline "Minimum Flow Area - sq inches", Tab_Right, Y
        printline gc_ExMinFlowArea.RightAlign(5), Tab_Right_value, Y
        
        Y = Printer.CurrentY
        If gc_Manifold.value = 1 Or gc_Manifold.value = 3 Then
            printline "Plenum Volume - cubic inches", Tab_Left, Y
            printline gc_PlenVol.RightAlign(5), Tab_Left_value, Y
        End If
        printline "Maximum Flow Area - sq inches", Tab_Right, Y
        printline gc_ExMaxFlowArea.RightAlign(5), Tab_Right_value, Y
    
        Y = Printer.CurrentY:       printline "", Tab_Left, Y
        Y = Printer.CurrentY
        printline "               Camshaft:", Tab_Left, Y, , Not IS_CENTER, IS_BOLD
        printline "              Exhaust System:", Tab_Right, Y, , Not IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "Lobe Separation Angle - degs", Tab_Left, Y
        printline gc_LobeSepAng.RightAlign(5), Tab_Left_value, Y
        printline "Primary Tube Length - inches", Tab_Right, Y
        printline gc_PriTubeLen.RightAlign(5), Tab_Right_value, Y
        
        Y = Printer.CurrentY
        printline "Intake Lobe Centerline - degs", Tab_Left, Y
        printline gc_InLobeCL.RightAlign(5), Tab_Left_value, Y
        printline "Primary Tube Diameter - inches", Tab_Right, Y
        printline gc_PriTubeDia.RightAlign(5), Tab_Right_value, Y
        
        Y = Printer.CurrentY
        printline "Exhaust Duration @ .050 inch - degs", Tab_Left, Y
        printline gc_ExCamDur.RightAlign(5), Tab_Left_value, Y
        If gc_NoCyl.value > 1 Then
            printline "Collector Diameter - inches", Tab_Right, Y
            printline gc_CollectDia.RightAlign(5), Tab_Right_value, Y
        End If
        
        StatusUpdate "Printing Details"
        Tab_Left = 9 * pw80
        Tab_Right_value = 64 * pw80
        Y = Printer.CurrentY:       printline "", Tab_Left, Y
        Y = Printer.CurrentY
        printline "ENGINE Pro Details", Tab_Left, Y, 12, IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline "  " & gc_Detail.Headings(4), Tab_Left, Y, , Not IS_CENTER, IS_BOLD
        printline "Est. Cranking Compression - psig", Tab_Right, Y
        printline RightAlign(5, 0, CCP), Tab_Right_value, Y
        
        Y = Printer.CurrentY
        printline gc_Detail.Headings(5), Tab_Left, Y
        
        Y = Printer.CurrentY
        printline gc_Detail.RatingLine(1), Tab_Left, Y
        printline "       Geometric Data Summary", Tab_Right, Y, , Not IS_CENTER, IS_BOLD
        
        Y = Printer.CurrentY
        printline gc_Detail.RatingLine(2), Tab_Left, Y
        printline "Bore to Stroke Ratio", Tab_Right, Y
        printline RightAlign(5, 2, BQS), Tab_Right_value, Y
        
        Y = Printer.CurrentY
        printline gc_Detail.RatingLine(3), Tab_Left, Y
        printline "Rod to Stroke Ratio", Tab_Right, Y
        printline RightAlign(5, 2, LRQS), Tab_Right_value, Y
        
        Y = Printer.CurrentY
        printline gc_Detail.RatingLine(4), Tab_Left, Y
        printline "Piston to Head/Rod Length", Tab_Right, Y
        printline RightAlign(5, 4, DQR), Tab_Right_value, Y
        
        Tab_Left = 8 * pw80
        Y = Printer.CurrentY
        i = InStr(gc_Detail.Headings(6), "@") - 2
        printline Left(gc_Detail.Headings(6), i), Tab_Left, Y
        printline "Intake Throat/Bore Area Ratio", Tab_Right, Y
        printline RightAlign(5, 3, gc_CSArea.value / KCID), Tab_Right_value, Y
        
        Y = Printer.CurrentY
        printline Mid(gc_Detail.Headings(6), i + 1), Tab_Left, Y
        printline "Intake Valve Lift/Diameter Ratio", Tab_Right, Y
        vd = gc_ValveDia.value: If Not gc_ValveDia.Inches Then vd = vd / ZM
        printline RightAlign(5, 3, gc_ValveLift.value / vd), Tab_Right_value, Y
        
        
        Tab_Left = 3 * pw80
        Tab_Right = 39 * pw80
        Y = Printer.CurrentY:       printline "", Tab_Left, Y
        
        Y = Printer.CurrentY:       ysave = Y
        PrintOneDataSet 1, Tab_Left
        
        Y = ysave:                  Printer.CurrentY = Y
        PrintOneDataSet 2, Tab_Right
        
        Printer.CurrentY = Printer.CurrentY + LINE_GAP
        
        Y = Printer.CurrentY:       ysave = Y
        PrintOneDataSet 3, Tab_Left
        
        Y = ysave:                  Printer.CurrentY = Y
        PrintOneDataSet 4, Tab_Right
    #End If

    Printer.EndDoc
    StatusUpdate "Printing Complete"
End Sub

Private Sub PrintHeading(tab05 As Long)
Dim i As Integer
    If bPage2 Then Printer.NewPage
    
    StatusUpdate "Printing Heading"
    Printer.CurrentY = Printer.CurrentY + LINE_GAP
    
    Y = 0
    Printer.fontsize = 10:    Printer.fontbold = False
    printline "", tab05, Y
    printline App.Title & " - Version " & App.Major & "." & App.Minor, 0, Printer.CurrentY, 14, IS_CENTER, IS_BOLD
    printline "Racing Systems Analysis - Phoenix, Arizona - www.QUARTERjr.com", 0, Printer.CurrentY, 12, IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY:     printline "", tab05, Y
    Y = Printer.CurrentY:     printline "File:  " & LCase(Filename), tab05, Y
    Y = Printer.CurrentY:     printline "Note:  " & Note, tab05, Y
End Sub

Public Function RsetString(spos As Long, ostring As String) As Long
'spos is starting position, the string is usually 7 bytes long
'ostring is string to print
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
    picGraph.AutoSize = False
    picGraph.Width = (69 / 80) * Printer.ScaleWidth
    picGraph.Height = Printer.ScaleHeight - 33 * line_height
   
    If Not IsPrinterColor() Then    'this is okay since graph is not visible during printing
        With frmGraph.gphEngine
            .ThisSet = 1
            .PatternData = 0
            .ThisSet = 2
            .PatternData = 1
            .PatternedLines = 1
        End With
    End If
    
    frmGraph.DrawGraph
    picGraph.Picture = frmGraph.gphEngine.Picture
    Unload frmGraph
    
    Printer.PaintPicture picGraph.Picture, pw80, 35 * line_height, picGraph.Width, picGraph.Height
End Sub

Private Sub PrintOneDataSet(Index As Integer, tab_stop As Long)
Dim i As Integer
    gc_Detail.LoadData Index, gc_Stroke.value, gc_ValveDia.value
    
    Y = Printer.CurrentY
    printline "        " & gc_Detail.Headings(1), tab_stop, Y, , Not IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline gc_Detail.Headings(2), tab_stop, Y
    
    Y = Printer.CurrentY
    printline gc_Detail.Headings(3), tab_stop, Y
    
    For i = 1 To 15
        Y = Printer.CurrentY
        printline " " & gc_Detail.Data(i), tab_stop, Y
    Next i
End Sub

Private Function IsPrinterColor() As Boolean
    On Error GoTo NotColor
    
    IsPrinterColor = False
    If Printer.ColorMode = vbPRCMColor Then IsPrinterColor = True
    Exit Function

NotColor:
    Exit Function
    Resume Next
End Function

Public Property Get Filename() As String
    Filename = mFilename
End Property

Public Property Let Filename(vNewValue As String)
    mFilename = vNewValue
End Property

Public Property Get Note() As String
    Note = mNote
End Property

Public Property Let Note(vNewValue As String)
    mNote = vNewValue
End Property
