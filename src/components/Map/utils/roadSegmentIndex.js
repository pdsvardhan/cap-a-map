import { ROAD_RESERVE_SYMBOLOGIES } from '../../../utils/colors'

export function computeCentroid(geometry) {
  if (!geometry || !geometry.coordinates) return null
  const ring = geometry.type === 'Polygon'
    ? geometry.coordinates[0]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates[0][0]
      : null
  if (!ring || ring.length === 0) return null
  let sumLon = 0, sumLat = 0
  for (const coord of ring) {
    sumLon += coord[0]
    sumLat += coord[1]
  }
  return [
    Math.round((sumLon / ring.length) * 1e6) / 1e6,
    Math.round((sumLat / ring.length) * 1e6) / 1e6,
  ]
}

export function getStableRoadKey(geometry) {
  if (!geometry || !geometry.coordinates) return null
  const ring = geometry.type === 'Polygon'
    ? geometry.coordinates[0]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates[0][0]
      : null
  if (!ring || ring.length < 3) return null
  const centroid = computeCentroid(geometry)
  if (!centroid) return null
  let area = 0
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  area = Math.abs(area) / 2
  return `${centroid[0].toFixed(6)}_${centroid[1].toFixed(6)}_${area.toFixed(8)}`
}

export function buildRoadSegmentIndex(features) {
  const roadSegs = []
  for (let i = 0; i < features.length; i++) {
    const f = features[i]
    if (!ROAD_RESERVE_SYMBOLOGIES.has(f.properties?.symbology)) continue
    const centroid = computeCentroid(f.geometry)
    const stableKey = getStableRoadKey(f.geometry)
    roadSegs.push({ featureIndex: i, stableKey, centroid })
  }
  roadSegs.sort((a, b) => {
    if (!a.centroid || !b.centroid) return 0
    const latDiff = a.centroid[1] - b.centroid[1]
    if (Math.abs(latDiff) > 0.0001) return latDiff
    return a.centroid[0] - b.centroid[0]
  })
  const keyToId = new Map()
  roadSegs.forEach((seg, idx) => {
    seg.segmentId = idx
    if (seg.stableKey) keyToId.set(seg.stableKey, idx)
  })
  return { segments: roadSegs, keyToId }
}
