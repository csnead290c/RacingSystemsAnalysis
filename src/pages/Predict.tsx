import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import EnvironmentForm from '../shared/components/EnvironmentForm';
import { simulate } from '../workerBridge';
import { DEFAULT_ENV } from '../domain/schemas/env.schema';
import type { Vehicle } from '../domain/schemas/vehicle.schema';
import { type RaceLength, RACE_LENGTH_INFO } from '../domain/config/raceLengths';
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

  const handleRaceLengthChange = (newLength: RaceLength) => {
    setRaceLength(newLength);
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
          }
          .et-sim-top-row {
            flex-direction: column;
            min-height: auto;
          }
          .et-slip {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
          }
          .et-slip-header {
            width: 100%;
            border-bottom: 1px dashed #666;
          }
          .et-slip-final {
            margin-top: 0;
            border-top: none;
            border-left: 1px solid #333;
            padding-left: 12px;
            padding-top: 0;
          }
          .et-slip-vehicle {
            width: 100%;
            border-top: 1px dashed #666;
            margin-top: 0;
          }
          .et-sim-chart-area {
            min-height: 300px;
          }
          .et-sim-bottom-row {
            flex-direction: column;
            height: auto;
            gap: var(--space-2);
          }
          .et-sim-bottom-row > * {
            width: 100% !important;
          }
        }
      `}</style>

      <div className="et-sim-dashboard">
        {/* TOP ROW: ET Slip + Data Logger Chart */}
        <div className="et-sim-top-row">
          {/* ET Slip Style Results */}
          <div className="et-slip" style={{ opacity: (isDebouncing || loading) ? 0.7 : 1 }}>
            <div className="et-slip-header">
              <img src="/rsa-icon.png" alt="RSA" style={{ height: '38px', marginBottom: '6px' }} />
              <div style={{ fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.5px' }}>
                {RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? 'Bonneville Pro' : raceLength === 'QUARTER' ? 'Quarter Pro' : 'Quarter Jr'}
              </div>
              <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            <div className="et-slip-row" style={{ marginTop: '4px', borderTop: '1px solid #999', paddingTop: '4px' }}>
              <span className="et-slip-label">{RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? 'Time' : 'ET'}</span>
              <span className="et-slip-value" style={{ fontSize: '13px' }}>{baseET.toFixed(3)}</span>
            </div>
            <div className="et-slip-row">
              <span className="et-slip-label">{RACE_LENGTH_INFO[raceLength]?.category === 'landspeed' ? 'Top Speed' : 'MPH'}</span>
              <span className="et-slip-value" style={{ fontSize: '13px' }}>{baseMPH.toFixed(2)}</span>
            </div>
            
            {/* Vehicle info at bottom */}
            <div className="et-slip-vehicle">
              Vehicle: {vehicle.name}
            </div>
          </div>

          {/* Data Logger Chart */}
          <div className="et-sim-chart-area card" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column' }}>
            {(isDebouncing || loading) && (
              <div style={{ position: 'absolute', top: '6px', right: '10px', fontSize: '0.7rem', color: 'var(--color-accent)', fontStyle: 'italic', zIndex: 10 }}>
                updating...
              </div>
            )}
            <Suspense fallback={<div className="text-center text-muted" style={{ padding: 'var(--space-4)' }}>Loading chart...</div>}>
              {simResult?.traces && simResult.traces.length > 0 && (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <DataLoggerChart data={simResult.traces as any} raceLengthFt={RACE_LENGTH_INFO[raceLength]?.lengthFt ?? 1320} />
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
            <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text)', fontSize: '0.8rem' }}>Environment</div>
            <EnvironmentForm value={env} onChange={setEnv} compact />
          </div>

          {/* Race Length */}
          <div className="card" style={{ width: '130px', flexShrink: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
