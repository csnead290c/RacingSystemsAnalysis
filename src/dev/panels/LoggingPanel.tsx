/**
 * Logging & Downloads Panel
 * 
 * Control logging flags and view/download console logs.
 * Provides centralized log management for debugging.
 */

import { useState, useEffect, useRef } from 'react';
import { useFlagsStore, useFlags } from '../../domain/flags/store.tsx';

export default function LoggingPanel() {
  const flags = useFlags();
  const { setFlag } = useFlagsStore();
  
  const [logBuffer, setLogBuffer] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logViewerRef = useRef<HTMLDivElement>(null);

  // Intercept console.log to capture logs
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const captureLog = (level: string, ...args: any[]) => {
      const timestamp = new Date().toISOString();
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      const logEntry = `[${timestamp}] [${level}] ${message}`;
      setLogBuffer(prev => [...prev, logEntry]);
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

  const handleClearLogs = () => {
    if (confirm('Clear all logs?')) {
      setLogBuffer([]);
    }
  };

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

  return (
    <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Logging & Downloads</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Control logging flags and view/download console logs for debugging.
        </p>
      </div>

      {/* Logging Flags */}
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
          Logging Flags
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Show Diagnostics */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              backgroundColor: flags.showDiagnostics ? '#dbeafe' : 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={flags.showDiagnostics}
              onChange={(e) => setFlag('showDiagnostics', e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                Show Diagnostics
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                Display debug information in console and UI
              </div>
            </div>
            <span
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: flags.showDiagnostics ? '#10b981' : '#6b7280',
                color: 'white',
              }}
            >
              {flags.showDiagnostics ? 'ON' : 'OFF'}
            </span>
          </label>

          {/* Enable Step Trace */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              backgroundColor: flags.enableStepTrace ? '#dbeafe' : 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={flags.enableStepTrace}
              onChange={(e) => setFlag('enableStepTrace', e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                Enable Step Trace
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                Log detailed step-by-step simulation data (first 12 steps)
              </div>
            </div>
            <span
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: flags.enableStepTrace ? '#10b981' : '#6b7280',
                color: 'white',
              }}
            >
              {flags.enableStepTrace ? 'ON' : 'OFF'}
            </span>
          </label>

          {/* Enable Energy Logging */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              backgroundColor: flags.enableEnergyLogging ? '#dbeafe' : 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={flags.enableEnergyLogging}
              onChange={(e) => setFlag('enableEnergyLogging', e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                Enable Energy Logging
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                Log energy balance calculations during simulation
              </div>
            </div>
            <span
              style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: flags.enableEnergyLogging ? '#10b981' : '#6b7280',
                color: 'white',
              }}
            >
              {flags.enableEnergyLogging ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.75rem',
            color: '#92400e',
          }}
        >
          <strong>Note:</strong> These flags mirror the Feature Flags panel. Changes here affect global behavior.
        </div>
      </div>

      {/* Log Viewer */}
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
            Log Buffer ({filteredLogs.length} {searchTerm ? `/ ${logBuffer.length}` : ''} entries)
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button
              onClick={handleDownloadLogs}
              disabled={logBuffer.length === 0}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: logBuffer.length > 0 ? '#3b82f6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: logBuffer.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Download .log
            </button>
            <button
              onClick={handleClearLogs}
              disabled={logBuffer.length === 0}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                backgroundColor: logBuffer.length > 0 ? '#ef4444' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: logBuffer.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '0.875rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-bg)',
            }}
          />
        </div>

        {/* Log Viewer */}
        <div
          ref={logViewerRef}
          style={{
            height: '400px',
            padding: '0.75rem',
            backgroundColor: '#1e293b',
            color: '#e2e8f0',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              {logBuffer.length === 0 ? 'No logs captured yet. Enable logging flags and run simulations.' : 'No logs match search term.'}
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              // Color-code by level
              let color = '#e2e8f0';
              if (log.includes('[WARN]')) color = '#fbbf24';
              if (log.includes('[ERROR]')) color = '#ef4444';
              if (log.includes('[CONSOLIDATED_ROW]')) color = '#10b981';
              if (log.includes('[INTEGRATED]')) color = '#3b82f6';

              return (
                <div key={idx} style={{ color, marginBottom: '0.25rem' }}>
                  {log}
                </div>
              );
            })
          )}
        </div>

        {logBuffer.length > 0 && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            <strong>Tip:</strong> Logs are captured from console.log, console.warn, and console.error.
            Use search to filter by keywords like "CONSOLIDATED_ROW" or "ERROR".
          </div>
        )}
      </div>
    </div>
  );
}
