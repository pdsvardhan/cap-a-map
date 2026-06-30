# Design Brief — Visual System for the Amaravati Land Explorer Map

> **How to use this doc:** paste it into your design AI as the brief. It is written for a
> senior cartographic / data-visualisation designer. A companion file,
> `MAP_LEGEND_INDEX.md`, is the exhaustive inventory of every element on the map — read it
> as the source of truth for *what* needs styling. This brief covers *how* to approach it,
> what to deliver, and what to ask the client (the project owner) before committing.

---

## 1. Your role
You are designing the **complete visual system** for an interactive web map of Amaravati —
India's greenfield capital city — built on MapLibre GL. This is not a logo or a landing
page; it is **information cartography**: ~95,000 land parcels plus roads, institutions,
water, boundaries and regions, all rendered on a flat dark canvas with no basemap. Clarity,
distinguishability and calm density are the goals. Avoid generic "dashboard" palettes.

## 2. Product context
An intelligent **land-value explorer**: anyone can browse every plot, see its zoning, the
roads, allotted institutions, and (soon) a computed desirability score. Audiences: the
general public, urbanism nerds, real-estate investors, and journalists. The data is
authoritative (scraped from the government GIS). The tone should feel **credible,
modern, and a little premium** — like a serious civic/real-estate intelligence tool, not a
toy. The current theme is dark; you may propose a light variant.

## 3. The medium & hard constraints (non-negotiable)
- Rendered in **MapLibre GL**: every element is a `fill` (polygons), `line` (outlines/roads)
  or `symbol` (labels). Your output must translate to those paint properties
  (fill-color, fill-opacity, line-color, line-width, text-color/halo, dash patterns).
- **Flat dark canvas, no basemap.** Plots are the content. (Propose a light alt if you wish.)
- Must distinguish **~20 land-use categories at once** → design **hue families with
  intra-family steps**, not 20 unrelated colours. (See taxonomy in `MAP_LEGEND_INDEX.md` §2A.)
- **Colour-blind safe** for the categorical zoning (deuteranopia/protanopia at minimum).
- Legible from **zoom 10** (whole city; parcels sub-pixel; large blocks of colour) to
  **zoom 19** (a single parcel). Low-zoom must not turn into mud or a black mass.
- Must hold up across fills + thin road polygons + label symbols + **hover/selected** states.
- Performance: solid fills, simple expressions; no per-feature gradients.

## 4. The design problems to actually solve
Don't just hand back a swatch list. Show how your system handles these:
1. **Density vs distinguishability** — R3 Residential (~48% of the map) and C2 Commercial
   (~33%) dominate; the long tail of 18+ zones must still be findable. How do the big two
   recede enough to let civic/special zones (government, education, parks) read?
2. **Status as a modifier** — every plot is also *Vacant* or *Allotted/Returnable*. Encode
   this as a modifier (lightness/texture/outline) on the zone hue, not a new hue.
3. **Roads over plots** — the named N/E trunk grid must read unmistakably as roads sitting
   on top of coloured parcels, in **one treatment for all roads** (class shown on click,
   not by colour). Owner is unsure about the current solid-gold fill — propose the best
   road rendering (filled corridor, cased line, pattern, halo…).
4. **Allotments vs zoning** — a named institution (e.g. a university) sits *on* an
   education-zoned plot. Both facts must be legible without the two competing. Decide
   whether allotments are one overlay treatment or category-coloured.
5. **Custom grid regions** — faint cell boundaries + a small code label per region (see
   §2E of the index) that aid orientation without fighting the zoning fills.
6. **Three data modes, one family** — Zoning (categorical), Plot-area (sequential), and a
   future Land-value Score (sequential/diverging) must feel like one coherent system, and
   the mode switch must read as a deliberate change of lens.
7. **Interaction states** — define default / hover / selected / search-result / dimmed
   (filtered-out) so selection always pops on the dark, busy canvas.
8. **Label hierarchy** — road names vs region codes vs institution names vs place labels
   need distinct, legible treatments (size/weight/halo/casing) on the dark canvas.

## 5. What to deliver
1. **3–4 distinct visual DIRECTIONS**, each named, with a one-line rationale and mood
   (e.g. "Civic Blueprint", "Warm Cadastre", "Night Atlas"…). Each direction must cover the
   *entire* taxonomy in `MAP_LEGEND_INDEX.md`, not just residential.
2. For each direction: how it solves the eight problems in §4 (especially the big-two
   recession, road treatment, status modifier, and the three data modes).
3. Per-category specification once a direction is chosen — a token table mapping every
   category/subcategory/state → concrete values (hex, opacity, stroke, dash, label style)
   ready to drop into MapLibre.
4. Accessibility note (CVD simulation of the categorical set).

## 6. Process — ASK THE CLIENT, don't assume
The client wants to choose, and to choose at multiple levels — overall and per-family.
**Offer options, not a single answer, and let answers be nuanced.** Before/while designing,
ask the client questions such as:
- Overall **mood / direction**: which of your 3–4 directions resonates (they may mix)?
- **Dark vs light** (or both)?
- How **bold vs restrained** — saturated and characterful, or quiet and map-like?
- Per-family preferences, e.g. *"For Residential specifically, do you want warm earthy tones,
  cool neutrals, or something else?"* — and the same for Commercial, Parks/green, Civic.
- **Road treatment** preference (filled / cased line / pattern; warm accent or neutral).
- Any **brand colours / references** they love or want to avoid.
- How much to differentiate **vacant vs allotted**.
Present these as multiple-choice where possible (with 3–4 options each) so the client can
pick rather than describe — but allow free-form/complex answers too.

## 7. If you need more to do this well — ASK FOR IT
You may request any of the following from the client/engineer, and they will provide:
- Current-state screenshots of the map (zoomed out + zoomed in) and the present palette.
- The exact category list with live counts (in `MAP_LEGEND_INDEX.md`; ask if you want a
  machine-readable token file or per-category sample geometry).
- Reference maps/products the client admires.
- Constraints you're unsure about (target devices, contrast targets, motion).
State explicitly what would let you produce a stronger result.

## 8. Output format for handoff
Final deliverable should be a **design-tokens table** the engineer can wire directly:
`category/subcategory/state → { fill, fillOpacity, line, lineWidth, dash?, textColor,
textHalo } `, organised by the families in `MAP_LEGEND_INDEX.md`, plus the road treatment
spec and the three data-mode ramps. Markdown or JSON both fine.
