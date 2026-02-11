/**
 * Zoning color scheme for Amaravati Capital City plots.
 * Maps symbology values → visual groups → colors.
 */

// Zoning group definitions
export const ZONING_GROUPS = {
  'residential-high': {
    label: 'Residential (Medium-High Density)',
    color: '#E88D67',
    outlineColor: '#C96B45',
    symbologies: [
      'R3-Medium to high density zone',
      'R3 - Medium to high density zone',
      'SR4 - High Density Private',
    ],
  },
  'residential-low': {
    label: 'Residential (Village/Low Density)',
    color: '#F4A582',
    outlineColor: '#D4856A',
    symbologies: [
      'R1-Village planning zone',
      'R1MP',
      'R1-MP',
      'SR1 - Village Planning',
    ],
  },
  'residential-vacant': {
    label: 'Residential Vacant',
    color: '#F5D5C0',
    outlineColor: '#D9B9A4',
    symbologies: ['Residential Vacant'],
  },
  'commercial': {
    label: 'Commercial',
    color: '#7B68EE',
    outlineColor: '#5B48CE',
    symbologies: [
      'C2 - General commercial zone',
      'C2- General commercial zone',
      'C1 -Mixed use zone',
      'C1 - Mixed use zone',
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
    color: '#D8D0F0',
    outlineColor: '#B8B0D0',
    symbologies: ['Commercial Vacant'],
  },
  'parks-active': {
    label: 'Parks & Recreation (Active)',
    color: '#4CAF50',
    outlineColor: '#388E3C',
    symbologies: [
      'P2-Active zone',
      'P2 - Active zone',
      'SP2 - Active Zone',
    ],
  },
  'parks-passive': {
    label: 'Parks & Gardens (Passive)',
    color: '#81C784',
    outlineColor: '#66BB6A',
    symbologies: [
      'P1-Passive zone',
      'P1 - Passive zone',
      'SP1 - Passive Zone',
    ],
  },
  'parks-protected': {
    label: 'Green & Protected Areas',
    color: '#2E7D32',
    outlineColor: '#1B5E20',
    symbologies: [
      'P3-Protected zone',
      'P3 - Protected zone',
      'SP3 - Protected Zone',
      'PGN-G',
      'PGN-V',
    ],
  },
  'roads-infra': {
    label: 'Roads & Infrastructure',
    color: '#9E9E9E',
    outlineColor: '#757575',
    symbologies: [
      'U2 - Road reserve zone',
      'U2- Road reserve zone',
      'U1-Reserve zone',
      'U1 - Reserve zone',
      'SU2 - Road Network',
      'SU1-Reserve Zone',
      'SU1 - Reserve Zone',
    ],
  },
  'education': {
    label: 'Education',
    color: '#FFB74D',
    outlineColor: '#F59E1B',
    symbologies: [
      'S2-Education zone',
      'S2 - Education zone',
      'SS2a - Education Zone',
      'SS2b Cultural Zone',
      'SS2b - Cultural Zone',
    ],
  },
  'government': {
    label: 'Government & Civic',
    color: '#EF5350',
    outlineColor: '#D32F2F',
    symbologies: [
      'SS1 - Government Zone',
      'SS1-Government Zone',
    ],
  },
  'special': {
    label: 'Special & Health',
    color: '#AB47BC',
    outlineColor: '#8E24AA',
    symbologies: [
      'S3-Special zone',
      'S3 - Special zone',
      'SS3 - Health and Wellness Zone',
      'SS3-Health and Wellness Zone',
    ],
  },
  'industrial': {
    label: 'Industrial',
    color: '#78909C',
    outlineColor: '#546E7A',
    symbologies: [
      'I3-Non polluting industry zone',
      'I3 - Non polluting industry zone',
      'SI1 - Business Park',
      'SI2 - Logistics Hub',
    ],
  },
  'recreation': {
    label: 'Recreation & Open Space',
    color: '#AED581',
    outlineColor: '#8BC34A',
    symbologies: [
      'RAA',
      'RARP',
      'RATH',
    ],
  },
}

// Build a flat lookup: symbology string → color
export const SYMBOLOGY_COLOR_MAP = {}
export const SYMBOLOGY_GROUP_MAP = {}

for (const [groupKey, group] of Object.entries(ZONING_GROUPS)) {
  for (const sym of group.symbologies) {
    SYMBOLOGY_COLOR_MAP[sym] = group.color
    SYMBOLOGY_GROUP_MAP[sym] = groupKey
  }
}

/**
 * Get the color for a given symbology value.
 * Falls back to a neutral grey if unknown.
 */
export function getColorForSymbology(symbology) {
  return SYMBOLOGY_COLOR_MAP[symbology] || '#BDBDBD'
}

/**
 * Get the zoning group key for a symbology value.
 */
export function getGroupForSymbology(symbology) {
  return SYMBOLOGY_GROUP_MAP[symbology] || 'unknown'
}

/**
 * Build a MapLibre match expression for fill-color based on symbology.
 * Returns: ['match', ['get', 'symbology'], sym1, color1, sym2, color2, ..., defaultColor]
 */
export function buildSymbologyColorExpression() {
  const expr = ['match', ['get', 'symbology']]
  for (const [sym, color] of Object.entries(SYMBOLOGY_COLOR_MAP)) {
    expr.push(sym, color)
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
  expr.push('#9E9E9E') // default fallback
  return expr
}

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

/**
 * Categorize an allocated land label into a category.
 */
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
