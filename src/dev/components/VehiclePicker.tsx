/**
 * Vehicle Picker Component
 * 
 * Selector for choosing active vehicle from the vehicles store.
 * Shared selection with Vehicle Editor.
 */

import { useVehicleStore } from '../../state/vehicleStore';

interface VehiclePickerProps {
  onSelect?: (vehicleId: string) => void;
  showEditButton?: boolean;
  onEditClick?: () => void;
}

export function VehiclePicker({ onSelect, showEditButton = true, onEditClick }: VehiclePickerProps) {
  const { vehicles, activeVehicleId, setActiveVehicleById, loading } = useVehicleStore();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value || null;
    setActiveVehicleById(id);
    if (id && onSelect) {
      onSelect(id);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '0.75rem', 
        backgroundColor: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        border: '1px solid var(--color-border)'
      }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Loading vehicles...
        </span>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '0.75rem', 
      backgroundColor: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '1rem',
      border: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <label style={{ 
        fontSize: '0.875rem', 
        fontWeight: '500',
        color: 'var(--color-text)',
        whiteSpace: 'nowrap',
      }}>
        Active Vehicle:
      </label>
      
      <select
        value={activeVehicleId ?? ''}
        onChange={handleChange}
        style={{
          flex: 1,
          padding: '0.5rem',
          fontSize: '0.875rem',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <option value="">— Select a vehicle —</option>
        {vehicles.map(v => (
          <option key={v.id} value={v.id}>
            {v.name || v.id}
          </option>
        ))}
      </select>

      {showEditButton && activeVehicleId && (
        <button
          onClick={onEditClick}
          style={{
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Edit in Vehicle Editor
        </button>
      )}

      {vehicles.length === 0 && (
        <span style={{ 
          fontSize: '0.75rem', 
          color: 'var(--color-text-secondary)',
          fontStyle: 'italic',
        }}>
          No vehicles saved yet
        </span>
      )}
    </div>
  );
}
