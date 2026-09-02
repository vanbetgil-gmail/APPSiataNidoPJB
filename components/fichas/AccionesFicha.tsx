'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AccionFicha, TransicionPermitida } from '@/lib/fichas/transiciones'
import {
  aprobarFicha,
  despublicarFicha,
  enviarARevision,
  publicarDirecto,
  rechazarFicha,
  retirarDeRevision,
} from '@/lib/fichas/acciones'

/**
 * Botones de transición de una ficha (parte de T096 a T099).
 *
 * Cada acción muestra ANTES su consecuencia. Publicar hace visible el trabajo
 * de un estudiante en internet y devolver una ficha puede desanimar: ninguna
 * de las dos debería ocurrir por un clic distraído.
 */
export function AccionesFicha({
  fichaId,
  transiciones,
}: {
  fichaId: string
  transiciones: TransicionPermitida[]
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [confirmando, setConfirmando] = useState<TransicionPermitida | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  function ejecutar(accion: AccionFicha) {
    setError(null)
    iniciar(async () => {
      const resultado = await (async () => {
        switch (accion) {
          case 'enviar_a_revision':
            return enviarARevision(fichaId)
          case 'aprobar':
            return aprobarFicha(fichaId)
          case 'rechazar':
            return rechazarFicha(fichaId, motivo)
          case 'publicar_directo':
          case 'republicar':
            return publicarDirecto(fichaId)
          case 'despublicar':
            return despublicarFicha(fichaId)
          case 'volver_a_borrador':
            return retirarDeRevision(fichaId)
        }
      })()

      if (!resultado.ok) {
        setError(resultado.mensaje)
        return
      }
      setConfirmando(null)
      setMotivo('')
      router.refresh()
    })
  }

  if (transiciones.length === 0 && !error) return null

  return (
    <div className="flex w-full flex-col gap-3">
      {confirmando ? (
        <div className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-fondo)] p-4">
          <p className="text-sm leading-relaxed">{confirmando.consecuencia}</p>

          {confirmando.accion === 'rechazar' && (
            <div className="mt-3 flex flex-col gap-1.5">
              <label htmlFor="motivo" className="text-sm font-medium">
                ¿Qué debe corregir? (obligatorio)
              </label>
              <textarea
                id="motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Por ejemplo: el nombre científico no corresponde, revísenlo en…"
                className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pendiente || (confirmando.accion === 'rechazar' && motivo.trim().length < 10)}
              onClick={() => ejecutar(confirmando.accion)}
              className="rounded-full bg-[color:var(--color-marca)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pendiente ? 'Aplicando…' : `Sí, ${confirmando.etiqueta.toLowerCase()}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmando(null)
                setError(null)
              }}
              className="rounded-full border border-[color:var(--color-borde)] px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {transiciones.map((t) => (
            <button
              key={t.accion}
              type="button"
              onClick={() => setConfirmando(t)}
              className={`rounded-full px-4 py-2 text-sm ${
                t.publica
                  ? 'bg-[color:var(--color-marca)] font-medium text-white'
                  : 'border border-[color:var(--color-borde)]'
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="whitespace-pre-line rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-4 py-3 text-sm text-orange-950"
        >
          {error}
        </p>
      )}
    </div>
  )
}
