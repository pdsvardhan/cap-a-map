/**
 * Format area value with commas and unit.
 */
export function formatArea(value, unit = 'Sq.Yards') {
  if (!value || value === 'N/A' || value === 0) return 'N/A'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return 'N/A'
  return `${num.toLocaleString()} ${unit}`
}

/**
 * Format dimensions (length × width).
 */
export function formatDimensions(length, width) {
  if ((!length || length === 'N/A') && (!width || width === 'N/A')) return 'N/A'
  const l = typeof length === 'string' ? parseFloat(length) : length
  const w = typeof width === 'string' ? parseFloat(width) : width
  if (isNaN(l) || isNaN(w)) return 'N/A'
  return `${l.toFixed(1)} × ${w.toFixed(1)} m`
}

/**
 * Format farmer name for display.
 */
export function formatFarmerName(name) {
  if (!name || name === 'N/A' || name.trim() === '') return 'N/A'
  return name
}

/**
 * Format neighbour info (can be a regcode, road name, or status).
 */
export function formatNeighbour(value) {
  if (!value || value === 'N/A') return 'N/A'
  return value
}

/**
 * Extract lat/lon from a Google Maps link.
 * Format: https://www.google.com/maps?q=16.50347127,80.45437705
 */
export function extractLatLonFromGoogleLink(link) {
  if (!link || link === 'N/A') return null
  const match = link.match(/q=([\d.-]+),([\d.-]+)/)
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lon: parseFloat(match[2]),
    }
  }
  return null
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text, maxLen = 30) {
  if (!text || text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}
