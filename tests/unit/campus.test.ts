import { describe, expect, it } from 'vitest'
import {
  CENTRO_CAMPUS,
  LIMITES_CAMPUS,
  PERIMETRO_CAMPUS,
  dentroDelCampus,
} from '@/lib/mapa/campus'

/**
 * El perímetro del campus.
 *
 * ── Qué se está protegiendo aquí ─────────────────────────────────────────
 *
 * La prueba de punto en polígono es el único guardián que impide marcar una
 * especie en la calle de al lado. Si se equivoca, no da error: acepta el
 * punto y lo dibuja fuera del colegio, donde nadie lo va a buscar.
 *
 * Los dos fallos clásicos —invertir latitud y longitud, o perder el signo de
 * la longitud— producen coordenadas que PostgreSQL acepta sin rechistar.
 */

describe('El polígono del campus', () => {
  it('tiene los once vértices del KML, sin repetir el de cierre', () => {
    expect(PERIMETRO_CAMPUS).toHaveLength(11)
    expect(PERIMETRO_CAMPUS[0]).not.toEqual(PERIMETRO_CAMPUS[PERIMETRO_CAMPUS.length - 1])
  })

  it('está donde tiene que estar: Medellín', () => {
    for (const [lat, lon] of PERIMETRO_CAMPUS) {
      expect(lat).toBeGreaterThan(6.2)
      expect(lat).toBeLessThan(6.3)
      expect(lon).toBeLessThan(-75.5)
      expect(lon).toBeGreaterThan(-75.7)
    }
  })

  it('los límites envuelven a todos los vértices', () => {
    const [[sur, oeste], [norte, este]] = LIMITES_CAMPUS
    for (const [lat, lon] of PERIMETRO_CAMPUS) {
      expect(lat).toBeGreaterThanOrEqual(sur)
      expect(lat).toBeLessThanOrEqual(norte)
      expect(lon).toBeGreaterThanOrEqual(oeste)
      expect(lon).toBeLessThanOrEqual(este)
    }
  })

  it('mide unos 387 por 241 metros', () => {
    const [[sur, oeste], [norte, este]] = LIMITES_CAMPUS
    const metrosPorGradoLat = 110_574
    const metrosPorGradoLon = 110_661 // corregido por el coseno de la latitud

    expect((este - oeste) * metrosPorGradoLon).toBeCloseTo(387, -1)
    expect((norte - sur) * metrosPorGradoLat).toBeCloseTo(241, -1)
  })
})

describe('Dentro y fuera del campus', () => {
  it('el centro está dentro', () => {
    expect(dentroDelCampus(CENTRO_CAMPUS)).toBe(true)
  })

  it('los bloques y la cancha están dentro', () => {
    // Puntos leídos sobre la imagen satelital: los edificios y la cancha
    // de la Fraternidad, que es donde está la primera ficha publicada.
    expect(dentroDelCampus([6.23705, -75.6118])).toBe(true)
    expect(dentroDelCampus([6.2364, -75.6124])).toBe(true)
  })

  it('el barrio de al lado está fuera', () => {
    // Al sur, pasada la piscina: casas.
    expect(dentroDelCampus([6.2345, -75.6125])).toBe(false)
    // Al noreste, el conjunto residencial.
    expect(dentroDelCampus([6.2385, -75.6098])).toBe(false)
  })

  it('rechaza la latitud y la longitud intercambiadas', () => {
    // El error clásico. Da un punto en medio del océano Índico.
    expect(dentroDelCampus([-75.611268, 6.236843])).toBe(false)
  })

  it('rechaza la longitud sin signo', () => {
    // El otro error clásico: China occidental en vez de Colombia.
    expect(dentroDelCampus([6.236843, 75.611268])).toBe(false)
  })

  it('perdona unos metros justo en el borde', () => {
    /*
     * Un árbol sembrado contra la reja puede caer por fuera del límite
     * catastral. Rechazarlo obligaría a mentir sobre dónde está.
     *
     * El vértice noroeste, empujado un poco hacia afuera, sigue valiendo.
     */
    const [lat, lon] = PERIMETRO_CAMPUS[10]
    expect(dentroDelCampus([lat + 0.00005, lon - 0.00005])).toBe(true)
  })

  it('no perdona cien metros', () => {
    const [lat, lon] = PERIMETRO_CAMPUS[10]
    expect(dentroDelCampus([lat + 0.001, lon - 0.001])).toBe(false)
  })
})
