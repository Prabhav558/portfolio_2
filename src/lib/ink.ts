/**
 * Ink reveal: the theme change is revealed by spreading ink that grows out of the
 * toggle. A View Transition keeps the old page as the base layer and shows the
 * live new page through an organic mask, redrawn every frame as a vector
 * `clip-path` (see `html.ink-vt` rules in global.css).
 *
 * The mask is an implicit field, phi > 0 = new theme, polygonised each frame with
 * marching squares: a domain-warped fbm ragged edge, thin radial veins that run
 * ahead of the front, old-theme strands that trail behind it, loose droplets, and
 * pockets of the old theme that survive as islands until the very end.
 */
import { mulberry32 } from './random';

export interface InkOrigin {
  x: number;
  y: number;
}

const DURATION = 2300; // ms
const EMPTY_CLIP = 'path("M0 0Z")';

/* ---------- gradient noise (2D Perlin, deterministic) ---------- */

const PERM = new Uint8Array(512);
const GX = new Float32Array(256);
const GY = new Float32Array(256);
{
  const rnd = mulberry32(0x1d0c5a);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  for (let i = 0; i < 256; i++) {
    const a = rnd() * Math.PI * 2;
    GX[i] = Math.cos(a);
    GY[i] = Math.sin(a);
  }
}

/** Roughly -1..1. */
function noise(x: number, y: number): number {
  const xf0 = Math.floor(x);
  const yf0 = Math.floor(y);
  const xf = x - xf0;
  const yf = y - yf0;
  const X = xf0 & 255;
  const Y = yf0 & 255;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const aa = PERM[PERM[X] + Y];
  const ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y];
  const bb = PERM[PERM[X + 1] + Y + 1];
  const n00 = GX[aa] * xf + GY[aa] * yf;
  const n10 = GX[ba] * (xf - 1) + GY[ba] * yf;
  const n01 = GX[ab] * xf + GY[ab] * (yf - 1);
  const n11 = GX[bb] * (xf - 1) + GY[bb] * (yf - 1);
  const x0 = n00 + u * (n10 - n00);
  const x1 = n01 + u * (n11 - n01);
  return (x0 + v * (x1 - x0)) * 1.41;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* ---------- the ink field ---------- */

interface Field {
  /** Size factor so the effect looks the same on a phone and a 4k monitor. */
  k: number;
  ox: number;
  oy: number;
  amp: number;
  big: number;
  warp: number;
  vein: number;
  trail: number;
  drop: number;
  rMax: number;
  rEnd: number;
}

function makeField(W: number, H: number, o: InkOrigin): Field {
  const k = Math.hypot(W, H) / 1700;
  const amp = 115 * k;
  const big = 300 * k;
  const vein = 58 * k;
  const trail = 170 * k;
  const rMax = Math.max(
    Math.hypot(o.x, o.y),
    Math.hypot(W - o.x, o.y),
    Math.hypot(o.x, H - o.y),
    Math.hypot(W - o.x, H - o.y),
  );
  return {
    k,
    ox: o.x,
    oy: o.y,
    amp,
    big,
    warp: 95 * k,
    vein,
    trail,
    drop: 30 * k,
    rMax,
    // worst case: the edge noise and the trailing strand both pull phi down
    rEnd: rMax + amp * 1.95 + big * 1.3 + trail + 60 * k,
  };
}

/** Signed field in px: > 0 means "already the new theme". `r` = front radius, `time` in s. */
function phi(f: Field, x: number, y: number, r: number, time: number): number {
  const { k, ox, oy } = f;
  const dx = x - ox;
  const dy = y - oy;
  const d = Math.sqrt(dx * dx + dy * dy);
  const inside = r - d;

  // domain warp: gives the front its swirling, marbled bays
  const fw = 0.0021 / k;
  const qx = x + noise(x * fw + time * 0.25, y * fw + 7.3) * f.warp;
  const qy = y + noise(x * fw + 19.1, y * fw - time * 0.2) * f.warp;

  // ragged edge: four octaves in warped space; small blobs stay round with a fringe
  const fe = 0.0042 / k;
  const n =
    noise(qx * fe + 3.1, qy * fe + time * 0.3) +
    0.5 * noise(qx * fe * 2.1 + 11.7, qy * fe * 2.1 - time * 0.4) +
    0.25 * noise(qx * fe * 4.3 + 5.2, qy * fe * 4.3 + time * 0.5) +
    0.07 * noise(qx * fe * 8.9 + 23.9, qy * fe * 8.9);
  const edgeAmp = Math.min(f.amp, 0.5 * r + 6 * k) / 1.15;
  let v = inside + n * edgeAmp;

  // wide lobes: the front surges ahead in some directions and lags in others, so big
  // bays of the old theme survive late (this is what makes it read as fluid, not a circle)
  const lo = 0.00105 / k;
  v += noise(qx * lo + 51.3, qy * lo + 17.9 + time * 0.08) * f.big * smooth(120 * k, 700 * k, r);

  const qdx = qx - ox;
  const qdy = qy - oy;
  const qd = Math.sqrt(qdx * qdx + qdy * qdy);
  const th = Math.atan2(qdy, qdx);

  // thin curved veins reaching ahead of the front
  const m = noise(th * 4.2 + 3.7, qd * (0.0016 / k) + time * 0.15);
  v += f.vein * Math.exp(-(m * m) / 0.006) * smooth(70 * k, 260 * k, r);

  // strands of the old theme left behind inside the new one
  const m2 = noise(th * 6.5 + 9.1, qd * (0.0022 / k) - time * 0.1 + 5);
  v -= f.trail * Math.exp(-(m2 * m2) / 0.005) * smooth(0, 30 * k, inside) * smooth(110 * k, 330 * k, r);

  // loose droplets just ahead of the front
  const hf = noise(x * (0.034 / k) + 40, y * (0.034 / k) + 11 + time * 0.5);
  const ahead = Math.exp(-((d - r) * (d - r)) / (110 * k * 110 * k));
  v += f.drop * smooth(0.62, 0.78, hf) * ahead * smooth(40 * k, 200 * k, r);

  return v;
}

/* ---------- marching squares -> one SVG path ---------- */

const COARSE = 4; // fine cells per coarse cell

class Contourer {
  readonly cs: number;
  readonly NX: number;
  readonly NY: number;
  private readonly F: Float32Array;
  private readonly have: Uint8Array;
  private readonly nxt: Int32Array;
  private readonly seen: Uint8Array;
  private readonly NCX: number;
  private readonly NCY: number;
  private readonly cphi: Float32Array;
  private readonly HN: number;

  /** `level` coarsens the grid (cheaper frames) on slow devices. */
  constructor(private readonly W: number, private readonly H: number, private readonly f: Field, level = 0) {
    this.cs = Math.max(4, Math.min(6, Math.round(5 * f.k + 1))) + level * 2;
    // one ring of padding nodes, forced "outside", closes every contour off-screen
    this.NX = Math.ceil(W / this.cs) + 3;
    this.NY = Math.ceil(H / this.cs) + 3;
    this.F = new Float32Array(this.NX * this.NY);
    this.have = new Uint8Array(this.NX * this.NY);
    this.HN = this.NX * this.NY;
    this.nxt = new Int32Array(this.HN * 2);
    this.seen = new Uint8Array(this.HN * 2);
    this.NCX = Math.ceil((this.NX - 1) / COARSE) + 1;
    this.NCY = Math.ceil((this.NY - 1) / COARSE) + 1;
    this.cphi = new Float32Array(this.NCX * this.NCY);
  }

  path(r: number, time: number): string {
    const { NX, NY, cs, F, have, f } = this;
    const thr = 80 * f.k;
    const px = (i: number) => (i - 1) * cs;
    have.fill(0);

    // 1. coarse samples
    const { NCX, NCY, cphi } = this;
    for (let cj = 0; cj < NCY; cj++)
      for (let ci = 0; ci < NCX; ci++)
        cphi[cj * NCX + ci] = phi(f, px(ci * COARSE), px(cj * COARSE), r, time);

    // 2. refine only the coarse cells that can hold the contour
    for (let cj = 0; cj < NCY - 1; cj++) {
      for (let ci = 0; ci < NCX - 1; ci++) {
        const a = cphi[cj * NCX + ci];
        const b = cphi[cj * NCX + ci + 1];
        const c = cphi[(cj + 1) * NCX + ci + 1];
        const d = cphi[(cj + 1) * NCX + ci];
        const pos = a > 0 && b > 0 && c > 0 && d > 0;
        const neg = a < 0 && b < 0 && c < 0 && d < 0;
        const far = Math.min(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) >= thr;
        if ((pos || neg) && far) continue;
        const j1 = Math.min(cj * COARSE + COARSE, NY - 1);
        const i1 = Math.min(ci * COARSE + COARSE, NX - 1);
        for (let j = cj * COARSE; j <= j1; j++) {
          for (let i = ci * COARSE; i <= i1; i++) {
            const idx = j * NX + i;
            if (have[idx]) continue;
            F[idx] = phi(f, px(i), px(j), r, time);
            have[idx] = 1;
          }
        }
      }
    }
    // untouched nodes take the (same-signed) mean of their coarse cell
    for (let j = 0; j < NY; j++) {
      const cj = Math.min(Math.floor(j / COARSE), NCY - 2);
      for (let i = 0; i < NX; i++) {
        const idx = j * NX + i;
        if (have[idx]) continue;
        const ci = Math.min(Math.floor(i / COARSE), NCX - 2);
        F[idx] =
          (cphi[cj * NCX + ci] + cphi[cj * NCX + ci + 1] + cphi[(cj + 1) * NCX + ci] + cphi[(cj + 1) * NCX + ci + 1]) / 4;
      }
    }
    // 3. padding ring is always outside
    for (let i = 0; i < NX; i++) {
      F[i] = -1e3;
      F[(NY - 1) * NX + i] = -1e3;
    }
    for (let j = 0; j < NY; j++) {
      F[j * NX] = -1e3;
      F[j * NX + NX - 1] = -1e3;
    }

    return this.trace();
  }

  /** Marching squares with "inside on the left" orientation, then loop following. */
  private trace(): string {
    const { NX, NY, F, nxt, seen, HN } = this;
    nxt.fill(-1);
    seen.fill(0);
    const link = (s: number, e: number) => {
      nxt[s] = e;
    };
    for (let j = 0; j < NY - 1; j++) {
      for (let i = 0; i < NX - 1; i++) {
        const a = F[j * NX + i];
        const b = F[j * NX + i + 1];
        const c = F[(j + 1) * NX + i + 1];
        const d = F[(j + 1) * NX + i];
        const idx = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const T = j * NX + i;
        const B = (j + 1) * NX + i;
        const L = HN + j * NX + i;
        const R = HN + j * NX + i + 1;
        switch (idx) {
          case 8: link(T, L); break;
          case 4: link(R, T); break;
          case 2: link(B, R); break;
          case 1: link(L, B); break;
          case 12: link(R, L); break;
          case 6: link(B, T); break;
          case 3: link(L, R); break;
          case 9: link(T, B); break;
          case 7: link(L, T); break;
          case 11: link(T, R); break;
          case 13: link(R, B); break;
          case 14: link(B, L); break;
          case 10:
            if ((a + b + c + d) / 4 > 0) { link(T, R); link(B, L); } else { link(T, L); link(B, R); }
            break;
          case 5:
            if ((a + b + c + d) / 4 > 0) { link(L, T); link(R, B); } else { link(R, T); link(L, B); }
            break;
        }
      }
    }

    const out: string[] = [];
    const num = (v: number) => Math.round(v * 2) / 2;
    const px: number[] = [];
    const py: number[] = [];
    for (let e0 = 0; e0 < nxt.length; e0++) {
      if (nxt[e0] < 0 || seen[e0]) continue;
      px.length = 0;
      py.length = 0;
      let e = e0;
      do {
        seen[e] = 1;
        this.edgePoint(e, px, py);
        e = nxt[e];
      } while (e >= 0 && e !== e0 && !seen[e]);
      // off-screen border runs are collinear once clamped: drop every redundant point
      let n = px.length;
      if (n < 3) continue;
      const lo = -2;
      const hiX = this.W + 2;
      const hiY = this.H + 2;
      const kx: number[] = [];
      const ky: number[] = [];
      for (let q = 0; q < n; q++) {
        const x = Math.min(hiX, Math.max(lo, px[q]));
        const y = Math.min(hiY, Math.max(lo, py[q]));
        const xp = Math.min(hiX, Math.max(lo, px[(q + n - 1) % n]));
        const yp = Math.min(hiY, Math.max(lo, py[(q + n - 1) % n]));
        const xn = Math.min(hiX, Math.max(lo, px[(q + 1) % n]));
        const yn = Math.min(hiY, Math.max(lo, py[(q + 1) % n]));
        if (Math.abs((x - xp) * (yn - y) - (y - yp) * (xn - x)) < 0.01) continue;
        kx.push(x);
        ky.push(y);
      }
      n = kx.length;
      if (n < 3) continue;
      // closed quadratic smoothing through edge midpoints: soft, organic outline
      out.push(`M${num((kx[n - 1] + kx[0]) / 2)} ${num((ky[n - 1] + ky[0]) / 2)}`);
      for (let q = 0; q < n; q++) {
        const q1 = (q + 1) % n;
        out.push(`Q${num(kx[q])} ${num(ky[q])} ${num((kx[q] + kx[q1]) / 2)} ${num((ky[q] + ky[q1]) / 2)}`);
      }
      out.push('Z');
    }
    return out.length ? out.join('') : 'M0 0Z';
  }

  private edgePoint(e: number, px: number[], py: number[]) {
    const { NX, cs, F, HN } = this;
    if (e < HN) {
      const i = e % NX;
      const j = (e / NX) | 0;
      const fa = F[j * NX + i];
      const fb = F[j * NX + i + 1];
      px.push((i - 1 + fa / (fa - fb)) * cs);
      py.push((j - 1) * cs);
    } else {
      const e2 = e - HN;
      const i = e2 % NX;
      const j = (e2 / NX) | 0;
      const fa = F[j * NX + i];
      const fb = F[(j + 1) * NX + i];
      px.push((i - 1) * cs);
      py.push((j - 1 + fa / (fa - fb)) * cs);
    }
  }
}

/* ---------- the transition ---------- */

/**
 * Front radius over normalised time p: a small splat that accelerates once it has
 * room. The front crosses the screen around p = 0.8; what is left after that is the
 * lagging bays, which shrink into islands and drops until the end.
 */
function frontRadius(f: Field, p: number): number {
  return f.rEnd * 0.9 * Math.pow(p, 1.35);
}

/**
 * Run `update` (which flips the theme) inside a view transition and reveal the
 * result through spreading ink. Resolves once the transition is over.
 */
export function inkTransition(origin: InkOrigin, update: () => void, duration = DURATION): Promise<void> {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void>; skipTransition(): void };
  };
  if (!doc.startViewTransition) {
    update();
    return Promise.resolve();
  }

  const root = document.documentElement;
  const W = window.innerWidth;
  const H = window.innerHeight;
  const field = makeField(W, H, origin);
  let level = 0;
  let contour = new Contourer(W, H, field, level);
  let cost = 0; // smoothed ms per mask

  root.classList.add('ink-vt');
  root.style.setProperty('--ink-clip', EMPTY_CLIP);
  const vt = doc.startViewTransition(update);

  const cleanup = () => {
    root.classList.remove('ink-vt');
    root.style.removeProperty('--ink-clip');
  };

  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };
    vt.finished.then(finish, finish);
    vt.ready.then(
      () => {
        const t0 = performance.now();
        const tick = (now: number) => {
          if (done) return;
          const p = (now - t0) / duration;
          if (p >= 1) {
            root.style.setProperty('--ink-clip', 'none');
            vt.skipTransition();
            return;
          }
          const r = frontRadius(field, Math.max(0, p));
          const t1 = performance.now();
          const d = contour.path(r, p * (duration / 1000));
          cost = cost ? cost * 0.7 + (performance.now() - t1) * 0.3 : performance.now() - t1;
          root.style.setProperty('--ink-clip', `path("${d}")`);
          // slow device: coarsen the grid instead of dropping frames
          if (cost > 11 && level < 2) {
            level++;
            contour = new Contourer(W, H, field, level);
            cost = 0;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      finish,
    );
  });
}

/** The mask path at normalised progress `p` (0..1). Exposed for tests and previews. */
export function inkMaskPath(W: number, H: number, origin: InkOrigin, p: number, duration = DURATION): string {
  const field = makeField(W, H, origin);
  return new Contourer(W, H, field).path(frontRadius(field, p), p * (duration / 1000));
}
