# User Flows: Capital of Amaravati (cap-a)

## Flow 1: Explore the Map

**Goal:** Get an overview of the Amaravati capital layout and inspect individual plots.

1. User opens the app in a browser
2. Loading screen appears while 95K plot GeoJSON is fetched and parsed
3. Map renders with all plots color-coded by zoning category
4. User pans and zooms to explore different areas of the capital
5. User clicks on a plot polygon
6. Detail panel slides open showing: regcode, plot_code, zoning group, area (sq.m), farmer name, village, and neighboring plots
7. User clicks the close button or clicks elsewhere on the map to dismiss the panel

**Edge cases:**
- Plot boundaries overlap at low zoom levels -- clicking picks the topmost feature
- Some plots have incomplete metadata (farmer_n = null, village = "N/A")

---

## Flow 2: Filter by Zoning

**Goal:** Isolate specific zoning types to understand land use distribution.

1. User opens the legend panel (visible by default on desktop)
2. Legend displays 7 zoning categories, each expandable to show individual groups (21 total)
3. User clicks a quick-filter category button (e.g., "Residential") to show only that category
4. Map recolors -- non-matching plots fade or hide, matching plots remain vivid
5. Legend updates to show the filtered plot count
6. User clicks individual zoning groups within a category to further refine the selection
7. User clicks "Show All" to reset filters

**Edge cases:**
- Some zoning groups have very few plots (< 10) and may be hard to spot on the map
- Filter state is not persisted across page reloads

---

## Flow 3: Search for a Plot

**Goal:** Find a specific plot by regcode, village, or farmer name.

1. User clicks the search bar (top of the screen)
2. User types a query -- e.g., a regcode like "TH-1234", a village name like "Thullur", or a farmer name
3. Fuse.js fuzzy search returns ranked results in a dropdown as the user types
4. User selects a result from the dropdown
5. Map flies to the selected plot location with an appropriate zoom level
6. Detail panel opens automatically showing the plot metadata

**Edge cases:**
- Village name inconsistencies mean "Thullur" and "Thulluru" may return different results
- Searching by farmer name may return many results if the name is common
- If no results match, the dropdown shows an empty state message

---

## Flow 4: Explore Road Network

**Goal:** Understand the planned road network -- names, widths, and transit corridors.

1. User toggles "Road Mode" from the layer controls
2. Road segments render as colored lines overlaying the plot map
3. Each named road (34 total) gets a distinct color; unnamed segments appear in gray
4. User clicks on a road segment
5. Road detail panel shows: segment ID, current name (if assigned), right-of-way width, lane pattern, BRT lanes (if any), and confidence level
6. If the segment is unnamed, user can enter a road name and click "Save"
7. The gap-fill algorithm propagates the name to adjacent unnamed segments along the same corridor
8. Road name is saved to localStorage

**Edge cases:**
- Gap-fill may propagate names incorrectly at intersections -- manual correction needed
- Road names only persist in localStorage (no server-side storage)
- Some road segments lack attribute data (ROW, lanes) and show "Unknown"

---

## Flow 5: Check Allocated Lands

**Goal:** See which parcels have been allocated to government institutions.

1. User toggles the "Allocated Lands" layer in the legend panel
2. Orange-highlighted parcels appear on the map (200+ features, 87 unique allocations)
3. User zooms in to a cluster of allocated parcels
4. User clicks on an allocated parcel
5. Detail panel shows: institution/purpose label and allocation type
6. User can cross-reference with the underlying plot data by toggling the allocation layer off

**Edge cases:**
- Some allocated parcels overlap multiple underlying plots
- A few allocations have generic labels (e.g., "Government") without specific institution names

---

## Flow 6: Compare Plot Sizes

**Goal:** Identify patterns in plot size distribution across the capital.

1. User switches the color mode from "Zoning" to "Plot Size" using the mode selector
2. Map recolors all 95K plots on a continuous gradient based on area (sq. meters)
3. Small plots appear in one end of the spectrum, large plots in the other
4. User visually identifies clusters of large or small plots
5. User clicks individual plots to see exact area values in the detail panel
6. User switches back to "Zoning" mode when done

**Edge cases:**
- A few outlier plots with very large areas can skew the gradient -- consider logarithmic scale
- Color mode preference is not persisted across page reloads
