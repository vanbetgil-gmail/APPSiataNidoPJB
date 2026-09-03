/**
 * Insignia de fichas pendientes de verificación (FR-038g).
 *
 * ── Por qué roja y verde, y no solo roja ─────────────────────────────────
 *
 * Una insignia que solo aparece cuando hay trabajo pendiente deja una duda
 * cada vez que no está: ¿no hay nada, o se rompió el contador? El verde
 * responde esa pregunta. Cuesta un elemento más en pantalla y ahorra tener
 * que entrar a comprobarlo.
 *
 * ── Por qué el número no va solo en color ────────────────────────────────
 *
 * Rojo y verde son precisamente el par que no distingue una parte grande de
 * las personas con daltonismo, que es el más común. La insignia lleva
 * siempre el número o un signo, y un texto para lectores de pantalla: el
 * color refuerza, nunca informa por sí solo (WCAG 1.4.1).
 *
 * ── Por qué no usa la paleta del ICA ─────────────────────────────────────
 *
 * En esta aplicación el verde y el rojo del ICA significan calidad del aire
 * y solo eso (FR-004). Estos son tonos propios, deliberadamente distintos,
 * para que nadie lea «aire limpio» donde dice «nada pendiente».
 */
export function InsigniaVerificacion({
  cantidad,
  esResponsable,
}: {
  cantidad: number
  esResponsable: boolean
}) {
  const hayPendientes = cantidad > 0

  const texto = hayPendientes
    ? esResponsable
      ? `${cantidad} ficha${cantidad === 1 ? '' : 's'} esperando su verificación`
      : `${cantidad} ficha${cantidad === 1 ? '' : 's'} enviada${cantidad === 1 ? '' : 's'} a verificación`
    : 'Sin fichas pendientes de verificación'

  return (
    <span
      title={texto}
      className="ml-1.5 inline-flex min-w-[1.4rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none"
      style={
        hayPendientes
          ? { backgroundColor: '#c62828', color: '#ffffff' }
          : { backgroundColor: '#e3efe5', color: '#1f6b39' }
      }
    >
      <span aria-hidden>{hayPendientes ? cantidad : '✓'}</span>
      <span className="sr-only">{texto}</span>
    </span>
  )
}
