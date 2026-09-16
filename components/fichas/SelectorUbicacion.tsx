'use client'

import { useCallback, useState } from 'react'
import type { Map as MapaLeaflet, CircleMarker } from 'leaflet'
import { MapaSatelital } from '@/components/mapa/MapaSatelital'
import { comoTexto, dentroDelCampus, type Coordenada } from '@/lib/mapa/campus'

/**
 * Selector de ubicación sobre el mapa (T094) — FR-006a, FR-042, FR-042a.
 *
 * Reutiliza el mismo `MapaSatelital` del mapa público, así que la posición
 * que se marca aquí y la que se ve allí son la misma por construcción: no hay
 * dos implementaciones que puedan desincronizarse.
 *
 * ── Sin GPS, a propósito ─────────────────────────────────────────────────
 *
 * FR-042a prohíbe depender del GPS, y no es una limitación técnica. En el
 * patio de un colegio el GPS tiene un error de cinco a diez metros:
 * suficiente para confundir dos árboles vecinos. Tocar la imagen con el dedo,
 * viendo el árbol, es más preciso que el satélite a esta escala.
 *
 * ── Fuera del campus no se marca ─────────────────────────────────────────
 *
 * FR-042 pedía que fuera imposible marcar fuera de la imagen. Aquí el límite
 * es el polígono del colegio, con unos metros de tolerancia para los árboles
 * pegados a la reja. Un toque fuera no se ignora en silencio: se dice por
 * qué, porque el silencio se interpreta como que la aplicación no responde.
 */

export function SelectorUbicacion({
  punto,
  onCambio,
}: {
  punto: Coordenada | null
  onCambio: (punto: Coordenada) => void
}) {
  const [mapa, setMapa] = useState<MapaLeaflet | null>(null)
  const [marcador, setMarcador] = useState<CircleMarker | null>(null)
  const [fuera, setFuera] = useState(false)

  const marcar = useCallback(
    async (coordenada: Coordenada) => {
      if (!dentroDelCampus(coordenada)) {
        setFuera(true)
        return
      }

      setFuera(false)
      onCambio(coordenada)
      if (!mapa) return

      const L = await import('leaflet')

      if (marcador) {
        marcador.setLatLng(coordenada)
      } else {
        const nuevo = L.circleMarker(coordenada, {
          radius: 10,
          color: '#ffffff',
          weight: 3,
          fillColor: 'var(--color-marca)',
          fillOpacity: 1,
        }).addTo(mapa)
        setMarcador(nuevo)
      }
    },
    [mapa, marcador, onCambio]
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-[380px] overflow-hidden rounded-[--radius-tarjeta] border border-[color:var(--color-borde)]">
        <MapaSatelital onMapaListo={setMapa} onClicEnMapa={marcar} />
      </div>

      <p aria-live="polite" className="text-sm text-[color:var(--color-texto-suave)]">
        {fuera ? (
          <span className="text-[color:var(--color-ica-daniña)]">
            Ese punto queda fuera del colegio. Marque dentro del contorno verde.
          </span>
        ) : punto ? (
          <>
            Ubicación marcada. Toque otra vez si quiere corregirla.{' '}
            <span className="text-xs">({comoTexto(punto)})</span>
          </>
        ) : (
          'Toque sobre el mapa el lugar exacto donde encontró la especie. Acerque con dos dedos para afinar.'
        )}
      </p>
    </div>
  )
}
