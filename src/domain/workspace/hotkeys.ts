/**
 * Hotkey System
 * 
 * Centralized keyboard shortcut management with context awareness.
 */

export interface HotkeyDefinition {
  key: string;
  label: string;
  description: string;
  category: 'navigation' | 'zoom' | 'markers' | 'playback' | 'workspace';
  handler: () => void;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
}

export interface HotkeyRegistry {
  [key: string]: HotkeyDefinition;
}

export function createHotkeyHandler(registry: HotkeyRegistry) {
  return (e: KeyboardEvent): boolean => {
    // Ignore if typing in input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return false;
    }

    // Build key identifier
    const modifiers = [];
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.shiftKey) modifiers.push('shift');
    if (e.altKey) modifiers.push('alt');
    if (e.metaKey) modifiers.push('meta');
    
    const keyId = modifiers.length > 0 
      ? `${modifiers.join('+')}+${e.key.toLowerCase()}`
      : e.key.toLowerCase();

    // Check registry
    const hotkey = registry[keyId];
    if (hotkey) {
      e.preventDefault();
      hotkey.handler();
      return true;
    }

    return false;
  };
}

export function getHotkeysByCategory(registry: HotkeyRegistry): Record<string, HotkeyDefinition[]> {
  const categories: Record<string, HotkeyDefinition[]> = {
    navigation: [],
    zoom: [],
    markers: [],
    playback: [],
    workspace: [],
  };

  Object.values(registry).forEach(hotkey => {
    if (categories[hotkey.category]) {
      categories[hotkey.category].push(hotkey);
    }
  });

  return categories;
}

export function formatHotkeyLabel(key: string): string {
  // Convert key identifiers to display format
  return key
    .split('+')
    .map(part => {
      switch (part) {
        case 'ctrl': return '⌃';
        case 'shift': return '⇧';
        case 'alt': return '⌥';
        case 'meta': return '⌘';
        case ' ': return 'Space';
        case 'arrowleft': return '←';
        case 'arrowright': return '→';
        case 'arrowup': return '↑';
        case 'arrowdown': return '↓';
        case 'escape': return 'Esc';
        case 'delete': return 'Del';
        default: return part.toUpperCase();
      }
    })
    .join('');
}
