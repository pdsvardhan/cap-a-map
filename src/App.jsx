import React, { lazy, Suspense } from 'react'
import useMapStore from './stores/mapStore'
import MapContainer from './components/Map/MapContainer'
import SearchBar from './components/Search/SearchBar'
import PlotDetailPanel from './components/PlotDetail/PlotDetailPanel'
import Legend from './components/Legend/Legend'
import LoadingScreen from './components/LoadingScreen'
import ErrorBoundary from './components/ErrorBoundary'

// Internal road-naming tooling is gated behind ?dev — not part of the public app.
const DEV_TOOLS = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev')
// In-app comment tool — dev builds only (excluded from production bundle).
const FeedbackTool = import.meta.env.DEV ? lazy(() => import('./dev/FeedbackTool.jsx')) : null

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
        <div className="map-vignette" />

        {!isLoading && (
          <div data-component="TopBar" className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-3 sm:top-4 sm:left-4 sm:right-4 sm:flex-row sm:items-start">
            <div data-component="SearchBar" className="flex-1 sm:max-w-lg">
              <SearchBar />
            </div>
            <div data-component="MapControls" className="flex flex-wrap gap-2 sm:flex-nowrap">
              <TopButton onClick={toggleLegend} active={showLegend} label="Legend" />
              {DEV_TOOLS && (
                <TopButton onClick={toggleRoadMode} active={roadMode} label="Roads · dev" />
              )}
            </div>
          </div>
        )}

        {showLegend && !isLoading && <div data-component="Legend" className="contents"><Legend /></div>}

        {showPanel && <div data-component="PlotDetailPanel" className="contents"><PlotDetailPanel plot={selectedPlot} onClose={clearPlot} /></div>}

        {FeedbackTool && <Suspense fallback={null}><FeedbackTool /></Suspense>}
      </div>
    </ErrorBoundary>
  )
}

function TopButton({ onClick, active, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-3 rounded-2xl text-sm font-medium transition-all sm:flex-none border ${
        active
          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-transparent shadow-[var(--shadow)]'
          : 'glass text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border-strong)]'
      }`}
    >
      {label}
    </button>
  )
}
