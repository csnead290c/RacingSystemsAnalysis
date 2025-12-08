/**
 * Responsive Layout Hooks
 * 
 * Provides hooks for responsive design and mobile detection.
 */

import { useState, useEffect } from 'react';

// Breakpoints matching common device sizes
export const BREAKPOINTS = {
  xs: 0,      // Extra small (phones)
  sm: 576,    // Small (large phones)
  md: 768,    // Medium (tablets)
  lg: 992,    // Large (desktops)
  xl: 1200,   // Extra large (large desktops)
  xxl: 1400,  // Extra extra large
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Hook to get current window dimensions
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/**
 * Hook to check if viewport is at or above a breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const { width } = useWindowSize();
  return width >= BREAKPOINTS[breakpoint];
}

/**
 * Hook to get current breakpoint name
 */
export function useCurrentBreakpoint(): Breakpoint {
  const { width } = useWindowSize();
  
  if (width >= BREAKPOINTS.xxl) return 'xxl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Hook to check if device is mobile
 */
export function useIsMobile(): boolean {
  const { width } = useWindowSize();
  return width < BREAKPOINTS.md;
}

/**
 * Hook to check if device is tablet
 */
export function useIsTablet(): boolean {
  const { width } = useWindowSize();
  return width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
}

/**
 * Hook to check if device is desktop
 */
export function useIsDesktop(): boolean {
  const { width } = useWindowSize();
  return width >= BREAKPOINTS.lg;
}

/**
 * Hook to detect touch device
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

/**
 * Hook to detect iOS Safari
 */
export function useIsIOSSafari(): boolean {
  const [isIOSSafari, setIsIOSSafari] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    setIsIOSSafari(isIOS && isSafari);
  }, []);

  return isIOSSafari;
}

/**
 * Responsive value helper - returns different values based on breakpoint
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T {
  const breakpoint = useCurrentBreakpoint();
  
  // Find the closest defined value at or below current breakpoint
  const breakpointOrder: Breakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp] as T;
    }
  }
  
  return defaultValue;
}

/**
 * Media query hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Orientation hook
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const { width, height } = useWindowSize();
  return height > width ? 'portrait' : 'landscape';
}
