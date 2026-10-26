import { useLayoutEffect, useRef, useState } from 'react';
import { gsap, MQ } from '../../lib/gsap';
import { rasterReveal } from '../../lib/transitions';
import { chapterById } from '../../config/chapters';
import { achievements, certifications, education, experience, sectionLines } from '../../config/portfolio';
import Face from './Face';
import Burst from './Burst';
import Seal from './Seal';
import { DESK_VB, EYE_Y, MOBILE_VB, FACE_ART } from './faceArt';
import styles from './ChapterRevelation.module.css';

const chapter = chapterById('experience');

const isMobileNow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

/** Short mark for a seal, derived from the issuer. */
const sealMark = (issuer: string) => (/amazon web services/i.test(issuer) ? 'AWS' : issuer.toUpperCase());

/** Where the eyes sit inside the stage, as % of its height, given the slice-fit viewBox. */
function eyeBand(el: HTMLElement, mobile: boolean) {
  const vb = mobile ? MOBILE_VB : DESK_VB;
  const w = el.clientWidth || window.innerWidth;
  const h = el.clientHeight || window.innerHeight;
  const s = Math.max(w / vb.w, h / vb.h);
  const y = ((h - vb.h * s) / 2 + (EYE_Y - vb.y) * s) / h;
  const half = ((mobile ? 62 : 56) * s) / h;
  return { y: y * 100, top: (y - half) * 100, bottom: (1 - y - half) * 100 };
}

export default function ChapterRevelation() {
  const rootRef = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(isMobileNow);

  // only re-render when the breakpoint flips (swaps the face crop); never during scroll
  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = <T extends Element = HTMLElement>(sel: string, from: ParentNode = root) => Array.from(from.querySelectorAll<T>(sel));
    const one = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      const build = (isMobile: boolean) => {
        const pin = isMobile ? chapter.pin.mobile : chapter.pin.desktop;

        const stage = one('[data-stage]');
        const camera = one('[data-camera]');
        const irises = q('[data-iris]');
        const keep = isMobile ? ':not([data-desk])' : '';
        const shards = q(`[data-shard]${keep}`);
        const lines = one('[data-b="lines"]');
        const shape = one('[data-b="shape"]');
        const streaks = one('[data-b="streaks"]');
        const body = one('[data-body]');
        const track = one('[data-track]');
        const items = q('[data-item]');
        const band = () => eyeBand(stage, isMobile);

        if (isMobile) gsap.set(q('[data-shard][data-desk]'), { opacity: 0 });
        gsap.set(camera, { transformOrigin: () => `50% ${band().y}%` });

        // The timeline runs 0..100, i.e. percent of the chapter's pinned scroll.
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

        const side = isMobile ? 4 : 19;
        const slit = (inset: number) => () => {
          const b = band();
          return `inset(${b.top}% ${inset}% ${b.bottom}% ${inset}%)`;
        };

        /* 1. opener (0-30): a slit opens on the eyes almost at once, then climbs to the whole face */
        tl.fromTo(stage, { clipPath: slit(side) }, { clipPath: slit(0), duration: 4, ease: 'power2.out' }, 0);
        tl.fromTo(
          stage,
          { clipPath: slit(0) },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 12, ease: 'power2.inOut', immediateRender: false },
          4,
        );
        tl.add(rasterReveal(one('[data-smear]'), { from: 0.4, to: 0, duration: 14, stripe: 6, ease: 'none' }), 0);
        tl.fromTo(
          camera,
          { scale: 1.15, x: isMobile ? 10 : -26, y: isMobile ? 14 : 20 },
          { scale: 1, x: 0, y: 0, duration: 22, ease: 'sine.inOut' },
          0,
        );
        tl.fromTo('[data-g="hair-left"]', { x: -46 }, { x: 0, duration: 14, ease: 'power2.out' }, 0);
        tl.fromTo('[data-g="hair-right"]', { x: 46 }, { x: 0, duration: 14, ease: 'power2.out' }, 0);
        tl.fromTo(
          '[data-g="tear"]',
          { scaleY: 0, svgOrigin: `${FACE_ART.tearTop[0]} ${FACE_ART.tearTop[1]}` },
          { scaleY: 1, svgOrigin: `${FACE_ART.tearTop[0]} ${FACE_ART.tearTop[1]}`, duration: 8, ease: 'power1.inOut' },
          11,
        );
        // the eyes find the viewer
        tl.fromTo(irises, { x: -26, y: 13 }, { x: 2, y: -1, duration: 6, ease: 'back.out(1.5)' }, 7);
        tl.fromTo(one('[data-cap]'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 3 }, 13);
        tl.to(one('[data-cap]'), { opacity: 0, y: -8, duration: 2.5, ease: 'power2.in' }, 24.5);
        tl.to(one('[data-folio]'), { opacity: 0, duration: 2 }, 27);

        /* 2. the speed-line burst wipes the face down and becomes the backdrop of the timeline */
        const T0 = 28; // timeline travel starts
        const T1 = 86; // ... and ends
        tl.fromTo(body, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 6, ease: 'power3.in' }, 26);
        tl.fromTo(
          shape,
          { scale: 0.5, rotation: -5, opacity: 1, svgOrigin: '800 500' },
          { scale: 1, rotation: 0, opacity: 1, svgOrigin: '800 500', duration: 8, ease: 'back.out(1.25)', immediateRender: true },
          26,
        );
        tl.fromTo(lines, { x: -150 }, { x: 110, duration: 62, ease: 'none' }, 28);
        tl.fromTo(streaks, { x: -60 }, { x: 80, duration: 62, ease: 'none' }, 28);
        tl.fromTo(
          shards,
          { scale: 0, x: 0, y: 0, rotation: (i: number) => (i % 2 ? -40 : 40) },
          {
            scale: 1,
            x: (_i: number, el: Element) => parseFloat((el as SVGElement).dataset.vx ?? '0'),
            y: (_i: number, el: Element) => parseFloat((el as SVGElement).dataset.vy ?? '0'),
            rotation: (_i: number, el: Element) => parseFloat((el as SVGElement).dataset.spin ?? '0'),
            duration: 12,
            stagger: 0.4,
            ease: 'power3.out',
          },
          30,
        );

        /* 3. the timeline: the track climbs steadily; each block is revealed as it arrives */
        const H = () => window.innerHeight;
        const pad = isMobile ? 20 : 30;
        const startY = () => H() * (isMobile ? 0.66 : 0.6) - items[0].offsetTop;
        const endY = () => Math.min(startY(), H() - pad - track.offsetHeight);
        gsap.set(track, { y: startY() });
        tl.fromTo(track, { y: startY }, { y: endY, duration: T1 - T0, ease: 'none', immediateRender: true }, T0);

        // timeline position at which an item's top edge crosses a given height of the screen
        const s0 = startY();
        const s1 = endY();
        const timeAt = (el: HTMLElement, frac: number) => {
          const span = s1 - s0;
          if (Math.abs(span) < 1) return T0 + 0.8;
          const t = T0 + ((frac * H() - el.offsetTop - s0) / span) * (T1 - T0);
          return Math.min(T1 - 6, Math.max(T0 + 0.8, t));
        };
        const times = items.map((el) => timeAt(el, 0.97));

        items.forEach((el, i) => {
          const t = times[i];
          const cardBody = el.querySelector('[data-cardbody]');
          const card = el.querySelector('[data-card]');
          const node = el.querySelector('[data-node]');
          const date = el.querySelector('[data-date]');
          const seg = el.querySelector('[data-seg]');
          const reveals = q('[data-reveal]', el);
          const seals = q('[data-seal]', el);

          tl.fromTo(card, { x: isMobile ? 24 : 70, opacity: 0 }, { x: 0, opacity: 1, duration: 3.5, ease: 'power3.out' }, t);
          if (cardBody) tl.add(rasterReveal(cardBody, { from: 0, to: 1, duration: 4.5, stripe: 8, ease: 'power2.inOut' }), t);
          tl.fromTo(node, { scale: 0, rotation: 45 }, { scale: 1, rotation: 45, duration: 1.6, ease: 'back.out(2)' }, t);
          tl.fromTo(date, { opacity: 0 }, { opacity: 1, duration: 1.5 }, t + 0.4);
          if (seg) {
            const next = times[i + 1] ?? t + 12;
            tl.fromTo(seg, { scaleY: 0 }, { scaleY: 1, duration: Math.max(4, next - t + 2), ease: 'none' }, t + 0.8);
          }
          if (reveals.length) {
            tl.fromTo(reveals, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 2.2, stagger: 0.6, ease: 'power2.out' }, t + 2);
          }
          if (seals.length) {
            tl.fromTo(
              seals,
              { scale: 0.55, rotation: -28, opacity: 0 },
              { scale: 1, rotation: 0, opacity: 1, duration: 2.4, stagger: 0.6, ease: 'back.out(1.8)' },
              t + 2,
            );
          }
        });

        /* 4. hand-off: a burgundy iris closes over everything, ready for Contact */
        tl.to(track, { opacity: 0, duration: 3, ease: 'power1.in' }, 95);
        tl.fromTo(
          one('[data-ring]'),
          { clipPath: 'circle(0% at 50% 50%)' },
          { clipPath: 'circle(79% at 50% 50%)', duration: 7.5, ease: 'power3.inOut' },
          91,
        );
        tl.fromTo(
          one('[data-red]'),
          { clipPath: 'circle(0% at 50% 50%)' },
          { clipPath: 'circle(76% at 50% 50%)', duration: 7.5, ease: 'power3.inOut' },
          91,
        );
        tl.to({}, { duration: 0.01 }, 99.99);
      };

      mm.add(MQ.desktop, () => build(false));
      mm.add(MQ.mobile, () => build(true));
      mm.add(MQ.reduced, () => {
        /* no pin, no scrub: the CSS default is the composed face, the timeline cards and the credentials */
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const [first, ...schools] = education;

  return (
    <section
      ref={rootRef}
      id={chapter.id}
      className={`chapter ${styles.root}`}
      tabIndex={-1}
      aria-labelledby="revelation-heading"
      data-cursor-label={'Look\ncloser'}
    >
      <h2 id="revelation-heading" className="sr-only">
        Experience
      </h2>

      <div className={styles.stage} data-stage="">
        <div className={styles.camera} data-camera="">
          <Face mobile={mobile} />
        </div>
      </div>

      <div className={`raster ${styles.smear}`} data-smear="" aria-hidden="true" />

      <p className={`label ${styles.folio}`} data-folio="">
        {chapter.numeral} — {chapter.label}
      </p>
      <p className={`caption caption--dark ${styles.cap}`} data-cap="">
        {sectionLines.experience}
      </p>

      <div className={styles.body} data-body="">
        <div className={styles.burst} aria-hidden="true">
          <Burst mobile={mobile} />
        </div>

        <div className={styles.viewport}>
          <div className={styles.track} data-track="">
            <div className={styles.rows}>
              {experience.map((e, i) => (
                <article key={e.org} className={styles.row} data-item="" aria-labelledby={`exp-${i}`}>
                  <div className={styles.rail} aria-hidden="true">
                    <span className={`label ${styles.date}`} data-date="">
                      {e.period.split(' – ')[0]}
                    </span>
                    <span className={styles.node} data-node="" />
                    <span className={styles.seg} data-seg="" />
                  </div>
                  <div className={styles.card} data-card="">
                    <div className={`raster ${styles.cardBody}`} data-cardbody="">
                      <p className={`label ${styles.tag}`}>{e.current ? 'Current' : 'Previous'}</p>
                      <h3 id={`exp-${i}`} className={styles.org}>
                        {e.org}
                      </h3>
                      <p className={styles.meta}>
                        <span className={styles.roleName}>{e.role}</span>
                        <span>{e.period}</span>
                        <span>{e.location}</span>
                      </p>
                      <ul className={styles.bullets}>
                        {(e.short ?? e.bullets).map((b) => (
                          <li key={b} data-reveal="">
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}

              <div className={`${styles.row} ${styles.creds}`} data-item="" role="group" aria-label="Education, certifications and achievements">
                <div className={styles.rail} aria-hidden="true">
                  <span className={`label ${styles.date}`} data-date="">
                    {first.period.replace('Expected ', '')}
                  </span>
                  <span className={styles.node} data-node="" />
                </div>
                <div className={styles.card} data-card="">
                  <div className={`raster ${styles.cardBody} ${styles.credsBody}`} data-cardbody="">
                    <section className={styles.col} aria-labelledby="cred-edu">
                      <h3 id="cred-edu" className={`label ${styles.colHead}`}>
                        Education
                      </h3>
                      <div data-reveal="">
                        <p className={styles.degree}>{first.degree}</p>
                        <p className={styles.school}>{first.school}</p>
                        <p className={styles.score}>
                          {first.score} <span>· {first.period}</span>
                        </p>
                      </div>
                      <ul className={styles.schools}>
                        {schools.map((s) => (
                          <li key={s.degree} data-reveal="">
                            <span>{s.degree}</span>
                            <span>
                              {s.score} · {s.period}
                            </span>
                            <span>
                              {s.school}, {s.location}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className={styles.col} aria-labelledby="cred-cert">
                      <h3 id="cred-cert" className={`label ${styles.colHead}`}>
                        Certifications
                      </h3>
                      <ul className={styles.seals}>
                        {certifications.map((c) => (
                          <li key={c.name} data-seal="">
                            <span className={styles.sealArt}>
                              <Seal mark={sealMark(c.issuer)} />
                            </span>
                            <span className={styles.sealName}>{c.name}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className={styles.col} aria-labelledby="cred-ach">
                      <h3 id="cred-ach" className={`label ${styles.colHead}`}>
                        Achievements
                      </h3>
                      <ul className={styles.awards}>
                        {achievements.map((a) => (
                          <li key={a.event} data-reveal="">
                              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M12 1.5l2.6 7.2 7.6.3-6 4.7 2.1 7.3L12 16.6 5.7 21l2.1-7.3-6-4.7 7.6-.3z" />
                              </svg>
                              <span className={styles.awardTitle}>{a.title}</span>
                              <span className={styles.awardMeta}>
                                {a.event} · {a.date}
                              </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.ring} data-ring="" aria-hidden="true" />
      <div className={styles.red} data-red="" aria-hidden="true" />
    </section>
  );
}
