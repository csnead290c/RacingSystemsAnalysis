import { useState, useMemo } from 'react';
import Page from '../shared/components/Page';
import {
  calculateWeather,
  defaultWeatherInput,
  FUEL_SYSTEMS,
  type WeatherInput,
} from '../domain/physics/models/weather';
import {
  calculateConverterSlip,
  defaultConverterSlipInput,
  type ConverterSlipInput,
} from '../domain/physics/models/converterSlip';
import {
  calculateDragDyno,
  defaultDragDynoInput,
  type DragDynoInput,
  type RaceStyle,
  type TransmissionType,
} from '../domain/physics/models/dragDyno';

type CalculatorTab = 'weather' | 'converter' | 'dragdyno';

function Calculators() {
  const [activeTab, setActiveTab] = useState<CalculatorTab>('weather');
  
  // Weather calculator state
  const [weatherInput, setWeatherInput] = useState<WeatherInput>(defaultWeatherInput);
  const weatherResult = useMemo(() => calculateWeather(weatherInput), [weatherInput]);
  
  // Converter slip calculator state
  const [convInput, setConvInput] = useState<ConverterSlipInput>(defaultConverterSlipInput);
  const convResult = useMemo(() => calculateConverterSlip(convInput), [convInput]);
  
  // Drag dyno calculator state
  const [dynoInput, setDynoInput] = useState<DragDynoInput>(defaultDragDynoInput);
  const dynoResult = useMemo(() => calculateDragDyno(dynoInput), [dynoInput]);

  const cardStyle: React.CSSProperties = {
    padding: 'var(--space-4)',
    maxWidth: '100%',
    width: '100%',
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-3)',
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--color-muted)',
    fontWeight: 500,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '1rem',
    textAlign: 'right',
    borderRadius: 'var(--radius-sm)',
  };

  const resultStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.9rem',
  };

  const bigResultStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    textAlign: 'center',
    padding: 'var(--space-3)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    fontWeight: '600',
    marginBottom: 'var(--space-2)',
    paddingBottom: 'var(--space-1)',
    borderBottom: '1px solid var(--color-border)',
  };

  return (
    <Page title="Calculators">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ margin: '0 0 var(--space-2)', fontSize: '1.5rem' }}>RSA Calculators</h1>
        
        {/* Tab buttons - responsive */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-2)', 
          flexWrap: 'wrap',
          backgroundColor: 'var(--color-bg-secondary)',
          padding: 'var(--space-2)',
          borderRadius: 'var(--radius-md)',
        }}>
          <button
            className={`btn ${activeTab === 'weather' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('weather')}
            style={{ flex: '1 1 auto', minWidth: '100px' }}
          >
            🌤️ Weather
          </button>
          <button
            className={`btn ${activeTab === 'converter' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('converter')}
            style={{ flex: '1 1 auto', minWidth: '100px' }}
          >
            ⚙️ Converter Slip
          </button>
          <button
            className={`btn ${activeTab === 'dragdyno' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('dragdyno')}
            style={{ flex: '1 1 auto', minWidth: '100px' }}
          >
            🏁 Drag Dyno
          </button>
        </div>
      </div>

      {/* WEATHER CALCULATOR */}
      {activeTab === 'weather' && (
        <div className="card" style={cardStyle}>
          <h2 style={{ margin: '0 0 var(--space-3)', fontSize: '1.2rem' }}>Weather Calculator</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
            Calculate density altitude and HP correction factor from atmospheric conditions.
          </p>

          {/* Pressure Input */}
          <div style={sectionTitleStyle}>Pressure</div>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                <input
                  type="radio"
                  checked={!weatherInput.useAltimeter}
                  onChange={() => setWeatherInput(prev => ({ ...prev, useAltimeter: false }))}
                  style={{ marginRight: '6px' }}
                />
                Barometer (inHg)
              </label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={weatherInput.barometer}
                onChange={(e) => setWeatherInput(prev => ({ ...prev, barometer: parseFloat(e.target.value) || 0 }))}
                step="0.01"
                disabled={weatherInput.useAltimeter}
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                <input
                  type="radio"
                  checked={weatherInput.useAltimeter}
                  onChange={() => setWeatherInput(prev => ({ ...prev, useAltimeter: true }))}
                  style={{ marginRight: '6px' }}
                />
                Altimeter (feet)
              </label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={weatherInput.altimeter}
                onChange={(e) => setWeatherInput(prev => ({ ...prev, altimeter: parseFloat(e.target.value) || 0 }))}
                disabled={!weatherInput.useAltimeter}
              />
            </div>
          </div>

          {/* Temperature & Humidity */}
          <div style={sectionTitleStyle}>Conditions</div>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Temperature (°F)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={weatherInput.temperature}
                onChange={(e) => setWeatherInput(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Humidity (%)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={weatherInput.humidity}
                onChange={(e) => setWeatherInput(prev => ({ ...prev, humidity: parseFloat(e.target.value) || 0 }))}
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Fuel System */}
          <div style={sectionTitleStyle}>Fuel System</div>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Type</label>
              <select
                className="input"
                style={{ ...inputStyle, textAlign: 'left' }}
                value={weatherInput.fuelSystem}
                onChange={(e) => setWeatherInput(prev => ({ ...prev, fuelSystem: parseInt(e.target.value) }))}
              >
                {FUEL_SYSTEMS.map(fs => (
                  <option key={fs.value} value={fs.value}>{fs.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results */}
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <div style={sectionTitleStyle}>Results</div>
            <div style={bigResultStyle}>
              {weatherResult.densityAltitude.toLocaleString()} ft
              <div style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--color-muted)' }}>Density Altitude</div>
            </div>
            <div style={resultStyle}>
              <span>HP Correction Factor</span>
              <span style={{ fontWeight: '600' }}>{weatherResult.hpCorrectionFactor.toFixed(3)}</span>
            </div>
            <div style={resultStyle}>
              <span>Density Index (ADI)</span>
              <span style={{ fontWeight: '600' }}>{weatherResult.densityIndex.toFixed(1)}%</span>
            </div>
            <div style={resultStyle}>
              <span>Ambient Pressure</span>
              <span>{weatherResult.ambientPressure.toFixed(3)} psi</span>
            </div>
            <div style={resultStyle}>
              <span>Vapor Pressure</span>
              <span>{weatherResult.vaporPressure.toFixed(4)} psi</span>
            </div>
          </div>
        </div>
      )}

      {/* CONVERTER SLIP CALCULATOR */}
      {activeTab === 'converter' && (
        <div className="card" style={cardStyle}>
          <h2 style={{ margin: '0 0 var(--space-3)', fontSize: '1.2rem' }}>Converter Slip Calculator</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
            Calculate torque converter slip percentage from trap speed data.
          </p>

          <div style={sectionTitleStyle}>Vehicle Data</div>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Tire Diameter (in)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={convInput.tireDiameter}
                onChange={(e) => setConvInput(prev => ({ ...prev, tireDiameter: parseFloat(e.target.value) || 0 }))}
                step="0.5"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Gear Ratio</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={convInput.gearRatio}
                onChange={(e) => setConvInput(prev => ({ ...prev, gearRatio: parseFloat(e.target.value) || 0 }))}
                step="0.01"
              />
            </div>
          </div>

          <div style={sectionTitleStyle}>Trap Data</div>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Engine RPM</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={convInput.rpm}
                onChange={(e) => setConvInput(prev => ({ ...prev, rpm: parseInt(e.target.value) || 0 }))}
                step="100"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Trap Speed (MPH)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={convInput.mph}
                onChange={(e) => setConvInput(prev => ({ ...prev, mph: parseFloat(e.target.value) || 0 }))}
                step="0.1"
              />
            </div>
          </div>

          {/* Results */}
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <div style={sectionTitleStyle}>Results</div>
            <div style={bigResultStyle}>
              {convResult.converterSlip > 0 ? '+' : ''}{convResult.converterSlip.toFixed(1)}%
              <div style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--color-muted)' }}>
                Converter Slip {convResult.converterSlip > 0 ? '(slipping)' : '(locked)'}
              </div>
            </div>
            <div style={resultStyle}>
              <span>Ideal MPH (no slip)</span>
              <span style={{ fontWeight: '600' }}>{convResult.idealMph.toFixed(1)} MPH</span>
            </div>
            <div style={resultStyle}>
              <span>Tire Circumference</span>
              <span>{convResult.tireCircumference.toFixed(2)} ft</span>
            </div>
            <div style={resultStyle}>
              <span>Tire Growth Factor</span>
              <span>{convResult.tireGrowth.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}

      {/* DRAG DYNO CALCULATOR */}
      {activeTab === 'dragdyno' && (
        <div className="card" style={cardStyle}>
          <h2 style={{ margin: '0 0 var(--space-3)', fontSize: '1.2rem' }}>Drag Dyno Calculator</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
            Quick ET and MPH estimator from HP and weight. Uses RSA empirical equations (1978-2000).
          </p>

          <div style={sectionTitleStyle}>Vehicle</div>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Weight (lbs)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={dynoInput.weight}
                onChange={(e) => setDynoInput(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                step="50"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Horsepower</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={dynoInput.horsepower}
                onChange={(e) => setDynoInput(prev => ({ ...prev, horsepower: parseInt(e.target.value) || 0 }))}
                step="10"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>HP Correction</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={dynoInput.hpCorrectionFactor}
                onChange={(e) => setDynoInput(prev => ({ ...prev, hpCorrectionFactor: parseFloat(e.target.value) || 1 }))}
                step="0.001"
              />
            </div>
          </div>

          <div style={sectionTitleStyle}>Configuration</div>
          <div style={inputRowStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Race Style</label>
              <select
                className="input"
                style={{ ...inputStyle, textAlign: 'left' }}
                value={dynoInput.raceStyle}
                onChange={(e) => setDynoInput(prev => ({ ...prev, raceStyle: e.target.value as RaceStyle }))}
              >
                <option value="full_race">Full Race</option>
                <option value="pro_street">Pro Street</option>
                <option value="street">Street</option>
              </select>
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Transmission</label>
              <select
                className="input"
                style={{ ...inputStyle, textAlign: 'left' }}
                value={dynoInput.transmissionType}
                onChange={(e) => setDynoInput(prev => ({ ...prev, transmissionType: e.target.value as TransmissionType }))}
              >
                <option value="manual">Manual/Clutch</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
          </div>

          {/* Results */}
          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <div style={sectionTitleStyle}>Estimated Performance</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div style={{ textAlign: 'center', padding: 'var(--space-2)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                  {dynoResult.et660}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>1/8 Mile ET</div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--space-2)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                  {dynoResult.mph660}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>1/8 Mile MPH</div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--space-2)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                  {dynoResult.et1320}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>1/4 Mile ET</div>
              </div>
              <div style={{ textAlign: 'center', padding: 'var(--space-2)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                  {dynoResult.mph1320}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>1/4 Mile MPH</div>
              </div>
            </div>

            <div style={resultStyle}>
              <span>Effective HP/Weight</span>
              <span>{dynoResult.hpPerWeight.toFixed(4)}</span>
            </div>
            <div style={resultStyle}>
              <span>Trans Efficiency</span>
              <span>{(dynoResult.transmissionEfficiency * 100).toFixed(0)}%</span>
            </div>
            <div style={resultStyle}>
              <span>Race Efficiency</span>
              <span>{(dynoResult.raceEfficiency * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

    </Page>
  );
}

export default Calculators;
