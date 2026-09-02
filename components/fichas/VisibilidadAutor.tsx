'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarVisibilidadAutor } from '@/lib/fichas/acciones'

/**
 * Ajuste de visibilidad del nombre del autor (T102) — FR-051a a FR-051d.
 *
 * ── Por qué está desactivado por omisión ─────────────────────────────────
 *
 * FR-051b lo exige, y la razón es concreta: la mayoría del equipo son menores
 * de edad y el mapa es público. Proteger por defecto es distinto de exponer
 * por descuido.
 *
 * Quien quiera aparecer lo decide ficha por ficha, y solo puede hacerlo si el
 * responsable ha registrado la autorización de su acudiente. Esa condición la
 * impone un disparador de la base de datos: no se puede saltar desde ningún
 * cliente, ni siquiera atacando la API directamente.
 */
export function VisibilidadAutor({
  fichaId,
  mostrarAutor,
}: {
  fichaId: string
  mostrarAutor: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function alternar() {
    setError(null)
    iniciar(async () => {
      const resultado = await cambiarVisibilidadAutor(fichaId, !mostrarAutor)
      if (!resultado.ok) {
        setError(resultado.mensaje)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={mostrarAutor}
          onChange={alternar}
          disabled={pendiente}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <span>
          <span className="font-medium">Mostrar mi nombre en esta ficha</span>
          <span className="block text-[color:var(--color-texto-suave)]">
            {mostrarAutor
              ? 'Su nombre aparece públicamente en esta ficha. Puede retirarlo cuando quiera.'
              : 'La ficha se atribuye al equipo NIDO PJB, sin su nombre.'}
          </span>
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-4 py-3 text-sm text-orange-950"
        >
          {error}
        </p>
      )}
    </div>
  )
}
