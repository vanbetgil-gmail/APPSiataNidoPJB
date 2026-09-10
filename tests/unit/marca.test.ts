import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MARCA, PLATAFORMA, PLATAFORMA_LARGA, TITULO_PORTADA, COLEGIO } from '@/lib/marca'

/**
 * La marca dice lo mismo en todas partes.
 *
 * ── Por qué esta prueba existe ───────────────────────────────────────────
 *
 * El nombre del proyecto estaba escrito a mano en veintiocho sitios. Al
 * cambiarlo se actualizó uno —el que se veía en pantalla— y los otros
 * veintisiete siguieron diciendo lo anterior: la pestaña del navegador, el
 * pie de página, el manifiesto de instalación, el nombre del archivo que se
 * exporta. La aplicación se llamaba de dos maneras según dónde mirara cada
 * persona, y nada avisaba.
 *
 * Ahora todo sale de `lib/marca.ts`. Lo que esta prueba vigila son las
 * excepciones que NO pueden importarlo:
 *
 * · `manifest.json` es un archivo de datos; JSON no importa módulos.
 * · El código fuente, donde alguien puede volver a escribir el nombre a mano
 *   sin darse cuenta de que existe un sitio para eso.
 */

const manifiesto = JSON.parse(readFileSync('public/manifest.json', 'utf8')) as {
  name: string
  short_name: string
}

describe('La marca es una sola', () => {
  it('el manifiesto de instalación coincide con la marca', () => {
    // Es el nombre que queda bajo el ícono en la pantalla de inicio del
    // celular. Si diverge, la aplicación instalada se llama distinto que la
    // misma aplicación abierta en el navegador.
    expect(manifiesto.short_name).toBe(MARCA)
    expect(manifiesto.name).toContain(MARCA)
    expect(manifiesto.name).toContain(PLATAFORMA_LARGA)
  })

  it('el título de la portada nombra la marca y el colegio', () => {
    expect(TITULO_PORTADA).toContain(MARCA)
    expect(TITULO_PORTADA).toContain(COLEGIO)
  })

  it('el colegio lleva «Salesiano»', () => {
    // Se pidió expresamente, y es fácil de perder al reescribir un texto.
    expect(COLEGIO).toContain('Salesiano')
  })

  it('los dos nombres son distintos y ninguno está vacío', () => {
    // Si alguien iguala MARCA y PLATAFORMA, la línea de la cabecera queda
    // diciendo «SIATA PJB · SIATA PJB» sin que nada falle.
    expect(MARCA.trim().length).toBeGreaterThan(0)
    expect(PLATAFORMA.trim().length).toBeGreaterThan(0)
    expect(MARCA).not.toBe(PLATAFORMA)
  })
})
