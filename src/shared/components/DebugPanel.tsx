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
    aero?: {
      frontalArea: number;
      cd: number;
      cl: number;
    };
    launchRPM?: number;
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
          fontSize: '0.7rem',
          fontFamily: 'monospace',
          color: 'var(--color-text-secondary)',
          borderTop: '1px solid var(--color-warning)',
          maxHeight: '250px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.5rem 1rem',
        }}>
          {/* Fuel Type */}
          {data.fuelType && (
            <Section title="Fuel Type">
              <Row label="Resolved" value={data.fuelType.resolved} />
              <Row label="VB6 Type" value={data.fuelType.fuelSystemType} />
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
              <Row label="ρ" value={`${data.airCalc.rho_lbm_ft3.toFixed(4)} lbm/ft³`} />
              <Row label="HPC" value={data.airCalc.hpc.toFixed(4)} />
            </Section>
          )}

          {/* Vehicle */}
          {data.simParams && (
            <Section title="Vehicle">
              <Row label="Weight" value={`${data.simParams.weight} lb`} />
              <Row label="Tire Dia" value={`${data.simParams.tireDia.toFixed(1)}"`} />
              <Row label="Wheelbase" value={`${data.simParams.wheelbase}"`} />
              <Row label="Final Drive" value={data.simParams.finalDrive.toFixed(2)} />
              <Row label="Gears" value={data.simParams.NGR} />
            </Section>
          )}

          {/* Drivetrain */}
          {data.simParams && (
            <Section title="Drivetrain">
              <Row label="Launch RPM" value={data.simParams.launchRPM ?? 'N/A'} />
              <Row label="Stall RPM" value={data.simParams.stallRPM} />
              {(data.simParams as any).shiftRPMs && (
                <Row label="Shift RPMs" value={JSON.stringify((data.simParams as any).shiftRPMs)} />
              )}
              <Row label="Slippage" value={data.simParams.slippage.toFixed(4)} 
                   warn={data.simParams.slippage === 1} />
              {(data.simParams as any).slippageSource && (
                <Row label="Slip Source" value={(data.simParams as any).slippageSource} />
              )}
              {(data.simParams as any).vehicleClutchSlippage !== undefined && (
                <Row label="v.clutchSlippage" value={String((data.simParams as any).vehicleClutchSlippage)} />
              )}
              <Row label="Clutch" value={data.simParams.isClutch ? 'Yes' : 'Converter'} />
              {(data.simParams as any).gearEfficiencies && (
                <Row label="Gear Eff" value={JSON.stringify((data.simParams as any).gearEfficiencies.map((e: number) => e.toFixed(3)))} />
              )}
              {(data.simParams as any).overallEfficiency !== undefined && (
                <Row label="Overall Eff" value={(data.simParams as any).overallEfficiency.toFixed(3)} />
              )}
            </Section>
          )}

          {/* Aero */}
          {data.simParams?.aero && (
            <Section title="Aero">
              <Row label="Frontal Area" value={`${data.simParams.aero.frontalArea.toFixed(1)} ft²`} />
              <Row label="Cd" value={data.simParams.aero.cd.toFixed(3)} />
              <Row label="Cl" value={data.simParams.aero.cl.toFixed(3)} />
            </Section>
          )}

          {/* Weight Transfer */}
          {data.simParams && (
            <Section title="Weight Transfer">
              <Row label="YCG" value={`${((data.simParams as any).ycg ?? 0).toFixed(2)}"`} />
              <Row label="Static FWt" value={`${((data.simParams as any).staticFWt ?? 0).toFixed(1)} lb`} />
              <Row label="Ags0" value={`${((data.simParams as any).ags0 ?? 0).toFixed(3)} g`} />
              <Row label="TireSlip" value={((data.simParams as any).tireSlipAtLaunch ?? 0).toFixed(4)} />
              <Row label="Overhang" value={`${((data.simParams as any).overhangIn ?? 0).toFixed(1)}"`} />
              <Row label="Rollout" value={`${((data.simParams as any).rolloutIn ?? 0).toFixed(1)}"`} />
            </Section>
          )}

          {/* Traction */}
          {data.simParams && (
            <Section title="Traction">
              <Row label="Index" value={data.simParams.tractionIndex} />
              <Row label="Track Effect" value={data.simParams.trackTempEffect.toFixed(4)} />
            </Section>
          )}

          {/* PMI */}
          {data.simParams && (
            <Section title="PMI">
              <Row label="Engine" value={data.simParams.pmi.engine.toFixed(3)} />
              <Row label="Trans" value={data.simParams.pmi.trans.toFixed(3)} />
              <Row label="Tires" value={data.simParams.pmi.tires.toFixed(3)} />
            </Section>
          )}

          {/* Result */}
          {data.result && (
            <Section title="Result">
              <Row label="ET" value={`${data.result.et.toFixed(3)}s`} />
              <Row label="MPH" value={`${data.result.mph.toFixed(1)} mph`} />
              {(data.result as any).rolloutTime_s !== undefined && (
                <Row label="Rollout Time" value={`${((data.result as any).rolloutTime_s).toFixed(3)}s`} />
              )}
            </Section>
          )}
        </div>
      )}

      {/* Run Trace - VB6 style detailed printout */}
      {isExpanded && (data as any).runTrace && (
        <div style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--color-warning)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ 
            fontWeight: 600, 
            color: 'var(--color-text)', 
            marginBottom: '0.5rem',
            fontSize: '0.8rem',
          }}>
            Run Trace (VB6 Style)
          </div>
          <pre style={{
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            lineHeight: 1.4,
            margin: 0,
            maxHeight: '300px',
            overflowY: 'auto',
            whiteSpace: 'pre',
            color: 'var(--color-text-secondary)',
          }}>
            {(data as any).runTrace}
          </pre>
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
