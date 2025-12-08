/**
 * Converter Sim - Torque Converter Simulation
 * 
 * Physics-based torque converter simulation using:
 * - Speed Ratio (SR) = ω_turbine / ω_pump
 * - Torque Ratio (TR) characteristic curves
 * - Capacity Factor (K-factor) curves
 * - Efficiency: η = TR * SR
 * 
 * Based on industry-standard characteristic curve approach.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import Page from '../shared/components/Page';
import {
  type ConverterCurves,
  DEFAULT_STREET_STRIP_CURVES,
  HIGH_STALL_RACE_CURVES,
  TIGHT_EFFICIENT_CURVES,
  getTorqueRatio,
  getKFactor,
  calcStallSpeed,
  generateEfficiencyCurve,
  generateStallCurve,
} from '../domain/physics/models/converterPhysics';

// ============================================================================
// INTERFACES
// ============================================================================

interface ConverterInput {
  // Engine specs
  peakTorque: number;      // ft-lb
  peakTorqueRPM: number;   // RPM
  peakHP: number;          // HP
  peakHPRPM: number;       // RPM
  idleRPM: number;         // RPM
  
  // Converter specs
  converterDiameter: number;  // inches
  converterType: 'street' | 'race' | 'tight' | 'custom';
  customKFactorAtStall: number;
  customTorqueRatioAtStall: number;
  
  // Vehicle specs
  vehicleWeight: number;   // lbs
  gearRatio: number;       // first gear ratio
  finalDrive: number;      // rear end ratio
  tireDiameter: number;    // inches
  
  // Lockup clutch
  hasLockup: boolean;
  lockupSR: number;        // Speed ratio to engage lockup
}

interface ConverterResult {
  footBrakeStall: number;  // Foot-brake stall RPM
  flashStall: number;      // Flash stall RPM (higher due to sudden torque)
  effectiveKFactor: number;
  stallTorqueRatio: number;
  couplingSpeedRatio: number;  // SR where TR ≈ 1
  peakEfficiency: number;      // Peak efficiency %
  peakEfficiencySR: number;    // SR at peak efficiency
  slipAtStripe: number;        // Estimated slip % at finish line
}

// ============================================================================
// CONVERTER TYPE PRESETS
// ============================================================================

const CONVERTER_PRESETS: Record<string, { curves: ConverterCurves; description: string }> = {
  street: {
    curves: DEFAULT_STREET_STRIP_CURVES,
    description: 'Street/Strip - Balanced performance, 2.2:1 stall TR',
  },
  race: {
    curves: HIGH_STALL_RACE_CURVES,
    description: 'High Stall Race - Aggressive launch, 2.5:1 stall TR',
  },
  tight: {
    curves: TIGHT_EFFICIENT_CURVES,
    description: 'Tight/Efficient - Lower stall, better cruise efficiency',
  },
};

// ============================================================================
// DEFAULT INPUT
// ============================================================================

const defaultInput: ConverterInput = {
  peakTorque: 500,
  peakTorqueRPM: 5500,
  peakHP: 450,
  peakHPRPM: 6500,
  idleRPM: 850,
  
  converterDiameter: 10,
  converterType: 'street',
  customKFactorAtStall: 165,
  customTorqueRatioAtStall: 2.2,
  
  vehicleWeight: 3500,
  gearRatio: 2.48,
  finalDrive: 4.10,
  tireDiameter: 28,
  
  hasLockup: false,
  lockupSR: 0.90,
};

// ============================================================================
// PHYSICS CALCULATIONS
// ============================================================================

function getActiveCurves(input: ConverterInput): ConverterCurves {
  if (input.converterType === 'custom') {
    // Build custom curves based on user K-factor and TR at stall
    const baseK = input.customKFactorAtStall;
    const baseTR = input.customTorqueRatioAtStall;
    
    // Scale the default curves to match user's stall values
    const kScale = baseK / DEFAULT_STREET_STRIP_CURVES.capacityFactorPoints[0];
    const trScale = baseTR / DEFAULT_STREET_STRIP_CURVES.torqueRatioPoints[0];
    
    return {
      speedRatioPoints: DEFAULT_STREET_STRIP_CURVES.speedRatioPoints,
      torqueRatioPoints: DEFAULT_STREET_STRIP_CURVES.torqueRatioPoints.map((tr, i) => 
        i === 0 ? baseTR : 1 + (tr - 1) * trScale
      ),
      capacityFactorPoints: DEFAULT_STREET_STRIP_CURVES.capacityFactorPoints.map(k => k * kScale),
    };
  }
  
  return CONVERTER_PRESETS[input.converterType]?.curves || DEFAULT_STREET_STRIP_CURVES;
}

function calculateConverter(input: ConverterInput): ConverterResult {
  const curves = getActiveCurves(input);
  
  // Get K-factor at stall (SR = 0)
  const kAtStall = getKFactor(0, curves);
  
  // Get torque ratio at stall
  const stallTorqueRatio = getTorqueRatio(0, curves);
  
  // Calculate foot-brake stall speed using K-factor formula
  // N_stall = K * sqrt(T_engine)
  const footBrakeStall = calcStallSpeed(kAtStall, input.peakTorque);
  
  // Flash stall is typically 200-400 RPM higher due to sudden torque application
  // and inertia effects
  const flashStall = footBrakeStall + 300;
  
  // Find coupling point (where TR ≈ 1.0)
  let couplingSpeedRatio = 0.9;
  for (let sr = 0; sr <= 1; sr += 0.01) {
    if (getTorqueRatio(sr, curves) <= 1.02) {
      couplingSpeedRatio = sr;
      break;
    }
  }
  
  // Calculate peak efficiency and the SR where it occurs
  // η = TR * SR, peaks somewhere around SR = 0.8-0.9
  let peakEfficiency = 0;
  let peakEfficiencySR = 0;
  for (let sr = 0; sr <= 1; sr += 0.01) {
    const tr = getTorqueRatio(sr, curves);
    const eff = tr * sr * 100;
    if (eff > peakEfficiency) {
      peakEfficiency = eff;
      peakEfficiencySR = sr;
    }
  }
  
  // Estimate slip at the stripe (typically SR around 0.92-0.98 at high speed)
  const stripeSpeedRatio = 0.95;
  const slipAtStripe = (1 - stripeSpeedRatio) * 100;
  
  // Effective K-factor (scaled by diameter)
  const effectiveKFactor = kAtStall * (input.converterDiameter / 10);
  
  return {
    footBrakeStall: Math.round(footBrakeStall),
    flashStall: Math.round(flashStall),
    effectiveKFactor: Math.round(effectiveKFactor),
    stallTorqueRatio,
    couplingSpeedRatio,
    peakEfficiency: Math.round(peakEfficiency * 10) / 10,
    peakEfficiencySR,
    slipAtStripe: Math.round(slipAtStripe * 10) / 10,
  };
}

export default function ConverterSim() {
  const [input, setInput] = useState<ConverterInput>(defaultInput);
  
  const result = useMemo(() => calculateConverter(input), [input]);
  const curves = useMemo(() => getActiveCurves(input), [input]);
  const curveData = useMemo(() => generateEfficiencyCurve(curves), [curves]);
  const stallData = useMemo(() => generateStallCurve(curves, 200, 800), [curves]);
  
  const updateInput = <K extends keyof ConverterInput>(field: K, value: ConverterInput[K]) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Page 
      title="Converter Sim"
      actions={<Link to="/" className="btn">← Home</Link>}
    >
      <div style={{ padding: 'var(--space-4)', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 'var(--space-4)' }}>
          {/* Input Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Engine Specs */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Engine Specs</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div>
                  <label className="label">Peak Torque (ft-lb)</label>
                  <input
                    type="number"
                    className="input"
                    value={input.peakTorque}
                    onChange={(e) => updateInput('peakTorque', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">@ RPM</label>
                  <input
                    type="number"
                    className="input"
                    value={input.peakTorqueRPM}
                    onChange={(e) => updateInput('peakTorqueRPM', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Peak HP</label>
                  <input
                    type="number"
                    className="input"
                    value={input.peakHP}
                    onChange={(e) => updateInput('peakHP', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">@ RPM</label>
                  <input
                    type="number"
                    className="input"
                    value={input.peakHPRPM}
                    onChange={(e) => updateInput('peakHPRPM', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Idle RPM</label>
                  <input
                    type="number"
                    className="input"
                    value={input.idleRPM}
                    onChange={(e) => updateInput('idleRPM', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Converter Specs */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Converter Specs</h3>
              
              {/* Converter Type Selector */}
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label className="label">Converter Type</label>
                <select
                  className="input"
                  value={input.converterType}
                  onChange={(e) => updateInput('converterType', e.target.value as ConverterInput['converterType'])}
                  style={{ width: '100%' }}
                >
                  <option value="street">Street/Strip (2.2:1 TR)</option>
                  <option value="race">High Stall Race (2.5:1 TR)</option>
                  <option value="tight">Tight/Efficient (1.9:1 TR)</option>
                  <option value="custom">Custom Curves</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {CONVERTER_PRESETS[input.converterType]?.description || 'Define custom K-factor and TR'}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div>
                  <label className="label">Diameter (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    value={input.converterDiameter}
                    onChange={(e) => updateInput('converterDiameter', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Lockup Clutch</label>
                  <select
                    className="input"
                    value={input.hasLockup ? 'yes' : 'no'}
                    onChange={(e) => updateInput('hasLockup', e.target.value === 'yes')}
                  >
                    <option value="no">No Lockup</option>
                    <option value="yes">Has Lockup</option>
                  </select>
                </div>
                
                {input.converterType === 'custom' && (
                  <>
                    <div>
                      <label className="label">K-Factor @ Stall</label>
                      <input
                        type="number"
                        className="input"
                        value={input.customKFactorAtStall}
                        onChange={(e) => updateInput('customKFactorAtStall', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="label">TR @ Stall</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input"
                        value={input.customTorqueRatioAtStall}
                        onChange={(e) => updateInput('customTorqueRatioAtStall', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Vehicle Specs */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Vehicle Specs</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div>
                  <label className="label">Weight (lbs)</label>
                  <input
                    type="number"
                    className="input"
                    value={input.vehicleWeight}
                    onChange={(e) => updateInput('vehicleWeight', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">First Gear</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={input.gearRatio}
                    onChange={(e) => updateInput('gearRatio', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Final Drive</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={input.finalDrive}
                    onChange={(e) => updateInput('finalDrive', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Tire Dia (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    value={input.tireDiameter}
                    onChange={(e) => updateInput('tireDiameter', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="card" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-primary)', color: 'white' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Predicted Performance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Flash Stall</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.flashStall} RPM</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Foot-Brake Stall</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.footBrakeStall} RPM</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Coupling SR</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{(result.couplingSpeedRatio * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Stall Torque Ratio</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.stallTorqueRatio.toFixed(2)}:1</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Peak Efficiency</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.peakEfficiency.toFixed(1)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Effective K-Factor</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.effectiveKFactor}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Slip @ Stripe</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.slipAtStripe}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Peak Eff SR</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{(result.peakEfficiencySR * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Efficiency & Torque Ratio Chart - Speed Ratio based */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Converter Characteristics vs Speed Ratio</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={curveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="sr" 
                      stroke="var(--color-text-muted)"
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      label={{ value: 'Speed Ratio (SR)', position: 'bottom', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="eff"
                      stroke="#22c55e"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis 
                      yAxisId="ratio"
                      orientation="right"
                      stroke="#3b82f6"
                      domain={[0.8, 3]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-surface)', 
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'Torque Ratio' ? `${value.toFixed(2)}:1` : `${value.toFixed(1)}%`,
                        name
                      ]}
                      labelFormatter={(sr) => `Speed Ratio: ${(sr * 100).toFixed(0)}%`}
                    />
                    <Legend />
                    {result.couplingSpeedRatio > 0 && result.couplingSpeedRatio <= 1 && (
                      <ReferenceLine 
                        x={result.couplingSpeedRatio} 
                        stroke="#f59e0b" 
                        strokeDasharray="5 5" 
                        label={{ value: 'Coupling', fill: '#f59e0b', fontSize: 12 }}
                      />
                    )}
                    {result.peakEfficiencySR > 0 && result.peakEfficiencySR <= 1 && (
                      <ReferenceLine 
                        x={result.peakEfficiencySR} 
                        stroke="#22c55e" 
                        strokeDasharray="5 5" 
                        label={{ value: 'Peak η', fill: '#22c55e', fontSize: 12 }}
                      />
                    )}
                    <Area 
                      yAxisId="eff"
                      type="monotone" 
                      dataKey="efficiency" 
                      fill="#22c55e" 
                      fillOpacity={0.2}
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Efficiency %"
                    />
                    <Line 
                      yAxisId="ratio"
                      type="monotone" 
                      dataKey="tr" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      name="Torque Ratio"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stall Speed vs Engine Torque Chart */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Stall Speed vs Engine Torque</h3>
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stallData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="torque" 
                      stroke="var(--color-text-muted)"
                      label={{ value: 'Engine Torque (ft-lb)', position: 'bottom', offset: -5 }}
                    />
                    <YAxis 
                      stroke="#ef4444"
                      domain={['auto', 'auto']}
                      label={{ value: 'Stall RPM', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-surface)', 
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${Math.round(value)} RPM`, 'Stall Speed']}
                      labelFormatter={(torque) => `${torque} ft-lb`}
                    />
                    {input.peakTorque >= 200 && input.peakTorque <= 800 && (
                      <ReferenceLine 
                        x={input.peakTorque} 
                        stroke="#3b82f6" 
                        strokeDasharray="5 5"
                        label={{ value: 'Your Engine', fill: '#3b82f6', fontSize: 12 }}
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="stallRPM" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={false}
                      name="Stall RPM"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '8px', textAlign: 'center' }}>
                Based on K-factor formula: Stall = K × √Torque
              </div>
            </div>

            {/* Info Panel */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>Understanding Converter Specs</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                <p><strong>Stall Speed:</strong> The RPM at which the converter allows the engine to rev against a locked output shaft. Higher stall = more launch RPM.</p>
                <p style={{ marginTop: '8px' }}><strong>K-Factor:</strong> A measure of converter efficiency. K = RPM / √Torque. Lower K = tighter converter, higher K = looser.</p>
                <p style={{ marginTop: '8px' }}><strong>Torque Ratio:</strong> The multiplication of engine torque at stall. A 2.0 ratio means the converter doubles torque at stall.</p>
                <p style={{ marginTop: '8px' }}><strong>Coupling Speed:</strong> The RPM where the converter approaches 1:1 efficiency and minimal slip.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
