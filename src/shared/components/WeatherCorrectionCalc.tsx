/**
 * Weather Correction Calculator
 * 
 * Calculates the expected ET change when weather conditions change.
 * Uses industry-standard correction factors similar to what racers
 * use to adjust their dial-ins throughout the day.
 * 
 * Based on the formula:
 * - Temperature: ~0.01s per 10°F change (hotter = slower)
 * - Barometer: ~0.03s per 0.10 inHg change (lower = slower)
 * - Humidity: ~0.005s per 10% change (higher = slower)
 * - Density Altitude: ~0.01s per 500ft change
 */

import { useState, useMemo } from 'react';

/**
 * Calculate density altitude from weather conditions
 */
function calculateDensityAltitude(tempF: number, baroInHg: number, humidityPct: number): number {
  // Pressure altitude from barometer
  const pressureAltitude = (29.92 - baroInHg) * 1000;
  
  // Standard temperature at this pressure altitude (ISA)
  const isaTemp = 59 - (pressureAltitude / 1000) * 3.5;
  
  // Density altitude correction for temperature
  const tempCorrection = (tempF - isaTemp) * 120;
  
  // Humidity correction (approximate - humidity reduces air density)
  const humidityCorrection = humidityPct * 0.5;
  
  return pressureAltitude + tempCorrection + humidityCorrection;
}

/**
 * Calculate HP correction factor (how much HP is affected by conditions)
 * Returns a multiplier where 1.0 = standard conditions
 */
function calculateHPCorrectionFactor(tempF: number, baroInHg: number, humidityPct: number): number {
  // Standard conditions: 60°F, 29.92 inHg, 0% humidity
  const stdTemp = 60;
  const stdBaro = 29.92;
  
  // Temperature effect: ~3% per 10°F
  const tempFactor = 1 - (tempF - stdTemp) * 0.003;
  
  // Barometer effect: ~3% per 1 inHg
  const baroFactor = baroInHg / stdBaro;
  
  // Humidity effect: ~1% per 10% humidity
  const humidityFactor = 1 - humidityPct * 0.001;
  
  return tempFactor * baroFactor * humidityFactor;
}

interface WeatherCorrectionCalcProps {
  baseET?: number;
  compact?: boolean;
}

interface WeatherConditions {
  tempF: number;
  baroInHg: number;
  humidityPct: number;
}

export default function WeatherCorrectionCalc({ baseET = 10.0, compact = false }: WeatherCorrectionCalcProps) {
  const [baseline, setBaseline] = useState<WeatherConditions>({
    tempF: 70,
    baroInHg: 29.92,
    humidityPct: 50,
  });
  
  const [current, setCurrent] = useState<WeatherConditions>({
    tempF: 80,
    baroInHg: 29.80,
    humidityPct: 60,
  });
  
  const [userBaseET, setUserBaseET] = useState(baseET);

  // Calculate density altitudes
  const baselineDA = useMemo(() => 
    calculateDensityAltitude(baseline.tempF, baseline.baroInHg, baseline.humidityPct),
    [baseline]
  );
  
  const currentDA = useMemo(() => 
    calculateDensityAltitude(current.tempF, current.baroInHg, current.humidityPct),
    [current]
  );

  // Calculate HP correction factors
  const baselineHPC = useMemo(() => 
    calculateHPCorrectionFactor(baseline.tempF, baseline.baroInHg, baseline.humidityPct),
    [baseline]
  );
  
  const currentHPC = useMemo(() => 
    calculateHPCorrectionFactor(current.tempF, current.baroInHg, current.humidityPct),
    [current]
  );

  // Calculate ET correction
  // Rule of thumb: 1% HP change ≈ 0.5% ET change for a typical car
  // ET correction = baseET * (1 - (baselineHPC / currentHPC)) * 0.5
  const hpcRatio = baselineHPC / currentHPC;
  const etCorrectionPct = (1 - hpcRatio) * 0.5;
  const etCorrection = userBaseET * etCorrectionPct;
  const correctedET = userBaseET + etCorrection;

  // Individual factor contributions (approximate)
  const tempEffect = (current.tempF - baseline.tempF) * 0.001 * userBaseET;
  const baroEffect = (baseline.baroInHg - current.baroInHg) * 0.3 * userBaseET / 29.92;
  const humidityEffect = (current.humidityPct - baseline.humidityPct) * 0.0005 * userBaseET;

  if (compact) {
    return (
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.85rem' }}>
          Weather Correction
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
          <div>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>Baseline DA</div>
            <div style={{ fontWeight: 600 }}>{baselineDA.toFixed(0)} ft</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>Current DA</div>
            <div style={{ fontWeight: 600 }}>{currentDA.toFixed(0)} ft</div>
          </div>
        </div>
        <div style={{ 
          marginTop: '12px', 
          padding: '8px', 
          backgroundColor: etCorrection > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ET Adjustment</div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700,
            color: etCorrection > 0 ? '#ef4444' : '#22c55e',
          }}>
            {etCorrection >= 0 ? '+' : ''}{etCorrection.toFixed(3)}s
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
        Weather Correction Calculator
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Baseline Conditions */}
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            Baseline Conditions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="label">Temperature (°F)</label>
              <input
                type="number"
                className="input"
                value={baseline.tempF}
                onChange={(e) => setBaseline(prev => ({ ...prev, tempF: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="label">Barometer (inHg)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={baseline.baroInHg}
                onChange={(e) => setBaseline(prev => ({ ...prev, baroInHg: parseFloat(e.target.value) || 29.92 }))}
              />
            </div>
            <div>
              <label className="label">Humidity (%)</label>
              <input
                type="number"
                className="input"
                value={baseline.humidityPct}
                onChange={(e) => setBaseline(prev => ({ ...prev, humidityPct: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div style={{ 
              padding: '8px', 
              backgroundColor: 'var(--color-bg)', 
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Density Altitude</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{baselineDA.toFixed(0)} ft</div>
            </div>
          </div>
        </div>

        {/* Current Conditions */}
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            Current Conditions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="label">Temperature (°F)</label>
              <input
                type="number"
                className="input"
                value={current.tempF}
                onChange={(e) => setCurrent(prev => ({ ...prev, tempF: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="label">Barometer (inHg)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={current.baroInHg}
                onChange={(e) => setCurrent(prev => ({ ...prev, baroInHg: parseFloat(e.target.value) || 29.92 }))}
              />
            </div>
            <div>
              <label className="label">Humidity (%)</label>
              <input
                type="number"
                className="input"
                value={current.humidityPct}
                onChange={(e) => setCurrent(prev => ({ ...prev, humidityPct: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div style={{ 
              padding: '8px', 
              backgroundColor: 'var(--color-bg)', 
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Density Altitude</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{currentDA.toFixed(0)} ft</div>
            </div>
          </div>
        </div>
      </div>

      {/* Base ET Input */}
      <div style={{ marginTop: '20px' }}>
        <label className="label">Your Base ET (seconds)</label>
        <input
          type="number"
          step="0.001"
          className="input"
          style={{ maxWidth: '150px' }}
          value={userBaseET}
          onChange={(e) => setUserBaseET(parseFloat(e.target.value) || 10)}
        />
      </div>

      {/* Results */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        backgroundColor: 'var(--color-bg)',
        borderRadius: '8px',
      }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Correction Breakdown</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Temperature</div>
            <div style={{ 
              fontWeight: 600,
              color: tempEffect > 0 ? '#ef4444' : tempEffect < 0 ? '#22c55e' : 'var(--color-text)',
            }}>
              {tempEffect >= 0 ? '+' : ''}{tempEffect.toFixed(3)}s
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Barometer</div>
            <div style={{ 
              fontWeight: 600,
              color: baroEffect > 0 ? '#ef4444' : baroEffect < 0 ? '#22c55e' : 'var(--color-text)',
            }}>
              {baroEffect >= 0 ? '+' : ''}{baroEffect.toFixed(3)}s
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Humidity</div>
            <div style={{ 
              fontWeight: 600,
              color: humidityEffect > 0 ? '#ef4444' : humidityEffect < 0 ? '#22c55e' : 'var(--color-text)',
            }}>
              {humidityEffect >= 0 ? '+' : ''}{humidityEffect.toFixed(3)}s
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px',
          backgroundColor: etCorrection > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          borderRadius: '8px',
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Total Correction</div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700,
              color: etCorrection > 0 ? '#ef4444' : '#22c55e',
            }}>
              {etCorrection >= 0 ? '+' : ''}{etCorrection.toFixed(3)}s
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Corrected ET</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {correctedET.toFixed(3)}s
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '16px', 
        fontSize: '0.75rem', 
        color: 'var(--color-text-muted)',
        padding: '8px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '6px',
      }}>
        💡 <strong>Tip:</strong> These are approximate corrections. Actual results vary by vehicle. 
        Track your runs to develop your own correction factors.
      </div>
    </div>
  );
}
