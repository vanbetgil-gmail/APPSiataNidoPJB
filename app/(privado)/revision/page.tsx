import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirResponsable } from '@/lib/auth/sesion'
import { AccionesFicha } from '@/components/fichas/AccionesFicha'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { transicionesDisponibles } from '@/lib/fichas/transiciones'
import type { FichaBiodiversidad } from '@/lib/supabase/tipos'

export const metadata = { title: 'Fichas por revisar' }

const DIAS_PARA_DESTACAR = 7

/**
 * Días transcurridos desde una fecha.
 *
 * Vive fuera del componente a propósito: `Date.now()` no es una función pura
 * y la regla `react-hooks/purity` de ESLint la prohíbe dentro del cuerpo de
 * un componente, aunque aquí se ejecute en el servidor.
 */
function diasDesde(fechaISO: string): number {
  return Math.floor((Date.now() - new Date(fechaISO).getTime()) / 86_400_000)
}

/**
 * Bandeja de revisión (T097) — FR-038f.
 *
 * «El responsable DEBE poder ver en un solo lugar todos los registros
 * pendientes de revisión, con su antigüedad.»
 *
 * La antigüedad no es decorativa: responde al caso límite «ficha olvidada en
 * revisión». Si el trabajo de un estudiante lleva una semana esperando, se
 * destaca. Dejarlo en el limbo desanima más que devolverlo con observaciones.
 */
export default async function PaginaRevision() {
  await exigirResponsable('/revision')
  const supabase = await crearClienteServidor()

  const { data } = await supabase
    .from('ficha_biodiversidad')
    .select('*')
    .eq('estado', 'en_revision')
    .order('modificada_en', { ascending: true, nullsFirst: true })

  const pendientes = (data ?? []) as FichaBiodiversidad[]

  const autores = new Map<string, string>()
  if (pendientes.length > 0) {
    const { data: personas } = await supabase
      .from('integrante')
      .select('id, nombre')
      .in('id', [...new Set(pendientes.map((f) => f.autor_id))])
    for (const p of personas ?? []) autores.set(p.id, p.nombre)
  }

  const fotos = new Map<string, string>()
  if (pendientes.length > 0) {
    const { data: archivos } = await supabase
      .from('foto_ficha')
      .select('ficha_id, ruta_storage, orden')
      .in('ficha_id', pendientes.map((f) => f.id))
      .order('orden')
    for (const a of archivos ?? []) {
      if (!fotos.has(a.ficha_id)) fotos.set(a.ficha_id, a.ruta_storage)
    }
  }

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos-fichas`

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Fichas por revisar</h1>
      <p className="mt-2 leading-relaxed text-[color:var(--color-texto-suave)]">
        Solo la <strong>primera</strong> publicación de cada ficha pasa por aquí. Una vez aprobada,
        su autor podrá editarla y los cambios saldrán directamente.
      </p>

      {pendientes.length === 0 ? (
        <Tarjeta className="mt-8 text-center">
          <p className="text-[color:var(--color-texto-suave)]">
            No hay nada pendiente. Todo el trabajo del equipo está al día.
          </p>
        </Tarjeta>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {pendientes.map((ficha) => {
            const referencia = ficha.modificada_en ?? ficha.creada_en
            const dias = diasDesde(referencia)
            const olvidada = dias >= DIAS_PARA_DESTACAR
            const ruta = fotos.get(ficha.id)

            return (
              <li key={ficha.id}>
                <Tarjeta
                  className={olvidada ? 'border-[color:var(--color-ica-sensibles)]' : ''}
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {ruta ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`${base}/${ruta}`}
                        alt={`Fotografía de ${ficha.nombre_comun}`}
                        className="h-40 w-full shrink-0 rounded-[--radius-tarjeta] object-cover sm:w-48"
                      />
                    ) : (
                      <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-[--radius-tarjeta] bg-[color:var(--color-fondo)] text-sm text-[color:var(--color-texto-suave)] sm:w-48">
                        Sin fotografía
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold">{ficha.nombre_comun}</h2>
                      <p className="text-sm italic text-[color:var(--color-texto-suave)]">
                        {ficha.nombre_cientifico}
                      </p>
                      <p className="mt-1 text-sm text-[color:var(--color-texto-suave)]">
                        Por {autores.get(ficha.autor_id) ?? 'un integrante'} ·{' '}
                        <span className={olvidada ? 'font-medium text-orange-700' : ''}>
                          {dias === 0
                            ? 'enviada hoy'
                            : `esperando hace ${dias} día${dias === 1 ? '' : 's'}`}
                        </span>
                      </p>

                      {olvidada && (
                        <p className="mt-2 rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-3 py-2 text-sm text-orange-950">
                          Lleva más de una semana esperando. Conviene resolverla.
                        </p>
                      )}

                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                        {ficha.descripcion}
                      </p>

                      <div className="mt-4">
                        <AccionesFicha
                          fichaId={ficha.id}
                          transiciones={transicionesDisponibles({
                            estado: ficha.estado,
                            aprobadaAlgunaVez: ficha.aprobada_alguna_vez,
                            esAutor: false,
                            esResponsable: true,
                            completa: Boolean(ruta) && Boolean(ficha.descripcion?.trim()),
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-8 text-sm text-[color:var(--color-texto-suave)]">
        <Link href="/fichas" className="text-[color:var(--color-marca)]">
          Ver todas las fichas del equipo
        </Link>
      </p>
    </div>
  )
}
