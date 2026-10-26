import { useId } from 'react';
import { mulberry32 } from '../../lib/random';
import { fmt, type Pt } from '../../art/procedural';
import { bell, ribbon } from './geo';

const INK = '#050505';
const PAPER = '#E8DCC6';
const BLUE = '#B7A89A';

const CX = 800;
const CY = 500;

/* ---- explosive paper burst with jagged, speed-streaked left/right edges ---- */
function burstShape(): string {
  const rand = mulberry32(4242);
  const rx = 600;
  const ry = 290;
  const pts: Pt[] = [];
  const N = 170;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const base = 1 / Math.sqrt((c / rx) ** 2 + (s / ry) ** 2);
    const horiz = Math.abs(c);
    const roll = rand();
    // long horizontal streaks on the flanks, small chips top and bottom
    const k = roll < 0.4 ? 1 + rand() * 0.34 * horiz ** 1.5 : 0.9 + rand() * 0.07;
    const wob = 1 + (rand() - 0.5) * 0.05;
    const r = base * k * wob;
    pts.push([CX + c * r, CY + s * r * 0.92 - c * 18]);
  }
  return 'M' + pts.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join('L') + 'Z';
}

function speedLines() {
  const rand = mulberry32(777);
  const thin: string[] = [];
  const mid: string[] = [];
  const thick: string[] = [];
  for (let i = 0; i < 120; i++) {
    const y = CY - 300 + rand() * 600;
    const x = CX - 700 + rand() * 1100;
    const len = 90 + rand() * 520;
    const dy = -len * (0.03 + rand() * 0.06);
    const d = `M${fmt(x)} ${fmt(y)}l${fmt(len)} ${fmt(dy)}`;
    const roll = rand();
    (roll < 0.62 ? thin : roll < 0.9 ? mid : thick).push(d);
  }
  // tapered wedges: dark gouges dragged across the paper
  let wedges = '';
  for (let i = 0; i < 16; i++) {
    const y = CY - 250 + rand() * 520;
    const x = CX - 640 + rand() * 640;
    const len = 280 + rand() * 520;
    wedges += ribbon(
      [[x, y], [x + len * 0.5, y - len * 0.02], [x + len, y - len * 0.05]],
      (t) => (2 + 12 * bell(t) ** 1.3) * (0.4 + 0.6 * (1 - t)),
      { per: 6 },
    );
  }
  // paper streaks that run off the burst into the black
  const rand2 = mulberry32(31);
  let outside = '';
  for (let i = 0; i < 34; i++) {
    const left = i % 2 === 0;
    const y = CY - 330 + rand2() * 660;
    const x = left ? CX - 760 - rand2() * 200 : CX + 560 + rand2() * 120;
    const len = 80 + rand2() * 300;
    outside += `M${fmt(x)} ${fmt(y)}l${fmt(len)} ${fmt(-len * 0.05)}`;
  }
  return { thin: thin.join(''), mid: mid.join(''), thick: thick.join(''), wedges, outside };
}

/* ---- ink shards: [x, y, size, vx, vy, spin, kind, survivesOnMobile] ---- */
type ShardSpec = [number, number, number, number, number, number, 'b' | 'p', boolean];
const SHARDS: ShardSpec[] = [
  [1180, 380, 30, 230, -120, 160, 'b', true],
  [1250, 520, 24, 320, 20, -120, 'b', false],
  [1130, 640, 34, 190, 150, 200, 'b', true],
  [1330, 450, 18, 380, -90, 90, 'b', false],
  [1290, 610, 20, 300, 160, -170, 'p', false],
  [1060, 330, 16, 120, -170, 130, 'b', true],
  [470, 420, 26, -250, -90, -150, 'b', false],
  [560, 610, 22, -210, 140, 120, 'b', true],
  [400, 540, 16, -330, 40, 180, 'p', false],
  [660, 300, 18, -110, -180, -110, 'p', true],
  [1010, 700, 14, 90, 190, 140, 'b', true],
  [340, 350, 20, -360, -60, -90, 'b', false],
  [900, 280, 12, 40, -200, 100, 'b', true],
  [720, 720, 14, -60, 200, -150, 'p', false],
];

function shardPath(seed: number, r: number): string {
  const rand = mulberry32(seed);
  const n = 5;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.5;
    const rr = r * (i % 2 ? 0.45 + rand() * 0.3 : 0.9 + rand() * 0.5);
    pts.push([Math.cos(a) * rr * 1.5, Math.sin(a) * rr * 0.8]);
  }
  return 'M' + pts.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join('L') + 'Z';
}

const SHAPE = burstShape();
const LINES = speedLines();

export default function Burst({ mobile }: { mobile: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clip = `${uid}-b`;
  return (
    <svg
      viewBox={mobile ? '480 -190 640 1384' : '0 0 1600 1000'}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <path d={SHAPE} />
        </clipPath>
      </defs>
      <rect x="-300" y="-400" width="2200" height="1900" fill={INK} />
      <g data-b="streaks">
        <path d={LINES.outside} fill="none" stroke={PAPER} strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      </g>
      <g data-b="shape">
        <path d={SHAPE} fill={PAPER} />
        <g clipPath={`url(#${clip})`}>
          <g data-b="lines">
            <path d={LINES.thin} fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
            <path d={LINES.mid} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <path d={LINES.thick} fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
            <path d={LINES.wedges} fill={INK} />
          </g>
        </g>
      </g>
      {SHARDS.map(([x, y, r, vx, vy, spin, kind, onMobile], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g data-shard="" data-vx={vx} data-vy={vy} data-spin={spin} data-desk={onMobile ? undefined : ''}>
            <path
              d={shardPath(i + 5, r)}
              fill={kind === 'b' ? BLUE : PAPER}
              stroke={INK}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        </g>
      ))}
    </svg>
  );
}
