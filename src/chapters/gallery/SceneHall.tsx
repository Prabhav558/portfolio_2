import { useMemo } from 'react';
import styles from './ChapterGallery.module.css';
import { BLACK, PAPER, RED, RED_DEEP, buildHall, type HallArt, type HallCfg } from './art';
import { chapterById } from '../../config/chapters';
import { projects, sectionLines } from '../../config/portfolio';

const chapter = chapterById('work');

const DESKTOP: HallCfg = {
  w: 1600,
  h: 900,
  vx: 800,
  vy: 470,
  drop: 330,
  capUp: 300,
  tile: 520,
  rows: [
    { x: 520, w: 150, zs: [1, 1.6, 2.5, 3.9, 6, 9] },
    { x: 1100, w: 170, zs: [1.35, 2.1, 3.3] },
  ],
  doorZ: 13,
  doorW: 420,
  doorH: 760,
  wallHW: 300,
  wallTop: 70,
  seed: 3031,
};

const MOBILE: HallCfg = {
  w: 700,
  h: 1500,
  vx: 350,
  vy: 690,
  drop: 560,
  capUp: 760,
  tile: 330,
  rows: [
    { x: 330, w: 130, zs: [1, 1.7, 2.9, 5, 8.5] },
    { x: 520, w: 150, zs: [1.3] },
  ],
  doorZ: 9.5,
  doorW: 520,
  doorH: 900,
  wallHW: 170,
  wallTop: 230,
  seed: 7717,
};

function HallSvg({ art, cfg, className }: { art: HallArt; cfg: HallCfg; className: string }) {
  const { vp, doorBase, door } = art;
  const ks = art.door.keeperScale;
  return (
    <svg
      className={`${styles.art} ${className}`}
      viewBox={`0 0 ${cfg.w} ${cfg.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width={cfg.w} height={cfg.h} fill={BLACK} />

      {/* floor */}
      <g data-g="hall-floor" data-vp={vp}>
        <path d={`M-40 ${art.floorTop}H${cfg.w + 40}V${cfg.h + 60}H-40Z`} fill={RED_DEEP} />
        <path d={art.cells} fill={BLACK} />
        <path d={art.lines} fill="none" stroke={PAPER} strokeOpacity="0.28" strokeWidth="0.9" />
        <path d={art.bands} fill={BLACK} />
        <path d={art.rays} fill={PAPER} fillOpacity="0.9" />
      </g>

      {/* back wall */}
      <g data-g="hall-wall" data-vp={vp}>
        <rect x={art.wall.x} y={art.wall.y} width={art.wall.w} height={art.wall.h} fill={RED} />
        <path d={art.wall.hatch} fill={BLACK} />
        <path d={art.motes} fill={PAPER} fillOpacity="0.8" />
      </g>

      {/* focal doorway */}
      <g data-g="hall-door" data-vp={doorBase}>
        <path d={door.ticks} stroke={PAPER} strokeWidth="1.1" strokeOpacity="0.8" fill="none" />
        <path d={door.frame} fill={BLACK} />
        <path d={door.open} fill={PAPER} />
        <g transform={`translate(${cfg.vx} ${art.doorFloor}) scale(${ks})`} fill={BLACK}>
          <path d="M-6.5 0C-5 -14 -3.6 -26 -3 -35L3 -35C3.6 -26 5 -14 6.5 0Z" />
          <path d="M-3.4 -52C-6 -46 -6.8 -38 -5.2 -30L5.2 -30C6.8 -38 6 -46 3.4 -52Z" />
          <ellipse cx="0" cy="-36" rx="4.7" ry="2" />
          <circle cx="0" cy="-49.5" r="3.3" />
        </g>
      </g>

      {/* colonnade, far to near */}
      {art.tiers.map((t) => (
        <g key={t.key} data-g={`hall-${t.key}`} data-vp={vp}>
          <path d={t.shadow} fill={BLACK} />
          <path d={t.fill} fill={RED} />
          <path d={t.hatch} fill={BLACK} />
          <path d={t.line} fill="none" stroke={BLACK} strokeWidth={t.sw} strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}

/** Section opener: the burgundy hall, fully drawn, with the section title laid over it. */
export default function SceneHall() {
  const desk = useMemo(() => buildHall(DESKTOP), []);
  const mob = useMemo(() => buildHall(MOBILE), []);
  const words = chapter.label.split(' ');
  const count = String(projects.length).padStart(2, '0');
  return (
    <>
      <HallSvg art={desk} cfg={DESKTOP} className={styles.desk} />
      <HallSvg art={mob} cfg={MOBILE} className={styles.mob} />

      <div className={styles.introFolio}>
        <span className={`label ${styles.introNo}`}>{chapter.numeral}</span>
        <span className="label">{chapter.nav ?? chapter.label}</span>
      </div>

      <div className={styles.introCount} data-ri-wrap>
        <span className={styles.mask}>
          <span className={styles.countNo} data-ri>
            {count}
          </span>
        </span>
        <span className={`label ${styles.countLbl}`}>projects</span>
      </div>

      <div className={styles.introBlock}>
        <h2 id="work-title" className={`display ${styles.introTitle}`}>
          {words.map((w, i) => (
            <span className={styles.mask} key={w}>
              <span className={i === 0 ? styles.introWord : `${styles.introWord} ${styles.introItalic}`} data-ri>
                {w}
              </span>
            </span>
          ))}
        </h2>
        <p className={`caption ${styles.introCap}`}>{sectionLines.work}</p>
      </div>
    </>
  );
}
