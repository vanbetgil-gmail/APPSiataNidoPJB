import { describe, expect, it } from 'vitest'
import {
  estaDentroDeLaImagen,
  LADO_PLANO,
  ladoDelLienzo,
  leafletARelativa,
  limitesDeLaImagen,
  ocupacionDelLienzo,
  relativaALeaflet,
} from '@/lib/mapa/coordenadas'

/**
 * Pruebas de conversión de coordenadas del mapa.
 *
 * ── Por qué existen ──────────────────────────────────────────────────────
 *
 * El teselado rellena la ortofoto hasta un lienzo CUADRADO. Una foto de
 * 4096×3072 ocupa solo el 75 % de la altura del lienzo. Si la conversión
 * ignora ese relleno, todos los puntos del mapa quedan desplazados hacia
 * arriba, y nada falla de forma visible: el mapa se ve bien, pero los árboles
 * están donde no son.
 *
 * Es exactamente el tipo de error que nadie detecta hasta que alguien compara
 * el mapa con el colegio de verdad. De ahí estas pruebas.
 */

// Caso real: ortofoto apaisada. El lienzo será 4096×4096.
const APAISADA = { ancho_px: 4096, alto_px: 3072 }
// Caso cuadrado: no hay relleno, la ocupación es 1 en ambos ejes.
const CUADRADA = { ancho_px: 2048, alto_px: 2048 }
// Caso vertical, por si algún vuelo sale así.
const VERTICAL = { ancho_px: 2000, alto_px: 4000 }

describe('Lienzo de teselas', () => {
  it('redondea el lado al siguiente múltiplo de 256 por potencia de dos', () => {
    expect(ladoDelLienzo(APAISADA)).toBe(4096)
    expect(ladoDelLienzo(CUADRADA)).toBe(2048)
    expect(ladoDelLienzo(VERTICAL)).toBe(4096)
  })

  it('una foto cuadrada ocupa el lienzo entero', () => {
    const { fx, fy } = ocupacionDelLienzo(CUADRADA)
    expect(fx).toBe(1)
    expect(fy).toBe(1)
  })

  it('una foto apaisada deja franja vacía abajo', () => {
    const { fx, fy } = ocupacionDelLienzo(APAISADA)
    expect(fx).toBe(1)
    expect(fy).toBe(0.75) // 3072 / 4096
  })

  it('una foto vertical deja franja vacía a la derecha', () => {
    const { fx, fy } = ocupacionDelLienzo(VERTICAL)
    expect(fx).toBeCloseTo(0.48828125) // 2000 / 4096
    expect(fy).toBeCloseTo(0.9765625) // 4000 / 4096
  })
})

describe('Conversión de coordenadas', () => {
  it('la esquina superior izquierda de la foto es el origen', () => {
    expect(relativaALeaflet({ x: 0, y: 0 }, APAISADA)).toEqual([-0, 0])
  })

  it('EL CASO QUE IMPORTA: el borde inferior de una foto apaisada NO llega al borde del lienzo', () => {
    const [lat] = relativaALeaflet({ x: 0.5, y: 1 }, APAISADA)
    // Con el relleno descontado: -0.75 × 256 = -192
    expect(lat).toBe(-192)
    // Sin descontarlo habría dado -256, desplazando el punto 64 unidades:
    // un cuarto de la altura del mapa.
    expect(lat).not.toBe(-LADO_PLANO)
  })

  it('en una foto cuadrada el borde inferior sí llega al borde del lienzo', () => {
    const [lat] = relativaALeaflet({ x: 0, y: 1 }, CUADRADA)
    expect(lat).toBe(-LADO_PLANO)
  })

  it('ida y vuelta devuelve el punto original', () => {
    for (const imagen of [APAISADA, CUADRADA, VERTICAL]) {
      for (const punto of [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 0.5, y: 0.5 },
        { x: 0.13, y: 0.87 },
      ]) {
        const vuelta = leafletARelativa(relativaALeaflet(punto, imagen), imagen)
        expect(vuelta.x).toBeCloseTo(punto.x, 10)
        expect(vuelta.y).toBeCloseTo(punto.y, 10)
      }
    }
  })

  it('recorta al rango 0–1 lo que caiga fuera de la foto', () => {
    const fuera = leafletARelativa([-1000, 1000], APAISADA)
    expect(fuera.x).toBe(1)
    expect(fuera.y).toBe(1)
  })
})

describe('Límites del mapa — FR-042', () => {
  it('encuadra la FOTO, no el lienzo con su franja vacía', () => {
    const [[latMin, lngMin], [latMax, lngMax]] = limitesDeLaImagen(APAISADA)
    expect(latMin).toBe(-192) // el borde de la foto, no -256
    expect(lngMin).toBe(0)
    expect(latMax).toBe(0)
    expect(lngMax).toBe(256)
  })

  it('acepta puntos dentro de la foto y rechaza los de fuera', () => {
    expect(estaDentroDeLaImagen({ x: 0.5, y: 0.5 })).toBe(true)
    expect(estaDentroDeLaImagen({ x: 0, y: 0 })).toBe(true)
    expect(estaDentroDeLaImagen({ x: 1, y: 1 })).toBe(true)
    expect(estaDentroDeLaImagen({ x: 1.01, y: 0.5 })).toBe(false)
    expect(estaDentroDeLaImagen({ x: 0.5, y: -0.01 })).toBe(false)
  })
})
