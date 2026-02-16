import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import { MAP_CENTER, MAP_ZOOM, MAP_MIN_ZOOM, MAP_MAX_ZOOM, MAP_STYLE, DATA_PATHS, LAYERS, NAMED_ROAD_COLORS, NAMED_ROAD_OUTLINES } from '../../utils/constants'
import { getRoadType, normalizeRoadName } from '../../utils/roadAttributes'
import { buildSymbologyColorExpression, buildFilteredColorExpression, ROAD_RESERVE_SYMBOLOGIES, SYMBOLOGY_GROUP_MAP } from '../../utils/colors'
import { buildJunctionMatrix } from '../../utils/junctionMatrix'
import { SEGMENT_TO_ROAD } from '../../utils/roadSegmentMapping'

const MapContainer = forwardRef(function MapContainer(
  { onMapReady, onPlotClick, onLoadingStatus, selectedPlot, onNamedRoadsIndexReady, roadMode, activeZoningGroups, allocatedLandsVisible, onPlotCountsReady },
  ref
) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const loadedSourcesRef = useRef(new Set())
  const hoveredPlotRef = useRef(null)
  const plotsDataRef = useRef(null)
  const roadModeRef = useRef(false)
  const roadSegmentIndexRef = useRef({ segments: [], keyToId: new Map() })

  useImperativeHandle(ref, () => ({
    getMap: () => mapInstanceRef.current,
    refreshNamedRoads: () => {
      const map = mapInstanceRef.current
      const plotsData = plotsDataRef.current
      if (!map || !map.getSource('namedRoads') || !plotsData?.features) return
      const { segments, labels, index } = buildNamedRoadsData(plotsData.features)
      map.getSource('namedRoads').setData(segments)
      map.getSource('namedRoadLabels').setData(labels)
      onNamedRoadsIndexReady?.(index)
    },
  }))

  useEffect(() => {
    if (mapInstanceRef.current) return

    onLoadingStatus?.('Initializing map...')

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
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

    mapInstanceRef.current = map

    map.on('load', async () => {
      try {
        // Hide all basemap noise — keep only background + water fills
        hideBasemapNoise(map)

        onLoadingStatus?.('Loading plot data...')
        await loadPlotData(map)

        onLoadingStatus?.('Loading overlays...')
        await loadOverlays(map)

        setupInteractions(map)
        addNamedRoadsLayers(map)

        onLoadingStatus?.('Ready!')
        onMapReady?.()
      } catch (err) {
        console.error('Error loading map data:', err)
        onLoadingStatus?.(`Error: ${err.message}`)
      }
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  function hideBasemapNoise(map) {
    // Nuclear approach: hide ALL basemap layers except essentials.
    // The CARTO Dark Matter basemap has ~80 layers (roads, boundaries,
    // waterways, railways, buildings, labels, etc.) that create visual
    // noise under our plot data. Instead of enumerating layers to hide
    // (which breaks when naming changes), we hide everything and only
    // keep the dark background and water body fills.
    const style = map.getStyle()
    if (!style || !style.layers) return

    const keepVisible = new Set([
      'background',     // dark background color
      'water',          // ocean/lake polygon fills
    ])

    for (const layer of style.layers) {
      if (!keepVisible.has(layer.id)) {
        try {
          map.setLayoutProperty(layer.id, 'visibility', 'none')
        } catch (e) {
          // Some layers may not support visibility changes
        }
      }
    }
  }

  function computePlotCounts(features) {
    const counts = {}
    for (const f of features) {
      const sym = f.properties?.symbology
      if (!sym) continue
      const group = SYMBOLOGY_GROUP_MAP[sym]
      if (group) {
        counts[group] = (counts[group] || 0) + 1
      }
    }
    onPlotCountsReady?.(counts)
  }

  function buildRoadSegmentIndex(features) {
    const roadSegs = []
    for (let i = 0; i < features.length; i++) {
      const f = features[i]
      if (!ROAD_RESERVE_SYMBOLOGIES.has(f.properties?.symbology)) continue
      const centroid = computeCentroid(f.geometry)
      const stableKey = getStableRoadKey(f.geometry)
      roadSegs.push({ featureIndex: i, stableKey, centroid })
    }
    // Sort south->north, then west->east for spatially stable IDs
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
    roadSegmentIndexRef.current = { segments: roadSegs, keyToId }
    console.log(`Road segment index: ${roadSegs.length} segments indexed`)
  }

  async function loadPlotData(map) {
    onLoadingStatus?.('Loading village index...')

    try {
      onLoadingStatus?.('Loading all plots (this may take a moment)...')

      const response = await fetch('/data/plots_wgs84.geojson')
      if (!response.ok) throw new Error('plots_wgs84.geojson not found')

      const data = await response.json()
      onLoadingStatus?.(`Loaded ${data.features.length.toLocaleString()} plots, rendering...`)
      plotsDataRef.current = data
      buildRoadSegmentIndex(data.features)
      computePlotCounts(data.features)

      map.addSource('plots', {
        type: 'geojson',
        data: data,
        generateId: true,
      })

      map.addLayer({
        id: LAYERS.PLOTS_FILL,
        type: 'fill',
        source: 'plots',
        paint: {
          'fill-color': buildSymbologyColorExpression(),
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            10, 0.6,
            14, 0.75,
            18, 0.85,
          ],
        },
      })

      map.addLayer({
        id: LAYERS.PLOTS_OUTLINE,
        type: 'line',
        source: 'plots',
        paint: {
          'line-color': '#1A1A1A',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            10, 0,
            13, 0.3,
            15, 0.8,
            17, 1.2,
            19, 1.8,
          ],
          'line-opacity': 0.9,
        },
      })

      map.addLayer({
        id: LAYERS.PLOTS_HIGHLIGHT,
        type: 'line',
        source: 'plots',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 3,
          'line-opacity': 1,
        },
        filter: ['==', ['id'], -1],
      })

      // Road Mode overlay — highlights all road reserves when Road Mode is active
      map.addLayer({
        id: LAYERS.ROAD_MODE_OVERLAY,
        type: 'fill',
        source: 'plots',
        paint: {
          'fill-color': '#FF8C00',
          'fill-opacity': 0.35,
        },
        filter: [
          'any',
          ['==', ['get', 'symbology'], 'U2 - Road reserve zone'],
          ['==', ['get', 'symbology'], 'U2- Road reserve zone'],
          ['==', ['get', 'symbology'], 'SU2 - Road Network'],
        ],
        layout: { visibility: 'none' },
      })

      loadedSourcesRef.current.add('plots')
    } catch (err) {
      console.error('Failed to load plots GeoJSON:', err)
      onLoadingStatus?.('Error loading plots data. Trying village-by-village...')
      await loadPlotsByVillage(map)
    }
  }

  async function loadPlotsByVillage(map) {
    try {
      const indexRes = await fetch('/data/village_index.json')
      const villageIndex = await indexRes.json()

      const villages = Object.entries(villageIndex)
        .sort((a, b) => b[1].count - a[1].count)

      let totalLoaded = 0
      const allFeatures = []

      for (const [key, info] of villages) {
        onLoadingStatus?.(`Loading ${info.name} (${info.count} plots)...`)
        try {
          const res = await fetch(`/data/${info.file}`)
          const data = await res.json()
          allFeatures.push(...data.features)
          totalLoaded += data.features.length
        } catch (e) {
          console.warn(`Failed to load ${info.file}:`, e)
        }
      }

      onLoadingStatus?.(`Rendering ${totalLoaded.toLocaleString()} plots...`)
      const plotsGeo = { type: 'FeatureCollection', features: allFeatures }
      plotsDataRef.current = plotsGeo
      buildRoadSegmentIndex(allFeatures)
      computePlotCounts(allFeatures)

      map.addSource('plots', {
        type: 'geojson',
        data: plotsGeo,
        generateId: true,
      })

      map.addLayer({
        id: LAYERS.PLOTS_FILL,
        type: 'fill',
        source: 'plots',
        paint: {
          'fill-color': buildSymbologyColorExpression(),
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 0.75, 18, 0.85],
        },
      })

      map.addLayer({
        id: LAYERS.PLOTS_OUTLINE,
        type: 'line',
        source: 'plots',
        paint: {
          'line-color': '#1A1A1A',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0, 13, 0.3, 15, 0.8, 17, 1.2, 19, 1.8],
          'line-opacity': 0.9,
        },
      })

      map.addLayer({
        id: LAYERS.PLOTS_HIGHLIGHT,
        type: 'line',
        source: 'plots',
        paint: { 'line-color': '#FFFFFF', 'line-width': 3, 'line-opacity': 1 },
        filter: ['==', ['id'], -1],
      })

      map.addLayer({
        id: LAYERS.ROAD_MODE_OVERLAY,
        type: 'fill',
        source: 'plots',
        paint: { 'fill-color': '#FF8C00', 'fill-opacity': 0.35 },
        filter: [
          'any',
          ['==', ['get', 'symbology'], 'U2 - Road reserve zone'],
          ['==', ['get', 'symbology'], 'U2- Road reserve zone'],
          ['==', ['get', 'symbology'], 'SU2 - Road Network'],
        ],
        layout: { visibility: 'none' },
      })

      loadedSourcesRef.current.add('plots')
    } catch (err) {
      console.error('Failed to load village data:', err)
    }
  }

  async function loadOverlays(map) {
    // Only load allocated lands — legacy overlays (roads, burial grounds, boundaries) removed
    try {
      const res = await fetch(DATA_PATHS.allocatedLands)
      if (!res.ok) return
      const data = await res.json()

      map.addSource('allocated_lands', {
        type: 'geojson',
        data: data,
      })

      map.addLayer({
        id: LAYERS.ALLOCATED_LANDS,
        type: 'fill',
        source: 'allocated_lands',
        paint: { 'fill-color': '#FF6F00', 'fill-opacity': 0.5 },
      })
      map.addLayer({
        id: LAYERS.ALLOCATED_LANDS_OUTLINE,
        type: 'line',
        source: 'allocated_lands',
        paint: { 'line-color': '#E65100', 'line-width': 2 },
      })
      map.addLayer({
        id: LAYERS.ALLOCATED_LANDS_LABELS,
        type: 'symbol',
        source: 'allocated_lands',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 8, 16, 12, 18, 14],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#333333',
          'text-halo-width': 1.5,
        },
      })

      loadedSourcesRef.current.add('allocated_lands')
    } catch (err) {
      console.warn('Failed to load allocated lands overlay:', err)
    }
  }

  function computeCentroid(geometry) {
    // Simple average of polygon exterior ring coordinates
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

  /**
   * Stable key for a road segment from its geometry (centroid + area).
   * Same polygon always gets the same key, so names persist across reloads
   * even if GeoJSON feature order or MapLibre ids change.
   */
  function getStableRoadKey(geometry) {
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
    return `${centroid[0].toFixed(6)}_${centroid[1].toFixed(6)}_${area.toFixed(2)}`
  }

  /**
   * Build Named Roads data from plots: segments with saved names (localStorage),
   * one label point per unique name (centroid of segments), and search index.
   * N3a and N3b stay separate (different names). Same name = one label, merged visually by style.
   */
  function buildNamedRoadsData(plotFeatures) {
    let roadNames = {}
    try {
      roadNames = JSON.parse(localStorage.getItem('roadNames') || '{}')
    } catch (e) { /* ignore */ }

    // Migrate old "lat,lon" format keys to new "lon_lat_area" format
    const oldLatLonKeys = Object.keys(roadNames).filter(k => /^\d+\.\d+,\d+\.\d+$/.test(k))
    let migrated = false
    if (oldLatLonKeys.length > 0) {
      // Build a lookup of road reserve centroids -> stableKey
      const centroidToStable = new Map()
      for (const f of plotFeatures) {
        if (!ROAD_RESERVE_SYMBOLOGIES.has(f.properties?.symbology)) continue
        const sk = getStableRoadKey(f.geometry)
        if (!sk) continue
        const centroid = computeCentroid(f.geometry)
        if (!centroid) continue
        // Round to 4 decimals for fuzzy matching with old keys
        const approxKey = `${centroid[1].toFixed(4)},${centroid[0].toFixed(4)}`
        centroidToStable.set(approxKey, sk)
      }
      for (const oldKey of oldLatLonKeys) {
        const name = roadNames[oldKey]
        if (!name?.trim()) { delete roadNames[oldKey]; migrated = true; continue }
        // oldKey is "lat,lon" with ~4 decimal places
        const approx = oldKey.split(',').map(v => parseFloat(v).toFixed(4)).join(',')
        const stableKey = centroidToStable.get(approx)
        if (stableKey && !roadNames[stableKey]) {
          roadNames[stableKey] = name.trim()
        }
        delete roadNames[oldKey]
        migrated = true
      }
    }

    const segmentFeatures = []
    const byName = {} // name -> { centroids: [], bbox: [minLon, minLat, maxLon, maxLat] }

    const { keyToId } = roadSegmentIndexRef.current

    for (let i = 0; i < plotFeatures.length; i++) {
      const f = plotFeatures[i]
      const props = f.properties || {}
      if (!ROAD_RESERVE_SYMBOLOGIES.has(props.symbology)) continue
      const stableKey = getStableRoadKey(f.geometry)
      if (!stableKey) continue

      // Name priority: mapping file > localStorage
      const segId = keyToId.get(stableKey)
      let name = (segId != null && SEGMENT_TO_ROAD[segId]) || null
      if (!name) name = roadNames[stableKey] || null
      if (!name || !name.trim()) {
        const oldKey = String(i)
        if (roadNames[oldKey] && roadNames[oldKey].trim()) {
          name = roadNames[oldKey].trim()
          roadNames[stableKey] = name
          delete roadNames[oldKey]
          migrated = true
        } else continue
      } else {
        name = name.trim()
      }
      const roadName = name
      const roadCategory = getRoadType(roadName) || 'other'

      const centroid = computeCentroid(f.geometry)
      segmentFeatures.push({
        type: 'Feature',
        id: stableKey,
        geometry: f.geometry,
        properties: { roadName, roadCategory },
      })

      if (!byName[roadName]) {
        byName[roadName] = { centroids: [], bbox: [Infinity, Infinity, -Infinity, -Infinity] }
      }
      if (centroid) {
        byName[roadName].centroids.push(centroid)
        const [lon, lat] = centroid
        const b = byName[roadName].bbox
        byName[roadName].bbox = [
          Math.min(b[0], lon),
          Math.min(b[1], lat),
          Math.max(b[2], lon),
          Math.max(b[3], lat),
        ]
      }
    }

    if (migrated) {
      try {
        localStorage.setItem('roadNames', JSON.stringify(roadNames))
      } catch (e) { /* ignore */ }
    }

    const junctionMatrix = buildJunctionMatrix(segmentFeatures)

    const labelFeatures = []
    const index = []
    for (const [roadName, meta] of Object.entries(byName)) {
      const cents = meta.centroids
      const center = cents.length
        ? [
            cents.reduce((s, c) => s + c[0], 0) / cents.length,
            cents.reduce((s, c) => s + c[1], 0) / cents.length,
          ]
        : [80.5, 16.505]
      const bbox = meta.bbox[0] === Infinity ? null : meta.bbox
      labelFeatures.push({
        type: 'Feature',
        properties: { roadName },
        geometry: { type: 'Point', coordinates: center },
      })
      index.push({
        name: roadName,
        center,
        bbox,
        meets: junctionMatrix[roadName] || [],
      })
    }

    const segments = {
      type: 'FeatureCollection',
      features: segmentFeatures,
    }
    const labels = {
      type: 'FeatureCollection',
      features: labelFeatures,
    }
    return { segments, labels, index }
  }

  function addNamedRoadsLayers(map) {
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
      map.addLayer({
        id: LAYERS.NAMED_ROADS_FILL,
        type: 'fill',
        source: 'namedRoads',
        paint: {
          'fill-color': [
            'match', ['get', 'roadCategory'],
            'arterial', NAMED_ROAD_COLORS['arterial'],
            'major arterial', NAMED_ROAD_COLORS['major arterial'],
            'seed access', NAMED_ROAD_COLORS['seed access'],
            'sub-arterial', NAMED_ROAD_COLORS['sub-arterial'],
            NAMED_ROAD_COLORS['other'],
          ],
          'fill-opacity': 0.9,
        },
      })
      map.addLayer({
        id: LAYERS.NAMED_ROADS_OUTLINE,
        type: 'line',
        source: 'namedRoads',
        paint: {
          'line-color': [
            'match', ['get', 'roadCategory'],
            'arterial', NAMED_ROAD_OUTLINES['arterial'],
            'major arterial', NAMED_ROAD_OUTLINES['major arterial'],
            'seed access', NAMED_ROAD_OUTLINES['seed access'],
            'sub-arterial', NAMED_ROAD_OUTLINES['sub-arterial'],
            NAMED_ROAD_OUTLINES['other'],
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 2.5, 19, 4],
          'line-opacity': 1,
        },
      })
      map.addLayer({
        id: LAYERS.NAMED_ROADS_HIGHLIGHT,
        type: 'line',
        source: 'namedRoads',
        paint: {
          'line-color': '#FFEB3B',
          'line-width': 4,
          'line-opacity': 1,
        },
        filter: ['==', ['get', 'roadName'], ''],
      })
      map.addLayer({
        id: LAYERS.NAMED_ROADS_LABELS,
        type: 'symbol',
        source: 'namedRoadLabels',
        layout: {
          'text-field': ['get', 'roadName'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 13, 17, 16],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-letter-spacing': 0.05,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': 'rgba(0,0,0,0.9)',
          'text-halo-width': 2,
        },
      })
      loadedSourcesRef.current.add('namedRoads')
      loadedSourcesRef.current.add('namedRoadLabels')
    }

    onNamedRoadsIndexReady?.(index)
  }

  function processRoadClick(map, roadFeature) {
    map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], roadFeature.id])
    const props = { ...roadFeature.properties }

    if (!props.lat || props.lat === 'N/A' || !props.lon || props.lon === 'N/A') {
      const centroid = computeCentroid(roadFeature.geometry)
      if (centroid) {
        props.lat = centroid[1]
        props.lon = centroid[0]
      }
    }

    let locKey = getStableRoadKey(roadFeature.geometry)
    let segmentId = locKey ? (roadSegmentIndexRef.current.keyToId.get(locKey) ?? null) : null

    // Fallback: use original GeoJSON geometry if rendered geometry key doesn't match
    if (segmentId == null && roadFeature.id != null) {
      const originalFeature = plotsDataRef.current?.features?.[roadFeature.id]
      if (originalFeature) {
        const origKey = getStableRoadKey(originalFeature.geometry)
        segmentId = origKey ? (roadSegmentIndexRef.current.keyToId.get(origKey) ?? null) : null
        if (segmentId != null) locKey = origKey
      }
    }

    // Name priority: mapping file > localStorage
    let savedName = null
    if (segmentId != null && SEGMENT_TO_ROAD[segmentId]) {
      savedName = SEGMENT_TO_ROAD[segmentId]
    }
    if (!savedName && locKey) {
      try {
        const roadNames = JSON.parse(localStorage.getItem('roadNames') || '{}')
        savedName = roadNames[locKey] || null
      } catch (err) { /* ignore */ }
    }

    props._type = 'road'
    props._locKey = locKey
    props._segmentId = segmentId
    props._roadName = savedName
    onPlotClick?.(props)
  }

  function setupInteractions(map) {
    // General click handler for map
    map.on('click', (e) => {
      if (roadModeRef.current) {
        // Road Mode: use expanded bounding box query on the ROAD_MODE_OVERLAY layer
        // This fixes thin road polygons being unclickable at high zoom levels
        const tolerance = 10 // pixels
        const bbox = [
          [e.point.x - tolerance, e.point.y - tolerance],
          [e.point.x + tolerance, e.point.y + tolerance],
        ]
        // Query the road mode overlay first (visible orange fill)
        let roadFeatures = map.queryRenderedFeatures(bbox, { layers: [LAYERS.ROAD_MODE_OVERLAY] })
        // Fallback: also check the plots-fill layer for road reserves
        if (!roadFeatures.length) {
          const plotFeatures = map.queryRenderedFeatures(bbox, { layers: [LAYERS.PLOTS_FILL] })
          roadFeatures = plotFeatures.filter(f => ROAD_RESERVE_SYMBOLOGIES.has(f.properties?.symbology))
        }
        if (roadFeatures.length > 0) {
          processRoadClick(map, roadFeatures[0])
        }
        return
      }

      // Normal mode: query the plots-fill layer at the click point
      const features = map.queryRenderedFeatures(e.point, { layers: [LAYERS.PLOTS_FILL] })
      if (features && features.length > 0) {
        const plotFeature = features.find(f => !ROAD_RESERVE_SYMBOLOGIES.has(f.properties.symbology))
        const roadFeature = features.find(f => ROAD_RESERVE_SYMBOLOGIES.has(f.properties.symbology))

        if (plotFeature) {
          map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], plotFeature.id])
          onPlotClick?.(plotFeature.properties)
        } else if (roadFeature) {
          processRoadClick(map, roadFeature)
        }
      }
    })

    map.on('mousemove', (e) => {
      // Check if hovering over any interactive layer
      const layers = [LAYERS.PLOTS_FILL]
      if (roadModeRef.current) layers.push(LAYERS.ROAD_MODE_OVERLAY)
      const features = map.queryRenderedFeatures(e.point, { layers })
      if (features && features.length > 0) {
        map.getCanvas().style.cursor = 'pointer'
        if (features[0].id !== hoveredPlotRef.current) {
          hoveredPlotRef.current = features[0].id
        }
      } else {
        map.getCanvas().style.cursor = ''
        hoveredPlotRef.current = null
      }
    })
  }

  // Handle zoning filter changes — update plot fill colors
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !map.isStyleLoaded()) return
    if (!map.getLayer(LAYERS.PLOTS_FILL)) return
    const expr = buildFilteredColorExpression(activeZoningGroups)
    map.setPaintProperty(LAYERS.PLOTS_FILL, 'fill-color', expr)
  }, [activeZoningGroups])

  // Handle allocated lands visibility toggle
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !map.isStyleLoaded()) return
    const visibility = allocatedLandsVisible ? 'visible' : 'none'
    for (const layerId of [LAYERS.ALLOCATED_LANDS, LAYERS.ALLOCATED_LANDS_OUTLINE, LAYERS.ALLOCATED_LANDS_LABELS]) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibility)
      }
    }
  }, [allocatedLandsVisible])

  // Sync roadMode prop to ref (for click handler) and toggle overlay
  useEffect(() => {
    roadModeRef.current = !!roadMode
    const map = mapInstanceRef.current
    if (!map || !map.isStyleLoaded()) return
    if (map.getLayer(LAYERS.ROAD_MODE_OVERLAY)) {
      map.setLayoutProperty(LAYERS.ROAD_MODE_OVERLAY, 'visibility', roadMode ? 'visible' : 'none')
    }
    // Dev helper: log segment index when road mode activates
    if (roadMode && roadSegmentIndexRef.current.segments.length > 0) {
      console.log(`Road Mode ON — ${roadSegmentIndexRef.current.segments.length} segments. Use console: roadSegmentIndexRef`)
    }
  }, [roadMode])

  // Handle selected plot / named road highlight
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !map.isStyleLoaded()) return

    if (selectedPlot?._type === 'namedRoad') {
      if (map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], -1])
      if (map.getLayer(LAYERS.NAMED_ROADS_HIGHLIGHT)) {
        map.setFilter(LAYERS.NAMED_ROADS_HIGHLIGHT, ['==', ['get', 'roadName'], selectedPlot.name])
        const bbox = selectedPlot.bbox
        if (bbox && bbox.length === 4) {
          try {
            map.fitBounds(bbox, { padding: 80, duration: 1200, maxZoom: 17 })
          } catch (e) { /* ignore */ }
        }
      }
    } else {
      if (map.getLayer(LAYERS.NAMED_ROADS_HIGHLIGHT)) map.setFilter(LAYERS.NAMED_ROADS_HIGHLIGHT, ['==', ['get', 'roadName'], ''])
      if (selectedPlot && (selectedPlot.regcode || selectedPlot._type === 'road') && map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) {
        // Highlight is set on click in setupInteractions
      } else if (map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) {
        map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], -1])
      }
    }
  }, [selectedPlot])

  return (
    <div ref={mapContainerRef} className="map-container" />
  )
})

export default MapContainer
