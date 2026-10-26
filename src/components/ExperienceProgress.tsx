import { useLayoutEffect, useRef } from 'react';
import { chapters } from '../config/chapters';
import { ScrollTrigger } from '../lib/gsap';
import { scrollToChapter, useActiveChapter } from '../lib/progressStore';
import styles from './ExperienceProgress.module.css';

/** Right-edge chapter rail with a scroll-scrubbed ink line. No React state per frame. */
export default function ExperienceProgress() {
  const active = useActiveChapter();
  const fillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (fillRef.current) fillRef.current.style.transform = `scaleY(${self.progress})`;
      },
    });
    return () => st.kill();
  }, []);

  return (
    <nav className={styles.rail} aria-label="Chapters">
      <span className={styles.track} aria-hidden="true">
        <span ref={fillRef} className={styles.fill} />
      </span>
      <ol className={styles.list}>
        {chapters.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`${styles.tick} ${c.id === active ? styles.active : ''}`}
              onClick={() => scrollToChapter(c.id)}
              aria-label={`Chapter ${c.numeral}: ${c.label}`}
              aria-current={c.id === active ? 'step' : undefined}
              data-cursor="hover"
            >
              <span className={styles.num} aria-hidden="true">
                {c.numeral} · {c.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
