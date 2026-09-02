import type { ImagenBaseMapa } from '@/lib/supabase/tipos'

/**
 * Conversión entre coordenadas relativas y el plano de Leaflet.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 *
 * El mapa de NIDO PJB no es geográfico: es una ortofoto de dron sobre la que
 * se marcan puntos a mano (FR-006, FR-006a). Las posiciones se guardan como
 * FRACCIONES del ancho y el alto de la imagen (0–1), no como píxeles.
 *
 * Esto no es un capricho. Cuando el colegio vuelva a volar el dron y genere
 * una ortofoto de distinta resolución, los puntos guardados en fracciones
 * seguirán cayendo sobre el mismo árbol. Guardados en píxeles absolutos,
 * quedarían todos desplazados y habría que recolocarlos uno a uno (FR-006c).
 *
 * Leaflet con CRS.Simple trabaja en píxeles de imagen y con el eje Y hacia
 * arriba, al revés que una imagen. Aquí se hace esa traducción, en un solo
 * sitio, para que ningún componente tenga que acordarse de invertir la Y.
 */

/** Punto en el sistema de almacenamiento: fracciones 0–1 sobre la imagen. */
export interface CoordenadaRelativa {
  x: number
  y: number
}

/** Punto en el sistema de Leaflet con CRS.Simple: [lat, lng] = [y, x]. */
export type PuntoLeaflet = [number, number]

/**
 * Dimensiones del plano que ve Leaflet.
 *
 * Con CRS.Simple, el nivel de acercamiento 0 es una sola tesela de 256 px.
 * Se trabaja sobre ese plano normalizado y no sobre los píxeles originales:
 * así el cálculo no depende de la resolución de la ortofoto.
 */
export const LADO_PLANO = 256

/** Lado de una tesela, en píxeles. */
export const LADO_TESELA = 256

export function limitar(valor: number, minimo = 0, maximo = 1): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

/**
 * Lado del lienzo cuadrado sobre el que se cortó la pirámide de teselas.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * El teselado (tanto `gdal2tiles --profile=raster` como
 * `scripts/generar-teselas.py`) exige un lienzo CUADRADO cuyo lado sea una
 * potencia de dos por 256. Una ortofoto de 4096×3072 se rellena hasta
 * 4096×4096, quedando la foto pegada arriba a la izquierda y el resto vacío.
 *
 * Ignorar ese relleno desplaza TODOS los puntos en vertical, porque la foto no
 * ocupa el plano entero: en el ejemplo solo ocupa el 75 % de la altura.
 *
 * Es un error silencioso y difícil de ver hasta que alguien compara el mapa
 * con la realidad, así que la conversión lo tiene en cuenta siempre.
 */
export function ladoDelLienzo(imagen: Pick<ImagenBaseMapa, 'ancho_px' | 'alto_px'>): number {
  const zoomMaximo = Math.ceil(Math.log2(Math.max(imagen.ancho_px, imagen.alto_px) / LADO_TESELA))
  return LADO_TESELA * 2 ** Math.max(0, zoomMaximo)
}

/**
 * Qué fracción del lienzo cuadrado ocupa realmente la foto, en cada eje.
 * Vale 1 en el eje más largo y menos de 1 en el otro.
 */
export function ocupacionDelLienzo(
  imagen: Pick<ImagenBaseMapa, 'ancho_px' | 'alto_px'>
): { fx: number; fy: number } {
  const lado = ladoDelLienzo(imagen)
  return { fx: imagen.ancho_px / lado, fy: imagen.alto_px / lado }
}

/**
 * ¿La coordenada cae dentro de la imagen?
 *
 * Implementa FR-042 en el cliente: no se puede marcar un punto fuera del
 * predio representado. La base de datos lo repite con un CHECK, porque una
 * validación de interfaz sola nunca es suficiente.
 */
export function estaDentroDeLaImagen(punto: CoordenadaRelativa): boolean {
  return punto.x >= 0 && punto.x <= 1 && punto.y >= 0 && punto.y <= 1
}

/**
 * De almacenamiento a Leaflet.
 *
 * `punto` es una fracción 0–1 de la FOTO; el plano de Leaflet es el LIENZO
 * cuadrado, más alto o más ancho que la foto. De ahí el factor de ocupación.
 */
export function relativaALeaflet(
  punto: CoordenadaRelativa,
  imagen: Pick<ImagenBaseMapa, 'ancho_px' | 'alto_px'>
): PuntoLeaflet {
  const { fx, fy } = ocupacionDelLienzo(imagen)
  const x = punto.x * fx * LADO_PLANO
  // Leaflet cuenta la Y hacia arriba; una imagen, hacia abajo. De ahí el signo.
  const y = -(punto.y * fy * LADO_PLANO)
  return [y, x]
}

/** De Leaflet a almacenamiento. */
export function leafletARelativa(
  [y, x]: PuntoLeaflet,
  imagen: Pick<ImagenBaseMapa, 'ancho_px' | 'alto_px'>
): CoordenadaRelativa {
  const { fx, fy } = ocupacionDelLienzo(imagen)
  return {
    x: limitar(x / (fx * LADO_PLANO)),
    y: limitar(-y / (fy * LADO_PLANO)),
  }
}

/**
 * Límites de la FOTO dentro del lienzo, para encuadrar el mapa.
 *
 * Se devuelven los límites de la foto y no los del lienzo: si no, el mapa
 * arrancaría mostrando la franja vacía del relleno como si fuera parte del
 * colegio.
 */
export function limitesDeLaImagen(
  imagen: Pick<ImagenBaseMapa, 'ancho_px' | 'alto_px'>
): [PuntoLeaflet, PuntoLeaflet] {
  const { fx, fy } = ocupacionDelLienzo(imagen)
  return [
    [-fy * LADO_PLANO, 0],
    [0, fx * LADO_PLANO],
  ]
}

/**
 * Traduce una coordenada relativa a píxeles de una ortofoto concreta.
 *
 * Solo se necesita para herramientas de exportación o para comprobar contra
 * el archivo original. La aplicación en marcha nunca usa píxeles absolutos.
 */
export function relativaAPixeles(
  punto: CoordenadaRelativa,
  imagen: Pick<ImagenBaseMapa, 'ancho_px' | 'alto_px'>
): { px: number; py: number } {
  return {
    px: Math.round(punto.x * imagen.ancho_px),
    py: Math.round(punto.y * imagen.alto_px),
  }
}

/**
 * Nivel de acercamiento máximo aprovechable de la pirámide.
 *
 * Permitir más acercamiento del que hay teselas dejaría el mapa en blanco al
 * llegar al último nivel; permitir menos desperdiciaría el detalle que exige
 * FR-006b (distinguir árboles individuales).
 */
export function zoomMaximoUtil(imagen: Pick<ImagenBaseMapa, 'zoom_maximo'>): number {
  return imagen.zoom_maximo
}
