import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import { loadVehicles, saveVehicle, deleteVehicle, type VehicleLite } from '../state/vehicles';
import { VehicleSchema, type Vehicle } from '../domain/schemas/vehicle.schema';
import type { RaceLength } from '../domain/config/raceLengths';
import { useAuth } from '../domain/auth';
import { usePreferences } from '../shared/state/preferences';
import { 
  WorksheetButton, 
  FrontalAreaWorksheet, 
  TireWidthWorksheet, 
  GearRatioWorksheet,
  RolloutWorksheet,
  TireRolloutWorksheet,
} from '../shared/components/WorksheetModal';
import { TOOLTIPS } from '../domain/config/tooltips';

type TransType = 'clutch' | 'converter';

// Unified fuel type options - used for both QuarterJr and QuarterPro
// Maps to VB6 fuel system types: 1=Gas+Carb, 2=Gas+Inject, 3=Methanol+Carb, 4=Methanol+Inject,
// 5=Nitro+Inject, 6=Supercharged Gas, 7=Supercharged Methanol, 8=Supercharged Nitro, 9=Electric
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

// Calculate torque from HP: TQ = HP × 5252 / RPM
const hpToTorque = (hp: number, rpm: number): number => {
  if (rpm <= 0) return 0;
  return (hp * 5252) / rpm;
};

// Default form values
const defaultForm: Partial<Vehicle> = {
  id: '',
  name: '',
  defaultRaceLength: 'QUARTER',
  transmissionType: 'clutch',
  // Mass & Geometry
  weightLb: 3000,
  staticFrontWeightLb: undefined,
  wheelbaseIn: 108,
  overhangIn: 40,
  cgHeightIn: undefined,
  rolloutIn: 12,
  bodyStyle: 1,
  // Tires
  tireDiaIn: 28,
  tireWidthIn: 14,
  // Aero
  frontalAreaFt2: 22,
  cd: 0.35,
  liftCoeff: 0.1,
  // Drivetrain
  rearGear: 3.73,
  transEfficiency: 0.97,
  gearRatios: [2.5, 1.8, 1.4, 1.1, 1.0],
  gearEfficiencies: [0.97, 0.975, 0.98, 0.985, 0.99],
  shiftRPMs: [7000, 7000, 7000, 7000],
  // Shift by Time (alternative to shift by RPM)
  shiftMode: 'rpm',
  shiftTimes: [],
  // Rev Limiter
  revLimiterRPM: undefined,
  // Clutch
  clutchLaunchRPM: 5500,
  clutchSlipRPM: 6000,
  clutchSlippage: 1.004,
  clutchLockup: false,
  // Converter
  converterStallRPM: undefined,
  converterTorqueMult: undefined,
  converterSlippage: undefined,
  converterDiameterIn: undefined,
  converterLockup: undefined,
  // PMI
  enginePMI: 3.5,
  transPMI: 0.25,
  tiresPMI: 50,
  // Engine - QuarterJr mode
  powerHP: 400,
  rpmAtPeakHP: 6500,
  displacementCID: 350,
  // Engine - QuarterPro mode
  hpCurve: undefined,
  hpTorqueMultiplier: 1.0,
  // Fuel
  fuelType: 'Gasoline',
  fuelSystem: 'Gas+Carb',
  // N2O option
  n2oEnabled: false,
  // Throttle Stop
  throttleStopEnabled: false,
  throttleStopPct: 50,
  throttleStopDelay: 0.5,
  throttleStopDuration: 0.3,
  throttleStopTargetET: undefined,
  // Organization
  group: '',
  notes: '',
};

function Vehicles() {
  const { hasFeature, user } = useAuth();
  const { productMode } = usePreferences();
  
  // Pro features require hp_curve_editor or advanced_settings feature
  const hasProAccess = hasFeature('hp_curve_editor') || hasFeature('advanced_settings');
  // Use Pro mode only if user has access AND hasn't chosen Jr mode
  const isPro = hasProAccess && productMode === 'pro';
  // Check if user can create public vehicles
  const canMakePublic = user?.roleId === 'owner' || user?.roleId === 'admin';
  
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [filterGroup, setFilterGroup] = useState<string>(''); // Group filter
  
  // Get unique groups from vehicles
  const vehicleGroups = [...new Set(vehicles.map(v => v.group).filter(Boolean))] as string[];
  
  // Filter vehicles by group
  const filteredVehicles = filterGroup 
    ? vehicles.filter(v => v.group === filterGroup)
    : vehicles;
  
  // Form state - single object
  const [form, setForm] = useState<Partial<Vehicle>>({ ...defaultForm });
  const [isPublic, setIsPublic] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hpMultiplier, setHpMultiplier] = useState(1.0);
  
  // Worksheet modal states
  const [showFrontalAreaWorksheet, setShowFrontalAreaWorksheet] = useState(false);
  const [showTireWidthWorksheet, setShowTireWidthWorksheet] = useState(false);
  const [showGearRatioWorksheet, setShowGearRatioWorksheet] = useState(false);
  const [showRolloutWorksheet, setShowRolloutWorksheet] = useState(false);
  const [showTireRolloutWorksheet, setShowTireRolloutWorksheet] = useState(false);
  
  // Derive transType from form
  const transType: TransType = (form.transmissionType as TransType) ?? 'clutch';
  const setTransType = (type: TransType) => updateForm('transmissionType', type);
  
  // Helper to update form fields
  const updateForm = (field: keyof Vehicle, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  
  // Helper to update gear array at index
  const updateGearAt = (field: 'gearRatios' | 'gearEfficiencies' | 'shiftRPMs', index: number, value: number) => {
    setForm(prev => {
      const arr = [...(prev[field] ?? [])];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };
  
  // Helper to add gear
  const addGear = () => {
    setForm(prev => ({
      ...prev,
      gearRatios: [...(prev.gearRatios ?? []), 1.0],
      gearEfficiencies: [...(prev.gearEfficiencies ?? []), 0.98],
      shiftRPMs: [...(prev.shiftRPMs ?? []), 7000],
    }));
  };
  
  // Helper to remove gear
  const removeGear = (index: number) => {
    setForm(prev => ({
      ...prev,
      gearRatios: (prev.gearRatios ?? []).filter((_, i) => i !== index),
      gearEfficiencies: (prev.gearEfficiencies ?? []).filter((_, i) => i !== index),
      shiftRPMs: (prev.shiftRPMs ?? []).filter((_, i) => i !== index),
    }));
  };
  
  // Helper to update HP curve point
  const updateHPCurveAt = (index: number, field: 'rpm' | 'hp', value: number) => {
    setForm(prev => {
      const curve = [...(prev.hpCurve ?? [])];
      curve[index] = { ...curve[index], [field]: value };
      return { ...prev, hpCurve: curve };
    });
  };
  
  // Helper to add HP curve point
  const addHPPoint = () => {
    setForm(prev => {
      const curve = prev.hpCurve ?? [];
      const lastRPM = curve.length > 0 ? curve[curve.length - 1].rpm + 500 : 5000;
      const lastHP = curve.length > 0 ? curve[curve.length - 1].hp : 300;
      return { ...prev, hpCurve: [...curve, { rpm: lastRPM, hp: lastHP }] };
    });
  };
  
  // Helper to remove HP curve point
  const removeHPPoint = (index: number) => {
    setForm(prev => ({
      ...prev,
      hpCurve: (prev.hpCurve ?? []).filter((_, i) => i !== index),
    }));
  };
  
  // Sorted HP curve for graph
  const sortedHPCurve = useMemo(() => {
    return [...(form.hpCurve ?? [])].sort((a, b) => a.rpm - b.rpm);
  }, [form.hpCurve]);
  
  // Apply HP multiplier to all HP values and reset multiplier
  const applyHPMultiplier = () => {
    if (hpMultiplier === 1.0) return;
    
    setForm(prev => {
      const newPowerHP = prev.powerHP ? Math.round(prev.powerHP * hpMultiplier) : prev.powerHP;
      const newHPCurve = prev.hpCurve?.map(p => ({
        rpm: p.rpm,
        hp: Math.round(p.hp * hpMultiplier),
      }));
      return { ...prev, powerHP: newPowerHP, hpCurve: newHPCurve };
    });
    setHpMultiplier(1.0);
  };

  const loadData = async () => {
    // Debug logging removed
    setLoading(true);
    try {
      const data = await loadVehicles();
            setVehicles(data);
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({ ...defaultForm, id: crypto.randomUUID() });
    setIsPublic(false);
    setFormError(null);
    setEditingId(null);
    setActiveTab('basic');
  };

  const handleNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (vehicle: VehicleLite) => {
    setForm({ ...defaultForm, ...vehicle });
    setIsPublic(vehicle.is_public || false);
    setEditingId(vehicle.id);
    setActiveTab('basic');
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSave = async () => {
    setFormError(null);
    setSaving(true);

    try {
      // Build vehicle object with trimmed name and public flag
      const vehicle = {
        ...form,
        name: form.name?.trim() || '',
        is_public: canMakePublic ? isPublic : false,
      };

      // Validate with zod
      const result = VehicleSchema.safeParse(vehicle);
      if (!result.success) {
        const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        setFormError(`Validation failed: ${errors}`);
        setSaving(false);
        return;
      }

      // Save
            await saveVehicle(result.data);
            // Small delay to ensure database commit before reload
      await new Promise(resolve => setTimeout(resolve, 500));
            await loadData();
            setShowForm(false);
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await deleteVehicle(id);
      await loadData();
    } catch (error) {
      alert('Failed to delete vehicle');
    }
  };

  const handleDuplicate = async (vehicle: Vehicle) => {
    try {
      const duplicated: Vehicle = {
        ...vehicle,
        id: crypto.randomUUID(),
        name: `${vehicle.name} (Copy)`,
      };
      await saveVehicle(duplicated);
      await loadData();
    } catch (error) {
      alert('Failed to duplicate vehicle');
    }
  };

  return (
    <Page
      title="Vehicle Manager"
      actions={
        !showForm && (
          <button onClick={handleNew} className="btn">
            + New Vehicle
          </button>
        )
      }
    >
      {showForm && (
        <div className="card mb-6">
          <h2 className="mb-4" style={{ fontSize: '1.25rem', color: 'var(--color-text)' }}>
            {editingId ? 'Edit Vehicle' : 'New Vehicle'}
          </h2>

          {formError && (
            <div className="error mb-4">
              <p style={{ margin: 0 }}>{formError}</p>
            </div>
          )}

          {/* Tab Navigation - Different tabs for QuarterJr vs QuarterPro */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {(isPro 
              ? ['basic', 'geometry', 'aero', 'drivetrain', 'pmi', 'engine', 'throttle']
              : ['basic', 'vehicle', 'engine', 'transmission', 'finaldrive']
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--color-border)',
                  background: activeTab === tab ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: activeTab === tab ? 'white' : 'var(--color-text)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'finaldrive' ? 'Final Drive' : tab === 'throttle' ? 'Throttle Stop' : tab}
              </button>
            ))}
          </div>

          {/* Basic Tab - Just identity info */}
          {activeTab === 'basic' && (
            <>
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label" htmlFor="name">Vehicle Name *</label>
                  <input id="name" type="text" className="input" value={form.name ?? ''} onChange={(e) => updateForm('name', e.target.value)} placeholder="My Mustang" />
                </div>
                <div>
                  <label className="label">Group / Category</label>
                  <input type="text" className="input" value={form.group ?? ''} onChange={(e) => updateForm('group', e.target.value)} placeholder="e.g., Bracket, Super Comp, Test" list="vehicle-groups" />
                  <datalist id="vehicle-groups">
                    {[...new Set(vehicles.map(v => v.group).filter(Boolean))].map(g => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Default Race Length *</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input type="radio" name="defaultRaceLength" value="EIGHTH" checked={form.defaultRaceLength === 'EIGHTH'} onChange={(e) => updateForm('defaultRaceLength', e.target.value as RaceLength)} />
                      <span>1/8 Mile</span>
                    </label>
                    <label className="radio-label">
                      <input type="radio" name="defaultRaceLength" value="QUARTER" checked={form.defaultRaceLength === 'QUARTER'} onChange={(e) => updateForm('defaultRaceLength', e.target.value as RaceLength)} />
                      <span>1/4 Mile</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea className="input" rows={2} value={form.notes ?? ''} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Optional notes about this vehicle..." style={{ resize: 'vertical' }} />
                </div>
              </div>
            </>
          )}

          {/* ============================================== */}
          {/* QUARTER JR TABS (simplified VB6-style inputs) */}
          {/* ============================================== */}

          {/* QuarterJr Vehicle Tab - Weight, Rollout, Wheelbase, Body Style, Frontal Area */}
          {activeTab === 'vehicle' && !isPro && (
            <div className="mb-4">
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Weight (lb) *</label>
                  <input type="number" step="1" className="input" value={form.weightLb ?? ''} onChange={(e) => updateForm('weightLb', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">
                    Staging Rollout (in) *
                    <WorksheetButton onClick={() => setShowRolloutWorksheet(true)} tooltip={TOOLTIPS.btnRollout} />
                  </label>
                  <input type="number" step="0.1" className="input" value={form.rolloutIn ?? ''} onChange={(e) => updateForm('rolloutIn', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>{TOOLTIPS.rollout}</small>
                </div>
              </div>
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Wheelbase (in)</label>
                  <input type="number" step="0.1" className="input" value={form.wheelbaseIn ?? 108} onChange={(e) => updateForm('wheelbaseIn', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">Body Style</label>
                  <select className="input" value={form.bodyStyle ?? 6} onChange={(e) => updateForm('bodyStyle', parseInt(e.target.value))}>
                    <option value={1}>Dragster with Wing</option>
                    <option value={2}>Dragster</option>
                    <option value={3}>Funny Car Body</option>
                    <option value={4}>Altered/Roadster</option>
                    <option value={5}>Fastback</option>
                    <option value={6}>Sedan</option>
                    <option value={7}>Station Wagon/Van</option>
                    <option value={8}>Motorcycle</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-2 gap-4">
                <div>
                  <label className="label">
                    Frontal Area (ft²)
                    <WorksheetButton onClick={() => setShowFrontalAreaWorksheet(true)} tooltip={TOOLTIPS.btnFrontalArea} />
                  </label>
                  <input type="number" step="0.1" className="input" value={form.frontalAreaFt2 ?? 22} onChange={(e) => updateForm('frontalAreaFt2', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>{TOOLTIPS.frontalArea}</small>
                </div>
              </div>
            </div>
          )}

          {/* QuarterJr Engine Tab - Fuel System, Displacement, RPM@Peak HP, Peak HP, Shift RPM, N2O */}
          {activeTab === 'engine' && !isPro && (
            <div className="mb-4">
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Fuel Type *</label>
                  <select className="input" value={form.fuelType ?? 'Gasoline'} onChange={(e) => updateForm('fuelType', e.target.value)}>
                    {FUEL_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Displacement (CID)</label>
                  <input type="number" step="1" className="input" value={form.displacementCID ?? 350} onChange={(e) => updateForm('displacementCID', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>Used to shape HP curve</small>
                </div>
              </div>
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Peak HP *</label>
                  <input type="number" step="1" className="input" value={form.powerHP ?? ''} onChange={(e) => updateForm('powerHP', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">RPM @ Peak HP *</label>
                  <input type="number" step="100" className="input" value={form.rpmAtPeakHP ?? 6500} onChange={(e) => updateForm('rpmAtPeakHP', parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Shift RPM</label>
                  <input type="number" step="100" className="input" value={form.shiftRPMs?.[0] ?? 6500} onChange={(e) => {
                    const rpm = parseFloat(e.target.value);
                    // Set all shift RPMs to the same value for QuarterJr
                    const numGears = form.gearRatios?.length ?? 4;
                    updateForm('shiftRPMs', Array(numGears).fill(rpm));
                  }} />
                  <small style={{ color: 'var(--color-muted)' }}>RPM to shift at (all gears)</small>
                </div>
                <div>
                  <label className="label">Rev Limiter RPM</label>
                  <input type="number" step="100" className="input" value={form.revLimiterRPM ?? ''} 
                    placeholder="None"
                    onChange={(e) => updateForm('revLimiterRPM', e.target.value ? parseFloat(e.target.value) : undefined)} />
                  <small style={{ color: 'var(--color-muted)' }}>High-side RPM limit (optional)</small>
                </div>
              </div>
              <div className="grid grid-2 gap-4 mb-4">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.n2oEnabled ?? false} onChange={(e) => updateForm('n2oEnabled', e.target.checked)} />
                    N2O (Nitrous Oxide)
                  </label>
                </div>
                <div></div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                <small style={{ color: 'var(--color-muted)' }}>
                  💡 A synthetic HP curve will be generated from your peak HP, RPM, and displacement.
                </small>
              </div>
            </div>
          )}

          {/* QuarterJr Transmission Tab - Clutch/Converter, Slip/Stall RPM, Gear Ratios (no efficiencies) */}
          {activeTab === 'transmission' && !isPro && (
            <div className="mb-4">
              {/* Transmission Type Selector */}
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text)' }}>Transmission Type</h4>
              <div className="radio-group" style={{ marginBottom: '1rem' }}>
                <label className="radio-label">
                  <input type="radio" name="transType" value="clutch" checked={transType === 'clutch'} onChange={() => setTransType('clutch')} />
                  <span>Manual (Clutch)</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="transType" value="converter" checked={transType === 'converter'} onChange={() => setTransType('converter')} />
                  <span>Automatic (Converter)</span>
                </label>
              </div>

              {/* Clutch Settings */}
              {transType === 'clutch' && (
                <div className="grid grid-2 gap-4 mb-4">
                  <div>
                    <label className="label">Slip RPM</label>
                    <input type="number" className="input" value={form.clutchSlipRPM ?? 5500} onChange={(e) => updateForm('clutchSlipRPM', parseFloat(e.target.value))} />
                    <small style={{ color: 'var(--color-muted)' }}>RPM where clutch fully engages</small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.clutchLockup ?? false} onChange={(e) => updateForm('clutchLockup', e.target.checked)} />
                      Lockup Clutch
                    </label>
                  </div>
                </div>
              )}

              {/* Converter Settings */}
              {transType === 'converter' && (
                <div className="grid grid-2 gap-4 mb-4">
                  <div>
                    <label className="label">Stall RPM</label>
                    <input type="number" className="input" value={form.converterStallRPM ?? 3500} onChange={(e) => updateForm('converterStallRPM', parseFloat(e.target.value))} />
                    <small style={{ color: 'var(--color-muted)' }}>Converter stall speed</small>
                  </div>
                  <div>
                    <label className="label">Converter Diameter (in)</label>
                    <input type="number" step="0.1" className="input" value={form.converterDiameterIn ?? 11} onChange={(e) => updateForm('converterDiameterIn', parseFloat(e.target.value))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: '0.5rem' }}>
                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.converterLockup ?? false} onChange={(e) => updateForm('converterLockup', e.target.checked)} />
                      Lockup Converter
                    </label>
                  </div>
                </div>
              )}

              {/* Gear Ratios (simplified - no efficiencies) */}
              <h4 style={{ marginBottom: '0.5rem', marginTop: '1rem', color: 'var(--color-text)' }}>Gear Ratios</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {(form.gearRatios ?? [2.5, 1.8, 1.4, 1.0]).map((ratio, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{i + 1}:</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="input" 
                      style={{ width: '70px' }} 
                      value={ratio} 
                      onChange={(e) => updateGearAt('gearRatios', i, parseFloat(e.target.value))} 
                    />
                    {(form.gearRatios?.length ?? 0) > 2 && (
                      <button 
                        type="button" 
                        onClick={() => removeGear(i)} 
                        style={{ background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.125rem 0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addGear} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>+ Add Gear</button>
            </div>
          )}

          {/* QuarterJr Final Drive Tab - Gear Ratio, Tire Diameter, Tire Width */}
          {activeTab === 'finaldrive' && !isPro && (
            <div className="mb-4">
              <div className="grid grid-3 gap-4">
                <div>
                  <label className="label">
                    Final Drive Ratio *
                    <WorksheetButton onClick={() => setShowGearRatioWorksheet(true)} tooltip={TOOLTIPS.btnGearRatio} />
                  </label>
                  <input type="number" step="0.01" className="input" value={form.rearGear ?? ''} onChange={(e) => updateForm('rearGear', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>{TOOLTIPS.rearGear}</small>
                </div>
                <div>
                  <label className="label">
                    Tire Diameter (in) *
                    <WorksheetButton onClick={() => setShowTireRolloutWorksheet(true)} tooltip="Calculate diameter from tire rollout" />
                  </label>
                  <input type="number" step="0.1" className="input" value={form.tireDiaIn ?? ''} onChange={(e) => updateForm('tireDiaIn', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>{TOOLTIPS.tireDiameter}</small>
                </div>
                <div>
                  <label className="label">
                    Tire Width (in)
                    <WorksheetButton onClick={() => setShowTireWidthWorksheet(true)} tooltip={TOOLTIPS.btnTireWidth} />
                  </label>
                  <input type="number" step="0.1" className="input" value={form.tireWidthIn ?? 14} onChange={(e) => updateForm('tireWidthIn', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>{TOOLTIPS.tireWidth}</small>
                </div>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* QUARTER PRO TABS (advanced inputs) */}
          {/* ============================================== */}

          {/* Geometry Tab - Weight and dimensions (Pro only) */}
          {activeTab === 'geometry' && isPro && (
            <div className="mb-4">
              {/* Basic fields for all users */}
              <div className="grid grid-3 gap-4 mb-4">
                <div>
                  <label className="label">Weight (lb) *</label>
                  <input type="number" step="1" className="input" value={form.weightLb ?? ''} onChange={(e) => updateForm('weightLb', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">Tire Diameter (in) *</label>
                  <input type="number" step="0.1" className="input" value={form.tireDiaIn ?? ''} onChange={(e) => updateForm('tireDiaIn', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">Staging Rollout (in) *</label>
                  <input type="number" step="0.1" className="input" value={form.rolloutIn ?? ''} onChange={(e) => updateForm('rolloutIn', parseFloat(e.target.value))} />
                </div>
              </div>

              {/* Pro fields */}
              {isPro && (
                <>
                  <h4 style={{ marginBottom: '0.5rem', marginTop: '1rem', color: 'var(--color-text)' }}>Advanced Geometry</h4>
                  <div className="grid grid-3 gap-4">
                    <div>
                      <label className="label">Wheelbase (in)</label>
                      <input type="number" step="0.1" className="input" value={form.wheelbaseIn ?? ''} onChange={(e) => updateForm('wheelbaseIn', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className="label">Front Overhang (in)</label>
                      <input type="number" step="0.1" className="input" value={form.overhangIn ?? ''} onChange={(e) => updateForm('overhangIn', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className="label">Tire Width (in)</label>
                      <input type="number" step="0.1" className="input" value={form.tireWidthIn ?? ''} onChange={(e) => updateForm('tireWidthIn', parseFloat(e.target.value))} />
                    </div>
                  </div>
                  {/* Static Front Weight and CG Height - only for motorcycles (VB6: hidden for cars) */}
                  {form.bodyStyle === 8 && (
                    <>
                      <h4 style={{ marginBottom: '0.5rem', marginTop: '1rem', color: 'var(--color-text)' }}>Motorcycle CG (Advanced)</h4>
                      <div className="grid grid-2 gap-4">
                        <div>
                          <label className="label">Static Front Weight (lb)</label>
                          <input type="number" step="1" className="input" value={form.staticFrontWeightLb ?? ''} onChange={(e) => updateForm('staticFrontWeightLb', parseFloat(e.target.value))} />
                          <small style={{ color: 'var(--color-muted)' }}>Weight on front wheel with rider</small>
                        </div>
                        <div>
                          <label className="label">CG Height (in)</label>
                          <input type="number" step="0.1" className="input" value={form.cgHeightIn ?? ''} onChange={(e) => updateForm('cgHeightIn', parseFloat(e.target.value))} />
                          <small style={{ color: 'var(--color-muted)' }}>Height of center of gravity</small>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Aero Tab - Aerodynamics + body style (Pro only) */}
          {activeTab === 'aero' && isPro && (
            <div className="mb-4">
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Body Style</label>
                  <select className="input" value={form.bodyStyle ?? 1} onChange={(e) => updateForm('bodyStyle', parseInt(e.target.value))}>
                    <option value={1}>Dragster with Wing (Cd=0.66, Cl=0.8)</option>
                    <option value={2}>Dragster (Cd=0.50, Cl=0.2)</option>
                    <option value={3}>Funny Car Body (Cd=0.52, Cl=0.8)</option>
                    <option value={4}>Altered/Roadster (Cd=0.52, Cl=0.1)</option>
                    <option value={5}>Fastback (Cd=0.28, Cl=0.1)</option>
                    <option value={6}>Sedan (Cd=0.40, Cl=0.1)</option>
                    <option value={7}>Station Wagon/Van (Cd=0.46, Cl=0.1)</option>
                    <option value={8}>Motorcycle (Cd=0.54, Cl=0.1)</option>
                  </select>
                  <small style={{ color: 'var(--color-muted)' }}>Select body style or enter custom values below</small>
                </div>
                <div>
                  <label className="label">Frontal Area (ft²)</label>
                  <input type="number" step="0.1" className="input" value={form.frontalAreaFt2 ?? ''} onChange={(e) => updateForm('frontalAreaFt2', parseFloat(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Drag Coefficient (Cd)</label>
                  <input type="number" step="0.001" className="input" value={form.cd ?? ''} onChange={(e) => updateForm('cd', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>Override body style default</small>
                </div>
                <div>
                  <label className="label">Lift Coefficient (Cl)</label>
                  <input type="number" step="0.001" className="input" value={form.liftCoeff ?? ''} onChange={(e) => updateForm('liftCoeff', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>Positive = lift, Negative = downforce</small>
                </div>
              </div>
            </div>
          )}

          {/* Drivetrain Tab - Gears, trans type, clutch/converter (Pro only) */}
          {activeTab === 'drivetrain' && isPro && (
            <div className="mb-4">
              <div className="grid grid-2 gap-4 mb-4">
                <div>
                  <label className="label">Final Drive Ratio *</label>
                  <input type="number" step="0.01" className="input" value={form.rearGear ?? ''} onChange={(e) => updateForm('rearGear', parseFloat(e.target.value))} />
                </div>
                <div>
                  <label className="label">Trans Efficiency</label>
                  <input type="number" step="0.001" className="input" value={form.transEfficiency ?? ''} onChange={(e) => updateForm('transEfficiency', parseFloat(e.target.value))} />
                </div>
              </div>

              {/* Shift Mode & Rev Limiter - MOVED ABOVE GEAR TABLE */}
              <div className="grid grid-3 gap-4 mb-4">
                <div>
                  <label className="label">Shift Mode</label>
                  <select className="input" value={form.shiftMode ?? 'rpm'} onChange={(e) => {
                    updateForm('shiftMode', e.target.value as 'rpm' | 'time');
                    // Initialize shift times if switching to time mode
                    if (e.target.value === 'time' && (!form.shiftTimes || form.shiftTimes.length === 0)) {
                      const numGears = (form.gearRatios?.length ?? 4) - 1;
                      updateForm('shiftTimes', Array(numGears).fill(0).map((_, i) => (i + 1) * 1.5));
                    }
                  }}>
                    <option value="rpm">Shift by RPM</option>
                    <option value="time">Shift by Time</option>
                  </select>
                  <small style={{ color: 'var(--color-muted)' }}>When to shift gears</small>
                </div>
                <div>
                  <label className="label">Rev Limiter RPM</label>
                  <input type="number" step="100" className="input" value={form.revLimiterRPM ?? ''} 
                    placeholder="None"
                    onChange={(e) => updateForm('revLimiterRPM', e.target.value ? parseFloat(e.target.value) : undefined)} />
                  <small style={{ color: 'var(--color-muted)' }}>High-side limit (optional)</small>
                </div>
                <div></div>
              </div>

              {/* Gears Table - Dynamic columns based on shift mode */}
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text)' }}>Transmission Gears</h4>
              <table style={{ width: '100%', marginBottom: '1rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', width: '60px' }}>Gear</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Ratio</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Efficiency</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>
                      {form.shiftMode === 'time' ? 'Shift Time (s)' : 'Shift RPM'}
                    </th>
                    <th style={{ padding: '0.5rem', width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(form.gearRatios ?? []).map((ratio, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{i + 1}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="number" step="0.01" className="input" style={{ width: '100px' }} value={ratio} onChange={(e) => updateGearAt('gearRatios', i, parseFloat(e.target.value))} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="number" step="0.001" className="input" style={{ width: '100px' }} value={form.gearEfficiencies?.[i] ?? 0.98} onChange={(e) => updateGearAt('gearEfficiencies', i, parseFloat(e.target.value))} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {form.shiftMode === 'time' ? (
                          // For time mode: show shift time for all gears except the last one
                          i < (form.gearRatios?.length ?? 1) - 1 ? (
                            <input 
                              type="number" 
                              step="0.01" 
                              className="input" 
                              style={{ width: '100px' }} 
                              value={form.shiftTimes?.[i] ?? (i + 1) * 1.5} 
                              placeholder={`${i + 1}→${i + 2}`}
                              onChange={(e) => {
                                const times = [...(form.shiftTimes ?? [])];
                                times[i] = parseFloat(e.target.value);
                                updateForm('shiftTimes', times);
                              }} 
                            />
                          ) : (
                            <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>—</span>
                          )
                        ) : (
                          // For RPM mode: show shift RPM for all gears except the last one
                          i < (form.gearRatios?.length ?? 1) - 1 ? (
                            <input type="number" step="100" className="input" style={{ width: '100px' }} value={form.shiftRPMs?.[i] ?? 7000} onChange={(e) => updateGearAt('shiftRPMs', i, parseFloat(e.target.value))} />
                          ) : (
                            <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>—</span>
                          )
                        )}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <button type="button" onClick={() => removeGear(i)} style={{ background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={addGear} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>+ Add Gear</button>

              {/* Transmission Type Selector */}
              <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text)' }}>Transmission Type</h4>
              <div className="radio-group" style={{ marginBottom: '1rem' }}>
                <label className="radio-label">
                  <input type="radio" name="transType" value="clutch" checked={transType === 'clutch'} onChange={() => setTransType('clutch')} />
                  <span>Manual (Clutch)</span>
                </label>
                <label className="radio-label">
                  <input type="radio" name="transType" value="converter" checked={transType === 'converter'} onChange={() => setTransType('converter')} />
                  <span>Automatic (Converter)</span>
                </label>
              </div>

              {/* Clutch Settings */}
              {transType === 'clutch' && (
                <div className="grid grid-2 gap-4">
                  <div>
                    <label className="label">Launch RPM</label>
                    <input type="number" className="input" value={form.clutchLaunchRPM ?? ''} onChange={(e) => updateForm('clutchLaunchRPM', parseFloat(e.target.value))} />
                  </div>
                  <div>
                    <label className="label">Slip RPM</label>
                    <input type="number" className="input" value={form.clutchSlipRPM ?? ''} onChange={(e) => updateForm('clutchSlipRPM', parseFloat(e.target.value))} />
                  </div>
                  <div>
                    <label className="label">Slippage Factor</label>
                    <input type="number" step="0.001" className="input" value={form.clutchSlippage ?? ''} onChange={(e) => updateForm('clutchSlippage', parseFloat(e.target.value))} />
                  </div>
                  <div>
                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={form.clutchLockup ?? false} onChange={(e) => updateForm('clutchLockup', e.target.checked)} />
                      Lockup
                    </label>
                  </div>
                </div>
              )}

              {/* Converter Settings */}
              {transType === 'converter' && (
                <div className="grid grid-2 gap-4">
                  <div>
                    <label className="label">Stall RPM *</label>
                    <input type="number" className="input" value={form.converterStallRPM ?? ''} onChange={(e) => updateForm('converterStallRPM', parseFloat(e.target.value))} />
                    <small style={{ color: 'var(--color-muted)' }}>Converter stall speed (also used as launch RPM)</small>
                  </div>
                  <div>
                    <label className="label">Diameter (in)</label>
                    <input type="number" step="0.1" className="input" value={form.converterDiameterIn ?? ''} placeholder="Auto-calc" onChange={(e) => updateForm('converterDiameterIn', e.target.value ? parseFloat(e.target.value) : undefined)} />
                    <small style={{ color: 'var(--color-muted)' }}>6-15 inches (used to calculate slippage/torque mult)</small>
                  </div>
                  <div>
                    <label className="label">Torque Multiplier</label>
                    <input type="number" step="0.01" className="input" value={form.converterTorqueMult ?? ''} placeholder="Auto-calc" onChange={(e) => updateForm('converterTorqueMult', e.target.value ? parseFloat(e.target.value) : undefined)} />
                    <small style={{ color: 'var(--color-muted)' }}>Leave blank to auto-calculate from diameter</small>
                  </div>
                  <div>
                    <label className="label">Slippage Factor</label>
                    <input type="number" step="0.001" className="input" value={form.converterSlippage ?? ''} placeholder="Auto-calc" onChange={(e) => updateForm('converterSlippage', e.target.value ? parseFloat(e.target.value) : undefined)} />
                    <small style={{ color: 'var(--color-muted)' }}>Leave blank to auto-calculate from diameter</small>
                  </div>
                  <div>
                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" checked={form.converterLockup ?? false} onChange={(e) => updateForm('converterLockup', e.target.checked)} />
                      Lockup Converter
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PMI Tab - QuarterPro only */}
          {activeTab === 'pmi' && isPro && (
            <div className="mb-4">
              <div className="grid grid-3 gap-4">
                <div>
                  <label className="label">Engine PMI (slug-ft²)</label>
                  <input type="number" step="0.01" className="input" value={form.enginePMI ?? ''} onChange={(e) => updateForm('enginePMI', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>Engine, flywheel, clutch</small>
                </div>
                <div>
                  <label className="label">Trans PMI (slug-ft²)</label>
                  <input type="number" step="0.001" className="input" value={form.transPMI ?? ''} onChange={(e) => updateForm('transPMI', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>Transmission, driveshaft</small>
                </div>
                <div>
                  <label className="label">Tires PMI (slug-ft²)</label>
                  <input type="number" step="0.1" className="input" value={form.tiresPMI ?? ''} onChange={(e) => updateForm('tiresPMI', parseFloat(e.target.value))} />
                  <small style={{ color: 'var(--color-muted)' }}>Tires, wheels, ring gear</small>
                </div>
              </div>
            </div>
          )}

          {/* Engine Tab - Power, fuel, HP curve with graph (Pro only) */}
          {activeTab === 'engine' && isPro && (
            <div className="mb-4">
                  <div className="grid grid-2 gap-4 mb-4">
                    <div>
                      <label className="label">Fuel Type</label>
                      <select className="input" value={form.fuelType ?? 'Gasoline'} onChange={(e) => updateForm('fuelType', e.target.value)}>
                        {FUEL_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">HP Multiplier</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="number" step="0.01" className="input" style={{ width: '100px' }} value={hpMultiplier} onChange={(e) => setHpMultiplier(parseFloat(e.target.value) || 1)} />
                        <button type="button" onClick={applyHPMultiplier} className="btn btn-secondary" disabled={hpMultiplier === 1.0} style={{ whiteSpace: 'nowrap' }}>
                          Apply to All
                        </button>
                      </div>
                      <small style={{ color: 'var(--color-muted)' }}>Multiply all HP values</small>
                    </div>
                  </div>

                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text)' }}>Dyno Curve</h4>
              
              {/* Dyno Graph */}
              {sortedHPCurve.length > 1 && (
                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '600px', height: 'auto' }}>
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <line key={`h${i}`} x1="50" y1={40 + i * 35} x2="380" y2={40 + i * 35} stroke="var(--color-border)" strokeWidth="1" />
                    ))}
                    {/* Y-axis labels */}
                    {(() => {
                      const maxHP = Math.max(...sortedHPCurve.map(p => p.hp));
                      const minHP = Math.min(...sortedHPCurve.map(p => p.hp));
                      const range = maxHP - minHP || 100;
                      return [0, 1, 2, 3, 4].map(i => (
                        <text key={`yl${i}`} x="45" y={44 + i * 35} textAnchor="end" fontSize="10" fill="var(--color-muted)">
                          {Math.round(maxHP - (i / 4) * range)}
                        </text>
                      ));
                    })()}
                    {/* X-axis labels */}
                    {(() => {
                      const minRPM = Math.min(...sortedHPCurve.map(p => p.rpm));
                      const maxRPM = Math.max(...sortedHPCurve.map(p => p.rpm));
                      const range = maxRPM - minRPM || 1000;
                      return [0, 1, 2, 3, 4].map(i => (
                        <text key={`xl${i}`} x={50 + i * 82.5} y="195" textAnchor="middle" fontSize="10" fill="var(--color-muted)">
                          {Math.round(minRPM + (i / 4) * range)}
                        </text>
                      ));
                    })()}
                    {/* HP curve line */}
                    {(() => {
                      const minRPM = Math.min(...sortedHPCurve.map(p => p.rpm));
                      const maxRPM = Math.max(...sortedHPCurve.map(p => p.rpm));
                      const minHP = Math.min(...sortedHPCurve.map(p => p.hp));
                      const maxHP = Math.max(...sortedHPCurve.map(p => p.hp));
                      const rpmRange = maxRPM - minRPM || 1000;
                      const hpRange = maxHP - minHP || 100;
                      const points = sortedHPCurve.map(p => {
                        const x = 50 + ((p.rpm - minRPM) / rpmRange) * 330;
                        const y = 180 - ((p.hp - minHP) / hpRange) * 140;
                        return `${x},${y}`;
                      }).join(' ');
                      return <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="2" />;
                    })()}
                    {/* Data points */}
                    {(() => {
                      const minRPM = Math.min(...sortedHPCurve.map(p => p.rpm));
                      const maxRPM = Math.max(...sortedHPCurve.map(p => p.rpm));
                      const minHP = Math.min(...sortedHPCurve.map(p => p.hp));
                      const maxHP = Math.max(...sortedHPCurve.map(p => p.hp));
                      const rpmRange = maxRPM - minRPM || 1000;
                      const hpRange = maxHP - minHP || 100;
                      return sortedHPCurve.map((p, i) => {
                        const x = 50 + ((p.rpm - minRPM) / rpmRange) * 330;
                        const y = 180 - ((p.hp - minHP) / hpRange) * 140;
                        return <circle key={i} cx={x} cy={y} r="4" fill="var(--color-primary)" />;
                      });
                    })()}
                    {/* Axis labels */}
                    <text x="215" y="12" textAnchor="middle" fontSize="12" fill="var(--color-text)" fontWeight="bold">HP vs RPM</text>
                    <text x="10" y="110" textAnchor="middle" fontSize="10" fill="var(--color-muted)" transform="rotate(-90, 10, 110)">HP</text>
                    <text x="215" y="198" textAnchor="middle" fontSize="10" fill="var(--color-muted)">RPM</text>
                  </svg>
                </div>
              )}

              {/* HP Curve Table with Torque */}
              <table style={{ width: '100%', marginBottom: '1rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>RPM</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>HP</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Torque (lb-ft)</th>
                    <th style={{ padding: '0.5rem', width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(form.hpCurve ?? []).map((point, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="number" step="100" className="input" style={{ width: '100px' }} value={point.rpm} onChange={(e) => updateHPCurveAt(i, 'rpm', parseFloat(e.target.value))} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <input type="number" step="1" className="input" style={{ width: '100px' }} value={point.hp} onChange={(e) => updateHPCurveAt(i, 'hp', parseFloat(e.target.value))} />
                      </td>
                      <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>
                        {hpToTorque(point.hp, point.rpm).toFixed(1)}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <button type="button" onClick={() => removeHPPoint(i)} style={{ background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={addHPPoint} className="btn btn-secondary">+ Add HP Point</button>
            </div>
          )}

          {/* Throttle Stop Tab - QuarterPro only */}
          {activeTab === 'throttle' && isPro && (
            <div className="mb-4">
              <div style={{ marginBottom: '1rem' }}>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={form.throttleStopEnabled ?? false} 
                    onChange={(e) => updateForm('throttleStopEnabled', e.target.checked)} 
                  />
                  <span style={{ fontWeight: 600 }}>Enable Throttle Stop</span>
                </label>
                <small style={{ color: 'var(--color-muted)', marginLeft: '1.5rem', display: 'block' }}>
                  Use a throttle stop to control ET for bracket racing
                </small>
              </div>

              {form.throttleStopEnabled && (
                <>
                  <div className="grid grid-2 gap-4 mb-4">
                    <div>
                      <label className="label">Throttle % While On Stop</label>
                      <input 
                        type="number" 
                        step="1" 
                        min="0" 
                        max="100" 
                        className="input" 
                        value={form.throttleStopPct ?? 50} 
                        onChange={(e) => updateForm('throttleStopPct', parseFloat(e.target.value))} 
                      />
                      <small style={{ color: 'var(--color-muted)' }}>Throttle position when stop is active (0-100%)</small>
                    </div>
                    <div>
                      <label className="label">Target ET (seconds)</label>
                      <input 
                        type="number" 
                        step="0.001" 
                        className="input" 
                        value={form.throttleStopTargetET ?? ''} 
                        placeholder="e.g. 10.500"
                        onChange={(e) => updateForm('throttleStopTargetET', e.target.value ? parseFloat(e.target.value) : undefined)} 
                      />
                      <small style={{ color: 'var(--color-muted)' }}>Your dial-in or target ET for optimizer</small>
                    </div>
                  </div>

                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text)' }}>Base Timers</h4>
                  <div className="grid grid-2 gap-4 mb-4">
                    <div>
                      <label className="label">Delay (seconds)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="input" 
                        value={form.throttleStopDelay ?? 0.5} 
                        onChange={(e) => updateForm('throttleStopDelay', parseFloat(e.target.value))} 
                      />
                      <small style={{ color: 'var(--color-muted)' }}>Time after launch before stop activates</small>
                    </div>
                    <div>
                      <label className="label">Duration (seconds)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="input" 
                        value={form.throttleStopDuration ?? 0.3} 
                        onChange={(e) => updateForm('throttleStopDuration', parseFloat(e.target.value))} 
                      />
                      <small style={{ color: 'var(--color-muted)' }}>How long the stop stays active</small>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      💡 <strong>Tip:</strong> Set your target ET, then use the <strong>Optimize</strong> button on the ET Predict screen 
                      to automatically calculate the duration needed to hit your dial-in.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Make Public option for owner/admin */}
          {canMakePublic && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-surface-alt)', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={(e) => setIsPublic(e.target.checked)} 
                />
                <span style={{ fontWeight: 500 }}>Make Public (Sample Vehicle)</span>
              </label>
              <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                Public vehicles are visible to all users as sample/starter data.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={handleSave} className="btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Vehicle'}
            </button>
            <button onClick={handleCancel} className="btn btn-secondary" disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
          Loading vehicles...
        </div>
      ) : vehicles.length === 0 && !showForm ? (
        <div className="card text-center">
          <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
            No vehicles yet. Create your first vehicle to get started.
          </p>
          <button onClick={handleNew} className="btn">
            + Create First Vehicle
          </button>
        </div>
      ) : !showForm ? (
        <div>
          {/* Group filter */}
          {vehicleGroups.length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Filter:</span>
              <button
                onClick={() => setFilterGroup('')}
                className={`btn btn-secondary ${!filterGroup ? 'btn-active' : ''}`}
                style={{ 
                  padding: '0.25rem 0.75rem', 
                  fontSize: '0.8rem',
                  backgroundColor: !filterGroup ? 'var(--color-primary)' : undefined,
                  color: !filterGroup ? 'white' : undefined,
                }}
              >
                All ({vehicles.length})
              </button>
              {vehicleGroups.map(group => (
                <button
                  key={group}
                  onClick={() => setFilterGroup(group)}
                  className={`btn btn-secondary ${filterGroup === group ? 'btn-active' : ''}`}
                  style={{ 
                    padding: '0.25rem 0.75rem', 
                    fontSize: '0.8rem',
                    backgroundColor: filterGroup === group ? 'var(--color-primary)' : undefined,
                    color: filterGroup === group ? 'white' : undefined,
                  }}
                >
                  {group} ({vehicles.filter(v => v.group === group).length})
                </button>
              ))}
            </div>
          )}
          
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Group</th>
                  <th>Default Race</th>
                  <th className="align-right">Weight (lb)</th>
                  <th className="align-right">Power (HP)</th>
                  <th className="align-right">Tire Dia (in)</th>
                  <th className="align-right">Rear Gear</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td style={{ fontWeight: '500' }}>
                    {vehicle.name}
                    {vehicle.is_public && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        padding: '0.125rem 0.375rem', 
                        fontSize: '0.7rem', 
                        backgroundColor: '#dbeafe', 
                        color: '#1e40af',
                        borderRadius: '9999px',
                        fontWeight: 500,
                      }}>
                        Public
                      </span>
                    )}
                    {vehicle.owner_name && !vehicle.is_owner && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        fontSize: '0.75rem', 
                        color: 'var(--color-muted)',
                      }}>
                        by {vehicle.owner_name}
                      </span>
                    )}
                  </td>
                  <td style={{ color: vehicle.group ? 'var(--color-text)' : 'var(--color-muted)', fontSize: '0.85rem' }}>
                    {vehicle.group || '—'}
                  </td>
                  <td>{vehicle.defaultRaceLength === 'EIGHTH' ? '1/8 Mile' : '1/4 Mile'}</td>
                  <td className="align-right mono">{vehicle.weightLb}</td>
                  <td className="align-right mono">{vehicle.powerHP}</td>
                  <td className="align-right mono">{vehicle.tireDiaIn}</td>
                  <td className="align-right mono">{vehicle.rearGear}</td>
                  <td className="align-right">
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className="btn btn-secondary"
                        style={{
                          padding: 'var(--space-2) var(--space-3)',
                          fontSize: '0.875rem',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(vehicle)}
                        className="btn btn-secondary"
                        style={{
                          padding: 'var(--space-2) var(--space-3)',
                          fontSize: '0.875rem',
                        }}
                        title="Duplicate vehicle"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleDelete(vehicle.id, vehicle.name)}
                        className="btn btn-secondary"
                        style={{
                          padding: 'var(--space-2) var(--space-3)',
                          fontSize: '0.875rem',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : null}

      {vehicles.length > 0 && !showForm && (
        <div className="mt-6 text-center">
          <Link to="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      )}

      {/* Worksheet Modals */}
      <FrontalAreaWorksheet
        isOpen={showFrontalAreaWorksheet}
        onClose={() => setShowFrontalAreaWorksheet(false)}
        onApply={(value) => updateForm('frontalAreaFt2', value)}
      />
      <TireWidthWorksheet
        isOpen={showTireWidthWorksheet}
        onClose={() => setShowTireWidthWorksheet(false)}
        onApply={(value) => updateForm('tireWidthIn', value)}
      />
      <GearRatioWorksheet
        isOpen={showGearRatioWorksheet}
        onClose={() => setShowGearRatioWorksheet(false)}
        onApply={(value) => updateForm('rearGear', value)}
      />
      <RolloutWorksheet
        isOpen={showRolloutWorksheet}
        onClose={() => setShowRolloutWorksheet(false)}
        onApply={(value) => updateForm('rolloutIn', value)}
        tireDiameter={form.tireDiaIn}
      />
      <TireRolloutWorksheet
        isOpen={showTireRolloutWorksheet}
        onClose={() => setShowTireRolloutWorksheet(false)}
        onApply={(value) => updateForm('tireDiaIn', value)}
        tireDiameter={form.tireDiaIn}
        mode="diameter"
      />
    </Page>
  );
}

export default Vehicles;
