import React from 'react'
import useMapStore from '../../stores/mapStore'
import { getColorForSymbology, getGroupForSymbology, ZONING_GROUPS, getZoneName, getAllocatedLandColor } from '../../utils/colors'
import { formatArea, formatDimensions, formatFarmerName, formatNeighbour } from '../../utils/formatters'
import { getRoadVillages, getRoadLengthKm } from '../../utils/roadAttributes'
import { NAMED_ROAD_COLOR, SHOW_OWNER_NAMES } from '../../utils/constants'
import { computeNode } from '../../utils/regions'
import { lookupRegionScore, rampColor } from '../../utils/valueScores'

export default function PlotDetailPanel({ plot, onClose }) {
  const namedRoadsIndex = useMapStore((s) => s.namedRoadsIndex)
  const regionScores = useMapStore((s) => s.regionScores)

  if (!plot) return null

  // Handle landmark type
  if (plot._type === 'landmark') {
    const googleMapsLink = plot.lat && plot.lon
      ? `https://www.google.com/maps?q=${plot.lat},${plot.lon}`
      : null
    return (
      <div className="glass absolute z-20 flex flex-col animate-slide-in inset-x-0 bottom-0 h-[72%] rounded-t-2xl sm:inset-auto sm:top-0 sm:right-0 sm:w-[380px] sm:h-full sm:rounded-t-none sm:border-l">
        <div className="px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getAllocatedLandColor(plot.category) }} />
                <span className="text-xs font-medium text-[var(--text-2)]">Allotted institution</span>
              </div>
              <h2 className="text-lg font-bold text-[var(--text-1)]">{plot.name}</h2>
            </div>
            <CloseButton onClick={onClose} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll px-5 py-4 space-y-5">
          <Section title="Allotment">
            <InfoGrid items={[
              { label: 'Category', value: plot.category },
              { label: 'FSI', value: plot.fsi },
              { label: 'On zone', value: plot.zoning ? getZoneName(plot.zoning) : undefined },
            ]} />
            <p className="text-[10px] text-[var(--text-3)] mt-1.5">A named entity allotted this land. The plot's zoning district is shown above; the institution is the allotment on it.</p>
          </Section>
          {googleMapsLink && (
            <Section title="External Links">
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:brightness-125 hover:underline"
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
        <div className="px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
          <p className="text-[10px] text-[var(--text-3)]">Data source: APCRDA Land Allotments</p>
        </div>
      </div>
    )
  }

  // Named road (public read-only info)
  if (plot._type === 'road') {
    return <RoadInfoPanel plot={plot} onClose={onClose} />
  }

  // Regular plot
  const color = getColorForSymbology(plot.symbology)
  const groupKey = plot.zoning_group || getGroupForSymbology(plot.symbology)
  const groupLabel = ZONING_GROUPS[groupKey]?.label || plot.symbology || 'Unknown'

  const regcode = plot.regcode && plot.regcode !== 'N/A' ? plot.regcode : null
  const plotCode = plot.plot_code && plot.plot_code !== 'N/A' ? plot.plot_code : null

  const googleMapsLink = (plot.lat && plot.lon)
    ? `https://www.google.com/maps?q=${plot.lat},${plot.lon}`
    : null

  // Custom site region (the road-grid "Node" cell this plot falls in)
  const node = computeNode(plot.lon, plot.lat, namedRoadsIndex)
  // Relative desirability for that region (adr-008)
  const score = lookupRegionScore(regionScores?.cells, node?.code)

  return (
    <div className="glass absolute z-20 flex flex-col animate-slide-in inset-x-0 bottom-0 h-[72%] rounded-t-2xl sm:inset-auto sm:top-0 sm:right-0 sm:w-[380px] sm:h-full sm:rounded-t-none sm:border-l">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Zoning badge */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-[var(--text-2)] truncate">
                {groupLabel}
              </span>
            </div>
            {/* Regcode */}
            {regcode && (
              <h2 className="text-base font-semibold text-[var(--text-1)] leading-tight truncate mono" title={regcode}>
                {regcode}
              </h2>
            )}
            {/* Plot code */}
            {plotCode && plotCode !== regcode && (
              <p className="text-sm text-[var(--text-3)] truncate" title={plotCode}>
                Plot: {plotCode}
              </p>
            )}
          </div>
          <CloseButton onClick={onClose} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto panel-scroll px-5 py-4 space-y-5">

        {/* Zoning — official APCRDA 2015 zone name */}
        <Section title="Zoning">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border border-[var(--border)] flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-[var(--text-1)]">{getZoneName(plot.symbology) || 'N/A'}</span>
          </div>
        </Section>

        {/* Owner — personal data, hidden in the public view (see SHOW_OWNER_NAMES). */}
        {SHOW_OWNER_NAMES && plot.farmer_n && plot.farmer_n !== 'N/A' && (
          <Section title="Owner / Farmer">
            <p className="text-sm text-[var(--text-1)]">
              {formatFarmerName(plot.farmer_n)}
            </p>
          </Section>
        )}

        {/* Location */}
        <Section title="Location">
          <InfoGrid items={[
            { label: 'Region', value: node?.code },
            { label: 'Village', value: plot.village_na ? 'N/A' : plot.village },
            { label: 'Township', value: plot.township },
            { label: 'Sector', value: plot.sector },
            { label: 'Block', value: plot.block },
            { label: 'Colony', value: plot.colony },
            { label: 'Plot No', value: plot.plot_no },
            { label: 'Coordinates', value: (plot.lat && plot.lon) ? `${Number(plot.lat).toFixed(5)}, ${Number(plot.lon).toFixed(5)}` : undefined },
          ]} />
          {node?.between && (
            <p className="text-[10px] text-[var(--text-3)] mt-1.5">Between {node.between}</p>
          )}
        </Section>

        {/* Relative desirability for this 1km region (adr-008) */}
        {score && (
          <Section title="Desirability (relative)">
            <div className="grid grid-cols-2 gap-3">
              <ScoreBar label="Commercial" value={score.c} />
              <ScoreBar label="Residential" value={score.r} />
            </div>
            {Array.isArray(score.drivers) && score.drivers.length > 0 && (
              <div className="mt-3">
                <span className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">Why</span>
                <ul className="mt-1 space-y-0.5">
                  {score.drivers.map((d) => (
                    <li key={d} className="text-[11px] text-[var(--text-2)]">· {d}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[10px] text-[var(--text-3)] mt-2 leading-relaxed">
              A relative index for this 1km region — not a price, and not per-plot. Built from
              status-weighted anchors, road access and FSI; may diverge from broker asking prices.
            </p>
          </Section>
        )}

        {/* Adjacent plots — adj_plots is an array of "dir:regcode" strings (pipeline 01_clean),
            and arrives JSON-stringified from the vector tiles. Parse both shapes defensively. */}
        {(() => {
          let adj = plot.adj_plots
          if (typeof adj === 'string') { try { adj = JSON.parse(adj) } catch { adj = [] } }
          if (!Array.isArray(adj) || adj.length === 0) return null
          const DIRS = { n: 'North', s: 'South', e: 'East', w: 'West' }
          const items = adj.map((a) => {
            let dir, val
            if (typeof a === 'string') {
              const i = a.indexOf(':')
              dir = i >= 0 ? a.slice(0, i) : ''
              val = i >= 0 ? a.slice(i + 1).trim() : a
            } else { dir = a?.dir; val = a?.regcode }
            return { label: DIRS[dir] || dir || '—', value: formatNeighbour(val) }
          })
          return (
            <Section title="Adjacent plots">
              <InfoGrid items={items} />
            </Section>
          )
        })()}

        {/* Area & Frontage */}
        <Section title="Area & Frontage">
          <InfoGrid items={[
            { label: 'Plot Area', value: formatArea(plot.area_sqyd, 'Sq.Yards') },
            { label: 'Dimensions', value: formatDimensions(plot.polylength, plot.polywidth) },
            { label: 'Road Frontage', value: plot.max_frontage_m ? `${plot.max_frontage_m} m` : '—' },
            { label: 'Category', value: plot.plot_categ },
          ]} />
        </Section>

        {/* Google Maps Link */}
        {googleMapsLink && googleMapsLink !== 'N/A' && (
          <Section title="External Links">
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:brightness-125 hover:underline"
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
      <div className="px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
        <p className="text-[10px] text-[var(--text-3)]">
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
      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 ml-2"
    >
      <svg className="w-5 h-5 text-[var(--text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function ScoreBar({ label, value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">{label}</span>
        <span className="text-sm font-semibold text-[var(--text-1)] mono">{v}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: rampColor(v) }} />
      </div>
    </div>
  )
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {items.map(({ label, value }) => (
        <div key={label}>
          <span className="text-[11px] uppercase tracking-wide text-[var(--text-3)]">{label}</span>
          <p className="text-sm text-[var(--text-1)] font-medium mono mt-0.5">
            {value || '—'}
          </p>
        </div>
      ))}
    </div>
  )
}

function RoadInfoPanel({ plot, onClose }) {
  const color = NAMED_ROAD_COLOR
  const meets = plot.meets || []
  // Enrichment from the canonical road table (WB EIA): villages traversed +
  // length fallback when the roads index didn't carry a computed length_km.
  const villages = getRoadVillages(plot.name)
  const lengthKm = plot.length_km != null ? plot.length_km : getRoadLengthKm(plot.name)
  return (
    <div className="glass absolute z-20 flex flex-col animate-slide-in inset-x-0 bottom-0 h-[72%] rounded-t-2xl sm:inset-auto sm:top-0 sm:right-0 sm:w-[380px] sm:h-full sm:rounded-t-none sm:border-l">
      <div className="px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
              <span className="text-xs font-medium text-[var(--text-2)] capitalize">Named Road · {plot.category || 'road'}</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-1)]">{plot.name}</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <div className="flex gap-2 mt-2">
          {plot.brt_present && <span className="text-[10px] px-2 py-0.5 bg-sky-400/15 text-sky-300 rounded-full font-medium">BRT corridor</span>}
          {plot.connects_nh16 && <span className="text-[10px] px-2 py-0.5 bg-emerald-400/15 text-emerald-300 rounded-full font-medium">Connects NH-16</span>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto panel-scroll px-5 py-4 space-y-5">
        <Section title="Classification">
          <InfoGrid items={[
            { label: 'Category', value: plot.category },
            { label: 'Orientation', value: plot.orientation },
            { label: 'Right of Way', value: plot.row_m ? `${plot.row_m} m` : undefined },
            { label: 'Lane Pattern', value: plot.lane_pattern },
          ]} />
        </Section>
        {meets.length > 0 && (
          <Section title="Connects to">
            <div className="flex flex-wrap gap-1.5">
              {meets.map((m) => <span key={m} className="text-xs px-2 py-0.5 bg-white/[0.07] text-[var(--text-2)] rounded font-medium">{m}</span>)}
            </div>
          </Section>
        )}
        <Section title="Geometry">
          <InfoGrid items={[
            { label: 'Length', value: lengthKm != null ? `${lengthKm} km` : undefined },
          ]} />
        </Section>
        {villages.length > 0 && (
          <Section title="Villages traversed">
            <div className="flex flex-wrap gap-1.5">
              {villages.map((v) => (
                <span key={v} className="text-xs px-2 py-0.5 bg-white/[0.07] text-[var(--text-2)] rounded font-medium">{v}</span>
              ))}
            </div>
          </Section>
        )}
        {plot.remarks && (
          <Section title="Notes"><p className="text-sm text-[var(--text-2)]">{plot.remarks}</p></Section>
        )}
      </div>
      <div className="px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
        <p className="text-[10px] text-[var(--text-3)]">Source: APCRDA Trunk Road Network (official)</p>
      </div>
    </div>
  )
}

