import { defineConfig } from 'vitest/config'

/**
 * Unit/integration tests only. The e2e/ directory is Playwright's — without this
 * include, vitest would try to run the .spec.js flow tests and fail on
 * @playwright/test's runner.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
})
