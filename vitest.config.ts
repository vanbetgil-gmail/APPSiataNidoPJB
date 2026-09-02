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
    /*
     * Las pruebas de integración hablan con el Supabase real por internet, no
     * con una base local. Los 5 segundos por defecto de Vitest bastan cuando
     * la red va bien y fallan cuando no, produciendo un rojo intermitente que
     * no corresponde a ningún defecto: en tres ejecuciones seguidas fallaban
     * 3, 1 y 3 pruebas distintas.
     *
     * Un rojo que aparece y desaparece solo es peor que ninguna prueba,
     * porque enseña a ignorarlo, y estas comprueban justamente que un
     * anónimo no pueda leer los correos del equipo.
     */
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
