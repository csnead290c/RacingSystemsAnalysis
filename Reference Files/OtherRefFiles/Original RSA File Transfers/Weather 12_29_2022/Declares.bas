Attribute VB_Name = "Declares"
Option Explicit
Option Compare Text

'constants
Public Const ERR_TYP_INPUT = vbInformation
Public Const ERR_ANSWER = True
Public Const ERR_CAP_RANGE = "Input Data Outside Min/Max Limits!"

Public Const UOM_NORMAL = True
Public Const UOM_ALTERNATE = False

'class variables
Public gc_ER As New CError
Public gc_Pressure As New CValue
Public gc_Altimeter As New CValue
Public gc_Barometer As New CValue
Public gc_Temperature As New CValue
Public gc_Humidity As New CValue
'Public gc_FuelSystem As New CValue

