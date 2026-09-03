'use client'

import { useSyncExternalStore } from 'react'

/**
 * Fondo del acceso: toma aérea del campus, en video.
 *
 * ── Dos archivos, no uno ─────────────────────────────────────────────────
 *
 * El panel de escritorio ocupa media pantalla; la banda del celular mide
 * unos 200 px de alto. Servir el mismo archivo en los dos sitios significa
 * gastar 1,6 MB del plan de datos de un estudiante para llenar una franja
 * donde no se distingue el detalle.
 *
 *   escritorio → panoramica-campus.mp4   1 657 KB   12 s · 1280×720
 *   celular    → campus-movil.mp4          105 KB    7 s ·  540×304
 *
 * Los 540 px de ancho parecen pocos para una pantalla moderna, y lo serían
 * si la imagen se viera tal cual. Pero encima lleva un degradado que la
 * oscurece hasta un 62 %, y sobre él un titular grande: lo que queda por
 * debajo es una mancha de color en movimiento, no una fotografía que
 * alguien vaya a mirar de cerca. Subir a 720 px costaría el triple de
 * datos para una nitidez que el degradado se come.
 *
 * ── Por qué la decisión se toma en JavaScript ────────────────────────────
 *
 * Un `<video>` oculto con CSS se descarga igual: el navegador no sabe que
 * nunca se va a ver. Con `hidden lg:flex` en el panel y `lg:hidden` en la
 * banda, cada dispositivo se habría bajado LOS DOS archivos. Por eso cada
 * variante comprueba el ancho y solo se monta donde de verdad se ve.
 *
 * ── Cuándo no hay video en absoluto ──────────────────────────────────────
 *
 * · `prefers-reduced-motion` activado. Hay quien marca esa opción porque el
 *   movimiento le produce mareo, y una pantalla de acceso no es sitio para
 *   ignorarlo.
 * · Ahorro de datos activado. Si la persona se lo pidió al navegador,
 *   respetarlo es lo mínimo.
 *
 * En ambos casos queda la fotografía, que pesa 29 KB.
 *
 * ── Por qué la capa oscura encima ────────────────────────────────────────
 *
 * La toma es de un día despejado, casi blanca en el cielo. El texto blanco
 * encima quedaría en 1,2:1 de contraste, ilegible. El degradado la asienta
 * lo suficiente para pasar el mínimo de WCAG AA sin tapar el campus.
 */

export type VarianteFondo = 'panel' | 'banda'

const ANCHA = '(min-width: 1024px)'
const QUIETUD = '(prefers-reduced-motion: reduce)'

function suscribir(alCambiar: () => void): () => void {
  const listas = [window.matchMedia(ANCHA), window.matchMedia(QUIETUD)]
  listas.forEach((l) => l.addEventListener('change', alCambiar))
  return () => listas.forEach((l) => l.removeEventListener('change', alCambiar))
}

/**
 * Devuelve la variante que SÍ debe cargar video ahora mismo, o `null`.
 *
 * Se devuelve un solo valor en vez de dos banderas para que el resultado sea
 * comparable: `useSyncExternalStore` vuelve a renderizar cuando el valor
 * cambia, y un objeto nuevo en cada lectura provocaría un bucle.
 */
function leerCliente(): VarianteFondo | null {
  const quietud = window.matchMedia(QUIETUD).matches
  const conexion = (navigator as { connection?: { saveData?: boolean } }).connection
  if (quietud || conexion?.saveData === true) return null
  return window.matchMedia(ANCHA).matches ? 'panel' : 'banda'
}

/** En el servidor no hay pantalla que medir: se asume el caso más liviano. */
const leerServidor = (): VarianteFondo | null => null

export function FondoCampus({ variante }: { variante: VarianteFondo }) {
  const conVideoEn = useSyncExternalStore(suscribir, leerCliente, leerServidor)
  const conVideo = conVideoEn === variante

  /*
   * La fotografía también va emparejada con la variante.
   *
   * Sirve dos veces: es lo que se ve antes de que arranque el video, y es el
   * fondo definitivo de quien tiene el movimiento reducido o el ahorro de
   * datos activados. Para esa persona no es un respaldo momentáneo, así que
   * en el panel grande conviene la versión de 1280 px; en la banda del
   * celular, la de 760 px basta y pesa una tercera parte.
   */
  const fuente =
    variante === 'panel' ? '/inmersivas/panoramica-campus.mp4' : '/fondo/campus-movil.mp4'

  const foto = variante === 'panel' ? '/fondo/campus.jpg' : '/fondo/campus-movil.jpg'

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto}
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
          poster={foto}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'saturate(0.9)' }}
        >
          <source src={fuente} type="video/mp4" />
        </video>
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            variante === 'panel'
              ? 'linear-gradient(180deg, rgba(18,44,36,.42) 0%, rgba(18,44,36,.58) 45%, rgba(18,44,36,.82) 100%)'
              : 'linear-gradient(180deg, rgba(18,44,36,.30) 0%, rgba(18,44,36,.62) 100%)',
        }}
      />
    </div>
  )
}
