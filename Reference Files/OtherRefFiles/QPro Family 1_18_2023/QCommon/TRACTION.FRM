VERSION 5.00
Begin VB.Form frmTractionIndex 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Help for Traction Index"
   ClientHeight    =   1950
   ClientLeft      =   2745
   ClientTop       =   3135
   ClientWidth     =   4290
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   1950
   ScaleWidth      =   4290
   ShowInTaskbar   =   0   'False
   Begin VB.Frame frame1 
      Height          =   2010
      Left            =   14
      TabIndex        =   0
      Top             =   -60
      Width           =   4260
      Begin VB.Label lbl 
         Caption         =   "1 = Best Traction"
         Height          =   195
         Index           =   0
         Left            =   120
         TabIndex        =   12
         Top             =   225
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "2 = Average National Event"
         Height          =   195
         Index           =   1
         Left            =   120
         TabIndex        =   11
         Top             =   525
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "3 = . . . . . . . . . . . . . "
         Height          =   195
         Index           =   2
         Left            =   120
         TabIndex        =   10
         Top             =   825
         Width           =   2010
      End
      Begin VB.Line line1 
         BorderColor     =   &H00E0E0E0&
         X1              =   2130
         X2              =   2130
         Y1              =   120
         Y2              =   1980
      End
      Begin VB.Label lbl 
         Appearance      =   0  'Flat
         Caption         =   "4 = Good Division Race"
         ForeColor       =   &H80000008&
         Height          =   195
         Index           =   3
         Left            =   120
         TabIndex        =   9
         Top             =   1125
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "5 = . . . . . . . . . . . . .  "
         Height          =   195
         Index           =   4
         Left            =   120
         TabIndex        =   8
         Top             =   1425
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "6 = Bracket Race"
         Height          =   195
         Index           =   5
         Left            =   120
         TabIndex        =   7
         Top             =   1725
         Width           =   2010
      End
      Begin VB.Label lbl 
         Caption         =   "11 = . . . . . . . . . . . ."
         Height          =   195
         Index           =   10
         Left            =   2280
         TabIndex        =   6
         Top             =   1425
         Width           =   1605
      End
      Begin VB.Label lbl 
         Appearance      =   0  'Flat
         Caption         =   "10 = Slick Street"
         ForeColor       =   &H80000008&
         Height          =   195
         Index           =   9
         Left            =   2280
         TabIndex        =   5
         Top             =   1125
         Width           =   1605
      End
      Begin VB.Label lbl 
         Caption         =   " 9 = . . . . . . . . . . . . . "
         Height          =   195
         Index           =   8
         Left            =   2280
         TabIndex        =   4
         Top             =   825
         Width           =   1605
      End
      Begin VB.Label lbl 
         Caption         =   " 8 = Typical Street"
         Height          =   195
         Index           =   7
         Left            =   2280
         TabIndex        =   3
         Top             =   525
         Width           =   1605
      End
      Begin VB.Label lbl 
         Caption         =   " 7 = . . . . . . . . . . . . . "
         Height          =   195
         Index           =   6
         Left            =   2280
         TabIndex        =   2
         Top             =   225
         Width           =   1605
      End
      Begin VB.Label lbl 
         Caption         =   "12 = Worst Traction"
         Height          =   195
         Index           =   11
         Left            =   2280
         TabIndex        =   1
         Top             =   1725
         Width           =   1605
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


