'use client'

import { useEffect, useRef } from 'react'
import type { Map as MapaLeaflet, LayerGroup } from 'leaflet'
import type { FichaPublica, PuntoDestacadoPublico } from '@/lib/supabase/tipos'
import { reinoDeCategoria } from '@/lib/biodiversidad/reinos'

/**
 * Capa de marcadores del mapa (T029, T115).
 *
 * Lee de la vista `ficha_publica`, que por construcción no puede exponer
 * correos (FR-051): la protección está en la base de datos, no en la
 * confianza de que este componente se acuerde de omitir un campo.
 *
 * ── Coordenadas reales, no fracciones ────────────────────────────────────
 *
 * Antes cada punto era una fracción de la ortofoto y este componente
 * necesitaba las dimensiones de la imagen para traducirla. Ahora son latitud
 * y longitud (migración 0018), que Leaflet entiende directamente.
 *
 * ── El color sale del reino, no de una tabla de categorías ───────────────
 *
 * Había un diccionario con «Árbol», «Ave», «Insecto»… y esas categorías
 * dejaron de existir en la migración 0010, que las redujo a Fauna y Flora.
 * El diccionario seguía ahí, sin coincidir con nada, así que TODOS los
 * puntos caían en el color de respaldo y el mapa salía monocromo.
 *
 * Derivarlo de `reinoDeCategoria` —lo mismo que usan los filtros— hace
 * imposible que vuelvan a desincronizarse.
 */

export interface CapaPuntosProps {
  mapa: MapaLeaflet | null
  fichas: FichaPublica[]
  destacados?: PuntoDestacadoPublico[]
  /** Identificadores de punto con material inmersivo disponible (FR-010e). */
  puntosConVistaInmersiva?: Set<string>
  onSeleccionarFicha?: (ficha: FichaPublica) => void
}

const COLOR_POR_REINO: Record<string, string> = {
  fauna: '#f2a024',
  flora: '#2f7a45',
  otros: '#8b5cf6',
}

function colorDe(categoria: string): string {
  return COLOR_POR_REINO[reinoDeCategoria(categoria)] ?? 'var(--color-marca)'
}

export function CapaPuntos({
  mapa,
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
        /*
         * Una ficha publicada puede no tener punto marcado: las dieciséis
         * fichas de taxonomía se cargaron antes de que existiera el mapa.
         * Se omite —no hay dónde ponerla— pero sigue en el catálogo, que es
         * donde se la encuentra por nombre.
         */
        // `typeof` y no `=== null`: mientras la migración 0018 no esté
        // aplicada, la vista no devuelve estas columnas y llegan como
        // `undefined`, que `=== null` deja pasar. Leaflet reventaría con un
        // marcador en [undefined, undefined].
        if (typeof ficha.latitud !== 'number' || typeof ficha.longitud !== 'number') continue

        const tieneInmersiva = puntosConVistaInmersiva?.has(ficha.id) ?? false

        const marcador = L.circleMarker([ficha.latitud, ficha.longitud], {
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
        if (typeof destacado.latitud !== 'number' || typeof destacado.longitud !== 'number')
          continue

        L.circleMarker([destacado.latitud, destacado.longitud], {
          radius: 12,
          color: 'var(--color-ica-sensibles)',
          weight: 3,
          fillColor: 'var(--color-ica-daniña)',
          fillOpacity: 0.65,
        })
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
  }, [mapa, fichas, destacados, puntosConVistaInmersiva, onSeleccionarFicha])

  return null
}
