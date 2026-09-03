'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { TarjetaEspecie, type EspecieConFoto } from './TarjetaEspecie'
import { REINOS, reinoDeCategoria, type Reino } from '@/lib/biodiversidad/reinos'

/**
 * Catálogo público de biodiversidad — la subpestaña «Biodiversidad PJB».
 *
 * Complementa al mapa: el mapa responde «¿qué hay aquí?», el catálogo
 * responde «¿qué especies hemos registrado?». Son dos preguntas distintas y
 * quien llega buscando la segunda no debería tener que rastrear el mapa
 * punto por punto.
 *
 * Filtro y búsqueda se resuelven en el cliente sin volver al servidor: a la
 * escala del proyecto —decenas de fichas— traerlas todas de una vez es más
 * rápido y más simple que paginar.
 */

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function CatalogoEspecies({ especies }: { especies: EspecieConFoto[] }) {
  const [reino, setReino] = useState<Reino | null>(null)
  const [consulta, setConsulta] = useState('')

  /*
   * Se filtra por fauna y flora, no por las cinco categorías.
   *
   * «Árbol, Arbusto, Ave, Insecto, Planta ornamental» son cinco botones para
   * dos preguntas: quien llega al catálogo quiere ver plantas o quiere ver
   * animales. Las categorías siguen viviendo en cada ficha, que es donde
   * aportan precisión; como filtro solo añadían ruido.
   *
   * «Otros» aparece únicamente si hay fichas que no son ninguna de las dos.
   */
  const grupos = useMemo(() => {
    const cuenta = new Map<Reino, number>()
    for (const e of especies) {
      const r = reinoDeCategoria(e.categoria)
      cuenta.set(r, (cuenta.get(r) ?? 0) + 1)
    }
    // Fauna y Flora siempre visibles; «Otros» solo si existe (ver
    // FiltrosFichas.tsx para el razonamiento completo).
    return REINOS.filter((r) => r.reino !== 'otros' || (cuenta.get(r.reino) ?? 0) > 0).map((r) => ({
      ...r,
      n: cuenta.get(r.reino) ?? 0,
    }))
  }, [especies])

  const visibles = useMemo(() => {
    const termino = normalizar(consulta)
    return especies.filter((e) => {
      if (reino && reinoDeCategoria(e.categoria) !== reino) return false
      if (termino.length < 2) return true
      return (
        normalizar(e.nombre_comun).includes(termino) ||
        normalizar(e.nombre_cientifico).includes(termino) ||
        normalizar(e.descripcion).includes(termino)
      )
    })
  }, [especies, reino, consulta])

  if (especies.length === 0) {
    return (
      <div className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] p-8 text-center">
        <h2 className="text-lg font-semibold">Aún no hay especies registradas</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
          El equipo de NIDO PJB está documentando la biodiversidad del colegio. Cada árbol, ave o
          insecto que encuentran se registra aquí con su fotografía y su descripción.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label htmlFor="buscar-catalogo" className="sr-only">
          Buscar una especie
        </label>
        <input
          id="buscar-catalogo"
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar por nombre o por lo que describe…"
          className="w-full rounded-full border border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] px-4 py-2.5 text-base"
        />

        <div className="desplazable-x flex gap-2 pb-1" role="group" aria-label="Filtrar">
          <button
            type="button"
            aria-pressed={reino === null}
            onClick={() => setReino(null)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
              reino === null
                ? 'border-[color:var(--color-marca)] bg-[color:var(--color-marca)] text-white'
                : 'border-[color:var(--color-borde)] bg-[color:var(--color-superficie)]'
            }`}
          >
            Todas ({especies.length})
          </button>
          {grupos.map((g) => (
            <button
              key={g.reino}
              type="button"
              aria-pressed={reino === g.reino}
              onClick={() => setReino(reino === g.reino ? null : g.reino)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
                reino === g.reino
                  ? 'border-[color:var(--color-marca)] bg-[color:var(--color-marca)] text-white'
                  : 'border-[color:var(--color-borde)] bg-[color:var(--color-superficie)]'
              }`}
            >
              {/* El emoji es decorativo: la etiqueta ya dice «Fauna». Sin
                  aria-hidden, un lector de pantalla anunciaría «pájaro
                  Fauna», que no aclara nada. */}
              <span aria-hidden>{g.emoji}</span> {g.etiqueta} ({g.n})
            </button>
          ))}
        </div>

        <p aria-live="polite" className="text-sm text-[color:var(--color-texto-suave)]">
          {visibles.length === especies.length
            ? `${especies.length} especie${especies.length === 1 ? '' : 's'} registrada${especies.length === 1 ? '' : 's'}`
            : `Mostrando ${visibles.length} de ${especies.length}`}
        </p>
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] p-8 text-center">
          <p className="text-sm text-[color:var(--color-texto-suave)]">
            Ninguna especie coincide con la búsqueda.{' '}
            <button
              type="button"
              onClick={() => {
                setConsulta('')
                setReino(null)
              }}
              className="text-[color:var(--color-marca)] underline"
            >
              Ver todas
            </button>
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((especie) => (
            <li key={especie.id} className="contents">
              <TarjetaEspecie especie={especie} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-sm text-[color:var(--color-texto-suave)]">
        ¿Quiere ver dónde está cada una?{' '}
        <Link href="/" className="text-[color:var(--color-marca)]">
          Ábralas en el mapa del colegio
        </Link>
      </p>
    </div>
  )
}
