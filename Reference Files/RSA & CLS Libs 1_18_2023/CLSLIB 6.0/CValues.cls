VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "CValues"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = True
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private mCol As Collection
Private mclsError As New CError

Public Sub Add(ByVal ValueName As String, Optional index As Integer = -1)
Dim objNewvalue As CValue
    'create a new object
    Set objNewvalue = New CValue
    objNewvalue.NAME = ValueName
    objNewvalue.index = index
    objNewvalue.Error = mclsError
    'objNewvalue.IsLoad = IsLoad    'removed IsLoad from FOURLINK - 09/30/2003
    
    mCol.Add objNewvalue, ValueName & CStr(index)
    Set objNewvalue = Nothing
End Sub

Public Property Get Item(ByVal ValueName As String, Optional index As Integer = -1) As CValue
Attribute Item.VB_UserMemId = 0
Dim vntIndexKey As Variant
    On Error GoTo ItemError
    
    vntIndexKey = ValueName & CStr(index)
    Set Item = mCol(vntIndexKey)
    Exit Property

ItemError:
    Set Item = Nothing
End Property

Public Sub Clear()
Dim cv As CValue
    For Each cv In mCol
        mCol.Remove cv.NAME
    Next
End Sub

Public Property Get Count() As Long
    'used when retrieving the number of elements in the collection.  Syntax: Debug.Print x.Count
    Count = mCol.Count
End Property

Public Sub Remove(ByVal ValueName As String, Optional index As Integer = -1)
Dim vntIndexKey As Variant
    'used when removing an element from the collection.  vntIndexKey contains either
    'the Index or Key, which is why it is declared as a Variant.  Syntax: x.Remove(xyz)
    On Error Resume Next
    vntIndexKey = ValueName & CStr(index)
    mCol.Remove vntIndexKey
End Sub

Public Property Get NewEnum() As IUnknown
Attribute NewEnum.VB_UserMemId = -4
Attribute NewEnum.VB_MemberFlags = "40"
    Set NewEnum = mCol.[_NewEnum]
End Property

Private Sub Class_Initialize()
    'creates the collection when this class is created
    Set mCol = New Collection
End Sub

Private Sub Class_Terminate()
    'destroys collection when this class is terminated
    Set mCol = Nothing
End Sub
