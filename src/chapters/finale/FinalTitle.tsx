import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { gsap, MQ } from '../../lib/gsap';
import { rasterReveal } from '../../lib/transitions';
import { scrollToChapter } from '../../lib/progressStore';
import { chapterById } from '../../config/chapters';
import { brand } from '../../config/brand';
import { person } from '../../config/portfolio';
import Wordmark from '../../components/Wordmark';
import Shard from './Shard';
import Droplet from './Droplet';
import BottomBand from './BottomBand';
import styles from './FinalTitle.module.css';

const chapter = chapterById('contact');

interface ShardSpec {
  id: string;
  seed: number;
  tone: 'paper' | 'ink';
  layer: 'back' | 'front';
  /** desktop left / top / size, then rotation and parallax depth */
  l: string;
  t: string;
  s: string;
  r: number;
  depth: number;
  /** mobile overrides: presence means the shard survives on mobile */
  m?: { l: string; t: string; s: string };
}

const SHARDS: ShardSpec[] = [
  { id: 'a', seed: 11, tone: 'paper', layer: 'back', l: '5%', t: '9%', s: 'clamp(90px,13vw,230px)', r: -16, depth: 0.45, m: { l: '3%', t: '5%', s: '28vw' } },
  { id: 'b', seed: 27, tone: 'ink', layer: 'back', l: '41%', t: '4%', s: 'clamp(90px,12vw,220px)', r: 12, depth: 0.25 },
  { id: 'c', seed: 5, tone: 'paper', layer: 'back', l: '80%', t: '10%', s: 'clamp(70px,9vw,170px)', r: 28, depth: 0.7, m: { l: '74%', t: '3%', s: '20vw' } },
  { id: 'd', seed: 41, tone: 'ink', layer: 'front', l: '83%', t: '44%', s: 'clamp(80px,10vw,190px)', r: 24, depth: 1.1, m: { l: '78%', t: '38%', s: '20vw' } },
  { id: 'e', seed: 63, tone: 'paper', layer: 'front', l: '3%', t: '47%', s: 'clamp(90px,11vw,200px)', r: -8, depth: 1.35, m: { l: '-2%', t: '44%', s: '22vw' } },
  { id: 'f', seed: 88, tone: 'paper', layer: 'back', l: '57%', t: '70%', s: 'clamp(50px,6.5vw,120px)', r: -30, depth: 0.9 },
  { id: 'g', seed: 19, tone: 'paper', layer: 'front', l: '92%', t: '64%', s: 'clamp(50px,6vw,110px)', r: 40, depth: 1.6 },
];

const DROPS = [
  { id: 'p', l: '27%', t: '24%', s: '1.2vw', depth: 0.8, m: true },
  { id: 'q', l: '66%', t: '20%', s: '1.5vw', depth: 1.2, m: true },
  { id: 'r', l: '49%', t: '73%', s: '1vw', depth: 0.6 },
  { id: 's', l: '89%', t: '40%', s: '1.1vw', depth: 1.4, m: true },
];

const css = (v: Record<string, string | number>) => v as CSSProperties;

const lastSegment = (url: string) => url.replace(/\/+$/, '').split('/').pop() ?? url;

/** Clipboard write with a legacy fallback for insecure contexts or older browsers. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea route */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function FinalTitle() {
  const rootRef = useRef<HTMLElement>(null);
  const timer = useRef<number>(0);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const onCopy = useCallback(async () => {
    const ok = await copyText(person.email);
    setStatus(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), 2400);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let dead = false;

    // Keep the wordmark inside the frame whatever font actually loaded.
    const fit = () => {
      const mark = root.querySelector<HTMLElement>('#finale-title');
      if (!mark) return;
      root.style.setProperty('--fit', '1');
      const w = mark.offsetWidth;
      // desktop leaves room for the fixed chapter rail on the right
      const avail = root.clientWidth * (root.clientWidth > 768 ? 0.8 : 0.9);
      if (w > 0) root.style.setProperty('--fit', String(Math.min(1, avail / w)));
    };
    fit();
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(() => {
      if (!dead) fit();
    });

    const q = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    const build = (mobile: boolean) => {
      const pin = mobile ? chapter.pin.mobile : chapter.pin.desktop;
      const keep = mobile ? ':not([data-desk])' : '';
      const frags = q(`[data-frag]${keep}`);
      const fragIn = q(`[data-frag]${keep} [data-in]`);
      const drops = q(`[data-drop]${keep}`);
      const dropIn = q(`[data-drop]${keep} [data-in]`);
      const idle = q(`[data-frag]${keep} [data-idle], [data-drop]${keep} [data-idle]`);
      const tabs = q('[data-tab]');

      // Wordmark renders one span per non-empty part: roman first name, then the italic surname.
      const title = root.querySelector<HTMLElement>('#finale-title');
      const parts = title ? Array.from(title.children) : [];
      const chars = (el?: Element) => (el ? Array.from(el.querySelectorAll('.wm-char')) : []);
      const outer = chars(parts[0]);
      const middle = parts.slice(1).flatMap((p) => chars(p));

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

      // The previous chapter ends on a burgundy wipe, so this one opens already half-formed.
      // fromTo everywhere: from() + invalidateOnRefresh records the hidden state as the end state.
      tl.fromTo('[data-kicker]', { opacity: 0.5, y: 10 }, { opacity: 1, y: 0, duration: 0.8 }, 0);
      tl.fromTo('[data-bottom]', { yPercent: 45 }, { yPercent: 0, duration: 1.6 }, 0);
      tl.fromTo(fragIn, { opacity: 0.55, scale: 0.7, rotation: -18 }, { opacity: 1, scale: 1, rotation: 0, duration: 1.3, stagger: 0.1, ease: 'back.out(1.3)' }, 0);

      // 1. letters rise from behind the mask line (already half up at progress 0)
      tl.fromTo(outer, { yPercent: 62 }, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: 'power4.out' }, 0);
      // 2. the italic surname lands and settles
      tl.fromTo(middle, { yPercent: 85, skewX: -14, rotation: 3 }, { yPercent: 0, skewX: 0, rotation: 0, duration: 0.9, stagger: 0.07, ease: 'back.out(1.3)' }, 0.3);
      // 3. misregistered layer slides into (near) alignment
      tl.fromTo('[data-ghost]', { opacity: 0.4, x: -40, y: 22 }, { opacity: 1, x: 0, y: 0, duration: 0.9, ease: 'power3.inOut' }, 0.6);
      tl.fromTo(dropIn, { opacity: 0, y: -60, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 1, stagger: 0.12, ease: 'bounce.out' }, 0.9);

      // 4. headline raster-reveals, then the contact tabs stamp in
      tl.add(rasterReveal('[data-headline]', { from: 0.3, duration: 0.9, stripe: 4, ease: 'none' }), 0.3);
      tl.fromTo('[data-avail]', { opacity: 0.2, y: 8 }, { opacity: 1, y: 0, duration: 0.6 }, 0.6);
      tl.fromTo(tabs, { opacity: 0.15, y: 30 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'back.out(1.4)' }, 0.3);
      tl.fromTo('[data-foot]', { opacity: 0.2 }, { opacity: 1, duration: 0.6 }, 1.2);
      // rest
      tl.to({}, { duration: 0.4 });

      // depth: parallax drift across the whole pin, deeper layers move more
      const total = tl.duration();
      [...frags, ...drops].forEach((el) => {
        const depth = parseFloat(el.dataset.depth ?? '1');
        const dir = parseFloat(el.dataset.dir ?? '1');
        tl.fromTo(
          el,
          { y: depth * 70, x: dir * depth * 20 },
          { y: depth * -50, x: dir * depth * -20, ease: 'none', duration: total },
          0,
        );
      });

      // gentle idle float (killed with the context)
      idle.forEach((el, i) => {
        const amp = parseFloat(el.dataset.amp ?? '1');
        gsap.to(el, {
          y: (i % 2 ? -1 : 1) * 12 * amp,
          x: (i % 3 ? 1 : -1) * 6 * amp,
          rotation: (i % 2 ? 1 : -1) * 4 * amp,
          duration: 3.6 + (i % 4) * 0.9,
          delay: i * 0.2,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      });
    };

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(MQ.desktop, () => build(false));
      mm.add(MQ.mobile, () => build(true));
      mm.add(MQ.reduced, () => {
        /* no pin, no scrub: the CSS default is the composed final state */
      });
    }, rootRef);

    return () => {
      dead = true;
      window.removeEventListener('resize', fit);
      ctx.revert();
    };
  }, []);

  const frag = (s: ShardSpec) => (
    <div
      key={s.id}
      className={`${styles.frag} ${s.m ? '' : styles.desk}`}
      data-frag=""
      data-desk={s.m ? undefined : ''}
      data-depth={s.depth}
      data-dir={s.id.charCodeAt(0) % 2 ? 1 : -1}
      style={css({
        '--l': s.l,
        '--t': s.t,
        '--s': s.s,
        '--r': `${s.r}deg`,
        ...(s.m ? { '--ml': s.m.l, '--mt': s.m.t, '--ms': s.m.s } : {}),
      })}
    >
      <div data-idle="" data-amp={s.depth > 1 ? 1.3 : 0.8}>
        <div data-in="">
          <Shard seed={s.seed} uid={s.id} tone={s.tone} />
        </div>
      </div>
    </div>
  );

  const copyLabel = status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy';

  return (
    <section
      ref={rootRef}
      id={chapter.id}
      className={`chapter ${styles.root}`}
      tabIndex={-1}
      aria-labelledby="finale-title"
    >
      <div className={styles.back} aria-hidden="true">
        {SHARDS.filter((s) => s.layer === 'back').map(frag)}
      </div>

      <div className={styles.stage}>
        <p className={`label ${styles.kicker}`} data-kicker="">
          {chapter.numeral} — {chapter.label}
        </p>
        <div className={styles.titleWrap}>
          <div className={styles.ghostLayer} data-ghost="" aria-hidden="true">
            <Wordmark size="mega" split as="span" className={styles.ghost} />
          </div>
          <div className={styles.mask}>
            <Wordmark size="mega" split as="h2" id="finale-title" className={styles.title} />
          </div>
        </div>
        <p className={`raster ${styles.headline}`} data-headline="">
          Let’s build something reliable.
        </p>
        <p className={`label ${styles.avail}`} data-avail="">
          <span className={styles.dot} aria-hidden="true" />
          {person.availability}
        </p>

        <ul className={styles.tabs} aria-label="Ways to reach me">
          <li className={`${styles.cell} ${styles.cellWide}`} data-tab="">
            <div className={styles.emailGroup}>
              <button
                type="button"
                className={`${styles.tab} ${styles.tabMain}`}
                data-cursor="hover"
                onClick={onCopy}
                aria-label={`Copy email address ${person.email}`}
              >
                <span className={styles.key}>
                  <span aria-hidden="true">01 · </span>Email
                  <span className={`${styles.act} ${status === 'copied' ? styles.actOn : ''}`} aria-hidden="true">
                    {copyLabel}
                  </span>
                </span>
                <span className={styles.val}>{person.email}</span>
              </button>
              <a className={`${styles.tab} ${styles.tabMini}`} href={`mailto:${person.email}`} data-cursor="hover">
                <span className={styles.key}>Mail</span>
                <span className={styles.val} aria-hidden="true">
                  ↗
                </span>
                <span className="sr-only"> (opens your mail app)</span>
              </a>
            </div>
          </li>
          <li className={styles.cell} data-tab="">
            <a className={styles.tab} href={person.github} target="_blank" rel="noopener noreferrer" data-cursor="hover">
              <span className={styles.key}>
                <span aria-hidden="true">02 · </span>GitHub
                <span className={styles.act} aria-hidden="true">
                  ↗
                </span>
              </span>
              <span className={styles.val}>{lastSegment(person.github)}</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li className={styles.cell} data-tab="">
            <a className={styles.tab} href={person.linkedin} target="_blank" rel="noopener noreferrer" data-cursor="hover">
              <span className={styles.key}>
                <span aria-hidden="true">03 · </span>LinkedIn
                <span className={styles.act} aria-hidden="true">
                  ↗
                </span>
              </span>
              <span className={styles.val}>{person.name}</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li className={`${styles.cell} ${styles.cellWide}`} data-tab="">
            <a className={styles.tab} href={person.resumeUrl} download data-cursor="hover">
              <span className={styles.key}>
                <span aria-hidden="true">04 · </span>Résumé
                <span className={styles.act} aria-hidden="true">
                  ↓
                </span>
              </span>
              <span className={styles.val}>Download PDF</span>
            </a>
          </li>
        </ul>
        <p className="sr-only" role="status" aria-live="polite">
          {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed. Select the address manually.' : ''}
        </p>
      </div>

      <div className={styles.front} aria-hidden="true">
        {SHARDS.filter((s) => s.layer === 'front').map(frag)}
      </div>

      <div className={styles.drops} aria-hidden="true">
        {DROPS.map((d, i) => (
          <div
            key={d.id}
            className={`${styles.drop} ${d.m ? '' : styles.desk}`}
            data-drop=""
            data-desk={d.m ? undefined : ''}
            data-depth={d.depth}
            data-dir={i % 2 ? 1 : -1}
            style={css({ '--l': d.l, '--t': d.t, '--s': d.s })}
          >
            <div data-idle="" data-amp="0.5">
              <div data-in="">
                <Droplet />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.bottom} data-bottom="" aria-hidden="true">
        <BottomBand />
      </div>

      <div className={styles.foot} data-foot="">
        <p className={`label ${styles.edition}`}>{brand.edition}</p>
        <button type="button" className={`label ${styles.again}`} data-cursor="hover" onClick={() => scrollToChapter('home')}>
          <span aria-hidden="true">↺ </span>Begin again
        </button>
      </div>
    </section>
  );
}
