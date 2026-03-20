# Capital of Amaravati (cap-a)

## Status
- **Current Step:** 3 (Build)
- **Current Sub-Step:** Code modernization in progress
- **Step Status:** in-progress
- **Last Session:** 2026-03-20
- **Next Action:** Complete MapContainer decomposition, PMTiles migration, mobile responsiveness
- **Blockers:** None
- **Your Action Needed:** No
- **Action Description:** —
- **Action Type:** —

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
