VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "cValue"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private mList() As String
Private mListcount As Integer
Private mHasList As Boolean
Private mIsCalc As Boolean
Private mValue As Single
Private mIsError As Boolean
Private mHasMinMax As Boolean
Private mInches As Boolean
Private mAllowMM As Boolean
Private mAllowDecimals As Boolean
Private mAllowNegative As Boolean
Private mIsChanged As Boolean
Private mMMLimit As Single
Private mDecimalPlaces As Integer
Private mDecimalPlaces_In As Integer
Private mDecimalPlaces_MM As Integer
Private mMinVal As Single
Private mMaxVal As Single
Private mMinVal_In As Single
Private mMaxVal_In As Single
Private mMinVal_MM As Single
Private mMaxVal_MM As Single
Private mUnit As String
Private mStatusMsg As String
Private mMsg As String

Public Property Get Value() As Single
    Value = mValue
End Property

Public Property Let Value(vNewValue As Single)
    IsChanged = False
    If vNewValue <> mValue Then
        IsChanged = True
        
        IsError = False
        TestUnit Format(vNewValue)
        If OutOfRange(vNewValue) Then
            IsError = True
            
            If Not IsCalc Then
                If vNewValue < MinVal Then
                    vNewValue = MinVal
                Else
                    vNewValue = MaxVal
                End If
                
                gc_ER.RSAErrorMsg ErrorMsg & "." & Chr$(13) & "A value of " & Format(vNewValue, ValFmt) & " will be used instead!", Not ERR_ANSWER, ERR_TYP_INPUT, ERR_CAP_RANGE
                gc_ER.Display
            End If
        End If
        
        mValue = vNewValue
    End If
    
    IsCalc = False
End Property

Public Sub TestUnit(vNewValue As String)
Dim tv As Single
    If Not AllowMM Then Exit Sub
    
    tv = val(vNewValue)
    If Inches And tv >= MMLimit Then
        Inches = False
    ElseIf Not Inches And tv < MMLimit Then
        Inches = True
    End If
End Sub

Public Function OutOfRange(TestValue As Variant) As Boolean
Dim tv As Single
    OutOfRange = False
    If HasMinMax Then
        tv = val(TestValue)
        If tv < MinVal Or tv > MaxVal Then OutOfRange = True
    End If
End Function

Public Sub TestNumericKeyPress(KeyAscii As Integer, txt As TextBox)
Dim hd As Integer                'location of dash/minus sign
Dim hdp As Integer               'location of decimal point
        
    Select Case KeyAscii
        Case vbKeyReturn                 'return/enter
            txt.SelStart = 0
            txt.SelLength = Len(txt.Text)

        Case vbKeyBack                   'backspace
        
        Case vbKeyInsert                 'dash/minus sign
            If AllowNegative Then
                'delete existing selected text on first stroke
                If txt.Text = txt.SelText Then
                    txt.Text = ""
                Else
                    hd = InStr(txt.Text, "-")
                    If hd > 0 Or Len(txt.Text) > 0 Then
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
                If txt.Text = txt.SelText Then
                    txt.Text = ""
                Else
                    hdp = InStr(txt.Text, ".")
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
                If txt.Text = txt.SelText Then
                    txt.Text = ""
                Else
                    'test for change in units at keystroke level
                    TestUnit Trim(txt.Text & Chr(KeyAscii))
                    
                    If AllowDecimals Then  'test for too many decimal digits
                        hdp = InStr(txt.Text, ".")
                        If hdp > 0 And txt.SelText = "" Then
                            If txt.SelStart + 1 > hdp Then
                                If Len(txt.Text) + 1 - hdp > DecimalPlaces Then
                                    Beep
                                    KeyAscii = 0
                                End If
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

Public Property Get Inches() As Boolean
    Inches = mInches
End Property

Public Property Let Inches(vNewValue As Boolean)
    If mInches <> vNewValue Then
        If vNewValue Then
            DecimalPlaces = DecimalPlaces_In
            MinVal = MinVal_In
            MaxVal = MaxVal_In
            Unit = "inch"
        Else
            DecimalPlaces = DecimalPlaces_MM
            MinVal = MinVal_MM
            MaxVal = MaxVal_MM
            Unit = "millimeter"
        End If
    End If
    
    mInches = vNewValue
End Property

Public Property Get MMLimit() As Single
    MMLimit = mMMLimit
End Property

Public Property Let MMLimit(vNewValue As Single)
    mMMLimit = vNewValue
End Property

Public Property Get MinVal_In() As Single
    MinVal_In = mMinVal_In
End Property

Public Property Let MinVal_In(vNewValue As Single)
    mMinVal_In = vNewValue
End Property

Public Property Get MaxVal_In() As Single
    MaxVal_In = mMaxVal_In
End Property

Public Property Let MaxVal_In(vNewValue As Single)
    mMaxVal_In = vNewValue
End Property

Public Property Get MinVal_MM() As Single
    MinVal_MM = mMinVal_MM
End Property

Public Property Let MinVal_MM(vNewValue As Single)
    mMinVal_MM = vNewValue
End Property

Public Property Get MaxVal_MM() As Single
    MaxVal_MM = mMaxVal_MM
End Property

Public Property Let MaxVal_MM(vNewValue As Single)
    mMaxVal_MM = vNewValue
End Property

Public Property Get DecimalPlaces_In() As Integer
    DecimalPlaces_In = mDecimalPlaces_In
End Property

Public Property Let DecimalPlaces_In(vNewValue As Integer)
    mDecimalPlaces_In = vNewValue
End Property

Public Property Get DecimalPlaces_MM() As Integer
    DecimalPlaces_MM = mDecimalPlaces_MM
End Property

Public Property Let DecimalPlaces_MM(vNewValue As Integer)
    mDecimalPlaces_MM = vNewValue
End Property

Public Property Get ErrorMsg() As String
    ErrorMsg = Msg
    If HasMinMax Then ErrorMsg = Msg & " must be between " & Format(MinVal, ValFmt) & " and " & Format(MaxVal, ValFmt)
End Property

Public Property Get MinValTxt() As String
    MinValTxt = ""
    If HasMinMax And Not HasList Then MinValTxt = "Min: " & Format(MinVal, ValFmt)
End Property

Public Property Get MaxValTxt() As String
    MaxValTxt = ""
    If HasMinMax And Not HasList Then MaxValTxt = "Max: " & Format(MaxVal, ValFmt)
End Property

Public Property Get Msg() As String
    Msg = mMsg
End Property

Public Property Let Msg(vNewValue As String)
    mMsg = vNewValue
End Property

Public Property Get AllowMM()
    AllowMM = mAllowMM
End Property

Public Property Let AllowMM(vNewValue)
    mAllowMM = vNewValue
End Property

Public Property Get ValFmt() As String
    ValFmt = "0"
    If AllowDecimals And DecimalPlaces > 0 Then
        ValFmt = "#." & String(DecimalPlaces, "0")
    End If
    
    If AllowNegative Then ValFmt = ValFmt & ";-" & ValFmt
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
        gc_ER.RSAErrorMsg "List request (" & Format(Index) & ") invalid. List not active", Not ERR_ANSWER, ERR_TYP_INPUT, ERR_CAP_RANGE
        gc_ER.Display
        Exit Property
    End If
    
    If OutOfRange(Index) Then
        IsError = True
        gc_ER.RSAErrorMsg "List request (" & Format(Index) & ") out of range", Not ERR_ANSWER, ERR_TYP_INPUT, ERR_CAP_RANGE
        gc_ER.Display
        Exit Property
    End If
    
    IsError = False
    List = mList(Index)
End Property

Public Property Let List(Index As Integer, vNewValue As String)
    If Not HasList Then
        IsError = True
        gc_ER.RSAErrorMsg "List request (" & Format(Index) & ") invalid. List not active", Not ERR_ANSWER, ERR_TYP_INPUT, ERR_CAP_RANGE
        gc_ER.Display
        Exit Property
    End If
    
    If OutOfRange(Index) Then
        IsError = True
        gc_ER.RSAErrorMsg "List request (" & Format(Index) & ") out of range", Not ERR_ANSWER, ERR_TYP_INPUT, ERR_CAP_RANGE
        gc_ER.Display
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
Dim r1 As Single
    r1 = 10 ^ -DecimalPlaces
    Formatted = Format(Round(Value, r1), ValFmt)
End Property

Public Property Get IsError() As Boolean
    IsError = mIsError
End Property

Public Property Let IsError(vNewValue As Boolean)
    mIsError = vNewValue
End Property

Private Sub Class_Initialize()
    mMMLimit = 20
    mAllowNegative = False
    mAllowMM = False
    mAllowDecimals = False:    mDecimalPlaces = 0
    mDecimalPlaces_In = 0:     mDecimalPlaces_MM = 0
    mHasMinMax = False
    mMinVal = 0:               mMaxVal = 0
    mMinVal_In = 0:            mMaxVal_In = 0
    mMinVal_MM = 0:            mMaxVal_MM = 0
    mHasList = False:          mListcount = 0
    mIsCalc = False:           mIsChanged = False
End Sub

Public Property Get Listcount() As Integer
    Listcount = mListcount
End Property

Private Sub SetListSize()
Static dopreserve As Boolean
    If HasList And HasMinMax Then
        If dopreserve Then
            ReDim Preserve mList(MinVal To MaxVal)
        Else
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
        fmt = String(maxlen - DecimalPlaces, "#") & "."
        fmt = fmt & String(DecimalPlaces, "0")
        RSet Work = Format(Value, fmt)
    Else
        fmt = String(maxlen - 1, "#") & "0"
        RSet Work = Format(Value, fmt)
    End If
    
    RightAlign = Work
End Function
