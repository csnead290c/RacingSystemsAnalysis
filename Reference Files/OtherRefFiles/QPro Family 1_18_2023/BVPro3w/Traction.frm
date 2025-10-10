VERSION 5.00
Begin VB.Form frmTractionIndex 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Help for Traction Index"
   ClientHeight    =   1695
   ClientLeft      =   2745
   ClientTop       =   3135
   ClientWidth     =   5085
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1695
   ScaleWidth      =   5085
   ShowInTaskbar   =   0   'False
   Begin VB.Frame frame1 
      Height          =   1755
      Left            =   0
      TabIndex        =   0
      Top             =   -60
      Width           =   5070
      Begin VB.Line Line2 
         BorderColor     =   &H00E0E0E0&
         X1              =   3360
         X2              =   3360
         Y1              =   105
         Y2              =   1965
      End
      Begin VB.Label lbl 
         Caption         =   "15 = Worst Dirt Track"
         Height          =   225
         Index           =   14
         Left            =   3480
         TabIndex        =   15
         Top             =   1425
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "14 = . . . . . . . . . . . ."
         Height          =   285
         Index           =   13
         Left            =   3480
         TabIndex        =   14
         Top             =   1125
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "13 = Loose Dry Lake"
         Height          =   315
         Index           =   12
         Left            =   3480
         TabIndex        =   13
         Top             =   825
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "1 = Best Asphalt"
         Height          =   195
         Index           =   0
         Left            =   120
         TabIndex        =   12
         Top             =   225
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "2 = . . . . . . . . . . "
         Height          =   195
         Index           =   1
         Left            =   120
         TabIndex        =   11
         Top             =   525
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "3 = Typical Street "
         Height          =   195
         Index           =   2
         Left            =   120
         TabIndex        =   10
         Top             =   825
         Width           =   1530
      End
      Begin VB.Line line1 
         BorderColor     =   &H00E0E0E0&
         X1              =   1680
         X2              =   1680
         Y1              =   105
         Y2              =   1965
      End
      Begin VB.Label lbl 
         Appearance      =   0  'Flat
         Caption         =   "4 = . . . . . . . . . . ."
         ForeColor       =   &H80000008&
         Height          =   195
         Index           =   3
         Left            =   120
         TabIndex        =   9
         Top             =   1125
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "5 = Best Salt Flat  "
         Height          =   195
         Index           =   4
         Left            =   120
         TabIndex        =   8
         Top             =   1425
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "6 = Slick Asphalt"
         Height          =   195
         Index           =   5
         Left            =   1800
         TabIndex        =   7
         Top             =   225
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "11 = Loose Salt Flat"
         Height          =   195
         Index           =   10
         Left            =   3480
         TabIndex        =   6
         Top             =   225
         Width           =   1530
      End
      Begin VB.Label lbl 
         Appearance      =   0  'Flat
         Caption         =   "10 = Good Dry Lake"
         ForeColor       =   &H80000008&
         Height          =   195
         Index           =   9
         Left            =   1800
         TabIndex        =   5
         Top             =   1425
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   " 9 = . . . . . . . . . . . "
         Height          =   195
         Index           =   8
         Left            =   1800
         TabIndex        =   4
         Top             =   1125
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   " 8 = Avg Salt Flat"
         Height          =   195
         Index           =   7
         Left            =   1800
         TabIndex        =   3
         Top             =   825
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   " 7 = . . . . . . . . . . "
         Height          =   195
         Index           =   6
         Left            =   1800
         TabIndex        =   2
         Top             =   525
         Width           =   1530
      End
      Begin VB.Label lbl 
         Caption         =   "12 = . . . . . . . . . . . ."
         Height          =   195
         Index           =   11
         Left            =   3480
         TabIndex        =   1
         Top             =   525
         Width           =   1530
      End
   End
End
Attribute VB_Name = "frmTractionIndex"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private Sub lbl_DblClick(Index As Integer)
    gc_TractionIndex.Value = Index + 1
    Unload Me
End Sub

