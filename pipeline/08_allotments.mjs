/**
 * Pipeline stage 08 — ALLOTTED LANDS from the authoritative APCRDA layer.
 *
 * Replaces the old keyword-categorised allocated_lands.geojson with the real
 * LandAllotmentsFeb2025 layer (scripts/scrape_apcrda.mjs ->
 * sources/apcrda/land_allotments.geojson): every allotment is a NAMED institution
 * with an official category, the zoning district it sits on, and its FSI.
 *
 * This untangles the owner's "allotted vs zoned" confusion: a university (e.g.
 * VIT-AP) is an ALLOTMENT (named entity, category=University) that sits ON an
 * S2-Education zoned plot — two different facts, now both shown explicitly.
 *
 * Output: public/data/allocated_lands.geojson  (properties: label, category, zoning, fsi)
 * Run:    node pipeline/08_allotments.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(__dirname, '..', 'public', 'data')
const SRC = path.join(DATA, 'sources', 'apcrda', 'land_allotments.geojson')
const OUT = path.join(DATA, 'allocated_lands.geojson')

// Tidy the raw category strings (they carry \r\n and casing noise) into a clean set.
function cleanCategory(raw) {
  const c = (raw || '').replace(/\s+/g, ' ').trim()
  const map = {
    'GOI': 'Govt of India', 'GOI PSUs': 'Govt of India (PSU)', 'GOI GOI': 'Govt of India',
    'GoAP': 'Govt of AP', 'GOAP PSUs': 'Govt of AP (PSU)',
    'University': 'University', 'Schools': 'School', 'Health care': 'Healthcare',
    'Sports': 'Sports', 'Spiritual': 'Spiritual / Religious', 'Religious': 'Spiritual / Religious',
    '3*Hotel': 'Hotel', '4*Hotel': 'Hotel', '5*Hotel': 'Hotel',
    'PPP': 'PPP / Private', 'Housing policy': 'Housing', 'Land Allotments': 'Other allotment',
    'Others': 'Other',
  }
  return map[c] || (c || 'Other')
}

console.log(`[08] reading ${path.relative(path.join(__dirname, '..'), SRC)} …`)
const src = JSON.parse(fs.readFileSync(SRC, 'utf8'))

const features = []
const catCounts = {}
for (const f of src.features) {
  const p = f.properties || {}
  const name = (p.name || p.text || '').replace(/\s+/g, ' ').trim()
  if (!name || !f.geometry) continue
  const category = cleanCategory(p.category)
  catCounts[category] = (catCounts[category] || 0) + 1
  const fsi = (p.fsi || '').toString().trim()
  features.push({
    type: 'Feature',
    properties: {
      label: name,
      category,
      zoning: (p.zoning || '').trim() || null,   // the zone district it occupies
      fsi: fsi || null,
    },
    geometry: f.geometry,
  })
}

fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', features }))
console.log(`\n===== ALLOTTED LANDS (authoritative) =====`)
console.log(`allotments: ${features.length}`)
console.log('by category:', JSON.stringify(catCounts))
console.log(`-> ${path.basename(OUT)} (${(fs.statSync(OUT).size / 1e3).toFixed(0)} KB)`)
