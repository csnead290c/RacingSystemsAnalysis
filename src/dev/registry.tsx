/**
 * Dev Portal Panel Registry
 * 
 * Register development/debugging panels here.
 * Only loaded in DEV builds.
 */

import type { FC } from 'react';
import FlagsPanel from './panels/FlagsPanel';
import InputInspector from './panels/InputInspector';
import RunInspector from './panels/RunInspector';
import EnergyPanel from './panels/EnergyPanel';

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
  {
    id: 'flags',
    title: 'Feature Flags & Modes',
    component: FlagsPanel,
  },
  {
    id: 'input-inspector',
    title: 'Input Inspector (VB6)',
    component: InputInspector,
  },
  {
    id: 'run-inspector',
    title: 'Run Inspector & Steps',
    component: RunInspector,
  },
  {
    id: 'energy',
    title: 'Energy Accounting',
    component: EnergyPanel,
  },
  {
    id: 'welcome',
    title: 'Welcome',
    component: WelcomePanel,
  },
];
