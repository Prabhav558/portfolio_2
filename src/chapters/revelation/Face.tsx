import { useId } from 'react';
import { hatch } from '../../art/procedural';
import { BLUE, DESK_VIEWBOX, FACE_ART as A, INK, INK2, MOBILE_VIEWBOX, PAPER, RED } from './faceArt';

const LOCK_LINES = hatch({ seed: 91, x: 820, y: -120, width: 200, height: 590, angle: 84, spacing: 9, wobble: 2, breakChance: 0.18, step: 36 });

interface Props {
  mobile: boolean;
  className?: string;
}

/** The Keeper's face: separate groups for face, brows, eyes, tear, hair-left, hair-right. */
export default function Face({ mobile, className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (n: string) => `${uid}-${n}`;
  const ref = (n: string) => `url(#${id(n)})`;
  const zones = [
    ...A.mid.map((z, i) => ({ z, k: `m${i}`, c: INK2 })),
    ...A.dark.map((z, i) => ({ z, k: `d${i}`, c: INK })),
    ...A.deep.map((z, i) => ({ z, k: `p${i}`, c: INK })),
  ];

  const renderZone = ({ z, k, c }: (typeof zones)[number]) => (
    <g key={k} clipPath={ref(k)}>
      <path d={z.lines} fill="none" stroke={c} strokeWidth={z.sw} />
    </g>
  );

  return (
    <svg
      className={className}
      viewBox={mobile ? MOBILE_VIEWBOX : DESK_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Close-up engraving of the Keeper's face: black hair framing two wide eyes with pale latte irises, one eye half hidden by a fall of hair, a single line of burgundy ink running down the cheek."
      data-face=""
    >
      <defs>
        <clipPath id={id('face')}>
          <path d={A.face} />
        </clipPath>
        <clipPath id={id('hl')}>
          <path d={A.hairL} />
        </clipPath>
        <clipPath id={id('hr')}>
          <path d={A.hairR} />
        </clipPath>
        <clipPath id={id('lock')}>
          <path d={A.lock} />
        </clipPath>
        {zones.map(({ z, k }) => (
          <clipPath key={k} id={id(k)}>
            <path d={z.clip} />
          </clipPath>
        ))}
        {A.cross.map((z, i) => (
          <clipPath key={i} id={id(`x${i}`)}>
            <path d={z.clip} />
          </clipPath>
        ))}
        {A.eyes.map((e, i) => (
          <g key={i}>
            <clipPath id={id(`e${i}`)}>
              <path d={e.shape} />
            </clipPath>
            <clipPath id={id(`s${i}`)}>
              <path d={e.shadeClip} />
            </clipPath>
            <clipPath id={id(`b${i}`)}>
              <path d={e.lidShadowClip} />
            </clipPath>
          </g>
        ))}
      </defs>

      <rect x="-400" y="-400" width="2400" height="2300" fill={INK} />
      <rect x="-400" y="-400" width="510" height="2300" fill={RED} />
      <rect x="1490" y="-400" width="510" height="2300" fill={RED} />

      <g data-g="neck">
        <path d={A.neck} fill={PAPER} />
        <path d={A.neckLines} fill="none" stroke={INK} strokeWidth="2.6" />
        <path d={A.collar} fill={INK} />
        <path d={A.collarLines} fill="none" stroke={PAPER} strokeWidth="1.1" opacity="0.7" />
      </g>

      <g data-g="face">
        <path d={A.face} fill={PAPER} />
        <g clipPath={ref('face')}>
          <path d={A.baseLines} fill="none" stroke={INK2} strokeWidth="1.15" />
          {zones.filter((z) => z.k[0] === 'm').map(renderZone)}
          <path d={A.highlights} fill={PAPER} opacity="0.95" />
          {zones.filter((z) => z.k[0] !== 'm').map(renderZone)}
          {A.cross.map((z, i) => (
            <g key={i} clipPath={ref(`x${i}`)}>
              <path d={z.lines} fill="none" stroke={INK} strokeWidth={z.sw} />
            </g>
          ))}
          <path d={A.specks} fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <path d={A.nose} fill={INK} />
        <path d={A.nostrils} fill={INK} />
        <path d={A.philtrum} fill={INK2} />
        <path d={A.mouthLine} fill={INK} />
        <path d={A.lipLower} fill={INK} />
        <path d={A.lipCorners} fill={INK} />
        <path d={A.chinLine} fill={INK} />
        <path d={A.contour} fill={INK} />
      </g>

      <g data-g="brows">
        <path d={A.browNear} fill={INK} />
        <path d={A.browFar} fill={INK} />
        <path d={A.browHairs} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      </g>

      <g data-g="eyes">
        {A.eyes.map((e, i) => (
          <g key={i} data-eye={i}>
            <path d={e.shape} fill={PAPER} />
            <g clipPath={ref(`e${i}`)}>
              <g clipPath={ref(`s${i}`)}>
                <path d={e.shade} fill="none" stroke={INK} strokeWidth="1.5" />
              </g>
              <g transform={`translate(${e.c[0]} ${e.c[1]})`}>
                <g data-iris={i}>
                  <circle r={e.r} fill={BLUE} />
                  <circle r={e.r * 0.78} fill="none" stroke={INK} strokeWidth="1" opacity="0.35" />
                  <path d={e.iris.dark} fill="none" stroke={INK} strokeWidth="1.6" opacity="0.85" />
                  <path d={e.iris.light} fill="none" stroke={PAPER} strokeWidth="1.3" opacity="0.75" />
                  <circle r={e.r * 0.4} fill={INK} />
                  <circle r={e.r - 2} fill="none" stroke={INK} strokeWidth="6" />
                  <ellipse cx={-e.r * 0.36} cy={-e.r * 0.38} rx={e.r * 0.15} ry={e.r * 0.2} fill={PAPER} transform={`rotate(-24 ${-e.r * 0.36} ${-e.r * 0.38})`} />
                  <circle cx={e.r * 0.28} cy={e.r * 0.32} r={e.r * 0.07} fill={PAPER} />
                </g>
              </g>
              <g clipPath={ref(`b${i}`)}>
                <path d={e.shade} fill="none" stroke={INK} strokeWidth="1.8" />
              </g>
            </g>
            <path d={e.lid} fill={INK} />
            <path d={e.lashes} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
            <path d={e.lowerLid} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <path d={e.crease} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <path d={e.bags} fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        ))}
      </g>

      <g data-g="tear">
        <path d={A.tearSmear} fill={RED} />
        <path d={A.tear} fill={RED} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
        <path d={A.tearHi} fill="none" stroke={PAPER} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path d={A.tearDrops} fill={RED} stroke={INK} strokeWidth="1.2" />
      </g>

      <g data-g="hair-left">
        <path d={A.hairL} fill={INK} />
        <g clipPath={ref('hl')}>
          <path d={A.strL} fill="none" stroke={PAPER} strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
          <path d={A.sheenL} fill="none" stroke={BLUE} strokeWidth="1.8" opacity="0.9" strokeLinecap="round" />
        </g>
        <path d={A.spikesL} fill={INK} />
        <path d={A.fringeL} fill={INK} />
        <path d={A.looseL} fill={INK} />
      </g>

      <g data-g="hair-right">
        <path d={A.hairR} fill={INK} />
        <g clipPath={ref('hr')}>
          <path d={A.strR} fill="none" stroke={PAPER} strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
          <path d={A.sheenR} fill="none" stroke={BLUE} strokeWidth="1.8" opacity="0.9" strokeLinecap="round" />
        </g>
        <path d={A.spikesR} fill={INK} />
        <path d={A.lock} fill={INK} />
        <g clipPath={ref('lock')}>
          <path d={LOCK_LINES} fill="none" stroke={PAPER} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
        </g>
        <path d={A.lockStrand} fill={INK} />
        <path d={A.looseR} fill={INK} />
      </g>
    </svg>
  );
}
