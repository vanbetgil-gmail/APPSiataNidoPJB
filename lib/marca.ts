/**
 * Los nombres del proyecto, en un solo sitio.
 *
 * ── Por qué esto merece un archivo ───────────────────────────────────────
 *
 * El nombre estaba escrito a mano en veintiocho lugares: la pestaña del
 * navegador, el pie de página, el manifiesto de instalación, la vista previa
 * al compartir por WhatsApp, los mensajes de error, la hoja de cálculo que
 * se exporta. Cambiarlo significaba encontrarlos todos, y bastaba olvidar
 * uno para que la aplicación se llamara de dos maneras según dónde mirara
 * cada persona.
 *
 * Ya pasó una vez. Se cambió la marca visible y quedaron veintisiete sitios
 * diciendo lo anterior.
 *
 * ── Los tres nombres y qué es cada uno ───────────────────────────────────
 *
 * · **SIATA PJB** es el nombre público. Es como el colegio conoce el
 *   proyecto y como aparece en sus documentos, así que es el que va grande
 *   y el que se usa cuando solo cabe uno.
 *
 * · **NIDO** es la plataforma: este programa. Aparece junto al nombre
 *   público para que quien vea las dos palabras no las tome por dos cosas
 *   distintas.
 *
 * · **PJB** son las siglas del colegio, que es de donde salió todo.
 */

/** El que va grande y el que se usa cuando solo cabe uno. */
export const MARCA = 'SIATA PJB'

/** La plataforma. */
export const PLATAFORMA = 'NIDO'

/** Qué significa NIDO. Se escribe entero: una sigla sin explicar no informa. */
export const PLATAFORMA_LARGA = 'Nodo de Investigación y Datos Observados'

export const COLEGIO = 'Instituto Salesiano Pedro Justo Berrío'

export const CIUDAD = 'Medellín'

/** `SIATA PJB · NIDO — Nodo de Investigación y Datos Observados` */
export const MARCA_CON_PLATAFORMA = `${MARCA} · ${PLATAFORMA} — ${PLATAFORMA_LARGA}`

/** Para la pestaña del navegador y la vista previa al compartir. */
export const TITULO_PORTADA = `${MARCA} — Mapa de biodiversidad del ${COLEGIO}`

/** `%s · SIATA PJB` — lo que Next.js antepone al título de cada pantalla. */
export const PLANTILLA_TITULO = `%s · ${MARCA}`

export const DESCRIPCION_PORTADA =
  `Mapa de biodiversidad y calidad del aire del ${COLEGIO}, ${CIUDAD}. ` +
  `Un proyecto de ciencias ambientales hecho por estudiantes.`
