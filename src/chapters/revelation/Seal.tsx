import { useId } from 'react';

const INK = 'var(--black)';
const CREAM = 'var(--cream)';
const LATTE = 'var(--latte)';
const BURG = 'var(--burgundy)';

const f = (n: number) => n.toFixed(1);

/** Radial tick ring (static, computed once). */
const TICKS = (() => {
  let d = '';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    d += `M${f(40 + c * 35)} ${f(40 + s * 35)}L${f(40 + c * 38.5)} ${f(40 + s * 38.5)}`;
  }
  return d;
})();

/** Diagonal engraving lines across the disc (clipped by the inner circle). */
const HATCH = (() => {
  let d = '';
  for (let i = -8; i <= 8; i++) d += `M${f(40 + i * 4.2 - 30)} 70L${f(40 + i * 4.2 + 30)} 10`;
  return d;
})();

/** An engraved wax-seal mark: ticked rim, hatched disc, ribbon tails, a short mark in the centre. */
export default function Seal({ mark }: { mark: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '') + '-seal';
  return (
    <svg viewBox="0 0 80 96" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id}>
          <circle cx="40" cy="40" r="29" />
        </clipPath>
      </defs>
      <path d="M26 66 L18 94 L30 86 L36 94 L40 70Z" fill={BURG} stroke={CREAM} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M54 66 L62 94 L50 86 L44 94 L40 70Z" fill={BURG} stroke={CREAM} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="40" cy="40" r="38" fill={INK} stroke={CREAM} strokeWidth="2" />
      <path d={TICKS} stroke={LATTE} strokeWidth="1.4" fill="none" />
      <circle cx="40" cy="40" r="31" fill="none" stroke={LATTE} strokeWidth="1.2" />
      <g clipPath={`url(#${id})`}>
        <path d={HATCH} stroke={LATTE} strokeWidth="1" opacity="0.55" fill="none" />
      </g>
      <circle cx="40" cy="40" r="20" fill={INK} stroke={CREAM} strokeWidth="1.6" />
      <text
        x="40"
        y="44.5"
        textAnchor="middle"
        fill={CREAM}
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontWeight="700"
        fontSize={mark.length > 3 ? 9 : 13}
        letterSpacing="0.5"
      >
        {mark}
      </text>
    </svg>
  );
}
