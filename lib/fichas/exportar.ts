import * as XLSX from 'xlsx'
import type { EstadoFicha } from '@/lib/supabase/tipos'

/**
 * Exportación de las fichas de biodiversidad a hoja de cálculo — FR-036.
 *
 * ── Por qué .xlsx y no .csv ──────────────────────────────────────────────
 *
 * Por las tildes. Excel en español abre los CSV con la codificación del
 * sistema, no con UTF-8, así que «Ebanistería» llega como «EbanisterÃ­a» a
 * menos que el archivo lleve marca de orden de bytes, que a su vez rompe
 * otros programas. En `.xlsx` la codificación va dentro del formato y no
 * hay nada que negociar.
 *
 * Además las descripciones llevan saltos de línea, que en CSV obligan a
 * entrecomillar y son la fuente clásica de archivos que se abren torcidos.
 *
 * ── Qué NO lleva el archivo ──────────────────────────────────────────────
 *
 * Correos electrónicos. Ninguno, de nadie. El archivo va a salir de la
 * aplicación —a un USB, a un correo, a una entrega institucional— y en ese
 * momento deja de estar protegido por los permisos de la base de datos. Los
 * correos de nueve menores de edad no deben viajar en un adjunto (FR-051).
 *
 * El nombre del autor sí va, porque el archivo es para el equipo y la
 * autoría es parte del registro. La hoja «Información» lo advierte.
 */

export interface FichaExportable {
  nombre_comun: string
  nombre_cientifico: string
  categoria: string | null
  estado: EstadoFicha
  descripcion: string
  autor: string | null
  tiene_ubicacion: boolean
  numero_de_fotos: number
  ediciones_usadas: number
  mostrar_autor: boolean
  aprobada_por: string | null
  aprobada_en: string | null
  creada_en: string
  modificada_en: string | null
}

const ETIQUETA_ESTADO: Record<EstadoFicha, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  publicado: 'Publicada',
  despublicado: 'Retirada del mapa',
}

function soloFecha(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

export function construirLibroDeFichas(
  fichas: FichaExportable[],
  generadaPor: string
): Buffer {
  const libro = XLSX.utils.book_new()

  // --- Hoja 1: las fichas --------------------------------------------------
  const filas = fichas.map((f) => ({
    'Nombre común': f.nombre_comun,
    'Nombre científico': f.nombre_cientifico,
    Categoría: f.categoria ?? '',
    Estado: ETIQUETA_ESTADO[f.estado],
    Descripción: f.descripcion,
    'Registrada por': f.autor ?? '',
    'Autor visible en público': f.mostrar_autor ? 'Sí' : 'No',
    'Ubicación en el mapa': f.tiene_ubicacion ? 'Marcada' : 'Pendiente',
    Fotografías: f.numero_de_fotos,
    'Ediciones usadas': f.ediciones_usadas,
    'Verificada por': f.aprobada_por ?? '',
    'Fecha de verificación': soloFecha(f.aprobada_en),
    Creada: soloFecha(f.creada_en),
    'Última modificación': soloFecha(f.modificada_en),
  }))

  const hoja = XLSX.utils.json_to_sheet(filas)

  // Anchos de columna. Sin esto la descripción sale en una columna de 8
  // caracteres y el archivo es ilegible hasta que alguien la ensancha a mano.
  hoja['!cols'] = [
    { wch: 26 }, // nombre común
    { wch: 28 }, // nombre científico
    { wch: 14 }, // categoría
    { wch: 16 }, // estado
    { wch: 80 }, // descripción
    { wch: 24 }, // registrada por
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
  ]

  XLSX.utils.book_append_sheet(libro, hoja, 'Fichas')

  // --- Hoja 2: de qué es este archivo -------------------------------------
  //
  // Quien lo abra dentro de dos años no va a tener el contexto de hoy. Un
  // archivo suelto sin procedencia es un archivo del que nadie se fía.
  const info = [
    ['NIDO PJB — Fichas de biodiversidad'],
    ['Instituto Salesiano Pedro Justo Berrío'],
    [],
    ['Generado el', new Date().toLocaleString('es-CO')],
    ['Generado por', generadaPor],
    ['Fichas exportadas', fichas.length],
    ['Publicadas', fichas.filter((f) => f.estado === 'publicado').length],
    ['En revisión', fichas.filter((f) => f.estado === 'en_revision').length],
    ['Borradores', fichas.filter((f) => f.estado === 'borrador').length],
    [],
    ['Sobre el manejo de este archivo'],
    [
      'Contiene nombres de estudiantes menores de edad. No contiene correos',
    ],
    [
      'electrónicos: se omiten a propósito porque el archivo deja de estar',
    ],
    ['protegido en cuanto sale de la aplicación.'],
    [],
    ['Trátelo como documento interno del proyecto. Si va a compartirlo fuera'],
    ['del colegio, revise antes la columna «Registrada por».'],
    [],
    ['Las fotografías no viajan en este archivo. Están en la aplicación.'],
  ]

  const hojaInfo = XLSX.utils.aoa_to_sheet(info)
  hojaInfo['!cols'] = [{ wch: 24 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(libro, hojaInfo, 'Información')

  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

/** `NIDO-PJB-fichas-2026-09-02.xlsx` */
export function nombreDelArchivo(): string {
  return `NIDO-PJB-fichas-${new Date().toISOString().slice(0, 10)}.xlsx`
}
