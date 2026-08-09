/**
 * 10_scoring.mjs — L2–L4 relative desirability scoring engine (adr-008).
 *
 * Computes an explainable, RELATIVE desirability index for every 1km-grid "Node"
 * cell, under two lenses (commercial / residential), from status-weighted anchor
 * proximity + road access + FSI. No transaction prices (standing non-goal); the
 * output is an ordering, not a valuation.
 *
 * Model (locked in adr-008):
 *   influence_i = base_weight(type, lens) × status_multiplier × exp(-d/DECAY_KM)
 *   anchorPart  = α·max(influence) + (1−α)·aggregate,  α = 0.6
 *                 aggregate = 1 − Π(1 − influence_i)   (noisy-OR: saturates at 1,
 *                 so accumulation never drowns out the dominant-anchor term)
 *   raw         = anchorPart + w_road·roadAccess + w_fsi·fsiNorm
 *   score       = min–max normalise(raw) → 0..100
 *
 * RETIRED 2026-08-09 — flood downside. §5 flags Kondaveeti Vagu inundation, and
 * the factor targeted the only two villages the docs name as exposed (Undavalli,
 * Penumaka). The move to the authoritative LPSMosaicDec2024 (#136) removed both
 * villages from the dataset entirely — APCRDA's LPS mosaic does not contain them
 * — so the penalty matched 0 of 161 cells and silently contributed nothing while
 * still appearing in the model description. Removed rather than left as dead code;
 * re-introducing flood exposure needs real geography (Kondaveeti Vagu alignment +
 * elevation), not a village allowlist. Removal is numerically inert: verified
 * identical scores for all 161 cells before/after.
 *
 * Inputs  : public/data/search.json, public/data/named_roads_index.json,
 *           public/data/named_roads.geojson,
 *           public/data/sources/apcrda/{available_lands,land_allotments}.geojson
 * Output  : public/data/region_scores.json
 * Run     : node pipeline/10_scoring.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const D = (p) => path.join(ROOT, 'public', 'data', p)
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

// ─── Model constants (adr-008) ───────────────────────────────────────────────
const ALPHA = 0.6          // dominant-anchor weight
const DECAY_KM = 1.5       // default anchor influence e-folding distance (a campus/building)
// Not every anchor decays like a building. An existing metro's pull reaches across
// the whole southern corridor (§4 prices Penumaka/Venkatapalem/Krishnayapalem on
// Vijayawada + E3 access, all 2.5–4km from the crossing); the riverfront is likewise
// a linear feature, not a point.
const DECAY_BY_TYPE = { gateway: 4.0 }
// The aggregate models the NEARBY anchor cluster, not every anchor in the city.
// Without this cap the noisy-OR saturates: ~27 anchors each contributing a small
// distant tail push even remote cells to ~0.75, flattening the whole field.
const AGG_TOP_K = 5
const W_ROAD_C = 0.35, W_ROAD_R = 0.20
const W_FSI_C = 0.25, W_FSI_R = 0.05

// Golden rule: weight by status. Many 2014–19 MoUs never got built.
const STATUS_MUL = {
  operational: 1.0,
  'under-construction': 0.7,
  committed: 0.4,
  planned: 0.2,
}

// Per-type base weight under each lens (c = commercial, r = residential).
const WEIGHT = {
  govt: { c: 1.00, r: 0.70 },        // Government Complex — the dominant anchor
  govt_res: { c: 0.45, r: 0.75 },
  finance: { c: 0.90, r: 0.35 },
  tech: { c: 0.75, r: 0.45 },
  education: { c: 0.50, r: 0.90 },
  health: { c: 0.55, r: 0.80 },
  hospitality: { c: 0.60, r: 0.30 },
  park: { c: 0.25, r: 0.70 },
  residential: { c: 0.25, r: 0.60 },
  sports: { c: 0.35, r: 0.45 },
  gateway: { c: 0.85, r: 0.70 },     // the existing city across the river (+ riverfront)
}

// Anchor catalog — transcribed from docs/AMARAVATI_CONTEXT.md §3.
// Located at the centroid of `village` (computed from real plot coordinates).
// Anchors whose village is absent from the plot data are SKIPPED and reported —
// we do not invent coordinates. (§6 flags the Mangalagiri/Chinakakani/Navuluru
// cluster as real but off the core land-pool.)
const ANCHORS = [
  // Government core — the #1 value driver
  { name: 'Velagapudi Interim Secretariat', village: 'Velagapudi', status: 'operational', type: 'govt' },
  { name: 'Interim High Court', village: 'Nelapadu', status: 'operational', type: 'govt' },
  { name: 'Legislative Assembly', village: 'Rayapudi', status: 'under-construction', type: 'govt' },
  { name: 'Permanent High Court', village: 'Nelapadu', status: 'under-construction', type: 'govt' },
  { name: 'Secretariat GAD + HoD Towers', village: 'Rayapudi', status: 'under-construction', type: 'govt' },
  { name: 'MLA/MLC + officer housing', village: 'Velagapudi', status: 'under-construction', type: 'govt_res' },
  { name: 'Lok Bhavan / Raj Bhavan', village: 'Rayapudi', status: 'committed', type: 'govt' },
  { name: 'Happy Nest towers', village: 'Nelapadu', status: 'under-construction', type: 'residential' },
  // Education (Knowledge City)
  // Neerukonda is absent from the plot data (and was absent from the pre-mosaic
  // scrape too), so the village centroid can never resolve. It is a 🟢 operational
  // Knowledge-City anchor, not an off-pool edge one, so dropping it silently
  // understated the whole southern education cluster. Placed from its own APCRDA
  // allotment polygons instead (#449).
  { name: 'SRM University-AP', deriveFrom: 'allotment:SRM University', status: 'operational', type: 'education' },
  { name: 'VIT-AP', village: 'Inavolu', status: 'operational', type: 'education' },
  { name: 'Amrita Vishwa Vidyapeetham', village: 'Kuragallu', status: 'operational', type: 'education' },
  { name: 'NID-AP', village: 'Sakhamuru', status: 'operational', type: 'education' },
  { name: 'XLRI', village: 'Inavolu', status: 'under-construction', type: 'education' },
  { name: 'BITS Pilani AI+ campus', village: 'Mandadam', status: 'committed', type: 'education' },
  { name: 'Intl University of Legal Education', village: 'Nelapadu', status: 'committed', type: 'education' },
  { name: 'Govt International Model School', village: 'Nidamarru', status: 'under-construction', type: 'education' },
  // Health
  { name: 'AIIMS Mangalagiri', village: 'Mangalagiri', status: 'operational', type: 'health' },
  { name: 'NRI Academy of Medical Sciences', village: 'Chinakakani', status: 'operational', type: 'health' },
  { name: 'Basavatarakam Cancer Hospital', village: 'Thullur', status: 'under-construction', type: 'health' },
  { name: 'KIMS Hospital + Bollineni Skill Univ', village: 'Nidamarru', status: 'under-construction', type: 'health' },
  // Tech
  { name: 'Pi Datacenters', village: 'Mangalagiri', status: 'operational', type: 'tech' },
  { name: 'Amaravati Quantum Valley', village: 'Uddandarayunipalem', status: 'under-construction', type: 'tech' },
  { name: 'L&T IT Tower', village: 'Nidamarru', status: 'under-construction', type: 'tech' },
  // Finance
  { name: 'Integrated Financial City', village: 'Rayapudi', status: 'under-construction', type: 'finance' },
  // Hospitality
  { name: 'Marriott', village: 'Lingayapalem', status: 'under-construction', type: 'hospitality' },
  { name: 'Hyatt + Convention Centre', village: 'Thullur', status: 'committed', type: 'hospitality' },
  // Parks / green / sport / river
  { name: 'Sakhamuru Central Park + reservoir', village: 'Sakhamuru', status: 'under-construction', type: 'park' },
  { name: 'Biodiversity Park', village: 'Kuragallu', status: 'committed', type: 'park' },
  { name: 'Lung-space Park', village: 'Ananthavaram', status: 'committed', type: 'park' },
  { name: 'Malkapuram Park', village: 'Malkapuram', status: 'committed', type: 'park' },
  { name: 'ACA Cricket Stadium', village: 'Navuluru', status: 'operational', type: 'sports' },
  // The EXISTING metro across the Krishna — an operational driver the capital
  // anchor list otherwise misses entirely. §2: E3's NH-16 link crosses at the
  // Kanakadurga Varadhi; §4 prices the southern corridor on that access, not on
  // (unbuilt) capital anchors.
  //
  // Anchored at the E3 seed road's EASTERN TERMINUS — the crossing itself —
  // derived from authoritative road geometry rather than an invented coordinate.
  // It was previously anchored to the village of Undavalli, but the authoritative
  // LPSMosaicDec2024 contains neither Undavalli nor Penumaka, so that anchor
  // silently vanished on the move to the mosaic. Deriving it from E3 keeps the
  // driver alive for the villages that DO remain (Venkatapalem, Krishnayapalem),
  // whose §4 prices rest on exactly this access.
  //
  // The Krishna riverfront (§3, ⚪ planned, "low build certainty") is deliberately
  // NOT modelled: only the operational crossing is credited, so nothing planned
  // is ever scored as built.
  { name: 'Vijayawada gateway (Kanakadurga Varadhi)', deriveFrom: 'e3-east', status: 'operational', type: 'gateway' },
]

// E3 = Seed Capital Road (frontage roughly doubles floor price, §4).
// NH-16 links + major arterials per §2.
const NH16_ROADS = new Set(['E5', 'E7', 'E9', 'E11', 'E13', 'E15'])
const MAJOR_ARTERIALS = new Set(['N6', 'N13', 'E5', 'E13'])

// Sanity-gate reference: §4's sourced price bands (₹/sq.yd midpoints).
//
// Owner adjudicated 2026-07-16: where §4 (the sourced band table) and §7 (a prose
// gradient summary) conflict, §4 wins. Their genuine contradiction was over Undavalli/
// Penumaka — §4 put them at 35–45k (High, level with Thullur), §7 ranked them below
// Krishnayapalem/Nidamarru. That dispute is now MOOT: both villages are absent from the
// authoritative LPSMosaicDec2024, so neither has plots to score. Their rows are removed
// here rather than left to be skipped silently, which had quietly shrunk the reference
// from n=12 to n=10 without saying so.
// Ananthavaram/Abbarajupalem are quoted as ₹2–4 cr/acre ≈ ₹4–8k/sq.yd.
//
// Nelapadu is deliberately EXCLUDED: owner accepted that its operational + permanent
// High Court anchors legitimately diverge from its stale 20–35k broker band. The score
// is a forward-looking desirability index, not a price estimate.
// Ananthavaram/Abbarajupalem are EXCLUDED: §4 quotes them in ₹2–4 cr/acre (bulk
// farmland) while every other row is ₹/sq.yd for serviced LPS plots. That is a
// different product, not a lower price for the same one — converting the units and
// ranking them last would be an invalid comparison.
const PRICE_REF = {
  velagapudi: 52.5, rayapudi: 52.5,
  mandadam: 45, venkatapalem: 43,
  thullur: 40,
  nidamarru: 35, krishnayapalem: 35, uddandarayunipalem: 35,
  dondapadu: 28, nowluru: 27.5,
}
// REPORTED, NOT ENFORCED (owner, 2026-07-16). This began as a hard gate (rho >= 0.6),
// but the reference turned out to be too weak to fail a build on: it is explicitly
// "promotional" (§4), internally contradictory (§4 vs §7), unit-mixed, and n=12. Its
// largest disagreements are cases where the model is defensibly RIGHT and the band is
// lagging — Uddandarayunipalem (Quantum Valley, "highest-value tech anchor") and
// Nelapadu (operational + permanent High Court). Forcing rho up would mean damping real
// anchors to match marketing data. So we print the comparison every run and let the
// divergence be visible, rather than fitting the model to noise to turn a check green.
const MIN_RHO = 0.6

/** Spearman rank correlation (ties averaged). */
function spearman(pairs) {
  const rank = (arr) => {
    const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
    const r = new Array(arr.length)
    let i = 0
    while (i < idx.length) {
      let j = i
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
      const avg = (i + j) / 2 + 1
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg
      i = j + 1
    }
    return r
  }
  const xs = rank(pairs.map((p) => p[0])), ys = rank(pairs.map((p) => p[1]))
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0
}

// ─── Geo helpers (equirectangular is ample at this latitude/extent) ──────────
const KM_LAT = 110.57
const KM_LON = 106.7 // ≈ cos(16.5°) × 111.32
const distKm = (lon1, lat1, lon2, lat2) =>
  Math.hypot((lon1 - lon2) * KM_LON, (lat1 - lat2) * KM_LAT)

/** Normalise a raw village string to a comparison key (handles the real variants). */
function villageKey(raw) {
  if (!raw) return null
  let s = String(raw).trim()
  if (!s || s.toUpperCase() === 'N/A') return null
  // Multi-village strings ("Rayapudi, Kondamarajupalem") → take the first.
  s = s.split(/[,;]/)[0].trim()
  s = s.toLowerCase().replace(/[^a-z]/g, '')
  const ALIAS = {
    nowlur: 'nowluru',
    thulluru: 'thullur',
    ayinavolu: 'inavolu', ainavolu: 'inavolu',
    velgapudi: 'velagapudi',
    udpalem: 'uddandarayunipalem', uddandaryunipalem: 'uddandarayunipalem',
    pitchikalapalem: 'pitchakalapalem', pitchikalaplem: 'pitchakalapalem',
    ptichikalapalem: 'pitchakalapalem',
    maplapuram: 'malkapuram',
    // The authoritative mosaic carries BOTH spellings (Sekhamuru 3,318 /
    // Sakhamuru 525). Without this, NID-AP + the Central Park anchor to a
    // 525-plot fragment instead of the real village centroid.
    sekhamuru: 'sakhamuru',
  }
  return ALIAS[s] || s
}

// ─── 1. Grid axes (mirrors src/utils/regions.js computeNode exactly) ─────────
const roadNum = (name) => parseInt(String(name).replace(/[^0-9]/g, ''), 10)

function buildAxes(roadsIndex) {
  const grid = roadsIndex.filter((r) => r.category !== 'seed access')
  const N = grid
    .filter((r) => r.orientation === 'N-S' && (r.axis != null || r.center))
    .map((r) => ({ name: r.name, n: roadNum(r.name), axis: r.axis != null ? r.axis : r.center[0] }))
    .sort((a, b) => a.axis - b.axis)
  const E = grid
    .filter((r) => r.orientation === 'E-W' && (r.axis != null || r.center))
    .map((r) => ({ name: r.name, n: roadNum(r.name), axis: r.axis != null ? r.axis : r.center[1] }))
    .sort((a, b) => a.axis - b.axis)
  return { N, E }
}

function bracket(roads, v) {
  let lo = null, hi = null
  for (const r of roads) {
    if (r.axis <= v) lo = r
    else { hi = r; break }
  }
  return [lo, hi].filter(Boolean)
}

function nodeCode(lon, lat, N, E) {
  const nb = bracket(N, lon), eb = bracket(E, lat)
  if (!nb.length || !eb.length) return null
  const lowerN = Math.min(...nb.map((r) => r.n))
  const lowerE = Math.min(...eb.map((r) => r.n))
  return `Node ${lowerN}·${lowerE}`
}

// ─── 2. Load inputs ──────────────────────────────────────────────────────────
const roadsIndex = readJSON(D('named_roads_index.json'))
const { N: AXIS_N, E: AXIS_E } = buildAxes(roadsIndex)
if (!AXIS_N.length || !AXIS_E.length) {
  console.error('FATAL: could not build grid axes from named_roads_index.json')
  process.exit(1)
}

const searchRaw = readJSON(D('search.json'))
const searchArr = Array.isArray(searchRaw) ? searchRaw : (searchRaw.items || Object.values(searchRaw)[0])
const plots = searchArr.filter((x) => x.t === 'plot' && x.lat != null && x.lon != null)

// ─── 3. Cell aggregation + village centroids ─────────────────────────────────
const cells = new Map()      // code -> { n, sumLat, sumLon, villages:Map }
const villageAgg = new Map() // key -> { n, sumLat, sumLon, label }

for (const p of plots) {
  const code = nodeCode(p.lon, p.lat, AXIS_N, AXIS_E)
  const vk = villageKey(p.v)
  if (code) {
    let c = cells.get(code)
    if (!c) { c = { n: 0, sumLat: 0, sumLon: 0, villages: new Map() }; cells.set(code, c) }
    c.n++; c.sumLat += p.lat; c.sumLon += p.lon
    if (vk) c.villages.set(vk, (c.villages.get(vk) || 0) + 1)
  }
  if (vk) {
    let v = villageAgg.get(vk)
    if (!v) { v = { n: 0, sumLat: 0, sumLon: 0, label: String(p.v).split(/[,;]/)[0].trim() }; villageAgg.set(vk, v) }
    v.n++; v.sumLat += p.lat; v.sumLon += p.lon
  }
}

const villageCentroid = new Map()
for (const [k, v] of villageAgg) {
  villageCentroid.set(k, { lon: v.sumLon / v.n, lat: v.sumLat / v.n, label: v.label, n: v.n })
}

// (Anchors are resolved in step 5b, once road geometry is available — one anchor
//  derives its coordinate from the E3 alignment rather than a village centroid.)

// ─── 5. Road geometry → per-cell access (#135: E3 / NH-16 / arterial) ────────
// Nearest-vertex distance: the trunk-road polygons are densely vertexed, so this
// is within a few metres of true point-to-polygon distance.
const namedRoads = readJSON(D('named_roads.geojson'))
const roadVerts = new Map() // roadName -> [[lon,lat],...]
for (const f of namedRoads.features) {
  const name = f.properties?.roadName
  if (!name) continue
  const out = roadVerts.get(name) || []
  const pushRing = (ring) => { for (const pt of ring) out.push([pt[0], pt[1]]) }
  const g = f.geometry
  if (!g) continue
  if (g.type === 'Polygon') g.coordinates.forEach(pushRing)
  else if (g.type === 'MultiPolygon') g.coordinates.forEach((poly) => poly.forEach(pushRing))
  roadVerts.set(name, out)
}
const minDistToRoads = (lon, lat, names) => {
  let best = Infinity
  for (const nm of names) {
    const vs = roadVerts.get(nm)
    if (!vs) continue
    for (const [vlon, vlat] of vs) {
      const d = distKm(lon, lat, vlon, vlat)
      if (d < best) best = d
    }
  }
  return best
}
const E3_NAMES = [...roadVerts.keys()].filter((n) => n.toUpperCase() === 'E3')
const NH16_NAMES = [...roadVerts.keys()].filter((n) => NH16_ROADS.has(n.toUpperCase()))
const ART_NAMES = [...roadVerts.keys()].filter((n) => MAJOR_ARTERIALS.has(n.toUpperCase()))
// These are string-matched against roadName, so a rename upstream would silently zero
// the road factor. E3 frontage is §4's most-cited premium ("roughly doubles the floor
// price") — fail loudly rather than quietly ship an index missing it.
console.log(`Road match: E3=${E3_NAMES.length} · NH16=${NH16_NAMES.length}/${NH16_ROADS.size} · major-arterial=${ART_NAMES.length}/${MAJOR_ARTERIALS.size} (of ${roadVerts.size} named roads)`)
if (!E3_NAMES.length) {
  console.error('FATAL: E3 (Seed Capital Road) not found in named_roads.geojson — the seed-road premium would silently be 0. Check roadName values.')
  process.exit(1)
}
if (!NH16_NAMES.length || !ART_NAMES.length) {
  console.warn('WARNING: no NH-16 link or major-arterial roads matched — those access factors contribute 0.')
}

// ─── 5b. Resolve anchors to coordinates (skip + report unresolvable) ─────────
// Most anchors sit at their village's centroid. Two derive differently:
//   · the Vijayawada gateway, from the E3 alignment's eastern terminus (the
//     crossing), because the mosaic contains no village there to average;
//   · SRM University-AP, from its own APCRDA land-allotment polygons, because
//     its village (Neerukonda) has never been in the plot data at all.
const ringCentroid = (g) => {
  const ring = g.type === 'Polygon' ? g.coordinates[0]
    : g.type === 'MultiPolygon' ? g.coordinates[0][0] : null
  if (!ring || !ring.length) return null
  let sx = 0, sy = 0
  for (const pt of ring) { sx += pt[0]; sy += pt[1] }
  return { lon: sx / ring.length, lat: sy / ring.length }
}

// Named institutions carry authoritative geometry in LandAllotments. An anchor
// whose village is missing can still be placed from its OWN allotted parcels —
// real APCRDA geometry, not an invented coordinate. Multi-parcel institutions
// are area-weighted so a 7-acre annexe cannot drag the anchor off the campus.
const allotmentsFC = readJSON(D(path.join('sources', 'apcrda', 'land_allotments.geojson')))
function allotmentCentroid(name) {
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  const hits = allotmentsFC.features.filter((f) => {
    const p = f.properties || {}
    return [p.name, p.text].some((v) => typeof v === 'string' && re.test(v))
  })
  if (!hits.length) return null
  let wsum = 0, lon = 0, lat = 0
  for (const h of hits) {
    const c = ringCentroid(h.geometry)
    if (!c) continue
    const w = Number(h.properties?.area_ac) > 0 ? Number(h.properties.area_ac) : 1
    wsum += w; lon += c.lon * w; lat += c.lat * w
  }
  if (!wsum) return null
  return { lon: lon / wsum, lat: lat / wsum, parcels: hits.length, acres: wsum }
}

function deriveCoord(kind) {
  if (kind === 'e3-east') {
    let best = null
    for (const nm of E3_NAMES) {
      for (const [lon, lat] of (roadVerts.get(nm) || [])) {
        if (!best || lon > best.lon) best = { lon, lat }
      }
    }
    return best
  }
  if (kind.startsWith('allotment:')) return allotmentCentroid(kind.slice('allotment:'.length))
  return null
}

const resolved = [], skipped = []
for (const a of ANCHORS) {
  let c = null
  if (a.deriveFrom) {
    c = deriveCoord(a.deriveFrom)
    if (!c) { skipped.push(`${a.name} (derive:${a.deriveFrom} failed)`); continue }
    const prov = c.parcels ? ` (${c.parcels} parcel(s), ${c.acres.toFixed(1)} ac)` : ''
    console.log(`Derived ${a.name} from ${a.deriveFrom}: ${c.lon.toFixed(5)}, ${c.lat.toFixed(5)}${prov}`)
  } else {
    c = villageCentroid.get(villageKey(a.village))
    if (!c) { skipped.push(`${a.name} (${a.village})`); continue }
  }
  resolved.push({ ...a, lon: c.lon, lat: c.lat })
}

// ─── 6. FSI per cell (#135: AvailableLands + LandAllotments) ─────────────────
// (ringCentroid is defined in 5b, where the allotment anchor resolver needs it.)
const fsiAgg = new Map() // code -> {sum, n}
let fsiAll = 0, fsiAllN = 0
for (const file of ['available_lands.geojson', 'land_allotments.geojson']) {
  const fc = readJSON(D(path.join('sources', 'apcrda', file)))
  for (const f of fc.features) {
    const fsi = parseFloat(f.properties?.fsi) // "Conditional"/"" → NaN → no signal
    if (!Number.isFinite(fsi)) continue
    const c = ringCentroid(f.geometry)
    if (!c) continue
    const code = nodeCode(c.lon, c.lat, AXIS_N, AXIS_E)
    if (!code) continue
    const a = fsiAgg.get(code) || { sum: 0, n: 0 }
    a.sum += fsi; a.n++; fsiAgg.set(code, a)
    fsiAll += fsi; fsiAllN++
  }
}
const FSI_MEAN = fsiAllN ? fsiAll / fsiAllN : 0
const FSI_MAX = 9 // observed ceiling in the APCRDA data

// ─── 7. Score every cell ─────────────────────────────────────────────────────
const rows = []
for (const [code, c] of cells) {
  const lon = c.sumLon / c.n, lat = c.sumLat / c.n
  const modalVillage = [...c.villages.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // anchor influences
  const infl = []
  for (const a of resolved) {
    const d = distKm(lon, lat, a.lon, a.lat)
    const decay = Math.exp(-d / (DECAY_BY_TYPE[a.type] || DECAY_KM))
    const sm = STATUS_MUL[a.status] ?? 0.2
    const w = WEIGHT[a.type] || { c: 0.3, r: 0.3 }
    infl.push({ a, d, c: w.c * sm * decay, r: w.r * sm * decay })
  }
  const part = (lens) => {
    const vs = infl.map((i) => Math.min(Math.max(i[lens], 0), 1)).sort((a, b) => b - a)
    const mx = vs[0] || 0
    let prod = 1
    for (const v of vs.slice(0, AGG_TOP_K)) prod *= (1 - v)
    return ALPHA * mx + (1 - ALPHA) * (1 - prod)
  }

  // road access (#135)
  const e3 = E3_NAMES.length ? Math.exp(-minDistToRoads(lon, lat, E3_NAMES) / 1.0) : 0
  const nh = NH16_NAMES.length ? Math.exp(-minDistToRoads(lon, lat, NH16_NAMES) / 1.5) : 0
  const ar = ART_NAMES.length ? Math.exp(-minDistToRoads(lon, lat, ART_NAMES) / 1.0) : 0
  const roadAccess = 0.5 * e3 + 0.3 * nh + 0.2 * ar

  // FSI (#135) — impute the global mean where APCRDA gives no numeric FSI, so
  // "no data" is neutral rather than a penalty.
  const fa = fsiAgg.get(code)
  const fsiVal = fa ? fa.sum / fa.n : FSI_MEAN
  const fsiNorm = Math.min(fsiVal / FSI_MAX, 1)

  const rawC = part('c') + W_ROAD_C * roadAccess + W_FSI_C * fsiNorm
  const rawR = part('r') + W_ROAD_R * roadAccess + W_FSI_R * fsiNorm

  // top-3 drivers (explainability)
  const drivers = [...infl].sort((a, b) => Math.max(b.c, b.r) - Math.max(a.c, a.r)).slice(0, 3)
    .map((i) => `${i.a.name} · ${i.d < 1 ? Math.round(i.d * 1000) + 'm' : i.d.toFixed(1) + 'km'} (${i.a.status})`)
  if (e3 > 0.5) drivers.push('E3 seed-road access')

  rows.push({
    code, rawC, rawR, n: c.n,
    village: modalVillage ? (villageCentroid.get(modalVillage)?.label || modalVillage) : null,
    vkey: modalVillage,
    fsi: fa ? Number(fsiVal.toFixed(2)) : null,
    drivers,
  })
}

// ─── 8. Normalise 0..100 ─────────────────────────────────────────────────────
const norm = (vals) => {
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const span = hi - lo || 1
  return (v) => Math.round(((v - lo) / span) * 100)
}
const nC = norm(rows.map((r) => r.rawC))
const nR = norm(rows.map((r) => r.rawR))
for (const r of rows) { r.c = nC(r.rawC); r.r = nR(r.rawR) }

// ─── 9. Sanity gate — must reproduce the known village gradient (§7) ─────────
// Attribute every plot to its OWN village rather than to the cell's plurality
// label: a 1km cell straddles villages, so labelling a core-adjacent mixed cell
// "Abbarajupalem" (merely its plurality) inflated that village's mean. Plot-weighted
// mean of cell scores over each village's real plots.
const byVillage = new Map()
for (const r of rows) {
  for (const [vk, cnt] of cells.get(r.code).villages) {
    const b = byVillage.get(vk) || { sum: 0, n: 0 }
    b.sum += r.c * cnt; b.n += cnt; byVillage.set(vk, b)
  }
}
const pairs = [], gateRows = []
const priceRefMissing = []
for (const [vk, price] of Object.entries(PRICE_REF)) {
  const b = byVillage.get(vk)
  // A reference village with no plots silently shrinks n. That is exactly how the
  // reference went from 12 to 10 unnoticed when the mosaic dropped Undavalli/Penumaka,
  // so collect and report rather than skipping quietly.
  if (!b) { priceRefMissing.push(vk); continue }
  const score = b.sum / b.n
  pairs.push([score, price])
  gateRows.push({ vk, score, price })
}
const rho = spearman(pairs)
// Nelapadu is excluded from PRICE_REF by owner decision, and it is one of the model's
// largest disagreements — so excluding it flatters rho. Report BOTH, so the headline
// number can't be read as an unbiased fit. (Nowluru, its §4 row-mate, is retained.)
const withNel = [...pairs]
const nelB = byVillage.get('nelapadu')
if (nelB) withNel.push([nelB.sum / nelB.n, 27.5])
const rhoWithNel = withNel.length > pairs.length ? spearman(withNel) : null

console.log('\nPrice-reference check — model commercial score vs §4 price bands (₹k/sq.yd):')
for (const g of [...gateRows].sort((a, b) => b.price - a.price)) {
  console.log(`  ${g.vk.padEnd(20)} price ${String(g.price).padStart(5)}   model ${g.score.toFixed(1).padStart(5)}`)
}
console.log(`  Spearman rho = ${rho.toFixed(3)}  (reported, not enforced; reference rho >= ${MIN_RHO}, n=${pairs.length}/${Object.keys(PRICE_REF).length})`)
if (priceRefMissing.length) {
  console.warn(`  NOTE: ${priceRefMissing.length} reference village(s) have no plots and were excluded from rho: ${priceRefMissing.join(', ')}`)
}
if (rhoWithNel != null) {
  console.log(`  rho incl. Nelapadu (owner-excluded, anchors trusted over its band) = ${rhoWithNel.toFixed(3)} (n=${withNel.length})`)
}
const ok = rho >= MIN_RHO
if (!ok) {
  console.warn(`  WARNING: rho ${rho.toFixed(3)} < ${MIN_RHO} — the index does not track the §4 asking-price ordering.`)
  console.warn('  This is REPORTED, not fatal: §4 is promotional/lagging and the model is forward-looking.')
  console.warn('  Review the table above; large gaps are either a real model bug or a stale band.')
}

// ─── 10. Write ───────────────────────────────────────────────────────────────
const out = {
  generated: new Date().toISOString(),
  model: { adr: 'adr-008-scoring-engine', alpha: ALPHA, decay_km: DECAY_KM, status_multipliers: STATUS_MUL },
  caveat: 'Relative index only — no transaction prices. A political reversal at the ~2029 AP election is a global risk affecting all cells equally and is therefore excluded from the relative score.',
  price_caveat: 'This is a forward-looking desirability index built from status-weighted anchors, not a price estimate. It can diverge from current asking prices, which are broker-sourced and promotional — e.g. areas next to a just-built anchor may score above their current asking band.',
  price_reference_rho: Number(rho.toFixed(3)),
  price_reference_rho_incl_nelapadu: rhoWithNel == null ? null : Number(rhoWithNel.toFixed(3)),
  anchors_used: resolved.length,
  anchors_skipped: skipped,
  cells: Object.fromEntries(rows.map((r) => [r.code, {
    c: r.c, r: r.r, v: r.village, n: r.n, fsi: r.fsi, drivers: r.drivers,
  }])),
}
fs.writeFileSync(D('region_scores.json'), JSON.stringify(out))

console.log(`\nCells scored: ${rows.length} · anchors used: ${resolved.length} · FSI cells: ${fsiAgg.size} (mean ${FSI_MEAN.toFixed(2)})`)
if (skipped.length) console.log(`Anchors SKIPPED (village absent from plot data — no coordinates invented):\n  - ${skipped.join('\n  - ')}`)
const top = [...rows].sort((a, b) => b.c - a.c).slice(0, 5)
console.log('Top commercial cells:', top.map((r) => `${r.code}(${r.village})=${r.c}`).join(', '))
console.log(`Wrote ${D('region_scores.json')}`)

console.log(ok
  ? `Price-reference check: PASS (rho ${rho.toFixed(3)}).\n`
  : `Price-reference check: DIVERGES (rho ${rho.toFixed(3)}) — reported above, not fatal (adr-008 amended 2026-07-16).\n`)
