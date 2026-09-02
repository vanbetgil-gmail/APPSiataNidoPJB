import Link from 'next/link'
import { Marca } from '@/components/ui/Marca'
import { NavegacionEscritorio, NavegacionMovil } from '@/components/ui/NavegacionPublica'
import { integranteActual } from '@/lib/auth/sesion'

/**
 * Grupo de rutas PÚBLICO.
 *
 * Nada de aquí dentro puede exigir sesión (FR-005, SC-001). Que la separación
 * sea un grupo de rutas y no un condicional hace visible en el propio árbol de
 * archivos qué es público.
 *
 * ── Sobre `integranteActual()` aquí ──────────────────────────────────────
 *
 * Se consulta la sesión, pero NO para exigirla: para saber si mostrar el
 * botón «Ingresar» o el nombre de quien ya entró. Si no hay sesión, la página
 * se sirve igual. Es la diferencia entre adaptar la interfaz y proteger.
 *
 * Esto es lo que permite que Biodiversidad sea una sola pestaña: la misma
 * página que ve cualquier visitante, con las opciones de edición añadidas
 * para quien tiene cuenta.
 */
export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  const integrante = await integranteActual()

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="sticky top-0 z-[500] border-b backdrop-blur"
        style={{
          borderColor: 'var(--color-borde)',
          backgroundColor: 'rgba(250,249,246,.88)',
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Marca />
          <NavegacionEscritorio />

          {integrante ? (
            <Link
              href="/tableros"
              className="shrink-0 rounded-full px-4 py-2 text-sm no-underline"
              style={{ backgroundColor: 'var(--color-salvia)', color: 'var(--color-texto)' }}
            >
              <span className="hidden sm:inline">Hola, </span>
              {integrante.nombre.split(' ')[0]}
            </Link>
          ) : (
            <Link
              href="/login"
              className="shrink-0 rounded-full px-4 py-2 text-sm text-white no-underline"
              style={{ backgroundColor: 'var(--color-bosque)' }}
            >
              Ingresar
            </Link>
          )}
        </div>
      </header>

      {/* pb-20 en móvil: deja sitio a la barra de pestañas de abajo, que es
          fija y taparía el final del contenido. */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <footer
        className="mt-16 border-t px-4 py-10 pb-24 text-center md:pb-10"
        style={{
          borderColor: 'var(--color-borde)',
          backgroundColor: 'var(--color-salvia-clara)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--color-texto)' }}>
          NIDO PJB · Nodo de Investigación y Datos Observados
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          Proyecto ambiental escolar del Instituto Salesiano Pedro Justo Berrío, Medellín
        </p>
      </footer>

      <NavegacionMovil />
    </div>
  )
}
