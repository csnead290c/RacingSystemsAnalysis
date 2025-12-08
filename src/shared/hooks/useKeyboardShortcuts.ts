/**
 * Keyboard Shortcuts Hook
 * 
 * Provides keyboard shortcuts for power users.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook to register a single keyboard shortcut
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const ctrlMatch = options.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = options.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = options.alt ? event.altKey : !event.altKey;

      if (event.key.toLowerCase() === key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, options.ctrl, options.shift, options.alt]);
}

/**
 * Hook to register multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (event.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

/**
 * Hook for global navigation shortcuts
 */
export function useNavigationShortcuts() {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    { key: 'h', action: () => navigate('/'), description: 'Go to Home' },
    { key: 's', action: () => navigate('/predict'), description: 'Go to Simulator' },
    { key: 'l', action: () => navigate('/log'), description: 'Go to Log' },
    { key: 'd', action: () => navigate('/dial-in'), description: 'Go to Dial-In' },
    { key: 'v', action: () => navigate('/vehicles'), description: 'Go to Vehicles' },
    { key: 'c', action: () => navigate('/calculators'), description: 'Go to Calculators' },
    { key: 'r', action: () => navigate('/race-day'), description: 'Go to Race Day' },
    { key: '?', shift: true, action: () => showShortcutsHelp(), description: 'Show shortcuts help' },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

/**
 * Show keyboard shortcuts help modal
 */
function showShortcutsHelp() {
  const shortcuts = [
    { key: 'H', description: 'Go to Home' },
    { key: 'S', description: 'Go to Simulator' },
    { key: 'L', description: 'Go to Log' },
    { key: 'D', description: 'Go to Dial-In' },
    { key: 'V', description: 'Go to Vehicles' },
    { key: 'C', description: 'Go to Calculators' },
    { key: 'R', description: 'Go to Race Day' },
    { key: '?', description: 'Show this help' },
  ];

  const message = shortcuts
    .map(s => `${s.key.padEnd(4)} - ${s.description}`)
    .join('\n');

  alert(`Keyboard Shortcuts:\n\n${message}`);
}

/**
 * Format shortcut key for display
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join('+');
}
