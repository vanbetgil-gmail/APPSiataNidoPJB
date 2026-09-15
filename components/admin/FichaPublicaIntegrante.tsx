'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarFichaPublica } from '@/lib/auth/gestionEquipo'
import type { Integrante } from '@/lib/supabase/tipos'

/**
 * Cómo aparece una persona en la página pública del equipo (migración 0015).
 *
 * ── Por qué está aquí y no escrito en el código ──────────────────────────
 *
 * Porque «ocultar a esta persona» y «esta es la líder del proyecto» son
 * afirmaciones sobre personas reales, y este repositorio es público: una vez
 * escritas en el código quedan en la historia de git para siempre, sin forma
 * de retirarlas. Viviendo en la base de datos se cambian en un clic.
 *
 * Y son decisiones que cambian: alguien lidera este año y el siguiente no,
 * entra un docente nuevo, un estudiante pasa a undécimo. Nada de eso debería
 * exigir un despliegue.
 *
 * ── Los tres campos son uno solo ─────────────────────────────────────────
 *
 * Se guardan juntos porque juntos se deciden: quien abre esto está mirando la
 * página del equipo y colocando a una persona en ella.
 */
export function FichaPublicaIntegrante({ persona }: { persona: Integrante }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const [visible, setVisible] = useState(persona.visible_en_equipo)
  const [cargo, setCargo] = useState(persona.grado ?? '')
  const [orden, setOrden] = useState(
    persona.orden_equipo === null ? '' : String(persona.orden_equipo)
  )

  // La vista `integrante_publico` exige ADEMÁS la autorización del acudiente.
  // Marcar la casilla no basta, y conviene decirlo antes de que alguien se
  // pregunte por qué el nombre no sale.
  const retenidoPorAutorizacion = persona.es_menor_edad && !persona.autorizacion_acudiente

  function guardar() {
    setError(null)
    setGuardado(false)
    iniciar(async () => {
      const r = await actualizarFichaPublica(persona.id, {
        visible,
        cargo,
        orden: orden.trim() === '' ? null : Number(orden),
      })
      if (!r.ok) {
        setError(r.mensaje)
        return
      }
      setGuardado(true)
      router.refresh()
    })
  }

  const resumen = [
    persona.visible_en_equipo ? 'se muestra' : 'oculta',
    persona.grado ?? 'sin cargo',
    persona.orden_equipo !== null ? `puesto ${persona.orden_equipo}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mt-3 border-t border-[color:var(--color-borde)] pt-3">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="text-sm text-[color:var(--color-marca)]"
      >
        {abierto ? '▾' : '▸'} Ficha pública — {resumen}
      </button>

      {abierto && (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Aparece en la página pública del equipo
              <span className="block text-xs text-[color:var(--color-texto-suave)]">
                Desmarcarlo no le quita el acceso ni afecta a sus fichas. Solo deja de salir en el
                anuario.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-[14rem] flex-1 flex-col gap-1">
              <label htmlFor={`cargo-${persona.id}`} className="text-sm font-medium">
                Cargo o grado
              </label>
              <input
                id={`cargo-${persona.id}`}
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder={
                  persona.rol === 'responsable' ? 'Líder del proyecto' : '10-B'
                }
                className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-3 py-2 text-sm"
              />
              <p className="text-xs text-[color:var(--color-texto-suave)]">
                Es lo que se lee bajo el nombre. Si lo deja vacío, un docente aparece como
                «Docente acompañante».
              </p>
            </div>

            <div className="flex w-28 flex-col gap-1">
              <label htmlFor={`orden-${persona.id}`} className="text-sm font-medium">
                Orden
              </label>
              <input
                id={`orden-${persona.id}`}
                type="number"
                min={1}
                max={99}
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-3 py-2 text-sm"
              />
              <p className="text-xs text-[color:var(--color-texto-suave)]">
                1 va primero. Vacío, al final.
              </p>
            </div>
          </div>

          {visible && retenidoPorAutorizacion && (
            <p className="rounded-[--radius-tarjeta] border border-[color:var(--color-salvia)] bg-[color:var(--color-salvia-clara)] px-3 py-2 text-xs leading-relaxed">
              Aunque quede marcada, <strong>no aparecerá</strong> mientras no se registre la
              autorización de su acudiente. Es menor de edad y la base de datos lo impide.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-[color:var(--color-ica-daniña)]">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={pendiente}
              className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-marca)' }}
            >
              {pendiente ? 'Guardando…' : 'Guardar'}
            </button>
            {guardado && !pendiente && (
              <span className="text-sm text-[color:var(--color-marca)]">Guardado.</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
