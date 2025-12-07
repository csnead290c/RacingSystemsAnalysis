import { useState, useCallback } from 'react';
import { simulate } from '../../workerBridge';
import { fromVehicleToVB6Fixture } from '../../dev/vb6/fromVehicle';
import { fixtureToSimInputs } from '../../domain/physics/vb6/fixtures';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import type { Env } from '../../domain/schemas/env.schema';
import type { RaceLength } from '../../domain/config/raceLengths';

interface OptimizerProps {
  vehicle: Vehicle;
  env: Env;
  raceLength: RaceLength;
  onOptimized: (optimizedVehicle: Vehicle, result: { et: number; mph: number }) => void;
}

interface OptimizeResult {
  value: number;
  et: number;
  mph: number;
}

export default function Optimizer({ vehicle, env, raceLength, onOptimized }: OptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeType, setOptimizeType] = useState<'gear' | 'converter' | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OptimizeResult[]>([]);
  const [bestResult, setBestResult] = useState<OptimizeResult | null>(null);
  
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
      return {
        et: result.et_s,
        mph: result.mph,
      };
    } catch (err) {
      console.error('Simulation failed:', err);
      return { et: 999, mph: 0 };
    }
  }, [env, raceLength]);
  
  // Optimize gear ratio
  const optimizeGearRatio = useCallback(async () => {
    setIsOptimizing(true);
    setOptimizeType('gear');
    setProgress(0);
    setResults([]);
    setBestResult(null);
    
    const currentGear = vehicle.rearGear ?? 3.73;
    const minGear = Math.max(2.5, currentGear - 1.5);
    const maxGear = Math.min(5.5, currentGear + 1.5);
    const step = 0.10;
    
    const testResults: OptimizeResult[] = [];
    const totalSteps = Math.ceil((maxGear - minGear) / step);
    let stepCount = 0;
    
    for (let gear = minGear; gear <= maxGear; gear += step) {
      const testVehicle = { ...vehicle, rearGear: gear };
      const result = await runSim(testVehicle);
      testResults.push({ value: gear, et: result.et, mph: result.mph });
      stepCount++;
      setProgress(Math.round((stepCount / totalSteps) * 100));
    }
    
    // Find best ET
    const best = testResults.reduce((a, b) => a.et < b.et ? a : b);
    setResults(testResults);
    setBestResult(best);
    setIsOptimizing(false);
  }, [vehicle, runSim]);
  
  // Optimize converter stall
  const optimizeConverter = useCallback(async () => {
    if (vehicle.transmissionType !== 'converter') {
      alert('Converter optimization only available for automatic transmissions');
      return;
    }
    
    setIsOptimizing(true);
    setOptimizeType('converter');
    setProgress(0);
    setResults([]);
    setBestResult(null);
    
    const minStall = 1500;
    const maxStall = 6000;
    const step = 250;
    
    const testResults: OptimizeResult[] = [];
    const totalSteps = Math.ceil((maxStall - minStall) / step);
    let stepCount = 0;
    
    for (let stall = minStall; stall <= maxStall; stall += step) {
      const testVehicle = { ...vehicle, converterStallRPM: stall };
      const result = await runSim(testVehicle);
      testResults.push({ value: stall, et: result.et, mph: result.mph });
      stepCount++;
      setProgress(Math.round((stepCount / totalSteps) * 100));
    }
    
    // Find best ET
    const best = testResults.reduce((a, b) => a.et < b.et ? a : b);
    setResults(testResults);
    setBestResult(best);
    setIsOptimizing(false);
  }, [vehicle, runSim]);
  
  // Apply best result
  const applyBest = useCallback(() => {
    if (!bestResult) return;
    
    let optimizedVehicle: Vehicle;
    if (optimizeType === 'gear') {
      optimizedVehicle = { ...vehicle, rearGear: bestResult.value };
    } else {
      optimizedVehicle = { ...vehicle, converterStallRPM: bestResult.value };
    }
    
    onOptimized(optimizedVehicle, { et: bestResult.et, mph: bestResult.mph });
    setResults([]);
    setBestResult(null);
    setOptimizeType(null);
  }, [bestResult, optimizeType, vehicle, onOptimized]);
  
  // Close without applying
  const close = useCallback(() => {
    setResults([]);
    setBestResult(null);
    setOptimizeType(null);
  }, []);
  
  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <div style={{ fontWeight: '600', marginBottom: '10px', color: 'var(--color-text)', fontSize: '0.8rem' }}>
        ⚡ Optimizer
      </div>
      
      {!isOptimizing && !bestResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={optimizeGearRatio}
            style={{
              padding: '8px 12px',
              fontSize: '0.75rem',
              borderRadius: '4px',
              border: '1px solid var(--color-accent)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            🎯 Find Best Gear Ratio
          </button>
          
          {vehicle.transmissionType === 'converter' && (
            <button
              onClick={optimizeConverter}
              style={{
                padding: '8px 12px',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              🎯 Find Best Converter
            </button>
          )}
          
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Current: {vehicle.rearGear?.toFixed(2) ?? '3.73'} gear
            {vehicle.transmissionType === 'converter' && (
              <span> • {vehicle.converterStallRPM ?? 3000} RPM stall</span>
            )}
          </div>
        </div>
      )}
      
      {isOptimizing && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '0.8rem', marginBottom: '8px', color: 'var(--color-text)' }}>
            Optimizing {optimizeType === 'gear' ? 'Gear Ratio' : 'Converter'}...
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            backgroundColor: 'var(--color-bg-secondary)', 
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: 'var(--color-accent)',
              transition: 'width 0.2s ease',
            }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {progress}% complete
          </div>
        </div>
      )}
      
      {bestResult && !isOptimizing && (
        <div>
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'rgba(34, 197, 94, 0.1)', 
            borderRadius: '6px',
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600, marginBottom: '4px' }}>
              OPTIMAL {optimizeType === 'gear' ? 'GEAR RATIO' : 'CONVERTER STALL'}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {optimizeType === 'gear' 
                ? bestResult.value.toFixed(2) 
                : `${bestResult.value.toFixed(0)} RPM`
              }
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              ET: {bestResult.et.toFixed(3)}s @ {bestResult.mph.toFixed(1)} mph
            </div>
            
            {/* Comparison to current */}
            <div style={{ fontSize: '0.7rem', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ color: 'var(--color-text-muted)' }}>
                Current: {optimizeType === 'gear' 
                  ? (vehicle.rearGear ?? 3.73).toFixed(2)
                  : `${vehicle.converterStallRPM ?? 3000} RPM`
                }
              </div>
              <div style={{ color: '#22c55e', fontWeight: 600 }}>
                Change: {optimizeType === 'gear'
                  ? (bestResult.value - (vehicle.rearGear ?? 3.73) >= 0 ? '+' : '') + (bestResult.value - (vehicle.rearGear ?? 3.73)).toFixed(2)
                  : (bestResult.value - (vehicle.converterStallRPM ?? 3000) >= 0 ? '+' : '') + (bestResult.value - (vehicle.converterStallRPM ?? 3000)).toFixed(0) + ' RPM'
                }
              </div>
            </div>
          </div>
          
          {/* Mini chart of results */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              ET vs {optimizeType === 'gear' ? 'Gear Ratio' : 'Stall RPM'}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-end', 
              gap: '2px', 
              height: '40px',
              padding: '0 4px',
            }}>
              {results.map((r, i) => {
                const minET = Math.min(...results.map(x => x.et));
                const maxET = Math.max(...results.map(x => x.et));
                const range = maxET - minET || 0.1;
                const height = ((maxET - r.et) / range) * 100;
                const isBest = r.value === bestResult.value;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.max(10, height)}%`,
                      backgroundColor: isBest ? '#22c55e' : 'var(--color-accent)',
                      borderRadius: '2px 2px 0 0',
                      opacity: isBest ? 1 : 0.4,
                    }}
                    title={`${optimizeType === 'gear' ? r.value.toFixed(2) : r.value}: ${r.et.toFixed(3)}s`}
                  />
                );
              })}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={applyBest}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#22c55e',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Apply
            </button>
            <button
              onClick={close}
              style={{
                padding: '8px 12px',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
