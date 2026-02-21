import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Landing page (logged-out)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('does not show testimonials section', async () => {
    render(<App />);

    // Wait for the landing page to render
    await screen.findByText('Turn On More Win Lights');

    // Testimonials section was removed — verify no testimonial content
    expect(screen.queryByText(/deadly consistent and turning on more win lights/i)).toBeNull();
    expect(screen.queryByText(/Bracket Racer, Super Pro Class/i)).toBeNull();
  });

  it('does not promote internal-only features', async () => {
    render(<App />);

    await screen.findByText('Turn On More Win Lights');

    // Internal features should not appear in the features grid
    expect(screen.queryByText('Run Logbook')).toBeNull();
    expect(screen.queryByText('AI Opponent Prediction')).toBeNull();
    expect(screen.queryByText('Race Day Dashboard')).toBeNull();
  });

  it('promotes public features', async () => {
    render(<App />);

    await screen.findByText('Turn On More Win Lights');

    // Public features should be present
    expect(screen.getByText('ET Prediction')).toBeInTheDocument();
    expect(screen.getByText('Engine Simulation')).toBeInTheDocument();
    expect(screen.getByText('Vehicle Garage')).toBeInTheDocument();
    expect(screen.getByText('Racing Calculators')).toBeInTheDocument();
  });
});
