import { useLayoutEffect, useRef } from 'react';
import { gsap, MQ } from '../../lib/gsap';
import { chapterById } from '../../config/chapters';
import { sectionLines } from '../../config/portfolio';
import World from './World';
import { DESK, MOB, type Layout } from './layout';
import { createScene, initialState } from './rig';
import { buildTimeline } from './timeline';
import styles from './ChapterTransformation.module.css';

const chapter = chapterById('process');

export default function ChapterTransformation() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const frame = root.querySelector<HTMLElement>('[data-frame]')!;
      const worldOf = (L: Layout) => root.querySelector<HTMLElement>(`[data-world="${L.key}"]`)!;

      const build = (L: Layout) => {
        const pin = L.key === 'mob' ? chapter.pin.mobile : chapter.pin.desktop;
        const world = worldOf(L);
        const S = initialState(L);
        const scene = createScene(frame, world, L, S, 'pin');
        let active = false;
        let last = performance.now();

        const tl = buildTimeline(root, frame, world, L, scene, {
          trigger: root,
          start: 'top top',
          end: () => '+=' + window.innerHeight * pin,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            scene.measure();
            scene.render(performance.now() / 1000, 0);
          },
          onToggle: (self) => {
            active = self.isActive;
            last = performance.now();
            if (!active) scene.render(last / 1000, 0);
          },
        });
        // the scrub can still be catching up after the pin has released: keep the scene in step with the timeline
        tl.eventCallback('onUpdate', () => {
          if (!active) scene.render(performance.now() / 1000, 0);
        });

        // hold to pour: the stream thickens; once the garden lives, held drops fall on it (pointer only, never React state)
        const press = () => gsap.to(scene.H, { v: 1, duration: 0.5, overwrite: true });
        const release = () => gsap.to(scene.H, { v: 0, duration: 0.8, overwrite: true });
        root.addEventListener('pointerdown', press);
        root.addEventListener('pointerup', release);
        root.addEventListener('pointercancel', release);
        root.addEventListener('pointerleave', release);

        const tick = () => {
          if (!active) return;
          const now = performance.now();
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          scene.render(now / 1000, dt);
        };
        gsap.ticker.add(tick);
        scene.render(0, 0);

        return () => {
          gsap.ticker.remove(tick);
          root.removeEventListener('pointerdown', press);
          root.removeEventListener('pointerup', release);
          root.removeEventListener('pointercancel', release);
          root.removeEventListener('pointerleave', release);
          gsap.killTweensOf(scene.H);
          world.style.transform = '';
        };
      };

      mm.add(MQ.desktop, () => build(DESK));
      mm.add(MQ.mobile, () => build(MOB));
      mm.add(MQ.reduced, () => {
        // no pin, no scrub: the whole world rests in its composed state, in normal flow
        const subs = root.querySelectorAll<HTMLElement>('[data-sub]');
        const scenes = [DESK, MOB].map((L) => {
          const world = worldOf(L);
          const S = initialState(L);
          const scene = createScene(frame, world, L, S, 'flow');
          const tl = buildTimeline(root, frame, world, L, scene);
          tl.progress(1).pause();
          // the flask is still in the pour pose, the stream is running and the bowl is brimming
          world.dataset.flow = '1';
          gsap.set(world.querySelectorAll('[data-step]'), { opacity: 1, x: 0, y: 0 });
          // on the wide composition the flask is still pouring; on the phone the steps need that room, so the hand has withdrawn
          if (L.key === 'desk') Object.assign(S, { ax: 0, ay: 0, th: 96, flow: 0.6, g: 1, fill: 1 });
          world.querySelectorAll<SVGElement>('[data-bead]').forEach((b, i) => {
            if (i < 3) gsap.set(b, { y: (L.terraces[0].y - L.G - 24) * (0.22 + i * 0.26), opacity: 1 });
          });
          // the column is still falling in the composed frame
          gsap.set(world.querySelectorAll('[data-draw^="fall"]'), { strokeDashoffset: 0, opacity: 1 });
          scene.freeze();
          return { L, world, scene };
        });
        gsap.set(subs, { clipPath: 'none', yPercent: 0 });
        gsap.set(root.querySelector('[data-cap]'), { opacity: 1 });
        const paint = () =>
          scenes.forEach(({ world, scene }) => {
            if (world.offsetParent === null) return;
            scene.measure();
            scene.render(0, 0);
          });
        paint();
        window.addEventListener('resize', paint);
        return () => {
          window.removeEventListener('resize', paint);
          frame.style.height = '';
          scenes.forEach(({ world }) => (world.style.transform = ''));
        };
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id={chapter.id}
      ref={rootRef}
      className={`chapter ${styles.root}`}
      tabIndex={-1}
      aria-labelledby="process-title"
      data-cursor-label={'Hold\nto pour'}
    >
      <div className={styles.head}>
        <div className={styles.plate}>
          <span className="label">{chapter.numeral}</span>
          <h2 id="process-title" className={`display ${styles.title}`}>
            {chapter.label}
          </h2>
          <div className={styles.sub}>
            <span data-sub="a">How I work</span>
            <span data-sub="b">What grows from it</span>
          </div>
        </div>
        <p className={`caption ${styles.line}`} data-cap="">
          {sectionLines.process}
        </p>
      </div>

      <div className={`${styles.frame} raster`} data-frame="">
        <World L={DESK} />
        <World L={MOB} />
      </div>
    </section>
  );
}
