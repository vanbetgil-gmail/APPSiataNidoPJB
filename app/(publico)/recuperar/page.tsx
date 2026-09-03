import type { Metadata } from 'next'
import { FondoCampus } from '@/components/ui/FondoCampus'
import { FormularioRecuperacion } from './FormularioRecuperacion'

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description: 'Recupere el acceso a NIDO PJB con su correo institucional.',
}

/**
 * Recuperación de contraseña — FR-014b.
 *
 * Comparte la estructura de /login a propósito: quien llega aquí viene de
 * fallar al entrar, y encontrarse una pantalla de aspecto distinto añade la
 * duda de si se equivocó de sitio. Misma tarjeta, mismo panel, mismo tono.
 */
export default function PaginaRecuperar() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div
        className="grid overflow-hidden rounded-[--radius-suave] border lg:grid-cols-2"
        style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
      >
        <aside className="relative hidden min-h-[30rem] flex-col justify-between overflow-hidden p-10 lg:flex">
          <FondoCampus variante="panel" />

          <p className="antetitulo relative" style={{ color: 'rgba(255,255,255,.72)' }}>
            — Una ventana al cuidado
          </p>

          <div className="relative">
            <h1 className="text-5xl" style={{ color: '#ffffff' }}>
              Le pasa
              <br />
              <em style={{ color: 'var(--color-crema)' }}>a cualquiera</em>.
            </h1>
            <p
              className="mt-6 max-w-xs text-[0.95rem] leading-relaxed"
              style={{ color: 'rgba(255,255,255,.86)' }}
            >
              Escriba su correo institucional y le enviamos un enlace para poner una contraseña
              nueva.
            </p>
          </div>

          <p className="relative text-xs" style={{ color: 'rgba(255,255,255,.7)' }}>
            El campus visto desde el dron del proyecto
          </p>
        </aside>

        <main className="flex flex-col">
          <div className="relative flex min-h-[11rem] flex-col justify-end overflow-hidden p-6 lg:hidden">
            <FondoCampus variante="banda" />
            <h1
              className="relative leading-[1.05]"
              style={{
                color: '#ffffff',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.9rem, 9vw, 2.6rem)',
              }}
            >
              Le pasa <em style={{ color: 'var(--color-crema)' }}>a cualquiera</em>.
            </h1>
          </div>

          <div className="mx-auto w-full max-w-sm p-8 sm:p-12">
            <p
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
              style={{ backgroundColor: 'var(--color-salvia-clara)', color: 'var(--color-marca)' }}
            >
              <span aria-hidden>◍</span> Recuperar el acceso
            </p>

            <h2 className="text-3xl sm:text-4xl">¿Olvidó su contraseña?</h2>
            <p className="mt-3 mb-8 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
              Le enviamos un enlace de un solo uso para que ponga una nueva.
            </p>

            <FormularioRecuperacion />
          </div>
        </main>
      </div>
    </div>
  )
}
