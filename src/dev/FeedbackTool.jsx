/**
 * Dev-only in-app comment tool (loaded only when import.meta.env.DEV).
 *
 * Press "c" (or the floating button) to enter comment mode, click anything on
 * the page, type a note, submit. Each comment is saved into ./feedback via the
 * Vite dev endpoint (vite.config.js → /__feedback) with full context:
 *   - map view state (center/zoom/bearing/pitch) → reproduces the EXACT view
 *   - the map feature under the cursor (plot/road/landmark + its properties)
 *   - the UI element under the cursor (data-component, tag, text)
 *   - a screenshot of the whole app with a marker at the click point
 *
 * This is the right anchor for a canvas map: a DOM selector can't point at a
 * plot, and what's on screen depends on zoom — so we bake the view into each note.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { toJpeg } from 'html-to-image'
import useMapStore from '../stores/mapStore'

const r6 = (n) => Math.round(n * 1e6) / 1e6
const isFeedbackUi = (el) => !!(el && el.closest && el.closest('[data-feedback-ui]'))

function captureContext(clientX, clientY) {
  const map = useMapStore.getState()._mapInstance
  const ctx = {
    comment: '',
    point: { x: Math.round(clientX), y: Math.round(clientY) },
    url: location.href,
    ts: new Date().toISOString(),
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
  }

  // DOM element under cursor (ignore our own overlay)
  const el = document.elementsFromPoint(clientX, clientY).find((e) => !isFeedbackUi(e))
  const onMapCanvas = el && el.closest && el.closest('.maplibregl-canvas-container')
  if (el && !onMapCanvas) {
    const comp = el.closest('[data-component]')
    ctx.dom = {
      component: comp?.getAttribute('data-component') || null,
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) || undefined,
      aria: el.getAttribute && (el.getAttribute('aria-label') || undefined),
    }
  }

  // Map context
  if (map) {
    const c = map.getCenter()
    ctx.view = {
      center: [r6(c.lng), r6(c.lat)],
      zoom: +map.getZoom().toFixed(2),
      bearing: +map.getBearing().toFixed(1),
      pitch: +map.getPitch().toFixed(1),
    }
    const rect = map.getCanvas().getBoundingClientRect()
    const mp = { x: clientX - rect.left, y: clientY - rect.top }
    try { const ll = map.unproject(mp); ctx.lngLat = [r6(ll.lng), r6(ll.lat)] } catch (e) { /* */ }
    const layers = ['allocated-lands-fill', 'named-roads-fill', 'plots-fill'].filter((id) => map.getLayer(id))
    if (layers.length && mp.x >= 0 && mp.y >= 0 && mp.x <= rect.width && mp.y <= rect.height) {
      const f = map.queryRenderedFeatures(mp, { layers })[0]
      if (f) ctx.feature = { layer: f.layer.id, sourceLayer: f.sourceLayer || undefined, properties: f.properties }
    }
  }
  return ctx
}

async function snapshot(point) {
  let dataUrl
  try {
    dataUrl = await toJpeg(document.body, {
      quality: 0.82, pixelRatio: 1, cacheBust: true,
      filter: (node) => !(node.dataset && node.dataset.feedbackUi),
    })
  } catch (e) { return null }
  // composite a marker at the click point
  return await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const cv = document.createElement('canvas')
      cv.width = img.width; cv.height = img.height
      const ctx = cv.getContext('2d')
      ctx.drawImage(img, 0, 0)
      ctx.beginPath(); ctx.arc(point.x, point.y, 15, 0, Math.PI * 2)
      ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 3; ctx.stroke()
      ctx.beginPath(); ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#ff2d55'; ctx.fill()
      resolve(cv.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export default function FeedbackTool() {
  const [active, setActive] = useState(false)
  const [draft, setDraft] = useState(null) // { context, screenshot }
  const [capturing, setCapturing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [count, setCount] = useState(0)
  const [toast, setToast] = useState(null)
  const textRef = useRef(null)

  const beginComment = useCallback(async (clientX, clientY) => {
    setCapturing(true)
    const context = captureContext(clientX, clientY)
    const screenshot = await snapshot(context.point)
    setDraft({ context, screenshot })
    setCapturing(false)
  }, [])

  // hotkeys: 'c' toggles mode, Esc cancels
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(input|textarea)$/i.test(document.activeElement?.tagName || '')
      if (e.key === 'Escape') { setDraft(null); setActive(false); return }
      if (e.key.toLowerCase() === 'c' && !typing && !draft) { setActive((a) => !a) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft])

  useEffect(() => { if (draft && textRef.current) textRef.current.focus() }, [draft])

  const onOverlayClick = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    if (capturing || draft) return
    beginComment(e.clientX, e.clientY)
  }, [capturing, draft, beginComment])

  const submit = useCallback(async () => {
    if (!draft) return
    const comment = textRef.current?.value?.trim()
    if (!comment) return
    setSaving(true)
    try {
      const res = await fetch('/__feedback', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...draft.context, comment, screenshot: draft.screenshot }),
      })
      const j = await res.json()
      setCount((n) => n + 1)
      setToast(`saved ${j.id || ''}`)
      setTimeout(() => setToast(null), 1800)
    } catch (e) {
      setToast('save failed — is the dev server running?')
      setTimeout(() => setToast(null), 2500)
    }
    setSaving(false)
    setDraft(null)
  }, [draft])

  return (
    <div data-feedback-ui="1">
      {/* click-capture overlay */}
      {active && !draft && (
        <div
          onClick={onOverlayClick}
          className="fixed inset-0 z-[900]"
          style={{ cursor: 'crosshair', background: 'rgba(255,45,85,0.04)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-pink-200/80 text-xs bg-black/60 px-3 py-1.5 rounded-full pointer-events-none">
            {capturing ? 'capturing…' : 'click anything to comment · Esc to exit'}
          </div>
        </div>
      )}

      {/* draft input popover */}
      {draft && (
        <div className="fixed inset-0 z-[950] bg-black/30 flex items-center justify-center" onClick={() => setDraft(null)}>
          <div className="w-[380px] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {draft.screenshot && (
              <img src={draft.screenshot} alt="" className="w-full h-36 object-cover object-center border-b border-gray-200" />
            )}
            <div className="p-3">
              <div className="text-[11px] text-gray-500 mb-2 flex flex-wrap gap-x-3 gap-y-0.5">
                {draft.context.view && <span>zoom {draft.context.view.zoom}</span>}
                {draft.context.feature && <span className="text-blue-600">feature: {draft.context.feature.properties?.pid != null ? `plot #${draft.context.feature.properties.pid}` : (draft.context.feature.properties?.label || draft.context.feature.layer)}</span>}
                {draft.context.dom?.component && <span className="text-emerald-600">ui: {draft.context.dom.component}</span>}
              </div>
              <textarea
                ref={textRef}
                rows={3}
                placeholder="What's wrong / what do you want here?"
                className="w-full text-sm border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-pink-300"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-gray-400">⌘/Ctrl+Enter to save</span>
                <div className="flex gap-2">
                  <button onClick={() => setDraft(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={submit} disabled={saving} className="px-3 py-1.5 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* toggle button */}
      <button
        onClick={() => setActive((a) => !a)}
        title="Comment mode (c)"
        className={`fixed bottom-4 left-4 z-[960] px-3 py-2 rounded-full shadow-lg text-xs font-medium transition-colors ${
          active ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        💬 {active ? 'Commenting' : 'Comment'}{count ? ` · ${count}` : ''}
      </button>

      {toast && (
        <div className="fixed bottom-16 left-4 z-[960] bg-black/80 text-white text-xs px-3 py-1.5 rounded-lg">{toast}</div>
      )}
    </div>
  )
}
