import { defineConfig, devices } from '@playwright/test'

/**
 * E2E against the running container (real PMTiles + real region scores), because
 * the critical flows are only meaningful over the real dataset. BASE_URL lets CI
 * or a dev point at `npm run preview` instead.
 */
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8502'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // MapLibre needs WebGL; headless Chromium falls back to SwiftShader.
    launchOptions: {
      args: [
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
