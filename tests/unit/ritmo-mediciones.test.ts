import { describe, expect, it } from 'vitest'
import {
  aISO,
  comoReloj,
  desdeISO,
  esDiaDeMedicion,
  fechaLegible,
  horaActual,
  nombreDelDia,
  proximaMedicionEn,
  segundosRestantes,
  ultimosDiasDeMedicion,
} from '@/lib/mediciones/ritmo'

/**
 * El ritmo de una jornada.
 *
 * ── Lo que de verdad se está probando ────────────────────────────────────
 *
 * El error que acecha aquí es el de la zona horaria. `new Date('2026-09-16')`
 * se interpreta en UTC, así que en Colombia cae el día 15 a las 19:00 y
 * `getDay()` devuelve martes para un miércoles.
 *
 * No da error, no avisa, y solo se nota cuando alguien compara con el
 * calendario. Estas pruebas lo fijan.
 */

describe('Días de medición', () => {
  it('reconoce el miércoles y el viernes', () => {
    // 2026-09-16 es miércoles; 2026-09-18, viernes.
    expect(esDiaDeMedicion('2026-09-16')).toBe(true)
    expect(esDiaDeMedicion('2026-09-18')).toBe(true)
  })

  it('rechaza los demás días', () => {
    for (const iso of ['2026-09-14', '2026-09-15', '2026-09-17', '2026-09-19', '2026-09-20']) {
      expect(esDiaDeMedicion(iso), `${iso} no debería ser día de medición`).toBe(false)
    }
  })

  it('no se corre un día por la zona horaria', () => {
    // La prueba que justifica todo el módulo. Con `new Date(iso)` esto
    // devolvería «martes» al oeste de Greenwich.
    expect(nombreDelDia('2026-09-16')).toBe('miércoles')
    expect(nombreDelDia('2026-09-18')).toBe('viernes')
  })

  it('aISO y desdeISO son inversas', () => {
    for (const iso of ['2026-01-01', '2026-09-16', '2026-12-31', '2024-02-29']) {
      expect(aISO(desdeISO(iso))).toBe(iso)
    }
  })

  it('la fecha legible nombra el día correcto', () => {
    expect(fechaLegible('2026-09-16')).toMatch(/^miércoles/)
  })
})

describe('Los últimos días de medición', () => {
  it('incluye hoy cuando hoy toca', () => {
    // Miércoles 16 de septiembre de 2026.
    const dias = ultimosDiasDeMedicion(new Date(2026, 8, 16), 4)
    expect(dias[0]).toBe('2026-09-16')
  })

  it('no incluye hoy cuando hoy no toca', () => {
    // Jueves 17.
    const dias = ultimosDiasDeMedicion(new Date(2026, 8, 17), 4)
    expect(dias).not.toContain('2026-09-17')
    expect(dias[0]).toBe('2026-09-16')
  })

  it('devuelve solo miércoles y viernes, del más reciente al más antiguo', () => {
    const dias = ultimosDiasDeMedicion(new Date(2026, 8, 18), 6)

    expect(dias).toHaveLength(6)
    for (const iso of dias) expect(esDiaDeMedicion(iso)).toBe(true)

    const orden = [...dias].sort().reverse()
    expect(dias).toEqual(orden)
  })

  it('cruza el cambio de mes sin saltarse nada', () => {
    // Viernes 2 de octubre de 2026: los anteriores caen en septiembre.
    const dias = ultimosDiasDeMedicion(new Date(2026, 9, 2), 3)
    expect(dias).toEqual(['2026-10-02', '2026-09-30', '2026-09-25'])
  })
})

describe('El intervalo de diez minutos', () => {
  it('cuenta desde la hora declarada, no desde el momento de escribirla', () => {
    /*
     * Si alguien toma la lectura a las 10:00 y la teclea a las 10:04, la
     * siguiente toca a las 10:10. Lo que se espacia son las mediciones.
     */
    const proxima = proximaMedicionEn('2026-09-16', '10:00:00')
    expect(proxima.getHours()).toBe(10)
    expect(proxima.getMinutes()).toBe(10)
  })

  it('pasa bien de una hora a la siguiente', () => {
    const proxima = proximaMedicionEn('2026-09-16', '10:55:00')
    expect(proxima.getHours()).toBe(11)
    expect(proxima.getMinutes()).toBe(5)
  })

  it('admite horas sin segundos', () => {
    // PostgreSQL devuelve `time` a veces como «10:00:00» y a veces como
    // «10:00». Las dos formas tienen que funcionar.
    expect(proximaMedicionEn('2026-09-16', '10:00').getMinutes()).toBe(10)
  })
})

describe('La cuenta atrás', () => {
  it('nunca baja de cero', () => {
    const objetivo = new Date(2026, 8, 16, 10, 10, 0)
    const muyDespues = new Date(2026, 8, 16, 11, 0, 0)
    expect(segundosRestantes(objetivo, muyDespues)).toBe(0)
  })

  it('cuenta los segundos que faltan', () => {
    const objetivo = new Date(2026, 8, 16, 10, 10, 0)
    const ahora = new Date(2026, 8, 16, 10, 8, 30)
    expect(segundosRestantes(objetivo, ahora)).toBe(90)
  })

  it('se muestra como un reloj', () => {
    expect(comoReloj(600)).toBe('10:00')
    expect(comoReloj(90)).toBe('01:30')
    expect(comoReloj(5)).toBe('00:05')
    expect(comoReloj(0)).toBe('00:00')
  })
})

describe('La hora actual', () => {
  it('sale con dos cifras en cada posición', () => {
    // PostgreSQL rechaza «9:5:0»; necesita «09:05:00».
    expect(horaActual(new Date(2026, 8, 16, 9, 5, 0))).toBe('09:05:00')
    expect(horaActual(new Date(2026, 8, 16, 14, 30, 45))).toBe('14:30:45')
  })
})
