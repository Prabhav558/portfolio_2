import { useId, useMemo } from 'react';
import { hatch, smoothPath, type Pt } from '../../art/procedural';
import { mulberry32 } from '../../lib/random';
import { BLACK, LATTE, PAPER, RED, r1 } from './art';

/**
 * SafePath: an engraved street map. Blocks are hatched quads on a jittered
 * lattice; the shortest route threads the incidents, the safe route avoids them.
 */

const COLS = 7;
const ROWS = 6;
const X0 = 96;
const X1 = 904;
const Y0 = 160;
const Y1 = 850;

type Kind = 'hatch' | 'solid' | 'plain' | 'red' | 'latte';

function build() {
  const rng = mulberry32(5102);
  const P: Pt[][] = [];
  for (let i = 0; i <= COLS; i++) {
    P.push([]);
    for (let j = 0; j <= ROWS; j++) {
      const edge = i === 0 || j === 0 || i === COLS || j === ROWS;
      const jx = edge && (i === 0 || i === COLS) ? 0 : (rng() - 0.5) * 30;
      const jy = edge && (j === 0 || j === ROWS) ? 0 : (rng() - 0.5) * 30;
      P[i].push([X0 + ((X1 - X0) * i) / COLS + jx, Y0 + ((Y1 - Y0) * j) / ROWS + jy]);
    }
  }

  const blocks: { d: string; hatch: string; kind: Kind; angle: number }[] = [];
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      const q = [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]];
      const cx = q.reduce((a, p) => a + p[0], 0) / 4;
      const cy = q.reduce((a, p) => a + p[1], 0) / 4;
      const s = 0.8 + rng() * 0.04;
      const pts: Pt[] = q.map((p) => [cx + (p[0] - cx) * s, cy + (p[1] - cy) * s]);
      const r = rng();
      const kind: Kind = r < 0.5 ? 'hatch' : r < 0.68 ? 'solid' : r < 0.82 ? 'plain' : r < 0.92 ? 'red' : 'latte';
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const angle = [38, 128, 90, 0][(i + j * 2) % 4];
      const hd =
        kind === 'plain'
          ? ''
          : hatch({
              seed: 700 + i * 13 + j * 29,
              x: Math.min(...xs),
              y: Math.min(...ys),
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys),
              angle,
              spacing: kind === 'solid' ? 6 : kind === 'hatch' ? 6.4 : 8,
              spacing2: kind === 'hatch' ? 3.4 : undefined,
              wobble: 1,
              breakChance: 0.05,
              step: 34,
            });
      blocks.push({ d: `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}Z`, hatch: hd, kind, angle });
    }
  }

  const at = (i: number, j: number): Pt => P[i][j];
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const route = (cells: [number, number][], k = 0.1) => smoothPath(cells.map(([i, j]) => at(i, j)), false, k);

  const shortest = route(
    [[1, 6], [1, 5], [2, 5], [2, 4], [3, 4], [3, 3], [4, 3], [4, 2], [5, 2], [5, 1], [6, 1]],
    0.08,
  );
  const safe = route([[1, 6], [4, 6], [4, 5], [6, 5], [6, 1]], 0.08);

  const incidents: Pt[] = [
    mid(at(2, 5), at(2, 4)),
    mid(at(3, 4), at(3, 3)),
    mid(at(3, 3), at(4, 3)),
    mid(at(4, 3), at(4, 2)),
    mid(at(5, 2), at(5, 1)),
    mid(at(4, 2), at(5, 2)),
    at(1, 2),
    mid(at(2, 1), at(3, 1)),
    mid(at(6, 3), at(6, 4)),
  ];
  const halo: Pt = mid(at(3, 3), at(4, 3));

  const river = smoothPath(
    [
      [X0 - 30, 560],
      [260, 540],
      [420, 612],
      [570, 520],
      [720, 440],
      [X1 + 30, 470],
    ],
    false,
    1 / 6,
  );
  return { blocks, shortest, safe, incidents, halo, river, A: at(1, 6), B: at(6, 1), P };
}

const FILL: Record<Kind, string> = { hatch: PAPER, solid: BLACK, plain: PAPER, red: RED, latte: LATTE };
const LINE: Record<Kind, string> = { hatch: BLACK, solid: PAPER, plain: BLACK, red: BLACK, latte: BLACK };

export default function RouteArt({ compact }: { compact: boolean }) {
  const uid = useId().replace(/:/g, '');
  const m = useMemo(build, []);
  return (
    <svg
      viewBox={compact ? '40 130 920 760' : '0 40 1000 920'}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="An engraved street map. A dashed shortest route passes through marked incidents, while a solid safer route bends around them to a pin."
      style={{ overflow: 'visible' }}
    >
      <defs>
        {m.blocks.map((b, i) => (
          <clipPath id={`${uid}b${i}`} key={i}>
            <path d={b.d} />
          </clipPath>
        ))}
        <clipPath id={`${uid}rv`}>
          <rect data-e="routeclip" x="0" y="0" width="1000" height="1000" />
        </clipPath>
        <clipPath id={`${uid}sheet`}>
          <rect x="62" y="118" width="876" height="776" />
        </clipPath>
      </defs>

      <g transform="rotate(-1.2 500 500)">
        {/* the sheet and its streets */}
        <g data-px="26" data-py="-8" data-e="sheet">
          <rect x="74" y="130" width="876" height="776" fill={BLACK} />
          <rect x="62" y="118" width="876" height="776" fill={PAPER} stroke={BLACK} strokeWidth="5" />
          <rect x="74" y="130" width="852" height="752" fill="none" stroke={BLACK} strokeWidth="1.6" />
          <g clipPath={`url(#${uid}sheet)`}>
            {m.blocks.map((b, i) => (
              <g key={i}>
                <path d={b.d} fill={FILL[b.kind]} />
                <g clipPath={`url(#${uid}b${i})`}>
                  {b.hatch && <path d={b.hatch} fill="none" stroke={LINE[b.kind]} strokeWidth="1.3" strokeLinecap="round" />}
                  {b.kind === 'plain' && (
                    <g fill={BLACK}>
                      {[0.3, 0.55, 0.75].map((f, k) => {
                        const bb = b.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
                        const xs = bb.filter((_, n) => n % 2 === 0);
                        const ys = bb.filter((_, n) => n % 2 === 1);
                        const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * f;
                        const y = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * (0.35 + 0.18 * k);
                        return <circle key={k} cx={r1(x)} cy={r1(y)} r="5" />;
                      })}
                    </g>
                  )}
                </g>
                <path d={b.d} fill="none" stroke={BLACK} strokeWidth="2.2" strokeLinejoin="round" />
              </g>
            ))}
            {/* river */}
            <path d={m.river} fill="none" stroke={BLACK} strokeWidth="52" strokeLinecap="round" />
            <path d={m.river} fill="none" stroke={LATTE} strokeWidth="44" strokeLinecap="round" />
            <path d={m.river} fill="none" stroke={BLACK} strokeWidth="34" strokeDasharray="1.4 5.2" opacity="0.65" />
          </g>
        </g>

        {/* routes */}
        <g data-px="-20" data-py="4">
          <path d={m.shortest} fill="none" stroke={BLACK} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <path d={m.shortest} fill="none" stroke={PAPER} strokeWidth="5" strokeLinecap="round" strokeDasharray="14 11" data-e="fast" />
          <g clipPath={`url(#${uid}rv)`}>
            <path d={m.safe} fill="none" stroke={BLACK} strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" />
            <path d={m.safe} fill="none" stroke={RED} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <path d={m.safe} fill="none" stroke={PAPER} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 12" />
          </g>
        </g>

        {/* incidents and halos */}
        <g data-px="-46" data-py="-10">
          <g fill="none" stroke={RED} strokeWidth="2">
            {[34, 58, 86].map((r, i) => (
              <circle key={r} cx={r1(m.halo[0])} cy={r1(m.halo[1])} r={r} strokeOpacity={0.9 - i * 0.22} strokeDasharray={i === 2 ? '3 7' : undefined} />
            ))}
          </g>
          {m.incidents.map(([x, y], i) => (
            <g key={i} transform={`translate(${r1(x)} ${r1(y)}) rotate(45)`} data-e="mark">
              <path d="M-16 -4.5H-4.5V-16H4.5V-4.5H16V4.5H4.5V16H-4.5V4.5H-16Z" fill={RED} stroke={BLACK} strokeWidth="3.4" strokeLinejoin="round" />
            </g>
          ))}
          {/* start marker */}
          <g transform={`translate(${r1(m.A[0])} ${r1(m.A[1])})`}>
            <circle r="17" fill={PAPER} stroke={BLACK} strokeWidth="4" />
            <circle r="6.5" fill={BLACK} />
          </g>
        </g>

        {/* the pin */}
        <g data-px="-84" data-py="-26">
          <g transform={`translate(${r1(m.B[0])} ${r1(m.B[1])})`}>
            <ellipse cx="6" cy="6" rx="26" ry="8" fill={BLACK} opacity="0.55" />
            <g data-e="pin">
              <path d="M0 0C-46 -50 -42 -112 0 -112C42 -112 46 -50 0 0Z" fill={RED} stroke={BLACK} strokeWidth="5" strokeLinejoin="round" transform="translate(0 -2)" />
              <path d="M-24 -66C-24 -96 -6 -104 8 -102" fill="none" stroke={PAPER} strokeWidth="4" strokeLinecap="round" transform="translate(0 -2)" />
              <circle cx="0" cy="-70" r="16" fill={PAPER} stroke={BLACK} strokeWidth="4" />
              <circle cx="0" cy="-70" r="5.5" fill={BLACK} />
            </g>
          </g>
        </g>
      </g>

      {/* legend + compass: fastest layer */}
      <g data-px="-50" data-py="-16" fontFamily="'JetBrains Mono', monospace" fontSize="22" letterSpacing="3" fontWeight="500">
        <g transform="translate(70 944)">
          <rect x="-10" y="-26" width="196" height="36" fill={BLACK} />
          <path d="M4 -8H42" stroke={RED} strokeWidth="9" strokeLinecap="round" />
          <path d="M4 -8H42" stroke={PAPER} strokeWidth="2" strokeDasharray="3 8" />
          <text x="54" fill={PAPER}>SAFEST</text>
        </g>
        <g transform="translate(276 944)">
          <rect x="-10" y="-26" width="226" height="36" fill={BLACK} />
          <path d="M4 -8H36" stroke={PAPER} strokeWidth="4.5" strokeDasharray="9 6" />
          <text x="48" fill={PAPER}>SHORTEST</text>
        </g>
        <g transform="translate(528 944)">
          <rect x="-10" y="-26" width="226" height="36" fill={BLACK} />
          <g transform="translate(14 -8) rotate(45)">
            <path d="M-8 -2.5H-2.5V-8H2.5V-2.5H8V2.5H2.5V8H-2.5V2.5H-8Z" fill={RED} stroke={PAPER} strokeWidth="1.5" />
          </g>
          <text x="36" fill={PAPER}>INCIDENT</text>
        </g>
        <g transform="translate(868 950)" fill="none" stroke={BLACK} strokeWidth="3">
          <circle r="32" fill={PAPER} />
          <path d="M0 -28L8 0L0 28L-8 0Z" fill={BLACK} />
          <path d="M-28 0L0 -6L28 0L0 6Z" strokeWidth="1.6" />
          <text y="-38" textAnchor="middle" fill={BLACK} stroke="none" fontSize="20">N</text>
        </g>
      </g>
    </svg>
  );
}
