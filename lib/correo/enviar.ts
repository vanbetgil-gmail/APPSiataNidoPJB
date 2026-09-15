import tls from 'node:tls'

/**
 * Envío de correo desde el servidor.
 *
 * ── Por qué a mano y no con una biblioteca ───────────────────────────────
 *
 * Porque el proyecto ya habla SMTP: `scripts/probar-smtp.ts` mantiene esta
 * misma conversación para comprobar las credenciales. Añadir una dependencia
 * para repetir setenta líneas que ya existen y ya funcionan sería cambiar
 * código propio y legible por código ajeno que hay que actualizar.
 *
 * ── Esto NO es el correo de acceso ───────────────────────────────────────
 *
 * Los correos de inicio de sesión y de recuperación de contraseña los manda
 * Supabase con su propia configuración SMTP. Esto es para los avisos que
 * genera la aplicación —hoy, que hay una ficha esperando verificación— y
 * usa las mismas credenciales por separado.
 *
 * ── Nunca lanza ──────────────────────────────────────────────────────────
 *
 * Devuelve un resultado; jamás una excepción. El motivo es concreto: quien
 * envía una ficha a revisión no debe encontrarse un error porque el
 * servidor de correo esté caído. La ficha se envió; el aviso es un extra.
 * Un fallo aquí se registra y se sigue adelante.
 */

export type ResultadoCorreo =
  | { ok: true }
  | { ok: false; motivo: 'sin_configurar' | 'fallo'; detalle: string }

interface Credenciales {
  host: string
  puerto: number
  usuario: string
  clave: string
  remitente: string
  nombreRemitente: string
}

/**
 * Lee la configuración del entorno.
 *
 * Ninguna de estas variables lleva el prefijo `NEXT_PUBLIC_`, y es
 * deliberado: ese prefijo incrusta el valor en el código que se descarga al
 * navegador. La contraseña del buzón institucional viajaría a todos los
 * visitantes del sitio.
 */
function credenciales(): Credenciales | null {
  const host = process.env.SMTP_HOST
  const usuario = process.env.SMTP_USUARIO
  const clave = process.env.SMTP_CONTRASENA

  if (!host || !usuario || !clave) return null

  return {
    host,
    puerto: Number(process.env.SMTP_PORT ?? 465),
    usuario,
    clave,
    // Muchos servidores rechazan enviar en nombre de una dirección distinta
    // a la autenticada, así que el remitente por omisión es el usuario.
    remitente: process.env.SMTP_REMITENTE ?? usuario,
    nombreRemitente: process.env.SMTP_NOMBRE ?? 'SIATA PJB',
  }
}

/** ¿Hay servidor de correo configurado? Para avisar en vez de fallar callado. */
export function correoConfigurado(): boolean {
  return credenciales() !== null
}

/**
 * Una respuesta SMTP termina cuando llega una línea «NNN texto», con espacio
 * y no guion tras el número: el guion significa que vienen más líneas.
 */
function hablar(socket: tls.TLSSocket, orden: string | null, esperado: string): Promise<string> {
  return new Promise((resolver, rechazar) => {
    let buffer = ''

    const alRecibir = (d: Buffer) => {
      buffer += d.toString()
      const ultima = buffer.split(/(?<=\n)/).slice(-1)[0] ?? ''
      if (!/^\d{3} [^\n]*\r?\n$/m.test(ultima)) return
      socket.off('data', alRecibir)
      const codigo = buffer.trim().split(/\r?\n/).pop()?.slice(0, 3) ?? ''
      if (!codigo.startsWith(esperado)) {
        rechazar(new Error(buffer.trim()))
        return
      }
      resolver(buffer.trim())
    }

    socket.on('data', alRecibir)
    if (orden !== null) socket.write(orden + '\r\n')
  })
}

/**
 * Codifica una cabecera con tildes o eñes (RFC 2047).
 *
 * Sin esto, un asunto como «Hay una ficha por revisar» llega legible pero
 * «Guayacán» aparece como «GuayacÃ¡n» en la mayoría de los clientes: las
 * cabeceras SMTP son ASCII por definición.
 */
export function cabeceraUtf8(texto: string): string {
  if (/^[\x00-\x7F]*$/.test(texto)) return texto
  return `=?UTF-8?B?${Buffer.from(texto, 'utf8').toString('base64')}?=`
}

/**
 * El cuerpo va en base64.
 *
 * Es lo que evita de un golpe los tres problemas clásicos: las líneas de más
 * de 998 caracteres, las tildes y el punto solo al principio de una línea,
 * que en SMTP significa «aquí termina el mensaje» y truncaría el correo.
 */
export function cuerpoBase64(texto: string): string {
  const base = Buffer.from(texto, 'utf8').toString('base64')
  return (base.match(/.{1,76}/g) ?? []).join('\r\n')
}

export async function enviarCorreo({
  para,
  asunto,
  cuerpo,
  tiempoLimiteMs = 20_000,
}: {
  para: string[]
  asunto: string
  cuerpo: string
  /**
   * Cuanto esperar al servidor.
   *
   * Los avisos usan un limite mas corto que las pruebas: quien pulsa
   * «Enviar a revision» esta mirando el boton, y veinte segundos de espera
   * por un correo que ni siquiera vera parecen una aplicacion colgada.
   */
  tiempoLimiteMs?: number
}): Promise<ResultadoCorreo> {
  const cred = credenciales()

  if (!cred) {
    return {
      ok: false,
      motivo: 'sin_configurar',
      detalle:
        'Falta configurar SMTP_HOST, SMTP_USUARIO y SMTP_CONTRASENA en las variables de entorno.',
    }
  }

  const destinatarios = para.map((p) => p.trim()).filter(Boolean)
  if (destinatarios.length === 0) {
    return { ok: false, motivo: 'fallo', detalle: 'No había ninguna dirección a la que escribir.' }
  }

  let socket: tls.TLSSocket | null = null

  try {
    socket = tls.connect({
      host: cred.host,
      port: cred.puerto,
      servername: cred.host,
      // Los certificados de cPanel compartido suelen estar emitidos para el
      // nombre del servidor y no para el dominio del colegio. La conexión
      // sigue cifrada; lo que se relaja es la comprobación del nombre.
      rejectUnauthorized: false,
    })

    const abierto = socket
    abierto.setTimeout(tiempoLimiteMs, () =>
      abierto.destroy(
        new Error(`El servidor de correo no respondió en ${Math.round(tiempoLimiteMs / 1000)} segundos.`)
      )
    )

    await new Promise<void>((resolver, rechazar) => {
      abierto.once('secureConnect', () => resolver())
      abierto.once('error', rechazar)
    })

    await hablar(abierto, null, '220')
    await hablar(abierto, 'EHLO siata-pjb', '250')
    await hablar(abierto, 'AUTH LOGIN', '334')
    await hablar(abierto, Buffer.from(cred.usuario).toString('base64'), '334')
    await hablar(abierto, Buffer.from(cred.clave).toString('base64'), '235')

    await hablar(abierto, `MAIL FROM:<${cred.remitente}>`, '250')
    for (const destino of destinatarios) {
      await hablar(abierto, `RCPT TO:<${destino}>`, '250')
    }
    await hablar(abierto, 'DATA', '354')

    const mensaje = [
      `From: ${cabeceraUtf8(cred.nombreRemitente)} <${cred.remitente}>`,
      `To: ${destinatarios.join(', ')}`,
      `Subject: ${cabeceraUtf8(asunto)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@siata-pjb>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      cuerpoBase64(cuerpo),
      '',
      '.',
    ].join('\r\n')

    await hablar(abierto, mensaje, '250')

    abierto.write('QUIT\r\n')
    abierto.end()

    return { ok: true }
  } catch (e) {
    socket?.destroy()
    return {
      ok: false,
      motivo: 'fallo',
      detalle: e instanceof Error ? e.message : String(e),
    }
  }
}
