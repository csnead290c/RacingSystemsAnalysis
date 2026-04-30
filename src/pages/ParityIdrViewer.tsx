/**
 * ParityIdrViewer — minimal IDR viewer page.
 *
 * Reached via /parity/idr?type=idr_session|idr_file&ref=<string>&incidentId=<optional>
 * Renders the IDR reference information and provides a placeholder for future
 * data loading. For idr_file refs that look like URLs, offers a download link.
 */

import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

// ── Styles ──────────────────────────────────────────────────────────────

const S = {
  page: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: 'inherit',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
  } as React.CSSProperties,
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
  },
  backLink: {
    color: 'var(--color-primary, #3b82f6)',
    textDecoration: 'none',
    fontSize: '0.85rem',
  },
  card: {
    background: 'var(--color-surface, #1e1e2e)',
    border: '1px solid var(--color-border, #333)',
    borderRadius: 8,
    padding: '1.25rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--color-muted, #888)',
    marginBottom: '0.15rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  value: {
    fontSize: '0.95rem',
    fontFamily: 'monospace',
    wordBreak: 'break-all' as const,
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '0.15rem 0.45rem',
    borderRadius: 4,
    fontSize: '0.7rem',
    fontWeight: 600,
    background: color,
    color: '#fff',
  }),
  placeholder: {
    background: 'var(--color-bg, #262636)',
    border: '2px dashed var(--color-border, #444)',
    borderRadius: 8,
    padding: '2rem',
    textAlign: 'center' as const,
    color: 'var(--color-muted, #888)',
    fontSize: '0.85rem',
  } as React.CSSProperties,
  downloadBtn: {
    display: 'inline-block',
    padding: '0.45rem 0.9rem',
    borderRadius: 4,
    background: 'var(--color-primary, #3b82f6)',
    color: '#fff',
    textDecoration: 'none',
    fontSize: '0.8rem',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  error: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: 6,
    padding: '1rem',
    fontSize: '0.85rem',
  },
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  idr_session: { label: 'IDR Session', color: '#0891b2' },
  idr_file: { label: 'IDR File', color: '#7c3aed' },
};

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

// ── Component ───────────────────────────────────────────────────────────

export default function ParityIdrViewer() {
  const [params] = useSearchParams();
  const type = params.get('type') || '';
  const ref = params.get('ref') || '';
  const incidentId = params.get('incidentId') || '';

  const typeInfo = TYPE_LABELS[type];

  if (!type || !ref) {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <span style={S.title}>IDR Viewer</span>
          <Link to="/parity" style={S.backLink} data-testid="idr-back-link">← Back to Parity Dashboard</Link>
        </div>
        <div style={S.error} data-testid="idr-error">
          Missing required query parameters. Expected <code>?type=idr_session|idr_file&ref=...</code>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page} data-testid="idr-viewer-page">
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>IDR Viewer</div>
          {incidentId && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted, #888)', marginTop: '0.15rem' }}>
              Incident #{incidentId}
            </div>
          )}
        </div>
        <Link to="/parity" style={S.backLink} data-testid="idr-back-link">← Back to Parity Dashboard</Link>
      </div>

      {/* Reference details card */}
      <div style={S.card} data-testid="idr-details-card">
        <div style={S.label}>Link Type</div>
        <div style={{ ...S.value, marginBottom: '0.5rem' }}>
          <span style={S.badge(typeInfo?.color || '#6b7280')} data-testid="idr-type-badge">
            {typeInfo?.label || type}
          </span>
        </div>

        <div style={S.label}>Reference</div>
        <div style={S.value} data-testid="idr-ref-value">{ref}</div>

        {incidentId && (
          <>
            <div style={S.label}>Linked Incident</div>
            <div style={S.value}>#{incidentId}</div>
          </>
        )}

        {/* If idr_file ref looks like a URL, offer download */}
        {type === 'idr_file' && isUrl(ref) && (
          <div>
            <a
              href={ref}
              target="_blank"
              rel="noopener noreferrer"
              style={S.downloadBtn}
              data-testid="idr-download-link"
            >
              Download / Open File ↗
            </a>
          </div>
        )}
      </div>

      {/* IDR data viewer — coming soon */}
      <div style={S.placeholder} data-testid="idr-data-placeholder">
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📊</div>
        <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>IDR Data Viewer — Coming Soon</div>
        <div>
          {type === 'idr_session'
            ? 'Inline session data viewing is not yet available. The session identifier above can be used to query IDR data when the viewer is ready.'
            : 'Inline file viewing is not yet available. Use the download link above to access the raw file.'}
        </div>
      </div>
    </div>
  );
}
