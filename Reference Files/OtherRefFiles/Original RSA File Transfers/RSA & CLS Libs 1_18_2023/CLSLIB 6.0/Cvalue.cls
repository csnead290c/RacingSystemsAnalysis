VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "CValue"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private mUnitNormal As String
Private mForm As Form
Private mUnitAlternate As String
Private mLabelctl As Label
Private mClsControl As Control
Private mCaption As String
Private mList() As String
Private mlblIndex As Integer
Private mListcount As Integer
Private mHasList As Boolean
Private mIsCalc As Boolean
Private mIsChanged As Boolean
Private mIsLoad As Boolean
Private mValue As Single
Private mIsError As Boolean
Private mHasMinMax As Boolean
Private mAllowAlternate As Boolean
Private mAllowDecimals As Boolean
Private mAllowNegative As Boolean
Private mDecimalPlaces As Integer
Private mDecimalPlaces_Normal As Integer
Private mDecimalPlaces_Alternate As Integer
Private mMinVal As Single
Private mMaxVal As Single
Private mMinVal_Normal As Single
Private mMaxVal_Normal As Single
Private mMinVal_Alternate As Single
Private mMaxVal_Alternate As Single
Private mUnit As String
Private mStatusMsg As String
Private mMsg As String
Private mMsg_Normal As String
Private mMsg_Alternate As String
Private mUOM As Boolean

Public Property Get Value() As Single
    Value = mValue
End Property

Public Property Let Value(vNewValue As Single)
    IsChanged = False
    If vNewValue <> mValue Then
        IsChanged = True
        
        If Not ParentForm Is Nothing Then
            If ParentForm.Visible Then ParentForm.FileDirty = True
        End If
        
        If Not ClsControl Is Nothing Then
            If ClsControl.Parent.Visible Then
                'special test for dual use variables for cars and bikes
                If ClsControl.NAME <> "txtRingHt1" And ClsControl.NAME <> "txtRingHt2" And ClsControl.NAME <> "txtArmDepth1" And ClsControl.NAME <> "txtArmDepth2" And ClsControl.NAME <> "txtThrdpI" And ClsControl.NAME <> "txtSSRate" And ClsControl.NAME <> "txtSRate" And ClsControl.NAME <> "txtdRnHt" Then
                    TestUnit Format(vNewValue)
                End If
            End If
        End If
        
        IsError = False
        If OutOfRange(vNewValue) Then
            IsError = True
            If Not IsCalc Then  'stops reset and error message
                If vNewValue < MinVal Then
                    vNewValue = MinVal
                Else
                    vNewValue = MaxVal
                End If
                
                If Not ClsControl Is Nothing Then
                    gc_ER.RSAErrorMsg ErrorMsg & "." & Chr$(13) & "A value of " & Format(vNewValue, ValFmt) & " will be used instead!", Not ERR_ANSWER, ERR_TYP_INPUT, ERR_CAP_RANGE
                    gc_ER.Display
                End If
            End If
            
            If Not ClsControl Is Nothing Then
                If ClsControl.Parent.Visible Then
                    If TypeOf ClsControl Is TextBox Then
                        On Error Resume Next
                        ClsControl.SetFocus
                    End If
                End If
            End If
        End If
        
        IsCalc = False
        mValue = vNewValue
    End If
    
    If Not ParentForm Is Nothing Then
        If ParentForm.Visible Then SetClsControl
    End If
End Property

Public Sub TestUnit(vNewValue As String)
Dim tv As Single
    If AllowAlternate Then
        tv = val(vNewValue)
        
        If UOM = UOM_NORMAL Then
            'test added to make barometer work correctly
            If tv < MinVal_Normal Or tv > MaxVal_Normal Then
                If tv >= MinVal_Alternate And tv <= MaxVal_Alternate Then
                    UOM = UOM_ALTERNATE
                End If
            End If
        Else
            If tv >= MinVal_Normal And tv <= MaxVal_Normal Then
                UOM = UOM_NORMAL
            End If
        End If
    End If
End Sub

Public Function OutOfRange(TestValue As Variant) As Boolean
Dim tv As Single
    OutOfRange = False
    
    If HasMinMax Then
        tv = val(TestValue)
        If tv < MinVal Or tv > MaxVal Then
            OutOfRange = True
        End If
    End If
End Function

Public Sub TestNumericKeyPress(KeyAscii As Integer)
Dim hd As Integer                        'location of dash/minus sign
Dim hdp As Integer                       'location of decimal point
    If ClsControl Is Nothing Then Exit Sub
    If Not TypeOf ClsControl Is TextBox Then Exit Sub
    
    Select Case KeyAscii
        Case vbKeyReturn                 'return/enter
            Value = val(ClsControl.Text)
            ClsControl.SelStart = 0
            ClsControl.SelLength = Len(ClsControl.Text)
    
        Case vbKeyBack                   'backspace
    
        Case vbKeyInsert                 'dash/minus sign
            If AllowNegative Then
                'delete existing selected text on first stroke
                If ClsControl.Text = ClsControl.SelText Then
                    ClsControl.Text = ""
                Else
                    hd = InStr(ClsControl.Text, "-")
                    If hd > 0 Or Len(ClsControl.Text) > 0 Then
                        Beep
                        KeyAscii = 0
                    End If
                End If
            Else
                Beep
                KeyAscii = 0
            End If
    
        Case vbKeyDecimal, vbKeyDelete   'decimal point (2 keyboard spots)
            If AllowDecimals Then
                'delete existing selected text on first stroke
                If ClsControl.Text = ClsControl.SelText Then
                    ClsControl.Text = ""
                Else
                    hdp = InStr(ClsControl.Text, ".")
                    If hdp > 0 Then
                        Beep
                        KeyAscii = 0
                    End If
                End If
            Else
                Beep
                KeyAscii = 0
            End If
    
        Case Else
            If IsNumeric(Chr(KeyAscii)) Then 'Is >= Asc("0") And KeyAscii <= Asc("9")
                'delete existing selected text on first stroke
                If ClsControl.Text = ClsControl.SelText Then
                    ClsControl.Text = ""
                Else
                    'test for change in units at keystroke level
                    If Not ClsControl Is Nothing Then
                        If ClsControl.Parent.Visible Then
                            'special test for barometer and dual use variables for cars and bikes
                            If ClsControl.NAME <> "txtBarometer" And ClsControl.NAME <> "txtRingHt1" And ClsControl.NAME <> "txtRingHt2" And ClsControl.NAME <> "txtArmDepth1" And ClsControl.NAME <> "txtArmDepth2" And ClsControl.NAME <> "txtThrdpI" And ClsControl.NAME <> "txtSSRate" And ClsControl.NAME <> "txtSRate" And ClsControl.NAME <> "txtdRnHt" Then
                                TestUnit Trim(ClsControl.Text & Chr(KeyAscii))
                            End If
                        End If
                    End If
                    
                    If AllowDecimals Then  'test for too many decimal digits
                        hdp = InStr(ClsControl.Text, ".")
                        If hdp > 0 And ClsControl.SelText = "" Then
                            If Len(ClsControl.Text) + 1 - hdp > DecimalPlaces Then
                                Beep
                                KeyAscii = 0
                            End If
                        End If
                    End If
                End If
            Else
                Beep
                KeyAscii = 0
            End If
    End Select
End Sub

Public Property Get MinVal() As Single
    MinVal = mMinVal
End Property

Public Property Let MinVal(vNewValue As Single)
    mMinVal = vNewValue
End Property

Public Property Get MaxVal() As Single
    MaxVal = mMaxVal
End Property

Public Property Let MaxVal(vNewValue As Single)
    mMaxVal = vNewValue
    SetListSize
End Property

Public Property Get Unit() As String
    Unit = mUnit
End Property

Public Property Let Unit(vNewValue As String)
    mUnit = vNewValue
    If Labelctl Is Nothing Then Exit Property
    
    If mUnit <> "" Then
        If caption = "" Then
            Labelctl.caption = mUnit
        Else
            Labelctl.caption = caption + " - " + mUnit
        End If
    End If
End Property

Public Property Get UnitNormal() As String
    UnitNormal = mUnitNormal
End Property

Public Property Let UnitNormal(vNewValue As String)
    mUnitNormal = vNewValue
End Property

Public Property Get UnitAlternate() As String
    UnitAlternate = mUnitAlternate
End Property

Public Property Let UnitAlternate(vNewValue As String)
    mUnitAlternate = vNewValue
End Property

Public Property Get AllowDecimals() As Boolean
    AllowDecimals = mAllowDecimals
End Property

Public Property Let AllowDecimals(vNewValue As Boolean)
    mAllowDecimals = vNewValue
End Property

Public Property Get DecimalPlaces() As Integer
    DecimalPlaces = mDecimalPlaces
End Property

Public Property Let DecimalPlaces(vNewValue As Integer)
    mDecimalPlaces = vNewValue
End Property

Public Property Get IsChanged() As Boolean
    IsChanged = mIsChanged
End Property

Public Property Let IsChanged(vNewValue As Boolean)
    mIsChanged = vNewValue
End Property

Public Property Get AllowNegative() As Boolean
    AllowNegative = mAllowNegative
End Property

Public Property Let AllowNegative(vNewValue As Boolean)
    mAllowNegative = vNewValue
End Property

Public Property Get UOM() As Boolean
    UOM = mUOM
End Property

Public Property Let UOM(vNewValue As Boolean)
    If mUOM <> vNewValue Then
        If vNewValue = UOM_NORMAL Then
            DecimalPlaces = DecimalPlaces_Normal
            MinVal = MinVal_Normal:     MaxVal = MaxVal_Normal
            Msg = Msg_Normal:           caption = Msg_Normal
            Unit = UnitNormal
        Else
            DecimalPlaces = DecimalPlaces_Alternate
            MinVal = MinVal_Alternate:  MaxVal = MaxVal_Alternate
            Msg = Msg_Alternate:        caption = Msg_Alternate
            Unit = UnitAlternate
        End If
    End If
    
    mUOM = vNewValue
End Property

Public Property Get MinVal_Normal() As Single
    MinVal_Normal = mMinVal_Normal
End Property

Public Property Let MinVal_Normal(vNewValue As Single)
    mMinVal_Normal = vNewValue
End Property

Public Property Get MaxVal_Normal() As Single
    MaxVal_Normal = mMaxVal_Normal
End Property

Public Property Let MaxVal_Normal(vNewValue As Single)
    mMaxVal_Normal = vNewValue
End Property

Public Property Get MinVal_Alternate() As Single
    MinVal_Alternate = mMinVal_Alternate
End Property

Public Property Let MinVal_Alternate(vNewValue As Single)
    mMinVal_Alternate = vNewValue
End Property

Public Property Get MaxVal_Alternate() As Single
    MaxVal_Alternate = mMaxVal_Alternate
End Property

Public Property Let MaxVal_Alternate(vNewValue As Single)
    mMaxVal_Alternate = vNewValue
End Property

Public Property Get DecimalPlaces_Normal() As Integer
    DecimalPlaces_Normal = mDecimalPlaces_Normal
End Property

Public Property Let DecimalPlaces_Normal(vNewValue As Integer)
    mDecimalPlaces_Normal = vNewValue
End Property

Public Property Get DecimalPlaces_Alternate() As Integer
    DecimalPlaces_Alternate = mDecimalPlaces_Alternate
End Property

Public Property Let DecimalPlaces_Alternate(vNewValue As Integer)
    mDecimalPlaces_Alternate = vNewValue
End Property

Public Property Get ErrorMsg() As String
    ErrorMsg = Msg
    If HasMinMax Then
        ErrorMsg = Msg & " must be between " & Format(MinVal, ValFmt) & " and " & Format(MaxVal, ValFmt)
    End If
End Property

Public Property Get MinValTxt() As String
    MinValTxt = ""
    If TypeOf ClsControl Is TextBox Then
        If HasMinMax And Not HasList Then
            MinValTxt = "Min: " & Format(MinVal, ValFmt)
        End If
    End If
End Property

Public Property Get MaxValTxt() As String
    MaxValTxt = ""
    If TypeOf ClsControl Is TextBox Then
        If HasMinMax And Not HasList Then
            MaxValTxt = "Max: " & Format(MaxVal, ValFmt)
        End If
    End If
End Property

Public Property Get Msg() As String
    If AllowAlternate Then
        If UOM = UOM_NORMAL Then
            Msg = Msg_Normal
        Else
            Msg = Msg_Alternate
        End If
    Else
        Msg = mMsg
    End If
End Property

Public Property Let Msg(vNewValue As String)
    mMsg = vNewValue
End Property

Public Property Get Msg_Normal() As String
    Msg_Normal = mMsg_Normal
End Property

Public Property Let Msg_Normal(vNewValue As String)
    mMsg_Normal = vNewValue
End Property

Public Property Get Msg_Alternate() As String
    Msg_Alternate = mMsg_Alternate
End Property

Public Property Let Msg_Alternate(vNewValue As String)
    mMsg_Alternate = vNewValue
End Property

Public Property Get AllowAlternate()
    AllowAlternate = mAllowAlternate
End Property

Public Property Let AllowAlternate(vNewValue)
    mAllowAlternate = vNewValue
End Property

Public Property Get ValFmt() As String
    ValFmt = "0"
    
    If AllowDecimals And DecimalPlaces > 0 Then
        ValFmt = "#." & String(DecimalPlaces, "0")
    End If
    
    If AllowNegative Then
        ValFmt = ValFmt & ";-" & ValFmt
    End If
End Property

Public Property Get HasMinMax() As Boolean
    HasMinMax = mHasMinMax
End Property

Public Property Let HasMinMax(vNewValue As Boolean)
    mHasMinMax = vNewValue
End Property

Public Property Get IsCalc() As Boolean
    IsCalc = mIsCalc
End Property

Public Property Let IsCalc(vNewValue As Boolean)
    mIsCalc = vNewValue
End Property

Public Property Get IsLoad() As Boolean
    IsLoad = mIsLoad
End Property

Public Property Let IsLoad(vNewValue As Boolean)
    mIsLoad = vNewValue
End Property

Public Property Get HasList() As Boolean
    HasList = mHasList
End Property

Public Property Let HasList(vNewValue As Boolean)
    mHasList = vNewValue
    SetListSize
End Property

Public Property Get List(Index As Integer) As String
    If Not HasList Then
        IsError = True
        Exit Property
    End If
    
    If OutOfRange(Index) Then
        IsError = True
        Exit Property
    End If
    
    IsError = False
    List = mList(Index)
End Property

Public Property Let List(Index As Integer, vNewValue As String)
    If Not HasList Then
        IsError = True
        'ErrorMsg "List request (" & Format(Index) & ") invalid. List not active", Not ERR_ANSWER, ERR_TYP_INPUT, ERR_CAP_RANGE
        Exit Property
    End If
    
    If OutOfRange(Index) Then
        IsError = True
        'ErrorMsg "List request (" & Format(Index) & ") out of range", Not ERR_ANSWER, ERR_TYP_INPUT, ERR_CAP_RANGE
        Exit Property
    End If
    IsError = False
    
    If mList(Index) = "" And vNewValue > "" Then
        mListcount = mListcount + 1
    End If
    
    mList(Index) = vNewValue
End Property

Public Property Get StatusMsg() As String
    StatusMsg = mStatusMsg
End Property

Public Property Let StatusMsg(vNewValue As String)
    mStatusMsg = vNewValue
End Property

Public Property Get Formatted() As String
    Formatted = Format(Value, ValFmt)
End Property

Public Property Get IsError() As Boolean
    IsError = mIsError
End Property

Public Property Let IsError(vNewValue As Boolean)
    mIsError = vNewValue
End Property

Private Sub Class_Initialize()
    mUnitNormal = ""
    mUOM = False
    mAllowNegative = False
    mAllowAlternate = False
    mAllowDecimals = False:        mDecimalPlaces = 0
    mDecimalPlaces_Normal = 0:     mDecimalPlaces_Alternate = 0
    mHasMinMax = False
    mMinVal = 0:                   mMaxVal = 0
    mMinVal_Normal = 0:            mMaxVal_Normal = 0
    mMinVal_Alternate = 0:         mMaxVal_Alternate = 0
    mHasList = False:              mListcount = 0
    mIsCalc = False:               mIsChanged = False
End Sub

Public Property Get Listcount() As Integer
    Listcount = mListcount
End Property

Private Sub SetListSize()
    Static dopreserve As Boolean
    If HasList And HasMinMax Then
        If dopreserve Then
            If UBound(mList) <> MaxVal Then
                ReDim Preserve mList(MinVal To MaxVal)
            End If
        'changed > 0 to >= 0 for Mfg1.List(0), Mfg2.List(0)
        ElseIf MinVal >= 0 And MaxVal > MinVal Then
            ReDim mList(MinVal To MaxVal)
            dopreserve = True
        End If
    End If
End Sub

Public Function RightAlign(maxlen As Integer)
Dim Work As String
Dim fmt As String
    Work = Space(maxlen)
    
    If DecimalPlaces > 0 Then
        If Value < 1 Then
            fmt = String(maxlen - DecimalPlaces - 1, "#") & "0."
        Else
            fmt = String(maxlen - DecimalPlaces, "#") & "."
        End If
        fmt = fmt & String(DecimalPlaces, "0")
        RSet Work = Format(Value, fmt)
    Else
        fmt = String(maxlen - 1, "#") & "0"
        RSet Work = Format(Value, fmt)
    End If
    
    RightAlign = Work
End Function

Public Property Get Labelctl() As Label
    Set Labelctl = Nothing
    If mLabelctl Is Nothing Then Exit Property
    
    Set Labelctl = mLabelctl
End Property

Public Property Let Labelctl(vNewValue As Label)
    Set mLabelctl = vNewValue
    
    If vNewValue Is Nothing Then
        mlblIndex = 0
    Else
        mlblIndex = mLabelctl.Index
    End If
    
    Unit = Unit     'this forces display of new caption
End Property

Public Property Get ClsControl() As Control
    Set ClsControl = Nothing
    If mClsControl Is Nothing Then Exit Property
    
    Set ClsControl = mClsControl
End Property

Public Property Let ClsControl(vNewValue As Control)
    Set mClsControl = vNewValue
    
    If vNewValue Is Nothing Then
        ParentForm = Nothing
        Exit Property
    Else
        ParentForm = mClsControl.Parent
    End If
    
    SetClsControl
    
    If HasList And TypeOf mClsControl Is ComboBox Then
        LoadTypes
    End If
End Property

Public Property Get caption() As String
    caption = mCaption
End Property

Public Property Let caption(vNewValue As String)
    mCaption = vNewValue
End Property

Public Property Get lblIndex() As Integer
    lblIndex = mlblIndex
End Property

Public Sub LoadTypes()
Dim i As Integer
    If HasList And TypeOf ClsControl Is ComboBox Then
        If Listcount > 0 Then
            If ClsControl.Listcount > 0 Then
                ClsControl.Clear
            End If
            
            For i = MinVal To MaxVal
                ClsControl.AddItem List(i)
                ClsControl.ItemData(ClsControl.NewIndex) = i
            Next
            
            If Value >= MinVal And Value <= MaxVal Then
                ClsControl.ListIndex = Value - 1
            End If
        End If
    End If
End Sub

Private Sub SetClsControl()
    On Error GoTo SetClsControlExit
    
    If Not ClsControl Is Nothing Then
        If Not HasList Then
            If TypeOf ClsControl Is TextBox Then
                ClsControl.Text = Formatted
            End If
        Else
            If TypeOf ClsControl Is ComboBox Then
                If ClsControl.Listcount > 0 Then
                    ClsControl.ListIndex = Value - 1
                End If
            End If
        End If
    End If
SetClsControlExit:
End Sub

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
