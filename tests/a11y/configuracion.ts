/**
 * Configuración de la verificación de accesibilidad.
 *
 * Objetivo: WCAG 2.1 nivel AA (research.md, R-010) — contraste mínimo 4.5:1
 * en texto normal y objetivos táctiles de 44×44 px.
 *
 * Se aplica sobre TODAS las pantallas, públicas y privadas: la aplicación la
 * usan estudiantes de colegio y la consulta cualquier visitante.
 */
export const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const

export const RUTAS_PUBLICAS = [
  '/',
  '/creditos',
  '/estacion',
] as const

export const RUTAS_PRIVADAS = [
  '/login',
  '/jornadas',
  '/tableros',
  '/fichas',
  '/revision',
] as const

/**
 * Ninguna infracción es aceptable en las rutas públicas: son la cara del
 * proyecto y las abre cualquiera, sin cuenta.
 */
export const MAXIMO_INFRACCIONES = 0
