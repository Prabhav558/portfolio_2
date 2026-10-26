import styles from './ChapterGallery.module.css';
import { projects } from '../../config/portfolio';

const pad = (n: number) => String(n).padStart(2, '0');

/** Closing ledger: every project on one page for skimmers. */
export default function IndexList() {
  return (
    <div className={`${styles.index} ${styles.edge}`} data-g="index" aria-labelledby="work-index-title">
      <div className={styles.idxInner}>
        <header className={styles.idxHead} data-ir>
          <h3 id="work-index-title" className={`display ${styles.idxTitle}`}>
            All <em>projects</em>
          </h3>
          <span className={`label ${styles.idxCount}`}>{pad(projects.length)}</span>
        </header>
        <ol className={styles.idxList}>
          {projects.map((p, i) => (
            <li className={styles.idxRow} key={p.slug} data-ir>
              <span className={styles.idxNo}>{pad(i + 1)}</span>
              <div className={styles.idxMain}>
                <h4 className={`display ${styles.idxName}`}>{p.title}</h4>
                <p className={`label ${styles.idxKicker}`}>{p.kicker}</p>
              </div>
              <p className={styles.idxSum}>{p.result}</p>
              <ul className={styles.idxStack} aria-label={`${p.title} stack`}>
                {p.stack.slice(0, 5).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <a className={styles.idxLink} href={`#/work/${p.slug}`} data-cursor="hover">
                Case study <span aria-hidden="true">&rarr;</span>
                <span className="sr-only"> for {p.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
