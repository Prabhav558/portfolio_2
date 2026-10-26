import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { woodgrain } from './procedural';

interface Props {
  seed?: number;
  /** 'deep' = #4A1D23 plank (default), 'red' = brighter #722F37 plank */
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
  const base = tone === 'red' ? '#722F37' : '#4A1D23';
  const streak = tone === 'red' ? '#4A1D23' : '#722F37';
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
      <path d={geo.grain} fill="#050505" />
    </svg>
  );
}
