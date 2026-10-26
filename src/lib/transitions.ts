import { gsap } from './gsap';

/**
 * Signature NOCTURNE transition: a vertical scan-line raster.
 * The element is masked by repeating vertical stripes whose fill ratio
 * animates 0 -> 1 (reveal) or 1 -> 0 (dissolve). Requires the element to
 * carry the `.raster` class (see global.css). Returns a tween that can be
 * nested in a scrubbed timeline.
 */
export function rasterReveal(
  target: gsap.TweenTarget,
  opts: { from?: number; to?: number; duration?: number; stripe?: number; ease?: string } = {},
) {
  const { from = 0, to = 1, duration = 1, stripe, ease = 'power2.inOut' } = opts;
  const vars: gsap.TweenVars = { '--raster-fill': to, duration, ease };
  const fromVars: gsap.TweenVars = { '--raster-fill': from };
  if (stripe) {
    fromVars['--raster-w'] = `${stripe}px`;
    vars['--raster-w'] = `${stripe}px`;
  }
  return gsap.fromTo(target, fromVars, vars);
}

export const rasterDissolve = (
  target: gsap.TweenTarget,
  opts: { duration?: number; stripe?: number; ease?: string } = {},
) => rasterReveal(target, { ...opts, from: 1, to: 0 });

/**
 * Vertical wipe via clip-path inset. dir 'up' reveals from bottom to top.
 */
export function wipe(
  target: gsap.TweenTarget,
  dir: 'up' | 'down' | 'left' | 'right' = 'up',
  opts: { duration?: number; ease?: string } = {},
) {
  const start = {
    up: 'inset(100% 0% 0% 0%)',
    down: 'inset(0% 0% 100% 0%)',
    left: 'inset(0% 0% 0% 100%)',
    right: 'inset(0% 100% 0% 0%)',
  }[dir];
  return gsap.fromTo(
    target,
    { clipPath: start },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: opts.duration ?? 1, ease: opts.ease ?? 'power3.inOut' },
  );
}

/** Circular iris reveal centered at (x%, y%). */
export function iris(
  target: gsap.TweenTarget,
  opts: { x?: number; y?: number; from?: number; to?: number; duration?: number; ease?: string } = {},
) {
  const { x = 50, y = 50, from = 0, to = 150, duration = 1, ease = 'power2.inOut' } = opts;
  return gsap.fromTo(
    target,
    { clipPath: `circle(${from}% at ${x}% ${y}%)` },
    { clipPath: `circle(${to}% at ${x}% ${y}%)`, duration, ease },
  );
}
