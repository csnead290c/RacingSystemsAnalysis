/**
 * VehicleEditorPanel - Compact 1-page vehicle editor like original VB6 program
 * 
 * This component displays all vehicle settings in a single scrollable view,
 * organized into logical sections but without tabs. Designed to be used:
 * 1. As the main vehicle editor (replacing tabbed layout)
 * 2. As a popup/sidebar editor in the ET Sim page
 */

import { useState } from 'react';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import type { RaceLength } from '../../domain/config/raceLengths';
import { 
  WorksheetButton, 
  FrontalAreaWorksheet, 
  TireWidthWorksheet, 
  GearRatioWorksheet,
} from './WorksheetModal';
import { TOOLTIPS } from '../../domain/config/tooltips';

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

  // Styles
  const sectionStyle: React.CSSProperties = {
    marginBottom: compact ? '12px' : '20px',
    padding: compact ? '10px' : '14px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: compact ? '0.8rem' : '0.9rem',
    fontWeight: 600,
    color: 'var(--color-accent)',
    marginBottom: compact ? '8px' : '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr',
    gap: compact ? '8px' : '12px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: compact ? '0.7rem' : '0.75rem',
    color: 'var(--color-text-muted)',
    marginBottom: '2px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: compact ? '6px 8px' : '8px 10px',
    fontSize: compact ? '0.85rem' : '0.9rem',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  return (
    <div>
      {/* ===== IDENTITY ===== */}
      {showName && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Identity</div>
          <div style={gridStyle}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Vehicle Name *</label>
              <input
                type="text"
                style={inputStyle}
                value={vehicle.name ?? ''}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="My Race Car"
              />
            </div>
            <div>
              <label style={labelStyle}>Race Length</label>
              <select
                style={selectStyle}
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
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Vehicle</div>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Weight (lb) *</label>
            <input
              type="number"
              style={inputStyle}
              value={vehicle.weightLb ?? ''}
              onChange={(e) => updateField('weightLb', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Wheelbase (in)</label>
            <input
              type="number"
              style={inputStyle}
              value={vehicle.wheelbaseIn ?? 108}
              onChange={(e) => updateField('wheelbaseIn', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Rollout (in)</label>
            <input
              type="number"
              step="0.1"
              style={inputStyle}
              value={vehicle.rolloutIn ?? 12}
              onChange={(e) => updateField('rolloutIn', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Body Style</label>
            <select
              style={selectStyle}
              value={vehicle.bodyStyle ?? 6}
              onChange={(e) => updateField('bodyStyle', parseInt(e.target.value))}
            >
              {BODY_STYLES.map(bs => (
                <option key={bs.value} value={bs.value}>{bs.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              Frontal Area (ft²)
              <WorksheetButton onClick={() => setShowFrontalAreaWorksheet(true)} tooltip={TOOLTIPS.btnFrontalArea} />
            </label>
            <input
              type="number"
              step="0.1"
              style={inputStyle}
              value={vehicle.frontalAreaFt2 ?? 22}
              onChange={(e) => updateField('frontalAreaFt2', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Tire Dia (in)</label>
            <input
              type="number"
              step="0.1"
              style={inputStyle}
              value={vehicle.tireDiaIn ?? 28}
              onChange={(e) => updateField('tireDiaIn', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* ===== ENGINE ===== */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Engine</div>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Peak HP *</label>
            <input
              type="number"
              style={inputStyle}
              value={vehicle.powerHP ?? ''}
              onChange={(e) => updateField('powerHP', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>RPM @ Peak HP *</label>
            <input
              type="number"
              step="100"
              style={inputStyle}
              value={vehicle.rpmAtPeakHP ?? 6500}
              onChange={(e) => updateField('rpmAtPeakHP', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Displacement (CID)</label>
            <input
              type="number"
              style={inputStyle}
              value={vehicle.displacementCID ?? 350}
              onChange={(e) => updateField('displacementCID', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Fuel Type</label>
            <select
              style={selectStyle}
              value={vehicle.fuelType ?? 'Gasoline'}
              onChange={(e) => updateField('fuelType', e.target.value)}
            >
              {FUEL_TYPES.map(ft => (
                <option key={ft.value} value={ft.value}>{ft.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Shift RPM</label>
            <input
              type="number"
              step="100"
              style={inputStyle}
              value={vehicle.shiftRPMs?.[0] ?? 6500}
              onChange={(e) => {
                const rpm = parseFloat(e.target.value);
                const numGears = vehicle.gearRatios?.length ?? 4;
                updateField('shiftRPMs', Array(numGears).fill(rpm));
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>Rev Limiter</label>
            <input
              type="number"
              step="100"
              style={inputStyle}
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
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Transmission</div>
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
        <div style={gridStyle}>
          {transType === 'clutch' ? (
            <>
              <div>
                <label style={labelStyle}>Launch RPM</label>
                <input
                  type="number"
                  step="100"
                  style={inputStyle}
                  value={vehicle.clutchLaunchRPM ?? 5500}
                  onChange={(e) => updateField('clutchLaunchRPM', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label style={labelStyle}>Slip RPM</label>
                <input
                  type="number"
                  step="100"
                  style={inputStyle}
                  value={vehicle.clutchSlipRPM ?? 6000}
                  onChange={(e) => updateField('clutchSlipRPM', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label style={labelStyle}>Slippage Factor</label>
                <input
                  type="number"
                  step="0.001"
                  style={inputStyle}
                  value={vehicle.clutchSlippage ?? 1.004}
                  onChange={(e) => updateField('clutchSlippage', parseFloat(e.target.value))}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={labelStyle}>Stall RPM</label>
                <input
                  type="number"
                  step="100"
                  style={inputStyle}
                  value={vehicle.converterStallRPM ?? 3000}
                  onChange={(e) => updateField('converterStallRPM', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label style={labelStyle}>Torque Mult</label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={vehicle.converterTorqueMult ?? 2.0}
                  onChange={(e) => updateField('converterTorqueMult', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label style={labelStyle}>Slippage %</label>
                <input
                  type="number"
                  step="0.1"
                  style={inputStyle}
                  value={vehicle.converterSlippage ?? 5}
                  onChange={(e) => updateField('converterSlippage', parseFloat(e.target.value))}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== FINAL DRIVE ===== */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Final Drive</div>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>
              Rear Gear Ratio
              <WorksheetButton onClick={() => setShowGearRatioWorksheet(true)} tooltip="Calculate gear ratio" />
            </label>
            <input
              type="number"
              step="0.01"
              style={inputStyle}
              value={vehicle.rearGear ?? 3.73}
              onChange={(e) => updateField('rearGear', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}>Trans Efficiency</label>
            <input
              type="number"
              step="0.01"
              style={inputStyle}
              value={vehicle.transEfficiency ?? 0.97}
              onChange={(e) => updateField('transEfficiency', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label style={labelStyle}># of Gears</label>
            <select
              style={selectStyle}
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
            <label style={labelStyle}>Gear Ratios</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {vehicle.gearRatios?.map((ratio, i) => (
                <div key={i} style={{ width: compact ? '60px' : '70px' }}>
                  <input
                    type="number"
                    step="0.01"
                    style={{ ...inputStyle, textAlign: 'center' }}
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
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Throttle Stop</div>
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
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Delay (sec)</label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={vehicle.throttleStopDelay ?? 0.5}
                  onChange={(e) => updateField('throttleStopDelay', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label style={labelStyle}>Duration (sec)</label>
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={vehicle.throttleStopDuration ?? 0.3}
                  onChange={(e) => updateField('throttleStopDuration', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label style={labelStyle}>Throttle %</label>
                <input
                  type="number"
                  step="1"
                  style={inputStyle}
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
