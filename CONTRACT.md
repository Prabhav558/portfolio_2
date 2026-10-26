# Prabhav Singh portfolio: build contract

This site is the personal portfolio of Prabhav Singh, built on the NOCTURNE illustrated scroll engine. The art-book look and all technical rules below still apply; the copy and palette changed.

Read this whole file before writing code. Read every file it names under "Foundation"; they are short.

## Stack
Vite 5 + React 18 + TypeScript (strict, `noUnusedLocals`) + GSAP 3.12 / ScrollTrigger. CSS Modules (`*.module.css`) plus the globals in `src/styles/`.
**Do not run `npm install` and do not edit `package.json`.** Every dependency is already installed.
Verify your work with `npx tsc -b` from the project root. It must pass with zero errors. Don't start the dev server; it is already running at http://localhost:5173 with HMR.
**Visual check (required):** from `C:\Users\prabh\AppData\Local\Temp\claude\c--Users-prabh-Desktop-portfolio-red\3c87fee2-d70c-4ac2-9c1f-d62348edace5\scratchpad\shot`, run
`node shot.mjs <width> <height> out/<yourPrefix> "<chapterId>:0.1,<chapterId>:0.5,<chapterId>:1" [reduced]`.
The last argument is a comma list of `chapterId:progress` (0..1 through that chapter's pinned span). The script prints section offsets plus console errors and writes PNGs. Look at them with the Read tool. Check 1440x900, 390x844, and `reduced`. Use a unique prefix (your chapter id), because other agents share the folder.

## Foundation (read-only for agents; ask the lead for changes)
- `src/styles/tokens.css`: colors, fonts, type scale, z-index. Use the `var(--…)` tokens. Never hard-code other colors.
  **Palette (burgundy dominant, cream paper, latte accent):** `--burgundy #722F37`, `--burgundy-deep #4A1D23`, `--cream #E8DCC6`, `--latte #B7A89A`, `--ink #111111`, `--black #050505`. `--accent` = latte. Legacy aliases still resolve: `--red` = burgundy, `--red-deep` = burgundy-deep, `--paper` = cream, `--gray` = latte, `--blue` = accent. Prefer the new names in new code.
  **ACCENT RULE:** on dark or burgundy grounds use latte as the narrative accent; on cream grounds use burgundy. Never blue. Ink lines and hairlines stay black. In SVG you may write the six hex values directly (and nothing else).
- `src/styles/global.css`: `.chapter` (100svh stage, overflow hidden), `.layer` (absolute full-bleed), `.raster` (scan-line mask driven by `--raster-fill` 0..1 and `--raster-w`), `.caption` / `.caption--dark` (paper narrator box), `.label` (mono micro label), `.display` (Bodoni display), `.sr-only`.
- `src/lib/gsap.ts`: **always import `gsap`, `ScrollTrigger`, `MQ` and `vh` from here**, never from `'gsap'` directly. `MQ` is calm-aware (see Calm mode).
- `src/lib/transitions.ts`: `rasterReveal`, `rasterDissolve`, `wipe`, `iris`. These return tweens you can nest in timelines. The raster one is the signature transition: use it at least once per chapter, on an element with the `.raster` class.
- `src/lib/random.ts`: `mulberry32(seed)` for deterministic procedural art. Generate geometry inside `useMemo`, never per frame.
- `src/config/chapters.ts`: chapter ids `home | about | work | process | experience | contact` (numerals I to VI), labels, and pin lengths (`pin.desktop` and `pin.mobile`, in viewport heights; work is 5.0 / 3.2). Use `chapterById('work')` etc.
- `src/config/brand.ts`: name, tagline, subtitle, edition. Never hard-code the name; use `brand.name` or `<Wordmark/>` (`src/components/Wordmark.tsx`, props `size`, `split`, `as`). The wordmark is roman PRABHAV plus an italic Singh; with `split`, letters are `.wm-char` spans (the italic part is a separate word with a space before it).
- `src/config/portfolio.ts`: **content rule: all personal copy and facts come from here (and brand.ts).** Never hard-code names, roles, dates, metrics, links or project text in a chapter, and never invent facts. Exports: `person`, `projects`, `getProject(slug)`, `experience`, `education`, `certifications`, `achievements`, `skills`, `spokenLanguages`, `processSteps`, `sectionLines` (keyed by chapter id), plus their types. The phone number is deliberately absent; keep it off the site.
- `src/components/SvgDefs.tsx` defines global SVG defs you can reference with `url(#id)`:
  filters `ink-rough`, `ink-bleed`, `misregister`, `paper-grain`; patterns `hatch-diag`, `hatch-diag-fine`, `hatch-cross`, `scan-v`, `scan-h`, `halftone`, `halftone-paper`.
  Use filters sparingly: apply them to static groups only, never animate filter attributes, and never put them on full-viewport elements that move every frame.
- `src/art/`: the shared illustration library (Hand, Figure, Colonnade, procedural helpers). Read `src/art/README.md` for its API. Do not redraw a hand or figure that already exists there; import it.

## Chapter rules
1. You own only your chapter folder `src/chapters/<id>/`. Don't create or edit files anywhere else. If you need a shared change, describe it in your final report.
2. Root element: `<section id={chapter.id} className={\`chapter ${styles.root}\`} tabIndex={-1} aria-labelledby=…>`, with a real heading (it can be visually hidden) and any narrator text in real DOM, so content never exists only inside an animation. Decorative SVG gets `aria-hidden="true"`. Meaningful illustration gets `role="img"` and an `aria-label`.
3. All animation lives in a single `useLayoutEffect`:
   ```ts
   useLayoutEffect(() => {
     const ctx = gsap.context(() => {
       const mm = gsap.matchMedia();
       mm.add(MQ.desktop, () => { /* full timeline */ });
       mm.add(MQ.mobile, () => { /* shorter pin (chapter.pin.mobile), fewer layers */ });
       mm.add(MQ.reduced, () => { /* no pin, no scrub: set the final readable state */ });
     }, rootRef);
     return () => ctx.revert();
   }, []);
   ```
   StrictMode double-mounts, so `ctx.revert()` is mandatory. Never call `ScrollTrigger.refresh()` or `ScrollTrigger.sort()`; App does that.
4. Pinning: pin only your own section:
   `scrollTrigger: { trigger: root, start: 'top top', end: () => '+=' + innerHeight * chapter.pin.desktop, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true }`.
   Use the pin lengths from `chapters.ts` (you may read them, but don't change them). Every timeline needs a clear beginning, middle and end. Leave a short hold (an empty `.to({}, {duration: 0.3})`) at the end so the composition rests before the next chapter.
4b. **Use `fromTo()` (explicit end values), never `from()`, in any scroll-driven timeline.** With `invalidateOnRefresh: true`, `from()` tweens re-record their hidden start as the end state after App's refresh and stay invisible forever.
5. Animate only `transform`, `opacity`, `clip-path`, and the `--raster-fill` CSS variable. Don't animate layout properties or filters. Don't call React `setState` during scroll.
6. Cursor contract: put `data-cursor-label="Short\nText"` on a region to show a labelled circle cursor (two words maximum, written in our own voice; never "Hold & Move"). Use `data-cursor="hover"` for an enlarged ring. Never import cursor code.
7. Responsive: on mobile (≤768px), recompose the scene; don't just shrink it. Prevent horizontal overflow, since every layer stays inside the section's overflow: hidden. Use `preserveAspectRatio="xMidYMid slice"` for full-bleed scene SVGs, and draw a different composition or viewBox for mobile where needed (you can render both and toggle them with CSS media queries).
8. Reduced motion: every piece of content must be visible and composed in its final state.
8b. **Calm mode.** A nav toggle stores `localStorage.calm = '1'` and reloads. `<html>` gets class `calm`, and `MQ.desktop`/`MQ.mobile` become `'not all'` while `MQ.reduced` becomes `'all'`, so your existing reduced-motion branch runs automatically (JS needs no extra work). For CSS, **mirror every `@media (prefers-reduced-motion: reduce)` rule you write under `:root.calm`** (same declarations). Globals (raster mask off, auto scroll-behavior) are already handled in `global.css`. Test both `reduced` and calm.
9. Code style: function components, default export, CSS Modules, concise comments only where the intent isn't obvious. No external images, so all art is inline SVG/CSS. No new dependencies.

## Art direction (shared by all)
- The look is an illustrated art book turned interactive: engraved and woodcut hatching, black ink outlines with imperfect contours, screen-print flats, paper grain, strong negative space.
- Hard burgundy / black / cream fields (latte accents), often split into horizontal comic-strip bands with a 1.5–3px black hairline between them.
- Vertical scan-line rasters (stripes) are the signature texture and transition. Scenes "smear" into stripes as they enter and leave.
- Shading uses parallel line hatching (engraving), not gradients. Avoid CSS gradients except as stripe or mask generators.
- Avoid generic web tropes: no rounded cards, glassmorphism, drop shadows other than the hard offset print shadow (black on cream, burgundy on dark), or SaaS layouts.
- Narrator captions use `.caption` boxes: short, literary, uppercase, in our own words.

## Portfolio mapping (replaces the NOCTURNE story)
The chapter files still live in the old folders (arrival, threshold, gallery, transformation, revelation, finale); the ids and content are new.
- **I. home** (`arrival/`): Hero. Wordmark, role, pitch, section line, availability, Résumé and contact calls to action.
- **II. about** (`threshold/`): About. The gate frames the portrait (or the Keeper silhouette while `person.portrait` is null), motto inscription, bio, stats.
- **III. work** (`gallery/`): Selected Work. An intro plus three project rooms (Sentrix `shield`, SystemLens `pipeline`, SafePath `route`), each with a link to its case study at `#/work/<slug>`.
- **IV. process** (`transformation/`): Process & Skills. Discover, Design, Build, Ship (`processSteps`) plus skill groups.
- **V. experience** (`revelation/`): Experience timeline: roles, education, certifications, achievements.
- **VI. contact** (`finale/`): Contact. Email, GitHub, LinkedIn, location, résumé download.

## Routing
Hash routing, no router library. `#/work/<slug>` renders `src/pages/CaseStudy.tsx` instead of the chapters (chapters unmount; their `gsap.context` reverts run). Case-study links should be `<a href="#/work/sentrix">`. Any other hash shows the chapters; `#work`, `#about` etc. scroll to that chapter on mount and on `hashchange`. The skip link ("Skip to work") targets `#work`.
