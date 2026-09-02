/**
 * NIDO PJB — revisa que no se suba ningún secreto al repositorio.
 *
 * Se ejecuta con:
 *   pnpm revisar
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * El repositorio del proyecto es PÚBLICO. Lo que se sube una vez queda en el
 * historial de Git para siempre: borrarlo después no lo elimina, sigue
 * accesible en los commits anteriores y en las copias que otros hayan hecho.
 *
 * Este script mira qué archivos subiría Git —respetando `.gitignore`— y busca
 * dentro patrones de secreto. Es más fiable que revisar a ojo una lista de
 * cientos de archivos.
 *
 * ── Qué es secreto y qué no ──────────────────────────────────────────────
 *
 * No todas las claves son secretas, y confundirlas lleva a proteger lo que no
 * hace falta y descuidar lo que sí:
 *
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   NO es secreta. Viaja al navegador de
 *                                   cualquier visitante por diseño. Lo que
 *                                   protege los datos es RLS, no ocultarla.
 *
 *   SUPABASE_SERVICE_ROLE_KEY       SECRETA. Sortea TODOS los permisos de la
 *                                   base de datos. Con ella se lee y se borra
 *                                   cualquier cosa.
 *
 *   Contraseña de la base de datos  SECRETA.
 *   Contraseña del correo (SMTP)    SECRETA.
 */

import { execSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

interface Patron {
  nombre: string
  expresion: RegExp
  gravedad: 'critico' | 'alto' | 'aviso'
  explicacion: string
}

const PATRONES: Patron[] = [
  {
    nombre: 'Clave service_role de Supabase asignada',
    /*
     * ── Dos intentos fallidos antes de este ───────────────────────────────
     *
     * 1. Exigir 20 caracteres seguidos tras «ey» dejaba escapar tokens con un
     *    punto antes de esa longitud. Comprobado sobre un repositorio de
     *    prueba: el script dijo que no había secretos habiéndolos. Un
     *    verificador con falsos negativos es peor que ninguno.
     *
     * 2. Buscar la palabra suelta lo arreglaba, pero entonces el script se
     *    detectaba a sí mismo, y también la documentación que la menciona
     *    legítimamente. Un verificador que siempre falla se acaba ignorando.
     *
     * Esta versión solo salta ante una ASIGNACIÓN con valor real, y descarta
     * los marcadores de ejemplo.
     */
    /*
     * Tercer ajuste: exige 40 caracteres y descarta cualquier valor con
     * puntos suspensivos.
     *
     * Con el mínimo en 8 marcaba la línea de ejemplo `…KEY=eyJ...` que la
     * documentación y los mensajes de ayuda usan legítimamente. Una clave de
     * servicio real pasa de 200 caracteres, así que 40 es un suelo holgado.
     *
     * En todo caso, la defensa principal NO es esta expresión sino
     * `tokensDeServicio()`, que decodifica los JWT y mira su rol real. Esa
     * detecta la clave aunque esté en una variable con otro nombre o suelta
     * en medio del código.
     */
    expresion: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?![^\n]*\.\.\.)[^\s#]{40,}/m,
    gravedad: 'critico',
    explicacion:
      'Sortea todos los permisos de la base de datos. Quien la tenga puede leer y borrar todo.',
  },
  {
    nombre: 'Contraseña en texto plano',
    expresion: /(SMTP_PASS|SMTP_PASSWORD|DB_PASSWORD|DATABASE_PASSWORD|PGPASSWORD)\s*=\s*\S+/i,
    gravedad: 'critico',
    explicacion: 'Contraseña de servicio guardada en el código.',
  },
  {
    nombre: 'Cadena de conexión a PostgreSQL con contraseña',
    expresion: /postgres(ql)?:\/\/[^:\s]+:[^@\s]+@/,
    gravedad: 'critico',
    explicacion: 'Incluye usuario y contraseña de la base de datos.',
  },
  {
    nombre: 'Clave privada',
    expresion: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    gravedad: 'critico',
    explicacion: 'Clave criptográfica privada.',
  },
  {
    nombre: 'Clave anónima de Supabase',
    // Al menos 100 caracteres: descarta los marcadores de ejemplo de la
    // documentación, como `eyJhbGci...`, que no son claves reales.
    expresion: /NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*ey[A-Za-z0-9._-]{100,}/,
    gravedad: 'aviso',
    explicacion:
      'NO es secreta: viaja al navegador por diseño y RLS es lo que protege los datos. ' +
      'Aun así conviene no versionarla, para no acostumbrarse a subir archivos .env.',
  },
]

/**
 * Busca tokens JWT y comprueba si alguno es de SERVICIO.
 *
 * ── Por qué decodificar en vez de buscar la palabra ──────────────────────
 *
 * Un token de Supabase lleva su rol dentro, codificado en base64. Buscar la
 * palabra suelta en el texto daría positivo en la documentación que la
 * menciona y en este mismo script.
 *
 * Decodificar la carga útil distingue lo que importa: un token de servicio
 * pegado por error frente a una mención en un comentario.
 *
 * Es además lo único que detecta la clave aunque esté en una variable con
 * otro nombre, o pegada suelta en medio del código.
 */
function tokensDeServicio(contenido: string): string[] {
  const encontrados: string[] = []
  const jwts = contenido.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) ?? []

  for (const jwt of jwts) {
    try {
      const carga = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'))
      // El rol de servicio es el único que sortea RLS. `anon` es público
      // por diseño y no se marca aquí.
      if (carga?.role && carga.role !== 'anon') {
        encontrados.push(`${jwt.slice(0, 16)}… (rol: ${carga.role})`)
      }
    } catch {
      // No es un JWT válido: se ignora.
    }
  }
  return encontrados
}

/** Archivos que Git subiría: los rastreados más los nuevos no ignorados. */
function archivosQueSeSubirian(): string[] {
  const salida = execSync('git ls-files --cached --others --exclude-standard', {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
  return salida.split('\n').map((l) => l.trim()).filter(Boolean)
}

const EXTENSIONES_BINARIAS = /\.(png|jpe?g|gif|webp|mp4|mov|pdf|zip|woff2?|ico|tif|tiff)$/i
const TAMANO_MAXIMO = 2 * 1024 * 1024

function main() {
  console.log('\nNIDO PJB — revisión antes de subir al repositorio\n')

  let archivos: string[]
  try {
    archivos = archivosQueSeSubirian()
  } catch {
    console.error('✖ Esta carpeta todavía no es un repositorio de Git.\n')
    console.error('  Ejecute primero:  git init\n')
    process.exit(1)
  }

  console.log(`Git subiría ${archivos.length} archivos.\n`)

  // 1. ¿Se colaría algún archivo de entorno?
  const entornos = archivos.filter((a) => /(^|\/)\.env($|\.)/.test(a) && !a.endsWith('.example'))
  if (entornos.length > 0) {
    console.log('✖ ARCHIVOS DE ENTORNO QUE SE SUBIRÍAN:\n')
    entornos.forEach((a) => console.log(`    ${a}`))
    console.log('\n  No deberían subirse. Revise .gitignore.\n')
  } else {
    console.log('✓ Ningún archivo .env se subiría (solo .env.example, que no tiene claves)')
  }

  // 2. Buscar secretos dentro del contenido
  const hallazgos: { archivo: string; patron: Patron }[] = []
  let revisados = 0

  for (const archivo of archivos) {
    if (EXTENSIONES_BINARIAS.test(archivo)) continue
    try {
      if (statSync(archivo).size > TAMANO_MAXIMO) continue
      const contenido = readFileSync(archivo, 'utf8')
      revisados++

      for (const patron of PATRONES) {
        if (patron.expresion.test(contenido)) hallazgos.push({ archivo, patron })
      }

      for (const token of tokensDeServicio(contenido)) {
        hallazgos.push({
          archivo,
          patron: {
            nombre: `Token con rol distinto de «anon»: ${token}`,
            expresion: /(?:)/,
            gravedad: 'critico',
            explicacion:
              'Un token así sortea los permisos de la base de datos. Revóquelo en Supabase ' +
              '(Project Settings → API → Reset) y quítelo del archivo.',
          },
        })
      }
    } catch {
      // Archivo ilegible o binario mal detectado: se omite.
    }
  }

  console.log(`✓ Revisado el contenido de ${revisados} archivos de texto\n`)

  const criticos = hallazgos.filter((h) => h.patron.gravedad === 'critico')
  const otros = hallazgos.filter((h) => h.patron.gravedad !== 'critico')

  if (criticos.length > 0) {
    console.log('✖ SECRETOS ENCONTRADOS — NO SUBA NADA TODAVÍA\n')
    for (const { archivo, patron } of criticos) {
      console.log(`    ${archivo}`)
      console.log(`      ${patron.nombre}`)
      console.log(`      ${patron.explicacion}\n`)
    }
    console.log('  Quite ese contenido del archivo antes de hacer commit.')
    console.log('  Si ya hizo commit, NO basta con borrarlo: queda en el historial.\n')
    process.exit(1)
  }

  if (otros.length > 0) {
    console.log('! Avisos:\n')
    for (const { archivo, patron } of otros) {
      console.log(`    ${archivo}: ${patron.nombre}`)
      console.log(`      ${patron.explicacion}\n`)
    }
  }

  console.log('✓ No se encontró ningún secreto.\n')
  console.log('  Puede continuar:\n')
  console.log('    git add .')
  console.log('    git commit -m "NIDO PJB"')
  console.log('    git push\n')
}

main()
