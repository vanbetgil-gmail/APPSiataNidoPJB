import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

/**
 * RLS con sesión iniciada.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 *
 * Las pruebas de RLS que había solo cubrían al visitante ANÓNIMO, y
 * comprueban que no reciba filas. Eso dejó pasar un defecto grave:
 * `es_integrante_activo()` y `es_responsable()` consultaban `integrante`,
 * cuya política las invoca a su vez, y la evaluación se recursaba hasta
 * «stack depth limit exceeded» (corregido en la migración 0008).
 *
 * Un error de recursión tampoco devuelve filas. Las pruebas del anónimo
 * seguían en verde mientras la aplicación autenticada entera estaba
 * inutilizada: nadie podía leer nada tras entrar con su contraseña.
 *
 * La lección es concreta: comprobar que alguien NO puede leer no dice nada
 * sobre si quien debe leer, puede. Hacen falta las dos mitades.
 *
 * ── Cómo se ejecuta ──────────────────────────────────────────────────────
 *
 * Necesita credenciales reales de un integrante, que no pueden vivir en el
 * repositorio. Añada a `.env.local`:
 *
 *   PRUEBA_CORREO=alguien@salesianos.edu.co
 *   PRUEBA_CONTRASENA=...
 *
 * Sin ellas las pruebas se omiten con un aviso, en vez de fallar: no todo el
 * mundo que clone el proyecto tendrá una cuenta.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CORREO = process.env.PRUEBA_CORREO
const CONTRASENA = process.env.PRUEBA_CONTRASENA

const hayCredenciales = Boolean(URL && ANON && CORREO && CONTRASENA)

/**
 * La sesión se abre una vez, en el nivel superior del módulo.
 *
 * No en `beforeAll`: `describe.skipIf` se evalúa al recolectar las pruebas,
 * antes de que los ganchos hayan corrido, así que una condición calculada
 * allí llegaría siempre indefinida y las pruebas se omitirían siempre.
 */
const cliente = hayCredenciales ? createClient(URL!, ANON!, { auth: { persistSession: false } }) : null

const sesion = cliente
  ? await cliente.auth.signInWithPassword({ email: CORREO!, password: CONTRASENA! })
  : null

describe.skipIf(!hayCredenciales)('RLS: un integrante con sesión sí accede a lo suyo', () => {
  it('la contraseña es válida', () => {
    expect(sesion?.error?.message ?? null).toBeNull()
    expect(sesion?.data.session).toBeTruthy()
  })

  it('puede leer su propia ficha de integrante', async () => {
    const { data, error } = await cliente!
      .from('integrante')
      .select('id, nombre, rol, activo')
      .eq('id', sesion!.data.user!.id)
      .maybeSingle()

    // Este es el aserto que habría cazado la recursión: el error llegaba
    // como «stack depth limit exceeded», no como ausencia de permiso.
    expect(error?.message ?? null).toBeNull()
    expect(data).toBeTruthy()
    expect(data!.activo).toBe(true)
  })

  it('ninguna consulta autenticada se recursa', async () => {
    // Cada una de estas tablas tiene políticas que llaman a las funciones
    // auxiliares. Si volvieran a ser SECURITY INVOKER, todas fallarían.
    for (const tabla of ['integrante', 'jornada', 'medicion', 'ficha_biodiversidad'] as const) {
      const { error } = await cliente!.from(tabla).select('*', { count: 'exact', head: true })
      expect(error?.message ?? '', `tabla ${tabla}`).not.toMatch(/stack depth/i)
    }
  })

  it('accede a las mediciones, que al anónimo se le niegan', async () => {
    const { error } = await cliente!.from('medicion').select('id').limit(1)
    expect(error?.message ?? null).toBeNull()
  })
})

describe.skipIf(hayCredenciales)('RLS autenticado (omitido)', () => {
  it('avisa de que faltan credenciales', () => {
    console.warn(
      '\n  ⚠ Pruebas de RLS autenticado omitidas.' +
        '\n    Añada PRUEBA_CORREO y PRUEBA_CONTRASENA a .env.local para ejecutarlas.\n'
    )
    expect(hayCredenciales).toBe(false)
  })
})
