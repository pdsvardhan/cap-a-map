import { LAYERS, NAMED_ROAD_COLOR, NAMED_ROAD_OUTLINE } from '../../../utils/constants'
import { buildSymbologyColorExpression, ROAD_RESERVE_SYMBOLOGIES, buildRoadReserveFilter } from '../../../utils/colors'

export function getPlotFillLayer() {
  return {
    id: LAYERS.PLOTS_FILL,
    type: 'fill',
    source: 'plots',
    paint: {
      'fill-color': buildSymbologyColorExpression(),
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 0.75, 18, 0.85],
    },
  }
}

export function getPlotOutlineLayer() {
  return {
    id: LAYERS.PLOTS_OUTLINE,
    type: 'line',
    source: 'plots',
    paint: {
      'line-color': '#1A1A1A',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0, 13, 0.3, 15, 0.8, 17, 1.2, 19, 1.8],
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
    source: 'plots',
    paint: { 'line-color': '#FFFFFF', 'line-width': 3, 'line-opacity': 1 },
    filter: ['==', ['id'], -1],
  }
}

export function getRoadModeOverlayLayer() {
  return {
    id: LAYERS.ROAD_MODE_OVERLAY,
    type: 'fill',
    source: 'plots',
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
    paint: { 'fill-color': NAMED_ROAD_COLOR, 'fill-opacity': 1 },
  }
}

export function getNamedRoadsOutlineLayer() {
  return {
    id: LAYERS.NAMED_ROADS_OUTLINE,
    type: 'line',
    source: 'namedRoads',
    paint: {
      'line-color': NAMED_ROAD_OUTLINE,
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 2.5, 19, 4],
      'line-opacity': 1,
    },
  }
}

export function getNamedRoadsHighlightLayer() {
  return {
    id: LAYERS.NAMED_ROADS_HIGHLIGHT,
    type: 'line',
    source: 'namedRoads',
    paint: { 'line-color': '#FFEB3B', 'line-width': 4, 'line-opacity': 1 },
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
