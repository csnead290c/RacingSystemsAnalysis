import React, { useState, useCallback, useEffect } from 'react';
import {
  parityApi,
  type TrackCoordCoverageRow,
} from '../services/parityApi';

// Inline styles matching ParityPortal conventions
const S = {
  h1: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text)' } as React.CSSProperties,
  subtitle: { color: 'var(--color-muted)', fontSize: '0.8rem', marginBottom: '1rem' } as React.CSSProperties,
  card: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' } as React.CSSProperties,
  th: { textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '2px solid var(--color-border)', fontSize: '0.7rem', whiteSpace: 'nowrap' } as React.CSSProperties,
  td: { padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--color-border)', verticalAlign: 'middle' } as React.CSSProperties,
  input: { padding: '0.25rem 0.4rem', border: '1px solid var(--color-border)', borderRadius: 3, fontSize: '0.75rem', fontFamily: 'inherit' } as React.CSSProperties,
  btn: (v: 'primary' | 'secondary' | 'danger') => ({
    padding: '0.35rem 0.75rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
    background: v === 'primary' ? 'var(--color-primary)' : v === 'danger' ? '#e74c3c' : 'var(--color-surface)',
    color: v === 'primary' || v === 'danger' ? '#fff' : 'var(--color-text)',
    border: v === 'secondary' ? '1px solid var(--color-border)' : 'none',
  }) as React.CSSProperties,
};

export default function TrackCoordCoveragePanel() {
  const [tracks, setTracks] = useState<TrackCoordCoverageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [yearFrom, setYearFrom] = useState(2021);
  const [yearTo, setYearTo] = useState(2024);
  const [edits, setEdits] = useState<Record<number, { lat: string; lon: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await parityApi.trackCoordCoverage(yearFrom, yearTo);
      setTracks(res.tracks);
      const e: Record<number, { lat: string; lon: string }> = {};
      for (const t of res.tracks) {
        e[t.track_id] = {
          lat: t.latitude != null ? String(t.latitude) : '',
          lon: t.longitude != null ? String(t.longitude) : '',
        };
      }
      setEdits(e);
    } catch (err: any) {
      setMsg('Error: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [yearFrom, yearTo]);

  useEffect(() => { load(); }, [load]);

  const saveAll = async () => {
    const toSave = tracks
      .filter(t => {
        const e = edits[t.track_id];
        if (!e || !e.lat || !e.lon) return false;
        const newLat = parseFloat(e.lat);
        const newLon = parseFloat(e.lon);
        if (isNaN(newLat) || isNaN(newLon)) return false;
        return newLat !== t.latitude || newLon !== t.longitude;
      })
      .map(t => ({
        trackId: t.track_id,
        latitude: parseFloat(edits[t.track_id].lat),
        longitude: parseFloat(edits[t.track_id].lon),
      }));

    if (toSave.length === 0) { setMsg('No changes to save.'); return; }
    setSaving(true);
    setMsg('');
    try {
      const res = await parityApi.bulkUpdateTrackCoords(toSave);
      setMsg(`Saved: ${res.updated} updated` + (res.errors.length ? `, ${res.errors.length} errors` : ''));
      if (res.errors.length) console.warn('Bulk update errors:', res.errors);
      load();
    } catch (err: any) {
      setMsg('Save error: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const saveSingle = async (trackId: number) => {
    const e = edits[trackId];
    if (!e || !e.lat || !e.lon) return;
    const lat = parseFloat(e.lat);
    const lon = parseFloat(e.lon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setMsg(`Invalid coords for track ${trackId}`);
      return;
    }
    setSaving(true);
    try {
      await parityApi.updateTrackCoords({ trackId, latitude: lat, longitude: lon });
      setMsg(`Track ${trackId} updated.`);
      load();
    } catch (err: any) {
      setMsg('Error: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const missingCount = tracks.filter(t => t.coordsMissing).length;

  return (
    <div>
      <h3 style={S.h1}>Track Coordinate Coverage</h3>
      <p style={S.subtitle}>
        Tracks used by events in {yearFrom}–{yearTo}. Edit lat/lon inline for missing tracks, then Save All.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.75rem' }}>From: <input type="number" value={yearFrom} onChange={e => setYearFrom(+e.target.value)}
          style={{ width: 60, ...S.input }} /></label>
        <label style={{ fontSize: '0.75rem' }}>To: <input type="number" value={yearTo} onChange={e => setYearTo(+e.target.value)}
          style={{ width: 60, ...S.input }} /></label>
        <button style={S.btn('primary')} onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button style={S.btn('secondary')} onClick={saveAll} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
        {msg && <span style={{ fontSize: '0.75rem', color: msg.startsWith('Error') || msg.startsWith('Save error') ? '#e74c3c' : '#2ecc71' }}>{msg}</span>}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
        {tracks.length} tracks total, <strong style={{ color: missingCount ? '#e74c3c' : '#2ecc71' }}>{missingCount} missing coords</strong>
      </p>
      {tracks.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>ID</th>
                <th style={S.th}>Track</th>
                <th style={S.th}>City, State</th>
                <th style={S.th}>TZ</th>
                <th style={S.th}>Events</th>
                <th style={S.th}>Seasons</th>
                <th style={S.th}>0% Wx</th>
                <th style={S.th}>Latitude</th>
                <th style={S.th}>Longitude</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {tracks.map(t => {
                const e = edits[t.track_id] || { lat: '', lon: '' };
                const isMissing = t.coordsMissing;
                return (
                  <tr key={t.track_id} style={{ background: isMissing ? 'rgba(231,76,60,0.08)' : undefined }}>
                    <td style={S.td}>{t.track_id}</td>
                    <td style={S.td}>{t.track_name}</td>
                    <td style={S.td}>{[t.city, t.state].filter(Boolean).join(', ')}</td>
                    <td style={{ ...S.td, fontSize: '0.65rem' }}>{t.timezone_iana}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>{t.event_count}</td>
                    <td style={S.td}>{t.seasons}</td>
                    <td style={{ ...S.td, textAlign: 'center', color: t.events_zero_weather > 0 ? '#e74c3c' : '#2ecc71' }}>
                      {t.events_zero_weather}
                    </td>
                    <td style={S.td}>
                      <input type="text" value={e.lat}
                        onChange={ev => setEdits(prev => ({ ...prev, [t.track_id]: { ...prev[t.track_id], lat: ev.target.value } }))}
                        style={{ width: 90, ...S.input, background: isMissing ? '#fff3cd' : undefined }}
                        placeholder="-90..90" />
                    </td>
                    <td style={S.td}>
                      <input type="text" value={e.lon}
                        onChange={ev => setEdits(prev => ({ ...prev, [t.track_id]: { ...prev[t.track_id], lon: ev.target.value } }))}
                        style={{ width: 90, ...S.input, background: isMissing ? '#fff3cd' : undefined }}
                        placeholder="-180..180" />
                    </td>
                    <td style={S.td}>
                      <button style={{ ...S.btn('secondary'), fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                        onClick={() => saveSingle(t.track_id)} disabled={saving}>
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
