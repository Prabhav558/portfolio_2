import type { ReactNode } from 'react';
import styles from './ChapterGallery.module.css';
import type { Project } from '../../config/portfolio';
import ShieldArt from './ShieldArt';
import PipelineArt from './PipelineArt';
import RouteArt from './RouteArt';

const pad = (n: number) => String(n).padStart(2, '0');

const TONE = { shield: styles.tShield, pipeline: styles.tPipe, route: styles.tRoute } as const;

/** One line-mask: the inner block rises out of an overflow-hidden slot. */
const Mask = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`${styles.mask} ${className}`}>
    <div data-r>{children}</div>
  </div>
);

interface RoomProps {
  project: Project;
  index: number;
  total: number;
  compact: boolean;
  /** Which edge treatment the entering transition needs (hairline on slide / wipe). */
  edge?: boolean;
  raster?: boolean;
}

export default function Room({ project: p, index, total, compact, edge, raster }: RoomProps) {
  const titleId = `work-room-${p.slug}`;
  const Art = p.art === 'shield' ? ShieldArt : p.art === 'pipeline' ? PipelineArt : RouteArt;
  return (
    <article
      className={`${styles.room} ${TONE[p.art]} ${edge ? styles.edge : ''} ${raster ? 'raster' : ''}`}
      data-g="room"
      aria-labelledby={titleId}
    >
      <div className={styles.rbg} aria-hidden="true" />
      <span className={styles.rnum} data-px="90" aria-hidden="true">
        {pad(index + 1)}
      </span>

      <div className={styles.rart} data-g="art" data-cursor-label={'Look\nclosely'}>
        <Art compact={compact} />
      </div>

      <div className={styles.panel} data-g="panel">
        <div className={styles.pTop}>
          <Mask>
            <span className={`label ${styles.pIndex}`}>
              {pad(index + 1)}
              <span className={styles.pSlash}>/</span>
              {pad(total)}
            </span>
          </Mask>
          <Mask>
            <span className={`label ${styles.pPeriod}`}>{p.period}</span>
          </Mask>
        </div>

        <Mask className={styles.titleMask}>
          <h3 id={titleId} className={`display ${styles.pTitle}`}>
            {p.title}
          </h3>
        </Mask>
        <Mask>
          <p className={`label ${styles.pKicker}`}>{p.kicker}</p>
        </Mask>
        <Mask>
          <p className={styles.pRole}>{p.role}</p>
        </Mask>
        <Mask>
          <ul className={styles.chips} aria-label="Stack">
            {p.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Mask>
        <Mask>
          <p className={styles.pSummary}>{p.summary}</p>
        </Mask>
        <Mask>
          <p className={styles.pResult}>{p.result}</p>
        </Mask>
        <ul className={styles.hls}>
          {p.highlights.slice(0, 3).map((h) => (
            <li key={h}>
              <Mask>{h}</Mask>
            </li>
          ))}
        </ul>

        <div className={styles.tabs} data-g="tabs">
          <a className={`${styles.tab} ${styles.tabMain}`} href={`#/work/${p.slug}`} data-cursor="hover">
            Case study <span aria-hidden="true">&rarr;</span>
            <span className="sr-only"> for {p.title}</span>
          </a>
          <a className={`${styles.tab} ${styles.tabAlt}`} href={p.links.code} target="_blank" rel="noopener noreferrer" data-cursor="hover">
            Code <span aria-hidden="true">&#8599;</span>
            <span className="sr-only"> for {p.title} (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </article>
  );
}
