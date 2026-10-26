import { mulberry32 } from '../lib/random';

/**
 * Deterministic procedural geometry helpers. Every function is pure: same
 * input (incl. seed) -> same SVG path data. Call them inside useMemo or at
 * module level, never per animation frame.
 */

export type Pt = [number, number];

const r1 = (n: number) => {
  const v = Math.round(n * 10) / 10;
  return v === 0 ? 0 : v;
};
/** Compact number formatting (1 decimal, no trailing .0). */
export const fmt = (n: number) => String(r1(n));
const pt = (p: Pt) => `${fmt(p[0])} ${fmt(p[1])}`;

/* ------------------------------------------------------------------ */
/* generic path helpers                                                */
/* ------------------------------------------------------------------ */

/** Quadratic-smoothed open polyline ("M p0 Q p1 mid ... L pn"). */
export function polySmooth(pts: Pt[]): string {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) return `M${pt(pts[0])}L${pt(pts[1])}`;
  let d = `M${pt(pts[0])}`;
  for (let i = 1; i < n - 1; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    d += `Q${pt(pts[i])} ${pt(m)}`;
  }
  return d + `L${pt(pts[n - 1])}`;
}

/**
 * Catmull-Rom through the given points, emitted as cubic beziers.
 * `k` is the handle scale (1/6 = standard; 0 = straight polygon).
 */
export function smoothPath(pts: Pt[], closed = false, k = 1 / 6): string {
  const n = pts.length;
  if (n < 2) return '';
  const g = (i: number): Pt =>
    closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${pt(pts[0])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = g(i - 1);
    const p1 = g(i);
    const p2 = g(i + 1);
    const p3 = g(i + 2);
    if (k === 0) {
      d += `L${pt(p2)}`;
      continue;
    }
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return closed ? d + 'Z' : d;
}

/** Dense Catmull-Rom sampling of a closed anchor list (for point-in-polygon etc). */
export function sampleClosed(anchors: Pt[], stepPx: number): Pt[] {
  const n = anchors.length;
  const out: Pt[] = [];
  const g = (i: number) => anchors[((i % n) + n) % n];
  for (let i = 0; i < n; i++) {
    const p0 = g(i - 1);
    const p1 = g(i);
    const p2 = g(i + 1);
    const p3 = g(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(1, Math.round(len / stepPx));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/** Ray-casting point in polygon. */
export function insidePoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Resample a polyline at roughly even arc-length spacing. */
export function resample(pts: Pt[], step: number): Pt[] {
  if (pts.length < 2) return pts.slice();
  const out: Pt[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    let d = step - carry;
    while (d <= len) {
      const t = d / len;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      d += step;
    }
    carry = len - (d - step);
  }
  const last = pts[pts.length - 1];
  const lo = out[out.length - 1];
  if (Math.hypot(last[0] - lo[0], last[1] - lo[1]) > step * 0.25) out.push(last);
  return out;
}

/* ------------------------------------------------------------------ */
/* hatch                                                               */
/* ------------------------------------------------------------------ */

export interface HatchOpts {
  seed: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** degrees; 0 = horizontal lines, 90 = vertical */
  angle: number;
  spacing: number;
  /** if set, spacing blends linearly from `spacing` (first line) to `spacing2` (last) */
  spacing2?: number;
  /** sideways wobble amplitude in px (default 1.2) */
  wobble?: number;
  /** chance (0..1) per sample that a line breaks (default 0.08) */
  breakChance?: number;
  /** sample distance along a line (default 18) */
  step?: number;
}

/** Parallel, slightly wavy line segments covering the bbox. Stroke it, clip it. */
export function hatch(o: HatchOpts): string {
  const rand = mulberry32(o.seed);
  const a = (o.angle * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const vx = -uy;
  const vy = ux;
  const cx = o.x + o.width / 2;
  const cy = o.y + o.height / 2;
  const R = Math.hypot(o.width, o.height) / 2 + 4;
  const wob = o.wobble ?? 1.2;
  const brk = o.breakChance ?? 0.08;
  const step = o.step ?? 18;
  const sp2 = o.spacing2 ?? o.spacing;
  const x0 = o.x - 2;
  const x1 = o.x + o.width + 2;
  const y0 = o.y - 2;
  const y1 = o.y + o.height + 2;
  const parts: string[] = [];
  let t = -R;
  while (t < R) {
    const frac = (t + R) / (2 * R);
    const sp = o.spacing + (sp2 - o.spacing) * frac;
    // analytic slab clip of the infinite line against the bbox -> s range
    let s0 = -R - 10;
    let s1 = R + 10;
    const bx = cx + vx * t;
    const by = cy + vy * t;
    const slab = (p: number, dir: number, lo: number, hi: number) => {
      if (Math.abs(dir) < 1e-9) {
        if (p < lo || p > hi) s1 = s0 - 1;
        return;
      }
      let ta = (lo - p) / dir;
      let tb = (hi - p) / dir;
      if (ta > tb) [ta, tb] = [tb, ta];
      s0 = Math.max(s0, ta);
      s1 = Math.min(s1, tb);
    };
    slab(bx, ux, x0, x1);
    slab(by, uy, y0, y1);
    if (s1 > s0) {
      const phase = rand() * 6.283;
      const freq = 0.015 + rand() * 0.03;
      let run: Pt[] = [];
      const flush = () => {
        if (run.length > 1) parts.push(polySmooth(run));
        run = [];
      };
      // start at a random jittered offset so line ends are not aligned
      let s = s0 + rand() * step * 0.4;
      let first = true;
      while (s <= s1 + 0.01) {
        const w = Math.sin(phase + s * freq) * wob + (rand() - 0.5) * wob * 0.5;
        run.push([bx + ux * s + vx * w, by + uy * s + vy * w]);
        if (rand() < brk && !first) {
          flush();
          s += step * (0.4 + rand() * 1.3);
        }
        first = false;
        s += step * (0.8 + rand() * 0.4);
      }
      // land exactly on the edge
      if (run.length > 0) {
        const w = Math.sin(phase + s1 * freq) * wob;
        run.push([bx + ux * s1 + vx * w, by + uy * s1 + vy * w]);
      }
      flush();
    }
    t += sp * (0.85 + rand() * 0.3);
  }
  return parts.join('');
}

/* ------------------------------------------------------------------ */
/* contour hatch                                                       */
/* ------------------------------------------------------------------ */

export interface ContourHatchOpts {
  seed: number;
  /** centerline (any density); hatch lines follow its shape */
  center: Pt[];
  /** signed normal offsets covered (normal = tangent rotated +90deg: (-ty, tx)) */
  from: number;
  to: number;
  spacing: number;
  spacing2?: number;
  wobble?: number;
  breakChance?: number;
  step?: number;
  /** extra length added past both ends of the centerline (default 0) */
  extend?: number;
}

function frames(center: Pt[], step: number) {
  const pts = resample(center, step);
  const nrm: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    nrm.push([-ty, tx]);
  }
  return { pts, nrm };
}

/** Lines that bend with a centerline (arms, fingers, robes). */
export function contourHatch(o: ContourHatchOpts): string {
  const rand = mulberry32(o.seed);
  const step = o.step ?? 12;
  let center = o.center;
  if (o.extend && center.length > 1) {
    const f = center[0];
    const f1 = center[1];
    const l = center[center.length - 1];
    const l1 = center[center.length - 2];
    const e0 = Math.hypot(f[0] - f1[0], f[1] - f1[1]) || 1;
    const e1 = Math.hypot(l[0] - l1[0], l[1] - l1[1]) || 1;
    center = [
      [f[0] + ((f[0] - f1[0]) / e0) * o.extend, f[1] + ((f[1] - f1[1]) / e0) * o.extend],
      ...center,
      [l[0] + ((l[0] - l1[0]) / e1) * o.extend, l[1] + ((l[1] - l1[1]) / e1) * o.extend],
    ];
  }
  const { pts, nrm } = frames(center, step);
  const wob = o.wobble ?? 0.8;
  const brk = o.breakChance ?? 0.06;
  const sp2 = o.spacing2 ?? o.spacing;
  const span = o.to - o.from || 1;
  const dir = span > 0 ? 1 : -1;
  const parts: string[] = [];
  let off = o.from;
  while ((off - o.to) * dir < 0) {
    const frac = Math.min(1, Math.max(0, (off - o.from) / span));
    const sp = o.spacing + (sp2 - o.spacing) * frac;
    const phase = rand() * 6.283;
    const freq = 0.05 + rand() * 0.08;
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 1) parts.push(polySmooth(run));
      run = [];
    };
    let i = Math.floor(rand() * 2);
    while (i < pts.length) {
      const w = Math.sin(phase + i * freq * step) * wob + (rand() - 0.5) * wob * 0.5;
      run.push([pts[i][0] + nrm[i][0] * (off + w), pts[i][1] + nrm[i][1] * (off + w)]);
      if (rand() < brk && run.length > 2) {
        flush();
        i += 1 + Math.floor(rand() * 3);
        continue;
      }
      i++;
    }
    if (run.length > 0 && i - 1 < pts.length) {
      const j = pts.length - 1;
      run.push([pts[j][0] + nrm[j][0] * off, pts[j][1] + nrm[j][1] * off]);
    }
    flush();
    off += dir * sp * (0.85 + rand() * 0.3);
  }
  return parts.join('');
}

export interface CrossHatchOpts {
  seed: number;
  center: Pt[];
  halfWidth: number;
  /** spacing along the centerline */
  spacing: number;
  /** curvature of each cross line (px of bow along the tangent) */
  bow?: number;
  /** fraction of the half width used on the - and + side (default 1,1) */
  fromFrac?: number;
  toFrac?: number;
  breakChance?: number;
}

/** Short lines across a limb (cross-contour hatching, like rings around a finger). */
export function crossHatch(o: CrossHatchOpts): string {
  const rand = mulberry32(o.seed);
  const { pts, nrm } = frames(o.center, Math.max(1, o.spacing));
  const bow = o.bow ?? 2.5;
  const f0 = o.fromFrac ?? -1;
  const f1 = o.toFrac ?? 1;
  const parts: string[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    if (rand() < (o.breakChance ?? 0.05)) continue;
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const n = nrm[i];
    const hw = o.halfWidth * (0.9 + rand() * 0.2);
    const s: Pt = [pts[i][0] + n[0] * hw * f0, pts[i][1] + n[1] * hw * f0];
    const e: Pt = [pts[i][0] + n[0] * hw * f1, pts[i][1] + n[1] * hw * f1];
    const c: Pt = [pts[i][0] + tx * bow, pts[i][1] + ty * bow];
    parts.push(`M${pt(s)}Q${pt(c)} ${pt(e)}`);
  }
  return parts.join('');
}

/* ------------------------------------------------------------------ */
/* scanlines                                                           */
/* ------------------------------------------------------------------ */

export interface ScanlinesOpts {
  width: number;
  height: number;
  spacing: number;
  thickness: number;
  seed: number;
  /** 0..1 relative per-line width variation */
  jitter: number;
}

/** Vertical stripe rects as one path (the signature raster texture). */
export function scanlines(o: ScanlinesOpts): string {
  const rand = mulberry32(o.seed);
  let d = '';
  for (let x = 0; x < o.width; x += o.spacing) {
    const w = Math.max(0.3, o.thickness * (1 + (rand() - 0.5) * 2 * o.jitter));
    d += `M${fmt(x)} 0h${fmt(w)}v${fmt(o.height)}h${fmt(-w)}z`;
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* roughen                                                             */
/* ------------------------------------------------------------------ */

export interface RoughenOpts {
  /** target edge subdivision length (default 16) */
  segment?: number;
  /** 0 = straight polygon, 1 = fully smoothed (default 0.6) */
  smooth?: number;
}

/** Closed path from polygon points with jittered edges (imperfect contours). */
export function roughen(points: Pt[], amount: number, seed: number, opts: RoughenOpts = {}): string {
  const rand = mulberry32(seed);
  const seg = opts.segment ?? 16;
  const out: Pt[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const k = Math.max(1, Math.round(len / seg));
    for (let s = 0; s < k; s++) {
      const t = s / k;
      const j = (rand() - 0.5) * 2 * amount * (s === 0 ? 0.55 : 1);
      out.push([a[0] + (b[0] - a[0]) * t + nx * j, a[1] + (b[1] - a[1]) * t + ny * j]);
    }
  }
  return smoothPath(out, true, ((opts.smooth ?? 0.6) * 1) / 6);
}

/** Same jitter as roughen but returns the points (for outlines needing clip etc). */
export function roughPoints(points: Pt[], amount: number, seed: number, segment = 16): Pt[] {
  const rand = mulberry32(seed);
  const out: Pt[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const k = Math.max(1, Math.round(len / segment));
    for (let s = 0; s < k; s++) {
      const t = s / k;
      const j = (rand() - 0.5) * 2 * amount * (s === 0 ? 0.55 : 1);
      out.push([a[0] + (b[0] - a[0]) * t + nx * j, a[1] + (b[1] - a[1]) * t + ny * j]);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* woodgrain                                                           */
/* ------------------------------------------------------------------ */

export interface WoodgrainOpts {
  seed: number;
  width: number;
  height: number;
  /** approx number of main grain lines across the surface */
  count: number;
}

export interface Ribbon {
  /** filled polygon path (nonzero) */
  d: string;
  /** max thickness in px (1..9) */
  w: number;
}

interface Knot {
  x: number;
  y: number;
  r: number;
}

/** Woodcut plank: tapering, splitting, breaking vertical ribbons that swirl round knots. */
export function woodgrain(o: WoodgrainOpts): Ribbon[] {
  const rand = mulberry32(o.seed);
  const W = o.width;
  const H = o.height;
  const tilt = ((8 + (rand() - 0.5) * 2) * Math.PI) / 180;
  const cs = Math.cos(tilt);
  const sn = Math.sin(tilt);
  const mx = W / 2;
  const my = H / 2;
  // generation box (unrotated) that still covers the viewport once rotated
  const ex = (W / 2) * cs + (H / 2) * sn + 24;
  const ey = (H / 2) * cs + (W / 2) * sn + 24;
  const bx0 = mx - ex;
  const bx1 = mx + ex;
  const by0 = my - ey;
  const by1 = my + ey;
  const boxW = bx1 - bx0;
  const boxH = by1 - by0;
  const rot = (x: number, y: number): Pt => {
    const dx = x - mx;
    const dy = y - my;
    return [mx + dx * cs - dy * sn, my + dx * sn + dy * cs];
  };

  // knots lie inside the visible area (use unrotated frame centre region)
  const nk = 1 + Math.floor(rand() * 3);
  const knots: Knot[] = [];
  for (let i = 0; i < nk; i++) {
    knots.push({
      x: W * (0.12 + rand() * 0.76),
      y: H * (0.15 + rand() * 0.7),
      r: 30 + rand() * 38,
    });
  }
  const deflect = (x: number, y: number) => {
    let sum = 0;
    for (const k of knots) {
      const dx = x - k.x;
      const dy = y - k.y;
      sum +=
        k.r * 1.25 * Math.tanh(dx / (k.r * 0.55)) *
        Math.exp(-(dx * dx) / (2 * (k.r * 2.1) ** 2)) *
        Math.exp(-(dy * dy) / (2 * (k.r * 2.0) ** 2));
    }
    return sum;
  };
  const inKnot = (x: number, y: number) => {
    for (const k of knots) {
      const dx = x / 1 - k.x;
      const dy = y - k.y;
      if ((dx * dx) / (k.r * 0.8) ** 2 + (dy * dy) / (k.r * 1.5) ** 2 < 1) return true;
    }
    return false;
  };

  const ribbons: Ribbon[] = [];
  const STEP = 22;

  const build = (
    xf: (y: number) => number,
    y0: number,
    y1: number,
    wmax: number,
    gaps: Array<[number, number]>,
    wseed: number,
  ): Ribbon | null => {
    const wr = mulberry32(wseed);
    const ph = wr() * 6.28;
    const f3 = 0.004 + wr() * 0.01;
    const ys: number[] = [];
    for (let y = y0; y < y1; y += STEP * (0.8 + wr() * 0.4)) ys.push(y);
    ys.push(y1);
    if (ys.length < 3) return null;
    const left: Array<Pt | null> = [];
    const right: Array<Pt | null> = [];
    for (let i = 0; i < ys.length; i++) {
      const y = ys[i];
      const s = (y - y0) / (y1 - y0);
      const env = Math.pow(Math.sin(Math.PI * s), 0.4);
      const slow = 0.55 + 0.45 * Math.sin(y * f3 + ph);
      let w = wmax * env * slow * (0.65 + wr() * 0.7);
      for (const g of gaps) if (y > g[0] && y < g[1]) w = 0;
      const x = xf(y);
      if (inKnot(x, y)) w = 0;
      if (w < 0.8) {
        left.push(null);
        right.push(null);
        continue;
      }
      const dy = 8;
      const tx = xf(y + dy) - xf(y - dy);
      const ty = dy * 2;
      const l = Math.hypot(tx, ty);
      const nx = ty / l;
      const ny = -tx / l;
      const jl = (wr() - 0.5) * Math.min(2.2, w * 0.5);
      const jr = (wr() - 0.5) * Math.min(2.2, w * 0.5);
      left.push(rot(x + (nx * (w + jl)) / 2, y + (ny * (w + jl)) / 2));
      right.push(rot(x - (nx * (w + jr)) / 2, y - (ny * (w + jr)) / 2));
    }
    let d = '';
    let i = 0;
    while (i < left.length) {
      if (!left[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < left.length && left[j + 1]) j++;
      if (j - i >= 1) {
        d += `M${pt(left[i]!)}`;
        for (let k = i + 1; k <= j; k++) d += `L${pt(left[k]!)}`;
        for (let k = j; k >= i; k--) d += `L${pt(right[k]!)}`;
        d += 'Z';
      }
      i = j + 1;
    }
    return d ? { d, w: r1(wmax) } : null;
  };

  const n = Math.max(1, Math.round(o.count * (boxW / W)));
  for (let i = 0; i < n; i++) {
    const baseX = bx0 + (i + 0.5 + (rand() - 0.5) * 0.9) * (boxW / n);
    const full = rand() < 0.5;
    const len = full ? boxH : boxH * (0.3 + rand() * 0.6);
    const y0 = full ? by0 : by0 + rand() * (boxH - len);
    const y1 = y0 + len;
    const wmax = 1.5 + Math.pow(rand(), 1.05) * 7.5;
    const a1 = 6 + rand() * 20;
    const f1 = 0.0018 + rand() * 0.002;
    const p1 = rand() * 6.28;
    const a2 = 2 + rand() * 4;
    const f2 = 0.009 + rand() * 0.006;
    const p2 = rand() * 6.28;
    const xf = (y: number) =>
      baseX + a1 * Math.sin(y * f1 + p1) + a2 * Math.sin(y * f2 + p2) + deflect(baseX, y);
    const gaps: Array<[number, number]> = [];
    const ng = Math.floor(rand() * 3);
    for (let g = 0; g < ng; g++) {
      const gs = y0 + rand() * len;
      gaps.push([gs, gs + 30 + rand() * 110]);
    }
    const r = build(xf, y0, y1, wmax, gaps, Math.floor(rand() * 1e9));
    if (r) ribbons.push(r);

    // split: a child grain peels off the parent
    if (rand() < 0.35) {
      const ys = y0 + len * (0.2 + rand() * 0.5);
      const dirn = rand() < 0.5 ? -1 : 1;
      const slope = 0.05 + rand() * 0.09;
      const cl = Math.min(y1 - ys, 200 + rand() * 500);
      const cx = (y: number) => xf(y) + dirn * Math.max(0, y - ys) * slope;
      const c = build(cx, ys, ys + cl, wmax * (0.5 + rand() * 0.3), [], Math.floor(rand() * 1e9));
      if (c) ribbons.push(c);
    }
  }

  // short broken dashes along the grain
  const nd = Math.round(n * 1.1);
  for (let i = 0; i < nd; i++) {
    const baseX = bx0 + rand() * boxW;
    const y0 = by0 + rand() * (boxH - 160);
    const len = 40 + rand() * 130;
    const a1 = 10 + rand() * 20;
    const f1 = 0.002 + rand() * 0.002;
    const p1 = rand() * 6.28;
    const xf = (y: number) => baseX + a1 * Math.sin(y * f1 + p1) + deflect(baseX, y);
    const r = build(xf, y0, y0 + len, 1.2 + rand() * 2.8, [], Math.floor(rand() * 1e9));
    if (r) ribbons.push(r);
  }

  // concentric knot rings (elongated along the grain)
  for (const k of knots) {
    const rings = 3 + Math.floor(rand() * 2);
    for (let j = 0; j < rings; j++) {
      const rx = k.r * (0.42 + j * 0.34) * (0.92 + rand() * 0.16);
      const ry = rx * (1.55 + rand() * 0.3);
      const a0 = rand() * 6.28;
      const span = 4.2 + rand() * 1.9;
      const wmax = 2 + rand() * 4.5 - j * 0.3;
      const segs = 26;
      const L: Pt[] = [];
      const Rr: Pt[] = [];
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const ang = a0 + span * t;
        const env = Math.pow(Math.sin(Math.PI * t), 0.6) * (0.75 + rand() * 0.25);
        const w = Math.max(0.3, wmax * env);
        const cxp = k.x + Math.cos(ang) * rx;
        const cyp = k.y + Math.sin(ang) * ry;
        const nx = Math.cos(ang) / rx;
        const ny = Math.sin(ang) / ry;
        const nl = Math.hypot(nx, ny);
        L.push(rot(cxp + (nx / nl) * (w / 2), cyp + (ny / nl) * (w / 2)));
        Rr.push(rot(cxp - (nx / nl) * (w / 2), cyp - (ny / nl) * (w / 2)));
      }
      let d = `M${pt(L[0])}`;
      for (let s = 1; s < L.length; s++) d += `L${pt(L[s])}`;
      for (let s = Rr.length - 1; s >= 0; s--) d += `L${pt(Rr[s])}`;
      ribbons.push({ d: d + 'Z', w: r1(wmax) });
    }
  }
  return ribbons;
}
