/**
 * Aviso en línea. Se usa, entre otras cosas, para la advertencia de ventana
 * temporal del ICA (research.md R-004), que debe acompañar SIEMPRE a una
 * categoría de calidad del aire.
 */
export function Aviso({
  tono = 'informacion',
  children,
}: {
  tono?: 'informacion' | 'precaucion'
  children: React.ReactNode
}) {
  const estilos =
    tono === 'precaucion'
      ? 'border-[color:var(--color-ica-sensibles)] bg-orange-50 text-orange-950'
      : 'border-[color:var(--color-borde)] bg-[color:var(--color-marca-suave)] text-[color:var(--color-texto)]'

  return (
    <p className={`rounded-[--radius-tarjeta] border px-4 py-3 text-sm leading-relaxed ${estilos}`}>
      {children}
    </p>
  )
}
