import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import type { RolIntegrante } from '@/lib/supabase/tipos'

/**
 * Utilidades de sesión (T044) — FR-014, FR-015, FR-016.
 *
 * `integranteActual()` es la forma canónica de saber quién está usando la
 * aplicación. Devuelve `null` si no hay sesión válida.
 *
 * Importante: no basta con que exista sesión de autenticación. También tiene
 * que existir una fila en `integrante` y estar activa. Alguien dado de baja
 * conserva su cuenta de Supabase pero deja de tener acceso (FR-013).
 */

export interface IntegranteSesion {
  id: string
  nombre: string
  rol: RolIntegrante
  esResponsable: boolean
}

export async function integranteActual(): Promise<IntegranteSesion | null> {
  const supabase = await crearClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // La política `integrante_se_ve_a_si_mismo` permite esta lectura.
  const { data } = await supabase
    .from('integrante')
    .select('id, nombre, rol, activo')
    .eq('id', user.id)
    .maybeSingle()

  if (!data || !data.activo) return null

  return {
    id: data.id,
    nombre: data.nombre,
    rol: data.rol,
    esResponsable: data.rol === 'responsable',
  }
}

/**
 * Como `integranteActual()`, pero redirige a la pantalla de acceso si no hay
 * sesión. Para páginas que no tienen sentido sin ella.
 */
export async function exigirIntegrante(rutaActual = '/tableros'): Promise<IntegranteSesion> {
  const integrante = await integranteActual()
  if (!integrante) {
    redirect(`/login?siguiente=${encodeURIComponent(rutaActual)}`)
  }
  return integrante
}

/**
 * Exige además rol de responsable (FR-014).
 *
 * Se usa en las pantallas de administración y de revisión. No sustituye a
 * RLS: la base de datos vuelve a comprobarlo en cada escritura.
 */
export async function exigirResponsable(rutaActual = '/tableros'): Promise<IntegranteSesion> {
  const integrante = await exigirIntegrante(rutaActual)
  if (!integrante.esResponsable) {
    redirect('/tableros?aviso=solo_responsable')
  }
  return integrante
}

/** Cuántas fichas esperan revisión. Para el distintivo de la cabecera (FR-038f). */
export async function contarPendientesRevision(): Promise<number> {
  const supabase = await crearClienteServidor()
  const { count } = await supabase
    .from('ficha_biodiversidad')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'en_revision')
  return count ?? 0
}
