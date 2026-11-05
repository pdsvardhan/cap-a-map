# Cap-A

An interactive map of Amaravati, the planned capital of Andhra Pradesh, India. It shows every plot in the planning authority's land pooling map, plus the named roads and land allotments.

Live site: https://cap-a.vault7a.xyz

> **About this public copy.** Published in November 2026 with its real commit history, which starts in February 2026. One internal notes file was left out, and home-network addresses were replaced with documentation addresses (192.0.2.x). The plot and allocation data comes from public APCRDA (Amaravati Capital Region Development Authority) records.

## What you can do on it

- **Browse 86,918 plots**, coloured by their official zoning.
- **Filter by zoning** in the legend: pick categories or single zones, or use quick filters (Residential, Commercial, Parks & Green, Public, Industrial, Mobility). A counter shows how many plots are visible.
- **Switch colour modes:** Zoning, Plot Size (area in square yards) or Value.
- **Open any plot** to see its zone, 1 km region, village, township, sector, block, colony, plot number, coordinates, adjacent plots, area, dimensions and road frontage, with a Google Maps link.
- **See land allotments.** 118 allotted parcels are drawn as a labelled, hatched overlay. Click one for its category, zone and FSI (floor space index).
- **Inspect the 35 named trunk roads** (the N and E grid): class, right of way, lane pattern, BRT and NH-16 links, length, and the villages each road passes through.
- **Search** by plot registration code, plot code, village, institution or road. The map flies to the result.
- **Compare regions.** The Value mode and the plot panel give each 1 km grid cell a relative score from 0 to 100, with separate commercial and residential lenses and the top three reasons. The score comes from nearby anchors such as government buildings and universities (weighted by whether they are built, under construction or only planned), road access and FSI. It is a ranking, not a price, and the app says so.
- **Use it on a phone.** Panels become bottom sheets on small screens.

## Where the data comes from

All map data comes from APCRDA's public ArcGIS server (`gis.apcrda.org`, the `AmaravatiCapitalCityLayers` service). Note that the plot mosaic has no plots in Undavalli or Penumaka.

| APCRDA layer | Used for |
|---|---|
| LPS plot mosaic (Dec 2024) | Plots, official land-use codes, areas, neighbours, per-plot FSI |
| Trunk road network | The 35 named roads and their widths |
| Land allotments (Feb 2025) | The allotment overlay: name, category, zone, FSI |
| Available lands, developed blocks | Scoring inputs, and the land base drawn under the plots |

Road details (class, right of way, BRT, NH-16 links) come from the World Bank EIA-EMP report (2018) and APCRDA transport plans. They live in `src/utils/roadAttributes.js`.

The allottees are nearly all institutions: government departments, public sector companies, banks, universities, schools, hospitals and hotels. The raw plot mosaic also holds landowner names and Aadhaar (national ID) numbers. The first pipeline step drops every identity field, so none of it reaches the tiles, the search index or this repo.

### How it is processed

The browser loads finished files. The heavy work happens offline in `pipeline/`:

1. `scripts/scrape_apcrda.mjs` downloads the layers as GeoJSON.
2. `01_clean_mosaic.mjs` cleans the plots (zone codes, areas, neighbours, village names) and drops identity fields.
3. `02_grid.mjs` puts each plot in a 1 km grid cell.
4. `03_tiles.sh` turns the plots into one vector-tile file, `plots.pmtiles`, using tippecanoe and go-pmtiles in Docker.
5. `04_indexes.mjs` builds the search index and the plot counts.
6. `07_roads_authoritative.mjs`, `08_allotments.mjs` and `09_landbase.mjs` build the road, allotment and land base layers.
7. `10_scoring.mjs` computes the region scores.

`01_clean.mjs` (for an older plot scrape), `05_roads.mjs` and `06_roads_grid.mjs` are earlier approaches, kept for reference.

## Tech stack

- **App:** React 19, Vite 7, MapLibre GL JS 5, PMTiles, Tailwind CSS 4, Zustand, Fuse.js
- **Pipeline:** Node.js scripts, with tippecanoe and go-pmtiles in Docker
- **Serving:** two-stage Docker build (Node builds, nginx serves). nginx serves `plots.pmtiles` with range requests and no gzip, which PMTiles needs.
- **Tests:** Vitest unit tests for the region and score logic; Playwright tests for the two main flows
- **CI:** Gitea Actions workflows for the build, opt-in tests and a gitleaks secret scan

## Running it locally

Use Node.js 22 (the version the Dockerfile and CI use).

```bash
git clone https://github.com/pdsvardhan/cap-a-map.git
cd cap-a-map
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests
```

The two largest generated files, `public/data/plots.pmtiles` and `public/data/search.json`, are not in the repo. Without them the plot layer and search have nothing to load. To build them:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/scrape_apcrda.mjs plots_mosaic
node --max-old-space-size=8192 pipeline/01_clean_mosaic.mjs
node --max-old-space-size=4096 pipeline/02_grid.mjs
bash pipeline/03_tiles.sh
node --max-old-space-size=4096 pipeline/04_indexes.mjs
```

The scraper turns off TLS checks because the APCRDA server's certificate chain is incomplete. `03_tiles.sh` runs Docker on a remote host over SSH: change `SERVER` at the top, or run its two `docker run` commands yourself. `npm run test:e2e` runs the Playwright tests against a running copy with full data (`BASE_URL`, default `http://127.0.0.1:8502`). `docker-compose.yml` is set up for the author's server (port 8502, external `projects-net` network).

## What's in this repo

| Path | Contents |
|---|---|
| `src/` | The React app: map, legend, search, plot panel, state store, utilities, unit tests |
| `pipeline/` | Offline data steps 01 to 10 |
| `scripts/` | APCRDA scraper, design-token generator, the original Python data script |
| `public/data/` | Small data files the app loads (roads, allotments, grid, scores, metadata) and small APCRDA extracts |
| `e2e/` | Playwright end-to-end tests |
| `docs/` | Product research, data model, design brief, Amaravati background research, iteration log |
| `decisions/` | Architecture decision records |
| `.gitea/workflows/` | CI and secret-scan workflows |
| root | `Dockerfile`, `nginx.conf`, `docker-compose.yml` |

## Credits

- **Data:** APCRDA (Amaravati Capital Region Development Authority), through its public ArcGIS server. Road specifications from the World Bank EIA-EMP report (2018) and APCRDA transport plans. Road centerlines in `pipeline/sources/` from OpenStreetMap contributors (ODbL), used by an earlier road step.
- **Author:** [Sai Vardhan Palli](https://www.linkedin.com/in/sai-vardhan-palli-3b1614187/)
- Built with the author's [Ottomate](https://ottomate.vault7a.xyz/showcase/) pipeline: staged specs, decision records and independent verification. The records in `decisions/` and `docs/iteration-log.md` come from that process.
