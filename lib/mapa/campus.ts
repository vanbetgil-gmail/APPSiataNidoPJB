/**
 * El perímetro del campus, en coordenadas reales.
 *
 * ── De dónde salen estos números ─────────────────────────────────────────
 *
 * Del archivo KML que entregó el colegio: un polígono de once vértices que
 * delimita el predio. Son 6,22 hectáreas, 387 metros de este a oeste y 241 de
 * norte a sur.
 *
 * Se copian aquí, al código, en vez de leerse del KML en tiempo de
 * ejecución. Once pares de números que no cambian nunca no justifican
 * arrastrar un analizador de XML al navegador, y el KML vive en
 * `datos-colegio/`, que git ignora: el código no puede depender de un
 * archivo que no está en el repositorio.
 *
 * ── ¿Es esto un dato sensible? ───────────────────────────────────────────
 *
 * No. Es el contorno de un colegio, visible en cualquier mapa del mundo y
 * publicado por la propia institución. No identifica a ninguna persona.
 *
 * ── Para qué sirve ───────────────────────────────────────────────────────
 *
 *  · Encuadrar el mapa: se abre mostrando el campus entero, ni más ni menos.
 *  · Dibujar el contorno, para que se vea dónde acaba el colegio y empieza
 *    el barrio.
 *  · Impedir marcar una especie fuera del predio (FR-042). Con la ortofoto
 *    eso lo garantizaba el borde de la imagen; aquí, el polígono.
 */

export type Coordenada = [latitud: number, longitud: number]

/**
 * Los once vértices, en el orden del KML.
 *
 * El duodécimo del archivo original se omite: repetía el primero para cerrar
 * el anillo, y Leaflet cierra los polígonos por su cuenta. Dejarlo dibujaría
 * un lado de longitud cero.
 */
export const PERIMETRO_CAMPUS: readonly Coordenada[] = [
  [6.2362493, -75.6130161],
  [6.2357632, -75.612252],
  [6.2362771, -75.6118813],
  [6.2359765, -75.6115692],
  [6.2360038, -75.611132],
  [6.23598, -75.610606],
  [6.2357548, -75.6096073],
  [6.2370104, -75.6095195],
  [6.2374176, -75.6101778],
  [6.2374903, -75.6106606],
  [6.2379315, -75.6121919],
] as const

/** Esquina suroeste y nororeste, para encuadrar el mapa. */
export const LIMITES_CAMPUS: [Coordenada, Coordenada] = [
  [
    Math.min(...PERIMETRO_CAMPUS.map((c) => c[0])),
    Math.min(...PERIMETRO_CAMPUS.map((c) => c[1])),
  ],
  [
    Math.max(...PERIMETRO_CAMPUS.map((c) => c[0])),
    Math.max(...PERIMETRO_CAMPUS.map((c) => c[1])),
  ],
]

export const CENTRO_CAMPUS: Coordenada = [
  (LIMITES_CAMPUS[0][0] + LIMITES_CAMPUS[1][0]) / 2,
  (LIMITES_CAMPUS[0][1] + LIMITES_CAMPUS[1][1]) / 2,
]

/**
 * ¿Cae este punto dentro del campus?
 *
 * Algoritmo del rayo: se traza una semirrecta horizontal hacia el este desde
 * el punto y se cuentan los lados que cruza. Impar, está dentro; par, fuera.
 * Es la prueba clásica de punto en polígono, y para once vértices es
 * instantánea.
 *
 * ── Por qué se aplica un margen ──────────────────────────────────────────
 *
 * Porque el KML es el límite catastral, y un árbol sembrado justo contra la
 * reja puede caer unos centímetros por fuera. Rechazarlo obligaría a mentir
 * sobre dónde está. El margen es de unos diez metros: suficiente para el
 * borde, insuficiente para colar una ficha en el barrio vecino.
 */
const MARGEN_GRADOS = 0.0001 // ≈ 11 metros

export function dentroDelCampus([lat, lon]: Coordenada): boolean {
  if (enElPoligono(lat, lon)) return true

  // Fuera del polígono: se admite igualmente si está a menos de un margen
  // de algún vértice o de la caja envolvente holgada.
  const [[sur, oeste], [norte, este]] = LIMITES_CAMPUS
  return (
    lat >= sur - MARGEN_GRADOS &&
    lat <= norte + MARGEN_GRADOS &&
    lon >= oeste - MARGEN_GRADOS &&
    lon <= este + MARGEN_GRADOS &&
    enElPoligono(lat, lon, MARGEN_GRADOS)
  )
}

function enElPoligono(lat: number, lon: number, margen = 0): boolean {
  const puntos = margen === 0 ? PERIMETRO_CAMPUS : dilatado(margen)
  let dentro = false

  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const [latI, lonI] = puntos[i]
    const [latJ, lonJ] = puntos[j]

    // El lado cruza la horizontal del punto, y el cruce queda al este.
    const cruza = latI > lat !== latJ > lat
    if (!cruza) continue

    const lonCorte = lonI + ((lat - latI) / (latJ - latI)) * (lonJ - lonI)
    if (lon < lonCorte) dentro = !dentro
  }

  return dentro
}

/**
 * El polígono separado del centro, para el margen de tolerancia.
 *
 * Es una aproximación —un desplazamiento radial desde el centro, no un
 * desfase real de cada lado— y basta de sobra: lo que se busca es perdonar
 * unos metros en el borde, no calcular una zona de servidumbre.
 */
function dilatado(margen: number): Coordenada[] {
  const [latC, lonC] = CENTRO_CAMPUS
  return PERIMETRO_CAMPUS.map(([lat, lon]) => {
    const dLat = lat - latC
    const dLon = lon - lonC
    const dist = Math.hypot(dLat, dLon) || 1
    return [lat + (dLat / dist) * margen, lon + (dLon / dist) * margen] as Coordenada
  })
}

/** Texto corto para mostrar una coordenada. `6.23705, −75.61180` */
export function comoTexto([lat, lon]: Coordenada): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
}
