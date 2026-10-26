import { mulberry32 } from '../../lib/random';
import { smoothPath } from '../../art/procedural';

/* The world: night stripes, stars, ridges, soil strata, pools, and the germinating plants. */

export const DEEP = '#4A1D23';

type P2 = [number, number];
const r1 = (n: number) => {
  const v = Math.round(n * 10) / 10;
  return v === 0 ? 0 : v;
};
const pts2 = (a: P2[]) => a.map((p) => `${r1(p[0])} ${r1(p[1])}`);
const DEGR = Math.PI / 180;

/** Vertical tapered engraved stripes in one path; `flip` thickens upward instead of downward. */
export function stripesPath(
  seed: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  spacing: number,
  wMin: number,
  wMax: number,
  grow = 1.8,
  flip = false,
): string {
  const rng = mulberry32(seed);
  const n = Math.ceil((x1 - x0) / spacing);
  const step = 56;
  let d = '';
  for (let i = 0; i < n; i++) {
    const xc = x0 + i * spacing + (rng() - 0.5) * spacing * 0.3;
    const amp = 1.5 + rng() * 4;
    const f = 0.006 + rng() * 0.01;
    const ph = rng() * 6.28;
    const k = 0.5 + rng() * 0.9;
    const Lp: string[] = [];
    const Rp: string[] = [];
    for (let y = y0; ; y += step) {
      const yy = Math.min(y, y1);
      let t = (yy - y0) / (y1 - y0);
      if (flip) t = 1 - t;
      const w = Math.min(spacing * 0.92, (wMin + (wMax - wMin) * Math.pow(t, grow)) * k);
      const x = xc + amp * Math.sin(yy * f + ph);
      Lp.push(`${r1(x - w / 2)} ${r1(yy)}`);
      Rp.push(`${r1(x + w / 2)} ${r1(yy)}`);
      if (yy >= y1) break;
    }
    d += `M${Lp.join('L')}L${Rp.reverse().join('L')}Z`;
  }
  return d;
}

/** Tiny round dots (stroke with round caps). */
export function starsPath(seed: number, x0: number, x1: number, y0: number, y1: number, count: number): string {
  const rng = mulberry32(seed);
  let d = '';
  for (let i = 0; i < count; i++) {
    d += `M${r1(x0 + rng() * (x1 - x0))} ${r1(y0 + rng() * (y1 - y0))}h.1`;
  }
  return d;
}

export interface RidgeArt {
  fill: string;
  line: string;
  hatch: string;
}

/** A hill silhouette with a contour line and short vertical engraving under it. */
export function ridge(seed: number, x0: number, x1: number, yBase: number, amp: number, yBottom: number): RidgeArt {
  const rng = mulberry32(seed);
  const p1 = rng() * 6;
  const p2 = rng() * 6;
  const yAt = (x: number) =>
    yBase - amp * (0.5 + 0.34 * Math.sin(x * 0.0042 + p1) + 0.2 * Math.sin(x * 0.011 + p2) + 0.06 * Math.sin(x * 0.03 + p1));
  const top: P2[] = [];
  for (let x = x0; x <= x1; x += 60) top.push([x, yAt(x)]);
  const line = `M${pts2(top).join('L')}`;
  const fill = `${line}L${r1(x1)} ${r1(yBottom)}L${r1(x0)} ${r1(yBottom)}Z`;
  let hatch = '';
  for (let x = x0; x < x1; x += 9) {
    const y = yAt(x) + 5;
    hatch += `M${r1(x)} ${r1(y)}v${r1(10 + rng() * 34)}`;
  }
  return { fill, line, hatch };
}

export interface SoilArt {
  lines: string;
  heavy: string;
  pebbles: string;
  wet: string;
  wetHeavy: string;
}

/** Engraved soil strata: wavy broken horizontal lines that thicken with depth, plus pebbles. */
export function soilArt(seed: number, x0: number, x1: number, y0: number, depth: number, pebbleCount = 34): SoilArt {
  const rng = mulberry32(seed);
  const rows = (offset: number, sp0: number, sp1: number, heavyEvery: number) => {
    let thin = '';
    let heavy = '';
    let idx = 0;
    for (let y = y0 + 6 + offset; y < y0 + depth; ) {
      const t = (y - y0) / depth;
      const amp = 1 + rng() * 2.4;
      const f = 0.004 + rng() * 0.008;
      const ph = rng() * 6.28;
      let x = x0 - rng() * 150;
      const isHeavy = idx % heavyEvery === 0 && t > 0.12;
      while (x < x1) {
        const len = 90 + rng() * 300;
        let seg = '';
        for (let s = 0; s <= len; s += 60) {
          const xx = x + s;
          seg += `${s === 0 ? 'M' : 'L'}${r1(xx)} ${r1(y + amp * Math.sin(xx * f + ph))}`;
        }
        if (isHeavy) heavy += seg;
        else if (rng() > 0.1 + 0.25 * t) thin += seg;
        x += len + 14 + rng() * 60 * (1 - t * 0.7);
      }
      y += sp0 + (sp1 - sp0) * t;
      idx++;
    }
    return [thin, heavy] as const;
  };
  const [lines, heavy] = rows(0, 11, 6.5, 3);
  const [wet, wetHeavy] = rows(3, 7, 4.4, 2);
  let pebbles = '';
  for (let i = 0; i < pebbleCount; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = y0 + depth * (0.1 + rng() * 0.85);
    const rx = 5 + rng() * 11;
    const ry = rx * (0.5 + rng() * 0.3);
    pebbles += `M${r1(x - rx)} ${r1(y)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0`;
    pebbles += `M${r1(x - rx * 0.5)} ${r1(y + ry * 0.45)}h${r1(rx)}`;
  }
  return { lines, heavy, pebbles, wet, wetHeavy };
}

/** Light engraved lines along a ground surface band. */
export function surfaceLines(seed: number, x0: number, x1: number, y: number, h: number): string {
  const rng = mulberry32(seed);
  let d = '';
  for (let k = 1; k < 3; k++) {
    let x = x0 + rng() * 80;
    while (x < x1) {
      const len = 50 + rng() * 220;
      d += `M${r1(x)} ${r1(y + (h * k) / 3)}h${r1(len)}`;
      x += len + 30 + rng() * 120;
    }
  }
  // short blades along the top edge of the band
  for (let x = x0 + rng() * 10; x < x1; x += 8 + rng() * 9) d += `M${r1(x)} ${r1(y)}v${r1(5 + rng() * 10)}`;
  return d;
}

/** Engraved strata: horizontal bars that thicken and crowd together with depth, until the earth turns black. */
export function strata(seed: number, x0: number, x1: number, y0: number, h: number): string {
  const rng = mulberry32(seed);
  let d = '';
  for (let y = y0 + 6; y < y0 + h; ) {
    const t = Math.min(1, (y - y0) / 300);
    const th = 0.9 + 6.4 * Math.pow(t, 1.25);
    let x = x0 - rng() * 160;
    while (x < x1) {
      const len = 70 + rng() * 340;
      const e = x + len;
      d += `M${r1(x)} ${r1(y)}h${r1(len)}v${r1(th)}h${r1(-len)}Z`;
      x = e + 4 + rng() * 38 * (1 - t * 0.85);
    }
    y += th + 6 + 10 * (1 - t) + rng() * 3;
  }
  return d;
}

/** Irregular lens (pool of liquid lying on the ground), centred on 0,0. Half-width rx, half-height ry. */
export function poolPath(seed: number, rx: number, ry: number): string {
  const rng = mulberry32(seed);
  const n = Math.max(10, Math.round(rx / 34));
  const top: P2[] = [];
  const bot: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n;
    const e = 1 - Math.pow(Math.abs(u), 2.6);
    const jx = i === 0 || i === n ? 0 : (rng() - 0.5) * (rx / n) * 0.9;
    top.push([u * rx + jx, -ry * e * (0.72 + rng() * 0.5)]);
    bot.push([u * rx + jx, ry * 0.55 * e * (0.7 + rng() * 0.5)]);
  }
  const all = top.concat(bot.reverse().slice(1, -1));
  return smoothPath(all, true, 1 / 6);
}

export interface LeafGeom {
  /** position along the stem 0..1 */
  t: number;
  x: number;
  y: number;
  /** final angle (deg, svg: 0 = +x, clockwise) */
  ang: number;
  /** rotation (relative to the final angle) that folds the leaf against the stem */
  fold: number;
  outline: string;
  detail: string;
  cot: boolean;
}

export interface PlantGeom {
  x: number;
  gy: number;
  h: number;
  stem: string;
  shade: string;
  nodes: string;
  /** stem samples base -> tip */
  pts: P2[];
  tip: P2;
  leaves: LeafGeom[];
  roots: string;
  fine: string;
}

function leafShape(len: number, wid: number, rng: () => number) {
  const L = len;
  const w = wid;
  const outline = `M0 0C${r1(L * 0.18)} ${r1(-w * 0.95)} ${r1(L * 0.62)} ${r1(-w * 1.05)} ${r1(L)} 0C${r1(L * 0.62)} ${r1(w * 1.05)} ${r1(L * 0.18)} ${r1(w * 0.95)} 0 0Z`;
  let detail = `M2 0L${r1(L * 0.92)} 0`;
  // engraved shade on the lower half: short parallel strokes
  for (let p = 0.14; p < 0.86; p += 0.075 + rng() * 0.02) {
    const edge = w * 0.95 * Math.sin(Math.PI * Math.min(1, p * 1.02));
    detail += `M${r1(L * p)} 1.5L${r1(L * (p + 0.07))} ${r1(edge * (0.66 + rng() * 0.2))}`;
  }
  // two veins on the lit half
  for (const p of [0.3, 0.55]) detail += `M${r1(L * p)} 0L${r1(L * (p + 0.14))} ${r1(-w * 0.62)}`;
  return { outline, detail };
}

/** One germinating plant: organic stem, leaves along its upper part, and a root system into the soil. */
export function buildPlant(
  seed: number,
  x: number,
  gy: number,
  h: number,
  n: number,
  rootLen: number,
  leafScale = 1,
): PlantGeom {
  const rng = mulberry32(seed);
  const s1 = (rng() < 0.5 ? -1 : 1) * (14 + rng() * 16) * (h / 340);
  const s2 = -s1 * (0.5 + rng() * 0.7);
  const p0: P2 = [x, gy - 12];
  const p1: P2 = [x + s1, gy - h * 0.33];
  const p2: P2 = [x + s2, gy - h * 0.68];
  const p3: P2 = [x + (rng() - 0.5) * 26, gy - h];
  const at = (t: number): P2 => {
    const a = (1 - t) ** 3;
    const b = 3 * (1 - t) ** 2 * t;
    const c = 3 * (1 - t) * t * t;
    const d = t ** 3;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  };
  const angAt = (t: number) => {
    const a = at(Math.max(0, t - 0.02));
    const b = at(Math.min(1, t + 0.02));
    return Math.atan2(b[1] - a[1], b[0] - a[0]) / DEGR;
  };
  const pts: P2[] = [];
  for (let i = 0; i <= 40; i++) pts.push(at(i / 40));
  const stem = `M${r1(p0[0])} ${r1(p0[1])}C${r1(p1[0])} ${r1(p1[1])} ${r1(p2[0])} ${r1(p2[1])} ${r1(p3[0])} ${r1(p3[1])}`;
  // shade: a thin parallel line along the right-hand side of the stem
  const shadePts: P2[] = pts.map((p, i) => {
    const q = pts[Math.min(40, i + 1)];
    const o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dy / l) * 2.3, p[1] - (dx / l) * 2.3] as P2;
  });
  const shade = `M${pts2(shadePts.filter((_, i) => i % 2 === 0)).join('L')}`;

  const leaves: LeafGeom[] = [];
  let nodes = '';
  const mk = (t: number, side: number, len: number, cot: boolean) => {
    const base = at(t);
    const spread = cot ? 64 : 46 + rng() * 18;
    const stemAng = angAt(t);
    const ang = stemAng + side * spread;
    const shape = leafShape(len, len * (cot ? 0.46 : 0.4), rng);
    leaves.push({ t, x: base[0], y: base[1], ang, fold: stemAng - ang, outline: shape.outline, detail: shape.detail, cot });
    nodes += `M${r1(base[0] - 3.5)} ${r1(base[1])}h7`;
  };
  // the two cotyledons at the tip, then the rest alternate down the upper stem
  mk(1, -1, 52 * leafScale, true);
  mk(1, 1, 52 * leafScale, true);
  const rest = Math.max(0, n - 2);
  for (let k = 0; k < rest; k++) {
    const t = 0.77 + 0.2 * (rest === 1 ? 0.2 : 1 - k / (rest - 1));
    mk(t, k % 2 === 0 ? 1 : -1, (36 + rng() * 16) * leafScale, false);
  }

  // roots: a tap root with wobble, two laterals, and fine branches
  const wob = (ax: number, ay: number, dirDeg: number, len: number, depth = 0): { main: string; fine: string } => {
    const steps = Math.max(4, Math.round(len / 18));
    const out: P2[] = [[ax, ay]];
    let px = ax;
    let py = ay;
    let dir = dirDeg;
    let fine = '';
    for (let i = 1; i <= steps; i++) {
      dir += (rng() - 0.5) * 34;
      dir = dir + (90 - dir) * 0.1;
      const seg = len / steps;
      px += Math.cos(dir * DEGR) * seg;
      py += Math.sin(dir * DEGR) * seg;
      out.push([px, py]);
      if (depth === 0 && i > 2 && i < steps && rng() < 0.55) {
        const side = rng() < 0.5 ? -1 : 1;
        const b = wob(px, py, 90 + side * (40 + rng() * 25), len * (0.22 + rng() * 0.14), 1);
        fine += b.main;
      }
    }
    return { main: `M${pts2(out).join('L')}`, fine };
  };
  const tap = wob(x, gy - 10, 90, rootLen + 10);
  const l1 = wob(x, gy - 2, 90 - 48 - rng() * 14, rootLen * 0.62);
  const l2 = wob(x, gy - 2, 90 + 48 + rng() * 14, rootLen * 0.58);
  const roots = tap.main + l1.main + l2.main;
  const fine = tap.fine + l1.fine + l2.fine;

  return { x, gy, h, stem, shade, nodes, pts, tip: p3, leaves, roots, fine };
}
