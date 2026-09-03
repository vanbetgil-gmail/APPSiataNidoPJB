/**
 * Ilustración provisional para fichas sin fotografía (FR-041a).
 *
 * ── Por qué dibujada y no una foto de archivo ────────────────────────────
 *
 * Una fotografía genérica de un árbol cualquiera se confundiría con el árbol
 * del colegio. Un dibujo plano no engaña a nadie: se lee de inmediato como
 * «aquí todavía no hay foto», que es justo lo que hay que comunicar.
 *
 * Va en SVG y no en PNG porque pesa unos cientos de bytes, se ve nítida en
 * cualquier pantalla y toma los colores del tema sin necesidad de dos
 * archivos.
 */

const TRAZO = 'var(--color-marca)'
const RELLENO = 'var(--color-salvia)'

function Arbol() {
  return (
    <>
      <path d="M32 44v10" stroke={TRAZO} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="26" r="14" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      <circle cx="21" cy="33" r="9" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      <circle cx="43" cy="33" r="9" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
    </>
  )
}

function Arbusto() {
  return (
    <>
      <path d="M32 46v8" stroke={TRAZO} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="32" cy="34" rx="17" ry="12" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      <path d="M24 34q8-6 16 0" stroke={TRAZO} strokeWidth="1.5" fill="none" />
    </>
  )
}

function Ave() {
  return (
    <>
      <path
        d="M18 38q6-16 20-16 10 0 14 8-6 2-9 6 8 1 11 5-10 6-22 6-10 0-14-9z"
        fill={RELLENO}
        stroke={TRAZO}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="42" cy="27" r="1.6" fill={TRAZO} />
      <path d="M26 47l4-6M34 48l3-6" stroke={TRAZO} strokeWidth="2" strokeLinecap="round" />
    </>
  )
}

function Insecto() {
  return (
    <>
      <ellipse cx="32" cy="34" rx="7" ry="13" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      <ellipse cx="19" cy="29" rx="9" ry="6" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      <ellipse cx="45" cy="29" rx="9" ry="6" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      <circle cx="32" cy="20" r="4" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      <path d="M30 16l-3-4M34 16l3-4" stroke={TRAZO} strokeWidth="1.8" strokeLinecap="round" />
    </>
  )
}

function Ornamental() {
  return (
    <>
      <path d="M32 40v14" stroke={TRAZO} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="30" r="5" fill={RELLENO} stroke={TRAZO} strokeWidth="2" />
      {[0, 72, 144, 216, 288].map((g) => (
        <ellipse
          key={g}
          cx="32"
          cy="20"
          rx="4.5"
          ry="7"
          fill={RELLENO}
          stroke={TRAZO}
          strokeWidth="2"
          transform={`rotate(${g} 32 30)`}
        />
      ))}
      <path d="M32 47q-7-2-9-7" stroke={TRAZO} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  )
}

const DIBUJOS: Record<string, () => React.JSX.Element> = {
  // Las dos categorías vigentes (migración 0010).
  flora: Arbol,
  fauna: Ave,
  // Las antiguas se conservan por si queda alguna ficha sin migrar.
  árbol: Arbol,
  arbol: Arbol,
  arbusto: Arbusto,
  ave: Ave,
  insecto: Insecto,
  'planta ornamental': Ornamental,
  planta: Ornamental,
}

export function IlustracionCategoria({
  categoria,
  className,
}: {
  categoria: string | null | undefined
  className?: string
}) {
  const Dibujo = DIBUJOS[(categoria ?? '').toLowerCase()] ?? Arbol

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-salvia-clara)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {/* La ficha ya dice en texto que la foto está pendiente, así que el
          dibujo es decorativo y no debe repetirlo a los lectores de pantalla. */}
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden focusable="false">
        <Dibujo />
      </svg>
    </div>
  )
}
