import math

def tire(gc_TireWidth, TireDia, Vel, Ags0):
  TGK = (gc_TireWidth ** 1.4 + TireDia - 16) / (0.171 * TireDia ** 1.7)
  TireGrowth = 1 + TGK * 0.0000135 * Vel ** 1.6
  TGLinear = 1 + TGK * 0.00035 * Vel
  if TGLinear < TireGrowth:
      TireGrowth = TGLinear
      
  TireSQ = TireGrowth - 0.035 * abs(Ags0)
  TireCirFt = TireSQ * TireDia * math.pi / 12

  return TireGrowth, TireCirFt



  

  # Bonneville Pro
  # TireGrowth = 1 + 0.00004 * Vel(L)
  # TireCirFt = TireGrowth * TireDia * math.pi / 12
