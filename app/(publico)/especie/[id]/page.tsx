import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { crearClientePublico } from '@/lib/supabase/servidor'
import { urlFoto } from '@/lib/sitio'
import type { FichaPublica } from '@/lib/supabase/tipos'

/**
 * Ficha pública de una especie (T034) — FR-009.
 *
 * Direccionable y compartible: su identificador es permanente. Aunque la
 * ficha se edite, se despublique y se vuelva a publicar, el enlace no cambia
 * (contracts/README.md). Romperlo invalidaría los enlaces que los estudiantes
 * ya hayan compartido.
 *
 * Lee de la vista `ficha_publica`, que solo devuelve fichas en estado
 * `publicado` y jamás incluye correos (FR-051). El nombre del autor aparece
 * únicamente si esa ficha activó `mostrar_autor` y hay autorización de
 * acudiente registrada (FR-051a, FR-051d); si no, se atribuye al equipo
 * (FR-051f).
 */

async function obtenerFicha(id: string): Promise<FichaPublica | null> {
  const supabase = crearClientePublico()
  const { data } = await supabase.from('ficha_publica').select('*').eq('id', id).maybeSingle()
  return (data as FichaPublica | null) ?? null
}

/**
 * Metadatos de la ficha, con vista previa para compartir.
 *
 * ── Por qué esto importa en un proyecto escolar ──────────────────────────
 *
 * La forma real en que este mapa va a circular es un estudiante mandando el
 * enlace de un guayacán por WhatsApp a su familia. Si la vista previa muestra
 * el logo genérico, el enlace parece publicidad y nadie lo abre. Si muestra
 * LA FOTO DEL ÁRBOL con su nombre, se abre.
 *
 * La imagen tiene que ser una URL absoluta: los clientes de mensajería no
 * resuelven rutas relativas. De eso se encarga `metadataBase` del layout.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const ficha = await obtenerFicha(id)

  if (!ficha) {
    return { title: 'Especie no encontrada', robots: { index: false, follow: false } }
  }

  const supabase = crearClientePublico()
  const { data: portada } = await supabase
    .from('foto_ficha')
    .select('ruta_storage')
    .eq('ficha_id', ficha.id)
    .order('orden')
    .limit(1)
    .maybeSingle()

  const descripcion = `${ficha.nombre_cientifico} · ${ficha.descripcion.slice(0, 150)}`
  const imagenes = portada
    ? [{ url: urlFoto(portada.ruta_storage), alt: `Fotografía de ${ficha.nombre_comun}` }]
    : undefined

  return {
    title: ficha.nombre_comun,
    description: descripcion,
    alternates: { canonical: `/especie/${ficha.id}` },
    openGraph: {
      type: 'article',
      title: `${ficha.nombre_comun} · Biodiversidad PJB`,
      description: descripcion,
      url: `/especie/${ficha.id}`,
      images: imagenes,
    },
    twitter: {
      card: imagenes ? 'summary_large_image' : 'summary',
      title: `${ficha.nombre_comun} · Biodiversidad PJB`,
      description: descripcion,
      images: imagenes?.map((i) => i.url),
    },
  }
}

export default async function PaginaEspecie({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ficha = await obtenerFicha(id)

  if (!ficha) notFound()

  const supabase = crearClientePublico()
  const { data: fotos } = await supabase
    .from('foto_ficha')
    .select('ruta_storage, orden')
    .eq('ficha_id', ficha.id)
    .order('orden')

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-[color:var(--color-marca)] no-underline">
        ← Volver al mapa
      </Link>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">{ficha.nombre_comun}</h1>
        <p className="mt-1 text-lg italic text-[color:var(--color-texto-suave)]">
          {ficha.nombre_cientifico}
        </p>
        <span className="mt-3 inline-block rounded-full bg-[color:var(--color-marca-suave)] px-3 py-1 text-sm text-[color:var(--color-marca)]">
          {ficha.categoria}
        </span>
      </header>

      {fotos && fotos.length > 0 && (
        <div className="mt-6 grid gap-3">
          {fotos.map((foto) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={foto.ruta_storage}
              src={urlFoto(foto.ruta_storage)}
              alt={`Fotografía de ${ficha.nombre_comun} tomada en el colegio`}
              loading="lazy"
              className="w-full rounded-[--radius-tarjeta] border border-[color:var(--color-borde)]"
            />
          ))}
        </div>
      )}

      <div className="mt-6 leading-relaxed">
        {ficha.descripcion.split('\n').map((parrafo, i) => (
          <p key={i} className="mb-3">
            {parrafo}
          </p>
        ))}
      </div>

      <footer className="mt-8 border-t border-[color:var(--color-borde)] pt-4 text-sm text-[color:var(--color-texto-suave)]">
        {/* FR-051f: sin nombre visible, la ficha se atribuye al equipo.
            Nunca queda sin atribución alguna. */}
        {ficha.autor_visible ? (
          <p>Documentada por {ficha.autor_visible}, del equipo NIDO PJB.</p>
        ) : (
          <p>Documentada por el equipo NIDO PJB.</p>
        )}
      </footer>
    </article>
  )
}
