import type { FichaBiodiversidad } from '@/lib/supabase/tipos'

/**
 * Validación de completitud de una ficha (T095) — FR-041.
 *
 * «El sistema DEBE impedir la publicación de registros incompletos,
 * señalando con precisión los campos faltantes.»
 *
 * Lo importante es «con precisión»: decir «faltan campos» no sirve de nada a
 * un estudiante de colegio. Cada mensaje nombra el campo y explica qué se
 * espera en él.
 */

export type CampoFicha =
  | 'nombre_comun'
  | 'nombre_cientifico'
  | 'categoria_id'
  | 'descripcion'
  | 'punto_mapa_id'
  | 'foto'

export interface FaltaCampo {
  campo: CampoFicha
  mensaje: string
}

const LARGO_MINIMO_DESCRIPCION = 30

/**
 * Qué se exige para publicar, según la fase del proyecto (FR-041a).
 *
 * Los dos requisitos que se pueden relajar son los que dependen de material
 * que todavía no existe, no de que alguien no haya hecho su trabajo:
 *
 * · **La ubicación** necesita la ortofoto, y el vuelo de dron está
 *   pendiente. Exigirla ahora obligaría a inventar coordenadas sobre una
 *   imagen que va a cambiar, y quedarían todas desplazadas sin aviso.
 *
 * · **La fotografía** se está tomando. Mientras tanto la ficha muestra una
 *   ilustración de la categoría, claramente marcada como provisional.
 *
 * Ninguno de los dos se «desactiva»: siguen apareciendo como pendientes en
 * la ficha. Lo que cambia es que no bloquean la verificación, para que el
 * trabajo taxonómico pueda avanzar sin esperar al dron.
 */
export interface ExigenciasDePublicacion {
  /** Cierto cuando existe una ortofoto vigente. */
  ubicacion: boolean
  foto: boolean
}

export const EXIGENCIAS_FASE_INICIAL: ExigenciasDePublicacion = {
  ubicacion: false,
  foto: false,
}

export const EXIGENCIAS_COMPLETAS: ExigenciasDePublicacion = {
  ubicacion: true,
  foto: true,
}

export function validarCompletitud(
  ficha: Partial<FichaBiodiversidad>,
  numeroDeFotos: number,
  exigencias: ExigenciasDePublicacion = EXIGENCIAS_COMPLETAS
): FaltaCampo[] {
  const faltan: FaltaCampo[] = []

  if (!ficha.nombre_comun?.trim()) {
    faltan.push({
      campo: 'nombre_comun',
      mensaje: 'Falta el nombre común: como se le dice en el colegio, por ejemplo «guayacán».',
    })
  }

  if (!ficha.nombre_cientifico?.trim()) {
    faltan.push({
      campo: 'nombre_cientifico',
      mensaje:
        'Falta el nombre científico: género y especie, por ejemplo «Tabebuia chrysantha». ' +
        'Si no lo saben con certeza, consúltenlo antes de publicar.',
    })
  }

  if (!ficha.categoria_id) {
    faltan.push({
      campo: 'categoria_id',
      mensaje: 'Falta elegir la categoría: árbol, arbusto, ave, insecto o planta ornamental.',
    })
  }

  const descripcion = ficha.descripcion?.trim() ?? ''
  if (!descripcion) {
    faltan.push({
      campo: 'descripcion',
      mensaje: 'Falta la descripción: qué observaron, dónde estaba, qué les llamó la atención.',
    })
  } else if (descripcion.length < LARGO_MINIMO_DESCRIPCION) {
    faltan.push({
      campo: 'descripcion',
      mensaje:
        `La descripción es demasiado corta (${descripcion.length} caracteres). ` +
        'Cuenten algo que le sirva a quien lea la ficha sin haber estado allí.',
    })
  }

  if (exigencias.ubicacion && !ficha.punto_mapa_id) {
    faltan.push({
      campo: 'punto_mapa_id',
      mensaje: 'Falta marcar dónde está: toque su ubicación sobre la imagen del colegio.',
    })
  }

  // FR-039: al menos una fotografía.
  if (exigencias.foto && numeroDeFotos < 1) {
    faltan.push({
      campo: 'foto',
      mensaje: 'Falta la fotografía: sin imagen la ficha no se puede publicar.',
    })
  }

  return faltan
}

/**
 * Lo que falta pero NO impide publicar en esta fase.
 *
 * Se muestra igual en la ficha. Que algo no bloquee no significa que deba
 * desaparecer de la vista: si la ubicación pendiente dejara de mostrarse,
 * nadie se acordaría de ponerla cuando llegue la ortofoto.
 */
export function pendientesNoBloqueantes(
  ficha: Partial<FichaBiodiversidad>,
  numeroDeFotos: number,
  exigencias: ExigenciasDePublicacion
): FaltaCampo[] {
  const pendientes: FaltaCampo[] = []

  if (!exigencias.ubicacion && !ficha.punto_mapa_id) {
    pendientes.push({
      campo: 'punto_mapa_id',
      mensaje: 'Ubicación pendiente: se marcará cuando esté lista la imagen aérea del colegio.',
    })
  }

  if (!exigencias.foto && numeroDeFotos < 1) {
    pendientes.push({
      campo: 'foto',
      mensaje: 'Fotografía pendiente: mientras tanto se muestra una ilustración de la categoría.',
    })
  }

  return pendientes
}

export function estaCompleta(
  ficha: Partial<FichaBiodiversidad>,
  numeroDeFotos: number,
  exigencias: ExigenciasDePublicacion = EXIGENCIAS_COMPLETAS
): boolean {
  return validarCompletitud(ficha, numeroDeFotos, exigencias).length === 0
}
