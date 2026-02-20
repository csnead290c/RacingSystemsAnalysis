import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import EnvironmentForm from '../shared/components/EnvironmentForm';
import { simulate } from '../workerBridge';
import { DEFAULT_ENV } from '../domain/schemas/env.schema';
import type { Vehicle } from '../domain/schemas/vehicle.schema';
import { type RaceLength, RACE_LENGTH_INFO, DISTANCES, getLandSpeedCheckpoints, getDistanceMarkers } from '../domain/config/raceLengths';
import type { Env } from '../domain/schemas/env.schema';
import type { SimResult } from '../domain/physics';
import { useVb6Fixture } from '../shared/state/vb6FixtureStore';
import { assertComplete, fixtureToSimInputs } from '../domain/physics/vb6/fixtures';
import { useFlag, useFlagsStore, useFlags } from '../domain/flags/store.tsx';
import VB6Inputs from './VB6Inputs';
import { fromVehicleToVB6Fixture } from '../dev/vb6/fromVehicle';
import { useRunHistory, type SavedRun } from '../shared/state/runHistoryStore';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { getAverage60ft } from '../state/storage';
import { getAllTracks, type Track } from '../domain/config/tracks';
import { fetchTrackWeather, fetchCurrentLocationWeather, weatherToEnv } from '../services/weather';
import { useSubscription } from '../domain/config/useSubscription';
import { useCapabilities } from '../domain/config/useCapabilities';
import { getQuarterProgramName, getLandSpeedProgramName } from '../domain/ui/programDisplayNames';
import { useSharedEnv } from '../shared/state/useSharedEnv';
import { calculateWeatherImpact } from '../domain/physics/calculations/weatherImpact';

// Lazy load charts and components
const DataLoggerChart = lazy(() => import('../shared/components/charts/DataLoggerChart'));
const RPMHistogram = lazy(() => import('../shared/components/charts/RPMHistogram'));
const OptimizerModal = lazy(() => import('../shared/components/OptimizerModal'));
const VehicleEditorPopup = lazy(() => import('../shared/components/VehicleEditorPopup'));
const DetailedParametersModal = lazy(() => import('../shared/components/DetailedParameters'));
import { DebugPanel, type DebugData } from '../shared/components/DebugPanel';

interface LocationState {
  vehicle: Vehicle;
  raceLength: RaceLength;
}

function Predict() {
  const location = useLocation();
  const { features } = useSubscription();
  const { can } = useCapabilities();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const { env: sharedEnv, setEnv: setSharedEnv } = useSharedEnv();
  const [env, setEnv] = useState<Env | null>(sharedEnv as Env);
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  
  // Sync local env with shared env
  useEffect(() => {
    if (env) {
      setSharedEnv(env as any);
    }
  }, [env, setSharedEnv]);
  // Always use VB6Exact - works for both QuarterPro (full HP curve) and QuarterJr (peak HP/RPM)
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVb6Panel, setShowVb6Panel] = useState(false);
  const { fixture } = useVb6Fixture();
  
  // What-If adjustments
  const [hpAdjust, setHpAdjust] = useState(0); // HP delta (+/- from base)
  const [weightAdjust, setWeightAdjust] = useState(0); // Weight delta (+/- from base)
  const strictMode = useFlag('vb6StrictMode');
  
  // Throttle stop configuration (for bracket racing)
  const [throttleStopEnabled, setThrottleStopEnabled] = useState(false);
  const [throttleStopActivate, setThrottleStopActivate] = useState(1.0); // seconds after launch
  const [throttleStopDuration, setThrottleStopDuration] = useState(1.5); // seconds
  const [throttleStopPct, setThrottleStopPct] = useState(30); // throttle percentage when active
  
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
  const flags = useFlags();
  
  // Vehicle selection state (when no vehicle passed via location state)
  const [availableVehicles, setAvailableVehicles] = useState<VehicleLite[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  
  // Track and weather state
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<Date | null>(null);
  
  // Optimizer modal state
  const [showOptimizer, setShowOptimizer] = useState(false);
  
  // Vehicle editor popup state
  const [showVehicleEditor, setShowVehicleEditor] = useState(false);
  
  // Detailed parameters modal state
  const [showDetailedParams, setShowDetailedParams] = useState(false);
  
  // Average 60ft from database (CCP-style feature)
  const [avg60ftStats, setAvg60ftStats] = useState<{
    average: number | null;
    count: number;
    best: number | null;
    worst: number | null;
  } | null>(null);
  
  // Filter race lengths based on subscription tier
  const allowedRaceLengths = (Object.keys(DISTANCES) as RaceLength[]).filter(key => {
    const info = RACE_LENGTH_INFO[key];
    // Racer tier: only 1/8 and 1/4 mile drag racing
    if (key === 'EIGHTH') return features.trackEighth;
    if (key === 'QUARTER') return features.trackQuarter;
    if (key === 'THOUSAND') return features.trackThousand;
    // Land speed tracks require Pro+
    if (info.category === 'landspeed') return features.trackBonneville;
    // Custom lengths require Pro+
    return features.customTrackLength;
  });
  
  
  // Initialize from location state, sessionStorage, or show vehicle selector
  useEffect(() => {
    const state = location.state as LocationState | null;
    
    // Check sessionStorage FIRST (from "Run Sim" button in Vehicle Manager)
    const storedVehicleId = sessionStorage.getItem('selectedVehicleId');
    const storedRaceLength = sessionStorage.getItem('selectedRaceLength') as RaceLength | null;
    
    // Clear sessionStorage immediately to prevent re-use on refresh
    if (storedVehicleId) {
      sessionStorage.removeItem('selectedVehicleId');
      sessionStorage.removeItem('selectedRaceLength');
    }

    // If we have state from navigation, use it
    if (state?.vehicle && state?.raceLength) {
      setVehicle(state.vehicle);
      setRaceLength(state.raceLength);
      setEnv(DEFAULT_ENV);
      setShowVehicleSelector(false);
      setLoading(false);
      // Load throttle stop settings from vehicle
      if (state.vehicle.throttleStopEnabled) {
        setThrottleStopEnabled(true);
        setThrottleStopActivate(state.vehicle.throttleStopDelay ?? 1.0);
        setThrottleStopDuration(state.vehicle.throttleStopDuration ?? 1.5);
        setThrottleStopPct(state.vehicle.throttleStopPct ?? 30);
      }
      return;
    }

    // Load vehicles and either auto-select from sessionStorage or show selector
    const loadAndSelectVehicle = async () => {
      try {
        const vehicles = await loadVehicles();
        setAvailableVehicles(vehicles);
        
        // If we have a stored vehicle ID from "Run Sim" button, use it
        if (storedVehicleId) {
          const foundVehicle = vehicles.find(v => v.id === storedVehicleId);
          if (foundVehicle) {
            setVehicle(foundVehicle as Vehicle);
            setSelectedVehicleId(foundVehicle.id);
            if (storedRaceLength) {
              setRaceLength(storedRaceLength);
            } else if (foundVehicle.defaultRaceLength) {
              setRaceLength(foundVehicle.defaultRaceLength as RaceLength);
            }
            setEnv(DEFAULT_ENV);
            setShowVehicleSelector(false);
            setLoading(false);
            return;
          }
        }
        
        // No stored vehicle, show selector
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
    loadAndSelectVehicle();
  }, [location.state]);

  // Load average 60ft stats when vehicle changes
  useEffect(() => {
    if (vehicle?.id) {
      getAverage60ft(vehicle.id).then(setAvg60ftStats).catch(console.error);
    } else {
      setAvg60ftStats(null);
    }
  }, [vehicle?.id]);

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
    
    // Show debouncing indicator - debounce by 400ms
    setIsDebouncing(true);
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
          // VB6 Quarter Jr default: trackTemp = temperature + 30 when not specified
          const tempF_strict = currentEnv.temperatureF ?? 75;
          simInputs.env = {
            elevation: currentEnv.elevation ?? 0,
            barometerInHg: currentEnv.barometerInHg ?? 29.92,
            temperatureF: tempF_strict,
            humidityPct: currentEnv.humidityPct ?? 50,
            windMph: currentEnv.windMph ?? 0,
            windAngleDeg: currentEnv.windAngleDeg ?? 0,
            trackTempF: currentEnv.trackTempF ?? (tempF_strict + 30),
            tractionIndex: currentEnv.tractionIndex ?? 3,
          };
          
          // Add throttle stop config if enabled
          if (throttleStopEnabled) {
            simInputs.throttleStop = {
              enabled: true,
              activateTime_s: throttleStopActivate,
              duration_s: throttleStopDuration,
              throttlePct: throttleStopPct,
            };
          }
          // VB6 Strict Mode simulation
          
          simulate('VB6Exact', simInputs)
            .then((result) => {
              setSimResult(result);
              setDebugData((result as any).debugData ?? null);
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
        // Force QuarterJr mode if user doesn't have Pro access - prevents using stored Pro data after downgrade
        const vb6Fixture = fromVehicleToVB6Fixture(adjustedVehicle as any, { 
          forceQuarterJr: !features.quarterProFields 
        });
        const simInputs = fixtureToSimInputs(vb6Fixture, raceLength);
        // Override with UI environment settings
        // Note: tractionIndex defaults to 5 to match VB6 QuarterJr default
        // VB6 Quarter Jr default: trackTemp = temperature + 30 when not specified
        const tempF_normal = currentEnv.temperatureF ?? 75;
        simInputs.env = {
          elevation: currentEnv.elevation ?? 0,
          barometerInHg: currentEnv.barometerInHg ?? 29.92,
          temperatureF: tempF_normal,
          humidityPct: currentEnv.humidityPct ?? 50,
          windMph: currentEnv.windMph ?? 0,
          windAngleDeg: currentEnv.windAngleDeg ?? 0,
          trackTempF: currentEnv.trackTempF ?? (tempF_normal + 30),
          tractionIndex: currentEnv.tractionIndex ?? 5,
        };
        
        // Add throttle stop config if enabled
        if (throttleStopEnabled) {
          simInputs.throttleStop = {
            enabled: true,
            activateTime_s: throttleStopActivate,
            duration_s: throttleStopDuration,
            throttlePct: throttleStopPct,
          };
        }
        
        // Apply VB6-style rounding if dev flag is enabled
        (simInputs as any).applyVB6Rounding = flags.vb6Rounding;
        (simInputs as any).etDecimals = flags.etDecimals;
        (simInputs as any).mphDecimals = flags.mphDecimals;
        // Apply VB6 32-bit precision if dev flag is enabled
        (simInputs as any).vb6Strict = flags.vb6Strict;
        
        simulate('VB6Exact', simInputs)
          .then((result) => {
            setSimResult(result);
            setDebugData((result as any).debugData ?? null);
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
  }, [vehicle, env, raceLength, strictMode, fixture, hpAdjust, weightAdjust, throttleStopEnabled, throttleStopActivate, throttleStopDuration, throttleStopPct]);

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
        // Load throttle stop settings from vehicle
        if ((selectedVehicle as Vehicle).throttleStopEnabled) {
          setThrottleStopEnabled(true);
          setThrottleStopActivate((selectedVehicle as Vehicle).throttleStopDelay ?? 1.0);
          setThrottleStopDuration((selectedVehicle as Vehicle).throttleStopDuration ?? 1.5);
          setThrottleStopPct((selectedVehicle as Vehicle).throttleStopPct ?? 30);
        } else {
          setThrottleStopEnabled(false);
        }
      }
    };

    return (
      <Page title={getQuarterProgramName(can)}>
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
                    {allowedRaceLengths
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

  // Save current run to history (Pro feature - includes traces for overlay)
  const handleSaveRun = () => {
    if (!vehicle || !env || !simResult) return;
    
    // Include traces for chart overlay (Pro feature)
    const tracesToSave = features.quarterProFields && simResult.traces 
      ? simResult.traces.map((t: any) => ({
          t_s: t.t_s,
          s_ft: t.s_ft,
          v_mph: t.v_mph,
          a_g: t.a_g,
          rpm: t.rpm,
          gear: t.gear,
          hp: t.hp,
        }))
      : undefined;
    
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
      traces: tracesToSave,
    });
    
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  // Load a saved run for comparison
  const handleLoadComparison = (run: SavedRun) => {
    setComparisonRun(comparisonRun?.id === run.id ? null : run);
  };

  return (
    <Page wide title={RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? getLandSpeedProgramName(can) : getQuarterProgramName(can)}>
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
          gap: var(--space-2);
          flex: 0 0 auto;
          min-height: 120px;
          max-height: 160px;
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
          /* Hide RPM histogram and Recent Runs on very small screens to save space */
          .et-sim-bottom-row > .card:last-child,
          .et-sim-bottom-row > .card:nth-last-child(2) {
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
              <img src="/rsa-icon.png" alt="RSA" style={{ height: '48px', marginBottom: '4px', mixBlendMode: 'multiply' }} />

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
                  <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 60)?.t_s ?? 0).toFixed(flags.etDecimals)}</span>
                </div>
                {/* Average 60ft from database - CCP feature */}
                {avg60ftStats && avg60ftStats.average && (
                  <div style={{ 
                    fontSize: '7px', 
                    color: '#666', 
                    textAlign: 'center', 
                    marginTop: '-2px', 
                    marginBottom: '4px',
                    padding: '2px 4px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '2px',
                  }}>
                    DB Avg: {avg60ftStats.average.toFixed(3)}s ({avg60ftStats.count} runs) | Best: {avg60ftStats.best?.toFixed(3)}s
                  </div>
                )}
                <div className="et-slip-row">
                  <span className="et-slip-label">330'</span>
                  <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 330)?.t_s ?? 0).toFixed(flags.etDecimals)}</span>
                </div>
                {raceLength === 'QUARTER' && (
                  <>
                    <div className="et-slip-row">
                      <span className="et-slip-label">1/8</span>
                      <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 660)?.t_s ?? 0).toFixed(flags.etDecimals)}</span>
                    </div>
                    <div className="et-slip-row">
                      <span className="et-slip-label">MPH</span>
                      <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 660)?.v_mph ?? 0).toFixed(flags.mphDecimals)}</span>
                    </div>
                    <div className="et-slip-row">
                      <span className="et-slip-label">1000'</span>
                      <span className="et-slip-value">{(timeslip.find(s => s.d_ft === 1000)?.t_s ?? 0).toFixed(flags.etDecimals)}</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Land speed splits - use checkpoint config for full coverage */}
                {(getLandSpeedCheckpoints(raceLength) ?? []).map((cp, idx) => {
                  const entry = timeslip.find(s => s.d_ft === cp.dist_ft);
                  const mph_val = entry?.v_mph ?? 0;
                  return (
                    <div className="et-slip-row" key={idx}>
                      <span className="et-slip-label">{cp.label}</span>
                      <span className="et-slip-value">{mph_val.toFixed(1)} mph</span>
                    </div>
                  );
                })}
              </>
            )}
            
            {/* Final ET/MPH - inline with splits */}
            <div className="et-slip-row" style={{ marginTop: '6px', paddingTop: '6px' }}>
              <span className="et-slip-label">{RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? 'Time' : 'ET'}</span>
              <span className="et-slip-value" style={{ fontSize: '13px' }}>{baseET.toFixed(flags.etDecimals)}</span>
            </div>
            <div className="et-slip-row">
              <span className="et-slip-label">{RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? 'Top Speed' : 'MPH'}</span>
              <span className="et-slip-value" style={{ fontSize: '13px' }}>{baseMPH.toFixed(flags.mphDecimals)}</span>
            </div>
            
            {/* Vehicle selector dropdown with edit button */}
            <div className="et-slip-vehicle" style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
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
                      // Load throttle stop settings from vehicle
                      if ((fullVehicle as any).throttleStopEnabled) {
                        setThrottleStopEnabled(true);
                        setThrottleStopActivate((fullVehicle as any).throttleStopDelay ?? 1.0);
                        setThrottleStopDuration((fullVehicle as any).throttleStopDuration ?? 1.5);
                        setThrottleStopPct((fullVehicle as any).throttleStopPct ?? 30);
                      } else {
                        setThrottleStopEnabled(false);
                      }
                    }
                  }
                }}
                style={{
                  flex: 1,
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
              <button
                onClick={() => setShowVehicleEditor(true)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  backgroundColor: '#333',
                  color: 'white',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="Edit vehicle settings"
              >
                ⚙️
              </button>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {features.quarterProFields ? (
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
                  title="Save run for comparison overlay"
                >
                  {showSaveConfirm ? '✓ Saved!' : 'Save'}
                </button>
              ) : (
                <span
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#222',
                    color: '#666',
                    textAlign: 'center',
                  }}
                  title="Save & Compare - Pro feature"
                >
                  🔒 Save
                </span>
              )}
              <button
                onClick={() => {
                  const text = `RSA ${getQuarterProgramName(can)} Prediction
${vehicle.name}
${new Date().toLocaleDateString()}

ET: ${baseET.toFixed(flags.etDecimals)}
MPH: ${baseMPH.toFixed(flags.mphDecimals)}

60': ${(timeslip.find(s => s.d_ft === 60)?.t_s ?? 0).toFixed(flags.etDecimals)}
330': ${(timeslip.find(s => s.d_ft === 330)?.t_s ?? 0).toFixed(flags.etDecimals)}
${raceLength === 'QUARTER' ? `1/8: ${(timeslip.find(s => s.d_ft === 660)?.t_s ?? 0).toFixed(flags.etDecimals)} @ ${(timeslip.find(s => s.d_ft === 660)?.v_mph ?? 0).toFixed(flags.mphDecimals)} mph` : ''}

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
              {simResult?.traces && simResult.traces.length > 0 && (
                <button
                  onClick={() => setShowDetailedParams(true)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#333',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                  title="Detailed Parameters — step-by-step simulation output"
                >
                  📊 Detail
                </button>
              )}
            </div>
            
            {/* Comparison indicator with weather impact */}
            {comparisonRun && (
              <div style={{ 
                marginTop: '6px', 
                padding: '6px 8px', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '4px',
                fontSize: '0.65rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 600, color: '#3b82f6' }}>vs {comparisonRun.vehicleName}</div>
                  <button 
                    onClick={() => setComparisonRun(null)}
                    style={{ padding: '1px 4px', fontSize: '0.55rem', border: '1px solid #3b82f6', borderRadius: '2px', backgroundColor: 'transparent', color: '#3b82f6', cursor: 'pointer' }}
                  >×</button>
                </div>
                
                {/* Weather Impact Breakdown */}
                {comparisonRun.env && env && (() => {
                  const impact = calculateWeatherImpact(
                    { temperatureF: comparisonRun.env.temperatureF ?? 70, humidityPct: comparisonRun.env.humidityPct ?? 50, barometerInHg: comparisonRun.env.barometerInHg ?? 29.92, elevation: comparisonRun.env.elevation, windMph: comparisonRun.env.windMph, windAngleDeg: comparisonRun.env.windAngleDeg },
                    { temperatureF: env.temperatureF ?? 70, humidityPct: env.humidityPct ?? 50, barometerInHg: env.barometerInHg ?? 29.92, elevation: env.elevation, windMph: env.windMph, windAngleDeg: env.windAngleDeg },
                    comparisonRun.result.et_s
                  );
                  return (
                    <div style={{ fontSize: '0.6rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 50px', gap: '2px', marginBottom: '4px', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', paddingBottom: '2px' }}>
                        <span>Factor</span><span>Base</span><span>Now</span><span>ET Δ</span>
                      </div>
                      {impact.impacts.map(i => (
                        <div key={i.factor} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 50px', gap: '2px', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text)' }}>{i.factor}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{i.baselineValue.toFixed(1)}</span>
                          <span style={{ color: 'var(--color-text)' }}>{i.currentValue.toFixed(1)}</span>
                          <span style={{ 
                            fontWeight: 600, 
                            color: i.direction === 'faster' ? '#10b981' : i.direction === 'slower' ? '#ef4444' : 'var(--color-text-muted)'
                          }}>
                            {i.etChange >= 0 ? '+' : ''}{(i.etChange * 1000).toFixed(0)}ms
                          </span>
                        </div>
                      ))}
                      <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text)' }}>Predicted ET:</span>
                        <span style={{ fontWeight: 700, color: impact.totalETChange < 0 ? '#10b981' : impact.totalETChange > 0 ? '#ef4444' : 'var(--color-text)' }}>
                          {impact.predictedET.toFixed(3)}s ({impact.totalETChange >= 0 ? '+' : ''}{(impact.totalETChange * 1000).toFixed(0)}ms)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        DA: {impact.densityAltitudeChange >= 0 ? '+' : ''}{impact.densityAltitudeChange}ft
                      </div>
                    </div>
                  );
                })()}
                
                {/* Actual vs Predicted */}
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text)' }}>
                    <span>Actual ET:</span>
                    <span style={{ fontWeight: 600 }}>{baseET.toFixed(3)}s</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.55rem' }}>
                    <span>vs baseline:</span>
                    <span style={{ color: (baseET - comparisonRun.result.et_s) < 0 ? '#10b981' : '#ef4444' }}>
                      {(baseET - comparisonRun.result.et_s) >= 0 ? '+' : ''}{((baseET - comparisonRun.result.et_s) * 1000).toFixed(0)}ms
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Recent Runs - Pro feature for chart overlay comparison */}
            {features.quarterProFields && (
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--color-text)', fontSize: '0.7rem' }}>Saved Runs</div>
                <div style={{ fontSize: '0.65rem', maxHeight: '80px', overflowY: 'auto' }}>
                  {getRecentRuns(5).length === 0 ? (
                    <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No saved runs</div>
                  ) : (
                    getRecentRuns(5).map(run => (
                      <button key={run.id} onClick={() => handleLoadComparison(run)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '3px 5px', marginBottom: '2px',
                          borderRadius: '3px', border: comparisonRun?.id === run.id ? '1px solid #3b82f6' : '1px solid var(--color-border)',
                          backgroundColor: comparisonRun?.id === run.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-bg-secondary)',
                          color: 'var(--color-text)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600 }}>{run.result.et_s.toFixed(3)}s</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{run.result.mph.toFixed(1)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
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
                  <DataLoggerChart 
                    data={simResult.traces as any} 
                    raceLengthFt={RACE_LENGTH_INFO[raceLength]?.lengthFt ?? 1320}
                    distanceMarkers={getDistanceMarkers(raceLength)}
                    comparisonData={comparisonRun?.traces as any}
                    comparisonLabel={comparisonRun ? `${comparisonRun.vehicleName} (${comparisonRun.result.et_s.toFixed(3)}s)` : undefined}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                  No simulation data
                </div>
              )}
            </Suspense>
          </div>
        </div>

        {/* BOTTOM ROW: Environment + What-If/Tools + RPM */}
        <div className="et-sim-bottom-row" style={{ flexWrap: 'wrap', overflow: 'visible', alignItems: 'stretch' }}>
          {/* Environment - Compact horizontal layout */}
          <div className="card" style={{ flex: '0 0 auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative', zIndex: 10 }}>
            {/* Header row with selectors */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '0.75rem' }}>Environment</span>
              <select
                value={raceLength}
                onChange={(e) => handleRaceLengthChange(e.target.value as RaceLength)}
                style={{
                  padding: '2px 6px',
                  fontSize: '0.65rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' 
                    ? 'rgba(139, 92, 246, 0.2)' 
                    : 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <optgroup label="Drag Racing">
                  {allowedRaceLengths
                    .filter(key => RACE_LENGTH_INFO[key].category === 'drag')
                    .map(key => (
                      <option key={key} value={key}>{RACE_LENGTH_INFO[key].label}</option>
                    ))}
                </optgroup>
                {features.trackBonneville && (
                  <optgroup label="Land Speed">
                    {allowedRaceLengths
                      .filter(key => RACE_LENGTH_INFO[key].category === 'landspeed')
                      .map(key => (
                        <option key={key} value={key}>{RACE_LENGTH_INFO[key].label}</option>
                      ))}
                  </optgroup>
                )}
              </select>
              {features.liveWeather ? (
                <>
                  <select
                    value={selectedTrack?.id || ''}
                    onChange={(e) => {
                      const track = getAllTracks().find(t => t.id === e.target.value);
                      if (track) handleFetchWeather(track);
                    }}
                    style={{
                      padding: '2px 4px',
                      fontSize: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      maxWidth: '90px',
                    }}
                    disabled={weatherLoading}
                  >
                    <option value="">Track...</option>
                    {getAllTracks().map(track => (
                      <option key={track.id} value={track.id}>
                        {track.name.length > 12 ? track.name.slice(0, 10) + '...' : track.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleFetchWeather()}
                    disabled={weatherLoading}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text)',
                      cursor: weatherLoading ? 'wait' : 'pointer',
                    }}
                    title="Get weather for your current location"
                  >
                    📍
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '0.6rem', color: 'var(--color-muted)' }}>🔒 Weather</span>
              )}
              {weatherError && <span style={{ fontSize: '0.55rem', color: '#ef4444' }}>{weatherError}</span>}
              {lastWeatherUpdate && !weatherError && (
                <span style={{ fontSize: '0.55rem', color: 'var(--color-muted)' }}>
                  {lastWeatherUpdate.toLocaleTimeString().slice(0, -3)}
                  {selectedTrack && ` • ${selectedTrack.city}`}
                </span>
              )}
            </div>
            <EnvironmentForm value={env} onChange={setEnv} compact />
          </div>

          {/* What-If & Tools - Pro features combined in one card */}
          {features.quarterProFields ? (
            <div className="card" style={{ flex: '0 0 auto', padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                {/* What-If Column */}
                <div style={{ minWidth: '120px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)', fontSize: '0.8rem' }}>What-If</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>HP</span>
                        <span style={{ fontWeight: 600, color: hpAdjust !== 0 ? (hpAdjust > 0 ? '#22c55e' : '#ef4444') : 'var(--color-text)' }}>
                          {hpAdjust >= 0 ? '+' : ''}{hpAdjust}
                        </span>
                      </div>
                      <input type="range" min="-200" max="200" step="10" value={hpAdjust}
                        onChange={(e) => setHpAdjust(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Weight</span>
                        <span style={{ fontWeight: 600, color: weightAdjust !== 0 ? (weightAdjust < 0 ? '#22c55e' : '#ef4444') : 'var(--color-text)' }}>
                          {weightAdjust >= 0 ? '+' : ''}{weightAdjust}
                        </span>
                      </div>
                      <input type="range" min="-500" max="500" step="25" value={weightAdjust}
                        onChange={(e) => setWeightAdjust(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                    {(hpAdjust !== 0 || weightAdjust !== 0) && (
                      <button onClick={() => { setHpAdjust(0); setWeightAdjust(0); }}
                        style={{ padding: '3px 6px', fontSize: '0.65rem', borderRadius: '4px', border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                {/* Divider */}
                <div style={{ width: '1px', backgroundColor: 'var(--color-border)' }} />
                {/* Tools Column */}
                <div style={{ minWidth: '140px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)', fontSize: '0.8rem' }}>Tools</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={() => setShowOptimizer(true)} title="Optimize gear/converter"
                      style={{ padding: '6px 10px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--color-accent)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}>
                      ⚡ Optimize
                    </button>
                    {/* Throttle Stop */}
                    <div style={{ fontSize: '0.7rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '6px' }}>
                        <input type="checkbox" checked={throttleStopEnabled} onChange={(e) => setThrottleStopEnabled(e.target.checked)} />
                        <span style={{ color: throttleStopEnabled ? '#f59e0b' : 'var(--color-text-muted)' }}>Throttle Stop</span>
                      </label>
                      {throttleStopEnabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', alignItems: 'center', fontSize: '0.65rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Activate</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="number" min="0" max="15" step="0.1" value={throttleStopActivate}
                              onChange={(e) => setThrottleStopActivate(Number(e.target.value) || 0)}
                              style={{ width: '50px', padding: '2px 4px', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', textAlign: 'center' }} />
                            <span>sec</span>
                          </div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Duration</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="number" min="0" max="10" step="0.1" value={throttleStopDuration}
                              onChange={(e) => setThrottleStopDuration(Number(e.target.value) || 0)}
                              style={{ width: '50px', padding: '2px 4px', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text)', textAlign: 'center' }} />
                            <span>sec</span>
                          </div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Throttle</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <input type="number" min="0" max="100" step="5" value={throttleStopPct}
                              onChange={(e) => setThrottleStopPct(Number(e.target.value) || 0)}
                              style={{ width: '50px', padding: '2px 4px', fontSize: '0.65rem', borderRadius: '3px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', color: '#f59e0b', textAlign: 'center', fontWeight: 600 }} />
                            <span>%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Non-Pro: Show locked placeholder */
            <div className="card" style={{ flex: '0 0 auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{ fontSize: '1.5rem' }}>🔒</div>
              <div style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '0.8rem' }}>What-If & Tools</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', textAlign: 'center' }}>Upgrade to Pro</div>
            </div>
          )}

          {/* RPM Distribution - fills remaining space */}
          <div className="card" style={{ flex: '1 1 200px', padding: '12px 16px', minWidth: '180px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: '6px' }}>RPM Distribution</div>
            <Suspense fallback={null}>
              {simResult?.traces && simResult.traces.length > 0 ? (
                <div style={{ flex: 1, minHeight: '100px' }}>
                  <RPMHistogram data={simResult.traces as any} compact />
                </div>
              ) : (
                <div style={{ flex: 1, minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                  Run simulation to see RPM data
                </div>
              )}
            </Suspense>
          </div>
        </div>
        
        {/* Debug Panel - Only visible to owners/admins */}
        <DebugPanel data={debugData} title="Simulation Debug Info" />
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
      
      {/* Optimizer Modal */}
      <Suspense fallback={null}>
        {vehicle && env && (
          <OptimizerModal
            vehicle={vehicle}
            env={env}
            raceLength={raceLength}
            isOpen={showOptimizer}
            onClose={() => setShowOptimizer(false)}
            onApplyToSession={(optimizedVehicle: Vehicle) => {
              setVehicle(optimizedVehicle);
            }}
          />
        )}
      </Suspense>
      
      {/* Detailed Parameters Modal */}
      <Suspense fallback={null}>
        {simResult?.traces && (
          <DetailedParametersModal
            isOpen={showDetailedParams}
            onClose={() => setShowDetailedParams(false)}
            traces={simResult.traces as any}
            raceLengthFt={RACE_LENGTH_INFO[raceLength]?.lengthFt ?? 1320}
            vehicleName={vehicle?.name}
            et={simResult.et_s}
            mph={simResult.mph}
          />
        )}
      </Suspense>
      
      {/* Vehicle Editor Popup */}
      <Suspense fallback={null}>
        <VehicleEditorPopup
          isOpen={showVehicleEditor}
          onClose={() => setShowVehicleEditor(false)}
          vehicle={vehicle}
          onApply={(updatedVehicle) => {
            setVehicle(updatedVehicle);
            // Also update throttle stop settings if changed
            if (updatedVehicle.throttleStopEnabled) {
              setThrottleStopEnabled(true);
              setThrottleStopActivate(updatedVehicle.throttleStopDelay ?? 1.0);
              setThrottleStopDuration(updatedVehicle.throttleStopDuration ?? 1.5);
              setThrottleStopPct(updatedVehicle.throttleStopPct ?? 30);
            } else {
              setThrottleStopEnabled(false);
            }
          }}
        />
      </Suspense>
    </Page>
  );
}

export default Predict;
