/**
 * Maintenance & Service Log Page
 * Track all maintenance activities, schedule services, use checklists
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Page from '../shared/components/Page';
import { maintenanceStorage, serviceScheduleStorage, partsStorage } from '../state/teamManagement';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import {
  type MaintenanceRecord,
  type MaintenanceType,
  type MaintenanceCategory,
  type ServiceSchedule,
  type Part,
  createMaintenanceRecord,
} from '../domain/schemas/teamManagement.schema';

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  'scheduled': 'Scheduled',
  'unscheduled': 'Unscheduled',
  'pre-race': 'Pre-Race',
  'post-race': 'Post-Race',
  'rebuild': 'Rebuild',
  'upgrade': 'Upgrade',
  'repair': 'Repair',
};

const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  'engine': 'Engine',
  'drivetrain': 'Drivetrain',
  'suspension': 'Suspension',
  'chassis': 'Chassis',
  'electrical': 'Electrical',
  'safety': 'Safety',
  'general': 'General',
  'inspection': 'Inspection',
};

function Maintenance() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [_parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterType, setFilterType] = useState<MaintenanceType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<MaintenanceCategory | 'all'>('all');
  
  // Editor state
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({});

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [recordsData, schedulesData, vehiclesData, partsData] = await Promise.all([
          maintenanceStorage.getAll(),
          serviceScheduleStorage.getAll(),
          loadVehicles(),
          partsStorage.getAll(),
        ]);
        setRecords(recordsData);
        setSchedules(schedulesData);
        setVehicles(vehiclesData);
        setParts(partsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (filterVehicle !== 'all' && record.vehicleId !== filterVehicle) return false;
      if (filterType !== 'all' && record.type !== filterType) return false;
      if (filterCategory !== 'all' && record.category !== filterCategory) return false;
      return true;
    }).sort((a, b) => b.date - a.date);
  }, [records, filterVehicle, filterType, filterCategory]);

  // Stats
  const stats = useMemo(() => {
    const totalCost = records.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalHours = records.reduce((sum, r) => sum + (r.laborHours || 0), 0);
    const thisMonth = records.filter(r => {
      const recordDate = new Date(r.date);
      const now = new Date();
      return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
    });
    const monthCost = thisMonth.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    
    return {
      totalRecords: records.length,
      totalCost,
      totalHours,
      monthCost,
      dueServices: schedules.filter(s => s.enabled).length, // Simplified - should check intervals
    };
  }, [records, schedules]);

  // Handlers
  const handleCreate = useCallback(() => {
    setFormData({
      title: '',
      type: 'scheduled',
      category: 'general',
      date: Date.now(),
      vehicleId: vehicles[0]?.id || '',
      completed: true,
    });
    setEditingRecord(null);
    setIsCreating(true);
    setShowEditor(true);
  }, [vehicles]);

  const handleEdit = useCallback((record: MaintenanceRecord) => {
    setFormData({ ...record });
    setEditingRecord(record);
    setIsCreating(false);
    setShowEditor(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.title || !formData.vehicleId || !formData.type || !formData.category) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const recordData = isCreating
        ? createMaintenanceRecord({
            title: formData.title,
            vehicleId: formData.vehicleId,
            type: formData.type as MaintenanceType,
            category: formData.category as MaintenanceCategory,
            date: formData.date || Date.now(),
            description: formData.description,
            laborHours: formData.laborHours,
            laborCost: formData.laborCost,
            partsCost: formData.partsCost,
            totalCost: formData.totalCost || ((formData.laborCost || 0) + (formData.partsCost || 0)),
            mileage: formData.mileage,
            passCount: formData.passCount,
            performedBy: formData.performedBy,
            notes: formData.notes,
            completed: formData.completed ?? true,
          })
        : { ...editingRecord!, ...formData, updatedAt: Date.now() };

      await maintenanceStorage.save(recordData as MaintenanceRecord);
      
      const updatedRecords = await maintenanceStorage.getAll();
      setRecords(updatedRecords);
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to save record:', error);
      alert('Failed to save maintenance record');
    }
  }, [formData, isCreating, editingRecord]);

  const handleDelete = useCallback(async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this maintenance record?')) return;
    
    try {
      await maintenanceStorage.delete(recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('Failed to delete record');
    }
  }, []);

  const getVehicleName = useCallback((vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.name || 'Unknown vehicle';
  }, [vehicles]);

  const getTypeColor = (type: MaintenanceType) => {
    switch (type) {
      case 'scheduled': return '#3b82f6';
      case 'unscheduled': return '#f59e0b';
      case 'pre-race': return '#10b981';
      case 'post-race': return '#8b5cf6';
      case 'rebuild': return '#ef4444';
      case 'upgrade': return '#06b6d4';
      case 'repair': return '#f97316';
      default: return '#6b7280';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Page title="Maintenance Log">
        <div className="text-center" style={{ padding: '4rem' }}>
          <p>Loading maintenance records...</p>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Maintenance Log">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
            {stats.totalRecords}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Records</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
            ${stats.totalCost.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Cost</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>
            {stats.totalHours.toFixed(1)}h
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Hours</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
            ${stats.monthCost.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>This Month</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.dueServices > 0 ? '#ef4444' : '#10b981' }}>
            {stats.dueServices}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Services Due</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-4" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Vehicle Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          >
            <option value="all">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          
          {/* Type Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MaintenanceType | 'all')}
          >
            <option value="all">All Types</option>
            {Object.entries(MAINTENANCE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          
          {/* Category Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as MaintenanceCategory | 'all')}
          >
            <option value="all">All Categories</option>
            {Object.entries(MAINTENANCE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          
          <div style={{ flex: 1 }} />
          
          {/* Add Button */}
          <button className="btn" onClick={handleCreate}>
            + Log Service
          </button>
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            {records.length === 0 ? 'No maintenance records yet. Log your first service!' : 'No records match your filters.'}
          </p>
          {records.length === 0 && (
            <button className="btn" onClick={handleCreate}>+ Log First Service</button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredRecords.map(record => (
            <div key={record.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: `${getTypeColor(record.type)}20`,
                      color: getTypeColor(record.type),
                    }}>
                      {MAINTENANCE_TYPE_LABELS[record.type]}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {MAINTENANCE_CATEGORY_LABELS[record.category]}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{record.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    🚗 {getVehicleName(record.vehicleId)} • 📅 {formatDate(record.date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {record.totalCost && (
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>
                      ${record.totalCost.toLocaleString()}
                    </div>
                  )}
                  {record.laborHours && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {record.laborHours}h labor
                    </div>
                  )}
                </div>
              </div>
              
              {record.description && (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: '12px' }}>
                  {record.description}
                </p>
              )}
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', fontSize: '0.8rem' }}>
                {record.mileage && (
                  <span>📍 {record.mileage.toLocaleString()} mi</span>
                )}
                {record.passCount && (
                  <span>🏁 {record.passCount} passes</span>
                )}
                {record.performedBy && (
                  <span>👤 {record.performedBy}</span>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-small btn-secondary" onClick={() => handleEdit(record)}>
                  Edit
                </button>
                <button
                  className="btn btn-small btn-secondary"
                  onClick={() => handleDelete(record.id)}
                  style={{ color: '#ef4444' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>{isCreating ? 'Log Service' : 'Edit Record'}</h2>
              <button
                onClick={() => setShowEditor(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text)' }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Title */}
              <div className="col-span-2">
                <label className="label">Service Title *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Oil Change, Engine Rebuild"
                />
              </div>

              {/* Vehicle */}
              <div>
                <label className="label">Vehicle *</label>
                <select
                  className="input"
                  value={formData.vehicleId || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).getTime() })}
                />
              </div>

              {/* Type */}
              <div>
                <label className="label">Type *</label>
                <select
                  className="input"
                  value={formData.type || 'scheduled'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as MaintenanceType })}
                >
                  {Object.entries(MAINTENANCE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={formData.category || 'general'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as MaintenanceCategory })}
                >
                  {Object.entries(MAINTENANCE_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What was done..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Labor Hours */}
              <div>
                <label className="label">Labor Hours</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.5"
                  value={formData.laborHours ?? ''}
                  onChange={(e) => setFormData({ ...formData, laborHours: parseFloat(e.target.value) || undefined })}
                />
              </div>

              {/* Labor Cost */}
              <div>
                <label className="label">Labor Cost ($)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.01"
                  value={formData.laborCost ?? ''}
                  onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || undefined })}
                />
              </div>

              {/* Parts Cost */}
              <div>
                <label className="label">Parts Cost ($)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.01"
                  value={formData.partsCost ?? ''}
                  onChange={(e) => setFormData({ ...formData, partsCost: parseFloat(e.target.value) || undefined })}
                />
              </div>

              {/* Total Cost */}
              <div>
                <label className="label">Total Cost ($)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.01"
                  value={formData.totalCost ?? (((formData.laborCost || 0) + (formData.partsCost || 0)) || '')}
                  onChange={(e) => setFormData({ ...formData, totalCost: parseFloat(e.target.value) || undefined })}
                />
              </div>

              {/* Mileage */}
              <div>
                <label className="label">Mileage</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.mileage ?? ''}
                  onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) || undefined })}
                />
              </div>

              {/* Pass Count */}
              <div>
                <label className="label">Pass Count</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.passCount ?? ''}
                  onChange={(e) => setFormData({ ...formData, passCount: parseInt(e.target.value) || undefined })}
                />
              </div>

              {/* Performed By */}
              <div className="col-span-2">
                <label className="label">Performed By</label>
                <input
                  type="text"
                  className="input"
                  value={formData.performedBy || ''}
                  onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
                  placeholder="e.g., Self, Shop Name"
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-full" onClick={handleSave}>
                {isCreating ? 'Log Service' : 'Save Changes'}
              </button>
              <button className="btn btn-secondary btn-full" onClick={() => setShowEditor(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export default Maintenance;
