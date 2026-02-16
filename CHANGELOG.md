# Changelog

All notable changes to the Amaravati Capital City Interactive Map (Cap A) are documented here.

---

## [v2.0] - Interactive Legend, Road Mapping, Layers Cleanup (Feb 2025)

**Merged: dev -> master**

### Major Features

- **Interactive Zoning Legend ("Zoning Explorer")**
  - Complete rewrite of the passive legend into an interactive filter panel
  - 7 hierarchical categories with collapsible groups, checkboxes, color swatches
  - Quick filter pills (Residential, Commercial, Parks, Public, Industrial, Mobility)
  - Select All / Clear buttons; Allocated Lands toggle
  - Live plot count; inactive groups fade to near-invisible on map

- **Road Segment ID System**
  - 3,750 road reserve polygons indexed with spatially stable IDs
  - Flash overlay (90px, 2 sec) and large panel display for easy identification
  - Mapping table with 53 entries covering E1-E16, N1-N18

- **Named Roads Color-Coded by Category**
  - Red = Arterial, Black = Major Arterial, Green = Seed Access, Blue = Sub Arterial
  - Bold labels, zoom-responsive sizing, road attributes in detail panel

- **Road Mode Click Fix**
  - Bounding box query with 10px tolerance for thin road polygons
  - Fixes Weird1/Weird2/N5 clickability issues

### Layers Cleanup
- Removed legacy overlays (old village roads, burial grounds, R1 boundaries)
- Deleted LayerControls.jsx and Layers button
- Allocated Lands toggle moved into Legend panel

### New Files
- `src/utils/roadSegmentMapping.js`, `src/components/SegmentIdFlash.jsx`
- `docs/FILE_GUIDE.md`, `docs/FEATURES.md`

### Deleted Files
- `src/components/Legend/LayerControls.jsx`

---

## [v1.0] - Base Version (5dba5eb) (Feb 2025)

**Tag: mvp1**

### Summary
Loading screen, basemap cleanup, and road reserve naming support.

### Changes

- **Loading screen**
  - Staged word spinner with animated progress bar
  - "Cap A" branding, gradient progress bar

- **Map (MapContainer)**
  - Nuclear basemap: hide all CARTO Dark Matter layers except background + water
  - Road reserve click handling with name save/edit in localStorage
  - Selected road reserves highlighted on map

- **Plot detail panel**
  - Landmark panel for allocated lands
  - Road panel with editable name, area, location, Google Maps link

- **Styles**
  - Loading screen animations, panel slide-in, scrollbar styling

---

## Previous Commits

- **0e14856** - Fix plot outlines: dark lines, high opacity for clear demarcation
- **793856e** - Fix basemap noise, update color palette, improve plot outlines
- **8fc97a4** - Remove named roads (E/N) layer (incorrect wiggly geometry)
- **4831e97** - Phase 1.2: Anchor-verified E/N named roads
- **9152185** - Phase 1.1: ArcGIS colors, dark basemap, water fix, named roads, search
- **d159b82** - Initial commit: Amaravati Capital City Interactive Map (Phase 1)
