/**
 * Parity Runner Panel
 * 
 * Run benchmark tests and compare VB6Exact against Quarter Pro/Jr targets.
 * Validates simulation accuracy against VB6 printout benchmarks.
 */

import { useState } from 'react';
import { LEGACY_BENCHMARKS, validateAgainstBenchmark, type RaceLength } from '../../domain/physics/fixtures/benchmarks';
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../../domain/physics/fixtures/benchmark-configs';
import { VB6ExactModel } from '../../domain/physics/models/vb6Exact';
import type { SimInputs, SimResult, ExtendedVehicle } from '../../domain/physics';

interface TestResult {
  benchmarkName: string;
  raceLength: RaceLength;
  targetET: number;
  targetMPH: number;
  actualET: number;
  actualMPH: number;
  etDelta: number;
  mphDelta: number;
  etPass: boolean;
  mphPass: boolean;
  pass: boolean;
  etTolerance: number;
  mphTolerance: number;
}

export default function ParityRunner() {
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<Set<string>>(new Set());
  const [selectedLengths, setSelectedLengths] = useState<Set<RaceLength>>(new Set(['QUARTER']));
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleToggleBenchmark = (name: string) => {
    const newSet = new Set(selectedBenchmarks);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelectedBenchmarks(newSet);
  };

  const handleToggleLength = (length: RaceLength) => {
    const newSet = new Set(selectedLengths);
    if (newSet.has(length)) {
      newSet.delete(length);
    } else {
      newSet.add(length);
    }
    setSelectedLengths(newSet);
  };

  const handleSelectAll = () => {
    setSelectedBenchmarks(new Set(LEGACY_BENCHMARKS.map(b => b.name)));
  };

  const handleSelectNone = () => {
    setSelectedBenchmarks(new Set());
  };

  const buildSimInputs = (configName: string, raceLength: RaceLength): SimInputs => {
    const config = BENCHMARK_CONFIGS[configName];
    
    if (!config) {
      throw new Error(`Benchmark config not found: ${configName}`);
    }

    // Validate config has all required VB6 parameters
    validateBenchmarkConfig(config);

    // Build ExtendedVehicle from config
    const vehicle: ExtendedVehicle = {
      id: `benchmark_${configName}`,
      name: configName,
      weightLb: config.vehicle.weightLb,
      tireDiaIn: config.vehicle.tireDiaIn ?? (config.vehicle.tireRolloutIn! / Math.PI),
      rearGear: config.vehicle.rearGear ?? config.vehicle.finalDrive!,
      rolloutIn: config.vehicle.rolloutIn,
      powerHP: config.vehicle.torqueCurve ? 
        Math.max(...config.vehicle.torqueCurve.map(p => p.hp ?? 0)) : 
        config.vehicle.powerHP!,
      defaultRaceLength: raceLength,
      
      torqueCurve: config.vehicle.torqueCurve,
      frontalArea_ft2: config.vehicle.frontalArea_ft2,
      cd: config.vehicle.cd,
      gearRatios: config.vehicle.gearRatios,
      shiftRPM: config.vehicle.shiftRPM,
      
      wheelbaseIn: config.vehicle.wheelbaseIn,
      overhangIn: config.vehicle.overhangIn,
      tireRolloutIn: config.vehicle.tireRolloutIn,
      tireWidthIn: config.vehicle.tireWidthIn,
      liftCoeff: config.vehicle.liftCoeff,
      rrCoeff: config.vehicle.rrCoeff,
      
      finalDrive: config.vehicle.finalDrive ?? config.vehicle.rearGear,
      transEff: config.vehicle.transEff,
      gearEff: config.vehicle.gearEff,
      
      converter: config.vehicle.converter,
      clutch: config.vehicle.clutch,
    };

    return {
      vehicle,
      env: {
        elevation: config.env.elevation,
        barometerInHg: config.env.barometerInHg,
        temperatureF: config.env.temperatureF,
        humidityPct: config.env.humidityPct,
      },
      raceLength: raceLength,
    };
  };

  const handleRun = async () => {
    if (selectedBenchmarks.size === 0 || selectedLengths.size === 0) {
      setError('Please select at least one benchmark and one race length');
      return;
    }

    setRunning(true);
    setError(null);
    setResults([]);

    const testResults: TestResult[] = [];

    try {
      for (const benchmarkName of selectedBenchmarks) {
        const benchmark = LEGACY_BENCHMARKS.find(b => b.name === benchmarkName);
        if (!benchmark) continue;

        for (const raceLength of selectedLengths) {
          const target = benchmark.raceLengthTargets[raceLength];
          if (!target) continue;

          try {
            // Build inputs
            const inputs = buildSimInputs(benchmarkName, raceLength);
            
            // Run simulation with VB6Exact
            const result: SimResult = VB6ExactModel.simulate(inputs);
            
            // Validate against benchmark
            const validation = validateAgainstBenchmark(
              benchmark,
              raceLength,
              result.et_s,
              result.mph
            );

            testResults.push({
              benchmarkName,
              raceLength,
              targetET: target.et_s,
              targetMPH: target.mph,
              actualET: result.et_s,
              actualMPH: result.mph,
              etDelta: validation.etDelta,
              mphDelta: validation.mphDelta,
              etPass: validation.etPass,
              mphPass: validation.mphPass,
              pass: validation.pass,
              etTolerance: validation.etTolerance,
              mphTolerance: validation.mphTolerance,
            });
          } catch (err) {
            console.error(`Error running ${benchmarkName} ${raceLength}:`, err);
            testResults.push({
              benchmarkName,
              raceLength,
              targetET: target.et_s,
              targetMPH: target.mph,
              actualET: 0,
              actualMPH: 0,
              etDelta: 0,
              mphDelta: 0,
              etPass: false,
              mphPass: false,
              pass: false,
              etTolerance: target.tolET_s,
              mphTolerance: target.tolMPH,
            });
          }
        }
      }

      setResults(testResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const handleOpenInRunInspector = (benchmarkName: string) => {
    // TODO: Load the benchmark fixture into VB6 UI store
    // For now, just navigate to Run Inspector
    alert(`TODO: Load ${benchmarkName} fixture into VB6 Inputs and navigate to Run Inspector`);
    // navigate('/dev', { state: { panel: 'run-inspector' } });
  };

  const handleExportCsv = () => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }

    const headers = [
      'Benchmark',
      'Distance',
      'Target ET (s)',
      'Actual ET (s)',
      'ET Delta (s)',
      'ET Tolerance (s)',
      'ET Pass',
      'Target MPH',
      'Actual MPH',
      'MPH Delta',
      'MPH Tolerance',
      'MPH Pass',
      'Overall Pass',
    ];

    const rows = results.map(r => [
      r.benchmarkName,
      r.raceLength,
      r.targetET.toFixed(3),
      r.actualET.toFixed(3),
      r.etDelta.toFixed(3),
      r.etTolerance.toFixed(3),
      r.etPass ? 'PASS' : 'FAIL',
      r.targetMPH.toFixed(2),
      r.actualMPH.toFixed(2),
      r.mphDelta.toFixed(2),
      r.mphTolerance.toFixed(2),
      r.mphPass ? 'PASS' : 'FAIL',
      r.pass ? 'PASS' : 'FAIL',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parity-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const passCount = results.filter(r => r.pass).length;
  const totalCount = results.length;

  return (
    <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Parity Runner</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Run benchmark tests and compare VB6Exact against Quarter Pro/Jr targets.
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
            fontSize: '0.875rem',
            color: '#991b1b',
          }}
        >
          {error}
        </div>
      )}

      {/* Selection Controls */}
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
          Select Benchmarks
        </h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={handleSelectAll}
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
            Select All
          </button>
          <button
            onClick={handleSelectNone}
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
            Select None
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {LEGACY_BENCHMARKS.map((benchmark) => (
            <label
              key={benchmark.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <input
                type="checkbox"
                checked={selectedBenchmarks.has(benchmark.name)}
                onChange={() => handleToggleBenchmark(benchmark.name)}
              />
              <span>{benchmark.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                ({benchmark.source})
              </span>
            </label>
          ))}
        </div>

        <h3 style={{ marginTop: '1rem', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
          Race Lengths
        </h3>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedLengths.has('EIGHTH')}
              onChange={() => handleToggleLength('EIGHTH')}
            />
            <span>EIGHTH (660 ft)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectedLengths.has('QUARTER')}
              onChange={() => handleToggleLength('QUARTER')}
            />
            <span>QUARTER (1320 ft)</span>
          </label>
        </div>
      </div>

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
          {running ? 'Running...' : 'Run Selected Benchmarks'}
        </button>
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: passCount === totalCount ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${passCount === totalCount ? '#10b981' : '#ef4444'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: '600' }}>
              {passCount === totalCount ? '✓ All Tests Passed' : `⚠ ${totalCount - passCount} Test(s) Failed`}
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              {passCount} / {totalCount} passed
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
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
              Results
            </h3>
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

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                fontSize: '0.875rem',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Benchmark</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid var(--color-border)' }}>Distance</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Target ET</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Actual ET</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>ET Δ</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Target MPH</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Actual MPH</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>MPH Δ</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid var(--color-border)' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid var(--color-border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr
                    key={`${result.benchmarkName}-${result.raceLength}`}
                    style={{
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                      {result.benchmarkName}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
                      {result.raceLength}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', borderBottom: '1px solid var(--color-border)' }}>
                      {result.targetET.toFixed(3)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', borderBottom: '1px solid var(--color-border)' }}>
                      {result.actualET.toFixed(3)}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        color: result.etPass ? '#10b981' : '#ef4444',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      {result.etDelta >= 0 ? '+' : ''}{result.etDelta.toFixed(3)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', borderBottom: '1px solid var(--color-border)' }}>
                      {result.targetMPH.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace', borderBottom: '1px solid var(--color-border)' }}>
                      {result.actualMPH.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        color: result.mphPass ? '#10b981' : '#ef4444',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      {result.mphDelta >= 0 ? '+' : ''}{result.mphDelta.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: result.pass ? '#10b981' : '#ef4444',
                          color: 'white',
                        }}
                      >
                        {result.pass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
                      <button
                        onClick={() => handleOpenInRunInspector(result.benchmarkName)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                        }}
                      >
                        Open in Run Inspector
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
