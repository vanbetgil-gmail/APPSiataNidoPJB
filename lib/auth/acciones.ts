'use server'

import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LARGO_MINIMO_CONTRASENA } from '@/lib/auth/reglas'
import { normalizarCorreo, verificarAcceso } from '@/lib/auth/verificarAcceso'
import type { Database } from '@/lib/supabase/tipos'

/**
 * Acciones de acceso — FR-011, FR-012, R-005a.
 *
 * ── Por qué contraseña y no enlace al correo ─────────────────────────────
 *
 * El diseño original usaba enlaces de un solo uso (R-005), y para menores de
 * edad tenía a su favor que no hay contraseñas que olvidar ni reutilizar.
 *
 * En la práctica no se sostuvo. El acceso se usa en clase, con el grupo
 * entero esperando, y depender de que once personas abran su bandeja de
 * entrada en ese momento convierte cada sesión en un problema de logística.
 * Si el correo tarda, o cae en «no deseado», o el estudiante no recuerda la
 * contraseña de su correo institucional, la clase se detiene.
 *
 * La contraseña traslada esa fragilidad a un sitio que el colegio controla:
 * el docente responsable puede restablecerla en el momento.
 *
 * ── Lo que NO cambia ─────────────────────────────────────────────────────
 *
 * La verificación previa sigue igual: dominio institucional y pertenencia al
 * equipo se comprueban EN EL SERVIDOR antes de pedirle nada a Supabase. Y la
 * barrera definitiva sigue siendo RLS, no esto: aunque alguien consiguiera
 * una sesión, `es_integrante_activo()` le negaría los datos igualmente.
 */

export type EstadoFormulario =
  | { tipo: 'inicial' }
  | { tipo: 'rechazado'; mensaje: string; motivo: 'dominio' | 'no_autorizado' | 'inactivo' }
  | { tipo: 'error'; mensaje: string }

function clienteConCookies(almacen: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (nuevas: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            nuevas.forEach(({ name, value, options }) => almacen.set(name, value, options))
          } catch {
            // Los componentes de servidor no siempre pueden escribir cookies.
          }
        },
      },
    }
  )
}

export async function iniciarSesion(
  _anterior: EstadoFormulario,
  formulario: FormData
): Promise<EstadoFormulario> {
  const correo = normalizarCorreo(String(formulario.get('correo') ?? ''))
  const contrasena = String(formulario.get('contrasena') ?? '')
  const rutaBruta = String(formulario.get('rutaSolicitada') ?? '/tableros')

  // Solo rutas internas: una URL absoluta aquí sería un redirector abierto.
  const rutaSolicitada =
    rutaBruta.startsWith('/') && !rutaBruta.startsWith('//') ? rutaBruta : '/tableros'

  if (!correo) return { tipo: 'error', mensaje: 'Escriba su correo institucional.' }
  if (!contrasena) return { tipo: 'error', mensaje: 'Escriba su contraseña.' }

  const acceso = await verificarAcceso(correo)

  switch (acceso.estado) {
    case 'dominio_ajeno':
      return { tipo: 'rechazado', mensaje: acceso.mensaje, motivo: 'dominio' }
    case 'no_autorizado':
      return { tipo: 'rechazado', mensaje: acceso.mensaje, motivo: 'no_autorizado' }
    case 'inactivo':
      return { tipo: 'rechazado', mensaje: acceso.mensaje, motivo: 'inactivo' }
    case 'error':
      return { tipo: 'error', mensaje: acceso.mensaje }
  }

  const supabase = clienteConCookies(await cookies())
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })

  if (error) {
    /*
     * Un único mensaje para «contraseña incorrecta».
     *
     * A estas alturas ya sabemos que el correo pertenece al equipo, así que
     * distinguir «esa no es tu contraseña» de «esa cuenta no existe» no
     * añadiría nada útil y sí serviría para confirmar cuentas desde fuera.
     *
     * El límite de intentos lo aplica Supabase; si se supera, su propio
     * mensaje lo indica y conviene dejarlo pasar tal cual.
     */
    const demasiados = /rate|too many|limit/i.test(error.message)
    return {
      tipo: 'error',
      mensaje: demasiados
        ? 'Demasiados intentos seguidos. Espere un minuto y vuelva a intentarlo.'
        : 'La contraseña no es correcta. Si la olvidó, use «¿Olvidó su contraseña?» o pídale al docente responsable que se la restablezca.',
    }
  }

  redirect(rutaSolicitada)
}

/**
 * Cambio de contraseña de la propia cuenta (FR-014a).
 *
 * Supabase exige una sesión válida para `updateUser`, así que esta acción
 * solo puede ejecutarla quien ya entró. No hace falta pedir la contraseña
 * anterior: tener la sesión abierta ya lo demuestra.
 */
export type EstadoContrasena =
  | { tipo: 'inicial' }
  | { tipo: 'cambiada' }
  | { tipo: 'error'; mensaje: string }

export async function cambiarContrasena(
  _anterior: EstadoContrasena,
  formulario: FormData
): Promise<EstadoContrasena> {
  const nueva = String(formulario.get('nueva') ?? '')
  const repetida = String(formulario.get('repetida') ?? '')

  if (nueva.length < LARGO_MINIMO_CONTRASENA) {
    return {
      tipo: 'error',
      mensaje: `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
    }
  }

  if (nueva !== repetida) {
    return { tipo: 'error', mensaje: 'Las dos contraseñas no coinciden.' }
  }

  const supabase = clienteConCookies(await cookies())
  const { error } = await supabase.auth.updateUser({ password: nueva })

  if (error) {
    return {
      tipo: 'error',
      mensaje: 'No se pudo cambiar la contraseña. Vuelva a entrar e inténtelo de nuevo.',
    }
  }

  return { tipo: 'cambiada' }
}

/**
 * Recuperación de contraseña por correo (FR-014b).
 *
 * ── Por qué existe, si ya hay otra vía ───────────────────────────────────
 *
 * El docente responsable puede restablecer la contraseña de cualquiera con
 * `pnpm asignar-contrasenas <correo>`, y esa vía no depende del correo. Pero
 * exige que la docente esté disponible y frente a su computador, lo que un
 * domingo por la noche antes de una entrega no siempre ocurre.
 *
 * Esta es la vía autónoma. La otra sigue existiendo y es la que funciona
 * cuando el correo falla, así que el mensaje de esta pantalla la menciona:
 * dejar a alguien sin salida porque un servidor de correo no responde sería
 * peor que no ofrecer la opción.
 *
 * ── Sobre distinguir los motivos de rechazo ──────────────────────────────
 *
 * Se reutiliza `verificarAcceso`, que dice si el correo es de otro dominio o
 * si no pertenece al equipo. Revelar que una cuenta existe es un riesgo real
 * en un servicio abierto; aquí el equipo son once personas que se conocen, y
 * la pantalla de acceso ya lo distingue. Ser incoherente entre las dos
 * pantallas confundiría sin proteger nada.
 */
export type EstadoRecuperacion =
  | { tipo: 'inicial' }
  | { tipo: 'enviado'; correo: string }
  | { tipo: 'rechazado'; mensaje: string }
  | { tipo: 'error'; mensaje: string }

export async function solicitarRecuperacion(
  _anterior: EstadoRecuperacion,
  formulario: FormData
): Promise<EstadoRecuperacion> {
  const correo = normalizarCorreo(String(formulario.get('correo') ?? ''))

  if (!correo) return { tipo: 'error', mensaje: 'Escriba su correo institucional.' }

  const acceso = await verificarAcceso(correo)

  switch (acceso.estado) {
    case 'dominio_ajeno':
    case 'no_autorizado':
    case 'inactivo':
      return { tipo: 'rechazado', mensaje: acceso.mensaje }
    case 'error':
      return { tipo: 'error', mensaje: acceso.mensaje }
  }

  const supabase = clienteConCookies(await cookies())

  /*
   * El enlace del correo aterriza en el canje que ya existe, con destino
   * /cuenta. Allí está el formulario de cambio de contraseña, así que no
   * hace falta una pantalla nueva: quien llega ya tiene sesión y lo único
   * que necesita es escribir la nueva.
   */
  const origen = process.env.NEXT_PUBLIC_URL_SITIO ?? 'https://app-siata-nido-pjb.vercel.app'

  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${origen}/auth/callback?siguiente=${encodeURIComponent('/cuenta?recuperacion=1')}`,
  })

  if (error) {
    const demasiados = /rate|too many|limit|seconds/i.test(error.message)
    return {
      tipo: 'error',
      mensaje: demasiados
        ? 'Ya se pidió un enlace hace poco. Espere un minuto y vuelva a intentarlo.'
        : 'No se pudo enviar el correo. Pídale al docente responsable que le restablezca la contraseña.',
    }
  }

  return { tipo: 'enviado', correo }
}

export async function cerrarSesion(): Promise<void> {
  const supabase = clienteConCookies(await cookies())
  await supabase.auth.signOut()
}
