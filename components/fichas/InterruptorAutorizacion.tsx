'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarAutorizacion } from '@/lib/fichas/acciones'

/**
 * Interruptor de autorización de acudiente (parte de T103) — FR-051d.
 *
 * Retirar una autorización es una acción con consecuencia inmediata sobre lo
 * que se ve en internet, así que se confirma antes.
 */
export function InterruptorAutorizacion({
  integranteId,
  nombre,
  autorizado,
}: {
  integranteId: string
  nombre: string
  autorizado: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function aplicar(nuevoValor: boolean) {
    setError(null)
    iniciar(async () => {
      const resultado = await registrarAutorizacion(integranteId, nuevoValor)
      if (!resultado.ok) {
        setError(resultado.mensaje)
        return
      }
      setConfirmando(false)
      router.refresh()
    })
  }

  if (confirmando) {
    return (
      <div className="w-full rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 p-3 text-sm text-orange-950">
        <p>
          Al retirar la autorización, el nombre de {nombre} dejará de verse de inmediato en todas
          sus fichas publicadas. Las fichas siguen publicadas, atribuidas al equipo.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pendiente}
            onClick={() => aplicar(false)}
            className="rounded-full bg-[color:var(--color-ica-daniña)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pendiente ? 'Retirando…' : 'Retirar autorización'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="rounded-full border border-[color:var(--color-borde)] bg-white px-4 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => (autorizado ? setConfirmando(true) : aplicar(true))}
        className={`rounded-full px-4 py-2 text-sm ${
          autorizado
            ? 'border border-[color:var(--color-marca)] text-[color:var(--color-marca)]'
            : 'border border-[color:var(--color-borde)]'
        }`}
      >
        {autorizado ? '✓ Autorización registrada' : 'Registrar autorización'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-[color:var(--color-ica-daniña)]">
          {error}
        </p>
      )}
    </div>
  )
}
