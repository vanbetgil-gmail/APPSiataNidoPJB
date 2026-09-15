/**
 * El ritmo de una jornada de medición.
 *
 * ── De dónde salen estos números ─────────────────────────────────────────
 *
 * El equipo mide **los miércoles y los viernes**, tomando una lectura cada
 * **diez minutos** hasta completar **ocho** en el mismo punto. No es una
 * convención de esta aplicación: es como trabajan, y el histórico de
 * `MEDIDORES.xlsx` lo confirma jornada tras jornada.
 *
 * ── Por qué las fechas se construyen por partes ──────────────────────────
 *
 * `new Date('2026-09-16')` NO es el 16 de septiembre. La norma dice que una
 * fecha sin hora se interpreta en UTC, así que en Colombia —cinco horas por
 * detrás— ese valor es el 15 a las 19:00. `getDay()` devuelve entonces el día
 * anterior, y un miércoles pasa por martes.
 *
 * Es el error clásico y no da ninguna señal: todo funciona hasta que alguien
 * mira el calendario. Aquí las fechas se arman con `new Date(a, m - 1, d)`,
 * que es hora local, y se serializan a mano.
 */

/** Domingo = 0. Miércoles y viernes. */
export const DIAS_DE_MEDICION = [3, 5] as const

export const MINUTOS_ENTRE_MEDICIONES = 10

/** Ocho lecturas por punto: es lo que cabe en una clase. */
export const MAXIMO_MEDICIONES = 8

const NOMBRES_DIA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const

/** `2026-09-16` a partir de una fecha, en hora LOCAL. */
export function aISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/** Lo contrario de `aISO`: medianoche LOCAL de ese día. */
export function desdeISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function esDiaDeMedicion(iso: string): boolean {
  return (DIAS_DE_MEDICION as readonly number[]).includes(desdeISO(iso).getDay())
}

export function nombreDelDia(iso: string): string {
  return NOMBRES_DIA[desdeISO(iso).getDay()]
}

/**
 * Los últimos días de medición, del más reciente al más antiguo.
 *
 * Incluye hoy si hoy toca. Sirve para el desplegable de fecha: en la práctica
 * se registra el mismo día o, como mucho, se pasa a limpio la jornada
 * anterior.
 */
export function ultimosDiasDeMedicion(hoy: Date, cuantos = 6): string[] {
  const dias: string[] = []
  const cursor = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  // 40 días hacia atrás alcanzan de sobra para reunir seis miércoles y
  // viernes; el tope evita un bucle infinito si alguien toca DIAS_DE_MEDICION.
  for (let i = 0; i < 40 && dias.length < cuantos; i++) {
    const iso = aISO(cursor)
    if (esDiaDeMedicion(iso)) dias.push(iso)
    cursor.setDate(cursor.getDate() - 1)
  }

  return dias
}

/** Texto para mostrar: `miércoles 16 de septiembre`. */
export function fechaLegible(iso: string): string {
  return desdeISO(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Cuándo toca la siguiente lectura.
 *
 * Se calcula desde la HORA DECLARADA de la última medición, no desde el
 * momento en que se guardó. La diferencia importa: si alguien toma la lectura
 * a las 10:00 y la escribe a las 10:04, el reloj debe marcar las 10:10, no
 * las 10:14. Lo que se espacia diez minutos son las mediciones, no el tecleo.
 */
export function proximaMedicionEn(fechaISO: string, horaUltima: string): Date {
  const [h, m, s] = horaUltima.split(':').map(Number)
  const base = desdeISO(fechaISO)
  base.setHours(h, m, s || 0, 0)
  return new Date(base.getTime() + MINUTOS_ENTRE_MEDICIONES * 60_000)
}

/** Segundos que faltan. Nunca negativo: cero significa «ya toca». */
export function segundosRestantes(objetivo: Date, ahora: Date): number {
  return Math.max(0, Math.ceil((objetivo.getTime() - ahora.getTime()) / 1000))
}

/** `07:30` a partir de segundos. Para el cronómetro. */
export function comoReloj(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** `14:05:00` — la hora actual, en el formato que espera PostgreSQL. */
export function horaActual(ahora: Date): string {
  return [ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}
