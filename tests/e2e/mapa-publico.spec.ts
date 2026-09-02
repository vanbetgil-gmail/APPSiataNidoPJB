import { expect, test } from '@playwright/test'

/**
 * COMPROBACIÓN CRÍTICA (T025) — FR-005, SC-001, SC-002.
 *
 * El mapa público se abre sin cuenta, y rápido.
 *
 * Es la promesa central de la Historia 1: cualquier persona —un acudiente, un
 * jurado de feria de ciencias— abre un enlace y ve el mapa. Si en algún
 * momento aparece una pantalla de inicio de sesión, el proyecto pierde su cara
 * pública.
 *
 * Todas las pruebas usan contexto limpio, sin sesión: es el estado en que
 * llega un visitante de verdad.
 */

test.describe('Mapa público sin cuenta', () => {
  test('la portada muestra el mapa y nunca pide credenciales', async ({ page }) => {
    const inicio = Date.now()
    await page.goto('/')

    // El mapa está presente
    await expect(page.getByRole('region', { name: /mapa/i })).toBeVisible()

    // SC-001: en ningún momento hay formulario de acceso
    await expect(page.getByLabel(/contraseña/i)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toHaveCount(0)
    expect(page.url()).not.toContain('/login')

    // SC-002: utilizable en menos de 3 segundos
    const transcurrido = Date.now() - inicio
    expect(transcurrido, `El mapa tardó ${transcurrido} ms en quedar utilizable`).toBeLessThan(3000)
  })

  test('la ficha de una especie se abre por enlace directo, sin autenticarse', async ({ page }) => {
    await page.goto('/')
    const primerPunto = page.getByRole('button', { name: /ver ficha/i }).first()

    if ((await primerPunto.count()) === 0) {
      test.skip(true, 'No hay fichas publicadas en los datos de siembra')
    }

    await primerPunto.click()
    await expect(page).toHaveURL(/\/especie\//)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // El enlace compartido debe abrir directo en un contexto nuevo
    const url = page.url()
    await page.context().clearCookies()
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('el filtro por categoría reduce los puntos y actualiza el conteo', async ({ page }) => {
    await page.goto('/')
    const conteo = page.getByTestId('conteo-puntos')
    const totalInicial = await conteo.textContent()

    const filtro = page.getByRole('button', { name: /árbol/i }).first()
    if ((await filtro.count()) === 0) {
      test.skip(true, 'No hay categorías en los datos de siembra')
    }
    await filtro.click()

    await expect(conteo).not.toHaveText(totalInicial ?? '')
  })

  test('no hay desplazamiento horizontal de página a 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/')

    // SC-013: el ancho del documento no puede superar el de la ventana
    const desbordamiento = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(desbordamiento, 'La página se desplaza en horizontal').toBeLessThanOrEqual(0)
  })

  test('el mapa vacío muestra un estado explicativo, no una pantalla en blanco', async ({
    page,
  }) => {
    await page.goto('/?siembra=vacia')
    const region = page.getByRole('region', { name: /mapa/i })
    await expect(region).toBeVisible()
    // Debe haber algún texto que explique la situación
    await expect(region).not.toBeEmpty()
  })
})
