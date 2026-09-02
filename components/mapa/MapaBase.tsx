'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapaLeaflet } from 'leaflet'
import type { ImagenBaseMapa } from '@/lib/supabase/tipos'
import { leafletARelativa, limitesDeLaImagen } from '@/lib/mapa/coordenadas'

/**
 * Mapa base de NIDO PJB (T027, T036, T037).
 *
 * Leaflet con CRS.Simple sobre la pirámide de teselas de la ortofoto de dron.
 * No es un mapa geográfico: no hay proveedor de mapas, ni clave de API, ni
 * cuota, ni costo (research.md R-001, R-002).
 *
 * La carga es progresiva por construcción: Leaflet solo pide las teselas del
 * área y el nivel que se está mirando. Una vista inicial son unas pocas
 * teselas de ~20 KB, muy por debajo del presupuesto de SC-002.
 *
 * Leaflet se importa de forma diferida porque toca `window` al cargarse y
 * rompería el renderizado en servidor.
 */

export interface MapaBaseProps {
  imagen: Pick<ImagenBaseMapa, 'ruta_teselas' | 'zoom_maximo' | 'ancho_px' | 'alto_px'>
  /** Se invoca cuando el mapa está listo, para que las capas se enganchen. */
  onMapaListo?: (mapa: MapaLeaflet) => void
  /** Marcar posiciones tocando la imagen (US5). Desactivado en el mapa público. */
  onClicEnMapa?: (relativa: { x: number; y: number }) => void
  className?: string
  children?: React.ReactNode
}

export function MapaBase({
  imagen,
  onMapaListo,
  onClicEnMapa,
  className = '',
  children,
}: MapaBaseProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaLeaflet | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contenedor.current || mapaRef.current) return

    let cancelado = false

    async function iniciar() {
      // La hoja de estilos de Leaflet se importa desde app/globals.css:
      // TypeScript no admite importar CSS de forma dinámica.
      const L = await import('leaflet')
      if (cancelado || !contenedor.current) return

      const mapa = L.map(contenedor.current, {
        // El plano cartesiano que sustituye a las coordenadas geográficas.
        crs: L.CRS.Simple,
        minZoom: 0,
        maxZoom: imagen.zoom_maximo,
        zoomControl: true,
        attributionControl: false,
        // Gestos táctiles para el uso en celular (FR-006, escenario 5 de US1)
        touchZoom: true,
        dragging: true,
        // Evita que el visitante se pierda fuera de la ortofoto
        maxBoundsViscosity: 1.0,
      })

      const limites = limitesDeLaImagen(imagen)
      mapa.setMaxBounds(limites)
      mapa.fitBounds(limites)

      L.tileLayer(`${imagen.ruta_teselas}/{z}/{x}/{y}.png`, {
        tileSize: 256,
        minZoom: 0,
        maxZoom: imagen.zoom_maximo,
        noWrap: true,
        bounds: limites,
        // Mantiene visible el nivel anterior mientras llega el nuevo:
        // el mapa nunca parpadea en blanco en una conexión lenta.
        keepBuffer: 2,
      })
        .on('loading', () => setCargando(true))
        .on('load', () => setCargando(false))
        .on('tileerror', () =>
          setError(
            'No se pudieron cargar las imágenes del mapa. Puede que aún no se hayan generado las teselas.'
          )
        )
        .addTo(mapa)

      if (onClicEnMapa) {
        mapa.on('click', (evento) => {
          const { lat, lng } = evento.latlng
          onClicEnMapa(leafletARelativa([lat, lng], imagen))
        })
      }

      mapaRef.current = mapa
      setCargando(false)
      onMapaListo?.(mapa)
    }

    void iniciar()

    return () => {
      cancelado = true
      mapaRef.current?.remove()
      mapaRef.current = null
    }
    // Se monta una sola vez: recrear el mapa perdería la posición del visitante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section
      aria-label="Mapa de biodiversidad del colegio"
      className={`relative h-full w-full ${className}`}
    >
      <div ref={contenedor} className="h-full w-full" style={{ background: 'var(--color-fondo)' }} />

      {cargando && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm shadow"
        >
          Cargando el mapa…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="absolute inset-x-4 top-4 rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-4 py-3 text-sm text-orange-950"
        >
          {error}
        </div>
      )}

      {children}
    </section>
  )
}
