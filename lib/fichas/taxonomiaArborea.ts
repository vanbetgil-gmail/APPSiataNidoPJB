/**
 * Registro de taxonomía del proyecto arbóreo.
 *
 * Transcripción de `REGISTRO DE TAXONOMÍA PROYECTO ARBÓREO.pdf`, entregado
 * por el equipo el 2026-09-02: 16 especies y 31 árboles del campus.
 *
 * ── Sobre los nombres científicos ────────────────────────────────────────
 *
 * El archivo original trae erratas, y no todas son iguales. Se distinguen
 * dos casos y se tratan distinto a propósito:
 *
 * · **Erratas de tecleo evidentes** (`Sphatodea` por *Spathodea*). Se
 *   corrigen, y `registradoComo` conserva lo que decía el original para que
 *   el cambio quede a la vista y se pueda deshacer.
 *
 * · **Dudas de identificación** (¿el «madroño» del colegio es el europeo
 *   *Arbutus unedo* o el colombiano *Garcinia madruno*?). NO se tocan. Aquí
 *   no hay una respuesta que se pueda deducir de un texto: hay que ir a
 *   mirar el árbol. Quedan en `dudaDeIdentificacion` para que el equipo lo
 *   resuelva en campo, que es exactamente el trabajo del proyecto.
 *
 * Corregir por mi cuenta lo segundo sería inventarme un dato de campo.
 *
 * ── Sobre las descripciones ──────────────────────────────────────────────
 *
 * Son borradores. Describen la especie en general, no el ejemplar concreto
 * del colegio, porque el ejemplar no lo he visto. Están para que el equipo
 * las corrija y las complete con lo que observe: es la primera de las dos
 * ediciones que permite FR-038f.
 */

export interface EspecieArborea {
  nombreComun: string
  nombreCientifico: string
  /** Lo que decía el PDF, si se corrigió. */
  registradoComo?: string
  /** Zonas del colegio, tal como las anotó el equipo. */
  ubicacionTexto: string
  cantidad: number
  descripcion: string
  /** Pregunta abierta que el equipo debe resolver mirando el árbol. */
  dudaDeIdentificacion?: string
}

export const TAXONOMIA_ARBOREA: readonly EspecieArborea[] = [
  {
    nombreComun: 'Guayacán',
    nombreCientifico: 'Tabebuia chrysantha',
    registradoComo: 'Tubebui Chrysanta',
    ubicacionTexto: 'Hall, Fraternidad y Circunvalar',
    cantidad: 5,
    descripcion:
      'Árbol de floración amarilla intensa que cubre la copa entera durante pocos días al año, ' +
      'normalmente antes de que salgan las hojas nuevas. Es el árbol más numeroso del registro: ' +
      'hay cinco ejemplares repartidos entre el hall, la Fraternidad y la circunvalar.',
  },
  {
    nombreComun: 'Azahar de la India',
    nombreCientifico: 'Citrus sinensis',
    ubicacionTexto: 'Sendero del hall y Fraternidad',
    cantidad: 2,
    descripcion:
      'Arbusto o árbol pequeño de flores blancas muy perfumadas, plantado en el sendero del hall ' +
      'y en la Fraternidad. Dos ejemplares.',
    dudaDeIdentificacion:
      'El nombre «azahar de la India» suele corresponder a Murraya paniculata, mientras que ' +
      'Citrus sinensis es el naranjo dulce. Son dos plantas distintas. Conviene mirar el fruto: ' +
      'si da naranjas, es Citrus; si da frutos rojos pequeños, es Murraya.',
  },
  {
    nombreComun: 'Tulipán africano',
    nombreCientifico: 'Spathodea campanulata',
    registradoComo: 'Sphatodea campanulata',
    ubicacionTexto: 'Patio del Juego Limpio',
    cantidad: 1,
    descripcion:
      'Árbol de flores grandes anaranjadas en forma de campana, agrupadas en el extremo de las ' +
      'ramas. Un solo ejemplar, en el patio del Juego Limpio. Es una especie introducida que en ' +
      'varias regiones se considera invasora, lo que puede ser un buen tema de discusión para el ' +
      'proyecto.',
  },
  {
    nombreComun: 'Chiminango',
    nombreCientifico: 'Pithecellobium dulce',
    ubicacionTexto: 'Fraternidad',
    cantidad: 3,
    descripcion:
      'Árbol de copa amplia y ramas espinosas, con vainas retorcidas que se abren y dejan ver una ' +
      'pulpa blanca comestible. Tres ejemplares en la Fraternidad. Da buena sombra, que es una de ' +
      'las razones por las que se siembra en patios escolares.',
  },
  {
    nombreComun: 'Croto',
    nombreCientifico: 'Croton',
    ubicacionTexto: 'Hall',
    cantidad: 1,
    descripcion:
      'Planta ornamental de hojas coriáceas con manchas amarillas, rojas y verdes, muy usada como ' +
      'seto o en macetas. Un ejemplar en el hall.',
    dudaDeIdentificacion:
      'El croto ornamental de hojas de colores es Codiaeum variegatum. Croton es un género ' +
      'distinto y mucho más amplio. Vale la pena confirmar cuál de los dos es.',
  },
  {
    nombreComun: 'Palma iraca',
    nombreCientifico: 'Carludovica palmata',
    ubicacionTexto: 'Hall',
    cantidad: 1,
    descripcion:
      'A pesar del nombre no es una palma verdadera: es la planta con cuyas fibras se teje el ' +
      'sombrero conocido en Colombia como sombrero de iraca. Hojas grandes en abanico, partidas ' +
      'en cuatro secciones. Un ejemplar en el hall.',
  },
  {
    nombreComun: 'Palma alejandra o australiana',
    nombreCientifico: 'Archontophoenix alexandrae',
    registradoComo: 'Archotophoenix alexandrau',
    ubicacionTexto: 'Hall',
    cantidad: 2,
    descripcion:
      'Palma alta y delgada, de tronco anillado y una corona de hojas plumosas en lo alto. ' +
      'Originaria de Australia. Dos ejemplares en el hall.',
  },
  {
    nombreComun: 'Vara santa o palo santo',
    nombreCientifico: 'Bursera graveolens',
    ubicacionTexto: 'Fraternidad y hall',
    cantidad: 2,
    descripcion:
      'Árbol cuya madera desprende un aroma resinoso característico, del que toma el nombre. ' +
      'Corteza clara y follaje ralo. Dos ejemplares, uno en la Fraternidad y otro en el hall.',
  },
  {
    nombreComun: 'Pomarrosa',
    nombreCientifico: 'Syzygium jambos',
    ubicacionTexto: 'Fraternidad y antiguo restaurante',
    cantidad: 3,
    descripcion:
      'Árbol de hojas lanceoladas y flores con numerosos estambres blancos largos, que parecen ' +
      'plumeros. Su fruto es comestible y huele a rosas, de donde viene el nombre. Tres ' +
      'ejemplares.',
  },
  {
    nombreComun: 'Curazao o veranera',
    nombreCientifico: 'Bougainvillea spp.',
    registradoComo: 'Bougainvillea Spp',
    ubicacionTexto: 'Hall',
    cantidad: 2,
    descripcion:
      'Planta trepadora leñosa, con espinas y con brácteas de colores intensos —moradas, rojas o ' +
      'naranjas— que la gente suele confundir con los pétalos; la flor verdadera es la pequeña y ' +
      'blanca del centro. Dos ejemplares en el hall.',
  },
  {
    nombreComun: 'Flor de reina',
    nombreCientifico: 'Lagerstroemia speciosa',
    registradoComo: 'Lagerstroemia Speciosa',
    ubicacionTexto: 'Zona administrativa',
    cantidad: 1,
    descripcion:
      'Árbol de floración morada o lila muy vistosa, con pétalos de borde ondulado. Pierde las ' +
      'hojas en época seca. Un ejemplar en la zona administrativa.',
  },
  {
    nombreComun: 'Almendro',
    nombreCientifico: 'Prunus',
    registradoComo: 'Prunos',
    ubicacionTexto: 'Corredor de talleres y hall',
    cantidad: 2,
    descripcion:
      'Dos ejemplares, uno en el corredor de talleres y otro en el hall. Da sombra amplia sobre ' +
      'el corredor, lo que lo vuelve relevante para las mediciones de ese sector.',
    dudaDeIdentificacion:
      'En Colombia se llama «almendro» tanto al almendro mediterráneo (Prunus dulcis) como al ' +
      'almendro tropical (Terminalia catappa), que es mucho más común en climas cálidos y tiene ' +
      'hojas grandes dispuestas en pisos. Conviene mirar la hoja para decidir.',
  },
  {
    nombreComun: 'Pino vela',
    nombreCientifico: 'Cupressus sempervirens',
    ubicacionTexto: 'Hall y corredor administrativo',
    cantidad: 2,
    descripcion:
      'Conífera de porte columnar, estrecha y muy vertical, que es de donde viene el nombre de ' +
      'vela. Follaje de escamas pequeñas. Dos ejemplares.',
  },
  {
    nombreComun: 'Pino libro',
    nombreCientifico: 'Thuja orientalis',
    ubicacionTexto: 'Corredor administrativo',
    cantidad: 1,
    descripcion:
      'Conífera de ramas aplanadas dispuestas en planos verticales, que recuerdan las hojas de un ' +
      'libro abierto. Un ejemplar en el corredor administrativo.',
    dudaDeIdentificacion:
      'La especie fue reclasificada y hoy su nombre aceptado es Platycladus orientalis. ' +
      'Thuja orientalis es un sinónimo antiguo. Vale la pena registrar el nombre vigente.',
  },
  {
    nombreComun: 'Madroño',
    nombreCientifico: 'Arbutus unedo',
    ubicacionTexto: 'Fraternidad',
    cantidad: 1,
    descripcion: 'Un ejemplar en la Fraternidad.',
    dudaDeIdentificacion:
      'Arbutus unedo es el madroño mediterráneo. En Colombia se llama madroño a Garcinia madruno, ' +
      'un árbol distinto de fruto amarillo comestible. Hay que ver el árbol para saber cuál es: ' +
      'la descripción quedó corta a propósito hasta resolverlo.',
  },
  {
    nombreComun: 'Araucaria',
    nombreCientifico: 'Araucaria araucana',
    ubicacionTexto: 'Patio de San José y hall',
    cantidad: 2,
    descripcion:
      'Conífera de ramas dispuestas en verticilos regulares, que le dan una silueta escalonada ' +
      'muy reconocible. Dos ejemplares, uno de ellos en el patio de San José, donde está la ' +
      'estación meteorológica del proyecto.',
    dudaDeIdentificacion:
      'Araucaria araucana es chilena y de clima frío. En colegios colombianos suele tratarse de ' +
      'Araucaria heterophylla o Araucaria columnaris. Conviene confirmarlo.',
  },
] as const

/** 31 árboles en 16 especies. */
export const TOTAL_ARBOLES = TAXONOMIA_ARBOREA.reduce((n, e) => n + e.cantidad, 0)
