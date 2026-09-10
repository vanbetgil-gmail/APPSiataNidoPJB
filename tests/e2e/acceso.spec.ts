import { expect, test } from '@playwright/test'

/**
 * El recorrido completo del acceso — FR-011, FR-014, FR-016.
 *
 * Entrar y salir son los dos botones que toda persona del equipo va a usar
 * cada vez, y son los que menos se prueban precisamente por parecer obvios.
 *
 * ── Lo que esta prueba encontró ──────────────────────────────────────────
 *
 * `cerrarSesion()` borraba la sesión pero no redirigía, así que tras pulsar
 * «Salir» la pantalla privada seguía a la vista. La sesión estaba cerrada de
 * verdad —al navegar aparecía el acceso— pero nadie podía saberlo mirando.
 *
 * Eso es peor que no tener botón: quien pulsa «Salir» y sigue viendo los
 * tableros o concluye que no funcionó, o cree que salió y se levanta del
 * computador dejándolo con datos del equipo en pantalla.
 *
 * Por eso la prueba comprueba las dos mitades por separado: que la pantalla
 * cambie, y que la sesión esté realmente borrada. Una sin la otra engaña.
 *
 * ── Credenciales ─────────────────────────────────────────────────────────
 *
 * De `PRUEBA_CORREO` y `PRUEBA_CONTRASENA` en `.env.local`, que no se
 * versiona. Sin ellas la prueba se omite en vez de fallar: quien clone el
 * proyecto no tiene cuenta en esta instalación.
 */

const CORREO = process.env.PRUEBA_CORREO
const CONTRASENA = process.env.PRUEBA_CONTRASENA
const hayCredenciales = Boolean(CORREO && CONTRASENA)

test.describe('Ingresar y Salir', () => {
  test('«Ingresar» lleva a la pantalla de acceso', async ({ page }) => {
    await page.goto('/')

    const ingresar = page.getByRole('link', { name: /ingresar/i })
    await expect(ingresar).toBeVisible()
    await ingresar.click()

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByLabel(/correo institucional/i)).toBeVisible()
    await expect(page.getByLabel(/^contraseña$/i)).toBeVisible()

    // La barra de las cuatro subpestañas sigue ahí: quien llegue aquí sin ser
    // del equipo no debe quedarse en un callejón sin salida.
    await expect(page.getByRole('link', { name: /biodiversidad/i }).first()).toBeVisible()
  })

  test('«¿Olvidó su contraseña?» lleva a recuperar', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /olvid/i }).click()
    await expect(page).toHaveURL(/\/recuperar/)
    await expect(page.getByRole('button', { name: /enviarme el enlace/i })).toBeVisible()
  })

  test('una contraseña equivocada no deja entrar', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/correo institucional/i).fill('vanessa.betancur@salesianos.edu.co')
    await page.getByLabel(/^contraseña$/i).fill('esta-no-es-la-buena-000')
    await page.getByRole('button', { name: /entrar al observatorio/i }).click()

    /*
     * `#mensaje-acceso` y no `getByRole('alert')` a secas: Next.js inserta
     * su propio anunciador de rutas con ese mismo rol, así que el selector
     * genérico coincide con dos elementos y falla por ambigüedad.
     */
    await expect(page.locator('#mensaje-acceso')).toContainText(/no es correcta/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test.describe('con sesión', () => {
    test.skip(!hayCredenciales, 'Faltan PRUEBA_CORREO y PRUEBA_CONTRASENA en .env.local')

    test('entra, ve la zona privada y «Salir» la cierra de verdad', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel(/correo institucional/i).fill(CORREO!)
      await page.getByLabel(/^contraseña$/i).fill(CONTRASENA!)
      await page.getByRole('button', { name: /entrar al observatorio/i }).click()

      // Llega a los tableros, que es el destino por omisión.
      await expect(page).toHaveURL(/\/tableros/, { timeout: 20_000 })
      await expect(page.getByRole('button', { name: /salir/i })).toBeVisible()

      // El nombre lleva a la cuenta.
      await expect(page.getByRole('link', { name: /cuenta|responsable|betancur/i }).first())
        .toBeVisible()

      await page.getByRole('button', { name: /salir/i }).click()

      // Sale a la portada, que es pública: quien acaba de salir quiere irse,
      // no volver a entrar.
      await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 20_000 })
      await expect(page.getByRole('link', { name: /ingresar/i })).toBeVisible()

      /*
       * Y esta es la comprobación que de verdad importa: que la sesión se
       * haya BORRADO, no solo que la pantalla haya cambiado. Se vuelve a
       * pedir una página privada y debe rebotar al acceso.
       */
      await page.goto('/tableros')
      await expect(page).toHaveURL(/\/login/, { timeout: 20_000 })
      await expect(page.getByLabel(/^contraseña$/i)).toBeVisible()
    })
  })
})
