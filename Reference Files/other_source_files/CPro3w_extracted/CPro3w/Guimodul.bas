Attribute VB_Name = "modGUIModule"
Option Explicit

Public Const PNL_SET = 0
Public Const PNL_SAVE = 1
Public Const PNL_RESET = 2
Private vbreply As Integer

Public Sub SetClutchStrings()
    With gc_RingHt1
        If Not isGlide Then
            .UOM = UOM_NORMAL
            .StatusMsg = "The installed clutch ring height.  Changing the ring height may require a change to the Static Plate Force!"
        Else
            .UOM = UOM_ALTERNATE
            .StatusMsg = "The installed clutch pack clearance."
        End If
            
        gc_RingHt1.Value = gc_RingHt1.Value
        
        gc_RingHt2.UOM = .UOM
        gc_RingHt2.StatusMsg = .StatusMsg
        gc_RingHt2.Value = gc_RingHt2.Value
    End With
    
    With gc_ArmDepth1
        If Not isBike Then
            .UOM = UOM_NORMAL
            .StatusMsg = "The measured depth (or distance) from the top of the cover to the arm in inches."
        Else
            .UOM = UOM_ALTERNATE
            .StatusMsg = "The force that the installed return spring pushes on each arm in lbs."
        End If
            
        gc_ArmDepth1.Value = gc_ArmDepth1.Value
        
        gc_ArmDepth2.UOM = .UOM
        gc_ArmDepth2.StatusMsg = .StatusMsg
        gc_ArmDepth2.Value = gc_ArmDepth2.Value
    End With
    
    With frmClutch
        If AData(gc_Mfg1.Value, 8) > 0 Or AData(gc_Mfg2.Value, 8) > 0 Then
            #If ISCLUTCHJR Then
                .Frame7.Height = 2070   'spread out more in CLUTCHjr
            #Else
                .Frame7.Height = 1890
            #End If
            
            .Label1(38).Visible = True
            .txtArmDepth1.Visible = True
            .txtArmDepth2.Visible = True
        Else
            #If ISCLUTCHJR Then
                .Frame7.Height = 1770   'spread out more in CLUTCHjr
            #Else
                .Frame7.Height = 1620
            #End If
            
            .Label1(38).Visible = False
            .txtArmDepth1.Visible = False
            .txtArmDepth2.Visible = False
        End If
    End With
    
    #If ISCLUTCHJR Then
        frmClutch.SetSpringStrings
    #Else
        SetLaunchStrings
    #End If
End Sub

Public Sub SetSave(code As Single)
Dim i As Integer
    If code = 0 Then
        'set comparison graph data values to zero
        StaticSave = 0
        CF1Save = 0:            CF2Save = 0
        RetLbf1Save = 0:        RetLbf2Save = 0
        RPMLOSave = 0:          RPMHISave = 0:      LaunchRPMSave = 0
        ZLOSave = 0:            ZHISave = 0
        For i = 1 To NTQ
            CTQLOSave(i) = 0:   CTQHISave(i) = 0
            ETQLOSave(i) = 0:   ETQHISave(i) = 0
        Next
    Else
        'save comparison graph data values
        StaticSave = gc_Static.Value
        CF1Save = CF1:              CF2Save = CF2
        RetLbf1Save = RetLbf1:      RetLbf2Save = RetLbf2
        RPMLOSave = RPMLO:          RPMHISave = RPMHI:      LaunchRPMSave = gc_LaunchRPM.Value
        ZLOSave = ZLO:              ZHISave = ZHI
        For i = 1 To NTQ
            CTQLOSave(i) = CTQLO(i):    CTQHISave(i) = CTQHI(i)
            ETQLOSave(i) = ETQLO(i):    ETQHISave(i) = ETQHI(i)
        Next
    End If
End Sub

Public Sub ForceGridUpdate(Grd As DBGrid)
'Dim ColIndex As Integer
Dim RowIndex As Integer
    With Grd
       'ColIndex = .col
        RowIndex = .row
        
        'this section forces the update of the cell value
        'If .row = 0 Then
        '    .row = .row + 1
        'Else
        '    .row = .row - 1
        'End If
        
        .Refresh
        .row = RowIndex
        '.col = ColIndex
    End With
End Sub

Public Sub SetGridFocus(Grd As DBGrid, ColIndex As Integer, RowIndex As Integer)
    With Grd
        .col = ColIndex
        .row = RowIndex
        .SetFocus
    End With
End Sub

Public Sub SetClutchGrid()
Dim i As Integer
    With gc_grdClutch
        .Grd = frmClutch.grdClutch
        .Msg = "Clutch Data"
        .StatusMsg = "Calculated clutch plate forces as a function of engine RPM.  Includes the static, centrifugal and total plate force in lbs."
        .MaxCol = 3
        .MaxRow = DYNO_ROWS    '.MaxRow must come after .MaxCol!
        For i = 0 To .MaxCol - 1
            frmClutch.grdClutch.Columns(i).NumberFormat = "#####;;#"
            frmClutch.grdClutch.Columns(i).Alignment = 1   'right
            .dbgCols(i) = frmClutch.grdClutch.Columns(i)
        Next
            '.dbgColMins(0) = 1: .dbgColMaxs(0) = 9000
            '.dbgColMins(1) = 1: .dbgColMaxs(1) = 9000
            '.dbgColMins(2) = 1: .dbgColMaxs(2) = 9000
    End With
    
    frmClutch.grdClutch.col = 0
    frmClutch.grdClutch.row = 0
End Sub

Public Sub setpanels(frm As Form, Action As Integer, p_obj As Object, Optional ColIndex As Integer = -1)
Dim spfrm As Form
    Set spfrm = frm
    If TypeOf frm Is frmClutch Then
        Set spfrm = frmClutch       'frm.ActiveForm
    End If
    
    On Error GoTo exitpanels
    'If Screen.ActiveForm.Name <> spfrm.Name Then Exit Sub
    
    If Action = PNL_SAVE Then
        If spfrm.Visible Then
            If TypeOf spfrm.ActiveControl Is TextBox Then
                SelTextBoxText frm.ActiveControl
            End If
        End If
        Set spfrm.fc_Value = p_obj
    End If
    
   'set panels
    Select Case Action
        Case PNL_SET, PNL_SAVE
            spfrm.PnlInput(0).caption = p_obj.StatusMsg
            
            If TypeOf p_obj Is CValue Then
                spfrm.PnlInput(1).caption = p_obj.MinValTxt
                spfrm.PnlInput(2).caption = p_obj.MaxValTxt
            ElseIf TypeOf p_obj Is CGrid Then
                If ColIndex = -2 Then 'test for grdClutch
                    spfrm.PnlInput(1).caption = ""
                    spfrm.PnlInput(2).caption = ""
                Else
                    spfrm.PnlInput(1).caption = p_obj.MinTxt(ColIndex)
                    spfrm.PnlInput(2).caption = p_obj.MaxTxt(ColIndex)
                End If
            Else
                spfrm.PnlInput(1).caption = ""
                spfrm.PnlInput(2).caption = ""
            End If
        
        Case Else    'should only be PNL_RESET
            spfrm.PnlInput(0).caption = frm.fc_Value.StatusMsg
            
            If TypeOf p_obj Is CValue Then
                spfrm.PnlInput(1).caption = spfrm.fc_Value.MinValTxt
                spfrm.PnlInput(2).caption = spfrm.fc_Value.MaxValTxt
            ElseIf TypeOf p_obj Is CGrid Then
                If ColIndex = -2 Then 'test for grdClutch
                    spfrm.PnlInput(1).caption = ""
                    spfrm.PnlInput(2).caption = ""
                Else
                    spfrm.PnlInput(1).caption = spfrm.fc_Value.MinTxt(spfrm.fc_Value.Grd.col)
                    spfrm.PnlInput(2).caption = spfrm.fc_Value.MaxTxt(spfrm.fc_Value.Grd.col)
                End If
            Else
                spfrm.PnlInput(1).caption = ""
                spfrm.PnlInput(2).caption = ""
            End If
    End Select

exitpanels:
End Sub

Public Sub SelGridText(Grd As DBGrid)
    If Len(Grd.Columns(Grd.col)) > 0 Then
        Grd.SelStart = 0
        Grd.SelLength = Len(Grd.Columns(Grd.col))
    End If
End Sub

Public Sub winCenter(frm As Form)
Dim lOffset
Dim tOffset
    lOffset = (Screen.Width - frm.Width) / 2
    tOffset = (Screen.Height - frm.Height) / 2
    
    frm.Move lOffset, tOffset
End Sub

Public Sub winOnTop(frmTop As Form, bSetOnTop As Boolean)
    If bSetOnTop = True Then    'Set the window to topmost window
        Call SetWindowPos(frmTop.hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOSIZE Or SWP_NOMOVE Or SWP_NOACTIVATE)
    Else                        'Set the window to not topmost window
        Call SetWindowPos(frmTop.hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOSIZE Or SWP_NOMOVE Or SWP_NOACTIVATE)
    End If
End Sub

Public Function RightAlign(maxlen As Integer, decimals As Integer, Value As Variant, Optional AddComma As Variant)
Dim Work As String
Dim fmt As String
Dim docomma As Boolean
    
    If IsMissing(AddComma) Then
        docomma = False
    Else
        docomma = AddComma
    End If
    
    If decimals > 0 Then
        Work = Space(maxlen + 1)
        
        If Value < 1 Then
            fmt = String(maxlen - decimals - 1, "#") & "0."
        Else
            fmt = String(maxlen - decimals, "#") & "."
        End If
        
        fmt = fmt & String(decimals, "0")
        RSet Work = Format(Value, fmt)
    Else
        Work = Space(maxlen + IIf(docomma, 1, 0))
        
        If docomma Then
            fmt = "#,##0"
        Else
            fmt = String(maxlen - 1, "#") & "0"
        End If
        
        RSet Work = Format(Value, fmt)
    End If
    
    RightAlign = Work
End Function
