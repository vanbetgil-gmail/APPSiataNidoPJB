import type { Metadata } from 'next'
import { crearClientePublico } from '@/lib/supabase/servidor'
import { CATEGORIAS } from '@/lib/ica/umbrales'
import type { PuntoInteresDidactico } from '@/lib/supabase/tipos'

export const metadata: Metadata = {
  title: 'La estación y los instrumentos',
  description:
    'La estación meteorológica del parque San José y los instrumentos que construyeron los estudiantes para entender cómo se mide el aire.',
}

export const revalidate = 300

/**
 * Estación meteorológica e instrumentos didácticos (T122) — FR-010, US6.
 *
 * ── Para qué existe esta página ──────────────────────────────────────────
 *
 * Responde la pregunta que se hace cualquiera que llega al mapa: ¿de dónde
 * salen estos datos? Sin ella, las mediciones son números sin origen.
 *
 * Es también donde vive el sentido pedagógico del proyecto: los instrumentos
 * de plástico que construyeron los estudiantes son lo que hace tangible una
 * variable climática. Explicarlos es parte del trabajo, no un adorno.
 *
 * ── La escala del ICA se muestra aquí, completa ──────────────────────────
 *
 * Es el único sitio donde tiene sentido enseñar los seis niveles juntos: en
 * el mapa cada punto lleva el suyo, pero para entender qué significa «dañina
 * a grupos sensibles» hace falta verla entera y con su explicación.
 */
export default async function PaginaEstacion() {
  const supabase = crearClientePublico()

  const [{ data: puntos }, { data: config }] = await Promise.all([
    supabase.from('punto_interes_didactico').select('*').order('orden'),
    supabase.from('configuracion').select('norma_ica').maybeSingle(),
  ])

  const instrumentos = (puntos ?? []) as PuntoInteresDidactico[]

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="max-w-2xl">
        <p className="antetitulo mb-4">— De dónde salen los datos</p>
        <h1 className="text-4xl sm:text-5xl">
          Medir el aire,
          <br />
          <em style={{ color: 'var(--color-marca)' }}>entender</em> el aire.
        </h1>
        <p className="mt-6 leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
          En el parque San José, dentro del colegio, hay una maqueta de una estación meteorológica
          fija. Junto a ella, instrumentos que los propios estudiantes construyeron para que medir
          el clima deje de ser una idea abstracta.
        </p>
      </header>

      {/* ── Cómo funciona el proyecto ──────────────────────────────── */}
      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          {
            paso: 'Se mide',
            texto:
              'Los estudiantes recorren los talleres con medidores portátiles y anotan once variables cada diez minutos.',
          },
          {
            paso: 'Se registra',
            texto:
              'Cada lectura queda guardada con su lugar, su hora y quién la tomó. Nada se pierde en una hoja suelta.',
          },
          {
            paso: 'Se entiende',
            texto:
              'Los tableros convierten esos números en algo legible: qué taller respira peor y en qué momento del día.',
          },
        ].map(({ paso, texto }, i) => (
          <article
            key={paso}
            className="rounded-[--radius-suave] p-6"
            style={{ backgroundColor: i === 1 ? 'var(--color-crema-clara)' : 'var(--color-salvia-clara)' }}
          >
            <p className="antetitulo mb-3">Paso {i + 1}</p>
            <h2 className="mb-2 text-xl">{paso}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
              {texto}
            </p>
          </article>
        ))}
      </section>

      {/* ── La escala del ICA ──────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="text-3xl">Cómo leer la calidad del aire</h2>
        <p
          className="mt-3 max-w-2xl leading-relaxed"
          style={{ color: 'var(--color-texto-suave)' }}
        >
          Los colores que aparecen en el mapa y en los tableros no son decorativos: son la escala
          oficial del Índice de Calidad del Aire de Colombia. Son también los colores de la barra
          del logo del proyecto.
        </p>

        <ul className="mt-7 flex flex-col gap-2">
          {CATEGORIAS.map((c) => (
            <li
              key={c.categoria}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[--radius-tarjeta] px-4 py-3"
              style={{ backgroundColor: c.color, color: c.colorTexto }}
            >
              <span className="min-w-[2.5rem] text-xs font-semibold tabular-nums opacity-80">
                {c.indiceMin}–{c.indiceMax}
              </span>
              <span className="font-medium">{c.etiqueta}</span>
              <span className="w-full text-sm opacity-90 sm:w-auto sm:flex-1">{c.descripcion}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
          Referencia: <strong>{config?.norma_ica ?? 'Resolución 2254 de 2017'}</strong>, la misma
          escala que usa SIATA para el Valle de Aburrá. Se aplica únicamente a las partículas
          PM2.5 y PM10: las demás variables que mide el equipo no tienen categoría en la norma, y
          la aplicación no se la inventa.
        </p>
      </section>

      {/* ── Los instrumentos ───────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="text-3xl">Los instrumentos</h2>

        {instrumentos.length === 0 ? (
          <div
            className="mt-6 rounded-[--radius-suave] p-8 text-center"
            style={{ backgroundColor: 'var(--color-salvia-clara)' }}
          >
            <p className="mx-auto max-w-md leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
              El equipo está preparando las fichas de cada instrumento: el pluviómetro, la veleta,
              el anemómetro y los demás que construyeron. Aparecerán aquí con su fotografía y la
              explicación de qué mide cada uno.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {instrumentos.map((i) => (
              <li
                key={i.id}
                className="overflow-hidden rounded-[--radius-suave] border"
                style={{ borderColor: 'var(--color-borde)', backgroundColor: 'var(--color-superficie)' }}
              >
                {i.ruta_foto && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={i.ruta_foto}
                    alt={`Fotografía de ${i.nombre}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <div className="p-5">
                  {i.variable_asociada && <p className="antetitulo mb-2">{i.variable_asociada}</p>}
                  <h3 className="mb-2 text-xl">{i.nombre}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
                    {i.explicacion}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── SIATA ──────────────────────────────────────────────────── */}
      <section
        className="mt-16 rounded-[--radius-suave] p-8"
        style={{ backgroundColor: 'var(--color-salvia)' }}
      >
        <h2 className="text-2xl">¿Y qué es SIATA?</h2>
        <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
          El Sistema de Alerta Temprana del Valle de Aburrá es la red que vigila el aire, la lluvia
          y los ríos de Medellín y los municipios vecinos. Este proyecto escolar usa su misma escala
          de medida, así que lo que se mide en los talleres del colegio se puede comparar con lo que
          se mide en toda la ciudad.
        </p>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
          Una diferencia importante: SIATA promedia veinticuatro horas, y aquí las lecturas son
          puntuales, de unos minutos. Por eso la aplicación las muestra siempre con esa advertencia
          — un dato honesto vale más que uno redondo.
        </p>
      </section>
    </div>
  )
}
