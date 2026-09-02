import {
  ADVERTENCIA_VENTANA_TEMPORAL,
  CATEGORIAS,
  CORTES_PM10,
  CORTES_PM25,
  LIMITES_NORMATIVOS,
  UMBRALES_VERIFICADOS_CONTRA_NORMA,
  type CategoriaICA,
  type DefinicionCategoria,
  type PuntoDeCorte,
} from './umbrales'

export interface ResultadoICA {
  /** Valor del índice, 0–500. `null` si no hay datos suficientes. */
  valor: number | null
  /** Categoría cualitativa. `null` si no hay datos suficientes. NUNCA 'buena' por omisión. */
  categoria: CategoriaICA | null
  /** Definición completa de la categoría, para pintar etiqueta y color. */
  definicion: DefinicionCategoria | null
  /** Qué contaminante determinó el índice: el ICA lo fija el peor de los dos. */
  contaminanteDominante: 'pm25' | 'pm10' | null
  /** Advertencias que la interfaz DEBE mostrar junto al valor. */
  advertencias: string[]
}

/**
 * Interpolación lineal dentro de un tramo, según la fórmula estándar del ICA.
 */
function interpolar(concentracion: number, corte: PuntoDeCorte): number {
  const { concentracionMin, concentracionMax, indiceMin, indiceMax } = corte
  const rangoConcentracion = concentracionMax - concentracionMin
  if (rangoConcentracion === 0) return indiceMin
  return Math.round(
    ((indiceMax - indiceMin) / rangoConcentracion) * (concentracion - concentracionMin) + indiceMin
  )
}

function indiceDeContaminante(
  concentracion: number | null | undefined,
  cortes: readonly PuntoDeCorte[]
): number | null {
  // `null` y `undefined` significan NO MEDIDO. Cero significa medido en cero
  // (FR-025): son cosas distintas y aquí no pueden confundirse.
  if (concentracion === null || concentracion === undefined) return null
  if (Number.isNaN(concentracion) || concentracion < 0) return null

  // La Tabla 6 usa cortes ENTEROS y deja huecos entre tramos: 12,5 µg/m³ de
  // PM2.5 no cae en ninguno. La norma no fija regla de redondeo, así que se
  // trunca al entero inferior (REGLA_REDONDEO en umbrales.ts).
  const valor = Math.floor(concentracion)

  const corte = cortes.find((c) => valor >= c.concentracionMin && valor <= c.concentracionMax)

  // Por encima del último tramo la escala se agota: el índice se topa en 500.
  if (!corte) {
    const ultimo = cortes[cortes.length - 1]
    return valor > ultimo.concentracionMax ? 500 : null
  }

  return interpolar(valor, corte)
}

function categoriaDeIndice(valor: number): DefinicionCategoria {
  return (
    CATEGORIAS.find((c) => valor >= c.indiceMin && valor <= c.indiceMax) ??
    CATEGORIAS[CATEGORIAS.length - 1]
  )
}

/**
 * Calcula el ICA colombiano a partir de PM2.5 y PM10.
 *
 * Función pura y única fuente de verdad: mapa, tableros, fichas y exportación
 * la usan sin excepción, para que no puedan discrepar entre sí (FR-035a).
 *
 * REGLA INNEGOCIABLE (contracts/api.md): si faltan ambos contaminantes,
 * devuelve `categoria: null` — nunca 'buena'. Dar por limpio un aire que
 * nadie midió sería el peor error posible en esta aplicación.
 *
 * Solo se aplica a PM2.5 y PM10 (FR-035b). Las demás variables del medidor
 * —PM1, HCHO, TVOC, CO₂, partículas por litro, temperatura y humedad— no
 * tienen categoría en la norma y esta función no se las inventa.
 */
export function calcularICA(
  pm25: number | null | undefined,
  pm10: number | null | undefined
): ResultadoICA {
  const indicePm25 = indiceDeContaminante(pm25, CORTES_PM25)
  const indicePm10 = indiceDeContaminante(pm10, CORTES_PM10)

  if (indicePm25 === null && indicePm10 === null) {
    return {
      valor: null,
      categoria: null,
      definicion: null,
      contaminanteDominante: null,
      advertencias: ['No hay datos de PM2.5 ni de PM10 para calcular la calidad del aire.'],
    }
  }

  // El ICA lo determina el contaminante en peor situación, no un promedio.
  const dominante: 'pm25' | 'pm10' =
    (indicePm25 ?? -1) >= (indicePm10 ?? -1) ? 'pm25' : 'pm10'
  const valor = Math.max(indicePm25 ?? 0, indicePm10 ?? 0)
  const definicion = categoriaDeIndice(valor)

  const advertencias: string[] = [ADVERTENCIA_VENTANA_TEMPORAL]

  if (!UMBRALES_VERIFICADOS_CONTRA_NORMA) {
    advertencias.push(
      'Los umbrales usados están pendientes de verificación contra el texto oficial de la ' +
        'Resolución 2254 de 2017. Trate esta categoría como provisional.'
    )
  }

  if (indicePm25 === null || indicePm10 === null) {
    advertencias.push(
      `Solo se midió ${indicePm25 === null ? 'PM10' : 'PM2.5'}. La categoría se basa en un ` +
        'único contaminante.'
    )
  }

  return {
    valor,
    categoria: definicion.categoria,
    definicion,
    contaminanteDominante: dominante,
    advertencias,
  }
}

/**
 * Variables que el ICA NO cubre (FR-035b, FR-035c).
 *
 * Existe para que la interfaz pueda comprobarlo en lugar de confiar en que
 * nadie se equivoque: ninguna de estas puede mostrarse con color ni categoría
 * de calidad del aire.
 */
export const VARIABLES_SIN_CATEGORIA_OFICIAL = [
  'pm1',
  'hcho',
  'tvoc',
  'co2',
  'particulas_litro',
  'temperatura',
  'humedad_relativa',
] as const

export function tieneCategoriaOficial(variable: string): boolean {
  return variable === 'pm25' || variable === 'pm10'
}

export interface ExcedenciaNormativa {
  supera: boolean
  contaminante: 'pm25' | 'pm10'
  medido: number
  limite: number
  veces: number
}

/**
 * ¿La medición supera el límite legal diario? (Art. 2, Parágrafo 1)
 *
 * ── Por qué esto existe aparte del ICA ───────────────────────────────────
 *
 * Son dos cosas distintas y confundirlas desinforma. El ICA de PM10 en
 * Colombia reproduce la escala estadounidense y NO está calibrado contra la
 * norma colombiana:
 *
 *   PM10 = 75 µg/m³  → exactamente el límite legal → ICA 61 → «Aceptable»
 *   PM10 = 150 µg/m³ → el DOBLE del límite legal   → ICA 98 → «Aceptable»
 *
 * Es decir: un taller puede estar al doble de lo que permite la ley y la
 * categoría del ICA lo llamaría aceptable. Para un proyecto escolar que
 * enseña calidad del aire, mostrar solo el ICA sería enseñar algo falso.
 *
 * PM2.5 sí está calibrado: su límite legal (37 µg/m³) coincide con el tope
 * de «Aceptable», así que ahí ICA y norma van de la mano.
 *
 * La interfaz debe mostrar esta excedencia como una señal SEPARADA de la
 * categoría del ICA, nunca fundida con ella.
 */
export function superaLimiteNormativo(
  pm25: number | null | undefined,
  pm10: number | null | undefined
): ExcedenciaNormativa[] {
  const excedencias: ExcedenciaNormativa[] = []

  if (typeof pm25 === 'number' && !Number.isNaN(pm25) && pm25 > LIMITES_NORMATIVOS.pm25) {
    excedencias.push({
      supera: true,
      contaminante: 'pm25',
      medido: pm25,
      limite: LIMITES_NORMATIVOS.pm25,
      veces: Number((pm25 / LIMITES_NORMATIVOS.pm25).toFixed(2)),
    })
  }

  if (typeof pm10 === 'number' && !Number.isNaN(pm10) && pm10 > LIMITES_NORMATIVOS.pm10) {
    excedencias.push({
      supera: true,
      contaminante: 'pm10',
      medido: pm10,
      limite: LIMITES_NORMATIVOS.pm10,
      veces: Number((pm10 / LIMITES_NORMATIVOS.pm10).toFixed(2)),
    })
  }

  return excedencias
}
