import { useEffect, useRef, useState } from 'react';
import { chapters, type ChapterId } from '../config/chapters';
import { brand } from '../config/brand';
import { person } from '../config/portfolio';
import { isCalm, setCalm } from '../lib/calm';
import { scrollToChapter, useActiveChapter } from '../lib/progressStore';
import Wordmark from './Wordmark';
import styles from './Navigation.module.css';

export default function Navigation() {
  const active = useActiveChapter();
  const current = chapters.find((c) => c.id === active)!;
  const [open, setOpen] = useState(false);
  const calm = isCalm();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (id: ChapterId) => {
    setOpen(false);
    // On a case-study route the chapters aren't mounted: route back via the hash.
    if (location.hash.startsWith('#/')) location.hash = id;
    else scrollToChapter(id);
  };

  return (
    <header className={styles.nav}>
      <button
        type="button"
        className={styles.brand}
        onClick={() => go('home')}
        data-cursor="hover"
        aria-label={`${brand.name}: return to beginning`}
      >
        <Wordmark size="nav" />
      </button>

      <div className={styles.tab}>
        <span className={styles.chapter} aria-live="polite">
          <span className={styles.numeral}>{current.numeral}</span>
          <span className={styles.chapterLabel}>{current.label}</span>
        </span>
        <span className={styles.pill} aria-hidden="true" />
        <a
          className={styles.resume}
          href={person.resumeUrl}
          download
          data-cursor="hover"
        >
          Résumé
        </a>
        <button
          type="button"
          className={`${styles.calm} ${calm ? styles.calmOn : ''}`}
          aria-pressed={calm}
          onClick={() => setCalm(!calm)}
          title="Calm mode: skip the scroll animations"
          data-cursor="hover"
        >
          Calm
        </button>
        <button
          ref={toggleRef}
          type="button"
          className={styles.menuBtn}
          aria-expanded={open}
          aria-controls="chapter-menu"
          onClick={() => setOpen((o) => !o)}
          data-cursor="hover"
        >
          {open ? 'Close' : 'Index'}
        </button>
      </div>

      <div
        id="chapter-menu"
        ref={menuRef}
        className={`${styles.menu} ${open ? styles.menuOpen : ''}`}
        hidden={!open}
      >
        <p className={`label ${styles.menuKicker}`}>Contents</p>
        <ol className={styles.list}>
          {chapters.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`${styles.item} ${c.id === active ? styles.itemActive : ''}`}
                onClick={() => go(c.id)}
                data-cursor="hover"
                aria-current={c.id === active ? 'step' : undefined}
              >
                <span className="label">{c.numeral}</span>
                <span className={styles.itemTitle}>{c.nav ?? c.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className={`label ${styles.menuFoot}`}>{brand.edition}</p>
      </div>
    </header>
  );
}
