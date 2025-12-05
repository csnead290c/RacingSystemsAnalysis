VERSION 5.00
Begin VB.Form frmFriction 
   BorderStyle     =   3  'Fixed Dialog
   Caption         =   " Help: Friction Coefficient"
   ClientHeight    =   4605
   ClientLeft      =   6555
   ClientTop       =   2535
   ClientWidth     =   3285
   KeyPreview      =   -1  'True
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   4605
   ScaleWidth      =   3285
   ShowInTaskbar   =   0   'False
   Begin VB.Frame frame1 
      Height          =   4650
      Left            =   30
      TabIndex        =   0
      Top             =   -60
      Width           =   3240
      Begin VB.Frame Frame2 
         Height          =   2070
         Left            =   90
         TabIndex        =   3
         Top             =   1140
         Width           =   3060
         Begin VB.Line Line1 
            X1              =   75
            X2              =   2940
            Y1              =   1065
            Y2              =   1065
         End
         Begin VB.Label lbl 
            Alignment       =   1  'Right Justify
            Caption         =   "5167/5135 two disk combo = .33 to .40"
            Height          =   195
            Index           =   9
            Left            =   75
            TabIndex        =   11
            Top             =   1770
            Width           =   2850
         End
         Begin VB.Label lbl 
            Alignment       =   1  'Right Justify
            Caption         =   "5191/5167 two disk combo = .23 to .28"
            Height          =   195
            Index           =   8
            Left            =   60
            TabIndex        =   10
            Top             =   1185
            Width           =   2850
         End
         Begin VB.Label lbl 
            Alignment       =   1  'Right Justify
            Appearance      =   0  'Flat
            Caption         =   "5135 disk material = .38 to .46"
            ForeColor       =   &H80000008&
            Height          =   195
            Index           =   7
            Left            =   60
            TabIndex        =   9
            Top             =   765
            Width           =   2850
         End
         Begin VB.Label lbl 
            Alignment       =   1  'Right Justify
            Appearance      =   0  'Flat
            Caption         =   "5167 disk material (50/50) = .28 to .34"
            ForeColor       =   &H80000008&
            Height          =   195
            Index           =   3
            Left            =   60
            TabIndex        =   6
            Top             =   465
            Width           =   2850
         End
         Begin VB.Label lbl 
            Alignment       =   1  'Right Justify
            Caption         =   "5191/5135 two disk combo = .28 to .34"
            Height          =   195
            Index           =   2
            Left            =   60
            TabIndex        =   5
            Top             =   1470
            Width           =   2850
         End
         Begin VB.Label lbl 
            Alignment       =   1  'Right Justify
            Caption         =   "5191 disk material = .18 to .22"
            Height          =   195
            Index           =   1
            Left            =   60
            TabIndex        =   4
            Top             =   165
            Width           =   2850
         End
      End
      Begin VB.Label lbl 
         Caption         =   "note: increased friction material hardness usually increases the coefficient of friction."
         Height          =   420
         Index           =   6
         Left            =   60
         TabIndex        =   8
         Top             =   4170
         Width           =   3090
      End
      Begin VB.Label lbl 
         Caption         =   "note: higher friction material temperature usually increases the coefficient of friction."
         Height          =   420
         Index           =   5
         Left            =   60
         TabIndex        =   7
         Top             =   3720
         Width           =   3090
      End
      Begin VB.Label lbl 
         Caption         =   $"Friction.frx":0000
         Height          =   990
         Index           =   0
         Left            =   90
         TabIndex        =   2
         Top             =   165
         Width           =   3090
      End
      Begin VB.Label lbl 
         Caption         =   "note: coatings may reduce the coefficient of friction slightly, by .01 to .02 in value."
         Height          =   420
         Index           =   4
         Left            =   60
         TabIndex        =   1
         Top             =   3270
         Width           =   3090
      End
   End
End
Attribute VB_Name = "frmFriction"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
