import { describe, expect, it } from 'vitest'
import {
  calcularICA,
  superaLimiteNormativo,
  tieneCategoriaOficial,
  VARIABLES_SIN_CATEGORIA_OFICIAL,
} from '@/lib/ica/calcular'
import { CATEGORIAS, UMBRALES_VERIFICADOS_CONTRA_NORMA } from '@/lib/ica/umbrales'

/**
 * Pruebas del cálculo del ICA (adelanto de T089).
 *
 * Se escriben ya, aunque la tarea pertenezca a una fase posterior, porque
 * `calcularICA` es la pieza más delicada del proyecto: decide si la
 * aplicación le dice a un estudiante que el aire de su taller está bien o mal.
 *
 * Cubren dos cosas: el COMPORTAMIENTO de la función (qué hace ante datos
 * ausentes, negativos o extremos) y la EXACTITUD de los umbrales contra la
 * Tabla 6 de la Resolución 2254 de 2017, verificada en T126.
 */

describe('calcularICA — reglas de seguridad', () => {
  it('sin PM2.5 ni PM10 devuelve categoría nula, NUNCA «buena»', () => {
    const resultado = calcularICA(null, null)
    expect(resultado.categoria).toBeNull()
    expect(resultado.valor).toBeNull()
    // La regla que más importa de todo el archivo: dar por limpio un aire que
    // nadie midió sería el peor error posible en esta aplicación.
    expect(resultado.categoria).not.toBe('buena')
  })

  it('distingue «no medido» (null) de «medido en cero» (0)', () => {
    const noMedido = calcularICA(null, null)
    const medidoEnCero = calcularICA(0, 0)

    expect(noMedido.categoria).toBeNull()
    expect(medidoEnCero.categoria).toBe('buena')
    expect(medidoEnCero.valor).toBe(0)
  })

  it('avisa cuando solo se midió uno de los dos contaminantes, nombrando cuál', () => {
    const soloPm25 = calcularICA(10, null)
    expect(soloPm25.categoria).not.toBeNull()
    expect(soloPm25.advertencias.some((a) => a.includes('Solo se midió PM2.5'))).toBe(true)

    const soloPm10 = calcularICA(null, 20)
    expect(soloPm10.categoria).not.toBeNull()
    expect(soloPm10.advertencias.some((a) => a.includes('Solo se midió PM10'))).toBe(true)
  })

  it('acompaña siempre la categoría con la advertencia de ventana temporal', () => {
    const resultado = calcularICA(10, 20)
    expect(resultado.advertencias.some((a) => a.includes('24 horas'))).toBe(true)
  })

  it('avisa de que los umbrales están sin verificar mientras lo estén', () => {
    const resultado = calcularICA(10, 20)
    const avisaProvisional = resultado.advertencias.some((a) => a.includes('provisional'))
    // La bandera está en true desde T126. Si alguien cambia los cortes sin
    // volver a verificarlos y la pone en false, esta prueba lo detecta.
    expect(avisaProvisional).toBe(!UMBRALES_VERIFICADOS_CONTRA_NORMA)
  })
})

describe('calcularICA — comportamiento del índice', () => {
  it('toma el peor de los dos contaminantes, no un promedio', () => {
    // PM2.5 muy bajo, PM10 muy alto: debe mandar el PM10.
    const resultado = calcularICA(1, 300)
    expect(resultado.contaminanteDominante).toBe('pm10')
    expect(resultado.valor).toBeGreaterThan(150)
  })

  it('un valor bajo de ambos da categoría buena', () => {
    const resultado = calcularICA(5, 20)
    expect(resultado.categoria).toBe('buena')
    expect(resultado.valor).toBeLessThanOrEqual(50)
  })

  it('tope la escala en 500 ante concentraciones extremas', () => {
    const resultado = calcularICA(9999, 9999)
    expect(resultado.valor).toBe(500)
    expect(resultado.categoria).toBe('peligrosa')
  })

  it('rechaza valores negativos como no medidos', () => {
    const resultado = calcularICA(-5, -5)
    expect(resultado.categoria).toBeNull()
  })

  it('asigna un color de la paleta del logo a cada categoría', () => {
    for (const categoria of CATEGORIAS) {
      expect(categoria.color).toMatch(/^var\(--color-ica-/)
    }
  })

  it('cubre las seis categorías sin huecos ni solapamientos', () => {
    for (let i = 1; i < CATEGORIAS.length; i++) {
      expect(CATEGORIAS[i].indiceMin).toBe(CATEGORIAS[i - 1].indiceMax + 1)
    }
    expect(CATEGORIAS).toHaveLength(6)
  })
})

describe('Alcance del ICA — FR-035b', () => {
  it('solo PM2.5 y PM10 tienen categoría oficial', () => {
    expect(tieneCategoriaOficial('pm25')).toBe(true)
    expect(tieneCategoriaOficial('pm10')).toBe(true)
  })

  it('ninguna otra variable del medidor puede llevar categoría', () => {
    // CO₂, formaldehído, TVOC, temperatura y humedad NO están en la norma.
    // Inventarles una categoría de calidad del aire sería desinformar.
    for (const variable of VARIABLES_SIN_CATEGORIA_OFICIAL) {
      expect(tieneCategoriaOficial(variable)).toBe(false)
    }
  })
})

describe('Valores verificados contra la Resolución 2254 de 2017 (Tabla 6)', () => {
  // Casos calculados a mano con la fórmula del Art. 21 sobre la Tabla 6.
  it.each([
    // [pm25, pm10, categoria esperada, motivo]
    [12, null, 'buena', 'tope exacto de Buena en PM2.5'],
    [13, null, 'aceptable', 'inicio exacto de Aceptable en PM2.5'],
    [37, null, 'aceptable', 'tope de Aceptable = límite legal diario'],
    [38, null, 'daniña_sensibles', 'inicio de Dañina a grupos sensibles'],
    [55, null, 'daniña_sensibles', 'tope de grupos sensibles'],
    [56, null, 'daniña', 'inicio de Dañina a la salud'],
    [251, null, 'peligrosa', 'inicio de Peligrosa en PM2.5'],
    [null, 54, 'buena', 'tope exacto de Buena en PM10'],
    [null, 55, 'aceptable', 'inicio exacto de Aceptable en PM10'],
    [null, 425, 'peligrosa', 'inicio de Peligrosa en PM10'],
  ] as [number | null, number | null, string, string][])(
    'pm25=%s pm10=%s → %s (%s)',
    (pm25, pm10, esperada) => {
      expect(calcularICA(pm25, pm10).categoria).toBe(esperada)
    }
  )

  it('PM2.5 = 37 da exactamente ICA 100, el tope de Aceptable', () => {
    expect(calcularICA(37, null).valor).toBe(100)
  })

  it('trunca los decimales al entero inferior, según REGLA_REDONDEO', () => {
    // 12,9 cae en el hueco de la tabla entre 12 y 13. Se trunca a 12.
    expect(calcularICA(12.9, null).categoria).toBe('buena')
    expect(calcularICA(13.0, null).categoria).toBe('aceptable')
  })

  it('ya no advierte de umbrales provisionales, porque están verificados', () => {
    const r = calcularICA(20, 60)
    expect(r.advertencias.some((a) => a.includes('provisional'))).toBe(false)
  })
})

describe('Excedencia de la norma, separada del ICA', () => {
  it('EL CASO QUE IMPORTA: PM10 al doble del límite legal sigue siendo «Aceptable» en el ICA', () => {
    const r = calcularICA(null, 150)
    // El ICA lo llama aceptable...
    expect(r.categoria).toBe('aceptable')
    // ...pero son el doble de lo que permite la ley. Por eso se informa aparte.
    const exc = superaLimiteNormativo(null, 150)
    expect(exc).toHaveLength(1)
    expect(exc[0].contaminante).toBe('pm10')
    expect(exc[0].veces).toBe(2)
  })

  it('PM10 justo en el límite legal no se reporta como excedencia', () => {
    expect(superaLimiteNormativo(null, 75)).toHaveLength(0)
  })

  it('en PM2.5 el ICA y la norma sí van de la mano', () => {
    expect(superaLimiteNormativo(37, null)).toHaveLength(0)
    expect(calcularICA(37, null).valor).toBe(100)
    expect(superaLimiteNormativo(38, null)).toHaveLength(1)
  })

  it('no reporta excedencia cuando no hay dato', () => {
    expect(superaLimiteNormativo(null, null)).toHaveLength(0)
  })
})
