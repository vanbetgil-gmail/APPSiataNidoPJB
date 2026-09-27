'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Map as MapaLeaflet } from 'leaflet'
import type { FichaPublica, PuntoDestacadoPublico } from '@/lib/supabase/tipos'
import { MapaSatelital } from './MapaSatelital'
import { CapaPuntos } from './CapaPuntos'
import { FiltroCategorias } from './FiltroCategorias'
import { BuscadorEspecies } from './BuscadorEspecies'
import { EstadoVacio } from './EstadoVacio'

/**
 * Orquestador del mapa público (parte de T033).
 *
 * Junta mapa, filtro y buscador. Es el único componente con estado de esta
 * pantalla; el resto son piezas sin memoria, más fáciles de probar y de
 * reutilizar en la ubicación de fichas (US5).
 */
export function MapaExplorador({
  fichas,
  destacados,
}: {
  fichas: FichaPublica[]
  destacados: PuntoDestacadoPublico[]
}) {
  const router = useRouter()
  const [mapa, setMapa] = useState<MapaLeaflet | null>(null)
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())

  const categorias = useMemo(
    () => [...new Set(fichas.map((f) => f.categoria))].sort((a, b) => a.localeCompare(b, 'es')),
    [fichas]
  )

  const visibles = useMemo(
    () => (seleccionadas.size === 0 ? fichas : fichas.filter((f) => seleccionadas.has(f.categoria))),
    [fichas, seleccionadas]
  )

  /*
   * ── Cuántas fichas NO se pueden dibujar ──────────────────────────────
   *
   * Una ficha sin punto marcado desaparece del mapa sin decir nada. Con
   * veintiuna publicadas y nueve ubicadas, quien abre el mapa cuenta los
   * puntos, los compara con lo que el equipo ha documentado y concluye que
   * la aplicación perdió registros.
   *
   * No los perdió: están en el catálogo, completos. Lo que les falta es que
   * alguien toque el mapa para decir dónde estaban. Decirlo en voz alta
   * convierte un fallo aparente en una tarea concreta.
   */
  const ubicadas = useMemo(
    () => visibles.filter((f) => typeof f.latitud === 'number' && typeof f.longitud === 'number'),
    [visibles]
  )
  const sinUbicar = visibles.length - ubicadas.length

  const alternar = useCallback((categoria: string) => {
    setSeleccionadas((previas) => {
      const siguiente = new Set(previas)
      if (siguiente.has(categoria)) siguiente.delete(categoria)
      else siguiente.add(categoria)
      return siguiente
    })
  }, [])

  const centrarEn = useCallback(
    (ficha: FichaPublica) => {
      if (!mapa) return
      // Sin punto marcado no hay a dónde centrar. No es un error: la ficha
      // existe y se ve en el catálogo, solo que todavía no en el mapa.
      if (typeof ficha.latitud !== 'number' || typeof ficha.longitud !== 'number') return
      // Zoom 20: lo bastante cerca para distinguir un árbol de su vecino.
      mapa.setView([ficha.latitud, ficha.longitud], 20)
    },
    [mapa]
  )

  const abrirFicha = useCallback((ficha: FichaPublica) => router.push(`/especie/${ficha.id}`), [router])

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4">
        <BuscadorEspecies fichas={fichas} onResultados={() => {}} onCentrarEn={centrarEn} />
        <FiltroCategorias
          categorias={categorias}
          seleccionadas={seleccionadas}
          onAlternar={alternar}
          onLimpiar={() => setSeleccionadas(new Set())}
          totalVisible={visibles.length}
          totalGeneral={fichas.length}
        />

        {sinUbicar > 0 && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
            <strong style={{ color: 'var(--color-texto)' }}>
              {ubicadas.length} de {visibles.length}
            </strong>{' '}
            {visibles.length === 1 ? 'ficha está ubicada' : 'fichas están ubicadas'} en el mapa. Las{' '}
            {sinUbicar} restantes están documentadas pero todavía sin punto marcado:{' '}
            <Link href="/biodiversidad" className="text-[color:var(--color-marca)]">
              se pueden ver en Biodiversidad
            </Link>
            .
          </p>
        )}
      </div>

      <div className="relative min-h-[60vh] flex-1">
        <MapaSatelital onMapaListo={setMapa}>
          {fichas.length === 0 && <EstadoVacio />}
        </MapaSatelital>
        <CapaPuntos
          mapa={mapa}
          fichas={visibles}
          destacados={destacados}
          onSeleccionarFicha={abrirFicha}
        />
      </div>
    </div>
  )
}
