'use server'

import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirIntegrante } from '@/lib/auth/sesion'
import { RANGOS, validarValor } from '@/lib/validacion/rangos'
import { MAXIMO_MEDICIONES, esDiaDeMedicion } from './ritmo'

/**
 * Registro de jornadas y mediciones — Historia 3.
 *
 * ── Los identificadores vienen del cliente ───────────────────────────────
 *
 * `jornada.id` y `medicion.id` se generan en el navegador y se envían, en
 * vez de dejar que los invente la base de datos. Está así desde el esquema
 * inicial (R-006, FR-027) y tiene un motivo: hace que reenviar sea
 * inofensivo. Si la conexión se cae después de guardar pero antes de
 * responder, el reintento escribe la misma fila con el mismo identificador
 * en lugar de duplicar la lectura.
 *
 * Es también lo que permitirá guardar sin conexión más adelante: las filas
 * se crean en el teléfono, con su identificador definitivo, y se suben
 * cuando haya señal.
 *
 * ── Qué valida el servidor y qué no ──────────────────────────────────────
 *
 * Rechaza lo físicamente imposible —una humedad del 140 %— porque eso solo
 * puede ser un error de digitación.
 *
 * NO rechaza lo inusual. Si un taller de soldadura marca 900 µg/m³ de PM10,
 * ese dato es real y es justamente el que interesa (FR-024). La aplicación
 * advierte y pide confirmación; no se niega a guardarlo.
 */

export type ResultadoMedicion =
  | { ok: true; id: string }
  | { ok: false; mensaje: string }

const CLAVES = RANGOS.map((r) => r.clave)

export async function crearJornada(datos: {
  id: string
  fecha: string
  lugarId: string
  medidorId: string
}): Promise<ResultadoMedicion> {
  const integrante = await exigirIntegrante('/jornadas')
  const supabase = await crearClienteServidor()

  if (!datos.lugarId || !datos.medidorId) {
    return { ok: false, mensaje: 'Elija el lugar y el medidor antes de empezar.' }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    return { ok: false, mensaje: 'La fecha no tiene un formato válido.' }
  }

  /*
   * Un día que no es miércoles ni viernes NO se rechaza.
   *
   * El equipo mide esos dos días, pero una salida extraordinaria —una feria
   * de la ciencia, una visita— produce datos igual de reales. Negarse a
   * guardarlos obligaría a inventar una fecha falsa, que es peor que una
   * fecha inusual. El aviso se da en el formulario, antes de llegar aquí.
   */

  const { error } = await supabase.from('jornada').insert({
    id: datos.id,
    fecha: datos.fecha,
    lugar_id: datos.lugarId,
    medidor_id: datos.medidorId,
    integrante_id: integrante.id,
    origen: 'app',
  })

  if (error) {
    // 23505 es violación de unicidad: la jornada ya existe, que es
    // exactamente lo que se espera de un reintento. No es un fallo.
    if (error.code === '23505') return { ok: true, id: datos.id }

    return {
      ok: false,
      mensaje: 'No se pudo abrir la jornada. Compruebe que el lugar y el medidor siguen activos.',
    }
  }

  revalidatePath('/jornadas')
  revalidatePath('/tableros')
  return { ok: true, id: datos.id }
}

export async function guardarMedicion(datos: {
  id: string
  jornadaId: string
  numero: number
  hora: string
  valores: Record<string, number | null>
  nota: string
}): Promise<ResultadoMedicion> {
  await exigirIntegrante('/jornadas')
  const supabase = await crearClienteServidor()

  if (datos.numero < 1 || datos.numero > MAXIMO_MEDICIONES) {
    return {
      ok: false,
      mensaje: `Una jornada admite hasta ${MAXIMO_MEDICIONES} mediciones.`,
    }
  }

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(datos.hora)) {
    return { ok: false, mensaje: 'La hora no tiene un formato válido.' }
  }

  // Solo se copian las claves conocidas: así una clave inventada en el
  // cliente no llega a la sentencia de inserción.
  const fila: Record<string, number | null> = {}
  for (const clave of CLAVES) {
    const valor = datos.valores[clave]
    const limpio = valor === undefined || valor === null || Number.isNaN(valor) ? null : valor

    const resultado = validarValor(clave, limpio)
    if (resultado.estado === 'rechazado') {
      return { ok: false, mensaje: resultado.mensaje }
    }

    fila[clave] = limpio
  }

  // Una medición sin ningún valor no es una medición: es una fila vacía que
  // luego nadie sabe interpretar. `null` significa «no medido» para UNA
  // variable, no para todas a la vez (FR-025).
  if (CLAVES.every((c) => fila[c] === null)) {
    return {
      ok: false,
      mensaje: 'Escriba al menos un valor. Una medición sin ningún dato no se puede guardar.',
    }
  }

  const nota = datos.nota.trim()

  const { error } = await supabase.from('medicion').insert({
    id: datos.id,
    jornada_id: datos.jornadaId,
    numero: datos.numero,
    hora: datos.hora.length === 5 ? `${datos.hora}:00` : datos.hora,
    ...fila,
    dato_dudoso: nota.length > 0,
    nota_dudoso: nota || null,
  })

  if (error) {
    if (error.code === '23505') {
      // O se reenvió la misma medición —inofensivo— o alguien intenta
      // guardar dos veces el número 3 en la misma jornada.
      return {
        ok: false,
        mensaje:
          'Esa medición ya estaba guardada. Recargue la pantalla para ver el estado real de la jornada.',
      }
    }
    return {
      ok: false,
      mensaje: 'No se pudo guardar la medición. Compruebe la conexión y vuelva a intentarlo.',
    }
  }

  revalidatePath(`/jornadas/${datos.jornadaId}`)
  revalidatePath('/jornadas')
  revalidatePath('/tableros')
  return { ok: true, id: datos.id }
}

export async function cerrarJornada(jornadaId: string): Promise<ResultadoMedicion> {
  await exigirIntegrante('/jornadas')
  const supabase = await crearClienteServidor()

  const { error } = await supabase.from('jornada').update({ cerrada: true }).eq('id', jornadaId)

  if (error) {
    return { ok: false, mensaje: 'No se pudo cerrar la jornada.' }
  }

  revalidatePath(`/jornadas/${jornadaId}`)
  revalidatePath('/jornadas')
  return { ok: true, id: jornadaId }
}

/** Reabrir: cerrar por error no debería costar una jornada entera. */
export async function reabrirJornada(jornadaId: string): Promise<ResultadoMedicion> {
  await exigirIntegrante('/jornadas')
  const supabase = await crearClienteServidor()

  const { error } = await supabase.from('jornada').update({ cerrada: false }).eq('id', jornadaId)

  if (error) return { ok: false, mensaje: 'No se pudo reabrir la jornada.' }

  revalidatePath(`/jornadas/${jornadaId}`)
  revalidatePath('/jornadas')
  return { ok: true, id: jornadaId }
}

/**
 * Descartar una jornada abierta por equivocacion (migracion 0017).
 *
 * Solo funciona si esta VACIA, y eso lo garantiza la politica de la base de
 * datos, no esta funcion. Una jornada con mediciones es trabajo de campo:
 * si una lectura esta mal se corrige, no se hace desaparecer.
 */
export async function descartarJornada(jornadaId: string): Promise<ResultadoMedicion> {
  await exigirIntegrante('/jornadas')
  const supabase = await crearClienteServidor()

  const { error } = await supabase.from('jornada').delete().eq('id', jornadaId)

  if (error) {
    return {
      ok: false,
      mensaje:
        'No se pudo descartar. Solo se puede descartar una jornada propia y sin ninguna medicion guardada.',
    }
  }

  revalidatePath('/jornadas')
  revalidatePath('/tableros')
  return { ok: true, id: jornadaId }
}

/** Para el aviso del formulario: mismo criterio en cliente y servidor. */
export async function fechaEsDiaDeMedicion(iso: string): Promise<boolean> {
  return esDiaDeMedicion(iso)
}
