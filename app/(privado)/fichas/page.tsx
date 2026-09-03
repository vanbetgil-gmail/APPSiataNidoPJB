import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { InsigniaVerificacion } from '@/components/fichas/InsigniaVerificacion'
import { ListaFichas, type FichaConContexto } from '@/components/fichas/ListaFichas'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { EXIGENCIAS_COMPLETAS, EXIGENCIAS_FASE_INICIAL } from '@/lib/fichas/validarCompletitud'
import type { FichaBiodiversidad } from '@/lib/supabase/tipos'

export const metadata = { title: 'Clasificación taxonómica' }

/**
 * Clasificación taxonómica — FR-038e, FR-038f, FR-038g.
 *
 * ── Por qué la lista es del equipo y no «mía» ────────────────────────────
 *
 * Las 16 fichas del registro arbóreo las creó un script y están atribuidas a
 * la docente responsable, porque el trabajo de campo fue colectivo y
 * `autor_id` no admite nulos. Separando «mías» de «de otros», un estudiante
 * habría abierto esta pantalla y la habría encontrado vacía, justo cuando su
 * tarea es completarlas.
 *
 * La autoría se indica en cada tarjeta, que informa igual sin partir la
 * pantalla en dos.
 */
export default async function PaginaClasificacionTaxonomica() {
  const integrante = await exigirIntegrante('/fichas')
  const supabase = await crearClienteServidor()

  // RLS limita lo que cada quien puede leer; la consulta no lo repite.
  const [{ data }, { data: categorias }, { data: imagenBase }, { data: autores }] =
    await Promise.all([
      supabase
        .from('ficha_biodiversidad')
        .select('*')
        .order('nombre_comun'),
      supabase.from('categoria_biodiversidad').select('id, nombre'),
      supabase.from('imagen_base_mapa').select('version').eq('vigente', true).maybeSingle(),
      supabase.from('integrante').select('id, nombre'),
    ])

  const fichas = (data ?? []) as FichaBiodiversidad[]

  // FR-041a: mientras no haya ortofoto, la ubicación no bloquea la
  // publicación. En cuanto exista una imagen vigente vuelve a exigirse, sin
  // tocar una línea de código.
  const exigencias = imagenBase ? EXIGENCIAS_COMPLETAS : EXIGENCIAS_FASE_INICIAL

  const nombreCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nombre]))
  const nombreAutor = new Map((autores ?? []).map((a) => [a.id, a.nombre]))

  const { data: conteoFotos } = await supabase.from('foto_ficha').select('ficha_id')
  const fotosPorFicha = new Map<string, number>()
  for (const f of conteoFotos ?? []) {
    fotosPorFicha.set(f.ficha_id, (fotosPorFicha.get(f.ficha_id) ?? 0) + 1)
  }

  const entradas: FichaConContexto[] = fichas.map((ficha) => ({
    ficha,
    categoria: nombreCategoria.get(ficha.categoria_id) ?? null,
    autor: nombreAutor.get(ficha.autor_id) ?? null,
    numeroDeFotos: fotosPorFicha.get(ficha.id) ?? 0,
    esAutor: ficha.autor_id === integrante.id,
  }))

  const enRevision = fichas.filter((f) => f.estado === 'en_revision')
  const publicadas = fichas.filter((f) => f.estado === 'publicado')

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="antetitulo">— Biodiversidad del campus</p>
          <h1 className="mt-2 flex flex-wrap items-center text-3xl sm:text-4xl">
            Clasificación taxonómica
            <InsigniaVerificacion
              cantidad={enRevision.length}
              esResponsable={integrante.esResponsable}
            />
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
            {fichas.length === 0
              ? 'Todavía no hay ninguna especie registrada.'
              : `${fichas.length} especie${fichas.length === 1 ? '' : 's'} registrada${fichas.length === 1 ? '' : 's'}, ${publicadas.length} publicada${publicadas.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* FR-036: descarga en hoja de cálculo. Es un enlace normal y no un
              botón con JavaScript porque una descarga es exactamente eso: ir
              a buscar un archivo. */}
          {fichas.length > 0 && (
            <a
              href="/fichas/exportar"
              className="rounded-full px-5 py-3 text-sm no-underline"
              style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
            >
              Exportar a Excel
            </a>
          )}
          <Link
            href="/fichas/nueva"
            className="rounded-full px-5 py-3 font-medium text-white no-underline"
            style={{ backgroundColor: 'var(--color-marca)' }}
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
              Use el filtro «Por verificar» para encontrarlas. Cada una lleva su botón «Verificar y
              publicar»; hasta que las apruebe no se ven en público.
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

      <div className="mt-8">
        {fichas.length === 0 ? (
          <Tarjeta className="text-center">
            <p className="leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
              Cuando encuentre un árbol, un ave o un insecto en el colegio, tome su foto y escriba
              lo que observó. Así crece el mapa.
            </p>
          </Tarjeta>
        ) : (
          <ListaFichas
            entradas={entradas}
            esResponsable={integrante.esResponsable}
            exigencias={exigencias}
          />
        )}
      </div>

      <p className="mt-10 text-center text-sm" style={{ color: 'var(--color-texto-suave)' }}>
        Las fichas publicadas son las que ve cualquier persona en{' '}
        <Link href="/biodiversidad" style={{ color: 'var(--color-marca)' }}>
          Biodiversidad
        </Link>
        , sin necesidad de cuenta.
      </p>
    </div>
  )
}
