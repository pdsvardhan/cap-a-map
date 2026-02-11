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

export function getGroupForSymbology(symbology) {
  return SYMBOLOGY_GROUP_MAP[symbology] || 'unknown'
}

/**
 * Build a MapLibre match expression for fill-color based on symbology.
 * Road-reserve (U2/SU2) gets near-transparent fill to match ArcGIS behavior.
 */
export function buildSymbologyColorExpression() {
  const expr = ['match', ['get', 'symbology']]
  for (const [sym, color] of Object.entries(SYMBOLOGY_COLOR_MAP)) {
    // Road reserve zones are transparent in ArcGIS — use near-transparent
    if (color === 'transparent') {
      expr.push(sym, 'rgba(0,0,0,0)')
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
 * Road reserve symbologies that should be non-clickable
 */
export const ROAD_RESERVE_SYMBOLOGIES = new Set([
  'U2 - Road reserve zone',
  'U2- Road reserve zone',
  'SU2 - Road Network',
])

// Allocated lands categories
export const ALLOCATED_LAND_CATEGORIES = {
  education: {
    label: 'Education',
    color: '#FF9800',
    keywords: ['School', 'IGNOU', 'VIT', 'SRM', 'Amrita', 'BITS', 'BES', 'XAVIER', 'Podar', 'CSI', 'DAV', 'Basil Wood', 'Law University', 'Chinmaya Mission School', 'KV-2', 'NID'],
  },
  health: {
    label: 'Health',
    color: '#F44336',
    keywords: ['Health Center', 'Primary Health', 'Basavatarakam', 'ESIC'],
  },
  civic: {
    label: 'Civic & Social',
    color: '#9C27B0',
    keywords: ['Anganwadi', 'Multi Faith Funeral', 'Ramakrishna Mission'],
  },
  government: {
    label: 'Government',
    color: '#D32F2F',
    keywords: ['IGC', 'APCRDA', 'CAG', 'CPWD', 'SDPO', 'DOP', 'Bureau of Immigration', 'Income Tax', 'CBI', 'VIDESH BHAVAN', 'BJP', 'AIS'],
  },
  financial: {
    label: 'Financial',
    color: '#1976D2',
    keywords: ['SBI', 'BOI', 'BOB', 'CANARA', 'LIC', 'NIACL', 'Reserve Bank', 'NABARD', 'Coastal Bank', 'INB', 'UBI', 'AP Grameena', 'SIB', 'Central Bannk', 'HUDCO', 'APCOB'],
  },
  infrastructure: {
    label: 'Infrastructure & PSU',
    color: '#455A64',
    keywords: ['400KV', 'BPCL', 'GAIL', 'HPCL', 'IRCTC', 'IRCS', 'L&T', 'QuantumValley', 'APTIDCO', 'CITD', 'APSDRFSD', 'APNART'],
  },
  sports: {
    label: 'Sports',
    color: '#4CAF50',
    keywords: ['Gopichand', 'Cricket Academy', 'TTD', 'NSM'],
  },
  private: {
    label: 'Private & Commercial',
    color: '#607D8B',
    keywords: ['SPLENDOR', 'MALAXMI', 'GRT', 'MANJEERA', 'SOUTHERN', 'VARUN', 'GPHRL', 'GLENDALE', 'SFSL', 'INDROYAL', 'JRGR', 'DASAPAllA', 'BISER', 'G.V. Estates', 'K. Srikanth', 'PV Sindhu', 'LVPEI'],
  },
}

export function categorizeAllocatedLand(label) {
  if (!label) return 'private'
  const upper = label.toUpperCase()
  for (const [catKey, cat] of Object.entries(ALLOCATED_LAND_CATEGORIES)) {
    for (const keyword of cat.keywords) {
      if (upper.includes(keyword.toUpperCase())) {
        return catKey
      }
    }
  }
  return 'private'
}
