import React, { useState, useEffect, useRef, useCallback } from 'react'
import Fuse from 'fuse.js'
import useMapStore from '../../stores/mapStore'
import { DATA_PATHS, LAYERS, PLOTS_SOURCE, PLOTS_SOURCE_LAYER } from '../../utils/constants'
import { truncate } from '../../utils/formatters'

// search.json entries (pipeline/04_indexes.mjs):
//   plot:     { t:'plot', i:pid, r:regcode, c:plot_code, v:village, f:farmer, lat, lon }
//   landmark: { t:'landmark', n:label, cat, lat, lon }
//   road:     { t:'road', n:name }

const PLOT_FUSE_OPTIONS = {
  keys: [
    { name: 'r', weight: 0.40 },
    { name: 'c', weight: 0.30 },
    { name: 'v', weight: 0.20 },
    { name: 'f', weight: 0.10 },
  ],
  threshold: 0.3, distance: 100, minMatchCharLength: 2, includeMatches: true, limit: 12,
}
const LANDMARK_FUSE_OPTIONS = {
  keys: [{ name: 'n', weight: 1 }],
  threshold: 0.3, distance: 100, minMatchCharLength: 2, limit: 6,
}

export default function SearchBar() {
  const selectPlot = useMapStore((s) => s.selectPlot)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const plotFuse = useRef(null)
  const landmarkFuse = useRef(null)
  const roads = useRef([])
  const inputRef = useRef(null)
  const boxRef = useRef(null)

  // Load index once
  useEffect(() => {
    fetch(DATA_PATHS.search)
      .then((r) => r.json())
      .then((entries) => {
        const plots = [], landmarks = [], rds = []
        for (const e of entries) {
          if (e.t === 'plot') plots.push(e)
          else if (e.t === 'landmark') landmarks.push(e)
          else if (e.t === 'road') rds.push(e)
        }
        plotFuse.current = new Fuse(plots, PLOT_FUSE_OPTIONS)
        landmarkFuse.current = new Fuse(landmarks, LANDMARK_FUSE_OPTIONS)
        roads.current = rds
        setTotal(plots.length)
        setIsLoading(false)
      })
      .catch((err) => { console.error('search index load failed', err); setIsLoading(false) })
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); setIsOpen(false); return }
    const timer = setTimeout(() => {
      const q = query.trim().toLowerCase()
      const roadHits = roads.current
        .filter((r) => r.n.toLowerCase().includes(q))
        .slice(0, 5)
        .map((r) => ({ item: r }))
      const landmarkHits = (landmarkFuse.current?.search(query) || []).slice(0, 5)
      const plotHits = (plotFuse.current?.search(query) || []).slice(0, 12)
      const combined = [...roadHits, ...landmarkHits, ...plotHits].slice(0, 16)
      setResults(combined)
      setIsOpen(combined.length > 0)
      setSelectedIndex(-1)
    }, 150)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = useCallback((item) => {
    setIsOpen(false)
    const map = useMapStore.getState()._mapInstance

    if (item.t === 'road') {
      // Named-road geometry lands in P5; just echo the name for now.
      setQuery(item.n)
      return
    }

    if (item.t === 'landmark') {
      setQuery(item.n)
      if (map && item.lat != null) map.flyTo({ center: [item.lon, item.lat], zoom: 16, duration: 1400 })
      selectPlot({ _type: 'landmark', name: item.n, category: item.cat, lat: item.lat, lon: item.lon })
      return
    }

    // plot: open panel immediately with the lean record, then upgrade to the
    // full feature (all tile properties) once the destination tile renders.
    setQuery(item.r || item.c || item.v || '')
    selectPlot({ pid: item.i, regcode: item.r, plot_code: item.c, village: item.v, farmer_n: item.f, lat: item.lat, lon: item.lon })
    if (!map || item.lat == null) return
    map.flyTo({ center: [item.lon, item.lat], zoom: 18, duration: 1500 })
    map.once('idle', () => {
      try {
        const full = map.querySourceFeatures(PLOTS_SOURCE, {
          sourceLayer: PLOTS_SOURCE_LAYER, filter: ['==', ['get', 'pid'], item.i],
        })
        if (full[0]) {
          map.setFilter(LAYERS.PLOTS_HIGHLIGHT, ['==', ['get', 'pid'], item.i])
          useMapStore.getState().selectPlot(full[0].properties)
        }
      } catch (e) { /* keep the lean record */ }
    })
  }, [selectPlot])

  const handleKeyDown = useCallback((e) => {
    if (!isOpen || !results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((p) => Math.min(p + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((p) => Math.max(p - 1, -1)) }
    else if (e.key === 'Enter' && selectedIndex >= 0) { e.preventDefault(); handleSelect(results[selectedIndex].item) }
    else if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur() }
  }, [isOpen, results, selectedIndex, handleSelect])

  useEffect(() => {
    function onDown(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setIsOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={boxRef} className="relative">
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
          placeholder={isLoading ? 'Loading search…' : `Search ${total.toLocaleString()} plots, landmarks, roads…`}
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

      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto panel-scroll z-50">
          <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          {results.map((result, idx) => {
            const item = result.item
            const sel = idx === selectedIndex
            const base = `w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-50 last:border-0 transition-colors ${sel ? 'bg-orange-50' : ''}`
            if (item.t === 'road') return (
              <button key={`r-${item.n}`} onClick={() => handleSelect(item)} className={base}>
                <Row dot="#8B5A2B" title={item.n} badge="Road" badgeClass="bg-amber-100 text-amber-800" />
              </button>
            )
            if (item.t === 'landmark') return (
              <button key={`l-${item.n}-${idx}`} onClick={() => handleSelect(item)} className={base}>
                <Row dot="#FF6F00" title={truncate(item.n, 40)} badge="Landmark" badgeClass="bg-orange-100 text-orange-700" sub={item.cat} />
              </button>
            )
            return (
              <button key={`p-${item.i}`} onClick={() => handleSelect(item)} className={base}>
                <Row dot="#5FA8D3" title={item.r || item.c || item.v || 'Plot'} sub={item.v} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ dot, title, badge, badgeClass, sub }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: dot }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{title}</span>
          {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{badge}</span>}
        </div>
        {sub && <div className="text-xs text-gray-500 truncate">{sub}</div>}
      </div>
    </div>
  )
}
