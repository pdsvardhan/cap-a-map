import React, { useState, useCallback, useRef } from 'react'
import MapContainer from './components/Map/MapContainer'
import SearchBar from './components/Search/SearchBar'
import PlotDetailPanel from './components/PlotDetail/PlotDetailPanel'
import Legend from './components/Legend/Legend'
import LayerControls from './components/Legend/LayerControls'
import LoadingScreen from './components/LoadingScreen'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState('Initializing map...')
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [showLegend, setShowLegend] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [layerVisibility, setLayerVisibility] = useState({
    allocatedLands: true,
    roads: true,
    waterbodies: true,
    burialGrounds: true,
    boundaries: false,
    surveyParcels: false,
  })

  const mapRef = useRef(null)

  const handleMapReady = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handlePlotClick = useCallback((plotData) => {
    setSelectedPlot(plotData)
  }, [])

  const handleSearchSelect = useCallback((result) => {
    // Fly to the selected plot
    if (mapRef.current && result.la && result.lo) {
      mapRef.current.flyTo({
        center: [result.lo, result.la],
        zoom: 18,
        duration: 1500,
      })
    }
    // Set selected plot data from search result
    setSelectedPlot({
      regcode: result.rc,
      plot_code: result.pc,
      farmer_n: result.fn,
      village: result.vi,
      township: result.tw,
      sector: result.se,
      block: result.bl,
      colony: result.co,
      symbology: result.sy,
      alloted_ex: result.ae,
      lat: result.la,
      lon: result.lo,
    })
  }, [])

  const handleLayerToggle = useCallback((layerKey) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }))
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
        layerVisibility={layerVisibility}
        selectedPlot={selectedPlot}
      />

      {/* Top Bar: Search + Controls */}
      {!isLoading && (
        <div className="absolute top-4 left-4 right-4 z-10 flex items-start gap-3">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <SearchBar onSelect={handleSearchSelect} />
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="bg-white px-3 py-2.5 rounded-lg shadow-md hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
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
              onClick={() => setShowLayers(!showLayers)}
              className="bg-white px-3 py-2.5 rounded-lg shadow-md hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              title="Toggle layers"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Layers
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Legend Panel */}
      {showLegend && !isLoading && (
        <Legend onClose={() => setShowLegend(false)} />
      )}

      {/* Layer Controls Panel */}
      {showLayers && !isLoading && (
        <LayerControls
          layerVisibility={layerVisibility}
          onToggle={handleLayerToggle}
          onClose={() => setShowLayers(false)}
        />
      )}

      {/* Plot Detail Panel */}
      {selectedPlot && (
        <PlotDetailPanel
          plot={selectedPlot}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  )
}
