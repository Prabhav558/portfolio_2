import { mulberry32 } from '../../lib/random';

export const INK = '#050505';
export const PAPER = '#E8DCC6';
export const LATTE = '#B7A89A';
export const RED = '#722F37';

const r1 = (n: number) => {
  const v = Math.round(n * 10) / 10;
  return v === 0 ? 0 : v;
};

/* ------------------------------------------------------------------ */
/* The vessel: a flask that rhymes with "The Unpoured" jar            */
/* All coordinates live in the Hand grip viewBox (0 140 560 360).     */
/* ------------------------------------------------------------------ */

export const VES = {
  cx: 446,
  rimY: 150,
  rimRx: 39,
  rimRy: 7,
  bottom: 482,
  hwBody: 60,
  /** half-width at the neck */
  hwNeck: 30,
};

/** Half-width of the vessel at a given y (grip viewBox units). */
export function vesselHw(y: number): number {
  if (y < VES.rimY || y > VES.bottom) return 0;
  if (y < 170) return 30 + 9 * Math.pow((170 - y) / 20, 1.6);
  if (y < 196) return 30;
  if (y < 320) {
    const t = (y - 196) / 124;
    return 30 + 30 * (1 - Math.pow(1 - t, 2.3));
  }
  if (y < 468) return 60;
  const dy = y - 468;
  return 46 + Math.sqrt(Math.max(0, 14 * 14 - dy * dy));
}

export interface VesselArt {
  outline: string;
  thin: string;
  thick: string;
  rings: string;
}

export function buildVessel(): VesselArt {
  const rng = mulberry32(4411);
  const { cx } = VES;
  const right: string[] = [];
  const left: string[] = [];
  for (let y = VES.rimY; y <= VES.bottom; y += 2) {
    const hw = vesselHw(y);
    right.push(`${r1(cx + hw)} ${y}`);
    left.push(`${r1(cx - hw)} ${y}`);
  }
  const outline = `M${right.join('L')}L${left.reverse().join('L')}Z`;

  const sub = (hw: number, y: number, t0: number) => {
    const sag = hw * 0.14;
    const p0x = -hw;
    const p1x = hw;
    const c = y + 2 * sag;
    const bx = (1 - t0) * (1 - t0) * p0x + t0 * t0 * p1x;
    const by = (1 - t0) * (1 - t0) * y + 2 * (1 - t0) * t0 * c + t0 * t0 * y;
    const qx = (p1x * t0) + 0;
    const qy = c + (y - c) * t0;
    return `M${r1(cx + bx)} ${r1(by)}Q${r1(cx + qx)} ${r1(qy)} ${r1(cx + p1x)} ${r1(y)}`;
  };
  let thin = '';
  let thick = '';
  let idx = 0;
  for (let y = VES.rimY + 12; y < VES.bottom - 4; y += 5.2) {
    const hw = vesselHw(y);
    if (hw < 6) continue;
    thin += sub(hw, y, 0.12 + rng() * 0.25);
    if (idx % 2 === 0 && rng() > 0.12) thick += sub(hw, y, 0.5 + rng() * 0.32);
    idx++;
  }
  const rings = [172, 177.5, 183].map((y) => `M${cx - 33} ${y}Q${cx} ${y + 5} ${cx + 33} ${y}`).join('');
  return { outline, thin, thick, rings };
}

/* ------------------------------------------------------------------ */
/* The receiving chalice and its paper table                          */
/* ------------------------------------------------------------------ */

export const BOWL = { R: 170, D: 100, rimRy: 18, stem: 70, foot: 24 };

export interface BowlArt {
  /** right-hand shading arcs on the bowl body */
  thin: string;
  thick: string;
  /** vertical hatch for stem + foot */
  stemHatch: string;
  shadow: string;
}

export function buildBowl(): BowlArt {
  const rng = mulberry32(8123);
  const { R, D } = BOWL;
  const hw = (y: number) => R * Math.sqrt(Math.max(0, 1 - (y / D) * (y / D)));
  let thin = '';
  let thick = '';
  let idx = 0;
  for (let y = 14; y < D - 3; y += 4.6) {
    const w = hw(y);
    if (w < 8) continue;
    const sag = 0.07 * w;
    const t0 = 0.3 + rng() * 0.3;
    const c = y + 2 * sag;
    const arc = (t: number) => {
      const bx = (1 - t) * (1 - t) * -w + t * t * w;
      const by = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * c + t * t * y;
      const qx = w * t;
      const qy = c + (y - c) * t;
      return `M${r1(bx)} ${r1(by)}Q${r1(qx)} ${r1(qy)} ${r1(w)} ${r1(y)}`;
    };
    thin += arc(t0);
    if (idx % 2 === 0) thick += arc(0.62 + rng() * 0.25);
    idx++;
  }
  // stem + foot: vertical hatching on the right half
  let stemHatch = '';
  const y0 = D;
  const y1 = D + BOWL.stem;
  for (let k = 0; k < 6; k++) {
    const x = 3 + k * 2.6;
    stemHatch += `M${r1(x)} ${y0 + 6}V${r1(y1 - 4 - rng() * 6)}`;
  }
  const footY = y1;
  for (let k = 0; k < 20; k++) {
    const x = -20 + k * 6.4 + rng() * 2;
    stemHatch += `M${r1(x)} ${footY + 3}v${r1(10 + rng() * 8)}`;
  }
  // cast shadow: horizontal bars to the right of the foot
  const baseY = D + BOWL.stem + BOWL.foot;
  let shadow = '';
  for (let k = 0; k < 7; k++) {
    const y = baseY - 22 + k * 3.7;
    const len = 150 - Math.abs(k - 3) * 22 + rng() * 14;
    shadow += `M70 ${r1(y)}h${r1(len)}v2h${r1(-len)}Z`;
  }
  return { thin, thick, stemHatch, shadow };
}

/** Engraved front face of the table: horizontal lines, heavier toward the bottom. */
export function tableFace(seed: number, x0: number, x1: number, y0: number, h: number): string {
  const rng = mulberry32(seed);
  const n = 20;
  let d = '';
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    const y = y0 + 5 + t * (h - 10);
    const th = 0.8 + Math.pow(t, 1.6) * 5.2;
    let x = x0 + rng() * 80;
    while (x < x1) {
      const len = 90 + rng() * 420;
      const e = Math.min(x1, x + len);
      d += `M${r1(x)} ${r1(y)}H${r1(e)}v${r1(th)}H${r1(x)}Z`;
      x = e + 6 + rng() * 40 * (1 - t * 0.6);
    }
  }
  return d;
}

