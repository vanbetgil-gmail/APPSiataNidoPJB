import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // Carga .env.local antes de las pruebas. Sin esto, las de integración se
    // omiten en silencio y `pnpm test` sale en verde sin haber comprobado
    // nada de seguridad. Ver tests/entorno.ts.
    setupFiles: ['./tests/entorno.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'tests/a11y/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
