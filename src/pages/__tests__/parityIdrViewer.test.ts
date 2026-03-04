import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const viewerSrc = readFileSync(resolve(__dirname, '../ParityIdrViewer.tsx'), 'utf-8');
const drawerSrc = readFileSync(resolve(__dirname, '../IncidentDrawer.tsx'), 'utf-8');
const appSrc = readFileSync(resolve(__dirname, '../../app/App.tsx'), 'utf-8');

// ── IDR Viewer Page ─────────────────────────────────────────────────────

describe('ParityIdrViewer — page structure', () => {
  it('exports a default component', () => {
    expect(viewerSrc).toContain('export default function ParityIdrViewer');
  });

  it('reads type, ref, incidentId from search params', () => {
    expect(viewerSrc).toContain("params.get('type')");
    expect(viewerSrc).toContain("params.get('ref')");
    expect(viewerSrc).toContain("params.get('incidentId')");
  });

  it('uses useSearchParams from react-router-dom', () => {
    expect(viewerSrc).toContain("import { useSearchParams, Link } from 'react-router-dom'");
  });

  it('renders error when params are missing', () => {
    expect(viewerSrc).toContain('data-testid="idr-error"');
    expect(viewerSrc).toContain('Missing required query parameters');
  });

  it('renders viewer page with data-testid', () => {
    expect(viewerSrc).toContain('data-testid="idr-viewer-page"');
  });

  it('renders type badge and ref value', () => {
    expect(viewerSrc).toContain('data-testid="idr-type-badge"');
    expect(viewerSrc).toContain('data-testid="idr-ref-value"');
  });

  it('renders details card', () => {
    expect(viewerSrc).toContain('data-testid="idr-details-card"');
  });
});

describe('ParityIdrViewer — back link', () => {
  it('has a back link to /parity', () => {
    expect(viewerSrc).toContain('data-testid="idr-back-link"');
    expect(viewerSrc).toContain('to="/parity"');
    expect(viewerSrc).toContain('Back to Parity Dashboard');
  });
});

describe('ParityIdrViewer — idr_file download', () => {
  it('renders download link for idr_file refs that look like URLs', () => {
    expect(viewerSrc).toContain('data-testid="idr-download-link"');
    expect(viewerSrc).toContain("type === 'idr_file' && isUrl(ref)");
    expect(viewerSrc).toContain('Download / Open File');
  });

  it('has a URL detection helper', () => {
    expect(viewerSrc).toContain('function isUrl(s: string): boolean');
    expect(viewerSrc).toContain('https?:\\/\\/');
  });
});

describe('ParityIdrViewer — data placeholder', () => {
  it('renders a placeholder for future IDR data viewer', () => {
    expect(viewerSrc).toContain('data-testid="idr-data-placeholder"');
    expect(viewerSrc).toContain('Load IDR Data');
  });

  it('shows different messages for session vs file', () => {
    expect(viewerSrc).toContain("type === 'idr_session'");
    expect(viewerSrc).toContain('Session data viewer');
    expect(viewerSrc).toContain('File viewer');
  });
});

describe('ParityIdrViewer — type labels', () => {
  it('has labels for idr_session and idr_file', () => {
    expect(viewerSrc).toContain("idr_session: { label: 'IDR Session'");
    expect(viewerSrc).toContain("idr_file: { label: 'IDR File'");
  });
});

// ── IncidentDrawer → IDR navigation ─────────────────────────────────────

describe('IncidentDrawer — IDR navigation', () => {
  it('imports useNavigate', () => {
    expect(drawerSrc).toContain("import { useNavigate } from 'react-router-dom'");
  });

  it('calls useNavigate()', () => {
    expect(drawerSrc).toContain('const navigate = useNavigate()');
  });

  it('handleOpenIDR builds URL with type, ref, and optional incidentId', () => {
    expect(drawerSrc).toContain("new URLSearchParams({ type: linkTypeVal, ref })");
    expect(drawerSrc).toContain("params.set('incidentId', String(incidentId))");
    expect(drawerSrc).toContain("navigate(`/parity/idr?${params.toString()}`)");
  });

  it('passes inc.id to handleOpenIDR from the JSX', () => {
    expect(drawerSrc).toContain('handleOpenIDR(lnk.ref, lnk.link_type, inc.id)');
  });

  it('no longer uses alert() for IDR', () => {
    expect(drawerSrc).not.toContain('IDR Viewer placeholder');
    expect(drawerSrc).not.toContain("alert(`IDR Viewer");
  });
});

// ── Route in App.tsx ─────────────────────────────────────────────────────

describe('App.tsx — /parity/idr route', () => {
  it('lazy-imports ParityIdrViewer', () => {
    expect(appSrc).toContain("const ParityIdrViewer = lazy(() => import('../pages/ParityIdrViewer'))");
  });

  it('registers /parity/idr route before /parity', () => {
    const idrIdx = appSrc.indexOf('path="/parity/idr"');
    const parityIdx = appSrc.indexOf('path="/parity"', idrIdx + 1);
    expect(idrIdx).toBeGreaterThan(-1);
    expect(parityIdx).toBeGreaterThan(idrIdx);
  });

  it('wraps ParityIdrViewer in ProtectedRoute + InternalRoute', () => {
    const idrIdx = appSrc.indexOf('path="/parity/idr"');
    const routeBlock = appSrc.slice(idrIdx, idrIdx + 300);
    expect(routeBlock).toContain('<ProtectedRoute>');
    expect(routeBlock).toContain('<InternalRoute>');
    expect(routeBlock).toContain('<ParityIdrViewer />');
  });
});
