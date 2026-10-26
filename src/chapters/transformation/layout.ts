import { skills } from '../../config/portfolio';
import { BOWL } from './art';
import { buildPlant, type PlantGeom } from './worldArt';

/** chalice fill levels (0..1) at which the engraved marks sit and each step is called out */
export const MARK_FILL = [0.18, 0.4, 0.62, 0.84];

/** Bowl-local water paths (origin: centre of the rim; they hug the outside of the bowl). */
export const RIVULETS = [
  'M-140 11C-150 38 -128 64 -96 78C-66 90 -34 96 -15 103',
  'M-78 15C-88 40 -70 66 -46 84C-32 94 -20 99 -14 105',
  'M-18 18C-24 46 -10 78 -10 104',
];
export const STEM_RUN = 'M-12 100C-16 124 -7 146 -17 168';
export const FOOT_RUN = 'M-17 167C-36 177 -78 182 -91 192';

export interface Terrace {
  y: number;
  x0: number;
  x1: number;
  /** visible face (soil cross-section) height */
  face: number;
  /** where the water arrives on this terrace */
  impact: number;
  /** final half-width of the pool and the soaked region */
  poolRx: number;
  wetRx: number;
  wetRy: number;
}

export interface SproutCfg {
  g: number;
  x: number;
  gy: number;
  terrace: number;
  n: number;
  h: number;
  tag: 'c' | 'l' | 'r';
  tagW: number;
  /** eyelet position across a centred tag (0..1) */
  eye: number;
  /** timeline position (percent of the scroll) where this sprout germinates */
  start: number;
  rootLen: number;
  leafScale: number;
}

export interface Layout {
  key: 'desk' | 'mob';
  /** design width and the design height the viewport is fitted to */
  w: number;
  fitH: number;
  /** world height drawn (flow mode shows this much) */
  flowH: number;
  /** CSS width of the hand/vessel rig; height follows the 560:360 grip viewBox */
  rigW: number;
  A0: [number, number];
  enter: [number, number];
  bowl: { x: number; rimY: number; s: number };
  streamW: number;
  mark: { len: number; text: number };
  tableTop: number;
  G: number;
  /** column x and the run path (foot -> table edge) / fall path (gutter -> ground) */
  xi: number;
  runD: string;
  fallD: string;
  /** the fall as a broken column: thick, thinner, drops. a/b are the fractions of the whole fall each piece covers */
  fallSegs: { d: string; w: number; a: number; b: number }[];
  cascades: string[];
  terraces: Terrace[];
  sprouts: SproutCfg[];
  steps: { mode: 'column' | 'slot'; x: number; y: number; w: number };
  /** the camera's last position for a viewport of vhd design units */
  camEnd: (vhd: number, f: number) => number;
  /** camera focus (world y at mid view) for each terrace while the garden grows */
  focus: number[];
}

const SOIL_MIN = 150;
const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type V = [number, number];
const lerp = (p: V, q: V, t: number): V => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
/** The piece [a,b] of a cubic bezier (de Casteljau), as a path. */
function cubicPiece(p0: V, p1: V, p2: V, p3: V, a: number, b: number) {
  const split = (c: V[], t: number): [V[], V[]] => {
    const a1 = lerp(c[0], c[1], t), a2 = lerp(c[1], c[2], t), a3 = lerp(c[2], c[3], t);
    const b1 = lerp(a1, a2, t), b2 = lerp(a2, a3, t);
    const m = lerp(b1, b2, t);
    return [[c[0], a1, b1, m], [m, b2, a3, c[3]]];
  };
  let c: V[] = [p0, p1, p2, p3];
  if (a > 0) c = split(c, a)[1];
  if (b < 1) c = split(c, (b - a) / (1 - a))[0];
  const f = (v: V) => `${Math.round(v[0] * 10) / 10} ${Math.round(v[1] * 10) / 10}`;
  return `M${f(c[0])}C${f(c[1])} ${f(c[2])} ${f(c[3])}`;
}
const fallPieces = (x: number, y0: number, y1: number, wk: number) => {
  const p0: V = [x, y0], p1: V = [x + 6, y0 + (y1 - y0) * 0.27], p2: V = [x - 7, y1 - (y1 - y0) * 0.43], p3: V = [x, y1];
  const spec: [number, number, number][] = [[0, 0.42, 10], [0.47, 0.66, 7.6], [0.71, 0.83, 6], [0.88, 0.95, 4.8]];
  return spec.map(([a, b, w]) => ({ d: cubicPiece(p0, p1, p2, p3, a, b), w: w * wk, a, b }));
};

const cascadeFrom = (t: Terrace, to: Terrace, goRight: boolean) => {
  const sx = goRight ? t.x1 : t.x0;
  const dir = goRight ? 1 : -1;
  const ex = sx + 6 * dir;
  return `M${sx - 54 * dir} ${t.y - 8}C${sx - 20 * dir} ${t.y - 8} ${ex} ${t.y - 6} ${ex + 4 * dir} ${t.y + 6}C${ex + 7 * dir} ${t.y + 30} ${ex + 5 * dir} ${t.y + 60} ${ex + 6 * dir} ${to.y - 12}`;
};

function makeDesk(): Layout {
  const bowl = { x: 930, rimY: 606, s: 1 };
  const base = bowl.rimY + (BOWL.D + BOWL.stem + BOWL.foot) * bowl.s;
  const tableTop = base + 6;
  const G = 1010;
  const xi = 650;
  const Yg = 1830;
  const fx = bowl.x - 91 * bowl.s;
  const fy = bowl.rimY + 192 * bowl.s;
  const runD = `M${fx} ${fy}C${fx - 12} ${fy + 24} ${fx + 6} ${fy + 52} ${fx - 10} ${fy + 78}C${fx - 30} ${fy + 108} ${xi + 36} ${G - 72} ${xi} ${G}`;
  const fallD = `M${xi} ${G}C${xi + 6} ${G + 220} ${xi - 7} ${Yg - 380} ${xi} ${Yg - 14}`;
  const terraces: Terrace[] = [{ y: Yg, x0: -900, x1: 2500, face: 420, impact: xi, poolRx: 780, wetRx: 860, wetRy: 330 }];
  const xs = [200, 500, 800, 1100, 1400];
  const starts = [76.2, 69.5, 70.1, 76.8, 81.6];
  const tagW = [290, 250, 230, 250, 260];
  const sprouts: SproutCfg[] = skills.map((s, g) => ({
    g,
    x: xs[g],
    gy: Yg,
    terrace: 0,
    n: s.items.length,
    h: 220 + 22 * s.items.length,
    tag: 'c',
    tagW: tagW[g],
    eye: g % 2 ? 0.76 : 0.24,
    start: starts[g],
    rootLen: 168,
    leafScale: 1,
  }));
  return {
    key: 'desk',
    w: 1600,
    fitH: 880,
    flowH: Yg + 270,
    rigW: 760,
    A0: [520, 292],
    enter: [-100, 300],
    bowl,
    streamW: 21,
    mark: { len: 32, text: 46 },
    tableTop,
    G,
    xi,
    runD,
    fallD,
    fallSegs: fallPieces(xi, G, Yg - 14, 1),
    cascades: [],
    terraces,
    sprouts,
    steps: { mode: 'column', x: 1226, y: 846, w: 296 },
    camEnd: (vhd) => Yg - (vhd >= 890 ? 740 : vhd - SOIL_MIN),
    focus: [Yg],
  };
}

function makeMob(): Layout {
  const bowl = { x: 250, rimY: 650, s: 0.8 };
  const base = bowl.rimY + (BOWL.D + BOWL.stem + BOWL.foot) * bowl.s;
  const tableTop = base + 6;
  const G = 968;
  const xi = 225;
  const Y0 = 1440;
  const T = 185;
  const face = 66;
  const terraces: Terrace[] = [0, 1, 2, 3, 4].map((i) => {
    const even = i % 2 === 0;
    return {
      y: Y0 + T * i,
      x0: even ? -150 : 100,
      x1: even ? 360 : 600,
      face,
      impact: i === 0 ? xi : even ? 94 : 366,
      poolRx: 400,
      wetRx: 460,
      wetRy: 96,
    };
  });
  const fx = bowl.x - 91 * bowl.s;
  const fy = bowl.rimY + 192 * bowl.s;
  const runD = `M${fx} ${fy}C${fx - 8} ${fy + 20} ${fx + 4} ${fy + 40} ${fx - 6} ${fy + 60}C${fx - 20} ${fy + 84} ${xi + 24} ${G - 52} ${xi} ${G}`;
  const fallD = `M${xi} ${G}C${xi + 5} ${G + 150} ${xi - 5} ${Y0 - 250} ${xi} ${Y0 - 14}`;
  const cascades = [0, 1, 2, 3].map((i) => cascadeFrom(terraces[i], terraces[i + 1], i % 2 === 0));
  const wetAt = (i: number) => 61 + 5.2 * i;
  const sprouts: SproutCfg[] = skills.map((s, g) => {
    const even = g % 2 === 0;
    return {
      g,
      x: even ? 64 : 388,
      gy: terraces[g].y,
      terrace: g,
      n: s.items.length,
      h: 78 + 11 * s.items.length,
      tag: even ? 'r' : 'l',
      tagW: 296,
      eye: 0.5,
      start: wetAt(g) + 2.6,
      rootLen: 62,
      leafScale: 0.8,
    };
  });
  const lastY = terraces[4].y;
  return {
    key: 'mob',
    w: 450,
    fitH: 975,
    flowH: lastY + face + 40,
    rigW: 350,
    A0: [80, 452],
    enter: [-20, 220],
    bowl,
    streamW: 12,
    mark: { len: 20, text: 28 },
    tableTop,
    G,
    xi,
    runD,
    fallD,
    fallSegs: fallPieces(xi, G, Y0 - 14, 0.8),
    cascades,
    terraces,
    sprouts,
    steps: { mode: 'slot', x: 20, y: 284, w: 410 },
    // last stop: nudged so the second terrace's tag clears the fixed header block (about 178px) on short phones too
    camEnd: (vhd, f) => lastY + face + 40 - vhd - clampN(765 - vhd + 178 / f, 0, 100),
    // the current terrace sits low in the frame (about 78% down) so the tags of the two terraces above it stay clear of the header
    focus: terraces.map((t) => t.y - 273),
  };
}

export const DESK = makeDesk();
export const MOB = makeMob();
export const wetStart = (L: Layout, i: number) => (L.key === 'mob' ? 61 + 5.2 * i : 62);

/** World-space point where a step's leader line leaves the chalice. */
export function markPoint(L: Layout, i: number): [number, number] {
  const { R, D } = BOWL;
  const d = D * (1 - MARK_FILL[i] * 0.96);
  const x = R * Math.sqrt(1 - (d / D) * (d / D));
  return [L.bowl.x + (x + L.mark.text + 30) * L.bowl.s, L.bowl.rimY + d * L.bowl.s];
}

export const bowlBase = (L: Layout) => L.bowl.rimY + (BOWL.D + BOWL.stem + BOWL.foot) * L.bowl.s;

const gardens = new Map<string, PlantGeom[]>();
/** Plants are deterministic: the markup and the rig read the same geometry. */
export function gardenOf(L: Layout): PlantGeom[] {
  let g = gardens.get(L.key);
  if (!g) {
    g = L.sprouts.map((s) => buildPlant(31 + s.g * 17 + (L.key === 'mob' ? 5 : 0), s.x, s.gy, s.h, s.n, s.rootLen, s.leafScale));
    gardens.set(L.key, g);
  }
  return g;
}

/** Index of the stem sample the tag's string ties to (centred tags hang from the upper-middle). */
export const TIE_INDEX = 28;
