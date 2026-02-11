import React from 'react'
import { ZONING_GROUPS } from '../../utils/colors'

export default function Legend({ onClose }) {
  const groups = Object.entries(ZONING_GROUPS)

  return (
    <div className="absolute top-16 right-4 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-30 max-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">Zoning Legend</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Legend items */}
      <div className="overflow-y-auto panel-scroll px-4 py-3 space-y-1.5">
        {groups.map(([key, group]) => (
          <div key={key} className="flex items-center gap-2.5 py-1">
            <div
              className="w-5 h-4 rounded-sm border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: group.color }}
            />
            <span className="text-xs text-gray-700">{group.label}</span>
          </div>
        ))}

        {/* Additional overlay indicators */}
        <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Overlays
          </p>
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-5 h-4 rounded-sm bg-[#42A5F5] border border-gray-200 flex-shrink-0" />
            <span className="text-xs text-gray-700">Water Bodies</span>
          </div>
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-5 h-0.5 bg-[#78909C] flex-shrink-0" style={{ marginLeft: 0, marginRight: 0 }} />
            <span className="text-xs text-gray-700">Roads</span>
          </div>
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-5 h-4 rounded-sm bg-[#5D4037] border border-gray-200 flex-shrink-0" />
            <span className="text-xs text-gray-700">Burial Grounds</span>
          </div>
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-5 h-4 rounded-sm bg-[#FF6F00] border border-gray-200 flex-shrink-0" />
            <span className="text-xs text-gray-700">Allocated Lands</span>
          </div>
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-5 h-0.5 flex-shrink-0" style={{ borderTop: '2px dashed #FF5722' }} />
            <span className="text-xs text-gray-700">Boundaries (R1)</span>
          </div>
        </div>

        {/* Unknown */}
        <div className="pt-2 mt-2 border-t border-gray-100">
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-5 h-4 rounded-sm bg-[#BDBDBD] border border-gray-200 flex-shrink-0" />
            <span className="text-xs text-gray-500">Unknown / Other</span>
          </div>
        </div>
      </div>
    </div>
  )
}
