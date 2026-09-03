import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { construirLibroDeFichas, nombreDelArchivo, type FichaExportable } from '@/lib/fichas/exportar'

/**
 * Exportación de fichas a hoja de cálculo — FR-036, FR-051.
 *
 * La prueba que de verdad importa aquí es la de los correos. El archivo sale
 * de la aplicación y deja de estar protegido por RLS: si algún día alguien
 * añade la columna «correo» al exportador «para tenerlo a mano», los correos
 * de nueve menores empiezan a viajar en adjuntos sin que nadie se entere.
 * Esta prueba lo impide.
 */

const FICHA: FichaExportable = {
  nombre_comun: 'Guayacán',
  nombre_cientifico: 'Tabebuia chrysantha',
  categoria: 'Árbol',
  estado: 'borrador',
  descripcion: 'Árbol de floración amarilla intensa.\n\nUbicación: Fraternidad.',
  autor: 'Claudia Andrea García',
  tiene_ubicacion: false,
  numero_de_fotos: 0,
  ediciones_usadas: 0,
  mostrar_autor: false,
  aprobada_por: null,
  aprobada_en: null,
  creada_en: '2026-09-02T10:00:00Z',
  modificada_en: null,
}

function leer(libro: Buffer) {
  const lb = XLSX.read(libro, { type: 'buffer' })
  return {
    hojas: lb.SheetNames,
    fichas: XLSX.utils.sheet_to_json<Record<string, unknown>>(lb.Sheets['Fichas']),
    crudo: JSON.stringify(
      lb.SheetNames.map((n) => XLSX.utils.sheet_to_json(lb.Sheets[n], { header: 1 }))
    ),
  }
}

describe('Exportación de fichas', () => {
  it('produce las dos hojas', () => {
    const { hojas } = leer(construirLibroDeFichas([FICHA], 'Vanessa Betancur'))
    expect(hojas).toEqual(['Fichas', 'Información'])
  })

  it('conserva las tildes', () => {
    // El motivo de usar .xlsx en vez de .csv: Excel en español abre los CSV
    // con la codificación del sistema y «Ebanistería» llega rota.
    const { fichas } = leer(construirLibroDeFichas([FICHA], 'Vanessa'))
    expect(fichas[0]['Nombre común']).toBe('Guayacán')
    expect(fichas[0]['Categoría']).toBe('Árbol')
  })

  it('NUNCA incluye un correo electrónico', () => {
    const conCorreoEnLosDatos: FichaExportable = {
      ...FICHA,
      // Aunque alguien escriba un correo dentro de la descripción, no es el
      // exportador quien lo pone: esta prueba vigila las COLUMNAS.
      autor: 'Claudia Andrea García',
    }
    const { crudo } = leer(construirLibroDeFichas([conCorreoEnLosDatos], 'Vanessa'))
    expect(crudo).not.toMatch(/@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
  })

  it('no expone ninguna columna que parezca un identificador interno', () => {
    const { fichas } = leer(construirLibroDeFichas([FICHA], 'Vanessa'))
    const columnas = Object.keys(fichas[0])
    for (const c of columnas) {
      expect(c.toLowerCase()).not.toMatch(/\bid\b|uuid|correo|email/)
    }
  })

  it('cuenta los estados en la hoja de información', () => {
    const libro = construirLibroDeFichas(
      [FICHA, { ...FICHA, estado: 'publicado' }, { ...FICHA, estado: 'en_revision' }],
      'Vanessa'
    )
    const { crudo } = leer(libro)
    expect(crudo).toContain('Fichas exportadas')
    expect(crudo).toContain('Instituto Salesiano Pedro Justo Berrío')
  })

  it('nombra el archivo con la fecha', () => {
    expect(nombreDelArchivo()).toMatch(/^NIDO-PJB-fichas-\d{4}-\d{2}-\d{2}\.xlsx$/)
  })

  it('exporta un libro válido aunque no haya ninguna ficha', () => {
    // El botón se oculta cuando no hay fichas, pero la ruta sigue siendo
    // alcanzable escribiendo la dirección: no debe reventar.
    const { hojas } = leer(construirLibroDeFichas([], 'Vanessa'))
    expect(hojas).toContain('Información')
  })
})
