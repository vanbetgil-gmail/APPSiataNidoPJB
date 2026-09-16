import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { crearClientePublico } from '@/lib/supabase/servidor'
import { Aviso } from '@/components/ui/Aviso'

export const metadata: Metadata = {
  title: 'El equipo',
  description:
    'Los estudiantes y la docente que sostienen el proyecto SIATA PJB en el Instituto Salesiano Pedro Justo Berrío.',
}

export const revalidate = 300

interface Miembro {
  id: string
  nombre: string
  rol: 'integrante' | 'responsable'
  grado: string | null
  foto_ruta: string | null
  semblanza: string | null
  orden_equipo: number | null
  foto: string | null
}

/**
 * El equipo, en formato anuario (FR-051g).
 *
 * ── Cómo se protegen las fotografías ─────────────────────────────────────
 *
 * Una fotografía de rostro es dato biométrico y por tanto SENSIBLE (Art. 5 de
 * la Ley 1581 de 2012). Tratándose de menores, el Art. 7 prohíbe tratarla sin
 * autorización del representante legal.
 *
 * Por eso las fotos viven en una cubeta PRIVADA. Esta página genera un enlace
 * temporal de una hora, en el servidor, y solo para quien tiene autorización
 * registrada. Una cubeta pública con rutas difíciles de adivinar seguiría
 * siendo pública; esto no.
 *
 * Quien no tenga autorización sencillamente no aparece. No se muestra un
 * hueco ni una silueta con su nombre: no aparece.
 */
async function cargarEquipo(): Promise<Miembro[]> {
  const supabase = crearClientePublico()

  // La vista ya filtra por autorización: aquí no se repite esa regla.
  const { data } = await supabase
    .from('integrante_publico')
    .select('id, nombre, rol, grado, foto_ruta, semblanza, orden_equipo')
    // `nullsFirst: false` es lo que hace util la columna: quien no tiene
    // puesto asignado queda al final, no al principio empujando a quien si.
    .order('orden_equipo', { ascending: true, nullsFirst: false })
    .order('nombre')

  const miembros = (data ?? []) as Omit<Miembro, 'foto'>[]

  // Los enlaces temporales necesitan permisos que la clave anónima no tiene.
  // Si no hay clave de servicio configurada —el caso normal en producción,
  // porque a propósito no se pone en Vercel— la página se sirve igual, sin
  // fotos. Es una degradación aceptable: los nombres y grados sí se ven.
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!claveServicio) return miembros.map((m) => ({ ...m, foto: null }))

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, claveServicio, {
    auth: { persistSession: false },
  })

  return Promise.all(
    miembros.map(async (m) => {
      if (!m.foto_ruta) return { ...m, foto: null }
      const { data: firmada } = await admin.storage
        .from('fotos-equipo')
        .createSignedUrl(m.foto_ruta, 3600)
      return { ...m, foto: firmada?.signedUrl ?? null }
    })
  )
}

/**
 * Cuántos estudiantes hay y cuántos pueden verse (migración 0015).
 *
 * Devuelve dos números y ningún nombre. Sirve para reconocer al equipo
 * completo sin publicar nada de quien no lo ha autorizado.
 */
async function cargarResumen(): Promise<{
  estudiantes_totales: number
  estudiantes_visibles: number
}> {
  const supabase = crearClientePublico()
  const { data } = await supabase.from('equipo_resumen').select('*').maybeSingle()
  return (
    (data as { estudiantes_totales: number; estudiantes_visibles: number } | null) ?? {
      estudiantes_totales: 0,
      estudiantes_visibles: 0,
    }
  )
}

/**
 * Las dos primeras iniciales de un nombre.
 *
 * Se saltan las partículas —«de», «del», «la»— porque «Juan de la Cruz»
 * daría «JD» en vez de «JC», que es como lo escribiría cualquiera.
 */
function iniciales(nombre: string): string {
  const particulas = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do'])
  return nombre
    .split(/\s+/)
    .filter((p) => p.length > 0 && !particulas.has(p.toLowerCase()))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function Retrato({ miembro }: { miembro: Miembro }) {
  const esDocente = miembro.rol === 'responsable'

  return (
    <li
      className="overflow-hidden rounded-[--radius-suave] border"
      style={{
        borderColor: esDocente ? 'var(--color-crema)' : 'var(--color-borde)',
        backgroundColor: 'var(--color-superficie)',
      }}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden"
        style={{ backgroundColor: 'var(--color-salvia-clara)' }}
      >
        {miembro.foto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={miembro.foto}
            alt={`Fotografía de ${miembro.nombre}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          /*
            Sin fotografía, las iniciales.

            Nueve tarjetas con el mismo icono repetido se leen como un error
            de carga. Las iniciales hacen que cada tarjeta sea la de alguien,
            y que la ausencia de foto parezca lo que es —todavía no las hay—
            y no algo roto.
          */
          <div className="flex h-full items-center justify-center">
            <span
              aria-hidden
              className="text-3xl tracking-wide"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-marca)', opacity: 0.45 }}
            >
              {iniciales(miembro.nombre)}
            </span>
          </div>
        )}

        {/*
          El cargo va en la insignia, no bajo el nombre.

          «Docente acompañante» describe a cualquiera de ellos y no dice nada
          de ninguno. Quien lidera el proyecto y quien sostiene la parte
          técnica hacen cosas distintas, y la página del equipo existe
          precisamente para decir quién hace qué.

          Se conserva el texto genérico como respaldo: una insignia vacía
          sería peor que una insignia imprecisa.
        */}
        {esDocente && (
          <span
            className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-full px-2.5 py-1 text-[0.7rem] font-medium leading-tight"
            style={{ backgroundColor: 'var(--color-crema)', color: 'var(--color-texto)' }}
          >
            {miembro.grado ?? 'Docente acompañante'}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {miembro.nombre}
        </h3>
        {/* Para un docente ya está arriba, en la insignia. Repetirlo debajo
            del nombre lo diría dos veces en una tarjeta de cuatro renglones. */}
        {!esDocente && miembro.grado && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-marca)' }}>
            {miembro.grado}
          </p>
        )}
        {miembro.semblanza && (
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: 'var(--color-texto-suave)' }}
          >
            {miembro.semblanza}
          </p>
        )}
      </div>
    </li>
  )
}

export default async function PaginaEquipo() {
  const [equipo, resumen] = await Promise.all([cargarEquipo(), cargarResumen()])
  const docentes = equipo.filter((m) => m.rol === 'responsable')
  const estudiantes = equipo.filter((m) => m.rol !== 'responsable')
  const sinAutorizacion = resumen.estudiantes_totales - resumen.estudiantes_visibles

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <p className="antetitulo mb-4">— Quiénes están detrás</p>
        <h1 className="text-4xl sm:text-5xl">
          El equipo
          <br />
          <em style={{ color: 'var(--color-marca)' }}>SIATA PJB</em>
        </h1>
        <p className="mt-6 leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
          Estudiantes del Instituto Salesiano Pedro Justo Berrío que salen al campus con un medidor en la
          mano, y las docentes que los acompañan. Todo lo que se ve en este sitio lo hicieron ellos.
        </p>
      </header>

      {equipo.length === 0 ? (
        <div className="mt-10">
          <Aviso>
            <strong>El equipo se publicará pronto.</strong> La mayoría son menores de edad, así que
            sus nombres y fotografías solo aparecen aquí cuando sus acudientes lo autorizan por
            escrito. Es una decisión del proyecto, no un descuido.
          </Aviso>
        </div>
      ) : (
        <>
          {docentes.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-5 text-2xl">Acompañamiento</h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {docentes.map((m) => (
                  <Retrato key={m.id} miembro={m} />
                ))}
              </ul>
            </section>
          )}

          {/*
            ── El recuento dice el equipo REAL, no el publicable ──────────

            Antes esta sección desaparecía entera cuando ningún estudiante
            tenía autorización registrada. La página quedaba mostrando cuatro
            docentes y nada más, y quien la abría concluía que el proyecto lo
            hacen los adultos —exactamente lo contrario de la verdad—.

            Ahora el número del encabezado es el total y, debajo, se explica
            por qué faltan nombres. Reconocer que existen no publica nada de
            ellos: un recuento no identifica a nadie.
          */}
          {resumen.estudiantes_totales > 0 && (
            <section className="mt-14">
              <h2 className="mb-5 text-2xl">
                Estudiantes
                <span
                  className="ml-3 text-base font-normal"
                  style={{ color: 'var(--color-texto-suave)' }}
                >
                  {resumen.estudiantes_totales}
                </span>
              </h2>

              {estudiantes.length > 0 && (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {estudiantes.map((m) => (
                    <Retrato key={m.id} miembro={m} />
                  ))}
                </ul>
              )}

              {sinAutorizacion > 0 && (
                <div
                  className={`${estudiantes.length > 0 ? 'mt-4' : ''} rounded-[--radius-suave] border border-dashed p-6`}
                  style={{ borderColor: 'var(--color-salvia)' }}
                >
                  <p className="leading-relaxed">
                    <strong>
                      {sinAutorizacion === 1
                        ? 'Un estudiante más sostiene'
                        : `${sinAutorizacion} estudiantes más sostienen`}{' '}
                      este proyecto.
                    </strong>{' '}
                    {sinAutorizacion === 1 ? 'Su nombre aparecerá' : 'Sus nombres aparecerán'} aquí
                    cuando su acudiente lo autorice por escrito. Casi todos son menores de edad, y
                    publicar el nombre o la cara de un menor sin ese permiso no es algo que este
                    proyecto vaya a hacer.
                  </p>
                  <p
                    className="mt-3 text-sm leading-relaxed"
                    style={{ color: 'var(--color-texto-suave)' }}
                  >
                    Mientras tanto, su trabajo sí está publicado: las fichas y las mediciones que
                    se ven en este sitio son suyas.
                  </p>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <section
        className="mt-16 rounded-[--radius-suave] p-8"
        style={{ backgroundColor: 'var(--color-salvia)' }}
      >
        <h2 className="text-2xl">Sobre las fotografías</h2>
        <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
          En esta página solo aparece quien tiene registrada la autorización de su acudiente. Las
          imágenes no están guardadas en un enlace público: se sirven con una dirección temporal que
          caduca. Cualquier integrante puede pedir que se retire su nombre o su foto cuando quiera,
          y desaparece de inmediato.
        </p>
      </section>
    </div>
  )
}
