const KEY = 'calm';

/** Calm mode: skips the scroll-driven show and uses every chapter's reduced-motion branch. */
export function isCalm(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Persist the choice and reload so GSAP matchMedia sets are rebuilt cleanly. */
export function setCalm(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the reload below still applies nothing, which is fine */
  }
  window.location.reload();
}
