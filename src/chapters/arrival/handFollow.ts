import { gsap } from '../../lib/gsap';
import { HAND_PIVOTS } from '../../art';
import { blob } from './blooms';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_STAMPS = 36;
const STAMP_SPACING = 34; // px of pointer travel between ink stamps
const STAMP_LIFE = 7; // seconds before a stamp fades
/** The fingertip touches the cursor disk's right edge rather than hiding under it. */
const TIP_OFFSET = { x: 40, y: 6 };

/** Unit-ish ink blots (radius ~40) reused for every stamp. */
const SHAPES = Array.from({ length: 7 }, (_, i) =>
  blob(0, 0, 40, 30 + (i % 3) * 6, 5 + i * 13, 0.32, 5),
);

interface Opts {
  root: HTMLElement;
  /** Wrapper that receives the follow transform (origin at the shoulder). */
  follow: HTMLElement;
  /** Markers inside the scroll-transformed (but not follow-transformed) layer. */
  tipMark: HTMLElement;
  shoulderMark: HTMLElement;
  /** Full-section svg the ink stamps are written into. */
  ink: SVGSVGElement;
}

const center = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The hand follows the pointer: the arm pivots from its off-screen shoulder and
 * slides along its length so the index fingertip chases the cursor. Pressing
 * curls the fingers; dragging while pressed leaves red ink on the grain.
 * Returns a cleanup function.
 */
export function attachHandFollow({ root, follow, tipMark, shoulderMark, ink }: Opts) {
  const qx = gsap.quickTo(follow, 'x', { duration: 0.55, ease: 'power3.out' });
  const qy = gsap.quickTo(follow, 'y', { duration: 0.55, ease: 'power3.out' });
  const qr = gsap.quickTo(follow, 'rotation', { duration: 0.65, ease: 'power3.out' });

  const fingers = Array.from(follow.querySelectorAll<SVGGElement>('[data-finger]'));
  const thumb = follow.querySelector<SVGGElement>('[data-part="thumb"]');
  const piv = HAND_PIVOTS.reach;

  let px = 0;
  let py = 0;
  let inside = false;
  let pressed = false;
  let lastStamp: { x: number; y: number } | null = null;
  const stamps: SVGGElement[] = [];

  const aim = () => {
    if (!inside) return;
    const S = center(shoulderMark);
    const T = center(tipMark);
    const aT = Math.atan2(T.y - S.y, T.x - S.x);
    const tx = px + TIP_OFFSET.x;
    const ty = py + TIP_OFFSET.y;
    const aP = Math.atan2(ty - S.y, tx - S.x);
    let d = aP - aT;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    d = clamp(d, -0.42, 0.36);
    // where the tip lands after rotating about the shoulder, then slide the rest
    const cos = Math.cos(d);
    const sin = Math.sin(d);
    const vx = T.x - S.x;
    const vy = T.y - S.y;
    const rx = S.x + vx * cos - vy * sin;
    const ry = S.y + vx * sin + vy * cos;
    const maxReach = window.innerWidth * 0.3;
    qx(clamp(tx - rx, -maxReach, window.innerWidth * 0.12));
    qy(clamp(ty - ry, -window.innerHeight * 0.18, window.innerHeight * 0.18));
    qr((d * 180) / Math.PI);
  };

  const rest = () => {
    qx(0);
    qy(0);
    qr(0);
  };

  const local = (x: number, y: number) => {
    const r = ink.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  };

  // Each stamp is <g transform="translate rotate"><path/></g>; GSAP only scales the
  // path about its own centre (x/y tweens on SVG paths misplace them here).
  const stamp = (x: number, y: number) => {
    const p = local(x, y);
    let g = stamps.length >= MAX_STAMPS ? stamps.shift()! : null;
    if (!g) {
      g = document.createElementNS(SVG_NS, 'g');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('fill', 'var(--burgundy)');
      path.setAttribute('stroke', 'var(--black)');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      g.appendChild(path);
      ink.appendChild(g);
    }
    const path = g.firstChild as SVGPathElement;
    gsap.killTweensOf([g, path]);
    path.setAttribute('d', SHAPES[Math.floor(Math.random() * SHAPES.length)]);
    g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${Math.round(Math.random() * 360)})`);
    gsap.set(g, { opacity: 1 });
    const s = 0.35 + Math.random() * 0.55;
    gsap.fromTo(path, { scale: 0.05, svgOrigin: '0 0' }, { scale: s, svgOrigin: '0 0', duration: 0.45, ease: 'back.out(2.2)' });
    gsap.to(g, { opacity: 0, duration: 1.4, delay: STAMP_LIFE, ease: 'power1.in' });
    stamps.push(g);
    lastStamp = { x, y };
  };

  const curl = (on: boolean) => {
    fingers.forEach((f, i) => {
      const k = f.dataset.finger!;
      const o = piv[k];
      if (o) gsap.to(f, { rotation: on ? 7 + i * 1.5 : 0, svgOrigin: `${o.x} ${o.y}`, duration: 0.35, ease: 'power2.out' });
    });
    if (thumb) gsap.to(thumb, { rotation: on ? -6 : 0, svgOrigin: `${piv.thumb.x} ${piv.thumb.y}`, duration: 0.35, ease: 'power2.out' });
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX;
    py = e.clientY;
    inside = true;
    aim();
    if (pressed && lastStamp && Math.hypot(px - lastStamp.x, py - lastStamp.y) > STAMP_SPACING) stamp(px, py);
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    // pressing a button is a click, not a stroke of ink
    if ((e.target as Element | null)?.closest('button, a')) return;
    pressed = true;
    curl(true);
    stamp(e.clientX, e.clientY);
  };
  const onUp = () => {
    if (!pressed) return;
    pressed = false;
    lastStamp = null;
    curl(false);
  };
  const onLeave = () => {
    inside = false;
    onUp();
    rest();
  };
  // scrolling moves the hand under a still pointer: re-aim
  const onScroll = () => inside && aim();

  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointerleave', onLeave);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerdown', onDown);
    root.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('scroll', onScroll);
    stamps.forEach((g) => {
      gsap.killTweensOf([g, g.firstChild]);
      g.remove();
    });
  };
}
