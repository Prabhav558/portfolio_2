import { hatch, polySmooth, roughen, smoothPath, fmt } from '../../art/procedural';
import { mulberry32 } from '../../lib/random';
import { bell, ellipse, line, offset, poly, ribbon, sampleOpen, type Pt } from './geo';

/**
 * The Keeper's face, close-up. All geometry is computed once at module load and
 * emitted as a handful of long <path> strings (engraved vertical-line skin, ink
 * ribbons, hair strands) so the DOM stays small.
 *
 * Canvas: x 0..1600, y -100..1360 (desktop frame = 0 0 1600 1000).
 */

export const INK = 'var(--black)';
export const INK2 = 'var(--ink)';
export const PAPER = 'var(--cream)';
export const BLUE = 'var(--latte)';
export const RED = 'var(--burgundy)';

export const DESK_VB = { x: 230, y: 120, w: 1140, h: 712 };
export const DESK_VIEWBOX = `${DESK_VB.x} ${DESK_VB.y} ${DESK_VB.w} ${DESK_VB.h}`;
export const MOBILE_VB = { x: 470, y: -70, w: 660, h: 1428 };
export const MOBILE_VIEWBOX = `${MOBILE_VB.x} ${MOBILE_VB.y} ${MOBILE_VB.w} ${MOBILE_VB.h}`;
/** vertical centre of the eyes in canvas units (used to place the slit) */
export const EYE_Y = 402;

/** drop decimals on long hatch strings to keep the DOM light */
const ri = (d: string) => d.replace(/(\d)\.\d+/g, '$1');

const closed = (pts: Pt[], k = 1 / 6) => smoothPath(pts, true, k);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------------ */
/* skin regions                                                        */
/* ------------------------------------------------------------------ */

const FACE_ANCHORS: Pt[] = [
  [492, -110], [484, 100], [478, 300], [486, 470], [514, 640], [572, 790], [664, 905], [775, 968],
  [880, 960], [972, 895], [1038, 795], [1080, 665], [1104, 520], [1110, 380], [1106, 200], [1100, -110],
];
const FACE = closed(FACE_ANCHORS);

const NECK = closed([[640, 860], [652, 1000], [640, 1180], [640, 1400], [1060, 1400], [1030, 1180], [1000, 1000], [972, 880]], 0.04);

/** a hatch zone: clip shape + the vertical engraved lines inside it */
interface Zone {
  clip: string;
  lines: string;
  sw: number;
}
let zoneSeed = 100;
function zone(anchors: Pt[], sp: number, sw: number, sp2?: number, o: { wobble?: number; brk?: number; step?: number; angle?: number } = {}): Zone {
  const xs = anchors.map((p) => p[0]);
  const ys = anchors.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  zoneSeed += 7;
  return {
    clip: closed(anchors, 1 / 8),
    lines: ri(hatch({
      seed: zoneSeed,
      x,
      y,
      width: Math.max(...xs) - x,
      height: Math.max(...ys) - y,
      angle: o.angle ?? 90,
      spacing: sp,
      spacing2: sp2,
      wobble: o.wobble ?? 1.1,
      breakChance: o.brk ?? 0.1,
      step: o.step ?? 48,
    })),
    sw,
  };
}
const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0) => ellipse(cx, cy, rx, ry, rot, 22);

// NOTE: for vertical hatch, `spacing` applies to the RIGHT edge and `spacing2` to the LEFT edge.
const MID: Zone[] = [
  zone(ell(636, 392, 190, 125), 8, 1.7, 8),
  zone(ell(998, 398, 160, 118), 7.5, 1.7, 7.5),
  zone([[484, -110], [600, -110], [572, 300], [556, 480], [534, 650], [494, 470], [480, 300]], 12, 1.9, 6),
  zone([[900, -110], [1106, -110], [1112, 520], [1040, 795], [972, 895], [938, 700], [912, 520], [892, 300]], 6, 2, 13),
  zone(ell(580, 660, 100, 160), 9, 1.5, 9),
  zone([[560, 800], [980, 920], [900, 975], [660, 912]], 6, 2, 8),
];

const DARK: Zone[] = [
  // under the brows
  zone([[494, 318], [560, 290], [640, 284], [722, 312], [742, 346], [660, 340], [584, 346], [526, 380]], 5.5, 2.6, 5.5),
  zone([[900, 334], [950, 308], [1012, 298], [1074, 324], [1100, 366], [1060, 366], [1000, 358], [930, 372]], 5.5, 2.6, 5.5),
  // far side of the nose + between the eyes
  zone([[824, 330], [884, 350], [906, 440], [930, 540], [930, 600], [890, 612], [878, 540], [846, 440]], 5, 2.8, 5),
  zone([[742, 336], [830, 330], [836, 410], [762, 416]], 6, 2.3, 6),
  // under the nose, upper lip, under the lower lip
  zone([[804, 672], [906, 656], [912, 682], [868, 698], [808, 692]], 6, 2.6, 6),
  zone([[758, 774], [800, 758], [836, 750], [854, 757], [886, 749], [932, 751], [950, 757], [916, 764], [880, 769], [850, 770], [814, 770]], 4.5, 3, 4.5),
  zone([[780, 788], [832, 780], [884, 778], [934, 780], [912, 812], [860, 830], [808, 820]], 9, 1.5, 9),
  zone(ell(858, 872, 92, 30), 5.5, 2.6, 5.5),
  // hollow of the far cheek
  zone([[966, 520], [1066, 520], [1082, 648], [1044, 770], [990, 850], [958, 720]], 5.5, 2.7, 5.5),
  // near temple edge
  zone([[484, 100], [530, 100], [520, 400], [514, 600], [486, 400]], 5.5, 2.8, 5.5),
];

const DEEP: Zone[] = [
  zone([[1066, 150], [1108, 150], [1104, 500], [1082, 665], [1038, 795], [1030, 700], [1060, 520]], 5.5, 4.4, 5.5, { brk: 0.04 }),
  zone([[572, 822], [664, 925], [775, 982], [880, 974], [972, 905], [904, 936], [776, 950], [668, 890]], 5, 4.2, 5, { brk: 0.04 }),
  zone([[640, 880], [1000, 880], [1010, 1000], [650, 1000]], 5, 4.6, 5, { brk: 0.03 }),
];

/** diagonal cross hatch in the deepest folds */
const CROSS: Zone[] = [
  zone([[824, 330], [884, 350], [906, 440], [930, 540], [930, 600], [890, 612], [878, 540], [846, 440]], 6, 1.2, 6, { angle: 55 }),
  zone([[494, 318], [560, 290], [640, 284], [722, 312], [742, 346], [660, 340], [584, 346], [526, 380]], 6, 1.2, 6, { angle: 62 }),
  zone([[966, 520], [1066, 520], [1082, 648], [1044, 770], [990, 850], [958, 720]], 7, 1.2, 7, { angle: 58 }),
];

const BASE_LINES = ri(hatch({ seed: 7, x: 470, y: -110, width: 660, height: 1100, angle: 90, spacing: 8.5, wobble: 1.2, breakChance: 0.2, step: 50 }));
const NECK_LINES = ri(hatch({ seed: 17, x: 630, y: 860, width: 440, height: 520, angle: 90, spacing: 5.5, wobble: 1, breakChance: 0.06, step: 60 }));

/* paper highlights that melt the engraved lines away */
const lens = (a: Pt[], w: number) => ribbon(a, (t) => bell(t) * w, { per: 8 });
const HIGHLIGHTS = [
  lens([[782, 346], [788, 420], [790, 500], [774, 566]], 26),
  lens([[704, 84], [740, 150], [748, 240]], 70),
  lens([[524, 484], [586, 514], [664, 530], [724, 512]], 34),
  lens([[604, 570], [616, 650], [606, 730]], 40),
  lens([[800, 802], [842, 814], [892, 808]], 14),
  lens([[826, 930], [852, 950], [884, 934]], 34),
  lens([[1030, 456], [1046, 540], [1030, 620]], 22),
].join('');

/* ------------------------------------------------------------------ */
/* eyes                                                                */
/* ------------------------------------------------------------------ */

interface Eye {
  upper: Pt[];
  lower: Pt[];
  c: Pt;
  r: number;
  shape: string;
  outline: string;
  lid: string;
  lidLine: string;
  lashes: string;
  lowerLid: string;
  crease: string;
  bags: string;
  shade: string;
  shadeClip: string;
  lidShadowClip: string;
  iris: { dark: string; light: string; ring: string };
  seed: number;
}

function eye(upper: Pt[], lower: Pt[], c: Pt, r: number, seed: number, flick: Pt[], dir: 1 | -1): Eye {
  const rand = mulberry32(seed);
  const U = sampleOpen(upper, 12);
  const L = sampleOpen(lower, 12);
  const shapePts = [...U, ...L.slice(1, -1)];
  const lid = ribbon(offset(U, 3), (t) => 3 + bell(t) * 14 * (1 - 0.3 * t), { per: 1, seed });
  const fl = ribbon(flick, (t) => 5 * (1 - t) + 0.8, { per: 8 });
  // lashes: short ticks fanning out along the upper lid
  let lashes = '';
  for (let i = 4; i < U.length - 4; i += 3) {
    const p = U[i];
    const o = offset(U, 1)[i];
    const nx = o[0] - p[0];
    const ny = o[1] - p[1];
    const t = i / U.length;
    const len = (10 + rand() * 12) * (0.5 + bell(t) * 0.7);
    const ex = p[0] + nx * len * 0.9 + dir * len * 0.35 * (t - 0.4);
    const ey = p[1] + ny * len * 0.9;
    lashes += `M${fmt(p[0] + nx * 3)} ${fmt(p[1] + ny * 3)}L${fmt(ex)} ${fmt(ey)}`;
  }
  const lowerLid = poly(offset(L, 1.5));
  // crease above the lid, broken
  const cr = offset(U, 30).slice(Math.round(U.length * 0.18), Math.round(U.length * 0.86));
  const crease = polySmooth(cr);
    // under-eye engraving: arcs below the lower lid
  const b1 = offset(L, 16).slice(Math.round(L.length * 0.22), Math.round(L.length * 0.78));
  // shading on the white of the eye: under the upper lid + both corners
  const band = [...U, ...offset(U, -34).reverse()];
  const xs = shapePts.map((p) => p[0]);
  const ys = shapePts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const shade = hatch({ seed: seed + 3, x: x0, y: y0 - 4, width: x1 - x0, height: y1 - y0 + 8, angle: 90, spacing: 4.2, wobble: 0.6, breakChance: 0.02, step: 20 });
  const corners = [
    [[x0 - 4, y0 - 6], [x0 + 38, y0 - 6], [x0 + 38, y1 + 6], [x0 - 4, y1 + 6]],
    [[x1 - 38, y0 - 6], [x1 + 4, y0 - 6], [x1 + 4, y1 + 6], [x1 - 38, y1 + 6]],
  ] as Pt[][];
  const shadeClip = poly(band, true) + corners.map((c2) => poly(c2, true)).join('');
  // radial engraved iris
  let dark = '';
  let light = '';
  const N = 64;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rand() * 0.05;
    const r0 = r * (0.36 + rand() * 0.08);
    const r1 = r * (0.78 + rand() * 0.22);
    dark += `M${fmt(Math.cos(a) * r0)} ${fmt(Math.sin(a) * r0)}L${fmt(Math.cos(a) * r1)} ${fmt(Math.sin(a) * r1)}`;
    if (i % 2 === 0) {
      const a2 = a + (Math.PI / N) * (0.6 + rand() * 0.5);
      const q0 = r * (0.5 + rand() * 0.16);
      const q1 = r * (0.7 + rand() * 0.12);
      light += `M${fmt(Math.cos(a2) * q0)} ${fmt(Math.sin(a2) * q0)}L${fmt(Math.cos(a2) * q1)} ${fmt(Math.sin(a2) * q1)}`;
    }
  }
  return {
    upper,
    lower,
    c,
    r,
    shape: poly(shapePts, true),
    outline: poly(shapePts, true),
    lid: lid + fl,
    lidLine: polySmooth(U),
    lashes,
    lowerLid,
    crease,
    bags: polySmooth(b1),
    shade,
    shadeClip,
    lidShadowClip: poly(band, true),
    iris: { dark, light, ring: '' },
    seed,
  };
}

const EYE_NEAR = eye(
  [[514, 398], [538, 366], [588, 344], [646, 338], [700, 350], [738, 384], [750, 418]],
  [[750, 418], [716, 450], [668, 464], [612, 462], [560, 444], [528, 420], [514, 398]],
  [640, 402],
  67,
  31,
  [[514, 398], [494, 388], [472, 370]],
  1,
);
const EYE_FAR = eye(
  [[894, 424], [918, 382], [960, 356], [1010, 352], [1052, 366], [1082, 394]],
  [[1082, 394], [1060, 436], [1020, 462], [976, 466], [930, 452], [904, 436], [894, 424]],
  [992, 410],
  61,
  47,
  [[1082, 394], [1098, 382], [1112, 364]],
  -1,
);

/* ------------------------------------------------------------------ */
/* brows, nose, mouth, outlines                                        */
/* ------------------------------------------------------------------ */

const browW = (k: number) => (t: number) => k * Math.max(0.16, 30 * Math.pow(1 - t, 0.6) * (0.55 + 0.45 * Math.min(1, t * 6)));
const BROW_NEAR = ribbon([[730, 322], [692, 294], [636, 274], [576, 272], [526, 292], [490, 326]], browW(1), { per: 8, jitter: 1.6, seed: 5 });
const BROW_FAR = ribbon([[904, 330], [946, 304], [998, 290], [1048, 294], [1086, 318], [1108, 352]], browW(0.86), { per: 8, jitter: 1.6, seed: 9 });
function browHairs(anchors: Pt[], seed: number, flip: number) {
  const rand = mulberry32(seed);
  const c = sampleOpen(anchors, 10);
  let d = '';
  for (let i = 2; i < c.length - 3; i += 2) {
    const p = c[i];
    const t = i / c.length;
    const up = rand() < 0.5 ? -1 : 1;
    const len = (8 + rand() * 12) * (1 - t * 0.5);
    d += `M${fmt(p[0])} ${fmt(p[1] + up * 10)}l${fmt(flip * len * 0.7)} ${fmt(-up * len * 0.7)}`;
  }
  return d;
}
const BROW_HAIRS = browHairs([[730, 322], [692, 294], [636, 274], [576, 272], [526, 292], [490, 326]], 3, -1) + browHairs([[904, 330], [946, 304], [998, 290], [1048, 294], [1086, 318], [1108, 352]], 4, 1);

const NOSE = [
  // near edge of the bridge, running into the near alar
  ribbon([[742, 336], [756, 410], [764, 480], [756, 546], [734, 590]], (t) => 1.5 + bell(t) * 3.2, { per: 8, seed: 2 }),
  // far edge of the bridge (shadow side)
  ribbon([[832, 352], [852, 430], [878, 520], [902, 590]], (t) => 1.5 + bell(t) * 4, { per: 8, seed: 3 }),
  // alar (near) and underside of the tip
  ribbon([[736, 586], [714, 610], [712, 638], [730, 658], [762, 666]], (t) => 1.5 + bell(t) * 3.2, { per: 8, seed: 4 }),
  ribbon([[820, 672], [850, 674], [888, 664], [910, 642]], (t) => 1 + bell(t) * 3, { per: 8, seed: 6 }),
  // tip crease
  ribbon([[792, 598], [830, 616], [868, 606]], (t) => 1 + bell(t) * 2.4, { per: 8, seed: 8 }),
].join('');
const NOSTRILS =
  roughen(ell(768, 650, 26, 11, -8), 1.4, 3, { segment: 10, smooth: 0.8 }) +
  roughen(ell(872, 654, 19, 8, 6), 1.2, 4, { segment: 10, smooth: 0.8 });

const MOUTH_LINE = ribbon([[746, 778], [788, 768], [826, 760], [850, 768], [880, 760], [916, 760], [950, 756]], (t) => 2 + bell(t) * 6.5, { per: 8, jitter: 0.5, seed: 11 });
const LIP_LOWER = ribbon([[774, 794], [806, 824], [850, 836], [900, 822], [938, 786]], (t) => 1.5 + bell(t) * 5, { per: 8, seed: 12 });
const LIP_CORNERS = roughen(ell(744, 778, 8, 6), 1, 5, { segment: 6, smooth: 0.8 }) + roughen(ell(954, 757, 7, 5), 1, 6, { segment: 6, smooth: 0.8 });
const PHILTRUM = ribbon([[828, 684], [824, 722], [830, 752]], (t) => 1 + bell(t) * 2.2, { per: 6 }) + ribbon([[884, 684], [888, 724], [884, 752]], (t) => 1 + bell(t) * 2.2, { per: 6 });
const CHIN_LINE = ribbon([[790, 868], [830, 880], [880, 878], [920, 862]], (t) => 1 + bell(t) * 3, { per: 6, seed: 13 });

// face contour: heavier on the shadow side
const CONTOUR = ribbon(
  [[486, 470], [514, 640], [572, 790], [664, 905], [775, 968], [880, 960], [972, 895], [1038, 795], [1080, 665], [1104, 520]],
  (t) => 3 + t * 9,
  { per: 8, jitter: 0.8, seed: 14 },
);

// ink flecks (stipple) like a printer's splatter
function specks(seed: number, n: number, boxes: Array<[number, number, number, number]>) {
  const rand = mulberry32(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const b = boxes[Math.floor(rand() * boxes.length)];
    const x = lerp(b[0], b[2], rand());
    const y = lerp(b[1], b[3], rand());
    const l = 0.2 + rand() * 6;
    const a = rand() * Math.PI;
    d += `M${fmt(x)} ${fmt(y)}l${fmt(Math.cos(a) * l)} ${fmt(Math.sin(a) * l)}`;
  }
  return d;
}
const SPECKS = specks(21, 90, [
  [740, 300, 860, 560],
  [940, 470, 1100, 880],
  [520, 150, 700, 330],
  [600, 480, 720, 620],
  [800, 80, 940, 280],
]);

/* ------------------------------------------------------------------ */
/* the ink tear (blue)                                                  */
/* ------------------------------------------------------------------ */

const TEAR_C: Pt[] = [[610, 462], [602, 520], [592, 590], [598, 660], [590, 724], [592, 770]];
const TEAR = ribbon(TEAR_C, (t) => 7 + 4 * bell(t * 0.9), { per: 10, jitter: 0.4, seed: 15 }) + roughen(ellipse(592, 782, 11, 15, 0, 20), 0.6, 3, { segment: 6, smooth: 0.9 });
const TEAR_HI = line([[606, 480], [600, 540], [592, 610], [596, 670]]);
const TEAR_DROPS = roughen(ellipse(572, 826, 5, 7, 0, 14), 0.5, 2, { segment: 5, smooth: 0.9 });
const TEAR_SMEAR = ribbon([[560, 456], [600, 464], [650, 458]], (t) => 3 + bell(t) * 6, { per: 8, seed: 21 });

/* ------------------------------------------------------------------ */
/* hair                                                                */
/* ------------------------------------------------------------------ */

const HAIR_L_PTS: Pt[] = [
  [30, -120], [790, -120], [770, -30], [716, 36], [650, 80], [590, 112], [546, 160], [510, 250], [496, 380],
  [502, 500], [528, 620], [566, 730], [606, 830], [636, 920], [644, 1030], [626, 1160], [616, 1400], [30, 1400],
];
const HAIR_R_PTS: Pt[] = [
  [800, -120], [1570, -120], [1570, 1400], [1060, 1400], [1056, 1160], [1050, 1040], [1030, 960], [1030, 860],
  [1060, 760], [1090, 640], [1098, 520], [1098, 420], [1096, 290], [1098, 170], [1090, 70], [1060, -10], [1010, -70], [880, -100],
];
const HAIR_L = roughen(HAIR_L_PTS, 7, 33, { segment: 36, smooth: 0.55 });
const HAIR_R = roughen(HAIR_R_PTS, 7, 34, { segment: 36, smooth: 0.55 });

// the fall of hair that hides the inner third of the far eye
const LOCK = closed(
  [[822, -120], [1012, -120], [1004, 56], [988, 190], [972, 312], [962, 404], [950, 458], [926, 408], [906, 322], [880, 214], [850, 108], [828, 10]],
  1 / 7,
);
const LOCK_STRAND = ribbon([[1024, -30], [1018, 80], [1030, 210], [1010, 316]], (t) => 22 * (1 - t) + 1.5, { per: 8, seed: 41 });
const FRINGE_L = [
  ribbon([[708, 30], [650, 120], [602, 232], [566, 306]], (t) => 18 * (1 - t) + 1.2, { per: 8, jitter: 0.6, seed: 42 }),
  ribbon([[740, 0], [700, 100], [670, 180], [650, 262]], (t) => 14 * (1 - t) + 1, { per: 8, jitter: 0.6, seed: 43 }),
  ribbon([[560, 120], [520, 220], [504, 330]], (t) => 14 * (1 - t) + 1, { per: 8, jitter: 0.6, seed: 44 }),
].join('');
// loose strands crossing the cheeks
const LOOSE_L = [
  ribbon([[520, 600], [560, 700], [600, 780], [632, 860]], (t) => 9 * bell(t * 0.9) + 1, { per: 8, seed: 45 }),
  ribbon([[500, 440], [540, 520], [566, 600]], (t) => 8 * bell(t) + 1, { per: 8, seed: 46 }),
].join('');
const LOOSE_R = ribbon([[1094, 560], [1070, 660], [1060, 760], [1040, 840]], (t) => 9 * bell(t * 0.9) + 1, { per: 8, seed: 47 });

/** Engraved locks of hair: bundles of parallel, converging highlight lines. */
interface Bundle {
  c: Pt[];
  n: number;
  gap: number;
}
const BUNDLES_L: Bundle[] = [
  { c: [[770, -100], [610, 120], [540, 360], [548, 640], [610, 950], [626, 1300]], n: 9, gap: 8 },
  { c: [[690, -100], [530, 150], [438, 420], [430, 760], [480, 1100], [510, 1400]], n: 11, gap: 9 },
  { c: [[570, -100], [410, 160], [318, 460], [304, 800], [352, 1150], [384, 1400]], n: 12, gap: 10 },
  { c: [[430, -100], [270, 150], [176, 480], [172, 820], [222, 1200], [252, 1400]], n: 12, gap: 10 },
  { c: [[270, -100], [140, 200], [86, 520], [92, 880], [132, 1300]], n: 9, gap: 10 },
  { c: [[740, -100], [570, 220], [470, 520], [470, 860], [540, 1200]], n: 8, gap: 7 },
  { c: [[500, -100], [350, 300], [250, 640], [250, 1000], [300, 1400]], n: 10, gap: 11 },
  { c: [[340, -100], [200, 330], [130, 700], [150, 1100]], n: 8, gap: 12 },
];
const mirror = (b: Bundle, k: number): Bundle => ({
  ...b,
  c: b.c.map(([x, y]) => [1570 - x + k * (y / 400), y] as Pt),
});
const BUNDLES_R: Bundle[] = BUNDLES_L.map((b, i) => mirror(b, (i % 2 ? 1 : -1) * 6));

function lockLines(seed: number, bundles: Bundle[], blueEvery: number) {
  const rand = mulberry32(seed);
  let paper = '';
  let blue = '';
  bundles.forEach((b, bi) => {
    const c = sampleOpen(b.c, 14);
    // each bundle breaks into a few shorter locks along its flow
    const wins: Array<[number, number]> = [
      [0.0 + rand() * 0.06, 0.34 + rand() * 0.1],
      [0.28 + rand() * 0.1, 0.62 + rand() * 0.1],
      [0.55 + rand() * 0.1, 0.96],
    ].filter(() => rand() > 0.18) as Array<[number, number]>;
    wins.forEach(([w0, w1], wi) => {
      const n = Math.max(3, Math.round(b.n * (0.5 + rand() * 0.5)));
      const gap = b.gap * (0.7 + rand() * 0.6);
      const shift = (rand() - 0.5) * b.gap * 3;
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * gap + shift;
        const pts = offset(c, (t) => off * (0.35 + 0.65 * Math.pow(bell((t - w0) / (w1 - w0)), 0.5)));
        const a = Math.floor(pts.length * (w0 + rand() * 0.07));
        const e = Math.floor(pts.length * (w1 - rand() * 0.1));
        const seg = pts.slice(a, e).filter((_, j) => j % 4 === 0);
        if (seg.length < 3) continue;
        const d = polySmooth(seg);
        if (bi < 3 && wi < 2 && k % blueEvery === 0) blue += d;
        else paper += d;
      }
    });
  });
  return { paper, blue };
}
const LL = lockLines(61, BUNDLES_L, 4);
const LR = lockLines(63, BUNDLES_R, 4);
const STR_L = ri(LL.paper);
const STR_R = ri(LR.paper);
const SHEEN_L = ri(LL.blue);
const SHEEN_R = ri(LR.blue);

/* hair spikes that break the outer silhouette at the frame edges */
function spikes(seed: number, side: 'l' | 'r') {
  const rand = mulberry32(seed);
  let d = '';
  const x = side === 'l' ? 40 : 1560;
  for (let i = 0; i < 40; i++) {
    const y = -100 + i * 38 + rand() * 20;
    const len = 20 + rand() * 60;
    const dir = side === 'l' ? -1 : 1;
    d += `M${x} ${fmt(y)}L${fmt(x + dir * len)} ${fmt(y + 8 + rand() * 20)}L${x} ${fmt(y + 16 + rand() * 10)}Z`;
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* robe (collar) below the chin                                        */
/* ------------------------------------------------------------------ */

const COLLAR = closed([[560, 1130], [700, 1100], [790, 1160], [880, 1130], [1020, 1090], [1100, 1400], [560, 1400]], 0.05);
const COLLAR_LINES = ri(hatch({ seed: 71, x: 560, y: 1090, width: 540, height: 310, angle: 78, spacing: 14, wobble: 1.5, breakChance: 0.1, step: 40 }));

export const FACE_ART = {
  face: FACE,
  faceClip: FACE,
  neck: NECK,
  neckLines: NECK_LINES,
  baseLines: BASE_LINES,
  mid: MID,
  dark: DARK,
  deep: DEEP,
  cross: CROSS,
  highlights: HIGHLIGHTS,
  eyes: [EYE_NEAR, EYE_FAR],
  browNear: BROW_NEAR,
  browFar: BROW_FAR,
  browHairs: BROW_HAIRS,
  nose: NOSE,
  nostrils: NOSTRILS,
  mouthLine: MOUTH_LINE,
  lipLower: LIP_LOWER,
  lipCorners: LIP_CORNERS,
  philtrum: PHILTRUM,
  chinLine: CHIN_LINE,
  contour: CONTOUR,
  specks: SPECKS,
  tear: TEAR,
  tearHi: TEAR_HI,
  tearDrops: TEAR_DROPS,
  tearSmear: TEAR_SMEAR,
  tearTop: TEAR_C[0],
  hairL: HAIR_L,
  hairR: HAIR_R,
  lock: LOCK,
  lockStrand: LOCK_STRAND,
  fringeL: FRINGE_L,
  looseL: LOOSE_L,
  looseR: LOOSE_R,
  strL: STR_L,
  strR: STR_R,
  sheenL: SHEEN_L,
  sheenR: SHEEN_R,
  spikesL: spikes(81, 'l'),
  spikesR: spikes(82, 'r'),
  collar: COLLAR,
  collarLines: COLLAR_LINES,
};
