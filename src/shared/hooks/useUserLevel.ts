/**
 * useUserLevel Hook
 * 
 * Manage user access level for feature gating.
 */

import { useLocalStorage } from './useLocalStorage';

export type UserLevel = 'guest' | 'beta' | 'admin';

const USER_LEVEL_KEY = 'dev:userLevel';

export function useUserLevel(): [UserLevel, (level: UserLevel) => void] {
  return useLocalStorage<UserLevel>(USER_LEVEL_KEY, 'guest');
}

/**
 * Check if current user level meets minimum required level.
 */
export function hasAccess(currentLevel: UserLevel, requiredLevel: UserLevel): boolean {
  const levels: UserLevel[] = ['guest', 'beta', 'admin'];
  const currentIndex = levels.indexOf(currentLevel);
  const requiredIndex = levels.indexOf(requiredLevel);
  return currentIndex >= requiredIndex;
}
