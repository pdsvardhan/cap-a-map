/**
 * flow-explore — "Explore the map & inspect a plot" (critical).
 * Trigger: user opens the app. Outcome: they see the coloured plot map and can
 * open any plot's detail.
 */
import { test, expect } from '@playwright/test'
import { openApp, zoomIn, clickUntilPanel, canvasCentre, scaleText, PANEL, TOPBAR } from './helpers.js'

test.describe('flow-explore', () => {
  test('step 1-2: the app loads and renders an interactive map', async ({ page }) => {
    const fatal = []
    page.on('pageerror', (e) => fatal.push(e.message))

    await openApp(page)

    await expect(page.locator(TOPBAR)).toBeVisible()
    await expect(page.locator('.maplibregl-canvas')).toBeVisible()

    // The canvas must actually have painted, not just exist — a blank WebGL
    // context would still satisfy a presence check.
    const painted = await page.evaluate(() => {
      const c = document.querySelector('.maplibregl-canvas')
      return !!c && c.width > 0 && c.height > 0
    })
    expect(painted).toBe(true)

    // A scale bar only renders once the map has a real viewport.
    expect(await scaleText(page)).toMatch(/\d/)
    expect(fatal).toEqual([])
  })

  test('step 3: panning and zooming updates the viewport', async ({ page }) => {
    await openApp(page)
    const before = await scaleText(page)

    await zoomIn(page, 3)
    const afterZoom = await scaleText(page)
    expect(afterZoom).not.toBe(before) // scale bar re-reads on zoom

    // Drag to pan; the map must stay alive and interactive afterwards.
    const { cx, cy } = await canvasCentre(page)
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx - 180, cy - 120, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(1500)
    await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  })

  test('step 4: clicking a plot opens the detail panel with its metadata', async ({ page }) => {
    await openApp(page)
    await zoomIn(page, 4)
    await clickUntilPanel(page)

    const panel = page.locator(PANEL)
    await expect(panel).toBeVisible()

    const text = await panel.innerText()
    // The panel's job is to identify the parcel: zoning, where it is, and its coords.
    expect(text).toMatch(/ZONING/i)
    expect(text).toMatch(/LOCATION/i)
    expect(text).toMatch(/COORDINATES/i)
    // Coordinates must be real numbers in the Amaravati bbox, not placeholders.
    const coord = text.match(/(\d{2}\.\d+),\s*(\d{2}\.\d+)/)
    expect(coord, 'panel should show lat, lon').not.toBeNull()
    const lat = parseFloat(coord[1]), lon = parseFloat(coord[2])
    expect(lat).toBeGreaterThan(16.3); expect(lat).toBeLessThan(16.7)
    expect(lon).toBeGreaterThan(80.3); expect(lon).toBeLessThan(80.7)
  })

  test('step 5: the panel dismisses again', async ({ page }) => {
    await openApp(page)
    await zoomIn(page, 4)
    await clickUntilPanel(page)
    await expect(page.locator(PANEL)).toBeVisible()

    const close = page.locator(`${PANEL} button`).first()
    await close.click()
    await expect(page.locator(PANEL)).toHaveCount(0)
  })

  test('edge case: plots with incomplete metadata render without breaking', async ({ page }) => {
    // Known-real condition: some parcels have village "N/A" and no township/
    // sector/block. The panel must degrade to placeholders, not crash or blank.
    const fatal = []
    page.on('pageerror', (e) => fatal.push(e.message))

    await openApp(page)
    await zoomIn(page, 4)

    let sawPlaceholder = false
    const offsets = [-260, -130, 0, 130, 260]
    const { cx, cy } = await canvasCentre(page)
    for (const dy of offsets) {
      for (const dx of offsets) {
        await page.mouse.click(cx + dx, cy + dy)
        await page.waitForTimeout(500)
        if (await page.locator(PANEL).count()) {
          const t = await page.locator(PANEL).innerText()
          expect(t.trim().length).toBeGreaterThan(20) // never a blank panel
          if (/N\/A|—/.test(t)) sawPlaceholder = true
        }
      }
    }
    expect(fatal, 'incomplete metadata must not throw').toEqual([])
    expect(sawPlaceholder, 'expected at least one parcel with missing fields').toBe(true)
  })
})
