/**
 * VehicleEditorPopup - Popup modal for editing vehicle settings in ET Sim
 * 
 * Allows quick adjustments to vehicle specs without leaving the simulation page.
 * Changes can be applied temporarily (for what-if) or saved permanently.
 */

import { useState, useEffect } from 'react';
import VehicleEditorPanel from './VehicleEditorPanel';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import { saveVehicle } from '../../state/vehicles';

interface VehicleEditorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onApply: (vehicle: Vehicle) => void; // Apply changes (temporary or permanent)
  isPro?: boolean;
}

export default function VehicleEditorPopup({
  isOpen,
  onClose,
  vehicle,
  onApply,
  isPro = false,
}: VehicleEditorPopupProps) {
  const [editedVehicle, setEditedVehicle] = useState<Partial<Vehicle>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize edited vehicle when popup opens
  useEffect(() => {
    if (isOpen && vehicle) {
      setEditedVehicle({ ...vehicle });
      setHasChanges(false);
    }
  }, [isOpen, vehicle]);

  // Handle changes from the editor panel
  const handleChange = (updated: Partial<Vehicle>) => {
    setEditedVehicle(updated);
    setHasChanges(true);
  };

  // Apply changes temporarily (just update the sim)
  const handleApplyTemp = () => {
    if (editedVehicle && vehicle) {
      onApply({ ...vehicle, ...editedVehicle } as Vehicle);
      onClose();
    }
  };

  // Save changes permanently
  const handleSave = async () => {
    if (!editedVehicle || !vehicle) return;
    
    setSaving(true);
    try {
      const updatedVehicle = { ...vehicle, ...editedVehicle } as Vehicle;
      await saveVehicle(updatedVehicle);
      onApply(updatedVehicle);
      onClose();
    } catch (error) {
      console.error('Failed to save vehicle:', error);
      alert('Failed to save vehicle. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !vehicle) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--color-bg)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        zIndex: 1001,
        width: '500px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>
              ⚙️ Edit Vehicle
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {vehicle.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Content - scrollable */}
        <div style={{
          padding: '16px',
          overflowY: 'auto',
          flex: 1,
        }}>
          <VehicleEditorPanel
            vehicle={editedVehicle}
            onChange={handleChange}
            isPro={isPro}
            compact={true}
            showName={false}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          backgroundColor: 'var(--color-surface)',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {hasChanges ? '• Unsaved changes' : 'No changes'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApplyTemp}
              disabled={!hasChanges}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--color-accent)',
                backgroundColor: 'transparent',
                color: 'var(--color-accent)',
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                opacity: hasChanges ? 1 : 0.5,
                fontSize: '0.85rem',
              }}
              title="Apply changes for this session only"
            >
              Apply
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: hasChanges ? 'var(--color-accent)' : 'var(--color-border)',
                color: 'white',
                cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
              title="Save changes permanently"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
