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
export default async function PaginaCuenta() {
  const integrante = await integranteActual()
  if (!integrante) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <p className="antetitulo">— Mi cuenta</p>
      <h1 className="mt-2 text-4xl">{integrante.nombre}</h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
        {integrante.correo} ·{' '}
        {integrante.rol === 'responsable' ? 'Docente responsable' : 'Integrante del equipo'}
      </p>

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

      <h2 className="text-2xl">¿Olvidó la contraseña?</h2>
      <p
        className="mt-2 max-w-prose text-sm leading-relaxed"
        style={{ color: 'var(--color-texto-suave)' }}
      >
        Pídale al docente responsable que se la restablezca. Le entregará una nueva y podrá
        cambiarla aquí mismo.
      </p>
    </div>
  )
}
