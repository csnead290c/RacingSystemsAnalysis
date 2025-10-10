VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
  Persistable = 0  'NotPersistable
  DataBindingBehavior = 0  'vbNone
  DataSourceBehavior  = 0  'vbNone
  MTSTransactionMode  = 0  'NotAnMTSObject
END
Attribute VB_Name = "CGrid"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Private WithEvents mGrd As DBGrid
Attribute mGrd.VB_VarHelpID = -1
Private mCaption As String
Private mStatusMsg As String
Private mMsg As String
Private mdbgCols() As Column
Private mdbgColMins() As Single
Private mdbgColMaxs() As Single
Private mMaxCol As Integer
Private mMaxRow As Integer
Private mGridArray() As Variant

Private Function MakeBookmark(Index As Integer) As Variant
    MakeBookmark = Str$(Index)
End Function

Private Function IndexFromBookmark(bookm As Variant, ReadPriorRows As Boolean) As Integer
Dim Index As Integer
    If IsNull(bookm) Then
        If ReadPriorRows Then
            IndexFromBookmark = MaxRow
        Else
            IndexFromBookmark = -1
        End If
   Else
        Index = val(bookm)
        If Index < 0 Or Index >= MaxRow Then Index = -2000
        IndexFromBookmark = Index
    End If
End Function

Private Function GetUserData(bookm As Variant, colm As Integer) As Variant
Dim Index As Integer
    Index = IndexFromBookmark(bookm, False)
    If Index < 0 Or Index >= MaxRow Or colm < 0 Or colm >= MaxCol Then
        GetUserData = Null
    Else
        GetUserData = GridArray(colm, Index)
    End If
End Function

Private Function StoreUserData(bookm As Variant, colm As Integer, userval As Variant) As Boolean
Dim Index As Integer
    Index = IndexFromBookmark(bookm, False)
    If Index < 0 Or Index >= MaxRow Or colm < 0 Or colm >= MaxCol Then
        StoreUserData = False
    Else
        StoreUserData = True
        GridArray(colm, Index) = userval
    End If
End Function

Private Function GetRelativeBookmark(bookm As Variant, relpos As Integer) As Variant
Dim Index As Integer
    Index = IndexFromBookmark(bookm, False) + relpos
    If Index < 0 Or Index >= MaxRow Then
        GetRelativeBookmark = Null
    Else
        GetRelativeBookmark = MakeBookmark(Index)
    End If
End Function

Private Function GetNewBookmark() As Variant
    ReDim Preserve mGridArray(0 To MaxCol - 1, 0 To MaxRow)
    GetNewBookmark = MakeBookmark(MaxRow)
    MaxRow = MaxRow + 1
End Function

Public Sub UnboundReadData(ByVal RowBuf As RowBuffer, StartLocation As Variant, ByVal ReadPriorRows As Boolean)
Dim bookm As Variant
Dim relpos As Integer
Dim rowsFetched As Integer
Dim j As Integer
Dim i As Integer
    bookm = StartLocation
    If ReadPriorRows Then
        'the grid is requesting data in rows prior to StartLocation
        relpos = -1
    Else
        'the grid is requesting data in rows after StartLocation
        relpos = 1
    End If

    rowsFetched = 0
    For i = 0 To RowBuf.RowCount - 1
        'Get the bookmark of the next available row
        bookm = GetRelativeBookmark(bookm, relpos)
        'If the next is BOF or EOF, then done
        If IsNull(bookm) Then Exit For

        For j = 0 To RowBuf.ColumnCount - 1
            RowBuf.Value(i, j) = GetUserData(bookm, j)
        Next

        RowBuf.Bookmark(i) = bookm     'Set the bookmark for the row
        rowsFetched = rowsFetched + 1  'Increment the count of fetched rows
    Next

    'tell the grid how many rows were fetched
    RowBuf.RowCount = rowsFetched
End Sub

Public Sub UnboundWriteData(ByVal RowBuf As RowBuffer, WriteLocation As Variant)
Dim i As Integer
Dim Index As Integer
Dim NewValue As Variant
    ' Assume that a VBA function StoreUserData(bookm, col, value) takes
    ' a row bookmark, a column index, and a variant with the appropriate
    ' data to be stored in an array.  The function returns True if the
    ' data is acceptable and can be stored, False otherwise.
    
    'Loop over all the columns of the row, storing non-Null values
    For i = 0 To RowBuf.ColumnCount - 1
        'If IsNull(RowBuf.Value(0, i)) Then
        '    newvalue = 0
        'Else
        '    newvalue = RowBuf.Value(0, i)
        'End If
        If Not IsNull(RowBuf.Value(0, i)) Then
            If Not StoreUserData(WriteLocation, i, RowBuf.Value(0, i)) Then
                'storage of the data has failed!
                RowBuf.RowCount = 0       'tell the grid the update failed
                Exit Sub                  'and exit the event
            End If
        End If
    Next
    
    Index = IndexFromBookmark(WriteLocation, False)
End Sub

Private Sub mGrd_KeyPress(KeyAscii As Integer)
    TestNumericKeyPress KeyAscii
End Sub

Public Sub TestNumericKeyPress(KeyAscii As Integer)
Dim clm As Column
Dim hd As Integer
Dim hdp As Integer
Dim numfmt As String
Dim newval As String

Dim AllowDecimals As Integer
Dim DecimalPlaces As Integer
Dim AllowNegative As Integer
Dim Semicolon As Integer
    
    If Grd Is Nothing Then Exit Sub
    
    Set clm = Grd.Columns(Grd.col)
    
    If KeyAscii <> vbKeyReturn Then
        'first position
        If clm.Text = Grd.SelText Then
            clm.Value = 0
            newval = Chr(KeyAscii)
        Else                             'if insertion point not at end
            newval = Format(clm.Value) & Chr(KeyAscii) 'if grd.selstart
        End If
    End If
    
    'determine how many decimal places are allowed in this grid column
    numfmt = clm.NumberFormat
    AllowDecimals = InStr(numfmt, ".")
    AllowNegative = InStr(numfmt, "-")
    Semicolon = InStr(numfmt, ";")
    
    If AllowDecimals > 0 Then
        If Semicolon > AllowDecimals Then
            DecimalPlaces = (Semicolon - 1) - AllowDecimals
        Else
            DecimalPlaces = Len(numfmt) - AllowDecimals
        End If
    Else
        DecimalPlaces = 0
    End If
    
    'go through key press possibilities
    Select Case KeyAscii
        Case vbKeyReturn                 'return/enter
        'Grd.SelStart = 0:  Grd.SelLength = Len(ClsControl.Text)
    
        Case vbKeyBack                   'backspace
    
        Case vbKeyInsert                 'dash/minus sign
            If AllowNegative > 0 Then
                hd = InStr(Format(clm.Value), "-")
                If hd > 0 Or Len(Format(clm.Value)) > 0 Then KeyAscii = 0
            Else
                KeyAscii = 0
            End If
    
        Case vbKeyDecimal, vbKeyDelete   'decimal point (2 keyboard spots)
            If AllowDecimals > 0 Then
                hdp = InStr(Format(clm.Value), ".")
                If hdp > 0 Then KeyAscii = 0
            Else
                KeyAscii = 0
            End If
    
        Case Else
            'Is >= Asc("0") And KeyAscii <= Asc("9") replaced with
            If IsNumeric(Chr(KeyAscii)) Then
                'test for too many decimal digits
                If DecimalPlaces > 0 Then
                    hdp = InStr(newval, ".")
                    If hdp > 0 Then
                        'decimal side
                        If Len(newval) - hdp > DecimalPlaces Then KeyAscii = 0
                    End If
                End If
                
                'is the overall number too long?
                If Semicolon > AllowDecimals Then
                    If Len(newval) > (Semicolon - 1) Then KeyAscii = 0
                Else
                    If Len(newval) > Len(numfmt) Then KeyAscii = 0
                End If
            Else
                KeyAscii = 0
            End If
    End Select
End Sub

Public Function RightAlign(col As Integer, row As Integer, maxlen As Integer)
Dim Work As String
    Work = Space(maxlen)
    RSet Work = Format(GridArray(col, row), dbgCols(col).NumberFormat)
    RightAlign = Work
End Function

Public Property Get dbgCols(Index As Integer) As Column
    Set dbgCols = mdbgCols(Index)
End Property

Public Property Let dbgCols(Index As Integer, vNewValue As Column)
    Set mdbgCols(Index) = vNewValue
End Property

Public Property Get dbgColMins(Index As Integer) As Single
    dbgColMins = mdbgColMins(Index)
End Property

Public Property Let dbgColMins(Index As Integer, vNewValue As Single)
    mdbgColMins(Index) = vNewValue
End Property

Public Property Get dbgColMaxs(Index As Integer) As Single
    dbgColMaxs = mdbgColMaxs(Index)
End Property

Public Property Let dbgColMaxs(Index As Integer, vNewValue As Single)
    mdbgColMaxs(Index) = vNewValue
End Property

Public Property Get MinTxt(Index As Integer) As String
    Dim fmt As String
    If Index >= 0 Then fmt = Format(dbgColMins(Index), dbgCols(Index).NumberFormat)
    MinTxt = "Min: " & IIf(fmt = "", "0", fmt)
End Property

Public Property Get MaxTxt(Index As Integer) As String
    Dim fmt As String
    If Index >= 0 Then fmt = Format(dbgColMaxs(Index), dbgCols(Index).NumberFormat)
    MaxTxt = "Max: " & IIf(fmt = "", "0", fmt)
End Property

Public Property Get GridArray(col As Integer, row As Integer) As Variant
    GridArray = mGridArray(col, row)
End Property

Public Property Let GridArray(col As Integer, row As Integer, vNewValue As Variant)
    mGridArray(col, row) = vNewValue
End Property

Public Property Get StatusMsg() As String
    StatusMsg = mStatusMsg
End Property

Public Property Let StatusMsg(vNewValue As String)
    mStatusMsg = vNewValue
End Property

Public Property Get Msg() As String
    Msg = mMsg
End Property

Public Property Let Msg(vNewValue As String)
    mMsg = vNewValue
End Property

Public Property Get caption() As String
    caption = mCaption
End Property

Public Property Let caption(vNewValue As String)
    mCaption = vNewValue
End Property

Public Property Get MaxRow() As Integer
    MaxRow = mMaxRow
End Property

Public Property Let MaxRow(vNewValue As Integer)
    mMaxRow = vNewValue
    ReDim mGridArray(0 To MaxCol - 1, 0 To mMaxRow - 1)
End Property

Public Property Get MaxCol() As Integer
    MaxCol = mMaxCol
End Property

Public Property Let MaxCol(vNewValue As Integer)
    mMaxCol = vNewValue
    ReDim mdbgCols(0 To mMaxCol - 1)
    ReDim mdbgColMins(0 To mMaxCol - 1)
    ReDim mdbgColMaxs(0 To mMaxCol - 1)
End Property

Public Property Get Grd() As DBGrid
    Set Grd = mGrd
End Property

Public Property Let Grd(vNewValue As DBGrid)
    Set mGrd = vNewValue
End Property
