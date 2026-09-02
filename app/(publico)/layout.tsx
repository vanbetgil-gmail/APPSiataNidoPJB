import { Marca } from '@/components/ui/Marca'
import Link from 'next/link'

/**
 * Grupo de rutas PÚBLICO.
 *
 * Nada de aquí dentro puede exigir sesión (FR-005, SC-001). Que la separación
 * sea un grupo de rutas y no un condicional hace visible en el propio árbol de
 * archivos qué es público, y reduce la probabilidad de proteger por descuido
 * una pantalla que debía estar abierta —o de abrir una que no.
 *
 * Nótese que NO hay comprobación de sesión en este layout. Es deliberado.
 */
export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[color:var(--color-borde)] bg-[color:var(--color-superficie)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Marca />
          <nav className="desplazable-x flex items-center gap-4 text-sm">
            <Link href="/" className="text-[color:var(--color-texto-suave)] no-underline hover:text-[color:var(--color-texto)]">
              Mapa
            </Link>
            <Link href="/biodiversidad" className="text-[color:var(--color-texto-suave)] no-underline hover:text-[color:var(--color-texto)]">
              Biodiversidad
            </Link>
            <Link href="/estacion" className="text-[color:var(--color-texto-suave)] no-underline hover:text-[color:var(--color-texto)]">
              Estación
            </Link>
            <Link href="/creditos" className="text-[color:var(--color-texto-suave)] no-underline hover:text-[color:var(--color-texto)]">
              Equipo
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[color:var(--color-borde)] px-3 py-1.5 text-[color:var(--color-texto)] no-underline"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[color:var(--color-borde)] px-4 py-6 text-center text-xs text-[color:var(--color-texto-suave)]">
        Proyecto ambiental escolar · Instituto Pedro Justo Berrío
      </footer>
    </div>
  )
}
