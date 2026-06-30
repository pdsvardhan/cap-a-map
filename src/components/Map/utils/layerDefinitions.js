import { LAYERS, NAMED_ROAD_COLOR, NAMED_ROAD_CASING, NAMED_ROAD_MARKING, PLOTS_SOURCE, PLOTS_SOURCE_LAYER } from '../../../utils/constants'
import { buildSymbologyColorExpression, ROAD_RESERVE_SYMBOLOGIES, buildRoadReserveFilter } from '../../../utils/colors'

// Shared zoom→width ramp for the named-road carriageway line.
const ROAD_LINE_WIDTH = ['interpolate', ['linear'], ['zoom'], 11, 1.2, 14, 2.6, 17, 6, 19, 11]

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

// Dark bed under the carriageway — gives the line separation from plot fills.
export function getNamedRoadsCasingLayer() {
  return {
    id: LAYERS.NAMED_ROADS_CASING,
    type: 'line',
    source: 'namedRoads',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': NAMED_ROAD_CASING,
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.6, 14, 4.6, 17, 9, 19, 15],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 13, 0.9],
    },
  }
}

// The carriageway — ONE colour for every named road (owner feedback #6).
export function getNamedRoadsLineLayer() {
  return {
    id: LAYERS.NAMED_ROADS_LINE,
    type: 'line',
    source: 'namedRoads',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': NAMED_ROAD_COLOR, 'line-width': ROAD_LINE_WIDTH, 'line-opacity': 0.95 },
  }
}

// Dashed centre marking — the "marking" that distinguishes roads instead of colour.
export function getNamedRoadsMarkingLayer() {
  return {
    id: LAYERS.NAMED_ROADS_MARKING,
    type: 'line',
    source: 'namedRoads',
    minzoom: 13,
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: {
      'line-color': NAMED_ROAD_MARKING,
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.6, 17, 1.4, 19, 2.2],
      'line-dasharray': [2, 3],
      'line-opacity': 0.9,
    },
  }
}

export function getNamedRoadsHighlightLayer() {
  return {
    id: LAYERS.NAMED_ROADS_HIGHLIGHT,
    type: 'line',
    source: 'namedRoads',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#FFFFFF',
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 14, 5.5, 17, 11, 19, 18],
      'line-opacity': 1,
    },
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
