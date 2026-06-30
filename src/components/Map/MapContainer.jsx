import React, { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import useMapStore, { LoadingStage } from '../../stores/mapStore'
import { MAP_CENTER, MAP_ZOOM, MAP_MIN_ZOOM, MAP_MAX_ZOOM, MAP_STYLE, DATA_PATHS, LAYERS } from '../../utils/constants'
import {
  buildFilteredColorExpression, buildAreaHeatmapExpression, categorizeAllocatedLand,
} from '../../utils/colors'
import {
  getPlotFillLayer, getPlotOutlineLayer, getPlotHighlightLayer, getRoadModeOverlayLayer,
  getWaterFillLayer,
  getAllocatedLandsFillLayer, getAllocatedLandsOutlineLayer, getAllocatedLandsLabelsLayer,
  getNamedRoadsCasingLayer, getNamedRoadsLineLayer, getNamedRoadsMarkingLayer,
  getNamedRoadsHighlightLayer, getNamedRoadsLabelsLayer,
} from './utils/layerDefinitions'

// PMTiles protocol is global; register once across mounts.
let pmtilesRegistered = false

export default function MapContainer() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  const roadMode = useMapStore((s) => s.roadMode)
  const activeZoningGroups = useMapStore((s) => s.activeZoningGroups)
  const allocatedLandsVisible = useMapStore((s) => s.allocatedLandsVisible)
  const colorMode = useMapStore((s) => s.colorMode)
  const selectedPlot = useMapStore((s) => s.selectedPlot)

  // mutable mirrors for use inside map event handlers
  const allocatedRef = useRef(allocatedLandsVisible)
  useEffect(() => { allocatedRef.current = allocatedLandsVisible }, [allocatedLandsVisible])

  // --- Init map (once) ---
  useEffect(() => {
    if (mapRef.current) return
    const store = useMapStore.getState()
    store.setLoadingStage(LoadingStage.INIT)

    if (!pmtilesRegistered) {
      maplibregl.addProtocol('pmtiles', new Protocol().tile)
      pmtilesRegistered = true
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
      // dev-only: lets the comment tool capture the WebGL canvas via toDataURL
      preserveDrawingBuffer: import.meta.env.DEV,
    })
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 140 }), 'bottom-left')
    mapRef.current = map
    store.setMapInstance(map)
    map.on('error', (e) => console.error('[maplibre]', e?.error?.message || e))

    map.on('load', async () => {
      try {
        hideBasemapNoise(map)

        // Precomputed counts (client can't tally vector tiles)
        store.setLoadingStage(LoadingStage.LOADING_INDEX)
        try {
          const meta = await fetch(DATA_PATHS.meta).then((r) => r.json())
          if (meta?.zoning_group_counts) store.setPlotCounts(meta.zoning_group_counts)
        } catch (e) { /* non-fatal */ }

        // Plots vector source (PMTiles)
        store.setLoadingStage(LoadingStage.LOADING_PLOTS)
        map.addSource('plots', {
          type: 'vector',
          url: `pmtiles://${window.location.origin}${DATA_PATHS.plotsTiles}`,
          promoteId: 'pid',
        })
        map.addLayer(getPlotFillLayer())
        map.addLayer(getPlotOutlineLayer())
        map.addLayer(getRoadModeOverlayLayer())
        map.addLayer(getPlotHighlightLayer())

        store.setLoadingStage(LoadingStage.LOADING_OVERLAYS)
        await loadWater(map)
        await loadAllocated(map)
        await loadNamedRoads(map)

        setupInteractions(map)
        store.setLoadingStage(LoadingStage.RENDERING)

        // Ready when the PLOTS tiles are loaded (the actual content). Do NOT
        // gate on full-map 'idle' — a slow/broken overlay source blocks it.
        const markReady = () => useMapStore.getState().setReady()
        if (map.isSourceLoaded('plots')) markReady()
        else {
          const onData = (e) => {
            if (e.sourceId === 'plots' && map.isSourceLoaded('plots')) {
              map.off('sourcedata', onData)
              markReady()
            }
          }
          map.on('sourcedata', onData)
        }
        setTimeout(markReady, 8000) // safety net
      } catch (err) {
        console.error('Map load error:', err)
        useMapStore.getState().setLoadingError(err.message || 'Failed to load map')
      }
    })

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // --- Helpers ---
  function hideBasemapNoise(map) {
    const style = map.getStyle()
    if (!style?.layers) return
    const keep = new Set(['background', 'water'])
    for (const layer of style.layers) {
      if (!keep.has(layer.id)) {
        try { map.setLayoutProperty(layer.id, 'visibility', 'none') } catch (e) { /* ignore */ }
      }
    }
  }

  async function loadWater(map) {
    try {
      const data = await fetch(DATA_PATHS.water).then((r) => (r.ok ? r.json() : null))
      if (!data) return
      map.addSource('water', { type: 'geojson', data })
      const before = map.getLayer(LAYERS.PLOTS_HIGHLIGHT) ? LAYERS.PLOTS_HIGHLIGHT : undefined
      map.addLayer(getWaterFillLayer(), before)
    } catch (e) { /* non-fatal */ }
  }

  async function loadAllocated(map) {
    try {
      const data = await fetch(DATA_PATHS.allocatedLands).then((r) => (r.ok ? r.json() : null))
      if (!data) return
      map.addSource('allocated_lands', { type: 'geojson', data })
      map.addLayer(getAllocatedLandsFillLayer())
      map.addLayer(getAllocatedLandsOutlineLayer())
      map.addLayer(getAllocatedLandsLabelsLayer())
    } catch (e) { /* non-fatal */ }
  }

  async function loadNamedRoads(map) {
    try {
      const [roads, index] = await Promise.all([
        fetch(DATA_PATHS.namedRoads).then((r) => (r.ok ? r.json() : null)),
        fetch(DATA_PATHS.namedRoadsIndex).then((r) => (r.ok ? r.json() : [])),
      ])
      if (!roads) return
      useMapStore.getState().setNamedRoadsIndex(index || [])
      const labels = {
        type: 'FeatureCollection',
        features: (index || []).map((r) => ({
          type: 'Feature', properties: { roadName: r.name }, geometry: { type: 'Point', coordinates: r.center },
        })),
      }
      map.addSource('namedRoads', { type: 'geojson', data: roads })
      map.addSource('namedRoadLabels', { type: 'geojson', data: labels })
      // z-order: white highlight halo (bottom) → casing → carriageway → dashed marking → labels
      map.addLayer(getNamedRoadsHighlightLayer())
      map.addLayer(getNamedRoadsCasingLayer())
      map.addLayer(getNamedRoadsLineLayer())
      map.addLayer(getNamedRoadsMarkingLayer())
      map.addLayer(getNamedRoadsLabelsLayer())
    } catch (e) { /* non-fatal */ }
  }

  function setupInteractions(map) {
    // only query layers that currently exist (avoids errors during load races)
    const existing = (ids) => ids.filter((id) => map.getLayer(id))

    map.on('click', (e) => {
      const store = useMapStore.getState()

      // allocated lands take precedence when visible
      if (allocatedRef.current && map.getLayer(LAYERS.ALLOCATED_LANDS)) {
        const hit = map.queryRenderedFeatures(e.point, { layers: [LAYERS.ALLOCATED_LANDS] })
        const labelled = hit.find((h) => h.properties?.label)
        if (labelled) {
          const label = labelled.properties.label
          store.selectPlot({
            _type: 'landmark', name: label,
            category: categorizeAllocatedLand(label),
            lat: e.lngLat.lat, lon: e.lngLat.lng,
          })
          if (map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['get', 'pid'], -1])
          return
        }
      }

      // named roads (overlay) take precedence over the plot beneath.
      // Lines are thin — query a small box around the click so they're easy to hit.
      if (map.getLayer(LAYERS.NAMED_ROADS_LINE)) {
        const p = e.point, box = [[p.x - 6, p.y - 6], [p.x + 6, p.y + 6]]
        const rd = map.queryRenderedFeatures(box, { layers: [LAYERS.NAMED_ROADS_LINE] })[0]
        if (rd) {
          const name = rd.properties.roadName
          const meta = useMapStore.getState().namedRoadsIndex.find((r) => r.name === name) || {}
          store.selectPlot({ _type: 'road', name, ...meta })
          if (map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['get', 'pid'], -1])
          if (meta.bbox?.length === 4) { try { map.fitBounds(meta.bbox, { padding: 90, duration: 900, maxZoom: 16 }) } catch (e2) { /* */ } }
          return
        }
      }

      if (!map.getLayer(LAYERS.PLOTS_FILL)) return
      const feats = map.queryRenderedFeatures(e.point, { layers: [LAYERS.PLOTS_FILL] })
      if (!feats.length) return
      const f = feats[0]
      map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['get', 'pid'], f.properties.pid])
      store.selectPlot(f.properties)
    })

    map.on('mousemove', (e) => {
      const ids = [LAYERS.NAMED_ROADS_LINE, LAYERS.PLOTS_FILL]
      if (allocatedRef.current) ids.unshift(LAYERS.ALLOCATED_LANDS)
      const layers = existing(ids)
      if (!layers.length) { map.getCanvas().style.cursor = ''; return }
      const p = e.point, box = [[p.x - 6, p.y - 6], [p.x + 6, p.y + 6]]
      const feats = map.queryRenderedFeatures(box, { layers })
      map.getCanvas().style.cursor = feats.length ? 'pointer' : ''
    })
  }

  // --- Reactive effects ---

  // zoning filter / area heatmap
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded?.() || !map.getLayer(LAYERS.PLOTS_FILL)) return
    map.setPaintProperty(
      LAYERS.PLOTS_FILL, 'fill-color',
      colorMode === 'area' ? buildAreaHeatmapExpression() : buildFilteredColorExpression(activeZoningGroups),
    )
  }, [activeZoningGroups, colorMode])

  // allocated lands visibility
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded?.()) return
    const vis = allocatedLandsVisible ? 'visible' : 'none'
    for (const id of [LAYERS.ALLOCATED_LANDS, LAYERS.ALLOCATED_LANDS_OUTLINE, LAYERS.ALLOCATED_LANDS_LABELS]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
  }, [allocatedLandsVisible])

  // road-reserve overlay (dev road mode)
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded?.() || !map.getLayer(LAYERS.ROAD_MODE_OVERLAY)) return
    map.setLayoutProperty(LAYERS.ROAD_MODE_OVERLAY, 'visibility', roadMode ? 'visible' : 'none')
  }, [roadMode])

  // selected highlight (plot or named road)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer(LAYERS.PLOTS_HIGHLIGHT)) {
      const pid = (selectedPlot && selectedPlot.pid != null) ? selectedPlot.pid : -1
      map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['get', 'pid'], pid])
    }
    if (map.getLayer(LAYERS.NAMED_ROADS_HIGHLIGHT)) {
      const roadName = selectedPlot?._type === 'road' ? selectedPlot.name : ' '
      map.setFilter(LAYERS.NAMED_ROADS_HIGHLIGHT, ['==', ['get', 'roadName'], roadName])
    }
  }, [selectedPlot])

  return <div ref={containerRef} className="map-container" />
}
