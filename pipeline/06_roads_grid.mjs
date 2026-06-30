/**
 * Pipeline stage 06 — NAMED ROADS via GRID-MODEL FUSION (offline)
 *
 * Supersedes 05_roads.mjs (derive-from-plot-polygons + drifted segId seeds).
 * Rationale + data audit: docs/ROAD_REBUILD_PLAN.md, adr-001.
 *
 * Fuses every source we have:
 *   - OSM named centerlines  (pipeline/sources/osm_amaravati_roads.geojson) — the
 *     ~10 surveyed grid roads; clean, accurate geometry; CALIBRATION ANCHORS.
 *   - A calibrated 1 km grid model — N-road k at a longitude, E-road k at a
 *     latitude, fit linearly from the OSM anchors (NOT the broken seeds).
 *   - Plot road-reserve polygons (public/data/plots.enriched.geojson) — clip each
 *     MODELLED road to where the LPS actually reserves that corridor (real extent).
 *   - roadAttributes.js — class / ROW / BRT / NH-16 / per-road length + confidence.
 *
 * Output (LINES now, not polygons):
 *   public/data/named_roads.geojson    — one MultiLineString per road
 *   public/data/named_roads_index.json — per-road center/bbox/length/attrs/junctions
 *
 * Run: node pipeline/06_roads_grid.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROAD_DATA, normalizeRoadName } from '../src/utils/roadAttributes.js'

const ROAD_SYMS = new Set(['U2 - Road reserve zone', 'U2- Road reserve zone', 'SU2 - Road Network', 'U2-Road Reserve Zone'])
const KM_PER_LON = 105, KM_PER_LAT = 111   // ~16.5°N
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const SRC = path.join(__dirname, 'sources', 'osm_amaravati_roads.geojson')
const PLOTS = path.join(DATA, 'plots.enriched.geojson')
const OUT = path.join(DATA, 'named_roads.geojson')
const INDEX = path.join(DATA, 'named_roads_index.json')

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const r6 = (n) => Math.round(n * 1e6) / 1e6
const idxNum = (name) => parseInt(name.replace(/[^0-9]/g, ''), 10)   // N3A -> 3
function lineLenKm(coords) {
  let m = 0
  for (let i = 1; i < coords.length; i++) {
    const dx = (coords[i][0] - coords[i - 1][0]) * KM_PER_LON
    const dy = (coords[i][1] - coords[i - 1][1]) * KM_PER_LAT
    m += Math.hypot(dx, dy)
  }
  return m
}
function centroidPolygon(geom) {
  const ring = geom?.type === 'Polygon' ? geom.coordinates[0] : geom?.type === 'MultiPolygon' ? geom.coordinates[0][0] : null
  if (!ring || !ring.length) return null
  let sx = 0, sy = 0; for (const c of ring) { sx += c[0]; sy += c[1] }
  return [sx / ring.length, sy / ring.length]
}
function polyDiagKm(geom) {
  const rings = geom?.type === 'Polygon' ? geom.coordinates : geom?.type === 'MultiPolygon' ? geom.coordinates.flat() : []
  let a = [1 / 0, 1 / 0, -1 / 0, -1 / 0]
  for (const r of rings) for (const c of r) { if (c[0] < a[0]) a[0] = c[0]; if (c[0] > a[2]) a[2] = c[0]; if (c[1] < a[1]) a[1] = c[1]; if (c[1] > a[3]) a[3] = c[1] }
  return Math.hypot((a[2] - a[0]) * KM_PER_LON, (a[3] - a[1]) * KM_PER_LAT)
}
// least-squares fit y = m*x + b
function linfit(pts) {
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0)
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0)
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  const b = (sy - m * sx) / n
  return { m, b }
}

console.log('[06] loading OSM source + plots…')
const osm = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const plots = JSON.parse(fs.readFileSync(PLOTS, 'utf8'))

// ── 1. OSM surveyed roads: group ways by name (Seed Access Road folds into E3) ──
const osmByRoad = {}
for (const f of osm.features) {
  let nm = normalizeRoadName(f.properties.name || '').replace(/\s+/g, '')
  if (/^SEEDACCESSROAD$/.test(nm) || /SEED/.test(nm)) nm = 'E3'
  if (!/^[NE]\d+[AB]?$/.test(nm)) continue
  ;(osmByRoad[nm] ||= []).push(f.geometry.coordinates)
}
const surveyed = {}
for (const [name, lines] of Object.entries(osmByRoad)) {
  const all = lines.flat()
  const lons = all.map((c) => c[0]), lats = all.map((c) => c[1])
  const isN = (ROAD_DATA[name]?.orientation || (name[0] === 'N' ? 'N-S' : 'E-W')) === 'N-S'
  surveyed[name] = {
    axis: isN ? median(lons) : median(lats),
    lines,
    bbox: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)],
  }
}
console.log(`[06] OSM surveyed roads: ${Object.keys(surveyed).sort().join(', ')}`)

// ── 2. Calibrate the 1 km grid from OSM anchors (skip E3 — diagonal seed road) ──
const nAnchors = [], eAnchors = []
for (const [name, s] of Object.entries(surveyed)) {
  if (name === 'E3') continue
  const k = idxNum(name)
  if (name[0] === 'N') nAnchors.push([k, s.axis]); else eAnchors.push([k, s.axis])
}
const nFit = linfit(nAnchors), eFit = linfit(eAnchors)
const resid = (fit, pts, perDeg) => pts.map(([k, v]) => Math.abs((fit.m * k + fit.b) - v) * perDeg * 1000)
console.log(`[06] N grid: lon = ${nFit.m.toFixed(6)}*k + ${nFit.b.toFixed(5)}  (${(Math.abs(nFit.m) * KM_PER_LON).toFixed(2)} km/step) | anchor resid(m): ${resid(nFit, nAnchors, KM_PER_LON).map((x) => x.toFixed(0)).join(',')}`)
console.log(`[06] E grid: lat = ${eFit.m.toFixed(6)}*k + ${eFit.b.toFixed(5)}  (${(Math.abs(eFit.m) * KM_PER_LAT).toFixed(2)} km/step) | anchor resid(m): ${resid(eFit, eAnchors, KM_PER_LAT).map((x) => x.toFixed(0)).join(',')}`)

// ── 3. Road-reserve centroids (small segments only — skip city-wide blobs) ──
const reserveCentroids = []
let blobSkipped = 0
for (const f of plots.features) {
  if (!ROAD_SYMS.has(f.properties?.symbology)) continue
  if (polyDiagKm(f.geometry) > 1) { blobSkipped++; continue }   // skip aggregate blobs
  const c = centroidPolygon(f.geometry)
  if (c) reserveCentroids.push(c)
}
console.log(`[06] road-reserve centroids: ${reserveCentroids.length} clean (${blobSkipped} blobs skipped)`)
const allLats = reserveCentroids.map((c) => c[1]), allLons = reserveCentroids.map((c) => c[0])
const gridCenterLat = median(allLats), gridCenterLon = median(allLons)
// city footprint along each axis (clip modelled roads so they never run into the void)
const cityLat = [Math.min(...allLats), Math.max(...allLats)]
const cityLon = [Math.min(...allLons), Math.max(...allLons)]
const DEFAULT_LEN_KM = 8   // grid default when roadAttributes has no length hint

const AXIS_TOL = 0.0007   // ~74 m perpendicular — a centroid this close sits on the corridor
const PAD = 0.0009        // ~100 m extent padding so the line reaches the last block edge

// Extent of a modelled road. Start from the along-axis span of nearby reserve
// centroids, then guarantee at least the known/known-default road length centred
// on that span (edge roads have sparse reserves and would otherwise collapse),
// and finally clip to the city footprint so nothing runs into the river/void.
function modelledExtent(axis, isN, lenHintKm) {
  const along = []
  for (const c of reserveCentroids) {
    const perp = isN ? Math.abs(c[0] - axis) : Math.abs(c[1] - axis)
    if (perp <= AXIS_TOL) along.push(isN ? c[1] : c[0])
  }
  const perDeg = isN ? KM_PER_LAT : KM_PER_LON
  const cityAxis = isN ? cityLat : cityLon
  let lo, hi
  if (along.length >= 2) { lo = Math.min(...along) - PAD; hi = Math.max(...along) + PAD }
  else { const c = isN ? gridCenterLat : gridCenterLon; lo = c; hi = c }
  const targetDeg = (lenHintKm || DEFAULT_LEN_KM) / perDeg
  if ((hi - lo) < targetDeg) {                    // grow to the known length about the midpoint
    const mid = (lo + hi) / 2
    lo = mid - targetDeg / 2; hi = mid + targetDeg / 2
  }
  return [Math.max(lo, cityAxis[0] - PAD), Math.min(hi, cityAxis[1] + PAD)]
}

// ── 4. Build every road (N1–N18 incl N3A/N3B, E1–E16) ──
const features = [], index = []
for (const name of Object.keys(ROAD_DATA)) {
  const rd = ROAD_DATA[name]
  const isN = rd.orientation === 'N-S'
  const k = idxNum(name)
  const lenHint = (rd.remarks && rd.remarks.match(/~?([\d.]+)\s*km/)) ? parseFloat(RegExp.$1) : null

  const straight = (ax, ext) => isN
    ? [[r6(ax), r6(ext[0])], [r6(ax), r6(ext[1])]]
    : [[r6(ext[0]), r6(ax)], [r6(ext[1]), r6(ax)]]

  let geomLines, isSurveyed, axis
  const s = surveyed[name]
  const osmLenKm = s ? s.lines.reduce((a, l) => a + lineLenKm(l), 0) : 0
  if (s && osmLenKm >= 2) {
    // substantive OSM survey — use the real centerline geometry
    isSurveyed = true
    axis = s.axis
    geomLines = s.lines
  } else if (s) {
    // OSM stub (<2 km mapped): trust its precise axis, model the extent to length
    isSurveyed = false
    axis = s.axis
    geomLines = [straight(axis, modelledExtent(axis, isN, lenHint))]
  } else {
    // no OSM — calibrated grid axis; N3B nudged half a step off N3A
    isSurveyed = false
    const kEff = name === 'N3B' ? k + 0.5 : k
    axis = isN ? (nFit.m * kEff + nFit.b) : (eFit.m * kEff + eFit.b)
    geomLines = [straight(axis, modelledExtent(axis, isN, lenHint))]
  }

  const allCoords = geomLines.flat()
  const lons = allCoords.map((c) => c[0]), lats = allCoords.map((c) => c[1])
  const bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
  const center = [r6((bbox[0] + bbox[2]) / 2), r6((bbox[1] + bbox[3]) / 2)]
  const lengthKm = +geomLines.reduce((a, l) => a + lineLenKm(l), 0).toFixed(2)

  features.push({
    type: 'Feature',
    properties: { roadName: name, category: rd.category, orientation: rd.orientation, surveyed: isSurveyed },
    geometry: geomLines.length === 1 ? { type: 'LineString', coordinates: geomLines[0] } : { type: 'MultiLineString', coordinates: geomLines },
  })
  index.push({
    name, center, bbox, length_km: lengthKm, orientation: rd.orientation,
    surveyed: isSurveyed, axis: r6(axis),
    category: rd.category, row_m: rd.row_m, lane_pattern: rd.lane_pattern,
    brt_present: rd.brt_present, connects_nh16: rd.connects_nh16,
    confidence: rd.confidence, remarks: rd.remarks, meets: [],
  })
}

// ── 5. Junctions: a grid crossing exists where an N axis falls within an E's
//      lon-extent AND that E axis falls within the N's lat-extent. ──
const byName = Object.fromEntries(index.map((r) => [r.name, r]))
for (const N of index.filter((r) => r.orientation === 'N-S')) {
  for (const E of index.filter((r) => r.orientation === 'E-W')) {
    const crossLon = N.axis, crossLat = E.axis
    if (crossLon >= E.bbox[0] - 0.0009 && crossLon <= E.bbox[2] + 0.0009 &&
        crossLat >= N.bbox[1] - 0.0009 && crossLat <= N.bbox[3] + 0.0009) {
      N.meets.push(E.name); E.meets.push(N.name)
    }
  }
}
for (const r of index) r.meets.sort((a, b) => idxNum(a) - idxNum(b))

fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', features }))
fs.writeFileSync(INDEX, JSON.stringify(index.sort((a, b) => a.name.localeCompare(b.name)), null, 2))

const surv = index.filter((r) => r.surveyed).length
console.log(`\n===== NAMED ROADS (grid-model fusion) =====`)
console.log(`roads: ${index.length}  |  surveyed (OSM): ${surv}  |  modelled: ${index.length - surv}`)
console.log('name  surv  len_km  orient  meets')
for (const r of index) console.log(`  ${r.name.padEnd(4)} ${r.surveyed ? 'OSM ' : 'mdl '} ${String(r.length_km).padStart(6)}  ${r.orientation.padEnd(4)}  ${r.meets.length}`)
console.log(`-> ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1e3).toFixed(0)} KB), ${path.basename(INDEX)}`)
