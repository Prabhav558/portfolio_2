import { useId, useMemo } from 'react';
import { hatch } from '../../art/procedural';
import { getProject } from '../../config/portfolio';
import { BLACK, LATTE, PAPER, RED, RED_DEEP } from './art';

/**
 * SystemLens: six engraved lens stages joined by one flowing line, read as a
 * serpentine (left to right, then back). Labels name the pipeline stages.
 */

const R = 80;
const ROW_A = 215;
const ROW_B = 560;
const XS = [215, 500, 785];

/** Stage names for the engraved labels, from portfolio.ts. */
const STAGES = getProject('systemlens')?.stages ?? [];

const POS: [number, number][] = [
  [XS[0], ROW_A],
  [XS[1], ROW_A],
  [XS[2], ROW_A],
  [XS[2], ROW_B],
  [XS[1], ROW_B],
  [XS[0], ROW_B],
];

const GLYPH: Record<number, JSX.Element> = {
  0: (
    <g>
      <path d="M-48 0Q0 -44 48 0Q0 44 -48 0Z" />
      <circle r="17" fill={PAPER} />
      <circle r="7" fill={BLACK} stroke="none" />
      <path d="M-30 -30L-36 -40M-14 -38L-16 -50M6 -40L8 -52M24 -34L30 -44" />
    </g>
  ),
  1: (
    <g>
      <path d="M-30 -22L-48 0L-30 22M30 -22L48 0L30 22" />
      <path d="M-17 -18H17M-11 -2H21M-17 14H9" />
      <path d="M-6 -30L8 30" strokeWidth="2" />
    </g>
  ),
  2: (
    <g>
      <g fill={PAPER} stroke="none">
        <circle cx="-26" cy="-18" r="5.5" />
        <circle cx="-13" cy="-28" r="5.5" />
        <circle cx="-30" cy="-4" r="5.5" />
        <circle cx="-14" cy="-12" r="5.5" />
        <circle cx="22" cy="12" r="5.5" />
        <circle cx="32" cy="24" r="5.5" />
        <circle cx="14" cy="26" r="5.5" />
        <circle cx="30" cy="3" r="5.5" />
      </g>
      <ellipse cx="-21" cy="-15" rx="21" ry="21" strokeDasharray="4 5" strokeWidth="2" />
      <ellipse cx="25" cy="16" rx="21" ry="21" strokeDasharray="4 5" strokeWidth="2" />
    </g>
  ),
  3: (
    <g>
      <path d="M-27 18L27 -18M-27 18L28 24M27 -18L28 24" />
      <circle cx="-27" cy="18" r="10" fill={PAPER} />
      <circle cx="27" cy="-18" r="10" fill={PAPER} />
      <circle cx="28" cy="24" r="10" fill={PAPER} />
      <circle cx="-27" cy="18" r="3.5" fill={BLACK} stroke="none" />
    </g>
  ),
  4: (
    <g>
      <path d="M-42 -36H42L9 6V36H-9V6Z" />
      <path d="M-26 -26H26M-16 -14H16" strokeWidth="2" />
      <g fill={PAPER} stroke="none">
        <circle cx="-26" cy="-44" r="3.4" />
        <circle cx="-8" cy="-48" r="3.4" />
        <circle cx="10" cy="-45" r="3.4" />
        <circle cx="28" cy="-47" r="3.4" />
        <circle cx="0" cy="46" r="3.4" />
      </g>
    </g>
  ),
  5: (
    <g>
      <circle cx="-7" cy="-7" r="24" />
      <path d="M11 11L40 40" strokeWidth="8" strokeLinecap="round" />
      <path d="M-20 -6L-10 5L8 -19" strokeWidth="4" />
    </g>
  ),
};

function Lens({ i, hatchId, clipId }: { i: number; hatchId: string; clipId: string }) {
  const [x, y] = POS[i];
  return (
    <g data-e="stage" data-o={`${x} ${y}`} transform={`translate(${x} ${y})`}>
      <g>
        {/* container brackets */}
        <path
          d="M-100 -76V-100H-76M76 -100H100V-76M100 76V100H76M-76 100H-100V76"
          fill="none"
          stroke={LATTE}
          strokeWidth="3"
        />
        <circle r={R + 10} fill={BLACK} />
        <circle r={R} fill={RED_DEEP} stroke={PAPER} strokeWidth="4" />
        <g clipPath={`url(#${clipId})`}>
          <use href={`#${hatchId}`} transform={`rotate(${i * 31})`} />
          <path d="M-80 80L80 -80L80 80Z" fill={BLACK} opacity="0.5" />
        </g>
        <circle r="62" fill="none" stroke={PAPER} strokeWidth="1.4" strokeOpacity="0.8" />
        <path d="M-70 -34A78 78 0 0 1 -34 -70" fill="none" stroke={PAPER} strokeWidth="5" strokeLinecap="round" />
        <g fill="none" stroke={PAPER} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          {GLYPH[i]}
        </g>
        <circle r={R + 10} fill="none" stroke={BLACK} strokeWidth="3" />
      </g>
    </g>
  );
}

export default function PipelineArt({ compact }: { compact: boolean }) {
  const uid = useId().replace(/:/g, '');
  const hatchD = useMemo(
    () => hatch({ seed: 97, x: -64, y: -64, width: 128, height: 128, angle: 40, spacing: 4.6, spacing2: 8, wobble: 1, step: 24 }),
    [],
  );
  const back = useMemo(
    () => hatch({ seed: 12, x: 0, y: 0, width: 1000, height: 800, angle: 90, spacing: 18, wobble: 2.4, breakChance: 0.22, step: 60 }),
    [],
  );
  const hid = `${uid}h`;
  const cid = `${uid}c`;
  const lx = (i: number) => POS[i][0];
  const ly = (i: number) => POS[i][1];
  const gap = R + 12;

  const links = [
    { d: `M${lx(0) + gap} ${ly(0)}H${lx(1) - gap}`, o: `${lx(0) + gap} ${ly(0)}`, axis: 'x' },
    { d: `M${lx(1) + gap} ${ly(1)}H${lx(2) - gap}`, o: `${lx(1) + gap} ${ly(1)}`, axis: 'x' },
    {
      d: `M${lx(2) + gap} ${ly(2)}C${lx(2) + gap + 90} ${ly(2)} ${lx(3) + gap + 90} ${ly(3)} ${lx(3) + gap} ${ly(3)}`,
      o: `${lx(2) + gap} ${ly(2)}`,
      axis: 'y',
    },
    { d: `M${lx(3) - gap} ${ly(3)}H${lx(4) + gap}`, o: `${lx(3) - gap} ${ly(3)}`, axis: 'x' },
    { d: `M${lx(4) - gap} ${ly(4)}H${lx(5) + gap}`, o: `${lx(4) - gap} ${ly(4)}`, axis: 'x' },
  ];
  // arrowheads: [x, y, rotation]
  const arrows: [number, number, number][] = [
    [(lx(0) + lx(1)) / 2, ly(0), 0],
    [(lx(1) + lx(2)) / 2, ly(1), 0],
    [lx(2) + gap + 67, (ly(2) + ly(3)) / 2, 90],
    [(lx(3) + lx(4)) / 2, ly(3), 180],
    [(lx(4) + lx(5)) / 2, ly(4), 180],
  ];

  return (
    <svg
      viewBox={compact ? '0 20 1000 760' : '-20 0 1040 800'}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Six engraved lenses joined by a flowing line: watch, parse, cluster, correlate, rate-limit, analyze."
      style={{ overflow: 'visible' }}
    >
      <defs>
        <clipPath id={cid}>
          <circle r="64" />
        </clipPath>
        <path id={hid} d={hatchD} fill="none" stroke={BLACK} strokeWidth="1.3" strokeLinecap="round" />
      </defs>

      {/* deep field: slow */}
      <g data-px="50" data-py="-14">
        <path d={back} fill="none" stroke={RED_DEEP} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <g fill="none" stroke={RED} strokeWidth="2">
          <circle cx="500" cy="390" r="360" strokeDasharray="3 10" />
          <circle cx="500" cy="390" r="300" />
        </g>
      </g>

      {/* flow line */}
      <g data-px="-18" data-py="6">
        {/* incoming log lines converge on the first lens */}
        <g fill="none" stroke={PAPER} strokeLinecap="round" data-e="logs">
          {[-62, -38, -14, 14, 38, 62].map((o, i) => (
            <path
              key={o}
              d={`M-20 ${ROW_A + o}C40 ${ROW_A + o} 60 ${ROW_A} ${lx(0) - gap} ${ROW_A}`}
              strokeWidth={i % 2 ? 1.6 : 2.6}
              strokeDasharray={i % 3 === 0 ? '26 8' : i % 3 === 1 ? '10 6 40 6' : undefined}
              opacity={0.45 + (i % 3) * 0.18}
            />
          ))}
        </g>
        {links.map((l, i) => (
          <g key={i} data-e="link" data-axis={l.axis} data-o={l.o}>
            <path d={l.d} fill="none" stroke={BLACK} strokeWidth="11" strokeLinecap="round" />
            <path d={l.d} fill="none" stroke={PAPER} strokeWidth="3.2" strokeLinecap="round" />
            <path d={l.d} fill="none" stroke={LATTE} strokeWidth="1.4" strokeDasharray="2 14" strokeLinecap="round" transform="translate(0 7)" />
          </g>
        ))}
        {arrows.map(([x, y, a], i) => (
          <path key={i} d="M-11 -13L12 0L-11 13Z" transform={`translate(${x} ${y}) rotate(${a})`} fill={PAPER} stroke={BLACK} strokeWidth="3" strokeLinejoin="round" data-e="arrow" />
        ))}
        {/* result leaves to the left */}
        <g data-e="link" data-axis="x" data-o={`${lx(5) - gap} ${ly(5)}`}>
          <path d={`M${lx(5) - gap} ${ly(5)}H10`} fill="none" stroke={BLACK} strokeWidth="11" strokeLinecap="round" />
          <path d={`M${lx(5) - gap} ${ly(5)}H10`} fill="none" stroke={RED} strokeWidth="3.2" strokeLinecap="round" />
          <path d={`M0 ${ly(5)}L22 ${ly(5) - 13}V${ly(5) + 13}Z`} fill={PAPER} stroke={BLACK} strokeWidth="3" strokeLinejoin="round" />
        </g>
      </g>

      {/* lenses */}
      <g data-px="-40" data-py="-6">
        {POS.map((_, i) => (
          <Lens key={i} i={i} hatchId={hid} clipId={cid} />
        ))}
      </g>

      {/* labels: fastest layer */}
      <g data-px="-76" data-py="-16" fontFamily="'JetBrains Mono', monospace" fontSize="27" letterSpacing="4" fontWeight="500" textAnchor="middle">
        {STAGES.map((s, i) => (
          <g key={s} data-e="label">
            <text x={lx(i)} y={ly(i) + R + 62} fill={PAPER}>
              {String(i + 1).padStart(2, '0')} {s}
            </text>
            <path d={`M${lx(i) - 28} ${ly(i) + R + 74}H${lx(i) + 28}`} stroke={LATTE} strokeWidth="2" />
          </g>
        ))}
      </g>
    </svg>
  );
}
