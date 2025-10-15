/**
 * Vehicle Picker Component
 * 
 * Simple selector for loading saved vehicles into VB6 fixture.
 * TODO: Integrate with vehicles store when available.
 */

interface VehiclePickerProps {
  onSelect: (vehicleId: string) => void;
  selectedId?: string;
}

export function VehiclePicker(_props: VehiclePickerProps) {
  // TODO: Replace with actual vehicles store
  // For now, show placeholder message
  return (
    <div style={{ 
      padding: '0.75rem', 
      backgroundColor: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '1rem',
      border: '1px dashed var(--color-border)'
    }}>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
        <strong>Vehicle Picker</strong> (placeholder)
        <br />
        TODO: Integrate with vehicles store to load saved vehicles into VB6 fixture.
      </p>
    </div>
  );
}
