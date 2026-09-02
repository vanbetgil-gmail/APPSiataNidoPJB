'use client'

import { useMemo, useState } from 'react'
import type { FichaPublica } from '@/lib/supabase/tipos'

/**
 * Búsqueda por nombre común o científico (T031) — FR-008.
 *
 * Escenario 4 de la Historia 1: los resultados coincidentes se resaltan y el
 * mapa se centra en el primero.
 *
 * La comparación ignora acentos deliberadamente: quien busca «arbol» o
 * «Guayacan» debe encontrar «Árbol» y «Guayacán». En un colegio nadie escribe
 * con tildes en un buscador, y exigirlas convertiría la búsqueda en un
 * obstáculo en lugar de una ayuda.
 */

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export interface BuscadorEspeciesProps {
  fichas: FichaPublica[]
  onResultados: (coincidencias: FichaPublica[]) => void
  onCentrarEn: (ficha: FichaPublica) => void
}

export function BuscadorEspecies({ fichas, onResultados, onCentrarEn }: BuscadorEspeciesProps) {
  const [consulta, setConsulta] = useState('')

  const coincidencias = useMemo(() => {
    const termino = normalizar(consulta)
    if (termino.length < 2) return []
    return fichas.filter(
      (f) =>
        normalizar(f.nombre_comun).includes(termino) ||
        normalizar(f.nombre_cientifico).includes(termino)
    )
  }, [consulta, fichas])

  function alEscribir(valor: string) {
    setConsulta(valor)
    const termino = normalizar(valor)
    if (termino.length < 2) {
      onResultados([])
      return
    }
    const encontradas = fichas.filter(
      (f) =>
        normalizar(f.nombre_comun).includes(termino) ||
        normalizar(f.nombre_cientifico).includes(termino)
    )
    onResultados(encontradas)
    if (encontradas.length > 0) onCentrarEn(encontradas[0])
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="buscador-especies" className="sr-only">
        Buscar una especie por su nombre
      </label>
      <input
        id="buscador-especies"
        type="search"
        value={consulta}
        onChange={(e) => alEscribir(e.target.value)}
        placeholder="Buscar por nombre común o científico…"
        autoComplete="off"
        className="w-full rounded-full border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-2.5 text-base"
      />

      <p aria-live="polite" className="text-sm text-[color:var(--color-texto-suave)]">
        {consulta.length >= 2 &&
          (coincidencias.length === 0
            ? `No se encontró ninguna especie con «${consulta}».`
            : `${coincidencias.length} coincidencia${coincidencias.length === 1 ? '' : 's'}.`)}
      </p>

      {coincidencias.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)]">
          {coincidencias.slice(0, 8).map((ficha) => (
            <li key={ficha.id} className="border-b border-[color:var(--color-borde)] last:border-0">
              <button
                type="button"
                onClick={() => onCentrarEn(ficha)}
                className="w-full px-4 py-2 text-left text-sm"
              >
                <span className="font-medium">{ficha.nombre_comun}</span>{' '}
                <em className="text-[color:var(--color-texto-suave)]">{ficha.nombre_cientifico}</em>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
