import { readFileSync } from 'node:fs'

/**
 * Carga `.env.local` antes de ejecutar las pruebas.
 *
 * ── Por qué hace falta ───────────────────────────────────────────────────
 *
 * Vitest NO lee `.env.local` por su cuenta. Sin esto, las pruebas de
 * integración no encuentran las credenciales de Supabase, se marcan como
 * omitidas y `pnpm test` sale en verde.
 *
 * Eso es peor que un fallo: da la impresión de que las comprobaciones de
 * seguridad pasaron cuando en realidad nunca se ejecutaron.
 *
 * Se lee el archivo a mano y no con una librería para no añadir una
 * dependencia por tres líneas de código.
 */

const ARCHIVOS = ['.env.local', '.env']

for (const archivo of ARCHIVOS) {
  try {
    for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
      const limpia = linea.trim()
      if (!limpia || limpia.startsWith('#')) continue

      const corte = limpia.indexOf('=')
      if (corte === -1) continue

      const clave = limpia.slice(0, corte).trim()
      const valor = limpia
        .slice(corte + 1)
        .trim()
        .replace(/^["']|["']$/g, '')

      // Lo que ya viene del entorno manda: permite forzar valores desde la
      // línea de comandos sin editar el archivo.
      if (!process.env[clave]) process.env[clave] = valor
    }
  } catch {
    // El archivo puede no existir: en integración continua las variables
    // llegan del propio entorno.
  }
}

// Aviso ruidoso si falta lo necesario. Omitir en silencio las comprobaciones
// de seguridad sería justo el fallo que este archivo intenta evitar.
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '\n⚠️  No se encontraron credenciales de Supabase.\n' +
      '   Las pruebas de seguridad se OMITIRÁN, y omitido no es superado.\n' +
      '   Cree .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.\n'
  )
}
