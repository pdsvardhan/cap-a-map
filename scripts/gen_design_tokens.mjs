/**
 * Generate static MapLibre colour tokens from the design AI's generative OKLCH
 * system ("Amaravati Visual System"). Ports zoneRGB() + ZMETA + the direction
 * themes so we can bake a {zoneCode -> hex} table (+ canvas/road/ramp tokens) per
 * direction, instead of running OKLCH math in the browser.
 *
 * Output: src/utils/designTokens.generated.json  (consumed by src/utils/designTokens.js)
 * Run: node scripts/gen_design_tokens.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BOLD = 0.55  // design default (BOLDNESS · 55)

const ZMETA = [
  ['R1', 'R', .50, .045], ['R2', 'R', .53, .060], ['R3', 'R', .47, .050, true], ['R4', 'R', .57, .085], ['R5', 'R', .60, .075],
  ['C1', 'C', .56, .085], ['C2', 'C', .50, .050, true], ['C3', 'C', .59, .095], ['C4', 'C', .63, .110], ['C5', 'C', .67, .120], ['C6', 'C', .71, .130],
  ['I1', 'I', .53, .090], ['I2', 'I', .48, .080], ['I3', 'I', .57, .100],
  ['S1', 'S', .60, .140], ['S3', 'S', .55, .120], ['SC', 'S', .58, .120], ['SH', 'S', .63, .130],
  ['S2', 'E', .62, .145],
  ['P1', 'P', .58, .120], ['P2', 'P', .63, .130], ['P3', 'P', .50, .110], ['PGN_G', 'P', .61, .100], ['PGN_V', 'P', .56, .085], ['RAA', 'P', .48, .050],
  ['U1', 'U', .46, .020], ['U2', 'U', .40, .012], ['BUR', 'X', .43, .030], ['WAT', 'W', .46, .070],
].map(([code, fam, L, C, big2]) => ({ code, fam, L, C, big2: !!big2 }))
const ZMAP = Object.fromEntries(ZMETA.map((z) => [z.code, z]))

const base = (o) => Object.assign({ kChroma: 1, kBig2: 0.7, kL: 0, famMul: {}, rampHue: 220 }, o)
const THEMES = {
  A: base({ id: 'A', name: 'Cool Atlas', light: false, bg: '#0b0f16', landBase: '#20242b', ink: '#aeb7c4', kChroma: 0.9, kBig2: 0.5, famHue: { R: 258, C: 232, I: 300, S: 80, E: 205, P: 168, U: 250, X: 250, W: 232 }, rampHue: 218, road: { treat: 'cased', color: '#dbe3ee', casing: '#070b12' } }),
  B: base({ id: 'B', name: 'Warm Cadastre', light: true, bg: '#f3ece1', landBase: '#e7ddca', ink: '#4a4034', kChroma: 1.0, kBig2: 0.66, kL: 0.02, famHue: { R: 45, C: 92, I: 25, S: 228, E: 286, P: 138, U: 64, X: 48, W: 236 }, rampHue: 78, road: { treat: 'filled', color: '#b59a5e', casing: '#fffdf6', alpha: 0.92 } }),
  // C tuned to the LITERAL official/statutory look (owner): residential = clear
  // yellow, commercial = red/pink — big-two brought UP (kBig2 near 1 + R/C famMul
  // + a lightness lift) instead of recessed, so the dense core reads bright.
  C: base({ id: 'C', name: 'Statutory Dark', light: false, bg: '#191c21', landBase: '#2d2e27', ink: '#bcc0c6', kChroma: 1.12, kBig2: 0.95, bigLift: 0.20, famLift: { R: 0.10, U: 0.20 }, famMul: { R: 2.0, C: 2.05 }, famHue: { R: 90, C: 25, I: 305, S: 255, E: 200, P: 145, U: 75, X: 312, W: 222 }, rampHue: 60, road: { treat: 'cased', color: '#dfe3ea', casing: '#070a0e' } }),
  D: base({ id: 'D', name: 'Statutory Light', light: true, bg: '#eef0e3', landBase: '#e2e3d6', ink: '#41443a', kChroma: 1.05, kBig2: 0.5, famHue: { R: 58, C: 28, I: 305, S: 255, E: 200, P: 145, U: 75, X: 312, W: 232 }, rampHue: 60, road: { treat: 'cased', color: '#8a8576', casing: '#ffffff' } }),
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
function oklch2rgb(L, C, H) {
  const hr = H * Math.PI / 180, a = C * Math.cos(hr), b = C * Math.sin(hr)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  const f = (x) => { x = clamp(x, 0, 1); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  return [f(r) * 255, f(g) * 255, f(bb) * 255]
}
const toHex = (rgb) => '#' + rgb.map((v) => ('0' + clamp(Math.round(v), 0, 255).toString(16)).slice(-2)).join('')

function zoneHex(code, theme, bold = BOLD) {
  const z = ZMAP[code] || { fam: 'U', L: .45, C: 0 }
  const H = theme.famHue[z.fam]
  const fm = theme.famMul[z.fam] != null ? theme.famMul[z.fam] : 1
  let C = z.C * theme.kChroma * fm * (z.big2 ? theme.kBig2 : 1) * (0.4 + bold * 0.95)
  let L = z.L + (theme.kL || 0)
  if (theme.famLift && theme.famLift[z.fam]) L += theme.famLift[z.fam]   // brighten a whole family
  if (z.big2 && theme.bigLift) L += theme.bigLift   // lift the dominant zones so they read bright, not dark
  if (theme.light) { L = 0.34 + z.L * 0.52; C = C * 1.18 }
  L = clamp(L, 0.12, 0.94); C = clamp(C, 0, 0.42)
  return toHex(oklch2rgb(L, C, H))
}

// Sequential 6-stop data ramp at a single hue (pale/low → deep/saturated),
// used for the Plot-area (and future Land-value) data modes. Hue per theme.
function rampFrom(hue) {
  const stops = [
    [0.90, 0.05], [0.83, 0.09], [0.74, 0.13], [0.63, 0.16], [0.52, 0.17], [0.41, 0.15],
  ]
  return stops.map(([L, C]) => toHex(oklch2rgb(L, C, hue)))
}

const out = {}
for (const [id, theme] of Object.entries(THEMES)) {
  const zones = {}
  for (const z of ZMETA) zones[z.code] = zoneHex(z.code, theme)
  out[id] = {
    name: theme.name, light: theme.light, bg: theme.bg, ink: theme.ink,
    landBase: theme.landBase, road: theme.road, rampHue: theme.rampHue,
    ramp: rampFrom(theme.rampHue), zones,
  }
}
const file = path.join(__dirname, '..', 'src', 'utils', 'designTokens.generated.json')
fs.writeFileSync(file, JSON.stringify(out, null, 2))
console.log('Generated tokens for directions:', Object.keys(out).join(', '))
for (const id of ['B', 'D']) {
  console.log(`\n=== ${id} · ${out[id].name} (${out[id].light ? 'light' : 'dark'}) bg=${out[id].bg} ===`)
  for (const k of ['R3', 'C2', 'S2', 'S1', 'SC', 'P1', 'P2', 'I1', 'WAT', 'U2']) console.log('  ', k.padEnd(5), out[id].zones[k])
}
