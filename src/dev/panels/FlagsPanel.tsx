/**
 * Feature Flags Panel
 * 
 * UI for toggling feature flags and development modes.
 * All flags persist to localStorage.
 */

import { useFlagsStore, useFlags } from '../../domain/flags/store.tsx';

export default function FlagsPanel() {
  const flags = useFlags();
  const { setFlag, resetFlags } = useFlagsStore();

  const flagDefinitions = [
    {
      key: 'vb6StrictMode' as const,
      label: 'VB6 Strict Mode',
      description: 'Require complete VB6 fixture for simulation (no defaults or heuristics)',
    },
    {
      key: 'showDiagnostics' as const,
      label: 'Show Diagnostics',
      description: 'Display debug information in console and UI',
    },
    {
      key: 'enableEnergyLogging' as const,
      label: 'Energy Logging',
      description: 'Log energy balance calculations during simulation',
    },
    {
      key: 'enableStepTrace' as const,
      label: 'Step Trace',
      description: 'Log detailed step-by-step simulation data',
    },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Feature Flags & Modes</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Control development features and diagnostic modes. Flags are persisted to localStorage.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        {flagDefinitions.map((flag) => (
          <div
            key={flag.key}
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label
                htmlFor={flag.key}
                style={{
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {flag.label}
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: flags[flag.key] ? '#10b981' : '#6b7280',
                    color: 'white',
                    fontWeight: '600',
                  }}
                >
                  {flags[flag.key] ? 'ON' : 'OFF'}
                </span>
              </label>
              
              {/* Toggle Switch */}
              <label
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '48px',
                  height: '24px',
                  cursor: 'pointer',
                }}
              >
                <input
                  id={flag.key}
                  type="checkbox"
                  checked={flags[flag.key]}
                  onChange={(e) => setFlag(flag.key, e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: flags[flag.key] ? '#3b82f6' : '#d1d5db',
                    borderRadius: '24px',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '',
                      height: '18px',
                      width: '18px',
                      left: flags[flag.key] ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                    }}
                  />
                </span>
              </label>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
              {flag.description}
            </p>
          </div>
        ))}
      </div>

      {/* Current Values Display */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '600' }}>
          Current Values (JSON)
        </h3>
        <pre
          style={{
            margin: 0,
            padding: '0.75rem',
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            overflow: 'auto',
            fontFamily: 'monospace',
          }}
        >
          {JSON.stringify(flags, null, 2)}
        </pre>
      </div>

      {/* Reset Button */}
      <button
        onClick={() => {
          if (confirm('Reset all flags to default values?')) {
            resetFlags();
          }
        }}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#dc2626';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ef4444';
        }}
      >
        Reset All Flags
      </button>

      {/* Storage Info */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
          <strong>💾 Storage:</strong> Flags are persisted to localStorage key <code>rsa.flags.v1</code>
        </p>
      </div>
    </div>
  );
}
