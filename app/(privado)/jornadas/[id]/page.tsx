import Link from 'next/link'
import { notFound } from 'next/navigation'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { FormularioMedicion } from '@/components/mediciones/FormularioMedicion'
import { CuentaAtras } from '@/components/mediciones/CuentaAtras'
import { CerrarJornada } from '@/components/mediciones/CerrarJornada'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { Aviso } from '@/components/ui/Aviso'
import { RANGOS } from '@/lib/validacion/rangos'
import {
  aISO,
  fechaLegible,
  MAXIMO_MEDICIONES,
  proximaMedicionEn,
} from '@/lib/mediciones/ritmo'
import type { Jornada, Medicion } from '@/lib/supabase/tipos'

export const metadata = { title: 'Jornada de medición' }

/** Las que se enseñan en el resumen de cada lectura. Las demás caben en la ficha. */
const DESTACADAS = ['pm25', 'pm10', 'co2', 'temperatura', 'humedad_relativa'] as const

export default async function PaginaJornada({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await exigirIntegrante(`/jornadas/${id}`)
  const supabase = await crearClienteServidor()

  const [{ data: fila }, { data: lecturas }] = await Promise.all([
    supabase.from('jornada').select('*').eq('id', id).maybeSingle(),
    supabase.from('medicion').select('*').eq('jornada_id', id).order('numero'),
  ])

  // RLS decide qué ve cada quien. Si no llega nada, un 404 dice menos sobre
  // lo que existe que un «no tiene permiso».
  if (!fila) notFound()

  const jornada = fila as Jornada
  const mediciones = (lecturas ?? []) as Medicion[]

  const [{ data: lugar }, { data: medidor }] = await Promise.all([
    supabase.from('lugar_medicion').select('nombre, es_interior').eq('id', jornada.lugar_id).maybeSingle(),
    supabase.from('medidor').select('numero_serie, etiqueta').eq('id', jornada.medidor_id).maybeSingle(),
  ])

  const siguiente = mediciones.length + 1
  const completa = mediciones.length >= MAXIMO_MEDICIONES
  const ultima = mediciones[mediciones.length - 1]
  const esHoy = jornada.fecha === aISO(new Date())

  /*
   * El cronómetro solo tiene sentido hoy.
   *
   * Pasando a limpio la jornada del miércoles pasado, una cuenta atrás de
   * diez minutos sobre una hora de hace tres días marcaría cero siempre y no
   * diría nada. Se pinta el ritmo, no un reloj parado.
   */
  const objetivo =
    esHoy && ultima ? proximaMedicionEn(jornada.fecha, ultima.hora).getTime() : null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/jornadas" className="text-sm text-[color:var(--color-marca)] no-underline">
        ← Mediciones
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {lugar?.nombre ?? 'Lugar sin nombre'}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-texto-suave)]">
          {fechaLegible(jornada.fecha)}
          {' · '}
          {medidor?.etiqueta ?? `Medidor ${medidor?.numero_serie ?? '—'}`}
          {lugar?.es_interior && ' · espacio cerrado'}
        </p>
      </header>

      <p className="mt-4 text-sm">
        <strong>
          {mediciones.length} de {MAXIMO_MEDICIONES}
        </strong>{' '}
        mediciones registradas.
        {jornada.cerrada && ' Esta jornada está cerrada.'}
      </p>

      {mediciones.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Lo registrado</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {mediciones.map((m) => (
              <li key={m.id}>
                <Tarjeta>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      Medición {m.numero}
                      <span className="ml-2 text-sm font-normal text-[color:var(--color-texto-suave)]">
                        {m.hora.slice(0, 5)}
                      </span>
                    </p>
                    {m.dato_dudoso && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: '#fff8ef',
                          border: '1px solid var(--color-ica-sensibles)',
                        }}
                      >
                        marcada como dudosa
                      </span>
                    )}
                  </div>

                  <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {DESTACADAS.map((clave) => {
                      const valor = m[clave]
                      if (valor === null || valor === undefined) return null
                      const rango = RANGOS.find((r) => r.clave === clave)
                      return (
                        <div key={clave} className="flex gap-1.5">
                          <dt className="text-[color:var(--color-texto-suave)]">
                            {rango?.etiqueta}
                          </dt>
                          <dd className="tabular-nums font-medium">
                            {valor}
                            {rango?.unidad ? ` ${rango.unidad}` : ''}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>

                  {m.nota_dudoso && (
                    <p className="mt-2 text-sm italic text-[color:var(--color-texto-suave)]">
                      «{m.nota_dudoso}»
                    </p>
                  )}
                </Tarjeta>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!jornada.cerrada && !completa && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Medición {siguiente}</h2>

          {objetivo !== null && (
            <div className="mt-3">
              <CuentaAtras objetivo={objetivo} numeroSiguiente={siguiente} />
            </div>
          )}

          {!esHoy && ultima && (
            <p className="mt-3 text-sm text-[color:var(--color-texto-suave)]">
              Esta jornada es de otro día, así que no hay cuenta atrás. La anterior se tomó a las{' '}
              {ultima.hora.slice(0, 5)}.
            </p>
          )}

          <div className="mt-5">
            <FormularioMedicion jornadaId={jornada.id} numero={siguiente} />
          </div>
        </section>
      )}

      {completa && !jornada.cerrada && (
        <div className="mt-8">
          <Aviso>
            <strong>Ya son {MAXIMO_MEDICIONES} mediciones.</strong> La jornada está completa; puede
            cerrarla.
          </Aviso>
        </div>
      )}

      <div className="mt-10">
        <CerrarJornada
          jornadaId={jornada.id}
          cerrada={jornada.cerrada}
          cuantas={mediciones.length}
        />
      </div>
    </div>
  )
}
