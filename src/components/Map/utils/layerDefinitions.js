import { LAYERS, PLOTS_SOURCE, PLOTS_SOURCE_LAYER } from '../../../utils/constants'
import { buildSymbologyColorExpression, ROAD_RESERVE_SYMBOLOGIES, buildRoadReserveFilter } from '../../../utils/colors'
import { ROAD, WATER_FILL, IS_LIGHT, LAND_BASE } from '../../../utils/designTokens'

// Solid base under the plots so inter-parcel gaps read as land, not black canvas.
export function getLandBaseLayer() {
  return {
    id: LAYERS.LAND_BASE,
    type: 'fill',
    source: 'landBase',
    paint: { 'fill-color': LAND_BASE, 'fill-opacity': 1 },
  }
}

// Theme-aware tones for outlines / highlights / road edges.
const PLOT_OUTLINE = IS_LIGHT ? 'rgba(40,33,20,0.22)' : '#20242C'
const ROAD_EDGE = IS_LIGHT ? 'rgba(18,12,4,0.45)' : (ROAD.casing || '#23262E')
const HIGHLIGHT = IS_LIGHT ? '#0f0d09' : '#FFFFFF'

export function getPlotFillLayer() {
  return {
    id: LAYERS.PLOTS_FILL,
    type: 'fill',
    source: PLOTS_SOURCE,
    'source-layer': PLOTS_SOURCE_LAYER,
    paint: {
      'fill-color': buildSymbologyColorExpression(),
      // Near-opaque at low zoom so the dark canvas doesn't bleed through the
      // sub-pixel parcels as black seams (owner: "less black").
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.98, 14, 0.94, 18, 0.9],
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
      'line-color': PLOT_OUTLINE,
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
    paint: { 'line-color': HIGHLIGHT, 'line-width': 3, 'line-opacity': 1 },
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

// Filled road corridor — ONE colour for every named road (owner feedback #6),
// authentic APCRDA trunk-road polygons. Sits above plot fills.
export function getNamedRoadsFillLayer() {
  return {
    id: LAYERS.NAMED_ROADS_FILL,
    type: 'fill',
    source: 'namedRoads',
    paint: {
      'fill-color': ROAD.color,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 14, 0.78, 18, 0.85],
    },
  }
}

// Subtle outline so adjacent roads/blocks stay distinct (owner: filled + subtle outline).
export function getNamedRoadsOutlineLayer() {
  return {
    id: LAYERS.NAMED_ROADS_OUTLINE,
    type: 'line',
    source: 'namedRoads',
    paint: {
      'line-color': ROAD_EDGE,
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.4, 14, 0.8, 17, 1.4, 19, 2],
      'line-opacity': 0.85,
    },
  }
}

// White halo on the selected road (filter set to its roadName).
export function getNamedRoadsHighlightLayer() {
  return {
    id: LAYERS.NAMED_ROADS_HIGHLIGHT,
    type: 'line',
    source: 'namedRoads',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': HIGHLIGHT,
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 14, 3.5, 17, 6, 19, 9],
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
    paint: { 'fill-color': WATER_FILL, 'fill-opacity': 0.9 },
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
