/**
 * Run Inspector & Steps Panel
 * 
 * Run simulations with VB6 fixtures and inspect detailed step-by-step data.
 * Displays the consolidated 12-step table with all physics values.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVb6Fixture } from '../../shared/state/vb6FixtureStore';
import { useFlag } from '../../domain/flags/store.tsx';
import { validateVB6Fixture } from '../validation/vb6Fixture';
import { buildInputFromUiFixture } from '../../domain/physics/vb6/uiMapper';
import { simulate } from '../../workerBridge';
import type { PhysicsModelId, SimResult } from '../../domain/physics';
import type { RaceLength } from '../../domain/config/raceLengths';

interface StepData {
  step: number;
  v_ftps: number;
  EngRPM: number;
  wheelRPM: number;
  ClutchSlip: number;
  HPSave: number;
  HPEngPMI: number;
  HPChasPMI: number;
  DragHP: number;
  HP_afterL1: number;
  HP_afterL2: number;
  PQWT: number;
  AMin: number;
  AMax: number;
  AGS_applied: number;
  Vel_next: number;
  Dist_next: number;
}

export default function RunInspector() {
  const navigate = useNavigate();
  const { fixture } = useVb6Fixture();
  const enableStepTrace = useFlag('enableStepTrace');
  
  const [selectedModel, setSelectedModel] = useState<PhysicsModelId>('RSACLASSIC');
  const [raceLength, setRaceLength] = useState<RaceLength>('QUARTER');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [stepData, setStepData] = useState<StepData[]>([]);

  // Validate fixture
  const validation = validateVB6Fixture(fixture as any);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setStepData([]);

    try {
      // Build simulation input
      const input = buildInputFromUiFixture(fixture as any);
      input.raceLength = raceLength;
      
      // TODO: Capture step data from console logs
      // For now, we'll just run the simulation and get the result
      // In the future, we need to hook into the logger or pass a callback
      
      const simResult = await simulate(selectedModel, input);
      setResult(simResult);
      
      // Parse step data from console if available
      // This is a placeholder - in production, we'd need a proper hook
      setStepData([]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const handleDownloadCsv = () => {
    if (stepData.length === 0) {
      alert('No step data available to download');
      return;
    }

    // Build CSV
    const headers = [
      'step', 'v_ftps', 'EngRPM', 'wheelRPM', 'ClutchSlip',
      'HPSave', 'HPEngPMI', 'HPChasPMI', 'DragHP',
      'HP_afterL1', 'HP_afterL2', 'PQWT',
      'AMin', 'AMax', 'AGS_applied',
      'Vel_next', 'Dist_next'
    ];
    
    const rows = stepData.map(row => [
      row.step,
      row.v_ftps,
      row.EngRPM,
      row.wheelRPM,
      row.ClutchSlip,
      row.HPSave,
      row.HPEngPMI,
      row.HPChasPMI,
      row.DragHP,
      row.HP_afterL1,
      row.HP_afterL2,
      row.PQWT,
      row.AMin,
      row.AMax,
      row.AGS_applied,
      row.Vel_next,
      row.Dist_next,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `run-inspector-${selectedModel}-${raceLength}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Run Inspector & Steps</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Run simulations with VB6 fixtures and inspect detailed step-by-step physics data.
        </p>
      </div>

      {/* VB6 Fixture Validation Error */}
      {!validation.ok && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: '#991b1b', fontSize: '0.875rem' }}>
              ⚠️ VB6 Fixture Incomplete
            </strong>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.75rem' }}>
            Missing required fields:
          </div>
          <ul style={{ margin: '0 0 0.75rem 1.5rem', padding: 0, fontSize: '0.875rem', color: '#991b1b' }}>
            {validation.missing.map((field, idx) => (
              <li key={idx}><code>{field}</code></li>
            ))}
          </ul>
          <button
            onClick={() => navigate('/vb6')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Open VB6 Inputs
          </button>
        </div>
      )}

      {/* Step Trace Flag Warning */}
      {!enableStepTrace && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
            <strong>💡 Hint:</strong> Enable <code>enableStepTrace</code> flag in the Feature Flags panel
            to capture detailed step data during simulation runs.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
          Controls
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          {/* Model Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as PhysicsModelId)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
              }}
            >
              <option value="SimpleV1">SimpleV1</option>
              <option value="RSACLASSIC">RSACLASSIC</option>
              <option value="Blend">Blend</option>
            </select>
          </div>

          {/* Distance Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Distance
            </label>
            <select
              value={raceLength}
              onChange={(e) => setRaceLength(e.target.value as RaceLength)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
              }}
            >
              <option value="EIGHTH">EIGHTH (660 ft)</option>
              <option value="QUARTER">QUARTER (1320 ft)</option>
            </select>
          </div>

          {/* Run Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleRun}
              disabled={running || !validation.ok}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: (running || !validation.ok) ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: (running || !validation.ok) ? 'not-allowed' : 'pointer',
              }}
            >
              {running ? 'Running...' : 'Run with current VB6 UI Fixture'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
            Results
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                ET (s)
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {result.et_s.toFixed(3)}
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                MPH
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {result.mph.toFixed(2)}
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                Model
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                {result.meta.model}
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
                Termination
              </div>
              <div style={{ fontSize: '0.875rem' }}>
                {result.meta.termination?.reason || 'DISTANCE'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* First 12 Steps Table */}
      {stepData.length > 0 && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
              First 12 Steps
            </h3>
            <button
              onClick={handleDownloadCsv}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Download CSV
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                fontSize: '0.75rem',
                borderCollapse: 'collapse',
                fontFamily: 'monospace',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#e2e8f0' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Step</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>v_ftps</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>EngRPM</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>wheelRPM</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>ClutchSlip</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>HPSave</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>HPEngPMI</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>HPChasPMI</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>DragHP</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>HP_L1</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>HP_L2</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>PQWT</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>AMin</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>AMax</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>AGS</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Vel_next</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Dist_next</th>
                </tr>
              </thead>
              <tbody>
                {stepData.map((row, idx) => (
                  <tr
                    key={row.step}
                    style={{
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>{row.step}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.v_ftps.toFixed(3)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.EngRPM.toFixed(0)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.wheelRPM.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.ClutchSlip.toFixed(4)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.HPSave.toFixed(1)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.HPEngPMI.toFixed(1)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.HPChasPMI.toFixed(1)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.DragHP.toFixed(2)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.HP_afterL1.toFixed(1)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.HP_afterL2.toFixed(1)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.PQWT.toFixed(1)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.AMin.toFixed(3)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.AMax.toFixed(3)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.AGS_applied.toFixed(3)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.Vel_next.toFixed(3)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{row.Dist_next.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Placeholder when no step data */}
      {result && stepData.length === 0 && (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-muted)',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Step data capture not yet implemented. Enable <code>enableStepTrace</code> flag
            and implement step data collection hook in rsaclassic.ts.
          </p>
        </div>
      )}
    </div>
  );
}
