import { brand } from '../config/brand';
import styles from './Wordmark.module.css';

interface Props {
  size?: 'nav' | 'hero' | 'mega';
  className?: string;
  /** Wrap each letter in a span (for stagger animations). */
  split?: boolean;
  as?: 'span' | 'h1' | 'h2' | 'p';
  id?: string;
}

/** Wordmark: Bodoni caps first name, italic surname set as a separate word. */
export default function Wordmark({ size = 'nav', className = '', split = false, as = 'span', id }: Props) {
  const Tag = as;
  const [a, b, c] = brand.parts;
  const render = (s: string, part: string) =>
    split
      ? s.split('').map((ch, i) => (
          <span key={part + i} className={`${styles.char} wm-char`} aria-hidden="true">
            {ch}
          </span>
        ))
      : <span aria-hidden="true">{s}</span>;
  return (
    <Tag id={id} className={`${styles.wordmark} ${styles[size]} ${className}`} aria-label={brand.name}>
      {a && <span className={styles.a}>{render(a, 'a')}</span>}
      {b && <span className={styles.b}>{render(b, 'b')}</span>}
      {c && <span className={styles.c}>{render(c, 'c')}</span>}
    </Tag>
  );
}
