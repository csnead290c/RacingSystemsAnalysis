/**
 * Dev Portal Panel Registry
 * 
 * Register development/debugging panels here.
 * Only loaded in DEV builds.
 * 
 * Panel Categories:
 * - Core: Settings, Health Check
 * - Simulation: Run Inspector, Energy Accounting
 * - Data: Input Inspector, Quick Paste, Air Model
 * - Testing: Parity Runner
 */

import type { FC } from 'react';
import SettingsPanel from './panels/SettingsPanel';
import HealthCheck from './panels/HealthCheck';
import RunInspector from './panels/RunInspector';
import EnergyPanel from './panels/EnergyPanel';
import InputInspector from './panels/InputInspector';
import QuickPaste from './panels/QuickPaste';
import AirInspector from './panels/AirInspector';
import ParityRunner from './panels/ParityRunner';

export interface DevPanel {
  id: string;
  title: string;
  component: FC;
  category?: 'core' | 'simulation' | 'data' | 'testing';
}

/**
 * Registry of all dev panels.
 * Organized by category for better navigation.
 */
export const DEV_PANELS: DevPanel[] = [
  // === CORE ===
  {
    id: 'settings',
    title: '⚙️ Settings & Flags',
    component: SettingsPanel,
    category: 'core',
  },
  {
    id: 'health-check',
    title: '🩺 Health Check',
    component: HealthCheck,
    category: 'core',
  },
  
  // === SIMULATION ===
  {
    id: 'run-inspector',
    title: '▶️ Run Inspector',
    component: RunInspector,
    category: 'simulation',
  },
  {
    id: 'energy',
    title: '⚡ Energy Accounting',
    component: EnergyPanel,
    category: 'simulation',
  },
  
  // === DATA ===
  {
    id: 'input-inspector',
    title: '🔍 Input Inspector',
    component: InputInspector,
    category: 'data',
  },
  {
    id: 'quick-paste',
    title: '📋 Quick Paste',
    component: QuickPaste,
    category: 'data',
  },
  {
    id: 'air',
    title: '🌡️ Air Model',
    component: AirInspector,
    category: 'data',
  },
  
  // === TESTING ===
  {
    id: 'parity',
    title: '🧪 Parity Runner',
    component: ParityRunner,
    category: 'testing',
  },
];
