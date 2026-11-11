import { useMemo } from 'react';
import type { ArchitectureItem } from '../config/portfolio';
import styles from './CaseStudy.module.css';

const INK = 'var(--black)';
const BURG = 'var(--burgundy)';
const CREAM = 'var(--cream)';
const LATTE = 'var(--latte)';

const BOX_H = 112;
const PAD = 14;
const SHADOW = 7;

interface Box {
  x: number;
  y: number;
  lines: string[];
  fill: string;
  text: string;
}

interface Link {
  d: string;
  head: string;
}

interface Layout {
  w: number;
  h: number;
  boxW: number;
  boxes: Box[];
  links: Link[];
}

/** Greedy word wrap on a character budget. */
function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(' ')) {
    if (cur && (cur + ' ' + word).length > max) {
      lines.push(cur);
      cur = word;
    } else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Snake layout: rows run left to right, then right to left, so the flow never jumps. */
function layout(items: ArchitectureItem[], cols: number, boxW: number, gapX: number, gapY: number): Layout {
  const n = items.length;
  const rows = Math.ceil(n / cols);
  const w = cols * boxW + (cols - 1) * gapX + PAD * 2 + SHADOW;
  const h = rows * BOX_H + (rows - 1) * gapY + PAD * 2 + SHADOW;
  const maxChars = Math.floor((boxW - 36) / 11.4);

  const pos = items.map((_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const col = r % 2 === 0 ? c : cols - 1 - c;
    return { x: PAD + col * (boxW + gapX), y: PAD + r * (BOX_H + gapY), r, col };
  });

  const boxes: Box[] = items.map((it, i) => {
    const last = i === n - 1 && n > 1;
    const fill = last ? BURG : i % 2 === 0 ? CREAM : LATTE;
    return { x: pos[i].x, y: pos[i].y, lines: wrap(it.component, maxChars).slice(0, 3), fill, text: last ? CREAM : INK };
  });

  const links: Link[] = [];
  const AH = 9;
  for (let i = 0; i < n - 1; i++) {
    const a = pos[i];
    const b = pos[i + 1];
    if (a.r === b.r) {
      const dir = b.col > a.col ? 1 : -1;
      const y = a.y + BOX_H / 2;
      const x0 = dir > 0 ? a.x + boxW : a.x;
      const x1 = dir > 0 ? b.x : b.x + boxW;
      links.push({ d: `M${x0} ${y}H${x1 - dir * 1}`, head: `M${x1} ${y}l${-dir * AH * 1.5} ${-AH * 0.8}v${AH * 1.6}z` });
    } else {
      const x = a.x + boxW / 2;
      const y0 = a.y + BOX_H;
      const y1 = b.y;
      // Same column: drop straight down. (Snake layout guarantees this for cols > 1.)
      links.push({ d: `M${x} ${y0}V${y1 - 1}`, head: `M${x} ${y1}l${-AH * 0.8} ${-AH * 1.5}h${AH * 1.6}z` });
    }
  }
  return { w, h, boxW, boxes, links };
}

function Diagram({ lay, className, label }: { lay: Layout; className: string; label: string }) {
  const lineH = 25;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${lay.w} ${lay.h}`}
      style={{ maxWidth: lay.w }}
      role="img"
      aria-label={label}
    >
      {lay.links.map((l, i) => (
        <g key={i} data-link>
          <path d={l.d} stroke={INK} strokeWidth="2.6" fill="none" />
          <path d={l.head} fill={INK} />
        </g>
      ))}
      {lay.boxes.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y})`}>
          <g data-box>
          <rect x={SHADOW} y={SHADOW} width={lay.boxW} height={BOX_H} fill={INK} />
          <rect width={lay.boxW} height={BOX_H} fill={b.fill} stroke={INK} strokeWidth="2.6" />
          <path d={`M${lay.boxW - 40} 0H${lay.boxW}V40Z`} fill="url(#hatch-diag-fine)" />
          <path d={`M${lay.boxW - 40} 0L${lay.boxW} 40`} stroke={INK} strokeWidth="1.6" />
          <text x="18" y="28" fontFamily="'JetBrains Mono', monospace" fontSize="12" letterSpacing="2" fill={b.text === CREAM ? LATTE : BURG}>
            {String(i + 1).padStart(2, '0')}
          </text>
          <text fontFamily="'Bodoni Moda', Georgia, serif" fontSize="22" fontWeight="500" fill={b.text}>
            {b.lines.map((ln, k) => (
              <tspan key={k} x="18" y={60 + k * lineH}>
                {ln}
              </tspan>
            ))}
          </text>
          </g>
        </g>
      ))}
    </svg>
  );
}

interface Props {
  items: ArchitectureItem[];
}

/**
 * Engraved box-and-line diagram laid out from the architecture array.
 * Two layouts (multi-column and single column) are toggled with CSS, so text
 * stays legible at 360px without measuring anything in JS.
 */
export default function ArchitectureDiagram({ items }: Props) {
  const label = `Architecture diagram: ${items.map((i) => i.component).join(', then ')}.`;
  const wide = useMemo(() => layout(items, items.length <= 4 ? 2 : 3, 262, 64, 62), [items]);
  const narrow = useMemo(() => layout(items, 1, 300, 0, 40), [items]);
  return (
    <>
      <Diagram lay={wide} className={styles.diagWide} label={label} />
      <Diagram lay={narrow} className={styles.diagNarrow} label={label} />
    </>
  );
}
