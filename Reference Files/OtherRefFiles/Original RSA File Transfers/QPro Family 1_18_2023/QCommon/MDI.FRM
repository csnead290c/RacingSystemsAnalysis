VERSION 5.00
Object = "{F9043C88-F6F2-101A-A3C9-08002B2F49FB}#1.2#0"; "comdlg32.ocx"
Begin VB.MDIForm FrmMDI 
   AutoShowChildren=   0   'False
   BackColor       =   &H8000000C&
   Caption         =   "QUARTER Pro for Windows"
   ClientHeight    =   6600
   ClientLeft      =   165
   ClientTop       =   555
   ClientWidth     =   9570
   Icon            =   "MDI.frx":0000
   LinkTopic       =   "MDIForm1"
   LockControls    =   -1  'True
   ScrollBars      =   0   'False
   WindowState     =   2  'Maximized
   Begin MSComDlg.CommonDialog dlgCdlFile 
      Left            =   750
      Top             =   1200
      _ExtentX        =   847
      _ExtentY        =   847
      _Version        =   393216
   End
   Begin VB.PictureBox picture1 
      Align           =   1  'Align Top
      Height          =   450
      Left            =   0
      ScaleHeight     =   390
      ScaleWidth      =   9510
      TabIndex        =   0
      Top             =   0
      Width           =   9570
      Begin VB.PictureBox Picture5 
         Height          =   435
         Left            =   8850
         ScaleHeight     =   375
         ScaleWidth      =   630
         TabIndex        =   6
         Top             =   -30
         Width           =   690
         Begin VB.CommandButton cmdsBtnGraph 
            DisabledPicture =   "MDI.frx":030A
            Enabled         =   0   'False
            Height          =   360
            Index           =   6
            Left            =   45
            Picture         =   "MDI.frx":04CC
            Style           =   1  'Graphical
            TabIndex        =   11
            Top             =   15
            Width           =   555
         End
      End
      Begin VB.PictureBox picture3 
         Height          =   435
         Left            =   5400
         ScaleHeight     =   375
         ScaleWidth      =   3420
         TabIndex        =   3
         Top             =   -30
         Width           =   3480
         Begin VB.CommandButton cmdsBtnGraph 
            DisabledPicture =   "MDI.frx":068E
            Enabled         =   0   'False
            Height          =   360
            Index           =   4
            Left            =   1230
            Picture         =   "MDI.frx":0A30
            Style           =   1  'Graphical
            TabIndex        =   13
            Top             =   15
            Width           =   1170
         End
         Begin VB.CommandButton cmdsBtnGraph 
            DisabledPicture =   "MDI.frx":0DD2
            Enabled         =   0   'False
            Height          =   360
            Index           =   3
            Left            =   45
            Picture         =   "MDI.frx":1174
            Style           =   1  'Graphical
            TabIndex        =   12
            Top             =   15
            Width           =   1170
         End
         Begin VB.Label lblLabel2 
            Caption         =   "vs Distance"
            BeginProperty Font 
               Name            =   "Arial"
               Size            =   8.25
               Charset         =   0
               Weight          =   700
               Underline       =   0   'False
               Italic          =   0   'False
               Strikethrough   =   0   'False
            EndProperty
            Height          =   195
            Left            =   2460
            TabIndex        =   4
            Top             =   90
            Width           =   945
         End
      End
      Begin VB.PictureBox picture2 
         Height          =   435
         Left            =   2250
         ScaleHeight     =   375
         ScaleWidth      =   3150
         TabIndex        =   1
         Top             =   -30
         Width           =   3210
         Begin VB.CommandButton cmdsBtnGraph 
            DisabledPicture =   "MDI.frx":1516
            Enabled         =   0   'False
            Height          =   360
            Index           =   1
            Left            =   1230
            Picture         =   "MDI.frx":18B8
            Style           =   1  'Graphical
            TabIndex        =   15
            Top             =   15
            Width           =   1170
         End
         Begin VB.CommandButton cmdsBtnGraph 
            DisabledPicture =   "MDI.frx":1C5A
            Enabled         =   0   'False
            Height          =   360
            Index           =   0
            Left            =   45
            Picture         =   "MDI.frx":1FFC
            Style           =   1  'Graphical
            TabIndex        =   14
            Top             =   15
            Width           =   1170
         End
         Begin VB.Label lblLabel1 
            Caption         =   "vs Time"
            BeginProperty Font 
               Name            =   "Arial"
               Size            =   8.25
               Charset         =   0
               Weight          =   700
               Underline       =   0   'False
               Italic          =   0   'False
               Strikethrough   =   0   'False
            EndProperty
            Height          =   195
            Left            =   2460
            TabIndex        =   2
            Top             =   90
            Width           =   660
         End
      End
      Begin VB.PictureBox picture4 
         Height          =   435
         Left            =   -45
         ScaleHeight     =   375
         ScaleWidth      =   2265
         TabIndex        =   5
         Top             =   -30
         Width           =   2320
         Begin VB.CommandButton cmdsBtnRun 
            DisabledPicture =   "MDI.frx":239E
            Enabled         =   0   'False
            Height          =   360
            Left            =   1680
            Picture         =   "MDI.frx":2528
            Style           =   1  'Graphical
            TabIndex        =   10
            Top             =   15
            Width           =   360
         End
         Begin VB.CommandButton cmdsBtnOpen 
            Height          =   360
            Left            =   240
            Picture         =   "MDI.frx":26B2
            Style           =   1  'Graphical
            TabIndex        =   9
            Top             =   15
            Width           =   360
         End
         Begin VB.CommandButton cmdsBtnSave 
            Height          =   360
            Left            =   645
            Picture         =   "MDI.frx":2BA4
            Style           =   1  'Graphical
            TabIndex        =   8
            Top             =   15
            Width           =   360
         End
         Begin VB.CommandButton cmdsBtnPrint 
            DisabledPicture =   "MDI.frx":3096
            Enabled         =   0   'False
            Height          =   360
            Left            =   1050
            Picture         =   "MDI.frx":3198
            Style           =   1  'Graphical
            TabIndex        =   7
            Top             =   15
            Width           =   360
         End
      End
   End
   Begin VB.Menu mnuMain 
      Caption         =   "&File"
      Index           =   0
      Begin VB.Menu mnuFile 
         Caption         =   "&Open"
         Index           =   0
      End
      Begin VB.Menu mnuFile 
         Caption         =   "&Save"
         Enabled         =   0   'False
         Index           =   1
      End
      Begin VB.Menu mnuFile 
         Caption         =   "Save &As"
         Enabled         =   0   'False
         Index           =   2
      End
      Begin VB.Menu mnuFile 
         Caption         =   "-"
         Index           =   3
      End
      Begin VB.Menu mnuFile 
         Caption         =   "&Print"
         Index           =   4
      End
      Begin VB.Menu mnuFile 
         Caption         =   "-"
         Index           =   6
      End
      Begin VB.Menu mnuFile 
         Caption         =   "P&references"
         Index           =   7
      End
      Begin VB.Menu mnuFile 
         Caption         =   "-"
         Index           =   8
      End
      Begin VB.Menu mnuFile 
         Caption         =   "E&xit"
         Index           =   9
      End
   End
   Begin VB.Menu mnuMain 
      Caption         =   "&Timeslip"
      Index           =   1
   End
   Begin VB.Menu mnuMain 
      Caption         =   "&Graph"
      Index           =   2
      Begin VB.Menu mnuGraph 
         Caption         =   "&RPM and MPH vs Time"
         Index           =   0
      End
      Begin VB.Menu mnuGraph 
         Caption         =   "&Acceleration and Distance vs Time"
         Index           =   1
      End
      Begin VB.Menu mnuGraph 
         Caption         =   "-"
         Index           =   2
      End
      Begin VB.Menu mnuGraph 
         Caption         =   "R&PM and MPH vs Distance"
         Index           =   3
      End
      Begin VB.Menu mnuGraph 
         Caption         =   "A&cceleration and Time vs Distance"
         Index           =   4
      End
      Begin VB.Menu mnuGraph 
         Caption         =   "-"
         Index           =   5
      End
      Begin VB.Menu mnuGraph 
         Caption         =   "Engine RPM &Histogram"
         Index           =   6
      End
   End
   Begin VB.Menu mnuMain 
      Caption         =   "&Window"
      Index           =   3
      WindowList      =   -1  'True
      Begin VB.Menu mnuWindow 
         Caption         =   "&Cascade Graphs"
         Index           =   0
      End
      Begin VB.Menu mnuWindow 
         Caption         =   "&Tile Graphs"
         Index           =   1
      End
   End
   Begin VB.Menu mnuMain 
      Caption         =   "&Help"
      Index           =   4
      Begin VB.Menu mnuHelp 
         Caption         =   "&About"
         Index           =   0
      End
   End
End
Attribute VB_Name = "FrmMDI"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private lastfile As String
Private bFileExists As Boolean
Private MenuPrint As Boolean
Public fc_Value As New CButton

'graph display coordinates
Private isTile As Boolean
Private G_top As Long
Private G_left As Long
Private TileWid As Long
Private TileHt As Long

Private Sub cmdsBtnGraph_Click(index As Integer)
    mnuGraph_Click index
End Sub

Private Sub cmdsBtnGraph_MouseMove(index As Integer, Button As Integer, shift As Integer, X As Single, Y As Single)
    fc_Value.StatusMsg = gc_GraphBtn(index).StatusMsg
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub cmdsBtnOpen_Click()
    mnuFile_Click MNU_FILE_OPEN
    frmQuarter.txtNote.SetFocus
End Sub

Private Sub cmdsBtnOpen_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    fc_Value.StatusMsg = gc_OpenBtn.StatusMsg
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub cmdsBtnPrint_Click()
    MenuPrint = False
    mnuFile_Click MNU_FILE_PRINT
End Sub

Private Sub cmdsBtnPrint_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    fc_Value.StatusMsg = gc_PrintBtn.StatusMsg
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub cmdsBtnRun_Click()
    mnuMain_Click MNU_MAIN_RUN
End Sub

Private Sub cmdsBtnRun_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    fc_Value.StatusMsg = gc_RunBtn.StatusMsg
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub cmdsBtnSave_Click()
    If bFileExists And frmQuarter.FileDirty Then
        mnuFile_Click MNU_FILE_SAVE
    Else
        mnuFile_Click MNU_FILE_SAVEAS
    End If
End Sub

Private Sub cmdsBtnSave_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    fc_Value.StatusMsg = gc_SaveBtn.StatusMsg
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub MDIForm_Load()
    'Me.height = Screen.height - 300    'Patrick
    'Me.width = Screen.width
    
    bFileExists = False
    lastfile = ""
    MenuPrint = True
    
    #If ISQUARTERJR Or ISBVPRO Then    'RPM Histogram is QPro only
        cmdsBtnGraph(GPH_RPM_HIST).Visible = False
        cmdsBtnGraph(GPH_RPM_HIST).Enabled = False
        
        mnuGraph(GPH_RPM_HIST).Visible = False
        mnuGraph(GPH_RPM_HIST).Enabled = False
        
        mnuGraph(GPH_RPM_HIST - 1).Visible = False
        mnuGraph(GPH_RPM_HIST - 1).Enabled = False
    #End If
    
    g_pth = App.Path:  g_wsopt = 0:  g_gphopt = 0:  g_gpgopt = 0
    GetPreferences g_pth, g_wsopt, g_gphopt, g_gpgopt
    
    SetAllValues
    
    SetRunEnabled False
    SetPrintEnabled False
    setGraphEnabledAll False
    
    Me.caption = App.ProductName
    mnuHelp(0).caption = "About " & App.ProductName & "..."
    
    Load frmQuarter
End Sub

Private Sub MDIForm_MouseMove(Button As Integer, shift As Integer, X As Single, Y As Single)
    SetHelp Me, HELP_RESET, fc_Value
End Sub

Private Sub MDIForm_QueryUnload(Cancel As Integer, UnloadMode As Integer)
    If Forms.Count = 1 Then Exit Sub
    If TestDirtyMDI = vbCancel Then Cancel = True
End Sub

Private Sub MDIForm_Unload(Cancel As Integer)
    End
End Sub

Private Sub mnuMain_Click(index As Integer)
Static IsLoaded As Boolean
    
    Select Case index
        Case MNU_MAIN_FILE
            mnuFile(MNU_FILE_SAVE).Enabled = frmQuarter.FileDirty And bFileExists
        
        Case MNU_MAIN_RUN
            MousePointer = vbHourglass
            SetRunEnabled False
            
            If Not IsLoaded Then
                Load frmTimeSlip
                IsLoaded = True
            End If
            
            With frmTimeSlip
                If .CalcOutput() Then
                    .ZOrder 0
                    .Display
                End If
            End With
            MousePointer = vbDefault
    End Select
End Sub

Public Sub mnuFile_Click(index As Integer)
    On Error GoTo SubExit
    
    Select Case index
        Case MNU_FILE_OPEN                    'open file
            If TestDirtyMDI = vbCancel Then Exit Sub
        
            With dlgCdlFile
                .DialogTitle = "Open " & App.ProductName & " Data File"
                .Flags = cdlOFNHideReadOnly Or cdlOFNFileMustExist
                .InitDir = g_pth
                .Filter = App.ProductName & " data files (*.dat)|*.dat"
                .ShowOpen
        
                If .FileName <> "" And .FileName <> "*.dat" Then
                    MousePointer = vbHourglass: Me.Enabled = False
                    SetRunEnabled False
                    SetPrintEnabled False
                    setGraphEnabledAll False
                
                    ofn = Trim(.FileName)
                    Me.caption = App.ProductName & " - " & NameOnly(ofn)
                    LoadFromFile
                    frmQuarter.ofn = ofn
                    frmQuarter.ReDisplay
                    
                    SetRunEnabled True
                    mnuFile(MNU_FILE_SAVEAS).Enabled = True
                    Me.Enabled = True:  MousePointer = vbDefault
                End If
            End With
    
        Case MNU_FILE_SAVE                 'save file
            MousePointer = vbHourglass: Me.Enabled = False
            SaveToFile
            Me.Enabled = True:  MousePointer = vbDefault
    
        Case MNU_FILE_SAVEAS               'save file as...
            With dlgCdlFile
                .DialogTitle = "Save " & App.ProductName & " Data File"
                .Flags = cdlOFNOverwritePrompt Or cdlOFNPathMustExist
                .InitDir = g_pth
                .DefaultExt = "dat"
                .Filter = App.ProductName & " data files (*.dat)|*.dat"
                .ShowSave
            
                If .FileName <> "" And .FileName <> "*.dat" Then
                    MousePointer = vbHourglass: Me.Enabled = False
                    ofn = Trim(.FileName)
                    Me.caption = App.ProductName & " - " & NameOnly(ofn)
                    SaveToFile
                    Me.Enabled = True:  MousePointer = vbDefault
                End If
            End With

        Case MNU_FILE_PRINT                'print
            If MenuPrint Then
                With dlgCdlFile
                    .CancelError = True
                    .Flags = &H40&
                    .ShowPrinter
                End With
            End If
            
            MousePointer = vbHourglass: Me.Enabled = False
            Note = Trim(frmQuarter.txtNote.Text & " ")
            Printer.FontName = "Courier New"
            PrintFile
            MenuPrint = True
            Me.Enabled = True:  MousePointer = vbDefault
            
            'With frmPrint
            '    .Filename = ofn
            '    .Note = Trim(frmQuarter.txtNote.Text & " ")
            '    .DirectPrint
            'End With
            
        'Case MNU_FILE_PRINTSETUP           'print setup...
        '    With frmPrint
        '        .Filename = ofn
        '        .Note = Trim(frmQuarter.txtNote.Text & " ")
        '        .Display vbModal
        '    End With
    
        Case MNU_FILE_PREFERENCES          'preferences...
            frmPreferences.Show vbModal
    
        Case MNU_FILE_EXIT                 'exit
            If TestDirtyMDI = vbCancel Then Exit Sub
            End
    End Select

SubExit:
End Sub

Public Sub mnuGraph_Click(index As Integer)
Dim left1 As Long, left2 As Long, top1 As Long, top2 As Long

    MousePointer = vbHourglass
    
    If index = GPH_RPM_HIST Then
        #If ISQUARTERPRO And Not ISBVPRO Then     'RPM Histogram is QPro only
            frmRPMHist.caption = RemoveAmpersand(mnuGraph(index).caption)
            frmRPMHist.Display
        #End If
    Else
        gf_Graphs(index).GraphIndex = index
        gf_Graphs(index).caption = RemoveAmpersand(mnuGraph(index).caption)
        
        If isTile Then
            left1 = 0:          left2 = (Screen.width - 120) / 2
            top1 = 0:           top2 = (Screen.height - 1500) / 2
            TileWid = left2:    TileHt = top2
            
            Select Case index
                Case GPH_TIME_RPM:  G_left = left1:  G_top = top1
                Case GPH_TIME_G:    G_left = left2:  G_top = top1
                Case GPH_DIST_RPM:  G_left = left1:  G_top = top2
                Case GPH_DIST_G:    G_left = left2:  G_top = top2
            End Select
            gf_Graphs(index).Display G_left, G_top, TileWid, TileHt
        Else
            Select Case index
                Case GPH_TIME_RPM:  G_left = 60:   G_top = 60
                Case GPH_TIME_G:    G_left = 330:  G_top = 330
                Case GPH_DIST_RPM:  G_left = 600:  G_top = 600
                Case GPH_DIST_G:    G_left = 870:  G_top = 870
            End Select
            gf_Graphs(index).Display G_left, G_top
        End If
    End If
    SetGraphEnabled index, False
    
    MousePointer = vbDefault
End Sub

Private Sub mnuWindow_Click(index As Integer)
Dim i As Integer
Dim wasTile As Boolean
    
    Select Case index
        Case MNU_WINDOW_CASCADE   'cascade all graphs (except RPM Histogram)
            wasTile = isTile
            For i = GPH_TIME_RPM To GPH_DIST_G
                If i <> GPH_SEPARATOR Then
                    'If gf_Graphs(i).Visible Then Unload gf_Graphs(i) - this fixed a problem at one time
                    
                    If Not gf_Graphs(i).Visible Then
                        isTile = False
                        mnuGraph_Click i
                    ElseIf wasTile Then
                        isTile = False
                        mnuGraph_Click i
                    End If
        
                    MousePointer = vbHourglass
                End If
            Next
            mnuWindow(MNU_WINDOW_CASCADE).Enabled = False
            mnuWindow(MNU_WINDOW_TILE).Enabled = True
    
        Case MNU_WINDOW_TILE      'tile all graphs (except RPM Histogram)
            wasTile = isTile
            For i = GPH_TIME_RPM To GPH_DIST_G
                If i <> GPH_SEPARATOR Then
                    'If gf_Graphs(i).Visible Then Unload gf_Graphs(i) - this fixed a problem at one time
                    
                    If Not gf_Graphs(i).Visible Then
                        isTile = True
                        mnuGraph_Click i
                    ElseIf Not wasTile Then
                        isTile = True
                        mnuGraph_Click i
                    End If
                    
                    MousePointer = vbHourglass
                End If
            Next
            mnuWindow(MNU_WINDOW_CASCADE).Enabled = True
            mnuWindow(MNU_WINDOW_TILE).Enabled = False

    End Select
    
    MousePointer = vbDefault
End Sub

Private Sub mnuHelp_Click(index As Integer)
    frmSplash.BIsAbout = True
    frmSplash.Display vbModal
End Sub

Private Sub LoadFromFile()
Dim ff As Integer, ofResult As Integer
Dim i As Integer, j As Integer
Dim Note As String, ver As String
Dim lockup As String
Dim over As Integer
Dim ycg As Single, xcg As Single
Dim alt As Single, degf As Single, PBAR As Single, rh As Single
Dim wt As Single, roll As Single, wb As Single, area As Single
Dim BTYPE As Integer, FTYPE As Integer, TTYPE As Integer, ti As Integer
Dim CID As Single, peakhp As Single, rpmhp As Single, CD As Single, CL As Single
Dim Stall As Single, cnvdia As Single, trkt As Single
Dim RGR As Single, td As Single, tw As Single
Dim rmw As Single, rmh As Single, rsf As Single
Dim mpgr As Single, mcst As Single, mrwst As Single
Dim OTW As Single, NOG As Single, WOEG As Single, ENGE As Single
Dim Launch As Single, tmult As Single, CSLIP As Single
Dim rge As Single
Dim EPMOI As Single, TPMOI As Single, RPMOI As Single
Dim wind As Single, WANG As Single
Dim CRNKWT As Single, STROKE As Single, FLYWT As Single, FLYDIA As Single
Dim ZTYPE As Integer
Dim CWT As Single, CDIA As Single
Dim TWT As Single, ztd As Single, WWT As Single, WDIA As Single

#If ISQUARTERPRO Then
    Dim xrpm(0 To 11) As Single
    Dim yhp(0 To 11) As Single
#Else
    Dim xrpm(0 To 16) As Single
    Dim yhp(0 To 16) As Single
#End If

Dim TGR(1 To 6) As Single, TGEff(1 To 6) As Single, shift(1 To 6) As Integer
    
    On Error GoTo BadFileType
    
    bFileExists = False
    If ofn = "" Then Exit Sub
    
    'make sure that file exists
    ofResult = OpenFile(ofn, g_ofstruct, OF_EXIST)
    If ofResult = -1 Then Exit Sub
    
    gc_Barometer.IsCalc = True
    gc_Elevation.IsCalc = True
    gc_TrackTemp.IsCalc = True
    gc_Weight.IsCalc = True
    gc_LaunchRPM.IsCalc = True
    gc_SlipStallRPM.IsCalc = True
    gc_TireWidth.IsCalc = True
    gc_PeakHP.IsCalc = True
    gc_ShiftRPM.IsCalc = True
    gc_Primary.IsCalc = True
    gc_Countershaft.IsCalc = True
    gc_RearWheel.IsCalc = True
    
    #If ISQUARTERPRO Then               'Read QPro/BVPro Data File
        ff = FreeFile
        Open ofn For Input As ff
        Input #ff, ver
        Input #ff, Note
        Input #ff, alt, degf, PBAR, rh, trkt, wt, wb, roll
        If trkt < degf Then trkt = degf + 30 'for old data files
        
        If ver = 3.21 Then
            Input #ff, over, area, CD, CL
        Else
            over = 12
            Input #ff, area, CD, CL
        End If
        
        If ver = 3 Then 'this reads the old DOS data files and can be eliminated someday
            Input #ff, xrpm(1), xrpm(2), xrpm(3), xrpm(4), xrpm(5), xrpm(6), xrpm(7), xrpm(8), xrpm(9), xrpm(10)
            Input #ff, yhp(1), yhp(2), yhp(3), yhp(4), yhp(5), yhp(6), yhp(7), yhp(8), yhp(9), yhp(10)
        Else
            Input #ff, xrpm(1), xrpm(2), xrpm(3), xrpm(4), xrpm(5), xrpm(6), xrpm(7), xrpm(8), xrpm(9), xrpm(10), xrpm(11)
            Input #ff, yhp(1), yhp(2), yhp(3), yhp(4), yhp(5), yhp(6), yhp(7), yhp(8), yhp(9), yhp(10), yhp(11)
        End If
        
        Input #ff, ENGE, FTYPE
        Input #ff, TGR(1), TGR(2), TGR(3), TGR(4), TGR(5), TGR(6)
        Input #ff, TGEff(1), TGEff(2), TGEff(3), TGEff(4), TGEff(5), TGEff(6)
        Input #ff, shift(1), shift(2), shift(3), shift(4), shift(5), shift(6)
        Input #ff, Launch, Stall, tmult, CSLIP, lockup
        Input #ff, RGR, rge, td, tw, ti
        Input #ff, EPMOI, TPMOI, RPMOI
        Input #ff, wind, WANG
        Input #ff, rmw, rmh, rsf
        Input #ff, mpgr, mcst, mrwst
        Input #ff, OTW, NOG, WOEG
        Input #ff, CRNKWT, STROKE, FLYWT, FLYDIA
        Input #ff, ZTYPE, CWT, CDIA
        Input #ff, TWT, ztd, WWT, WDIA
        Close #ff
        
        frmQuarter.txtNote.Text = Note
        gc_Elevation.Value = alt:         gc_Temperature.Value = degf
        gc_Barometer.Value = PBAR:        gc_Humidity.Value = rh
        gc_WindSpeed.Value = wind:        gc_WindAngle.Value = WANG
        gc_TrackTemp.Value = trkt:        gc_TractionIndex.Value = ti
        gc_Weight.Value = wt:             gc_Wheelbase.Value = wb
       
       'calculate QUARTER jr BodyStyle variable based on weight
        CalcBodyStyle frmQuarter.btnGearRatio
        
        #If Not ISBVPRO Then    'QUARTER Pro
            gc_Rollout.Value = roll
            gc_Track.Value = 1
            gc_Overhang.Value = over
            gc_LaunchRPM.Value = Launch
        #Else                   'Bonneville Pro
            gc_Rollout.Value = 0
            gc_Track.Value = roll
            gc_Overhang.Value = 0
            gc_LaunchRPM.Value = xrpm(1)
        #End If
        
        gc_RefArea.Value = area:    gc_DragCoef.Value = CD:     gc_LiftCoef.Value = CL
        
        For i = 1 To 11
            If xrpm(i) = 0 Then Exit For
            clsVals("EngineRPM", i).Value = xrpm(i)
            clsVals("EngineHP", i).Value = yhp(i)
            
            If xrpm(i) = 0 Then
                clsVals("EngineTQ", i).Value = 0
            Else
                clsVals("EngineTQ", i).Value = Z6 * clsVals("EngineHP", i).Value / clsVals("EngineRPM", i).Value
            End If
        Next
        
        CalcPeakHPandRPM
        gc_HPTQMult.Value = ENGE
        gc_FuelSystem.Value = FTYPE
        gc_Nitrous.Value = False
        
        For i = 1 To 6
            clsVals("TransGR", i).Value = TGR(i)
            clsVals("TransEff", i).Value = TGEff(i)
            clsVals("ShiftRPM", i).Value = shift(i)
        Next
        
        gc_SlipStallRPM.Value = Stall
        If gc_SlipStallRPM.Value > 220 Then gc_SlipStallRPM.UOM = UOM_NORMAL
        
        gc_TorqueMult.Value = tmult
        gc_TransType.Value = IIf(tmult = 1, False, True)
        gc_Slippage.Value = CSLIP
        
        If lockup = "N" Then
            gc_LockUp.Value = False
        Else
            gc_LockUp.Value = True
        End If
        
        gc_GearRatio.Value = RGR:         gc_Efficiency.Value = rge
        gc_TireDia.Value = td:            gc_TireWidth.Value = tw
        
        gc_EnginePMI.Value = EPMOI:       gc_TransPMI.Value = TPMOI
        gc_TiresPMI.Value = RPMOI
        
        gc_MaxWidth.Value = rmw:          gc_MaxHeight.Value = rmh
        gc_ShapeFactor.Value = rsf
        
        gc_Primary.Value = mpgr:          gc_Countershaft.Value = mcst
        gc_RearWheel.Value = mrwst
        
        gc_TreadWidth.Value = OTW:        gc_Grooves.Value = NOG
        gc_GrooveWidth.Value = WOEG
        
        gc_CrankWt.Value = CRNKWT:        gc_CrankStroke.Value = STROKE
        gc_FlywheelWt.Value = FLYWT:      gc_FlywheelDia.Value = FLYDIA
        
        gc_WSTransType.Value = ZTYPE:    gc_TransWt.Value = CWT
        gc_CaseDia.Value = CDIA
        
        gc_TireWt.Value = TWT:            gc_WSTireDia.Value = ztd
        gc_WheelWt.Value = WWT:           gc_WheelDia.Value = WDIA
        
    #Else                               'Read QUARTER jr Data File
        ff = FreeFile
        Open ofn For Input As ff
        Input #ff, ver
        Input #ff, Note
        Input #ff, alt, degf, PBAR, rh
        Input #ff, wt, roll, wb, area, BTYPE
        Input #ff, CID, peakhp, rpmhp, shift(1), FTYPE
        Input #ff, TGR(1), TGR(2), TGR(3), TGR(4), TGR(5), TGR(6)
        Input #ff, TTYPE, Stall, lockup, cnvdia
        Input #ff, RGR, td, tw, ti
        Input #ff, rmw, rmh, rsf
        Input #ff, mpgr, mcst, mrwst
        Input #ff, OTW, NOG, WOEG
        Close #ff
        
        frmQuarter.txtNote.Text = Note
        gc_Elevation.Value = alt:        gc_Temperature.Value = degf
        gc_Barometer.Value = PBAR:       gc_Humidity.Value = rh
        gc_Weight.Value = wt:            gc_Rollout.Value = roll
        gc_Wheelbase.Value = wb:         gc_RefArea.Value = area
        gc_BodyStyle.Value = BTYPE
        
        gc_Displacement.Value = CID:      gc_PeakHP.Value = peakhp
        gc_RPMPeakHP.Value = rpmhp:       gc_ShiftRPM.Value = shift(1)
        
        If FTYPE > 0 Then
            gc_FuelSystem.Value = FTYPE
            gc_Nitrous.Value = False
        Else
            gc_FuelSystem.Value = -FTYPE
            gc_Nitrous.Value = True
        End If
        
        For i = 1 To 6
            clsVals("TransGR", i).Value = TGR(i)
        Next
        
        gc_TransType.Value = IIf(TTYPE = 1, False, True)
        
        If Stall > 0 And Stall >= shift(1) Then Stall = shift(1) - 100
        gc_SlipStallRPM.Value = Stall
        If gc_SlipStallRPM.Value > 220 Then gc_SlipStallRPM.UOM = UOM_NORMAL
        
        If lockup = "N" Then
            gc_LockUp.Value = False
        Else
            gc_LockUp.Value = True
        End If
        
        gc_ConvDia.Value = cnvdia
        
        gc_GearRatio.Value = RGR:       gc_TireDia.Value = td
        gc_TireWidth.Value = tw:        gc_TractionIndex.Value = ti
        
        gc_MaxWidth.Value = rmw:        gc_MaxHeight.Value = rmh
        gc_ShapeFactor.Value = rsf
        
        gc_Primary.Value = mpgr:        gc_Countershaft.Value = mcst
        gc_RearWheel.Value = mrwst
        
        gc_TreadWidth.Value = OTW:      gc_Grooves.Value = NOG
        gc_GrooveWidth.Value = WOEG
        
       'set remaining QUARTER Pro input variables
        gc_WindSpeed.Value = 0:         gc_WindAngle.Value = 0
        trkt = degf + 30
        gc_TrackTemp.Value = trkt:      gc_Track.Value = 1
        gc_DragCoef.Value = 0:          gc_LiftCoef.Value = 0:      gc_Overhang.Value = 0
        gc_HPTQMult.Value = 1
        gc_LaunchRPM.Value = gc_SlipStallRPM.Value
        gc_TorqueMult.Value = 1:        gc_Slippage.Value = 1
        gc_Efficiency.Value = 1
        gc_EnginePMI.Value = 0:         gc_TransPMI.Value = 0
        gc_TiresPMI.Value = 0
        gc_CrankWt.Value = 0:           gc_CrankStroke.Value = 0
        gc_FlywheelWt.Value = 0:        gc_FlywheelDia.Value = 0
        gc_WSTransType.Value = 0:       gc_TransWt.Value = 0
        gc_CaseDia.Value = 0
        gc_TireWt.Value = 0:            gc_WSTireDia.Value = 0
        gc_WheelWt.Value = 0:           gc_WheelDia.Value = 0
    #End If
    
    lastfile = ofn
    bFileExists = True
    frmQuarter.FileDirty = False     'mark as not changed
    isTile = False
    Exit Sub
    
BadFileType:
    MsgBox "Bad file type/format.  Data file must be in *.DAT format.", vbExclamation, "Data File Error!"
    If lastfile = "" Then
        mnuFile_Click MNU_FILE_OPEN
    Else
        ofn = lastfile
        Me.caption = App.ProductName & " - " & NameOnly(ofn)
        Exit Sub
        Resume Next
    End If
End Sub

Private Sub SaveToFile()
Dim ff As Integer
Dim i As Integer, j As Integer
Dim Note As String
Dim lockup As String
Dim over As Integer
Dim alt As Single, degf As Single, PBAR As Single, rh As Single
Dim wt As Single, roll As Single, wb As Single, area As Single
Dim CID As Single, peakhp As Single, rpmhp As Single
Dim BTYPE As Integer, FTYPE As Integer, TTYPE As Integer, ti As Integer
Dim Stall As Single, cnvdia As Single, trkt As Single
Dim RGR As Single, td As Single, tw As Single
Dim rmw As Single, rmh As Single, rsf As Single, rge As Single
Dim mpgr As Single, mcst As Single, mrwst As Single
Dim OTW As Single, NOG As Single, WOEG As Single
Dim wind As Single, WANG As Single
Dim CD As Single, CL As Single, ENGE As Single, Launch As Single, tmult As Single, CSLIP As Single
Dim EPMOI As Single, TPMOI As Single, RPMOI As Single
Dim CRNKWT As Single, STROKE As Single, FLYWT As Single, FLYDIA As Single
Dim ZTYPE As Integer
Dim CWT As Single, CDIA As Single
Dim TWT As Single, ztd As Single, WWT As Single, WDIA As Single

#If ISQUARTERPRO Then
    Dim xrpm(0 To 11) As Single
    Dim yhp(0 To 11) As Single
#Else
    Dim xrpm(0 To 16) As Single
    Dim yhp(0 To 16) As Single
#End If

Dim TGR(1 To 6) As Single, TGEff(1 To 6) As Single, shift(1 To 6) As Integer
    
    bFileExists = False
    If ofn = "" Then Exit Sub
    
    Note = Trim(frmQuarter.txtNote.Text & " ")
    alt = gc_Elevation.Value:         degf = gc_Temperature.Value
    PBAR = gc_Barometer.Value:        rh = gc_Humidity.Value
    wind = gc_WindSpeed.Value:        WANG = gc_WindAngle.Value
    trkt = gc_TrackTemp.Value:        ti = gc_TractionIndex.Value
    wt = gc_Weight.Value:             wb = gc_Wheelbase.Value
    
    #If Not ISBVPRO Then    'QUARTER jr and QUARTER Pro
        roll = gc_Rollout.Value
        over = gc_Overhang.Value
    #Else                   'Bonneville Pro
        roll = gc_Track.Value
        over = 0
    #End If
    
    area = gc_RefArea.Value
    CD = gc_DragCoef.Value:           CL = gc_LiftCoef.Value
    
    ENGE = gc_HPTQMult.Value:         FTYPE = gc_FuelSystem.Value
    
    Launch = gc_LaunchRPM.Value:      Stall = gc_SlipStallRPM.Value
    tmult = gc_TorqueMult.Value:      CSLIP = gc_Slippage.Value
    
    If gc_LockUp.Value Then
        lockup = "Y"
    Else
        lockup = "N"
    End If
    
    RGR = gc_GearRatio.Value:         rge = gc_Efficiency.Value
    td = gc_TireDia.Value:            tw = gc_TireWidth.Value
    
    EPMOI = gc_EnginePMI.Value:       TPMOI = gc_TransPMI.Value
    RPMOI = gc_TiresPMI.Value
    
    rmw = gc_MaxWidth.Value:          rmh = gc_MaxHeight.Value
    rsf = gc_ShapeFactor.Value
    
    mpgr = gc_Primary.Value:          mcst = gc_Countershaft.Value
    mrwst = gc_RearWheel.Value
    
    OTW = gc_TreadWidth.Value:        NOG = gc_Grooves.Value
    WOEG = gc_GrooveWidth.Value
    
    CRNKWT = gc_CrankWt.Value:        STROKE = gc_CrankStroke.Value
    FLYWT = gc_FlywheelWt.Value:      FLYDIA = gc_FlywheelDia.Value
    
    ZTYPE = gc_WSTransType.Value:       CWT = gc_TransWt.Value
    CDIA = gc_CaseDia.Value
    
    TWT = gc_TireWt.Value:            ztd = gc_WSTireDia.Value
    WWT = gc_WheelWt.Value:           WDIA = gc_WheelDia.Value
    
    #If ISQUARTERPRO Then            'Write QUARTER Pro/Bonneville Pro Data File
        For i = 1 To 11
            xrpm(i) = clsVals("EngineRPM", i).Value
            yhp(i) = clsVals("EngineHP", i).Value
        Next
        
        For i = 1 To 6
            TGR(i) = clsVals("TransGR", i).Value
            TGEff(i) = clsVals("TransEff", i).Value
            shift(i) = clsVals("ShiftRPM", i).Value
        Next
     
        ff = FreeFile
        Open ofn For Output As ff
        Print #ff, Chr$(34); 3.21; Chr$(34)
        Print #ff, Chr$(34); Note; Chr$(34)
        Print #ff, alt; degf; PBAR; rh; trkt; wt; wb; roll
        Print #ff, over; area; CD; CL
        Print #ff, xrpm(1); xrpm(2); xrpm(3); xrpm(4); xrpm(5); xrpm(6); xrpm(7); xrpm(8); xrpm(9); xrpm(10); xrpm(11)
        Print #ff, yhp(1); yhp(2); yhp(3); yhp(4); yhp(5); yhp(6); yhp(7); yhp(8); yhp(9); yhp(10); yhp(11)
        Print #ff, ENGE; FTYPE
        Print #ff, TGR(1); TGR(2); TGR(3); TGR(4); TGR(5); TGR(6)
        Print #ff, TGEff(1); TGEff(2); TGEff(3); TGEff(4); TGEff(5); TGEff(6)
        Print #ff, shift(1); shift(2); shift(3); shift(4); shift(5); shift(6)
        Print #ff, Launch, Stall; tmult; CSLIP; Chr$(34); lockup; Chr$(34)
        Print #ff, RGR; rge; td; tw; ti
        Print #ff, EPMOI; TPMOI; RPMOI
        Print #ff, wind; WANG
        Print #ff, rmw; rmh; rsf
        Print #ff, mpgr; mcst; mrwst
        Print #ff, OTW; NOG; WOEG
        Print #ff, CRNKWT; STROKE; FLYWT; FLYDIA
        Print #ff, ZTYPE; CWT; CDIA
        Print #ff, TWT; ztd; WWT; WDIA
        Close #ff
    
    #Else                            'Write QUARTER jr Data File
        BTYPE = gc_BodyStyle.Value
        CID = gc_Displacement.Value
        peakhp = gc_PeakHP.Value
        If gc_Nitrous.Value Then FTYPE = -FTYPE
        rpmhp = gc_RPMPeakHP.Value
        shift(1) = gc_ShiftRPM.Value
        TTYPE = IIf(gc_TransType.Value, 2, 1)
        cnvdia = gc_ConvDia.Value
        
        For i = 1 To 6
            TGR(i) = clsVals("TransGR", i).Value
        Next
        
        ff = FreeFile
        Open ofn For Output As ff
        Print #ff, Chr$(34); 3; Chr$(34)
        Print #ff, Chr$(34); Note; Chr$(34)
        Print #ff, alt; degf; PBAR; rh
        Print #ff, wt; roll; wb; area; BTYPE
        Print #ff, CID; peakhp; rpmhp; shift(1); FTYPE
        Print #ff, TGR(1); TGR(2); TGR(3); TGR(4); TGR(5); TGR(6)
        Print #ff, TTYPE; Stall; Chr$(34); lockup; Chr$(34); cnvdia
        Print #ff, RGR; td; tw; ti
        Print #ff, rmw; rmh; rsf
        Print #ff, mpgr; mcst; mrwst
        Print #ff, OTW; NOG; WOEG
        Close #ff
    #End If
    
    bFileExists = True
    frmQuarter.FileDirty = False     'mark as not changed
End Sub

Private Function TestDirtyMDI()
    TestDirtyMDI = frmQuarter.TestDirty()
    If TestDirtyMDI = vbYes Then
        If bFileExists Then
            mnuFile_Click MNU_FILE_SAVE
        Else
            mnuFile_Click MNU_FILE_SAVEAS
        End If
    End If
End Function
