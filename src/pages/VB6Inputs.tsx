/**
 * VB6 Inputs Panel
 * 
 * Full form for editing VB6 fixture data in strict mode.
 * All fields mirror the Vb6VehicleFixture type exactly.
 */

import { useState, useEffect } from 'react';
import { useVb6Fixture } from '../shared/state/vb6FixtureStore';
import { VB6_PROSTOCK_PRO } from '../domain/physics/fixtures/vb6-prostock-pro';

export default function VB6Inputs() {
  const { fixture, setFixture } = useVb6Fixture();
  const [activeSection, setActiveSection] = useState<string>('env');
  
  // Local draft state - changes are held here until committed
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(fixture)));
  const [hasChanges, setHasChanges] = useState(false);

  // Sync draft when fixture changes externally (e.g., loading a preset)
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(fixture)));
    setHasChanges(false);
  }, [fixture]);

  const loadProStockPro = () => {
    // Deep clone to convert readonly arrays to mutable
    const newFixture = JSON.parse(JSON.stringify(VB6_PROSTOCK_PRO));
    setDraft(newFixture);
    setFixture(newFixture);
    setHasChanges(false);
  };

  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    const newDraft = JSON.parse(JSON.stringify(draft));
    
    let current = newDraft;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setDraft(newDraft);
    setHasChanges(true);
  };

  const commitChanges = () => {
    setFixture(draft);
    setHasChanges(false);
  };

  const discardChanges = () => {
    setDraft(JSON.parse(JSON.stringify(fixture)));
    setHasChanges(false);
  };

  const sections = [
    { id: 'env', label: 'Environment' },
    { id: 'vehicle', label: 'Vehicle' },
    { id: 'aero', label: 'Aerodynamics' },
    { id: 'drivetrain', label: 'Drivetrain' },
    { id: 'pmi', label: 'PMI' },
    { id: 'engine', label: 'Engine HP Curve' },
    { id: 'fuel', label: 'Fuel System' },
  ];

  return (
    <div className="vb6-inputs-panel">
      <div className="panel-header">
        <h2>VB6 Strict Mode Inputs</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={loadProStockPro} className="btn-secondary">
            Load ProStock_Pro
          </button>
          {hasChanges && (
            <>
              <button 
                onClick={commitChanges} 
                className="btn"
                style={{ backgroundColor: '#28a745' }}
              >
                Apply Changes
              </button>
              <button 
                onClick={discardChanges} 
                className="btn-secondary"
              >
                Discard
              </button>
            </>
          )}
        </div>
        {hasChanges && (
          <div style={{ color: '#ffc107', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            * Unsaved changes - click "Apply Changes" to run simulation
          </div>
        )}
      </div>

      <div className="panel-content">
        {/* Section Tabs */}
        <div className="section-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`tab ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Environment Section */}
        {activeSection === 'env' && (
          <div className="section">
            <h3>Environment</h3>
            <div className="form-grid">
              <label>
                Elevation (ft):
                <input
                  type="number"
                  value={draft.env?.elevation_ft ?? ''}
                  onChange={(e) => updateField('env.elevation_ft', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Barometer (inHg):
                <input
                  type="number"
                  step="0.01"
                  value={draft.env?.barometer_inHg ?? ''}
                  onChange={(e) => updateField('env.barometer_inHg', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Temperature (°F):
                <input
                  type="number"
                  value={draft.env?.temperature_F ?? ''}
                  onChange={(e) => updateField('env.temperature_F', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Relative Humidity (%):
                <input
                  type="number"
                  value={draft.env?.relHumidity_pct ?? ''}
                  onChange={(e) => updateField('env.relHumidity_pct', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Wind Speed (mph):
                <input
                  type="number"
                  step="0.1"
                  value={draft.env?.wind_mph ?? ''}
                  onChange={(e) => updateField('env.wind_mph', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Wind Angle (deg):
                <input
                  type="number"
                  value={draft.env?.wind_angle_deg ?? ''}
                  onChange={(e) => updateField('env.wind_angle_deg', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Track Temperature (°F):
                <input
                  type="number"
                  value={draft.env?.trackTemp_F ?? ''}
                  onChange={(e) => updateField('env.trackTemp_F', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Traction Index (1-10):
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={draft.env?.tractionIndex ?? ''}
                  onChange={(e) => updateField('env.tractionIndex', parseInt(e.target.value))}
                />
              </label>
            </div>
          </div>
        )}

        {/* Vehicle Section */}
        {activeSection === 'vehicle' && (
          <div className="section">
            <h3>Vehicle Mass & Geometry</h3>
            <div className="form-grid">
              <label>
                Weight (lb):
                <input
                  type="number"
                  value={draft.vehicle?.weight_lb ?? ''}
                  onChange={(e) => updateField('vehicle.weight_lb', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Static Front Weight (lb):
                <input
                  type="number"
                  value={draft.vehicle?.staticFrontWeight_lb ?? ''}
                  onChange={(e) => updateField('vehicle.staticFrontWeight_lb', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Wheelbase (in):
                <input
                  type="number"
                  step="0.1"
                  value={draft.vehicle?.wheelbase_in ?? ''}
                  onChange={(e) => updateField('vehicle.wheelbase_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Front Overhang (in):
                <input
                  type="number"
                  step="0.1"
                  value={draft.vehicle?.overhang_in ?? ''}
                  onChange={(e) => updateField('vehicle.overhang_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                CG Height (in):
                <input
                  type="number"
                  step="0.1"
                  value={draft.vehicle?.cgHeight_in ?? ''}
                  onChange={(e) => updateField('vehicle.cgHeight_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Staging Rollout (in):
                <input
                  type="number"
                  step="0.1"
                  value={draft.vehicle?.rollout_in ?? ''}
                  onChange={(e) => updateField('vehicle.rollout_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Body Style:
                <select
                  value={draft.vehicle?.bodyStyle ?? 1}
                  onChange={(e) => updateField('vehicle.bodyStyle', parseInt(e.target.value))}
                >
                  <option value={1}>Car</option>
                  <option value={8}>Motorcycle</option>
                </select>
              </label>
            </div>
            
            <h4>Tires</h4>
            <div className="form-grid">
              <label>
                Tire Diameter (in):
                <input
                  type="number"
                  step="0.1"
                  value={draft.vehicle?.tire?.diameter_in ?? ''}
                  onChange={(e) => updateField('vehicle.tire.diameter_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Tire Width (in):
                <input
                  type="number"
                  step="0.1"
                  value={draft.vehicle?.tire?.width_in ?? ''}
                  onChange={(e) => updateField('vehicle.tire.width_in', parseFloat(e.target.value))}
                />
              </label>
            </div>
          </div>
        )}

        {/* Aero Section */}
        {activeSection === 'aero' && (
          <div className="section">
            <h3>Aerodynamics</h3>
            <div className="form-grid">
              <label>
                Frontal Area (ft²):
                <input
                  type="number"
                  step="0.1"
                  value={draft.aero?.frontalArea_ft2 ?? ''}
                  onChange={(e) => updateField('aero.frontalArea_ft2', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Drag Coefficient (Cd):
                <input
                  type="number"
                  step="0.001"
                  value={draft.aero?.Cd ?? ''}
                  onChange={(e) => updateField('aero.Cd', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Lift Coefficient (Cl):
                <input
                  type="number"
                  step="0.001"
                  value={draft.aero?.Cl ?? ''}
                  onChange={(e) => updateField('aero.Cl', parseFloat(e.target.value))}
                />
              </label>
            </div>
          </div>
        )}

        {/* Drivetrain Section */}
        {activeSection === 'drivetrain' && (
          <div className="section">
            <h3>Drivetrain</h3>
            <div className="form-grid">
              <label>
                Final Drive Ratio:
                <input
                  type="number"
                  step="0.01"
                  value={draft.drivetrain?.finalDrive ?? ''}
                  onChange={(e) => updateField('drivetrain.finalDrive', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Overall Efficiency:
                <input
                  type="number"
                  step="0.001"
                  value={draft.drivetrain?.overallEfficiency ?? ''}
                  onChange={(e) => updateField('drivetrain.overallEfficiency', parseFloat(e.target.value))}
                />
              </label>
            </div>
            
            <h4>Gear Ratios (comma-separated)</h4>
            <input
              type="text"
              className="full-width"
              placeholder="2.60, 1.90, 1.50, 1.20, 1.00"
              value={draft.drivetrain?.gearRatios?.join(', ') ?? ''}
              onChange={(e) => {
                const ratios = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                updateField('drivetrain.gearRatios', ratios);
              }}
            />
            
            <h4>Per-Gear Efficiencies (comma-separated)</h4>
            <input
              type="text"
              className="full-width"
              placeholder="0.970, 0.975, 0.980, 0.985, 0.990"
              value={draft.drivetrain?.perGearEff?.join(', ') ?? ''}
              onChange={(e) => {
                const effs = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                updateField('drivetrain.perGearEff', effs);
              }}
            />
            
            <h4>Shift RPMs (comma-separated)</h4>
            <input
              type="text"
              className="full-width"
              placeholder="9400, 9400, 9400, 9400"
              value={draft.drivetrain?.shiftsRPM?.join(', ') ?? ''}
              onChange={(e) => {
                const rpms = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                updateField('drivetrain.shiftsRPM', rpms);
              }}
            />

            <h4>Clutch Settings (for manual trans)</h4>
            <div className="form-grid">
              <label>
                Launch RPM:
                <input
                  type="number"
                  value={draft.drivetrain?.clutch?.launchRPM ?? ''}
                  onChange={(e) => updateField('drivetrain.clutch.launchRPM', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Slip RPM:
                <input
                  type="number"
                  value={draft.drivetrain?.clutch?.slipRPM ?? ''}
                  onChange={(e) => updateField('drivetrain.clutch.slipRPM', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Slippage Factor:
                <input
                  type="number"
                  step="0.001"
                  value={draft.drivetrain?.clutch?.slippageFactor ?? ''}
                  onChange={(e) => updateField('drivetrain.clutch.slippageFactor', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Lockup:
                <input
                  type="checkbox"
                  checked={fixture.drivetrain?.clutch?.lockup ?? false}
                  onChange={(e) => updateField('drivetrain.clutch.lockup', e.target.checked)}
                />
              </label>
            </div>

            <h4>Converter Settings (for automatic trans)</h4>
            <div className="form-grid">
              <label>
                Stall RPM:
                <input
                  type="number"
                  value={draft.drivetrain?.converter?.stallRPM ?? ''}
                  onChange={(e) => updateField('drivetrain.converter.stallRPM', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Torque Multiplier:
                <input
                  type="number"
                  step="0.01"
                  value={draft.drivetrain?.converter?.torqueMult ?? ''}
                  onChange={(e) => updateField('drivetrain.converter.torqueMult', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Slippage Factor:
                <input
                  type="number"
                  step="0.001"
                  value={draft.drivetrain?.converter?.slippageFactor ?? ''}
                  onChange={(e) => updateField('drivetrain.converter.slippageFactor', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Converter Diameter (in):
                <input
                  type="number"
                  step="0.1"
                  value={draft.drivetrain?.converter?.diameter_in ?? ''}
                  onChange={(e) => updateField('drivetrain.converter.diameter_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Lockup:
                <input
                  type="checkbox"
                  checked={fixture.drivetrain?.converter?.lockup ?? false}
                  onChange={(e) => updateField('drivetrain.converter.lockup', e.target.checked)}
                />
              </label>
            </div>
          </div>
        )}

        {/* PMI Section */}
        {activeSection === 'pmi' && (
          <div className="section">
            <h3>Polar Moments of Inertia (slug-ft²)</h3>
            <div className="form-grid">
              <label>
                Engine + Flywheel + Clutch:
                <input
                  type="number"
                  step="0.01"
                  value={draft.pmi?.engine_flywheel_clutch ?? ''}
                  onChange={(e) => updateField('pmi.engine_flywheel_clutch', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Transmission + Driveshaft:
                <input
                  type="number"
                  step="0.001"
                  value={draft.pmi?.transmission_driveshaft ?? ''}
                  onChange={(e) => updateField('pmi.transmission_driveshaft', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Tires + Wheels + Ring Gear:
                <input
                  type="number"
                  step="0.1"
                  value={draft.pmi?.tires_wheels_ringgear ?? ''}
                  onChange={(e) => updateField('pmi.tires_wheels_ringgear', parseFloat(e.target.value))}
                />
              </label>
            </div>
          </div>
        )}

        {/* Engine HP Curve Section */}
        {activeSection === 'engine' && (
          <div className="section">
            <h3>Engine HP Curve</h3>
            <p className="help-text">
              Enter RPM,HP pairs (one per line). Example: 7000,1078
            </p>
            <textarea
              rows={15}
              className="full-width monospace"
              value={draft.engineHP?.map(([rpm, hp]: [number, number]) => `${rpm},${hp}`).join('\n') ?? ''}
              onChange={(e) => {
                const lines = e.target.value.split('\n');
                const curve = lines
                  .map(line => {
                    const [rpm, hp] = line.split(',').map(s => parseFloat(s.trim()));
                    return !isNaN(rpm) && !isNaN(hp) ? [rpm, hp] as [number, number] : null;
                  })
                  .filter((pair): pair is [number, number] => pair !== null);
                updateField('engineHP', curve);
              }}
            />
          </div>
        )}

        {/* Fuel Section */}
        {activeSection === 'fuel' && (
          <div className="section">
            <h3>Fuel System</h3>
            <div className="form-grid">
              <label>
                Fuel Type:
                <input
                  type="text"
                  value={draft.fuel?.type ?? ''}
                  onChange={(e) => updateField('fuel.type', e.target.value)}
                />
              </label>
              <label>
                HP/Torque Multiplier:
                <input
                  type="number"
                  step="0.001"
                  value={draft.fuel?.hpTorqueMultiplier ?? ''}
                  onChange={(e) => updateField('fuel.hpTorqueMultiplier', parseFloat(e.target.value))}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .vb6-inputs-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .panel-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }
        
        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }
        
        .section-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        
        .tab {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          background: white;
          cursor: pointer;
          border-radius: 4px;
        }
        
        .tab.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }
        
        .section h3 {
          margin-top: 0;
          margin-bottom: 1rem;
        }
        
        .section h4 {
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .form-grid label {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .form-grid input {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        
        .full-width {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        
        .monospace {
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
        }
        
        .help-text {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        
        .btn-secondary {
          padding: 0.5rem 1rem;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .btn-secondary:hover {
          background: #5a6268;
        }
      `}</style>
    </div>
  );
}
