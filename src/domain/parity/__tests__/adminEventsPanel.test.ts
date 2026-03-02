/**
 * Smoke tests for Admin Events Panel wiring and bulk import integration.
 * Reads ParityPortal.tsx source as text to verify structural requirements
 * without needing a full DOM render.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalSrc = fs.readFileSync(
  path.resolve(__dirname, '../../../pages/ParityPortal.tsx'),
  'utf-8',
);
const eventImportSrc = fs.readFileSync(
  path.resolve(__dirname, '../eventImport.ts'),
  'utf-8',
);
const parityApiSrc = fs.readFileSync(
  path.resolve(__dirname, '../../../services/parityApi.ts'),
  'utf-8',
);

describe('AdminEventsPanel wiring', () => {
  it('is wired as a tab in ADMIN_TABS', () => {
    expect(portalSrc).toContain("key: 'adminEvents'");
  });

  it('renders AdminEventsPanel for adminEvents tab', () => {
    expect(portalSrc).toContain("tab === 'adminEvents' && <AdminEventsPanel");
  });

  it('has data-testid="admin-events-panel"', () => {
    expect(portalSrc).toContain('data-testid="admin-events-panel"');
  });

  it('has data-testid="bulk-import-section"', () => {
    expect(portalSrc).toContain('data-testid="bulk-import-section"');
  });

  it('imports parseBulkCsv and normalizeTrackName from eventImport', () => {
    expect(portalSrc).toContain("import { parseBulkCsv, normalizeTrackName }");
  });

  it('calls parityApi.bulkCreateEvents in submit handler', () => {
    expect(portalSrc).toContain('parityApi.bulkCreateEvents');
  });

  it('has search filter input', () => {
    expect(portalSrc).toContain('placeholder="Search name/track..."');
  });

  it('has track filter dropdown', () => {
    expect(portalSrc).toContain('All tracks');
  });

  it('has year filter dropdown', () => {
    expect(portalSrc).toContain('setYearFilter(Number(e.target.value))');
  });

  it('shows filtered event count', () => {
    expect(portalSrc).toContain('filteredEvents.length');
  });
});

describe('eventImport module exports', () => {
  it('exports buildRaceLookup', () => {
    expect(eventImportSrc).toContain('export function buildRaceLookup');
  });

  it('exports normalizeTrackName', () => {
    expect(eventImportSrc).toContain('export function normalizeTrackName');
  });

  it('exports parseDateRange', () => {
    expect(eventImportSrc).toContain('export function parseDateRange');
  });

  it('exports resolveTrack', () => {
    expect(eventImportSrc).toContain('export function resolveTrack');
  });

  it('exports parseBulkCsv', () => {
    expect(eventImportSrc).toContain('export function parseBulkCsv');
  });

  it('exports BulkEventRow type', () => {
    expect(eventImportSrc).toContain('export interface BulkEventRow');
  });
});

describe('parityApi bulk create events', () => {
  it('exports BulkCreateEventRow type', () => {
    expect(parityApiSrc).toContain('export interface BulkCreateEventRow');
  });

  it('exports BulkCreateEventsResponse type', () => {
    expect(parityApiSrc).toContain('export interface BulkCreateEventsResponse');
  });

  it('has bulkCreateEvents method', () => {
    expect(parityApiSrc).toContain('async bulkCreateEvents');
  });

  it('calls bulkCreateEvents action endpoint', () => {
    expect(parityApiSrc).toContain("action=bulkCreateEvents");
  });

  it('invalidates events cache after bulk create', () => {
    // Find the bulkCreateEvents method and verify it calls invalidateParityCache
    const methodStart = parityApiSrc.indexOf('async bulkCreateEvents');
    const methodEnd = parityApiSrc.indexOf('},', methodStart);
    const methodBody = parityApiSrc.slice(methodStart, methodEnd);
    expect(methodBody).toContain("invalidateParityCache('events')");
  });
});
