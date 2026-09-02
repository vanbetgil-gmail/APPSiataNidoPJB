import type { ResultadoICA } from '@/lib/ica/calcular'

/**
 * Muestra una categoría del ICA con el color de la barra del logo.
 *
 * Es el ÚNICO componente autorizado para pintar calidad del aire con color
 * (FR-004, FR-035a). Que exista uno solo es lo que garantiza que el mapa, los
 * tableros y las fichas no puedan discrepar entre sí.
 *
 * Cuando no hay dato, muestra gris y dice «sin dato» — nunca verde
 * (contracts/api.md).
 */
export function EtiquetaCalidadAire({
  resultado,
  mostrarValor = true,
}: {
  resultado: ResultadoICA
  mostrarValor?: boolean
}) {
  if (!resultado.definicion) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm"
        style={{ backgroundColor: 'var(--color-ica-sin-dato)', color: '#fff' }}
      >
        Sin dato de calidad del aire
      </span>
    )
  }

  const { definicion, valor } = resultado

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white"
      style={{ backgroundColor: definicion.color }}
      title={definicion.descripcion}
    >
      {definicion.etiqueta}
      {mostrarValor && valor !== null && (
        <span className="opacity-90">ICA {valor}</span>
      )}
    </span>
  )
}
