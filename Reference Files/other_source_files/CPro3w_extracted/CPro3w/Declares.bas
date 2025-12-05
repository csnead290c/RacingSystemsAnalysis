Attribute VB_Name = "modDeclares"
Option Explicit

Public Const UOM_NORMAL = True
Public Const UOM_ALTERNATE = False

Public Const TSTD = 519.67
Public Const PSTD = 14.696
Public Const BSTD = 29.92
Public Const WTAIR = 28.9669
Public Const WTH2O = 18.016
Public Const RSTD = 1545.32
Public Const PI = 3.141593
Public Const grav = 32.174
Public Const Z6 = (60 / (2 * PI)) * 550
Public Const ZPI = 12 * 60 / (2 * PI)
Public Const PI180 = PI / 180

Public Const DYNO_ROWS = 10

Public HPC As Single
Public NTQ As Integer
Public RPM(1 To 11) As Single   '11 is the size of the v2.0 data file
Public HP(1 To 11) As Single
Public TQ(1 To 11) As Single
Public PTQ As Single

Public FileName As String
Public isRSA As Boolean
Public isBike As Boolean
Public isGlide As Boolean
Public nMfg As Integer
Public MfgName(0 To 20) As String   '19 + custom
Public nArmMfg(0 To 20) As Integer
Public NARMD As Integer
Public AName(0 To 60) As String * 5
Public ADesc(0 To 60) As String * 52
Public AData(0 To 60, 1 To 12) As Single

'variables for multiple graph feature
Public CF1 As Single
Public CF2 As Single
Public CF1Save As Single
Public CF2Save As Single
Public StaticSave As Single
Public RetLbf1 As Single
Public RetLbf2 As Single
Public RetLbf1Save As Single
Public RetLbf2Save As Single
Public RPMLO As Single
Public RPMHI As Single
Public RPMLOSave As Single
Public RPMHISave As Single
Public LaunchRPMSave As Single

Public CTQLO(1 To DYNO_ROWS) As Single
Public CTQHI(1 To DYNO_ROWS) As Single
Public ZLO As Single
Public ZHI As Single
Public ETQLO(1 To DYNO_ROWS) As Single
Public ETQHI(1 To DYNO_ROWS) As Single

Public CTQLOSave(1 To DYNO_ROWS) As Single
Public CTQHISave(1 To DYNO_ROWS) As Single
Public ZLOSave As Single
Public ZHISave As Single
Public ETQLOSave(1 To DYNO_ROWS) As Single
Public ETQHISave(1 To DYNO_ROWS) As Single

'command buttons
Public gc_DynoDataBtn As New CButton
Public gc_RecalcBtn As New CButton

'help buttons
Public gc_TractionIndexBtn As New CButton
Public gc_MfgStyleBtn As New CButton
Public gc_FrictionBtn As New CButton

'worksheet buttons
Public gc_GearRatioBtn As New CButton
Public gc_EnginePMIBtn As New CButton
Public gc_TransPMIBtn As New CButton
Public gc_TiresPMIBtn As New CButton
Public gc_StaticBtn As New CButton
Public gc_ClAreaBtn As New CButton

'classes and grids
Public gc_ER As New CError
Public gc_grdDyno As New CGrid
Public gc_grdClutch As New CGrid

'General Data
Public gc_Barometer As New CValue
Public gc_Temperature As New CValue
Public gc_Humidity As New CValue
Public gc_LowGear As New CValue
Public gc_GearRatio As New CValue
Public gc_TireDia As New CValue

'Racetrack Data
Public gc_T60 As New CValue
Public gc_Amax As New CValue
Public gc_TractionIndex As New CValue

'Polar Moments of Inertia Data
Public gc_EnginePMI As New CValue
Public gc_TransPMI As New CValue
Public gc_TiresPMI As New CValue

'Engine Data
Public gc_FuelSystem As New CValue
Public gc_HPTQMult As New CValue

'Clutch Arm Data
Public gc_Mfg1 As New CValue
Public gc_NArm1 As New CValue
Public gc_TCWt1 As New CValue
Public gc_CWt1 As New CValue
Public gc_RingHt1 As New CValue
Public gc_ArmDepth1 As New CValue

Public gc_Mfg2 As New CValue
Public gc_NArm2 As New CValue
Public gc_TCWt2 As New CValue
Public gc_CWt2 As New CValue
Public gc_RingHt2 As New CValue
Public gc_ArmDepth2 As New CValue

'Clutch Spring and Disk Data
Public gc_Static As New CValue
Public gc_NDisk As New CValue
Public gc_DiskWt As New CValue
Public gc_DiskOD As New CValue
Public gc_DiskID As New CValue
Public gc_ClArea As New CValue
Public gc_CMU As New CValue

'Launch Conditions Data
Public gc_LaunchRPM As New CValue
Public gc_AirGap As New CValue

'Motorcycle Final Drive Ratio worksheet
Public gc_PDRatio As New CValue
Public gc_HighGear As New CValue
Public gc_Countershaft As New CValue
Public gc_RearWheel As New CValue

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

'Clutch Static Plate Force worksheet in CLUTCH Pro
'          and main screen variables in CLUTCHjr
Public gc_NSpring As New CValue
Public gc_SBasePr As New CValue
Public gc_BasePr As New CValue
Public gc_SSRate As New CValue
Public gc_SRate As New CValue
Public gc_Turns As New CValue
Public gc_ThrdpI As New CValue
Public gc_dRnHt As New CValue

'Effective Friction Area worksheet
Public gc_NSlot As New CValue
Public gc_SlotWD As New CValue
Public gc_NHole As New CValue
Public gc_HoleDia As New CValue

'Custom Clutch Arm worksheet
Public gc_ADATA1 As New CValue
Public gc_ADATA2 As New CValue
Public gc_ADATA6 As New CValue
Public gc_PVTDR As New CValue
Public gc_PVTDZ As New CValue
Public gc_CWTDR As New CValue
Public gc_CWTDZ As New CValue
Public gc_CGDR As New CValue
Public gc_CGDZ As New CValue

'Seek Tool values
Public gc_SeekLoRPM As New CValue
Public gc_SeekHiRPM As New CValue
    
'CLUTCHjr RPM values
Public gc_dRPM1 As New CValue
Public gc_dRPM2 As New CValue
Public gc_dRPM3 As New CValue

'constants
Public Const ERR_TYP_INPUT = vbInformation
Public Const ERR_ANSWER = True
Public Const ERR_CAP_RANGE = "Input Data Outside Min/Max Limits!"

Public Declare Function GetSysColor Lib "user32" (ByVal nIndex As Long) As Long
Public Declare Function OpenFile Lib "kernel32" (ByVal lpFileName As String, lpReOpenBuff As typOFSTRUCT, ByVal wStyle As Long) As Long
Public Declare Function SetWindowPos Lib "user32" (ByVal hwnd As Long, ByVal hWndInsertAfter As Long, ByVal X As Long, ByVal Y As Long, ByVal cx As Long, ByVal cy As Long, ByVal wFlags As Long) As Long

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
Public Const HWND_TOPMOST = -1
Public Const HWND_NOTOPMOST = -2
Public Const SWP_NOACTIVATE = &H10
Public Const SWP_NOMOVE = &H2
Public Const SWP_NOSIZE = &H1
