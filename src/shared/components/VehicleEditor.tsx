/**
 * VehicleEditor - Unified vehicle editor with collapsible sections
 * 
 * Features:
 * - Collapsible sections that remember state
 * - Progressive disclosure: Jr fields always visible, Pro fields gated
 * - Component selectors for Engine, Clutch, Converter
 * - Field validation with superseding logic
 * - Responsive layout
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import type { RaceLength } from '../../domain/config/raceLengths';
import { useSubscription } from '../../domain/config/useSubscription';
import { isFieldSuperseded } from '../../domain/schemas/components.schema';
// Types imported for documentation - actual types inferred from storage functions
import { 
  loadSavedEngines, 
  loadSavedClutches,
  getSavedEngine,
  getSavedClutch,
  getSavedConverter,
} from '../../state/components';
import { 
  WorksheetButton, 
  FrontalAreaWorksheet, 
  TireWidthWorksheet, 
  GearRatioWorksheet,
} from './WorksheetModal';
import { TOOLTIPS } from '../../domain/config/tooltips';

// ============================================================================
// Types
// ============================================================================

type TransType = 'clutch' | 'converter';

interface VehicleEditorProps {
  vehicle: Partial<Vehicle>;
  onChange: (vehicle: Partial<Vehicle>) => void;
  compact?: boolean;
  showName?: boolean;
}

interface SectionState {
  [key: string]: boolean;
}

// ============================================================================
// Fuel Types (shared with Vehicles.tsx)
// ============================================================================

const FUEL_TYPES = [
  { value: 'Gasoline', label: 'Gasoline (Carbureted)', vb6Type: 1 },
  { value: 'Gasoline EFI', label: 'Gasoline (Fuel Injection)', vb6Type: 2 },
  { value: 'Methanol', label: 'Methanol (Carbureted)', vb6Type: 3 },
  { value: 'Methanol EFI', label: 'Methanol (Fuel Injection)', vb6Type: 4 },
  { value: 'Nitromethane', label: 'Nitromethane (Fuel Injection)', vb6Type: 5 },
  { value: 'Supercharged Gasoline', label: 'Supercharged Gasoline', vb6Type: 6 },
  { value: 'Supercharged Methanol', label: 'Supercharged Methanol', vb6Type: 7 },
  { value: 'Supercharged Nitro', label: 'Supercharged Nitro', vb6Type: 8 },
  { value: 'E85', label: 'E85 (Ethanol Blend)', vb6Type: 1 },
  { value: 'Diesel', label: 'Diesel', vb6Type: 1 },
] as const;

const BODY_STYLES = [
  { value: 1, label: 'Dragster with Wing' },
  { value: 2, label: 'Dragster' },
  { value: 3, label: 'Funny Car Body' },
  { value: 4, label: 'Altered/Roadster' },
  { value: 5, label: 'Fastback' },
  { value: 6, label: 'Sedan' },
  { value: 7, label: 'Station Wagon/Van' },
  { value: 8, label: 'Motorcycle' },
] as const;

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  section: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    userSelect: 'none' as const,
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid transparent',
  },
  sectionHeaderOpen: {
    borderBottom: '1px solid var(--color-border)',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text)',
  },
  sectionBadge: {
    fontSize: '0.65rem',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    fontWeight: 500,
  },
  proBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: '#8b5cf6',
  },
  chevron: {
    fontSize: '0.75rem',
    color: 'var(--color-muted)',
    transition: 'transform 0.2s',
  },
  sectionContent: {
    padding: '1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.75rem',
  },
  gridWide: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--color-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  required: {
    color: '#ef4444',
  },
  superseded: {
    textDecoration: 'line-through',
    opacity: 0.5,
  },
  input: {
    padding: '0.5rem 0.625rem',
    fontSize: '0.875rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    width: '100%',
  },
  select: {
    padding: '0.5rem 0.625rem',
    fontSize: '0.875rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    width: '100%',
  },
  hint: {
    fontSize: '0.7rem',
    color: 'var(--color-muted)',
    marginTop: '0.125rem',
  },
  proOverlay: {
    position: 'relative' as const,
  },
  proLock: {
    position: 'absolute' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    cursor: 'not-allowed',
  },
  componentSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: 'var(--color-background)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    marginBottom: '0.75rem',
  },
  radioGroup: {
    display: 'flex',
    gap: '1rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
};

// ============================================================================
// Section Component
// ============================================================================

interface SectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  isPro?: boolean;
  hasProAccess?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function Section({ title, isOpen, onToggle, isPro, hasProAccess, children, action }: SectionProps) {
  const locked = isPro && !hasProAccess;
  
  return (
    <div style={styles.section}>
      <div 
        style={{
          ...styles.sectionHeader,
          ...(isOpen ? styles.sectionHeaderOpen : {}),
        }}
        onClick={onToggle}
      >
        <div style={styles.sectionTitle}>
          <span style={{
            ...styles.chevron,
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>▶</span>
          {title}
          {isPro && (
            <span style={{ ...styles.sectionBadge, ...styles.proBadge }}>
              {locked ? '🔒 Pro' : 'Pro'}
            </span>
          )}
        </div>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
      {isOpen && (
        <div style={styles.sectionContent}>
          {locked ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-muted)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>
              <div style={{ fontSize: '0.875rem' }}>Upgrade to Pro to access {title.toLowerCase()} settings</div>
            </div>
          ) : children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Field Components
// ============================================================================

interface FieldProps {
  label: string;
  required?: boolean;
  superseded?: boolean;
  hint?: string;
  children: React.ReactNode;
  worksheetButton?: React.ReactNode;
}

function Field({ label, required, superseded, hint, children, worksheetButton }: FieldProps) {
  return (
    <div style={styles.field}>
      <label style={{
        ...styles.label,
        ...(superseded ? styles.superseded : {}),
      }}>
        {label}
        {required && !superseded && <span style={styles.required}>*</span>}
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

export default function VehicleEditor({
  vehicle,
  onChange,
  showName = true,
}: VehicleEditorProps) {
  // Note: compact prop reserved for future use
  const { features } = useSubscription();
  const isPro = features.quarterProFields;
  const hasThrottleStop = features.throttleStop;
  
  // Section collapse state - persisted to localStorage
  const [sections, setSections] = useState<SectionState>(() => {
    try {
      const saved = localStorage.getItem('vehicleEditorSections');
      return saved ? JSON.parse(saved) : {
        identity: true,
        vehicle: true,
        engine: true,
        transmission: true,
        drivetrain: true,
        tires: true,
        aero: false,
        pmi: false,
        throttleStop: false,
      };
    } catch {
      return {
        identity: true,
        vehicle: true,
        engine: true,
        transmission: true,
        drivetrain: true,
        tires: true,
        aero: false,
        pmi: false,
        throttleStop: false,
      };
    }
  });
  
  // Worksheet modal states
  const [showFrontalAreaWorksheet, setShowFrontalAreaWorksheet] = useState(false);
  const [showTireWidthWorksheet, setShowTireWidthWorksheet] = useState(false);
  const [showGearRatioWorksheet, setShowGearRatioWorksheet] = useState(false);
  
  // Load saved components
  const savedEngines = useMemo(() => loadSavedEngines(), []);
  const savedClutches = useMemo(() => loadSavedClutches(), []);
  
  // Get currently selected components
  const selectedEngine = useMemo(() => 
    vehicle.engineRef ? getSavedEngine(vehicle.engineRef) : undefined,
    [vehicle.engineRef]
  );
  const selectedClutch = useMemo(() => 
    vehicle.clutchRef ? getSavedClutch(vehicle.clutchRef) : undefined,
    [vehicle.clutchRef]
  );
  const selectedConverter = useMemo(() => 
    vehicle.converterRef ? getSavedConverter(vehicle.converterRef) : undefined,
    [vehicle.converterRef]
  );
  
  // Save section state to localStorage
  useEffect(() => {
    localStorage.setItem('vehicleEditorSections', JSON.stringify(sections));
  }, [sections]);
  
  const toggleSection = useCallback((id: string) => {
    setSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);
  
  // Helper to update a field
  const updateField = useCallback((field: keyof Vehicle, value: unknown) => {
    onChange({ ...vehicle, [field]: value });
  }, [vehicle, onChange]);
  
  // Helper to update gear array at index
  const updateGearAt = useCallback((field: 'gearRatios' | 'gearEfficiencies' | 'shiftRPMs', index: number, value: number) => {
    const arr = [...(vehicle[field] ?? [])];
    arr[index] = value;
    onChange({ ...vehicle, [field]: arr });
  }, [vehicle, onChange]);
  
  // Check if field is superseded
  const checkSuperseded = useCallback((field: string) => {
    return isFieldSuperseded(field, vehicle as Record<string, unknown>);
  }, [vehicle]);
  
  
  const transType: TransType = (vehicle.transmissionType as TransType) ?? 'clutch';
  const gearCount = vehicle.gearRatios?.length ?? 5;

  return (
    <div style={styles.container}>
      {/* ===== IDENTITY ===== */}
      {showName && (
        <Section
          title="Identity"
          isOpen={sections.identity}
          onToggle={() => toggleSection('identity')}
        >
          <div style={styles.grid}>
            <div style={{ gridColumn: 'span 2' }}>
              <Field label="Vehicle Name" required>
                <input
                  type="text"
                  style={styles.input}
                  value={vehicle.name ?? ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="My Race Car"
                />
              </Field>
            </div>
            <Field label="Race Length">
              <select
                style={styles.select}
                value={vehicle.defaultRaceLength ?? 'QUARTER'}
                onChange={(e) => updateField('defaultRaceLength', e.target.value as RaceLength)}
              >
                <option value="EIGHTH">1/8 Mile</option>
                <option value="QUARTER">1/4 Mile</option>
              </select>
            </Field>
            <Field label="Group">
              <input
                type="text"
                style={styles.input}
                value={vehicle.group ?? ''}
                onChange={(e) => updateField('group', e.target.value)}
                placeholder="Bracket, Test, etc."
              />
            </Field>
          </div>
        </Section>
      )}

      {/* ===== VEHICLE / WEIGHT ===== */}
      <Section
        title="Vehicle"
        isOpen={sections.vehicle}
        onToggle={() => toggleSection('vehicle')}
      >
        <div style={styles.grid}>
          <Field label="Weight" required hint="Total race weight (lb)">
            <input
              type="number"
              style={styles.input}
              value={vehicle.weightLb ?? ''}
              onChange={(e) => updateField('weightLb', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Wheelbase" hint="inches">
            <input
              type="number"
              style={styles.input}
              value={vehicle.wheelbaseIn ?? 108}
              onChange={(e) => updateField('wheelbaseIn', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Rollout" required hint={TOOLTIPS.rollout}>
            <input
              type="number"
              step="0.1"
              style={styles.input}
              value={vehicle.rolloutIn ?? 12}
              onChange={(e) => updateField('rolloutIn', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Body Style">
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
        </div>
        
        {/* Pro fields */}
        {isPro && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Advanced Geometry
            </div>
            <div style={styles.grid}>
              <Field label="Front Weight" hint="Static front weight (lb)">
                <input
                  type="number"
                  style={styles.input}
                  value={vehicle.staticFrontWeightLb ?? ''}
                  onChange={(e) => updateField('staticFrontWeightLb', parseFloat(e.target.value))}
                  placeholder="Auto: 38%"
                />
              </Field>
              <Field label="CG Height" hint="Center of gravity (in)">
                <input
                  type="number"
                  style={styles.input}
                  value={vehicle.cgHeightIn ?? ''}
                  onChange={(e) => updateField('cgHeightIn', parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Overhang" hint="Rear overhang (in)">
                <input
                  type="number"
                  style={styles.input}
                  value={vehicle.overhangIn ?? ''}
                  onChange={(e) => updateField('overhangIn', parseFloat(e.target.value))}
                />
              </Field>
            </div>
          </div>
        )}
      </Section>

      {/* ===== ENGINE ===== */}
      <Section
        title="Engine"
        isOpen={sections.engine}
        onToggle={() => toggleSection('engine')}
        action={
          selectedEngine ? (
            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ {selectedEngine.name}</span>
          ) : null
        }
      >
        {/* Component selector */}
        {savedEngines.length > 0 && (
          <div style={styles.componentSelector}>
            <div style={{ flex: 1 }}>
              <select
                style={{ ...styles.select, width: '100%' }}
                value={vehicle.engineRef ?? ''}
                onChange={(e) => {
                  const engineId = e.target.value || undefined;
                  updateField('engineRef', engineId);
                  // If selecting an engine, copy its data to vehicle
                  if (engineId) {
                    const engine = getSavedEngine(engineId);
                    if (engine) {
                      onChange({
                        ...vehicle,
                        engineRef: engineId,
                        powerHP: engine.peakHP,
                        rpmAtPeakHP: engine.rpmAtPeakHP,
                        hpCurve: engine.hpCurve,
                        displacementCID: engine.displacement,
                      });
                    }
                  }
                }}
              >
                <option value="">Manual Entry</option>
                {savedEngines.map(eng => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name} ({Math.round(eng.peakHP)} HP)
                  </option>
                ))}
              </select>
            </div>
            {selectedEngine && (
              <button
                style={{ ...styles.input, width: 'auto', padding: '0.375rem 0.5rem', cursor: 'pointer' }}
                onClick={() => updateField('engineRef', undefined)}
                title="Clear selection"
              >
                ✕
              </button>
            )}
          </div>
        )}
        
        {/* Show selected engine summary */}
        {selectedEngine && (
          <div style={{ 
            padding: '0.5rem', 
            backgroundColor: 'rgba(34, 197, 94, 0.1)', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '0.75rem',
            fontSize: '0.8rem',
          }}>
            <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{selectedEngine.name}</div>
            <div style={{ color: 'var(--color-muted)' }}>
              {Math.round(selectedEngine.peakHP)} HP @ {selectedEngine.rpmAtPeakHP} RPM
              {selectedEngine.hpCurve && ` • ${selectedEngine.hpCurve.length} point curve`}
            </div>
          </div>
        )}
        
        <div style={styles.grid}>
          <Field label="Fuel Type">
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
          <Field label="Displacement" hint="CID (shapes HP curve)">
            <input
              type="number"
              style={styles.input}
              value={vehicle.displacementCID ?? ''}
              onChange={(e) => updateField('displacementCID', parseFloat(e.target.value))}
              placeholder="350"
            />
          </Field>
          <Field 
            label="Peak HP" 
            required={!checkSuperseded('powerHP')}
            superseded={checkSuperseded('powerHP')}
          >
            <input
              type="number"
              style={styles.input}
              value={vehicle.powerHP ?? ''}
              onChange={(e) => updateField('powerHP', parseFloat(e.target.value))}
              disabled={checkSuperseded('powerHP')}
            />
          </Field>
          <Field 
            label="RPM @ Peak HP"
            required={!checkSuperseded('rpmAtPeakHP')}
            superseded={checkSuperseded('rpmAtPeakHP')}
          >
            <input
              type="number"
              step="100"
              style={styles.input}
              value={vehicle.rpmAtPeakHP ?? 6500}
              onChange={(e) => updateField('rpmAtPeakHP', parseFloat(e.target.value))}
              disabled={checkSuperseded('rpmAtPeakHP')}
            />
          </Field>
        </div>
        
        {/* N2O option */}
        <div style={{ marginTop: '0.75rem' }}>
          <label style={{ ...styles.radioLabel, fontSize: '0.8rem' }}>
            <input
              type="checkbox"
              checked={vehicle.n2oEnabled ?? false}
              onChange={(e) => updateField('n2oEnabled', e.target.checked)}
            />
            N2O / Nitrous Oxide
          </label>
        </div>
        
        {/* Pro: HP Curve editor placeholder */}
        {isPro && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              HP Curve (Pro)
            </div>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'var(--color-background)', 
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
              color: 'var(--color-muted)',
              fontSize: '0.8rem',
            }}>
              {vehicle.hpCurve && vehicle.hpCurve.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                    {vehicle.hpCurve.length} point HP curve loaded
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>
                    Peak: {Math.max(...vehicle.hpCurve.map(p => p.hp))} HP
                  </div>
                </div>
              ) : (
                <div>
                  No HP curve. Use Engine Sim to create one, or import from dyno.
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ===== TRANSMISSION ===== */}
      <Section
        title="Transmission"
        isOpen={sections.transmission}
        onToggle={() => toggleSection('transmission')}
        action={
          transType === 'clutch' && selectedClutch ? (
            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ {selectedClutch.name}</span>
          ) : transType === 'converter' && selectedConverter ? (
            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ {selectedConverter.name}</span>
          ) : null
        }
      >
        {/* Trans type selector */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="transType"
                value="clutch"
                checked={transType === 'clutch'}
                onChange={() => updateField('transmissionType', 'clutch')}
              />
              Clutch (Manual)
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="transType"
                value="converter"
                checked={transType === 'converter'}
                onChange={() => updateField('transmissionType', 'converter')}
              />
              Converter (Auto)
            </label>
          </div>
        </div>
        
        {transType === 'clutch' ? (
          <>
            {/* Clutch component selector */}
            {savedClutches.length > 0 && (
              <div style={{ ...styles.componentSelector, marginBottom: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <select
                    style={{ ...styles.select, width: '100%' }}
                    value={vehicle.clutchRef ?? ''}
                    onChange={(e) => {
                      const clutchId = e.target.value || undefined;
                      if (clutchId) {
                        const clutch = getSavedClutch(clutchId);
                        if (clutch) {
                          onChange({
                            ...vehicle,
                            clutchRef: clutchId,
                            clutchLaunchRPM: clutch.launchRPM,
                            clutchSlipRPM: clutch.slipRPM,
                            clutchSlippage: clutch.slippage,
                            clutchLockup: clutch.lockup,
                          });
                        }
                      } else {
                        updateField('clutchRef', undefined);
                      }
                    }}
                  >
                    <option value="">Manual Entry</option>
                    {savedClutches.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.launchRPM} RPM)
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClutch && (
                  <button
                    style={{ ...styles.input, width: 'auto', padding: '0.375rem 0.5rem', cursor: 'pointer' }}
                    onClick={() => updateField('clutchRef', undefined)}
                    title="Clear selection"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
            
            {/* Show selected clutch summary */}
            {selectedClutch && (
              <div style={{ 
                padding: '0.5rem', 
                backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                borderRadius: 'var(--radius-sm)',
                marginBottom: '0.75rem',
                fontSize: '0.8rem',
              }}>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{selectedClutch.name}</div>
                <div style={{ color: 'var(--color-muted)' }}>
                  Launch: {selectedClutch.launchRPM} RPM • Slip: {selectedClutch.slipRPM} RPM
                </div>
              </div>
            )}
            
            <div style={styles.grid}>
            <Field label="Launch RPM" required hint="Clutch drop RPM">
              <input
                type="number"
                step="100"
                style={styles.input}
                value={vehicle.clutchLaunchRPM ?? 5500}
                onChange={(e) => updateField('clutchLaunchRPM', parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Slip RPM" hint="RPM during slip">
              <input
                type="number"
                step="100"
                style={styles.input}
                value={vehicle.clutchSlipRPM ?? 6000}
                onChange={(e) => updateField('clutchSlipRPM', parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Slippage" hint="Slip factor (1.0-1.02)">
              <input
                type="number"
                step="0.001"
                style={styles.input}
                value={vehicle.clutchSlippage ?? 1.004}
                onChange={(e) => updateField('clutchSlippage', parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Lockup">
              <label style={styles.radioLabel}>
                <input
                  type="checkbox"
                  checked={vehicle.clutchLockup ?? false}
                  onChange={(e) => updateField('clutchLockup', e.target.checked)}
                />
                Clutch locks up
              </label>
            </Field>
            </div>
          </>
        ) : (
          <div style={styles.grid}>
            <Field label="Stall RPM" required hint="Converter stall speed">
              <input
                type="number"
                step="100"
                style={styles.input}
                value={vehicle.converterStallRPM ?? 3500}
                onChange={(e) => updateField('converterStallRPM', parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Torque Mult" required hint="Stall ratio (1.8-2.5)">
              <input
                type="number"
                step="0.1"
                style={styles.input}
                value={vehicle.converterTorqueMult ?? 2.0}
                onChange={(e) => updateField('converterTorqueMult', parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Slippage" hint="Slip factor">
              <input
                type="number"
                step="0.001"
                style={styles.input}
                value={vehicle.converterSlippage ?? 1.0}
                onChange={(e) => updateField('converterSlippage', parseFloat(e.target.value))}
              />
            </Field>
            <Field label="Lockup">
              <label style={styles.radioLabel}>
                <input
                  type="checkbox"
                  checked={vehicle.converterLockup ?? false}
                  onChange={(e) => updateField('converterLockup', e.target.checked)}
                />
                Converter locks up
              </label>
            </Field>
            {isPro && (
              <Field label="Diameter" hint="Converter diameter (in)">
                <input
                  type="number"
                  step="0.25"
                  style={styles.input}
                  value={vehicle.converterDiameterIn ?? ''}
                  onChange={(e) => updateField('converterDiameterIn', parseFloat(e.target.value))}
                />
              </Field>
            )}
          </div>
        )}
      </Section>

      {/* ===== DRIVETRAIN ===== */}
      <Section
        title="Drivetrain"
        isOpen={sections.drivetrain}
        onToggle={() => toggleSection('drivetrain')}
      >
        <div style={styles.grid}>
          <Field label="Rear Gear" required hint="Final drive ratio">
            <input
              type="number"
              step="0.01"
              style={styles.input}
              value={vehicle.rearGear ?? 3.73}
              onChange={(e) => updateField('rearGear', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="# of Gears">
            <select
              style={styles.select}
              value={gearCount}
              onChange={(e) => {
                const count = parseInt(e.target.value);
                const ratios = vehicle.gearRatios ?? [2.5, 1.8, 1.4, 1.1, 1.0];
                const effs = vehicle.gearEfficiencies ?? [0.97, 0.975, 0.98, 0.985, 0.99];
                const shifts = vehicle.shiftRPMs ?? [7000, 7000, 7000, 7000];
                
                // Resize arrays
                const newRatios = [...ratios];
                const newEffs = [...effs];
                const newShifts = [...shifts];
                
                while (newRatios.length < count) newRatios.push(1.0);
                while (newEffs.length < count) newEffs.push(0.99);
                while (newShifts.length < count - 1) newShifts.push(7000);
                
                newRatios.length = count;
                newEffs.length = count;
                newShifts.length = count - 1;
                
                onChange({
                  ...vehicle,
                  gearRatios: newRatios,
                  gearEfficiencies: newEffs,
                  shiftRPMs: newShifts,
                });
              }}
            >
              {[2, 3, 4, 5, 6, 7].map(n => (
                <option key={n} value={n}>{n} speed</option>
              ))}
            </select>
          </Field>
          {isPro && (
            <Field label="Trans Efficiency" hint="Overall efficiency">
              <input
                type="number"
                step="0.01"
                style={styles.input}
                value={vehicle.transEfficiency ?? 0.97}
                onChange={(e) => updateField('transEfficiency', parseFloat(e.target.value))}
              />
            </Field>
          )}
        </div>
        
        {/* Gear ratios */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Gear Ratios
            <WorksheetButton onClick={() => setShowGearRatioWorksheet(true)} tooltip={TOOLTIPS.btnGearRatio} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Array.from({ length: gearCount }).map((_, i) => (
              <div key={i} style={{ flex: '1 1 60px', minWidth: '60px', maxWidth: '80px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginBottom: '0.125rem' }}>
                  {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}
                </div>
                <input
                  type="number"
                  step="0.01"
                  style={{ ...styles.input, padding: '0.375rem' }}
                  value={vehicle.gearRatios?.[i] ?? ''}
                  onChange={(e) => updateGearAt('gearRatios', i, parseFloat(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Shift RPMs */}
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Shift RPMs
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Array.from({ length: gearCount - 1 }).map((_, i) => (
              <div key={i} style={{ flex: '1 1 60px', minWidth: '60px', maxWidth: '80px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginBottom: '0.125rem' }}>
                  {i + 1}→{i + 2}
                </div>
                <input
                  type="number"
                  step="100"
                  style={{ ...styles.input, padding: '0.375rem' }}
                  value={vehicle.shiftRPMs?.[i] ?? 7000}
                  onChange={(e) => updateGearAt('shiftRPMs', i, parseFloat(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
        
        {/* Pro: Per-gear efficiencies */}
        {isPro && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
              Per-Gear Efficiencies
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {Array.from({ length: gearCount }).map((_, i) => (
                <div key={i} style={{ flex: '1 1 60px', minWidth: '60px', maxWidth: '80px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginBottom: '0.125rem' }}>
                    Gear {i + 1}
                  </div>
                  <input
                    type="number"
                    step="0.005"
                    style={{ ...styles.input, padding: '0.375rem' }}
                    value={vehicle.gearEfficiencies?.[i] ?? 0.97}
                    onChange={(e) => updateGearAt('gearEfficiencies', i, parseFloat(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ===== TIRES ===== */}
      <Section
        title="Tires"
        isOpen={sections.tires}
        onToggle={() => toggleSection('tires')}
      >
        <div style={styles.grid}>
          <Field label="Tire Diameter" required hint="inches">
            <input
              type="number"
              step="0.5"
              style={styles.input}
              value={vehicle.tireDiaIn ?? 28}
              onChange={(e) => updateField('tireDiaIn', parseFloat(e.target.value))}
            />
          </Field>
          <Field 
            label="Tire Width" 
            hint="inches"
            worksheetButton={<WorksheetButton onClick={() => setShowTireWidthWorksheet(true)} tooltip={TOOLTIPS.btnTireWidth} />}
          >
            <input
              type="number"
              step="0.5"
              style={styles.input}
              value={vehicle.tireWidthIn ?? 14}
              onChange={(e) => updateField('tireWidthIn', parseFloat(e.target.value))}
            />
          </Field>
        </div>
      </Section>

      {/* ===== AERODYNAMICS (Pro) ===== */}
      <Section
        title="Aerodynamics"
        isOpen={sections.aero}
        onToggle={() => toggleSection('aero')}
        isPro
        hasProAccess={isPro}
      >
        <div style={styles.grid}>
          <Field 
            label="Frontal Area" 
            hint="ft²"
            worksheetButton={<WorksheetButton onClick={() => setShowFrontalAreaWorksheet(true)} tooltip={TOOLTIPS.btnFrontalArea} />}
          >
            <input
              type="number"
              step="0.5"
              style={styles.input}
              value={vehicle.frontalAreaFt2 ?? 22}
              onChange={(e) => updateField('frontalAreaFt2', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Drag Coeff (Cd)" hint="0.3-0.5 typical">
            <input
              type="number"
              step="0.01"
              style={styles.input}
              value={vehicle.cd ?? 0.35}
              onChange={(e) => updateField('cd', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Lift Coeff" hint="Positive = lift">
            <input
              type="number"
              step="0.01"
              style={styles.input}
              value={vehicle.liftCoeff ?? 0.1}
              onChange={(e) => updateField('liftCoeff', parseFloat(e.target.value))}
            />
          </Field>
        </div>
      </Section>

      {/* ===== PMI (Pro) ===== */}
      <Section
        title="Polar Moments of Inertia"
        isOpen={sections.pmi}
        onToggle={() => toggleSection('pmi')}
        isPro
        hasProAccess={isPro}
      >
        <div style={styles.grid}>
          <Field label="Engine PMI" hint="lb·ft²">
            <input
              type="number"
              step="0.01"
              style={styles.input}
              value={vehicle.enginePMI ?? ''}
              onChange={(e) => updateField('enginePMI', parseFloat(e.target.value))}
              placeholder="0.85"
            />
          </Field>
          <Field label="Trans PMI" hint="lb·ft²">
            <input
              type="number"
              step="0.01"
              style={styles.input}
              value={vehicle.transPMI ?? ''}
              onChange={(e) => updateField('transPMI', parseFloat(e.target.value))}
              placeholder="0.15"
            />
          </Field>
          <Field label="Tires PMI" hint="lb·ft²">
            <input
              type="number"
              step="0.1"
              style={styles.input}
              value={vehicle.tiresPMI ?? ''}
              onChange={(e) => updateField('tiresPMI', parseFloat(e.target.value))}
              placeholder="12"
            />
          </Field>
        </div>
      </Section>

      {/* ===== THROTTLE STOP (Pro) ===== */}
      {hasThrottleStop && (
        <Section
          title="Throttle Stop"
          isOpen={sections.throttleStop}
          onToggle={() => toggleSection('throttleStop')}
          isPro
          hasProAccess={isPro}
        >
          <div style={{ marginBottom: '1rem' }}>
            <label style={styles.radioLabel}>
              <input
                type="checkbox"
                checked={vehicle.throttleStopEnabled ?? false}
                onChange={(e) => updateField('throttleStopEnabled', e.target.checked)}
              />
              Enable Throttle Stop
            </label>
          </div>
          
          {vehicle.throttleStopEnabled && (
            <div style={styles.grid}>
              <Field label="Throttle %" hint="While on stop (0-100)">
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="100"
                  style={styles.input}
                  value={vehicle.throttleStopPct ?? 50}
                  onChange={(e) => updateField('throttleStopPct', parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Delay" hint="Seconds before activation">
                <input
                  type="number"
                  step="0.1"
                  style={styles.input}
                  value={vehicle.throttleStopDelay ?? 0}
                  onChange={(e) => updateField('throttleStopDelay', parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Duration" hint="Seconds active">
                <input
                  type="number"
                  step="0.1"
                  style={styles.input}
                  value={vehicle.throttleStopDuration ?? 1.0}
                  onChange={(e) => updateField('throttleStopDuration', parseFloat(e.target.value))}
                />
              </Field>
              <Field label="Target ET" hint="For optimizer">
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
        </Section>
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
    </div>
  );
}
