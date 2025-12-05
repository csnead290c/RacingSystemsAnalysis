VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "CError"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private mRSAError As Integer
Private mRSAErrorMsg As String
Private mType As Integer
Private mCaption As String
Private mAnswer As Boolean
Private mvbReply As Integer

Public Property Get vbreply() As Integer
    vbreply = mvbReply
End Property

Public Property Let vbreply(vNewValue As Integer)
    mvbReply = vNewValue
End Property

Public Sub Display()
    If mAnswer Then
        vbreply = MsgBox(mRSAErrorMsg, mType, mCaption)
    Else
        MsgBox mRSAErrorMsg, mType, mCaption
        vbreply = 0
    End If
End Sub

Public Sub RSAErrorMsg(vNewValue As String, Optional ERAnswer As Variant, Optional EType As Variant, Optional caption As Variant)
    On Error Resume Next
    
    If IsMissing(ERAnswer) Then
        mAnswer = False
    Else
        mAnswer = Answer
    End If
    
    If IsMissing(EType) Then
        mType = 0
    Else
        mType = EType
    End If
    
    If IsMissing(caption) Then
        mCaption = "RSA Error"
    Else
        mCaption = caption
    End If
    
    mRSAErrorMsg = vNewValue
End Sub

Public Property Get Answer() As Boolean
    Answer = mAnswer
End Property

Public Property Let Answer(vNewValue As Boolean)
    mAnswer = vNewValue
End Property

Private Sub Class_Initialize()
    mAnswer = False
End Sub
