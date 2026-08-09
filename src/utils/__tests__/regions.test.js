import { describe, it, expect } from 'vitest'
import { buildAxes, computeNode } from '../regions'

/**
 * Fixture mirroring named_roads_index.json's real shape: N-S roads carry a
 * longitude `axis`, E-W roads a latitude `axis`, and E3 is the diagonal
 * "seed access" road that must never enter the grid.
 */
const ROADS = [
  { name: 'N1', orientation: 'N-S', category: 'arterial', axis: 80.45 },
  { name: 'N2', orientation: 'N-S', category: 'arterial', axis: 80.50 },
  { name: 'N3', orientation: 'N-S', category: 'sub-arterial', axis: 80.55 },
  { name: 'E1', orientation: 'E-W', category: 'arterial', axis: 16.50 },
  { name: 'E2', orientation: 'E-W', category: 'sub-arterial', axis: 16.55 },
  { name: 'E4', orientation: 'E-W', category: 'arterial', axis: 16.60 },
  // The Seed Capital Road: diagonal, must be excluded from the axis stacks.
  { name: 'E3', orientation: 'E-W', category: 'seed access', axis: 16.52 },
]

describe('buildAxes', () => {
  it('excludes the diagonal seed-access road from both stacks', () => {
    const { N, E } = buildAxes(ROADS)
    expect(E.map((r) => r.name)).not.toContain('E3')
    expect([...N, ...E].map((r) => r.name)).not.toContain('E3')
  })

  it('splits by orientation and sorts each stack by axis', () => {
    const { N, E } = buildAxes(ROADS)
    expect(N.map((r) => r.name)).toEqual(['N1', 'N2', 'N3'])
    expect(E.map((r) => r.name)).toEqual(['E1', 'E2', 'E4'])
    expect(N.map((r) => r.axis)).toEqual([...N.map((r) => r.axis)].sort((a, b) => a - b))
    expect(E.map((r) => r.axis)).toEqual([...E.map((r) => r.axis)].sort((a, b) => a - b))
  })

  it('parses the numeric road number, including lettered roads like N3A', () => {
    const { N } = buildAxes([{ name: 'N3A', orientation: 'N-S', category: 'arterial', axis: 80.4 }])
    expect(N[0].n).toBe(3)
  })

  it('falls back to center[] when axis is absent', () => {
    const { N, E } = buildAxes([
      { name: 'N9', orientation: 'N-S', category: 'arterial', center: [80.52, 16.53] },
      { name: 'E9', orientation: 'E-W', category: 'arterial', center: [80.52, 16.53] },
    ])
    expect(N[0].axis).toBe(80.52) // N-S brackets on longitude
    expect(E[0].axis).toBe(16.53) // E-W brackets on latitude
  })
})

describe('computeNode', () => {
  it('labels a cell with the LOWER road number of each bounding pair', () => {
    // lon 80.52 sits between N2 and N3; lat 16.57 between E2 and E4.
    const r = computeNode(80.52, 16.57, ROADS)
    expect(r.code).toBe('Node 2·2')
    expect(r.between).toBe('N2–N3 × E2–E4')
  })

  it('uses the owner spec example: N7-N8 x E3-E4 => Node 7.3', () => {
    const roads = [
      { name: 'N7', orientation: 'N-S', category: 'arterial', axis: 80.40 },
      { name: 'N8', orientation: 'N-S', category: 'arterial', axis: 80.60 },
      { name: 'E3', orientation: 'E-W', category: 'arterial', axis: 16.40 },
      { name: 'E4', orientation: 'E-W', category: 'arterial', axis: 16.60 },
    ]
    expect(computeNode(80.50, 16.50, roads).code).toBe('Node 7·3')
  })

  it('uses a dot separator so two-digit cells stay unambiguous', () => {
    const roads = [
      { name: 'N12', orientation: 'N-S', category: 'arterial', axis: 80.40 },
      { name: 'N13', orientation: 'N-S', category: 'arterial', axis: 80.60 },
      { name: 'E10', orientation: 'E-W', category: 'arterial', axis: 16.40 },
      { name: 'E11', orientation: 'E-W', category: 'arterial', axis: 16.60 },
    ]
    expect(computeNode(80.5, 16.5, roads).code).toBe('Node 12·10')
  })

  it('marks grid edges when only one road brackets the point', () => {
    const west = computeNode(80.40, 16.57, ROADS) // west of N1
    expect(west.code).toBe('Node 1·2')
    expect(west.between).toContain('N1 (edge)')

    const north = computeNode(80.52, 16.70, ROADS) // north of E4
    expect(north.code).toBe('Node 2·4')
    expect(north.between).toContain('E4 (edge)')
  })

  it('is inclusive at a road axis: a point ON N2 belongs to the cell N2 opens', () => {
    expect(computeNode(80.50, 16.57, ROADS).code).toBe('Node 2·2')
  })

  it('returns null for missing coordinates or an empty road index', () => {
    expect(computeNode(null, 16.5, ROADS)).toBeNull()
    expect(computeNode(80.5, null, ROADS)).toBeNull()
    expect(computeNode(80.5, 16.5, [])).toBeNull()
    expect(computeNode(80.5, 16.5, null)).toBeNull()
  })

  it('returns null when one orientation is missing entirely', () => {
    const onlyNS = ROADS.filter((r) => r.orientation === 'N-S')
    expect(computeNode(80.5, 16.5, onlyNS)).toBeNull()
  })
})
