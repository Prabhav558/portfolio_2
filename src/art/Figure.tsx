import { useId } from 'react';
import type { CSSProperties } from 'react';
import { contourHatch, hatch, polySmooth, smoothPath } from './procedural';
import type { Pt } from './procedural';
import { mulberry32 } from '../lib/random';

const INK = 'var(--black)';
const INK2 = 'var(--ink)';
const PAPER = 'var(--cream)';
const BLUE = 'var(--latte)';

export const FIGURE_VIEWBOX = { w: 400, h: 1000 } as const;

/* ------------------------------------------------------------------ */
/* Geometry (module level, computed once)                              */
/* ------------------------------------------------------------------ */

const closed = (pts: Array<[number, number]>, k = 1 / 6) => smoothPath(pts as Pt[], true, k);

const ROBE = closed([
  [176, 172], [150, 180], [126, 196], [114, 226], [110, 290], [112, 380], [118, 470], [114, 560],
  [102, 680], [86, 800], [70, 880], [130, 904], [260, 904], [346, 880], [334, 800], [312, 690],
  [292, 570], [280, 470], [282, 380], [284, 300], [282, 236], [270, 200], [244, 180], [216, 172], [196, 170],
]);

const SLEEVE_L = closed([
  [128, 194], [106, 222], [88, 290], [70, 390], [56, 490], [46, 570], [44, 600], [70, 612], [100, 606],
  [128, 614], [134, 540], [140, 450], [146, 350], [152, 260], [150, 212],
]);
const SLEEVE_R = closed([
  [264, 196], [288, 226], [316, 290], [344, 380], [366, 470], [380, 550], [386, 592], [352, 610], [322, 602],
  [296, 614], [290, 540], [282, 450], [274, 350], [266, 260], [262, 214],
]);

const HEM_TOP = 872;
const HEM_ANCHORS: Array<[number, number]> = [
  [74, HEM_TOP], [210, HEM_TOP], [344, HEM_TOP],
  [352, 910], [366, 946],
  [350, 966], [318, 974], [286, 964], [252, 978], [218, 968], [184, 980], [150, 970], [116, 981], [82, 970], [50, 962],
  [48, 946], [64, 910],
];
const HEM_FILL = closed(HEM_ANCHORS, 1 / 10);
/** open outline: right side, wavy bottom, left side (no stroke along the top seam) */
const HEM_OUTLINE = smoothPath(
  [...HEM_ANCHORS.slice(2, 5), ...HEM_ANCHORS.slice(5, 15), ...HEM_ANCHORS.slice(15), HEM_ANCHORS[0]] as Pt[],
  false,
);

const HAIR_BACK = closed([
  [196, 60], [222, 66], [242, 92], [248, 130], [252, 190], [252, 260], [250, 330], [248, 390], [252, 450],
  [260, 510], [274, 562], [252, 548], [226, 506], [204, 446], [188, 384], [176, 320], [166, 250],
  [158, 190], [152, 140], [156, 98], [172, 72],
]);
const HAIR_FRONT_L = closed([
  [196, 60], [170, 70], [152, 98], [148, 150], [144, 230], [146, 320], [152, 400], [160, 446],
  [170, 390], [174, 310], [176, 236], [178, 170], [172, 128], [176, 98], [190, 76],
]);
const HAIR_FRONT_R = closed([
  [196, 60], [224, 70], [242, 98], [246, 150], [250, 230], [252, 320], [262, 400], [284, 450],
  [248, 396], [236, 316], [230, 236], [226, 170], [222, 128], [218, 98], [204, 76],
]);
const HAIR_CAP = closed([
  [160, 108], [164, 76], [196, 56], [230, 76], [234, 108], [220, 88], [204, 82], [196, 94], [188, 82], [172, 88],
]);
const HEAD_BACK = closed([
  [196, 70], [224, 82], [232, 114], [224, 148], [208, 168], [196, 172], [184, 168], [168, 148], [160, 114], [168, 82],
]);
const FACE = closed([
  [196, 74], [220, 88], [226, 116], [220, 146], [207, 166], [196, 172], [185, 166], [172, 146], [166, 116], [172, 88],
]);
const NECK = closed([[182, 150], [210, 150], [214, 186], [196, 192], [178, 186]]);

const rng = mulberry32(41);
const STRANDS: Array<{ d: string; w: number }> = [];
(() => {
  const starts: Array<[number, number]> = [
    [238, 84], [242, 100], [246, 118], [248, 138], [250, 160], [252, 188], [252, 214], [250, 244],
  ];
  starts.forEach(([x, y], i) => {
    const pts: Pt[] = [[x - 8, y]];
    let cx = x;
    let cy = y;
    const segs = 3 + Math.floor(rng() * 2);
    for (let s = 0; s < segs; s++) {
      cx += 24 + rng() * 16;
      cy += (rng() - 0.35) * 18 - 2 + Math.sin(s * 1.4 + i) * 6;
      pts.push([cx, cy]);
    }
    STRANDS.push({ d: smoothPath(pts, false), w: 1.1 + rng() * 2.2 });
  });
  // wisps from the tail of the hair
  [[266, 548], [272, 556], [262, 540]].forEach(([x, y], i) => {
    const pts: Pt[] = [[x - 6, y - 4]];
    let cx = x;
    let cy = y;
    for (let s = 0; s < 3; s++) {
      cx += 18 + rng() * 12;
      cy += 8 + rng() * 10 + i;
      pts.push([cx, cy]);
    }
    STRANDS.push({ d: smoothPath(pts, false), w: 1.2 + rng() * 1.4 });
  });
})();

/** vertical stripes that fan out with the robe and sway like drapery */
function fan(
  seed: number,
  o: {
    top: [number, number];
    bot: [number, number];
    y0: number;
    y1: number;
    ya: number;
    yb: number;
    spacing: number;
    sway: number;
    folds: Array<[number, number]>;
    break?: number;
  },
) {
  const rand = mulberry32(seed);
  const n = Math.round(Math.max(Math.abs(o.top[1] - o.top[0]), Math.abs(o.bot[1] - o.bot[0])) / o.spacing);
  let normal = '';
  let fold = '';
  for (let i = 0; i <= n; i++) {
    const u = (i + (rand() - 0.5) * 0.3) / n;
    const xt = o.top[0] + (o.top[1] - o.top[0]) * u;
    const xb = o.bot[0] + (o.bot[1] - o.bot[0]) * u;
    const inFold = o.folds.some(([a, b]) => u >= a && u <= b);
    const pts: Pt[] = [];
    const K = Math.max(2, Math.round((o.yb - o.ya) / 34));
    const ph = rand() * 6.28;
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 1) {
        const d = polySmooth(run);
        if (inFold) fold += d;
        else normal += d;
      }
      run = [];
    };
    for (let k = 0; k <= K; k++) {
      const y = o.ya + ((o.yb - o.ya) * k) / K;
      const v = Math.max(0, Math.min(1.2, (y - o.y0) / (o.y1 - o.y0)));
      const x =
        xt + (xb - xt) * Math.pow(v, 1.2) +
        o.sway * Math.sin(v * 5.2 + u * 6.5 + ph * 0.2) * (0.3 + v) +
        (rand() - 0.5) * 0.8;
      run.push([x, y]);
      pts.push([x, y]);
      if (rand() < (o.break ?? 0.015) && k > 0 && k < K) {
        flush();
        run.push([x, y + 8]);
      }
    }
    flush();
  }
  return { normal, fold };
}

const ROBE_FOLDS: Array<[number, number]> = [[0.15, 0.2], [0.46, 0.5], [0.72, 0.77]];
const robeFan = fan(11, {
  top: [112, 284], bot: [48, 372], y0: 180, y1: 980, ya: 168, yb: 906, spacing: 5, sway: 7, folds: ROBE_FOLDS,
});
const hemFan = fan(11, {
  top: [112, 284], bot: [48, 372], y0: 180, y1: 980, ya: HEM_TOP - 4, yb: 985, spacing: 5, sway: 7, folds: ROBE_FOLDS, break: 0.03,
});
const slLFan = fan(23, {
  top: [150, 130], bot: [128, 50], y0: 190, y1: 612, ya: 188, yb: 616, spacing: 5, sway: 4, folds: [[0.2, 0.3], [0.62, 0.72]],
});
const slRFan = fan(37, {
  top: [262, 290], bot: [296, 388], y0: 190, y1: 612, ya: 188, yb: 616, spacing: 5, sway: 4, folds: [[0.25, 0.35], [0.68, 0.78]],
});
// crease lines (ink) running down the robe
const CREASES = (() => {
  const rand = mulberry32(5);
  let d = '';
  [0.2, 0.5, 0.76].forEach((u, i) => {
    const pts: Pt[] = [];
    for (let y = 210; y <= 900; y += 46) {
      const v = (y - 180) / 800;
      const xt = 112 + (284 - 112) * u;
      const xb = 48 + (372 - 48) * u;
      pts.push([xt + (xb - xt) * Math.pow(v, 1.2) + 7 * Math.sin(v * 5.2 + u * 6.5) * (0.3 + v) + (rand() - 0.5) * 1.2, y]);
    }
    d += polySmooth(pts.slice(i % 2, pts.length));
  });
  return d;
})();
const HAIR_LINES = contourHatch({
  seed: 77,
  center: [[200, 90], [204, 200], [210, 320], [222, 440], [244, 540]],
  from: -42,
  to: 44,
  spacing: 6.5,
  wobble: 1.2,
  breakChance: 0.15,
  step: 22,
});
const FACE_SHADE = hatch({ seed: 9, x: 204, y: 74, width: 26, height: 100, angle: 78, spacing: 2.8, wobble: 0.5, breakChance: 0.1, step: 10 });
const SILHOUETTE_FOLDS = (() => {
  const rand = mulberry32(61);
  let d = '';
  for (let i = 0; i < 9; i++) {
    const x0 = 128 + i * 18 + rand() * 6;
    const pts: Pt[] = [];
    for (let y = 210; y <= 880; y += 48) {
      const v = (y - 180) / 800;
      pts.push([x0 + (x0 - 196) * v * 0.9 + 6 * Math.sin(v * 5 + i), y]);
    }
    d += polySmooth(pts);
  }
  return d;
})();
const TAILS = [
  smoothPath([[198, 432], [204, 500], [206, 560], [196, 618]] as Pt[], false),
  smoothPath([[210, 432], [226, 490], [240, 548], [236, 604]] as Pt[], false),
];

/* ------------------------------------------------------------------ */

interface Props {
  variant: 'silhouette' | 'engraved';
  robe?: 'black' | 'blue' | 'paper';
  view?: 'back' | 'front';
  className?: string;
  style?: CSSProperties;
}

const ROBE_FILL = { black: INK, blue: BLUE, paper: PAPER } as const;

/**
 * The Keeper: tall, long-haired figure in a floor-length robe with wide sleeves.
 * viewBox 400x1000, feet / hem at the bottom, hair blown to the right.
 */
export default function Figure({ variant, robe = 'blue', view = 'back', className, style }: Props) {
  const uid = 'f' + useId().replace(/:/g, '');
  const sil = variant === 'silhouette';
  const front = view === 'front';
  const fill = sil ? INK : ROBE_FILL[robe];
  const stripeColor = robe === 'black' && !sil ? PAPER : INK;
  const stripeW = robe === 'black' ? 0.9 : robe === 'paper' ? 1.5 : 1.9;
  const foldW = robe === 'black' ? 1.5 : 3.3;
  const outline = sil ? 'none' : INK;

  const part = (id: string, d: string, stripes?: { normal: string; fold: string }, extra?: React.ReactNode, noStroke = false) => (
    <>
      <path d={d} fill={fill} stroke={noStroke ? 'none' : outline} strokeWidth={2.6} strokeLinejoin="round" />
      {!sil && stripes && (
        <g clipPath={`url(#${uid}-${id})`}>
          <path d={stripes.normal} fill="none" stroke={stripeColor} strokeWidth={stripeW} strokeLinecap="butt" opacity={robe === 'black' ? 0.7 : 1} />
          <path d={stripes.fold} fill="none" stroke={stripeColor} strokeWidth={foldW} strokeLinecap="butt" opacity={robe === 'black' ? 0.9 : 1} />
          {extra}
        </g>
      )}
    </>
  );

  const hairNodes = (
    <g data-part="hair">
      {!front && <path d={HAIR_BACK} fill={INK} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />}
      {!sil && !front && (
        <g clipPath={`url(#${uid}-hair)`}>
          <path d={HAIR_LINES} fill="none" stroke={PAPER} strokeWidth={0.7} opacity={0.5} strokeLinecap="round" />
        </g>
      )}
      {front && (
        <>
          <path d={HAIR_FRONT_L} fill={INK} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
          <path d={HAIR_FRONT_R} fill={INK} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
          <path d={HAIR_CAP} fill={INK} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        </>
      )}
      <g fill="none" stroke={INK} strokeLinecap="round">
        {STRANDS.map((s, i) => (
          <path key={i} d={s.d} strokeWidth={s.w} />
        ))}
      </g>
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${FIGURE_VIEWBOX.w} ${FIGURE_VIEWBOX.h}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
      data-variant={variant}
      data-view={view}
    >
      <defs>
        <path id={`${uid}-robe-p`} d={ROBE} />
        <clipPath id={`${uid}-robe`}><use href={`#${uid}-robe-p`} /></clipPath>
        <path id={`${uid}-sl-p`} d={SLEEVE_L} />
        <clipPath id={`${uid}-sl`}><use href={`#${uid}-sl-p`} /></clipPath>
        <path id={`${uid}-sr-p`} d={SLEEVE_R} />
        <clipPath id={`${uid}-sr`}><use href={`#${uid}-sr-p`} /></clipPath>
        <path id={`${uid}-hem-p`} d={HEM_FILL} />
        <clipPath id={`${uid}-hem`}><use href={`#${uid}-hem-p`} /></clipPath>
        <path id={`${uid}-hair-p`} d={HAIR_BACK} />
        <clipPath id={`${uid}-hair`}><use href={`#${uid}-hair-p`} /></clipPath>
        <path id={`${uid}-face-p`} d={FACE} />
        <clipPath id={`${uid}-face`}><use href={`#${uid}-face-p`} /></clipPath>
      </defs>

      {front && (
        <g data-part="hair-back">
          <path d={HAIR_BACK} fill={INK} />
        </g>
      )}

      <g data-part="robe">
        {part('robe', ROBE, robeFan, !sil && <path d={CREASES} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />)}
        {sil && <path d={SILHOUETTE_FOLDS} fill="none" stroke={INK2} strokeWidth={1.6} strokeLinecap="round" />}
        {!sil && front && (
          <g data-part="collar">
            <path d="M176 174L204 330M218 174L188 330" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
            <path d="M176 174L204 330M218 174L188 330" fill="none" stroke={PAPER} strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />
          </g>
        )}
        {/* sash */}
        <g data-part="sash">
          <path
            d={closed([[114, 400], [196, 404], [282, 400], [284, 448], [196, 454], [116, 448]], 1 / 10)}
            fill={sil ? INK : INK}
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {!sil && <path d="M118 414H280M118 428H282M118 440H280" stroke={PAPER} strokeWidth={0.7} opacity={0.55} fill="none" />}
          {!front && (
            <g fill="none" stroke={INK} strokeLinecap="round">
              {TAILS.map((d, i) => (
                <path key={i} d={d} strokeWidth={i ? 10 : 12} />
              ))}
              <path d="M196 436c-26-26-44 8-14 14M196 436c26-26 44 8 14 14" strokeWidth={5} />
            </g>
          )}
        </g>
      </g>

      <g data-part="hem" data-pivot={`210 ${HEM_TOP}`}>
        {part('hem', HEM_FILL, hemFan, undefined, true)}
        {!sil && <path d={HEM_OUTLINE} fill="none" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round" />}
      </g>

      <g data-part="sleeve-l" data-pivot="130 200">
        {part('sl', SLEEVE_L, slLFan)}
      </g>
      <g data-part="sleeve-r" data-pivot="264 200">
        {part('sr', SLEEVE_R, slRFan)}
      </g>

      {front && !sil && (
        <g data-part="neck">
          <path d={NECK} fill={PAPER} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
          <path d="M182 158Q196 170 210 158V150H182Z" fill={INK} />
        </g>
      )}

      <g data-part="head">
        {front ? (
          <>
            <path d={FACE} fill={sil ? INK : PAPER} stroke={outline} strokeWidth={2.4} strokeLinejoin="round" />
            {!sil && (
              <>
                <g clipPath={`url(#${uid}-face)`}>
                  <path d={FACE_SHADE} fill="none" stroke={INK} strokeWidth={1} strokeLinecap="round" />
                </g>
                <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M175 104Q183 100 191 103M201 103Q209 100 217 104" strokeWidth={2.2} />
                  <path d="M197 114Q195 128 191 133Q196 137 201 133" strokeWidth={1.3} />
                  <path d="M187 149Q196 153 206 149" strokeWidth={1.8} />
                </g>
                <g data-part="eyes">
                  <path d="M176 114Q183 108 190 114Q183 119 176 114Z" fill={PAPER} stroke={INK} strokeWidth={1.3} />
                  <path d="M202 114Q209 108 216 114Q209 119 202 114Z" fill={PAPER} stroke={INK} strokeWidth={1.3} />
                  <circle cx={183} cy={113.5} r={3} fill={BLUE} />
                  <circle cx={209} cy={113.5} r={3} fill={BLUE} />
                  <circle cx={183} cy={113.5} r={1.2} fill={INK} />
                  <circle cx={209} cy={113.5} r={1.2} fill={INK} />
                </g>
              </>
            )}
          </>
        ) : (
          <path d={HEAD_BACK} fill={INK} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        )}
      </g>

      {hairNodes}
    </svg>
  );
}
