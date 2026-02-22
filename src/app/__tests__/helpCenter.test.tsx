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
    // Mock fetch to return markdown content based on URL
    vi.spyOn(globalThis, 'fetch').mockImplementation((input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? '';
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

    // Quick Start content should load
    await waitFor(() => {
      expect(screen.getByText('RSA Quick Start Guide')).toBeInTheDocument();
    });
  });

  it('loads Quick Start and shows a known heading', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('RSA Quick Start Guide')).toBeInTheDocument();
    });

    // Check for a known section heading
    expect(screen.getByText('1. Create an Account / Sign In')).toBeInTheDocument();
    expect(screen.getByText('2. Create Your First Vehicle')).toBeInTheDocument();
  });

  it('switches to Quarter manual when nav is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/help']}>
        <Help />
      </MemoryRouter>,
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('RSA Quick Start Guide')).toBeInTheDocument();
    });

    // Click Quarter nav
    fireEvent.click(screen.getByTestId('help-nav-quarter'));

    await waitFor(() => {
      expect(screen.getByText(/Quarter Jr \/ Quarter Pro/)).toBeInTheDocument();
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
      expect(screen.getByText('RSA Quick Start Guide')).toBeInTheDocument();
    });

    // Check that headings have id attributes for anchor linking
    const h1 = screen.getByText('RSA Quick Start Guide');
    expect(h1.id).toBe('rsa-quick-start-guide');

    const h2 = screen.getByText('1. Create an Account / Sign In');
    expect(h2.id).toBe('1-create-an-account-sign-in');
  });
});
