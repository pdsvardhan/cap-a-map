import React, { useState, useCallback, useRef } from 'react'
import MapContainer from './components/Map/MapContainer'
import SearchBar from './components/Search/SearchBar'
import PlotDetailPanel from './components/PlotDetail/PlotDetailPanel'
import Legend from './components/Legend/Legend'
import LoadingScreen from './components/LoadingScreen'
import SegmentIdFlash from './components/SegmentIdFlash'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState('Initializing map...')
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [showLegend, setShowLegend] = useState(false)
  const [roadMode, setRoadMode] = useState(false)
  const [flashSegmentId, setFlashSegmentId] = useState(null)
  const [namedRoadsIndex, setNamedRoadsIndex] = useState([])
  const [activeZoningGroups, setActiveZoningGroups] = useState(null)
  const [plotCounts, setPlotCounts] = useState({})
  const [allocatedLandsVisible, setAllocatedLandsVisible] = useState(true)

  const mapRef = useRef(null)

  const handleMapReady = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handlePlotClick = useCallback((plotData) => {
    setSelectedPlot(plotData)
    if (plotData._segmentId != null) {
      setFlashSegmentId(plotData._segmentId)
    }
  }, [])

  const handleSearchSelect = useCallback((result) => {
    const map = mapRef.current?.getMap?.()
    if (map && result.la != null && result.lo != null) {
      map.flyTo({
        center: [result.lo, result.la],
        zoom: result._type === 'landmark' ? 16 : result._type === 'namedRoad' ? 15 : 18,
        duration: 1500,
      })
    }

    if (result._type === 'landmark') {
      setSelectedPlot({
        _type: 'landmark',
        name: result.nm,
        category: result.cat,
        lat: result.la,
        lon: result.lo,
      })
    } else if (result._type === 'namedRoad') {
      setSelectedPlot({
        _type: 'namedRoad',
        name: result.name,
        bbox: result.bbox,
      })
    } else {
      setSelectedPlot({
        regcode: result.rc,
        plot_code: result.pc,
        village: result.vi,
        symbology: result.sy,
        alloted_ex: result.ae,
        lat: result.la,
        lon: result.lo,
      })
    }
  }, [])

  const handleRoadNameSaved = useCallback(() => {
    mapRef.current?.refreshNamedRoads?.()
  }, [])

  const handleAllocatedLandsToggle = useCallback(() => {
    setAllocatedLandsVisible(prev => !prev)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedPlot(null)
  }, [])

  return (
    <div className="relative w-full h-full">
      {/* Loading Screen */}
      {isLoading && (
        <LoadingScreen status={loadingStatus} />
      )}

      {/* Map */}
      <MapContainer
        ref={mapRef}
        onMapReady={handleMapReady}
        onPlotClick={handlePlotClick}
        onLoadingStatus={setLoadingStatus}
        selectedPlot={selectedPlot}
        onNamedRoadsIndexReady={setNamedRoadsIndex}
        roadMode={roadMode}
        activeZoningGroups={activeZoningGroups}
        allocatedLandsVisible={allocatedLandsVisible}
        onPlotCountsReady={setPlotCounts}
      />

      {/* Top Bar: Search + Controls */}
      {!isLoading && (
        <div className="absolute top-4 left-4 right-4 z-10 flex items-start gap-3">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <SearchBar onSelect={handleSearchSelect} namedRoadsIndex={namedRoadsIndex} />
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className={`px-3 py-2.5 rounded-lg shadow-md text-sm font-medium transition-colors ${
                showLegend
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Toggle legend"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Legend
              </span>
            </button>
            <button
              onClick={() => setRoadMode(!roadMode)}
              className={`px-3 py-2.5 rounded-lg shadow-md text-sm font-medium transition-colors ${
                roadMode
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Road Mode - highlight and click only road reserves"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Roads
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Legend Panel */}
      {showLegend && !isLoading && (
        <Legend
          onClose={() => setShowLegend(false)}
          activeZoningGroups={activeZoningGroups}
          onActiveZoningGroupsChange={setActiveZoningGroups}
          plotCounts={plotCounts}
          allocatedLandsVisible={allocatedLandsVisible}
          onAllocatedLandsToggle={handleAllocatedLandsToggle}
        />
      )}

      {/* Plot Detail Panel */}
      {selectedPlot && selectedPlot._type !== 'namedRoad' && (
        <PlotDetailPanel
          plot={selectedPlot}
          onClose={handleCloseDetail}
          onRoadNameSaved={handleRoadNameSaved}
          namedRoadsIndex={namedRoadsIndex}
        />
      )}

      {/* Segment ID Flash (Road Mode) */}
      {flashSegmentId != null && (
        <SegmentIdFlash
          segmentId={flashSegmentId}
          onDone={() => setFlashSegmentId(null)}
        />
      )}
    </div>
  )
}
