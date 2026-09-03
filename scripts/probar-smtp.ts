/**
 * NIDO PJB — comprueba las credenciales del servidor de correo.
 *
 * Se ejecuta con:
 *   pnpm probar-smtp
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 *
 * Supabase, cuando el envío falla, responde «Error sending recovery email» y
 * nada más. Ese mensaje no distingue entre una contraseña equivocada, un
 * buzón que no existe y un servidor que rechaza el remitente, que son tres
 * problemas con tres arreglos distintos.
 *
 * Este script habla directamente con el servidor y muestra lo que el
 * servidor contesta, palabra por palabra. Con eso se sabe qué corregir.
 *
 * ── La contraseña no sale de su computador ───────────────────────────────
 *
 * Se lee de `.env.local`, que no se versiona. Añada estas líneas:
 *
 *   SMTP_HOST=mail.institutopedrojustoberrio.com
 *   SMTP_PORT=465
 *   SMTP_USUARIO=noreply@institutopedrojustoberrio.com
 *   SMTP_CONTRASENA=...
 *
 * Y bórrelas cuando termine de diagnosticar.
 */

import { readFileSync } from 'node:fs'
import tls from 'node:tls'

try {
  for (const linea of readFileSync('.env.local', 'utf8').split('\n')) {
    const l = linea.trim()
    if (!l || l.startsWith('#')) continue
    const c = l.indexOf('=')
    if (c === -1) continue
    const k = l.slice(0, c).trim()
    if (!process.env[k]) process.env[k] = l.slice(c + 1).trim().replace(/^["']|["']$/g, '')
  }
} catch {
  console.error('\n✖ No se encontró .env.local\n')
  process.exit(1)
}

const HOST = process.env.SMTP_HOST
const PUERTO = Number(process.env.SMTP_PORT ?? 465)
const USUARIO = process.env.SMTP_USUARIO
const CLAVE = process.env.SMTP_CONTRASENA

if (!HOST || !USUARIO || !CLAVE) {
  console.error('\n✖ Faltan datos del correo en .env.local\n')
  console.error('  Añada temporalmente estas cuatro líneas:\n')
  console.error('    SMTP_HOST=mail.institutopedrojustoberrio.com')
  console.error('    SMTP_PORT=465')
  console.error('    SMTP_USUARIO=noreply@institutopedrojustoberrio.com')
  console.error('    SMTP_CONTRASENA=la contraseña de ese buzón\n')
  console.error('  Bórrelas cuando termine. No se comparten con nadie.\n')
  process.exit(1)
}

/**
 * Conversación SMTP paso a paso.
 *
 * Se implementa a mano en vez de instalar una biblioteca porque lo que se
 * quiere ver es precisamente el diálogo en bruto: una biblioteca lo
 * traduciría a una excepción genérica y volveríamos al problema de partida.
 */
function hablar(socket: tls.TLSSocket, orden: string | null, esperado: string): Promise<string> {
  return new Promise((resolver, rechazar) => {
    let buffer = ''

    const alRecibir = (d: Buffer) => {
      buffer += d.toString()
      // Una respuesta SMTP termina cuando llega una línea «NNN texto», con
      // espacio y no guion tras el número.
      if (!/^\d{3} [^\n]*\r?\n$/m.test(buffer.split(/(?<=\n)/).slice(-1)[0] ?? '')) return
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

async function main() {
  console.log('\nNIDO PJB — prueba del servidor de correo\n')
  console.log(`  servidor : ${HOST}:${PUERTO}`)
  console.log(`  usuario  : ${USUARIO}`)
  console.log(`  clave    : ${'•'.repeat(Math.min(CLAVE!.length, 16))} (${CLAVE!.length} caracteres)\n`)

  const socket = tls.connect({ host: HOST!, port: PUERTO, servername: HOST!, rejectUnauthorized: false })

  socket.setTimeout(20000, () => {
    console.error('✖ El servidor no respondió en 20 segundos.\n')
    socket.destroy()
    process.exit(1)
  })

  await new Promise<void>((r) => socket.once('secureConnect', () => r()))
  console.log('  ✓ Conexión cifrada establecida\n')

  try {
    await hablar(socket, null, '220')
    await hablar(socket, 'EHLO nido-pjb', '250')
    console.log('  ✓ El servidor saluda')

    // AUTH LOGIN: usuario y contraseña van en base64, uno por turno.
    await hablar(socket, 'AUTH LOGIN', '334')
    await hablar(socket, Buffer.from(USUARIO!).toString('base64'), '334')
    await hablar(socket, Buffer.from(CLAVE!).toString('base64'), '235')
    console.log('  ✓ AUTENTICACIÓN CORRECTA\n')

    console.log('  Las credenciales son válidas. Cópielas tal cual en')
    console.log('  Supabase → Project Settings → Authentication → SMTP Settings.\n')
    console.log('  Si allí sigue fallando, revise que «Sender email address»')
    console.log(`  sea exactamente ${USUARIO}: muchos servidores rechazan`)
    console.log('  enviar en nombre de una dirección distinta a la autenticada.\n')

    socket.write('QUIT\r\n')
    socket.end()
  } catch (e) {
    const texto = e instanceof Error ? e.message : String(e)
    console.log('  ✖ EL SERVIDOR RECHAZÓ LA CONVERSACIÓN\n')
    console.log('    Respuesta literal:\n')
    for (const l of texto.split(/\r?\n/)) console.log(`      ${l}`)
    console.log()

    if (/535/.test(texto)) {
      console.log('    535 significa credenciales incorrectas. Las causas habituales:\n')
      console.log('      · El usuario NO es «nido-pjb» ni «noreply»: en cPanel')
      console.log('        es SIEMPRE la dirección completa, con la arroba.')
      console.log('      · La contraseña es la del buzón de correo, no la del')
      console.log('        panel de cPanel ni la del dominio.')
      console.log('      · El buzón no existe todavía: créelo en cPanel →')
      console.log('        Cuentas de correo → Crear.\n')
    } else if (/550|553|554/.test(texto)) {
      console.log('    Ese código suele significar que el servidor no acepta')
      console.log('    enviar en nombre de esa dirección. Compruebe que el buzón')
      console.log('    existe y que coincide con el remitente configurado.\n')
    }

    socket.destroy()
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exit(1)
})
