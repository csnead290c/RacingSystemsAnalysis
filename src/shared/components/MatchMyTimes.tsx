import { useState, useCallback } from 'react';
import { simulate } from '../../workerBridge';
import { fromVehicleToVB6Fixture } from '../../dev/vb6/fromVehicle';
import { fixtureToSimInputs } from '../../domain/physics/vb6/fixtures';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import type { Env } from '../../domain/schemas/env.schema';
import type { RaceLength } from '../../domain/config/raceLengths';

interface MatchMyTimesProps {
  vehicle: Vehicle;
  env: Env;
  raceLength: RaceLength;
  isOpen: boolean;
  onClose: () => void;
  onApply: (adjustedVehicle: Vehicle, calibrationFactor: number) => void;
}

interface ActualRun {
  et: number;
  mph: number;
  sixtyFt?: number;
}

interface TuningResult {
  parameter: string;
  originalValue: number;
  adjustedValue: number;
  unit: string;
  change: number;
  changePercent: number;
}

/**
 * Match My Times - Auto-tune vehicle specs to match actual runs.
 * 
 * This is a key differentiator vs competitors. It:
 * 1. Takes actual run data from the user
 * 2. Runs optimization to find which parameters need adjustment
 * 3. Calculates a calibration factor for future predictions
 * 
 * Based on Performance Trends' "Match My Times" feature but with
 * better UX and more transparency.
 */
export default function MatchMyTimes({
  vehicle,
  env,
  raceLength,
  isOpen,
  onClose,
  onApply,
}: MatchMyTimesProps) {
  const [step, setStep] = useState<'input' | 'tuning' | 'results'>('input');
  const [actualRuns, setActualRuns] = useState<ActualRun[]>([{ et: 0, mph: 0 }]);
  const [isTuning, setIsTuning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [results, setResults] = useState<TuningResult[]>([]);
  const [calibrationFactor, setCalibrationFactor] = useState(1.0);
  const [adjustedVehicle, setAdjustedVehicle] = useState<Vehicle | null>(null);
  const [predictedET, setPredictedET] = useState(0);
  const [targetET, setTargetET] = useState(0);

  // Run simulation with given vehicle
  const runSim = useCallback(async (testVehicle: Vehicle): Promise<{ et: number; mph: number }> => {
    try {
      const vb6Fixture = fromVehicleToVB6Fixture(testVehicle as any);
      const simInputs = fixtureToSimInputs(vb6Fixture, raceLength);
      simInputs.env = {
        elevation: env.elevation ?? 0,
        barometerInHg: env.barometerInHg ?? 29.92,
        temperatureF: env.temperatureF ?? 75,
        humidityPct: env.humidityPct ?? 50,
        windMph: env.windMph ?? 0,
        windAngleDeg: env.windAngleDeg ?? 0,
        trackTempF: env.trackTempF ?? 100,
        tractionIndex: env.tractionIndex ?? 5,
      };
      const result = await simulate('VB6Exact', simInputs);
      return { et: result.et_s, mph: result.mph };
    } catch (err) {
      console.error('Simulation failed:', err);
      return { et: 999, mph: 0 };
    }
  }, [env, raceLength]);

  // Add a run
  const addRun = () => {
    setActualRuns([...actualRuns, { et: 0, mph: 0 }]);
  };

  // Remove a run
  const removeRun = (index: number) => {
    if (actualRuns.length > 1) {
      setActualRuns(actualRuns.filter((_, i) => i !== index));
    }
  };

  // Update a run
  const updateRun = (index: number, field: keyof ActualRun, value: number) => {
    const updated = [...actualRuns];
    updated[index] = { ...updated[index], [field]: value };
    setActualRuns(updated);
  };

  // Run the tuning algorithm
  const runTuning = useCallback(async () => {
    // Filter out empty runs
    const validRuns = actualRuns.filter(r => r.et > 0);
    if (validRuns.length === 0) return;

    setStep('tuning');
    setIsTuning(true);
    setProgress(0);
    setResults([]);

    // Calculate average actual ET
    const avgActualET = validRuns.reduce((sum, r) => sum + r.et, 0) / validRuns.length;
    const avgActualMPH = validRuns.reduce((sum, r) => sum + r.mph, 0) / validRuns.length;
    setTargetET(avgActualET);

    // Get baseline prediction
    setProgressText('Running baseline simulation...');
    const baseline = await runSim(vehicle);
    setProgress(10);

    const etDelta = avgActualET - baseline.et;
    // mphDelta could be used for future MPH-based tuning
    void avgActualMPH; // Suppress unused warning

    // Determine which parameters to adjust based on the delta
    const tuningResults: TuningResult[] = [];
    let bestVehicle = { ...vehicle };

    // If predicted is faster than actual, we need to reduce power or add weight
    // If predicted is slower than actual, we need to add power or reduce weight
    
    if (Math.abs(etDelta) > 0.01) {
      setProgressText('Tuning power output...');
      setProgress(30);

      // Try adjusting HP (direction based on delta)
      let bestHP = vehicle.powerHP ?? 500;
      let bestETDiff = Math.abs(etDelta);

      for (let hpAdj = -50; hpAdj <= 50; hpAdj += 5) {
        const testHP = (vehicle.powerHP ?? 500) + hpAdj;
        if (testHP < 50) continue;
        
        const testVehicle = { ...vehicle, powerHP: testHP };
        const result = await runSim(testVehicle);
        const diff = Math.abs(result.et - avgActualET);
        
        if (diff < bestETDiff) {
          bestETDiff = diff;
          bestHP = testHP;
        }
      }

      if (bestHP !== (vehicle.powerHP ?? 500)) {
        tuningResults.push({
          parameter: 'Horsepower',
          originalValue: vehicle.powerHP ?? 500,
          adjustedValue: bestHP,
          unit: 'HP',
          change: bestHP - (vehicle.powerHP ?? 500),
          changePercent: ((bestHP - (vehicle.powerHP ?? 500)) / (vehicle.powerHP ?? 500)) * 100,
        });
        bestVehicle.powerHP = bestHP;
      }

      setProgress(50);
      setProgressText('Tuning weight...');

      // Try adjusting weight
      let bestWeight = vehicle.weightLb ?? 3000;
      bestETDiff = Math.abs(etDelta);

      for (let weightAdj = -100; weightAdj <= 100; weightAdj += 10) {
        const testWeight = (vehicle.weightLb ?? 3000) + weightAdj;
        if (testWeight < 1000) continue;
        
        const testVehicle = { ...bestVehicle, weightLb: testWeight };
        const result = await runSim(testVehicle);
        const diff = Math.abs(result.et - avgActualET);
        
        if (diff < bestETDiff) {
          bestETDiff = diff;
          bestWeight = testWeight;
        }
      }

      if (bestWeight !== (vehicle.weightLb ?? 3000)) {
        tuningResults.push({
          parameter: 'Weight',
          originalValue: vehicle.weightLb ?? 3000,
          adjustedValue: bestWeight,
          unit: 'lbs',
          change: bestWeight - (vehicle.weightLb ?? 3000),
          changePercent: ((bestWeight - (vehicle.weightLb ?? 3000)) / (vehicle.weightLb ?? 3000)) * 100,
        });
        bestVehicle.weightLb = bestWeight;
      }

      setProgress(70);
    }

    // Calculate calibration factor
    setProgressText('Calculating calibration factor...');
    const finalResult = await runSim(bestVehicle);
    const calFactor = avgActualET / finalResult.et;
    
    setProgress(90);

    // If we couldn't tune close enough, add a calibration factor
    if (Math.abs(finalResult.et - avgActualET) > 0.02) {
      tuningResults.push({
        parameter: 'Calibration Factor',
        originalValue: 1.0,
        adjustedValue: calFactor,
        unit: '',
        change: calFactor - 1.0,
        changePercent: (calFactor - 1.0) * 100,
      });
    }

    setProgress(100);
    setProgressText('Complete!');
    setResults(tuningResults);
    setCalibrationFactor(calFactor);
    setAdjustedVehicle(bestVehicle);
    setPredictedET(finalResult.et);
    setIsTuning(false);
    setStep('results');
  }, [actualRuns, vehicle, runSim]);

  // Apply the tuning
  const handleApply = () => {
    if (adjustedVehicle) {
      onApply(adjustedVehicle, calibrationFactor);
      onClose();
    }
  };

  // Reset
  const reset = () => {
    setStep('input');
    setActualRuns([{ et: 0, mph: 0 }]);
    setResults([]);
    setCalibrationFactor(1.0);
    setAdjustedVehicle(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--color-bg)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        zIndex: 1001,
        width: '550px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>
            🎯 Match My Times
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Step 1: Input actual runs */}
          {step === 'input' && (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                Enter your actual run times. RSA will automatically adjust your vehicle specs 
                to match your real-world performance.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 40px',
                  gap: '8px',
                  marginBottom: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                }}>
                  <div>ET (seconds)</div>
                  <div>MPH</div>
                  <div></div>
                </div>

                {actualRuns.map((run, i) => (
                  <div 
                    key={i}
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr 40px',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <input
                      type="number"
                      step="0.001"
                      value={run.et || ''}
                      onChange={(e) => updateRun(i, 'et', parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 11.234"
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        fontSize: '0.95rem',
                      }}
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={run.mph || ''}
                      onChange={(e) => updateRun(i, 'mph', parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 118.5"
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        fontSize: '0.95rem',
                      }}
                    />
                    <button
                      onClick={() => removeRun(i)}
                      disabled={actualRuns.length === 1}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'transparent',
                        color: actualRuns.length === 1 ? 'var(--color-border)' : '#ef4444',
                        cursor: actualRuns.length === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  onClick={addRun}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px dashed var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    width: '100%',
                  }}
                >
                  + Add Another Run
                </button>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                color: 'var(--color-text-muted)',
              }}>
                💡 <strong>Tip:</strong> Enter 3-5 runs from similar conditions for best results. 
                Make sure the weather settings above match the conditions when you made these runs.
              </div>

              <button
                onClick={runTuning}
                disabled={!actualRuns.some(r => r.et > 0)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: actualRuns.some(r => r.et > 0) ? '#22c55e' : 'var(--color-border)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: actualRuns.some(r => r.et > 0) ? 'pointer' : 'not-allowed',
                }}
              >
                Tune My Vehicle
              </button>
            </>
          )}

          {/* Step 2: Tuning in progress */}
          {step === 'tuning' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
                {isTuning ? 'Tuning your vehicle...' : 'Complete!'}
              </div>
              <div style={{
                width: '100%',
                height: '10px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '5px',
                overflow: 'hidden',
                marginBottom: '12px',
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#22c55e',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {progressText}
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 'results' && (
            <>
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>
                      TARGET ET
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      {targetET.toFixed(3)}s
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem' }}>→</div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: 600 }}>
                      PREDICTED ET
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                      {(predictedET * calibrationFactor).toFixed(3)}s
                    </div>
                  </div>
                </div>
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '0.85rem', 
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                }}>
                  Difference: {Math.abs(targetET - (predictedET * calibrationFactor)).toFixed(3)}s
                </div>
              </div>

              {results.length > 0 ? (
                <>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 600, 
                    marginBottom: '12px',
                    color: 'var(--color-text-muted)',
                  }}>
                    RECOMMENDED ADJUSTMENTS
                  </div>

                  {results.map((result, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {result.parameter}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {result.originalValue.toFixed(1)} → {result.adjustedValue.toFixed(1)} {result.unit}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: result.change > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: result.change > 0 ? '#22c55e' : '#ef4444',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}>
                        {result.change > 0 ? '+' : ''}{result.changePercent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.9rem',
                }}>
                  Your vehicle specs are already well-calibrated! 
                  No significant adjustments needed.
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={handleApply}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Apply Changes
                </button>
                <button
                  onClick={reset}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
