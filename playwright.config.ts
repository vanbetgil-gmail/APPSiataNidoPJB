import { readFileSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/*
 * Carga `.env.local` antes de definir la configuración.
 *
 * Playwright no lo hace solo. Sin esto, `PRUEBA_CORREO` y
 * `PRUEBA_CONTRASENA` llegan indefinidas y las pruebas que necesitan sesión
 * se OMITEN en silencio: la suite sale en verde sin haber comprobado que
 * alguien pueda entrar ni salir, que es justo lo que vienen a verificar.
 *
 * Es el mismo problema que ya se resolvió en Vitest con `tests/entorno.ts`.
 */
try {
  for (const linea of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const c = l.indexOf('=')
    if (c === -1) continue
    const k = l.slice(0, c).trim()
    if (!process.env[k]) process.env[k] = l.slice(c + 1).trim().replace(/^["']|["']$/g, '')
  }
} catch {
  // Sin `.env.local` las pruebas con sesión se omiten, que es lo correcto
  // para quien clone el proyecto sin cuenta en esta instalación.
}

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
