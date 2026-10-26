import { hatch } from '../../art';
import { mulberry32 } from '../../lib/random';

/** Everything in the facade is drawn on the LEFT of the axis x = cx and mirrored for the right. */
export interface Layout {
  mobile: boolean;
  W: number;
  H: number;
  cx: number;
  cy: number;
  /** outer / inner radius of the gate ring */
  R: number;
  r: number;
  ground: number;
  col: { x: number; w: number; top: number };
  panel: { x0: number; y0: number; y1: number };
  plinth?: { x0: number; y0: number; y1: number };
  attic?: { x0: number; y0: number; y1: number };
  band: { x0: number; y0: number; y1: number; font: number };
  treads: number[];
  stair: { topHalf: number; botHalf: number };
  fig: { x: number; y: number; w: number; h: number };
}

export const DESKTOP: Layout = {
  mobile: false,
  W: 1600,
  H: 900,
  cx: 800,
  cy: 490,
  R: 318,
  r: 262,
  ground: 808,
  col: { x: 262, w: 118, top: 150 },
  panel: { x0: 346, y0: 170, y1: 714 },
  plinth: { x0: 346, y0: 732, y1: 808 },
  band: { x0: 346, y0: 106, y1: 158, font: 19 },
  treads: [808, 838, 872],
  stair: { topHalf: 190, botHalf: 330 },
  fig: { x: 696, y: 268, w: 208, h: 520 },
};

export const MOBILE: Layout = {
  mobile: true,
  W: 700,
  H: 1300,
  cx: 350,
  cy: 650,
  R: 236,
  r: 190,
  ground: 886,
  col: { x: 76, w: 46, top: 262 },
  panel: { x0: 128, y0: 330, y1: 700 },
  attic: { x0: 128, y0: 176, y1: 222 },
  band: { x0: 128, y0: 270, y1: 318, font: 15 },
  treads: [886, 922, 966, 1020, 1086, 1166, 1262],
  stair: { topHalf: 150, botHalf: 330 },
  fig: { x: 270, y: 470, w: 152, h: 380 },
};

/** SVG arc path along a circle; angles in degrees, 0 = right, 90 = down. */
export function arc(cx: number, cy: number, rad: number, a0: number, a1: number) {
  const p = (a: number) => {
    const t = (a * Math.PI) / 180;
    return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)] as const;
  };
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 >= a0 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${rad.toFixed(1)} ${rad.toFixed(1)} 0 ${large} ${sweep} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** Woodcut-moon engraving: concentric broken arcs, dense and black toward the limb. */
export function diskArt(cx: number, cy: number, r: number, seed: number) {
  const rnd = mulberry32(seed);
  const deep: string[] = [];
  const black: string[] = [];
  const thin: string[] = [];
  for (let rad = 12; rad < r - 6; rad += 4.2 + rnd() * 3) {
    const n = rad > r * 0.7 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a0 = rnd() * 360;
      const sweep = 24 + rnd() * (rad > r * 0.7 ? 150 : 110);
      deep.push(arc(cx, cy, rad, a0, a0 + sweep));
    }
  }
  // limb shading: left, top-left and the right crescent
  const group = (center: number, half: number, depth: number, step: number, into: string[], jit = 10) => {
    for (let j = 0; j * step < depth; j++) {
      const rad = r - 3 - j * step;
      const h = half * (1 - (j * step) / (depth * 1.25));
      const a0 = center - h + (rnd() - 0.5) * jit;
      const a1 = center + h + (rnd() - 0.5) * jit;
      into.push(arc(cx, cy, rad, a0, a1));
      if (rnd() < 0.35) into.push(arc(cx, cy, rad - step * 0.5, a0 + h * 0.3, a1 - h * 0.2));
    }
  };
  group(172, 74, r * 0.16, 3.1, black);
  group(8, 64, r * 0.2, 2.7, black, 6);
  group(262, 62, r * 0.09, 3.4, thin, 14);
  group(110, 40, r * 0.07, 3.6, thin, 14);

  // crescent cut on the right
  const th = 60;
  const t = (th * Math.PI) / 180;
  const px = cx + r * Math.cos(t);
  const dy = r * Math.sin(t);
  const R2 = r * 1.34;
  const crescent = `M${px.toFixed(1)} ${(cy - dy).toFixed(1)}A${r} ${r} 0 0 1 ${px.toFixed(1)} ${(cy + dy).toFixed(1)}A${R2.toFixed(1)} ${R2.toFixed(1)} 0 0 0 ${px.toFixed(1)} ${(cy - dy).toFixed(1)}Z`;

  return { deep: deep.join(''), black: black.join(''), thin: thin.join(''), crescent };
}

interface ColumnGeo {
  shaft: string;
  abacus: string;
  echinus: string;
  base: string;
  plinth: string;
  flutes: string;
  shade: string;
  light: string;
}

export function columnGeo(cx: number, w: number, top: number, bottom: number, seed: number): ColumnGeo {
  const ab = w * 0.2;
  const ec = w * 0.24;
  const sTop = top + ab + ec;
  const baseH = w * 0.3;
  const sBot = bottom - baseH;
  const hT = w * 0.4;
  const hB = w * 0.47;
  const half = (y: number) => hT + (hB - hT) * Math.pow((y - sTop) / (sBot - sTop), 0.8);
  const f = (n: number) => n.toFixed(1);
  const shaft = `M${f(cx - hT)} ${f(sTop)}L${f(cx + hT)} ${f(sTop)}L${f(cx + half((sTop + sBot) / 2) + 1)} ${f((sTop + sBot) / 2)}L${f(cx + hB)} ${f(sBot)}L${f(cx - hB)} ${f(sBot)}L${f(cx - half((sTop + sBot) / 2) - 1)} ${f((sTop + sBot) / 2)}Z`;
  const rect = (x0: number, x1: number, y0: number, y1: number) => `M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;
  const abacus = rect(cx - w * 0.64, cx + w * 0.64, top, top + ab);
  const echinus = `M${f(cx - w * 0.56)} ${f(top + ab)}H${f(cx + w * 0.56)}L${f(cx + hT + 3)} ${f(sTop)}H${f(cx - hT - 3)}Z`;
  const base = rect(cx - w * 0.58, cx + w * 0.58, sBot, sBot + baseH * 0.45);
  const plinth = rect(cx - w * 0.68, cx + w * 0.68, sBot + baseH * 0.45, bottom);
  let flutes = '';
  for (const u of [-0.6, -0.3, 0, 0.3, 0.6]) {
    flutes += `M${f(cx + u * hT)} ${f(sTop + 4)}L${f(cx + u * hB)} ${f(sBot - 2)}`;
  }
  const shade = hatch({
    seed,
    x: cx + half(sBot) * 0.12,
    y: sTop,
    width: half(sBot) * 0.9,
    height: sBot - sTop,
    angle: 90,
    spacing: 4.8,
    spacing2: 1.5,
    wobble: 0.5,
    breakChance: 0.05,
    step: 40,
  });
  const light = hatch({
    seed: seed + 1,
    x: cx - hB,
    y: sTop,
    width: hB * 1.1,
    height: sBot - sTop,
    angle: 90,
    spacing: 12,
    spacing2: 8,
    wobble: 0.6,
    breakChance: 0.25,
    step: 40,
  });
  return { shaft, abacus, echinus, base, plinth, flutes, shade, light };
}

/** Engraved black panel: alternating dark / light vertical bands with paper / ink hatching. */
export function panelBands(x0: number, x1: number, y0: number, y1: number, seed: number) {
  const rnd = mulberry32(seed);
  const bands: { x: number; w: number; dark: boolean; lines: string; dense: string }[] = [];
  const total = x1 - x0;
  const nominal = total / Math.max(5, Math.round(total / 52));
  // build from the inner edge outward so the pattern reads as a mirror about the axis
  let x = x1;
  let i = 0;
  while (x > x0 + 6) {
    const w = Math.min(x - x0, nominal * (0.6 + rnd() * 0.9));
    const dark = i % 2 === 0 ? rnd() > 0.12 : rnd() > 0.7;
    const bx = x - w;
    const h = y1 - y0;
    const lines = hatch({
      seed: seed + i * 7,
      x: bx,
      y: y0,
      width: w,
      height: h,
      angle: 90,
      spacing: dark ? 6.2 + rnd() * 2 : 9 + rnd() * 5,
      spacing2: dark ? 3.4 : 5.5,
      wobble: 1.3,
      breakChance: 0.07,
      step: 22,
    });
    const dense = hatch({
      seed: seed + i * 7 + 3,
      x: bx,
      y: y0 + h * 0.66,
      width: w,
      height: h * 0.34,
      angle: 90,
      spacing: dark ? 4.4 : 2.6,
      spacing2: dark ? 2.6 : 1.6,
      wobble: 1.1,
      breakChance: 0.03,
      step: 16,
    });
    bands.push({ x: bx, w, dark, lines, dense });
    x = bx;
    i++;
  }
  return bands;
}
