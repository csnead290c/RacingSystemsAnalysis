import { useState } from 'react';
import type { Env } from '../../domain/schemas/env.schema';

/**
 * Calculate Density Altitude from environmental conditions
 * Formula: DA = PA + (120 * (OAT - ISA_temp))
 * where PA = Pressure Altitude, OAT = Outside Air Temp, ISA_temp = standard temp at altitude
 */
function calculateDensityAltitude(env: Env): number {
  // Pressure altitude: altitude where standard pressure equals actual pressure
  // Standard pressure at sea level = 29.92 inHg
  // Pressure drops ~1 inHg per 1000ft
  const pressureAltitude = env.elevation + (29.92 - env.barometerInHg) * 1000;
  
  // ISA standard temperature at altitude (59°F at sea level, drops 3.5°F per 1000ft)
  const isaTemp = 59 - (pressureAltitude / 1000) * 3.5;
  
  // Density altitude correction for temperature deviation
  const tempDeviation = env.temperatureF - isaTemp;
  const densityAltitude = pressureAltitude + (120 * tempDeviation);
  
  // Humidity correction (approximate - humidity reduces air density)
  // Each 10% humidity adds ~100ft to DA at typical conditions
  const humidityCorrection = (env.humidityPct / 10) * 100;
  
  return Math.round(densityAltitude + humidityCorrection);
}

// HP correction calculation available if needed in future
// function calculateHPCorrection(env: Env): number {
//   const da = calculateDensityAltitude(env);
//   const correction = 1 - (da / 1000) * 0.03;
//   return Math.max(0.5, Math.min(1.5, correction));
// }

/** Weather presets for common racing conditions */
const WEATHER_PRESETS: { name: string; env: Partial<Env> }[] = [
  { name: 'Standard', env: { elevation: 0, temperatureF: 59, barometerInHg: 29.92, humidityPct: 0 } },
  { name: 'Hot Summer', env: { elevation: 0, temperatureF: 95, barometerInHg: 29.80, humidityPct: 65 } },
  { name: 'Cool Evening', env: { elevation: 0, temperatureF: 65, barometerInHg: 30.10, humidityPct: 40 } },
  { name: 'High Altitude', env: { elevation: 5000, temperatureF: 75, barometerInHg: 24.90, humidityPct: 20 } },
  { name: 'Humid Gulf', env: { elevation: 50, temperatureF: 88, barometerInHg: 29.95, humidityPct: 85 } },
  { name: 'Desert Dry', env: { elevation: 2500, temperatureF: 100, barometerInHg: 27.50, humidityPct: 10 } },
];

interface EnvironmentFormProps {
  value: Env;
  onChange: (next: Env) => void;
  compact?: boolean;
  disabled?: boolean;
}

function EnvironmentForm({ value, onChange, compact = false, disabled = false }: EnvironmentFormProps) {
  const [showOptional, setShowOptional] = useState(true); // Show track conditions by default

  const handleChange = (field: keyof Env, inputValue: string) => {
    const numValue = parseFloat(inputValue) || 0;
    
    // Validate humidity range
    if (field === 'humidityPct') {
      if (numValue < 0 || numValue > 100) {
        return; // Don't update if out of range
      }
    }
    
    onChange({
      ...value,
      [field]: numValue,
    });
  };

  const handleOptionalChange = (field: keyof Env, inputValue: string) => {
    const numValue = inputValue.trim() === '' ? undefined : parseFloat(inputValue);
    
    onChange({
      ...value,
      [field]: numValue,
    });
  };

  // Apply a weather preset
  const applyPreset = (presetName: string) => {
    const preset = WEATHER_PRESETS.find(p => p.name === presetName);
    if (preset) {
      onChange({ ...value, ...preset.env });
    }
  };

  // Compact mode: inline layout without spinners, includes all fields
  if (compact) {
    const inputStyle: React.CSSProperties = {
      width: '55px',
      padding: '6px 6px',
      fontSize: '0.85rem',
      textAlign: 'center' as const,
    };
    const optInputStyle: React.CSSProperties = {
      ...inputStyle,
      width: '50px',
    };
    const labelStyle: React.CSSProperties = { fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '4px', whiteSpace: 'nowrap' };
    const groupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center' };
    
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <style>{`
          .env-compact input::-webkit-outer-spin-button,
          .env-compact input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .env-compact input[type=number] {
            -moz-appearance: textfield;
          }
        `}</style>
        <div className="env-compact" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {/* Preset selector */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {WEATHER_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.name)}
                disabled={disabled}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.65rem',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-muted)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseOver={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
          {/* Row 1: Required fields */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Elev (ft)</label>
              <input type="number" style={inputStyle} className="input" value={value.elevation} onChange={(e) => handleChange('elevation', e.target.value)} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Temp (°F)</label>
              <input type="number" style={inputStyle} className="input" value={value.temperatureF} onChange={(e) => handleChange('temperatureF', e.target.value)} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Baro</label>
              <input type="number" style={inputStyle} className="input" value={value.barometerInHg} onChange={(e) => handleChange('barometerInHg', e.target.value)} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Humid %</label>
              <input type="number" style={inputStyle} className="input" value={value.humidityPct} onChange={(e) => handleChange('humidityPct', e.target.value)} />
            </div>
          </div>
          {/* Row 2: Optional fields */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Track °F</label>
              <input type="number" style={optInputStyle} className="input" value={value.trackTempF ?? ''} onChange={(e) => handleOptionalChange('trackTempF', e.target.value)} placeholder="—" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Grip</label>
              <input type="number" style={optInputStyle} className="input" value={value.tractionIndex ?? ''} onChange={(e) => handleOptionalChange('tractionIndex', e.target.value)} placeholder="—" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Wind</label>
              <input type="number" style={optInputStyle} className="input" value={value.windMph ?? ''} onChange={(e) => handleOptionalChange('windMph', e.target.value)} placeholder="—" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Angle</label>
              <input type="number" style={optInputStyle} className="input" value={value.windAngleDeg ?? ''} onChange={(e) => handleOptionalChange('windAngleDeg', e.target.value)} placeholder="—" />
            </div>
            {/* DA Display */}
            <div style={{ 
              ...groupStyle, 
              borderLeft: '1px solid var(--color-border)', 
              paddingLeft: '12px',
              minWidth: '70px',
            }}>
              <label style={labelStyle}>Density Alt</label>
              <div style={{ 
                fontSize: '0.9rem', 
                fontWeight: 600, 
                color: calculateDensityAltitude(value) > 3000 ? '#f59e0b' : 'var(--color-text)',
                padding: '6px 0',
              }}>
                {calculateDensityAltitude(value).toLocaleString()} ft
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Required fields */}
      <div className="grid grid-2 gap-4">
        <div>
          <label className="label" htmlFor="elevation">
            Elevation (ft)
          </label>
          <input
            id="elevation"
            type="number"
            step="1"
            className="input"
            value={value.elevation}
            onChange={(e) => handleChange('elevation', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="label" htmlFor="temperatureF">
            Temperature (°F)
          </label>
          <input
            id="temperatureF"
            type="number"
            step="1"
            className="input"
            value={value.temperatureF}
            onChange={(e) => handleChange('temperatureF', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="label" htmlFor="barometerInHg">
            Barometer (inHg)
          </label>
          <input
            id="barometerInHg"
            type="number"
            step="0.01"
            className="input"
            value={value.barometerInHg}
            onChange={(e) => handleChange('barometerInHg', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="label" htmlFor="humidityPct">
            Humidity (%)
          </label>
          <input
            id="humidityPct"
            type="number"
            step="1"
            min="0"
            max="100"
            className="input"
            value={value.humidityPct}
            onChange={(e) => handleChange('humidityPct', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Optional fields toggle */}
      {!disabled && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="btn btn-secondary"
            style={{ fontSize: '0.875rem', padding: 'var(--space-2) var(--space-3)' }}
          >
            {showOptional ? '− Hide' : '+ Show'} Optional Fields
          </button>
        </div>
      )}

      {/* Optional fields */}
      {showOptional && !disabled && (
        <div className="grid grid-2 gap-4 mt-4">
          <div>
            <label className="label" htmlFor="trackTempF">
              Track Temp (°F)
            </label>
            <input
              id="trackTempF"
              type="number"
              step="1"
              className="input"
              value={value.trackTempF ?? ''}
              onChange={(e) => handleOptionalChange('trackTempF', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="label" htmlFor="tractionIndex">
              Traction Index
            </label>
            <input
              id="tractionIndex"
              type="number"
              step="0.1"
              className="input"
              value={value.tractionIndex ?? ''}
              onChange={(e) => handleOptionalChange('tractionIndex', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="label" htmlFor="windMph">
              Wind Speed (mph)
            </label>
            <input
              id="windMph"
              type="number"
              step="1"
              className="input"
              value={value.windMph ?? ''}
              onChange={(e) => handleOptionalChange('windMph', e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="label" htmlFor="windAngleDeg">
              Wind Angle (deg)
            </label>
            <input
              id="windAngleDeg"
              type="number"
              step="1"
              className="input"
              value={value.windAngleDeg ?? ''}
              onChange={(e) => handleOptionalChange('windAngleDeg', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EnvironmentForm;
