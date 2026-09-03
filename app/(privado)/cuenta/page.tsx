import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { integranteActual } from '@/lib/auth/sesion'
import { FormularioContrasena } from './FormularioContrasena'

export const metadata: Metadata = {
  title: 'Mi cuenta',
  description: 'Cambiar la contraseña de acceso a NIDO PJB.',
}

/**
 * Pantalla de cuenta — FR-014a.
 *
 * Existe para que la contraseña que reparte el docente responsable sea
 * temporal de verdad. Sin un sitio donde cambiarla, once personas seguirían
 * usando indefinidamente una clave que se dictó en voz alta en un salón.
 */
export default async function PaginaCuenta({
  searchParams,
}: {
  searchParams: Promise<{ recuperacion?: string }>
}) {
  const integrante = await integranteActual()
  if (!integrante) redirect('/login')

  // Marca que pone el enlace del correo de recuperación (FR-014b).
  const { recuperacion } = await searchParams
  const vieneDeRecuperar = recuperacion === '1'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <p className="antetitulo">— Mi cuenta</p>
      <h1 className="mt-2 text-4xl">{integrante.nombre}</h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
        {integrante.correo} ·{' '}
        {integrante.rol === 'responsable' ? 'Docente responsable' : 'Integrante del equipo'}
      </p>

      {vieneDeRecuperar && (
        <div
          role="status"
          className="mt-6 rounded-[--radius-tarjeta] border px-5 py-4 text-sm leading-relaxed"
          style={{
            borderColor: 'var(--color-marca)',
            backgroundColor: 'var(--color-salvia-clara)',
          }}
        >
          <strong>Ya entró con el enlace del correo.</strong> Escriba ahora su contraseña nueva: el
          enlace no vuelve a servir, así que si cierra sin cambiarla tendrá que pedir otro.
        </div>
      )}

      <hr className="my-9" style={{ borderColor: 'var(--color-borde)' }} />

      <h2 className="text-2xl">Cambiar la contraseña</h2>
      <p
        className="mt-2 mb-7 max-w-prose text-sm leading-relaxed"
        style={{ color: 'var(--color-texto-suave)' }}
      >
        Si todavía usa la que le entregaron, cámbiela ahora. Esa la conoce quien se la dictó, y
        cualquiera que estuviera cerca en ese momento.
      </p>

      <FormularioContrasena />

      <hr className="my-9" style={{ borderColor: 'var(--color-borde)' }} />

      <h2 className="text-2xl">Si alguna vez la olvida</h2>
      <p
        className="mt-2 max-w-prose text-sm leading-relaxed"
        style={{ color: 'var(--color-texto-suave)' }}
      >
        Hay dos caminos, y conviene conocer los dos. Desde la pantalla de acceso, «¿Olvidó su
        contraseña?» le envía un enlace a su correo institucional. Y si ese correo no llega, el
        docente responsable puede restablecérsela en el momento, sin depender del correo.
      </p>
    </div>
  )
}
