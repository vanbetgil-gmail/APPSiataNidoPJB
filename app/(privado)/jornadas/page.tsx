import Link from 'next/link'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { NuevaJornada } from '@/components/mediciones/NuevaJornada'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { Aviso } from '@/components/ui/Aviso'
import { aISO, fechaLegible, MAXIMO_MEDICIONES } from '@/lib/mediciones/ritmo'
import type { Jornada, LugarMedicion, Medidor } from '@/lib/supabase/tipos'

export const metadata = { title: 'Mediciones' }

/**
 * Registro de mediciones — Historia 3.
 *
 * ── Qué hace y qué le falta ──────────────────────────────────────────────
 *
 * Hace lo que el equipo necesita para dejar de anotar en papel: abrir una
 * jornada, registrar hasta ocho lecturas separadas diez minutos y cerrarla.
 * Lo escrito no se pierde aunque se caiga la señal al guardar.
 *
 * Lo que todavía NO hace es funcionar sin conexión. Los talleres son
 * cerrados y ahí no siempre hay señal (A-010b); para que la pantalla cargue
 * sin red hace falta un trabajador de servicio, y eso es una pieza aparte.
 * Se dice en pantalla en vez de dejar que se descubra en mitad de un taller.
 */
export default async function PaginaJornadas() {
  const integrante = await exigirIntegrante('/jornadas')
  const supabase = await crearClienteServidor()

  const [{ data: lugares }, { data: medidores }, { data: jornadas }] = await Promise.all([
    supabase.from('lugar_medicion').select('*').eq('activo', true).order('nombre'),
    supabase.from('medidor').select('*').eq('disponible', true).order('numero_serie'),
    supabase
      .from('jornada')
      .select('*')
      .eq('integrante_id', integrante.id)
      .order('fecha', { ascending: false })
      .limit(12),
  ])

  const mias = (jornadas ?? []) as Jornada[]
  const catalogoLugares = new Map((lugares ?? []).map((l: LugarMedicion) => [l.id, l.nombre]))

  // Cuántas lecturas lleva cada jornada. Una sola consulta para todas: una
  // por jornada serían doce viajes a la base para pintar una lista.
  const cuenta = new Map<string, number>()
  if (mias.length > 0) {
    const { data: mediciones } = await supabase
      .from('medicion')
      .select('jornada_id')
      .in('jornada_id', mias.map((j) => j.id))
    for (const m of mediciones ?? []) {
      cuenta.set(m.jornada_id, (cuenta.get(m.jornada_id) ?? 0) + 1)
    }
  }

  const abiertas = mias.filter((j) => !j.cerrada)
  const cerradas = mias.filter((j) => j.cerrada)
  const hoyISO = aISO(new Date())

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Registrar mediciones</h1>
      <p className="mt-2 leading-relaxed text-[color:var(--color-texto-suave)]">
        Una jornada es un lugar, un medidor y un día. Dentro caben hasta {MAXIMO_MEDICIONES}{' '}
        lecturas, separadas diez minutos.
      </p>

      {abiertas.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Sin terminar</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {abiertas.map((jornada) => (
              <li key={jornada.id}>
                <Link href={`/jornadas/${jornada.id}`} className="block no-underline">
                  <Tarjeta className="hover:border-[color:var(--color-marca)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {catalogoLugares.get(jornada.lugar_id) ?? 'Lugar sin nombre'}
                        </p>
                        <p className="text-sm text-[color:var(--color-texto-suave)]">
                          {fechaLegible(jornada.fecha)} ·{' '}
                          {cuenta.get(jornada.id) ?? 0} de {MAXIMO_MEDICIONES} mediciones
                        </p>
                      </div>
                      <span className="text-sm font-medium text-[color:var(--color-marca)]">
                        Continuar →
                      </span>
                    </div>
                  </Tarjeta>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Empezar una jornada</h2>

        {(lugares ?? []).length === 0 || (medidores ?? []).length === 0 ? (
          <div className="mt-3">
            <Aviso tono="precaucion">
              <strong>Faltan lugares o medidores en el catálogo.</strong> La docente responsable
              puede añadirlos desde el panel de Supabase, en las tablas{' '}
              <code>lugar_medicion</code> y <code>medidor</code>.
            </Aviso>
          </div>
        ) : (
          <div className="mt-4">
            <NuevaJornada
              lugares={(lugares ?? []) as LugarMedicion[]}
              medidores={(medidores ?? []) as Medidor[]}
              hoyISO={hoyISO}
            />
          </div>
        )}
      </section>

      {cerradas.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Jornadas anteriores</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {cerradas.map((jornada) => (
              <li key={jornada.id}>
                <Link
                  href={`/jornadas/${jornada.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] px-4 py-3 text-sm no-underline"
                >
                  <span>
                    {catalogoLugares.get(jornada.lugar_id) ?? 'Lugar sin nombre'} ·{' '}
                    {fechaLegible(jornada.fecha)}
                  </span>
                  <span className="text-[color:var(--color-texto-suave)]">
                    {cuenta.get(jornada.id) ?? 0} mediciones
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12">
        <Aviso>
          <strong>Todavía hace falta conexión.</strong> Si en el taller no hay señal, esta pantalla
          no carga. Lo que sí está resuelto es no perder lo tecleado: los números se guardan en el
          propio teléfono mientras se escriben, y siguen ahí si la conexión se cae al guardar o si
          la pantalla se bloquea.
        </Aviso>
      </div>

      <p className="mt-6 text-sm text-[color:var(--color-texto-suave)]">
        <Link href="/tableros" className="text-[color:var(--color-marca)]">
          Ver los tableros con todo lo medido
        </Link>
      </p>
    </div>
  )
}
