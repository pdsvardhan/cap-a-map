import React, { useState, useMemo, useCallback } from 'react'
import useMapStore from '../../stores/mapStore'
import { ZONING_GROUPS, ZONING_HIERARCHY, AREA_HEATMAP_LEGEND } from '../../utils/colors'
import { NAMED_ROAD_CATEGORY_COLORS } from '../../utils/constants'

const ALL_GROUP_KEYS = Object.keys(ZONING_GROUPS)

const QUICK_FILTERS = {
  residential: { label: 'Residential', groups: ['residential-high', 'residential-low', 'residential-vacant'] },
  commercial: { label: 'Commercial', groups: ['commercial', 'commercial-vacant'] },
  'parks-green': { label: 'Parks & Green', groups: ['parks-active', 'parks-passive', 'water', 'green-belt', 'village-green'] },
  public: { label: 'Public', groups: ['education', 'cultural', 'health', 'government'] },
  'industrial-special': { label: 'Industrial', groups: ['industrial', 'special', 'special-zone', 'recreation'] },
  mobility: { label: 'Mobility', groups: ['road-reserve', 'roads-infra'] },
}

export default function Legend() {
  const activeZoningGroups = useMapStore((s) => s.activeZoningGroups)
  const setActiveZoningGroups = useMapStore((s) => s.setActiveZoningGroups)
  const plotCounts = useMapStore((s) => s.plotCounts)
  const allocatedLandsVisible = useMapStore((s) => s.allocatedLandsVisible)
  const toggleAllocatedLands = useMapStore((s) => s.toggleAllocatedLands)
  const colorMode = useMapStore((s) => s.colorMode)
  const setColorMode = useMapStore((s) => s.setColorMode)
  const toggleLegend = useMapStore((s) => s.toggleLegend)

  const [collapsedCategories, setCollapsedCategories] = useState(new Set())
  const [activeQuickFilter, setActiveQuickFilter] = useState(null)
  const [roadsCollapsed, setRoadsCollapsed] = useState(false)

  const isZoning = colorMode !== 'area'
  const isAllActive = !activeZoningGroups || activeZoningGroups.size === ALL_GROUP_KEYS.length

  const isGroupActive = useCallback((groupKey) => {
    return isAllActive || (activeZoningGroups && activeZoningGroups.has(groupKey))
  }, [activeZoningGroups, isAllActive])

  const totalVisible = useMemo(() => {
    if (isAllActive || !plotCounts) {
      return plotCounts ? Object.values(plotCounts).reduce((sum, c) => sum + c, 0) : 0
    }
    let total = 0
    for (const key of activeZoningGroups) {
      total += (plotCounts[key] || 0)
    }
    return total
  }, [activeZoningGroups, isAllActive, plotCounts])

  const toggleGroup = useCallback((groupKey) => {
    setActiveQuickFilter(null)
    const current = activeZoningGroups ? new Set(activeZoningGroups) : new Set(ALL_GROUP_KEYS)
    if (current.has(groupKey)) {
      current.delete(groupKey)
    } else {
      current.add(groupKey)
    }
    setActiveZoningGroups(current.size === ALL_GROUP_KEYS.length ? null : current)
  }, [activeZoningGroups, setActiveZoningGroups])

  const toggleCategory = useCallback((categoryId) => {
    setActiveQuickFilter(null)
    const cat = ZONING_HIERARCHY.find(c => c.id === categoryId)
    if (!cat) return
    const current = activeZoningGroups ? new Set(activeZoningGroups) : new Set(ALL_GROUP_KEYS)
    const allActive = cat.groups.every(g => current.has(g))
    for (const g of cat.groups) {
      if (allActive) current.delete(g)
      else current.add(g)
    }
    setActiveZoningGroups(current.size === ALL_GROUP_KEYS.length ? null : current)
  }, [activeZoningGroups, setActiveZoningGroups])

  const handleSelectAll = useCallback(() => {
    setActiveQuickFilter(null)
    setActiveZoningGroups(null)
  }, [setActiveZoningGroups])

  const handleClearAll = useCallback(() => {
    setActiveQuickFilter(null)
    setActiveZoningGroups(new Set())
  }, [setActiveZoningGroups])

  const handleQuickFilter = useCallback((filterId) => {
    if (activeQuickFilter === filterId) {
      setActiveQuickFilter(null)
      setActiveZoningGroups(null)
      return
    }
    setActiveQuickFilter(filterId)
    const groups = QUICK_FILTERS[filterId]?.groups || []
    setActiveZoningGroups(new Set(groups))
  }, [activeQuickFilter, setActiveZoningGroups])

  const toggleCollapse = useCallback((categoryId) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }, [])

  return (
    <div className="absolute top-16 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-30 max-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800">Map Explorer</h3>
        <button onClick={toggleLegend} className="p-1 hover:bg-gray-100 rounded transition-colors">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Color Mode Toggle */}
      <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Color Mode</p>
        <div className="flex gap-1">
          <button
            onClick={() => setColorMode('zoning')}
            className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded transition-colors ${
              isZoning
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Zoning
          </button>
          <button
            onClick={() => setColorMode('area')}
            className={`flex-1 px-2 py-1.5 text-[11px] font-medium rounded transition-colors ${
              !isZoning
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Plot Size
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto panel-scroll flex-1">

        {/* === ZONING MODE CONTENT === */}
        {isZoning && (
          <>
            {/* Action buttons */}
            <div className="px-4 py-2 border-b border-gray-100 flex gap-2 flex-shrink-0">
              <button
                onClick={handleSelectAll}
                className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${isAllActive ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 text-[10px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Quick filters */}
            <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Quick Filters</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(QUICK_FILTERS).map(([filterId, filter]) => (
                  <button
                    key={filterId}
                    onClick={() => handleQuickFilter(filterId)}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                      activeQuickFilter === filterId
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hierarchical groups */}
            <div className="px-3 py-2 space-y-0.5">
              {ZONING_HIERARCHY.map((category) => {
                const isCollapsed = collapsedCategories.has(category.id)
                const catGroupsActive = category.groups.filter(g => isGroupActive(g)).length
                const catGroupsTotal = category.groups.length
                const allCatActive = catGroupsActive === catGroupsTotal
                const someCatActive = catGroupsActive > 0 && !allCatActive

                return (
                  <div key={category.id} className="mb-0.5">
                    {/* Category header */}
                    <div className="flex items-center gap-1.5 py-1.5 cursor-pointer group" onClick={() => toggleCollapse(category.id)}>
                      <svg
                        className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCategory(category.id) }}
                        className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
                          allCatActive ? 'bg-blue-600 border-blue-600' : someCatActive ? 'bg-blue-200 border-blue-400' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {allCatActive && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {someCatActive && (
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />
                        )}
                      </button>
                      <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">{category.label}</span>
                      <span className="text-[9px] text-gray-400 ml-auto">{catGroupsActive}/{catGroupsTotal}</span>
                    </div>

                    {/* Individual groups */}
                    {!isCollapsed && (
                      <div className="ml-5 space-y-0">
                        {category.groups.map((groupKey) => {
                          const group = ZONING_GROUPS[groupKey]
                          if (!group) return null
                          const active = isGroupActive(groupKey)
                          const isTransparent = group.color === 'transparent'
                          const count = plotCounts?.[groupKey] || 0

                          return (
                            <div
                              key={groupKey}
                              className={`flex items-center gap-2 py-1 px-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50 ${!active ? 'opacity-40' : ''}`}
                              onClick={() => toggleGroup(groupKey)}
                            >
                              <button
                                className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
                                  active ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                }`}
                              >
                                {active && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <div
                                className="w-4 h-3 rounded-sm flex-shrink-0"
                                style={isTransparent ? {
                                  backgroundColor: '#f5f5f5',
                                  border: '1px solid #999',
                                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #ccc 2px, #ccc 3px)',
                                } : {
                                  backgroundColor: group.color,
                                  border: '1px solid ' + (group.outlineColor || '#ddd'),
                                }}
                              />
                              <span className="text-[11px] text-gray-700 flex-1">{group.label}</span>
                              <span className="text-[9px] text-gray-400 tabular-nums">{count.toLocaleString()}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Allocated Lands toggle */}
              <div className="pt-2 mt-1 border-t border-gray-100">
                <div
                  className={`flex items-center gap-2 py-1.5 px-1.5 rounded cursor-pointer transition-colors hover:bg-gray-50 ${!allocatedLandsVisible ? 'opacity-40' : ''}`}
                  onClick={() => toggleAllocatedLands()}
                >
                  <button
                    className={`w-3.5 h-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center transition-colors ${
                      allocatedLandsVisible ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                    }`}
                  >
                    {allocatedLandsVisible && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="w-4 h-3 rounded-sm flex-shrink-0 bg-[#FF6F00] border border-[#CC5800]" />
                  <span className="text-[11px] text-gray-700">Allocated Lands</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* === AREA HEATMAP MODE CONTENT === */}
        {!isZoning && (
          <div className="px-4 py-3">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Plot Size (Sq. Yards)</p>
            <div className="space-y-1">
              {AREA_HEATMAP_LEGEND.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="w-5 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div
                className="w-5 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: 'rgba(120,120,120,0.3)', border: '1px solid #888' }}
              />
              <span className="text-[11px] text-gray-500 italic">No area data / Road reserve</span>
            </div>

            {/* Gradient bar visualization */}
            <div className="mt-4">
              <div
                className="h-3 rounded-sm w-full"
                style={{
                  background: 'linear-gradient(to right, #1a9850, #91cf60, #fee08b, #fc8d59, #d73027, #7b2d8e)',
                }}
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-gray-400">Small</span>
                <span className="text-[9px] text-gray-400">Large</span>
              </div>
            </div>
          </div>
        )}

        {/* === ROAD HIERARCHY (always shown) === */}
        <div className="px-3 py-2 border-t border-gray-100">
          <div
            className="flex items-center gap-1.5 py-1.5 cursor-pointer group"
            onClick={() => setRoadsCollapsed(!roadsCollapsed)}
          >
            <svg
              className={`w-3 h-3 text-gray-400 transition-transform ${roadsCollapsed ? '' : 'rotate-90'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">Named Roads</span>
          </div>
          {!roadsCollapsed && (
            <div className="ml-5 space-y-0.5">
              {[
                ['major arterial', 'Major Arterial'],
                ['arterial', 'Arterial'],
                ['sub-arterial', 'Sub-Arterial'],
                ['seed access', 'Seed Access'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2.5 py-1 px-1.5">
                  <div className="w-5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: NAMED_ROAD_CATEGORY_COLORS[key] }} />
                  <span className="text-[11px] text-gray-700">{label}</span>
                </div>
              ))}
              <p className="text-[9px] text-gray-400 px-1.5 pt-0.5">E1–E16 (E-W), N1–N18 (N-S)</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer: visible count */}
      <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
        <span className="text-[10px] text-gray-500">
          {isZoning
            ? `${totalVisible.toLocaleString()} plots visible`
            : 'Showing plot sizes (Sq. Yards)'
          }
        </span>
      </div>
    </div>
  )
}
