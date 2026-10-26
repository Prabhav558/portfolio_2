import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, MQ } from '../../lib/gsap';
import { rasterReveal, iris, wipe } from '../../lib/transitions';
import { chapterById } from '../../config/chapters';
import { projects } from '../../config/portfolio';
import styles from './ChapterGallery.module.css';
import SceneHall from './SceneHall';
import Room from './Room';
import IndexList from './IndexList';

const chapter = chapterById('work');

type El = HTMLElement | SVGElement;
const num = (el: Element, k: string) => Number((el as El).dataset[k] ?? 0);

/** Timeline schedule (units on one master timeline): room entry starts, index start, end, entry length. */
const SCHED = {
  desktop: { r: [2.6, 7.0, 11.5], idx: 16, end: 20.2, enter: 1.25 },
  mobile: { r: [2.2, 6.0, 9.8], idx: 13.6, end: 17.4, enter: 1.1 },
};

const useCompact = () => {
  const [c, setC] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const on = () => setC(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return c;
};

export default function ChapterGallery() {
  const rootRef = useRef<HTMLElement>(null);
  const compact = useCompact();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = gsap.utils.selector(root);
    const all = (sel: string) => q(sel) as El[];

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      const build = (mobile: boolean) => {
        const S = mobile ? SCHED.mobile : SCHED.desktop;
        const k = mobile ? 0.7 : 1;
        const intro = all('[data-g="intro"]')[0];
        const rooms = all('[data-g="room"]');
        const idx = all('[data-g="index"]')[0];

        /* ---- initial states (explicit, so every later fromTo can skip immediateRender) ---- */
        gsap.set([...rooms, idx], { autoAlpha: 0 });
        gsap.set(all('[data-g="index"] [data-ir]'), { autoAlpha: 0, y: 28 });
        rooms.forEach((room) => {
          gsap.set(room.querySelectorAll('[data-r]'), { yPercent: 112 });
          gsap.set(room.querySelectorAll('[data-g="tabs"]'), { autoAlpha: 0, y: 14 });
        });
        gsap.set(rooms[0], { yPercent: 100 });

        // title lines rise once as the section scrolls in (final state is the drawn hall)
        gsap.fromTo(
          all('[data-ri]'),
          { yPercent: 112 },
          { yPercent: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: root, start: 'top 88%', once: true } },
        );

        const tl = gsap.timeline({
          defaults: { ease: 'none', immediateRender: false },
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: () => '+=' + window.innerHeight * (mobile ? chapter.pin.mobile : chapter.pin.desktop),
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        /* ---- intro: the hall, already drawn; a slow dolly while it is on stage ---- */
        const dolly: [string, number][] = [
          ['hall-floor', 0.08],
          ['hall-wall', 0.04],
          ['hall-door', 0.22],
          ['hall-far', 0.05],
          ['hall-mid', 0.08],
          ['hall-near', 0.12],
          ['hall-nearest', 0.17],
        ];
        dolly.forEach(([name, d]) =>
          all(`[data-g="${name}"]`).forEach((el) =>
            tl.fromTo(el, { scale: 1, svgOrigin: el.dataset.vp }, { scale: 1 + d * k, svgOrigin: el.dataset.vp, duration: S.r[0] + S.enter + 0.4 }, 0),
          ),
        );

        /* ---- rooms ---- */
        rooms.forEach((room, i) => {
          const t0 = S.r[i];
          const t1 = t0 + S.enter;
          const nextStart = i < 2 ? S.r[i + 1] : S.idx;
          const tEnd = nextStart + S.enter; // when the next scene fully covers this one
          const span = tEnd - t0;
          const prev = i === 0 ? intro : rooms[i - 1];

          tl.fromTo(room, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, t0);

          // the three signature entries
          if (i === 0) {
            tl.fromTo(room, { yPercent: 100 }, { yPercent: 0, duration: S.enter, ease: 'power3.inOut' }, t0);
            tl.fromTo(intro, { yPercent: 0 }, { yPercent: -12, duration: S.enter, ease: 'power3.inOut' }, t0);
          } else if (i === 1) {
            tl.add(rasterReveal(room, { from: 0, to: 1, duration: S.enter, ease: 'power1.inOut' }), t0);
          } else {
            tl.add(iris(room, { x: mobile ? 50 : 30, y: mobile ? 22 : 56, from: 0, to: 150, duration: S.enter * 1.15, ease: 'power2.inOut' }), t0);
          }
          tl.fromTo(prev, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01 }, t1 + (i === 2 ? 0.15 : 0));

          // parallax: every [data-px]/[data-py] layer drifts at its own rate while the room is on stage
          Array.from(room.querySelectorAll<El>('[data-px],[data-py]')).forEach((el) => {
            const px = num(el, 'px') * k;
            const py = num(el, 'py') * k;
            tl.fromTo(el, { x: px / 2, y: py / 2 }, { x: -px / 2, y: -py / 2, duration: span }, t0);
          });

          /** fromTo on a selector inside this room; skipped when the room has no such element. */
          const tw = (sel: string, from: gsap.TweenVars, to: gsap.TweenVars, pos: number) => {
            const els = Array.from(room.querySelectorAll<El>(sel));
            if (els.length) tl.fromTo(els, from, to, pos);
          };

          const art = room.querySelector<El>('[data-g="art"]');
          if (art) tl.fromTo(art, { scale: 1.1, transformOrigin: '40% 50%' }, { scale: 1, transformOrigin: '40% 50%', duration: S.enter * 2.2, ease: 'power2.out' }, t0);

          // info panel: slab slides in, blocks rise out of their masks
          const panel = room.querySelector<El>('[data-g="panel"]');
          if (panel) tl.fromTo(panel, mobile ? { y: 50 } : { x: 70 }, mobile ? { y: 0, duration: 1.3, ease: 'power3.out' } : { x: 0, duration: 1.3, ease: 'power3.out' }, t0 + 0.15);
          tw('[data-r]', { yPercent: 112 }, { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, t0 + 0.45);
          tw('[data-g="tabs"]', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, t0 + 1.3);

          /* per-illustration assembly */
          const segs = Array.from(room.querySelectorAll<El>('[data-e="seg"]'));
          segs.forEach((el, n) =>
            tl.fromTo(el, { x: num(el, 'dx'), y: num(el, 'dy'), autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, duration: 1.5, ease: 'power3.out' }, t0 + 0.1 + n * 0.05),
          );
          room.querySelectorAll<El>('[data-e="sweep"]').forEach((el) =>
            tl.fromTo(el, { rotation: -130, svgOrigin: '500 480' }, { rotation: 300, svgOrigin: '500 480', duration: span }, t0),
          );

          Array.from(room.querySelectorAll<El>('[data-e="stage"]')).forEach((el, n) =>
            tl.fromTo(el, { scale: 0.55, autoAlpha: 0, svgOrigin: el.dataset.o }, { scale: 1, autoAlpha: 1, svgOrigin: el.dataset.o, duration: 0.9, ease: 'back.out(1.5)' }, t0 + 0.3 + n * 0.28),
          );
          Array.from(room.querySelectorAll<El>('[data-e="link"]')).forEach((el, n) => {
            const axis = el.dataset.axis === 'y' ? 'scaleY' : 'scaleX';
            tl.fromTo(el, { [axis]: 0, svgOrigin: el.dataset.o }, { [axis]: 1, svgOrigin: el.dataset.o, duration: 0.7, ease: 'power2.out' }, t0 + 0.7 + n * 0.28);
          });
          tw('[data-e="arrow"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.out', stagger: 0.28 }, t0 + 1.0);
          tw('[data-e="label"]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.24 }, t0 + 0.8);
          tw('[data-e="logs"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power1.out' }, t0 + 0.2);

          room.querySelectorAll<El>('[data-e="routeclip"]').forEach((el) =>
            tl.fromTo(el, { scaleX: 0, svgOrigin: '0 0' }, { scaleX: 1, svgOrigin: '0 0', duration: mobile ? 1.8 : 2.4, ease: 'power1.inOut' }, t0 + 0.5),
          );
          tw('[data-e="fast"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power1.out' }, t0 + 0.3);
          tw('[data-e="mark"]', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.15 }, t0 + 1.1);
          tw('[data-e="pin"]', { y: -70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'bounce.out' }, t0 + (mobile ? 1.8 : 2.3));
        });

        /* ---- closing index ---- */
        tl.fromTo(idx, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, S.idx);
        tl.add(wipe(idx, 'right', { duration: S.enter, ease: 'power3.inOut' }), S.idx);
        tl.fromTo(rooms[2], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01 }, S.idx + S.enter);
        tl.fromTo(
          all('[data-g="index"] [data-ir]'),
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.16 },
          S.idx + 0.35,
        );

        // rest
        tl.set({}, {}, S.end);
      };

      mm.add(MQ.desktop, () => build(false));
      mm.add(MQ.mobile, () => build(true));
      mm.add(MQ.reduced, () => {
        // no pin, no scrub: CSS stacks intro, rooms and index as normal blocks in their final state
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
      aria-labelledby="work-title"
    >
      <div className={styles.intro} data-g="intro">
        <SceneHall />
      </div>
      {projects.map((p, i) => (
        <Room key={p.slug} project={p} index={i} total={projects.length} compact={compact} edge={i === 0} raster={i === 1} />
      ))}
      <IndexList />
    </section>
  );
}
