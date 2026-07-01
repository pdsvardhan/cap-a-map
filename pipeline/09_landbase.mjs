/**
 * Pipeline stage 09 — LAND BASE.
 *
 * At low zoom the fine gaps between parcels (internal lanes/setbacks not covered by
 * any plot polygon) let the dark canvas show through as black seams (owner: "less
 * black"). This builds a single dissolved base of the developed BLOCKS
 * (sources/apcrda/blocks.geojson — 3,767 block polygons that tessellate the built
 * area) rendered UNDER the plots, so those gaps read as land, not void.
 *
 * Output: public/data/land_base.geojson  (one MultiPolygon, geometry only)
 * Run:    node pipeline/09_landbase.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const SRC = path.join(DATA, 'sources', 'apcrda', 'blocks.geojson')
const OUT = path.join(DATA, 'land_base.geojson')
const r6 = (n) => Math.round(n * 1e6) / 1e6
const roundRing = (ring) => ring.map((c) => [r6(c[0]), r6(c[1])])

console.log(`[09] reading blocks …`)
const src = JSON.parse(fs.readFileSync(SRC, 'utf8'))

// Merge every block polygon into ONE MultiPolygon (no per-block seams when drawn
// as a solid fill with no stroke). Geometry only — no properties needed.
const polys = []
for (const f of src.features) {
  const g = f.geometry
  if (!g) continue
  if (g.type === 'Polygon') polys.push(g.coordinates.map(roundRing))
  else if (g.type === 'MultiPolygon') for (const p of g.coordinates) polys.push(p.map(roundRing))
}

const fc = {
  type: 'FeatureCollection',
  _source: 'APCRDA Blocks (developed-area footprint) — land base',
  features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: polys } }],
}
fs.writeFileSync(OUT, JSON.stringify(fc))
console.log(`[09] land base: ${polys.length} block polygons -> ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`)
