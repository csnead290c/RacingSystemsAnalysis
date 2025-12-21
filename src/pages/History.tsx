import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import PeekCard from '../shared/components/PeekCard';
import PredictionReportCard from '../shared/components/PredictionReportCard';
import QuickRunEntry from '../shared/components/QuickRunEntry';
import { storage } from '../state/storage';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import { hasFeature, CURRENT_TIER } from '../domain/config/entitlements';
import { runsToCsv, downloadCsv } from '../shared/utils/csv';
import type { RunRecordV1 } from '../domain/schemas/run.schema';
import type { RaceLength } from '../domain/config/raceLengths';

// Edit Run Modal Component
interface EditRunModalProps {
  run: RunRecordV1;
  vehicleName: string;
  onClose: () => void;
  onSave: (run: RunRecordV1) => void;
}

function EditRunModal({ run, vehicleName, onClose, onSave }: EditRunModalProps) {
  const [formData, setFormData] = useState({
    reactionTime: run.reactionTime?.toString() || '',
    sixtyFt: run.sixtyFt?.toString() || '',
    threeThirtyFt: run.threeThirtyFt?.toString() || '',
    eighthMileET: run.eighthMileET?.toString() || '',
    eighthMileMPH: run.eighthMileMPH?.toString() || '',
    thousandFt: run.thousandFt?.toString() || '',
    quarterMileET: run.quarterMileET?.toString() || '',
    quarterMileMPH: run.quarterMileMPH?.toString() || '',
    dialIn: run.dialIn?.toString() || '',
    notes: run.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedRun: RunRecordV1 = {
      ...run,
      reactionTime: parseFloat(formData.reactionTime) || undefined,
      sixtyFt: parseFloat(formData.sixtyFt) || undefined,
      threeThirtyFt: parseFloat(formData.threeThirtyFt) || undefined,
      eighthMileET: parseFloat(formData.eighthMileET) || undefined,
      eighthMileMPH: parseFloat(formData.eighthMileMPH) || undefined,
      thousandFt: parseFloat(formData.thousandFt) || undefined,
      quarterMileET: parseFloat(formData.quarterMileET) || undefined,
      quarterMileMPH: parseFloat(formData.quarterMileMPH) || undefined,
      dialIn: parseFloat(formData.dialIn) || undefined,
      notes: formData.notes || undefined,
      outcome: {
        slipET_s: run.raceLength === 'QUARTER' 
          ? parseFloat(formData.quarterMileET) || undefined 
          : parseFloat(formData.eighthMileET) || undefined,
        slipMPH: run.raceLength === 'QUARTER'
          ? parseFloat(formData.quarterMileMPH) || undefined
          : parseFloat(formData.eighthMileMPH) || undefined,
      },
    };
    onSave(updatedRun);
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontFamily: 'monospace',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="card" style={{
        maxWidth: '600px',
        width: '95%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: 'var(--space-4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ margin: 0 }}>Edit Run - {vehicleName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text)' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Dial-In</label>
              <input type="number" step="0.001" value={formData.dialIn} onChange={(e) => setFormData(f => ({ ...f, dialIn: e.target.value }))} style={inputStyle} placeholder="0.000" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>RT</label>
              <input type="number" step="0.001" value={formData.reactionTime} onChange={(e) => setFormData(f => ({ ...f, reactionTime: e.target.value }))} style={inputStyle} placeholder="0.000" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>60'</label>
              <input type="number" step="0.001" value={formData.sixtyFt} onChange={(e) => setFormData(f => ({ ...f, sixtyFt: e.target.value }))} style={inputStyle} placeholder="0.000" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>330'</label>
              <input type="number" step="0.001" value={formData.threeThirtyFt} onChange={(e) => setFormData(f => ({ ...f, threeThirtyFt: e.target.value }))} style={inputStyle} placeholder="0.000" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1/8 ET</label>
              <input type="number" step="0.001" value={formData.eighthMileET} onChange={(e) => setFormData(f => ({ ...f, eighthMileET: e.target.value }))} style={inputStyle} placeholder="0.000" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1/8 MPH</label>
              <input type="number" step="0.01" value={formData.eighthMileMPH} onChange={(e) => setFormData(f => ({ ...f, eighthMileMPH: e.target.value }))} style={inputStyle} placeholder="0.00" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1000'</label>
              <input type="number" step="0.001" value={formData.thousandFt} onChange={(e) => setFormData(f => ({ ...f, thousandFt: e.target.value }))} style={inputStyle} placeholder="0.000" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1/4 ET</label>
              <input type="number" step="0.001" value={formData.quarterMileET} onChange={(e) => setFormData(f => ({ ...f, quarterMileET: e.target.value }))} style={inputStyle} placeholder="0.000" />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>1/4 MPH</label>
              <input type="number" step="0.01" value={formData.quarterMileMPH} onChange={(e) => setFormData(f => ({ ...f, quarterMileMPH: e.target.value }))} style={inputStyle} placeholder="0.00" />
            </div>
          </div>
          
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
              style={{ ...inputStyle, minHeight: '60px', fontFamily: 'inherit' }}
              placeholder="Run notes..."
            />
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function History() {
  const [runs, setRuns] = useState<RunRecordV1[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<RunRecordV1[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterRaceLength, setFilterRaceLength] = useState<RaceLength | 'ALL'>('ALL');
  const [showReportCard, setShowReportCard] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [editingRun, setEditingRun] = useState<RunRecordV1 | null>(null);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const loadedRuns = await storage.loadRuns();
      // Sort by createdAt descending (newest first)
      const sorted = loadedRuns.sort((a, b) => b.createdAt - a.createdAt);
      setRuns(sorted);
      setFilteredRuns(sorted);
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
    // Load vehicles for name lookup
    loadVehicles().then(setVehicles).catch(console.error);
  }, []);

  // Create vehicle name lookup map
  const vehicleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach(v => { map[v.id] = v.name; });
    return map;
  }, [vehicles]);

  const getVehicleName = useCallback((vehicleId: string) => {
    return vehicleNameMap[vehicleId] || vehicleId;
  }, [vehicleNameMap]);

  useEffect(() => {
    let filtered = runs;

    // Filter by race length
    if (filterRaceLength !== 'ALL') {
      filtered = filtered.filter((run) => run.raceLength === filterRaceLength);
    }

    // Filter by search text (vehicleId or notes)
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (run) =>
          run.vehicleId.toLowerCase().includes(search) ||
          (run.notes && run.notes.toLowerCase().includes(search))
      );
    }

    setFilteredRuns(filtered);
  }, [runs, filterRaceLength, searchText]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this run?')) {
      return;
    }

    try {
      await storage.deleteRun(id);
      await loadRuns();
    } catch (error) {
      console.error('Failed to delete run:', error);
      alert('Failed to delete run');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const hasDataExport = hasFeature(CURRENT_TIER, 'dataExport');

  // Get unique vehicle IDs for report card selection
  const vehicleIds = useMemo(() => {
    const ids = new Set(runs.map(r => r.vehicleId));
    return Array.from(ids);
  }, [runs]);

  // Prepare runs for report card (only runs with both prediction and actual data)
  const reportCardRuns = useMemo(() => {
    if (!selectedVehicleId) return [];
    
    return runs
      .filter(r => r.vehicleId === selectedVehicleId)
      .filter(r => r.prediction?.et_s && r.prediction?.mph)
      .filter(r => {
        // Check for actual ET - could be in outcome.slipET_s or quarterMileET/eighthMileET
        const actualET = r.outcome?.slipET_s ?? 
          (r.raceLength === 'QUARTER' ? r.quarterMileET : r.eighthMileET);
        const actualMPH = r.outcome?.slipMPH ?? 
          (r.raceLength === 'QUARTER' ? r.quarterMileMPH : r.eighthMileMPH);
        return actualET !== undefined && actualMPH !== undefined;
      })
      .map(r => {
        const actualET = r.outcome?.slipET_s ?? 
          (r.raceLength === 'QUARTER' ? r.quarterMileET : r.eighthMileET) ?? 0;
        const actualMPH = r.outcome?.slipMPH ?? 
          (r.raceLength === 'QUARTER' ? r.quarterMileMPH : r.eighthMileMPH) ?? 0;
        
        return {
          date: new Date(r.createdAt).toLocaleDateString(),
          predictedET: r.prediction!.et_s,
          actualET,
          predictedMPH: r.prediction!.mph,
          actualMPH,
          weather: r.env ? {
            tempF: r.env.temperatureF ?? 70,
            humidity: r.env.humidityPct ?? 50,
            da: 0, // Could calculate DA if needed
          } : undefined,
        };
      });
  }, [runs, selectedVehicleId]);

  const handleShowReportCard = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setShowReportCard(true);
  };

  const handleExportFiltered = () => {
    if (!hasDataExport) {
      alert('Data export requires NITRO tier. Upgrade to unlock this feature.');
      return;
    }

    try {
      // Convert filtered runs to CSV
      const csvData = runsToCsv(filteredRuns);
      
      // Download as file
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      downloadCsv(csvData, `rsa_runs_filtered_${timestamp}.csv`);
      
      alert(`✓ Exported ${filteredRuns.length} filtered run${filteredRuns.length !== 1 ? 's' : ''} to CSV`);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleExportAll = () => {
    if (!hasDataExport) {
      alert('Data export requires NITRO tier. Upgrade to unlock this feature.');
      return;
    }

    try {
      // Convert all runs to CSV
      const csvData = runsToCsv(runs);
      
      // Download as file
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      downloadCsv(csvData, `rsa_runs_all_${timestamp}.csv`);
      
      alert(`✓ Exported ${runs.length} run${runs.length !== 1 ? 's' : ''} to CSV`);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  return (
    <Page
      title="Run History"
      actions={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowQuickEntry(true)}
              className="btn btn-primary"
              style={{ fontWeight: 'bold' }}
            >
              ⚡ Quick Log
            </button>
            <Link to="/log" className="btn">
              + Full Log
            </Link>
            <button
              onClick={handleExportFiltered}
              className="btn btn-secondary"
              disabled={!hasDataExport}
              title={!hasDataExport ? 'Requires NITRO tier' : 'Export filtered runs to CSV'}
            >
              Export Filtered ({filteredRuns.length})
            </button>
            <button
              onClick={handleExportAll}
              className="btn btn-secondary"
              disabled={!hasDataExport}
              title={!hasDataExport ? 'Requires NITRO tier' : 'Export all runs to CSV'}
            >
              Export All ({runs.length})
            </button>
            {vehicleIds.length > 0 && (
              <select
                className="btn btn-secondary"
                style={{ cursor: 'pointer' }}
                value=""
                onChange={(e) => e.target.value && handleShowReportCard(e.target.value)}
              >
                <option value="">📊 Report Card...</option>
                {vehicleIds.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            )}
          </div>
          {!hasDataExport && (
            <div style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              💎 CSV export requires NITRO tier
            </div>
          )}
        </div>
      }
    >
      <div className="mb-6">
        <div className="grid grid-2 gap-4">
          <div>
            <label className="label" htmlFor="search">
              Search (Vehicle ID or Notes)
            </label>
            <input
              id="search"
              type="text"
              className="input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
            />
          </div>
          <div>
            <label className="label" htmlFor="filter">
              Filter by Race Length
            </label>
            <select
              id="filter"
              className="input"
              value={filterRaceLength}
              onChange={(e) => setFilterRaceLength(e.target.value as RaceLength | 'ALL')}
              style={{ cursor: 'pointer' }}
            >
              <option value="ALL">All</option>
              <option value="EIGHTH">1/8 Mile</option>
              <option value="QUARTER">1/4 Mile</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
          Loading runs...
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted" style={{ margin: 0 }}>
            {runs.length === 0
              ? 'No runs logged yet. Click "Log New Run" to get started.'
              : 'No runs match your filters.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Race Length</th>
                <th className="align-right">Pred ET</th>
                <th className="align-right">Pred MPH</th>
                <th className="align-right">Actual ET</th>
                <th className="align-right">Actual MPH</th>
                <th className="align-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr key={run.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(run.createdAt)}
                  </td>
                  <td>{getVehicleName(run.vehicleId)}</td>
                  <td>{run.raceLength === 'EIGHTH' ? '1/8 Mile' : '1/4 Mile'}</td>
                  <td className="align-right mono">
                    {run.prediction?.et_s?.toFixed(3) || '—'}
                  </td>
                  <td className="align-right mono">
                    {run.prediction?.mph?.toFixed(2) || '—'}
                  </td>
                  <td className="align-right mono">
                    {run.outcome?.slipET_s?.toFixed(3) || '—'}
                  </td>
                  <td className="align-right mono">
                    {run.outcome?.slipMPH?.toFixed(2) || '—'}
                  </td>
                  <td className="align-right">
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingRun(run)}
                        className="btn btn-secondary"
                        style={{
                          padding: 'var(--space-2) var(--space-3)',
                          fontSize: '0.875rem',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(run.id)}
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
      )}

      {filteredRuns.length > 0 && (
        <div className="mt-4 text-muted text-center" style={{ fontSize: '0.875rem' }}>
          Showing {filteredRuns.length} of {runs.length} run{runs.length !== 1 ? 's' : ''}
        </div>
      )}

      {!hasDataExport && runs.length > 0 && (
        <div className="mt-6">
          <PeekCard
            title="Data Export"
            tier="NITRO"
            description="Export your runs and analysis to CSV, JSON, or PDF for external analysis and reporting."
            onLearnMore={() => alert('Upgrade to NITRO to unlock Data Export')}
          />
        </div>
      )}

      {/* Quick Run Entry Modal */}
      <QuickRunEntry
        isOpen={showQuickEntry}
        onClose={() => setShowQuickEntry(false)}
        onSaved={() => loadRuns()}
      />

      {/* Prediction Report Card Modal */}
      {showReportCard && selectedVehicleId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            maxWidth: '600px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <PredictionReportCard
              vehicleName={selectedVehicleId}
              runs={reportCardRuns}
              onClose={() => {
                setShowReportCard(false);
                setSelectedVehicleId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Run Modal */}
      {editingRun && (
        <EditRunModal
          run={editingRun}
          vehicleName={getVehicleName(editingRun.vehicleId)}
          onClose={() => setEditingRun(null)}
          onSave={async (updatedRun) => {
            try {
              await storage.saveRun(updatedRun);
              await loadRuns();
              setEditingRun(null);
            } catch (err) {
              console.error('Failed to save run:', err);
              alert('Failed to save run');
            }
          }}
        />
      )}
    </Page>
  );
}

export default History;
