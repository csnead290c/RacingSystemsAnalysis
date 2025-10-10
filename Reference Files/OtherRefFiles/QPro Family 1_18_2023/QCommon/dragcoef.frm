VERSION 5.00
Begin VB.Form FrmDragCoef 
   BorderStyle     =   1  'Fixed Single
   Caption         =   " Help for Drag Coefficient"
   ClientHeight    =   4365
   ClientLeft      =   3015
   ClientTop       =   1605
   ClientWidth     =   5340
   LinkTopic       =   "Form1"
   LockControls    =   -1  'True
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   4365
   ScaleWidth      =   5340
   ShowInTaskbar   =   0   'False
   Begin VB.Frame frame2 
      Caption         =   "Sample Aerodynamic Drag Data from actual drag race vehicles"
      Height          =   1425
      Index           =   1
      Left            =   30
      TabIndex        =   1
      Top             =   2910
      Width           =   5295
      Begin VB.Label Label20 
         Caption         =   "Cd"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   -1  'True
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   195
         Left            =   4650
         TabIndex        =   21
         Top             =   210
         Width           =   450
      End
      Begin VB.Label Label19 
         Caption         =   "Body Style"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   -1  'True
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   195
         Left            =   3030
         TabIndex        =   20
         Top             =   210
         Width           =   1200
      End
      Begin VB.Label Label18 
         Caption         =   "Cd"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   -1  'True
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   195
         Left            =   1800
         TabIndex        =   19
         Top             =   210
         Width           =   600
      End
      Begin VB.Label Label17 
         Caption         =   "Body Style"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   -1  'True
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   195
         Left            =   240
         TabIndex        =   18
         Top             =   210
         Width           =   1200
      End
      Begin VB.Label Label16 
         Caption         =   "0.5"
         Height          =   195
         Left            =   4650
         TabIndex        =   17
         Top             =   1140
         Width           =   450
      End
      Begin VB.Label Label15 
         Caption         =   "0.4"
         Height          =   195
         Left            =   4650
         TabIndex        =   16
         Top             =   900
         Width           =   450
      End
      Begin VB.Label Label14 
         Caption         =   "0.55"
         Height          =   195
         Left            =   4650
         TabIndex        =   15
         Top             =   660
         Width           =   450
      End
      Begin VB.Label Label13 
         Caption         =   "0.55"
         Height          =   195
         Left            =   4650
         TabIndex        =   14
         Top             =   420
         Width           =   450
      End
      Begin VB.Label Label12 
         Caption         =   "Pro Stock Bike"
         Height          =   195
         Left            =   3030
         TabIndex        =   13
         Top             =   1140
         Width           =   1500
      End
      Begin VB.Label Label11 
         Caption         =   "Typical Bodied Car"
         Height          =   195
         Left            =   3030
         TabIndex        =   12
         Top             =   900
         Width           =   1500
      End
      Begin VB.Label Label10 
         Caption         =   "Typical Roadster"
         Height          =   195
         Left            =   3030
         TabIndex        =   11
         Top             =   660
         Width           =   1500
      End
      Begin VB.Label Label9 
         Caption         =   "Comp Dragster"
         Height          =   195
         Left            =   3030
         TabIndex        =   10
         Top             =   420
         Width           =   1500
      End
      Begin VB.Label Label8 
         Caption         =   "0.35"
         Height          =   195
         Left            =   1800
         TabIndex        =   9
         Top             =   1140
         Width           =   450
      End
      Begin VB.Label Label7 
         Caption         =   "0.3"
         Height          =   195
         Left            =   1800
         TabIndex        =   8
         Top             =   900
         Width           =   450
      End
      Begin VB.Label Label6 
         Caption         =   "0.5"
         Height          =   195
         Left            =   1800
         TabIndex        =   7
         Top             =   660
         Width           =   450
      End
      Begin VB.Label Label5 
         Caption         =   "0.7"
         Height          =   195
         Left            =   1800
         TabIndex        =   6
         Top             =   420
         Width           =   450
      End
      Begin VB.Label Label4 
         Caption         =   "Alcohol Funny Car"
         Height          =   195
         Left            =   240
         TabIndex        =   5
         Top             =   1140
         Width           =   1500
      End
      Begin VB.Label Label3 
         Caption         =   "Modern Pro Stock"
         Height          =   195
         Left            =   240
         TabIndex        =   4
         Top             =   900
         Width           =   1500
      End
      Begin VB.Label Label2 
         Caption         =   "Nitro Funny Car"
         Height          =   195
         Left            =   240
         TabIndex        =   3
         Top             =   660
         Width           =   1500
      End
      Begin VB.Label Label1 
         Caption         =   "Top Fuel Dragster"
         Height          =   195
         Left            =   240
         TabIndex        =   2
         Top             =   420
         Width           =   1500
      End
   End
   Begin VB.Frame frame1 
      Caption         =   "Sample Aerodynamic Drag Data from the Bosch Automotive Handbook"
      Height          =   2850
      Index           =   0
      Left            =   30
      TabIndex        =   0
      Top             =   30
      Width           =   5295
      Begin VB.Label Label42 
         Caption         =   "0.6 - 0.7"
         Height          =   195
         Left            =   3600
         TabIndex        =   43
         Top             =   2580
         Width           =   900
      End
      Begin VB.Label Label41 
         Caption         =   "0.8 - 1.5"
         Height          =   195
         Left            =   3600
         TabIndex        =   42
         Top             =   2340
         Width           =   900
      End
      Begin VB.Label Label40 
         Caption         =   "0.6 - 0.7"
         Height          =   195
         Left            =   3600
         TabIndex        =   41
         Top             =   2100
         Width           =   900
      End
      Begin VB.Label Label39 
         Caption         =   "0.15 - 0.2"
         Height          =   195
         Left            =   3600
         TabIndex        =   40
         Top             =   1860
         Width           =   900
      End
      Begin VB.Label Label38 
         Caption         =   "0.23"
         Height          =   195
         Left            =   3600
         TabIndex        =   39
         Top             =   1620
         Width           =   900
      End
      Begin VB.Label Label37 
         Caption         =   "0.2 - 0.25"
         Height          =   195
         Left            =   3600
         TabIndex        =   38
         Top             =   1380
         Width           =   900
      End
      Begin VB.Label Label36 
         Caption         =   "0.3 - 0.4"
         Height          =   195
         Left            =   3600
         TabIndex        =   37
         Top             =   1140
         Width           =   900
      End
      Begin VB.Label Label35 
         Caption         =   "0.4 - 0.55"
         Height          =   195
         Left            =   3600
         TabIndex        =   36
         Top             =   900
         Width           =   900
      End
      Begin VB.Label Label34 
         Caption         =   "0.5 - 0.6"
         Height          =   195
         Left            =   3600
         TabIndex        =   35
         Top             =   660
         Width           =   900
      End
      Begin VB.Label Label33 
         Caption         =   "0.5 - 0.7"
         Height          =   195
         Left            =   3600
         TabIndex        =   34
         Top             =   420
         Width           =   900
      End
      Begin VB.Label Label32 
         Caption         =   "Buses"
         Height          =   195
         Left            =   600
         TabIndex        =   33
         Top             =   2580
         Width           =   2850
      End
      Begin VB.Label Label31 
         Caption         =   "Trucks"
         Height          =   195
         Left            =   600
         TabIndex        =   32
         Top             =   2340
         Width           =   2850
      End
      Begin VB.Label Label30 
         Caption         =   "Motorcycles"
         Height          =   195
         Left            =   600
         TabIndex        =   31
         Top             =   2100
         Width           =   2850
      End
      Begin VB.Label Label29 
         Caption         =   "Optimum streamliner"
         Height          =   195
         Left            =   600
         TabIndex        =   30
         Top             =   1860
         Width           =   2850
      End
      Begin VB.Label Label28 
         Caption         =   "K-shape (developed by Prof. Kamm)"
         Height          =   195
         Left            =   600
         TabIndex        =   29
         Top             =   1620
         Width           =   2850
      End
      Begin VB.Label Label27 
         Caption         =   "Fairings all around, streamlined shapes"
         Height          =   195
         Left            =   600
         TabIndex        =   28
         Top             =   1380
         Width           =   2850
      End
      Begin VB.Label Label26 
         Caption         =   "Fastback styles"
         Height          =   195
         Left            =   600
         TabIndex        =   27
         Top             =   1140
         Width           =   2850
      End
      Begin VB.Label Label25 
         Caption         =   "Notchback or Sedan"
         Height          =   195
         Left            =   600
         TabIndex        =   26
         Top             =   900
         Width           =   2850
      End
      Begin VB.Label Label24 
         Caption         =   "Station Wagon and Van Bodies"
         Height          =   195
         Left            =   600
         TabIndex        =   25
         Top             =   660
         Width           =   2850
      End
      Begin VB.Label Label23 
         Caption         =   "Open Convertible"
         Height          =   195
         Left            =   600
         TabIndex        =   24
         Top             =   420
         Width           =   2850
      End
      Begin VB.Label Label22 
         Caption         =   "Drag Coefficient - Cd"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   -1  'True
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   195
         Left            =   2940
         TabIndex        =   23
         Top             =   210
         Width           =   1800
      End
      Begin VB.Label Label21 
         Caption         =   "Body Style"
         BeginProperty Font 
            Name            =   "MS Sans Serif"
            Size            =   8.25
            Charset         =   0
            Weight          =   700
            Underline       =   -1  'True
            Italic          =   0   'False
            Strikethrough   =   0   'False
         EndProperty
         Height          =   195
         Left            =   600
         TabIndex        =   22
         Top             =   210
         Width           =   1200
      End
   End
End
Attribute VB_Name = "FrmDragCoef"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
