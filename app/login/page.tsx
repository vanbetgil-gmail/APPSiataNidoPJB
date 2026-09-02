import type { Metadata } from 'next'
import Link from 'next/link'
import { Marca } from '@/components/ui/Marca'
import { FormularioAcceso } from './FormularioAcceso'

export const metadata: Metadata = {
  title: 'Ingresar',
  description: 'Acceso para integrantes del proyecto NIDO PJB.',
}

/**
 * Página de acceso (T042).
 *
 * Vive fuera del grupo `(privado)` a propósito: si estuviera dentro, el
 * layout privado la redirigiría a sí misma en un bucle infinito.
 */
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>
}) {
  const { siguiente } = await searchParams

  // FR-015 escenario 6: tras autenticarse hay que llegar a la pantalla que se
  // pidió, no a la portada. Solo se aceptan rutas internas: una URL absoluta
  // aquí sería un redirector abierto hacia cualquier sitio.
  const rutaSolicitada =
    siguiente && siguiente.startsWith('/') && !siguiente.startsWith('//')
      ? siguiente
      : '/tableros'

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <Marca conLecturaCompleta />

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Ingresar al proyecto</h1>
      <p className="mt-2 mb-8 text-sm leading-relaxed text-[color:var(--color-texto-suave)]">
        Para registrar mediciones, documentar especies y ver los tableros.
      </p>

      <FormularioAcceso rutaSolicitada={rutaSolicitada} />

      <p className="mt-8 text-sm text-[color:var(--color-texto-suave)]">
        ¿Solo quiere ver el mapa?{' '}
        <Link href="/" className="text-[color:var(--color-marca)]">
          El mapa de biodiversidad es público
        </Link>{' '}
        y no necesita cuenta.
      </p>
    </div>
  )
}
