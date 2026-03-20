import React, { useRef, useCallback } from "react"
import useMapStore, { LoadingStage } from "./stores/mapStore"
import MapContainer from "./components/Map/MapContainer"
import SearchBar from "./components/Search/SearchBar"
import PlotDetailPanel from "./components/PlotDetail/PlotDetailPanel"
import Legend from "./components/Legend/Legend"
import LoadingScreen from "./components/LoadingScreen"
import SegmentIdFlash from "./components/SegmentIdFlash"
import ErrorBoundary from "./components/ErrorBoundary"

// Bridge: map old MapContainer status strings to LoadingStage enum
function statusToStage(status) {
  if (!status) return LoadingStage.INIT
  const s = status.toLowerCase()
  if (s.includes("initializ")) return LoadingStage.INIT
  if (s.includes("village index")) return LoadingStage.LOADING_VILLAGES
  if (s.includes("loading") && (s.includes("plot") || s.includes("village"))) return LoadingStage.LOADING_PLOTS
  if (s.includes("overlay") || s.includes("allocated")) return LoadingStage.LOADING_OVERLAYS
  if (s.includes("rendering") || s.includes("render")) return LoadingStage.RENDERING
  if (s.includes("ready") || s.includes("complete")) return LoadingStage.READY
  if (s.includes("error")) return LoadingStage.ERROR
  return LoadingStage.RENDERING
}

export default function App() {
  const mapRef = useRef(null)

  const isLoading = useMapStore((s) => s.isLoading)
  const selectedPlot = useMapStore((s) => s.selectedPlot)
  const showLegend = useMapStore((s) => s.showLegend)
  const roadMode = useMapStore((s) => s.roadMode)
  const showNamedOnly = useMapStore((s) => s.showNamedOnly)
  const flashSegmentId = useMapStore((s) => s.flashSegmentId)
  const colorMode = useMapStore((s) => s.colorMode)
  const activeZoningGroups = useMapStore((s) => s.activeZoningGroups)
  const allocatedLandsVisible = useMapStore((s) => s.allocatedLandsVisible)
  const namedRoadsIndex = useMapStore((s) => s.namedRoadsIndex)
  const plotCounts = useMapStore((s) => s.plotCounts)

  const toggleLegend = useMapStore((s) => s.toggleLegend)
  const toggleRoadMode = useMapStore((s) => s.toggleRoadMode)
  const toggleNamedOnly = useMapStore((s) => s.toggleNamedOnly)
  const clearPlot = useMapStore((s) => s.clearPlot)
  const clearFlash = useMapStore((s) => s.clearFlash)
  const setColorMode = useMapStore((s) => s.setColorMode)
  const setActiveZoningGroups = useMapStore((s) => s.setActiveZoningGroups)

  // Bridge callbacks: old MapContainer props -> Zustand store
  const handleLoadingStatus = useCallback((status) => {
    const stage = statusToStage(status)
    useMapStore.getState().setLoadingStage(stage)
    if (status && status.toLowerCase().includes("error")) {
      useMapStore.getState().setLoadingError(status)
    }
  }, [])

  const handleMapReady = useCallback(() => {
    useMapStore.getState().setReady()
    if (mapRef.current) {
      useMapStore.getState().setMapInstance(mapRef.current.getMap())
    }
  }, [])

  const handlePlotClick = useCallback((plot) => {
    useMapStore.getState().selectPlot(plot)
  }, [])

  const handleNamedRoadsIndexReady = useCallback((index) => {
    useMapStore.getState().setNamedRoadsIndex(index)
  }, [])

  const handlePlotCountsReady = useCallback((counts) => {
    useMapStore.getState().setPlotCounts(counts)
  }, [])

  const handleRoadNameSaved = useCallback(() => {
    if (mapRef.current && mapRef.current.refreshNamedRoads) {
      mapRef.current.refreshNamedRoads()
    }
  }, [])

  return (
    <ErrorBoundary>
      <div className="relative w-full h-full">
        {isLoading && <LoadingScreen />}

        <MapContainer
          ref={mapRef}
          onMapReady={handleMapReady}
          onPlotClick={handlePlotClick}
          onLoadingStatus={handleLoadingStatus}
          selectedPlot={selectedPlot}
          onNamedRoadsIndexReady={handleNamedRoadsIndexReady}
          roadMode={roadMode}
          activeZoningGroups={activeZoningGroups}
          allocatedLandsVisible={allocatedLandsVisible}
          onPlotCountsReady={handlePlotCountsReady}
          colorMode={colorMode}
          showNamedOnly={showNamedOnly}
        />

        {!isLoading && (
          <div className="absolute top-4 left-4 right-4 z-10 flex items-start gap-3">
            <div className="flex-1 max-w-lg">
              <SearchBar />
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleLegend}
                className={`px-3 py-2.5 rounded-lg shadow-md text-sm font-medium transition-colors ${
                  showLegend ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                aria-label="Toggle zoning legend"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Legend
                </span>
              </button>
              <button
                onClick={toggleRoadMode}
                className={`px-3 py-2.5 rounded-lg shadow-md text-sm font-medium transition-colors ${
                  roadMode ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                aria-label="Toggle road mode"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Roads
                </span>
              </button>
              <button
                onClick={toggleNamedOnly}
                className={`px-3 py-2.5 rounded-lg shadow-md text-sm font-medium transition-colors ${
                  showNamedOnly ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                aria-label="Toggle grid road view"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Grid
                </span>
              </button>
            </div>
          </div>
        )}

        {showLegend && !isLoading && (
          <Legend
            onClose={toggleLegend}
            activeZoningGroups={activeZoningGroups}
            onActiveZoningGroupsChange={setActiveZoningGroups}
            plotCounts={plotCounts}
            allocatedLandsVisible={allocatedLandsVisible}
            onAllocatedLandsToggle={() => useMapStore.getState().toggleAllocatedLands()}
            colorMode={colorMode}
            onColorModeChange={setColorMode}
          />
        )}

        {selectedPlot && selectedPlot._type !== "namedRoad" && (
          <PlotDetailPanel
            plot={selectedPlot}
            onClose={clearPlot}
            namedRoadsIndex={namedRoadsIndex}
            onRoadNameSaved={handleRoadNameSaved}
          />
        )}

        {flashSegmentId != null && (
          <SegmentIdFlash segmentId={flashSegmentId} onDone={clearFlash} />
        )}
      </div>
    </ErrorBoundary>
  )
}
