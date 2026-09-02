'use server'

import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirIntegrante, exigirResponsable } from '@/lib/auth/sesion'
import { validarCompletitud } from './validarCompletitud'
import type { EstadoFicha } from '@/lib/supabase/tipos'

/**
 * Acciones de servidor sobre fichas (T098, T099, T102, T106).
 *
 * ── Sobre la autorización en este archivo ────────────────────────────────
 *
 * Cada acción comprueba el rol antes de actuar, pero esa comprobación es
 * comodidad: la autorización real la aplica RLS. Si una de estas funciones
 * olvidara comprobar algo, PostgreSQL seguiría rechazando la escritura.
 *
 * Se hace igualmente aquí para poder devolver un mensaje entendible en lugar
 * de un error de base de datos.
 */

export type ResultadoAccion = { ok: true } | { ok: false; mensaje: string }

async function revalidarVistasPublicas(fichaId?: string) {
  revalidatePath('/')
  revalidatePath('/biodiversidad')
  if (fichaId) revalidatePath(`/especie/${fichaId}`)
  revalidatePath('/fichas')
  revalidatePath('/revision')
}

async function cambiarEstado(
  fichaId: string,
  destino: EstadoFicha,
  extra: Record<string, unknown> = {}
): Promise<ResultadoAccion> {
  const supabase = await crearClienteServidor()
  const integrante = await exigirIntegrante()

  const { error } = await supabase
    .from('ficha_biodiversidad')
    .update({
      estado: destino,
      modificada_en: new Date().toISOString(),
      modificada_por: integrante.id,
      ...extra,
    })
    .eq('id', fichaId)

  if (error) {
    return {
      ok: false,
      mensaje: 'No se pudo cambiar el estado de la ficha. Puede que no tenga permiso para hacerlo.',
    }
  }

  await revalidarVistasPublicas(fichaId)
  return { ok: true }
}

/** Comprueba completitud antes de dejar avanzar (FR-041). */
async function exigirFichaCompleta(fichaId: string): Promise<ResultadoAccion> {
  const supabase = await crearClienteServidor()

  const [{ data: ficha }, { count }] = await Promise.all([
    supabase.from('ficha_biodiversidad').select('*').eq('id', fichaId).maybeSingle(),
    supabase
      .from('foto_ficha')
      .select('id', { count: 'exact', head: true })
      .eq('ficha_id', fichaId),
  ])

  if (!ficha) return { ok: false, mensaje: 'No se encontró la ficha.' }

  const faltan = validarCompletitud(ficha, count ?? 0)
  if (faltan.length > 0) {
    return {
      ok: false,
      mensaje: `No se puede continuar porque falta información:\n${faltan
        .map((f) => `· ${f.mensaje}`)
        .join('\n')}`,
    }
  }

  return { ok: true }
}

export async function enviarARevision(fichaId: string): Promise<ResultadoAccion> {
  const completa = await exigirFichaCompleta(fichaId)
  if (!completa.ok) return completa
  return cambiarEstado(fichaId, 'en_revision', { motivo_rechazo: null })
}

/**
 * Aprobación (T098) — FR-038b.
 *
 * Solo un responsable. El disparador `marcar_primera_aprobacion` pone
 * `aprobada_alguna_vez` en `true` automáticamente; no se toca desde aquí para
 * que exista una sola fuente de esa verdad.
 */
export async function aprobarFicha(fichaId: string): Promise<ResultadoAccion> {
  const responsable = await exigirResponsable()

  const completa = await exigirFichaCompleta(fichaId)
  if (!completa.ok) return completa

  return cambiarEstado(fichaId, 'publicado', {
    aprobada_por: responsable.id,
    motivo_rechazo: null,
  })
}

/**
 * Rechazo (T099) — FR-038d.
 *
 * El motivo es obligatorio. Devolver una ficha sin decir por qué deja al
 * estudiante sin saber qué corregir, y eso desanima más que ayuda.
 */
export async function rechazarFicha(
  fichaId: string,
  motivo: string
): Promise<ResultadoAccion> {
  await exigirResponsable()

  const texto = motivo.trim()
  if (texto.length < 10) {
    return {
      ok: false,
      mensaje:
        'Escriba un motivo de al menos 10 caracteres. Su autor necesita saber qué corregir.',
    }
  }

  return cambiarEstado(fichaId, 'borrador', { motivo_rechazo: texto })
}

export async function retirarDeRevision(fichaId: string): Promise<ResultadoAccion> {
  return cambiarEstado(fichaId, 'borrador')
}

export async function publicarDirecto(fichaId: string): Promise<ResultadoAccion> {
  const completa = await exigirFichaCompleta(fichaId)
  if (!completa.ok) return completa
  return cambiarEstado(fichaId, 'publicado')
}

/** Despublicar (T106) — FR-044. Conserva todo para el equipo. */
export async function despublicarFicha(fichaId: string): Promise<ResultadoAccion> {
  return cambiarEstado(fichaId, 'despublicado')
}

/**
 * Visibilidad del autor (T102) — FR-051a, FR-051c, FR-051d.
 *
 * El disparador `verificar_autorizacion_autor` de la base de datos impide
 * activarla para un menor sin autorización de acudiente. Aquí se comprueba
 * también para poder explicar POR QUÉ se rechaza, en lugar de mostrar un
 * error de PostgreSQL a un estudiante.
 *
 * La comprobación de la base de datos es la que manda: es la que no se puede
 * saltar desde ningún cliente.
 */
export async function cambiarVisibilidadAutor(
  fichaId: string,
  mostrar: boolean
): Promise<ResultadoAccion> {
  const supabase = await crearClienteServidor()
  const integrante = await exigirIntegrante()

  if (mostrar) {
    const { data: yo } = await supabase
      .from('integrante')
      .select('es_menor_edad, autorizacion_acudiente')
      .eq('id', integrante.id)
      .maybeSingle()

    if (yo && yo.es_menor_edad && !yo.autorizacion_acudiente) {
      return {
        ok: false,
        mensaje:
          'Todavía no puede mostrar su nombre públicamente. El docente responsable debe registrar ' +
          'primero la autorización de su acudiente. Mientras tanto, la ficha se atribuye al equipo.',
      }
    }
  }

  const { error } = await supabase
    .from('ficha_biodiversidad')
    .update({ mostrar_autor: mostrar })
    .eq('id', fichaId)

  if (error) {
    return {
      ok: false,
      mensaje:
        'No se pudo cambiar la visibilidad del nombre. Si es menor de edad, hace falta ' +
        'autorización de su acudiente registrada por el docente responsable.',
    }
  }

  await revalidarVistasPublicas(fichaId)
  return { ok: true }
}

/** Registro de autorizaciones de acudiente (T103) — FR-051d, FR-051e. */
export async function registrarAutorizacion(
  integranteId: string,
  autorizado: boolean
): Promise<ResultadoAccion> {
  await exigirResponsable()
  const supabase = await crearClienteServidor()

  const { error } = await supabase
    .from('integrante')
    .update({ autorizacion_acudiente: autorizado })
    .eq('id', integranteId)

  if (error) {
    return { ok: false, mensaje: 'No se pudo actualizar la autorización.' }
  }

  // Al RETIRAR una autorización, el nombre debe dejar de verse en todas sus
  // fichas de inmediato (caso límite de la spec). Las fichas siguen
  // publicadas: lo que se retira es la atribución, no el trabajo.
  if (!autorizado) {
    await supabase
      .from('ficha_biodiversidad')
      .update({ mostrar_autor: false })
      .eq('autor_id', integranteId)
  }

  await revalidarVistasPublicas()
  revalidatePath('/admin/autorizaciones')
  revalidatePath('/creditos')
  return { ok: true }
}
