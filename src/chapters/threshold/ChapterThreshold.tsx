import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { gsap, MQ } from '../../lib/gsap';
import { rasterReveal } from '../../lib/transitions';
import { chapterById } from '../../config/chapters';
import { person, sectionLines } from '../../config/portfolio';
import styles from './ChapterThreshold.module.css';
import Facade from './Facade';
import Gate from './Gate';
import RedField from './RedField';
import { DESKTOP, MOBILE } from './layout';

const chapter = chapterById('about');

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia('(max-width: 768px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const useMobile = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(max-width: 768px)').matches,
    () => false,
  );

export default function ChapterThreshold() {
  const rootRef = useRef<HTMLElement>(null);
  const mobile = useMobile();
  const L = mobile ? MOBILE : DESKTOP;
  const portrait = person.portrait;
  const [lead, ...rest] = person.bio;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = gsap.utils.selector(root);
    const all = (n: string) => q(`[data-t="${n}"]`);
    const one = (n: string) => all(n)[0] as HTMLElement | undefined;

    /** where the gate centre lands in the viewport, and the scale of the red disk that covers the screen */
    const camera = () => {
      const vw = root.clientWidth;
      const vh = root.clientHeight;
      const f = Math.max(vw / L.W, vh / L.H);
      const ox = (vw - L.W * f) / 2 + L.cx * f;
      const oy = (vh - L.H * f) / 2 + L.cy * f;
      const far = Math.max(Math.hypot(ox, oy), Math.hypot(vw - ox, oy), Math.hypot(ox, vh - oy), Math.hypot(vw - ox, vh - oy));
      return { vw, vh, f, ox, oy, origin: `${ox}px ${oy}px`, S: (far / ((L.r - 2) * f)) * 1.08 };
    };

    /**
     * The plate at rest while the About panel reads: desktop pushes the gate into the left ~55%,
     * mobile lifts it above the panel (below the nav, with the inscription band still showing).
     */
    const hold = () => {
      const c = camera();
      if (!mobile) return { x: c.vw * 0.3 - c.ox, y: 0, s: 0.74, origin: c.origin };
      const navClear = 56 + 26;
      const panelTop = c.vh * 0.4;
      const d = (L.cy - (L.band.y0 + L.band.y1) / 2) * c.f; // gate centre to inscription band, in px
      const s = Math.min(0.8, Math.max(0.5, (panelTop - navClear - 10) / (d + L.R * c.f)));
      const ty = navClear + d * s;
      return { x: c.vw / 2 - c.ox, y: ty - c.oy, s, origin: c.origin };
    };

    /** publish the hold pose as CSS variables so reduced / calm CSS can show it without JS tweens */
    const publish = () => {
      const h = hold();
      const c = camera();
      root.style.setProperty('--hx', `${h.x}px`);
      root.style.setProperty('--hy', `${h.y}px`);
      root.style.setProperty('--hs', `${h.s}`);
      root.style.setProperty('--ox', `${c.ox}px`);
      root.style.setProperty('--oy', `${c.oy}px`);
    };
    publish();
    window.addEventListener('resize', publish);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      /** hair and hem breathe on their own, independent of scroll */
      const ambient = () => {
        const fig = one('figure');
        if (!fig) return;
        const hair = fig.querySelector('[data-part="hair"]');
        const hem = fig.querySelector('[data-part="hem"]');
        if (hair) gsap.to(hair, { rotation: 2.4, transformOrigin: '50% 0%', duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        if (hem) gsap.to(hem, { skewX: 3.2, transformOrigin: '50% 0%', duration: 2.3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      };

      const build = () => {
        const pin = mobile ? chapter.pin.mobile : chapter.pin.desktop;
        const world = one('world')!;
        const dolly = one('dolly')!;
        const facade = one('facade')!;
        const red = one('red')!;
        const disk = one('disk')!;
        const spin = one('disk-spin');
        const fig = one('figure');
        const figIn = one('figure-in');
        const cap = one('caption')!;
        const folio = one('folio')!;
        const panel = one('panel')!;
        const items = all('item');
        const slide = mobile ? { y: () => panel.offsetHeight + 24 } : { x: () => panel.offsetWidth + 24 };
        const slideEnd = mobile ? { y: 0 } : { x: 0 };

        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: () => '+=' + window.innerHeight * pin,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        /* 1. the plate is already standing; it prints in fully while the moon rises into the gate */
        tl.add(rasterReveal(facade, { from: 0.62, to: 1, duration: 1.6, ease: 'power1.inOut', stripe: mobile ? 6 : 8 }), 0);
        tl.fromTo(disk, { scale: 0.08, y: L.r * 0.5 }, { scale: 1, y: 0, duration: 1.6, ease: 'power2.out' }, 0.1);
        if (spin) tl.fromTo(spin, { rotation: 7 }, { rotation: -9, duration: 9.4, ease: 'none' }, 0.1);
        if (fig) tl.fromTo(fig, { opacity: 0, y: 36 }, { opacity: 1, y: -6, duration: 1.3 }, 0.8);

        /* 2. the plate steps back, the About panel slides in and its lines set */
        tl.fromTo(
          world,
          { x: 0, y: 0, scale: 1, transformOrigin: () => camera().origin },
          { x: () => hold().x, y: () => hold().y, scale: () => hold().s, transformOrigin: () => camera().origin, duration: 1.4, ease: 'power3.inOut' },
          1.8,
        );
        tl.fromTo(panel, { ...slide, opacity: 1 }, { ...slideEnd, opacity: 1, duration: 1.2, ease: 'power3.out' }, 2.0);
        tl.fromTo(items, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.09 }, 2.5);
        tl.fromTo(cap, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, 3.0);

        /* hold (3.5 → 7.0): the composition rests and the text stays fully readable */

        /* 3. panel and caption leave; the plate returns, then the camera dollies into the gate */
        tl.to(cap, { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' }, 6.9);
        tl.to(folio, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 6.9);
        tl.fromTo(panel, { ...slideEnd, opacity: 1 }, { ...slide, opacity: 1, duration: 0.8, ease: 'power2.in', immediateRender: false }, 7.0);
        tl.fromTo(
          world,
          { x: () => hold().x, y: () => hold().y, scale: () => hold().s, transformOrigin: () => camera().origin },
          { x: 0, y: 0, scale: 1, transformOrigin: () => camera().origin, duration: 1.0, ease: 'power2.inOut', immediateRender: false },
          7.1,
        );
        tl.fromTo(dolly, { scale: 1, transformOrigin: () => camera().origin }, { scale: () => camera().S, transformOrigin: () => camera().origin, duration: 2.0, ease: 'power2.inOut' }, 7.8);
        if (figIn) tl.fromTo(figIn, { scale: 1, y: 0 }, { scale: 0.42, y: -L.r * 0.5, duration: 1.8, ease: 'power2.in' }, 7.9);
        if (fig) tl.to(fig, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 8.9);

        /* 4. the burgundy field takes over and stays: the work hall opens on the same colour */
        tl.fromTo(red, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none' }, 9.3);
        tl.fromTo(world, { opacity: 1 }, { opacity: 0, duration: 0.01, ease: 'none' }, 9.85);
        tl.to({}, { duration: 0.3 }, 10.0);
        return tl;
      };

      const setup = () => {
        gsap.set(one('red')!, { opacity: 0 });
        gsap.set(one('caption')!, { opacity: 0 });
        build();
        ambient();
      };
      mm.add(MQ.desktop, setup);
      mm.add(MQ.mobile, setup);
      mm.add(MQ.reduced, () => {
        // the composed hold state is the default state (CSS vars from publish()): nothing to do
      });
    }, rootRef);

    return () => {
      window.removeEventListener('resize', publish);
      ctx.revert();
    };
  }, [L, mobile]);

  return (
    <section
      id={chapter.id}
      ref={rootRef}
      className={`chapter ${styles.root}`}
      tabIndex={-1}
      aria-labelledby="about-title"
    >
      <div
        className={styles.world}
        data-t="world"
        data-cursor-label={'Step\nthrough'}
        role="img"
        aria-label={
          portrait
            ? `Engraved illustration, perfectly symmetrical: a paper-white facade of black hatched panels between two columns, a stair rising to a great circular gate. Inside the gate, a burgundy woodcut moon frames a portrait of ${person.name}.`
            : 'Engraved illustration, perfectly symmetrical: a paper-white facade of black hatched panels between two columns, a stair rising to a great circular gate. Inside the gate burns a burgundy moon, and a long-haired figure stands in it, seen from behind, hair blowing.'
        }
      >
        <div className={styles.layer} data-t="dolly">
          <div className={`${styles.layer} raster`} data-t="facade">
            <Facade L={L} />
          </div>
          <div className={styles.layer}>
            <Gate L={L} portrait={portrait} />
          </div>
        </div>
      </div>

      <div className={`${styles.layer} ${styles.red} raster`} data-t="red">
        <RedField />
      </div>

      <div className={styles.panel} data-t="panel">
        <div className={styles.head} data-t="item">
          <h2 id="about-title" className={`display ${styles.heading}`}>
            About
          </h2>
          <p className={`label ${styles.role}`}>{person.role}</p>
        </div>
        <p className={`${styles.bio} ${styles.lead}`} data-t="item">
          {lead}
        </p>
        {rest.map((para) => (
          <p key={para} className={styles.bio} data-t="item">
            {para}
          </p>
        ))}
        <dl className={styles.meta} data-t="item">
          <dt>Based</dt>
          <dd>{person.location}</dd>
          <dt>Status</dt>
          <dd>{person.availability}</dd>
        </dl>
        <ul className={styles.stats} data-t="item" aria-label="In figures">
          {person.stats.map((s) => (
            <li key={s.label} className={styles.stat}>
              <span className={styles.num}>{s.value}</span>
              <span className={styles.bar} aria-hidden="true" />
              <span className={styles.statLabel}>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={`label ${styles.folio}`} data-t="folio">
        {chapter.numeral} — {chapter.label}
      </p>
      <p className={`caption ${styles.caption}`} data-t="caption">
        {sectionLines.about}
      </p>
    </section>
  );
}
