import { useId, useMemo } from 'react';
import { hatch, insidePoly, type Pt } from '../../art/procedural';
import { BLACK, LATTE, PAPER, RED, RED_DEEP, r1 } from './art';

/**
 * Sentrix: a heraldic shield cut into ten engraved wedges (the ten modules)
 * under a radar field. Pure procedural geometry, computed once.
 */

const CX = 500;
const CY = 480;
const N = 10;
const OUTLINE = 'M215 175H785V520C785 700 660 820 500 900C340 820 215 700 215 520Z';

type Tone = 'cream' | 'burgundy' | 'latte' | 'black';
const TONES: Tone[] = ['cream', 'burgundy', 'latte', 'black', 'cream', 'burgundy', 'black', 'latte', 'cream', 'burgundy'];
const FILL: Record<Tone, string> = { cream: PAPER, burgundy: RED, latte: LATTE, black: BLACK };
const LINE: Record<Tone, string> = { cream: BLACK, burgundy: BLACK, latte: BLACK, black: PAPER };
const NUM: Record<Tone, string> = { cream: BLACK, burgundy: PAPER, latte: BLACK, black: PAPER };

const cubic = (p0: Pt, c1: Pt, c2: Pt, p1: Pt, n: number): Pt[] => {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
    ]);
  }
  return out;
};

function build() {
  const poly: Pt[] = [
    [215, 175],
    [785, 175],
    [785, 520],
    ...cubic([785, 520], [785, 700], [660, 820], [500, 900], 18),
    ...cubic([500, 900], [340, 820], [215, 700], [215, 520], 18),
  ];

  const rad = (deg: number) => (deg * Math.PI) / 180;
  const wedges = Array.from({ length: N }, (_, k) => {
    const mid = -90 + 36 * k;
    const a0 = mid - 18;
    const a1 = mid + 18;
    const R = 900;
    const pts = [
      `${CX} ${CY}`,
      `${r1(CX + R * Math.cos(rad(a0)))} ${r1(CY + R * Math.sin(rad(a0)))}`,
      `${r1(CX + (R / Math.cos(rad(18))) * Math.cos(rad(mid)))} ${r1(CY + (R / Math.cos(rad(18))) * Math.sin(rad(mid)))}`,
      `${r1(CX + R * Math.cos(rad(a1)))} ${r1(CY + R * Math.sin(rad(a1)))}`,
    ];
    // bbox of (wedge ∩ shield) from a coarse grid, so each hatch covers only its own area
    let x0 = 1e9;
    let x1 = -1e9;
    let y0 = 1e9;
    let y1 = -1e9;
    for (let y = 170; y <= 905; y += 12) {
      for (let x = 210; x <= 790; x += 12) {
        if (!insidePoly([x, y], poly)) continue;
        let ang = (Math.atan2(y - CY, x - CX) * 180) / Math.PI - mid;
        ang = ((ang + 540) % 360) - 180;
        if (Math.abs(ang) > 19) continue;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
    const tone = TONES[k];
    const dense = tone === 'black' || tone === 'burgundy';
    const hatchD = hatch({
      seed: 410 + k * 7,
      x: x0 - 8,
      y: y0 - 8,
      width: x1 - x0 + 16,
      height: y1 - y0 + 16,
      angle: k % 2 === 0 ? mid : mid + 90,
      spacing: dense ? 8.5 : 7,
      spacing2: dense ? 5 : 11,
      wobble: 1.6,
      breakChance: 0.1,
      step: 40,
    });
    // number sits well inside the rim along the bisector
    let maxR = 0;
    while (maxR < 600 && insidePoly([CX + (maxR + 4) * Math.cos(rad(mid)), CY + (maxR + 4) * Math.sin(rad(mid))], poly)) maxR += 4;
    const labelR = Math.min(300, maxR * 0.66);
    return {
      k,
      tone,
      mid,
      poly: pts.join('L'),
      hatchD,
      dx: Math.cos(rad(mid)) * 70,
      dy: Math.sin(rad(mid)) * 70,
      nx: r1(CX + labelR * Math.cos(rad(mid))),
      ny: r1(CY + labelR * Math.sin(rad(mid))),
      ax: r1(CX + maxR * 0.9 * Math.cos(rad(mid))),
      ay: r1(CY + maxR * 0.9 * Math.sin(rad(mid))),
    };
  });

  // radar field
  let ticks = '';
  for (let a = 0; a < 360; a += 3) {
    const major = a % 30 === 0;
    const mid = a % 15 === 0;
    const r0 = 590;
    const r2 = r0 + (major ? 30 : mid ? 20 : 10);
    ticks += `M${r1(CX + r0 * Math.cos(rad(a)))} ${r1(CY + r0 * Math.sin(rad(a)))}L${r1(CX + r2 * Math.cos(rad(a)))} ${r1(CY + r2 * Math.sin(rad(a)))}`;
  }

  // sweep: pairs of black + cream rays, fading behind the leading edge
  const rays = Array.from({ length: 22 }, (_, i) => {
    const a = -i * 2.6;
    const len = 600;
    const ex = CX + len * Math.cos(rad(a));
    const ey = CY + len * Math.sin(rad(a));
    const ox = -Math.sin(rad(a)) * 2.2;
    const oy = Math.cos(rad(a)) * 2.2;
    return {
      o: r1(Math.max(0.06, 0.95 - i * 0.045)),
      b: `M${CX} ${CY}L${r1(ex)} ${r1(ey)}`,
      c: `M${r1(CX + ox)} ${r1(CY + oy)}L${r1(ex + ox)} ${r1(ey + oy)}`,
    };
  });

  // rivets just inside the rim
  const rivets: Pt[] = [];
  const dense: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
    for (let s = 0; s < n; s++) dense.push([a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n]);
  }
  const every = Math.floor(dense.length / 26);
  for (let i = 0; i < dense.length; i += every) {
    const [x, y] = dense[i];
    const dx = CX - x;
    const dy = CY - y;
    const l = Math.hypot(dx, dy) || 1;
    rivets.push([r1(x + (dx / l) * 24), r1(y + (dy / l) * 24)]);
  }

  return { wedges, ticks, rays, rivets };
}

/** [wedge index, label] for the modules this project's author owned. */
const TAGS: [number, string][] = [
  [9, 'IAM'],
  [8, 'PERIMETER'],
  [6, 'GRC'],
];

export default function ShieldArt({ compact }: { compact: boolean }) {
  const uid = useId().replace(/:/g, '');
  const g = useMemo(build, []);
  return (
    <svg
      viewBox={compact ? '0 150 1000 760' : '0 40 1000 920'}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="An engraved heraldic shield divided into ten wedges, one for each security module, under a radar sweep."
      style={{ overflow: 'visible' }}
    >
      <defs>
        <clipPath id={`${uid}s`}>
          <path d={OUTLINE} />
        </clipPath>
        {g.wedges.map((w) => (
          <clipPath id={`${uid}w${w.k}`} key={w.k}>
            <path d={`M${w.poly}Z`} />
          </clipPath>
        ))}
      </defs>

      {/* radar field (slow, behind) */}
      <g data-px="46" data-py="-10">
        <g fill="none" stroke={PAPER} strokeWidth="1.3">
          {[130, 215, 300, 385, 470, 560].map((r, i) => (
            <circle key={r} cx={CX} cy={CY} r={r} strokeOpacity={0.55 - i * 0.05} strokeDasharray={i % 2 ? '2 9' : undefined} />
          ))}
          <path d={`M${CX} ${CY - 600}V${CY + 600}M${CX - 600} ${CY}H${CX + 600}`} strokeOpacity="0.3" />
          <path d={g.ticks} strokeOpacity="0.7" />
        </g>
        <circle cx={CX} cy={CY} r="560" fill="none" stroke={BLACK} strokeWidth="4" strokeOpacity="0.55" />
      </g>

      {/* the shield */}
      <g data-px="-16" data-py="6" data-e="shield">
        <path d={OUTLINE} fill={BLACK} transform="translate(14 14)" />
        <g clipPath={`url(#${uid}s)`}>
          {g.wedges.map((w) => (
            <g key={w.k} data-e="seg" data-dx={r1(w.dx)} data-dy={r1(w.dy)}>
              <path d={`M${w.poly}Z`} fill={FILL[w.tone]} />
              <g clipPath={`url(#${uid}w${w.k})`}>
                <path d={w.hatchD} fill="none" stroke={LINE[w.tone]} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.95" />
              </g>
              <path d={`M${w.poly}Z`} fill="none" stroke={BLACK} strokeWidth="3" />
            </g>
          ))}
        </g>
        {/* module numbers */}
        <g fontFamily="'JetBrains Mono', monospace" fontSize="26" textAnchor="middle" letterSpacing="2" fontWeight="500">
          {g.wedges.map((w) => (
            <text key={w.k} x={w.nx} y={w.ny + 9} fill={NUM[w.tone]} stroke={w.tone === 'cream' || w.tone === 'latte' ? PAPER : BLACK} strokeWidth="0" opacity="0.95">
              {String(w.k + 1).padStart(2, '0')}
            </text>
          ))}
        </g>
        <path d={OUTLINE} fill="none" stroke={BLACK} strokeWidth="14" strokeLinejoin="round" />
        <path d={OUTLINE} fill="none" stroke={PAPER} strokeWidth="3" strokeLinejoin="round" />
        {g.rivets.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4.5" fill={PAPER} stroke={BLACK} strokeWidth="2" />
        ))}
        {/* boss with a keyhole */}
        <circle cx={CX} cy={CY} r="74" fill={BLACK} />
        <circle cx={CX} cy={CY} r="62" fill={RED_DEEP} stroke={PAPER} strokeWidth="3" />
        <circle cx={CX} cy={CY - 10} r="14" fill={PAPER} />
        <path d={`M${CX - 8} ${CY - 2}H${CX + 8}L${CX + 15} ${CY + 30}H${CX - 15}Z`} fill={PAPER} />
      </g>

      {/* sweep */}
      <g data-px="-30" data-py="0">
        <g transform="rotate(-40 500 480)">
        <g data-e="sweep">
          {g.rays.map((r, i) => (
            <g key={i} opacity={r.o} fill="none" strokeLinecap="round">
              <path d={r.b} stroke={BLACK} strokeWidth={i === 0 ? 3.4 : 1.6} />
              <path d={r.c} stroke={PAPER} strokeWidth={i === 0 ? 2.2 : 1.1} />
            </g>
          ))}
        </g>
        </g>
      </g>

      {/* labels and blips (fast, in front) */}
      <g data-px="-84" data-py="-22" fontFamily="'JetBrains Mono', monospace" fontSize="25" letterSpacing="3" fontWeight="500">
        {TAGS.map(([k, label]) => {
          const w = g.wedges[k];
          return (
            <g key={label}>
              <path d={`M40 ${w.ay}H${w.ax}`} stroke={PAPER} strokeWidth="1.6" fill="none" />
              <circle cx={w.ax} cy={w.ay} r="7" fill={PAPER} stroke={BLACK} strokeWidth="2.5" />
              <rect x="40" y={w.ay - 36} width={label.length * 17 + 20} height="30" fill={BLACK} />
              <text x="50" y={w.ay - 14} fill={PAPER}>
                {label}
              </text>
            </g>
          );
        })}
        {[
          [852, 300],
          [905, 660],
          [118, 805],
          [868, 905],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0 -11L11 0L0 11L-11 0Z" fill={PAPER} stroke={BLACK} strokeWidth="2.5" />
            <circle r="22" fill="none" stroke={PAPER} strokeWidth="1.3" strokeOpacity="0.6" />
          </g>
        ))}
      </g>
    </svg>
  );
}
