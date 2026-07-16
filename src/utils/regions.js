/**
 * Custom "Node" region code — the site's grid-cell identifier.
 *
 * A region is the cell bounded by two adjacent N roads (W–E) and two adjacent E
 * roads (S–N). It is labelled `Node {lowerN}·{lowerE}` using the LOWER road number
 * of each bounding pair (owner spec: N7–N8 → 7, E3–E4 → 3 ⇒ "Node 7·3"). The dot
 * keeps two-digit edges unambiguous ("Node 12·10"). Distinct from APCRDA's official
 * Sectors. Computed client-side from the authentic trunk-road axes (named_roads_index),
 * so no per-plot precompute / tile regen is needed.
 */
const roadNum = (name) => parseInt(String(name).replace(/[^0-9]/g, ''), 10)

// The two roads (by axis) that bracket value v; one may be null at a grid edge.
function bracket(roads, v) {
  let lo = null, hi = null
  for (const r of roads) {
    if (r.axis <= v) lo = r
    else { hi = r; break }
  }
  return [lo, hi].filter(Boolean)
}

/**
 * The N (lon) and E (lat) road axis stacks that define the grid.
 * Exported so the Value-mode colour expression (utils/valueScores.js) and the
 * offline scoring pipeline derive regions from the SAME axes as computeNode.
 * @param {Array} roadsIndex named_roads_index.json entries
 */
export function buildAxes(roadsIndex) {
  // Exclude the diagonal Seed Road (E3, "seed access") — it isn't an axis-aligned
  // grid line and would scramble the latitude stack.
  const grid = roadsIndex.filter((r) => r.category !== 'seed access')
  const N = grid
    .filter((r) => r.orientation === 'N-S' && (r.axis != null || r.center))
    .map((r) => ({ name: r.name, n: roadNum(r.name), axis: r.axis != null ? r.axis : r.center[0] }))
    .sort((a, b) => a.axis - b.axis)
  const E = grid
    .filter((r) => r.orientation === 'E-W' && (r.axis != null || r.center))
    .map((r) => ({ name: r.name, n: roadNum(r.name), axis: r.axis != null ? r.axis : r.center[1] }))
    .sort((a, b) => a.axis - b.axis)
  return { N, E }
}

/**
 * @param {number} lon @param {number} lat
 * @param {Array} roadsIndex  named_roads_index.json entries (name, orientation, center)
 * @returns {{ code:string, between:string }|null}
 */
export function computeNode(lon, lat, roadsIndex) {
  if (lon == null || lat == null || !Array.isArray(roadsIndex) || !roadsIndex.length) return null
  const { N, E } = buildAxes(roadsIndex)

  const nb = bracket(N, lon), eb = bracket(E, lat)
  if (!nb.length || !eb.length) return null

  const lowerN = Math.min(...nb.map((r) => r.n))
  const lowerE = Math.min(...eb.map((r) => r.n))
  const code = `Node ${lowerN}·${lowerE}`

  const span = (rs) => rs.length === 2
    ? [...rs].sort((a, b) => a.n - b.n).map((r) => r.name).join('–')
    : `${rs[0].name} (edge)`
  const between = `${span(nb)} × ${span(eb)}`
  return { code, between }
}
