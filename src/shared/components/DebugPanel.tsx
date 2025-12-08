/**
 * Debug Panel Component
 * 
 * A collapsible panel that displays simulation debug information.
 * Only visible to users with the 'dev_tools' feature (owners/admins).
 */

import { useState } from 'react';
import { useFeature } from '../../domain/auth';

export interface DebugData {
  fuelType?: {
    resolved: string;
    fuelSystemType: number;
    vehicleFuelType?: string;
    vehicleFuelSystem?: string;
  };
  hpCurve?: {
    length: number;
    peakHP: number;
    rpmRange: string;
  };
  simParams?: {
    weight: number;
    tireDia: number;
    wheelbase: number;
    finalDrive: number;
    NGR: number;
    peakHP: number;
    stallRPM: number;
    slippage: number;
    isClutch: boolean;
    tractionIndex: number;
    trackTempEffect: number;
    pmi: {
      engine: number;
      trans: number;
      tires: number;
    };
  };
  airCalc?: {
    rho_lbm_ft3: number;
    hpc: number;
  };
  result?: {
    et: number;
    mph: number;
  };
}

interface DebugPanelProps {
  data: DebugData | null;
  title?: string;
}

export function DebugPanel({ data, title = 'Simulation Debug' }: DebugPanelProps) {
  const hasDevTools = useFeature('dev_tools');
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show to users with dev_tools feature
  if (!hasDevTools || !data) {
    return null;
  }

  return (
    <div style={{
      marginTop: '1rem',
      border: '1px solid var(--color-warning)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'rgba(234, 179, 8, 0.1)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--color-warning)',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        <span>🔧 {title}</span>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div style={{
          padding: '0.75rem 1rem',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          color: 'var(--color-text-secondary)',
          borderTop: '1px solid var(--color-warning)',
        }}>
          {/* Fuel Type */}
          {data.fuelType && (
            <Section title="Fuel Type">
              <Row label="Resolved" value={data.fuelType.resolved} />
              <Row label="VB6 Type" value={data.fuelType.fuelSystemType} />
              {data.fuelType.vehicleFuelType && (
                <Row label="vehicle.fuelType" value={data.fuelType.vehicleFuelType} />
              )}
              {data.fuelType.vehicleFuelSystem && (
                <Row label="vehicle.fuelSystem" value={data.fuelType.vehicleFuelSystem} warn />
              )}
            </Section>
          )}

          {/* HP Curve */}
          {data.hpCurve && (
            <Section title="HP Curve">
              <Row label="Points" value={data.hpCurve.length} />
              <Row label="Peak HP" value={data.hpCurve.peakHP} />
              <Row label="RPM Range" value={data.hpCurve.rpmRange} />
            </Section>
          )}

          {/* Air/HPC Calculation */}
          {data.airCalc && (
            <Section title="Air/HPC">
              <Row label="Air Density" value={`${data.airCalc.rho_lbm_ft3.toFixed(4)} lbm/ft³`} />
              <Row label="HPC" value={data.airCalc.hpc.toFixed(4)} />
            </Section>
          )}

          {/* Simulation Parameters */}
          {data.simParams && (
            <Section title="Simulation Parameters">
              <Row label="Weight" value={`${data.simParams.weight} lb`} />
              <Row label="Tire Dia" value={`${data.simParams.tireDia.toFixed(1)}"`} />
              <Row label="Wheelbase" value={`${data.simParams.wheelbase}"`} />
              <Row label="Final Drive" value={data.simParams.finalDrive.toFixed(2)} />
              <Row label="# Gears" value={data.simParams.NGR} />
              <Row label="Peak HP" value={data.simParams.peakHP} />
              <Row label="Stall RPM" value={data.simParams.stallRPM} />
              <Row label="Slippage" value={data.simParams.slippage.toFixed(4)} 
                   warn={data.simParams.slippage === 1} />
              <Row label="Clutch" value={data.simParams.isClutch ? 'Yes' : 'No (Converter)'} />
              <Row label="Traction Index" value={data.simParams.tractionIndex} />
              <Row label="Track Temp Effect" value={data.simParams.trackTempEffect.toFixed(4)} />
              <Row label="PMI (Engine)" value={data.simParams.pmi.engine.toFixed(3)} />
              <Row label="PMI (Trans)" value={data.simParams.pmi.trans.toFixed(3)} />
              <Row label="PMI (Tires)" value={data.simParams.pmi.tires.toFixed(3)} />
            </Section>
          )}

          {/* Result */}
          {data.result && (
            <Section title="Result">
              <Row label="ET" value={`${data.result.et.toFixed(3)}s`} />
              <Row label="MPH" value={`${data.result.mph.toFixed(1)} mph`} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ 
        fontWeight: 600, 
        color: 'var(--color-text)', 
        marginBottom: '0.25rem',
        fontSize: '0.8rem',
      }}>
        {title}
      </div>
      <div style={{ paddingLeft: '0.5rem' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      padding: '0.125rem 0',
      color: warn ? 'var(--color-warning)' : undefined,
    }}>
      <span style={{ opacity: 0.7 }}>{label}:</span>
      <span style={{ fontWeight: warn ? 600 : 400 }}>{value}</span>
    </div>
  );
}

export default DebugPanel;
