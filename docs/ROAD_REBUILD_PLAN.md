# Named-Roads Rebuild Plan — real-source centerlines

**Status:** planned (decision = adr-001-roads-from-osm-centerlines)
**Owner feedback that triggered it:** 2026-06-30 comment-tool #2/#3/#4 (roads "behave weird", N8 edge-to-edge, E4 not grid-aligned) + #6 (single colour).
**Supersedes:** the derive-from-plot-polygons approach (`pipeline/05_roads.mjs` + `src/utils/roadSegmentMapping.js` seeds).

## Why the current approach fails (diagnosed, not assumed)

Named roads are *derived* from plot road-reserve polygons by a seed mapping + greedy
median-axis corridor fill. Two independent failure modes, both confirmed in the data:

1. **Giant aggregate polygons.** A few road-reserve features in the source LPS data are
   city-wide multi-ring blobs. `N8` (segId 91) = one Polygon with **13 rings / 652 verts /
   13.6 km tall**. `N6` (segId 72) = 12.7 km. When a seed lands on one, the whole "road"
   becomes that blob → edge-to-edge, disjoint rendering (#2/#3).
2. **Corridor over-fill.** The greedy fill chains segments far past the real road and across
   intersections. `E7` = **16 km wide** (13 chained segments); `E4` thickened to 270 m and
   stopped looking like a grid line (#4).

The derivation has a low ceiling — this is the 2nd rebuild attempt on it. Drop it.

## Real source (validated 2026-06-30)

OSM (Overpass) carries the Amaravati grid as **named centerline ways**, and the geometry is
clean and correctly grid-aligned:

| Road | OSM total len | orientation | E-W / N-S span |
|---|---|---|---|
| N8 | 2.6 km | N-S | 0.1 / 2.8 km (straight vertical ✓) |
| N9 | 11.0 km | N-S | 1.2 / 9.3 km |
| N7 | 6.2 km | N-S | 0.6 / 6.0 km |
| N10 | 3.1 km | N-S | 0.1 / 5.3 km |
| E3 | 4.1 km | E-W | 4.1 / 0.0 km (straight horizontal ✓) |
| E6 | 4.9 km | E-W | 4.9 / 0.0 km |
| E8 | 5.2 km | E-W | 5.1 / 0.1 km |
| E9 | 5.6 km | E-W | 7.5 / 0.1 km |
| E12, N11 | partial (<0.5 km) | — | only built/mapped stub |

**Coverage caveat:** OSM names only **10 of 34** grid roads (E3,E6,E8,E9,E12,N7,N8,N9,N10,N11).
The other 24 are not yet labelled (Amaravati is under construction). Neither source is complete
alone: OSM has correct geometry but ~30% naming; plot polygons have full spatial coverage but
bad naming. So the rebuild is two phases.

Overpass query used (bbox = capital footprint):
```
[out:json][timeout:120];
(way["highway"]["highway"!~"footway|path|service|cycleway|pedestrian|track|steps|construction"](16.41,80.42,16.55,80.57););
out geom;
```

## Plan

### Phase A — MVP: render OSM's named grid roads (correctness-first)
1. New pipeline stage `pipeline/06_roads_osm.mjs`: fetch (or read cached) OSM ways, keep those
   whose `name`/`ref` matches `^[NE]\d+[AB]?$` plus Seed Access Road + NH-16. Merge multi-way
   roads per name into one MultiLineString. Output `public/data/named_roads.geojson` (LINES now,
   not polygons) + `named_roads_index.json` (center/bbox/len_km/orientation + merge `ROAD_DATA`
   attrs from `roadAttributes.js`).
2. Render as **lines**, not fill polygons: one casing colour for ALL named roads + a centre
   dash/marking (addresses #6 — drop per-class colours). Update `layerDefinitions.js`
   (`getNamedRoads*`), `constants.js` (collapse `NAMED_ROAD_CATEGORY_COLORS` → single token +
   marking spec), and the click/highlight handlers (line geometry).
3. Panel: keep classification/ROW/lanes/BRT from `roadAttributes.js`; show real `length_km`
   from OSM geometry (also satisfies todo #129's length_km half). Drop seg/seed-count fields.
4. Regenerate, build, verify live (z12 + per-road click) against the 4 feedback screenshots.

### Phase B — grid completion (the missing 24)
Anchor the known roads' constant axis (each N-road = a longitude, each E-road = a latitude),
fit the **1 km grid spacing**, then either:
- (B1) match *unnamed* OSM grid ways to the inferred axis position and label them, or
- (B2) clip the plot road-reserve corridors to each inferred axis line as a fallback geometry.
Phase B is its own step; decide B1 vs B2 after Phase A is live.

## Don't-break list
- `src/utils/roadAttributes.js` (34 named roads, attrs) — keep; it's the attribute source. Also
  apply the AMARAVATI_CONTEXT.md §2 corrections (arterials 50 m not 60 m; E3 = major-arterial w/
  BRT; NH-16 links = E5,E7,E9,E11,E13,E15) with owner sign-off — these change panel values.
- `src/utils/colors.js` zoning symbology — untouched by this work.
- Keep the dev road-naming tool (`?dev`) working or retire it explicitly (it edited the old
  seed flow; obsolete under OSM source — confirm with owner before removing).
