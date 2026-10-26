import { HAND_GRIP_ANCHOR } from '../../art/Hand';
import { BOWL, VES } from './art';
import { gardenOf, markPoint, TIE_INDEX, type Layout } from './layout';
import { N_GDROPS } from './World';

/** Scroll-driven state. Everything the timeline tweens lives here. */
export interface SceneState {
  /** hand/flask translation relative to the final anchor position */
  ax: number;
  ay: number;
  /** tilt in degrees (clockwise) */
  th: number;
  /** stream thickness 0..1 */
  flow: number;
  /** how far the stream head has travelled along its path 0..1 */
  g: number;
  /** chalice fill 0..1 */
  fill: number;
  /** world y the camera centres on (clamped to the world) */
  focus: number;
  /** 0..1 soaked-region growth per terrace */
  wet: Record<number, number>;
  /** 0..1 growth per plant (drives the idle sway) */
  gr: Record<number, number>;
  /** 0..1 garden is alive (enables the held drops) */
  germ: number;
}

export const initialState = (L: Layout): SceneState => ({
  ax: L.enter[0] - 1100,
  ay: L.enter[1],
  th: -8,
  flow: 0,
  g: 0,
  fill: 0,
  focus: 0,
  wet: Object.fromEntries(L.terraces.map((_, i) => [i, 0])),
  gr: Object.fromEntries(L.sprouts.map((_, i) => [i, 0])),
  germ: 0,
});

const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const f1 = (n: number) => Math.round(n * 10) / 10;

interface Drop {
  u: number;
  speed: number;
  lat: number;
  size: number;
  on: boolean;
  extra: boolean;
}

interface GDrop {
  on: boolean;
  x: number;
  y: number;
  vy: number;
  land: number;
  plant: number;
}

export interface Scene {
  S: SceneState;
  /** hold-to-pour intensity 0..1 (tweened by pointer input) */
  H: { v: number };
  measure: () => void;
  render: (time: number, dt: number) => void;
  /** fixed, non-animated drop positions for the static composition */
  freeze: () => void;
}

export function createScene(frame: HTMLElement, stage: HTMLElement, L: Layout, S: SceneState, mode: 'pin' | 'flow'): Scene {
  const q = <T extends Element>(sel: string) => stage.querySelector(sel) as T;
  const qa = <T extends Element>(sel: string) => Array.from(stage.querySelectorAll(sel)) as T[];
  const rig = q<HTMLElement>('[data-rig]');
  const liq = q<SVGGElement>('[data-liq]');
  const stream = q<SVGPathElement>('[data-stream]');
  const streamHi = q<SVGPathElement>('[data-stream-hi]');
  const drops = qa<SVGEllipseElement>('[data-drop]');
  const petals = qa<SVGPathElement>('[data-petal]');
  const blRect = qa<SVGRectElement>('[data-bl-rect]');
  const blSurf = q<SVGEllipseElement>('[data-bl-surf]');
  const blRip = qa<SVGEllipseElement>('[data-bl-rip]');
  const wetc = L.terraces.map((_, i) => q<SVGEllipseElement>(`[data-wetc="${i}"]`));
  const sways = L.sprouts.map((_, i) => q<SVGGElement>(`[data-sway="${i}"]`));
  const tagEls = L.sprouts.map((_, i) => q<HTMLElement>(`[data-tag="${i}"]`));
  const tagPos = L.sprouts.map((_, i) => q<HTMLElement>(`[data-tagpos="${i}"]`));
  const strings = L.sprouts.map((_, i) => qa<SVGPathElement>(`[data-draw="str${i}"]`));
  const leaders = L.steps.mode === 'column' ? [0, 1, 2, 3].map((i) => qa<SVGPathElement>(`[data-draw="ld${i}"]`)) : [];
  const stepsEl = q<HTMLElement>('[data-steps]');
  const gdropEls = qa<SVGEllipseElement>('[data-gdrop]').slice(0, N_GDROPS);
  const plants = gardenOf(L);

  const H = { v: 0 };
  const k = L.rigW / 560;
  const ancX = HAND_GRIP_ANCHOR.cx;
  const ancY = HAND_GRIP_ANCHOR.cy;
  const { R, D, rimRy } = BOWL;
  const bs = L.bowl.s;

  // viewport metrics
  const m = { W: 1, H: 1, f: 1, sx: 0, vhd: 1, camEnd: 0 };
  const measure = () => {
    m.W = frame.clientWidth || window.innerWidth;
    m.H = frame.clientHeight || window.innerHeight;
    if (mode === 'pin') {
      m.f = Math.min(m.W / L.w, m.H / L.fitH);
      m.sx = (m.W - L.w * m.f) / 2;
      m.vhd = m.H / m.f;
      m.camEnd = Math.max(0, L.camEnd(m.vhd, m.f));
    } else {
      m.f = m.W / L.w;
      m.sx = 0;
      m.vhd = L.flowH;
      m.camEnd = 0;
      frame.style.height = `${Math.round(L.flowH * m.f)}px`;
    }

    // leader lines run from the chalice marks to the centre of each step
    if (leaders.length) {
      const cards = Array.from(stepsEl.children) as HTMLElement[];
      const top = L.steps.y - stepsEl.offsetHeight;
      cards.forEach((c, i) => {
        const cy = top + c.offsetTop + c.offsetHeight / 2;
        const [sx, sy] = markPoint(L, i);
        const d = `M${f1(sx)} ${f1(sy)}H${f1(sx + 20)}L${f1(L.steps.x - 24)} ${f1(cy)}H${L.steps.x}`;
        leaders[i].forEach((p) => p.setAttribute('d', d));
      });
    }

    // each tag hangs from a thin string tied to its stem
    L.sprouts.forEach((s, i) => {
      const p = plants[i];
      const wrap = tagPos[i];
      let tie = p.pts[TIE_INDEX];
      let ex: number;
      let ey: number;
      if (s.tag === 'c') {
        ex = s.x - s.tagW / 2 + s.eye * s.tagW;
        ey = tie[1] + 30 + 11;
      } else {
        const topY = s.gy - 14 - wrap.offsetHeight;
        ex = s.tag === 'r' ? s.x + 40 + 14 : s.x - 40 - 14;
        ey = topY + 12;
        let best = Infinity;
        p.pts.forEach((pt, j) => {
          const dd = Math.abs(pt[1] - ey) + (j < 6 ? 99 : 0);
          if (dd < best) {
            best = dd;
            tie = pt;
          }
        });
      }
      const d = `M${f1(tie[0])} ${f1(tie[1])}Q${f1((tie[0] + ex) / 2)} ${f1(s.tag === 'c' ? tie[1] + (ey - tie[1]) * 0.15 : Math.min(tie[1], ey) - 4)} ${f1(ex)} ${f1(ey)}`;
      strings[i].forEach((e) => e.setAttribute('d', d));
    });
  };
  measure();

  const dropState: Drop[] = drops.map((_, i) => ({
    u: Math.random(),
    speed: 0.7 + Math.random() * 0.6,
    lat: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.9),
    size: 3 + Math.random() * 3.2,
    on: false,
    extra: i >= 8,
  }));
  const gd: GDrop[] = gdropEls.map(() => ({ on: false, x: 0, y: 0, vy: 0, land: 0, plant: 0 }));
  const hit = L.sprouts.map(() => 0);
  const lastWet: number[] = L.terraces.map(() => -1);
  let swayT = 0;
  const swayPhase = L.sprouts.map((_, i) => i * 1.7 + 0.4);

  // scratch for the curve
  let mx = 0;
  let my = 0;
  let cx = 0;
  let cy = 0;
  let ex = 0;
  let ey = 0;
  const bez = (t: number) => {
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    return [a * mx + b * cx + c * ex, a * my + b * cy + c * ey] as const;
  };
  const tan = (t: number) => {
    const dx = 2 * (1 - t) * (cx - mx) + 2 * t * (ex - cx);
    const dy = 2 * (1 - t) * (cy - my) + 2 * t * (ey - cy);
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l] as const;
  };

  const width = (t: number, time: number, flow: number) =>
    L.streamW * flow * (1 - 0.5 * Math.pow(t, 0.85)) * (1 + 0.05 * Math.sin(time * 9 - t * 15)) * (1 + 0.38 * H.v);

  let frozen = false;

  const render = (time: number, dt: number) => {
    const { th, ax, ay } = S;
    const rad = th * DEG;
    const cs = Math.cos(rad);
    const sn = Math.sin(rad);

    // rig: translate then rotate about the grip anchor (CSS origin)
    rig.style.transform = `translate3d(${f1(ax)}px,${f1(ay)}px,0) rotate(${f1(th * 10) / 10}deg)`;

    // liquid inside the flask: world-horizontal surface that never rises above the lip
    const lipLow = 38 * sn - 182 * cs;
    const ys = Math.max(-20, lipLow);
    liq.setAttribute('transform', `rotate(${f1(-th)} ${ancX} ${ancY}) translate(${ancX} ${f1(ancY + ys)})`);

    // mouth in stage coordinates
    const lx = VES.rimRx * 0.78 * k;
    const ly = (VES.rimY - ancY) * k;
    mx = L.A0[0] + ax + lx * cs - ly * sn;
    my = L.A0[1] + ay + lx * sn + ly * cs;

    // landing point on the chalice liquid
    const d = D * (1 - clamp(S.fill, 0, 1) * 0.96);
    ex = L.bowl.x;
    ey = L.bowl.rimY + d * bs;

    // chalice liquid
    const rx = (R - 6) * Math.sqrt(Math.max(0, 1 - (d / D) * (d / D)));
    blRect.forEach((e) => e.setAttribute('y', String(f1(d))));
    blSurf.setAttribute('cy', String(f1(d)));
    blSurf.setAttribute('rx', String(f1(Math.max(2, rx))));
    blSurf.setAttribute('ry', String(f1(Math.max(0.6, rx * (rimRy / R)))));
    const landed = S.g > 0.985 && S.flow > 0.02;
    blRip.forEach((e, i) => {
      const p = (time * 0.8 + i * 0.5) % 1;
      const r = Math.max(4, rx * (0.08 + 0.5 * p));
      e.setAttribute('cy', String(f1(d)));
      e.setAttribute('rx', String(f1(r)));
      e.setAttribute('ry', String(f1(r * (rimRy / R))));
      e.setAttribute('opacity', landed ? String(f1((1 - p) * 90) / 100) : '0');
    });

    // stream ribbon
    const flowing = S.flow > 0.01 && S.g > 0.01 && th > 60;
    if (!flowing) {
      stream.setAttribute('d', '');
      streamHi.setAttribute('d', '');
    } else {
      const s0 = clamp(-1 / Math.tan(rad), -0.12, 0.45);
      cx = (mx + ex) / 2;
      cy = my + s0 * (cx - mx);
      const g = S.g;
      const N = 26;
      const Lp: string[] = [];
      const Rp: string[] = [];
      const hi: string[] = [];
      for (let j = 0; j <= N; j++) {
        const t = (g * j) / N;
        const [px, py] = bez(t);
        const [tx, ty] = tan(t);
        let w = width(t, time, S.flow);
        if (g < 0.999) {
          const head = Math.min(1, ((N - j) / N) * (N / 3));
          w *= Math.sqrt(head);
        }
        const nx = -ty;
        const ny = tx;
        Lp.push(`${f1(px + nx * w * 0.5)} ${f1(py + ny * w * 0.5)}`);
        Rp.push(`${f1(px - nx * w * 0.5)} ${f1(py - ny * w * 0.5)}`);
        if (j > 1 && j < N - 1) hi.push(`${f1(px + nx * w * 0.22)} ${f1(py + ny * w * 0.22)}`);
      }
      stream.setAttribute('d', `M${Lp.join('L')}L${Rp.reverse().join('L')}Z`);
      streamHi.setAttribute('d', hi.length > 2 ? `M${hi.join('L')}` : '');
    }

    // droplets beside the stream
    const active = flowing && S.g > 0.7;
    drops.forEach((el, i) => {
      const ds = dropState[i];
      if (!frozen) {
        if (ds.on) {
          ds.u += dt * ds.speed * 0.9;
          if (ds.u >= 1) ds.on = false;
        }
        if (!ds.on && active && dt > 0 && Math.random() < dt * (ds.extra ? 5 * H.v : 1.6)) {
          if (!ds.extra || H.v > 0.05) {
            ds.on = true;
            ds.u = 0;
            ds.lat = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * (ds.extra ? 2.2 : 1));
            ds.size = (3 + Math.random() * 3.2) * (L.key === 'mob' ? 0.8 : 1);
          }
        }
      }
      if (!ds.on || !active) {
        el.setAttribute('opacity', '0');
        return;
      }
      const u = clamp(ds.u, 0, 1);
      const [px, py] = bez(u);
      const [tx, ty] = tan(u);
      const off = (width(u, time, S.flow) * 0.5 + 6 + 14 * u) * ds.lat;
      const x = px - ty * off;
      const y = py + tx * off;
      const ang = (Math.atan2(ty, tx) * 180) / Math.PI - 90;
      const fade = Math.min(1, u * 12) * (u > 0.94 ? (1 - u) / 0.06 : 1);
      el.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})`);
      el.setAttribute('rx', String(f1(ds.size)));
      el.setAttribute('ry', String(f1(ds.size * 1.3)));
      el.setAttribute('opacity', String(f1(fade * 100) / 100));
    });

    // splash crown where the stream meets the liquid
    const amp = landed ? S.flow * (0.7 + 0.5 * H.v) : 0;
    petals.forEach((el, i) => {
      if (amp < 0.02) {
        el.setAttribute('opacity', '0');
        return;
      }
      const a = -66 + (132 * i) / (petals.length - 1);
      const wob = 0.82 + 0.28 * Math.sin(time * 13 + i * 1.9);
      const edge = 1 - Math.abs(a) / 90;
      const sc = amp * wob * (0.45 + 0.55 * edge) * 0.8 * (L.key === 'mob' ? 0.8 : 1);
      el.setAttribute('opacity', '1');
      el.setAttribute(
        'transform',
        `translate(${f1(ex + a * 0.32 * amp)} ${f1(ey + 1)}) rotate(${f1(a)}) scale(${f1(0.55 * sc * 100) / 100} ${f1(sc * 100) / 100})`,
      );
    });

    // soaked ground: an ellipse that grows out of each landing point
    L.terraces.forEach((t, i) => {
      const w = S.wet[i] ?? 0;
      if (w === lastWet[i]) return;
      lastWet[i] = w;
      const e = wetc[i];
      e.setAttribute('rx', String(f1(w * t.wetRx)));
      e.setAttribute('ry', String(f1(w * t.wetRy)));
      e.setAttribute('cy', String(t.y - 6));
    });

    // plants: idle sway, a shiver when a drop lands
    swayT += dt;
    if (!frozen && swayT > 0.032) {
      swayT = 0;
      L.sprouts.forEach((s, i) => {
        const gr = clamp(((S.gr[i] ?? 0) - 0.5) * 2, 0, 1);
        hit[i] *= 0.92;
        const a = gr * (1.15 * Math.sin(time * 1.25 + swayPhase[i]) + 0.5 * Math.sin(time * 2.3 + swayPhase[i] * 2)) + hit[i] * Math.sin(time * 15);
        sways[i].setAttribute('transform', Math.abs(a) < 0.01 ? '' : `rotate(${f1(a * 100) / 100} ${s.x} ${s.gy})`);
        tagEls[i].style.rotate = gr > 0 ? `${f1((a * 0.5 + gr * 0.4 * Math.sin(time * 1.5 + swayPhase[i])) * 10) / 10}deg` : '0deg';
      });
    }

    // hold to pour, after the stream is gone: extra drops fall on the garden
    if (!frozen && dt > 0) {
      const camTop = clamp(S.focus - 0.5 * m.vhd, 0, m.camEnd);
      gdropEls.forEach((el, i) => {
        const g = gd[i];
        if (!g.on && S.germ > 0.05 && H.v > 0.08 && Math.random() < dt * 7 * H.v) {
          const live = L.sprouts
            .map((s, j) => ({ s, j }))
            .filter(({ s, j }) => (S.gr[j] ?? 0) > 0.4 && s.gy > camTop + 120 && s.gy < camTop + m.vhd + 40);
          if (live.length) {
            const { s, j } = live[Math.floor(Math.random() * live.length)];
            g.on = true;
            g.plant = j;
            g.x = s.x + (Math.random() - 0.5) * (L.key === 'mob' ? 70 : 150);
            g.land = s.gy - 12;
            g.y = Math.max(camTop - 20, s.gy - 560);
            g.vy = 120;
          }
        }
        if (g.on) {
          g.vy += 2100 * dt;
          g.y += g.vy * dt;
          if (g.y >= g.land) {
            g.on = false;
            L.sprouts.forEach((s, j) => {
              if (s.terrace === L.sprouts[g.plant].terrace && Math.abs(s.x - g.x) < (L.key === 'mob' ? 120 : 190)) hit[j] = Math.min(4, hit[j] + 2.2 * (1 - Math.abs(s.x - g.x) / 200));
            });
          }
        }
        if (g.on) {
          el.setAttribute('transform', `translate(${f1(g.x)} ${f1(g.y)})`);
          el.setAttribute('opacity', '1');
        } else el.setAttribute('opacity', '0');
      });
    } else if (frozen) {
      gdropEls.forEach((el) => el.setAttribute('opacity', '0'));
    }

    // camera: the stage pans down the tall world
    const f = m.f;
    const camY = mode === 'pin' ? clamp(S.focus - 0.5 * m.vhd, 0, m.camEnd) : 0;
    stage.style.transform = `translate3d(${f1(m.sx)}px,${f1(-camY * f)}px,0) scale(${f})`;
  };

  const freeze = () => {
    frozen = true;
    dropState.forEach((dd, i) => {
      dd.on = i % 2 === 0 && i < 10;
      dd.u = 0.12 + (i / 10) * 0.8;
      dd.extra = false;
    });
  };

  return { S, H, measure, render, freeze };
}
