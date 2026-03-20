import React, { useState, useEffect, useRef, useCallback } from 'react'
import Fuse from 'fuse.js'
import useMapStore from '../../stores/mapStore'
import { getColorForSymbology } from '../../utils/colors'
import { truncate } from '../../utils/formatters'

// Search index is in compact array format (no farmer name):
// [id, regcode, plot_code, village, symbology, alloted_ex, lat, lon]
function unpackRecord(arr) {
  return {
    id: arr[0],
    rc: arr[1] || '',
    pc: arr[2] || '',
    vi: arr[3] || '',
    sy: arr[4] || '',
    ae: arr[5] || 0,
    la: arr[6] || 0,
    lo: arr[7] || 0,
  }
}

// Allocated lands index format: [name, category, lat, lon]
function unpackLandmark(arr) {
  return {
    _type: 'landmark',
    nm: arr[0] || '',
    cat: arr[1] || '',
    la: arr[2] || 0,
    lo: arr[3] || 0,
  }
}

const PLOT_FUSE_OPTIONS = {
  keys: [
    { name: 'rc', weight: 0.40 },
    { name: 'pc', weight: 0.35 },
    { name: 'vi', weight: 0.25 },
  ],
  threshold: 0.3,
  distance: 100,
  minMatchCharLength: 2,
  includeMatches: true,
  limit: 20,
}

const LANDMARK_FUSE_OPTIONS = {
  keys: [
    { name: 'nm', weight: 0.80 },
    { name: 'cat', weight: 0.20 },
  ],
  threshold: 0.3,
  distance: 100,
  minMatchCharLength: 2,
  includeMatches: true,
  limit: 10,
}

export default function SearchBar() {
  const namedRoadsIndex = useMapStore((s) => s.namedRoadsIndex)
  const selectPlot = useMapStore((s) => s.selectPlot)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const plotFuseRef = useRef(null)
  const landmarkFuseRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Load search indices on mount
  useEffect(() => {
    async function loadIndices() {
      try {
        const plotRes = await fetch('/data/search_index.json')
        const rawPlotData = await plotRes.json()
        const plotData = rawPlotData.map(unpackRecord)
        plotFuseRef.current = new Fuse(plotData, PLOT_FUSE_OPTIONS)

        try {
          const landmarkRes = await fetch('/data/allocated_lands_index.json')
          if (landmarkRes.ok) {
            const rawLandmarks = await landmarkRes.json()
            const landmarkData = rawLandmarks.map(unpackLandmark)
            landmarkFuseRef.current = new Fuse(landmarkData, LANDMARK_FUSE_OPTIONS)
          }
        } catch (e) {
          console.warn('Allocated lands index not available:', e)
        }

        setTotalRecords(plotData.length)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load search index:', err)
        setIsLoading(false)
      }
    }
    loadIndices()
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase()
      let roadResults = []
      if (namedRoadsIndex.length > 0 && q.length >= 1) {
        roadResults = namedRoadsIndex
          .filter(r => (r.name || '').toLowerCase().includes(q))
          .slice(0, 5)
          .map(r => ({ item: { _type: 'namedRoad', name: r.name, la: r.center?.[1], lo: r.center?.[0], bbox: r.bbox }, _resultType: 'namedRoad' }))
      }

      let plotResults = []
      if (plotFuseRef.current) plotResults = plotFuseRef.current.search(query).slice(0, 12).map(r => ({ ...r, _resultType: 'plot' }))

      let landmarkResults = []
      if (landmarkFuseRef.current) landmarkResults = landmarkFuseRef.current.search(query).slice(0, 5).map(r => ({ ...r, _resultType: 'landmark' }))

      const combined = [
        ...roadResults,
        ...landmarkResults,
        ...plotResults,
      ]

      setResults(combined.slice(0, 15))
      setIsOpen(combined.length > 0)
      setSelectedIndex(-1)
    }, 150)

    return () => clearTimeout(timer)
  }, [query, namedRoadsIndex])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(results[selectedIndex].item)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }, [isOpen, results, selectedIndex])

  // Handle selection
  function handleSelect(item) {
    if (item._type === 'landmark') setQuery(item.nm || '')
    else if (item._type === 'namedRoad') setQuery(item.name || '')
    else setQuery(item.rc || item.pc || '')
    setIsOpen(false)

    // FlyTo using map instance from store
    const map = useMapStore.getState()._mapInstance
    if (map && item.la != null && item.lo != null) {
      map.flyTo({
        center: [item.lo, item.la],
        zoom: item._type === 'landmark' ? 16 : item._type === 'namedRoad' ? 15 : 18,
        duration: 1500,
      })
    }

    if (item._type === 'landmark') {
      selectPlot({ _type: 'landmark', name: item.nm, category: item.cat, lat: item.la, lon: item.lo })
    } else if (item._type === 'namedRoad') {
      selectPlot({ _type: 'namedRoad', name: item.name, bbox: item.bbox })
    } else {
      selectPlot({ regcode: item.rc, plot_code: item.pc, village: item.vi, symbology: item.sy, alloted_ex: item.ae, lat: item.la, lon: item.lo })
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get matched field label
  function getMatchLabel(result) {
    if (result._resultType === 'namedRoad') return 'Road'
    if (!result.matches || result.matches.length === 0) return ''
    if (result._resultType === 'landmark') {
      const keyMap = { nm: 'Name', cat: 'Category' }
      return keyMap[result.matches[0].key] || ''
    }
    const keyMap = { rc: 'Regcode', pc: 'Plot Code', vi: 'Village' }
    return keyMap[result.matches[0].key] || ''
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder={isLoading ? 'Loading search index...' : `Search ${totalRecords.toLocaleString()} plots, landmarks...`}
          disabled={isLoading}
          aria-label="Search plots, landmarks, and roads"
          className="w-full pl-10 pr-10 py-2.5 bg-white rounded-lg shadow-md border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none text-sm text-gray-800 placeholder-gray-400 disabled:bg-gray-100 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto panel-scroll z-50">
          <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </div>
          {results.map((result, idx) => {
            const item = result.item
            const isSelected = idx === selectedIndex
            const matchLabel = getMatchLabel(result)
            const isLandmark = result._resultType === 'landmark'
            const isNamedRoad = result._resultType === 'namedRoad'

            if (isNamedRoad) {
              const road = result.item
              return (
                <button
                  key={`road-${road.name}-${idx}`}
                  onClick={() => handleSelect(road)}
                  className={`w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors ${
                    isSelected ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#8B5A2B]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 truncate">{truncate(road.name, 40)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">Road</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            }

            if (isLandmark) {
              return (
                <button
                  key={`lm-${item.nm}-${idx}`}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors ${
                    isSelected ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-[#FF6F00]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {truncate(item.nm, 40)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                          Landmark
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {item.cat}
                      </div>
                    </div>
                  </div>
                </button>
              )
            }

            const color = getColorForSymbology(item.sy)
            return (
              <button
                key={`${item.rc}-${item.id}`}
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors ${
                  isSelected ? 'bg-orange-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {item.rc || item.pc || 'Unknown'}
                      </span>
                      {matchLabel && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                          {matchLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.vi ? item.vi : ''}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {item.ae ? `${Number(item.ae).toLocaleString()} sq.yd` : ''}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
