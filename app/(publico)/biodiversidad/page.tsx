import type { Metadata } from 'next'
import Link from 'next/link'
import { crearClientePublico, crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/auth/sesion'
import { CatalogoEspecies } from '@/components/biodiversidad/CatalogoEspecies'
import type { EspecieConFoto } from '@/components/biodiversidad/TarjetaEspecie'
import { urlFoto } from '@/lib/sitio'
import type { FichaBiodiversidad, FichaPublica } from '@/lib/supabase/tipos'

export const metadata: Metadata = {
  title: 'Biodiversidad PJB',
  description:
    'La fauna y la flora del Instituto Salesiano Pedro Justo Berrío, documentadas por los estudiantes del proyecto NIDO PJB.',
}

/**
 * Biodiversidad PJB — una sola pestaña para todos.
 *
 * ── Por qué no hay dos páginas ───────────────────────────────────────────
 *
 * Un visitante y un integrante ven el MISMO catálogo. La diferencia es que
 * quien tiene cuenta puede además crear fichas y editar las que ya existen.
 *
 * Tener dos páginas distintas —una pública y otra privada— llevaría a que se
 * desincronizaran: se arregla el filtro en una y no en la otra, se añade un
 * campo aquí y allí no. Una sola página con una capa de edición encima evita
 * ese problema de raíz, y además el equipo ve exactamente lo que ve el
 * público, que es lo que quieren comprobar antes de publicar.
 *
 * ── Qué cambia al iniciar sesión ─────────────────────────────────────────
 *
 * · Aparece el botón de documentar una especie nueva.
 * · Cada tarjeta lleva a la edición en lugar de a la ficha pública.
 * · Se ven también los borradores y las fichas en revisión, que un visitante
 *   no puede ver (lo impide RLS, no este código).
 */
export default async function PaginaBiodiversidad() {
  const integrante = await integranteActual()
  const base = crearClientePublico()

  // Las fichas publicadas: lo que ve cualquiera.
  const [{ data: publicadas }, { data: fotos }] = await Promise.all([
    base.from('ficha_publica').select('*').order('nombre_comun'),
    base.from('foto_ficha').select('ficha_id, ruta_storage, orden').order('orden'),
  ])

  const portadas = new Map<string, string>()
  for (const foto of fotos ?? []) {
    if (!portadas.has(foto.ficha_id)) portadas.set(foto.ficha_id, foto.ruta_storage)
  }

  const especies: EspecieConFoto[] = ((publicadas ?? []) as FichaPublica[]).map((f) => {
    const ruta = portadas.get(f.id)
    return { ...f, foto: ruta ? urlFoto(ruta) : null, editable: Boolean(integrante) }
  })

  // Para el equipo, además, lo que todavía no es público.
  let enProceso: FichaBiodiversidad[] = []
  if (integrante) {
    const supabase = await crearClienteServidor()
    const { data } = await supabase
      .from('ficha_biodiversidad')
      .select('*')
      .neq('estado', 'publicado')
      .order('creada_en', { ascending: false })
    enProceso = (data ?? []) as FichaBiodiversidad[]
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <p className="antetitulo mb-4">— Lo que vive en el campus</p>
          <h1 className="text-4xl sm:text-5xl">
            Biodiversidad
            <br />
            <em style={{ color: 'var(--color-marca)' }}>PJB</em>
          </h1>
          <p className="mt-5 leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
            Los animales y las plantas que viven en el Instituto Salesiano Pedro Justo Berrío, documentados
            uno a uno por los estudiantes. Cada ficha nació de una salida de campo.
          </p>
        </div>

        {integrante && (
          <Link
            href="/fichas/nueva"
            className="shrink-0 rounded-full px-5 py-3 text-sm font-medium text-white no-underline"
            style={{ backgroundColor: 'var(--color-bosque)' }}
          >
            + Documentar una especie
          </Link>
        )}
      </header>

      {/* Lo que el equipo tiene entre manos. Solo con sesión. */}
      {integrante && enProceso.length > 0 && (
        <section
          className="mb-10 rounded-[--radius-suave] p-6"
          style={{ backgroundColor: 'var(--color-crema-clara)' }}
        >
          <h2 className="text-xl">Fichas en proceso</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
            Todavía no se ven en público. {enProceso.length}{' '}
            {enProceso.length === 1 ? 'ficha' : 'fichas'} entre borradores y revisión.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {enProceso.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/fichas/${f.id}/editar`}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm no-underline"
                  style={{ borderColor: 'var(--color-borde)', backgroundColor: '#fff' }}
                >
                  {f.nombre_comun || 'Sin nombre'}
                  <span className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
                    {f.estado === 'en_revision' ? 'en revisión' : 'borrador'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CatalogoEspecies especies={especies} />

      {/* La ficha taxonómica llega después; conviene decirlo, no dejarlo
          sobreentendido. */}
      <p
        className="mt-12 rounded-[--radius-suave] p-6 text-center text-sm leading-relaxed"
        style={{ backgroundColor: 'var(--color-salvia-clara)', color: 'var(--color-texto-suave)' }}
      >
        Cada ficha crecerá con su clasificación taxonómica completa —reino, familia, género— cuando
        el equipo la defina. De momento se registran nombre común, nombre científico, categoría,
        fotografía y ubicación.
      </p>
    </div>
  )
}
