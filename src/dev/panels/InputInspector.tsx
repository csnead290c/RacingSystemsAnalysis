/**
 * Input Inspector Panel
 * 
 * Visualize and compare VB6 fixtures and simulation inputs.
 * Inspect, validate, and diff fixtures without altering values.
 */

import { useState } from 'react';
import { useVb6Fixture } from '../../shared/state/vb6FixtureStore';
import { assertComplete, Vb6FixtureValidationError } from '../../domain/physics/vb6/fixtures';
import { buildInputFromUiFixture, type SimulationInput } from '../../domain/physics/vb6/uiMapper';
import { VB6_PROSTOCK_PRO } from '../../domain/physics/fixtures/vb6-prostock-pro';

// Available code fixtures for comparison
const CODE_FIXTURES = {
  ProStock_Pro: VB6_PROSTOCK_PRO,
};

type FixtureName = keyof typeof CODE_FIXTURES;

export default function InputInspector() {
  const { fixture, setFixture } = useVb6Fixture();
  const [fixtureJson, setFixtureJson] = useState(JSON.stringify(fixture, null, 2));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [simulationInput, setSimulationInput] = useState<SimulationInput | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<FixtureName>('ProStock_Pro');
  const [diffResult, setDiffResult] = useState<string | null>(null);

  const handleValidate = () => {
    try {
      const parsed = JSON.parse(fixtureJson);
      assertComplete(parsed);
      setValidationError(null);
      alert('✓ Fixture is valid and complete!');
    } catch (err) {
      if (err instanceof Vb6FixtureValidationError) {
        setValidationError(err.message);
      } else if (err instanceof SyntaxError) {
        setValidationError(`JSON Syntax Error: ${err.message}`);
      } else {
        setValidationError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleApplyToUi = () => {
    try {
      const parsed = JSON.parse(fixtureJson);
      setFixture(parsed);
      setValidationError(null);
      alert('✓ Applied to UI fixture store!');
    } catch (err) {
      if (err instanceof SyntaxError) {
        setValidationError(`JSON Syntax Error: ${err.message}`);
      } else {
        setValidationError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleBuildInput = () => {
    try {
      const parsed = JSON.parse(fixtureJson);
      assertComplete(parsed);
      const input = buildInputFromUiFixture(parsed);
      setSimulationInput(input);
      setValidationError(null);
    } catch (err) {
      if (err instanceof Vb6FixtureValidationError) {
        setValidationError(err.message);
        setSimulationInput(null);
      } else if (err instanceof SyntaxError) {
        setValidationError(`JSON Syntax Error: ${err.message}`);
      } else {
        setValidationError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleCopyInput = () => {
    if (simulationInput) {
      navigator.clipboard.writeText(JSON.stringify(simulationInput, null, 2));
      alert('✓ Copied simulation input to clipboard!');
    }
  };

  const handleDiff = () => {
    try {
      const currentFixture = JSON.parse(fixtureJson);
      const codeFixture = CODE_FIXTURES[selectedFixture];
      
      const diff = computeDiff(currentFixture, codeFixture, '');
      setDiffResult(diff.length > 0 ? diff.join('\n') : 'No differences found');
    } catch (err) {
      setDiffResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Input Inspector (VB6)</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Visualize, validate, and compare VB6 fixtures and simulation inputs.
        </p>
      </div>

      {/* Validation Error */}
      {validationError && (
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
          {validationError}
        </div>
      )}

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Column A: VB6 UI Fixture Editor */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
            (A) VB6 UI Fixture (Editable)
          </h3>
          <textarea
            value={fixtureJson}
            onChange={(e) => setFixtureJson(e.target.value)}
            style={{
              width: '100%',
              height: '400px',
              padding: '0.75rem',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={handleValidate}
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
              Validate
            </button>
            <button
              onClick={handleApplyToUi}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Apply to UI
            </button>
          </div>
        </div>

        {/* Column B: Computed Simulation Input */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
            (B) Simulation Input (Readonly)
          </h3>
          <pre
            style={{
              width: '100%',
              height: '400px',
              padding: '0.75rem',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'auto',
              margin: 0,
            }}
          >
            {simulationInput ? JSON.stringify(simulationInput, null, 2) : '// Click "Build Input From UI" to generate'}
          </pre>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={handleBuildInput}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              Build Input From UI
            </button>
            <button
              onClick={handleCopyInput}
              disabled={!simulationInput}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: simulationInput ? '#6b7280' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: simulationInput ? 'pointer' : 'not-allowed',
              }}
            >
              Copy Input JSON
            </button>
          </div>
        </div>
      </div>

      {/* Diff Section */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
          Diff vs Code Fixture
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: '500' }}>
            Compare against:
          </label>
          <select
            value={selectedFixture}
            onChange={(e) => setSelectedFixture(e.target.value as FixtureName)}
            style={{
              padding: '0.5rem',
              fontSize: '0.875rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            {Object.keys(CODE_FIXTURES).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={handleDiff}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Diff vs Fixture
          </button>
        </div>
        {diffResult && (
          <pre
            style={{
              padding: '0.75rem',
              backgroundColor: '#1e293b',
              color: '#e2e8f0',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              overflow: 'auto',
              margin: 0,
              maxHeight: '300px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {diffResult}
          </pre>
        )}
      </div>
    </div>
  );
}

/**
 * Simple diff computation for nested objects
 * Returns array of diff lines showing added/removed/changed paths
 */
function computeDiff(current: any, reference: any, path: string): string[] {
  const diffs: string[] = [];

  // Check all keys in reference
  for (const key in reference) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (!(key in current)) {
      diffs.push(`- MISSING: ${currentPath}`);
    } else if (typeof reference[key] === 'object' && reference[key] !== null && !Array.isArray(reference[key])) {
      // Recurse for nested objects
      diffs.push(...computeDiff(current[key], reference[key], currentPath));
    } else if (JSON.stringify(current[key]) !== JSON.stringify(reference[key])) {
      diffs.push(`~ CHANGED: ${currentPath}`);
      diffs.push(`  Reference: ${JSON.stringify(reference[key])}`);
      diffs.push(`  Current:   ${JSON.stringify(current[key])}`);
    }
  }

  // Check for added keys in current
  for (const key in current) {
    if (!(key in reference)) {
      const currentPath = path ? `${path}.${key}` : key;
      diffs.push(`+ ADDED: ${currentPath} = ${JSON.stringify(current[key])}`);
    }
  }

  return diffs;
}
