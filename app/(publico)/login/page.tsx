import type { Metadata } from 'next'
import Link from 'next/link'
import { FondoCampus } from '@/components/ui/FondoCampus'
import { FormularioAcceso } from './FormularioAcceso'

export const metadata: Metadata = {
  title: 'Ingresar',
  description: 'Acceso para integrantes del proyecto NIDO PJB.',
}

/**
 * Pantalla de acceso (T042).
 *
 * ── Por qué vive dentro del grupo público ────────────────────────────────
 *
 * Para que conserve la barra con las cuatro subpestañas. Quien llega aquí sin
 * ser del equipo —un acudiente que siguió un enlace, por ejemplo— no debería
 * quedarse en un callejón sin salida: tiene que poder volver al mapa o a
 * Biodiversidad con un toque.
 *
 * Estar en `(publico)` es además correcto de fondo: esta página no exige
 * sesión. Ponerla en `(privado)` la habría hecho redirigirse a sí misma.
 *
 * ── El diseño ────────────────────────────────────────────────────────────
 *
 * Dos mitades dentro de una tarjeta: a la izquierda una ventana serena que
 * dice de qué va el proyecto, a la derecha el formulario y nada más. Las
 * formas orgánicas son decorativas —van con `aria-hidden`— y existen para dar
 * calma, no para llamar la atención.
 *
 * En móvil el panel izquierdo se recoge y queda solo el formulario, que es lo
 * que se necesita ahí.
 *
 * ── Sobre el acceso con contraseña ───────────────────────────────────────
 *
 * El diseño original usaba enlaces de un solo uso al correo (R-005). Se
 * cambió a contraseña porque el acceso ocurre en clase, con el grupo entero
 * esperando, y depender de que once personas abran su bandeja de entrada en
 * ese momento detenía la sesión cada vez que un correo tardaba o caía en
 * «no deseado» (R-005a).
 *
 * Las contraseñas iniciales las reparte el docente responsable y cada quien
 * la cambia desde /cuenta.
 */
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string; error?: string }>
}) {
  const { siguiente, error } = await searchParams

  // FR-015 escenario 6: tras autenticarse hay que llegar a la pantalla que se
  // pidió, no a la portada. Solo se aceptan rutas internas: una URL absoluta
  // aquí sería un redirector abierto hacia cualquier sitio.
  const rutaSolicitada =
    siguiente && siguiente.startsWith('/') && !siguiente.startsWith('//') ? siguiente : '/tableros'

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div
        className="grid overflow-hidden rounded-[--radius-suave] border lg:grid-cols-2"
        style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
      >
        {/* ── Panel de bienvenida ───────────────────────────────────── */}
        <aside className="relative hidden min-h-[34rem] flex-col justify-between overflow-hidden p-10 lg:flex">
          <FondoCampus variante="panel" />

          <p className="antetitulo relative" style={{ color: 'rgba(255,255,255,.72)' }}>
            — Una ventana al cuidado
          </p>

          <div className="relative">
            <h1 className="text-5xl" style={{ color: '#ffffff' }}>
              El aire
              <br />
              <em style={{ color: 'var(--color-crema)' }}>también</em>
              <br />
              enseña.
            </h1>

            <p
              className="mt-6 max-w-xs text-[0.95rem] leading-relaxed"
              style={{ color: 'rgba(255,255,255,.86)' }}
            >
              Un espacio compartido para observar el campus, conversar en familia y tomar
              decisiones tranquilas.
            </p>
          </div>

          <p className="relative text-xs" style={{ color: 'rgba(255,255,255,.7)' }}>
            El campus visto desde el dron del proyecto · Para familias, estudiantes y el equipo PJB
          </p>
        </aside>

        {/* ── Formulario ────────────────────────────────────────────── */}
        <main className="flex flex-col">
          {/* En el celular el panel de la izquierda no se muestra, así que la
              misma frase entra sobre la toma aérea, en una banda propia.
              Lleva su propio video, mucho más ligero: ver FondoCampus. */}
          <div className="relative flex min-h-[15rem] flex-col justify-end overflow-hidden p-6 sm:min-h-[17rem] lg:hidden">
            <FondoCampus variante="banda" />

            {/*
              La misma tipografía de titular que en escritorio. El tamaño se
              ajusta con `clamp` en vez de saltar por puntos de corte: entre
              un celular pequeño y una tableta hay bastante distancia, y una
              frase de tres líneas que cabe en uno se desborda en el otro.
            */}
            <h1
              className="relative leading-[1.05]"
              style={{
                color: '#ffffff',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.1rem, 11vw, 3.1rem)',
              }}
            >
              El aire
              <br />
              <em style={{ color: 'var(--color-crema)' }}>también</em> enseña.
            </h1>

            <p className="relative mt-3 text-xs" style={{ color: 'rgba(255,255,255,.78)' }}>
              El campus visto desde el dron del proyecto
            </p>
          </div>

          <div className="mx-auto w-full max-w-sm p-8 sm:p-12">
            <p
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
              style={{ backgroundColor: 'var(--color-salvia-clara)', color: 'var(--color-marca)' }}
            >
              <span aria-hidden>◍</span> Acceso al equipo
            </p>

            <h2 className="text-3xl sm:text-4xl">Hola, qué bueno verte.</h2>
            <p className="mt-3 mb-8 text-sm" style={{ color: 'var(--color-texto-suave)' }}>
              Ingresa para registrar mediciones y documentar la biodiversidad del colegio.
            </p>

            {error && (
              <p
                role="alert"
                className="mb-6 rounded-[--radius-tarjeta] border px-4 py-3 text-sm leading-relaxed"
                style={{
                  borderColor: 'var(--color-ica-sensibles)',
                  backgroundColor: 'var(--color-crema-clara)',
                  color: 'var(--color-texto)',
                }}
              >
                {error === 'enlace_invalido'
                  ? 'Ese enlace ya se usó o caducó. Pida uno nuevo abajo.'
                  : 'No se pudo completar el acceso. Inténtelo de nuevo.'}
              </p>
            )}

            <FormularioAcceso rutaSolicitada={rutaSolicitada} />

            <div className="my-7 flex items-center gap-4">
              <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-borde)' }} />
              <span aria-hidden className="text-xs" style={{ color: 'var(--color-texto-suave)' }}>
                ○
              </span>
              <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-borde)' }} />
            </div>

            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3.5 text-sm no-underline"
              style={{ borderColor: 'var(--color-borde)', color: 'var(--color-texto)' }}
            >
              Ver el mapa sin cuenta
            </Link>

            <p
              className="mt-7 flex items-center justify-center gap-2 text-center text-xs"
              style={{ color: 'var(--color-texto-suave)' }}
            >
              <span aria-hidden>⛉</span> Tus datos se cuidan con privacidad
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
