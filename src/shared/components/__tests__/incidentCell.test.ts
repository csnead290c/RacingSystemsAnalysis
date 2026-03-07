import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const cellSrc = readFileSync(resolve(__dirname, '../IncidentCell.tsx'), 'utf-8');
const portalSrc = readFileSync(resolve(__dirname, '../../../pages/ParityPortal.tsx'), 'utf-8');
const reportSrc = readFileSync(resolve(__dirname, '../../../pages/ParityReport.tsx'), 'utf-8');
const parityApiSrc = readFileSync(resolve(__dirname, '../../../services/parityApi.ts'), 'utf-8');

// ── IncidentCell component structure ────────────────────────────────────

describe('IncidentCell — component', () => {
  it('exports a default function component', () => {
    expect(cellSrc).toContain('export default function IncidentCell');
  });

  it('accepts count, canCreate, onClick props', () => {
    expect(cellSrc).toContain('count: number');
    expect(cellSrc).toContain('canCreate: boolean');
    expect(cellSrc).toContain('onClick: () => void');
  });

  it('exports IncidentCellProps interface', () => {
    expect(cellSrc).toContain('export interface IncidentCellProps');
  });
});

describe('IncidentCell — badge rendering (count > 0)', () => {
  it('renders warning icon when count > 0', () => {
    expect(cellSrc).toContain('if (count > 0)');
    expect(cellSrc).toContain('data-testid="incident-icon"');
  });

  it('renders numeric badge with count', () => {
    expect(cellSrc).toContain('data-testid="incident-badge"');
    expect(cellSrc).toContain('{count}');
  });

  it('badge has amber/yellow background', () => {
    expect(cellSrc).toContain("background: '#f59e0b'");
  });

  it('shows count in title attribute', () => {
    expect(cellSrc).toContain('title={`${count} incident(s)`}');
  });
});

describe('IncidentCell — add icon (count == 0, canCreate)', () => {
  it('renders add icon when count is 0 and canCreate', () => {
    expect(cellSrc).toContain('if (canCreate)');
    expect(cellSrc).toContain('data-testid="incident-add-icon"');
  });

  it('has Add incident title', () => {
    expect(cellSrc).toContain('title="Add incident"');
  });
});

describe('IncidentCell — null case (no read, no create)', () => {
  it('returns null when count is 0 and canCreate is false', () => {
    expect(cellSrc).toContain('return null');
  });
});

// ── All 3 tables use the shared IncidentCell ────────────────────────────

describe('ParityPortal — uses shared IncidentCell', () => {
  it('imports IncidentCell', () => {
    expect(portalSrc).toContain("import IncidentCell from '../shared/components/IncidentCell'");
  });

  it('does NOT have inline incident icon JSX (no (r as any).incident_count)', () => {
    expect(portalSrc).not.toContain('(r as any).incident_count');
  });

  it('uses <IncidentCell in EventRunsPanel and DriverDrilldownPanel', () => {
    const matches = portalSrc.match(/<IncidentCell/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it('passes count, canCreate, onClick to IncidentCell', () => {
    expect(portalSrc).toContain('count={r.incident_count ?? 0}');
    expect(portalSrc).toContain('canCreate={canCreateIncidents}');
  });
});

describe('ParityReport — incidents removed from QualTable', () => {
  it('no longer imports IncidentCell', () => {
    expect(reportSrc).not.toContain("import IncidentCell from '../shared/components/IncidentCell'");
  });

  it('no longer uses <IncidentCell in QualTable', () => {
    expect(reportSrc).not.toContain('<IncidentCell');
  });

  it('incidents still used in EventRunsPanel', () => {
    expect(portalSrc).toContain('<IncidentCell');
    expect(portalSrc).toContain('count={r.incident_count ?? 0}');
  });
});

// ── Count update mechanism ──────────────────────────────────────────────

describe('Count update — EventRunsPanel', () => {
  it('has handleIncidentCountChange that updates runs state by r.id', () => {
    expect(portalSrc).toContain('const handleIncidentCountChange = useCallback((runId: number, newCount: number)');
    expect(portalSrc).toContain('r.id === runId ? { ...r, incident_count: newCount }');
  });

  it('passes onCountChange to IncidentDrawer', () => {
    expect(portalSrc).toContain('onCountChange={handleIncidentCountChange}');
  });
});

describe('Count update — DriverDrilldownPanel', () => {
  it('has handleIncidentCountChange that updates runs state by r.id', () => {
    // There are two handleIncidentCountChange in the file (EventRuns + Driver)
    const matches = portalSrc.match(/handleIncidentCountChange = useCallback/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });
});

describe('Count update — QualTable incidents removed', () => {
  it('QualTable no longer has handleIncidentCountChange', () => {
    // Incidents were removed from QualTable in Part 2 cleanup
    expect(reportSrc).not.toContain('handleIncidentCountChange');
  });

  it('uses localRows for display', () => {
    expect(reportSrc).toContain('const displayRows = localRows.length === rows.length ? localRows : rows');
  });
});

// ── Type safety — incident_count on all run types ───────────────────────

describe('Type safety — incident_count field', () => {
  it('RunWithWeather has incident_count', () => {
    // RunWithWeather extends ParityRun which has incident_count
    expect(parityApiSrc).toMatch(/interface ParityRun[\s\S]*?incident_count\?: number/);
  });

  it('DriverRun has incident_count', () => {
    expect(parityApiSrc).toMatch(/interface DriverRun[\s\S]*?incident_count\?: number/);
  });

  it('ParityComboRun has incident_count', () => {
    expect(parityApiSrc).toMatch(/interface ParityComboRun[\s\S]*?incident_count\?: number/);
  });
});

// ── ID field consistency ────────────────────────────────────────────────

describe('ID field consistency', () => {
  it('EventRunsPanel uses r.id for drawer and count update', () => {
    expect(portalSrc).toContain('setDrawerRunId(r.id)');
    expect(portalSrc).toContain('r.id === runId');
  });

  it('QualTable no longer has incident drawer (removed in Part 2)', () => {
    expect(reportSrc).not.toContain('setDrawerRunId(r.runId)');
  });
});
