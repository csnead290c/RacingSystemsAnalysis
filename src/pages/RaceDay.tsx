import { useState, useEffect, useCallback, useMemo } from 'react';
import Page from '../shared/components/Page';
import { fetchCurrentLocationWeather, weatherToEnv } from '../services/weather';
import { getAllTracks, type Track } from '../domain/config/tracks';
import { DEFAULT_ENV, type Env } from '../domain/schemas/env.schema';
import { simulate } from '../workerBridge';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import type { Vehicle } from '../domain/schemas/vehicle.schema';
import { fromVehicleToVB6Fixture } from '../dev/vb6/fromVehicle';
import { useSubscription } from '../domain/config/useSubscription';
import { fixtureToSimInputs } from '../domain/physics/vb6/fixtures';
import { storage, getAverage60ft } from '../state/storage';
import type { RaceLength } from '../domain/config/raceLengths';
import type { RunRecordV1 } from '../domain/schemas/run.schema';
import { calculateWeatherImpact, type WeatherConditions } from '../domain/physics/calculations/weatherImpact';
import type { SimResult } from '../domain/physics';
import { useSharedEnv } from '../shared/state/useSharedEnv';

// Standard baseline conditions for weather impact comparison
const BASELINE_WEATHER: WeatherConditions = {
  temperatureF: 70,
  humidityPct: 50,
  barometerInHg: 29.92,
  elevation: 0,
  windMph: 0,
  windAngleDeg: 0,
};

const RACE_DAY_STORAGE_KEY = 'rsa_race_day_session';

interface RaceDayState {
  currentRound: number;
  currentLane: 'left' | 'right' | null;
  dialIn: number;
  predictedET: number;
  lastRT: number | null;
  lastET: number | null;
  roundHistory: RoundResult[];
}

// Round type options
const ROUND_TYPES = [
  { value: 'Test', label: 'Test' },
  { value: 'TT', label: 'Time Trial' },
  { value: 'Q1', label: 'Q1' },
  { value: 'Q2', label: 'Q2' },
  { value: 'Q3', label: 'Q3' },
  { value: 'E1', label: 'E1' },
  { value: 'E2', label: 'E2' },
  { value: 'E3', label: 'E3' },
  { value: 'E4', label: 'E4' },
  { value: 'E5', label: 'E5' },
  { value: 'E6', label: 'E6' },
  { value: 'Final', label: 'Final' },
] as const;

interface RoundResult {
  id: string;
  roundType: string;
  roundNumber: number;
  lane: 'left' | 'right';
  dialIn: number;
  rt: number;
  sixtyFt?: number;
  threeThirtyFt?: number;
  sixSixtyFt?: number;
  thousandFt?: number;
  et: number;
  mph: number;
  result: 'win' | 'loss' | 'bye';
  opponentName?: string;
  timestamp: number;
  savedToHistory?: boolean;
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
  const { features } = useSubscription();
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  // Use shared environment state (persists between ET Sim and Race Day)
  const { env: sharedEnv, setEnv: setSharedEnv } = useSharedEnv();
  const [env, setEnvLocal] = useState<Env>({ ...DEFAULT_ENV, ...sharedEnv });
  
  // Sync local env changes to shared storage
  const setEnv = useCallback((updater: Env | ((prev: Env) => Env)) => {
    setEnvLocal(prev => {
      const newEnv = typeof updater === 'function' ? updater(prev) : updater;
      setSharedEnv(newEnv as any);
      return newEnv;
    });
  }, [setSharedEnv]);
  
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<Date | null>(null);
  const [autoRefreshWeather, setAutoRefreshWeather] = useState(false);
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  
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
  const [manualWeather, setManualWeather] = useState(false);
  const [lastSimResult, setLastSimResult] = useState<SimResult | null>(null);
  
  // Average 60ft from database
  const [avg60ftStats, setAvg60ftStats] = useState<{
    average: number | null;
    count: number;
    best: number | null;
    worst: number | null;
  } | null>(null);
  
  // Quick entry for last run - full incrementals
  const [quickRoundType, setQuickRoundType] = useState('Test');
  const [quickLane, setQuickLane] = useState<'left' | 'right'>('left');
  const [quickDialIn, setQuickDialIn] = useState('');
  const [quickRT, setQuickRT] = useState('');
  const [quick60, setQuick60] = useState('');
  const [quick330, setQuick330] = useState('');
  const [quick660, setQuick660] = useState('');
  const [quick1000, setQuick1000] = useState('');
  const [quickET, setQuickET] = useState('');
  const [quickMPH, setQuickMPH] = useState('');
  const [quickResult, setQuickResult] = useState<'win' | 'loss' | 'bye'>('win');
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  
  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RACE_DAY_STORAGE_KEY);
      if (saved) {
        const session = JSON.parse(saved);
        // Only restore if from today
        const today = new Date().toDateString();
        if (session.date === today) {
          setRaceState(prev => ({
            ...prev,
            currentRound: session.currentRound || 1,
            roundHistory: session.roundHistory || [],
          }));
          if (session.vehicleId) {
            // Will be set after vehicles load
            sessionStorage.setItem('raceday_vehicle_id', session.vehicleId);
          }
          if (session.trackId) {
            sessionStorage.setItem('raceday_track_id', session.trackId);
          }
          if (session.raceLength) {
            setRaceLength(session.raceLength);
          }
        }
      }
    } catch { /* ignore */ }
  }, []);
  
  // Save session to localStorage when state changes
  useEffect(() => {
    if (raceState.roundHistory.length > 0 || selectedVehicle) {
      const session = {
        date: new Date().toDateString(),
        currentRound: raceState.currentRound,
        roundHistory: raceState.roundHistory,
        vehicleId: selectedVehicle?.id,
        trackId: selectedTrack?.id,
        raceLength,
      };
      localStorage.setItem(RACE_DAY_STORAGE_KEY, JSON.stringify(session));
    }
  }, [raceState.currentRound, raceState.roundHistory, selectedVehicle, selectedTrack, raceLength]);
  
  // Load vehicles and tracks
  useEffect(() => {
    loadVehicles().then(setVehicles);
    setTracks(getAllTracks());
  }, []);
  
  // Load average 60ft stats when vehicle changes
  useEffect(() => {
    if (selectedVehicle?.id) {
      getAverage60ft(selectedVehicle.id).then(setAvg60ftStats).catch(console.error);
    } else {
      setAvg60ftStats(null);
    }
  }, [selectedVehicle?.id]);
  
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
        const vb6Fixture = fromVehicleToVB6Fixture(selectedVehicle as any, { 
          forceQuarterJr: !features.quarterProFields 
        });
        const simInputs = fixtureToSimInputs(vb6Fixture, raceLength);
        // VB6 Quarter Jr default: trackTemp = temperature + 30 when not specified
        const tempF = env.temperatureF ?? 75;
        simInputs.env = {
          elevation: env.elevation ?? 0,
          barometerInHg: env.barometerInHg ?? 29.92,
          temperatureF: tempF,
          humidityPct: env.humidityPct ?? 50,
          windMph: env.windMph ?? 0,
          windAngleDeg: env.windAngleDeg ?? 0,
          trackTempF: env.trackTempF ?? (tempF + 30),
          tractionIndex: env.tractionIndex ?? 5,
        };
        
        const result = await simulate('VB6Exact', simInputs);
        const predictedET = result.et_s;
        
        // Store the simulation result for run completion
        setLastSimResult(result);
        
        setRaceState(prev => ({
          ...prev,
          predictedET,
          dialIn: Math.round(predictedET * 1000) / 1000,
        }));
      } catch (err) {
        console.error('Simulation failed:', err);
      }
      setSimulating(false);
    };
    
    runSim();
  }, [selectedVehicle, env, raceLength, features.quarterProFields]);
  
  // Log a round result
  const logRound = async () => {
    if (!quickET) return;
    
    const roundResult: RoundResult = {
      id: crypto.randomUUID(),
      roundType: quickRoundType,
      roundNumber: editingRoundId ? raceState.roundHistory.find(r => r.id === editingRoundId)?.roundNumber || raceState.currentRound : raceState.currentRound,
      lane: quickLane,
      dialIn: parseFloat(quickDialIn) || raceState.dialIn,
      rt: parseFloat(quickRT) || 0,
      sixtyFt: parseFloat(quick60) || undefined,
      threeThirtyFt: parseFloat(quick330) || undefined,
      sixSixtyFt: parseFloat(quick660) || undefined,
      thousandFt: parseFloat(quick1000) || undefined,
      et: parseFloat(quickET),
      mph: parseFloat(quickMPH) || 0,
      result: quickResult,
      timestamp: Date.now(),
    };
    
    if (editingRoundId) {
      // Update existing round
      setRaceState(prev => ({
        ...prev,
        roundHistory: prev.roundHistory.map(r => r.id === editingRoundId ? roundResult : r),
      }));
      setEditingRoundId(null);
    } else {
      // Add new round
      setRaceState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        lastRT: roundResult.rt,
        lastET: roundResult.et,
        roundHistory: [...prev.roundHistory, roundResult],
      }));
      
      // Save to run history if vehicle selected
      if (selectedVehicle) {
        try {
          const run: RunRecordV1 = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            vehicleId: selectedVehicle.id,
            raceLength,
            env,
            runDate: new Date().toISOString().split('T')[0],
            runTime: new Date().toTimeString().slice(0, 5),
            round: roundResult.roundType,
            lane: roundResult.lane,
            reactionTime: roundResult.rt,
            dialIn: roundResult.dialIn,
            sixtyFt: roundResult.sixtyFt,
            threeThirtyFt: roundResult.threeThirtyFt,
            quarterMileET: raceLength === 'QUARTER' ? roundResult.et : undefined,
            quarterMileMPH: raceLength === 'QUARTER' ? roundResult.mph : undefined,
            eighthMileET: raceLength === 'EIGHTH' ? roundResult.et : roundResult.sixSixtyFt,
            eighthMileMPH: raceLength === 'EIGHTH' ? roundResult.mph : undefined,
            thousandFt: roundResult.thousandFt,
            prediction: { et_s: raceState.predictedET, mph: lastSimResult?.mph ?? 0 },
            outcome: { slipET_s: roundResult.et, slipMPH: roundResult.mph },
            // Include predicted timeslip for run completion matching
            increments: lastSimResult?.timeslip?.map(t => ({
              d_ft: t.d_ft,
              t_s: t.t_s,
              v_mph: t.v_mph,
            })),
          };
          await storage.saveRun(run);
        } catch (err) {
          console.error('Failed to save run to history:', err);
        }
      }
    }
    
    // Clear quick entry
    setQuickDialIn('');
    setQuickRT('');
    setQuick60('');
    setQuick330('');
    setQuick660('');
    setQuick1000('');
    setQuickET('');
    setQuickMPH('');
  };
  
  // Delete a round
  const deleteRound = (id: string) => {
    setRaceState(prev => ({
      ...prev,
      roundHistory: prev.roundHistory.filter(r => r.id !== id),
    }));
  };
  
  // Edit a round (populate form with round data)
  const editRound = (round: RoundResult) => {
    setEditingRoundId(round.id);
    setQuickRoundType(round.roundType);
    setQuickLane(round.lane);
    setQuickDialIn(round.dialIn.toString());
    setQuickRT(round.rt.toString());
    setQuick60(round.sixtyFt?.toString() || '');
    setQuick330(round.threeThirtyFt?.toString() || '');
    setQuick660(round.sixSixtyFt?.toString() || '');
    setQuick1000(round.thousandFt?.toString() || '');
    setQuickET(round.et.toString());
    setQuickMPH(round.mph.toString());
    setQuickResult(round.result);
  };
  
  // Clear current session
  const clearSession = () => {
    if (confirm('Clear all rounds from today\'s session?')) {
      setRaceState({
        currentRound: 1,
        currentLane: null,
        dialIn: raceState.dialIn,
        predictedET: raceState.predictedET,
        lastRT: null,
        lastET: null,
        roundHistory: [],
      });
      localStorage.removeItem(RACE_DAY_STORAGE_KEY);
    }
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
  
  // Calculate weather impact breakdown (how each factor affects ET)
  const weatherImpact = useMemo(() => {
    if (!raceState.predictedET || raceState.predictedET <= 0) return null;
    
    const currentWeather: WeatherConditions = {
      temperatureF: env.temperatureF ?? 70,
      humidityPct: env.humidityPct ?? 50,
      barometerInHg: env.barometerInHg ?? 29.92,
      elevation: env.elevation ?? 0,
      windMph: env.windMph ?? 0,
      windAngleDeg: env.windAngleDeg ?? 0,
    };
    
    // Calculate what ET would be at baseline conditions
    // Use current ET as reference, work backwards
    return calculateWeatherImpact(BASELINE_WEATHER, currentWeather, raceState.predictedET);
  }, [env, raceState.predictedET]);
  
  const [showWeatherBreakdown, setShowWeatherBreakdown] = useState(false);
  
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
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
          
          {/* Race Length */}
          <div className="card" style={{ padding: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Distance</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setRaceLength('EIGHTH')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${raceLength === 'EIGHTH' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: raceLength === 'EIGHTH' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontWeight: raceLength === 'EIGHTH' ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                1/8
              </button>
              <button
                onClick={() => setRaceLength('QUARTER')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${raceLength === 'QUARTER' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: raceLength === 'QUARTER' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontWeight: raceLength === 'QUARTER' ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                1/4
              </button>
            </div>
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
                    checked={manualWeather}
                    onChange={(e) => {
                      setManualWeather(e.target.checked);
                      if (!e.target.checked) setAutoRefreshWeather(false);
                    }}
                  />
                  Manual
                </label>
                {!manualWeather && (
                  <>
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
                  </>
                )}
              </div>
            </div>
            {manualWeather ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', fontSize: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Temp °F</label>
                  <input
                    type="number"
                    value={env.temperatureF ?? ''}
                    onChange={(e) => setEnv(prev => ({ ...prev, temperatureF: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Baro inHg</label>
                  <input
                    type="number"
                    step="0.01"
                    value={env.barometerInHg ?? ''}
                    onChange={(e) => setEnv(prev => ({ ...prev, barometerInHg: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Humidity %</label>
                  <input
                    type="number"
                    value={env.humidityPct ?? ''}
                    onChange={(e) => setEnv(prev => ({ ...prev, humidityPct: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Elev ft</label>
                  <input
                    type="number"
                    value={env.elevation ?? ''}
                    onChange={(e) => setEnv(prev => ({ ...prev, elevation: parseFloat(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Track °F {!features.quarterProFields && '🔒'}</label>
                  <input
                    type="number"
                    value={env.trackTempF ?? ''}
                    onChange={(e) => setEnv(prev => ({ ...prev, trackTempF: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="—"
                    disabled={!features.quarterProFields}
                    title={!features.quarterProFields ? 'Pro feature' : undefined}
                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', opacity: features.quarterProFields ? 1 : 0.5 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Grip</label>
                  <input
                    type="number"
                    value={env.tractionIndex ?? ''}
                    onChange={(e) => setEnv(prev => ({ ...prev, tractionIndex: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="—"
                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Wind mph {!features.quarterProFields && '🔒'}</label>
                  <input
                    type="number"
                    value={env.windMph ?? ''}
                    onChange={(e) => setEnv(prev => ({ ...prev, windMph: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="—"
                    disabled={!features.quarterProFields}
                    title={!features.quarterProFields ? 'Pro feature' : undefined}
                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', opacity: features.quarterProFields ? 1 : 0.5 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Wind Angle {!features.quarterProFields && '🔒'}</label>
                  <input
                    type="number"
                    value={env.windAngleDeg ?? ''}
                    onChange={(e) => setEnv(prev => ({ ...prev, windAngleDeg: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="—"
                    disabled={!features.quarterProFields}
                    title={!features.quarterProFields ? 'Pro feature' : undefined}
                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'monospace', opacity: features.quarterProFields ? 1 : 0.5 }}
                  />
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
        
        {/* Main Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-4)' }}>
          {/* Left Column - Big Numbers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Predicted ET Display */}
            <div className="card" style={{ 
              padding: 'var(--space-4)', 
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
            }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                PREDICTED ET
              </div>
              <div style={{ 
                fontSize: '4rem', 
                fontWeight: 700, 
                fontFamily: 'monospace',
                color: 'var(--color-accent)',
                letterSpacing: '2px',
              }}>
                {raceState.predictedET > 0 ? raceState.predictedET.toFixed(3) : '—.———'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                {selectedVehicle ? selectedVehicle.name : 'Select a vehicle to see prediction'}
              </div>
              
              {/* Full Timeslip Prediction */}
              {lastSimResult?.timeslip && lastSimResult.timeslip.length > 0 && (
                <div style={{ 
                  marginTop: 'var(--space-3)', 
                  paddingTop: 'var(--space-3)',
                  borderTop: '1px solid var(--color-border)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  textAlign: 'center',
                }}>
                  {/* 60ft */}
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>60'</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                      {lastSimResult.timeslip.find(t => t.d_ft === 60)?.t_s.toFixed(3) || '—'}
                    </div>
                  </div>
                  {/* 330ft */}
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>330'</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                      {lastSimResult.timeslip.find(t => t.d_ft === 330)?.t_s.toFixed(3) || '—'}
                    </div>
                  </div>
                  {/* 1/8 */}
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>1/8</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                      {lastSimResult.timeslip.find(t => t.d_ft === 660)?.t_s.toFixed(3) || '—'}
                    </div>
                  </div>
                  {raceLength === 'QUARTER' && (
                    <>
                      {/* 1000ft */}
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>1000'</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem' }}>
                          {lastSimResult.timeslip.find(t => t.d_ft === 1000)?.t_s.toFixed(3) || '—'}
                        </div>
                      </div>
                    </>
                  )}
                  {/* MPH */}
                  <div style={{ gridColumn: raceLength === 'QUARTER' ? 'span 4' : 'span 1' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>MPH</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem', color: '#22c55e' }}>
                      {lastSimResult.mph?.toFixed(2) || '—'}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Average 60ft from Database */}
              {avg60ftStats && avg60ftStats.average && (
                <div style={{ 
                  marginTop: 'var(--space-3)', 
                  padding: '8px 12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--color-accent)' }}>
                    Your Avg 60' from {avg60ftStats.count} Runs
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                    <span>Avg: <strong style={{ fontFamily: 'monospace' }}>{avg60ftStats.average.toFixed(3)}s</strong></span>
                    <span>Best: <strong style={{ fontFamily: 'monospace', color: '#22c55e' }}>{avg60ftStats.best?.toFixed(3)}s</strong></span>
                    <span>Worst: <strong style={{ fontFamily: 'monospace', color: '#ef4444' }}>{avg60ftStats.worst?.toFixed(3)}s</strong></span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Air Quality */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Air Conditions</span>
                {weatherImpact && (
                  <button
                    onClick={() => setShowWeatherBreakdown(!showWeatherBreakdown)}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: showWeatherBreakdown ? 'var(--color-primary)' : 'transparent',
                      color: showWeatherBreakdown ? 'white' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showWeatherBreakdown ? 'Hide' : 'Show'} ET Impact
                  </button>
                )}
              </div>
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
              
              {/* Weather Impact Breakdown */}
              {showWeatherBreakdown && weatherImpact && (
                <div style={{ 
                  marginTop: 'var(--space-3)', 
                  paddingTop: 'var(--space-3)', 
                  borderTop: '1px solid var(--color-border)',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                    ET Change Breakdown (vs 70°F, 29.92", 50% humidity)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {weatherImpact.impacts.map((impact, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '4px 8px',
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 500 }}>{impact.factor}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                            {impact.baselineValue.toFixed(impact.factor === 'Barometer' ? 2 : 0)} → {impact.currentValue.toFixed(impact.factor === 'Barometer' ? 2 : 0)}
                            {impact.factor === 'Temperature' && '°F'}
                            {impact.factor === 'Humidity' && '%'}
                            {impact.factor === 'Barometer' && '"'}
                            {impact.factor === 'Wind' && ' mph'}
                          </span>
                        </div>
                        <span style={{ 
                          fontWeight: 600, 
                          fontFamily: 'monospace',
                          color: impact.direction === 'faster' ? '#22c55e' : impact.direction === 'slower' ? '#ef4444' : 'inherit',
                        }}>
                          {impact.etChange > 0 ? '+' : ''}{impact.etChange.toFixed(3)}s
                        </span>
                      </div>
                    ))}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '6px 8px',
                      backgroundColor: weatherImpact.totalETChange > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginTop: '4px',
                    }}>
                      <span>Total Weather Effect</span>
                      <span style={{ 
                        fontFamily: 'monospace',
                        color: weatherImpact.totalETChange > 0 ? '#ef4444' : '#22c55e',
                      }}>
                        {weatherImpact.totalETChange > 0 ? '+' : ''}{weatherImpact.totalETChange.toFixed(3)}s
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Log */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {editingRoundId ? 'Edit Round' : 'Log Run'}
                </span>
                {editingRoundId && (
                  <button
                    onClick={() => {
                      setEditingRoundId(null);
                      setQuickDialIn('');
                      setQuickRT('');
                      setQuick60('');
                      setQuick330('');
                      setQuick660('');
                      setQuick1000('');
                      setQuickET('');
                      setQuickMPH('');
                    }}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {/* Row 1: Round Type, Lane, Dial-In, Result */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Round</label>
                  <select
                    value={quickRoundType}
                    onChange={(e) => setQuickRoundType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {ROUND_TYPES.map(rt => (
                      <option key={rt.value} value={rt.value}>{rt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Lane</label>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      onClick={() => setQuickLane('left')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                        border: `1px solid ${quickLane === 'left' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: quickLane === 'left' ? 'rgba(59, 130, 246, 0.2)' : 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontWeight: quickLane === 'left' ? 600 : 400,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      L
                    </button>
                    <button
                      onClick={() => setQuickLane('right')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                        border: `1px solid ${quickLane === 'right' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        backgroundColor: quickLane === 'right' ? 'rgba(59, 130, 246, 0.2)' : 'var(--color-surface)',
                        color: 'var(--color-text)',
                        fontWeight: quickLane === 'right' ? 600 : 400,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      R
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Dial-In</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quickDialIn}
                    onChange={(e) => setQuickDialIn(e.target.value)}
                    placeholder={raceState.predictedET > 0 ? raceState.predictedET.toFixed(3) : '0.000'}
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
              </div>
              
              {/* Row 2: Full incrementals */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr) auto', gap: 'var(--space-2)', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>RT</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quickRT}
                    onChange={(e) => setQuickRT(e.target.value)}
                    placeholder=".000"
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
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>60'</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quick60}
                    onChange={(e) => setQuick60(e.target.value)}
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
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>330'</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quick330}
                    onChange={(e) => setQuick330(e.target.value)}
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
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>660'</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quick660}
                    onChange={(e) => setQuick660(e.target.value)}
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
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>1000'</label>
                  <input
                    type="number"
                    step="0.001"
                    value={quick1000}
                    onChange={(e) => setQuick1000(e.target.value)}
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
                  <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>ET *</label>
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
                <div style={{ gridColumn: 'span 2' }}>
                  <button
                    onClick={logRound}
                    disabled={!quickET}
                    className="btn btn-primary"
                    style={{ padding: '8px 24px', width: '100%' }}
                  >
                    {editingRoundId ? 'Update' : 'Log Run'}
                  </button>
                </div>
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
              <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Today's Rounds ({raceState.roundHistory.length})</span>
                {raceState.roundHistory.length > 0 && (
                  <button
                    onClick={clearSession}
                    style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                )}
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
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Ln</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>RT</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>ET</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}></th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...raceState.roundHistory].reverse().map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '6px 8px' }}>{r.roundType}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '0.7rem' }}>{r.lane === 'left' ? 'L' : 'R'}</td>
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
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button
                                onClick={() => editRound(r)}
                                style={{ padding: '2px 4px', fontSize: '0.6rem', borderRadius: '2px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteRound(r.id)}
                                style={{ padding: '2px 4px', fontSize: '0.6rem', borderRadius: '2px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
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
