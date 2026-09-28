/**
 * SIATA PJB — importa las respuestas del formulario de Google.
 *
 * Se ejecuta con:
 *   pnpm importar-formulario "ruta/al/archivo.csv"             (solo mira)
 *   pnpm importar-formulario "ruta/al/archivo.csv" --confirmar (escribe)
 *
 * ── Qué formulario ───────────────────────────────────────────────────────
 *
 * «MEDICIONES PARA LOS MEDIDORES DE LUIS». Cada respuesta es una jornada:
 * siete mediciones de diez variables, más el lugar y el medidor al final.
 *
 * Para sacar el archivo: en el formulario, pestaña **Respuestas** → el icono
 * verde de hoja de cálculo → en la hoja, **Archivo → Descargar → CSV**.
 *
 * ── Por qué lee por POSICIÓN y no por nombre de columna ──────────────────
 *
 * Porque las siete secciones repiten las mismas diez preguntas, palabra por
 * palabra, y Google exporta esas cabeceras tal cual. Hay siete columnas
 * llamadas «PM2.5», y buscar por nombre devolvería siempre la primera.
 *
 * Lo fiable es el orden. El script cuenta columnas y ADEMÁS comprueba que
 * cada cabecera diga lo que debe decir; si el formulario cambia, se detiene
 * en vez de importar datos corridos una columna.
 *
 * ── Las tres cosas que este script se niega a hacer ──────────────────────
 *
 * 1. **Duplicar una jornada que ya está.** Las quince respuestas de 2025 ya
 *    entraron por `migrar-historico`, desde el Excel que salió de este mismo
 *    formulario. Se reconocen por su clave natural —fecha, lugar y medidor—
 *    y se saltan.
 *
 * 2. **Fiarse de la marca temporal cuando no puede ser la fecha de la
 *    medición.** El formulario no pregunta qué día se midió: usa la hora de
 *    envío. Eso funciona si se envía al salir del taller, y falla cuando
 *    alguien se sienta un sábado por la noche a pasar a limpio un mes de
 *    anotaciones. Una jornada que empieza a las 12:00 y se envía a las 22:51
 *    no se midió ese día.
 *
 * 3. **Escribir sin que se lo pidan.** Sin `--confirmar` enseña exactamente
 *    qué haría y no toca nada.
 *
 * ── Repetir la importación es inofensivo ─────────────────────────────────
 *
 * Los identificadores se DERIVAN de la clave natural, igual que en
 * `migrar-historico`: volver a ejecutarlo escribe las mismas filas con los
 * mismos identificadores en vez de duplicarlas.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { validarValor } from '../lib/validacion/rangos'
import { MAXIMO_MEDICIONES, esDiaDeMedicion, horaDelTurno, nombreDelDia } from '../lib/mediciones/ritmo'

// ---------------------------------------------------------------------------
// Entorno
// ---------------------------------------------------------------------------
try {
  for (const linea of readFileSync('.env.local', 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const c = l.indexOf('=')
    if (c === -1) continue
    const k = l.slice(0, c).trim()
    if (!process.env[k]) process.env[k] = l.slice(c + 1).trim().replace(/^["']|["']$/g, '')
  }
} catch {
  console.error('\n✖ No se encontró .env.local\n')
  process.exit(1)
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !CLAVE || CLAVE.length < 40) {
  console.error('\n✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  console.error('  La clave «service_role» está en Supabase → Project Settings → API.\n')
  process.exit(1)
}

const supabase = createClient(URL, CLAVE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Lectura del CSV
// ---------------------------------------------------------------------------

/**
 * Analizador de CSV que respeta las comillas.
 *
 * Hace falta: un nombre de lugar puede llevar coma, y un campo entrecomillado
 * puede contener saltos de línea. Partir por comas a secas desplazaría todas
 * las columnas de esa fila sin dar ningún error.
 */
function leerCsv(texto: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false

  const t = texto.replace(/^\uFEFF/, '')

  for (let i = 0; i < t.length; i++) {
    const c = t[i]

    if (entreComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"'
          i++
        } else entreComillas = false
      } else campo += c
      continue
    }

    if (c === '"') entreComillas = true
    else if (c === ',') {
      fila.push(campo)
      campo = ''
    } else if (c === '\n') {
      fila.push(campo)
      filas.push(fila)
      fila = []
      campo = ''
    } else if (c !== '\r') campo += c
  }

  if (campo !== '' || fila.length > 0) {
    fila.push(campo)
    filas.push(fila)
  }

  return filas
}

function plegar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Convierte a número lo que se escribió a mano en el formulario.
 *
 * ── Lo que hay de verdad en estas casillas ───────────────────────────────
 *
 * `40%`, `32c`, `0,001`, `3,5`, `.`, y también celdas vacías. La gente
 * escribe la unidad aunque la pregunta ya la diga, y escribe con coma
 * decimal porque así se escribe en español.
 *
 * Se recorta todo lo que no sea cifra, coma, punto o signo, y la coma pasa
 * a punto. `40%` queda en 40, que es lo correcto: la pregunta pide un
 * porcentaje, así que 40 % ES cuarenta.
 *
 * ── Por qué esto importa más de lo que parece ────────────────────────────
 *
 * En Excel una celda con «40%» guarda por dentro el número 0,4. La
 * importación anterior leyó ese valor interno y dejó un tercio de las
 * humedades divididas por cien (migración 0020). Aquí se lee el texto del
 * formulario, donde 40 % es «40%», y ese error no puede repetirse.
 */
function aNumero(texto: string): number | null {
  const t = (texto ?? '').trim()
  if (!t) return null

  const limpio = t.replace(/[^0-9,.\-]/g, '').replace(',', '.')
  if (!limpio || limpio === '.' || limpio === '-') return null

  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

// ---------------------------------------------------------------------------
// La forma del formulario
// ---------------------------------------------------------------------------

/** Las diez variables, en el orden del formulario. `TOVC` es su grafía; el término correcto es TVOC. */
const VARIABLES: { columna: string; clave: string }[] = [
  { columna: 'pm1', clave: 'pm1' },
  { columna: 'pm2.5', clave: 'pm25' },
  { columna: 'pm10', clave: 'pm10' },
  { columna: 'formaldehido', clave: 'hcho' },
  { columna: 'tovc', clave: 'tvoc' },
  { columna: 'humedad relativa', clave: 'humedad_relativa' },
  { columna: 'temp', clave: 'temperatura' },
  { columna: 'particulas por litro', clave: 'particulas_litro' },
  { columna: 'co2', clave: 'co2' },
  { columna: 'aqi', clave: 'aqi_medidor' },
]

/**
 * Los nombres del formulario y los del catálogo.
 *
 * No coinciden, y no tienen por qué: el formulario dice «Op» y «Taller -
 * Mecánica industrial». Esta tabla es la traducción, escrita a mano porque
 * adivinarla con parecidos de texto es la clase de atajo que un día asigna
 * treinta mediciones al taller equivocado.
 */
const LUGARES: Record<string, string> = {
  ebanisteria: 'Ebanistería',
  op: 'Taller Operación de Eventos',
  'taller - mecanica industrial': 'Taller de Mecánica Industrial',
  'taller - mecanica automotriz': 'Taller de Mecánica Automotriz',
  'desarrollo de software': 'Taller de Desarrollo de Software',
  'artes graficas': 'Artes Gráficas',
  // Las dos formas en que se puede acabar llamando en el formulario.
  'san jose': 'Hall San José',
  'hall san jose': 'Hall San José',
}

function turnoDeLaHora(texto: string): 'mediodia' | 'tarde' | null {
  const t = plegar(texto)
  if (/^\(?12:/.test(t) || /^\(?1:/.test(t)) return 'mediodia'
  if (/^\(?2:/.test(t) || /^\(?3:/.test(t)) return 'tarde'
  return null
}

interface MarcaTemporal {
  iso: string | null
  minutos: number | null
  ambigua: boolean
}

/**
 * `27/09/2026 19:15:01` → fecha y hora del ENVÍO.
 *
 * Se asume día/mes/año, que es lo que produce una hoja en español. Cuando el
 * día es 12 o menor la lectura es ambigua y se avisa.
 */
function marcaTemporal(texto: string): MarcaTemporal {
  const t = (texto ?? '').trim()
  const vacia: MarcaTemporal = { iso: null, minutos: null, ambigua: false }
  if (!t) return vacia

  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/)
  if (!m) {
    const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/)
    if (!iso) return vacia
    return {
      iso: `${iso[1]}-${iso[2]}-${iso[3]}`,
      minutos: iso[4] ? Number(iso[4]) * 60 + Number(iso[5]) : null,
      ambigua: false,
    }
  }

  const dia = Number(m[1])
  const mes = Number(m[2])
  if (mes > 12) return vacia

  return {
    iso: `${m[3]}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    minutos: m[4] ? Number(m[4]) * 60 + Number(m[5]) : null,
    ambigua: dia <= 12,
  }
}

/** `13:00` → 780. Para comparar horas sin construir fechas. */
function enMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * ¿Puede la marca temporal ser la fecha en que se midió?
 *
 * El formulario no pregunta el día: usa la hora de envío. Eso vale mientras
 * se envíe al salir del taller. Deja de valer en cuanto alguien pasa a limpio
 * un mes de anotaciones, y entonces todas esas jornadas se archivan el día
 * equivocado sin que nada avise.
 *
 * La comprobación es sencilla y basta: el envío tiene que caer entre la
 * primera lectura y tres horas después de la última. Una jornada que empieza
 * a las 12:00 y se envía a las 22:51 no se midió ese día.
 */
const MARGEN_MINUTOS = 180

function envioCoherente(
  turno: 'mediodia' | 'tarde',
  minutosEnvio: number | null
): { ok: boolean; motivo: string } {
  if (minutosEnvio === null) return { ok: true, motivo: '' }

  const primera = enMinutos(horaDelTurno(turno, 1)!)
  const ultima = enMinutos(horaDelTurno(turno, MAXIMO_MEDICIONES)!)

  if (minutosEnvio < primera) {
    return { ok: false, motivo: 'se envió ANTES de la primera lectura' }
  }
  if (minutosEnvio > ultima + MARGEN_MINUTOS) {
    const horas = Math.round(((minutosEnvio - ultima) / 60) * 10) / 10
    return { ok: false, motivo: `se envió ${horas} h después de la última lectura` }
  }
  return { ok: true, motivo: '' }
}

// ---------------------------------------------------------------------------
function uuidDeterminista(texto: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  let h3 = 0x9e3779b9
  let h4 = 0x85ebca6b
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0
    h2 = Math.imul(h2 ^ (c + i), 16777619) >>> 0
    h3 = Math.imul(h3 ^ (c * 31), 16777619) >>> 0
    h4 = Math.imul(h4 ^ (c + h1), 16777619) >>> 0
  }
  const hex = [h1, h2, h3, h4].map((h) => h.toString(16).padStart(8, '0')).join('')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '5' + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-')
}

// ---------------------------------------------------------------------------
async function main() {
  const ruta = process.argv[2]
  const confirmar = process.argv.includes('--confirmar')

  console.log('\nSIATA PJB — importar respuestas del formulario de Google\n')

  if (!ruta) {
    console.error('✖ Falta el archivo.\n')
    console.error('  pnpm importar-formulario "D:/ruta/Respuestas.csv"\n')
    console.error('  Para sacarlo: formulario → Respuestas → el icono verde de')
    console.error('  hoja de cálculo → Archivo → Descargar → CSV.\n')
    process.exitCode = 1
    return
  }

  let bruto: string
  try {
    bruto = readFileSync(ruta, 'utf8')
  } catch {
    console.error(`✖ No se pudo leer «${ruta}».\n`)
    process.exitCode = 1
    return
  }

  const filas = leerCsv(bruto)
  if (filas.length < 2) {
    console.error('✖ El archivo no tiene respuestas.\n')
    process.exitCode = 1
    return
  }

  const cabeceras = filas[0].map(plegar)
  const respuestas = filas.slice(1).filter((f) => f.some((c) => c.trim() !== ''))

  console.log(`  archivo   : ${ruta}`)
  console.log(`  columnas  : ${cabeceras.length}`)
  console.log(`  respuestas: ${respuestas.length}\n`)

  // -------------------------------------------------------------------------
  // Localizar las columnas
  //
  // El corte es «Lugar de medición»: todo lo que viene antes son las siete
  // secciones de mediciones. Después puede haber de todo —la puntuación que
  // añade Google, columnas escritas a mano en la hoja, incluso los restos de
  // una octava sección abandonada— y nada de eso se mira.
  // -------------------------------------------------------------------------
  const iLugar = cabeceras.findIndex((c) => c.includes('lugar de medicion'))
  const iMedidor = cabeceras.findIndex((c) => c.includes('numero de serie'))
  const iCorreo = cabeceras.findIndex((c) => c.includes('correo'))
  const iMarca = cabeceras.findIndex((c) => c.includes('marca temporal') || c.includes('timestamp'))

  /*
   * ── La fecha escrita a mano, si existe ─────────────────────────────
   *
   * El formulario original no pregunta qué día se midió: se conforma con la
   * marca temporal, la hora de envío que Google añade sola. Eso vale
   * mientras se envíe al salir del taller y deja de valer en cuanto alguien
   * pasa a limpio un atraso.
   *
   * Si existe una columna «Fecha de la medición» —como pregunta del
   * formulario o escrita a mano en la hoja— manda esa: es la única que dice
   * de verdad cuándo se midió. Y entonces se cree lo que diga, porque una
   * persona que escribe un sábado sabe lo que escribe.
   */
  const iFecha = cabeceras.findIndex(
    (c) => c.includes('fecha de la medicion') || c.includes('fecha de medicion')
  )

  if (iLugar === -1 || iMedidor === -1) {
    console.error('✖ Faltan las columnas de lugar o de medidor.\n')
    process.exitCode = 1
    return
  }

  const horas: number[] = []
  cabeceras.forEach((c, i) => {
    if (i < iLugar && c.includes('hora de medicion')) horas.push(i)
  })

  if (horas.length !== MAXIMO_MEDICIONES) {
    console.error(
      `✖ Se esperaban ${MAXIMO_MEDICIONES} secciones de medición y hay ${horas.length}.`
    )
    console.error('  El formulario cambió. Revíselo antes de importar.\n')
    process.exitCode = 1
    return
  }

  const desajustes: string[] = []
  for (const [bloque, inicio] of horas.entries()) {
    VARIABLES.forEach((v, j) => {
      const c = cabeceras[inicio + 1 + j] ?? ''
      if (!c.includes(v.columna)) {
        desajustes.push(
          `medición ${bloque + 1}, columna ${inicio + 2 + j}: se esperaba «${v.columna}» y dice «${c}»`
        )
      }
    })
  }

  if (desajustes.length > 0) {
    console.error('✖ Las columnas no están donde deberían:\n')
    for (const d of desajustes.slice(0, 10)) console.error(`    ${d}`)
    if (desajustes.length > 10) console.error(`    … y ${desajustes.length - 10} más`)
    console.error('\n  No se importó nada.\n')
    process.exitCode = 1
    return
  }

  const extras = cabeceras.length - (iLugar + 2) - (iFecha > iLugar ? 1 : 0)
  console.log(`  ✓ Las ${MAXIMO_MEDICIONES} secciones y sus ${VARIABLES.length} variables están en su sitio.`)
  if (extras > 0) console.log(`    (${extras} columnas después del medidor: se ignoran)`)
  console.log(
    iFecha === -1
      ? '  ⚠️  No hay columna «Fecha de la medición»: se usará la hora de envío.'
      : `  ✓ Hay columna «Fecha de la medición»: manda sobre la hora de envío.`
  )
  console.log()

  // -------------------------------------------------------------------------
  // Catálogos, alias y lo que ya está guardado
  // -------------------------------------------------------------------------
  const [{ data: lugares }, { data: medidores }, { data: equipo }, { data: alias }, { data: jornadasYa }] =
    await Promise.all([
      supabase.from('lugar_medicion').select('id, nombre'),
      supabase.from('medidor').select('id, numero_serie'),
      supabase.from('integrante').select('id, correo'),
      supabase.from('alias_historico').select('alias, integrante_id'),
      supabase.from('jornada').select('id, fecha, lugar_id, medidor_id, origen'),
    ])

  const porLugar = new Map((lugares ?? []).map((l) => [plegar(l.nombre), l.id]))
  const porMedidor = new Map((medidores ?? []).map((m) => [m.numero_serie.slice(-2), m.id]))
  const nombreDeLugar = new Map((lugares ?? []).map((l) => [l.id, l.nombre]))

  /*
   * Los autores llegan con su correo personal de Gmail, no con el
   * institucional. `alias_historico` existe justo para eso: relaciona el
   * nombre de usuario de esos correos con la persona del equipo (FR-030a).
   */
  const porCorreo = new Map((equipo ?? []).map((p) => [p.correo.toLowerCase(), p.id]))
  const porAlias = new Map((alias ?? []).map((a) => [a.alias.toLowerCase(), a.integrante_id]))

  const claveNatural = (fecha: string, lugarId: string, medidorId: string) =>
    `${fecha}|${lugarId}|${medidorId}`
  const yaGuardadas = new Map(
    (jornadasYa ?? []).map((j) => [claveNatural(j.fecha, j.lugar_id, j.medidor_id), j])
  )

  // -------------------------------------------------------------------------
  // Clasificar
  // -------------------------------------------------------------------------
  interface Pendiente {
    renglon: number
    fecha: string
    turno: 'mediodia' | 'tarde'
    lugarId: string
    medidorId: string
    integranteId: string | null
    lecturas: { numero: number; valores: Record<string, number | null> }[]
  }

  const nuevas: Pendiente[] = []
  const repetidas: string[] = []
  const fechaNoFiable: string[] = []
  const descartes: string[] = []
  const avisos: string[] = []
  const correosSinDuenio = new Set<string>()
  const lugaresDesconocidos = new Set<string>()
  const medidoresDesconocidos = new Set<string>()
  let fechasAmbiguas = 0

  respuestas.forEach((fila, n) => {
    const renglon = n + 2

    const nombreLugar = (fila[iLugar] ?? '').trim()
    const textoMedidor = (fila[iMedidor] ?? '').trim()

    if (!nombreLugar || !textoMedidor) {
      descartes.push(
        `renglón ${renglon}: ${!nombreLugar ? 'sin lugar' : ''}${!nombreLugar && !textoMedidor ? ' y ' : ''}${!textoMedidor ? 'sin medidor' : ''}`
      )
      return
    }

    const lugarId = porLugar.get(plegar(LUGARES[plegar(nombreLugar)] ?? nombreLugar))
    if (!lugarId) {
      lugaresDesconocidos.add(nombreLugar)
      descartes.push(`renglón ${renglon}: lugar desconocido «${nombreLugar}»`)
      return
    }

    const serie = textoMedidor.replace(/\D/g, '').slice(-2)
    const medidorId = porMedidor.get(serie)
    if (!medidorId) {
      medidoresDesconocidos.add(`${textoMedidor} → ${serie || '(sin cifras)'}`)
      descartes.push(`renglón ${renglon}: medidor «${textoMedidor}» no está en el catálogo`)
      return
    }

    // La fecha escrita a mano manda sobre la hora de envío.
    const declarada =
      iFecha === -1
        ? { iso: null, minutos: null, ambigua: false }
        : marcaTemporal(fila[iFecha] ?? '')
    const envio = marcaTemporal(iMarca === -1 ? '' : (fila[iMarca] ?? ''))
    const marca = declarada.iso ? declarada : envio
    const fechaEsDeclarada = declarada.iso !== null

    if (!marca.iso) {
      descartes.push(`renglón ${renglon}: no se pudo leer ninguna fecha`)
      return
    }
    if (marca.ambigua) fechasAmbiguas++

    // El turno sale de la primera hora que traiga la respuesta: a veces la
    // primera medición va vacía y la jornada empieza en la segunda.
    let turno: 'mediodia' | 'tarde' | null = null
    for (const h of horas) {
      turno = turnoDeLaHora(fila[h] ?? '')
      if (turno) break
    }
    if (!turno) {
      descartes.push(`renglón ${renglon}: ninguna medición dice a qué hora se tomó`)
      return
    }

    const correo = iCorreo === -1 ? '' : (fila[iCorreo] ?? '').trim().toLowerCase()
    const usuario = correo.split('@')[0]
    const integranteId = porCorreo.get(correo) ?? porAlias.get(usuario) ?? null
    if (correo && !integranteId) correosSinDuenio.add(correo)

    // ── Las lecturas ────────────────────────────────────────────────────
    const lecturas: Pendiente['lecturas'] = []

    for (let m = 0; m < MAXIMO_MEDICIONES; m++) {
      const inicio = horas[m]
      const valores: Record<string, number | null> = {}
      let tieneAlgo = false
      const rechazados: string[] = []

      VARIABLES.forEach((v, j) => {
        const valor = aNumero(fila[inicio + 1 + j] ?? '')
        if (valor === null) {
          valores[v.clave] = null
          return
        }

        const resultado = validarValor(v.clave, valor)
        if (resultado.estado === 'rechazado') {
          // Un valor imposible se descarta SOLO él: las otras nueve
          // variables de esa lectura son buenas y se conservan.
          rechazados.push(`${v.clave}=${valor}`)
          valores[v.clave] = null
          return
        }

        valores[v.clave] = valor
        tieneAlgo = true
      })

      if (rechazados.length > 0) {
        avisos.push(
          `renglón ${renglon}, medición ${m + 1}: valor imposible descartado (${rechazados.join(', ')})`
        )
      }

      if (tieneAlgo) lecturas.push({ numero: m + 1, valores })
    }

    if (lecturas.length === 0) {
      descartes.push(`renglón ${renglon}: ninguna de las ${MAXIMO_MEDICIONES} mediciones trae datos`)
      return
    }

    const donde = nombreDeLugar.get(lugarId)
    const resumen = `${marca.iso} · ${donde} · medidor ${serie} · ${lecturas.length} lecturas`

    // ── ¿Ya está guardada? ──────────────────────────────────────────────
    const existente = yaGuardadas.get(claveNatural(marca.iso, lugarId, medidorId))
    if (existente) {
      repetidas.push(`renglón ${renglon}: ${resumen} — ya está (origen «${existente.origen}»)`)
      return
    }

    // ── ¿Es creíble la fecha? ───────────────────────────────────────────
    //
    // Dos señales, y cualquiera de las dos basta para no fiarse:
    //
    //  · El envío no encaja con el turno.
    //  · El día no es miércoles ni viernes.
    //
    // La segunda es más dura aquí que en el formulario de la aplicación, y
    // a propósito. Cuando alguien escribe una fecha a mano, un sábado puede
    // ser una salida extraordinaria y hay que creerle. Cuando la fecha la
    // pone un sello de envío, un sábado significa que alguien se sentó el
    // fin de semana a pasar a limpio: el dato es bueno, la fecha no.
    if (fechaEsDeclarada) {
      // Alguien la escribió. Se le cree; como mucho se avisa.
      if (!esDiaDeMedicion(marca.iso)) {
        avisos.push(
          `renglón ${renglon}: ${marca.iso} es ${nombreDelDia(marca.iso)}, y se mide miércoles y viernes`
        )
      }
    } else {
      const coherente = envioCoherente(turno, envio.minutos)
      if (!coherente.ok) {
        fechaNoFiable.push(
          `renglón ${renglon}: ${resumen} — ${coherente.motivo} (${nombreDelDia(marca.iso)})`
        )
        return
      }

      if (!esDiaDeMedicion(marca.iso)) {
        fechaNoFiable.push(
          `renglón ${renglon}: ${resumen} — se envió un ${nombreDelDia(marca.iso)}, y se mide miércoles y viernes`
        )
        return
      }
    }

    nuevas.push({
      renglon,
      fecha: marca.iso,
      turno,
      lugarId,
      medidorId,
      integranteId,
      lecturas,
    })
  })

  // -------------------------------------------------------------------------
  // Informe
  // -------------------------------------------------------------------------
  const totalLecturas = nuevas.reduce((n, j) => n + j.lecturas.length, 0)

  console.log(`  jornadas nuevas       : ${nuevas.length}  (${totalLecturas} mediciones)`)
  console.log(`  ya estaban guardadas  : ${repetidas.length}`)
  console.log(`  con fecha no fiable   : ${fechaNoFiable.length}`)
  console.log(`  descartadas           : ${descartes.length}`)

  if (fechaNoFiable.length > 0) {
    console.log('\n  ─────────────────────────────────────────────────────────')
    console.log('  ⚠️  FECHAS QUE NO PUEDEN SER LA FECHA DE LA MEDICIÓN')
    console.log('  ─────────────────────────────────────────────────────────')
    console.log('  El formulario no pregunta qué día se midió: usa la hora de')
    console.log('  envío. En estas respuestas el envío no encaja con el turno,')
    console.log('  así que se escribieron después, pasando a limpio.')
    console.log('  Importarlas archivaría las jornadas el día equivocado.\n')
    for (const f of fechaNoFiable.slice(0, 25)) console.log(`    · ${f}`)
    if (fechaNoFiable.length > 25) console.log(`    … y ${fechaNoFiable.length - 25} más`)
    console.log('\n  Para recuperarlas hay que saber el día real de cada una.')
    console.log('  Lo más sencillo: en la hoja de respuestas, añadir una columna')
    console.log('  llamada «Fecha de la medición», escribir ahí el día de cada')
    console.log('  renglón y volver a exportar. Este script la usará en lugar de')
    console.log('  la hora de envío.')
  }

  if (repetidas.length > 0) {
    console.log(`\n  Ya guardadas (${repetidas.length}) — no se tocan:`)
    for (const r of repetidas.slice(0, 8)) console.log(`    · ${r}`)
    if (repetidas.length > 8) console.log(`    … y ${repetidas.length - 8} más`)
  }

  if (lugaresDesconocidos.size > 0) {
    console.log('\n  Lugares que no están en el catálogo:')
    for (const l of lugaresDesconocidos) console.log(`    · ${l}`)
  }

  if (medidoresDesconocidos.size > 0) {
    console.log('\n  Medidores que no están en el catálogo:')
    for (const m of medidoresDesconocidos) console.log(`    · ${m}`)
  }

  if (correosSinDuenio.size > 0) {
    console.log('\n  Correos que no corresponden a nadie del equipo:')
    for (const c of correosSinDuenio) console.log(`    · ${c}`)
    console.log('    Esas jornadas quedarían sin autor. Se arregla añadiendo el')
    console.log('    alias en la tabla `alias_historico`.')
  }

  if (fechasAmbiguas > 0) {
    console.log(`\n  ⚠️  ${fechasAmbiguas} fechas con día 12 o menor: día/mes y mes/día`)
    console.log('      son indistinguibles ahí. Se leyeron como día/mes.')
  }

  if (avisos.length > 0) {
    console.log(`\n  Avisos (${avisos.length}):`)
    for (const a of avisos.slice(0, 10)) console.log(`    · ${a}`)
    if (avisos.length > 10) console.log(`    … y ${avisos.length - 10} más`)
  }

  if (descartes.length > 0) {
    console.log(`\n  Descartadas (${descartes.length}):`)
    for (const d of descartes.slice(0, 10)) console.log(`    · ${d}`)
    if (descartes.length > 10) console.log(`    … y ${descartes.length - 10} más`)
  }

  if (nuevas.length === 0) {
    console.log('\n  ─────────────────────────────────────────────────────────')
    console.log('  No hay nada que importar sin riesgo. No se escribió nada.\n')
    return
  }

  if (!confirmar) {
    console.log('\n  ─────────────────────────────────────────────────────────')
    console.log('  No se escribió nada. Para importar de verdad, repita con:')
    console.log(`\n    pnpm importar-formulario "${ruta}" --confirmar\n`)
    return
  }

  // -------------------------------------------------------------------------
  // Escribir
  // -------------------------------------------------------------------------
  console.log('\n  Escribiendo…')

  const filasJornada = nuevas.map((j) => ({
    id: uuidDeterminista(`formulario|jornada|${j.fecha}|${j.turno}|${j.lugarId}|${j.medidorId}`),
    fecha: j.fecha,
    turno: j.turno,
    lugar_id: j.lugarId,
    medidor_id: j.medidorId,
    integrante_id: j.integranteId,
    origen: 'importacion' as const,
    cerrada: true,
  }))

  const { error: eJ } = await supabase
    .from('jornada')
    .upsert(filasJornada, { onConflict: 'id', ignoreDuplicates: true })

  if (eJ) {
    console.error(`\n✖ No se pudieron guardar las jornadas: ${eJ.message}\n`)
    process.exitCode = 1
    return
  }

  const filasMedicion = nuevas.flatMap((j, i) =>
    j.lecturas.map((l) => ({
      id: uuidDeterminista(
        `formulario|medicion|${j.fecha}|${j.turno}|${j.lugarId}|${j.medidorId}|${l.numero}`
      ),
      jornada_id: filasJornada[i].id,
      numero: l.numero,
      hora: `${horaDelTurno(j.turno, l.numero)}:00`,
      dato_dudoso: false,
      nota_dudoso: null,
      ...l.valores,
    }))
  )

  let escritas = 0
  for (let i = 0; i < filasMedicion.length; i += 100) {
    const tanda = filasMedicion.slice(i, i + 100)
    const { error } = await supabase
      .from('medicion')
      .upsert(tanda, { onConflict: 'id', ignoreDuplicates: true })

    if (error) {
      console.error(`\n✖ Falló la tanda ${Math.floor(i / 100) + 1}: ${error.message}`)
      console.error(`  Se escribieron ${escritas} mediciones antes del fallo.\n`)
      process.exitCode = 1
      return
    }
    escritas += tanda.length
  }

  console.log(`\n✓ ${filasJornada.length} jornadas y ${escritas} mediciones importadas.\n`)
  console.log('  Se ven en Tableros. Quedan cerradas y marcadas como «importacion»,')
  console.log('  así que se distinguen de las tomadas en la aplicación.\n')
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exitCode = 1
})
