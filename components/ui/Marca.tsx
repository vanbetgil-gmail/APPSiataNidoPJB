import Link from 'next/link'

/**
 * Marca de NIDO PJB (FR-001, FR-002).
 *
 * ── Coherencia con el símbolo del SIATA ──────────────────────────────────
 *
 * El ave del logo original es el elemento reconocible del proyecto, así que
 * aparece siempre junto al nombre. Lo que cambia respecto al logo original es
 * solo el texto de la marca, como pide FR-002.
 *
 * El ave va dentro de un círculo de salvia. Ese contenedor hace dos cosas:
 * le da al símbolo un sitio propio en cualquier fondo, y evita que sus cinco
 * colores saturados compitan con la escala del ICA, que es la única que
 * debe llamar la atención por color.
 */
export function Marca({
  conLecturaCompleta = false,
  tono = 'oscuro',
}: {
  conLecturaCompleta?: boolean
  /** `claro` para fondos oscuros, como el panel de bienvenida. */
  tono?: 'oscuro' | 'claro'
}) {
  const colorNombre = tono === 'claro' ? '#ffffff' : 'var(--color-texto)'
  const colorApellido = tono === 'claro' ? 'var(--color-crema)' : 'var(--color-marca)'
  const colorLectura = tono === 'claro' ? 'rgba(255,255,255,.72)' : 'var(--color-texto-suave)'

  return (
    <Link href="/" className="inline-flex items-center gap-3 no-underline">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: tono === 'claro' ? 'rgba(255,255,255,.14)' : 'var(--color-salvia)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/iconos/ave.png" alt="" className="h-7 w-7 object-contain" />
      </span>

      <span className="flex flex-col leading-tight">
        <span
          className="text-lg font-semibold tracking-tight"
          style={{ color: colorNombre, fontFamily: 'var(--font-display)' }}
        >
          NIDO <span style={{ color: colorApellido }}>PJB</span>
        </span>
        <span className="text-[0.7rem]" style={{ color: colorLectura }}>
          {conLecturaCompleta
            ? 'Nodo de Investigación y Datos Observados · Instituto Salesiano Pedro Justo Berrío'
            : 'observatorio del campus'}
        </span>
      </span>
    </Link>
  )
}
