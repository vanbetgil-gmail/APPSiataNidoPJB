import Link from 'next/link'
import { notFound } from 'next/navigation'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioFicha } from '@/components/fichas/FormularioFicha'
import { cargarDatosDelFormulario } from '@/lib/fichas/datosDelFormulario'
import { EstadoFicha as EtiquetaEstado } from '@/components/fichas/EstadoFicha'
import type { FichaBiodiversidad } from '@/lib/supabase/tipos'

export const metadata = { title: 'Editar ficha' }

const TOPE_EDICIONES = 2

/**
 * Edición de una ficha — FR-038f.
 *
 * ── Por qué esta página no existía ───────────────────────────────────────
 *
 * Tres sitios enlazaban aquí —la lista de fichas, el catálogo y cada
 * tarjeta de especie— y ninguno llevaba a ninguna parte: la ruta nunca se
 * creó. Editar una ficha, que es la tarea central del equipo, daba 404
 * desde el primer día.
 *
 * ── El cupo se avisa ANTES ───────────────────────────────────────────────
 *
 * El tope de dos ediciones lo aplica un disparador de la base de datos, así
 * que quien lo agote se encontraría el rechazo al pulsar guardar, con el
 * trabajo ya escrito. Aquí se dice al abrir.
 */
export default async function PaginaEditarFicha({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const integrante = await exigirIntegrante(`/fichas/${id}/editar`)
  const supabase = await crearClienteServidor()

  const [{ data }, datosFormulario] = await Promise.all([
    supabase.from('ficha_biodiversidad').select('*').eq('id', id).maybeSingle(),
    cargarDatosDelFormulario(),
  ])

  // RLS ya decide qué puede leer cada quien: si no llega nada, es que esta
  // persona no tiene por qué verla, y un 404 dice menos que un «no tiene
  // permiso» sobre lo que existe.
  if (!data) notFound()

  const ficha = data as FichaBiodiversidad
  const edicionesRestantes = Math.max(0, TOPE_EDICIONES - (ficha.ediciones_usadas ?? 0))
  const sinCupo = !integrante.esResponsable && edicionesRestantes === 0

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/fichas" className="text-sm text-[color:var(--color-marca)] no-underline">
        ← Clasificación taxonómica
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{ficha.nombre_comun}</h1>
          <p className="text-sm italic" style={{ color: 'var(--color-texto-suave)' }}>
            {ficha.nombre_cientifico}
          </p>
        </div>
        <EtiquetaEstado estado={ficha.estado} />
      </div>

      {sinCupo ? (
        <div
          className="mt-6 rounded-[--radius-tarjeta] border px-5 py-4 text-sm leading-relaxed"
          style={{ borderColor: '#c62828', backgroundColor: '#fdf3f3' }}
        >
          <strong>Esta ficha ya se editó dos veces.</strong> Para seguir mejorándola, envíela a
          verificación desde la lista de fichas: la docente responsable puede corregir lo que haga
          falta y devolverla si conviene.
        </div>
      ) : (
        <>
          <p
            className="mt-3 mb-8 text-sm leading-relaxed"
            style={{ color: 'var(--color-texto-suave)' }}
          >
            {integrante.esResponsable
              ? 'Como responsable del proyecto, sus ediciones no consumen cupo.'
              : `Le ${edicionesRestantes === 1 ? 'queda' : 'quedan'} ${edicionesRestantes} edición${
                  edicionesRestantes === 1 ? '' : 'es'
                } sobre esta ficha. Cambiar su estado no cuenta.`}
          </p>

          <FormularioFicha
            categorias={datosFormulario.categorias}
            zonas={datosFormulario.zonas}
            integrantes={datosFormulario.integrantes}
            imagen={datosFormulario.imagen}
            autorPorDefecto={integrante.id}
            esResponsable={integrante.esResponsable}
            ficha={ficha}
          />
        </>
      )}
    </div>
  )
}
