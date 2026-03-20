import React from 'react'
import useMapStore from '../../stores/mapStore'
import { getColorForSymbology, getGroupForSymbology, ZONING_GROUPS } from '../../utils/colors'
import { formatArea, formatDimensions, formatFarmerName, formatNeighbour } from '../../utils/formatters'
import { getRoadType, getROW, getRoadData, getLanePattern } from '../../utils/roadAttributes'

export default function PlotDetailPanel({ plot, onClose }) {
  const namedRoadsIndex = useMapStore((s) => s.namedRoadsIndex)

  if (!plot) return null

  // Handle landmark type
  if (plot._type === 'landmark') {
    const googleMapsLink = plot.lat && plot.lon
      ? `https://www.google.com/maps?q=${plot.lat},${plot.lon}`
      : null
    return (
      <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-2xl z-20 flex flex-col animate-slide-in">
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF6F00' }} />
                <span className="text-xs font-medium text-gray-600">Allocated Land</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{plot.name}</h2>
            </div>
            <CloseButton onClick={onClose} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll px-5 py-4 space-y-5">
          <Section title="Details">
            <InfoGrid items={[
              { label: 'Category', value: plot.category },
            ]} />
          </Section>
          {googleMapsLink && (
            <Section title="External Links">
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open in Google Maps
              </a>
            </Section>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-[10px] text-gray-400">Data source: APCRDA Land Allotments</p>
        </div>
      </div>
    )
  }

  // Handle road reserve type
  if (plot._type === 'road') {
    return (
      <RoadDetailPanel
        key={plot._locKey}
        plot={plot}
        onClose={onClose}
        namedRoadsIndex={namedRoadsIndex}
      />
    )
  }

  // Regular plot
  const color = getColorForSymbology(plot.symbology)
  const groupKey = getGroupForSymbology(plot.symbology)
  const groupLabel = ZONING_GROUPS[groupKey]?.label || plot.symbology || 'Unknown'

  const regcode = plot.regcode !== 'N/A' ? plot.regcode : null
  const plotCode = plot.plot_code !== 'N/A' ? plot.plot_code : null

  // Build Google Maps link
  let googleMapsLink = plot.googlemaplink
  if ((!googleMapsLink || googleMapsLink === 'N/A') && plot.lat && plot.lon) {
    googleMapsLink = `https://www.google.com/maps?q=${plot.lat},${plot.lon}`
  }

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-2xl z-20 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Zoning badge */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-gray-600 truncate">
                {groupLabel}
              </span>
            </div>
            {/* Regcode */}
            {regcode && (
              <h2 className="text-lg font-bold text-gray-900 leading-tight truncate" title={regcode}>
                {regcode}
              </h2>
            )}
            {/* Plot code */}
            {plotCode && plotCode !== regcode && (
              <p className="text-sm text-gray-500 truncate" title={plotCode}>
                Plot: {plotCode}
              </p>
            )}
          </div>
          <CloseButton onClick={onClose} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto panel-scroll px-5 py-4 space-y-5">

        {/* Zoning */}
        <Section title="Zoning">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border border-gray-200"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-800">{plot.symbology || 'N/A'}</span>
          </div>
        </Section>

        {/* Owner */}
        {plot.farmer_n && plot.farmer_n !== 'N/A' && (
          <Section title="Owner / Farmer">
            <p className="text-sm text-gray-800">
              {formatFarmerName(plot.farmer_n)}
            </p>
          </Section>
        )}

        {/* Location */}
        <Section title="Location">
          <InfoGrid items={[
            { label: 'Village', value: plot.village },
            { label: 'Township', value: plot.township },
            { label: 'Sector', value: plot.sector },
            { label: 'Colony', value: plot.colony },
            { label: 'Block', value: plot.block },
            { label: 'Plot No', value: plot.plot_no },
          ]} />
        </Section>

        {/* Area & Dimensions */}
        <Section title="Area & Dimensions">
          <InfoGrid items={[
            { label: 'Allotted Area', value: formatArea(plot.alloted_ex, plot.nbr || 'Sq.Yards') },
            { label: 'Dimensions', value: formatDimensions(plot.polylength, plot.polywidth) },
            { label: 'Category', value: plot.plot_categ },
          ]} />
        </Section>

        {/* Neighbours */}
        <Section title="Neighbours">
          <div className="grid grid-cols-3 gap-1 text-center">
            <div />
            <NeighbourCell label="N" value={plot.regcode_n} />
            <div />
            <NeighbourCell label="W" value={plot.regcode_w} />
            <div className="bg-orange-50 rounded p-1.5 text-xs font-medium text-orange-700">
              This Plot
            </div>
            <NeighbourCell label="E" value={plot.regcode_e} />
            <div />
            <NeighbourCell label="S" value={plot.regcode_s} />
            <div />
          </div>
        </Section>

        {/* Google Maps Link */}
        {googleMapsLink && googleMapsLink !== 'N/A' && (
          <Section title="External Links">
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open in Google Maps
            </a>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
        <p className="text-[10px] text-gray-400">
          Data source: APCRDA Land Pooling Scheme
        </p>
      </div>
    </div>
  )
}

// Helper components
function CloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
    >
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {items.map(({ label, value }) => (
        <div key={label}>
          <span className="text-xs text-gray-500">{label}</span>
          <p className="text-sm text-gray-800 font-medium">
            {value || 'N/A'}
          </p>
        </div>
      ))}
    </div>
  )
}

function NeighbourCell({ label, value }) {
  const displayValue = formatNeighbour(value)
  const isRoad = displayValue.includes('mtr Road') || displayValue.includes('Walkway')
  const isVacant = displayValue.includes('Vacant')

  return (
    <div
      className={`rounded p-1.5 text-[10px] leading-tight ${
        isRoad ? 'bg-gray-100 text-gray-600' :
        isVacant ? 'bg-yellow-50 text-yellow-700' :
        'bg-slate-50 text-slate-600'
      }`}
      title={displayValue}
    >
      <div className="font-semibold text-[9px] text-gray-400 mb-0.5">{label}</div>
      <div className="truncate">{displayValue === 'N/A' ? '\u2014' : displayValue}</div>
    </div>
  )
}

function RoadDetailPanel({ plot, onClose, namedRoadsIndex = [] }) {
  const [roadName, setRoadName] = React.useState(plot._roadName || plot._inferredRoadName || '')
  const [saved, setSaved] = React.useState(!!plot._roadName)
  const [isUnnamed, setIsUnnamed] = React.useState(!!plot._isUnnamed)
  const displayName = (plot._roadName || roadName) || ''
  const roadMeta = namedRoadsIndex.find(r => (r.name || '').toUpperCase() === displayName.toUpperCase())
  const meets = (roadMeta && roadMeta.meets) || []

  const googleMapsLink = plot.lat && plot.lon
    ? `https://www.google.com/maps?q=${plot.lat},${plot.lon}`
    : null

  function refreshNamedRoads() {
    useMapStore.getState()._refreshNamedRoads?.()
  }

  function handleSave() {
    if (!plot._locKey || !roadName.trim()) return
    try {
      const roadNames = JSON.parse(localStorage.getItem('roadNames') || '{}')
      roadNames[plot._locKey] = roadName.trim()
      localStorage.setItem('roadNames', JSON.stringify(roadNames))
      // Remove from unnamed set if it was there
      removeFromUnnamed(plot._locKey)
      setSaved(true)
      setIsUnnamed(false)
      refreshNamedRoads()
    } catch (e) { /* ignore */ }
  }

  function handleClear() {
    if (!plot._locKey) return
    try {
      const roadNames = JSON.parse(localStorage.getItem('roadNames') || '{}')
      delete roadNames[plot._locKey]
      localStorage.setItem('roadNames', JSON.stringify(roadNames))
      setRoadName('')
      setSaved(false)
      refreshNamedRoads()
    } catch (e) { /* ignore */ }
  }

  function handleMarkUnnamed() {
    if (!plot._locKey) return
    try {
      const raw = JSON.parse(localStorage.getItem('roadUnnamed') || '[]')
      const set = new Set(raw)
      set.add(plot._locKey)
      localStorage.setItem('roadUnnamed', JSON.stringify([...set]))
      // Also clear any saved name
      const roadNames = JSON.parse(localStorage.getItem('roadNames') || '{}')
      delete roadNames[plot._locKey]
      localStorage.setItem('roadNames', JSON.stringify(roadNames))
      setIsUnnamed(true)
      setRoadName('')
      setSaved(false)
      refreshNamedRoads()
    } catch (e) { /* ignore */ }
  }

  function handleMarkNamed() {
    if (!plot._locKey) return
    removeFromUnnamed(plot._locKey)
    setIsUnnamed(false)
    refreshNamedRoads()
  }

  function removeFromUnnamed(key) {
    try {
      const raw = JSON.parse(localStorage.getItem('roadUnnamed') || '[]')
      const set = new Set(raw)
      set.delete(key)
      localStorage.setItem('roadUnnamed', JSON.stringify([...set]))
    } catch (e) { /* ignore */ }
  }

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-2xl z-20 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded bg-gray-800 border border-gray-600" />
              <span className="text-xs font-medium text-gray-600">Road Reserve</span>
              {plot._segmentId != null && (
                <span className="text-3xl font-mono font-bold text-orange-500 ml-auto">
                  #{String(plot._segmentId).padStart(4, '0')}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {isUnnamed ? 'Marked as Unnamed' : (plot._roadName || 'Unnamed Road')}
            </h2>
            <p className="text-sm text-gray-500">{plot.symbology}</p>
          </div>
          <CloseButton onClick={onClose} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto panel-scroll px-5 py-4 space-y-5">

        {/* Named / Unnamed Toggle */}
        <Section title="Road Status">
          <div className="flex gap-4">
            <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${
              !isUnnamed ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                name="roadStatus"
                checked={!isUnnamed}
                onChange={handleMarkNamed}
                className="accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Named</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${
              isUnnamed ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                name="roadStatus"
                checked={isUnnamed}
                onChange={handleMarkUnnamed}
                className="accent-red-600"
              />
              <span className="text-sm font-medium text-gray-700">Unnamed</span>
            </label>
          </div>
          {isUnnamed && (
            <p className="mt-2 text-xs text-red-600">This segment is excluded from named road rendering.</p>
          )}
        </Section>

        {/* Road Name Editor (only when not marked unnamed) */}
        {!isUnnamed && (
        <Section title="Road Name">
          <div className="flex gap-2">
            <input
              type="text"
              value={roadName}
              onChange={(e) => { setRoadName(e.target.value); setSaved(false) }}
              placeholder="e.g. E8, N3..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSave}
              disabled={!roadName.trim() || saved}
              className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                saved
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
          {saved && roadName && (
            <button
              onClick={handleClear}
              className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
            >
              Remove name
            </button>
          )}
        </Section>
        )}

        {/* Road attributes (from Amaravati road data) */}
        {getRoadData(displayName) && (() => {
          const rd = getRoadData(displayName)
          const star = rd.confidence === 'B' ? ' *' : rd.confidence === 'C' ? ' **' : ''
          const laneDesc = rd.brt_lanes > 0
            ? `${rd.carriageway_lanes} + ${rd.brt_lanes} BRT + ${rd.carriageway_lanes}`
            : `${rd.carriageway_lanes} + ${rd.carriageway_lanes}`
          return (
            <Section title="Road attributes">
              <InfoGrid items={[
                { label: 'Type', value: (rd.category || '\u2014') + star },
                { label: 'ROW', value: rd.row_m ? `${rd.row_m} m${star}` : '\u2014' },
                { label: 'Lane Pattern', value: rd.lane_pattern ? `${rd.lane_pattern} (${laneDesc})${star}` : '\u2014' },
                { label: 'Orientation', value: rd.orientation || '\u2014' },
              ]} />
              <div className="flex gap-3 mt-2">
                {rd.brt_present && (
                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">BRT</span>
                )}
                {rd.connects_nh16 && (
                  <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">NH-16</span>
                )}
              </div>
              {star && (
                <p className="text-[9px] text-gray-400 mt-1">* high confidence | ** indicative</p>
              )}
            </Section>
          )
        })()}

        {/* Junctions: which roads this one meets (for directions) */}
        {meets.length > 0 && (
          <Section title="Connects to">
            <p className="text-sm text-gray-700">
              {meets.sort((a, b) => a.localeCompare(b)).join(', ')}
            </p>
          </Section>
        )}

        {/* Area */}
        <Section title="Area">
          <InfoGrid items={[
            { label: 'Reserve Area', value: formatArea(plot.alloted_ex, plot.nbr || 'Sq.Yards') },
          ]} />
        </Section>

        {/* Location (when available) */}
        {plot.village && plot.village !== 'N/A' && (
          <Section title="Location">
            <InfoGrid items={[
              { label: 'Village', value: plot.village },
              { label: 'Township', value: plot.township && plot.township !== '0' && plot.township !== 0 ? plot.township : undefined },
            ]} />
          </Section>
        )}

        {/* Coordinates */}
        {plot.lat && plot.lon && (
          <Section title="Position">
            <InfoGrid items={[
              { label: 'Latitude', value: typeof plot.lat === 'number' ? plot.lat.toFixed(6) : plot.lat },
              { label: 'Longitude', value: typeof plot.lon === 'number' ? plot.lon.toFixed(6) : plot.lon },
            ]} />
          </Section>
        )}

        {/* Google Maps Link */}
        {googleMapsLink && (
          <Section title="External Links">
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open in Google Maps
            </a>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
        <p className="text-[10px] text-gray-400">Click road segments to name them. Names saved in browser.</p>
      </div>
    </div>
  )
}
