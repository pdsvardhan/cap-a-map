/**
 * Amaravati Capital City — named road attributes (N1–N18, E1–E16).
 *
 * Sources:
 *   - User-provided classification (road type per road name)
 *   - APCRDA transport plan / DPR reports (ROW, lane patterns)
 *   - Research compilation (multiple cross-referenced sources)
 *
 * Confidence levels:
 *   A = Verified from official DPR/PMC/APCRDA documents
 *   B = High confidence (consistent cross-section diagrams, multiple references)
 *   C = Indicative (social media, YouTube, real estate sources — consistent across many)
 */

export const ROAD_DATA = {
  // ─── N SERIES (North-South) ───
  N1:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N2:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N3A: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical arterial section' },
  N3B: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical arterial section' },
  N4:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N5:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N6:  { series: 'N', orientation: 'N-S', category: 'major arterial', row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Major arterial, multiple references' },
  N7:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N8:  { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N9:  { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '3+2+3', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: '4 lane + 2 lane BRT confirmed' },
  N10: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N11: { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '3+2+3', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: '4 lane + 2 lane BRT confirmed' },
  N12: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'A', remarks: '6 lane arterial confirmed' },
  N13: { series: 'N', orientation: 'N-S', category: 'major arterial', row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Connects N1 via bund road' },
  N14: { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N15: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'A', remarks: '6 lane arterial confirmed' },
  N16: { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N17: { series: 'N', orientation: 'N-S', category: 'arterial',     row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial section' },
  N18: { series: 'N', orientation: 'N-S', category: 'sub-arterial', row_m: 50, lane_pattern: '3+2+3', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'A', remarks: '4 lane + 2 lane BRT confirmed' },

  // ─── E SERIES (East-West) ───
  E1:  { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical arterial' },
  E2:  { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical arterial' },
  E3:  { series: 'E', orientation: 'E-W', category: 'seed access',   row_m: 60, lane_pattern: '4+0+4', carriageway_lanes: 4, brt_lanes: 0, brt_present: false, connects_nh16: true, confidence: 'B', remarks: 'Seed access road, connects NH-16 to core' },
  E4:  { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical arterial' },
  E5:  { series: 'E', orientation: 'E-W', category: 'major arterial', row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'NH16 to IRR trunk connection' },
  E6:  { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial, 9.844 km length reported' },
  E7:  { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Mandadam area (west)' },
  E8:  { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial, 14.955 km length reported' },
  E9:  { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical arterial' },
  E10: { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 0, brt_present: false, connects_nh16: false, confidence: 'B', remarks: 'Penumaka-Inavolu' },
  E11: { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'NH16 extension planned' },
  E12: { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial' },
  E13: { series: 'E', orientation: 'E-W', category: 'major arterial', row_m: 60, lane_pattern: '3+3+3', carriageway_lanes: 3, brt_lanes: 3, brt_present: true, connects_nh16: true, confidence: 'B', remarks: 'Govt Complex to NH16' },
  E14: { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 0, brt_present: false, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial' },
  E15: { series: 'E', orientation: 'E-W', category: 'sub-arterial',  row_m: 50, lane_pattern: '3+3+0', carriageway_lanes: 3, brt_lanes: 0, brt_present: false, connects_nh16: true, confidence: 'A', remarks: 'DPR cross-section available' },
  E16: { series: 'E', orientation: 'E-W', category: 'arterial',      row_m: 50, lane_pattern: '2+2+2', carriageway_lanes: 2, brt_lanes: 2, brt_present: true, connects_nh16: false, confidence: 'B', remarks: 'Typical sub-arterial' },
}

/**
 * Normalize road name for lookup (e.g. "n3a" -> "N3A", "E1" -> "E1").
 */
export function normalizeRoadName(name) {
  if (!name || typeof name !== 'string') return ''
  return name.trim().toUpperCase()
}

/**
 * Get full road data object for a named road.
 */
export function getRoadData(roadName) {
  const key = normalizeRoadName(roadName)
  return ROAD_DATA[key] || null
}

/**
 * Get road type/category for a named road (e.g. "N3A" -> "arterial").
 */
export function getRoadType(roadName) {
  const data = getRoadData(roadName)
  return data?.category || null
}

/**
 * Get Right of Way in metres for a named road.
 */
export function getROW(roadName) {
  const data = getRoadData(roadName)
  return data?.row_m || null
}

/**
 * Get lane pattern string (e.g. "3+3+3").
 */
export function getLanePattern(roadName) {
  const data = getRoadData(roadName)
  return data?.lane_pattern || null
}

/**
 * All known road names (for display/validation).
 */
export const KNOWN_ROAD_NAMES = Object.keys(ROAD_DATA)
