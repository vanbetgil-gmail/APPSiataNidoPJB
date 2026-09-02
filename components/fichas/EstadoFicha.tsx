import { colorEstado, descripcionEstado, etiquetaEstado } from '@/lib/fichas/transiciones'
import type { EstadoFicha as Estado } from '@/lib/supabase/tipos'

/**
 * Distintivo de estado de una ficha (parte de T101) — FR-038e.
 *
 * El autor debe poder ver de un vistazo en qué punto está cada una de sus
 * fichas y cuáles esperan revisión.
 */
export function EstadoFicha({ estado, conDescripcion = false }: { estado: Estado; conDescripcion?: boolean }) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span
        className="inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
        style={{ borderColor: colorEstado(estado), color: colorEstado(estado) }}
      >
        {etiquetaEstado(estado)}
      </span>
      {conDescripcion && (
        <span className="text-xs text-[color:var(--color-texto-suave)]">
          {descripcionEstado(estado)}
        </span>
      )}
    </span>
  )
}
