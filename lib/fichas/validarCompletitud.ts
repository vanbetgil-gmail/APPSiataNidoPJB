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

export function validarCompletitud(
  ficha: Partial<FichaBiodiversidad>,
  numeroDeFotos: number
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

  if (!ficha.punto_mapa_id) {
    faltan.push({
      campo: 'punto_mapa_id',
      mensaje: 'Falta marcar dónde está: toque su ubicación sobre la imagen del colegio.',
    })
  }

  // FR-039: al menos una fotografía.
  if (numeroDeFotos < 1) {
    faltan.push({
      campo: 'foto',
      mensaje: 'Falta la fotografía: sin imagen la ficha no se puede publicar.',
    })
  }

  return faltan
}

export function estaCompleta(
  ficha: Partial<FichaBiodiversidad>,
  numeroDeFotos: number
): boolean {
  return validarCompletitud(ficha, numeroDeFotos).length === 0
}
