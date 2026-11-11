import { useMemo } from 'react';
import { mulberry32 } from '../../lib/random';

interface Col {
  x: number;
  w: number;
  top: number;
  base: number;
  d: string;
}

/** Engraved paper band: rubble horizon, hatched ground, a low broken colonnade. */
export default function BottomBand() {
  const { ground, lines, front, rear } = useMemo(() => {
    const rand = mulberry32(606);
    const W = 1440;
    // rubble horizon
    let g = 'M-10 262 L-10 160 ';
    for (let x = 0; x <= W + 24; x += 24) {
      const spike = rand() > 0.82 ? -10 - rand() * 8 : 0;
      g += `L${x} ${(160 + (rand() - 0.5) * 14 + spike).toFixed(1)} `;
    }
    g += `L${W + 10} 262Z`;

    // horizontal engraving lines, broken at random
    const ls: { x1: number; x2: number; y: number; w: number }[] = [];
    for (let r = 0; r < 11; r++) {
      const y = 172 + r * 8.5;
      let x = -10;
      while (x < W + 10) {
        const len = 40 + rand() * 220;
        if (rand() > 0.18) ls.push({ x1: x, x2: Math.min(x + len, W + 10), y: y + (rand() - 0.5) * 1.6, w: 0.7 + r * 0.14 });
        x += len + 8 + rand() * 40;
      }
    }

    const col = (x: number, w: number, top: number, base: number): Col => {
      const j = () => (rand() - 0.5) * 14;
      const mid = x + w * (0.3 + rand() * 0.3);
      return {
        x,
        w,
        top,
        base,
        d: `M${x} ${base} L${x} ${top + j()} L${mid} ${top - 6 + j()} L${x + w * 0.62} ${top + 8 + j()} L${x + w} ${top + j()} L${x + w} ${base}Z`,
      };
    };
    const frontCols: Col[] = [];
    for (let i = 0; i < 10; i++) {
      const tall = rand() > 0.45;
      frontCols.push(col(34 + i * 148 + (rand() - 0.5) * 18, 38 + rand() * 10, tall ? 58 + rand() * 24 : 100 + rand() * 30, 166));
    }
    const rearCols: Col[] = [];
    for (let i = 0; i < 14; i++) {
      rearCols.push(col(80 + i * 100 + (rand() - 0.5) * 24, 22 + rand() * 8, 118 + rand() * 24, 162));
    }
    return { ground: g, lines: ls, front: frontCols, rear: rearCols };
  }, []);

  return (
    <svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="fin-ground-clip">
          <path d={ground} />
        </clipPath>
      </defs>
      {/* far row: black silhouettes */}
      <g fill="var(--black)">
        {rear.map((c, i) => (
          <path key={i} d={c.d} />
        ))}
      </g>
      {/* near row: engraved paper columns */}
      <g>
        {front.map((c, i) => (
          <g key={i}>
            <path d={c.d} transform="translate(5 0)" fill="var(--black)" />
            <path d={c.d} fill="var(--cream)" stroke="var(--black)" strokeWidth="2.2" strokeLinejoin="round" />
            <path
              d={`M${c.x + c.w * 0.62} ${c.top + 10} L${c.x + c.w} ${c.top + 4} L${c.x + c.w} ${c.base} L${c.x + c.w * 0.62} ${c.base}Z`}
              fill="url(#hatch-diag)"
            />
            {[0.22, 0.42].map((t) => (
              <line key={t} x1={c.x + c.w * t} y1={c.top + 16} x2={c.x + c.w * t} y2={c.base} stroke="var(--black)" strokeWidth="0.9" />
            ))}
            <rect x={c.x - 5} y={c.base - 7} width={c.w + 10} height="9" fill="var(--cream)" stroke="var(--black)" strokeWidth="2" />
          </g>
        ))}
      </g>
      {/* ground */}
      <path d={ground} fill="var(--cream)" stroke="var(--black)" strokeWidth="2.6" strokeLinejoin="round" />
      <g clipPath="url(#fin-ground-clip)" stroke="var(--black)" strokeLinecap="round">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} strokeWidth={l.w} />
        ))}
        <rect x="-10" y="252" width="1460" height="12" fill="var(--black)" stroke="none" />
      </g>
    </svg>
  );
}
