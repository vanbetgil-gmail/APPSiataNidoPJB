'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './tipos'

/**
 * Cliente de Supabase para el navegador.
 *
 * Usa siempre la clave anónima. Los permisos NO se comprueban aquí: los
 * comprueba PostgreSQL mediante RLS (contracts/db-schema.sql). Esto significa
 * que un descuido en el código de un componente no puede saltarse los
 * permisos, porque la última palabra la tiene la base de datos.
 */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
