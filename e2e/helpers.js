import { expect } from '@playwright/test'

export const PANEL = '[data-component="PlotDetailPanel"]'
export const TOPBAR = '[data-component="TopBar"]'
export const LEGEND = '[data-component="Legend"]'

/** Load the app and wait until the map chrome is up (loading screen gone). */
export async function openApp(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator(TOPBAR).waitFor({ timeout: 60_000 })
  await page.locator('.maplibregl-canvas').waitFor({ timeout: 60_000 })
  await page.waitForTimeout(1500) // let the first tiles settle
}

export async function canvasCentre(page) {
  const box = await page.locator('.maplibregl-canvas').boundingBox()
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, box }
}

/** Zoom in with successive double-clicks (each ~+1 z). */
export async function zoomIn(page, steps = 4) {
  const { cx, cy } = await canvasCentre(page)
  for (let i = 0; i < steps; i++) {
    await page.mouse.dblclick(cx, cy)
    await page.waitForTimeout(1100)
  }
  await page.waitForTimeout(2500)
}

export const scaleText = (page) =>
  page.locator('.maplibregl-ctrl-scale').first().innerText().catch(() => '')

/**
 * Click around the centre until a plot opens the detail panel.
 * The plot fabric has road reserves and gaps, so a single fixed point is flaky;
 * a real user clicks until they hit a parcel. Returns the offset that worked.
 */
export async function clickUntilPanel(page, { offsets = [-260, -130, 0, 130, 260] } = {}) {
  const { cx, cy } = await canvasCentre(page)
  for (const dy of offsets) {
    for (const dx of offsets) {
      await page.mouse.click(cx + dx, cy + dy)
      await page.waitForTimeout(650)
      if (await page.locator(PANEL).count()) return { dx, dy }
    }
  }
  throw new Error('no plot found after scanning the viewport')
}

/** Open the Legend panel from the top bar. */
export async function openLegend(page) {
  if (!(await page.locator(LEGEND).count())) {
    await page.getByRole('button', { name: 'Legend', exact: true }).click()
    await expect(page.locator(LEGEND)).toBeVisible()
  }
}
