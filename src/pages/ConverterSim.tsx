/**
 * Converter Sim - Torque Converter Simulation
 * 
 * Simulates torque converter behavior including:
 * - Stall speed prediction
 * - K-factor calculations
 * - Torque multiplication
 * - Flash stall vs foot-brake stall
 * - Efficiency curves
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

// Converter input parameters
interface ConverterInput {
  // Engine specs
  peakTorque: number;      // ft-lb
  peakTorqueRPM: number;   // RPM
  peakHP: number;          // HP
  peakHPRPM: number;       // RPM
  idleRPM: number;         // RPM
  
  // Converter specs
  converterDiameter: number;  // inches
  stallSpeed: number;         // RPM (manufacturer rated)
  kFactor: number;            // K-factor (typically 140-220)
  torqueRatio: number;        // Stall torque ratio (typically 1.8-2.5)
  
  // Vehicle specs
  vehicleWeight: number;   // lbs
  gearRatio: number;       // first gear ratio
  finalDrive: number;      // rear end ratio
  tireDiameter: number;    // inches
}

interface ConverterResult {
  flashStall: number;      // Flash stall RPM
  footBrakeStall: number;  // Foot-brake stall RPM
  effectiveKFactor: number;
  stallTorqueMult: number;
  couplingSpeed: number;   // RPM where converter locks up
  efficiency: number;      // Peak efficiency %
  slipAtCoupling: number;  // % slip at coupling point
}

// Default converter input
const defaultInput: ConverterInput = {
  peakTorque: 500,
  peakTorqueRPM: 5500,
  peakHP: 450,
  peakHPRPM: 6500,
  idleRPM: 850,
  
  converterDiameter: 10,
  stallSpeed: 3500,
  kFactor: 180,
  torqueRatio: 2.0,
  
  vehicleWeight: 3500,
  gearRatio: 2.48,
  finalDrive: 4.10,
  tireDiameter: 28,
};

// Calculate converter characteristics
function calculateConverter(input: ConverterInput): ConverterResult {
  const {
    stallSpeed,
    kFactor,
    torqueRatio,
    converterDiameter,
  } = input;
  
  // These will be used for advanced calculations in future
  void input.peakTorque;
  void input.peakTorqueRPM;
  void input.vehicleWeight;
  void input.gearRatio;
  void input.finalDrive;
  void input.tireDiameter;

  // K-factor formula: K = RPM / sqrt(Torque)
  // Stall RPM = K * sqrt(Engine Torque at stall)
  const effectiveKFactor = kFactor * (converterDiameter / 10); // Normalize to 10" converter
  
  // Flash stall is typically 200-400 RPM higher than foot-brake stall
  // due to the sudden torque application
  const footBrakeStall = stallSpeed;
  const flashStall = stallSpeed + 300;
  
  // Torque multiplication at stall
  const stallTorqueMult = torqueRatio;
  
  // Coupling speed (where efficiency approaches 1:1)
  // Typically 1.5-2x stall speed
  const couplingSpeed = stallSpeed * 1.8;
  
  // Peak efficiency (typically 85-92% for modern converters)
  const efficiency = 88 + (converterDiameter - 9) * 2; // Larger = more efficient
  
  // Slip at coupling point
  const slipAtCoupling = 100 - efficiency;
  
  return {
    flashStall,
    footBrakeStall,
    effectiveKFactor,
    stallTorqueMult,
    couplingSpeed,
    efficiency: Math.min(95, Math.max(80, efficiency)),
    slipAtCoupling,
  };
}

// Generate efficiency curve data
function generateEfficiencyCurve(input: ConverterInput, result: ConverterResult) {
  const data = [];
  const { stallSpeed } = input;
  const { couplingSpeed, efficiency } = result;
  
  for (let rpm = 0; rpm <= 8000; rpm += 200) {
    // Speed ratio for future use in advanced calculations
    // const speedRatio = rpm / couplingSpeed;
    
    // Efficiency curve (S-curve from 0 at stall to peak at coupling)
    let eff = 0;
    if (rpm < stallSpeed) {
      eff = 0;
    } else if (rpm >= couplingSpeed) {
      eff = efficiency;
    } else {
      // S-curve interpolation
      const t = (rpm - stallSpeed) / (couplingSpeed - stallSpeed);
      eff = efficiency * (3 * t * t - 2 * t * t * t);
    }
    
    // Torque ratio curve (decreases from stall ratio to 1:1)
    let torqueRatio = 1;
    if (rpm < stallSpeed) {
      torqueRatio = input.torqueRatio;
    } else if (rpm >= couplingSpeed) {
      torqueRatio = 1.0;
    } else {
      const t = (rpm - stallSpeed) / (couplingSpeed - stallSpeed);
      torqueRatio = input.torqueRatio - (input.torqueRatio - 1) * t;
    }
    
    // Slip percentage
    const slip = rpm < stallSpeed ? 100 : 100 - eff;
    
    data.push({
      rpm,
      efficiency: Math.round(eff * 10) / 10,
      torqueRatio: Math.round(torqueRatio * 100) / 100,
      slip: Math.round(slip * 10) / 10,
    });
  }
  
  return data;
}

export default function ConverterSim() {
  const [input, setInput] = useState<ConverterInput>(defaultInput);
  
  const result = useMemo(() => calculateConverter(input), [input]);
  const curveData = useMemo(() => generateEfficiencyCurve(input, result), [input, result]);
  
  const updateInput = (field: keyof ConverterInput, value: number) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Page 
      title="Converter Sim"
      actions={<Link to="/" className="btn">← Home</Link>}
    >
      <div style={{ padding: 'var(--space-4)', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 'var(--space-4)' }}>
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
                  <label className="label">Stall Speed (RPM)</label>
                  <input
                    type="number"
                    step="100"
                    className="input"
                    value={input.stallSpeed}
                    onChange={(e) => updateInput('stallSpeed', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">K-Factor</label>
                  <input
                    type="number"
                    className="input"
                    value={input.kFactor}
                    onChange={(e) => updateInput('kFactor', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Torque Ratio</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={input.torqueRatio}
                    onChange={(e) => updateInput('torqueRatio', parseFloat(e.target.value) || 0)}
                  />
                </div>
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
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Results</h3>
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
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Coupling Speed</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{Math.round(result.couplingSpeed)} RPM</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Stall Torque Mult</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.stallTorqueMult.toFixed(2)}x</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Peak Efficiency</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.efficiency.toFixed(1)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Effective K-Factor</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{result.effectiveKFactor.toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Efficiency & Torque Ratio Chart */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Converter Characteristics</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={curveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="rpm" 
                      stroke="var(--color-text-muted)"
                      tickFormatter={(v) => `${v/1000}k`}
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
                      domain={[0.8, 2.5]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-surface)', 
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <ReferenceLine 
                      x={input.stallSpeed} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5" 
                      label={{ value: 'Stall', fill: '#ef4444', fontSize: 12 }}
                    />
                    <ReferenceLine 
                      x={result.couplingSpeed} 
                      stroke="#f59e0b" 
                      strokeDasharray="5 5" 
                      label={{ value: 'Coupling', fill: '#f59e0b', fontSize: 12 }}
                    />
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
                      dataKey="torqueRatio" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      name="Torque Ratio"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Slip Chart */}
            <div className="card" style={{ padding: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Converter Slip</h3>
              <div style={{ height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={curveData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis 
                      dataKey="rpm" 
                      stroke="var(--color-text-muted)"
                      tickFormatter={(v) => `${v/1000}k`}
                    />
                    <YAxis 
                      stroke="#ef4444"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-surface)', 
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                      }}
                    />
                    <ReferenceLine 
                      x={input.stallSpeed} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="slip" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={false}
                      name="Slip %"
                    />
                  </LineChart>
                </ResponsiveContainer>
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
