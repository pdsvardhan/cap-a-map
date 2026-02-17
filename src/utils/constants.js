// Amaravati Capital City center coordinates
export const MAP_CENTER = [80.50, 16.505]
export const MAP_ZOOM = 12
export const MAP_MIN_ZOOM = 10
export const MAP_MAX_ZOOM = 20

// MapLibre style - CARTO Dark Matter (dark basemap)
export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Data file paths (relative to public/)
export const DATA_PATHS = {
  plotsTiles: '/data/plots.pmtiles',
  searchIndex: '/data/search_index.json',
  allocatedLandsIndex: '/data/allocated_lands_index.json',
  allocatedLands: '/data/allocated_lands.geojson',
  roads: '/data/roads.geojson',

  burialGrounds: '/data/burial_grounds.geojson',
  boundaries: '/data/boundaries.geojson',
  surveyParcels: '/data/survey_parcels.geojson',
}

// Layer IDs
export const LAYERS = {
  PLOTS_FILL: 'plots-fill',
  PLOTS_OUTLINE: 'plots-outline',
  PLOTS_HIGHLIGHT: 'plots-highlight',
  NAMED_ROADS_FILL: 'named-roads-fill',
  NAMED_ROADS_OUTLINE: 'named-roads-outline',
  NAMED_ROADS_LABELS: 'named-roads-labels',
  NAMED_ROADS_HIGHLIGHT: 'named-roads-highlight',
  ALLOCATED_LANDS: 'allocated-lands-fill',
  ALLOCATED_LANDS_OUTLINE: 'allocated-lands-outline',
  ALLOCATED_LANDS_LABELS: 'allocated-lands-labels',
  ROADS: 'roads-line',
  BURIAL_GROUNDS: 'burial-grounds-fill',
  BOUNDARIES: 'boundaries-outline',
  SURVEY_PARCELS: 'survey-parcels-outline',
  ROAD_MODE_OVERLAY: 'road-mode-overlay',
}

// Named roads: uniform light grey (user will add category-based features later)
export const NAMED_ROAD_COLOR = '#D0D0D0'
export const NAMED_ROAD_OUTLINE = '#A0A0A0'
