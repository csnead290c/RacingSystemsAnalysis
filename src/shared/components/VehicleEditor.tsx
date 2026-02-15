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
import { 
  loadSavedEngines, 
  loadSavedClutches,
  getSavedClutch,
  getSavedConverter,
} from '../../state/components';
import { listEngines, getEngine, type EngineListItem } from '../../state/engines';
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

// Body styles for QuarterJr Aero section
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
  // Matches original QUARTER Pro sections:
  // - Identity (RSA addition for vehicle name/group)
  // - General Data (weather/track conditions - usually on run, not vehicle)
  // - Vehicle Data (weight, wheelbase, rollout, overhang)
  // - Final Drive Data (gear ratio, efficiency, tire rollout, tire width)
  // - Engine Dyno Data (HP curve, fuel system, multiplier)
  // - Transmission Data (clutch/converter, gears)
  // - Aerodynamic Data (frontal area, Cd, Cl)
  // - PMI (polar moments of inertia)
  // - Throttle Stop (RSA Pro feature)
  const [sections, setSections] = useState<SectionState>(() => {
    try {
      const saved = localStorage.getItem('vehicleEditorSections');
      return saved ? JSON.parse(saved) : {
        identity: true,
        vehicleData: true,
        finalDrive: true,
        engineDyno: true,
        transmission: true,
        aero: false,
        pmi: false,
        throttleStop: false,
      };
    } catch {
      return {
        identity: true,
        vehicleData: true,
        finalDrive: true,
        engineDyno: true,
        transmission: true,
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
  
  // Load saved engines from DB (with localStorage fallback for immediate display)
  const [savedEngines, setSavedEngines] = useState<EngineListItem[]>(() =>
    loadSavedEngines().map(se => ({
      id: se.id, name: se.name, source: se.source ?? 'enginePro',
      currentRevision: 1, peakHP: se.peakHP, rpmAtPeakHP: se.rpmAtPeakHP,
      displacementCID: se.displacement ?? null,
      updatedAt: se.updatedAt ? new Date(se.updatedAt).toISOString() : new Date(se.createdAt).toISOString(),
    }))
  );
  const savedClutches = useMemo(() => loadSavedClutches(), []);

  useEffect(() => {
    // Fetch from DB on mount (replaces stale localStorage data)
    listEngines().then(setSavedEngines).catch(() => {/* keep localStorage fallback */});

    const reload = () => {
      listEngines().then(setSavedEngines).catch(() => {/* keep current */});
    };
    // Cross-tab localStorage changes
    window.addEventListener('storage', reload);
    // Same-tab custom event from EngineSimDashboard save
    window.addEventListener('rsa-engines-updated', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('rsa-engines-updated', reload);
    };
  }, []);
  
  // Get currently selected engine (find in already-loaded list)
  const selectedEngine = useMemo(() => 
    vehicle.engineRef ? savedEngines.find(e => e.id === vehicle.engineRef) : undefined,
    [vehicle.engineRef, savedEngines]
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

      {/* ===== VEHICLE DATA ===== */}
      {/* Jr: weight, rollout, wheelbase | Pro: adds overhang */}
      <Section
        title="Vehicle Data"
        isOpen={sections.vehicleData}
        onToggle={() => toggleSection('vehicleData')}
      >
        <div style={styles.grid}>
          <Field label="Weight - lbs" required>
            <input
              type="number"
              style={styles.input}
              value={vehicle.weightLb ?? ''}
              onChange={(e) => updateField('weightLb', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Rollout - inches" required hint={TOOLTIPS.rollout}>
            <input
              type="number"
              step="0.1"
              style={styles.input}
              value={vehicle.rolloutIn ?? 12}
              onChange={(e) => updateField('rolloutIn', parseFloat(e.target.value))}
            />
          </Field>
          <Field label="Wheelbase - inches">
            <input
              type="number"
              style={styles.input}
              value={vehicle.wheelbaseIn ?? 108}
              onChange={(e) => updateField('wheelbaseIn', parseFloat(e.target.value))}
            />
          </Field>
          {/* Pro only: Overhang */}
          {isPro && (
            <Field label="Overhang - inches">
              <input
                type="number"
                style={styles.input}
                value={vehicle.overhangIn ?? 40}
                onChange={(e) => updateField('overhangIn', parseFloat(e.target.value))}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* ===== FINAL DRIVE DATA ===== */}
      {/* Jr: gear ratio, tire diameter, tire width | Pro: adds efficiency, tire rollout mode */}
      <Section
        title="Final Drive Data"
        isOpen={sections.finalDrive}
        onToggle={() => toggleSection('finalDrive')}
      >
        <div style={styles.grid}>
          <Field label="Gear Ratio" required>
            <input
              type="number"
              step="0.01"
              style={styles.input}
              value={vehicle.rearGear ?? 4.10}
              onChange={(e) => updateField('rearGear', parseFloat(e.target.value))}
            />
          </Field>
          {/* Pro only: Efficiency */}
          {isPro && (
            <Field label="Efficiency">
              <input
                type="number"
                step="0.005"
                style={styles.input}
                value={vehicle.finalDriveEfficiency ?? 0.975}
                onChange={(e) => updateField('finalDriveEfficiency', parseFloat(e.target.value))}
              />
            </Field>
          )}
          {/* Jr: Tire Diameter | Pro: Tire Rollout with mode selector */}
          {isPro ? (
            <Field label="Tire Rollout - inches" required hint="Circumference or diameter">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.1"
                  style={{ ...styles.input, flex: 1 }}
                  value={vehicle.tireRolloutIn ?? 102.5}
                  onChange={(e) => updateField('tireRolloutIn', parseFloat(e.target.value))}
                />
                <select
                  style={{ ...styles.select, width: 'auto', padding: '0.375rem' }}
                  value={vehicle.tireRolloutMode ?? 'circumference'}
                  onChange={(e) => updateField('tireRolloutMode', e.target.value)}
                >
                  <option value="circumference">Circ</option>
                  <option value="diameter">Dia</option>
                </select>
              </div>
            </Field>
          ) : (
            <Field label="Tire Diameter - inches" required>
              <input
                type="number"
                step="0.5"
                style={styles.input}
                value={vehicle.tireDiaIn ?? 28}
                onChange={(e) => updateField('tireDiaIn', parseFloat(e.target.value))}
              />
            </Field>
          )}
          <Field 
            label="Tire Width - inches"
            worksheetButton={<WorksheetButton onClick={() => setShowTireWidthWorksheet(true)} tooltip={TOOLTIPS.btnTireWidth} />}
          >
            <input
              type="number"
              step="0.5"
              style={styles.input}
              value={vehicle.tireWidthIn ?? 17}
              onChange={(e) => updateField('tireWidthIn', parseFloat(e.target.value))}
            />
          </Field>
        </div>
      </Section>

      {/* ===== ENGINE DATA ===== */}
      {/* Jr: Fuel System, displacement, rpm at peak hp, peak hp, shift rpm (global), N2O */}
      {/* Pro: adds component selector, HP curve, HP/Torque multiplier */}
      <Section
        title={isPro ? "Engine Dyno Data" : "Engine"}
        isOpen={sections.engineDyno}
        onToggle={() => toggleSection('engineDyno')}
        action={
          isPro && selectedEngine ? (
            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ {selectedEngine.name}</span>
          ) : null
        }
      >
        {/* Pro only: Component selector — always shown for Pro users */}
        {isPro && (
          <div style={styles.componentSelector}>
            <div style={{ flex: 1 }}>
              {savedEngines.length > 0 ? (
                <select
                  style={{ ...styles.select, width: '100%' }}
                  value={vehicle.engineRef ?? ''}
                  onChange={(e) => {
                    const engineId = e.target.value || undefined;
                    updateField('engineRef', engineId);
                    if (engineId) {
                      // Fetch full engine detail from DB (async) to get hpCurve etc.
                      getEngine(engineId).then(detail => {
                        if (detail) {
                          onChange({
                            ...vehicle,
                            engineRef: engineId,
                            powerHP: detail.peakHP,
                            rpmAtPeakHP: detail.rpmAtPeakHP,
                            hpCurve: detail.hpCurve ?? undefined,
                            displacementCID: detail.displacementCID ?? undefined,
                          });
                        }
                      });
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
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  No saved engines — save one in Engine Sim first
                </span>
              )}
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
        
        {/* Pro only: Show selected engine summary */}
        {isPro && selectedEngine && (
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
              {selectedEngine.displacementCID && ` • ${Math.round(selectedEngine.displacementCID)} CID`}
              {selectedEngine.currentRevision > 1 && ` • rev ${selectedEngine.currentRevision}`}
            </div>
          </div>
        )}
        
        <div style={styles.grid}>
          <Field label="Fuel System">
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
          <Field label="Displacement - CID">
            <input
              type="number"
              style={styles.input}
              value={vehicle.displacementCID ?? ''}
              onChange={(e) => updateField('displacementCID', parseFloat(e.target.value))}
              placeholder="350"
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
          {/* Jr: Global Shift RPM (single value for all gears) */}
          {!isPro && (
            <Field label="Shift RPM" hint="All gears shift at this RPM">
              <input
                type="number"
                step="100"
                style={styles.input}
                value={vehicle.shiftRPMs?.[0] ?? 6500}
                onChange={(e) => {
                  const rpm = parseFloat(e.target.value);
                  // Set all shift RPMs to same value for Jr
                  const count = vehicle.gearRatios?.length ?? 5;
                  const shifts = Array(count).fill(rpm);
                  onChange({ ...vehicle, shiftRPMs: shifts });
                }}
              />
            </Field>
          )}
        </div>
        
        {/* N2O option (both Jr and Pro) */}
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
        
        {/* Pro only: HP/Torque Multiplier */}
        {isPro && (
          <div style={{ marginTop: '0.75rem' }}>
            <Field label="HP/Torque Multiplier" hint="Correction factor (default 1.0)">
              <input
                type="number"
                step="0.01"
                style={styles.input}
                value={vehicle.hpTorqueMultiplier ?? 1.0}
                onChange={(e) => updateField('hpTorqueMultiplier', parseFloat(e.target.value))}
              />
            </Field>
          </div>
        )}
        
        {/* Pro only: HP Curve editor */}
        {isPro && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--color-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              HP Curve
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
      {/* Jr: converter/clutch toggle, clutch (slip rpm, lockup), converter (stall rpm, lockup, diameter), gear ratios only */}
      {/* Pro: adds component selectors, launch RPM, slippage, per-gear efficiencies, per-gear shift RPMs */}
      <Section
        title={isPro ? "Transmission Data" : "Transmission"}
        isOpen={sections.transmission}
        onToggle={() => toggleSection('transmission')}
        action={
          isPro && transType === 'clutch' && selectedClutch ? (
            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ {selectedClutch.name}</span>
          ) : isPro && transType === 'converter' && selectedConverter ? (
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
            {/* Pro only: Clutch component selector */}
            {isPro && savedClutches.length > 0 && (
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
            
            {/* Pro only: Show selected clutch summary */}
            {isPro && selectedClutch && (
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
              {/* Jr: Slip RPM only | Pro: Launch RPM, Slip RPM, Slippage */}
              {isPro && (
                <Field label="Launch RPM" required hint="Clutch drop RPM">
                  <input
                    type="number"
                    step="100"
                    style={styles.input}
                    value={vehicle.clutchLaunchRPM ?? 5500}
                    onChange={(e) => updateField('clutchLaunchRPM', parseFloat(e.target.value))}
                  />
                </Field>
              )}
              <Field label="Slip RPM" hint="RPM during slip">
                <input
                  type="number"
                  step="100"
                  style={styles.input}
                  value={vehicle.clutchSlipRPM ?? 6000}
                  onChange={(e) => updateField('clutchSlipRPM', parseFloat(e.target.value))}
                />
              </Field>
              {isPro && (
                <Field label="Slippage" hint="Slip factor (1.0-1.02)">
                  <input
                    type="number"
                    step="0.001"
                    style={styles.input}
                    value={vehicle.clutchSlippage ?? 1.004}
                    onChange={(e) => updateField('clutchSlippage', parseFloat(e.target.value))}
                  />
                </Field>
              )}
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
            <Field label="Launch RPM" hint="RPM at launch (defaults to Stall RPM)">
              <input
                type="number"
                step="100"
                style={styles.input}
                value={vehicle.converterLaunchRPM ?? vehicle.converterStallRPM ?? 3500}
                onChange={(e) => updateField('converterLaunchRPM', parseFloat(e.target.value))}
              />
            </Field>
            {/* Pro only: Torque Mult, Slippage */}
            {isPro && (
              <>
                <Field label="Torque Mult" hint="Stall ratio (1.8-2.5)">
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
              </>
            )}
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
            {/* Jr and Pro: Converter Diameter */}
            <Field label="Diameter - inches" hint="Converter diameter">
              <input
                type="number"
                step="0.25"
                style={styles.input}
                value={vehicle.converterDiameterIn ?? ''}
                onChange={(e) => updateField('converterDiameterIn', parseFloat(e.target.value))}
              />
            </Field>
          </div>
        )}
        
        {/* Gear Ratios */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>
              {isPro ? 'Gear Table' : 'Gear Ratios'}
            </div>
            <select
              style={{ ...styles.select, width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              value={gearCount}
              onChange={(e) => {
                const count = parseInt(e.target.value);
                const ratios = vehicle.gearRatios ?? [2.6, 1.9, 1.5, 1.2, 1.0];
                const effs = vehicle.gearEfficiencies ?? [0.990, 0.991, 0.992, 0.993, 0.994];
                const shifts = vehicle.shiftRPMs ?? [9400, 9400, 9400, 9400];
                
                const newRatios = [...ratios];
                const newEffs = [...effs];
                const newShifts = [...shifts];
                
                while (newRatios.length < count) newRatios.push(1.0);
                while (newEffs.length < count) newEffs.push(0.994);
                while (newShifts.length < count) newShifts.push(9400);
                
                newRatios.length = count;
                newEffs.length = count;
                newShifts.length = count;
                
                onChange({
                  ...vehicle,
                  gearRatios: newRatios,
                  gearEfficiencies: newEffs,
                  shiftRPMs: newShifts,
                });
              }}
            >
              {[2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n} gears</option>
              ))}
            </select>
          </div>
          
          {/* Pro: Full gear table with Ratio/Efficiency/Shift@ */}
          {isPro ? (
            <>
              {/* Table header */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '50px 1fr 1fr 1fr', 
                gap: '0.25rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--color-muted)',
                marginBottom: '0.25rem',
                paddingBottom: '0.25rem',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <div>Gear</div>
                <div>Ratio</div>
                <div>Efficiency</div>
                <div>Shift@</div>
              </div>
              
              {/* Table rows */}
              {Array.from({ length: gearCount }).map((_, i) => (
                <div 
                  key={i} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '50px 1fr 1fr 1fr', 
                    gap: '0.25rem',
                    marginBottom: '0.25rem',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} -
                  </div>
                  <input
                    type="number"
                    step="0.001"
                    style={{ ...styles.input, padding: '0.25rem 0.375rem', fontSize: '0.8rem' }}
                    value={vehicle.gearRatios?.[i] ?? ''}
                    onChange={(e) => updateGearAt('gearRatios', i, parseFloat(e.target.value))}
                  />
                  <input
                    type="number"
                    step="0.001"
                    style={{ ...styles.input, padding: '0.25rem 0.375rem', fontSize: '0.8rem' }}
                    value={vehicle.gearEfficiencies?.[i] ?? 0.990}
                    onChange={(e) => updateGearAt('gearEfficiencies', i, parseFloat(e.target.value))}
                  />
                  <input
                    type="number"
                    step="100"
                    style={{ ...styles.input, padding: '0.25rem 0.375rem', fontSize: '0.8rem' }}
                    value={vehicle.shiftRPMs?.[i] ?? 9400}
                    onChange={(e) => updateGearAt('shiftRPMs', i, parseFloat(e.target.value))}
                  />
                </div>
              ))}
            </>
          ) : (
            /* Jr: Just gear ratios in a simple row */
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
          )}
        </div>
      </Section>


      {/* ===== AERODYNAMICS ===== */}
      {/* Jr: body style, frontal area | Pro: adds Cd, lift coeff */}
      <Section
        title={isPro ? "Aerodynamic Data" : "Aero"}
        isOpen={sections.aero}
        onToggle={() => toggleSection('aero')}
      >
        <div style={styles.grid}>
          {/* Jr: Body Style */}
          {!isPro && (
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
          )}
          <Field 
            label="Frontal Area - sq ft"
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
          {/* Pro only: Cd and Lift Coeff */}
          {isPro && (
            <>
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
            </>
          )}
        </div>
      </Section>

      {/* ===== PMI (Pro) - matches QUARTER Pro ===== */}
      <Section
        title="Polar Moments of Inertia (in-lbs sec*sec)"
        isOpen={sections.pmi}
        onToggle={() => toggleSection('pmi')}
        isPro
        hasProAccess={isPro}
      >
        <div style={styles.grid}>
          <Field label="Engine + Flywheel + Clutch">
            <input
              type="number"
              step="0.01"
              style={styles.input}
              value={vehicle.enginePMI ?? ''}
              onChange={(e) => updateField('enginePMI', parseFloat(e.target.value))}
              placeholder="3.42"
            />
          </Field>
          <Field label="Transmission + Driveshaft">
            <input
              type="number"
              step="0.001"
              style={styles.input}
              value={vehicle.transPMI ?? ''}
              onChange={(e) => updateField('transPMI', parseFloat(e.target.value))}
              placeholder=".247"
            />
          </Field>
          <Field label="Tires + Wheels + Ring Gear">
            <input
              type="number"
              step="0.1"
              style={styles.input}
              value={vehicle.tiresPMI ?? ''}
              onChange={(e) => updateField('tiresPMI', parseFloat(e.target.value))}
              placeholder="50.8"
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
