import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

/**
 * COMPROBACIÓN CRÍTICA (T023) — FR-015, A-010d.
 *
 * Un visitante anónimo NO puede leer `medicion` ni `jornada`.
 *
 * Es la comprobación más importante de la suite. El mapa es público y los
 * tableros no lo son; si esta prueba falla, cualquier persona en internet
 * puede descargarse el histórico completo de mediciones del colegio.
 *
 * Se comprueba que devuelve CERO FILAS, no un error: RLS sin política de
 * lectura no rompe la consulta, simplemente no devuelve nada. Esperar un
 * error daría un falso negativo.
 *
 * ── Sobre la comprobación de alcance ─────────────────────────────────────
 *
 * La sonda va en el nivel superior del módulo, con `await`, y NO en un
 * `beforeAll`. El motivo es concreto: `it.skipIf()` se evalúa cuando Vitest
 * RECOLECTA las pruebas, y eso ocurre antes de ejecutar cualquier `beforeAll`.
 * Con la sonda en `beforeAll`, la bandera siempre valía `false` al recolectar
 * y estas pruebas se omitían SIEMPRE, hubiera base de datos o no.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE_ANONIMA = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function supabaseResponde(): Promise<boolean> {
  if (!URL || !CLAVE_ANONIMA) return false
  try {
    // Se usa el propio cliente en vez de una petición cruda: la API REST
    // exige `apikey` Y `Authorization: Bearer`, y con solo la primera
    // devuelve 401. Consultar como lo hace la aplicación evita ese error.
    const { error } = await createClient(URL, CLAVE_ANONIMA)
      .from('configuracion')
      .select('id')
      .limit(1)
    return !error
  } catch {
    return false
  }
}

const alcanzable = await supabaseResponde()

if (!alcanzable) {
  console.warn(
    '\n⚠️  SUPABASE NO ALCANZABLE — estas comprobaciones de seguridad NO se han ejecutado.\n' +
      '   Omitidas NO significa superadas. Configure .env.local y vuelva a ejecutar\n' +
      '   antes de publicar.\n'
  )
}

const cliente = () => createClient(URL!, CLAVE_ANONIMA!)

describe.skipIf(!alcanzable)('RLS: el visitante anónimo no accede a datos privados', () => {
  it('no devuelve ninguna fila de `medicion`', async () => {
    const { data, error } = await cliente().from('medicion').select('*')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('no devuelve ninguna fila de `jornada`', async () => {
    const { data, error } = await cliente().from('jornada').select('*')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('no puede insertar mediciones', async () => {
    const { error } = await cliente()
      .from('medicion')
      .insert({
        id: crypto.randomUUID(),
        jornada_id: crypto.randomUUID(),
        numero: 1,
        hora: '12:00',
      })
    expect(error).not.toBeNull()
  })

  it('no devuelve fichas que no estén publicadas', async () => {
    const { data, error } = await cliente().from('ficha_biodiversidad').select('estado')
    expect(error).toBeNull()
    const estados = new Set((data ?? []).map((f) => f.estado))
    // Solo 'publicado' puede salir. Borradores y fichas en revisión son
    // trabajo de estudiantes aún sin aprobar (FR-038a).
    expect([...estados].every((e) => e === 'publicado')).toBe(true)
  })

  it('no puede leer los correos del equipo', async () => {
    // FR-051. Son datos personales de menores de edad.
    const { data } = await cliente().from('integrante').select('correo')
    expect(data ?? []).toEqual([])
  })

  it('SÍ puede leer el mapa público', async () => {
    // El contrapunto: si esto fallara, el mapa estaría roto para los visitantes
    // y habríamos protegido de más (FR-005).
    const { error } = await cliente().from('ficha_publica').select('*')
    expect(error).toBeNull()
  })
})
