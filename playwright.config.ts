import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.URL_BASE ?? 'http://localhost:3000',
    locale: 'es-CO',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    // 360 px es el ancho de referencia de SC-013
    {
      name: 'movil-360',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 800 } },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
