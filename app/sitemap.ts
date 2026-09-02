import type { MetadataRoute } from 'next'
import { crearClientePublico } from '@/lib/supabase/servidor'
import { urlAbsoluta } from '@/lib/sitio'

/**
 * Mapa del sitio para buscadores.
 *
 * Solo entra lo PÚBLICO. Nada de /tableros, /fichas ni /admin: no solo
 * requieren sesión, es que ni siquiera deben aparecer listadas.
 *
 * Las fichas de especie se incluyen una a una a propósito. Es lo que hace que
 * alguien buscando «guayacán Medellín colegio» pueda llegar al trabajo de los
 * estudiantes, que es justamente el objetivo de divulgación del proyecto.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: urlAbsoluta('/'), changeFrequency: 'weekly', priority: 1 },
    { url: urlAbsoluta('/biodiversidad'), changeFrequency: 'weekly', priority: 0.9 },
    { url: urlAbsoluta('/estacion'), changeFrequency: 'monthly', priority: 0.6 },
    { url: urlAbsoluta('/creditos'), changeFrequency: 'monthly', priority: 0.4 },
  ]

  try {
    const supabase = crearClientePublico()
    // `ficha_publica` solo devuelve fichas publicadas: un borrador no puede
    // colarse en el sitemap ni aunque alguien se equivoque aquí.
    const { data } = await supabase.from('ficha_publica').select('id, creada_en')

    const fichas: MetadataRoute.Sitemap = (data ?? []).map((f) => ({
      url: urlAbsoluta(`/especie/${f.id}`),
      lastModified: new Date(f.creada_en),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))

    return [...estaticas, ...fichas]
  } catch {
    // Si la base de datos no responde, se sirve al menos el esqueleto en
    // lugar de romper el sitemap entero.
    return estaticas
  }
}
