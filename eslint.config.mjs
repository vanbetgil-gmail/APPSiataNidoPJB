import next from 'eslint-config-next'

const configuracion = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'public/mapa/tiles/**',
      'public/inmersivas/**',
      'lib/supabase/tipos.ts', // generado por `pnpm db:tipos`
      'specs/**',
    ],
  },
  ...next,
]

export default configuracion
