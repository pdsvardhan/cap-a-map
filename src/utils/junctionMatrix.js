/**
 * Build a "which road meets which road" matrix from named road segment geometries.
 * Used for directions and junction awareness later.
 * Uses Turf booleanTouches (shared boundary, no overlap).
 */
import booleanTouches from '@turf/boolean-touches'

/**
 * @param {Array<{ type: 'Feature', geometry: object, properties: { roadName: string } }>} segmentFeatures
 * @returns {{ [roadName: string]: string[] }} Map of road name -> list of other road names it touches
 */
export function buildJunctionMatrix(segmentFeatures) {
  const matrix = Object.create(null)

  for (let i = 0; i < segmentFeatures.length; i++) {
    const a = segmentFeatures[i]
    const nameA = (a.properties && a.properties.roadName) || ''
    if (!nameA) continue

    for (let j = i + 1; j < segmentFeatures.length; j++) {
      const b = segmentFeatures[j]
      const nameB = (b.properties && b.properties.roadName) || ''
      if (!nameB || nameA === nameB) continue

      try {
        const touches = booleanTouches(a, b)
        if (touches) {
          if (!matrix[nameA]) matrix[nameA] = []
          if (!matrix[nameA].includes(nameB)) matrix[nameA].push(nameB)
          if (!matrix[nameB]) matrix[nameB] = []
          if (!matrix[nameB].includes(nameA)) matrix[nameB].push(nameA)
        }
      } catch (e) {
        // Ignore invalid geometry
      }
    }
  }

  return matrix
}
