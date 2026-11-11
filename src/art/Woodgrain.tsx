import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { woodgrain } from './procedural';

interface Props {
  seed?: number;
  /** 'deep' = var(--burgundy-deep) plank (default), 'red' = brighter var(--burgundy) plank */
  tone?: 'red' | 'deep';
  className?: string;
  style?: CSSProperties;
}

const W = 1600;
const H = 1000;

/** Full-bleed red woodcut plank. viewBox 1600x1000, slice-fit. */
export default function Woodgrain({ seed = 7, tone = 'deep', className, style }: Props) {
  const geo = useMemo(() => {
    const grain = woodgrain({ seed, width: W, height: H, count: 34 });
    const streaks = woodgrain({ seed: seed + 101, width: W, height: H, count: 9 })
      .filter((r) => r.w < 6.5)
      .slice(0, 14);
    return {
      grain: grain.map((r) => r.d).join(''),
      streaks: streaks.map((r) => r.d).join(''),
    };
  }, [seed]);
  const base = tone === 'red' ? 'var(--burgundy)' : 'var(--burgundy-deep)';
  const streak = tone === 'red' ? 'var(--burgundy-deep)' : 'var(--burgundy)';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <rect width={W} height={H} fill={base} />
      <path d={geo.streaks} fill={streak} opacity={0.3} />
      <path d={geo.grain} fill="var(--black)" />
    </svg>
  );
}
