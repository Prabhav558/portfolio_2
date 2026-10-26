import { gsap } from '../../lib/gsap';
import { rasterReveal } from '../../lib/transitions';
import { MARK_FILL, gardenOf, wetStart, type Layout } from './layout';
import type { Scene } from './rig';

/**
 * One timeline, 100 units long = the whole pinned scroll (units are percent).
 *   0-30 pour | 30-45 overflow | 45-60 the fall | 60-70 splash, spread, soak | 70-95 germination | 95-100 rest
 */
export function buildTimeline(
  root: HTMLElement,
  frame: HTMLElement,
  world: HTMLElement,
  L: Layout,
  scene: Scene,
  scrollTrigger?: gsap.TimelineVars['scrollTrigger'],
) {
  const S = scene.S;
  const mobile = L.key === 'mob';
  const $ = <T extends Element>(sel: string) => Array.from(world.querySelectorAll<T>(sel));
  const plants = gardenOf(L);
  const Y0 = L.terraces[0].y;

  const subA = root.querySelector<HTMLElement>('[data-sub="a"]')!;
  const subB = root.querySelector<HTMLElement>('[data-sub="b"]')!;
  const cap = root.querySelector<HTMLElement>('[data-cap]')!;
  const stepEls = $<HTMLElement>('[data-step]');
  const marks = $<SVGElement>('[data-mark]');
  const men = world.querySelector<SVGGElement>('[data-men]')!;

  // hidden until their moment (every tween below is a fromTo with immediateRender off)
  gsap.set(stepEls, { opacity: 0 });
  gsap.set(men, { opacity: 0, scaleY: 0.05, svgOrigin: '0 0' });
  gsap.set($('[data-tag]'), { opacity: 0 });
  gsap.set($('[data-pool]'), { scaleX: 0.02, scaleY: 0.35, svgOrigin: '0 0' });
  gsap.set(subB, { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set($('[data-leaf]'), { scale: 0.1, svgOrigin: '0 0', opacity: 0 });
  gsap.set($('[data-gpetal]'), { scaleY: 0, svgOrigin: '0 0' });

  const tl = gsap.timeline({ defaults: { immediateRender: false }, scrollTrigger });

  const draw = (id: string, at: number, dur: number, ease = 'none') => {
    const els = $(`[data-draw="${id}"]`);
    if (els.length) tl.fromTo(els, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dur, ease }, at);
  };
  const fade = (sel: string | Element[], at: number, dur = 0.8, from = 0, to = 1) => {
    const els = typeof sel === 'string' ? $(sel) : sel;
    if (els.length) tl.fromTo(els, { opacity: from }, { opacity: to, duration: dur, ease: 'power1.inOut' }, at);
  };

  /* ---- 0-30 the pour ---- */
  const ex = L.enter[0];
  const ey = L.enter[1];
  tl.add(rasterReveal(frame, { from: 0, to: 1, duration: 3.6, stripe: 9, ease: 'power1.inOut' }), 0);
  tl.set(frame, { maskImage: 'none', webkitMaskImage: 'none' }, 4);
  tl.fromTo(S, { ax: ex - 1100, ay: ey, th: -8 }, { ax: ex, ay: ey, th: 24, duration: 6, ease: 'power3.out' }, 0);
  tl.fromTo(S, { th: 24 }, { th: 72, duration: 3.5, ease: 'power2.inOut' }, 6);
  tl.fromTo(S, { th: 72 }, { th: 96, duration: 3, ease: 'power1.inOut' }, 9.5);
  tl.fromTo(S, { ax: ex, ay: ey }, { ax: 0, ay: 0, duration: 6, ease: 'power2.inOut' }, 6);
  tl.fromTo(S, { flow: 0 }, { flow: 1, duration: 2.4, ease: 'power1.out' }, 9.4);
  tl.fromTo(S, { g: 0 }, { g: 1, duration: 2.4, ease: 'power1.in' }, 9.6);
  tl.fromTo(S, { fill: 0 }, { fill: 1, duration: 18, ease: 'none' }, 12);
  tl.fromTo(S, { flow: 1 }, { flow: 0.6, duration: 4, ease: 'power1.in' }, 14);

  // each step ticks in as the level passes its engraved mark and stays readable while the bowl fills
  const stepT = MARK_FILL.map((f) => 12 + 18 * f);
  stepEls.forEach((el, i) => {
    tl.fromTo(el, { opacity: 0, x: mobile ? 0 : 36, y: mobile ? 14 : 0 }, { opacity: 1, x: 0, y: 0, duration: 1.4, ease: 'power2.out' }, stepT[i]);
    if (marks[i]) tl.fromTo(marks[i], { opacity: 0.4 }, { opacity: 1, duration: 1 }, stepT[i]);
    if (!mobile) draw(`ld${i}`, stepT[i] + 0.2, 1.6, 'power1.out');
    if (mobile && i < stepEls.length - 1) tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.9, ease: 'power1.in' }, stepT[i + 1] - 0.9);
  });

  /* ---- 30-45 overflow ---- */
  tl.fromTo(men, { opacity: 0, scaleY: 0.05, svgOrigin: '0 0' }, { opacity: 1, scaleY: 1, svgOrigin: '0 0', duration: 2.6, ease: 'power1.out' }, 29.6);
  tl.fromTo(S, { flow: 0.6 }, { flow: 0, duration: 3, ease: 'power1.in' }, 33);
  tl.fromTo(S, { th: 96 }, { th: 22, duration: 6.5, ease: 'power2.in' }, 33.5);
  tl.fromTo(S, { ax: 0, ay: 0 }, { ax: -700, ay: -90, duration: 7, ease: 'power2.in' }, 33.5);
  draw('riv0', 31, 5.6, 'power1.inOut');
  draw('riv1', 32.4, 5.6, 'power1.inOut');
  draw('riv2', 33.8, 5, 'power1.inOut');
  draw('stem', 36.4, 4, 'power1.in');
  draw('foot', 39.8, 3, 'none');
  draw('run', 42, 4.2, 'power1.inOut');

  /* ---- 45-60 the fall: the camera follows the head of the column through the gutter ---- */
  const A = L.G - 200;
  tl.fromTo(S, { focus: 0 }, { focus: A, duration: 3.4, ease: 'power1.inOut' }, 42);
  tl.fromTo(S, { focus: A }, { focus: A + (Y0 - 14 - L.G), duration: 12.5, ease: 'power2.in' }, 45.5);
  // the column falls under gravity (distance ~ time squared) and breaks into thinner pieces and drops
  L.fallSegs.forEach((sg, i) => {
    const su = Math.sqrt(sg.a);
    const eu = Math.sqrt(sg.b);
    tl.fromTo($(`[data-draw="fall${i}"]`), { opacity: 0 }, { opacity: 1, duration: 0.01 }, 45.5 + 12.5 * su);
    draw(`fall${i}`, 45.5 + 12.5 * su, 12.5 * (eu - su) + 0.01, ((r: number) => ((su + r * (eu - su)) ** 2 - sg.a) / (sg.b - sg.a)) as unknown as string);
  });
  const drop = Y0 - 14 - (L.G + 10);
  $<SVGElement>('[data-bead]').forEach((b, i) => {
    const t0 = 47 + i * 1.15;
    const land = 56.2 + i * 0.5;
    tl.fromTo(b, { y: 0, opacity: 1 }, { y: drop, opacity: 1, duration: land - t0, ease: 'power2.in' }, t0);
    tl.fromTo(b, { opacity: 1 }, { opacity: 0, duration: 0.2 }, land);
  });

  /* ---- 60-70 splash, spread, soak ---- */
  const imp = 58.6;
  const petals = $<SVGElement>('[data-gpetal]');
  tl.fromTo(petals, { scaleY: 0, opacity: 0, svgOrigin: '0 0' }, { scaleY: 1, opacity: 1, svgOrigin: '0 0', duration: 1.1, ease: 'power2.out', stagger: 0.07 }, imp);
  tl.fromTo(petals, { scaleY: 1, opacity: 1 }, { scaleY: 0.05, opacity: 0, duration: 2.4, ease: 'power1.in', stagger: 0.07 }, imp + 1.5);
  $<SVGElement>('[data-gbead]').forEach((b, i) => {
    const dx = Number(b.dataset.dx);
    tl.fromTo(b, { x: 0, y: 0, opacity: 0 }, { x: dx * 0.55, y: -(48 + (i % 3) * 16), opacity: 1, duration: 1.1, ease: 'power2.out' }, imp + 0.1);
    tl.fromTo(b, { x: dx * 0.55, y: -(48 + (i % 3) * 16), opacity: 1 }, { x: dx, y: 2, opacity: 0, duration: 1.2, ease: 'power2.in' }, imp + 1.2);
  });
  const ripple = (i: number, at: number) => {
    const r = $<SVGElement>(`[data-ripple="${i}"]`);
    tl.fromTo(r, { scaleX: 0.3, scaleY: 0.3, opacity: 0.95, svgOrigin: '0 0' }, { scaleX: mobile ? 5 : 8, scaleY: 2, opacity: 0, svgOrigin: '0 0', duration: 3.4, ease: 'power1.out' }, at);
    tl.fromTo(r, { scaleX: 0.3, scaleY: 0.3, opacity: 0.95, svgOrigin: '0 0' }, { scaleX: mobile ? 3.4 : 5.5, scaleY: 1.6, opacity: 0, svgOrigin: '0 0', duration: 3, ease: 'power1.out' }, at + 1.2);
  };
  ripple(0, imp + 0.3);
  // once it has landed the column drains from the top and the water stops falling
  L.fallSegs.forEach((_, i) => {
    const els = $(`[data-draw="fall${i}"]`);
    tl.fromTo(els, { strokeDashoffset: 0 }, { strokeDashoffset: -1, duration: 2.2, ease: 'power1.in' }, 62.4 + i * 1.3);
    tl.fromTo(els, { opacity: 1 }, { opacity: 0, duration: 0.01 }, 64.6 + i * 1.3);
  });

  const pool = (i: number, at: number, dur: number) => {
    const el = $(`[data-pool="${i}"]`);
    tl.fromTo(el, { scaleX: 0.02, scaleY: 0.35, svgOrigin: '0 0' }, { scaleX: 1, scaleY: 1, svgOrigin: '0 0', duration: dur, ease: 'power3.out' }, at);
    tl.fromTo(el, { scaleY: 1 }, { scaleY: 0.42, duration: 3.2, ease: 'power1.inOut' }, at + dur + 1);
  };
  L.terraces.forEach((_, i) => {
    const w0 = wetStart(L, i);
    pool(i, mobile ? (i === 0 ? imp + 1 : w0 - 0.4) : imp + 1, mobile ? 5 : 8);
    tl.fromTo(S.wet, { [i]: 0 }, { [i]: 1, duration: mobile ? 6 : 8.4, ease: 'power1.out' }, w0);
    if (mobile && i > 0) ripple(i, w0 - 0.3);
  });
  if (mobile) {
    // the pool spills over the end of each terrace and falls to the next one
    L.cascades.forEach((_, i) => {
      const w0 = wetStart(L, i);
      draw(`cas${i}`, w0 + 2.2, 3, 'power2.in');
      fade(`[data-draw="cas${i}"]`, w0 + 5.6, 1.4, 1, 0);
    });
    // the camera steps down the hillside, one terrace at a time
    L.terraces.forEach((_, i) => {
      if (i === 0) return;
      const prev = i === 1 ? A + (Y0 - 14 - L.G) : L.focus[i - 1];
      tl.fromTo(S, { focus: prev }, { focus: L.focus[i], duration: 3.6, ease: 'power2.inOut' }, wetStart(L, i) - 1);
    });
  }

  /* header: the sub-heading is swapped behind a mask */
  const swap = mobile ? 62 : 64.5;
  tl.fromTo(subA, { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0 }, { clipPath: 'inset(0% 0% 100% 0%)', yPercent: -35, duration: 1.6, ease: 'power2.in' }, swap);
  tl.fromTo(subB, { clipPath: 'inset(100% 0% 0% 0%)', yPercent: 35 }, { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, duration: 2, ease: 'power2.out' }, swap + 1.3);
  if (mobile) tl.fromTo(cap, { opacity: 1 }, { opacity: 0, duration: 1.4 }, swap + 1);

  /* ---- 70-95 germination ---- */
  const first = Math.min(...L.sprouts.map((s) => s.start));
  tl.fromTo(S, { germ: 0 }, { germ: 1, duration: 2, ease: 'none' }, first);
  L.sprouts.forEach((s, i) => {
    const p = plants[i];
    const st = s.start;
    const leaves = $<SVGElement>(`[data-leaf="${i}"]`);
    // the root first, then the shoot
    draw(`root${i}`, st, 7, 'power1.out');
    draw(`stem${i}`, st + 1.2, 5.6, 'power2.out');
    tl.fromTo(S.gr, { [i]: 0 }, { [i]: 1, duration: 8, ease: 'none' }, st + 1.2);
    fade(`[data-nodes="${i}"]`, st + 4.6, 1.2);
    leaves.forEach((lf, j) => {
      const fold = Number(lf.dataset.fold);
      const cot = !!lf.dataset.cot;
      const at = cot ? st + 5.2 : st + 6.4 + ((j - 2) * 2.6) / Math.max(1, p.leaves.length - 3);
      tl.fromTo(
        lf,
        { scale: 0.1, rotation: fold, opacity: 0, svgOrigin: '0 0' },
        { scale: 1, rotation: 0, opacity: 1, svgOrigin: '0 0', duration: cot ? 2 : 1.7, ease: 'back.out(1.5)' },
        at,
      );
    });
    draw(`str${i}`, st + 8.4, 1.2, 'power1.out');
    tl.fromTo(
      $(`[data-tag="${i}"]`),
      { opacity: 0, y: -16, rotation: -7, scale: 0.92 },
      { opacity: 1, y: 0, rotation: 0, scale: 1, duration: 1.8, ease: 'back.out(1.6)' },
      st + 8.9,
    );
  });

  // rest: the full garden holds
  tl.to({}, { duration: 5 }, 95);
  return tl;
}
