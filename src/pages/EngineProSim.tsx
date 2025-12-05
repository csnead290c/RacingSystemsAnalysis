import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Page from '../shared/components/Page';
import {
  simulateEnginePro,
  createDefaultEngineProConfig,
  calcDisplacement,
  type EngineProConfig,
  type EngineProResult,
  type CamshaftType,
  type FuelType,
  type IntakeManifoldType,
  type EngineLayout,
} from '../domain/physics/engine/engineProSim';

// ============================================================================
// Styles matching original ENGINE Pro VB6 UI
// ============================================================================

const styles = {
  // Main container - light gray background like Windows forms
  container: {
    backgroundColor: '#f0f0f0',
    padding: '8px',
    fontFamily: 'Segoe UI, Tahoma, sans-serif',
    fontSize: '12px',
    color: '#000',
    minHeight: '100%',
  },
  // Toolbar
  toolbar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
    padding: '4px',
    backgroundColor: '#e8e8e8',
    borderRadius: '2px',
  },
  toolbarBtn: {
    padding: '4px 12px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #999',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500,
  } as React.CSSProperties,
  toolbarBtnActive: {
    backgroundColor: '#cce5ff',
    borderColor: '#0066cc',
  },
  // Group box (fieldset style)
  groupBox: {
    border: '1px solid #999',
    borderRadius: '2px',
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: '#fff',
  },
  groupTitle: {
    fontSize: '11px',
    fontWeight: 600,
    marginBottom: '6px',
    color: '#333',
  },
  // Input row
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
    gap: '8px',
  },
  label: {
    flex: '1',
    fontSize: '11px',
    color: '#333',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  input: {
    width: '70px',
    padding: '2px 4px',
    border: '1px solid #999',
    borderRadius: '2px',
    fontSize: '11px',
    textAlign: 'right',
  } as React.CSSProperties,
  select: {
    padding: '2px 4px',
    border: '1px solid #999',
    borderRadius: '2px',
    fontSize: '11px',
    backgroundColor: '#fff',
  },
  // Radio group
  radioGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  // Results section
  resultsBox: {
    border: '1px solid #999',
    borderRadius: '2px',
    padding: '8px',
    backgroundColor: '#ffffcc',
    marginBottom: '8px',
  },
  resultsTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: '8px',
    color: '#333',
  } as React.CSSProperties,
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  resultLabel: {
    fontSize: '11px',
    color: '#333',
  },
  resultValue: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#000',
    minWidth: '50px',
    textAlign: 'right',
  } as React.CSSProperties,
  // SI Units box
  siBox: {
    border: '1px solid #999',
    borderRadius: '2px',
    padding: '6px',
    backgroundColor: '#e8f4e8',
  },
  siTitle: {
    fontSize: '10px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  // Modal/Dialog styles
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#f0f0f0',
    border: '2px solid #666',
    borderRadius: '4px',
    boxShadow: '4px 4px 12px rgba(0,0,0,0.3)',
    zIndex: 1000,
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
  } as React.CSSProperties,
  modalHeader: {
    backgroundColor: '#0066cc',
    color: '#fff',
    padding: '4px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 600,
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  modalBody: {
    padding: '12px',
  },
  // Data table
  dataTable: {
    borderCollapse: 'collapse',
    fontSize: '11px',
    width: '100%',
  } as React.CSSProperties,
  tableHeader: {
    backgroundColor: '#0066cc',
    color: '#fff',
    padding: '4px 8px',
    textAlign: 'right',
    fontWeight: 600,
  } as React.CSSProperties,
  tableCell: {
    padding: '2px 8px',
    textAlign: 'right',
    borderBottom: '1px solid #ddd',
  } as React.CSSProperties,
  tableCellHighlight: {
    backgroundColor: '#cce5ff',
  },
};

// ============================================================================
// Sub-components for modals
// ============================================================================

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

function Modal({ title, onClose, children, width = 500 }: ModalProps) {
  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 999 }}
        onClick={onClose}
      />
      <div style={{ ...styles.modal, width }}>
        <div style={styles.modalHeader}>
          <span>{title}</span>
          <button style={styles.modalClose} onClick={onClose}>×</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

type ModalType = 'dyno' | 'mech' | 'flow' | 'recommendations' | null;

export default function EngineProSim() {
  const [config, setConfig] = useState<EngineProConfig>(createDefaultEngineProConfig());
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  const displacement = useMemo(() => 
    calcDisplacement(config.bore_in, config.stroke_in, config.numCylinders),
    [config.bore_in, config.stroke_in, config.numCylinders]
  );
  
  const result: EngineProResult = useMemo(() => 
    simulateEnginePro(config),
    [config]
  );
  
  const chartData = useMemo(() => 
    result.dynoCurve.map(p => ({
      rpm: p.rpm,
      hp: p.hp,
      torque: p.torque_lbft,
    })),
    [result]
  );
  
  const updateConfig = (updates: Partial<EngineProConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  return (
    <Page title="ENGINE Pro">
      <div style={styles.container}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <button 
            style={styles.toolbarBtn}
            onClick={() => setActiveModal('dyno')}
          >
            Dyno Data
          </button>
          <button 
            style={styles.toolbarBtn}
            onClick={() => setActiveModal('mech')}
          >
            Mech Details
          </button>
          <button 
            style={styles.toolbarBtn}
            onClick={() => setActiveModal('flow')}
          >
            Flow Details
          </button>
          <button 
            style={styles.toolbarBtn}
            onClick={() => setActiveModal('recommendations')}
          >
            Recommendations
          </button>
        </div>

        {/* Main Layout - Two columns */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Left Column - Inputs */}
          <div style={{ flex: '0 0 320px' }}>
            {/* Engine Design */}
            <div style={styles.groupBox}>
              <div style={styles.inputRow}>
                <span style={styles.label}>Number of Cylinders</span>
                <input
                  type="number"
                  style={styles.input}
                  value={config.numCylinders}
                  onChange={e => updateConfig({ numCylinders: parseInt(e.target.value) || 8 })}
                />
                <div style={styles.radioGroup}>
                  {(['inline', 'vee', 'flat'] as EngineLayout[]).map(layout => (
                    <label key={layout} style={styles.radioLabel}>
                      <input
                        type="radio"
                        checked={config.layout === layout}
                        onChange={() => updateConfig({ layout })}
                      />
                      {layout === 'inline' ? 'Inline' : layout === 'vee' ? 'Vee' : 'Flat'}
                    </label>
                  ))}
                </div>
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Bore Diameter - inch</span>
                <input
                  type="number"
                  step="0.001"
                  style={styles.input}
                  value={config.bore_in}
                  onChange={e => updateConfig({ bore_in: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Stroke Length - inch</span>
                <input
                  type="number"
                  step="0.001"
                  style={styles.input}
                  value={config.stroke_in}
                  onChange={e => updateConfig({ stroke_in: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Rod Length - inch</span>
                <input
                  type="number"
                  step="0.001"
                  style={styles.input}
                  value={config.rodLength_in}
                  onChange={e => updateConfig({ rodLength_in: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Compression Ratio</span>
                <input
                  type="number"
                  step="0.1"
                  style={styles.input}
                  value={config.compressionRatio}
                  onChange={e => updateConfig({ compressionRatio: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Camshaft Type:</span>
                <select
                  style={{ ...styles.select, flex: 1 }}
                  value={config.camshaftType}
                  onChange={e => updateConfig({ camshaftType: e.target.value as CamshaftType })}
                >
                  <option value="overhead_cam">Overhead Cam</option>
                  <option value="roller">Roller Cam & Lifter</option>
                  <option value="mushroom_tappet">Mushroom Tappet</option>
                  <option value="high_rate_flat_tappet">High Rate Flat Tappet</option>
                  <option value="normal_flat_tappet">Normal Flat Tappet & Solid Lifter</option>
                  <option value="hydraulic_roller">Hydraulic Roller</option>
                  <option value="hydraulic_flat_tappet">Normal Hydraulic</option>
                </select>
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Intake Duration @ .050 inch - degree</span>
                <input
                  type="number"
                  style={styles.input}
                  value={config.intakeDuration050_deg}
                  onChange={e => updateConfig({ intakeDuration050_deg: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Throttle CFM @ 1.5 inch Hg</span>
                <input
                  type="number"
                  style={styles.input}
                  value={config.throttleCFM_at_1_5inHg}
                  onChange={e => updateConfig({ throttleCFM_at_1_5inHg: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={!config.isEFI}
                      onChange={() => updateConfig({ isEFI: false })}
                    />
                    Carb
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={config.isEFI}
                      onChange={() => updateConfig({ isEFI: true })}
                    />
                    EFI
                  </label>
                </div>
                <span style={styles.label}>Fuel Type:</span>
                <select
                  style={styles.select}
                  value={config.fuelType}
                  onChange={e => updateConfig({ fuelType: e.target.value as FuelType })}
                >
                  <option value="gasoline">Gasoline</option>
                  <option value="racing_gasoline">Racing Gasoline</option>
                  <option value="methanol">Methanol</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column - Intake/Head + Results */}
          <div style={{ flex: 1 }}>
            {/* Intake Manifold & Head */}
            <div style={styles.groupBox}>
              <div style={styles.inputRow}>
                <span style={styles.label}>Intake Manifold Type:</span>
                <select
                  style={{ ...styles.select, width: '180px' }}
                  value={config.intakeManifoldType}
                  onChange={e => updateConfig({ intakeManifoldType: e.target.value as IntakeManifoldType })}
                >
                  <option value="plenum">Common Plenum Style</option>
                  <option value="individual_runner">Individual Runner (IR)</option>
                  <option value="dual_plane_divided">Dual Plane, 100% Divided</option>
                  <option value="dual_plane_slot">Dual Plane w/Small Slot</option>
                </select>
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Manifold Runner Style:</span>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={config.runnerStyle === 'curved'}
                      onChange={() => updateConfig({ runnerStyle: 'curved' })}
                    />
                    Curved
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={config.runnerStyle === 'straight'}
                      onChange={() => updateConfig({ runnerStyle: 'straight' })}
                    />
                    Straight
                  </label>
                </div>
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Intake Manifold Flow Factor - %</span>
                <input
                  type="number"
                  step="0.1"
                  style={styles.input}
                  value={config.intakeManifoldFlowFactor_pct}
                  onChange={e => updateConfig({ intakeManifoldFlowFactor_pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={{ height: '1px', backgroundColor: '#ccc', margin: '8px 0' }} />
              <div style={styles.inputRow}>
                <span style={styles.label}>Number of Intake Valves per Cylinder</span>
                <input
                  type="number"
                  style={styles.input}
                  value={config.numIntakeValvesPerCyl}
                  onChange={e => updateConfig({ numIntakeValvesPerCyl: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Intake Valve Diameter - inch</span>
                <input
                  type="number"
                  step="0.001"
                  style={styles.input}
                  value={config.intakeValveDia_in}
                  onChange={e => updateConfig({ intakeValveDia_in: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>Maximum Intake Port Flow - CFM</span>
                <input
                  type="number"
                  step="0.1"
                  style={styles.input}
                  value={config.maxIntakeFlow_cfm}
                  onChange={e => updateConfig({ maxIntakeFlow_cfm: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>@ Test Pressure - inch H2O</span>
                <input
                  type="number"
                  step="0.1"
                  style={styles.input}
                  value={config.flowTestPressure_inH2O}
                  onChange={e => updateConfig({ flowTestPressure_inH2O: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={styles.inputRow}>
                <span style={styles.label}>@ Reference Bore Diameter - inch</span>
                <input
                  type="number"
                  step="0.001"
                  style={styles.input}
                  value={config.flowTestBoreDia_in}
                  onChange={e => updateConfig({ flowTestBoreDia_in: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div style={styles.resultsBox}>
          <div style={styles.resultsTitle}>
            Estimated Performance for {displacement.toFixed(1)} CID Engine
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Left results */}
            <div style={{ flex: 1 }}>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Peak HP</span>
                <span style={styles.resultValue}>{Math.round(result.peakHP)}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>RPM @ Peak HP</span>
                <span style={styles.resultValue}>{result.rpmAtPeakHP}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Peak HP/CID</span>
                <span style={styles.resultValue}>{result.peakHP_perCID.toFixed(2)}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Shift RPM</span>
                <span style={styles.resultValue}>{result.shiftRPM}</span>
              </div>
            </div>
            {/* Middle results */}
            <div style={{ flex: 1 }}>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Peak Torque - ft lbs</span>
                <span style={styles.resultValue}>{Math.round(result.peakTorque_lbft)}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>RPM @ Peak Torque</span>
                <span style={styles.resultValue}>{result.rpmAtPeakTorque}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Peak Torque/CID</span>
                <span style={styles.resultValue}>{result.peakTorque_perCID.toFixed(2)}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Redline RPM</span>
                <span style={styles.resultValue}>{result.redlineRPM}</span>
              </div>
            </div>
            {/* SI Units */}
            <div style={styles.siBox}>
              <div style={styles.siTitle}>SI Units</div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Displacement - liter</span>
                <span style={styles.resultValue}>{result.displacement_L.toFixed(2)}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Peak Power - kW</span>
                <span style={styles.resultValue}>{Math.round(result.peakHP_kW)}</span>
              </div>
              <div style={styles.resultRow}>
                <span style={styles.resultLabel}>Peak Torque - Nm</span>
                <span style={styles.resultValue}>{Math.round(result.peakTorque_Nm)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {activeModal === 'dyno' && (
          <Modal title="Engine Dyno Data" onClose={() => setActiveModal(null)} width={700}>
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Chart */}
              <div style={{ flex: 1, height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="rpm" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="hp" stroke="#cc0000" strokeWidth={2} dot={false} name="HP" />
                    <Line yAxisId="right" type="monotone" dataKey="torque" stroke="#0000cc" strokeWidth={2} dot={false} name="Torque" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Data table */}
              <div style={{ width: 180 }}>
                <div style={{ marginBottom: 8, padding: 4, border: '1px solid #999', backgroundColor: '#fff' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Peak Values</div>
                  <table style={{ fontSize: 11, width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: '#cc0000' }}>HP</td>
                        <td style={{ textAlign: 'right' }}>{Math.round(result.peakHP)}</td>
                        <td style={{ textAlign: 'right' }}>{result.rpmAtPeakHP}</td>
                      </tr>
                      <tr>
                        <td style={{ color: '#0000cc' }}>TQ</td>
                        <td style={{ textAlign: 'right' }}>{Math.round(result.peakTorque_lbft)}</td>
                        <td style={{ textAlign: 'right' }}>{result.rpmAtPeakTorque}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ maxHeight: 250, overflow: 'auto', border: '1px solid #999' }}>
                  <table style={styles.dataTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>RPM</th>
                        <th style={{ ...styles.tableHeader, color: '#ffcccc' }}>HP</th>
                        <th style={{ ...styles.tableHeader, color: '#ccccff' }}>TQ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.dynoCurve.map((p, i) => (
                        <tr key={i} style={p.rpm === result.rpmAtPeakHP ? styles.tableCellHighlight : {}}>
                          <td style={styles.tableCell}>{p.rpm}</td>
                          <td style={{ ...styles.tableCell, color: '#cc0000' }}>{p.hp}</td>
                          <td style={{ ...styles.tableCell, color: '#0000cc' }}>{p.torque_lbft}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'mech' && (
          <Modal title="ENGINE Pro Mechanical Details" onClose={() => setActiveModal(null)} width={550}>
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Left side */}
              <div style={{ width: 200 }}>
                <div style={{ ...styles.groupBox, marginBottom: 8 }}>
                  <div style={styles.groupTitle}>Piston Speed Summary - FPM</div>
                  <table style={{ fontSize: 10, width: '100%' }}>
                    <thead>
                      <tr style={{ fontWeight: 600 }}>
                        <td>Rating</td>
                        <td style={{ textAlign: 'right' }}>RPM</td>
                        <td style={{ textAlign: 'right' }}>Avg</td>
                        <td style={{ textAlign: 'right' }}>Max</td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Peak TQ</td><td style={{ textAlign: 'right' }}>{result.rpmAtPeakTorque}</td><td style={{ textAlign: 'right' }}>{Math.round(result.avgPistonSpeed_fpm.peakTQ)}</td><td style={{ textAlign: 'right' }}>{Math.round(result.maxPistonSpeed_fpm.peakTQ)}</td></tr>
                      <tr style={{ backgroundColor: '#cce5ff' }}><td>Peak HP</td><td style={{ textAlign: 'right' }}>{result.rpmAtPeakHP}</td><td style={{ textAlign: 'right' }}>{Math.round(result.avgPistonSpeed_fpm.peakHP)}</td><td style={{ textAlign: 'right' }}>{Math.round(result.maxPistonSpeed_fpm.peakHP)}</td></tr>
                      <tr><td>Shift</td><td style={{ textAlign: 'right' }}>{result.shiftRPM}</td><td style={{ textAlign: 'right' }}>{Math.round(result.avgPistonSpeed_fpm.shift)}</td><td style={{ textAlign: 'right' }}>{Math.round(result.maxPistonSpeed_fpm.shift)}</td></tr>
                      <tr><td>Redline</td><td style={{ textAlign: 'right' }}>{result.redlineRPM}</td><td style={{ textAlign: 'right' }}>{Math.round(result.avgPistonSpeed_fpm.redline)}</td><td style={{ textAlign: 'right' }}>{Math.round(result.maxPistonSpeed_fpm.redline)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div style={styles.groupBox}>
                  <div style={styles.groupTitle}>Geometric Data Summary</div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Bore to Stroke Ratio</span>
                    <span style={styles.resultValue}>{result.boreToStrokeRatio.toFixed(2)}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Rod to Stroke Ratio</span>
                    <span style={styles.resultValue}>{result.rodToStrokeRatio.toFixed(2)}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Intake Throat/Bore Area Ratio</span>
                    <span style={styles.resultValue}>{result.intakeThroatToBoreAreaRatio.toFixed(3)}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Intake Valve Lift/Diameter Ratio</span>
                    <span style={styles.resultValue}>{result.intakeValveLiftToDiaRatio.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              {/* Right side - placeholder for piston motion data */}
              <div style={{ flex: 1 }}>
                <div style={styles.groupBox}>
                  <div style={styles.groupTitle}>Data @ {result.rpmAtPeakHP} RPM - Peak HP</div>
                  <div style={{ fontSize: 10, color: '#666', textAlign: 'center', padding: 20 }}>
                    Piston position, speed, and acceleration data<br />
                    vs crank angle would be displayed here
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'flow' && (
          <Modal title="ENGINE Pro Intake Flow Details" onClose={() => setActiveModal(null)} width={550}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: 200 }}>
                <div style={styles.groupBox}>
                  <div style={styles.groupTitle}>Camshaft Description</div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Type:</span>
                    <span style={styles.resultValue}>{config.camshaftType.replace(/_/g, ' ')}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Intake Duration @ .050" - deg</span>
                    <span style={styles.resultValue}>{config.intakeDuration050_deg}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Intake Lobe Centerline - deg</span>
                    <span style={styles.resultValue}>{result.recommendations.intakeLobeCenterline_deg}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Maximum Valve Lift - inch</span>
                    <span style={styles.resultValue}>{config.maxIntakeValveLift_in}</span>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={styles.groupBox}>
                  <div style={styles.groupTitle}>Flow Area, Piston Demand & Flowbench Velocity vs Angle</div>
                  <div style={{ fontSize: 10, color: '#666', textAlign: 'center', padding: 20 }}>
                    Flow area, piston demand, and velocity curves<br />
                    vs crank angle would be displayed here
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'recommendations' && (
          <Modal title="ENGINE Pro Recommendations" onClose={() => setActiveModal(null)} width={520}>
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Left column */}
              <div style={{ flex: 1 }}>
                <div style={styles.groupBox}>
                  <div style={styles.groupTitle}>Intake System:</div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Intake Valve Lift - inch</span>
                    <span style={styles.resultValue}>{result.recommendations.intakeValveLift_in}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Minimum Flow Area - sq inch</span>
                    <span style={styles.resultValue}>{result.recommendations.minFlowArea_sqin}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Total Intake Track Length - inch</span>
                    <span style={styles.resultValue}>{result.recommendations.totalIntakeTrackLength_in}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Maximum Flow Area - sq inch</span>
                    <span style={styles.resultValue}>{result.recommendations.maxFlowArea_sqin}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Total Intake Track Volume - c.c.</span>
                    <span style={styles.resultValue}>{result.recommendations.totalIntakeTrackVolume_cc}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Plenum Volume - cubic inch</span>
                    <span style={styles.resultValue}>{result.recommendations.plenumVolume_ci}</span>
                  </div>
                </div>
                <div style={styles.groupBox}>
                  <div style={styles.groupTitle}>Camshaft:</div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Lobe Separation Angle - deg</span>
                    <span style={styles.resultValue}>{result.recommendations.lobeSeparationAngle_deg}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Intake Lobe Centerline - deg</span>
                    <span style={styles.resultValue}>{result.recommendations.intakeLobeCenterline_deg}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Exhaust Duration @ .050 inch - deg</span>
                    <span style={styles.resultValue}>{result.recommendations.exhaustDuration050_deg}</span>
                  </div>
                </div>
              </div>
              {/* Right column */}
              <div style={{ flex: 1 }}>
                <div style={styles.groupBox}>
                  <div style={styles.groupTitle}>Exhaust Port:</div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Exhaust Flow - CFM @{config.flowTestPressure_inH2O}" H2O</span>
                    <span style={styles.resultValue}>{result.recommendations.exhaustFlow_cfm} = {result.recommendations.exhaustFlow_pctIntake}%</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Exhaust Valve Diameter - inch</span>
                    <span style={styles.resultValue}>{result.recommendations.exhaustValveDia_in}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Exhaust Valve Lift - inch</span>
                    <span style={styles.resultValue}>{result.recommendations.exhaustValveLift_in}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Minimum Flow Area - sq inch</span>
                    <span style={styles.resultValue}>{result.recommendations.exhaustMinFlowArea_sqin}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Maximum Flow Area - sq inch</span>
                    <span style={styles.resultValue}>{result.recommendations.exhaustMaxFlowArea_sqin}</span>
                  </div>
                </div>
                <div style={styles.groupBox}>
                  <div style={styles.groupTitle}>Exhaust System:</div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Primary Tube Length - inch</span>
                    <span style={styles.resultValue}>{result.recommendations.primaryTubeLength_in}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Primary Tube Diameter - inch</span>
                    <span style={styles.resultValue}>{result.recommendations.primaryTubeDia_in}</span>
                  </div>
                  <div style={styles.resultRow}>
                    <span style={styles.resultLabel}>Collector Diameter - inch</span>
                    <span style={styles.resultValue}>{result.recommendations.collectorDia_in}</span>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Page>
  );
}
