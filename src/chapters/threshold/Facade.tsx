import { useId, useMemo } from 'react';
import { hatch } from '../../art';
import { person } from '../../config/portfolio';
import { arc, columnGeo, panelBands } from './layout';
import type { Layout } from './layout';

const INK = '#050505';
const PAPER = '#E8DCC6';

/**
 * The symmetric paper facade: steps, stair, engraved panels, inscription band,
 * columns and the great ring. Left half is drawn once in <defs> and mirrored with <use>.
 * Each reveal group carries data-t so the timeline can wipe it in.
 */
export default function Facade({ L, svgRef }: { L: Layout; svgRef?: React.Ref<SVGSVGElement> }) {
  const uid = 'th' + useId().replace(/:/g, '');
  const mirror = `translate(${L.cx * 2} 0) scale(-1 1)`;

  const g = useMemo(() => {
    const { W, H, cx, cy, R, r, ground } = L;
    const f = (n: number) => n.toFixed(1);

    // steps: horizontal engraving between tread lines
    const treads = L.treads;
    const stepHatch = treads
      .map((y, i) => {
        const next = i + 1 < treads.length ? treads[i + 1] : H;
        return hatch({ seed: 50 + i, x: 0, y: y + 5, width: W, height: next - y - 5, angle: 0, spacing: 3.4, spacing2: 6.4, wobble: 0.5, breakChance: 0.14, step: 36 });
      })
      .join('');
    const riser = treads.map((y) => `M0 ${y}H${W}`).join('');
    const riserShadow = treads.map((y) => `M0 ${y}h${W}v5h${-W}Z`).join('');

    // central stair (black trapezoid, paper tread lines)
    const half = (y: number) => L.stair.topHalf + ((L.stair.botHalf - L.stair.topHalf) * (y - ground)) / (H - ground);
    const stair = `M${f(cx - L.stair.topHalf)} ${ground}H${f(cx + L.stair.topHalf)}L${f(cx + L.stair.botHalf)} ${H}H${f(cx - L.stair.botHalf)}Z`;
    const stairLines = treads
      .slice(1)
      .map((y) => `M${f(cx - half(y))} ${y}H${f(cx + half(y))}`)
      .join('');
    const stairHatch = hatch({ seed: 77, x: cx - L.stair.botHalf, y: ground + 4, width: L.stair.botHalf * 2, height: H - ground, angle: 0, spacing: 4, spacing2: 9, wobble: 0.4, breakChance: 0.1, step: 30 });
    // fine converging lines on the stair (perspective)
    let conv = '';
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const t = k / 5;
      conv += `M${f(cx + t * L.stair.topHalf)} ${ground}L${f(cx + t * L.stair.botHalf)} ${H}`;
    }

    // panel + plinth + attic + band
    const bands = panelBands(L.panel.x0, L.cx - 6, L.panel.y0, L.panel.y1, 11);
    const attic = L.attic ? panelBands(L.attic.x0, L.cx - 6, L.attic.y0, L.attic.y1, 29) : [];
    const plinthHatch = L.plinth
      ? hatch({ seed: 41, x: L.plinth.x0, y: L.plinth.y0, width: L.cx - L.plinth.x0, height: L.plinth.y1 - L.plinth.y0, angle: 0, spacing: 3, spacing2: 7, wobble: 0.5, breakChance: 0.08, step: 30 })
      : '';
    const plinthV = L.plinth
      ? hatch({ seed: 43, x: L.plinth.x0, y: L.plinth.y0, width: 170, height: L.plinth.y1 - L.plinth.y0, angle: 90, spacing: 17, spacing2: 6, wobble: 0.5, breakChance: 0.1, step: 30 })
      : '';

    // columns
    const col = columnGeo(L.col.x, L.col.w, L.col.top, ground, 5);

    // ring: ticks and engraved shading on the lower right
    let ticks = '';
    for (let a = 0; a < 360; a += 5) {
      const t = (a * Math.PI) / 180;
      const len = a % 15 === 0 ? 0.78 : 0.5;
      const r0 = r + 7;
      const r1 = r0 + (R - 7 - r0) * len;
      ticks += `M${f(cx + r0 * Math.cos(t))} ${f(cy + r0 * Math.sin(t))}L${f(cx + r1 * Math.cos(t))} ${f(cy + r1 * Math.sin(t))}`;
    }
    let ringShade = '';
    for (let j = 0; j < 9; j++) {
      const rad = R - 3.5 - j * 3.1;
      ringShade += arc(cx, cy, rad, -52 + j * 3.5, 128 - j * 5);
    }
    let ringShade2 = '';
    for (let j = 0; j < 7; j++) {
      const rad = r + 3.5 + j * 3;
      ringShade2 += arc(cx, cy, rad, 168 + j * 4, 318 - j * 6);
    }
    const annulus = `M${f(cx - R)} ${cy}a${R} ${R} 0 1 0 ${R * 2} 0a${R} ${R} 0 1 0 ${-R * 2} 0ZM${f(cx - r)} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
    const key = `M${f(cx - 19)} ${cy - R - 2}H${f(cx + 19)}L${f(cx + 13)} ${cy - r + 2}H${f(cx - 13)}Z`;

    return { stepHatch, riser, riserShadow, stair, stairLines, stairHatch, conv, bands, attic, plinthHatch, plinthV, col, ticks, ringShade, ringShade2, annulus, key };
  }, [L]);

  const { W, H, cx, cy, R, r } = L;
  const bandW = cx - L.band.x0;
  const panelRect = (x0: number, y0: number, y1: number) => `M${x0} ${y0}H${cx - 6}V${y1}H${x0}Z`;

  const renderBands = (bands: ReturnType<typeof panelBands>, clip: string) => (
    <g clipPath={`url(#${clip})`}>
      {bands.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={0} width={b.w} height={H} fill={b.dark ? INK : PAPER} />
          <path d={b.lines} fill="none" stroke={b.dark ? PAPER : INK} strokeWidth={b.dark ? 1.15 : 0.95} strokeLinecap="round" opacity={b.dark ? 0.92 : 0.85} />
          <path d={b.dense} fill="none" stroke={b.dark ? PAPER : INK} strokeWidth={b.dark ? 0.9 : 1.5} strokeLinecap="round" />
          <path d={`M${b.x} 0V${H}`} stroke={INK} strokeWidth={1.6} />
        </g>
      ))}
    </g>
  );

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* half panel */}
        <clipPath id={`${uid}-pc`}>
          <path d={panelRect(L.panel.x0, L.panel.y0, L.panel.y1)} />
        </clipPath>
        <g id={`${uid}-pan`}>
          {renderBands(g.bands, `${uid}-pc`)}
          <path d={panelRect(L.panel.x0, L.panel.y0, L.panel.y1)} fill="none" stroke={INK} strokeWidth={3.4} strokeLinejoin="round" />
          <path d={panelRect(L.panel.x0 + 7, L.panel.y0 + 7, L.panel.y1 - 7)} fill="none" stroke={PAPER} strokeWidth={1} opacity={0.7} />
        </g>
        {L.attic && (
          <>
            <clipPath id={`${uid}-ac`}>
              <path d={panelRect(L.attic.x0, L.attic.y0, L.attic.y1)} />
            </clipPath>
            <g id={`${uid}-att`}>
              {renderBands(g.attic, `${uid}-ac`)}
              <path d={panelRect(L.attic.x0, L.attic.y0, L.attic.y1)} fill="none" stroke={INK} strokeWidth={3.2} />
            </g>
          </>
        )}
        {/* half plinth */}
        {L.plinth && (
          <g id={`${uid}-pl`}>
            <path d={panelRect(L.plinth.x0, L.plinth.y0, L.plinth.y1)} fill={PAPER} />
            <clipPath id={`${uid}-plc`}>
              <path d={panelRect(L.plinth.x0, L.plinth.y0, L.plinth.y1)} />
            </clipPath>
            <g clipPath={`url(#${uid}-plc)`}>
              <path d={g.plinthHatch} fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
              <path d={g.plinthV} fill="none" stroke={INK} strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
            </g>
            <path d={panelRect(L.plinth.x0, L.plinth.y0, L.plinth.y1)} fill="none" stroke={INK} strokeWidth={3} />
          </g>
        )}
        {/* inscription plaque, one piece across the axis */}
        <g id={`${uid}-bd`}>
          <path d={`M${L.band.x0} ${L.band.y0}H${cx * 2 - L.band.x0}V${L.band.y1}H${L.band.x0}Z`} fill={PAPER} stroke={INK} strokeWidth={3.2} />
          <path d={`M${L.band.x0 + 6} ${L.band.y0 + 6}H${cx * 2 - L.band.x0 - 6}M${L.band.x0 + 6} ${L.band.y1 - 6}H${cx * 2 - L.band.x0 - 6}`} stroke={INK} strokeWidth={0.9} />
        </g>
        {/* column */}
        <clipPath id={`${uid}-cs`}>
          <path d={g.col.shaft} />
        </clipPath>
        <g id={`${uid}-col`}>
          <path d={g.col.plinth} fill={PAPER} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
          <path d={g.col.base} fill={PAPER} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
          <path d={g.col.shaft} fill={PAPER} />
          <g clipPath={`url(#${uid}-cs)`}>
            <path d={g.col.light} fill="none" stroke={INK} strokeWidth={0.7} strokeLinecap="round" opacity={0.7} />
            <path d={g.col.shade} fill="none" stroke={INK} strokeWidth={1.25} strokeLinecap="round" />
            <path d={`M${L.col.x + L.col.w * 0.4} ${L.col.top}h${L.col.w}V${L.ground}h${-L.col.w}Z`} fill={INK} />
          </g>
          <path d={g.col.flutes} fill="none" stroke={INK} strokeWidth={1} opacity={0.8} />
          <path d={g.col.shaft} fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
          <path d={g.col.echinus} fill={PAPER} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d={g.col.abacus} fill={PAPER} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d={`M${L.col.x + L.col.w * 0.34} ${L.col.top}H${L.col.x + L.col.w * 0.64}V${L.col.top + L.col.w * 0.2}H${L.col.x + L.col.w * 0.34}Z`} fill={INK} />
        </g>
        <clipPath id={`${uid}-st`}>
          <path d={g.stair} />
        </clipPath>
      </defs>

      {/* steps */}
      <g data-t="steps">
        <rect x={0} y={L.ground} width={W} height={H - L.ground} fill={PAPER} />
        <path d={g.stepHatch} fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" />
        <path d={g.riserShadow} fill={INK} />
        <path d={g.riser} stroke={INK} strokeWidth={2.8} fill="none" />
      </g>
      <g data-t="stair">
        <path d={g.stair} fill={INK} />
        <g clipPath={`url(#${uid}-st)`}>
          <path d={g.stairHatch} fill="none" stroke={PAPER} strokeWidth={0.9} strokeLinecap="round" opacity={0.85} />
          <path d={g.conv} fill="none" stroke={PAPER} strokeWidth={0.8} opacity={0.55} />
        </g>
        <path d={g.stairLines} stroke={PAPER} strokeWidth={2.4} fill="none" />
        <path d={g.stair} fill="none" stroke={INK} strokeWidth={3} />
      </g>

      {/* engraved panels */}
      <g data-t="panL"><use href={`#${uid}-pan`} /></g>
      <g data-t="panR"><use href={`#${uid}-pan`} transform={mirror} /></g>
      {L.attic && (
        <>
          <g data-t="atticL"><use href={`#${uid}-att`} /></g>
          <g data-t="atticR"><use href={`#${uid}-att`} transform={mirror} /></g>
        </>
      )}
      {L.plinth && (
        <>
          <g data-t="plinL"><use href={`#${uid}-pl`} /></g>
          <g data-t="plinR"><use href={`#${uid}-pl`} transform={mirror} /></g>
        </>
      )}

      {/* inscription band */}
      <g data-t="band">
        <use href={`#${uid}-bd`} />
        <text
          x={cx}
          y={(L.band.y0 + L.band.y1) / 2 + L.band.font * 0.36}
          textAnchor="middle"
          fontSize={L.band.font}
          letterSpacing={L.band.font * 0.42}
          fill={INK}
          style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}
        >
          {person.motto}
        </text>
        <path d={`M${cx - bandW + 18} ${(L.band.y0 + L.band.y1) / 2}h14M${cx + bandW - 32} ${(L.band.y0 + L.band.y1) / 2}h14`} stroke={INK} strokeWidth={1.4} />
      </g>

      {/* columns */}
      <g data-t="colL"><use href={`#${uid}-col`} /></g>
      <g data-t="colR"><use href={`#${uid}-col`} transform={mirror} /></g>

      {/* the great ring */}
      <g data-t="ring">
        <path d={g.annulus} fill={PAPER} fillRule="evenodd" />
        <circle cx={cx} cy={cy} r={r} fill={INK} />
        <path d={g.ticks} stroke={INK} strokeWidth={1} fill="none" opacity={0.85} />
        <path d={g.ringShade} stroke={INK} strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <path d={g.ringShade2} stroke={INK} strokeWidth={0.9} fill="none" strokeLinecap="round" opacity={0.8} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={INK} strokeWidth={3.6} />
        <circle cx={cx} cy={cy} r={R - 10} fill="none" stroke={INK} strokeWidth={1.1} />
        <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke={INK} strokeWidth={1.1} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={3.6} />
        <path d={g.key} fill={INK} />
        <path d={`M${cx} ${cy - R + 6}V${cy - r - 4}`} stroke={PAPER} strokeWidth={1.2} />
      </g>
    </svg>
  );
}
