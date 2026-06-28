/**
 * Pipeline stage 04 — INDEXES (search + meta)
 *
 * With vector tiles the client no longer holds all 95K features in memory, so
 * anything that needs the full dataset (fuzzy search, zoning counts) must be
 * precomputed here. Order-independent with 03_tiles (both read the enriched file).
 *
 * Input:  public/data/plots.enriched.geojson
 *         public/data/allocated_lands.geojson
 * Output: public/data/search.json   (Fuse.js index: plots + landmarks + roads; gitignored)
 *         public/data/meta.json      (zoning/village counts + bbox; committed — small)
 *
 * Run: node --max-old-space-size=4096 pipeline/04_indexes.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { categorizeAllocatedLand, ALLOCATED_LAND_CATEGORIES } from '../src/utils/colors.js'
import { KNOWN_ROAD_NAMES } from '../src/utils/roadAttributes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const IN = path.join(DATA, 'plots.enriched.geojson')
const ALLOC = path.join(DATA, 'allocated_lands.geojson')
const SEARCH = path.join(DATA, 'search.json')
const META = path.join(DATA, 'meta.json')

function centroidOfPolygon(geom) {
  if (!geom || geom.type !== 'Polygon' || !geom.coordinates?.[0]) return null
  const ring = geom.coordinates[0]
  let sx = 0, sy = 0, n = 0
  for (let i = 0; i < ring.length - 1; i++) { sx += ring[i][0]; sy += ring[i][1]; n++ }
  return n ? [sx / n, sy / n] : null
}

console.log(`[indexes] reading ${path.basename(IN)} ...`)
const geo = JSON.parse(fs.readFileSync(IN, 'utf8'))
const feats = geo.features || []

const search = []
const zoningCounts = {}
const villageCounts = {}
let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity

for (const f of feats) {
  const p = f.properties
  zoningCounts[p.zoning_group] = (zoningCounts[p.zoning_group] || 0) + 1
  const vk = p.village || '(N/A)'
  villageCounts[vk] = (villageCounts[vk] || 0) + 1
  if (Number.isFinite(p.lon) && Number.isFinite(p.lat)) {
    if (p.lon < w) w = p.lon; if (p.lon > e) e = p.lon
    if (p.lat < s) s = p.lat; if (p.lat > n) n = p.lat
  }
  // search entry (compact). t=type, i=pid
  search.push({
    t: 'plot', i: p.pid,
    r: p.regcode || undefined,
    c: p.plot_code || undefined,
    v: p.village || undefined,
    f: p.farmer_n || undefined,
    lat: p.lat, lon: p.lon,
  })
}

// allocated-land landmarks
const alloc = JSON.parse(fs.readFileSync(ALLOC, 'utf8'))
let landmarkCount = 0
for (const f of (alloc.features || [])) {
  const label = f.properties?.label
  if (!label) continue
  const c = centroidOfPolygon(f.geometry)
  if (!c) continue
  search.push({
    t: 'landmark', n: label,
    cat: categorizeAllocatedLand(label),
    lat: c[1], lon: c[0],
  })
  landmarkCount++
}

// named roads (coords resolved later in P5; searchable by name now)
for (const name of KNOWN_ROAD_NAMES) search.push({ t: 'road', n: name })

const meta = {
  generated_at: new Date().toISOString(),
  total_plots: feats.length,
  bbox: [w, s, e, n],
  zoning_group_counts: zoningCounts,
  village_counts: villageCounts,
  search_entries: { plots: feats.length, landmarks: landmarkCount, roads: KNOWN_ROAD_NAMES.length },
  allocated_land_categories: Object.fromEntries(
    Object.entries(ALLOCATED_LAND_CATEGORIES).map(([k, v]) => [k, { label: v.label, color: v.color }])
  ),
}

fs.writeFileSync(SEARCH, JSON.stringify(search))
fs.writeFileSync(META, JSON.stringify(meta, null, 2))

console.log(`[indexes] search.json: ${search.length} entries (${(fs.statSync(SEARCH).size / 1e6).toFixed(1)} MB)`)
console.log(`[indexes]   plots ${feats.length}, landmarks ${landmarkCount}, roads ${KNOWN_ROAD_NAMES.length}`)
console.log(`[indexes] meta.json: ${Object.keys(zoningCounts).length} zoning groups, ${Object.keys(villageCounts).length} villages`)
console.log(`[indexes] bbox: [${w.toFixed(4)}, ${s.toFixed(4)}, ${e.toFixed(4)}, ${n.toFixed(4)}]`)
