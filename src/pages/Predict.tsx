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
      title="ET Simulation"
      wide
      actions={
        <Link to="/" className="link" style={{ fontSize: '0.9rem' }}>
          ← Back to Home
        </Link>
      }
    >
      <style>{`
        .et-sim-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          height: calc(100vh - 160px);
          min-height: 400px;
        }
        .et-sim-top-row {
          display: flex;
          gap: var(--space-3);
          flex-shrink: 0;
        }
        .et-sim-chart-area {
          flex: 1;
          min-height: 250px;
          display: flex;
          flex-direction: column;
        }
        .et-sim-chart-area > div {
          flex: 1;
        }
        .et-slip {
          font-family: 'Courier New', monospace;
          background: linear-gradient(180deg, #f8f8f0 0%, #e8e8d8 100%);
          color: #1a1a1a;
          padding: 10px 14px;
          border-radius: 4px;
          font-size: 11px;
          line-height: 1.3;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          width: 180px;
          flex-shrink: 0;
        }
        .et-slip-header {
          text-align: center;
          border-bottom: 1px dashed #666;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .et-slip-row {
          display: flex;
          justify-content: space-between;
        }
        .et-slip-label {
          color: #444;
        }
        .et-slip-value {
          font-weight: bold;
          text-align: right;
        }
        .et-slip-final {
          border-top: 1px solid #333;
          margin-top: 4px;
          padding-top: 4px;
          font-size: 13px;
          font-weight: bold;
        }
        .et-sim-controls {
          width: 280px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .et-sim-rpm-area {
          flex: 1;
          min-width: 200px;
        }
      `}</style>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
          {vehicle.name} • {modelName}
        </span>
        {(isDebouncing || loading) && (
          <span style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-accent)', 
            fontStyle: 'italic',
          }}>
            updating...
          </span>
        )}
      </div>

      <div className="et-sim-dashboard">
        {/* TOP ROW: ET Slip + Controls + RPM Histogram */}
        <div className="et-sim-top-row">
          {/* ET Slip Style Results */}
          <div className="et-slip" style={{ opacity: (isDebouncing || loading) ? 0.7 : 1 }}>
            <div className="et-slip-header">
              <div style={{ fontWeight: 'bold', fontSize: '10px' }}>{vehicle.name}</div>
              <div style={{ fontSize: '9px', color: '#666' }}>{raceLength === 'EIGHTH' ? '1/8 MILE' : '1/4 MILE'}</div>
            </div>
            
            {/* Splits - show 60', 330', 660' for 1/8; add 1/8 MPH, 1000' for 1/4 */}
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
            
            {/* Final ET/MPH */}
            <div className="et-slip-final">
              <div className="et-slip-row">
                <span>ET</span>
                <span>{baseET.toFixed(3)}</span>
              </div>
              <div className="et-slip-row">
                <span>MPH</span>
                <span>{baseMPH.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Controls Column */}
          <div className="et-sim-controls">
            {/* Environment - compact */}
            <div className="card" style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '0.75rem' }}>
              <div style={{ fontWeight: '600', marginBottom: 'var(--space-1)', color: 'var(--color-text)' }}>Environment</div>
              <EnvironmentForm value={env} onChange={setEnv} compact />
            </div>

            {/* Race Length - inline */}
            <div className="card" style={{ padding: 'var(--space-2) var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>Race:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="radio" name="raceLength" value="EIGHTH" checked={raceLength === 'EIGHTH'} onChange={(e) => handleRaceLengthChange(e.target.value as RaceLength)} />
                  <span>1/8</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="radio" name="raceLength" value="QUARTER" checked={raceLength === 'QUARTER'} onChange={(e) => handleRaceLengthChange(e.target.value as RaceLength)} />
                  <span>1/4</span>
                </label>
              </div>
            </div>

            {/* Advanced - collapsed */}
            <details className="card" style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '0.75rem' }}>
              <summary style={{ fontWeight: '600', cursor: 'pointer', color: 'var(--color-text)' }}>Advanced</summary>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={strictMode} onChange={(e) => setFlag('vb6StrictMode', e.target.checked)} />
                  <span>VB6 Strict</span>
                </label>
                {strictMode && (
                  <button onClick={() => setShowVb6Panel(true)} className="btn" style={{ marginTop: 'var(--space-2)', padding: '4px 8px', fontSize: '0.7rem', width: '100%' }}>
                    VB6 Inputs
                  </button>
                )}
              </div>
            </details>
          </div>

          {/* RPM Histogram - compact in remaining space */}
          <div className="et-sim-rpm-area card" style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>RPM Distribution</div>
            <Suspense fallback={<div className="text-muted" style={{ fontSize: '0.75rem' }}>Loading...</div>}>
              {simResult?.traces && simResult.traces.length > 0 && (
                <div style={{ flex: 1, minHeight: '60px' }}>
                  <RPMHistogram data={simResult.traces as any} compact />
                </div>
              )}
            </Suspense>
          </div>
        </div>

        {/* MAIN CHART AREA */}
        <div className="et-sim-chart-area card" style={{ padding: 'var(--space-3)' }}>
          <Suspense fallback={<div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>Loading chart...</div>}>
            {simResult?.traces && simResult.traces.length > 0 && (
              <div style={{ height: '100%', width: '100%' }}>
                <DataLoggerChart data={simResult.traces as any} raceLengthFt={raceLength === 'EIGHTH' ? 660 : 1320} />
              </div>
            )}
          </Suspense>
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
