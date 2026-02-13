/**
 * Dev Portal
 *
 * Development and debugging interface with modular panels.
 * Available in DEV builds or to owner/admin users.
 *
 * Panels are filtered by visibility metadata from the registry
 * and grouped into categories in the left nav.
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getVisiblePanels,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  type PanelCategory,
  type DevPanel,
} from '../dev/registry';
import { useCapabilities } from '../domain/config/useCapabilities';
import { useAuth } from '../domain/auth';
import Page from '../shared/components/Page';

// ── Styles ───────────────────────────────────────────────────────────

const navCategoryHeader: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-muted)',
  padding: '0.75rem 0.5rem 0.25rem',
  marginTop: '0.25rem',
};

const dangerCategoryHeader: React.CSSProperties = {
  ...navCategoryHeader,
  color: '#ef4444',
  borderTop: '1px solid rgba(239, 68, 68, 0.25)',
  marginTop: '0.75rem',
  paddingTop: '0.75rem',
};

// ── Component ────────────────────────────────────────────────────────

export default function DevPortal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const panelParam = searchParams.get('panel');

  const { can } = useCapabilities();
  const { user } = useAuth();

  const hasDevTools = can('admin.devTools');
  const isOwner = user?.roleId === 'owner';

  const visiblePanels = useMemo(
    () => getVisiblePanels(hasDevTools, isOwner),
    [hasDevTools, isOwner],
  );

  // Group panels by category (preserving CATEGORY_ORDER)
  const grouped = useMemo(() => {
    const map = new Map<PanelCategory, DevPanel[]>();
    for (const cat of CATEGORY_ORDER) {
      const panels = visiblePanels.filter(p => p.category === cat);
      if (panels.length > 0) map.set(cat, panels);
    }
    return map;
  }, [visiblePanels]);

  const [activePanelId, setActivePanelId] = useState<string>(() => {
    if (panelParam && visiblePanels.some(p => p.id === panelParam)) {
      return panelParam;
    }
    return visiblePanels.length > 0 ? visiblePanels[0].id : '';
  });

  // Update URL when panel changes
  useEffect(() => {
    if (activePanelId) {
      setSearchParams({ panel: activePanelId }, { replace: true });
    }
  }, [activePanelId, setSearchParams]);

  // Update active panel when URL changes
  useEffect(() => {
    if (panelParam && visiblePanels.some(p => p.id === panelParam)) {
      setActivePanelId(panelParam);
    }
  }, [panelParam, visiblePanels]);

  const activePanel = visiblePanels.find(p => p.id === activePanelId);
  const ActiveComponent = activePanel?.component;

  return (
    <Page title="Dev Portal">
      {/* Diagnostics banner */}
      <div style={{
        padding: '0.6rem 1rem',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '0.75rem',
        fontSize: '0.78rem',
        color: 'var(--color-text)',
      }}>
        Diagnostics (read-only). Source of truth for user management is{' '}
        <a href="/admin" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Admin Portal</a>.
      </div>
      <div style={{ display: 'flex', gap: '1rem', minHeight: '70vh' }}>
        {/* Left Navigation — grouped by category */}
        <nav
          style={{
            width: '210px',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            paddingRight: '1rem',
          }}
        >
          {Array.from(grouped.entries()).map(([category, panels]) => (
            <div key={category}>
              <div style={category === 'danger' ? dangerCategoryHeader : navCategoryHeader}>
                {CATEGORY_LABELS[category]}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {panels.map(panel => (
                  <li key={panel.id} style={{ marginBottom: '0.15rem' }}>
                    <button
                      onClick={() => setActivePanelId(panel.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.4rem 0.75rem',
                        border: 'none',
                        background:
                          activePanelId === panel.id
                            ? (category === 'danger' ? '#ef4444' : 'var(--color-primary)')
                            : 'transparent',
                        color:
                          activePanelId === panel.id
                            ? 'white'
                            : (category === 'danger' ? '#f87171' : 'var(--color-text)'),
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (activePanelId !== panel.id) {
                          e.currentTarget.style.backgroundColor = 'var(--color-surface)';
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
            </div>
          ))}
          {visiblePanels.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
              No panels available
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
