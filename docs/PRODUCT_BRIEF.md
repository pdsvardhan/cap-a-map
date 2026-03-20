# Product Brief: Capital of Amaravati (cap-a)

## Problem Statement

No publicly accessible, interactive map of Amaravati Capital City's 95,000+ plots exists today. APCRDA data is locked away in ArcGIS servers and scattered across PDFs. Citizens, investors, and urban planning enthusiasts have no easy way to explore what is planned where.

The capital city project encompasses 95,291 land-pooled plots across 48 villages, with a planned grid road network, BRT corridors, and mixed-use zoning -- but all of this information is fragmented and inaccessible to the public.

## Target Users

| User Segment | Need |
|---|---|
| **General Public (AP Citizens)** | Check the status of the capital, find specific plots, understand what is being built where |
| **Real Estate Investors** | Evaluate zoning classifications, plot sizes, road proximity, and land allocation patterns |
| **Urbanist Nerds** | Explore the grid road network, BRT corridors, zoning distribution, and city planning decisions |
| **Journalists & Researchers** | Analyze land allocation patterns, village-wise distribution, and institutional allotments |

## Core Value Proposition

The only searchable, filterable, interactive map of all 95,291 Amaravati plots with:
- Zoning color-coding (21 groups across 7 categories)
- Road network visualization (34 named roads with attributes)
- Land allocation data (200+ allocated parcels)
- Fuzzy search across plots, landmarks, and roads

## Data Sources

| Source | Details |
|---|---|
| **APCRDA Land Pooling Scheme GeoJSON** | 95,291 polygons, originally in EPSG:32644 (UTM Zone 44N), reprojected to WGS84 |
| **APCRDA Land Allotments** | 200+ allocated parcels (government institutions, universities, hospitals, etc.) |
| **Road Network Attributes** | 34 named roads sourced from DPR/PMC documents with ROW, lane patterns, BRT info |
| **Plot Metadata CSV** | Farmer names, regcodes, plot codes, areas, neighbor references |

## Tech Stack

- **Frontend:** React 19 + Vite
- **Map Engine:** MapLibre GL JS
- **Styling:** Tailwind CSS
- **Basemap:** Dark CARTO tiles
- **Search:** Fuse.js (client-side fuzzy search)
- **Data Format:** GeoJSON (target: PMTiles for production)

## Constraints

- **Static dataset** -- there is no live APCRDA API; all data was extracted and processed offline
- **Village name inconsistencies** -- source data has variants like "Thullur" vs "Thulluru" and 4,910 plots with village = "N/A"
- **Road segment mapping is partially manual** -- road names were assigned to segments using a gap-fill algorithm supplemented by manual corrections
- **Large payload** -- the raw GeoJSON is ~170MB; PMTiles conversion is required for production viability
