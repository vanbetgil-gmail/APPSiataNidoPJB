import Link from 'next/link'

/**
 * Marca del proyecto (FR-001, FR-002).
 *
 * ── Los dos nombres y por qué conviven ───────────────────────────────────
 *
 * Lo que se lee grande es **SIATA PJB**: es el nombre con el que el colegio
 * conoce el proyecto y el que aparece en sus documentos, así que es el que
 * permite reconocerlo de un vistazo.
 *
 * Debajo va **NIDO**, con su significado desplegado. No es un adorno: la
 * plataforma se llama así en la especificación, en el repositorio y en los
 * correos que envía, y quien vea esos tres nombres sin una pista los tomaría
 * por tres cosas distintas. La línea de abajo es esa pista.
 *
 * Se escribe entero —«Nodo de Investigación y Datos Observados»— y no solo
 * la sigla, porque una sigla que nadie ha explicado no informa: se aprende o
 * se ignora, y aquí basta con leerla una vez.
 *
 * ── Coherencia con el símbolo del SIATA ──────────────────────────────────
 *
 * El ave del logo original es el elemento reconocible del proyecto, así que
 * aparece siempre junto al nombre. Va dentro de un círculo de salvia: ese
 * contenedor le da un sitio propio sobre cualquier fondo y evita que sus
 * cinco colores saturados compitan con la escala del ICA, que es la única
 * que debe llamar la atención por color.
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
        style={{
          backgroundColor: tono === 'claro' ? 'rgba(255,255,255,.14)' : 'var(--color-salvia)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/iconos/ave.png" alt="" className="h-7 w-7 object-contain" />
      </span>

      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className="text-lg font-semibold tracking-tight"
          style={{ color: colorNombre, fontFamily: 'var(--font-display)' }}
        >
          SIATA <span style={{ color: colorApellido }}>PJB</span>
        </span>

        <span className="text-[0.7rem] leading-snug" style={{ color: colorLectura }}>
          {/*
            «NIDO» va en negrita dentro de la línea, no en un renglón aparte.
            Separarlo lo convertiría en un tercer bloque de texto y la marca
            pasaría a tener tres pisos; así se lee como lo que es: el nombre
            de la plataforma, seguido de lo que significa.
          */}
          <strong style={{ fontWeight: 600 }}>NIDO</strong>
          {conLecturaCompleta ? (
            <>
              {' '}
              · Nodo de Investigación y Datos Observados
              <br />
              Instituto Salesiano Pedro Justo Berrío
            </>
          ) : (
            <> · Nodo de Investigación y Datos Observados</>
          )}
        </span>
      </span>
    </Link>
  )
}
