VERSION 5.00
Begin VB.Form frmPreferences 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Preferences"
   ClientHeight    =   2100
   ClientLeft      =   390
   ClientTop       =   1785
   ClientWidth     =   6375
   LinkTopic       =   "Form1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   PaletteMode     =   1  'UseZOrder
   ScaleHeight     =   2100
   ScaleWidth      =   6375
   StartUpPosition =   1  'CenterOwner
   Begin VB.Frame Frame2 
      BorderStyle     =   0  'None
      Height          =   690
      Left            =   4950
      TabIndex        =   11
      Top             =   240
      Width           =   1200
      Begin VB.OptionButton optPerPage 
         Caption         =   "2 per page"
         Height          =   255
         Index           =   0
         Left            =   90
         TabIndex        =   13
         Top             =   90
         Width           =   1080
      End
      Begin VB.OptionButton optPerPage 
         Caption         =   "4 per page"
         Height          =   255
         Index           =   1
         Left            =   90
         TabIndex        =   12
         Top             =   360
         Width           =   1080
      End
   End
   Begin VB.CommandButton cmdsBtnSave 
      Caption         =   "Save"
      Default         =   -1  'True
      BeginProperty Font 
         Name            =   "MS Sans Serif"
         Size            =   12
         Charset         =   0
         Weight          =   700
         Underline       =   0   'False
         Italic          =   0   'False
         Strikethrough   =   0   'False
      EndProperty
      Height          =   705
      Left            =   3300
      TabIndex        =   7
      Top             =   1290
      Width           =   900
   End
   Begin VB.Frame frame1 
      Caption         =   "Graph Print Options"
      Height          =   1080
      Left            =   3300
      TabIndex        =   9
      Top             =   90
      Width           =   2970
      Begin VB.OptionButton optGraph 
         Caption         =   "No Graphs"
         Height          =   255
         Index           =   0
         Left            =   135
         TabIndex        =   4
         Top             =   240
         Width           =   1260
      End
      Begin VB.OptionButton optGraph 
         Caption         =   "Open Graphs"
         Height          =   255
         Index           =   1
         Left            =   135
         TabIndex        =   5
         Top             =   510
         Width           =   1260
      End
      Begin VB.OptionButton optGraph 
         Caption         =   "All Graphs"
         Height          =   255
         Index           =   2
         Left            =   135
         TabIndex        =   6
         Top             =   780
         Width           =   1260
      End
   End
   Begin VB.Frame fraWorksheetOptions 
      Caption         =   "Worksheet Print Options"
      Height          =   810
      Left            =   4290
      TabIndex        =   8
      Top             =   1200
      Width           =   1980
      Begin VB.OptionButton optWorkSheets 
         Caption         =   "All Worksheets"
         Height          =   255
         Index           =   1
         Left            =   135
         TabIndex        =   3
         Top             =   510
         Width           =   1410
      End
      Begin VB.OptionButton optWorkSheets 
         Caption         =   "No Worksheets"
         Height          =   255
         Index           =   0
         Left            =   135
         TabIndex        =   2
         Top             =   240
         Width           =   1410
      End
   End
   Begin VB.Frame fraPath 
      Caption         =   "Default Data Document Path"
      Height          =   1905
      Left            =   120
      TabIndex        =   10
      Top             =   90
      Width           =   3075
      Begin VB.DirListBox dirPath 
         Height          =   990
         Left            =   180
         TabIndex        =   1
         Top             =   720
         Width           =   2685
      End
      Begin VB.DriveListBox drvPath 
         Height          =   315
         Left            =   195
         TabIndex        =   0
         Top             =   270
         Width           =   2670
      End
   End
End
Attribute VB_Name = "frmPreferences"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit
Option Compare Text

Private Sub cmdsBtnSave_Click()
    SavePreferences Trim(dirPath.Path), g_wsopt, g_gphopt, g_gpgopt
    Me.Hide
End Sub

Private Sub dirPath_Change()
    g_pth = Trim(dirPath.Path)
End Sub

Private Sub drvPath_Change()
    dirPath.Path = drvPath.Drive '& "\"
End Sub

Private Sub Form_Load()
    Me.caption = "Preferences: " & App.ProductName
    
    drvPath.Drive = left(g_pth, 2)
    dirPath.Path = g_pth
    optWorkSheets(g_wsopt).Value = True
    optGraph(g_gphopt).Value = True
    optPerPage(g_gpgopt).Value = True
    
    #If ISQUARTERJR Then
        fraWorksheetOptions.Enabled = False
        fraWorksheetOptions.Visible = False
    #End If
End Sub

Private Sub optGraph_Click(index As Integer)
    g_gphopt = index
End Sub

Private Sub optPerPage_Click(index As Integer)
    g_gpgopt = index
End Sub

Private Sub optWorkSheets_Click(index As Integer)
    g_wsopt = index
End Sub
