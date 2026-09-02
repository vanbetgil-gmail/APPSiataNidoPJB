/**
 * Estado inicial del mapa sin puntos publicados (T032).
 *
 * Caso límite de la especificación: la primera carga con inventario vacío
 * debe explicar la situación, no dejar un mapa en blanco que parece roto.
 * Es además el primer estado real de la aplicación el día que se estrene.
 */
export function EstadoVacio() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <div className="pointer-events-auto max-w-md rounded-[--radius-tarjeta] border border-[color:var(--color-borde)] bg-white/95 p-6 text-center shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Aún no hay especies en el mapa</h2>
        <p className="text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
          El equipo de NIDO PJB está documentando la biodiversidad del colegio. Cada árbol, ave o
          insecto que encuentran se marca aquí con su foto y su descripción.
        </p>
        <p className="mt-3 text-sm text-[color:var(--color-texto-suave)]">
          Vuelva pronto: el mapa crece con cada salida de campo.
        </p>
      </div>
    </div>
  )
}
