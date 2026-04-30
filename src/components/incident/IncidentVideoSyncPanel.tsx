/**
 * IncidentVideoSyncPanel — Multi-video sync panel with offset controls
 * 
 * Features:
 * - Display multiple synced videos
 * - Editable time offset per video
 * - Nudge buttons for fine adjustment
 * - "Set sync point" workflow
 * - Mute/unmute controls
 * - Hide/show toggles
 * - Bidirectional sync with data cursor
 */

import React, { useRef, useEffect, useState } from 'react';
import type { AnalysisVideo } from '../../services/incidentAnalysisApi';
import { incidentAnalysisApi } from '../../services/incidentAnalysisApi';

interface IncidentVideoSyncPanelProps {
  videos: AnalysisVideo[];
  cursorTime: number | null;
  playing: boolean;
  onUpdateVideoOffset: (videoId: number, offset: number) => void;
  onDeleteVideo: (videoId: number) => void;
  onCursorChange: (time: number) => void;
}

export const IncidentVideoSyncPanel: React.FC<IncidentVideoSyncPanelProps> = ({
  videos,
  cursorTime,
  playing,
  onUpdateVideoOffset,
  onDeleteVideo,
  onCursorChange,
}) => {
  const videoRefs = useRef<Record<number, HTMLVideoElement>>({});
  const [hiddenVideos, setHiddenVideos] = useState<Set<number>>(new Set());
  const [mutedVideos, setMutedVideos] = useState<Set<number>>(new Set(videos.map(v => v.id)));
  const [editingOffset, setEditingOffset] = useState<number | null>(null);
  const [offsetInput, setOffsetInput] = useState('');
  const lastSyncTime = useRef<number | null>(null);

  // Sync videos to cursor time
  useEffect(() => {
    if (cursorTime == null) return;

    // Avoid excessive seeking (tolerance: 0.05s)
    if (lastSyncTime.current != null && Math.abs(cursorTime - lastSyncTime.current) < 0.05) {
      return;
    }

    videos.forEach(vid => {
      const el = videoRefs.current[vid.id];
      if (el && !hiddenVideos.has(vid.id)) {
        const videoTime = Math.max(0, cursorTime - vid.time_offset);
        if (Math.abs(el.currentTime - videoTime) > 0.1) {
          el.currentTime = videoTime;
        }
      }
    });

    lastSyncTime.current = cursorTime;
  }, [cursorTime, videos, hiddenVideos]);

  // Handle video playback
  useEffect(() => {
    videos.forEach(vid => {
      const el = videoRefs.current[vid.id];
      if (el && !hiddenVideos.has(vid.id)) {
        if (playing) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      }
    });
  }, [playing, videos, hiddenVideos]);

  const handleSetSyncPoint = (videoId: number) => {
    const el = videoRefs.current[videoId];
    if (!el || cursorTime == null) return;

    const newOffset = cursorTime - el.currentTime;
    onUpdateVideoOffset(videoId, newOffset);
  };

  const handleNudge = (videoId: number, delta: number) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    onUpdateVideoOffset(videoId, video.time_offset + delta);
  };

  const handleOffsetEdit = (videoId: number) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    setEditingOffset(videoId);
    setOffsetInput(video.time_offset.toFixed(3));
  };

  const handleOffsetSave = (videoId: number) => {
    const offset = parseFloat(offsetInput);
    if (!isNaN(offset)) {
      onUpdateVideoOffset(videoId, offset);
    }
    setEditingOffset(null);
  };

  const toggleHidden = (videoId: number) => {
    setHiddenVideos(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const toggleMuted = (videoId: number) => {
    setMutedVideos(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
    const el = videoRefs.current[videoId];
    if (el) {
      el.muted = !el.muted;
    }
  };

  const handleVideoSeeked = (videoId: number) => {
    const el = videoRefs.current[videoId];
    const video = videos.find(v => v.id === videoId);
    if (!el || !video) return;

    // Bidirectional sync: video scrub updates data cursor
    const dataTime = el.currentTime + video.time_offset;
    onCursorChange(dataTime);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>
        Videos ({videos.length})
      </div>

      {videos.length === 0 && (
        <div style={{ fontSize: '0.65rem', color: '#666', textAlign: 'center', padding: '1rem 0' }}>
          No videos yet. Upload video evidence to sync with telemetry.
        </div>
      )}

      {videos.map(vid => (
        <div
          key={vid.id}
          style={{
            background: '#2a2a3a',
            border: '1px solid #444',
            borderRadius: 4,
            padding: '0.5rem',
            display: hiddenVideos.has(vid.id) ? 'none' : 'block',
          }}
        >
          {/* Video header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.7rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={vid.name}>
              {vid.name}
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => toggleMuted(vid.id)}
                style={{
                  padding: '0.15rem 0.3rem',
                  background: 'transparent',
                  color: mutedVideos.has(vid.id) ? '#666' : '#3b82f6',
                  border: 'none',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
                title={mutedVideos.has(vid.id) ? 'Unmute' : 'Mute'}
              >
                {mutedVideos.has(vid.id) ? '🔇' : '🔊'}
              </button>
              <button
                onClick={() => toggleHidden(vid.id)}
                style={{
                  padding: '0.15rem 0.3rem',
                  background: 'transparent',
                  color: '#666',
                  border: 'none',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
                title="Hide video"
              >
                👁
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete video "${vid.name}"?`)) {
                    onDeleteVideo(vid.id);
                  }
                }}
                style={{
                  padding: '0.15rem 0.3rem',
                  background: 'transparent',
                  color: '#ef4444',
                  border: 'none',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
                title="Delete video"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Video player */}
          <video
            ref={el => { if (el) videoRefs.current[vid.id] = el; }}
            src={incidentAnalysisApi.getVideoUrl(vid.id)}
            style={{ width: '100%', borderRadius: 4, background: '#000', marginBottom: '0.5rem' }}
            controls={!playing}
            muted={mutedVideos.has(vid.id)}
            playsInline
            onSeeked={() => handleVideoSeeked(vid.id)}
          />

          {/* Offset controls */}
          <div style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ color: '#aaa', minWidth: 50 }}>Offset:</span>
              {editingOffset === vid.id ? (
                <>
                  <input
                    type="number"
                    step="0.001"
                    value={offsetInput}
                    onChange={e => setOffsetInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleOffsetSave(vid.id);
                      if (e.key === 'Escape') setEditingOffset(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '0.2rem 0.3rem',
                      background: '#1e1e2e',
                      border: '1px solid #3b82f6',
                      borderRadius: 3,
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontFamily: 'monospace',
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleOffsetSave(vid.id)}
                    style={{
                      padding: '0.2rem 0.4rem',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                    }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingOffset(null)}
                    style={{
                      padding: '0.2rem 0.4rem',
                      background: '#444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      color: '#fff',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                    onClick={() => handleOffsetEdit(vid.id)}
                    title="Click to edit offset"
                  >
                    {vid.time_offset.toFixed(3)}s
                  </span>
                  <button
                    onClick={() => handleSetSyncPoint(vid.id)}
                    style={{
                      padding: '0.2rem 0.4rem',
                      background: '#22c55e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                    }}
                    title="Set current video frame to match cursor time"
                  >
                    Sync
                  </button>
                </>
              )}
            </div>

            {/* Nudge buttons */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => handleNudge(vid.id, -1)} style={nudgeButtonStyle}>-1s</button>
              <button onClick={() => handleNudge(vid.id, -0.1)} style={nudgeButtonStyle}>-0.1s</button>
              <button onClick={() => handleNudge(vid.id, 0.1)} style={nudgeButtonStyle}>+0.1s</button>
              <button onClick={() => handleNudge(vid.id, 1)} style={nudgeButtonStyle}>+1s</button>
            </div>
          </div>
        </div>
      ))}

      {/* Hidden videos indicator */}
      {hiddenVideos.size > 0 && (
        <div style={{ fontSize: '0.65rem', color: '#666', textAlign: 'center' }}>
          {hiddenVideos.size} video{hiddenVideos.size > 1 ? 's' : ''} hidden
          <button
            onClick={() => setHiddenVideos(new Set())}
            style={{
              marginLeft: '0.5rem',
              padding: '0.1rem 0.3rem',
              background: 'transparent',
              color: '#3b82f6',
              border: 'none',
              fontSize: '0.65rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Show all
          </button>
        </div>
      )}
    </div>
  );
};

const nudgeButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.2rem 0.3rem',
  background: '#444',
  color: '#fff',
  border: 'none',
  borderRadius: 3,
  fontSize: '0.6rem',
  cursor: 'pointer',
};
