import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Page from '../shared/components/Page';
import PeekCard from '../shared/components/PeekCard';
import { storage } from '../state/storage';
import { hasFeature, CURRENT_TIER } from '../domain/config/entitlements';
import { runsToCsv, downloadCsv } from '../shared/utils/csv';
import type { RunRecordV1 } from '../domain/schemas/run.schema';
import type { RaceLength } from '../domain/config/raceLengths';

function History() {
  const [runs, setRuns] = useState<RunRecordV1[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<RunRecordV1[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterRaceLength, setFilterRaceLength] = useState<RaceLength | 'ALL'>('ALL');

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
  }, []);

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
            <Link to="/log" className="btn">
              + Log New Run
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
                  <td>{run.vehicleId}</td>
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
    </Page>
  );
}

export default History;
