/**
 * Dev Portal Panel Registry
 * 
 * Register development/debugging panels here.
 * Only loaded in DEV builds.
 */

import type { FC } from 'react';

export interface DevPanel {
  id: string;
  title: string;
  component: FC;
}

// Welcome panel component
const WelcomePanel: FC = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Dev Portal</h2>
      <p>Development and debugging tools will appear in the left navigation.</p>
      <p>This portal is only available in DEV builds.</p>
    </div>
  );
};

/**
 * Registry of all dev panels.
 * Add new panels here as they are created.
 */
export const DEV_PANELS: DevPanel[] = [
  // Example panel (will be replaced with real panels)
  {
    id: 'welcome',
    title: 'Welcome',
    component: WelcomePanel,
  },
];
