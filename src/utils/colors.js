/**
 * Zoning color scheme for Amaravati Capital City plots.
 * Colors match official ArcGIS APCRDA Land Pooling Scheme renderer.
 * Source: layers_metadata.json → Layer 7 (LPSVILLAGE) uniqueValueInfos
 */

export const ZONING_GROUPS = {
  'residential-high': {
    label: 'Residential (Medium-High Density)',
    color: '#D9963A',
    outlineColor: '#B07A2A',
    symbologies: [
      'R3-Medium to high density zone',
      'R3 - Medium to high density zone',
      'R4-High density zone',
      'R4 - High density zone',
      'SR4 - High Density Private',
    ],
  },
  'residential-low': {
    label: 'Residential (Village/Low Density)',
    color: '#F6D79A',
    outlineColor: '#D4B878',
    symbologies: [
      'R1-Village planning zone',
      'R1MP',
      'R1-MP',
      'SR1 - Village Planning',
      'R2-Low density zone',
      'R2 - Low density zone',
      'SR2 Low Density Housing',
    ],
  },
  'residential-vacant': {
    label: 'Residential Vacant',
    color: '#EFB866',
    outlineColor: '#D09A48',
    symbologies: ['Residential Vacant'],
  },
  'commercial': {
    label: 'Commercial',
    color: '#5FA8D3',
    outlineColor: '#4888B0',
    symbologies: [
      'C1 -Mixed use zone',
      'C1 - Mixed use zone',
      'C2 - General commercial zone',
      'C2- General commercial zone',
      'C3-Neighbourhood centre zone',
      'C3 - Neighbourhood centre zone',
      'C4-Town centre zone',
      'C4 - Town centre zone',
      'C5-Regional centre zone',
      'C5 - Regional centre zone',
      'C6-Central business district zone',
      'C6 - Central business district zone',
      'SC1a-Mixed Use',
      'SC1a - Mixed Use',
      'SC1b - Mixed Use',
      'SC1b-Mixed Use',
    ],
  },
  'commercial-vacant': {
    label: 'Commercial Vacant',
    color: '#8EC5E8',
    outlineColor: '#6AA8CC',
    symbologies: ['Commercial Vacant'],
  },
  'parks-active': {
    label: 'Parks & Recreation (Active)',
    color: '#6FAF6B',
    outlineColor: '#558F52',
    symbologies: [
      'P2-Active zone',
      'P2 - Active zone',
      'SP2 - Active Zone',
      'SP2- Active Zone',
    ],
  },
  'parks-passive': {
    label: 'Parks & Gardens (Passive)',
    color: '#4C8F4A',
    outlineColor: '#3A7038',
    symbologies: [
      'P1-Passive zone',
      'P1 - Passive zone',
      'SP1 - Passive Zone',
      'SP1- Passive Zone',
    ],
  },
  'water': {
    label: 'Water Bodies',
    color: '#4A90C2',
    outlineColor: '#3670A0',
    symbologies: [
      'P3-Protected zone',
      'P3 - Protected zone',
      'SP3-Protected Zone',
      'SP3 - Protected Zone',
    ],
  },
  'green-belt': {
    label: 'Green Belt / Forest',
    color: '#2E6B2E',
    outlineColor: '#1E4E1E',
    symbologies: [
      'PGN-G',
      'P3-Protected zone Hills',
      'P3 - Protected zone Hills',
    ],
  },
  'village-green': {
    label: 'Village Green',
    color: '#B59670',
    outlineColor: '#8A7050',
    symbologies: ['PGN-V'],
  },
  'roads-infra': {
    label: 'Reserves & Infrastructure',
    color: '#B2B2B2',
    outlineColor: '#888888',
    symbologies: [
      'U1-Reserve zone',
      'U1 - Reserve zone',
      'SU1-Reserve Zone',
      'SU1 - Reserve Zone',
    ],
  },
  'road-reserve': {
    label: 'Road Reserve',
    color: 'transparent',
    outlineColor: '#333333',
    symbologies: [
      'U2 - Road reserve zone',
      'U2- Road reserve zone',
      'SU2 - Road Network',
      'U2-Road Reserve Zone',
    ],
  },
  'education': {
    label: 'Education',
    color: '#7A8FD1',
    outlineColor: '#5A6FB0',
    symbologies: [
      'S2-Education zone',
      'S2 - Education zone',
      'SS2a - Education Zone',
      'SS2a- Education Zone',
    ],
  },
  'cultural': {
    label: 'Cultural',
    color: '#B3A4D8',
    outlineColor: '#8E80B8',
    symbologies: [
      'SS2b Cultural Zone',
      'SS2b - Cultural Zone',
    ],
  },
  'health': {
    label: 'Health & Wellness',
    color: '#E48C8C',
    outlineColor: '#C06A6A',
    symbologies: [
      'SS2c Health Zone',
      'SS2c - Health Zone',
      'SS3 - Health and Wellness Zone',
      'SS3-Health and Wellness Zone',
    ],
  },
  'government': {
    label: 'Government & Civic',
    color: '#C94A4A',
    outlineColor: '#A03838',
    symbologies: [
      'S1-Government zone',
      'S1 - Government zone',
      'SS1 - Government Zone',
      'SS1-Government Zone',
    ],
  },
  'special': {
    label: 'Special Zone',
    color: '#D7B09E',
    outlineColor: '#B09080',
    symbologies: [
      'S3-Special zone',
      'S3 - Special zone',
    ],
  },
  'special-zone': {
    label: 'Special Zone (Master Plan)',
    color: '#A83800',
    outlineColor: '#802A00',
    symbologies: [
      'SS3 - Special Zone',
      'SS3-Special Zone',
    ],
  },
  'industrial': {
    label: 'Industrial',
    color: '#9C8BC8',
    outlineColor: '#7E6BB3',
    symbologies: [
      'I1-Business park zone',
      'I1 - Business park zone',
      'I2-Logistics zone',
      'I2 - Logistics zone',
      'I3-Non polluting industry zone',
      'I3 - Non polluting industry zone',
      'SI1 - Business Park',
      'SI2 - Logistics Hub',
    ],
  },
  'recreation': {
    label: 'Recreation & Open Space',
    color: '#FFAA00',
    outlineColor: '#CC8800',
    symbologies: [
      'RAA',
      'RARP',
      'RATH',
    ],
  },
  'burial-ground': {
    label: 'Burial Ground',
    color: '#D2D2D2',
    outlineColor: '#191993',
    symbologies: [
      'Burial Ground',
    ],
  },
}

// Build flat lookups: symbology string → color / group
export const SYMBOLOGY_COLOR_MAP = {}
export const SYMBOLOGY_GROUP_MAP = {}

for (const [groupKey, group] of Object.entries(ZONING_GROUPS)) {
  for (const sym of group.symbologies) {
    SYMBOLOGY_COLOR_MAP[sym] = group.color
    SYMBOLOGY_GROUP_MAP[sym] = groupKey
  }
}

export function getColorForSymbology(symbology) {
  return SYMBOLOGY_COLOR_MAP[symbology] || '#BDBDBD'
}

/**
 * Official zone names — APCRDA 2015 Zoning Regulations (docs/zoning plan).
 * Keyed by the land-use code (lu_code) prefix of a plot's symbology. Used to show
 * the authoritative zone name in the UI instead of the raw, inconsistent symbology.
 */
export const ZONE_NAMES = {
  R1: 'R1 · Village Planning Zone', R2: 'R2 · Low Density Zone',
  R3: 'R3 · Medium to High Density Zone', R4: 'R4 · High Density Zone',
  R5: 'R5 · Affordable / EWS Housing Zone',
  C1: 'C1 · Mixed Use Zone', C2: 'C2 · General Commercial Zone',
  C3: 'C3 · Neighbourhood Centre Zone', C4: 'C4 · Town Centre Zone',
  C5: 'C5 · Regional Centre Zone', C6: 'C6 · Central Business District Zone',
  I1: 'I1 · Business Park Zone', I2: 'I2 · Logistics Zone', I3: 'I3 · Non-polluting Industry Zone',
  P1: 'P1 · Passive (Parks) Zone', P2: 'P2 · Active Recreation Zone', P3: 'P3 · Protected Zone',
  S1: 'S1 · Government Zone', S2: 'S2 · Education Zone', S3: 'S3 · Special Zone',
  U1: 'U1 · Reserve Zone', U2: 'U2 · Road Reserve Zone',
  RAA: 'Road Affected Area', BG: 'Burial Ground', PGN: 'Green / Walkway',
}

// Extract the land-use code from a symbology string ("R3-Medium…" → "R3",
// "SC1a-Mixed Use" → special; "PGN-G" → "PGN") and return the official zone name.
export function getZoneName(symbology) {
  if (!symbology) return null
  const s = symbology.trim()
  if (/vacant/i.test(s)) return s.replace(/\s+/g, ' ')           // "Residential Vacant" etc.
  if (/^Burial/i.test(s)) return ZONE_NAMES.BG
  if (/^PGN/i.test(s)) return ZONE_NAMES.PGN
  if (/^RAA/i.test(s)) return ZONE_NAMES.RAA
  const m = s.match(/^S?([RCISPU])\s?(\d)([ab])?/i)              // R3, C2, SS2a, SR4, SU2…
  const code = m ? (m[1] + m[2]).toUpperCase() : null
  return (code && ZONE_NAMES[code]) || s.replace(/\s+/g, ' ')
}

export function getGroupForSymbology(symbology) {
  return SYMBOLOGY_GROUP_MAP[symbology] || 'unknown'
}

/**
 * Road-reserve fill tone. Road reserves ARE the entire street grid, so they
 * tile most of the developed core. A near-black fill made the whole map read
 * as black when zoomed out (owner feedback 2026-06-30). A recessive slate-grey
 * reads as "pavement", lets the coloured zoning dominate, and stays clearly
 * darker than every plot colour so it recedes.
 */
export const ROAD_RESERVE_FILL = '#363B45'

/**
 * Build a MapLibre match expression for fill-color based on symbology.
 * Road-reserve (U2/SU2) gets a recessive slate fill (see ROAD_RESERVE_FILL).
 */
export function buildSymbologyColorExpression() {
  const expr = ['match', ['get', 'symbology']]
  for (const [sym, color] of Object.entries(SYMBOLOGY_COLOR_MAP)) {
    if (color === 'transparent') {
      expr.push(sym, ROAD_RESERVE_FILL)
    } else {
      expr.push(sym, color)
    }
  }
  expr.push('#BDBDBD') // default fallback
  return expr
}

/**
 * Build a MapLibre match expression for outline color.
 */
export function buildSymbologyOutlineExpression() {
  const expr = ['match', ['get', 'symbology']]
  for (const [groupKey, group] of Object.entries(ZONING_GROUPS)) {
    for (const sym of group.symbologies) {
      expr.push(sym, group.outlineColor)
    }
  }
  expr.push('#9E9E9E')
  return expr
}

/**
 * Road reserve symbologies — handled separately from regular plots in click handler
 */
export const ROAD_RESERVE_SYMBOLOGIES = new Set([
  'U2 - Road reserve zone',
  'U2- Road reserve zone',
  'SU2 - Road Network',
  'U2-Road Reserve Zone',
])

/**
 * Build a MapLibre filter expression that matches all road reserve symbologies.
 * Use this instead of duplicating symbology strings in multiple places.
 */
export function buildRoadReserveFilter() {
  return [
    'any',
    ...Array.from(ROAD_RESERVE_SYMBOLOGIES).map(sym => ['==', ['get', 'symbology'], sym])
  ]
}

/**
 * Allotted-land categories — the authoritative APCRDA category field
 * (LandAllotmentsFeb2025, cleaned in pipeline/08_allotments.mjs). No more keyword
 * guessing: an allotment is a NAMED institution sitting on a zoned plot.
 */
export const ALLOCATED_LAND_CATEGORIES = {
  'Govt of India': '#D32F2F',
  'Govt of India (PSU)': '#E57373',
  'Govt of AP': '#F4511E',
  'Govt of AP (PSU)': '#FF8A65',
  'University': '#1976D2',
  'School': '#42A5F5',
  'Healthcare': '#00897B',
  'Sports': '#43A047',
  'Spiritual / Religious': '#8E24AA',
  'Hotel': '#FB8C00',
  'PPP / Private': '#607D8B',
  'Housing': '#6D4C41',
  'Other allotment': '#90A4AE',
  'Other': '#90A4AE',
}

export function getAllocatedLandColor(category) {
  return ALLOCATED_LAND_CATEGORIES[category] || '#FF6F00'
}

/**
 * Hierarchical grouping of zoning categories for the interactive legend.
 * Each category contains group keys from ZONING_GROUPS.
 */
export const ZONING_HIERARCHY = [
  {
    id: 'residential',
    label: 'Residential',
    groups: ['residential-high', 'residential-low', 'residential-vacant'],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    groups: ['commercial', 'commercial-vacant'],
  },
  {
    id: 'parks-environment',
    label: 'Parks & Environment',
    groups: ['parks-active', 'parks-passive', 'water', 'green-belt', 'village-green'],
  },
  {
    id: 'public-institutional',
    label: 'Public & Institutional',
    groups: ['education', 'cultural', 'health', 'government'],
  },
  {
    id: 'special-industrial',
    label: 'Special & Industrial',
    groups: ['industrial', 'special', 'special-zone', 'recreation'],
  },
  {
    id: 'mobility',
    label: 'Mobility',
    groups: ['road-reserve', 'roads-infra'],
  },
  {
    id: 'other',
    label: 'Other',
    groups: ['burial-ground'],
  },
]

/**
 * Plot area heatmap: color expression based on alloted_ex (Sq.Yards).
 * Small plots = warm (yellow), medium = orange, large = deep red/purple.
 * Road reserves (transparent/U2) stay muted.
 */
export function buildAreaHeatmapExpression() {
  // Gradient breakpoints in Sq. Yards:
  //   0-200:     small plots (bright yellow-green)
  //   200-500:   medium-small (yellow)
  //   500-1000:  medium (orange)
  //   1000-2000: medium-large (red-orange)
  //   2000-5000: large (red)
  //   5000+:     very large (deep purple)
  return [
    'case',
    // Road reserves stay nearly invisible
    ['any',
      ['==', ['get', 'symbology'], 'U2 - Road reserve zone'],
      ['==', ['get', 'symbology'], 'U2- Road reserve zone'],
      ['==', ['get', 'symbology'], 'SU2 - Road Network'],
      ['==', ['get', 'symbology'], 'U2-Road Reserve Zone'],
    ],
    'rgba(60,60,60,0.15)',
    // No area data → grey
    ['!', ['has', 'alloted_ex']],
    'rgba(120,120,120,0.3)',
    ['==', ['get', 'alloted_ex'], 0],
    'rgba(120,120,120,0.3)',
    // Area-based gradient
    [
      'interpolate', ['linear'], ['get', 'alloted_ex'],
      0,    '#1a9850',   // green - tiny
      200,  '#91cf60',   // light green
      500,  '#fee08b',   // yellow
      1000, '#fc8d59',   // orange
      2000, '#d73027',   // red
      5000, '#7b2d8e',   // purple - very large
    ],
  ]
}

/**
 * Area heatmap legend breakpoints for display.
 */
export const AREA_HEATMAP_LEGEND = [
  { label: '< 200 Sq.Yd', color: '#91cf60' },
  { label: '200–500', color: '#fee08b' },
  { label: '500–1,000', color: '#fc8d59' },
  { label: '1,000–2,000', color: '#d73027' },
  { label: '2,000–5,000', color: '#7b2d8e' },
  { label: '> 5,000', color: '#4a0072' },
]

/**
 * Build a filtered color expression for MapLibre.
 * Active groups get their normal color, inactive groups get a faint muted color.
 * Pass null or a Set containing all group keys to show everything normally.
 */
export function buildFilteredColorExpression(activeGroups) {
  const allKeys = Object.keys(ZONING_GROUPS)
  if (!activeGroups || activeGroups.size === allKeys.length) {
    return buildSymbologyColorExpression()
  }
  const expr = ['match', ['get', 'symbology']]
  for (const [groupKey, group] of Object.entries(ZONING_GROUPS)) {
    const isActive = activeGroups.has(groupKey)
    for (const sym of group.symbologies) {
      if (group.color === 'transparent') {
        expr.push(sym, ROAD_RESERVE_FILL)
      } else {
        expr.push(sym, isActive ? group.color : 'rgba(255,255,255,0.08)')
      }
    }
  }
  expr.push('rgba(255,255,255,0.08)')
  return expr
}
