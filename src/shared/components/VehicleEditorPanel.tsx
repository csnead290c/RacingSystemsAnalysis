/**
 * VehicleEditorPanel - Compact 1-page vehicle editor like original VB6 program
 * 
 * This component displays all vehicle settings in a single scrollable view,
 * organized into logical sections but without tabs. Designed to be used:
 * 1. As the main vehicle editor (replacing tabbed layout)
 * 2. As a popup/sidebar editor in the ET Sim page
 * 
 * Responsive breakpoints:
 * - Mobile (<480px): 1 column
 * - Tablet (480-768px): 2 columns
 * - Desktop (>768px): 3 columns (or 2 in compact mode)
 */

import { useState, useEffect } from 'react';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import type { RaceLength } from '../../domain/config/raceLengths';
import { 
  WorksheetButton, 
  FrontalAreaWorksheet, 
  TireWidthWorksheet, 
  GearRatioWorksheet,
} from './WorksheetModal';
import { TOOLTIPS } from '../../domain/config/tooltips';

// Responsive CSS styles injected once
const RESPONSIVE_STYLES = `
.vep-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr 1fr;
}
.vep-grid.compact {
  gap: 8px;
  grid-template-columns: 1fr 1fr;
}
@media (max-width: 768px) {
  .vep-grid {
    grid-template-columns: 1fr 1fr;
  }
  .vep-grid.compact {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 480px) {
  .vep-grid {
    grid-template-columns: 1fr;
  }
  .vep-grid.compact {
    grid-template-columns: 1fr;
  }
  .vep-span-2 {
    grid-column: span 1 !important;
  }
}
.vep-span-2 {
  grid-column: span 2;
}
.vep-section {
  margin-bottom: 20px;
  padding: 14px;
  background-color: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}
.vep-section.compact {
  margin-bottom: 12px;
  padding: 10px;
}
.vep-section-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.vep-section-title.compact {
  font-size: 0.8rem;
  margin-bottom: 8px;
}
.vep-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 2px;
  display: block;
}
.vep-label.compact {
  font-size: 0.7rem;
}
.vep-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 0.9rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg);
  color: var(--color-text);
}
.vep-input.compact {
  padding: 6px 8px;
  font-size: 0.85rem;
}
.vep-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
`;

type TransType = 'clutch' | 'converter';

const FUEL_TYPES = [
  { value: 'Gasoline', label: 'Gasoline (Carb)' },
  { value: 'Gasoline EFI', label: 'Gasoline (EFI)' },
  { value: 'Methanol', label: 'Methanol (Carb)' },
  { value: 'Methanol EFI', label: 'Methanol (EFI)' },
  { value: 'Nitromethane', label: 'Nitromethane' },
  { value: 'E85', label: 'E85' },
] as const;

const BODY_STYLES = [
  { value: 1, label: 'Dragster w/Wing' },
  { value: 2, label: 'Dragster' },
  { value: 3, label: 'Funny Car' },
  { value: 4, label: 'Altered/Roadster' },
  { value: 5, label: 'Fastback' },
  { value: 6, label: 'Sedan' },
  { value: 7, label: 'Wagon/Van' },
  { value: 8, label: 'Motorcycle' },
] as const;

interface VehicleEditorPanelProps {
  vehicle: Partial<Vehicle>;
  onChange: (vehicle: Partial<Vehicle>) => void;
  isPro?: boolean;
  compact?: boolean; // More compact layout for popup use
  showName?: boolean; // Show name field (false for popup where vehicle is already selected)
}

export default function VehicleEditorPanel({
  vehicle,
  onChange,
  isPro = false,
  compact = false,
  showName = true,
}: VehicleEditorPanelProps) {
  // Inject responsive styles once
  useEffect(() => {
    const styleId = 'vep-responsive-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = RESPONSIVE_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  // Worksheet modal states
  const [showFrontalAreaWorksheet, setShowFrontalAreaWorksheet] = useState(false);
  const [showTireWidthWorksheet, setShowTireWidthWorksheet] = useState(false);
  const [showGearRatioWorksheet, setShowGearRatioWorksheet] = useState(false);

  const transType: TransType = (vehicle.transmissionType as TransType) ?? 'clutch';

  // Helper to update a field
  const updateField = (field: keyof Vehicle, value: any) => {
    onChange({ ...vehicle, [field]: value });
  };

  // Helper to update gear array at index
  const updateGearAt = (field: 'gearRatios' | 'gearEfficiencies' | 'shiftRPMs', index: number, value: number) => {
    const arr = [...(vehicle[field] ?? [])];
    arr[index] = value;
    onChange({ ...vehicle, [field]: arr });
  };

  // CSS class helpers
  const cls = compact ? 'compact' : '';
  const sectionClass = `vep-section ${cls}`;
  const titleClass = `vep-section-title ${cls}`;
  const gridClass = `vep-grid ${cls}`;
  const labelClass = `vep-label ${cls}`;
  const inputClass = `vep-input ${cls}`;

  return (
    <div>
      {/* ===== IDENTITY ===== */}
      {showName && (
        <div className={sectionClass}>
          <div className={titleClass}>Identity</div>
          <div className={gridClass}>
            <div className="vep-span-2">
              <label className={labelClass}>Vehicle Name *</label>
              <input
                type="text"
                className={inputClass}
                value={vehicle.name ?? ''}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="My Race Car"
              />
            </div>
            <div>
              <label className={labelClass}>Race Length</label>
              <select
                className={inputClass}
                value={vehicle.defaultRaceLength ?? 'QUARTER'}
                onChange={(e) => updateField('defaultRaceLength', e.target.value as RaceLength)}
              >
                <option value="EIGHTH">1/8 Mile</option>
                <option value="QUARTER">1/4 Mile</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ===== VEHICLE / WEIGHT ===== */}
      <div className={sectionClass}>
        <div className={titleClass}>Vehicle</div>
        <div className={gridClass}>
          <div>
            <label className={labelClass}>Weight (lb) *</label>
            <input
              type="number"
              className={inputClass}
              value={vehicle.weightLb ?? ''}
              onChange={(e) => updateField('weightLb', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Wheelbase (in)</label>
            <input
              type="number"
              className={inputClass}
              value={vehicle.wheelbaseIn ?? 108}
              onChange={(e) => updateField('wheelbaseIn', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Rollout (in)</label>
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={vehicle.rolloutIn ?? 12}
              onChange={(e) => updateField('rolloutIn', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Body Style</label>
            <select
              className={inputClass}
              value={vehicle.bodyStyle ?? 6}
              onChange={(e) => updateField('bodyStyle', parseInt(e.target.value))}
            >
              {BODY_STYLES.map(bs => (
                <option key={bs.value} value={bs.value}>{bs.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Frontal Area (ft²)
              <WorksheetButton onClick={() => setShowFrontalAreaWorksheet(true)} tooltip={TOOLTIPS.btnFrontalArea} />
            </label>
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={vehicle.frontalAreaFt2 ?? 22}
              onChange={(e) => updateField('frontalAreaFt2', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Tire Dia (in)</label>
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={vehicle.tireDiaIn ?? 28}
              onChange={(e) => updateField('tireDiaIn', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* ===== ENGINE ===== */}
      <div className={sectionClass}>
        <div className={titleClass}>Engine</div>
        <div className={gridClass}>
          <div>
            <label className={labelClass}>Peak HP *</label>
            <input
              type="number"
              className={inputClass}
              value={vehicle.powerHP ?? ''}
              onChange={(e) => updateField('powerHP', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>RPM @ Peak HP *</label>
            <input
              type="number"
              step="100"
              className={inputClass}
              value={vehicle.rpmAtPeakHP ?? 6500}
              onChange={(e) => updateField('rpmAtPeakHP', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Displacement (CID)</label>
            <input
              type="number"
              className={inputClass}
              value={vehicle.displacementCID ?? 350}
              onChange={(e) => updateField('displacementCID', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Fuel Type</label>
            <select
              className={inputClass}
              value={vehicle.fuelType ?? 'Gasoline'}
              onChange={(e) => updateField('fuelType', e.target.value)}
            >
              {FUEL_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Shift RPM</label>
            <input
              type="number"
              step="100"
              className={inputClass}
              value={vehicle.shiftRPMs?.[0] ?? 6500}
              onChange={(e) => {
                const rpm = parseFloat(e.target.value);
                const numGears = vehicle.gearRatios?.length ?? 4;
                updateField('shiftRPMs', Array(numGears).fill(rpm));
              }}
            />
          </div>
          <div>
            <label className={labelClass}>Rev Limiter</label>
            <input
              type="number"
              step="100"
              className={inputClass}
              value={vehicle.revLimiterRPM ?? ''}
              placeholder="None"
              onChange={(e) => updateField('revLimiterRPM', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
        </div>
        <div style={{ marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={vehicle.n2oEnabled ?? false}
              onChange={(e) => updateField('n2oEnabled', e.target.checked)}
            />
            N2O (Nitrous Oxide)
          </label>
        </div>
      </div>

      {/* ===== TRANSMISSION ===== */}
      <div className={sectionClass}>
        <div className={titleClass}>Transmission</div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="transType"
                checked={transType === 'clutch'}
                onChange={() => updateField('transmissionType', 'clutch')}
              />
              Clutch
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="transType"
                checked={transType === 'converter'}
                onChange={() => updateField('transmissionType', 'converter')}
              />
              Converter
            </label>
          </div>
        </div>
        <div className={gridClass}>
          {transType === 'clutch' ? (
            <>
              <div>
                <label className={labelClass}>Launch RPM</label>
                <input
                  type="number"
                  step="100"
                  className={inputClass}
                  value={vehicle.clutchLaunchRPM ?? 5500}
                  onChange={(e) => updateField('clutchLaunchRPM', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className={labelClass}>Slip RPM</label>
                <input
                  type="number"
                  step="100"
                  className={inputClass}
                  value={vehicle.clutchSlipRPM ?? 6000}
                  onChange={(e) => updateField('clutchSlipRPM', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className={labelClass}>Slippage Factor</label>
                <input
                  type="number"
                  step="0.001"
                  className={inputClass}
                  value={vehicle.clutchSlippage ?? 1.004}
                  onChange={(e) => updateField('clutchSlippage', parseFloat(e.target.value))}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Stall RPM</label>
                <input
                  type="number"
                  step="100"
                  className={inputClass}
                  value={vehicle.converterStallRPM ?? 3000}
                  onChange={(e) => updateField('converterStallRPM', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className={labelClass}>Torque Mult</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={vehicle.converterTorqueMult ?? 2.0}
                  onChange={(e) => updateField('converterTorqueMult', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className={labelClass}>Slippage %</label>
                <input
                  type="number"
                  step="0.1"
                  className={inputClass}
                  value={vehicle.converterSlippage ?? 5}
                  onChange={(e) => updateField('converterSlippage', parseFloat(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== FINAL DRIVE ===== */}
      <div className={sectionClass}>
        <div className={titleClass}>Final Drive</div>
        <div className={gridClass}>
          <div>
            <label className={labelClass}>
              Rear Gear Ratio
              <WorksheetButton onClick={() => setShowGearRatioWorksheet(true)} tooltip="Calculate gear ratio" />
            </label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={vehicle.rearGear ?? 3.73}
              onChange={(e) => updateField('rearGear', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Trans Efficiency</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={vehicle.transEfficiency ?? 0.97}
              onChange={(e) => updateField('transEfficiency', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}># of Gears</label>
            <select
              className={inputClass}
              value={vehicle.gearRatios?.length ?? 4}
              onChange={(e) => {
                const numGears = parseInt(e.target.value);
                const currentRatios = vehicle.gearRatios ?? [2.5, 1.8, 1.4, 1.0];
                const currentShifts = vehicle.shiftRPMs ?? [7000, 7000, 7000, 7000];
                
                // Adjust arrays to new size
                const newRatios = Array(numGears).fill(0).map((_, i) => currentRatios[i] ?? 1.0);
                const newShifts = Array(numGears).fill(0).map((_, i) => currentShifts[i] ?? 7000);
                
                onChange({
                  ...vehicle,
                  gearRatios: newRatios,
                  shiftRPMs: newShifts,
                });
              }}
            >
              {[1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Gear ratios inline */}
        {(vehicle.gearRatios?.length ?? 0) > 1 && (
          <div style={{ marginTop: '10px' }}>
            <label className={labelClass}>Gear Ratios</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {vehicle.gearRatios?.map((ratio, i) => (
                <div key={i} style={{ width: compact ? '60px' : '70px' }}>
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass}
                    style={{ textAlign: 'center' }}
                    value={ratio}
                    onChange={(e) => updateGearAt('gearRatios', i, parseFloat(e.target.value))}
                    title={`Gear ${i + 1}`}
                  />
                  <div style={{ fontSize: '0.65rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== THROTTLE STOP (Pro only or if enabled) ===== */}
      {(isPro || vehicle.throttleStopEnabled) && (
        <div className={sectionClass}>
          <div className={titleClass}>Throttle Stop</div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={vehicle.throttleStopEnabled ?? false}
                onChange={(e) => updateField('throttleStopEnabled', e.target.checked)}
              />
              Enable Throttle Stop
            </label>
          </div>
          {vehicle.throttleStopEnabled && (
            <div className={gridClass}>
              <div>
                <label className={labelClass}>Delay (sec)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={vehicle.throttleStopDelay ?? 0.5}
                  onChange={(e) => updateField('throttleStopDelay', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className={labelClass}>Duration (sec)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={vehicle.throttleStopDuration ?? 0.3}
                  onChange={(e) => updateField('throttleStopDuration', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className={labelClass}>Throttle %</label>
                <input
                  type="number"
                  step="1"
                  className={inputClass}
                  value={vehicle.throttleStopPct ?? 50}
                  onChange={(e) => updateField('throttleStopPct', parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Worksheet Modals */}
      <FrontalAreaWorksheet
        isOpen={showFrontalAreaWorksheet}
        onClose={() => setShowFrontalAreaWorksheet(false)}
        onApply={(value) => {
          updateField('frontalAreaFt2', value);
          setShowFrontalAreaWorksheet(false);
        }}
      />
      <TireWidthWorksheet
        isOpen={showTireWidthWorksheet}
        onClose={() => setShowTireWidthWorksheet(false)}
        onApply={(value) => {
          updateField('tireWidthIn', value);
          setShowTireWidthWorksheet(false);
        }}
      />
      <GearRatioWorksheet
        isOpen={showGearRatioWorksheet}
        onClose={() => setShowGearRatioWorksheet(false)}
        onApply={(value) => {
          updateField('rearGear', value);
          setShowGearRatioWorksheet(false);
        }}
      />
    </div>
  );
}
