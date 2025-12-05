VERSION 5.00
Begin VB.Form frmMfgList 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Help: Mfg.Style Code"
   ClientHeight    =   8115
   ClientLeft      =   3255
   ClientTop       =   1320
   ClientWidth     =   3885
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   8115
   ScaleWidth      =   3885
   ShowInTaskbar   =   0   'False
   StartUpPosition =   1  'CenterOwner
   Begin VB.Frame Frame 
      Caption         =   "frame 4"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1590
      Index           =   4
      Left            =   30
      TabIndex        =   15
      Top             =   6510
      Visible         =   0   'False
      Width           =   3840
      Begin VB.Label lbl4 
         Caption         =   "5"
         Height          =   195
         Index           =   5
         Left            =   60
         TabIndex        =   20
         Top             =   1320
         Width           =   3750
      End
      Begin VB.Label lbl4 
         Caption         =   "4"
         Height          =   195
         Index           =   4
         Left            =   60
         TabIndex        =   19
         Top             =   1050
         Width           =   3750
      End
      Begin VB.Label lbl4 
         Caption         =   "3"
         Height          =   195
         Index           =   3
         Left            =   60
         TabIndex        =   18
         Top             =   780
         Width           =   3750
      End
      Begin VB.Label lbl4 
         Caption         =   "1"
         Height          =   195
         Index           =   1
         Left            =   60
         TabIndex        =   17
         Top             =   240
         Width           =   3750
      End
      Begin VB.Label lbl4 
         Caption         =   "2"
         Height          =   195
         Index           =   2
         Left            =   60
         TabIndex        =   16
         Top             =   510
         Width           =   3750
      End
   End
   Begin VB.Frame Frame 
      Caption         =   "frame 3"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   1590
      Index           =   3
      Left            =   30
      TabIndex        =   9
      Top             =   4890
      Visible         =   0   'False
      Width           =   3840
      Begin VB.Label lbl3 
         Caption         =   "1"
         Height          =   195
         Index           =   1
         Left            =   60
         TabIndex        =   14
         Top             =   240
         Width           =   3750
      End
      Begin VB.Label lbl3 
         Caption         =   "2"
         Height          =   195
         Index           =   2
         Left            =   60
         TabIndex        =   13
         Top             =   510
         Width           =   3750
      End
      Begin VB.Label lbl3 
         Caption         =   "3"
         Height          =   195
         Index           =   3
         Left            =   60
         TabIndex        =   12
         Top             =   780
         Width           =   3750
      End
      Begin VB.Label lbl3 
         Appearance      =   0  'Flat
         Caption         =   "4"
         ForeColor       =   &H80000008&
         Height          =   195
         Index           =   4
         Left            =   60
         TabIndex        =   11
         Top             =   1050
         Width           =   3750
      End
      Begin VB.Label lbl3 
         Caption         =   "5"
         Height          =   195
         Index           =   5
         Left            =   60
         TabIndex        =   10
         Top             =   1320
         Width           =   3750
      End
   End
   Begin VB.Frame Frame 
      Caption         =   "frame 2"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   2400
      Index           =   2
      Left            =   30
      TabIndex        =   4
      Top             =   2460
      Visible         =   0   'False
      Width           =   3840
      Begin VB.Label lbl2 
         Caption         =   "8"
         Height          =   225
         Index           =   8
         Left            =   60
         TabIndex        =   29
         Top             =   2130
         Width           =   3750
      End
      Begin VB.Label lbl2 
         Caption         =   "7"
         Height          =   225
         Index           =   7
         Left            =   60
         TabIndex        =   28
         Top             =   1860
         Width           =   3750
      End
      Begin VB.Label lbl2 
         Caption         =   "6"
         Height          =   225
         Index           =   6
         Left            =   60
         TabIndex        =   27
         Top             =   1590
         Width           =   3750
      End
      Begin VB.Label lbl2 
         Caption         =   "5"
         Height          =   195
         Index           =   5
         Left            =   60
         TabIndex        =   21
         Top             =   1320
         Width           =   3750
      End
      Begin VB.Label lbl2 
         Caption         =   "4"
         Height          =   195
         Index           =   4
         Left            =   60
         TabIndex        =   8
         Top             =   1050
         Width           =   3750
      End
      Begin VB.Label lbl2 
         Caption         =   "3"
         Height          =   195
         Index           =   3
         Left            =   60
         TabIndex        =   7
         Top             =   780
         Width           =   3750
      End
      Begin VB.Label lbl2 
         Appearance      =   0  'Flat
         Caption         =   "2"
         ForeColor       =   &H80000008&
         Height          =   195
         Index           =   2
         Left            =   60
         TabIndex        =   6
         Top             =   510
         Width           =   3750
      End
      Begin VB.Label lbl2 
         Caption         =   "1"
         Height          =   225
         Index           =   1
         Left            =   60
         TabIndex        =   5
         Top             =   240
         Width           =   3750
      End
   End
   Begin VB.Frame Frame 
      Caption         =   "frame 1"
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   8.25
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   2400
      Index           =   1
      Left            =   30
      TabIndex        =   0
      Top             =   30
      Visible         =   0   'False
      Width           =   3840
      Begin VB.Label lbl1 
         Caption         =   "8"
         Height          =   195
         Index           =   8
         Left            =   60
         TabIndex        =   26
         Top             =   2130
         Width           =   3750
      End
      Begin VB.Label lbl1 
         Caption         =   "7"
         Height          =   195
         Index           =   7
         Left            =   60
         TabIndex        =   25
         Top             =   1860
         Width           =   3750
      End
      Begin VB.Label lbl1 
         Caption         =   "6"
         Height          =   195
         Index           =   6
         Left            =   60
         TabIndex        =   24
         Top             =   1590
         Width           =   3750
      End
      Begin VB.Label lbl1 
         Caption         =   "5"
         Height          =   195
         Index           =   5
         Left            =   60
         TabIndex        =   23
         Top             =   1320
         Width           =   3750
      End
      Begin VB.Label lbl1 
         Caption         =   "4"
         Height          =   195
         Index           =   4
         Left            =   60
         TabIndex        =   22
         Top             =   1050
         Width           =   3750
      End
      Begin VB.Label lbl1 
         Caption         =   "3"
         Height          =   195
         Index           =   3
         Left            =   60
         TabIndex        =   3
         Top             =   780
         Width           =   3750
      End
      Begin VB.Label lbl1 
         Caption         =   "1"
         Height          =   195
         Index           =   1
         Left            =   60
         TabIndex        =   2
         Top             =   240
         Width           =   3750
      End
      Begin VB.Label lbl1 
         Caption         =   "2"
         Height          =   195
         Index           =   2
         Left            =   60
         TabIndex        =   1
         Top             =   510
         Width           =   3750
      End
   End
End
Attribute VB_Name = "frmMfgList"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private lastFrame As Integer
Private lastIndex As Integer

Private Sub Form_Load()
Dim i As Integer
Dim n As Integer
    For n = 1 To nMfg - 1
        With Frame(n)
            If n > 1 Then .Top = Frame(n - 1).Top + Frame(n - 1).Height + 30
            
            Select Case n
                Case 1: .Height = lbl1(nArmMfg(n)).Top + 270
                Case 2: .Height = lbl2(nArmMfg(n)).Top + 270
                Case 3: .Height = lbl3(nArmMfg(n)).Top + 270
                Case 4: .Height = lbl4(nArmMfg(n)).Top + 270
            End Select
            
            .caption = MfgName(n)
            For i = 1 To nArmMfg(n)
                Select Case n
                    Case 1: lbl1(i).caption = ADesc(i)
                    Case 2: lbl2(i).caption = ADesc(nArmMfg(1) + i)
                    Case 3: lbl3(i).caption = ADesc(nArmMfg(1) + nArmMfg(2) + i)
                    Case 4: lbl4(i).caption = ADesc(nArmMfg(1) + nArmMfg(2) + nArmMfg(3) + i)
                End Select
            Next
            
            .Visible = True
        End With
    Next
    
    frmMfgList.Height = 750 + 15 * (nMfg - 1) + 255 * (nMfg - 2) + 270 * (NARMD - 1)
End Sub

Private Sub lbl1_Click(Index As Integer)
    If lastFrame > 0 And lastIndex > 0 Then FrameCheck
    
    lbl1(Index).BackColor = GetSysColor(13)  'color_highlight
    lbl1(Index).ForeColor = GetSysColor(14)  'color_highlighttext
    lastFrame = 1
    lastIndex = Index
End Sub

Private Sub lbl2_Click(Index As Integer)
    If lastFrame > 0 And lastIndex > 0 Then FrameCheck
    
    lbl2(Index).BackColor = GetSysColor(13)  'color_highlight
    lbl2(Index).ForeColor = GetSysColor(14)  'color_highlighttext
    lastFrame = 2
    lastIndex = Index
End Sub

Private Sub lbl3_Click(Index As Integer)
    If lastFrame > 0 And lastIndex > 0 Then FrameCheck
    
    lbl3(Index).BackColor = GetSysColor(13)  'color_highlight
    lbl3(Index).ForeColor = GetSysColor(14)  'color_highlighttext
    lastFrame = 3
    lastIndex = Index
End Sub

Private Sub lbl4_Click(Index As Integer)
    If lastFrame > 0 And lastIndex > 0 Then FrameCheck
    
    lbl4(Index).BackColor = GetSysColor(13)  'color_highlight
    lbl4(Index).ForeColor = GetSysColor(14)  'color_highlighttext
    lastFrame = 4
    lastIndex = Index
End Sub

Private Sub FrameCheck()
    Select Case lastFrame
        Case 1: lbl1(lastIndex).BackColor = GetSysColor(15) 'color_btnface
                lbl1(lastIndex).ForeColor = GetSysColor(7)  'color_menutext
        Case 2: lbl2(lastIndex).BackColor = GetSysColor(15)
                lbl2(lastIndex).ForeColor = GetSysColor(7)
        Case 3: lbl3(lastIndex).BackColor = GetSysColor(15)
                lbl3(lastIndex).ForeColor = GetSysColor(7)
        Case 4: lbl4(lastIndex).BackColor = GetSysColor(15)
                lbl4(lastIndex).ForeColor = GetSysColor(7)
    End Select
End Sub

Private Sub lbl1_DblClick(Index As Integer)
    Unload Me
    frmClutch.txtMfg1.Text = AName(Index)
    frmClutch.txtMfg1.SetFocus
    frmClutch.txtMfg1_Check
End Sub

Private Sub lbl2_DblClick(Index As Integer)
    Unload Me
    frmClutch.txtMfg1.Text = AName(nArmMfg(1) + Index)
    frmClutch.txtMfg1.SetFocus
    frmClutch.txtMfg1_Check
End Sub

Private Sub lbl3_DblClick(Index As Integer)
    Unload Me
    frmClutch.txtMfg1.Text = AName(nArmMfg(1) + nArmMfg(2) + Index)
    frmClutch.txtMfg1.SetFocus
    frmClutch.txtMfg1_Check
End Sub

Private Sub lbl4_DblClick(Index As Integer)
    Unload Me
    frmClutch.txtMfg1.Text = AName(nArmMfg(1) + nArmMfg(2) + nArmMfg(3) + Index)
    frmClutch.txtMfg1.SetFocus
    frmClutch.txtMfg1_Check
End Sub
