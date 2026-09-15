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

/**
 * Cómo aparece una persona en la página pública del equipo (migración 0015).
 *
 * ── Por qué las tres cosas van juntas ────────────────────────────────────
 *
 * Mostrarse o no, con qué cargo y en qué lugar de la lista son decisiones
 * que se toman de una sola vez, mirando la página. Separarlas en tres
 * acciones obligaría a guardar tres veces para colocar bien a una persona.
 *
 * ── Lo que esta función NO puede hacer ───────────────────────────────────
 *
 * Mostrar a un menor de edad sin autorización de acudiente. Poner
 * `visible_en_equipo` en `true` no basta: la vista `integrante_publico`
 * exige ADEMÁS la autorización, y esa condición no se puede tocar desde
 * aquí. Ocultar es una decisión editorial; mostrar sigue necesitando
 * permiso escrito (FR-051d).
 */
export async function actualizarFichaPublica(
  integranteId: string,
  datos: { visible: boolean; cargo: string; orden: number | null }
): Promise<ResultadoEquipo> {
  await exigirResponsable()
  const supabase = await crearClienteServidor()

  const cargo = datos.cargo.trim()

  const { error } = await supabase
    .from('integrante')
    .update({
      visible_en_equipo: datos.visible,
      // Cadena vacía = sin cargo. En la base es un nulo, no un texto vacío:
      // no hay cargo, no hay un cargo que se llama «».
      grado: cargo || null,
      orden_equipo: datos.orden,
    })
    .eq('id', integranteId)

  if (error) {
    return { ok: false, mensaje: 'No se pudo guardar la ficha pública de esta persona.' }
  }

  revalidatePath('/admin/integrantes')
  revalidatePath('/creditos')
  return { ok: true }
}
