'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapaLeaflet } from 'leaflet'
import { LIMITES_CAMPUS, PERIMETRO_CAMPUS, type Coordenada } from '@/lib/mapa/campus'

/**
 * Mapa del campus sobre imagen satelital.
 *
 * ── Por qué existe este componente y no el de la ortofoto ────────────────
 *
 * Porque la ortofoto no existe. El vuelo de dron que hizo el colegio no tiene
 * ni una sola toma cenital —está documentado en docs/inventario-dron.md— así
 * que el mapa llevaba meses mostrando «El mapa aún no está disponible».
 *
 * Este funciona hoy. Cuando llegue la ortofoto se añade encima como una capa
 * más, sobre las mismas coordenadas, y ninguna ficha habrá que volver a
 * marcarla.
 *
 * ── De dónde salen las teselas ───────────────────────────────────────────
 *
 * De Esri World Imagery, que permite su uso citando la fuente. La atribución
 * que se pinta abajo a la derecha no es decorativa: es la condición de uso, y
 * quitarla convertiría esto en una infracción.
 *
 * **Google Maps y Google Earth NO sirven para esto.** Sus términos prohíben
 * usar sus imágenes como fondo de una aplicación propia, y una captura de
 * pantalla no deja de ser su imagen. Queda escrito aquí porque es lo primero
 * que se le ocurre a cualquiera.
 *
 * ── Los límites encierran al visitante en el colegio ─────────────────────
 *
 * `maxBounds` con un poco de holgura. Sin eso, dos gestos de arrastre llevan
 * a un mapa del mundo entero y a la pregunta «¿y esto qué es?». El zoom
 * mínimo está puesto para que el campus siempre llene la pantalla.
 */

const URL_TESELAS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const ATRIBUCION =
  'Imagen: Esri, Maxar, Earthstar Geographics · Perímetro: Instituto Salesiano Pedro Justo Berrío'

/** Grados de holgura alrededor del campus: unos 50 metros por cada lado. */
const HOLGURA = 0.0005

export interface MapaSatelitalProps {
  onMapaListo?: (mapa: MapaLeaflet) => void
  /** Marcar posiciones tocando el mapa (US5). Apagado en el mapa público. */
  onClicEnMapa?: (punto: Coordenada) => void
  className?: string
  children?: React.ReactNode
}

export function MapaSatelital({
  onMapaListo,
  onClicEnMapa,
  className = '',
  children,
}: MapaSatelitalProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaLeaflet | null>(null)
  const observadorRef = useRef<ResizeObserver | null>(null)

  /*
   * El manejador del clic vive en una referencia, no en las dependencias
   * del efecto que monta el mapa.
   *
   * Quien usa este componente suele pasar una función anónima, que es
   * distinta en cada renderizado. Si el efecto dependiera de ella, Leaflet
   * se destruiría y se volvería a montar constantemente, perdiendo cada vez
   * la posición y el zoom que el visitante acaba de ajustar.
   *
   * La escritura va dentro de un efecto y no en el cuerpo del componente:
   * tocar `.current` durante el renderizado es impuro y `react-hooks/refs`
   * lo prohíbe.
   */
  const alClicRef = useRef(onClicEnMapa)

  useEffect(() => {
    alClicRef.current = onClicEnMapa
  }, [onClicEnMapa])

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contenedor.current || mapaRef.current) return

    let cancelado = false

    async function iniciar() {
      // Leaflet toca `window` al cargarse, así que se importa de forma
      // diferida: en el servidor rompería el renderizado.
      const L = await import('leaflet')
      if (cancelado || !contenedor.current) return

      const [[sur, oeste], [norte, este]] = LIMITES_CAMPUS

      // El campus exacto: es a esto a lo que se encuadra el mapa al abrirlo.
      const campus = L.latLngBounds([sur, oeste], [norte, este])

      // Y esto es hasta dónde se puede arrastrar: un poco más, para poder
      // ver qué hay justo al otro lado de la reja sin perderse.
      const limites = L.latLngBounds(
        [sur - HOLGURA, oeste - HOLGURA],
        [norte + HOLGURA, este + HOLGURA]
      )

      const mapa = L.map(contenedor.current, {
        maxBounds: limites,
        maxBoundsViscosity: 1,
        zoomControl: true,
        attributionControl: true,
        touchZoom: true,
        dragging: true,
        minZoom: 16,
        maxZoom: 21,
      })

      mapa.attributionControl.setPrefix(false)
      mapa.fitBounds(campus, { padding: [12, 12] })

      /*
        `invalidateSize` tras el primer cambio de tamaño real.

        Leaflet mide el contenedor en el momento de crearse. Si en ese
        instante mide cero —porque el navegador aún no terminó de componer
        la página— calcula un encuadre absurdo y se queda con él. Observar
        el tamaño y recalcular cuando llega el definitivo es lo único que
        funciona siempre, con o sin fuentes cargadas, en móvil y al girar
        el teléfono.
      */
      const observador = new ResizeObserver(() => {
        mapa.invalidateSize({ animate: false })
        mapa.fitBounds(campus, { padding: [12, 12], animate: false })
      })
      if (contenedor.current) observador.observe(contenedor.current)
      observadorRef.current = observador

      L.tileLayer(URL_TESELAS, {
        attribution: ATRIBUCION,
        // El satélite no tiene teselas más allá del 19; de ahí en adelante
        // Leaflet amplía la última. Se ve más borroso pero deja acercarse a
        // marcar un árbol concreto, que es lo que hace falta.
        maxNativeZoom: 19,
        maxZoom: 21,
        keepBuffer: 2,
      })
        .on('loading', () => setCargando(true))
        .on('load', () => setCargando(false))
        .on('tileerror', () =>
          setError('No se pudieron cargar las imágenes del mapa. Compruebe la conexión.')
        )
        .addTo(mapa)

      // El contorno del colegio, del KML que entregó la institución. Sin él
      // no se distingue dónde acaba el campus y empieza el barrio.
      L.polygon(PERIMETRO_CAMPUS as unknown as [number, number][], {
        color: '#1c3b31',
        weight: 3,
        opacity: 0.9,
        fillColor: '#7fb69a',
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(mapa)

      mapa.on('click', (evento) => {
        alClicRef.current?.([evento.latlng.lat, evento.latlng.lng])
      })

      mapaRef.current = mapa
      setCargando(false)
      onMapaListo?.(mapa)
    }

    void iniciar()

    return () => {
      cancelado = true
      observadorRef.current?.disconnect()
      observadorRef.current = null
      mapaRef.current?.remove()
      mapaRef.current = null
    }
    // Se monta una sola vez: recrear el mapa perdería la posición del visitante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    /*
      ── `absolute inset-0` y no `h-full` ────────────────────────────────

      `h-full` es `height: 100%`, y un porcentaje solo resuelve contra un
      padre con altura DECLARADA. El contenedor del mapa la obtiene de
      `flex-1`, que le da altura usada pero deja `height` en `auto`: el
      porcentaje no resuelve, cae a `auto`, y como dentro solo hay un div
      vacío el resultado es cero píxeles de alto.

      El mapa se montaba, pedía una tesela, dibujaba el polígono y no se
      veía absolutamente nada. Sin error en consola.

      Llenando el padre posicionado con `inset-0` la altura deja de
      depender de cómo esté declarada: quien use este componente solo tiene
      que darle un contenedor `relative` con altura.
    */
    <section
      aria-label="Mapa de biodiversidad del colegio"
      className={`absolute inset-0 ${className}`}
    >
      <div ref={contenedor} className="h-full w-full" style={{ background: 'var(--color-fondo)' }} />

      {cargando && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm shadow"
        >
          Cargando el mapa…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="absolute inset-x-4 top-4 z-[500] rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-4 py-3 text-sm text-orange-950"
        >
          {error}
        </div>
      )}

      {children}
    </section>
  )
}
