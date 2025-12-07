import { useState, useEffect, useCallback } from 'react';
import Page from '../shared/components/Page';
import { fetchCurrentLocationWeather, weatherToEnv } from '../services/weather';
import { getAllTracks, type Track } from '../domain/config/tracks';
import { DEFAULT_ENV, type Env } from '../domain/schemas/env.schema';
import { simulate } from '../workerBridge';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import type { Vehicle } from '../domain/schemas/vehicle.schema';
import { fromVehicleToVB6Fixture } from '../dev/vb6/fromVehicle';
import { fixtureToSimInputs } from '../domain/physics/vb6/fixtures';

interface RaceDayState {
  currentRound: number;
  currentLane: 'left' | 'right' | null;
  dialIn: number;
  predictedET: number;
  lastRT: number | null;
  lastET: number | null;
  roundHistory: RoundResult[];
}

interface RoundResult {
  round: number;
  lane: 'left' | 'right';
  dialIn: number;
  rt: number;
  et: number;
  mph: number;
  result: 'win' | 'loss' | 'bye';
  opponentName?: string;
}

// Calculate density altitude
function calcDensityAltitude(tempF: number, baroInHg: number, humidity: number, elevation: number): number {
  // Station pressure from barometer
  const stationPressure = baroInHg * 33.8639; // Convert to hPa
  
  // Vapor pressure
  const tempC = (tempF - 32) * 5/9;
  const satVaporPressure = 6.1078 * Math.pow(10, (7.5 * tempC) / (237.3 + tempC));
  const vaporPressure = (humidity / 100) * satVaporPressure;
  
  // Virtual temperature
  const virtualTempK = (tempC + 273.15) / (1 - 0.378 * vaporPressure / stationPressure);
  
  // Density altitude
  const densityAltitude = elevation + (145442.16 * (1 - Math.pow((stationPressure / 1013.25) * (288.15 / virtualTempK), 0.235)));
  
  return densityAltitude;
}

// Calculate air density correction factor
function calcAirDensityCorrection(tempF: number, baroInHg: number, humidity: number): number {
  // Standard conditions: 60°F, 29.92 inHg, 0% humidity
  const stdTemp = 60;
  const stdBaro = 29.92;
  
  // Temperature correction (colder = denser)
  const tempCorrection = (stdTemp + 460) / (tempF + 460);
  
  // Pressure correction (higher = denser)
  const baroCorrection = baroInHg / stdBaro;
  
  // Humidity correction (drier = denser, roughly)
  const humidityCorrection = 1 - (humidity * 0.0003);
  
  return tempCorrection * baroCorrection * humidityCorrection;
}

export default function RaceDay() {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [env, setEnv] = useState<Env>(DEFAULT_ENV);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<Date | null>(null);
  const [autoRefreshWeather, setAutoRefreshWeather] = useState(false);
  
  const [raceState, setRaceState] = useState<RaceDayState>({
    currentRound: 1,
    currentLane: null,
    dialIn: 0,
    predictedET: 0,
    lastRT: null,
    lastET: null,
    roundHistory: [],
  });
  
  const [simulating, setSimulating] = useState(false);
  const [safetyMargin, setSafetyMargin] = useState(0.02);
  const [manualAdjust, setManualAdjust] = useState(0);
  
  // Quick entry for last run
  const [quickRT, setQuickRT] = useState('');
  const [quickET, setQuickET] = useState('');
  const [quickMPH, setQuickMPH] = useState('');
  const [quickResult, setQuickResult] = useState<'win' | 'loss' | 'bye'>('win');
  
  // Load vehicles and tracks
  useEffect(() => {
    loadVehicles().then(setVehicles);
    setTracks(getAllTracks());
  }, []);
  
  // Fetch weather
  const fetchWeather = useCallback(async () => {
    if (!selectedTrack) return;
    
    setWeatherLoading(true);
    try {
      const weather = await fetchCurrentLocationWeather();
      const envUpdate = weatherToEnv(weather, selectedTrack.trackAngle);
      setEnv(prev => ({ ...prev, ...envUpdate }));
      setLastWeatherUpdate(new Date());
    } catch (err) {
      console.error('Weather fetch failed:', err);
    }
    setWeatherLoading(false);
  }, [selectedTrack]);
  
  // Auto-refresh weather every 5 minutes
  useEffect(() => {
    if (!autoRefreshWeather) return;
    
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshWeather, fetchWeather]);
  
  // Run simulation when vehicle or env changes
  useEffect(() => {
    if (!selectedVehicle) return;
    
    setSimulating(true);
    
    const runSim = async () => {
      try {
        const vb6Fixture = fromVehicleToVB6Fixture(selectedVehicle as any);
        const simInputs = fixtureToSimInputs(vb6Fixture, 'QUARTER');
        simInputs.env = {
          elevation: env.elevation ?? 0,
          barometerInHg: env.barometerInHg ?? 29.92,
          temperatureF: env.temperatureF ?? 75,
          humidityPct: env.humidityPct ?? 50,
          windMph: env.windMph ?? 0,
          windAngleDeg: env.windAngleDeg ?? 0,
          trackTempF: env.trackTempF ?? 100,
          tractionIndex: env.tractionIndex ?? 5,
        };
        
        const result = await simulate('VB6Exact', simInputs);
        const predictedET = result.et_s;
        const dialIn = predictedET + safetyMargin + manualAdjust;
        
        setRaceState(prev => ({
          ...prev,
          predictedET,
          dialIn: Math.round(dialIn * 1000) / 1000,
        }));
      } catch (err) {
        console.error('Simulation failed:', err);
      }
      setSimulating(false);
    };
    
    runSim();
  }, [selectedVehicle, env, safetyMargin, manualAdjust]);
  
  // Log a round result
  const logRound = () => {
    if (!quickET) return;
    
    const result: RoundResult = {
      round: raceState.currentRound,
      lane: raceState.currentLane || 'left',
      dialIn: raceState.dialIn,
      rt: parseFloat(quickRT) || 0,
      et: parseFloat(quickET),
      mph: parseFloat(quickMPH) || 0,
      result: quickResult,
    };
    
    setRaceState(prev => ({
      ...prev,
      currentRound: prev.currentRound + 1,
      lastRT: result.rt,
      lastET: result.et,
      roundHistory: [...prev.roundHistory, result],
    }));
    
    // Clear quick entry
    setQuickRT('');
    setQuickET('');
    setQuickMPH('');
  };
  
  // Calculated values
  const densityAltitude = calcDensityAltitude(
    env.temperatureF ?? 75,
    env.barometerInHg ?? 29.92,
    env.humidityPct ?? 50,
    env.elevation ?? 0
  );
  
  const airCorrection = calcAirDensityCorrection(
    env.temperatureF ?? 75,
    env.barometerInHg ?? 29.92,
    env.humidityPct ?? 50
  );
  
  // Calculate trend from history
  const etTrend = raceState.roundHistory.length >= 2
    ? raceState.roundHistory[raceState.roundHistory.length - 1].et - 
      raceState.roundHistory[raceState.roundHistory.length - 2].et
    : 0;
  
  return (
    <Page title="Race Day Dashboard">
      <div style={{ padding: 'var(--space-4)', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🏁 Race Day Dashboard</h1>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Round {raceState.currentRound}
            </span>
            {lastWeatherUpdate && (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                Weather: {lastWeatherUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        {/* Top Row - Setup */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {/* Vehicle Selection */}
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Vehicle</div>
            <select
              value={selectedVehicle?.id || ''}
              onChange={(e) => {
                const v = vehicles.find(v => v.id === e.target.value);
                setSelectedVehicle(v as Vehicle || null);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          
          {/* Track Selection */}
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Track</div>
            <select
              value={selectedTrack?.id || ''}
              onChange={(e) => {
                const t = tracks.find(t => t.id === e.target.value);
                setSelectedTrack(t || null);
                if (t) {
                  setEnv(prev => ({ ...prev, elevation: t.elevation_ft }));
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            >
              <option value="">Select track...</option>
              {tracks.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          {/* Weather */}
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Weather</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="checkbox"
                    checked={autoRefreshWeather}
                    onChange={(e) => setAutoRefreshWeather(e.target.checked)}
                  />
                  Auto
                </label>
                <button
                  onClick={fetchWeather}
                  disabled={weatherLoading}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    cursor: weatherLoading ? 'wait' : 'pointer',
                  }}
                >
                  {weatherLoading ? '...' : '🔄'}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Temp:</span>{' '}
                <span style={{ fontWeight: 600 }}>{env.temperatureF?.toFixed(0)}°F</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Baro:</span>{' '}
                <span style={{ fontWeight: 600 }}>{env.barometerInHg?.toFixed(2)}"</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Humidity:</span>{' '}
                <span style={{ fontWeight: 600 }}>{env.humidityPct?.toFixed(0)}%</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Wind:</span>{' '}
                <span style={{ fontWeight: 600 }}>{env.windMph?.toFixed(0)} mph</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
          {/* Left Column - Big Numbers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Dial-In Display */}
            <div className="card" style={{ 
              padding: 'var(--space-4)', 
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
            }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                DIAL-IN
              </div>
              <div style={{ 
                fontSize: '4rem', 
                fontWeight: 700, 
                fontFamily: 'monospace',
                color: 'var(--color-accent)',
                letterSpacing: '2px',
              }}>
                {raceState.dialIn > 0 ? raceState.dialIn.toFixed(3) : '—.———'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-3)', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Predicted:</span>{' '}
                  <span style={{ fontWeight: 600 }}>{raceState.predictedET > 0 ? raceState.predictedET.toFixed(3) : '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Safety:</span>{' '}
                  <span style={{ fontWeight: 600, color: '#22c55e' }}>+{(safetyMargin * 1000).toFixed(0)}ms</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Adjust:</span>{' '}
                  <span style={{ fontWeight: 600, color: manualAdjust !== 0 ? '#f59e0b' : 'inherit' }}>
                    {manualAdjust >= 0 ? '+' : ''}{(manualAdjust * 1000).toFixed(0)}ms
                  </span>
                </div>
              </div>
            </div>
            
            {/* Adjustments */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                    <span>Safety Margin</span>
                    <span style={{ fontWeight: 600, color: '#22c55e' }}>+{(safetyMargin * 1000).toFixed(0)}ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.005"
                    value={safetyMargin}
                    onChange={(e) => setSafetyMargin(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                    <span>Manual Adjust</span>
                    <span style={{ fontWeight: 600, color: manualAdjust !== 0 ? '#f59e0b' : 'inherit' }}>
                      {manualAdjust >= 0 ? '+' : ''}{(manualAdjust * 1000).toFixed(0)}ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-0.1"
                    max="0.1"
                    step="0.005"
                    value={manualAdjust}
                    onChange={(e) => setManualAdjust(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
            
            {/* Air Quality */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Air Conditions</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Density Altitude</div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 600,
                    color: densityAltitude > 3000 ? '#ef4444' : densityAltitude > 1500 ? '#f59e0b' : '#22c55e',
                  }}>
                    {densityAltitude.toFixed(0)} ft
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Air Correction</div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 600,
                    color: airCorrection > 1.02 ? '#22c55e' : airCorrection < 0.98 ? '#ef4444' : 'inherit',
                  }}>
                    {(airCorrection * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>ET Trend</div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 600,
                    color: etTrend < -0.01 ? '#22c55e' : etTrend > 0.01 ? '#ef4444' : 'inherit',
                  }}>
                    {etTrend !== 0 ? (etTrend > 0 ? '+' : '') + etTrend.toFixed(3) : '—'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Log */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Quick Log Round {raceState.currentRound}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 'var(--space-2)', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>RT</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quickRT}
                    onChange={(e) => setQuickRT(e.target.value)}
                    placeholder="0.000"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>ET</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quickET}
                    onChange={(e) => setQuickET(e.target.value)}
                    placeholder="0.000"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>MPH</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickMPH}
                    onChange={(e) => setQuickMPH(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Result</label>
                  <select
                    value={quickResult}
                    onChange={(e) => setQuickResult(e.target.value as 'win' | 'loss' | 'bye')}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="bye">Bye</option>
                  </select>
                </div>
                <button
                  onClick={logRound}
                  disabled={!quickET}
                  className="btn"
                  style={{ padding: '8px 16px' }}
                >
                  Log
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Column - History & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Last Run */}
            {raceState.lastET && (
              <div className="card" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Last Run</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  {raceState.lastET.toFixed(3)}
                </div>
                {raceState.lastRT && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    RT: {raceState.lastRT.toFixed(3)}
                  </div>
                )}
                {raceState.dialIn > 0 && raceState.lastET && (
                  <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    color: raceState.lastET < raceState.dialIn ? '#ef4444' : '#22c55e',
                    marginTop: '4px',
                  }}>
                    {raceState.lastET < raceState.dialIn 
                      ? `BREAKOUT by ${(raceState.dialIn - raceState.lastET).toFixed(3)}`
                      : `Under by ${(raceState.lastET - raceState.dialIn).toFixed(3)}`
                    }
                  </div>
                )}
              </div>
            )}
            
            {/* Round History */}
            <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: '0.85rem' }}>
                Today's Rounds ({raceState.roundHistory.length})
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {raceState.roundHistory.length === 0 ? (
                  <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    No rounds logged yet
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Rd</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Dial</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>RT</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>ET</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...raceState.roundHistory].reverse().map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '6px 8px' }}>R{r.round}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{r.dialIn.toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{r.rt.toFixed(3)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{r.et.toFixed(3)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              backgroundColor: r.result === 'win' ? 'rgba(34, 197, 94, 0.2)' :
                                               r.result === 'bye' ? 'rgba(59, 130, 246, 0.2)' :
                                               'rgba(239, 68, 68, 0.2)',
                              color: r.result === 'win' ? '#22c55e' :
                                     r.result === 'bye' ? '#3b82f6' : '#ef4444',
                            }}>
                              {r.result.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
            {/* Session Stats */}
            {raceState.roundHistory.length > 0 && (
              <div className="card" style={{ padding: 'var(--space-3)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Session Stats</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Wins:</span>{' '}
                    <span style={{ fontWeight: 600, color: '#22c55e' }}>
                      {raceState.roundHistory.filter(r => r.result === 'win').length}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Losses:</span>{' '}
                    <span style={{ fontWeight: 600, color: '#ef4444' }}>
                      {raceState.roundHistory.filter(r => r.result === 'loss').length}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Best ET:</span>{' '}
                    <span style={{ fontWeight: 600 }}>
                      {Math.min(...raceState.roundHistory.map(r => r.et)).toFixed(3)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)' }}>Avg RT:</span>{' '}
                    <span style={{ fontWeight: 600 }}>
                      {(raceState.roundHistory.reduce((sum, r) => sum + r.rt, 0) / raceState.roundHistory.length).toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {simulating && (
          <div style={{ 
            position: 'fixed', 
            bottom: 'var(--space-4)', 
            right: 'var(--space-4)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            fontSize: '0.8rem',
          }}>
            Calculating...
          </div>
        )}
      </div>
    </Page>
  );
}
