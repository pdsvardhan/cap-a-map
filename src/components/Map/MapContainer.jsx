import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import { MAP_CENTER, MAP_ZOOM, MAP_MIN_ZOOM, MAP_MAX_ZOOM, MAP_STYLE, DATA_PATHS, LAYERS } from '../../utils/constants'
import { buildSymbologyColorExpression, ROAD_RESERVE_SYMBOLOGIES } from '../../utils/colors'

const MapContainer = forwardRef(function MapContainer(
  { onMapReady, onPlotClick, onLoadingStatus, layerVisibility, selectedPlot },
  ref
) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const loadedSourcesRef = useRef(new Set())
  const hoveredPlotRef = useRef(null)

  useImperativeHandle(ref, () => mapInstanceRef.current)

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

  async function loadPlotData(map) {
    onLoadingStatus?.('Loading village index...')

    try {
      onLoadingStatus?.('Loading all plots (this may take a moment)...')

      const response = await fetch('/data/plots_wgs84.geojson')
      if (!response.ok) throw new Error('plots_wgs84.geojson not found')

      const data = await response.json()
      onLoadingStatus?.(`Loaded ${data.features.length.toLocaleString()} plots, rendering...`)

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

      map.addSource('plots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: allFeatures },
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

      loadedSourcesRef.current.add('plots')
    } catch (err) {
      console.error('Failed to load village data:', err)
    }
  }

  async function loadOverlays(map) {
    const overlays = [
      {
        key: 'boundaries',
        url: DATA_PATHS.boundaries,
        layers: [
          {
            id: LAYERS.BOUNDARIES,
            type: 'line',
            paint: {
              'line-color': '#FF5722',
              'line-width': 2,
              'line-dasharray': [4, 4],
              'line-opacity': 0.7,
            },
          },
        ],
      },
      {
        key: 'roads',
        url: DATA_PATHS.roads,
        layers: [
          {
            id: LAYERS.ROADS,
            type: 'line',
            paint: {
              'line-color': '#78909C',
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 14, 2, 18, 4],
              'line-opacity': 0.8,
            },
          },
        ],
      },
      {
        key: 'burial_grounds',
        url: DATA_PATHS.burialGrounds,
        layers: [
          {
            id: LAYERS.BURIAL_GROUNDS,
            type: 'fill',
            paint: { 'fill-color': '#FF0000', 'fill-opacity': 0.4 },
          },
        ],
      },
      {
        key: 'allocated_lands',
        url: DATA_PATHS.allocatedLands,
        layers: [
          {
            id: LAYERS.ALLOCATED_LANDS,
            type: 'fill',
            paint: { 'fill-color': '#FF6F00', 'fill-opacity': 0.5 },
          },
          {
            id: LAYERS.ALLOCATED_LANDS_OUTLINE,
            type: 'line',
            paint: { 'line-color': '#E65100', 'line-width': 2 },
          },
          {
            id: LAYERS.ALLOCATED_LANDS_LABELS,
            type: 'symbol',
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
          },
        ],
      },
    ]

    for (const overlay of overlays) {
      try {
        const res = await fetch(overlay.url)
        if (!res.ok) continue
        const data = await res.json()

        map.addSource(overlay.key, {
          type: 'geojson',
          data: data,
        })

        for (const layerDef of overlay.layers) {
          map.addLayer({
            id: layerDef.id,
            type: layerDef.type,
            source: overlay.key,
            paint: layerDef.paint || {},
            layout: layerDef.layout || {},
          })
        }

        loadedSourcesRef.current.add(overlay.key)
      } catch (err) {
        console.warn(`Failed to load overlay ${overlay.key}:`, err)
      }
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

  function setupInteractions(map) {
    // Click on plot — handle both regular plots and road reserves (U2/SU2)
    map.on('click', LAYERS.PLOTS_FILL, (e) => {
      if (e.features && e.features.length > 0) {
        // Try to find a non-road-reserve feature first
        const plotFeature = e.features.find(f => !ROAD_RESERVE_SYMBOLOGIES.has(f.properties.symbology))

        if (plotFeature) {
          // Regular plot click (unchanged)
          map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], plotFeature.id])
          onPlotClick?.(plotFeature.properties)
        } else {
          // Road reserve click — all features at this point are U2/SU2
          const roadFeature = e.features[0]
          map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], roadFeature.id])
          const props = { ...roadFeature.properties }

          // Compute centroid if lat/lon missing
          if (!props.lat || props.lat === 'N/A' || !props.lon || props.lon === 'N/A') {
            const centroid = computeCentroid(roadFeature.geometry)
            if (centroid) {
              props.lat = centroid[1]
              props.lon = centroid[0]
            }
          }

          // Use MapLibre auto-generated feature id as storage key (unique per feature)
          const locKey = roadFeature.id != null ? String(roadFeature.id) : null

          // Check localStorage for saved road name
          let savedName = null
          if (locKey) {
            try {
              const roadNames = JSON.parse(localStorage.getItem('roadNames') || '{}')
              savedName = roadNames[locKey] || null
            } catch (err) { /* ignore parse errors */ }
          }

          props._type = 'road'
          props._locKey = locKey
          props._roadName = savedName
          onPlotClick?.(props)
        }
      }
    })

    map.on('mouseenter', LAYERS.PLOTS_FILL, () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', LAYERS.PLOTS_FILL, () => {
      map.getCanvas().style.cursor = ''
    })

    map.on('mousemove', LAYERS.PLOTS_FILL, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        if (hoveredPlotRef.current !== feature.id) {
          hoveredPlotRef.current = feature.id
        }
      }
    })
  }

  // Handle layer visibility changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !map.isStyleLoaded()) return

    const layerMapping = {
      allocatedLands: [LAYERS.ALLOCATED_LANDS, LAYERS.ALLOCATED_LANDS_OUTLINE, LAYERS.ALLOCATED_LANDS_LABELS],
      roads: [LAYERS.ROADS],
      burialGrounds: [LAYERS.BURIAL_GROUNDS],
      boundaries: [LAYERS.BOUNDARIES],
    }

    for (const [key, layerIds] of Object.entries(layerMapping)) {
      const visibility = layerVisibility[key] ? 'visible' : 'none'
      for (const layerId of layerIds) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility)
        }
      }
    }
  }, [layerVisibility])

  // Handle selected plot highlight
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !map.isStyleLoaded() || !map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) return

    if (selectedPlot && (selectedPlot.regcode || selectedPlot._type === 'road')) {
      // Highlight is set on click in setupInteractions
    } else {
      map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], -1])
    }
  }, [selectedPlot])

  return (
    <div ref={mapContainerRef} className="map-container" />
  )
})

export default MapContainer
