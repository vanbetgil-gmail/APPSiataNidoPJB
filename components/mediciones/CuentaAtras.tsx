'use client'

import { useSyncExternalStore } from 'react'
import { comoReloj, segundosRestantes, MINUTOS_ENTRE_MEDICIONES } from '@/lib/mediciones/ritmo'

/**
 * Cronómetro hasta la siguiente medición.
 *
 * ── Por qué `useSyncExternalStore` y no un `useEffect` con setInterval ───
 *
 * Porque la hora actual no es un dato de React: es del mundo. Leerla con
 * `Date.now()` dentro del cuerpo de un componente es una impureza que
 * `react-hooks/purity` marca con razón, y guardarla en estado desde un
 * efecto obliga a un renderizado extra en cada montaje.
 *
 * `useSyncExternalStore` está hecho exactamente para esto: una suscripción
 * —el latido de un segundo— y una lectura del valor actual.
 *
 * ── Por qué en el servidor devuelve cero ─────────────────────────────────
 *
 * Porque el servidor y el teléfono no comparten reloj ni zona horaria. Si el
 * servidor pintara «07:12» y el navegador «07:09», React avisaría de una
 * discrepancia de hidratación. Devolviendo cero, el servidor pinta un
 * marcador neutro y el número real aparece al llegar al navegador.
 *
 * ── El cronómetro sobrevive a que se apague la pantalla ──────────────────
 *
 * No guarda cuánto lleva contando: calcula la diferencia con una hora
 * objetivo que viene de la última medición GUARDADA. Bloquear el teléfono,
 * cambiar de aplicación o recargar la página no lo alteran, porque no hay
 * nada que se pueda perder. Es lo que hace falta en un patio.
 */

function suscribirAlSegundo(alCambiar: () => void) {
  const id = setInterval(alCambiar, 1000)
  return () => clearInterval(id)
}

function useAhora(): number {
  return useSyncExternalStore(
    suscribirAlSegundo,
    () => Date.now(),
    () => 0
  )
}

export function CuentaAtras({
  objetivo,
  numeroSiguiente,
}: {
  /** Momento de la siguiente lectura, en milisegundos. */
  objetivo: number
  numeroSiguiente: number
}) {
  const ahora = useAhora()

  // Cero = todavía en el servidor. Un hueco de la misma altura evita que la
  // pantalla dé un salto al hidratarse.
  if (ahora === 0) {
    return <div className="h-[4.5rem]" aria-hidden />
  }

  const faltan = segundosRestantes(new Date(objetivo), new Date(ahora))
  const listo = faltan === 0
  const total = MINUTOS_ENTRE_MEDICIONES * 60
  const avance = Math.min(100, ((total - faltan) / total) * 100)

  return (
    <div
      className="rounded-[--radius-tarjeta] border p-4"
      style={{
        borderColor: listo ? 'var(--color-marca)' : 'var(--color-borde)',
        backgroundColor: listo ? 'var(--color-salvia-clara)' : 'var(--color-superficie)',
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {listo ? `Toca la medición ${numeroSiguiente}` : `Medición ${numeroSiguiente} en`}
        </p>
        {!listo && (
          <p
            // `role="timer"` es lo que este numero es: una cuenta atras. Se
            // lo dice a los lectores de pantalla, y de paso da un asidero
            // estable para las pruebas.
            role="timer"
            className="text-3xl font-semibold tabular-nums leading-none"
            style={{ color: 'var(--color-marca)' }}
          >
            {comoReloj(faltan)}
          </p>
        )}
      </div>

      {/* La barra dice de un vistazo, sin leer el número, cuánto queda. */}
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--color-borde)' }}
        role="presentation"
      >
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${avance}%`, backgroundColor: 'var(--color-marca)' }}
        />
      </div>

      <p className="mt-2 text-xs" style={{ color: 'var(--color-texto-suave)' }}>
        {listo
          ? 'Tome la lectura del medidor y escríbala abajo.'
          : `Se mide cada ${MINUTOS_ENTRE_MEDICIONES} minutos. Puede guardar antes si ya tiene la lectura.`}
      </p>

      {/*
        Solo se anuncia cuando llega a cero. Un `aria-live` que hablara cada
        segundo haría inutilizable el lector de pantalla.
      */}
      <p aria-live="polite" className="sr-only">
        {listo ? `Es hora de tomar la medición ${numeroSiguiente}.` : ''}
      </p>
    </div>
  )
}
