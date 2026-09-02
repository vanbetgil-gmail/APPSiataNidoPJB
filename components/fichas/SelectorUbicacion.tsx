'use client'

import { useCallback, useState } from 'react'
import type { Map as MapaLeaflet, CircleMarker } from 'leaflet'
import { MapaBase } from '@/components/mapa/MapaBase'
import { relativaALeaflet } from '@/lib/mapa/coordenadas'
import type { ImagenBaseMapa } from '@/lib/supabase/tipos'

/**
 * Selector de ubicación sobre la imagen aérea (T094) — FR-006a, FR-042, FR-042a.
 *
 * Reutiliza el mismo `MapaBase` del mapa público, así que la posición que se
 * marca aquí y la que se ve allí son la misma por construcción: no hay dos
 * implementaciones que puedan desincronizarse.
 *
 * ── Sin GPS, a propósito ─────────────────────────────────────────────────
 *
 * FR-042a prohíbe depender del GPS. No es una limitación técnica: en el patio
 * de un colegio el GPS tiene un error de 5 a 10 metros, suficiente para
 * confundir dos árboles vecinos. Tocar la imagen es más preciso que el
 * satélite a esta escala.
 */

export interface PuntoRelativo {
  x: number
  y: number
}

export function SelectorUbicacion({
  imagen,
  punto,
  onCambio,
}: {
  imagen: Pick<ImagenBaseMapa, 'ruta_teselas' | 'zoom_maximo' | 'ancho_px' | 'alto_px'>
  punto: PuntoRelativo | null
  onCambio: (punto: PuntoRelativo) => void
}) {
  const [mapa, setMapa] = useState<MapaLeaflet | null>(null)
  const [marcador, setMarcador] = useState<CircleMarker | null>(null)

  const marcar = useCallback(
    async (relativa: PuntoRelativo) => {
      onCambio(relativa)
      if (!mapa) return

      const L = await import('leaflet')
      const posicion = relativaALeaflet(relativa, imagen)

      if (marcador) {
        marcador.setLatLng(posicion)
      } else {
        const nuevo = L.circleMarker(posicion, {
          radius: 10,
          color: '#ffffff',
          weight: 3,
          fillColor: 'var(--color-marca)',
          fillOpacity: 1,
        }).addTo(mapa)
        setMarcador(nuevo)
      }
    },
    [mapa, marcador, imagen, onCambio]
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="h-[380px] overflow-hidden rounded-[--radius-tarjeta] border border-[color:var(--color-borde)]">
        <MapaBase imagen={imagen} onMapaListo={setMapa} onClicEnMapa={marcar} />
      </div>

      <p aria-live="polite" className="text-sm text-[color:var(--color-texto-suave)]">
        {punto ? (
          <>
            Ubicación marcada. Toque otra vez si quiere corregirla.{' '}
            <span className="text-xs">
              ({(punto.x * 100).toFixed(1)} %, {(punto.y * 100).toFixed(1)} % de la imagen)
            </span>
          </>
        ) : (
          'Toque sobre la imagen el lugar exacto donde encontró la especie. Acerque el mapa para afinar.'
        )}
      </p>
    </div>
  )
}
