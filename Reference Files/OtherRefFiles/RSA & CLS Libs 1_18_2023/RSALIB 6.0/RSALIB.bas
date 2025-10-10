Attribute VB_Name = "RSALIB"
Dim SPWL(8), SPWH(8)
Dim R, CONJ, WTAIR, WTH2O, WTGAS, WTMET, WTNIT, PSTD, TZERO, TSIXTY

Function AddAmpersand(istr As String) As String
Dim i As Integer
    AddAmpersand = istr
    i = InStr(AddAmpersand, "&")
    If i > 0 Then AddAmpersand = Left(AddAmpersand, i) & "&" & Mid(AddAmpersand, i + 1)
End Function

Static Sub BISC(X() As Single, XVAL As Single, N%, KBOTM%, KTOP%, JJ%)
Rem **************************************************
Rem *****  BINARY SEARCH FOR TABY INTERPOLATION FAMILY
Rem **************************************************
    JJ% = 0:    KBOTM% = 1:  KTOP% = N%
    i% = 1:     X1 = X(1):   XN = X(N%)

    'DETERMINE IF X VECTOR IS ASCENDING OR DESCENDING
    S = XN - X1
    If S > 0 Then
        S = 1
    Else
        S = -1
    End If

    SX = S * (XVAL - X1)
    If SX < 0 Then GoTo B200
    If SX = 0 Then GoTo B600

    i% = N%
    SX = S * (XVAL - XN)
    If SX < 0 Then GoTo B400
    If SX = 0 Then GoTo B600
    If SX > 0 Then GoTo B300

B200:   'XVAL IS BELOW X(1)
    KTOP% = N%:         If KTOP% > 2 Then KTOP% = 2
    JJ% = 1:            Exit Sub

B300:   'XVAL IS ABOVE X(N)
    KBOTM% = N% - 1:    If KBOTM% < 1 Then KBOTM% = 1
    JJ% = 1:            Exit Sub

B400:   'HALVE THE BINARY SEARCH INTERVAL
    i% = (KBOTM% + KTOP%) / 2
    SX = S * (XVAL - X(i%))
    If SX = 0 Then GoTo B600
    If SX > 0 Then GoTo B700

    KTOP% = i%
    GoTo B800

B600:   'XVAL EQUALS X(I%)
    KBOTM% = i%:    KTOP% = i%:     Exit Sub

B700:   'CONTINUE SEARCH
    KBOTM% = i%

B800:   'CONTINUE SEARCH
    If KBOTM% + 1 < KTOP% Then GoTo B400
End Sub

Sub BubbleSortD(nv As Integer, thisarray() As Single, si() As Integer)
Rem ****************************************
Rem *****  DESCENDING BUBBLE SORT FOR NUMBERS
Rem ****************************************
Dim i As Integer, j As Integer, zn As Integer
    For i = 1 To nv: si(i) = i: Next
    If nv = 1 Then Exit Sub
    
    For i = 1 To nv - 1
        For j = nv To i + 1 Step -1
            If thisarray(si(j)) > thisarray(si(i)) Then
                zn = si(i): si(i) = si(j): si(j) = zn
            End If
        Next
    Next
End Sub

Static Sub DTABY(XTAB() As Single, ZTAB() As Single, YTAB() As Single, NX%, NZ%, LX%, LZ%, XVAL As Single, ZVAL As Single, YVAL As Single)
Rem ***********************************
Rem *****  2-D LAGRANGIAN INTERPOLATION
Rem ***********************************
Dim ZZ(4) As Single, YY(4) As Single
Dim L%(2)
ReDim YX(4 * NX%) As Single

    L3% = NX% - 1: If L3% > LX% Then L3% = LX%
    
    KBOTM% = 1:    KTOP% = 2
    If NZ% = 1 Then GoTo D100
    If NZ% = 2 Then GoTo D400

    'CALL BISC IF THERE ARE AT LEAST THREE LINES
    Call BISC(ZTAB(), ZVAL, NZ%, KBOTM%, KTOP%, JJ%)
    If KBOTM% <> KTOP% Then GoTo D200

D100:
    For i% = 1 To NX%
        j% = NX% * (KBOTM% - 1) + i%
        YX(i%) = YTAB(j%)
    Next
    
    Call TABY(XTAB(), YX(), NX%, L3%, XVAL, YVAL)
    Exit Sub

D200:   'DETERMINE THE PROPER VALUES OF KBOTM% AND KTOP%
    If JJ% = 1 Or LZ% <= 1 Then GoTo D400
    
    KTOP% = KTOP% + 1
    If LZ% >= 3 Then GoTo D300
    If KTOP% <= NZ% Then GoTo D400

D300:
    If KTOP% > NZ% Then KTOP% = NZ%
    KBOTM% = KBOTM% - 1:    If KBOTM% < 1 Then KBOTM% = 1

D400:
    l2% = KTOP% - KBOTM% + 1
    L4% = l2% - 1:          If L4% > LZ% Then L4% = LZ%

    'BUILD VECTOR OF LINE VALUES (YY) AT XVAL
    'FOR EACH LINE BETWEEN KBOTM% AND KTOP%
    L%(1) = NX%:    L%(2) = L3%
    For k% = KBOTM% To KTOP%
        For i% = 1 To NX%
            M% = NX% * (k% - KBOTM%) + i%
            j% = NX% * (k% - 1) + i%
            YX(M%) = YTAB(j%)
        Next
    Next
    Call TAB1(XTAB(), YX(), XVAL, YY(), L%(), l2%)

    'INTERPOLATE FOR ANSWER AT ZVAL LINE VALUE
    For i% = KBOTM% To KTOP%
        j% = (i% - KBOTM%) + 1
        ZZ(j%) = ZTAB(i%)
    Next
    Call TABY(ZZ(), YY(), l2%, L4%, ZVAL, YVAL)
End Sub

Static Sub FTOR(WAR, GAR, MAR, NAR, RGAS)
Rem **************************************************************
Rem *****  GAS CONSTANT (FT-LBF/LBM/DEG R) OF A GAS MIXTURE OF DRY
Rem *****  AIR, WATER, GASOLINE, METHANOL, AND NITROMETHANE-VAPORS
Rem **************************************************************
    RGAS = (1 / WTAIR) + ((1 / WTH2O) * WAR) + ((1 / WTGAS) * GAR)
    RGAS = RGAS + ((1 / WTMET) * MAR) + ((1 / WTNIT) * NAR)
    RGAS = R * RGAS / (1 + WAR + GAR + MAR + NAR)
End Sub

Static Sub HUNT(X, E, XJ1, XJ2, XJ3, XJ4, tol, ITMAX%, XJ() As Single, IGO%, NAME$, ERMSG$)
Rem **********************************************************************
Rem *****  ITERATE TO A SOLUTION USING A MODIFIED NEWTON-RAPHSON TECHNIQUE
Rem **********************************************************************
Dim workv As String * 42, worke As String * 42
    If XJ(1) < 0 Then GoTo H1700

    If XJ(1) = 0 Then
        EA = 0:     EB = 0:     EC = 0
        XA = -888:  XB = -888:  XC = -888
    Else
        'XJ IS POSITIVE
        XA = XJ(2): XB = XJ(3): XC = XJ(4)
        EA = XJ(6): EB = XJ(7): EC = XJ(8)
    End If

    'ADD ONE TO COUNTER (XJ(1))
    XJ(1) = XJ(1) + 1
    If (Abs(E) < tol) Then GoTo H1800
    
    NIT% = CInt(XJ(1))
    If (NIT% >= ITMAX%) Then GoTo H1700

    'E IS GREATER THAN OR EQUAL TO TOL
    If EA * EB <> 0 Then GoTo H600

    'STEP FOR NEXT GUESS AT ROOT
    If E > 0 Then
        EA = E:     XA = X
        X = X + XJ1 * E + XJ2
    Else
        EB = E:     XB = X
        X = X + XJ3 * E + XJ4
    End If
    If EA * EB = 0 Then GoTo H1600

H500:   'NEW GUESS AT ROOT WHEN ROOT IS SPANNED
    X = (EA * XB - EB * XA) / (EA - EB)

    'CHECK FOR SPECIAL CASE OF NON-MONOTONIC CONVERGENCE
    If E <> EC Or X <> XC Then GoTo H1600
    X = (XA + XB) / 2

    GoTo H1600

H600:   'ROOT HAS BEEN SPANNED - CHECK ON ITERATION STATUS
    If EC = 0 Then
        EC = E: XC = X

        'SWAP VALUES IF APPROPRIATE
        If (EC > 0) Then
            If (EC < EA) Then SWAP EC, EA: SWAP XC, XA
        Else
            If (EC > EB) Then SWAP EC, EB: SWAP XC, XB
        End If

        GoTo H1500
    End If

    'EC IS NOT 0, KEEP THREE BEST ITERATIONS
    If E < 0 Then GoTo H1100

    'E IS GREATER THAN 0
    If EC > 0 Then
        If EC < EA Then SWAP EA, EC:    SWAP XA, XC
        If E < EA Then SWAP EA, E:      SWAP XA, X
        If E < EC Then SWAP EC, E:      SWAP XC, X
    Else
        'EC LESS THAN 0
        If E < EA Then SWAP EA, E:      SWAP XA, X
        If EC > EB Then SWAP EB, EC:    SWAP XB, XC
        If E < Abs(EC) Then SWAP EC, E: SWAP XC, X
    End If
    GoTo H1500

H1100:  'E IS LESS THAN 0
    If EC > 0 Then
        If E > EB Then SWAP EB, E:      SWAP XB, X
        If EC < EA Then SWAP EA, EC:    SWAP XA, XC
        If Abs(E) < EC Then SWAP EC, E: SWAP XC, X
    Else
        'EC LESS THAN 0
        If EC > EB Then SWAP EB, EC:    SWAP XB, XC
        If E > EB Then SWAP EB, E:      SWAP XB, X
        If E > EC Then SWAP EC, E:      SWAP XC, X
    End If

H1500:  'CHECK FOR EQUAL VARIABLE VALUES
    If XA = XB Or XA = XC Or XB = XC Then GoTo H500
    d1# = (EC - EB) / (XC - XB)
    A# = (((EA - EC) / (XA - XC)) - d1#) / (XA - XB)

    'CHECK FOR LINEAR CURVE FIT
    If d1# = 1 Or A# = 0 Then GoTo H500

    'XJ IS POSITIVE FOR (XA - XB) GREATER THAN 0
    XS = 1
    If d1# <= 0 Then XS = -1

    'NEXT GUESS AT ROOT FROM QUADRATIC EQUATION
    B# = d1# - A# * (XB + XC)
    c# = EB - d1# * XB + XB * XC * A#

    'CHECK FOR IMAGINARY ROOTS
    If (4 * A# * c#) > (B# * B#) Then GoTo H500
    X = (-B# + XS * Sqr(B# * B# - 4 * A# * c#)) / (2 * A#)

    'CHECK FOR WILD SOLUTIONS
    XMN = XA:   XMX = XB
    If XMN > XMX Then SWAP XMX, XMN
    If X <= XMN Or X >= XMX Then GoTo H500

    'CHECK FOR SPECIAL CASE OF NON-MONOTONIC CONVERGENCE
    If E <> EC Or X <> XC Then GoTo H1600
    X = (XA + XB) / 2

H1600:  'CONTINUE ITERATING
    IGO% = 1:   GoTo H1900

H1700:  'ITERATION COUNTER IS NEGATIVE OR EQUAL TO ITMAX%
    workv = String(42, " ")
    Mid(workv, 1, 13) = Str(XA)
    Mid(workv, 15, 13) = Str(XB)
    Mid(workv, 29, 13) = Str(XC)
    
    worke = String(42, " ")
    Mid(worke, 1, 13) = Str(EA)
    Mid(worke, 15, 13) = Str(EB)
    Mid(worke, 29, 13) = Str(EC)
    If ERMSG$ = "TRUE" Then
        MsgBox "Maximum number of iterations exceeded in HUNT!" & Chr(13) & "Variables = " & workv & Chr(13) & "  Errors  = " & worke, vbExclamation, "RSALib Error: " & NAME$
    End If
    
    'SELECT THE BEST SOLUTION
    ER = E
    If Abs(EA) < Abs(ER) Then X = XA: ER = EA
    If Abs(EB) < Abs(ER) Then X = XB: ER = EB

H1800:  'THE ROOT HAS BEEN FOUND
    IGO% = 0:   XJ(1) = 0

H1900:  'THE ROOT HAS NOT BEEN FOUND
    XJ(5) = XJ(1)

    XJ(2) = XA: XJ(3) = XB: XJ(4) = XC
    XJ(6) = EA: XJ(7) = EB: XJ(8) = EC
End Sub

Function NameOnly(ofn As String) As String
Rem ***********************************************************
Rem *****  STRIPS THE BASE FOLDER NAMES FROM A FILE NAME STRING
Rem ***********************************************************
Dim i As Integer, j As Integer
    NameOnly = ofn
    Do
        i = InStr(i + 1, ofn, "\")
        If i > 0 Then j = i
    Loop Until i = 0
    
    If j > 0 Then NameOnly = Mid(ofn, j + 1)
End Function

Static Sub PSATWV(T, PSAT)
Rem ************************************************
Rem *****  SATURATION PRESSURE OF WATER-VAPOR (PSIA)
Rem *****  AS FUNCTION OF TEMPERATURE (DEG R)
Rem ************************************************
    TF = T - TZERO
    If TF <= 400 Then
        PSAT = (((SPWL(8) * TF + SPWL(7)) * TF + SPWL(6)) * TF + SPWL(5)) * TF
        PSAT = (((PSAT + SPWL(4)) * TF + SPWL(3)) * TF + SPWL(2)) * TF + SPWL(1)
    Else
        PSAT = (((SPWH(8) * TF + SPWH(7)) * TF + SPWH(6)) * TF + SPWH(5)) * TF
        PSAT = (((PSAT + SPWH(4)) * TF + SPWH(3)) * TF + SPWH(2)) * TF + SPWH(1)
    End If
    
    If PSAT < 0 Then PSAT = 0
End Sub

Static Sub PWVTOT(PWV, T)
Rem ***************************************************
Rem *****  SATURATION TEMPERATURE (DEG R) CORRESPONDING
Rem *****  TO THE INPUT WATER-VAPOR PRESSURE (PSIA)
Rem ***************************************************
PW100:
    Call PSATWV(T, PSC)
    ER = PWV - PSC
    If Abs(ER) > 0.0005 Then
        TF = T - TZERO
        If TF <= 400 Then
            d1 = ((7 * SPWL(8) * TF + 6 * SPWL(7)) * TF + 5 * SPWL(6)) * TF
            d1 = (((d1 + 4 * SPWL(5)) * TF + 3 * SPWL(4)) * TF + 2 * SPWL(3)) * TF + SPWL(2)
        Else
            d1 = ((6 * SPWH(7) * TF + 5 * SPWH(6)) * TF + 4 * SPWH(5)) * TF
            d1 = ((d1 + 3 * SPWH(4)) * TF + 2 * SPWH(3)) * TF + SPWH(2)
        End If
        T = T + ER / d1
        GoTo PW100
    End If
End Sub

Function ReplaceComma(istr As String) As String
Dim i As Integer
    ReplaceComma = istr
    i = InStr(ReplaceComma, ",")
    
    While i > 0
        ReplaceComma = Left(ReplaceComma, i - 1) & " " & Mid(ReplaceComma, i + 1)
        i = InStr(ReplaceComma, ",")
    Wend
End Function

Function RightAlign(maxlen As Integer, decimals As Integer, Value As Single, Optional AddComma As Variant)
Rem ***************************************************
Rem *****  CONVERTS A NUMBER INTO A USER DEFINED STRING
Rem ***************************************************
Dim Work As String, fmt As String
Dim docomma As Boolean
Dim r1 As Single
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
        r1 = 10 ^ -decimals
        RSet Work = Format(Round(Value, r1), fmt)
    Else
        Work = Space(maxlen + IIf(docomma, 1, 0))
        
        If docomma Then
            fmt = "#,##0"
        Else
            fmt = String(maxlen - 1, "#") & "0"
        End If
        
        r1 = 1
        RSet Work = Format(Round(Value, r1), fmt)
    End If

    RightAlign = Work
End Function

Function Round(Value As Single, increment As Single) As Single
Rem ***********************************************
Rem *****  ROUNDS A NUMBER TO THE NEAREST INCREMENT
Rem ***********************************************
Dim val As Single
    val = (Value + increment / 2) / increment
    
    Select Case increment
        Case 0.1:   Round = Int(val) / 10
        Case 0.01:  Round = Int(val) / 100
        Case 0.001: Round = Int(val) / 1000
        Case Else:  Round = increment * Int(val)
    End Select
End Function

Function RoundDown(Value As Single, increment As Single) As Single
Rem ****************************************************
Rem *****  ROUNDS A NUMBER DOWN TO THE NEAREST INCREMENT
Rem ****************************************************
Dim inc As Single, val As Single
    inc = increment / 10:   val = Round(Value, inc)
    val = val / increment
    
    Select Case increment
        Case 0.1:   RoundDown = Int(val) / 10
        Case 0.01:  RoundDown = Int(val) / 100
        Case 0.001: RoundDown = Int(val) / 1000
        Case Else:  RoundDown = increment * Int(val)
    End Select
End Function

Function RoundUp(Value As Single, increment As Single) As Single
Rem **************************************************
Rem *****  ROUNDS A NUMBER UP TO THE NEAREST INCREMENT
Rem **************************************************
Dim inc As Single, val As Single
    inc = increment / 10:   val = Round(Value, inc)
    val = val / increment
    
    If Int(val) < val Then val = val + 1
    
    Select Case increment
        Case 0.1:   RoundUp = Int(val) / 10
        Case 0.01:  RoundUp = Int(val) / 100
        Case 0.001: RoundUp = Int(val) / 1000
        Case Else:  RoundUp = increment * Int(val)
    End Select
End Function

Sub SelTextBoxText(txt As TextBox)
Rem ***********************************************
Rem *****  SELECTS THE ENTIRE TEXT WITHIN A TEXTBOX
Rem ***********************************************
    If Len(txt.Text) > 0 Then
        txt.SelStart = 0
        txt.SelLength = Len(txt.Text)
    End If
End Sub

Static Sub SWAP(A, B)
Rem *****************************
Rem *****  SWAP VALUES OF A AND B
Rem *****************************
    z = A:      A = B:      B = z
End Sub

Static Sub TAB1(XTAB() As Single, YTAB() As Single, XVAL As Single, Y() As Single, L%(), LZ%)
Rem **********************************************************************
Rem *****  SIMULTANEOUS INTERPOLATION OF A MULTI-LINE DATA TABLE FOR DTABY
Rem **********************************************************************
Dim P(4)
    NX% = L%(1):    LX% = L%(2)
    KBOTM% = 1:     KTOP% = 2
    If NX% = 1 Then GoTo TA100
    If NX% = 2 Then GoTo TA500

    'CALL BISC IF THERE ARE AT LEAST THREE POINTS
    Call BISC(XTAB(), XVAL, NX%, KBOTM%, KTOP%, JJ%)
    If KBOTM% <> KTOP% Then GoTo TA300

TA100:
    For k% = 1 To LZ%
        j% = NX% * (k% - 1) + KBOTM%
        Y(k%) = YTAB(j%)
    Next
    Exit Sub

TA300:  'DETERMINE PROPER VALUES OF KBOTM% AND KTOP%
    If JJ% = 1 Or LX% <= 1 Then GoTo TA500
    KTOP% = KTOP% + 1
    If LX% >= 3 Then GoTo TA400
    If KTOP% <= NX% Then GoTo TA500

TA400:
    If KTOP% > NX% Then KTOP% = NX%
    KBOTM% = KBOTM% - 1
    If KBOTM% < 1 Then KBOTM% = 1

TA500:  'CALCULATE LAGRANGE COEFFICIENTS
    JJ% = 0
    For j% = KBOTM% To KTOP%
        JJ% = JJ% + 1
        P(JJ%) = 1
        xtabj = XTAB(j%)
        For i% = KBOTM% To KTOP%
            If i% <> j% Then
                xtabi = XTAB(i%)
                P(JJ%) = P(JJ%) * (XVAL - xtabi) / (xtabj - xtabi)
            End If
        Next
    Next

    'APPLY LAGRANGE COEFFICIENTS TO ALL LINES
    For k% = 1 To LZ%
        Y(k%) = 0
        JJ% = 0
        For j% = KBOTM% To KTOP%
            JJ% = JJ% + 1
            Y(k%) = Y(k%) + P(JJ%) * YTAB(j%)
        Next
        KBOTM% = KBOTM% + NX%
        KTOP% = KTOP% + NX%
    Next
End Sub

Static Sub TABY(XTAB() As Single, YTAB() As Single, N%, L%, XVAL As Single, YVAL As Single)
Rem ***********************************
Rem *****  1-D LAGRANGIAN INTERPOLATION
Rem ***********************************
    KBOTM% = 1: KTOP% = 2
    If N% = 1 Then GoTo T100
    If N% = 2 Then GoTo T400

    'CALL BISC IF THERE ARE AT LEAST THREE POINTS
    Call BISC(XTAB(), XVAL, N%, KBOTM%, KTOP%, JJ%)
    If KBOTM% <> KTOP% Then GoTo T200

T100:
    YVAL = YTAB(KBOTM%)
    Exit Sub

T200:   'DETERMINE PROPER VALUES OF KBOTM% AND KTOP%
    If JJ% = 1 Or L% <= 1 Then GoTo T400
    KTOP% = KTOP% + 1
    If L% >= 3 Then GoTo T300
    If KTOP% <= N% Then GoTo T400

T300:
    If KTOP% > N% Then KTOP% = N%
    KBOTM% = KBOTM% - 1
    If KBOTM% < 1 Then KBOTM% = 1

T400:   'CALCULATE LAGRANGE COEFFICIENTS
    YVAL = 0
    For j% = KBOTM% To KTOP%
        P = 1
        xtabj = XTAB(j%)
        For i% = KBOTM% To KTOP%
            If (i% = j%) Then
                P = P * YTAB(j%)
            Else
                xtabi = XTAB(i%)
                P = P * (XVAL - xtabi) / (xtabj - xtabi)
            End If
        Next
        YVAL = YVAL + P
    Next
End Sub

Static Sub THERMX()
Rem ***** INITIALIZE A FEW GLOBAL CONSTANTS
    R = 1545.32:        CONJ = 778.16
    WTAIR = 28.9669:    WTH2O = 18.016
    WTGAS = 114.229:    WTMET = 32.042:     WTNIT = 61.041
    PSTD = 14.696:      TZERO = 459.67:     TSIXTY = TZERO + 60

Rem ************************************
Rem ***** SATURATION PRESSURE DATA *****
Rem ************************************
    'SATURATION PRESSURE POLYNOMIAL COEFFICIENTS FOR WATER-VAPOR (DEG F) <= 400 degF
    SPWL(1) = -0.00614995:          SPWL(2) = 0.00315431
    SPWL(3) = -0.0000394572:        SPWL(4) = 0.00000114952
    SPWL(5) = -0.00000000482982:    SPWL(6) = 3.94109E-11
    SPWL(7) = -2.5216E-14:          SPWL(8) = 1.31214E-18

    'SATURATION PRESSURE POLYNOMIAL COEFFICIENTS FOR WATER-VAPOR (DEG F) > 400 degF
    SPWH(1) = 2988.77 - 0.054:      SPWH(2) = -41.4733
    SPWH(3) = 0.23721:              SPWH(4) = -0.000715806
    SPWH(5) = 0.0000012047:         SPWH(6) = -0.00000000104355
    SPWH(7) = 3.78789E-13:          SPWH(8) = 0
End Sub
