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

  useImperativeHandle(ref, () => mapInstanceRef.current, [])

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
            10, 0.4,
            14, 0.6,
            18, 0.7,
          ],
        },
      })

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

    // Load named roads (anchor-verified E/N arterial roads)
    try {
      const res = await fetch(DATA_PATHS.roadsNamed)
      if (res.ok) {
        const data = await res.json()
        if (data.features && data.features.length > 0) {
          map.addSource('roads_named', { type: 'geojson', data })

          map.addLayer({
            id: LAYERS.ROADS_NAMED,
            type: 'line',
            source: 'roads_named',
            paint: {
              'line-color': ['match', ['get', 'classification'],
                'arterial', '#FF6B00',
                'sub-arterial', '#FFD700',
                '#CCCCCC'
              ],
              'line-width': ['match', ['get', 'classification'],
                'arterial', 5,
                'sub-arterial', 3.5,
                2
              ],
              'line-opacity': 0.9,
            },
          })

          map.addLayer({
            id: LAYERS.ROADS_NAMED_LABELS,
            type: 'symbol',
            source: 'roads_named',
            layout: {
              'symbol-placement': 'line-center',
              'text-field': ['get', 'name'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 14, 18, 16],
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            },
            paint: {
              'text-color': '#FFFFFF',
              'text-halo-color': '#000000',
              'text-halo-width': 2,
            },
          })

          loadedSourcesRef.current.add('roads_named')
        }
      }
    } catch (err) {
      console.warn('Named roads not available:', err)
    }
  }

  function setupInteractions(map) {
    // Click on plot — skip road reserve zones (U2/SU2)
    map.on('click', LAYERS.PLOTS_FILL, (e) => {
      if (e.features && e.features.length > 0) {
        // Find first non-road-reserve feature
        const feature = e.features.find(f => !ROAD_RESERVE_SYMBOLOGIES.has(f.properties.symbology))
        if (!feature) return

        const props = feature.properties
        map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['id'], feature.id])
        onPlotClick?.(props)
      }
    })

    // Click on named road
    map.on('click', LAYERS.ROADS_NAMED, (e) => {
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties
        onPlotClick?.({
          _type: 'road',
          name: props.name,
          direction: props.direction,
          classification: props.classification,
          width_m: props.width_m,
          segments: props.segments,
        })
      }
    })

    map.on('mouseenter', LAYERS.PLOTS_FILL, () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', LAYERS.PLOTS_FILL, () => {
      map.getCanvas().style.cursor = ''
    })

    map.on('mouseenter', LAYERS.ROADS_NAMED, () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', LAYERS.ROADS_NAMED, () => {
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
      roadsNamed: [LAYERS.ROADS_NAMED, LAYERS.ROADS_NAMED_LABELS],
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
