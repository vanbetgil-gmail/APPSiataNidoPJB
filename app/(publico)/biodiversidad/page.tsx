import type { Metadata } from 'next'
import { crearClientePublico } from '@/lib/supabase/servidor'
import { CatalogoEspecies } from '@/components/biodiversidad/CatalogoEspecies'
import type { EspecieConFoto } from '@/components/biodiversidad/TarjetaEspecie'
import type { FichaPublica } from '@/lib/supabase/tipos'

export const metadata: Metadata = {
  title: 'Biodiversidad PJB',
  description:
    'Animales y plantas del Instituto Pedro Justo Berrío, documentados por los estudiantes del proyecto NIDO PJB.',
}

export const revalidate = 300

/**
 * Catálogo público de biodiversidad (subpestaña «Biodiversidad PJB»).
 *
 * Pública sin cuenta, igual que el mapa (FR-005): lee de `ficha_publica`, que
 * solo devuelve fichas en estado `publicado` y jamás incluye correos.
 */
export default async function PaginaBiodiversidad() {
  const supabase = crearClientePublico()

  const [fichasRes, fotosRes] = await Promise.all([
    supabase.from('ficha_publica').select('*').order('nombre_comun'),
    supabase.from('foto_ficha').select('ficha_id, ruta_storage, orden').order('orden'),
  ])

  const fichas = (fichasRes.data ?? []) as FichaPublica[]

  // Primera foto de cada ficha. Se resuelve en memoria y no con un join
  // porque son decenas de filas: traer las dos tablas enteras es más simple
  // y más rápido que una consulta anidada.
  const portadas = new Map<string, string>()
  for (const foto of fotosRes.data ?? []) {
    if (!portadas.has(foto.ficha_id)) portadas.set(foto.ficha_id, foto.ruta_storage)
  }

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos-fichas`
  const especies: EspecieConFoto[] = fichas.map((ficha) => {
    const ruta = portadas.get(ficha.id)
    return { ...ficha, foto: ruta ? `${base}/${ruta}` : null }
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Biodiversidad PJB</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-[color:var(--color-texto-suave)]">
          Los animales y las plantas que viven en el Instituto Pedro Justo Berrío, documentados uno
          a uno por los estudiantes del proyecto. Cada ficha nació de una salida de campo.
        </p>
      </header>

      <CatalogoEspecies especies={especies} />
    </div>
  )
}
