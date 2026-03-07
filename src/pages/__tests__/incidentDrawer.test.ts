import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const drawerSrc = readFileSync(resolve(__dirname, '../IncidentDrawer.tsx'), 'utf-8');
const portalSrc = readFileSync(resolve(__dirname, '../ParityPortal.tsx'), 'utf-8');
const reportSrc = readFileSync(resolve(__dirname, '../ParityReport.tsx'), 'utf-8');

describe('IncidentDrawer — structure', () => {
  it('exports default component with required props', () => {
    expect(drawerSrc).toContain('export default function IncidentDrawer');
    expect(drawerSrc).toContain('runId: number');
    expect(drawerSrc).toContain('canCreate: boolean');
    expect(drawerSrc).toContain('onClose: () => void');
    expect(drawerSrc).toContain('onCountChange?: (runId: number, newCount: number) => void');
  });

  it('has overlay and drawer test IDs', () => {
    expect(drawerSrc).toContain('data-testid="incident-drawer-overlay"');
    expect(drawerSrc).toContain('data-testid="incident-drawer"');
  });
});

describe('IncidentDrawer — CRUD form', () => {
  it('gates Add button by canCreate', () => {
    expect(drawerSrc).toContain('{canCreate && (');
    expect(drawerSrc).toContain('data-testid="incident-add-btn"');
  });

  it('has form with required fields', () => {
    expect(drawerSrc).toContain('data-testid="incident-type-select"');
    expect(drawerSrc).toContain('data-testid="incident-summary-input"');
    expect(drawerSrc).toContain('data-testid="incident-save-btn"');
  });

  it('gates edit/delete by can_edit from API', () => {
    expect(drawerSrc).toContain('{inc.can_edit && (');
    expect(drawerSrc).toContain('data-testid="incident-edit-btn"');
    expect(drawerSrc).toContain('data-testid="incident-delete-btn"');
  });

  it('validates required fields client-side', () => {
    expect(drawerSrc).toContain("'Incident type is required'");
    expect(drawerSrc).toContain("'Summary is required'");
  });
});

describe('IncidentDrawer — API calls', () => {
  it('loads types and incidents', () => {
    expect(drawerSrc).toContain('incidentsApi.listIncidentTypes()');
    expect(drawerSrc).toContain('incidentsApi.listRunIncidents(runId)');
  });

  it('calls CRUD endpoints', () => {
    expect(drawerSrc).toContain('incidentsApi.createRunIncident(');
    expect(drawerSrc).toContain('incidentsApi.updateRunIncident(');
    expect(drawerSrc).toContain('incidentsApi.deleteRunIncident(');
  });

  it('notifies parent of count change', () => {
    expect(drawerSrc).toContain('onCountChange?.(runId, newRes.incidents.length)');
  });
});

// ── Links UI in IncidentDrawer ─────────────────────────────────────────

describe('IncidentDrawer — links section', () => {
  it('imports IncidentLink types and ALLOWED_LINK_TYPES', () => {
    expect(drawerSrc).toContain("type IncidentLink");
    expect(drawerSrc).toContain("type IncidentLinkType");
    expect(drawerSrc).toContain("ALLOWED_LINK_TYPES");
  });

  it('has a links toggle button per incident card', () => {
    expect(drawerSrc).toContain('data-testid="incident-links-toggle"');
    expect(drawerSrc).toContain('toggleLinks(inc.id)');
  });

  it('renders links section when expanded', () => {
    expect(drawerSrc).toContain('data-testid="incident-links-section"');
    expect(drawerSrc).toContain('data-testid="incident-link-item"');
  });

  it('renders external_url links as clickable anchors', () => {
    expect(drawerSrc).toContain('data-testid="incident-link-url"');
    expect(drawerSrc).toContain('target="_blank"');
    expect(drawerSrc).toContain('rel="noopener noreferrer"');
  });

  it('renders IDR viewer button for idr_session and idr_file', () => {
    expect(drawerSrc).toContain('data-testid="incident-link-idr-btn"');
    expect(drawerSrc).toContain('Open IDR Viewer');
    expect(drawerSrc).toContain('handleOpenIDR');
  });

  it('navigates to /parity/idr for IDR links', () => {
    expect(drawerSrc).toContain("navigate(`/parity/idr?${params.toString()}`)");
    expect(drawerSrc).not.toContain('IDR Viewer placeholder');
  });

  it('renders delete button for links with can_delete', () => {
    expect(drawerSrc).toContain('data-testid="incident-link-delete-btn"');
    expect(drawerSrc).toContain('lnk.can_delete');
  });

  it('has an Add Link button gated by can_edit', () => {
    expect(drawerSrc).toContain('data-testid="incident-link-add-btn"');
    expect(drawerSrc).toContain('inc.can_edit && addLinkForId !== inc.id');
  });

  it('renders link add form with type select, ref input, and meta textarea', () => {
    expect(drawerSrc).toContain('data-testid="incident-link-form"');
    expect(drawerSrc).toContain('data-testid="incident-link-type-select"');
    expect(drawerSrc).toContain('data-testid="incident-link-ref-input"');
    expect(drawerSrc).toContain('data-testid="incident-link-meta-input"');
    expect(drawerSrc).toContain('data-testid="incident-link-save-btn"');
  });

  it('validates ref is required', () => {
    expect(drawerSrc).toContain("'Reference is required'");
  });

  it('calls API methods for link CRUD', () => {
    expect(drawerSrc).toContain('incidentsApi.listIncidentLinks(');
    expect(drawerSrc).toContain('incidentsApi.createIncidentLink(');
    expect(drawerSrc).toContain('incidentsApi.deleteIncidentLink(');
  });
});

describe('Run tables — incident integration', () => {
  it('EventRunsPanel checks incident capabilities and renders drawer', () => {
    expect(portalSrc).toContain("canCap('incidents.read'");
    expect(portalSrc).toContain("canCap('incidents.create'");
    expect(portalSrc).toContain('<IncidentCell');
    expect(portalSrc).toContain('<IncidentDrawer');
  });

  it('DriverDrilldownPanel has incident drawer', () => {
    const dd = portalSrc.slice(portalSrc.indexOf('function DriverDrilldownPanel'));
    expect(dd).toContain('drawerRunId');
    expect(dd).toContain('<IncidentDrawer');
  });

  it('ParityReport QualTable no longer has incidents (removed in Part 2)', () => {
    expect(reportSrc).not.toContain("import IncidentDrawer from './IncidentDrawer'");
    expect(reportSrc).not.toContain('<IncidentCell');
    expect(reportSrc).not.toContain('<IncidentDrawer');
  });
});
