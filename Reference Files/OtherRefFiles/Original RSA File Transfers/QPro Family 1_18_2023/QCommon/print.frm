VERSION 5.00
Object = "{0BA686C6-F7D3-101A-993E-0000C0EF6F5E}#1.0#0"; "threed32.ocx"
Object = "{F9043C88-F6F2-101A-A3C9-08002B2F49FB}#1.2#0"; "COMDLG32.OCX"
Begin VB.Form frmPrint 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   "Print Setup"
   ClientHeight    =   1440
   ClientLeft      =   2430
   ClientTop       =   1680
   ClientWidth     =   4665
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1440
   ScaleWidth      =   4665
   ShowInTaskbar   =   0   'False
   Begin VB.PictureBox picGraph 
      Height          =   405
      Left            =   4020
      ScaleHeight     =   345
      ScaleWidth      =   465
      TabIndex        =   4
      Top             =   60
      Width           =   525
   End
   Begin MSComDlg.CommonDialog dlgCdlPrint 
      Left            =   3270
      Top             =   0
      _ExtentX        =   847
      _ExtentY        =   847
      _Version        =   393216
   End
   Begin VB.CommandButton cmdBtnSetup 
      Caption         =   "Printer &Setup"
      Height          =   375
      Left            =   3210
      TabIndex        =   2
      Top             =   990
      Width           =   1335
   End
   Begin VB.ListBox lstLbxPrinters 
      Height          =   840
      Left            =   120
      TabIndex        =   0
      Top             =   510
      Width           =   3000
   End
   Begin VB.CommandButton cmdsBtnPrint 
      Caption         =   "&Print"
      Default         =   -1  'True
      Height          =   375
      Left            =   3210
      TabIndex        =   1
      Top             =   510
      Width           =   1335
   End
   Begin Threed.SSPanel pnlsPnlFlood 
      Height          =   345
      Left            =   120
      TabIndex        =   3
      Top             =   90
      Width           =   3000
      _Version        =   65536
      _ExtentX        =   5292
      _ExtentY        =   609
      _StockProps     =   15
      Caption         =   "Ready to Print"
      ForeColor       =   0
      BackColor       =   -2147483644
      BeginProperty Font {0BE35203-8F91-11CE-9DE3-00AA004BB851} 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   400
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      BorderWidth     =   2
      BevelInner      =   1
   End
End
Attribute VB_Name = "frmPrint"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Private Y As Long
Private line_height As Long
Private mfilename As String
Private mnote As String
Private bIsCancel As Boolean
Private Const IS_NEWPAGE = True
Private Const IS_CENTER = True
Private Const IS_BOLD = True

Private Sub cmdsBtnPrint_Click()
    MousePointer = vbHourglass
    Me.Enabled = False
    
    Printer.FontName = "Courier New"
    PrintFile
    
    Me.Enabled = True
    Unload Me
    MousePointer = vbDefault
End Sub

Private Sub cmdBtnSetup_Click()
    Me.Enabled = False
    
    dlgCdlPrint.Flags = &H40&
    dlgCdlPrint.ShowPrinter
    lstLbxPrinters_Click
    
    Me.Enabled = True
End Sub

Private Sub Form_Load()
Dim i As Integer
    Me.caption = App.Title & " Printing"
    winOnTop Me, True
    winCenter Me
    pnlsPnlFlood.caption = "Select Printer"
    
    For i = 0 To Printers.Count - 1
        lstLbxPrinters.AddItem Printers(i).DeviceName
        If Printer.DeviceName = Printers(i).DeviceName Then
            lstLbxPrinters.ListIndex = i
        End If
    Next
    
    If lstLbxPrinters.ListIndex <> -1 Then
        lstLbxPrinters.TopIndex = lstLbxPrinters.ListIndex
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
End Sub

Public Sub DirectPrint()
    cmdsBtnPrint_Click
End Sub

Private Sub Form_Unload(Cancel As Integer)
    ReDim mSqlWhere(0 To 5)
End Sub

Private Sub lstLbxPrinters_Click()
    cmdsBtnPrint.Enabled = False
    cmdBtnSetup.Enabled = False
    lstLbxPrinters.Enabled = False
    
    Set Printer = Printers(lstLbxPrinters.ListIndex)
    DoEvents
    
    lstLbxPrinters.Enabled = True
    cmdBtnSetup.Enabled = True
    cmdsBtnPrint.Enabled = True
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

Private Sub StatusUpdate(cpt As String, FTYPE As Integer)
    pnlsPnlFlood.caption = cpt
    pnlsPnlFlood.FloodType = FTYPE
    If FTYPE = 0 Then
        pnlsPnlFlood.ForeColor = &H0&      'black
    Else
        pnlsPnlFlood.ForeColor = &HFF&     'red
    End If
    pnlsPnlFlood.Refresh
End Sub

Private Sub PrintFile()
Dim sideleft As Boolean
Dim sidetop As Boolean
Dim dograph As Boolean
Dim dohide As Boolean
Dim w As Long
Dim H As Long
Dim gindex As Integer
Dim vd As Single
Dim i As Integer
Dim pw80 As Long
Dim C1CL As Long
Dim C1VL As Long
Dim C2CL As Long
Dim C2VL As Long
Dim C3CL As Long
Dim C3VL As Long
Dim d(COL_RPM To COL_TQ) As Long
Dim g(COL_RATIO To COL_SHIFT) As Long
Dim ysave As Long
Dim ystart As Long
Dim LastRow As Integer
Dim Graphs_perPage As Integer
    
    Printer.fontsize = 10
    line_height = Printer.TextHeight("E")    'save 10 point line height
    pw80 = Printer.width / 80
    
    C1CL = 3 * pw80
    PrintHeading C1CL, Not IS_NEWPAGE
    
    #If ISQUARTERPRO Then   'QUARTER Pro pg one - input data (no worksheets)
        C1VL = 21 * pw80
        C2CL = 27 * pw80:   C2VL = 43 * pw80
        C3CL = 49 * pw80:   C3VL = 70 * pw80
        
        d(COL_RPM) = 30 * pw80
        d(COL_HP) = 37 * pw80
        d(COL_TQ) = 44 * pw80
        
        g(COL_RATIO) = 58 * pw80
        g(COL_EFF) = 64 * pw80
        g(COL_SHIFT) = 70 * pw80
        
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
            Y = Printer.CurrentY + line_height
        #Else
            Y = Printer.CurrentY + 2 * line_height
        #End If
        
        printline "Final Drive Data", 8 * pw80, Y, 10, , IS_BOLD
        
        Y = Printer.CurrentY
        printline gc_GearRatio.Labelctl.caption, C1CL, Y, 10
        printline gc_GearRatio.RightAlign(5), C1VL, Y, 10
        printline "Aerodynamic Data", 30 * pw80, Y, 10, , IS_BOLD
        #If Not ISBVPRO Then
            printline "Polar Moments of Inertia", 52 * pw80, Y, 10, , IS_BOLD
        #End If
        
        Y = Printer.CurrentY
        printline gc_Efficiency.Labelctl.caption, C1CL, Y, 10
        printline gc_Efficiency.RightAlign(5), C1VL, Y, 10
        printline gc_RefArea.Labelctl.caption, C2CL, Y, 10
        printline gc_RefArea.RightAlign(5), C2VL, Y, 10
        #If Not ISBVPRO Then
            printline gc_EnginePMI.Labelctl.caption, C3CL, Y, 10
            printline gc_EnginePMI.RightAlign(5), C3VL, Y, 10
        #End If
        
        Y = Printer.CurrentY
        printline gc_TireDia.Labelctl.caption, C1CL, Y, 10
        printline gc_TireDia.RightAlign(5), C1VL, Y, 10
        printline gc_DragCoef.Labelctl.caption, C2CL, Y, 10
        printline gc_DragCoef.RightAlign(5), C2VL, Y, 10
        #If Not ISBVPRO Then
            printline gc_TransPMI.Labelctl.caption, C3CL, Y, 10
            printline gc_TransPMI.RightAlign(5), C3VL, Y, 10
        #End If
        
        Y = Printer.CurrentY:    ystart = Y
        printline gc_TireWidth.Labelctl.caption, C1CL, Y, 10
        printline gc_TireWidth.RightAlign(5), C1VL, Y, 10
        printline gc_LiftCoef.Labelctl.caption, C2CL, Y, 10
        printline gc_LiftCoef.RightAlign(5), C2VL, Y, 10
        #If Not ISBVPRO Then
            printline gc_TiresPMI.Labelctl.caption, C3CL, Y, 10
            printline gc_TiresPMI.RightAlign(5), C3VL, Y, 10
        #End If
    
        'now print the engine dyno data in column 2
        C2CL = 29 * pw80:   C2VL = 45 * pw80
        Y = ysave
        printline " RPM", d(COL_RPM), Y, 10, , IS_BOLD
        printline "  HP", d(COL_HP), Y, 10, , IS_BOLD
        printline "Torque", d(COL_TQ), Y, 10, , IS_BOLD
        With gc_grdDyno
            For i = 0 To .MaxRow - 1
                If .GridArray(COL_RPM, i) = 0 Then Exit For
            
                Y = Printer.CurrentY
                printline .RightAlign(COL_RPM, i, 5), d(COL_RPM), Y, 10
                printline .RightAlign(COL_HP, i, 5), d(COL_HP), Y, 10
                printline .RightAlign(COL_TQ, i, 5), d(COL_TQ), Y, 10
            Next
        End With
        
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
        
        Y = Printer.CurrentY
        printline gc_LaunchRPM.Labelctl.caption, C3CL, Y, 10
        printline gc_LaunchRPM.RightAlign(5), C3VL, Y, 10
        
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
    
        With gc_grdGears
            For i = 0 To GEARS_ROWS - 1
                If .GridArray(COL_RATIO, i) = 0 Then Exit For
        
                Y = Printer.CurrentY
                If i = 0 Then printline "1st -", C3CL, Y, 10
                If i = 1 Then printline "2nd -", C3CL, Y, 10
                If i = 2 Then printline "3rd -", C3CL, Y, 10
                If i = 3 Then printline "4th -", C3CL, Y, 10
                If i = 4 Then printline "5th -", C3CL, Y, 10
                If i = 5 Then printline "6th -", C3CL, Y, 10
                printline .RightAlign(COL_RATIO, i, 5), g(COL_RATIO), Y, 10
                printline .RightAlign(COL_EFF, i, 5), g(COL_EFF), Y, 10
                printline .RightAlign(COL_SHIFT, i, 5), g(COL_SHIFT), Y, 10
            Next
        End With
        
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
            printline left(gc_ConvDia.Labelctl.caption, 18), C2CL, Y, 10
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
        
        With gc_grdGears
            For i = 0 To GEARS_ROWS - 1
                If .GridArray(COL_RATIO, i) = 0 Then
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
                    printline .RightAlign(COL_RATIO, i, 5), g(COL_RATIO), Y, 10
                End If
            Next
        End With
        
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
   'printline frmTimeSlip.tsv(8).caption, C1CL, Y, 10
    printline "Time    Distance     MPH  Acceleration Gear    RPM", 17 * pw80, Y, 10, , IS_BOLD
    
    With frmTimeSlip.List1
        For i = 0 To .Listcount - 1
            If Y > (Printer.height - 6 * line_height) Then
                PrintHeading C1CL, IS_NEWPAGE
            End If
            Y = Printer.CurrentY
            printline .List(i), 14 * pw80, Y, 10
        Next
    End With
    
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro only!
        Y = Printer.CurrentY
        printline "1/8 Mile: " & frmTimeSlip.tsv(3).caption & " sec @ " & frmTimeSlip.tsv(4).caption & " MPH   1/4 Mile: " & frmTimeSlip.tsv(6).caption & " sec @ " & frmTimeSlip.tsv(7).caption & " MPH", 12 * pw80, Y, 10, , IS_BOLD
    #End If

    If bIsCancel Then
        Printer.EndDoc
        StatusUpdate "Printing Complete", 0
        Exit Sub
    End If
    DoEvents
    
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
            
            #If Not ISBVPRO Then
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
        
        If bIsCancel Then
            Printer.EndDoc
            StatusUpdate "Printing Complete", 0
            Exit Sub
        End If
        DoEvents
    
        #If Not ISBVPRO Then
            'QUARTER Pro RPM Histogram
            If (g_gphopt = 1 And GraphsOpen() > 0) Or g_gphopt = 2 Then
    
                dograph = False
                dohide = False
                i = GPH_RPM_HIST
                If g_gphopt = 2 Then
                    dograph = True
                    If FrmMDI.mnuGraph(i).Enabled Then
                        dohide = True
                    End If
                Else
                    If Not FrmMDI.mnuGraph(i).Enabled Then
                        dograph = True
                    End If
                End If
                
                If dograph Then
                    If sidetop Then
                        PrintHeading C1CL, IS_NEWPAGE
                        ysave = 8 * line_height
                    Else
                        ysave = 39 * line_height
                    End If
                
                    C1VL = 1 * pw80
        
                    picGraph.AutoSize = False
                    picGraph.width = (78 / 80) * Printer.width
                    picGraph.height = (Printer.ScaleHeight - 8 * line_height) / 2
                
                    With frmRPMHist
                        If Not .Visible Then
                            FrmMDI.mnuGraph_Click i
                            MousePointer = vbHourglass
                        End If
                        
                        If dohide Then
                            .Visible = False
                            SetGraphEnabled i, True
                        End If
                    
                        'and now print the graph at whatever aspect
                        'ratio the user may have resized it to
                        picGraph.Picture = LoadPicture()
                        picGraph.Picture = .gphEngine.Picture
                        printline Trim(.caption), C1CL, ysave, 10, , IS_BOLD
                        Printer.PaintPicture picGraph.Picture, C1VL, ysave + line_height, picGraph.width, picGraph.height
                    End With
                    sidetop = Not sidetop
                End If
            End If
        
            If bIsCancel Then
                Printer.EndDoc
                StatusUpdate "Printing Complete", 0
                Exit Sub
            End If
            DoEvents
        #End If
    #End If
    
    'QUARTER Pro/jr vehicle performance graphs
    If (g_gphopt = 1 And GraphsOpen() > 0) Or g_gphopt = 2 Then
        
        If g_gpgopt = 0 Then
            Graphs_perPage = 2
        Else
            Graphs_perPage = 4
        End If
        
        C1VL = 1 * pw80
        C2CL = 40 * pw80
        C2VL = 38 * pw80
        
        picGraph.AutoSize = False
        If Graphs_perPage = 4 Then
            'make room for all 4 graphs on page as 2 x 2
            picGraph.width = (37 / 80) * Printer.width
        Else
            'make room for 2 graphs on page - top and bottom
            picGraph.width = (78 / 80) * Printer.width
        End If
        picGraph.height = (Printer.ScaleHeight - 8 * line_height) / 2
            
        For i = GPH_TIME_RPM To GPH_DIST_G
            dograph = False
            dohide = False
            If i <> GPH_SEPARATOR Then
                If g_gphopt = 2 Then
                    dograph = True
                    If FrmMDI.mnuGraph(i).Enabled Then
                        dohide = True
                    End If
                Else
                    If Not FrmMDI.mnuGraph(i).Enabled Then
                        dograph = True
                    End If
                End If
                
                If dograph Then
                    If sidetop Then
                        If sideleft Then PrintHeading C1CL, IS_NEWPAGE
                        ysave = 8 * line_height
                    Else
                        ysave = 39 * line_height
                    End If
                        
                    With gf_Graphs(i)
                        If Not IsPrinterColor() Then   'setup B&W graph
                            .gphEngine.OverlayPattern = 2  '2 pixel width
                        End If
                    
                        If Not .Visible Then
                            FrmMDI.mnuGraph_Click i
                            MousePointer = vbHourglass
                        Else
                            If Not IsPrinterColor() Then   'draw B&W graph
                                .gphEngine.DrawMode = graphDraw
                            End If
                        End If
                        
                        If dohide Then
                            .Visible = False
                            SetGraphEnabled i, True
                        End If
                        
                        'and now print the graph at whatever aspect
                        'ratio the user may have resized it to
                        picGraph.Picture = LoadPicture()
                        picGraph.Picture = .gphEngine.Picture
                        printline Trim(.caption), IIf(sideleft, C1CL, C2CL), ysave, 10, , IS_BOLD
                        Printer.PaintPicture picGraph.Picture, IIf(sideleft, C1VL, C2VL), ysave + line_height, picGraph.width, picGraph.height
                        
                        If Not IsPrinterColor() Then   'back to color graph
                            .gphEngine.OverlayPattern = 3  '3 pixel width
                            If Not dohide Then
                                .gphEngine.DrawMode = graphDraw
                            End If
                        End If
                    End With
                        
                    If Graphs_perPage = 4 Then
                        If Not sideleft Then sidetop = Not sidetop
                        sideleft = Not sideleft
                    Else
                        sidetop = Not sidetop
                    End If
                End If
            End If
            
            If bIsCancel Then
                Printer.EndDoc
                StatusUpdate "Printing Complete", 0
                Exit Sub
            End If
            DoEvents
        Next
    End If
    
    Printer.EndDoc
    StatusUpdate "Printing Complete", 0
End Sub

Private Sub PrintHeading(tab05 As Long, NewPage As Variant)
Dim i As Integer
    If bIsCancel Then
        Printer.EndDoc
        StatusUpdate "Printing Complete", 0
        Exit Sub
    End If
    
    StatusUpdate "Printing Heading", 0
    If NewPage Then Printer.NewPage
    
    Y = 0
    printline "", tab05, Y, 10
    printline App.ProductName & " - Version " & App.Major & "." & App.Minor, tab05, Printer.CurrentY, 14, IS_CENTER, IS_BOLD
    printline "Racing Systems Analysis - Phoenix, Arizona - www.QUARTERjr.com", tab05, Printer.CurrentY, 12, IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline "", tab05, Y, 10
    
    Y = Printer.CurrentY
    printline "File:  " & LCase(NameOnly(Filename)), tab05, Y, 10
    
    Y = Printer.CurrentY
    printline "Note:  " & Note, tab05, Y, 10
    printline "", tab05, Y, 10
        
    StatusUpdate "Printing Data", 0
End Sub

Public Function RsetString(spos As Long, ostring As String) As Long
'spos is starting position, the string is usually 7 bytes long
'ostring is string to print
Dim npos As Long
    If Len(ostring) > 7 Then
        npos = Printer.TextWidth(left(ostring, Len(ostring) - 7))
        npos = spos - npos
        If npos < 0 Then npos = 1
    Else
        npos = spos
    End If
    RsetString = npos
End Function

Private Function IsPrinterColor() As Boolean
    On Error GoTo NotColor
    
    IsPrinterColor = False
    If Printer.ColorMode = vbPRCMColor Then IsPrinterColor = True

NotColor:
    Exit Function
    Resume Next
End Function

Public Property Get Filename() As String
    Filename = mfilename
End Property

Public Property Let Filename(vNewValue As String)
    mfilename = vNewValue
End Property

Public Property Get Note() As String
    Note = mnote
End Property

Public Property Let Note(vNewValue As String)
    mnote = vNewValue
End Property
