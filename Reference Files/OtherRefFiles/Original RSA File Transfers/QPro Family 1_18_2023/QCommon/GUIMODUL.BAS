Attribute VB_Name = "modGUIModule"
Option Explicit
Option Compare Text

Private mGraphsOpen As Integer

Public Sub GetPreferences(pth As String, wsopt As Integer, gphopt As Integer, gpgopt As Integer)
    pth = GetSetting(Trim(App.EXEName), "Defaults", "DataFilePath", App.Path)
    wsopt = Int(GetSetting(Trim(App.EXEName), "Defaults", "Worksheets", "0"))
    gphopt = Int(GetSetting(Trim(App.EXEName), "Defaults", "Graph", "0"))
    gpgopt = Int(GetSetting(Trim(App.EXEName), "Defaults", "PerPage", "0"))
End Sub

Public Sub SavePreferences(pth As String, wsopt As Integer, gphopt As Integer, gpgopt As Integer)
    SaveSetting Trim(App.EXEName), "Defaults", "DataFilePath", pth
    SaveSetting Trim(App.EXEName), "Defaults", "Worksheets", Format(wsopt)
    SaveSetting Trim(App.EXEName), "Defaults", "Graph", Format(gphopt)
    SaveSetting Trim(App.EXEName), "Defaults", "PerPage", Format(gpgopt)
End Sub

Public Sub SetRunEnabled(setting As Boolean)
    With FrmMDI
        .mnuMain(MNU_MAIN_RUN).Enabled = setting
        .mnuWindow(MNU_WINDOW_CASCADE).Enabled = Not setting
        .mnuWindow(MNU_WINDOW_TILE).Enabled = Not setting
    
        .cmdsBtnRun.Enabled = setting
        If setting Then
            .cmdsBtnRun.Picture = frmBmps.picEnabled(2).Picture
        Else
            .cmdsBtnRun.Picture = frmBmps.picDisabled(2).Picture
        End If
    End With
End Sub

Public Sub SetPrintEnabled(setting As Boolean)
    With FrmMDI
        .mnuFile(MNU_FILE_PRINT).Enabled = setting
       '.mnuFile(MNU_FILE_PRINTSETUP).Enabled = setting
    
        .cmdsBtnPrint.Enabled = setting
        If setting Then
            .cmdsBtnPrint.Picture = frmBmps.picEnabled(5).Picture
        Else
            .cmdsBtnPrint.Picture = frmBmps.picDisabled(5).Picture
        End If
    End With
End Sub

Public Sub setGraphEnabledAll(setting As Boolean)
Dim i As Integer
    FrmMDI.mnuMain(MNU_MAIN_GRAPH).Enabled = setting
    
    For i = GPH_TIME_RPM To GPH_DIST_G
        SetGraphEnabled i, setting
    Next
    SetGraphEnabled GPH_RPM_HIST, setting
End Sub

Public Sub SetGraphEnabled(GraphIndex As Integer, setting As Boolean)
    If GraphIndex <> GPH_SEPARATOR Then
        With FrmMDI
            .mnuGraph(GraphIndex).Enabled = setting
            .cmdsBtnGraph(GraphIndex).Enabled = setting
            #If Not ISBVPRO Then    'QUARTERjr and QUARTER Pro
                If setting Then
                    .cmdsBtnGraph(GraphIndex).Picture = frmBmps.picEnabled(GraphIndex).Picture
                Else
                    .cmdsBtnGraph(GraphIndex).Picture = frmBmps.picDisabled(GraphIndex).Picture
                End If
            #Else                   'Bonneville Pro
                If setting Then
                    If GraphIndex = 1 Then
                        .cmdsBtnGraph(GraphIndex).Picture = frmBmps.picEnabled(7).Picture
                    Else
                        .cmdsBtnGraph(GraphIndex).Picture = frmBmps.picEnabled(GraphIndex).Picture
                    End If
                Else
                    If GraphIndex = 1 Then
                        .cmdsBtnGraph(GraphIndex).Picture = frmBmps.picDisabled(7).Picture
                    Else
                        .cmdsBtnGraph(GraphIndex).Picture = frmBmps.picDisabled(GraphIndex).Picture
                    End If
                End If
            #End If
        End With
    End If
End Sub

Public Function GraphsOpen() As Integer
    GraphsOpen = mGraphsOpen
End Function

Public Sub GraphsOpenIncrement(vNewValue As Integer)
    mGraphsOpen = mGraphsOpen + vNewValue
End Sub

Public Sub UnloadForms()
Dim i As Integer
    For i = (Forms.Count - 1) To 1 Step -1
        If Not TypeOf Forms(i) Is FrmMDI Then
            If Not TypeOf Forms(i) Is frmQuarter Then
                Unload Forms(i)
            End If
        End If
    Next
End Sub

Public Sub HideForms()
Dim i As Integer
    For i = (Forms.Count - 1) To 1 Step -1
        If Not TypeOf Forms(i) Is FrmMDI Then
            If Not TypeOf Forms(i) Is frmQuarter Then
                Forms(i).Hide
            End If
        End If
    Next
    
    setGraphEnabledAll False
    SetPrintEnabled False
    SetRunEnabled True
End Sub

Public Sub ShapeShifter(s1 As Shape, s2 As Shape, Optional lbl As Variant)
    s2.width = s1.width
    s2.height = s1.height
    s2.top = s1.top + 15
    s2.left = s1.left + 15
    
    If Not IsMissing(lbl) Then
        If TypeOf lbl Is Label Then
            lbl.caption = " " & Trim(lbl.caption) & " "
            lbl.left = s1.left + (s1.width / 2) - (lbl.width / 2)
            lbl.top = s1.top - (lbl.height / 2)
        End If
    End If
End Sub

Public Sub SetHelp(frm As Form, Action As Integer, p_obj As Object, Optional ColIndex As Integer = -1)
Dim SHfrm As Form
    Set SHfrm = frm
    If TypeOf frm Is MDIForm Then
        If frm.ActiveForm Is Nothing Then
            Exit Sub
        Else
            Set SHfrm = frmQuarter   'frm.ActiveForm
        End If
    ElseIf TypeOf frm Is frmTimeSlip Then
        Set SHfrm = frmQuarter       'frm.ActiveForm
    End If
    
    On Error GoTo ExitHelp
    'If Screen.ActiveForm.Name <> SHfrm.Name Then Exit Sub
    
    With SHfrm
        If Action = HELP_SAVE Then
            If .Visible Then
                If TypeOf .ActiveControl Is TextBox Then
                    SelTextBoxText frm.ActiveControl
                End If
            End If
            Set .fc_Value = p_obj
        End If
    
        'set labels
        Select Case Action
            Case HELP_SET, HELP_SAVE
                If TypeOf p_obj Is CValue Then
                    .lblHELP(0).caption = p_obj.StatusMsg
                    .lblHELP(1).caption = p_obj.MinValTxt
                    .lblHELP(2).caption = p_obj.MaxValTxt
                
                Else
                    .lblHELP(0).caption = p_obj.StatusMsg(ColIndex)
                    .lblHELP(1).caption = ""
                    .lblHELP(2).caption = ""
                End If
            
            Case Else    'should only be HELP_RESET
                If TypeOf .fc_Value Is CValue Then
                    .lblHELP(0).caption = .fc_Value.StatusMsg
                    .lblHELP(1).caption = .fc_Value.MinValTxt
                    .lblHELP(2).caption = .fc_Value.MaxValTxt
                Else
                    .lblHELP(0).caption = .fc_Value.StatusMsg(ColIndex)
                    .lblHELP(1).caption = ""
                    .lblHELP(2).caption = ""
                End If
        End Select
    End With

ExitHelp:
End Sub

Public Function RemoveAmpersand(istr As String) As String
Dim i As Integer
Dim jstr As String
    jstr = istr
    i = InStr(istr, "&")
    If i > 0 Then jstr = left(istr, i - 1) & Mid(istr, i + 1)
    
    RemoveAmpersand = jstr
    i = InStr(jstr, "&")
    If i > 0 Then RemoveAmpersand = left(jstr, i - 1) & Mid(jstr, i + 1)
End Function
