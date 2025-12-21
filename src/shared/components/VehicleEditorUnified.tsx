/**
 * VehicleEditorUnified - Single vehicle editor with Simple/Advanced modes
 * 
 * Features:
 * - Simple mode (default): Quarter Jr style inputs - just the essentials
 * - Advanced mode: Quarter Pro style inputs - full control (dyno curve, per-gear shifts, PMI)
 * - Mode saved PER VEHICLE (not global)
 * - Clean, modern UI with responsive grid
 * - Works in both full page and popup (compact) contexts
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import type { RaceLength } from '../../domain/config/raceLengths';
import { useSubscription } from '../../domain/config/useSubscription';
import { 
  WorksheetButton, 
  FrontalAreaWorksheet, 
  TireWidthWorksheet, 
  GearRatioWorksheet,
  PMIWorksheet,
  DragCoefHelp,
} from './WorksheetModal';
import { TOOLTIPS } from '../../domain/config/tooltips';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================================================
// Types
// ============================================================================

type TransType = 'clutch' | 'converter';

interface VehicleEditorUnifiedProps {
  vehicle: Partial<Vehicle>;
  onChange: (vehicle: Partial<Vehicle>) => void;
  compact?: boolean;      // Compact mode for popup use
  showName?: boolean;     // Show name/identity section
  showModeToggle?: boolean; // Show Simple/Advanced toggle (default true)
}

// ============================================================================
// Constants
// ============================================================================

const FUEL_TYPES = [
  { value: 'Gasoline', label: 'Gasoline (Carbureted)' },
  { value: 'Gasoline Injector', label: 'Gasoline (Injector)' },
  { value: 'Methanol', label: 'Methanol (Carbureted)' },
  { value: 'Methanol Injector', label: 'Methanol (Injector)' },
  { value: 'Nitromethane', label: 'Nitromethane (Injector)' },
  { value: 'Supercharged Gasoline', label: 'Supercharged Gasoline' },
  { value: 'Supercharged Methanol', label: 'Supercharged Methanol' },
  { value: 'Supercharged Nitro', label: 'Supercharged Nitro' },
  { value: 'E85', label: 'E85' },
  { value: 'Diesel', label: 'Diesel' },
] as const;

const BODY_STYLES = [
  { value: 1, label: 'Dragster w/ Wing' },
  { value: 2, label: 'Dragster' },
  { value: 3, label: 'Funny Car' },
  { value: 4, label: 'Altered/Roadster' },
  { value: 5, label: 'Fastback' },
  { value: 6, label: 'Sedan' },
  { value: 7, label: 'Wagon/Van' },
  { value: 8, label: 'Motorcycle' },
] as const;

// ============================================================================
// Styles
// ============================================================================

const createStyles = (compact: boolean) => ({
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: compact ? '12px' : '16px',
  },
  modeToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: compact ? '8px 12px' : '10px 14px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  },
  modeLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
  },
  modeButton: (active: boolean) => ({
    padding: '4px 12px',
    fontSize: '0.75rem',
    fontWeight: active ? 600 : 400,
    borderRadius: '4px',
    border: 'none',
    backgroundColor: active ? 'var(--color-accent)' : 'transparent',
    color: active ? 'white' : 'var(--color-text)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  section: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    padding: compact ? '12px' : '16px',
  },
  sectionTitle: {
    fontSize: compact ? '0.8rem' : '0.85rem',
    fontWeight: 600,
    color: 'var(--color-accent)',
    marginBottom: compact ? '10px' : '14px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  proBadge: {
    fontSize: '0.6rem',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: '#8b5cf6',
    fontWeight: 500,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: compact ? '10px' : '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: compact ? '0.7rem' : '0.75rem',
    fontWeight: 500,
    color: 'var(--color-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  input: {
    padding: compact ? '6px 8px' : '8px 10px',
    fontSize: compact ? '0.85rem' : '0.9rem',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    width: '100%',
  },
  select: {
    padding: compact ? '6px 8px' : '8px 10px',
    fontSize: compact ? '0.85rem' : '0.9rem',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    width: '100%',
  },
  hint: {
    fontSize: '0.65rem',
    color: 'var(--color-muted)',
    marginTop: '2px',
  },
  required: {
    color: '#ef4444',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  divider: {
    borderTop: '1px solid var(--color-border)',
    marginTop: '12px',
    paddingTop: '12px',
  },
  lockedOverlay: {
    padding: '20px',
    textAlign: 'center' as const,
    color: 'var(--color-muted)',
  },
});

// ============================================================================
// NumericInput Component - Handles decimal entry properly
// ============================================================================

interface NumericInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  step?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  min?: number;
  max?: number;
}

/**
 * A number input that handles decimal entry properly.
 * Uses local string state to allow typing "1." without losing the decimal point.
 * Only parses to number on blur or when input is valid.
 */
function NumericInput({ value, onChange, step, style, placeholder, min, max }: NumericInputProps) {
  const [localValue, setLocalValue] = useState(value?.toString() ?? '');
  const [isFocused, setIsFocused] = useState(false);
  
  // Sync from external value when not focused
  // Round to avoid floating point display issues (e.g., 0.9900000000000002)
  useEffect(() => {
    if (!isFocused && value !== undefined) {
      // Round to reasonable precision based on step
      const precision = step ? Math.max(0, -Math.floor(Math.log10(parseFloat(step)))) : 6;
      const rounded = Number(value.toFixed(precision));
      setLocalValue(rounded.toString());
    }
  }, [value, isFocused, step]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Only update parent if we have a valid complete number
    // (not ending in "." or "-" which would be incomplete)
    if (newValue !== '' && !newValue.endsWith('.') && !newValue.endsWith('-')) {
      const parsed = parseFloat(newValue);
      if (!isNaN(parsed)) {
        onChange(parsed);
      }
    }
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    // On blur, ensure we have a valid number
    if (localValue === '' || localValue === '-' || localValue === '.') {
      setLocalValue(value?.toString() ?? '');
    } else {
      const parsed = parseFloat(localValue);
      if (!isNaN(parsed)) {
        onChange(parsed);
        setLocalValue(parsed.toString());
      } else {
        setLocalValue(value?.toString() ?? '');
      }
    }
  };
  
  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*\.?[0-9]*"
      style={style}
      value={localValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      step={step}
      placeholder={placeholder}
      min={min}
      max={max}
    />
  );
}

// ============================================================================
// Field Component
// ============================================================================

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  worksheetButton?: React.ReactNode;
  compact?: boolean;
}

function Field({ label, required, hint, children, worksheetButton, compact }: FieldProps) {
  const styles = createStyles(compact ?? false);
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
        {worksheetButton}
      </label>
      {children}
      {hint && <div style={styles.hint}>{hint}</div>}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function VehicleEditorUnified({
  vehicle,
  onChange,
  compact = false,
  showName = true,
  showModeToggle = true,
}: VehicleEditorUnifiedProps) {
  const { features } = useSubscription();
  const hasProAccess = features.quarterProFields;
  const hasThrottleStop = features.throttleStop;
  
  // Mode is stored PER VEHICLE (not global)
  // Default to 'simple' if not set
  const isAdvanced = vehicle.editorMode === 'advanced';
  
  // Toggle mode and save to vehicle
  const setIsAdvanced = (advanced: boolean) => {
    onChange({ ...vehicle, editorMode: advanced ? 'advanced' : 'simple' });
  };
  
  // Worksheet modals
  const [showFrontalAreaWorksheet, setShowFrontalAreaWorksheet] = useState(false);
  const [showTireWidthWorksheet, setShowTireWidthWorksheet] = useState(false);
  const [showGearRatioWorksheet, setShowGearRatioWorksheet] = useState(false);
  const [showEnginePMIWorksheet, setShowEnginePMIWorksheet] = useState(false);
  const [showTransPMIWorksheet, setShowTransPMIWorksheet] = useState(false);
  const [showTiresPMIWorksheet, setShowTiresPMIWorksheet] = useState(false);
  const [showDragCoefHelp, setShowDragCoefHelp] = useState(false);
  const [showRecalcConfirm, setShowRecalcConfirm] = useState(false);
  
  // Existing vehicle groups for dropdown
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  
  // Load existing groups from actual vehicles
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const { loadVehicles } = await import('../../state/vehicles');
        const vehicles = await loadVehicles();
        const groups = [...new Set(vehicles.map(v => v.group).filter(Boolean))] as string[];
        setExistingGroups(groups);
      } catch { /* ignore */ }
    };
    loadGroups();
  }, []);
  
  const styles = useMemo(() => createStyles(compact), [compact]);
  
  // Only show advanced fields if user has Pro access AND vehicle is in advanced mode
  const showAdvanced = isAdvanced && hasProAccess;
  
  // Tire size mode: diameter or rollout
  const tireMode = vehicle.tireRolloutMode ?? 'diameter';
  
  const transType: TransType = (vehicle.transmissionType as TransType) ?? 'clutch';
  
  // Helpers
  const updateField = useCallback((field: keyof Vehicle, value: unknown) => {
    onChange({ ...vehicle, [field]: value });
  }, [vehicle, onChange]);
  
  const updateGearAt = useCallback((field: 'gearRatios' | 'gearEfficiencies' | 'shiftRPMs', index: number, value: number) => {
    const arr = [...(vehicle[field] ?? [])];
    arr[index] = value;
    onChange({ ...vehicle, [field]: arr });
  }, [vehicle, onChange]);
  
  return (
    <div style={styles.container}>
      {/* Mode Toggle - Show for all users, but lock Advanced for non-Pro */}
      {showModeToggle && (
        <div style={styles.modeToggle}>
          <span style={styles.modeLabel}>View:</span>
          <button
            style={styles.modeButton(!isAdvanced)}
            onClick={() => setIsAdvanced(false)}
          >
            Simple
          </button>
          <button
            style={{
              ...styles.modeButton(isAdvanced && hasProAccess),
              opacity: hasProAccess ? 1 : 0.6,
              cursor: hasProAccess ? 'pointer' : 'not-allowed',
            }}
            onClick={() => {
              if (hasProAccess) {
                setIsAdvanced(true);
              } else {
                alert('Advanced mode requires a Pro subscription. Upgrade to access full vehicle configuration including dyno curves, per-gear efficiencies, and PMI settings.');
              }
            }}
            title={hasProAccess ? 'Switch to Advanced mode' : 'Pro subscription required'}
          >
            Advanced {!hasProAccess && '🔒'}
          </button>
        </div>
      )}
      
      {/* ===== IDENTITY ===== */}
      {showName && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Vehicle</div>
          <div style={styles.grid}>
            <div style={{ gridColumn: 'span 2' }}>
              <Field label="Name" required compact={compact}>
                <input
                  type="text"
                  style={styles.input}
                  value={vehicle.name ?? ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="My Race Car"
                />
              </Field>
            </div>
            <Field label="Race Length" compact={compact}>
              <select
                style={styles.select}
                value={vehicle.defaultRaceLength ?? 'QUARTER'}
                onChange={(e) => updateField('defaultRaceLength', e.target.value as RaceLength)}
              >
                <option value="EIGHTH">1/8 Mile</option>
                <option value="QUARTER">1/4 Mile</option>
              </select>
            </Field>
            <Field label="Group" compact={compact}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <select
                  style={{ ...styles.select, flex: 1 }}
                  value={existingGroups.includes(vehicle.group ?? '') ? vehicle.group : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom__') {
                      updateField('group', e.target.value);
                    }
                  }}
                >
                  <option value="">None</option>
                  {existingGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  <option value="__custom__">Custom...</option>
                </select>
                {(!existingGroups.includes(vehicle.group ?? '') || vehicle.group === '') && (
                  <input
                    type="text"
                    style={{ ...styles.input, flex: 1 }}
                    value={vehicle.group ?? ''}
                    onChange={(e) => updateField('group', e.target.value)}
                    placeholder="Enter group"
                  />
                )}
              </div>
            </Field>
          </div>
        </div>
      )}

      {/* ===== WEIGHT & CHASSIS ===== */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Weight & Chassis</div>
        <div style={styles.grid}>
          <Field label="Weight (lb)" required compact={compact}>
            <input
              type="number"
              style={styles.input}
              value={vehicle.weightLb ?? ''}
              onChange={(e) => updateField('weightLb', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Wheelbase (in)" compact={compact}>
            <input
              type="number"
              style={styles.input}
              value={vehicle.wheelbaseIn ?? 108}
              onChange={(e) => updateField('wheelbaseIn', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Rollout (in)" hint={TOOLTIPS.rollout} compact={compact}>
            <input
              type="number"
              step="0.1"
              style={styles.input}
              value={vehicle.rolloutIn ?? 12}
              onChange={(e) => updateField('rolloutIn', parseFloat(e.target.value))}
            />
          </Field>
          {showAdvanced && (
            <Field label="Overhang (in)" compact={compact}>
              <input
                type="number"
                style={styles.input}
                value={vehicle.overhangIn ?? 40}
                onChange={(e) => updateField('overhangIn', parseFloat(e.target.value))}
              />
            </Field>
          )}
        </div>
      </div>

      {/* ===== ENGINE ===== */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Engine</div>
        
        {/* Simple mode: Peak HP, RPM @ Peak, Shift RPM, Displacement */}
        {!showAdvanced && (
          <div style={styles.grid}>
            <Field label="Peak HP" required compact={compact}>
              <input
                type="number"
                style={styles.input}
                value={vehicle.powerHP ?? ''}
                onChange={(e) => updateField('powerHP', parseFloat(e.target.value))}
              />
            </Field>
            <Field label="RPM @ Peak HP" required compact={compact}>
              <input
                type="number"
                step="100"
                style={styles.input}
                value={vehicle.rpmAtPeakHP ?? 6500}
                onChange={(e) => updateField('rpmAtPeakHP', parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Shift RPM" hint="All gears" compact={compact}>
              <input
                type="number"
                step="100"
                style={styles.input}
                value={vehicle.shiftRPMs?.[0] ?? 6500}
                onChange={(e) => {
                  const rpm = parseFloat(e.target.value);
                  const count = vehicle.gearRatios?.length ?? 4;
                  onChange({ ...vehicle, shiftRPMs: Array(count).fill(rpm) });
                }}
              />
            </Field>
            <Field label="Fuel Type" compact={compact}>
              <select
                style={styles.select}
                value={vehicle.fuelType ?? 'Gasoline'}
                onChange={(e) => updateField('fuelType', e.target.value)}
              >
                {FUEL_TYPES.map(ft => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Displacement (CID)" compact={compact}>
              <input
                type="number"
                style={styles.input}
                value={vehicle.displacementCID ?? ''}
                onChange={(e) => updateField('displacementCID', parseFloat(e.target.value))}
                placeholder="350"
              />
            </Field>
          </div>
        )}
        
        {/* Advanced mode: Dyno curve supersedes Peak HP/RPM, per-gear shifts in gear table */}
        {showAdvanced && (
          <>
            <div style={styles.grid}>
              <Field label="Fuel Type" compact={compact}>
                <select
                  style={styles.select}
                  value={vehicle.fuelType ?? 'Gasoline'}
                  onChange={(e) => updateField('fuelType', e.target.value)}
                >
                  {FUEL_TYPES.map(ft => (
                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="HP/TQ Multiplier" hint="Scales dyno curve" compact={compact}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="number"
                    step="0.01"
                    style={{ ...styles.input, flex: 1 }}
                    value={vehicle.hpTorqueMultiplier ?? 1.0}
                    onChange={(e) => updateField('hpTorqueMultiplier', parseFloat(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecalcConfirm(true)}
                    style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    title="Apply multiplier to dyno curve and reset to 1.0"
                  >
                    Recalc
                  </button>
                </div>
              </Field>
            </div>
            
            {/* Dyno Curve Entry */}
            <div style={styles.divider}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>HP Curve (Dyno Data)</span>
                <button
                  type="button"
                  onClick={() => {
                    const curve = vehicle.hpCurve ?? [];
                    const lastRPM = curve.length > 0 ? curve[curve.length - 1].rpm + 500 : 3000;
                    const lastHP = curve.length > 0 ? curve[curve.length - 1].hp : 100;
                    onChange({ ...vehicle, hpCurve: [...curve, { rpm: lastRPM, hp: lastHP }] });
                  }}
                  style={{ padding: '4px 10px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer' }}
                >
                  + Add Point
                </button>
              </div>
              
              {(vehicle.hpCurve?.length ?? 0) === 0 ? (
                <div style={{ padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-muted)', textAlign: 'center' }}>
                  No dyno data. Click "+ Add Point" to enter HP curve, or switch to Simple mode to use Peak HP.
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '6px', fontSize: '0.65rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '4px' }}>
                    <div>RPM</div>
                    <div>HP</div>
                    <div></div>
                  </div>
                  {(vehicle.hpCurve ?? []).map((point, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '6px', marginBottom: '4px', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="100"
                        style={{ ...styles.input, padding: '4px 6px', fontSize: '0.8rem' }}
                        value={point.rpm}
                        onChange={(e) => {
                          const curve = [...(vehicle.hpCurve ?? [])];
                          curve[i] = { ...curve[i], rpm: parseFloat(e.target.value) || 0 };
                          onChange({ ...vehicle, hpCurve: curve });
                        }}
                      />
                      <input
                        type="number"
                        step="1"
                        style={{ ...styles.input, padding: '4px 6px', fontSize: '0.8rem' }}
                        value={point.hp}
                        onChange={(e) => {
                          const curve = [...(vehicle.hpCurve ?? [])];
                          curve[i] = { ...curve[i], hp: parseFloat(e.target.value) || 0 };
                          onChange({ ...vehicle, hpCurve: curve });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const curve = [...(vehicle.hpCurve ?? [])];
                          curve.splice(i, 1);
                          onChange({ ...vehicle, hpCurve: curve });
                        }}
                        style={{ padding: '2px 6px', fontSize: '0.7rem', borderRadius: '4px', border: 'none', background: 'var(--color-error)', color: 'white', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {/* Dyno Curve Graph */}
                  {(vehicle.hpCurve?.length ?? 0) >= 2 && (
                    <div style={{ marginTop: '16px', height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={(vehicle.hpCurve ?? []).map(pt => ({
                            rpm: pt.rpm,
                            hp: pt.hp,
                            torque: pt.rpm > 0 ? Math.round((pt.hp * 5252) / pt.rpm) : 0,
                          })).sort((a, b) => a.rpm - b.rpm)}
                          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis 
                            dataKey="rpm" 
                            tick={{ fontSize: 10 }} 
                            stroke="var(--color-muted)"
                            label={{ value: 'RPM', position: 'bottom', fontSize: 10, fill: 'var(--color-muted)' }}
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 10 }} 
                            stroke="var(--color-muted)"
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            tick={{ fontSize: 10 }} 
                            stroke="var(--color-muted)"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'var(--color-surface)', 
                              border: '1px solid var(--color-border)',
                              fontSize: '0.75rem',
                            }} 
                          />
                          <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="hp" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name="HP"
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="torque" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            name="Torque (lb-ft)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
        
        <div style={{ marginTop: '10px' }}>
          <label style={styles.checkbox}>
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
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Transmission</div>
        
        {/* Trans type toggle */}
        <div style={styles.radioGroup}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              name="transType"
              checked={transType === 'clutch'}
              onChange={() => updateField('transmissionType', 'clutch')}
            />
            Clutch (Manual)
          </label>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              name="transType"
              checked={transType === 'converter'}
              onChange={() => updateField('transmissionType', 'converter')}
            />
            Converter (Auto)
          </label>
        </div>
        
        <div style={styles.grid}>
          {transType === 'clutch' ? (
            /* CLUTCH: Simple = Slip RPM only, Advanced = adds Launch RPM, Slippage, Lockup */
            <>
              {showAdvanced && (
                <Field label="Launch RPM" compact={compact}>
                  <input
                    type="number"
                    step="100"
                    style={styles.input}
                    value={vehicle.clutchLaunchRPM ?? 5500}
                    onChange={(e) => updateField('clutchLaunchRPM', parseFloat(e.target.value))}
                  />
                </Field>
              )}
              <Field label="Slip RPM" compact={compact}>
                <input
                  type="number"
                  step="100"
                  style={styles.input}
                  value={vehicle.clutchSlipRPM ?? 6000}
                  onChange={(e) => updateField('clutchSlipRPM', parseFloat(e.target.value))}
                />
              </Field>
              {showAdvanced && (
                <Field label="Slippage" hint="1.0-1.02" compact={compact}>
                  <input
                    type="number"
                    step="0.001"
                    style={styles.input}
                    value={vehicle.clutchSlippage ?? 1.004}
                    onChange={(e) => updateField('clutchSlippage', parseFloat(e.target.value))}
                  />
                </Field>
              )}
            </>
          ) : (
            /* CONVERTER: Simple = Stall RPM + Diameter, Advanced = adds Torque Mult, Slippage */
            <>
              <Field label="Stall RPM" compact={compact}>
                <input
                  type="number"
                  step="100"
                  style={styles.input}
                  value={vehicle.converterStallRPM ?? 3500}
                  onChange={(e) => updateField('converterStallRPM', parseFloat(e.target.value))}
                />
              </Field>
              {!showAdvanced && (
                /* Simple mode: show diameter */
                <Field label="Diameter (in)" compact={compact}>
                  <input
                    type="number"
                    step="0.25"
                    style={styles.input}
                    value={vehicle.converterDiameterIn ?? 10}
                    onChange={(e) => updateField('converterDiameterIn', parseFloat(e.target.value))}
                  />
                </Field>
              )}
              {showAdvanced && (
                /* Advanced mode: Torque Mult + Slippage */
                <>
                  <Field label="Torque Mult" hint="1.8-2.5" compact={compact}>
                    <input
                      type="number"
                      step="0.1"
                      style={styles.input}
                      value={vehicle.converterTorqueMult ?? 2.0}
                      onChange={(e) => updateField('converterTorqueMult', parseFloat(e.target.value))}
                    />
                  </Field>
                  <Field label="Slippage" hint="1.0-1.05" compact={compact}>
                    <input
                      type="number"
                      step="0.001"
                      style={styles.input}
                      value={vehicle.converterSlippage ?? 1.0}
                      onChange={(e) => updateField('converterSlippage', parseFloat(e.target.value))}
                    />
                  </Field>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Lockup option - shown for both clutch and converter in both Simple and Advanced modes */}
        <div style={{ marginTop: '12px' }}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={transType === 'clutch' ? (vehicle.clutchLockup ?? false) : (vehicle.converterLockup ?? false)}
              onChange={(e) => updateField(transType === 'clutch' ? 'clutchLockup' : 'converterLockup', e.target.checked)}
            />
            {transType === 'clutch' ? 'Clutch Lockup (no slip after launch)' : 'Converter Lockup (locks up after launch)'}
          </label>
        </div>
      </div>

      {/* ===== FINAL DRIVE & TIRES ===== */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Final Drive & Tires</div>
        <div style={styles.grid}>
          <Field 
            label="Rear Gear Ratio" 
            required 
            worksheetButton={<WorksheetButton onClick={() => setShowGearRatioWorksheet(true)} tooltip="Calculate gear ratio" />}
            compact={compact}
          >
            <NumericInput
              step="0.01"
              style={styles.input}
              value={vehicle.rearGear ?? 3.73}
              onChange={(val) => updateField('rearGear', val)}
            />
          </Field>
          {showAdvanced && (
            <Field label="Efficiency" hint="0.95-0.98" compact={compact}>
              <input
                type="number"
                step="0.005"
                style={styles.input}
                value={vehicle.finalDriveEfficiency ?? 0.97}
                onChange={(e) => updateField('finalDriveEfficiency', parseFloat(e.target.value))}
              />
            </Field>
          )}
          {/* Tire size: Diameter OR Rollout option */}
          <Field label="Tire Size" required compact={compact}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <label style={{ ...styles.radioLabel, fontSize: '0.7rem' }}>
                <input
                  type="radio"
                  name="tireMode"
                  checked={tireMode === 'diameter'}
                  onChange={() => {
                    // Convert rollout to diameter when switching
                    const currentRollout = vehicle.tireRolloutIn ?? (vehicle.tireDiaIn ?? 28) * Math.PI;
                    const calculatedDia = Math.round((currentRollout / Math.PI) * 100) / 100;
                    onChange({ ...vehicle, tireRolloutMode: 'diameter', tireDiaIn: calculatedDia });
                  }}
                />
                Diameter
              </label>
              <label style={{ ...styles.radioLabel, fontSize: '0.7rem' }}>
                <input
                  type="radio"
                  name="tireMode"
                  checked={tireMode === 'circumference'}
                  onChange={() => {
                    // Convert diameter to rollout when switching
                    const currentDia = vehicle.tireDiaIn ?? 28;
                    const calculatedRollout = Math.round(currentDia * Math.PI * 100) / 100;
                    onChange({ ...vehicle, tireRolloutMode: 'circumference', tireRolloutIn: calculatedRollout });
                  }}
                />
                Rollout
              </label>
            </div>
            <input
              type="number"
              step="0.5"
              style={styles.input}
              value={tireMode === 'diameter' ? (vehicle.tireDiaIn ?? 28) : (vehicle.tireRolloutIn ?? 88)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (tireMode === 'diameter') {
                  updateField('tireDiaIn', val);
                } else {
                  updateField('tireRolloutIn', val);
                }
              }}
              placeholder={tireMode === 'diameter' ? 'Diameter (in)' : 'Rollout (in)'}
            />
          </Field>
          <Field 
            label="Tire Width (in)"
            worksheetButton={<WorksheetButton onClick={() => setShowTireWidthWorksheet(true)} tooltip={TOOLTIPS.btnTireWidth} />}
            compact={compact}
          >
            <input
              type="number"
              step="0.5"
              style={styles.input}
              value={vehicle.tireWidthIn ?? 10}
              onChange={(e) => updateField('tireWidthIn', parseFloat(e.target.value))}
            />
          </Field>
        </div>
        
        {/* Gear Ratios - Add/Remove Style */}
        <div style={styles.divider}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Gear Ratios</span>
            <button
              type="button"
              onClick={() => {
                const ratios = vehicle.gearRatios ?? [2.50, 1.80, 1.40, 1.00];
                const shifts = vehicle.shiftRPMs ?? [7000, 7000, 7000, 7000];
                const effs = vehicle.gearEfficiencies ?? [0.990, 0.990, 0.990, 0.990];
                const lastRatio = ratios[ratios.length - 1] ?? 1.0;
                onChange({
                  ...vehicle,
                  gearRatios: [...ratios, Math.max(0.5, lastRatio - 0.3)],
                  shiftRPMs: [...shifts, shifts[shifts.length - 1] ?? 7000],
                  gearEfficiencies: [...effs, effs[effs.length - 1] ?? 0.990],
                });
              }}
              style={{ padding: '4px 10px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer' }}
            >
              + Add Gear
            </button>
          </div>
          
          {showAdvanced ? (
            // Advanced: Table with Ratio/Efficiency/Shift@ + remove button
            <>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '32px 1fr 1fr 1fr 32px', 
                gap: '6px',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--color-muted)',
                marginBottom: '6px',
              }}>
                <div></div>
                <div>Ratio</div>
                <div>Eff.</div>
                <div>Shift@</div>
                <div></div>
              </div>
              {(vehicle.gearRatios ?? [2.50, 1.80, 1.40, 1.00]).map((_, i) => (
                <div key={i} style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '32px 1fr 1fr 1fr 32px', 
                  gap: '6px',
                  marginBottom: '4px',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>{i+1}</div>
                  <NumericInput
                    step="0.01"
                    style={{ ...styles.input, padding: '4px 6px', fontSize: '0.8rem' }}
                    value={vehicle.gearRatios?.[i] ?? 0}
                    onChange={(val) => updateGearAt('gearRatios', i, val)}
                  />
                  <NumericInput
                    step="0.001"
                    style={{ ...styles.input, padding: '4px 6px', fontSize: '0.8rem' }}
                    value={vehicle.gearEfficiencies?.[i] ?? 0.99}
                    onChange={(val) => updateGearAt('gearEfficiencies', i, val)}
                  />
                  <input
                    type="number"
                    step="100"
                    style={{ ...styles.input, padding: '4px 6px', fontSize: '0.8rem' }}
                    value={vehicle.shiftRPMs?.[i] ?? 7000}
                    onChange={(e) => updateGearAt('shiftRPMs', i, parseFloat(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if ((vehicle.gearRatios?.length ?? 0) <= 1) return;
                      const newRatios = [...(vehicle.gearRatios ?? [])];
                      const newShifts = [...(vehicle.shiftRPMs ?? [])];
                      const newEffs = [...(vehicle.gearEfficiencies ?? [])];
                      newRatios.splice(i, 1);
                      newShifts.splice(i, 1);
                      newEffs.splice(i, 1);
                      onChange({ ...vehicle, gearRatios: newRatios, shiftRPMs: newShifts, gearEfficiencies: newEffs });
                    }}
                    disabled={(vehicle.gearRatios?.length ?? 0) <= 1}
                    style={{ 
                      padding: '2px 6px', 
                      fontSize: '0.7rem', 
                      borderRadius: '4px', 
                      border: 'none', 
                      background: (vehicle.gearRatios?.length ?? 0) <= 1 ? 'var(--color-muted)' : 'var(--color-error)', 
                      color: 'white', 
                      cursor: (vehicle.gearRatios?.length ?? 0) <= 1 ? 'not-allowed' : 'pointer',
                      opacity: (vehicle.gearRatios?.length ?? 0) <= 1 ? 0.5 : 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </>
          ) : (
            // Simple: Just gear ratios with add/remove
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {(vehicle.gearRatios ?? [2.50, 1.80, 1.40, 1.00]).map((_, i) => (
                  <div key={i} style={{ flex: '0 0 auto', minWidth: '60px', position: 'relative' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)', marginBottom: '2px', textAlign: 'center' }}>
                      {i+1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <NumericInput
                        step="0.01"
                        style={{ ...styles.input, padding: '6px', textAlign: 'center', width: '55px' }}
                        value={vehicle.gearRatios?.[i] ?? 0}
                        onChange={(val) => updateGearAt('gearRatios', i, val)}
                      />
                      {(vehicle.gearRatios?.length ?? 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newRatios = [...(vehicle.gearRatios ?? [])];
                            const newShifts = [...(vehicle.shiftRPMs ?? [])];
                            const newEffs = [...(vehicle.gearEfficiencies ?? [])];
                            newRatios.splice(i, 1);
                            newShifts.splice(i, 1);
                            newEffs.splice(i, 1);
                            onChange({ ...vehicle, gearRatios: newRatios, shiftRPMs: newShifts, gearEfficiencies: newEffs });
                          }}
                          style={{ padding: '2px 4px', fontSize: '0.6rem', borderRadius: '3px', border: 'none', background: 'var(--color-error)', color: 'white', cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== AERO ===== */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          Aerodynamics
          {showAdvanced && <span style={styles.proBadge}>Pro</span>}
        </div>
        <div style={styles.grid}>
          {/* Simple mode: Body Style + Frontal Area */}
          {!showAdvanced && (
            <Field label="Body Style" compact={compact}>
              <select
                style={styles.select}
                value={vehicle.bodyStyle ?? 6}
                onChange={(e) => updateField('bodyStyle', parseInt(e.target.value))}
              >
                {BODY_STYLES.map(bs => (
                  <option key={bs.value} value={bs.value}>{bs.label}</option>
                ))}
              </select>
            </Field>
          )}
          <Field 
            label="Frontal Area (ft²)"
            worksheetButton={<WorksheetButton onClick={() => setShowFrontalAreaWorksheet(true)} tooltip={TOOLTIPS.btnFrontalArea} />}
            compact={compact}
          >
            <input
              type="number"
              step="0.5"
              style={styles.input}
              value={vehicle.frontalAreaFt2 ?? 22}
              onChange={(e) => updateField('frontalAreaFt2', parseFloat(e.target.value))}
            />
          </Field>
          {/* Advanced mode: Cd and Lift Coeff instead of Body Style */}
          {showAdvanced && (
            <>
              <Field 
                label="Drag Coeff (Cd)" 
                hint="0.3-0.5" 
                worksheetButton={
                  <button
                    type="button"
                    onClick={() => setShowDragCoefHelp(true)}
                    title="Help for Drag Coefficient"
                    style={{ padding: '2px 6px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', marginLeft: '4px' }}
                  >
                    ?
                  </button>
                }
                compact={compact}
              >
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={vehicle.cd ?? 0.35}
                  onChange={(e) => updateField('cd', parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Lift Coeff" hint="+ = lift" compact={compact}>
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={vehicle.liftCoeff ?? 0.1}
                  onChange={(e) => updateField('liftCoeff', parseFloat(e.target.value))}
                />
              </Field>
            </>
          )}
        </div>
      </div>

      {/* ===== PMI (Advanced only) ===== */}
      {showAdvanced && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Polar Moments of Inertia
            <span style={styles.proBadge}>Pro</span>
          </div>
          <div style={styles.grid}>
            <Field 
              label="Engine + Flywheel" 
              worksheetButton={<WorksheetButton onClick={() => setShowEnginePMIWorksheet(true)} tooltip="Calculate Engine PMI" />}
              compact={compact}
            >
              <input
                type="number"
                step="0.01"
                style={styles.input}
                value={vehicle.enginePMI ?? ''}
                onChange={(e) => updateField('enginePMI', parseFloat(e.target.value))}
                placeholder="Auto-calc if blank"
              />
            </Field>
            <Field 
              label="Trans + Driveshaft" 
              worksheetButton={<WorksheetButton onClick={() => setShowTransPMIWorksheet(true)} tooltip="Calculate Trans PMI" />}
              compact={compact}
            >
              <input
                type="number"
                step="0.001"
                style={styles.input}
                value={vehicle.transPMI ?? ''}
                onChange={(e) => updateField('transPMI', parseFloat(e.target.value))}
                placeholder="Auto-calc"
              />
            </Field>
            <Field 
              label="Tires + Wheels" 
              worksheetButton={<WorksheetButton onClick={() => setShowTiresPMIWorksheet(true)} tooltip="Calculate Tire PMI" />}
              compact={compact}
            >
              <input
                type="number"
                step="0.1"
                style={styles.input}
                value={vehicle.tiresPMI ?? ''}
                onChange={(e) => updateField('tiresPMI', parseFloat(e.target.value))}
                placeholder="Auto-calc"
              />
            </Field>
          </div>
        </div>
      )}

      {/* ===== THROTTLE STOP (Advanced only) ===== */}
      {showAdvanced && hasThrottleStop && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            Throttle Stop
            <span style={styles.proBadge}>Pro</span>
          </div>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={vehicle.throttleStopEnabled ?? false}
              onChange={(e) => updateField('throttleStopEnabled', e.target.checked)}
            />
            Enable Throttle Stop
          </label>
          {vehicle.throttleStopEnabled && (
            <div style={{ ...styles.grid, marginTop: '12px' }}>
              <Field label="Delay (sec)" compact={compact}>
                <input
                  type="number"
                  step="0.1"
                  style={styles.input}
                  value={vehicle.throttleStopDelay ?? 0.5}
                  onChange={(e) => updateField('throttleStopDelay', parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Duration (sec)" compact={compact}>
                <input
                  type="number"
                  step="0.1"
                  style={styles.input}
                  value={vehicle.throttleStopDuration ?? 0.3}
                  onChange={(e) => updateField('throttleStopDuration', parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Throttle %" compact={compact}>
                <input
                  type="number"
                  step="5"
                  style={styles.input}
                  value={vehicle.throttleStopPct ?? 50}
                  onChange={(e) => updateField('throttleStopPct', parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Target ET" hint="For optimizer" compact={compact}>
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={vehicle.throttleStopTargetET ?? ''}
                  onChange={(e) => updateField('throttleStopTargetET', parseFloat(e.target.value))}
                  placeholder="9.90"
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {/* Worksheet Modals */}
      {showFrontalAreaWorksheet && (
        <FrontalAreaWorksheet
          isOpen={showFrontalAreaWorksheet}
          onClose={() => setShowFrontalAreaWorksheet(false)}
          onApply={(value) => {
            updateField('frontalAreaFt2', value);
            setShowFrontalAreaWorksheet(false);
          }}
        />
      )}
      {showTireWidthWorksheet && (
        <TireWidthWorksheet
          isOpen={showTireWidthWorksheet}
          onClose={() => setShowTireWidthWorksheet(false)}
          onApply={(value) => {
            updateField('tireWidthIn', value);
            setShowTireWidthWorksheet(false);
          }}
        />
      )}
      {showGearRatioWorksheet && (
        <GearRatioWorksheet
          isOpen={showGearRatioWorksheet}
          onClose={() => setShowGearRatioWorksheet(false)}
          onApply={(ratio) => {
            updateField('rearGear', ratio);
            setShowGearRatioWorksheet(false);
          }}
        />
      )}
      {showEnginePMIWorksheet && (
        <PMIWorksheet
          isOpen={showEnginePMIWorksheet}
          onClose={() => setShowEnginePMIWorksheet(false)}
          type="engine"
          onApply={(values) => {
            updateField('enginePMI', values.engine);
            setShowEnginePMIWorksheet(false);
          }}
        />
      )}
      {showTransPMIWorksheet && (
        <PMIWorksheet
          isOpen={showTransPMIWorksheet}
          onClose={() => setShowTransPMIWorksheet(false)}
          type="trans"
          onApply={(values) => {
            updateField('transPMI', values.trans);
            setShowTransPMIWorksheet(false);
          }}
        />
      )}
      {showTiresPMIWorksheet && (
        <PMIWorksheet
          isOpen={showTiresPMIWorksheet}
          onClose={() => setShowTiresPMIWorksheet(false)}
          type="tires"
          onApply={(values) => {
            updateField('tiresPMI', values.tires);
            setShowTiresPMIWorksheet(false);
          }}
        />
      )}
      
      {/* Drag Coefficient Help Dialog */}
      <DragCoefHelp 
        isOpen={showDragCoefHelp} 
        onClose={() => setShowDragCoefHelp(false)} 
      />
      
      {/* Recalculate HP/TQ Multiplier Confirmation Dialog */}
      {showRecalcConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowRecalcConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '12px',
              padding: 'var(--space-4)',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Recalculate HP Curve?</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              This will apply the current multiplier ({(vehicle.hpTorqueMultiplier ?? 1).toFixed(3)}) to all HP values in the dyno curve and reset the multiplier to 1.0.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              <strong>Note:</strong> This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn" 
                onClick={() => setShowRecalcConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const mult = vehicle.hpTorqueMultiplier ?? 1;
                  if (mult !== 1 && vehicle.hpCurve && vehicle.hpCurve.length > 0) {
                    const newCurve = vehicle.hpCurve.map(pt => ({
                      ...pt,
                      hp: Math.round(pt.hp * mult * 10) / 10,
                    }));
                    onChange({ ...vehicle, hpCurve: newCurve, hpTorqueMultiplier: 1.0 });
                  }
                  setShowRecalcConfirm(false);
                }}
              >
                Apply & Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
