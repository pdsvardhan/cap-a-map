import { LAYERS, NAMED_ROAD_COLOR_MATCH, NAMED_ROAD_FALLBACK, PLOTS_SOURCE, PLOTS_SOURCE_LAYER } from '../../../utils/constants'

const roadCategoryColor = ['match', ['get', 'roadCategory'], ...NAMED_ROAD_COLOR_MATCH, NAMED_ROAD_FALLBACK]
import { buildSymbologyColorExpression, ROAD_RESERVE_SYMBOLOGIES, buildRoadReserveFilter } from '../../../utils/colors'

export function getPlotFillLayer() {
  return {
    id: LAYERS.PLOTS_FILL,
    type: 'fill',
    source: PLOTS_SOURCE,
    'source-layer': PLOTS_SOURCE_LAYER,
    paint: {
      'fill-color': buildSymbologyColorExpression(),
      // Saturate colours at low zoom — at z10-12 plots are sub-pixel and a low
      // floor let the dark canvas bleed through, reading as black (owner feedback).
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.92, 13, 0.88, 16, 0.85, 18, 0.85],
    },
  }
}

export function getPlotOutlineLayer() {
  return {
    id: LAYERS.PLOTS_OUTLINE,
    type: 'line',
    source: PLOTS_SOURCE,
    'source-layer': PLOTS_SOURCE_LAYER,
    paint: {
      // Softer-than-black so the border mesh never reads as a black wash; held
      // at width 0 below z13 so zoomed-out views show pure colour, no mesh.
      'line-color': '#20242C',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0, 13, 0, 14, 0.4, 16, 0.9, 19, 1.8],
      'line-opacity': [
        'case',
        ['any', ...Array.from(ROAD_RESERVE_SYMBOLOGIES).map(sym => ['==', ['get', 'symbology'], sym])],
        0,
        0.9,
      ],
    },
  }
}

export function getPlotHighlightLayer() {
  return {
    id: LAYERS.PLOTS_HIGHLIGHT,
    type: 'line',
    source: PLOTS_SOURCE,
    'source-layer': PLOTS_SOURCE_LAYER,
    paint: { 'line-color': '#FFFFFF', 'line-width': 3, 'line-opacity': 1 },
    filter: ['==', ['get', 'pid'], -1],
  }
}

export function getRoadModeOverlayLayer() {
  return {
    id: LAYERS.ROAD_MODE_OVERLAY,
    type: 'fill',
    source: PLOTS_SOURCE,
    'source-layer': PLOTS_SOURCE_LAYER,
    paint: { 'fill-color': '#FF8C00', 'fill-opacity': 0.35 },
    filter: buildRoadReserveFilter(),
    layout: { visibility: 'none' },
  }
}

export function getNamedRoadsFillLayer() {
  return {
    id: LAYERS.NAMED_ROADS_FILL,
    type: 'fill',
    source: 'namedRoads',
    paint: { 'fill-color': roadCategoryColor, 'fill-opacity': 0.85 },
  }
}

export function getNamedRoadsOutlineLayer() {
  return {
    id: LAYERS.NAMED_ROADS_OUTLINE,
    type: 'line',
    source: 'namedRoads',
    paint: {
      'line-color': roadCategoryColor,
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 16, 2, 19, 3.5],
      'line-opacity': 1,
    },
  }
}

export function getNamedRoadsHighlightLayer() {
  return {
    id: LAYERS.NAMED_ROADS_HIGHLIGHT,
    type: 'line',
    source: 'namedRoads',
    paint: { 'line-color': '#FFFFFF', 'line-width': 3, 'line-opacity': 1 },
    filter: ['==', ['get', 'roadName'], ''],
  }
}

export function getNamedRoadsLabelsLayer() {
  return {
    id: LAYERS.NAMED_ROADS_LABELS,
    type: 'symbol',
    source: 'namedRoadLabels',
    layout: {
      'text-field': ['get', 'roadName'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 13, 17, 16],
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-letter-spacing': 0.05,
    },
    paint: {
      'text-color': '#FFFFFF',
      'text-halo-color': 'rgba(0,0,0,0.9)',
      'text-halo-width': 2,
    },
  }
}

export function getWaterFillLayer() {
  return {
    id: LAYERS.WATER,
    type: 'fill',
    source: 'water',
    paint: { 'fill-color': '#15405f', 'fill-opacity': 0.9 },
  }
}

export function getAllocatedLandsFillLayer() {
  return {
    id: LAYERS.ALLOCATED_LANDS,
    type: 'fill',
    source: 'allocated_lands',
    paint: { 'fill-color': '#FF6F00', 'fill-opacity': 0.5 },
  }
}

export function getAllocatedLandsOutlineLayer() {
  return {
    id: LAYERS.ALLOCATED_LANDS_OUTLINE,
    type: 'line',
    source: 'allocated_lands',
    paint: { 'line-color': '#E65100', 'line-width': 2 },
  }
}

export function getAllocatedLandsLabelsLayer() {
  return {
    id: LAYERS.ALLOCATED_LANDS_LABELS,
    type: 'symbol',
    source: 'allocated_lands',
    layout: {
      'text-field': ['get', 'label'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 12, 8, 16, 12, 18, 14],
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
    },
    paint: {
      'text-color': '#FFFFFF',
      'text-halo-color': '#333333',
      'text-halo-width': 1.5,
    },
  }
}
