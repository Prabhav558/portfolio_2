# Prabhav Singh — Portfolio

My personal portfolio, built as an engraved, art-book style site told in six scroll-driven chapters. The look is a woodcut / engraving treatment in a burgundy, mocha cream and cosmic latte palette, with Bodoni Moda for display type. All illustration is generated as SVG in code; there are no raster images in the artwork.

Live: https://prabhav558.github.io/portfolio_2/

Repository: [github.com/Prabhav558/portfolio_2](https://github.com/Prabhav558/portfolio_2)

## Highlights

- Six pinned, scroll-driven chapters, sequenced with GSAP ScrollTrigger
- Procedural engraved SVG illustration (hatching, woodgrain, columns, figures, a hand), seeded so it is deterministic
- An engraved hand that follows the cursor on desktop; hold to ink the grain in the opening chapter
- Hold-to-pour interaction in the Process & Skills chapter
- Case-study pages for each project at `#/work/<slug>`, with architecture breakdowns
- Dark / light theme toggle in the nav: the new theme is revealed as spreading ink that grows out of the toggle (`src/lib/ink.ts`). Dark is the original palette; the light palette lives in one block in `src/styles/tokens.css`
- Calm mode toggle and `prefers-reduced-motion` support, each with a fully composed static layout
- "Skip to work" link and a keyboard-accessible chapter menu
- Responsive down to 360px wide

## Sections of the site

| Chapter | Folder | What it shows |
| --- | --- | --- |
| I. Introduction | `arrival` | Hero: name, pitch, and the hand-and-ink opening sequence |
| II. About | `threshold` | Short bio and key figures |
| III. Selected Work | `gallery` | Three projects (Sentrix, SystemLens, SafePath), each in its own "room" with engraved art, linking to its case study |
| IV. Process & Skills | `transformation` | How I work and my skill groups. Being redesigned as a sequence: pour, overflow, falling water, then a sprouting skills garden |
| V. Experience | `revelation` | Timeline of roles, plus education, certifications and achievements |
| VI. Contact | `finale` | Links, résumé download and availability |

## Tech stack

- React 18.3 and TypeScript 5.6
- Vite 5.4 (with `@vitejs/plugin-react`)
- GSAP 3.12 with ScrollTrigger for scroll choreography
- CSS Modules plus global design tokens
- Google Fonts: Bodoni Moda, Archivo, JetBrains Mono

There is no router library and no state library. Routing is hash-based (`#/work/<slug>` opens a case study, a chapter id such as `#work` scrolls to that chapter), and each chapter sits behind an error boundary so a failure in one does not take down the rest of the page.

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check (tsc -b) and produce a production build in dist/
npm run preview   # serve the production build locally
```

## Editing content

- Personal copy (bio, projects and case studies, experience, education, certifications, skills, process steps, contact links) lives in `src/config/portfolio.ts`.
- Name, wordmark, tagline and footer edition line live in `src/config/brand.ts`.
- Chapter order, labels and scroll lengths live in `src/config/chapters.ts`.
- Palette, type scale and spacing tokens live in `src/styles/tokens.css`.

The résumé download link points to `public/Prabhav-Singh-Resume.pdf`. That file is not committed to this repository, so add your own PDF at that path (or change `resumeUrl` in `portfolio.ts`) for the link to work.

## Project structure

```text
src/
  App.tsx            hash routing, chapter tracking, error boundaries, skip link
  main.tsx           entry point
  art/               shared procedural SVG library (Hand, Figure, Colonnade, Woodgrain, Shard, seeded helpers)
  chapters/
    arrival/         I.   Introduction (hero, cursor-following hand, ink)
    threshold/       II.  About
    gallery/         III. Selected Work
    transformation/  IV.  Process & Skills
    revelation/      V.   Experience
    finale/          VI.  Contact
  components/        Navigation, chapter progress, custom cursor, wordmark, shared SVG defs
  config/            chapters, brand, and all portfolio content
  lib/               GSAP setup, calm mode, scroll/progress store, transitions, seeded random
  pages/             case-study page and its art and architecture diagram
  styles/            design tokens and global styles
public/              favicon and social image (og.png)
```

Design and implementation conventions for chapters (breakpoints, reduced-motion handling, cursor opt-in attributes) are documented in `CONTRACT.md`. The illustration library has its own notes in `src/art/README.md`.

## Accessibility and motion

- **Reduced motion:** with `prefers-reduced-motion: reduce`, pins and scrubbed animation are skipped and every chapter renders its final, readable state.
- **Calm mode:** a toggle in the navigation stores the preference in `localStorage` and reloads the page. It uses the same static layout as reduced motion, regardless of OS settings.
- **Keyboard:** a "Skip to work" link is the first focusable element on the main page. The chapter menu is a button with `aria-expanded`, closes on Escape, and marks the current chapter with `aria-current`.
- **Cursor:** the custom ink cursor and following hand only run on devices with a fine pointer and hover. Touch devices get the standard interaction.
- **Layout:** pin lengths and layouts have separate desktop and mobile settings.

## Contact

- Email: [ps9681@srmist.edu.in](mailto:ps9681@srmist.edu.in)
- GitHub: [github.com/Prabhav558](https://github.com/Prabhav558)
- LinkedIn: [linkedin.com/in/prabhav-singh-7a4285208](https://www.linkedin.com/in/prabhav-singh-7a4285208)
