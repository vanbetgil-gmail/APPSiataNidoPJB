'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cerrarJornada, descartarJornada, reabrirJornada } from '@/lib/mediciones/acciones'

/**
 * Cerrar o reabrir una jornada.
 *
 * ── Por qué cerrar pide confirmación y reabrir no ────────────────────────
 *
 * Cerrar con dos mediciones cuando faltaban seis es el error caro: se
 * descubre al día siguiente, cuando ya no se puede volver al taller. Por eso
 * se dice cuántas lleva, en la propia confirmación.
 *
 * Reabrir no pide nada: es la corrección, no el error.
 *
 * ── Y por qué se puede reabrir ───────────────────────────────────────────
 *
 * Porque una jornada cerrada por equivocación, si no pudiera reabrirse,
 * obligaría a crear otra el mismo día en el mismo sitio. El histórico
 * acabaría con dos jornadas donde hubo una, y ningún tablero podría
 * distinguir eso de dos salidas reales.
 */
export function CerrarJornada({
  jornadaId,
  cerrada,
  cuantas,
}: {
  jornadaId: string
  cerrada: boolean
  cuantas: number
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function actuar(fn: () => Promise<{ ok: boolean; mensaje?: string }>) {
    setError(null)
    iniciar(async () => {
      const r = await fn()
      if (!r.ok) {
        setError(r.mensaje ?? 'No se pudo completar la acción.')
        return
      }
      setConfirmando(false)
      router.refresh()
    })
  }

  if (cerrada) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[color:var(--color-texto-suave)]">
          Jornada cerrada con {cuantas} {cuantas === 1 ? 'medición' : 'mediciones'}.
        </p>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => actuar(() => reabrirJornada(jornadaId))}
          className="rounded-full border border-[color:var(--color-borde)] px-4 py-2 text-sm disabled:opacity-60"
        >
          {pendiente ? 'Reabriendo…' : 'Reabrir'}
        </button>
        {error && (
          <p role="alert" className="text-sm text-[color:var(--color-ica-daniña)]">
            {error}
          </p>
        )}
      </div>
    )
  }

  if (!confirmando) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="rounded-full border border-[color:var(--color-borde)] px-4 py-2 text-sm"
          >
            Cerrar la jornada
          </button>

          {/*
            Descartar solo aparece si esta vacia.

            Es el error del primer dia: abrirla con el taller equivocado. Sin
            esto, esa fila se queda para siempre contando como una salida de
            campo que nunca ocurrio. Con una sola medicion guardada el boton
            desaparece, y la base de datos lo impide ademas por su cuenta
            (migracion 0017).
          */}
          {cuantas === 0 && (
            <button
              type="button"
              disabled={pendiente}
              onClick={() => {
                actuar(async () => {
                  const r = await descartarJornada(jornadaId)
                  if (r.ok) router.push('/jornadas')
                  return r
                })
              }}
              className="rounded-full border px-4 py-2 text-sm disabled:opacity-60"
              style={{ borderColor: 'var(--color-borde)', color: 'var(--color-texto-suave)' }}
            >
              {pendiente ? 'Descartando…' : 'Descartar: la abrí por error'}
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-[color:var(--color-ica-daniña)]">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-[--radius-tarjeta] border p-4"
      style={{ borderColor: 'var(--color-ica-sensibles)', backgroundColor: '#fff8ef' }}
    >
      <p className="text-sm leading-relaxed">
        {cuantas === 0 ? (
          <>
            Esta jornada <strong>no tiene ninguna medición</strong>. Al cerrarla quedará vacía en el
            histórico.
          </>
        ) : (
          <>
            Se cerrará con <strong>{cuantas}</strong>{' '}
            {cuantas === 1 ? 'medición' : 'mediciones'}. Podrá reabrirla si hace falta.
          </>
        )}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-sm text-[color:var(--color-ica-daniña)]">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={() => actuar(() => cerrarJornada(jornadaId))}
          className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-marca)' }}
        >
          {pendiente ? 'Cerrando…' : 'Sí, cerrar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="rounded-full border border-[color:var(--color-borde)] px-4 py-2 text-sm"
        >
          Seguir midiendo
        </button>
      </div>
    </div>
  )
}
