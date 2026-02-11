import React from 'react'
import { getColorForSymbology, getGroupForSymbology, ZONING_GROUPS } from '../../utils/colors'
import { formatArea, formatDimensions, formatFarmerName, formatNeighbour } from '../../utils/formatters'

export default function PlotDetailPanel({ plot, onClose }) {
  if (!plot) return null

  // Handle road type
  if (plot._type === 'road') {
    return (
      <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-2xl z-20 flex flex-col animate-slide-in">
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FFD700' }} />
                <span className="text-xs font-medium text-gray-600">Named Road</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{plot.name}</h2>
            </div>
            <CloseButton onClick={onClose} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll px-5 py-4 space-y-5">
          <Section title="Road Details">
            <InfoGrid items={[
              { label: 'Direction', value: plot.direction },
              { label: 'Classification', value: plot.classification },
              { label: 'Width', value: plot.width_m ? `${plot.width_m}m` : 'N/A' },
              { label: 'Segments', value: plot.segments },
            ]} />
          </Section>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-[10px] text-gray-400">Anchor-verified from APCRDA plot neighbour data</p>
        </div>
      </div>
    )
  }

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
      <div className="truncate">{displayValue === 'N/A' ? '—' : displayValue}</div>
    </div>
  )
}
