import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import EnvironmentForm from '../shared/components/EnvironmentForm';
import { simulate } from '../workerBridge';
import { DEFAULT_ENV } from '../domain/schemas/env.schema';
import type { Vehicle } from '../domain/schemas/vehicle.schema';
import { type RaceLength, RACE_LENGTH_INFO, DISTANCES } from '../domain/config/raceLengths';
import type { Env } from '../domain/schemas/env.schema';
import type { SimResult } from '../domain/physics';
import { useVb6Fixture } from '../shared/state/vb6FixtureStore';
import { assertComplete, fixtureToSimInputs } from '../domain/physics/vb6/fixtures';
import { useFlag, useFlagsStore } from '../domain/flags/store.tsx';
import VB6Inputs from './VB6Inputs';
import { fromVehicleToVB6Fixture } from '../dev/vb6/fromVehicle';
import { useRunHistory, type SavedRun } from '../shared/state/runHistoryStore';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { getAllTracks, type Track } from '../domain/config/tracks';
import { fetchTrackWeather, fetchCurrentLocationWeather, weatherToEnv } from '../services/weather';

// Lazy load charts
const DataLoggerChart = lazy(() => import('../shared/components/charts/DataLoggerChart'));
const RPMHistogram = lazy(() => import('../shared/components/charts/RPMHistogram'));

interface LocationState {
  vehicle: Vehicle;
  raceLength: RaceLength;
}

function Predict() {
  const location = useLocation();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [env, setEnv] = useState<Env | null>(null);
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  // Always use VB6Exact - works for both QuarterPro (full HP curve) and QuarterJr (peak HP/RPM)
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVb6Panel, setShowVb6Panel] = useState(false);
  const { fixture } = useVb6Fixture();
  
  // What-If adjustments
  const [hpAdjust, setHpAdjust] = useState(0); // HP delta (+/- from base)
  const [weightAdjust, setWeightAdjust] = useState(0); // Weight delta (+/- from base)
  const strictMode = useFlag('vb6StrictMode');
  
  // Run history
  const { saveRun, getRecentRuns } = useRunHistory();
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [comparisonRun, setComparisonRun] = useState<SavedRun | null>(null);
  
  // Check if fixture is complete for VB6 Strict Mode
  const isFixtureComplete = (() => {
    try {
      assertComplete(fixture);
      return true;
    } catch {
      return false;
    }
  })();
  const { setFlag } = useFlagsStore();
  
  // Vehicle selection state (when no vehicle passed via location state)
  const [availableVehicles, setAvailableVehicles] = useState<VehicleLite[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  
  // Track and weather state
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<Date | null>(null);

  // Initialize from location state or show vehicle selector
  useEffect(() => {
    const state = location.state as LocationState | null;

    // Always load available vehicles for the dropdown
    const loadAvailableVehiclesForDropdown = async () => {
      try {
        const vehicles = await loadVehicles();
        setAvailableVehicles(vehicles);
      } catch (error) {
        console.error('Failed to load vehicles for dropdown:', error);
      }
    };
    loadAvailableVehiclesForDropdown();

    // If we have state, use it
    if (state?.vehicle && state?.raceLength) {
      setVehicle(state.vehicle);
      setRaceLength(state.raceLength);
      setEnv(DEFAULT_ENV);
      setShowVehicleSelector(false);
      setLoading(false);
      return;
    }

    // Otherwise, load vehicles and show selector
    const loadAvailableVehicles = async () => {
      try {
        const vehicles = await loadVehicles();
        setAvailableVehicles(vehicles);
        if (vehicles.length > 0) {
          setSelectedVehicleId(vehicles[0].id);
        }
        setShowVehicleSelector(true);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load vehicles:', error);
        setLoading(false);
      }
    };
    loadAvailableVehicles();
  }, [location.state]);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track if we're waiting for debounce
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Run simulation when vehicle, env, or raceLength changes (debounced)
  // Always uses VB6Exact model
  useEffect(() => {
    if (!vehicle || !env) return;

    // Capture current values for the closure (env is guaranteed non-null here)
    const currentEnv = env;
    const currentVehicle = vehicle;

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Show debouncing indicator
    setIsDebouncing(true);
    
    // Debounce the simulation by 400ms
    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncing(false);
      runSimulation();
    }, 400);
    
    // Cleanup on unmount or when deps change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    
    function runSimulation() {
      setLoading(true);
      setError(null);

      // VB6 Strict Mode: Use complete fixture data (vehicle + env from fixture)
      if (strictMode) {
        // Check if fixture is complete
        let fixtureComplete = false;
        try {
          assertComplete(fixture);
          fixtureComplete = true;
        } catch {
          fixtureComplete = false;
        }
        
        if (fixtureComplete) {
          // Fixture is complete - run simulation with fixture data
          // Override fixture env with UI env settings for user control
          const simInputs = fixtureToSimInputs(fixture as any, raceLength);
          // Use UI environment settings instead of fixture env
          simInputs.env = {
            elevation: currentEnv.elevation ?? 0,
            barometerInHg: currentEnv.barometerInHg ?? 29.92,
            temperatureF: currentEnv.temperatureF ?? 75,
            humidityPct: currentEnv.humidityPct ?? 50,
            windMph: currentEnv.windMph ?? 0,
            windAngleDeg: currentEnv.windAngleDeg ?? 0,
            trackTempF: currentEnv.trackTempF ?? 100,
            tractionIndex: currentEnv.tractionIndex ?? 3,
          };
          console.log('[Predict] VB6 Strict Mode - using fixture vehicle + UI env', simInputs);
          
          simulate('VB6Exact', simInputs)
            .then((result) => {
              setSimResult(result);
              setLoading(false);
            })
            .catch((err) => {
              setError(err instanceof Error ? err.message : String(err));
              setLoading(false);
            });
          return;
        } else {
          // Strict mode requires complete fixture - wait for user to configure
          setLoading(false);
          setSimResult(null);
          return;
        }
      }

      // Normal mode: Convert vehicle to VB6 fixture format
      // Works for both QuarterPro (full HP curve) and QuarterJr (peak HP/RPM - synthetic curve)
      try {
        // Apply What-If adjustments to vehicle
        const adjustedVehicle = {
          ...currentVehicle,
          // Adjust weight
          weightLb: (currentVehicle.weightLb ?? 3000) + weightAdjust,
          // Adjust HP - scale the HP curve if present, or adjust peak HP
          powerHP: (currentVehicle.powerHP ?? 500) + hpAdjust,
          hpCurve: currentVehicle.hpCurve?.map(point => ({
            ...point,
            hp: point.hp + hpAdjust,
          })),
        };
        
        // Convert standard vehicle to VB6 fixture format
        // This will use synthetic HP curve if no full curve is available (QuarterJr mode)
        const vb6Fixture = fromVehicleToVB6Fixture(adjustedVehicle as any);
        const simInputs = fixtureToSimInputs(vb6Fixture, raceLength);
        // Override with UI environment settings
        // Note: tractionIndex defaults to 5 to match VB6 QuarterJr default
        simInputs.env = {
          elevation: currentEnv.elevation ?? 0,
          barometerInHg: currentEnv.barometerInHg ?? 29.92,
          temperatureF: currentEnv.temperatureF ?? 75,
          humidityPct: currentEnv.humidityPct ?? 50,
          windMph: currentEnv.windMph ?? 0,
          windAngleDeg: currentEnv.windAngleDeg ?? 0,
          trackTempF: currentEnv.trackTempF ?? 100,
          tractionIndex: currentEnv.tractionIndex ?? 5,
        };
        
        simulate('VB6Exact', simInputs)
          .then((result) => {
            setSimResult(result);
            setLoading(false);
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : String(err));
            setLoading(false);
          });
      } catch (err) {
        // Conversion failed - show error
        setError(`Simulation failed: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, env, raceLength, strictMode, fixture, hpAdjust, weightAdjust]);

  // Fetch weather from track or current location
  const handleFetchWeather = async (track?: Track) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const weather = track 
        ? await fetchTrackWeather(track)
        : await fetchCurrentLocationWeather();
      
      // Pass track angle for wind direction correction
      const envUpdate = weatherToEnv(weather, track?.trackAngle);
      setEnv(prev => prev ? { ...prev, ...envUpdate } : { ...DEFAULT_ENV, ...envUpdate });
      setLastWeatherUpdate(new Date());
      if (track) setSelectedTrack(track);
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : 'Failed to fetch weather');
    } finally {
      setWeatherLoading(false);
    }
  };

  // Show loading state only on initial load (no results yet)
  // Once we have results, show them while recalculating
  if (loading && !simResult) {
    return (
      <Page>
        <div className="text-center" style={{ padding: 'var(--space-6)', fontSize: '1.25rem' }}>
          <div className="text-muted">Calculating prediction...</div>
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <div className="error mb-4">
          <h2 className="mb-2">Error</h2>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
        <Link to="/" className="btn">
          Back to Home
        </Link>
      </Page>
    );
  }

  // Show vehicle selector if no vehicle is loaded
  if (showVehicleSelector || (!vehicle && !loading)) {
    const handleStartSimulation = () => {
      const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);
      if (selectedVehicle) {
        setVehicle(selectedVehicle as Vehicle);
        setEnv(DEFAULT_ENV);
        setShowVehicleSelector(false);
      }
    };

    return (
      <Page title="ET Simulator">
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Select Vehicle & Track</h2>
            
            {availableVehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                  No vehicles configured yet.
                </p>
                <Link to="/vehicles" className="btn">
                  Create a Vehicle
                </Link>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Vehicle
                  </label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '1rem',
                    }}
                  >
                    {availableVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.powerHP} HP, {v.weightLb} lb)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Race Length
                  </label>
                  <select
                    value={raceLength}
                    onChange={(e) => setRaceLength(e.target.value as RaceLength)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '1rem',
                    }}
                  >
                    {(Object.keys(DISTANCES) as RaceLength[])
                      .filter(key => RACE_LENGTH_INFO[key].category === 'drag')
                      .map(key => (
                        <option key={key} value={key}>
                          {RACE_LENGTH_INFO[key].label}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  onClick={handleStartSimulation}
                  className="btn"
                  style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}
                >
                  Run Simulation →
                </button>
              </>
            )}
          </div>
        </div>
      </Page>
    );
  }

  if (!vehicle || !env) {
    return null;
  }

  // VB6 Strict Mode: Show configuration prompt if fixture is incomplete
  if (strictMode && !isFixtureComplete) {
    return (
      <Page
        title="VB6 Strict Mode"
        actions={
          <Link to="/" className="link" style={{ fontSize: '0.9rem' }}>
            ← Back to Home
          </Link>
        }
      >
        <div className="card mb-6">
          <h2 className="mb-4">Configure VB6 Fixture</h2>
          <p className="text-muted mb-4">
            VB6 Strict Mode requires a complete fixture configuration. 
            Load a preset or manually configure all VB6 inputs.
          </p>
          <button
            onClick={() => setShowVb6Panel(true)}
            className="btn"
            style={{ marginRight: 'var(--space-2)' }}
          >
            Configure VB6 Inputs →
          </button>
          <button
            onClick={() => setFlag('vb6StrictMode', false)}
            className="btn-secondary"
          >
            Disable Strict Mode
          </button>
        </div>
        
        {/* VB6 Inputs Side Panel */}
        {showVb6Panel && (
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '500px',
            backgroundColor: 'var(--color-bg)',
            boxShadow: '-2px 0 10px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>VB6 Inputs</h2>
              <button
                onClick={() => setShowVb6Panel(false)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <VB6Inputs />
            </div>
          </div>
        )}
        
        {/* Backdrop */}
        {showVb6Panel && (
          <div
            onClick={() => setShowVb6Panel(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 999,
            }}
          />
        )}
      </Page>
    );
  }

  if (!simResult) {
    return (
      <Page>
        <div className="text-center" style={{ padding: 'var(--space-6)', fontSize: '1.25rem' }}>
          <div className="text-muted">Waiting for simulation result...</div>
        </div>
      </Page>
    );
  }

  // Get data from simulation result
  const baseET = simResult.et_s;
  const baseMPH = simResult.mph;
  const timeslip = simResult.timeslip;

  const handleRaceLengthChange = (newLength: RaceLength) => {
    setRaceLength(newLength);
  };

  // Save current run to history
  const handleSaveRun = () => {
    if (!vehicle || !env || !simResult) return;
    
    saveRun({
      vehicleName: vehicle.name,
      vehicleId: vehicle.id,
      raceLength,
      env,
      result: {
        et_s: simResult.et_s,
        mph: simResult.mph,
      },
      hpAdjust,
      weightAdjust,
    });
    
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  // Load a saved run for comparison
  const handleLoadComparison = (run: SavedRun) => {
    setComparisonRun(comparisonRun?.id === run.id ? null : run);
  };

  return (
    <Page wide>
      <style>{`
        .et-sim-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          height: calc(100vh - 90px);
          min-height: 450px;
        }
        .et-sim-top-row {
          display: flex;
          gap: var(--space-2);
          flex: 7;
          min-height: 200px;
        }
        .et-sim-bottom-row {
          display: flex;
          gap: var(--space-3);
          flex: 3;
          min-height: 140px;
        }
        .et-sim-chart-area {
          flex: 1;
          min-width: 0;
          position: relative;
        }
        .et-slip {
          font-family: 'Courier New', monospace;
          background: 
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 11px,
              rgba(0,0,0,0.02) 11px,
              rgba(0,0,0,0.02) 12px
            ),
            linear-gradient(180deg, #faf9f5 0%, #f0efe8 50%, #e8e7e0 100%);
          color: #2a2a2a;
          padding: 12px 16px;
          border-radius: 2px;
          font-size: 11px;
          line-height: 1.4;
          box-shadow: 
            0 1px 3px rgba(0,0,0,0.12),
            0 4px 8px rgba(0,0,0,0.08),
            inset 0 0 0 1px rgba(0,0,0,0.05);
          width: 175px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .et-slip::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
          border-radius: 2px;
        }
        .et-slip-header {
          text-align: center;
          border-bottom: 1px dashed #888;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .et-slip-header img {
          filter: grayscale(100%) contrast(1.1);
        }
        .et-slip-row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
        }
        .et-slip-label {
          color: #555;
        }
        .et-slip-value {
          font-weight: bold;
          text-align: right;
          color: #1a1a1a;
        }
        .et-slip-vehicle {
          border-top: 1px dashed #888;
          margin-top: 8px;
          padding-top: 6px;
          font-size: 9px;
          text-align: center;
          color: #666;
          letter-spacing: 0.3px;
        }
        /* Responsive: stack on smaller screens */
        @media (max-width: 900px) {
          .et-sim-dashboard {
            height: auto;
            min-height: auto;
            overflow: visible;
          }
          .et-sim-top-row {
            flex-direction: column;
            min-height: auto;
            flex: none;
          }
          .et-slip {
            width: 100%;
            /* Keep vertical layout on mobile - same as desktop */
            flex-direction: column;
          }
          .et-sim-chart-area {
            /* CRITICAL: iOS Safari needs explicit height, not flex */
            height: 320px !important;
            min-height: 320px !important;
            flex: none !important;
          }
          .et-sim-bottom-row {
            flex-direction: column;
            height: auto;
            flex: none;
            gap: var(--space-2);
          }
          .et-sim-bottom-row > * {
            width: 100% !important;
            min-width: 0 !important;
          }
        }
        /* Mobile phones */
        @media (max-width: 600px) {
          .et-slip {
            padding: 12px 16px;
            font-size: 12px;
            width: 100%;
            max-width: 280px;
            margin: 0 auto;
          }
          .et-slip-header img {
            height: 40px !important;
          }
          .et-slip-row {
            padding: 2px 0;
          }
          .et-slip-final {
            margin-top: 8px;
            padding-top: 8px;
          }
          .et-slip-final .et-slip-value {
            font-size: 14px !important;
          }
          .et-sim-chart-area {
            /* Larger chart for phones - make it usable */
            height: 350px !important;
            min-height: 350px !important;
          }
          .et-sim-bottom-row {
            padding: var(--space-2);
          }
          .et-sim-bottom-row .card {
            padding: 10px !important;
          }
          .env-compact {
            font-size: 0.7rem;
          }
          .env-compact input {
            width: 50px !important;
            padding: 4px !important;
            font-size: 0.7rem !important;
          }
          /* Hide RPM histogram on very small screens to save space */
          .et-sim-bottom-row > .card:first-child {
            display: none;
          }
        }
        /* Very small phones (iPhone SE, etc) */
        @media (max-width: 400px) {
          .et-sim-chart-area {
            height: 300px !important;
            min-height: 300px !important;
          }
          .et-slip {
            font-size: 11px;
            padding: 10px 12px;
            max-width: 240px;
          }
        }
        /* Print styles */
        @media print {
          .et-sim-dashboard {
            background: white !important;
          }
          .et-slip {
            box-shadow: none !important;
            border: 2px solid #000 !important;
          }
          .et-sim-chart-area,
          .et-sim-bottom-row,
          button {
            display: none !important;
          }
        }
      `}</style>

      <div className="et-sim-dashboard">
        {/* TOP ROW: ET Slip + Data Logger Chart */}
        <div className="et-sim-top-row">
          {/* ET Slip Style Results */}
          <div className="et-slip" style={{ opacity: (isDebouncing || loading) ? 0.7 : 1 }}>
            <div className="et-slip-header">
              <img src="/rsa-icon.png" alt="RSA" style={{ height: '48px', marginBottom: '4px' }} />
              <div style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>RSA</div>
              <div style={{ fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px', marginTop: '2px' }}>
                {RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? 'Bonneville Pro' : strictMode ? 'Quarter Pro' : 'Quarter Jr'}
              </div>
              <div style={{ fontSize: '8px', color: '#666', marginTop: '4px' }}>
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '7px', color: '#888', marginTop: '2px' }}>
                racingsystemsanalysis.com
              </div>
            </div>
            
            {/* Splits - show based on track type */}
            {RACE_LENGTH_INFO[raceLength]?.category === 'drag' ? (
              <>
                {/* Drag racing splits */}
                <div className="et-slip-row">
                  <span className="et-slip-label">60'</span>
                  <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 60)?.t_s ?? 0).toFixed(3)}</span>
                </div>
                <div className="et-slip-row">
                  <span className="et-slip-label">330'</span>
                  <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 330)?.t_s ?? 0).toFixed(3)}</span>
                </div>
                {raceLength === 'QUARTER' && (
                  <>
                    <div className="et-slip-row">
                      <span className="et-slip-label">1/8</span>
                      <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 660)?.t_s ?? 0).toFixed(3)}</span>
                    </div>
                    <div className="et-slip-row">
                      <span className="et-slip-label">MPH</span>
                      <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 660)?.v_mph ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="et-slip-row">
                      <span className="et-slip-label">1000'</span>
                      <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 1000)?.t_s ?? 0).toFixed(3)}</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Land speed splits - show mile markers */}
                <div className="et-slip-row">
                  <span className="et-slip-label">1/8 mi</span>
                  <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 660)?.v_mph ?? 0).toFixed(1)} mph</span>
                </div>
                <div className="et-slip-row">
                  <span className="et-slip-label">1/4 mi</span>
                  <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 1320)?.v_mph ?? 0).toFixed(1)} mph</span>
                </div>
                <div className="et-slip-row">
                  <span className="et-slip-label">1/2 mi</span>
                  <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 2640)?.v_mph ?? 0).toFixed(1)} mph</span>
                </div>
                {RACE_LENGTH_INFO[raceLength]?.lengthFt >= 5280 && (
                  <div className="et-slip-row">
                    <span className="et-slip-label">1 mi</span>
                    <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 5280)?.v_mph ?? 0).toFixed(1)} mph</span>
                  </div>
                )}
              </>
            )}
            
            {/* Final ET/MPH - inline with splits */}
            <div className="et-slip-row" style={{ marginTop: '6px', paddingTop: '6px' }}>
              <span className="et-slip-label">{RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? 'Time' : 'ET'}</span>
              <span className="et-slip-value" style={{ fontSize: '13px' }}>{baseET.toFixed(3)}</span>
            </div>
            <div className="et-slip-row">
              <span className="et-slip-label">{RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? 'Top Speed' : 'MPH'}</span>
              <span className="et-slip-value" style={{ fontSize: '13px' }}>{baseMPH.toFixed(2)}</span>
            </div>
            
            {/* Vehicle selector dropdown */}
            <div className="et-slip-vehicle" style={{ marginTop: '6px' }}>
              <select
                value={vehicle.id}
                onChange={async (e) => {
                  const selected = availableVehicles.find(v => v.id === e.target.value);
                  if (selected) {
                    // Load full vehicle data
                    const vehicles = await loadVehicles();
                    const fullVehicle = vehicles.find(v => v.id === selected.id);
                    if (fullVehicle) {
                      setVehicle(fullVehicle as Vehicle);
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  fontSize: '0.7rem',
                  backgroundColor: '#222',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button
                onClick={handleSaveRun}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: showSaveConfirm ? '#22c55e' : '#333',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {showSaveConfirm ? '✓ Saved!' : 'Save'}
              </button>
              <button
                onClick={() => {
                  const text = `RSA ${strictMode ? 'Quarter Pro' : 'Quarter Jr'} Prediction
${vehicle.name}
${new Date().toLocaleDateString()}

ET: ${baseET.toFixed(3)}
MPH: ${baseMPH.toFixed(2)}

60': ${(timeslip.find(s => s.d_ft === 60)?.t_s ?? 0).toFixed(3)}
330': ${(timeslip.find(s => s.d_ft === 330)?.t_s ?? 0).toFixed(3)}
${raceLength === 'QUARTER' ? `1/8: ${(timeslip.find(s => s.d_ft === 660)?.t_s ?? 0).toFixed(3)} @ ${(timeslip.find(s => s.d_ft === 660)?.v_mph ?? 0).toFixed(1)} mph` : ''}

racingsystemsanalysis.com`;
                  navigator.clipboard.writeText(text);
                  alert('Timeslip copied to clipboard!');
                }}
                style={{
                  padding: '6px 8px',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#333',
                  color: 'white',
                  cursor: 'pointer',
                }}
                title="Copy timeslip to clipboard"
              >
                📋
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '6px 8px',
                  fontSize: '0.7rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#333',
                  color: 'white',
                  cursor: 'pointer',
                }}
                title="Print timeslip"
              >
                🖨️
              </button>
            </div>
            
            {/* Comparison indicator */}
            {comparisonRun && (
              <div style={{ 
                marginTop: '6px', 
                padding: '4px 6px', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '4px',
                fontSize: '0.65rem',
                color: '#3b82f6',
              }}>
                <div style={{ fontWeight: 600 }}>vs {comparisonRun.vehicleName}</div>
                <div>
                  ET: {(baseET - comparisonRun.result.et_s) >= 0 ? '+' : ''}{(baseET - comparisonRun.result.et_s).toFixed(3)}s
                </div>
                <div>
                  MPH: {(baseMPH - comparisonRun.result.mph) >= 0 ? '+' : ''}{(baseMPH - comparisonRun.result.mph).toFixed(2)}
                </div>
                <button 
                  onClick={() => setComparisonRun(null)}
                  style={{ 
                    marginTop: '4px',
                    padding: '2px 6px',
                    fontSize: '0.6rem',
                    border: '1px solid #3b82f6',
                    borderRadius: '3px',
                    backgroundColor: 'transparent',
                    color: '#3b82f6',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Data Logger Chart */}
          <div className="et-sim-chart-area card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column' }}>
            {(isDebouncing || loading) && (
              <div style={{ position: 'absolute', top: '6px', right: '10px', fontSize: '0.7rem', color: 'var(--color-accent)', fontStyle: 'italic', zIndex: 10 }}>
                updating...
              </div>
            )}
            <Suspense fallback={<div className="text-center text-muted" style={{ padding: 'var(--space-4)' }}>Loading chart...</div>}>
              {simResult?.traces && simResult.traces.length > 0 ? (
                <div style={{ flex: 1, minHeight: '200px', height: '100%' }}>
                  <DataLoggerChart data={simResult.traces as any} raceLengthFt={RACE_LENGTH_INFO[raceLength]?.lengthFt ?? 1320} />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                  No simulation data
                </div>
              )}
            </Suspense>
          </div>
        </div>

        {/* BOTTOM ROW: RPM Histogram + Environment + Race Length */}
        <div className="et-sim-bottom-row">
          {/* RPM Histogram */}
          <div className="card" style={{ flex: 2, padding: '12px 16px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '6px' }}>RPM Distribution</div>
            <Suspense fallback={<div className="text-muted" style={{ fontSize: '0.8rem' }}>Loading...</div>}>
              {simResult?.traces && simResult.traces.length > 0 && (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <RPMHistogram data={simResult.traces as any} compact />
                </div>
              )}
            </Suspense>
          </div>

          {/* Environment */}
          <div className="card" style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '0.8rem' }}>Environment</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <select
                  value={selectedTrack?.id || ''}
                  onChange={(e) => {
                    const track = getAllTracks().find(t => t.id === e.target.value);
                    if (track) handleFetchWeather(track);
                  }}
                  style={{
                    padding: '3px 6px',
                    fontSize: '0.65rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    maxWidth: '140px',
                  }}
                  disabled={weatherLoading}
                >
                  <option value="">Select Track...</option>
                  {getAllTracks().map(track => (
                    <option key={track.id} value={track.id}>
                      {track.name.length > 20 ? track.name.slice(0, 18) + '...' : track.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleFetchWeather()}
                  disabled={weatherLoading}
                  style={{
                    padding: '3px 6px',
                    fontSize: '0.65rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text)',
                    cursor: weatherLoading ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  title="Get weather for your current location"
                >
                  {weatherLoading ? '...' : '📍 My Location'}
                </button>
              </div>
            </div>
            {weatherError && (
              <div style={{ fontSize: '0.65rem', color: '#ef4444', marginBottom: '4px' }}>{weatherError}</div>
            )}
            {lastWeatherUpdate && !weatherError && (
              <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)', marginBottom: '4px' }}>
                Weather updated {lastWeatherUpdate.toLocaleTimeString()}
                {selectedTrack && ` • ${selectedTrack.city}, ${selectedTrack.state}`}
              </div>
            )}
            <EnvironmentForm value={env} onChange={setEnv} compact />
          </div>

          {/* What-If Adjustments */}
          <div className="card" style={{ width: '200px', flexShrink: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)', fontSize: '0.8rem' }}>What-If</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem' }}>
              {/* HP Adjustment */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>HP</span>
                  <span style={{ 
                    fontWeight: 600, 
                    color: hpAdjust > 0 ? '#22c55e' : hpAdjust < 0 ? '#ef4444' : 'var(--color-text)' 
                  }}>
                    {hpAdjust >= 0 ? '+' : ''}{hpAdjust}
                  </span>
                </div>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="10"
                  value={hpAdjust}
                  onChange={(e) => setHpAdjust(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              {/* Weight Adjustment */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Weight (lbs)</span>
                  <span style={{ 
                    fontWeight: 600, 
                    color: weightAdjust < 0 ? '#22c55e' : weightAdjust > 0 ? '#ef4444' : 'var(--color-text)' 
                  }}>
                    {weightAdjust >= 0 ? '+' : ''}{weightAdjust}
                  </span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  step="25"
                  value={weightAdjust}
                  onChange={(e) => setWeightAdjust(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>
              {/* Reset button */}
              {(hpAdjust !== 0 || weightAdjust !== 0) && (
                <button
                  onClick={() => { setHpAdjust(0); setWeightAdjust(0); }}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Recent Runs - for comparison */}
          <div className="card" style={{ width: '180px', flexShrink: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)', fontSize: '0.8rem' }}>Recent Runs</div>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.7rem' }}>
              {getRecentRuns(5).length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No saved runs yet</div>
              ) : (
                getRecentRuns(5).map(run => (
                  <button
                    key={run.id}
                    onClick={() => handleLoadComparison(run)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      marginBottom: '4px',
                      borderRadius: '4px',
                      border: comparisonRun?.id === run.id ? '1px solid #3b82f6' : '1px solid var(--color-border)',
                      backgroundColor: comparisonRun?.id === run.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg-secondary)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.7rem', marginBottom: '2px' }}>{run.vehicleName}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>
                      {run.result.et_s.toFixed(3)}s @ {run.result.mph.toFixed(1)} mph
                    </div>
                    {(run.hpAdjust !== 0 || run.weightAdjust !== 0) && (
                      <div style={{ color: '#f59e0b', fontSize: '0.6rem' }}>
                        {run.hpAdjust !== 0 && `HP ${run.hpAdjust > 0 ? '+' : ''}${run.hpAdjust}`}
                        {run.hpAdjust !== 0 && run.weightAdjust !== 0 && ' / '}
                        {run.weightAdjust !== 0 && `Wt ${run.weightAdjust > 0 ? '+' : ''}${run.weightAdjust}`}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Race Length */}
          <div className="card" style={{ width: '110px', flexShrink: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontWeight: '600', marginBottom: '10px', color: 'var(--color-text)', fontSize: '0.8rem' }}>Race Length</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="raceLength" value="EIGHTH" checked={raceLength === 'EIGHTH'} onChange={(e) => handleRaceLengthChange(e.target.value as RaceLength)} />
                <span>1/8 Mile</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="raceLength" value="QUARTER" checked={raceLength === 'QUARTER'} onChange={(e) => handleRaceLengthChange(e.target.value as RaceLength)} />
                <span>1/4 Mile</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* VB6 Inputs Side Panel */}
      {showVb6Panel && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '600px',
          backgroundColor: 'var(--color-bg)',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.2)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: 'var(--color-text)' }}>VB6 Inputs</h2>
            <button
              onClick={() => setShowVb6Panel(false)}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Close
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <VB6Inputs />
          </div>
        </div>
      )}
      
      {/* Backdrop for side panel */}
      {showVb6Panel && (
        <div
          onClick={() => setShowVb6Panel(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 999,
          }}
        />
      )}
    </Page>
  );
}

export default Predict;
