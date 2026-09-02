'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarEstadoIntegrante, cambiarRol } from '@/lib/auth/gestionEquipo'
import { Tarjeta } from '@/components/ui/Tarjeta'
import type { Integrante } from '@/lib/supabase/tipos'

/**
 * Gestión del equipo (parte de T046) — FR-013, FR-014.
 *
 * El correo se muestra aquí porque esta pantalla es privada y solo la ve el
 * responsable. FR-051 prohíbe exponerlos en las vistas PÚBLICAS, y de eso se
 * encarga la vista `integrante_publico`, que ni siquiera selecciona la
 * columna.
 */
export function GestionIntegrantes({
  integrantes,
  dominio,
}: {
  integrantes: Integrante[]
  dominio: string
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const activos = integrantes.filter((i) => i.activo)
  const inactivos = integrantes.filter((i) => !i.activo)
  const responsablesActivos = activos.filter((i) => i.rol === 'responsable').length

  function actuar(fn: () => Promise<{ ok: boolean; mensaje?: string }>) {
    setError(null)
    iniciar(async () => {
      const r = await fn()
      if (!r.ok) {
        setError(r.mensaje ?? 'No se pudo completar la acción.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-4 py-3 text-sm text-orange-950"
        >
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {activos.map((persona) => {
          // La base de datos impide quedarse sin responsables. Se desactiva
          // aquí también el botón para no ofrecer una acción que va a fallar.
          const esUltimoResponsable =
            persona.rol === 'responsable' && responsablesActivos === 1

          return (
            <li key={persona.id}>
              <Tarjeta>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{persona.nombre}</p>
                    <p className="truncate text-sm text-[color:var(--color-texto-suave)]">
                      {persona.correo}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--color-texto-suave)]">
                      {persona.rol === 'responsable' ? 'Responsable' : 'Integrante'}
                      {persona.es_menor_edad && ' · menor de edad'}
                      {persona.es_menor_edad &&
                        (persona.autorizacion_acudiente
                          ? ' · con autorización'
                          : ' · sin autorización')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pendiente || esUltimoResponsable}
                      title={
                        esUltimoResponsable
                          ? 'Debe quedar al menos un responsable activo'
                          : undefined
                      }
                      onClick={() =>
                        actuar(() =>
                          cambiarRol(
                            persona.id,
                            persona.rol === 'responsable' ? 'integrante' : 'responsable'
                          )
                        )
                      }
                      className="rounded-full border border-[color:var(--color-borde)] px-3 py-2 text-sm disabled:opacity-50"
                    >
                      {persona.rol === 'responsable' ? 'Quitar responsabilidad' : 'Hacer responsable'}
                    </button>

                    <button
                      type="button"
                      disabled={pendiente || esUltimoResponsable}
                      title={
                        esUltimoResponsable
                          ? 'Debe quedar al menos un responsable activo'
                          : undefined
                      }
                      onClick={() => actuar(() => cambiarEstadoIntegrante(persona.id, false))}
                      className="rounded-full border border-[color:var(--color-borde)] px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Retirar acceso
                    </button>
                  </div>
                </div>
              </Tarjeta>
            </li>
          )
        })}
      </ul>

      {inactivos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Sin acceso</h2>
          <p className="mt-1 text-sm text-[color:var(--color-texto-suave)]">
            Conservan la autoría de sus mediciones y fichas. Nunca se borran: hacerlo dejaría
            registros sin autor.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {inactivos.map((persona) => (
              <li
                key={persona.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] px-4 py-3"
              >
                <span className="text-sm text-[color:var(--color-texto-suave)]">
                  {persona.nombre} · {persona.correo}
                </span>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => actuar(() => cambiarEstadoIntegrante(persona.id, true))}
                  className="rounded-full border border-[color:var(--color-borde)] px-3 py-2 text-sm"
                >
                  Devolver acceso
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[--radius-tarjeta] border border-dashed border-[color:var(--color-borde)] p-5">
        <h2 className="font-semibold">Agregar a alguien al equipo</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
          <li>
            En el panel de Supabase, entre a <strong>Authentication → Users → Invite user</strong> y
            escriba el correo <strong>@{dominio}</strong> de la persona.
          </li>
          <li>
            Después, en <strong>Table Editor → integrante</strong>, cree la fila con el mismo{' '}
            <code>id</code> del usuario, su nombre, su rol y si es menor de edad.
          </li>
        </ol>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
          Se hace así a propósito. Crear cuentas desde esta pantalla exigiría darle a la aplicación
          la clave de servicio de Supabase, que sortea todos los permisos de la base de datos. Un
          fallo en el código dejaría de estar contenido.
        </p>
      </section>
    </div>
  )
}
