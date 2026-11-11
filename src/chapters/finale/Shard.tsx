import { useMemo } from 'react';
import { mulberry32 } from '../../lib/random';

interface Props {
  seed: number;
  uid: string;
  /** paper stone with black hatching, or black obsidian with paper contour lines */
  tone?: 'paper' | 'ink';
}

type Pt = [number, number];

/** Engraved stone fragment: irregular chipped polygon, contour lines, hatched shadow side. */
export default function Shard({ seed, uid, tone = 'paper' }: Props) {
  const { d, crack, shade } = useMemo(() => {
    const rand = mulberry32(seed);
    const n = 8 + Math.floor(rand() * 3);
    const squash = 0.62 + rand() * 0.3;
    const tilt = rand() * Math.PI;
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5;
      const r = 36 + rand() * 14;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * squash;
      pts.push([
        50 + x * Math.cos(tilt) - y * Math.sin(tilt) * 0.35,
        50 + y * Math.cos(tilt * 0.4) + x * Math.sin(tilt) * 0.35,
      ]);
    }
    const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    let path = '';
    pts.forEach((v, i) => {
      const p = pts[(i + n - 1) % n];
      const q = pts[(i + 1) % n];
      const k = rand() > 0.5 ? 0.14 : 0.4; // chipped corner vs rounded corner
      const s = lerp(v, p, k);
      const e = lerp(v, q, k);
      path += `${i === 0 ? 'M' : 'L'}${f(s)} Q${f(v)} ${f(e)} `;
    });
    path += 'Z';
    // crack from the rim toward the middle
    const c0 = pts[Math.floor(rand() * n)];
    const c1 = lerp(c0, [50, 50], 0.45 + rand() * 0.2);
    const c2: Pt = [c1[0] + (rand() - 0.5) * 14, c1[1] + (rand() - 0.5) * 14];
    const crackPath = `M${f(c0)} L${f(c1)} L${f(c2)}`;
    // shadow side: a wobbly lower-right half
    const o = rand() * 10;
    const shadePath = `M100 ${10 + o} L112 112 L-6 112 L${12 + o} ${86 - o} Q52 ${64 + o} 100 ${10 + o}Z`;
    return { d: path, crack: crackPath, shade: shadePath };
  }, [seed]);

  const clip = `fin-clip-${uid}`;
  const ink = tone === 'ink';
  const line = ink ? 'var(--cream)' : 'var(--black)';
  return (
    <svg viewBox="-6 -6 112 112" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
      </defs>
      {/* hard black print shadow */}
      <path d={d} transform="translate(4.5 4.5)" fill="var(--black)" />
      <path d={d} fill={ink ? 'var(--black)' : 'var(--cream)'} />
      <g clipPath={`url(#${clip})`}>
        {ink ? <path d={shade} fill="var(--burgundy-deep)" opacity="0.6" /> : <path d={shade} fill="url(#hatch-diag)" />}
      </g>
      {/* contour lines echo the silhouette */}
      <g fill="none" stroke={line} strokeLinecap="round">
        <path d={d} transform="translate(50 50) scale(.8) translate(-50 -50)" strokeWidth="0.9" strokeDasharray="22 5 4 5" />
        <path d={d} transform="translate(50 50) scale(.6) translate(-50 -50)" strokeWidth="0.8" strokeDasharray="9 4 16 6" />
        <path d={d} transform="translate(50 50) scale(.4) translate(-50 -50)" strokeWidth="0.7" strokeDasharray="5 5" />
        <path d={crack} strokeWidth="1.1" />
      </g>
      <path d={d} fill="none" stroke="var(--black)" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}
