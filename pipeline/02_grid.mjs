/**
 * Pipeline stage 02 — GRID super-blocks
 *
 * Assigns every plot a 1km x 1km grid-cell id (the confirmed "super-block"
 * region unit, see docs/UNDERSTANDING.md §2). Builds grid.geojson (occupied
 * cell polygons + aggregates) for region-level rendering / ranking later.
 *
 * NOTE: this is OUR own 1km grid, anchored to the dataset extent using a local
 * equirectangular metric approximation (good to a few metres at this latitude).
 * It is NOT guaranteed to align to APCRDA's official 287-grid origin — if the
 * official grid reference becomes available we can re-anchor without touching
 * anything downstream (grid_id is the only contract).
 *
 * Input:  public/data/plots.clean.geojson
 * Output: public/data/plots.enriched.geojson   (accumulating working file, gitignored)
 *         public/data/grid.geojson              (occupied cells, committed — app needs it)
 *         public/data/grid_report.json
 *
 * Run: node --max-old-space-size=4096 pipeline/02_grid.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const IN = path.join(DATA, 'plots.clean.geojson')
const OUT = path.join(DATA, 'plots.enriched.geojson')
const GRID = path.join(DATA, 'grid.geojson')
const REPORT = path.join(DATA, 'grid_report.json')

const CELL_M = 1000 // 1km super-block
const M_PER_DEG_LAT = 110574

console.log(`[grid] reading ${path.basename(IN)} ...`)
const geo = JSON.parse(fs.readFileSync(IN, 'utf8'))
const feats = geo.features || []
console.log(`[grid] ${feats.length} features`)

// --- reference frame from valid coords ---
let lon0 = Infinity, lat0 = Infinity, latSum = 0, latN = 0
for (const f of feats) {
  const { lat, lon } = f.properties || {}
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    if (lon < lon0) lon0 = lon
    if (lat < lat0) lat0 = lat
    latSum += lat; latN++
  }
}
const latRef = latSum / latN
const mPerDegLon = 111320 * Math.cos((latRef * Math.PI) / 180)
const degPerCellLon = CELL_M / mPerDegLon
const degPerCellLat = CELL_M / M_PER_DEG_LAT

console.log(`[grid] origin lon0=${lon0.toFixed(5)} lat0=${lat0.toFixed(5)} latRef=${latRef.toFixed(4)} cell≈${degPerCellLon.toFixed(5)}°lon x ${degPerCellLat.toFixed(5)}°lat`)

// --- assign grid_id, aggregate cells ---
const cells = new Map() // grid_id -> { col,row, count, villages:Map }
let assigned = 0, unassigned = 0

for (const f of feats) {
  const p = f.properties
  const { lat, lon } = p
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) { p.grid_id = null; unassigned++; continue }
  const col = Math.floor(((lon - lon0) * mPerDegLon) / CELL_M)
  const row = Math.floor(((lat - lat0) * M_PER_DEG_LAT) / CELL_M)
  const grid_id = `${col}-${row}`
  p.grid_id = grid_id
  assigned++
  let c = cells.get(grid_id)
  if (!c) { c = { col, row, count: 0, villages: new Map() }; cells.set(grid_id, c) }
  c.count++
  const v = p.village || '(N/A)'
  c.villages.set(v, (c.villages.get(v) || 0) + 1)
}

// --- build grid.geojson ---
const cellFeatures = []
const cellSizes = []
for (const [grid_id, c] of cells) {
  cellSizes.push(c.count)
  // dominant (non-N/A if possible) village
  let dom = null, domN = -1
  for (const [v, n] of c.villages) {
    if (v === '(N/A)') continue
    if (n > domN) { domN = n; dom = v }
  }
  if (!dom) dom = '(N/A)'
  const w = lon0 + c.col * degPerCellLon
  const e = lon0 + (c.col + 1) * degPerCellLon
  const s = lat0 + c.row * degPerCellLat
  const n = lat0 + (c.row + 1) * degPerCellLat
  cellFeatures.push({
    type: 'Feature',
    properties: { grid_id, plot_count: c.count, dominant_village: dom, col: c.col, row: c.row },
    geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
  })
}

cellSizes.sort((a, b) => a - b)
const med = cellSizes.length ? cellSizes[Math.floor(cellSizes.length / 2)] : 0
const report = {
  generated_at: new Date().toISOString(),
  cell_size_m: CELL_M,
  reference: { lon0, lat0, latRef, m_per_deg_lon: mPerDegLon, m_per_deg_lat: M_PER_DEG_LAT },
  plots_assigned: assigned,
  plots_unassigned: unassigned,
  occupied_cells: cells.size,
  plots_per_cell: { min: cellSizes[0] ?? 0, median: med, max: cellSizes[cellSizes.length - 1] ?? 0 },
}

fs.writeFileSync(OUT, JSON.stringify(geo))
fs.writeFileSync(GRID, JSON.stringify({ type: 'FeatureCollection', features: cellFeatures }))
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))

console.log('\n===== GRID report =====')
console.log(`assigned ${assigned}, unassigned ${unassigned}`)
console.log(`occupied 1km cells: ${cells.size}`)
console.log(`plots/cell: min ${report.plots_per_cell.min}, median ${med}, max ${report.plots_per_cell.max}`)
console.log(`-> ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB), ${path.basename(GRID)} (${(fs.statSync(GRID).size / 1e3).toFixed(0)} KB)`)
