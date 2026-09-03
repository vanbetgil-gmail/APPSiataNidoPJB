'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AccionesFicha } from '@/components/fichas/AccionesFicha'
import { EstadoFicha } from '@/components/fichas/EstadoFicha'
import { IlustracionCategoria } from '@/components/fichas/IlustracionCategoria'
import { VisibilidadAutor } from '@/components/fichas/VisibilidadAutor'
import {
  FiltrosFichas,
  coincideConFiltros,
  type FiltroEstado,
} from '@/components/fichas/FiltrosFichas'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { transicionesDisponibles } from '@/lib/fichas/transiciones'
import {
  estaCompleta,
  pendientesNoBloqueantes,
  type ExigenciasDePublicacion,
} from '@/lib/fichas/validarCompletitud'
import type { Reino } from '@/lib/biodiversidad/reinos'
import type { FichaBiodiversidad } from '@/lib/supabase/tipos'

const TOPE_EDICIONES = 2

export interface FichaConContexto {
  ficha: FichaBiodiversidad
  categoria: string | null
  autor: string | null
  numeroDeFotos: number
  esAutor: boolean
}

export function ListaFichas({
  entradas,
  esResponsable,
  exigencias,
}: {
  entradas: FichaConContexto[]
  esResponsable: boolean
  exigencias: ExigenciasDePublicacion
}) {
  const [reino, setReino] = useState<Reino | null>(null)
  const [estado, setEstado] = useState<FiltroEstado>('todas')

  const filtrables = useMemo(
    () =>
      entradas.map((e) => ({
        id: e.ficha.id,
        categoria: e.categoria,
        estado: e.ficha.estado,
      })),
    [entradas]
  )

  const visibles = useMemo(
    () =>
      entradas.filter((e) =>
        coincideConFiltros(
          { id: e.ficha.id, categoria: e.categoria, estado: e.ficha.estado },
          reino,
          estado
        )
      ),
    [entradas, reino, estado]
  )

  return (
    <div className="flex flex-col gap-6">
      <FiltrosFichas
        fichas={filtrables}
        reino={reino}
        estado={estado}
        onReino={setReino}
        onEstado={setEstado}
      />

      <p aria-live="polite" className="text-sm" style={{ color: 'var(--color-texto-suave)' }}>
        {visibles.length === entradas.length
          ? `${entradas.length} especie${entradas.length === 1 ? '' : 's'}`
          : `Mostrando ${visibles.length} de ${entradas.length}`}
      </p>

      {visibles.length === 0 ? (
        <Tarjeta className="text-center">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
            Ninguna ficha coincide con este filtro.{' '}
            <button
              type="button"
              onClick={() => {
                setReino(null)
                setEstado('todas')
              }}
              className="underline"
              style={{ color: 'var(--color-marca)' }}
            >
              Ver todas
            </button>
          </p>
        </Tarjeta>
      ) : (
        <ul className="flex flex-col gap-4">
          {visibles.map((e) => (
            <li key={e.ficha.id}>
              <FilaFicha entrada={e} esResponsable={esResponsable} exigencias={exigencias} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilaFicha({
  entrada,
  esResponsable,
  exigencias,
}: {
  entrada: FichaConContexto
  esResponsable: boolean
  exigencias: ExigenciasDePublicacion
}) {
  const { ficha, categoria, autor, numeroDeFotos, esAutor } = entrada

  const transiciones = transicionesDisponibles({
    estado: ficha.estado,
    aprobadaAlgunaVez: ficha.aprobada_alguna_vez,
    // Cualquier integrante puede mover la ficha por su ciclo de vida
    // (migración 0009): editar una ficha del equipo y luego no poder
    // enviarla a verificación sería dejar el trabajo a medias.
    esAutor: true,
    esResponsable,
    completa: estaCompleta(ficha, numeroDeFotos, exigencias),
  })

  const pendientes = pendientesNoBloqueantes(ficha, numeroDeFotos, exigencias)
  const edicionesRestantes = Math.max(0, TOPE_EDICIONES - (ficha.ediciones_usadas ?? 0))

  return (
    <Tarjeta>
      <div className="flex gap-4">
        {/* FR-041a: ilustración mientras se toman las fotografías. */}
        {numeroDeFotos === 0 && (
          <IlustracionCategoria
            categoria={categoria}
            className="hidden h-20 w-20 shrink-0 rounded-[--radius-tarjeta] sm:block"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold">{ficha.nombre_comun}</h3>
              <p className="text-sm italic" style={{ color: 'var(--color-texto-suave)' }}>
                {ficha.nombre_cientifico}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-texto-suave)' }}>
                {categoria}
                {autor && !esAutor && ` · registrada por ${autor}`}
              </p>
            </div>
            <EstadoFicha estado={ficha.estado} conDescripcion />
          </div>

          {pendientes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {pendientes.map((p) => (
                <li key={p.campo} className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
                  <span aria-hidden>○ </span>
                  {p.mensaje}
                </li>
              ))}
            </ul>
          )}

          {/* FR-038d: el autor debe ver POR QUÉ se le devolvió la ficha. */}
          {ficha.estado === 'borrador' && ficha.motivo_rechazo && (
            <div className="mt-3 rounded-[--radius-tarjeta] border border-[color:var(--color-ica-sensibles)] bg-orange-50 px-4 py-3 text-sm text-orange-950">
              <strong>Devuelta con observaciones:</strong> {ficha.motivo_rechazo}
            </div>
          )}

          {esAutor && ficha.estado === 'publicado' && (
            <div className="mt-4">
              <VisibilidadAutor fichaId={ficha.id} mostrarAutor={ficha.mostrar_autor} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AccionesFicha fichaId={ficha.id} transiciones={transiciones} />

            {ficha.estado !== 'publicado' && (
              <Link
                href={`/fichas/${ficha.id}`}
                className="rounded-full px-4 py-2 text-sm no-underline"
                style={{
                  border: '1px solid var(--color-borde)',
                  color: 'var(--color-texto)',
                }}
              >
                Editar
              </Link>
            )}

            {ficha.estado === 'publicado' && (
              <Link
                href={`/especie/${ficha.id}`}
                className="rounded-full px-4 py-2 text-sm no-underline"
                style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
              >
                Ver como la ve el público
              </Link>
            )}

            {/* FR-038f: el cupo se dice ANTES de gastarlo, no al agotarlo. */}
            {!esResponsable && ficha.estado !== 'publicado' && (
              <span
                className="text-xs"
                style={{ color: edicionesRestantes === 0 ? '#c62828' : 'var(--color-texto-suave)' }}
              >
                {edicionesRestantes === 0
                  ? 'Sin ediciones disponibles: envíela a verificación'
                  : `${edicionesRestantes} edición${edicionesRestantes === 1 ? '' : 'es'} disponible${edicionesRestantes === 1 ? '' : 's'}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Tarjeta>
  )
}
