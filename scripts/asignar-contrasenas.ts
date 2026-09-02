/**
 * NIDO PJB — asigna contraseñas iniciales al equipo.
 *
 * Se ejecuta con:
 *   pnpm asignar-contrasenas
 *
 * Genera una contraseña nueva para cada integrante, la guarda en Supabase y
 * escribe la lista en `datos-colegio/contrasenas-iniciales.txt` para que el
 * docente responsable la reparta.
 *
 * ── Por qué el archivo y no la pantalla ──────────────────────────────────
 *
 * Porque la terminal se cierra, se desplaza y se pierde. Una contraseña que
 * solo existió en un renglón que ya se fue obliga a repetir todo el proceso.
 *
 * Ese archivo es material sensible: contiene la llave de once cuentas, nueve
 * de ellas de menores de edad. Vive en `datos-colegio/`, que git ignora
 * entero, y debe borrarse en cuanto termine el reparto.
 *
 * ── Sobre las contraseñas que genera ─────────────────────────────────────
 *
 * Tres palabras y tres cifras, del estilo `salvia-roble-nido-472`. Es un
 * formato que se puede dictar en voz alta sin deletrear y escribir en el
 * teclado de un celular sin equivocarse, que es exactamente lo que va a
 * pasar. Las palabras se eligen con `randomInt`, que usa el generador
 * criptográfico del sistema y no `Math.random`.
 *
 * Son temporales por diseño: la pantalla /cuenta permite cambiarlas, y
 * conviene que cada quien lo haga el primer día.
 */

import { randomInt } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

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

if (!URL || !CLAVE_SERVICIO || CLAVE_SERVICIO.length < 40) {
  console.error('\n✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  console.error('\n  La clave "service_role" está en Supabase → Project Settings → API.')
  console.error('  Si la dejó comentada con #, quítele la almohadilla mientras ejecuta esto.\n')
  process.exit(1)
}

const supabase = createClient(URL, CLAVE_SERVICIO, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------

/**
 * Palabras sin tildes ni eñes a propósito: van a escribirse en teclados de
 * celular, donde cada carácter especial es una ocasión más de fallar.
 */
const PALABRAS = [
  'salvia', 'roble', 'nido', 'hoja', 'cedro', 'lluvia', 'brisa', 'musgo',
  'helecho', 'cielo', 'colibri', 'ceiba', 'raiz', 'polen', 'nube', 'rocio',
  'guayacan', 'yarumo', 'orquidea', 'bosque', 'semilla', 'arena', 'piedra',
  'rama', 'flor', 'fruto', 'valle', 'monte', 'rio', 'aire', 'sol', 'luna',
  'tierra', 'agua', 'verde', 'aurora', 'sendero', 'jardin', 'huerta', 'nogal',
  'sauce', 'laurel', 'palma', 'junco', 'trebol', 'cardo', 'brote', 'savia',
  'corteza', 'niebla', 'escarcha', 'trino', 'vuelo', 'pluma', 'garza',
  'tucan', 'mirlo', 'azulejo', 'gorrion', 'abeja', 'libelula', 'grillo',
  'luciernaga', 'mariposa',
] as const

function generarContrasena(): string {
  const tomadas: string[] = []
  while (tomadas.length < 3) {
    const p = PALABRAS[randomInt(PALABRAS.length)]
    if (!tomadas.includes(p)) tomadas.push(p)
  }
  return `${tomadas.join('-')}-${randomInt(100, 1000)}`
}

// ---------------------------------------------------------------------------
async function main() {
  const soloEste = process.argv[2]?.toLowerCase()

  console.log('\nNIDO PJB — contraseñas iniciales\n')

  const { data: equipo, error } = await supabase
    .from('integrante')
    .select('id, correo, nombre, rol')
    .eq('activo', true)
    .order('rol')

  if (error) {
    console.error('✖ No se pudo leer el equipo:', error.message, '\n')
    process.exit(1)
  }

  const objetivo = soloEste ? (equipo ?? []).filter((p) => p.correo === soloEste) : (equipo ?? [])

  if (objetivo.length === 0) {
    console.error(
      soloEste
        ? `✖ No hay ningún integrante activo con el correo «${soloEste}».\n`
        : '✖ No hay integrantes activos. Ejecute antes `pnpm cargar-equipo`.\n'
    )
    process.exit(1)
  }

  if (soloEste) {
    console.log(`Restableciendo solo la contraseña de ${soloEste}.\n`)
  } else {
    console.log(`Se generará una contraseña nueva para ${objetivo.length} personas.`)
    console.log('Las contraseñas anteriores dejarán de servir.\n')
  }

  const asignadas: { nombre: string; correo: string; rol: string; contrasena: string }[] = []

  for (const persona of objetivo) {
    const contrasena = generarContrasena()
    const { error: e } = await supabase.auth.admin.updateUserById(persona.id, {
      password: contrasena,
    })

    if (e) {
      console.log(`  ✖ ${persona.correo.padEnd(40)} ${e.message}`)
      continue
    }

    console.log(`  ✓ ${persona.correo.padEnd(40)} lista`)
    asignadas.push({ ...persona, contrasena })
  }

  if (asignadas.length === 0) {
    console.log('\n✖ No se asignó ninguna contraseña.\n')
    process.exit(1)
  }

  // -------------------------------------------------------------------------
  // El archivo para repartir
  // -------------------------------------------------------------------------
  const RUTA = 'datos-colegio/contrasenas-iniciales.txt'
  const ancho = Math.max(...asignadas.map((a) => a.nombre.length))

  const contenido = [
    'NIDO PJB — contraseñas iniciales',
    `Generadas el ${new Date().toLocaleString('es-CO')}`,
    '',
    'Entregue a cada persona SOLO la suya, y pídale que la cambie el primer',
    'día desde el menú de su cuenta. Borre este archivo cuando termine.',
    '',
    ''.padEnd(ancho + 62, '─'),
    // El rol va ANTES de la contraseña, no después: si fuera al final, la
    // última palabra de la fila del responsable sería «(responsable)» y
    // cualquiera que lea de derecha a izquierda —una persona con prisa o un
    // script— tomaría eso por la contraseña.
    ...asignadas.map(
      (a) =>
        `${a.nombre.padEnd(ancho)}  ${a.rol === 'responsable' ? '(responsable)' : '             '}  ` +
        `${a.correo.padEnd(40)}  ${a.contrasena}`
    ),
    ''.padEnd(ancho + 62, '─'),
  ].join('\n')

  writeFileSync(RUTA, contenido + '\n', 'utf8')

  console.log(`\n✓ ${asignadas.length} contraseñas escritas en ${RUTA}`)
  console.log('\n  ⚠️  Ese archivo abre todas esas cuentas. No lo suba a ningún sitio,')
  console.log('      no lo envíe por WhatsApp y bórrelo cuando termine de repartir.')
  console.log('      Git lo ignora, así que no llegará al repositorio.\n')
  console.log('  Cada persona entra en /login con su correo y su contraseña,')
  console.log('  y la cambia desde /cuenta.\n')
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exit(1)
})
