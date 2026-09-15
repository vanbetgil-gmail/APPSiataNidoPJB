import { describe, expect, it } from 'vitest'
import { cabeceraUtf8, cuerpoBase64 } from '@/lib/correo/enviar'

/**
 * Codificación del correo.
 *
 * ── Por qué se prueba esto y no el envío ─────────────────────────────────
 *
 * Porque el envío depende de un servidor que no está aquí, y porque el fallo
 * probable no es que el correo no salga: es que salga mal. Un asunto con
 * «Guayacán» llega como «GuayacÃ¡n», y nadie se entera hasta que alguien
 * enseña la pantalla del teléfono.
 *
 * Las dos funciones que deciden eso son puras y se pueden comprobar sin red.
 */

describe('Cabeceras', () => {
  it('deja intacto lo que ya es ASCII', () => {
    // Codificar sin necesidad haría ilegible el asunto en clientes antiguos.
    expect(cabeceraUtf8('Hay una ficha por revisar')).toBe('Hay una ficha por revisar')
  })

  it('codifica las tildes y las eñes como palabra codificada (RFC 2047)', () => {
    const codificada = cabeceraUtf8('Guayacán amarillo')
    expect(codificada).toMatch(/^=\?UTF-8\?B\?.+\?=$/)

    // Y lo codificado tiene que poder volver a leerse.
    const base = codificada.slice('=?UTF-8?B?'.length, -2)
    expect(Buffer.from(base, 'base64').toString('utf8')).toBe('Guayacán amarillo')
  })

  it('el signo de interrogación de apertura también se codifica', () => {
    // «¿» no es ASCII y aparece en cuanto alguien titula una ficha con una
    // pregunta. Es el caso que más fácil se cuela en español.
    expect(cabeceraUtf8('¿Es nativa?')).toMatch(/^=\?UTF-8\?B\?/)
  })
})

describe('Cuerpo', () => {
  it('no deja ninguna línea de más de 76 caracteres', () => {
    // SMTP admite hasta 998, pero muchos servidores parten antes y rompen
    // el base64 por la mitad.
    const largo = 'Descripción de la especie. '.repeat(200)
    for (const linea of cuerpoBase64(largo).split('\r\n')) {
      expect(linea.length).toBeLessThanOrEqual(76)
    }
  })

  it('un punto al principio de una línea sobrevive al viaje', () => {
    /*
     * En SMTP una línea con un punto solo significa «aquí termina el
     * mensaje». Un cuerpo en texto plano que empezara un párrafo con «.»
     * quedaría truncado ahí mismo, sin error.
     *
     * Con el cuerpo en base64 eso no puede pasar: el alfabeto base64 no
     * incluye el punto.
     */
    const conPunto = 'Primera línea\n.\nSegunda línea'
    const codificado = cuerpoBase64(conPunto)

    expect(codificado).not.toMatch(/^\.$/m)
    expect(Buffer.from(codificado.replace(/\r\n/g, ''), 'base64').toString('utf8')).toBe(conPunto)
  })

  it('las tildes vuelven intactas', () => {
    const texto = 'Jerónimo envió la ficha del guayacán. Está en la Cancha de la Fraternidad.'
    const vuelta = Buffer.from(cuerpoBase64(texto).replace(/\r\n/g, ''), 'base64').toString('utf8')
    expect(vuelta).toBe(texto)
  })
})
