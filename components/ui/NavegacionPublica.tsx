'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navegación pública: cuatro subpestañas.
 *
 * ── Dos formas, un mismo contenido ───────────────────────────────────────
 *
 * En escritorio va arriba, junto a la marca. En móvil baja al pie de la
 * pantalla como barra de pestañas, que es donde llega el pulgar.
 *
 * No es una decisión estética. El uso real de esta aplicación en el colegio
 * es un celular sostenido con una mano mientras se camina por el campus:
 * una barra arriba obliga a recolocar la mano en cada cambio de sección.
 *
 * Se usan las MISMAS rutas en ambas, no dos listas que puedan desincronizarse.
 */

export const PESTANAS = [
  { href: '/', etiqueta: 'Mapa', icono: '◎' },
  { href: '/biodiversidad', etiqueta: 'Biodiversidad', icono: '❧' },
  { href: '/estacion', etiqueta: 'Estación', icono: '◈' },
  { href: '/creditos', etiqueta: 'Equipo', icono: '☺' },
] as const

function estaActiva(ruta: string, actual: string): boolean {
  if (ruta === '/') return actual === '/' || actual.startsWith('/especie')
  return actual.startsWith(ruta)
}

/** Barra superior. Oculta en móvil, donde manda la de abajo. */
export function NavegacionEscritorio() {
  const actual = usePathname()

  return (
    <nav aria-label="Secciones" className="hidden items-center gap-1 text-sm md:flex">
      {PESTANAS.map((p) => {
        const activa = estaActiva(p.href, actual)
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={activa ? 'page' : undefined}
            className="rounded-full px-4 py-2 no-underline transition"
            style={{
              color: activa ? 'var(--color-texto)' : 'var(--color-texto-suave)',
              backgroundColor: activa ? 'var(--color-salvia)' : 'transparent',
              fontWeight: activa ? 600 : 400,
            }}
          >
            {p.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Barra inferior de pestañas. Solo en móvil.
 *
 * `env(safe-area-inset-bottom)` deja sitio a la barra de gestos de los
 * teléfonos sin botones físicos; sin eso, la última pestaña queda debajo de
 * la franja del sistema y no se puede tocar.
 */
export function NavegacionMovil() {
  const actual = usePathname()

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-[600] border-t backdrop-blur md:hidden"
      style={{
        borderColor: 'var(--color-borde)',
        backgroundColor: 'rgba(250,249,246,.94)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="grid grid-cols-4">
        {PESTANAS.map((p) => {
          const activa = estaActiva(p.href, actual)
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activa ? 'page' : undefined}
                className="flex flex-col items-center gap-1 px-1 py-2.5 no-underline"
                style={{ color: activa ? 'var(--color-marca)' : 'var(--color-texto-suave)' }}
              >
                <span aria-hidden className="text-lg leading-none">
                  {p.icono}
                </span>
                <span
                  className="text-[0.68rem] leading-none"
                  style={{ fontWeight: activa ? 600 : 400 }}
                >
                  {p.etiqueta}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
