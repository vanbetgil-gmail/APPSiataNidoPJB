/**
 * NIDO PJB — verifica la conexión con Supabase y que las migraciones quedaron bien.
 *
 * Se ejecuta con:
 *   pnpm verificar
 *
 * ── Qué comprueba y por qué ──────────────────────────────────────────────
 *
 * No es solo un «hola, ¿estás ahí?». Comprueba tres cosas distintas:
 *
 *  1. Que las 15 tablas, las 3 vistas y la función existan. Si una migración
 *     falló a la mitad, aquí se ve exactamente cuál.
 *  2. Que los catálogos estén sembrados.
 *  3. **Que los permisos protejan de verdad lo que deben proteger.** Esta es
 *     la parte importante: usa la clave ANÓNIMA, la misma que tendría
 *     cualquier persona en internet, y comprueba que no puede leer las
 *     mediciones ni los correos del equipo.
 *
 * Un fallo en el punto 3 significa que los datos del colegio están expuestos.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Cargar .env.local sin dependencias extra
// ---------------------------------------------------------------------------
try {
  for (const linea of readFileSync('.env.local', 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    const clave = limpia.slice(0, corte).trim()
    const valor = limpia.slice(corte + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[clave]) process.env[clave] = valor
  }
} catch {
  console.error('\n✖ No se encontró el archivo .env.local en la carpeta del proyecto.')
  console.error('  Créelo con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  console.error('  Los valores están en Supabase → Project Settings → API.\n')
  process.exit(1)
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!URL || !CLAVE) {
  console.error('\n✖ Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local\n')
  process.exit(1)
}

// El archivo se entrega con un marcador en lugar de la clave. Detectarlo aquí
// evita que el fallo aparezca más adelante como un error confuso de permisos.
if (CLAVE.includes('PEGUE_AQUI') || CLAVE.length < 40) {
  console.error('\n✖ Falta pegar la clave anónima en .env.local\n')
  console.error('  Está en Supabase → Project Settings → API → Project API keys')
  console.error('  Es la fila marcada "anon" "public": una cadena larga que empieza por eyJ...\n')
  console.error('  Abra .env.local y reemplace PEGUE_AQUI_LA_CLAVE_ANON por esa cadena.\n')
  process.exit(1)
}

const supabase = createClient(URL, CLAVE)

let fallos = 0
let avisos = 0

function ok(texto: string, detalle = '') {
  console.log(`  ✓ ${texto}${detalle ? `  ${detalle}` : ''}`)
}
function mal(texto: string, detalle = '') {
  console.log(`  ✖ ${texto}${detalle ? `\n      ${detalle}` : ''}`)
  fallos++
}
function aviso(texto: string, detalle = '') {
  console.log(`  ! ${texto}${detalle ? `\n      ${detalle}` : ''}`)
  avisos++
}
function titulo(texto: string) {
  console.log(`\n${texto}\n${'─'.repeat(texto.length)}`)
}

/** ¿La tabla existe? Se distingue «no existe» de «existe pero protegida». */
async function existe(nombre: string): Promise<'si' | 'no' | 'error'> {
  const { error } = await supabase.from(nombre).select('*', { head: true, count: 'exact' })
  if (!error) return 'si'
  // 42P01 = la relación no existe. Cualquier otro error suele ser de permisos,
  // lo que significa que la tabla SÍ está.
  if (error.code === '42P01' || /does not exist/i.test(error.message)) return 'no'
  return 'si'
}

async function main() {
  console.log(`\nNIDO PJB — verificación de la base de datos`)
  console.log(`Proyecto: ${URL}`)

  // -------------------------------------------------------------------------
  titulo('1. Conexión')
  const { error: errorConexion } = await supabase.from('configuracion').select('*').limit(1)

  if (errorConexion && /fetch|network|ENOTFOUND/i.test(errorConexion.message)) {
    mal('No se pudo conectar', errorConexion.message)
    console.log('\n  Revise que NEXT_PUBLIC_SUPABASE_URL sea correcta.\n')
    process.exit(1)
  }

  // Una clave equivocada no falla la red: Supabase responde con un error de
  // API. Sin comprobarlo aquí, todo lo demás saldría «protegido» y parecería
  // que los permisos funcionan, cuando en realidad no hay acceso a nada.
  if (errorConexion && /api key|JWT|Invalid|unauthorized/i.test(errorConexion.message)) {
    mal('La clave anónima no es válida', errorConexion.message)
    console.log('\n  Copie de nuevo la clave "anon public" desde')
    console.log('  Supabase → Project Settings → API, completa y sin espacios.\n')
    process.exit(1)
  }

  ok('Conexión establecida')

  // -------------------------------------------------------------------------
  titulo('2. Tablas (migraciones 0001 a 0004)')
  const TABLAS = [
    'configuracion', 'integrante', 'alias_historico', 'imagen_base_mapa',
    'punto_mapa', 'lugar_medicion', 'medidor', 'categoria_biodiversidad',
    'jornada', 'medicion', 'ficha_biodiversidad', 'foto_ficha',
    'vista_inmersiva', 'punto_destacado', 'punto_interes_didactico',
  ]
  const faltantes: string[] = []
  for (const tabla of TABLAS) {
    if ((await existe(tabla)) === 'no') faltantes.push(tabla)
  }
  if (faltantes.length === 0) {
    ok(`Las ${TABLAS.length} tablas existen`)
  } else {
    mal(`Faltan ${faltantes.length} tablas`, faltantes.join(', '))
    console.log('\n  → Vuelva a ejecutar las migraciones 0001 a 0004 en orden.\n')
  }

  // -------------------------------------------------------------------------
  titulo('3. Vistas públicas')
  for (const vista of ['ficha_publica', 'punto_destacado_publico', 'integrante_publico']) {
    if ((await existe(vista)) === 'si') ok(`Vista ${vista}`)
    else mal(`Falta la vista ${vista}`, 'Ejecute las migraciones 0003 y 0004.')
  }

  // -------------------------------------------------------------------------
  titulo('4. Función de comprobación de acceso')
  const { error: errorRpc } = await supabase.rpc('correo_autorizado', {
    correo_consultado: 'inexistente@ejemplo.com',
  })
  if (errorRpc && /does not exist|not find/i.test(errorRpc.message)) {
    mal('Falta la función correo_autorizado', 'Ejecute la migración 0004.')
  } else {
    ok('Función correo_autorizado disponible')
  }

  // -------------------------------------------------------------------------
  titulo('5. Catálogos sembrados')

  const { data: config } = await supabase.from('configuracion').select('*').maybeSingle()
  if (!config) {
    mal('Falta la fila de configuración', 'Ejecute supabase/seed/catalogos.sql.')
  } else {
    ok('Configuración', `dominio: @${config.dominio_institucional}`)
    if (!config.imagen_base_version_vigente) {
      aviso(
        'Todavía no hay imagen base del mapa',
        'Es correcto hasta que se vuele el dron. El mapa mostrará un mensaje explicativo.'
      )
    }
  }

  const { data: lugares } = await supabase.from('lugar_medicion').select('nombre, activo')
  if (!lugares || lugares.length === 0) {
    mal('No hay lugares de medición', 'Ejecute supabase/seed/catalogos.sql.')
  } else {
    ok(`Lugares de medición: ${lugares.length}`)
    const sinIdentificar = lugares.find((l) => l.nombre.includes('SIN IDENTIFICAR'))
    if (sinIdentificar) {
      aviso(
        'El lugar «Op» sigue sin identificar',
        'Afecta a 12 de los 135 registros históricos. Renómbrelo antes de migrar.'
      )
    }
  }

  const { data: categorias } = await supabase.from('categoria_biodiversidad').select('nombre')
  if (!categorias || categorias.length === 0) {
    mal('No hay categorías de biodiversidad')
  } else {
    ok(`Categorías: ${categorias.length}`, categorias.map((c) => c.nombre).join(', '))
  }

  aviso(
    'Los medidores no se pueden comprobar con la clave anónima',
    'Están protegidos, que es lo correcto. Véalos en Table Editor → medidor (deben ser 4).'
  )

  // -------------------------------------------------------------------------
  titulo('6. Almacenamiento de fotos')

  /*
   * ── Por qué NO se usa listBuckets() ni list() ─────────────────────────
   *
   * Ninguno de los dos sirve con la clave anónima:
   *
   *   · `listBuckets()` devuelve [] sin error, porque `storage.buckets` no
   *     es legible por un anónimo. Daría un falso «falta la cubeta».
   *   · `from(x).list()` tampoco: devuelve [] sin error TANTO si la cubeta
   *     existe como si no.
   *
   * Lo que sí distingue es pedir un archivo inexistente por HTTP:
   *
   *   cubeta existente  → "NoSuchKey" / "Object not found"
   *   cubeta ausente    → "Bucket not found"
   */
  try {
    const respuesta = await fetch(`${URL}/storage/v1/object/public/fotos-fichas/_inexistente`)
    const cuerpo = await respuesta.text()
    if (/bucket not found/i.test(cuerpo)) {
      mal('Falta la cubeta fotos-fichas', 'Ejecute la migración 0004.')
    } else {
      ok('Cubeta fotos-fichas creada y pública')
    }
  } catch {
    aviso('No se pudo comprobar el almacenamiento', 'Véalo en Storage → Buckets.')
  }

  // -------------------------------------------------------------------------
  titulo('7. SEGURIDAD — lo que un visitante NO debe poder ver')
  console.log('  (se usa la clave anónima: lo mismo que tendría cualquiera en internet)\n')

  // FR-015: las mediciones nunca son públicas.
  const { data: mediciones, error: errorMediciones } = await supabase.from('medicion').select('*')
  if (errorMediciones) {
    ok('medicion: acceso denegado')
  } else if ((mediciones ?? []).length === 0) {
    ok('medicion: devuelve 0 filas a un anónimo')
  } else {
    mal(
      `¡FUGA! medicion devuelve ${mediciones!.length} filas a cualquiera en internet`,
      'Revise la migración 0003: falta activar RLS o sobra una política.'
    )
  }

  const { data: jornadas, error: errorJornadas } = await supabase.from('jornada').select('*')
  if (errorJornadas || (jornadas ?? []).length === 0) {
    ok('jornada: sin acceso anónimo')
  } else {
    mal(`¡FUGA! jornada devuelve ${jornadas!.length} filas a cualquiera`)
  }

  // FR-051: los correos jamás salen al público.
  const { data: integrantes, error: errorIntegrantes } = await supabase
    .from('integrante')
    .select('correo')
  if (errorIntegrantes || (integrantes ?? []).length === 0) {
    ok('integrante: los correos no son legibles por un anónimo')
  } else {
    mal(
      `¡FUGA DE CORREOS! integrante devuelve ${integrantes!.length} filas`,
      'Son datos personales de menores. Revise la migración 0003 de inmediato.'
    )
  }

  // La vista pública SÍ debe funcionar, y sin exponer correos.
  const { data: publicos, error: errorPublicos } = await supabase
    .from('integrante_publico')
    .select('*')
  if (errorPublicos) {
    mal('La vista integrante_publico no es legible', 'La página de créditos no funcionará.')
  } else {
    const conCorreo = JSON.stringify(publicos ?? []).includes('@')
    if (conCorreo) {
      mal('¡FUGA! integrante_publico contiene una arroba', 'No debería incluir correos.')
    } else {
      ok(`integrante_publico: legible y sin correos`, `(${(publicos ?? []).length} personas visibles)`)
    }
  }

  // FR-005: el mapa público SÍ debe leerse sin cuenta.
  const { error: errorFichas } = await supabase.from('ficha_publica').select('*')
  if (errorFichas) {
    mal('El mapa público NO es legible sin cuenta', 'Rompe FR-005: el mapa debe ser público.')
  } else {
    ok('ficha_publica: legible sin cuenta, como debe ser')
  }

  // -------------------------------------------------------------------------
  titulo('Resultado')
  if (fallos === 0) {
    console.log(`\n  ✓ Todo correcto${avisos > 0 ? `, con ${avisos} aviso${avisos === 1 ? '' : 's'}` : ''}.`)
    console.log('\n  Siguiente paso: pnpm dev y abrir http://localhost:3000\n')
  } else {
    console.log(`\n  ✖ ${fallos} problema${fallos === 1 ? '' : 's'} que resolver antes de seguir.\n`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exit(1)
})
