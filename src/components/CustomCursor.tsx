import { useEffect, useRef, useState } from 'react';
import styles from './CustomCursor.module.css';

/**
 * Circular ink cursor. Desktop fine pointers only; never intercepts clicks.
 * Contract (see CONTRACT.md): any element can opt in with
 *   data-cursor="hover"           -> enlarged ring
 *   data-cursor-label="Hold"      -> circle with a short label
 * The nearest ancestor carrying either attribute wins. Links and buttons get
 * the hover state automatically.
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current!;
    const label = labelRef.current!;
    const html = document.documentElement;
    html.classList.add('has-cursor');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let raf = 0;
    let visible = false;

    const tick = () => {
      const k = reduced ? 1 : 0.28;
      x += (tx - x) * k;
      y += (ty - y) * k;
      root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        x = tx;
        y = ty;
        root.classList.add(styles.visible);
      }
      kick();
    };

    let lastText = '';
    const setMode = (target: Element | null) => {
      const el = target?.closest<HTMLElement>('[data-cursor-label],[data-cursor],a,button,[role="button"]');
      const text = el?.dataset.cursorLabel ?? '';
      root.classList.toggle(styles.label, !!text);
      root.classList.toggle(styles.hover, !!el && !text);
      if (text !== lastText) {
        label.textContent = text;
        lastText = text;
      }
    };
    const onOver = (e: PointerEvent) => setMode(e.target as Element);
    // Labels can change while the pointer is still (scroll moves content under it)
    const onScroll = () => {
      if (!visible) return;
      setMode(document.elementFromPoint(tx, ty));
    };
    const onDown = () => root.classList.add(styles.pressed);
    const onUp = () => root.classList.remove(styles.pressed);
    const onLeave = () => {
      visible = false;
      root.classList.remove(styles.visible);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      html.classList.remove('has-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('scroll', onScroll);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div ref={rootRef} className={styles.cursor} aria-hidden="true">
      <span className={styles.ring}>
        <span ref={labelRef} className={styles.text} />
      </span>
    </div>
  );
}
