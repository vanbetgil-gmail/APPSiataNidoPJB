'use client'

import { useMemo, useState } from 'react'
import { REINOS, reinoDeCategoria, type Reino } from '@/lib/biodiversidad/reinos'
import type { EstadoFicha } from '@/lib/supabase/tipos'

/**
 * Filtros de la clasificación taxonómica — FR-038e.
 *
 * ── Por qué dos filas de filtros y no una ────────────────────────────────
 *
 * Reino y estado responden preguntas distintas y se combinan: «las plantas
 * que aún están en borrador» es una pregunta legítima y frecuente. Meterlos
 * en una sola fila de botones excluyentes obligaría a elegir entre las dos.
 *
 * El público no ve la fila de estados: para un visitante solo existen las
 * fichas publicadas, así que un filtro de estados no tendría nada que
 * filtrar.
 */

export interface FichaFiltrable {
  id: string
  categoria: string | null
  estado: EstadoFicha
}

export type FiltroEstado = 'todas' | 'publicadas' | 'por_verificar' | 'borradores'

const ESTADOS: { clave: FiltroEstado; etiqueta: string; corresponde: (e: EstadoFicha) => boolean }[] =
  [
    { clave: 'todas', etiqueta: 'Todas', corresponde: () => true },
    { clave: 'publicadas', etiqueta: 'Publicadas', corresponde: (e) => e === 'publicado' },
    { clave: 'por_verificar', etiqueta: 'Por verificar', corresponde: (e) => e === 'en_revision' },
    { clave: 'borradores', etiqueta: 'Borradores', corresponde: (e) => e === 'borrador' },
  ]

export function coincideConFiltros(
  ficha: FichaFiltrable,
  reino: Reino | null,
  estado: FiltroEstado
): boolean {
  if (reino && reinoDeCategoria(ficha.categoria) !== reino) return false
  const def = ESTADOS.find((e) => e.clave === estado)
  return def ? def.corresponde(ficha.estado) : true
}

export function FiltrosFichas({
  fichas,
  reino,
  estado,
  onReino,
  onEstado,
}: {
  fichas: FichaFiltrable[]
  reino: Reino | null
  estado: FiltroEstado
  onReino: (r: Reino | null) => void
  onEstado: (e: FiltroEstado) => void
}) {
  const grupos = useMemo(() => {
    const cuenta = new Map<Reino, number>()
    for (const f of fichas) {
      const r = reinoDeCategoria(f.categoria)
      cuenta.set(r, (cuenta.get(r) ?? 0) + 1)
    }
    // «Otros» solo aparece si de verdad hay algo que no es fauna ni flora.
    return REINOS.filter((r) => (cuenta.get(r.reino) ?? 0) > 0).map((r) => ({
      ...r,
      n: cuenta.get(r.reino) ?? 0,
    }))
  }, [fichas])

  const conteoEstado = useMemo(() => {
    const m = new Map<FiltroEstado, number>()
    for (const e of ESTADOS) m.set(e.clave, fichas.filter((f) => e.corresponde(f.estado)).length)
    return m
  }, [fichas])

  return (
    <div className="flex flex-col gap-3">
      <div className="desplazable-x flex gap-2" role="group" aria-label="Filtrar por grupo">
        <Chip activo={reino === null} onClick={() => onReino(null)}>
          Todas ({fichas.length})
        </Chip>
        {grupos.map((g) => (
          <Chip
            key={g.reino}
            activo={reino === g.reino}
            onClick={() => onReino(reino === g.reino ? null : g.reino)}
          >
            {/* El emoji acompaña; la etiqueta es la que informa. */}
            <span aria-hidden>{g.emoji}</span> {g.etiqueta} ({g.n})
          </Chip>
        ))}
      </div>

      <div className="desplazable-x flex gap-2" role="group" aria-label="Filtrar por estado">
        {ESTADOS.map((e) => (
          <Chip key={e.clave} activo={estado === e.clave} onClick={() => onEstado(e.clave)} tenue>
            {e.etiqueta} ({conteoEstado.get(e.clave) ?? 0})
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Chip({
  activo,
  onClick,
  children,
  tenue = false,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
  tenue?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 ${tenue ? 'py-1.5 text-xs' : 'py-2 text-sm'}`}
      style={
        activo
          ? {
              backgroundColor: tenue ? 'var(--color-salvia-clara)' : 'var(--color-marca)',
              color: tenue ? 'var(--color-marca)' : '#ffffff',
              border: `1.5px solid var(--color-marca)`,
              fontWeight: 500,
            }
          : {
              backgroundColor: 'var(--color-superficie)',
              color: 'var(--color-texto)',
              border: '1px solid var(--color-borde)',
            }
      }
    >
      {children}
    </button>
  )
}
