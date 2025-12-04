import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import EnvironmentForm from '../shared/components/EnvironmentForm';
import { simulate } from '../workerBridge';
import { DEFAULT_ENV } from '../domain/schemas/env.schema';
import type { Vehicle } from '../domain/schemas/vehicle.schema';
import type { RaceLength } from '../domain/config/raceLengths';
import type { Env } from '../domain/schemas/env.schema';
import type { SimResult } from '../domain/physics';
import { useVb6Fixture } from '../shared/state/vb6FixtureStore';
import { assertComplete, fixtureToSimInputs } from '../domain/physics/vb6/fixtures';
import { useFlag, useFlagsStore } from '../domain/flags/store.tsx';
import VB6Inputs from './VB6Inputs';
import { fromVehicleToVB6Fixture } from '../dev/vb6/fromVehicle';

// Lazy load charts
const DataLoggerChart = lazy(() => import('../shared/components/charts/DataLoggerChart'));
const RPMHistogram = lazy(() => import('../shared/components/charts/RPMHistogram'));

interface LocationState {
  vehicle: Vehicle;
  raceLength: RaceLength;
}

function Predict() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [env, setEnv] = useState<Env | null>(null);
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  // Always use VB6Exact - works for both QuarterPro (full HP curve) and QuarterJr (peak HP/RPM)
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVb6Panel, setShowVb6Panel] = useState(false);
  const { fixture } = useVb6Fixture();
  const strictMode = useFlag('vb6StrictMode');
  
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

  // Initialize from location state
  useEffect(() => {
    const state = location.state as LocationState | null;

    // Redirect if no state
    if (!state || !state.vehicle || !state.raceLength) {
      navigate('/');
      return;
    }

    setVehicle(state.vehicle);
    setRaceLength(state.raceLength);
    setEnv(DEFAULT_ENV);
  }, [location.state, navigate]);

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
        // Convert standard vehicle to VB6 fixture format
        // This will use synthetic HP curve if no full curve is available (QuarterJr mode)
        const vb6Fixture = fromVehicleToVB6Fixture(currentVehicle as any);
        const simInputs = fixtureToSimInputs(vb6Fixture, raceLength);
        // Override with UI environment settings
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
        console.log('[Predict] VB6Exact - converted vehicle to fixture', simInputs);
        
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
  }, [vehicle, env, raceLength, strictMode, fixture]);

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
  const modelName = simResult.meta.model;

  const handleRaceLengthChange = (newLength: RaceLength) => {
    setRaceLength(newLength);
  };

  return (
    <Page
      title="Prediction Results"
      actions={
        <Link to="/" className="link" style={{ fontSize: '0.9rem' }}>
          ← Back to Home
        </Link>
      }
    >
      <p className="text-muted mb-6">
        {vehicle.name} • Model: {modelName}
      </p>

      {/* Simulation Settings */}
      <div className="card mb-6">
        <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
          Simulation Settings
        </h2>
        
        {/* VB6 Strict Mode Toggle */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(e) => setFlag('vb6StrictMode', e.target.checked)}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
              VB6 Strict Mode
            </span>
          </label>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 'var(--space-1)', marginLeft: 'var(--space-5)' }}>
            {strictMode ? 
              '✓ Simulation will use ONLY VB6 fixture inputs (no defaults, no heuristics)' :
              'Use standard vehicle inputs with automatic conversions'
            }
          </div>
          {strictMode && (
            <>
              <button
                onClick={() => setShowVb6Panel(true)}
                style={{
                  marginTop: 'var(--space-2)',
                  marginLeft: 'var(--space-5)',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                Configure VB6 Inputs →
              </button>
              {!isFixtureComplete && (
                <div style={{ 
                  marginTop: 'var(--space-3)', 
                  marginLeft: 'var(--space-5)',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-warning-bg, #fff3cd)',
                  border: '1px solid var(--color-warning, #ffc107)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}>
                  <strong>⚠️ Fixture not configured</strong>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-text)' }}>
                    Click "Configure VB6 Inputs" above and load a fixture (e.g., "Load ProStock_Pro") to run the simulation.
                  </p>
                </div>
              )}
            </>
          )}
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
          backgroundColor: 'white',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
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

      {/* Environment Panel */}
      <div className="card mb-6">
        <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
          Environment
        </h2>
        <EnvironmentForm value={env} onChange={setEnv} />
      </div>

      {/* Race Length Control */}
      <div className="card mb-6">
        <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
          Race Length
        </h2>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="raceLength"
              value="EIGHTH"
              checked={raceLength === 'EIGHTH'}
              onChange={(e) => handleRaceLengthChange(e.target.value as RaceLength)}
            />
            <span>1/8 Mile (660 ft)</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="raceLength"
              value="QUARTER"
              checked={raceLength === 'QUARTER'}
              onChange={(e) => handleRaceLengthChange(e.target.value as RaceLength)}
            />
            <span>1/4 Mile (1320 ft)</span>
          </label>
        </div>
      </div>

      {/* Results header with updating indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text)', margin: 0 }}>Results</h2>
        {(isDebouncing || loading) && (
          <span style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-accent)', 
            fontStyle: 'italic',
            animation: 'pulse 1s ease-in-out infinite',
          }}>
            updating...
          </span>
        )}
      </div>

      <div className="grid grid-auto-fit mb-6" style={{ opacity: (isDebouncing || loading) ? 0.7 : 1, transition: 'opacity 0.2s' }}>
        <div className="card card-compact">
          <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: 'var(--space-2)' }}>
            Base ET
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
            {baseET.toFixed(3)}
            <span style={{ fontSize: '1rem', fontWeight: 'normal', marginLeft: 'var(--space-1)' }}>
              s
            </span>
          </div>
        </div>

        <div className="card card-compact">
          <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: 'var(--space-2)' }}>
            Trap Speed
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
            {baseMPH.toFixed(2)}
            <span style={{ fontSize: '1rem', fontWeight: 'normal', marginLeft: 'var(--space-1)' }}>
              mph
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>Timeslip</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Distance (ft)</th>
                <th className="align-right">Time (s)</th>
                <th className="align-right">Speed (mph)</th>
              </tr>
            </thead>
            <tbody>
              {timeslip.map((split) => (
                <tr key={split.d_ft}>
                  <td>{split.d_ft}</td>
                  <td className="align-right mono">{split.t_s.toFixed(3)}</td>
                  <td className="align-right mono">{split.v_mph.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
          Performance Charts
        </h2>
        <Suspense fallback={<div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>Loading charts...</div>}>
          {/* Data Logger Chart - full width */}
          {simResult?.traces && simResult.traces.length > 0 && (
            <div className="card card-compact mb-4">
              <h3 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text)' }}>
                Data Logger
              </h3>
              <DataLoggerChart data={simResult.traces as any} raceLengthFt={raceLength === 'EIGHTH' ? 660 : 1320} />
            </div>
          )}
          
          {/* RPM Histogram */}
          {simResult?.traces && simResult.traces.length > 0 && (
            <div className="card card-compact">
              <h3 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text)' }}>
                Engine RPM Distribution
              </h3>
              <RPMHistogram data={simResult.traces as any} />
            </div>
          )}
        </Suspense>
      </div>

      <div className="text-center">
        <Link to="/" className="btn">
          Run Another Prediction
        </Link>
      </div>
    </Page>
  );
}

export default Predict;
