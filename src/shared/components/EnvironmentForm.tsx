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

  const gridClass = compact ? 'grid grid-4 gap-4' : 'grid grid-2 gap-4';

  return (
    <div>
      {/* Required fields */}
      <div className={gridClass}>
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
      {!disabled && !compact && (
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
