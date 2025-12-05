import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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

type CalculatorTab = 'weather' | 'converter' | 'dragdyno' | 'worksheets';

// Worksheet calculator interfaces
interface GearRatioInput {
  primaryDrive: number;
  countershaftTeeth: number;
  rearWheelTeeth: number;
}

interface FrontalAreaInput {
  maxWidth: number;      // inches
  maxHeight: number;     // inches
  shapeFactor: number;   // percentage (0-100)
}

interface TireWidthInput {
  treadWidth: number;    // inches
  numGrooves: number;
  grooveWidth: number;   // inches
}

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

  // Worksheet calculators state
  const [gearInput, setGearInput] = useState<GearRatioInput>({
    primaryDrive: 1.0,
    countershaftTeeth: 15,
    rearWheelTeeth: 42,
  });
  
  const [areaInput, setAreaInput] = useState<FrontalAreaInput>({
    maxWidth: 72,
    maxHeight: 48,
    shapeFactor: 85,
  });
  
  const [tireInput, setTireInput] = useState<TireWidthInput>({
    treadWidth: 12,
    numGrooves: 0,
    grooveWidth: 0.25,
  });

  // Worksheet calculations
  const gearRatio = useMemo(() => {
    if (gearInput.countershaftTeeth === 0) return 0;
    return Math.round((gearInput.rearWheelTeeth * gearInput.primaryDrive / gearInput.countershaftTeeth) * 100) / 100;
  }, [gearInput]);

  const frontalArea = useMemo(() => {
    // Area = (shapeFactor/100) * width * height / 144 (convert sq in to sq ft)
    return Math.round((areaInput.shapeFactor / 100) * areaInput.maxWidth * areaInput.maxHeight / 144 * 10) / 10;
  }, [areaInput]);

  const effectiveTireWidth = useMemo(() => {
    const width = tireInput.treadWidth - tireInput.numGrooves * tireInput.grooveWidth;
    return Math.max(0, Math.round(width * 100) / 100);
  }, [tireInput]);

  const cardStyle: React.CSSProperties = {
    padding: 'var(--space-4)',
    maxWidth: '600px',
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-3)',
    flexWrap: 'wrap',
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100px',
    padding: '6px 8px',
    fontSize: '0.9rem',
    textAlign: 'right',
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
    <Page>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>RSA Calculators</h1>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            Quick calculation utilities ported from original VB6 RSA tools
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className={`btn ${activeTab === 'weather' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('weather')}
          >
            Weather
          </button>
          <button
            className={`btn ${activeTab === 'converter' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('converter')}
          >
            Conv Slip
          </button>
          <button
            className={`btn ${activeTab === 'dragdyno' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('dragdyno')}
          >
            Drag Dyno
          </button>
          <button
            className={`btn ${activeTab === 'worksheets' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('worksheets')}
          >
            Worksheets
          </button>
          <Link to="/" className="btn">← Home</Link>
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
            <select
              className="input"
              style={{ width: '220px', padding: '6px 8px' }}
              value={weatherInput.fuelSystem}
              onChange={(e) => setWeatherInput(prev => ({ ...prev, fuelSystem: parseInt(e.target.value) }))}
            >
              {FUEL_SYSTEMS.map(fs => (
                <option key={fs.value} value={fs.value}>{fs.label}</option>
              ))}
            </select>
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
                style={{ width: '140px', padding: '6px 8px' }}
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
                style={{ width: '140px', padding: '6px 8px' }}
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

      {/* WORKSHEETS */}
      {activeTab === 'worksheets' && (
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {/* Gear Ratio Calculator */}
          <div className="card" style={{ padding: 'var(--space-4)', width: '280px' }}>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '1rem' }}>Gear Ratio</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
              Motorcycle final drive ratio
            </p>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Primary Drive Reduction</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={gearInput.primaryDrive}
                onChange={(e) => setGearInput(prev => ({ ...prev, primaryDrive: parseFloat(e.target.value) || 0 }))}
                step="0.01"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Countershaft Sprocket Teeth</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={gearInput.countershaftTeeth}
                onChange={(e) => setGearInput(prev => ({ ...prev, countershaftTeeth: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Rear Wheel Sprocket Teeth</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={gearInput.rearWheelTeeth}
                onChange={(e) => setGearInput(prev => ({ ...prev, rearWheelTeeth: parseInt(e.target.value) || 0 }))}
              />
            </div>
            
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Final Drive Ratio</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                {gearRatio.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Frontal Area Calculator */}
          <div className="card" style={{ padding: 'var(--space-4)', width: '280px' }}>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '1rem' }}>Frontal Area</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
              Aerodynamic reference area
            </p>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Maximum Width (inches)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={areaInput.maxWidth}
                onChange={(e) => setAreaInput(prev => ({ ...prev, maxWidth: parseFloat(e.target.value) || 0 }))}
                step="0.5"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Maximum Height (inches)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={areaInput.maxHeight}
                onChange={(e) => setAreaInput(prev => ({ ...prev, maxHeight: parseFloat(e.target.value) || 0 }))}
                step="0.5"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Shape Factor (%)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={areaInput.shapeFactor}
                onChange={(e) => setAreaInput(prev => ({ ...prev, shapeFactor: parseFloat(e.target.value) || 0 }))}
                min="0"
                max="100"
              />
            </div>
            
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Frontal Area</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                {frontalArea.toFixed(1)} sq ft
              </div>
            </div>
          </div>

          {/* Tire Width Calculator */}
          <div className="card" style={{ padding: 'var(--space-4)', width: '280px' }}>
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '1rem' }}>Tire Width</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
              Effective tire contact width
            </p>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Tread Width (inches)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={tireInput.treadWidth}
                onChange={(e) => setTireInput(prev => ({ ...prev, treadWidth: parseFloat(e.target.value) || 0 }))}
                step="0.25"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Number of Grooves</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={tireInput.numGrooves}
                onChange={(e) => setTireInput(prev => ({ ...prev, numGrooves: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Each Groove Width (inches)</label>
              <input
                type="number"
                className="input"
                style={inputStyle}
                value={tireInput.grooveWidth}
                onChange={(e) => setTireInput(prev => ({ ...prev, grooveWidth: parseFloat(e.target.value) || 0 }))}
                step="0.0625"
              />
            </div>
            
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Effective Tire Width</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                {effectiveTireWidth.toFixed(2)} in
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export default Calculators;
