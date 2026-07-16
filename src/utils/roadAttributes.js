/**
 * Amaravati Capital City — named road attributes (N1–N18, E1–E16).
 *
 * Sources:
 *   - World Bank EIA-EMP (2018) + Resettlement Action Plan — authoritative ROW
 *     hierarchy and per-road specs (HIGH confidence).
 *   - APCRDA transport plan / DPR reports.
 *
 * ROW hierarchy (World Bank EIA, applied 2026-06-29 — see docs/AMARAVATI_CONTEXT.md §2):
 *   Major Arterial = 60 m · Arterial = 50 m · Sub-Arterial = 50 m · Collector = 25 m.
 *   (Earlier data had several arterials at 60 m — corrected to 50 m here.)
 *   NH-16 grid connectors: E5, E7, E9, E11, E13, E15 (+ E3 seed road via cable bridge).
 *
 * Confidence: A = official DPR/PMC/APCRDA · B = high (cross-referenced) · C = indicative.
 */

export const ROAD_DATA = {
  // ─── N SERIES (North-South) ───
  N1:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N2:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N3A: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial, 50m ROW (WB EIA); Venkatapalem–Krishnayapalem' },
  N3B: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial, 50m ROW (WB EIA)' },
  N4:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 0, brt_present: false, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane, ~7.17km; Penumaka/Nowluru/Krishnayapalem/Venkatapalem' },
  N5:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N6:  { series: 'N', orientation: 'N-S', category: 'major arterial', row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'Major arterial; proposed NH-16 bypass' },
  N7:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N8:  { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial; in trunk tender package' },
  N9:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane + 2 BRT, ~12.5km; Nidamarru/Kuragallu/Mandadam/Malkapuram/Velagapudi' },
  N10: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial; IRR connection' },
  N11: { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane + 2 BRT, ~8.66km; Ayinavolu/Nelapadu/Sakhamuru/Rayapudi/Velagapudi/Lingayapalem' },
  N12: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial, 50m ROW (WB EIA)' },
  N13: { series: 'N', orientation: 'N-S', category: 'major arterial', row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Major arterial; elevated corridor (with E5, E13)' },
  N14: { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 0, brt_present: false, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane, ~8.27km; Borupalem/Abbarajupalem/Thullur/Sakhamuru' },
  N15: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial, 50m ROW (WB EIA)' },
  N16: { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 0, brt_present: false, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane, ~7.36km; Borupalem/Pichakalapalem/Thullur/Ananthavaram/Nekkallu' },
  N17: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial section' },
  N18: { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: '4-lane + 2 BRT confirmed' },

  // ─── E SERIES (East-West) ───
  E1:  { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial, 50m ROW (WB EIA); IRR connection' },
  E2:  { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Sub-arterial, 50m ROW (WB EIA)' },
  E3:  { series: 'E', orientation: 'E-W', category: 'seed access',   row_m: 60, lane_pattern: '4+2+4', carriageway_lanes: 4, brt_lanes: 2, brt_present: true, connects_nh16: true, confidence: 'A', remarks: 'Seed Capital Road: 8–9 lane with dedicated BRT, ~21km; NH-16 via Kanakadurga Varadhi cable bridge' },
  E4:  { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Sub-arterial, 50m ROW (WB EIA)' },
  E5:  { series: 'E', orientation: 'E-W', category: 'major arterial', row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'Major arterial; elevated corridor; connects NH-16' },
  E6:  { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane + 2 BRT, ~9.84km; Ananthavaram/Nelapadu/Thullur/Velagapudi' },
  E7:  { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'Arterial; connects NH-16 (no land acq.)' },
  E8:  { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane + 2 BRT, ~14.96km; Nekkallu/Thullur/Sakhamuru/Velagapudi/Malkapuram/Mandadam/Venkatapalem/Krishnayapalem' },
  E9:  { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'Arterial, 50m ROW (WB EIA); connects NH-16 (no land acq.)' },
  E10: { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 0, brt_present: false, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane, ~7.81km; Inavolu/Mandadam/Venkatapalem/Kuragallu/Krishnayapalem/Nowluru/Penumaka' },
  E11: { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'Arterial, 50m ROW (WB EIA); directly linked to NH-16 (front of AIIMS)' },
  E12: { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane + 2 BRT, ~6.79km; Kuragallu/Nowluru' },
  E13: { series: 'E', orientation: 'E-W', category: 'major arterial', row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'Major arterial; Govt Complex → NH-16 (behind AIIMS)' },
  E14: { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 0, brt_present: false, connects_nh16: false, confidence: 'A', remarks: 'WB EIA: 4-lane, ~7.36km; Kuragallu/Nowluru/Nidamarru' },
  E15: { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 50, lane_pattern: '3+3+0', carriageway_lanes: 3, brt_lanes: 0, brt_present: false, connects_nh16: true, confidence: 'A', remarks: 'DPR cross-section available; extended to NH-16' },
  E16: { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Arterial section' },
}

/** Normalize road name for lookup (e.g. "n3a" -> "N3A"). */
export function normalizeRoadName(name) {
  if (!name || typeof name !== 'string') return ''
  return name.trim().toUpperCase()
}

/** Full road data object for a named road. */
export function getRoadData(roadName) {
  return ROAD_DATA[normalizeRoadName(roadName)] || null
}

/** Road category/type (e.g. "N3A" -> "arterial"). */
export function getRoadType(roadName) {
  return getRoadData(roadName)?.category || null
}

/** Right of Way in metres. */
export function getROW(roadName) {
  return getRoadData(roadName)?.row_m || null
}

/** Lane pattern string (e.g. "2+2+2"). */
export function getLanePattern(roadName) {
  return getRoadData(roadName)?.lane_pattern || null
}

/** All known road names (for display/validation). */
export const KNOWN_ROAD_NAMES = Object.keys(ROAD_DATA)

// A place-name token: capitalised, ≥4 letters, no digits/spaces/punctuation.
const VILLAGE_TOKEN = /^[A-Z][a-z]{3,}$/

/**
 * Villages a named road traverses, parsed from the WB-EIA `remarks` string.
 * Remarks encode the alignment's villages as a "; "-delimited chunk that is
 * slash- or en-dash-separated (e.g. "…~12.5km; Nidamarru/Kuragallu/Mandadam").
 * Only chunks that are mostly place-name tokens are accepted, so prose remarks
 * (e.g. "NH-16 via … cable bridge", "8–9 lane") are not mis-read as villages.
 * Returns [] when a road has no village list in its remarks.
 */
export function getRoadVillages(roadName) {
  const rd = getRoadData(roadName)
  if (!rd || !rd.remarks) return []
  const out = []
  for (const seg of rd.remarks.split(';')) {
    const tokens = seg.replace(/–/g, '/').split('/').map((t) => t.trim()).filter(Boolean)
    if (tokens.length < 2) continue
    const villageLike = tokens.filter((t) => VILLAGE_TOKEN.test(t))
    if (villageLike.length >= 2 && villageLike.length / tokens.length >= 0.6) {
      for (const v of villageLike) if (!out.includes(v)) out.push(v)
    }
  }
  return out
}

/** Road length in km, parsed from the "~N km" hint in the remarks (null if absent). */
export function getRoadLengthKm(roadName) {
  const rd = getRoadData(roadName)
  const m = rd?.remarks?.match(/~\s*([\d.]+)\s*km/i)
  return m ? Number(m[1]) : null
}
