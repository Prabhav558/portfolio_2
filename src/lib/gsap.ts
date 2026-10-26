import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isCalm } from './calm';

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'power3.out' });

const calm = isCalm();

/**
 * Shared media-query conditions for gsap.matchMedia().
 * Calm mode disables desktop and mobile and forces reduced, so every chapter's
 * reduced-motion branch runs.
 */
export const MQ = {
  desktop: calm ? 'not all' : '(min-width: 769px) and (prefers-reduced-motion: no-preference)',
  mobile: calm ? 'not all' : '(max-width: 768px) and (prefers-reduced-motion: no-preference)',
  reduced: calm ? 'all' : '(prefers-reduced-motion: reduce)',
} as const;

/** Pin length in px for a chapter multiplier. */
export const vh = (mult: number) => () => Math.round(window.innerHeight * mult);

export const prefersReducedMotion = () =>
  calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export { gsap, ScrollTrigger };
