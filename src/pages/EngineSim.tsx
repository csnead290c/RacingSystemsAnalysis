import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Page from '../shared/components/Page';
import { useSubscription } from '../domain/config/useSubscription';
import {
  simulateEngine,
  createDefaultEngineJrConfig,
  createDefaultEngineProConfig,
  calcDisplacement,
  type EngineSimConfig,
} from '../domain/physics/engine/engineAdapter';
import type { EngineOutputs } from '../domain/physics/engine/engineTypes';

export default function EngineSim() {
  const { features } = useSubscription();
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [config, setConfig] = useState<EngineSimConfig>(createDefaultEngineJrConfig());

  // Toggle between simple and advanced mode
  const toggleMode = () => {
    const newMode = mode === 'simple' ? 'advanced' : 'simple';
    setMode(newMode);
    // Load appropriate default config
    setConfig(newMode === 'simple' ? createDefaultEngineJrConfig() : createDefaultEngineProConfig());
  };

  const displacement = useMemo(
    () => calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders),
    [config.bore_in, config.stroke_in, config.numCylinders]
  );

  const result: EngineOutputs = useMemo(() => simulateEngine(config), [config]);

  // Generate dyno curve data (simplified - full curve generation would be in recommendations)
  const chartData = useMemo(() => {
    const data = [];
    const rpmStart = Math.floor(result.rpmPeakTQ * 0.7 / 100) * 100;
    const rpmEnd = Math.ceil(result.redline / 100) * 100;
    const step = 250;

    for (let rpm = rpmStart; rpm <= rpmEnd; rpm += step) {
      // Simple interpolation for display (not VB6-exact curve)
      const tqRatio = Math.exp(-Math.pow((rpm - result.rpmPeakTQ) / 2000, 2));
      const hpRatio = Math.exp(-Math.pow((rpm - result.rpmPeakHP) / 2000, 2));
      
      data.push({
        rpm,
        hp: Math.round(result.peakHP * hpRatio),
        torque: Math.round(result.peakTQ * tqRatio),
      });
    }
    return data;
  }, [result]);

  const updateConfig = (updates: Partial<EngineSimConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const isAdvancedMode = mode === 'advanced';
  const canUseAdvanced = features.quarterProFields;

  return (
    <Page title={isAdvancedMode ? 'ENGINE Pro' : 'ENGINE Jr'}>
      <div style={styles.container}>
        {/* Mode Toggle */}
        <div style={styles.modeToggle}>
          <button
            style={{
              ...styles.modeButton,
              ...(mode === 'simple' ? styles.modeButtonActive : {}),
            }}
            onClick={() => !isAdvancedMode && toggleMode()}
          >
            Simple Mode (Engine Jr)
          </button>
          <button
            style={{
              ...styles.modeButton,
              ...(mode === 'advanced' ? styles.modeButtonActive : {}),
            }}
            onClick={() => isAdvancedMode || !canUseAdvanced ? null : toggleMode()}
            disabled={!canUseAdvanced}
          >
            Advanced Mode (Engine Pro) {!canUseAdvanced && '🔒'}
          </button>
        </div>

        {/* Main Layout */}
        <div style={styles.mainLayout}>
          {/* Left Column - Inputs */}
          <div style={styles.leftColumn}>
            {/* Basic Engine Design */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Engine Design</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Number of Cylinders</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.numCylinders}
                  onChange={e => updateConfig({ numCylinders: parseInt(e.target.value) || 8 })}
                  min={1}
                  max={12}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Layout</label>
                <select
                  style={styles.select}
                  value={config.layout}
                  onChange={e => updateConfig({ layout: e.target.value as any })}
                >
                  <option value="inline">Inline</option>
                  <option value="vee">Vee</option>
                  <option value="flat">Flat/Opposed</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Bore (inches)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.bore_in}
                  onChange={e => updateConfig({ bore_in: parseFloat(e.target.value) || 4.0 })}
                  step={0.001}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Stroke (inches)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.stroke_in}
                  onChange={e => updateConfig({ stroke_in: parseFloat(e.target.value) || 3.5 })}
                  step={0.001}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Rod Length (inches)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.rodLength_in}
                  onChange={e => updateConfig({ rodLength_in: parseFloat(e.target.value) || 6.0 })}
                  step={0.001}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Compression Ratio</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.compressionRatio}
                  onChange={e => updateConfig({ compressionRatio: parseFloat(e.target.value) || 10.0 })}
                  step={0.1}
                />
              </div>

              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Displacement:</span>
                <span style={styles.resultValue}>{displacement.toFixed(1)} CID</span>
              </div>
            </div>

            {/* Camshaft */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Camshaft</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Cam Type</label>
                <select
                  style={styles.select}
                  value={config.camshaftType}
                  onChange={e => updateConfig({ camshaftType: e.target.value as any })}
                >
                  <option value="overhead_cam">Overhead Cam</option>
                  <option value="roller">Roller</option>
                  <option value="mushroom_tappet">Mushroom Tappet</option>
                  <option value="high_rate_flat_tappet">High Rate Flat Tappet</option>
                  <option value="normal_flat_tappet">Normal Flat Tappet</option>
                  <option value="hydraulic_roller">Hydraulic Roller</option>
                  <option value="hydraulic_flat_tappet">Hydraulic Flat Tappet</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Duration @ 0.050" (degrees)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.intakeDuration050_deg}
                  onChange={e => updateConfig({ intakeDuration050_deg: parseFloat(e.target.value) || 220 })}
                />
              </div>
            </div>

            {/* Fuel & Induction */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Fuel & Induction</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Fuel Type</label>
                <select
                  style={styles.select}
                  value={config.fuelType}
                  onChange={e => updateConfig({ fuelType: e.target.value as any })}
                >
                  <option value="gasoline">Gasoline</option>
                  <option value="racing_gasoline">Racing Gasoline</option>
                  <option value="methanol">Methanol</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Induction</label>
                <select
                  style={styles.select}
                  value={config.isEFI ? 'efi' : 'carb'}
                  onChange={e => updateConfig({ isEFI: e.target.value === 'efi' })}
                >
                  <option value="carb">Carburetor</option>
                  <option value="efi">Fuel Injection</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>
                  {config.isEFI ? 'Throttle Body' : 'Carburetor'} CFM @ 1.5" Hg
                </label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.throttleCFM_at_1_5inHg}
                  onChange={e => updateConfig({ throttleCFM_at_1_5inHg: parseFloat(e.target.value) || 600 })}
                />
              </div>
            </div>

            {/* Intake Manifold */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Intake Manifold</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Manifold Type</label>
                <select
                  style={styles.select}
                  value={config.intakeManifoldType}
                  onChange={e => updateConfig({ intakeManifoldType: e.target.value as any })}
                >
                  <option value="plenum">Common Plenum</option>
                  <option value="individual_runner">Individual Runner</option>
                  <option value="dual_plane_divided">Dual Plane - Divided</option>
                  <option value="dual_plane_slot">Dual Plane - Slot</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Runner Style</label>
                <select
                  style={styles.select}
                  value={config.runnerStyle}
                  onChange={e => updateConfig({ runnerStyle: e.target.value as any })}
                >
                  <option value="straight">Straight</option>
                  <option value="curved">Curved</option>
                </select>
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Flow Factor (%)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.intakeManifoldFlowFactor_pct}
                  onChange={e => updateConfig({ intakeManifoldFlowFactor_pct: parseFloat(e.target.value) || 96 })}
                  min={50}
                  max={100}
                />
              </div>
            </div>

            {/* Cylinder Head */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Cylinder Head</div>
              
              <div style={styles.inputRow}>
                <label style={styles.label}>Intake Valves per Cylinder</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.numIntakeValvesPerCyl}
                  onChange={e => updateConfig({ numIntakeValvesPerCyl: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={4}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Intake Valve Diameter (inches)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.intakeValveDia_in}
                  onChange={e => updateConfig({ intakeValveDia_in: parseFloat(e.target.value) || 2.0 })}
                  step={0.01}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Max Intake Flow (CFM)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.maxIntakeFlow_cfm}
                  onChange={e => updateConfig({ maxIntakeFlow_cfm: parseFloat(e.target.value) || 220 })}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Flow Test Pressure (in H2O)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.flowTestPressure_inH2O}
                  onChange={e => updateConfig({ flowTestPressure_inH2O: parseFloat(e.target.value) || 28 })}
                />
              </div>

              <div style={styles.inputRow}>
                <label style={styles.label}>Flow Test Bore Diameter (inches)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={config.flowTestBoreDia_in}
                  onChange={e => updateConfig({ flowTestBoreDia_in: parseFloat(e.target.value) || 4.0 })}
                  step={0.001}
                />
              </div>
            </div>

            {/* Advanced: Compression Ratio Worksheet */}
            {isAdvancedMode && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Compression Ratio Worksheet 🔒</div>
                
                <div style={styles.inputRow}>
                  <label style={styles.label}>Combustion Chamber (cc)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={config.combustionChamberVolume_cc || ''}
                    onChange={e => updateConfig({ combustionChamberVolume_cc: parseFloat(e.target.value) || undefined })}
                  />
                </div>

                <div style={styles.inputRow}>
                  <label style={styles.label}>Piston to Deck Height (inches)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={config.pistonToDeckHeight_in || ''}
                    onChange={e => updateConfig({ pistonToDeckHeight_in: parseFloat(e.target.value) || undefined })}
                    step={0.001}
                  />
                </div>

                <div style={styles.inputRow}>
                  <label style={styles.label}>Head Gasket Thickness (inches)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={config.headGasketThickness_in || ''}
                    onChange={e => updateConfig({ headGasketThickness_in: parseFloat(e.target.value) || undefined })}
                    step={0.001}
                  />
                </div>

                <div style={styles.inputRow}>
                  <label style={styles.label}>Piston Dome Volume (cc)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={config.pistonDomeVolume_cc || ''}
                    onChange={e => updateConfig({ pistonDomeVolume_cc: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results & Chart */}
          <div style={styles.rightColumn}>
            {/* Results */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Estimated Performance</div>
              
              <div style={styles.resultsGrid}>
                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>Peak HP</div>
                  <div style={styles.resultValueLarge}>{Math.round(result.peakHP)}</div>
                  <div style={styles.resultSubtext}>@ {result.rpmPeakHP} RPM</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>Peak Torque</div>
                  <div style={styles.resultValueLarge}>{Math.round(result.peakTQ)}</div>
                  <div style={styles.resultSubtext}>@ {result.rpmPeakTQ} RPM</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>HP/CID</div>
                  <div style={styles.resultValueLarge}>{result.hpPerCID.toFixed(2)}</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>TQ/CID</div>
                  <div style={styles.resultValueLarge}>{result.tqPerCID.toFixed(2)}</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>Shift RPM</div>
                  <div style={styles.resultValueLarge}>{result.shift}</div>
                </div>

                <div style={styles.resultBox}>
                  <div style={styles.resultLabel}>Redline RPM</div>
                  <div style={styles.resultValueLarge}>{result.redline}</div>
                </div>
              </div>

              {isAdvancedMode && result.lobeSepAng && result.inLobeCL && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <div style={styles.resultLabel}>Camshaft Recommendations:</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>
                    Lobe Separation Angle: {result.lobeSepAng}°
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    Intake Lobe Centerline: {result.inLobeCL}°
                  </div>
                </div>
              )}
            </div>

            {/* Dyno Chart */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>HP & Torque Curves</div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="rpm"
                    label={{ value: 'RPM', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis label={{ value: 'HP / TQ', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hp"
                    stroke="#dc3545"
                    strokeWidth={2}
                    name="Horsepower"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="torque"
                    stroke="#007bff"
                    strokeWidth={2}
                    name="Torque (lb-ft)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Info Box */}
            <div style={{ ...styles.section, backgroundColor: '#e7f3ff' }}>
              <div style={styles.sectionTitle}>About This Simulation</div>
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                <p style={{ margin: '4px 0' }}>
                  This engine simulation uses the exact VB6 physics from the original ENGINE Pro/Jr programs.
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Simple Mode (Engine Jr):</strong> Basic inputs for quick estimates.
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Advanced Mode (Engine Pro):</strong> Detailed compression ratio worksheet and recommendations.
                </p>
                <p style={{ margin: '4px 0', fontSize: '10px', color: '#666' }}>
                  Note: Full dyno curve generation and detailed recommendations coming soon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    backgroundColor: 'var(--color-background)',
    minHeight: '100vh',
    padding: '16px',
  },
  modeToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    justifyContent: 'center',
  },
  modeButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '500' as const,
    border: '2px solid var(--color-border)',
    borderRadius: '6px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modeButtonActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    borderColor: 'var(--color-primary)',
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: '16px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  section: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: 'var(--shadow-sm)',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600' as const,
    marginBottom: '12px',
    color: 'var(--color-text)',
    borderBottom: '2px solid var(--color-primary)',
    paddingBottom: '6px',
  },
  inputRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    marginBottom: '10px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500' as const,
    marginBottom: '4px',
    color: 'var(--color-text-secondary)',
  },
  input: {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    width: '100%',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-text)',
  },
  select: {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    width: '100%',
    backgroundColor: 'var(--color-input-bg)',
    color: 'var(--color-text)',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: 'var(--color-background)',
    borderRadius: '4px',
    marginTop: '8px',
  },
  resultLabel: {
    fontSize: '12px',
    fontWeight: '500' as const,
    color: 'var(--color-text-secondary)',
  },
  resultValue: {
    fontSize: '13px',
    fontWeight: '600' as const,
    color: 'var(--color-text)',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  resultBox: {
    padding: '12px',
    backgroundColor: 'var(--color-background)',
    borderRadius: '6px',
    textAlign: 'center' as const,
    border: '1px solid var(--color-border)',
  },
  resultValueLarge: {
    fontSize: '24px',
    fontWeight: '700' as const,
    color: 'var(--color-primary)',
    margin: '4px 0',
  },
  resultSubtext: {
    fontSize: '11px',
    color: 'var(--color-text-secondary)',
  },
};
