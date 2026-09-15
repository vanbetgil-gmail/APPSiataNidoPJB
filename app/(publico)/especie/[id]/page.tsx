import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { crearClientePublico } from '@/lib/supabase/servidor'
import { CarruselFotos } from '@/components/fichas/CarruselFotos'
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
    <article className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm text-[color:var(--color-marca)] no-underline">
        ← Volver al mapa
      </Link>

      {/*
        ── Dos columnas en escritorio, una en móvil ─────────────────────

        El texto a la izquierda y la fotografía a la derecha. En una sola
        columna la foto empujaba la descripción tan abajo que había que
        desplazarse para leerla, y en una pantalla ancha dejaba medio ancho
        vacío a los lados.

        `lg:items-start` con `lg:sticky` en la columna de la foto: al leer
        una descripción larga, la imagen se queda a la vista en vez de irse
        hacia arriba. Es lo que uno quiere mirando un árbol mientras lee
        sobre él.

        El orden en el HTML pone el TEXTO primero. En móvil se apila en ese
        mismo orden, que es el que ya funcionaba, y es además el orden en que
        lo lee quien usa un lector de pantalla: primero de qué habla la
        página, después su ilustración.
      */}
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-start lg:gap-12">
        <div className="min-w-0">
          <header>
            <h1 className="text-3xl sm:text-4xl">{ficha.nombre_comun}</h1>
            <p className="mt-1 text-lg italic" style={{ color: 'var(--color-texto-suave)' }}>
              {ficha.nombre_cientifico}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="inline-block rounded-full px-3 py-1 text-sm"
                style={{
                  backgroundColor: 'var(--color-marca-suave)',
                  color: 'var(--color-marca)',
                }}
              >
                {ficha.categoria}
              </span>

              {/*
                La zona del campus (migración 0012).

                Es la respuesta a «¿dónde puedo ir a verlo?», que es lo
                primero que pregunta quien lee una ficha estando en el
                colegio. Y hoy es la ÚNICA respuesta posible: el mapa todavía
                no tiene ortofoto.
              */}
              {ficha.zona && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
                  style={{
                    backgroundColor: 'var(--color-salvia-clara)',
                    color: 'var(--color-texto)',
                  }}
                >
                  <span aria-hidden>◍</span>
                  {ficha.zona}
                </span>
              )}
            </div>
          </header>

          <div className="mt-6 max-w-prose leading-relaxed">
            {ficha.descripcion.split(/\r?\n/).map((parrafo, i) =>
              parrafo.trim() ? (
                <p key={i} className="mb-4">
                  {parrafo}
                </p>
              ) : null
            )}
          </div>

          <footer
            className="mt-8 border-t pt-4 text-sm"
            style={{ borderColor: 'var(--color-borde)', color: 'var(--color-texto-suave)' }}
          >
            {/* FR-051f: sin nombre visible, la ficha se atribuye al equipo.
                Nunca queda sin atribución alguna. */}
            {ficha.autor_visible ? (
              <p>Documentada por {ficha.autor_visible}, del equipo SIATA PJB.</p>
            ) : (
              <p>Documentada por el equipo SIATA PJB.</p>
            )}
          </footer>
        </div>

        {/*
          Las fotos van en carrusel, no apiladas.

          Una especie suele tener varias —el árbol entero, la hoja de cerca,
          la flor— y apiladas la segunda y la tercera quedaban tan abajo que
          nadie llegaba a verlas. En el celular se desliza con el dedo; en
          escritorio hay flechas.
        */}
        {fotos && fotos.length > 0 && (
          <div className="lg:sticky lg:top-6">
            <CarruselFotos
              fotos={fotos.map((foto) => ({
                src: urlFoto(foto.ruta_storage),
                alt: `Fotografía de ${ficha.nombre_comun} tomada en el colegio`,
                pie: ficha.zona ? `${ficha.nombre_comun} · ${ficha.zona}` : ficha.nombre_comun,
              }))}
            />
          </div>
        )}
      </div>
    </article>
  )
}
