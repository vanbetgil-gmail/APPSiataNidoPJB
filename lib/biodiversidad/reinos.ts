/**
 * Agrupación de las categorías en fauna y flora.
 *
 * ── Por qué no es una columna en la base de datos ────────────────────────
 *
 * Porque se deduce de la categoría, y un dato deducible que además se
 * almacena es un dato que puede contradecirse: bastaría con que alguien
 * cambiara la categoría de una ficha de «Ave» a «Árbol» y olvidara cambiar
 * el reino para tener un árbol clasificado como fauna. Derivándolo, esa
 * contradicción no puede existir.
 *
 * ── Por qué hay un tercer grupo ──────────────────────────────────────────
 *
 * El equipo puede crear categorías nuevas: hongos, líquenes, lo que
 * encuentren. Si una categoría desconocida se asignara por omisión a flora,
 * un hongo quedaría clasificado como planta sin que nadie lo notara; y si se
 * dejara fuera de ambos filtros, esas fichas desaparecerían de la pantalla
 * al filtrar. «Otros» aparece solo cuando hay algo que no encaja, y así
 * nada se pierde ni se clasifica mal en silencio.
 */

export type Reino = 'fauna' | 'flora' | 'otros'

export interface DefinicionReino {
  reino: Reino
  etiqueta: string
  emoji: string
}

export const REINOS: readonly DefinicionReino[] = [
  { reino: 'fauna', etiqueta: 'Fauna', emoji: '🐦' },
  { reino: 'flora', etiqueta: 'Flora', emoji: '🌿' },
  { reino: 'otros', etiqueta: 'Otros', emoji: '🍄' },
] as const

/**
 * Palabras que deciden el grupo.
 *
 * Se busca dentro del nombre de la categoría en vez de exigir coincidencia
 * exacta, para que «Planta ornamental», «Plantas acuáticas» o «Planta
 * trepadora» funcionen sin tener que añadirlas una por una.
 */
const PALABRAS_FAUNA = [
  'ave', 'pajaro', 'insecto', 'mamifero', 'reptil', 'anfibio', 'animal',
  'mariposa', 'abeja', 'araña', 'arana', 'murcielago', 'ardilla', 'pez',
  'lagartija', 'rana', 'hormiga', 'escarabajo', 'libelula',
]

const PALABRAS_FLORA = [
  'arbol', 'arbusto', 'planta', 'flor', 'hierba', 'palma', 'helecho',
  'musgo', 'enredadera', 'trepadora', 'cactus', 'suculenta', 'pasto',
  'orquidea', 'bromelia',
]

function plegar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function reinoDeCategoria(categoria: string | null | undefined): Reino {
  const c = plegar(categoria ?? '')
  if (!c) return 'otros'
  if (PALABRAS_FAUNA.some((p) => c.includes(p))) return 'fauna'
  if (PALABRAS_FLORA.some((p) => c.includes(p))) return 'flora'
  return 'otros'
}

export function definicionDeReino(reino: Reino): DefinicionReino {
  return REINOS.find((r) => r.reino === reino) ?? REINOS[2]
}
