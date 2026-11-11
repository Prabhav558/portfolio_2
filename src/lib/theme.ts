import { useSyncExternalStore } from 'react';
import { isCalm } from './calm';
import { inkTransition, type InkOrigin } from './ink';

export type Theme = 'dark' | 'light';

const KEY = 'theme';
const listeners = new Set<() => void>();
let busy = false;

/** The theme currently painted. index.html sets data-theme before first paint. */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable: the choice just won't persist */
  }
  listeners.forEach((l) => l());
}

/**
 * Flip the theme. The new theme is revealed as spreading ink that grows out of
 * `origin` (the toggle). With reduced motion or Calm mode it switches instantly.
 */
export async function toggleTheme(origin: InkOrigin) {
  if (busy) return;
  busy = true;
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  const reduce = isCalm() || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    if (reduce) apply(next);
    else await inkTransition(origin, () => apply(next));
  } finally {
    busy = false;
  }
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme);
}
