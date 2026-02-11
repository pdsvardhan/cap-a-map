import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { MAP_CENTER, MAP_ZOOM, MAP_MIN_ZOOM, MAP_MAX_ZOOM, MAP_STYLE, DATA_PATHS, LAYERS } from '../../utils/constants'
import { buildSymbologyColorExpression } from '../../utils/colors'

const MapContainer = forwardRef(function MapContainer(
  { onMapReady, onPlotClick, onLoadingStatus, layerVisibility, selectedPlot },
  ref
) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const loadedSourcesRef = useRef(new Set())
  const hoveredPlotRef = useRef(null)

  // Expose map instance to parent via ref
  useImperativeHandle(ref, () => mapInstanceRef.current, [])

  // Initialize map
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

    // Add attribution in bottom-right
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    // Add scale bar
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 150 }), 'bottom-left')

    mapInstanceRef.current = map

    map.on('load', async () => {
      try {
        // Load plot data
        onLoadingStatus?.('Loading plot data...')
        await loadPlotData(map)

        // Load overlay layers
        onLoadingStatus?.('Loading overlays...')
        await loadOverlays(map)

        // Set up interactions
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

  // Load plot data as GeoJSON source (per-village loading)
  async function loadPlotData(map) {
    onLoadingStatus?.('Loading village index...')

    // Load the main plots GeoJSON
    const plotsUrl = DATA_PATHS.plotsTiles.replace('.pmtiles', '').replace('/data/plots', '/data/plots_wgs84.geojson')

    try {
      // First try loading the full GeoJSON
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

      // Plot fill layer - color-coded by symbology
      map.addLayer({
        id: LAYERS.PLOTS_FILL,
        type: 'fill',
        source: 'plots',
        paint: {
          'fill-color': buildSymbologyColorExpression(),
          'fill-opacity': [
            'interpolate', ['linear'], ['zoom'],
            10, 0.4,
            14, 0.6,
            18, 0.7,
          ],
        },
      })

      // Plot outline layer
      map.addLayer({
        id: LAYERS.PLOTS_OUTLINE,
        type: 'line',
        source: 'plots',
        paint: {
          'line-color': '#555555',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            10, 0,
            14, 0.3,
            16, 0.5,
            18, 1,
          ],
          'line-opacity': 0.5,
        },
      })

      // Highlight layer for selected/hovered plot
      map.addLayer({
        id: LAYERS.PLOTS_HIGHLIGHT,
        type: 'line',
        source: 'plots',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 3,
          'line-opacity': 1,
        },
        filter: ['==', ['id'], -1], // Initially hidden
      })

      loadedSourcesRef.current.add('plots')
    } catch (err) {
      console.error('Failed to load plots GeoJSON:', err)
      onLoadingStatus?.('Error loading plots data. Trying village-by-village...')

      // Fallback: load per-village
      await loadPlotsByVillage(map)
    }
  }

  // Fallback: load plots by village
  async function loadPlotsByVillage(map) {
    try {
      const indexRes = await fetch('/data/village_index.json')
      const villageIndex = await indexRes.json()

      const villages = Object.entries(villageIndex)
        .sort((a, b) => b[1].count - a[1].count)

      // Load the largest villages first
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
        data: {
          type: 'FeatureCollection',
          features: allFeatures,
        },
        generateId: true,
      })

      // Same layers as above
      map.addLayer({
        id: LAYERS.PLOTS_FILL,
        type: 'fill',
        source: 'plots',
        paint: {
          'fill-color': buildSymbologyColorExpression(),
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 14, 0.6, 18, 0.7],
        },
      })

      map.addLayer({
        id: LAYERS.PLOTS_OUTLINE,
        type: 'line',
        source: 'plots',
        paint: {
          'line-color': '#555555',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0, 14, 0.3, 16, 0.5, 18, 1],
          'line-opacity': 0.5,
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

  // Load overlay layers
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
            paint: { 'fill-color': '#5D4037', 'fill-opacity': 0.6 },
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
              'text-color': '#BF360C',
              'text-halo-color': '#FFFFFF',
              'text-halo-width': 1.5,
            },
          },
        ],
      },
      // Water bodies loaded LAST so they render on top of plots & other overlays
      // P3-Protected zone plots beneath appear green; water bodies must dominate visually
      {
        key: 'waterbodies',
        url: DATA_PATHS.waterbodies,
        layers: [
          {
            id: LAYERS.WATERBODIES_FILL,
            type: 'fill',
            paint: { 'fill-color': '#42A5F5', 'fill-opacity': 0.85 },
          },
          {
            id: LAYERS.WATERBODIES_OUTLINE,
            type: 'line',
            paint: { 'line-color': '#1565C0', 'line-width': 2.5, 'line-opacity': 0.9 },
          },
          {
            id: LAYERS.WATERBODIES_LABELS,
            type: 'symbol',
            layout: {
              'text-field': ['get', 'village'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 12, 18, 14],
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            },
            paint: {
              'text-color': '#0D47A1',
              'text-halo-color': '#FFFFFF',
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

  // Set up map interactions
  function setupInteractions(map) {
    // Click on plot
    map.on('click', LAYERS.PLOTS_FILL, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        const props = feature.properties

        // Highlight the clicked plot
        map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], feature.id])

        onPlotClick?.(props)
      }
    })

    // Hover cursor
    map.on('mouseenter', LAYERS.PLOTS_FILL, () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', LAYERS.PLOTS_FILL, () => {
      map.getCanvas().style.cursor = ''
    })

    // Hover highlight
    map.on('mousemove', LAYERS.PLOTS_FILL, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        if (hoveredPlotRef.current !== feature.id) {
          hoveredPlotRef.current = feature.id

          // Show a tooltip with basic info
          const props = feature.properties
          const tooltipContent = `
            <div style="padding: 8px 12px; font-size: 12px;">
              <div style="font-weight: 600;">${props.regcode || 'N/A'}</div>
              <div style="color: #666;">${props.village || ''} • ${props.symbology || ''}</div>
            </div>
          `

          // We could add a popup here, but for performance we'll skip it
          // and rely on the click panel instead
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
      waterbodies: [LAYERS.WATERBODIES_FILL, LAYERS.WATERBODIES_OUTLINE, LAYERS.WATERBODIES_LABELS],
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

    if (selectedPlot && selectedPlot.regcode) {
      // We can't easily filter by regcode with generateId, so we keep the current highlight
      // The highlight is set on click in setupInteractions
    } else {
      map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], -1])
    }
  }, [selectedPlot])

  return (
    <div ref={mapContainerRef} className="map-container" />
  )
})

export default MapContainer
