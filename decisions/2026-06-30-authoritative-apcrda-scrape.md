---
id: adr-002-authoritative-apcrda-scrape
title: Source all geodata from the live APCRDA ArcGIS server, not reconstruction
date: 2026-06-30
status: accepted
tags: [data, tech-choice, re-wire, curated, cat:system]
---

## Context

The N/E road grid was wrong for months. adr-001 assumed no authentic road geometry
existed and rebuilt it (OSM anchors + a calibrated 1 km grid model). Owner clarified
the real history: the road-reserve polygons were authentic government data, but the
N/E *names* were hand-assigned to them by positional segment index (which drifts on
re-clean) and the gaps were filled by guesswork — a fabricated naming layer over real
geometry. Same story, in spirit, for the messy zone labels (raw government symbology).

Probing `gis.apcrda.org` revealed its ArcGIS REST server is **open and authoritative**.
`AmaravatiCapitalCityLayers/MapServer` exposes the real layers: `AmaravatiTrunkRoadNetwork`
(35 named road polygons with `roadname` + `rd_width`), `LPSMosaicDec2024` (86,918 plots
with official `lu_code`/`lu_desc` alongside the messy `symbology`), `LandAllotmentsFeb2025`
(names/category/zoning/**FSI**), `AvailableLandsFeb2025` (FSI), and the admin hierarchy
(Townships/Sectors/Colony/Blocks/Villages).

## Decision

Stop reconstructing. Source everything from the live APCRDA server via
`scripts/scrape_apcrda.mjs` (ArcGIS `f=geojson`, WGS84, paginated) into
`public/data/sources/apcrda/`. Roads come straight from `AmaravatiTrunkRoadNetwork`
(`pipeline/07_roads_authoritative.mjs`) — normalised, dissolved, enriched from
`roadAttributes.js`, ROW from the authentic `rd_width` — rendered as filled polygons.
Supersedes adr-001. Pipelines 05 (seed corridor-fill) and 06 (OSM grid-model) are
deprecated. Big raw layers are gitignored (regenerable); small pipeline inputs committed.

## Consequences

- **Positive:** roads are now authentic government geometry with real names/widths — the
  4-month roadblock is resolved. The same source unlocks the label fix (`lu_desc`), the
  allotted-vs-zoned untangle (`LandAllotments`), real location context (admin hierarchy,
  replacing the meaningless `grid_id`), and FSI for the scoring engine.
- **Negative / follow-up:** dependency on the gov server (cert chain incomplete → TLS verify
  off during scrape; data is public). Plots/labels/allotments/admin still need their own
  rebuild passes off the new sources. The 199 MB plot mosaic is not committed.
