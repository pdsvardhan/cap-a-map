# Data Model: Capital of Amaravati (cap-a)

## Overview

The application works with a static dataset derived from APCRDA (Andhra Pradesh Capital Region Development Authority) land pooling and planning data. All data is loaded client-side as GeoJSON and in-memory arrays.

---

## 1. Plots (95,291 features)

The primary dataset. Each feature represents one land-pooled plot in the Amaravati capital area.

**Geometry:** Polygon (WGS84 / EPSG:4326, reprojected from EPSG:32644 UTM Zone 44N)

### Used Properties

| Property | Type | Description |
|----------|------|-------------|
| `regcode` | string | Registration code -- unique identifier for the plot (e.g., "TH-1234") |
| `plot_code` | string | Plot code within the registration block |
| `farmer_n` | string / null | Name of the original landowner/farmer |
| `village` | string | Village name where the plot is located (48 unique values + "N/A") |
| `symbology` | string | Raw zoning classification from APCRDA (maps to zoning_group) |
| `alloted_ex` | string / null | Allocation status or institution name if allocated |
| `zoning_group` | string | Cleaned zoning group label (21 groups across 7 categories) |
| `lat` | number | Centroid latitude of the plot |
| `lon` | number | Centroid longitude of the plot |
| `nbr` | string / null | Neighbor reference codes (comma-separated regcodes of adjacent plots) |
| `polylength` | number | Length of the plot polygon (meters) |
| `polywidth` | number | Width of the plot polygon (meters) |

### Unused Properties (present in source but not displayed)

| Property | Reason Unused |
|----------|---------------|
| `regcode_n`, `regcode_s`, `regcode_e`, `regcode_w` | Directional neighbor codes -- redundant with `nbr` |
| `plot_categ` | Plot category -- not surfaced in UI |
| `googlemaplink` | Google Maps URL -- redundant with `lat`/`lon` |
| `township` | Township name -- not used in current filtering |
| `sector` | Sector identifier -- not used in current filtering |
| `block` | Block identifier -- not used in current filtering |
| `colony` | Colony name -- not used in current filtering |

---

## 2. Allocated Lands (87 unique allocations, 165 features)

Parcels that have been allocated to government institutions, universities, hospitals, and other entities.

**Geometry:** Polygon (WGS84)

### Used Properties

| Property | Type | Description |
|----------|------|-------------|
| `label` | string | Name of the institution or purpose of allocation |
| `type` | string | Category of allocation (e.g., "Government", "Education", "Health") |

### Unused Properties

| Property | Reason Unused |
|----------|---------------|
| `objectid` | Internal ArcGIS object ID -- not meaningful to users |
| `g_o_m_s_no` | Government Order / Municipal Sanction number -- not surfaced in UI |

---

## 3. Named Roads (34 roads)

Road network data with attributes stored in `roadAttributes.js`. Road names are assigned to GeoJSON road segments via a gap-fill algorithm and manual mapping.

### Road Attributes Schema

| Attribute | Type | Description |
|-----------|------|-------------|
| `category` | string | Road classification (e.g., "Arterial", "Sub-Arterial", "Collector") |
| `row_m` | number | Right-of-way width in meters |
| `lane_pattern` | string | Lane configuration (e.g., "4+4", "3+3", "2+2") |
| `confidence` | string | Data confidence level ("High", "Medium", "Low") based on source reliability |
| `brt_lanes` | number / null | Number of dedicated BRT (Bus Rapid Transit) lanes, if any |
| `connects_nh16` | boolean | Whether the road connects to National Highway 16 |
| `remarks` | string / null | Additional notes about the road segment |

---

## 4. Villages (48 entries)

Derived from the plots dataset. Each village has an aggregate count of plots.

### Known Issues

- **4,910 plots have `village = "N/A"`** -- these plots lack village attribution in the source data
- **Name inconsistencies:** The same village appears with variant spellings:
  - "Thullur" vs "Thulluru"
  - Other minor spelling variations exist across the dataset
- Village boundaries are not explicitly defined -- they are implied by the spatial clustering of plots

---

## 5. Search Index

A compact in-memory array built at load time for Fuse.js fuzzy search. Each entry follows this format:

```
[id, regcode, plot_code, village, symbology, alloted_ex, lat, lon]
```

| Index | Field | Purpose |
|-------|-------|---------|
| 0 | `id` | Feature index for lookback into the GeoJSON array |
| 1 | `regcode` | Searchable registration code |
| 2 | `plot_code` | Searchable plot code |
| 3 | `village` | Searchable village name |
| 4 | `symbology` | Searchable zoning classification |
| 5 | `alloted_ex` | Searchable allocation status |
| 6 | `lat` | Centroid latitude for fly-to |
| 7 | `lon` | Centroid longitude for fly-to |

---

## 6. Data Inconsistencies & Known Issues

| Issue | Impact | Mitigation |
|-------|--------|------------|
| Village name variants ("Thullur" / "Thulluru") | Search may miss plots; village stats may split counts | Needs normalization mapping |
| 4,910 plots with `village = "N/A"` | ~5% of plots invisible in village-based filtering | Flag in UI, investigate source data |
| Python pipeline produces 22 zoning groups vs JS code handles 21 | One zoning group may be unmapped and fall through to default color | Audit pipeline output against JS mapping |
| No symbology validation | Invalid or new symbology values silently get default styling | Add validation layer with warnings |
| 170MB GeoJSON payload | Unacceptable load time on slow connections | Convert to PMTiles (~15MB target) |
| Road names in localStorage only | Data loss on browser clear; no collaboration possible | Implement export/import or server-side storage |

---

## Entity Relationship Diagram (Conceptual)

```
Plots (95,291)
  |-- belongs to --> Village (48)
  |-- has zoning --> Zoning Group (21) --> Zoning Category (7)
  |-- may overlap --> Allocated Land (87 unique)
  |-- adjacent to --> Road Segment --> Named Road (34)
  |-- indexed in --> Search Index
```
