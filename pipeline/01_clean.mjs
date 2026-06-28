/**
 * Pipeline stage 01 — CLEAN
 *
 * Reads the raw scraped plots GeoJSON and produces a trustworthy, normalized
 * dataset. Fixes the documented column-mapping bugs (see docs/UNDERSTANDING.md §3):
 *   - alloted_ex  -> area_sqyd            (it was the AREA, not allocation status)
 *   - nbr ("Sq.Yards") -> dropped         (a stray unit column, never a neighbor list)
 *   - regcode_n/s/e/w -> parsed neighbors  (plot adjacencies) + road frontages
 *   - village -> normalized + village_na flag
 *   - zoning_group -> validated against colors.js (flags mismatches / unknowns)
 *   - lat/lon -> centroid-filled where missing
 *   - slims unused fields from the payload
 *
 * Input:  public/data/plots_wgs84.geojson   (raw, ~90MB, gitignored)
 * Output: public/data/plots.clean.geojson   (gitignored)
 *         public/data/clean_report.json      (auditable quality report)
 *
 * Run: node --max-old-space-size=4096 pipeline/01_clean.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SYMBOLOGY_GROUP_MAP } from '../src/utils/colors.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const IN = path.join(DATA, 'plots_wgs84.geojson')
const OUT = path.join(DATA, 'plots.clean.geojson')
const REPORT = path.join(DATA, 'clean_report.json')

// ---- Known village spelling variants -> canonical (case-insensitive keys) ----
// Starter map; the report dumps the full distinct list so this can be refined.
const VILLAGE_CANONICAL = {
  'thulluru': 'Thullur',
  'thullur': 'Thullur',
  'nelapadu': 'Nelapadu',
  'nidamarru': 'Nidamarru',
  'nidamaru': 'Nidamarru',
  'borupalem': 'Borupalem',
  'boorupalem': 'Borupalem',
}

const LARGE_AREA_OUTLIER_SQYD = 100000 // ~20 acres; flag (likely a zone polygon), don't drop

// ---- helpers ----
function centroidOfPolygon(geom) {
  // mean of exterior-ring vertices (drop closing dup); good enough for fly-to
  if (!geom || geom.type !== 'Polygon' || !geom.coordinates?.[0]) return null
  const ring = geom.coordinates[0]
  const n = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1 : ring.length
  let sx = 0, sy = 0
  for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1] }
  if (!n) return null
  return [sx / n, sy / n]
}

function isBlank(v) {
  return v == null || v === '' || v === 'N/A' || v === 'NA' || (typeof v === 'string' && v.trim() === '')
}

// Parse a regcode_<dir> value into {kind:'plot', regcode} | {kind:'road', width_m} | null
const ROAD_RE = /^\s*([\d.]+)\s*m(?:tr|eter)?s?\s*road\s*$/i
function parseNeighbor(val) {
  if (isBlank(val)) return null
  const s = String(val).trim()
  const m = s.match(ROAD_RE)
  if (m) {
    const w = parseFloat(m[1])
    return { kind: 'road', width_m: Number.isFinite(w) ? w : null }
  }
  return { kind: 'plot', regcode: s }
}

function normalizeVillage(v) {
  if (isBlank(v)) return { village: null, na: true }
  const trimmed = String(v).trim().replace(/\s+/g, ' ')
  const canon = VILLAGE_CANONICAL[trimmed.toLowerCase()]
  return { village: canon || trimmed, na: false }
}

// ---- run ----
console.log(`[clean] reading ${IN} ...`)
const raw = JSON.parse(fs.readFileSync(IN, 'utf8'))
const feats = raw.features || []
console.log(`[clean] ${feats.length} features`)

const report = {
  generated_at: new Date().toISOString(),
  input_features: feats.length,
  output_features: 0,
  fixes: {
    area_from_alloted_ex: 0,
    area_zero_or_invalid: 0,
    area_large_outliers: 0,
    nbr_dropped: 0,
    centroid_filled: 0,
    village_na: 0,
    village_normalized: 0,
    neighbors_parsed: 0,
    road_frontages_parsed: 0,
  },
  zoning: { matches: 0, mismatches: 0, unknown: 0, mismatch_samples: [] },
  villages_raw: {},        // distinct raw village -> count
  villages_clean: {},      // distinct clean village -> count
  area_stats: {},
  frontage_stats: { plots_with_frontage: 0, max_frontage_seen: 0 },
}

const DIRS = ['n', 's', 'e', 'w']
const outFeatures = []
const areas = []

for (const f of feats) {
  const p = f.properties || {}

  // -- village --
  const rawVillage = p.village
  report.villages_raw[rawVillage ?? '(null)'] = (report.villages_raw[rawVillage ?? '(null)'] || 0) + 1
  const { village, na } = normalizeVillage(rawVillage)
  if (na) report.fixes.village_na++
  if (!na && village !== String(rawVillage ?? '').trim()) report.fixes.village_normalized++
  report.villages_clean[village ?? '(na)'] = (report.villages_clean[village ?? '(na)'] || 0) + 1

  // -- area (from mislabeled alloted_ex) --
  let area = Number(p.alloted_ex)
  if (!Number.isFinite(area) || area <= 0) { area = null; report.fixes.area_zero_or_invalid++ }
  else { report.fixes.area_from_alloted_ex++; areas.push(area) }
  const isLargeOutlier = area != null && area > LARGE_AREA_OUTLIER_SQYD
  if (isLargeOutlier) report.fixes.area_large_outliers++

  // -- nbr dropped --
  if (p.nbr !== undefined) report.fixes.nbr_dropped++

  // -- neighbors / frontages from regcode_n/s/e/w --
  const adj_plots = []
  const frontages = []
  for (const d of DIRS) {
    const parsed = parseNeighbor(p[`regcode_${d}`])
    if (!parsed) continue
    if (parsed.kind === 'plot') adj_plots.push({ dir: d, regcode: parsed.regcode })
    else { frontages.push({ dir: d, width_m: parsed.width_m }); }
  }
  if (adj_plots.length) report.fixes.neighbors_parsed++
  let max_frontage_m = null
  if (frontages.length) {
    report.fixes.road_frontages_parsed++
    report.frontage_stats.plots_with_frontage++
    for (const fr of frontages) if (fr.width_m != null && (max_frontage_m == null || fr.width_m > max_frontage_m)) max_frontage_m = fr.width_m
    if (max_frontage_m != null && max_frontage_m > report.frontage_stats.max_frontage_seen) report.frontage_stats.max_frontage_seen = max_frontage_m
  }

  // -- zoning_group validation --
  const sym = p.symbology
  const expectedGroup = sym != null ? SYMBOLOGY_GROUP_MAP[sym] : undefined
  let zoning_group = p.zoning_group
  if (zoning_group === 'unknown' || zoning_group == null) report.zoning.unknown++
  if (expectedGroup) {
    if (expectedGroup === zoning_group) report.zoning.matches++
    else {
      report.zoning.mismatches++
      if (report.zoning.mismatch_samples.length < 15)
        report.zoning.mismatch_samples.push({ symbology: sym, data: zoning_group, expected: expectedGroup })
      zoning_group = expectedGroup // trust colors.js mapping over scraped value
    }
  }

  // -- lat/lon centroid fill --
  let lat = Number(p.lat), lon = Number(p.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const c = centroidOfPolygon(f.geometry)
    if (c) { lon = c[0]; lat = c[1]; report.fixes.centroid_filled++ }
    else { lat = null; lon = null }
  }

  // -- slimmed, cleaned properties --
  const props = {
    regcode: isBlank(p.regcode) ? null : p.regcode,
    plot_code: isBlank(p.plot_code) ? null : p.plot_code,
    plot_no: p.plot_no ?? null,
    farmer_n: isBlank(p.farmer_n) ? null : p.farmer_n,
    village,
    village_na: na,
    township: p.township ?? null,
    sector: p.sector ?? null,
    block: p.block ?? null,
    colony: p.colony ?? null,
    symbology: sym ?? null,
    zoning_group: zoning_group ?? 'unknown',
    plot_categ: isBlank(p.plot_categ) ? null : p.plot_categ,
    area_sqyd: area,
    is_large_outlier: isLargeOutlier || undefined,
    polylength: Number.isFinite(Number(p.polylength)) ? Number(p.polylength) : null,
    polywidth: Number.isFinite(Number(p.polywidth)) ? Number(p.polywidth) : null,
    max_frontage_m,
    adj_plots: adj_plots.length ? adj_plots.map(a => `${a.dir}:${a.regcode}`) : undefined,
    frontages: frontages.length ? frontages.map(fr => `${fr.dir}:${fr.width_m}`) : undefined,
    lat, lon,
  }
  // strip undefined to keep payload tight
  for (const k of Object.keys(props)) if (props[k] === undefined) delete props[k]

  outFeatures.push({ type: 'Feature', properties: props, geometry: f.geometry })
}

// area stats
areas.sort((a, b) => a - b)
if (areas.length) {
  const q = pr => areas[Math.floor(pr * (areas.length - 1))]
  report.area_stats = {
    n: areas.length, min: areas[0], p25: q(.25), median: q(.5), p75: q(.75), p95: q(.95), max: areas[areas.length - 1],
  }
}

report.output_features = outFeatures.length
report.distinct_villages_raw = Object.keys(report.villages_raw).length
report.distinct_villages_clean = Object.keys(report.villages_clean).length

// write outputs
const outGeo = { type: 'FeatureCollection', features: outFeatures }
fs.writeFileSync(OUT, JSON.stringify(outGeo))
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))

// console summary
console.log('\n===== CLEAN report =====')
console.log(`output: ${report.output_features} features -> ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`)
console.log('fixes:', JSON.stringify(report.fixes, null, 1))
console.log('zoning:', JSON.stringify({ matches: report.zoning.matches, mismatches: report.zoning.mismatches, unknown: report.zoning.unknown }))
if (report.zoning.mismatch_samples.length) console.log('zoning mismatch samples:', JSON.stringify(report.zoning.mismatch_samples.slice(0, 6)))
console.log('area_sqyd stats:', JSON.stringify(report.area_stats))
console.log('frontage:', JSON.stringify(report.frontage_stats))
console.log(`villages: ${report.distinct_villages_raw} raw -> ${report.distinct_villages_clean} clean`)
console.log('full report ->', path.basename(REPORT))
