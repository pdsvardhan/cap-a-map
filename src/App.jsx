import React from 'react'
import useMapStore from './stores/mapStore'
import MapContainer from './components/Map/MapContainer'
import SearchBar from './components/Search/SearchBar'
import PlotDetailPanel from './components/PlotDetail/PlotDetailPanel'
import Legend from './components/Legend/Legend'
import LoadingScreen from './components/LoadingScreen'
import ErrorBoundary from './components/ErrorBoundary'

// Internal road-naming tooling is gated behind ?dev — not part of the public app.
const DEV_TOOLS = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev')

export default function App() {
  const isLoading = useMapStore((s) => s.isLoading)
  const selectedPlot = useMapStore((s) => s.selectedPlot)
  const showLegend = useMapStore((s) => s.showLegend)
  const roadMode = useMapStore((s) => s.roadMode)
  const toggleLegend = useMapStore((s) => s.toggleLegend)
  const toggleRoadMode = useMapStore((s) => s.toggleRoadMode)
  const clearPlot = useMapStore((s) => s.clearPlot)

  const showPanel = selectedPlot && selectedPlot._type !== 'namedRoad'

  return (
    <ErrorBoundary>
      <div className="relative w-full h-full">
        {isLoading && <LoadingScreen />}

        <MapContainer />

        {!isLoading && (
          <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-3 sm:top-4 sm:left-4 sm:right-4 sm:flex-row sm:items-start">
            <div className="flex-1 sm:max-w-lg">
              <SearchBar />
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <TopButton onClick={toggleLegend} active={showLegend} label="Legend" />
              {DEV_TOOLS && (
                <TopButton onClick={toggleRoadMode} active={roadMode} activeClass="bg-orange-500 text-white hover:bg-orange-600" label="Roads (dev)" />
              )}
            </div>
          </div>
        )}

        {showLegend && !isLoading && <Legend />}

        {showPanel && <PlotDetailPanel plot={selectedPlot} onClose={clearPlot} />}
      </div>
    </ErrorBoundary>
  )
}

function TopButton({ onClick, active, label, activeClass = 'bg-gray-800 text-white hover:bg-gray-700' }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 rounded-lg shadow-md text-sm font-medium transition-colors sm:flex-none ${
        active ? activeClass : 'bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )
}
