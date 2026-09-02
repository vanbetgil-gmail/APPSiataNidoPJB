import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { crearClientePublico } from '@/lib/supabase/servidor'
import { Aviso } from '@/components/ui/Aviso'

export const metadata: Metadata = {
  title: 'El equipo',
  description:
    'Los estudiantes y la docente que sostienen el proyecto NIDO PJB en el Instituto Salesiano Pedro Justo Berrío.',
}

export const revalidate = 300

interface Miembro {
  id: string
  nombre: string
  rol: 'integrante' | 'responsable'
  grado: string | null
  foto_ruta: string | null
  semblanza: string | null
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
    .select('id, nombre, rol, grado, foto_ruta, semblanza')
    .order('rol')
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
          <div className="flex h-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/iconos/ave.png" alt="" className="h-14 w-14 opacity-25" />
          </div>
        )}

        {esDocente && (
          <span
            className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.7rem] font-medium"
            style={{ backgroundColor: 'var(--color-crema)', color: 'var(--color-texto)' }}
          >
            Docente acompañante
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {miembro.nombre}
        </h3>
        {miembro.grado && (
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
  const equipo = await cargarEquipo()
  const docentes = equipo.filter((m) => m.rol === 'responsable')
  const estudiantes = equipo.filter((m) => m.rol !== 'responsable')

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <p className="antetitulo mb-4">— Quiénes están detrás</p>
        <h1 className="text-4xl sm:text-5xl">
          El equipo
          <br />
          <em style={{ color: 'var(--color-marca)' }}>NIDO PJB</em>
        </h1>
        <p className="mt-6 leading-relaxed" style={{ color: 'var(--color-texto-suave)' }}>
          Estudiantes del Instituto Salesiano Pedro Justo Berrío que salen al campus con un medidor en la
          mano, y la docente que los acompaña. Todo lo que se ve en este sitio lo hicieron ellos.
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

          {estudiantes.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-5 text-2xl">
                Estudiantes
                <span
                  className="ml-3 text-base font-normal"
                  style={{ color: 'var(--color-texto-suave)' }}
                >
                  {estudiantes.length}
                </span>
              </h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {estudiantes.map((m) => (
                  <Retrato key={m.id} miembro={m} />
                ))}
              </ul>
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
