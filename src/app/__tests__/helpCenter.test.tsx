import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Help from '../../pages/Help';

const QUICK_START_MD = `# RSA Quick Start Guide

Welcome to **Racing Systems Analysis (RSA)**.

## 1. Create an Account / Sign In

Click **Sign In** on the home page.

## 2. Create Your First Vehicle

Vehicles are the foundation of every Quarter simulation.
`;

const QUARTER_MD = `# Quarter Jr / Quarter Pro — User Manual

The Quarter simulator predicts dragstrip performance.

## 2. Jr vs Pro — What Changes

| Feature | Quarter Jr | Quarter Pro |
|---------|-----------|------------|
| Engine input | Peak HP | Full HP curve |
`;

describe('Help Center', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock fetch to return markdown content and manifest based on URL
    vi.spyOn(globalThis, 'fetch').mockImplementation((input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? '';
      if (url.includes('manifest.json')) {
        const manifest = {
          lastUpdatedIso: '2025-02-23T12:00:00.000Z',
          lastUpdatedDate: '2025-02-23',
          source: 'docs/manuals',
          files: ['SITE_QUICK_START.md', 'QUARTER_JR_PRO.md', 'ENGINE_JR_PRO.md', 'FAQ_TROUBLESHOOTING.md'],
        };
        return Promise.resolve(new Response(JSON.stringify(manifest), { status: 200 }));
      }
      if (url.includes('SITE_QUICK_START.md')) {
        return Promise.resolve(new Response(QUICK_START_MD, { status: 200 }));
      }
      if (url.includes('QUARTER_JR_PRO.md')) {
        return Promise.resolve(new Response(QUARTER_MD, { status: 200 }));
      }
      if (url.includes('ENGINE_JR_PRO.md')) {
        return Promise.resolve(new Response('# Engine Jr / Engine Pro\n\nEngine sim manual.', { status: 200 }));
      }
      if (url.includes('FAQ_TROUBLESHOOTING.md')) {
        return Promise.resolve(new Response('# FAQ & Troubleshooting\n\nCommon questions.', { status: 200 }));
      }
      return Promise.resolve(new Response('Not found', { status: 404 }));
    });
  });

  it('renders the /help route and shows Quick Start by default', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    // Sidebar nav should be visible
    expect(screen.getByTestId('help-nav-quick-start')).toBeInTheDocument();
    expect(screen.getByTestId('help-nav-quarter')).toBeInTheDocument();
    expect(screen.getByTestId('help-nav-engine')).toBeInTheDocument();
    expect(screen.getByTestId('help-nav-faq')).toBeInTheDocument();

    // Quick Start content should load (may appear in both content and TOC)
    await waitFor(() => {
      const headings = screen.getAllByText('RSA Quick Start Guide');
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it('loads Quarter manual when navigating to /help?doc=quarter', async () => {
    render(
      <MemoryRouter initialEntries={['/help?doc=quarter']}>
        <Help />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const headings = screen.getAllByText(/Quarter Jr \/ Quarter Pro/);
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it('loads Engine manual when navigating to /help?doc=engine', async () => {
    render(
      <MemoryRouter initialEntries={['/help?doc=engine']}>
        <Help />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const headings = screen.getAllByText(/Engine Jr \/ Engine Pro/);
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it('loads FAQ when navigating to /help?doc=faq', async () => {
    render(
      <MemoryRouter initialEntries={['/help?doc=faq']}>
        <Help />
      </MemoryRouter>,
    );

    // Wait for content to load - use partial match to avoid ampersand encoding issues
    const heading = await screen.findByText((content, element) => {
      return element?.tagName === 'H1' && content.includes('FAQ') && content.includes('Troubleshooting');
    });
    expect(heading).toBeInTheDocument();
  });

  it('loads Quick Start and shows a known heading', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const headings = screen.getAllByText('RSA Quick Start Guide');
      expect(headings.length).toBeGreaterThan(0);
    });

    // Check for a known section heading (appears in content and TOC)
    expect(screen.getAllByText('1. Create an Account / Sign In').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2. Create Your First Vehicle').length).toBeGreaterThan(0);
  });

  it('switches to Quarter manual when nav is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    // Wait for initial load
    await waitFor(() => {
      const headings = screen.getAllByText('RSA Quick Start Guide');
      expect(headings.length).toBeGreaterThan(0);
    });

    // Click Quarter nav
    fireEvent.click(screen.getByTestId('help-nav-quarter'));

    await waitFor(() => {
      const headings = screen.getAllByText(/Quarter Jr \/ Quarter Pro/);
      expect(headings.length).toBeGreaterThan(0);
    });
  });

  it('renders tables from markdown (GFM support)', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    // Switch to Quarter manual which has a table
    fireEvent.click(screen.getByTestId('help-nav-quarter'));

    await waitFor(() => {
      expect(screen.getByText('Quarter Jr')).toBeInTheDocument();
    });

    // Table should render with th/td elements
    const tables = document.querySelectorAll('table');
    expect(tables.length).toBeGreaterThan(0);
  });

  it('does not expose internal/hidden module links in nav', () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    // Help nav should NOT contain internal modules
    const navButtons = screen.getAllByRole('button');
    const navLabels = navButtons.map((b) => b.textContent?.toLowerCase() ?? '');

    const forbiddenTerms = ['team', 'history', 'race day', 'dial-in', 'admin', 'dev', 'opponents', 'ladder'];
    for (const term of forbiddenTerms) {
      const found = navLabels.some((label) => label.includes(term));
      expect(found, `Help nav should not contain "${term}"`).toBe(false);
    }
  });

  it('generates heading IDs for anchor links', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const headings = screen.getAllByText('RSA Quick Start Guide');
      expect(headings.length).toBeGreaterThan(0);
    });

    // Check that content headings (h1/h2 elements) have id attributes for anchor linking
    const h1Elements = screen.getAllByText('RSA Quick Start Guide');
    const h1 = h1Elements.find(el => el.tagName === 'H1');
    expect(h1?.id).toBe('rsa-quick-start-guide');

    const h2Elements = screen.getAllByText('1. Create an Account / Sign In');
    const h2 = h2Elements.find(el => el.tagName === 'H2');
    expect(h2?.id).toBe('1-create-an-account-sign-in');
  });

  it('renders TOC with links to section anchors', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const headings = screen.getAllByText('RSA Quick Start Guide');
      expect(headings.length).toBeGreaterThan(0);
    });

    // TOC should be present (desktop and/or mobile version)
    const tocHeadings = screen.getAllByText('On this page');
    expect(tocHeadings.length).toBeGreaterThan(0);

    // TOC should contain links to headings
    const tocLinks = document.querySelectorAll('.help-toc a');
    expect(tocLinks.length).toBeGreaterThan(0);

    // Verify links point to correct hash anchors
    const firstLink = tocLinks[0] as HTMLAnchorElement;
    expect(firstLink.href).toContain('#');
    
    // Check that a known heading appears in TOC
    const tocLinkTexts = Array.from(tocLinks).map(link => link.textContent);
    expect(tocLinkTexts).toContain('RSA Quick Start Guide');
    expect(tocLinkTexts).toContain('1. Create an Account / Sign In');
  });

  it('displays last updated date from manifest', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    // Wait for content to load
    await waitFor(() => {
      const headings = screen.getAllByText('RSA Quick Start Guide');
      expect(headings.length).toBeGreaterThan(0);
    });

    // Verify version badge shows the mocked manifest date
    await waitFor(() => {
      expect(screen.getByText(/Last updated: 2025-02-23/)).toBeInTheDocument();
    });
  });

});
