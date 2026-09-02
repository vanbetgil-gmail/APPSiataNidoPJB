/**
 * Umbrales del Índice de Calidad del Aire (ICA) colombiano.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ ✅ VERIFICADO CONTRA LA NORMA OFICIAL — tarea T126 cerrada            │
 * │                                                                       │
 * │ Fuente: Resolución 2254 de 2017 (Ministerio de Ambiente y Desarrollo  │
 * │ Sostenible), Artículo 20, TABLA 6.                                    │
 * │                                                                       │
 * │ La tabla está incrustada como IMAGEN en todas las copias del texto    │
 * │ legal, incluido el PDF del propio Ministerio —que es un escaneo sin   │
 * │ capa de texto—. Por eso los extractores automáticos y los resúmenes   │
 * │ de buscador la reproducen mal. Los valores de aquí se leyeron de la   │
 * │ imagen nativa de la tabla y se contrastaron con:                      │
 * │                                                                       │
 * │  · Régimen Legal de Bogotá, norma 82634 (imagen nativa de la Tabla 6) │
 * │  · PDF del INS, con capa de texto (Arts. 18 a 21)                     │
 * │  · Corponor, informe mensual de calidad del aire (tabla como texto)   │
 * │  · IDEAM, ficha metodológica del ICA                                  │
 * │                                                                       │
 * │ Tres verificaciones independientes intentaron refutar estos valores   │
 * │ y ninguna lo consiguió.                                               │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️ ADVERTENCIA IMPORTANTE SOBRE PM10 (ver LIMITES_NORMATIVOS más abajo)
 *
 * El ICA de PM10 en Colombia NO está calibrado contra la propia norma
 * colombiana: reproduce la escala de la EPA estadounidense. El límite legal
 * diario de PM10 es 75 µg/m³ (Art. 2, Parágrafo 1), pero ese valor produce un
 * ICA de 61, que la tabla llama «Aceptable». Un día al DOBLE del límite legal
 * (150 µg/m³) sigue saliendo «Aceptable».
 *
 * PM2.5 sí está calibrado: su tope de «Aceptable» (37 µg/m³) coincide
 * exactamente con el límite legal diario.
 *
 * Consecuencia para esta aplicación: la categoría del ICA y el cumplimiento
 * de la norma son DOS COSAS DISTINTAS y deben mostrarse por separado. Ver
 * `superaLimiteNormativo()` en calcular.ts.
 *
 * Referencia: research.md R-004
 */

export type CategoriaICA =
  | 'buena'
  | 'aceptable'
  | 'daniña_sensibles'
  | 'daniña'
  | 'muy_daniña'
  | 'peligrosa'

export interface DefinicionCategoria {
  categoria: CategoriaICA
  etiqueta: string
  /** Explicación en lenguaje escolar (FR-035, SC-012) */
  descripcion: string
  /** Variable CSS de la paleta del logo (FR-004, FR-035a) */
  color: string
  indiceMin: number
  indiceMax: number
}

/**
 * Las seis categorías del ICA con los colores de la barra del logo.
 * Esta escala es la ÚNICA forma de representar calidad del aire en toda la
 * aplicación: mapa, tableros y fichas usan exactamente estos colores.
 */
export const CATEGORIAS: readonly DefinicionCategoria[] = [
  {
    categoria: 'buena',
    etiqueta: 'Buena',
    descripcion: 'El aire está limpio. No hay riesgo para la salud.',
    color: 'var(--color-ica-buena)',
    indiceMin: 0,
    indiceMax: 50,
  },
  {
    categoria: 'aceptable',
    etiqueta: 'Aceptable',
    descripcion:
      'El aire es aceptable, pero las personas muy sensibles podrían notar molestias.',
    color: 'var(--color-ica-aceptable)',
    indiceMin: 51,
    indiceMax: 100,
  },
  {
    categoria: 'daniña_sensibles',
    etiqueta: 'Dañina a la salud de grupos sensibles',
    descripcion:
      'Las personas con asma, alergias o problemas respiratorios pueden verse afectadas.',
    color: 'var(--color-ica-sensibles)',
    indiceMin: 101,
    indiceMax: 150,
  },
  {
    categoria: 'daniña',
    etiqueta: 'Dañina a la salud',
    descripcion: 'Todas las personas pueden empezar a sentir efectos en la salud.',
    color: 'var(--color-ica-daniña)',
    indiceMin: 151,
    indiceMax: 200,
  },
  {
    categoria: 'muy_daniña',
    etiqueta: 'Muy dañina a la salud',
    descripcion: 'Alerta sanitaria: todas las personas pueden sufrir efectos graves.',
    color: 'var(--color-ica-muy-daniña)',
    indiceMin: 201,
    indiceMax: 300,
  },
  {
    categoria: 'peligrosa',
    etiqueta: 'Peligrosa',
    descripcion: 'Emergencia: el aire es peligroso para toda la población.',
    color: 'var(--color-ica-peligrosa)',
    indiceMin: 301,
    indiceMax: 500,
  },
] as const

/**
 * Punto de corte: tramo de concentración que se mapea a un tramo de índice.
 */
export interface PuntoDeCorte {
  concentracionMin: number
  concentracionMax: number
  indiceMin: number
  indiceMax: number
}

/**
 * PM2.5, promedio de 24 horas, en µg/m³. Tabla 6 de la Resolución 2254/2017.
 *
 * OJO: son ENTEROS, no decimales. La tabla colombiana dice 13–37, no
 * 12.1–37.0. Esta fila se aparta a propósito de la escala de la EPA
 * (que usa 12.1–35.4) porque su tope de «Aceptable» se fijó en 37 µg/m³
 * para que coincidiera con el límite legal diario colombiano.
 */
export const CORTES_PM25: readonly PuntoDeCorte[] = [
  { concentracionMin: 0, concentracionMax: 12, indiceMin: 0, indiceMax: 50 },
  { concentracionMin: 13, concentracionMax: 37, indiceMin: 51, indiceMax: 100 },
  { concentracionMin: 38, concentracionMax: 55, indiceMin: 101, indiceMax: 150 },
  { concentracionMin: 56, concentracionMax: 150, indiceMin: 151, indiceMax: 200 },
  { concentracionMin: 151, concentracionMax: 250, indiceMin: 201, indiceMax: 300 },
  { concentracionMin: 251, concentracionMax: 500, indiceMin: 301, indiceMax: 500 },
] as const

/**
 * PM10, promedio de 24 horas, en µg/m³. Tabla 6 de la Resolución 2254/2017.
 * Esta fila sí coincide con la escala de la EPA.
 */
export const CORTES_PM10: readonly PuntoDeCorte[] = [
  { concentracionMin: 0, concentracionMax: 54, indiceMin: 0, indiceMax: 50 },
  { concentracionMin: 55, concentracionMax: 154, indiceMin: 51, indiceMax: 100 },
  { concentracionMin: 155, concentracionMax: 254, indiceMin: 101, indiceMax: 150 },
  { concentracionMin: 255, concentracionMax: 354, indiceMin: 151, indiceMax: 200 },
  { concentracionMin: 355, concentracionMax: 424, indiceMin: 201, indiceMax: 300 },
  { concentracionMin: 425, concentracionMax: 604, indiceMin: 301, indiceMax: 500 },
] as const

/**
 * Límites máximos permisibles diarios, Art. 2 Parágrafo 1 de la misma norma.
 *
 * Superarlos es incumplir la ley, algo DISTINTO de la categoría del ICA.
 * Para PM10 la diferencia es grande: 150 µg/m³ es el doble del límite legal
 * y el ICA lo llama «Aceptable».
 */
export const LIMITES_NORMATIVOS = {
  pm25: 37,
  pm10: 75,
} as const

/**
 * Regla de redondeo.
 *
 * La Tabla 6 deja huecos entre tramos: 12,5 µg/m³ de PM2.5 no cae en ningún
 * rango (el primero acaba en 12 y el segundo empieza en 13). Es un vacío real
 * del texto legal, que no fija regla de redondeo en ningún artículo.
 *
 * Se trunca al entero inferior, que es lo coherente con cortes enteros:
 * 12,9 → 12 → «Buena». Queda documentado para que la decisión sea explícita
 * y no un accidente de implementación.
 */
export const REGLA_REDONDEO = 'truncar al entero inferior' as const

/**
 * Bandera que gobierna si la aplicación puede presentar categorías del ICA
 * como información fiable.
 *
 * En `true` desde la verificación contra el texto oficial (T126). Si algún día
 * se cambian los cortes sin volver a verificarlos, esta bandera debe volver a
 * `false`: hay una prueba en tests/unit/ica.test.ts que obliga a pasar por
 * este archivo al tocarla.
 */
export const UMBRALES_VERIFICADOS_CONTRA_NORMA = true

/**
 * Advertencia metodológica (research.md R-004).
 *
 * El ICA está definido sobre promedios de 24 horas. Las mediciones del
 * proyecto son lecturas puntuales de unos 10 minutos. Aplicar los umbrales
 * de 24 h a una lectura instantánea es incorrecto, así que la aplicación
 * lo dice en voz alta en lugar de disimularlo.
 *
 * Convertir esta limitación en explicación es, además, exactamente el tipo
 * de aprendizaje que persigue el proyecto.
 */
export const ADVERTENCIA_VENTANA_TEMPORAL =
  'Esta categoría se calcula con los umbrales del ICA, definidos para promedios de 24 horas. ' +
  'Aquí se aplica a una lectura puntual de pocos minutos, así que es orientativa y no equivale ' +
  'a una medición oficial de calidad del aire.'
