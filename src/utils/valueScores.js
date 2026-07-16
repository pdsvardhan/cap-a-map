/**
 * Value data-mode — colour plots by their 1km-grid region's desirability score
 * (adr-008), without baking anything into the vector tiles.
 *
 * The scores in region_scores.json are keyed by Node code ("Node 7·3"). Plots
 * carry lat/lon as tile properties, so we can rebuild computeNode()'s bracket
 * logic as a MapLibre `step → concat → match` expression and let the GPU do the
 * lookup per feature. That is what keeps the Value mode shippable while the
 * authoritative re-tile (#136) is deferred.
 */
import { buildAxes } from './regions'
import { RAMP } from './designTokens'

const NO_DATA = 'rgba(120,120,120,0.25)'

/**
 * step(input, default, stop1, out1, …) reproducing computeNode's bracket():
 *   v < axes[0]                 → axes[0].n           (only one bracketing road)
 *   axes[i] <= v < axes[i+1]    → min(n_i, n_{i+1})   (lower of the pair)
 *   v >= last                   → last.n
 */
function axisStep(prop, axes) {
  if (!axes.length) return null
  if (axes.length === 1) return axes[0].n
  // lat/lon arrive from the tiles as numeric strings in some builds — coerce.
  const expr = ['step', ['to-number', ['get', prop]], axes[0].n]
  for (let i = 0; i < axes.length - 1; i++) {
    expr.push(axes[i].axis, Math.min(axes[i].n, axes[i + 1].n))
  }
  expr.push(axes[axes.length - 1].axis, axes[axes.length - 1].n)
  return expr
}

const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const rgb2hex = (c) => '#' + c.map((v) => ('0' + Math.round(v).toString(16)).slice(-2)).join('')

/** Interpolate a 0..100 score across the design ramp. */
export function rampColor(score) {
  if (score == null || !RAMP.length) return NO_DATA
  const t = Math.max(0, Math.min(1, score / 100))
  const pos = t * (RAMP.length - 1)
  const i = Math.min(Math.floor(pos), RAMP.length - 2)
  const f = pos - i
  const a = hex2rgb(RAMP[i]), b = hex2rgb(RAMP[i + 1])
  return rgb2hex(a.map((v, k) => v + (b[k] - v) * f))
}

/** The Node code a plot falls in, as a MapLibre expression. */
export function buildNodeCodeExpression(roadsIndex) {
  if (!Array.isArray(roadsIndex) || !roadsIndex.length) return null
  const { N, E } = buildAxes(roadsIndex)
  const n = axisStep('lon', N), e = axisStep('lat', E)
  if (n == null || e == null) return null
  return ['concat', 'Node ', ['to-string', n], '·', ['to-string', e]]
}

/**
 * fill-color expression for the Value mode.
 * @param {Array} roadsIndex named_roads_index.json
 * @param {Object} scores region_scores.json `cells` map (code → {c, r, …})
 * @param {'commercial'|'residential'} lens
 */
export function buildValueColorExpression(roadsIndex, scores, lens) {
  const code = buildNodeCodeExpression(roadsIndex)
  if (!code || !scores) return NO_DATA
  const cases = []
  for (const [cellCode, v] of Object.entries(scores)) {
    const s = lens === 'residential' ? v.r : v.c
    if (s == null) continue
    cases.push(cellCode, rampColor(s))
  }
  if (!cases.length) return NO_DATA
  // Guard missing coordinates explicitly: MapLibre's `to-number` maps null → 0, which
  // would step-evaluate to the westernmost cell and colour a plot the detail panel
  // reports as having no region. Render it as no-data instead of silently lying.
  return [
    'case',
    ['any', ['!', ['has', 'lon']], ['!', ['has', 'lat']]], NO_DATA,
    ['match', code, ...cases, NO_DATA],
  ]
}

/** Look up a plot's region score + drivers for the detail panel. */
export function lookupRegionScore(scores, nodeCode) {
  if (!scores || !nodeCode) return null
  return scores[nodeCode] || null
}
