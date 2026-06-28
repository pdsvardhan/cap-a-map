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
  getAllocatedLandsFillLayer, getAllocatedLandsOutlineLayer, getAllocatedLandsLabelsLayer,
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
        await loadAllocated(map)

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

      if (!map.getLayer(LAYERS.PLOTS_FILL)) return
      const feats = map.queryRenderedFeatures(e.point, { layers: [LAYERS.PLOTS_FILL] })
      if (!feats.length) return
      const f = feats[0]
      map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['get', 'pid'], f.properties.pid])
      store.selectPlot(f.properties)
    })

    map.on('mousemove', (e) => {
      const layers = existing(allocatedRef.current ? [LAYERS.ALLOCATED_LANDS, LAYERS.PLOTS_FILL] : [LAYERS.PLOTS_FILL])
      if (!layers.length) { map.getCanvas().style.cursor = ''; return }
      const feats = map.queryRenderedFeatures(e.point, { layers })
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

  // selected-plot highlight
  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer?.(LAYERS.PLOTS_HIGHLIGHT)) return
    const pid = (selectedPlot && selectedPlot.pid != null) ? selectedPlot.pid : -1
    map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['get', 'pid'], pid])
  }, [selectedPlot])

  return <div ref={containerRef} className="map-container" />
}
