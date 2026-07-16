# Capital of Amaravati (cap-a)

## Status
- **Current Step:** 3 (Build) — branch `rebuild`; **L2–L4 scoring engine shipped** (2026-07-16)
- **Current Sub-Step:** L0–L4 live behind the SSO gate. Backlog cleared: 8 of 11 open to-dos done in one session (#146, #8, #129, #138, #137, #127, #135, #136). Data is now the authoritative APCRDA mosaic.
- **Step Status:** in-progress
- **Last Session:** 2026-07-16
- **Next Action:** #139 land_base tone (owner must eyeball); #147 public exposure (its privacy blocker is now CLEARED — see below); #145 Ottomate ND1-finalize write path (infra repo, not this one).
- **Blockers:** None.
- **Your Action Needed:** Yes
- **Action Description:** (1) Eyeball the land_base tone at zoomed-out C (#139) — one-line adjustable in `scripts/gen_design_tokens.mjs`. (2) Decide #147 public exposure. (3) Review two judgement calls: the mosaic omits Undavalli/Penumaka (86,918 vs the old 95,291 plots) — plausibly because they sit outside the land-pooling scheme, but that is an interpretation; and the scoring index diverges from broker asking prices by design (ρ 0.455 excl. Nelapadu / 0.129 incl.).
- **Action Type:** review
- **Ottomate SO1:** 13 features, 8 flows, 2 pages; ADRs 003–008. cap-a.vault7a.xyz is SSO-gated (not yet public).

### ⚠️ Privacy — read before touching the data pipeline
The authoritative APCRDA mosaic carries `farmer_n` (owner names) **and `aadhar_no`
(Aadhaar national ID numbers)**. Everything the pipeline emits is published (nginx serves
`plots.pmtiles` + `search.json`). Two exposures were found and closed on 2026-07-16:
`.dockerignore` now excludes `public/data/sources` (it was about to ship 195MB of Aadhaar
numbers into the image), and `01_clean_mosaic.mjs` drops every identity field at source —
the served `search.json` used to carry an owner name on **every plot**. Do not re-add
identity fields to tiles, indexes, or the bundle. `SHOW_OWNER_NAMES=false` hides them in
the UI; it does **not** keep them out of the files.

> **⚠️ This file's lower sections are pre-rebuild and partly stale.** The 2026-06 rebuild reframed the product as an **intelligent land-value explorer** (not just a map). Source of truth:
> - `docs/UNDERSTANDING.md` — confirmed vision, data reality, scoring model (the canonical doc)
> - `docs/BUILD_PLAN.md` — sequenced offline-pipeline → thin-client plan (P0–P9)
> - `docs/AMARAVATI_CONTEXT.md` — real-world intelligence base (anchors, roads, exclusions) for the scoring engine
> - Pipeline `pipeline/01_clean → 02_grid → 03_tiles → 04_indexes → 05_roads` (offline enrichment; app is a thin PMTiles client)
> - Rebuild commits P0–P5 + polish on branch `rebuild` (14 commits). `wip/prev-agent` holds the prior broken refactor (incl. the 110 road seeds, recovered).

## Quick Context
- Stack: Vite 7 + React 19 + MapLibre GL 5.18 + Tailwind CSS v4 + Zustand
- Hosting: VAULT7A Docker (cap-a.vault7a.xyz)
- Port: 8502
- Container: project-cap-a
- Origin: Standalone repo, pre-existing code — integrated into Ottomate pipeline
- Live URL: https://cap-a.vault7a.xyz

## What's Done
- [x] Step 1: Discovery (docs written: PRODUCT_BRIEF, FEATURE_SPEC, USER_FLOWS, DATA_MODEL)
- [ ] Step 2: Architecture (partially done via plan)
- [x] Step 3: Build — deployed, Zustand store, ErrorBoundary, LoadingScreen rewrite
- [ ] Step 4: Review & Testing
- [x] Step 5: Deploy (live at cap-a.vault7a.xyz)

## Step 1 Discovery Progress
- core_idea: done
- target_users: done (general public, urbanist nerds, real estate investors, journalists)
- data_sources: done (APCRDA LPS GeoJSON, allocated lands, road attributes)
- core_features: done
- user_flows: done (6 key flows documented)
- constraints: done

## Design Choices
- Palette: Dark theme (slate-900 backgrounds, orange-500 accents)
- Font Pairing: System fonts (Tailwind defaults)
- Animation Level: Minimal (word-spinner on loading, slide-in panels)
- Layout Style: Full-screen map with overlay panels
- UI Theme: Dark (CARTO Dark Matter basemap)

## Decisions Made
- Integrated into Ottomate pipeline (2026-03-20)
- Keep dark theme per user preference (2026-03-20)
- Zustand for state management (bridge pattern: App reads Zustand, passes props to old components) (2026-03-20)
- Defer PMTiles migration to next session (tippecanoe not installed on server) (2026-03-20)
- Keep MapContainer at 924 lines for now; extracted layerDefinitions.js and roadSegmentIndex.js utilities (2026-03-20)
- GeoJSON loaded directly (87MB plots_wgs84.geojson) — PMTiles migration planned for performance (2026-03-20)

## Architecture Notes
- `src/stores/mapStore.js` — Zustand store with LoadingStage enum, all UI/data state
- `src/App.jsx` — Bridge pattern: reads Zustand, passes props to old components
- `src/components/Map/MapContainer.jsx` — Still 924-line god component (decomposition planned)
- `src/components/Map/utils/layerDefinitions.js` — Extracted MapLibre layer configs
- `src/components/Map/utils/roadSegmentIndex.js` — Extracted road segment utilities
- `src/components/ErrorBoundary.jsx` — React error boundary
- `src/components/LoadingScreen.jsx` — Rewritten with enum stages + 60s timeout
- `src/components/Search/SearchBar.jsx` — Updated to use Zustand for namedRoadsIndex + map flyTo

## Remaining Work (Priority Order)
1. **MapContainer decomposition** — Break 924 lines into focused hooks (useMapInit, usePlotLayers, useOverlayLayers, useNamedRoads, useMapInteractions, useMapEffects)
2. **PMTiles migration** — Install tippecanoe, generate .pmtiles from GeoJSON, update map source
3. **Mobile responsiveness** — Bottom sheet for PlotDetail, full-screen legend modal, responsive top bar
4. **Road name persistence** — Export/import JSON, validation, ship static road_names.json
5. **Dead code cleanup** — Remove unused GeoJSON files (roads, burial_grounds, boundaries, waterbodies)
6. **Full Zustand migration** — Move Legend and PlotDetailPanel off props to direct Zustand reads
7. **Code splitting** — Dynamic import for Legend, PlotDetail to reduce bundle size (currently 1.3MB)

## Key Files
- src/stores/mapStore.js (Zustand store)
- src/App.jsx (bridge component)
- src/components/Map/MapContainer.jsx (main map — needs decomposition)
- src/components/Map/utils/layerDefinitions.js (extracted layer configs)
- src/components/Map/utils/roadSegmentIndex.js (road segment utilities)
- src/utils/colors.js (21 zoning groups, 70+ symbologies — excellent quality, DO NOT MODIFY)
- src/utils/roadAttributes.js (34 named roads — excellent quality, DO NOT MODIFY)
- docs/PRODUCT_BRIEF.md, FEATURE_SPEC.md, USER_FLOWS.md, DATA_MODEL.md
- Dockerfile, nginx.conf, docker-compose.yml
