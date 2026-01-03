/**
 * Engine Sim - Single Page Dashboard
 * Compact, no-scroll layout similar to ET Sim
 */

import { useState, useMemo } from 'react';
import Page from '../shared/components/Page';
import { simulateEngine, type EngineSimConfig } from '../domain/physics/engine/engineAdapter';
import { generateVB6DynoCurve } from '../domain/physics/engine/vb6CurveGen';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator } from 'lucide-react';
import { CompressionRatioCalculator } from '../shared/components/CompressionRatioCalculator';
import { useSubscription } from '../domain/config/useSubscription';

export function EngineSimDashboard() {
  const { tier } = useSubscription();
  const hasProAccess = tier === 'pro' || tier === 'team' || tier === 'beta' || tier === 'owner';

  // Default configuration
  const [config, setConfig] = useState<EngineSimConfig>({
    numCylinders: 8,
    layout: 'vee',
    bore_in: 4.030,
    stroke_in: 3.480,
    rodLength_in: 5.850,
    compressionRatio: 12.9,
    camshaftType: 'normal_flat_tappet',
    intakeDuration050_deg: 264,
    throttleCFM_at_1_5inHg: 750,
    isEFI: false,
    fuelType: 'gasoline',
    intakeManifoldType: 'plenum',
    runnerStyle: 'curved',
    intakeManifoldFlowFactor_pct: 96.0,
    numIntakeValvesPerCyl: 1,
    intakeValveDia_in: 2.050,
    maxIntakeFlow_cfm: 250.0,
    flowTestPressure_inH2O: 28.0,
    flowTestBoreDia_in: 4.000,
    maxIntakeValveLift_in: 0.550,
  });

  const [showCRCalculator, setShowCRCalculator] = useState(false);

  const updateConfig = (updates: Partial<EngineSimConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Calculate displacement
  const displacement = useMemo(
    () => (Math.PI / 4) * Math.pow(config.bore_in, 2) * config.stroke_in * config.numCylinders,
    [config.bore_in, config.stroke_in, config.numCylinders]
  );

  // Run simulation
  const result = useMemo(() => simulateEngine(config), [config]);

  // Generate dyno curve
  const chartData = useMemo(() => {
    const vb6Curve = generateVB6DynoCurve(
      result.peakHP,
      result.rpmPeakHP,
      result.peakTQ,
      result.rpmPeakTQ,
      result.redline,
      displacement
    );
    return vb6Curve.map((p: { rpm: number; hp: number; torque_lbft: number }) => ({
      rpm: p.rpm,
      hp: Math.round(p.hp),
      torque: Math.round(p.torque_lbft),
    }));
  }, [result, displacement]);

  return (
    <Page title="Engine Sim">
      {showCRCalculator && (
        <CompressionRatioCalculator
          isOpen={showCRCalculator}
          onClose={() => setShowCRCalculator(false)}
          onApply={(cr) => {
            updateConfig({ compressionRatio: cr });
            setShowCRCalculator(false);
          }}
        />
      )}

      <div style={styles.dashboard}>
        {/* Top Row - Results and Chart */}
        <div style={styles.topRow}>
          {/* Results Card */}
          <div style={styles.resultsCard}>
            <div style={styles.cardTitle}>Performance</div>
            <div style={styles.resultsGrid}>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>Peak HP</div>
                <div style={styles.resultValueLarge}>{result.peakHP.toFixed(0)}</div>
                <div style={styles.resultSubtext}>@ {result.rpmPeakHP} RPM</div>
              </div>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>Peak Torque</div>
                <div style={styles.resultValueLarge}>{result.peakTQ.toFixed(0)}</div>
                <div style={styles.resultSubtext}>@ {result.rpmPeakTQ} RPM</div>
              </div>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>Displacement</div>
                <div style={styles.resultValueMedium}>{displacement.toFixed(1)}</div>
                <div style={styles.resultSubtext}>CID</div>
              </div>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>HP/CID</div>
                <div style={styles.resultValueMedium}>{result.hpPerCID.toFixed(2)}</div>
                <div style={styles.resultSubtext}>Specific Output</div>
              </div>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>Shift RPM</div>
                <div style={styles.resultValueMedium}>{result.shift}</div>
                <div style={styles.resultSubtext}>Recommended</div>
              </div>
              <div style={styles.resultBox}>
                <div style={styles.resultLabel}>Redline</div>
                <div style={styles.resultValueMedium}>{result.redline}</div>
                <div style={styles.resultSubtext}>Maximum</div>
              </div>
            </div>
          </div>

          {/* Dyno Chart */}
          <div style={styles.chartCard}>
            <div style={styles.cardTitle}>Dyno Curve</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="rpm" 
                  label={{ value: 'RPM', position: 'insideBottom', offset: -5 }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'HP', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Torque (lb-ft)', angle: 90, position: 'insideRight' }}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="hp"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="HP"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="torque"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Torque"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row - Input Cards */}
        <div style={styles.bottomRow}>
          {/* Engine Design */}
          <div style={styles.inputCard}>
            <div style={styles.cardTitle}>Engine Design</div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Cylinders</label>
              <input
                type="number"
                style={styles.input}
                value={config.numCylinders}
                onChange={e => updateConfig({ numCylinders: parseInt(e.target.value) || 8 })}
                min={1}
                max={12}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Layout</label>
              <select
                style={styles.select}
                value={config.layout}
                onChange={e => updateConfig({ layout: e.target.value as any })}
              >
                <option value="inline">Inline</option>
                <option value="vee">Vee</option>
                <option value="flat">Flat</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Bore (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.bore_in}
                onChange={e => updateConfig({ bore_in: parseFloat(e.target.value) || 4.0 })}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Stroke (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.stroke_in}
                onChange={e => updateConfig({ stroke_in: parseFloat(e.target.value) || 3.5 })}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Rod (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.rodLength_in}
                onChange={e => updateConfig({ rodLength_in: parseFloat(e.target.value) || 6.0 })}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Comp Ratio</label>
              <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                <input
                  type="number"
                  style={{ ...styles.input, flex: 1 }}
                  value={config.compressionRatio}
                  onChange={e => updateConfig({ compressionRatio: parseFloat(e.target.value) || 10 })}
                  step={0.1}
                />
                <button
                  onClick={() => setShowCRCalculator(true)}
                  style={styles.iconButton}
                  title="CR Calculator"
                >
                  <Calculator size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Camshaft */}
          <div style={styles.inputCard}>
            <div style={styles.cardTitle}>Camshaft</div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Type</label>
              <select
                style={styles.select}
                value={config.camshaftType}
                onChange={e => updateConfig({ camshaftType: e.target.value as any })}
              >
                <option value="overhead_cam">Overhead Cam</option>
                <option value="roller">Roller Cam & Lifter</option>
                <option value="mushroom_tappet">Mushroom Tappet</option>
                <option value="high_rate_flat_tappet">High Rate Flat Tappet</option>
                <option value="normal_flat_tappet">Normal Flat Tappet</option>
                <option value="hydraulic_roller">Hydraulic Roller</option>
                <option value="hydraulic_flat_tappet">Hydraulic Flat Tappet</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Duration @.050"</label>
              <input
                type="number"
                style={styles.input}
                value={config.intakeDuration050_deg || 264}
                onChange={e => updateConfig({ intakeDuration050_deg: parseFloat(e.target.value) || 264 })}
              />
            </div>
            {hasProAccess && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>LSA (deg)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={config.lobeSeparationAngle_deg || 108}
                    onChange={e => updateConfig({ lobeSeparationAngle_deg: parseFloat(e.target.value) })}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>ILC (deg)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={config.intakeLobeCenterline_deg || 105}
                    onChange={e => updateConfig({ intakeLobeCenterline_deg: parseFloat(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>

          {/* Induction */}
          <div style={styles.inputCard}>
            <div style={styles.cardTitle}>Induction</div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Type</label>
              <select
                style={styles.select}
                value={config.isEFI ? 'efi' : 'carb'}
                onChange={e => updateConfig({ isEFI: e.target.value === 'efi' })}
              >
                <option value="carb">Carburetor</option>
                <option value="efi">EFI</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>CFM @1.5"Hg</label>
              <input
                type="number"
                style={styles.input}
                value={config.throttleCFM_at_1_5inHg}
                onChange={e => updateConfig({ throttleCFM_at_1_5inHg: parseFloat(e.target.value) || 750 })}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Fuel</label>
              <select
                style={styles.select}
                value={config.fuelType}
                onChange={e => updateConfig({ fuelType: e.target.value as any })}
              >
                <option value="gasoline">Gasoline</option>
                <option value="racing_gasoline">Racing Gas</option>
                <option value="methanol">Methanol</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Manifold</label>
              <select
                style={styles.select}
                value={config.intakeManifoldType}
                onChange={e => updateConfig({ intakeManifoldType: e.target.value as any })}
              >
                <option value="plenum">Common Plenum</option>
                <option value="individual_runner">Individual Runner</option>
                <option value="dual_plane_divided">Dual Plane Divided</option>
                <option value="dual_plane_slot">Dual Plane Slot</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Runner Style</label>
              <select
                style={styles.select}
                value={config.runnerStyle}
                onChange={e => updateConfig({ runnerStyle: e.target.value as any })}
              >
                <option value="curved">Curved</option>
                <option value="straight">Straight</option>
              </select>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Flow Factor %</label>
              <input
                type="number"
                style={styles.input}
                value={config.intakeManifoldFlowFactor_pct}
                onChange={e => updateConfig({ intakeManifoldFlowFactor_pct: parseFloat(e.target.value) || 96 })}
                step={0.1}
              />
            </div>
          </div>

          {/* Cylinder Head */}
          <div style={styles.inputCard}>
            <div style={styles.cardTitle}>Cylinder Head</div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Intake Valves</label>
              <input
                type="number"
                style={styles.input}
                value={config.numIntakeValvesPerCyl}
                onChange={e => updateConfig({ numIntakeValvesPerCyl: parseInt(e.target.value) || 1 })}
                min={1}
                max={4}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Valve Dia (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.intakeValveDia_in}
                onChange={e => updateConfig({ intakeValveDia_in: parseFloat(e.target.value) || 2.0 })}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Max Flow CFM</label>
              <input
                type="number"
                style={styles.input}
                value={config.maxIntakeFlow_cfm}
                onChange={e => updateConfig({ maxIntakeFlow_cfm: parseFloat(e.target.value) || 250 })}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Test Pressure</label>
              <input
                type="number"
                style={styles.input}
                value={config.flowTestPressure_inH2O}
                onChange={e => updateConfig({ flowTestPressure_inH2O: parseFloat(e.target.value) || 28 })}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Ref Bore (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.flowTestBoreDia_in}
                onChange={e => updateConfig({ flowTestBoreDia_in: parseFloat(e.target.value) || 4.0 })}
                step={0.001}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Max Lift (in)</label>
              <input
                type="number"
                style={styles.input}
                value={config.maxIntakeValveLift_in || 0.55}
                onChange={e => updateConfig({ maxIntakeValveLift_in: parseFloat(e.target.value) || 0.55 })}
                step={0.001}
              />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

const styles = {
  dashboard: {
    padding: '12px',
    height: 'calc(100vh - 100px)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    overflow: 'hidden',
  },
  topRow: {
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: '12px',
    height: '350px',
  },
  bottomRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    flex: 1,
    overflow: 'auto',
  },
  resultsCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  inputCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    overflow: 'auto',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: '600' as const,
    marginBottom: '10px',
    color: '#1e293b',
    borderBottom: '2px solid #3b82f6',
    paddingBottom: '6px',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    flex: 1,
  },
  resultBox: {
    padding: '10px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    textAlign: 'center' as const,
    border: '1px solid #e2e8f0',
  },
  resultLabel: {
    fontSize: '10px',
    color: '#64748b',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    fontWeight: '500' as const,
  },
  resultValueLarge: {
    fontSize: '28px',
    fontWeight: '700' as const,
    color: '#3b82f6',
    lineHeight: 1,
  },
  resultValueMedium: {
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#1e293b',
    lineHeight: 1,
  },
  resultSubtext: {
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    color: '#64748b',
    minWidth: '90px',
    flex: '0 0 90px',
  },
  input: {
    padding: '4px 6px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '11px',
    flex: 1,
  },
  select: {
    padding: '4px 6px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '11px',
    flex: 1,
  },
  iconButton: {
    padding: '4px 8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
