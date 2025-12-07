import { useState, useCallback } from 'react';
import { simulate } from '../../workerBridge';
import { fromVehicleToVB6Fixture } from '../../dev/vb6/fromVehicle';
import { fixtureToSimInputs } from '../../domain/physics/vb6/fixtures';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import type { Env } from '../../domain/schemas/env.schema';
import type { RaceLength } from '../../domain/config/raceLengths';

interface OptimizerModalProps {
  vehicle: Vehicle;
  env: Env;
  raceLength: RaceLength;
  isOpen: boolean;
  onClose: () => void;
  onApplyToSession: (optimizedVehicle: Vehicle) => void;
  onSaveToVehicle?: (optimizedVehicle: Vehicle) => Promise<void>;
}

interface OptimizeResult {
  value: number;
  et: number;
  mph: number;
}

type OptimizeType = 'gear' | 'converter' | 'both';

export default function OptimizerModal({ 
  vehicle, 
  env, 
  raceLength, 
  isOpen, 
  onClose,
  onApplyToSession,
  onSaveToVehicle,
}: OptimizerModalProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [, setOptimizeType] = useState<OptimizeType | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [gearResults, setGearResults] = useState<OptimizeResult[]>([]);
  const [converterResults, setConverterResults] = useState<OptimizeResult[]>([]);
  const [bestGear, setBestGear] = useState<OptimizeResult | null>(null);
  const [bestConverter, setBestConverter] = useState<OptimizeResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Run simulation for a given vehicle config
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
  
  // Reset state
  const reset = useCallback(() => {
    setOptimizeType(null);
    setProgress(0);
    setProgressText('');
    setGearResults([]);
    setConverterResults([]);
    setBestGear(null);
    setBestConverter(null);
    setSaveSuccess(false);
  }, []);
  
  // Optimize gear ratio
  const optimizeGear = useCallback(async (): Promise<OptimizeResult | null> => {
    const currentGear = vehicle.rearGear ?? 3.73;
    const minGear = Math.max(2.0, currentGear - 2.0);
    const maxGear = Math.min(6.0, currentGear + 2.0);
    const step = 0.05;
    
    const testResults: OptimizeResult[] = [];
    const totalSteps = Math.ceil((maxGear - minGear) / step);
    let stepCount = 0;
    
    for (let gear = minGear; gear <= maxGear; gear += step) {
      const testVehicle = { ...vehicle, rearGear: gear };
      const result = await runSim(testVehicle);
      testResults.push({ value: gear, et: result.et, mph: result.mph });
      stepCount++;
      setProgress(Math.round((stepCount / totalSteps) * 50)); // 0-50%
      setProgressText(`Testing gear ratio ${gear.toFixed(2)}...`);
    }
    
    const best = testResults.reduce((a, b) => a.et < b.et ? a : b);
    setGearResults(testResults);
    setBestGear(best);
    return best;
  }, [vehicle, runSim]);
  
  // Optimize converter stall
  const optimizeConverterStall = useCallback(async (baseVehicle?: Vehicle): Promise<OptimizeResult | null> => {
    const testBase = baseVehicle || vehicle;
    if (testBase.transmissionType !== 'converter') return null;
    
    const minStall = 1500;
    const maxStall = 6000;
    const step = 200;
    
    const testResults: OptimizeResult[] = [];
    const totalSteps = Math.ceil((maxStall - minStall) / step);
    let stepCount = 0;
    
    for (let stall = minStall; stall <= maxStall; stall += step) {
      const testVehicle = { ...testBase, converterStallRPM: stall };
      const result = await runSim(testVehicle);
      testResults.push({ value: stall, et: result.et, mph: result.mph });
      stepCount++;
      setProgress(50 + Math.round((stepCount / totalSteps) * 50)); // 50-100%
      setProgressText(`Testing stall speed ${stall} RPM...`);
    }
    
    const best = testResults.reduce((a, b) => a.et < b.et ? a : b);
    setConverterResults(testResults);
    setBestConverter(best);
    return best;
  }, [vehicle, runSim]);
  
  // Run optimization
  const runOptimization = useCallback(async (type: OptimizeType) => {
    reset();
    setIsOptimizing(true);
    setOptimizeType(type);
    
    try {
      if (type === 'gear' || type === 'both') {
        await optimizeGear();
      }
      
      if ((type === 'converter' || type === 'both') && vehicle.transmissionType === 'converter') {
        // If optimizing both, use the best gear ratio found
        const baseVehicle = type === 'both' && bestGear 
          ? { ...vehicle, rearGear: bestGear.value }
          : vehicle;
        await optimizeConverterStall(baseVehicle);
      }
    } finally {
      setIsOptimizing(false);
      setProgressText('');
    }
  }, [reset, optimizeGear, optimizeConverterStall, vehicle, bestGear]);
  
  // Get optimized vehicle
  const getOptimizedVehicle = useCallback((): Vehicle => {
    let optimized = { ...vehicle };
    if (bestGear) optimized.rearGear = bestGear.value;
    if (bestConverter) optimized.converterStallRPM = bestConverter.value;
    return optimized;
  }, [vehicle, bestGear, bestConverter]);
  
  // Apply to session only
  const handleApplyToSession = useCallback(() => {
    onApplyToSession(getOptimizedVehicle());
    onClose();
  }, [getOptimizedVehicle, onApplyToSession, onClose]);
  
  // Save to vehicle permanently
  const handleSaveToVehicle = useCallback(async () => {
    if (!onSaveToVehicle) return;
    setIsSaving(true);
    try {
      await onSaveToVehicle(getOptimizedVehicle());
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save vehicle:', err);
      alert('Failed to save vehicle');
    } finally {
      setIsSaving(false);
    }
  }, [getOptimizedVehicle, onSaveToVehicle, onClose]);
  
  if (!isOpen) return null;
  
  const hasResults = bestGear || bestConverter;
  const isAutomatic = vehicle.transmissionType === 'converter';
  
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
        width: '500px',
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
            ⚡ Performance Optimizer
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
          {/* Vehicle info */}
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.85rem',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
              {vehicle.name}
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Current: {vehicle.rearGear?.toFixed(2) ?? '3.73'} gear ratio
              {isAutomatic && ` • ${vehicle.converterStallRPM ?? 3000} RPM stall`}
            </div>
          </div>
          
          {/* Optimization buttons */}
          {!isOptimizing && !hasResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => runOptimization('gear')}
                style={{
                  padding: '14px 16px',
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  border: '2px solid var(--color-accent)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <div style={{ textAlign: 'left' }}>
                  <div>Optimize Gear Ratio</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>
                    Find the best final drive ratio for quickest ET
                  </div>
                </div>
              </button>
              
              {isAutomatic && (
                <button
                  onClick={() => runOptimization('converter')}
                  style={{
                    padding: '14px 16px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '2px solid #f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🔄</span>
                  <div style={{ textAlign: 'left' }}>
                    <div>Optimize Converter Stall</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>
                      Find the best stall speed for quickest ET
                    </div>
                  </div>
                </button>
              )}
              
              {isAutomatic && (
                <button
                  onClick={() => runOptimization('both')}
                  style={{
                    padding: '14px 16px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '2px solid #22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>🚀</span>
                  <div style={{ textAlign: 'left' }}>
                    <div>Optimize Both</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>
                      Find best gear ratio AND converter stall together
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}
          
          {/* Progress */}
          {isOptimizing && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--color-text)' }}>
                Optimizing...
              </div>
              <div style={{ 
                width: '100%', 
                height: '10px', 
                backgroundColor: 'var(--color-bg-secondary)', 
                borderRadius: '5px',
                overflow: 'hidden',
                marginBottom: '8px',
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-accent)',
                  transition: 'width 0.2s ease',
                }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {progressText || `${progress}% complete`}
              </div>
            </div>
          )}
          
          {/* Results */}
          {hasResults && !isOptimizing && (
            <div>
              {/* Gear ratio result */}
              {bestGear && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '4px' }}>
                        OPTIMAL GEAR RATIO
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        {bestGear.value.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        ET: {bestGear.et.toFixed(3)}s @ {bestGear.mph.toFixed(1)} mph
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        Current: {(vehicle.rearGear ?? 3.73).toFixed(2)}
                      </div>
                      <div style={{ 
                        color: bestGear.value !== (vehicle.rearGear ?? 3.73) ? '#22c55e' : 'var(--color-text-muted)',
                        fontWeight: 600,
                      }}>
                        {bestGear.value - (vehicle.rearGear ?? 3.73) >= 0 ? '+' : ''}
                        {(bestGear.value - (vehicle.rearGear ?? 3.73)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini chart */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-end', 
                      gap: '1px', 
                      height: '30px',
                    }}>
                      {gearResults.map((r, i) => {
                        const minET = Math.min(...gearResults.map(x => x.et));
                        const maxET = Math.max(...gearResults.map(x => x.et));
                        const range = maxET - minET || 0.1;
                        const height = ((maxET - r.et) / range) * 100;
                        const isBest = r.value === bestGear.value;
                        return (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: `${Math.max(5, height)}%`,
                              backgroundColor: isBest ? '#22c55e' : 'var(--color-accent)',
                              opacity: isBest ? 1 : 0.3,
                            }}
                            title={`${r.value.toFixed(2)}: ${r.et.toFixed(3)}s`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Converter result */}
              {bestConverter && (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>
                        OPTIMAL CONVERTER STALL
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        {bestConverter.value.toFixed(0)} RPM
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        ET: {bestConverter.et.toFixed(3)}s @ {bestConverter.mph.toFixed(1)} mph
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        Current: {vehicle.converterStallRPM ?? 3000} RPM
                      </div>
                      <div style={{ 
                        color: bestConverter.value !== (vehicle.converterStallRPM ?? 3000) ? '#22c55e' : 'var(--color-text-muted)',
                        fontWeight: 600,
                      }}>
                        {bestConverter.value - (vehicle.converterStallRPM ?? 3000) >= 0 ? '+' : ''}
                        {(bestConverter.value - (vehicle.converterStallRPM ?? 3000)).toFixed(0)} RPM
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini chart */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-end', 
                      gap: '1px', 
                      height: '30px',
                    }}>
                      {converterResults.map((r, i) => {
                        const minET = Math.min(...converterResults.map(x => x.et));
                        const maxET = Math.max(...converterResults.map(x => x.et));
                        const range = maxET - minET || 0.1;
                        const height = ((maxET - r.et) / range) * 100;
                        const isBest = r.value === bestConverter.value;
                        return (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: `${Math.max(5, height)}%`,
                              backgroundColor: isBest ? '#22c55e' : '#f59e0b',
                              opacity: isBest ? 1 : 0.3,
                            }}
                            title={`${r.value} RPM: ${r.et.toFixed(3)}s`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={handleApplyToSession}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Apply to Session
                </button>
                
                {onSaveToVehicle && (
                  <button
                    onClick={handleSaveToVehicle}
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      fontSize: '0.9rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: saveSuccess ? '#22c55e' : '#22c55e',
                      color: 'white',
                      cursor: isSaving ? 'wait' : 'pointer',
                      fontWeight: 600,
                      opacity: isSaving ? 0.7 : 1,
                    }}
                  >
                    {saveSuccess ? '✓ Saved!' : isSaving ? 'Saving...' : 'Save to Vehicle'}
                  </button>
                )}
              </div>
              
              {/* Run again button */}
              <button
                onClick={reset}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '10px 16px',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                Run Another Optimization
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Small trigger button component
export function OptimizerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        fontSize: '0.75rem',
        borderRadius: '4px',
        border: '1px solid var(--color-accent)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: 'var(--color-accent)',
        cursor: 'pointer',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
      title="Open Performance Optimizer"
    >
      <span>⚡</span>
      <span>Optimize</span>
    </button>
  );
}
