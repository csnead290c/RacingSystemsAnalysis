import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import { loadVehicles, saveVehicle, deleteVehicle, type VehicleLite } from '../state/vehicles';
import { VehicleSchema } from '../domain/schemas/vehicle.schema';
import type { RaceLength } from '../domain/config/raceLengths';

function Vehicles() {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formWeightLb, setFormWeightLb] = useState('3000');
  const [formTireDiaIn, setFormTireDiaIn] = useState('28');
  const [formRearGear, setFormRearGear] = useState('3.73');
  const [formRolloutIn, setFormRolloutIn] = useState('12');
  const [formPowerHP, setFormPowerHP] = useState('400');
  const [formDefaultRaceLength, setFormDefaultRaceLength] = useState<RaceLength>('QUARTER');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
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
    setFormId('');
    setFormName('');
    setFormWeightLb('3000');
    setFormTireDiaIn('28');
    setFormRearGear('3.73');
    setFormRolloutIn('12');
    setFormPowerHP('400');
    setFormDefaultRaceLength('QUARTER');
    setFormError(null);
    setEditingId(null);
  };

  const handleNew = () => {
    resetForm();
    setFormId(crypto.randomUUID());
    setShowForm(true);
  };

  const handleEdit = (vehicle: VehicleLite) => {
    setFormId(vehicle.id);
    setFormName(vehicle.name);
    setFormWeightLb(vehicle.weightLb.toString());
    setFormTireDiaIn(vehicle.tireDiaIn.toString());
    setFormRearGear(vehicle.rearGear.toString());
    setFormRolloutIn(vehicle.rolloutIn.toString());
    setFormPowerHP(vehicle.powerHP.toString());
    setFormDefaultRaceLength(vehicle.defaultRaceLength);
    setEditingId(vehicle.id);
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
      // Build vehicle object
      const vehicle: VehicleLite = {
        id: formId,
        name: formName.trim(),
        weightLb: parseFloat(formWeightLb),
        tireDiaIn: parseFloat(formTireDiaIn),
        rearGear: parseFloat(formRearGear),
        rolloutIn: parseFloat(formRolloutIn),
        powerHP: parseFloat(formPowerHP),
        defaultRaceLength: formDefaultRaceLength,
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

          <div className="grid grid-2 gap-4 mb-4">
            <div>
              <label className="label" htmlFor="name">
                Vehicle Name *
              </label>
              <input
                id="name"
                type="text"
                className="input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My Mustang"
              />
            </div>

            <div>
              <label className="label">Default Race Length *</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="defaultRaceLength"
                    value="EIGHTH"
                    checked={formDefaultRaceLength === 'EIGHTH'}
                    onChange={(e) => setFormDefaultRaceLength(e.target.value as RaceLength)}
                  />
                  <span>1/8 Mile</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="defaultRaceLength"
                    value="QUARTER"
                    checked={formDefaultRaceLength === 'QUARTER'}
                    onChange={(e) => setFormDefaultRaceLength(e.target.value as RaceLength)}
                  />
                  <span>1/4 Mile</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-3 gap-4 mb-4">
            <div>
              <label className="label" htmlFor="weightLb">
                Weight (lb) *
              </label>
              <input
                id="weightLb"
                type="number"
                step="1"
                className="input"
                value={formWeightLb}
                onChange={(e) => setFormWeightLb(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="tireDiaIn">
                Tire Diameter (in) *
              </label>
              <input
                id="tireDiaIn"
                type="number"
                step="0.1"
                className="input"
                value={formTireDiaIn}
                onChange={(e) => setFormTireDiaIn(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="rearGear">
                Rear Gear Ratio *
              </label>
              <input
                id="rearGear"
                type="number"
                step="0.01"
                className="input"
                value={formRearGear}
                onChange={(e) => setFormRearGear(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-2 gap-4 mb-4">
            <div>
              <label className="label" htmlFor="rolloutIn">
                Rollout (in) *
              </label>
              <input
                id="rolloutIn"
                type="number"
                step="0.1"
                className="input"
                value={formRolloutIn}
                onChange={(e) => setFormRolloutIn(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="powerHP">
                Power (HP) *
              </label>
              <input
                id="powerHP"
                type="number"
                step="1"
                className="input"
                value={formPowerHP}
                onChange={(e) => setFormPowerHP(e.target.value)}
              />
            </div>
          </div>

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
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Default Race</th>
                <th className="align-right">Weight (lb)</th>
                <th className="align-right">Power (HP)</th>
                <th className="align-right">Tire Dia (in)</th>
                <th className="align-right">Rear Gear</th>
                <th className="align-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td style={{ fontWeight: '500' }}>{vehicle.name}</td>
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
      ) : null}

      {vehicles.length > 0 && !showForm && (
        <div className="mt-6 text-center">
          <Link to="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      )}
    </Page>
  );
}

export default Vehicles;
