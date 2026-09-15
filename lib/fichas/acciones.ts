'use server'

import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirIntegrante, exigirResponsable } from '@/lib/auth/sesion'
import {
  EXIGENCIAS_COMPLETAS,
  EXIGENCIAS_FASE_INICIAL,
  validarCompletitud,
} from './validarCompletitud'
import { avisarFichaEnRevision } from './avisos'
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

/**
 * Comprueba completitud antes de dejar avanzar (FR-041, FR-041a).
 *
 * ── Por qué consulta la imagen base ──────────────────────────────────────
 *
 * Porque las exigencias dependen de si existe la ortofoto, y esta función
 * no lo sabía: llamaba a `validarCompletitud` con los valores por omisión,
 * que reclaman fotografía y ubicación siempre.
 *
 * El resultado era una contradicción visible. La ficha decía «Ubicación
 * pendiente: se marcará cuando esté lista la imagen aérea» y, al pulsar
 * enviar, el servidor respondía «Falta marcar dónde está: toque su
 * ubicación sobre la imagen del colegio» —la imagen que la propia pantalla
 * acababa de declarar inexistente—. Ninguna ficha podía avanzar.
 *
 * Una regla que la interfaz relaja y el servidor no es peor que una regla
 * estricta: hace creer que la aplicación está rota.
 */
async function exigirFichaCompleta(fichaId: string): Promise<ResultadoAccion> {
  const supabase = await crearClienteServidor()

  const [{ data: ficha }, { count }, { data: imagenBase }] = await Promise.all([
    supabase.from('ficha_biodiversidad').select('*').eq('id', fichaId).maybeSingle(),
    supabase
      .from('foto_ficha')
      .select('id', { count: 'exact', head: true })
      .eq('ficha_id', fichaId),
    supabase.from('imagen_base_mapa').select('version').eq('vigente', true).maybeSingle(),
  ])

  if (!ficha) return { ok: false, mensaje: 'No se encontró la ficha.' }

  const faltan = validarCompletitud(
    ficha,
    count ?? 0,
    imagenBase ? EXIGENCIAS_COMPLETAS : EXIGENCIAS_FASE_INICIAL
  )
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

  const resultado = await cambiarEstado(fichaId, 'en_revision', { motivo_rechazo: null })
  if (!resultado.ok) return resultado

  /*
   * El aviso va DESPUES del cambio de estado, y se espera a que termine.
   *
   * Despues, porque avisar de una ficha que no llego a cambiar de estado
   * seria mandar a alguien a revisar algo que no esta ahi.
   *
   * Y se espera —en vez de dispararlo y seguir— porque en un servidor sin
   * estado la funcion puede terminar en cuanto se devuelve la respuesta, y
   * con ella la conexion SMTP a medio abrir. Un aviso que se pierde la
   * mitad de las veces es peor que no tenerlo: nadie sabe si llegara.
   *
   * `avisarFichaEnRevision` no lanza nunca, asi que esto no puede tumbar el
   * envio de la ficha.
   */
  await avisarFichaEnRevision(fichaId)

  return resultado
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

/**
 * Publicación sin pasar por verificación — FR-038b, FR-038h.
 *
 * La usan dos casos distintos que acaban en lo mismo:
 *
 *  · Una ficha ya aprobada alguna vez, que su autor vuelve a publicar. La
 *    confianza se otorgó una vez y no se retira (FR-038c).
 *  · Una ficha de la docente responsable. Mandarla a verificación
 *    significaría enviársela a sí misma.
 *
 * Quien no cumpla ninguno de los dos no llega aquí: la política
 * `integrante_edita_ficha_del_equipo` rechaza poner «publicado» a una ficha
 * nunca aprobada si quien lo intenta no es responsable. Esta función no lo
 * comprueba porque no es quien debe hacerlo.
 *
 * Si la publica un responsable, queda registrado como quien la aprobó: sin
 * eso, la ficha aparecería publicada sin que nadie conste como verificador.
 */
export async function publicarDirecto(fichaId: string): Promise<ResultadoAccion> {
  const completa = await exigirFichaCompleta(fichaId)
  if (!completa.ok) return completa

  const integrante = await exigirIntegrante()
  const extra = integrante.esResponsable
    ? { aprobada_por: integrante.id, motivo_rechazo: null }
    : {}

  return cambiarEstado(fichaId, 'publicado', extra)
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
