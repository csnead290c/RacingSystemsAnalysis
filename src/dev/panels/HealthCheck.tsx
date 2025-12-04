/**
 * Health Check Panel
 * 
 * Quick validation and testing tools for VB6 fixtures.
 */

import { useState } from 'react';
import { useVb6Fixture } from '../../shared/state/vb6FixtureStore';
import { validateVB6Fixture } from '../validation/vb6Fixture';
import { simulate } from '../../workerBridge';

export default function HealthCheck() {
  const { fixture } = useVb6Fixture();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [smokeResult, setSmokeResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = () => {
    setLoading('validate');
    setError(null);
    try {
      const result = validateVB6Fixture(fixture as any);
      setValidationResult(result);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(null);
    }
  };

  const handleDryRun = async () => {
    setLoading('dryrun');
    setError(null);
    setDryRunResult(null);
    try {
      // TODO: Add dryRun flag support to worker
      // For now, just validate the fixture can be normalized
      const result = validateVB6Fixture(fixture as any);
      setDryRunResult({
        ok: result.ok,
        message: result.ok 
          ? 'Fixture can be normalized successfully' 
          : `Missing fields: ${result.missing.join(', ')}`,
        details: result
      });
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(null);
    }
  };

  const handleSmokeSim = async () => {
    setLoading('smoke');
    setError(null);
    setSmokeResult(null);
    try {
      // Run a quick simulation with VB6Exact
      const result = await simulate('VB6Exact', {
        ...fixture,
        raceLengthFt: 1320,
      });
      setSmokeResult({
        et_s: result.et_s,
        mph: result.mph,
        model: result.meta?.model,
        steps: result.meta?.termination?.steps,
      });
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Health Check</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Quick validation and testing tools for VB6 fixtures.
        </p>
      </div>

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

      {/* Action Buttons */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <button
          onClick={handleValidate}
          disabled={loading !== null}
          style={{
            padding: '1rem',
            fontSize: '1rem',
            fontWeight: 500,
            backgroundColor: loading === 'validate' ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {loading === 'validate' ? 'Validating...' : 'Validate Current VB6 Fixture'}
        </button>

        <button
          onClick={handleDryRun}
          disabled={loading !== null}
          style={{
            padding: '1rem',
            fontSize: '1rem',
            fontWeight: 500,
            backgroundColor: loading === 'dryrun' ? '#9ca3af' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {loading === 'dryrun' ? 'Running...' : 'Normalize & Dry-Run'}
        </button>

        <button
          onClick={handleSmokeSim}
          disabled={loading !== null}
          style={{
            padding: '1rem',
            fontSize: '1rem',
            fontWeight: 500,
            backgroundColor: loading === 'smoke' ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {loading === 'smoke' ? 'Running...' : 'Smoke Sim (1320 ft)'}
        </button>
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: validationResult.ok ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${validationResult.ok ? '#22c55e' : '#ef4444'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>
            Validation Result
          </h3>
          {validationResult.ok ? (
            <p style={{ margin: 0, color: '#166534' }}>
              ✅ Fixture is valid and complete
            </p>
          ) : (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontWeight: 500 }}>
                ❌ Fixture is incomplete
              </p>
              <p style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '0.875rem' }}>
                Missing fields:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#991b1b' }}>
                {validationResult.missing.map((field: string) => (
                  <li key={field} style={{ fontSize: '0.875rem' }}>{field}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Dry-Run Result */}
      {dryRunResult && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: dryRunResult.ok ? '#dbeafe' : '#fee2e2',
            border: `1px solid ${dryRunResult.ok ? '#3b82f6' : '#ef4444'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>
            Dry-Run Result
          </h3>
          <p style={{ margin: 0, color: dryRunResult.ok ? '#1e40af' : '#991b1b' }}>
            {dryRunResult.ok ? '✅' : '❌'} {dryRunResult.message}
          </p>
        </div>
      )}

      {/* Smoke Test Result */}
      {smokeResult && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#dcfce7',
            border: '1px solid #22c55e',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>
            Smoke Test Result
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.25rem' }}>
                ET (s)
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>
                {smokeResult.et_s?.toFixed(3) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.25rem' }}>
                MPH
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>
                {smokeResult.mph?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.25rem' }}>
                Model
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '500', color: '#166534' }}>
                {smokeResult.model ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginBottom: '0.25rem' }}>
                Steps
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '500', color: '#166534' }}>
                {smokeResult.steps ?? 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #3b82f6',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>
          About These Tests
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Validate:</strong> Checks if all required VB6 fixture fields are present
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>Dry-Run:</strong> Validates that the fixture can be normalized (no actual simulation)
          </li>
          <li>
            <strong>Smoke Sim:</strong> Runs a quick 1320 ft simulation to verify the fixture works end-to-end
          </li>
        </ul>
      </div>
    </div>
  );
}
