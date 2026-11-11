import { useId } from 'react';
import type { CSSProperties } from 'react';
import {
  contourHatch,
  crossHatch,
  insidePoly,
  polySmooth,
  resample,
  sampleClosed,
  smoothPath,
} from './procedural';
import type { Pt } from './procedural';

/* ------------------------------------------------------------------ */
/* Public constants                                                    */
/* ------------------------------------------------------------------ */

export type HandPose = 'reach' | 'grip';

/** viewBox rectangles ("x y w h") per pose; all exported coordinates live in this user space */
export const HAND_VIEWBOX = {
  reach: { x: 250, y: 190, w: 750, h: 450 },
  grip: { x: 0, y: 140, w: 560, h: 360 },
} as const;

const INK = 'var(--black)';
const PAPER = 'var(--cream)';

/* ------------------------------------------------------------------ */
/* Geometry helpers (module level: computed once)                      */
/* ------------------------------------------------------------------ */

interface Frame {
  ox: number;
  oy: number;
  hx: number;
  hy: number;
  ux: number;
  uy: number;
}
/** hand frame: a = along the hand toward the fingers, b = sideways ("up" side = +b) */
const mkFrame = (ox: number, oy: number, deg: number): Frame => {
  const a = (deg * Math.PI) / 180;
  const hx = Math.cos(a);
  const hy = Math.sin(a);
  return { ox, oy, hx, hy, ux: -hy, uy: hx };
};
const P = (f: Frame, a: number, b: number): Pt => [f.ox + f.hx * a + f.ux * b, f.oy + f.hy * a + f.uy * b];

/** Walk a centerline in hand-frame coordinates; heading turns by `bend` (power-eased). */
function limb(f: Frame, a0: number, b0: number, th0: number, bend: number, power: number, len: number): Pt[] {
  const n = Math.max(8, Math.ceil(len / 5));
  const ds = len / n;
  let a = a0;
  let b = b0;
  const out: Pt[] = [P(f, a, b)];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const th = th0 + bend * Math.pow(t, power);
    a += Math.cos(th) * ds;
    b += Math.sin(th) * ds;
    out.push(P(f, a, b));
  }
  return out;
}

interface TubeOut {
  poly: Pt[];
  center: Pt[];
  hws: number[];
  tipPt: Pt;
  tipDir: Pt;
}

function tangents(c: Pt[]): Pt[] {
  return c.map((_, i) => {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(c.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l] as Pt;
  });
}

function tube(center0: Pt[], hw: (t: number) => number, cap = true): TubeOut {
  const center = resample(center0, 5);
  const T = tangents(center);
  const n = center.length;
  const hws = center.map((_, i) => hw(i / (n - 1)));
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const nx = -T[i][1];
    const ny = T[i][0];
    L.push([center[i][0] + nx * hws[i], center[i][1] + ny * hws[i]]);
    R.push([center[i][0] - nx * hws[i], center[i][1] - ny * hws[i]]);
  }
  const poly: Pt[] = [...L];
  const e = center[n - 1];
  const te = T[n - 1];
  const ne: Pt = [-te[1], te[0]];
  const he = hws[n - 1];
  if (cap) {
    for (let k = 1; k < 8; k++) {
      const ang = (k * Math.PI) / 8;
      poly.push([
        e[0] + ne[0] * Math.cos(ang) * he + te[0] * Math.sin(ang) * he,
        e[1] + ne[1] * Math.cos(ang) * he + te[1] * Math.sin(ang) * he,
      ]);
    }
  }
  for (let i = n - 1; i >= 0; i--) poly.push(R[i]);
  return { poly, center, hws, tipPt: [e[0] + te[0] * he, e[1] + te[1] * he], tipDir: te };
}

/* ------------------------------------------------------------------ */
/* Pose configuration                                                  */
/* ------------------------------------------------------------------ */

interface FingerSpec {
  name: 'index' | 'middle' | 'ring' | 'pinky';
  a: number;
  b: number;
  th0: number;
  bend: number;
  pow: number;
  len: number;
  hw0: number;
  hw1: number;
  nail: boolean;
}

interface PoseSpec {
  frame: Frame;
  /** +1: arm leaves toward +b ("down" in the grip), -1: toward -b */
  armSide: 1 | -1;
  armTilt: number;
  armLen: number;
  cuffD: number;
  fingers: FingerSpec[];
  thumb: { a: number; b: number; th0: number; bend: number; pow: number; len: number; hw0: number; hw1: number };
}

const REACH: PoseSpec = {
  frame: mkFrame(660, 352, 192),
  armSide: -1,
  armTilt: 10,
  armLen: 560,
  cuffD: 270,
  fingers: [
    { name: 'pinky', a: 132, b: 59, th0: 0.2, bend: -1.0, pow: 1.3, len: 124, hw0: 15, hw1: 11.5, nail: false },
    { name: 'ring', a: 138, b: 26, th0: 0.14, bend: -0.78, pow: 1.3, len: 152, hw0: 18, hw1: 14, nail: false },
    { name: 'middle', a: 142, b: -11, th0: 0.1, bend: -0.55, pow: 1.3, len: 172, hw0: 20, hw1: 15.5, nail: false },
    { name: 'index', a: 146, b: -48, th0: -0.05, bend: 0.14, pow: 1.4, len: 192, hw0: 19, hw1: 14, nail: true },
  ],
  thumb: { a: 40, b: -42, th0: -0.66, bend: 1.0, pow: 1.2, len: 232, hw0: 29, hw1: 14.5 },
};

const GRIP: PoseSpec = {
  frame: mkFrame(196, 322, 0),
  armSide: 1,
  armTilt: 7,
  armLen: 520,
  cuffD: 150,
  fingers: [
    { name: 'pinky', a: 132, b: 59, th0: -0.04, bend: 1.5, pow: 1.9, len: 150, hw0: 15, hw1: 11.5, nail: false },
    { name: 'ring', a: 138, b: 26, th0: -0.05, bend: 1.35, pow: 1.9, len: 160, hw0: 18, hw1: 13.5, nail: false },
    { name: 'middle', a: 142, b: -11, th0: -0.05, bend: 1.2, pow: 1.9, len: 166, hw0: 20, hw1: 14.5, nail: false },
    { name: 'index', a: 146, b: -48, th0: -0.04, bend: 1.05, pow: 1.9, len: 168, hw0: 19, hw1: 14, nail: false },
  ],
  thumb: { a: 44, b: -44, th0: -1.0, bend: 1.4, pow: 1.1, len: 222, hw0: 29, hw1: 14.5 },
};

/** palm / back of hand anchors in hand-frame (a, b) */
const PALM_ANCHORS: Array<[number, number]> = [
  [-14, 46],
  [16, 58],
  [50, 66],
  [92, 72],
  [130, 73],
  [156, 71],
  [170, 67],
  [177, 60],
  [177, 49],
  [178, 41],
  [184, 33],
  [188, 22],
  [187, 12],
  [190, 3],
  [196, -7],
  [197, -19],
  [193, -28],
  [192, -37],
  [194, -48],
  [193, -59],
  [185, -67],
  [168, -72],
  [150, -77],
  [124, -85],
  [96, -93],
  [66, -96],
  [36, -88],
  [10, -71],
  [-14, -54],
  [-24, -40],
  [-26, 0],
  [-24, 40],
];

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

interface Part {
  key: string;
  poly: Pt[];
  fill: string;
  outline: string;
  dense: string;
  sparse: string;
  s1: Pt;
  s2: Pt;
  detail: string;
  detailThin: string;
  nail?: { fill: string; ticks: string };
  pivot: Pt;
}

interface HandGeo {
  arm: {
    skin: Part;
    sleeve: string;
    folds: string;
    cuff: Part;
    detail: string;
  };
  palm: Part;
  thumb: Part;
  fingers: Part[]; // pinky, ring, middle
  index: Part;
  tip: Pt;
  pivots: Record<string, Pt>;
}

const lightShift = (len: number): Pt => [-len * 0.14, -len];

function fingerPart(spec: FingerSpec, f: Frame, seed: number, shadowGain: number): { part: Part; tube: TubeOut } {
  const center = limb(f, spec.a, spec.b, spec.th0, spec.bend, spec.pow, spec.len);
  const hidden = 30;
  const vis = spec.len - hidden;
  const j1 = (hidden + vis * 0.4) / spec.len;
  const j2 = (hidden + vis * 0.72) / spec.len;
  const hwf = (t: number) => {
    const base = spec.hw0 + (spec.hw1 - spec.hw0) * Math.pow(t, 0.85);
    const bump =
      1 +
      0.07 * Math.exp(-(((t - j1) / 0.045) ** 2)) +
      0.06 * Math.exp(-(((t - j2) / 0.045) ** 2)) +
      0.05 * Math.exp(-(((t - 0.12) / 0.07) ** 2));
    const pad = t > 0.9 ? 1 - 0.06 * ((t - 0.9) / 0.1) : 1;
    return base * bump * pad;
  };
  const tb = tube(center, hwf);
  const hwMax = Math.max(...tb.hws);
  const fill = smoothPath(tb.poly.filter((_, i) => i % 2 === 0 || i === tb.poly.length - 1), true);
  const dense = contourHatch({
    seed,
    center: tb.center,
    from: -hwMax - 1,
    to: hwMax + 1,
    spacing: 3.1,
    spacing2: 3.1,
    wobble: 0.5,
    breakChance: 0.05,
    step: 10,
  });
  const sparse = contourHatch({
    seed: seed + 1,
    center: tb.center,
    from: -hwMax - 1,
    to: hwMax + 1,
    spacing: 6.2,
    wobble: 0.6,
    breakChance: 0.1,
    step: 10,
  });
  // joint creases
  const idx = (t: number) => Math.round(t * (tb.center.length - 1));
  let detail = '';
  for (const j of [j1, j2]) {
    const i = idx(j);
    const seg = tb.center.slice(Math.max(0, i - 2), Math.min(tb.center.length, i + 3));
    detail += crossHatch({
      seed: seed + 7 + i,
      center: seg,
      halfWidth: tb.hws[i] * 0.62,
      spacing: 3.2,
      bow: 2,
      fromFrac: -0.9,
      toFrac: 0.9,
      breakChance: 0.15,
    });
  }
  let nail: Part['nail'];
  if (spec.nail) {
    const i0 = idx(0.82);
    const i1 = tb.center.length - 1;
    const seg = tb.center.slice(i0, i1 + 1);
    const nt = tube(seg, (t) => tb.hws[i0] * (0.5 + 0.08 * t), true);
    // pull the distal end back so it sits inside the pad
    const np = nt.poly.map((p) => p);
    nail = {
      fill: smoothPath(np, true),
      ticks: contourHatch({
        seed: seed + 31,
        center: seg,
        from: -tb.hws[i0] * 0.44,
        to: -tb.hws[i0] * 0.1,
        spacing: 2.4,
        wobble: 0.2,
        breakChance: 0.1,
        step: 6,
      }),
    };
  }
  const piv = tb.center[0];
  const s2: Pt = lightShift(10.5 * shadowGain);
  return {
    tube: tb,
    part: {
      key: spec.name,
      poly: tb.poly,
      fill,
      outline: fill,
      dense,
      sparse,
      s1: lightShift(4 * shadowGain),
      s2,
      detail,
      detailThin: '',
      nail,
      pivot: [piv[0], piv[1]],
    },
  };
}

function buildHand(spec: PoseSpec, pose: HandPose): HandGeo {
  const f = spec.frame;
  const seedBase = pose === 'reach' ? 100 : 300;

  /* ---- arm ---- */
  const dTilt = (spec.armTilt * Math.PI) / 180;
  const armCenter: Pt[] = [];
  for (let D = -12; D <= spec.armLen; D += 10) {
    const a = -D * Math.cos(dTilt);
    const b = spec.armSide * (D * Math.sin(dTilt) + 14 * Math.sin((Math.PI * Math.max(0, D)) / spec.armLen));
    armCenter.push(P(f, a, b));
  }
  const armHw = (t: number) => {
    const D = -12 + t * (spec.armLen + 12);
    const taper = 0.84 + 0.16 * Math.min(1, (D + 12) / 30);
    return taper * (54 + 22 * (1 - Math.exp(-Math.max(0, D) / 220)) + 4 * Math.exp(-(((D - 110) / 70) ** 2)));
  };
  const armT = tube(armCenter, armHw, false);
  const armFill = smoothPath(armT.poly.filter((_, i) => i % 3 === 0 || i === armT.poly.length - 1), true);
  const armDenseStep = 30;
  const armHwMax = Math.max(...armT.hws);
  const armSkin: Part = {
    key: 'arm',
    poly: armT.poly,
    fill: armFill,
    outline: armFill,
    dense: contourHatch({
      seed: seedBase + 2,
      center: armT.center.slice(2),
      from: -armHwMax,
      to: armHwMax,
      spacing: 4.6,
      wobble: 0.9,
      breakChance: 0.07,
      step: armDenseStep,
    }),
    sparse: contourHatch({
      seed: seedBase + 3,
      center: armT.center.slice(2),
      from: -armHwMax,
      to: armHwMax,
      spacing: 9.4,
      wobble: 1.1,
      breakChance: 0.12,
      step: armDenseStep,
    }),
    s1: lightShift(8),
    s2: lightShift(22),
    detail: '',
    detailThin: '',
    pivot: [0, 0],
  };
  // arm-axis helpers for cuff / sleeve
  const atD = (D: number) => {
    const t = (D + 12) / (spec.armLen + 12);
    const i = Math.min(armT.center.length - 1, Math.max(0, Math.round(t * (armT.center.length - 1))));
    return i;
  };
  const ringAt = (D0: number, D1: number, grow: (D: number) => number, step = 6): Pt[] => {
    const Lp: Pt[] = [];
    const Rp: Pt[] = [];
    for (let D = D0; D <= D1 + 0.01; D += step) {
      const i = atD(D);
      const c = armT.center[i];
      const T = tangents(armT.center)[i];
      const w = armT.hws[i] + grow(D);
      Lp.push([c[0] - T[1] * w, c[1] + T[0] * w]);
      Rp.push([c[0] + T[1] * w, c[1] - T[0] * w]);
    }
    return [...Lp, ...Rp.reverse()];
  };
  const cuffD = spec.cuffD;
  const cuffPoly = ringAt(cuffD, cuffD + 38, () => 8, 3);
  const cuffPath = (() => {
    const half = cuffPoly.length / 2;
    const l = cuffPoly.slice(0, half);
    const r = cuffPoly.slice(half);
    return `M${l.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}L${r
      .map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join('L')}Z`;
  })();
  const cuffCenter = armT.center.slice(atD(cuffD), atD(cuffD + 38) + 1);
  const cuff: Part = {
    key: 'cuff',
    poly: cuffPoly,
    fill: cuffPath,
    outline: cuffPath,
    dense: contourHatch({
      seed: seedBase + 5,
      center: cuffCenter,
      from: -armHwMax - 12,
      to: armHwMax + 12,
      spacing: 3.2,
      wobble: 0.3,
      breakChance: 0.02,
      step: 8,
    }),
    sparse: contourHatch({
      seed: seedBase + 6,
      center: cuffCenter,
      from: -armHwMax - 12,
      to: armHwMax + 12,
      spacing: 6,
      wobble: 0.3,
      breakChance: 0.05,
      step: 8,
    }),
    s1: lightShift(7),
    s2: lightShift(19),
    detail: '',
    detailThin: '',
    pivot: [0, 0],
  };
  // black flared sleeve
  const sleevePoly = ringAt(cuffD + 22, spec.armLen, (D) => 2 + Math.pow((D - cuffD) / 120, 1.35) * 22, 8);
  const sleeve = smoothPath(sleevePoly.filter((_, i) => i % 1 === 0), true, 1 / 8);
  // fold lines (paper) along the sleeve
  const sleeveCenter = armT.center.slice(atD(cuffD + 50));
  const folds = contourHatch({
    seed: seedBase + 9,
    center: sleeveCenter,
    from: -armHwMax - 40,
    to: armHwMax + 40,
    spacing: 17,
    wobble: 2.5,
    breakChance: 0.18,
    step: 18,
  });
  // wrist creases + forearm tendons
  let armDetail = '';
  for (const D of [18, 30]) {
    const i = atD(D);
    armDetail += crossHatch({
      seed: seedBase + 11 + D,
      center: armT.center.slice(Math.max(0, i - 1), i + 2),
      halfWidth: armT.hws[i] * 0.7,
      spacing: 4.5,
      bow: -3,
      fromFrac: -0.85,
      toFrac: 0.85,
      breakChance: 0,
    });
  }

  /* ---- palm ---- */
  const palmAnchors = PALM_ANCHORS.map(([a, b]) => P(f, a, b));
  const palmDense = sampleClosed(palmAnchors, 6);
  const palmFill = smoothPath(palmDense.filter((_, i) => i % 2 === 0), true);
  const palmCenter: Pt[] = [];
  for (let a = -24; a <= 200; a += 10) palmCenter.push(P(f, a, 0));
  const palmDenseHatch = contourHatch({
    seed: seedBase + 20,
    center: palmCenter,
    from: -96,
    to: 96,
    spacing: 3.3,
    wobble: 1.0,
    breakChance: 0.08,
    step: 14,
  });
  const palmSparseHatch = contourHatch({
    seed: seedBase + 21,
    center: palmCenter,
    from: -96,
    to: 96,
    spacing: 6.6,
    wobble: 1.2,
    breakChance: 0.14,
    step: 14,
  });
  // tendons on the back of the hand
  let tendons = '';
  const tb0 = [-47, -12, 21, 50];
  tb0.forEach((bk, i) => {
    const pts: Pt[] = [];
    const a0 = 170 - i * 3;
    const a1 = 62 - i * 6;
    for (let a = a0; a >= a1; a -= 10) {
      const t = (a0 - a) / (a0 - a1);
      const bb = bk * (1 - 0.5 * t) + Math.sin(a * 0.12 + i) * 1.1;
      pts.push(P(f, a, bb));
    }
    // two pieces with a gap for an engraved feel
    const cut = Math.floor(pts.length * (0.45 + 0.1 * i));
    tendons += polySmooth(pts.slice(0, cut)) + polySmooth(pts.slice(cut + 1));
  });
  // knuckle crescents
  let knuckles = '';
  [
    [-47, 178],
    [-12, 182],
    [21, 174],
    [50, 160],
  ].forEach(([bk, ak]) => {
    const pts: Pt[] = [];
    for (let k = -1; k <= 1; k += 0.5) pts.push(P(f, ak - 14 + 4 * (1 - k * k), bk + k * 12));
    knuckles += polySmooth(pts);
  });

  /* ---- fingers ---- */
  const fingers: Part[] = [];
  const tubes: Record<string, TubeOut> = {};
  let index!: Part;
  spec.fingers.forEach((fs, i) => {
    const { part, tube: tb } = fingerPart(fs, f, seedBase + 40 + i * 10, 1);
    tubes[fs.name] = tb;
    if (fs.name === 'index') index = part;
    else fingers.push(part);
  });

  // knuckle creases where each finger leaves the back of the hand
  const palmPoly = palmDense;
  [...fingers, index].forEach((fp) => {
    const tb = tubes[fp.key];
    let i0 = tb.center.findIndex((c) => !insidePoly(c, palmPoly));
    if (i0 < 0) i0 = 6;
    fp.pivot = [tb.center[Math.max(1, i0)][0], tb.center[Math.max(1, i0)][1]];
    i0 = Math.max(2, i0 + 1);
    fp.detail += crossHatch({
      seed: seedBase + 90 + i0,
      center: tb.center.slice(i0 - 2, i0 + 3),
      halfWidth: tb.hws[i0] * 0.8,
      spacing: 4.5,
      bow: 3.2,
      fromFrac: -0.9,
      toFrac: 0.9,
      breakChance: 0,
    });
  });

  /* ---- thumb ---- */
  const ts = spec.thumb;
  const tcenter = limb(f, ts.a, ts.b, ts.th0, ts.bend, ts.pow, ts.len);
  const thwf = (t: number) => {
    const base = ts.hw0 + (ts.hw1 - ts.hw0) * Math.pow(t, 0.7);
    const bump = 1 + 0.07 * Math.exp(-(((t - 0.62) / 0.05) ** 2)) + 0.06 * Math.exp(-(((t - 0.82) / 0.04) ** 2));
    return base * bump;
  };
  const tt = tube(tcenter, thwf);
  const thumbFill = smoothPath(tt.poly.filter((_, i) => i % 2 === 0 || i === tt.poly.length - 1), true);
  const thMax = Math.max(...tt.hws);
  const ti0 = Math.round(0.84 * (tt.center.length - 1));
  const tseg = tt.center.slice(ti0);
  const thumbNailTube = tube(tseg, (t) => tt.hws[ti0] * (0.52 + 0.08 * t), true);
  const jt = [0.64, 0.84].map((t) => Math.round(t * (tt.center.length - 1)));
  let thDetail = '';
  jt.forEach((i, k) => {
    thDetail += crossHatch({
      seed: seedBase + 70 + k,
      center: tt.center.slice(Math.max(0, i - 2), i + 3),
      halfWidth: tt.hws[i] * 0.62,
      spacing: 3.2,
      bow: 2,
      fromFrac: -0.9,
      toFrac: 0.9,
      breakChance: 0.1,
    });
  });
  const thumbS2: Pt = lightShift(15);
  const thumb: Part = {
    key: 'thumb',
    poly: tt.poly,
    fill: thumbFill,
    outline: thumbFill,
    dense: contourHatch({
      seed: seedBase + 66,
      center: tt.center,
      from: -thMax - 1,
      to: thMax + 1,
      spacing: 3.2,
      wobble: 0.7,
      breakChance: 0.06,
      step: 12,
    }),
    sparse: contourHatch({
      seed: seedBase + 67,
      center: tt.center,
      from: -thMax - 1,
      to: thMax + 1,
      spacing: 6.4,
      wobble: 0.9,
      breakChance: 0.12,
      step: 12,
    }),
    s1: lightShift(5.5),
    s2: thumbS2,
    detail: thDetail,
    detailThin: '',
    nail: {
      fill: smoothPath(thumbNailTube.poly, true),
      ticks: contourHatch({
        seed: seedBase + 68,
        center: tseg,
        from: -tt.hws[ti0] * 0.44,
        to: -tt.hws[ti0] * 0.1,
        spacing: 2.4,
        wobble: 0.2,
        breakChance: 0.1,
        step: 6,
      }),
    },
    pivot: tt.center[Math.max(1, tt.center.findIndex((c) => !insidePoly(c, palmPoly)))],
  };

  /* ---- outline strokes: leave gaps where another part sits behind / merges ---- */
  const strokeRuns = (pts: Pt[], behind: Pt[][]): string => {
    const n = pts.length;
    const hid = pts.map((p) => behind.some((poly) => insidePoly(p, poly)));
    const hid2 = hid.map((h, i) => h || hid[(i + 1) % n] || hid[(i - 1 + n) % n]);
    let start = hid2.findIndex((h) => h);
    if (start < 0) start = 0;
    const runs: Pt[][] = [];
    let cur: Pt[] = [];
    for (let k = 1; k <= n; k++) {
      const i = (start + k) % n;
      if (!hid2[i]) cur.push(pts[i]);
      else {
        if (cur.length > 1) runs.push(cur);
        cur = [];
      }
    }
    if (cur.length > 1) runs.push(cur);
    return runs.map((r) => smoothPath(r, false)).join('');
  };
  const palmPts = palmDense.filter((_, i) => i % 2 === 0);
  const armPts = armT.poly.filter((_, i) => i % 3 === 0 || i === armT.poly.length - 1);
  const area = (pts: Pt[]) => {
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const q = pts[(i + 1) % pts.length];
      sum += pts[i][0] * q[1] - q[0] * pts[i][1];
    }
    return sum;
  };
  const palmOriented = area(palmPts) * area(armPts) < 0 ? [...palmPts].reverse() : palmPts;
  const palmOutline = strokeRuns(palmPts, [armT.poly, tt.poly, ...Object.values(tubes).map((t) => t.poly)]);
  const armOutline = strokeRuns(armPts, [palmDense]);
  const palmS2: Pt = lightShift(22);
  // forearm + back of the hand share one silhouette so shading is seamless
  armSkin.fill = armFill + smoothPath(palmOriented, true);
  armSkin.outline = armOutline + palmOutline;
  armSkin.poly = [...armT.poly, ...palmDense];
  armSkin.dense += palmDenseHatch;
  armSkin.sparse += palmSparseHatch;
  armSkin.detail = armDetail;
  const palm: Part = {
    key: 'palm',
    poly: palmDense,
    fill: palmFill,
    outline: '',
    dense: '',
    sparse: '',
    s1: [0, 0],
    s2: palmS2,
    detail: tendons,
    detailThin: knuckles,
    pivot: P(f, 20, 0),
  };

  const tip = tubes['index'].tipPt;
  const pivots: Record<string, Pt> = { thumb: thumb.pivot, index: index.pivot };
  for (const fp of fingers) pivots[fp.key] = fp.pivot;
  return { arm: { skin: armSkin, sleeve, folds, cuff, detail: armDetail }, palm, thumb, fingers, index, tip, pivots };
}

const GEO: Record<HandPose, HandGeo> = {
  reach: buildHand(REACH, 'reach'),
  grip: buildHand(GRIP, 'grip'),
};

const r = (n: number) => Math.round(n * 10) / 10;

/** Where the index fingertip points to, in reach user-space coordinates. */
export const HAND_REACH_TIP = { x: r(GEO.reach.tip[0]), y: r(GEO.reach.tip[1]) };

/**
 * Knuckle pivots (viewBox coords) for rotating finger groups with GSAP:
 * `gsap.to(el, { rotation: 6, svgOrigin: `${x} ${y}` })`.
 */
export const HAND_PIVOTS: Record<HandPose, Record<string, { x: number; y: number }>> = {
  reach: Object.fromEntries(Object.entries(GEO.reach.pivots).map(([k, v]) => [k, { x: r(v[0]), y: r(v[1]) }])),
  grip: Object.fromEntries(Object.entries(GEO.grip.pivots).map(([k, v]) => [k, { x: r(v[0]), y: r(v[1]) }])),
};

/**
 * Grip pose: invisible cylinder the fingers wrap around (grip user-space coords).
 * Axis is vertical; render the vessel UNDER the Hand svg centred on (cx, cy).
 */
export const HAND_GRIP_ANCHOR = { cx: 446, cy: 332, r: 60, axisDeg: 90 } as const;

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

interface ShadedProps {
  uid: string;
  part: Part;
  /** extra element(s) drawn on top inside the part group */
  children?: React.ReactNode;
  dataPart?: string;
  style?: CSSProperties;
  denseW?: number;
  sparseW?: number;
}

function Shaded({ uid, part, children, dataPart, style, denseW = 1.3, sparseW = 1 }: ShadedProps) {
  const id = `${uid}-${part.key}`;
  return (
    <g data-part={dataPart} style={style}>
      <g clipPath={`url(#${id}-c)`}>
        <g data-part="shadow">
          <use href={`#${id}-p`} fill={INK} />
        </g>
        <use href={`#${id}-p`} transform={`translate(${part.s1[0]} ${part.s1[1]})`} fill={PAPER} />
        <path d={part.dense} clipPath={`url(#${id}-s1)`} fill="none" stroke={INK} strokeWidth={denseW} strokeLinecap="round" />
        <use href={`#${id}-p`} transform={`translate(${part.s2[0]} ${part.s2[1]})`} fill={PAPER} />
        <path d={part.sparse} clipPath={`url(#${id}-s2)`} fill="none" stroke={INK} strokeWidth={sparseW} strokeLinecap="round" />
      </g>
      {children}
      <path d={part.outline} fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
}

function ShadedDefs({ uid, part }: { uid: string; part: Part }) {
  const id = `${uid}-${part.key}`;
  return (
    <>
      <path id={`${id}-p`} d={part.fill} />
      <clipPath id={`${id}-c`}>
        <use href={`#${id}-p`} />
      </clipPath>
      <clipPath id={`${id}-s1`}>
        <use href={`#${id}-p`} transform={`translate(${part.s1[0]} ${part.s1[1]})`} />
      </clipPath>
      <clipPath id={`${id}-s2`}>
        <use href={`#${id}-p`} transform={`translate(${part.s2[0]} ${part.s2[1]})`} />
      </clipPath>
    </>
  );
}

/** knuckle pivot in user space, e.g. "507.2 368.6" - pass straight to GSAP's svgOrigin */
const pivotAttr = (p: Part) => `${r(p.pivot[0])} ${r(p.pivot[1])}`;

const thin = { fill: 'none', stroke: INK, strokeLinecap: 'round' as const };

interface Props {
  pose: HandPose;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

/**
 * Engraved hand + forearm. 'reach': viewBox "250 190 750 450", arm exits RIGHT edge, hand points left.
 * 'grip': viewBox "0 140 560 360", arm exits LEFT edge, fingers wrap a vertical cylinder (see HAND_GRIP_ANCHOR).
 */
export default function Hand({ pose, className, style, id }: Props) {
  const rawId = useId();
  const uid = 'h' + rawId.replace(/:/g, '');
  const g = GEO[pose];
  const vb = HAND_VIEWBOX[pose];
  const parts: Part[] = [g.arm.skin, g.arm.cuff, g.thumb, g.index, ...g.fingers];

  return (
    <svg
      id={id}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
      data-pose={pose}
    >
      <defs>
        {parts.map((p) => (
          <ShadedDefs key={p.key} uid={uid} part={p} />
        ))}
      </defs>

      {/* thumb */}
      <g data-part="thumb" data-pivot={pivotAttr(g.thumb)}>
        <Shaded uid={uid} part={g.thumb}>
          <path d={g.thumb.detail} {...thin} strokeWidth={1.1} />
          <path d={g.thumb.nail!.fill} fill={PAPER} stroke={INK} strokeWidth={1.7} strokeLinejoin="round" />
          <path d={g.thumb.nail!.ticks} {...thin} strokeWidth={0.9} />
        </Shaded>
      </g>

      {/* curled fingers: pinky, ring, middle */}
      <g data-part="fingers">
        {g.fingers.map((p) => (
          <g key={p.key} data-finger={p.key} data-pivot={pivotAttr(p)}>
            <Shaded uid={uid} part={p}>
              <path d={p.detail} {...thin} strokeWidth={1.1} />
            </Shaded>
          </g>
        ))}
      </g>

      {/* index (extended) */}
      <g data-part="index" data-pivot={pivotAttr(g.index)}>
        <Shaded uid={uid} part={g.index}>
          <path d={g.index.detail} {...thin} strokeWidth={1.1} />
          {g.index.nail && (
            <>
              <path d={g.index.nail.fill} fill={PAPER} stroke={INK} strokeWidth={1.7} strokeLinejoin="round" />
              <path d={g.index.nail.ticks} {...thin} strokeWidth={0.9} />
            </>
          )}
        </Shaded>
        {pose === 'reach' && <circle data-part="fingertip" cx={HAND_REACH_TIP.x} cy={HAND_REACH_TIP.y} r={0} />}
      </g>

      {/* forearm + back of the hand (one silhouette; covers finger and thumb bases), sleeve, cuff */}
      <g data-part="arm">
        <Shaded uid={uid} part={g.arm.skin} denseW={1.3} sparseW={1}>
          <path d={g.arm.detail} {...thin} strokeWidth={1.2} />
        </Shaded>
        <path d={g.arm.sleeve} fill={INK} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
        <path d={g.arm.folds} fill="none" stroke={PAPER} strokeWidth={1.3} strokeLinecap="round" opacity={0.85} />
        <Shaded uid={uid} part={g.arm.cuff} denseW={1.2} sparseW={1} />
      </g>

      {/* palm details: tendons + knuckle creases */}
      <g data-part="palm">
        <path d={g.palm.detail} {...thin} strokeWidth={1.15} />
        <path d={g.palm.detailThin} {...thin} strokeWidth={1.3} />
      </g>
    </svg>
  );
}
