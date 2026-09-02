import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

/**
 * COMPROBACIÓN CRÍTICA (T024) — FR-051.
 *
 * Ningún correo institucional puede aparecer en una respuesta pública.
 *
 * Se comprueba de dos formas distintas, porque una sola no basta:
 *
 *  1. Contra la base de datos: las vistas públicas no exponen `correo`, y la
 *     tabla `integrante` no es legible por un anónimo.
 *  2. Contra las páginas servidas: se busca un patrón de correo en el HTML de
 *     cada ruta pública. Es tosco a propósito — detecta la fuga aunque venga
 *     por un camino que nadie previó.
 *
 * La segunda parte necesita el servidor en marcha (`pnpm dev`). Si no lo está,
 * esas pruebas se omiten con aviso; las de base de datos se ejecutan igual.
 *
 * Las sondas van en el nivel superior con `await`, no en un `beforeAll`:
 * `skipIf` se evalúa al recolectar, antes de cualquier `beforeAll`.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE_ANONIMA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const URL_SITIO = process.env.NEXT_PUBLIC_URL_SITIO ?? 'http://localhost:3000'

const RUTAS_PUBLICAS = ['/', '/biodiversidad', '/creditos']

async function responde(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    return r.ok
  } catch {
    return false
  }
}

async function baseResponde(): Promise<boolean> {
  if (!URL || !CLAVE_ANONIMA) return false
  try {
    // Igual que en rls-anonimo: la API REST cruda exige `apikey` Y
    // `Authorization: Bearer`. Se consulta como lo hace la aplicación.
    const { error } = await createClient(URL, CLAVE_ANONIMA)
      .from('configuracion')
      .select('id')
      .limit(1)
    return !error
  } catch {
    return false
  }
}

const hayBase = await baseResponde()
const haySitio = await responde(URL_SITIO)

if (!hayBase) {
  console.warn('\n⚠️  Sin Supabase: no se comprobó la exposición de correos en la base de datos.\n')
}
if (!haySitio) {
  console.warn(
    `\n⚠️  El sitio no responde en ${URL_SITIO}: no se comprobaron las páginas servidas.\n` +
      '   Ejecute `pnpm dev` en otra terminal y vuelva a lanzar las pruebas.\n'
  )
}

describe.skipIf(!hayBase)('Las vistas públicas no exponen correos', () => {
  it('`ficha_publica` no incluye ninguna columna de correo', async () => {
    const cliente = createClient(URL!, CLAVE_ANONIMA!)
    const { data, error } = await cliente.from('ficha_publica').select('*').limit(5)
    expect(error).toBeNull()
    for (const fila of data ?? []) {
      const claves = Object.keys(fila).join(' ').toLowerCase()
      expect(claves).not.toContain('correo')
      expect(claves).not.toContain('email')
      expect(JSON.stringify(fila)).not.toContain('@')
    }
  })

  it('`integrante_publico` devuelve nombres pero nunca correos', async () => {
    const cliente = createClient(URL!, CLAVE_ANONIMA!)
    const { data, error } = await cliente.from('integrante_publico').select('*')
    expect(error).toBeNull()
    expect(JSON.stringify(data ?? [])).not.toContain('@')
  })

  it('la tabla `integrante` no es legible por un anónimo', async () => {
    const cliente = createClient(URL!, CLAVE_ANONIMA!)
    const { data } = await cliente.from('integrante').select('correo')
    expect(data ?? []).toEqual([])
  })
})

describe.skipIf(!haySitio)('Las páginas públicas no filtran correos', () => {
  it(
    'ninguna ruta pública devuelve un correo en su HTML',
    async () => {
      for (const ruta of RUTAS_PUBLICAS) {
        const respuesta = await fetch(`${URL_SITIO}${ruta}`)
        const html = await respuesta.text()
        /*
         * Se exige que el final sea un dominio de primer nivel ALFABÉTICO.
         *
         * Sin esa exigencia, el patrón marcaba como correos los
         * identificadores de paquetes que Next.js incrusta en modo
         * desarrollo: `next@15.5.24_` y `babel+core@7._69eb1640...`, que
         * vienen de las rutas de node_modules/.pnpm.
         *
         * Comprobado contra el HTML real: la versión anterior daba 2 falsos
         * positivos, esta da 0 y sigue detectando `alguien@colegio.edu.co`.
         */
        const correos = html.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-zA-Z]{2,24}\b/g) ?? []
        expect(correos, `Fuga de correo en la ruta ${ruta}: ${correos.join(', ')}`).toEqual([])
      }
    },
    30_000
  )

  it('el mapa público se sirve sin pedir cuenta', async () => {
    // FR-005: comprueba que la portada responde 200 y no redirige a /login.
    const respuesta = await fetch(URL_SITIO, { redirect: 'manual' })
    expect([200, 304]).toContain(respuesta.status)
  })
})
