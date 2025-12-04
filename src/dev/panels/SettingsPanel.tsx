/**
 * Settings & Flags Panel
 * 
 * Consolidated panel for:
 * - User level (program tier) selection
 * - Feature flags and debug modes
 * - Logging controls
 * 
 * This replaces the separate FlagsPanel, UserLevelPanel, and LoggingPanel.
 */

import { useState, useEffect, useRef } from 'react';
import { 
  useFlagsStore, 
  useFlags,
  useUserLevel,
  USER_LEVELS,
  USER_LEVEL_DISPLAY,
} from '../../domain/flags/store';
import { 
  USER_LEVEL_DESCRIPTIONS,
  getVisibleInputs,
} from '../../shared/state/userLevel';

export default function SettingsPanel() {
  const flags = useFlags();
  const level = useUserLevel();
  const { setFlag, setUserLevel, resetFlags } = useFlagsStore();
  const visibleInputs = getVisibleInputs(level);
  
  // Log capture state
  const [logBuffer, setLogBuffer] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const logViewerRef = useRef<HTMLDivElement>(null);

  // Intercept console.log to capture logs
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const captureLog = (level: string, ...args: any[]) => {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      const logEntry = `[${timestamp}] [${level}] ${message}`;
      setLogBuffer(prev => [...prev.slice(-500), logEntry]); // Keep last 500 logs
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      captureLog('LOG', ...args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      captureLog('WARN', ...args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      captureLog('ERROR', ...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logViewerRef.current) {
      logViewerRef.current.scrollTop = logViewerRef.current.scrollHeight;
    }
  }, [logBuffer, autoScroll]);

  const handleDownloadLogs = () => {
    const logText = logBuffer.join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rsa-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = searchTerm
    ? logBuffer.filter(log => log.toLowerCase().includes(searchTerm.toLowerCase()))
    : logBuffer;

  const flagDefinitions = [
    {
      key: 'vb6StrictMode' as const,
      label: 'VB6 Strict Mode',
      description: 'Require complete VB6 fixture for simulation (no defaults)',
    },
    {
      key: 'showDiagnostics' as const,
      label: 'Show Diagnostics',
      description: 'Display debug information in console and UI',
    },
    {
      key: 'enableStepTrace' as const,
      label: 'Step Trace',
      description: 'Log detailed step-by-step simulation data',
    },
    {
      key: 'enableEnergyLogging' as const,
      label: 'Energy Logging',
      description: 'Log energy balance calculations',
    },
  ];

  return (
    <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Settings & Flags</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Configure user level, feature flags, and debug options.
        </p>
      </div>

      {/* Section 1: User Level */}
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
          User Level (Program Tier)
        </h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {USER_LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setUserLevel(lvl)}
              style={{
                flex: 1,
                padding: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: level === lvl ? '600' : '400',
                backgroundColor: level === lvl 
                  ? (lvl === 'admin' ? '#8b5cf6' : lvl === 'quarterPro' ? '#3b82f6' : '#10b981')
                  : 'var(--color-bg)',
                color: level === lvl ? 'white' : 'var(--color-text)',
                border: `2px solid ${level === lvl 
                  ? (lvl === 'admin' ? '#8b5cf6' : lvl === 'quarterPro' ? '#3b82f6' : '#10b981')
                  : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {USER_LEVEL_DISPLAY[lvl]}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
          <strong>Current:</strong> {USER_LEVEL_DISPLAY[level]} — {USER_LEVEL_DESCRIPTIONS[level]}
        </div>

        {/* Collapsible Input Visibility */}
        <details style={{ fontSize: '0.875rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: '500', marginBottom: '0.5rem' }}>
            View Available Inputs for {USER_LEVEL_DISPLAY[level]}
          </summary>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '0.75rem',
            padding: '0.75rem',
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-sm)',
            marginTop: '0.5rem',
          }}>
            <div>
              <strong style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Engine</strong>
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem', fontSize: '0.75rem' }}>
                {visibleInputs.engine.slice(0, 5).map((input) => <li key={input}>{input}</li>)}
                {visibleInputs.engine.length > 5 && <li>+{visibleInputs.engine.length - 5} more</li>}
              </ul>
            </div>
            <div>
              <strong style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Vehicle</strong>
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem', fontSize: '0.75rem' }}>
                {visibleInputs.vehicle.slice(0, 5).map((input) => <li key={input}>{input}</li>)}
                {visibleInputs.vehicle.length > 5 && <li>+{visibleInputs.vehicle.length - 5} more</li>}
              </ul>
            </div>
            <div>
              <strong style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Drivetrain</strong>
              <ul style={{ margin: '0.25rem 0', paddingLeft: '1rem', fontSize: '0.75rem' }}>
                {visibleInputs.drivetrain.slice(0, 5).map((input) => <li key={input}>{input}</li>)}
                {visibleInputs.drivetrain.length > 5 && <li>+{visibleInputs.drivetrain.length - 5} more</li>}
              </ul>
            </div>
          </div>
        </details>
      </div>

      {/* Section 2: Feature Flags */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
            Feature Flags
          </h3>
          <button
            onClick={resetFlags}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Reset All
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
          {flagDefinitions.map((flag) => (
            <label
              key={flag.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                padding: '0.75rem',
                backgroundColor: flags[flag.key] ? '#dbeafe' : 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={flags[flag.key] as boolean}
                onChange={(e) => setFlag(flag.key, e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              <div>
                <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{flag.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{flag.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Section 3: Console Logs */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
            Console Logs ({logBuffer.length})
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowLogs(!showLogs)}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: showLogs ? '#3b82f6' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              {showLogs ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={handleDownloadLogs}
              disabled={logBuffer.length === 0}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: logBuffer.length > 0 ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: logBuffer.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Download
            </button>
            <button
              onClick={() => setLogBuffer([])}
              disabled={logBuffer.length === 0}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                backgroundColor: logBuffer.length > 0 ? '#ef4444' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: logBuffer.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {showLogs && (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter logs..."
                style={{
                  flex: 1,
                  padding: '0.375rem 0.5rem',
                  fontSize: '0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg)',
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                Auto-scroll
              </label>
            </div>

            <div
              ref={logViewerRef}
              style={{
                height: '200px',
                padding: '0.5rem',
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {filteredLogs.length === 0 ? (
                <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  {logBuffer.length === 0 ? 'No logs yet' : 'No matches'}
                </div>
              ) : (
                filteredLogs.map((log, idx) => {
                  let color = '#e2e8f0';
                  if (log.includes('[WARN]')) color = '#fbbf24';
                  if (log.includes('[ERROR]')) color = '#ef4444';
                  return <div key={idx} style={{ color }}>{log}</div>;
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
