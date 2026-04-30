/**
 * HotkeyHelp — Keyboard shortcut reference overlay
 */

import React from 'react';
import type { HotkeyRegistry } from '../../domain/workspace/hotkeys';
import { getHotkeysByCategory, formatHotkeyLabel } from '../../domain/workspace/hotkeys';

export interface HotkeyHelpProps {
  registry: HotkeyRegistry;
  onClose: () => void;
}

export const HotkeyHelp: React.FC<HotkeyHelpProps> = ({ registry, onClose }) => {
  const categories = getHotkeysByCategory(registry);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    zoom: 'Zoom & Pan',
    markers: 'Markers',
    playback: 'Playback',
    workspace: 'Workspace',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e1e2e',
          border: '1px solid #444',
          borderRadius: 8,
          padding: '1.5rem',
          maxWidth: 600,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: '#aaa',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {Object.entries(categories).map(([category, hotkeys]) => {
          if (hotkeys.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3b82f6', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {categoryLabels[category] || category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {hotkeys.map((hotkey, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{hotkey.label}</div>
                      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{hotkey.description}</div>
                    </div>
                    <div
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: '#2a2a3a',
                        border: '1px solid #444',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: '#fff',
                        minWidth: 60,
                        textAlign: 'center',
                      }}
                    >
                      {formatHotkeyLabel(hotkey.key)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #333', fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>
          Press <kbd style={{ padding: '0.1rem 0.3rem', background: '#2a2a3a', borderRadius: 3 }}>?</kbd> to toggle this help
        </div>
      </div>
    </div>
  );
};
