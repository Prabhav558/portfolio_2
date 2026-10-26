import { useId, useMemo } from 'react';
import { Figure } from '../../art';
import { arc, diskArt } from './layout';
import type { Layout } from './layout';

const INK = '#050505';
const RED = '#722F37';
const DEEP = '#4A1D23';

/**
 * The inside of the gate: the engraved burgundy moon, framing either the portrait
 * (burgundy duotone + halftone) or, while there is none, the Keeper seen from behind.
 * Same viewBox / slice as the facade so the two stack exactly.
 */
export default function Gate({ L, portrait = null }: { L: Layout; portrait?: string | null }) {
  const uid = 'tg' + useId().replace(/:/g, '');
  const { cx, cy, r } = L;
  const d = useMemo(() => diskArt(cx, cy, r, 19), [cx, cy, r]);
  const rim = useMemo(() => {
    let s = '';
    for (let j = 0; j < 5; j++) s += arc(cx, cy, r - 2 - j * 2.6, 200 + j * 7, 335 - j * 9);
    return s;
  }, [cx, cy, r]);

  return (
    <svg
      viewBox={`0 0 ${L.W} ${L.H}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={`${uid}-hole`}>
          <circle cx={cx} cy={cy} r={r - 1.5} />
        </clipPath>
        {/* burgundy duotone: greyscale, then map shadow to highlight (ink, deep burgundy, burgundy, latte) */}
        <filter id={`${uid}-duo`} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0.02 0.29 0.45 0.72" />
            <feFuncG type="table" tableValues="0.02 0.11 0.18 0.66" />
            <feFuncB type="table" tableValues="0.02 0.14 0.22 0.6" />
          </feComponentTransfer>
        </filter>
      </defs>
      <g clipPath={`url(#${uid}-hole)`}>
        <g transform={`translate(${cx} ${cy})`}>
          <g data-t="disk">
            <g transform={`translate(${-cx} ${-cy})`}>
              {portrait ? (
                <>
                  <circle cx={cx} cy={cy} r={r + 2} fill={RED} />
                  <image
                    href={portrait}
                    x={cx - r}
                    y={cy - r}
                    width={r * 2}
                    height={r * 2}
                    preserveAspectRatio="xMidYMid slice"
                    filter={`url(#${uid}-duo)`}
                  />
                  <circle cx={cx} cy={cy} r={r + 2} fill={RED} opacity={0.3} style={{ mixBlendMode: 'multiply' }} />
                  <circle cx={cx} cy={cy} r={r + 2} fill="url(#halftone)" opacity={0.32} />
                  <g data-t="disk-spin">
                    <path d={d.crescent} fill={DEEP} opacity={0.4} />
                    <path d={d.deep} fill="none" stroke={DEEP} strokeWidth={1.1} strokeLinecap="round" opacity={0.55} />
                    <path d={d.black} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
                  </g>
                  <path d={rim} fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
                </>
              ) : (
                <g data-t="disk-spin">
                  <circle cx={cx} cy={cy} r={r + 2} fill={RED} />
                  <path d={d.crescent} fill={DEEP} />
                  <path d={d.deep} fill="none" stroke={DEEP} strokeWidth={1.25} strokeLinecap="round" opacity={0.9} />
                  <path d={d.thin} fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" opacity={0.75} />
                  <path d={d.black} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
                  <path d={rim} fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
                </g>
              )}
            </g>
          </g>
        </g>
        {!portrait && (
          <g data-t="figure">
            <g transform={`translate(${cx} ${cy + r * 0.45})`}>
              <g data-t="figure-in">
                <rect x={-700} y={-700} width={1400} height={1400} fill="none" />
                <g transform={`translate(${-cx} ${-(cy + r * 0.45)})`}>
                  <svg x={L.fig.x} y={L.fig.y} width={L.fig.w} height={L.fig.h} overflow="visible">
                    <Figure variant="silhouette" view="back" />
                  </svg>
                </g>
              </g>
            </g>
          </g>
        )}
      </g>
      <circle cx={cx} cy={cy} r={r - 1.5} fill="none" stroke={INK} strokeWidth={3.4} />
    </svg>
  );
}
