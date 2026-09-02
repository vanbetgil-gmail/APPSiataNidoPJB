'use client'

import { useEffect, useRef } from 'react'
import type { Map as MapaLeaflet, LayerGroup } from 'leaflet'
import type { FichaPublica, ImagenBaseMapa, PuntoDestacadoPublico } from '@/lib/supabase/tipos'
import { relativaALeaflet } from '@/lib/mapa/coordenadas'

/**
 * Capa de marcadores del mapa (T029, T115).
 *
 * Lee de la vista `ficha_publica`, que por construcción no puede exponer
 * correos (FR-051): la protección está en la base de datos, no en la
 * confianza de que este componente se acuerde de omitir un campo.
 *
 * Señala también qué puntos tienen vista inmersiva antes de abrirlos
 * (FR-010e), aunque el visor llegue en una fase posterior: la señal cuesta
 * poco y evita rehacer la capa después.
 */

export interface CapaPuntosProps {
  mapa: MapaLeaflet | null
  /** Necesaria para convertir coordenadas: el lienzo teselado es cuadrado
      y la foto no, así que hay que descontar el relleno. */
  imagen: Pick<ImagenBaseMapa, 'ancho_px' | 'alto_px'>
  fichas: FichaPublica[]
  destacados?: PuntoDestacadoPublico[]
  /** Identificadores de punto con material inmersivo disponible (FR-010e). */
  puntosConVistaInmersiva?: Set<string>
  onSeleccionarFicha?: (ficha: FichaPublica) => void
}

const COLOR_POR_CATEGORIA: Record<string, string> = {
  Árbol: '#2f7a45',
  Arbusto: '#4f9d5f',
  Ave: '#f2a024',
  Insecto: '#8b5cf6',
  'Planta ornamental': '#e05297',
}

function colorDe(categoria: string): string {
  return COLOR_POR_CATEGORIA[categoria] ?? 'var(--color-marca)'
}

export function CapaPuntos({
  mapa,
  imagen,
  fichas,
  destacados = [],
  puntosConVistaInmersiva,
  onSeleccionarFicha,
}: CapaPuntosProps) {
  const grupoRef = useRef<LayerGroup | null>(null)

  useEffect(() => {
    if (!mapa) return

    let cancelado = false

    async function pintar() {
      const L = await import('leaflet')
      if (cancelado || !mapa) return

      grupoRef.current?.remove()
      const grupo = L.layerGroup().addTo(mapa)
      grupoRef.current = grupo

      for (const ficha of fichas) {
        const tieneInmersiva = puntosConVistaInmersiva?.has(ficha.id) ?? false

        const marcador = L.circleMarker(relativaALeaflet({ x: ficha.x_relativa, y: ficha.y_relativa }, imagen), {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: colorDe(ficha.categoria),
          fillOpacity: 1,
          // El anillo extra señala que hay vista inmersiva (FR-010e)
          className: tieneInmersiva ? 'punto-con-inmersiva' : undefined,
        })

        marcador.bindTooltip(ficha.nombre_comun, { direction: 'top' })

        // El popup se construye con nodos del DOM, no con HTML en cadena:
        // los textos los escriben estudiantes y no deben poder inyectar marcado.
        const contenido = document.createElement('div')
        const titulo = document.createElement('strong')
        titulo.textContent = ficha.nombre_comun
        const cientifico = document.createElement('em')
        cientifico.textContent = ficha.nombre_cientifico
        cientifico.className = 'block text-xs'
        const boton = document.createElement('button')
        boton.type = 'button'
        boton.textContent = 'Ver ficha'
        boton.setAttribute('aria-label', `Ver ficha de ${ficha.nombre_comun}`)
        boton.className = 'mt-2 underline'
        boton.onclick = () => onSeleccionarFicha?.(ficha)

        contenido.append(titulo, cientifico, boton)
        marcador.bindPopup(contenido)
        marcador.addTo(grupo)
      }

      // Lugares marcados manualmente como de alta contaminación (FR-010j).
      // El público ve QUÉ lugares están marcados, nunca los valores (A-010d).
      for (const destacado of destacados) {
        L.circleMarker(
          relativaALeaflet({ x: destacado.x_relativa, y: destacado.y_relativa }, imagen),
          {
            radius: 12,
            color: 'var(--color-ica-sensibles)',
            weight: 3,
            fillColor: 'var(--color-ica-daniña)',
            fillOpacity: 0.65,
          }
        )
          .bindTooltip(`${destacado.nombre} · punto de seguimiento de calidad del aire`, {
            direction: 'top',
          })
          .addTo(grupo)
      }
    }

    void pintar()

    return () => {
      cancelado = true
      grupoRef.current?.remove()
      grupoRef.current = null
    }
  }, [mapa, imagen, fichas, destacados, puntosConVistaInmersiva, onSeleccionarFicha])

  return null
}
