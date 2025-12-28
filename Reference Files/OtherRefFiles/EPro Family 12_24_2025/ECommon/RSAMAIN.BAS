Attribute VB_Name = "RSAMain"
Option Explicit

Public Sub Main()
    frmSplash.Show
    DoEvents
    frmENGINE.Display
End Sub

Public Sub SetHelp(frm As Form, Action As Integer, p_obj As Object, Optional ColIndex As Integer = -1)
Dim SHfrm As Form
    Set SHfrm = frm
    'If TypeOf frm Is frmMain Then
    '    Set SHfrm = frmMain    'or frm.ActiveForm
    'End If
    
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
                If TypeOf p_obj Is cValue Then
                    .lblHELP(0).caption = p_obj.StatusMsg
                    .lblHELP(1).caption = p_obj.MinValTxt
                    .lblHELP(2).caption = p_obj.MaxValTxt
                Else
                    .lblHELP(0).caption = p_obj.StatusMsg(ColIndex)
                    .lblHELP(1).caption = ""
                    .lblHELP(2).caption = ""
                End If
            
            Case Else    'should only be HELP_RESET
                If TypeOf .fc_Value Is cValue Then
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

