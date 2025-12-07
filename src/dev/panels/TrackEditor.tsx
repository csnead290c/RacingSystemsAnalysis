/**
 * Track Editor Panel
 * 
 * Manage drag racing tracks with coordinates, elevation, and track angle.
 * Tracks are used for weather lookup and wind angle correction.
 * Tracks are stored in the database and shared across all users.
 * Only admins/owners can add/edit/delete tracks.
 */

import { useState, useEffect } from 'react';
import { 
  TRACKS, 
  type Track, 
  loadTracksFromAPI, 
  saveTrackToAPI, 
  updateTrackInAPI, 
  deleteTrackFromAPI 
} from '../../domain/config/tracks';
import { useAuth } from '../../domain/auth/authStore';

export default function TrackEditor() {
  const { user } = useAuth();
  const [apiTracks, setApiTracks] = useState<Track[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const isAdmin = user?.roleId === 'admin' || user?.roleId === 'owner';
  const isOwner = user?.roleId === 'owner';

  // Load API tracks on mount
  useEffect(() => {
    loadTracksFromAPI().then(setApiTracks);
  }, []);

  // All tracks combined (built-in + API)
  const allTracks = [...TRACKS, ...apiTracks.filter(t => !TRACKS.some(bt => bt.id === t.id))];
  
  // Filtered tracks
  const filteredTracks = searchQuery
    ? allTracks.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTracks;

  const handleNewTrack = () => {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Only admins can add tracks' });
      return;
    }
    setEditingTrack({
      id: `custom_${Date.now()}`,
      name: '',
      city: '',
      state: '',
      country: 'USA',
      lat: 0,
      lon: 0,
      elevation_ft: 0,
      length: '1/4',
    });
    setIsNew(true);
  };

  const handleEditTrack = (track: Track) => {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Only admins can edit tracks' });
      return;
    }
    // Only allow editing API tracks (not built-in)
    if (TRACKS.some(t => t.id === track.id)) {
      setMessage({ type: 'error', text: 'Built-in tracks cannot be edited. Create a copy instead.' });
      return;
    }
    setEditingTrack({ ...track });
    setIsNew(false);
  };

  const handleCopyTrack = (track: Track) => {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Only admins can add tracks' });
      return;
    }
    setEditingTrack({
      ...track,
      id: `custom_${Date.now()}`,
      name: `${track.name} (Copy)`,
    });
    setIsNew(true);
  };

  const handleSaveTrack = async () => {
    if (!editingTrack) return;
    
    if (!editingTrack.name.trim()) {
      setMessage({ type: 'error', text: 'Track name is required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isNew) {
        const result = await saveTrackToAPI(editingTrack);
        if (!result.success) {
          setMessage({ type: 'error', text: result.error || 'Failed to save track' });
          return;
        }
      } else {
        const result = await updateTrackInAPI(editingTrack.id, editingTrack);
        if (!result.success) {
          setMessage({ type: 'error', text: result.error || 'Failed to update track' });
          return;
        }
      }
      
      // Reload tracks
      const tracks = await loadTracksFromAPI();
      setApiTracks(tracks);
      setEditingTrack(null);
      setIsNew(false);
      setMessage({ type: 'success', text: isNew ? 'Track added successfully' : 'Track updated successfully' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!isOwner) {
      setMessage({ type: 'error', text: 'Only owners can delete tracks' });
      return;
    }
    if (TRACKS.some(t => t.id === trackId)) {
      setMessage({ type: 'error', text: 'Built-in tracks cannot be deleted.' });
      return;
    }
    if (!confirm('Delete this track?')) return;
    
    setLoading(true);
    const result = await deleteTrackFromAPI(trackId);
    if (result.success) {
      const tracks = await loadTracksFromAPI();
      setApiTracks(tracks);
      setMessage({ type: 'success', text: 'Track deleted' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete track' });
    }
    setLoading(false);
  };

  const isBuiltIn = (trackId: string) => TRACKS.some(t => t.id === trackId);
  // Check if track is from API (not built-in)
  const _isApiTrack = (trackId: string) => apiTracks.some(t => t.id === trackId);
  void _isApiTrack; // Suppress unused warning - will be used for edit permissions

  return (
    <div>
      {message && (
        <div style={{ 
          padding: '10px 16px', 
          marginBottom: '1rem', 
          borderRadius: '6px',
          backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: message.type === 'error' ? '#ef4444' : '#22c55e',
          border: `1px solid ${message.type === 'error' ? '#ef4444' : '#22c55e'}`,
        }}>
          {message.text}
        </div>
      )}
      
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleNewTrack}
          className="btn"
          style={{ backgroundColor: isAdmin ? 'var(--color-primary)' : 'var(--color-muted)' }}
          disabled={!isAdmin || loading}
        >
          + Add Track
        </button>
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ width: '200px' }}
        />
        <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          {filteredTracks.length} tracks ({apiTracks.length} custom)
        </span>
        {!isAdmin && (
          <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            (Admin access required to edit)
          </span>
        )}
      </div>

      {/* Track Editor Form */}
      {editingTrack && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>{isNew ? 'New Track' : 'Edit Track'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="label">Track Name *</label>
              <input
                type="text"
                className="input"
                value={editingTrack.name}
                onChange={(e) => setEditingTrack({ ...editingTrack, name: e.target.value })}
                placeholder="e.g., My Local Dragstrip"
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                type="text"
                className="input"
                value={editingTrack.city}
                onChange={(e) => setEditingTrack({ ...editingTrack, city: e.target.value })}
              />
            </div>
            <div>
              <label className="label">State</label>
              <input
                type="text"
                className="input"
                value={editingTrack.state}
                onChange={(e) => setEditingTrack({ ...editingTrack, state: e.target.value })}
                maxLength={2}
                style={{ width: '60px' }}
              />
            </div>
            <div>
              <label className="label">Latitude</label>
              <input
                type="number"
                className="input"
                step="0.0001"
                value={editingTrack.lat}
                onChange={(e) => setEditingTrack({ ...editingTrack, lat: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 34.0589"
              />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input
                type="number"
                className="input"
                step="0.0001"
                value={editingTrack.lon}
                onChange={(e) => setEditingTrack({ ...editingTrack, lon: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., -117.7517"
              />
            </div>
            <div>
              <label className="label">Elevation (ft)</label>
              <input
                type="number"
                className="input"
                value={editingTrack.elevation_ft}
                onChange={(e) => setEditingTrack({ ...editingTrack, elevation_ft: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Track Angle (°)</label>
              <input
                type="number"
                className="input"
                step="1"
                min="0"
                max="359"
                value={(editingTrack as any).trackAngle ?? 0}
                onChange={(e) => setEditingTrack({ ...editingTrack, trackAngle: parseInt(e.target.value) || 0 } as any)}
                placeholder="0 = North"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '4px' }}>
                Direction track points (0=N, 90=E, 180=S, 270=W)
              </div>
            </div>
            <div>
              <label className="label">Track Length</label>
              <select
                className="input"
                value={editingTrack.length}
                onChange={(e) => setEditingTrack({ ...editingTrack, length: e.target.value as '1/8' | '1/4' | 'both' })}
              >
                <option value="1/4">1/4 Mile</option>
                <option value="1/8">1/8 Mile</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleSaveTrack} className="btn" style={{ backgroundColor: 'var(--color-primary)' }}>
              Save Track
            </button>
            <button onClick={() => { setEditingTrack(null); setIsNew(false); }} className="btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Track List */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>Track Name</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Location</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>Lat</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>Lon</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>Elev (ft)</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>Angle</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Length</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTracks.map(track => (
              <tr 
                key={track.id} 
                style={{ 
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: isBuiltIn(track.id) ? 'transparent' : 'rgba(34, 197, 94, 0.05)',
                }}
              >
                <td style={{ padding: '8px' }}>
                  {track.name}
                  {isBuiltIn(track.id) && (
                    <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--color-muted)' }}>(built-in)</span>
                  )}
                </td>
                <td style={{ padding: '8px' }}>{track.city}, {track.state}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{track.lat.toFixed(4)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{track.lon.toFixed(4)}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{track.elevation_ft.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>{(track as any).trackAngle ?? '-'}°</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{track.length}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleCopyTrack(track)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-bg-secondary)',
                        cursor: 'pointer',
                      }}
                      title="Copy track"
                    >
                      📋
                    </button>
                    {!isBuiltIn(track.id) && (
                      <>
                        <button
                          onClick={() => handleEditTrack(track)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--color-bg-secondary)',
                            cursor: 'pointer',
                          }}
                          title="Edit track"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                          title="Delete track"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Help text */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', fontSize: '0.85rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Track Angle</h4>
        <p style={{ color: 'var(--color-muted)', margin: 0 }}>
          The track angle is the compass direction the track points (direction cars travel down the strip).
          This is used to calculate the effective headwind/tailwind from the weather wind direction.
          <br /><br />
          <strong>0°</strong> = North, <strong>90°</strong> = East, <strong>180°</strong> = South, <strong>270°</strong> = West
          <br /><br />
          <strong>Tip:</strong> Use Google Maps to find coordinates. Right-click on the track location and copy the coordinates.
        </p>
      </div>
    </div>
  );
}
