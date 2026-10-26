import { useSyncExternalStore } from 'react';
import { chapters, type ChapterId } from '../config/chapters';

/** Tiny external store: only re-renders subscribers when the active chapter changes. */
let active: ChapterId = chapters[0].id;
const listeners = new Set<() => void>();

export function setActiveChapter(id: ChapterId) {
  if (id === active) return;
  active = id;
  listeners.forEach((l) => l());
}

export function useActiveChapter() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => active,
  );
}

/** Scroll to the start of a chapter, accounting for GSAP pin spacers. */
export function scrollToChapter(id: ChapterId, smooth = true) {
  const el = document.getElementById(id);
  if (!el) return;
  const host = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  const top = host.getBoundingClientRect().top + window.scrollY;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  el.focus({ preventScroll: true });
}
