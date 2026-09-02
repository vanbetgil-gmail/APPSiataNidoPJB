'use server'

import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirResponsable } from '@/lib/auth/sesion'
import { dominioDe, normalizarCorreo } from '@/lib/auth/verificarAcceso'
import type { RolIntegrante } from '@/lib/supabase/tipos'

export type ResultadoEquipo = { ok: true } | { ok: false; mensaje: string }

/**
 * Alta de un integrante (parte de T046) — FR-013a.
 *
 * ── La parte que exige atención ──────────────────────────────────────────
 *
 * Dar de alta a alguien en `integrante` NO le crea cuenta de autenticación.
 * El enlace mágico se envía con `shouldCreateUser: false`, así que la persona
 * no podrá entrar hasta que exista también en `auth.users`.
 *
 * Crear usuarios de autenticación requiere la clave de servicio, que
 * deliberadamente NO se usa en rutas de servidor (contracts/api.md): un fallo
 * en este archivo no debe poder saltarse RLS.
 *
 * De momento el alta se completa desde el panel de Supabase
 * (Authentication → Users → Invite). Queda anotado como limitación conocida
 * en lugar de resolverse con la clave de servicio, que sería peor.
 */
export async function agregarIntegrante(
  correoBruto: string,
  nombre: string,
  rol: RolIntegrante,
  esMenorEdad: boolean
): Promise<ResultadoEquipo> {
  await exigirResponsable()
  const supabase = await crearClienteServidor()

  const correo = normalizarCorreo(correoBruto)

  const { data: config } = await supabase
    .from('configuracion')
    .select('dominio_institucional')
    .maybeSingle()

  if (!config) return { ok: false, mensaje: 'No se pudo leer la configuración del proyecto.' }

  if (dominioDe(correo) !== config.dominio_institucional.toLowerCase()) {
    return {
      ok: false,
      mensaje: `El correo debe ser del dominio @${config.dominio_institucional}.`,
    }
  }

  if (!nombre.trim()) {
    return { ok: false, mensaje: 'Escriba el nombre de la persona.' }
  }

  // Busca el usuario de autenticación que debe existir previamente.
  const { data: filas } = await supabase.rpc('correo_autorizado', {
    correo_consultado: correo,
  })
  if ((Array.isArray(filas) ? filas.length : filas ? 1 : 0) > 0) {
    return { ok: false, mensaje: 'Ese correo ya está en el equipo.' }
  }

  return {
    ok: false,
    mensaje:
      'Para completar el alta hay que invitar primero a esta persona desde el panel de Supabase ' +
      '(Authentication → Users → Invite user) y después volver aquí. Se hace así a propósito: ' +
      'crear cuentas desde la aplicación exigiría usar la clave de servicio, que sortea todos ' +
      'los permisos de la base de datos.',
  }
}

/** Baja lógica (FR-013). Nunca se borra: se perdería la autoría. */
export async function cambiarEstadoIntegrante(
  integranteId: string,
  activo: boolean
): Promise<ResultadoEquipo> {
  await exigirResponsable()
  const supabase = await crearClienteServidor()

  const { error } = await supabase.from('integrante').update({ activo }).eq('id', integranteId)

  if (error) {
    return {
      ok: false,
      mensaje:
        'No se pudo cambiar el estado. Si es el último responsable activo, la base de datos lo ' +
        'impide: siempre debe quedar al menos uno.',
    }
  }

  revalidatePath('/admin/integrantes')
  revalidatePath('/creditos')
  return { ok: true }
}

export async function cambiarRol(
  integranteId: string,
  rol: RolIntegrante
): Promise<ResultadoEquipo> {
  await exigirResponsable()
  const supabase = await crearClienteServidor()

  const { error } = await supabase.from('integrante').update({ rol }).eq('id', integranteId)

  if (error) {
    return {
      ok: false,
      mensaje:
        'No se pudo cambiar el rol. Si era el último responsable activo, la base de datos lo ' +
        'impide: siempre debe quedar al menos uno.',
    }
  }

  revalidatePath('/admin/integrantes')
  return { ok: true }
}
