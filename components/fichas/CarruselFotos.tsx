'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Carrusel de fotografías de una especie.
 *
 * ── Por qué deslizante y no una encima de otra ───────────────────────────
 *
 * Una especie se fotografía varias veces: el árbol entero, la hoja de cerca,
 * la flor cuando sale. Apiladas en vertical, la segunda y la tercera quedan
 * tan abajo que nadie las ve, y en escritorio empujan el texto fuera de la
 * pantalla.
 *
 * ── Deslizar es el gesto, no el botón ────────────────────────────────────
 *
 * En el celular —donde se va a usar esto— se arrastra con el dedo. Eso lo
 * hace el navegador solo, con `scroll-snap`, y sale perfecto: la inercia, el
 * rebote y el frenado son los del sistema, no una imitación en JavaScript.
 *
 * Las flechas existen para el escritorio, donde no hay dedo que arrastrar, y
 * los puntos para saber cuántas fotos hay antes de empezar a deslizar. Ambos
 * son añadidos sobre algo que ya funciona sin ellos: si el JavaScript no
 * carga, el carrusel se sigue deslizando.
 *
 * ── Una sola foto no es un carrusel ──────────────────────────────────────
 *
 * Con una imagen no se pintan flechas ni puntos. Unos controles que no
 * llevan a ninguna parte invitan a pulsarlos y no hacen nada.
 */

export interface FotoCarrusel {
  src: string
  alt: string
  pie?: string
}

export function CarruselFotos({ fotos }: { fotos: FotoCarrusel[] }) {
  const pista = useRef<HTMLUListElement>(null)
  const [actual, setActual] = useState(0)

  const varias = fotos.length > 1

  /**
   * El índice se deduce de la posición de desplazamiento.
   *
   * Es la única forma de que el arrastre con el dedo —que el navegador
   * gestiona por su cuenta— y las flechas coincidan siempre. Si cada uno
   * llevara su propia cuenta, deslizar dejaría los puntos mintiendo.
   */
  const alDesplazar = useCallback(() => {
    const el = pista.current
    if (!el) return
    const indice = Math.round(el.scrollLeft / el.clientWidth)
    setActual(Math.max(0, Math.min(fotos.length - 1, indice)))
  }, [fotos.length])

  const irA = useCallback((indice: number) => {
    const el = pista.current
    if (!el) return
    // `prefers-reduced-motion` no es un detalle de cortesía: para algunas
    // personas el desplazamiento animado produce mareo real.
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: indice * el.clientWidth, behavior: sinMovimiento ? 'auto' : 'smooth' })
  }, [])

  // Al cambiar el ancho de la ventana, la posición guardada deja de
  // corresponder a la foto actual y el carrusel aparece a medio camino
  // entre dos. Se recoloca.
  useEffect(() => {
    if (!varias) return
    function recolocar() {
      const el = pista.current
      if (el) el.scrollTo({ left: actual * el.clientWidth, behavior: 'auto' })
    }
    window.addEventListener('resize', recolocar)
    return () => window.removeEventListener('resize', recolocar)
  }, [actual, varias])

  if (fotos.length === 0) return null

  if (!varias) {
    return <Marco foto={fotos[0]} prioritaria />
  }

  return (
    <div
      className="relative"
      role="group"
      aria-roledescription="carrusel"
      aria-label={`${fotos.length} fotografías`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') irA(Math.min(fotos.length - 1, actual + 1))
        if (e.key === 'ArrowLeft') irA(Math.max(0, actual - 1))
      }}
    >
      <ul
        ref={pista}
        onScroll={alDesplazar}
        tabIndex={0}
        className="desplazable-x flex snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {fotos.map((foto, i) => (
          <li key={foto.src} className="w-full shrink-0 snap-center">
            <Marco
              foto={foto}
              prioritaria={i === 0}
              posicion={`${i + 1} de ${fotos.length}`}
            />
          </li>
        ))}
      </ul>

      {/* Las flechas se ocultan en pantallas pequeñas: ahí sobra el dedo, y
          dos botones encima de la imagen solo tapan la foto. */}
      <Flecha
        lado="izquierda"
        onClick={() => irA(actual - 1)}
        deshabilitada={actual === 0}
      />
      <Flecha
        lado="derecha"
        onClick={() => irA(actual + 1)}
        deshabilitada={actual === fotos.length - 1}
      />

      <ol className="mt-3 flex justify-center gap-2">
        {fotos.map((foto, i) => (
          <li key={foto.src}>
            <button
              type="button"
              onClick={() => irA(i)}
              aria-label={`Ver la fotografía ${i + 1} de ${fotos.length}`}
              aria-current={i === actual}
              className="block h-2.5 w-2.5 rounded-full transition-opacity"
              style={{
                backgroundColor:
                  i === actual ? 'var(--color-marca)' : 'var(--color-borde)',
              }}
            />
          </li>
        ))}
      </ol>

      {/* Para lectores de pantalla, que no ven ni los puntos ni la posición. */}
      <p aria-live="polite" className="sr-only">
        Fotografía {actual + 1} de {fotos.length}
      </p>
    </div>
  )
}

function Flecha({
  lado,
  onClick,
  deshabilitada,
}: {
  lado: 'izquierda' | 'derecha'
  onClick: () => void
  deshabilitada: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      aria-label={lado === 'izquierda' ? 'Fotografía anterior' : 'Fotografía siguiente'}
      className={`absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border text-lg disabled:opacity-0 sm:flex ${
        lado === 'izquierda' ? 'left-1' : 'right-1'
      }`}
      style={{
        borderColor: 'var(--color-borde)',
        backgroundColor: 'var(--color-superficie)',
        color: 'var(--color-texto)',
        boxShadow: '0 2px 10px -4px rgba(28,59,49,.35)',
      }}
    >
      <span aria-hidden>{lado === 'izquierda' ? '‹' : '›'}</span>
    </button>
  )
}

/**
 * El marco de lámina de herbario.
 *
 * Un borde generoso con una sombra suave —el paspartú de toda la vida—
 * separa la imagen del fondo, que es casi del mismo tono, y le da a la foto
 * el aire de registro que le corresponde.
 *
 * No se fuerza relación de aspecto: un árbol se fotografía en vertical y un
 * ave en horizontal, y recortar a un cuadrado cortaría la copa o las alas.
 */
function Marco({
  foto,
  prioritaria,
  posicion,
}: {
  foto: FotoCarrusel
  prioritaria: boolean
  posicion?: string
}) {
  const pie = [foto.pie, posicion].filter(Boolean).join(' · ')

  return (
    <figure
      className="overflow-hidden rounded-[--radius-suave] p-3 sm:p-4"
      style={{
        backgroundColor: 'var(--color-superficie)',
        border: '1px solid var(--color-borde)',
        boxShadow: '0 1px 2px rgba(28,59,49,.04), 0 8px 24px -12px rgba(28,59,49,.18)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto.src}
        alt={foto.alt}
        loading={prioritaria ? 'eager' : 'lazy'}
        // `draggable={false}` para que arrastrar sobre la foto deslice el
        // carrusel en vez de iniciar un arrastre de imagen del navegador.
        draggable={false}
        className="w-full rounded-[--radius-tarjeta]"
        style={{ backgroundColor: 'var(--color-salvia-clara)' }}
      />

      {pie && (
        <figcaption className="mt-3 px-1 text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          {pie}
        </figcaption>
      )}
    </figure>
  )
}
