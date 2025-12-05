VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "CButton"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private mForm As Form
Private mStatusMsg As String
Private mValue As Integer

Public Property Get StatusMsg() As String
    StatusMsg = mStatusMsg
End Property

Public Property Let StatusMsg(vNewValue As String)
    mStatusMsg = vNewValue
End Property

Public Property Get Value() As Single
    Value = mValue
End Property

Public Property Let Value(ByVal vNewValue As Single)
    If vNewValue = mValue Then Exit Property

    mValue = vNewValue
    If Not ParentForm Is Nothing Then
        If ParentForm.Visible Then ParentForm.FileDirty = True
    End If
End Property

Public Property Get ParentForm() As Form
    If mForm Is Nothing Then
        Set ParentForm = Nothing
        Exit Property
    Else
        Set ParentForm = mForm
    End If
End Property

Public Property Let ParentForm(vNewValue As Form)
    Set mForm = vNewValue
End Property
