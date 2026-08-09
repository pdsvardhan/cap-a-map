# Feature Specification: Capital of Amaravati (cap-a)

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

## Feature Matrix

| # | Feature | Priority | Status | Notes |
|---|---------|----------|--------|-------|
| | **MAP & VISUALIZATION** | | | |
| 1 | Zoning-colored plot map (95K polygons) | Must | Exists | 21 zoning groups mapped to 7 color categories. Full polygon rendering with fill + outline |
| 2 | Interactive legend / filter (21 groups, 7 categories) | Must | Exists | Click to toggle individual groups or quick-filter by category. Shows plot counts per group |
| 3 | Plot detail panel (zoning, area, farmer, location) | Must | Exists | Side panel shows all metadata on plot click. Includes regcode, plot_code, village, area, farmer name |
| 4 | Named roads overlay (34 roads, gap-fill algorithm) | Must | Exists | Road segments colored by name. Gap-fill algorithm propagates names to unnamed adjacent segments |
| 5 | Road detail with attributes (ROW, lanes, BRT, confidence) | Must | Exists | Click a road segment to see right-of-way width, lane pattern, BRT lanes, and data confidence level |
| 6 | Allocated lands overlay (200+ parcels) | Must | Exists | Orange-highlighted parcels showing government/institutional land allocations with labels |
| 7 | Area heatmap mode | Must | Exists | Gradient color mode based on plot area (sq. meters). Reveals density and size distribution patterns |
| 8 | Fuzzy search (Fuse.js across plots/landmarks/roads) | Must | Exists | Search by regcode, village name, farmer name, or landmark. Fly-to on selection |
| | **PERFORMANCE & RELIABILITY** | | | |
| 9 | PMTiles data loading | Must | Missing | 170MB GeoJSON must be converted to ~15MB PMTiles for acceptable load times. Currently loads full GeoJSON |
| 10 | Error boundaries | Must | Missing | App fails silently on data load errors or render crashes. No fallback UI, no error reporting |
| 11 | Mobile responsive layout | Must | Missing | Fixed pixel widths cause horizontal overflow on mobile. Legend panel unusable on small screens |
| | **ANALYTICS & EXPORT** | | | |
| 12 | Village statistics dashboard | Should | Missing | Aggregate stats per village: plot count, area distribution, zoning breakdown, allocation percentage |
| 13 | Road name export/import | Should | Missing | Road name assignments only persist in localStorage. No export to file or sync capability |
| | **ACCESSIBILITY & UX** | | | |
| 14 | Keyboard navigation | Should | Missing | Partial support only. Legend filters and search work, but map interactions and panel navigation do not |
| 15 | Loading error recovery | Should | Missing | If initial data load fails, the loading screen sticks forever. No retry button, no error message |
| | **NICE TO HAVE** | | | |
| 16 | Share / permalink (URL params) | Could | Missing | Encode current view (center, zoom, filters, selected plot) in URL params for sharing |
| 17 | Plot comparison | Could | Missing | Select 2+ plots and compare their attributes side-by-side |
| 18 | Offline PWA | Could | Missing | Service worker caching for offline access to map and data |
| 19 | Construction progress overlay | Could | Missing | Layer showing actual construction status vs planned allocation (requires external data source) |

## Priority Definitions

- **Must:** Required for a usable public launch
- **Should:** Important for a good user experience, planned for v1.x
- **Could:** Desirable enhancements, backlog for future versions
