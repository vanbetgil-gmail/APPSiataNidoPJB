import { redirect } from 'next/navigation'
import { CabeceraPrivada } from '@/components/ui/CabeceraPrivada'
import { contarPendientesRevision, integranteActual } from '@/lib/auth/sesion'

/**
 * Grupo de rutas PRIVADO.
 *
 * Todo lo de aquí dentro exige sesión iniciada (FR-015). El middleware ya lo
 * comprueba; aquí se repite como segunda barrera, porque una sola línea
 * olvidada no debería bastar para exponer datos.
 *
 * La barrera definitiva, en cualquier caso, es RLS: aunque ambas fallaran,
 * PostgreSQL seguiría negando el acceso a `medicion` y `jornada`.
 */
export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const integrante = await integranteActual()

  if (!integrante) redirect('/login')

  /*
   * Se cuenta para todos, no solo para responsables.
   *
   * No hace falta filtrar por rol aquí: RLS ya limita lo que cada quien ve.
   * Un responsable cuenta las fichas de todo el equipo, que son las que debe
   * verificar; un integrante cuenta solo las suyas, que son las que está
   * esperando. La misma consulta responde las dos preguntas.
   */
  const pendientes = await contarPendientesRevision()

  return (
    <div className="flex min-h-dvh flex-col">
      <CabeceraPrivada
        nombre={integrante.nombre}
        rol={integrante.rol}
        pendientesRevision={pendientes}
      />
      <main className="flex-1">{children}</main>
    </div>
  )
}
