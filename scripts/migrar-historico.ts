/**
 * NIDO PJB — migra el histórico de MEDIDORES.xlsx a la base de datos.
 *
 * Se ejecuta con:
 *   pnpm migrar:historico            (previsualiza, no escribe nada)
 *   pnpm migrar:historico --escribir (aplica)
 *
 * Implementa `contracts/import-export.md`. FR-028 a FR-031c.
 *
 * ── Previsualiza antes de escribir, siempre ──────────────────────────────
 *
 * Sin `--escribir` no toca la base: cuenta, normaliza, agrupa y muestra el
 * resultado. Es la exigencia de FR-031b, y sirve para lo que sirve: nadie
 * debería aplicar una migración de 135 registros sin ver antes cuántos se
 * aceptan, cuántos se corrigen y cuántos se rechazan.
 *
 * ── Es idempotente ───────────────────────────────────────────────────────
 *
 * La clave natural de una medición es (fecha, hora, lugar, medidor). Dos
 * lecturas del mismo aparato, en el mismo sitio y el mismo minuto, son la
 * misma lectura. Ejecutarlo dos veces deja la base idéntica (SC-015).
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

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

const ESCRIBIR = process.argv.includes('--escribir')
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !CLAVE || CLAVE.length < 40) {
  console.error('\n✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local\n')
  process.exit(1)
}

const supabase = createClient(URL, CLAVE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Normalizaciones — contracts/import-export.md §«Normalizaciones obligatorias»
// ---------------------------------------------------------------------------

/**
 * Convierte a número lo que el formulario capturó como texto.
 *
 * La distinción entre `0` y `null` es la más delicada de toda la
 * importación: un vacío convertido en cero falsearía a la baja todos los
 * promedios de los tableros, y nadie lo notaría nunca (FR-025).
 */
function aNumero(bruto: unknown): number | null {
  if (bruto === null || bruto === undefined || bruto === '') return null
  if (typeof bruto === 'number') return Number.isFinite(bruto) ? bruto : null

  const texto = String(bruto).trim()
  if (!texto) return null
  if (/^(n\/a|na|-{1,2}|\.)$/i.test(texto)) return null

  // «27°» → 27. Quita símbolos de cola, no dígitos internos.
  const limpio = texto.replace(',', '.').replace(/[^0-9.\-]+$/, '')
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

/** Sin tildes, sin dobles espacios, sin mayúsculas: para comparar nombres. */
function plegar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** `9032` → `32`. El prefijo 90 es un artefacto de captura, no otro equipo. */
function normalizarSerie(bruto: unknown): string | null {
  if (bruto === null || bruto === undefined || bruto === '') return null
  const s = String(bruto).trim().replace(/\.0+$/, '')
  if (!/^\d+$/.test(s)) return null
  return s.length === 4 && s.startsWith('90') ? s.slice(2) : s
}

/** `(12:00pm)` → `12:00:00`. El formulario guardó la hora con paréntesis. */
function normalizarHora(bruto: unknown): string | null {
  if (!bruto) return null
  const s = String(bruto).trim().replace(/[()]/g, '').toLowerCase()
  const m = s.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?/)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  if (m[3] === 'pm' && h < 12) h += 12
  if (m[3] === 'am' && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`
}

/**
 * Convierte a fecha lo que Excel guarda como número de serie.
 *
 * `MarcaTemporalEnvio` no llega como texto ni como fecha, sino como
 * `45884.544…`: días transcurridos desde el 30 de diciembre de 1899, con la
 * fracción representando la hora. Leerlo como cadena da `null` y rechaza
 * las 98 filas buenas del archivo.
 *
 * La conversión se hace en UTC a propósito. Dejar que `Date` interprete el
 * número en la zona horaria de la máquina haría que las jornadas de las
 * primeras horas cayeran en el día anterior o posterior según dónde se
 * ejecute la migración, y el histórico quedaría fechado distinto en cada
 * computador.
 */
const EPOCA_EXCEL_MS = Date.UTC(1899, 11, 30)

function aFechaISO(bruto: unknown): string | null {
  if (bruto instanceof Date) return bruto.toISOString().slice(0, 10)

  if (typeof bruto === 'number' && Number.isFinite(bruto)) {
    const ms = EPOCA_EXCEL_MS + Math.floor(bruto) * 86_400_000
    return new Date(ms).toISOString().slice(0, 10)
  }

  const s = String(bruto ?? '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? m[0] : null
}

// ---------------------------------------------------------------------------
interface FilaCruda {
  marca: string
  fecha: string | null
  numero: number | null
  hora: string | null
  variables: Record<string, number | null>
  lugarBruto: string
  serieBruta: string
  aliasBruto: string
}

const VARIABLES = [
  'pm1',
  'pm25',
  'pm10',
  'hcho',
  'tvoc',
  'humedad_relativa',
  'temperatura',
  'particulas_litro',
  'co2',
  'aqi_medidor',
] as const

function leerExcel(): FilaCruda[] {
  const libro = XLSX.readFile('MEDIDORES.xlsx')

  if (!libro.SheetNames.includes('LongData')) {
    console.error('\n✖ El archivo no contiene la hoja LongData.\n')
    process.exit(1)
  }

  const filas = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets['LongData'], {
    header: 1,
    raw: true,
    defval: null,
  })

  /*
   * El emparejamiento de columnas es POR POSICIÓN.
   *
   * No por el texto del encabezado: en el archivo original la unidad «µg»
   * llega corrompida por un problema de codificación y se lee «ท่g». Si se
   * buscara por nombre, ninguna de las columnas de partículas coincidiría.
   */
  const salida: FilaCruda[] = []

  for (const fila of filas.slice(1)) {
    // La hoja declara 999 filas y solo 135 tienen datos: el resto es relleno.
    // Recorrerla tal cual crearía 864 jornadas fantasma.
    if (!fila || fila.every((v) => v === null || v === '')) continue

    const en = (i: number) => (i < fila.length ? fila[i] : null)

    const variables: Record<string, number | null> = {}
    VARIABLES.forEach((nombre, i) => {
      variables[nombre] = aNumero(en(3 + i))
    })

    salida.push({
      marca: String(en(0) ?? '').trim(),
      fecha: aFechaISO(en(0)),
      numero: aNumero(en(1)),
      hora: normalizarHora(en(2)),
      variables,
      lugarBruto: String(en(13) ?? '').trim(),
      serieBruta: String(en(14) ?? '').trim(),
      aliasBruto: String(en(15) ?? '').trim().split('@')[0],
    })
  }

  return salida
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('\nNIDO PJB — migración del histórico')
  console.log(ESCRIBIR ? 'MODO ESCRITURA\n' : 'Previsualización. No se escribirá nada.\n')

  const crudas = leerExcel()
  console.log(`Filas con datos en LongData: ${crudas.length}`)

  const [{ data: lugares }, { data: medidores }, { data: alias }] = await Promise.all([
    supabase.from('lugar_medicion').select('id, nombre'),
    supabase.from('medidor').select('id, numero_serie'),
    supabase.from('alias_historico').select('alias, integrante_id'),
  ])

  if (!lugares?.length || !medidores?.length) {
    console.error('\n✖ Faltan los catálogos. Ejecute supabase/seed/catalogos.sql\n')
    process.exit(1)
  }

  const porLugar = new Map(lugares.map((l) => [plegar(l.nombre), l.id]))
  // «Op» no es un lugar real; la semilla lo dejó con nombre de marcador.
  const idOp = lugares.find((l) => l.nombre.includes('Op'))?.id ?? null
  const porSerie = new Map(medidores.map((m) => [m.numero_serie, m.id]))
  const porAlias = new Map((alias ?? []).map((a) => [a.alias.toLowerCase(), a.integrante_id]))

  const aceptadas: {
    fila: FilaCruda
    lugarId: string
    medidorId: string
    integranteId: string | null
    dudoso: boolean
  }[] = []
  const rechazadas: { fila: FilaCruda; motivo: string }[] = []
  let sinAutor = 0

  for (const fila of crudas) {
    if (!fila.lugarBruto || !fila.serieBruta) {
      rechazadas.push({ fila, motivo: 'sin lugar ni medidor' })
      continue
    }
    if (!fila.fecha || !fila.hora) {
      rechazadas.push({ fila, motivo: 'sin fecha u hora legible' })
      continue
    }

    const plegado = plegar(fila.lugarBruto)
    let lugarId = porLugar.get(plegado) ?? null
    let dudoso = false

    if (!lugarId) {
      // Coincidencia laxa: «Taller - Mecánica industrial» → «Taller de
      // Mecánica Industrial». Se compara por las palabras significativas.
      const candidato = lugares.find((l) => {
        const a = plegar(l.nombre).replace(/\b(de|del|la|el)\b/g, '').replace(/\s+/g, ' ').trim()
        const b = plegado.replace(/[-–]/g, ' ').replace(/\b(de|del|la|el)\b/g, '').replace(/\s+/g, ' ').trim()
        return a === b
      })
      lugarId = candidato?.id ?? null
    }

    if (!lugarId && plegado === 'op') {
      // FR-031: no se adivina a qué lugar corresponde. Entra marcado como
      // dudoso para poder excluirlo de los análisis hasta que se resuelva.
      lugarId = idOp
      dudoso = true
    }

    if (!lugarId) {
      rechazadas.push({ fila, motivo: `lugar desconocido: «${fila.lugarBruto}»` })
      continue
    }

    const serie = normalizarSerie(fila.serieBruta)
    const medidorId = serie ? (porSerie.get(serie) ?? null) : null
    if (!medidorId) {
      rechazadas.push({ fila, motivo: `medidor desconocido: «${fila.serieBruta}»` })
      continue
    }

    const integranteId = porAlias.get(fila.aliasBruto.toLowerCase()) ?? null
    if (!integranteId) sinAutor++

    aceptadas.push({ fila, lugarId, medidorId, integranteId, dudoso })
  }

  // --- Agrupación en jornadas (FR-019) -------------------------------------
  // La clave lleva la marca temporal COMPLETA, con hora. El archivo tiene 22
  // marcas repartidas en 13 días: agrupar por día fundiría los envíos de un
  // mismo día en una sola jornada y perdería dos.
  const jornadas = new Map<string, { lugarId: string; medidorId: string; integranteId: string | null; fecha: string; filas: typeof aceptadas }>()

  for (const a of aceptadas) {
    const clave = `${a.fila.marca}|${a.lugarId}|${a.medidorId}|${a.integranteId ?? ''}`
    if (!jornadas.has(clave)) {
      jornadas.set(clave, {
        lugarId: a.lugarId,
        medidorId: a.medidorId,
        integranteId: a.integranteId,
        fecha: a.fila.fecha!,
        filas: [],
      })
    }
    jornadas.get(clave)!.filas.push(a)
  }

  // --- Informe -------------------------------------------------------------
  console.log(`\n  aceptadas  ${String(aceptadas.length).padStart(4)}`)
  console.log(`  rechazadas ${String(rechazadas.length).padStart(4)}`)
  console.log(`  jornadas   ${String(jornadas.size).padStart(4)}`)
  console.log(`  sin autor  ${String(sinAutor).padStart(4)}   (FR-030b)`)
  console.log(`  dudosas    ${String(aceptadas.filter((a) => a.dudoso).length).padStart(4)}   (lugar «Op» sin resolver)`)

  const motivos = new Map<string, number>()
  for (const r of rechazadas) motivos.set(r.motivo, (motivos.get(r.motivo) ?? 0) + 1)
  if (motivos.size > 0) {
    console.log('\n  Motivos de rechazo:')
    for (const [m, n] of motivos) console.log(`    ${String(n).padStart(4)}  ${m}`)
  }

  if (!ESCRIBIR) {
    console.log('\n  Nada se escribió. Para aplicar:\n')
    console.log('    pnpm migrar:historico --escribir\n')
    return
  }

  // --- Escritura -----------------------------------------------------------
  console.log('\nEscribiendo…')

  const { data: yaExisten } = await supabase.from('medicion').select('id')
  const existentes = new Set((yaExisten ?? []).map((m) => m.id))

  let nuevasJornadas = 0
  let nuevasMediciones = 0
  let duplicadas = 0

  for (const [clave, j] of jornadas) {
    /*
     * El identificador de la jornada también se DERIVA de su clave natural.
     *
     * Con un `randomUUID()` las mediciones se deduplicaban —su clave natural
     * ya era estable— pero cada ejecución creaba otras 15 jornadas, esta vez
     * vacías, porque ninguna medición las llegaba a poblar. El histórico
     * habría acumulado jornadas fantasma cada vez que alguien reejecutara la
     * migración, y el conteo de jornadas de los tableros habría subido solo.
     *
     * Deduplicar las hojas y no las ramas no es deduplicar.
     */
    const jornadaId = uuidDeterminista(`jornada|${clave}`)

    const { error: eJ } = await supabase.from('jornada').upsert(
      {
        id: jornadaId,
        fecha: j.fecha,
        lugar_id: j.lugarId,
        medidor_id: j.medidorId,
        integrante_id: j.integranteId,
        cerrada: true,
        origen: 'migracion',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    if (eJ) {
      console.log(`  ✖ jornada ${j.fecha}: ${eJ.message}`)
      continue
    }
    nuevasJornadas++

    for (const a of j.filas) {
      /*
       * El identificador se DERIVA de la clave natural, no es aleatorio.
       *
       * Así, reimportar el mismo archivo genera exactamente los mismos
       * identificadores y el `insert` choca contra la clave primaria en vez
       * de duplicar. Es lo que hace la migración repetible (SC-015).
       */
      const clave = `${a.fila.fecha}|${a.fila.hora}|${a.lugarId}|${a.medidorId}`
      const id = uuidDeterminista(clave)

      if (existentes.has(id)) {
        duplicadas++
        continue
      }

      const { error: eM } = await supabase.from('medicion').insert({
        id,
        jornada_id: jornadaId,
        numero: a.fila.numero ?? 0,
        hora: a.fila.hora!,
        ...a.fila.variables,
        dato_dudoso: a.dudoso,
        nota_dudoso: a.dudoso
          ? 'Lugar registrado como «Op» en el archivo original, sin identificar.'
          : null,
      })

      if (eM) console.log(`  ✖ medición ${a.fila.fecha} ${a.fila.hora}: ${eM.message}`)
      else nuevasMediciones++
    }
  }

  console.log(`\n✓ ${nuevasJornadas} jornadas y ${nuevasMediciones} mediciones insertadas.`)
  if (duplicadas > 0) console.log(`  ${duplicadas} ya estaban y se omitieron.`)
  console.log()
}

/** UUID v5-ish estable a partir de un texto, sin dependencias externas. */
function uuidDeterminista(texto: string): string {
  // FNV-1a de 128 bits, suficiente para derivar un identificador estable de
  // una clave natural que en este conjunto tiene 135 valores distintos.
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
    // Versión 5 y variante RFC 4122, para que sea un UUID válido.
    '5' + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-')
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exit(1)
})
