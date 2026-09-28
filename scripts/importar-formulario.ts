/**
 * SIATA PJB — importa las respuestas del formulario de Google.
 *
 * Se ejecuta con:
 *   pnpm importar-formulario "ruta/al/archivo.csv"            (solo mira)
 *   pnpm importar-formulario "ruta/al/archivo.csv" --confirmar (escribe)
 *
 * ── Qué formulario ───────────────────────────────────────────────────────
 *
 * «MEDICIONES PARA LOS MEDIDORES DE LUIS». Cada respuesta es una jornada
 * completa: siete mediciones de diez variables, más el lugar y el medidor al
 * final.
 *
 * Para sacar el archivo: en el formulario, pestaña **Respuestas** → el icono
 * verde de hoja de cálculo → en la hoja, **Archivo → Descargar → CSV**.
 *
 * ── Por qué lee por POSICIÓN y no por nombre de columna ──────────────────
 *
 * Porque las siete secciones del formulario repiten las mismas diez
 * preguntas, palabra por palabra. Google exporta esas cabeceras tal cual, así
 * que hay siete columnas llamadas «PM2.5 ( µg/ m³)» y buscar por nombre
 * devolvería siempre la primera.
 *
 * Lo que sí es fiable es el orden: hora y diez variables, siete veces
 * seguidas. El script localiza los bloques contando columnas y ADEMÁS
 * comprueba que cada cabecera diga lo que debe decir. Si el formulario cambia,
 * se detiene en vez de importar datos corridos una columna.
 *
 * ── Por qué no escribe salvo que se le pida ──────────────────────────────
 *
 * Porque una importación mal entendida ensucia el histórico de forma difícil
 * de deshacer. Sin `--confirmar` enseña exactamente qué haría —cuántas
 * jornadas, cuántas mediciones, qué filas descarta y por qué— y no toca nada.
 *
 * ── Repetir la importación es inofensivo ─────────────────────────────────
 *
 * Los identificadores se DERIVAN de la clave natural (fecha, turno, lugar,
 * medidor y número de medición), igual que en `migrar-historico`. Volver a
 * ejecutarlo escribe las mismas filas con los mismos identificadores en vez
 * de duplicarlas.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { RANGOS, validarValor } from '../lib/validacion/rangos'
import { MAXIMO_MEDICIONES, aISO, esDiaDeMedicion, horaDelTurno } from '../lib/mediciones/ritmo'

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
 * Hace falta de verdad: el nombre de un lugar puede llevar coma, y un campo
 * entrecomillado puede contener saltos de línea. Partir por comas a secas
 * desplazaría todas las columnas de esa fila sin dar ningún error.
 */
function leerCsv(texto: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false

  // El BOM de Excel, si está, se lleva por delante la primera cabecera.
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

  return filas.filter((f) => f.some((c) => c.trim() !== ''))
}

/** Sin tildes, sin mayúsculas, sin espacios de más. Para comparar nombres. */
function plegar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// La forma del formulario
// ---------------------------------------------------------------------------

/**
 * Las diez variables, EN EL ORDEN DEL FORMULARIO.
 *
 * Coincide con el de `RANGOS`, y no por casualidad: ese orden se tomó del
 * medidor. Aun así se escribe aquí aparte, con la palabra que usa el
 * formulario, para que el script pueda comprobar cabecera por cabecera.
 *
 * `TOVC` es como está escrito en el formulario. El nombre correcto es TVOC
 * —compuestos orgánicos volátiles totales— y así aparece en la aplicación;
 * aquí se acepta la grafía del formulario para poder leerlo.
 */
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
 * Los nombres del formulario y los del catálogo de la aplicación.
 *
 * No coinciden, y no tienen por qué: el formulario dice «Op» y «Taller -
 * Mecánica industrial»; el catálogo, «Taller Operación de Eventos» y «Taller
 * de Mecánica Industrial». Esta tabla es la traducción, y está escrita porque
 * adivinarla con parecidos de texto es la clase de atajo que un día asigna
 * treinta mediciones al taller equivocado.
 */
const LUGARES: Record<string, string> = {
  'ebanisteria': 'Ebanistería',
  'op': 'Taller Operación de Eventos',
  'taller - mecanica industrial': 'Taller de Mecánica Industrial',
  'taller - mecanica automotriz': 'Taller de Mecánica Automotriz',
  'desarrollo de software': 'Taller de Desarrollo de Software',
  'desarrollo de software ': 'Taller de Desarrollo de Software',
  'artes graficas': 'Artes Gráficas',
}

/** `(12:00pm)` → mediodía · `(2:00pm)` → tarde. */
function turnoDeLaHora(texto: string): 'mediodia' | 'tarde' | null {
  const t = plegar(texto)
  if (/^\(?12:/.test(t) || /^\(?1:/.test(t)) return 'mediodia'
  if (/^\(?2:/.test(t) || /^\(?3:/.test(t)) return 'tarde'
  return null
}

/**
 * `27/09/2026 12:34:56` o `2026-09-27 …` → `2026-09-27`.
 *
 * Google escribe la marca temporal en el formato de la configuración
 * regional de la hoja. En español de Colombia es día/mes/año, que es
 * indistinguible de mes/día/año hasta el día 13. Se asume día primero
 * —es lo que produce una hoja en español— y se avisa cuando el día es
 * ambiguo y el mes no.
 */
function fechaDeMarcaTemporal(texto: string): { iso: string | null; ambigua: boolean } {
  const t = texto.trim()

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return { iso: `${iso[1]}-${iso[2]}-${iso[3]}`, ambigua: false }

  const dmy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!dmy) return { iso: null, ambigua: false }

  const [, a, b, anio] = dmy
  const dia = Number(a)
  const mes = Number(b)
  if (mes > 12) return { iso: null, ambigua: false }

  return {
    iso: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    ambigua: dia <= 12,
  }
}

function aNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isNaN(n) ? null : n
}

// ---------------------------------------------------------------------------
// Identificadores derivados de la clave natural
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
interface FilaJornada {
  id: string
  fecha: string
  turno: 'mediodia' | 'tarde'
  lugar_id: string
  medidor_id: string
  integrante_id: string | null
  origen: 'importacion'
  cerrada: boolean
}

interface FilaMedicion {
  id: string
  jornada_id: string
  numero: number
  hora: string
  dato_dudoso: boolean
  nota_dudoso: string | null
  [clave: string]: unknown
}

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
  const respuestas = filas.slice(1)

  console.log(`  archivo   : ${ruta}`)
  console.log(`  columnas  : ${cabeceras.length}`)
  console.log(`  respuestas: ${respuestas.length}\n`)

  // -------------------------------------------------------------------------
  // Localizar los siete bloques
  // -------------------------------------------------------------------------
  const horas: number[] = []
  cabeceras.forEach((c, i) => {
    if (c.includes('hora de medicion')) horas.push(i)
  })

  if (horas.length !== MAXIMO_MEDICIONES) {
    console.error(
      `✖ Se esperaban ${MAXIMO_MEDICIONES} columnas «Hora de medición» y hay ${horas.length}.`
    )
    console.error('  El formulario cambió. Revíselo antes de importar.\n')
    process.exitCode = 1
    return
  }

  // Cada bloque: la hora y las diez variables que la siguen. Se comprueba
  // cabecera por cabecera: si el formulario cambió de orden, este script se
  // detiene en vez de escribir columnas corridas.
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

  const iLugar = cabeceras.findIndex((c) => c.includes('lugar de medicion'))
  const iMedidor = cabeceras.findIndex((c) => c.includes('numero de serie'))
  const iCorreo = cabeceras.findIndex((c) => c.includes('correo'))
  const iMarca = cabeceras.findIndex((c) => c.includes('marca temporal') || c.includes('timestamp'))

  if (iLugar === -1 || iMedidor === -1) {
    console.error('✖ Faltan las columnas de lugar o de medidor.\n')
    process.exitCode = 1
    return
  }

  console.log('  ✓ Las siete secciones y sus diez variables están en su sitio.\n')

  // -------------------------------------------------------------------------
  // Catálogos
  // -------------------------------------------------------------------------
  const [{ data: lugares }, { data: medidores }, { data: equipo }] = await Promise.all([
    supabase.from('lugar_medicion').select('id, nombre'),
    supabase.from('medidor').select('id, numero_serie'),
    supabase.from('integrante').select('id, correo'),
  ])

  const porLugar = new Map((lugares ?? []).map((l) => [plegar(l.nombre), l.id]))
  const porMedidor = new Map((medidores ?? []).map((m) => [m.numero_serie.slice(-2), m.id]))
  const porCorreo = new Map((equipo ?? []).map((p) => [p.correo.toLowerCase(), p.id]))

  // -------------------------------------------------------------------------
  // Convertir
  // -------------------------------------------------------------------------
  const jornadas: FilaJornada[] = []
  const mediciones: FilaMedicion[] = []
  const descartes: string[] = []
  const avisos: string[] = []
  const lugaresDesconocidos = new Set<string>()
  let sinAutor = 0
  let fechasAmbiguas = 0

  respuestas.forEach((fila, n) => {
    const renglon = n + 2 // en la hoja, contando la cabecera

    const nombreLugar = (fila[iLugar] ?? '').trim()
    const lugarId = porLugar.get(plegar(LUGARES[plegar(nombreLugar)] ?? nombreLugar))
    if (!lugarId) {
      lugaresDesconocidos.add(nombreLugar || '(vacío)')
      descartes.push(`renglón ${renglon}: lugar desconocido «${nombreLugar}»`)
      return
    }

    const serie = (fila[iMedidor] ?? '').trim().replace(/\D/g, '').slice(-2)
    const medidorId = porMedidor.get(serie)
    if (!medidorId) {
      descartes.push(`renglón ${renglon}: medidor «${fila[iMedidor] ?? ''}» no está en el catálogo`)
      return
    }

    const { iso: fecha, ambigua } = fechaDeMarcaTemporal(iMarca === -1 ? '' : (fila[iMarca] ?? ''))
    if (!fecha) {
      descartes.push(`renglón ${renglon}: no se pudo leer la fecha`)
      return
    }
    if (ambigua) fechasAmbiguas++

    // El turno sale de la hora elegida en la PRIMERA medición.
    const turno = turnoDeLaHora(fila[horas[0]] ?? '')
    if (!turno) {
      descartes.push(`renglón ${renglon}: no se pudo deducir el turno de «${fila[horas[0]] ?? ''}»`)
      return
    }

    if (!esDiaDeMedicion(fecha)) {
      avisos.push(`renglón ${renglon}: ${fecha} no es miércoles ni viernes`)
    }

    const correo = iCorreo === -1 ? '' : (fila[iCorreo] ?? '').trim().toLowerCase()
    const integranteId = porCorreo.get(correo) ?? null
    if (!integranteId) sinAutor++

    const claveJornada = `${fecha}|${turno}|${lugarId}|${medidorId}`
    const jornadaId = uuidDeterminista(`formulario|jornada|${claveJornada}`)

    let algunaMedicion = false

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
          // Un valor imposible se descarta SOLO él; las otras nueve
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

      // Una lectura sin ningún número no es una lectura: la jornada pudo
      // haberse enviado con solo cuatro de las siete rellenas.
      if (!tieneAlgo) continue

      algunaMedicion = true
      const hora = horaDelTurno(turno, m + 1)!

      mediciones.push({
        id: uuidDeterminista(`formulario|medicion|${claveJornada}|${m + 1}`),
        jornada_id: jornadaId,
        numero: m + 1,
        hora: `${hora}:00`,
        dato_dudoso: false,
        nota_dudoso: null,
        ...valores,
      })
    }

    if (!algunaMedicion) {
      descartes.push(`renglón ${renglon}: ninguna de las siete mediciones trae datos`)
      return
    }

    jornadas.push({
      id: jornadaId,
      fecha,
      turno,
      lugar_id: lugarId,
      medidor_id: medidorId,
      integrante_id: integranteId,
      origen: 'importacion',
      cerrada: true,
    })
  })

  // Dos respuestas del mismo día, turno, lugar y medidor comparten clave
  // natural: es la misma jornada enviada dos veces. Se queda una.
  const unicas = new Map(jornadas.map((j) => [j.id, j]))
  const medicionesUnicas = new Map(mediciones.map((m) => [m.id, m]))

  // -------------------------------------------------------------------------
  // Informe
  // -------------------------------------------------------------------------
  console.log(`  jornadas   : ${unicas.size}`)
  console.log(`  mediciones : ${medicionesUnicas.size}`)
  if (jornadas.length !== unicas.size) {
    console.log(`  (${jornadas.length - unicas.size} respuestas repetían jornada y se unificaron)`)
  }
  console.log(`  sin autor  : ${sinAutor} (el correo no corresponde a ningún integrante)`)

  if (fechasAmbiguas > 0) {
    console.log(`\n  ⚠️  ${fechasAmbiguas} fechas con día 12 o menor.`)
    console.log('      Se leyeron como día/mes, que es lo que produce una hoja en')
    console.log('      español. Compruebe una contra el formulario antes de confirmar.')
  }

  if (lugaresDesconocidos.size > 0) {
    console.log('\n  Lugares que no están en el catálogo:')
    for (const l of lugaresDesconocidos) console.log(`    · ${l}`)
    console.log('    Añádalos en Supabase → lugar_medicion, o corrija la tabla LUGARES.')
  }

  if (avisos.length > 0) {
    console.log(`\n  Avisos (${avisos.length}):`)
    for (const a of avisos.slice(0, 12)) console.log(`    · ${a}`)
    if (avisos.length > 12) console.log(`    … y ${avisos.length - 12} más`)
  }

  if (descartes.length > 0) {
    console.log(`\n  Descartadas (${descartes.length}):`)
    for (const d of descartes.slice(0, 12)) console.log(`    · ${d}`)
    if (descartes.length > 12) console.log(`    … y ${descartes.length - 12} más`)
  }

  if (unicas.size === 0) {
    console.log('\n✖ No hay nada que importar.\n')
    process.exitCode = 1
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

  const { error: eJ } = await supabase
    .from('jornada')
    .upsert([...unicas.values()], { onConflict: 'id', ignoreDuplicates: true })

  if (eJ) {
    console.error(`\n✖ No se pudieron guardar las jornadas: ${eJ.message}\n`)
    process.exitCode = 1
    return
  }

  // Por tandas: una sola sentencia con trescientas filas es más fácil de
  // rechazar entera, y si falla no se sabe por cuál.
  const lista = [...medicionesUnicas.values()]
  let escritas = 0
  for (let i = 0; i < lista.length; i += 100) {
    const tanda = lista.slice(i, i + 100)
    const { error } = await supabase
      .from('medicion')
      .upsert(tanda, { onConflict: 'id', ignoreDuplicates: true })

    if (error) {
      console.error(`\n✖ Falló la tanda ${i / 100 + 1}: ${error.message}`)
      console.error(`  Se escribieron ${escritas} mediciones antes del fallo.\n`)
      process.exitCode = 1
      return
    }
    escritas += tanda.length
  }

  console.log(`\n✓ ${unicas.size} jornadas y ${escritas} mediciones importadas.\n`)
  console.log('  Se pueden ver en Tableros. Las jornadas quedan cerradas y marcadas')
  console.log('  como «importacion», así que se distinguen de las tomadas en la app.\n')
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exitCode = 1
})
