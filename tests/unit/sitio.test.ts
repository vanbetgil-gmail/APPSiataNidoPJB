import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Pruebas de la resolución del dominio.
 *
 * ── Por qué merecen existir ──────────────────────────────────────────────
 *
 * Si `urlSitio()` devuelve algo equivocado en producción, el enlace de acceso
 * apunta a localhost y NADIE puede entrar al proyecto. El correo llega, el
 * enlace parece bien, y al abrirlo no pasa nada. Es un fallo que no produce
 * ningún error visible y que sería muy difícil de diagnosticar en caliente.
 *
 * El módulo se reimporta en cada caso porque lee `process.env` al ejecutarse.
 * Se usa `vi.resetModules()` y no una query de invalidación en el import:
 * esbuild interpreta la query como nombre de «loader» y falla.
 */

const ENTORNO_ORIGINAL = { ...process.env }

async function cargarModulo() {
  vi.resetModules()
  return import('@/lib/sitio')
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_URL_SITIO
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL
  delete process.env.VERCEL_URL
  delete process.env.VERCEL_ENV
})

afterEach(() => {
  process.env = { ...ENTORNO_ORIGINAL }
})

describe('urlSitio — orden de resolución', () => {
  it('la variable configurada por el colegio manda sobre todo lo demás', async () => {
    process.env.NEXT_PUBLIC_URL_SITIO = 'https://institutopedrojustoberrio.com'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'otro.vercel.app'
    const { urlSitio } = await cargarModulo()
    expect(urlSitio()).toBe('https://institutopedrojustoberrio.com')
  })

  it('LA RED DE SEGURIDAD: en producción usa el dominio del colegio aunque falte la variable', async () => {
    // Olvidar NEXT_PUBLIC_URL_SITIO rompería el acceso de todo el equipo sin
    // producir ningún error visible. Demasiado caro para dejarlo al olvido.
    process.env.VERCEL_ENV = 'production'
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'nido-pjb.vercel.app'
    const { urlSitio } = await cargarModulo()
    expect(urlSitio()).toBe('https://institutopedrojustoberrio.com')
  })

  it('fuera de producción sí cae al dominio del alojamiento', async () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'nido-pjb.vercel.app'
    const { urlSitio } = await cargarModulo()
    expect(urlSitio()).toBe('https://nido-pjb.vercel.app')
  })

  it('una variable explícita gana incluso en producción', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.NEXT_PUBLIC_URL_SITIO = 'https://otro.example.com'
    const { urlSitio } = await cargarModulo()
    expect(urlSitio()).toBe('https://otro.example.com')
  })

  it('en desarrollo usa localhost', async () => {
    const { urlSitio } = await cargarModulo()
    expect(urlSitio()).toBe('http://localhost:3000')
  })
})

describe('urlSitio — normalización', () => {
  it('añade https a un dominio escrito sin esquema', async () => {
    process.env.NEXT_PUBLIC_URL_SITIO = 'institutopedrojustoberrio.com'
    const { urlSitio } = await cargarModulo()
    expect(urlSitio()).toBe('https://institutopedrojustoberrio.com')
  })

  it('quita la barra final, que duplicaría las barras al componer rutas', async () => {
    process.env.NEXT_PUBLIC_URL_SITIO = 'https://institutopedrojustoberrio.com/'
    const { urlSitio, urlAbsoluta } = await cargarModulo()
    expect(urlSitio()).toBe('https://institutopedrojustoberrio.com')
    expect(urlAbsoluta('/biodiversidad')).toBe(
      'https://institutopedrojustoberrio.com/biodiversidad'
    )
  })

  it('respeta http explícito en desarrollo', async () => {
    process.env.NEXT_PUBLIC_URL_SITIO = 'http://localhost:3000'
    const { urlSitio } = await cargarModulo()
    expect(urlSitio()).toBe('http://localhost:3000')
  })

  it('compone rutas aunque falte la barra inicial', async () => {
    process.env.NEXT_PUBLIC_URL_SITIO = 'https://institutopedrojustoberrio.com'
    const { urlAbsoluta } = await cargarModulo()
    expect(urlAbsoluta('creditos')).toBe('https://institutopedrojustoberrio.com/creditos')
  })
})

describe('Indexación en buscadores', () => {
  it('el dominio del colegio SÍ se indexa', async () => {
    process.env.NEXT_PUBLIC_URL_SITIO = 'https://institutopedrojustoberrio.com'
    const { esDominioDefinitivo } = await cargarModulo()
    expect(esDominioDefinitivo()).toBe(true)
  })

  it('EL CASO QUE IMPORTA: un despliegue de prueba NO se indexa', async () => {
    // Sin esto, cada rama desplegada acabaría en Google como una copia del
    // mapa del colegio, compitiendo con la real.
    process.env.VERCEL_URL = 'nido-pjb-git-rama-xyz.vercel.app'
    const { esDominioDefinitivo } = await cargarModulo()
    expect(esDominioDefinitivo()).toBe(false)
  })

  it('localhost tampoco se indexa', async () => {
    const { esDominioDefinitivo } = await cargarModulo()
    expect(esDominioDefinitivo()).toBe(false)
  })

  it('un subdominio del colegio también cuenta como definitivo', async () => {
    process.env.NEXT_PUBLIC_URL_SITIO = 'https://nido.institutopedrojustoberrio.com'
    const { esDominioDefinitivo } = await cargarModulo()
    expect(esDominioDefinitivo()).toBe(true)
  })
})

describe('Dirección canónica', () => {
  it('el dominio de producción es el raíz, sin www ni subdominio', async () => {
    const { DOMINIO_PRODUCCION, URL_PRODUCCION } = await cargarModulo()
    expect(DOMINIO_PRODUCCION).toBe('institutopedrojustoberrio.com')
    expect(URL_PRODUCCION).toBe('https://institutopedrojustoberrio.com')
    expect(DOMINIO_PRODUCCION.startsWith('www.')).toBe(false)
  })

  it('las URL del sitemap salen del dominio raíz', async () => {
    process.env.VERCEL_ENV = 'production'
    const { urlAbsoluta } = await cargarModulo()
    expect(urlAbsoluta('/biodiversidad')).toBe(
      'https://institutopedrojustoberrio.com/biodiversidad'
    )
    expect(urlAbsoluta('/sitemap.xml')).toBe(
      'https://institutopedrojustoberrio.com/sitemap.xml'
    )
  })
})
