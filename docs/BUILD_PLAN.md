# Capital of Amaravati — Sequenced Build Plan

**Status:** Draft for owner approval, 2026-06-29. No code written yet. Companion to `docs/UNDERSTANDING.md` (the source of truth). Nothing here is built until the owner approves the phase.

## Guiding architecture principle

**Enrich offline, ship a thin client.** Build an **offline enrichment pipeline** that progressively adds columns to the plot data (clean → grid → proximity → score). The **web app** is a thin renderer over the enriched **vector tiles (PMTiles)** plus the scoring UI. Nothing heavy runs in the browser.

```
   raw scrape data ─┐
                    ▼
  [ OFFLINE PIPELINE ]  clean → grid-assign → proximity → score   (Python/Node, versioned, repeatable)
                    ▼
   enriched plots ──► PMTiles (~10–15MB)  +  named-roads.json  +  anchors.json  +  search index
                    ▼
   [ THIN WEB APP ]  MapLibre + PMTiles · zoning/legend/search/detail · score overlay · (dev: road tool)
```

Each pipeline stage is a separate, re-runnable script so we can regenerate data when the source refreshes.

---

## Phase sequencing (dependency-ordered)

Legend: 🟢 near-term & detailed · 🟡 mid-term · ⚪ later/depends on earlier decisions. **[GATE]** = owner approval before proceeding.

### 🟢 Phase 0 — Safety net & hygiene  *(small, fast)*
**Goal:** clean starting point without losing the previous agent's half-work.
- Stash/branch the 8 uncommitted files (prev agent's dangling refactor) to `wip/prev-agent` so nothing is lost, then start the rebuild from a clean `rebuild` branch off `master`.
- Remove dead datasets from the load path (`roads`, `boundaries`, `burial_grounds`, `waterbodies`, `survey_parcels` GeoJSON) — keep them in git history, drop from `public/data`.
- Confirm dev environment runs (`npm run dev`) against current data before we change anything (baseline).
- **[GATE]** confirm branch strategy + that discarding the half-refactor is OK.

### 🟢 Phase 1 — Offline pipeline: CLEAN  *(the foundation everything depends on)*
**Goal:** one trustworthy dataset; kills the §3 data bugs.
- New script `pipeline/01_clean.mjs` (Node) reads `plots_wgs84.geojson`, outputs `plots.clean.geojson` with:
  - `area_sqyd` ← from mislabeled `alloted_ex`; drop the bogus `nbr` ("Sq.Yards") column.
  - `neighbors` ← parsed from `regcode_n/s/e/w`, split into adjacent-plot vs road-frontage (`"15.6 mtr Road"`).
  - `village` ← normalized (Thullur/Thulluru → canonical map); explicit `village_na` flag.
  - `zoning_group` ← validated against `colors.js`; the 8 `unknown` flagged/logged.
  - `lat`/`lon` ← computed centroid for the ~1K missing.
  - **Slim the payload** — drop unused fields (`googlemaplink`, redundant codes) to shrink tiles.
- Output a data-quality report (counts fixed/flagged) so changes are auditable.
- **[GATE]** review the cleaned-data report before it becomes the base for everything.

### 🟢 Phase 2 — Offline pipeline: GRID super-blocks
**Goal:** the confirmed region unit.
- `pipeline/02_grid.mjs`: assign each plot a **1km × 1km grid cell id** (master-plan grid), plus a human-readable region label (nearest/major village). Adds `grid_id`, `region_label`.
- Emit `grid.geojson` (cell polygons) for region-level rendering/aggregation later.

### 🟢 Phase 3 — Tiles & performance  *(removes the 90MB load)*
**Goal:** instant map load.
- Install **tippecanoe** (decision: local WSL vs server — see Open Decisions); generate `plots.pmtiles` from `plots.clean.geojson` with sensible zoom/feature limits.
- App switches plot source to PMTiles (via the already-installed `pmtiles` lib). Keep a small GeoJSON fallback only for dev.
- **Target:** < 2s first paint; smooth pan/zoom.

### 🟢 Phase 4 — App foundation rebuild (L0)  *(reuse the good assets)*
**Goal:** the broken app becomes a clean, working public map.
- **State architecture (decision):** finish the Zustand migration *properly* — single clean store + focused hooks (`useMapInit`, `usePlotLayers`, `useOverlays`, `useInteractions`), no App↔ref bridge. Delete the dead prop contract.
- Rebuild the renderer over PMTiles, **reusing** `colors.js` (zoning), legend (zoning filter + area heatmap), `SearchBar` (Fuse over clean index), `PlotDetailPanel` (clean fields), allocated-lands overlay.
- **Move road-naming tooling off the public path** → behind a `?dev` route/flag (owner keeps it to fix roads; public never sees Road Mode / segment flash).
- Mobile-responsive shell (bottom-sheet detail, modal legend).
- **[GATE]** L0 looks/works right → this is the first genuinely shippable state.

### 🟡 Phase 5 — Roads denoise (L1)
**Goal:** N/E network is trustworthy.
- Move named-road construction **offline**: `pipeline/03_roads.mjs` builds `named-roads.json` from the 3,753 road-reserve polygons + the 110 seed segments + `roadAttributes.js`, with a **tightened corridor algorithm** (fix the over-marking) — computed once, not per browser load.
- App renders the static named-roads file (fast, correct). Road-naming dev tool writes back into the seed mapping to refine future runs.
- **[GATE]** owner eyeballs the cleaned road network for false positives.

### 🟡 Phase 6 — Offline pipeline: PROXIMITY (L2)
**Goal:** the raw material for scoring.
- `pipeline/04_proximity.mjs`: per plot, compute distance to — nearest named road (by class), Government Complex, each built anchor (SRM/VIT/AIIMS…), allocated institutions, riverfront, nearest high-density zone. Adds `prox_*` columns; re-tile.
- Anchor set sourced from `anchors.json` (curated from §5 research, each tagged built / under-construction / planned).

### ⚪ Phase 7 — Reality signal (L3) — *feasibility first*
- Spike: cost/feasibility of satellite construction detection vs a manual/news-fed `development_status` on anchors. Start with the curated status tags from Phase 6; upgrade later. **[GATE]** go/no-go on satellite after the spike.

### ⚪ Phase 8 — Valuation score (L4)
- Design the scoring function: relative heuristic, **dominant-anchor** non-linearity, separate commercial/residential (anchored on zoning). Compute per-plot offline; aggregate to grid super-blocks.
- UI: score heatmap, per-plot **light pros/cons**, region/sub-region rankings. **[GATE]** lock the scoring math with owner before shipping numbers.

### ⚪ Phase 9 — Polish & public launch (L5)
- Visual polish, mobile pass, onboarding/empty states, deploy to `cap-a.vault7a.xyz`, public-readiness review.

---

## Open technical decisions (need owner input before/at the relevant phase)
1. **Working-tree fate (Phase 0):** stash the prev agent's half-refactor and rebuild clean? (Recommended.)
2. **tippecanoe location (Phase 3):** generate tiles in local WSL, or on the VAULT7A server? (Server install was the blocker last session.)
3. **State architecture (Phase 4):** finish Zustand cleanly (recommended) vs a different state approach.
4. **Pipeline language:** Node (consistent with app, recommended) vs Python (the existing `process_all.py` is Python). 

## Milestones (shippable increments)
- **M1 — Trustworthy data:** Phases 1–2 done (clean + grid).
- **M2 — Fast clean map:** Phases 3–4 done (PMTiles + rebuilt L0). *First public-showable state.*
- **M3 — Trustworthy roads:** Phase 5.
- **M4 — Intelligence:** Phases 6–8 (proximity → score).
- **M5 — Launch:** Phase 9.
