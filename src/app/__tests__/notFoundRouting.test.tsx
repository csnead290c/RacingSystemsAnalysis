import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from '../App';
import { PUBLIC_CORE_ROUTES } from '../../domain/ui/publicSurface';

function hrefPath(href: string): string {
  try {
    return new URL(href).pathname;
  } catch {
    return href;
  }
}

describe('NotFound routing', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders NotFound for unknown routes and only shows public core links for public users', async () => {
    window.history.pushState({}, '', '/this-does-not-exist');

    render(<App />);

    expect(await screen.findByText('Page Not Found')).toBeInTheDocument();

    const coreLinks = screen.getByTestId('rsa-notfound-core-links');
    const links = within(coreLinks).getAllByRole('link');
    const paths = links.map((a) => hrefPath((a as HTMLAnchorElement).href));

    expect(new Set(paths)).toEqual(new Set(PUBLIC_CORE_ROUTES));

    // Ensure we never leak internal routes into NotFound core links
    expect(paths).not.toContain('/history');
    expect(paths).not.toContain('/log');
    expect(paths).not.toContain('/team');
    expect(paths).not.toContain('/admin');
    expect(paths).not.toContain('/dev');

    // Public users should not see the internal links section
    expect(screen.queryByText('Internal links')).toBeNull();
  });
});
