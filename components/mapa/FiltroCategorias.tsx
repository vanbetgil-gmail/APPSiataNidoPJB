'use client'

/**
 * Filtro por categoría de organismo (T030) — FR-007.
 *
 * Escenario 3 de la Historia 1: al filtrar, el mapa muestra solo esa categoría
 * y EL CONTEO VISIBLE SE ACTUALIZA. El conteo no es decorativo: es lo que
 * permite al visitante saber que el filtro hizo algo.
 */
export interface FiltroCategoriasProps {
  categorias: string[]
  seleccionadas: Set<string>
  onAlternar: (categoria: string) => void
  onLimpiar: () => void
  totalVisible: number
  totalGeneral: number
}

export function FiltroCategorias({
  categorias,
  seleccionadas,
  onAlternar,
  onLimpiar,
  totalVisible,
  totalGeneral,
}: FiltroCategoriasProps) {
  const hayFiltro = seleccionadas.size > 0

  return (
    <div className="flex flex-col gap-2">
      {/* desplazable-x: en móvil las categorías se desplazan por dentro,
          sin arrastrar el ancho de la página (FR-047) */}
      <div className="desplazable-x flex gap-2 pb-1" role="group" aria-label="Filtrar por categoría">
        {categorias.map((categoria) => {
          const activa = seleccionadas.has(categoria)
          return (
            <button
              key={categoria}
              type="button"
              aria-pressed={activa}
              onClick={() => onAlternar(categoria)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                activa
                  ? 'border-[color:var(--color-marca)] bg-[color:var(--color-marca)] text-white'
                  : 'border-[color:var(--color-borde)] bg-[color:var(--color-superficie)] text-[color:var(--color-texto)]'
              }`}
            >
              {categoria}
            </button>
          )
        })}
        {hayFiltro && (
          <button
            type="button"
            onClick={onLimpiar}
            className="shrink-0 rounded-full border border-[color:var(--color-borde)] px-4 py-2 text-sm"
          >
            Ver todo
          </button>
        )}
      </div>

      <p
        data-testid="conteo-puntos"
        aria-live="polite"
        className="text-sm text-[color:var(--color-texto-suave)]"
      >
        {hayFiltro
          ? `Mostrando ${totalVisible} de ${totalGeneral} registros`
          : `${totalGeneral} registros de biodiversidad`}
      </p>
    </div>
  )
}
