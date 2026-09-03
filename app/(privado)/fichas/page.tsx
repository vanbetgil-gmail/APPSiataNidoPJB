import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { EstadoFicha } from '@/components/fichas/EstadoFicha'
import { AccionesFicha } from '@/components/fichas/AccionesFicha'
import { VisibilidadAutor } from '@/components/fichas/VisibilidadAutor'
import { IlustracionCategoria } from '@/components/fichas/IlustracionCategoria'
import { InsigniaVerificacion } from '@/components/fichas/InsigniaVerificacion'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { transicionesDisponibles } from '@/lib/fichas/transiciones'
import {
  EXIGENCIAS_COMPLETAS,
  EXIGENCIAS_FASE_INICIAL,
  estaCompleta,
  pendientesNoBloqueantes,
} from '@/lib/fichas/validarCompletitud'
import type { FichaBiodiversidad } from '@/lib/supabase/tipos'

export const metadata = { title: 'Mis fichas' }

const TOPE_EDICIONES = 2

/**
 * «Mis fichas» (T101) — FR-038e, FR-038f, FR-038g.
 *
 * ── Por qué ya no separa «mías» de «de otros» ────────────────────────────
 *
 * Las 16 fichas del registro de taxonomía las creó un script y están
 * atribuidas a la docente responsable, porque el trabajo de campo fue
 * colectivo y `autor_id` no admite nulos. Con la separación anterior, un
 * estudiante habría abierto esta pantalla y la habría encontrado vacía,
 * justo cuando su tarea es completarlas.
 *
 * Ahora la lista es del equipo, y la autoría se indica en cada tarjeta en
 * vez de partir la pantalla en dos.
 */
export default async function PaginaMisFichas() {
  const integrante = await exigirIntegrante('/fichas')
  const supabase = await crearClienteServidor()

  // RLS limita lo que cada quien puede leer; la consulta no lo repite.
  const [{ data }, { data: categorias }, { data: imagenBase }, { data: autores }] =
    await Promise.all([
      supabase
        .from('ficha_biodiversidad')
        .select('*')
        .order('modificada_en', { ascending: false, nullsFirst: false })
        .order('creada_en', { ascending: false }),
      supabase.from('categoria_biodiversidad').select('id, nombre'),
      supabase.from('imagen_base_mapa').select('version').eq('vigente', true).maybeSingle(),
      supabase.from('integrante').select('id, nombre'),
    ])

  const fichas = (data ?? []) as FichaBiodiversidad[]

  // FR-041a: mientras no haya ortofoto, la ubicación no bloquea la
  // publicación. En cuanto exista una imagen vigente, vuelve a exigirse
  // sin tocar una línea de código.
  const exigencias = imagenBase ? EXIGENCIAS_COMPLETAS : EXIGENCIAS_FASE_INICIAL

  const nombreCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nombre]))
  const nombreAutor = new Map((autores ?? []).map((a) => [a.id, a.nombre]))

  const { data: conteoFotos } = await supabase.from('foto_ficha').select('ficha_id')
  const fotosPorFicha = new Map<string, number>()
  for (const f of conteoFotos ?? []) {
    fotosPorFicha.set(f.ficha_id, (fotosPorFicha.get(f.ficha_id) ?? 0) + 1)
  }

  const enRevision = fichas.filter((f) => f.estado === 'en_revision')

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center text-2xl font-semibold tracking-tight">
            Fichas del proyecto
            <InsigniaVerificacion
              cantidad={enRevision.length}
              esResponsable={integrante.esResponsable}
            />
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-texto-suave)]">
            {fichas.length === 0
              ? 'Todavía no hay ninguna especie documentada.'
              : `${fichas.length} especie${fichas.length === 1 ? '' : 's'} documentada${fichas.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* FR-036: descarga en hoja de cálculo. Es un enlace normal y no un
              botón con JavaScript porque una descarga es exactamente eso: ir
              a buscar un archivo. Así funciona con el navegador sin más. */}
          {fichas.length > 0 && (
            <a
              href="/fichas/exportar"
              className="rounded-full border px-5 py-3 text-sm no-underline"
              style={{ borderColor: 'var(--color-borde)', color: 'var(--color-texto)' }}
            >
              Exportar a Excel
            </a>
          )}
          <Link
            href="/fichas/nueva"
            className="rounded-full bg-[color:var(--color-marca)] px-5 py-3 font-medium text-white no-underline"
          >
            Documentar una especie
          </Link>
        </div>
      </div>

      {enRevision.length > 0 && (
        <div
          className="mt-6 rounded-[--radius-tarjeta] border px-4 py-3 text-sm leading-relaxed"
          style={{
            borderColor: integrante.esResponsable ? '#c62828' : 'var(--color-borde)',
            backgroundColor: integrante.esResponsable ? '#fdf3f3' : 'var(--color-fondo)',
          }}
        >
          {integrante.esResponsable ? (
            <>
              <strong>
                {enRevision.length} ficha{enRevision.length === 1 ? '' : 's'} esperando su
                verificación.
              </strong>{' '}
              Cada una tiene su botón «Verificar y publicar» más abajo. Hasta que las apruebe, no
              se ven en público.
            </>
          ) : (
            <>
              {enRevision.length} ficha{enRevision.length === 1 ? '' : 's'} enviada
              {enRevision.length === 1 ? '' : 's'} a verificación. La docente responsable las
              revisará antes de que se publiquen.
            </>
          )}
        </div>
      )}

      {fichas.length === 0 ? (
        <Tarjeta className="mt-8 text-center">
          <p className="leading-relaxed text-[color:var(--color-texto-suave)]">
            Cuando encuentre un árbol, un ave o un insecto en el colegio, tome su foto y escriba lo
            que observó. Así crece el mapa.
          </p>
        </Tarjeta>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {fichas.map((ficha) => (
            <li key={ficha.id}>
              <FilaFicha
                ficha={ficha}
                numeroDeFotos={fotosPorFicha.get(ficha.id) ?? 0}
                categoria={nombreCategoria.get(ficha.categoria_id) ?? null}
                autor={nombreAutor.get(ficha.autor_id) ?? null}
                esAutor={ficha.autor_id === integrante.id}
                esResponsable={integrante.esResponsable}
                exigencias={exigencias}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilaFicha({
  ficha,
  numeroDeFotos,
  categoria,
  autor,
  esAutor,
  esResponsable,
  exigencias,
}: {
  ficha: FichaBiodiversidad
  numeroDeFotos: number
  categoria: string | null
  autor: string | null
  esAutor: boolean
  esResponsable: boolean
  exigencias: typeof EXIGENCIAS_COMPLETAS
}) {
  const transiciones = transicionesDisponibles({
    estado: ficha.estado,
    aprobadaAlgunaVez: ficha.aprobada_alguna_vez,
    // Cualquier integrante puede mover la ficha por su ciclo de vida
    // (migración 0009): editar una ficha del equipo y luego no poder
    // enviarla a revisión sería dejar el trabajo a medias.
    esAutor: true,
    esResponsable,
    completa: estaCompleta(ficha, numeroDeFotos, exigencias),
  })

  const pendientes = pendientesNoBloqueantes(ficha, numeroDeFotos, exigencias)
  const edicionesRestantes = Math.max(0, TOPE_EDICIONES - ficha.ediciones_usadas)

  return (
    <Tarjeta>
      <div className="flex gap-4">
        {/* FR-041a: ilustración mientras se toman las fotografías. */}
        {numeroDeFotos === 0 && (
          <IlustracionCategoria
            categoria={categoria}
            className="hidden h-20 w-20 shrink-0 rounded-[--radius-tarjeta] sm:block"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold">{ficha.nombre_comun}</h3>
              <p className="text-sm italic text-[color:var(--color-texto-suave)]">
                {ficha.nombre_cientifico}
              </p>
              {autor && !esAutor && (
                <p className="mt-0.5 text-xs text-[color:var(--color-texto-suave)]">
                  Registrada por {autor}
                </p>
              )}
            </div>
            <EstadoFicha estado={ficha.estado} conDescripcion />
          </div>

          {pendientes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {pendientes.map((p) => (
                <li
                  key={p.campo}
                  className="text-xs text-[color:var(--color-texto-suave)]"
                >
                  <span aria-hidden>○ </span>
                  {p.mensaje}
                </li>
              ))}
            </ul>
          )}

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

            {ficha.estado !== 'publicado' && (
              <Link
                href={`/fichas/${ficha.id}`}
                className="rounded-full border border-[color:var(--color-borde)] px-4 py-2 text-sm no-underline"
              >
                Editar
              </Link>
            )}

            {ficha.estado === 'publicado' && (
              <Link
                href={`/especie/${ficha.id}`}
                className="rounded-full border border-[color:var(--color-borde)] px-4 py-2 text-sm no-underline"
              >
                Ver como la ve el público
              </Link>
            )}

            {/* FR-038f: el cupo se dice ANTES de gastarlo, no al agotarlo. */}
            {!esResponsable && ficha.estado !== 'publicado' && (
              <span
                className="text-xs"
                style={{
                  color:
                    edicionesRestantes === 0 ? '#c62828' : 'var(--color-texto-suave)',
                }}
              >
                {edicionesRestantes === 0
                  ? 'Sin ediciones disponibles: envíela a verificación'
                  : `${edicionesRestantes} edición${edicionesRestantes === 1 ? '' : 'es'} disponible${edicionesRestantes === 1 ? '' : 's'}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Tarjeta>
  )
}
