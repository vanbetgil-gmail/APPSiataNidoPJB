import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirResponsable } from '@/lib/auth/sesion'
import { InterruptorAutorizacion } from '@/components/fichas/InterruptorAutorizacion'
import { Aviso } from '@/components/ui/Aviso'
import { Tarjeta } from '@/components/ui/Tarjeta'
import type { Integrante } from '@/lib/supabase/tipos'

export const metadata = { title: 'Autorizaciones de acudientes' }

/**
 * Registro de autorizaciones de acudiente (T103) — FR-051d, FR-051e.
 *
 * «El responsable DEBE poder consultar qué integrantes tienen autorización
 * registrada y qué fichas están mostrando nombre de autor al público.»
 *
 * ── Lo que esta pantalla NO hace ─────────────────────────────────────────
 *
 * No recoge la autorización: la recoge el colegio, en papel o como acostumbre.
 * Aquí solo se REGISTRA que existe. La custodia del documento firmado es
 * responsabilidad de la institución (A-005a).
 */
export default async function PaginaAutorizaciones() {
  await exigirResponsable('/admin/autorizaciones')
  const supabase = await crearClienteServidor()

  const [{ data: personas }, { data: fichasVisibles }] = await Promise.all([
    supabase.from('integrante').select('*').eq('activo', true).order('nombre'),
    supabase
      .from('ficha_biodiversidad')
      .select('id, nombre_comun, autor_id')
      .eq('mostrar_autor', true)
      .eq('estado', 'publicado'),
  ])

  const integrantes = (personas ?? []) as Integrante[]
  const porAutor = new Map<string, number>()
  for (const f of fichasVisibles ?? []) {
    porAutor.set(f.autor_id, (porAutor.get(f.autor_id) ?? 0) + 1)
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Autorizaciones de acudientes</h1>
      <p className="mt-2 leading-relaxed text-[color:var(--color-texto-suave)]">
        Un integrante menor de edad solo puede mostrar su nombre en el mapa público si su acudiente
        lo autorizó. Aquí se registra que esa autorización existe.
      </p>

      <div className="mt-6">
        <Aviso tono="precaucion">
          <strong>El documento firmado lo custodia el colegio.</strong> Esta pantalla solo anota que
          la autorización existe. Al retirarla, el nombre desaparece de inmediato de todas las
          fichas de esa persona, pero las fichas siguen publicadas y se atribuyen al equipo.
        </Aviso>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {integrantes.map((persona) => (
          <li key={persona.id}>
            <Tarjeta>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{persona.nombre}</p>
                  <p className="text-sm text-[color:var(--color-texto-suave)]">
                    {persona.es_menor_edad ? 'Menor de edad' : 'Mayor de edad'}
                    {(porAutor.get(persona.id) ?? 0) > 0 &&
                      ` · ${porAutor.get(persona.id)} ficha${porAutor.get(persona.id) === 1 ? '' : 's'} con su nombre visible`}
                  </p>
                </div>

                {persona.es_menor_edad ? (
                  <InterruptorAutorizacion
                    integranteId={persona.id}
                    nombre={persona.nombre}
                    autorizado={persona.autorizacion_acudiente}
                  />
                ) : (
                  <span className="text-sm text-[color:var(--color-texto-suave)]">
                    No necesita autorización
                  </span>
                )}
              </div>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </div>
  )
}
