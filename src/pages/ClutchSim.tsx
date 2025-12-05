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
  analyzeClutch,
  defaultClutchInput,
  defaultArmData,
  type ClutchInput,
  type ClutchResult,
} from '../domain/physics/models/clutch';

function ClutchSim() {
  const [input, setInput] = useState<ClutchInput>(defaultClutchInput);
  const [activeTab, setActiveTab] = useState<'main' | 'details' | 'dyno'>('main');

  // Run clutch analysis
  const result: ClutchResult = useMemo(() => {
    return analyzeClutch(input, defaultArmData);
  }, [input]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return result.plateForceData.map((pf, i) => ({
      rpm: pf.rpm,
      totalForce: pf.totalForce,
      centrifugalForce: pf.centrifugalForce,
      staticForce: input.staticPlateForce,
      clutchTorque: result.clutchTorqueCapacityLow[i] || 0,
      engineTorque: result.engineTorqueLow[i] || 0,
    }));
  }, [result, input.staticPlateForce]);

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
            {/* Note */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>Setup</div>
              <input
                type="text"
                className="input"
                style={{ width: '100%', fontSize: '0.85rem' }}
                value={input.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                placeholder="Setup name/notes"
              />
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
                    value={input.disk.frictionArea}
                    onChange={(e) => setInput(prev => ({
                      ...prev,
                      disk: { ...prev.disk, frictionArea: parseFloat(e.target.value) || 0 }
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
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
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
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
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
        <div className="card" style={{ padding: 'var(--space-3)', maxWidth: '800px' }}>
          <div style={sectionTitleStyle}>Clutch Details</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            Detailed clutch arm geometry and sensitivity analysis coming soon...
          </p>
          
          <div style={{ marginTop: 'var(--space-3)' }}>
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
                {result.plateForceData.map((pf, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{pf.rpm}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{Math.round(pf.centrifugalForce)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-border)', fontWeight: '600' }}>{Math.round(pf.totalForce)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Page>
  );
}

export default ClutchSim;
