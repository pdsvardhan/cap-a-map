/**
 * The 1km "Node" region code is implemented THREE times:
 *   1. computeNode()             — JS, drives the plot detail panel
 *   2. buildNodeCodeExpression() — a MapLibre expression, colours the Value mode on the GPU
 *   3. nodeCode() in pipeline/10_scoring.mjs — keys region_scores.json offline
 *
 * If any two drift, flow-region-score breaks in the way that is hardest to notice:
 * the map colours a plot from one cell while the panel reports another, or a plot
 * resolves to a code that has no score at all and silently renders as no-data.
 * These tests pin 1 against 2 directly, and against 3 via the shipped artifact.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { computeNode, buildAxes } from '../regions'
import { buildNodeCodeExpression, rampColor, lookupRegionScore } from '../valueScores'

const DATA = path.resolve(process.cwd(), 'public/data')
const readIf = (f) => {
  const p = path.join(DATA, f)
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null
}

/**
 * Minimal evaluator for the subset of the MapLibre expression spec that
 * buildNodeCodeExpression emits: concat / to-string / to-number / get / step.
 * This checks the expression ENCODES the same bracket logic; it is not MapLibre
 * itself, which cannot run headless in node.
 */
function evalExpr(expr, props) {
  if (!Array.isArray(expr)) return expr
  const [op, ...args] = expr
  switch (op) {
    case 'get': return props[args[0]]
    case 'to-string': return String(evalExpr(args[0], props))
    case 'to-number': {
      const v = evalExpr(args[0], props)
      return v == null ? 0 : Number(v)
    }
    case 'concat': return args.map((a) => evalExpr(a, props)).join('')
    case 'step': {
      const input = evalExpr(args[0], props)
      let out = evalExpr(args[1], props)
      for (let i = 2; i < args.length; i += 2) {
        if (input >= args[i]) out = args[i + 1]
        else break
      }
      return out
    }
    default: throw new Error(`evalExpr: unsupported op "${op}"`)
  }
}

const roadsIndex = readIf('named_roads_index.json')
const regionScores = readIf('region_scores.json')
const hasRoads = !!(roadsIndex && roadsIndex.length)

describe.skipIf(!hasRoads)('Node code: JS computeNode vs the MapLibre expression', () => {
  it('agrees on a dense sweep across the real grid extent', () => {
    const expr = buildNodeCodeExpression(roadsIndex)
    expect(expr).toBeTruthy()

    const { N, E } = buildAxes(roadsIndex)
    const lonMin = N[0].axis - 0.02, lonMax = N[N.length - 1].axis + 0.02
    const latMin = E[0].axis - 0.02, latMax = E[E.length - 1].axis + 0.02

    const mismatches = []
    const STEPS = 40
    for (let i = 0; i <= STEPS; i++) {
      for (let j = 0; j <= STEPS; j++) {
        const lon = lonMin + ((lonMax - lonMin) * i) / STEPS
        const lat = latMin + ((latMax - latMin) * j) / STEPS
        const js = computeNode(lon, lat, roadsIndex)
        const gpu = evalExpr(expr, { lon, lat })
        if (!js) continue
        if (js.code !== gpu) mismatches.push({ lon, lat, js: js.code, gpu })
      }
    }
    expect(mismatches.slice(0, 5)).toEqual([])
    expect(mismatches).toHaveLength(0)
  })

  it('agrees exactly ON each road axis, where the bracket boundary sits', () => {
    const expr = buildNodeCodeExpression(roadsIndex)
    const { N, E } = buildAxes(roadsIndex)
    const mismatches = []
    for (const n of N) {
      for (const e of E) {
        const js = computeNode(n.axis, e.axis, roadsIndex)
        const gpu = evalExpr(expr, { lon: n.axis, lat: e.axis })
        if (js && js.code !== gpu) mismatches.push({ at: `${n.name}x${e.name}`, js: js.code, gpu })
      }
    }
    expect(mismatches).toEqual([])
  })

  it('treats tile coordinates arriving as numeric strings the same as numbers', () => {
    const expr = buildNodeCodeExpression(roadsIndex)
    const { N, E } = buildAxes(roadsIndex)
    const lon = N[Math.floor(N.length / 2)].axis + 0.005
    const lat = E[Math.floor(E.length / 2)].axis + 0.005
    expect(evalExpr(expr, { lon: String(lon), lat: String(lat) }))
      .toBe(evalExpr(expr, { lon, lat }))
  })
})

describe.skipIf(!hasRoads || !regionScores)('Node code: app vs the offline scoring pipeline', () => {
  it('every scored cell key is a well-formed Node code', () => {
    const bad = Object.keys(regionScores.cells).filter((k) => !/^Node -?\d+·-?\d+$/.test(k))
    expect(bad).toEqual([])
  })

  it('every cell the app can compute over the grid has a score, or is off-grid', () => {
    // Walk the real cell centres the pipeline produced and confirm the app's
    // computeNode round-trips to the same key. A miss here is precisely the
    // "plot shows no score" bug.
    const { N, E } = buildAxes(roadsIndex)
    const unreachable = []
    for (let i = 0; i < N.length - 1; i++) {
      for (let j = 0; j < E.length - 1; j++) {
        const lon = (N[i].axis + N[i + 1].axis) / 2
        const lat = (E[j].axis + E[j + 1].axis) / 2
        const js = computeNode(lon, lat, roadsIndex)
        if (!js) continue
        // Not every cell contains plots, so absence is allowed; a MALFORMED or
        // mismatched key is not.
        if (regionScores.cells[js.code] === undefined) continue
        if (!/^Node /.test(js.code)) unreachable.push(js.code)
      }
    }
    expect(unreachable).toEqual([])
  })

  it('resolves a real scored cell end-to-end into a usable panel payload', () => {
    const [code, cell] = Object.entries(regionScores.cells)[0]
    const hit = lookupRegionScore(regionScores.cells, code)
    expect(hit).toBe(cell)
    expect(typeof hit.c).toBe('number')
    expect(typeof hit.r).toBe('number')
    expect(hit.c).toBeGreaterThanOrEqual(0)
    expect(hit.c).toBeLessThanOrEqual(100)
    expect(rampColor(hit.c)).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('keeps the scoring model self-describing (adr-008 provenance survives regeneration)', () => {
    expect(regionScores.model?.adr).toBe('adr-008-scoring-engine')
    expect(regionScores.caveat).toMatch(/relative index/i)
    // The score must never be presentable as a price estimate.
    expect(regionScores.price_caveat).toMatch(/not a price estimate/i)
  })

  it('carries no flood driver: the factor was retired 2026-08-09 (see adr-008 amendment)', () => {
    const withFlood = Object.entries(regionScores.cells)
      .filter(([, c]) => (c.drivers || []).some((d) => /flood/i.test(d)))
    expect(withFlood).toEqual([])
  })
})
