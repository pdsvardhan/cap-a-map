# Feature Guide - Amaravati Capital City Interactive Map

> ⚠️ **SUPERSEDED — pre-rebuild (before 2026-06).** This document describes the
> original architecture (raw `plots_wgs84.geojson`, positional road-segment
> mapping, the internal road-naming tool) and quotes the old **95,291 plots /
> 48 villages** figures. The shipped dataset is the authoritative APCRDA
> LPSMosaicDec2024: **86,918 plots across 24 villages** (Undavalli and Penumaka
> are absent from that mosaic). The road tool was dropped per adr-002.
>
> Current sources of truth: `docs/UNDERSTANDING.md` (product + data reality),
> `docs/AMARAVATI_CONTEXT.md` (scoring intelligence base), `decisions/` (ADRs).
> Full doc backfill is tracked as to-do #394.

Complete guide to all features, how they work, and how to extend them.

---

## 1. Interactive Zoning Map

### What It Does
Displays 95,291 land plots from the Amaravati Capital City master plan on a dark basemap. Each plot is color-coded by its zoning designation (residential, commercial, parks, industrial, etc.).

### How It Works
- Data source: `public/data/plots_wgs84.geojson` (95K polygons with symbology field)
- Rendered as a MapLibre GL `fill` layer (`plots-fill`)
- Color mapping: `buildSymbologyColorExpression()` in `colors.js` creates a MapLibre `match` expression mapping 60+ symbology strings to 21 color groups
- Dark basemap: CARTO Dark Matter with all layers hidden except `background` and `water`

### How to Modify
- Change colors: Edit `ZONING_GROUPS` in `src/utils/colors.js`
- Add new symbology: Add the string to the appropriate group's `symbologies` array
- Change basemap: Edit `MAP_STYLE` in `src/utils/constants.js`

---

## 2. Interactive Zoning Legend (Zoning Explorer)

### What It Does
A panel that serves as both a **color legend** and a **filter control**. Users can:
- Toggle individual zoning categories on/off (checkboxes)
- Use quick filter pills to show only one category type
- See plot counts per group
- Toggle Allocated Lands overlay

### How It Works
- State: `activeZoningGroups` (a `Set<string>` or `null` for all) in `App.jsx`
- Filtering: `buildFilteredColorExpression(activeGroups)` generates a MapLibre paint expression where active groups get their normal color and inactive groups get `rgba(255,255,255,0.08)` (near-invisible)
- Applied via `map.setPaintProperty('plots-fill', 'fill-color', expr)` — no filter changes, all plots remain clickable
- Hierarchy: `ZONING_HIERARCHY` in `colors.js` organizes 21 groups into 7 categories

### How to Modify
- Add a category: Add to `ZONING_HIERARCHY` array and ensure the group keys exist in `ZONING_GROUPS`
- Add quick filter: Add entry to `QUICK_FILTERS` in `Legend.jsx`
- Change muted color: Edit the `rgba(255,255,255,0.08)` in `buildFilteredColorExpression()`

---

## 3. Named Roads (E/N Series)

### What It Does
Displays the 36 official named roads (E1-E16, N1-N18, N3A, N3B) as colored polygons on the map, color-coded by road category:
- **Red** = Arterial
- **Black** = Major Arterial
- **Green** = Seed Access
- **Blue** = Sub Arterial

### How It Works
1. `roadSegmentMapping.js` maps segment IDs to road names (e.g., `3745: 'E1'`)
2. `buildNamedRoadsData()` iterates all 3,750 road reserve polygons, finds ones with names (from mapping or localStorage), and creates a GeoJSON FeatureCollection
3. Each feature gets a `roadCategory` property looked up from `ROAD_DATA` in `roadAttributes.js`
4. MapLibre `match` expression colors by category using `NAMED_ROAD_COLORS` in `constants.js`
5. Labels placed at the centroid of each road's combined segments

### How to Modify
- Add road names: Edit `SEGMENT_TO_ROAD` in `roadSegmentMapping.js` (segment ID: 'road name')
- Change road colors: Edit `NAMED_ROAD_COLORS` and `NAMED_ROAD_OUTLINES` in `constants.js`
- Change road attributes: Edit `ROAD_DATA` in `roadAttributes.js`
- Road names can also be saved via the UI (stored in localStorage as fallback)

---

## 4. Road Mode

### What It Does
A special mode for interacting with road reserve polygons. When activated:
- All road reserves highlighted with orange overlay
- Clicking a road segment shows its **segment ID** as a large flash overlay and in the detail panel
- Only road reserves are clickable (regular plots are ignored)

### How It Works
- Toggle: `roadMode` state in `App.jsx`, "Roads" button in top bar
- Overlay: `road-mode-overlay` MapLibre fill layer with orange at 35% opacity
- Click handler: Uses `queryRenderedFeatures` with a **10-pixel bounding box** tolerance (fixes thin road click issues)
- Segment index: Built at load time, sorts road polygons south-to-north then west-to-east for spatially stable IDs

### How to Modify
- Change overlay color: Edit `'fill-color': '#FF8C00'` in `loadPlotData()` in MapContainer
- Change click tolerance: Edit `const tolerance = 10` in `setupInteractions()`

---

## 5. Road Segment ID System

### What It Does
Assigns a unique numeric ID (#0000-#3749) to each of the ~3,750 road reserve polygons. This lets the user:
1. Click a road segment in Road Mode to see its ID
2. Record the ID in a spreadsheet
3. Map it to a road name (E1, N5, etc.)
4. Provide the mapping back to populate `roadSegmentMapping.js`

### How It Works
1. `buildRoadSegmentIndex()` sorts all road reserve features by centroid (south-north, west-east)
2. Each gets a sequential ID (0 to N-1)
3. On click, `processRoadClick()` computes the stable key from the polygon geometry
4. Falls back to original GeoJSON geometry if MapLibre's rendered geometry doesn't match (fixes tiling/simplification mismatches)
5. `SegmentIdFlash.jsx` shows the ID as a large overlay for 2 seconds

### How to Modify
- Mapping table: Edit `SEGMENT_TO_ROAD` in `roadSegmentMapping.js`
- Flash duration: Edit `setTimeout` value in `SegmentIdFlash.jsx` (currently 1700ms)
- Flash size: Edit `fontSize: '90px'` in `SegmentIdFlash.jsx`
- Panel display size: Edit `text-3xl` class in `PlotDetailPanel.jsx` (temporary — reduce after mapping complete)

---

## 6. Search

### What It Does
Fuzzy search across all 95K+ plots, landmarks, and named roads. Supports:
- Plot codes (e.g., "28-195-821")
- Village names (e.g., "Thullur")
- Allocated land names (e.g., "SBI", "VIT")
- Road names (e.g., "E5", "N10")

### How It Works
- Uses Fuse.js with pre-built search index (`public/data/search_index.json`)
- Results show type badges (plot/landmark/road)
- Selecting a result flies the map to the location and opens the detail panel
- Named roads highlight all segments of that road and fit the map to its bounding box

### How to Modify
- Change search fields/weights: Edit `SearchBar.jsx` Fuse config
- Regenerate search index: Run `npm run data` (requires Python + source data)

---

## 7. Allocated Lands Overlay

### What It Does
Shows allocated land parcels (schools, hospitals, government offices, banks, etc.) as orange polygons with labels.

### How It Works
- Data: `public/data/allocated_lands.geojson`
- Three layers: fill, outline, labels
- Toggled from the Legend panel (Allocated Lands checkbox)
- 8 categories with keyword matching in `categorizeAllocatedLand()` in `colors.js`

---

## 8. Plot Detail Panel

### What It Does
Right-side panel showing detailed information about a clicked plot, road, or landmark.

### Plot View Shows
- Zoning: color swatch, group name, symbology code
- Area in acres and square meters
- Dimensions (if available)
- Farmer name
- Location: village, lat/lon, Google Maps link
- Neighbors: N/S/E/W regcodes

### Road View Shows
- Road name (editable, saveable to localStorage)
- Segment ID (large orange font)
- Road attributes: category, ROW, lanes, BRT, confidence
- Junction matrix: which other roads this road touches

---

## Architecture Overview

```
App.jsx (state management)
  |
  +-- MapContainer.jsx (map rendering, data loading, interactions)
  |     |-- plots-fill layer (95K polygons, zoning colors)
  |     |-- plots-outline layer
  |     |-- road-mode-overlay layer (orange highlight in Road Mode)
  |     |-- named-roads-fill/outline/labels layers
  |     |-- allocated-lands fill/outline/labels layers
  |
  +-- SearchBar.jsx (Fuse.js fuzzy search)
  +-- Legend.jsx (interactive zoning filter)
  +-- PlotDetailPanel.jsx (detail sidebar)
  +-- SegmentIdFlash.jsx (road segment ID overlay)
  +-- LoadingScreen.jsx (initial loading)
```

### State Flow
```
App.jsx
  activeZoningGroups --> MapContainer (recolors plots)
                     --> Legend (checkbox states)
  allocatedLandsVisible --> MapContainer (layer visibility)
                        --> Legend (checkbox state)
  roadMode --> MapContainer (overlay, click behavior)
  selectedPlot --> PlotDetailPanel (display data)
  flashSegmentId --> SegmentIdFlash (flash overlay)
```

---

## Known Issues and Workarounds

1. **Thin road polygons hard to click at high zoom**: Fixed with 10px bounding box tolerance in Road Mode. If still an issue, increase `tolerance` in `setupInteractions()`.

2. **Road segment IDs may shift if GeoJSON data is regenerated**: The IDs depend on sort order of centroids. If `plots_wgs84.geojson` is regenerated with different features, the mapping in `roadSegmentMapping.js` needs to be re-verified.

3. **E16 road goes out of city bounds**: The road polygon data extends beyond the visible city area into the dark basemap zone. In Road Mode, the orange overlay makes it visible. Named Roads layer also colors it.

4. **N5 road not fully clickable**: Road reserve polygons exist for N5 but are very thin in some areas. The bounding box click fix helps. User needs to click in Road Mode to find and map remaining segment IDs.

5. **Area in stable key always 0.00**: The Shoelace formula on WGS84 degree coordinates produces very small values. Not a functional issue since centroids provide sufficient uniqueness.

6. **Large bundle size (1.3MB)**: Mostly MapLibre GL JS (~800KB). Could be reduced with code splitting but not a priority since this is a data-heavy GIS app.
