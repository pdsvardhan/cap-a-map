# Capital of Amaravati — Project Understanding (source of truth)

**Status:** Confirmed with owner 2026-06-29. This is the grounding document agreed before any reuse/rebuild decisions. It merges (a) the real data inventory, (b) master-plan research, and (c) the owner's intent captured over a discovery conversation.

> Supersedes the rosier claims in `PRODUCT_BRIEF.md` / `DATA_MODEL.md` where they conflict (those have factual errors — see §3).

---

## 1. What we are actually building

**Not "a map." The map is the foundation.** The real product is an **intelligent land-value / desirability explorer for Amaravati Capital City** — the first public, searchable view of all ~95K plots, *plus* a relative scoring layer that tells you which areas/plots are desirable and why.

**Primary user:** general public / AP citizens (must be dead simple). **Also:** a portfolio/showcase piece, and a real-estate intelligence tool. Eventually made public.

### Product layers (the target, in dependency order)
- **L0 — Foundation** *(exists, broken)*: 95K plots on a dark map, zoning colors, search, plot detail, allocated lands. → rebuild clean.
- **L1 — Accurate roads**: N-series + E-series arterials marked **correctly** (denoise the over-marking). Backbone for all distance math.
- **L2 — Proximity intelligence**: per plot, distance to key roads, landmarks, allocated institutions, built construction.
- **L3 — Reality signal**: what is *actually being built* vs only planned (news/allotment updates; satellite construction detection = **feasibility TBD**). Because plans ≠ reality.
- **L4 — Valuation score**: an **explainable, relative** desirability score per plot — commercial vs residential lenses — surfaced at **1km grid super-block** region level. Driven by factors that genuinely move value, not a kitchen-sink.
- **L5 — Polish**: public-ready, mobile, showcase-grade.

### Definition of "done / good" (owner's words)
Fast + fully explorable, roads complete and trustworthy, polished/public/shareable, and it communicates the scale/ambition of Amaravati. Plus the freshness gap addressed: knowing which planned things are real.

---

## 2. The scoring model (design principles — math locked later)

- **Relative heuristic scoring.** A desirability *index*, no transaction-price data required. Rank/score plots by weighted spatial + zoning factors. Transparent and explainable.
- **Dominant-anchor effect (core principle).** A plot can be average on everything but sit next to a huge *already-built* anchor (e.g. a major university, the Government Complex) → demand spikes. The model is **not a flat weighted sum**; a single strong nearby built anchor can override the rest. *(Real-price evidence backs this — see §5.)* Exact dominance math = **designed later**.
- **Commercial vs residential = two lenses, anchored on official zoning.** We mostly respect the master-plan intended use (the `zoning_group` already in data) rather than re-deriving use. A plot can score great commercial, mediocre residential.
- **Output:**
  - Per-plot score with **light pros/cons** ("near E3 seed road; 600m from Govt Complex; low built-activity nearby") — *not* a heavy factor dump.
  - **Region / sub-region rankings** at the **1km grid super-block** level (not "best individual plots").
  - Commercial and residential scores shown separately.
- **Region unit (confirmed):** the master-plan **1km × 1km grid** ("super-block"). Villages used for human-readable labels; township/sector codes available as alternates.

### Candidate value factors (owner-endorsed — all matter)
1. **Proximity to key roads** (N/E arterials, BRT corridors, NH-16 links) — access is king.
2. **Proximity to major landmarks** — Government Complex (Secretariat/Assembly/HC), Krishna riverfront, built universities/hospitals.
3. **Real development nearby** — actual construction / completed / *reputable or huge committed* investments (investor reputation matters).
4. **Zoning + plot characteristics** — zoning type, plot size, frontage.
5. **Proximity to high-density zones.**

---

## 3. Data reality (what's actually in `plots_wgs84.geojson` — 95,291 plots)

All features are `Polygon` (WGS84). Fields present: `regcode, plot_code, farmer_n, village, township, sector, block, colony, symbology, zoning_group, alloted_ex, polylength, polywidth, plot_categ, plot_no, regcode_n/s/e/w, lat, lon, googlemaplink, nbr`.

### ⚠️ Data bugs (confirmed from raw rows — docs describe these WRONG)
| Field | Docs say | Reality |
|---|---|---|
| `alloted_ex` | "allocation status" | **Plot AREA in Sq.Yards.** Median 450, p75 900, p95 4,185, one 11.1M outlier (a zone polygon). The area heatmap already relies on this. |
| `nbr` | "neighbor regcodes" | **Constant string `"Sq.Yards"`** (a stray unit column). Useless as-is. |
| `regcode_n/s/e/w` | "redundant w/ nbr" | **The real neighbors** — but mix plot-codes with `"15.6 mtr Road"` strings. |
| `regcode` | "unique id" | **`"N/A"` on ~18%** (77.6K/95.3K populated). Not a safe unique key. |
| `village` count | "48" | **64 distinct** + 4,910 `N/A`. Spelling variants inflate it (Thullur/Thulluru). |
| `zoning_group` | (not mentioned) | **Pre-computed and present** (22 groups). 8 plots = `unknown`. |

**Root cause:** a column-mapping shift in the original scrape. → Implies an **ETL normalization pass** (fix labels, normalize village names, clean area/neighbors, flag unknowns) to produce one trustworthy dataset before scoring. *(This is data-cleaning, not an app rebuild.)*

### Spatial structure available in data
- `township` (~30), `sector` (~147), `block`, `colony` (~582) = **numeric LPS codes**, not themed-city names.
- `village` (64, named) = the real human-recognizable unit.
- Themed "nine cities" are **NOT a field** → derive regions from the **1km grid** (confirmed choice), with villages for labels.

### Zoning distribution (top)
R3 medium-high residential (45.8K) and C2 general-commercial (31.2K) dominate; then Residential Vacant (5.6K), **road-reserve (3,750)**, Commercial Vacant (2.9K), parks/greens, education (422), etc. `colors.js` maps 70+ symbology strings → 21 groups → 7 legend categories. **High quality, keep.**

### Other datasets
- `allocated_lands.geojson` (165 polygons): `type` is junk (mostly blank/null); **`label`** is the signal ("Interim Government Complex (IGC)", "APTIDCO Housing", "400KV Substation", universities…). `colors.js::categorizeAllocatedLand()` derives category from label keywords — correct approach.
- `search_index.json` (9MB), `allocated_lands_index.json`, `village_index.json` — derived indices.
- Dead/unused: `roads.geojson`, `boundaries.geojson`, `burial_grounds.geojson`, `waterbodies.geojson`, `survey_parcels.geojson`.

---

## 4. Roads (L1)

- **3,753 road-reserve polygons** (`U2`/`SU2` symbology) form the raw road network.
- **`roadSegmentMapping.js`**: hand-validated **110 seed segments across 34 named roads** (E1–E16, N1–N18, N3A/N3B). This is good, trustworthy data. **Keep.**
- **`roadAttributes.js`**: full per-road table (orientation, category, ROW, lane pattern, BRT, confidence). Better authority than open web. **Keep.**
- **The problem = over-marking.** The `buildNamedRoadsData()` **gap-fill/chain-expansion algorithm** over-propagates: it tags random small/adjacent road clusters as N/E series beyond the real corridors. → L1 work = **denoise** (tighten or replace gap-fill; the seed table itself is fine), not a from-zero remap.
- **Internal tooling note:** Road Mode + segment-ID flash + localStorage naming is the *data-entry workflow* the owner uses to fix road mappings. **Keep it usable as a tool, separate from the public view** — it is not a public feature.

### Master-plan road facts (research, cite when surfacing)
- E-series ≈ **East–West**, N-series ≈ **North–South** (high-confidence inference, not a verbatim official quote).
- Hierarchy: **3 major-arterial (60m ROW), 17 arterial (50m), 17 sub-arterial (50m)**.
- **E3** = Amaravati Seed Capital / Seed Access Road (~21km spine, Vijayawada↔core, partly 8-lane built).
- **NH-16 links:** E3, E5, E11, E13, E15 connect the core to NH-16. **N6** = proposed NH-16 bypass major arterial.
- Grid module confirmed = **1 km × 1 km** (287 grids). "250m sub-block" and "R5 zone" = **unconfirmed**.
- Authoritative full schema: APCRDA Master Plan "Report – English.pdf" + APCRDA road-network deck (behind large PDFs/Scribd).

---

## 5. Master-plan grounding (research summary, sources inline)

**Footprint:** ~217 km² city; **Seed Capital Area ~17 km²** is the admin+commercial core where nearly all value concentrates. Planners: Foster+Partners (seed core), Surbana Jurong (city). Target ~3.5M pop by 2050. ~30% reserved green/blue.

**Nine themed cities** (Government, Justice, Finance, Knowledge, Health, Sports, Media, Electronics, Tourism) — branding predates the 2019–24 pause; **boundaries are indicative, mostly on paper.** Don't render as hard truth.

**Built & operating now (real value drivers):** SRM University-AP ✅, VIT-AP ✅, AIIMS Mangalagiri ✅.
**Under construction:** Government Complex (5 towers: 4 Secretariat + 1 HoD, ~₹4,668cr), Legislative Assembly, High Court, MLA/MLC quarters (near handover 2026), officer housing, E3 seed road, trunk-road network.
**Planned/committed only:** most themed cities, Krishna riverfront, Basavatarakam-Amaravati cancer hospital, Indo-UK health institute, Quantum Valley R&D hub, high-speed circular rail, IRR/ORR.

**Development status:** conceived 2015 → built 2015–19 → **paused 2019–24** (three-capitals plan + farmer protests) → **restarted 2024**. Phase-1 ~₹15,000cr; ~55 trunk roads (~₹18,779cr tendered), targeted ~April 2027; ~36 MoUs ~₹45,589cr; ~₹28,075cr investment in 2025; +20,494 acres fresh pooling + ~40,000 acres for an international airport. Timelines are government-stated (historically optimistic).

**Real price gradient (mid-2025, ₹/sq-yd — broker-sourced, use for *relative* weighting only):**
| Area | ₹/sq-yd | Driver |
|---|---|---|
| Rayapudi, Velagapudi (core) | 45–60k | Closest to Government Complex / Secretariat |
| Mandadam | 40–50k | Inside seed area |
| Thullur | 35–45k | Near Secretariat/Assembly |

**Confirmed value drivers:** (1) proximity to Government Complex/Secretariat = strongest premium; (2) core seed-area vs periphery; (3) road frontage + NH-16 connectivity (~15–30%/yr in well-connected zones); (4) riverfront = *future* premium; (5) developed/clear-title plots > raw LPS plots. → **Validates the dominant-anchor principle and the relative-heuristic approach.**

---

## 6. Why the current build is broken (evidence)

1. **Half-finished Zustand migration.** `MapContainer.jsx` now takes **no props** and reads Zustand directly, but `App.jsx` still passes `ref` + `onMapReady`/`onPlotClick`/… (all ignored). → `mapRef.current` is `null`; `setMapInstance()` never fires; saving a road name calls `mapRef.current.refreshNamedRoads()` → **crash**. Refactor left dangling mid-way.
2. **90MB GeoJSON loaded raw** — `pmtiles` is installed but **never used**; village-fallback points at a non-existent `villages/` dir. The load-time killer.
3. **Internal tooling leaked into the product** — Road Mode / segment-ID flash / localStorage naming wired through the whole public UI.
4. **Silent data correctness bugs** (§3) — will poison any distance/area scoring if not cleaned.

---

## 7. Asset inventory — keep vs rebuild vs fix

| Asset | Verdict |
|---|---|
| `plots_wgs84.geojson` (data) | **Keep** — but run ETL clean pass (§3). Convert to PMTiles for L0 perf. |
| `colors.js` (zoning, allocated-land categories, expressions) | **Keep** — high quality. |
| `roadAttributes.js` (34 roads) | **Keep** — authoritative. |
| `roadSegmentMapping.js` (110 seed segments) | **Keep** — hand-validated. |
| `allocated_lands.geojson` | **Keep** — use `label`, not `type`. |
| `MapContainer.jsx` gap-fill road algorithm | **Fix** — denoise over-marking. |
| App/MapContainer Zustand bridge | **Rebuild** — finish or restart the state architecture cleanly. |
| Raw 90MB load path | **Rebuild** — PMTiles. |
| Road-naming tool (Road Mode etc.) | **Keep as internal tool**, separate from public view. |
| Dead GeoJSON (roads/boundaries/burial/water/survey) | **Drop.** |

---

## 8. Open / deferred decisions
- **Scoring math** (dominance function, factor weights) — design after L0–L2 exist.
- **Reality/satellite layer (L3)** — feasibility + cost to be scoped.
- **Data source refresh** — owner will share the original scrape site later to cross-check gaps; work with current data for now.
- **Performance approach** — owner delegated; recommendation = **PMTiles** (needs tippecanoe; last session it wasn't on the server).
- **Ottomate Stage 1 spec backfill** — deferred by owner; this doc is the working source of truth meanwhile.
