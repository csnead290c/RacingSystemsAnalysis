import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Hamburger menu UX', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('closes the dropdown when the backdrop is clicked', async () => {
    render(<App />);

    // Find and click a hamburger / more button to open the menu
    const moreBtn = await screen.findByLabelText('More menu');
    fireEvent.click(moreBtn);

    // Dropdown should be visible
    expect(screen.getByTestId('rsa-dropdown-nav')).toBeInTheDocument();

    // Click the backdrop
    const backdrop = screen.getByTestId('rsa-menu-backdrop');
    fireEvent.click(backdrop);

    // Dropdown should be gone
    expect(screen.queryByTestId('rsa-dropdown-nav')).toBeNull();
  });

  it('closes the dropdown when Escape is pressed', async () => {
    render(<App />);

    const moreBtn = await screen.findByLabelText('More menu');
    fireEvent.click(moreBtn);

    expect(screen.getByTestId('rsa-dropdown-nav')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('rsa-dropdown-nav')).toBeNull();
  });

  it('sets aria-expanded on the hamburger button', async () => {
    render(<App />);

    const moreBtn = await screen.findByLabelText('More menu');
    expect(moreBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(moreBtn);
    expect(moreBtn).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(moreBtn);
    expect(moreBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
