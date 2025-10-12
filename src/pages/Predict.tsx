import { useEffect, useState, lazy, Suspense } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import EnvironmentForm from '../shared/components/EnvironmentForm';
import { simulate } from '../workerBridge';
import { DEFAULT_ENV } from '../domain/schemas/env.schema';
import type { Vehicle } from '../domain/schemas/vehicle.schema';
import type { RaceLength } from '../domain/config/raceLengths';
import type { Env } from '../domain/schemas/env.schema';
import { type PhysicsModelId, type SimResult } from '../domain/physics';
import { useVb6Fixture } from '../shared/state/vb6FixtureStore';
import { assertComplete, Vb6FixtureValidationError } from '../domain/physics/vb6/fixtures';
import VB6Inputs from './VB6Inputs';

// Lazy load charts
const TimeslipChart = lazy(() => import('../shared/components/charts/TimeslipChart'));
const SpeedChart = lazy(() => import('../shared/components/charts/SpeedChart'));

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
  const [selectedModel, setSelectedModel] = useState<PhysicsModelId>('SimpleV1');
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVb6Panel, setShowVb6Panel] = useState(false);
  const { fixture, strictMode, setStrictMode } = useVb6Fixture();

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

  // Run simulation when vehicle, env, raceLength, or model changes
  useEffect(() => {
    if (!vehicle || !env) return;

    setLoading(true);
    setError(null);

    // VB6 Strict Mode: Validate fixture before running
    if (strictMode) {
      try {
        assertComplete(fixture);
        // TODO: Convert fixture to vehicle/env format for simulation
        // For now, show error that strict mode requires implementation
        setError('VB6 Strict Mode is enabled but fixture-to-simulation conversion is not yet implemented. Please disable strict mode to run simulations.');
        setLoading(false);
        return;
      } catch (err) {
        if (err instanceof Vb6FixtureValidationError) {
          setError(`VB6 Strict Mode validation failed:\n\n${err.message}\n\nPlease configure all required VB6 inputs or disable strict mode.`);
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
        setLoading(false);
        return;
      }
    }

    // Use worker for all models
    simulate(selectedModel, {
      vehicle: vehicle,
      env: env,
      raceLength: raceLength,
    })
      .then((result) => {
        setSimResult(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [vehicle, env, raceLength, selectedModel, strictMode, fixture]);

  if (loading) {
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

  if (!vehicle || !env || !simResult) {
    return null;
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

      {/* Model Selector */}
      <div className="card mb-6">
        <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
          Physics Model
        </h2>
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <label htmlFor="model-select" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
            Select physics engine:
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as PhysicsModelId)}
            style={{
              width: '100%',
              padding: 'var(--space-2)',
              fontSize: '1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)',
            }}
          >
            <option value="SimpleV1">SimpleV1 (Current Baseline)</option>
            <option value="RSACLASSIC">RSACLASSIC (Advanced Physics)</option>
            <option value="Blend" disabled={!vehicle?.id} title={!vehicle?.id ? 'Requires saved vehicle with learning data' : ''}>
              Blend (RSACLASSIC + Learning)
            </option>
          </select>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          {selectedModel === 'SimpleV1' && 'Simplified physics model with basic corrections'}
          {selectedModel === 'RSACLASSIC' && 'Advanced physics with detailed engine, drivetrain, and aerodynamics modeling'}
          {selectedModel === 'Blend' && 'RSACLASSIC physics with learned corrections from your logged runs'}
        </div>
        {selectedModel === 'Blend' && !vehicle?.id && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: 'var(--space-2)' }}>
            ⚠️ Blend model requires a saved vehicle. Please select a vehicle from the Vehicles page.
          </div>
        )}
        
        {/* VB6 Strict Mode Toggle */}
        <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
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
        <EnvironmentForm value={env} onChange={() => {}} compact disabled />
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

      <div className="grid grid-auto-fit mb-6">
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
          <div className="grid grid-2 gap-4">
            <div className="card card-compact">
              <h3 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text)' }}>
                Elapsed Time
              </h3>
              <TimeslipChart data={timeslip} />
            </div>
            <div className="card card-compact">
              <h3 className="mb-3" style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-text)' }}>
                Speed Profile
              </h3>
              <SpeedChart data={timeslip} />
            </div>
          </div>
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
