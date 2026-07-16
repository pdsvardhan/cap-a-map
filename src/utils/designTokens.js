/**
 * Active design-system tokens (from the design AI's "Amaravati Visual System").
 *
 * Colours are pre-generated per direction by scripts/gen_design_tokens.mjs into
 * designTokens.generated.json (OKLCH → hex). This module picks the ACTIVE
 * direction (default 'B' Warm Cadastre; override with ?dir=A|B|C|D) and maps each
 * raw plot `symbology` to a zone code → hex, so MapLibre gets static colours.
 */
import GEN from './designTokens.generated.json'

const DEFAULT_DIR = 'C'   // Statutory Dark — owner pick (the "official" palette on dark)
function pickDir() {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('dir')
    if (q && GEN[q.toUpperCase()]) return q.toUpperCase()
  }
  return DEFAULT_DIR
}
export const DIR = pickDir()
export const TOKENS = GEN[DIR]
export const CANVAS_BG = TOKENS.bg
export const INK = TOKENS.ink
export const IS_LIGHT = TOKENS.light
export const LAND_BASE = TOKENS.landBase || TOKENS.bg   // fill under plots so inter-parcel gaps read as land
export const ROAD = TOKENS.road          // { treat:'filled'|'cased', color, casing, alpha? }
export const ZONE_HEX = TOKENS.zones      // { R3:'#..', C2:'#..', ... }

const CODES = new Set(Object.keys(ZONE_HEX))

// Map a raw APCRDA symbology string → a ZMETA zone code.
export function symToCode(sym) {
  if (!sym) return 'U2'
  const s = sym.trim()
  if (/^Residential Vacant/i.test(s)) return 'R3'   // big-two base; vacant = status modifier
  if (/^Commercial Vacant/i.test(s)) return 'C2'
  if (/^Burial/i.test(s)) return 'BUR'
  if (/^(RAA|RARP|RATH)/i.test(s)) return 'RAA'
  if (/^PGN-?G/i.test(s)) return 'PGN_G'
  if (/^PGN-?V/i.test(s)) return 'PGN_V'
  if (/cultural/i.test(s)) return 'SC'
  if (/health/i.test(s)) return 'SH'
  const m = s.match(/^S?([RCISPU])\s?-?\s?(\d)/i)
  if (m) {
    const code = (m[1] + m[2]).toUpperCase()
    if (CODES.has(code)) return code
  }
  return 'U1'
}

export function colorForSymbology(sym) {
  return ZONE_HEX[symToCode(sym)] || ZONE_HEX.U1 || '#9aa0ab'
}

// Water bodies (separate geojson layer) use the dedicated WAT swatch.
export const WATER_FILL = ZONE_HEX.WAT
// Road-reserve plot fill = the U2 zone colour for this direction.
export const ROAD_RESERVE_FILL = ZONE_HEX.U2
// Sequential data-mode ramp (plot-area now, land-value later) — 6 stops pale→deep
// at the active direction's rampHue. Baked by gen_design_tokens.mjs.
export const RAMP = TOKENS.ramp || ['#1a9850', '#91cf60', '#fee08b', '#fc8d59', '#d73027', '#7b2d8e']
