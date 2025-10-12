/**
 * VB6 Inputs Panel
 * 
 * Full form for editing VB6 fixture data in strict mode.
 * All fields mirror the Vb6VehicleFixture type exactly.
 */

import { useState } from 'react';
import { useVb6Fixture } from '../shared/state/vb6FixtureStore';
import { VB6_PROSTOCK_PRO } from '../domain/physics/fixtures/vb6-prostock-pro';

export default function VB6Inputs() {
  const { fixture, setFixture } = useVb6Fixture();
  const [activeSection, setActiveSection] = useState<string>('env');

  const loadProStockPro = () => {
    // Deep clone to convert readonly arrays to mutable
    setFixture(JSON.parse(JSON.stringify(VB6_PROSTOCK_PRO)));
  };

  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    const newFixture = JSON.parse(JSON.stringify(fixture));
    
    let current = newFixture;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setFixture(newFixture);
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
        <button onClick={loadProStockPro} className="btn-secondary">
          Load ProStock_Pro
        </button>
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
                  value={fixture.env?.elevation_ft ?? ''}
                  onChange={(e) => updateField('env.elevation_ft', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Barometer (inHg):
                <input
                  type="number"
                  step="0.01"
                  value={fixture.env?.barometer_inHg ?? ''}
                  onChange={(e) => updateField('env.barometer_inHg', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Temperature (°F):
                <input
                  type="number"
                  value={fixture.env?.temperature_F ?? ''}
                  onChange={(e) => updateField('env.temperature_F', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Relative Humidity (%):
                <input
                  type="number"
                  value={fixture.env?.relHumidity_pct ?? ''}
                  onChange={(e) => updateField('env.relHumidity_pct', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Wind Speed (mph):
                <input
                  type="number"
                  step="0.1"
                  value={fixture.env?.wind_mph ?? ''}
                  onChange={(e) => updateField('env.wind_mph', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Wind Angle (deg):
                <input
                  type="number"
                  value={fixture.env?.wind_angle_deg ?? ''}
                  onChange={(e) => updateField('env.wind_angle_deg', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Track Temperature (°F):
                <input
                  type="number"
                  value={fixture.env?.trackTemp_F ?? ''}
                  onChange={(e) => updateField('env.trackTemp_F', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Traction Index (1-10):
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={fixture.env?.tractionIndex ?? ''}
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
                  value={fixture.vehicle?.weight_lb ?? ''}
                  onChange={(e) => updateField('vehicle.weight_lb', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Wheelbase (in):
                <input
                  type="number"
                  step="0.1"
                  value={fixture.vehicle?.wheelbase_in ?? ''}
                  onChange={(e) => updateField('vehicle.wheelbase_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Front Overhang (in):
                <input
                  type="number"
                  step="0.1"
                  value={fixture.vehicle?.overhang_in ?? ''}
                  onChange={(e) => updateField('vehicle.overhang_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Staging Rollout (in):
                <input
                  type="number"
                  step="0.1"
                  value={fixture.vehicle?.rollout_in ?? ''}
                  onChange={(e) => updateField('vehicle.rollout_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Tire Circumference (in):
                <input
                  type="number"
                  step="0.1"
                  value={fixture.vehicle?.tire?.rollout_in ?? ''}
                  onChange={(e) => updateField('vehicle.tire.rollout_in', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Tire Width (in):
                <input
                  type="number"
                  step="0.1"
                  value={fixture.vehicle?.tire?.width_in ?? ''}
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
                  value={fixture.aero?.frontalArea_ft2 ?? ''}
                  onChange={(e) => updateField('aero.frontalArea_ft2', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Drag Coefficient (Cd):
                <input
                  type="number"
                  step="0.001"
                  value={fixture.aero?.Cd ?? ''}
                  onChange={(e) => updateField('aero.Cd', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Lift Coefficient (Cl):
                <input
                  type="number"
                  step="0.001"
                  value={fixture.aero?.Cl ?? ''}
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
                  value={fixture.drivetrain?.finalDrive ?? ''}
                  onChange={(e) => updateField('drivetrain.finalDrive', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Overall Efficiency:
                <input
                  type="number"
                  step="0.001"
                  value={fixture.drivetrain?.overallEfficiency ?? ''}
                  onChange={(e) => updateField('drivetrain.overallEfficiency', parseFloat(e.target.value))}
                />
              </label>
            </div>
            
            <h4>Gear Ratios (comma-separated)</h4>
            <input
              type="text"
              className="full-width"
              placeholder="2.60, 1.90, 1.50, 1.20, 1.00"
              value={fixture.drivetrain?.gearRatios?.join(', ') ?? ''}
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
              value={fixture.drivetrain?.perGearEff?.join(', ') ?? ''}
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
              value={fixture.drivetrain?.shiftsRPM?.join(', ') ?? ''}
              onChange={(e) => {
                const rpms = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                updateField('drivetrain.shiftsRPM', rpms);
              }}
            />

            <h4>Clutch Settings</h4>
            <div className="form-grid">
              <label>
                Launch RPM:
                <input
                  type="number"
                  value={fixture.drivetrain?.clutch?.launchRPM ?? ''}
                  onChange={(e) => updateField('drivetrain.clutch.launchRPM', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Slip RPM:
                <input
                  type="number"
                  value={fixture.drivetrain?.clutch?.slipRPM ?? ''}
                  onChange={(e) => updateField('drivetrain.clutch.slipRPM', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Slippage Factor:
                <input
                  type="number"
                  step="0.001"
                  value={fixture.drivetrain?.clutch?.slippageFactor ?? ''}
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
                  value={fixture.pmi?.engine_flywheel_clutch ?? ''}
                  onChange={(e) => updateField('pmi.engine_flywheel_clutch', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Transmission + Driveshaft:
                <input
                  type="number"
                  step="0.001"
                  value={fixture.pmi?.transmission_driveshaft ?? ''}
                  onChange={(e) => updateField('pmi.transmission_driveshaft', parseFloat(e.target.value))}
                />
              </label>
              <label>
                Tires + Wheels + Ring Gear:
                <input
                  type="number"
                  step="0.1"
                  value={fixture.pmi?.tires_wheels_ringgear ?? ''}
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
              value={fixture.engineHP?.map(([rpm, hp]) => `${rpm},${hp}`).join('\n') ?? ''}
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
                  value={fixture.fuel?.type ?? ''}
                  onChange={(e) => updateField('fuel.type', e.target.value)}
                />
              </label>
              <label>
                HP/Torque Multiplier:
                <input
                  type="number"
                  step="0.001"
                  value={fixture.fuel?.hpTorqueMultiplier ?? ''}
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
