/**
 * SIATA PJB — envía un aviso de prueba por el mismo camino que la aplicación.
 *
 * Se ejecuta con:
 *   pnpm probar-aviso                       (a CORREO_AVISOS_REVISION)
 *   pnpm probar-aviso alguien@colegio.edu.co
 *
 * ── En qué se diferencia de `pnpm probar-smtp` ───────────────────────────
 *
 * `probar-smtp` comprueba que el servidor acepta las credenciales y ahí se
 * detiene. Eso deja sin responder la pregunta que de verdad importa: ¿llega
 * el correo a la bandeja de entrada?
 *
 * Entre autenticarse y que un mensaje aparezca en el buzón pueden fallar
 * varias cosas más —que el servidor no acepte el remitente, que el
 * destinatario rechace el dominio, que acabe en correo no deseado— y ninguna
 * se ve hasta que se manda un mensaje de verdad.
 *
 * Este script usa `lib/correo/enviar.ts`, exactamente el mismo código que
 * usa el aviso de «ficha por revisar». Si esto llega, aquello llegará.
 */

import { readFileSync } from 'node:fs'
import { enviarCorreo } from '../lib/correo/enviar'
import { MARCA, PLATAFORMA } from '../lib/marca'

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

const destinos = process.argv
  .slice(2)
  .flatMap((a) => a.split(/[,;\s]+/))
  .map((c) => c.trim())
  .filter(Boolean)

const para =
  destinos.length > 0
    ? destinos
    : (process.env.CORREO_AVISOS_REVISION ?? '')
        .split(/[,;\s]+/)
        .map((c) => c.trim())
        .filter(Boolean)

async function main() {
  console.log(`\n${MARCA} — prueba del aviso de revisión\n`)

  if (para.length === 0) {
    console.error('✖ No hay a quién escribir.\n')
    console.error('  Pase una dirección:\n')
    console.error('    pnpm probar-aviso alguien@institutopedrojustoberrio.com\n')
    console.error('  O añada a .env.local la línea:\n')
    console.error('    CORREO_AVISOS_REVISION=alguien@institutopedrojustoberrio.com\n')
    process.exitCode = 1
    return
  }

  // Las variables del correo no llevan prefijo NEXT_PUBLIC_ a propósito, así
  // que aquí solo se enseña el servidor y el usuario. La contraseña, nunca.
  console.log(`  servidor     : ${process.env.SMTP_HOST ?? '(sin configurar)'}`)
  console.log(`  usuario      : ${process.env.SMTP_USUARIO ?? '(sin configurar)'}`)
  console.log(`  destinatarios: ${para.join(', ')}\n`)

  const cuerpo = [
    'Este es un aviso de prueba. Nadie envió ninguna ficha.',
    '',
    'Si lo está leyendo, el aviso automático de «hay una ficha por revisar»',
    'va a funcionar: usa este mismo camino.',
    '',
    'Conviene comprobar dos cosas más:',
    '',
    '  · Que no haya caído en correo no deseado. Si cayó, márquelo como',
    '    correo deseado una vez y los siguientes irán a la bandeja.',
    '  · Que el remitente se vea con un nombre reconocible y no como una',
    '    dirección suelta.',
    '',
    '—',
    `${MARCA} · ${PLATAFORMA}`,
  ].join('\n')

  const resultado = await enviarCorreo({
    para,
    asunto: `Prueba de avisos — ${MARCA}`,
    cuerpo,
  })

  if (resultado.ok) {
    console.log('  ✓ El servidor aceptó el mensaje.\n')
    console.log('    Revise la bandeja de entrada, y también la de correo no')
    console.log('    deseado. Que el servidor lo acepte no garantiza que el')
    console.log('    destinatario lo muestre.\n')
    return
  }

  if (resultado.motivo === 'sin_configurar') {
    console.error('  ✖ Falta configurar el servidor de correo.\n')
    console.error('    Añada a .env.local estas cuatro líneas, y las mismas a Vercel:\n')
    console.error('      SMTP_HOST=mail.institutopedrojustoberrio.com')
    console.error('      SMTP_PORT=465')
    console.error('      SMTP_USUARIO=<la dirección completa del buzón>')
    console.error('      SMTP_CONTRASENA=<la contraseña de ese buzón>\n')
    process.exitCode = 1
    return
  }

  console.error('  ✖ El servidor rechazó el envío.\n')
  console.error('    Respuesta literal:\n')
  for (const l of resultado.detalle.split(/\r?\n/)) console.error(`      ${l}`)
  console.error('')

  if (/535/.test(resultado.detalle)) {
    console.error('    535 es contraseña o usuario incorrectos. En cPanel el usuario')
    console.error('    es SIEMPRE la dirección completa, con arroba.\n')
  } else if (/550|553|554/.test(resultado.detalle)) {
    console.error('    Ese código suele significar que el servidor no acepta enviar')
    console.error('    en nombre de esa dirección, o que el destinatario la rechaza.\n')
  }

  process.exitCode = 1
}

main().catch((e) => {
  console.error('\n✖ Error inesperado:', e instanceof Error ? e.message : e, '\n')
  process.exitCode = 1
})
