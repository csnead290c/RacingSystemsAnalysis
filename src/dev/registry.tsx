/**
 * Dev Portal Panel Registry
 *
 * Register development/debugging panels here.
 *
 * Panel Categories (display order):
 *   identity  — Identity & Access
 *   sim       — Simulation & Testing
 *   data      — Data & Tools
 *   danger    — Danger Zone (destructive actions, typed confirmation required)
 *
 * Visibility:
 *   devOnly   — import.meta.env.DEV only (hidden in production)
 *   devTools  — DEV or user has admin.devTools capability
 *   ownerOnly — DEV or user role is owner
 *
 * Risk Level:
 *   safe        — read-only or low-risk writes
 *   destructive — wipes data, resets state, etc.
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
import UserManagement from './panels/UserManagement';
import TrackEditor from './panels/TrackEditor';
import PlansCapabilities from './panels/PlansCapabilities';
import ViewAs from './panels/ViewAs';
import DangerZone from './panels/DangerZone';
import AccessSmokeTest from './panels/AccessSmokeTest';
import AuditSnapshot from './panels/AuditSnapshot';

// ── Types ─────────────────────────────────────────────────────────────

export type PanelCategory = 'identity' | 'sim' | 'data' | 'danger';
export type PanelVisibility = 'devOnly' | 'devTools' | 'ownerOnly';
export type PanelRisk = 'safe' | 'destructive';

export interface DevPanel {
  id: string;
  title: string;
  component: FC;
  category: PanelCategory;
  visibility: PanelVisibility;
  riskLevel: PanelRisk;
}

/** Display labels for nav category headers. */
export const CATEGORY_LABELS: Record<PanelCategory, string> = {
  identity: 'Identity & Access',
  sim: 'Simulation & Testing',
  data: 'Data & Tools',
  danger: 'Danger Zone',
};

/** Ordered list of categories for nav rendering. */
export const CATEGORY_ORDER: PanelCategory[] = ['identity', 'sim', 'data', 'danger'];

// ── Registry ──────────────────────────────────────────────────────────

export const DEV_PANELS: DevPanel[] = [
  // === IDENTITY & ACCESS ===
  {
    id: 'view-as',
    title: '👁️ View As',
    component: ViewAs,
    category: 'identity',
    visibility: 'devTools',
    riskLevel: 'safe',
  },
  {
    id: 'plans',
    title: '🔑 Plans & Capabilities',
    component: PlansCapabilities,
    category: 'identity',
    visibility: 'devTools',
    riskLevel: 'safe',
  },
  {
    id: 'access-smoke',
    title: '🔍 Access Smoke Test',
    component: AccessSmokeTest,
    category: 'identity',
    visibility: 'devTools',
    riskLevel: 'safe',
  },
  {
    id: 'audit-snapshot',
    title: '📋 Audit Snapshot',
    component: AuditSnapshot,
    category: 'identity',
    visibility: 'devTools',
    riskLevel: 'safe',
  },
  {
    id: 'users',
    title: '👥 User Management',
    component: UserManagement,
    category: 'identity',
    visibility: 'ownerOnly',
    riskLevel: 'safe',
  },

  // === SIMULATION & TESTING ===
  {
    id: 'run-inspector',
    title: '▶️ Run Inspector',
    component: RunInspector,
    category: 'sim',
    visibility: 'devOnly',
    riskLevel: 'safe',
  },
  {
    id: 'energy',
    title: '⚡ Energy Accounting',
    component: EnergyPanel,
    category: 'sim',
    visibility: 'devOnly',
    riskLevel: 'safe',
  },
  {
    id: 'health-check',
    title: '🩺 Health Check',
    component: HealthCheck,
    category: 'sim',
    visibility: 'devOnly',
    riskLevel: 'safe',
  },
  {
    id: 'parity',
    title: '🧪 Parity Runner',
    component: ParityRunner,
    category: 'sim',
    visibility: 'devOnly',
    riskLevel: 'safe',
  },

  // === DATA & TOOLS ===
  {
    id: 'input-inspector',
    title: '🔍 Input Inspector',
    component: InputInspector,
    category: 'data',
    visibility: 'devOnly',
    riskLevel: 'safe',
  },
  {
    id: 'quick-paste',
    title: '📋 Quick Paste',
    component: QuickPaste,
    category: 'data',
    visibility: 'devOnly',
    riskLevel: 'safe',
  },
  {
    id: 'air',
    title: '🌡️ Air Model',
    component: AirInspector,
    category: 'data',
    visibility: 'devOnly',
    riskLevel: 'safe',
  },
  {
    id: 'tracks',
    title: '🏁 Track Editor',
    component: TrackEditor,
    category: 'data',
    visibility: 'devTools',
    riskLevel: 'safe',
  },
  {
    id: 'settings',
    title: '⚙️ Settings & Flags',
    component: SettingsPanel,
    category: 'data',
    visibility: 'devOnly',
    riskLevel: 'safe',
  },

  // === DANGER ZONE ===
  {
    id: 'danger-zone',
    title: '⚠️ Danger Zone',
    component: DangerZone,
    category: 'danger',
    visibility: 'ownerOnly',
    riskLevel: 'destructive',
  },
];

// ── Visibility filter ─────────────────────────────────────────────────

/**
 * Returns the subset of DEV_PANELS visible to the current user.
 *
 * @param hasDevTools — true if user has admin.devTools capability
 * @param isOwner    — true if user role is owner
 */
export function getVisiblePanels(hasDevTools: boolean, isOwner: boolean): DevPanel[] {
  const isDev = import.meta.env.DEV;
  return DEV_PANELS.filter(panel => {
    switch (panel.visibility) {
      case 'devOnly':
        return isDev;
      case 'devTools':
        return isDev || hasDevTools;
      case 'ownerOnly':
        return isDev || isOwner;
      default:
        return false;
    }
  });
}
