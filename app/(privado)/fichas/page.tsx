import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { EstadoFicha } from '@/components/fichas/EstadoFicha'
import { AccionesFicha } from '@/components/fichas/AccionesFicha'
import { VisibilidadAutor } from '@/components/fichas/VisibilidadAutor'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { transicionesDisponibles } from '@/lib/fichas/transiciones'
import type { FichaBiodiversidad } from '@/lib/supabase/tipos'

export const metadata = { title: 'Mis fichas' }

/**
 * «Mis fichas» (T101) — FR-038e.
 *
 * «El integrante autor DEBE poder ver en todo momento el estado de cada uno
 * de sus registros y cuáles están pendientes de revisión.»
 *
 * Un responsable ve además las de todo el equipo: es quien tiene que
 * aprobarlas, y necesita el panorama completo.
 */
export default async function PaginaMisFichas() {
  const integrante = await exigirIntegrante('/fichas')
  const supabase = await crearClienteServidor()

  // RLS ya limita lo que cada quien puede leer: un integrante ve las suyas más
  // las publicadas; un responsable, todas. La consulta no filtra por autor a
  // propósito, para no duplicar esa regla en dos sitios.
  const { data } = await supabase
    .from('ficha_biodiversidad')
    .select('*')
    .order('modificada_en', { ascending: false, nullsFirst: false })
    .order('creada_en', { ascending: false })

  const todas = (data ?? []) as FichaBiodiversidad[]
  const mias = todas.filter((f) => f.autor_id === integrante.id)
  const deOtros = todas.filter((f) => f.autor_id !== integrante.id)

  const { data: conteoFotos } = await supabase.from('foto_ficha').select('ficha_id')
  const fotosPorFicha = new Map<string, number>()
  for (const f of conteoFotos ?? []) {
    fotosPorFicha.set(f.ficha_id, (fotosPorFicha.get(f.ficha_id) ?? 0) + 1)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis fichas</h1>
          <p className="mt-1 text-sm text-[color:var(--color-texto-suave)]">
            {mias.length === 0
              ? 'Todavía no ha documentado ninguna especie.'
              : `${mias.length} ficha${mias.length === 1 ? '' : 's'} documentada${mias.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <Link
          href="/fichas/nueva"
          className="rounded-full bg-[color:var(--color-marca)] px-5 py-3 font-medium text-white no-underline"
        >
          Documentar una especie
        </Link>
      </div>

      {mias.length === 0 ? (
        <Tarjeta className="mt-8 text-center">
          <p className="leading-relaxed text-[color:var(--color-texto-suave)]">
            Cuando encuentre un árbol, un ave o un insecto en el colegio, tome su foto, marque
            dónde estaba y escriba lo que observó. Así crece el mapa.
          </p>
        </Tarjeta>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {mias.map((ficha) => (
            <li key={ficha.id}>
              <FilaFicha
                ficha={ficha}
                numeroDeFotos={fotosPorFicha.get(ficha.id) ?? 0}
                esAutor
                esResponsable={integrante.esResponsable}
              />
            </li>
          ))}
        </ul>
      )}

      {integrante.esResponsable && deOtros.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Fichas del resto del equipo</h2>
          <p className="mt-1 text-sm text-[color:var(--color-texto-suave)]">
            Las ve porque es responsable del proyecto.
          </p>
          <ul className="mt-4 flex flex-col gap-4">
            {deOtros.map((ficha) => (
              <li key={ficha.id}>
                <FilaFicha
                  ficha={ficha}
                  numeroDeFotos={fotosPorFicha.get(ficha.id) ?? 0}
                  esAutor={false}
                  esResponsable
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function FilaFicha({
  ficha,
  numeroDeFotos,
  esAutor,
  esResponsable,
}: {
  ficha: FichaBiodiversidad
  numeroDeFotos: number
  esAutor: boolean
  esResponsable: boolean
}) {
  const transiciones = transicionesDisponibles({
    estado: ficha.estado,
    aprobadaAlgunaVez: ficha.aprobada_alguna_vez,
    esAutor,
    esResponsable,
    completa: numeroDeFotos > 0 && Boolean(ficha.descripcion?.trim()),
  })

  return (
    <Tarjeta>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{ficha.nombre_comun}</h3>
          <p className="text-sm italic text-[color:var(--color-texto-suave)]">
            {ficha.nombre_cientifico}
          </p>
        </div>
        <EstadoFicha estado={ficha.estado} conDescripcion />
      </div>

      {/* FR-038d: el autor debe ver POR QUÉ se le devolvió la ficha. */}
      {ficha.estado === 'borrador' && ficha.motivo_rechazo && (
        <div className="mt-3 rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-4 py-3 text-sm text-orange-950">
          <strong>Devuelta con observaciones:</strong> {ficha.motivo_rechazo}
        </div>
      )}

      {esAutor && ficha.estado === 'publicado' && (
        <div className="mt-4">
          <VisibilidadAutor fichaId={ficha.id} mostrarAutor={ficha.mostrar_autor} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <AccionesFicha fichaId={ficha.id} transiciones={transiciones} />
        {ficha.estado === 'publicado' && (
          <Link
            href={`/especie/${ficha.id}`}
            className="rounded-full border border-[color:var(--color-borde)] px-4 py-2 text-sm no-underline"
          >
            Ver como la ve el público
          </Link>
        )}
      </div>
    </Tarjeta>
  )
}
