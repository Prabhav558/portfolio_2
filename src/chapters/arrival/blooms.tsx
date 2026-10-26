import { roughen, type Pt } from '../../art';

/** Ink blooms live in the hand's reach viewBox user space (x 250..1000, y 190..640, overflow visible). */
interface BloomSpec {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  seed: number;
  /** drips: x offset from cx (in units of rx), length */
  drips?: { dx: number; len: number; w: number }[];
  dots?: { x: number; y: number; r: number }[];
}

const SPECS: BloomSpec[] = [
  { cx: 78, cy: 246, rx: 100, ry: 50, seed: 3, drips: [{ dx: -0.35, len: 62, w: 9 }, { dx: 0.42, len: 34, w: 7 }], dots: [{ x: 214, y: 232, r: 5 }, { x: 226, y: 262, r: 3 }] },
  { cx: 52, cy: 392, rx: 60, ry: 34, seed: 11, drips: [{ dx: 0.1, len: 44, w: 8 }], dots: [{ x: 128, y: 372, r: 4 }] },
  { cx: 176, cy: 448, rx: 36, ry: 22, seed: 19, drips: [{ dx: -0.2, len: 26, w: 6 }] },
  { cx: -48, cy: 318, rx: 48, ry: 28, seed: 27, dots: [{ x: -112, y: 340, r: 4 }, { x: -118, y: 300, r: 2.6 }] },
  { cx: -108, cy: 214, rx: 34, ry: 20, seed: 35, drips: [{ dx: 0.3, len: 30, w: 6 }] },
  { cx: 262, cy: 214, rx: 26, ry: 15, seed: 43, dots: [{ x: 300, y: 238, r: 3 }] },
];

export const blob = (cx: number, cy: number, rx: number, ry: number, seed: number, irreg: number, amt: number) => {
  const n = 11;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // deterministic lobes, not random: sine mix with a seed phase
    const k = 1 + irreg * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 5 + seed * 1.7) * 0.4);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return roughen(pts, amt, seed, { segment: 12, smooth: 0.75 });
};

const drip = (x: number, y0: number, len: number, w: number, seed: number) => {
  const pts: Pt[] = [
    [x - w / 2, y0],
    [x + w / 2, y0],
    [x + w * 0.32, y0 + len * 0.7],
    [x + w * 0.95, y0 + len * 0.9],
    [x, y0 + len + w * 0.7],
    [x - w * 0.95, y0 + len * 0.9],
    [x - w * 0.32, y0 + len * 0.7],
  ];
  return roughen(pts, 0.7, seed, { segment: 9, smooth: 0.55 });
};

export interface Bloom {
  id: number;
  o: string;
  halo: string;
  d: string;
  shade: string;
  drips: { d: string; o: string }[];
  dots: { x: number; y: number; r: number }[];
}

export const BLOOMS: Bloom[] = SPECS.map((s, i) => ({
  id: i,
  o: `${s.cx} ${s.cy}`,
  halo: blob(s.cx + 3, s.cy + 5, s.rx * 1.14, s.ry * 1.2, s.seed + 1, 0.3, 4),
  d: blob(s.cx, s.cy, s.rx, s.ry, s.seed, 0.34, 3.2),
  shade: blob(s.cx + s.rx * 0.2, s.cy + s.ry * 0.28, s.rx * 0.55, s.ry * 0.5, s.seed + 5, 0.3, 2),
  drips: (s.drips ?? []).map((dr, j) => {
    const x = s.cx + dr.dx * s.rx;
    const y0 = s.cy + s.ry * 0.62;
    return { d: drip(x, y0, dr.len, dr.w, s.seed * 3 + j), o: `${x} ${y0}` };
  }),
  dots: s.dots ?? [],
}));

const RED = '#722F37';
const INK = '#050505';

export function BloomShape({ b }: { b: Bloom }) {
  return (
    <g data-bf="">
      <g data-bs="" data-o={b.o}>
        <path d={b.halo} fill={INK} opacity={0.3} />
        {b.drips.map((dr, i) => (
          <path key={i} data-drip="" data-o={dr.o} d={dr.d} fill={RED} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
        ))}
        <path d={b.d} fill={RED} stroke={INK} strokeWidth={1.7} strokeLinejoin="round" />
        <path d={b.shade} fill="#4A1D23" opacity={0.5} />
        {b.dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={RED} stroke={INK} strokeWidth={1.2} />
        ))}
      </g>
    </g>
  );
}

/** The detail panel's single zoomed bloom, drawn in its own 0 0 400 300 space. */
export const INSET_BLOOM = {
  halo: blob(206, 150, 124, 74, 52, 0.3, 5),
  d: blob(200, 144, 112, 62, 51, 0.36, 4),
  shade: blob(232, 168, 60, 28, 56, 0.3, 3),
  drip: drip(176, 190, 60, 14, 57),
};
