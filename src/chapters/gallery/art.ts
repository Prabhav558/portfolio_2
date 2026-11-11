/**
 * Chapter III procedural drawing helpers. Pure functions that return SVG path
 * data strings; everything is deterministic (mulberry32) and meant to be
 * called once inside useMemo.
 */
import { mulberry32 } from '../../lib/random';

export const RED = 'var(--burgundy)';
export const RED_DEEP = 'var(--burgundy-deep)';
export const BLACK = 'var(--black)';
export const PAPER = 'var(--cream)';
export const LATTE = 'var(--latte)';
export const INK = 'var(--ink)';

export const r1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Dark = 'left' | 'right' | 'both';

interface HatchOpts {
  drip?: number;
  rise?: number;
  smear?: boolean;
  minP?: number;
  maxP?: number;
}

/**
 * Vertical scan-line hatching over a rectangle. Line weight grows toward the
 * shadow side; lines hang down from y0 (the raster "drip") and rise from y1.
 * Returns a single path of thin rectangles.
 */
export function hatchRects(
  rng: () => number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  dark: Dark,
  o: HatchOpts = {},
): string {
  const w = x1 - x0;
  const H = y1 - y0;
  if (w <= 0 || H <= 0) return '';
  const p = clamp(w / 20, o.minP ?? 2.4, o.maxP ?? 7);
  let d = '';
  for (let x = x0; x < x1 - 0.5; x += p) {
    const u = clamp((x - x0 + p / 2) / w, 0, 1);
    const t = dark === 'left' ? 1 - u : dark === 'right' ? u : Math.abs(u - 0.5) * 2;
    const lw = Math.max(0.5, Math.min(p - 0.5, p * (0.14 + 0.86 * Math.pow(t, 1.35))));
    const xj = x + (rng() - 0.5) * p * 0.25;
    const frac = clamp(t * 1.2 + (rng() - 0.5) * 0.6 - 0.06, 0.04, 1) * (o.drip ?? 1);
    d += `M${r1(xj)} ${r1(y0)}h${r1(lw)}v${r1(H * frac)}h${r1(-lw)}z`;
    const rise = clamp((t - 0.35) * 0.9 + (rng() - 0.5) * 0.4, 0, 0.5) * (o.rise ?? 0.5);
    if (rise > 0.02) d += `M${r1(xj)} ${r1(y1 - H * rise)}h${r1(lw)}v${r1(H * rise)}h${r1(-lw)}z`;
    if (o.smear) {
      const sl = H * (0.12 + rng() * 0.4);
      d += `M${r1(xj + p * 0.5)} ${r1(y0)}h0.6v${r1(sl)}h-0.6z`;
    }
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* Scene A: the red hall                                                */
/* ------------------------------------------------------------------ */

export interface HallCfg {
  w: number;
  h: number;
  vx: number;
  vy: number;
  /** Floor offset below the horizon at z = 1. */
  drop: number;
  /** Capital height above the horizon at z = 1. */
  capUp: number;
  /** Floor tile width in world X units. */
  tile: number;
  rows: { x: number; w: number; zs: number[] }[];
  doorZ: number;
  doorW: number;
  doorH: number;
  wallHW: number;
  wallTop: number;
  seed: number;
}

export interface HallTier {
  key: 'far' | 'mid' | 'near' | 'nearest';
  shadow: string;
  fill: string;
  hatch: string;
  line: string;
  sw: number;
}

const tierOf = (z: number): HallTier['key'] =>
  z < 1.45 ? 'nearest' : z < 2.8 ? 'near' : z < 4.6 ? 'mid' : 'far';

export function buildHall(c: HallCfg) {
  const rng = mulberry32(c.seed);
  const { w, h, vx, vy } = c;
  const doorFloor = vy + c.drop / c.doorZ;
  const dW = c.doorW / c.doorZ;
  const dH = c.doorH / c.doorZ;

  /* floor: checker cells, engraved lines, near-edge bands, light rays */
  const F = 900;
  const dz = c.tile / F;
  const z0 = 0.52;
  const zs: number[] = [];
  for (let z = z0; z <= c.doorZ + dz; z += dz) zs.push(z);
  let cells = '';
  let lines = '';
  for (let j = 0; j < zs.length - 1; j++) {
    const za = zs[j];
    const zb = zs[j + 1];
    const ya = vy + c.drop / za;
    const yb = vy + c.drop / zb;
    if (yb < doorFloor - 1) continue;
    lines += `M0 ${r1(ya)}H${w}`;
    const kMin = Math.floor((-vx * zb) / c.tile - 1.5);
    const kMax = Math.ceil(((w - vx) * zb) / c.tile);
    for (let k = kMin; k <= kMax; k++) {
      if ((j + k) % 2 !== 0) continue;
      const Xa = (k + 0.5) * c.tile;
      const Xb = (k + 1.5) * c.tile;
      cells += `M${r1(vx + Xa / za)} ${r1(ya)}L${r1(vx + Xb / za)} ${r1(ya)}L${r1(vx + Xb / zb)} ${r1(yb)}L${r1(vx + Xa / zb)} ${r1(yb)}Z`;
    }
  }
  const zEnd = zs[zs.length - 1];
  const kk = Math.ceil((w * zEnd) / c.tile) + 2;
  for (let k = -kk; k <= kk; k++) {
    const X = (k + 0.5) * c.tile;
    lines += `M${r1(vx + X / z0)} ${r1(vy + c.drop / z0)}L${r1(vx + X / zEnd)} ${r1(vy + c.drop / zEnd)}`;
  }

  // engraved darkening toward the viewer: broken horizontal bands
  let bands = '';
  const nb = 15;
  for (let k = 0; k < nb; k++) {
    const t = k / (nb - 1);
    const y = h * 0.8 + t * h * 0.2;
    const th = 0.8 + t * t * 6.5;
    let x = -30 + rng() * 120;
    while (x < w) {
      const len = 160 + rng() * 520;
      bands += `M${r1(x)} ${r1(y)}h${r1(len)}v${r1(th)}h${r1(-len)}z`;
      x += len + 30 + rng() * 150;
    }
  }

  // light rays fanning from the doorway across the floor
  let rays = '';
  const nr = 13;
  for (let k = 0; k < nr; k++) {
    const bx = vx + (k - (nr - 1) / 2) * (w * 0.075) + (rng() - 0.5) * 20;
    const wd = 2 + rng() * 6;
    const ax = vx + (bx - vx) * 0.03;
    rays += `M${r1(ax)} ${r1(doorFloor)}L${r1(bx - wd)} ${h + 40}L${r1(bx + wd)} ${h + 40}Z`;
  }

  /* back wall (glowing red panel that smears into the dark) */
  const wallX0 = vx - c.wallHW;
  const wallX1 = vx + c.wallHW;
  const wallHatch = hatchRects(rng, wallX0, wallX1, c.wallTop, doorFloor, 'both', {
    drip: 1,
    rise: 0.25,
    smear: true,
    minP: 3,
    maxP: 6,
  });

  /* columns */
  interface Col {
    cx: number;
    w: number;
    z: number;
    left: boolean;
  }
  const cols: Col[] = [];
  c.rows.forEach((row) =>
    row.zs.forEach((z) =>
      ([-1, 1] as const).forEach((sgn) =>
        cols.push({ cx: vx + (sgn * row.x) / z, w: row.w / z, z, left: sgn < 0 }),
      ),
    ),
  );
  cols.sort((a, b) => b.z - a.z);

  const order: HallTier['key'][] = ['far', 'mid', 'near', 'nearest'];
  const swByTier = { far: 0.8, mid: 1.1, near: 1.6, nearest: 2.2 };
  const tiers: HallTier[] = order.map((key) => ({
    key,
    shadow: '',
    fill: '',
    hatch: '',
    line: '',
    sw: swByTier[key],
  }));
  const tierBy = (k: HallTier['key']) => tiers[order.indexOf(k)];

  cols.forEach((col) => {
    const t = tierBy(tierOf(col.z));
    const { cx, w: cw, z } = col;
    const yf = vy + c.drop / z;
    const yCap = vy - c.capUp / z;
    const capH = 78 / z;
    const abH = 22 / z;
    const baseH = 48 / z;
    const x0 = cx - cw / 2;
    const x1 = cx + cw / 2;
    const dark: Dark = col.left ? 'left' : 'right';
    const yShaftEnd = yf - baseH;

    // floor shadow cast away from the doorway light
    const m = 1.9;
    const pl = [x0, yf];
    const pr = [x1, yf];
    const sp = (p: number[]) => `${r1(vx + (p[0] - vx) * m)} ${r1(doorFloor + (p[1] - doorFloor) * m)}`;
    t.shadow += `M${r1(x0)} ${r1(yf)}L${r1(x1)} ${r1(yf)}L${sp(pr)}L${sp(pl)}Z`;

    // fills (shaft, capital, abacus, plinth)
    t.fill += `M${r1(x0)} ${r1(yCap)}H${r1(x1)}V${r1(yShaftEnd)}H${r1(x0)}Z`;
    t.fill += `M${r1(cx - 0.5 * cw)} ${r1(yCap)}L${r1(cx - 0.74 * cw)} ${r1(yCap - capH)}H${r1(cx + 0.74 * cw)}L${r1(cx + 0.5 * cw)} ${r1(yCap)}Z`;
    t.fill += `M${r1(cx - 0.88 * cw)} ${r1(yCap - capH - abH)}h${r1(1.76 * cw)}v${r1(abH)}h${r1(-1.76 * cw)}Z`;
    t.fill += `M${r1(cx - 0.7 * cw)} ${r1(yShaftEnd)}h${r1(1.4 * cw)}v${r1(baseH)}h${r1(-1.4 * cw)}Z`;

    // hatching
    t.hatch += hatchRects(rng, x0, x1, yCap, yShaftEnd, dark, { smear: true, rise: 0.5 });
    t.hatch += hatchRects(rng, cx - 0.56 * cw, cx + 0.56 * cw, yCap - capH, yCap, dark, { drip: 0.9, rise: 0.2 });
    t.hatch += hatchRects(rng, cx - 0.88 * cw, cx + 0.88 * cw, yCap - capH - abH, yCap - capH, dark, { drip: 0.8, rise: 0.1 });
    t.hatch += hatchRects(rng, cx - 0.7 * cw, cx + 0.7 * cw, yShaftEnd, yf, dark, { drip: 0.4, rise: 0.8 });
    // dark band tucked under the capital
    t.hatch += `M${r1(x0)} ${r1(yCap)}h${r1(cw)}v${r1(Math.max(1.5, 16 / z))}h${r1(-cw)}z`;

    // imperfect ink contours
    const j = () => (rng() - 0.5) * Math.min(1.6, 1.4 / z + 0.3);
    const ym = (yCap + yShaftEnd) / 2;
    t.line += `M${r1(x0)} ${r1(yCap)}L${r1(x0 + j())} ${r1(ym)}L${r1(x0)} ${r1(yShaftEnd)}`;
    t.line += `M${r1(x1)} ${r1(yCap)}L${r1(x1 + j())} ${r1(ym)}L${r1(x1)} ${r1(yShaftEnd)}`;
    t.line += `M${r1(cx - 0.5 * cw)} ${r1(yCap)}L${r1(cx - 0.74 * cw)} ${r1(yCap - capH)}H${r1(cx + 0.74 * cw)}L${r1(cx + 0.5 * cw)} ${r1(yCap)}`;
    t.line += `M${r1(cx - 0.88 * cw)} ${r1(yCap - capH - abH)}h${r1(1.76 * cw)}v${r1(abH)}h${r1(-1.76 * cw)}Z`;
    t.line += `M${r1(cx - 0.7 * cw)} ${r1(yShaftEnd)}h${r1(1.4 * cw)}v${r1(baseH)}h${r1(-1.4 * cw)}Z`;
  });

  /* doorway */
  const dTop = doorFloor - dH;
  const arch = (pad: number) =>
    `M${r1(vx - dW / 2 - pad)} ${r1(doorFloor)}V${r1(dTop + dW / 2)}A${r1(dW / 2 + pad)} ${r1(dW / 2 + pad)} 0 0 1 ${r1(vx + dW / 2 + pad)} ${r1(dTop + dW / 2)}V${r1(doorFloor)}Z`;
  const doorOpen = arch(0);
  const doorFrame = arch(Math.max(2, dW * 0.1));
  const keeperScale = (dH * 0.8) / 60;

  // radiating ticks of light
  let ticks = '';
  const dcx = vx;
  const dcy = doorFloor - dH * 0.55;
  const nt = 26;
  for (let k = 0; k < nt; k++) {
    const a = (k / nt) * Math.PI * 2 + rng() * 0.1;
    const r0 = dH * (0.82 + rng() * 0.12);
    const r1_ = r0 + 5 + rng() * 14;
    ticks += `M${r1(dcx + Math.cos(a) * r0 * 0.78)} ${r1(dcy + Math.sin(a) * r0)}L${r1(dcx + Math.cos(a) * r1_ * 0.78)} ${r1(dcy + Math.sin(a) * r1_)}`;
  }

  // dust in the void
  let motes = '';
  for (let k = 0; k < 22; k++) {
    const a = rng() * Math.PI * 2;
    const rr = (30 + rng() * 150) * (w / 1600);
    const s = 1 + rng() * 1.6;
    motes += `M${r1(vx + Math.cos(a) * rr * 1.7)} ${r1(dcy + Math.sin(a) * rr * 0.9)}h${r1(s)}v${r1(s)}h${r1(-s)}Z`;
  }

  return {
    vp: `${vx} ${vy}`,
    doorBase: `${vx} ${r1(doorFloor)}`,
    doorFloor,
    floorTop: doorFloor - 1,
    cells,
    lines,
    bands,
    rays,
    wall: { x: wallX0, y: c.wallTop, w: c.wallHW * 2, h: doorFloor - c.wallTop, hatch: wallHatch },
    tiers,
    door: { open: doorOpen, frame: doorFrame, ticks, keeperScale, dW, dH },
    motes,
  };
}

export type HallArt = ReturnType<typeof buildHall>;
