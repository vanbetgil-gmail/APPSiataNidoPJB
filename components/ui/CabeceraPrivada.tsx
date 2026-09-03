import Link from 'next/link'
import { Marca } from './Marca'
import { InsigniaVerificacion } from '@/components/fichas/InsigniaVerificacion'
import { cerrarSesion } from '@/lib/auth/acciones'
import type { RolIntegrante } from '@/lib/supabase/tipos'

/**
 * Cabecera de la zona privada (T045) — FR-016.
 *
 * Muestra quién ha iniciado sesión (escenario 1 de la Historia 2) y ofrece
 * cierre de sesión explícito.
 *
 * Las opciones de responsable solo se pintan para quien lo es. Es comodidad,
 * no seguridad: quien fuerce la URL igual se topará con RLS.
 */
export function CabeceraPrivada({
  nombre,
  rol,
  pendientesRevision = 0,
}: {
  nombre: string
  rol: RolIntegrante
  pendientesRevision?: number
}) {
  const esResponsable = rol === 'responsable'

  return (
    <header className="border-b border-[color:var(--color-borde)] bg-[color:var(--color-superficie)]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Marca />

        <nav className="desplazable-x flex items-center gap-1 text-sm">
          <Enlace href="/jornadas">Mediciones</Enlace>
          <Enlace href="/tableros">Tableros</Enlace>
          <Enlace href="/fichas">
            Mis fichas
            <InsigniaVerificacion cantidad={pendientesRevision} esResponsable={esResponsable} />
          </Enlace>
          {esResponsable && <Enlace href="/revision">Revisión</Enlace>}
          {esResponsable && <Enlace href="/admin/integrantes">Equipo</Enlace>}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {/* El nombre lleva a la cuenta: es donde se cambia la contraseña,
              y es el sitio donde la gente la busca. */}
          <Enlace href="/cuenta">
            {nombre}
            {esResponsable && ' · responsable'}
          </Enlace>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="rounded-full border border-[color:var(--color-borde)] px-3 py-1.5"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full px-3 py-2 text-[color:var(--color-texto-suave)] no-underline hover:bg-[color:var(--color-fondo)] hover:text-[color:var(--color-texto)]"
    >
      {children}
    </Link>
  )
}
