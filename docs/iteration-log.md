# Iteration Log — cap-a (Capital of Amaravati)

## Session 2026-07-01 — build: roads, authentic data, labels, regions, design system

**Stage:** 3 (Build) on branch `rebuild`.
**Arc:** owner comment-tool feedback → the 4-month road blocker solved with authentic data →
full authoritative re-scrape → labels/allotments/regions → privacy → product research →
design-AI visual system integrated.

**What changed (17 commits):**
- **Owner feedback (comment tool):** de-blacked low-zoom view; hid the meaningless grid_id;
  fixed the pen/box/arrow markup crash in the dev comment tool (stale-ref-in-updater bug).
- **Roads — the big unblock:** discovered the N/E names were hand-assigned by *positional*
  segId (drifts on re-clean) over authentic road-reserve polygons. Tried OSM grid-model
  fusion (06), then found the live **APCRDA ArcGIS server is open** →
  `AmaravatiTrunkRoadNetwork` = 35 named road polygons with real widths. Rebuilt roads from
  it (pipeline 07); render as filled polygons + subtle outline. 05/06 deprecated.
- **Full authoritative re-scrape** (`scripts/scrape_apcrda.mjs`): 23 layers incl. the 87k-plot
  mosaic (lu_code/lu_desc), LandAllotments (+FSI), admin hierarchy, boundaries. Big layers
  gitignored; small pipeline inputs committed.
- **Labels:** official APCRDA 2015 zone names (`getZoneName`); allotted lands rebuilt from
  authentic LandAllotments (name/category/zone/FSI) — untangles allotted-vs-zoned.
- **Regions:** `Node {lowerN}·{lowerE}` grid-cell code per plot (client-side from road axes),
  replaces grid_id; bounding roads on click.
- **Privacy:** owner/farmer names hidden in public view (`SHOW_OWNER_NAMES=false`).
- **Product research:** MECE framework + findings (`docs/PRODUCT_RESEARCH.md`) — category,
  users, features, data/trust, legal/PII (hide owner names), UX, monetization, GTM.
- **Design system:** design AI delivered a generative OKLCH system (4 directions). Ported it
  (`gen_design_tokens.mjs` → tokens JSON → `designTokens.js`, `?dir=A|B|C|D`). Owner picked
  **C · Statutory Dark** (official palette) and asked to brighten it to the literal look
  (yellow residential / red commercial). Legend now uses the design tokens. Added a
  **land base** (pipeline 09) under plots to kill the low-zoom black between parcels.

**Decisions:** adr-001 (roads from OSM centerlines — superseded), **adr-002** (source all
geodata from the live APCRDA ArcGIS server). Region naming locked as `Node`. Design direction
locked as **C (Statutory Dark, brightened)**.

**Verified live:** authentic road grid + panels; official zone names; allotment names; Node
regions; owner names hidden; C design + brightened + legend match. Land-base NOT yet
eyeballed (Chrome extension dropped at end of session) — build passes + file serves.

**Next session pick-up:**
- Eyeball the land-base at zoomed-out C (tune `landBase` tone if needed).
- Remaining design polish: Area/Value data-mode ramps (for scoring), ivory allotment overlay,
  road-contrast fine-tune.
- Scoring engine (L2–L4): anchor proximity + FSI + region-relative — the next big feature.
- Deploy (#128) held until post-design; #136 re-process plots from the authoritative mosaic.
