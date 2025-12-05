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
  ReferenceLine,
} from 'recharts';
import Page from '../shared/components/Page';
import FourLinkDiagram from '../shared/components/charts/FourLinkDiagram';
import {
  analyzeFourLink,
  enumerateHoleCodes,
  type FourLinkInput,
  type FourLinkResult,
  type HoleCodeDetails,
} from '../domain/physics/models/fourLink';

// Default input values based on FOURLINK manual
const defaultInput: FourLinkInput = {
  note: 'Sample Four Link Setup',
  estimated60ft: 1.3,
  maxAcceleration: 1.5,
  tireRollout: 96, // ~30.5" diameter
  
  shockMountLocation: 0,
  rearSpringRate: 150,
  shockRateCompression: 60,
  shockRateExtension: 120,
  wheelieBarLength: 48,
  
  upperBar: {
    axleEnd: [
      { x: -4, y: 14 },
      { x: -4, y: 13 },
      { x: -4, y: 12 },
    ],
    chassisEnd: [
      { x: 24, y: 16 },
      { x: 24, y: 15 },
      { x: 24, y: 14 },
    ],
  },
  lowerBar: {
    axleEnd: [
      { x: 2, y: 10 },
      { x: 2, y: 9 },
      { x: 2, y: 8 },
    ],
    chassisEnd: [
      { x: 30, y: 10 },
      { x: 30, y: 9 },
      { x: 30, y: 8 },
    ],
  },
  holeCode: '1111',
  
  axleHeightAdj: 0,
  chassisHeightAdj: 0,
  pinionAngleAdj: 0,
  
  frontWeight: 900,
  rearWeight: 2100,
  
  wheelbase: 110,
  verticalCG: 18,
  frontStrutLift: 2,
  frontTireLift: 4,
  rearAxleWeight: 375,
};

function SuspensionSim() {
  const [input, setInput] = useState<FourLinkInput>(defaultInput);
  const [activeTab, setActiveTab] = useState<'main' | 'details'>('main');
  const [displayLimits, setDisplayLimits] = useState({
    enabled: false,
    separationMin: -3,
    separationMax: 3,
    antiSquatMin: 80,
    antiSquatMax: 150,
    lowerAngleMin: -5,
    lowerAngleMax: 5,
  });

  // Enumerate all hole code combinations
  const holeCodeResults: HoleCodeDetails[] = useMemo(() => {
    const limits = displayLimits.enabled ? {
      separationMin: displayLimits.separationMin,
      separationMax: displayLimits.separationMax,
      antiSquatMin: displayLimits.antiSquatMin,
      antiSquatMax: displayLimits.antiSquatMax,
      lowerAngleMin: displayLimits.lowerAngleMin,
      lowerAngleMax: displayLimits.lowerAngleMax,
    } : undefined;
    return enumerateHoleCodes(input, limits);
  }, [input, displayLimits]);

  // Calculate total weight and percentages
  const totalWeight = input.frontWeight + input.rearWeight;
  const frontPct = totalWeight > 0 ? (input.frontWeight / totalWeight) * 100 : 0;
  const rearPct = totalWeight > 0 ? (input.rearWeight / totalWeight) * 100 : 0;
  
  // Calculate horizontal CG from weight distribution
  const horizontalCG = totalWeight > 0 
    ? (input.frontWeight / totalWeight) * input.wheelbase 
    : input.wheelbase / 2;

  // Run four-link analysis
  const result: FourLinkResult = useMemo(() => {
    return analyzeFourLink(input);
  }, [input]);

  const handleInputChange = (field: keyof FourLinkInput, value: number | string) => {
    setInput(prev => ({ ...prev, [field]: value }));
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
    marginBottom: 'var(--space-4)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--color-text)',
    marginBottom: 'var(--space-2)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--space-1)',
  };

  return (
    <Page wide>
      <style>{`
        .susp-sim-layout {
          display: flex;
          gap: var(--space-3);
          height: calc(100vh - 90px);
          min-height: 500px;
        }
        .susp-sim-inputs {
          width: 320px;
          flex-shrink: 0;
          overflow-y: auto;
          padding-right: var(--space-2);
        }
        .susp-sim-results {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          min-width: 0;
        }
        .susp-sim-top {
          display: flex;
          gap: var(--space-3);
          flex: 1;
          min-height: 300px;
        }
        .susp-sim-summary {
          width: 280px;
          flex-shrink: 0;
        }
        .susp-sim-graph {
          flex: 1;
          min-width: 0;
        }
        .susp-sim-bottom {
          display: flex;
          gap: var(--space-3);
          height: 220px;
          flex-shrink: 0;
        }
        .susp-sim-chart {
          flex: 1;
          min-width: 0;
        }
        .susp-sim-table {
          width: 380px;
          flex-shrink: 0;
          overflow-y: auto;
        }
        .dynamic-table {
          width: 100%;
          font-size: 0.7rem;
          border-collapse: collapse;
        }
        .dynamic-table th, .dynamic-table td {
          padding: 2px 4px;
          text-align: right;
          border-bottom: 1px solid var(--color-border);
        }
        .dynamic-table th {
          position: sticky;
          top: 0;
          background: var(--color-surface);
          font-weight: 600;
          color: var(--color-muted);
        }
        .dynamic-table td:first-child, .dynamic-table th:first-child {
          text-align: left;
        }
        .input-row {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
          margin-bottom: var(--space-2);
        }
        @media (max-width: 1200px) {
          .susp-sim-layout {
            flex-direction: column;
            height: auto;
          }
          .susp-sim-inputs {
            width: 100%;
            max-height: 300px;
          }
          .susp-sim-top {
            flex-direction: column;
          }
          .susp-sim-summary {
            width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text)' }}>Suspension Sim</h1>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            Four-Link Rear Suspension Analysis
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
            className={`btn ${activeTab === 'details' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Link Details
          </button>
          <Link to="/" className="btn">← Home</Link>
        </div>
      </div>

      {activeTab === 'main' ? (
      <div className="susp-sim-layout">
        {/* INPUT PANEL */}
        <div className="susp-sim-inputs card" style={{ padding: 'var(--space-3)' }}>
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

          {/* General Data */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>General</div>
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
                <label style={labelStyle}>Tire Rollout</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.tireRollout}
                  onChange={(e) => handleInputChange('tireRollout', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Rear Suspension */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Rear Suspension</div>
            <div className="input-row">
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Spring Rate</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.rearSpringRate}
                  onChange={(e) => handleInputChange('rearSpringRate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Shock Comp</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.shockRateCompression}
                  onChange={(e) => handleInputChange('shockRateCompression', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Shock Ext</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.shockRateExtension}
                  onChange={(e) => handleInputChange('shockRateExtension', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="input-row">
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Shock Mount</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.shockMountLocation}
                  onChange={(e) => handleInputChange('shockMountLocation', parseFloat(e.target.value) || 0)}
                  step="0.5"
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>W-Bar Len</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.wheelieBarLength}
                  onChange={(e) => handleInputChange('wheelieBarLength', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Weight Data */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Weight</div>
            <div className="input-row">
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Front (lbs)</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.frontWeight}
                  onChange={(e) => handleInputChange('frontWeight', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Rear (lbs)</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.rearWeight}
                  onChange={(e) => handleInputChange('rearWeight', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Total</label>
                <div style={{ ...inputStyle, backgroundColor: 'var(--color-bg-secondary)', padding: '5px 6px' }}>
                  {totalWeight}
                </div>
              </div>
            </div>
            <div className="input-row">
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Front %</label>
                <div style={{ ...inputStyle, backgroundColor: 'var(--color-bg-secondary)', padding: '5px 6px' }}>
                  {frontPct.toFixed(1)}
                </div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Rear %</label>
                <div style={{ ...inputStyle, backgroundColor: 'var(--color-bg-secondary)', padding: '5px 6px' }}>
                  {rearPct.toFixed(1)}
                </div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Axle Wt</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.rearAxleWeight}
                  onChange={(e) => handleInputChange('rearAxleWeight', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* CG Data */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Center of Gravity</div>
            <div className="input-row">
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Wheelbase</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.wheelbase}
                  onChange={(e) => handleInputChange('wheelbase', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Horiz CG</label>
                <div style={{ ...inputStyle, backgroundColor: 'var(--color-bg-secondary)', padding: '5px 6px' }}>
                  {horizontalCG.toFixed(1)}
                </div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Vert CG</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.verticalCG}
                  onChange={(e) => handleInputChange('verticalCG', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="input-row">
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Strut Lift</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.frontStrutLift}
                  onChange={(e) => handleInputChange('frontStrutLift', parseFloat(e.target.value) || 0)}
                  step="0.5"
                />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Tire Lift</label>
                <input
                  type="number"
                  className="input"
                  style={inputStyle}
                  value={input.frontTireLift}
                  onChange={(e) => handleInputChange('frontTireLift', parseFloat(e.target.value) || 0)}
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Hole Code */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Four Link Bars</div>
            <div className="input-row">
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Hole Code</label>
                <input
                  type="text"
                  className="input"
                  style={{ ...inputStyle, width: '60px', textAlign: 'center', fontFamily: 'monospace', fontSize: '1rem' }}
                  value={input.holeCode}
                  onChange={(e) => handleInputChange('holeCode', e.target.value.slice(0, 4))}
                  maxLength={4}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', alignSelf: 'flex-end', paddingBottom: '6px' }}>
                Upper: Axle-Chassis | Lower: Axle-Chassis
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS PANEL */}
        <div className="susp-sim-results">
          {/* Top row: Summary + Geometry Diagram */}
          <div className="susp-sim-top">
            {/* Summary Results */}
            <div className="susp-sim-summary card" style={{ padding: 'var(--space-3)' }}>
              <div style={sectionTitleStyle}>Summary Results</div>
              
              {/* Instant Center */}
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-accent)', marginBottom: '4px' }}>
                  Instant Center
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.8rem' }}>
                  <span className="text-muted">X (in):</span>
                  <span style={{ textAlign: 'right' }}>{result?.instantCenter.x.toFixed(1)}</span>
                  <span className="text-muted">Y (in):</span>
                  <span style={{ textAlign: 'right' }}>{result?.instantCenter.y.toFixed(1)}</span>
                  <span className="text-muted">Anti-Squat:</span>
                  <span style={{ textAlign: 'right' }}>{result?.instantCenter.percentAntiSquat.toFixed(0)}%</span>
                  <span className="text-muted">Initial Hit:</span>
                  <span style={{ textAlign: 'right' }}>{result?.instantCenter.initialRearTireHit.toFixed(0)} lbs</span>
                </div>
              </div>

              {/* Dynamic Weight Transfer */}
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-accent)', marginBottom: '4px' }}>
                  Dynamic Weight Transfer
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.8rem' }}>
                  <span className="text-muted">Front:</span>
                  <span style={{ textAlign: 'right' }}>{result?.dynamicFrontWeight.toFixed(0)} lbs</span>
                  <span className="text-muted">Rear:</span>
                  <span style={{ textAlign: 'right' }}>{result?.dynamicRearWeight.toFixed(0)} lbs</span>
                  <span className="text-muted">W-Bar:</span>
                  <span style={{ textAlign: 'right' }}>{result?.wheelieBarForce.toFixed(0)} lbs</span>
                  <span className="text-muted">Separation:</span>
                  <span style={{ textAlign: 'right' }}>{result?.instantCenter.shockSeparation.toFixed(2)}"</span>
                  <span className="text-muted">Damping:</span>
                  <span style={{ textAlign: 'right' }}>{result?.shockDampingRatio.toFixed(2)}</span>
                </div>
              </div>

              {/* Bar Forces */}
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-accent)', marginBottom: '4px' }}>
                  Link Bar Forces
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.8rem' }}>
                  <span className="text-muted">Upper:</span>
                  <span style={{ textAlign: 'right' }}>{result?.upperBarForce.toFixed(0)} lbs</span>
                  <span className="text-muted">Lower:</span>
                  <span style={{ textAlign: 'right' }}>{result?.lowerBarForce.toFixed(0)} lbs</span>
                  <span className="text-muted">Horiz Total:</span>
                  <span style={{ textAlign: 'right' }}>{result?.totalHorizontalForce.toFixed(0)} lbs</span>
                  <span className="text-muted">Vert Total:</span>
                  <span style={{ textAlign: 'right' }}>{result?.totalVerticalForce.toFixed(0)} lbs</span>
                </div>
              </div>

              {/* Performance Summary */}
              <div style={{ 
                backgroundColor: 'var(--color-bg-secondary)', 
                padding: 'var(--space-2)', 
                borderRadius: 'var(--radius-sm)',
                marginTop: 'auto'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.85rem' }}>
                  <span className="text-muted">Avg Tire Force:</span>
                  <span style={{ textAlign: 'right', fontWeight: '600' }}>{result?.avgRearTireForce.toFixed(0)} lbs</span>
                  <span className="text-muted">Variation:</span>
                  <span style={{ textAlign: 'right', fontWeight: '600' }}>{result?.rearTireForceVariation.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Geometry Diagram / Graph Area */}
            <div className="susp-sim-graph card" style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={sectionTitleStyle}>Four Link Geometry</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                  Upper: {result.upperBar.length.toFixed(1)}" @ {result.upperBar.angle.toFixed(1)}° | 
                  Lower: {result.lowerBar.length.toFixed(1)}" @ {result.lowerBar.angle.toFixed(1)}°
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <FourLinkDiagram
                  upperBar={result.upperBar}
                  lowerBar={result.lowerBar}
                  instantCenter={{ x: result.instantCenter.x, y: result.instantCenter.y }}
                  verticalCG={input.verticalCG}
                  horizontalCG={horizontalCG}
                  tireRadius={input.tireRollout > 60 ? input.tireRollout / Math.PI / 2 : input.tireRollout / 2}
                  wheelbase={input.wheelbase}
                  shockSeparation={result.instantCenter.shockSeparation}
                  percentAntiSquat={result.instantCenter.percentAntiSquat}
                />
              </div>
            </div>
          </div>

          {/* Bottom: Dynamic Analysis Chart + Data Table */}
          <div className="susp-sim-bottom">
            {/* Rear Tire Force Graph */}
            <div className="susp-sim-chart card" style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <div style={sectionTitleStyle}>Rear Tire Force vs Time</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                  <span style={{ color: '#ef4444' }}>■</span> Rear | 
                  <span style={{ color: '#3b82f6' }}> ■</span> Front | 
                  <span style={{ color: '#22c55e' }}> ---</span> Avg
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                {result.timeSteps.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.timeSteps} margin={{ top: 5, right: 15, left: 5, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                      <XAxis
                        dataKey="time"
                        stroke="var(--color-text-muted)"
                        tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                        tickFormatter={(v) => v.toFixed(2)}
                        label={{ value: 'Time (s)', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'var(--color-text-muted)' }}
                      />
                      <YAxis
                        stroke="var(--color-text-muted)"
                        tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
                        tickFormatter={(v) => v.toFixed(0)}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                        }}
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(0)} lbs`,
                          name === 'rearTireForce' ? 'Rear Tire' : name === 'frontTireForce' ? 'Front Tire' : name
                        ]}
                        labelFormatter={(label) => `Time: ${Number(label).toFixed(2)}s`}
                      />
                      <ReferenceLine y={result.avgRearTireForce} stroke="#22c55e" strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="rearTireForce" stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="frontTireForce" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
                    No simulation data
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Analysis Data Table */}
            <div className="susp-sim-table card" style={{ padding: 'var(--space-2)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...sectionTitleStyle, fontSize: '0.8rem', marginBottom: 'var(--space-1)' }}>Dynamic Chassis Analysis</div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <table className="dynamic-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Sep</th>
                      <th>Vel</th>
                      <th>Spring</th>
                      <th>Shock</th>
                      <th>Rear</th>
                      <th>Front</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.timeSteps.map((step, i) => (
                      <tr key={i}>
                        <td>{step.time.toFixed(2)}</td>
                        <td>{step.separationDist.toFixed(2)}</td>
                        <td>{step.separationVel.toFixed(1)}</td>
                        <td>{step.springForce.toFixed(0)}</td>
                        <td>{step.shockForce.toFixed(0)}</td>
                        <td style={{ fontWeight: '600' }}>{step.rearTireForce.toFixed(0)}</td>
                        <td>{step.frontTireForce.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ 
                borderTop: '1px solid var(--color-border)', 
                paddingTop: 'var(--space-1)', 
                marginTop: 'var(--space-1)',
                fontSize: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Avg: <strong>{result.avgRearTireForce.toFixed(0)} lbs</strong></span>
                <span>Var: <strong>{result.rearTireForceVariation.toFixed(0)}%</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : (
      /* DETAILS TAB - Four Link Bar Geometry Details */
      <div style={{ display: 'flex', gap: 'var(--space-4)', height: 'calc(100vh - 140px)' }}>
        {/* Left: Geometry Input */}
        <div className="card" style={{ width: '400px', flexShrink: 0, padding: 'var(--space-3)', overflow: 'auto' }}>
          <div style={sectionTitleStyle}>Four Link Bar Geometry Data</div>
          
          {/* Upper Bar */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#f97316', marginBottom: 'var(--space-2)' }}>Upper Bar</div>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Axle End</div>
                <table style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr><th style={{ padding: '2px 8px' }}>Hole</th><th style={{ padding: '2px 8px' }}>X</th><th style={{ padding: '2px 8px' }}>Y</th></tr>
                  </thead>
                  <tbody>
                    {input.upperBar.axleEnd.map((h, i) => (
                      <tr key={i}>
                        <td style={{ padding: '2px 8px' }}>{i + 1}</td>
                        <td style={{ padding: '2px 8px' }}>{h.x.toFixed(1)}</td>
                        <td style={{ padding: '2px 8px' }}>{h.y.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Chassis End</div>
                <table style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr><th style={{ padding: '2px 8px' }}>Hole</th><th style={{ padding: '2px 8px' }}>X</th><th style={{ padding: '2px 8px' }}>Y</th></tr>
                  </thead>
                  <tbody>
                    {input.upperBar.chassisEnd.map((h, i) => (
                      <tr key={i}>
                        <td style={{ padding: '2px 8px' }}>{i + 1}</td>
                        <td style={{ padding: '2px 8px' }}>{h.x.toFixed(1)}</td>
                        <td style={{ padding: '2px 8px' }}>{h.y.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Lower Bar */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#3b82f6', marginBottom: 'var(--space-2)' }}>Lower Bar</div>
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Axle End</div>
                <table style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr><th style={{ padding: '2px 8px' }}>Hole</th><th style={{ padding: '2px 8px' }}>X</th><th style={{ padding: '2px 8px' }}>Y</th></tr>
                  </thead>
                  <tbody>
                    {input.lowerBar.axleEnd.map((h, i) => (
                      <tr key={i}>
                        <td style={{ padding: '2px 8px' }}>{i + 1}</td>
                        <td style={{ padding: '2px 8px' }}>{h.x.toFixed(1)}</td>
                        <td style={{ padding: '2px 8px' }}>{h.y.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '4px' }}>Chassis End</div>
                <table style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr><th style={{ padding: '2px 8px' }}>Hole</th><th style={{ padding: '2px 8px' }}>X</th><th style={{ padding: '2px 8px' }}>Y</th></tr>
                  </thead>
                  <tbody>
                    {input.lowerBar.chassisEnd.map((h, i) => (
                      <tr key={i}>
                        <td style={{ padding: '2px 8px' }}>{i + 1}</td>
                        <td style={{ padding: '2px 8px' }}>{h.x.toFixed(1)}</td>
                        <td style={{ padding: '2px 8px' }}>{h.y.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Display Limits */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <div style={sectionTitleStyle}>Display Limits</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={displayLimits.enabled}
                  onChange={(e) => setDisplayLimits(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                Enabled
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', opacity: displayLimits.enabled ? 1 : 0.5 }}>
              <div>
                <label style={{ display: 'block', color: 'var(--color-muted)', marginBottom: '2px' }}>Separation Min</label>
                <input type="number" className="input" style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem' }}
                  value={displayLimits.separationMin} disabled={!displayLimits.enabled}
                  onChange={(e) => setDisplayLimits(prev => ({ ...prev, separationMin: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--color-muted)', marginBottom: '2px' }}>Separation Max</label>
                <input type="number" className="input" style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem' }}
                  value={displayLimits.separationMax} disabled={!displayLimits.enabled}
                  onChange={(e) => setDisplayLimits(prev => ({ ...prev, separationMax: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--color-muted)', marginBottom: '2px' }}>Anti-Squat Min %</label>
                <input type="number" className="input" style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem' }}
                  value={displayLimits.antiSquatMin} disabled={!displayLimits.enabled}
                  onChange={(e) => setDisplayLimits(prev => ({ ...prev, antiSquatMin: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--color-muted)', marginBottom: '2px' }}>Anti-Squat Max %</label>
                <input type="number" className="input" style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem' }}
                  value={displayLimits.antiSquatMax} disabled={!displayLimits.enabled}
                  onChange={(e) => setDisplayLimits(prev => ({ ...prev, antiSquatMax: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--color-muted)', marginBottom: '2px' }}>Lower Angle Min °</label>
                <input type="number" className="input" style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem' }}
                  value={displayLimits.lowerAngleMin} disabled={!displayLimits.enabled}
                  onChange={(e) => setDisplayLimits(prev => ({ ...prev, lowerAngleMin: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--color-muted)', marginBottom: '2px' }}>Lower Angle Max °</label>
                <input type="number" className="input" style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem' }}
                  value={displayLimits.lowerAngleMax} disabled={!displayLimits.enabled}
                  onChange={(e) => setDisplayLimits(prev => ({ ...prev, lowerAngleMax: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Hole Code Results */}
        <div className="card" style={{ flex: 1, padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <div style={sectionTitleStyle}>Calculated Four Link Bar Details</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              {holeCodeResults.length} combinations {displayLimits.enabled ? '(filtered)' : ''}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--color-surface)' }}>
                <tr>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Hole Code</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>IC X</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>IC Y</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Anti-Squat %</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Initial Hit</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Separation</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Lower Angle</th>
                </tr>
              </thead>
              <tbody>
                {holeCodeResults.map((hc, i) => (
                  <tr 
                    key={i} 
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: hc.holeCode === input.holeCode ? 'var(--color-primary-bg)' : undefined,
                    }}
                    onClick={() => handleInputChange('holeCode', hc.holeCode)}
                  >
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--color-border)', fontFamily: 'monospace', fontWeight: '600' }}>
                      {hc.holeCode}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>
                      {hc.instantCenter.x.toFixed(1)}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>
                      {hc.instantCenter.y.toFixed(1)}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>
                      {hc.percentAntiSquat.toFixed(0)}%
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>
                      {hc.initialRearTireHit.toFixed(0)}
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>
                      {hc.shockSeparation.toFixed(2)}"
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>
                      {hc.lowerBarAngle.toFixed(1)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ 
            borderTop: '1px solid var(--color-border)', 
            paddingTop: 'var(--space-2)', 
            marginTop: 'var(--space-2)',
            fontSize: '0.75rem',
            color: 'var(--color-muted)'
          }}>
            Click a row to select that hole code. Results sorted by Anti-Squat % (highest first).
          </div>
        </div>
      </div>
      )}
    </Page>
  );
}

export default SuspensionSim;
