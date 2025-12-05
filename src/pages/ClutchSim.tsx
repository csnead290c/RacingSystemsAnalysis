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
} from 'recharts';
import Page from '../shared/components/Page';
import {
  clutchCalc,
  calcDetails,
  totalLbs,
  type ClutchInput,
  type ClutchResult,
} from '../domain/physics/models/clutchVb6';
import { armData } from '../domain/physics/models/clutchArmData';

// Default input matching VB6 test case
const defaultClutchInput: ClutchInput = {
  barometer: 29.92,
  barometerIsAltimeter: false,
  temperature: 70,
  humidity: 50,

  isBike: false,
  isGlide: false,

  lowGear: 2.48,
  highGear: 1.00,
  gearRatio: 4.10,
  tireDiameter: 33,
  tireDiaIsRollout: false,
  primaryDriveRatio: 1.0,

  estimated60ft: 1.10,
  maxAcceleration: 2.5,
  tractionIndex: 3,

  enginePMI: 0.85,
  transPMI: 0.15,
  tiresPMI: 12,

  fuelSystem: 1,
  hpTorqueMultiplier: 1.0,
  dynoData: [
    { rpm: 4000, horsepower: 350, torque: 460 },
    { rpm: 4500, horsepower: 420, torque: 490 },
    { rpm: 5000, horsepower: 490, torque: 515 },
    { rpm: 5500, horsepower: 560, torque: 535 },
    { rpm: 6000, horsepower: 620, torque: 543 },
    { rpm: 6500, horsepower: 670, torque: 542 },
    { rpm: 7000, horsepower: 710, torque: 533 },
    { rpm: 7500, horsepower: 740, torque: 518 },
    { rpm: 8000, horsepower: 750, torque: 492 },
    { rpm: 8500, horsepower: 740, torque: 457 },
  ],

  arm1: {
    armTypeIndex: 16, // CRW.1 - Crower 10" 59 gram arm
    numArms: 6,
    totalCounterweight: 180,
    counterweightPerArm: 30,
    ringHeight: 0.702,
    armDepth: 0,
  },
  arm2: {
    armTypeIndex: 0,
    numArms: 0,
    totalCounterweight: 0,
    counterweightPerArm: 0,
    ringHeight: 0,
    armDepth: 0,
  },

  disk: {
    numDisks: 5,
    diskWeight: 4.0,
    outerDiameter: 10.0,
    innerDiameter: 6.5,
    effectiveArea: 85,
    frictionCoefficient: 0.35,
  },

  spring: {
    numSprings: 9,
    springBasePreload: 50,
    totalBasePreload: 450,
    springRate: 20,
    totalSpringRate: 180,
    adjusterTurns: 3.5,
    threadPitch: 24,
    deltaRingHeight: 0,
  },

  launchRPM: 6500,
  airGap: 0.020,

  staticPlateForce: 1080,
};

function ClutchSim() {
  const [input, setInput] = useState<ClutchInput>(defaultClutchInput);
  const [activeTab, setActiveTab] = useState<'main' | 'details' | 'dyno' | 'arms'>('main');

  // Run clutch analysis using VB6 port
  const result: ClutchResult = useMemo(() => {
    return clutchCalc(input, armData);
  }, [input]);

  // Calculate details if on details tab
  const detailsResult = useMemo(() => {
    if (activeTab !== 'details') return null;
    const rpmPoints = input.dynoData.filter(d => d.rpm > 0).slice(0, 3).map(d => d.rpm);
    if (rpmPoints.length < 3) {
      rpmPoints.push(6000, 7000, 8000);
    }
    return calcDetails(input, armData, result, rpmPoints.slice(0, 3));
  }, [input, result, activeTab]);

  // Prepare chart data for plate force graph
  const plateForceChartData = useMemo(() => {
    const data: { rpm: number; totalForce: number; centrifugalForce: number; staticForce: number }[] = [];
    const maxRpm = Math.max(...input.dynoData.map(d => d.rpm));
    const step = maxRpm / 25;
    
    for (let rpm = 0; rpm <= maxRpm; rpm += step) {
      const centrifugal = totalLbs(0, result.cf1, result.retLbf1, result.cf2, result.retLbf2, rpm, input.primaryDriveRatio);
      const total = totalLbs(input.staticPlateForce, result.cf1, result.retLbf1, result.cf2, result.retLbf2, rpm, input.primaryDriveRatio);
      data.push({
        rpm: Math.round(rpm),
        totalForce: Math.round(total),
        centrifugalForce: Math.round(centrifugal),
        staticForce: input.staticPlateForce,
      });
    }
    return data;
  }, [input, result]);

  // Prepare chart data for torque graph
  const torqueChartData = useMemo(() => {
    return result.clutchGridData.map((cg, i) => ({
      rpm: cg.rpm,
      clutchTorque: result.clutchTorqueCapacityLow[i] || 0,
      engineTorque: result.engineTorqueLow[i] || 0,
    }));
  }, [result]);

  const handleInputChange = (field: keyof ClutchInput, value: number | string | boolean) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const handleDynoChange = (index: number, field: 'rpm' | 'horsepower' | 'torque', value: number) => {
    setInput(prev => ({
      ...prev,
      dynoData: prev.dynoData.map((d, i) => i === index ? { ...d, [field]: value } : d),
    }));
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    color: 'var(--color-muted)',
    whiteSpace: 'nowrap',
  };

  const inputStyle: React.CSSProperties = {
    width: '70px',
    padding: '4px 6px',
    fontSize: '0.85rem',
    textAlign: 'right',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 'var(--space-3)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--color-text)',
    marginBottom: 'var(--space-2)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-1)',
  };

  const resultRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.8rem',
  };

  return (
    <Page wide>
      <style>{`
        .clutch-sim-layout {
          display: flex;
          gap: var(--space-3);
          height: calc(100vh - 90px);
          min-height: 500px;
        }
        .clutch-sim-inputs {
          width: 340px;
          flex-shrink: 0;
          overflow-y: auto;
          padding-right: var(--space-2);
        }
        .clutch-sim-results {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          min-width: 0;
        }
        .clutch-sim-top {
          display: flex;
          gap: var(--space-3);
          flex: 1;
          min-height: 300px;
        }
        .clutch-sim-summary {
          width: 280px;
          flex-shrink: 0;
        }
        .clutch-sim-graph {
          flex: 1;
          min-width: 0;
        }
        .clutch-sim-bottom {
          height: 220px;
          flex-shrink: 0;
        }
        .input-row {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
          margin-bottom: var(--space-2);
        }
        @media (max-width: 1200px) {
          .clutch-sim-layout {
            flex-direction: column;
            height: auto;
          }
          .clutch-sim-inputs {
            width: 100%;
            max-height: 300px;
          }
          .clutch-sim-top {
            flex-direction: column;
          }
          .clutch-sim-summary {
            width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text)' }}>Clutch Sim</h1>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            Centrifugal Clutch Analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className={`btn ${activeTab === 'main' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('main')}
          >
            Main
          </button>
          <button
            className={`btn ${activeTab === 'dyno' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('dyno')}
          >
            Dyno Data
          </button>
          <button
            className={`btn ${activeTab === 'details' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <Link to="/" className="btn">← Home</Link>
        </div>
      </div>

      {activeTab === 'main' ? (
        <div className="clutch-sim-layout">
          {/* INPUT PANEL */}
          <div className="clutch-sim-inputs card" style={{ padding: 'var(--space-3)' }}>
            {/* Setup Header */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Clutch Pro Analysis</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                Complete VB6 port with {armData.filter(a => a !== null).length - 1} arm types
              </div>
            </div>

            {/* Environment */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Environment</div>
              <div className="input-row">
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Barometer (inHg)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.barometer}
                    onChange={(e) => handleInputChange('barometer', parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Temp (°F)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.temperature}
                    onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Humidity (%)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.humidity}
                    onChange={(e) => handleInputChange('humidity', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Track Data */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Track Data</div>
              <div className="input-row">
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Est. 60' (s)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.estimated60ft}
                    onChange={(e) => handleInputChange('estimated60ft', parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Max Accel (g)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.maxAcceleration}
                    onChange={(e) => handleInputChange('maxAcceleration', parseFloat(e.target.value) || 0)}
                    step="0.1"
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Traction Idx</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.tractionIndex}
                    onChange={(e) => handleInputChange('tractionIndex', parseFloat(e.target.value) || 0)}
                    min="1"
                    max="5"
                  />
                </div>
              </div>
            </div>

            {/* Drivetrain */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Drivetrain</div>
              <div className="input-row">
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Low Gear</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.lowGear}
                    onChange={(e) => handleInputChange('lowGear', parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>High Gear</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.highGear}
                    onChange={(e) => handleInputChange('highGear', parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Final Drive</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.gearRatio}
                    onChange={(e) => handleInputChange('gearRatio', parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>
              </div>
              <div className="input-row">
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Tire Dia (in)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.tireDiameter}
                    onChange={(e) => handleInputChange('tireDiameter', parseFloat(e.target.value) || 0)}
                    step="0.5"
                  />
                </div>
              </div>
            </div>

            {/* Clutch Spring */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Clutch Spring</div>
              <div className="input-row">
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Static (lbs)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.staticPlateForce}
                    onChange={(e) => handleInputChange('staticPlateForce', parseFloat(e.target.value) || 0)}
                    step="5"
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Launch RPM</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.launchRPM}
                    onChange={(e) => handleInputChange('launchRPM', parseFloat(e.target.value) || 0)}
                    step="100"
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Air Gap (in)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.airGap}
                    onChange={(e) => handleInputChange('airGap', parseFloat(e.target.value) || 0)}
                    step="0.005"
                  />
                </div>
              </div>
            </div>

            {/* Clutch Disk */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Clutch Disk</div>
              <div className="input-row">
                <div style={inputGroupStyle}>
                  <label style={labelStyle}># Disks</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.disk.numDisks}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      disk: { ...prev.disk, numDisks: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>OD (in)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.disk.outerDiameter}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      disk: { ...prev.disk, outerDiameter: parseFloat(e.target.value) || 0 }
                    }))}
                    step="0.125"
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>ID (in)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.disk.innerDiameter}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      disk: { ...prev.disk, innerDiameter: parseFloat(e.target.value) || 0 }
                    }))}
                    step="0.125"
                  />
                </div>
              </div>
              <div className="input-row">
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Area (%)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.disk.effectiveArea}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      disk: { ...prev.disk, effectiveArea: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>CMU</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.disk.frictionCoefficient}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      disk: { ...prev.disk, frictionCoefficient: parseFloat(e.target.value) || 0 }
                    }))}
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Clutch Arms */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Clutch Arms</div>
              <div className="input-row">
                <div style={inputGroupStyle}>
                  <label style={labelStyle}># Arms</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.arm1.numArms}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      arm1: { ...prev.arm1, numArms: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>CWt/Arm (g)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.arm1.counterweightPerArm}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      arm1: { ...prev.arm1, counterweightPerArm: parseFloat(e.target.value) || 0 }
                    }))}
                  />
                </div>
                <div style={inputGroupStyle}>
                  <label style={labelStyle}>Ring Ht (in)</label>
                  <input
                    type="number"
                    className="input"
                    style={inputStyle}
                    value={input.arm1.ringHeight}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      arm1: { ...prev.arm1, ringHeight: parseFloat(e.target.value) || 0 }
                    }))}
                    step="0.010"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RESULTS PANEL */}
          <div className="clutch-sim-results">
            <div className="clutch-sim-top">
              {/* Summary Results */}
              <div className="clutch-sim-summary card" style={{ padding: 'var(--space-3)', overflow: 'auto' }}>
                <div style={sectionTitleStyle}>Lockup Analysis</div>
                
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Low Gear Lockup</div>
                  <div style={resultRowStyle}>
                    <span>RPM</span>
                    <span style={{ fontWeight: '600' }}>{result.lowGearLockupRPM}</span>
                  </div>
                  <div style={resultRowStyle}>
                    <span>Plate Force</span>
                    <span style={{ fontWeight: '600' }}>{result.lowGearPlateForce} lbs</span>
                  </div>
                  <div style={resultRowStyle}>
                    <span>Friction PSI</span>
                    <span style={{ fontWeight: '600' }}>{result.lowGearFrictionPSI.toFixed(1)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '4px' }}>High Gear Lockup</div>
                  <div style={resultRowStyle}>
                    <span>RPM</span>
                    <span style={{ fontWeight: '600' }}>{result.highGearLockupRPM}</span>
                  </div>
                  <div style={resultRowStyle}>
                    <span>Plate Force</span>
                    <span style={{ fontWeight: '600' }}>{result.highGearPlateForce} lbs</span>
                  </div>
                  <div style={resultRowStyle}>
                    <span>Friction PSI</span>
                    <span style={{ fontWeight: '600' }}>{result.highGearFrictionPSI.toFixed(1)}</span>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Launch Conditions</div>
                  <div style={resultRowStyle}>
                    <span>w/ Air Gap</span>
                    <span style={{ fontWeight: '600' }}>{result.launchPlateForceWithAirGap} lbs</span>
                  </div>
                  <div style={resultRowStyle}>
                    <span>Zero Air Gap</span>
                    <span style={{ fontWeight: '600' }}>{result.launchPlateForceZeroAirGap} lbs</span>
                  </div>
                  <div style={resultRowStyle}>
                    <span>Friction PSI</span>
                    <span style={{ fontWeight: '600' }}>{result.launchFrictionPSI.toFixed(1)}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Geometry</div>
                  <div style={resultRowStyle}>
                    <span>Friction Area</span>
                    <span style={{ fontWeight: '600' }}>{result.frictionArea.toFixed(1)} in²</span>
                  </div>
                  <div style={resultRowStyle}>
                    <span>CF1</span>
                    <span style={{ fontWeight: '600' }}>{(result.cf1 * 1e6).toFixed(3)}</span>
                  </div>
                  <div style={resultRowStyle}>
                    <span>CF2</span>
                    <span style={{ fontWeight: '600' }}>{(result.cf2 * 1e6).toFixed(3)}</span>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2)', backgroundColor: 'var(--color-warning-bg)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-warning)' }}>⚠️ Warnings</div>
                    {result.warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: '0.7rem', color: 'var(--color-warning)' }}>{w}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plate Force Graph */}
              <div className="clutch-sim-graph card" style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={sectionTitleStyle}>Plate Force vs RPM</div>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={plateForceChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                      <XAxis
                        dataKey="rpm"
                        stroke="var(--color-text-muted)"
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                        label={{ value: 'RPM', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--color-text-muted)' }}
                      />
                      <YAxis
                        stroke="var(--color-text-muted)"
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                        width={50}
                        label={{ value: 'Force (lbs)', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-text-muted)' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                      <ReferenceLine y={input.staticPlateForce} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Static', fontSize: 10 }} />
                      <Line type="monotone" dataKey="totalForce" stroke="#ef4444" strokeWidth={2} dot={false} name="Total Force" />
                      <Line type="monotone" dataKey="centrifugalForce" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Centrifugal" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom: Torque Graph */}
            <div className="clutch-sim-bottom card" style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <div style={sectionTitleStyle}>Clutch vs Engine Torque</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                  <span style={{ color: '#ef4444' }}>■</span> Clutch Capacity | 
                  <span style={{ color: '#3b82f6' }}> ■</span> Engine Torque
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={torqueChartData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis
                      dataKey="rpm"
                      stroke="var(--color-text-muted)"
                      tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                      label={{ value: 'RPM', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--color-text-muted)' }}
                    />
                    <YAxis
                      stroke="var(--color-text-muted)"
                      tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                      width={50}
                      label={{ value: 'Torque (lb-ft)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--color-text-muted)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                      }}
                    />
                    <ReferenceLine x={result.lowGearLockupRPM} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Low', fontSize: 9 }} />
                    <ReferenceLine x={result.highGearLockupRPM} stroke="#f97316" strokeDasharray="5 5" label={{ value: 'High', fontSize: 9 }} />
                    <Line type="monotone" dataKey="clutchTorque" stroke="#ef4444" strokeWidth={2} dot={false} name="Clutch" />
                    <Line type="monotone" dataKey="engineTorque" stroke="#3b82f6" strokeWidth={2} dot={false} name="Engine" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'dyno' ? (
        /* DYNO DATA TAB */
        <div className="card" style={{ padding: 'var(--space-3)', maxWidth: '600px' }}>
          <div style={sectionTitleStyle}>Engine Dyno Data</div>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>RPM</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>HP</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Torque</th>
              </tr>
            </thead>
            <tbody>
              {input.dynoData.map((d, i) => (
                <tr key={i}>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="number"
                      className="input"
                      style={{ width: '80px', textAlign: 'right' }}
                      value={d.rpm}
                      onChange={(e) => handleDynoChange(i, 'rpm', parseInt(e.target.value) || 0)}
                      step="100"
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="number"
                      className="input"
                      style={{ width: '80px', textAlign: 'right' }}
                      value={d.horsepower}
                      onChange={(e) => handleDynoChange(i, 'horsepower', parseInt(e.target.value) || 0)}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="number"
                      className="input"
                      style={{ width: '80px', textAlign: 'right' }}
                      value={d.torque}
                      onChange={(e) => handleDynoChange(i, 'torque', parseInt(e.target.value) || 0)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* DETAILS TAB */
        <div className="card" style={{ padding: 'var(--space-3)', maxWidth: '900px' }}>
          <div style={sectionTitleStyle}>Clutch Details & Sensitivity Analysis</div>
          
          {/* Plate Force Data */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: 'var(--space-2)' }}>Plate Force Data</div>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>RPM</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Centrifugal</th>
                  <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Total Force</th>
                </tr>
              </thead>
              <tbody>
                {result.clutchGridData.map((cg, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{cg.rpm}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{cg.centrifugal}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)', fontWeight: '600' }}>{cg.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sensitivity Analysis */}
          {detailsResult && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
                Sensitivity Analysis (Change in Plate Force)
              </div>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>RPM</th>
                    <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>+1 Arm</th>
                    <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>+1g CWt</th>
                    <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>+.010" Ring</th>
                    <th style={{ padding: '6px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>+.5 Turn</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsResult.rpmPoints.map((rpm, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{rpm}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{detailsResult.addArm[i]}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{detailsResult.addCounterweight[i]}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{detailsResult.addRingHeight[i]}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{detailsResult.addAdjusterTurns[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Calculation Parameters */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: 'var(--space-2)' }}>Calculation Parameters</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)', fontSize: '0.75rem' }}>
              <div style={resultRowStyle}><span>HP Correction</span><span>{result.hpCorrectionFactor.toFixed(4)}</span></div>
              <div style={resultRowStyle}><span>CMU Ratio</span><span>{result.cmuRatio.toFixed(4)}</span></div>
              <div style={resultRowStyle}><span>CF1 (×10⁶)</span><span>{(result.cf1 * 1e6).toFixed(4)}</span></div>
              <div style={resultRowStyle}><span>CF2 (×10⁶)</span><span>{(result.cf2 * 1e6).toFixed(4)}</span></div>
              <div style={resultRowStyle}><span>C1 Low</span><span>{result.c1Low.toFixed(4)}</span></div>
              <div style={resultRowStyle}><span>C1 High</span><span>{result.c1High.toFixed(4)}</span></div>
              <div style={resultRowStyle}><span>Z Low</span><span>{result.zLow.toFixed(2)}</span></div>
              <div style={resultRowStyle}><span>Z High</span><span>{result.zHigh.toFixed(2)}</span></div>
              <div style={resultRowStyle}><span>Friction Area</span><span>{result.frictionArea.toFixed(2)} in²</span></div>
              <div style={resultRowStyle}><span>Geometry Const</span><span>{result.geometryConstant.toFixed(4)}</span></div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export default ClutchSim;
