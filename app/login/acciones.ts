'use server'

import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { normalizarCorreo, verificarAcceso } from '@/lib/auth/verificarAcceso'
import type { Database } from '@/lib/supabase/tipos'

/**
 * Acción de servidor para solicitar el enlace de acceso (T040) — R-005.
 *
 * ── Por qué enlace mágico y no contraseña ────────────────────────────────
 *
 * No hay contraseñas que gestionar, lo cual importa especialmente tratándose
 * de menores de edad: nada que olvidar, nada que reutilizar de otro sitio,
 * nada que filtrar. Y no depende del proveedor de identidad del colegio, que
 * todavía está por confirmar (A-006).
 *
 * ── Por qué la verificación va aquí y no en el cliente ───────────────────
 *
 * La comprobación de dominio y de pertenencia ocurre EN EL SERVIDOR, antes de
 * pedirle nada a Supabase. Si se hiciera en el navegador, bastaría con abrir
 * las herramientas de desarrollo para saltársela.
 *
 * La barrera definitiva, en todo caso, no es esta: es RLS. Aunque alguien
 * consiguiera una sesión, `es_integrante_activo()` seguiría negándole el
 * acceso a los datos.
 */

export type EstadoFormulario =
  | { tipo: 'inicial' }
  | { tipo: 'enviado'; correo: string }
  | { tipo: 'rechazado'; mensaje: string; motivo: 'dominio' | 'no_autorizado' | 'inactivo' }
  | { tipo: 'error'; mensaje: string }

export async function solicitarEnlace(
  _anterior: EstadoFormulario,
  formulario: FormData
): Promise<EstadoFormulario> {
  const correo = normalizarCorreo(String(formulario.get('correo') ?? ''))
  const rutaSolicitada = String(formulario.get('rutaSolicitada') ?? '/tableros')

  if (!correo) {
    return { tipo: 'error', mensaje: 'Escriba su correo institucional.' }
  }

  const acceso = await verificarAcceso(correo)

  switch (acceso.estado) {
    case 'dominio_ajeno':
      return { tipo: 'rechazado', mensaje: acceso.mensaje, motivo: 'dominio' }
    case 'no_autorizado':
      return { tipo: 'rechazado', mensaje: acceso.mensaje, motivo: 'no_autorizado' }
    case 'inactivo':
      return { tipo: 'rechazado', mensaje: acceso.mensaje, motivo: 'inactivo' }
    case 'error':
      return { tipo: 'error', mensaje: acceso.mensaje }
  }

  const almacenCookies = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacenCookies.getAll(),
        setAll: (nuevas: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            nuevas.forEach(({ name, value, options }) => almacenCookies.set(name, value, options))
          } catch {
            // Los componentes de servidor no siempre pueden escribir cookies.
          }
        },
      },
    }
  )

  const cabeceras = await headers()
  const origen =
    process.env.NEXT_PUBLIC_URL_SITIO ??
    `https://${cabeceras.get('host') ?? 'localhost:3000'}`

  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: {
      // FR-013a: no hay autorregistro. Si el correo no tiene ya cuenta de
      // autenticación, Supabase NO debe crearla. El alta la hace el
      // responsable desde /admin/integrantes.
      shouldCreateUser: false,
      emailRedirectTo: `${origen}/auth/callback?siguiente=${encodeURIComponent(rutaSolicitada)}`,
    },
  })

  if (error) {
    return {
      tipo: 'error',
      mensaje:
        'No se pudo enviar el enlace. Si el problema sigue, avise al docente responsable.',
    }
  }

  return { tipo: 'enviado', correo }
}

export async function cerrarSesion(): Promise<void> {
  const almacenCookies = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacenCookies.getAll(),
        setAll: (nuevas: { name: string; value: string; options: CookieOptions }[]) => {
          nuevas.forEach(({ name, value, options }) => almacenCookies.set(name, value, options))
        },
      },
    }
  )
  await supabase.auth.signOut()
}
