import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { gsap, MQ } from '../../lib/gsap';
import { rasterReveal } from '../../lib/transitions';
import { chapterById } from '../../config/chapters';
import { person, sectionLines } from '../../config/portfolio';
import { scrollToChapter } from '../../lib/progressStore';
import Wordmark from '../../components/Wordmark';
import { Hand, Woodgrain, HAND_REACH_TIP, HAND_VIEWBOX, HAND_PIVOTS } from '../../art';
import { BLOOMS, BloomShape, INSET_BLOOM } from './blooms';
import { attachHandFollow } from './handFollow';
import styles from './OpeningSequence.module.css';

const chapter = chapterById('home');
const VB = HAND_VIEWBOX.reach;

/** Untransformed fingertip position inside the hand box (for the follow rig). */
const tipPos = {
  left: `${(((HAND_REACH_TIP.x - VB.x) / VB.w) * 100).toFixed(2)}%`,
  top: `${(((HAND_REACH_TIP.y - VB.y) / VB.h) * 100).toFixed(2)}%`,
} as CSSProperties;

/** Indicator sits this many viewBox units in front of the fingertip (percent of the hand box). */
const GAP = 96;
const indicatorPos = {
  '--ix': `${(((HAND_REACH_TIP.x - GAP - VB.x) / VB.w) * 100).toFixed(2)}%`,
  '--iy': `${(((HAND_REACH_TIP.y - VB.y) / VB.h) * 100).toFixed(2)}%`,
} as CSSProperties;

const SCENE =
  'A burgundy woodcut tabletop. An engraved hand reaches in from the right toward a small round mark, and dark ink blooms across the grain ahead of its finger.';

/**
 * The shared hand's sleeve ends just past its viewBox. When the hand follows the
 * cursor leftwards that end would show, so continue the black sleeve along the
 * arm's axis far off-screen (drawn under the hand, same user space).
 */
function SleeveExtension() {
  return (
    <svg
      className={styles.sleeveExt}
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      width="100%"
      height="100%"
      focusable="false"
    >
      <path d="M985 411 L2560 880 L2560 1360 L985 611 Z" fill="#050505" />
      <path d="M1000 470 L2560 1000 M1000 545 L2560 1170" stroke="#E8DCC6" strokeWidth={1.4} opacity={0.55} fill="none" />
    </svg>
  );
}

export default function OpeningSequence() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
    const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      /** Plays once on mount: surface -> hand -> wordmark -> tagline -> caption -> scroll cue. */
      const intro = () => {
        const chars = $$('.wm-char');
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.add(rasterReveal('[data-bg]', { duration: 0.7, stripe: 6, ease: 'none' }), 0);
        tl.fromTo('[data-bgpar]', { scale: 1.14 }, { scale: 1.06, duration: 2.2, ease: 'power2.out' }, 0);
        tl.fromTo(
          '[data-handintro]',
          { clipPath: 'inset(0% 0% 0% 100%)', x: () => window.innerWidth * 0.1 },
          { clipPath: 'inset(-12% -12% -12% -40%)', x: 0, duration: 1.1, ease: 'power3.inOut' },
          0.4,
        );
        tl.fromTo('[data-bf]', { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.09, ease: 'none' }, 1.0);
        tl.fromTo('[data-indicator]', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }, 1.15);
        tl.fromTo('[data-kicker]', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 0.95);
        tl.fromTo(chars, { yPercent: 118 }, { yPercent: 0, duration: 0.8, stagger: 0.045, ease: 'power4.out' }, 1.0);
        tl.add(rasterReveal('[data-tagline]', { duration: 0.6, stripe: 4, ease: 'none' }), 1.5);
        tl.fromTo('[data-actions]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, 1.85);
        tl.fromTo('[data-capin]', { xPercent: -108 }, { xPercent: 0, duration: 0.6, ease: 'power3.out' }, 1.7);
        tl.fromTo('[data-cuein]', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 }, 2.05);
        // once revealed, unclip so the hand can swing freely after the cursor
        tl.set('[data-handintro]', { clipPath: 'none' }, 1.5);
        return tl;
      };

      /** Looping life: the indicator breathes, the cue line pulses. */
      const idle = () => {
        gsap.to('[data-breathe]', { scale: 1.1, duration: 1.4, ease: 'sine.inOut', repeat: -1, yoyo: true });
        gsap.fromTo(
          '[data-cueline]',
          { scaleY: 0.35 },
          { scaleY: 1, duration: 1.1, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 2.3, transformOrigin: '50% 0%' },
        );
      };

      /** Pinned scroll timeline. */
      const scroll = (mobile: boolean) => {
        const pin = mobile ? chapter.pin.mobile : chapter.pin.desktop;
        const tl = gsap.timeline({
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

        // the hand pushes toward the indicator; the index finger leans in
        tl.fromTo('[data-handscroll]', { xPercent: 0, rotation: 0 }, { xPercent: -8.5, rotation: -1.6, duration: 6, ease: 'power2.out' }, 0);
        const ip = HAND_PIVOTS.reach.index;
        const indexEl = $('[data-part="index"]');
        tl.fromTo(indexEl, { rotation: 0, svgOrigin: `${ip.x} ${ip.y}` }, { rotation: -3.5, svgOrigin: `${ip.x} ${ip.y}`, duration: 5, ease: 'power1.inOut' }, 0.6);

        // woodgrain drifts slower than the hand (depth)
        tl.fromTo('[data-bgscroll]', { x: 0 }, { x: mobile ? -18 : -34, duration: 10, ease: 'none' }, 0);

        // ink blooms grow on the grain, drips follow
        const blooms = $$('[data-bs]');
        blooms.forEach((el, i) => {
          const o = el.dataset.o!;
          const at = 0.3 + i * 0.75;
          tl.fromTo(el, { scale: 0.18, svgOrigin: o }, { scale: 1, svgOrigin: o, duration: 2.1, ease: 'back.out(1.25)' }, at);
          Array.from(el.querySelectorAll<SVGElement>('[data-drip]')).forEach((d) => {
            const dO = d.dataset.o!;
            tl.fromTo(d, { scaleY: 0.05, svgOrigin: dO }, { scaleY: 1, svgOrigin: dO, duration: 1.8, ease: 'power2.in' }, at + 1.0);
          });
        });

        // detail panel slides in from the left edge
        if (!mobile) {
          tl.fromTo('[data-inset]', { xPercent: -150 }, { xPercent: 0, duration: 1.6, ease: 'power3.out' }, 3.2);
          tl.fromTo('[data-insetbloom]', { scale: 0.2, svgOrigin: '200 144' }, { scale: 1, svgOrigin: '200 144', duration: 1.8, ease: 'back.out(1.3)' }, 3.9);
        }

        // wordmark block drifts up/out faster than the background; caption + cue leave.
        // autoAlpha also hides the buttons from clicks and tab order once they are gone.
        tl.fromTo('[data-copy]', { y: 0 }, { y: mobile ? -60 : -80, duration: 5.2, ease: 'none' }, 0.8);
        tl.fromTo('[data-copy]', { autoAlpha: 1 }, { autoAlpha: 0, duration: 1.6, ease: 'power1.in' }, 3.0);
        tl.fromTo('[data-capwrap]', { xPercent: 0 }, { xPercent: -108, duration: 1.1, ease: 'power2.in' }, 5.6);
        tl.fromTo('[data-cue]', { opacity: 1 }, { opacity: 0, duration: 1.2 }, 0);

        // the composition rests, then one short smear into stripes hands off to About's cream paper
        tl.to({}, { duration: 0.9 }, 7.3);
        tl.fromTo('[data-cream]', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'none' }, 8.2);
        tl.add(rasterReveal('[data-frame]', { from: 1, to: 0, duration: 1.4, ease: 'none' }), 8.2);
      };

      /** The hand follows the cursor; press and drag to ink the grain (desktop, fine pointer only). */
      const pointer = () => {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        const follow = $('[data-handmouse]');
        gsap.set(follow, { transformOrigin: '100% 62%' });
        return attachHandFollow({
          root,
          follow,
          tipMark: $('[data-tipmark]'),
          shoulderMark: $('[data-shouldermark]'),
          ink: $<SVGSVGElement>('[data-ink]'),
        });
      };

      mm.add(MQ.desktop, () => {
        intro();
        idle();
        scroll(false);
        return pointer();
      });
      mm.add(MQ.mobile, () => {
        intro();
        idle();
        scroll(true);
      });
      mm.add(MQ.reduced, () => {
        /* CSS default is the composed final state; no pin, no motion */
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id={chapter.id}
      className={`chapter ${styles.root}`}
      tabIndex={-1}
      aria-labelledby="arrival-title"
      aria-describedby="arrival-line"
      data-cursor-label={'Hold\nto ink'}
    >
      <p className="sr-only">{SCENE}</p>

      <div className={styles.cream} data-cream="" aria-hidden="true" />

      <div className={`raster ${styles.frame}`} data-frame="">
        <div className={`layer raster ${styles.bg}`} data-bg="" aria-hidden="true">
          <div className={styles.bgScroll} data-bgscroll="">
            <div className={styles.bgPar} data-bgpar="">
              <Woodgrain tone="deep" seed={7} />
            </div>
          </div>
        </div>

        <svg className={styles.ink} data-ink="" aria-hidden="true" focusable="false" />

        <div className={styles.handBox} style={indicatorPos} aria-hidden="true">
          <div className={styles.fill}>
            <svg
              className={styles.bloomSvg}
              viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
              width="100%"
              height="100%"
              focusable="false"
            >
              {BLOOMS.map((b) => (
                <BloomShape key={b.id} b={b} />
              ))}
            </svg>
          </div>

          <div className={styles.indicator} data-indicator="">
            <span className={styles.disk} data-breathe="">
              <span className={styles.dot} />
            </span>
          </div>

          <div className={styles.fill} data-handintro="">
            <div className={`${styles.fill} ${styles.handScroll}`} data-handscroll="">
              <i className={styles.mark} style={tipPos} data-tipmark="" />
              <i className={styles.mark} style={{ left: '100%', top: '62%' }} data-shouldermark="" />
              <div className={styles.fill} data-handmouse="">
                <SleeveExtension />
                <Hand pose="reach" />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.copy} data-copy="">
          <p className={`label ${styles.kicker}`} data-kicker="">
            <i className={styles.rule} aria-hidden="true" />
            <span>{person.role}</span>
          </p>
          <div className={styles.mask}>
            <Wordmark size="hero" split as="h1" id="arrival-title" className={styles.title} />
          </div>
          <p className={`raster ${styles.tagline}`} data-tagline="">
            {person.pitch}
          </p>
          <div className={styles.actions} data-actions="">
            <button type="button" className={`${styles.tab} ${styles.primary}`} data-cursor="hover" onClick={() => scrollToChapter('work')}>
              View work <span aria-hidden="true">&rarr;</span>
            </button>
            <button type="button" className={`${styles.tab} ${styles.secondary}`} data-cursor="hover" onClick={() => scrollToChapter('contact')}>
              Contact
            </button>
          </div>
        </div>

        <div className={styles.capWrap} data-capwrap="">
          <div data-capin="">
            <p id="arrival-line" className={`caption ${styles.caption}`}>
              {sectionLines.home}
            </p>
          </div>
        </div>

        <div className={styles.inset} data-inset="" aria-hidden="true">
          <p className={`label ${styles.insetTag}`}>Fig. I — the grain, closer</p>
          <div className={styles.insetPanel}>
            <div className={styles.insetWood}>
              <Woodgrain tone="deep" seed={21} />
            </div>
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" focusable="false">
              <g data-insetbloom="">
                <path d={INSET_BLOOM.halo} fill="#050505" opacity={0.3} />
                <path d={INSET_BLOOM.drip} fill="#722F37" stroke="#050505" strokeWidth={2} strokeLinejoin="round" />
                <path d={INSET_BLOOM.d} fill="#722F37" stroke="#050505" strokeWidth={2.4} strokeLinejoin="round" />
                <path d={INSET_BLOOM.shade} fill="#4A1D23" opacity={0.5} />
              </g>
            </svg>
          </div>
        </div>
      </div>

      <div className={styles.cue} data-cue="" aria-hidden="true">
        <div className={styles.cueIn} data-cuein="">
          <span className={styles.cueDisk}>
            <span className={styles.cueLine} data-cueline="" />
          </span>
          <span className={`label ${styles.cueLabel}`}>Scroll</span>
        </div>
      </div>
    </section>
  );
}
