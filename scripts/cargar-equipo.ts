/**
 * NIDO PJB — da de alta al equipo desde un archivo local.
 *
 * Se ejecuta con:
 *   pnpm cargar-equipo
 *
 * Lee `datos-colegio/equipo.csv`, que NUNCA se sube al repositorio, y crea en
 * Supabase las cuentas, las filas de `integrante` y la correspondencia con los
 * alias del histórico.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Tres razones, y las tres importan:
 *
 * 1. **No envía ningún correo.** `auth.admin.createUser` crea la cuenta
 *    directamente. El botón «Invite user» del panel sí envía, y el servicio
 *    integrado de Supabase solo permite 2 correos por hora y únicamente a
 *    miembros del equipo del proyecto. Por esta vía no hay límite ni espera.
 *
 * 2. **Los datos no pasan por el repositorio.** El repositorio es público y
 *    estos son correos institucionales de menores de edad.
 *
 * 3. **Deja la autoría del histórico lista.** Rellena `alias_historico`, que
 *    es lo que conecta cada estudiante con las mediciones que ya hizo.
 *
 * ── Sobre la clave que usa ───────────────────────────────────────────────
 *
 * Necesita `SUPABASE_SERVICE_ROLE_KEY`, la única capaz de crear cuentas.
 * Sortea todos los permisos de la base de datos, así que:
 *
 *   · Se usa SOLO aquí, a mano, desde su computador.
 *   · NUNCA se configura en Vercel.
 *   · Vive en `.env.local`, que no se versiona.
 */

import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync } from 'node:fs'

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
const CLAVE_SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL) {
  console.error('\n✖ Falta NEXT_PUBLIC_SUPABASE_URL en .env.local\n')
  process.exit(1)
}

if (!CLAVE_SERVICIO || CLAVE_SERVICIO.length < 40) {
  console.error('\n✖ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local\n')
  console.error('  Está en Supabase → Project Settings → API → Project API keys')
  console.error('  Es la fila marcada "service_role" "secret". Hay que revelarla con el ojo.\n')
  console.error('  Añada esta línea a .env.local (descomentando la que ya está):\n')
  console.error('    SUPABASE_SERVICE_ROLE_KEY=eyJ...\n')
  console.error('  ⚠️  Esta clave sortea TODOS los permisos de la base de datos.')
  console.error('      No la configure en Vercel ni la comparta. Solo vive aquí.\n')
  process.exit(1)
}

const supabase = createClient(URL, CLAVE_SERVICIO, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Lectura del CSV
// ---------------------------------------------------------------------------
interface FilaEquipo {
  correo: string
  nombre: string
  rol: 'integrante' | 'responsable'
  menorEdad: boolean
  alias: string
}

/**
 * Busca el archivo del equipo en `datos-colegio/`.
 *
 * Acepta cualquier `.csv` que no sea la plantilla, en lugar de exigir un
 * nombre exacto: obligar a renombrar un archivo ya rellenado es una fricción
 * innecesaria, y equivocarse de nombre da un error que no dice nada.
 */
function buscarCsv(): string {
  const carpeta = 'datos-colegio'
  let candidatos: string[]
  try {
    candidatos = readdirSync(carpeta).filter(
      (f) => f.toLowerCase().endsWith('.csv') && !f.includes('.ejemplo.')
    )
  } catch {
    candidatos = []
  }

  if (candidatos.length === 0) {
    console.error(`\n✖ No se encontró ningún archivo de equipo en ${carpeta}/\n`)
    console.error('  Copie datos-colegio/equipo.ejemplo.csv, renómbrelo (por ejemplo')
    console.error('  equipo.csv) y rellénelo con los datos reales.')
    console.error('  Ver datos-colegio/LEEME.md\n')
    process.exit(1)
  }

  if (candidatos.length > 1) {
    console.error(`\n✖ Hay varios archivos posibles en ${carpeta}/:\n`)
    candidatos.forEach((c) => console.error(`    ${c}`))
    console.error('\n  Deje solo el que quiere cargar.\n')
    process.exit(1)
  }

  return `${carpeta}/${candidatos[0]}`
}

/**
 * Decodifica el CSV sin importar cómo lo guardó Excel.
 *
 * Excel en español, sobre Windows, guarda los «.csv» en ANSI (windows-1252) a
 * menos que se elija a mano «CSV UTF-8». Y leer ese archivo como UTF-8 no da
 * error: convierte en silencio cada tilde en un carácter de reemplazo, así
 * que «García» se guardaría en la base de datos como «Garc□a», donde ya no
 * hay manera de recuperar el nombre.
 *
 * Un nombre propio mal escrito no es un detalle cosmético cuando la pantalla
 * la va a ver su dueño. Así que la codificación se decide por el contenido y
 * no por confianza: se intenta UTF-8 en modo estricto —que sí falla ante
 * bytes imposibles— y solo si el archivo no lo es se relee como windows-1252.
 */
function decodificar(bytes: Buffer): { texto: string; codificacion: string } {
  try {
    return {
      texto: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      codificacion: 'UTF-8',
    }
  } catch {
    return {
      texto: new TextDecoder('windows-1252').decode(bytes),
      codificacion: 'ANSI (windows-1252)',
    }
  }
}

function leerEquipo(): { filas: FilaEquipo[]; ruta: string; codificacion: string } {
  const RUTA_CSV = buscarCsv()
  // Excel guarda los CSV con marca de orden de bytes al principio, y sin
  // quitarla la primera columna se llamaría "﻿correo" y no coincidiría con nada.
  const { texto: bruto, codificacion } = decodificar(readFileSync(RUTA_CSV))
  const texto = bruto.replace(/^﻿/, '')

  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  const filas: FilaEquipo[] = []

  // Se salta la cabecera.
  for (const [i, linea] of lineas.slice(1).entries()) {
    const campos = linea.split(',').map((c) => c.trim())
    if (campos.length < 4) {
      console.error(`✖ Línea ${i + 2}: faltan columnas. Se esperan 5 separadas por comas.`)
      process.exit(1)
    }
    const [correo, nombre, rol, menor, alias = ''] = campos

    if (!correo.includes('@')) {
      console.error(`✖ Línea ${i + 2}: «${correo}» no parece un correo.`)
      process.exit(1)
    }
    if (rol !== 'integrante' && rol !== 'responsable') {
      console.error(`✖ Línea ${i + 2}: el rol debe ser «integrante» o «responsable», no «${rol}».`)
      process.exit(1)
    }

    filas.push({
      correo: correo.toLowerCase(),
      nombre,
      rol,
      menorEdad: /^s[ií]$/i.test(menor),
      alias: alias.trim(),
    })
  }

  return { filas, ruta: RUTA_CSV, codificacion }
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('\nNIDO PJB — alta del equipo\n')

  const { filas: equipo, ruta, codificacion } = leerEquipo()
  console.log(`Leídas ${equipo.length} personas de ${ruta} (${codificacion})\n`)

  // Última red antes de escribir: si a pesar de todo quedó algún carácter de
  // reemplazo, es que el archivo tiene una codificación que no reconocemos.
  // Mejor parar que grabar nombres roscados que nadie va a poder corregir
  // después sin acceso a la base de datos.
  const rotos = equipo.filter((p) => p.nombre.includes('�'))
  if (rotos.length > 0) {
    console.error('✖ Estos nombres llegaron con caracteres ilegibles:\n')
    rotos.forEach((p) => console.error(`    ${p.nombre}`))
    console.error('\n  Vuelva a guardar el CSV desde Excel eligiendo el tipo')
    console.error('  «CSV UTF-8 (delimitado por comas)» y ejecute de nuevo.\n')
    process.exit(1)
  }

  // Los nombres se muestran para que pueda revisar las tildes antes de crear
  // nada: es el único momento en que corregirlas cuesta solo reescribir el CSV.
  console.log('Revise que los nombres estén bien escritos:')
  equipo.forEach((p) => {
    const marca = p.rol === 'responsable' ? '★' : '·'
    console.log(`  ${marca} ${p.nombre}${p.alias ? `  (alias: ${p.alias})` : ''}`)
  })
  console.log()

  // Comprobación previa: el dominio y el responsable.
  const { data: config } = await supabase
    .from('configuracion')
    .select('dominio_institucional')
    .maybeSingle()

  if (!config) {
    console.error('✖ No se encontró la configuración. ¿Ejecutó supabase/seed/catalogos.sql?\n')
    process.exit(1)
  }

  const dominio = config.dominio_institucional.toLowerCase()
  const ajenos = equipo.filter((p) => p.correo.split('@')[1] !== dominio)
  if (ajenos.length > 0) {
    console.error(`✖ Estos correos no son del dominio @${dominio}:\n`)
    ajenos.forEach((p) => console.error(`    ${p.correo}`))
    console.error('\n  Corrija el CSV, o cambie el dominio en la tabla `configuracion`.\n')
    process.exit(1)
  }

  if (!equipo.some((p) => p.rol === 'responsable')) {
    console.error('✖ Ninguna persona tiene el rol «responsable».\n')
    console.error('  Hace falta al menos una: es quien aprueba la primera publicación')
    console.error('  de cada ficha de biodiversidad. Normalmente el docente.\n')
    process.exit(1)
  }

  // Cuentas ya existentes, para no duplicar.
  const { data: existentes } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  const porCorreo = new Map(
    (existentes?.users ?? []).map((u) => [(u.email ?? '').toLowerCase(), u.id])
  )

  let responsableId = ''
  const alias: { alias: string; integrante_id: string }[] = []

  for (const persona of equipo) {
    let id = porCorreo.get(persona.correo)

    if (id) {
      console.log(`  · ${persona.correo.padEnd(42)} ya tenía cuenta`)
    } else {
      // `email_confirm: true` marca el correo como verificado sin enviar nada.
      // Es lo que evita el límite de 2 correos por hora del servicio integrado.
      const { data, error } = await supabase.auth.admin.createUser({
        email: persona.correo,
        email_confirm: true,
        user_metadata: { nombre: persona.nombre },
      })
      if (error || !data.user) {
        console.log(`  ✖ ${persona.correo.padEnd(42)} ${error?.message ?? 'error desconocido'}`)
        continue
      }
      id = data.user.id
      console.log(`  ✓ ${persona.correo.padEnd(42)} cuenta creada`)
    }

    const { error: errorFila } = await supabase.from('integrante').upsert(
      {
        id,
        correo: persona.correo,
        nombre: persona.nombre,
        rol: persona.rol,
        es_menor_edad: persona.menorEdad,
        // Se deja en false a propósito: la autorización del acudiente la
        // registra el responsable desde /admin/autorizaciones, cuando exista
        // el documento firmado (FR-051d).
        autorizacion_acudiente: false,
        activo: true,
      },
      { onConflict: 'id' }
    )

    if (errorFila) {
      console.log(`    ✖ no se pudo crear su ficha de integrante: ${errorFila.message}`)
      continue
    }

    if (persona.rol === 'responsable' && !responsableId) responsableId = id
    if (persona.alias) alias.push({ alias: persona.alias, integrante_id: id })
  }

  // La correspondencia con el histórico (FR-030, FR-030a).
  if (alias.length > 0 && responsableId) {
    console.log(`\nVinculando ${alias.length} alias del histórico…`)
    const { error } = await supabase.from('alias_historico').upsert(
      alias.map((a) => ({ ...a, registrado_por: responsableId })),
      { onConflict: 'alias' }
    )
    if (error) console.log(`  ✖ ${error.message}`)
    else console.log('  ✓ Autoría del histórico lista para migrar')
  }

  // Recuento final leído de la base, no de lo que creemos haber hecho.
  const { count } = await supabase
    .from('integrante')
    .select('id', { count: 'exact', head: true })
    .eq('activo', true)

  console.log(`\n✓ ${count ?? 0} integrantes activos en la base de datos.\n`)
  console.log('  Cada persona entra desde /login pidiendo un enlace a su correo.')
  console.log('  Para que ese enlace llegue hace falta el SMTP propio (paso 4.4b).\n')
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exit(1)
})
