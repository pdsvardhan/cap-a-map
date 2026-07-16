import { create } from 'zustand'

const LoadingStage = {
  INIT: { label: 'map', progress: 10 },
  LOADING_INDEX: { label: 'index', progress: 20 },
  LOADING_PLOTS: { label: 'plots', progress: 30 },
  RENDERING_PLOTS: { label: 'plots', progress: 60 },
  LOADING_VILLAGES: { label: 'villages', progress: 40 },
  RENDERING: { label: 'rendering', progress: 70 },
  LOADING_OVERLAYS: { label: 'overlays', progress: 80 },
  READY: { label: 'ready', progress: 100 },
  ERROR: { label: 'error', progress: 0 },
}

const useMapStore = create((set, get) => ({
  // Loading state
  isLoading: true,
  loadingStage: LoadingStage.INIT,
  loadingError: null,

  // UI state
  selectedPlot: null,
  showLegend: false,
  roadMode: false,
  colorMode: 'zoning',            // 'zoning' | 'area' | 'value'
  valueLens: 'commercial',        // 'commercial' | 'residential' (Value mode)
  showNamedOnly: false,
  allocatedLandsVisible: true,
  activeZoningGroups: null,

  // Data state
  namedRoadsIndex: [],
  plotCounts: {},
  totalPlots: null,               // meta.json total_plots — null until meta loads
  regionScores: null,             // region_scores.json (adr-008)

  // Map internals (not reactive — stored as refs)
  _mapInstance: null,
  _plotsData: null,

  // Actions
  setLoadingStage: (stage) => set({ loadingStage: stage }),
  setLoadingError: (error) => set({ loadingError: error, loadingStage: LoadingStage.ERROR }),
  setReady: () => set({ isLoading: false, loadingStage: LoadingStage.READY }),

  selectPlot: (plot) => set({ selectedPlot: plot }),
  clearPlot: () => set({ selectedPlot: null }),

  toggleLegend: () => set((s) => ({ showLegend: !s.showLegend })),
  toggleRoadMode: () => set((s) => ({ roadMode: !s.roadMode })),
  toggleNamedOnly: () => set((s) => ({ showNamedOnly: !s.showNamedOnly })),
  toggleAllocatedLands: () => set((s) => ({ allocatedLandsVisible: !s.allocatedLandsVisible })),

  setColorMode: (mode) => set({ colorMode: mode }),
  setValueLens: (lens) => set({ valueLens: lens }),
  setActiveZoningGroups: (groups) => set({ activeZoningGroups: groups }),
  setNamedRoadsIndex: (index) => set({ namedRoadsIndex: index }),
  setPlotCounts: (counts) => set({ plotCounts: counts }),
  setTotalPlots: (n) => set({ totalPlots: n }),
  setRegionScores: (scores) => set({ regionScores: scores }),

  // Internal setters (map instance, data refs)
  setMapInstance: (map) => set({ _mapInstance: map }),
  setPlotsData: (data) => set({ _plotsData: data }),
}))

export { LoadingStage }
export default useMapStore
