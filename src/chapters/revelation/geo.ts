import { fmt, polySmooth, type Pt } from '../../art/procedural';
import { mulberry32 } from '../../lib/random';

export type { Pt };

/** Dense Catmull-Rom sampling of an open anchor list. */
export function sampleOpen(a: Pt[], per = 10): Pt[] {
  const n = a.length;
  const g = (i: number) => a[Math.max(0, Math.min(n - 1, i))];
  const out: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = g(i - 1);
    const p1 = g(i);
    const p2 = g(i + 1);
    const p3 = g(i + 2);
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (A: number, B: number, C: number, D: number) =>
        0.5 * (2 * B + (-A + C) * t + (2 * A - 5 * B + 4 * C - D) * t2 + (-A + 3 * B - 3 * C + D) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(a[n - 1]);
  return out;
}

/** Dense Catmull-Rom sampling of a closed anchor list. */
export function sampleLoop(a: Pt[], per = 10): Pt[] {
  const n = a.length;
  const g = (i: number) => a[((i % n) + n) % n];
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = g(i - 1);
    const p1 = g(i);
    const p2 = g(i + 1);
    const p3 = g(i + 2);
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (A: number, B: number, C: number, D: number) =>
        0.5 * (2 * B + (-A + C) * t + (2 * A - 5 * B + 4 * C - D) * t2 + (-A + 3 * B - 3 * C + D) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

const P = (p: Pt) => `${fmt(p[0])} ${fmt(p[1])}`;

/** Polyline path (straight segments between dense points). */
export function poly(pts: Pt[], close = false): string {
  let d = `M${P(pts[0])}`;
  for (let i = 1; i < pts.length; i++) d += `L${P(pts[i])}`;
  return close ? d + 'Z' : d;
}

/** Offset a dense polyline along its normal (positive = screen-left of travel direction). */
export function offset(pts: Pt[], d: number | ((t: number) => number)): Pt[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    const k = typeof d === 'number' ? d : d(i / (n - 1));
    return [p[0] + (ty / l) * k, p[1] - (tx / l) * k] as Pt;
  });
}

/** Filled ribbon along anchors with a width profile (a tapering ink stroke). */
export function ribbon(
  anchors: Pt[],
  width: (t: number) => number,
  opts: { per?: number; jitter?: number; seed?: number } = {},
): string {
  const c = sampleOpen(anchors, opts.per ?? 8);
  const rand = mulberry32(opts.seed ?? 1);
  const j = opts.jitter ?? 0;
  const n = c.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    const w = Math.max(0.2, width(i / (n - 1))) / 2;
    const nx = ty / l;
    const ny = -tx / l;
    const j1 = j ? (rand() - 0.5) * 2 * j : 0;
    const j2 = j ? (rand() - 0.5) * 2 * j : 0;
    left.push([c[i][0] + nx * (w + j1), c[i][1] + ny * (w + j1)]);
    right.push([c[i][0] - nx * (w + j2), c[i][1] - ny * (w + j2)]);
  }
  return poly([...left, ...right.reverse()], true);
}

/** Smooth open stroke path through anchors (quadratic smoothing). */
export const line = (anchors: Pt[]) => polySmooth(sampleOpen(anchors, 6));

/** Ellipse as a polygon path (optionally rotated, deg). */
export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): Pt[] {
  const a = (rot * Math.PI) / 180;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    out.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  }
  return out;
}

export const bell = (t: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
