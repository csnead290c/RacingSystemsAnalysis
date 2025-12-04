/**
 * Energy Accounting Panel
 * 
 * Visualize energy flow and balance during simulation runs.
 * Shows energy input, losses, and final kinetic energy.
 */

import { useState } from 'react';
import { useVb6Fixture } from '../../shared/state/vb6FixtureStore';
import { useFlag } from '../../domain/flags/store.tsx';
import { assertComplete, Vb6FixtureValidationError } from '../../domain/physics/vb6/fixtures';
import { buildInputFromUiFixture } from '../../domain/physics/vb6/uiMapper';
import { simulate } from '../../workerBridge';
import type { SimResult } from '../../domain/physics';

interface EnergyBreakdown {
  engine_in_ftlbf: number;
  drag_loss_ftlbf: number;
  rolling_resistance_ftlbf: number;
  driveline_loss_ftlbf: number;
  engine_pmi_loss_ftlbf: number;
  chassis_pmi_loss_ftlbf: number;
  final_ke_ftlbf: number;
  balance_ftlbf: number;
  balance_pct: number;
}

export default function EnergyPanel() {
  const { fixture } = useVb6Fixture();
  const enableEnergyLogging = useFlag('enableEnergyLogging');
  
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [energyData, setEnergyData] = useState<EnergyBreakdown | null>(null);
  // Always use VB6Exact model

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setEnergyData(null);

    try {
      // Validate fixture
      assertComplete(fixture);
      
      // Build simulation input
      const input = buildInputFromUiFixture(fixture);
      input.raceLength = 'QUARTER';
      
      // Run simulation
      const simResult = await simulate('VB6Exact', input);
      setResult(simResult);
      
      // Extract energy data from meta
      const energy = (simResult.meta as any).energy;
      if (energy) {
        const totalIn = energy.engine_in_ftlbf || 0;
        const balance = energy.balance_ftlbf || 0;
        
        setEnergyData({
          engine_in_ftlbf: energy.engine_in_ftlbf || 0,
          drag_loss_ftlbf: energy.drag_loss_ftlbf || 0,
          rolling_resistance_ftlbf: energy.rolling_resistance_ftlbf || 0,
          driveline_loss_ftlbf: energy.driveline_loss_ftlbf || 0,
          engine_pmi_loss_ftlbf: energy.engine_pmi_loss_ftlbf || 0,
          chassis_pmi_loss_ftlbf: energy.chassis_pmi_loss_ftlbf || 0,
          final_ke_ftlbf: energy.final_ke_ftlbf || 0,
          balance_ftlbf: balance,
          balance_pct: totalIn > 0 ? (balance / totalIn) * 100 : 0,
        });
      } else {
        setError('Energy data not available in simulation result. Enable enableEnergyLogging flag.');
      }
      
    } catch (err) {
      if (err instanceof Vb6FixtureValidationError) {
        setError(`Fixture validation failed:\n\n${err.message}\n\nPlease complete all required fields in VB6 Inputs panel.`);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setRunning(false);
    }
  };

  const handleExportJson = () => {
    if (!energyData) return;
    
    const json = JSON.stringify(energyData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energy-breakdown-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!energyData) return;
    
    const headers = ['Category', 'Energy (ft-lbf)', 'Percentage'];
    const totalIn = energyData.engine_in_ftlbf;
    
    const rows = [
      ['Engine Input', energyData.engine_in_ftlbf, '100.00%'],
      ['Drag Loss', energyData.drag_loss_ftlbf, `${((energyData.drag_loss_ftlbf / totalIn) * 100).toFixed(2)}%`],
      ['Rolling Resistance', energyData.rolling_resistance_ftlbf, `${((energyData.rolling_resistance_ftlbf / totalIn) * 100).toFixed(2)}%`],
      ['Driveline Loss', energyData.driveline_loss_ftlbf, `${((energyData.driveline_loss_ftlbf / totalIn) * 100).toFixed(2)}%`],
      ['Engine PMI Loss', energyData.engine_pmi_loss_ftlbf, `${((energyData.engine_pmi_loss_ftlbf / totalIn) * 100).toFixed(2)}%`],
      ['Chassis PMI Loss', energyData.chassis_pmi_loss_ftlbf, `${((energyData.chassis_pmi_loss_ftlbf / totalIn) * 100).toFixed(2)}%`],
      ['Final Kinetic Energy', energyData.final_ke_ftlbf, `${((energyData.final_ke_ftlbf / totalIn) * 100).toFixed(2)}%`],
      ['Balance', energyData.balance_ftlbf, `${energyData.balance_pct.toFixed(2)}%`],
    ];

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energy-breakdown-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Energy Accounting</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Visualize energy flow and balance during simulation runs.
        </p>
      </div>

      {/* Energy Logging Flag Warning */}
      {!enableEnergyLogging && (
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
            <strong>💡 Instructions:</strong> Enable <code>enableEnergyLogging</code> flag in the Feature Flags panel
            to capture energy accounting data during simulation runs.
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

      {/* Run Button */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            backgroundColor: running ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'Running...' : 'Run VB6Exact (QUARTER)'}
        </button>
      </div>

      {/* Results Summary */}
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
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
            Run Results
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>ET (s)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{result.et_s.toFixed(3)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>MPH</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{result.mph.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Model</div>
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>{result.meta.model}</div>
            </div>
          </div>
        </div>
      )}

      {/* Energy Breakdown */}
      {energyData && (
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
              Energy Breakdown
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleExportJson}
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
                Export JSON
              </button>
              <button
                onClick={handleExportCsv}
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
                Export CSV
              </button>
            </div>
          </div>

          {/* Energy Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Engine Input */}
            <EnergyBar
              label="Engine Input"
              value={energyData.engine_in_ftlbf}
              percentage={100}
              color="#10b981"
              isInput
            />

            {/* Losses */}
            <EnergyBar
              label="Drag Loss"
              value={energyData.drag_loss_ftlbf}
              percentage={(energyData.drag_loss_ftlbf / energyData.engine_in_ftlbf) * 100}
              color="#ef4444"
            />
            <EnergyBar
              label="Rolling Resistance"
              value={energyData.rolling_resistance_ftlbf}
              percentage={(energyData.rolling_resistance_ftlbf / energyData.engine_in_ftlbf) * 100}
              color="#f59e0b"
            />
            <EnergyBar
              label="Driveline Loss"
              value={energyData.driveline_loss_ftlbf}
              percentage={(energyData.driveline_loss_ftlbf / energyData.engine_in_ftlbf) * 100}
              color="#f59e0b"
            />
            <EnergyBar
              label="Engine PMI Loss"
              value={energyData.engine_pmi_loss_ftlbf}
              percentage={(energyData.engine_pmi_loss_ftlbf / energyData.engine_in_ftlbf) * 100}
              color="#f59e0b"
            />
            <EnergyBar
              label="Chassis PMI Loss"
              value={energyData.chassis_pmi_loss_ftlbf}
              percentage={(energyData.chassis_pmi_loss_ftlbf / energyData.engine_in_ftlbf) * 100}
              color="#f59e0b"
            />

            {/* Final KE */}
            <EnergyBar
              label="Final Kinetic Energy"
              value={energyData.final_ke_ftlbf}
              percentage={(energyData.final_ke_ftlbf / energyData.engine_in_ftlbf) * 100}
              color="#3b82f6"
            />

            {/* Balance */}
            <EnergyBar
              label="Balance (Error)"
              value={energyData.balance_ftlbf}
              percentage={energyData.balance_pct}
              color={Math.abs(energyData.balance_pct) < 1 ? '#10b981' : '#ef4444'}
              showSign
            />
          </div>

          {/* Summary Stats */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#1e293b',
              borderRadius: 'var(--radius-md)',
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Total Energy In:</strong> {energyData.engine_in_ftlbf.toLocaleString()} ft-lbf
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Total Losses:</strong>{' '}
              {(
                energyData.drag_loss_ftlbf +
                energyData.rolling_resistance_ftlbf +
                energyData.driveline_loss_ftlbf +
                energyData.engine_pmi_loss_ftlbf +
                energyData.chassis_pmi_loss_ftlbf
              ).toLocaleString()}{' '}
              ft-lbf
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Final KE:</strong> {energyData.final_ke_ftlbf.toLocaleString()} ft-lbf
            </div>
            <div>
              <strong>Balance:</strong> {energyData.balance_ftlbf.toLocaleString()} ft-lbf (
              {energyData.balance_pct.toFixed(2)}%)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface EnergyBarProps {
  label: string;
  value: number;
  percentage: number;
  color: string;
  isInput?: boolean;
  showSign?: boolean;
}

function EnergyBar({ label, value, percentage, color, isInput, showSign }: EnergyBarProps) {
  const displayValue = showSign && value >= 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
  const barWidth = Math.min(Math.abs(percentage), 100);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
        <span style={{ fontWeight: isInput ? '600' : '400' }}>{label}</span>
        <span style={{ fontFamily: 'monospace' }}>
          {displayValue} ft-lbf ({percentage.toFixed(2)}%)
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#e5e7eb',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
