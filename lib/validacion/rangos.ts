/**
 * Rangos físicamente plausibles por variable (FR-024).
 *
 * IMPORTANTE — no son restricciones rígidas. FR-024 exige ADVERTIR sin
 * IMPEDIR: si un taller de soldadura llega de verdad a 900 µg/m³ de PM10, ese
 * dato es real y valioso, y la aplicación no puede negarse a guardarlo.
 *
 * Por eso estos rangos viven aquí y no como CHECK en la base de datos
 * (data-model.md). Lo que hacen es provocar una confirmación explícita, no un
 * rechazo.
 */

export interface RangoVariable {
  clave: string
  etiqueta: string
  unidad: string
  /** Por debajo de esto, casi seguro es un error de digitación */
  minPlausible: number
  /** Por encima de esto, se pide confirmación explícita */
  maxPlausible: number
  /** Valores imposibles: se rechazan sin más */
  minAbsoluto: number
  maxAbsoluto: number
  decimales: number
}

export const RANGOS: readonly RangoVariable[] = [
  {
    clave: 'pm1',
    etiqueta: 'PM1',
    unidad: 'µg/m³',
    minPlausible: 0,
    maxPlausible: 500,
    minAbsoluto: 0,
    maxAbsoluto: 10_000,
    decimales: 1,
  },
  {
    clave: 'pm25',
    etiqueta: 'PM2.5',
    unidad: 'µg/m³',
    minPlausible: 0,
    maxPlausible: 500,
    minAbsoluto: 0,
    maxAbsoluto: 10_000,
    decimales: 1,
  },
  {
    clave: 'pm10',
    etiqueta: 'PM10',
    unidad: 'µg/m³',
    minPlausible: 0,
    maxPlausible: 600,
    minAbsoluto: 0,
    maxAbsoluto: 10_000,
    decimales: 1,
  },
  {
    clave: 'hcho',
    etiqueta: 'Formaldehído (HCHO)',
    unidad: 'µg/m³',
    minPlausible: 0,
    maxPlausible: 5,
    minAbsoluto: 0,
    maxAbsoluto: 100,
    decimales: 3,
  },
  {
    clave: 'tvoc',
    etiqueta: 'TVOC',
    unidad: 'µg/m³',
    minPlausible: 0,
    maxPlausible: 10,
    minAbsoluto: 0,
    maxAbsoluto: 100,
    decimales: 3,
  },
  {
    clave: 'humedad_relativa',
    etiqueta: 'Humedad relativa',
    unidad: '%',
    minPlausible: 10,
    maxPlausible: 100,
    // La humedad relativa no puede salirse de 0–100 por definición física.
    minAbsoluto: 0,
    maxAbsoluto: 100,
    decimales: 1,
  },
  {
    clave: 'temperatura',
    etiqueta: 'Temperatura',
    unidad: '°C',
    // Medellín en un taller: rara vez fuera de 10–45 °C.
    minPlausible: 10,
    maxPlausible: 45,
    minAbsoluto: -20,
    maxAbsoluto: 80,
    decimales: 1,
  },
  {
    clave: 'particulas_litro',
    etiqueta: 'Partículas por litro',
    unidad: 'per/L',
    minPlausible: 0,
    maxPlausible: 50_000,
    minAbsoluto: 0,
    maxAbsoluto: 1_000_000,
    decimales: 0,
  },
  {
    clave: 'co2',
    etiqueta: 'CO₂',
    unidad: 'ppm',
    // El aire exterior ronda 420 ppm; por debajo de 300 el sensor falla.
    minPlausible: 300,
    maxPlausible: 5_000,
    minAbsoluto: 0,
    maxAbsoluto: 40_000,
    decimales: 0,
  },
  {
    clave: 'aqi_medidor',
    etiqueta: 'AQI del medidor',
    unidad: '',
    minPlausible: 0,
    maxPlausible: 500,
    minAbsoluto: 0,
    maxAbsoluto: 999,
    decimales: 0,
  },
] as const

export type ResultadoValidacion =
  | { estado: 'ok' }
  | { estado: 'no_medido' }
  | { estado: 'advertencia'; mensaje: string }
  | { estado: 'rechazado'; mensaje: string }

export function rangoDe(clave: string): RangoVariable | undefined {
  return RANGOS.find((r) => r.clave === clave)
}

/**
 * Valida un valor ya convertido a número.
 *
 * - `null` es válido: significa NO MEDIDO (FR-025).
 * - Fuera del rango plausible → advertencia que exige confirmación (FR-024).
 * - Fuera del rango absoluto → rechazo: es físicamente imposible.
 */
export function validarValor(clave: string, valor: number | null): ResultadoValidacion {
  if (valor === null) return { estado: 'no_medido' }

  const rango = rangoDe(clave)
  if (!rango) return { estado: 'ok' }

  if (Number.isNaN(valor)) {
    return { estado: 'rechazado', mensaje: `${rango.etiqueta}: el valor no es un número.` }
  }

  if (valor < rango.minAbsoluto || valor > rango.maxAbsoluto) {
    return {
      estado: 'rechazado',
      mensaje:
        `${rango.etiqueta}: ${valor} ${rango.unidad} es imposible. ` +
        `El rango admitido es ${rango.minAbsoluto}–${rango.maxAbsoluto} ${rango.unidad}.`,
    }
  }

  if (valor < rango.minPlausible || valor > rango.maxPlausible) {
    return {
      estado: 'advertencia',
      mensaje:
        `${valor} ${rango.unidad} está fuera de lo habitual para ${rango.etiqueta} ` +
        `(entre ${rango.minPlausible} y ${rango.maxPlausible}). ` +
        '¿Es correcto? Puede guardarlo si lo confirma.',
    }
  }

  return { estado: 'ok' }
}
