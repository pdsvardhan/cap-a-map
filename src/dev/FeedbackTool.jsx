/**
 * Dev-only in-app comment tool — v2 (loaded only when import.meta.env.DEV).
 *
 * Press "c" (or the button) → the browser captures the current tab (one "share
 * this tab" click) → an annotation editor opens with that pixel-perfect frame.
 * Mark things up with numbered pins / box / arrow / pen in a colour, add a
 * comment per pin + an overall note, Save. Everything lands in ./feedback/
 * (<id>.json + the flattened <id>.jpg) via the Vite endpoint, with map view
 * state baked in so the agent can reproduce the exact view.
 *
 * Tab capture avoids the WebGL canvas-taint that made v1 screenshots blank
 * (cross-origin map glyphs). Falls back to html-to-image, then to no-image.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { toJpeg } from 'html-to-image'
import useMapStore from '../stores/mapStore'

const COLORS = ['#ff2d55', '#34d8c4', '#ffd60a', '#0a84ff', '#ffffff']
const TOOLS = [
  { id: 'pin', label: 'Pin' }, { id: 'box', label: 'Box' },
  { id: 'arrow', label: 'Arrow' }, { id: 'pen', label: 'Pen' },
]
const r6 = (n) => Math.round(n * 1e6) / 1e6

function mapView() {
  const m = useMapStore.getState()._mapInstance
  if (!m) return null
  const c = m.getCenter()
  return { center: [r6(c.lng), r6(c.lat)], zoom: +m.getZoom().toFixed(2), bearing: +m.getBearing().toFixed(1) }
}

// Persistent tab-capture stream — prompt once per session, reuse for every grab.
let _stream = null, _video = null
function streamLive() { return _stream && _stream.getTracks().some((t) => t.readyState === 'live') }
async function ensureStream(setStatus) {
  if (streamLive()) return _video
  setStatus('Pick "This tab"…')
  _stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 4 }, preferCurrentTab: true, audio: false })
  _stream.getVideoTracks()[0].addEventListener('ended', () => { _stream = null; _video = null })
  _video = document.createElement('video'); _video.srcObject = _stream; _video.muted = true
  await _video.play()
  await new Promise((r) => setTimeout(r, 220))
  return _video
}
export function stopFeedbackStream() { if (_stream) { _stream.getTracks().forEach((t) => t.stop()); _stream = null; _video = null } }

async function captureFrame(setStatus) {
  try {
    const video = await ensureStream(setStatus) // 1) tab capture (pixel-perfect, no taint)
    const cv = document.createElement('canvas')
    cv.width = video.videoWidth; cv.height = video.videoHeight
    cv.getContext('2d').drawImage(video, 0, 0)
    return cv.toDataURL('image/jpeg', 0.92)
  } catch (e) {
    try { // 2) html-to-image fallback
      setStatus('Capturing…')
      return await toJpeg(document.body, { quality: 0.85, cacheBust: true, filter: (n) => !(n.dataset && n.dataset.feedbackUi) })
    } catch (e2) { return null }
  }
}

export default function FeedbackTool() {
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [editor, setEditor] = useState(null) // { img, view }
  const [count, setCount] = useState(0)
  const [toast, setToast] = useState(null)

  const start = useCallback(async () => {
    if (busy || editor) return
    setBusy(true); setActive(false)
    const view = mapView()
    const img = await captureFrame(setStatus)
    setStatus(''); setBusy(false)
    if (!img) { setToast('Capture failed'); setTimeout(() => setToast(null), 2500); return }
    setEditor({ img, view })
  }, [busy, editor])

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(input|textarea)$/i.test(document.activeElement?.tagName || '')
      if (e.key === 'Escape') { setEditor(null); setActive(false); return }
      if (e.key.toLowerCase() === 'c' && !typing && !editor && !busy) start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, busy, start])

  useEffect(() => () => stopFeedbackStream(), [])

  const onSaved = (id) => { setCount((n) => n + 1); setToast(`saved ${id || ''}`); setTimeout(() => setToast(null), 1800); setEditor(null) }

  return (
    <div data-feedback-ui="1">
      {editor && <Editor img={editor.img} view={editor.view} onSaved={onSaved} onCancel={() => setEditor(null)} />}

      <button
        onClick={start}
        title="Comment mode (c)"
        className={`fixed bottom-4 left-4 z-[960] px-3.5 py-2 rounded-full shadow-lg text-xs font-semibold transition-colors ${
          busy ? 'bg-pink-700 text-white' : 'bg-pink-600 text-white hover:bg-pink-500'
        }`}
      >
        💬 {busy ? (status || 'Capturing…') : 'Comment'}{count ? ` · ${count}` : ''}
      </button>

      {toast && <div className="fixed bottom-16 left-4 z-[960] bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg">{toast}</div>}
    </div>
  )
}

function Editor({ img, view, onSaved, onCancel }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const [tool, setTool] = useState('pin')
  const [color, setColor] = useState(COLORS[0])
  const [shapes, setShapes] = useState([]) // {type,color,x,y,x2,y2,pts?,n?}
  const [pins, setPins] = useState([])     // {n, note}
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const draft = useRef(null)

  // draw image + shapes onto the canvas
  const redraw = useCallback(() => {
    const cv = canvasRef.current, im = imgRef.current
    if (!cv || !im || !im.complete) return
    cv.width = im.naturalWidth; cv.height = im.naturalHeight
    const ctx = cv.getContext('2d')
    ctx.drawImage(im, 0, 0)
    const lw = Math.max(3, cv.width / 600)
    const all = draft.current ? [...shapes, draft.current] : shapes
    for (const s of all) {
      if (!s || !s.type) continue // defensive: never let one bad shape crash the editor
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      if (s.type === 'box') ctx.strokeRect(s.x, s.y, s.x2 - s.x, s.y2 - s.y)
      else if (s.type === 'arrow') drawArrow(ctx, s.x, s.y, s.x2, s.y2, lw)
      else if (s.type === 'pen' && s.pts) { ctx.beginPath(); s.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke() }
      else if (s.type === 'pin') drawPin(ctx, s.x, s.y, s.n, s.color, cv.width / 45)
    }
  }, [shapes])

  useEffect(() => { redraw() }, [redraw, img])

  // map a pointer event to canvas (image) coords
  const toCanvas = (e) => {
    const cv = canvasRef.current, rect = cv.getBoundingClientRect()
    return [ (e.clientX - rect.left) * (cv.width / rect.width), (e.clientY - rect.top) * (cv.height / rect.height) ]
  }

  const onDown = (e) => {
    const [x, y] = toCanvas(e)
    if (tool === 'pin') {
      const n = pins.length + 1
      setShapes((s) => [...s, { type: 'pin', color, x, y, n }])
      setPins((p) => [...p, { n, note: '' }])
      setComment((c) => c + (c && !c.endsWith('\n') ? '\n' : '') + `${n}. `)
      return
    }
    draft.current = tool === 'pen' ? { type: 'pen', color, pts: [[x, y]] } : { type: tool, color, x, y, x2: x, y2: y }
  }
  const onMove = (e) => {
    if (!draft.current) return
    const [x, y] = toCanvas(e)
    if (draft.current.type === 'pen') draft.current.pts.push([x, y])
    else { draft.current.x2 = x; draft.current.y2 = y }
    redraw()
  }
  const onUp = () => {
    // Capture the in-progress shape BEFORE nulling the ref: setShapes' updater
    // runs lazily (at render), so reading draft.current inside it would see null
    // and push null into shapes → redraw crashes on null.color. (was the pen/box
    // /arrow "site crashes when marking up" bug, owner feedback 2026-06-30.)
    const d = draft.current
    if (d) { draft.current = null; setShapes((s) => [...s, d]) }
  }

  const undo = () => setShapes((s) => {
    const last = s[s.length - 1]
    if (last?.type === 'pin') setPins((p) => p.slice(0, -1))
    return s.slice(0, -1)
  })

  const save = async () => {
    setSaving(true)
    const cv = canvasRef.current
    const screenshot = cv ? cv.toDataURL('image/jpeg', 0.85) : img
    try {
      const res = await fetch('/__feedback', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          comment, pins, view, url: location.href, ts: new Date().toISOString(),
          marks: shapes.length, screenshot,
        }),
      })
      const j = await res.json(); onSaved(j.id)
    } catch (e) { setSaving(false); alert('Save failed — dev server running?') }
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 flex flex-col" onMouseUp={onUp}>
      {/* toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#11161f] border-b border-white/10 text-white">
        <span className="text-sm font-semibold mr-2">Mark up</span>
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${tool === t.id ? 'bg-pink-600' : 'bg-white/10 hover:bg-white/20'}`}>{t.label}</button>
        ))}
        <div className="w-px h-5 bg-white/15 mx-1" />
        {COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} style={{ background: c }}
            className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`} />
        ))}
        <button onClick={undo} className="ml-2 px-2.5 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20">Undo</button>
        <div className="flex-1" />
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20">Cancel (Esc)</button>
      </div>
      {/* canvas + side */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 flex items-center justify-center p-3 overflow-auto">
          <img ref={imgRef} src={img} alt="" className="hidden" onLoad={redraw} />
          <canvas ref={canvasRef}
            onMouseDown={onDown} onMouseMove={onMove}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            style={{ cursor: tool === 'pin' ? 'pointer' : 'crosshair' }} />
        </div>
        <div className="w-72 flex-shrink-0 bg-[#11161f] border-l border-white/10 flex flex-col p-3 gap-3 text-white">
          {view && <div className="text-[11px] text-white/50 font-mono">zoom {view.zoom} · {view.center?.join(', ')}</div>}
          {pins.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto panel-scroll">
              {pins.map((p, i) => (
                <div key={p.n} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-600 text-white text-[11px] flex items-center justify-center flex-shrink-0">{p.n}</span>
                  <input value={p.note} placeholder={`note for #${p.n}`} onChange={(e) => setPins((arr) => arr.map((x, j) => j === i ? { ...x, note: e.target.value } : x))}
                    className="flex-1 bg-white/5 rounded px-2 py-1 text-xs outline-none focus:bg-white/10" />
                </div>
              ))}
            </div>
          )}
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Overall comment — describe your marks…"
            className="flex-1 bg-white/5 rounded-lg p-2 text-sm outline-none focus:bg-white/10 resize-none min-h-[120px]" />
          <button onClick={save} disabled={saving || (!comment.trim() && pins.every((p) => !p.note.trim()))}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-pink-600 hover:bg-pink-500 disabled:opacity-40">{saving ? 'Saving…' : 'Save comment'}</button>
        </div>
      </div>
    </div>
  )
}

function drawArrow(ctx, x1, y1, x2, y2, lw) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 8 + lw * 3
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4))
  ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4))
  ctx.closePath(); ctx.fill()
}
function drawPin(ctx, x, y, n, color, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
  ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, r / 6); ctx.stroke()
  ctx.fillStyle = '#fff'; ctx.font = `bold ${r}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(n), x, y + r * 0.05)
}
