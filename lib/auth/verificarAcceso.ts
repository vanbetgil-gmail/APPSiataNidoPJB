import { crearClientePublico } from '@/lib/supabase/servidor'

/**
 * Verificación de acceso (T041) — FR-011, FR-012.
 *
 * Tres resultados posibles, y la spec exige que sean DISTINGUIBLES entre sí
 * (escenarios 2 y 3 de la Historia 2):
 *
 *   1. autorizado          → puede entrar
 *   2. dominio_ajeno       → «solo se admiten correos institucionales»
 *   3. no_autorizado       → «esta cuenta no está autorizada para el proyecto»
 *
 * El caso 3 es el que más se suele confundir con el 2. Distinguirlos importa:
 * a un docente del colegio que no está en el equipo hay que decirle que su
 * correo es válido pero que no pertenece al proyecto, no que su correo está
 * mal. Si no, va a intentarlo diez veces creyendo que se equivocó al escribir.
 */

export type ResultadoAcceso =
  | { estado: 'autorizado'; rol: 'integrante' | 'responsable' }
  | { estado: 'dominio_ajeno'; dominioEsperado: string; mensaje: string }
  | { estado: 'no_autorizado'; mensaje: string }
  | { estado: 'inactivo'; mensaje: string }
  | { estado: 'error'; mensaje: string }

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase()
}

export function dominioDe(correo: string): string {
  return normalizarCorreo(correo).split('@')[1] ?? ''
}

/**
 * Comprueba si un correo puede iniciar sesión.
 *
 * El dominio institucional NO está codificado: sale de la tabla
 * `configuracion` (FR-011). Cambiarlo es editar una fila, no desplegar código.
 * Importa porque todavía no está confirmado si el colegio usa
 * `@salesianos.edu.co` o `@institutopedrojustoberrio.com` (A-006).
 */
export async function verificarAcceso(correoBruto: string): Promise<ResultadoAcceso> {
  const correo = normalizarCorreo(correoBruto)

  if (!correo.includes('@')) {
    return { estado: 'error', mensaje: 'Escriba un correo electrónico válido.' }
  }

  const supabase = crearClientePublico()

  const { data: config, error: errorConfig } = await supabase
    .from('configuracion')
    .select('dominio_institucional')
    .maybeSingle()

  if (errorConfig || !config) {
    return {
      estado: 'error',
      mensaje: 'No se pudo comprobar el acceso en este momento. Intente de nuevo en unos minutos.',
    }
  }

  const dominioEsperado = config.dominio_institucional.toLowerCase()

  if (dominioDe(correo) !== dominioEsperado) {
    return {
      estado: 'dominio_ajeno',
      dominioEsperado,
      mensaje:
        `Solo se admiten correos institucionales del colegio (@${dominioEsperado}). ` +
        'El correo que escribió pertenece a otro dominio.',
    }
  }

  // La tabla `integrante` no es legible por un anónimo —y no debe serlo—, así
  // que la comprobación de pertenencia se hace con una función del servidor
  // que responde solo sí o no, sin devolver datos de nadie.
  const { data: filas, error: errorLista } = await supabase.rpc('correo_autorizado', {
    correo_consultado: correo,
  })

  if (errorLista) {
    return {
      estado: 'error',
      mensaje: 'No se pudo comprobar el acceso en este momento. Intente de nuevo en unos minutos.',
    }
  }

  // La función devuelve una tabla: sin filas significa que el correo no está
  // en la lista de autorizados.
  const registro = Array.isArray(filas) ? filas[0] : filas

  if (!registro) {
    return {
      estado: 'no_autorizado',
      mensaje:
        'Este correo es del colegio, pero no está autorizado para el proyecto NIDO PJB. ' +
        'Pida al docente responsable que lo agregue al equipo.',
    }
  }

  if (!registro.activo) {
    return {
      estado: 'inactivo',
      mensaje: 'Esta cuenta fue desactivada. Consulte con el docente responsable del proyecto.',
    }
  }

  return { estado: 'autorizado', rol: registro.rol }
}
