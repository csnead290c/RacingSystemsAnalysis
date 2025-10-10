Attribute VB_Name = "modDeclares"
Option Explicit
Public Const HELP_SET = 0
Public Const HELP_SAVE = 1
Public Const HELP_RESET = 2

Public Const UOM_NORMAL = True
Public Const UOM_ALTERNATE = False

Public Const PI = 3.141593
Public Const gc = 32.174
Public Const Z6 = (60 / (2 * PI)) * 550

Public Const GPH_TIME_RPM = 0
Public Const GPH_TIME_G = 1
Public Const GPH_SEPARATOR = 2
Public Const GPH_DIST_RPM = 3
Public Const GPH_DIST_G = 4
Public Const GPH_RPM_HIST = 6

Public Const MNU_MAIN_FILE = 0
Public Const MNU_MAIN_RUN = 1
Public Const MNU_MAIN_GRAPH = 2
Public Const MNU_MAIN_WINDOW = 3
Public Const MNU_MAIN_HELP = 4

Public Const MNU_FILE_OPEN = 0
Public Const MNU_FILE_SAVE = 1
Public Const MNU_FILE_SAVEAS = 2
Public Const MNU_FILE_PRINT = 4
Public Const MNU_FILE_PRINTSETUP = 5
Public Const MNU_FILE_PREFERENCES = 7
Public Const MNU_FILE_EXIT = 9

Public Const MNU_WINDOW_CASCADE = 0
Public Const MNU_WINDOW_TILE = 1

Public Const COL_RPM = 0
Public Const COL_HP = 1
Public Const COL_TQ = 2
Public Const COL_RATIO = 0
Public Const COL_EFF = 1
Public Const COL_SHIFT = 2

Public gf_Graphs(0 To 4) As New frmGraph

'ofn, Note and preferences
Public ofn As String
Public Note As String
Public g_wsopt As Integer
Public g_gphopt As Integer
Public g_gpgopt As Integer
Public g_pth As String

'command buttons
Public gc_OpenBtn As New CButton
Public gc_SaveBtn As New CButton
Public gc_PrintBtn As New CButton
Public gc_RunBtn As New CButton
Public gc_GraphBtn(0 To 6) As New CButton
Public gc_DynoDataBtn As New CButton
Public gc_RecalcBtn As New CButton
Public gc_OutputBtn As New CButton

'worksheet buttons
Public gc_WindAngleBtn As New CButton
Public gc_RefAreaBtn As New CButton
Public gc_DragCoefBtn As New CButton
Public gc_ShapeFactorBtn As New CButton
Public gc_GearRatioBtn As New CButton
Public gc_TireWidthBtn As New CButton
Public gc_TractionIndexBtn As New CButton
Public gc_EnginePMIBtn As New CButton
Public gc_TransPMIBtn As New CButton
Public gc_TiresPMIBtn As New CButton

'classes
Public gc_Graph(0 To 4) As New CGraph
Public gc_ER As New CError
Public clsVals As New CValues

'QUARTER Pro variables
'General
Public gc_Elevation As New CValue
Public gc_Temperature As New CValue
Public gc_Barometer As New CValue
Public gc_Humidity As New CValue
Public gc_WindSpeed As New CValue
Public gc_WindAngle As New CValue
Public gc_TrackTemp As New CValue
Public gc_TractionIndex As New CValue
Public gc_Track As New CValue

'Vehicle
Public gc_Weight As New CValue
Public gc_Wheelbase As New CValue
Public gc_Rollout As New CValue
Public gc_Overhang As New CValue

'Torque Converter/Clutch data
Public gc_TransType As New CValue
Public gc_LaunchRPM As New CValue
Public gc_SlipStallRPM As New CValue
Public gc_Slippage As New CValue
Public gc_LockUp As New CValue
Public gc_TorqueMult As New CValue

'Aerodynamic Data
Public gc_RefArea As New CValue
Public gc_DragCoef As New CValue
Public gc_LiftCoef As New CValue

'Engine Data
Public gc_HPTQMult As New CValue
Public gc_FuelSystem As New CValue

'Final Drive Data
Public gc_GearRatio As New CValue
Public gc_Efficiency As New CValue
Public gc_TireDia As New CValue
Public gc_TireWidth As New CValue

'Polar Moments of Inertia
Public gc_EnginePMI As New CValue
Public gc_TransPMI As New CValue
Public gc_TiresPMI As New CValue

'Reference Area worksheet
Public gc_MaxWidth As New CValue
Public gc_MaxHeight As New CValue
Public gc_ShapeFactor As New CValue

'Motorcycle Gear Ratio worksheet
Public gc_Primary As New CValue
Public gc_Countershaft As New CValue
Public gc_RearWheel As New CValue

'Tire Width worksheet
Public gc_TreadWidth As New CValue
Public gc_Grooves As New CValue
Public gc_GrooveWidth As New CValue

'Engine PMI worksheet
Public gc_CrankWt As New CValue
Public gc_CrankStroke As New CValue
Public gc_FlywheelWt As New CValue
Public gc_FlywheelDia As New CValue

'Transmission PMI worksheet
Public gc_WSTransType As New CValue
Public gc_TransWt As New CValue
Public gc_CaseDia As New CValue

'Final Drive PMI worksheet
Public gc_TireWt As New CValue
Public gc_WSTireDia As New CValue
Public gc_WheelWt As New CValue
Public gc_WheelDia As New CValue

'specific QUARTER jr variables
Public gc_Displacement As New CValue
Public gc_PeakHP As New CValue
Public gc_Nitrous As New CValue
Public gc_RPMPeakHP As New CValue
Public gc_ShiftRPM As New CValue
Public gc_ConvDia As New CValue

'common QUARTER Pro/jr variable (to determine if motorcycle)
Public gc_BodyStyle As New CValue

'these were used for Buell Motorcycle CG input
Public gc_StaticFWt As New CValue
Public gc_XCG As New CValue
Public gc_YCG As New CValue

'error message constants
Public Const ERR_TYP_INPUT = vbInformation
Public Const ERR_ANSWER = True
Public Const ERR_CAP_RANGE = "Input Data Outside Min/Max Limits!"

Declare Function OpenFile Lib "kernel32" (ByVal lpFileName As String, lpReOpenBuff As typOFSTRUCT, ByVal wStyle As Long) As Long
Declare Function SendMessage Lib "user32" Alias "SendMessageA" (ByVal hwnd As Long, ByVal wMsg As Long, ByVal wParam As Long, lParam As Long) As Long
Declare Function SetWindowPos Lib "user32" (ByVal hwnd As Long, ByVal hWndInsertAfter As Long, ByVal X As Long, ByVal Y As Long, ByVal cx As Long, ByVal cy As Long, ByVal wFlags As Long) As Long

Public Const OFS_MAXPATHNAME = 128

Type typOFSTRUCT
    cBytes As Byte
    fFixedDisk As Byte
    nErrCode As Integer
    Reserved1 As Integer
    Reserved2 As Integer
    szPathName(OFS_MAXPATHNAME) As Byte
End Type

Public g_ofstruct As typOFSTRUCT
Public Const OF_EXIST = &H4000
Public Const HWND_BOTTOM = 1
Public Const HWND_DESKTOP = 0
Public Const HWND_NOTOPMOST = -2
Public Const HWND_TOP = 0
Public Const SWP_HIDEWINDOW = &H80
Public Const SWP_NOACTIVATE = &H10
Public Const SWP_NOCOPYBITS = &H100
Public Const SWP_NOMOVE = &H2
Public Const SWP_NOOWNERZORDER = &H200
Public Const SWP_NOREDRAW = &H8
Public Const SWP_NOREPOSITION = SWP_NOOWNERZORDER
Public Const SWP_NOSIZE = &H1
Public Const SWP_NOZORDER = &H4
Public Const SWP_SHOWWINDOW = &H40
Public Const HWND_TOPMOST = -1
