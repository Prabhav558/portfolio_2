import { useId, useMemo } from 'react';
import type { ProjectArt } from '../config/portfolio';
import { hatch, smoothPath, type Pt } from '../art/procedural';
import { mulberry32 } from '../lib/random';

/**
 * Header illustrations for the case-study pages: engraved plates drawn
 * procedurally (seeded, computed once). Palette hexes only.
 */
const INK = '#050505';
const BURG = '#722F37';
const DEEP = '#4A1D23';
const CREAM = '#E8DCC6';
const LATTE = '#B7A89A';

export const ART_W = 960;
export const ART_H = 420;

interface Props {
  art: ProjectArt;
  label: string;
  className?: string;
}

export default function CaseArt({ art, label, className }: Props) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${ART_W} ${ART_H}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={ART_W} height={ART_H} fill={CREAM} />
      {art === 'shield' && <Shield />}
      {art === 'pipeline' && <Pipeline />}
      {art === 'route' && <Route />}
      <Frame />
    </svg>
  );
}

/** Plate frame: double rule with corner ticks. */
function Frame() {
  return (
    <g fill="none" stroke={INK}>
      <rect x="1.5" y="1.5" width={ART_W - 3} height={ART_H - 3} strokeWidth="3" />
      <rect x="9" y="9" width={ART_W - 18} height={ART_H - 18} strokeWidth="1" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Shield: the platform, its perimeter and ten orbiting modules        */
/* ------------------------------------------------------------------ */

const SHIELD = 'M-100 -130 L100 -130 L100 10 C100 80 44 126 0 156 C-44 126 -100 80 -100 10 Z';
const SHIELD_IN = 'M-82 -112 L82 -112 L82 8 C82 68 36 106 0 132 C-36 106 -82 68 -82 8 Z';

function Shield() {
  const uid = useId().replace(/:/g, '');
  const geo = useMemo(() => {
    const rand = mulberry32(21);
    const cx = 480;
    const cy = 210;
    const rx = 340;
    const ry = 175;
    const nodes = Array.from({ length: 10 }, (_, i) => {
      const a = ((-90 + 18 + i * 36) * Math.PI) / 180;
      return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
    });
    // Log columns at both edges: rows of ink dashes, like lines in a SIEM feed.
    const rows = (x0: number, x1: number, seed: number) => {
      const r = mulberry32(seed);
      let ink = '';
      let burg = '';
      for (let y = 74; y < 350; y += 13) {
        let x = x0 + r() * 8;
        let d = '';
        while (x < x1 - 6) {
          const len = 6 + r() * 26;
          d += `M${x.toFixed(1)} ${y}h${Math.min(len, x1 - x).toFixed(1)}`;
          x += len + 5 + r() * 7;
        }
        if (rand() < 0.16) burg += d;
        else ink += d;
      }
      return { ink, burg };
    };
    return {
      cx,
      cy,
      rx,
      ry,
      nodes,
      left: rows(26, 112, 5),
      right: rows(848, 934, 9),
      hatchL: hatch({ seed: 4, x: -82, y: -112, width: 84, height: 250, angle: 64, spacing: 5.2, wobble: 0.9 }),
      hatchR: hatch({ seed: 8, x: 0, y: -112, width: 84, height: 250, angle: -28, spacing: 7.5, wobble: 0.9 }),
    };
  }, []);

  return (
    <g>
      <g fill="none" stroke={INK} strokeLinecap="square">
        <path d={geo.left.ink} strokeWidth="2" />
        <path d={geo.right.ink} strokeWidth="2" />
      </g>
      <g fill="none" stroke={BURG} strokeLinecap="square">
        <path d={geo.left.burg} strokeWidth="2.4" />
        <path d={geo.right.burg} strokeWidth="2.4" />
      </g>

      {/* perimeter rings */}
      <ellipse cx={geo.cx} cy={geo.cy} rx={geo.rx} ry={geo.ry} fill="none" stroke={INK} strokeWidth="1.6" strokeDasharray="2 7" />
      <ellipse cx={geo.cx} cy={geo.cy} rx={geo.rx - 120} ry={geo.ry - 62} fill="none" stroke={BURG} strokeWidth="1.2" strokeDasharray="10 8" />

      {/* spokes */}
      <g stroke={INK} strokeWidth="1.5">
        {geo.nodes.map((n, i) => (
          <line key={i} x1={geo.cx} y1={geo.cy} x2={n.x} y2={n.y} />
        ))}
      </g>

      {/* modules */}
      {geo.nodes.map((n, i) => {
        const fill = i % 3 === 0 ? BURG : i % 3 === 1 ? CREAM : LATTE;
        return (
          <g key={i} transform={`translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`}>
            <rect x="-14" y="-14" width="34" height="34" fill={INK} />
            <rect x="-17" y="-17" width="34" height="34" fill={fill} stroke={INK} strokeWidth="2.4" />
            <path d="M-17 -5 L-5 -17 M-17 7 L7 -17 M-17 17 L17 -17" stroke={fill === BURG ? DEEP : INK} strokeWidth="1" fill="none" />
          </g>
        );
      })}

      {/* the shield */}
      <g transform={`translate(${geo.cx} ${geo.cy}) scale(1.05)`}>
        <defs>
          <clipPath id={`${uid}-in`}>
            <path d={SHIELD_IN} />
          </clipPath>
        </defs>
        <path d={SHIELD} transform="translate(10 10)" fill={INK} />
        <path d={SHIELD} fill={BURG} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d={SHIELD_IN} fill={CREAM} />
        <g clipPath={`url(#${uid}-in)`}>
          <path d={geo.hatchL} fill="none" stroke={INK} strokeWidth="1.1" />
          <rect x="0" y="-120" width="90" height="270" fill={BURG} />
          <path d={geo.hatchR} fill="none" stroke={DEEP} strokeWidth="1.2" />
        </g>
        <path d={SHIELD_IN} fill="none" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <line x1="0" y1="-112" x2="0" y2="132" stroke={INK} strokeWidth="2" />
        {/* keyhole */}
        <g stroke={CREAM} strokeWidth="2.5">
          <circle cx="0" cy="-16" r="19" fill={INK} />
          <path d="M-8 -4 L8 -4 L15 52 L-15 52 Z" fill={INK} strokeLinejoin="round" />
        </g>
        <circle cx="-6" cy="-23" r="4" fill={CREAM} />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline: six stations from log feed to analysis                    */
/* ------------------------------------------------------------------ */

const STATIONS = ['Watch', 'Parse', 'Cluster', 'Correlate', 'Rate-limit', 'Analyze'];
const SX = [110, 258, 406, 554, 702, 850];
const SY = 205;
const BLOCK_FILL = [CREAM, LATTE, CREAM, LATTE, CREAM, BURG];

function Glyph({ i }: { i: number }) {
  const s = i === 5 ? CREAM : INK;
  switch (i) {
    case 0:
      return (
        <g>
          <path d="M-27 0 Q0 -24 27 0 Q0 24 -27 0 Z" fill={CREAM} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
          <circle r="10" fill={BURG} stroke={INK} strokeWidth="2.2" />
          <circle r="4" fill={INK} />
        </g>
      );
    case 1:
      return (
        <g fill="none" stroke={s} strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M-9 -19 L-27 0 L-9 19" />
          <path d="M9 -19 L27 0 L9 19" />
          <path d="M4 -22 L-4 22" stroke={BURG} strokeWidth="4" />
        </g>
      );
    case 2: {
      const groups: Array<[number, number, string]> = [
        [-16, -13, INK],
        [17, -10, INK],
        [0, 17, BURG],
      ];
      const offs = [
        [-5, -4],
        [4, -2],
        [-1, 5],
        [6, 5],
      ];
      return (
        <g>
          {groups.map(([gx, gy, c], gi) => (
            <g key={gi} transform={`translate(${gx} ${gy})`}>
              <circle r="13" fill="none" stroke={INK} strokeWidth="1.4" strokeDasharray="3 3" />
              {offs.map(([ox, oy], k) => (
                <circle key={k} cx={ox} cy={oy} r="3.3" fill={c} stroke={INK} strokeWidth="1" />
              ))}
            </g>
          ))}
        </g>
      );
    }
    case 3: {
      const p: Pt[] = [
        [-22, 12],
        [-6, -18],
        [22, -6],
        [12, 20],
      ];
      return (
        <g>
          <path d="M-22 12 L-6 -18 L22 -6 L12 20 L-22 12 M-6 -18 L12 20" fill="none" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          {p.map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r="6.5" fill={k % 2 ? CREAM : BURG} stroke={INK} strokeWidth="2.2" />
          ))}
        </g>
      );
    }
    case 4:
      return (
        <g>
          <path d="M-27 -22 L27 -22 L7 4 L7 25 L-7 25 L-7 4 Z" fill={LATTE} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M-20 -14 L20 -14 M-13 -6 L13 -6" stroke={INK} strokeWidth="1.4" />
          <rect x="-3" y="9" width="6" height="12" fill={BURG} />
        </g>
      );
    default: {
      const rays = Array.from({ length: 12 }, (_, k) => {
        const a = (k / 12) * Math.PI * 2;
        const r0 = 12;
        const r1 = k % 2 ? 26 : 32;
        return `M${(Math.cos(a) * r0).toFixed(1)} ${(Math.sin(a) * r0).toFixed(1)}L${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)}`;
      });
      return (
        <g>
          <path d={rays.join('')} stroke={CREAM} strokeWidth="3" strokeLinecap="square" />
          <circle r="9" fill={CREAM} stroke={INK} strokeWidth="2.2" />
        </g>
      );
    }
  }
}

function Pipeline() {
  const geo = useMemo(() => {
    const rand = mulberry32(33);
    // Incoming log lines converge on the first station.
    const feed = Array.from({ length: 9 }, (_, i) => {
      const y = 112 + i * 24 + rand() * 6;
      const x0 = 14 + rand() * 20;
      return { d: `M${x0.toFixed(1)} ${y.toFixed(1)}H${(x0 + 20 + rand() * 18).toFixed(1)}C54 ${y.toFixed(1)} 52 ${SY} 64 ${SY}`, burg: i % 4 === 2 };
    });
    // Bars under each station: event volume shrinks as the pipeline filters.
    const bars = SX.map((x, si) =>
      Array.from({ length: 6 }, (_, k) => ({
        x: x - 24 + k * 9,
        h: Math.max(8, 74 - si * 11 + (rand() - 0.5) * 14 - (k % 2) * 5),
      })),
    );
    return { feed, bars };
  }, []);
  const BASE = 388;

  return (
    <g fontFamily="'JetBrains Mono', monospace">
      {/* ground rules */}
      <path d={`M24 ${BASE + 6}H936`} stroke={INK} strokeWidth="2" />
      <rect x="24" y={BASE + 10} width="912" height="8" fill="url(#hatch-diag-fine)" />

      {/* feed in */}
      <g fill="none" strokeWidth="1.8">
        {geo.feed.map((f, i) => (
          <path key={i} d={f.d} stroke={f.burg ? BURG : INK} />
        ))}
      </g>

      {/* pipes between stations */}
      {SX.slice(0, -1).map((x, i) => {
        const x0 = x + 46;
        const x1 = SX[i + 1] - 46;
        return (
          <g key={i}>
            <rect x={x0 + 4} y={SY - 11} width={x1 - x0} height="30" fill={INK} />
            <rect x={x0} y={SY - 15} width={x1 - x0} height="30" fill={LATTE} stroke={INK} strokeWidth="2.6" />
            <path d={`M${x0} ${SY - 8}H${x1}`} stroke={CREAM} strokeWidth="2" />
            <path d={`M${(x0 + x1) / 2 - 5} ${SY - 8}l8 8l-8 8`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="square" />
            <rect x={x0 + 8} y={SY - 3} width="6" height="6" fill={BURG} />
          </g>
        );
      })}
      {/* out */}
      <rect x="900" y={SY - 11} width="34" height="30" fill={INK} />
      <rect x="896" y={SY - 15} width="34" height="30" fill={LATTE} stroke={INK} strokeWidth="2.6" />
      <rect x="926" y={SY - 22} width="12" height="44" fill={BURG} stroke={INK} strokeWidth="2.6" />

      {/* stations */}
      {SX.map((x, i) => (
        <g key={i} transform={`translate(${x} ${SY})`}>
          <rect x="-40" y="-40" width="92" height="92" fill={INK} />
          <rect x="-46" y="-46" width="92" height="92" fill={BLOCK_FILL[i]} stroke={INK} strokeWidth="3" />
          <path d="M20 46 L46 46 L46 20 Z" fill="url(#hatch-diag-fine)" />
          <Glyph i={i} />
          <text x="-46" y="-58" fontSize="12" fill={BURG} letterSpacing="2">
            {String(i + 1).padStart(2, '0')}
          </text>
          <text x="0" y="76" fontSize="12" fill={INK} letterSpacing="1.6" textAnchor="middle" style={{ textTransform: 'uppercase' }}>
            {STATIONS[i]}
          </text>
        </g>
      ))}

      {/* volume bars */}
      {geo.bars.map((col, si) =>
        col.map((b, k) => <rect key={`${si}-${k}`} x={b.x} y={BASE - b.h} width="5" height={b.h} fill={si === 5 ? BURG : INK} />),
      )}

      {/* brackets: who decides what */}
      <g stroke={INK} strokeWidth="1.6" fill="none">
        <path d="M360 100V92H600V100" />
        <path d="M804 100V92H896V100" />
      </g>
      <text x="480" y="82" fontSize="11" letterSpacing="2.2" textAnchor="middle" fill={INK}>
        DETERMINISTIC RULES
      </text>
      <text x="850" y="82" fontSize="11" letterSpacing="2.2" textAnchor="middle" fill={BURG}>
        MODEL RANKS
      </text>
      <text x="32" y="82" fontSize="11" letterSpacing="2.2" fill={INK}>
        LOG LINES
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Route: a street grid, an incident hotspot, two paths                */
/* ------------------------------------------------------------------ */

const A: Pt = [90, 330];
const B: Pt = [890, 60];
const HOT: Pt = [500, 192];

function Route() {
  const geo = useMemo(() => {
    const rand = mulberry32(57);
    const hy = [60, 150, 240, 330, 400];
    const vx = [90, 220, 350, 490, 620, 760, 890];
    const hRoads = hy.map((y) => {
      const pts: Pt[] = Array.from({ length: 7 }, (_, i) => [i * 160, y + (i === 0 || i === 6 ? 0 : (rand() - 0.5) * 0)]);
      return smoothPath(pts, false, 0);
    });
    const vRoads = vx.map((x) => {
      const pts: Pt[] = Array.from({ length: 4 }, (_, i) => [x, i * 140]);
      return smoothPath(pts, false, 0);
    });
    // City blocks: some plain, some hatched, some latte parks.
    const blocks: Array<{ x: number; y: number; w: number; h: number; kind: 'hatch' | 'latte' }> = [];
    for (let i = 0; i < vx.length - 1; i++) {
      for (let j = 0; j < hy.length - 1; j++) {
        const r = rand();
        if (r < 0.2) blocks.push({ x: vx[i] + 9, y: hy[j] + 9, w: vx[i + 1] - vx[i] - 18, h: hy[j + 1] - hy[j] - 18, kind: 'latte' });
        else if (r > 0.78) blocks.push({ x: vx[i] + 9, y: hy[j] + 9, w: vx[i + 1] - vx[i] - 18, h: hy[j + 1] - hy[j] - 18, kind: 'hatch' });
      }
    }
    // Reported incidents cluster around the hotspot.
    const dots = Array.from({ length: 17 }, () => {
      const a = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 0.7) * 78;
      return { x: HOT[0] + Math.cos(a) * r * 1.2, y: HOT[1] + Math.sin(a) * r * 0.9 };
    });
    // A few strays elsewhere, so the data reads as real reports.
    const strays = Array.from({ length: 6 }, () => ({ x: 120 + rand() * 780, y: 40 + rand() * 340 })).filter(
      (p) => Math.hypot(p.x - HOT[0], p.y - HOT[1]) > 150,
    );
    return { hRoads, vRoads, blocks, dots, strays };
  }, []);

  const safe = `M${A[0]} ${A[1]}H760V150H${B[0]}V${B[1]}`;
  const mid: Pt = [760, 240];

  return (
    <g fontFamily="'JetBrains Mono', monospace">
      {/* blocks */}
      {geo.blocks.map((b, i) =>
        b.kind === 'latte' ? (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={LATTE} stroke={INK} strokeWidth="1.4" />
        ) : (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill="url(#hatch-diag-fine)" stroke={INK} strokeWidth="1.2" />
        ),
      )}
      {/* streets: casing, then paper fill so crossings merge */}
      <g fill="none" stroke={INK} strokeWidth="11" strokeLinejoin="round">
        {geo.hRoads.map((d, i) => (
          <path key={`hc${i}`} d={d} />
        ))}
        {geo.vRoads.map((d, i) => (
          <path key={`vc${i}`} d={d} />
        ))}
      </g>
      <g fill="none" stroke={CREAM} strokeWidth="7" strokeLinejoin="round">
        {geo.hRoads.map((d, i) => (
          <path key={`hf${i}`} d={d} />
        ))}
        {geo.vRoads.map((d, i) => (
          <path key={`vf${i}`} d={d} />
        ))}
      </g>

      {/* hotspot */}
      <circle cx={HOT[0]} cy={HOT[1]} r="98" fill={BURG} fillOpacity="0.14" stroke={BURG} strokeWidth="1.5" strokeDasharray="4 6" />
      <circle cx={HOT[0]} cy={HOT[1]} r="58" fill={BURG} fillOpacity="0.2" stroke={BURG} strokeWidth="1.5" />
      {[...geo.dots, ...geo.strays].map((d, i) => (
        <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={i < geo.dots.length ? 5.5 : 4.5} fill={i < geo.dots.length ? BURG : CREAM} stroke={INK} strokeWidth="1.8" />
      ))}

      {/* fastest (dashed) vs safer (solid) */}
      <path d={`M${A[0]} ${A[1]}L${B[0]} ${B[1]}`} stroke={INK} strokeWidth="3.2" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
      <path d={safe} fill="none" stroke={INK} strokeWidth="13" strokeLinejoin="round" strokeLinecap="round" />
      <path d={safe} fill="none" stroke={BURG} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />

      {/* labels */}
      <g fontSize="11" letterSpacing="1.8">
        <g transform="translate(300 214)">
          <rect x="4" y="4" width="76" height="20" fill={INK} />
          <rect width="76" height="20" fill={CREAM} stroke={INK} strokeWidth="2" />
          <text x="38" y="14" textAnchor="middle" fill={INK}>FASTEST</text>
        </g>
        <g transform="translate(380 344)">
          <rect x="4" y="4" width="64" height="20" fill={INK} />
          <rect width="64" height="20" fill={BURG} stroke={INK} strokeWidth="2" />
          <text x="32" y="14" textAnchor="middle" fill={CREAM}>SAFER</text>
        </g>
      </g>

      {/* SOS: concentric alert rings on the safer path */}
      <g transform={`translate(${mid[0]} ${mid[1]})`}>
        <circle r="38" fill="none" stroke={BURG} strokeWidth="1.2" opacity="0.4" />
        <circle r="26" fill="none" stroke={BURG} strokeWidth="1.6" opacity="0.7" />
        <circle r="15" fill={CREAM} stroke={INK} strokeWidth="2.6" />
        <circle r="7" fill={BURG} />
        <g transform="translate(46 -10)" fontSize="11" letterSpacing="1.8">
          <rect x="4" y="4" width="40" height="20" fill={INK} />
          <rect width="40" height="20" fill={CREAM} stroke={INK} strokeWidth="2" />
          <text x="20" y="14" textAnchor="middle" fill={BURG}>SOS</text>
        </g>
      </g>

      {/* start and destination */}
      <g transform={`translate(${A[0]} ${A[1]})`}>
        <circle r="13" fill={CREAM} stroke={INK} strokeWidth="3.4" />
        <circle r="5" fill={INK} />
      </g>
      <g transform={`translate(${B[0]} ${B[1]})`}>
        <path d="M2 2C-14 -16 -14 -42 2 -42C18 -42 18 -16 2 2Z" transform="translate(4 4)" fill={INK} />
        <path d="M0 0C-16 -18 -16 -44 0 -44C16 -44 16 -18 0 0Z" fill={BURG} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <circle cy="-28" r="6" fill={CREAM} stroke={INK} strokeWidth="2" />
      </g>

      {/* compass */}
      <g transform="translate(46 52)" stroke={INK} fill={CREAM} strokeWidth="2.2">
        <circle r="24" />
        <path d="M0 -20L6 0L0 20L-6 0Z" fill={BURG} strokeWidth="1.8" />
        <path d="M-20 0L0 -4L20 0L0 4Z" fill="none" strokeWidth="1.2" />
        <text y="-30" textAnchor="middle" fontSize="11" fill={INK} stroke="none" letterSpacing="1">N</text>
      </g>
    </g>
  );
}
