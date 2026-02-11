import React from 'react'

const LAYER_CONFIG = [
  {
    key: 'allocatedLands',
    label: 'Allocated Lands',
    description: 'Schools, hospitals, government offices, banks, etc.',
    color: '#FF6F00',
  },
  {
    key: 'roads',
    label: 'Roads',
    description: 'Existing roads (R&B and Panchayati Raj)',
    color: '#78909C',
  },
  {
    key: 'waterbodies',
    label: 'Water Bodies',
    description: 'Tanks, ponds, and lakes',
    color: '#42A5F5',
  },
  {
    key: 'burialGrounds',
    label: 'Burial Grounds',
    description: 'Burial grounds and tombs',
    color: '#5D4037',
  },
  {
    key: 'boundaries',
    label: 'R1 Boundaries',
    description: 'Village planning zone boundaries',
    color: '#FF5722',
  },
  {
    key: 'surveyParcels',
    label: 'Survey Parcels',
    description: 'Original cadastral survey parcels',
    color: '#795548',
  },
]

export default function LayerControls({ layerVisibility, onToggle, onClose }) {
  return (
    <div className="absolute top-16 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Map Layers</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Layer toggles */}
      <div className="px-4 py-3 space-y-3">
        {LAYER_CONFIG.map(layer => {
          const isVisible = layerVisibility[layer.key] ?? false
          return (
            <label
              key={layer.key}
              className="flex items-start gap-3 cursor-pointer group"
            >
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className="w-4 h-4 rounded-sm border border-gray-200 flex-shrink-0"
                  style={{ backgroundColor: isVisible ? layer.color : '#E0E0E0' }}
                />
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => onToggle(layer.key)}
                  className="sr-only"
                />
                {/* Toggle switch */}
                <div
                  className={`relative w-8 h-4 rounded-full transition-colors ${
                    isVisible ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                      isVisible ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800 group-hover:text-orange-700 transition-colors">
                  {layer.label}
                </span>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {layer.description}
                </p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
