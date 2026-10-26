# src/art — shared illustration library

Engraved / woodcut inline-SVG art. Import from `../../art` (barrel `index.ts`) or per file.
Every component: one root `<svg>`, `aria-hidden="true"`, `width/height 100%` by default, accepts `className` + `style`,
geometry is deterministic and computed once (module level / `useMemo`), clipPath ids are unique per instance (`useId`).
Palette only: `#722F37 #4A1D23 #111111 #050505 #E8DCC6 #B7A89A #B7A89A`.
Size an element by giving the `<svg>` a CSS width/height (or wrap it in a sized div). Only `transform`/`opacity` should be animated.

## Hand — `Hand.tsx`
`<Hand pose="reach" | "grip" id? className? style? />` (default export; named exports below)

| pose | viewBox | description |
|---|---|---|
| `reach` | `250 190 750 450` (`HAND_VIEWBOX.reach`) | Forearm exits the **right** edge (black sleeve + cuff at far right), hand points **left**, index extended, other fingers curled, thumb below. |
| `grip` | `0 140 560 360` (`HAND_VIEWBOX.grip`) | Forearm exits the **left** edge, fingers hook around a vertical cylinder, thumb arcs over the top. |

Exports (all in the pose's viewBox user space):
- `HAND_REACH_TIP = {x:307.3, y:323.3}` index fingertip (also `<circle data-part="fingertip" r=0>` inside the index group, reach only).
- `HAND_GRIP_ANCHOR = {cx:446, cy:332, r:60, axisDeg:90}` the invisible cylinder (diameter 120, vertical axis). Render the vessel **underneath** the Hand svg, centred on this point; the hand draws on top (all fingers cross the vessel's front face, index tip reaches x≈506, pinky tip ≈460; the thumb arcs over the top at y≈185-230). Alignment: stack a vessel `<svg viewBox="0 140 560 360">` and the Hand in identical CSS boxes (same size, default `meet`), otherwise the anchor coordinates mean nothing.
- `HAND_PIVOTS[pose][name] = {x,y}` pivots for `thumb | index | middle | ring | pinky` (grip + reach differ; same values as the `data-pivot` attributes).
- `HAND_VIEWBOX`.

`data-part` groups (paint order back to front): `thumb`, `fingers` (contains `[data-finger="pinky|ring|middle"]`), `index`, `arm` (forearm + back of hand as one shaded silhouette, plus sleeve + cuff), `palm` (tendon/knuckle detail lines drawn over the arm group). Each part also holds a nested `[data-part="shadow"]` (solid black underside).
Finger groups (`thumb`, `index`, each `[data-finger]`) carry `data-pivot="x y"` (user-space knuckle pivot = where the digit leaves the back of the hand) and have **no inline transform-origin** (a CSS origin/fill-box fights GSAP's own SVG origin handling; tested). Always rotate with GSAP `svgOrigin`; keep rotations small (about +-12deg) so the unstroked seams where digits tuck behind the hand stay hidden:
```ts
const p = HAND_PIVOTS.reach.index;               // or el.dataset.pivot
gsap.to(el.querySelector('[data-part="index"]'), { rotation: -8, svgOrigin: `${p.x} ${p.y}` });
```
Whole-hand motion: animate the `<svg>` element (or its wrapper), e.g. `xPercent`, `x`, `rotation`.

## Figure — `Figure.tsx`
`<Figure variant="silhouette" | "engraved" robe?="blue"|"paper"|"black" view?="back"|"front" className? style? />`
viewBox `0 0 400 1000` (`FIGURE_VIEWBOX`); feet/hem at the bottom (~y 980), head top ~y 56, hair blown to the **right** (strands break the outline up to x≈390).
- `silhouette`: solid `#050505`, no outline (hair strands, faint `#111111` fold lines). `robe` ignored.
- `engraved`: robe fill (`blue #B7A89A` default / paper / black) + vertical stripe hatching that fans with the folds, thicker in fold bands, black ink outline. Black robe uses thin paper lines. `front` view shows a face (paper, hatched on the right) with `<g data-part="eyes">` (blue irises) and a collar; `back` shows long hair over the back and sash ties.
- `data-part`: `hair`, `head`, `robe` (contains `sash`, `collar`), `sleeve-l`, `sleeve-r`, `hem` (separate wavy group, safe to sway/skew). `hem`, `sleeve-l`, `sleeve-r` carry `data-pivot="x y"` (hem top centre `210 872`, shoulders `130 200` / `264 200`) for GSAP `svgOrigin`, plus `neck`, `hair-back` (front view), `eyes`.

## Colonnade — `Colonnade.tsx`
`<Colonnade tone="paper"|"red" count?=7 seed?=3 backdrop?="black"|"none" preserveAspectRatio?="xMidYMid slice" className? style? />`
viewBox `0 0 1600 900` (`COLONNADE_VIEWBOX`). Symmetric row of fluted columns (base, shaft with entasis, capital + abacus) standing on engraved steps (`<g data-part="steps">`, y 810–900). Columns are `<g data-part="column" data-index={i}>` (left to right) — animate them individually (stagger). `paper`: paper columns, black vertical hatching on the right/shaded side. `red`: `#722F37` columns, `#4A1D23` shade, black hatching. `backdrop="black"` paints the black voids behind/between (and above) the columns; `"none"` leaves them transparent.

## Woodgrain — `Woodgrain.tsx`
`<Woodgrain seed?=7 tone?="deep"|"red" className? style? />` viewBox `0 0 1600 1000`, `preserveAspectRatio="xMidYMid slice"`. Full-bleed woodcut plank: base `#4A1D23` (`deep`) or `#722F37` (`red`), faint lighter (or darker for `red`) streaks, black filled grain ribbons (tapering, splitting, ~8° tilt, 1–3 knots). Use as a `.layer` background; ~40 KB DOM.

## Shard — `Shard.tsx`
`<Shard seed={n} size?={px} className? style? />` viewBox `0 0 200 200`, if `size` is omitted width/height are `100%`. Irregular engraved fragment (paper fill, black outline, contour hatching, cross-hatched facet, cracks, solid black shadow on the lower-right). Each integer seed gives a distinct shape; the shard is centred in the box.

## procedural.ts (pure, seeded)
All return SVG path `d` strings unless noted; coordinates rounded to 0.1.
- `woodgrain({seed,width,height,count}) -> {d,w}[]` filled ribbon polygons (`w` = max thickness 1–9 px). Fill with `#050505`.
- `hatch({seed,x,y,width,height,angle,spacing,spacing2?,wobble?,breakChance?,step?}) -> d` parallel wavy segments covering the bbox (stroke it; clip to a silhouette). `spacing2` blends spacing across the field (density gradient).
- `contourHatch({seed,center:Pt[],from,to,spacing,spacing2?,wobble?,breakChance?,step?,extend?}) -> d` lines offset along a centerline (normal offsets `from..to`), so hatching bends with arms/robes.
- `crossHatch({seed,center,halfWidth,spacing,bow?,fromFrac?,toFrac?,breakChance?}) -> d` short lines across a limb (joint creases).
- `scanlines({width,height,spacing,thickness,seed,jitter}) -> d` vertical stripe rects as one path.
- `roughen(points,amount,seed,{segment?,smooth?}) -> d` closed path with jittered edges. Helpers: `smoothPath(pts,closed?,k?)`, `polySmooth(pts)`, `sampleClosed`, `insidePoly`, `resample`, `fmt`.

## Notes for chapter authors
- Every instance generates its own unique clipPath/path ids (`useId`), so mounting the same component several times on one page is safe.
- Don't apply `ink-rough`/filters to Hand/Figure while animating; static is fine.
- Hand and Figure DOM is ~130–140 KB / ~65 KB; Colonnade ~140 KB (7 columns); Woodgrain ~40 KB; Shard ~60 KB each — avoid mounting many Shards (>8) at once.
