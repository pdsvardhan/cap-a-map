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

---

## Session 2026-07-01 (2) — Ottomate Stage 0→3 catchup + deploy

**Stage:** Stage 0 (ND1 catchup) → 1 (SO1) → 2 (UI/tech) → 3 (verify + deploy, built scope).

**What changed:**
- **Stage 0/1:** Backfilled locked SO1 into the Ottomate tracker from canonical docs — 13
  features (each with ACs), 8 flows (steps + edge cases), 2 pages, full cross-doc links, 6
  non-goals + 6 success criteria. ND1 → `staging/ND1.yaml`. adr-003.
- **Stage 2:** UI master plan locked (C Statutory Dark default + D Statutory Light); data
  contract flatfile/volume-mount/none; adr-004 (tech stack), adr-005 (offline-pipeline thin
  client), adr-006 (build plan); Workflow + System diagrams; `CODING_GUIDELINES.md`.
- **Stage 3 (built scope):** 4 independent verifier sub-agents (4 passes) on 8 built features.
  7 APPROVE → done; feat-data-modes ITERATE (building); feat-road-tool dropped (superseded by
  adr-002). 3 stale ACs corrected to match locked decisions.
- **Fix 0a024e9:** feat-plot-detail — lat/lon + colony + adjacent plots (adj_plots
  "dir:regcode" strings) rendered; empty map-click dismisses the panel.
- **Deployed** rebuild → project-cap-a (port 8502), replacing the broken build. Smoke test
  green; deploy artifact + test_run recorded. All HARD anti-gaslight rules = 0.

**Decisions:** adr-003 (SO1 staging), adr-004 (tech stack), adr-005 (offline-pipeline thin
client), adr-006 (build plan).

**Next session pick-up:**
- Scoring engine L2–L4 (#127/#135/#136) — the product core; L0/L1 now verified + live.
- Data-mode value ramp + wire area ramp to designTokens.rampHue (#137).
- Public exposure: cap-a.vault7a.xyz is SSO-gated (#147). Dead-code cleanup (#146).
- Known infra: Ottomate ND1-finalize has no API write path (#145).

---

## Session 2026-07-03 — Live map hotfix (ops)

**Stage:** post-deploy operations (no Stage change; lifecycle still `building`).

**Symptom:** live app (cap-a.vault7a.xyz) hung on the loading screen at 10% — the map never
rendered. Owner reported "opening but broken."

**Root cause:** nginx was gzipping `plots.pmtiles`. `nginx.conf` had `application/octet-stream`
in `gzip_types` and `.pmtiles` maps to that type, so a browser's `Accept-Encoding: gzip` + Range
request returned a chunked gzip `200` with no `206`/`Content-Range`/`Content-Length` → PMTiles
byte-serving broke and MapLibre threw. Latent since the March Docker setup (e11ab8d); became
fatal on the 2026-07-01 deploy when the map switched from GeoJSON to PMTiles. Server + every other
data file served fine (200s) — only the tiles were killed, which is why it looked "broken but open."

**Fix (cf7e04b, rebuild):** removed `application/octet-stream` from `gzip_types`; gave `.pmtiles`
its own nginx location with `gzip off` + a comment. Applied in-container for instant relief, then
SCP'd to build ctx + `docker compose up -d --build`. Verified: fresh container returns `206` (no
gzip) for `gzip + Range`; browser renders the full map (95k plots, E/N grid labels, landmarks,
roads, waterbodies) with no recurring console errors.

**Decisions:** none (candidate ADR "never gzip .pmtiles" / cat:reliability offered, not yet taken).
**Friction:** none blocking. Owner keeps NO local checkout by design (working tree = `.git` +
`CLAUDE.md`); do not `git restore` it — edit specific files transiently, commit + push, re-clean.

**Next session pick-up:**
- Scoring engine L2–L4 (#127/#135/#136) — the product core, still the next real feature work.
- Optional: record the gzip/pmtiles fix as an ADR (recruiter-readable, cat:reliability).
- Value/Area data-mode ramps (#137); dead-code cleanup (#146); public exposure (#147).
