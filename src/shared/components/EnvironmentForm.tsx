import { useState } from 'react';
import type { Env } from '../../domain/schemas/env.schema';


interface EnvironmentFormProps {
  value: Env;
  onChange: (next: Env) => void;
  compact?: boolean;
  disabled?: boolean;
}

function EnvironmentForm({ value, onChange, compact = false, disabled = false }: EnvironmentFormProps) {
  const [showOptional, setShowOptional] = useState(true); // Show track conditions by default
  const [useElevation, setUseElevation] = useState(true); // Toggle between elevation and barometer input

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
          {/* Row 1: Required fields - Elevation OR Baro (toggle), Temp, Humidity */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'flex-end' }}>
            {/* Elevation/Baro toggle */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                <button
                  onClick={() => { setUseElevation(true); onChange({ ...value, barometerInHg: 29.92 }); }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.6rem',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: useElevation ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    color: useElevation ? 'white' : 'var(--color-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Elev
                </button>
                <button
                  onClick={() => { setUseElevation(false); onChange({ ...value, elevation: 0 }); }}
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.6rem',
                    borderRadius: '3px',
                    border: 'none',
                    backgroundColor: !useElevation ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    color: !useElevation ? 'white' : 'var(--color-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Baro
                </button>
              </div>
              {useElevation ? (
                <input type="number" style={inputStyle} className="input" value={value.elevation} onChange={(e) => handleChange('elevation', e.target.value)} placeholder="0" />
              ) : (
                <input type="number" step="0.01" style={inputStyle} className="input" value={value.barometerInHg} onChange={(e) => handleChange('barometerInHg', e.target.value)} placeholder="29.92" />
              )}
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Temp (°F)</label>
              <input type="number" style={inputStyle} className="input" value={value.temperatureF} onChange={(e) => handleChange('temperatureF', e.target.value)} />
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
