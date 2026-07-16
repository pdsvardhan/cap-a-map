/**
 * Pipeline stage 01b — CLEAN (authoritative mosaic)  [todo #136, adr-002]
 *
 * Replaces 01_clean.mjs's input: the old 95,291-plot scrape (messy `symbology`,
 * mislabeled columns) gives way to APCRDA's authoritative LPSMosaicDec2024
 * (86,918 plots) pulled straight from the live ArcGIS server by
 * scripts/scrape_apcrda.mjs (layer 34). It carries official `lu_code`/`lu_desc`,
 * per-plot `fsi`, 8-direction neighbours and a precise `extn_sqyrd` area.
 *
 * ⚠️ PRIVACY — the single most important thing this stage does.
 * The raw mosaic contains `farmer_n` (owner names) AND `aadhar_no` (Aadhaar
 * national ID numbers, e.g. "494398295960 , AM13000053"). Everything this stage
 * emits is published: it flows into plots.pmtiles and search.json, which nginx
 * serves. Both fields — and every other identity field — are DROPPED here, at the
 * source, so they can never reach a tile, an index, or the bundle. Do not
 * re-add them. See docs/UNDERSTANDING.md §3 + constants.js SHOW_OWNER_NAMES.
 *
 * Input:  public/data/sources/apcrda/plots_mosaic.geojson  (~195MB, gitignored)
 * Output: public/data/plots.clean.geojson                  (gitignored)
 *         public/data/clean_report.json                    (auditable)
 *
 * Run: node --max-old-space-size=8192 pipeline/01_clean_mosaic.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SYMBOLOGY_GROUP_MAP } from '../src/utils/colors.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const IN = path.join(DATA, 'sources', 'apcrda', 'plots_mosaic.geojson')
const OUT = path.join(DATA, 'plots.clean.geojson')
const REPORT = path.join(DATA, 'clean_report.json')

// Identity fields that must NEVER be emitted (see the privacy note above).
const PII_FIELDS = ['farmer_n', 'aadhar_no', 'rs_no', 'reg_doc_no', 'applicatio', 'allotmenti']

const VILLAGE_CANONICAL = {
  thulluru: 'Thullur', thullur: 'Thullur',
  nowlur: 'Nowluru', nowluru: 'Nowluru',
  nidamaru: 'Nidamarru', nidamarru: 'Nidamarru',
  boorupalem: 'Borupalem', borupalem: 'Borupalem',
  velgapudi: 'Velagapudi', velagapudi: 'Velagapudi',
  ainavolu: 'Inavolu', ayinavolu: 'Inavolu', inavolu: 'Inavolu',
  udpalem: 'Uddandarayunipalem', uddandaryunipalem: 'Uddandarayunipalem',
  uddandarayunipalem: 'Uddandarayunipalem',
  pitchikalapalem: 'Pitchakalapalem', pitchikalaplem: 'Pitchakalapalem',
  ptichikalapalem: 'Pitchakalapalem', pitchakalapalem: 'Pitchakalapalem',
  maplapuram: 'Malkapuram', malkapuram: 'Malkapuram',
}
const LARGE_AREA_OUTLIER_SQYD = 100000

const isBlank = (v) => v == null || v === '' || v === 'N/A' || v === 'NA' || (typeof v === 'string' && v.trim() === '')

function normalizeVillage(raw) {
  if (isBlank(raw)) return { village: null, na: true }
  // Multi-village strings ("Rayapudi, Kondamarajupalem") → the first named one.
  const first = String(raw).split(/[,;:]/)[0].trim()
  const key = first.toLowerCase().replace(/[^a-z]/g, '')
  return { village: VILLAGE_CANONICAL[key] || first, na: false }
}

const ROAD_RE = /^\s*([\d.]+)\s*m(?:tr|eter)?s?\s*road\s*$/i
function parseNeighbor(val) {
  if (isBlank(val)) return null
  const s = String(val).trim()
  const m = s.match(ROAD_RE)
  if (m) {
    const w = parseFloat(m[1])
    return Number.isFinite(w) ? { kind: 'road', width_m: w } : null
  }
  // Zone/walkway neighbours ("P2-Active zone", "Walkway") aren't plots.
  if (/^walkway$/i.test(s) || /zone$/i.test(s)) return { kind: 'other', label: s }
  return { kind: 'plot', regcode: s }
}

/** Mean of the exterior ring (drop closing dup) — ample for fly-to / region assignment. */
function centroidOfPolygon(geom) {
  if (!geom) return null
  const ring = geom.type === 'Polygon' ? geom.coordinates?.[0]
    : geom.type === 'MultiPolygon' ? geom.coordinates?.[0]?.[0] : null
  if (!ring || !ring.length) return null
  const n = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1 : ring.length
  if (!n) return null
  let sx = 0, sy = 0
  for (let i = 0; i < n; i++) { sx += ring[i][0]; sy += ring[i][1] }
  return [sx / n, sy / n]
}

console.log('Reading', path.relative(path.join(__dirname, '..'), IN), '…')
const raw = JSON.parse(fs.readFileSync(IN, 'utf8'))
const feats = raw.features || []
console.log(`  ${feats.length} features (source: ${raw._source || '?'}, scraped ${raw._scraped || '?'})`)

const report = {
  source: raw._source, scraped: raw._scraped, input_features: feats.length,
  privacy: { dropped_fields: PII_FIELDS, note: 'Identity fields are dropped at source; they must never reach tiles/indexes.' },
  fixes: { area_from_extn_sqyrd: 0, area_from_alloted_ex: 0, area_zero_or_invalid: 0, area_large_outliers: 0, centroid_filled: 0, village_na: 0, village_normalized: 0, neighbors_parsed: 0, road_frontages_parsed: 0 },
  lu: { with_lu_code: 0, with_lu_desc: 0, missing_lu: 0 },
  zoning: { mapped: 0, unknown: 0, unknown_samples: {} },
  fsi: { with_fsi: 0, sum: 0 },
  villages_clean: {},
  area_stats: {},
}

const DIRS = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se']
const outFeatures = []
const areas = []

for (const [pid, f] of feats.entries()) {
  const p = f.properties || {}

  const { village, na } = normalizeVillage(p.village)
  if (na) report.fixes.village_na++
  report.villages_clean[village ?? '(na)'] = (report.villages_clean[village ?? '(na)'] || 0) + 1

  // -- area: prefer the precise extn_sqyrd; alloted_ex is the same value rounded
  //    (it was never an allocation status — see UNDERSTANDING.md §3) --
  let area = Number(p.extn_sqyrd)
  if (Number.isFinite(area) && area > 0) report.fixes.area_from_extn_sqyrd++
  else {
    area = Number(p.alloted_ex)
    if (Number.isFinite(area) && area > 0) report.fixes.area_from_alloted_ex++
    else { area = null; report.fixes.area_zero_or_invalid++ }
  }
  if (area != null) areas.push(area)
  const isLargeOutlier = area != null && area > LARGE_AREA_OUTLIER_SQYD
  if (isLargeOutlier) report.fixes.area_large_outliers++

  // -- neighbours + road frontages (mosaic gives all 8 compass points) --
  const adj_plots = [], frontages = []
  for (const d of DIRS) {
    const parsed = parseNeighbor(p[`regcode_${d}`])
    if (!parsed) continue
    if (parsed.kind === 'plot') adj_plots.push(`${d}:${parsed.regcode}`)
    else if (parsed.kind === 'road') frontages.push({ dir: d, width_m: parsed.width_m })
  }
  if (adj_plots.length) report.fixes.neighbors_parsed++
  let max_frontage_m = null
  if (frontages.length) {
    report.fixes.road_frontages_parsed++
    for (const fr of frontages) if (max_frontage_m == null || fr.width_m > max_frontage_m) max_frontage_m = fr.width_m
  }

  // -- land use: lu_code/lu_desc are the authoritative labels; symbology is kept
  //    only so colors.js's existing symbology→group map still resolves --
  const lu_code = isBlank(p.lu_code) ? null : String(p.lu_code).trim()
  const lu_desc = isBlank(p.lu_desc) ? null : String(p.lu_desc).trim()
  if (lu_code) report.lu.with_lu_code++
  if (lu_desc) report.lu.with_lu_desc++
  if (!lu_code && !lu_desc) report.lu.missing_lu++

  const sym = isBlank(p.symbology) ? null : p.symbology
  let zoning_group = sym != null ? SYMBOLOGY_GROUP_MAP[sym] : undefined
  if (zoning_group) report.zoning.mapped++
  else {
    report.zoning.unknown++
    zoning_group = 'unknown'
    const k = sym || lu_desc || '(blank)'
    report.zoning.unknown_samples[k] = (report.zoning.unknown_samples[k] || 0) + 1
  }

  // -- fsi: per-plot development intensity, straight from the authority --
  const fsiN = Number(p.fsi)
  const fsi = Number.isFinite(fsiN) && fsiN > 0 ? fsiN : null
  if (fsi != null) { report.fsi.with_fsi++; report.fsi.sum += fsi }

  // -- lat/lon: the mosaic's `centroid`/`plotcoord` are PROJECTED (UTM), not
  //    WGS84, so always derive from the WGS84 geometry --
  const c = centroidOfPolygon(f.geometry)
  let lat = null, lon = null
  if (c) { lon = c[0]; lat = c[1]; report.fixes.centroid_filled++ }

  // -- slimmed, cleaned, PII-FREE properties --
  const props = {
    pid,
    regcode: isBlank(p.regcode) ? null : p.regcode,
    plot_code: isBlank(p.plot_code) ? null : p.plot_code,
    plot_no: p.plot_no ?? null,
    village,
    village_na: na,
    township: p.township ?? null,
    sector: p.sector ?? null,
    block: p.block ?? null,
    colony: p.colony ?? null,
    lu_code,
    lu_desc,
    symbology: sym,
    zoning_group,
    plot_categ: isBlank(p.plot_categ) ? null : p.plot_categ,
    plot_type: isBlank(p.plot_type) ? null : p.plot_type,
    nat_site: isBlank(p.nat_site) ? null : p.nat_site,
    fsi,
    area_sqyd: area,
    is_large_outlier: isLargeOutlier || undefined,
    polylength: Number.isFinite(Number(p.polylength)) ? Number(p.polylength) : null,
    polywidth: Number.isFinite(Number(p.polywidth)) ? Number(p.polywidth) : null,
    max_frontage_m,
    adj_plots: adj_plots.length ? adj_plots : undefined,
    frontages: frontages.length ? frontages.map((fr) => `${fr.dir}:${fr.width_m}`) : undefined,
    lat, lon,
  }
  // Belt-and-braces: assert no identity field survived the mapping above.
  for (const k of PII_FIELDS) if (k in props) throw new Error(`PII field "${k}" leaked into output — refusing to write.`)

  outFeatures.push({ type: 'Feature', properties: props, geometry: f.geometry })
}

areas.sort((a, b) => a - b)
const q = (f) => areas.length ? areas[Math.floor(areas.length * f)] : null
report.area_stats = { count: areas.length, min: areas[0] ?? null, median: q(0.5), p75: q(0.75), p95: q(0.95), max: areas[areas.length - 1] ?? null }
report.fsi.mean = report.fsi.with_fsi ? Number((report.fsi.sum / report.fsi.with_fsi).toFixed(3)) : null
report.output_features = outFeatures.length

fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', features: outFeatures }))
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))

console.log(`\nPII dropped at source: ${PII_FIELDS.join(', ')}`)
console.log(`lu_code: ${report.lu.with_lu_code} · lu_desc: ${report.lu.with_lu_desc} · missing: ${report.lu.missing_lu}`)
console.log(`zoning mapped: ${report.zoning.mapped} · unknown: ${report.zoning.unknown}`)
console.log(`fsi: ${report.fsi.with_fsi} plots (mean ${report.fsi.mean})`)
console.log(`area: median ${report.area_stats.median} · p95 ${report.area_stats.p95} sq.yd`)
console.log(`centroids: ${report.fixes.centroid_filled}/${outFeatures.length}`)
console.log(`\nWrote ${outFeatures.length} features -> ${path.relative(path.join(__dirname, '..'), OUT)}`)
if (report.zoning.unknown > outFeatures.length * 0.1) {
  console.warn(`WARNING: ${report.zoning.unknown} plots have no zoning_group — check SYMBOLOGY_GROUP_MAP against the mosaic's symbology values (top: ${Object.entries(report.zoning.unknown_samples).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(', ')})`)
}
