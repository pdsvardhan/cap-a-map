/**
 * Pipeline stage 05 — NAMED ROADS (offline, denoised)
 *
 * The old in-browser builder over-propagated road names (loose corridor
 * tolerances tagged random adjacent/perpendicular segments as N/E roads).
 * This rebuilds named roads OFFLINE from the trustworthy seed mapping
 * (src/utils/roadSegmentMapping.js — 110 hand-validated segments) plus a
 * TIGHT, axis-aligned corridor fill, so the output is conservative & correct.
 *
 * Segment IDs are reproduced with the exact same sort as the seed mapping
 * depends on (buildRoadSegmentIndex over the unchanged plot features).
 *
 * Input:  public/data/plots.enriched.geojson
 * Output: public/data/named_roads.geojson    (named road-reserve polygons; committed)
 *         public/data/named_roads_index.json  (per-road center/bbox/attrs/junctions; committed)
 *
 * Run: node --max-old-space-size=4096 pipeline/05_roads.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROAD_RESERVE_SYMBOLOGIES } from '../src/utils/colors.js'
import { SEGMENT_TO_ROAD } from '../src/utils/roadSegmentMapping.js'
import { ROAD_DATA, getRoadType, normalizeRoadName } from '../src/utils/roadAttributes.js'

// --- inlined from src/components/Map/utils/roadSegmentIndex.js (Node can't
// import it directly: it uses extensionless imports). Logic kept identical so
// segment IDs match the seed mapping. ---
function computeCentroid(geometry) {
  if (!geometry?.coordinates) return null
  const ring = geometry.type === 'Polygon' ? geometry.coordinates[0]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates[0][0] : null
  if (!ring || ring.length === 0) return null
  let sumLon = 0, sumLat = 0
  for (const c of ring) { sumLon += c[0]; sumLat += c[1] }
  return [Math.round((sumLon / ring.length) * 1e6) / 1e6, Math.round((sumLat / ring.length) * 1e6) / 1e6]
}
function buildRoadSegmentIndex(features) {
  const roadSegs = []
  for (let i = 0; i < features.length; i++) {
    if (!ROAD_RESERVE_SYMBOLOGIES.has(features[i].properties?.symbology)) continue
    roadSegs.push({ featureIndex: i, centroid: computeCentroid(features[i].geometry) })
  }
  roadSegs.sort((a, b) => {
    if (!a.centroid || !b.centroid) return 0
    const latDiff = a.centroid[1] - b.centroid[1]
    if (Math.abs(latDiff) > 0.0001) return latDiff
    return a.centroid[0] - b.centroid[0]
  })
  roadSegs.forEach((seg, idx) => { seg.segmentId = idx })
  return { segments: roadSegs }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const IN = path.join(DATA, 'plots.enriched.geojson')
const OUT = path.join(DATA, 'named_roads.geojson')
const INDEX = path.join(DATA, 'named_roads_index.json')

// Tight corridor-fill params (degrees ~ at 16.5°N: 0.0009° ≈ 100m)
const AXIS_TOL = 0.00065 // perpendicular distance from the road axis (~70m; ROW is 50-60m)
const GAP = 0.0020       // connectivity gap to an already-claimed segment (~220m)
const MARGIN = 0.0010    // allowed overshoot beyond the seed extent (~110m)

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }

console.log(`[roads] reading ${path.basename(IN)} ...`)
const geo = JSON.parse(fs.readFileSync(IN, 'utf8'))
const feats = geo.features || []

// segment index — SAME IDs the seed mapping uses
const { segments } = buildRoadSegmentIndex(feats)
const segById = new Map(segments.map((s) => [s.segmentId, s]))
console.log(`[roads] ${segments.length} road-reserve segments indexed`)

// seed claims
const claimed = new Map() // segmentId -> roadName
let seedHits = 0, seedMiss = 0
for (const [idStr, rawName] of Object.entries(SEGMENT_TO_ROAD)) {
  const id = Number(idStr)
  if (segById.has(id)) { claimed.set(id, normalizeRoadName(rawName)); seedHits++ }
  else seedMiss++
}
console.log(`[roads] seeds: ${seedHits} matched, ${seedMiss} missing (segment set drift)`)

// per-road working set
const roads = {}
for (const [id, name] of claimed) {
  const s = segById.get(id)
  if (!roads[name]) roads[name] = { orientation: ROAD_DATA[name]?.orientation || 'N-S', centroids: [], seedCount: 0 }
  roads[name].centroids.push(s.centroid)
  roads[name].seedCount++
}

// TIGHT corridor fill (greedy by perpendicular distance to handle intersections)
let added = true, fillRounds = 0
while (added && fillRounds < 50) {
  added = false; fillRounds++
  for (const s of segments) {
    if (claimed.has(s.segmentId) || !s.centroid) continue
    let best = null, bestPerp = Infinity
    for (const [name, r] of Object.entries(roads)) {
      const isN = r.orientation === 'N-S'
      const lons = r.centroids.map((c) => c[0]); const lats = r.centroids.map((c) => c[1])
      const axis = isN ? median(lons) : median(lats)
      const perp = isN ? Math.abs(s.centroid[0] - axis) : Math.abs(s.centroid[1] - axis)
      if (perp > AXIS_TOL) continue
      const along = isN ? s.centroid[1] : s.centroid[0]
      const lo = (isN ? Math.min(...lats) : Math.min(...lons)) - MARGIN
      const hi = (isN ? Math.max(...lats) : Math.max(...lons)) + MARGIN
      if (along < lo || along > hi) continue
      let conn = false
      for (const c of r.centroids) { if (Math.abs(s.centroid[0] - c[0]) < GAP && Math.abs(s.centroid[1] - c[1]) < GAP) { conn = true; break } }
      if (!conn) continue
      if (perp < bestPerp) { bestPerp = perp; best = name }
    }
    if (best) { claimed.set(s.segmentId, best); roads[best].centroids.push(s.centroid); added = true }
  }
}

// build named-roads geojson
const features = []
for (const [id, name] of claimed) {
  const s = segById.get(id)
  if (!s) continue
  features.push({
    type: 'Feature',
    properties: { roadName: name, roadCategory: getRoadType(name) || 'other', segId: id },
    geometry: feats[s.featureIndex].geometry,
  })
}

// per-road index (center, bbox, attrs)
const byName = {}
for (const [id, name] of claimed) {
  const c = segById.get(id).centroid
  if (!byName[name]) byName[name] = { lons: [], lats: [] }
  byName[name].lons.push(c[0]); byName[name].lats.push(c[1])
}
// junctions: bbox-overlap heuristic (fast; refine later)
const bbox = {}
for (const [name, m] of Object.entries(byName)) {
  bbox[name] = [Math.min(...m.lons), Math.min(...m.lats), Math.max(...m.lons), Math.max(...m.lats)]
}
const overlaps = (a, b) => !(a[2] < b[0] - 0.0008 || b[2] < a[0] - 0.0008 || a[3] < b[1] - 0.0008 || b[3] < a[1] - 0.0008)
const names = Object.keys(byName)
const meets = {}
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  if (overlaps(bbox[names[i]], bbox[names[j]])) {
    (meets[names[i]] ||= []).push(names[j]); (meets[names[j]] ||= []).push(names[i])
  }
}

const index = names.sort().map((name) => {
  const m = byName[name]; const rd = ROAD_DATA[name] || {}
  return {
    name,
    center: [Math.round((m.lons.reduce((a, b) => a + b, 0) / m.lons.length) * 1e6) / 1e6,
             Math.round((m.lats.reduce((a, b) => a + b, 0) / m.lats.length) * 1e6) / 1e6],
    bbox: bbox[name],
    segCount: m.lons.length,
    seedCount: roads[name]?.seedCount || 0,
    category: rd.category, orientation: rd.orientation, row_m: rd.row_m,
    lane_pattern: rd.lane_pattern, brt_present: rd.brt_present, connects_nh16: rd.connects_nh16,
    confidence: rd.confidence, remarks: rd.remarks,
    meets: (meets[name] || []).sort(),
  }
})

fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', features }))
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2))

console.log(`\n===== NAMED ROADS =====`)
console.log(`roads: ${index.length}, named segments: ${features.length} (fill rounds ${fillRounds})`)
console.log('per road (seed -> total):')
for (const r of index) console.log(`  ${r.name.padEnd(4)} ${String(r.seedCount).padStart(3)} -> ${String(r.segCount).padStart(3)}  ${r.category || ''}`)
console.log(`-> ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1e3).toFixed(0)} KB), ${path.basename(INDEX)}`)
