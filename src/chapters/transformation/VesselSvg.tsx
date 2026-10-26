import { useId, useMemo } from 'react';
import { HAND_VIEWBOX } from '../../art/Hand';
import { LATTE, INK, PAPER, VES, buildVessel } from './art';

const vb = HAND_VIEWBOX.grip;

/**
 * The flask, drawn in the Hand's exact grip viewBox so HAND_GRIP_ANCHOR lines up.
 * Stack it under <Hand pose="grip"/> in an identically sized box.
 * The liquid is a world-horizontal slab (data-liq) positioned by the rig each frame.
 */
export default function VesselSvg() {
  const uid = 'v' + useId().replace(/:/g, '');
  const art = useMemo(buildVessel, []);
  const { cx, rimY, rimRx, rimRy } = VES;
  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
    >
      <defs>
        <pattern id={`${uid}h`} width="8" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 2.5H8" stroke={INK} strokeWidth="1.1" />
        </pattern>
        <clipPath id={`${uid}c`}>
          <path d={art.outline} />
        </clipPath>
      </defs>
      {/* body */}
      <path d={art.outline} fill={PAPER} />
      {/* liquid, clipped to the glass */}
      <g clipPath={`url(#${uid}c)`}>
        <g data-liq="">
          <rect x="-500" y="0" width="1000" height="900" fill={LATTE} />
          <rect x="-500" y="0" width="1000" height="900" fill={`url(#${uid}h)`} opacity="0.6" />
          <path d="M-500 0H500" stroke={INK} strokeWidth="2.6" />
          <path d="M-500 4H500" stroke={PAPER} strokeWidth="1.4" opacity="0.8" />
        </g>
        {/* engraving */}
        <path d={art.thin} fill="none" stroke={INK} strokeWidth="0.95" />
        <path d={art.thick} fill="none" stroke={INK} strokeWidth="2.5" />
        {/* glass highlight on the left */}
        <path
          d={`M${cx - 38} 252C${cx - 44} 300 ${cx - 44} 380 ${cx - 36} 448`}
          fill="none"
          stroke={PAPER}
          strokeWidth="5.5"
          strokeLinecap="round"
          opacity="0.92"
        />
        <path d={`M${cx - 26} 262V404`} fill="none" stroke={PAPER} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </g>
      <path d={art.outline} fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* collar + lip */}
      <path d={art.rings} fill="none" stroke={INK} strokeWidth="2.4" />
      <ellipse cx={cx} cy={rimY} rx={rimRx} ry={rimRy} fill={PAPER} stroke={INK} strokeWidth="3.2" />
      <ellipse cx={cx} cy={rimY + 0.5} rx={rimRx * 0.8} ry={rimRy * 0.68} fill={INK} />
      <ellipse cx={cx} cy={rimY + 1.8} rx={rimRx * 0.6} ry={rimRy * 0.36} fill={LATTE} />
    </svg>
  );
}
