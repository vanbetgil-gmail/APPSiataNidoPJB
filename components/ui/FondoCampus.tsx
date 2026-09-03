'use client'

import { useSyncExternalStore } from 'react'

/**
 * Fondo del acceso: toma aérea del campus.
 *
 * ── Por qué el video NO se descarga en el celular ────────────────────────
 *
 * Un `<video>` oculto con CSS se descarga igual: el navegador no sabe que
 * nunca se va a ver. Serían 1,6 MB del plan de datos de un estudiante cada
 * vez que abre el acceso, para no ver nada.
 *
 * Por eso la fuente se asigna desde JavaScript y solo cuando se cumplen las
 * tres condiciones. Mientras tanto —y siempre en el celular— lo que se ve es
 * la fotografía, que pesa 29 KB.
 *
 * Las tres condiciones:
 *
 *   1. Pantalla ancha. En el celular el panel ni siquiera se muestra; el
 *      video sería peso sin beneficio.
 *   2. `prefers-reduced-motion` desactivado. Hay quien marca esa opción
 *      porque el movimiento le produce mareo o desorientación, y una
 *      pantalla de acceso no es sitio para ignorarlo.
 *   3. Ahorro de datos desactivado. Si la persona pidió al navegador que
 *      ahorre datos, respetarlo es lo mínimo.
 *
 * ── Por qué la capa oscura encima ────────────────────────────────────────
 *
 * La toma es de un día despejado, casi blanca en el cielo. El texto blanco
 * encima quedaría en 1,2:1 de contraste, ilegible. El degradado la asienta
 * lo suficiente para pasar el mínimo de WCAG AA sin tapar el campus.
 */

const CONSULTAS = ['(min-width: 1024px)', '(prefers-reduced-motion: reduce)'] as const

/**
 * `useSyncExternalStore` y no `useEffect` + `setState`.
 *
 * Es la forma que React ofrece para leer algo que vive fuera de React —aquí,
 * el tamaño de la ventana y las preferencias del sistema— y volver a
 * renderizar cuando cambia. Con un efecto que llama a `setState` habría un
 * render de más en cada carga, y además el valor del servidor y el del
 * cliente podrían discrepar durante un instante.
 */
function suscribir(alCambiar: () => void): () => void {
  const listas = CONSULTAS.map((c) => window.matchMedia(c))
  listas.forEach((l) => l.addEventListener('change', alCambiar))
  return () => listas.forEach((l) => l.removeEventListener('change', alCambiar))
}

function leerCliente(): boolean {
  const ancha = window.matchMedia('(min-width: 1024px)').matches
  const quietud = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const conexion = (navigator as { connection?: { saveData?: boolean } }).connection
  return ancha && !quietud && conexion?.saveData !== true
}

/** En el servidor no hay pantalla que medir: se asume el caso más liviano. */
const leerServidor = () => false

export function FondoCampus() {
  const conVideo = useSyncExternalStore(suscribir, leerCliente, leerServidor)

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fondo/campus-movil.jpg"
        alt=""
        className="h-full w-full object-cover"
        style={{ filter: 'saturate(0.9)' }}
      />

      {conVideo && (
        <video
          autoPlay
          muted
          loop
          // `playsInline` es obligatorio: sin él, Safari en iOS abre el video
          // a pantalla completa en cuanto empieza, tapando el formulario.
          playsInline
          poster="/fondo/campus.jpg"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'saturate(0.9)' }}
        >
          <source src="/inmersivas/panoramica-campus.mp4" type="video/mp4" />
        </video>
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(18,44,36,.42) 0%, rgba(18,44,36,.58) 45%, rgba(18,44,36,.82) 100%)',
        }}
      />
    </div>
  )
}
