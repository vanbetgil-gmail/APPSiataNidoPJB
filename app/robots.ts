import type { MetadataRoute } from 'next'
import { esDominioDefinitivo, urlAbsoluta } from '@/lib/sitio'

/**
 * robots.txt
 *
 * Dos decisiones:
 *
 * 1. Las rutas privadas se excluyen explícitamente. No es una medida de
 *    seguridad —lo es RLS—, pero evita que aparezcan en buscadores enlaces a
 *    pantallas que solo llevarán a un formulario de acceso.
 *
 * 2. Los despliegues que NO están en el dominio del colegio se bloquean
 *    enteros. Sin esto, cada rama desplegada acabaría indexada como una copia
 *    del mapa compitiendo con la real.
 */
export default function robots(): MetadataRoute.Robots {
  if (!esDominioDefinitivo()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/tableros', '/fichas', '/jornadas', '/revision', '/admin', '/login', '/auth/'],
      },
    ],
    sitemap: urlAbsoluta('/sitemap.xml'),
  }
}
