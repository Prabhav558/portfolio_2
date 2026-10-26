import { useId, useMemo } from 'react';
import Hand, { HAND_GRIP_ANCHOR } from '../../art/Hand';
import { mulberry32 } from '../../lib/random';
import { processSteps, skills } from '../../config/portfolio';
import VesselSvg from './VesselSvg';
import { LATTE, BOWL, INK, PAPER, RED, buildBowl, tableFace } from './art';
import { DEEP, poolPath, ridge, soilArt, starsPath, strata, stripesPath, surfaceLines } from './worldArt';
import { FOOT_RUN, MARK_FILL, RIVULETS, STEM_RUN, TIE_INDEX, gardenOf, type Layout, type Terrace } from './layout';
import styles from './ChapterTransformation.module.css';

export const N_DROPS = 14;
export const N_PETALS = 7;
export const N_GDROPS = 8;
export const N_BEADS = 5;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const X0 = -760;
const BAND = 28;

/** A water path as black outline + latte body + cream glint, all revealed together by stroke-dashoffset. */
function Flow({ id, d, w, round }: { id: string; d: string; w: number; round?: boolean }) {
  const common = {
    'data-draw': id,
    d,
    pathLength: 1,
    fill: 'none',
    strokeLinejoin: 'round' as const,
    strokeDasharray: '1 2',
    strokeDashoffset: 1,
    ...(round ? { strokeLinecap: 'round' as const, opacity: 0 } : {}),
  };
  return (
    <>
      <path {...common} stroke={INK} strokeWidth={w + 4.6} />
      <path {...common} stroke={LATTE} strokeWidth={w} />
      <path {...common} stroke={PAPER} strokeWidth={Math.max(1.2, w * 0.2)} opacity="0.85" />
    </>
  );
}

function ledgeOutline(t: Terrace, seed: number) {
  const top = t.y - BAND;
  const bot = t.y + t.face;
  if (t.x1 - t.x0 > 2000) return `M${t.x0} ${top}H${t.x1}V${bot}H${t.x0}Z`;
  const rng = mulberry32(seed);
  const jit = () => (rng() - 0.5) * 9;
  const pts: string[] = [`${t.x0} ${top}`, `${t.x1} ${top}`];
  for (let y = top + 14; y < bot; y += 14) pts.push(`${Math.round((t.x1 + jit()) * 10) / 10} ${y}`);
  for (let x = t.x1; x > t.x0; x -= 34) pts.push(`${x} ${Math.round((bot + jit()) * 10) / 10}`);
  for (let y = bot - 14; y > top; y -= 14) pts.push(`${Math.round((t.x0 + jit()) * 10) / 10} ${y}`);
  return `M${pts.join('L')}Z`;
}

/** The whole vertical world for one layout: night panel with the chalice, table, gutter, ground panel, garden. */
export default function World({ L }: { L: Layout }) {
  const uid = 'w' + useId().replace(/:/g, '');
  const mobile = L.key === 'mob';
  const art = useMemo(buildBowl, []);
  const { R, D, rimRy, stem, foot } = BOWL;
  const y1 = D + stem;
  const yb = D + stem + foot;
  const bs = L.bowl.s;
  const Y0 = L.terraces[0].y;
  const Ylast = L.terraces[L.terraces.length - 1].y;
  const plants = useMemo(() => gardenOf(L), [L]);
  const W = L.w;

  const world = useMemo(() => {
    const m = mobile;
    const ledgeIx = L.terraces.map((t, i) => ({
      d: ledgeOutline(t, 900 + i),
      soil: soilArt(500 + i * 7, Math.max(t.x0, X0), Math.min(t.x1, W - X0), t.y, t.face, m ? 6 : 36),
      surf: surfaceLines(70 + i, Math.max(t.x0, X0), Math.min(t.x1, W - X0), t.y - BAND, BAND),
      pool: poolPath(40 + i, t.poolRx, m ? 11 : 20),
      bars: m ? '' : strata(77 + i, Math.max(t.x0, X0), Math.min(t.x1, W - X0), t.y + 4, t.face - 4),
    }));
    return {
      night: stripesPath(11, X0, W - X0, -40, L.tableTop, m ? 11 : 16, 1.4, m ? 7 : 11, 2.2),
      starsA: starsPath(5, X0 + 200, W - X0 - 200, 10, L.tableTop - 260, m ? 22 : 40),
      sky: stripesPath(23, X0, W - X0, L.G + 24, Ylast - 30, m ? 13 : 18, 1.4, m ? 8 : 12, 1.5, true),
      starsB: starsPath(9, X0 + 200, W - X0 - 200, L.G + 60, Y0 - 120, m ? 40 : 56),
      far: m ? null : ridge(61, X0, W - X0, Y0 - 70, 150, Y0 + 40),
      near: m ? null : ridge(67, X0, W - X0, Y0 - 6, 70, Y0 + 40),
      table: tableFace(L.key === 'mob' ? 21 : 19, X0, W - X0, L.tableTop + 16, L.G - L.tableTop - 16),
      ledges: ledgeIx,
    };
  }, [L, mobile, W, Y0, Ylast]);

  const k = L.rigW / 560;
  const rigH = k * 360;
  const ox = HAND_GRIP_ANCHOR.cx * k;
  const oy = (HAND_GRIP_ANCHOR.cy - 140) * k;
  const petals = Array.from({ length: N_PETALS }, (_, i) => -64 + (128 * i) / (N_PETALS - 1));
  const rivW = 5.4;

  return (
    <div className={styles.world} data-world={L.key} style={{ width: W, height: L.flowH }}>
      {/* ---------- static art: night panel, chalice, table, gutter, ground panel ---------- */}
      <svg className={styles.fill} viewBox={`0 0 ${W} ${L.flowH}`} aria-hidden="true" focusable="false">
        {/* upper panel: the pour at night */}
        <rect x={X0} y="-900" width={W - 2 * X0} height={L.tableTop + 900} fill={RED} />
        <path d={world.night} fill={INK} />
        <path d={world.starsA} stroke={PAPER} strokeWidth="3" strokeLinecap="round" opacity="0.75" fill="none" />

        {/* chalice */}
        <g transform={`translate(${L.bowl.x} ${L.bowl.rimY}) scale(${bs})`}>
          <defs>
            <clipPath id={`${uid}-in`}>
              <path d={`M${-R + 6} 0A${R - 6} ${D - 6} 0 0 0 ${R - 6} 0Z`} />
              <ellipse cx="0" cy="0" rx={R - 8} ry={rimRy - 3} />
            </clipPath>
            <pattern id={`${uid}-lh`} width="8" height="5" patternUnits="userSpaceOnUse">
              <path d="M0 2.5H8" stroke={INK} strokeWidth="1.15" />
            </pattern>
            <clipPath id={`${uid}-body`}>
              <path d={`M${-R} 0A${R} ${D} 0 0 0 ${R} 0Z`} />
            </clipPath>
          </defs>
          <path d={art.shadow} fill={INK} transform="translate(0 16)" />
          <path
            d={`M-26 ${y1 - 2}C-40 ${y1 + 4} -92 ${y1 + 5} -98 ${yb}H98C92 ${y1 + 5} 40 ${y1 + 4} 26 ${y1 - 2}Z`}
            fill={PAPER}
            stroke={INK}
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path
            d={`M-14 ${D - 4}C-10 ${D + 22} -9 ${D + 42} -19 ${y1}H19C9 ${D + 42} 10 ${D + 22} 14 ${D - 4}Z`}
            fill={PAPER}
            stroke={INK}
            strokeWidth="3.4"
            strokeLinejoin="round"
          />
          <path d={art.stemHatch} fill="none" stroke={INK} strokeWidth="1.6" />
          <path d={`M30 ${y1 + 8}C50 ${y1 + 9} 78 ${y1 + 12} 94 ${yb - 2}`} fill="none" stroke={INK} strokeWidth="5" />
          <path d={`M${-R} 0A${R} ${D} 0 0 0 ${R} 0Z`} fill={PAPER} />
          <g clipPath={`url(#${uid}-body)`}>
            <path d={art.thin} fill="none" stroke={INK} strokeWidth="0.95" />
            <path d={art.thick} fill="none" stroke={INK} strokeWidth="2.6" />
          </g>
          <ellipse cx="0" cy="0" rx={R} ry={rimRy} fill={PAPER} stroke={INK} strokeWidth="3.4" />
          <ellipse cx="0" cy="1" rx={R - 10} ry={rimRy - 6} fill={INK} />
          <g clipPath={`url(#${uid}-in)`}>
            <rect data-bl-rect="" x={-R} y={D} width={2 * R} height={D + 20} fill={LATTE} />
            <rect data-bl-rect="" x={-R} y={D} width={2 * R} height={D + 20} fill={`url(#${uid}-lh)`} opacity="0.6" />
            <ellipse data-bl-surf="" cx="0" cy={D} rx="10" ry="2" fill={LATTE} stroke={INK} strokeWidth="2" />
            <ellipse data-bl-rip="" cx="0" cy={D} rx="4" ry="1" fill="none" stroke={PAPER} strokeWidth="2.2" opacity="0" />
            <ellipse data-bl-rip="" cx="0" cy={D} rx="4" ry="1" fill="none" stroke={PAPER} strokeWidth="2.2" opacity="0" />
          </g>
          <path d={`M${-R} 0A${R} ${rimRy} 0 0 0 ${R} 0`} fill="none" stroke={INK} strokeWidth="3.6" />
          <path d={`M${-R} 0A${R} ${D} 0 0 0 ${R} 0`} fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          {/* engraved level marks: they light as the surface passes them */}
          {MARK_FILL.map((f, i) => {
            const d = D * (1 - f * 0.96);
            const x = R * Math.sqrt(1 - (d / D) * (d / D));
            return (
              <g key={i} data-mark="" opacity="0.4">
                <path d={`M${x + 6} ${d}H${x + L.mark.len + 6}`} stroke={PAPER} strokeWidth="2.8" />
                <text x={x + L.mark.text} y={d + 6} fill={PAPER} fontFamily="var(--font-mono)" fontSize="20" letterSpacing="1.5">
                  {String(i + 1).padStart(2, '0')}
                </text>
              </g>
            );
          })}
          <path d={`M${-R + 30} 26C${-R + 44} 62 ${-R + 80} 84 ${-R + 130} 92`} fill="none" stroke={PAPER} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
          <path d={`M${-R + 20} 14C${-R + 22} 30 ${-R + 30} 40 ${-R + 40} 48`} fill="none" stroke={PAPER} strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
          {/* the surface bulges over the lip, then spills down the outside of the bowl, the stem and the foot */}
          <g data-men="">
            <ellipse cx="0" cy="1" rx={R - 3} ry={rimRy + 0.5} fill={LATTE} stroke={INK} strokeWidth="2.8" />
            <path d={`M${-R + 30} -4Q0 -13 ${R - 30} -4`} fill="none" stroke={PAPER} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          </g>
          {RIVULETS.map((d, i) => (
            <Flow key={i} id={`riv${i}`} d={d} w={rivW} />
          ))}
          <Flow id="stem" d={STEM_RUN} w={rivW + 1.4} />
          <Flow id="foot" d={FOOT_RUN} w={rivW + 1.4} />
        </g>

        {/* the table: lip and engraved front face */}
        <rect x={X0} y={L.tableTop - 12} width={W - 2 * X0} height="30" fill={PAPER} />
        <rect x={X0} y={L.tableTop + 16} width={W - 2 * X0} height={L.G - L.tableTop - 16} fill={PAPER} />
        <path d={world.table} fill={INK} />
        <path d={`M${X0} ${L.tableTop - 12}H${W - X0}`} stroke={INK} strokeWidth="3" />
        <path d={`M${X0} ${L.tableTop + 16}H${W - X0}`} stroke={INK} strokeWidth="4" />

        {/* the gutter: a paper channel between the two panels, ruled in black */}
        <rect x={X0} y={L.G} width={W - 2 * X0} height="24" fill={PAPER} />
        <path d={`M${X0} ${L.G}H${W - X0}M${X0} ${L.G + 24}H${W - X0}`} stroke={INK} strokeWidth="3.4" />

        {/* lower panel: night sky over the ground */}
        <rect x={X0} y={L.G + 24} width={W - 2 * X0} height={L.flowH + 1400} fill={RED} />
        <path d={world.sky} fill={INK} />
        <path d={world.starsB} stroke={PAPER} strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
        {world.far && (
          <g>
            <path d={world.far.fill} fill={DEEP} />
            <path d={world.far.hatch} stroke={INK} strokeWidth="1.3" fill="none" opacity="0.8" />
            <path d={world.far.line} stroke={INK} strokeWidth="3" fill="none" />
          </g>
        )}
        {world.near && (
          <g>
            <path d={world.near.fill} fill={INK} />
            <path d={world.near.hatch} stroke={DEEP} strokeWidth="1.3" fill="none" />
            <path d={world.near.line} stroke={INK} strokeWidth="3" fill="none" />
          </g>
        )}

        {/* the ground: a surface band over a cross-section of engraved strata; the wet region is revealed over it */}
        {L.terraces.map((t, i) => {
          const g = world.ledges[i];
          return (
            <g key={i}>
              <defs>
                <clipPath id={`${uid}-lg${i}`}>
                  <path d={g.d} />
                </clipPath>
                <clipPath id={`${uid}-pc${i}`}>
                  <rect x={t.x0} y={t.y - 90} width={t.x1 - t.x0} height="130" />
                </clipPath>
                <clipPath id={`${uid}-wc${i}`}>
                  <ellipse data-wetc={i} cx={t.impact} cy={t.y} rx="0" ry="0" />
                </clipPath>
              </defs>
              {mobile && <path d={g.d} fill={INK} transform="translate(5 6)" />}
              <path d={g.d} fill={PAPER} />
              <g clipPath={`url(#${uid}-lg${i})`}>
                <path d={g.surf} stroke={INK} strokeWidth="1.1" fill="none" opacity="0.7" />
                <path d={g.bars} fill={INK} />
                <path d={g.soil.lines} stroke={INK} strokeWidth="1.1" fill="none" />
                <path d={g.soil.heavy} stroke={INK} strokeWidth="2.8" fill="none" />
                <path d={g.soil.pebbles} stroke={INK} strokeWidth="1.5" fill="none" />
                <g clipPath={`url(#${uid}-wc${i})`}>
                  <path d={g.d} fill={LATTE} />
                  <path d={g.bars} fill={INK} />
                  <path d={g.soil.wet} stroke={INK} strokeWidth="1.4" fill="none" />
                  <path d={g.soil.wetHeavy} stroke={INK} strokeWidth="3.4" fill="none" />
                  <path d={g.soil.pebbles} stroke={INK} strokeWidth="1.7" fill="none" />
                </g>
              </g>
              <path d={`M${Math.max(t.x0, X0)} ${t.y}H${Math.min(t.x1, W - X0)}`} stroke={INK} strokeWidth="3" />
              <path d={g.d} fill="none" stroke={INK} strokeWidth="3.4" strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>

      {/* ---------- hand + flask ---------- */}
      <div
        className={styles.rig}
        data-rig=""
        style={{
          width: L.rigW,
          height: rigH,
          left: L.A0[0] - ox,
          top: L.A0[1] - oy,
          transformOrigin: `${ox}px ${oy}px`,
        }}
      >
        <VesselSvg />
        <div className={styles.fillBox}>
          <Hand pose="grip" />
        </div>
      </div>

      {/* ---------- water and plants ---------- */}
      <svg className={styles.fill} viewBox={`0 0 ${W} ${L.flowH}`} aria-hidden="true" focusable="false">
        {/* roots, pools, ripples */}
        {plants.map((p, i) => (
          <g key={`r${i}`}>
            <path data-draw={`root${i}`} d={p.fine} pathLength={1} fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="1 2" strokeDashoffset={1} />
            <path data-draw={`root${i}`} d={p.roots} pathLength={1} fill="none" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" strokeDasharray="1 2" strokeDashoffset={1} />
          </g>
        ))}
        {L.terraces.map((t, i) => (
          <g key={`p${i}`} clipPath={`url(#${uid}-pc${i})`}>
          <g transform={`translate(${t.impact} ${t.y - BAND / 2})`}>
            <g data-pool={i}>
              <path d={world.ledges[i].pool} fill={LATTE} stroke={INK} strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </g>
            <ellipse data-ripple={i} cx="0" cy="0" rx="40" ry="6" fill="none" stroke={PAPER} strokeWidth="2.4" opacity="0" />
          </g>
          </g>
        ))}

        {/* plants: stem, shade, nodes, leaves */}
        {plants.map((p, i) => (
          <g key={`s${i}`} data-sway={i}>
            <path data-draw={`stem${i}`} d={p.stem} pathLength={1} fill="none" stroke={INK} strokeWidth="9.6" strokeLinecap="butt" strokeDasharray="1 2" strokeDashoffset={1} />
            <path data-draw={`stem${i}`} d={p.stem} pathLength={1} fill="none" stroke={PAPER} strokeWidth="5.4" strokeLinecap="butt" strokeDasharray="1 2" strokeDashoffset={1} />
            <path data-draw={`stem${i}`} d={p.shade} pathLength={1} fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="1 2" strokeDashoffset={1} />
            <path data-nodes={i} d={p.nodes} fill="none" stroke={INK} strokeWidth="2.2" opacity="0" />
            {p.leaves.map((lf, j) => (
              <g key={j} transform={`translate(${lf.x} ${lf.y}) rotate(${Math.round(lf.ang * 10) / 10})`}>
                <g data-leaf={i} data-cot={lf.cot ? '1' : ''} data-fold={Math.round(lf.fold * 10) / 10} opacity="0">
                  <path d={lf.outline} fill={PAPER} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
                  <path d={lf.detail} fill="none" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
                </g>
              </g>
            ))}
          </g>
        ))}
        {plants.map((_, i) => (
          <path key={`t${i}`} data-draw={`str${i}`} d="" pathLength={1} fill="none" stroke={INK} strokeWidth="1.6" strokeDasharray="1 2" strokeDashoffset={1} />
        ))}

        {/* the water that leaves the chalice: across the table, down the face, through the gutter, onto the ground */}
        <Flow id="run" d={L.runD} w={11} />
        {L.fallSegs.map((s, i) => (
          <Flow key={i} id={`fall${i}`} d={s.d} w={s.w} round />
        ))}
        {L.cascades.map((d, i) => (
          <Flow key={i} id={`cas${i}`} d={d} w={7} />
        ))}
        {Array.from({ length: N_BEADS }, (_, i) => (
          <ellipse key={i} data-bead={i} cx={L.xi + (i % 2 ? 1 : -1) * (14 + i * 5)} cy={L.G + 10} rx="4.4" ry="6" fill={LATTE} stroke={INK} strokeWidth="2" opacity="0" />
        ))}

        {/* the pour: stream, drops, crown */}
        <path data-stream="" d="" fill={LATTE} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path data-stream-hi="" d="" fill="none" stroke={PAPER} strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
        {Array.from({ length: N_DROPS }, (_, i) => (
          <ellipse key={i} data-drop="" cx="0" cy="0" rx="4" ry="5" fill={LATTE} stroke={INK} strokeWidth="1.8" opacity="0" />
        ))}
        <g data-splash="">
          {Array.from({ length: N_PETALS }, (_, i) => (
            <path
              key={i}
              data-petal=""
              d="M-6 0C-7 -14 -3 -26 0 -34C3 -26 7 -14 6 0Z"
              fill={LATTE}
              stroke={INK}
              strokeWidth="2"
              strokeLinejoin="round"
              opacity="0"
            />
          ))}
        </g>

        {/* impact on the ground */}
        <g transform={`translate(${L.xi} ${Y0 - BAND / 2})`}>
          {petals.map((a, i) => (
            <g key={i} transform={`rotate(${a})`}>
              <path
                data-gpetal=""
                d={`M-7 0C-9 -16 -4 -32 0 -46C4 -32 9 -16 7 0Z`}
                fill={LATTE}
                stroke={INK}
                strokeWidth="2.2"
                strokeLinejoin="round"
                opacity="0"
              />
            </g>
          ))}
          {[-62, -38, -20, 22, 44, 66].map((dx, i) => (
            <ellipse key={i} data-gbead={i} data-dx={dx} cx="0" cy="0" rx="4" ry="5.4" fill={LATTE} stroke={INK} strokeWidth="1.8" opacity="0" />
          ))}
        </g>

        {/* drops thrown on the garden while the viewer holds */}
        {Array.from({ length: N_GDROPS }, (_, i) => (
          <ellipse key={i} data-gdrop="" cx="0" cy="0" rx="4" ry="5.6" fill={LATTE} stroke={INK} strokeWidth="1.8" opacity="0" />
        ))}

        {/* leader lines from the engraved marks to the steps */}
        {!mobile &&
          processSteps.map((_, i) => (
            <path key={i} data-draw={`ld${i}`} d="" pathLength={1} fill="none" stroke={PAPER} strokeWidth="1.8" strokeDasharray="1 2" strokeDashoffset={1} />
          ))}
      </svg>

      {/* ---------- text that travels with the art ---------- */}
      <ol
        className={`${styles.steps} ${mobile ? styles.stepsSlot : ''}`}
        data-steps=""
        style={{ left: L.steps.x, top: L.steps.y, width: L.steps.w }}
      >
        {processSteps.map((p) => (
          <li key={p.step} className={styles.step} data-step="">
            <span className={styles.stepNo}>{p.step}</span>
            <span className={styles.stepBody}>
              <span className={styles.stepTitle}>{p.title}</span>
              <span className={styles.stepText}>{p.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <ul className={styles.tags}>
        {L.sprouts.map((s, i) => {
          const tie = plants[i].pts[TIE_INDEX];
          const left = s.tag === 'c' ? s.x - s.tagW / 2 : s.tag === 'r' ? s.x + 40 : s.x - 40 - s.tagW;
          const style =
            s.tag === 'c'
              ? { left, top: tie[1] + 30, width: s.tagW, ['--eye' as string]: `${Math.round(s.eye * 100)}%` }
              : { left, top: s.gy - 14, width: s.tagW, transform: 'translateY(-100%)' };
          return (
            <li key={s.g} className={styles.tagPos} style={style} data-tagpos={i}>
              <div className={`${styles.tag} ${s.tag === 'l' ? styles.tagL : s.tag === 'r' ? styles.tagR : ''}`} data-tag={i}>
                <span className={styles.tagEye} aria-hidden="true" />
                <span className={`label ${styles.tagNo}`}>{ROMAN[s.g]}</span>
                <h4 className={styles.tagName}>{skills[s.g].group}</h4>
                <ul className={styles.tagItems}>
                  {skills[s.g].items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
