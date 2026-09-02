import Link from 'next/link'

/**
 * Marca de NIDO PJB (FR-001, FR-002).
 *
 * El logo se conserva íntegro; lo único que cambia respecto al original es
 * el texto. La lectura completa de la sigla aparece en la portada pública,
 * como exige FR-001.
 */
export function Marca({ conLecturaCompleta = false }: { conLecturaCompleta?: boolean }) {
  return (
    <Link href="/" className="inline-flex flex-col no-underline">
      <span className="text-xl font-bold tracking-tight text-[color:var(--color-texto)]">
        NIDO <span className="text-[color:var(--color-marca)]">PJB</span>
      </span>
      {conLecturaCompleta && (
        <span className="text-xs text-[color:var(--color-texto-suave)]">
          Nodo de Investigación y Datos Observados · Instituto Pedro Justo Berrío
        </span>
      )}
    </Link>
  )
}
