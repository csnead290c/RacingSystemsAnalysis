Attribute VB_Name = "Print"
Option Explicit
Option Compare Text

Private Y As Long
Private ysave As Long
Private line_height As Long
Private COL1 As Long
Private COL2 As Long
Private COL3 As Long
Private COL4 As Long
Private COL5 As Long
Private COL6 As Long
Private COL7 As Long

Private Const IS_NEWPAGE = True
Private Const IS_CENTER = True
Private Const IS_BOLD = True

Public Sub PrintPage()
Dim i As Integer
Dim pw80 As Long
Dim Work As String * 5
    Printer.fontsize = 10
    line_height = Printer.TextHeight("E")    'save 10 point line height
    pw80 = Printer.Width / 80
    
    COL1 = 5 * pw80:    COL2 = 25 * pw80:   COL3 = 30 * pw80
    COL4 = 40 * pw80:   COL5 = 62 * pw80:   COL6 = 67 * pw80:   COL7 = 67 * pw80
    
    PrintHeading COL1, Not IS_NEWPAGE
    
    Y = Printer.CurrentY + line_height
    printline frmClutch.Frame7.caption, 12 * pw80, Y, 10, , IS_BOLD
    printline frmClutch.Frame6.caption, 49 * pw80, Y, 10, , IS_BOLD

    Y = Printer.CurrentY
    printline gc_Mfg1.Labelctl.caption, COL1, Y, 10
    printline AName(gc_Mfg1.Value), COL2, Y, 10
    If gc_Mfg2.Value > 0 Then printline AName(gc_Mfg2.Value), COL3, Y, 10
    printline gc_Static.Labelctl.caption, COL4, Y, 10
    printline gc_Static.RightAlign(5), COL5, Y, 10

    Y = Printer.CurrentY
    printline gc_NArm1.Labelctl.caption, COL1, Y, 10
    printline gc_NArm1.RightAlign(5), COL2, Y, 10
    If gc_Mfg2.Value > 0 Then printline gc_NArm2.RightAlign(5), COL3, Y, 10
    printline String(39, "-"), COL4, Y, 10

    Y = Printer.CurrentY
    printline gc_TCWt1.Labelctl.caption, COL1, Y, 10
    printline gc_TCWt1.RightAlign(5), COL2, Y, 10
    If gc_Mfg2.Value > 0 Then printline gc_TCWt2.RightAlign(5), COL3, Y, 10
    printline gc_NSpring.Labelctl.caption, COL4, Y, 10
    printline "  " & frmClutch.lbl(8).caption, COL5, Y, 10
    printline gc_NSpring.RightAlign(5), COL6, Y, 10

    Y = Printer.CurrentY
    printline gc_CWt1.Labelctl.caption, COL1, Y, 10
    printline gc_CWt1.RightAlign(5), COL2, Y, 10
    If gc_Mfg2.Value > 0 Then printline gc_CWt2.RightAlign(5), COL3, Y, 10
    printline gc_BasePr.Labelctl.caption, COL4, Y, 10
    printline gc_SBasePr.RightAlign(5), COL5, Y, 10
    printline gc_BasePr.RightAlign(5), COL6, Y, 10

    Y = Printer.CurrentY
    printline gc_RingHt1.Labelctl.caption, COL1, Y, 10
    printline gc_RingHt1.RightAlign(5), COL2, Y, 10
    If gc_Mfg2.Value > 0 Then printline gc_RingHt2.RightAlign(5), COL3, Y, 10
    printline gc_SRate.Labelctl.caption, COL4, Y, 10
    printline gc_SSRate.RightAlign(5), COL5, Y, 10
    printline gc_SRate.RightAlign(5), COL6, Y, 10

    Y = Printer.CurrentY
    If gc_ArmDepth1.Value > 0 Then
        printline gc_ArmDepth1.Labelctl.caption, COL1, Y, 10
        printline gc_ArmDepth1.RightAlign(5), COL2, Y, 10
        If gc_Mfg2.Value > 0 Then printline gc_ArmDepth2.RightAlign(5), COL3, Y, 10
    End If
    If Not isBike Then
        printline gc_Turns.Labelctl.caption, COL4, Y, 10
        printline gc_Turns.RightAlign(5), COL6, Y, 10
    End If
    
    Y = Printer.CurrentY
    printline gc_ThrdpI.Labelctl.caption, COL4, Y, 10
    printline gc_ThrdpI.RightAlign(5), COL6, Y, 10

    If Not isGlide Then
        Y = Printer.CurrentY
        printline gc_dRnHt.Labelctl.caption, COL4, Y, 10
        printline gc_dRnHt.RightAlign(5), COL6, Y, 10
    End If
    
    COL1 = 6 * pw80:    COL2 = 12 * pw80:   COL3 = 18 * pw80
    COL4 = 25 * pw80:   COL5 = 49 * pw80:   COL6 = 55 * pw80:   COL7 = 61 * pw80
    
    Y = Printer.CurrentY + line_height
    printline frmClutch.Frame8.caption, 5 * pw80, Y, 10, , IS_BOLD
    printline frmClutch.Frame1.caption, 29 * pw80, Y, 10, , IS_BOLD
    
    Y = Printer.CurrentY
    printline "RPM  Centrif  Total", 7 * pw80, Y, 10, , IS_BOLD
    printline frmClutch.Label1(5).caption, COL4, Y, 10
    printline gc_dRPM1.RightAlign(5), COL5, Y, 10
    printline gc_dRPM2.RightAlign(5), COL6, Y, 10
    printline gc_dRPM3.RightAlign(5), COL7, Y, 10
    
    Y = Printer.CurrentY
    printline gc_grdClutch.RightAlign(0, 0, 5), COL1, Y, 10
    printline gc_grdClutch.RightAlign(1, 0, 5), COL2, Y, 10
    printline gc_grdClutch.RightAlign(2, 0, 5), COL3, Y, 10
    printline String(51, "-"), COL4, Y, 10
    
    Y = Printer.CurrentY
    printline gc_grdClutch.RightAlign(0, 1, 5), COL1, Y, 10
    printline gc_grdClutch.RightAlign(1, 1, 5), COL2, Y, 10
    printline gc_grdClutch.RightAlign(2, 1, 5), COL3, Y, 10
    printline frmClutch.Label1(0).caption, COL4, Y, 10
    RSet Work = frmClutch.Label1(1).caption
    printline Work, COL5, Y, 10
    RSet Work = frmClutch.Label1(2).caption
    printline Work, COL6, Y, 10
    RSet Work = frmClutch.Label1(3).caption
    printline Work, COL7, Y, 10
    
    Y = Printer.CurrentY
    printline gc_grdClutch.RightAlign(0, 2, 5), COL1, Y, 10
    printline gc_grdClutch.RightAlign(1, 2, 5), COL2, Y, 10
    printline gc_grdClutch.RightAlign(2, 2, 5), COL3, Y, 10
    printline frmClutch.Label2(0).caption, COL4, Y, 10
    RSet Work = frmClutch.Label2(1).caption
    printline Work, COL5, Y, 10
    RSet Work = frmClutch.Label2(2).caption
    printline Work, COL6, Y, 10
    RSet Work = frmClutch.Label2(3).caption
    printline Work, COL7, Y, 10
    
    Y = Printer.CurrentY
    printline gc_grdClutch.RightAlign(0, 3, 5), COL1, Y, 10
    printline gc_grdClutch.RightAlign(1, 3, 5), COL2, Y, 10
    printline gc_grdClutch.RightAlign(2, 3, 5), COL3, Y, 10
    If Not isGlide Then
        printline frmClutch.Label3(0).caption, COL4, Y, 10
        RSet Work = frmClutch.Label3(1).caption
        printline Work, COL5, Y, 10
        RSet Work = frmClutch.Label3(2).caption
        printline Work, COL6, Y, 10
        RSet Work = frmClutch.Label3(3).caption
        printline Work, COL7, Y, 10
    End If
    
    Y = Printer.CurrentY
    printline gc_grdClutch.RightAlign(0, 4, 5), COL1, Y, 10
    printline gc_grdClutch.RightAlign(1, 4, 5), COL2, Y, 10
    printline gc_grdClutch.RightAlign(2, 4, 5), COL3, Y, 10
    If Not isGlide And gc_ArmDepth1.Value > 0 Then
        printline frmClutch.Label4(0).caption, COL4, Y, 10
        RSet Work = frmClutch.Label4(1).caption
        printline Work, COL5, Y, 10
        RSet Work = frmClutch.Label4(2).caption
        printline Work, COL6, Y, 10
        RSet Work = frmClutch.Label4(3).caption
        printline Work, COL7, Y, 10
    End If
    
    Y = Printer.CurrentY
    printline gc_grdClutch.RightAlign(0, 5, 5), COL1, Y, 10
    printline gc_grdClutch.RightAlign(1, 5, 5), COL2, Y, 10
    printline gc_grdClutch.RightAlign(2, 5, 5), COL3, Y, 10
    printline frmClutch.Label5(0).caption, COL4, Y, 10
    RSet Work = frmClutch.Label5(1).caption
    printline Work, COL5, Y, 10
    RSet Work = frmClutch.Label5(2).caption
    printline Work, COL6, Y, 10
    RSet Work = frmClutch.Label5(3).caption
    printline Work, COL7, Y, 10

    Y = Printer.CurrentY
    printline gc_grdClutch.RightAlign(0, 6, 5), COL1, Y, 10
    printline gc_grdClutch.RightAlign(1, 6, 5), COL2, Y, 10
    printline gc_grdClutch.RightAlign(2, 6, 5), COL3, Y, 10
    printline frmClutch.Label6.caption, COL4, Y, 10

    For i = 7 To DYNO_ROWS - 1
        Y = Printer.CurrentY
        printline gc_grdClutch.RightAlign(0, i, 5), COL1, Y, 10
        printline gc_grdClutch.RightAlign(1, i, 5), COL2, Y, 10
        printline gc_grdClutch.RightAlign(2, i, 5), COL3, Y, 10
    Next
    
    If gc_Mfg1.Value = NARMD Then
        
        COL1 = 5 * pw80:    COL2 = 18 * pw80:   COL3 = 24 * pw80:   COL4 = 30 * pw80
    
        Load frmCustom
        
        printline frmCustom.caption, COL1, Y, 10, , IS_BOLD
    
        Y = Printer.CurrentY
        printline "Diameter    dR      dZ", 17 * pw80, Y, 10
        
        Y = Printer.CurrentY
        printline gc_ADATA2.Labelctl.caption, COL1, Y, 10
        printline gc_ADATA2.RightAlign(6), COL2, Y, 10
        printline "  .000", COL3, Y, 10
        printline "  .000", COL4, Y, 10
    
        Y = Printer.CurrentY
        printline gc_PVTDR.Labelctl.caption, COL1, Y, 10
        printline gc_PVTDR.RightAlign(6), COL3, Y, 10
        printline gc_PVTDZ.RightAlign(6), COL4, Y, 10
    
        Y = Printer.CurrentY
        printline gc_CWTDR.Labelctl.caption, COL1, Y, 10
        printline gc_CWTDR.RightAlign(6), COL3, Y, 10
        printline gc_CWTDZ.RightAlign(6), COL4, Y, 10
    
        Y = Printer.CurrentY
        printline gc_CGDR.Labelctl.caption, COL1, Y, 10
        printline gc_CGDR.RightAlign(6), COL3, Y, 10
        printline gc_CGDZ.RightAlign(6), COL4, Y, 10
        
        Y = Printer.CurrentY
        printline gc_ADATA1.Labelctl.caption, COL1, Y, 10
        printline gc_ADATA1.RightAlign(6), COL4, Y, 10
        
        Y = Printer.CurrentY
        printline gc_ADATA6.Labelctl.caption, COL1, Y, 10
        printline gc_ADATA6.RightAlign(6), COL4, Y, 10
        
        If frmCustom.Visible Then frmCustom.Hide
    End If

    Printer.EndDoc
End Sub

Private Sub printline(szLine As String, X As Long, Y As Long, Optional fontsize As Variant, Optional center As Variant, Optional fontbold As Variant)
    If Not IsMissing(fontsize) Then If IsNumeric(fontsize) Then Printer.fontsize = fontsize
    If Not IsMissing(fontbold) Then If fontbold Then Printer.fontbold = fontbold
    
    Printer.CurrentX = X:      Printer.CurrentY = Y
    
    If Not IsMissing(center) Then
        If center Then Printer.CurrentX = ((Printer.Width - X) / 2) - (Printer.TextWidth(szLine) / 2)
    End If
    
    Printer.Print szLine
    Printer.fontbold = False
End Sub

Private Sub PrintHeading(tab05 As Long, NewPage As Variant)
Dim i As Integer
    If NewPage Then Printer.NewPage
    
    Y = 0
    printline "", tab05, Y, 10
    printline App.ProductName & " - Version " & App.Major & "." & App.Minor & " - " & NameOnly(FileName), tab05, Printer.CurrentY, 14, IS_CENTER, IS_BOLD
    printline "www.RacingSecrets.com - www.SpeedTalk.com", tab05, Printer.CurrentY, 12, IS_CENTER, IS_BOLD
    
    Y = Printer.CurrentY
    printline String(84, "-"), tab05, Y, 10
End Sub
