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
import { Calculator } from 'lucide-react';
import Page from '../shared/components/Page';
import { useSubscription } from '../domain/config/useSubscription';
import {
  simulateEngine,
  createDefaultEngineProConfig,
  calcDisplacement,
  type EngineSimConfig,
} from '../domain/physics/engine/engineAdapter';
import type { EngineOutputs } from '../domain/physics/engine/engineTypes';
import { generateVB6DynoCurve } from '../domain/physics/engine/vb6CurveGen';
import { calcMechDetails, calcFlowDetails, calcRecommendations } from '../domain/physics/engine/engineProDetails';
import { CompressionRatioCalculator } from '../shared/components/CompressionRatioCalculator';

// Cam type mapping for flow details
const CAM_TYPE_MAP: Record<string, number> = {
  'overhead_cam': 0,
  'roller': 1,
  'mushroom_tappet': 2,
  'high_rate_flat_tappet': 3,
  'normal_flat_tappet': 4,
  'hydraulic_roller': 5,
  'hydraulic_flat_tappet': 6,
};

export default function EngineSim() {
  const { features } = useSubscription();
  const [config, setConfig] = useState<EngineSimConfig>(createDefaultEngineProConfig());
  const [activeTab, setActiveTab] = useState<'performance' | 'mech' | 'flow' | 'recommendations'>('performance');
  const [selectedRPM, setSelectedRPM] = useState<'peakTQ' | 'peakHP' | 'shift' | 'redline'>('peakHP');
  const [showCRCalculator, setShowCRCalculator] = useState(false);

  // Pro features are locked behind subscription
  const hasProAccess = features.quarterProFields;

  const displacement = useMemo(
    () => calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders),
    [config.bore_in, config.stroke_in, config.numCylinders]
  );

  const result: EngineOutputs = useMemo(() => simulateEngine(config), [config]);

  // Generate VB6-accurate dyno curve
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

  // Get RPM value based on selection
  const getCurrentRPM = () => {
    switch (selectedRPM) {
      case 'peakTQ': return result.rpmPeakTQ;
      case 'peakHP': return result.rpmPeakHP;
      case 'shift': return result.shift;
      case 'redline': return result.redline;
      default: return result.rpmPeakHP;
    }
  };

  // Calculate mechanical details for Pro tabs
  const mechDetails = useMemo(() => {
    if (activeTab !== 'mech') return null;
    return calcMechDetails(
      getCurrentRPM(),
      config.stroke_in,
      config.rodLength_in
    );
  }, [activeTab, selectedRPM, result, config.stroke_in, config.rodLength_in]);

  // Calculate flow details for Pro tabs
  const flowDetails = useMemo(() => {
    if (activeTab !== 'flow') return null;
    
    // Get calculated cam defaults if not provided
    // Use nullish coalescing to handle undefined/null but not 0
    const ilc = config.intakeLobeCenterline_deg ?? 105;
    const maxLift = config.maxIntakeValveLift_in ?? 0.5;
    
    // VB6 uses advertised duration for flow details, not 0.050" duration
    // Advertised duration = 1.08 * duration@0.050 + 10
    const advDuration = 1.08 * config.intakeDuration050_deg + 10;
    
    return calcFlowDetails(
      getCurrentRPM(),
      config.stroke_in,
      config.rodLength_in,
      config.bore_in,
      config.intakeValveDia_in,
      config.numIntakeValvesPerCyl,
      advDuration,   // duration_deg (advertised duration ~295)
      ilc,           // lobeCenterline_deg (should be ~106)
      maxLift,
      CAM_TYPE_MAP[config.camshaftType] || 0
    );
  }, [activeTab, selectedRPM, result, config]);

  // Calculate recommendations for Pro tabs
  const recommendations = useMemo(() => {
    if (activeTab !== 'recommendations') return null;
    if (!result.calculatedValues) return null;  // Need calculated values from engine simulation
    return calcRecommendations(
      config,
      result.peakHP,
      result.rpmPeakHP,
      result.peakTQ,
      result.rpmPeakTQ,
      result.calculatedValues  // Pass calculated values from engine simulation
    );
  }, [activeTab, config, result]);

  const updateConfig = (updates: Partial<EngineSimConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <Page title="ENGINE Pro">
      {/* Compression Ratio Calculator Modal */}
      <CompressionRatioCalculator
        isOpen={showCRCalculator}
        onClose={() => setShowCRCalculator(false)}
        onApply={(cr) => updateConfig({ compressionRatio: cr })}
        initialValues={{
          bore_in: config.bore_in,
          stroke_in: config.stroke_in,
          chamberVolume_cc: config.combustionChamberVolume_cc,
          deckHeight_in: config.pistonToDeckHeight_in,
          gasketThickness_in: config.headGasketThickness_in,
          pistonDomeVolume_cc: config.pistonDomeVolume_cc,
        }}
      />
      <div style={styles.container}>
        {/* Tabs */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'performance' ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'mech' ? styles.tabButtonActive : {}),
            }}
            onClick={() => hasProAccess && setActiveTab('mech')}
            disabled={!hasProAccess}
          >
            Mech Details {!hasProAccess && '🔒'}
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'flow' ? styles.tabButtonActive : {}),
            }}
            onClick={() => hasProAccess && setActiveTab('flow')}
            disabled={!hasProAccess}
          >
            Flow Details {!hasProAccess && '🔒'}
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'recommendations' ? styles.tabButtonActive : {}),
            }}
            onClick={() => hasProAccess && setActiveTab('recommendations')}
            disabled={!hasProAccess}
          >
            Recommendations {!hasProAccess && '🔒'}
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
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <input
                    type="number"
                    style={{ ...styles.input, flex: 1 }}
                    value={config.compressionRatio}
                    onChange={e => updateConfig({ compressionRatio: parseFloat(e.target.value) || 10 })}
                    step={0.1}
                  />
                  <button
                    onClick={() => setShowCRCalculator(true)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Compression Ratio Calculator"
                  >
                    <Calculator size={16} />
                  </button>
                </div>
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
                  <option value="roller">Roller Cam & Lifter</option>
                  <option value="mushroom_tappet">Mushroom Tappet</option>
                  <option value="high_rate_flat_tappet">High Rate-of-Lift Flat Tappet</option>
                  <option value="normal_flat_tappet">Normal Flat Tappet & Solid Lifter</option>
                  <option value="hydraulic_roller">Hydraulic Roller Cam & Lifter</option>
                  <option value="hydraulic_flat_tappet">Normal Hydraulic Cam & Lifter</option>
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

              {result.lobeSepAng && result.inLobeCL && (
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

            {/* Performance Tab: Dyno Chart */}
            {activeTab === 'performance' && (
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
            )}

            {/* Mech Details Tab */}
            {activeTab === 'mech' && hasProAccess && mechDetails && (
              <>
                {/* Piston Speed & Depth Graph - Moved to top */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Piston Speed & Depth vs Angle</div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mechDetails}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="angle_deg"
                        label={{ value: 'Crank Angle (deg ATDC)', position: 'insideBottom', offset: -5 }}
                        domain={[0, 180]}
                      />
                      <YAxis
                        yAxisId="left"
                        label={{ value: 'Piston Speed (FPM)', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Piston Depth (in)', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="pistonSpeed_fpm"
                        stroke="#007bff"
                        strokeWidth={2}
                        name="Piston Speed (FPM)"
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="pistonDepth_in"
                        stroke="#dc3545"
                        strokeWidth={2}
                        name="Piston Depth (in)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* RPM Selector and Geometric Summary */}
                <div style={styles.section}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Piston Speed Summary */}
                    <div>
                      <div style={styles.sectionTitle}>Piston Speed Summary - FPM</div>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableHeaderRow}>
                            <th style={styles.tableHeader}>Rating</th>
                            <th style={styles.tableHeader}>RPM</th>
                            <th style={styles.tableHeader}>Avg</th>
                            <th style={styles.tableHeader}>Max</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'peakTQ' as const, label: 'Peak TQ', rpm: result.rpmPeakTQ },
                            { key: 'peakHP' as const, label: 'Peak HP', rpm: result.rpmPeakHP },
                            { key: 'shift' as const, label: 'Shift', rpm: result.shift },
                            { key: 'redline' as const, label: 'Redline', rpm: result.redline },
                          ].map(({ key, label, rpm }) => {
                            const avgSpeed = Math.round(rpm * Math.PI * config.stroke_in / 12);
                            const maxSpeed = Math.round(avgSpeed * 1.57); // Max is ~1.57x average
                            return (
                              <tr
                                key={key}
                                style={{
                                  ...styles.tableRow,
                                  ...(selectedRPM === key ? { backgroundColor: 'var(--color-primary)', color: '#fff', cursor: 'pointer' } : { cursor: 'pointer' }),
                                }}
                                onClick={() => setSelectedRPM(key)}
                              >
                                <td style={styles.tableCell}>{label}</td>
                                <td style={styles.tableCell}>{rpm}</td>
                                <td style={styles.tableCell}>{avgSpeed}</td>
                                <td style={styles.tableCell}>{maxSpeed}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div style={{ fontSize: '10px', marginTop: '8px', color: 'var(--color-text-secondary)' }}>
                        *Maximum Piston Speed occurs<br />
                        @ {(Math.asin(1 / Math.sqrt(1 + (config.rodLength_in / config.stroke_in) ** 2)) * 180 / Math.PI).toFixed(1)}° ATDC
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '11px' }}>
                        <div style={styles.resultLabel}>Est. Cranking Compression - psig</div>
                        <input
                          type="number"
                          style={{ ...styles.input, width: '100px', marginTop: '4px' }}
                          defaultValue={230}
                        />
                      </div>
                    </div>

                    {/* Geometric Data Summary */}
                    <div>
                      <div style={styles.sectionTitle}>Geometric Data Summary</div>
                      <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Bore to Stroke Ratio</span>
                          <span style={styles.resultValue}>{(config.bore_in / config.stroke_in).toFixed(2)}</span>
                        </div>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Rod to Stroke Ratio</span>
                          <span style={styles.resultValue}>{(config.rodLength_in / config.stroke_in).toFixed(2)}</span>
                        </div>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Piston to Head / Rod Length</span>
                          <span style={styles.resultValue}>0.0032</span>
                        </div>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Intake Throat / Bore Area Ratio</span>
                          <span style={styles.resultValue}>
                            {(config.numIntakeValvesPerCyl * Math.PI * Math.pow(config.intakeValveDia_in / 2, 2) / (Math.PI * Math.pow(config.bore_in / 2, 2))).toFixed(3)}
                          </span>
                        </div>
                        <div style={styles.resultRow}>
                          <span style={styles.resultLabel}>Intake Valve Lift / Diameter Ratio</span>
                          <span style={styles.resultValue}>0.268</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Table */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Data @ {getCurrentRPM()} RPM - {
                    selectedRPM === 'peakTQ' ? 'Peak TQ' :
                    selectedRPM === 'peakHP' ? 'Peak HP' :
                    selectedRPM === 'shift' ? 'Shift' : 'Redline'
                  }</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.tableHeader}>deg ATDC</th>
                          <th style={styles.tableHeader}>Depth inch</th>
                          <th style={styles.tableHeader}>Piston Speed FPM</th>
                          <th style={styles.tableHeader}>FPS</th>
                          <th style={styles.tableHeader}>accel g's</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mechDetails.map((p, i) => (
                          <tr key={i} style={styles.tableRow}>
                            <td style={styles.tableCell}>{p.angle_deg.toFixed(1)}</td>
                            <td style={styles.tableCell}>{p.pistonDepth_in.toFixed(3)}</td>
                            <td style={styles.tableCell}>{Math.round(p.pistonSpeed_fpm)}</td>
                            <td style={styles.tableCell}>{Math.round(p.pistonSpeed_fps)}</td>
                            <td style={styles.tableCell}>{Math.round(p.pistonAccel_gs)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Flow Details Tab */}
            {activeTab === 'flow' && hasProAccess && flowDetails && (
              <>
                {/* Top Row: Piston Speed Summary + Camshaft Description */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* Piston Speed Summary - Clickable rows */}
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Piston Speed Summary</div>
                    <table style={{ ...styles.table, fontSize: '11px' }}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={{ ...styles.tableHeader, color: '#22c55e' }}>Rating</th>
                          <th style={{ ...styles.tableHeader, color: '#ef4444' }}>RPM</th>
                          <th style={styles.tableHeader}>Avg</th>
                          <th style={styles.tableHeader}>Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr 
                          style={{ ...styles.tableRow, cursor: 'pointer', backgroundColor: selectedRPM === 'peakTQ' ? 'rgba(59, 130, 246, 0.2)' : undefined }}
                          onClick={() => setSelectedRPM('peakTQ')}
                        >
                          <td style={{ ...styles.tableCell, color: '#22c55e' }}>Peak TQ</td>
                          <td style={{ ...styles.tableCell, color: '#ef4444' }}>{result.rpmPeakTQ}</td>
                          <td style={styles.tableCell}>{Math.round(result.rpmPeakTQ * config.stroke_in / 6)}</td>
                          <td style={styles.tableCell}>{Math.round(result.rpmPeakTQ * config.stroke_in * Math.PI / 12)}</td>
                        </tr>
                        <tr 
                          style={{ ...styles.tableRow, cursor: 'pointer', backgroundColor: selectedRPM === 'peakHP' ? 'rgba(59, 130, 246, 0.2)' : undefined }}
                          onClick={() => setSelectedRPM('peakHP')}
                        >
                          <td style={{ ...styles.tableCell, color: '#22c55e', fontWeight: selectedRPM === 'peakHP' ? 'bold' : undefined }}>Peak HP</td>
                          <td style={{ ...styles.tableCell, color: '#ef4444', fontWeight: selectedRPM === 'peakHP' ? 'bold' : undefined }}>{result.rpmPeakHP}</td>
                          <td style={{ ...styles.tableCell, fontWeight: selectedRPM === 'peakHP' ? 'bold' : undefined }}>{Math.round(result.rpmPeakHP * config.stroke_in / 6)}</td>
                          <td style={{ ...styles.tableCell, fontWeight: selectedRPM === 'peakHP' ? 'bold' : undefined }}>{Math.round(result.rpmPeakHP * config.stroke_in * Math.PI / 12)}</td>
                        </tr>
                        <tr 
                          style={{ ...styles.tableRow, cursor: 'pointer', backgroundColor: selectedRPM === 'shift' ? 'rgba(59, 130, 246, 0.2)' : undefined }}
                          onClick={() => setSelectedRPM('shift')}
                        >
                          <td style={{ ...styles.tableCell, color: '#22c55e' }}>Shift</td>
                          <td style={{ ...styles.tableCell, color: '#ef4444' }}>{result.shift}</td>
                          <td style={styles.tableCell}>{Math.round(result.shift * config.stroke_in / 6)}</td>
                          <td style={styles.tableCell}>{Math.round(result.shift * config.stroke_in * Math.PI / 12)}</td>
                        </tr>
                        <tr 
                          style={{ ...styles.tableRow, cursor: 'pointer', backgroundColor: selectedRPM === 'redline' ? 'rgba(59, 130, 246, 0.2)' : undefined }}
                          onClick={() => setSelectedRPM('redline')}
                        >
                          <td style={{ ...styles.tableCell, color: '#22c55e' }}>Redline</td>
                          <td style={{ ...styles.tableCell, color: '#ef4444' }}>{result.redline}</td>
                          <td style={styles.tableCell}>{Math.round(result.redline * config.stroke_in / 6)}</td>
                          <td style={styles.tableCell}>{Math.round(result.redline * config.stroke_in * Math.PI / 12)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Camshaft Description - Editable inputs */}
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Camshaft Description</div>
                    <div style={{ fontSize: '12px' }}>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Type:</span>
                        <select
                          style={{ ...styles.input, width: '180px', fontSize: '11px' }}
                          value={config.camshaftType || 'normal_flat_tappet'}
                          onChange={e => updateConfig({ camshaftType: e.target.value as EngineSimConfig['camshaftType'] })}
                        >
                          <option value="overhead_cam">Overhead Cam</option>
                          <option value="roller">Roller Cam & Lifter</option>
                          <option value="mushroom_tappet">Mushroom Tappet</option>
                          <option value="high_rate_flat_tappet">High Rate-of-Lift Flat Tappet</option>
                          <option value="normal_flat_tappet">Normal Flat Tappet & Solid Lifter</option>
                          <option value="hydraulic_roller">Hydraulic Roller Cam & Lifter</option>
                          <option value="hydraulic_flat_tappet">Normal Hydraulic Cam & Lifter</option>
                        </select>
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Intake Duration @ .050" - deg</label>
                        <input
                          type="number"
                          style={{ ...styles.input, width: '60px', color: '#3b82f6', fontWeight: 'bold' }}
                          value={config.intakeDuration050_deg || 264}
                          onChange={e => updateConfig({ intakeDuration050_deg: parseFloat(e.target.value) || 264 })}
                        />
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Intake Lobe Centerline - deg</label>
                        <input
                          type="number"
                          style={{ ...styles.input, width: '60px' }}
                          value={config.intakeLobeCenterline_deg || 105}
                          onChange={e => updateConfig({ intakeLobeCenterline_deg: parseFloat(e.target.value) || 105 })}
                        />
                      </div>
                      <div style={styles.inputRow}>
                        <label style={styles.label}>Maximum Valve Lift - inch</label>
                        <input
                          type="number"
                          style={{ ...styles.input, width: '60px' }}
                          value={config.maxIntakeValveLift_in || 0.55}
                          onChange={e => updateConfig({ maxIntakeValveLift_in: parseFloat(e.target.value) || 0.55 })}
                          step={0.001}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flow Details Table */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    Data @ {getCurrentRPM().toLocaleString()} RPM - {selectedRPM === 'peakTQ' ? 'Peak TQ' : selectedRPM === 'peakHP' ? 'Peak HP' : selectedRPM === 'shift' ? 'Shift' : 'Redline'}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.tableHeader}>Event</th>
                          <th style={styles.tableHeader}>deg<br/>ATDC</th>
                          <th style={styles.tableHeader}>Valve Lift<br/>inch</th>
                          <th style={styles.tableHeader}>Flow Area<br/>sq in</th>
                          <th style={{ ...styles.tableHeader, color: '#3b82f6' }}>Piston Speed<br/>FPM</th>
                          <th style={{ ...styles.tableHeader, color: '#ef4444' }}>Flow Demand<br/>CFM</th>
                          <th style={{ ...styles.tableHeader, color: '#22c55e' }}>Flowbench Test<br/>Vel FPS</th>
                          <th style={{ ...styles.tableHeader, color: '#22c55e' }}>inH2O</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flowDetails.map((p, i) => {
                          // Calculate flowbench test values (simplified)
                          const flowVel = p.valveLift_in > 0.05 ? Math.round(p.flowVelocity_fps) : null;
                          const flowInH2O = p.valveLift_in > 0.05 && p.flowDemand_cfm > 0 ? Math.round(Math.pow(p.flowDemand_cfm / 100, 2) * 10) : null;
                          
                          return (
                            <tr key={i} style={{
                              ...styles.tableRow,
                              backgroundColor: p.eventLabel.includes('Max Lift') ? 'rgba(59, 130, 246, 0.1)' : 
                                             p.eventLabel.includes('Max Piston') ? 'rgba(239, 68, 68, 0.1)' : undefined
                            }}>
                              <td style={{ ...styles.tableCell, fontSize: '10px', color: '#94a3b8' }}>{p.eventLabel}</td>
                              <td style={styles.tableCell}>{p.angle_deg.toFixed(1)}</td>
                              <td style={styles.tableCell}>{p.valveLift_in.toFixed(3)}</td>
                              <td style={styles.tableCell}>{p.flowArea_sqin.toFixed(3)}</td>
                              <td style={{ ...styles.tableCell, color: '#3b82f6' }}>{Math.round(p.pistonSpeed_fpm)}</td>
                              <td style={{ ...styles.tableCell, color: '#ef4444' }}>{Math.round(p.flowDemand_cfm)}</td>
                              <td style={{ ...styles.tableCell, color: '#22c55e' }}>{flowVel !== null ? flowVel : '--'}</td>
                              <td style={{ ...styles.tableCell, color: '#22c55e' }}>{flowInH2O !== null ? flowInH2O : '--'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Flow Details Graph */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>
                    <span style={{ color: '#3b82f6' }}>Flow Area</span>, <span style={{ color: '#ef4444' }}>Piston Demand</span> & <span style={{ color: '#22c55e' }}>Flowbench Velocity</span> vs Angle
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={flowDetails}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="angle_deg" 
                        label={{ value: 'Crank Angle (deg ATDC)', position: 'insideBottom', offset: -5 }}
                        domain={['dataMin', 'dataMax']}
                      />
                      <YAxis 
                        yAxisId="left"
                        label={{ value: 'Flow Area / Demand', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Velocity (FPS)', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="flowArea_sqin"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Flow Area (sq in)"
                        dot={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="flowDemand_cfm"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Piston Demand (CFM)"
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="flowVelocity_fps"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Flow Velocity (FPS)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && hasProAccess && recommendations && (
              <>
                {/* Intake System Recommendations */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Intake System:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Intake Valve Lift - inch</span>
                        <span style={styles.resultValue}>{recommendations.intakeValveLift_in.toFixed(3)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Minimum Flow Area - sq inch</span>
                        <span style={styles.resultValue}>{recommendations.intakeMinFlowArea_sqin.toFixed(2)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Total Intake Track Length - inch</span>
                        <span style={styles.resultValue}>{recommendations.intakeTrackLength_in.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Maximum Flow Area - sq inch</span>
                        <span style={styles.resultValue}>{recommendations.intakeMaxFlowArea_sqin.toFixed(2)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Total Intake Track Volume - c.c.</span>
                        <span style={styles.resultValue}>{recommendations.intakeTrackVolume_cc.toFixed(0)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Plenum Volume - cubic inch</span>
                        <span style={styles.resultValue}>{recommendations.intakePlenumVolume_ci.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exhaust Port */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Exhaust Port:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Exhaust Flow - CFM @28.0 inches H2O,</span>
                        <span style={styles.resultValue}>{recommendations.exhaustFlow_cfm.toFixed(0)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>@4.00 inch Bore Diameter</span>
                        <span style={styles.resultValue}>{recommendations.exhaustFlow_pctIntake.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Exhaust Valve Diameter - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustValveDiaMin_in.toFixed(2)}-{recommendations.exhaustValveDiaMax_in.toFixed(2)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Exhaust Valve Lift - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustValveLift_in.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '8px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Minimum Flow Area - sq inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustMinFlowArea_sqin.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Maximum Flow Area - sq inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustMaxFlowArea_sqin.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exhaust System */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Exhaust System:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Primary Tube Length - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustPrimaryLength_in.toFixed(1)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Primary Tube Diameter - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustPrimaryDia_in.toFixed(3)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Collector Diameter - inch</span>
                        <span style={styles.resultValue}>{recommendations.exhaustCollectorDia_in.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camshaft */}
                <div style={styles.section}>
                  <div style={styles.sectionTitle}>Camshaft:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Lobe Separation Angle - deg</span>
                        <span style={styles.resultValue}>{recommendations.lobeSeparationAngle_deg.toFixed(0)}</span>
                      </div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Intake Lobe Centerline - deg</span>
                        <span style={styles.resultValue}>{recommendations.intakeLobeCenterline_deg.toFixed(0)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={styles.resultRow}>
                        <span style={styles.resultLabel}>Exhaust Duration @ .050 inch - deg</span>
                        <span style={styles.resultValue}>{recommendations.exhaustDuration_deg.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </>
            )}

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
  tabContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '16px',
    borderBottom: '2px solid var(--color-border)',
    paddingBottom: '0',
  },
  tabButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500' as const,
    border: 'none',
    borderBottom: '2px solid transparent',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '-2px',
  },
  tabButtonActive: {
    color: 'var(--color-primary)',
    borderBottomColor: 'var(--color-primary)',
    fontWeight: '600' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '12px',
  },
  tableHeaderRow: {
    backgroundColor: 'var(--color-background)',
    borderBottom: '2px solid var(--color-border)',
  },
  tableHeader: {
    padding: '8px',
    textAlign: 'left' as const,
    fontWeight: '600' as const,
    color: 'var(--color-text)',
  },
  tableRow: {
    borderBottom: '1px solid var(--color-border)',
  },
  tableCell: {
    padding: '6px 8px',
    color: 'var(--color-text)',
  },
};
