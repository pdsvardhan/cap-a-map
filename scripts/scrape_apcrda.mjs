/**
 * Authoritative APCRDA scraper — pulls the real LPS/master-plan layers straight
 * from the live ArcGIS REST server (gis.apcrda.org) as GeoJSON (WGS84).
 *
 * This replaces the fabricated/derived road layer + messy hand-labels: every
 * layer here is government-authoritative (roads carry real names + widths, plots
 * carry official lu_code/lu_desc, allotments carry name/category/zoning/FSI).
 *
 * Output: public/data/sources/apcrda/<name>.geojson  (+ a manifest.json)
 * Run:    NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/scrape_apcrda.mjs [onlyName...]
 *   (TLS verify is disabled because the gov cert chain is incomplete; data is public.)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = 'https://gis.apcrda.org/server/rest/services/AmaravatiCapitalCityLayers/MapServer'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'data', 'sources', 'apcrda')
fs.mkdirSync(OUT, { recursive: true })

// id → output name (we keep ALL fields; ArcGIS f=geojson returns them).
const MANIFEST = [
  // roads (authentic)
  [0, 'trunk_roads'], [33, 'lps_roads'], [32, 'agc_roads'], [16, 'irr_alignment'],
  [8, 'national_highways'], [5, 'existing_roads'],
  // plots (BIG — the authoritative mosaic with lu_code/lu_desc)
  [34, 'plots_mosaic'],
  // lands / allotments / FSI
  [25, 'land_allotments'], [24, 'available_lands'], [26, 'govt_complex'],
  [27, 'seed_capital'], [28, 'industrial_area'], [29, 'land_monetization'],
  [30, 'land_hudco'], [31, 'land_r5'],
  // admin hierarchy
  [17, 'villages'], [19, 'townships'], [20, 'sectors'], [21, 'colony'], [22, 'blocks'],
  // boundaries + zones
  [1, 'boundary_capital'], [2, 'boundary_agc'], [3, 'boundary_seed'], [23, 'lps_zones'],
]

const only = process.argv.slice(2)
const PAGE = 1000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); return await r.json() } catch (e) { if (i === tries - 1) throw e; await sleep(800) }
  }
}

async function scrapeLayer(id, name) {
  const feats = []
  let offset = 0
  for (;;) {
    const url = `${ROOT}/${id}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326`
      + `&resultOffset=${offset}&resultRecordCount=${PAGE}&f=geojson`
    const j = await fetchJson(url)
    if (j.error) { console.log(`  [${id}] ${name}: ERROR ${JSON.stringify(j.error.message || j.error)}`); return null }
    const page = j.features || []
    feats.push(...page)
    process.stdout.write(`\r  [${id}] ${name}: ${feats.length}…   `)
    if (page.length < PAGE) break
    offset += PAGE
    await sleep(120)
  }
  const fc = { type: 'FeatureCollection', _source: `APCRDA ArcGIS / AmaravatiCapitalCityLayers/${id} (${name})`, _scraped: new Date().toISOString().slice(0, 10), features: feats }
  const file = path.join(OUT, `${name}.geojson`)
  fs.writeFileSync(file, JSON.stringify(fc))
  const kb = (fs.statSync(file).size / 1024).toFixed(0)
  console.log(`\r  [${id}] ${name}: ${feats.length} features -> ${name}.geojson (${kb} KB)        `)
  return { id, name, count: feats.length, kb: +kb }
}

const results = []
for (const [id, name] of MANIFEST) {
  if (only.length && !only.includes(name)) continue
  try { const r = await scrapeLayer(id, name); if (r) results.push(r) } catch (e) { console.log(`\r  [${id}] ${name}: FAILED ${String(e).slice(0, 80)}`) }
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ root: ROOT, scraped: new Date().toISOString(), layers: results }, null, 2))
console.log(`\nDone: ${results.length} layers -> ${path.relative(path.join(__dirname, '..'), OUT)}`)
