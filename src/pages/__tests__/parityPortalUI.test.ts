import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Smoke tests for Parity Portal UI/UX improvements:
 * - Responsive navigation (mobile dropdown + desktop tabs)
 * - Runs+Weather column toggle and card view
 * - Consistent form styling via CSS classes
 * - Accessibility attributes
 */

const portalSource = readFileSync(
  resolve(__dirname, '../ParityPortal.tsx'),
  'utf-8',
);

const cssSource = readFileSync(
  resolve(__dirname, '../ParityPortal.css'),
  'utf-8',
);

describe('Parity Portal — Responsive Navigation', () => {
  it('renders mobile dropdown nav with aria-label', () => {
    expect(portalSource).toContain('parity-nav-mobile');
    expect(portalSource).toContain('aria-label="Navigate tabs"');
  });

  it('renders desktop tab bar with role="tablist"', () => {
    expect(portalSource).toContain('role="tablist"');
    expect(portalSource).toContain('role="tab"');
    expect(portalSource).toContain('aria-selected');
  });

  it('CSS hides desktop tabs on mobile and shows dropdown', () => {
    expect(cssSource).toContain('.parity-tabs');
    expect(cssSource).toContain('.parity-nav-mobile');
    // Mobile breakpoint should hide tabs
    expect(cssSource).toMatch(/max-width:\s*768px[\s\S]*?\.parity-tabs\s*\{[\s\S]*?display:\s*none/);
  });
});

describe('Parity Portal — Runs+Weather Table', () => {
  it('defines RWColumn type for column toggling', () => {
    expect(portalSource).toContain("type RWColumn =");
  });

  it('defines column metadata array RW_ALL_COLUMNS', () => {
    expect(portalSource).toContain('RW_ALL_COLUMNS');
    // Should have driver, class, et, mph, hpc, corrEt columns at minimum
    expect(portalSource).toContain("key: 'driver'");
    expect(portalSource).toContain("key: 'et'");
    expect(portalSource).toContain("key: 'hpc'");
    expect(portalSource).toContain("key: 'corrEt'");
  });

  it('supports table and card view modes', () => {
    expect(portalSource).toContain("type RWViewMode = 'table' | 'card'");
    expect(portalSource).toContain('parity-view-toggle');
    expect(portalSource).toContain('parity-run-card');
  });

  it('renders column toggle panel', () => {
    expect(portalSource).toContain('parity-col-toggle');
    expect(portalSource).toContain('parity-col-chip');
    expect(portalSource).toContain('aria-pressed');
  });

  it('supports pagination for large result sets', () => {
    expect(portalSource).toContain('PAGE_SIZE');
    expect(portalSource).toContain('pagedRuns');
    expect(portalSource).toContain('totalPages');
  });
});

describe('Parity Portal — Form Consistency', () => {
  it('uses parity-form-row class for responsive form layouts', () => {
    const matches = portalSource.match(/parity-form-row/g);
    // Should be used in multiple panels (RunsWeather, Trends, ClassAliases, DriverCombos, EngineCombos)
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(5);
  });

  it('uses parity-form-field class for labeled inputs', () => {
    const matches = portalSource.match(/parity-form-field/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Parity Portal — CSS Foundation', () => {
  it('defines responsive breakpoints', () => {
    expect(cssSource).toContain('@media (max-width: 768px)');
    expect(cssSource).toContain('@media (max-width: 480px)');
    expect(cssSource).toContain('@media (max-width: 1024px)');
  });

  it('includes focus-visible styles for accessibility', () => {
    expect(cssSource).toContain('focus-visible');
  });

  it('respects prefers-reduced-motion', () => {
    expect(cssSource).toContain('prefers-reduced-motion');
  });

  it('supports forced-colors (high contrast) mode', () => {
    expect(cssSource).toContain('forced-colors: active');
  });

  it('defines screen-reader utility class', () => {
    expect(cssSource).toContain('.parity-sr-only');
  });

  it('mobile breakpoint stacks form rows vertically', () => {
    expect(cssSource).toMatch(/max-width:\s*768px[\s\S]*?\.parity-form-row\s*\{[\s\S]*?flex-direction:\s*column/);
  });

  it('defines card view styles', () => {
    expect(cssSource).toContain('.parity-run-card');
    expect(cssSource).toContain('.parity-run-card-grid');
    expect(cssSource).toContain('.parity-run-card-header');
  });

  it('defines column toggle chip styles with active state', () => {
    expect(cssSource).toContain('.parity-col-chip');
    expect(cssSource).toContain('.parity-col-chip.active');
  });

  it('defines view toggle button group', () => {
    expect(cssSource).toContain('.parity-view-toggle');
    expect(cssSource).toContain('.parity-view-toggle button.active');
  });
});
