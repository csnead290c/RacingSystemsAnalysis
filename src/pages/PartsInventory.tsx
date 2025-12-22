/**
 * Parts & Inventory Management Page
 * Track parts, inventory levels, and component lifecycles
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Page from '../shared/components/Page';
import { partsStorage } from '../state/teamManagement';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import {
  type Part,
  type PartCategory,
  type PartCondition,
  PART_CATEGORY_LABELS,
  PART_CONDITION_LABELS,
  createPart,
} from '../domain/schemas/teamManagement.schema';

type ViewMode = 'grid' | 'list';
type FilterCategory = PartCategory | 'all';

function PartsInventory() {
  const [parts, setParts] = useState<Part[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterCondition, setFilterCondition] = useState<PartCondition | 'all'>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor state
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Part>>({});

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [partsData, vehiclesData] = await Promise.all([
          partsStorage.getAll(),
          loadVehicles(),
        ]);
        setParts(partsData);
        setVehicles(vehiclesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Filtered parts
  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      if (filterCategory !== 'all' && part.category !== filterCategory) return false;
      if (filterCondition !== 'all' && part.condition !== filterCondition) return false;
      if (filterVehicle !== 'all' && part.vehicleId !== filterVehicle) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = part.name.toLowerCase().includes(query);
        const matchesPartNumber = part.partNumber?.toLowerCase().includes(query);
        const matchesManufacturer = part.manufacturer?.toLowerCase().includes(query);
        if (!matchesName && !matchesPartNumber && !matchesManufacturer) return false;
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [parts, filterCategory, filterCondition, filterVehicle, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const totalValue = parts.reduce((sum, p) => sum + (p.purchasePrice || 0) * p.quantity, 0);
    const lowStock = parts.filter(p => p.minQuantity && p.quantity <= p.minQuantity).length;
    const needsRebuild = parts.filter(p => p.condition === 'rebuild-needed').length;
    return { totalParts: parts.length, totalValue, lowStock, needsRebuild };
  }, [parts]);

  // Handlers
  const handleCreate = useCallback(() => {
    setFormData({
      name: '',
      category: 'engine',
      condition: 'new',
      quantity: 1,
    });
    setEditingPart(null);
    setIsCreating(true);
    setShowEditor(true);
  }, []);

  const handleEdit = useCallback((part: Part) => {
    setFormData({ ...part });
    setEditingPart(part);
    setIsCreating(false);
    setShowEditor(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.name || !formData.category || !formData.condition) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const partData = isCreating
        ? createPart({
            name: formData.name,
            category: formData.category as PartCategory,
            condition: formData.condition as PartCondition,
            quantity: formData.quantity ?? 1,
            partNumber: formData.partNumber,
            manufacturer: formData.manufacturer,
            purchaseDate: formData.purchaseDate,
            purchasePrice: formData.purchasePrice,
            vendor: formData.vendor,
            vehicleId: formData.vehicleId,
            location: formData.location,
            rebuildInterval: formData.rebuildInterval,
            minQuantity: formData.minQuantity,
            notes: formData.notes,
          })
        : { ...editingPart!, ...formData, updatedAt: Date.now() };

      await partsStorage.save(partData as Part);
      
      // Refresh data
      const updatedParts = await partsStorage.getAll();
      setParts(updatedParts);
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to save part:', error);
      alert('Failed to save part');
    }
  }, [formData, isCreating, editingPart]);

  const handleDelete = useCallback(async (partId: string) => {
    if (!confirm('Are you sure you want to delete this part?')) return;
    
    try {
      await partsStorage.delete(partId);
      setParts(prev => prev.filter(p => p.id !== partId));
    } catch (error) {
      console.error('Failed to delete part:', error);
      alert('Failed to delete part');
    }
  }, []);

  const getVehicleName = useCallback((vehicleId?: string) => {
    if (!vehicleId) return 'Not installed';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.name || 'Unknown vehicle';
  }, [vehicles]);

  const getConditionColor = (condition: PartCondition) => {
    switch (condition) {
      case 'new': return '#10b981';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'worn': return '#f97316';
      case 'rebuild-needed': return '#ef4444';
      case 'retired': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <Page title="Parts & Inventory">
        <div className="text-center" style={{ padding: '4rem' }}>
          <p>Loading parts...</p>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Parts & Inventory">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
            {stats.totalParts}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Parts</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            ${stats.totalValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Value</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.lowStock > 0 ? '#f59e0b' : 'var(--color-text)' }}>
            {stats.lowStock}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Low Stock</div>
        </div>
        <div className="card card-compact" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stats.needsRebuild > 0 ? '#ef4444' : 'var(--color-text)' }}>
            {stats.needsRebuild}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Needs Rebuild</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-4" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search parts..."
            className="input"
            style={{ flex: '1 1 200px', minWidth: '150px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {/* Category Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
          >
            <option value="all">All Categories</option>
            {Object.entries(PART_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          
          {/* Condition Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value as PartCondition | 'all')}
          >
            <option value="all">All Conditions</option>
            {Object.entries(PART_CONDITION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          
          {/* Vehicle Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          >
            <option value="all">All Vehicles</option>
            <option value="">Not Installed</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          
          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className={`btn btn-small ${viewMode === 'list' ? '' : 'btn-secondary'}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
            <button
              className={`btn btn-small ${viewMode === 'grid' ? '' : 'btn-secondary'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
          </div>
          
          {/* Add Button */}
          <button className="btn" onClick={handleCreate}>
            + Add Part
          </button>
        </div>
      </div>

      {/* Parts List/Grid */}
      {filteredParts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            {parts.length === 0 ? 'No parts yet. Add your first part to get started!' : 'No parts match your filters.'}
          </p>
          {parts.length === 0 && (
            <button className="btn" onClick={handleCreate}>+ Add First Part</button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Condition</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Value</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map(part => (
                <tr key={part.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{part.name}</div>
                    {part.partNumber && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        #{part.partNumber}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {PART_CATEGORY_LABELS[part.category]}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: `${getConditionColor(part.condition)}20`,
                      color: getConditionColor(part.condition),
                    }}>
                      {PART_CONDITION_LABELS[part.condition]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 600,
                      color: part.minQuantity && part.quantity <= part.minQuantity ? '#f59e0b' : 'inherit',
                    }}>
                      {part.quantity}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.8rem' }}>
                    {part.vehicleId ? getVehicleName(part.vehicleId) : (part.location || '—')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {part.purchasePrice ? `$${(part.purchasePrice * part.quantity).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(part)}
                      style={{ marginRight: '4px' }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleDelete(part.id)}
                      style={{ color: '#ef4444' }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredParts.map(part => (
            <div key={part.id} className="card card-compact" style={{ cursor: 'pointer' }} onClick={() => handleEdit(part)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-muted)',
                }}>
                  {PART_CATEGORY_LABELS[part.category]}
                </span>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  backgroundColor: `${getConditionColor(part.condition)}20`,
                  color: getConditionColor(part.condition),
                }}>
                  {PART_CONDITION_LABELS[part.condition]}
                </span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{part.name}</div>
              {part.manufacturer && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  {part.manufacturer}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.8rem' }}>
                <span>Qty: <strong>{part.quantity}</strong></span>
                {part.purchasePrice && <span style={{ color: '#10b981' }}>${part.purchasePrice}</span>}
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
              <h2 style={{ margin: 0 }}>{isCreating ? 'Add Part' : 'Edit Part'}</h2>
              <button
                onClick={() => setShowEditor(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text)' }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div className="col-span-2">
                <label className="label">Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., CP Pistons 4.155"
                />
              </div>

              {/* Part Number */}
              <div>
                <label className="label">Part Number</label>
                <input
                  type="text"
                  className="input"
                  value={formData.partNumber || ''}
                  onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                  placeholder="e.g., SC7528"
                />
              </div>

              {/* Manufacturer */}
              <div>
                <label className="label">Manufacturer</label>
                <input
                  type="text"
                  className="input"
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., CP Pistons"
                />
              </div>

              {/* Category */}
              <div>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={formData.category || 'engine'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as PartCategory })}
                >
                  {Object.entries(PART_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="label">Condition *</label>
                <select
                  className="input"
                  value={formData.condition || 'new'}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as PartCondition })}
                >
                  {Object.entries(PART_CONDITION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="label">Quantity</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.quantity ?? 1}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Min Quantity */}
              <div>
                <label className="label">Min Stock Level</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.minQuantity ?? ''}
                  onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || undefined })}
                  placeholder="Alert when below"
                />
              </div>

              {/* Purchase Price */}
              <div>
                <label className="label">Purchase Price ($)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.01"
                  value={formData.purchasePrice ?? ''}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>

              {/* Vendor */}
              <div>
                <label className="label">Vendor</label>
                <input
                  type="text"
                  className="input"
                  value={formData.vendor || ''}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Where purchased"
                />
              </div>

              {/* Vehicle */}
              <div>
                <label className="label">Installed On</label>
                <select
                  className="input"
                  value={formData.vehicleId || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value || undefined })}
                >
                  <option value="">Not installed</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="label">Location</label>
                <input
                  type="text"
                  className="input"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Shelf A-3, Trailer"
                />
              </div>

              {/* Rebuild Interval */}
              <div>
                <label className="label">Rebuild Interval (passes)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={formData.rebuildInterval ?? ''}
                  onChange={(e) => setFormData({ ...formData, rebuildInterval: parseInt(e.target.value) || undefined })}
                  placeholder="e.g., 100"
                />
              </div>

              {/* Purchase Date */}
              <div>
                <label className="label">Purchase Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.purchaseDate ? new Date(formData.purchaseDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value ? new Date(e.target.value).getTime() : undefined })}
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={3}
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
                {isCreating ? 'Add Part' : 'Save Changes'}
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

export default PartsInventory;
