# Changelog

All notable changes to the Amaravati Capital City Interactive Map (Cap A) are documented here.

---

## [Unreleased] — Current best version (Feb 2025)

### Summary

This release improves the loading experience, simplifies basemap handling, and adds full support for road reserves (U2/SU2): users can click road segments, name them, and persist names in the browser.

### Changes

- **Loading screen**
  - Replaced simple spinner with a staged word spinner (“loading map”, “loading plots”, “rendering”, “ready”, etc.) and an animated progress bar (0–100%).
  - Progress is derived from loading status messages; percentage animates smoothly.
  - Visual refresh: “Cap A” branding, gradient progress bar (orange → purple), cleaner typography.

- **Map (MapContainer)**
  - **Basemap:** Switched to a “nuclear” approach: hide all CARTO Dark Matter layers except `background` and `water`. This removes roads, labels, buildings, and other basemap noise without maintaining a long list of layer IDs that can change.
  - **Road reserves:** Clicking a road reserve (U2/SU2) now opens a detail panel instead of being ignored. Centroid is computed when lat/lon are missing. Road names can be entered, saved, and cleared; they are stored in `localStorage` keyed by feature id.
  - **Highlight:** Selected road reserves are highlighted on the map like regular plots.
  - Minor: `useImperativeHandle` dependency array removed (no functional change).

- **Plot detail panel (PlotDetailPanel)**
  - **Landmark panel:** Existing allocated-land/landmark view retained (category, Google Maps link).
  - **Road panel (new):** Dedicated panel for road reserves with:
    - Header: “Road Reserve”, symbology, editable name (default “Unnamed Road”).
    - “Road Name” section: text input, Save, and “Remove name” when saved.
    - Area, optional location (village/township), position (lat/lon), and Google Maps link.
    - Footer note that names are saved in the browser.

- **Styles (index.css)**
  - New/updated styles for the loading screen: word-spinner container, `.word-slot` enter/exit animations, `.progress-track` / `.progress-fill`, gradient and typography tweaks.

- **Utils (colors.js)**
  - Small fix/consistency update in zoning color handling (no behavioral change to map rendering).

---

## Previous versions

- **0e14856** — Fix plot outlines: dark lines, high opacity for clear demarcation.
- **793856e** — Fix basemap noise, update color palette, improve plot outlines.
- **8fc97a4** — Remove named roads (E/N) layer (incorrect geometry).
- **4831e97** — Phase 1.2: Anchor-verified E/N named roads.
- **9152185** — Phase 1.1: ArcGIS colors, dark basemap, water fix, named roads, search improvements.
- **d159b82** — Initial commit: Amaravati Capital City Interactive Map (Phase 1).
