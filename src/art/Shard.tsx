import { useId, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { contourHatch, hatch, polySmooth, roughen, smoothPath } from './procedural';
import type { Pt } from './procedural';
import { mulberry32 } from '../lib/random';

const INK = 'var(--black)';
const PAPER = 'var(--cream)';

interface Props {
  /** every seed gives a distinct fragment */
  seed: number;
  /** pixel size of the (square) svg; omit for width/height 100% */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** Engraved stone / paper fragment. viewBox 200x200, shadow on the lower right. */
export default function Shard({ seed, size, className, style }: Props) {
  const uid = 's' + useId().replace(/:/g, '');
  const g = useMemo(() => {
    const rand = mulberry32(seed * 7919 + 13);
    const n = 5 + Math.floor(rand() * 4);
    const rot = rand() * Math.PI * 2;
    const sx = 0.5 + rand() * 0.7;
    const sy = 0.8 + rand() * 0.35;
    const flats = [rand() < 0.7 ? rand() * Math.PI * 2 : -1, rand() < 0.35 ? rand() * Math.PI * 2 : -1];
    const spike = Math.floor(rand() * n);
    const poly: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = ((i + (rand() - 0.5) * 0.7) / n) * Math.PI * 2;
      let r = 44 + Math.pow(rand(), 0.8) * 56;
      if (i === spike && rand() < 0.7) r = 104;
      // flatten sides into fracture edges
      for (const flat of flats) {
        if (flat < 0) continue;
        const diff = Math.cos(a - flat);
        if (diff > 0.5) r = Math.min(r, 50 / Math.max(0.55, diff));
      }
      const x = Math.cos(a) * r * sx;
      const y = Math.sin(a) * r * sy;
      poly.push([100 + x * Math.cos(rot) - y * Math.sin(rot), 100 + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    const fill = roughen(poly, 2, seed + 3, { segment: 15, smooth: 0.12 });

    // hatch follows a gently curved centerline across the shard
    const dir = rand() * Math.PI;
    const dx = Math.cos(dir);
    const dy = Math.sin(dir);
    const bend = (rand() - 0.5) * 70;
    const center: Pt[] = [];
    for (let t = -1; t <= 1.001; t += 0.25) {
      const bow = (1 - t * t) * bend;
      center.push([100 + dx * 110 * t - dy * bow, 100 + dy * 110 * t + dx * bow]);
    }
    const dense = contourHatch({ seed: seed + 11, center, from: -120, to: 120, spacing: 3.2, wobble: 0.8, breakChance: 0.08, step: 12, extend: 14 });
    const sparse = contourHatch({ seed: seed + 12, center, from: -120, to: 120, spacing: 7, wobble: 1, breakChance: 0.14, step: 12, extend: 14 });

    // a facet triangle carries cross-hatching at another angle
    const a0 = Math.floor(rand() * n);
    const f1 = poly[a0];
    const f2 = poly[(a0 + 2) % n];
    const f3: Pt = [100 + (rand() - 0.5) * 30, 100 + (rand() - 0.5) * 30];
    const facet = smoothPath([f1, f2, f3], true, 0);
    const facetHatch = hatch({ seed: seed + 21, x: 0, y: 0, width: 200, height: 200, angle: (dir * 180) / Math.PI + 62, spacing: 3.4, wobble: 0.5, breakChance: 0.05, step: 14 });

    // cracks
    const cr = mulberry32(seed + 31);
    let cracks = '';
    const nc = 1 + Math.floor(cr() * 2);
    for (let c = 0; c < nc; c++) {
      let x = 100 + (cr() - 0.5) * 70;
      let y = 100 + (cr() - 0.5) * 70;
      let a = cr() * Math.PI * 2;
      const pts: Pt[] = [[x, y]];
      const segs = 4 + Math.floor(cr() * 3);
      for (let s = 0; s < segs; s++) {
        a += (cr() - 0.5) * 1.1;
        x += Math.cos(a) * (10 + cr() * 12);
        y += Math.sin(a) * (10 + cr() * 12);
        pts.push([x, y]);
      }
      cracks += polySmooth(pts);
    }
    return { fill, dense, sparse, facet, facetHatch, cracks };
  }, [seed]);

  const dim = size ?? '100%';
  return (
    <svg
      viewBox="0 0 200 200"
      width={dim}
      height={dim}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <defs>
        <path id={`${uid}-p`} d={g.fill} />
        <clipPath id={`${uid}-c`}>
          <use href={`#${uid}-p`} />
        </clipPath>
        <clipPath id={`${uid}-s1`}>
          <use href={`#${uid}-p`} transform="translate(-9 -10)" />
        </clipPath>
        <clipPath id={`${uid}-s2`}>
          <use href={`#${uid}-p`} transform="translate(-22 -24)" />
        </clipPath>
        <clipPath id={`${uid}-f`}>
          <path d={g.facet} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-c)`}>
        <use href={`#${uid}-p`} fill={INK} />
        <use href={`#${uid}-p`} transform="translate(-9 -10)" fill={PAPER} />
        <path d={g.dense} clipPath={`url(#${uid}-s1)`} fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
        <use href={`#${uid}-p`} transform="translate(-22 -24)" fill={PAPER} />
        <path d={g.sparse} clipPath={`url(#${uid}-s2)`} fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
        <g clipPath={`url(#${uid}-f)`}>
          <path d={g.facetHatch} fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
        </g>
        <path d={g.cracks} fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <use href={`#${uid}-p`} fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
    </svg>
  );
}
