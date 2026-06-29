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
      setQuery(item.n)
      const meta = useMapStore.getState().namedRoadsIndex.find((r) => r.name === item.n)
      if (meta) {
        if (map && meta.bbox?.length === 4) { try { map.fitBounds(meta.bbox, { padding: 90, duration: 1000, maxZoom: 16 }) } catch (e) { /* */ } }
        selectPlot({ _type: 'road', ...meta })
      }
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
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg className="w-[18px] h-[18px] text-[var(--text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className="glass w-full pl-11 pr-10 py-3 rounded-2xl outline-none text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-weak),var(--shadow)]"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="glass absolute top-full mt-2 w-full rounded-2xl max-h-80 overflow-y-auto panel-scroll z-50 animate-[fade-up_.18s_ease]">
          <div className="px-3.5 py-2 text-[11px] uppercase tracking-wider text-[var(--text-3)] border-b border-[var(--border)] mono">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          {results.map((result, idx) => {
            const item = result.item
            const sel = idx === selectedIndex
            const base = `w-full text-left px-3.5 py-2.5 hover:bg-white/[0.06] border-b border-[var(--border)] last:border-0 transition-colors ${sel ? 'bg-white/[0.06]' : ''}`
            if (item.t === 'road') return (
              <button key={`r-${item.n}`} onClick={() => handleSelect(item)} className={base}>
                <Row dot="#FFA64D" title={item.n} mono badge="Road" badgeClass="bg-amber-400/15 text-amber-300" />
              </button>
            )
            if (item.t === 'landmark') return (
              <button key={`l-${item.n}-${idx}`} onClick={() => handleSelect(item)} className={base}>
                <Row dot="#FF8C42" title={truncate(item.n, 40)} badge="Landmark" badgeClass="bg-orange-400/15 text-orange-300" sub={item.cat} />
              </button>
            )
            return (
              <button key={`p-${item.i}`} onClick={() => handleSelect(item)} className={base}>
                <Row dot="#5FA8D3" title={item.r || item.c || item.v || 'Plot'} mono sub={item.v} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ dot, title, badge, badgeClass, sub, mono }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white/10" style={{ backgroundColor: dot }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium text-[var(--text-1)] truncate ${mono ? 'mono' : ''}`}>{title}</span>
          {badge && <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-md font-semibold ${badgeClass}`}>{badge}</span>}
        </div>
        {sub && <div className="text-xs text-[var(--text-3)] truncate">{sub}</div>}
      </div>
    </div>
  )
}
