// Amaravati Capital City center coordinates
export const MAP_CENTER = [80.50, 16.505]
export const MAP_ZOOM = 12
export const MAP_MIN_ZOOM = 10
export const MAP_MAX_ZOOM = 20

// Minimal inline dark style. We previously loaded the full CARTO Dark Matter
// vector style (93 layers of streets) only to hide everything but the
// background — wasteful, dependent on cartocdn (503s), and it left
// isStyleLoaded() stuck so 'load' never fired. A flat dark canvas loads
// instantly and the plots ARE the content. (Water/river context: re-add in P9.)
export const MAP_STYLE = {
  version: 8,
  glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#0a0d12' } },
  ],
}

// Data file paths (relative to public/). Plots come from PMTiles vector tiles
// (offline pipeline output); search/meta are precomputed since the client no
// longer holds all features in memory.
export const DATA_PATHS = {
  plotsTiles: '/data/plots.pmtiles',
  search: '/data/search.json',
  meta: '/data/meta.json',
  allocatedLands: '/data/allocated_lands.geojson',
  grid: '/data/grid.geojson',
  namedRoads: '/data/named_roads.geojson',
  namedRoadsIndex: '/data/named_roads_index.json',
  water: '/data/waterbodies.geojson',
}

// Vector-tile source + source-layer name (set by tippecanoe `-l plots`)
export const PLOTS_SOURCE = 'plots'
export const PLOTS_SOURCE_LAYER = 'plots'

// Layer IDs
export const LAYERS = {
  WATER: 'water-fill',
  PLOTS_FILL: 'plots-fill',
  PLOTS_OUTLINE: 'plots-outline',
  PLOTS_HIGHLIGHT: 'plots-highlight',
  ROAD_MODE_OVERLAY: 'road-mode-overlay',
  ALLOCATED_LANDS: 'allocated-lands-fill',
  ALLOCATED_LANDS_OUTLINE: 'allocated-lands-outline',
  ALLOCATED_LANDS_LABELS: 'allocated-lands-labels',
  // Named roads (rendered from precomputed data in P5)
  NAMED_ROADS_FILL: 'named-roads-fill',
  NAMED_ROADS_OUTLINE: 'named-roads-outline',
  NAMED_ROADS_LABELS: 'named-roads-labels',
  NAMED_ROADS_HIGHLIGHT: 'named-roads-highlight',
}

// Named roads colored by classification (visible on the dark canvas)
export const NAMED_ROAD_CATEGORY_COLORS = {
  'major arterial': '#FF4D4D', // red
  'arterial': '#FFA64D',       // orange
  'sub-arterial': '#5BC0EB',   // blue
  'seed access': '#7CD992',    // green
  'other': '#CBD5E1',          // grey
}
export const NAMED_ROAD_FALLBACK = '#CBD5E1'
// MapLibre ['match', ['get','roadCategory'], ...] color pairs
export const NAMED_ROAD_COLOR_MATCH = Object.entries(NAMED_ROAD_CATEGORY_COLORS).flat()
