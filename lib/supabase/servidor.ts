import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from './tipos'

/**
 * Cliente de Supabase para componentes y rutas de servidor.
 *
 * Actúa SIEMPRE con el token del usuario, nunca con la clave de servicio
 * (contracts/api.md). Así RLS sigue gobernando también en el servidor: una
 * ruta con un fallo lógico no puede leer lo que su usuario no podría leer.
 *
 * La clave de servicio se reserva exclusivamente para la migración única del
 * histórico, que se ejecuta a mano desde scripts/migrar-historico.ts.
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacenCookies.getAll(),
        setAll: (cookiesNuevas: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            cookiesNuevas.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options)
            )
          } catch {
            // Los componentes de servidor no pueden escribir cookies.
            // El middleware ya refresca la sesión, así que se ignora.
          }
        },
      },
    }
  )
}

/**
 * Cliente anónimo, sin sesión. Para las páginas públicas.
 *
 * Que exista de forma explícita hace evidente en el código qué páginas se
 * sirven sin cuenta (FR-005) y evita arrastrar sesión sin querer.
 */
export function crearClientePublico() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
