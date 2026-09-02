/**
 * URL canónica del sitio.
 *
 * ── Por qué esto merece un archivo propio ────────────────────────────────
 *
 * NIDO PJB se aloja en el dominio del colegio, y hay al menos cuatro cosas
 * que dejan de funcionar si la aplicación no sabe cuál es su propia dirección:
 *
 *  1. **El enlace de acceso.** Es el fallo más grave y el más silencioso: si
 *     `emailRedirectTo` apunta a localhost, el correo llega bien pero al
 *     abrirlo desde el celular no lleva a ninguna parte. Nadie puede entrar y
 *     no hay ningún error visible que lo explique.
 *  2. **Las vistas previas al compartir.** Cuando un estudiante manda por
 *     WhatsApp el enlace de un guayacán, la miniatura necesita una URL
 *     absoluta de la foto. Con una ruta relativa no aparece nada.
 *  3. **El sitemap y el robots.txt**, que solo admiten URLs absolutas.
 *  4. **Las URL canónicas**, para que el sitio no se indexe dos veces —una
 *     por el dominio y otra por la dirección que asigna el alojamiento—.
 */

/**
 * Dominio definitivo del proyecto.
 *
 * La aplicación se sirve desde el dominio raíz, no desde un subdominio.
 */
export const DOMINIO_PRODUCCION = 'institutopedrojustoberrio.com'
export const URL_PRODUCCION = `https://${DOMINIO_PRODUCCION}`

function limpiar(url: string): string {
  const conEsquema = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
  return conEsquema.replace(/\/+$/, '')
}

/**
 * ── Orden de resolución ──────────────────────────────────────────────────
 *
 * 1. `NEXT_PUBLIC_URL_SITIO` — lo que configure el colegio. Manda siempre.
 * 2. **Despliegue de producción** → el dominio del colegio, sin más.
 *    Esta red de seguridad es deliberada: olvidar la variable rompería el
 *    acceso de todo el equipo sin producir ningún error visible, y ese es
 *    un fallo demasiado caro para dejarlo depender de que nadie se olvide.
 * 3. `VERCEL_URL` — la dirección efímera de cada despliegue de prueba.
 * 4. `http://localhost:3000` — desarrollo.
 */
export function urlSitio(): string {
  if (process.env.NEXT_PUBLIC_URL_SITIO) return limpiar(process.env.NEXT_PUBLIC_URL_SITIO)
  if (process.env.VERCEL_ENV === 'production') return URL_PRODUCCION
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return limpiar(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  if (process.env.VERCEL_URL) return limpiar(process.env.VERCEL_URL)
  return 'http://localhost:3000'
}

/** URL absoluta a partir de una ruta interna. */
export function urlAbsoluta(ruta: string): string {
  return `${urlSitio()}${ruta.startsWith('/') ? ruta : `/${ruta}`}`
}

/**
 * ¿Estamos sirviendo desde el dominio definitivo del colegio?
 *
 * Se usa para decidir si el sitio debe indexarse en buscadores: los
 * despliegues de prueba de Vercel NO deben aparecer en Google, o el colegio
 * acabaría con varias copias del mapa indexadas y compitiendo entre sí.
 */
export function esDominioDefinitivo(): boolean {
  return urlSitio().includes(DOMINIO_PRODUCCION)
}

/** URL pública de una fotografía guardada en Supabase Storage. */
export function urlFoto(rutaStorage: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos-fichas/${rutaStorage}`
}
