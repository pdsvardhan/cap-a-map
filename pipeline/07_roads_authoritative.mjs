/**
 * Pipeline stage 07 — NAMED ROADS from the AUTHORITATIVE APCRDA layer.
 *
 * Supersedes 05 (seed corridor-fill) AND 06 (OSM grid-model fusion). Both tried
 * to RECONSTRUCT the N/E grid; this stage just uses the real thing:
 * AmaravatiCapitalCityLayers/0 (AmaravatiTrunkRoadNetwork) — 35 named road
 * POLYGONS with official roadname + rd_width, scraped to
 * public/data/sources/apcrda/trunk_roads.geojson (scripts/scrape_apcrda.mjs).
 *
 * We normalise names ("n 6" -> "N6"), dissolve same-name features, enrich from
 * roadAttributes.js (class / BRT / NH-16 / villages), and take ROW from the
 * authentic rd_width. Roads render as filled polygons (owner: "roads are huge
 * polygons; that is how they have to look").
 *
 * Output: public/data/named_roads.geojson    (Polygon/MultiPolygon per road)
 *         public/data/named_roads_index.json  (center/bbox/len/attrs/junctions)
 * Run:    node pipeline/07_roads_authoritative.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROAD_DATA, normalizeRoadName } from '../src/utils/roadAttributes.js'

const KM_PER_LON = 105, KM_PER_LAT = 111
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const SRC = path.join(DATA, 'sources', 'apcrda', 'trunk_roads.geojson')
const OUT = path.join(DATA, 'named_roads.geojson')
const INDEX = path.join(DATA, 'named_roads_index.json')
const r6 = (n) => Math.round(n * 1e6) / 1e6

// "n 6" -> "N6", "n 3a" -> "N3A", "e 8" -> "E8"
const norm = (raw) => normalizeRoadName((raw || '').replace(/\s+/g, ''))
// list of polygons (each = array of rings) from a Polygon|MultiPolygon geometry
function polysOf(geom) {
  if (!geom) return []
  return geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []
}

console.log(`[07] reading ${path.relative(path.join(__dirname, '..'), SRC)} …`)
const src = JSON.parse(fs.readFileSync(SRC, 'utf8'))

// group + dissolve by normalised name
const byName = {}
for (const f of src.features) {
  const name = norm(f.properties.roadname)
  if (!/^[NE]\d+[AB]?$/.test(name)) { console.log(`  ! skipping unrecognised roadname "${f.properties.roadname}"`); continue }
  if (!byName[name]) byName[name] = { polys: [], rd_width: null }
  byName[name].polys.push(...polysOf(f.geometry))
  const w = parseFloat(f.properties.rd_width)
  if (!Number.isNaN(w)) byName[name].rd_width = Math.max(byName[name].rd_width || 0, w)
}

const features = [], index = []
for (const name of Object.keys(byName).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
  const { polys, rd_width } = byName[name]
  const rd = ROAD_DATA[name] || {}
  const orientation = rd.orientation || (name[0] === 'N' ? 'N-S' : 'E-W')

  // bbox + center + axis over all outer-ring vertices
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity
  const perp = []  // axis coord: longitude for N-S roads, latitude for E-W
  for (const rings of polys) for (const c of rings[0]) {
    if (c[0] < minx) minx = c[0]; if (c[0] > maxx) maxx = c[0]
    if (c[1] < miny) miny = c[1]; if (c[1] > maxy) maxy = c[1]
    perp.push(orientation === 'N-S' ? c[0] : c[1])
  }
  const bbox = [r6(minx), r6(miny), r6(maxx), r6(maxy)]
  const center = [r6((minx + maxx) / 2), r6((miny + maxy) / 2)]
  perp.sort((a, b) => a - b)
  const axis = r6(perp[Math.floor(perp.length / 2)])  // median — robust to road shape/length
  // road length ≈ extent along its orientation (authentic geometry span)
  const lengthKm = +(orientation === 'N-S' ? (maxy - miny) * KM_PER_LAT : (maxx - minx) * KM_PER_LON).toFixed(2)

  features.push({
    type: 'Feature',
    properties: {
      roadName: name, category: rd.category || null, orientation,
      row_m: rd_width || rd.row_m || null,
    },
    geometry: polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys },
  })
  index.push({
    name, center, bbox, axis, length_km: lengthKm, orientation,
    row_m: rd_width || rd.row_m || null, source: 'APCRDA trunk road network',
    category: rd.category, lane_pattern: rd.lane_pattern, brt_present: rd.brt_present,
    connects_nh16: rd.connects_nh16, confidence: rd.confidence, remarks: rd.remarks, meets: [],
  })
}

// junctions: N-road meets E-road when their bboxes overlap (grid crossings)
const PAD = 0.0009
const overlap = (a, b) => !(a[2] < b[0] - PAD || b[2] < a[0] - PAD || a[3] < b[1] - PAD || b[3] < a[1] - PAD)
const Ns = index.filter((r) => r.orientation === 'N-S'), Es = index.filter((r) => r.orientation === 'E-W')
for (const n of Ns) for (const e of Es) if (overlap(n.bbox, e.bbox)) { n.meets.push(e.name); e.meets.push(n.name) }
const idxNum = (s) => parseInt(s.replace(/[^0-9]/g, ''), 10)
for (const r of index) r.meets.sort((a, b) => idxNum(a) - idxNum(b))

fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', features }))
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2))
console.log(`\n===== NAMED ROADS (authoritative APCRDA) =====`)
console.log(`roads: ${index.length}  (all from real trunk-road polygons)`)
console.log('name  ROW  len_km  orient  meets')
for (const r of index) console.log(`  ${r.name.padEnd(4)} ${String(r.row_m || '?').padStart(3)}  ${String(r.length_km).padStart(6)}  ${r.orientation.padEnd(4)}  ${r.meets.length}`)
console.log(`-> ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1e3).toFixed(0)} KB), ${path.basename(INDEX)}`)
