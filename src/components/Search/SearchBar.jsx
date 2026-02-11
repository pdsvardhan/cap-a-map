import React, { useState, useEffect, useRef, useCallback } from 'react'
import Fuse from 'fuse.js'
import { getColorForSymbology } from '../../utils/colors'
import { truncate } from '../../utils/formatters'

// Search index is in compact array format:
// [id, regcode, plot_code, farmer_name, village, symbology, alloted_ex, lat, lon]
function unpackRecord(arr) {
  return {
    id: arr[0],
    rc: arr[1] || '',   // regcode
    pc: arr[2] || '',   // plot_code
    fn: arr[3] || '',   // farmer name
    vi: arr[4] || '',   // village
    sy: arr[5] || '',   // symbology
    ae: arr[6] || 0,    // alloted extent
    la: arr[7] || 0,    // latitude
    lo: arr[8] || 0,    // longitude
  }
}

const FUSE_OPTIONS = {
  keys: [
    { name: 'rc', weight: 0.35 },
    { name: 'pc', weight: 0.30 },
    { name: 'fn', weight: 0.20 },
    { name: 'vi', weight: 0.15 },
  ],
  threshold: 0.3,
  distance: 100,
  minMatchCharLength: 2,
  includeMatches: true,
  limit: 20,
}

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const fuseRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Load search index on mount
  useEffect(() => {
    async function loadIndex() {
      try {
        const res = await fetch('/data/search_index.json')
        const rawData = await res.json()
        // Unpack compact array format into objects
        const data = rawData.map(unpackRecord)
        fuseRef.current = new Fuse(data, FUSE_OPTIONS)
        setTotalRecords(data.length)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load search index:', err)
        setIsLoading(false)
      }
    }
    loadIndex()
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2 || !fuseRef.current) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(() => {
      const fuseResults = fuseRef.current.search(query)
      setResults(fuseResults.slice(0, 15))
      setIsOpen(fuseResults.length > 0)
      setSelectedIndex(-1)
    }, 150)

    return () => clearTimeout(timer)
  }, [query])

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
    setQuery(item.rc || item.pc || '')
    setIsOpen(false)
    onSelect?.(item)
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
    if (!result.matches || result.matches.length === 0) return ''
    const keyMap = { rc: 'Regcode', pc: 'Plot Code', fn: 'Farmer', vi: 'Village' }
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
          placeholder={isLoading ? 'Loading search index...' : `Search ${totalRecords.toLocaleString()} plots by regcode, plot code, farmer, village...`}
          disabled={isLoading}
          className="w-full pl-10 pr-10 py-2.5 bg-white rounded-lg shadow-md border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none text-sm text-gray-800 placeholder-gray-400 disabled:bg-gray-100 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
                  {/* Color indicator */}
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {/* Main info */}
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
                      {item.fn ? truncate(item.fn, 35) : ''}{' '}
                      {item.vi ? `• ${item.vi}` : ''}
                    </div>
                  </div>
                  {/* Area */}
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
