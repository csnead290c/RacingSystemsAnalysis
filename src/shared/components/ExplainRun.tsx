import { useState } from 'react';
import type { SimResult } from '../../domain/physics';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import type { Env } from '../../domain/schemas/env.schema';

interface BaselineResult {
  et_s: number;
  mph: number;
}

interface ExplainRunProps {
  simResult: SimResult;
  vehicle: Vehicle;
  env: Env;
  baselineResult?: BaselineResult; // Optional comparison baseline (just ET/MPH needed)
}

interface Factor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  value: string;
  contribution?: string; // e.g., "+0.05s" or "-0.02s"
}

/**
 * Explains why the ET is what it is by breaking down contributing factors.
 * This is a key differentiator vs competitors with "black box" predictions.
 */
export default function ExplainRun({ simResult, vehicle, env, baselineResult }: ExplainRunProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate factors that affect ET
  const factors: Factor[] = [];

  // Power-to-weight ratio
  const powerToWeight = ((vehicle.powerHP ?? 500) / (vehicle.weightLb ?? 3000)) * 1000;
  factors.push({
    name: 'Power-to-Weight',
    impact: powerToWeight > 5 ? 'positive' : powerToWeight < 3 ? 'negative' : 'neutral',
    description: 'Higher ratio = faster acceleration',
    value: `${powerToWeight.toFixed(2)} HP/1000 lb`,
  });

  // Weather/DA impact
  const da = calculateDA(env);
  const daImpact = da > 3000 ? 'negative' : da < 1000 ? 'positive' : 'neutral';
  factors.push({
    name: 'Density Altitude',
    impact: daImpact,
    description: da > 2000 
      ? 'High DA reduces engine power output' 
      : 'Good air density for power',
    value: `${da.toFixed(0)} ft`,
    contribution: da > 2000 ? `+${((da - 1000) * 0.00005).toFixed(3)}s` : undefined,
  });

  // Temperature impact
  const tempImpact = (env.temperatureF ?? 75) > 90 ? 'negative' : (env.temperatureF ?? 75) < 60 ? 'positive' : 'neutral';
  factors.push({
    name: 'Air Temperature',
    impact: tempImpact,
    description: (env.temperatureF ?? 75) > 85 
      ? 'Hot air is less dense, reducing power' 
      : 'Cooler air improves power',
    value: `${env.temperatureF ?? 75}°F`,
  });

  // Traction
  const tractionIndex = env.tractionIndex ?? 5;
  const tractionImpact = tractionIndex >= 7 ? 'positive' : tractionIndex <= 3 ? 'negative' : 'neutral';
  factors.push({
    name: 'Track Traction',
    impact: tractionImpact,
    description: tractionIndex >= 7 
      ? 'Excellent traction for hard launches' 
      : tractionIndex <= 3 
        ? 'Poor traction may cause wheelspin' 
        : 'Moderate traction conditions',
    value: `${tractionIndex}/10`,
  });

  // Gear ratio analysis
  const rearGear = vehicle.rearGear ?? 3.73;
  factors.push({
    name: 'Final Drive Ratio',
    impact: 'neutral',
    description: rearGear > 4.5 
      ? 'Aggressive gearing for quick acceleration' 
      : rearGear < 3.5 
        ? 'Tall gearing for top speed' 
        : 'Balanced gearing',
    value: `${rearGear.toFixed(2)}:1`,
  });

  // Transmission type
  if (vehicle.transmissionType === 'converter') {
    const stallRPM = vehicle.converterStallRPM ?? 3000;
    factors.push({
      name: 'Converter Stall',
      impact: stallRPM > 4000 ? 'positive' : stallRPM < 2500 ? 'negative' : 'neutral',
      description: stallRPM > 4000 
        ? 'High stall helps launch in powerband' 
        : stallRPM < 2500 
          ? 'Low stall may bog off the line' 
          : 'Moderate stall speed',
      value: `${stallRPM} RPM`,
    });
  }

  // 60' analysis (if available from timeslip)
  const sixtyFtSplit = simResult.timeslip?.find(s => s.d_ft === 60);
  if (sixtyFtSplit) {
    const sixtyFt = sixtyFtSplit.t_s;
    const sixtyImpact = sixtyFt < 1.3 ? 'positive' : sixtyFt > 1.6 ? 'negative' : 'neutral';
    factors.push({
      name: '60\' Time',
      impact: sixtyImpact,
      description: sixtyFt < 1.3 
        ? 'Excellent launch - strong 60\' time' 
        : sixtyFt > 1.6 
          ? 'Slow 60\' hurting overall ET' 
          : 'Decent launch',
      value: `${sixtyFt.toFixed(3)}s`,
    });
  }

  // Comparison to baseline
  let comparison: { etDelta: number; mphDelta: number } | null = null;
  if (baselineResult) {
    comparison = {
      etDelta: simResult.et_s - baselineResult.et_s,
      mphDelta: simResult.mph - baselineResult.mph,
    };
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: '8px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Explain This Run</span>
        </div>
        <span style={{ 
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ▼
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Summary */}
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--color-bg)',
            borderRadius: '6px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Predicted Performance
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{simResult.et_s.toFixed(3)}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}> sec</span>
              </div>
              <div>
                <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{simResult.mph.toFixed(1)}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}> mph</span>
              </div>
            </div>
            {comparison && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: comparison.etDelta > 0 ? '#ef4444' : '#22c55e' }}>
                  {comparison.etDelta > 0 ? '+' : ''}{comparison.etDelta.toFixed(3)}s
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}> vs baseline</span>
              </div>
            )}
          </div>

          {/* Factors */}
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-muted)' }}>
            CONTRIBUTING FACTORS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {factors.map((factor, i) => (
              <div 
                key={i}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${
                    factor.impact === 'positive' ? '#22c55e' : 
                    factor.impact === 'negative' ? '#ef4444' : 
                    'var(--color-border)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{factor.name}</span>
                  <span style={{ 
                    fontWeight: 600, 
                    fontSize: '0.85rem',
                    color: factor.impact === 'positive' ? '#22c55e' : 
                           factor.impact === 'negative' ? '#ef4444' : 
                           'var(--color-text)',
                  }}>
                    {factor.value}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {factor.description}
                  {factor.contribution && (
                    <span style={{ 
                      marginLeft: '8px', 
                      color: factor.impact === 'negative' ? '#ef4444' : '#22c55e',
                      fontWeight: 600,
                    }}>
                      ({factor.contribution})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)', marginBottom: '6px' }}>
              💡 Quick Tips
            </div>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '16px', 
              fontSize: '0.8rem', 
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
            }}>
              {da > 2500 && <li>High DA is hurting power. Consider waiting for cooler conditions.</li>}
              {(env.temperatureF ?? 75) > 90 && <li>Hot temps reducing air density. Watch for detonation.</li>}
              {tractionIndex <= 3 && <li>Poor traction may cause wheelspin. Consider softer launch.</li>}
              {sixtyFtSplit && sixtyFtSplit.t_s > 1.5 && (
                <li>60' time is slow. Focus on launch technique or converter stall.</li>
              )}
              {powerToWeight < 3 && <li>Low power-to-weight ratio. Consider weight reduction.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate density altitude
function calculateDA(env: Env): number {
  const tempF = env.temperatureF ?? 75;
  const baroInHg = env.barometerInHg ?? 29.92;
  const humidity = (env.humidityPct ?? 50) / 100;
  const elevation = env.elevation ?? 0;

  // Simplified DA calculation
  // DA = Elevation + (120 * (tempF - 59)) + (1.6 * elevation * humidity)
  const tempCorrection = 120 * (tempF - 59);
  const pressureCorrection = (29.92 - baroInHg) * 1000;
  const humidityCorrection = humidity * 1000;

  return elevation + tempCorrection + pressureCorrection + humidityCorrection;
}
