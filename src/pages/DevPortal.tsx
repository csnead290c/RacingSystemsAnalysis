/**
 * Dev Portal
 * 
 * Development and debugging interface with modular panels.
 * Only available in DEV builds.
 */

import { useState } from 'react';
import { DEV_PANELS } from '../dev/registry.tsx';
import Page from '../shared/components/Page';

export default function DevPortal() {
  const [activePanelId, setActivePanelId] = useState<string>(
    DEV_PANELS.length > 0 ? DEV_PANELS[0].id : ''
  );

  const activePanel = DEV_PANELS.find((p) => p.id === activePanelId);
  const ActiveComponent = activePanel?.component;

  return (
    <Page title="Dev Portal">
      <div style={{ display: 'flex', gap: '1rem', minHeight: '70vh' }}>
        {/* Left Navigation */}
        <nav
          style={{
            width: '200px',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            paddingRight: '1rem',
          }}
        >
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              color: 'var(--color-muted)',
              marginBottom: '1rem',
            }}
          >
            Dev Panels
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {DEV_PANELS.map((panel) => (
              <li key={panel.id} style={{ marginBottom: '0.25rem' }}>
                <button
                  onClick={() => setActivePanelId(panel.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    background:
                      activePanelId === panel.id
                        ? 'var(--color-primary)'
                        : 'transparent',
                    color:
                      activePanelId === panel.id
                        ? 'white'
                        : 'var(--color-text)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (activePanelId !== panel.id) {
                      e.currentTarget.style.backgroundColor =
                        'var(--color-surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activePanelId !== panel.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {panel.title}
                </button>
              </li>
            ))}
          </ul>
          {DEV_PANELS.length === 0 && (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-muted)',
                fontStyle: 'italic',
              }}
            >
              No panels registered
            </p>
          )}
        </nav>

        {/* Right Content Area */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            overflow: 'auto',
          }}
        >
          {ActiveComponent ? (
            <ActiveComponent />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-muted)' }}>
                No panel selected
              </p>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
