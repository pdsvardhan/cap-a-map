# File Guide - Amaravati Capital City Interactive Map

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

Every file in this project explained. Last updated after dev branch merge.

---

## Root Files

| File | Purpose |
|------|---------|
| `package.json` | Node.js project config. Lists all dependencies (React, MapLibre, Turf, Fuse.js, Tailwind). Run `npm install` to set up, `npm run dev` to start dev server, `npm run build` for production. |
| `vite.config.js` | Vite bundler config. Sets up React plugin and Tailwind CSS. Port defaults to 3000. |
| `index.html` | Entry HTML file. Loads the React app via `src/main.jsx`. Contains viewport meta and page title. |
| `CHANGELOG.md` | Version history. Documents every merge/branch with what changed. Update this after every significant change. |

---

## `src/` - Application Source Code

### Entry Point
| File | Purpose |
|------|---------|
| `src/main.jsx` | React entry point. Mounts `<App />` into the DOM root element. Imports global CSS. |
| `src/App.jsx` | Main application component. Manages all top-level state: selected plot, road mode, zoning filters, legend visibility. Renders the map, search bar, legend panel, detail panel, and segment ID flash overlay. |

### Components

#### `src/components/Map/MapContainer.jsx`
The core map component (700+ lines). Handles:
- MapLibre GL initialization with CARTO Dark Matter basemap
- Loading 95K+ plot polygons from GeoJSON
- Hiding basemap noise (keeps only background + water)
- Plot click/hover interactions with road mode support
- Named roads layer (color-coded by road category: arterial/major arterial/seed access/sub-arterial)
- Road segment index building (3,750 segments, sorted spatially, assigned stable IDs)
- Zoning filter: dynamically recolors plots based on active legend selections
- Allocated lands overlay loading and visibility control
- Bounding box click tolerance for thin road polygons in Road Mode

#### `src/components/Search/SearchBar.jsx`
Fuzzy search bar using Fuse.js. Searches across:
- Plot codes (regcode)
- Village names
- Allocated land names (landmarks)
- Named roads (E1-E16, N1-N18)
Results show type badges and fly the map to the selected result.

#### `src/components/PlotDetail/PlotDetailPanel.jsx`
Right-side detail panel. Shows different views depending on what was clicked:
- **Regular plot**: Zoning info, area, dimensions, farmer name, location, neighbors, Google Maps link
- **Road reserve**: Road name (with save/edit), road attributes (category, ROW, lanes, BRT), segment ID (large orange font), junction matrix
- **Landmark**: Allocated land name, category, location

#### `src/components/Legend/Legend.jsx`
Interactive "Zoning Explorer" panel. Features:
- 7 hierarchical categories (Residential, Commercial, Parks, Public, Special, Mobility, Other)
- 21 zoning groups with individual checkboxes and color swatches
- Quick filter pills (one-click to show only residential, commercial, etc.)
- Select All / Clear buttons
- Allocated Lands toggle
- Live plot count at bottom
- When a group is unchecked, those plots fade to near-invisible on the map

#### `src/components/SegmentIdFlash.jsx`
Full-screen overlay that flashes a large `#XXXX` segment ID for 2 seconds when clicking a road segment in Road Mode. Helps the user identify segment IDs for the mapping table.

#### `src/components/LoadingScreen.jsx`
Animated loading screen shown during initial data load. Shows staged status messages with a progress bar.

### Utils

| File | Purpose |
|------|---------|
| `src/utils/colors.js` | Zoning color definitions. Contains `ZONING_GROUPS` (21 groups, 60+ symbology strings with colors), `ZONING_HIERARCHY` (7 categories for the legend), `buildSymbologyColorExpression()` for MapLibre paint, `buildFilteredColorExpression()` for zoning filtering, `ROAD_RESERVE_SYMBOLOGIES` set, and `ALLOCATED_LAND_CATEGORIES` with keyword matching. |
| `src/utils/constants.js` | App-wide constants: map center coordinates, zoom levels, CARTO basemap URL, data file paths, all MapLibre layer IDs, named road colors (category-based: red=arterial, black=major arterial, green=seed access, blue=sub-arterial). |
| `src/utils/formatters.js` | Display formatting helpers: area (acres/sq.m), dimensions, farmer names, neighbor codes. Used by PlotDetailPanel. |
| `src/utils/roadAttributes.js` | Complete road data for all 36 named roads (N1-N18, N3A, N3B, E1-E16). Each road has: series, orientation, category, ROW width, lane pattern, BRT presence, NH16 connectivity, confidence level, and remarks. |
| `src/utils/roadSegmentMapping.js` | **User-maintained mapping table**. Maps segment IDs to road names (e.g., `3745: 'E1'`). Currently has 53 entries covering all E and N roads. This is the primary source for road naming; localStorage is the fallback. |
| `src/utils/junctionMatrix.js` | Builds a junction matrix using Turf.js `booleanTouches`. Determines which named roads physically touch/intersect each other. Shown in the road detail panel. |

### Styles

| File | Purpose |
|------|---------|
| `src/styles/index.css` | Global CSS. Tailwind imports, custom animations (slide-in panels, loading screen, segment ID flash), map container sizing, scrollbar styling. |

### Placeholder Directories
- `src/components/Filters/` - Empty, reserved for future filter components
- `src/components/Stats/` - Empty, reserved for future statistics/analytics components
- `src/hooks/` - Empty, reserved for custom React hooks

---

## `public/data/` - GeoJSON Datasets (183 MB total)

| File | Size | Purpose |
|------|------|---------|
| `plots_wgs84.geojson` | ~170 MB | **Main dataset**. 95,291 plot polygons with properties: regcode, plot_code, village, symbology, alloted_ex, area, farmer name, neighbors (N/S/E/W). Generated by `scripts/process_all.py` from source shapefiles. |
| `search_index.json` | ~8 MB | Compact search index for Fuse.js. Contains abbreviated plot fields (rc, pc, vi, sy, ae, la, lo) plus landmark entries for allocated lands. |
| `allocated_lands.geojson` | ~500 KB | Allocated land parcels (schools, hospitals, government buildings, banks, etc.) with labels. 200+ landmarks. |
| `allocated_lands_index.json` | ~20 KB | Index of allocated land entries with names and coordinates for search. |
| `village_index.json` | ~2 KB | Index of 25 villages with plot counts and file references. Used for fallback village-by-village loading. |
| `villages/` | ~170 MB | Individual village GeoJSON files (25 files). Fallback if single-file load fails. |
| `roads.geojson` | ~1 MB | Legacy village road lines. **No longer loaded** (removed in layers cleanup). |
| `burial_grounds.geojson` | ~50 KB | Legacy burial ground polygons. **No longer loaded**. |
| `boundaries.geojson` | ~200 KB | Legacy R1 village boundary lines. **No longer loaded**. |
| `survey_parcels.geojson` | ~5 MB | Survey parcel outlines. Not currently used in the UI. |
| `waterbodies.geojson` | ~100 KB | Water body polygons. Not currently loaded (basemap has water layer). |

---

## `scripts/` - Data Pipeline

| File | Purpose |
|------|---------|
| `scripts/process_all.py` | Python script that converts source CSV + shapefiles into the GeoJSON files in `public/data/`. Reads from `C:\Users\pdsva\Desktop\CapA Data\Cap A data`. Run with `npm run data` or `python scripts/process_all.py`. Requires Python 3 with geopandas, shapely, pandas. |

---

## `dist/` - Production Build Output

Generated by `npm run build`. Contains minified HTML/JS/CSS ready for deployment. Do not edit manually.

---

## Setup Instructions

```bash
# 1. Open project folder in terminal
cd "C:\Users\pdsva\Desktop\PROJECT cap a"

# 2. Install dependencies (one-time)
npm install

# 3. Start development server
npm run dev
# Opens at http://localhost:3000

# 4. Production build
npm run build
# Output in dist/ folder

# 5. Regenerate data (only if source shapefiles changed)
npm run data
# Requires Python 3 + geopandas
```

**The project is fully self-contained.** All data files are in `public/data/`. The only external folder reference is `scripts/process_all.py` which reads source shapefiles from `C:\Users\pdsva\Desktop\CapA Data\Cap A data` — but you only need that if regenerating the GeoJSON data from scratch.
