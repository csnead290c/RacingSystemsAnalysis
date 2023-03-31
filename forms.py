from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, RadioField, FloatField, SelectField, BooleanField, validators, PasswordField, TextAreaField
from wtforms.validators import DataRequired, Email


class NamerForm(FlaskForm):
  name = StringField("Name", validators=[DataRequired()])
  submit = SubmitField("Submit")


class ContactForm(FlaskForm):
  name = StringField(label='Name', validators=[DataRequired()])
  email = StringField(
    label='Email', validators=[DataRequired(),
                               Email(granular_message=True)])
  message = TextAreaField(label='Message')
  submit = SubmitField(label="Send")


class WeatherForm(FlaskForm):
  gc_PressType = SelectField("Pressure Type",
                             choices=[('1', 'Std Altimeter (ft)'),
                                      ('2', 'Abs Barometer (inHg)')],
                             default='2')
  gc_Altimeter = FloatField("Std Altimeter (ft)", default=0)
  gc_Pressure = FloatField("Pressure", default=29.92)
  gc_Barometer = FloatField("Abs Barometer (inHg)", default=29.92)
  gc_Temperature = FloatField("Temperature (F)", default=60)
  gc_Humidity = FloatField("Relative Humidity(%)", default=0)
  submit = SubmitField("Calculate")


class DynoForm(FlaskForm):
  gc_RaceStyle = SelectField(u'Race Style',
                             choices=[('100', 'Full Race'),
                                      ('93', 'Pro Street'), ('84', 'Street')])
  gc_TransType = SelectField("Trans Type",
                             choices=[('92', 'Torque Converter'),
                                      ('100', 'or Clutch Type')],
                             default='92')
  gc_Weight = FloatField("Vehicle Weight (lbs)", default=2500)
  gc_HP = FloatField("Engine HP", default=750)
  gc_HPC = FloatField("HP Correction Factor", default=1.050)
  submit = SubmitField("Calculate")


class ConverterSlipForm(FlaskForm):
  gc_TireDiameter = FloatField("Tire Diameter (in)", default=28.5)
  gc_GearRatio = FloatField("Rear Gear Ratio", default=4.56)
  gc_RPM = FloatField("Finish Line RPM", default=6800)
  gc_MPH = FloatField("Top Speed (MPH)", default=120)
  submit = SubmitField("Calculate")


class QuarterProForm(FlaskForm):
  gc_PressType = RadioField("Pressure Type",
                            choices=[('1', 'Std Altimeter (ft)'),
                                     ('2', 'Abs Barometer (inHg)')],
                            default='2')
  gc_Altimeter = FloatField("Elevation (ft)", default=32)
  gc_Pressure = FloatField("Pressure", default=29.92)
  gc_Barometer = FloatField("Barometer (inHg)", default=29.92)
  gc_Temperature = FloatField("Temperature (F)", default=75)
  gc_Humidity = FloatField("Relative Humidity (%)", default=55)
  gc_WindSpeed = FloatField("Wind Velocity (MPH)", default=5)
  gc_WindAngle = FloatField("Wind Angle (deg)", default=135)
  gc_TrackTemp = FloatField("Track Temp (F)", default=105)
  gc_TractionIndex = FloatField("Traction Index", default=3)
  gc_Weight = FloatField("Weight (lbs)", default=2355)
  gc_Wheelbase = FloatField("Wheelbase (in)", default=107)
  gc_Rollout = FloatField("Rollout (in)", default=9)
  gc_Overhang = FloatField("Overhang (in)", default=40)
  gc_GearRatio = FloatField("Gear Ratio", default=4.86)
  gc_Efficiency = FloatField("Efficiency", default=0.975)
  gc_TireDia = FloatField("Tire Diameter (in)", default=102.5)
  gc_TireWidth = FloatField("Tire Width (in)", default=17)
  gc_EngineRPM_1 = FloatField("RPM", default=1000)
  gc_EngineRPM_2 = FloatField("RPM")
  gc_EngineRPM_3 = FloatField("RPM")
  gc_EngineRPM_4 = FloatField("RPM")
  gc_EngineRPM_5 = FloatField("RPM")
  gc_EngineRPM_6 = FloatField("RPM")
  gc_EngineRPM_7 = FloatField("RPM")
  gc_EngineRPM_8 = FloatField("RPM")
  gc_EngineRPM_9 = FloatField("RPM")
  gc_EngineRPM_10 = FloatField("RPM")
  gc_EngineRPM_11 = FloatField("RPM")
  gc_EngineHP_1 = FloatField("HP", default=100)
  gc_EngineHP_2 = FloatField("HP")
  gc_EngineHP_3 = FloatField("HP")
  gc_EngineHP_4 = FloatField("HP")
  gc_EngineHP_5 = FloatField("HP")
  gc_EngineHP_6 = FloatField("HP")
  gc_EngineHP_7 = FloatField("HP")
  gc_EngineHP_8 = FloatField("HP")
  gc_EngineHP_9 = FloatField("HP")
  gc_EngineHP_10 = FloatField("HP")
  gc_EngineHP_11 = FloatField("HP")
  gc_EngineTQ_1 = FloatField("Torque", default=50)
  gc_EngineTQ_2 = FloatField("Torque")
  gc_EngineTQ_3 = FloatField("Torque")
  gc_EngineTQ_4 = FloatField("Torque")
  gc_EngineTQ_5 = FloatField("Torque")
  gc_EngineTQ_6 = FloatField("Torque")
  gc_EngineTQ_7 = FloatField("Torque")
  gc_EngineTQ_8 = FloatField("Torque")
  gc_EngineTQ_9 = FloatField("Torque")
  gc_EngineTQ_10 = FloatField("Torque")
  gc_EngineTQ_11 = FloatField("Torque")
  gc_FuelSystem = SelectField("Fuel System",
                              choices=[
                                ('1', 'Gasoline Carburetor'),
                                ('2', 'Gasoline Injector'),
                                ('3', 'Methanol Carburetor'),
                                ('4', 'Methanol Injector'),
                                ('5', 'Nitromethane Injector'),
                                ('6', 'Supercharged Gasoline'),
                                ('7', 'Supercharged Methanol'),
                                ('8', 'Supercharged Nitro'),
                              ],
                              default='1')
  gc_HPTQMult = FloatField("HP/Torque Multiplier", default=1)
  gc_RefArea = FloatField("Frontal Area (sqft)", default=24)
  gc_DragCoef = FloatField("Drag Coefficient", default=0.24)
  gc_LiftCoef = FloatField("Lift Coefficien", default=0.24)
  gc_TransType = SelectField("Trans Type",
                             choices=[('92', 'Torque Converter'),
                                      ('100', 'or Clutch Type')],
                             default='92')
  gc_LaunchRPM = FloatField("Launch RPM", default=3500)
  gc_SlipStallRPM = FloatField("Stall/Slip RPM", default=4500)
  gc_Slippage = FloatField("Slippage", default=4500)
  gc_LockUp = BooleanField("Lock-up option?")
  gc_TorqueMult = FloatField("Torque Multiplication", default=1.6)
  gc_TransGR_1 = FloatField("Ratio")
  gc_TransGR_2 = FloatField("Ratio")
  gc_TransGR_3 = FloatField("Ratio")
  gc_TransGR_4 = FloatField("Ratio")
  gc_TransGR_5 = FloatField("Ratio")
  gc_TransGR_6 = FloatField("Ratio")
  gc_TransEff_1 = FloatField("Efficiency")
  gc_TransEff_2 = FloatField("Efficiency")
  gc_TransEff_3 = FloatField("Efficiency")
  gc_TransEff_4 = FloatField("Efficiency")
  gc_TransEff_5 = FloatField("Efficiency")
  gc_TransEff_6 = FloatField("Efficiency")
  gc_ShiftRPM_1 = FloatField("Shift")
  gc_ShiftRPM_2 = FloatField("Shift")
  gc_ShiftRPM_3 = FloatField("Shift")
  gc_ShiftRPM_4 = FloatField("Shift")
  gc_ShiftRPM_5 = FloatField("Shift")
  gc_ShiftRPM_6 = FloatField("Shift")
  gc_EnginePMI = FloatField("Engine PMI", default=1)
  gc_TransPMI = FloatField("Transmission PMI", default=1)
  gc_TiresPMI = FloatField("Tires PMI", default=1)
  submit = SubmitField("Calculate")
