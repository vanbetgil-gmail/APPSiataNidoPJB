import Link from 'next/link'
import type { FichaPublica } from '@/lib/supabase/tipos'

export interface EspecieConFoto extends FichaPublica {
  foto: string | null
  /** Presente solo cuando quien mira tiene sesión y puede editarla. */
  editable?: boolean
}

/**
 * Tarjeta de una especie en el catálogo público.
 *
 * La foto es lo primero que se ve: en un inventario de biodiversidad hecho
 * por estudiantes, la imagen es el contenido, no un adorno. El nombre
 * científico va en cursiva porque es la convención de la nomenclatura
 * binomial, y aquí eso además enseña.
 */
export function TarjetaEspecie({ especie }: { especie: EspecieConFoto }) {
  return (
    <Link
      href={especie.editable ? `/fichas/${especie.id}/editar` : `/especie/${especie.id}`}
      className="group flex flex-col overflow-hidden rounded-[--radius-suave] border no-underline transition"
      style={{
        borderColor: 'var(--color-borde)',
        backgroundColor: 'var(--color-superficie)',
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--color-fondo)]">
        {especie.foto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={especie.foto}
            alt={`Fotografía de ${especie.nombre_comun}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[color:var(--color-texto-suave)]">
            Sin fotografía
          </div>
        )}

        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ backgroundColor: 'rgba(255,255,255,.92)', color: 'var(--color-texto)' }}
        >
          {especie.categoria}
        </span>

        {/* Solo aparece para quien puede editar. Un visitante no ve nada
            distinto: es la misma pestaña, con una capa más para el equipo. */}
        {especie.editable && (
          <span
            className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: 'var(--color-bosque)', color: '#fff' }}
          >
            Editar ficha
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {especie.nombre_comun}
        </h3>
        <p className="text-sm italic" style={{ color: 'var(--color-texto-suave)' }}>
          {especie.nombre_cientifico}
        </p>
        <p
          className="mt-1 line-clamp-2 text-sm leading-relaxed"
          style={{ color: 'var(--color-texto-suave)' }}
        >
          {especie.descripcion}
        </p>

        {/* FR-051f: sin nombre visible, se atribuye al equipo. Nunca queda
            sin atribución alguna. */}
        <p className="mt-auto pt-3 text-xs" style={{ color: 'var(--color-texto-suave)' }}>
          {especie.autor_visible ? `Documentada por ${especie.autor_visible}` : 'Equipo NIDO PJB'}
        </p>
      </div>
    </Link>
  )
}
