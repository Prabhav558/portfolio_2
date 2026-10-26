import { useId, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { hatch, smoothPath } from './procedural';
import type { Pt } from './procedural';

const INK = '#050505';
const PAPER = '#E8DCC6';
const RED = '#722F37';
const DEEP = '#4A1D23';

export const COLONNADE_VIEWBOX = { w: 1600, h: 900 } as const;

interface Props {
  /** number of columns (default 7) */
  count?: number;
  tone: 'paper' | 'red';
  className?: string;
  style?: CSSProperties;
  seed?: number;
  /** default 'xMidYMid slice' */
  preserveAspectRatio?: string;
  /** 'black' (default) paints the black voids between columns; 'none' leaves them transparent */
  backdrop?: 'black' | 'none';
}

const GROUND = 810;
const SHAFT_TOP = 214;
const SHAFT_BOT = 760;

interface ColGeo {
  cx: number;
  w: number;
  shaft: string;
  base: string;
  capital: string;
  abacus: string;
  rings: string;
  capHatch: string;
  flutes: string;
  hatchDense: string;
  hatchLight: string;
  shade: string;
  mid: string;
}

function column(cx: number, w: number, seed: number): ColGeo {
  const half = (y: number) => {
    // entasis: widest in the lower third, narrower at the top
    const t = (y - SHAFT_TOP) / (SHAFT_BOT - SHAFT_TOP);
    return (w / 2) * (0.8 + 0.2 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5));
  };
  const ys: number[] = [];
  for (let y = SHAFT_TOP; y <= SHAFT_BOT; y += 70) ys.push(y);
  if (ys[ys.length - 1] !== SHAFT_BOT) ys.push(SHAFT_BOT);
  const left: Pt[] = ys.map((y): Pt => [cx - half(y), y]);
  const right: Pt[] = ys.map((y): Pt => [cx + half(y), y]).reverse();
  const shaft = smoothPath([...left, ...right], true, 1 / 14);

  // flutes follow the entasis
  let flutes = '';
  const us = [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72];
  for (const u of us) {
    const pts: Pt[] = [];
    for (let y = SHAFT_TOP + 6; y <= SHAFT_BOT - 4; y += 60) pts.push([cx + u * half(y), y]);
    pts.push([cx + u * half(SHAFT_BOT - 4), SHAFT_BOT - 4]);
    flutes += smoothPath(pts, false);
  }

  // dense engraving on the shaded (right) side, sparse on the lit side
  const shadeX = cx - half(500) * 0.12;
  const hatchDense = hatch({
    seed,
    x: shadeX,
    y: SHAFT_TOP - 2,
    width: cx + w / 2 + 4 - shadeX,
    height: SHAFT_BOT - SHAFT_TOP + 4,
    angle: 90,
    spacing: 4.6,
    spacing2: 1.5,
    wobble: 0.9,
    breakChance: 0.06,
    step: 48,
  });
  const hatchLight = hatch({
    seed: seed + 1,
    x: cx - w / 2 - 2,
    y: SHAFT_TOP - 2,
    width: shadeX - (cx - w / 2) + 2,
    height: SHAFT_BOT - SHAFT_TOP + 4,
    angle: 90,
    spacing: 11,
    spacing2: 8,
    wobble: 1.1,
    breakChance: 0.2,
    step: 56,
  });
  const shade = `M${(cx + w / 2 - 7).toFixed(1)} ${SHAFT_TOP}h20V${SHAFT_BOT}h-20Z`;
  const mid = `M${(cx + half(500) * 0.15).toFixed(1)} ${SHAFT_TOP}h${w}V${SHAFT_BOT}h${-w}Z`;

  const bw = w * 1.34;
  const base = [
    smoothPath([[cx - bw / 2, 818], [cx + bw / 2, 818], [cx + bw / 2, GROUND - 12], [cx - bw / 2, GROUND - 12]], true, 0),
    smoothPath(
      [[cx - w * 0.62, GROUND - 12], [cx - w * 0.64, GROUND - 28], [cx - w * 0.56, GROUND - 40], [cx + w * 0.56, GROUND - 40], [cx + w * 0.64, GROUND - 28], [cx + w * 0.62, GROUND - 12]],
      true,
      1 / 8,
    ),
    smoothPath([[cx - w * 0.54, GROUND - 40], [cx - w * 0.5, SHAFT_BOT + 4], [cx + w * 0.5, SHAFT_BOT + 4], [cx + w * 0.54, GROUND - 40]], true, 0),
  ].join('');
  const cw = w * 0.82;
  const capital = smoothPath(
    [
      [cx - cw / 2, SHAFT_TOP],
      [cx - cw * 0.58, SHAFT_TOP - 14],
      [cx - w * 0.68, SHAFT_TOP - 30],
      [cx - w * 0.7, SHAFT_TOP - 44],
      [cx + w * 0.7, SHAFT_TOP - 44],
      [cx + w * 0.68, SHAFT_TOP - 30],
      [cx + cw * 0.58, SHAFT_TOP - 14],
      [cx + cw / 2, SHAFT_TOP],
    ],
    true,
    1 / 7,
  );
  const abacus = smoothPath(
    [[cx - w * 0.78, SHAFT_TOP - 44], [cx + w * 0.78, SHAFT_TOP - 44], [cx + w * 0.78, SHAFT_TOP - 76], [cx - w * 0.78, SHAFT_TOP - 76]],
    true,
    0,
  );
  const rings = [SHAFT_TOP + 8, SHAFT_TOP + 16]
    .map((y) => `M${(cx - half(y) - 1).toFixed(1)} ${y}H${(cx + half(y) + 1).toFixed(1)}`)
    .join('');
  const capHatch =
    hatch({ seed: seed + 5, x: cx + w * 0.1, y: SHAFT_TOP - 76, width: w * 0.68, height: 34, angle: 90, spacing: 3, spacing2: 1.8, wobble: 0.3, breakChance: 0.02, step: 17 }) +
    hatch({ seed: seed + 6, x: cx + w * 0.05, y: SHAFT_TOP - 44, width: w * 0.62, height: 40, angle: 90, spacing: 3.4, spacing2: 2, wobble: 0.3, breakChance: 0.02, step: 14 });
  return { cx, w, shaft, base, capital, abacus, rings, capHatch, flutes, hatchDense, hatchLight, shade, mid };
}

/** Symmetric row of classical columns, engraving style. viewBox 1600x900. */
export default function Colonnade({
  count = 7,
  tone,
  className,
  style,
  seed = 3,
  preserveAspectRatio = 'xMidYMid slice',
  backdrop = 'black',
}: Props) {
  const uid = 'c' + useId().replace(/:/g, '');
  const geo = useMemo(() => {
    const W = COLONNADE_VIEWBOX.w;
    const n = Math.max(2, count);
    const margin = n > 5 ? 110 : 190;
    const gap = (W - margin * 2) / (n - 1);
    const w = Math.min(122, gap * 0.52);
    const cols = Array.from({ length: n }, (_, i) => column(margin + gap * i, w, seed * 101 + i * 17));
    const steps = [
      hatch({ seed: seed + 400, x: 0, y: GROUND + 2, width: W, height: 28, angle: 0, spacing: 3.2, spacing2: 5, wobble: 0.5, breakChance: 0.14, step: 36 }),
      hatch({ seed: seed + 401, x: 0, y: GROUND + 34, width: W, height: 30, angle: 0, spacing: 3.6, spacing2: 5.5, wobble: 0.5, breakChance: 0.14, step: 36 }),
      hatch({ seed: seed + 402, x: 0, y: GROUND + 68, width: W, height: 40, angle: 0, spacing: 4, spacing2: 6, wobble: 0.6, breakChance: 0.14, step: 36 }),
    ];
    return { cols, steps };
  }, [count, seed]);

  const body = tone === 'red' ? RED : PAPER;
  const hatchColor = tone === 'red' ? DEEP : INK;
  const denseColor = INK;

  return (
    <svg
      viewBox={`0 0 ${COLONNADE_VIEWBOX.w} ${COLONNADE_VIEWBOX.h}`}
      preserveAspectRatio={preserveAspectRatio}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <defs>
        {geo.cols.map((c, i) => (
          <g key={i}>
            <clipPath id={`${uid}-s${i}`}>
              <path d={c.shaft} />
            </clipPath>
            <clipPath id={`${uid}-k${i}`}>
              <path d={c.capital} />
              <path d={c.abacus} />
            </clipPath>
          </g>
        ))}
      </defs>
      {backdrop === 'black' && <rect width={COLONNADE_VIEWBOX.w} height={COLONNADE_VIEWBOX.h} fill={INK} />}

      {geo.cols.map((c, i) => (
        <g key={i} data-part="column" data-index={i}>
          {/* base */}
          <path d={c.base} fill={body} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          {/* shaft */}
          <path d={c.shaft} fill={body} />
          <g clipPath={`url(#${uid}-s${i})`}>
            {tone === 'red' && <path d={c.mid} fill={DEEP} />}
            <path d={c.hatchLight} fill="none" stroke={hatchColor} strokeWidth={0.8} strokeLinecap="round" opacity={0.75} />
            <path d={c.hatchDense} fill="none" stroke={denseColor} strokeWidth={1.35} strokeLinecap="round" />
            <path d={c.shade} fill={INK} />
          </g>
          <path d={c.flutes} fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round" opacity={0.85} />
          <path d={c.shaft} fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
          <path d={c.rings} fill="none" stroke={INK} strokeWidth={1.8} />
          {/* capital */}
          <path d={c.capital} fill={body} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d={c.abacus} fill={body} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path
            d={`M${(c.cx + c.w * 0.3).toFixed(1)} ${SHAFT_TOP - 44}H${(c.cx + c.w * 0.7).toFixed(1)}V${SHAFT_TOP - 30}Z`}
            fill={tone === 'red' ? DEEP : INK}
          />
          <path
            d={`M${(c.cx + c.w * 0.58).toFixed(1)} ${SHAFT_TOP - 76}H${(c.cx + c.w * 0.78).toFixed(1)}V${SHAFT_TOP - 44}H${(c.cx + c.w * 0.58).toFixed(1)}Z`}
            fill={tone === 'red' ? DEEP : INK}
          />
          <g clipPath={`url(#${uid}-k${i})`}>
            <path d={c.capHatch} fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" />
          </g>
        </g>
      ))}

      {/* stylobate steps */}
      <g data-part="steps">
        <rect x={0} y={GROUND} width={COLONNADE_VIEWBOX.w} height={COLONNADE_VIEWBOX.h - GROUND} fill={body} />
        {geo.steps.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
        ))}
        <path
          d={`M0 ${GROUND}H${COLONNADE_VIEWBOX.w}M0 ${GROUND + 31}H${COLONNADE_VIEWBOX.w}M0 ${GROUND + 65}H${COLONNADE_VIEWBOX.w}`}
          stroke={INK}
          strokeWidth={2.6}
          fill="none"
        />
      </g>
    </svg>
  );
}
