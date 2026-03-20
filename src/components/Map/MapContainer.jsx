import React, { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import useMapStore, { LoadingStage } from '../../stores/mapStore'
import { MAP_CENTER, MAP_ZOOM, MAP_MIN_ZOOM, MAP_MAX_ZOOM, MAP_STYLE, DATA_PATHS, LAYERS } from '../../utils/constants'
import { buildSymbologyColorExpression, buildFilteredColorExpression, buildAreaHeatmapExpression, ROAD_RESERVE_SYMBOLOGIES, SYMBOLOGY_GROUP_MAP } from '../../utils/colors'
import { getRoadType, normalizeRoadName } from '../../utils/roadAttributes'
import { buildJunctionMatrix } from '../../utils/junctionMatrix'
import { SEGMENT_TO_ROAD } from '../../utils/roadSegmentMapping'
import { buildRoadSegmentIndex, computeCentroid, getStableRoadKey } from './utils/roadSegmentIndex'
import {
  getPlotFillLayer, getPlotOutlineLayer, getPlotHighlightLayer, getRoadModeOverlayLayer,
  getNamedRoadsFillLayer, getNamedRoadsOutlineLayer, getNamedRoadsHighlightLayer, getNamedRoadsLabelsLayer,
  getAllocatedLandsFillLayer, getAllocatedLandsOutlineLayer, getAllocatedLandsLabelsLayer,
} from './utils/layerDefinitions'

export default function MapContainer() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const plotsDataRef = useRef(null)
  const roadSegmentIndexRef = useRef({ segments: [], keyToId: new Map() })

  const setLoadingStage = useMapStore((s) => s.setLoadingStage)
  const setLoadingError = useMapStore((s) => s.setLoadingError)
  const setReady = useMapStore((s) => s.setReady)
  const selectPlot = useMapStore((s) => s.selectPlot)
  const setNamedRoadsIndex = useMapStore((s) => s.setNamedRoadsIndex)
  const setPlotCounts = useMapStore((s) => s.setPlotCounts)

  // Subscribe to reactive state for effects
  const roadMode = useMapStore((s) => s.roadMode)
  const activeZoningGroups = useMapStore((s) => s.activeZoningGroups)
  const allocatedLandsVisible = useMapStore((s) => s.allocatedLandsVisible)
  const colorMode = useMapStore((s) => s.colorMode)
  const showNamedOnly = useMapStore((s) => s.showNamedOnly)
  const selectedPlot = useMapStore((s) => s.selectedPlot)

  // Keep a mutable ref for roadMode (used in click handlers)
  const roadModeRef = useRef(false)
  useEffect(() => { roadModeRef.current = roadMode }, [roadMode])

  // --- Init map ---
  useEffect(() => {
    if (mapRef.current) return

    setLoadingStage(LoadingStage.INIT)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    })

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 150 }), 'bottom-left')

    mapRef.current = map

    map.on('load', async () => {
      try {
        hideBasemapNoise(map)

        setLoadingStage(LoadingStage.LOADING_PLOTS)
        await loadPlotData(map)

        setLoadingStage(LoadingStage.LOADING_OVERLAYS)
        await loadOverlays(map)

        setupInteractions(map)
        buildAndAddNamedRoads(map)

        setReady()
      } catch (err) {
        console.error('Error loading map data:', err)
        setLoadingError(err.message)
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // --- Helper functions ---

  function hideBasemapNoise(map) {
    const style = map.getStyle()
    if (!style?.layers) return
    const keepVisible = new Set(['background', 'water'])
    for (const layer of style.layers) {
      if (!keepVisible.has(layer.id)) {
        try { map.setLayoutProperty(layer.id, 'visibility', 'none') } catch (e) {}
      }
    }
  }

  function computePlotCounts(features) {
    const counts = {}
    for (const f of features) {
      const sym = f.properties?.symbology
      if (!sym) continue
      const group = SYMBOLOGY_GROUP_MAP[sym]
      if (group) counts[group] = (counts[group] || 0) + 1
    }
    setPlotCounts(counts)
  }

  async function loadPlotData(map) {
    try {
      setLoadingStage(LoadingStage.LOADING_PLOTS)
      const response = await fetch('/data/plots_wgs84.geojson')
      if (!response.ok) throw new Error('plots_wgs84.geojson not found')

      const data = await response.json()
      setLoadingStage(LoadingStage.RENDERING_PLOTS)
      plotsDataRef.current = data

      const segIndex = buildRoadSegmentIndex(data.features)
      roadSegmentIndexRef.current = segIndex
      computePlotCounts(data.features)

      map.addSource('plots', { type: 'geojson', data, generateId: true })
      map.addLayer(getPlotFillLayer())
      map.addLayer(getPlotOutlineLayer())
      map.addLayer(getPlotHighlightLayer())
      map.addLayer(getRoadModeOverlayLayer())
    } catch (err) {
      console.error('Failed to load plots GeoJSON:', err)
      setLoadingStage(LoadingStage.LOADING_VILLAGES)
      await loadPlotsByVillage(map)
    }
  }

  async function loadPlotsByVillage(map) {
    try {
      const indexRes = await fetch('/data/village_index.json')
      const villageIndex = await indexRes.json()
      const villages = Object.entries(villageIndex).sort((a, b) => b[1].count - a[1].count)

      const allFeatures = []
      for (const [key, info] of villages) {
        try {
          const res = await fetch(`/data/${info.file}`)
          const data = await res.json()
          allFeatures.push(...data.features)
        } catch (e) {
          console.warn(`Failed to load ${info.file}:`, e)
        }
      }

      setLoadingStage(LoadingStage.RENDERING)
      const plotsGeo = { type: 'FeatureCollection', features: allFeatures }
      plotsDataRef.current = plotsGeo

      const segIndex = buildRoadSegmentIndex(allFeatures)
      roadSegmentIndexRef.current = segIndex
      computePlotCounts(allFeatures)

      map.addSource('plots', { type: 'geojson', data: plotsGeo, generateId: true })
      map.addLayer(getPlotFillLayer())
      map.addLayer(getPlotOutlineLayer())
      map.addLayer(getPlotHighlightLayer())
      map.addLayer(getRoadModeOverlayLayer())
    } catch (err) {
      console.error('Failed to load village data:', err)
      throw err
    }
  }

  async function loadOverlays(map) {
    try {
      const res = await fetch(DATA_PATHS.allocatedLands)
      if (!res.ok) return
      const data = await res.json()
      map.addSource('allocated_lands', { type: 'geojson', data })
      map.addLayer(getAllocatedLandsFillLayer())
      map.addLayer(getAllocatedLandsOutlineLayer())
      map.addLayer(getAllocatedLandsLabelsLayer())
    } catch (err) {
      console.warn('Failed to load allocated lands:', err)
    }
  }

  function buildNamedRoadsData(plotFeatures) {
    let roadNames = {}
    try { roadNames = JSON.parse(localStorage.getItem('roadNames') || '{}') } catch (e) {}

    let unnamedKeys = new Set()
    try { unnamedKeys = new Set(JSON.parse(localStorage.getItem('roadUnnamed') || '[]')) } catch (e) {}

    const segmentFeatures = []
    const byName = {}
    const { keyToId } = roadSegmentIndexRef.current

    for (let i = 0; i < plotFeatures.length; i++) {
      const f = plotFeatures[i]
      const props = f.properties || {}
      if (!ROAD_RESERVE_SYMBOLOGIES.has(props.symbology)) continue
      const stableKey = getStableRoadKey(f.geometry)
      if (!stableKey || unnamedKeys.has(stableKey)) continue

      const segId = keyToId.get(stableKey)
      let name = (segId != null && SEGMENT_TO_ROAD[segId]) || roadNames[stableKey] || null
      if (!name?.trim()) continue
      name = name.trim()
      const roadCategory = getRoadType(name) || 'other'
      const centroid = computeCentroid(f.geometry)

      segmentFeatures.push({
        type: 'Feature', id: stableKey, geometry: f.geometry,
        properties: { roadName: name, roadCategory },
      })

      if (!byName[name]) byName[name] = { centroids: [], bbox: [Infinity, Infinity, -Infinity, -Infinity] }
      if (centroid) {
        byName[name].centroids.push(centroid)
        const [lon, lat] = centroid
        const b = byName[name].bbox
        byName[name].bbox = [Math.min(b[0], lon), Math.min(b[1], lat), Math.max(b[2], lon), Math.max(b[3], lat)]
      }
    }

    // Gap-fill: chain-based expansion
    const mappedKeys = new Set(segmentFeatures.map(f => f.id))
    const CORRIDOR_TOL = 0.002
    const MAX_GAP_DEG = 0.003
    const MIN_AREA_SQYD = 500

    const unmappedRoadFeats = []
    for (let i = 0; i < plotFeatures.length; i++) {
      const f = plotFeatures[i]
      if (!ROAD_RESERVE_SYMBOLOGIES.has(f.properties?.symbology)) continue
      const sk = getStableRoadKey(f.geometry)
      if (!sk || mappedKeys.has(sk) || unnamedKeys.has(sk)) continue
      const centroid = computeCentroid(f.geometry)
      if (!centroid) continue
      const areaSqYd = parseFloat(f.properties?.alloted_ex) || 0
      if (areaSqYd > 0 && areaSqYd < MIN_AREA_SQYD) continue
      unmappedRoadFeats.push({ idx: i, sk, centroid, geometry: f.geometry })
    }

    for (const [roadName, meta] of Object.entries(byName)) {
      const bb = meta.bbox
      if (bb[0] === Infinity) continue
      const isN = roadName.startsWith('N')
      const fixedCoord = isN ? (bb[0] + bb[2]) / 2 : (bb[1] + bb[3]) / 2
      const chainCentroids = [...meta.centroids]

      let added = true
      while (added) {
        added = false
        for (const uf of unmappedRoadFeats) {
          if (mappedKeys.has(uf.sk)) continue
          const [cx, cy] = uf.centroid
          const dist = isN ? Math.abs(cx - fixedCoord) : Math.abs(cy - fixedCoord)
          if (dist > CORRIDOR_TOL) continue

          let closeEnough = false
          for (const cc of chainCentroids) {
            if (Math.abs(cx - cc[0]) < MAX_GAP_DEG && Math.abs(cy - cc[1]) < MAX_GAP_DEG) {
              closeEnough = true
              break
            }
          }
          if (!closeEnough) continue

          segmentFeatures.push({
            type: 'Feature', id: uf.sk, geometry: uf.geometry,
            properties: { roadName, roadCategory: getRoadType(roadName) || 'other' },
          })
          mappedKeys.add(uf.sk)
          chainCentroids.push(uf.centroid)
          meta.centroids.push(uf.centroid)
          added = true
        }
      }
    }

    const junctionMatrix = buildJunctionMatrix(segmentFeatures)
    const labelFeatures = []
    const index = []
    for (const [roadName, meta] of Object.entries(byName)) {
      const cents = meta.centroids
      const center = cents.length
        ? [cents.reduce((s, c) => s + c[0], 0) / cents.length, cents.reduce((s, c) => s + c[1], 0) / cents.length]
        : [80.5, 16.505]
      const bbox = meta.bbox[0] === Infinity ? null : meta.bbox
      labelFeatures.push({ type: 'Feature', properties: { roadName }, geometry: { type: 'Point', coordinates: center } })
      index.push({ name: roadName, center, bbox, meets: junctionMatrix[roadName] || [] })
    }

    return {
      segments: { type: 'FeatureCollection', features: segmentFeatures },
      labels: { type: 'FeatureCollection', features: labelFeatures },
      index,
    }
  }

  function buildAndAddNamedRoads(map) {
    const plotsData = plotsDataRef.current
    if (!plotsData?.features?.length) return
    const { segments, labels, index } = buildNamedRoadsData(plotsData.features)

    if (!map.getSource('namedRoads')) {
      map.addSource('namedRoads', { type: 'geojson', data: segments, generateId: true })
      map.addSource('namedRoadLabels', { type: 'geojson', data: labels })
    } else {
      map.getSource('namedRoads').setData(segments)
      map.getSource('namedRoadLabels').setData(labels)
    }

    if (!map.getLayer(LAYERS.NAMED_ROADS_FILL)) {
      map.addLayer(getNamedRoadsFillLayer())
      map.addLayer(getNamedRoadsOutlineLayer())
      map.addLayer(getNamedRoadsHighlightLayer())
      map.addLayer(getNamedRoadsLabelsLayer())
    }

    setNamedRoadsIndex(index)
  }

  function refreshNamedRoads() {
    const map = mapRef.current
    const plotsData = plotsDataRef.current
    if (!map || !map.getSource('namedRoads') || !plotsData?.features) return
    const { segments, labels, index } = buildNamedRoadsData(plotsData.features)
    map.getSource('namedRoads').setData(segments)
    map.getSource('namedRoadLabels').setData(labels)
    setNamedRoadsIndex(index)
  }

  // Store refreshNamedRoads on the store for external access
  useEffect(() => {
    useMapStore.setState({ _refreshNamedRoads: refreshNamedRoads })
  }, [])

  function processRoadClick(map, roadFeature) {
    map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], roadFeature.id])
    const props = { ...roadFeature.properties }

    if (!props.lat || props.lat === 'N/A' || !props.lon || props.lon === 'N/A') {
      const centroid = computeCentroid(roadFeature.geometry)
      if (centroid) { props.lat = centroid[1]; props.lon = centroid[0] }
    }

    let locKey = null, segmentId = null
    if (roadFeature.id != null) {
      const originalFeature = plotsDataRef.current?.features?.[roadFeature.id]
      if (originalFeature) {
        locKey = getStableRoadKey(originalFeature.geometry)
        segmentId = locKey ? (roadSegmentIndexRef.current.keyToId.get(locKey) ?? null) : null
      }
    }
    if (!locKey) {
      locKey = getStableRoadKey(roadFeature.geometry)
      segmentId = locKey ? (roadSegmentIndexRef.current.keyToId.get(locKey) ?? null) : null
    }

    let savedName = (segmentId != null && SEGMENT_TO_ROAD[segmentId]) || null
    if (!savedName && locKey) {
      try { savedName = JSON.parse(localStorage.getItem('roadNames') || '{}')[locKey] || null } catch (e) {}
    }

    let inferredName = null
    if (!savedName) {
      const centroid = props.lat && props.lon ? [parseFloat(props.lon), parseFloat(props.lat)] : null
      if (centroid) {
        const namedSrc = map.getSource('namedRoads')
        if (namedSrc) {
          try {
            const namedData = namedSrc._data || namedSrc.serialize?.()?.data
            if (namedData?.features) {
              const roadBboxes = {}
              for (const nf of namedData.features) {
                const rn = nf.properties?.roadName
                if (!rn) continue
                if (!roadBboxes[rn]) roadBboxes[rn] = [Infinity, Infinity, -Infinity, -Infinity]
                const nc = computeCentroid(nf.geometry)
                if (!nc) continue
                const bb = roadBboxes[rn]
                roadBboxes[rn] = [Math.min(bb[0], nc[0]), Math.min(bb[1], nc[1]), Math.max(bb[2], nc[0]), Math.max(bb[3], nc[1])]
              }
              for (const [rn, bb] of Object.entries(roadBboxes)) {
                const isN = rn.startsWith('N')
                const [cx, cy] = centroid
                if (isN) {
                  if (Math.abs(cx - (bb[0] + bb[2]) / 2) < 0.001 && cy >= bb[1] - 0.003 && cy <= bb[3] + 0.003) { inferredName = rn; break }
                } else {
                  if (Math.abs(cy - (bb[1] + bb[3]) / 2) < 0.001 && cx >= bb[0] - 0.003 && cx <= bb[2] + 0.003) { inferredName = rn; break }
                }
              }
            }
          } catch (e) {}
        }
      }
    }

    let isUnnamed = false
    if (locKey) {
      try { isUnnamed = JSON.parse(localStorage.getItem('roadUnnamed') || '[]').includes(locKey) } catch (e) {}
    }

    props._type = 'road'
    props._locKey = locKey
    props._segmentId = segmentId
    props._roadName = isUnnamed ? null : savedName
    props._inferredRoadName = isUnnamed ? null : inferredName
    props._isUnnamed = isUnnamed
    selectPlot(props)
  }

  function setupInteractions(map) {
    let hoveredId = null

    map.on('click', (e) => {
      if (roadModeRef.current) {
        const tolerance = 10
        const bbox = [[e.point.x - tolerance, e.point.y - tolerance], [e.point.x + tolerance, e.point.y + tolerance]]
        let roadFeatures = map.queryRenderedFeatures(bbox, { layers: [LAYERS.ROAD_MODE_OVERLAY] })
        if (!roadFeatures.length) {
          const plotFeatures = map.queryRenderedFeatures(bbox, { layers: [LAYERS.PLOTS_FILL] })
          roadFeatures = plotFeatures.filter(f => ROAD_RESERVE_SYMBOLOGIES.has(f.properties?.symbology))
        }
        if (roadFeatures.length > 0) processRoadClick(map, roadFeatures[0])
        return
      }

      const features = map.queryRenderedFeatures(e.point, { layers: [LAYERS.PLOTS_FILL] })
      if (features?.length > 0) {
        const plotFeature = features.find(f => !ROAD_RESERVE_SYMBOLOGIES.has(f.properties.symbology))
        const roadFeature = features.find(f => ROAD_RESERVE_SYMBOLOGIES.has(f.properties.symbology))
        if (plotFeature) {
          map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], plotFeature.id])
          selectPlot(plotFeature.properties)
        } else if (roadFeature) {
          processRoadClick(map, roadFeature)
        }
      }
    })

    map.on('mousemove', (e) => {
      const layers = [LAYERS.PLOTS_FILL]
      if (roadModeRef.current) layers.push(LAYERS.ROAD_MODE_OVERLAY)
      const features = map.queryRenderedFeatures(e.point, { layers })
      if (features?.length > 0) {
        map.getCanvas().style.cursor = 'pointer'
        hoveredId = features[0].id
      } else {
        map.getCanvas().style.cursor = ''
        hoveredId = null
      }
    })
  }

  // --- Effects ---

  // Color mode + zoning filter
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded() || !map.getLayer(LAYERS.PLOTS_FILL)) return
    if (colorMode === 'area') {
      map.setPaintProperty(LAYERS.PLOTS_FILL, 'fill-color', buildAreaHeatmapExpression())
    } else {
      map.setPaintProperty(LAYERS.PLOTS_FILL, 'fill-color', buildFilteredColorExpression(activeZoningGroups))
    }
  }, [activeZoningGroups, colorMode])

  // Allocated lands visibility
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const visibility = allocatedLandsVisible ? 'visible' : 'none'
    for (const id of [LAYERS.ALLOCATED_LANDS, LAYERS.ALLOCATED_LANDS_OUTLINE, LAYERS.ALLOCATED_LANDS_LABELS]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility)
    }
  }, [allocatedLandsVisible])

  // Road mode overlay
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    if (map.getLayer(LAYERS.ROAD_MODE_OVERLAY)) {
      map.setLayoutProperty(LAYERS.ROAD_MODE_OVERLAY, 'visibility', roadMode ? 'visible' : 'none')
    }
  }, [roadMode])

  // Named-only mode
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const plotLayers = [LAYERS.PLOTS_FILL, LAYERS.PLOTS_OUTLINE, LAYERS.ALLOCATED_LANDS, LAYERS.ALLOCATED_LANDS_OUTLINE, LAYERS.ALLOCATED_LANDS_LABELS]
    for (const id of plotLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showNamedOnly ? 'none' : 'visible')
    }
  }, [showNamedOnly])

  // Selected plot highlight
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    if (selectedPlot?._type === 'namedRoad') {
      if (map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], -1])
      if (map.getLayer(LAYERS.NAMED_ROADS_HIGHLIGHT)) {
        map.setFilter(LAYERS.NAMED_ROADS_HIGHLIGHT, ['==', ['get', 'roadName'], selectedPlot.name])
        if (selectedPlot.bbox?.length === 4) {
          try { map.fitBounds(selectedPlot.bbox, { padding: 80, duration: 1200, maxZoom: 17 }) } catch (e) {}
        }
      }
    } else {
      if (map.getLayer(LAYERS.NAMED_ROADS_HIGHLIGHT)) map.setFilter(LAYERS.NAMED_ROADS_HIGHLIGHT, ['==', ['get', 'roadName'], ''])
      if (!selectedPlot && map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) {
        map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], -1])
      }
    }
  }, [selectedPlot])

  return <div ref={containerRef} className="map-container" />
}
