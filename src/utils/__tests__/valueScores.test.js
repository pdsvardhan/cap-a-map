import { describe, it, expect } from 'vitest'
import { rampColor, lookupRegionScore, buildValueColorExpression, buildNodeCodeExpression } from '../valueScores'
import { RAMP } from '../designTokens'

const ROADS = [
  { name: 'N1', orientation: 'N-S', category: 'arterial', axis: 80.45 },
  { name: 'N2', orientation: 'N-S', category: 'arterial', axis: 80.55 },
  { name: 'E1', orientation: 'E-W', category: 'arterial', axis: 16.50 },
  { name: 'E2', orientation: 'E-W', category: 'arterial', axis: 16.60 },
]
const NO_DATA = 'rgba(120,120,120,0.25)'

describe('rampColor', () => {
  it('returns a hex colour across the whole 0..100 range', () => {
    for (const s of [0, 1, 25, 50, 75, 99, 100]) {
      expect(rampColor(s)).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('anchors the ends of the design ramp', () => {
    expect(rampColor(0).toLowerCase()).toBe(RAMP[0].toLowerCase())
    expect(rampColor(100).toLowerCase()).toBe(RAMP[RAMP.length - 1].toLowerCase())
  })

  it('clamps out-of-range scores instead of producing garbage', () => {
    expect(rampColor(-40)).toBe(rampColor(0))
    expect(rampColor(1e6)).toBe(rampColor(100))
  })

  it('renders a missing score as no-data, never as the bottom of the ramp', () => {
    expect(rampColor(null)).toBe(NO_DATA)
    expect(rampColor(undefined)).toBe(NO_DATA)
    expect(rampColor(null)).not.toBe(rampColor(0))
  })

  it('is monotonic in the sense that distinct scores map to distinct colours', () => {
    const seen = new Set([0, 20, 40, 60, 80, 100].map(rampColor))
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('lookupRegionScore', () => {
  const scores = { 'Node 1·1': { c: 80, r: 60, drivers: ['x'] } }

  it('returns the cell for a known code', () => {
    expect(lookupRegionScore(scores, 'Node 1·1')).toEqual({ c: 80, r: 60, drivers: ['x'] })
  })

  it('returns null rather than throwing on unknown or missing input', () => {
    expect(lookupRegionScore(scores, 'Node 9·9')).toBeNull()
    expect(lookupRegionScore(scores, null)).toBeNull()
    expect(lookupRegionScore(null, 'Node 1·1')).toBeNull()
  })
})

describe('buildValueColorExpression', () => {
  const scores = { 'Node 1·1': { c: 90, r: 10 } }

  it('selects the lens: commercial and residential differ for the same cell', () => {
    const c = JSON.stringify(buildValueColorExpression(ROADS, scores, 'commercial'))
    const r = JSON.stringify(buildValueColorExpression(ROADS, scores, 'residential'))
    expect(c).not.toBe(r)
    expect(c).toContain(rampColor(90))
    expect(r).toContain(rampColor(10))
  })

  it('guards missing coordinates so a plot is never coloured from cell zero', () => {
    // Regression guard: to-number maps null -> 0, which would step-evaluate to the
    // westernmost cell and colour a plot the panel reports as having no region.
    const expr = buildValueColorExpression(ROADS, scores, 'commercial')
    expect(expr[0]).toBe('case')
    expect(JSON.stringify(expr[1])).toContain('has')
    expect(expr[2]).toBe(NO_DATA)
  })

  it('falls back to no-data when there are no scores or no roads', () => {
    expect(buildValueColorExpression(ROADS, null, 'commercial')).toBe(NO_DATA)
    expect(buildValueColorExpression([], scores, 'commercial')).toBe(NO_DATA)
    expect(buildValueColorExpression(ROADS, {}, 'commercial')).toBe(NO_DATA)
  })

  it('skips cells whose lens value is null instead of emitting a broken match arm', () => {
    const partial = { 'Node 1·1': { c: 50, r: null } }
    expect(buildValueColorExpression(ROADS, partial, 'residential')).toBe(NO_DATA)
    expect(buildValueColorExpression(ROADS, partial, 'commercial')).not.toBe(NO_DATA)
  })
})

describe('buildNodeCodeExpression', () => {
  it('returns null for an empty or missing road index', () => {
    expect(buildNodeCodeExpression([])).toBeNull()
    expect(buildNodeCodeExpression(null)).toBeNull()
  })

  it('emits a concat expression that reads lon and lat from feature properties', () => {
    const expr = buildNodeCodeExpression(ROADS)
    expect(expr[0]).toBe('concat')
    const s = JSON.stringify(expr)
    expect(s).toContain('"lon"')
    expect(s).toContain('"lat"')
    expect(s).toContain('Node ')
  })
})
