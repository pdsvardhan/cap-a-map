---
id: adr-001-roads-from-osm-centerlines
title: Rebuild named roads from real OSM centerlines, not derived plot polygons
date: 2026-06-30
status: accepted
tags: [data, tech-choice, scope-change, curated, cat:system]
---

## Context

Named roads (the N1–N18 / E1–E16 grid) were *derived* from plot road-reserve
polygons via a hand-seed mapping (`src/utils/roadSegmentMapping.js`) plus a greedy
median-axis corridor fill (`pipeline/05_roads.mjs`). Owner testing on 2026-06-30
(in-app comment tool) flagged the roads as visibly wrong: N8 ran edge-to-edge,
rendered in disjoint pieces, and E4 was not grid-aligned.

Diagnosis confirmed two independent failure modes in the derivation:
1. **Giant aggregate polygons** in the source LPS data — `N8` (segId 91) is a single
   13-ring / 652-vertex / 13.6 km-tall blob; `N6` is 12.7 km. A seed landing on one
   makes the whole road that blob.
2. **Corridor over-fill** — the greedy fill chains far past the real road (`E7` = 16 km
   wide) and thickens across intersections (`E4` = 270 m), so roads stop looking like a
   grid. This is the 2nd rebuild on the derivation; its ceiling is too low.

## Decision

Drop the derive-from-polygons approach. Rebuild named roads from a **real centerline
source — OpenStreetMap (Overpass)** — which carries the grid as named ways. Validated
2026-06-30: OSM `N8` = a clean 2.6 km straight N-S line (vs the 13.6 km blob); E-roads
are straight E-W, N-roads straight N-S. Render roads as **lines** (one colour for all +
centre markings, per feedback #6), not per-class-coloured fills.

OSM names only 10 of 34 grid roads today, so the work is two phases: **Phase A** ships the
10 correct OSM roads; **Phase B** completes the missing 24 by anchoring the 1 km grid axes
(match unnamed OSM ways, or clip plot corridors as fallback). Full plan:
`docs/ROAD_REBUILD_PLAN.md`. `src/utils/roadAttributes.js` stays as the attribute source.

## Consequences

- **Positive:** roads become geometrically correct and grid-aligned; real per-road
  `length_km` becomes available; single-colour rendering simplifies the legend; the brittle
  seed-mapping + corridor-fill code (and the `?dev` road-naming tool) can be retired.
- **Negative / cost:** a new dependency on OSM data freshness; Phase A regresses coverage
  to 10 named roads until Phase B lands; rendering, click, highlight, and the road panel all
  move from polygon to line geometry (touches `layerDefinitions.js`, `constants.js`,
  `MapContainer.jsx`, `PlotDetailPanel.jsx`); `pipeline/05_roads.mjs` is superseded by
  `06_roads_osm.mjs`.
