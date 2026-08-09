/**
 * flow-region-score — "View region ranking & desirability score" (critical).
 * Trigger: user switches to Value mode or opens a region.
 * Outcome: region ranking plus commercial/residential score with pros/cons.
 *
 * Edge case on the flow: the score is a RELATIVE heuristic with no transaction
 * price behind it and must be labelled as such — that labelling is asserted here,
 * because shipping an unlabelled number is the product risk, not a cosmetic one.
 */
import { test, expect } from '@playwright/test'
import { openApp, zoomIn, clickUntilPanel, openLegend, PANEL, LEGEND } from './helpers.js'

test.describe('flow-region-score', () => {
  test('step 1: Value mode is offered and can be selected', async ({ page }) => {
    await openApp(page)
    await openLegend(page)

    const legend = page.locator(LEGEND)
    await expect(legend.getByText('Color Mode')).toBeVisible()

    const value = legend.getByRole('button', { name: 'Value', exact: true })
    await expect(value, 'Value mode appears once region scores load').toBeVisible()
    await value.click()
    await page.waitForTimeout(1200)

    // Both lenses must be selectable — the model scores commercial and
    // residential separately and the UI must not collapse them.
    await expect(legend.getByRole('button', { name: 'Commercial', exact: true })).toBeVisible()
    await expect(legend.getByRole('button', { name: 'Residential', exact: true })).toBeVisible()
  })

  test('step 1: switching lens keeps the map alive and the mode active', async ({ page }) => {
    await openApp(page)
    await openLegend(page)
    const legend = page.locator(LEGEND)
    await legend.getByRole('button', { name: 'Value', exact: true }).click()
    await page.waitForTimeout(800)

    await legend.getByRole('button', { name: 'Residential', exact: true }).click()
    await page.waitForTimeout(1200)
    await expect(page.locator('.maplibregl-canvas')).toBeVisible()

    await legend.getByRole('button', { name: 'Commercial', exact: true }).click()
    await page.waitForTimeout(1200)
    await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  })

  test('step 2: a plot shows its region, both lens scores, and why', async ({ page }) => {
    await openApp(page)
    await zoomIn(page, 4)
    await clickUntilPanel(page)

    const text = await page.locator(PANEL).innerText()

    // The 1km region identity, not a per-plot invention.
    expect(text).toMatch(/REGION/i)
    expect(text, 'region is the Node grid code').toMatch(/Node \d+·\d+/)
    expect(text, 'bounding roads are named').toMatch(/Between\s+N\d+.*×.*E\d+/s)

    // Both lenses, each a 0..100 relative index.
    expect(text).toMatch(/DESIRABILITY/i)
    expect(text).toMatch(/COMMERCIAL/i)
    expect(text).toMatch(/RESIDENTIAL/i)

    const scores = [...text.matchAll(/(COMMERCIAL|RESIDENTIAL)\s*\n\s*(\d{1,3})/gi)]
    expect(scores.length, 'both lens scores render').toBeGreaterThanOrEqual(2)
    for (const [, , n] of scores) {
      const v = parseInt(n, 10)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  test('step 2: pros/cons are a short named list, not a factor dump', async ({ page }) => {
    await openApp(page)
    await zoomIn(page, 4)
    await clickUntilPanel(page)
    const text = await page.locator(PANEL).innerText()

    expect(text).toMatch(/WHY/i)
    // Drivers name the anchor, its distance and its build status — that is what
    // makes the score explainable rather than a black box.
    const drivers = [...text.matchAll(/·\s+.+?·\s+[\d.]+\s*(m|km)\s+\((operational|under-construction|committed|planned)\)/g)]
    expect(drivers.length, 'at least one named driver with distance + status').toBeGreaterThanOrEqual(1)
    expect(drivers.length, 'adr-008 caps the list at ~3 — no factor dump').toBeLessThanOrEqual(4)
  })

  test('edge case: the score is labelled relative, never a price', async ({ page }) => {
    await openApp(page)
    await zoomIn(page, 4)
    await clickUntilPanel(page)
    const text = await page.locator(PANEL).innerText()

    expect(text).toMatch(/relative index/i)
    expect(text).toMatch(/not a price/i)
    expect(text, 'scores are per 1km region, not per plot').toMatch(/1km region/i)
    // No rupee figure may sit next to the score.
    expect(text).not.toMatch(/₹\s*[\d,]+\s*(\/|per)?\s*(sq|yd|sq\.yd)/i)
  })
})
